// mtg-table — the cube lab: a cube's skeleton (colour quotas, curve, lands), the selections that fill
// one exactly, and the cube document they are written as.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Shared by `library-candidates` (library-candidates.ts: Omega's skeleton, J136's candidate 180s) and
// `sample` (sample.ts: the census's stratified cubes, D445).  Moved here from library-candidates.ts
// unchanged, except that cubeDocument also writes a section of three-or-more-colour cards and land
// lines a cube without two lands a pair needs; library-candidates' documents are the same bytes.
//
// OMEGA'S SKELETON (cubes/omega-cube-180.md's header and list): 24 mono-coloured nonland cards a
// colour, 2 gold cards a colour pair (no card of three or more colours), 18 colourless nonland
// cards, and 22 lands: 2 a colour pair that make exactly that pair (Omega's original dual and
// fetchland) and 2 others (Omega's Mishra's Factory and Mutavault); the 158 nonland cards on
// Omega's curve, 3 / 24 / 32 / 34 / 30 / 17 / 11 / 7 at mana value 0 .. 6 and 7+.  Colours are the
// printed ones from the engine (as evolve's colour constraint counts them), basic lands never.
//
// A SLOT PLAN is the same idea, general enough for the census's four structures: nonland groups
// (a colour string, exactly; or `gold`, any card of two or more colours), a curve, and land groups
// (`pair:WU`, a land that makes exactly that pair, or failing that one of three or more colours that
// includes it; `other`, a land that does not make exactly a pair; `fixer`, a land of two or more
// colours; `utility`, one of fewer).  planOf(OMEGA_SKELETON) is Omega's skeleton as a plan.
// selectSlots fills a plan with a min-cost flow in which a card may offer several slots and is
// taken at most once.  Everything here is pure; web/test/cubelab-library.test.ts and
// web/test/cubelab-census.test.ts test it.

import type { LibraryCard } from './library-candidates.ts';

// ---------------------------------------------------------------- Omega's skeleton

export const MONO = ['W', 'U', 'B', 'R', 'G'] as const;
export const PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'] as const;
export const SECTION_OF: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
export const GUILD_OF: Record<string, string> = {
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', WG: 'Selesnya', WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', WR: 'Boros', UG: 'Simic',
};

export interface Skeleton {
  /** Nonland cards a colour class: 'W'..'G', each pair, and '' (colourless). */
  classes: Record<string, number>;
  /** Nonland cards a mana-value bucket, 0 .. 6 and 7 (7+). */
  curve: number[];
  /** Lands a pair makes, exactly that pair. */
  fixersPerPair: number;
  otherLands: number;
}

export const OMEGA_SKELETON: Skeleton = {
  classes: { W: 24, U: 24, B: 24, R: 24, G: 24, ...Object.fromEntries(PAIRS.map((p) => [p, 2])), '': 18 },
  curve: [3, 24, 32, 34, 30, 17, 11, 7],
  fixersPerPair: 2,
  otherLands: 2,
};

export const bucketOf = (mv: number): number => Math.min(7, Math.max(0, Math.floor(mv)));
/** The colour class a nonland card fills, or null for one of three or more colours. */
export const classOf = (colors: string): string | null => (colors.length <= 2 ? colors : null);
/** The pair a land fixes, or null for an other land. */
export const fixesPair = (c: Pick<LibraryCard, 'produces'>): string | null => ((PAIRS as readonly string[]).includes(c.produces) ? c.produces : null);

/** What a list holds, in the skeleton's terms (the test's reading and the headers'). */
export function shapeOf(cards: Array<Pick<LibraryCard, 'colors' | 'mv' | 'land' | 'produces'>>): { classes: Record<string, number>; curve: number[]; fixers: Record<string, number>; otherLands: number; threePlus: number } {
  const classes: Record<string, number> = {};
  const curve = new Array(8).fill(0) as number[];
  const fixers: Record<string, number> = {};
  let otherLands = 0, threePlus = 0;
  for (const c of cards) {
    if (c.land) {
      const p = fixesPair(c);
      if (p) fixers[p] = (fixers[p] ?? 0) + 1; else otherLands++;
      continue;
    }
    const k = classOf(c.colors);
    if (k === null) { threePlus++; continue; }
    classes[k] = (classes[k] ?? 0) + 1;
    curve[bucketOf(c.mv)] = (curve[bucketOf(c.mv)] as number) + 1;
  }
  return { classes, curve, fixers, otherLands, threePlus };
}

/** Every way a list misses the skeleton (empty: it fits exactly). */
export function skeletonErrors(cards: Array<Pick<LibraryCard, 'colors' | 'mv' | 'land' | 'produces'>>, sk: Skeleton = OMEGA_SKELETON): string[] {
  const s = shapeOf(cards);
  const out: string[] = [];
  for (const [k, n] of Object.entries(sk.classes)) if ((s.classes[k] ?? 0) !== n) out.push(`class ${k || 'colourless'}: ${s.classes[k] ?? 0}, want ${n}`);
  for (const k of Object.keys(s.classes)) if (!(k in sk.classes)) out.push(`class ${k}: not in the skeleton`);
  sk.curve.forEach((n, b) => { if (s.curve[b] !== n) out.push(`mana value ${b}${b === 7 ? '+' : ''}: ${s.curve[b]}, want ${n}`); });
  for (const p of PAIRS) if ((s.fixers[p] ?? 0) !== sk.fixersPerPair) out.push(`${p} fixing lands: ${s.fixers[p] ?? 0}, want ${sk.fixersPerPair}`);
  if (s.otherLands !== sk.otherLands) out.push(`other lands: ${s.otherLands}, want ${sk.otherLands}`);
  if (s.threePlus) out.push(`${s.threePlus} card(s) of three or more colours`);
  return out;
}

// ---------------------------------------------------------------- the selection (Omega's skeleton)

/**
 * The nonland cards that fill `classes` and `curve` exactly with the largest total key: a min-cost
 * flow (successive shortest paths, Bellman-Ford on the residual graph; the graph is 26 nodes and an
 * edge a card, so it is instant).  `key` is an integer, larger better; ties go to the earlier card.
 */
export function selectNonland<T extends Pick<LibraryCard, 'colors' | 'mv'>>(cards: T[], key: (c: T) => number, sk: Skeleton = OMEGA_SKELETON): T[] {
  const classNames = Object.keys(sk.classes);
  const S = 0, T0 = 1 + classNames.length + sk.curve.length;
  const N = T0 + 1;
  const to: number[] = [], cap: number[] = [], cost: number[] = [], card: number[] = [];
  const adj: number[][] = Array.from({ length: N }, () => []);
  const edge = (u: number, v: number, c: number, w: number, ci = -1): void => {
    adj[u]!.push(to.length); to.push(v); cap.push(c); cost.push(w); card.push(ci);
    adj[v]!.push(to.length); to.push(u); cap.push(0); cost.push(-w); card.push(-1);
  };
  classNames.forEach((k, i) => edge(S, 1 + i, sk.classes[k] as number, 0));
  sk.curve.forEach((n, b) => edge(1 + classNames.length + b, T0, n, 0));
  cards.forEach((c, ci) => {
    const k = classOf(c.colors);
    const i = k === null ? -1 : classNames.indexOf(k);
    if (i >= 0) edge(1 + i, 1 + classNames.length + bucketOf(c.mv), 1, -key(c), ci);
  });
  const want = sk.curve.reduce((a, b) => a + b, 0);
  let flow = 0;
  while (flow < want) {
    const dist = new Array(N).fill(Infinity) as number[];
    const via = new Array(N).fill(-1) as number[];
    dist[S] = 0;
    for (let round = 0; round < N; round++) {
      let moved = false;
      for (let u = 0; u < N; u++) {
        if (dist[u] === Infinity) continue;
        for (const e of adj[u]!) {
          if (cap[e]! <= 0) continue;
          const d = dist[u]! + cost[e]!;
          if (d < dist[to[e]!]!) { dist[to[e]!] = d; via[to[e]!] = e; moved = true; }
        }
      }
      if (!moved) break;
    }
    if (dist[T0] === Infinity) throw new Error(`selectNonland: the skeleton cannot be filled from these cards (${flow} of ${want} placed)`);
    for (let v = T0; v !== S; v = to[via[v]! ^ 1]!) { cap[via[v]!]!--; cap[via[v]! ^ 1]!++; }
    flow++;
  }
  const out: T[] = [];
  for (let e = 0; e < to.length; e += 2) if (card[e]! >= 0 && cap[e] === 0) out.push(cards[card[e]!] as T);
  return out;
}

/** Each pair's best `fixersPerPair` fixing lands, then the best `otherLands` others, by `key`. */
export function selectLands<T extends Pick<LibraryCard, 'produces' | 'name'>>(lands: T[], key: (c: T) => number, sk: Skeleton = OMEGA_SKELETON): T[] {
  const order = [...lands].sort((a, b) => key(b) - key(a) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const out: T[] = [];
  for (const p of PAIRS) {
    const got = order.filter((c) => fixesPair(c) === p).slice(0, sk.fixersPerPair);
    if (got.length < sk.fixersPerPair) throw new Error(`selectLands: ${got.length} fixing land(s) for ${p}, the skeleton wants ${sk.fixersPerPair}`);
    out.push(...got);
  }
  const others = order.filter((c) => fixesPair(c) === null).slice(0, sk.otherLands);
  if (others.length < sk.otherLands) throw new Error(`selectLands: ${others.length} other land(s), the skeleton wants ${sk.otherLands}`);
  return [...out, ...others];
}

/** Drawable at all: the engine has it and supports it, and it is not a basic land. */
export const drawable = (c: LibraryCard): boolean => c.supported && !c.basic && !(c.land && /\bBasic\b/.test(c.type));

// ---------------------------------------------------------------- slot plans

export interface SlotPlan {
  /** Nonland cards a group: a colour string exactly ('' colourless, 'W', 'WU' ...), or 'gold' (two or more colours). */
  nonland: Record<string, number>;
  /** Nonland cards a mana-value bucket, 0 .. 6 and 7 (7+); sums to the nonland quotas. */
  curve: number[];
  /** Lands a group: 'pair:WU' .., 'other', 'fixer', 'utility' (the header comment says what each takes). */
  lands: Record<string, number>;
}

/** An Omega-style skeleton as a plan: the same quotas, `pair:<P>` for each pair's fixers and `other`. */
export function planOf(sk: Skeleton): SlotPlan {
  return { nonland: { ...sk.classes }, curve: [...sk.curve], lands: { ...Object.fromEntries(PAIRS.map((p) => [`pair:${p}`, sk.fixersPerPair])), other: sk.otherLands } };
}

/** Omega's curve scaled to `n` cards: largest remainder, ties to the lower mana value. */
export function scaleCurve(n: number, base: number[] = OMEGA_SKELETON.curve): number[] {
  const total = base.reduce((a, b) => a + b, 0);
  const raw = base.map((x) => (x * n) / total);
  const out = raw.map(Math.floor);
  const order = raw.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0, left = n - out.reduce((a, b) => a + b, 0); k < left; k++) out[order[k]!.i]!++;
  return out;
}

export const sumOf = (r: Record<string, number> | number[]): number => Object.values(r).reduce((a: number, b: number) => a + b, 0);

/** The nonland group a card of these printed colours fills in `plan`, or null for none. */
export function nonlandGroupOf(plan: SlotPlan, colors: string): string | null {
  if (colors in plan.nonland) return colors;
  if (colors.length >= 2 && 'gold' in plan.nonland) return 'gold';
  return null;
}

/** Every land group a land making `produces` may fill in `plan`; `superset` marks a pair slot taken by a land of three or more colours. */
export function landGroupsOf(plan: SlotPlan, produces: string): Array<{ group: string; superset: boolean }> {
  const out: Array<{ group: string; superset: boolean }> = [];
  for (const p of PAIRS) {
    const g = `pair:${p}`;
    if (!(g in plan.lands)) continue;
    if (produces === p) out.push({ group: g, superset: false });
    else if (produces.length >= 3 && [...p].every((k) => produces.includes(k))) out.push({ group: g, superset: true });
  }
  if ('other' in plan.lands && !(PAIRS as readonly string[]).includes(produces)) out.push({ group: 'other', superset: false });
  if ('fixer' in plan.lands && produces.length >= 2) out.push({ group: 'fixer', superset: false });
  if ('utility' in plan.lands && produces.length < 2) out.push({ group: 'utility', superset: false });
  return out;
}

export interface SlotOption { group: string; cost: number }

/**
 * Items that fill every group's quota and every bucket's count exactly, each item at most once, at
 * the least total cost: a min-cost flow source -> group (its quota) -> item (1) -> bucket (its
 * count) -> sink, by successive shortest paths (Dijkstra on reduced costs; every cost must be a
 * whole number >= 0, so the potentials start at 0).  An item offers the groups `optionsOf` names,
 * each at its own cost.  Returns the chosen items, in item order, with the group each fills; throws
 * when the quotas cannot all be met.  Deterministic: the same items in the same order give the same
 * answer.
 */
export function selectSlots<T>(items: T[], groups: Record<string, number>, buckets: number[], optionsOf: (t: T) => SlotOption[], bucketOfItem: (t: T) => number): Array<{ item: T; group: string }> {
  const gNames = Object.keys(groups).filter((g) => (groups[g] as number) > 0);
  const want = gNames.reduce((a, g) => a + (groups[g] as number), 0);
  if (want !== buckets.reduce((a, b) => a + b, 0)) throw new Error(`selectSlots: the groups want ${want} and the buckets ${buckets.reduce((a, b) => a + b, 0)}`);
  const gIx = new Map(gNames.map((g, i) => [g, 1 + i]));
  const I0 = 1 + gNames.length, B0 = I0 + items.length, T = B0 + buckets.length, N = T + 1;
  const to: number[] = [], cap: number[] = [], cost: number[] = [], tag: number[] = [];
  const adj: number[][] = Array.from({ length: N }, () => []);
  const edge = (u: number, v: number, c: number, w: number, t = -1): void => {
    if (!Number.isInteger(w) || w < 0) throw new Error(`selectSlots: a cost must be a whole number >= 0, got ${w}`);
    adj[u]!.push(to.length); to.push(v); cap.push(c); cost.push(w); tag.push(t);
    adj[v]!.push(to.length); to.push(u); cap.push(0); cost.push(-w); tag.push(-1);
  };
  gNames.forEach((g, i) => edge(0, 1 + i, groups[g] as number, 0));
  buckets.forEach((n, b) => { if (n > 0) edge(B0 + b, T, n, 0); });
  items.forEach((it, i) => {
    const opts = optionsOf(it).filter((o) => gIx.has(o.group));
    if (!opts.length) return;
    const b = bucketOfItem(it);
    if (!((buckets[b] ?? 0) > 0)) return;
    for (const o of opts) edge(gIx.get(o.group) as number, I0 + i, 1, o.cost, gIx.get(o.group) as number);
    edge(I0 + i, B0 + b, 1, 0);
  });
  const h = new Array(N).fill(0) as number[];
  let flow = 0;
  while (flow < want) {
    const dist = new Array(N).fill(Infinity) as number[];
    const via = new Array(N).fill(-1) as number[];
    dist[0] = 0;
    // a binary heap of [dist, node]
    const heap: Array<[number, number]> = [[0, 0]];
    const push = (x: [number, number]): void => {
      heap.push(x);
      for (let i = heap.length - 1; i > 0;) {
        const p = (i - 1) >> 1;
        if (heap[p]![0] < x[0] || (heap[p]![0] === x[0] && heap[p]![1] <= x[1])) break;
        heap[i] = heap[p]!; heap[p] = x; i = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        for (let i = 0; ;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          const less = (a: number, b: number): boolean => heap[a]![0] < heap[b]![0] || (heap[a]![0] === heap[b]![0] && heap[a]![1] < heap[b]![1]);
          if (l < heap.length && less(l, m)) m = l;
          if (r < heap.length && less(r, m)) m = r;
          if (m === i) break;
          const t = heap[i]!; heap[i] = heap[m]!; heap[m] = t; i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [d, u] = pop();
      if (d > dist[u]!) continue;
      for (const e of adj[u]!) {
        if (cap[e]! <= 0) continue;
        const v = to[e]!;
        const nd = d + cost[e]! + h[u]! - h[v]!;
        if (nd < dist[v]!) { dist[v] = nd; via[v] = e; push([nd, v]); }
      }
    }
    if (dist[T] === Infinity) throw new Error(`selectSlots: the quotas cannot be filled from these items (${flow} of ${want} placed)`);
    for (let v = 0; v < N; v++) if (dist[v] !== Infinity) h[v]! += dist[v]!;
    for (let v = T; v !== 0; v = to[via[v]! ^ 1]!) { cap[via[v]!]!--; cap[via[v]! ^ 1]!++; }
    flow++;
  }
  const groupOfItem = new Map<number, string>();
  for (let e = 0; e < to.length; e += 2) {
    if (tag[e]! < 0 || cap[e] !== 0) continue;
    groupOfItem.set(to[e]! - I0, gNames[tag[e]! - 1] as string);
  }
  return [...groupOfItem.keys()].sort((a, b) => a - b).map((i) => ({ item: items[i] as T, group: groupOfItem.get(i) as string }));
}

/** Every way a list misses a plan (empty: it fits exactly).  Nonland cards are counted; lands are matched to their groups by a flow. */
export function planErrors(cards: Array<Pick<LibraryCard, 'name' | 'colors' | 'mv' | 'land' | 'produces'>>, plan: SlotPlan): string[] {
  const out: string[] = [];
  const counts: Record<string, number> = {};
  const curve = new Array(8).fill(0) as number[];
  for (const c of cards.filter((x) => !x.land)) {
    const g = nonlandGroupOf(plan, c.colors);
    if (g === null) { out.push(`${c.name}: no slot for colours "${c.colors}"`); continue; }
    counts[g] = (counts[g] ?? 0) + 1;
    curve[bucketOf(c.mv)]!++;
  }
  for (const [g, n] of Object.entries(plan.nonland)) if ((counts[g] ?? 0) !== n) out.push(`group ${g || 'colourless'}: ${counts[g] ?? 0}, want ${n}`);
  plan.curve.forEach((n, b) => { if (curve[b] !== n) out.push(`mana value ${b}${b === 7 ? '+' : ''}: ${curve[b]}, want ${n}`); });
  const lands = cards.filter((x) => x.land);
  if (lands.length !== sumOf(plan.lands)) out.push(`lands: ${lands.length}, want ${sumOf(plan.lands)}`);
  else {
    try {
      selectSlots(lands, plan.lands, [lands.length], (l) => landGroupsOf(plan, l.produces).map((o) => ({ group: o.group, cost: 0 })), () => 0);
    } catch {
      out.push(`lands: these ${lands.length} cannot fill ${Object.entries(plan.lands).filter(([, n]) => n > 0).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the documents

const item = (c: LibraryCard): string => (c.tags.length ? `${c.name} — ${c.tags.join(' ')}` : c.name);
const byCurve = (a: LibraryCard, b: LibraryCard): number => a.mv - b.mv || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/**
 * A cube document in the lab's format (cube.ts), Omega's sections, theme table and format-counts
 * table.  A list with cards of three or more colours gets a section of its own after Gold; a pair
 * with no land of exactly its colours gets no land line, and a land line that would hold one card
 * whose name has a comma joins the line before it (cube.ts splits a one-card land line at commas).
 */
export function cubeDocument(o: { title: string; made: string[]; cards: LibraryCard[]; themeNames: Record<string, string>; notes: string[]; goldNote?: string; madeBy?: string }): string {
  const shape = shapeOf(o.cards);
  const nonland = o.cards.filter((c) => !c.land);
  const sections: Array<[string, string[], number]> = [];
  for (const k of MONO) {
    const cs = nonland.filter((c) => c.colors === k);
    sections.push([SECTION_OF[k] as string, [cs.sort(byCurve).map(item).join(' · ')], cs.length]);
  }
  const gold = nonland.filter((c) => c.colors.length === 2);
  sections.push(['Gold', PAIRS.filter((p) => gold.some((c) => c.colors === p)).map((p) => `${p}: ${gold.filter((c) => c.colors === p).sort(byCurve).map(item).join(' · ')}`), gold.length]);
  const multi = nonland.filter((c) => c.colors.length >= 3);
  if (multi.length) sections.push(['Three or more colours', [multi.sort(byCurve).map(item).join(' · ')], multi.length]);
  const colourless = nonland.filter((c) => c.colors === '');
  sections.push(['Colorless', [colourless.sort(byCurve).map(item).join(' · ')], colourless.length]);
  const lands = o.cards.filter((c) => c.land);
  const groups: Array<[string, LibraryCard[]]> = PAIRS.map((p) => [`${GUILD_OF[p]} lands`, lands.filter((c) => fixesPair(c) === p).sort(byCurve)]);
  groups.push(['Other lands', lands.filter((c) => fixesPair(c) === null).sort(byCurve)]);
  const kept = groups.filter(([, cs]) => cs.length > 0);
  for (let i = kept.length - 1; i > 0; i--) {
    const cs = kept[i]![1];
    if (cs.length === 1 && cs[0]!.name.includes(',')) { kept[i - 1]![1].push(...cs); kept.splice(i, 1); }
  }
  if (kept.length && kept[0]![1].length === 1 && kept[0]![1][0]!.name.includes(',') && kept.length > 1) { kept[1]![1].unshift(...kept[0]![1]); kept.shift(); }
  sections.push(['Lands', kept.map(([label, cs]) => `${label}: ${cs.map(item).join(' · ')}`), lands.length]);
  const creatures = nonland.filter((c) => /\bCreature\b/.test(c.type)).length;
  const walkers = nonland.filter((c) => /\bPlaneswalker\b/.test(c.type)).length;
  const ai = o.cards.filter((c) => c.aiFlag === 'All').map((c) => c.name);
  const L: string[] = [`# ${o.title}`, '', ...o.made.map((l) => `*${l}*`).flatMap((l) => [l, '']), '## Format counts', '', '| Section | Cards |', '|---|---|'];
  for (const [name, , n] of sections) L.push(`| ${name}${name === 'Gold' ? (o.goldNote ?? ' (2 per colour pair)') : ''} | ${n} |`);
  L.push(`| **Total** | **${o.cards.length}** |`, '');
  L.push(`${creatures} creatures, ${walkers} planeswalkers. Nonland mana-value curve: ${shape.curve.map((n, b) => `${n} at ${b}${b === 7 ? '+' : ''}`).join(', ')}.`, '');
  L.push(`Forge marks ${ai.length} of these AI:RemoveDeck:All (its AI plays them poorly or not at all)${ai.length ? `: ${ai.join(', ')}` : ''}.`, '');
  for (const n of o.notes) L.push(n, '');
  L.push('## The themes', '', 'Tags are omega-seed-pool.tsv\'s where it has the card, else the Synergy Cube\'s, else none; a card with no tag is listed bare.', '',
    '| Code | Theme |', '|---|---|');
  for (const [k, v] of Object.entries(o.themeNames)) L.push(`| ${k} | ${v} |`);
  L.push('', '## The list (name — themes)', '');
  for (const [name, lines, n] of sections) L.push(`### ${name} (${n})`, ...lines, '');
  L.push('## Iteration log', '', `- version 1: made by ${o.madeBy ?? '`tools/cubelab.sh library-candidates`'} (above).`, '');
  return L.join('\n');
}

/** ForgeCoach's Synergy document with one provenance paragraph under its title; its list untouched. */
export function withProvenance(text: string, line: string): string {
  const lines = text.split('\n');
  const t = lines.findIndex((l) => /^#\s+/.test(l));
  lines.splice(t + 1, 0, '', `*${line}*`);
  return lines.join('\n');
}
