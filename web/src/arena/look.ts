/*
 * mtg-table — arena/look.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's LOOK** (Lane LOOK, `docs/research/15-art-direction.md`, **D120**):
 * which of two treatments every figure is drawn in, and the numbers each one is
 * drawn with.
 *
 *  - **`comic`, the default** (`perf.ts`'s {@link LOOK_DEFAULT}): the card art's
 *    STYLE, not its content — the costume palette painted in three flat bands
 *    from one key light fixed to the lens (**D121**), a rim in the card's own
 *    colour on the silhouette's shadow side, a specular dot, a halftone screen in
 *    the core shadow, an ink line drawn by a depth-edge pass that rides bloom's
 *    composer (**D122**), a contact shadow under every figure (**D123**), and a
 *    mid-value stage with a backdrop (**D124**).
 *  - **`holo`** (`?look=holo`): **D53** and **D97**'s hologram, unchanged — and,
 *    under the comic look, still the treatment of what is NOT YET REAL
 *    (**D125**): the anonymous face-down figure (hard rule 8: it is a disc and
 *    gets no traits, no costume and no paint) and the ghosted creature spell on
 *    the stack. The summon's hologram-to-ink is Lane MOTION's, through the figure
 *    material's `uMaterialize` (a number the frame loop may write; `uLook` it may
 *    not — `liveness.test.ts`).
 *
 * **Pure**: no three, no React, no DOM beyond the query string it is handed, no
 * clock — `[NO three]`, so `node --test` holds all of it. The look reaches the
 * scene as NUMBERS written at COMMIT — `uLook` per material, a few shared uniforms
 * for the comic block — never from the frame loop, so every figure is still one
 * program and an idle table still renders nothing (**D58**, **D72**).
 *
 * URL (read once, by `main.tsx`'s `arenaFlagsFromQuery`, and by the workshop):
 * `?look=holo|comic` · `?ink=none|always` · `?halftone=0` · `?key=world` ·
 * `?stage=felt` · `?shadow=0`. The workshop's toolbar switches every one.
 */

import { colourIdOf, type ColourId } from './colour.ts';
import { INK_DEFAULT, LOOK_DEFAULT } from './perf.ts';

export type Look = 'holo' | 'comic';
/**
 * The ink line (D122, D129): `post` draws it on BLOOM's composer and only there —
 * with bloom off there is no composer and no line; `always` draws it with a
 * composer of its own when bloom is off (measurement only: that composer costs
 * the GTX 1080 +2.4 ms p95, D129); `none` never.
 */
export type InkMode = 'post' | 'always' | 'none';
/** Where the key light belongs: to the lens (the panel's convention, D121) or to the world. */
export type KeyFrame = 'lens' | 'world';
/** The ground: the comic stage (D124) or the Tier-1 felt. */
export type StageMode = 'comic' | 'felt';

/**
 * **One look, whole.** The arena runs the defaults; the workshop's toolbar is an
 * A/B over every field (report 15 §9.1's toggles).
 */
export interface LookSpec {
  readonly look: Look;
  /** The depth-edge ink pass (D122). Only drawn under the comic look, and by default only with bloom (D129). */
  readonly ink: InkMode;
  /** The halftone screen in the core-shadow band. */
  readonly halftone: boolean;
  readonly key: KeyFrame;
  readonly stage: StageMode;
  /** The contact shadows (D123). Only drawn under the comic look. */
  readonly shadow: boolean;
}

export const COMIC_LOOK: LookSpec = Object.freeze({
  look: 'comic',
  ink: INK_DEFAULT,
  halftone: true,
  key: 'lens',
  stage: 'comic',
  shadow: true,
});

/** The hologram: no ink, no halftone, no shadow, the felt — D53's table exactly. */
export const HOLO_LOOK: LookSpec = Object.freeze({
  look: 'holo',
  ink: 'none',
  halftone: false,
  key: 'lens',
  stage: 'felt',
  shadow: false,
});

/** The default spec for a look: every comic option on, or the hologram's table. */
export function lookSpecOf(look: Look): LookSpec {
  return look === 'comic' ? COMIC_LOOK : HOLO_LOOK;
}

/** The arena's own default — `perf.ts`'s {@link LOOK_DEFAULT}. */
export const DEFAULT_LOOK: LookSpec = lookSpecOf(LOOK_DEFAULT);

/**
 * `?look=…&ink=…&halftone=…&key=…&stage=…&shadow=…` → a spec. `look` picks the
 * base (anything unrecognised is {@link LOOK_DEFAULT}); the rest override it one
 * field at a time. Total: a malformed query is the default, never a throw.
 */
export function lookFromSearch(search: string, fallback: Look = LOOK_DEFAULT): LookSpec {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return lookSpecOf(fallback);
  }
  const named = params.get('look');
  const base = lookSpecOf(named === 'holo' || named === 'comic' ? named : fallback);
  const ink = params.get('ink');
  const key = params.get('key');
  const stage = params.get('stage');
  const flag = (name: string, current: boolean): boolean => {
    const value = params.get(name);
    if (value === null) return current;
    return value !== '0' && value !== 'false' && value !== 'off';
  };
  return Object.freeze({
    look: base.look,
    ink: ink === 'none' || ink === 'post' || ink === 'always' ? ink : base.ink,
    halftone: flag('halftone', base.halftone),
    key: key === 'world' || key === 'lens' ? key : base.key,
    stage: stage === 'felt' || stage === 'comic' ? stage : base.stage,
    shadow: flag('shadow', base.shadow),
  });
}

/** Two specs are the same look — for a memo key. */
export function sameLook(a: LookSpec, b: LookSpec): boolean {
  return (
    a.look === b.look &&
    a.ink === b.ink &&
    a.halftone === b.halftone &&
    a.key === b.key &&
    a.stage === b.stage &&
    a.shadow === b.shadow
  );
}

/**
 * **The numbers a material takes at commit** — every figure, prop and duelist
 * material reads these three and nothing else of a {@link LookSpec}.
 */
export interface MaterialLook {
  /** 0 the hologram … 1 the comic look (`uLook`). */
  readonly look: number;
  /** 0 or 1: the halftone screen (`uDotDepth` is scaled by it). */
  readonly halftone: number;
  /** 0 the lens-fixed key, 1 the world-fixed one (`uKeyFrame`). */
  readonly keyWorld: number;
}

export function materialLookOf(spec: LookSpec): MaterialLook {
  const comic = spec.look === 'comic';
  return { look: comic ? 1 : 0, halftone: comic && spec.halftone ? 1 : 0, keyWorld: spec.key === 'world' ? 1 : 0 };
}

/** The hologram, as material numbers — the anonymous figure's, whatever the table's look. */
export const HOLO_MATERIAL: MaterialLook = Object.freeze({ look: 0, halftone: 0, keyWorld: 0 });

/**
 * **What a figure is drawn in** (D125), from its pose alone — so it is a POSE
 * (D56) and survives skip, scrub, `resync` and a new `gameId`:
 *
 *  - an **anonymous** figure (a face-down creature; `figurePose` gives it no
 *    model, no traits and no costume) is the hologram — "a thing whose identity is
 *    withheld" is exactly what a hologram says, and it is hard rule 8's renderer
 *    half: it gets nothing that would paint it as a particular card;
 *  - a **ghost** (T6's creature spell on the stack, report 13 §6.2) is the
 *    hologram — the spell is not a creature until it resolves;
 *  - a **summoning-sick** figure (`stance` `sick`: sick and not in combat —
 *    `figurePose`'s precedence) is HALF hologram, `uLook` × {@link COMIC.sickLook}:
 *    "not yet able to act" as "not yet fully real" (report 15 §2.3, §9.1 item 8);
 *    it is still a painted body — shadowed and inked — and it is a pose, so the
 *    next snapshot that says it is not sick paints it whole;
 *  - everything else takes the table's look.
 *
 * Commit time only (it builds a number object for a sick figure); the frame loop
 * asks {@link paintsFigure}, which allocates nothing. `web/test/look.test.ts`
 * sweeps every pose of the committed corpus with it.
 */
export function figureLookOf(pose: PaintedPose, table: MaterialLook): MaterialLook {
  if (!paintsFigure(pose)) return HOLO_MATERIAL;
  if (pose.stance === 'sick' && table.look > 0) return { ...table, look: table.look * COMIC.sickLook };
  return table;
}

/** The slice of a `FigurePose` the look reads — public, and never a name. */
export interface PaintedPose {
  readonly anonymous: boolean;
  readonly ghost: boolean;
  readonly modelId: string | null;
  /** `sick` draws half hologram (D125); every other stance the table's look. */
  readonly stance: string;
}

/**
 * **Is this figure painted** when the table is comic — the one predicate behind
 * {@link figureLookOf}, the disc field's shadow and its faint disc. It allocates
 * nothing, so the frame loop may call it (`DiscField.bind`).
 */
export function paintsFigure(pose: PaintedPose): boolean {
  return !pose.anonymous && !pose.ghost && pose.modelId !== null;
}

/**
 * **Does this spec draw the ink pass**, with bloom on or off (D129)? The line
 * rides bloom's composer: with bloom on it is +0 draw calls inside the pass bloom
 * already pays for, and with bloom off it is drawn only under `?ink=always` —
 * a composer of its own for one effect measured +2.4 ms p95 on the GTX 1080
 * over the hologram's (report 15 §9.1's line is +1.5), so bloom off means no
 * composer and no line, and the bands, the rim and the shadow read without it.
 */
export function wantsInkPass(spec: LookSpec, bloom: boolean): boolean {
  if (spec.look !== 'comic') return false;
  return spec.ink === 'always' || (spec.ink === 'post' && bloom);
}

/** Does this spec draw contact shadows? */
export function wantsShadows(spec: LookSpec): boolean {
  return spec.look === 'comic' && spec.shadow;
}

/** Does this spec draw the comic stage (and its backdrop)? */
export function wantsStage(spec: LookSpec): boolean {
  return spec.look === 'comic' && spec.stage === 'comic';
}

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

/**
 * **The comic look's numbers, in one place** (report 15 §3), so the shaders, the
 * workshop and the evidence quote the same ones. Every one of them reaches the GPU
 * as a uniform (`scene/figureMaterial.ts`'s `COMIC_UNIFORMS`, `scene/Post.tsx`'s
 * `InkEffect`, `scene/discs.ts`'s shadow), none of them as a literal in GLSL.
 *
 * Colours are sRGB hex (three converts them into the working space on the way in)
 * or, where marked, LINEAR triples multiplied into a linear colour.
 */
export const COMIC = Object.freeze({
  // -- the key light (D121) -------------------------------------------------
  /**
   * The key light in VIEW space (x right, y up, z toward the lens): upper left and
   * a little in front — the comic-panel convention. It belongs to the PANEL, not
   * the world, so both seats' figures read the same (your figures' backs and the
   * opponent's fronts alike, D126) and no scene light exists to keep in sync.
   */
  key: [-0.45, 0.72, 0.52] as const,
  /**
   * The world-fixed alternative (the workshop's `key: world`): from the table's
   * upper left as your seat sees it, a little toward you. Physically consistent
   * as the camera orbits — and it shadows whichever seat's visible side faces
   * away from it, which is why it is a toggle and not the default.
   */
  keyWorld: [-0.45, 0.8, 0.4] as const,

  // -- the three bands --------------------------------------------------------
  /**
   * The terminators, as `N·L` edges: lit ↔ mid at 0.28…0.34, mid ↔ core shadow
   * at −0.20…−0.14. 0.06 of `N·L` is enough anti-aliasing at 1× and still reads
   * as a hard band.
   */
  bands: [0.28, 0.34, -0.2, -0.14] as const,
  /** The core shadow's multiplier (LINEAR): darker AND cooler, never grey. */
  shadowTone: [0.46, 0.44, 0.66] as const,
  /** The mid band: this far from the shadow tone back toward the paint. */
  midMix: 0.55,
  /** Saturation push on the palette before shading (1 = as painted). */
  saturation: 1.25,
  /**
   * "Black is blue" (LINEAR): below {@link COMIC.blackAt} luminance the paint is
   * lifted toward this deep blue, because on black the bands, dots and ink all
   * vanish — Fury's suit is L* 8.
   */
  black: [0.022, 0.03, 0.075] as const,
  blackAt: 0.045,
  /**
   * **…with blue highlights** (the verification pass: Quake, Fury and the dark
   * soldiers read as near-black silhouettes on the mid stage, only the ink
   * separating them). A paint whose LINEAR luminance is under `[0]` has its LIT
   * band lifted to luminance `[2]`, hue kept, easing out by `[1]` — so a dark
   * costume keeps three bands (a highlight, itself, a near-black core). The
   * black-is-blue paint (luminance ≈ 0.029) gets a lit band of sRGB #46527d, a
   * mid band of #212844 and a core of #181d3c (`look.test.ts` holds the lift).
   */
  darkLift: [0.02, 0.1, 0.09] as const,
  /**
   * The brightest a painted surface may be (LINEAR, per channel): paper, not a
   * lamp. 1 is no cap — what the user judged in report 15's spike.
   */
  paperWhite: 1,

  // -- halftone, rim, specular ------------------------------------------------
  /** The halftone cell, in CSS pixels (× the render dpr at commit, so a dot is a dot at every rung). */
  dotCssPx: 5,
  /** How much the dots darken the core shadow at full strength (0 = no screen). */
  dotDepth: 0.34,
  /** The rim in the card's colour: the `1 − N·V` band it sits on, and how strongly. */
  rimBand: [0.55, 0.68] as const,
  rimMix: 0.6,
  /** How far the rim's tint is lifted toward white. */
  rimLift: 0.35,
  /** The specular dot: its `N·H` band and strength. 0.955 painted Fury's whole crown white. */
  specBand: [0.986, 0.993] as const,
  specStrength: 0.65,
  /** The dot's colour (LINEAR): cool white. */
  specColour: [0.92, 0.96, 1] as const,

  // -- ink (D122) --------------------------------------------------------------
  /** Near-black with a little blue, like a printed K plate. */
  ink: '#0e1016',
  /**
   * How far apart the ink pass samples depth, in CSS pixels (× the render dpr at
   * commit), OUTSIDE a painted surface — the half of the line that lies on the
   * table or the card behind a figure: the bold silhouette.
   */
  inkCssPx: 1.6,
  /**
   * …and ON a painted surface — the half of the line that lies on the figure's
   * own paint, its creases included (D129, the verification pass): one CSS pixel,
   * so the line keeps its weight at the silhouette while a small prop — a badge,
   * a visor, an eyepatch — loses one pixel of paint at its edge, not two
   * (`traits.test.ts` measures what the ink leaves of every identity prop).
   */
  inkInnerCssPx: 1.0,
  /**
   * Ink where the Laplacian of 1/z, relative to 1/z, exceeds this (and full ink
   * at 2.5×). Relative, so a line weighs the same near the lens and across the
   * table; zero on any plane, so the table, the cards and the slabs get none.
   */
  inkThreshold: 0.012,

  // -- the contact shadow (D123) -------------------------------------------------
  shadow: '#05060a',
  /** Its darkness at the feet of a standing figure. */
  shadowAlpha: 0.72,
  /** Its radius, as a fraction of the figure's height. */
  shadowRadius: 0.34,
  /** How much wider than deep it is (an ellipse on the ground). */
  shadowSquash: 1.15,
  /**
   * How far the shadow falls AWAY from the key light, as a fraction of its own
   * radius — the key's direction, put on the table through the camera, so the
   * shadow and the bands agree about where the light is. Grounding, not realism.
   */
  shadowLean: 0.22,
  /** A flier's shadow fades and shrinks with its height: `1 / (1 + k · height)`. */
  shadowFalloff: 2.5,
  /** Under the comic look a modelled figure's glowing stand disc steps back to this. */
  discUnderComic: 0.3,
  /**
   * **A summoning-sick figure's look** (D125): half hologram, half paint —
   * "not yet able to act" as "not yet fully real" (report 15 §2.3). A multiplier
   * of the table's look, so the hologram table stays all hologram.
   */
  sickLook: 0.5,

  // -- the stage (D124) ------------------------------------------------------------
  /** The clear colour behind everything. */
  background: '#141427',
  /** Your half's default hue, when your public cards say nothing yet. */
  seatYou: '#21566a',
  /** The opponent's half's default hue. */
  seatOpp: '#5a3550',
  /** The centre band. */
  centre: '#3d3f63',
  /** The seat lines, drawn as a heavy K-plate stroke. */
  line: '#0e1016',
  /**
   * **Each colour's stage tone** — a mid value (L* 28–38, `look.test.ts` holds
   * it), so the ink and the bands read on it: white a warm sepia stone, blue a
   * deep sky, black a violet slate, red a brick, green a forest. A seat's half is
   * the mean of its letters' tones ({@link stageToneOf}).
   */
  stageTones: { W: '#5e5440', U: '#27527a', B: '#4a3d62', R: '#6e3434', G: '#2f5e40' },
  /** How far a seat's tone leans toward its default ({@link COMIC.seatYou} / {@link COMIC.seatOpp}). */
  seatBias: 0.25,
});

/** The hologram's clear colour and felt — D53's table. */
export const HOLO_BACKGROUND = '#0a0d12';

// ---------------------------------------------------------------------------
// The stage's seat colours (D124) — from what each player has shown
// ---------------------------------------------------------------------------

/** The slice of a card the stage reads: public fields only. */
interface StageCard {
  readonly hidden?: boolean;
  readonly faceDown?: boolean;
  readonly manaCost?: string | null;
}

/**
 * **A seat's colour identity, from what it has SHOWN**: the WUBRG letters of every
 * face-up card it has on the battlefield, in the graveyard and in exile — public
 * zones only, and never a redacted stub or a face-down card (hard rule 8: a
 * concealed card contributes nothing, not even a colour). `C` until something
 * coloured has been seen.
 */
export function shownIdentityOf(cards: Iterable<StageCard>): ColourId {
  const letters = new Set<string>();
  for (const card of cards) {
    if (card.hidden === true || card.faceDown === true) continue;
    const id = colourIdOf(card.manaCost ?? null);
    if (id === 'C') continue;
    for (const ch of id) letters.add(ch);
  }
  const order = 'WUBRG';
  let out = '';
  for (const ch of order) if (letters.has(ch)) out += ch;
  return out === '' ? 'C' : out;
}

/** `#rrggbb` → [r, g, b] in 0…255 (anything unparseable is black). */
function rgbOf(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m === null ? 0 : Number.parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexOf(r: number, g: number, b: number): string {
  const h = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** `a` → `b` by `t`, per sRGB channel. */
export function mixHex(a: string, b: string, t: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

/** CIE L* of an sRGB hex (D65), 0…100 — how the report measures a ground's value. */
export function lightnessOf(hex: string): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgbOf(hex);
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

/**
 * **A seat's stage tone**: the mean of its identity's letters' `COMIC.stageTones`
 * (so a W/U deck stands on a slate blue, not on the gold every multicolour glow
 * uses), leaned `COMIC.seatBias` toward the seat's own default so that two decks
 * of one colour still split the table into two halves. Colourless — nothing
 * shown yet — is the seat's default.
 */
export function stageToneOf(identity: ColourId, seatDefault: string): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const letter of identity) {
    const tone = (COMIC.stageTones as Readonly<Record<string, string>>)[letter];
    if (tone === undefined) continue;
    const [x, y, z] = rgbOf(tone);
    r += x;
    g += y;
    b += z;
    n += 1;
  }
  if (n === 0) return seatDefault;
  return mixHex(hexOf(r / n, g / n, b / n), seatDefault, COMIC.seatBias);
}

/** Both seats' stage hues. A pure function of two identities — the Table's memo key. */
export interface StageColours {
  readonly you: string;
  readonly opp: string;
}

export function stageColoursOf(you: ColourId, opp: ColourId): StageColours {
  return { you: stageToneOf(you, COMIC.seatYou), opp: stageToneOf(opp, COMIC.seatOpp) };
}

/** The slice of a player the stage reads: its id and its PUBLIC zones. */
interface StagePlayer {
  readonly id: number;
  readonly zones: {
    readonly battlefield: { readonly cards: readonly StageCard[] };
    readonly graveyard: { readonly cards: readonly StageCard[] };
    readonly exile: { readonly cards: readonly StageCard[] };
  };
}

/** Both seats' shown identities — `you` is the viewer's seat, `opp` every other player's. */
export function stageIdentitiesOf(
  players: readonly StagePlayer[] | undefined,
  viewerId: number | null,
): { you: ColourId; opp: ColourId } {
  const mine: StageCard[] = [];
  const theirs: StageCard[] = [];
  for (const player of players ?? []) {
    const into = viewerId === null || player.id === viewerId ? mine : theirs;
    for (const zone of [player.zones.battlefield, player.zones.graveyard, player.zones.exile]) {
      for (const card of zone.cards) into.push(card);
    }
  }
  return { you: shownIdentityOf(mine), opp: shownIdentityOf(theirs) };
}

/** **The combat stage** (D124) is a pose: on while `state.combat` has a band. */
export function combatStageOf(combat: { readonly bands: readonly unknown[] } | null | undefined): boolean {
  return (combat?.bands.length ?? 0) > 0;
}
