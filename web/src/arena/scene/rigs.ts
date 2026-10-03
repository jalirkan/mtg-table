/*
 * mtg-table — arena/scene/rigs.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The ref map** report 09 §11's E3 asks for: placement key → the objects one
 * card owns, so that the arena's single `useFrame` can write
 * `layout(state) ⊕ offsets[card.id]` onto a mesh without React being involved
 * (§9.2 rules 7 and 8).
 *
 * A rig is registered by `CardPlane` in a layout effect and dropped on unmount.
 * It is keyed by **placement key** (`c:<cardId>` / `s:<stackItemId>`), not by
 * card id, because one card can be mounted twice — an activated ability's
 * source is on the battlefield *and* on the stack — while an **offset** is
 * keyed by card id, so both copies of that card animate together. That is
 * deliberate: they are the same card.
 */

import type * as THREE from 'three';

import type { Placement } from '../layout.ts';
import type { CardUniforms } from './cardMaterial.ts';

export interface CardRig {
  mesh: THREE.Object3D;
  material: THREE.MeshBasicMaterial;
  uniforms: CardUniforms;
  /** The placement of the frame currently on screen. Replaced, never merged (P5). */
  placement: Placement;
  /** The drawn width in world units — the texture's aspect, or the card ratio. */
  width: number;
  /** The colour the card rests at: white, or the summoning-sickness grey. */
  baseColour: string;
}

export type RigMap = Map<string, CardRig>;
