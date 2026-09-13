/*
 * mtg-table — arena/scene/Table.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The table itself: one quad at `y = 0` on the XZ plane, plus the two thin
 * lines that tell you where the seats are (report 09 §3.1).
 *
 * It is unlit like everything else in Tier 1 — the scene has **no lights at
 * all** (§4.3) — so the felt is a flat colour with a painted radial falloff
 * rather than a material that reacts to one. The colours are `styles.css`'s
 * `--felt` and `--felt-line`, because the arena and the board are two renderers
 * of one game and should not disagree about what the table is made of.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

import { TABLE_HALF_X, TABLE_HALF_Z } from '../layout.ts';
import { UNIT_PLANE } from './geometry.ts';

const FELT = '#10161c';
const FELT_LINE = '#1d2731';

/** A painted vignette, so a flat colour does not read as a flat colour. */
function feltTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.62);
  g.addColorStop(0, '#18222c');
  g.addColorStop(1, FELT);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function Table(): JSX.Element {
  const felt = useMemo(feltTexture, []);
  return (
    <group>
      <mesh
        geometry={UNIT_PLANE}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[TABLE_HALF_X * 2, TABLE_HALF_Z * 2, 1]}
        position={[0, 0, 0]}
        renderOrder={-10}
      >
        <meshBasicMaterial map={felt} color={felt === null ? FELT : '#ffffff'} toneMapped={false} />
      </mesh>
      {/* The centre line, and one lane line per seat. Decoration only: every
          zone's position comes from `layout.ts`, never from these. */}
      <SeatLine z={0} opacity={0.9} />
      <SeatLine z={1.6} opacity={0.45} />
      <SeatLine z={-1.6} opacity={0.45} />
    </group>
  );
}

function SeatLine({ z, opacity }: { z: number; opacity: number }): JSX.Element {
  return (
    <mesh
      geometry={UNIT_PLANE}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.0005, z]}
      scale={[TABLE_HALF_X * 2 - 0.6, 0.012, 1]}
      renderOrder={-9}
    >
      <meshBasicMaterial color={FELT_LINE} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
