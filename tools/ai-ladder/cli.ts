// mtg-table — the AI ladder: the command line (run through tools/ai-ladder.sh).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// docs/guides/ai-ladder.md is the manual; DECISIONS.md D317–D320 are why.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BatchSpec } from './bench.ts';
import { KINDS, parseValue, type ParamValue } from './kinds.ts';
import { decide, LEAGUE_DEFAULTS, loadLeague, poolOf, saveLeague, type LeagueState } from './league.ts';
import { buildLadder, renderHtml, type SprtLog, type TuneLog } from './report.ts';
import { ANCHOR, addPlayer, nextName, resolvePlayer, writeRegistry, type Player } from './registry.ts';
import { blockKey, type GameRecord } from './results.ts';
import { choose, hostBase, mkey, SCHED_DEFAULTS, type SchedPlayer, type SchedState } from './schedule.ts';
import { Session } from './session.ts';
import { pairScores, sprtState, type SprtParams, type SprtState } from './sprt.ts';
import { grid, halving, sample, TUNE_DEFAULTS, type Tally } from './tune.ts';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const USAGE = `ai-ladder -- rate AI configs against each other and stock Forge (D317)

  ai-ladder.sh list
  ai-ladder.sh run     --hours H [--jobs J] [--max-games N] [--players a,b,...]
  ai-ladder.sh ratings [--bootstrap N]
  ai-ladder.sh sprt    A B [--elo0 0] [--elo1 20] [--alpha 0.05] [--beta 0.05] [--max-games 4000] [--jobs J]
  ai-ladder.sh tune    BASE --param k=v1,v2 [--param ...] [--pool a,b] [--sample K] [--eta 2]
                       [--blocks 1] [--max-rounds 6] [--name NEW] [--candidate] [--jobs J]
  ai-ladder.sh league  --hours H [--jobs J] [--pool-size 4] [--share 0.5] [--start NAME]
                       [--elo1 20] [--min-forge-games 80] [--forge-margin 0]
  ai-ladder.sh report  [--bootstrap N] [--out DIR]

Common: --dir DIR (var/ai-ladder), --registry FILE (tools/ai-ladder/players.json),
--pairs FILE (tools/ai-bench/pairs-cube.txt), --batch-pairs N (deck pairs per batch;
each pair is 4 games), --game-timeout SEC (300), --prior-sd ELO (350), --host NAME.`;

interface Args { pos: string[]; flags: Map<string, string[]> }

const BOOL = new Set(['candidate']);

function parseArgs(argv: string[]): Args {
  const pos: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = BOOL.has(k) ? 'true' : argv[++i];
      if (v === undefined) throw new Error(`${a} wants a value`);
      flags.set(k, [...(flags.get(k) ?? []), v]);
    } else pos.push(a);
  }
  return { pos, flags };
}

const str = (a: Args, k: string, d: string): string => a.flags.get(k)?.at(-1) ?? d;
const num = (a: Args, k: string, d: number): number => {
  const v = a.flags.get(k)?.at(-1);
  if (v === undefined) return d;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${k} wants a number, got ${v}`);
  return n;
};

function session(a: Args, defaultBatchPairs: number): Session {
  return new Session({
    repo: REPO,
    dir: resolve(REPO, str(a, 'dir', 'var/ai-ladder')),
    registryFile: resolve(REPO, str(a, 'registry', 'tools/ai-ladder/players.json')),
    pairsFile: resolve(REPO, str(a, 'pairs', 'tools/ai-bench/pairs-cube.txt')),
    pairsPerBatch: num(a, 'batch-pairs', defaultBatchPairs),
    gameTimeoutSec: num(a, 'game-timeout', 300),
    host: a.flags.get('host')?.at(-1),
    priorSd: num(a, 'prior-sd', 350),
  });
}

function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
    try { return [JSON.parse(l) as T]; } catch { return []; }
  });
}

function printRatings(s: Session, boot: number): void {
  const f = s.fit(boot);
  const rows = [...f.ratings.values()].filter((r) => s.byName.has(r.name) || r.games > 0)
    .sort((x, y) => Number(y.rated) - Number(x.rated) || y.rating - x.rating);
  console.log(`${'player'.padEnd(28)} ${'rating'.padStart(7)}  ${'95% CI'.padEnd(13)} ${'games'.padStart(6)}  W-L`);
  for (const r of rows) {
    const p = s.byName.get(r.name);
    const note = !p ? '  (old config)' : p.unavailable ? `  (unavailable: ${p.unavailable})` : p.anchor ? '  (anchor)' : '';
    const ci = r.name === ANCHOR ? 'fixed' : r.rated ? `${r.lo.toFixed(0)}-${r.hi.toFixed(0)}` : 'unrated';
    console.log(`${r.name.padEnd(28)} ${r.rated ? r.rating.toFixed(0).padStart(7) : '      -'}  ${ci.padEnd(13)} ${String(r.games).padStart(6)}  ${r.wins}-${r.losses}${note}`);
  }
  console.log(`(${s.recs.length} games in the log, ${s.recs.filter((r) => r.w === 'd').length} draws; CI by ${boot > 0 ? `bootstrap, ${boot} resamples` : 'Hessian'})`);
}

function schedPlayers(s: Session, only: Set<string> | null): SchedPlayer[] {
  const f = s.fit();
  return s.available.filter((p) => !only || only.has(p.name)).map((p) => {
    const r = f.ratings.get(p.name);
    return { name: p.name, anchor: !!p.anchor, rating: r?.rating ?? 1500, se: r?.se ?? 350, games: r?.games ?? 0 };
  });
}

function pairGames(s: Session): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of s.recs) if (r.w !== 'd') { const k = mkey(s.side(r, 'a'), s.side(r, 'b')); m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
}

/** A deadline from --hours (and --max-games as a second stop, checked by the caller). */
const deadlineOf = (a: Args): number => Date.now() + num(a, 'hours', 8) * 3600_000;

// ------------------------------------------------------------------ commands

function cmdList(a: Args): void {
  const s = session(a, 10);
  for (const p of s.all) {
    console.log(`${p.name.padEnd(26)} ${p.kind.padEnd(8)} ${p.hash}  ${p.cfg ? `ai-bench "${p.cfg}"` : `UNAVAILABLE: ${p.unavailable}`}${p.anchor ? '  [anchor]' : ''}${p.candidate ? '  [candidate]' : ''}`);
  }
  console.log(`\nkinds: ${Object.entries(KINDS).map(([k, v]) => `${k} (${Object.keys(v.params).join(', ')})`).join('; ')}`);
}

async function cmdRun(a: Args): Promise<void> {
  const s = session(a, 10);
  const only = a.flags.has('players') ? new Set(str(a, 'players', '').split(',').filter(Boolean)) : null;
  if (only) for (const n of only) s.playable(n);
  const maxGames = num(a, 'max-games', Infinity);
  const st: SchedState = { batches: 0, anchorBatches: 0, pairGames: pairGames(s), running: new Map() };
  const opt = { anchor: ANCHOR, ...SCHED_DEFAULTS, newGames: num(a, 'new-games', SCHED_DEFAULTS.newGames), anchorShare: num(a, 'anchor-share', SCHED_DEFAULTS.anchorShare) };
  for (const p of s.all) if (p.unavailable && (!only || only.has(p.name))) console.log(`skip ${p.name}: ${p.unavailable}`);
  let played = 0, started = 0;
  const perBatch = 4 * Math.min(s.opt.pairsPerBatch, s.nPairs);
  console.log(`ai-ladder run ${s.run} on ${s.host}: ${s.getEngine().workers} worker(s), ${perBatch} games a batch`);
  await s.drive(deadlineOf(a), () => {
    if (started * perBatch >= maxGames) return null;
    const c = choose(schedPlayers(s, only), st, opt);
    if (!c) return null;
    const pa = s.playable(c.a), pb = s.playable(c.b);
    st.batches++;
    if (pa.anchor || pb.anchor) st.anchorBatches++;
    const k = mkey(c.a, c.b);
    st.running.set(k, (st.running.get(k) ?? 0) + 1);
    started++;
    console.log(`  next   ${c.a} vs ${c.b}: ${c.why}`);
    return s.spec(pa, pb, 'ladder');
  }, (r) => {
    const k = mkey(r.spec.a.name, r.spec.b.name);
    st.running.set(k, Math.max(0, (st.running.get(k) ?? 1) - 1));
    const dec = r.recs.filter((x) => x.w !== 'd').length;
    st.pairGames.set(k, (st.pairGames.get(k) ?? 0) + dec);
    played += r.recs.length;
  });
  console.log(`\nai-ladder run ${s.run}: ${played} games\n`);
  printRatings(s, 0);
}

/** A test's games from A's side, by mirror block (sprt and league). */
function sprtGames(s: Session, recs: GameRecord[], purpose: string, a: Player): Array<{ block: string; aWon: boolean | null }> {
  return recs.filter((r) => r.purpose === purpose).map((r) => {
    const aIsA = s.side(r, 'a') === a.name;
    return { block: blockKey(r), aWon: r.w === 'd' ? null : (r.w === 'a') === aIsA };
  });
}

function sprtLog(s: Session, id: string, a: Player, b: Player, p: SprtParams, st: SprtState, purpose: 'sprt' | 'league'): SprtLog {
  const line: SprtLog = {
    v: 1, at: new Date().toISOString(), id, host: s.host, a: a.name, b: b.name, ah: a.hash, bh: b.hash,
    elo0: p.elo0, elo1: p.elo1, alpha: p.alpha, beta: p.beta,
    result: st.result === 'continue' ? 'stopped' : st.result,
    llr: Math.round(st.llr * 1000) / 1000, lower: Math.round(st.lower * 1000) / 1000, upper: Math.round(st.upper * 1000) / 1000,
    games: st.games, pairs: st.pairs, score: Math.round(st.score * 1000) / 1000, purpose,
  };
  s.logLine('sprt.jsonl', line);
  return line;
}

async function cmdSprt(a: Args): Promise<void> {
  const [an, bn] = a.pos;
  if (!an || !bn) throw new Error('sprt wants two player names');
  const s = session(a, 2);
  const A = s.playable(an), B = s.playable(bn);
  const p: SprtParams = { elo0: num(a, 'elo0', 0), elo1: num(a, 'elo1', 20), alpha: num(a, 'alpha', 0.05), beta: num(a, 'beta', 0.05), maxGames: num(a, 'max-games', 4000), minPairs: num(a, 'min-pairs', 8) };
  const prior = readJsonl<SprtLog>(join(s.opt.dir, 'sprt.jsonl')).length;
  const id = `${s.host}:${s.run}`;
  const purpose = `sprt:${id}`;
  const base = hostBase(s.host) + 600_000 + (prior % 300) * 1000;
  let state = sprtState([], p);
  let decided: SprtState | null = null;
  console.log(`SPRT ${A.name} vs ${B.name}: H1 "A is stronger by >= ${p.elo1}" vs H0 "<= ${p.elo0}", alpha ${p.alpha}, beta ${p.beta}; bounds ${state.lower.toFixed(2)} / ${state.upper.toFixed(2)}`);
  await s.drive(deadlineOf(a), () => (decided || s.getEngine().stopped ? null : s.spec(A, B, purpose, base)), () => {
    state = sprtState(pairScores(sprtGames(s, s.recs, purpose, A)), p);
    console.log(`  LLR ${state.llr.toFixed(2)} after ${state.games} games (${state.pairs} pairs), A scores ${(state.score * 100).toFixed(1)}%`);
    if (!decided && state.result !== 'continue') decided = state;
  });
  const fin = decided ?? state;
  const line = sprtLog(s, id, A, B, p, fin, 'sprt');
  console.log(`\nSPRT result: ${line.result === 'H1' ? `H1 accepted -- ${A.name} is stronger than ${B.name} by >= ${p.elo1} Elo` : line.result === 'H0' ? `H0 accepted -- ${A.name} is not stronger than ${B.name} by ${p.elo1} (<= ${p.elo0})` : line.result}`);
  console.log(`games used: ${fin.games} (${fin.pairs} mirrored pairs); LLR ${fin.llr.toFixed(3)} in [${fin.lower.toFixed(3)}, ${fin.upper.toFixed(3)}]; ${A.name} scored ${(fin.score * 100).toFixed(1)}%`);
}

async function cmdTune(a: Args): Promise<void> {
  const baseName = a.pos[0];
  if (!baseName) throw new Error('tune wants a base player');
  const s = session(a, 10);
  const base = s.player(baseName);
  if (!KINDS[base.kind]) throw new Error(`${baseName}: unknown kind ${base.kind}`);
  const vary: Array<[string, ParamValue[]]> = (a.flags.get('param') ?? []).map((spec) => {
    const [k, vs] = spec.split('=');
    if (!k || !vs) throw new Error(`--param wants k=v1,v2: ${spec}`);
    const pspec = KINDS[base.kind]!.params[k];
    if (!pspec) throw new Error(`kind ${base.kind} has no parameter ${k}`);
    if (pspec.type === 'text') throw new Error(`${k} is a text parameter and cannot be tuned`);
    return [k, vs.split(',').map((v) => parseValue(base.kind, k, v))];
  });
  if (vary.length === 0) throw new Error('tune wants at least one --param');
  let cands = grid(base.resolved, vary);
  if (a.flags.has('sample')) cands = sample(cands, num(a, 'sample', cands.length), num(a, 'seed', 1));
  const pool = str(a, 'pool', 'forge-default,forge-reckless').split(',').filter(Boolean).map((n) => s.playable(n));
  const players = new Map<number, Player>();
  for (const c of cands) {
    const p = resolvePlayer({ name: `${base.name}.c${c.id}`, kind: base.kind, params: c.params }, REPO);
    if (p.unavailable) throw new Error(`candidate ${c.label}: ${p.unavailable}`);
    players.set(c.id, p);
  }
  const opt = { eta: num(a, 'eta', TUNE_DEFAULTS.eta), blocks: num(a, 'blocks', TUNE_DEFAULTS.blocks), maxRounds: num(a, 'max-rounds', TUNE_DEFAULTS.maxRounds) };
  const id = `${s.host}:${s.run}`;
  const purpose = `tune:${id}`;
  const seedBase = hostBase(s.host) + 500_000 + num(a, 'seed', 1) * 1000;
  console.log(`tune ${base.name}: ${cands.length} candidate(s) over ${vary.map(([k, v]) => `${k}=${v.join('|')}`).join(' ')}; vs ${pool.map((p) => p.name).join(', ')}; eta ${opt.eta}`);
  const deadline = deadlineOf(a);
  let games = 0;
  const res = await halving(cands, opt, async (alive, round, blocks) => {
    // every alive candidate x every opponent x `blocks` batch slots; slot k is --seed seedBase+round*100+k for all of them
    const queue: BatchSpec[] = [];
    for (let k = 0; k < blocks; k++) {
      for (const c of alive) for (const opp of pool) {
        const bseed = seedBase + round * 100 + k;
        queue.push({ a: players.get(c.id) as Player, b: opp, bseed, pairs: Array.from({ length: Math.min(s.opt.pairsPerBatch, s.nPairs) }, (_, i) => (k * s.opt.pairsPerBatch + i) % s.nPairs), purpose });
      }
    }
    const got = new Map<number, Tally>(alive.map((c) => [c.id, { wins: 0, losses: 0, draws: 0 }]));
    const byHash = new Map(alive.map((c) => [(players.get(c.id) as Player).hash, c.id]));
    console.log(`round ${round + 1}: ${alive.length} candidate(s), ${queue.length} batch(es)`);
    await s.drive(deadline, () => queue.shift() ?? null, (r) => {
      games += r.recs.length;
      for (const x of r.recs) {
        const cid = byHash.get(x.ah);
        if (cid === undefined) continue;
        const t = got.get(cid) as Tally;
        if (x.w === 'a') t.wins++; else if (x.w === 'b') t.losses++; else t.draws++;
      }
    });
    if (queue.length) console.log(`  (deadline: ${queue.length} batch(es) not played)`);
    for (const c of alive) { const t = got.get(c.id) as Tally; console.log(`  ${c.label.padEnd(40)} ${t.wins}-${t.losses} (${t.draws} draws)`); }
    return got;
  });
  const w = players.get(res.winner.id) as Player;
  const already = s.all.find((p) => p.hash === w.hash);
  let registeredAs: string;
  if (already) {
    registeredAs = already.name;
    console.log(`\nwinner: ${res.winner.label} -- already registered as ${already.name}; players.json unchanged`);
  } else {
    const name = a.flags.has('name') ? str(a, 'name', '') : nextName(s.reg, base.name);
    registeredAs = addPlayer(s.reg, { name, kind: base.kind, params: Object.fromEntries(Object.entries(w.resolved)), from: `tune ${id}`, ...(a.flags.has('candidate') ? { candidate: true } : {}) });
    writeRegistry(s.opt.registryFile, s.reg);
    console.log(`\nwinner: ${res.winner.label} -- registered as ${registeredAs} in ${s.opt.registryFile}${a.flags.has('candidate') ? ' (a league candidate)' : ''}`);
  }
  const log: TuneLog = {
    v: 1, at: new Date().toISOString(), id, host: s.host, base: base.name, vary: Object.fromEntries(vary), pool: pool.map((p) => p.name),
    eta: opt.eta, games,
    winner: { label: res.winner.label, params: w.resolved as Record<string, string | number>, hash: w.hash, registeredAs },
    rounds: res.rounds.map((r) => ({ round: r.round, blocks: r.blocks, standings: r.standings.map((x) => ({ label: x.label, wins: x.wins, losses: x.losses, score: Math.round(x.score * 1000) / 1000 })) })),
  };
  s.logLine('tune.jsonl', log);
}

async function cmdLeague(a: Args): Promise<void> {
  const s = session(a, 10);
  const file = join(s.opt.dir, 'league.json');
  mkdirSync(s.opt.dir, { recursive: true });
  const L = loadLeague(file, str(a, 'start', ANCHOR));
  const lo = { ...LEAGUE_DEFAULTS, poolSize: num(a, 'pool-size', LEAGUE_DEFAULTS.poolSize), share: num(a, 'share', LEAGUE_DEFAULTS.share), minForgeGames: num(a, 'min-forge-games', LEAGUE_DEFAULTS.minForgeGames), forgeMargin: num(a, 'forge-margin', LEAGUE_DEFAULTS.forgeMargin) };
  const sp: SprtParams = { elo0: num(a, 'elo0', 0), elo1: num(a, 'elo1', 20), alpha: num(a, 'alpha', 0.05), beta: num(a, 'beta', 0.05), maxGames: num(a, 'max-games-per-test', 4000), minPairs: 8 };
  const anchor = s.playable(ANCHOR);
  const pending = (): Player | null => s.available.find((p) => p.candidate && !L.decided[p.name] && p.name !== L.best) ?? null;
  const st: SchedState = { batches: 0, anchorBatches: 0, pairGames: pairGames(s), running: new Map() };
  let leagueBatches = 0, cycle = 0;
  const say = (): void => console.log(`league: best ${L.best}; pool ${poolOf(L, s.anchors.map((p) => p.name), lo.poolSize).join(', ')}; candidate ${pending()?.name ?? '(none)'}`);
  say();
  if (!pending()) console.log('league: no candidate -- mark one with "candidate": true in players.json, or `tune ... --candidate`');
  const slotOf = (c: Player): number => {
    if (L.slots[c.name] === undefined) { L.slots[c.name] = Object.keys(L.slots).length; saveLeague(file, L); }
    return L.slots[c.name] as number;
  };
  const evaluate = (c: Player): void => {
    const best = s.playable(L.best);
    const purpose = `league-sprt:${c.name}`;
    const state = sprtState(pairScores(sprtGames(s, s.recs, purpose, c)), sp);
    const fbase = hostBase(s.host) + 700_000 + slotOf(c) * 1000;
    const vsF = (p: Player): Tally => {
      const t: Tally = { wins: 0, losses: 0, draws: 0 };
      for (const r of s.recs) {
        if (r.purpose !== `league-forge:${c.name}` || r.bseed < fbase || r.bseed >= fbase + 1000) continue;
        const sa = s.side(r, 'a'), sb = s.side(r, 'b');
        if (!((sa === p.name && sb === ANCHOR) || (sb === p.name && sa === ANCHOR))) continue;
        if (r.w === 'd') t.draws++; else if ((r.w === 'a') === (sa === p.name)) t.wins++; else t.losses++;
      }
      return t;
    };
    const d = decide(state, vsF(c), best.name === ANCHOR ? null : vsF(best), lo);
    if (d.verdict === 'continue') return;
    sprtLog(s, `league:${c.name}`, c, best, sp, state, 'league');
    L.decided[c.name] = { verdict: d.verdict, at: new Date().toISOString(), reason: d.reason, hash: c.hash };
    if (d.verdict === 'promote') {
      L.promoted.push({ name: c.name, hash: c.hash, at: new Date().toISOString(), reason: d.reason });
      L.best = c.name;
    }
    saveLeague(file, L);
    console.log(`league: ${c.name} ${d.verdict === 'promote' ? 'PROMOTED' : 'rejected'} -- ${d.reason}`);
    say();
  };
  await s.drive(deadlineOf(a), () => {
    const best = s.playable(L.best);
    const pool = poolOf(L, s.anchors.map((p) => p.name), lo.poolSize).filter((n) => n !== best.name && s.byName.get(n) && !s.byName.get(n)!.unavailable);
    st.batches++;
    // 1. the newest's fixed share against the pool
    if (pool.length && leagueBatches / st.batches < lo.share) {
      leagueBatches++;
      const pg = pairGames(s);
      const opp = [...pool].sort((x, y) => (pg.get(mkey(best.name, x)) ?? 0) - (pg.get(mkey(best.name, y)) ?? 0) || (x < y ? -1 : 1))[0] as string;
      return s.spec(best, s.playable(opp), 'league');
    }
    // 2. a pending candidate's tests
    const c = pending();
    if (c) {
      const step = cycle++ % 4;
      if (step < 2) return s.spec(c, best, `league-sprt:${c.name}`, hostBase(s.host) + 650_000 + slotOf(c) * 1000);
      const fbase = hostBase(s.host) + 700_000 + slotOf(c) * 1000;
      const who = step === 2 ? c : best;
      if (who.name === ANCHOR) return s.spec(c, best, `league-sprt:${c.name}`, hostBase(s.host) + 650_000 + slotOf(c) * 1000);
      return s.spec(who, anchor, `league-forge:${c.name}`, fbase);
    }
    // 3. the ordinary ladder
    const ch = choose(schedPlayers(s, null), st, { anchor: ANCHOR, ...SCHED_DEFAULTS });
    return ch ? s.spec(s.playable(ch.a), s.playable(ch.b), 'ladder') : null;
  }, () => {
    const c = pending();
    if (c) evaluate(c);
  });
  saveLeague(file, L);
  say();
}

function cmdReport(a: Args): void {
  const s = session(a, 10);
  const out = resolve(REPO, str(a, 'out', s.opt.dir));
  mkdirSync(out, { recursive: true });
  const lf = join(s.opt.dir, 'league.json');
  const league: (LeagueState & { pool: string[] }) | null = existsSync(lf)
    ? (() => { const L = loadLeague(lf, ANCHOR); return { ...L, pool: poolOf(L, s.anchors.map((p) => p.name), LEAGUE_DEFAULTS.poolSize) }; })() : null;
  const doc = buildLadder({
    players: s.all, recs: s.recs,
    sprt: readJsonl<SprtLog>(join(s.opt.dir, 'sprt.jsonl')),
    tune: readJsonl<TuneLog>(join(s.opt.dir, 'tune.jsonl')),
    league, priorSd: s.opt.priorSd, bootstrap: num(a, 'bootstrap', 0),
  });
  writeFileSync(join(out, 'ladder.json'), JSON.stringify(doc, null, 1) + '\n');
  writeFileSync(join(out, 'report.html'), renderHtml(doc));
  console.log(`wrote ${join(out, 'report.html')} and ${join(out, 'ladder.json')} (${doc.totals.games} games, ${doc.players.length} players)`);
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(USAGE); return cmd ? 0 : 2; }
  const a = parseArgs(rest);
  switch (cmd) {
    case 'list': cmdList(a); break;
    case 'run': await cmdRun(a); break;
    case 'ratings': printRatings(session(a, 10), num(a, 'bootstrap', 0)); break;
    case 'sprt': await cmdSprt(a); break;
    case 'tune': await cmdTune(a); break;
    case 'league': await cmdLeague(a); break;
    case 'report': cmdReport(a); break;
    default: console.error(USAGE); return 2;
  }
  return 0;
}

main().then((c) => process.exit(c), (e: unknown) => { console.error(`ai-ladder: ${(e as Error).message ?? e}`); process.exit(1); });
