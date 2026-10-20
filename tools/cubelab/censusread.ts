// mtg-table — the cube lab: the DECK CENSUS read (D447): win rate across the colour spectrum per band,
// and every card's rows with the deck-profile context a later model will use.  No verdicts.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh census-read --games <dir> [--games <dir>]... --decks <dir> [--decks <dir>]... --out <dir>
//                                [--boot 1000] [--boot-seed 1] [--shrink 20] [--mixed-pilots]
//
// ONE ROW A GAME, ONE DECK AN ID (dedupe, the #154 review).  A deck read twice (a --decks folder named
// twice, or two folders holding one deck) counts once; one id with two different lists is refused.  A
// game is keyed by (band, seed, g, policyA, policyB), the band its decks' (side a's): a folder read with
// its own replay (`--replay`, the same games under the same pilots) counts each game once, the first row
// without an engine error kept, and two bands played on the same --seed are read together; one key
// naming two different deck pairs -- two runs of one band on one seed -- is refused, so give each run
// of a band its own seed.  The rows' pilots must be one pair (plain vs plain for
// the census) unless --mixed-pilots, which reads them together and says so.  spectrum.json carries
// what was dropped (`dropped`) and the pilots (`pilots`).
//
// Reads census-play's games.jsonl in each --games folder and decks.jsonl in each --decks folder (a
// deck id names its band, so the folders of several bands may be read together; a cube's census decks,
// D456, carry the group `cube:<name>` in their band field and are read as a group of their own after the
// four bands), and writes
// <out>/spectrum.json (strict JSON: no NaN, no Infinity; null where a number does not exist),
// <out>/spectrum.md and <out>/cards.tsv.
//
// A DECK-GAME is one deck's side of one game; a decisive game gives one win and one loss, a draw
// counts in neither (it is counted), an engine error is left out.  Within a band every decisive
// game is one win and one loss, so the band's own rate is 0.5 by construction and a bin's rate is
// read against that.
//
// THE SPECTRUM, per band, binned on the REALISED profile (deckcensus.ts profileOf), never on a label:
//   by colours: the number of colours with at least 3 spells (0..5), and beside it the prior's k;
//   by main-colour share: the largest colour's share of the pips, in bins [0, 0.4), [0.4, 0.5),
//     [0.5, 0.6), ... [0.9, 1.0) and exactly 1.0 (keys lt40, s40_50 ... s90_100, eq100; a deck with no
//     coloured pip has no bin).
//   Each cell: decks, deck-games, decisive deck-games, wins, the win rate, Wilson's 95% interval
//   (deck-games as if independent: too narrow), and the interval to read, a deck-clustered
//   percentile bootstrap (the cell's decks resampled with replacement, --boot replicates,
//   rng(--boot-seed, 'census-read/<band>/<axis>/<bin>')).  Also per band: the first player's
//   rate, draws, timeouts, engine errors, and THE WEAK-DECK TAIL (`redraws`): every deck played is
//   castable, so the decks that could not cast their spells are the draws the generator rejected
//   before each deck, counted over the band's decks (rejected draws, new makeups, decks that came
//   after one, the rejected share of all draws), never dropped silently.  cards.tsv's `redraws` is
//   the mean of a card's decks' rejected draws.
//
// Every deck is a random draw at a random makeup, mostly weaker than a built deck, so every rate and
// every card's value is "in a random deck of this makeup"; spectrum.md says so in its header.
//
// THE CARDS (cards.tsv), one row per band and card (basic lands left out): the decks and deck-games
// that held it, its wins, its win rate when in the deck, that rate shrunk toward 0.5 with a Beta
// prior of strength --shrink (20) deck-games (meta.ts's rule, m = 0.5 within a band), and the means,
// over its deck-games, of the context (CTX_COLUMNS): its deck's main share, colours with 3+ spells,
// number of colours, the prior's k, land count, mean mana value and mana-value histogram (0..5, 6+),
// creatures, X spells, card-flow count, fixers (and those that reach two of its colours), each
// colour's pip share, and the opponent's main share and colours; and the share of its deck-games
// where it came in as a CROSS or FILL card.  Report only: a row
// decides nothing, and a surprise is a candidate until it holds on fresh seeds (D447).

import fs from 'node:fs';
import path from 'node:path';

import { BANDS } from './census.ts';
import { fileLines } from './lines.ts';
import { wilson } from './report.ts';
import { rng } from './rng.ts';
import { MAIN_SHARE_KEYS, mainShareKey, type DeckGroup, type DeckRecord } from './deckcensus.ts';
import type { GameRowOut } from './censusplay.ts';
import { labPath, shownPath } from './labdata.ts';

/** The main-share bins' keys (plain identifiers, so the runner's metrics read them) and their labels. */
export const SHARE_BINS = MAIN_SHARE_KEYS;
export const SHARE_LABEL: Record<string, string> = {
  lt40: '< 0.4', s40_50: '0.4–0.5', s50_60: '0.5–0.6', s60_70: '0.6–0.7', s70_80: '0.7–0.8', s80_90: '0.8–0.9', s90_100: '0.9–<1.0', eq100: '1.0 (mono)',
};

export const shareBin = mainShareKey;

export interface Cell { decks: number; deckGames: number; decisive: number; wins: number; draws: number; wr: number | null; wilsonLo: number | null; wilsonHi: number | null; bootLo: number | null; bootHi: number | null }

interface Acc { wins: Map<string, number>; dec: Map<string, number>; games: Map<string, number>; draws: number }
const newAcc = (): Acc => ({ wins: new Map(), dec: new Map(), games: new Map(), draws: 0 });
const bump = (m: Map<string, number>, k: string, n = 1): void => { m.set(k, (m.get(k) ?? 0) + n); };
const r4 = (x: number): number => Math.round(x * 10000) / 10000;

/** A cell's numbers, with the deck-clustered percentile bootstrap. */
export function cellOf(a: Acc, boot: number, seed: number, stream: string): Cell {
  const decks = [...a.games.keys()].sort();
  const W = decks.reduce((s, d) => s + (a.wins.get(d) ?? 0), 0);
  const D = decks.reduce((s, d) => s + (a.dec.get(d) ?? 0), 0);
  const G = decks.reduce((s, d) => s + (a.games.get(d) ?? 0), 0);
  const wi = wilson(W, D);
  let bootLo: number | null = null, bootHi: number | null = null;
  if (decks.length >= 2 && D > 0 && boot > 0) {
    const r = rng(seed, stream);
    const reps: number[] = [];
    const w = decks.map((d) => a.wins.get(d) ?? 0), n = decks.map((d) => a.dec.get(d) ?? 0);
    for (let b = 0; b < boot; b++) {
      let sw = 0, sn = 0;
      for (let i = 0; i < decks.length; i++) { const j = r.int(decks.length); sw += w[j] as number; sn += n[j] as number; }
      if (sn > 0) reps.push(sw / sn);
    }
    reps.sort((x, y) => x - y);
    if (reps.length) { bootLo = r4(reps[Math.floor(0.025 * (reps.length - 1))] as number); bootHi = r4(reps[Math.ceil(0.975 * (reps.length - 1))] as number); }
  }
  return { decks: decks.length, deckGames: G, decisive: D, wins: W, draws: a.draws, wr: D ? r4(W / D) : null, wilsonLo: wi.lo, wilsonHi: wi.hi, bootLo, bootHi };
}

export interface ReadOptions { boot: number; bootSeed: number; shrink: number }

/**
 * The context columns of cards.tsv: each the mean, over the card's deck-games, of a variable of its own
 * deck (or, `opp_`, of its opponent's), null where no deck-game has it (a deck with no pip has no main
 * share; a v1 decks.jsonl has none of the v2 variables).  The deck's variables are decks.jsonl's.
 */
export const CTX_COLUMNS = [
  'main_share', 'colours_with3', 'n_colours', 'makeup_k', 'lands', 'avg_mv', 'mv0', 'mv1', 'mv2', 'mv3', 'mv4', 'mv5', 'mv6p', 'creatures', 'x_spells',
  'card_flow', 'fixers', 'fixers_real', 'share_w', 'share_u', 'share_b', 'share_r', 'share_g', 'redraws', 'opp_main_share', 'opp_colours_with3',
] as const;
export type CtxColumn = (typeof CTX_COLUMNS)[number];

/** One deck-game's context: its deck d against opp. */
export function contextOf(d: DeckRecord, opp: DeckRecord): Record<CtxColumn, number | null> {
  const n = (x: number | undefined | null): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const h = (b: number): number | null => n(d.mvHist?.[b]);
  return {
    main_share: n(d.profile.mainShare), colours_with3: d.profile.coloursWith3, n_colours: n(d.nColours), makeup_k: d.makeup.k, lands: d.lands, avg_mv: d.avgMv,
    mv0: h(0), mv1: h(1), mv2: h(2), mv3: h(3), mv4: h(4), mv5: h(5), mv6p: h(6), creatures: n(d.creatures), x_spells: n(d.xSpells),
    card_flow: n(d.cardFlow), fixers: d.fixers.length, fixers_real: n(d.fixersReal),
    redraws: d.rejections,
    share_w: d.profile.pipShare.W, share_u: d.profile.pipShare.U, share_b: d.profile.pipShare.B, share_r: d.profile.pipShare.R, share_g: d.profile.pipShare.G,
    opp_main_share: n(opp.profile.mainShare), opp_colours_with3: opp.profile.coloursWith3,
  };
}

export interface CardRow {
  band: DeckGroup; card: string; decks: number; deckGames: number; decisive: number; wins: number; wr: number | null; wrShrunk: number | null;
  /** CTX_COLUMNS' means over the card's deck-games. */
  ctx: Record<CtxColumn, number | null>;
  crossShare: number; fillShare: number;
}

export interface CensusRead {
  v: 1;
  decision: 'D447';
  games: number;
  decks: number;
  options: ReadOptions;
  bands: Record<string, {
    games: number; decisive: number; draws: number; timeouts: number; engineErrors: number; firstPlayerWinRate: number | null; firstPlayerDecisive: number;
    decks: number; deckGamesMin: number | null; deckGamesMedian: number | null;
    /** THE WEAK-DECK TAIL: every deck is castable (D447 point 4), so the decks that could not be are the rejected draws before them, counted here over the band's decks. */
    redraws: Redraws;
    byColours: Record<string, Cell>; byPriorK: Record<string, Cell>; byMainShare: Record<string, Cell>;
  }>;
  cards: number;
  /** census-read's de-duplication (dedupe): duplicate deck lines and game rows left out. */
  dropped?: { decks: number; rows: number };
  /** The pilot pairs read, `policyA/policyB`. */
  pilots?: string[];
}

/** One deck an id, one row a (band, seed, g, policyA, policyB), one pair of pilots unless asked (see the header). */
export function dedupe(decks: DeckRecord[], rows: GameRowOut[], o: { mixedPilots: boolean }): { decks: DeckRecord[]; rows: GameRowOut[]; dropped: { decks: number; rows: number }; pilots: string[] } {
  const byId = new Map<string, { d: DeckRecord; text: string }>();
  let dDecks = 0;
  for (const d of decks) {
    const text = JSON.stringify(d);
    const was = byId.get(d.id);
    if (!was) { byId.set(d.id, { d, text }); continue; }
    if (was.text !== text) throw new Error(`census-read: deck ${d.id} is in two --decks folders with two different lists`);
    dDecks++;
  }
  const byKey = new Map<string, GameRowOut>();
  let dRows = 0;
  // The band is the deck's (a game is played within one band); a row whose deck was not read keys by
  // the deck's id instead, and readCensus leaves it out anyway.
  const bandOf = (id: string): string => byId.get(id)?.d.band ?? `?${id}`;
  for (const r of rows) {
    const band = bandOf(r.a);
    const k = `${band}/${r.seed}/${r.g}/${r.policyA}/${r.policyB}`;
    const was = byKey.get(k);
    if (!was) { byKey.set(k, r); continue; }
    if (was.a !== r.a || was.b !== r.b) throw new Error(`census-read: game g${r.g} seed ${r.seed} of band ${band} names two deck pairs (${was.a} vs ${was.b}, ${r.a} vs ${r.b}): two runs of one band on one seed -- give each run of a band its own --seed`);
    dRows++;
    if (was.engineError && !r.engineError) byKey.set(k, r);
  }
  const kept = [...byKey.values()];
  const pilots = [...new Set(kept.map((r) => `${r.policyA}/${r.policyB}`))].sort();
  if (pilots.length > 1 && !o.mixedPilots) throw new Error(`census-read: the rows have ${pilots.length} pairs of pilots (${pilots.join(', ')}); read one pilot pair at a time, or pass --mixed-pilots to read them together`);
  return { decks: [...byId.values()].map((x) => x.d), rows: kept, dropped: { decks: dDecks, rows: dRows }, pilots };
}

/** The weak-deck tail of a band: rejected card draws (a draw whose spells its own lands could not cast, or a list ran dry) and new makeups, over its decks. */
export interface Redraws { decks: number; rejections: number; makeupRedraws: number; decksRedrawn: number; rejectedShare: number | null }
export function redrawsOf(decks: DeckRecord[]): Redraws {
  const rejections = decks.reduce((a, d) => a + d.rejections, 0);
  return {
    decks: decks.length, rejections, makeupRedraws: decks.reduce((a, d) => a + d.makeupRedraws, 0),
    decksRedrawn: decks.filter((d) => d.rejections > 0 || d.makeupRedraws > 0).length,
    rejectedShare: decks.length ? r4(rejections / (rejections + decks.length)) : null,
  };
}

/** The groups a read reports: the four bands in their order, then every cube's census group (D456) by name. */
export function groupsOf(decks: Array<Pick<DeckRecord, 'band'>>): DeckGroup[] {
  const cubes = [...new Set(decks.map((d) => d.band).filter((b) => !(BANDS as readonly string[]).includes(b)))].sort();
  return [...BANDS, ...cubes];
}
const groupRank = (g: DeckGroup): number => { const i = (BANDS as readonly string[]).indexOf(g); return i < 0 ? BANDS.length : i; };

/** The read itself, pure: decks and game rows in (already de-duplicated), the spectrum and the card rows out. */
export function readCensus(decks: DeckRecord[], rows: GameRowOut[], o: ReadOptions): { doc: CensusRead; cards: CardRow[] } {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const bands: CensusRead['bands'] = {};
  const cardAcc = new Map<string, { band: DeckGroup; card: string; decks: Set<string>; g: number; dec: number; wins: number; sum: number[]; n: number[]; cross: number; fill: number }>();
  const CTX = CTX_COLUMNS.length;
  const used = rows.filter((r) => byId.has(r.a) && byId.has(r.b));
  // the bands, then any cube's census group (`cube:<name>`, D456), each read on its own
  for (const band of groupsOf(decks)) {
    const bRows = used.filter((r) => (byId.get(r.a) as DeckRecord).band === band);
    if (!bRows.length) continue;
    const axes: Record<'byColours' | 'byPriorK' | 'byMainShare', Map<string, Acc>> = { byColours: new Map(), byPriorK: new Map(), byMainShare: new Map() };
    const perDeck = new Map<string, number>();
    let decisive = 0, draws = 0, timeouts = 0, engineErrors = 0, firstWins = 0, firstDec = 0;
    for (const r of bRows) {
      if (r.engineError) { engineErrors++; continue; }
      if (r.timeout) timeouts++;
      const isDec = r.winner === 'a' || r.winner === 'b';
      if (isDec) { decisive++; if (r.first) { firstDec++; if (r.first === r.winner) firstWins++; } } else draws++;
      for (const side of ['a', 'b'] as const) {
        const id = side === 'a' ? r.a : r.b;
        const d = byId.get(id) as DeckRecord;
        const opp = byId.get(side === 'a' ? r.b : r.a) as DeckRecord;
        bump(perDeck, id);
        const keys: Record<keyof typeof axes, string | null> = {
          byColours: String(d.profile.coloursWith3), byPriorK: String(d.makeup.k), byMainShare: shareBin(d.profile.mainShare),
        };
        for (const ax of Object.keys(axes) as Array<keyof typeof axes>) {
          const k = keys[ax];
          if (k === null) continue;
          let acc = axes[ax].get(k);
          if (!acc) { acc = newAcc(); axes[ax].set(k, acc); }
          bump(acc.games, id);
          if (isDec) { bump(acc.dec, id); if (r.winner === side) bump(acc.wins, id); } else acc.draws++;
        }
        const won = isDec && r.winner === side ? 1 : 0;
        const crossSet = new Set(d.cross), fillSet = new Set(d.fill);
        const ctx = contextOf(d, opp);
        for (const name of [...d.spells, ...d.fixers]) {
          const key = `${band}\t${name}`;
          let c = cardAcc.get(key);
          if (!c) { c = { band, card: name, decks: new Set(), g: 0, dec: 0, wins: 0, sum: new Array(CTX).fill(0) as number[], n: new Array(CTX).fill(0) as number[], cross: 0, fill: 0 }; cardAcc.set(key, c); }
          c.decks.add(id);
          c.g++;
          if (isDec) { c.dec++; c.wins += won; }
          CTX_COLUMNS.forEach((col, i) => { const x = ctx[col]; if (x !== null) { c.sum[i] = (c.sum[i] as number) + x; c.n[i] = (c.n[i] as number) + 1; } });
          if (crossSet.has(name)) c.cross++;
          if (fillSet.has(name)) c.fill++;
        }
      }
    }
    const cells = (ax: keyof typeof axes, order: readonly string[]): Record<string, Cell> => {
      const out: Record<string, Cell> = {};
      for (const k of order) { const a = axes[ax].get(k); if (a) out[k] = cellOf(a, o.boot, o.bootSeed, `census-read/${band}/${ax}/${k}`); }
      return out;
    };
    const counts = [...perDeck.values()].sort((x, y) => x - y);
    bands[band] = {
      games: bRows.length, decisive, draws, timeouts, engineErrors, firstPlayerWinRate: firstDec ? r4(firstWins / firstDec) : null, firstPlayerDecisive: firstDec,
      decks: perDeck.size, redraws: redrawsOf(decks.filter((d) => d.band === band)), deckGamesMin: counts.length ? counts[0] as number : null, deckGamesMedian: counts.length ? counts[Math.floor((counts.length - 1) / 2)] as number : null,
      byColours: cells('byColours', ['0', '1', '2', '3', '4', '5']), byPriorK: cells('byPriorK', ['1', '2', '3', '4', '5']), byMainShare: cells('byMainShare', SHARE_BINS),
    };
  }
  const cards: CardRow[] = [...cardAcc.values()].map((c) => ({
    band: c.band, card: c.card, decks: c.decks.size, deckGames: c.g, decisive: c.dec, wins: c.wins,
    wr: c.dec ? r4(c.wins / c.dec) : null, wrShrunk: r4((c.wins + o.shrink * 0.5) / (c.dec + o.shrink)),
    ctx: Object.fromEntries(CTX_COLUMNS.map((col, i) => [col, (c.n[i] as number) > 0 ? r4((c.sum[i] as number) / (c.n[i] as number)) : null])) as Record<CtxColumn, number | null>,
    crossShare: r4(c.cross / c.g), fillShare: r4(c.fill / c.g),
  })).sort((x, y) => (x.band === y.band ? (x.card < y.card ? -1 : x.card > y.card ? 1 : 0) : groupRank(x.band) - groupRank(y.band) || (x.band < y.band ? -1 : 1)));
  return { doc: { v: 1, decision: 'D447', games: used.length, decks: decks.length, options: o, bands, cards: cards.length }, cards };
}

export const CARD_COLUMNS = ['band', 'card', 'decks', 'deck_games', 'decisive', 'wins', 'wr', 'wr_shrunk', ...CTX_COLUMNS, 'cross_share', 'fill_share'] as const;

export function cardsTsv(rows: CardRow[]): string {
  const v = (x: number | null): string => (x === null ? '' : String(x));
  return `${CARD_COLUMNS.join('\t')}\n${rows.map((r) => [r.band, r.card, r.decks, r.deckGames, r.decisive, r.wins, v(r.wr), v(r.wrShrunk), ...CTX_COLUMNS.map((c) => v(r.ctx[c])), r.crossShare, r.fillShare].join('\t')).join('\n')}\n`;
}

export function spectrumMd(doc: CensusRead): string {
  const f = (x: number | null): string => (x === null ? '–' : x.toFixed(3));
  const iv = (lo: number | null, hi: number | null): string => (lo === null || hi === null ? '–' : `${f(lo)}–${f(hi)}`);
  const table = (title: string, cells: Record<string, Cell>): string[] => [
    `| ${title} | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |`, '|---|---|---|---|---|---|---|',
    ...Object.entries(cells).map(([k, c]) => `| ${SHARE_LABEL[k] ?? k} | ${c.decks} | ${c.deckGames} | ${c.decisive} | ${f(c.wr)} | ${iv(c.bootLo, c.bootHi)} | ${iv(c.wilsonLo, c.wilsonHi)} |`), '',
  ];
  const out = ['# Deck census: win rate across the colour spectrum (D447)', '',
    'Every deck here is a random draw from its band\'s pool at a random colour makeup, with no curve, synergy or rating rule, so it is mostly weaker than a drafted or built deck: **every rate, and every card\'s value, is "in a random deck of this makeup", as Forge\'s AI plays it**, not in a built deck.', '',
    `${doc.games} games, ${doc.decks} decks${doc.pilots ? `, pilots ${doc.pilots.join(' + ')}` : ''}${doc.dropped && (doc.dropped.rows || doc.dropped.decks) ? ` (${doc.dropped.rows} duplicate game rows and ${doc.dropped.decks} duplicate deck lines left out)` : ''}; bootstrap ${doc.options.boot} replicates (seed ${doc.options.bootSeed}), clustered by deck. Bins are the realised profiles, read after the games; no bin is a verdict, and any difference is a candidate until it holds on fresh seeds. Every rate is as Forge's AI plays it.`, ''];
  for (const [band, b] of Object.entries(doc.bands)) {
    out.push(`## ${band}`, '', `${b.games} games (${b.decisive} decisive, ${b.draws} drawn, ${b.timeouts} timeouts, ${b.engineErrors} engine errors); ${b.decks} decks, deck-games min ${b.deckGamesMin ?? '–'}, median ${b.deckGamesMedian ?? '–'}; the first player won ${f(b.firstPlayerWinRate)} of ${b.firstPlayerDecisive}.`, '',
      `**The weak-deck tail** (every deck played is castable, so the uncastable ones are the draws rejected before it): ${b.redraws.rejections} rejected draw(s) and ${b.redraws.makeupRedraws} new makeup(s) over the band's ${b.redraws.decks} decks; ${b.redraws.decksRedrawn} deck(s) came after at least one; ${f(b.redraws.rejectedShare)} of all draws were rejected.`, '');
    out.push(...table('colours with 3+ spells', b.byColours), ...table('main-colour share of pips', b.byMainShare), ...table('the prior\'s k', b.byPriorK));
  }
  return `${out.join('\n')}\n`;
}

/** JSON with no NaN or Infinity anywhere (a non-finite number is a bug: refuse it). */
export function strictJson(x: unknown): string {
  return JSON.stringify(x, (_k, v: unknown) => {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('census-read: a non-finite number reached the JSON (a bug)');
    return v;
  }, 2);
}

export function censusReadCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const gamesDirs = f.get('games') ?? [];
  const deckDirs = f.get('decks') ?? [];
  const outArg = f.get('out')?.at(-1);
  if (!gamesDirs.length || !deckDirs.length || !outArg) throw new Error('census-read: --games <dir>, --decks <dir> and --out <dir> are required');
  const num = (k: string, d: number): number => { const v = f.get(k)?.at(-1); const n = v === undefined ? d : Number(v); if (!Number.isInteger(n) || n < 0) throw new Error(`census-read: --${k} wants a whole number`); return n; };
  const o: ReadOptions = { boot: num('boot', 1000), bootSeed: num('boot-seed', 1), shrink: num('shrink', 20) };
  const decks: DeckRecord[] = [];
  for (const d of deckDirs) {
    const file = path.join(labPath(repo, d, 'read'), 'decks.jsonl');   // D450
    for (const l of fileLines(file, { complete: true })) if (l) decks.push(JSON.parse(l) as DeckRecord);
  }
  const rows: GameRowOut[] = [];
  for (const g of gamesDirs) {
    const dir = labPath(repo, g, 'read');
    const files = fs.existsSync(path.join(dir, 'games.jsonl')) ? [path.join(dir, 'games.jsonl')] : fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl')).map((x) => path.join(dir, x));
    for (const file of files) for (const l of fileLines(file, { complete: true })) if (l) rows.push(JSON.parse(l) as GameRowOut);
  }
  const dd = dedupe(decks, rows, { mixedPilots: f.has('mixed-pilots') });
  const ids = new Set(dd.decks.map((d) => d.id));
  const unknown = dd.rows.filter((r) => !ids.has(r.a) || !ids.has(r.b)).length;
  if (unknown) throw new Error(`census-read: ${unknown} game row(s) name a deck not in the --decks folders`);
  const read = readCensus(dd.decks, dd.rows, o);
  const doc: CensusRead = { ...read.doc, dropped: dd.dropped, pilots: dd.pilots };
  const { cards } = read;
  const out = labPath(repo, outArg, 'write');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'spectrum.json'), `${strictJson(doc)}\n`);
  fs.writeFileSync(path.join(out, 'spectrum.md'), spectrumMd(doc));
  fs.writeFileSync(path.join(out, 'cards.tsv'), cardsTsv(cards));
  say(`census-read: ${doc.games} game(s), ${doc.decks} deck(s)${dd.dropped.rows || dd.dropped.decks ? ` (${dd.dropped.rows} duplicate row(s), ${dd.dropped.decks} duplicate deck(s) dropped)` : ''}, pilots ${dd.pilots.join(' + ') || '-'}, ${Object.keys(doc.bands).join(', ')}; ${cards.length} card row(s) -> ${shownPath(repo, out) || '.'}/spectrum.json, spectrum.md, cards.tsv`);
  return 0;
}
