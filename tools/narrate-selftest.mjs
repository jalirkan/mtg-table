#!/usr/bin/env node
/*
 * mtg-table -- tools/narrate-selftest.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The narrator's own gate (tools/narrate.mjs).  Run from the repo root:
 *
 *   node tools/narrate-selftest.mjs                     # everything below
 *   node tools/narrate-selftest.mjs --write-golden      # regenerate fixtures/narrate/
 *   node tools/narrate-selftest.mjs --logs a.jsonl,client.jsonl=bridge.jsonl
 *                                                       # also hold these logs to the
 *                                                       # same rules; a PAIR is a
 *                                                       # client's log and the bridge's
 *                                                       # log of the same game, and the
 *                                                       # client's may never narrate a
 *                                                       # moment more often than the
 *                                                       # bridge's (check-all's 12d
 *                                                       # passes every log the gate
 *                                                       # just recorded)
 *
 * What it asserts, over EVERY fixtures/games/*.jsonl and fixtures/synthetic/*.jsonl:
 *
 *   1. the narrator runs without throwing, and every line of the story and of
 *      the summary is at most 100 characters;
 *   2. HARD RULE 8 BY IDS: compute the ids that are concealed in EVERY
 *      appearance in the log (a five-key stub, or a face-down card with no
 *      `alt`); no narrated fact resolves one of them to a name;
 *   3. HARD RULE 8 BY NAMES: every card name in decks/*.dck that the log never
 *      shows as a visible card (nor as the seat's own sideboard label) appears
 *      in no line of the output -- the decks are the ground truth the log was
 *      redacted against;
 *   4. NO MEMORY: every name a fact carries is on a visible card of that id in
 *      the fact's own frame or the frame before it -- and, for everything that
 *      is not a zone move, not concealed in the fact's own frame (protocol
 *      invariant 10: a concealed card replaces what was known about it);
 *   5. no `(123)` engine id reaches the text, and no turn is headed twice.
 *
 * The negative controls, because an assertion that cannot fail proves nothing
 * (tools/check-redaction-selftest.mjs's own rule):
 *
 *   N1  a copy of disjoint.jsonl with one always-hidden card's stub given a
 *       NAME (its `hidden` flag dropped, as a leaky emitter would write it) --
 *       the narrator prints what the log says, and checks 2 and 3 must both
 *       FAIL on it;
 *   N2  the same name injected with `hidden: true` kept -- the narrator must
 *       not print it at all (faceOf() reads nothing off a stub);
 *   N3  a fact whose name is moved to a card the adjacent frames do not show
 *       -- check 4's backing half must FAIL;
 *   N4  a non-move fact given the name its card had in the frame before, when
 *       it is concealed in its own -- check 4's invariant-10 half must FAIL;
 *   N5  the client-log dedupe switched off -- the synthetic client log must
 *       then narrate some moment twice.
 *
 * And a CLIENT log: fixtures/games/human-comfort-13.jsonl rebuilt as the
 * client saw it (amendment M10: after each `resync`, the cached hello_ok, the
 * last `state` and any outstanding ask re-delivered VERBATIM, same seq and t;
 * `recordedBy: "client"`), with resyncs added at moments whose last `state`
 * has something to narrate.  It must narrate exactly the facts the bridge's
 * own log does, count every re-delivered frame, pass tools/check-redaction.mjs
 * (which applies its --client-log rule by itself), and -- with a run of frames
 * cut out, as a disconnected client never received them -- say so.
 *
 * Finally the golden files, byte for byte: fixtures/narrate/g1-turns-1-3.txt
 * (`--turn 1-3`) and fixtures/narrate/g1-summary.txt (`--summary`).  When the
 * narration changes on purpose, regenerate them with --write-golden and read
 * the diff before committing it.
 *
 * Exit: 0 all assertions held; 1 any failed; 2 bad usage.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { narrate, parseLog, renderStory, renderSummary } from './narrate.mjs';

const args = process.argv.slice(2);
const WRITE_GOLDEN = args.includes('--write-golden');
let extraLogs = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--logs') {
    extraLogs = String(args[i + 1] ?? '').split(',').filter((f) => f.length > 0).map((entry) => {
      const [log, bridge = null] = entry.split('=');
      return { log, bridge };
    });
    i += 1;
  } else if (args[i] !== '--write-golden') {
    process.stderr.write('usage: node tools/narrate-selftest.mjs [--write-golden] [--logs a.jsonl,client.jsonl=bridge.jsonl]\n');
    process.exit(2);
  }
}

const started = Date.now();
let failures = 0;
let checks = 0;
const bad = (msg) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
};
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) bad(msg);
  return cond;
};

// ---------------------------------------------------------------------------
// The oracle: written apart from narrate.mjs on purpose, so a bug in the
// narrator's one face reader is not also a bug in the check.

/** Is this card object a card, and is its identity concealed from the seat? */
function isCardObject(o) {
  return o !== null && typeof o === 'object' && typeof o.id === 'number' && 'zone' in o && ('hidden' in o || 'name' in o);
}
function visibleNameOf(card) {
  if (card.hidden === true) return null;
  if (card.faceDown === true) return card.alt && typeof card.alt.name === 'string' && card.alt.name !== '' ? card.alt.name : null;
  return typeof card.name === 'string' && card.name !== '' ? card.name : null;
}

/** Every card object anywhere inside a value (zones, stackCards, asks, input). */
function* cardsIn(value) {
  if (Array.isArray(value)) {
    for (const v of value) yield* cardsIn(v);
  } else if (value !== null && typeof value === 'object') {
    if (isCardObject(value)) yield value;
    for (const v of Object.values(value)) if (v !== null && typeof v === 'object') yield* cardsIn(v);
  }
}

/** What a parsed log shows: the always-concealed ids, every visible name, and each state by seq. */
function audit(parsed) {
  const seen = new Map(); // id -> {visible: bool}
  const visibleNames = new Set();
  const stateBySeq = new Map();
  for (const f of parsed.frames) {
    if (!f || f.dir === 'c2s') continue;
    if (f.type === 'state' && typeof f.seq === 'number') stateBySeq.set(f.seq, f.body);
    for (const card of cardsIn(f.body)) {
      const name = visibleNameOf(card);
      const entry = seen.get(card.id) ?? { visible: false };
      if (name !== null) {
        entry.visible = true;
        visibleNames.add(name);
      }
      seen.set(card.id, entry);
    }
    // Amendment M44 names both decks on the wire; a deck named after a card
    // announces that card, legitimately.
    if (f.type === 'hello_ok' && f.body?.match) {
      for (const d of [f.body.match.yourDeck, f.body.match.aiDeck]) if (typeof d?.name === 'string') visibleNames.add(d.name);
    }
    if (f.type === 'ask' && f.body?.kind === 'sideboard') {
      for (const o of [...(f.body.main ?? []), ...(f.body.side ?? [])]) {
        visibleNames.add(String(o.label ?? '').replace(/\s+\([A-Z0-9]{2,6}\)$/, ''));
      }
    }
  }
  const alwaysHidden = new Set([...seen].filter(([, e]) => !e.visible).map(([id]) => id));
  return { alwaysHidden, visibleNames, stateBySeq };
}

/** All card names in decks/*.dck: the ground truth a log was redacted against. */
function deckNames() {
  const names = new Set();
  for (const file of readdirSync('decks').filter((f) => f.endsWith('.dck'))) {
    let section = '';
    for (const raw of readFileSync(path.join('decks', file), 'utf8').split('\n')) {
      const line = raw.trim();
      if (/^\[.*\]$/.test(line)) section = line.toLowerCase();
      else if (section !== '[metadata]') {
        const m = /^(\d+)\s+(.+?)(\|.*)?$/.exec(line);
        if (m) names.add(m[2].trim());
      }
    }
  }
  return names;
}
const DECK_NAMES = deckNames();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameRe = (name) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`);

// Facts that describe a zone move (or a battlefield diff): their names may come
// from the SOURCE zone in the frame before.  Everything else is the latest view.
const MOVE_KINDS = new Set(['zone', 'dies', 'destroyed', 'sacrificed', 'draw', 'token', 'land', 'leaves', 'appears']);

/**
 * Hold one narrated story to checks 2-5.  Returns a list of problems rather
 * than failing, so the negative controls can assert that problems are FOUND.
 */
function problemsOf(label, parsed, story, texts, extraForbidden = [], oracle = audit(parsed)) {
  const problems = [];
  const { alwaysHidden, visibleNames, stateBySeq } = oracle;
  const facesIn = (seq, id) => {
    const body = stateBySeq.get(seq);
    if (body === undefined) return null;
    return [...cardsIn(body)].filter((c) => c.id === id);
  };
  for (const game of story.games) {
    for (const f of game.facts) {
      for (const ref of f.cards) {
        // 2. the always-hidden ids are never resolved
        if (alwaysHidden.has(ref.id) && ref.name !== null) {
          problems.push(`${label}: card #${ref.id} is concealed in every frame of the log, and a ` +
            `${f.kind} fact at seq ${f.seq} names it ${JSON.stringify(ref.name)}`);
        }
        if (ref.name === null) continue;
        // 4a. backed by the fact's own frame or the one before
        const here = facesIn(f.seq, ref.id) ?? [];
        const before = f.prevSeq === null ? [] : facesIn(f.prevSeq, ref.id) ?? [];
        if (![...here, ...before].some((c) => visibleNameOf(c) === ref.name)) {
          problems.push(`${label}: a ${f.kind} fact at seq ${f.seq} names #${ref.id} ` +
            `${JSON.stringify(ref.name)}, which neither that frame nor the one before shows`);
        }
        // 4b. invariant 10: present and concealed in its own frame -> no name
        if (!MOVE_KINDS.has(f.kind) && here.length > 0 && here.every((c) => visibleNameOf(c) === null)) {
          problems.push(`${label}: a ${f.kind} fact at seq ${f.seq} names #${ref.id} ` +
            `${JSON.stringify(ref.name)}, which that frame conceals (invariant 10)`);
        }
      }
    }
    // 5. one heading per turn
    const turns = game.turns.map((t) => t.turn);
    const dup = turns.filter((t, i) => turns.indexOf(t) !== i);
    if (dup.length > 0) problems.push(`${label}: turn ${dup[0]} is narrated twice in game ${game.gameId}`);
  }
  // 3. the decks' names this log never shows
  const forbidden = [...DECK_NAMES].filter((n) => !visibleNames.has(n)).concat(extraForbidden);
  const res = forbidden.map((n) => [n, nameRe(n)]);
  for (const text of texts) {
    text.split('\n').forEach((line, i) => {
      for (const [n, re] of res) {
        if (re.test(line)) problems.push(`${label}: output line ${i + 1} prints ${JSON.stringify(n)}, a name the log never shows: ${line.trim()}`);
      }
      // 5. no engine id
      if (/\(\d+\)/.test(line)) problems.push(`${label}: output line ${i + 1} carries an engine id: ${line.trim()}`);
      // 1. width
      if ([...line].length > 100) problems.push(`${label}: output line ${i + 1} is ${[...line].length} characters`);
    });
  }
  return problems;
}

const loadParsed = (file) => parseLog(readFileSync(file, 'utf8'));
const renderAll = (story) => [renderStory(story), renderSummary(story)];

// ---------------------------------------------------------------------------
// 1-5 over every committed fixture

const FIXTURES = [
  ...readdirSync('fixtures/games').filter((f) => f.endsWith('.jsonl')).sort().map((f) => `fixtures/games/${f}`),
  ...readdirSync('fixtures/synthetic').filter((f) => f.endsWith('.jsonl')).sort().map((f) => `fixtures/synthetic/${f}`),
];
console.log(`narrate self-test: ${FIXTURES.length} committed logs, ${DECK_NAMES.size} deck names as ground truth`);

const parsedCache = new Map();
let factTotal = 0;
let hiddenTotal = 0;
let namedTotal = 0;
for (const file of FIXTURES) {
  let parsed;
  let story;
  let texts;
  try {
    parsed = loadParsed(file);
    story = narrate(parsed, { file });
    texts = renderAll(story);
  } catch (err) {
    bad(`${file}: the narrator threw: ${err.stack ?? err}`);
    continue;
  }
  parsedCache.set(file, parsed);
  const oracle = audit(parsed);
  const problems = problemsOf(file, parsed, story, texts, [], oracle);
  checks += 1;
  for (const p of problems.slice(0, 10)) bad(p);
  if (problems.length > 10) bad(`${file}: … and ${problems.length - 10} more`);
  const facts = story.games.flatMap((g) => g.facts);
  factTotal += facts.length;
  hiddenTotal += oracle.alwaysHidden.size;
  namedTotal += facts.reduce((n, f) => n + f.cards.filter((c) => c.name !== null).length, 0);
  ok(story.games.length >= 1 && facts.length > 0, `${file}: narrated nothing at all`);
  ok(story.games.every((g) => g.ending !== null), `${file}: the story has no ending, and every committed log ends in \`over\``);
}
console.log(`  ${FIXTURES.length} logs narrated: ${factTotal} facts, ${namedTotal} named card references, ` +
  `${hiddenTotal} ids concealed in every appearance and never named`);

// ---------------------------------------------------------------------------
// N1 / N2: inject a name into one always-hidden card's stub

const INJECTED = 'Zzyzx, the Injected Leak';
{
  const file = 'fixtures/games/disjoint.jsonl';
  const clean = parsedCache.get(file) ?? loadParsed(file);
  const cleanOracle = audit(clean);
  const story = narrate(clean, { file });
  // An always-hidden id with a narrated fact: the opponent's draw of it.
  const target = story.games[0].facts.find((f) => f.kind === 'draw' && f.cards.some((c) => cleanOracle.alwaysHidden.has(c.id)));
  if (!ok(target !== undefined, 'N1: disjoint.jsonl has no narrated draw of an always-hidden card to inject into')) {
    // nothing to run
  } else {
    const id = target.cards.find((c) => cleanOracle.alwaysHidden.has(c.id)).id;
    const doctor = (keepHidden) => {
      const copy = structuredClone(clean);
      let hits = 0;
      for (const f of copy.frames) {
        if (f.type !== 'state' || f.seq !== target.seq) continue;
        for (const p of f.body.players) {
          p.zones.hand.cards = p.zones.hand.cards.map((c) => {
            if (c.id !== id) return c;
            hits += 1;
            const leaked = { ...c, name: INJECTED };
            if (!keepHidden) delete leaked.hidden;
            return leaked;
          });
        }
      }
      return { copy, hits };
    };

    // N1: the leak reaches the story, and both checks catch it.
    const n1 = doctor(false);
    ok(n1.hits === 1, `N1: expected to doctor exactly one stub of #${id} at seq ${target.seq}, doctored ${n1.hits}`);
    const n1Story = narrate(n1.copy, { file: `${file} (doctored)` });
    const n1Texts = renderAll(n1Story);
    const n1Problems = problemsOf('N1', n1.copy, n1Story, n1Texts, [INJECTED], cleanOracle);
    ok(n1Texts[0].includes(INJECTED), 'N1: the doctored log\'s injected name did not reach the story, so the control proves nothing');
    ok(n1Problems.some((p) => p.includes(`card #${id} is concealed in every frame`)),
      'N1: check 2 (always-hidden ids are never named) did NOT fail on a story that names one');
    ok(n1Problems.some((p) => p.includes(JSON.stringify(INJECTED)) && p.includes('a name the log never shows')),
      'N1: check 3 (deck names the log never shows) did NOT fail on a story that prints one');
    console.log(`  N1 rejected: #${id} at seq ${target.seq} given the name "${INJECTED}" -> ${n1Problems.length} problem(s) found`);

    // N2: with the flag kept, the narrator reads nothing off the stub.
    const n2 = doctor(true);
    const n2Story = narrate(n2.copy, { file: `${file} (doctored, flag kept)` });
    const n2Texts = renderAll(n2Story);
    ok(!n2Texts.some((t) => t.includes(INJECTED)), 'N2: the narrator printed a name it read off a `hidden: true` stub');
    ok(problemsOf('N2', n2.copy, n2Story, n2Texts, [INJECTED], cleanOracle).length === 0,
      'N2: a stub carrying a sixth key changed the narration');
    console.log('  N2 held: a name on a `hidden: true` stub is never read');
  }
}

// ---------------------------------------------------------------------------
// N3 / N4: the memory checks catch a name from outside the two frames

{
  const file = 'fixtures/games/disjoint.jsonl';
  const parsed = parsedCache.get(file) ?? loadParsed(file);
  const oracle = audit(parsed);
  const story = narrate(parsed, { file });
  const facts = story.games[0].facts;

  // N3: rename one named card to a name visible somewhere in the log but not
  // on that id in the fact's two frames.
  const named = facts.find((f) => f.seq !== null && f.cards.some((c) => c.name !== null));
  const otherName = [...oracle.visibleNames].find((n) => !facts.some((f) => f.cards.some((c) => c.name === n && c.id === named.cards[0].id)) && n !== named.cards.find((c) => c.name !== null).name);
  const n3 = structuredClone(story);
  const n3Fact = n3.games[0].facts[facts.indexOf(named)];
  n3Fact.cards.find((c) => c.name !== null).name = otherName;
  const n3Problems = problemsOf('N3', parsed, n3, [], [], oracle);
  ok(n3Problems.some((p) => p.includes('neither that frame nor the one before')),
    'N3: check 4 did NOT fail on a fact naming a card its two frames do not show');
  console.log(`  N3 rejected: a ${named.kind} fact renamed to ${JSON.stringify(otherName)} -> ${n3Problems.length} problem(s)`);

  // N4: a non-move fact about a card concealed in its own frame, given the
  // name that card had in the frame before (Ashcloud Phoenix's death trigger).
  const lookBehind = facts.find((f) => !MOVE_KINDS.has(f.kind) && f.seq !== null && f.prevSeq !== null && f.cards.some((c) => {
    if (c.name !== null) return false;
    const here = [...cardsIn(oracle.stateBySeq.get(f.seq))].filter((x) => x.id === c.id);
    const before = [...cardsIn(oracle.stateBySeq.get(f.prevSeq))].filter((x) => x.id === c.id);
    return here.length > 0 && here.every((x) => visibleNameOf(x) === null) && before.some((x) => visibleNameOf(x) !== null);
  }));
  if (ok(lookBehind !== undefined, 'N4: disjoint.jsonl no longer has a fact about a card concealed in its frame and named in the one before')) {
    const n4 = structuredClone(story);
    const f4 = n4.games[0].facts[facts.indexOf(lookBehind)];
    const c4 = f4.cards.find((c) => {
      const before = [...cardsIn(oracle.stateBySeq.get(f4.prevSeq))].filter((x) => x.id === c.id);
      return c.name === null && before.some((x) => visibleNameOf(x) !== null);
    });
    c4.name = visibleNameOf([...cardsIn(oracle.stateBySeq.get(f4.prevSeq))].find((x) => x.id === c4.id && visibleNameOf(x) !== null));
    const n4Problems = problemsOf('N4', parsed, n4, [], [], oracle);
    ok(n4Problems.some((p) => p.includes('which that frame conceals (invariant 10)')),
      'N4: check 4 did NOT fail on a fact that names a card from the frame before its concealment');
    console.log(`  N4 rejected: the ${lookBehind.kind} fact at seq ${lookBehind.seq} given its card's earlier name ` +
      `${JSON.stringify(c4.name)} -> ${n4Problems.length} problem(s)`);
  }
}

// ---------------------------------------------------------------------------
// The client log

{
  const file = 'fixtures/games/human-comfort-13.jsonl';
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n').filter((l) => l.length > 0);
  const header = { ...JSON.parse(lines[0]), recordedBy: 'client' };
  const frames = lines.slice(1).map((l) => JSON.parse(l));

  // Resync points: the log's own three, plus the frames after each of the
  // first three `state`s that carry a cast -- a reconnect there re-delivers a
  // snapshot whose events, narrated twice, would say "casts" twice.
  const extra = new Set();
  for (const f of frames) {
    if (extra.size >= 3) break;
    if (f.type === 'state' && f.body.turn > 0 && f.body.events.some((e) => e.kind === 'cast')) extra.add(f.seq);
  }
  const out = [JSON.stringify(header)];
  let lastHello = null;
  let lastState = null;
  const openAsks = new Map();
  let inserted = 0;
  let c2sSeq = 1000;
  const redeliver = () => {
    out.push(JSON.stringify({ v: 1, seq: (c2sSeq += 1), t: lastState?.t ?? 0, dir: 'c2s', type: 'resync', body: {} }));
    for (const f of [lastHello, lastState, ...openAsks.values()]) {
      if (f === null) continue;
      out.push(JSON.stringify(f));
      inserted += 1;
    }
  };
  for (const f of frames) {
    if (f.dir === 'c2s' && f.type === 'resync') {
      out.push(JSON.stringify(f));
      for (const g of [lastHello, lastState, ...openAsks.values()]) {
        if (g === null) continue;
        out.push(JSON.stringify(g));
        inserted += 1;
      }
      continue;
    }
    out.push(JSON.stringify(f));
    if (f.dir === 's2c' && f.type === 'hello_ok') lastHello = f;
    if (f.dir === 's2c' && f.type === 'state') lastState = f;
    if (f.dir === 's2c' && f.type === 'ask') openAsks.set(f.body.askId, f);
    if (f.dir === 'c2s' && f.type === 'answer') openAsks.delete(f.body.askId);
    if (f.dir === 's2c' && f.type === 'state' && extra.has(f.seq)) redeliver();
  }
  const clientText = `${out.join('\n')}\n`;
  const bridgeStory = narrate(parseLog(text), { file });
  const clientParsed = parseLog(clientText);
  const clientStory = narrate(clientParsed, { file: `${file} (as its client saw it)` });
  const b = bridgeStory.games[0];
  const c = clientStory.games[0];
  ok(clientStory.clientLog === true, 'client log: recordedBy "client" was not recognised');
  ok(c.redelivered === inserted, `client log: ${inserted} frames were re-delivered and the narrator skipped ${c.redelivered}`);
  ok(JSON.stringify(c.facts.map((f) => f.text)) === JSON.stringify(b.facts.map((f) => f.text)),
    'client log: its story differs from the bridge log\'s story of the same game');
  const cTexts = renderAll(clientStory);
  for (const p of problemsOf('client log', clientParsed, clientStory, cTexts).slice(0, 10)) bad(p);
  checks += 1;

  // It is a client log the repo's own checker accepts (--client-log is
  // auto-detected from the header).
  mkdirSync('var/narrate-selftest', { recursive: true });
  const clientFile = 'var/narrate-selftest/human-comfort-13.client.jsonl';
  writeFileSync(clientFile, clientText);
  const red = spawnSync(process.execPath, ['tools/check-redaction.mjs', clientFile], { encoding: 'utf8' });
  ok(red.status === 0, `client log: tools/check-redaction.mjs rejected the synthesised client log:\n${red.stdout}${red.stderr}`);

  // N5: without the dedupe, the same log narrates something twice.
  const n5 = narrate(parseLog(clientText), { keepRedelivered: true });
  ok(n5.games[0].facts.length > b.facts.length,
    'N5: with the resync dedupe switched off the client log narrated nothing extra, so the dedupe is untested');
  console.log(`  client log: ${c.resyncs} resyncs, ${inserted} frames re-delivered and skipped, ` +
    `${c.facts.length} facts = the bridge log's; N5 without the dedupe: ${n5.games[0].facts.length} facts`);

  // A disconnected client never received a run of frames: the frame that
  // played a land, and the two either side of it.  The story must say the
  // client was away and what the battlefield shows changed -- and must NOT
  // flag the harmless gaps every client log has (the `input`s sent before it
  // connected; an ask re-delivered after later frames, M10).
  const landFrame = clientParsed.frames.find((f) => f.dir === 's2c' && f.type === 'state' && f.body.turn >= 3 &&
    f.body.events.some((e) => e.kind === 'land'));
  const [lo, hi] = [landFrame.seq - 2, landFrame.seq + 2];
  const cut = clientParsed.frames.filter((f) => !(f.dir === 's2c' && f.seq >= lo && f.seq <= hi));
  const gapStory = narrate({ header: clientParsed.header, frames: cut }, { file: 'gap' });
  const gapText = renderStory(gapStory);
  const told = gapStory.games[0].gaps.filter((x) => x.told);
  ok(told.length === 1 && gapText.includes('never reached this client; while it was away:') && /is now on .*'s battlefield\./.test(gapText),
    `client log: frames ${lo}–${hi} cut out around a land play were not narrated as a gap with its land ` +
    `(${JSON.stringify(gapStory.games[0].gaps)})`);
  ok(c.gaps.every((x) => !x.told), 'client log: the uncut client log narrated a gap where nothing changed');
  for (const p of problemsOf('gapped client log', { header: clientParsed.header, frames: cut }, gapStory, renderAll(gapStory)).slice(0, 5)) bad(p);
}

// ---------------------------------------------------------------------------
// Concede: the seat's `act: concede`, mid-game and before the game began
// (amendment M11's `over` with no winner and no gameOver `state`).  No
// committed recording concedes, so both are cut from a real one.

{
  const file = 'fixtures/games/human-auto-2026.jsonl';
  const parsed = parsedCache.get(file) ?? loadParsed(file);
  const cutAt = parsed.frames.findIndex((f) => f.type === 'state' && f.body.turn >= 5);
  const s2c = Math.max(...parsed.frames.slice(0, cutAt + 1).filter((f) => f.dir === 's2c').map((f) => f.seq));
  const c2s = Math.max(0, ...parsed.frames.slice(0, cutAt + 1).filter((f) => f.dir === 'c2s').map((f) => f.seq));
  const t = parsed.frames[cutAt].t;
  const concede = { v: 1, seq: c2s + 1, t, dir: 'c2s', type: 'act', body: { action: 'concede' } };
  const over = { v: 1, seq: s2c + 1, t, dir: 's2c', type: 'over', body: { winner: 1, reason: 'AllOpponentsLost', matchOver: true } };
  const mid = narrate({ header: parsed.header, frames: [...parsed.frames.slice(0, cutAt + 1), concede, over] });
  const midText = renderStory(mid);
  ok(/\bHuman concedes\./.test(midText) && mid.games[0].ending?.text === 'Game over after turn 5: Forge AI wins. Human conceded.',
    `concede: a mid-game concede did not read as one (ending: ${JSON.stringify(mid.games[0].ending?.text)})`);

  const early = parsed.frames.slice(0, 2); // hello_ok, the first turn-0 state
  const m11 = narrate({ header: parsed.header, frames: [...early, { ...concede, seq: 1 },
    { ...over, seq: 3, body: { winner: null, reason: null, matchOver: true } }] });
  ok(m11.games[0].ending?.text === 'Game over before turn 1: Human conceded before the game began; the engine recorded no winner.',
    `concede: amendment M11's no-outcome \`over\` read as ${JSON.stringify(m11.games[0].ending?.text)}`);
  console.log(`  concede: mid-game -> "${mid.games[0].ending?.text}"`);
}

// ---------------------------------------------------------------------------
// Logs from the gate (check-all's 12d passes every log it just recorded)

/** "kind|seq|ids": one narrated moment, whatever words it was said in. */
const momentsOf = (story) => {
  const m = new Map();
  for (const f of story.games.flatMap((g) => g.facts)) {
    if (['gap', 'appears', 'leaves'].includes(f.kind)) continue; // a client's own view of its absence
    const k = `${f.kind}|${f.seq}|${f.cards.map((c) => c.id).join(',')}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

for (const { log, bridge } of extraLogs) {
  if (!existsSync(log)) {
    bad(`${log}: named by --logs and not there`);
    continue;
  }
  try {
    const parsed = loadParsed(log);
    const story = narrate(parsed, { file: log });
    const texts = renderAll(story);
    const problems = problemsOf(log, parsed, story, texts);
    checks += 1;
    for (const p of problems.slice(0, 10)) bad(p);
    const g = story.games[0];
    let pair = '';
    if (bridge !== null) {
      if (!existsSync(bridge)) {
        bad(`${bridge}: the bridge half of the pair ${log}=${bridge} is not there`);
      } else {
        // A client that reconnects is re-sent the last state verbatim (M10):
        // narrated twice, that moment would appear more often in the client's
        // story than in the bridge's own log of the same game.
        const theirs = momentsOf(narrate(loadParsed(bridge), { file: bridge }));
        const ours = momentsOf(story);
        const extra = [...ours].filter(([k, n]) => n > (theirs.get(k) ?? 0));
        ok(extra.length === 0, `${log}: narrates ${extra.length} moment(s) more often than the bridge's own log ` +
          `${bridge} does (first: ${extra[0]?.[0]}) -- a re-delivered frame was narrated twice`);
        pair = `, every moment at most as often as ${bridge}`;
      }
    }
    const kind = story.clientLog ? 'client log' : story.header === null ? 'log with no session header' : 'bridge log';
    console.log(`  ${log}: ${kind}, ${g?.facts.length ?? 0} facts, ` +
      `${g?.redelivered ?? 0} re-delivered frames skipped${pair}`);
  } catch (err) {
    bad(`${log}: the narrator threw: ${err.stack ?? err}`);
  }
}

// ---------------------------------------------------------------------------
// The golden files

{
  const g1 = narrate(parsedCache.get('fixtures/games/g1.jsonl') ?? loadParsed('fixtures/games/g1.jsonl'), { file: 'fixtures/games/g1.jsonl' });
  const golden = [
    ['fixtures/narrate/g1-turns-1-3.txt', renderStory(g1, { range: [1, 3] }), 'node tools/narrate.mjs fixtures/games/g1.jsonl --turn 1-3'],
    ['fixtures/narrate/g1-summary.txt', renderSummary(g1), 'node tools/narrate.mjs fixtures/games/g1.jsonl --summary'],
  ];
  for (const [goldenFile, text, command] of golden) {
    if (WRITE_GOLDEN) {
      mkdirSync(path.dirname(goldenFile), { recursive: true });
      writeFileSync(goldenFile, text);
      console.log(`  wrote ${goldenFile} (${command})`);
      continue;
    }
    if (!existsSync(goldenFile)) {
      bad(`${goldenFile} is missing -- run node tools/narrate-selftest.mjs --write-golden`);
      continue;
    }
    const want = readFileSync(goldenFile, 'utf8');
    if (ok(want === text, `${goldenFile} differs from \`${command}\` -- if the change is intended, ` +
      'regenerate with node tools/narrate-selftest.mjs --write-golden and read the diff')) {
      console.log(`  golden ${goldenFile}: byte-identical`);
    } else {
      const a = want.split('\n');
      const b = text.split('\n');
      const i = a.findIndex((l, k) => l !== b[k]);
      console.log(`        first difference, line ${i + 1}:\n        - ${a[i]}\n        + ${b[i]}`);
    }
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
if (failures > 0) {
  console.log(`narrate self-test FAILED: ${failures} of ${checks} checks (${secs} s)`);
  process.exit(1);
}
console.log(`narrate self-test OK: ${checks} checks, 5 negative controls rejected or held (${secs} s)`);
