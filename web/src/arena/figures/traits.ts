/*
 * mtg-table — arena/figures/traits.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Per-card identity, as data** (Tier 2 slice 3; report 13 §11's T9 and T10).
 *
 *     traitFor(card, data) →
 *       default  ⊕  every matching subtype rung (least specific first)  ⊕  the card's own row
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock. `figures.json` says which
 * BODY a card stands in; `traits.json` says what makes it THAT card: how big it
 * is, whether it hovers and how high, what colour it is, what it is carrying or
 * wearing (`figures/props.ts`'s kit), whether it is one figure or a swarm, and
 * whether it is a vehicle's silhouette rather than a body at all.
 *
 * ---------------------------------------------------------------------------
 * Three rules, each the same as a rule the arena already keeps:
 *
 *  1. **A concealed card gets the default, and the default is nothing.** Hard
 *     rule 8's renderer half (report 13 §1.4): choosing wings for a card is a
 *     statement about what the card is. `traitFor` never reads a hidden card's
 *     name, and `figurePose` never calls it for a card drawn as a back — a
 *     face-down creature is the anonymous disc with no props, no hover, no swarm
 *     (`web/test/traits.test.ts` asserts it over the corpus's 1,138 face-down
 *     instances).
 *  2. **It keys off the SNAPSHOT** — the card is on the battlefield and this is
 *     its name and type line — never off an event, so every trait is a pose and
 *     survives `skip all`, a backwards scrub and a `resync` (D56).
 *  3. **A broken row is dropped, never the file** (`figures/validate.ts`'s
 *     `validateTraits`), and the ladder falls through: the worst a typo in
 *     `traits.json` can do is make a card look generic again.
 *
 * **Merging.** Scalar fields are taken from the most specific rung that says
 * them; `props` is REPLACED, not appended, by a more specific rung that names it
 * (so a card can take an archetype's props away with `"props": []`); a
 * `costume` (slice 4) MERGES slot by slot, so a card row can name its hair and
 * keep its subtype's suit. The subtype
 * rungs are the words `resolve.ts`'s `SUBTYPE_ORDER` recognises, applied from the
 * least specific to the most, so a Robot Villain gets the villain's shade and the
 * robot's eye, and the robot's hover wins where both speak.
 * ---------------------------------------------------------------------------
 */

import { isHidden, type AnyCard } from '../../protocol.ts';
import type { BodyStyle, CostumeSlot, Formation, IdleStyle, PropKind, Silhouette } from './props.ts';
import { SUBTYPE_ORDER, figureSubtypesOf } from './resolve.ts';
import traitsJson from './traits.json' with { type: 'json' };
import { validateTraits } from './validate.ts';

export { IDLE_STYLES, type IdleStyle } from './props.ts';

/**
 * One row of `traits.json`, after validation — **every field optional**, because
 * a row says only what it changes. `null` / absent means "the rung below decides".
 */
export interface TraitRow {
  /** Multiplies the figure's height (before the width clamp). */
  scale?: number;
  /** World units the figure hovers above its stand point. */
  hover?: number;
  /** `hover` bobs gently while frames are drawn; `static` stands still. */
  idle?: IdleStyle;
  /** Replaces the body tint (figures.json's). */
  tint?: string;
  /** The colour a prop whose kit colour is `accent` is drawn in. */
  accent?: string;
  /** Multiplies the body tint's brightness — a villain reads darker. */
  shade?: number;
  /** Degrees the figure is turned about y from its facing — the giant ant flies side-on. */
  turn?: number;
  /**
   * The model's resting width over its height ONCE TURNED — i.e. its depth ratio —
   * which the width clamp needs and `models.json` does not carry. Measured from the
   * committed `figures.glb` by `web/test/traits.test.ts`, which fails if it is low.
   */
  turnedRatio?: number;
  /** Named props from the kit (`figures/props.ts`). Replaces, never appends. */
  props?: readonly PropKind[];
  /** How many copies: the Air Force's bees, the Agents' squad. 0 = one figure. */
  swarm?: number;
  formation?: Formation;
  /** A vehicle drawn as its silhouette instead of a body (T10). */
  silhouette?: Silhouette | null;
  /**
   * The scale Ant-Man's attack shrinks him to — **a key the cue layer reads**
   * (`attack.shrink`), carried here so the size of a card lives in one file.
   * The pose never applies it: shrinking is a transition, and transitions are cues.
   */
  shrink?: number;
  /**
   * **Slice 4 — what the body WEARS**: one colour per costume slot
   * (`figures/props.ts`'s `COSTUME_SLOTS` — skin, hair, top, shirt, legs, shoes,
   * gloves, belt), `#rrggbb` or the word `tint` (the figure's own tint). Merged
   * KEY BY KEY down the ladder — a card row that says only `hair` keeps its
   * subtype's suit — and every slot nobody names is filled by
   * `figures/pose.ts`'s `costumeOf` from the tint. Drawn only on a body whose
   * vertices carry slots (the `human` and chibi bodies), never on an anonymous one.
   */
  costume?: Readonly<Partial<Record<CostumeSlot, string>>>;
  /**
   * **Slice 4 — which humanoid body**: `human` (the proportioned Universal Base
   * Character, the default) or `chibi` (the Kenney body slices 1–3 drew — the
   * model id `<id>-chibi`, kept in the library so nothing was lost).
   */
  body?: BodyStyle;
}

/** A row with every field decided — what the pose reads. */
export interface TraitSpec {
  scale: number;
  hover: number;
  idle: IdleStyle;
  tint: string | null;
  accent: string | null;
  shade: number;
  turn: number;
  turnedRatio: number | null;
  props: readonly PropKind[];
  swarm: number;
  formation: Formation;
  silhouette: Silhouette | null;
  shrink: number | null;
  costume: Readonly<Partial<Record<CostumeSlot, string>>>;
  body: BodyStyle;
}

export const DEFAULT_TRAIT: TraitSpec = Object.freeze({
  scale: 1,
  hover: 0,
  idle: 'static' as IdleStyle,
  tint: null,
  accent: null,
  shade: 1,
  turn: 0,
  turnedRatio: null,
  props: Object.freeze([]) as readonly PropKind[],
  swarm: 0,
  formation: 'ring' as Formation,
  silhouette: null,
  shrink: null,
  costume: Object.freeze({}),
  body: 'human' as BodyStyle,
});

/** `traits.json`, after validation. */
export interface TraitData {
  version: number;
  /** Keyed on the wire's exact `card.name`. */
  cards: Readonly<Record<string, TraitRow>>;
  /** `subtype:<word>` — the words `SUBTYPE_ORDER` recognises. */
  archetypes: Readonly<Record<string, TraitRow>>;
  default: TraitRow;
}

export const EMPTY_TRAIT_DATA: TraitData = Object.freeze({
  version: 1,
  cards: Object.freeze({}),
  archetypes: Object.freeze({}),
  default: Object.freeze({}),
});

/** The rung keys, in the order they are applied — least specific first. */
export function traitSubtypeKey(subtype: string): string {
  return `subtype:${subtype}`;
}

export interface TraitMatch {
  spec: TraitSpec;
  /**
   * Which rungs contributed, least specific first — **categories**, never a name
   * (`card`, `subtype:insect`), because this travels into the scene with the pose.
   */
  rungs: string[];
}

function apply(into: TraitSpec, row: TraitRow): TraitSpec {
  return {
    scale: row.scale ?? into.scale,
    hover: row.hover ?? into.hover,
    idle: row.idle ?? into.idle,
    tint: row.tint ?? into.tint,
    accent: row.accent ?? into.accent,
    shade: row.shade ?? into.shade,
    turn: row.turn ?? into.turn,
    turnedRatio: row.turnedRatio ?? into.turnedRatio,
    props: row.props ?? into.props,
    swarm: row.swarm ?? into.swarm,
    formation: row.formation ?? into.formation,
    silhouette: row.silhouette === undefined ? into.silhouette : row.silhouette,
    shrink: row.shrink ?? into.shrink,
    // A costume merges key by key: a card that names only its hair keeps its rung's suit.
    costume: row.costume === undefined ? into.costume : { ...into.costume, ...row.costume },
    body: row.body ?? into.body,
  };
}

/**
 * **The ladder.** Total, never throws, and a concealed card gets
 * {@link DEFAULT_TRAIT} and nothing else — its name is never read.
 */
export function traitFor(card: AnyCard, data: TraitData): TraitMatch {
  if (isHidden(card)) return { spec: DEFAULT_TRAIT, rungs: [] };
  let spec = apply(DEFAULT_TRAIT, data.default);
  const rungs: string[] = [];
  const subtypes = figureSubtypesOf(card);
  // Least specific first, so the most specific subtype is applied last and wins.
  for (let i = subtypes.length - 1; i >= 0; i--) {
    const key = traitSubtypeKey(subtypes[i]!);
    const row = data.archetypes[key];
    if (row === undefined) continue;
    spec = apply(spec, row);
    rungs.push(key);
  }
  const name = (card as { name?: string }).name;
  if (typeof name === 'string' && name !== '') {
    const row = data.cards[name];
    if (row !== undefined) {
      spec = apply(spec, row);
      rungs.push('card');
    }
  }
  return { spec, rungs };
}

/** The subtype words a `traits.json` archetype key may name. */
export const TRAIT_SUBTYPES: readonly string[] = SUBTYPE_ORDER;

/**
 * **The committed `traits.json`, validated once at import.** `figurePose` reads it
 * when its caller passes none — which is how the arena picks it up with no new
 * prop through `Arena.tsx` — and a test passes its own. A broken row is dropped
 * (and `traits.test.ts` fails on it); the console hears about it once.
 */
function committed(): TraitData {
  const result = validateTraits(traitsJson);
  for (const problem of result.errors) {
    console.warn(`[arena] traits.json ${problem.where}: ${problem.message} — entry dropped`);
  }
  return result.data;
}

export const TRAITS: TraitData = committed();
