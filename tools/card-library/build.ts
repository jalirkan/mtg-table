/*
 * mtg-table — tools/card-library/build.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Build the card index, `var/cards/cards.sqlite`. From the repo root:
 *
 *     node tools/card-library/build.ts                 # fetch what changed, then index
 *     node tools/card-library/build.ts --sets msh,msc  # the sets whose prints to sync (default)
 *     node tools/card-library/build.ts --offline       # re-index the files already on disk
 *     node tools/card-library/build.ts --manifest fixtures/cards/manifest.json --db var/cards/test.sqlite
 *     node tools/card-library/build.ts --force         # re-download the bulk file even if current
 *
 * Two phases, so a rebuild never has to touch the network (report 03 §4.3):
 *
 *   1. FETCH, into `var/cards/`:
 *      - `GET /bulk-data` (one request, 10/s bucket) → the `oracle_cards` item's
 *        **`jsonl_download_uri`** (gzipped JSONL; the old `download_uri` is gone,
 *        §1.5). The `.jsonl.gz` is streamed to `var/cards/bulk/` and kept; if the
 *        file named by today's URI is already there at `compressed_size` bytes,
 *        nothing is downloaded. The URI carries the timestamp, so "same name,
 *        same size" is "same `updated_at`".
 *      - `GET /sets` (one request) → `sync/sets.json`, and each synced set's
 *        icon SVG from `svgs.scryfall.io` (the docs say download it, don't
 *        hotlink it, §1.7).
 *      - `GET /cards/search?q=e:<set>&unique=prints&include_extras=true&
 *        include_variations=true&order=set`, paged at 2/s → `sync/prints-<set>.jsonl`,
 *        one card object per line, verbatim.
 *      - `sync/manifest.json` records what each file is and when it was fetched.
 *   2. INDEX, from a manifest: stream the bulk file (gunzip when it starts with
 *      the gzip magic) into a FRESH database at `<db>.building`, add the sets and
 *      prints, rebuild FTS, write `meta` (the bulk's `updated_at`, the build
 *      date, a content digest), then `rename()` it over `<db>`. A failed or
 *      killed build leaves the previous index untouched, and two builds from the
 *      same files produce the same `content_sha256` — that is what "idempotent"
 *      is measured by.
 *
 * Every request goes through `ScryfallClient` (User-Agent from `config.json`,
 * `Accept: application/json`, 2/s on search, 10/s elsewhere, Retry-After on 429)
 * and the run ends with the measured rate per bucket.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, open, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

import { flag, flagAll, fmtBytes, fmtInt, hasFlag, libraryPaths, parseArgs, userAgent, userAgentWarning } from './config.ts';
import { IndexWriter, openDb, SCHEMA_VERSION } from './db.ts';
import type { BulkItem, ScryCard, ScrySet } from './model.ts';
import { formatRateStats, rateStats, ScryfallClient, type ListPage } from './scryfall.ts';

export const DEFAULT_SETS: readonly string[] = ['msh', 'msc'];
const API = 'https://api.scryfall.com';

// ---------------------------------------------------------------------------
// The manifest: what phase 1 fetched, and what phase 2 reads
// ---------------------------------------------------------------------------

export interface Manifest {
  oracle: {
    /** Relative to the manifest's own directory. `.jsonl` or `.jsonl.gz`. */
    file: string;
    updated_at: string | null;
    uri: string | null;
    compressed_size: number | null;
    fetched_at: string | null;
  };
  sets: { file: string; fetched_at: string | null } | null;
  prints: {
    code: string;
    file: string;
    synced_at: string | null;
    total_cards: number | null;
    pages: number | null;
    icon: string | null;
  }[];
}

export async function readManifest(path: string): Promise<Manifest> {
  return JSON.parse(await readFile(path, 'utf8')) as Manifest;
}

/** Lines of a `.jsonl` file, gunzipped when it starts with the gzip magic `1f 8b`. */
export async function* readLines(path: string): AsyncGenerator<string> {
  const handle = await open(path, 'r');
  const magic = Buffer.alloc(2);
  await handle.read(magic, 0, 2, 0);
  await handle.close();
  const raw = createReadStream(path);
  const input = magic[0] === 0x1f && magic[1] === 0x8b ? raw.pipe(createGunzip()) : raw;
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) yield line;
}

// ---------------------------------------------------------------------------
// Phase 2: index
// ---------------------------------------------------------------------------

export interface IndexReport {
  db: string;
  bytes: number;
  ms: number;
  oracleRows: number;
  oracleSkipped: number;
  printsBySet: Record<string, number>;
  printsTotal: number;
  sets: number;
  ftsRows: number;
  contentSha256: string;
  builtAt: string;
  oracleUpdatedAt: string | null;
}

/** sha256 over every indexed row in a fixed order: equal source data ⇒ equal digest. */
export function contentDigest(dbPath: string): string {
  const db = openDb(dbPath, true);
  const hash = createHash('sha256');
  // Card data only: a set's `synced_at` and downloaded icon say WHEN and HOW
  // it was fetched, not what it holds, so two fetches of the same data agree.
  const tables: [string, string, string][] = [
    ['cards', '*', 'oracle_id'],
    ['card_names', '*', 'norm_name, oracle_id'],
    ['prints', '*', 'id'],
    ['print_faces', '*', 'print_id, idx'],
    ['sets', 'code, name, set_type, released_at, card_count, parent_set_code, block, digital, icon_svg_uri, synced_prints', 'code'],
  ];
  for (const [table, columns, order] of tables) {
    hash.update(`\n#${table}\n`);
    for (const row of db.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${order}`).iterate()) {
      hash.update(JSON.stringify(Object.values(row)));
      hash.update('\n');
    }
  }
  db.close();
  return hash.digest('hex');
}

export async function indexFromManifest(
  manifestPath: string,
  dbPath: string,
  say: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  builtAt: string = new Date().toISOString(),
): Promise<IndexReport> {
  const started = Date.now();
  const base = dirname(manifestPath);
  const manifest = await readManifest(manifestPath);
  const tmp = `${dbPath}.building`;
  await mkdir(dirname(dbPath), { recursive: true });
  await rm(tmp, { force: true });

  const writer = IndexWriter.create(tmp);
  const { db } = writer;
  const oracleFile = resolve(base, manifest.oracle.file);
  let oracleRows = 0;
  let oracleSkipped = 0;
  let setCount = 0;
  const printsBySet: Record<string, number> = {};
  try {
    // Rules layer: the bulk file, one transaction.
    say(`index: oracle layer from ${relative(process.cwd(), oracleFile) || oracleFile}`);
    db.exec('BEGIN');
    for await (const line of readLines(oracleFile)) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed === '[' || trimmed === ']') continue;
      let card: ScryCard;
      try {
        card = JSON.parse(trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed) as ScryCard;
      } catch {
        oracleSkipped++;
        continue;
      }
      if (writer.addOracleCard(card)) oracleRows++;
      else oracleSkipped++;
    }
    db.exec('COMMIT');
    say(`  ${fmtInt(oracleRows)} oracle cards (${fmtInt(oracleSkipped)} lines skipped)`);

    // Sets: every set Scryfall knows (names and families), before the synced flags.
    if (manifest.sets !== null) {
      const raw = JSON.parse(await readFile(resolve(base, manifest.sets.file), 'utf8')) as ScrySet[] | ListPage<ScrySet>;
      const sets = Array.isArray(raw) ? raw : raw.data;
      db.exec('BEGIN');
      for (const set of sets) {
        if (typeof set.code === 'string' && typeof set.name === 'string') {
          writer.addSet(set);
          setCount++;
        }
      }
      db.exec('COMMIT');
      say(`  ${fmtInt(setCount)} sets`);
    }

    // Print layer: each synced set, verbatim, outranking the bulk's representative prints.
    for (const entry of manifest.prints) {
      let n = 0;
      db.exec('BEGIN');
      for await (const line of readLines(resolve(base, entry.file))) {
        if (line.trim() === '') continue;
        if (writer.addPrint(JSON.parse(line) as ScryCard, 'set')) n++;
      }
      const icon = entry.icon === null ? null : await readFile(resolve(base, entry.icon), 'utf8').catch(() => null);
      writer.markSynced(entry.code, entry.synced_at ?? 'unknown', n, icon);
      db.exec('COMMIT');
      printsBySet[entry.code] = n;
      say(`  ${entry.code}: ${fmtInt(n)} prints${entry.total_cards === null ? '' : ` (Scryfall total_cards ${fmtInt(entry.total_cards)})`}`);
    }
  } catch (error) {
    // A failed build leaves the previous index exactly as it was.
    writer.close();
    await rm(tmp, { force: true });
    throw error;
  }

  const { ftsRows } = writer.finish();
  const printsTotal = Number(db.prepare('SELECT count(*) AS n FROM prints').get()?.['n'] ?? 0);

  writer.meta('built_at', builtAt);
  writer.meta('oracle_bulk_updated_at', manifest.oracle.updated_at ?? '');
  writer.meta('oracle_bulk_uri', manifest.oracle.uri ?? '');
  writer.meta('oracle_bulk_file', basename(oracleFile));
  writer.meta('oracle_bulk_fetched_at', manifest.oracle.fetched_at ?? '');
  if (writer.rulesFromPrints > 0) writer.meta('rules_from_prints', String(writer.rulesFromPrints));
  writer.meta('oracle_rows', String(oracleRows));
  writer.meta('prints_rows', String(printsTotal));
  writer.meta('synced_sets', JSON.stringify(manifest.prints.map((p) => ({ code: p.code, synced_at: p.synced_at, prints: printsBySet[p.code] ?? 0 }))));
  writer.meta('node_version', process.version);
  writer.meta('sqlite_version', String(db.prepare('SELECT sqlite_version() AS v').get()?.['v'] ?? ''));
  writer.close();

  // The digest reads the finished file; it covers rows, not meta, so it is
  // stable across build dates.
  const contentSha256 = contentDigest(tmp);
  const stamp = openDb(tmp);
  stamp.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('content_sha256', contentSha256);
  stamp.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('build_ms', String(Date.now() - started));
  stamp.exec('VACUUM');
  stamp.close();

  await rename(tmp, dbPath);
  return {
    db: dbPath,
    bytes: statSync(dbPath).size,
    ms: Date.now() - started,
    oracleRows,
    oracleSkipped,
    printsBySet,
    printsTotal,
    sets: setCount,
    ftsRows,
    contentSha256,
    builtAt,
    oracleUpdatedAt: manifest.oracle.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Phase 1: fetch
// ---------------------------------------------------------------------------

/**
 * Stream `url` into `<dest>.<pid>.part`, then `rename()` it to `dest` — and only
 * if it is whole: when `expectedBytes` is given the size is checked BEFORE the
 * rename, so a short file never lands at the real name. On any failure (the
 * stream, the size) the part file is removed; nothing is left behind.
 */
export async function download(
  client: Pick<ScryfallClient, 'request'>,
  url: string,
  dest: string,
  accept = '*/*',
  expectedBytes: number | null = null,
): Promise<number> {
  const response = await client.request(url, { accept });
  if (!response.ok || response.body === null) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`GET ${url} → HTTP ${String(response.status)}`);
  }
  const part = `${dest}.${String(process.pid)}.part`;
  await mkdir(dirname(dest), { recursive: true });
  try {
    await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), createWriteStream(part));
    const bytes = statSync(part).size;
    if (expectedBytes !== null && bytes !== expectedBytes) {
      throw new Error(`GET ${url} is ${String(bytes)} B, expected ${String(expectedBytes)} B`);
    }
    await rename(part, dest);
    return bytes;
  } catch (error) {
    await rm(part, { force: true });
    throw error;
  }
}

/** `oracle-cards-<ts>.jsonl.gz.<pid>.part`, left by a run that died mid-download. */
const STALE_PART = /^oracle-cards-.*\.jsonl\.gz\.(\d+)\.part$/;

function processAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists and is someone else's. Only ESRCH means it is gone.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export interface FetchOptions {
  client: ScryfallClient;
  /** `var/cards` — `bulk/` and `sync/` go under it. */
  dir: string;
  sets: readonly string[];
  force?: boolean;
  say?: (line: string) => void;
  now?: () => string;
}

/** Phase 1. Writes the files and `sync/manifest.json`, returns the manifest's path. */
export async function fetchSources(options: FetchOptions): Promise<string> {
  const { client, dir, sets } = options;
  const say = options.say ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date().toISOString());
  const bulkDir = resolve(dir, 'bulk');
  const syncDir = resolve(dir, 'sync');
  await mkdir(bulkDir, { recursive: true });
  await mkdir(resolve(syncDir, 'icons'), { recursive: true });

  // -- the bulk file ------------------------------------------------------
  const listing = await client.json<ListPage<BulkItem>>(`${API}/bulk-data`);
  const item = listing.data.find((d) => d.type === 'oracle_cards');
  if (item === undefined || typeof item.jsonl_download_uri !== 'string') {
    throw new Error('/bulk-data has no oracle_cards item with a jsonl_download_uri — has the format changed again? (report 03 §1.5)');
  }
  const fileName = basename(new URL(item.jsonl_download_uri).pathname);
  const bulkPath = resolve(bulkDir, fileName);
  const present = existsSync(bulkPath) && statSync(bulkPath).size === item.compressed_size;
  let fetchedAt: string | null = null;
  if (present && options.force !== true) {
    say(`fetch: ${fileName} already on disk (${fmtBytes(item.compressed_size)}, updated_at ${item.updated_at}) — not downloading`);
    const previous = await readManifest(resolve(syncDir, 'manifest.json')).catch(() => null);
    fetchedAt = previous?.oracle.file.endsWith(fileName) === true ? previous.oracle.fetched_at : null;
  } else {
    say(`fetch: ${fileName} (${fmtBytes(item.compressed_size)}, updated_at ${item.updated_at})`);
    const t0 = Date.now();
    // The size is checked before the rename: a short file never lands at the
    // real name, and its `.part` is removed.
    const bytes = await download(client, item.jsonl_download_uri, bulkPath, '*/*', item.compressed_size);
    fetchedAt = now();
    say(`  ${fmtBytes(bytes)} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  // Keep exactly one bulk file: the current one — and no `.part` a dead run left.
  for (const old of await readdir(bulkDir)) {
    const stale = STALE_PART.exec(old);
    if (stale !== null) {
      if (processAlive(Number(stale[1]))) continue;
      await rm(resolve(bulkDir, old), { force: true });
      say(`  removed ${old}, left by a run that did not finish`);
    } else if (old !== fileName && /^oracle-cards-.*\.jsonl\.gz$/.test(old)) {
      await rm(resolve(bulkDir, old), { force: true });
      say(`  removed the superseded ${old}`);
    }
  }

  // -- sets --------------------------------------------------------------
  const setList = await client.json<ListPage<ScrySet>>(`${API}/sets`);
  await writeFile(resolve(syncDir, 'sets.json'), `${JSON.stringify(setList.data)}\n`);
  const setsFetchedAt = now();
  say(`fetch: /sets → ${fmtInt(setList.data.length)} sets`);

  // -- prints, per set ----------------------------------------------------
  const prints: Manifest['prints'] = [];
  for (const code of sets) {
    const lower = code.toLowerCase();
    const query = new URLSearchParams({
      q: `e:${lower}`,
      unique: 'prints',
      include_extras: 'true',
      include_variations: 'true',
      order: 'set',
    });
    const lines: string[] = [];
    let pages = 0;
    let total: number | null = null;
    for await (const page of client.pages<ScryCard>(`${API}/cards/search?${query.toString()}`)) {
      pages++;
      total = typeof page.total_cards === 'number' ? page.total_cards : total;
      for (const card of page.data) lines.push(JSON.stringify(card));
    }
    const file = `prints-${lower}.jsonl`;
    await writeFile(resolve(syncDir, file), `${lines.join('\n')}\n`);
    let icon: string | null = null;
    const set = setList.data.find((s) => s.code === lower);
    if (set?.icon_svg_uri !== undefined) {
      try {
        await download(client, set.icon_svg_uri, resolve(syncDir, 'icons', `${lower}.svg`), 'image/svg+xml');
        icon = `icons/${lower}.svg`;
      } catch (error) {
        say(`  (icon for ${lower} not fetched: ${String(error)})`);
      }
    }
    prints.push({ code: lower, file, synced_at: now(), total_cards: total, pages, icon });
    say(`fetch: e:${lower} → ${fmtInt(lines.length)} prints in ${String(pages)} page(s)${total === null ? '' : ` (total_cards ${fmtInt(total)})`}`);
  }

  const manifest: Manifest = {
    oracle: {
      file: relative(syncDir, bulkPath),
      updated_at: item.updated_at,
      uri: item.jsonl_download_uri,
      compressed_size: item.compressed_size,
      fetched_at: fetchedAt,
    },
    sets: { file: 'sets.json', fetched_at: setsFetchedAt },
    prints,
  };
  const manifestPath = resolve(syncDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printReport(report: IndexReport): void {
  const lines = [
    '',
    `built ${relative(process.cwd(), report.db) || report.db}`,
    `  oracle cards     ${fmtInt(report.oracleRows)}  (bulk updated_at ${report.oracleUpdatedAt ?? 'unknown'})`,
    `  prints           ${fmtInt(report.printsTotal)}  (${Object.entries(report.printsBySet)
      .map(([k, v]) => `${k} ${fmtInt(v)}`)
      .join(', ')} synced; the rest are the bulk's representative prints)`,
    `  sets             ${fmtInt(report.sets)}`,
    `  fts rows         ${fmtInt(report.ftsRows)}`,
    `  file             ${fmtBytes(report.bytes)}`,
    `  index time       ${(report.ms / 1000).toFixed(1)} s`,
    `  built_at         ${report.builtAt}`,
    `  content_sha256   ${report.contentSha256}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const paths = libraryPaths(root);
  const dbPath = resolve(root, flag(args, 'db') ?? paths.db);
  const sets = flagAll(args, 'sets');
  const started = Date.now();

  let manifestPath: string;
  let client: ScryfallClient | null = null;
  const explicit = flag(args, 'manifest');
  if (explicit !== undefined) {
    manifestPath = resolve(root, explicit);
  } else if (hasFlag(args, 'offline')) {
    manifestPath = resolve(paths.dir, 'sync', 'manifest.json');
    if (!existsSync(manifestPath)) throw new Error(`--offline: no ${relative(root, manifestPath)}; run once without --offline`);
  } else {
    client = new ScryfallClient({ userAgent: userAgent(root) });
    process.stdout.write(`user-agent: ${client.userAgent}\n`);
    const uaWarning = userAgentWarning(client.userAgent);
    if (uaWarning !== null) process.stderr.write(`${uaWarning}\n`);
    manifestPath = await fetchSources({
      client,
      dir: paths.dir,
      sets: sets.length > 0 ? sets : DEFAULT_SETS,
      force: hasFlag(args, 'force'),
    });
  }

  const report = await indexFromManifest(manifestPath, dbPath);
  printReport(report);
  process.stdout.write(`  total wall time  ${((Date.now() - started) / 1000).toFixed(1)} s  (schema v${String(SCHEMA_VERSION)})\n`);
  if (client !== null) {
    const stats = rateStats(client.log);
    process.stdout.write(`\n${formatRateStats(stats)}\n`);
    const db = openDb(dbPath);
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('last_fetch_requests', JSON.stringify(stats));
    db.close();
  }
  process.stdout.write(
    '\nCard data from Scryfall (https://scryfall.com). Magic: The Gathering card text and images are\n' +
      '(c) Wizards of the Coast; artist credit ships with every print and must be shown with its art.\n',
  );
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
