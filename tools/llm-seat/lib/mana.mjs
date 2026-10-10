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
import { abilityCost } from './plan.mjs';

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

const MANA_LINE = /^([^:\n]*\{T\}[^:\n]*):\s*Add\b/i;

/**
 * Does a mana ability's cost need mana ("{1}, {T}: Add one mana of any
 * color", "{W/U}, {T}: Add {W}{W}…")?  A FILTER: it turns mana into mana.
 * Forge's Auto payment never uses one (s2-search-p20-s6: Prophetic Prism, the
 * only white, and Welcoming Vampire's payment had no Auto; the Signet probe:
 * Auto off for Savannah Lions {W} and for Pristine Talisman {3} beside Azorius
 * Signet), but a click on one during a payment does (both probes, real Forge:
 * the click opens the filter's own "Pay Mana Cost: {1}", and its mana goes to
 * the spell, any left over to the pool).  So a filter whose cost is generic
 * mana only counts at its NET: what it makes less what it costs --
 *   - net > 0 (a Signet "{1}, {T}: Add {W}{U}": +1): a source of `amount` net,
 *     marked `filter` (smart pay clicks it, plan-core.mjs);
 *   - net 0 at a cost of {1} (Prophetic Prism): a CONVERTER (`filters`): no
 *     mana of its own, but one of the other mana can come out in its colours;
 *   - otherwise (an amount the board decides, Cabal Coffers' "for each
 *     Swamp"; a coloured or hybrid cost, Mystic Gate's {W/U}): nothing.
 */
export const isFilterCost = (cost) => (String(cost ?? '').match(/\{[^}]+\}/g) ?? []).some((x) => !/^\{(T|Q|E)\}$/i.test(x));

/**
 * The tap-for-mana lines of an oracle text: {free, filter, generic}.  free:
 * the first whose cost needs no mana (or null); filter: any line needs mana;
 * generic: the first filter line whose mana cost is generic only, as
 * {line, cost, costMv, produced (null when the board decides), colors}.
 */
export function manaLines(text) {
  const lines = String(text ?? '').split('\n').map((l) => [l, MANA_LINE.exec(l)]).filter(([, m]) => m);
  const gen = lines.find(([, m]) => isFilterCost(m[1]) && (m[1].match(/\{[^}]+\}/g) ?? []).every((x) => /^\{(\d+|T|Q)\}$/i.test(x)));
  let generic = null;
  if (gen) {
    const [line, m] = gen;
    const add = addClause(line);
    const variable = /\b(for each|equal to|number of|X)\b/.test(/\bAdd\b(.*)$/i.exec(line)?.[1] ?? '');
    generic = {
      line, cost: m[1].replace(/\s*,?\s*\{[TQ]\}\s*,?\s*/gi, '').trim(),
      costMv: (m[1].match(/\{(\d+)\}/g) ?? []).reduce((n, x) => n + Number(x.slice(1, -1)), 0),
      produced: variable ? null : add.amount, colors: add.colors,
    };
  }
  return { free: lines.find(([, m]) => !isFilterCost(m[1]))?.[0] ?? null, filter: lines.some(([, m]) => isFilterCost(m[1])), generic };
}

/** A tap-for-mana line of an oracle text whose cost needs no mana, or null. */
const manaLine = (text) => manaLines(text).free;

/**
 * The seat's untapped mana sources and pool.
 * -> {total, sources: [{id, name, colors: Set|'any', amount, filter?, cost?}], filters: [{id, name, colors, cost}], pool: {W..C}, known: boolean}
 * A source with `filter` is a net-positive filter (a Signet, counted at its
 * net); `filters` are converters, not in `total` (manaLines above).
 */
export function availableMana(state, me, oracle = null) {
  const { mine } = playersOf(state, me);
  const sources = [];
  const filters = [];
  const filterSource = (c, name, text) => {
    const g = manaLines(text).generic;
    if (!g || g.produced === null) return;
    const net = g.produced - g.costMv;
    if (net > 0) sources.push({ id: c.id, name: name ?? '?', colors: g.colors, amount: net, filter: true, cost: g.cost });
    else if (net === 0 && g.costMv === 1) filters.push({ id: c.id, name: name ?? '?', colors: g.colors, cost: g.cost });
  };
  let known = true;
  for (const c of mine?.zones?.battlefield?.cards ?? []) {
    if (c.hidden === true || c.controller !== me || c.tapped) continue;
    const name = nameOf(c);
    const text = name && oracle ? oracle.text(name) : null;
    if (isLand(c)) {
      const basics = Object.entries(BASIC_TYPE).filter(([t]) => new RegExp(`\\b${t}\\b`).test(String(c.types ?? ''))).map(([, col]) => col);
      let add = basics.length ? { colors: new Set(basics), amount: 1 } : (manaLine(text) ? addClause(manaLine(text)) : null);
      if (!add && manaLines(text).filter) { filterSource(c, name, text); continue; }   // a filter land with no free line (Sungrass Prairie)
      if (!add) { add = { colors: 'any', amount: 1 }; known = false; }
      sources.push({ id: c.id, name: name ?? 'a land', colors: add.colors, amount: add.amount });
      continue;
    }
    const line = manaLine(text);
    if (isCreature(c) && c.sick && !hasKeyword(c, 'HASTE')) continue;
    if (!line) { filterSource(c, name, text); continue; }
    const add = addClause(line);
    sources.push({ id: c.id, name: name ?? '?', colors: add.colors, amount: add.amount });
  }
  const pool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, ...(mine?.manaPool ?? {}) };
  const poolTotal = Object.values(pool).reduce((a, b) => a + (Number(b) || 0), 0);
  const total = sources.reduce((a, s) => a + s.amount, 0) + poolTotal;
  return { total, sources, filters, pool, poolTotal, known };
}

/**
 * How many of the sources (plus the pool) can make colour `col`: directly, plus
 * one per converter of that colour while other mana is left to feed it.
 */
function canMake(avail, col) {
  const direct = avail.sources.filter((s) => s.colors === 'any' || s.colors.has(col)).reduce((a, s) => a + s.amount, 0) + (Number(avail.pool[col]) || 0);
  const conv = (avail.filters ?? []).filter((f) => f.colors === 'any' || f.colors.has(col)).length;
  return direct + Math.min(conv, Math.max(0, avail.total - direct));
}

/** "U U R" -- what the untapped sources make, for the view. */
export function manaWords(avail) {
  const parts = avail.sources.map((s) => (s.colors === 'any' ? 'any' : [...s.colors].join('/')) + (s.amount > 1 ? `x${s.amount}` : '') + (s.filter ? ` (net of its ${s.cost})` : ''));
  const pool = Object.entries(avail.pool).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n > 1 ? `x${n}` : ''}`);
  const filters = (avail.filters ?? []).map((f) => `${f.name} (${f.cost}: turns one of it into ${f.colors === 'any' ? 'any colour' : [...f.colors].join('/')})`);
  return { sources: parts.join(' '), pool: pool.join(' '), filters: filters.join('; ') };
}

const UNREADABLE = /convoke|delve|affinity|improvise|emerge|evoke|dash|prowl|surge|spectacle|madness|blitz|bestow|overload|mutate|plot|costs? \{?[\dX]*\}? ?less|less to cast|without paying|rather than pay|you may pay .* rather/i;

/**
 * Why `card` (in hand, with a mana cost) cannot be paid for from the untapped
 * mana now, in plain words -- or null when it can, or when this cannot tell.
 */
export function payProblem(card, state, me, oracle = null) {
  if (!card?.manaCost) return null;
  const name = nameOf(card);
  const text = name && oracle ? oracle.text(name) : null;
  // Delve alone is readable: each card exiled from the graveyard pays {1} of
  // the generic part, so at most min(generic, graveyard) (Treasure Cruise, sk)
  const delve = text && /\bDelve\b/.test(text) && !UNREADABLE.test(text.replace(/\bDelve\b[^\n]*/g, ''));
  if (text && UNREADABLE.test(text) && !delve) return null;
  const { mine } = playersOf(state, me);
  for (const p of mine?.zones?.battlefield?.cards ?? []) {
    const t = nameOf(p) && oracle ? oracle.text(nameOf(p)) : null;
    if (t && /cost(s)? .{0,40}less|less to cast/i.test(t)) return null;
  }
  const cost = parseCost(card.manaCost);
  let delveNote = '';
  if (delve) {
    const gy = Math.max(0, (mine?.zones?.graveyard?.count ?? 0) - (card.zone === 'graveyard' ? 1 : 0));
    const cut = Math.min(cost.generic, gy);
    cost.generic -= cut;
    cost.mv -= cut;
    delveNote = ` even with delve exiling ${cut} card${cut === 1 ? '' : 's'} of your graveyard (${gy} there)`;
  }
  const avail = availableMana(state, me, oracle);
  const list = avail.sources.map((s) => s.name).join(', ');
  const conv = (avail.filters ?? []).map((f) => f.name).join(', ');
  const have = `${avail.sources.length} untapped mana source${avail.sources.length === 1 ? '' : 's'}${list ? ` (${list})` : ''}${avail.poolTotal ? ` and ${avail.poolTotal} mana in your pool` : ''}${conv ? `; ${conv} only turns one of that mana into another colour` : ''}`;
  if (avail.total < cost.mv) return `it costs ${card.manaCost}${delve ? `, ${cost.mv} mana${delveNote},` : ` (${cost.mv} mana)`} and you have ${have}`;
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

/**
 * Why an engine-listed activation (M63) cannot be paid from the untapped mana
 * now, from the mana symbols of its label's cost ("{2}, Sacrifice this
 * token: …"), or null.  A hint, as payProblem is: no cost symbols (a loyalty
 * cost, "Crew 1") or a cost this cannot read is left to the engine.
 */
export function activationProblem(o, card, state, me, oracle) {
  if (!o?.engine) return null;
  const cost = abilityCost(o.abilityLabel) ?? (/^[^(]*?\b(?:Equip|Reconfigure|Fortify)\b\s*((?:\{[^}]+\})+)/i.exec(o.abilityLabel ?? '')?.[1] ?? null);
  if (!cost) return null;
  const mana = (cost.match(/\{[^}]+\}/g) ?? []).filter((x) => !/^\{(T|Q|E|X)\}$/i.test(x)).join('');
  if (!mana) return null;
  const p = payProblem({ ...(card ?? {}), name: card?.name, manaCost: mana }, state, me, oracle);
  return p ? `its ability "${String(o.abilityLabel).slice(0, 80)}" ${p.replace(/^it costs/, 'costs')}` : null;
}

/**
 * Delve (Forge's `chooseCardsToDelve`, measured on the wire): the engine asks
 * "Delve how many cards?" (choose_list "0".."k", k = min(generic, graveyard))
 * and then "Exile which card(i/n)?" once per card, where choosing none clears
 * the whole delve.  Both are part of paying, so the seat answers them, never
 * the model: delve what the untapped mana cannot cover (keeping `reserve` mana
 * for the plan's later spells), all of it when the mana is short anyway, and
 * exile lands first and never a card the engine listed as playable from the
 * graveyard when another will do.  -> {n, why}
 */
export function delveCount({ maxOption, casting = null, reserve = 0, state, me, oracle = null }) {
  if (!casting?.manaCost) return { n: maxOption, why: 'the spell is not known: as many as the engine allows' };
  const mv = parseCost(casting.manaCost).mv;
  const avail = availableMana(state, me, oracle).total;
  const need = mv + reserve - avail;
  if (need >= maxOption) return { n: maxOption, why: `${casting.manaCost} with ${avail} untapped mana${reserve ? ` and ${reserve} kept for later spells` : ''}: as many as the engine allows` };
  const n = Math.max(0, need);
  return { n, why: `${casting.manaCost} with ${avail} untapped mana${reserve ? ` and ${reserve} kept for later spells` : ''}: ${n} from the graveyard, the rest from mana` };
}

/** Which graveyard card to exile for delve: lands, then cards not playable from there; the option, or null. */
export function delvePick(options, cards, keepIds = new Set()) {
  const ranked = options.filter((o) => typeof o.cardId === 'number').map((o, i) => {
    const c = cards.get(o.cardId) ?? o.card ?? null;
    const keep = keepIds.has(o.cardId) ? 2 : 0;
    const landFirst = c && isLand(c) ? 0 : 1;
    return { o, score: keep + landFirst, i };
  }).sort((a, b) => a.score - b.score || a.i - b.i);
  return ranked[0]?.o ?? null;
}
