#!/usr/bin/env node
/*
 * mtg-table -- tools/check-redaction-selftest.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The negative control for tools/check-redaction.mjs: runs it over
 * fixtures/negative/redaction/ and asserts that every one-defect probe FAILS,
 * for the right reason, and that the undefected baseline PASSES.
 *
 *   node tools/check-redaction-selftest.mjs
 *
 * Its flag sections hold each of the checker's flags to its one relaxation:
 * --pre-amendment, --opponent-library-ok, --partial and --empty-hand-ok (D460,
 * whose controls are variants of the baseline built here, not files).
 *
 * It exists because the checker's own regression is invisible by construction.
 * For one afternoon check-redaction.mjs downgraded the absence of `owner`,
 * `token`, `alt` and `library.cards` to a per-file WARN, so five probes that
 * reverted four amendments all PASSED and check-all.sh exited 0. A green run of
 * a checker that cannot fail is worth nothing, and nothing in the repo was
 * testing THIS file until now.
 *
 * Regenerate the corpus with tools/make-negative-fixtures.mjs when the card
 * shape changes. If the baseline starts failing, that is the signal.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = 'fixtures/negative/redaction';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8'));

/** Run the checker on one file; returns {code, out}. */
function check(file, flags = []) {
  const r = spawnSync(process.execPath, ['tools/check-redaction.mjs', ...flags, `${DIR}/${file}`],
    { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

let failures = 0;
const bad = (msg) => { failures += 1; console.log(`  FAIL  ${msg}`); };

console.log(`check-redaction self-test: ${manifest.length} controls in ${DIR}/`);

// The manifest is generated, so a regeneration from an older copy of
// tools/make-negative-fixtures.mjs could drop a probe and every remaining one
// would still pass. These are named here as well, so losing one is a failure
// rather than a shorter list. Amendment M44's `hello_ok.match` audit is a
// hidden-information assertion (the AI's deck is {name, cards} and nothing
// else) and is optional-when-absent, which is exactly the kind of check a later
// edit could switch off without a single committed recording noticing.
const REQUIRED = [
  ['m44-match-present.jsonl', 'pass'],
  ['m44-aideck-carries-path.jsonl', 'fail'],
  ['m44-aideck-cards-is-a-list.jsonl', 'fail'],
  ['m44-yourdeck-path-mismatch.jsonl', 'fail'],
  // Amendment M47 (spectating): the viewer's own profile, only on an AI viewer,
  // and the paced header's one key.
  ['m47-spectated-present.jsonl', 'pass'],
  // Amendment M60 (D406, D407): a best of three at a table of two, and a seat's consent.
  ['m60-best-of-three-present.jsonl', 'pass'],
  ['m60-score-in-a-one-game-match.jsonl', 'fail'],
  ['m60-score-not-a-count.jsonl', 'fail'],
  ['m60-score-ahead-of-the-game.jsonl', 'fail'],
  ['m60-record-not-a-boolean.jsonl', 'fail'],
  ['m60-record-against-the-ai.jsonl', 'fail'],
  // Amendment M62 (D414): the session header's ai, the search's knobs only, on a seat's log only.
  ['m62-ai-unexpected-key.jsonl', 'fail'],
  ['m62-ai-without-transport.jsonl', 'fail'],
  ['m47-yourprofile-on-a-human-seat.jsonl', 'fail'],
  ['m47-yourprofile-is-a-path.jsonl', 'fail'],
  ['m47-pace-not-a-number.jsonl', 'fail'],
  // Amendment M56: the AI seat's policy, one word of a fixed set.
  ['m56-aipolicy-present.jsonl', 'pass'],
  ['m56-aipolicy-not-a-policy.jsonl', 'fail'],
  // Amendment M49 (the status layer): a full card's keywords -- constants only,
  // [] when face down, never on a stub, and on every full card or none.
  ['m49-keywords-present.jsonl', 'pass'],
  ['m49-stub-carries-keywords.jsonl', 'fail'],
  ['m49-keyword-is-a-display-string.jsonl', 'fail'],
  ['m49-face-down-carries-keywords.jsonl', 'fail'],
  ['m49-keywords-half-present.jsonl', 'fail'],
  // D315: a revealed library top (Courser of Kruphix) is public; two cards, or a
  // private "may look" (Experimental Frenzy), are not.
  ['a3-revealed-top-under-courser.jsonl', 'pass'],
  ['a3-revealed-top-two-cards.jsonl', 'fail'],
  ['a3-revealed-top-look-is-private.jsonl', 'fail'],
  // D371 (A9): an opponent's face-down card in exile may show its face to the
  // seat whose effect dug it there with a look permission (Gonti, Thief of
  // Sanity) -- and in no other shape; in play, the face is the controller's.
  ['a9-look-permission-under-gonti.jsonl', 'pass'],
  ['a9-exiled-face-down-named-without-a-dig.jsonl', 'fail'],
  ['a9-dig-by-the-opponent.jsonl', 'fail'],
  ['a9-alt-appears-after-the-dig.jsonl', 'fail'],
  ['a9-opponent-morph-named.jsonl', 'fail'],
  ['a9-stolen-morph-named-for-its-owner.jsonl', 'fail'],
  // ... and the opposite direction: the viewer's own hand served as a stub.
  ['own-hand-card-redacted.jsonl', 'fail'],
  // Amendment M55 (D347): an AI seat's decision records, in its own log only;
  // the planted leaks are another seat's record and an option naming a card
  // the viewer cannot see.
  ['m55-decisions-present.jsonl', 'pass'],
  ['m55-decision-of-the-other-seat.jsonl', 'fail'],
  ['m55-option-names-the-opponent-hand.jsonl', 'fail'],
  ['m55-decision-carries-a-label.jsonl', 'fail'],
  ['m55-chosen-is-not-an-option.jsonl', 'fail'],
  ['m55-frame-is-not-a-state.jsonl', 'fail'],
  ['m55-decision-in-a-seat-recording.jsonl', 'fail'],
  // Amendment M57 (D358): play exploration's header and decision marks; the
  // planted leak is a mark whose Forge answer names the opponent's hand card.
  ['m57-explore-present.jsonl', 'pass'],
  ['m57-explore-without-header.jsonl', 'fail'],
  ['m57-explore-forge-names-the-opponent-hand.jsonl', 'fail'],
  ['m57-explore-carries-a-label.jsonl', 'fail'],
  ['m57-playexplore-in-a-seat-recording.jsonl', 'fail'],
];
for (const [file, level] of REQUIRED) {
  const entry = manifest.find((e) => e.file === file);
  if (entry === undefined) {
    bad(`${file} is missing from ${DIR}/manifest.json -- regenerate with ` +
      'node tools/make-negative-fixtures.mjs');
  } else if (entry.level !== level) {
    bad(`${file} is level ${JSON.stringify(entry.level)} in the manifest, expected ${JSON.stringify(level)}`);
  }
}

for (const entry of manifest) {
  const { file, level, expect, why } = entry;
  const { code, out } = check(file);

  if (level === 'pass') {
    // The control. Every probe below is this file plus one defect, so if this
    // one does not pass, the probes are failing for a reason nobody chose.
    if (code !== 0) {
      bad(`${file} is the UNDEFECTED baseline and the checker rejected it:\n` +
        out.split('\n').filter((l) => l.includes('!')).slice(0, 4).map((l) => `        ${l.trim()}`).join('\n') +
        `\n        -> regenerate with: node tools/make-negative-fixtures.mjs`);
      continue;
    }
    if (/^\s+~ /m.test(out)) {
      bad(`${file} (the baseline) produced warnings; it should be clean`);
      continue;
    }
    console.log(`  ok    ${file} passes clean (the control)`);
    continue;
  }

  if (level === 'warn') {
    // Legitimately reachable, so it must PASS -- but not quietly.
    if (code !== 0) { bad(`${file} should pass with a warning, but the checker failed it`); continue; }
    if (!out.includes(expect)) {
      bad(`${file} passed SILENTLY. Expected a warning containing ${JSON.stringify(expect)}.\n` +
        `        ${why}`);
      continue;
    }
    console.log(`  ok    ${file} passes but warns (${why})`);
    continue;
  }

  if (code === 0) {
    bad(`${file} PASSED, and it must not.\n        ${why}\n` +
      `        This is the checker failing to see a defect -- exactly the regression this ` +
      `corpus exists to catch.`);
    continue;
  }
  if (!out.includes(expect)) {
    bad(`${file} failed, but for the wrong reason: no message contains ${JSON.stringify(expect)}.\n` +
      `        ${why}\n` +
      out.split('\n').filter((l) => l.includes('!')).slice(0, 3).map((l) => `        ${l.trim()}`).join('\n'));
    continue;
  }
  console.log(`  ok    ${file} is rejected (${why})`);
}

// --- and the flag does what it says ---------------------------------------
// `--pre-amendment` is the ONLY way to read a log recorded before 2026-09-11.
// It must turn the four missing-key probes back into warnings -- and it must NOT
// excuse anything else, or it becomes a way to land a leak.
const tolerated = ['p1-stub-without-owner.jsonl', 'p15-card-without-token.jsonl',
  'p3-card-without-alt.jsonl', 'p2-library-without-cards.jsonl',
  'p3-facedownhidden-revived.jsonl'];
for (const file of tolerated) {
  const { code, out } = check(file, ['--pre-amendment']);
  if (code !== 0) bad(`--pre-amendment did not accept ${file}, which is what the flag is for`);
  else if (!out.includes('WARN')) bad(`--pre-amendment accepted ${file} with no WARN line`);
  else console.log(`  ok    ${file} is a WARN under --pre-amendment`);
}
for (const file of ['a1-stub-with-a-name.jsonl', 'a6-opponent-hand-named.jsonl']) {
  const { code } = check(file, ['--pre-amendment']);
  if (code === 0) bad(`--pre-amendment excused ${file} -- the flag is for ABSENT keys, never leaks`);
  else console.log(`  ok    ${file} is still rejected under --pre-amendment`);
}

// --- and so does the other flag -------------------------------------------
// `--opponent-library-ok` is the ONLY way to land a recording in which a seat
// other than the viewer has full cards in `library.cards` (A3 is a failure by
// default since 2026-09-11). It must downgrade exactly that one assertion, and
// it must not excuse A6: an id revealed out of an opponent's library is still
// no licence to name the same card in their HAND later.
{
  const file = 'a3-opponent-library-revealed.jsonl';
  const { code, out } = check(file, ['--opponent-library-ok']);
  if (code !== 0) bad(`--opponent-library-ok did not accept ${file}, which is what the flag is for`);
  else if (!/^\s+~ /m.test(out)) bad(`--opponent-library-ok accepted ${file} with no warning line`);
  else console.log(`  ok    ${file} is a WARN under --opponent-library-ok`);
}
for (const file of ['a6-library-reveal-is-not-a-whitelist.jsonl', 'a6-opponent-hand-named.jsonl']) {
  const { code } = check(file, ['--opponent-library-ok']);
  if (code === 0) {
    bad(`--opponent-library-ok excused ${file} -- the flag relaxes A3 and nothing else, and ` +
      `an opponent-library reveal is TRANSIENT: it confers no name-before-reveal exemption`);
  } else {
    console.log(`  ok    ${file} is still rejected under --opponent-library-ok`);
  }
}

// --- and --partial (D440: the watch runner's served prefix) -----------------
// It skips the three coverage checks and holds back a tail a later line could
// cure -- and nothing else.  So: every probe above fails under it for the same
// reason, every control passes clean, a two-line prefix is exit 3 and not a
// failure, the one frame of slack is undecided when the log is cut inside it and
// still a failure one frame further, and no prefix of a committed recording
// fails it (a stride over fixtures/games/, every line of the small ones; the
// every-line sweep of all of them, about 3.5 minutes, is measured in
// docs/watch-bots.md, *Following a game*).
{
  const { checkFile } = await import('./check-redaction.mjs');
  const lead = (s) => console.log(`  ok    ${s}`);
  let same = 0;
  for (const { file, level, expect } of manifest) {
    const r = checkFile(`${DIR}/${file}`, { partial: true });
    if (level === 'fail') {
      if (r.problems.length === 0 || !r.problems.some((p) => p.includes(expect))) bad(`--partial does not reject ${file} for its reason (${JSON.stringify(expect)}): a leak rule is switched off in partial mode`);
      else same++;
    } else if (r.problems.length > 0) bad(`--partial rejects ${file}, which passes without it: ${r.problems[0]}`);
    else if (level === 'pass' && (r.skipped.length > 0 || r.undecided.length > 0)) bad(`--partial calls the whole control ${file} short (${r.skipped.join('; ')})`);
    else same++;
  }
  if (same === manifest.length) lead(`--partial: every one of the ${manifest.length} controls has the same verdict, for the same reason`);

  /** `n` lines of `file` (or the given line numbers, 1-based), as text. */
  const cut = (file, n) => {
    const L = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    return `${(Array.isArray(n) ? n.map((k) => L[k - 1]) : L.slice(0, n)).join('\n')}\n`;
  };
  const SCRATCH = 'var/check-redaction-selftest';
  mkdirSync(SCRATCH, { recursive: true });
  const cli = (text, flags = ['--partial']) => {
    const f = `${SCRATCH}/prefix-${process.pid}.jsonl`;
    writeFileSync(f, text);
    const r = spawnSync(process.execPath, ['tools/check-redaction.mjs', ...flags, f], { encoding: 'utf8' });
    rmSync(f, { force: true });
    return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
  };
  const two = cut(`${DIR}/baseline.jsonl`, 2);
  const t2 = cli(two);
  const t2full = cli(two, []);
  if (t2.code !== 3 || !/skipped \(coverage, not a leak\): no state frames at all/.test(t2.out) || !t2.out.includes(`decided=${Buffer.byteLength(two)} of`)) bad(`a two-line prefix (the header, hello_ok) under --partial: want exit 3, the skipped line and decided=all, got ${t2.code}`);
  else if (t2full.code !== 1) bad(`a two-line prefix without --partial should still fail (the coverage checks), got ${t2full.code}`);
  else lead('a two-line prefix: --partial exit 3 (coverage skipped, nothing leaked); without the flag still exit 1');
  const whole = cli(readFileSync(`${DIR}/baseline.jsonl`, 'utf8'));
  if (whole.code !== 0) bad(`the whole baseline under --partial: want exit 0, got ${whole.code}`);
  const leak = cli(cut(`${DIR}/a1-stub-with-a-name.jsonl`, 3));
  if (leak.code !== 1 || !leak.out.includes('leaks extra keys: name')) bad(`a three-line prefix whose state carries a named stub under --partial: want exit 1 for A1, got ${leak.code}`);
  else lead('a prefix ending in a leaking state: --partial exit 1, A1');
  rmSync(SCRATCH, { recursive: true, force: true });

  // A6's one frame of slack, cut inside it: the state that shows the opponent's
  // card, then the reveal ask that justifies it, with nothing between them.
  const slackFile = `${DIR}/a6-reveal-ask-one-frame-too-late.jsonl`;
  // (the notice dropped, the ask and the over renumbered so the seq series stays whole)
  const justified = cut(slackFile, [1, 2, 3, 4, 5, 7, 8]).split('\n').filter(Boolean)
    .map((l, i) => (i >= 5 ? JSON.stringify({ ...JSON.parse(l), seq: i }) : l)).join('\n') + '\n';
  const beforeAsk = cut(slackFile, [1, 2, 3, 4, 5]);
  const tooLate = cut(slackFile, [1, 2, 3, 4, 5, 6]);
  const atState = Buffer.byteLength(cut(slackFile, [1, 2, 3, 4]));
  const j = checkFile('justified.jsonl', { text: justified });
  const p5 = checkFile('before-ask.jsonl', { partial: true, text: beforeAsk });
  const f5 = checkFile('before-ask.jsonl', { text: beforeAsk });
  const p6 = checkFile('too-late.jsonl', { partial: true, text: tooLate });
  if (j.problems.length > 0) bad(`the slack fixture with the ask straight after the state should pass whole: ${j.problems[0]}`);
  else if (p5.problems.length > 0 || p5.undecided.length === 0 || p5.decidedBytes !== atState) bad(`cut between the state and its ask, --partial should hold the state undecided (decided=${atState}), got problems=${p5.problems.length} undecided=${p5.undecided.length} decided=${p5.decidedBytes}`);
  else if (f5.problems.length === 0) bad('cut between the state and its ask, the FULL check should fail it (nothing after it justifies it)');
  else if (p6.problems.length === 0 || !p6.problems.some((x) => x.includes('carries a name'))) bad('cut one frame later (a notice after the state), --partial should fail it: the slack is one frame');
  else lead(`A6's slack cut inside it: --partial holds the state back (decided=${atState} bytes), one frame later it fails`);

  // M55's D3: a decision may name the NEXT state's cards; cut before that state, it waits.
  const d3 = `${DIR}/m55-option-names-the-opponent-hand.jsonl`;
  const d4 = checkFile('d3.jsonl', { partial: true, text: cut(d3, 4) });
  const d5 = checkFile('d3.jsonl', { partial: true, text: cut(d3, 5) });
  if (d4.problems.length > 0 || d4.undecided.length === 0 || d4.decidedBytes !== Buffer.byteLength(cut(d3, 3))) bad(`a decision naming a card with no later state yet: --partial should hold it undecided, got problems=${d4.problems.length} undecided=${d4.undecided.length}`);
  else if (d5.problems.length === 0) bad('the same decision once the next state is in the prefix (and does not show the card): --partial should fail it');
  else lead('M55 D3 cut before the next state: undecided; with it: a failure');

  // No prefix of a healthy recording fails --partial.
  const t0 = Date.now();
  let prefixes = 0;
  const sweep = (file, stride) => {
    const text = readFileSync(file, 'utf8');
    const L = text.split('\n').filter(Boolean);
    let at = 0;
    const ends = L.map((l) => (at += Buffer.byteLength(l) + 1));
    const buf = Buffer.from(text);
    for (let k = 1; k <= L.length; k += (k < 6 ? 1 : stride)) {
      const r = checkFile(file, { partial: true, text: buf.subarray(0, ends[k - 1]).toString('utf8') });
      prefixes++;
      if (r.problems.length > 0) { bad(`${file} cut at ${k} lines fails --partial: ${r.problems[0].slice(0, 300)}`); return; }
    }
  };
  for (const { file, level } of manifest) if (level !== 'fail') sweep(`${DIR}/${file}`, 1);
  for (const f of readdirSync('fixtures/synthetic').filter((x) => x.endsWith('.jsonl'))) sweep(`fixtures/synthetic/${f}`, 1);
  for (const f of readdirSync('fixtures/games').filter((x) => x.endsWith('.jsonl')).sort()) sweep(`fixtures/games/${f}`, 97);
  lead(`${prefixes} prefixes of the committed recordings pass --partial (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// --- and --empty-hand-ok (D460: the move atlas's branch logs) ----------------
// It turns "not one card was redacted" and "the viewer never saw a named card"
// into WARNs only where the file proves the hand empty in every state -- and
// nothing else.  So: the default is unchanged, every probe keeps its verdict
// under the flag, an emptied hand passes with a WARN, and a hand that is not
// empty -- a full opponent card at count 1, a count of 1 with no stub, a listed
// library card -- still fails, with the flag saying why it does not apply.
{
  const { checkFile } = await import('./check-redaction.mjs');
  const lead = (s) => console.log(`  ok    ${s}`);
  let same = 0;
  for (const { file, level, expect } of manifest) {
    const r = checkFile(`${DIR}/${file}`, { emptyHandOk: true });
    if (level === 'fail') {
      if (!r.problems.some((p) => p.includes(expect))) bad(`--empty-hand-ok does not reject ${file} for its reason (${JSON.stringify(expect)})`);
      else same++;
    } else if (r.problems.length > 0) bad(`--empty-hand-ok rejects ${file}, which passes without it: ${r.problems[0]}`);
    else same++;
  }
  if (same === manifest.length) lead(`--empty-hand-ok: every one of the ${manifest.length} controls has the same verdict, for the same reason`);

  const base = readFileSync(`${DIR}/baseline.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const seat = base[0].seat;
  /** The baseline with `edit(player, isViewer, stateIndex)` applied to every state's players. */
  const variant = (edit) => `${base.map((f, i) => {
    if (i === 0 || f.type !== 'state') return JSON.stringify(f);
    const g = structuredClone(f);
    for (const p of g.body.players) edit(p, p.id === seat, i);
    return JSON.stringify(g);
  }).join('\n')}\n`;
  const empty = { count: 0, cards: [] };
  const firstState = base.findIndex((f) => f.type === 'state');
  // a full card's shape, under an id this log never showed the viewer (so nothing revealed it)
  const oppCard = { ...structuredClone(base[firstState].body.players.find((p) => p.id === seat).zones.hand.cards[0]), id: 9001 };
  const NOTHING = 'not one card was redacted';
  const NAMED = 'the viewer never saw a named card in their own hand';
  const run = (name, text, flag) => checkFile(name, { text, emptyHandOk: flag });
  const has = (r, msg) => r.problems.some((p) => p.includes(msg));
  const warns = (r, msg) => r.warnings.some((w) => w.includes(msg) && w.includes('--empty-hand-ok'));

  // The proof holds: the opponent's hand empty in every state, its library a bare count.
  const oppEmpty = variant((p, v) => { if (!v) p.zones.hand = { ...empty }; });
  const o0 = run('opp-empty.jsonl', oppEmpty, false);
  const o1 = run('opp-empty.jsonl', oppEmpty, true);
  if (!has(o0, NOTHING)) bad('an opponent hand empty in every state, WITHOUT the flag: "not one card was redacted" must still fail (the default is unchanged)');
  else if (o1.problems.length > 0 || !warns(o1, NOTHING)) bad(`the same file under --empty-hand-ok: want a pass with a WARN, got ${o1.problems[0] ?? 'no warning'}`);
  else lead('an opponent hand empty in every state: a failure by default, a WARN under --empty-hand-ok');

  // The seat-1 twin: the viewer's own hand empty in every state.
  const viewerEmpty = variant((p, v) => { if (v) p.zones.hand = { ...empty }; });
  const v0 = run('viewer-empty.jsonl', viewerEmpty, false);
  const v1 = run('viewer-empty.jsonl', viewerEmpty, true);
  if (!has(v0, NAMED)) bad('a viewer hand empty in every state, WITHOUT the flag: "the viewer never saw a named card" must still fail');
  else if (v1.problems.length > 0 || !warns(v1, NAMED)) bad(`the same file under --empty-hand-ok: want a pass with a WARN, got ${v1.problems[0] ?? 'no warning'}`);
  else lead('a viewer hand empty in every state: a failure by default, a WARN under --empty-hand-ok');

  // Negative controls: the proof does not hold, so the coverage failure stands under the flag.
  const plant = (name, edit, why, also) => {
    const r = run(name, variant(edit), true);
    if (!has(r, NOTHING) || !r.problems.some((p) => p.includes(NOTHING) && p.includes(`--empty-hand-ok does not apply: ${why}`))) {
      bad(`${name} under --empty-hand-ok: "${NOTHING}" must still FAIL, saying "${why}"; got ${r.problems.find((p) => p.includes(NOTHING)) ?? r.problems[0] ?? 'a pass'}`);
    } else if (also && !has(r, also)) bad(`${name} under --empty-hand-ok: want the leak rule's own failure too (${JSON.stringify(also)})`);
    else lead(`${name}: still a failure under --empty-hand-ok (${why})`);
  };
  // a broken canBeShownTo: the opponent's one card, full, at count 1 (the other states empty)
  plant('opp-full-card-count-1.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = i === firstState ? { count: 1, cards: [{ ...oppCard, owner: p.id, controller: p.id }] } : { ...empty };
  }, 'another seat\'s hand is not empty', 'is not marked hidden');
  // a count of 1 with no stub: the card went missing instead of being redacted
  plant('opp-count-1-no-stub.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = i === firstState ? { count: 1, cards: [] } : { ...empty };
  }, 'another seat\'s hand is not empty', 'count=1 but cards.length=0');
  // the opponent's library listed: full cards where a bare count belongs
  plant('opp-library-listed.jsonl', (p, v, i) => {
    if (v) return;
    p.zones.hand = { ...empty };
    if (i === firstState) p.zones.library = { count: p.zones.library.count, cards: [{ ...oppCard, zone: 'library', owner: p.id, controller: p.id }] };
  }, 'a card of another seat\'s hand or library is listed', 'full card(s) in library.cards');
  // the opponent seat left out of the states (the #178 review): an empty hand nobody listed proves nothing
  const dropOpp = (which) => `${base.map((f, i) => {
    if (i === 0 || f.type !== 'state') return JSON.stringify(f);
    const g = structuredClone(f);
    for (const p of g.body.players) if (p.id === seat) p.zones.hand = { ...empty };
    if (which(i)) g.body.players = g.body.players.filter((p) => p.id === seat);
    else for (const p of g.body.players) if (p.id !== seat) p.zones.hand = { ...empty };
    return JSON.stringify(g);
  }).join('\n')}\n`;
  for (const [name, which, why] of [
    ['opp-seat-never-listed.jsonl', () => true, 'no state lists any seat but the viewer\'s'],
    ['opp-seat-missing-once.jsonl', (i) => i === firstState, `the state at line ${firstState + 1} lists 1 of the 2 seats`],
  ]) {
    const r = run(name, dropOpp(which), true);
    const ok = (msg) => r.problems.some((p) => p.includes(msg) && p.includes(`--empty-hand-ok does not apply: ${why}`));
    if (!ok(NOTHING) || !ok(NAMED)) bad(`${name} under --empty-hand-ok: "${NOTHING}" and "${NAMED}" must both still FAIL, saying "${why}"; got ${r.problems.find((p) => p.includes(NOTHING)) ?? r.problems[0] ?? 'a pass'}`);
    else lead(`${name}: still a failure under --empty-hand-ok (${why})`);
  }
  // and the twin: the viewer's hand at count 1 served as a stub
  {
    const r = run('viewer-count-1-stub.jsonl', variant((p, v, i) => {
      if (!v) return;
      p.zones.hand = i === firstState ? { count: 1, cards: [{ id: oppCard.id, zone: 'hand', owner: seat, controller: seat, hidden: true }] } : { ...empty };
    }), true);
    if (!r.problems.some((p) => p.includes(NAMED) && p.includes('--empty-hand-ok does not apply: the viewer\'s hand is not empty'))) bad(`a viewer hand at count 1 (a stub) under --empty-hand-ok: "${NAMED}" must still FAIL; got ${r.problems[0] ?? 'a pass'}`);
    else lead('viewer-count-1-stub.jsonl: still a failure under --empty-hand-ok (the viewer\'s hand is not empty)');
  }
}

if (failures > 0) {
  console.log(`\ncheck-redaction self-test FAILED (${failures})`);
  process.exit(1);
}
console.log('\ncheck-redaction self-test OK');
