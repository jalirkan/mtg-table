#!/usr/bin/env node
// mtg-table -- docs/evidence/d489-futility-replay.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// D489's replay: what the futility stop would have done on a finished atlas spine, without playing a game.
//
//     node docs/evidence/d489-futility-replay.mjs <spine dir> [--futility 0] [--futility-tie 0] [--futility-sample 0.1] [--json]
//
// Reads <spine>/plan.json, phaseB/baseline.json, branches.jsonl, units.jsonl and schedule.jsonl (read only).  The spine's own
// schedule events -- its picks, screens and early stops, exactly as written -- are handed to tools/cubelab/atlascuts.ts's
// AtlasSchedule as a resumed atlas's, with every unit done and every branch row recorded, under the spine's cuts plus the
// futility stop.  The schedule replays each recorded verdict and decides only what was never written: the futility read at
// its checkpoint.  So the read is the code's own, on the spine's own rows (branch i of every option on one seed: the rows
// below the checkpoint are what a futility run would have had).
//
// For each decision the rule reads: option 0's gap to the best at the checkpoint, whether it is futile, its control draw
// (a control at the given share), and what stopping it would have saved -- the random branch games at or past the
// checkpoint and every Forge branch game, as counted and as their own recorded `ms`.  And whether the spine's atlas.json
// had it confident (complete, random regretLo > 0): a stopped decision is never confident, so that is a label lost.

import fs from 'node:fs';
import path from 'node:path';

import { AtlasSchedule, decisionCuts, futilityAt, parseFutility, scheduleEvents } from '../../tools/cubelab/atlascuts.ts';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--') && !/^[\d.]+$/.test(a));
const flag = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
if (!dir) { console.error('usage: node docs/evidence/d489-futility-replay.mjs <spine dir> [--futility 0] [--futility-tie 0] [--futility-sample 0.1] [--json]'); process.exit(2); }
const jsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
const B = path.join(dir, 'phaseB');
const listing = JSON.parse(fs.readFileSync(path.join(B, 'baseline.json'), 'utf8')).decisions;
const rows = jsonl(path.join(B, 'branches.jsonl'));
const units = jsonl(path.join(B, 'units.jsonl'));
const events = scheduleEvents(jsonl(path.join(B, 'schedule.jsonl')));
const atlas = JSON.parse(fs.readFileSync(path.join(dir, 'atlas.json'), 'utf8'));
const asRun = new Map(atlas.phaseB.decisions.map((d) => [d.d, d]));

const futility = parseFutility(flag('futility') ?? '0', flag('futility-tie'), flag('futility-sample'));
const pc = plan.cuts ?? { earlyStop: [], screen: 0, minOptions: 1 };
const cuts = { earlyStop: pc.earlyStop, screen: pc.screen, minOptions: pc.minOptions, futility };
const at = futilityAt(cuts);
if (at === null) throw new Error(`the spine's --early-stop (${JSON.stringify(pc.earlyStop)}) has no checkpoint ${futility.at}`);
const o = { branchRandom: plan.branchRandom, branchForge: plan.branchForge, chunk: plan.chunk, decisions: plan.decisions, boot: atlas.plan?.boot ?? 1000, seed: plan.seed };
// plan.json does not hold --boot; the job's default (1000) is what every lab spine ran, and the recorded early stops are
// replayed, not recomputed, so the bootstrap is never run here
const done = new Set(units.filter((u) => u.ok).map((u) => u.id));
const written = [];
const sched = new AtlasSchedule(listing, o, cuts, events, rows, done, (e) => written.push(e));
const leftToPlay = sched.initial.length;
const reads = written.filter((e) => e.type === 'futility');
const other = written.filter((e) => e.type !== 'futility');
if (other.length) throw new Error(`the replay decided ${other.length} verdict(s) the spine had written otherwise: ${JSON.stringify(other.slice(0, 3))}`);

const out = [];
for (const e of reads) {
  const mine = rows.filter((r) => r.d === e.d);
  const after = mine.filter((r) => (r.c === 'random' && r.i >= e.at) || r.c === 'forge');
  const a = asRun.get(e.d);
  out.push({
    d: e.d, turn: listing[e.d].turn, kind: listing[e.d].kind, k: listing[e.d].tokens.length,
    o0Mean: e.o0Mean, best: e.best, bestMean: e.bestMean, gap: e.gap, futile: e.futile, draw: e.draw, control: e.control, stopped: e.stopped,
    branchGames: mine.length, savedGames: e.futile ? after.length : 0,
    branchMs: mine.reduce((s, r) => s + (r.ms ?? 0), 0), savedMs: e.futile ? after.reduce((s, r) => s + (r.ms ?? 0), 0) : 0,
    complete: a?.complete ?? null, confident: !!a?.complete && (a?.random?.regretLo ?? 0) > 0, regret: a?.random?.regret ?? null, regretLo: a?.random?.regretLo ?? null,
  });
}
const cut = decisionCuts(events);
const screened = [...cut.entries()].filter(([, c]) => c.screened).map(([d]) => d);
const sum = (xs, k) => xs.reduce((s, x) => s + x[k], 0);
const futile = out.filter((x) => x.futile);
const totalGames = rows.length, totalMs = rows.reduce((s, r) => s + (r.ms ?? 0), 0);
const report = {
  spine: path.basename(dir), seed: plan.seed, cuts: pc, futility: { ...futility, checkpoint: at },
  listed: listing.length, picked: cut.size, screened, read: out.length,
  futile: futile.map((x) => x.d), wouldBeControls: futile.filter((x) => x.control).map((x) => x.d),
  stoppedAtShare: futile.filter((x) => !x.control).map((x) => x.d),
  confidentAsRun: out.filter((x) => x.confident).map((x) => x.d),
  confidentLost: futile.filter((x) => x.confident).map((x) => x.d),
  branchGames: totalGames, savedGames: sum(futile, 'savedGames'), savedGamesShare: Math.round((sum(futile, 'savedGames') / totalGames) * 1e4) / 1e4,
  branchHours: Math.round((totalMs / 3.6e6) * 100) / 100, savedHours: Math.round((sum(futile, 'savedMs') / 3.6e6) * 100) / 100,
  savedMsShare: Math.round((sum(futile, 'savedMs') / totalMs) * 1e4) / 1e4,
  unitsLeft: leftToPlay,
  decisions: out,
};
if (args.includes('--json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
const pct = (x) => `${(x * 100).toFixed(1)}%`;
console.log(`${report.spine} (seed ${report.seed}): ${report.listed} listed, ${report.picked} picked, ${screened.length} screened (${screened.map((d) => `d${d}`).join(' ') || 'none'}); the futility rule (checkpoint ${at}, margin ${futility.tie}) read ${out.length}`);
console.log('| d | turn | kind | k | o0 mean | best (mean) | gap | futile | draw | as-run regret [lo] | confident | branch games | saved games | saved h |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const x of out) console.log(`| d${x.d} | ${x.turn} | ${x.kind} | ${x.k} | ${x.o0Mean} | o${x.best} (${x.bestMean}) | ${x.gap} | ${x.futile ? 'yes' : 'no'} | ${x.draw}${x.control ? ' (control)' : ''} | ${x.regret} [${x.regretLo}] | ${x.confident ? 'yes' : 'no'} | ${x.branchGames} | ${x.savedGames} | ${(x.savedMs / 3.6e6).toFixed(2)} |`);
console.log(`futile: ${futile.length} of ${out.length} (${futile.map((x) => `d${x.d}`).join(' ') || 'none'}); controls at share ${futility.sample}: ${report.wouldBeControls.map((d) => `d${d}`).join(' ') || 'none'}`);
console.log(`confident as run: ${report.confidentAsRun.map((d) => `d${d}`).join(' ') || 'none'}; lost to the rule: ${report.confidentLost.map((d) => `d${d}`).join(' ') || 'none'}`);
console.log(`saved (every futile decision stopped, controls included): ${report.savedGames} of ${totalGames} branch games (${pct(report.savedGamesShare)}), ${report.savedHours} of ${report.branchHours} branch hours (${pct(report.savedMsShare)})`);
