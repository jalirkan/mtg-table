// mtg-table — tools/llm-seat/lib/history.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// What the model is told about the game: the redacted event log since the game
// began as compact text, the current state as a table, and the oracle text of
// the cards it can see.  Built from s2c frames only, so it holds exactly what
// the seat was shown (§8.3) -- an id the frame does not resolve is "a hidden
// card", never a guess.  Names are remembered across frames by id: a card the
// seat once saw keeps the name it was shown (an id is stable for the game,
// §3.2), which is information the seat had, not an inference.

import { cardsById, nameOf, playersOf, relTurn } from './frames.mjs';
import { describeCard } from './decision.mjs';

export class History {
  constructor(me = null) {
    this.me = me;
    /** [{turn, who, text}] -- one per event worth telling, in order. */
    this.items = [];
    this.names = new Map();
    this.turn = 0;
    this.turnPlayer = null;
    this.notices = [];
    this.lastState = null;
    this.lastStateSeq = null;
    this.over = null;
  }

  who(player) {
    if (player === null || player === undefined) return 'someone';
    return player === this.me ? 'you' : 'opp';
  }

  name(id, frameCards) {
    const c = frameCards.get(id);
    const n = nameOf(c);
    if (n) return `${n} [${id}]`;
    if (this.names.has(id)) return `${this.names.get(id)} [${id}]`;
    if (c?.faceDown) return `a face-down card [${id}]`;
    return `a hidden card [${id}]`;
  }

  add(text) {
    this.items.push({ turn: this.turn, who: this.who(this.turnPlayer), text });
  }

  /** Feed one frame (s2c or c2s; only s2c is read). */
  push(frame) {
    if (!frame || frame.dir === 'c2s') return;
    const body = frame.body ?? {};
    switch (frame.type) {
      case 'hello_ok':
        if (typeof body.you === 'number') this.me = body.you;
        break;
      case 'notice': {
        // "Your turn" arrives at every priority stop of the seat's own turn: noise
        if (body.title === 'Your turn') break;
        const t = [body.title, body.text].filter((x) => typeof x === 'string' && x !== '').join(': ');
        if (t) this.notices.push(t);
        break;
      }
      case 'over':
        this.over = body;
        break;
      case 'state':
        this.onState(frame);
        break;
      default:
        break;
    }
  }

  onState(frame) {
    const s = frame.body;
    const cards = cardsById(s);
    for (const [id, c] of cards) { const n = nameOf(c); if (n) this.names.set(id, n); }
    // `unstacked` also follows a spell that resolved (GameEventSpellRemovedFromStack): only
    // one with no `resolved` in its own batch left the stack some other way.
    this.resolvedNow = new Set((s.events ?? []).filter((e) => e.kind === 'resolved').map((e) => e.cardId));
    for (const e of s.events ?? []) this.onEvent(e, cards);
    this.lastState = s;
    this.lastStateSeq = frame.seq ?? null;
  }

  onEvent(e, cards) {
    const nm = (id) => this.name(id, cards);
    switch (e.kind) {
      case 'turn':
        this.turn = e.turn;
        this.turnPlayer = e.player;
        this.items.push({ turn: e.turn, who: this.who(e.player), text: null, turnStart: true });
        break;
      case 'mulligan': this.add(`${this.who(e.player)} mulligan`); break;
      case 'land': this.add(`${this.who(e.player)} land ${nm(e.cardId)}`); break;
      case 'cast': this.add(`${this.who(e.controller)} cast ${nm(e.cardId)}`); break;
      case 'resolved': if (e.fizzled) this.add(`${nm(e.cardId)} fizzled`); break;
      case 'unstacked': if (!this.resolvedNow?.has(e.cardId)) this.add(`${nm(e.cardId)} left the stack without resolving (countered?)`); break;
      case 'attackers': {
        const ids = (e.bands ?? []).flatMap((b) => b.attackerIds ?? []);
        if (ids.length) this.add(`${this.who(e.player)} attack: ${ids.map(nm).join(', ')}`);
        break;
      }
      case 'blockers': {
        // M52: an unblocked attacker has []; before M52 the attacker itself is the sentinel.
        const parts = [];
        for (const b of e.blocks ?? []) {
          const bl = (b.blockerIds ?? []).filter((x) => x !== b.attackerId);
          if (bl.length) parts.push(`${bl.map(nm).join(' + ')} blocks ${nm(b.attackerId)}`);
        }
        this.add(parts.length ? `${this.who(e.defendingPlayer)} block: ${parts.join('; ')}` : `${this.who(e.defendingPlayer)} no blocks`);
        break;
      }
      case 'life': this.add(`${this.who(e.player)} life ${e.from}->${e.to}`); break;
      case 'poison': this.add(`${this.who(e.player)} poison ${e.from}->${e.from + e.amount}`); break;
      case 'zone': {
        const from = e.from?.zone, to = e.to?.zone;
        if (from === 'battlefield' && to === 'graveyard') this.add(`${nm(e.cardId)} died / to graveyard`);
        else if (from === 'battlefield' && to === 'exile') this.add(`${nm(e.cardId)} exiled`);
        else if (from === 'battlefield' && (to === 'hand' || to === 'library')) this.add(`${nm(e.cardId)} returned to ${to}`);
        else if (from === 'hand' && to === 'graveyard') this.add(`${this.who(e.from.player)} discard ${nm(e.cardId)}`);
        else if (from === 'library' && to === 'graveyard') this.add(`${this.who(e.from.player)} milled ${nm(e.cardId)}`);
        else if (from === 'graveyard' && to === 'battlefield') this.add(`${nm(e.cardId)} returned from graveyard to battlefield`);
        break;
      }
      case 'outcome': this.add(e.winner === null ? 'game drawn' : `${this.who(e.winner)} won`); break;
      default: break;
    }
  }

  /** A mark: the history so far, to tell only what came after it later. */
  mark() { return { items: this.items.length, notices: this.notices.length }; }

  /** The event log as text, from `from` (a mark, or the start). Grouped by turn. */
  logText(from = null, to = null) {
    const start = from ? from.items : 0;
    const end = to ? to.items : this.items.length;
    const lines = [];
    let cur = null;
    for (let i = start; i < end; i++) {
      const it = this.items[i];
      const head = it.turn > 0 ? `T${it.turn} (${it.who}):` : 'Before turn 1:';
      if (it.turnStart) { cur = head; lines.push(cur); continue; }
      if (cur === null || lines.length === 0) { cur = head; lines.push(cur); }
      lines[lines.length - 1] += ` ${it.text};`;
    }
    return lines.filter((l) => !/:$/.test(l) || l === lines[lines.length - 1]).join('\n') || '(nothing yet)';
  }

  noticesSince(from = null, to = null) {
    return this.notices.slice(from ? from.notices : 0, to ? to.notices : this.notices.length);
  }
}

const zoneLine = (label, cards, opts) => {
  if (!cards || cards.length === 0) return `  ${label}: -`;
  return `  ${label}: ${cards.map((c) => describeCard(c, opts)).join('; ')}`;
};

/** The current state as a compact table, from the seat's side. */
export function stateTable(state, me) {
  if (!state) return '(no state yet)';
  const { mine, opp } = playersOf(state, me);
  const out = [];
  const turnWho = state.activePlayer === me ? 'yours' : "opponent's";
  if (!state.turn) out.push('Before the game (no turn has begun)');
  else out.push(`Turn ${state.turn} (round ${state.round}, ${turnWho}), phase ${state.phase ?? '-'}, priority: ${state.priority === me ? 'you' : state.priority === null ? '-' : 'opponent'}`);
  for (const [label, p] of [['YOU', mine], ['OPPONENT', opp]]) {
    if (!p) continue;
    const z = p.zones ?? {};
    const pool = Object.entries(p.manaPool ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n > 1 ? `x${n}` : ''}`).join(' ') || '-';
    out.push(`${label} (${p.name}): life ${p.life}${p.poison ? `, poison ${p.poison}` : ''}, library ${z.library?.count ?? '?'}, hand ${z.hand?.count ?? 0}, mana pool ${pool}`);
    if (p.id === me) out.push(zoneLine('Hand', z.hand?.cards));
    else if ((z.hand?.cards ?? []).some((c) => c.hidden !== true)) out.push(zoneLine('Hand (revealed)', z.hand.cards.filter((c) => c.hidden !== true)));
    const bf = z.battlefield?.cards ?? [];
    const lands = bf.filter((c) => /\bLand\b/.test(String(c.types ?? '')) && !/\bCreature\b/.test(String(c.types ?? '')));
    out.push(zoneLine('Lands', lands, { withCost: false }));
    out.push(zoneLine('Battlefield', bf.filter((c) => !lands.includes(c))));
    if ((z.graveyard?.count ?? 0) > 0) out.push(zoneLine('Graveyard', z.graveyard.cards, { withCost: false }));
    if ((z.exile?.count ?? 0) > 0) out.push(zoneLine('Exile', z.exile.cards, { withCost: false }));
    if ((z.library?.cards ?? []).length) out.push(zoneLine('Library (visible)', z.library.cards));
  }
  const stack = Array.isArray(state.stack) ? state.stack : [];
  if (stack.length) {
    const sc = cardsById(state);
    out.push('STACK (top first):');
    for (const it of [...stack].reverse()) {
      const src = it.sourceCardId != null ? sc.get(it.sourceCardId) : null;
      const who = it.controller === me ? 'yours' : it.controller === null ? '?' : "opponent's";
      const tg = [...(it.targetCardIds ?? []).map((id) => `[${id}]`), ...(it.targetPlayerIds ?? []).map((p) => (p === me ? 'you' : 'opponent'))];
      out.push(`  ${who}: ${src ? describeCard(src) : '?'}${it.text ? ` -- ${it.text}` : ''}${tg.length ? ` (targets ${tg.join(', ')})` : ''}`);
    }
  } else {
    out.push('STACK: empty');
  }
  for (const band of state.combat?.bands ?? []) {
    const def = band.defender ? (band.defender.kind === 'player' ? (band.defender.id === me ? 'you' : 'opponent') : `[${band.defender.id}]`) : '?';
    out.push(`COMBAT: [${(band.attackerIds ?? []).join(', ')}] attacking ${def}${(band.blockerIds ?? []).length ? `, blocked by [${band.blockerIds.join(', ')}]` : ''}`);
  }
  const stops = mine?.phaseStops;
  if (stops) out.push(`Your phase stops: own turn ${stops.own.join(' ') || '-'}; opponent's turn ${stops.opp.join(' ') || '-'}`);
  return out.join('\n');
}

/** Names of every card the seat can see now (not its library unless shown), for the CARD TEXT block. */
export function visibleNames(state, me) {
  const names = new Set();
  for (const p of state?.players ?? []) {
    for (const z of ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library']) {
      for (const c of p.zones?.[z]?.cards ?? []) { const n = nameOf(c); if (n) names.add(n); }
    }
  }
  for (const c of state?.stackCards ?? []) { const n = nameOf(c); if (n) names.add(n); }
  return [...names].sort();
}

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

export function cardTextBlock(names, oracle) {
  const list = names.filter((n) => !BASICS.has(n) && !n.startsWith('Snow-Covered '));
  const lines = [];
  for (const n of list) {
    const t = oracle.text(n);
    // a token or an effect has no oracle card: its type line and P/T are in the state table
    if (t === null && (/ Token$/.test(n) || /'s Effect$/.test(n))) continue;
    lines.push(`${n}: ${t === null ? '(no oracle text available)' : t.replace(/\n/g, ' / ')}`);
  }
  return lines.length ? lines.join('\n') : '(none new)';
}

export { relTurn };
