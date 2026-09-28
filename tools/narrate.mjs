#!/usr/bin/env node
/*
 * mtg-table -- tools/narrate.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A NARRATOR FOR FRAME LOGS: turns one per-seat frame log (docs/protocol.md
 * section 8) into a readable turn-by-turn story, for someone learning Magic by
 * watching how the AI plays it.
 *
 *   node tools/narrate.mjs fixtures/games/g1.jsonl             # the whole story
 *   node tools/narrate.mjs fixtures/games/g1.jsonl --turn 3    # one turn
 *   node tools/narrate.mjs fixtures/games/g1.jsonl --turn 1-3  # a range (0 = before the game)
 *   node tools/narrate.mjs fixtures/games/g1.jsonl --summary   # per-seat totals, the winner, how
 *   node tools/narrate.mjs fixtures/games/g1.jsonl --seat      # whose view this log is
 *   node tools/narrate.mjs fixtures/games/g1.jsonl --json      # structured facts for other tools
 *
 * Run it from the repo root like every tool here (CLAUDE.md hard rule 9).  It
 * reads one file, writes stdout, and needs nothing but Node: no engine, no
 * config.json, no network, no npm package.
 *
 * THIS FILE IS THE SHELL; THE NARRATOR IS web/src/story/narrate.ts (D150).
 * The narration -- what it reads, hard rule 8 by construction (one face
 * reader, no memory, the latest view), client logs and their re-deliveries,
 * and the text it prints -- lives in that one pure TypeScript module, which the
 * `#story` page in the browser runs over the replay's own frames.  Node 24
 * imports it by type stripping, so there is no build step and no second copy:
 * a change to the story is a change to both readers, and the CLI's output is
 * the module's `renderStory` / `renderSummary` / `toJson`, byte for byte.  This
 * file adds only what a page cannot have -- reading a file (node:fs) -- and the
 * flags.  tools/narrate-selftest.mjs imports the functions from here, so they
 * are re-exported below.
 *
 * Exit: 0 printed; 1 the file could not be read or parsed; 2 bad usage.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  faceOf,
  narrate,
  parseLog,
  renderSeat,
  renderStory,
  renderSummary,
  renderTitle,
  tidyText,
  toJson,
} from '../web/src/story/narrate.ts';

export { faceOf, narrate, parseLog, renderSeat, renderStory, renderSummary, renderTitle, tidyText, toJson };

/** Read and narrate one file. */
export function narrateFile(file, opts = {}) {
  return narrate(parseLog(readFileSync(file, 'utf8')), { ...opts, file });
}

// ---------------------------------------------------------------------------
// CLI

const USAGE = `usage: node tools/narrate.mjs <frames.jsonl> [--turn N | --turn A-B] [--summary] [--seat] [--json]
  --turn N     one turn (0 is "before the game"); --turn A-B a range
  --summary    per-seat totals, who won and how
  --seat       whose seat the log is, and nothing else
  --json       the structured facts (every card reference with its id and name)
`;

function parseRange(v) {
  const m = /^(\d+)(?:-(\d+))?$/.exec(String(v ?? ''));
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] === undefined ? lo : Number(m[2]);
  return lo <= hi ? [lo, hi] : null;
}

function main(argv) {
  const files = [];
  const flags = { summary: false, seat: false, json: false, range: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--summary') flags.summary = true;
    else if (a === '--seat') flags.seat = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--turn' || a === '--turns') {
      flags.range = parseRange(argv[i + 1]);
      i += 1;
      if (flags.range === null) {
        process.stderr.write(`--turn wants N or A-B\n${USAGE}`);
        return 2;
      }
    } else if (a.startsWith('--turn=')) {
      flags.range = parseRange(a.slice('--turn='.length));
      if (flags.range === null) {
        process.stderr.write(`--turn wants N or A-B\n${USAGE}`);
        return 2;
      }
    } else if (a === '-h' || a === '--help') {
      process.stdout.write(USAGE);
      return 0;
    } else if (a.startsWith('-')) {
      process.stderr.write(`unknown flag ${a}\n${USAGE}`);
      return 2;
    } else files.push(a);
  }
  if (files.length !== 1) {
    process.stderr.write(USAGE);
    return 2;
  }
  let story;
  try {
    story = narrateFile(files[0]);
  } catch (err) {
    process.stderr.write(`narrate: ${files[0]}: ${err.message}\n`);
    return 1;
  }
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(toJson(story, flags), null, 2)}\n`);
    return 0;
  }
  if (flags.seat) {
    const lines = [];
    for (const game of story.games) lines.push(...renderTitle(story, game), ...renderSeat(story, game));
    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
  }
  if (flags.summary) {
    process.stdout.write(renderSummary(story));
    return 0;
  }
  process.stdout.write(renderStory(story, flags));
  return 0;
}

const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedAs !== '' && invokedAs === path.resolve(decodeURIComponent(new URL(import.meta.url).pathname))) {
  // `narrate … | head` closes the pipe early: that is the reader's choice, not a
  // failure, so an EPIPE on stdout exits 0 quietly (any other write error throws).
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') process.exit(0);
    throw err;
  });
  process.exitCode = main(process.argv.slice(2));
}
