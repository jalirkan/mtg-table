/*
 * mtg-table — tools/card-library/images.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Prefetch card images into the local cache (`store.ts`), from the repo root:
 *
 *     node tools/card-library/images.ts --deck decks/pacho-shield.dck --size normal
 *     node tools/card-library/images.ts --deck decks/a.dck --deck decks/b.dck --size normal,grid
 *     node tools/card-library/images.ts --all-decks                 # every decks/*.dck and *.txt
 *     node tools/card-library/images.ts --all-prints [--sets msh,msc] --size normal        # REPORT only
 *     node tools/card-library/images.ts --all-prints [--sets msh,msc] --size normal --yes  # then fetch
 *
 * Needs the index (`build.ts`): a deck line is resolved through the same
 * ladders the query module uses, so `Plains|MSH` fetches MSH's Plains and
 * `Peggy Carter, Secret Agent` fetches MSC #523. Each resolved print gets its
 * front image and — for a card with two physical sides (the multi-face rule,
 * model.ts) — its back.
 *
 * Bounded by design. A deck is ~30 distinct cards (~2 MB at `normal`); every
 * print of MSH + MSC is 1,319 prints (~100 MB, report 03 §2.5). `--all-prints`
 * therefore prints the count and the estimated bytes and STOPS, unless `--yes`
 * is given. Nothing already on disk is fetched again; a card whose Scryfall
 * `image_status` is `missing` or `placeholder` is skipped and listed, never
 * cached as if it were the art. Fetches go to `cards.scryfall.io`, which has no
 * rate limit, at `--concurrency` (default 4) through the same client, so every
 * one carries our User-Agent and lands in the measured request log.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flag, flagAll, fmtBytes, fmtInt, hasFlag, libraryPaths, parseArgs, userAgent, userAgentWarning } from './config.ts';
import { parseDeck } from './deck.ts';
import { isImageSize, type Face, type ImageSize } from './model.ts';
import { openLibrary, type CardLibrary, type ImageTarget, type PrintRecord } from './query.ts';
import { formatRateStats, rateStats, ScryfallClient } from './scryfall.ts';
import { downloadImage, isCached } from './store.ts';

/** Measured means where we have them (report 03 §2.2, report 10 §0), used only for the estimate. */
const TYPICAL_BYTES: Partial<Record<ImageSize, number>> = {
  small: 12_000,
  normal: 75_000,
  large: 130_000,
  png: 605_000,
  thumb: 8_000,
  grid: 37_000,
  display: 50_000,
};

const SKIP_STATUS = new Set(['missing', 'placeholder']);

export interface Job {
  target: ImageTarget;
  label: string;
}

/** Front, and back when the print has one, for each requested size. */
export function jobsForPrint(lib: CardLibrary, print: PrintRecord, sizes: readonly ImageSize[], label: string): { jobs: Job[]; skipped: string[] } {
  const jobs: Job[] = [];
  const skipped: string[] = [];
  if (print.imageStatus !== null && SKIP_STATUS.has(print.imageStatus)) {
    skipped.push(`${label} (image_status ${print.imageStatus})`);
    return { jobs, skipped };
  }
  const faces: Face[] = print.imageSizes.back === null ? ['front'] : ['front', 'back'];
  for (const size of sizes) {
    for (const face of faces) {
      const target = lib.imageTarget(print.id, size, face);
      if (target === null) skipped.push(`${label} (no ${size} ${face} image)`);
      else jobs.push({ target, label: face === 'back' ? `${label} [back]` : label });
    }
  }
  return { jobs, skipped };
}

export interface RunResult {
  fetched: number;
  fetchedBytes: number;
  present: number;
  presentBytes: number;
  failed: string[];
}

/** A tiny worker pool: `concurrency` downloads in flight, never more. */
export async function runJobs(client: ScryfallClient, jobs: readonly Job[], concurrency: number, say: (line: string) => void): Promise<RunResult> {
  const result: RunResult = { fetched: 0, fetchedBytes: 0, present: 0, presentBytes: 0, failed: [] };
  const seen = new Set<string>();
  const queue = jobs.filter((job) => {
    if (seen.has(job.target.path)) return false;
    seen.add(job.target.path);
    return true;
  });
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < queue.length) {
      const job = queue[next++]!;
      try {
        const done = await downloadImage(client, job.target.url, job.target.path);
        if (done.fetched) {
          result.fetched++;
          result.fetchedBytes += done.bytes;
          say(`  fetched  ${job.label.padEnd(44)} ${job.target.size.padEnd(7)} ${fmtInt(done.bytes).padStart(9)} B`);
        } else {
          result.present++;
          result.presentBytes += done.bytes;
        }
      } catch (error) {
        result.failed.push(`${job.label}: ${error instanceof Error ? error.message : String(error)}`);
        say(`  FAILED   ${job.label}: ${String(error)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return result;
}

function deckFiles(root: string, args: ReturnType<typeof parseArgs>): string[] {
  if (hasFlag(args, 'all-decks')) {
    const dir = resolve(root, 'decks');
    return readdirSync(dir)
      .filter((f) => f.endsWith('.dck'))
      .sort()
      .map((f) => resolve(dir, f));
  }
  const named = flagAll(args, 'deck');
  if (named.length > 0) return named.map((d) => resolve(root, d));
  try {
    const config = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8')) as { deck?: unknown };
    if (typeof config.deck === 'string') return [resolve(root, config.deck)];
  } catch {
    // fall through
  }
  return [resolve(root, 'decks/pacho-shield.dck')];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const paths = libraryPaths(root);
  const sizes = (flagAll(args, 'size').length > 0 ? flagAll(args, 'size') : ['normal']).map((size) => {
    if (!isImageSize(size)) throw new Error(`unknown --size ${size}; one of the eleven Scryfall sizes (model.ts IMAGE_EXT)`);
    return size;
  });
  const concurrency = Number.parseInt(flag(args, 'concurrency') ?? '4', 10);
  const lib = openLibrary(flag(args, 'db') === undefined ? undefined : resolve(root, flag(args, 'db')!), { root });
  const client = new ScryfallClient({ userAgent: userAgent(root) });
  const uaWarning = userAgentWarning(client.userAgent);
  if (uaWarning !== null) process.stderr.write(`${uaWarning}\n`);
  const say = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };
  const started = Date.now();
  const jobs: Job[] = [];
  const skipped: string[] = [];

  if (hasFlag(args, 'all-prints')) {
    const sets = flagAll(args, 'sets').length > 0 ? flagAll(args, 'sets') : lib.syncedSets().map((s) => s.code);
    for (const set of sets) {
      const size = lib.setSize(set);
      for (const hit of lib.browseSet(set, { limit: 1000 })) {
        if (hit.print === null) continue;
        const one = jobsForPrint(lib, hit.print, sizes, `${hit.print.set} #${hit.print.collectorNumber} ${hit.name}`);
        jobs.push(...one.jobs);
        skipped.push(...one.skipped);
      }
      say(`all-prints: ${set} has ${fmtInt(size)} prints`);
    }
    const missing = jobs.filter((job) => !isCached(job.target.path));
    let estimate = 0;
    for (const size of sizes) {
      const cached = jobs.filter((j) => j.target.size === size && isCached(j.target.path));
      const mean =
        cached.length > 0 ? cached.reduce((sum, j) => sum + statSync(j.target.path).size, 0) / cached.length : (TYPICAL_BYTES[size] ?? 100_000);
      estimate += missing.filter((j) => j.target.size === size).length * mean;
    }
    say(
      `all-prints: ${fmtInt(jobs.length)} images at ${sizes.join(',')} (${fmtInt(jobs.length - missing.length)} already cached), ` +
        `${fmtInt(missing.length)} to fetch, estimated ${fmtBytes(estimate)}`,
    );
    if (!hasFlag(args, 'yes')) {
      say('not downloading: this is beyond the decks. Re-run with --yes to fetch them.');
      lib.close();
      return;
    }
  } else {
    for (const file of deckFiles(root, args)) {
      if (!existsSync(file)) throw new Error(`no deck at ${file}`);
      const resolved = lib.resolveDeck(parseDeck(readFileSync(file, 'utf8'), file));
      say(`deck ${file.slice(root.length + 1)}: ${String(resolved.cards)} cards, ${String(resolved.distinct)} lines, ${String(resolved.resolved)} resolved`);
      for (const entry of resolved.entries) {
        const label = entry.entry.name;
        if (entry.card === null || entry.card.print === null) {
          skipped.push(`${label} (${entry.reason ?? 'no print'}${entry.suggestion === null ? '' : `; did you mean ${entry.suggestion.name}?`})`);
          continue;
        }
        const one = jobsForPrint(lib, entry.card.print, sizes, `${label} (${entry.card.print.set} #${entry.card.print.collectorNumber})`);
        jobs.push(...one.jobs);
        skipped.push(...one.skipped);
      }
    }
  }

  const result = await runJobs(client, jobs, concurrency, say);
  lib.close();
  say('');
  say(`images (${sizes.join(',')}) under ${paths.imagesDir.slice(root.length + 1)}/`);
  say(`  wanted    ${fmtInt(new Set(jobs.map((j) => j.target.path)).size)}`);
  say(`  fetched   ${fmtInt(result.fetched)}  ${fmtBytes(result.fetchedBytes)}`);
  say(`  present   ${fmtInt(result.present)}  ${fmtBytes(result.presentBytes)}  (already cached; not fetched again)`);
  say(`  skipped   ${fmtInt(skipped.length)}${skipped.length > 0 ? `\n    ${skipped.join('\n    ')}` : ''}`);
  say(`  failed    ${fmtInt(result.failed.length)}${result.failed.length > 0 ? `\n    ${result.failed.join('\n    ')}` : ''}`);
  say(`  time      ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (client.log.length > 0) say(`\n${formatRateStats(rateStats(client.log))}`);
  say('\nCard images (c) Wizards of the Coast, via Scryfall. Show the artist with the art.');
  if (result.failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
