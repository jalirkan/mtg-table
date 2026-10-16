// mtg-table — the cube lab: `report <out>`, a run's numbers as HTML and Markdown.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `aggregate()` is pure — run.json, cards.json, drafts.jsonl and recordings.json
// in, one Summary out — and web/test/cubelab.test.ts holds it to a golden file
// over fixtures/cubelab/mini/.  `renderHtml()` writes ONE self-contained page:
// inline CSS, a few lines of inline script to sort the card table, inline SVG
// for the bars, and no URL that loads anything.  `renderMarkdown()` is the same
// headline numbers as text.
//
// What a number means:
//  - a WIN RATE is over decisive games (a draw — a timeout, or an engine error —
//    counts in neither column and is reported on its own), with Wilson's 95%
//    interval; with a handful of games the interval is the finding;
//  - a deck's PAIR is its two main colours (a splash is counted in its own
//    column); a deck Forge's builder made is keyed by its colours as Forge built
//    them;
//  - a deck's PRIMARY THEME is the theme most of its spells carry, when at least
//    `PRIMARY_MIN` do (else "none");
//  - per card: DEALT is the drafts it took part in (grid: the 162 laid out;
//    Winston: the 90 of the stack, every one of which ends in a pool), PICK
//    RATE is picked / dealt, DECK RATE is in a played deck / picked, and WIN %
//    IN DECK is the decisive games of the decks that played it.

import type { DraftRecord, RunMeta } from './run.ts';
import { shapeTableMd, type ShapeInterval } from './shape-measures.ts';

export const PRIMARY_MIN = 5;
const Z = 1.96;

export interface CardInfo { section: string; colors: string; cmc: number; land: boolean; themes: string[]; rating: number; remAIDeck: boolean; type: string; /** D446: card flow (cardflow.ts), written only when the run had shapes on. */ flow?: true }

export interface Recording { seed: number; file: string; seat: 'A'; decks: [string, string]; ok: boolean; ms: number }

export interface Rate { wins: number; losses: number; draws: number; rate: number | null; lo: number | null; hi: number | null }

export interface GroupRow extends Rate { key: string; label: string; decks: number; matchWins: number; matches: number; splashed: number }

export interface CardRow {
  name: string; section: string; colors: string; rating: number; remAIDeck: boolean;
  dealt: number; picked: number; pickRate: number | null; avgPick: number | null;
  inDeck: number; deckRate: number | null; games: Rate;
}

export interface Summary {
  run: Pick<RunMeta, 'cube' | 'cubeFile' | 'format' | 'seed' | 'drafts' | 'games' | 'profiles' | 'builder' | 'ratingsFile' | 'gameTimeoutSec'>;
  totals: {
    drafts: number; matches: number; games: number; decisive: number; draws: number; timeouts: number;
    engineErrors: number; avgTurns: number | null; avgGameSec: number | null; avgMatchSec: number | null;
    onPlay: Rate; labDecks: number; forgeDecks: number; stretched: number; splashed: number;
    labSpells: number | null; forgeSpells: number | null; forgeSameColours: number | null;
  };
  byPair: GroupRow[];
  byTheme: GroupRow[];
  cards: CardRow[];
  neverPlayed: Array<{ name: string; dealt: number; picked: number }>;
  curves: Array<{ key: string; decks: number; curve: number[]; avgCmc: number }>;
  samples: Array<{ key: string; seed: number; seat: 'A' | 'B'; record: string; colors: string; splash: string | null; theme: string; main: Array<[number, string]>; file: string | null }>;
  recordings: Recording[];
  /** D446: the shape measures (shape-measures.ts; cli.ts's report adds them), present only when the run had shapes on. */
  shapes?: { table: Record<string, ShapeInterval>; flowOn: boolean; boot: number; bootSeed: number; minPairGames: number };
}

export function wilson(wins: number, n: number): { lo: number | null; hi: number | null } {
  if (n === 0) return { lo: null, hi: null };
  const p = wins / n;
  const d = 1 + (Z * Z) / n;
  const c = (p + (Z * Z) / (2 * n)) / d;
  const h = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / d;
  return { lo: r3(Math.max(0, c - h)), hi: r3(Math.min(1, c + h)) };
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const r2 = (x: number): number => Math.round(x * 100) / 100;

function rate(wins: number, losses: number, draws: number): Rate {
  const n = wins + losses;
  return { wins, losses, draws, rate: n ? r3(wins / n) : null, ...wilson(wins, n) };
}

interface Acc { wins: number; losses: number; draws: number; decks: number; matchWins: number; matches: number; splashed: number }
const acc = (): Acc => ({ wins: 0, losses: 0, draws: 0, decks: 0, matchWins: 0, matches: 0, splashed: 0 });

/** The deck a drafter actually played: its colours, splash, primary theme and main list. */
export function playedDeck(rec: DraftRecord, k: 0 | 1, cards: Record<string, CardInfo>): { key: string; splash: string | null; theme: string; main: Array<[number, string]>; source: 'lab' | 'forge'; spells: number } {
  const dr = rec.drafters[k];
  const forge = dr.forge;
  if (dr.played !== 'forge' && dr.deck) {
    const t = dr.deck.themes[0];
    return { key: dr.deck.colors, splash: dr.deck.splash, theme: t && t[1] >= PRIMARY_MIN ? t[0] : 'none', main: dr.deck.main, source: 'lab', spells: dr.deck.spells };
  }
  const main = forge?.main ?? [];
  const tc = new Map<string, number>();
  for (const [n, name] of main) for (const t of cards[name]?.themes ?? []) tc.set(t, (tc.get(t) ?? 0) + n);
  const best = [...tc.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  return { key: forge?.colors || '?', splash: null, theme: best && best[1] >= PRIMARY_MIN ? best[0] : 'none', main, source: 'forge', spells: forge?.spells ?? 0 };
}

export function aggregate(meta: RunMeta, cards: Record<string, CardInfo>, recs: DraftRecord[], recordings: Recording[],
  names: { pairs: Record<string, string>; themes: Record<string, string> }): Summary {
  recs = [...recs].sort((a, b) => a.seed - b.seed);
  const pairs = new Map<string, Acc>();
  const themes = new Map<string, Acc>();
  const card = new Map<string, { dealt: number; picked: number; pickPos: number[]; inDeck: number; w: number; l: number; d: number }>();
  const cardOf = (n: string) => {
    let c = card.get(n);
    if (!c) { c = { dealt: 0, picked: 0, pickPos: [], inDeck: 0, w: 0, l: 0, d: 0 }; card.set(n, c); }
    return c;
  };
  for (const n of Object.keys(cards)) cardOf(n);
  const curves = new Map<string, { n: number; curve: number[]; cmc: number; spells: number }>();
  const best = new Map<string, { gw: number; rec: DraftRecord; k: 0 | 1 }>();
  let games = 0, decisive = 0, draws = 0, timeouts = 0, engineErrors = 0, turns = 0, turnN = 0, gameMs = 0, matchMs = 0;
  let playW = 0, playL = 0, playD = 0, labDecks = 0, forgeDecks = 0, stretched = 0, splashed = 0;
  let labSpells = 0, labN = 0, forgeSpells = 0, forgeN = 0, same = 0, sameN = 0;

  for (const rec of recs) {
    if (rec.match.engineError) engineErrors++;
    matchMs += rec.ms.match;
    // dealt / picked
    const seenHere = new Set<string>();
    for (const dr of rec.drafters) for (const p of dr.picks) for (const n of p.seen) seenHere.add(n);
    for (const dr of rec.drafters) for (const n of dr.pool) seenHere.add(n);
    // Grid: the first drafter sees all nine cards of every grid.  Winston: every
    // card of the stack ends in a pool.  So seen-or-picked IS the dealt set.
    for (const n of seenHere) cardOf(n).dealt++;
    for (const dr of rec.drafters) {
      let pos = 0;
      for (const p of dr.picks) for (const n of p.took) { pos++; cardOf(n).picked++; cardOf(n).pickPos.push(pos); }
    }
    for (const k of [0, 1] as const) {
      const pd = playedDeck(rec, k, cards);
      const me = k === 0 ? 'A' : 'B';
      let w = 0, l = 0, d = 0;
      for (const g of rec.match.games) {
        if (g.winner === 'draw') d++;
        else if (g.winner === me) w++;
        else l++;
      }
      const mw = me === 'A' ? rec.match.winsA > rec.match.winsB : rec.match.winsB > rec.match.winsA;
      const matched = rec.match.games.length > 0;
      for (const [map, key] of [[pairs, pd.key], [themes, pd.theme]] as const) {
        const a = map.get(key) ?? acc();
        a.wins += w; a.losses += l; a.draws += d; a.decks++;
        if (matched) { a.matches++; if (mw) a.matchWins++; }
        if (pd.splash) a.splashed++;
        map.set(key, a);
      }
      if (pd.source === 'lab') { labDecks++; labSpells += pd.spells; labN++; } else forgeDecks++;
      if (rec.drafters[k].deck?.stretched) stretched++;
      if (pd.splash) splashed++;
      const fb = rec.drafters[k].forge;
      if (fb?.spells !== undefined) { forgeSpells += fb.spells; forgeN++; }
      if (fb?.colors && rec.drafters[k].deck) { sameN++; if (fb.colors === rec.drafters[k].deck?.colors) same++; }
      for (const [n, name] of pd.main) {
        const info = cards[name];
        if (!info || info.land) continue;
        const c = cardOf(name);
        c.inDeck++;
        c.w += w; c.l += l; c.d += d;
        const cv = curves.get(pd.key) ?? { n: 0, curve: [0, 0, 0, 0, 0, 0], cmc: 0, spells: 0 };
        const b = Math.min(5, Math.max(0, info.cmc - 1));
        cv.curve[b] = (cv.curve[b] ?? 0) + n;
        cv.cmc += info.cmc * n; cv.spells += n;
        curves.set(pd.key, cv);
      }
      const cv = curves.get(pd.key);
      if (cv) cv.n++;
      const prev = best.get(pd.key);
      if (!prev || w > prev.gw) best.set(pd.key, { gw: w, rec, k });
    }
    for (const g of rec.match.games) {
      games++;
      if (g.timeout) timeouts++;
      if (g.winner === 'draw') { draws++; playD++; continue; }
      decisive++;
      if (g.winner === g.onPlay) playW++; else playL++;
      turns += g.turns; turnN++;
      gameMs += g.ms;
    }
  }
  const groupRows = (m: Map<string, Acc>, label: (k: string) => string): GroupRow[] =>
    [...m.entries()].map(([key, a]) => ({ key, label: label(key), decks: a.decks, matchWins: a.matchWins, matches: a.matches, splashed: a.splashed, ...rate(a.wins, a.losses, a.draws) }))
      .sort((x, y) => (y.rate ?? -1) - (x.rate ?? -1) || y.decks - x.decks || (x.key < y.key ? -1 : 1));
  const cardRows: CardRow[] = [...card.entries()].map(([name, c]) => {
    const info = cards[name];
    return {
      name, section: info?.section ?? '', colors: info?.colors ?? '', rating: info?.rating ?? 0, remAIDeck: info?.remAIDeck ?? false,
      dealt: c.dealt, picked: c.picked, pickRate: c.dealt ? r3(c.picked / c.dealt) : null,
      avgPick: c.pickPos.length ? r2(c.pickPos.reduce((s, x) => s + x, 0) / c.pickPos.length) : null,
      inDeck: c.inDeck, deckRate: c.picked ? r3(c.inDeck / c.picked) : null, games: rate(c.w, c.l, c.d),
    };
  }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const lands = new Set(Object.entries(cards).filter(([, i]) => i.land).map(([n]) => n));
  const samplesKeys = groupRows(pairs, (k) => k).filter((g) => g.decks >= 2 && g.key !== '?').slice(0, 3).map((g) => g.key);
  return {
    run: { cube: meta.cube, cubeFile: meta.cubeFile, format: meta.format, seed: meta.seed, drafts: meta.drafts, games: meta.games, profiles: meta.profiles, builder: meta.builder, ratingsFile: meta.ratingsFile, gameTimeoutSec: meta.gameTimeoutSec },
    totals: {
      drafts: recs.length, matches: recs.filter((r) => r.match.games.length > 0).length, games, decisive, draws, timeouts, engineErrors,
      avgTurns: turnN ? r2(turns / turnN) : null, avgGameSec: decisive ? r2(gameMs / decisive / 1000) : null,
      avgMatchSec: recs.length ? r2(matchMs / recs.length / 1000) : null,
      onPlay: rate(playW, playL, playD), labDecks, forgeDecks, stretched, splashed,
      labSpells: labN ? r2(labSpells / labN) : null, forgeSpells: forgeN ? r2(forgeSpells / forgeN) : null,
      forgeSameColours: sameN ? r3(same / sameN) : null,
    },
    byPair: groupRows(pairs, (k) => names.pairs[k] ?? k),
    byTheme: groupRows(themes, (k) => names.themes[k] ?? k),
    cards: cardRows,
    neverPlayed: cardRows.filter((c) => c.inDeck === 0 && !lands.has(c.name)).map((c) => ({ name: c.name, dealt: c.dealt, picked: c.picked })),
    curves: [...curves.entries()].map(([key, v]) => ({ key, decks: v.n, curve: v.curve.map((x) => r2(x / Math.max(1, v.n))), avgCmc: v.spells ? r2(v.cmc / v.spells) : 0 }))
      .sort((a, b) => b.decks - a.decks || (a.key < b.key ? -1 : 1)),
    samples: samplesKeys.map((key) => {
      const b = best.get(key) as { gw: number; rec: DraftRecord; k: 0 | 1 };
      const pd = playedDeck(b.rec, b.k, cards);
      const dr = b.rec.drafters[b.k];
      const me = b.k === 0 ? 'A' : 'B';
      const mine = me === 'A' ? b.rec.match.winsA : b.rec.match.winsB;
      const theirs = me === 'A' ? b.rec.match.winsB : b.rec.match.winsA;
      return { key, seed: b.rec.seed, seat: me, record: `${mine}-${theirs}`, colors: pd.key, splash: pd.splash, theme: pd.theme, main: pd.main, file: pd.source === 'lab' ? dr.deckFile : dr.forgeDeckFile };
    }),
    recordings,
  };
}

// ---------------------------------------------------------------- rendering

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (x: number | null): string => (x === null ? '–' : `${Math.round(x * 100)}%`);
const ci = (r: Rate): string => (r.lo === null || r.hi === null ? '' : `${pct(r.lo)}–${pct(r.hi)}`);

function bar(r: Rate): string {
  if (r.rate === null || r.lo === null || r.hi === null) return '';
  const W = 160;
  const x = (v: number): number => Math.round(v * W * 10) / 10;
  return `<svg class="bar" width="${W}" height="14" viewBox="0 0 ${W} 14" role="img" aria-label="${pct(r.rate)} (95% CI ${ci(r)})">`
    + `<rect x="0" y="6" width="${W}" height="2" class="track"/><line x1="${x(0.5)}" x2="${x(0.5)}" y1="1" y2="13" class="mid"/>`
    + `<rect x="${x(r.lo)}" y="3" width="${Math.max(1, x(r.hi) - x(r.lo))}" height="8" rx="2" class="ci"/>`
    + `<circle cx="${x(r.rate)}" cy="7" r="3.5" class="pt"/></svg>`;
}

function groupTable(rows: GroupRow[], what: string): string {
  return `<table><thead><tr><th>${what}</th><th>decks</th><th>matches won</th><th>games W–L–D</th><th>game win %</th><th>95% CI</th><th></th><th>splashed</th></tr></thead><tbody>`
    + rows.map((g) => `<tr><td><b>${esc(g.key)}</b> <span class="dim">${esc(g.label === g.key ? '' : g.label)}</span></td><td>${g.decks}</td><td>${g.matchWins}/${g.matches}</td>`
      + `<td>${g.wins}–${g.losses}–${g.draws}</td><td>${pct(g.rate)}</td><td class="dim">${ci(g)}</td><td>${bar(g)}</td><td>${g.splashed}</td></tr>`).join('')
    + '</tbody></table>';
}

export function renderHtml(s: Summary): string {
  const t = s.totals;
  const cardsRows = s.cards.map((c) => `<tr><td>${esc(c.name)}${c.remAIDeck ? ' <span class="tag" title="Forge: AI:RemAIDeck — its AI plays this poorly">AI?</span>' : ''}</td><td>${esc(c.section)}</td><td>${c.rating}</td>`
    + `<td>${c.dealt}</td><td>${c.picked}</td><td data-v="${c.pickRate ?? -1}">${pct(c.pickRate)}</td><td data-v="${c.avgPick ?? 999}">${c.avgPick ?? '–'}</td>`
    + `<td>${c.inDeck}</td><td data-v="${c.deckRate ?? -1}">${pct(c.deckRate)}</td><td>${c.games.wins}–${c.games.losses}</td>`
    + `<td data-v="${c.games.rate ?? -1}">${pct(c.games.rate)}</td><td class="dim">${ci(c.games)}</td></tr>`).join('');
  const curveRows = s.curves.map((c) => `<tr><td><b>${esc(c.key)}</b></td><td>${c.decks}</td>${c.curve.map((x) => `<td>${x}</td>`).join('')}<td>${c.avgCmc}</td></tr>`).join('');
  const samples = s.samples.map((d) => `<div class="deck"><h3>${esc(d.colors)}${d.splash ? `+${esc(d.splash.toLowerCase())}` : ''} · ${esc(d.theme)} · seed ${d.seed} drafter ${d.seat}, ${d.record}</h3>`
    + `<p class="dim">${d.file ? `<code>${esc(d.file)}</code>` : ''}</p><ul>${d.main.map(([n, name]) => `<li>${n} ${esc(name)}</li>`).join('')}</ul></div>`).join('');
  const recs = s.recordings.length === 0 ? '<p class="dim">None recorded (pass <code>--record M</code> to <code>run</code>).</p>'
    : `<p>Open <a href="https://jalirkan.github.io/ForgeCoach/">ForgeCoach</a> (or a local build), choose <b>Load file</b>, and pick one of these files from this run's folder. Each is one game of the two drafted decks, from drafter A's seat (seat 0); the other hand stays hidden, as in every frame log.</p><ul>`
      + s.recordings.map((r) => `<li>${r.ok ? `<a href="${esc(r.file)}" download><code>${esc(r.file)}</code></a>` : `<code>${esc(r.file)}</code> — FAILED`} · seed ${r.seed} · ${esc(r.decks[0])} vs ${esc(r.decks[1])}</li>`).join('') + '</ul>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cube lab report</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1f;--dim:#6b6b70;--line:#dedbd3;--card:#fff;--acc:#2f6fb3;--ci:#9cc0e6}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececef;--dim:#9a9aa2;--line:#2c2c31;--card:#1c1c20;--acc:#7fb2ea;--ci:#2f4f73}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px 16px}
main{max-width:1180px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
h3{font-size:14px;margin:0 0 4px}.dim{color:var(--dim)}table{border-collapse:collapse;width:100%;background:var(--card);font-variant-numeric:tabular-nums}
th,td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{font-weight:600;cursor:default}
#cards th{cursor:pointer}.wrap{overflow-x:auto}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 10px}.kpi b{display:block;font-size:20px}
.bar .track{fill:var(--line)}.bar .mid{stroke:var(--dim);stroke-dasharray:2 2}.bar .ci{fill:var(--ci)}.bar .pt{fill:var(--acc)}
.decks{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.deck{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:10px}
.deck ul{columns:2;margin:6px 0 0;padding-left:18px;font-size:13px}.tag{font-size:11px;border:1px solid var(--dim);border-radius:3px;padding:0 3px;color:var(--dim)}
a{color:var(--acc)}code{font-size:12px}
</style></head><body><main>
<h1>${esc(s.run.cube)}</h1>
<p class="dim">${esc(s.run.format)} draft · ${t.drafts} drafts from seed ${s.run.seed} · best of ${s.run.games} · AI ${esc(s.run.profiles.join(' vs '))} · builder ${esc(s.run.builder)} · ratings ${esc(s.run.ratingsFile ?? 'Forge ranks')} · <code>${esc(s.run.cubeFile)}</code></p>
<div class="kpis">
<div class="kpi"><b>${t.games}</b>games (${t.decisive} decisive)</div>
<div class="kpi"><b>${t.draws}</b>draws (${t.timeouts} timeouts)</div>
<div class="kpi"><b>${t.engineErrors}</b>engine errors</div>
<div class="kpi"><b>${t.avgTurns ?? '–'}</b>turns a game</div>
<div class="kpi"><b>${pct(t.onPlay.rate)}</b>on the play wins (${ci(t.onPlay)})</div>
<div class="kpi"><b>${t.avgMatchSec ?? '–'} s</b>per match (wall)</div>
<div class="kpi"><b>${t.labDecks}/${t.labDecks + t.forgeDecks}</b>lab-built decks (${t.splashed} splash, ${t.stretched} stretched for a thin pool)</div>
<div class="kpi"><b>${t.labSpells ?? '–'} / ${t.forgeSpells ?? '–'}</b>spells: lab / Forge builder (same colours ${pct(t.forgeSameColours)})</div>
</div>
<h2>Win rate by colour pair</h2><div class="wrap">${groupTable(s.byPair, 'pair')}</div>
<h2>Win rate by primary theme</h2><p class="dim">The theme most of a deck's spells carry, when at least ${PRIMARY_MIN} do.</p><div class="wrap">${groupTable(s.byTheme, 'theme')}</div>
<h2>Average curve by pair</h2><div class="wrap"><table><thead><tr><th>pair</th><th>decks</th><th>0–1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6+</th><th>avg MV</th></tr></thead><tbody>${curveRows}</tbody></table></div>
<h2>Sample decks of the top pairs</h2><p class="dim">For each of the three best pairs with two or more decks, the deck of that pair that won the most games.</p><div class="decks">${samples}</div>
${s.shapes ? `<h2>Shapes (D446)</h2><p class="dim">${s.shapes.boot} draft-clustered bootstrap replicates (seed ${s.shapes.bootSeed}); colour counts and combinations need ${s.shapes.minPairGames}+ decisive matches or games.</p><pre>${esc(shapeTableMd(s.shapes.table, s.shapes.flowOn).join('\n'))}</pre>` : ''}
<h2>Cards</h2><p class="dim">${s.run.format === 'winston' ? 'Winston deals every stack card into a pool, so pick % is 100% by construction; avg pick # says how early a card went. ' : ''}Click a heading to sort. Win % in deck is over the decisive games of the decks that played the card. <span class="tag">AI?</span> = Forge marks it AI:RemAIDeck (its AI plays it poorly).</p>
<div class="wrap"><table id="cards"><thead><tr><th>card</th><th>section</th><th>rating</th><th>dealt</th><th>picked</th><th>pick %</th><th>avg pick #</th><th>in deck</th><th>deck %</th><th>W–L</th><th>win % in deck</th><th>95% CI</th></tr></thead><tbody>${cardsRows}</tbody></table></div>
<h2>Never played</h2><p>${s.neverPlayed.length === 0 ? '<span class="dim">Every nonland card made a deck at least once.</span>' : s.neverPlayed.map((c) => `${esc(c.name)} <span class="dim">(picked ${c.picked}/${c.dealt})</span>`).join(' · ')}</p>
<h2>Recorded games</h2>${recs}
<p class="dim">Made by <code>tools/cubelab.sh report</code> (mtg-table, GPL-3.0-or-later). Card names are Wizards of the Coast's; rankings and rules are Forge's.</p>
</main>
<script>
(function(){var t=document.getElementById('cards');if(!t)return;var hs=t.tHead.rows[0].cells;var dir={};
for(var i=0;i<hs.length;i++)(function(i){hs[i].onclick=function(){var b=t.tBodies[0];var rows=[].slice.call(b.rows);dir[i]=!dir[i];
rows.sort(function(a,c){var x=a.cells[i],y=c.cells[i];var vx=x.dataset.v!==undefined?+x.dataset.v:(isNaN(+x.textContent)?x.textContent:+x.textContent);
var vy=y.dataset.v!==undefined?+y.dataset.v:(isNaN(+y.textContent)?y.textContent:+y.textContent);return (vx<vy?-1:vx>vy?1:0)*(dir[i]?-1:1);});
rows.forEach(function(r){b.appendChild(r);});};})(i);})();
</script></body></html>
`;
}

export function renderMarkdown(s: Summary, minGames = 6): string {
  const t = s.totals;
  const L: string[] = [];
  L.push(`# Cube lab: ${s.run.cube}`, '');
  L.push(`${s.run.format} draft, ${t.drafts} drafts from seed ${s.run.seed}, best of ${s.run.games}, AI ${s.run.profiles.join(' vs ')}, builder ${s.run.builder}, ratings ${s.run.ratingsFile ?? 'Forge ranks'}.`, '');
  L.push(`- ${t.games} games, ${t.decisive} decisive, ${t.draws} draws (${t.timeouts} timeouts), ${t.engineErrors} engine errors; ${t.avgTurns ?? '–'} turns and ${t.avgGameSec ?? '–'} s a game, ${t.avgMatchSec ?? '–'} s a match.`);
  L.push(`- On the play: ${pct(t.onPlay.rate)} (95% CI ${ci(t.onPlay)}).`);
  L.push(`- Decks: ${t.labDecks} lab-built, ${t.forgeDecks} Forge-built; ${t.splashed} splash, ${t.stretched} stretched for a thin pool (wide splash, 18 lands or three colours). Spells per deck: lab ${t.labSpells ?? '–'}, Forge's builder ${t.forgeSpells ?? '–'} (same colours as the lab ${pct(t.forgeSameColours)}).`, '');
  const grp = (title: string, rows: GroupRow[]): void => {
    L.push(`## ${title}`, '', '| key | decks | matches won | games W–L–D | win % | 95% CI |', '|---|---|---|---|---|---|');
    for (const g of rows) L.push(`| ${g.key}${g.label !== g.key ? ` (${g.label})` : ''} | ${g.decks} | ${g.matchWins}/${g.matches} | ${g.wins}–${g.losses}–${g.draws} | ${pct(g.rate)} | ${ci(g)} |`);
    L.push('');
  };
  grp('By colour pair', s.byPair);
  grp('By primary theme', s.byTheme);
  const played = s.cards.filter((c) => c.games.wins + c.games.losses >= minGames);
  const byRate = [...played].sort((a, b) => (b.games.rate ?? 0) - (a.games.rate ?? 0));
  L.push(`## Cards by win % in deck (at least ${minGames} decisive games)`, '');
  if (s.run.format === 'winston') L.push('Winston deals every stack card into a pool, so pick % is 100% by construction (avg pick # is in the HTML).', '');
  L.push('| card | in deck | W–L | win % | 95% CI | pick % |', '|---|---|---|---|---|---|');
  const row = (c: CardRow): string => `| ${c.name} | ${c.inDeck} | ${c.games.wins}–${c.games.losses} | ${pct(c.games.rate)} | ${ci(c.games)} | ${pct(c.pickRate)} |`;
  for (const c of byRate.slice(0, 12)) L.push(row(c));
  if (byRate.length > 24) L.push('| … | | | | | |');
  for (const c of byRate.slice(Math.max(12, byRate.length - 12))) L.push(row(c));
  L.push('', `## Never played (${s.neverPlayed.length})`, '', s.neverPlayed.map((c) => c.name).join(', ') || '(none)', '');
  if (s.shapes) {
    L.push('## Shapes (D446)', '', `${s.shapes.boot} draft-clustered bootstrap replicates (seed ${s.shapes.bootSeed}); colour counts and combinations need ${s.shapes.minPairGames}+ decisive matches or games.`, '');
    L.push(...shapeTableMd(s.shapes.table, s.shapes.flowOn), '');
  }
  L.push('## Recorded games', '');
  if (s.recordings.length === 0) L.push('(none)');
  else {
    L.push('Open ForgeCoach, choose **Load file**, and pick a file below from this run folder (drafter A\'s seat).', '');
    for (const r of s.recordings) L.push(`- \`${r.file}\`${r.ok ? '' : ' (FAILED)'}: seed ${r.seed}, ${r.decks[0]} vs ${r.decks[1]}`);
  }
  L.push('');
  return L.join('\n');
}
