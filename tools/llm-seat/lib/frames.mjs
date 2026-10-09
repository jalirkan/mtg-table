// mtg-table — tools/llm-seat/lib/frames.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Reading a §8 frame log (a bridge's or a client's: `.jsonl` or `.jsonl.gz`)
// and the small facts about one `state` every other module here needs.  Pure
// and DOM-free; no rules logic -- what a card IS comes from the wire, what it
// may DO comes from the engine (`state.playable`, M61) or from a click.

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/** {header, frames}: line 0 is the session header (§8.1), every other line a frame (§8.2). */
export function readLog(path) {
  let buf = readFileSync(path);
  if (path.endsWith('.gz')) buf = gunzipSync(buf);
  return parseLog(buf.toString('utf8'));
}

export function parseLog(text) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) throw new Error('empty log');
  const header = JSON.parse(lines[0]);
  if (header.kind !== 'session') throw new Error('line 0 is not a session header');
  const frames = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      frames.push(JSON.parse(lines[i]));
    } catch (e) {
      if (i < lines.length - 1) throw e;   // a live log's last line may be half written
    }
  }
  return { header, frames };
}

export const PHASES = [
  'UPKEEP', 'DRAW', 'MAIN1', 'COMBAT_BEGIN', 'COMBAT_DECLARE_ATTACKERS', 'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_FIRST_STRIKE_DAMAGE', 'COMBAT_DAMAGE', 'COMBAT_END', 'MAIN2', 'END_OF_TURN', 'CLEANUP',
];

export const ZONES = ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library'];

/** The viewing seat's and the other player's objects in one state. */
export function playersOf(state, me) {
  const ps = Array.isArray(state?.players) ? state.players : [];
  return { mine: ps.find((p) => p.id === me) ?? null, opp: ps.find((p) => p.id !== me) ?? null };
}

/** Every card object visible in one state, by id (zones, then the stack's cards). */
export function cardsById(state) {
  const out = new Map();
  for (const p of state?.players ?? []) {
    for (const z of ZONES) {
      for (const c of p.zones?.[z]?.cards ?? []) if (typeof c?.id === 'number') out.set(c.id, c);
    }
  }
  for (const c of state?.stackCards ?? []) if (typeof c?.id === 'number' && !out.has(c.id)) out.set(c.id, c);
  return out;
}

/** A card's public name, or null for a redacted stub or a concealed face (§3.3). */
export function nameOf(card) {
  if (!card || card.hidden === true) return null;
  return typeof card.name === 'string' && card.name !== '' ? card.name : null;
}

export const isCreature = (c) => /\bCreature\b/.test(String(c?.types ?? ''));
export const isLand = (c) => /\bLand\b/.test(String(c?.types ?? ''));
export const hasKeyword = (c, k) => Array.isArray(c?.keywords) && c.keywords.includes(k);

/** "own" when `me` is the turn player, else "opp" (the M33 vocabulary). */
export function relTurn(state, me) {
  return state?.activePlayer === me ? 'own' : 'opp';
}
