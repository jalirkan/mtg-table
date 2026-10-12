#!/usr/bin/env node
// mtg-table — tools/fixture-multiset-diff.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// An ORDER-INSENSITIVE comparison of two frame logs: do they contain the same
// frames, in any order, once the per-run stamps are removed?
//
//   node tools/fixture-multiset-diff.mjs fixtures/games/human-auto-42.jsonl \
//                                        var/games/drift-42/frames.jsonl
//
// Why this exists (M3 follow-up 7, docs/evidence/m3-ws.md §13.5).  The gate
// already diffs a fresh AI-vs-AI recording against `fixtures/games/g1.jsonl`
// byte for byte after normalising four values away, and that works because
// nothing in a RecordMatch run competes for the log.  It does not work for the
// five human-seat fixtures: those are recorded through a seat, so a `state`
// written by the game thread and two `input`s written by the EDT can be
// assigned their `seq` in either order.  Measured over three re-recordings of
// `human-auto-42`: 0, then 8, then 8 differing lines — the same three frames,
// reordered.  A byte-level drift step over those fixtures would therefore be
// flaky, and a flaky gate step is worse than no gate step, because it teaches
// everyone to re-run until it is green.
//
// What is NOT flaky is the multiset: the same three frames are all present in
// every run.  So this asks the question the byte diff cannot — "is any frame's
// CONTENT different, or has one appeared or vanished?" — and says nothing at all
// about the order they were written in.
//
// What is compared.  One JSON object per line, including the `kind: "session"`
// header.  Before comparing, the value of every PER-RUN key is replaced with a
// constant, at any depth:
//
//     seq        the per-direction counter; the whole point of this tool
//     t          epoch ms, different every run (envelope, §1)
//     startedAt  ISO-8601, session header only (§8.1)
//     gameId     the --game-id / --out basename, which differs by construction
//                between a committed fixture and a fresh recording
//
// Nothing else. `forgeJarSha256`, the deck sha256s, `seed`, `transport`, every
// value inside every card and every engine string stay exactly as the emitter
// wrote them — those ARE the wire, and a difference in one is the finding.
// `--strip <key>` adds a key for a one-off investigation; it is deliberately
// not something the gate passes.
//
// Key ORDER inside an object is significant by default, because it is part of
// what the emitter emits and `Snap.java` writes a fixed order (hard rule 10's
// "every CardStateView-derived key is written in both branches" is exactly that
// kind of promise). `--sort-keys` relaxes it for a log written by something
// else.
//
// Which HALF of the log.  A human-seat log interleaves what the emitter wrote
// (`dir: "s2c"`) with what the seat sent back (`dir: "c2s"`), and only the first
// half is the wire this repo is trying to pin.  The c2s half is a policy —
// `AutoTransport` acts on whatever `input` it is holding, and Forge's
// `awaitNextInput()` re-pushes the same prompt every 250 ms while it thinks, so
// the number of acts that land on one prompt is WALL-CLOCK (measured over seven
// re-recordings of `human-auto-42`: five identical, two with a single duplicate
// `act {"action":"buttonCancel"}` fewer, and an s2c half identical in all seven).
// The default compares everything and says which half differs; `--only-dir s2c`
// asks the narrower, stabler question.  The session header counts as s2c: the
// emitter wrote it.
//
// A key an AMENDMENT added to a frame type the committed corpus already has.
// The committed human fixtures were recorded before amendment M44 gave
// `hello_ok` its `match` block, so every fresh recording differs from them in
// exactly that one s2c frame -- and an advisory that fires on every run hides
// the real emitter drift it exists to show (match-setup review).  So when A (the
// first file: the committed, OLDER recording) carries NO frame of that type with
// the key and B carries it, the key is dropped from B's frames of that type
// before comparing, and a line says so.  Only that direction: a key A has and B
// lacks is an emitter that STOPPED writing it, and is reported like any other
// difference.  `--keep-amended` turns the rule off.  The table is
// `AMENDED_KEYS` below; a row is an amendment, never a convenience.  One
// amendment changed a VALUE's spelling rather than adding a key: M52's unblocked
// attacker, `blockerIds: []` where an older recording has the attacker itself.
// When A carries the old spelling, both files' self-blocks are read as `[]`.
//
// Options:
//   --only-dir <s2c|c2s>  compare only frames the emitter wrote, or only the
//                         seat's own (the session header goes with s2c)
//   --keep-amended   compare AMENDED_KEYS too, even when A predates them
//   --strip <key>    also replace this key's value everywhere (repeatable)
//   --sort-keys      compare object keys as a set rather than as a sequence
//   --limit <n>      how many differing frames to print per side (default 12)
//   --quiet          only the verdict and the differences, no summary table
//
// Exit: 0 identical, 1 any difference, 2 bad usage or unreadable input.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const PER_RUN = ['seq', 't', 'startedAt', 'gameId'];

const args = process.argv.slice(2);
const opt = {
  files: [], strip: [...PER_RUN], sortKeys: false, limit: 12, quiet: false, onlyDir: null,
  keepAmended: false,
};

/**
 * Keys an amendment added to an EXISTING frame type (see the header).  `type`
 * is the frame's `type`, `key` a key of its `body`.
 */
const AMENDED_KEYS = [
  { type: 'hello_ok', key: 'match', amendment: 'M44' },
  { type: 'state', key: 'playable', amendment: 'M61' },
  { type: 'state', key: 'activatable', amendment: 'M63' },
  // M65 / M66 (D422, D423): two keys inside `input.selectable` -- a dotted
  // path names a key below `body`.
  { type: 'input', key: 'selectable.chosen', amendment: 'M65' },
  { type: 'input', key: 'selectable.playerIds', amendment: 'M66' },
  // M67 (D424): two keys on an assign_damage ask -- absent from every ask of
  // the other ten kinds, so A's ask frames carry neither and B's carry both.
  { type: 'ask', key: 'defenderAllowed', amendment: 'M67' },
  { type: 'ask', key: 'reason', amendment: 'M67' },
  // M68 (D426): `reason` on every kind (the row above already drops it from a
  // newer recording's asks when the older one has none), and the sideboard's
  // deck-size bounds.  `text.min` / `text.max` share their names with
  // choose_list's own `min` / `max`, so they are not droppable by key here; no
  // compared recording carries a numeric text ask.
  { type: 'ask', key: 'mainMin', amendment: 'M68' },
  { type: 'ask', key: 'sideMax', amendment: 'M68' },
];
/** The object holding a dotted `key` under `body`, and the last segment; null when absent. */
function holder(body, key) {
  const parts = key.split('.');
  let o = body;
  for (const p of parts.slice(0, -1)) {
    if (o === null || typeof o !== 'object') return null;
    o = o[p];
  }
  return o !== null && typeof o === 'object' ? { o, k: parts[parts.length - 1] } : null;
}
/**
 * The same rule for a key an amendment added to a CARD, which sits at any depth
 * (`players[].zones.*.cards[]`, `stackCards`, an ask option's `card`): when A
 * carries it nowhere and B does, it is dropped from every object of B.
 */
const AMENDED_CARD_KEYS = [
  { key: 'keywords', amendment: 'M49' },
];
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  const need = (name) => {
    const v = args[++i];
    if (v === undefined) die(`${name} needs a value`);
    return v;
  };
  if (k === '--only-dir') opt.onlyDir = need(k);
  else if (k === '--strip') opt.strip.push(need(k));
  else if (k === '--sort-keys') opt.sortKeys = true;
  else if (k === '--keep-amended') opt.keepAmended = true;
  else if (k === '--limit') opt.limit = Number.parseInt(need(k), 10);
  else if (k === '--quiet') opt.quiet = true;
  else if (k === '--help' || k === '-h') { usage(); process.exit(0); }
  else if (k.startsWith('-')) die(`unknown argument ${k}`);
  else opt.files.push(k);
}
if (opt.files.length !== 2) {
  usage();
  die(`needs exactly two files, got ${String(opt.files.length)}`);
}
if (!Number.isFinite(opt.limit) || opt.limit < 0) die('--limit must be a non-negative integer');
if (opt.onlyDir !== null && opt.onlyDir !== 's2c' && opt.onlyDir !== 'c2s') {
  die(`--only-dir takes s2c or c2s, not ${JSON.stringify(opt.onlyDir)}`);
}

function usage() {
  process.stdout.write(
    'usage: node tools/fixture-multiset-diff.mjs <a.jsonl> <b.jsonl>\n' +
      '           [--only-dir s2c|c2s] [--strip key]... [--sort-keys]\n' +
      '           [--limit 12] [--quiet] [--keep-amended]\n' +
      `       per-run keys always ignored: ${PER_RUN.join(', ')}\n`,
  );
}

function die(msg) {
  process.stderr.write(`fixture-multiset-diff: ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Canonicalising one frame
// ---------------------------------------------------------------------------

const STRIP = new Set(opt.strip);
const STRIPPED = '<per-run>';

/** Replace every per-run value, at any depth; optionally sort object keys. */
function scrub(v) {
  if (Array.isArray(v)) return v.map(scrub);
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v);
    if (opt.sortKeys) entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out = {};
    for (const [k, val] of entries) out[k] = STRIP.has(k) ? STRIPPED : scrub(val);
    return out;
  }
  return v;
}

/** What a frame is called in the summary: its `type`, or the header's `kind`. */
function label(frame) {
  if (typeof frame.type === 'string') return frame.type;
  if (typeof frame.kind === 'string') return `kind:${frame.kind}`;
  return '(no type)';
}

/**
 * Read a log into a multiset of canonical frames.
 *
 * @returns {{path: string, lines: number, counts: Map<string, number>,
 *            meta: Map<string, {type: string, firstLine: number, text: string}>,
 *            byType: Map<string, number>}}
 */
/** Remove `key` from every object at any depth (AMENDED_CARD_KEYS). */
function dropDeep(v, key) {
  if (Array.isArray(v)) {
    for (const x of v) dropDeep(x, key);
  } else if (v !== null && typeof v === 'object') {
    delete v[key];
    for (const x of Object.values(v)) dropDeep(x, key);
  }
}

/** Keys dropped at any depth from B (filled below, before B is loaded). */
const deepDrop = new Set();

function load(path, drop = new Map()) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    die(`cannot read ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const counts = new Map();
  const meta = new Map();
  const byType = new Map();
  let lines = 0;
  let skipped = 0;
  let n = 0;
  for (const raw of text.split('\n')) {
    n++;
    if (raw.length === 0) continue;
    let frame;
    try {
      frame = JSON.parse(raw);
    } catch (err) {
      die(`${path}:${String(n)}: not JSON — ${err instanceof Error ? err.message : String(err)}`);
    }
    if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) {
      die(`${path}:${String(n)}: a frame log line must be a JSON object`);
    }
    // The session header has no `dir`; it is the emitter's, so it goes with s2c.
    const dir = typeof frame.dir === 'string' ? frame.dir : 's2c';
    if (opt.onlyDir !== null && dir !== opt.onlyDir) {
      skipped++;
      continue;
    }
    lines++;
    for (const dropKey of drop.get(frame.type) ?? []) {
      const h = holder(frame.body, dropKey);
      if (h !== null) delete h.o[h.k];
    }
    for (const key of deepDrop) dropDeep(frame, key);
    if (selfBlocksAsEmpty) unblockSelf(frame);
    const canon = JSON.stringify(scrub(frame));
    counts.set(canon, (counts.get(canon) ?? 0) + 1);
    const type = label(frame);
    byType.set(type, (byType.get(type) ?? 0) + 1);
    if (!meta.has(canon)) meta.set(canon, { type, dir, firstLine: n, text: canon });
  }
  return { path, lines, skipped, counts, meta, byType };
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

/** How many frames of `type` a log has, and how many of those carry `body[key]`. */
function amendedCount(path, type, key) {
  let total = 0;
  let carrying = 0;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    if (raw.length === 0 || !raw.includes(`"${type}"`)) continue;
    const frame = JSON.parse(raw);
    if (frame?.type !== type) continue;
    total++;
    const h = holder(frame.body, key);
    if (h !== null && h.k in h.o) carrying++;
  }
  return { total, carrying };
}

const dropB = new Map();
const amendedNotes = [];
if (!opt.keepAmended) {
  for (const { type, key, amendment } of AMENDED_KEYS) {
    let ca;
    let cb;
    try {
      ca = amendedCount(opt.files[0], type, key);
      cb = amendedCount(opt.files[1], type, key);
    } catch {
      continue; // load() below reports an unreadable or malformed file properly
    }
    if (ca.total > 0 && ca.carrying === 0 && cb.carrying > 0) {
      dropB.set(type, [...(dropB.get(type) ?? []), key]);
      amendedNotes.push(
        `  amendment ${amendment}: ${type}.${key} is absent from all ${String(ca.total)} of A's ` +
          `${type} frame(s) (A predates it) and present in ${String(cb.carrying)} of B's -- ` +
          `ignored in B (--keep-amended compares it)`,
      );
    }
  }
}

if (!opt.keepAmended) {
  for (const { key, amendment } of AMENDED_CARD_KEYS) {
    let inA;
    let inB;
    try {
      inA = readFileSync(opt.files[0], 'utf8').includes(`"${key}":`);
      inB = readFileSync(opt.files[1], 'utf8').includes(`"${key}":`);
    } catch {
      continue;
    }
    if (!inA && inB) {
      amendedNotes.push(`  amendment ${amendment}: a card's ${key} is absent from A (A predates it) and ` +
        `present in B -- dropped from B at any depth (--keep-amended compares it)`);
    }
  }
}

// One ENCODING an amendment changed (M52, D290): a `blockers` event's
// unblocked attacker was its own one blocker (`blockerIds: [n]`, Forge's
// sentinel, relayed) and is `[]` since.  A creature cannot block itself, so the
// two spell one fact.  When A carries the old spelling anywhere, every such entry
// in A and in B is read as `[]`, and a line says so; `--keep-amended` turns it off.
const isSelfBlock = (x) => Array.isArray(x?.blockerIds) && x.blockerIds.length === 1 && x.blockerIds[0] === x.attackerId;
/** Rewrite a state frame's self-blocks to `[]`; how many it rewrote. */
function unblockSelf(frame) {
  let n = 0;
  if (frame?.type !== 'state') return n;
  for (const e of frame.body?.events ?? []) {
    if (e?.kind !== 'blockers' || !Array.isArray(e.blocks)) continue;
    for (const x of e.blocks) if (isSelfBlock(x)) { x.blockerIds = []; n++; }
  }
  return n;
}
let selfBlocksAsEmpty = false;
if (!opt.keepAmended) {
  try {
    for (const raw of readFileSync(opt.files[0], 'utf8').split('\n')) {
      if (!raw.includes('"blockers"')) continue;
      if (unblockSelf(JSON.parse(raw)) > 0) { selfBlocksAsEmpty = true; break; }
    }
  } catch {
    // load() below reports an unreadable or malformed file properly
  }
  if (selfBlocksAsEmpty) {
    amendedNotes.push('  amendment M52: A spells an unblocked attacker as its own blocker (A predates it) -- ' +
      'every such entry in A and B read as blockerIds: [] (--keep-amended compares them)');
  }
}

const a = load(opt.files[0]);
for (const note of amendedNotes) {
  const m = /amendment (\S+): a card's (\S+) is absent/.exec(note);
  if (m !== null) deepDrop.add(m[2]);
}
const b = load(opt.files[1], dropB);

const out = (s) => process.stdout.write(`${s}\n`);
const digest = (canon) => createHash('sha1').update(canon).digest('hex').slice(0, 8);
const excerpt = (canon, width = 200) =>
  canon.length <= width ? canon : `${canon.slice(0, width)}… (+${String(canon.length - width)} chars)`;

const only = (x) => (opt.onlyDir === null ? '' : `, ${String(x.skipped)} skipped (not ${opt.onlyDir})`);
out(`fixture-multiset-diff`);
out(`  A = ${a.path}  ${String(a.lines)} frame(s), ${String(a.counts.size)} distinct${only(a)}`);
out(`  B = ${b.path}  ${String(b.lines)} frame(s), ${String(b.counts.size)} distinct${only(b)}`);
out(`  ignoring per-run keys: ${[...STRIP].join(', ')}${opt.sortKeys ? '   (object keys sorted)' : ''}`);
if (opt.onlyDir !== null) out(`  comparing only dir=${opt.onlyDir} frames`);
for (const note of amendedNotes) out(note);

// The per-type table is printed whether or not anything differs: it is the
// cheapest possible answer to "what does this log contain", and when a run does
// differ it is usually the line that says why.
if (!opt.quiet) {
  const types = [...new Set([...a.byType.keys(), ...b.byType.keys()])].sort();
  out('');
  out('  frames by type      A       B   delta');
  for (const t of types) {
    const ca = a.byType.get(t) ?? 0;
    const cb = b.byType.get(t) ?? 0;
    const d = cb - ca;
    out(
      `  ${t.padEnd(16)}${String(ca).padStart(5)}${String(cb).padStart(8)}` +
        `${(d === 0 ? '0' : d > 0 ? `+${String(d)}` : String(d)).padStart(8)}`,
    );
  }
}

/** Canonical frames whose count in `x` exceeds their count in `y`. */
function surplus(x, y) {
  const rows = [];
  for (const [canon, n] of x.counts) {
    const m = y.counts.get(canon) ?? 0;
    if (n > m) rows.push({ canon, n, m, ...x.meta.get(canon) });
  }
  rows.sort((p, q) => p.firstLine - q.firstLine);
  return rows;
}

const onlyA = surplus(a, b);
const onlyB = surplus(b, a);
const countDiff = (rows) => rows.reduce((s, r) => s + (r.n - r.m), 0);

// ---------------------------------------------------------------------------
// Pairing: "this frame differs" rather than "something differs"
// ---------------------------------------------------------------------------
//
// A `state` frame runs to 5 kB, so two of them that differ in one card's power
// look identical in any excerpt short enough to print.  Pair each surplus frame
// on one side with the same-type surplus frame on the other that shares the
// longest prefix, and print the first differing character with context.  It is
// greedy and it is a heuristic -- it is allowed to be, because the exit code
// never depends on it and an unpaired frame simply prints as it did before.

const PAIR_CAP = 64; // rows per side considered; O(n*m) over a diff this size is free
const MIN_PREFIX = 40;

function commonPrefix(x, y) {
  const n = Math.min(x.length, y.length);
  let i = 0;
  while (i < n && x.charCodeAt(i) === y.charCodeAt(i)) i++;
  return i;
}

const pairOf = new Map(); // canon -> {other: canon, at: offset}
{
  const left = onlyA.slice(0, PAIR_CAP);
  const right = onlyB.slice(0, PAIR_CAP);
  const taken = new Set();
  for (const l of left) {
    let best = null;
    for (const r of right) {
      if (r.type !== l.type || taken.has(r.canon)) continue;
      const at = commonPrefix(l.canon, r.canon);
      if (at >= MIN_PREFIX && (best === null || at > best.at)) best = { other: r.canon, at };
    }
    if (best !== null) {
      taken.add(best.other);
      pairOf.set(l.canon, best);
      pairOf.set(best.other, { other: l.canon, at: best.at });
    }
  }
}

/** The two sides of one paired difference, windowed around the first mismatch. */
function pairLines(canon) {
  const p = pairOf.get(canon);
  if (p === undefined) return [];
  const theirs = p.other;
  const [x, y] = onlyA.some((r) => r.canon === canon) ? [canon, theirs] : [theirs, canon];
  const from = Math.max(0, p.at - 50);
  const win = (s) => `${from > 0 ? '…' : ''}${s.slice(from, p.at + 70)}${p.at + 70 < s.length ? '…' : ''}`;
  return [
    `      pairs with [${digest(theirs)}]; first difference at character ${String(p.at)}:`,
    `        A: ${win(x)}`,
    `        B: ${win(y)}`,
  ];
}

function report(rows, sign, where) {
  if (rows.length === 0) return;
  out('');
  out(
    `  ${String(countDiff(rows))} frame instance(s) in ${where}, over ` +
      `${String(rows.length)} distinct frame(s):`,
  );
  for (const r of rows.slice(0, opt.limit)) {
    out(
      `  ${sign} ${String(r.n - r.m)}x ${r.type}  [${digest(r.canon)}]  ` +
        `first at ${where === 'A only' ? a.path : b.path}:${String(r.firstLine)}  ` +
        `(A×${String(where === 'A only' ? r.n : r.m)}, B×${String(where === 'A only' ? r.m : r.n)})`,
    );
    const paired = pairLines(r.canon);
    if (paired.length > 0) for (const line of paired) out(line);
    else out(`      ${excerpt(r.canon)}`);
  }
  if (rows.length > opt.limit) {
    out(`  … and ${String(rows.length - opt.limit)} more distinct frame(s) (raise --limit)`);
  }
}

report(onlyA, '-', 'A only');
report(onlyB, '+', 'B only');

// Which half differs.  A difference confined to `dir: "c2s"` is the seat's own
// policy reacting to a wall-clock re-push, and is not a claim about the wire;
// one that touches `dir: "s2c"` is the emitter, and is the finding this check
// exists to produce.
if (onlyA.length + onlyB.length > 0) {
  const tally = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.dir, (m.get(r.dir) ?? 0) + (r.n - r.m));
    return m;
  };
  const all = new Map();
  for (const m of [tally(onlyA), tally(onlyB)]) {
    for (const [d, n] of m) all.set(d, (all.get(d) ?? 0) + n);
  }
  const s2c = all.get('s2c') ?? 0;
  const c2s = all.get('c2s') ?? 0;
  out('');
  if (s2c === 0) {
    out(
      `  every differing frame (${String(c2s)}) is dir=c2s — the seat's own acts and answers. ` +
        'That is a POLICY difference (what the client did), not a wire difference: nothing the ' +
        'emitter wrote changed.',
    );
  } else {
    out(
      `  ${String(s2c)} differing frame(s) are dir=s2c — the emitter's own output, which is the ` +
        `wire this corpus pins${c2s > 0 ? `; ${String(c2s)} more are the seat's c2s frames` : ''}.`,
    );
  }
}

out('');
if (onlyA.length === 0 && onlyB.length === 0) {
  out(
    `MULTISET IDENTICAL: ${String(a.lines)} frame(s), same content, order ignored ` +
      `(${a.path} vs ${b.path})`,
  );
  process.exit(0);
}
process.stderr.write(
  `MULTISET DIFFERS: ${String(countDiff(onlyA))} frame instance(s) only in ${a.path}, ` +
    `${String(countDiff(onlyB))} only in ${b.path}\n`,
);
// PLAN.md M5 follow-up 6, said WHERE IT PRINTS rather than only in the plan.
// Two frame shapes drift by one or two instances between runs of the same seed
// and are NOT emitter drift; the step is advisory because of them.
//
//   * `input {prompt:"Waiting for Forge AI..."}` -- AbstractGuiGame's
//     awaitNextInput() re-pushes the same prompt on a 250 ms java.util.Timer
//     while the engine thinks, so a loaded machine records one or two more
//     ticks than a quiet one;
//   * a trailing `act {"action":"buttonCancel"}` -- the automated seat presses
//     the enabled button, and whether the LAST window of a finished game gets
//     one more press depends on the same timing.
//
// A difference confined to those two is noise. Anything else -- a changed key
// set, a changed value, a frame type that moved -- is the drift this step
// exists to show, and it will be in the per-frame listing above.
process.stderr.write(
  'NOTE: this step is ADVISORY and is permanently a little noisy. A difference ' +
    'of one or two `input {prompt:"Waiting for Forge AI..."}` frames (250 ms ' +
    'awaitNextInput re-pushes) or one trailing `act buttonCancel` is timing, not ' +
    'drift -- read the per-frame listing above before believing it. ' +
    'DRIFT_FATAL=1 makes it an exit code anyway.\n',
);
process.exit(1);
