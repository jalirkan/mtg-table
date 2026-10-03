// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The cube lab's profile mix (tools/cubelab/profiles.ts, D347):
 *
 *  - a mix parses to normalised weights, a seat spec may carry its own
 *    `search:k=v` colon, and a malformed mix is refused;
 *  - each drafter's seat is a pure function of the mix and the draft's seed
 *    (the same seed draws the same seats, whatever else ran before);
 *  - the draw follows the weights over many seeds, and A and B are drawn
 *    independently;
 *  - the draw uses a stream of its own, so the draft's own generator is not
 *    consumed (the picks are the same with or without a mix);
 *  - run.ts's seatsOf gives `--profiles` when there is no mix.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkProfiles, isSeatSpec, mixText, parseProfileMix, pickProfiles } from '../../tools/cubelab/profiles.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { seatsOf } from '../../tools/cubelab/run.ts';

test('profile mix: parse, normalise, refuse', () => {
  const m = parseProfileMix('Default:2,Reckless:1,Cautious:1');
  assert.deepEqual(m.map((e) => e.spec), ['Default', 'Reckless', 'Cautious']);
  assert.deepEqual(m.map((e) => e.weight), [0.5, 0.25, 0.25]);
  assert.equal(mixText(m), 'Default:0.5,Reckless:0.25,Cautious:0.25');
  const s = parseProfileMix('Default+search:ms=1000/turns=0:0.5,Default:0.5');
  assert.deepEqual(s.map((e) => e.spec), ['Default+search:ms=1000,turns=0', 'Default']);
  assert.equal(mixText(s), 'Default+search:ms=1000/turns=0:0.5,Default:0.5');
  const one = parseProfileMix('Default+search:0.3,Default+outlets:0.7');
  assert.deepEqual(one.map((e) => e.spec), ['Default+search', 'Default+outlets']);
  assert.equal(parseProfileMix('Default+search:ms=1000:1')[0]?.spec, 'Default+search:ms=1000');
  for (const bad of ['', 'Default', 'Default:0', 'Default:-1', 'Default:x', 'Default:1,Default:1', 'Default+sim:1', '9x:1']) {
    assert.throws(() => parseProfileMix(bad), /profile-mix/, bad);
  }
  assert.equal(isSeatSpec('Reckless+outlets+search:ms=800'), true);
  assert.equal(isSeatSpec('Default+hybrid'), false);
  assert.doesNotThrow(() => checkProfiles(['Default+search', 'Reckless'], ['Default', 'Reckless', 'Cautious']));
  assert.throws(() => checkProfiles(['Bold'], ['Default']), /not one of/);
  assert.throws(() => checkProfiles(['default'], ['Default']), /not one of/);
  assert.doesNotThrow(() => checkProfiles(['Anything'], null));
});

test('profile mix: a pure function of the seed, following the weights, A and B independent', () => {
  const m = parseProfileMix('Default:0.5,Reckless:0.25,Cautious:0.25');
  assert.deepEqual(pickProfiles(m, 1234), pickProfiles(m, 1234));
  const n = 4000;
  const count: Record<string, number> = {};
  let same = 0;
  for (let seed = 1; seed <= n; seed++) {
    const [a, b] = pickProfiles(m, seed);
    count[a] = (count[a] ?? 0) + 1;
    count[`B:${b}`] = (count[`B:${b}`] ?? 0) + 1;
    if (a === b) same++;
  }
  for (const [spec, w] of [['Default', 0.5], ['Reckless', 0.25], ['Cautious', 0.25]] as const) {
    assert.ok(Math.abs((count[spec] ?? 0) / n - w) < 0.03, `A ${spec} ${count[spec]}`);
    assert.ok(Math.abs((count[`B:${spec}`] ?? 0) / n - w) < 0.03, `B ${spec}`);
  }
  // independent draws: P(A == B) = 0.25 + 0.0625 + 0.0625
  assert.ok(Math.abs(same / n - 0.375) < 0.03, `same ${same}`);
});

test('profile mix: the draft stream is untouched, and no mix means --profiles', () => {
  const before = rng(77).next();
  pickProfiles(parseProfileMix('Default:1,Reckless:1'), 77);
  assert.equal(rng(77).next(), before);
  assert.notEqual(rng(77, 'profile-mix').next(), before);
  assert.deepEqual(seatsOf({ profiles: ['Default', 'Reckless'] }, 5), { profileA: 'Default', profileB: 'Reckless' });
  const mix = parseProfileMix('Cautious:1');
  assert.deepEqual(seatsOf({ profiles: ['Default', 'Default'], profileMix: mix }, 5), { profileA: 'Cautious', profileB: 'Cautious' });
});
