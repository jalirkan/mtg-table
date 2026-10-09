// mtg-table — tools/llm-seat/lib/plan-prompt.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// PLAN MODE's words (D419): the system prompt -- the exact reply format FIRST,
// with a worked example and what happens to a reply not in it -- and the game
// shown plainly, the way a person would describe it to an assistant: the turn
// and phase, life, each side's lands and permanents (tapped, P/T, counters,
// summoning sickness), the hand with mana costs, how much untapped mana and of
// which colours, graveyards, exile, the counts, the stack, combat, the game so
// far, and what the engine lets you do now.  No numbered menus.  Only the
// seat's redacted view (the opponent's hand is a count).
//
// Deterministic: the same frames give the same bytes.

import { cardsById, hasKeyword, isCreature, isLand, nameOf, playersOf } from './frames.mjs';
import { cardTextBlock, visibleNames } from './history.mjs';
import { availableMana, manaWords, payProblem, zoneCost } from './mana.mjs';
import { duplicateNames, showName } from './plan.mjs';

export const PLAN_SYSTEM = [
  'REPLY FORMAT. Every reply you write must have exactly this shape:',
  '',
  'PLAN: <one or two sentences, plain words>',
  'STEPS:',
  '1. <step>',
  '2. <step>',
  'END',
  '',
  'A program reads your reply, not a person. A reply not in this shape cannot be read: it is sent back to you as invalid, and that costs a turn of conversation. You may write a few lines of reasoning before the PLAN: line. Nothing may come after END.',
  '',
  'Each step is one of these, using card names exactly as the game shows them:',
  '  play land <card>',
  '  cast <card>                      or  cast <card> -> <target>',
  '  activate <card>                  or  activate <card> -> <target>',
  '  attack with <creature>, <creature>, ...      or  attack with none',
  '  block <attacker> with <your creature>        (one line per block)',
  '  target <card or player>          (answers a question that asks for a target)',
  '  choose <option>                  (answers any other question, in the words shown)',
  '  keep   or   mulligan             (your opening hand)',
  '  pass                             (do nothing now: no response, no blocks; last step)',
  '  hold                             (do nothing more this turn; last step)',
  'The players are "opponent" and "me". When two cards share a name, add the number shown after it, as in "Island #12".',
  '',
  'Example:',
  'Their only creature is a 2/1, so I develop first and keep my Shock for it.',
  'PLAN: Play a Forest, cast Grizzly Bears, then attack with Llanowar Elves.',
  'STEPS:',
  '1. play land Forest',
  '2. cast Grizzly Bears',
  '3. attack with Llanowar Elves',
  'END',
  '',
  'THE GAME. You are playing a two-player game of Magic: The Gathering against the Forge AI. You see only what your seat may see. The program carries out your steps in order on the rules engine: steps before an attack happen in your first main phase, the attack at declare attackers, steps after it in your second main phase. Mana is paid for you from your untapped mana. If a step cannot be done (not enough mana, a name that matches nothing, the engine says no), the program stops, tells you exactly why, and asks for new steps from there. When your steps run out it passes for you until you are needed again: when the opponent casts or activates something you could respond to, when you must declare blockers, when a card asks you to choose, and at the end of the opponent\'s turn if you could cast something then.',
  '',
  'Play to win.',
].join('\n');

const PHASE_WORDS = {
  UPKEEP: 'upkeep', DRAW: 'draw step', MAIN1: 'first main phase', COMBAT_BEGIN: 'beginning of combat',
  COMBAT_DECLARE_ATTACKERS: 'declare attackers step', COMBAT_DECLARE_BLOCKERS: 'declare blockers step',
  COMBAT_FIRST_STRIKE_DAMAGE: 'first-strike damage step', COMBAT_DAMAGE: 'combat damage step', COMBAT_END: 'end of combat',
  MAIN2: 'second main phase', END_OF_TURN: 'end step', CLEANUP: 'cleanup step',
};
export const phaseWords = (p) => PHASE_WORDS[p] ?? String(p ?? '-').toLowerCase();

const pt = (c) => (c.power != null && c.toughness != null ? ` ${c.power}/${c.toughness}` : '');

function flags(c, { sickness = true } = {}) {
  const f = [];
  if (c.tapped) f.push('tapped');
  if (sickness && c.sick && isCreature(c) && !hasKeyword(c, 'HASTE')) f.push('summoning sick');
  if (c.attacking) f.push('attacking');
  if (c.blocking) f.push('blocking');
  if (c.damage) f.push(`${c.damage} damage`);
  if (c.loyalty != null) f.push(`loyalty ${c.loyalty}`);
  for (const [k, v] of Object.entries(c.counters ?? {})) f.push(`${k} counter${v > 1 ? ` x${v}` : ''}`);
  if (Array.isArray(c.keywords) && c.keywords.length) f.push(c.keywords.map((k) => k.toLowerCase().replace(/_/g, ' ')).join(', '));
  if (c.token) f.push('token');
  return f;
}

/** The plain-words view of every card the seat can see, sharing one duplicate-name table. */
export class Namer {
  constructor(state) {
    this.cards = cardsById(state);
    this.dupes = duplicateNames([...this.cards.values()]);
  }

  name(c) {
    if (!c) return 'an unknown card';
    if (c.hidden === true) return 'a hidden card';
    if (!nameOf(c)) return c.faceDown ? `a face-down card #${c.id}` : `card #${c.id}`;
    return showName(c, this.dupes);
  }

  byId(id) { return this.name(this.cards.get(id)); }

  /** A permanent: name, P/T, its state. */
  permanent(c) {
    const f = flags(c);
    const att = c.attachedToId != null ? ` attached to ${this.byId(c.attachedToId)}` : '';
    return `${this.name(c)}${pt(c)}${att}${f.length ? ` (${f.join('; ')})` : ''}`;
  }

  /** A card in hand: name, cost, type, P/T. */
  inHand(c) {
    if (c.hidden === true) return 'a hidden card';
    const type = String(c.types ?? '').replace(/^Basic /, '');
    return `${this.name(c)}${c.manaCost ? ` ${c.manaCost}` : ''}${type ? ` (${type}${pt(c)})` : ''}`;
  }
}

const list = (xs) => (xs.length ? xs.join('; ') : 'none');

function landLine(namer, lands) {
  if (lands.length === 0) return 'none';
  const untapped = lands.filter((c) => !c.tapped).length;
  return `${lands.map((c) => `${namer.name(c)}${c.tapped ? ' (tapped)' : ''}`).join(', ')} -- ${untapped} untapped`;
}

/**
 * The state in plain words.  `landsPlayed` = lands the seat played this turn
 * (from the events), `oracle` for the mana sources.
 */
export function planView(state, me, { oracle = null, landsPlayed = null } = {}) {
  if (!state) return '(no state yet)';
  const { mine, opp } = playersOf(state, me);
  const namer = new Namer(state);
  const out = [];
  const whose = state.activePlayer === me ? 'your turn' : "the opponent's turn";
  const prio = state.priority === me ? 'You have priority.' : state.priority === null || state.priority === undefined ? '' : 'The opponent has priority.';
  out.push(state.turn ? `Turn ${state.turn}, ${whose}, ${phaseWords(state.phase)}. ${prio}`.trim() : 'Before the first turn.');
  for (const [who, p] of [['YOU', mine], ['OPPONENT', opp]]) {
    if (!p) continue;
    const z = p.zones ?? {};
    const bf = (z.battlefield?.cards ?? []).filter((c) => c.hidden !== true);
    const lands = bf.filter((c) => isLand(c) && !isCreature(c));
    const perms = bf.filter((c) => !lands.includes(c));
    const counts = `life ${p.life}${p.poison ? `, poison ${p.poison}` : ''}, hand ${z.hand?.count ?? 0}${p.id === me ? '' : ' (hidden)'}, library ${z.library?.count ?? '?'}, graveyard ${z.graveyard?.count ?? 0}, exile ${z.exile?.count ?? 0}`;
    out.push('');
    out.push(`${who} (${p.name}): ${counts}`);
    if (p.id === me) {
      out.push(`  Hand: ${list((z.hand?.cards ?? []).map((c) => namer.inHand(c)))}`);
      const avail = availableMana(state, me, oracle);
      const w = manaWords(avail);
      const pool = w.pool ? `; in your mana pool: ${w.pool}` : '';
      out.push(`  Untapped mana: ${avail.total}${avail.sources.length ? ` (${avail.sources.map((s) => s.name).join(', ')}: ${w.sources})` : ''}${pool}.${landsPlayed === null ? '' : ` Land played this turn: ${landsPlayed > 0 ? 'yes' : 'no'}.`}`);
    } else {
      const shown = (z.hand?.cards ?? []).filter((c) => c.hidden !== true);
      if (shown.length) out.push(`  Hand (revealed): ${list(shown.map((c) => namer.inHand(c)))}`);
    }
    out.push(`  Lands: ${landLine(namer, lands)}`);
    out.push(`  Creatures and other permanents: ${list(perms.map((c) => namer.permanent(c)))}`);
    if ((z.graveyard?.cards ?? []).length) out.push(`  Graveyard: ${list(z.graveyard.cards.map((c) => namer.name(c)))}`);
    if ((z.exile?.cards ?? []).length) out.push(`  Exile: ${list(z.exile.cards.map((c) => namer.name(c)))}`);
    if ((z.command?.cards ?? []).length) out.push(`  Command zone: ${list(z.command.cards.map((c) => namer.name(c)))}`);
    if ((z.library?.cards ?? []).length) out.push(`  Library, cards you may see: ${list(z.library.cards.map((c) => namer.name(c)))}`);
  }
  out.push('');
  out.push(stackLine(state, me, namer));
  const combat = combatLine(state, me, namer);
  if (combat) out.push(combat);
  return out.join('\n');
}

/** One stack item in words: "the opponent's Shock (targets Grizzly Bears)". */
export function stackItemWords(it, state, me, namer = new Namer(state)) {
  const src = it.sourceCardId != null ? namer.cards.get(it.sourceCardId) : null;
  const who = it.controller === me ? 'your' : "the opponent's";
  const what = src ? namer.name(src) : 'something';
  const kind = it.isAbility ? ' (an ability)' : '';
  const text = it.text && src && !String(it.text).startsWith(nameOf(src) ?? '\u0000') ? ` -- ${it.text}` : it.text && !src ? ` -- ${it.text}` : '';
  const tg = [...(it.targetCardIds ?? []).map((id) => namer.byId(id)), ...(it.targetPlayerIds ?? []).map((p) => (p === me ? 'you' : 'the opponent'))];
  return `${who} ${what}${kind}${text}${tg.length ? ` (targets ${tg.join(', ')})` : ''}`;
}

function stackLine(state, me, namer) {
  const stack = Array.isArray(state.stack) ? state.stack : [];
  if (!stack.length) return 'STACK: empty';
  return `STACK (top first): ${[...stack].reverse().map((it) => stackItemWords(it, state, me, namer)).join('; ')}`;
}

function combatLine(state, me, namer) {
  const bands = state.combat?.bands ?? [];
  if (!bands.length) return null;
  const parts = bands.map((b) => {
    const def = b.defender ? (b.defender.kind === 'player' ? (b.defender.id === me ? 'you' : 'the opponent') : namer.byId(b.defender.id)) : 'a player';
    const att = (b.attackerIds ?? []).map((id) => namer.byId(id)).join(', ');
    const bl = (b.blockerIds ?? []).map((id) => namer.byId(id));
    return `${att} attacking ${def}${bl.length ? `, blocked by ${bl.join(', ')}` : ''}`;
  });
  return `COMBAT: ${parts.join('; ')}`;
}

/**
 * What the engine lets the seat do now, in words (no menu): the lands it may
 * play, the spells it can and cannot pay for, the permanents with abilities,
 * the creatures that can attack.  `offers` is plan-core's list of the
 * engine's priority options (or null when the seat does not have priority).
 */
export function offersText(state, me, offers, { oracle = null, attackers = null } = {}) {
  const out = [];
  const namer = new Namer(state);
  if (offers) {
    const lands = offers.filter((o) => o.verb === 'land').map((o) => namer.byId(o.cardId));
    const cast = [];
    const cannot = [];
    for (const o of offers.filter((x) => x.verb === 'cast')) {
      const c = namer.cards.get(o.cardId);
      const where = o.zone && o.zone !== 'hand' ? ` from your ${o.zone}` : '';
      const alt = o.zone && o.zone !== 'hand' ? zoneCost(c, o.zone, oracle) : null;
      const problem = o.zone === 'hand' ? payProblem(c, state, me, oracle) : alt ? payProblem({ ...c, manaCost: alt.cost }, state, me, oracle) : null;
      const cost = alt ? ` (${alt.how} ${alt.cost})` : o.zone && o.zone !== 'hand' ? '' : c?.manaCost ? ` ${c.manaCost}` : '';
      const label = `${namer.name(c)}${cost}${where}`;
      if (problem) cannot.push(label);
      else cast.push(label);
    }
    const act = [...new Set(offers.filter((o) => o.verb === 'activate').map((o) => `${namer.byId(o.cardId)}${o.zone && o.zone !== 'battlefield' ? ` (from your ${o.zone})` : ''}`))];
    if (lands.length) out.push(`  play a land: ${[...new Set(lands)].join(', ')}`);
    if (cast.length) out.push(`  cast: ${[...new Set(cast)].join('; ')}`);
    if (cannot.length) out.push(`  in your hand, but your untapped mana (${availableMana(state, me, oracle).total}) cannot pay for it now: ${[...new Set(cannot)].join('; ')}`);
    if (act.length) out.push(`  activate: ${act.join('; ')}`);
    if (offers.legacy) out.push('  (this engine does not list what is playable: the cards above are your hand, and the engine refuses what you cannot play)');
  }
  if (attackers && attackers.length) out.push(`  can attack this turn: ${attackers.map((c) => `${namer.name(c)}${pt(c)}`).join('; ')}`);
  if (!out.length) return '';
  return ['WHAT THE ENGINE LETS YOU DO NOW (mana checked against your untapped mana)', ...out].join('\n');
}

/** The reply reminder every question ends with. */
export const REPLY_REMINDER = 'Reply with PLAN:, STEPS: and END, as the system prompt shows.';

/**
 * The full message: the question, the game so far, the state, what you can
 * do, the card text, the question again.
 */
export function planFullPrompt({ question, history, mark, state, me, oracle, offers, attackers, landsPlayed }) {
  return [
    question,
    '',
    'GAME SO FAR ("you" is you, "opp" the opponent; [n] is a card\'s number)',
    history.logText(null, mark),
    '',
    'NOW',
    planView(state, me, { oracle, landsPlayed }),
    ...(offersSection({ state, me, oracle, offers, attackers })),
    '',
    'CARD TEXT',
    cardTextBlock(visibleNames(state, me), oracle),
    '',
    question,
    REPLY_REMINDER,
  ].join('\n');
}

function offersSection({ state, me, oracle, offers, attackers }) {
  const t = offersText(state, me, offers, { oracle, attackers });
  return t ? ['', t] : [];
}

/** A later message inside one session: what happened since, the state, new card text, the question. */
export function planDeltaPrompt({ question, history, since, mark, shown, state, me, oracle, offers, attackers, landsPlayed }) {
  const fresh = visibleNames(state, me).filter((n) => !shown.has(n));
  return [
    question,
    '',
    'SINCE YOUR LAST MESSAGE',
    history.logText(since, mark),
    '',
    'NOW',
    planView(state, me, { oracle, landsPlayed }),
    ...(offersSection({ state, me, oracle, offers, attackers })),
    '',
    'CARD TEXT (cards not shown before)',
    cardTextBlock(fresh, oracle),
    '',
    question,
    REPLY_REMINDER,
  ].join('\n');
}

/** "1. play land Island (done)  2. cast Shock (not done)" -- a plan as the model wrote it, with progress. */
export function planProgress(plan) {
  if (!plan) return 'none';
  return plan.steps.map((s, i) => `${s.n}. ${s.raw}${i < plan.i ? ' (done)' : ''}`).join('; ');
}
