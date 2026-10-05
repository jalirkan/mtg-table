// mtg-table — the lab runner: the decision ledger (D366).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A job says what it is FOR, in four optional header lines (jobfile.ts reads them):
//
//   decides: promote evaluator v1 to the search (gate 2)       the decision this job informs
//   hypothesis: the evaluator's regret is lower, because ...   what we expect, and why
//   rule: D354 gate 2 (gates.py REGRET_RULE)                    the pre-registered pass/fail rule, or a pointer to it
//   followup: jobs/J062-matchup-read.md, morning-read           what is promised next: a pc-jobs file or a named template
//
// At each job END (done, failed, aborted) the runner appends one entry to `ledger.jsonl` and
// `LEDGER.md` at the root of pc-results, in the commit that carries the job's STATUS.  The
// ledger itself is never part of the public lab-status copy; only ledgerpublic.ts's allowlisted,
// numbers-only `ledger.json` is (D387, amending D366), and a job's words reach it only through
// its opt-in `public_title:` / `public_decides:` lines.
//
// FOLLOW-UPS.  The runner only reads pc-jobs, so it never posts a job.  When a job with
// `followup:` ends `done`:
//   - a follow-up file that is already on pc-jobs needs nothing (with `after:` on this job it
//     is already queued; that is the recommended way: post the follow-up together with the job);
//   - anything else (a file not on pc-jobs, or a template name) gets a `FOLLOW-UP READY` line
//     at the top of HEARTBEAT.md's `## Messages`, which the cloud session reads, and the
//     ledger entry says so.
// The ledger entry names every follow-up's state either way, so nothing promised is lost.
//
// No git here, and no fs but `siblingJob` (for `check`).  jobfile.ts parses the four lines
// (`parseLedgerHeaders`); the runner (runner.ts, `appendLedger`) does the writing.

import fs from 'node:fs';
import path from 'node:path';

import type { Followup, JobFile, LedgerHeaders } from './jobfile.ts';

export type { Followup, LedgerHeaders };

/** What `tools/runner.sh check` prints about the ledger: the four lines, then warnings. */
export function ledgerCheckLines(job: JobFile, sibling?: (followupPath: string) => string | null, parse?: (file: string, text: string) => JobFile): string[] {
  const l = job.ledger;
  const out = [
    `decides: ${l.decides ?? '-'}`,
    `hypothesis: ${l.hypothesis ?? '-'}`,
    `rule: ${l.rule ?? '-'}`,
    `followup: ${l.followups.length ? l.followups.map(followupName).join(', ') : '-'}`,
  ];
  for (const f of l.followups) if (f.kind === 'template') out.push(`note: followup ${f.name} is a template: when ${job.id} is done, the runner asks the cloud session to write and post it (HEARTBEAT ## Messages)`);
  for (const w of ledgerWarnings(job, sibling, parse)) out.push(`WARNING: ${w}`);
  return out;
}

/**
 * The ledger's warnings for one job file: a heavy job with no `decides:`, a `decides:` with no
 * `rule:`, and a follow-up file found beside it (a pc-jobs checkout) that does not wait on it.
 */
export function ledgerWarnings(job: JobFile, sibling?: (followupPath: string) => string | null, parse?: (file: string, text: string) => JobFile): string[] {
  const w: string[] = [];
  const l = job.ledger;
  if (job.cpu === 'heavy' && !l.decides) w.push('a heavy job with no decides: line: name the decision its result informs');
  if (l.decides && !l.rule) w.push('decides: without rule: the pass/fail rule is not written down (a D-number or a gates.py RULE name will do)');
  for (const f of l.followups) {
    if (f.kind === 'template') continue;
    const text = sibling?.(f.path) ?? null;
    if (text === null || !parse) continue;
    const next = parse(f.path, text);
    if (!next.after.includes(job.id)) w.push(`followup: ${f.path} is beside this file but has no after: ${job.id}; it may start before ${job.id} is done`);
  }
  return w;
}

/**
 * For `check` in a pc-jobs checkout: a follow-up's text read beside the job file being checked
 * (`<dir>/../jobs/J062-x.md`, else `<dir>/J062-x.md`), or null when it is not there.
 */
export function siblingJob(file: string): (followupPath: string) => string | null {
  const dir = path.dirname(path.resolve(file));
  return (p) => {
    for (const c of [path.resolve(dir, '..', p), path.resolve(dir, path.basename(p))]) {
      try { return fs.readFileSync(c, 'utf8'); } catch { /* next */ }
    }
    return null;
  };
}

export function followupName(f: Followup): string {
  return f.kind === 'job' ? f.path : `template ${f.name}`;
}

// ------------------------------------------------------------------ the ledger entry

export type LedgerOutcome = 'done' | 'failed' | 'aborted';

/** A follow-up at the job's end: `queued` (on pc-jobs, after: this job), `posted` (on pc-jobs), `ready` (to post: the runner said so), `not-due` (the job did not finish done). */
export interface FollowupState { followup: string; state: 'queued' | 'posted' | 'ready' | 'not-due' }

export interface LedgerEntry {
  /** `<id>@<finished>`: one entry per job end; a rerun of the same id is another key. */
  key: string;
  id: string;
  title: string;
  decides: string | null;
  hypothesis: string | null;
  rule: string | null;
  outcome: LedgerOutcome;
  /** STATUS's reason line: why it failed or was aborted ('' when done). */
  reason: string;
  /** The job's `headline:` numbers, as measured at its end. */
  headline: Record<string, number>;
  /** Where the PC session writes its summary. */
  summary: string;
  finished: string;
  followups: FollowupState[];
  /** The commits the job ran on. */
  commits: Record<string, string>;
  /** The job file's opt-in public words (`public_title:`, `public_decides:`), for ledgerpublic.ts (D387); absent in older entries. */
  publicTitle?: string | null;
  publicDecides?: string | null;
  /** How many `check:` lines the job file had (its pilot's and its commands'), D387; absent in older entries. */
  checks?: number;
}

/** The ledger's outcome for a runner outcome, or null when it is not an end (waiting, skipped). */
export function ledgerOutcome(state: string, reason: string): LedgerOutcome | null {
  if (state === 'done') return 'done';
  if (state === 'failed') return /^aborted:/.test(reason) ? 'aborted' : 'failed';
  return null;
}

/** The pc-jobs files the runner read: by path, their `after:` ids. */
export type PostedJobs = Map<string, string[]>;

export function followupStates(id: string, outcome: LedgerOutcome, followups: Followup[], posted: PostedJobs): FollowupState[] {
  return followups.map((f) => {
    const name = followupName(f);
    if (f.kind === 'job') {
      const after = posted.get(f.path);
      if (after) return { followup: name, state: after.includes(id) ? 'queued' : 'posted' };
    }
    return { followup: name, state: outcome === 'done' ? 'ready' : 'not-due' };
  });
}

export function ledgerEntry(o: {
  id: string; title: string; ledger: LedgerHeaders | null; state: string; reason: string; finished: string;
  headlineKeys: string[]; numbers: Record<string, number>; metrics: Record<string, unknown>; commits: Record<string, string>; posted: PostedJobs;
  publicTitle?: string | null; publicDecides?: string | null; checks?: number;
}): LedgerEntry | null {
  const outcome = ledgerOutcome(o.state, o.reason);
  if (!outcome) return null;
  const headline: Record<string, number> = {};
  for (const k of o.headlineKeys) {
    const v = o.numbers[k] ?? o.metrics[k];
    if (typeof v === 'number' && Number.isFinite(v)) headline[k] = v;
  }
  const l = o.ledger;
  return {
    key: `${o.id}@${o.finished}`, id: o.id, title: oneLine(o.title), decides: l?.decides ?? null, hypothesis: l?.hypothesis ?? null, rule: l?.rule ?? null,
    outcome, reason: outcome === 'done' ? '' : oneLine(o.reason), headline, summary: `results/${o.id}/summary.md`, finished: o.finished,
    followups: followupStates(o.id, outcome, l?.followups ?? [], o.posted), commits: { ...o.commits },
    publicTitle: o.publicTitle ?? null, publicDecides: o.publicDecides ?? null, checks: o.checks ?? 0,
  };
}

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function ledgerJsonLine(e: LedgerEntry): string {
  return `${JSON.stringify(e)}\n`;
}

/** The keys already in a ledger.jsonl text (a torn or foreign line is ignored). */
export function ledgerKeys(jsonl: string): Set<string> {
  const keys = new Set<string>();
  for (const line of jsonl.split('\n')) {
    try { const k = (JSON.parse(line) as { key?: unknown }).key; if (typeof k === 'string') keys.add(k); } catch { /* not ours */ }
  }
  return keys;
}

export const LEDGER_MD_HEAD = `# Decision ledger

Written by the lab runner (tools/runner, D366): one entry per job end (done, failed, aborted),
newest last. Each names the decision the job informs, what was expected, the pre-registered
rule, the outcome and its headline numbers. The judgement is the PC session's summary.md,
read against the rule. ledger.jsonl holds the same entries, one JSON object a line.
`;

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000));

export function ledgerMarkdown(e: LedgerEntry): string {
  const head = Object.entries(e.headline).map(([k, v]) => `${k} ${fmt(v)}`).join(', ');
  const lines = [
    `## ${e.id} ${e.outcome.toUpperCase()}: ${e.title}`,
    '',
    `- finished: ${e.finished}`,
    `- decides: ${e.decides ?? '(no decides: line in the job file)'}`,
    `- hypothesis: ${e.hypothesis ?? '-'}`,
    `- rule: ${e.rule ?? '(no rule: line in the job file)'}`,
    `- outcome: ${e.outcome}${e.reason ? ` (${e.reason})` : ''}`,
    `- headline: ${head || '-'}`,
    `- summary: ${e.summary} (the PC session's; judge it against the rule)`,
  ];
  if (Object.keys(e.commits).length) lines.push(`- commits: ${Object.entries(e.commits).map(([r, s]) => `${r} ${s}`).join(', ')}`);
  for (const f of e.followups) lines.push(`- follow-up: ${f.followup}: ${FOLLOWUP_WORDS[f.state]}`);
  return `${lines.join('\n')}\n`;
}

const FOLLOWUP_WORDS: Record<FollowupState['state'], string> = {
  queued: 'on pc-jobs with after: on this job; the runner starts it',
  posted: 'on pc-jobs already',
  ready: 'READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages',
  'not-due': 'not due (the job did not finish done)',
};

/** The HEARTBEAT `## Messages` line for one entry's follow-ups that need posting, or null. */
export function followupMessage(e: LedgerEntry): string | null {
  const ready = e.followups.filter((f) => f.state === 'ready');
  if (!ready.length) return null;
  const what = ready.map((f) => (f.followup.startsWith('template ') ? `write and post the ${f.followup}` : `post ${f.followup} to pc-jobs`)).join('; ');
  return `- FOLLOW-UP READY [${e.key}] (the runner, for the cloud session): ${e.id} is done; ${what}.${e.decides ? ` It decides: ${e.decides}.` : ''} Ledger: LEDGER.md. Delete this line once posted.`;
}

/**
 * HEARTBEAT.md with `lines` added at the top of its `## Messages` section (right under the
 * heading), each unless a line with its `[key]` is already there.  No section: one is added.
 */
export function withMessages(heartbeat: string, lines: string[]): string {
  const add = lines.filter((l) => {
    const key = /\[[^\]]+\]/.exec(l)?.[0];
    return !(key ? heartbeat.includes(key) : heartbeat.includes(l));
  });
  if (!add.length) return heartbeat;
  const m = /^## Messages[^\n]*\n/m.exec(heartbeat);
  if (!m) return `${heartbeat.trimEnd()}\n\n## Messages\n\n${add.join('\n')}\n`;
  const at = m.index + m[0].length;
  return `${heartbeat.slice(0, at)}\n${add.join('\n')}\n${heartbeat.slice(at)}`;
}
