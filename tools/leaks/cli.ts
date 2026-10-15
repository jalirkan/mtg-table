// mtg-table — the leak report's command line (D438, J129).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Run from the repository root (hard rule 9):
//
//   node tools/leaks/cli.ts stage --from <checkout> [--from <checkout>] --owner-name <name> --out <dir> [--include-id <gameId>]...
//       the owner's games (stage.ts's rules), his seat only, copied with his deck into <dir> + manifest.json
//   node tools/leaks/cli.ts inventory --input <dir>
//       every gradable game's decisions planned by the review's own planner (CoachGrade review-plan,
//       engine-free); <dir>/inventory.json, printed
//   node tools/leaks/cli.ts review --input <dir> --out <dir> --jobs N [--triage-s 60 --deep-k 50 --deep-s 600
//       --deep-options 5 --seed 1] [--only <gameId>[,<gameId>]]
//       coach-grade.sh review per game, pool mode (D348): the cube list minus his deck and pool; resumes
//   node tools/leaks/cli.ts aggregate --input <dir> --reviews <dir> --out <dir> [--b 10000]
//       decisions.jsonl, leaks.json, report.md
//   node tools/leaks/cli.ts verify --out <dir> [--b 10000]
//       the rule's arithmetic again from decisions.jsonl; one JSON line for the job's checks
//
// stage reads the checkouts it is given and writes only <dir>; it never opens the
// other seat of a game between two people (stage.ts).  Nothing here sends anything anywhere.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseCube } from '../cubelab/cube.ts';
import { buildLeaks, reportMd, rowsOf, strictShape, verify, type Row, type Tally } from './report.ts';
import { REVIEW, RULE } from './rule.ts';
import { factsOf, guessCube, judgeLog, judgeName, logLines, parseLog, sha256, type Log } from './stage.ts';

type Obj = Record<string, unknown>;

function flags(argv: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
    m.set(a.slice(2), [...(m.get(a.slice(2)) ?? []), v]);
    i++;
  }
  return m;
}
const one = (f: Map<string, string[]>, k: string, dflt?: string): string => {
  const v = f.get(k)?.[0] ?? dflt;
  if (v === undefined) throw new Error(`--${k} is required`);
  return v;
};
const int = (f: Map<string, string[]>, k: string, dflt: number): number => {
  const v = Number(one(f, k, String(dflt)));
  if (!Number.isInteger(v) || v < 0) throw new Error(`--${k} must be a whole number`);
  return v;
};
const readJson = (p: string): Obj => JSON.parse(readFileSync(p, 'utf8')) as Obj;
const writeJson = (p: string, o: unknown): void => writeFileSync(p, JSON.stringify(o, null, 1) + '\n');

interface Entry {
  gameId: string;
  key: string;
  source: string;
  log: string;
  sha256: string;
  seat: number;
  kind: 'ai' | 'friend';
  identity: string;
  startedAt: string;
  finished: boolean;
  turns: number;
  acts: number;
  mulligans: number;
  deck: string | null;
  cube: string | null;
  cubeShare: number | null;
  grade: boolean;
  gradeWhy: string | null;
}

function cubesHere(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!existsSync('cubes')) return out;
  for (const f of readdirSync('cubes').filter((x) => x.endsWith('.md')).sort()) {
    const c = parseCube(readFileSync(join('cubes', f), 'utf8'));
    if (c.cards.length >= 80) out[f.replace(/\.md$/, '')] = c.cards.map((x) => x.name);
  }
  return out;
}

function stage(f: Map<string, string[]>): void {
  const froms = f.get('from') ?? [];
  if (froms.length === 0) throw new Error('stage needs at least one --from <checkout>');
  const owner = one(f, 'owner-name');
  const out = resolve(one(f, 'out'));
  const included = new Set(f.get('include-id') ?? []);
  mkdirSync(join(out, 'games'), { recursive: true });
  mkdirSync(join(out, 'decks'), { recursive: true });
  const cubes = cubesHere();
  const games: Entry[] = [];
  const excluded: { gameId: string; source: string; why: string; acts?: number }[] = [];
  const keys = new Set<string>();
  let otherLogs = 0;
  for (const from of froms.map((x) => resolve(x))) {
    const source = basename(from);
    const files: { gameId: string; path: string }[] = [];
    const gd = join(from, 'var', 'games');
    if (existsSync(gd)) {
      for (const name of readdirSync(gd).sort()) {
        const p = ['frames.jsonl', 'frames.jsonl.gz'].map((x) => join(gd, name, x)).find((x) => existsSync(x));
        if (p) files.push({ gameId: name, path: p });
      }
    }
    for (const set of ['human', 'human-friends']) {
      const d = join(from, 'var', 'ml', set);
      if (!existsSync(d)) continue;
      for (const name of readdirSync(d).sort()) {
        const m = /^(.+)-(\d+)-(\d{17})\.jsonl(\.gz)?$/.exec(name);
        if (m) files.push({ gameId: m[1] as string, path: join(d, name) });
      }
    }
    for (const { gameId, path } of files) {
      const nv = judgeName(gameId);
      if (!nv.open) {
        if (!gameId.startsWith('friend-')) otherLogs++;
        else if (!excluded.some((e) => e.gameId === gameId && e.source === source)) excluded.push({ gameId, source, why: nv.why });
        continue;
      }
      const buf = readFileSync(path);
      let log: Log;
      try {
        log = parseLog(logLines(buf));
      } catch (e) {
        excluded.push({ gameId, source, why: `unreadable (${(e as Error).message})` });
        continue;
      }
      const facts = factsOf(log);
      if (keys.has(facts.key)) continue;   // the same game in var/games and in the human test set
      keys.add(facts.key);
      const id = judgeLog(log, owner, included);
      if (!id.his) {
        excluded.push({ gameId, source, why: id.why, acts: facts.acts });
        continue;
      }
      let name = facts.gameId;
      for (let n = 2; games.some((g) => g.gameId === name); n++) name = `${facts.gameId}~${n}`;
      const ext = buf[0] === 0x1f && buf[1] === 0x8b ? '.jsonl.gz' : '.jsonl';
      writeFileSync(join(out, 'games', name + ext), buf);
      let deck: string | null = null;
      let cube: { cube: string | null; share: number | null } = { cube: null, share: null };
      const dp = facts.deckPath ? (facts.deckPath.startsWith('/') ? facts.deckPath : join(from, facts.deckPath)) : null;
      if (dp && existsSync(dp)) {
        deck = join('decks', name + '.dck');
        copyFileSync(dp, join(out, deck));
        cube = guessCube(readFileSync(dp, 'utf8'), cubes);
      }
      const why = facts.acts === 0 ? 'no act: nothing he decided'
        : !deck ? 'his deck file is gone, so his own cards cannot be told from the pool'
        : !cube.cube ? 'no cube holds his deck, so pool mode (D348) has no pool: the opponent could only be basic lands'
        : null;
      games.push({
        gameId: name, key: facts.key, source, log: join('games', name + ext), sha256: sha256(buf), seat: facts.seat,
        kind: id.kind, identity: id.why, startedAt: facts.startedAt, finished: facts.finished, turns: facts.turns,
        acts: facts.acts, mulligans: facts.mulligans, deck, cube: cube.cube, cubeShare: cube.share, grade: why === null, gradeWhy: why,
      });
    }
  }
  games.sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.gameId.localeCompare(b.gameId));
  const manifest = {
    v: 1, kind: 'leak-input', createdAt: new Date().toISOString(),
    rules: 'tools/leaks/stage.ts (D438): match-m ids and seat 0 of a recorded table of two named as the owner; play.sh ids only by --include-id; the other seat never opened',
    sources: froms.map((x) => basename(resolve(x))),
    includeIds: [...included].sort(),
    counts: { his: games.length, gradable: games.filter((g) => g.grade).length, excluded: excluded.length, otherLogs },
    games, excluded,
  };
  writeJson(join(out, 'manifest.json'), manifest);
  console.log(JSON.stringify(manifest.counts));
  for (const g of games) console.log(`his: ${g.gameId} (${g.source}) seat ${g.seat}, ${g.acts} acts, ${g.turns} turns, cube ${g.cube ?? '-'}${g.grade ? '' : ` -- not graded: ${g.gradeWhy}`}`);
  for (const e of excluded) console.log(`excluded: ${e.gameId} (${e.source}): ${e.why}`);
}

function config(): Obj {
  const p = process.env.MTG_TABLE_CONFIG ?? 'config.json';
  return existsSync(p) ? readJson(p) : {};
}

function forgeJar(): string {
  const j = process.env.FORGE_JAR ?? String(config().forgeJar ?? '');
  if (!j || !existsSync(j)) throw new Error(`FORGE_JAR not found: ${j}`);
  return j;
}

function manifestOf(input: string): { games: Entry[]; excluded: Obj[]; counts: Obj } {
  return readJson(join(input, 'manifest.json')) as unknown as { games: Entry[]; excluded: Obj[]; counts: Obj };
}

function writePools(input: string, games: Entry[]): void {
  mkdirSync(join(input, 'pools'), { recursive: true });
  for (const c of new Set(games.filter((g) => g.grade).map((g) => g.cube as string))) {
    const cube = parseCube(readFileSync(join('cubes', c + '.md'), 'utf8'));
    writeFileSync(join(input, 'pools', c + '.txt'), cube.cards.map((x) => x.name).join('\n') + '\n');
  }
}

function inventory(f: Map<string, string[]>): void {
  const input = one(f, 'input');
  const m = manifestOf(input);
  // The staged copy is what the PC session staged: every log's sha256, and never a seat but the owner's.
  let shaBad = 0;
  for (const g of m.games) if (!existsSync(join(input, g.log)) || sha256(readFileSync(join(input, g.log))) !== g.sha256) shaBad++;
  const otherSeats = m.games.filter((g) => g.kind === 'friend' && g.seat !== 0).length;
  if (shaBad || otherSeats) throw new Error(`the staged input is not what was staged: ${shaBad} log(s) changed, ${otherSeats} friend seat(s) other than 0`);
  writePools(input, m.games);
  mkdirSync(join(input, 'plan'), { recursive: true });
  const jar = forgeJar();
  const byType: Record<string, number> = { spell: 0, attack: 0, block: 0, target: 0 };
  const perGame: Obj[] = [];
  for (const g of m.games.filter((x) => x.grade)) {
    const out = join(input, 'plan', g.gameId + '.jsonl');
    const r = spawnSync('java', ['-Xmx4096m', '-Djava.awt.headless=true', '-Dio.netty.tryReflectionSetAccessible=true',
      '-Dfile.encoding=UTF-8', '-Dsentry.uncaught.handler.enabled=false', '-cp', `bridge/out:${jar}`,
      'mtgtable.grade.CoachGrade', 'review-plan', '--log', join(input, g.log), '--seat', String(g.seat), '--out', out,
      '--deck', join(input, g.deck as string), '--opp-pool', join(input, 'pools', g.cube + '.txt')],
      { encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'DISPLAY')) });
    if (r.status !== 0) throw new Error(`review-plan failed on ${g.gameId}: ${r.stdout}${r.stderr}`);
    const c: Record<string, number> = {};
    for (const l of readFileSync(out, 'utf8').split('\n').filter(Boolean)) {
      const t = String((JSON.parse(l) as Obj).type);
      c[t] = (c[t] ?? 0) + 1;
      byType[t] = (byType[t] ?? 0) + 1;
    }
    perGame.push({ gameId: g.gameId, kind: g.kind, decisions: Object.values(c).reduce((s, n) => s + n, 0), ...c, mulligans: g.mulligans });
  }
  const his = m.games;
  const inv = {
    written: 1,
    inputOk: 1,
    otherSeats,
    stagedAt: (m as unknown as Obj).createdAt,
    gamesHis: his.length,
    gamesGradable: his.filter((g) => g.grade).length,
    gamesFriend: his.filter((g) => g.kind === 'friend' && g.grade).length,
    gamesExcluded: m.excluded.length,
    gamesHisNotGraded: his.filter((g) => !g.grade).length,
    gamesWithDecisions: perGame.filter((g) => Number(g.decisions) > 0).length,
    decisions: Object.values(byType).reduce((s, n) => s + n, 0),
    spell: byType.spell, attack: byType.attack, block: byType.block, target: byType.target,
    mulligans: his.filter((g) => g.grade).reduce((s, g) => s + g.mulligans, 0),
    perGame,
  };
  writeJson(join(input, 'inventory.json'), inv);
  console.log(JSON.stringify(inv));
}

function review(f: Map<string, string[]>): void {
  const input = one(f, 'input');
  const out = one(f, 'out');
  const jobs = int(f, 'jobs', 7);
  const set = {
    triageS: int(f, 'triage-s', REVIEW.triageS), deepK: int(f, 'deep-k', REVIEW.deepK), deepS: int(f, 'deep-s', REVIEW.deepS),
    deepOptions: int(f, 'deep-options', REVIEW.deepOptions), seed: int(f, 'seed', REVIEW.seed),
  };
  const only = new Set((f.get('only') ?? []).flatMap((x) => x.split(',')).filter(Boolean));
  const m = manifestOf(input);
  writePools(input, m.games);
  mkdirSync(out, { recursive: true });
  const todo = m.games.filter((g) => g.grade && (only.size === 0 || only.has(g.gameId)));
  const failed: Obj[] = [];
  const empty: string[] = [];
  let done = 0;
  // written after every game, so a job's abort and progress lines can read it while the review runs
  const status = (): void => writeJson(join(out, 'review-status.json'), {
    games: todo.length, done, failed: failed.length, empty: empty.length, failedGames: failed, emptyGames: empty, settings: { jobs, ...set },
  });
  status();
  for (const g of todo) {
    const target = join(out, g.gameId + '.json');
    const plan = join(input, 'plan', g.gameId + '.jsonl');
    if (existsSync(plan) && readFileSync(plan, 'utf8').trim() === '') {
      empty.push(g.gameId);   // the review's own planner found no decision of his: nothing to grade, not a failure
      status();
      continue;
    }
    if (existsSync(target)) {
      try {
        if ((readJson(target) as Obj).kind === 'game-review') { done++; continue; }
      } catch { /* a torn file: grade again */ }
    }
    console.log(`J129 REVIEW ${g.gameId} (${done + failed.length + 1} of ${todo.length})`);
    const r = spawnSync('./tools/coach-grade.sh', ['review', '--log', join(input, g.log), '--seat', String(g.seat),
      '--deck', join(input, g.deck as string), '--opp-pool', join(input, 'pools', g.cube + '.txt'),
      '--jobs', String(jobs), '--triage-s', String(set.triageS), '--deep-k', String(set.deepK), '--deep-s', String(set.deepS),
      '--deep-options', String(set.deepOptions), '--seed', String(set.seed),
      '--run', `j129-${g.gameId.replace(/[^A-Za-z0-9_-]/g, '_')}`, '--out', target], { stdio: 'inherit' });
    if (r.status === 0 && existsSync(target)) done++;
    else failed.push({ gameId: g.gameId, exit: r.status });
    status();
  }
  status();
  console.log(JSON.stringify({ games: todo.length, done, failed: failed.length, empty: empty.length }));
}

function aggregate(f: Map<string, string[]>): void {
  const input = one(f, 'input');
  const reviews = one(f, 'reviews');
  const out = one(f, 'out');
  const b = int(f, 'b', RULE.bootstrapB);
  const m = manifestOf(input);
  mkdirSync(out, { recursive: true });
  const tally: Tally = { planned: 0, graded: 0, trivial: 0, notGraded: 0, byType: {} };
  const rows: Row[] = [];
  let graded = 0;
  let failed = 0;
  let mulligans = 0;
  let settings: Obj = {};
  let empty = new Set<string>();
  try {
    const st = readJson(join(reviews, 'review-status.json'));
    settings = (st.settings as Obj) ?? {};
    empty = new Set((st.emptyGames as string[]) ?? []);
  } catch { /* none */ }
  for (const g of m.games.filter((x) => x.grade)) {
    const p = join(reviews, g.gameId + '.json');
    if (empty.has(g.gameId)) continue;
    if (!existsSync(p)) { failed++; continue; }
    const rep = readJson(p);
    if (rep.kind !== 'game-review') { failed++; continue; }
    graded++;
    mulligans += g.mulligans;
    rows.push(...rowsOf(g.gameId, g.seat, rep, parseLog(logLines(readFileSync(join(input, g.log)))), tally));
  }
  const review = Object.fromEntries(Object.entries(settings).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
  const leaks = buildLeaks(rows, tally, {
    gamesIdentified: m.games.length, gamesGraded: graded, gamesExcluded: m.excluded.length, reviewsFailed: failed, mulligans, review,
    gamesEmpty: empty.size,
  }, b);
  writeFileSync(join(out, 'decisions.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  writeJson(join(out, 'leaks.json'), leaks);
  const excl = [
    ...m.excluded.map((e) => ({ gameId: String(e.gameId), why: String(e.why) })),
    ...m.games.filter((g) => !g.grade).map((g) => ({ gameId: g.gameId, why: `yours, not graded: ${g.gradeWhy}` })),
    ...m.games.filter((g) => empty.has(g.gameId)).map((g) => ({ gameId: g.gameId, why: 'yours, not graded: the review found no decision of yours in it' })),
  ];
  writeFileSync(join(out, 'report.md'), reportMd(leaks, excl));
  console.log(JSON.stringify({ games: graded, decisions: rows.length, leaks: leaks.leaks }));
}

function verifyCmd(f: Map<string, string[]>): void {
  const out = one(f, 'out');
  const b = int(f, 'b', RULE.bootstrapB);
  const res: Obj = { written: 0, strict: 0, mismatches: -1, leaks: -1, kinds: 0, decisions: 0, mistakes: 0, gamesGraded: 0 };
  try {
    const text = readFileSync(join(out, 'leaks.json'), 'utf8');
    if (/\bNaN\b|\bInfinity\b/.test(text)) throw new Error('not strict JSON');
    const leaks = JSON.parse(text) as Obj;
    const rows = readFileSync(join(out, 'decisions.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row);
    const v = verify(rows, leaks, b);
    const data = (leaks.data ?? {}) as Obj;
    Object.assign(res, {
      written: existsSync(join(out, 'report.md')) ? 1 : 0, strict: strictShape(leaks) ? 1 : 0, mismatches: v.mismatches,
      leaks: leaks.leaks, kinds: Object.keys((leaks.kinds ?? {}) as Obj).length, decisions: rows.length,
      mistakes: rows.filter((r) => r.mistake).length, gamesGraded: data.gamesGraded ?? 0,
      minMistakes: (leaks.rule as Obj)?.minMistakes, minGames: (leaks.rule as Obj)?.minGames,
      bootstrapB: (leaks.rule as Obj)?.bootstrapB,
    });
    if (v.mismatches) console.error(v.what.join('\n'));
  } catch (e) {
    console.error(`verify: ${(e as Error).message}`);
  }
  console.log(JSON.stringify(res));
}

const [cmd, ...rest] = process.argv.slice(2);
const f = flags(rest);
switch (cmd) {
  case 'stage': stage(f); break;
  case 'inventory': inventory(f); break;
  case 'review': review(f); break;
  case 'aggregate': aggregate(f); break;
  case 'verify': verifyCmd(f); break;
  default:
    console.error('usage: node tools/leaks/cli.ts stage|inventory|review|aggregate|verify ... (see the header)');
    process.exit(2);
}
