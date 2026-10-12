// mtg-table — tools/adversary/answers.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The adversarial seat's arithmetic (decision D428), from an ask's own wire
// fields and nothing else -- no rules engine, no card text:
//
//   answerRefusal(ask, value)  why the bridge must refuse this answer, or null
//                              -- the same rules as bridge/src/mtgtable/
//                              AnswerRule.java (M68, D426) and the wire half of
//                              DamageRule.java (M67, D424). tools/check-redaction.mjs
//                              judges a recorded log with it.
//   illegalAnswers(ask)        the worst answers the seat can construct for
//                              this ask, each with a label: off-by-one totals,
//                              out-of-range numbers, ids not offered, duplicate
//                              picks, too many and too few, damage on the
//                              player without trample, the wrong JSON type.
//                              Every one is refused by answerRefusal (the
//                              selftest holds that over every ask in
//                              fixtures/games/).
//   legalAnswer(ask)           an answer answerRefusal accepts (null where no
//                              non-null answer exists).
//
// Zero dependencies, no I/O.

const int = (v) => typeof v === 'number' && Number.isInteger(v);
const len = (a) => (Array.isArray(a) ? a.length : 0);
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const range = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

/** Distinct ids in [0, n), or why not. */
function distinct(picks, n) {
  if (!Array.isArray(picks) || !picks.every(int)) return 'not a list of option ids';
  const seen = new Set();
  for (const i of picks) {
    if (i < 0 || i >= n) return `option ${i} not offered`;
    if (seen.has(i)) return `option ${i} twice`;
    seen.add(i);
  }
  return null;
}

/** choose_list / choose_entities: the count a legal answer may have, `[lo, hi]`, or null for a reveal. */
export function pickBounds(ask) {
  const n = len(ask.options);
  if (int(ask.min) && ask.min < 0) return null;
  const lo = Math.min(int(ask.min) ? Math.max(0, ask.min) : 0, n);
  const hi = Math.max(lo, Math.min(int(ask.max) && ask.max >= 0 ? ask.max : n, n));
  return [lo, hi];
}

/** order: the count a legal `ordered` may have, `[lo, hi]`. */
export function orderBounds(ask) {
  const total = len(ask.dest) + len(ask.source);
  if (!(int(ask.max) && ask.max >= 0)) return [0, total];
  const lo = Math.max(0, total - ask.max);
  const hi = Math.max(lo, Math.min(total, total - Math.max(0, int(ask.min) ? ask.min : 0)));
  return [lo, hi];
}

/** assign_amount: each target's `[min, max]`, as the bridge applies them. */
export function amountBounds(ask) {
  const ts = Array.isArray(ask.targets) ? ask.targets : [];
  return ts.map((t) => [int(t?.min) ? t.min : ask.atLeastOne === true ? 1 : 0, int(t?.max) ? t.max : ask.total]);
}

/** Lethal damage per blocker target of an assign_damage ask (the wire's own `lethal`). */
function lethalOf(t) {
  return int(t?.lethal) && t.lethal >= 0 ? t.lethal : 0;
}

/**
 * Why the bridge must refuse `value` as the answer to `ask`, or null when it is
 * legal. `null` answers are always legal (section 5.4) and never reach here.
 */
export function answerRefusal(ask, value) {
  switch (ask.kind) {
    case 'ability_menu':
    case 'options':
      return int(value) && value >= 0 && value < len(ask.options) ? null : `${JSON.stringify(value)} is not an offered option`;
    case 'confirm':
      return typeof value === 'boolean' ? null : 'not a boolean';
    case 'text': {
      if (typeof value !== 'string') return 'not a string';
      if (ask.numeric !== true) return null;
      if (!/^[0-9]+$/.test(value)) return `${JSON.stringify(value)} is not a number`;
      const n = Number(value);
      if ((int(ask.min) && n < ask.min) || (int(ask.max) && n > ask.max) || n > 2147483647) return `${n} is out of range`;
      return null;
    }
    case 'choose_list':
    case 'choose_entities': {
      if (!Array.isArray(value) || !value.every(int)) return 'not a list of option ids';
      const b = pickBounds(ask);
      if (b === null) return null;                     // a reveal: nothing is chosen
      const bad = distinct(value, len(ask.options));
      if (bad !== null) return bad;
      return value.length < b[0] || value.length > b[1] ? `${value.length} chosen, ${b[0]}..${b[1]} allowed` : null;
    }
    case 'order': {
      if (!plain(value)) return 'not {ordered, remember}';
      if (value.remember !== undefined && value.remember !== null && typeof value.remember !== 'boolean') return 'remember not a boolean';
      const total = len(ask.dest) + len(ask.source);
      const bad = distinct(value.ordered, total);
      if (bad !== null) return bad;
      const [lo, hi] = orderBounds(ask);
      return value.ordered.length < lo || value.ordered.length > hi ? `${value.ordered.length} put, ${lo}..${hi} allowed` : null;
    }
    case 'sideboard': {
      const total = len(ask.main) + len(ask.side);
      const bad = distinct(value, total);
      if (bad !== null) return bad;
      if (int(ask.mainMin) && value.length < ask.mainMin) return `a main deck of ${value.length}, at least ${ask.mainMin}`;
      if (int(ask.sideMax) && total - value.length > ask.sideMax) return `a sideboard of ${total - value.length}, at most ${ask.sideMax}`;
      return null;
    }
    case 'manipulate_list': {
      const n = len(ask.cards);
      const bad = distinct(value, n);
      if (bad !== null) return bad;
      if (value.length !== n) return `${value.length} of ${n} cards listed`;
      const free = new Set(Array.isArray(ask.manipulable) ? ask.manipulable : []);
      for (let i = 0; i < n; i++) if (!free.has(i) && value[i] !== i) return `card ${i} moved but not offered`;
      return null;
    }
    case 'assign_amount': {
      if (!plain(value)) return 'not a map of amounts';
      const bounds = amountBounds(ask);
      const got = bounds.map(() => 0);
      let sum = 0;
      for (const [k, v] of Object.entries(value)) {
        if (!/^[0-9]+$/.test(k) || Number(k) >= bounds.length) return `target ${k} not offered`;
        if (!int(v)) return `amount ${JSON.stringify(v)} not a whole number`;
        if (v < 0) return 'a negative amount';
        got[Number(k)] += v;
        sum += v;
      }
      for (let i = 0; i < bounds.length; i++) if (got[i] > bounds[i][1]) return `target ${i} over its max ${bounds[i][1]}`;
      const feasible = bounds.reduce((a, b) => a + b[1], 0) >= ask.total && bounds.reduce((a, b) => a + b[0], 0) <= ask.total
        && bounds.every((b) => b[1] >= b[0]);
      if (!feasible) return sum > ask.total ? `${sum} assigned of ${ask.total}` : null;
      for (let i = 0; i < bounds.length; i++) if (got[i] < bounds[i][0]) return `target ${i} under its min ${bounds[i][0]}`;
      return sum !== ask.total ? `${sum} assigned of ${ask.total}` : null;
    }
    case 'assign_damage': {
      // The wire half of M67's rule: the defender only when allowed, exactly
      // `total`, targets offered, no negative amount -- and, when the bridge
      // says how much is lethal, the defender only once every blocker has it.
      if (!plain(value)) return 'not a map of amounts';
      const ts = Array.isArray(ask.targets) ? ask.targets : [];
      const got = ts.map(() => 0);
      let sum = 0;
      for (const [k, v] of Object.entries(value)) {
        if (!/^[0-9]+$/.test(k) || Number(k) >= ts.length) return `target ${k} not offered`;
        if (!int(v)) return `amount ${JSON.stringify(v)} not a whole number`;
        if (v < 0) return 'a negative amount';
        got[Number(k)] += v;
        sum += v;
      }
      if (got[0] > 0 && ask.defenderAllowed === false) return `${got[0]} to the defender with defenderAllowed false`;
      if (sum !== ask.total) return `${sum} assigned of ${ask.total}`;
      // (A "divided as you choose" attacker may skip this; the wire does not say
      // which attacker divides, so the adversary never builds that answer for one.)
      if (got[0] > 0 && ask.defenderAllowed === true) {
        for (let i = 1; i < ts.length; i++) if (got[i] < lethalOf(ts[i])) return `the defender before target ${i} has lethal`;
      }
      return null;
    }
    default:
      return null;
  }
}

/** The bridge's own legal fill for assign_amount: each target's min, then the rest in order up to each max. */
function amountFill(ask) {
  const bounds = amountBounds(ask);
  let left = int(ask.total) ? ask.total : 0;
  const got = bounds.map(([lo]) => {
    const g = Math.min(Math.max(0, left), lo);
    left -= g;
    return g;
  });
  bounds.forEach(([, hi], i) => {
    const add = Math.min(left, Math.max(0, hi - got[i]));
    got[i] += add;
    left -= add;
  });
  return got;
}

const toMap = (got) => Object.fromEntries(got.map((g, i) => [String(i), g]));

/** Lethal to each blocker in order, the rest on the defender when allowed, else on the last blocker. */
function damageAuto(ask) {
  const ts = Array.isArray(ask.targets) ? ask.targets : [];
  const total = int(ask.total) ? ask.total : 0;
  const got = ts.map(() => 0);
  let left = total;
  let last = 0;
  for (let i = 1; i < ts.length && left > 0; i++) {
    const d = Math.min(lethalOf(ts[i]), left);
    got[i] += d;
    left -= d;
    last = i;
  }
  if (left > 0) {
    if (ask.defenderAllowed !== false && (ts.length === 1 || ask.defenderAllowed === true)) got[0] += left;
    else got[last > 0 ? last : Math.min(1, ts.length - 1)] += left;
  }
  return got;
}

/** A legal non-null answer for `ask`, or null when null is the only (or the safest) one. */
export function legalAnswer(ask) {
  switch (ask.kind) {
    case 'ability_menu':
    case 'options': {
      const opts = Array.isArray(ask.options) ? ask.options : [];
      if (opts.length === 0) return null;
      const i = opts.findIndex((o) => o?.canPlay !== false);
      return i >= 0 ? opts[i].id : opts[0].id;
    }
    case 'confirm':
      return ask.defaultYes === true;
    case 'text':
      if (ask.numeric !== true) return '';
      return int(ask.min) && ask.min >= 0 ? String(ask.min) : null;
    case 'choose_list':
    case 'choose_entities': {
      const b = pickBounds(ask);
      if (b === null) return [];
      // One more than the minimum when the list allows it, so an optional
      // choice is really made and its marshalling runs.
      const want = b[0] === 0 && b[1] >= 1 ? 1 : b[0];
      return (ask.options ?? []).slice(0, want).map((o) => o.id);
    }
    case 'order': {
      const [lo, hi] = orderBounds(ask);
      const dest = len(ask.dest);
      const k = Math.max(lo, Math.min(dest, hi));
      return { ordered: range(k), remember: false };
    }
    case 'sideboard':
      return range(len(ask.main));
    case 'manipulate_list':
      return range(len(ask.cards));
    case 'assign_amount':
      return len(ask.targets) === 0 ? null : toMap(amountFill(ask));
    case 'assign_damage':
      return len(ask.targets) === 0 || !int(ask.total) ? null : toMap(damageAuto(ask));
    default:
      return null;
  }
}

/**
 * The illegal answers to try on `ask`, worst first, each `{label, value}`.
 * Every value is one `answerRefusal` refuses (the selftest checks it); a kind
 * with no illegal answer the wire can express (none today) returns [].
 */
export function illegalAnswers(ask) {
  const out = [];
  const add = (label, value) => {
    if (answerRefusal(ask, value) !== null) out.push({ label, value });
  };
  switch (ask.kind) {
    case 'ability_menu':
    case 'options': {
      const n = len(ask.options);
      add('an id not offered', n);
      add('a negative id', -1);
      add('the id as a string', '0');
      add('a list', [0]);
      break;
    }
    case 'confirm':
      add('a number', 1);
      add('a string', 'yes');
      break;
    case 'text':
      if (ask.numeric === true) {
        if (int(ask.max)) add('one over the maximum', String(ask.max + 1));
        if (int(ask.min) && ask.min > 0) add('one under the minimum', String(ask.min - 1));
        add('a negative number', '-1');
        add('not a number', 'many');
        add('a number, not a string', 3);
      } else {
        add('a number, not a string', 3);
        add('an object', {});
      }
      break;
    case 'choose_list':
    case 'choose_entities': {
      const n = len(ask.options);
      const b = pickBounds(ask);
      if (b === null) {
        add('a reveal answered with a non-list', 'ok');
        break;
      }
      const [lo, hi] = b;
      if (lo > 0) add('too few picks', range(lo - 1));
      if (hi < n) add('too many picks', range(hi + 1));
      if (n >= 1) add('a duplicate pick', lo >= 2 ? [0, ...range(lo - 1)] : [0, 0]);
      add('an id not offered', [n]);
      add('a negative id', [-1]);
      add('a fraction', [0.5]);
      add('a string', '0');
      break;
    }
    case 'order': {
      const total = len(ask.dest) + len(ask.source);
      const [lo, hi] = orderBounds(ask);
      if (lo > 0) add('too few in the list', { ordered: range(lo - 1), remember: false });
      if (hi < total) add('too many in the list', { ordered: range(hi + 1), remember: false });
      if (total >= 1) add('an item twice', { ordered: [0, ...range(Math.max(lo, 1))], remember: false });
      add('an id not offered', { ordered: [...range(Math.max(0, lo - 1)), total], remember: false });
      add('remember not a boolean', { ordered: range(lo), remember: 1 });
      add('a bare list', range(lo));
      break;
    }
    case 'sideboard': {
      const main = len(ask.main);
      const total = main + len(ask.side);
      if (main >= 1) add('a card twice (a copy the pool lacks)', [...range(main), 0]);
      add('every slot the same card', Array.from({ length: Math.max(1, main) }, () => 0));
      add('a card not in the pool', [...range(Math.max(0, main - 1)), total]);
      if (int(ask.mainMin) && ask.mainMin > 0) add('a main deck one too small', range(ask.mainMin - 1));
      if (int(ask.sideMax) && total - main >= 0) {
        const keep = total - ask.sideMax - 1;
        if (keep >= 0) add('a sideboard one too big', range(keep));
      }
      add('a string', 'all');
      break;
    }
    case 'manipulate_list': {
      const n = len(ask.cards);
      add('one card short', range(n - 1));
      if (n >= 2) add('a card twice', [0, ...range(n - 1)]);
      const fixed = range(n).find((i) => !(ask.manipulable ?? []).includes(i));
      if (fixed !== undefined && n >= 2) {
        const p = range(n);
        const j = fixed === 0 ? 1 : 0;
        [p[fixed], p[j]] = [p[j], p[fixed]];
        add('a card not offered moved', p);
      }
      break;
    }
    case 'assign_amount': {
      const bounds = amountBounds(ask);
      const n = bounds.length;
      const total = int(ask.total) ? ask.total : 0;
      const fill = amountFill(ask);
      if (n >= 1) {
        // the total off by one, both ways
        const over = [...fill];
        const room = bounds.findIndex(([, hi], i) => over[i] < hi);
        over[room >= 0 ? room : 0] += 1;
        add('one more than the total', toMap(over));
        const under = [...fill];
        const spare = bounds.findIndex(([lo], i) => under[i] > lo);
        if (spare >= 0) {
          under[spare] -= 1;
          add('one less than the total', toMap(under));
        }
        // a target over its own max, the total kept
        const capped = bounds.findIndex(([, hi]) => hi < total);
        if (capped >= 0) {
          const v = bounds.map(() => 0);
          v[capped] = bounds[capped][1] + 1;
          let left = total - v[capped];
          for (let i = 0; i < n && left > 0; i++) if (i !== capped) { v[i] = left; left = 0; }
          add('a target over its max', toMap(v));
        }
        add('everything on one target', toMap([total * 5, ...range(n - 1).map(() => 0)]));
        // atLeastOne: a target left at zero, the total kept
        if (n >= 2 && bounds.every(([lo]) => lo >= 1)) add('a target with none (atLeastOne)', toMap([total, ...range(n - 1).map(() => 0)]));
      }
      add('a target not offered', { ...toMap(fill), [String(n)]: 1 });
      add('a negative amount', toMap([total + 1, -1, ...range(Math.max(0, n - 2)).map(() => 0)].slice(0, Math.max(n, 2))));
      add('a fraction', { 0: total - 0.5, ...(n > 1 ? { 1: 0.5 } : {}) });
      add('a list, not a map', [total]);
      break;
    }
    case 'assign_damage': {
      const ts = Array.isArray(ask.targets) ? ask.targets : [];
      const total = int(ask.total) ? ask.total : 0;
      if (ask.defenderAllowed === false) add('all of it on the player without trample', { 0: total });
      if (ask.defenderAllowed === true && ts.slice(1).some((t) => lethalOf(t) > 0)) add('the player before every blocker has lethal', { 0: total });
      if (ts.length > 1) {
        add('one short of the total', { 1: total - 1 });
        add('one over the total', { 1: total + 1 });
      }
      add('a target not offered', { [String(ts.length)]: total });
      add('a list, not a map', [total]);
      break;
    }
    default:
      break;
  }
  return out;
}
