// mtg-table — tools/llm-seat/lib/prompt.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The words the model reads.  One system prompt for every arm (so the arms
// differ only in how the context is carried), and three kinds of user message:
//
//   full    the game log from the start, the state table, the card text of
//           every visible card, the decision  (every `fresh` call; the first
//           call of a session, and the first after a session restart)
//   delta   what happened since the last decision, the state table, the card
//           text of cards not shown before in this session, the decision
//           (every later call inside a session)
//   retry   why the last reply could not be read, the decision again
//
// Deterministic: the same frames give the same bytes (the golden test).

import { PHASES } from './frames.mjs';
import { REPLY_FORMAT } from './reply.mjs';
import { cardTextBlock, stateTable, visibleNames } from './history.mjs';

export const SYSTEM_PROMPT = [
  'You are playing a two-player game of Magic: The Gathering against the Forge AI. A program shows you the game from your seat and carries out your choices; you see only what your seat may see.',
  '',
  'Each message ends with a DECISION and numbered OPTIONS. The options are the moves the rules engine offers now. For attacks and blocks the list is the creatures that may be able to; the engine checks legality and refuses an illegal one.',
  '',
  'Reply with these lines and nothing else:',
  REPLY_FORMAT,
  '',
  'The next line names extra phases where you want to get priority from now on, beyond the defaults: your own MAIN1 and MAIN2; the opponent\'s COMBAT_DECLARE_BLOCKERS while you control a creature; the opponent\'s END_OF_TURN while you have an untapped land and an instant-speed card or ability. Without a next line only the defaults apply. Whatever the stops, you are always asked when something is put on the stack and you can respond, when you declare attackers or blockers, and whenever the engine asks you a question. When you have nothing you can play, priority is passed for you.',
  `Phases: ${PHASES.join(' ')}.`,
  '',
  'Play to win. Card text is given once per conversation; the game log and the state are the record of the game.',
].join('\n');

const KIND_WORDS = {
  priority: 'You have priority. Choose one option.',
  attack: 'Declare attackers. Choose "No attack" alone, or one or more creatures to attack with (comma-separated).',
  block: 'Declare blockers. Choose "No blocks" alone, or one or more blocks (comma-separated); each of your creatures blocks at most one attacker.',
  mulligan: 'Mulligan decision. Choose one option.',
  select: 'The engine asks you to choose.',
  buttons: 'The engine asks you to choose.',
};

export function decisionBlock(d) {
  const out = [];
  let head = KIND_WORDS[d.kind] ?? 'The engine asks you to choose.';
  if (d.multi && d.kind !== 'attack' && d.kind !== 'block') {
    head = `${head} Choose ${d.min === d.max ? d.min : `${d.min} to ${d.max}`} option(s), comma-separated${d.min === 0 ? ', or "none"' : ''}.`;
  } else if (d.source === 'ask' || d.kind === 'select' || d.kind === 'buttons') {
    head = `${head} Choose one option.`;
  }
  out.push(`DECISION (${d.kind}): ${head}`);
  const prompt = String(d.prompt ?? '').trim();
  if (prompt && d.kind !== 'priority') out.push(`Engine prompt: ${prompt.replace(/\n+/g, ' / ')}`);
  for (const c of d.context ?? []) out.push(c);
  out.push('OPTIONS:');
  for (const o of d.options) out.push(`${o.n}. ${o.label}`);
  return out.join('\n');
}

/** The pieces a prompt needs at one decision, captured when the decision is posed. */
export function snapshot({ history, state, me, decision, oracle }) {
  return {
    mark: history.mark(),
    table: stateTable(state, me),
    names: visibleNames(state, me),
    decision: decisionBlock(decision),
    oracle,
    history,
  };
}

function noticesText(list) {
  return list.length ? `\nENGINE NOTICES\n${list.slice(-6).map((n) => `- ${n}`).join('\n')}` : '';
}

export function fullPrompt(snap) {
  return [
    'GAME LOG (from the start; "you" is your seat, "opp" the opponent)',
    snap.history.logText(null, snap.mark),
    '',
    'CURRENT STATE',
    snap.table,
    '',
    'CARD TEXT',
    cardTextBlock(snap.names, snap.oracle),
    '',
    snap.decision,
  ].join('\n');
}

/**
 * A later message in one session.  `since` = the history mark at the previous
 * call, `shown` = the card names already given in this session, `previous` =
 * what became of the last decision when it is worth saying (a fallback, or in
 * replay the move actually made when it differs from the reply).
 */
export function deltaPrompt(snap, { since, shown, previous = null }) {
  const fresh = snap.names.filter((n) => !shown.has(n));
  const delta = snap.history.logText(since, snap.mark);
  return [
    ...(previous ? [previous, ''] : []),
    'SINCE YOUR LAST DECISION',
    delta,
    noticesText(snap.history.noticesSince(since, snap.mark)).trimStart(),
    '',
    'CURRENT STATE',
    snap.table,
    '',
    'CARD TEXT (cards not shown before)',
    cardTextBlock(fresh, snap.oracle),
    '',
    snap.decision,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

export function retryPrompt(error, decision) {
  return [
    `Your reply could not be used: ${error}.`,
    'Reply again with only these lines:',
    REPLY_FORMAT,
    '',
    decision,
  ].join('\n');
}
