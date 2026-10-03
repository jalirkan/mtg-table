// mtg-table — the AI ladder: ladder.json (schema version 1) and the HTML report.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `buildLadder()` is pure: the players, every game record, the SPRT and tuner
// logs and the league state in, one LadderDoc out.  `renderHtml()` writes ONE
// self-contained page in the cube lab's house style (inline CSS and SVG, a few
// lines of inline script for hover, no URL that loads anything).
//
// ladder.json, schema version 1 — ForgeCoach's contract (D318).  A field may be
// ADDED in version 1; renaming, removing or redefining one is version 2 and a
// change on ForgeCoach's side in the same breath (D297's rule for meta.json).
//
//   schema        "mtg-table/ai-ladder"
//   version       1
//   generatedAt   ISO time
//   anchor        { name: "forge-default", rating: 1500 }
//   scale         "elo": P(A beats B) = 1/(1+10^((Rb−Ra)/400))
//   ci            "hessian" | "bootstrap:<samples>" — how lo/hi were computed (95%)
//   totals        { games, decisive, draws, hosts: [..], first, last }
//   players[]     sorted by rating, best first; one per registered player
//                 (unavailable ones too) and one per unregistered config that
//                 has games (name "<name>@<hash>", registered: false):
//     name, kind, params (defaults filled), hash, anchor, registered,
//     available (bool), unavailable (reason or null),
//     rating, lo, hi (95%), rated (false = no decisive game: the prior),
//     games (decisive), wins, losses, draws,
//     vsAnchor { wins, losses, rate, lo, hi } | null   (head-to-head vs forge-default, Wilson 95%)
//   history[]     { at, run, games, ratings: { <name>: [rating, lo, hi] } }
//                 — the fit after each ladder run, cumulative, at most 60 points
//   sprt[]        newest first: { at, id, a, b, elo0, elo1, alpha, beta,
//                 result: "H1"|"H0"|"inconclusive"|"stopped", llr, lower, upper,
//                 games, pairs, score, purpose: "sprt"|"league" }
//   tune[]        newest first: { at, id, base, vary, pool, eta, games,
//                 winner: { label, params, hash, registeredAs },
//                 rounds: [{ round, blocks, standings: [{ label, wins, losses, score }] }] }
//   league        { best, pool: [..], promoted: [{ name, at, reason }] } | null
//   set           the deck-pair file the ratings are on ("tools/ai-bench/pairs-confirm.txt"), or "all"
//   experiments[] newest first: { at, id, cmd, purpose: pilot|dev|confirm,
//                 status: finished|stopped|failed|abandoned|running?, sha, dirty, set, hypothesis, games|null }
//
// Numbers are rounded: ratings to 0.1, rates to 0.001.

import type { Player } from './registry.ts';
import { ANCHOR } from './registry.ts';
import { bootstrap, fit, type Fit } from './rating.ts';
import { hashIndex, identity, outcomes, type GameRecord } from './results.ts';
import type { ExpRow } from './experiments.ts';
import type { LeagueState } from './league.ts';

export interface SprtLog {
  v: 1; at: string; id: string; host: string; a: string; b: string; ah: string; bh: string;
  elo0: number; elo1: number; alpha: number; beta: number;
  result: 'H1' | 'H0' | 'inconclusive' | 'stopped'; llr: number; lower: number; upper: number;
  games: number; pairs: number; score: number; purpose: 'sprt' | 'league';
}

export interface TuneLog {
  v: 1; at: string; id: string; host: string; base: string; vary: Record<string, Array<string | number>>; pool: string[];
  eta: number; games: number;
  winner: { label: string; params: Record<string, string | number>; hash: string; registeredAs: string };
  rounds: Array<{ round: number; blocks: number; standings: Array<{ label: string; wins: number; losses: number; score: number }> }>;
}

export interface LadderPlayer {
  name: string; kind: string; params: Record<string, string | number>; hash: string; anchor: boolean; registered: boolean;
  available: boolean; unavailable: string | null;
  rating: number; lo: number; hi: number; rated: boolean;
  games: number; wins: number; losses: number; draws: number;
  vsAnchor: { wins: number; losses: number; rate: number; lo: number; hi: number } | null;
}

export interface LadderDoc {
  schema: 'mtg-table/ai-ladder';
  version: 1;
  generatedAt: string;
  anchor: { name: string; rating: number };
  scale: 'elo';
  ci: string;
  totals: { games: number; decisive: number; draws: number; hosts: string[]; first: string | null; last: string | null };
  players: LadderPlayer[];
  history: Array<{ at: string; run: string; games: number; ratings: Record<string, [number, number, number]> }>;
  sprt: SprtLog[];
  tune: TuneLog[];
  league: { best: string; pool: string[]; promoted: Array<{ name: string; at: string; reason: string }> } | null;
  /** Added in schema 1: the deck-pair file the ratings are fitted on, or "all". */
  set: string;
  /** Added in schema 1: the committed experiment log, newest first (docs/evidence/experiments.jsonl). */
  experiments: Array<{ at: string; id: string; cmd: string; purpose: string; status: string; sha: string; dirty: boolean; set: string; hypothesis: string; games: number | null }>;
}

const r1 = (x: number): number => Math.round(x * 10) / 10;
const r3 = (x: number): number => Math.round(x * 1000) / 1000;

export function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.959963984540054, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export interface BuildInput {
  players: Player[];
  recs: GameRecord[];
  sprt: SprtLog[];
  tune: TuneLog[];
  league: (LeagueState & { pool: string[] }) | null;
  /** The deck set the ratings are on (null = every set); `recs` must already be filtered to it. */
  ratingSet?: string | null;
  experiments?: ExpRow[];
  priorSd: number;
  bootstrap: number;
  now?: string;
  historyPoints?: number;
}

export function buildLadder(inp: BuildInput): LadderDoc {
  const byHash = hashIndex(inp.players);
  const names = inp.players.map((p) => p.name);
  const games = outcomes(inp.recs, byHash);
  const o = { anchor: ANCHOR, priorSd: inp.priorSd };
  let f: Fit = fit(names, games, o);
  if (inp.bootstrap > 0) f = bootstrap(f, names, games, o, inp.bootstrap);
  const draws = new Map<string, number>();
  const vs = new Map<string, { w: number; l: number }>();
  for (const r of inp.recs) {
    const a = identity(r.a, r.ah, byHash), b = identity(r.b, r.bh, byHash);
    if (r.w === 'd') { draws.set(a, (draws.get(a) ?? 0) + 1); draws.set(b, (draws.get(b) ?? 0) + 1); continue; }
    for (const [me, other, won] of [[a, b, r.w === 'a'], [b, a, r.w === 'b']] as Array<[string, string, boolean]>) {
      if (other !== ANCHOR || me === ANCHOR) continue;
      const t = vs.get(me) ?? { w: 0, l: 0 };
      if (won) t.w++; else t.l++;
      vs.set(me, t);
    }
  }
  const reg = new Map(inp.players.map((p) => [p.name, p]));
  const ps: LadderPlayer[] = [...f.ratings.values()].map((r) => {
    const p = reg.get(r.name);
    const at = r.name.lastIndexOf('@');
    const t = vs.get(r.name);
    const [lo, hi] = t ? wilson(t.w, t.w + t.l) : [0, 1];
    return {
      name: r.name, kind: p?.kind ?? '?', params: (p?.resolved ?? {}) as Record<string, string | number>,
      hash: p?.hash ?? (at > 0 ? r.name.slice(at + 1) : ''), anchor: !!p?.anchor, registered: !!p,
      available: !!p && !p.unavailable, unavailable: p ? p.unavailable : 'not in the registry',
      rating: r1(r.rating), lo: r1(r.lo), hi: r1(r.hi), rated: r.rated,
      games: r.games, wins: r.wins, losses: r.losses, draws: draws.get(r.name) ?? 0,
      vsAnchor: t && t.w + t.l > 0 ? { wins: t.w, losses: t.l, rate: r3(t.w / (t.w + t.l)), lo: r3(lo), hi: r3(hi) } : null,
    };
  }).filter((p) => p.registered || p.games > 0)
    .sort((x, y) => Number(y.rated) - Number(x.rated) || y.rating - x.rating || (x.name < y.name ? -1 : 1));
  // history: the cumulative fit at the end of each run (time order of the runs' last games)
  const runs: Array<{ run: string; at: string; upto: number }> = [];
  const sorted = [...inp.recs].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
  sorted.forEach((r, i) => {
    const last = runs[runs.length - 1];
    if (last && last.run === `${r.host}:${r.run}`) { last.at = r.at; last.upto = i + 1; } else runs.push({ run: `${r.host}:${r.run}`, at: r.at, upto: i + 1 });
  });
  const pts = inp.historyPoints ?? 60;
  const pick = runs.length <= pts ? runs : Array.from({ length: pts }, (_, k) => runs[Math.round((k * (runs.length - 1)) / (pts - 1))]!);
  const history = pick.map((h) => {
    const g = outcomes(sorted.slice(0, h.upto), byHash);
    const hf = fit(names, g, o);
    const ratings: Record<string, [number, number, number]> = {};
    for (const [n, v] of hf.ratings) if (reg.has(n) && v.rated) ratings[n] = [r1(v.rating), r1(v.lo), r1(v.hi)];
    return { at: h.at, run: h.run, games: g.length, ratings };
  });
  const decisive = games.length;
  return {
    schema: 'mtg-table/ai-ladder',
    version: 1,
    generatedAt: inp.now ?? new Date().toISOString(),
    anchor: { name: ANCHOR, rating: 1500 },
    scale: 'elo',
    ci: inp.bootstrap > 0 ? `bootstrap:${inp.bootstrap}` : 'hessian',
    totals: {
      games: inp.recs.length, decisive, draws: inp.recs.length - decisive,
      hosts: [...new Set(inp.recs.map((r) => r.host))].sort(),
      first: sorted[0]?.at ?? null, last: sorted[sorted.length - 1]?.at ?? null,
    },
    players: ps,
    history,
    sprt: [...inp.sprt].reverse(),
    tune: [...inp.tune].reverse(),
    league: inp.league ? { best: inp.league.best, pool: inp.league.pool, promoted: inp.league.promoted.map((p) => ({ name: p.name, at: p.at, reason: p.reason })) } : null,
    set: inp.ratingSet ?? 'all',
    experiments: [...(inp.experiments ?? [])].reverse().map((e) => ({
      at: e.start.at, id: e.start.id, cmd: e.start.cmd, purpose: e.start.purpose, status: e.status, sha: e.start.git.sha.slice(0, 12),
      dirty: e.start.git.dirty, set: e.start.set, hypothesis: e.start.hypothesis, games: e.end ? e.end.games : null,
    })),
  };
}

// ---------------------------------------------------------------- rendering

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const SERIES = 8;

function chart(doc: LadderDoc): string {
  const named = doc.players.filter((p) => p.registered && p.rated).map((p) => p.name);
  const h = doc.history.filter((x) => Object.keys(x.ratings).length > 0);
  if (h.length === 0) return '<p class="dim">No games yet.</p>';
  if (h.length === 1) return '<p class="dim">One ladder run so far: the chart starts with the second.</p>';
  const W = 760, H = 300, L = 48, R = 150, T = 12, B = 28;
  let lo = Infinity, hi = -Infinity;
  for (const pt of h) for (const n of named) { const v = pt.ratings[n]; if (v) { lo = Math.min(lo, v[0]); hi = Math.max(hi, v[0]); } }
  lo = Math.floor((lo - 20) / 50) * 50; hi = Math.ceil((hi + 20) / 50) * 50;
  const x = (i: number): number => L + (i * (W - L - R)) / (h.length - 1);
  const y = (v: number): number => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const grid: string[] = [];
  for (let v = lo; v <= hi; v += 50) grid.push(`<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" class="tick" text-anchor="end">${v}</text>`);
  const lines = named.map((n, k) => {
    const cls = k < SERIES ? `s${k + 1}` : 'sx';
    const pts = h.map((pt, i) => (pt.ratings[n] ? [x(i), y(pt.ratings[n]![0])] : null)).filter((p): p is number[] => p !== null);
    if (pts.length === 0) return '';
    const last = pts[pts.length - 1]!;
    return `<polyline class="ln ${cls}" points="${pts.map((p) => `${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(' ')}"/>`
      + `<circle class="dot ${cls}" cx="${last[0]!.toFixed(1)}" cy="${last[1]!.toFixed(1)}" r="4"/>`
      + `<text class="lab" x="${(last[0]! + 8).toFixed(1)}" y="${(last[1]! + 4).toFixed(1)}">${esc(n)}</text>`;
  }).join('');
  const data = JSON.stringify(h.map((pt) => ({ at: pt.at.slice(0, 16).replace('T', ' '), games: pt.games, r: pt.ratings })));
  const legend = named.map((n, k) => `<span class="key"><i class="sw ${k < SERIES ? `s${k + 1}` : 'sx'}"></i>${esc(n)}</span>`).join('');
  return `<div class="legend">${legend}</div><div class="wrap chartbox"><svg id="hist" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Rating after each ladder run">`
    + grid.join('') + `<text x="${L}" y="${H - 6}" class="tick">${esc(h[0]!.at.slice(0, 10))}</text><text x="${W - R}" y="${H - 6}" class="tick" text-anchor="end">${esc(h[h.length - 1]!.at.slice(0, 10))}</text>`
    + `<line id="xh" class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>${lines}`
    + `<rect id="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg><div id="tip" class="tip" hidden></div></div>`
    + `<script>(function(){var d=${data.replace(/</g, '\\u003c')},s=document.getElementById('hist'),hit=document.getElementById('hit'),xh=document.getElementById('xh'),tip=document.getElementById('tip');`
    + `var L=${L},Wp=${W - L - R},n=d.length;hit.addEventListener('mousemove',function(e){var b=s.getBoundingClientRect(),sx=${W}/b.width,px=(e.clientX-b.left)*sx;`
    + `var i=Math.max(0,Math.min(n-1,Math.round((px-L)/Wp*(n-1))));var X=L+i*Wp/(n-1);xh.setAttribute('x1',X);xh.setAttribute('x2',X);xh.setAttribute('visibility','visible');`
    + `var r=d[i].r,ks=Object.keys(r).sort(function(a,c){return r[c][0]-r[a][0]});tip.hidden=false;tip.innerHTML='<b>'+d[i].at+'</b> · '+d[i].games+' decisive games<br>'+ks.map(function(k){return k+' <b>'+r[k][0].toFixed(0)+'</b> <span class=dim>('+r[k][1].toFixed(0)+'–'+r[k][2].toFixed(0)+')</span>'}).join('<br>');`
    + `tip.style.left=Math.min(b.width-220,(X/sx)+12)+'px';});hit.addEventListener('mouseleave',function(){tip.hidden=true;xh.setAttribute('visibility','hidden');});})();</script>`;
}

function ratingBar(p: LadderPlayer, lo: number, hi: number): string {
  if (!p.rated) return '';
  const Wd = 180;
  const x = (v: number): number => Math.round(((v - lo) / (hi - lo)) * Wd * 10) / 10;
  return `<svg class="bar" width="${Wd}" height="14" viewBox="0 0 ${Wd} 14" role="img" aria-label="${p.rating.toFixed(0)} (${p.lo.toFixed(0)}–${p.hi.toFixed(0)})">`
    + `<rect x="0" y="6" width="${Wd}" height="2" class="track"/><line x1="${x(1500)}" x2="${x(1500)}" y1="1" y2="13" class="mid"/>`
    + `<rect x="${x(Math.max(lo, p.lo))}" y="3" width="${Math.max(1, x(Math.min(hi, p.hi)) - x(Math.max(lo, p.lo)))}" height="8" rx="2" class="ci"/>`
    + `<circle cx="${x(p.rating)}" cy="7" r="3.5" class="pt"/></svg>`;
}

function expTable(doc: LadderDoc): string {
  if (doc.experiments.length === 0) return '<p class="dim">No experiments logged.</p>';
  return `<div class="wrap"><table><thead><tr><th>when</th><th>command</th><th>purpose</th><th>status</th><th>commit</th><th>set</th><th>games</th><th>hypothesis</th></tr></thead><tbody>`
    + doc.experiments.slice(0, 40).map((e) => `<tr><td class="dim">${esc(e.at.slice(0, 16).replace('T', ' '))}</td><td>${esc(e.cmd)}</td><td>${esc(e.purpose)}</td><td>${esc(e.status)}</td><td><code>${esc(e.sha.slice(0, 8))}${e.dirty ? '+' : ''}</code></td><td class="dim wr">${esc(e.set.replace(/^tools\/ai-bench\//, ''))}</td><td>${e.games ?? '–'}</td><td style="white-space:normal;min-width:280px">${esc(e.hypothesis)}</td></tr>`).join('')
    + '</tbody></table></div>';
}

export function renderHtml(doc: LadderDoc): string {
  const rated = doc.players.filter((p) => p.rated);
  const lo = Math.floor((Math.min(1500, ...rated.map((p) => p.lo)) - 10) / 50) * 50;
  const hi = Math.ceil((Math.max(1500, ...rated.map((p) => p.hi)) + 10) / 50) * 50;
  const rows = doc.players.map((p) => {
    const va = p.vsAnchor;
    const status = !p.registered ? '<span class="tag" title="a config no longer in players.json">old config</span>'
      : p.unavailable ? `<span class="tag" title="${esc(p.unavailable)}">unavailable</span>` : p.anchor ? '<span class="tag">anchor</span>' : '';
    return `<tr><td class="pl"><b>${esc(p.name)}</b> ${status}<div class="dim small">${esc(p.kind)} ${esc(Object.entries(p.params).map(([k, v]) => `${k}=${v}`).join(' '))}</div></td>`
      + `<td data-v="${p.rated ? p.rating : -1}">${p.rated ? `<b>${p.rating.toFixed(0)}</b>` : '–'}</td><td class="dim">${p.rated && p.name !== doc.anchor.name ? `${p.lo.toFixed(0)}–${p.hi.toFixed(0)}` : p.name === doc.anchor.name ? 'fixed' : ''}</td>`
      + `<td>${ratingBar(p, lo, hi)}</td><td>${p.games}</td><td>${p.wins}–${p.losses}</td><td>${p.draws}</td>`
      + `<td data-v="${va ? va.rate : -1}">${va ? `${pct(va.rate)} <span class="dim">${va.wins}–${va.losses} · ${pct(va.lo)}–${pct(va.hi)}</span>` : '–'}</td></tr>`;
  }).join('');
  const sprt = doc.sprt.length === 0 ? '<p class="dim">No SPRT run yet (<code>ai-ladder.sh sprt A B</code>).</p>'
    : `<div class="wrap"><table><thead><tr><th>when</th><th>A vs B</th><th>H1: A ≥ B +</th><th>result</th><th>LLR</th><th>bounds</th><th>games</th><th>A's score</th><th>via</th></tr></thead><tbody>`
      + doc.sprt.slice(0, 30).map((s) => `<tr><td class="dim">${esc(s.at.slice(0, 16).replace('T', ' '))}</td><td><b>${esc(s.a)}</b> vs ${esc(s.b)}</td><td>${s.elo1} <span class="dim">(H0 ≤ ${s.elo0}; α ${s.alpha}, β ${s.beta})</span></td>`
        + `<td><span class="res ${s.result}">${s.result === 'H1' ? 'H1 accepted' : s.result === 'H0' ? 'H0 accepted' : esc(s.result)}</span></td><td>${s.llr.toFixed(2)}</td><td class="dim">${s.lower.toFixed(2)} / ${s.upper.toFixed(2)}</td><td>${s.games} <span class="dim">(${s.pairs} pairs)</span></td><td>${pct(s.score)}</td><td class="dim">${esc(s.purpose)}</td></tr>`).join('')
      + '</tbody></table></div>';
  const tune = doc.tune.length === 0 ? '<p class="dim">No tuner run yet (<code>ai-ladder.sh tune &lt;base&gt; --param k=v1,v2</code>).</p>'
    : doc.tune.slice(0, 10).map((t) => {
      const last = t.rounds[t.rounds.length - 1];
      const first = t.rounds[0];
      const rowsT = (first?.standings ?? []).map((s) => {
        const fin = last?.standings.find((x) => x.label === s.label);
        const out = t.rounds.findIndex((r) => !r.standings.slice(0, Math.ceil(r.standings.length / t.eta)).some((x) => x.label === s.label));
        return `<tr${s.label === t.winner.label ? ' class="win"' : ''}><td>${esc(s.label)}</td><td>${(fin ?? s).wins}–${(fin ?? s).losses}</td><td>${pct((fin ?? s).score)}</td><td class="dim">${s.label === t.winner.label ? 'winner' : out >= 0 ? `cut after round ${out + 1}` : 'final'}</td></tr>`;
      }).join('');
      return `<div class="deck"><h3>${esc(t.base)} → <b>${esc(t.winner.registeredAs)}</b> <span class="dim">(${esc(t.winner.label)})</span></h3>`
        + `<p class="dim">${esc(t.at.slice(0, 16).replace('T', ' '))} · vs ${esc(t.pool.join(', '))} · eta ${t.eta} · ${t.rounds.length} round(s) · ${t.games} games</p>`
        + `<table><thead><tr><th>candidate</th><th>W–L (all rounds)</th><th>score</th><th></th></tr></thead><tbody>${rowsT}</tbody></table></div>`;
    }).join('');
  const lg = doc.league ? `<p>Current best: <b>${esc(doc.league.best)}</b>. Pool: ${doc.league.pool.map(esc).join(', ')}.</p>`
    + (doc.league.promoted.length ? `<ul>${doc.league.promoted.map((p) => `<li><b>${esc(p.name)}</b> <span class="dim">${esc(p.at.slice(0, 16).replace('T', ' '))} — ${esc(p.reason)}</span></li>`).join('')}</ul>` : '<p class="dim">Nothing promoted yet.</p>') : '<p class="dim">League mode has not run.</p>';
  const t = doc.totals;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI ladder</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1f;--dim:#6b6b70;--line:#dedbd3;--card:#fff;--acc:#2f6fb3;--ci:#9cc0e6;--good:#1f7a3a;--bad:#b3261e;
--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--s6:#008300;--s7:#4a3aa7;--s8:#e34948}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececef;--dim:#9a9aa2;--line:#2c2c31;--card:#1c1c20;--acc:#7fb2ea;--ci:#2f4f73;--good:#6fcf8a;--bad:#f28b84;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px 16px}
main{max-width:1180px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
h3{font-size:14px;margin:0 0 4px}.dim{color:var(--dim)}.small{font-size:12px}table{border-collapse:collapse;width:100%;background:var(--card);font-variant-numeric:tabular-nums}
th,td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap;vertical-align:top}th{font-weight:600}
#ladder th{cursor:pointer}.wrap{overflow-x:auto}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 10px}.kpi b{display:block;font-size:20px}
.bar .track{fill:var(--line)}.bar .mid{stroke:var(--dim);stroke-dasharray:2 2}.bar .ci{fill:var(--ci)}.bar .pt{fill:var(--acc)}
.decks{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}.deck{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:10px}
.tag{font-size:11px;border:1px solid var(--dim);border-radius:3px;padding:0 3px;color:var(--dim)}a{color:var(--acc)}code{font-size:12px}
.res.H1{color:var(--good);font-weight:600}.res.H0{color:var(--bad);font-weight:600}tr.win td{font-weight:600}
.chartbox{position:relative;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px}
#hist .grid{stroke:var(--line);stroke-width:1}#hist .tick{fill:var(--dim);font-size:11px}#hist .lab{fill:var(--fg);font-size:11px}
#hist .ln{fill:none;stroke-width:2;stroke-linejoin:round}#hist .dot{stroke:var(--card);stroke-width:2}#hist .xh{stroke:var(--dim);stroke-dasharray:2 2}
${Array.from({ length: SERIES }, (_, k) => `.s${k + 1}{stroke:var(--s${k + 1})}circle.s${k + 1}{fill:var(--s${k + 1})}i.s${k + 1}{background:var(--s${k + 1})}`).join('')}
.sx{stroke:var(--dim)}circle.sx{fill:var(--dim)}i.sx{background:var(--dim)}
.pl{white-space:normal;min-width:170px;max-width:300px}.wr{white-space:normal;max-width:220px}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 6px;font-size:12px}.key{display:inline-flex;align-items:center;gap:5px}.sw{display:inline-block;width:12px;height:3px;border-radius:2px}
.tip{position:absolute;top:12px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:12px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.12);white-space:nowrap}
</style></head><body><main>
<h1>AI ladder</h1>
<p class="dim">Rated on <code>${esc(doc.set)}</code>. Bradley–Terry ratings on the Elo scale, forge-default fixed at ${doc.anchor.rating}; 95% intervals by ${doc.ci === 'hessian' ? 'the Hessian' : esc(doc.ci.replace(':', ' with ') + ' resamples of mirrored deals')}. Every game is an ai-bench game on fixed deck pairs, each deal played from both sides. Generated ${esc(doc.generatedAt.slice(0, 16).replace('T', ' '))}.</p>
<div class="kpis">
<div class="kpi"><b>${t.games}</b>games (${t.decisive} decisive)</div>
<div class="kpi"><b>${t.draws}</b>draws (timeouts and engine errors; not rated)</div>
<div class="kpi"><b>${doc.players.filter((p) => p.rated).length}</b>rated players</div>
<div class="kpi"><b>${t.hosts.length}</b>machine(s): ${esc(t.hosts.join(', ') || '–')}</div>
<div class="kpi"><b>${doc.sprt.length}</b>SPRT tests</div>
</div>
<h2>Ladder</h2><p class="dim">Click a heading to sort. "vs forge-default" is the head-to-head record against the anchor with its Wilson 95% interval. A wide interval is the finding: play more games.</p>
<div class="wrap"><table id="ladder"><thead><tr><th>player</th><th>rating</th><th>95% CI</th><th></th><th>decisive games</th><th>W–L</th><th>draws</th><th>vs forge-default</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Rating over time</h2><p class="dim">The fit after each ladder run, over every game up to it. Hover for the numbers.</p>${chart(doc)}
<h2>Recent SPRT outcomes</h2>${sprt}
<h2>Tuner results</h2><div class="decks">${tune}</div>
<h2>League</h2>${lg}
<h2>Experiment log</h2><p class="dim">Every engine run, with its git commit and purpose, from <code>docs/evidence/experiments.jsonl</code> (committed). A run with no end line was abandoned.</p>${expTable(doc)}
<p class="dim">Made by <code>tools/ai-ladder.sh report</code> (mtg-table, GPL-3.0-or-later). The same numbers are in <code>ladder.json</code> (schema 1).</p>
</main>
<script>
(function(){var t=document.getElementById('ladder');if(!t)return;var hs=t.tHead.rows[0].cells;var dir={};
for(var i=0;i<hs.length;i++)(function(i){hs[i].onclick=function(){var b=t.tBodies[0];var rows=[].slice.call(b.rows);dir[i]=!dir[i];
rows.sort(function(a,c){var x=a.cells[i],y=c.cells[i];var vx=x.dataset.v!==undefined?+x.dataset.v:(isNaN(parseFloat(x.textContent))?x.textContent:parseFloat(x.textContent));
var vy=y.dataset.v!==undefined?+y.dataset.v:(isNaN(parseFloat(y.textContent))?y.textContent:parseFloat(y.textContent));return (vx<vy?-1:vx>vy?1:0)*(dir[i]?-1:1);});
rows.forEach(function(r){b.appendChild(r);});};})(i);})();
</script></body></html>
`;
}
