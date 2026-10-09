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
//     permanent with a non-mana activated ability) is passed with no call;
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
  if (/^Priority:/.test(prompt) && state?.priority === me && ok.enabled) return 'priority';
  if (!ok.enabled && !cancel.enabled) return 'wait';
  if (/\btarget\b/i.test(prompt) && !ok.enabled) return 'target-wait';
  return 'buttons';
}

/**
 * classify({state, input, me, oracle, intentFor, opts}) for an input; see the
 * file header.  `opts.battlefieldAbilities` (default true) offers your
 * permanents whose oracle text has a non-mana activated ability.
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
            const land = isLand(c) && ab.isSpell === false && e.zone === 'hand';
            const verb = land ? 'Play land' : ab.isSpell ? 'Cast' : 'Activate';
            const where = e.zone === 'hand' ? '' : ` from ${e.zone}`;
            const label = `${verb} ${describeCard(c)}${where}${abilities.length > 1 || !ab.isSpell ? ` -- ${String(ab.label ?? '').slice(0, 160)}` : ''}`;
            d.options.push({
              label, moves: [act('clickCard', { cardId: e.cardId })],
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
            if (sorcerySpeed) d.options.push({ label: `Play land ${describeCard(c)}`, moves: [act('clickCard', { cardId: c.id })], token: `land:${c.id}` });
          } else if (sorcerySpeed || /\bInstant\b/.test(String(c.types ?? '')) || hasKeyword(c, 'FLASH')) {
            d.options.push({ label: `Cast ${describeCard(c)}`, moves: [act('clickCard', { cardId: c.id })], token: `cast:${c.id}` });
          }
        }
        if (d.options.length > 1) d.context.push('(This engine does not list what is playable now: the cards below are your hand, and the engine refuses what you cannot play or pay for.)');
      }
      if (opts.battlefieldAbilities !== false && mine && oracle) {
        for (const c of mine.zones?.battlefield?.cards ?? []) {
          if (c.hidden === true || c.controller !== me) continue;
          const text = nameOf(c) ? oracle.text(nameOf(c)) : null;
          if (!hasNonManaActivated(text)) continue;
          if (c.tapped && needsTap(text)) continue;
          d.options.push({ label: `Activate an ability of ${describeCard(c)} (the engine lists the ones it allows)`, moves: [act('clickCard', { cardId: c.id })], token: null });
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
      // The two lists once, the pairs by name and id: a pair list grows as attackers x blockers.
      d.context.push(`Attackers: ${attackers.map((a) => describeCard(cards.get(a))).join('; ')}`);
      d.context.push(`Your untapped creatures: ${blockers.map((b) => describeCard(b)).join('; ')}`);
      const short = (c, id) => `${nameOf(c) ?? 'a hidden card'} [${id}]`;
      for (const a of attackers) {
        for (const b of blockers) {
          d.options.push({ n: d.options.length + 1, label: `Block ${short(cards.get(a), a)} with ${short(b, b.id)}`, attackerId: a, blockerId: b.id });
        }
      }
      d.multi = true; d.min = 1; d.max = Math.max(1, blockers.length);
      d.gradeType = 'block';
      if (attackers.length === 0 || blockers.length === 0) return autoOf(d, 'no possible block', [act('buttonOk')]);
      return d;
    }
    case 'select': {
      const sel = input.selectable ?? {};
      const ids = (sel.cardIds ?? []).filter((x) => typeof x === 'number');
      const selMin = typeof sel.min === 'number' ? sel.min : 0;
      const selMax = typeof sel.max === 'number' && sel.max > 0 ? sel.max : ids.length;
      if (sel.mode === 'players') {
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
    case 'assign_damage': return null;                  // §5.3: null = let Forge assign
    case 'assign_amount': {
      const n = len(body.targets);
      return n === 0 || typeof body.total !== 'number' ? null : { 0: body.total };
    }
    case 'text': return body.numeric === true ? null : '';   // §5.4 / M25 / M29
    default: return null;
  }
}

export function classifyAsk({ state, ask, intent = null }) {
  const kind = String(ask.kind);
  const askId = String(ask.askId);
  const cards = cardsById(state);
  const d = decisionBase({ source: 'ask', kind: `ask:${kind}`, prompt: String(ask.prompt ?? ask.title ?? ''), askId });
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
      playable.forEach((o, i) => d.options.push({ n: i + 1, label: String(o.label ?? `ability ${o.abilityId}`), value: o.id }));
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
      const opts = Array.isArray(ask.options) ? ask.options : [];
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
        opts.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: [o.id], cardId: o.cardId }));
        if (min === 0) d.options.push({ n: n + 1, label: 'None', value: [], isDefault: true });
        d.fallback = [min === 0 ? n + 1 : 1];
        if (n === 1 && min === 1) return autoOf(d, 'one option', [answer(askId, [opts[0].id])]);
        return d;
      }
      opts.forEach((o, i) => d.options.push({ n: i + 1, label: optionLabel(o, cards), value: o.id }));
      d.multi = true; d.min = min; d.max = max; d.answerList = true;
      d.fallback = indices(min).map((i) => i + 1);
      return d;
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
    const out = [];
    for (const p of pairs) out.push(act('clickCard', { cardId: p.attackerId }), act('clickCard', { cardId: p.blockerId }));
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
  if (chosen.length < d.min || chosen.length > d.max) return `choose between ${d.min} and ${d.max} options`;
  return null;
}

export { relTurn };
