/*
 * mtg-table — tools/fetch-art.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The v1 card "library": one deck file in, one `web/public/art.json` out.
 * Run with bare Node 24 (type stripping), from the repo root, with no deps:
 *
 *     node tools/fetch-art.ts [--deck decks/pacho-shield.dck] [--out web/public/art.json]
 *
 * Why this is not a card database (synthesis §7): Forge's view carries `Name` +
 * `SetCode` and an ImageKey like `c:MSH/Agent Phil Coulson.full` — **no collector
 * number** — so per-print Scryfall URLs cannot be built at runtime. For one known
 * 28-card deck that does not matter. The SQLite/FTS5 library in report 03 is
 * explicitly deferred.
 *
 * Non-obvious facts this encodes, all verified in docs/research/03:
 *   - The deck spans two sets: 18 distinct cards are in `msh`, 10 in `msc`
 *     (Marvel Super Heroes Commander, whose `parent_set_code` is `msh`). The ten
 *     deck lines written WITHOUT a `|MSH` suffix are exactly those ten.
 *   - `Peggy Carter, Secret Agent` does not exist in `msh` at all — that query
 *     404s; `msc` #523 is its only printing.
 *   - Name alone is not a key (Agent Phil Coulson is msh #4 *and* #402; MSH has
 *     six Plains prints). v1 accepts whatever print the ladder lands on.
 *   - Multi-face rule is **prefer top-level `image_uris`, fall back to
 *     `card_faces`** — transform cards have no top-level `image_uris`; split and
 *     adventure cards do.
 *   - `User-Agent` and `Accept: application/json` are both mandatory; 2 req/s on
 *     /cards/named; honour `Retry-After` on 429.
 *   - Artist + copyright must be credited wherever the art is shown, so `artist`
 *     is part of every entry.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Config (rule 9: never hardcode paths; read config.json or the environment)
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const SCRYFALL = 'https://api.scryfall.com';
/** Scryfall documents 10 req/s overall and 2 req/s on /cards/*; we take the slow one. */
const MIN_REQUEST_INTERVAL_MS = 500;
const MAX_429_RETRIES = 3;
const FALLBACK_RETRY_AFTER_S = 30;
/** Which image size to store. `normal` is ~75 KB and is what the board wants. */
const IMAGE_SIZE = 'normal';

interface Config {
  deck?: string;
  scryfallUserAgent?: string;
}

async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(resolve(REPO_ROOT, 'config.json'), 'utf8');
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The .dck file
// ---------------------------------------------------------------------------

export interface DeckEntry {
  count: number;
  name: string;
  /** The `|MSH` suffix if the line carried one, else null. */
  setHint: string | null;
  section: string;
}

/**
 * Forge `.dck` format: `[section]` headers, then `N Card Name|SET|ART` lines.
 * `[metadata]` holds `Key=Value` pairs and is skipped.
 */
export function parseDeck(text: string): DeckEntry[] {
  const entries: DeckEntry[] = [];
  let section = '';
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase();
      continue;
    }
    if (section === '' || section === 'metadata') continue;

    const match = /^(\d+)\s+(.*)$/.exec(line);
    if (match === null) continue;
    const count = Number.parseInt(match[1]!, 10);
    const parts = match[2]!.split('|');
    const name = parts[0]!.trim();
    const setHint = parts.length > 1 && parts[1] !== undefined ? parts[1].trim() : null;
    if (name === '') continue;
    entries.push({ count, name, setHint: setHint === '' ? null : setHint, section });
  }
  return entries;
}

/** Distinct names in deck order, with the total count of each. */
function distinctNames(entries: DeckEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const entry of entries) out.set(entry.name, (out.get(entry.name) ?? 0) + entry.count);
  return out;
}

// ---------------------------------------------------------------------------
// Scryfall
// ---------------------------------------------------------------------------

interface ImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
}

interface CardFace {
  name?: string;
  artist?: string;
  image_uris?: ImageUris;
}

interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  artist?: string;
  layout?: string;
  image_uris?: ImageUris;
  card_faces?: CardFace[];
}

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

/** Never more than one request per {@link MIN_REQUEST_INTERVAL_MS}. */
async function pace(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

interface FetchResult {
  card: ScryfallCard | null;
  status: number;
}

async function scryfallGet(url: string, userAgent: string): Promise<FetchResult> {
  for (let attempt = 0; ; attempt++) {
    await pace();
    const response = await fetch(url, {
      headers: {
        // Both headers are mandatory per Scryfall's own API docs.
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      if (attempt >= MAX_429_RETRIES) return { card: null, status: 429 };
      const header = response.headers.get('retry-after');
      const seconds = header !== null ? Number.parseInt(header, 10) : Number.NaN;
      const waitS = Number.isFinite(seconds) && seconds > 0 ? seconds : FALLBACK_RETRY_AFTER_S;
      process.stderr.write(`  429 — honouring Retry-After: sleeping ${String(waitS)}s\n`);
      await sleep(waitS * 1000);
      continue;
    }

    if (!response.ok) {
      // 404 is the normal "not in that set" answer; drain the body and move on.
      await response.text();
      return { card: null, status: response.status };
    }

    return { card: (await response.json()) as ScryfallCard, status: response.status };
  }
}

/**
 * Multi-face rule: **prefer the top-level `image_uris`**; only when it is absent
 * (transform, modal DFC, battle) fall back to `card_faces[0]` / `card_faces[1]`.
 * Split and adventure cards keep a top-level object and must NOT be split.
 */
function imagesOf(card: ScryfallCard): { front: string | null; back: string | null } {
  const top = card.image_uris?.[IMAGE_SIZE];
  if (typeof top === 'string') return { front: top, back: null };
  const faces = card.card_faces ?? [];
  const front = faces[0]?.image_uris?.[IMAGE_SIZE] ?? null;
  const back = faces[1]?.image_uris?.[IMAGE_SIZE] ?? null;
  return { front, back };
}

function artistOf(card: ScryfallCard): string {
  if (typeof card.artist === 'string' && card.artist !== '') return card.artist;
  const faceArtists = (card.card_faces ?? [])
    .map((face) => face.artist)
    .filter((a): a is string => typeof a === 'string' && a !== '');
  return faceArtists.length > 0 ? [...new Set(faceArtists)].join(' / ') : 'unknown';
}

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/** The four rungs, in order. Synthesis §7. */
const LADDER = [
  { step: 'set=msh', build: (n: string) => `${SCRYFALL}/cards/named?exact=${encodeURIComponent(n)}&set=msh` },
  { step: 'set=msc', build: (n: string) => `${SCRYFALL}/cards/named?exact=${encodeURIComponent(n)}&set=msc` },
  { step: 'exact', build: (n: string) => `${SCRYFALL}/cards/named?exact=${encodeURIComponent(n)}` },
  { step: 'fuzzy', build: (n: string) => `${SCRYFALL}/cards/named?fuzzy=${encodeURIComponent(n)}` },
] as const;

export interface ArtEntry {
  front: string;
  back: string | null;
  artist: string;
  setCode: string;
  collectorNumber: string;
  scryfallId: string;
}

export interface ArtMiss {
  name: string;
  reason: string;
}

interface Resolution {
  entry: ArtEntry | null;
  via: string;
  reason: string;
}

async function resolveName(name: string, userAgent: string): Promise<Resolution> {
  const tried: string[] = [];
  for (const rung of LADDER) {
    const { card, status } = await scryfallGet(rung.build(name), userAgent);
    if (card === null) {
      tried.push(`${rung.step}:${String(status)}`);
      continue;
    }
    const { front, back } = imagesOf(card);
    if (front === null) {
      tried.push(`${rung.step}:no-image`);
      continue;
    }
    return {
      entry: {
        front,
        back,
        artist: artistOf(card),
        setCode: card.set.toUpperCase(),
        collectorNumber: card.collector_number,
        scryfallId: card.id,
      },
      via: rung.step,
      reason: '',
    };
  }
  return { entry: null, via: 'none', reason: `all four rungs failed (${tried.join(', ')})` };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export interface ArtFile {
  generatedAt: string;
  source: string;
  imageSize: string;
  deck: string;
  /** name → entry. This is what `web/src/art.ts` looks names up in. */
  cards: Record<string, ArtEntry>;
  /** Which rung of the ladder each name came from. Informational. */
  resolvedVia: Record<string, string>;
  /** Names that resolved to nothing. The board renders a text card for these. */
  misses: ArtMiss[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();

  const deckPath = args['deck'] ?? config.deck ?? 'decks/pacho-shield.dck';
  const outPath = args['out'] ?? 'web/public/art.json';
  const userAgent =
    process.env['SCRYFALL_UA'] ?? config.scryfallUserAgent ?? 'mtg-table/0.1 (local hobby client)';

  const deckText = await readFile(resolve(REPO_ROOT, deckPath), 'utf8');
  const entries = parseDeck(deckText);
  const names = distinctNames(entries);
  const totalCards = [...names.values()].reduce((a, b) => a + b, 0);

  process.stdout.write(
    `deck ${deckPath}: ${String(totalCards)} cards, ${String(names.size)} distinct names\n` +
      `user-agent: ${userAgent}\n` +
      `pacing: 1 request / ${String(MIN_REQUEST_INTERVAL_MS)} ms (Scryfall allows 2/s on /cards/*)\n\n`,
  );

  const cards: Record<string, ArtEntry> = {};
  const resolvedVia: Record<string, string> = {};
  const misses: ArtMiss[] = [];
  const byStep = new Map<string, string[]>();

  for (const name of names.keys()) {
    const { entry, via, reason } = await resolveName(name, userAgent);
    if (entry === null) {
      misses.push({ name, reason });
      process.stdout.write(`  MISS  ${name} — ${reason}\n`);
      continue;
    }
    cards[name] = entry;
    resolvedVia[name] = via;
    byStep.set(via, [...(byStep.get(via) ?? []), name]);
    process.stdout.write(
      `  ok    ${name.padEnd(34)} ${via.padEnd(8)} ${entry.setCode} #${entry.collectorNumber}  ${entry.artist}\n`,
    );
  }

  const artFile: ArtFile = {
    generatedAt: new Date().toISOString(),
    source: 'https://scryfall.com',
    imageSize: IMAGE_SIZE,
    deck: deckPath,
    cards,
    resolvedVia,
    misses,
  };

  const absoluteOut = resolve(REPO_ROOT, outPath);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, `${JSON.stringify(artFile, null, 2)}\n`, 'utf8');

  process.stdout.write(`\nsummary\n`);
  for (const rung of LADDER) {
    const hits = byStep.get(rung.step) ?? [];
    process.stdout.write(`  ${rung.step.padEnd(8)} ${String(hits.length).padStart(3)}\n`);
  }
  process.stdout.write(
    `  misses   ${String(misses.length).padStart(3)}${misses.length > 0 ? ` (${misses.map((m) => m.name).join(', ')})` : ''}\n` +
      `\nwrote ${outPath} (${String(Object.keys(cards).length)} entries)\n` +
      `Card images and data are from Scryfall. Artist credit is stored per card and must be\n` +
      `shown wherever the art is displayed (WotC Fan Content Policy / Scryfall attribution).\n`,
  );
}

await main();
