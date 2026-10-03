/*
 * mtg-table — arena/scene/CardPlane.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE card renderer of the arena.** Every card in every zone — battlefield,
 * hand, graveyard, exile, the stack column, an attachment on its host — is this
 * component, and nothing else in `arena/` mounts a quad that carries a card.
 *
 * That is the 3D half of CLAUDE.md's M4 convention 2 (`CardTile` is THE card
 * renderer, imported by exactly ten files) and it is the reason PLAN's *"What M6
 * hands to M7"* singles this file out: a Three.js scene draws no markup, so
 * `render.test.tsx`'s per-frame `data-card-name` check cannot see in here, and
 * the only defence left is that there is **one** branch to read. It is the first
 * one in the function:
 *
 *     if (placement.back) → the procedural card back. No name, no art lookup,
 *                           no text frame, and no way to reach one.
 *
 * `layout()` sets `back` for a redacted stub **and** for any face-down card, and
 * `renderTextFrame` re-checks `isHidden` itself, so the rule survives a careless
 * caller (report 09 §4.4).
 *
 * ---------------------------------------------------------------------------
 * The material (§4.3), and why each part of it:
 *
 *   - **`meshBasicMaterial`, not `meshStandardMaterial`.** Card art is already a
 *     lit painting; re-lighting it double-lights it and looks muddy. Unlit also
 *     means **zero lights in the scene**, which removes the commonest cost on
 *     integrated graphics.
 *   - **`toneMapped={false}`** so the art is shown exactly as Scryfall drew it —
 *     the Fan Content Policy line about not colour-shifting card images is not
 *     only a licence matter, it is also what makes a card recognisable.
 *   - **One shared rounded-corner `alphaMap`** instead of Scryfall's `png`
 *     variant: 8.2× fewer bytes and half the VRAM for the same silhouette.
 *   - **`UNIT_PLANE` scaled**, never a `PlaneGeometry` per card.
 * ---------------------------------------------------------------------------
 */

import { useThree } from '@react-three/fiber';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { artEntryFor, imageUrl, type ArtIndex } from '../../art.ts';
import { CARD_W, type Placement } from '../layout.ts';
import { useCardBackTexture } from './CardBack.tsx';
import { patchCardMaterial } from './cardMaterial.ts';
import { UNIT_PLANE, textureAspect } from './geometry.ts';
import type { RigMap } from './rigs.ts';
import { renderTextFrame } from './textFrame.ts';
import { cornerAlphaTexture, useCardTexture } from './useCardTexture.ts';

/** The board's own `--select` and `--highlight`, so the two renderers agree. */
const SELECT = '#ffcf5c';
const HIGHLIGHT = '#b98bff';
/** How far the selection rim sticks out past the card, in world units. */
const RIM = 0.055;
/** Summoning sickness: a subtle darkening, and the 0.015 y-drop layout already applied. */
const SICK_TINT = '#b6bcc6';

export interface CardPlaneProps {
  placement: Placement;
  art: ArtIndex;
  /** `input.selectable.cardIds` — drawn as a rim, and **never** used to gate a click. */
  selectable: boolean;
  /** `input.highlighted` — emphasised without being clickable. */
  highlighted: boolean;
  /**
   * **M7 E3** — the ref map the arena's one `useFrame` writes through
   * (`scene/rigs.ts`). The mesh below carries the *resting* pose as props, so a
   * board with no cue running is correct without a frame ever being rendered
   * (`frameloop='demand'`); the runner then adds `offsets[card.id]` on top.
   */
  rigs?: RigMap;
}

/**
 * Memoised on the fields that change what is drawn. Placement changes still
 * re-render (E2 snaps; E3 moves the mesh imperatively through the offset map),
 * but the texture work behind it is cached by URL and by frame key.
 */
export const CardPlane = memo(function CardPlane({
  placement,
  art,
  selectable,
  highlighted,
  rigs,
}: CardPlaneProps): JSX.Element {
  const gl = useThree((s) => s.gl);
  const back = useCardBackTexture();
  const corners = useMemo(() => cornerAlphaTexture(gl), [gl]);

  // Gate: a card drawn as a back never reaches `art.json` at all — not even to
  // miss. `artEntryFor` is itself gated on `isHidden`, so this is belt and
  // braces, and it is the kind of belt that has to be doubled here.
  const url = useMemo(() => {
    if (placement.back) return null;
    const entry = artEntryFor(art, placement.card);
    // §9.2 rule 1: `normal`, never `large` — 47 MiB of VRAM against 90 MiB.
    return entry === null ? null : imageUrl(entry, 'normal');
  }, [art, placement.back, placement.card]);

  const face = useCardTexture(url);

  // The fallback is the fourth case of §4.4: a token, an `art.json` miss, an
  // image that 404s, or a checkout with no `art.json`. It is cached by the
  // fields it draws, so this runs once per distinct card face.
  const fallback = useMemo(() => {
    if (placement.back || face !== null) return null;
    return renderTextFrame(placement.card, gl);
  }, [placement.back, placement.card, face, gl]);

  const texture = placement.back ? back : (face ?? fallback);
  const width = textureAspect(texture, CARD_W);
  const scale = placement.scale;
  const sick = !placement.back && (placement.card as { sick?: boolean }).sick === true;
  const baseColour = sick ? SICK_TINT : '#ffffff';

  // -- the rig (M7 E3) -----------------------------------------------------
  //
  // The material is patched for the dissolve shader exactly once, here, where
  // there is one of them per card and the branch that chose the texture is two
  // lines up. The entry is refreshed on every render because `placement` is a
  // new object every frame (P5: a card object never outlives its frame), and
  // removed on unmount so a card that left the table stops being written to.
  const meshRef = useRef<THREE.Mesh | null>(null);
  const registerMesh = useCallback((mesh: THREE.Mesh | null) => {
    meshRef.current = mesh;
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (rigs === undefined || mesh === null) return;
    const material = mesh.material as THREE.MeshBasicMaterial;
    const key = placement.key;
    rigs.set(key, {
      mesh,
      material,
      uniforms: patchCardMaterial(material),
      placement,
      width,
      baseColour,
    });
    return () => {
      if (rigs.get(key)?.mesh === mesh) rigs.delete(key);
    };
  }, [rigs, placement, width, baseColour]);

  return (
    <mesh
      ref={registerMesh}
      geometry={UNIT_PLANE}
      position={placement.position}
      rotation={placement.rotation}
      scale={[width * scale, scale, 1]}
      renderOrder={placement.renderOrder}
    >
      <meshBasicMaterial
        map={texture}
        alphaMap={corners}
        transparent
        toneMapped={false}
        color={baseColour}
        // A card is visible from both sides: the stack column tilts toward the
        // camera and the opponent's hand tilts away, and a one-sided card would
        // simply vanish at some angles.
        side={THREE.DoubleSide}
        // **This halves the arena's draw calls, and it is not obvious.** Since
        // three r152, `WebGLRenderer.renderObject` renders a material that is
        // BOTH `transparent` and `DoubleSide` in **two passes** — back faces,
        // then front faces — unless `forceSinglePass` is set. Every card here is
        // both (the rounded corners are an alpha map), so each card was costing
        // two draw calls: measured in the browser at frame 250 of g1.jsonl,
        // **64 draw calls for 30 cards + the table + 3 lines**, which is 2×30+4.
        // With this flag it is 34. A card is a flat quad with no interior to
        // sort, so the second pass buys nothing at all.
        forceSinglePass
      />
      {(selectable || highlighted) && (
        <SelectRim
          width={width * scale}
          height={scale}
          colour={selectable ? SELECT : HIGHLIGHT}
          renderOrder={placement.renderOrder - 1}
        />
      )}
    </mesh>
  );
});

/**
 * The selection rim — report 09 §5.5's "`Outlines` and a tint", drawn as a quad.
 *
 * **Why not drei's `Outlines`.** It builds a copy of the parent geometry with a
 * `BackSide` material (`drei/core/Outlines.js`: `new OutlinesMaterial({ side:
 * THREE.BackSide })`, not overridable by props) and expands it along the
 * projected vertex normal. That is exactly right for a closed mesh and exactly
 * wrong for a single quad: a card facing the camera has its back face culled, so
 * the outline is **invisible on every card you can read** and visible only on
 * the ones turned away; and the non-screenspace path offsets the copy along one
 * projected normal direction, which for a flat card is a drop shadow rather than
 * a rim.
 *
 * A quad 0.055 units larger, parented to the card so it inherits the pose and
 * sits a thousandth behind it along the card's own normal, is three lines and
 * draws the rim the spec asks for. It is state-derived — `input.selectable` —
 * so it survives every skip, flush and scrub by construction (§5.5).
 */
function SelectRim({
  width,
  height,
  colour,
  renderOrder,
}: {
  width: number;
  height: number;
  colour: string;
  renderOrder: number;
}): JSX.Element {
  return (
    <mesh
      geometry={UNIT_PLANE}
      // Local space of the card: +z is the card's own normal, so -0.0015 is
      // "just behind the face", whatever the card's rotation is.
      position={[0, 0, -0.0015]}
      scale={[(width + RIM) / width, (height + RIM) / height, 1]}
      renderOrder={renderOrder}
    >
      <meshBasicMaterial
        color={colour}
        transparent
        opacity={0.85}
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
        forceSinglePass
      />
    </mesh>
  );
}
