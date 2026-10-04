// mtg-table — the cube lab: `meta <out>`, a run folder as ForgeCoach's meta.json (schema 1).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ForgeCoach's draft and deck assistant reads <out>/meta.json (D297).  The keys
// below are its contract — schema 1, kept exactly; new fields may be added, a
// changed or removed one is schema 2 and a change on ForgeCoach's side too.
//
//   cube        the cube's cards: name, colours, mana value, types, themes
//   sample      how much data: drafts, decisive games, seed range, AI profile
//   cards       per card: picked / seen (pickRate), average pick index (1 = the
//               drafter's first card), decks it was played in / times picked
//               (inclusionRate), decisive games played and won, winRate, the
//               SHRUNK win rate and Wilson's 95% interval.  A nonbasic LAND is
//               counted like a spell here (D380): it is a cube card the drafter
//               took and the builder played.  Basics are not cube cards and
//               have no entry.  A grid pick takes a whole row, so `picked`
//               counts every card of it, wanted or not; a low-rated card the
//               builder never plays reads picked > 0, inDecks 0, and that is data
//               (D380), not a lost name.
//   archetypes  a played deck's pair plus its primary theme ("BR-SAC", or "BR"
//               with no theme): decks, games, win rate, key cards, average
//               lands, average curve, up to three sample decks
//   pairs       two nonland cards in the same played deck: games together,
//               their win rate together, and lift (below)
//   lands       win rate by the played deck's land count, overall and per
//               archetype
//   splash      splashing decks' win rate, and its difference from the rest
//
// Win rates are over decisive games (a draw counts in neither column).
// Archetype key cards, pairs and curves stay NONLAND: every deck plays lands,
// so a land in a pair or a key-card list says nothing about the deck.
//
// SHRINKAGE.  winRateShrunk = (wins + k·m) / (games + k): the posterior mean of
// a Beta prior with mean m and strength k = 20 games, where m is the mean over
// every NONLAND card-game observation of the run (Σ wins / Σ games across all
// nonland cards; lands, counted since D380, do not move it).
// A card seen in 4 games at 4–0 shrinks to (4 + 20·0.5) / 24 ≈ 0.58; one at
// 60–20 to 0.70.  Sort by it, not by winRate.
//
// KEY CARDS of an archetype rank its nonland cards by contribution =
// appearances in the archetype's decks × (the card's shrunk win rate within
// those decks − the archetype's win rate): cards that are both common there and
// better than the deck around them.  Only cards with a positive contribution
// are listed, at most 12.
//
// LIFT of a pair = winRateTogether / mean(the two cards' shrunk win rates),
// with winRateTogether itself shrunk toward the run's mean the same way; a pair
// needs at least `minPairGames` decisive games together, and the top
// `maxPairs` (300) by lift are kept.

import type { DraftRecord, RunMeta } from './run.ts';
import { playedDeck, wilson, type CardInfo } from './report.ts';
import type { Cube } from './cube.ts';

export const SHRINK_K = 20;

export interface MetaOptions { minPairGames: number; maxPairs: number }
export const DEFAULT_META: MetaOptions = { minPairGames: 6, maxPairs: 300 };

const r4 = (x: number): number => Math.round(x * 10000) / 10000;
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const CURVE_KEYS = ['1', '2', '3', '4', '5', '6+'];

/** Card types from a Forge type line ("Legendary Creature - Human Wizard" -> ["Legendary", "Creature"]). */
export function typesOf(typeLine: string): string[] {
  return (typeLine.split(' - ')[0] ?? '').split(/\s+/).filter(Boolean);
}

const shrink = (w: number, g: number, m: number): number => (w + SHRINK_K * m) / (g + SHRINK_K);
const ci = (w: number, g: number): [number, number] => {
  const c = wilson(w, g);
  return [c.lo ?? 0, c.hi ?? 1];
};

interface Obs { wins: number; games: number }
/** `names`: the deck's nonland cards (pairs, key cards); `cards`: every nonbasic card, lands too (per-card counts, D380). */
interface Played { id: string; colors: string; theme: string; splash: boolean; lands: number; names: string[]; cards: string[]; main: Array<[number, string]>; wins: number; games: number }

export function buildMeta(meta: RunMeta, info: Record<string, CardInfo>, recs: DraftRecord[], cube: Cube | null, opt: MetaOptions = DEFAULT_META): unknown {
  recs = [...recs].sort((a, b) => a.seed - b.seed);
  // ---- one entry per played deck
  const played: Played[] = [];
  const seen = new Map<string, number>();
  const picked = new Map<string, number>();
  const pickIdx = new Map<string, number[]>();
  for (const rec of recs) {
    const here = new Set<string>();
    for (const dr of rec.drafters) {
      for (const p of dr.picks) for (const n of p.seen) here.add(n);
      for (const n of dr.pool) here.add(n);
      let i = 0;
      for (const p of dr.picks) for (const n of p.took) {
        i++;
        picked.set(n, (picked.get(n) ?? 0) + 1);
        const at = pickIdx.get(n);
        if (at) at.push(i); else pickIdx.set(n, [i]);
      }
    }
    for (const n of here) seen.set(n, (seen.get(n) ?? 0) + 1);
    for (const k of [0, 1] as const) {
      const pd = playedDeck(rec, k, info);
      const me = k === 0 ? 'A' : 'B';
      let wins = 0, games = 0;
      for (const g of rec.match.games) {
        if (g.winner === 'draw') continue;
        games++;
        if (g.winner === me) wins++;
      }
      const dr = rec.drafters[k];
      const lands = pd.source === 'lab' ? (dr.deck?.lands ?? 0)
        : pd.main.reduce((s, [n, name]) => s + (BASICS.has(name) || info[name]?.land ? n : 0), 0);
      const cards = pd.main.filter(([, name]) => !BASICS.has(name)).map(([, name]) => name);
      const names = cards.filter((name) => !info[name]?.land);
      played.push({ id: pd.theme === 'none' ? pd.key : `${pd.key}-${pd.theme}`, colors: pd.key, theme: pd.theme, splash: pd.splash !== null, lands, names, cards, main: pd.main, wins, games });
    }
  }
  // ---- per card
  const cardObs = new Map<string, Obs>();
  const inDecks = new Map<string, number>();
  for (const d of played) for (const n of new Set(d.cards)) {
    const o = cardObs.get(n) ?? { wins: 0, games: 0 };
    o.wins += d.wins; o.games += d.games;
    cardObs.set(n, o);
    inDecks.set(n, (inDecks.get(n) ?? 0) + 1);
  }
  let tw = 0, tg = 0;
  for (const [n, o] of cardObs) if (!info[n]?.land) { tw += o.wins; tg += o.games; }
  const m = tg ? tw / tg : 0.5;
  const names = cube ? cube.cards.map((c) => c.name) : Object.keys(info).sort();
  const cards: Record<string, unknown> = {};
  const shrunk = new Map<string, number>();
  for (const n of new Set([...names, ...cardObs.keys()])) {
    const o = cardObs.get(n) ?? { wins: 0, games: 0 };
    const p = picked.get(n) ?? 0;
    const s = seen.get(n) ?? 0;
    const idx = pickIdx.get(n) ?? [];
    const sh = shrink(o.wins, o.games, m);
    shrunk.set(n, sh);
    cards[n] = {
      picked: p, seen: s, pickRate: s ? r4(p / s) : 0,
      avgPickIndex: idx.length ? r4(idx.reduce((a, b) => a + b, 0) / idx.length) : 0,
      inDecks: inDecks.get(n) ?? 0, inclusionRate: p ? r4((inDecks.get(n) ?? 0) / p) : 0,
      games: o.games, wins: o.wins, winRate: o.games ? r4(o.wins / o.games) : 0,
      winRateShrunk: r4(sh), ci: ci(o.wins, o.games),
    };
  }
  // ---- archetypes
  const byArch = new Map<string, Played[]>();
  for (const d of played) {
    const at = byArch.get(d.id);
    if (at) at.push(d); else byArch.set(d.id, [d]);
  }
  const landTable = (ds: Played[]): Record<string, { games: number; winRate: number }> => {
    const t = new Map<number, Obs>();
    for (const d of ds) { const o = t.get(d.lands) ?? { wins: 0, games: 0 }; o.wins += d.wins; o.games += d.games; t.set(d.lands, o); }
    const out: Record<string, { games: number; winRate: number }> = {};
    for (const [k, o] of [...t.entries()].sort((a, b) => a[0] - b[0])) out[String(k)] = { games: o.games, winRate: o.games ? r4(o.wins / o.games) : 0 };
    return out;
  };
  const archetypes = [...byArch.entries()].map(([id, ds]) => {
    const w = ds.reduce((s, d) => s + d.wins, 0);
    const g = ds.reduce((s, d) => s + d.games, 0);
    const rate = g ? w / g : 0;
    const within = new Map<string, Obs & { n: number }>();
    for (const d of ds) for (const n of new Set(d.names)) {
      const o = within.get(n) ?? { wins: 0, games: 0, n: 0 };
      o.wins += d.wins; o.games += d.games; o.n++;
      within.set(n, o);
    }
    const keyCards = [...within.entries()]
      .map(([n, o]) => ({ n, c: o.n * (shrink(o.wins, o.games, rate) - rate) }))
      .filter((x) => x.c > 1e-9).sort((a, b) => b.c - a.c || (a.n < b.n ? -1 : 1)).slice(0, 12).map((x) => x.n);
    const curve: Record<string, number> = Object.fromEntries(CURVE_KEYS.map((k) => [k, 0]));
    for (const d of ds) for (const [cnt, n] of d.main) {
      const i = info[n];
      if (!i || i.land || BASICS.has(n)) continue;
      const key = CURVE_KEYS[Math.min(5, Math.max(0, i.cmc - 1))] as string;
      curve[key] = (curve[key] ?? 0) + cnt;
    }
    for (const k of CURVE_KEYS) curve[k] = r4((curve[k] ?? 0) / ds.length);
    const samples = [...ds].sort((a, b) => b.wins - a.wins || b.games - a.games).slice(0, 3)
      .map((d) => d.main.flatMap(([cnt, n]) => Array.from({ length: cnt }, () => n)));
    return {
      id, colors: ds[0]?.colors ?? '', primaryTheme: ds[0]?.theme ?? 'none', decks: ds.length, games: g,
      winRate: r4(rate), ci: ci(w, g), keyCards, avgLands: r4(ds.reduce((s, d) => s + d.lands, 0) / ds.length),
      avgCurve: curve, sampleDecks: samples,
    };
  }).sort((a, b) => b.decks - a.decks || (a.id < b.id ? -1 : 1));
  // ---- pairs
  const pairObs = new Map<string, Obs>();
  for (const d of played) {
    const u = [...new Set(d.names)].sort();
    for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
      const key = `${u[i]}\u0000${u[j]}`;
      const o = pairObs.get(key) ?? { wins: 0, games: 0 };
      o.wins += d.wins; o.games += d.games;
      pairObs.set(key, o);
    }
  }
  const pairs = [...pairObs.entries()].filter(([, o]) => o.games >= opt.minPairGames).map(([key, o]) => {
    const [a, b] = key.split('\u0000') as [string, string];
    const base = ((shrunk.get(a) ?? m) + (shrunk.get(b) ?? m)) / 2;
    return { a, b, games: o.games, winRateTogether: r4(o.wins / o.games), lift: r4(base ? shrink(o.wins, o.games, m) / base : 0) };
  }).sort((x, y) => y.lift - x.lift || y.games - x.games || (x.a + x.b < y.a + y.b ? -1 : 1)).slice(0, opt.maxPairs);
  // ---- lands, splash
  const byArchLands: Record<string, unknown> = {};
  for (const [id, ds] of [...byArch.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) byArchLands[id] = landTable(ds);
  const spl = played.filter((d) => d.splash);
  const non = played.filter((d) => !d.splash);
  const rateOf = (ds: Played[]): number => { const g = ds.reduce((s, d) => s + d.games, 0); return g ? ds.reduce((s, d) => s + d.wins, 0) / g : 0; };
  const profiles = meta.profiles[0] === meta.profiles[1] ? meta.profiles[0] : meta.profiles.join(',');
  return {
    schema: 1,
    cube: {
      name: cube?.title ?? meta.cube,
      file: meta.cubeFile,
      cards: names.map((n) => {
        const i = info[n];
        const themes = cube?.cards.find((c) => c.name === n)?.themes ?? i?.themes ?? [];
        return { name: n, colors: [...(i?.colors ?? '')], mv: i?.cmc ?? 0, types: typesOf(i?.type ?? ''), themes };
      }),
    },
    sample: {
      drafts: recs.length,
      games: recs.reduce((s, r) => s + r.match.games.filter((g) => g.winner !== 'draw').length, 0),
      seedRange: recs.length ? [recs[0]?.seed ?? 0, recs[recs.length - 1]?.seed ?? 0] : [0, 0],
      aiProfile: profiles,
      format: meta.format,
      shrinkage: { prior: 'beta', mean: r4(m), strength: SHRINK_K },
    },
    cards,
    archetypes,
    pairs,
    lands: { overall: landTable(played), byArchetype: byArchLands },
    splash: { games: spl.reduce((s, d) => s + d.games, 0), winRate: r4(rateOf(spl)), vsNoSplash: r4(rateOf(spl) - rateOf(non)) },
  };
}
