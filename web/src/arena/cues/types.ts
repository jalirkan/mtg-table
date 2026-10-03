/*
 * mtg-table — arena/cues/types.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The vocabulary of the animation system** (report 09 §5.2, §7.2), and
 * nothing else: no three, no React, no DOM, no clock. Everything here is data,
 * which is why `web/test/cues-exhaustive.test.ts` and
 * `web/test/replay-cues.test.ts` can import it under `node --test` with type
 * stripping and no browser (§2.4, §10).
 *
 * ---------------------------------------------------------------------------
 * The one idea the whole file is shaped around (§5.1):
 *
 *     finalTransform(card) = layout(state)[card.id]  ⊕  offsets[card.id]
 *
 * A **cue** never says where a card *is*. It contributes a transient
 * {@link Offset} — in `stage.ts` — that starts at identity, is written while the
 * cue runs, and is back at identity when it ends. That is what makes every cue
 * skippable, interruptible and scrub-safe, and it is why nothing in this
 * directory can block input: there is no code path from a cue to `onAct`.
 * ---------------------------------------------------------------------------
 *
 * **`EVENT_KINDS` is re-exported from `protocol.ts` on purpose** (§13, "protocol
 * drift"). It is one `const` that is both the runtime list and the TypeScript
 * union, and `DEFAULT_CUES` in `defaults.ts` is typed `Record<EventKind,
 * CueSpec>` — so adding a kind to the protocol and forgetting the cue table is
 * a **compile error**, and the fixture sweep is the second net under it.
 */

export { EVENT_KINDS, isKnownEventKind, type EventKind } from '../../protocol.ts';

/**
 * Which of the four independent lanes a cue plays in (§5.2).
 *
 * Lanes exist so that one rule can be stated per lane rather than per cue:
 * `camera` never queues (§8 rule 2 — a new request preempts or is dropped),
 * `particle` is the first thing dropped when the blended-object cap is hit
 * (§9.3), `hud` is exempt from the table's z-fighting rules because it does not
 * live on the table, and `card` is everything else.
 */
export type Lane = 'card' | 'hud' | 'camera' | 'particle';

export const LANES: readonly Lane[] = ['card', 'hud', 'camera', 'particle'];

/**
 * A cue parameter. Primitives only, so a cue file is JSON and `validate.ts` can
 * check a value's type without a schema library (§7.4, decision D4).
 */
export type CueParamValue = number | string | boolean;
export type CueParams = Readonly<Record<string, CueParamValue>>;

export const NO_PARAMS: CueParams = Object.freeze({});

/**
 * The cue id that means "draw nothing, take no time".
 *
 * §7.3's ladder ends here and **never throws, never returns undefined**. It is
 * also the coverage assertion's failure signal: `replay-cues.test.ts` fails on
 * any event kind a fixture actually emitted that resolved to `NO_OP`, unless
 * the kind is on the (one-entry) allowlist.
 */
export const NO_OP = 'noop';

/** What the ladder resolves to: a registry id, a nominal duration, params. */
export interface CueSpec {
  cue: string;
  /** Nominal milliseconds at replay speed. `0` is a snap. */
  ms: number;
  params?: CueParams;
  /** Overrides the registry entry's own lane. Rarely needed. */
  lane?: Lane;
}

/**
 * One resolved, targeted cue: a {@link CueSpec} plus the ids it plays on.
 *
 * **Ids only** (protocol §3.6 rule 1). A cue never carries a card name, and
 * `replay-cues.test.ts` asserts that no string in `params` — and no string any
 * `Stage` op carries — is a card name from anywhere in the recording. The arena
 * is a new consumer of the same data and gets its own net (§10.3, §13).
 */
export interface Cue {
  /** The registry key, e.g. `zone.dissolve`. */
  id: string;
  /** Card ids this cue moves. May be empty for HUD- or camera-only cues. */
  targets: number[];
  /** Player ids this cue is about (life, turn, mulligan, shuffle). */
  players: number[];
  ms: number;
  lane: Lane;
  params: CueParams;
  /** The event kind that produced it — for the coverage table and the logs. */
  kind: string;
  /** The selector that matched, e.g. `zone:battlefield>graveyard`. */
  selector: string;
  /** Unique while this cue runs; effects key themselves off it. */
  key: string;
}

/**
 * A step is a group of cues that start together, staggered (§5.2).
 *
 * Consecutive same-kind events coalesce into one step — eight `tap` events from
 * one mana ability become one step of eight cues 40 ms apart, not eight
 * serialised 180 ms cues. Without that rule, tapping five lands takes a second
 * and the game feels broken.
 */
export interface Step {
  cues: Cue[];
  staggerMs: number;
  /** `max(cue.ms) + stagger tail` — how long the step occupies the timeline. */
  ms: number;
}

// ---------------------------------------------------------------------------
// The cue data file (§7.2)
// ---------------------------------------------------------------------------

/** A selector → cue mapping, as one entry of `cards` or `archetypes` carries. */
export type CueTable = Readonly<Record<string, CueSpec>>;

/**
 * **A persistent presentation rule, not a cue** (§5.1's one deliberate
 * exception). "The Helicarrier hovers above the board for the rest of the game"
 * is not something that can decay — a cue that decays would drop it back into
 * the rank the first time someone pressed skip. So it changes the *resting
 * pose*: `layout()` consults it, and it survives `flushAndSnap()` by
 * construction.
 *
 * E5 wires it into `layout.ts`; the shape is declared here so `validate.ts` can
 * check a `cues.json` that already carries one.
 */
export interface Presence {
  hoverY?: number;
  bobAmp?: number;
  bobHz?: number;
}

export interface CardCueEntry extends CueTable {}

/**
 * **A station: what a non-creature permanent keeps above its own card while it is
 * on the battlefield** (Tier 2 slice 3, T12) — `presence`'s sibling, and the
 * second persistent presentation rule this file carries.
 *
 * Two cards in this deck are enchantments that are neither creatures (no figure)
 * nor attached to one (no aura overlay), and each has one thing the source
 * material says it IS:
 *
 *  - **Strategic Intervention** is mission control: a holographic ops console
 *    over its card for as long as it is on the table;
 *  - **Web Up** holds something in a web: a cocoon hanging over its card.
 *
 * It is a **pose** — the snapshot says the card is on the battlefield, face up —
 * so it survives `skip all`, a scrub and a `resync` with no history, and it is
 * drawn by `scene/overlays.ts` from `figures/attach.ts`'s `stationsOf`. It is
 * deliberately NOT a link to another card: the wire never relates Web Up to the
 * card it exiled (measured — `attachedToId` is `null` on both in every frame of
 * the corpus), so the cocoon hangs over Web Up's own card and names nothing.
 */
export const STATION_KINDS = ['missionControl', 'cocoon'] as const;
export type StationKind = (typeof STATION_KINDS)[number];

export interface Station {
  kind: StationKind;
  /** `#rrggbb`; absent ⇒ the card's own colour identity. */
  colour?: string;
  /** How high above its card it hangs, in card heights. Absent ⇒ the kind's own. */
  lift?: number;
  /** Multiplies the kind's own size. Absent ⇒ 1. */
  scale?: number;
}

export interface CueData {
  version: number;
  /** Card **name** → selector → cue. Names, because that is what a cue is about. */
  cards: Readonly<Record<string, CueTable>>;
  /** `creature/W`, `land/*`, `equipment/*` → selector → cue (§7.3 step 3). */
  archetypes: Readonly<Record<string, CueTable>>;
  /**
   * Optional overrides of the built-in §6 table in `defaults.ts`.
   *
   * §7.2 sketches `defaults` as part of the JSON. It is **not** the source of
   * truth here, and the reason is §10.1: `DEFAULT_CUES` is typed
   * `Record<EventKind, CueSpec>`, so a protocol kind with no default is a
   * compile error — a guarantee JSON cannot give. The file may still override
   * an entry (that is how a default is tuned without a rebuild via `?cues=`),
   * and `resolve()` reads the override first.
   */
  defaults?: CueTable;
  /** Card name → persistent presentation (§5.1). */
  presence?: Readonly<Record<string, Presence>>;
  /** Card name → what it keeps above its card while on the battlefield (T12). */
  stations?: Readonly<Record<string, Station>>;
}

export const EMPTY_CUE_DATA: CueData = Object.freeze({
  version: 1,
  cards: Object.freeze({}),
  archetypes: Object.freeze({}),
});

/**
 * **A counter type, as a selector token.**
 *
 * §7.3's grammar spells the +1/+1 counter `P1P1` and `docs/protocol.md` §3.6
 * says the field is "the `CounterType` name, e.g. `P1P1`" — **and the wire does
 * not say that.** Every one of the 1,316 counter values in the committed corpus
 * is spelled `+1/+1` or `Spore`, i.e. Forge's *display* name, not its enum
 * constant. Measured, 2026-09-13.
 *
 * So the selector `counters:P1P1+` could never match anything, and the whole
 * counter half of the grammar was dead. This is the one line that makes it
 * live: the wire's spelling is normalised into the grammar's, rather than the
 * grammar being widened to a form (`counters:+1/+1+`) that collides with the
 * direction qualifiers `+` and `-` and that `validate.ts` would have to be
 * taught to parse.
 *
 * It is a **presentation** mapping, not a rules one: the worst case of getting
 * it wrong is the wrong pip on the wrong animation.
 */
export function counterToken(counter: string): string {
  if (counter === '+1/+1' || counter === 'P1P1') return 'P1P1';
  if (counter === '-1/-1' || counter === '−1/−1' || counter === 'M1M1') return 'M1M1';
  return counter.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** A problem found by `validate.ts`. `where` is a JSON-ish path. */
export interface Problem {
  where: string;
  message: string;
}
