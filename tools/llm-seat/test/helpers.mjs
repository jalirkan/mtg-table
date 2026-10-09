// mtg-table — tools/llm-seat/test/helpers.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Hand-made wire objects for the tests, in the shapes of docs/protocol.md §3.2
// and §3 (only the keys the seat reads, plus the ones a real frame always has).

export function card(id, name, extra = {}) {
  return {
    id, name, setCode: 'TST', manaCost: null, types: '', power: null, toughness: null, loyalty: null, keywords: [],
    damage: 0, counters: {}, tapped: false, sick: false, attacking: false, blocking: false, faceDown: false, token: false,
    alt: null, attachedToId: null, attachmentIds: [], controller: 0, owner: 0, zone: 'hand', abilities: [], ...extra,
  };
}

export const land = (id, name = 'Forest', extra = {}) => card(id, name, { types: 'Basic Land - Forest', ...extra });
export const creature = (id, name, p, t, extra = {}) => card(id, name, { types: 'Creature - Bear', manaCost: '{1}{G}', power: String(p), toughness: String(t), ...extra });

function zones(z = {}) {
  const out = {};
  for (const k of ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library']) {
    const cards = z[k] ?? [];
    out[k] = { count: k === 'library' ? (z.libraryCount ?? 30) : cards.length, cards: k === 'library' ? [] : cards };
  }
  return out;
}

export function player(id, name, z = {}, extra = {}) {
  return {
    id, name, isAi: id !== 0, life: 20, poison: 0, counters: {}, manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    phaseStops: { own: ['MAIN1', 'COMBAT_DECLARE_BLOCKERS', 'MAIN2'], opp: ['COMBAT_BEGIN', 'COMBAT_DECLARE_ATTACKERS', 'COMBAT_DECLARE_BLOCKERS', 'END_OF_TURN'] },
    zones: zones(z), ...extra,
  };
}

export function state({ turn = 1, phase = 'MAIN1', active = 0, priority = 0, me = {}, opp = {}, stack = [], stackCards = [], playable = null, combat = null, events = [], meExtra = {}, gameOver = null } = {}) {
  return {
    gameId: 'fake-1', turn, round: Math.ceil(turn / 2), phase, activePlayer: active, priority, gameOver,
    players: [player(0, 'Human', me, meExtra), player(1, 'Forge AI', opp)],
    stack, stackCards, yield: null, undo: { can: false, depth: 0 }, playable, combat, events,
  };
}

export function priorityInput(turn = 1, phase = 'Main phase, precombat', stack = 'Empty') {
  return {
    prompt: `Priority: Human\nTurn: ${turn} (Human)\nPhase: ${phase}\nStack: ${stack}`,
    focusCardId: null, focusCard: null,
    buttons: { ok: { label: 'OK', enabled: true }, cancel: { label: 'End Turn', enabled: true }, focus: 'ok' },
    selectable: { cardIds: [], min: 0, max: 0, mode: 'none' }, highlighted: [], weak: [], openZones: [],
  };
}

export function input(prompt, { ok = ['OK', true], cancel = ['Cancel', false], sel = null } = {}) {
  return {
    prompt, focusCardId: null, focusCard: null,
    buttons: { ok: { label: ok[0], enabled: ok[1] }, cancel: { label: cancel[0], enabled: cancel[1] }, focus: 'ok' },
    selectable: sel ?? { cardIds: [], min: 0, max: 0, mode: 'none' }, highlighted: [], weak: [], openZones: [],
  };
}

export const ORACLE = {
  source: 'test',
  text(name) {
    return {
      'Grizzly Bears': '',
      'Prodigal Sorcerer': '{T}: Prodigal Sorcerer deals 1 damage to any target.',
      'Llanowar Elves': '{T}: Add {G}.',
      Shock: 'Shock deals 2 damage to any target.',
    }[name] ?? null;
  },
};
