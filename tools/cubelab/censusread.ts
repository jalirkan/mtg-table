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
// game is keyed by (seed, g, policyA, policyB): a folder read with its own replay (`--replay`, the same
// games under the same pilots) counts each game once, the first row without an engine error kept; one
// key naming two different deck pairs is refused.  The rows' pilots must be one pair (plain vs plain for
// the census) unless --mixed-pilots, which reads them together and says so.  spectrum.json carries
// what was dropped (`dropped`) and the pilots (`pilots`).
//
// Reads census-play's games.jsonl in each --games folder and decks.jsonl in each --decks folder (a
// deck id names its band, so the folders of several bands may be read together), and writes
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
//   rate, draws, timeouts, engine errors.
//
// THE CARDS (cards.tsv), one row per band and card (basic lands left out): the decks and deck-games
// that held it, its wins, its win rate when in the deck, that rate shrunk toward 0.5 with a Beta
// prior of strength --shrink (20) deck-games (meta.ts's rule, m = 0.5 within a band), and the means,
// over its deck-games, of the context: its deck's main share, colours with 3+ spells, the prior's k,
// land count, mean mana value, card-flow count, fixers, and the opponent's main share and colours;
// and the share of its deck-games where it came in as a CROSS or FILL card.  Report only: a row
// decides nothing, and a surprise is a candidate until it holds on fresh seeds (D447).

import fs from 'node:fs';
import path from 'node:path';

import { BANDS, type Band } from './census.ts';
import { fileLines } from './lines.ts';
import { wilson } from './report.ts';
import { rng } from './rng.ts';
import { MAIN_SHARE_KEYS, mainShareKey, type DeckRecord } from './deckcensus.ts';
import type { GameRowOut } from './censusplay.ts';

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

export interface CardRow {
  band: Band; card: string; decks: number; deckGames: number; decisive: number; wins: number; wr: number | null; wrShrunk: number | null;
  mainShare: number | null; coloursWith3: number; makeupK: number; lands: number; avgMv: number; cardFlow: number; fixers: number;
  oppMainShare: number | null; oppColoursWith3: number; crossShare: number; fillShare: number;
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
    byColours: Record<string, Cell>; byPriorK: Record<string, Cell>; byMainShare: Record<string, Cell>;
  }>;
  cards: number;
  /** census-read's de-duplication (dedupe): duplicate deck lines and game rows left out. */
  dropped?: { decks: number; rows: number };
  /** The pilot pairs read, `policyA/policyB`. */
  pilots?: string[];
}

/** One deck an id, one row a (seed, g, policyA, policyB), one pair of pilots unless asked (see the header). */
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
  for (const r of rows) {
    const k = `${r.seed}/${r.g}/${r.policyA}/${r.policyB}`;
    const was = byKey.get(k);
    if (!was) { byKey.set(k, r); continue; }
    if (was.a !== r.a || was.b !== r.b) throw new Error(`census-read: game g${r.g} seed ${r.seed} names two deck pairs (${was.a} vs ${was.b}, ${r.a} vs ${r.b}): two runs on one seed`);
    dRows++;
    if (was.engineError && !r.engineError) byKey.set(k, r);
  }
  const kept = [...byKey.values()];
  const pilots = [...new Set(kept.map((r) => `${r.policyA}/${r.policyB}`))].sort();
  if (pilots.length > 1 && !o.mixedPilots) throw new Error(`census-read: the rows have ${pilots.length} pairs of pilots (${pilots.join(', ')}); read one pilot pair at a time, or pass --mixed-pilots to read them together`);
  return { decks: [...byId.values()].map((x) => x.d), rows: kept, dropped: { decks: dDecks, rows: dRows }, pilots };
}

/** The read itself, pure: decks and game rows in (already de-duplicated), the spectrum and the card rows out. */
export function readCensus(decks: DeckRecord[], rows: GameRowOut[], o: ReadOptions): { doc: CensusRead; cards: CardRow[] } {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const bands: CensusRead['bands'] = {};
  const cardAcc = new Map<string, { band: Band; card: string; decks: Set<string>; g: number; dec: number; wins: number; ctx: number[]; nOpp: number; cross: number; fill: number }>();
  const CTX = 10;
  const used = rows.filter((r) => byId.has(r.a) && byId.has(r.b));
  for (const band of BANDS) {
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
        for (const name of [...d.spells, ...d.fixers]) {
          const key = `${band}\t${name}`;
          let c = cardAcc.get(key);
          if (!c) { c = { band, card: name, decks: new Set(), g: 0, dec: 0, wins: 0, ctx: new Array(CTX).fill(0) as number[], nOpp: 0, cross: 0, fill: 0 }; cardAcc.set(key, c); }
          c.decks.add(id);
          c.g++;
          if (isDec) { c.dec++; c.wins += won; }
          const v = [d.profile.mainShare ?? NaN, d.profile.coloursWith3, d.makeup.k, d.lands, d.avgMv, d.cardFlow, d.fixers.length, opp.profile.mainShare ?? NaN, opp.profile.coloursWith3, 0];
          for (let i = 0; i < CTX; i++) c.ctx[i] = (c.ctx[i] as number) + (Number.isNaN(v[i]) ? 0 : (v[i] as number));
          if (d.profile.mainShare === null) c.ctx[9] = (c.ctx[9] as number) + 1;     // deck-games with no main share
          if (opp.profile.mainShare !== null) c.nOpp++;
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
      decks: perDeck.size, deckGamesMin: counts.length ? counts[0] as number : null, deckGamesMedian: counts.length ? counts[Math.floor((counts.length - 1) / 2)] as number : null,
      byColours: cells('byColours', ['0', '1', '2', '3', '4', '5']), byPriorK: cells('byPriorK', ['1', '2', '3', '4', '5']), byMainShare: cells('byMainShare', SHARE_BINS),
    };
  }
  const cards: CardRow[] = [...cardAcc.values()].map((c) => {
    const mainN = c.g - (c.ctx[9] as number);
    return {
      band: c.band, card: c.card, decks: c.decks.size, deckGames: c.g, decisive: c.dec, wins: c.wins,
      wr: c.dec ? r4(c.wins / c.dec) : null, wrShrunk: r4((c.wins + o.shrink * 0.5) / (c.dec + o.shrink)),
      mainShare: mainN > 0 ? r4((c.ctx[0] as number) / mainN) : null, coloursWith3: r4((c.ctx[1] as number) / c.g), makeupK: r4((c.ctx[2] as number) / c.g),
      lands: r4((c.ctx[3] as number) / c.g), avgMv: r4((c.ctx[4] as number) / c.g), cardFlow: r4((c.ctx[5] as number) / c.g), fixers: r4((c.ctx[6] as number) / c.g),
      oppMainShare: c.nOpp > 0 ? r4((c.ctx[7] as number) / c.nOpp) : null, oppColoursWith3: r4((c.ctx[8] as number) / c.g),
      crossShare: r4(c.cross / c.g), fillShare: r4(c.fill / c.g),
    };
  }).sort((x, y) => (x.band === y.band ? (x.card < y.card ? -1 : x.card > y.card ? 1 : 0) : BANDS.indexOf(x.band) - BANDS.indexOf(y.band)));
  return { doc: { v: 1, decision: 'D447', games: used.length, decks: decks.length, options: o, bands, cards: cards.length }, cards };
}

export const CARD_COLUMNS = ['band', 'card', 'decks', 'deck_games', 'decisive', 'wins', 'wr', 'wr_shrunk', 'main_share', 'colours_with3', 'makeup_k', 'lands', 'avg_mv', 'card_flow', 'fixers', 'opp_main_share', 'opp_colours_with3', 'cross_share', 'fill_share'] as const;

export function cardsTsv(rows: CardRow[]): string {
  const v = (x: number | null): string => (x === null ? '' : String(x));
  return `${CARD_COLUMNS.join('\t')}\n${rows.map((r) => [r.band, r.card, r.decks, r.deckGames, r.decisive, r.wins, v(r.wr), v(r.wrShrunk), v(r.mainShare), r.coloursWith3, r.makeupK, r.lands, r.avgMv, r.cardFlow, r.fixers, v(r.oppMainShare), r.oppColoursWith3, r.crossShare, r.fillShare].join('\t')).join('\n')}\n`;
}

export function spectrumMd(doc: CensusRead): string {
  const f = (x: number | null): string => (x === null ? '–' : x.toFixed(3));
  const iv = (lo: number | null, hi: number | null): string => (lo === null || hi === null ? '–' : `${f(lo)}–${f(hi)}`);
  const table = (title: string, cells: Record<string, Cell>): string[] => [
    `| ${title} | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |`, '|---|---|---|---|---|---|---|',
    ...Object.entries(cells).map(([k, c]) => `| ${SHARE_LABEL[k] ?? k} | ${c.decks} | ${c.deckGames} | ${c.decisive} | ${f(c.wr)} | ${iv(c.bootLo, c.bootHi)} | ${iv(c.wilsonLo, c.wilsonHi)} |`), '',
  ];
  const out = ['# Deck census: win rate across the colour spectrum (D447)', '',
    `${doc.games} games, ${doc.decks} decks${doc.pilots ? `, pilots ${doc.pilots.join(' + ')}` : ''}${doc.dropped && (doc.dropped.rows || doc.dropped.decks) ? ` (${doc.dropped.rows} duplicate game rows and ${doc.dropped.decks} duplicate deck lines left out)` : ''}; bootstrap ${doc.options.boot} replicates (seed ${doc.options.bootSeed}), clustered by deck. Bins are the realised profiles, read after the games; no bin is a verdict, and any difference is a candidate until it holds on fresh seeds. Every rate is as Forge's AI plays it.`, ''];
  for (const [band, b] of Object.entries(doc.bands)) {
    out.push(`## ${band}`, '', `${b.games} games (${b.decisive} decisive, ${b.draws} drawn, ${b.timeouts} timeouts, ${b.engineErrors} engine errors); ${b.decks} decks, deck-games min ${b.deckGamesMin ?? '–'}, median ${b.deckGamesMedian ?? '–'}; the first player won ${f(b.firstPlayerWinRate)} of ${b.firstPlayerDecisive}.`, '');
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
    const file = path.resolve(repo, d, 'decks.jsonl');
    for (const l of fileLines(file, { complete: true })) if (l) decks.push(JSON.parse(l) as DeckRecord);
  }
  const rows: GameRowOut[] = [];
  for (const g of gamesDirs) {
    const dir = path.resolve(repo, g);
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
  const out = path.resolve(repo, outArg);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'spectrum.json'), `${strictJson(doc)}\n`);
  fs.writeFileSync(path.join(out, 'spectrum.md'), spectrumMd(doc));
  fs.writeFileSync(path.join(out, 'cards.tsv'), cardsTsv(cards));
  say(`census-read: ${doc.games} game(s), ${doc.decks} deck(s)${dd.dropped.rows || dd.dropped.decks ? ` (${dd.dropped.rows} duplicate row(s), ${dd.dropped.decks} duplicate deck(s) dropped)` : ''}, pilots ${dd.pilots.join(' + ') || '-'}, ${Object.keys(doc.bands).join(', ')}; ${cards.length} card row(s) -> ${path.relative(repo, out) || '.'}/spectrum.json, spectrum.md, cards.tsv`);
  return 0;
}
