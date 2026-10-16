// mtg-table — the leak report: graded decisions -> leaks.json and report.md (D438, J129).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: the CLI reads the files and hands them in.  leaks.json is strict JSON,
// numbers (or null where a number is undefined) per kind, and each leak's
// example moments as a game id with the act's frame seq.  report.md is the same
// numbers in plain words for the owner; neither names a card or a person.

import { classify, contextOf, KINDS, type ReviewDecision } from './classify.ts';
import { isMistake, kindStats, needed, RULE, type KindStats } from './rule.ts';
import type { Log } from './stage.ts';

export interface Row {
  game: string;
  frame: number;
  seq: number | null;
  stateFrame: number;
  turn: number | null;
  type: string;
  kind: string;
  direction: string | null;
  regret: number;
  regretLo: number;
  regretHi: number;
  measure: string | null;
  stage: string | null;
  verdict: string | null;
  mistake: 0 | 1;
}

export interface Tally {
  planned: number;
  graded: number;
  trivial: number;
  notGraded: number;
  byType: Record<string, number>;
}

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === 'object' ? (x as Obj) : {});
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** One game's review report (coach-grade.sh review's `game-review` v1) as rows, over its log. */
export function rowsOf(game: string, seat: number, review: unknown, log: Log, tally: Tally): Row[] {
  const out: Row[] = [];
  for (const dv of (obj(review).decisions as unknown[]) ?? []) {
    const d = obj(dv);
    const type = String(d.type ?? '');
    tally.planned++;
    tally.byType[type] = (tally.byType[type] ?? 0) + 1;
    if (d.status === 'trivial') {
      tally.trivial++;
      continue;
    }
    if (d.status !== 'ok' || !d.playedOption || !fin(d.regret) || !fin(d.regretLo) || !fin(d.regretHi)) {
      tally.notGraded++;
      continue;
    }
    const sf = Number(d.stateFrame);
    const ctx = contextOf(obj(log.frames[sf]).body, seat);
    const c = classify(d as unknown as ReviewDecision, ctx);
    const seq = obj(log.frames[Number(d.frame)]).seq;
    tally.graded++;
    out.push({
      game,
      frame: Number(d.frame),
      seq: fin(seq) ? seq : null,
      stateFrame: sf,
      turn: fin(d.turn) ? d.turn : null,
      type,
      kind: c.kind,
      direction: c.direction ?? null,
      regret: d.regret,
      regretLo: d.regretLo,
      regretHi: d.regretHi,
      measure: typeof d.measure === 'string' ? d.measure : null,
      stage: typeof d.stage === 'string' ? d.stage : null,
      verdict: typeof d.verdict === 'string' ? d.verdict : null,
      mistake: isMistake({ regretLo: d.regretLo }) ? 1 : 0,
    });
  }
  return out;
}

export interface KindOut extends KindStats {
  covered: 0 | 1;
  seen: number | null;
  held: number | null;
  tapped: number | null;
  heldMistakes: number | null;
  tappedMistakes: number | null;
  examples: { game: string; seq: number | null; frame: number; turn: number | null; regret: number; regretLo: number }[];
}

export interface Meta {
  gamesIdentified: number;
  gamesGraded: number;
  gamesExcluded: number;
  reviewsFailed: number;
  gamesEmpty: number;
  mulligans: number;
  review: Record<string, number>;
}

/** leaks.json's object. `b` and `seed` are the rule's unless a test passes its own. */
export function buildLeaks(rows: Row[], tally: Tally, meta: Meta, b: number = RULE.bootstrapB, seed: number = RULE.bootstrapSeed): Obj {
  const kinds: Record<string, KindOut> = {};
  const stats: Record<string, KindStats> = {};
  for (const k of KINDS) {
    const mine = rows.filter((r) => r.kind === k.id);
    const s = kindStats(mine.map((r) => ({ game: r.game, regret: r.regret, regretLo: r.regretLo, regretHi: r.regretHi })), b, seed);
    stats[k.id] = s;
    const dir = k.id === 'mana-up-vs-tap-out';
    const examples = s.leak
      ? mine.filter((r) => r.mistake).sort((x, y) => y.regret - x.regret || x.game.localeCompare(y.game) || x.frame - y.frame)
        .slice(0, RULE.examples)
        .map((r) => ({ game: r.game, seq: r.seq, frame: r.frame, turn: r.turn, regret: r.regret, regretLo: r.regretLo }))
      : [];
    kinds[k.id] = {
      covered: k.covered,
      seen: k.id === 'keep-or-mulligan' ? meta.mulligans : k.covered ? s.n : null,
      ...s,
      held: dir ? mine.filter((r) => r.direction === 'held').length : null,
      tapped: dir ? mine.filter((r) => r.direction === 'tapped').length : null,
      heldMistakes: dir ? mine.filter((r) => r.direction === 'held' && r.mistake).length : null,
      tappedMistakes: dir ? mine.filter((r) => r.direction === 'tapped' && r.mistake).length : null,
      examples,
    };
  }
  const leaks = Object.values(kinds).filter((k) => k.leak === 1).length;
  return {
    v: 1,
    kind: 'j129-leak-report',
    rule: { ...RULE },
    review: meta.review,
    data: {
      gamesIdentified: meta.gamesIdentified,
      gamesGraded: meta.gamesGraded,
      gamesExcluded: meta.gamesExcluded,
      reviewsFailed: meta.reviewsFailed,
      gamesEmpty: meta.gamesEmpty,
      decisionsPlanned: tally.planned,
      decisionsGraded: tally.graded,
      decisionsTrivial: tally.trivial,
      decisionsNotGraded: tally.notGraded,
      spell: tally.byType.spell ?? 0,
      attack: tally.byType.attack ?? 0,
      block: tally.byType.block ?? 0,
      target: tally.byType.target ?? 0,
      mulligans: meta.mulligans,
      mistakes: rows.filter((r) => r.mistake).length,
      measureWins: rows.filter((r) => r.measure === 'wins').length,
      measureLeaf: rows.filter((r) => r.measure === 'leaf').length,
    },
    kinds,
    leaks,
    needed: { minMistakes: RULE.minMistakes, minGames: RULE.minGames, ...needed(stats, meta.gamesGraded) },
  };
}

/** True when every per-kind value is a finite number or null, examples aside; and the file is JSON a strict parser takes. */
export function strictShape(leaks: unknown): boolean {
  const k = obj(obj(leaks).kinds);
  const ids = Object.keys(k);
  if (ids.length !== KINDS.length) return false;
  for (const id of ids) {
    for (const [key, v] of Object.entries(obj(k[id]))) {
      if (key === 'examples') {
        if (!Array.isArray(v)) return false;
        for (const e of v) {
          const o = obj(e);
          if (typeof o.game !== 'string' || !(o.seq === null || fin(o.seq)) || !fin(o.frame) || !fin(o.regret) || !fin(o.regretLo)) return false;
        }
        continue;
      }
      if (!(v === null || fin(v))) return false;
    }
  }
  return true;
}

/**
 * The rule's arithmetic, done again from the decisions file and compared with
 * leaks.json: counts, games, the bootstrap (same seed, same order) and every
 * leak flag.  Returns the number of disagreements and what they were.
 */
export function verify(rows: Row[], leaks: unknown, b: number = RULE.bootstrapB, seed: number = RULE.bootstrapSeed):
    { mismatches: number; what: string[] } {
  const what: string[] = [];
  const k = obj(obj(leaks).kinds);
  let leakCount = 0;
  for (const kind of KINDS) {
    const got = obj(k[kind.id]);
    const mine = rows.filter((r) => r.kind === kind.id);
    const want = kindStats(mine.map((r) => ({ game: r.game, regret: r.regret, regretLo: r.regretLo, regretHi: r.regretHi })), b, seed);
    for (const f of ['n', 'games', 'mistakes', 'mistakeGames', 'meanRegret', 'meanLo', 'meanHi', 'leak'] as const) {
      if (got[f] !== want[f]) what.push(`${kind.id}.${f}: ${String(got[f])} != ${String(want[f])}`);
    }
    const ruleLeak = want.mistakes >= RULE.minMistakes && want.mistakeGames >= RULE.minGames && want.meanLo !== null && want.meanLo > 0;
    if ((got.leak === 1) !== ruleLeak) what.push(`${kind.id}.leak disagrees with the rule`);
    if (mine.some((r) => r.mistake !== (r.regretLo > RULE.mistakeLoAbove ? 1 : 0))) what.push(`${kind.id}: a row's mistake flag disagrees with its regretLo`);
    if (got.leak === 1) leakCount++;
    if (got.leak !== 1 && Array.isArray(got.examples) && got.examples.length > 0) what.push(`${kind.id}: examples on a kind that is not a leak`);
  }
  if (obj(leaks).leaks !== leakCount) what.push(`leaks: ${String(obj(leaks).leaks)} != ${leakCount}`);
  return { mismatches: what.length, what };
}

const pct = (x: number | null): string => (x === null ? '-' : `${(x * 100).toFixed(1)}`);

/** report.md: the same numbers in plain words, for the owner. */
export function reportMd(leaks: unknown, excluded: { gameId: string; why: string }[]): string {
  const L = obj(leaks);
  const d = obj(L.data);
  const k = obj(L.kinds);
  const nd = obj(L.needed);
  const lines: string[] = [];
  lines.push('# Your leaks: recurring mistakes in your own games (J129)', '');
  const nLeaks = Number(L.leaks);
  lines.push(nLeaks > 0
    ? `**${nLeaks} leak${nLeaks === 1 ? '' : 's'} shown** under the rule written before any of your games was graded.`
    : '**No leak shown.** Under the rule written before any of your games was graded, no kind of decision qualifies.', '');
  lines.push('## What was read', '');
  lines.push(`- ${String(d.gamesIdentified)} recorded games are yours for certain; ${String(d.gamesGraded)} of them were graded `
    + `(${String(d.gamesEmpty)} held no decision of yours, ${String(d.reviewsFailed)} reviews failed). `
    + `${String(d.gamesExcluded)} other logs were left out, each with its reason below.`);
  lines.push(`- Only your own seat was read. In a game against a friend, the friend's log was never opened and none of the friend's decisions was graded.`);
  lines.push(`- ${String(d.decisionsPlanned)} of your decisions were found: ${String(d.spell)} main-phase plays, ${String(d.attack)} attacks, `
    + `${String(d.block)} blocks, ${String(d.target)} target choices. ${String(d.decisionsGraded)} were graded; ${String(d.decisionsTrivial)} had only one legal answer `
    + `and ${String(d.decisionsNotGraded)} could not be graded. You also made ${String(d.mulligans)} keep-or-mulligan decisions, which no grader covers.`);
  lines.push(`- The engine graded each decision by playing every option out with Forge's AI on both sides, the opponent's hidden cards dealt from the cube `
    + `(never their real hand or deck). ${String(d.measureWins)} were graded to the end of the game, ${String(d.measureLeaf)} to the end of the turn.`, '');
  lines.push('## The rule (fixed before grading)', '');
  lines.push(`- A decision is a **clear mistake** only when the whole 95% interval of what it cost you is above zero. You made ${String(d.mistakes)} clear mistakes in all.`);
  lines.push(`- A kind of decision is a **leak** only with at least ${RULE.minMistakes} clear mistakes, in at least ${RULE.minGames} different games, `
    + 'and an average cost over all your decisions of that kind whose 95% interval is above zero. Anything else is "not shown": not proof that you play it well, only that these games do not show a pattern.', '');
  lines.push('## Kind by kind', '');
  lines.push('| kind | graded | games | clear mistakes | in games | average cost, win-chance points [95%] | verdict |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const kind of KINDS) {
    const s = obj(k[kind.id]);
    if (!s.covered) {
      lines.push(`| ${kind.words} | - | - | - | - | - | not graded${kind.id === 'keep-or-mulligan' ? ` (${String(s.seen)} seen)` : ''} |`);
      continue;
    }
    const iv = s.n ? `${pct(s.meanRegret as number)} [${pct(s.meanLo as number)}, ${pct(s.meanHi as number)}]` : '-';
    lines.push(`| ${kind.words} | ${String(s.n)} | ${String(s.games)} | ${String(s.mistakes)} | ${String(s.mistakeGames)} | ${iv} | ${s.leak ? '**LEAK**' : 'not shown'} |`);
  }
  const mu = obj(k['mana-up-vs-tap-out']);
  if (Number(mu.n) > 0) {
    lines.push('', `Holding up versus tapping out: you held mana up ${String(mu.held)} times (${String(mu.heldMistakes)} clear mistakes) `
      + `and cast ${String(mu.tapped)} times (${String(mu.tappedMistakes)} clear mistakes).`);
  }
  for (const kind of KINDS) {
    const s = obj(k[kind.id]);
    if (!s.leak) continue;
    lines.push('', `### Leak: ${kind.words}`, '');
    for (const e of (s.examples as Obj[]) ?? []) {
      lines.push(`- game \`${String(e.game)}\`, turn ${String(e.turn)}, frame seq ${String(e.seq)}: cost about ${pct(e.regret as number)} points (at least ${pct(e.regretLo as number)}).`);
    }
  }
  lines.push('', '## What a verdict needs', '');
  if (nLeaks === 0) {
    if (nd.gamesNeededAtBestRate === null) {
      lines.push(`None of your graded decisions was a clear mistake, so no kind is near the rule's ${RULE.minMistakes} mistakes in ${RULE.minGames} games, `
        + `and there is no rate to estimate how many more games it would take. You have ${String(d.gamesGraded)} graded games.`);
    } else {
      lines.push(`Your most frequent kind of clear mistake has ${String(nd.bestKindMistakes)} in ${String(nd.bestKindMistakeGames)} games, `
        + `about ${String(nd.mistakesPerGame)} a game. At that rate a verdict on it needs about ${String(nd.gamesNeededAtBestRate)} graded games in all; `
        + `you have ${String(d.gamesGraded)}. More games against the AI launched from ForgeCoach (or a table game with recording on) are what adds to this.`);
    }
  } else {
    lines.push('Nothing ships from this report by itself: the cloud session decides whether ForgeCoach shows it.');
  }
  lines.push('', '## Logs left out', '');
  if (excluded.length === 0) lines.push('None.');
  const why = new Map<string, string[]>();
  for (const e of excluded) why.set(e.why, [...(why.get(e.why) ?? []), e.gameId]);
  for (const [w, ids] of [...why.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- ${ids.length} × ${w}${ids.length <= 12 ? `: ${ids.map((i) => `\`${i}\``).join(', ')}` : ''}`);
  }
  return lines.join('\n') + '\n';
}
