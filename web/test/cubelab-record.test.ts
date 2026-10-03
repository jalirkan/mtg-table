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
