// mtg-table — tools/llm-seat/lib/reply.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The model's reply, read strictly.  The only lines allowed are
//
//   choice: 3            one option            (or `choice: 2, 5` where several may be chosen,
//                                                or `choice: none` where choosing nothing is allowed)
//   next: opp END_OF_TURN, own MAIN1             optional; the phases where it wants priority next
//
// in either order, case-insensitive keys, blank lines and surrounding
// whitespace tolerated, one optional ``` fence around them tolerated.  Anything
// else is malformed: the seat says why and asks once more, then plays the safe
// default (counted).  Validation against the decision (option range, how many)
// is decision.mjs's checkChoice.

import { PHASES } from './frames.mjs';

export function parseReply(text) {
  if (typeof text !== 'string') return { ok: false, error: 'the reply is empty' };
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !/^```\w*$/.test(l));
  let choice = null;
  let next = null;
  for (const line of lines) {
    const m = /^(choice|next)\s*:\s*(.*)$/i.exec(line);
    if (!m) return { ok: false, error: `unexpected line ${JSON.stringify(line.slice(0, 80))}: reply with only the choice line and an optional next line` };
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'choice') {
      if (choice !== null) return { ok: false, error: 'more than one choice line' };
      if (/^none$/i.test(val)) { choice = []; continue; }
      const parts = val.split(/[,\s]+/).filter(Boolean);
      if (parts.length === 0 || parts.some((p) => !/^\d+$/.test(p))) return { ok: false, error: `choice must be option numbers, got ${JSON.stringify(val.slice(0, 40))}` };
      choice = parts.map((p) => Number.parseInt(p, 10));
    } else {
      if (next !== null) return { ok: false, error: 'more than one next line' };
      next = [];
      if (val === '' || /^(none|default|defaults)$/i.test(val)) continue;
      for (const item of val.split(',').map((s) => s.trim()).filter(Boolean)) {
        const im = /^(own|opp)\s+([A-Z_0-9]+)$/i.exec(item);
        if (!im) return { ok: false, error: `next: ${JSON.stringify(item)} is not "own PHASE" or "opp PHASE"` };
        const phase = im[2].toUpperCase();
        if (!PHASES.includes(phase)) return { ok: false, error: `next: ${phase} is not a phase (${PHASES.join(' ')})` };
        next.push({ turn: im[1].toLowerCase(), phase });
      }
    }
  }
  if (choice === null) return { ok: false, error: 'no "choice:" line' };
  return { ok: true, choice, next };
}

export const REPLY_FORMAT = [
  'choice: <option number>          (several comma-separated only where the decision says so; "none" only where allowed)',
  'next: <own|opp> <PHASE>, ...     (optional)',
].join('\n');
