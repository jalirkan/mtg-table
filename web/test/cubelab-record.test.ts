// mtg-table — the cube lab's in-worker recordings (D315) under the redaction checker.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// fixtures/cubelab/recorded/ is one game of the synergy cube recorded by the
// lab's worker (`tools/cubelab.sh run ... --record-all`): both chairs, gzipped,
// written by mtgtable.SeatRecorder -- RecordMatch's recorder reused, Snap's
// redaction per seat.  tools/check-redaction.mjs must pass both logs (it reads
// `.gz` since D315), and must FAIL a copy with one of the opponent's hand stubs
// turned into a named card, so the pass means something.  Gate 12g runs the
// checker over a fresh recording too.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const RUN = join(REPO, 'fixtures/cubelab/recorded');
const LOGS = [0, 1].map((s) => join(RUN, `games/7/g1-seat${s}.jsonl.gz`));

const check = (files: string[]): { status: number | null; out: string } => {
  const r = spawnSync(process.execPath, [join(REPO, 'tools/check-redaction.mjs'), ...files], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

const linesOf = (f: string): Array<Record<string, any>> =>
  gunzipSync(readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('both chairs of a lab recording pass the redaction checker', () => {
  const r = check(LOGS);
  assert.equal(r.status, 0, r.out);
  assert.equal((r.out.match(/^PASS {2}/gm) ?? []).length, 2, r.out);
  assert.match(r.out, /hello_ok\.match checked on 1 of 1/);
});

test('each chair is its own viewer: header seat, deck path only for itself, the lab block', () => {
  for (const [seat, f] of LOGS.entries()) {
    const [header, hello] = linesOf(f) as [Record<string, any>, Record<string, any>];
    assert.equal(header.kind, 'session');
    assert.equal(header.seat, seat);
    const mine = header.decks.find((d: any) => d.player === seat);
    const theirs = header.decks.find((d: any) => d.player !== seat);
    assert.ok(mine.path && mine.sha256);
    assert.equal(theirs.path, null);
    assert.equal(theirs.sha256, null);
    assert.deepEqual(Object.keys(hello.body.match.aiDeck).sort(), ['cards', 'name']);
    assert.equal(header.lab.draftSeed, 7);
    assert.equal(header.lab.gameSeed, header.seed);
    assert.match(header.lab.cubeSha, /^[0-9a-f]{64}$/);
  }
});

test('negative control: an opponent hand card named in a lab recording FAILS the checker', () => {
  const frames = linesOf(LOGS[0] as string);
  let planted = false;
  for (const f of frames) {
    if (f.type !== 'state' || planted) continue;
    const [me, opp] = f.body.players as [any, any];
    const stub = opp.zones.hand.cards.find((c: any) => c.hidden);
    const named = me.zones.hand.cards.find((c: any) => !c.hidden && c.name);
    if (!stub || !named) continue;
    Object.assign(stub, { ...named, id: stub.id, owner: opp.id, controller: opp.id, zone: 'hand' });
    delete stub.hidden;
    planted = true;
  }
  assert.ok(planted, 'no state frame with a stub in the opponent hand and a card in mine');
  const dir = mkdtempSync(join(tmpdir(), 'cubelab-record-'));
  try {
    const bad = join(dir, 'leak.jsonl.gz');
    writeFileSync(bad, gzipSync(`${frames.map((f) => JSON.stringify(f)).join('\n')}\n`));
    const r = check([bad]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^FAIL {2}/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// D347: fixtures/cubelab/decisions/ is one lab game recorded with the decision
// records (drafter A played with the search, B with Forge's Default).  Each
// chair's records are its own; the planted leak is chair B's records copied
// into chair A's log -- B's legal options name B's hand -- and the checker must
// fail it, as it must fail one of A's options rewritten to name a card of B's
// concealed hand.
const DEC = join(REPO, 'fixtures/cubelab/decisions');
const DEC_LOGS = [0, 1].map((s) => join(DEC, `games/101/g1-seat${s}.jsonl.gz`));

test('decision records: both chairs pass, each holds only its own, the search seat carries the search', () => {
  const r = check(DEC_LOGS);
  assert.equal(r.status, 0, r.out);
  for (const [seat, f] of DEC_LOGS.entries()) {
    const lines = linesOf(f);
    const recs = lines.filter((l) => l.dir === 'ai' && l.type === 'decision');
    assert.ok(recs.length > 50, `${f}: ${recs.length} records`);
    assert.ok(recs.every((l) => l.body.seat === seat));
    const searched = recs.filter((l) => l.body.search);
    if (lines[0]!.seats.find((s: any) => s.player === seat).policy === 'search') assert.ok(searched.length > 0);
    else assert.equal(searched.length, 0);
    assert.equal(lines.filter((l) => l.dir === 'ai' && l.type === 'decisions').length, 1);
  }
});

const rewrite = (src: string, edit: (frames: Array<Record<string, any>>) => void): { status: number | null; out: string } => {
  const frames = linesOf(src);
  edit(frames);
  const dir = mkdtempSync(join(tmpdir(), 'decision-leak-'));
  try {
    const bad = join(dir, 'leak.jsonl.gz');
    writeFileSync(bad, gzipSync(`${frames.map((f) => JSON.stringify(f)).join('\n')}\n`));
    return check([bad]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('negative control: the other chair\'s decision records in a log FAIL the checker', () => {
  const theirs = linesOf(DEC_LOGS[1] as string).filter((l) => l.dir === 'ai' && l.type === 'decision').slice(0, 1);
  const r = rewrite(DEC_LOGS[0] as string, (frames) => {
    const at = frames.findIndex((f) => f.dir === 'ai');
    frames.splice(at, 0, ...theirs);
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /record of seat 1 in seat 0's recording/);
});

test('negative control: an option naming the opponent\'s concealed hand card FAILS the checker', () => {
  const r = rewrite(DEC_LOGS[0] as string, (frames) => {
    const rec = frames.find((f) => f.dir === 'ai' && f.type === 'decision' && f.body.kind === 'priority')!;
    const st = frames[rec.body.frame + 1]!;   // frames[0] is the header; `frame` indexes the lines after it
    assert.equal(st.type, "state");
    const opp = st.body.players.find((p: any) => p.id !== 0);
    const stub = opp.zones.hand.cards.find((c: any) => c.hidden);
    rec.body.options.push(`cast:${stub.id}`);
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /which its state frame does not show/);
});

// M75 / D486: a target record may carry source "modes" (a modal spell's modes drawn by the random seat inside the
// cast) and why "MODES_DRAWN"; any other source still FAILS the checker.
test('M75: a target record with source "modes" passes; an unknown source FAILS the checker', () => {
  const sourced = (src: string) => rewrite(DEC_LOGS[0] as string, (frames) => {
    const rec = frames.find((f) => f.dir === 'ai' && f.type === 'decision' && f.body.kind === 'target')!;
    rec.body.source = src;
    rec.body.why = 'MODES_DRAWN';
  });
  const ok = sourced('modes');
  assert.equal(ok.status, 0, ok.out);
  const odd = sourced('castModes');
  assert.equal(odd.status, 1, odd.out);
  assert.match(odd.out, /decision source "castModes"/);
});

// D358: fixtures/cubelab/explore/ is one lab game played with play exploration
// (`--play-explore share=1,epsilon=0.2,closecall=0.05,opening=on`), both chairs.
// Both pass the checker with their marks; the planted leak is a mark whose
// "Forge's answer" names a card of the opponent's concealed hand, and an explore
// mark in a log whose header does not say it explored is refused.
const EXP = join(REPO, 'fixtures/cubelab/explore');
const EXP_LOGS = [0, 1].map((s) => join(EXP, `games/102/g1-seat${s}.jsonl.gz`));

test('play exploration: both chairs pass, the header and the marks say the game explored', () => {
  const r = check(EXP_LOGS);
  assert.equal(r.status, 0, r.out);
  for (const f of EXP_LOGS) {
    const lines = linesOf(f);
    assert.deepEqual(lines[0]!.playExplore, { epsilon: 0.2, closeCall: 0.05, opening: true });
    const marked = lines.filter((l) => l.dir === 'ai' && l.type === 'decision' && l.body.explore);
    assert.ok(marked.length > 0, f);
    const summary = lines.find((l) => l.dir === 'ai' && l.type === 'decisions')!.body.explore;
    assert.equal(marked.filter((l) => l.body.explore.rule === 'random').length, summary.decisionsRandomised);
  }
});

test('negative control: an explore mark naming the opponent\'s concealed hand card FAILS the checker', () => {
  const r = rewrite(EXP_LOGS[0] as string, (frames) => {
    const rec = frames.find((f) => f.dir === 'ai' && f.type === 'decision' && f.body.explore && f.body.kind === 'priority')!;
    const st = frames[rec.body.frame + 1]!;
    assert.equal(st.type, 'state');
    const opp = st.body.players.find((p: any) => p.id !== 0);
    rec.body.explore.forge = `cast:${opp.zones.hand.cards.find((c: any) => c.hidden).id}`;
  });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /which its state frame does not show/);
});

test('negative control: an explore mark in a log that did not explore FAILS the checker', () => {
  const r = rewrite(EXP_LOGS[1] as string, (frames) => { delete frames[0]!.playExplore; });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /no playExplore/);
});

// M71 / D458: a random seat's decisions summary carries its guardrail counts. Rewritten as a random
// seat's header (epsilon 1, no close calls) the explore fixture passes with G5's counts; the same
// counts in a D358 log (epsilon 0.2), or an unknown or non-integer count, FAIL the checker.
const withGuardrails = (frames: Array<Record<string, any>>, g: unknown): void => {
  frames.find((f) => f.dir === 'ai' && f.type === 'decisions')!.body.explore.guardrails = g;
};

test('M71: a random seat\'s summary may carry its guardrail counts (G5 and, M73, G6 included; D485\'s two and D486\'s two too)', () => {
  const r = rewrite(EXP_LOGS[0] as string, (frames) => {
    frames[0]!.playExplore = { epsilon: 1, closeCall: 0, opening: false };
    withGuardrails(frames, { land: 5, keep: 1, noRepeatNoOp: 0, refusedCast: 2, noRepeatRefused: 2, xDrawn: 3, zeroXLeftOut: 22, zeroX: 0,
      retargeted: 4, staleRefused: 1, cardTargetOffered: 7, modesDrawn: 2 });
  });
  assert.equal(r.status, 0, r.out);
});

test('negative control: guardrail counts outside a random seat\'s log, or of an unknown name, FAIL the checker (M71)', () => {
  const d358 = rewrite(EXP_LOGS[0] as string, (frames) => withGuardrails(frames, { refusedCast: 1 }));
  assert.equal(d358.status, 1, d358.out);
  assert.match(d358.out, /explore\.guardrails outside a random seat's log/);
  const odd = rewrite(EXP_LOGS[0] as string, (frames) => {
    frames[0]!.playExplore = { epsilon: 1, closeCall: 0, opening: false };
    withGuardrails(frames, { refusedCast: 1.5, castFromHand: 1 });
  });
  assert.equal(odd.status, 1, odd.out);
  assert.match(odd.out, /explore\.guardrails "refusedCast": 1\.5/);
  assert.match(odd.out, /explore\.guardrails "castFromHand"/);
});

test('negative control: guardrails that are not an object of counts (null, [], "") FAIL the checker (D462)', () => {
  for (const g of [null, [], '']) {
    const r = rewrite(EXP_LOGS[0] as string, (frames) => {
      frames[0]!.playExplore = { epsilon: 1, closeCall: 0, opening: false };
      withGuardrails(frames, g);
    });
    assert.equal(r.status, 1, `${JSON.stringify(g)}: ${r.out}`);
    assert.match(r.out, /explore\.guardrails is not an object of counts/);
  }
});

// M72 / D465: a Forge-piloted move-atlas branch seat's decisions summary carries its pay cap's passes
// (`guardrails.forgePayCap`). Rewritten as such a log (the header's lab block says continuation
// "forge") the decision fixture passes with the count; the same block in a log that is not an atlas
// Forge branch, in a random seat's log, under another name or with a non-integer count FAILS.
const withForgeGuardrails = (frames: Array<Record<string, any>>, g: unknown, lab: Record<string, unknown> | null = { atlas: 't', continuation: 'forge' }): void => {
  if (lab) frames[0]!.lab = { ...(frames[0]!.lab ?? {}), ...lab };
  frames.find((f) => f.dir === 'ai' && f.type === 'decisions')!.body.guardrails = g;
};

test('M72: a Forge-piloted atlas branch seat\'s summary may carry its pay-cap count', () => {
  for (const n of [0, 3]) {
    const r = rewrite(DEC_LOGS[0] as string, (frames) => withForgeGuardrails(frames, { forgePayCap: n }));
    assert.equal(r.status, 0, r.out);
  }
});

test('negative control: forgePayCap outside an atlas Forge branch, in a random seat\'s log, or malformed FAILS the checker (M72)', () => {
  const plain = rewrite(DEC_LOGS[0] as string, (frames) => withForgeGuardrails(frames, { forgePayCap: 1 }, null));
  assert.equal(plain.status, 1, plain.out);
  assert.match(plain.out, /summary guardrails outside a Forge-piloted atlas branch's log/);
  const random = rewrite(DEC_LOGS[0] as string, (frames) => {
    withForgeGuardrails(frames, { forgePayCap: 1 }, { atlas: 't', continuation: 'random' });
  });
  assert.equal(random.status, 1, random.out);
  assert.match(random.out, /summary guardrails outside a Forge-piloted atlas branch's log/);
  const odd = rewrite(DEC_LOGS[0] as string, (frames) => withForgeGuardrails(frames, { forgePayCap: 1.5, refusedCast: 1 }));
  assert.equal(odd.status, 1, odd.out);
  assert.match(odd.out, /summary guardrails "forgePayCap": 1\.5/);
  assert.match(odd.out, /summary guardrails "refusedCast"/);
  for (const g of [null, [], '']) {
    const r = rewrite(DEC_LOGS[0] as string, (frames) => withForgeGuardrails(frames, g));
    assert.equal(r.status, 1, `${JSON.stringify(g)}: ${r.out}`);
    assert.match(r.out, /summary guardrails is not an object of counts/);
  }
});
