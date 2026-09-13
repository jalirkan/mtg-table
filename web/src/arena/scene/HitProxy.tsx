/*
 * mtg-table — arena/scene/HitProxy.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **An invisible, static click target parked at the resting pose** (report 09
 * §5.5), so a card that is being animated is never a moving target.
 *
 * It works because of an asymmetry in three, verified in the installed 0.186.0:
 *
 *   - the **renderer skips invisible objects** —
 *     `if ( object.visible === false ) return;` in `projectObject`
 *     (`WebGLRenderer.js:1862`) — so a proxy costs **zero draw calls**;
 *   - the **raycaster does not check `visible`** — `intersect()` tests only
 *     `object.layers` before calling `object.raycast()`
 *     (`Raycaster.js:240-252`) — so a proxy is fully clickable.
 *
 * The proxy is 10% larger than the card, which makes the fanned hand forgiving.
 *
 * ---------------------------------------------------------------------------
 * **It is `DoubleSide`, and that is load-bearing — not a copy of `CardPlane`'s
 * material settings.** `Mesh.raycast` back-face-culls exactly as the renderer
 * does — `checkIntersection` (`three/src/objects/Mesh.js:431`) hands
 * `material.side === FrontSide` to `Ray.intersectTriangle` as its
 * `backfaceCulling` argument, and a culled triangle returns `null`, so the ray
 * passes straight through. `layout()` gives the two seats opposite pitches, so the opponent's
 * plane normals point away from a camera at +Z: measured live, the opponent's
 * lands sit at `rotation.x = +1.571` and their creatures at `+1.921` while the
 * viewer's own are the other way. With the default `FrontSide` on this
 * material — invisible, so nothing about it is visible to a screenshot — **every
 * card the opponent controlled was unclickable**: raycasting all 17 proxies of a
 * live frame at their own projected centres hit 14 and missed 3, and the three
 * were exactly the opponent's battlefield. That is a dead end for every `input`
 * whose `selectable.cardIds` names an opponent's permanent — targeting a removal
 * spell or an Aura (Quantum Reduction is in this very deck), choosing a blocker,
 * attacking a planeswalker. The proxy draws nothing, so two-sided costs nothing.
 * `web/test/liveness.test.ts` asserts the flag is still here.
 *
 * **Never gated on `selectable`** (CLAUDE.md, amendment M8). Every card is
 * clickable, always; the engine decides what a click means and answers a click
 * it does not want with `notice{title:"Not selectable"}`. A renderer that
 * refuses the click renders the engine's answer unreachable — and there is no
 * `selectable` prop here at all, so it cannot start.
 * ---------------------------------------------------------------------------
 */

import type { ThreeEvent } from '@react-three/fiber';
import { useCallback } from 'react';
import * as THREE from 'three';

import type { Placement } from '../layout.ts';
import { UNIT_PLANE } from './geometry.ts';

/** How much bigger than the card the click target is. */
const PROXY_SCALE = 1.1;

export interface HitProxyProps {
  placement: Placement;
  /** The card's drawn width in world units, so the proxy matches its silhouette. */
  width: number;
  /** `null` in a replay — there is no server to send an act to. */
  onClickCard: ((cardId: number) => void) | null;
  onHover?: ((cardId: number | null) => void) | null;
}

export function HitProxy({ placement, width, onClickCard, onHover }: HitProxyProps): JSX.Element {
  const cardId = placement.cardId;

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // Without this the click also reaches whatever is behind the card — the
      // table quad, and the card under it in a pile.
      event.stopPropagation();
      onClickCard?.(cardId);
    },
    [cardId, onClickCard],
  );

  const handleOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover?.(cardId);
    },
    [cardId, onHover],
  );

  const handleOut = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <mesh
      geometry={UNIT_PLANE}
      position={placement.position}
      rotation={placement.rotation}
      scale={[width * placement.scale * PROXY_SCALE, placement.scale * PROXY_SCALE, 1]}
      visible={false}
      userData={{ cardId }}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {/* `side` is the whole reason this material is spelled out rather than
          left to its defaults — see the header. Never narrow it. */}
      <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
