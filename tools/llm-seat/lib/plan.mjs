// mtg-table — tools/llm-seat/lib/plan.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// PLAN MODE's reply and names (D419).  The model answers every question with
//
//   PLAN: <one or two sentences, plain words>
//   STEPS:
//   1. <verb> <card name or creature names> [-> <target name>]
//   2. ...
//   END
//
// read strictly: reasoning is allowed only BEFORE the `PLAN:` line, nothing
// but blank lines (or a ``` fence) after `END`, the steps numbered 1, 2, 3 …,
// and every step one of the fixed verbs below.  An invalid reply gets a
// precise reason, which the seat sends back (a correction, D419).
//
// Names are matched against what the engine offers: case, accents and
// punctuation do not count, `#35` (or `[35]`, the game log's spelling) picks
// one card by its id, and a name that fits cards of two owners or zones is
// ambiguous unless an id says which.  Pure: no state, no clock.

export const VERBS = ['play land', 'cast', 'activate', 'attack with', 'block', 'target', 'choose', 'pass', 'keep', 'mulligan', 'hold'];

/** Verbs that end a list of steps (nothing may follow them). */
const LAST = new Set(['pass', 'hold']);
const ALONE = new Set(['keep', 'mulligan']);

const VERB_LIST = VERBS.join(', ');

/** Strips the decoration a model puts round a step: backticks, bold, a final full stop. */
function cleanLine(s) {
  return s.trim().replace(/^[`*_]+|[`*_]+$/g, '').replace(/\.$/, '').trim();
}

const splitArrow = (s) => {
  const m = /^(.*?)\s*(?:->|→|=>)\s*(.*)$/.exec(s);
  return m ? { what: m[1].trim(), to: m[2].trim() } : { what: s.trim(), to: null };
};

/** One step's text (after the number) -> a step, or {error}. */
export function parseStep(n, text) {
  const raw = cleanLine(text);
  const low = raw.toLowerCase();
  const verb = VERBS.find((v) => low === v || low.startsWith(`${v} `));
  const quote = `step ${n} "${raw.slice(0, 80)}"`;
  if (!verb) {
    const first = low.split(/\s+/)[0] ?? '';
    return { error: `${quote}: "${first}" is not a verb this program knows; the verbs are: ${VERB_LIST}` };
  }
  const arg = raw.slice(verb.length).trim();
  const step = { n, verb, raw };
  switch (verb) {
    case 'play land':
      if (!arg) return { error: `${quote}: which land? write "play land <card name>"` };
      if (/->|→/.test(arg)) return { error: `${quote}: a land has no target` };
      step.name = arg;
      return step;
    case 'cast':
    case 'activate': {
      const { what, to } = splitArrow(arg);
      if (!what) return { error: `${quote}: which card? write "${verb} <card name>"` };
      if (to === '') return { error: `${quote}: nothing after "->"; name the target or leave the arrow out` };
      step.name = what;
      step.targets = to ? to : null;
      return step;
    }
    case 'attack with':
      if (!arg) return { error: `${quote}: with which creatures? write "attack with <names>" or "attack with none"` };
      step.names = /^(none|nothing|no one|nobody)$/i.test(arg) ? null : arg;
      return step;
    case 'block': {
      const m = /^(.+?)\s+with\s+(.+)$/i.exec(arg);
      if (!m) return { error: `${quote}: write "block <attacker> with <your blocker>", one line per block` };
      step.attacker = m[1].trim();
      step.blocker = m[2].trim();
      return step;
    }
    case 'target':
    case 'choose':
      if (!arg) return { error: `${quote}: ${verb} what? write "${verb} <name>"` };
      step.names = arg;
      return step;
    default:
      if (arg) return { error: `${quote}: "${verb}" takes nothing after it` };
      return step;
  }
}

/**
 * parsePlan(text) -> {ok: true, plan, steps, preamble} | {ok: false, error}
 * `preamble` is the reasoning before PLAN: (kept for the log, never read).
 */
export function parsePlan(text) {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'the reply is empty' };
  const lines = text.replace(/\r/g, '').split('\n');
  const isFence = (l) => /^\s*```\w*\s*$/.test(l);
  const head = (l, word) => new RegExp(`^\\s*[*_]{0,2}${word}:[*_]{0,2}\\s*(.*)$`).exec(l);
  const planAt = lines.findIndex((l) => head(l, 'PLAN'));
  if (planAt < 0) return { ok: false, error: 'there is no line starting with "PLAN:"' };
  const planText = [head(lines[planAt], 'PLAN')[1].trim()];
  let i = planAt + 1;
  for (; i < lines.length && !head(lines[i], 'STEPS'); i++) {
    if (/^\s*END\s*$/.test(lines[i])) return { ok: false, error: 'there is no "STEPS:" line between PLAN: and END' };
    if (!isFence(lines[i]) && lines[i].trim()) planText.push(lines[i].trim());
  }
  if (i >= lines.length) return { ok: false, error: 'there is no "STEPS:" line after PLAN:' };
  const plan = planText.filter(Boolean).join(' ');
  if (!plan) return { ok: false, error: 'the PLAN: line is empty; say in a sentence what you mean to do' };
  if (head(lines[i], 'STEPS')[1].trim()) return { ok: false, error: 'put the steps on their own lines after "STEPS:", one numbered step per line' };
  const steps = [];
  let end = -1;
  for (i += 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*[*_]{0,2}END[*_]{0,2}\s*$/.test(l)) { end = i; break; }
    if (!l.trim() || isFence(l)) continue;
    const m = /^\s*(\d+)[.)]\s+(.*)$/.exec(l);
    if (!m) return { ok: false, error: `the line "${l.trim().slice(0, 80)}" between STEPS: and END is not a numbered step` };
    const n = Number(m[1]);
    if (n !== steps.length + 1) return { ok: false, error: `the steps must be numbered 1, 2, 3 …: found ${n} where ${steps.length + 1} was due` };
    const s = parseStep(n, m[2]);
    if (s.error) return { ok: false, error: s.error };
    steps.push(s);
  }
  if (end < 0) return { ok: false, error: 'there is no END line; the reply must end with END on a line of its own' };
  const after = lines.slice(end + 1).find((l) => l.trim() && !isFence(l));
  if (after !== undefined) return { ok: false, error: `nothing may follow END, but the reply goes on: "${after.trim().slice(0, 60)}"` };
  if (steps.length === 0) return { ok: false, error: 'STEPS: lists no step; write "1. pass" to do nothing now' };
  for (const s of steps) {
    if (LAST.has(s.verb) && s.n !== steps.length) return { ok: false, error: `step ${s.n} "${s.raw}" must be the last step` };
    if (ALONE.has(s.verb) && steps.length > 1) return { ok: false, error: `step ${s.n} "${s.raw}" must be the only step` };
  }
  const preamble = lines.slice(0, planAt).join('\n').trim();
  return { ok: true, plan, steps, preamble };
}

export const stepText = (s) => `step ${s.n} '${s.raw}'`;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** A name as the matcher compares it: lower case, no accents, no punctuation. */
export function normName(s) {
  return String(s ?? '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/['\u2019`]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** "Island #35", "Island [35]", "Grizzly Bears (2/2)" -> {name, id}. */
export function parseRef(text) {
  let t = String(text ?? '').trim();
  let id = null;
  const idm = /\s*(?:#|\[#?)(\d+)\]?\s*$/.exec(t) ?? /\s*\(#(\d+)\)\s*$/.exec(t);
  if (idm) { id = Number(idm[1]); t = t.slice(0, idm.index); }
  t = t.replace(/\s*\([^)]*\)\s*$/, '');   // a trailing "(2/2)", "(tapped)"
  const id2 = /\s*(?:#|\[#?)(\d+)\]?\s*$/.exec(t);
  if (id === null && id2) { id = Number(id2[1]); t = t.slice(0, id2.index); }
  return { name: normName(t), id, raw: String(text ?? '').trim() };
}

const facesOf = (name) => {
  const n = String(name ?? '');
  return [normName(n), ...n.split(' // ').map(normName)].filter(Boolean);
};

/**
 * matchRef(ref, candidates) -> {ok: true, pick} | {ok: false, why: 'missing'|'ambiguous'|'id', found}
 * A candidate: {id, name, group} -- `group` is what makes two same-named cards
 * different choices (owner and zone); same-named candidates in one group are
 * interchangeable and the first is taken.  `taken` ids are skipped (a list).
 */
export function matchRef(ref, candidates, taken = new Set()) {
  const free = candidates.filter((c) => !taken.has(c.id));
  if (ref.id !== null) {
    const c = free.find((x) => x.id === ref.id);
    if (!c) return { ok: false, why: 'id', found: [] };
    // the number is the card's own: a name that is only near ("Insect Token" for
    // a token the engine calls "Insect", sk6) still means this card
    const near = (a, b) => a === b || a.replace(/\btoken\b/g, '').trim() === b.replace(/\btoken\b/g, '').trim() || a.startsWith(b) || b.startsWith(a);
    if (ref.name && !facesOf(c.name).some((f) => near(f, ref.name)) && !c.aliases?.includes(ref.name)) return { ok: false, why: 'id', found: [c] };
    return { ok: true, pick: c };
  }
  const untoken = (x) => x.replace(/\btoken\b/g, '').replace(/\s+/g, ' ').trim();
  let hits = free.filter((c) => facesOf(c.name).includes(ref.name) || (c.aliases ?? []).includes(ref.name));
  // "Insect Token" for a token the engine calls "Insect" (sk6)
  if (hits.length === 0) hits = free.filter((c) => facesOf(c.name).some((f) => untoken(f) === untoken(ref.name)));
  if (hits.length === 0) return { ok: false, why: 'missing', found: [] };
  const groups = new Set(hits.map((c) => c.group ?? ''));
  if (groups.size > 1) return { ok: false, why: 'ambiguous', found: hits };
  return { ok: true, pick: hits[0] };
}

/**
 * Splits "A, B, C" into names, keeping a name that itself has a comma
 * ("Peggy Carter, Secret Agent") whole when it is one of `known`.  `;` and
 * " and " also separate.
 */
export function splitNames(text, known = []) {
  const knownSet = new Set(known.map(normName));
  const out = [];
  for (const chunk of String(text).split(/;|\s+and\s+/i)) {
    const parts = chunk.split(',').map((p) => p.trim()).filter(Boolean);
    let i = 0;
    while (i < parts.length) {
      let took = 1;
      for (let j = parts.length; j > i + 1; j--) {
        if (knownSet.has(parseRef(parts.slice(i, j).join(', ')).name)) { took = j - i; break; }
      }
      out.push(parts.slice(i, i + took).join(', '));
      i += took;
    }
  }
  return out;
}

/** "Island #35" when the name is shared by another candidate, else the name. */
export function showName(card, dupes) {
  const n = card?.name ?? '?';
  return dupes && dupes.has(normName(n)) ? `${n} #${card.id}` : n;
}

/** The names that occur on more than one card in `cards`. */
export function duplicateNames(cards) {
  const seen = new Map();
  for (const c of cards) {
    if (!c || c.hidden === true || !c.name) continue;
    const k = normName(c.name);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
}

// ---------------------------------------------------------------------------
// Naming one ability of a permanent (M63, D420)
// ---------------------------------------------------------------------------

/** "−1" / "–1" / "+2" / "0": a loyalty cost as the engine's label starts with it. */
const LOYALTY = /^[+\-−–]?\d+$/;
const signFix = (s) => String(s).replace(/[−–]/g, '-').trim();

/**
 * The ways a step names a permanent and one of its abilities:
 * "Jace, the Mind Sculptor: +2", "Jace, the Mind Sculptor +2",
 * "Jace, the Mind Sculptor (+2)", "Clue Token: draw a card".  Returns every
 * {name, ability} split worth trying, the whole text (no ability) first; the
 * caller keeps the first whose name matches a permanent (a card name may
 * itself hold a colon: "Circle of Protection: Red").
 */
export function abilitySplits(text) {
  const t = String(text ?? '').trim();
  const out = [{ name: t, ability: null }];
  const loyalty = /^(.*?)\s*(?:\(\s*([+\-−–]?\d+)\s*\)|\s([+\-−–]\d+|0))\s*$/.exec(t);
  if (loyalty && loyalty[1]) out.push({ name: loyalty[1].replace(/[:\s]+$/, ''), ability: signFix(loyalty[2] ?? loyalty[3]) });
  for (let i = t.indexOf(':'); i > 0; i = t.indexOf(':', i + 1)) {
    const ability = t.slice(i + 1).trim().replace(/^["'“]|["'”]$/g, '');
    if (ability) out.push({ name: t.slice(0, i).trim(), ability });
  }
  for (const sep of [' -- ', ' — ', ' - ']) {
    const i = t.indexOf(sep);
    if (i > 0) out.push({ name: t.slice(0, i).trim(), ability: t.slice(i + sep.length).trim() });
  }
  return out;
}

/** The cost part of an engine ability label: "+2" of "+2: Look at…", "{2}, Sacrifice this token" of "{2}, Sacrifice…: Draw a card." */
export const abilityCost = (label) => {
  const s = String(label ?? '').replace(/\([^)]*\)/g, '');   // reminder text holds colons of its own
  const i = s.indexOf(':');
  return i > 0 ? s.slice(0, i).trim() : null;
};

/**
 * matchAbility(selector, labels) -> {ok: true, index} | {ok: false, why}
 * A loyalty cost ("+2", "-1", "0", "2" for "+2") picks the label that starts
 * with it; otherwise the label in full, then a word or phrase only one label
 * contains, decides.
 */
export function matchAbility(selector, labels) {
  const sel = signFix(selector);
  // a cost and words ("+1 soldier", "+1: Create a 1/1 …"): Elspeth, Knight-Errant has two +1s
  const both = /^([+\-]?\d+)\s*:?\s+(\S.*)$/.exec(sel);
  if (both) {
    const costs = labels.map((l) => signFix(abilityCost(l) ?? ''));
    const same = labels.map((l, i) => i).filter((i) => costs[i] === both[1] || (/^\d+$/.test(both[1]) && both[1] !== '0' && costs[i] === `+${both[1]}`));
    if (same.length) {
      const sub = matchAbility(both[2], same.map((i) => labels[i]));
      if (sub.ok) return { ok: true, index: same[sub.index] };
      if (normName(labels[same[0]]) === normName(sel) && same.length === 1) return { ok: true, index: same[0] };
    }
  }
  if (LOYALTY.test(sel)) {
    const costs = labels.map((l) => signFix(abilityCost(l) ?? ''));
    let hits = costs.map((c, i) => (c === sel || (sel === '0' && c === '+0') ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 0 && /^\d+$/.test(sel) && sel !== '0') hits = costs.map((c, i) => (c === `+${sel}` ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 1) return { ok: true, index: hits[0] };
    if (hits.length > 1) return { ok: false, why: 'ambiguous' };
  }
  const n = normName(sel);
  const exact = labels.map((l, i) => (normName(l) === n ? i : -1)).filter((i) => i >= 0);
  if (exact.length === 1) return { ok: true, index: exact[0] };
  if (n.length >= 3) {
    const part = labels.map((l, i) => (normName(l).includes(n) ? i : -1)).filter((i) => i >= 0);
    if (part.length === 1) return { ok: true, index: part[0] };
    if (part.length > 1) return { ok: false, why: 'ambiguous' };
    // every word of three letters or more is in one label only ("soldier token")
    const words = n.split(' ').filter((w) => w.length >= 3);
    if (words.length) {
      const all = labels.map((l, i) => (words.every((w) => normName(l).split(' ').includes(w)) ? i : -1)).filter((i) => i >= 0);
      if (all.length === 1) return { ok: true, index: all[0] };
      if (all.length > 1) return { ok: false, why: 'ambiguous' };
    }
  }
  return { ok: false, why: 'missing' };
}
