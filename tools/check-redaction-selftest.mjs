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
import { readFileSync } from 'node:fs';

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
  ['m47-yourprofile-on-a-human-seat.jsonl', 'fail'],
  ['m47-yourprofile-is-a-path.jsonl', 'fail'],
  ['m47-pace-not-a-number.jsonl', 'fail'],
  // Amendment M49 (the status layer): a full card's keywords -- constants only,
  // [] when face down, never on a stub, and on every full card or none.
  ['m49-keywords-present.jsonl', 'pass'],
  ['m49-stub-carries-keywords.jsonl', 'fail'],
  ['m49-keyword-is-a-display-string.jsonl', 'fail'],
  ['m49-face-down-carries-keywords.jsonl', 'fail'],
  ['m49-keywords-half-present.jsonl', 'fail'],
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

if (failures > 0) {
  console.log(`\ncheck-redaction self-test FAILED (${failures})`);
  process.exit(1);
}
console.log('\ncheck-redaction self-test OK');
