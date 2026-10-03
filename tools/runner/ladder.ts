// mtg-table — the lab runner: the public, sanitised copy of the AI ladder's ladder.json (D334).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tools/ai-ladder.sh report` writes var/ai-ladder/ladder.json (schema
// "mtg-table/ai-ladder", version 1; tools/ai-ladder/report.ts is its
// contract).  The runner publishes a copy next to status.json on ForgeCoach's
// public `lab-status` branch, for the leaderboard page, whenever the file
// changes.  This module is that copy's ALLOWLIST, kept apart from the rest of
// the runner so it can be adjusted alone once the page's needs are settled.
//
// The fields are exactly ForgeCoach's `LADDER_FIELDS` (src/lab/ladder.ts, the
// leaderboard page): schema, version, generatedAt, scale, ci, set,
// anchor.{name,rating}, totals.{games,decisive,draws,first,last}, players[]
// (name, kind, anchor, registered, available, rating, lo, hi, rated, games,
// wins, losses, draws, vsAnchor.{wins,losses,rate,lo,hi}), sprt[] (at, a, b,
// elo0, elo1, alpha, beta, result, llr, lower, upper, games, pairs, score,
// purpose), tune[] (at, base, vary, pool, eta, games, winner.{label,
// registeredAs}, rounds[].{round, standings[].{label,wins,losses,score}}) and
// league.{best, pool, promoted[].{name,at,reason}}.  Everything else is dropped
// (params, hashes, hosts, history, the experiment log, unavailable reasons),
// and every kept value is checked: names and labels against token patterns
// with no `/`, `set` cut to its file name, a promotion's reason through the
// same cleaner as status.json's titles (paths, URLs, hosts cut out).

import { cleanTitle } from './statusjson.ts';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
/** A player name: registry names and "<name>@<hash>" for an unregistered config. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.+:=-]{0,59}(@[0-9a-f]{4,16})?$/;
const KIND = /^[a-z][a-z0-9_-]{0,29}$/;
const CI = /^(hessian|bootstrap:\d{1,6})$/;
const SPRT_RESULTS = new Set(['H1', 'H0', 'inconclusive', 'stopped']);
const PURPOSES = new Set(['sprt', 'league']);
const MAX = 50;

/** A config label or a tuned value: "ms=1000,turns=1", "Default+search"; never a path. */
const LABEL = /^[A-Za-z0-9][A-Za-z0-9_.+:=,@ -]{0,119}$/;
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,29}$/;
const label = (v: unknown): string | null => (typeof v === 'string' && LABEL.test(v) && !v.includes('/') ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : null);

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const n0 = (v: unknown): number => num(v) ?? 0;
const iso = (v: unknown): string | null => (typeof v === 'string' && ISO.test(v) ? v : null);
const name = (v: unknown): string | null => (typeof v === 'string' && NAME.test(v) && !v.includes('/') ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

export interface PublicLadder {
  schema: 'mtg-table/ai-ladder';
  version: 1;
  generatedAt: string;
  anchor: { name: string; rating: number };
  scale: 'elo';
  ci: string;
  set: string | null;
  totals: { games: number; decisive: number; draws: number; first: string | null; last: string | null };
  players: Array<{
    name: string; kind: string; anchor: boolean; registered: boolean; available: boolean;
    rating: number; lo: number; hi: number; rated: boolean; games: number; wins: number; losses: number; draws: number;
    vsAnchor: { wins: number; losses: number; rate: number; lo: number; hi: number } | null;
  }>;
  sprt: Array<{ at: string; a: string; b: string; elo0: number; elo1: number; alpha: number; beta: number; result: string; llr: number; lower: number; upper: number; games: number; pairs: number; score: number; purpose: string }>;
  tune: Array<{
    at: string; base: string; vary: Record<string, Array<string | number>>; pool: string[]; eta: number; games: number;
    winner: { label: string | null; registeredAs: string | null };
    rounds: Array<{ round: number; standings: Array<{ label: string; wins: number; losses: number; score: number }> }>;
  }>;
  league: { best: string | null; pool: string[]; promoted: Array<{ name: string; at: string; reason: string }> } | null;
}

/** null when the input is not a ladder.json of schema 1. */
export function sanitiseLadder(raw: unknown): PublicLadder | null {
  const d = obj(raw);
  if (d.schema !== 'mtg-table/ai-ladder' || d.version !== 1) return null;
  const t = obj(d.totals);
  const anchor = obj(d.anchor);
  const players = arr(d.players).slice(0, MAX).flatMap((x) => {
    const p = obj(x);
    const nm = name(p.name);
    if (!nm) return [];
    const va = p.vsAnchor ? obj(p.vsAnchor) : null;
    return [{
      name: nm, kind: typeof p.kind === 'string' && KIND.test(p.kind) ? p.kind : '?',
      anchor: p.anchor === true, registered: p.registered === true, available: p.available === true,
      rating: n0(p.rating), lo: n0(p.lo), hi: n0(p.hi), rated: p.rated === true,
      games: n0(p.games), wins: n0(p.wins), losses: n0(p.losses), draws: n0(p.draws),
      vsAnchor: va ? { wins: n0(va.wins), losses: n0(va.losses), rate: n0(va.rate), lo: n0(va.lo), hi: n0(va.hi) } : null,
    }];
  });
  const sprt = arr(d.sprt).slice(0, MAX).flatMap((x) => {
    const s = obj(x);
    const at = iso(s.at), a = name(s.a), b = name(s.b);
    if (!at || !a || !b || !SPRT_RESULTS.has(String(s.result))) return [];
    return [{ at, a, b, elo0: n0(s.elo0), elo1: n0(s.elo1), alpha: n0(s.alpha), beta: n0(s.beta), result: String(s.result),
      llr: n0(s.llr), lower: n0(s.lower), upper: n0(s.upper), games: n0(s.games), pairs: n0(s.pairs), score: n0(s.score),
      purpose: PURPOSES.has(String(s.purpose)) ? String(s.purpose) : 'sprt' }];
  });
  const tune = arr(d.tune).slice(0, MAX).flatMap((x) => {
    const u = obj(x);
    const at = iso(u.at), base = name(u.base);
    if (!at || !base) return [];
    const vary: Record<string, Array<string | number>> = {};
    for (const [k, vs] of Object.entries(obj(u.vary)).slice(0, 12)) {
      if (!KEY.test(k)) continue;
      vary[k] = arr(vs).slice(0, 12).flatMap((v): Array<string | number> => (typeof v === 'number' && Number.isFinite(v) ? [v] : label(v) ? [label(v) as string] : []));
    }
    const w = obj(u.winner);
    return [{
      at, base, vary, pool: arr(u.pool).map(name).filter((n): n is string => !!n).slice(0, MAX), eta: n0(u.eta), games: n0(u.games),
      winner: { label: label(w.label), registeredAs: name(w.registeredAs) },
      rounds: arr(u.rounds).slice(0, 20).map((rr) => {
        const r = obj(rr);
        return { round: n0(r.round), standings: arr(r.standings).slice(0, MAX).flatMap((ss) => { const t = obj(ss); const l = label(t.label); return l ? [{ label: l, wins: n0(t.wins), losses: n0(t.losses), score: n0(t.score) }] : []; }) };
      }),
    }];
  });
  const lg = d.league ? obj(d.league) : null;
  return {
    schema: 'mtg-table/ai-ladder',
    version: 1,
    generatedAt: iso(d.generatedAt) ?? '',
    anchor: { name: name(anchor.name) ?? 'forge-default', rating: num(anchor.rating) ?? 1500 },
    scale: 'elo',
    ci: typeof d.ci === 'string' && CI.test(d.ci) ? d.ci : 'hessian',
    set: typeof d.set === 'string' ? (d.set === 'all' ? 'all' : (/^[A-Za-z0-9._-]{1,80}$/.exec(d.set.split('/').pop() ?? '')?.[0] ?? null)) : null,
    totals: { games: n0(t.games), decisive: n0(t.decisive), draws: n0(t.draws), first: iso(t.first), last: iso(t.last) },
    players, sprt, tune,
    league: lg ? {
      best: name(lg.best),
      pool: arr(lg.pool).map(name).filter((x): x is string => !!x).slice(0, MAX),
      promoted: arr(lg.promoted).slice(0, MAX).flatMap((x) => { const p = obj(x); const n = name(p.name), at = iso(p.at); return n && at ? [{ name: n, at, reason: cleanTitle(p.reason) }] : []; }),
    } : null,
  };
}
