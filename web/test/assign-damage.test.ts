/*
 * mtg-table — web/test/assign-damage.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Amendment M67 (decision D424) through its reader, on REAL frames
 * (`fixtures/assign-probe/m67-frames.json`, cut from the bridge's frame log of
 * `tools/ws-assign-probe.mjs` against Forge 2.0.14):
 *
 *   1. a blocked non-trampler: `defenderAllowed: false`; an answer giving the
 *      defender damage is refused (the same question again, a new askId, a
 *      reason naming trample), a short total too, and the legal split is
 *      applied exactly — the state's damage events are the answer;
 *   2. a trampler: `defenderAllowed: true`; the defender before every blocker
 *      has lethal is refused, lethal-to-each plus the excess is applied;
 *   3. `assignDamageRuleOf` on a frame from before M67 says `null`, never
 *      `true`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { assignDamageRuleOf, type AssignDamageAsk, type GameStateBody } from '../src/protocol.ts';

interface Cut { dir: string; seq: number; type: string; body: Record<string, unknown> }
const FX = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../fixtures/assign-probe/m67-frames.json', import.meta.url)), 'utf8'),
) as Record<string, Cut[]>;

const asksOf = (part: string): AssignDamageAsk[] =>
  (FX[part] ?? []).filter((f) => f.type === 'ask' && f.body.kind === 'assign_damage').map((f) => f.body as unknown as AssignDamageAsk);
const answerTo = (part: string, askId: string): Record<string, number> => {
  const f = (FX[part] ?? []).find((x) => x.type === 'answer' && x.body.askId === askId);
  assert.ok(f, `an answer to ${askId}`);
  return f.body.value as Record<string, number>;
};
/** Damage dealt by `source` in the cut's states: "p:<id>" / "c:<id>" -> amount. */
const dealtBy = (part: string, source: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const f of FX[part] ?? []) {
    if (f.type !== 'state') continue;
    for (const e of (f.body as unknown as GameStateBody).events ?? []) {
      const d = e as { kind: string; sourceCardId?: number; target?: { kind: string; id: number }; amount?: number };
      if (d.kind !== 'damage' || d.sourceCardId !== source || !d.target) continue;
      const k = `${d.target.kind === 'player' ? 'p' : 'c'}:${String(d.target.id)}`;
      out[k] = (out[k] ?? 0) + (d.amount ?? 0);
    }
  }
  return out;
};
const byTarget = (ask: AssignDamageAsk, value: Record<string, number>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(value)) {
    const t = ask.targets.find((x) => String(x.id) === k);
    assert.ok(t);
    out[t.kind === 'player' ? `p:${String(t.playerId)}` : `c:${String(t.cardId)}`] = n;
  }
  return out;
};

test('M67: a blocked non-trampler may not damage the defender; each refusal is the same question again, with a reason', () => {
  const asks = asksOf('nonTrample');
  assert.equal(asks.length, 3);
  const [first, second, third] = asks as [AssignDamageAsk, AssignDamageAsk, AssignDamageAsk];
  for (const a of asks) {
    assert.equal(a.attackerId, first.attackerId, 'the same attacker every time');
    assert.equal(a.total, 2);
    assert.equal(assignDamageRuleOf(a).defenderAllowed, false);
  }
  assert.equal(new Set(asks.map((a) => a.askId)).size, 3, 'a new askId per asking');
  assert.equal(assignDamageRuleOf(first).reason, null);
  // the bug of 2026-10-10: everything on the player
  assert.deepEqual(answerTo('nonTrample', first.askId), { 0: 2 });
  assert.match(assignDamageRuleOf(second).reason ?? '', /trample/);
  // a total that does not add up
  assert.deepEqual(answerTo('nonTrample', second.askId), { 1: 1 });
  assert.match(assignDamageRuleOf(third).reason ?? '', /exactly 2/);
  // the legal split, applied exactly as answered; the player took nothing
  const legal = answerTo('nonTrample', third.askId);
  assert.deepEqual(dealtBy('nonTrample', first.attackerId ?? -1), byTarget(third, legal));
  assert.ok(!Object.keys(dealtBy('nonTrample', first.attackerId ?? -1)).some((k) => k.startsWith('p:')));
  // lethal per blocker: Razorgrass Screen is a 2/1
  const rule = assignDamageRuleOf(first);
  assert.deepEqual([...rule.lethal.values()], [1, 1]);
});

test('M67: a trampler may damage the defender only once every blocker has lethal', () => {
  const asks = asksOf('trample');
  assert.equal(asks.length, 2);
  const [first, second] = asks as [AssignDamageAsk, AssignDamageAsk];
  assert.equal(assignDamageRuleOf(first).defenderAllowed, true);
  assert.deepEqual(answerTo('trample', first.askId), { 0: first.total });
  assert.match(assignDamageRuleOf(second).reason ?? '', /needs 1/);
  const legal = answerTo('trample', second.askId);
  assert.ok((legal['0'] ?? 0) > 0, 'the excess goes to the defender');
  assert.deepEqual(dealtBy('trample', first.attackerId ?? -1), byTarget(second, legal));
});

test('M67: a bridge before M67 says nothing about the defender -- null, never true', () => {
  const asks = asksOf('nonTrample');
  const old = structuredClone(asks[0]) as AssignDamageAsk;
  delete old.defenderAllowed;
  delete old.reason;
  const rule = assignDamageRuleOf(old);
  assert.equal(rule.defenderAllowed, null);
  assert.equal(rule.reason, null);
});
