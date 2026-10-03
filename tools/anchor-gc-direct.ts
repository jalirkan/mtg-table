#!/usr/bin/env node
/*
 * mtg-table — tools/anchor-gc-direct.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The anchor resolver in the compiled state that boxed** (D275's fix pass;
 * `docs/evidence/anchor-scratch.md` §9). `tools/anchor-gc-probe.ts` spawns this
 * for its `direct|…` cases; it is a file of its own, and this small, on purpose.
 *
 * D275's verifier found `SceneStage.positionOf` over every anchor kind in turn
 * still reading 3 GC events per 5M calls from a loop of this shape, where the
 * probe's own `mixed` read 0: V8 boxed the `above` anchor's height into a heap
 * number on every call. Whether it does depends on the compiled state — which
 * shapes of ref the resolver has seen, what the optimising compiler inlined — and
 * that state moved with things as small as the measuring script's own imports
 * (two more, `node:child_process` and `node:path`, turned the verifier's 3 into
 * 0; a rewrite of this file as plain JavaScript with its groups built otherwise
 * read 0 too). So below this comment is the script that selected the fix, as it
 * was run, and it stays as it is: its three imports, the board reduced through
 * frame 316 inclusive, the refs as literals, one module-level loop.
 *
 *   node tools/anchor-gc-direct.ts <tree>                  # <tree>/web/src, <tree>/fixtures
 *   ONLY=card,above H=0.55 DX=1.5 node tools/anchor-gc-direct.ts .
 *
 * `ONLY` names kind groups (every group when empty): `card`, `player` (both
 * seats), `zone` and `combat` (both seats), `casting` (both seats, and yours with
 * `ground`), `stack`, `table`, `above`, `beside`, `figure`. `H` is the `above`
 * height (0.6) and `DX` the `beside` offset (-1), numbers computed at run time;
 * `N` the counted calls (5,000,000, after 500,000 to warm). It prints the GC
 * events that arrive from the start of the counted calls to 100 ms after them,
 * and nothing else. Not in `check-all.sh`.
 */
import { readFileSync } from 'node:fs';
import { PerformanceObserver } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
const root = process.argv[2]!;
const src = (p: string) => pathToFileURL(`${root}/web/src/${p}`).href;
const L: any = await import(src('arena/layout.ts'));
const S: any = await import(src('arena/scene/SceneStage.ts'));
const R: any = await import(src('reduce.ts'));
const P: any = await import(src('transport/replay.ts'));
const log = P.parseFrameLog(readFileSync(`${root}/fixtures/games/g1.jsonl`, 'utf8'));
let state = R.initialState(log.header);
for (let i = 0; i <= 316; i++) state = R.reduce(state, log.frames[i]);
const placed = L.layout(state);
const stage = new S.SceneStage(placed);
const viewer = placed.viewerId;
const opp = state.board.players.map((p: any) => p.id).find((id: number) => id !== viewer);
const card = placed.placements.find((p: any) => p.kind === 'creature').cardId;
const h = Number(process.env.H ?? '0.6');
const dx = Number(process.env.DX ?? '-1');
const all: Record<string, any[]> = {
  card: [{ kind: 'card', id: card }],
  player: [{ kind: 'player', id: viewer }, { kind: 'player', id: opp }],
  zone: [{ kind: 'zone', player: viewer, zone: 'graveyard' }, { kind: 'zone', player: opp, zone: 'graveyard' }],
  combat: [{ kind: 'combat', player: viewer }, { kind: 'combat', player: opp }],
  casting: [{ kind: 'casting', player: viewer }, { kind: 'casting', player: opp }, { kind: 'casting', player: viewer, ground: true }],
  stack: [{ kind: 'stack' }],
  table: [{ kind: 'table' }],
  above: [{ kind: 'above', id: card, height: h }],
  beside: [{ kind: 'beside', id: card, dx }],
  figure: [{ kind: 'figure', id: card, at: 0.5 }],
};
const kinds = (process.env.ONLY || Object.keys(all).join(',')).split(',');
const refs: any[] = kinds.flatMap((k) => all[k]!);
const acc = new Float64Array(1);
const pos = stage.positionOf;
function loop(n: number): void {
  const m = refs.length;
  for (let i = 0; i < n; i++) { const a = pos(refs[i % m]); if (a !== null) acc[0] = acc[0] + a[0] + a[1] + a[2]; }
}
loop(500000);
await new Promise((r) => setTimeout(r, 50));
let g = 0;
const o = new PerformanceObserver((l) => { g += l.getEntries().length; });
o.observe({ entryTypes: ['gc'] });
loop(Number(process.env.N ?? 5000000));
await new Promise((r) => setTimeout(r, 100));
o.disconnect();
console.log(g);
