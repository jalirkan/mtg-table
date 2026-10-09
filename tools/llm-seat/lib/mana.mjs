// mtg-table — tools/llm-seat/lib/mana.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// What the seat's untapped mana can pay, read off the redacted state and the
// oracle text -- for plan mode's words (D419): the model is told how much
// untapped mana it has and of which colours, a card it cannot pay for is
// marked so, and a step that names one gets the reason in plain words
// ("it costs {4}{U}, 5 mana, and you have 2 untapped mana sources: Island,
// Island").  It is a HINT, never the judge: the wire does not predict mana
// (M61), so anything this cannot read (cost reducers, convoke, delve,
// alternative costs, a land whose text is unknown) is left to the engine,
// whose own mana payment is the last word.

import { isCreature, isLand, hasKeyword, nameOf, playersOf } from './frames.mjs';

const COLORS = ['W', 'U', 'B', 'R', 'G'];
const COLOR_WORD = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
const BASIC_TYPE = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };

/** "{2}{U}{U}" -> {mv, generic, pips: {W..C}, x}. Hybrid counts 1 generic; Phyrexian 0 (life can pay). */
export function parseCost(cost) {
  const out = { mv: 0, generic: 0, pips: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, x: 0, text: cost ?? '' };
  for (const m of String(cost ?? '').matchAll(/\{([^}]+)\}/g)) {
    const s = m[1].toUpperCase();
    if (/^\d+$/.test(s)) { out.generic += Number(s); out.mv += Number(s); }
    else if (s === 'X' || s === 'Y') out.x += 1;
    else if (s.includes('/P')) out.mv += 1;
    else if (s.includes('/')) { out.generic += 1; out.mv += 1; }
    else if (s in out.pips) { out.pips[s] += 1; out.mv += 1; }
    else if (s === 'S') { out.generic += 1; out.mv += 1; }
  }
  return out;
}

/** The colours an "Add …" clause makes and how much: {colors: Set|'any', amount}. */
export function addClause(text) {
  const m = /\bAdd\s+([^.]*)/i.exec(String(text ?? ''));
  if (!m) return null;
  const clause = m[1];
  if (/any colou?r|any type|of any one colou?r|combination of colou?rs/i.test(clause)) return { colors: 'any', amount: 1 };
  const first = clause.split(/\s+or\s+/i)[0];
  const syms = [...first.matchAll(/\{([WUBRGC])\}/g)].map((x) => x[1]);
  const all = new Set([...clause.matchAll(/\{([WUBRGC])\}/g)].map((x) => x[1]));
  if (all.size === 0) return { colors: 'any', amount: 1 };
  return { colors: all, amount: Math.max(1, syms.length) };
}

/** A tap-for-mana line of an oracle text, or null. */
const manaLine = (text) => String(text ?? '').split('\n').find((l) => /\{T\}[^:]*:\s*Add\b/i.test(l)) ?? null;

/**
 * The seat's untapped mana sources and pool.
 * -> {total, sources: [{id, name, colors: Set|'any', amount}], pool: {W..C}, known: boolean}
 */
export function availableMana(state, me, oracle = null) {
  const { mine } = playersOf(state, me);
  const sources = [];
  let known = true;
  for (const c of mine?.zones?.battlefield?.cards ?? []) {
    if (c.hidden === true || c.controller !== me || c.tapped) continue;
    const name = nameOf(c);
    const text = name && oracle ? oracle.text(name) : null;
    if (isLand(c)) {
      const basics = Object.entries(BASIC_TYPE).filter(([t]) => new RegExp(`\\b${t}\\b`).test(String(c.types ?? ''))).map(([, col]) => col);
      let add = basics.length ? { colors: new Set(basics), amount: 1 } : (manaLine(text) ? addClause(manaLine(text)) : null);
      if (!add) { add = { colors: 'any', amount: 1 }; known = false; }
      sources.push({ id: c.id, name: name ?? 'a land', colors: add.colors, amount: add.amount });
      continue;
    }
    const line = manaLine(text);
    if (!line) continue;
    if (isCreature(c) && c.sick && !hasKeyword(c, 'HASTE')) continue;
    const add = addClause(line);
    sources.push({ id: c.id, name: name ?? '?', colors: add.colors, amount: add.amount });
  }
  const pool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, ...(mine?.manaPool ?? {}) };
  const poolTotal = Object.values(pool).reduce((a, b) => a + (Number(b) || 0), 0);
  const total = sources.reduce((a, s) => a + s.amount, 0) + poolTotal;
  return { total, sources, pool, poolTotal, known };
}

/** How many of the sources (plus the pool) can make colour `col`. */
function canMake(avail, col) {
  return avail.sources.filter((s) => s.colors === 'any' || s.colors.has(col)).reduce((a, s) => a + s.amount, 0) + (Number(avail.pool[col]) || 0);
}

/** "U U R" -- what the untapped sources make, for the view. */
export function manaWords(avail) {
  const parts = avail.sources.map((s) => (s.colors === 'any' ? 'any' : [...s.colors].join('/')) + (s.amount > 1 ? `x${s.amount}` : ''));
  const pool = Object.entries(avail.pool).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n > 1 ? `x${n}` : ''}`);
  return { sources: parts.join(' '), pool: pool.join(' ') };
}

const UNREADABLE = /convoke|delve|affinity|improvise|emerge|costs? \{?[\dX]*\}? ?less|less to cast|without paying|rather than pay|you may pay .* rather/i;

/**
 * Why `card` (in hand, with a mana cost) cannot be paid for from the untapped
 * mana now, in plain words -- or null when it can, or when this cannot tell.
 */
export function payProblem(card, state, me, oracle = null) {
  if (!card?.manaCost) return null;
  const name = nameOf(card);
  const text = name && oracle ? oracle.text(name) : null;
  if (text && UNREADABLE.test(text)) return null;
  const { mine } = playersOf(state, me);
  for (const p of mine?.zones?.battlefield?.cards ?? []) {
    const t = nameOf(p) && oracle ? oracle.text(nameOf(p)) : null;
    if (t && /cost(s)? .{0,40}less|less to cast/i.test(t)) return null;
  }
  const cost = parseCost(card.manaCost);
  const avail = availableMana(state, me, oracle);
  const list = avail.sources.map((s) => s.name).join(', ');
  const have = `${avail.sources.length} untapped mana source${avail.sources.length === 1 ? '' : 's'}${list ? ` (${list})` : ''}${avail.poolTotal ? ` and ${avail.poolTotal} mana in your pool` : ''}`;
  if (avail.total < cost.mv) return `it costs ${card.manaCost} (${cost.mv} mana) and you have ${have}`;
  for (const col of [...COLORS, 'C']) {
    const need = cost.pips[col];
    if (need > 0 && canMake(avail, col) < need) {
      const can = canMake(avail, col);
      return `it costs ${card.manaCost}, which needs ${need} ${COLOR_WORD[col]} mana, and your untapped mana makes ${can === 0 ? 'no' : `only ${can}`} ${COLOR_WORD[col]} (you have ${have})`;
    }
  }
  if (cost.mv > 0) {
    let colored = 0;
    for (const col of [...COLORS, 'C']) colored += cost.pips[col];
    if (colored > avail.total) return `it costs ${card.manaCost} and you have ${have}`;
  }
  return null;
}

/**
 * The mana cost of casting `card` from a zone other than the hand, from its
 * card text: Flashback {..} / Escape—{..} / Retrace (its own cost). null when
 * the text names none (sk7: Momentary Blink from the graveyard was shown at
 * its hand cost {1}{W}; its flashback is {3}{U}).
 */
export function zoneCost(card, zone, oracle = null) {
  if (zone === 'hand' || !card) return null;
  const name = nameOf(card);
  const text = name && oracle ? oracle.text(name) : '';
  if (zone === 'graveyard') {
    const fb = /\bFlashback\s*((?:\{[^}]+\})+)/i.exec(text ?? '');
    if (fb) return { cost: fb[1], how: 'flashback' };
    const esc = /\bEscape\s*[—-]\s*((?:\{[^}]+\})+)/i.exec(text ?? '');
    if (esc) return { cost: esc[1], how: 'escape' };
    if (/\bRetrace\b/i.test(text ?? '') && card.manaCost) return { cost: card.manaCost, how: 'retrace' };
  }
  return null;
}

const NUMBER = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };

/**
 * Can the seat pay an optional cost ("Choose optional costs": Teamwork,
 * kicker, …) from what it has now?  true / false / null (cannot tell).  The
 * J-run loop (Helicarrier Strike's Teamwork chosen with no creature to tap,
 * the cast cancelled, chosen again) is why an option it cannot pay is never
 * offered.
 */
export function optionalCostPayable(label, state, me, oracle = null) {
  const text = String(label ?? '');
  const { mine } = playersOf(state, me);
  const untappedCreatures = (mine?.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true && c.controller === me && isCreature(c) && !c.tapped);
  const power = /total power (\d+) or greater/i.exec(text);
  if (power) return untappedCreatures.reduce((a, c) => a + (Number(c.power) || 0), 0) >= Number(power[1]);
  const tapN = /\bTap (a|an|one|two|three|four|five|\d+) untapped (?:\w+ )?creatures?\b/i.exec(text);
  if (tapN) return untappedCreatures.length >= (NUMBER[tapN[1].toLowerCase()] ?? Number(tapN[1]));
  const head = text.split(/[(–-]/)[0];
  if (/\{[^}]+\}/.test(head) && !/\b(Sacrifice|Discard|Exile|Remove|Return|Pay \d+ life)\b/i.test(head)) {
    return availableMana(state, me, oracle).total >= parseCost(head).mv;
  }
  return null;
}
