/*
 * mtg-table — web/test/cubelab-compare-synth.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Synthetic cube-lab run folders with known rates, for web/test/cubelab-compare.test.ts (D439):
 * 80 nonland cards in five colours and 10 nonbasic lands; each draft two decks of a random
 * colour pair, a best of three won by a logistic in the decks' summed card effects, two grids
 * whose first line is the best card's (with chance `greed`) or a random one.
 */

import type { CardInfo } from '../../tools/cubelab/report.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import type { DraftRecord, RunMeta } from '../../tools/cubelab/run.ts';


export interface Synth {
  /** Each card's true effect on its deck's logit (index = card number). */
  effect: (i: number) => number;
  /** Chance a game is a draw (a timeout every other draw). */
  draw: number;
  /** Turns a game takes, mean. */
  turns: number;
  /** Chance a deck splashes; chance it is built three-colour; lands of a deck is 16 or 17 with this chance of 17. */
  splash: number;
  three: number;
  seventeen: number;
  /** How strongly the first drafter of a grid takes the line holding the best-rated card (0 = at random). */
  greed: number;
  /** SD (logits) of a random effect shared by the games of one match: the games' within-match correlation (default 0). */
  matchSd?: number;
}
export const COLS = ['W', 'U', 'B', 'R', 'G'];
export const PER = 16;                       // nonland cards per colour
export const N = COLS.length * PER;          // 80 nonland cards; then 10 nonbasic lands
export const cardName = (i: number): string => (i < N ? `C${COLS[Math.floor(i / PER)]}${i % PER}` : `Land${i - N}`);

export function synthInfo(): Record<string, CardInfo> {
  const info: Record<string, CardInfo> = {};
  for (let i = 0; i < N + 10; i++) {
    const land = i >= N;
    info[cardName(i)] = { section: land ? 'Lands' : (COLS[Math.floor(i / PER)] as string), colors: land ? '' : (COLS[Math.floor(i / PER)] as string), cmc: land ? 0 : 1 + (i % 6), land, themes: [], rating: 50 + (i % PER), remAIDeck: false, type: land ? 'Land' : 'Creature' };
  }
  return info;
}

export function synthRun(s: Synth, seeds: number[], stream: string): { run: RunMeta; info: Record<string, CardInfo>; recs: DraftRecord[] } {
  const info = synthInfo();
  const recs: DraftRecord[] = [];
  for (const seed of seeds) {
    const r = rng(seed, `synth:${stream}`);
    const decks = [0, 1].map(() => {
      const a = r.int(5);
      let b = r.int(4);
      if (b >= a) b++;
      const pair = [a, b].sort((x, y) => x - y);
      const key = pair.map((c) => COLS[c]).join('');
      const three = r.next() < s.three;
      const splash = !three && r.next() < s.splash ? (COLS.find((_c, i) => !pair.includes(i)) as string) : null;
      const pool = pair.flatMap((c) => Array.from({ length: PER }, (_, j) => c * PER + j));
      const spells: number[] = [];
      while (spells.length < 23) { const x = pool[r.int(pool.length)] as number; if (!spells.includes(x)) spells.push(x); }
      const nonbasic = [N + r.int(10), N + r.int(10)].filter((x, i, xs) => xs.indexOf(x) === i);
      const lands = r.next() < s.seventeen ? 17 : 16;
      const main: Array<[number, string]> = [...spells.map((x): [number, string] => [1, cardName(x)]), ...nonbasic.map((x): [number, string] => [1, cardName(x)]), [lands - nonbasic.length, 'Plains']];
      const strength = spells.reduce((t, x) => t + s.effect(x), 0);
      return { colors: three ? `${key}${COLS.find((_c, i) => !pair.includes(i))}` : key, splash, main, spells: 23, lands, strength, pool: [...spells, ...nonbasic].map(cardName) };
    });
    const games: DraftRecord['match']['games'] = [];
    let wa = 0, wb = 0;
    const u = s.matchSd ? s.matchSd * Math.sqrt(-2 * Math.log(1 - r.next())) * Math.cos(2 * Math.PI * r.next()) : 0;
    for (let n = 1; n <= 3 && wa < 2 && wb < 2; n++) {
      const pa = 1 / (1 + Math.exp(-((decks[0]?.strength ?? 0) - (decks[1]?.strength ?? 0) + u)));
      const draw = r.next() < s.draw;
      const winner = draw ? 'draw' : r.next() < pa ? 'A' : 'B';
      if (winner === 'A') wa++;
      if (winner === 'B') wb++;
      games.push({ n, onPlay: n % 2 ? 'A' : 'B', onPlayVerified: null, winner, turns: Math.max(4, Math.round(s.turns + (r.next() - 0.5) * 6)), ms: 1000, timeout: draw && n % 2 === 1, reason: null, error: null });
    }
    // two grids: the first drafter takes a line (3 of 9 seen), the second one of the rest (3 of 6)
    const picks: Array<Array<{ n: number; kind: 'grid'; at: number; how: string; value: number; seen: string[]; took: string[] }>> = [[], []];
    for (let g = 1; g <= 2; g++) {
      const nine: number[] = [];
      while (nine.length < 9) { const x = r.int(N); if (!nine.includes(x)) nine.push(x); }
      const lines = [nine.slice(0, 3), nine.slice(3, 6), nine.slice(6, 9)];
      const best = lines.map((l) => Math.max(...l.map((x) => s.effect(x))));
      const top = best.indexOf(Math.max(...best));
      const firstLine = r.next() < s.greed ? top : r.int(3);
      const rest = [0, 1, 2].filter((i) => i !== firstLine);
      const second = rest[r.int(2)] as number;
      const opener = (seed + g) % 2;
      picks[opener]?.push({ n: g, kind: 'grid', at: g, how: `row ${firstLine + 1}`, value: 1, seen: nine.map(cardName), took: (lines[firstLine] as number[]).map(cardName) });
      picks[1 - opener]?.push({ n: g, kind: 'grid', at: g, how: `row ${second + 1}`, value: 1, seen: rest.flatMap((i) => lines[i] as number[]).map(cardName), took: (lines[second] as number[]).map(cardName) });
    }
    recs.push({
      v: 1, cube: 'Synth', seed, format: 'grid', dealt: 162, aOpens: seed % 2 === 0,
      drafters: decks.map((d, k) => ({
        seat: k === 0 ? 'A' : 'B', picks: picks[k] ?? [], pool: d.pool,
        deck: { builder: 'lab', colors: d.colors, splash: d.splash, main: d.main, spells: d.spells, lands: d.lands, basics: {}, curve: [], avgCmc: 3, creatures: 13, themes: [], score: 0, parts: {}, alternatives: [], stretched: false },
        deckErrors: [], played: 'lab', deckFile: null, forgeDeckFile: '', forge: null,
      })) as unknown as DraftRecord['drafters'],
      match: { games, winsA: wa, winsB: wb, winner: wa > wb ? 'A' : wb > wa ? 'B' : 'draw', worker: 0 },
      ms: { draft: 0, build: 0, match: 0 },
    } as DraftRecord);
  }
  const run = {
    v: 1, cube: 'Synth', cubeFile: `synth/${stream}.md`, cubeSha: '0'.repeat(64), format: 'grid', seed: seeds[0] ?? 1, drafts: seeds.length, games: 3,
    profiles: ['Default', 'Default'], builder: 'lab', ratingsFile: null, ratingsFromFile: 0, gameTimeoutSec: 300, winstonCards: 90, weights: {},
    forgeJar: '', missing: [], themeNames: {}, archetypes: {},
  } as unknown as RunMeta;
  return { run, info, recs };
}

export const SEEDS = Array.from({ length: 600 }, (_, i) => 1001 + i);
/** A: cards differ (true effects spread over +-0.5 logits), no draws.  B: every card the same, 10% draws, longer games, more splashes. */
export const SPREAD: Synth = { effect: (i) => (i < N ? ((i * 37) % N) / N - 0.5 : 0) * 1.0, draw: 0, turns: 9, splash: 0.1, three: 0, seventeen: 0.5, greed: 1 };
export const FLAT: Synth = { effect: () => 0, draw: 0.1, turns: 12, splash: 0.4, three: 0.1, seventeen: 0.5, greed: 0 };

