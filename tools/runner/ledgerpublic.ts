// mtg-table — the lab runner: the public, numbers-only copy of the decision ledger (D384).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The decision ledger (D366, ledger.ts) is private: ledger.jsonl and LEDGER.md on pc-results.
// D384 adds ONE public copy of it, `ledger.json`, which the runner publishes beside status.json,
// ladder.json and warehouse.json on ForgeCoach's public `lab-status` branch, for the morning
// report page.  This module is that copy's ALLOWLIST, as warehouse.ts and ladder.ts are theirs.
// The private ledger itself stays private.
//
// Schema 1 (fixed with ForgeCoach's page):
//   { schema: 1, generatedAt (ISO with offset),
//     entries: [ {                                  oldest first; the newest LEDGER_PUBLIC_MAX (100)
//       id            J###, /^J\d{3,5}$/ (else the entry is dropped)
//       title         the job's `public_title:` (PUBLIC_TEXT), else null
//       decides       the job's `public_decides:` (PUBLIC_TEXT), else null; never the private `decides:`
//       rule          a short form of the private `rule:`: only its D-numbers (D358), `gate N` and
//                     `<NAME>_RULE` tokens, in order, deduped, at most 4, joined ", "; null when none
//       ruleWritten   the job had a `rule:` line at all
//       outcome       done | failed | aborted (else the entry is dropped)
//       cause         null when done or aborted; else from the private reason's PREFIX only:
//                     check | pilot | timeout | step | memory | other  (the reason text is never published)
//       checked       the job file had at least one `check:` line (pre-registered checks)
//       headline      { <metric>: <number> }: statusjson's METRIC keys, no `cubes.` key, finite
//                     numbers rounded to 3 decimals, at most 12
//       finished      ISO with offset (else the entry is dropped)
//       followups     [ { job: J### | null, template: <name> | null, state } ], at most 10: a job
//                     follow-up publishes its id only (never its path or slug), a template name only
//                     when /^[a-z][a-z0-9-]{0,39}$/; state queued | posted | ready | not-due; any
//                     other follow-up is dropped
//     } ] }
//
// Dropped, and never public: the hypothesis, the private title and decides, the reason text, the
// summary path, the commits, the key, and any field this list does not name.  Pure: the input is
// ledger.jsonl's text, and a torn or foreign line is skipped.

import { METRIC, PUBLIC_TEXT } from './statusjson.ts';

export const LEDGER_PUBLIC_MAX = 100;
const HEADLINE_MAX = 12;
const FOLLOWUPS_MAX = 10;
const RULE_TOKENS_MAX = 4;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ID = /^J\d{3,5}$/;
const TEMPLATE = /^[a-z][a-z0-9-]{0,39}$/;
const FOLLOWUP_JOB = /^jobs\/(J\d+)[A-Za-z0-9._-]*\.md$/;
const CUBE_SEGMENT = /(^|\.)cubes\./;
const RULE_TOKEN = /\bD\d{2,4}\b|\bgate \d{1,2}\b|\b[A-Z][A-Z0-9_]{1,40}_RULE\b/g;
const OUTCOMES = new Set(['done', 'failed', 'aborted']);
const STATES = new Set(['queued', 'posted', 'ready', 'not-due']);

export type PublicCause = 'check' | 'pilot' | 'timeout' | 'step' | 'memory' | 'other';
export type PublicFollowup = { job: string | null; template: string | null; state: 'queued' | 'posted' | 'ready' | 'not-due' };

export interface PublicLedgerEntry {
  id: string;
  title: string | null;
  decides: string | null;
  rule: string | null;
  ruleWritten: boolean;
  outcome: 'done' | 'failed' | 'aborted';
  cause: PublicCause | null;
  checked: boolean;
  headline: Record<string, number>;
  finished: string;
  followups: PublicFollowup[];
}

export interface PublicLedger { schema: 1; generatedAt: string; entries: PublicLedgerEntry[] }

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const pubText = (v: unknown): string | null => (typeof v === 'string' && PUBLIC_TEXT.test(v) ? v : null);

/** The private rule's short form: its D-numbers, `gate N` and `*_RULE` names, in order, deduped, at most 4. */
export function ruleShort(rule: unknown): string | null {
  if (typeof rule !== 'string') return null;
  const out: string[] = [];
  for (const m of rule.matchAll(RULE_TOKEN)) if (!out.includes(m[0])) out.push(m[0]);
  return out.length ? out.slice(0, RULE_TOKENS_MAX).join(', ') : null;
}

/** Why a job did not finish done, from its private reason's prefix only (runner.ts's `finish` calls). */
export function causeOf(outcome: string, reason: unknown): PublicCause | null {
  if (outcome !== 'failed') return null;
  const r = typeof reason === 'string' ? reason : '';
  if (/^check: /.test(r)) return 'check';
  if (/^(?:(?:pilot|prepare): )?step \S+ exited -?\d+$/.test(r)) return 'step';
  if (/^pilot: /.test(r)) return 'pilot';
  if (/^timeout: /.test(r)) return 'timeout';
  if (/^memory: /.test(r)) return 'memory';
  return 'other';
}

function headlineOf(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(obj(v))) {
    if (Object.keys(out).length >= HEADLINE_MAX) break;
    if (!METRIC.test(k) || CUBE_SEGMENT.test(k) || typeof x !== 'number' || !Number.isFinite(x)) continue;
    out[k] = Math.round(x * 1000) / 1000;
  }
  return out;
}

function followupsOf(v: unknown): PublicFollowup[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x): PublicFollowup[] => {
    const f = obj(x);
    const state = f.state;
    if (typeof state !== 'string' || !STATES.has(state) || typeof f.followup !== 'string') return [];
    const s = state as PublicFollowup['state'];
    if (f.followup.startsWith('template ')) {
      const name = f.followup.slice('template '.length);
      return TEMPLATE.test(name) ? [{ job: null, template: name, state: s }] : [];
    }
    const id = FOLLOWUP_JOB.exec(f.followup)?.[1];
    return id && ID.test(id) ? [{ job: id, template: null, state: s }] : [];
  }).slice(0, FOLLOWUPS_MAX);
}

/** One private ledger entry (a parsed ledger.jsonl line) as its public form, or null when it cannot be published. */
export function publicEntry(raw: unknown): PublicLedgerEntry | null {
  const e = obj(raw);
  const id = typeof e.id === 'string' && ID.test(e.id) ? e.id : null;
  const outcome = typeof e.outcome === 'string' && OUTCOMES.has(e.outcome) ? e.outcome as PublicLedgerEntry['outcome'] : null;
  const finished = typeof e.finished === 'string' && ISO.test(e.finished) && Number.isFinite(Date.parse(e.finished)) ? e.finished : null;
  if (!id || !outcome || !finished) return null;
  return {
    id,
    title: pubText(e.publicTitle),
    decides: pubText(e.publicDecides),
    rule: ruleShort(e.rule),
    ruleWritten: typeof e.rule === 'string' && e.rule.trim() !== '',
    outcome,
    cause: causeOf(outcome, e.reason),
    checked: typeof e.checks === 'number' && e.checks > 0,
    headline: headlineOf(e.headline),
    finished,
    followups: followupsOf(e.followups),
  };
}

/**
 * The public ledger.json from ledger.jsonl's text: every publishable entry, oldest first, the
 * newest LEDGER_PUBLIC_MAX.  null when no entry can be published or `generatedAt` is not ISO.
 */
export function sanitiseLedger(jsonl: string, generatedAt: string): PublicLedger | null {
  if (!ISO.test(generatedAt)) return null;
  const entries: PublicLedgerEntry[] = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let raw: unknown;
    try { raw = JSON.parse(line); } catch { continue; }
    const e = publicEntry(raw);
    if (e) entries.push(e);
  }
  if (!entries.length) return null;
  const order = entries.map((e, i) => ({ e, i, t: Date.parse(e.finished) }));
  order.sort((a, b) => a.t - b.t || a.i - b.i);
  return { schema: 1, generatedAt, entries: order.slice(-LEDGER_PUBLIC_MAX).map((x) => x.e) };
}
