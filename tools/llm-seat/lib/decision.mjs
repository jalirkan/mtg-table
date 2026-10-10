// mtg-table — tools/llm-seat/lib/decision.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ONE DECISION, AS THE MODEL SEES IT: an `input` (with the `state` it belongs
// to) or an `ask`, turned into a numbered list of the options the ENGINE
// offers, the wire moves each option makes, the safe default, and whether the
// decision goes to the model at all (Justin's "common sense" rule, D418):
//
//   - every engine question goes to the model -- asks (targets, choices,
//     confirms, ability menus), the mulligan, the attack and the block
//     declarations, a selection the engine asks for -- EXCEPT one with exactly
//     one legal answer;
//   - priority with nothing to play (no `state.playable` entry, M61, and no
//     `state.activatable` entry, M63 -- or, on an older engine, no permanent
//     whose card text has a non-mana activated ability) is passed with no call;
//   - mana payment is the engine's own Auto (`buttonOk`), never a call.
//
// The option list is the engine's: `state.playable` (M61) at priority, the
// ask's own options, `input.selectable` for a selection.  Two lists are not
// on the wire and are read off the board instead -- the attack candidates
// (your untapped creatures without summoning sickness, or with haste) and the
// block pairs (your untapped creatures x the attackers in `state.combat`):
// InputAttack / InputBlock never call setSelectables (§4.1, M8).  Forge stays
// the judge: a click it will not take is a `notice`, and the seat moves on.
//
// Pure: no socket, no clock.  `classify` is used by the live seat and by the
// replay (positions) mode alike, so a position is posed exactly as live.

import { cardsById, hasKeyword, isCreature, isLand, nameOf, playersOf, relTurn } from './frames.mjs';
import { hasNonManaActivated, needsTap } from './oracle.mjs';
import { delveCount, delvePick, optionalCostPayable } from './mana.mjs';

/** A card in one line: name [id], cost, type, P/T, the facts the wire carries. */
export function describeCard(c, { withCost = true } = {}) {
  if (!c) return '(unknown card)';
  if (c.hidden === true) return `a hidden card [${c.id}]`;
  if (c.faceDown === true && !nameOf(c)) return `a face-down card [${c.id}]${c.power != null ? ` ${c.power}/${c.toughness}` : ''}`;
  const parts = [`${nameOf(c) ?? '?'} [${c.id}]`];
  if (withCost && c.manaCost) parts.push(c.manaCost);
  if (c.types) parts.push(c.types);
  if (c.power != null && c.toughness != null) parts.push(`${c.power}/${c.toughness}`);
  if (c.loyalty != null) parts.push(`loyalty ${c.loyalty}`);
  const flags = [];
  if (c.tapped) flags.push('tapped');
  if (c.sick && isCreature(c) && c.zone === 'battlefield') flags.push('summoning sick');
  if (c.attacking) flags.push('attacking');
  if (c.blocking) flags.push('blocking');
  if (c.damage) flags.push(`damage ${c.damage}`);
  for (const [k, v] of Object.entries(c.counters ?? {})) flags.push(`${k} counter x${v}`);
  if (Array.isArray(c.keywords) && c.keywords.length) flags.push(c.keywords.map((k) => k.toLowerCase().replace(/_/g, ' ')).join(', '));
  if (c.attachedToId != null) flags.push(`attached to [${c.attachedToId}]`);
  if (c.token) flags.push('token');
  if (flags.length) parts.push(`(${flags.join('; ')})`);
  return parts.join(' ');
}

const firstLine = (s) => String(s ?? '').split('\n')[0].trim();

const isBlack = (c) => {
  if (hasKeyword(c, 'DEVOID')) return false;
  if (!c?.manaCost) return null;   // a token, a land: its colour is not on the wire
  return /\{[^}]*B[^}]*\}/.test(c.manaCost);
};

/**
 * Why `blocker` cannot block `attacker` by the evasion keywords the wire
 * carries (flying / reach, shadow, horsemanship, fear, skulk): {rule, why} in
 * words, or null when nothing on the wire rules it out.  A HINT, as the mana
 * words are: a "can't block" effect is not on the wire, and Forge stays the
 * judge.
 */
export function blockRule(attacker, blocker) {
  if (!attacker || !blocker) return null;
  const a = nameOf(attacker) ?? 'the attacker';
  const b = nameOf(blocker) ?? 'your creature';
  const kw = (c, k) => hasKeyword(c, k);
  if (kw(attacker, 'FLYING') && !kw(blocker, 'FLYING') && !kw(blocker, 'REACH')) {
    return { rule: 'flying', why: `${a} has flying and ${b} has neither flying nor reach` };
  }
  if (kw(attacker, 'SHADOW') && !kw(blocker, 'SHADOW')) return { rule: 'shadow', why: `${a} has shadow and ${b} does not` };
  if (kw(blocker, 'SHADOW') && !kw(attacker, 'SHADOW')) return { rule: 'shadow', why: `${b} has shadow, so it can block only creatures with shadow` };
  if (kw(attacker, 'HORSEMANSHIP') && !kw(blocker, 'HORSEMANSHIP')) return { rule: 'horsemanship', why: `${a} has horsemanship and ${b} does not` };
  if (kw(attacker, 'FEAR') && !/\bArtifact\b/.test(String(blocker.types ?? '')) && isBlack(blocker) === false) {
    return { rule: 'fear', why: `${a} has fear: only artifact or black creatures can block it, and ${b} is neither` };
  }
  if (kw(attacker, 'SKULK') && Number(blocker.power) > Number(attacker.power)) {
    return { rule: 'skulk', why: `${a} has skulk: no creature with greater power can block it (${b} has ${blocker.power}, ${a} ${attacker.power})` };
  }
  return null;
}

/** blockRule's words only. */
export const blockProblem = (attacker, blocker) => blockRule(attacker, blocker)?.why ?? null;

/** "Eldrazi Spawn Token cannot block Vampire Nighthawk, Mulldrifter (flying)" -- one clause per blocker. */
export function unblockableWords(d, cards) {
  const byBlocker = new Map();
  for (const u of d.unblockable ?? []) {
    if (!byBlocker.has(u.blockerId)) byBlocker.set(u.blockerId, []);
    byBlocker.get(u.blockerId).push(u);
  }
  const nm = (id) => nameOf(cards.get(id)) ?? `card ${id}`;
  return [...byBlocker.entries()]
    .map(([b, us]) => `${nm(b)} cannot block ${us.map((u) => nm(u.attackerId)).join(', ')} (${[...new Set(us.map((u) => u.rule))].join(', ')})`)
    .join('; ');
}

/** The key a queued move is bound to: the same decision, re-pushed, keeps it; a new one drops it. */
export function inputBinding(kind, input) {
  if (kind === 'attack' || kind === 'block') return kind;
  return `${kind}|${firstLine(input?.prompt)}`;
}

function act(action, extra = {}) { return { type: 'act', action, ...extra }; }
function answer(askId, value) { return { type: 'answer', askId, value }; }

function decisionBase(fields) {
  return {
    options: [], min: 1, max: 1, multi: false, auto: null, fallback: [1], gradeType: null,
    context: [], ...fields,
  };
}

/** Wraps a decision that has only one legal answer, or none worth asking about. */
function autoOf(d, reason, moves) {
  d.auto = { reason, moves };
  return d;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function inputKindOf(input, state, me) {
  const prompt = String(input?.prompt ?? '');
  const ok = input?.buttons?.ok ?? {};
  const cancel = input?.buttons?.cancel ?? {};
  const sel = input?.selectable ?? {};
  const cardIds = Array.isArray(sel.cardIds) ? sel.cardIds : [];
  if (/^Waiting for\b/.test(prompt) || /^Yielding\b/.test(prompt)) return 'wait';
  // Forge re-pushes the last prompt while it works (awaitNextInput): a priority prompt
  // whose state no longer gives this seat priority is that echo, not a question.
  if (/^Priority:/.test(prompt) && state?.priority !== me) return 'wait';
  if (/Pay Mana Cost/.test(prompt) || ok.label === 'Auto') return 'pay';
  if (prompt.startsWith('Select creatures to attack')) return 'attack';
  if (prompt.startsWith('Select creatures to block')) return 'block';
  if (/\bkeep\b/i.test(prompt) && ok.enabled && cancel.enabled && !prompt.startsWith('Priority')) return 'mulligan';
  if ((sel.mode === 'cards' && cardIds.length > 0) || sel.mode === 'players') return 'select';
  // a player target can come with mode "none" and nothing listed (s20 Thought Scour)
  if (/\bSelect\b[^\n]*\btarget (player|opponent)\b/i.test(prompt) && (sel.min ?? 0) > 0) return 'select';
  if (/^Priority:/.test(prompt) && state?.priority === me && ok.enabled) return 'priority';
  if (!ok.enabled && !cancel.enabled) return 'wait';
  if (/\btarget\b/i.test(prompt) && !ok.enabled) return 'target-wait';
  return 'buttons';
}

/**
 * classify({state, input, me, oracle, intentFor, opts}) for an input; see the
 * file header.  The battlefield's activations are `state.activatable` (M63)
 * when the frame carries the key; on an older engine `opts.battlefieldAbilities`
 * (default true) offers your permanents whose oracle text has a non-mana
 * activated ability.
 */
export function classifyInput({ state, input, me, oracle, opts = {} }) {
  const kind = inputKindOf(input, state, me);
  const prompt = String(input?.prompt ?? '');
  const ok = input?.buttons?.ok ?? {};
  const cancel = input?.buttons?.cancel ?? {};
  const cards = cardsById(state);
  const { mine, opp } = playersOf(state, me);
  const d = decisionBase({ source: 'input', kind, prompt, bind: inputBinding(kind, input) });

  switch (kind) {
    case 'wait':
      return autoOf(d, 'not this seat\'s decision', []);
    case 'pay':
      return autoOf(d, 'mana payment: the engine\'s Auto', ok.enabled ? [act('buttonOk')] : cancel.enabled ? [act('buttonCancel')] : []);
    case 'target-wait':
      // a targeting prompt whose selectables have not arrived yet: wait (the seat's stall timer cancels it)
      return autoOf(d, 'targeting prompt without a selection yet', []);
    case 'priority': {
      d.options.push({ label: 'Pass priority (do nothing now)', moves: [act('passPriority')], token: 'pass', isDefault: true });
      const own = state.activePlayer === me;
      const main = state.phase === 'MAIN1' || state.phase === 'MAIN2';
      const stackEmpty = !Array.isArray(state.stack) || state.stack.length === 0;
      if (Array.isArray(state.playable)) {
        for (const e of state.playable) {
          const c = cards.get(e.cardId);
          const abilities = Array.isArray(e.abilities) ? e.abilities : [];
          for (const ab of abilities) {
            // a land in hand plays, unless the ability is another one (Ash Barrens' landcycling, cf4)
            const land = isLand(c) && ab.isSpell === false && e.zone === 'hand' && !/cycling|channel|:|\{/i.test(String(ab.label ?? ''));
            const verb = land ? 'Play land' : ab.isSpell ? 'Cast' : 'Activate';
            const where = e.zone === 'hand' ? '' : ` from ${e.zone}`;
            const label = `${verb} ${describeCard(c)}${where}${abilities.length > 1 || !ab.isSpell ? ` -- ${String(ab.label ?? '').slice(0, 160)}` : ''}`;
            d.options.push({
              label, moves: [act('clickCard', { cardId: e.cardId })], cardId: e.cardId, zone: e.zone, verb: land ? 'land' : ab.isSpell ? 'cast' : 'activate',
              intent: { cardId: e.cardId, abilityId: ab.abilityId, abilityLabel: String(ab.label ?? '') },
              token: e.zone === 'hand' ? (land ? `land:${e.cardId}` : ab.isSpell ? `cast:${e.cardId}` : null) : null,
            });
          }
        }
      } else if (mine) {
        // An engine older than M61 (or a recording made before it): the seat's
        // hand -- everything at its own main phase with an empty stack, else
        // only Instants and FLASH cards -- and Forge says no to what it will not take.
        const sorcerySpeed = own && main && stackEmpty;
        for (const c of mine.zones?.hand?.cards ?? []) {
          if (c.hidden === true || typeof c.id !== 'number') continue;
          if (isLand(c)) {
            if (sorcerySpeed) d.options.push({ label: `Play land ${describeCard(c)}`, moves: [act('clickCard', { cardId: c.id })], token: `land:${c.id}`, cardId: c.id, zone: 'hand', verb: 'land', legacy: true });
          } else if (sorcerySpeed || /\bInstant\b/.test(String(c.types ?? '')) || hasKeyword(c, 'FLASH')) {
            d.options.push({ label: `Cast ${describeCard(c)}`, moves: [act('clickCard', { cardId: c.id })], token: `cast:${c.id}`, cardId: c.id, zone: 'hand', verb: 'cast', legacy: true });
          }
        }
        if (d.options.length > 1) d.context.push('(This engine does not list what is playable now: the cards below are your hand, and the engine refuses what you cannot play or pay for.)');
      }
      if (state.activatable !== undefined) {
        // M63 (D420): the engine's own list of what the seat's permanents can
        // activate now -- one option per ability, labelled with the engine's
        // label.  The click is the permanent; the ability menu that may follow
        // is answered from `intent` (classifyAsk).  No card-text guessing: a
        // permanent the engine does not list is not offered (null: none now).
        for (const e of Array.isArray(state.activatable) ? state.activatable : []) {
          const c = cards.get(e.cardId);
          const abilities = Array.isArray(e.abilities) ? e.abilities : [];
          for (const ab of abilities) {
            const abilityLabel = String(ab.label ?? '');
            d.options.push({
              label: `Activate ${describeCard(c)} -- ${abilityLabel.slice(0, 160)}`,
              moves: [act('clickCard', { cardId: e.cardId })], token: null, cardId: e.cardId, zone: 'battlefield', verb: 'activate',
              intent: { cardId: e.cardId, abilityId: ab.abilityId, abilityLabel }, abilityLabel, abilityCount: abilities.length, engine: true,
            });
          }
        }
      } else if (opts.battlefieldAbilities !== false && mine && oracle) {
        // An engine older than M63 (or a recording made before it): a HINT from
        // the card text; Forge lists the abilities it allows on the click.
        for (const c of mine.zones?.battlefield?.cards ?? []) {
          if (c.hidden === true || c.controller !== me) continue;
          const text = nameOf(c) ? oracle.text(nameOf(c)) : null;
          if (!hasNonManaActivated(text)) continue;
          if (c.tapped && needsTap(text)) continue;
          d.options.push({ label: `Activate an ability of ${describeCard(c)} (the engine lists the ones it allows)`, moves: [act('clickCard', { cardId: c.id })], token: null, cardId: c.id, zone: 'battlefield', verb: 'activate' });
        }
      }
      d.options.forEach((o, i) => { o.n = i + 1; });
      if (own && main && stackEmpty) d.gradeType = 'spell';
      if (d.options.length === 1) return autoOf(d, 'priority with nothing playable', d.options[0].moves);
      return d;
    }
    case 'mulligan': {
      d.options.push({ n: 1, label: `${ok.label} (keep this hand)`, moves: [act('buttonOk')], isDefault: true, token: 'keep' });
      d.options.push({ n: 2, label: `${cancel.label} (mulligan)`, moves: [act('buttonCancel')], token: 'mulligan' });
      return d;
    }
    case 'attack': {
      const cands = (mine?.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true && c.controller === me
        && isCreature(c) && !c.tapped && (!c.sick || hasKeyword(c, 'HASTE')));
      d.options.push({ n: 1, label: 'No attack', isDefault: true, none: true });
      cands.forEach((c, i) => d.options.push({ n: i + 2, label: `Attack with ${describeCard(c)}`, cardId: c.id }));
      d.multi = true; d.min = 1; d.max = d.options.length - 1 || 1;
      d.current = cands.filter((c) => c.attacking).map((c) => c.id);
      d.gradeType = 'attack';
      if (cands.length === 0) return autoOf(d, 'no creature can attack', [act('buttonOk')]);
      return d;
    }
    case 'block': {
      const attackers = [];
      for (const band of state?.combat?.bands ?? []) for (const id of band.attackerIds ?? []) attackers.push(id);
      const blockers = (mine?.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true && c.controller === me && isCreature(c) && !c.tapped);
      d.options.push({ n: 1, label: 'No blocks', isDefault: true, none: true });
      d.attackerIds = attackers;
      d.blockerIds = blockers.map((b) => b.id);
      // The two lists once, the pairs by name and id: a pair list grows as attackers x blockers.
      d.context.push(`Attackers: ${attackers.map((a) => describeCard(cards.get(a))).join('; ')}`);
      d.context.push(`Your untapped creatures: ${blockers.map((b) => describeCard(b)).join('; ')}`);
      const short = (c, id) => `${nameOf(c) ?? 'a hidden card'} [${id}]`;
      // a pair the evasion keywords on the wire rule out is not offered (m20-search-p15:
      // the Eldrazi Spawn token was sent to block Vampire Nighthawk, which flies)
      d.unblockable = [];
      for (const a of attackers) {
        for (const b of blockers) {
          const no = blockRule(cards.get(a), b);
          if (no) { d.unblockable.push({ attackerId: a, blockerId: b.id, ...no }); continue; }
          d.options.push({ n: d.options.length + 1, label: `Block ${short(cards.get(a), a)} with ${short(b, b.id)}`, attackerId: a, blockerId: b.id });
        }
      }
      if (d.unblockable.length) d.context.push(`Blocks the rules rule out: ${unblockableWords(d, cards)}`);
      d.multi = true; d.min = 1; d.max = Math.max(1, blockers.length);
      d.gradeType = 'block';
      if (attackers.length === 0 || blockers.length === 0) return autoOf(d, 'no possible block', [act('buttonOk')]);
      if (d.options.length === 1) return autoOf(d, 'no possible block: no creature of yours can block any attacker (flying, …)', [act('buttonOk')]);
      return d;
    }
    case 'select': {
      const sel = input.selectable ?? {};
      const ids = (sel.cardIds ?? []).filter((x) => typeof x === 'number');
      const selMin = typeof sel.min === 'number' ? sel.min : 0;
      const selMax = typeof sel.max === 'number' && sel.max > 0 ? sel.max : ids.length;
      // "Select any target" comes with mode "cards" and only the cards listed:
      // the players are legal too but not on the wire (s20: a Walking Ballista
      // ping at the opponent clicked the only card listed, the Ballista itself).
      // Offer both players when the prompt allows a player; Forge refuses a
      // click it will not take.
      const playerWords = /any target|target player|target opponent|player or planeswalker|creature or player|player, planeswalker|each opponent|any player/i;
      if (sel.mode === 'players' || (/\bSelect\b[^\n]*\btarget\b/i.test(String(input.prompt ?? '')) && playerWords.test(String(input.prompt ?? '')))) {
        for (const p of state?.players ?? []) {
          d.options.push({ label: `${p.id === me ? 'You' : 'Opponent'} (player ${p.id}, ${p.name})`, moves: [act('clickPlayer', { playerId: p.id })], token: `target:player${p.id}` });
        }
      }
      for (const id of ids) {
        const c = cards.get(id) ?? (input.focusCard?.id === id ? input.focusCard : null);
        d.options.push({ label: describeCard(c ?? { id, name: `card ${id}` }), moves: [act('clickCard', { cardId: id })], cardId: id, token: `target:${id}` });
      }
      const single = selMax <= 1;
      if (single) {
        if (ok.enabled && selMin === 0) d.options.push({ label: `${ok.label} (choose nothing)`, moves: [act('buttonOk')], isDefault: true, button: true });
        if (cancel.enabled) d.options.push({ label: `${cancel.label}`, moves: [act('buttonCancel')], button: true, isDefault: !ok.enabled || selMin > 0 });
        d.options.forEach((o, i) => { o.n = i + 1; });
        const def = d.options.find((o) => o.isDefault);
        d.fallback = [def ? def.n : 1];
        if (/\btarget\b/i.test(prompt)) d.gradeType = 'target';
        const choosable = d.options.filter((o) => !o.button);
        if (d.options.length === 1) return autoOf(d, 'one legal choice', d.options[0].moves);
        if (choosable.length === 1 && d.options.every((o) => !o.button || o.moves[0].action === 'buttonCancel') && selMin >= 1) {
          return autoOf(d, 'one legal target', choosable[0].moves);
        }
        return d;
      }
      d.options.forEach((o, i) => { o.n = i + 1; });
      d.multi = true; d.min = Math.max(0, selMin); d.max = Math.min(selMax, d.options.length);
      d.okAfter = true;
      d.fallback = d.options.slice(0, d.min).map((o) => o.n);
      if (d.min === d.options.length && d.max === d.min) return autoOf(d, 'all must be chosen', movesFor(d, d.fallback));
      return d;
    }
    case 'buttons':
    default: {
      // the London mulligan's bottom: Forge takes clicks on hand cards but lists none (mode none), so
      // the seat offers its hand (m20: only "Auto" was offered and the model's choice was ignored)
      const bottom = /^Return (\d+) card\(s\) to the bottom of your library/i.exec(prompt);
      const hand = (mine?.zones?.hand?.cards ?? []).filter((c) => c.hidden !== true && typeof c.id === 'number');
      if (bottom && hand.length > Number(bottom[1])) {
        const k = Number(bottom[1]);
        hand.forEach((c, i) => d.options.push({ n: i + 1, label: describeCard(c), moves: [act('clickCard', { cardId: c.id })], cardId: c.id, token: `bottom:${c.id}` }));
        d.multi = true; d.min = k; d.max = k; d.okAfter = true;
        d.fallback = d.options.slice(0, k).map((o) => o.n);   // only after two unusable replies
        return d;
      }
      if (ok.enabled) d.options.push({ label: String(ok.label ?? 'OK'), moves: [act('buttonOk')], isDefault: true, button: true });
      if (cancel.enabled) d.options.push({ label: String(cancel.label ?? 'Cancel'), moves: [act('buttonCancel')], button: true });
      d.options.forEach((o, i) => { o.n = i + 1; });
      if (d.options.length <= 1) return autoOf(d, 'one button', d.options[0]?.moves ?? []);
      return d;
    }
  }
}

// ---------------------------------------------------------------------------
// Asks (§5)
// ---------------------------------------------------------------------------

const len = (a) => (Array.isArray(a) ? a.length : 0);
const indices = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

function optionLabel(o, cards) {
  // a mode or ability is its own text, not its card's name (cg1: The Mightstone and Weakstone's two modes)
  if (o.kind === 'ability' && o.label) return String(o.label);
  const c = o.card ?? (typeof o.cardId === 'number' ? cards.get(o.cardId) : null);
  if (c) return describeCard(c);
  if (typeof o.playerId === 'number') return `player ${o.playerId} (${o.label})`;
  return String(o.label ?? `option ${o.id}`);
}

/** The bridge's own non-null default for the kinds the model is not asked (ws-auto-play's answerFor). */
export function defaultAnswer(kind, body) {
  switch (kind) {
    case 'order': {
      const dest = len(body.dest), source = len(body.source), total = dest + source;
      const min = typeof body.min === 'number' ? body.min : null, max = typeof body.max === 'number' ? body.max : null;
      let lo = max !== null && max >= 0 ? total - max : 0;
      let hi = min !== null && min >= 0 ? total - min : total;
      lo = Math.max(0, Math.min(lo, total)); hi = Math.max(lo, Math.min(hi, total));
      return { ordered: indices(Math.max(lo, Math.min(dest, hi))), remember: false };
    }
    case 'manipulate_list': return indices(len(body.cards));
    case 'sideboard': return indices(len(body.main));
    case 'assign_damage': {
      // §5.3 says null lets Forge assign, but with blockers and overrideOrder the
      // engine asked again 9,400 times in a row (s20-plain-p10, pauper, two
      // blockers). So assign explicitly: lethal to each blocker in order, the
      // rest to the last blocker; with no blocker, all of it to the defender
      // (index 0). The values sum to `total`.
      const total = typeof body.total === 'number' ? body.total : 0;
      const ts = Array.isArray(body.targets) ? body.targets : [];
      const blockers = ts.map((t, i) => ({ t, i })).filter(({ t }) => t.defender !== true);
      if (total <= 0) return null;
      if (blockers.length === 0) return { 0: total };
      const out = {};
      let left = total;
      for (const { t, i } of blockers) {
        if (left <= 0) break;
        const want = typeof t.lethal === 'number' && t.lethal > 0 ? t.lethal : left;
        const give = Math.min(want, left);
        out[i] = give;
        left -= give;
      }
      if (left > 0) { const last = blockers[blockers.length - 1].i; out[last] = (out[last] ?? 0) + left; }
      return out;
    }
    case 'assign_amount': {
      const n = len(body.targets);
      return n === 0 || typeof body.total !== 'number' ? null : { 0: body.total };
    }
    case 'text': return body.numeric === true ? null : '';   // §5.4 / M25 / M29
    default: return null;
  }
}

/**
 * `delve` = {casting, reserve, keep}: the spell being cast, the mana the plan
 * keeps for later, the graveyard cards the engine last listed as playable
 * (plan mode passes them; without, delve takes as many as allowed).
 */
export function classifyAsk({ state, ask, intent = null, me = null, oracle = null, delve = null }) {
  const kind = String(ask.kind);
  const askId = String(ask.askId);
  const cards = cardsById(state);
  const d = decisionBase({ source: 'ask', kind: `ask:${kind}`, prompt: String(ask.prompt ?? ask.title ?? ''), askId, cardId: ask.cardId ?? null });
  switch (kind) {
    case 'ability_menu': {
      const opts = Array.isArray(ask.options) ? ask.options : [];
      const playable = opts.some((o) => o.canPlay === true) ? opts.filter((o) => o.canPlay !== false) : opts;
      if (intent && intent.cardId === ask.cardId) {
        // M61: abilityId is the frame's own (an alternative cost is a fresh copy), so the label decides a mismatch
        const hit = playable.find((o) => o.abilityId === intent.abilityId) ?? playable.find((o) => intent.abilityLabel && o.label === intent.abilityLabel);
        if (hit) return autoOf(d, 'the ability chosen at priority', [answer(askId, hit.id)]);
      }
      d.prompt = d.prompt || `Choose an ability of ${describeCard(cards.get(ask.cardId))}`;
      playable.forEach((o, i) => d.options.push({ n: i + 1, label: String(o.label ?? `ability ${o.abilityId}`), value: o.id, isSpell: o.isSpell === true }));
      d.options.push({ n: d.options.length + 1, label: 'Never mind (play nothing)', value: null, isDefault: true });
      d.fallback = [d.options.length];
      if (playable.length === 1) return autoOf(d, 'one ability', [answer(askId, playable[0].id)]);
      if (playable.length === 0) return autoOf(d, 'no ability', [answer(askId, null)]);
      return d;
    }
    case 'confirm': {
      d.options.push({ n: 1, label: String(ask.yesLabel ?? 'Yes'), value: true, isDefault: ask.defaultYes === true });
      d.options.push({ n: 2, label: String(ask.noLabel ?? 'No'), value: false, isDefault: ask.defaultYes !== true });
      d.fallback = [ask.defaultYes === true ? 1 : 2];
      if (ask.card) d.context.push(`About: ${describeCard(ask.card)}`);
      return d;
    }
    case 'options': {
      const opts = Array.isArray(ask.options) ? ask.options : [];
      opts.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: o.id }));
      const di = typeof ask.defaultIndex === 'number' && ask.defaultIndex >= 0 && ask.defaultIndex < opts.length ? ask.defaultIndex : 0;
      d.fallback = [di + 1];
      if (opts.length <= 1) return autoOf(d, 'one option', [answer(askId, opts.length ? opts[0].id : null)]);
      return d;
    }
    case 'choose_list':
    case 'choose_entities': {
      let opts = Array.isArray(ask.options) ? ask.options : [];
      if (/^Delve how many cards\?/i.test(String(ask.prompt ?? ''))) {
        // paying a delve cost: the seat's, like the rest of the mana (mana.mjs delveCount)
        const nums = opts.map((o) => ({ o, n: Number(o.label) })).filter((x) => Number.isInteger(x.n));
        if (nums.length) {
          const max = Math.max(...nums.map((x) => x.n));
          const { n, why } = delveCount({ maxOption: max, casting: delve?.casting ?? null, reserve: delve?.reserve ?? 0, state, me, oracle });
          const hit = nums.find((x) => x.n === n) ?? nums.find((x) => x.n === max);
          d.delve = { n: hit.n, max };
          return autoOf(d, `delve: exile ${hit.n} card${hit.n === 1 ? '' : 's'} (${why})`, [answer(askId, [hit.o.id])]);
        }
      }
      if (/^Exile which card\s*\(\d+\s*\/\s*\d+\)\?/i.test(String(ask.prompt ?? ''))) {
        // one card of a delve: never "none", which would clear the whole delve
        const pick = delvePick(opts, cards, delve?.keep ?? new Set());
        if (pick) return autoOf(d, `delve: exile ${optionLabel(pick, cards)}`, [answer(askId, [pick.id])]);
      }
      if (kind === 'choose_list' && me !== null && /optional cost/i.test(String(ask.prompt ?? '')) && !(typeof ask.min === 'number' && ask.min > 0)) {
        // an optional cost the seat cannot pay is never offered: choosing it cancels the cast (the 1,900-cast loop)
        const payable = opts.filter((o) => optionalCostPayable(o.label, state, me, oracle) !== false);
        if (payable.length < opts.length) d.context.push(`(Not offered, you cannot pay it now: ${opts.filter((o) => !payable.includes(o)).map((o) => String(o.label).split(' – ')[0]).join('; ')})`);
        if (payable.length === 0) return autoOf(d, 'optional costs: none can be paid now', [answer(askId, [])]);
        opts = payable;
      }
      const n = opts.length;
      if (kind === 'choose_list' && ask.reveal === true) return autoOf(d, 'a reveal: acknowledge', [answer(askId, [])]);
      const min = typeof ask.min === 'number' && ask.min > 0 ? Math.min(ask.min, n) : 0;
      const max = typeof ask.max === 'number' && ask.max >= 0 ? Math.min(ask.max, n) : n;
      if (ask.delayedReveal && Array.isArray(ask.delayedReveal.cards)) {
        d.context.push(`Looking at: ${ask.delayedReveal.cards.map((c) => describeCard(c)).join('; ')}`);
      }
      if (n === 0 || max === 0) return autoOf(d, 'nothing to choose', [answer(askId, [])]);
      if (min === n) return autoOf(d, 'all must be chosen', [answer(askId, indices(n))]);
      if (max <= 1) {
        opts.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: [o.id], cardId: o.cardId, cardName: o.card?.name ?? null, mode: o.kind === 'ability' }));
        if (min === 0) d.options.push({ n: n + 1, label: 'None', value: [], isDefault: true });
        d.fallback = [min === 0 ? n + 1 : 1];
        if (n === 1 && min === 1) return autoOf(d, 'one option', [answer(askId, [opts[0].id])]);
        return d;
      }
      opts.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: o.id, cardId: o.cardId, cardName: o.card?.name ?? null, mode: o.kind === 'ability' }));
      d.multi = true; d.min = min; d.max = max; d.answerList = true;
      d.fallback = indices(min).map((i) => i + 1);
      return d;
    }
    case 'order': {
      // Scry / Ponder-style "put on the bottom": the model's decision (sk2: it
      // was answered "none" by default). Arranging the top order stays the
      // engine's default.
      const src = Array.isArray(ask.source) ? ask.source : [];
      const anyCount = !(typeof ask.min === 'number' && ask.min > 0) && !(typeof ask.max === 'number' && ask.max >= 0 && ask.max < src.length);
      if (/put on the bottom/i.test(String(ask.prompt ?? '')) && src.length > 0 && anyCount && (ask.dest ?? []).length === 0) {
        src.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: o.id, cardId: o.cardId }));
        d.options.push({ n: src.length + 1, label: 'None (keep them all on top)', value: null, none: true, isDefault: true });
        d.multi = true; d.min = 1; d.max = src.length; d.answerOrder = true;
        d.fallback = [src.length + 1];
        return d;
      }
      return autoOf(d, `${kind}: the engine's default (not offered to the model)`, [answer(askId, defaultAnswer(kind, ask))]);
    }
    default:
      return autoOf(d, `${kind}: the engine's default (not offered to the model)`, [answer(askId, defaultAnswer(kind, ask))]);
  }
}

// ---------------------------------------------------------------------------
// From a validated choice to the moves on the wire
// ---------------------------------------------------------------------------

/** The moves for a choice (option numbers, validated). `d.current` = attackers already declared. */
export function movesFor(d, chosen) {
  const opt = (n) => d.options[n - 1];
  if (d.source === 'ask') {
    if (d.answerOrder) return [answer(d.askId, { ordered: chosen.filter((n) => !opt(n).none).map((n) => opt(n).value), remember: false })];
    if (d.answerList) return [answer(d.askId, chosen.map((n) => opt(n).value))];
    return [answer(d.askId, opt(chosen[0]).value)];
  }
  if (d.kind === 'attack') {
    const want = new Set(chosen.filter((n) => !opt(n).none).map((n) => opt(n).cardId));
    const have = new Set(d.current ?? []);
    const clicks = [...new Set([...want, ...have])].filter((id) => want.has(id) !== have.has(id)).sort((a, b) => a - b);
    return [...clicks.map((id) => act('clickCard', { cardId: id })), act('buttonOk')];
  }
  if (d.kind === 'block') {
    const pairs = chosen.filter((n) => !opt(n).none).map((n) => opt(n))
      .sort((x, y) => x.attackerId - y.attackerId || x.blockerId - y.blockerId);
    // Blocks already declared in this declaration (d.declared, kept by the seat:
    // the state does not show them until the declaration ends) stay declared in
    // Forge, and a click on one again takes it back: so a block wanted and
    // declared is not clicked, and one declared but not wanted is clicked off
    // (m20-search-p15: the Dragon's block from a half-refused try made the next
    // try's "block Mulldrifter with Amethyst Dragon" a "cannot be selected").
    const declared = Array.isArray(d.declared) ? d.declared : [];
    const same = (x, y) => x.attackerId === y.attackerId && x.blockerId === y.blockerId;
    const out = [];
    for (const p of declared) if (!pairs.some((q) => same(p, q))) out.push(act('clickCard', { cardId: p.attackerId }), act('clickCard', { cardId: p.blockerId }));
    for (const p of pairs) if (!declared.some((q) => same(p, q))) out.push(act('clickCard', { cardId: p.attackerId }), act('clickCard', { cardId: p.blockerId }));
    out.push(act('buttonOk'));
    return out;
  }
  if (d.multi) {
    const out = chosen.flatMap((n) => opt(n).moves);
    if (d.okAfter) out.push(act('buttonOk'));
    return out;
  }
  return opt(chosen[0]).moves;
}

/** The coach-grade token for a choice (D334's spelling), or null where the grader has no type. */
export function tokenFor(d, chosen) {
  if (!d.gradeType) return null;
  const opt = (n) => d.options[n - 1];
  if (d.kind === 'attack') {
    const ids = chosen.filter((n) => !opt(n).none).map((n) => opt(n).cardId).sort((a, b) => a - b);
    return ids.length ? `attack:${ids.join(',')}` : 'attack:none';
  }
  if (d.kind === 'block') {
    const ps = chosen.filter((n) => !opt(n).none).map((n) => opt(n)).sort((x, y) => x.attackerId - y.attackerId || x.blockerId - y.blockerId);
    return ps.length ? `block:${ps.map((p) => `${p.blockerId}>${p.attackerId}`).join(',')}` : 'block:none';
  }
  if (chosen.length !== 1) return null;
  return opt(chosen[0]).token ?? null;
}

/** Validates a choice: option numbers in range, no duplicates, a size the decision allows. Returns an error or null. */
export function checkChoice(d, chosen) {
  if (!Array.isArray(chosen)) return 'no option chosen';
  if (chosen.length === 0) {
    return d.multi && d.min === 0 && d.kind !== 'attack' && d.kind !== 'block' ? null : 'no option chosen';
  }
  const n = d.options.length;
  for (const c of chosen) if (!Number.isInteger(c) || c < 1 || c > n) return `option ${c} is not one of 1-${n}`;
  if (new Set(chosen).size !== chosen.length) return 'an option is named twice';
  if (!d.multi) return chosen.length === 1 ? null : 'choose exactly one option';
  const nones = chosen.filter((c) => d.options[c - 1].none);
  if (nones.length && chosen.length > 1) return `"${d.options[nones[0] - 1].label}" cannot be combined with other options`;
  if (d.kind === 'attack' || d.kind === 'block') {
    if (d.kind === 'block') {
      const used = new Set();
      for (const c of chosen) {
        const o = d.options[c - 1];
        if (o.none) continue;
        if (used.has(o.blockerId)) return `creature [${o.blockerId}] can block only one attacker`;
        used.add(o.blockerId);
      }
    }
    return null;
  }
  if (chosen.length < d.min || chosen.length > d.max) {
    const need = d.min === d.max ? `exactly ${d.min}` : `${d.min} to ${d.max}`;
    return `this question needs ${need} choices and you named ${chosen.length}: write one step "choose A, B" naming ${need} of them`;
  }
  return null;
}

export { relTurn };
