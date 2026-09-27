/*
 * mtg-table — arena/figures/types.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The vocabulary of the manifestation stage** (report 13 §3.2, §3.6, §3.8).
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, and no clock — exactly as `cues/` is,
 * and for exactly the same payoff: `web/test/figures.test.ts` and
 * `web/test/figure-pose.test.ts` run the real ladder and the real pose function
 * over all eighteen committed recordings under `node --test`, with no browser
 * and no GPU. `web/test/liveness.test.ts` is the source scan that keeps it true.
 *
 * ---------------------------------------------------------------------------
 * The one rule this file exists to encode (report 13 §1.3):
 *
 *   **If the snapshot says it, it is a POSE; if only the event says it, it is a
 *   CUE.**
 *
 * A creature having a figure at all, its stance, its tint, its height, the
 * blocker standing in front of the attacker it blocks — every one of those is in
 * `state`, so every one of them is a pose and survives `skip all`, a scrub and a
 * `resync` with no history. The lunge, the hit and the death are transitions and
 * stay where Tier 1 put them: in `cues/`.
 * ---------------------------------------------------------------------------
 */

/**
 * §3.6's clip vocabulary — ten, chosen so an archetype with only four of them
 * still reads. The lane that plays them is T3; this is the closed set they will
 * be drawn from, and `models.json`'s `clips` maps are checked against it.
 */
export const CLIP_NAMES = [
  'idle',
  'summon',
  'attack',
  'block',
  'hit',
  'die',
  'grow',
  'shrink',
  'channel',
  'crouch',
] as const;
export type ClipName = (typeof CLIP_NAMES)[number];

const CLIP_NAME_SET: ReadonlySet<string> = new Set<string>(CLIP_NAMES);

export function isClipName(value: string): value is ClipName {
  return CLIP_NAME_SET.has(value);
}

/**
 * §3.9 — the resting shape a figure holds, derived from the snapshot and from
 * nothing else.
 *
 * **`crouch` is not a rotation.** `layout.ts` turns a tapped *card* by
 * `TAP_ANGLE` in the table plane and keeps its slot; a figure that inherited
 * that rotation would lie down sideways. The card keeps turning; the figure
 * changes stance. Same fact, two vocabularies.
 */
export const STANCES = ['ready', 'crouch', 'attacking', 'blocking', 'sick'] as const;
export type Stance = (typeof STANCES)[number];

/**
 * What the figure file says about one card or one archetype.
 *
 * `model: null` is **not a hole — it is the declared fallback** (§9.4): the
 * Tier-1 glow disc at the figure's stand-point, in the card's colour identity,
 * sized by power/toughness. Every rung of the ladder may say it, and the last
 * rung always does, which is what lets a fresh checkout with no binaries at all
 * still play the whole film.
 */
export interface FigureSpec {
  /** A model id in `models.json`, or `null` ⇒ the glow disc and nothing else. */
  model: string | null;
  /** Overrides the card's colour identity. `null` ⇒ use `colourHex(colourIdOf(manaCost))`. */
  tint: string | null;
  /** Multiplies `FIGURE_HEIGHT`. 1 is the ordinary human. */
  scale: number;
  /** §3.6 rung 1: `ClipName` → this model's own alias for it. */
  clips: Readonly<Record<string, string>>;
  /** A token reads plainer than a printed card; the layer dims its rim. */
  token: boolean;
}

export const DEFAULT_FIGURE_SPEC: FigureSpec = Object.freeze({
  model: null,
  tint: null,
  scale: 1,
  clips: Object.freeze({}),
  token: false,
});

// ---------------------------------------------------------------------------
// T4 — the terrain (report 13 §5)
// ---------------------------------------------------------------------------

/**
 * §5.2's tile families — **three, and `figures/tiles.ts` says why it is not
 * five**: a kind is a geometry-and-material family, and the difference between a
 * crag and a grove is a tint, which is per-instance and free.
 *
 * `water` is the one new shader Tier 2 writes, and the budget is one — Tier 1
 * wrote exactly one too (`scene/cardMaterial.ts`'s dissolve).
 */
export const TILE_KINDS = ['plateau', 'water', 'slab'] as const;
export type TileKind = (typeof TILE_KINDS)[number];

const TILE_KIND_SET: ReadonlySet<string> = new Set<string>(TILE_KINDS);

export function isTileKind(value: string): value is TileKind {
  return TILE_KIND_SET.has(value);
}

/** What the data file says about one land name or one land subtype. */
export interface TileSpec {
  tile: TileKind;
  /** `null` ⇒ the card's colour identity, exactly as {@link FigureSpec.tint}. */
  tint: string | null;
  /** A second colour band at the rim — the *Thriving* lands. `null` for one tone. */
  rim: string | null;
}

export const DEFAULT_TILE_SPEC: TileSpec = Object.freeze({
  tile: 'slab' as TileKind,
  tint: null,
  rim: null,
});

// ---------------------------------------------------------------------------
// T5 — the attachment manifestation (report 13 §4)
// ---------------------------------------------------------------------------

/**
 * §4.2's manifestation kinds.
 *
 * **The measurement that put this on the pose side of §1.3's line:** the corpus
 * has **28 `attach` events** and **985 frames showing an attachment**, so an aura
 * built as a cue is on screen for 500 ms out of a game and absent for the 97% of
 * the time it should be visible. The snap is the cue; the manifestation is the
 * pose.
 *
 * `halo` is the **default**, and it is what makes the feature finished rather
 * than seeded (§4.4): an aura nobody wrote an entry for still visibly does
 * something to the creature it is on, in its own colour, and an Equipment gets a
 * metallic variant of the same. `shrink` is Quantum Reduction's, and it is the
 * only kind whose {@link AttachSpec.hostScale} is not 1.
 *
 * The other four — `shell`, `circuit`, `glints`, `cocoon` — are §4.3's per-card
 * table and are **T12's**: they are in the vocabulary so that adding them is a
 * data edit rather than a type change, and until then `scene/overlays.ts` draws
 * them as the halo and says so.
 */
export const ATTACH_KINDS = ['halo', 'shrink', 'shell', 'circuit', 'glints', 'cocoon'] as const;
export type AttachKind = (typeof ATTACH_KINDS)[number];

const ATTACH_KIND_SET: ReadonlySet<string> = new Set<string>(ATTACH_KINDS);

export function isAttachKind(value: string): value is AttachKind {
  return ATTACH_KIND_SET.has(value);
}

/** What the data file says about one attaching card, or one attachment subtype. */
export interface AttachSpec {
  kind: AttachKind;
  /** `null` ⇒ the ATTACHING card's colour identity, never the host's (§4.4). */
  tint: string | null;
  /**
   * Multiplies the host figure's height. **1 for everything but `shrink`.**
   *
   * The host's final height is the product over its manifestations, which is how
   * Quantum Reduction shrinks a creature **and stays shrunk** through a skip, a
   * backwards scrub and a `resync` — the scale is derived from the snapshot that
   * still says the Aura is attached (§4.2).
   */
  hostScale: number;
  /** 0…1, the overlay's intensity. */
  strength: number;
  /** A harder, colder rim — an Equipment rather than an Aura (§4.4). */
  metal: boolean;
}

export const DEFAULT_ATTACH_SPEC: AttachSpec = Object.freeze({
  kind: 'halo' as AttachKind,
  tint: null,
  hostScale: 1,
  strength: 0.8,
  metal: false,
});

/** The `attachments` half of `figures.json`, after validation. */
export interface AttachData {
  /** `"Quantum Reduction"`, `"subtype:aura"`, `"*"` — the ladder's three rungs. */
  attachments: Readonly<Record<string, AttachSpec>>;
  default: AttachSpec;
}

/** The `lands` half of `figures.json`, after validation. */
export interface TileData {
  /** `"Thriving Isle"`, `"subtype:island"`, `"*"` — the ladder's three rungs. */
  lands: Readonly<Record<string, TileSpec>>;
  default: TileSpec;
}

export const EMPTY_TILE_DATA: TileData = Object.freeze({
  lands: Object.freeze({}),
  default: DEFAULT_TILE_SPEC,
});

/** `figures/figures.json`, after validation. */
export interface FigureData {
  version: number;
  /** Keyed on the wire's **exact** `card.name` — `"Soldier Token"`, not `"Soldier"`. */
  cards: Readonly<Record<string, FigureSpec>>;
  /** `creature/subtype:spy`, `creature/W`, `creature/*` — §3.7's ladder rungs 2–4. */
  archetypes: Readonly<Record<string, FigureSpec>>;
  default: FigureSpec;
  /** T4's terrain table. Absent in a file written before it, hence a default. */
  lands: Readonly<Record<string, TileSpec>>;
  landDefault: TileSpec;
  /** T5's attachment table (§4.3). Absent in a file written before it. */
  attachments: Readonly<Record<string, AttachSpec>>;
  attachDefault: AttachSpec;
}

export const EMPTY_FIGURE_DATA: FigureData = Object.freeze({
  version: 1,
  cards: Object.freeze({}),
  archetypes: Object.freeze({}),
  default: DEFAULT_FIGURE_SPEC,
  lands: Object.freeze({}),
  landDefault: DEFAULT_TILE_SPEC,
  attachments: Object.freeze({}),
  attachDefault: DEFAULT_ATTACH_SPEC,
});

/** The terrain view of a {@link FigureData} — what `tilePose` takes. */
export function tileDataOf(data: FigureData): TileData {
  return { lands: data.lands, default: data.landDefault };
}

/** The attachment view of a {@link FigureData} — what `attachFor` takes. */
export function attachDataOf(data: FigureData): AttachData {
  return { attachments: data.attachments, default: data.attachDefault };
}

/**
 * One row of `figures/models.json` (§9.2) — the manifest the loader reads and
 * the licence record `tools/assets-manifest.json` is the long form of.
 *
 * Every licence field is **required**, and `web/test/models-data.test.ts`
 * asserts it: a model whose provenance is not written down is a model nobody can
 * decide whether to ship.
 */
export interface ModelEntry {
  /** Relative to `web/public/`. Every model in this slice lives in one file. */
  path: string;
  /** The node inside that file this archetype clones (`SkeletonUtils.clone`). */
  node: string;
  /** The model's own measured height, in its own units — normalised at load. */
  height: number;
  /**
   * The model's own measured **width** (the wider of x and z), in the same units.
   *
   * T7's tuning pass added it, and the reason is a measurement: the Kenney chibi is
   * 1.14× wider than tall and the Quaternius drone **2.97×**, so a figure
   * normalised by height alone is up to 2.53 world units wide against a rank pitch
   * of 0.796. `figures/pose.ts` clamps the drawn height against
   * `FIGURE_MAX_WIDTH` using this ratio.
   */
  width: number;
  /** Which way it faces before normalisation. Never assumed; measured. */
  facing: '+z' | '-z' | '+x' | '-x';
  /** §3.4 — a clip that translates the root fights `figurePose ⊕ offset`. */
  rootMotion: boolean;
  bones: number;
  triangles: number;
  /** `ClipName` → the clip's name in the file, already normalised of any `Armature|` prefix. */
  clips: Readonly<Record<string, string>>;
  /**
   * **T8 — the rig this model shares with others**, or `null` for a model with a
   * skeleton of its own. Every humanoid (agent, hero, scientist) is on
   * `kenney-mini`: one rig, one clip set, asserted by the build.
   */
  rig: string | null;
  /**
   * **T8 — which of `clips` were retargeted** from a clip library rather than
   * shipped by the model's own pack: clip key → `"<library>:<clip>"` (e.g.
   * `"hit": "ual:Hit_Chest"`). The library's provenance is
   * {@link ModelData.clipLibraries}. Empty for a model whose every clip is its own.
   */
  retargeted: Readonly<Record<string, string>>;
  source: string;
  licence: string;
  licenceUrl: string;
  /** The licence badge text, verbatim, on the day it was downloaded (§9.1). */
  licenceBadge: string;
  retrieved: string;
  /** Whether this file may be committed to a public repository (§9.1). */
  committable: boolean;
}

/**
 * **T8 — the built file, identified** (Tier 2 follow-up 9): its path, byte count
 * and sha256 as `tools/build-figures.mjs` wrote them, so a rebuild — or a
 * checkout's `web/public/models/figures.glb` — can be compared with `sha256sum`.
 */
export interface ModelLibraryRecord {
  path: string;
  bytes: number;
  sha256: string;
}

/**
 * **T8 — a clip library's provenance** — the same licence fields a model row
 * carries, for a source that contributed animation and no mesh (Quaternius's
 * Universal Animation Library, retargeted offline by the build).
 */
export interface ClipLibraryRecord {
  title: string;
  source: string;
  licence: string;
  licenceUrl: string;
  licenceBadge: string;
  retrieved: string;
  committable: boolean;
}

/** `figures/models.json`, after validation. */
export interface ModelData {
  version: number;
  models: Readonly<Record<string, ModelEntry>>;
  /** `null` for a manifest written before T8. */
  library: ModelLibraryRecord | null;
  /** Keyed by the prefix a `retargeted` entry names (`ual`). */
  clipLibraries: Readonly<Record<string, ClipLibraryRecord>>;
}

export const EMPTY_MODEL_DATA: ModelData = Object.freeze({
  version: 1,
  models: Object.freeze({}),
  library: null,
  clipLibraries: Object.freeze({}),
});

/** A validator complaint, in `cues/validate.ts`'s shape. */
export interface FigureProblem {
  where: string;
  message: string;
}
