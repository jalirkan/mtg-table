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

// ---------------------------------------------------------------------------
// Spike (report 15 §4): the comic STAGE. A mid-value ground — the ink line and
// the cel bands need one: black ink on the Tier-1 felt (L* about 8) disappears —
// your half cool, the opponent's warm, a stage light at the centre, and a Ben-Day
// dot vignette toward the rim, all painted ONCE into one canvas. Same quad, same
// material kind, no light, no clock: an idle table still renders nothing.
// ---------------------------------------------------------------------------

function comicFeltTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 1024;
  const h = Math.round((w * TABLE_HALF_Z) / TABLE_HALF_X);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  // The canvas's top row is the far (opponent's) edge once the quad lies flat.
  const seats = ctx.createLinearGradient(0, 0, 0, h);
  seats.addColorStop(0, '#5a3550');
  seats.addColorStop(0.46, '#3d3f63');
  seats.addColorStop(0.54, '#36486a');
  seats.addColorStop(1, '#21566a');
  ctx.fillStyle = seats;
  ctx.fillRect(0, 0, w, h);
  const light = ctx.createRadialGradient(w / 2, h / 2, w * 0.04, w / 2, h / 2, w * 0.62);
  light.addColorStop(0, 'rgba(255,236,200,0.22)');
  light.addColorStop(0.5, 'rgba(255,236,200,0.06)');
  light.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);
  // Ben-Day dots, growing toward the rim: the page's own vignette.
  ctx.fillStyle = 'rgba(12,10,28,0.42)';
  const step = 10;
  for (let y = step / 2; y < h; y += step) {
    for (let x = ((y / step) % 2) * (step / 2) + step / 2; x < w; x += step) {
      const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
      const r = step * 0.46 * Math.min(1, Math.max(0, (d - 0.55) / 0.6));
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Spike: the stage's ink — the seat lines drawn as a heavy K-plate stroke. */
const COMIC_LINE = '#0e1016';

export function Table({ look = 0 }: { look?: number }): JSX.Element {
  const comic = look > 0;
  const felt = useMemo(() => (comic ? comicFeltTexture() : feltTexture()), [comic]);
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
      <SeatLine z={0} opacity={0.9} comic={comic} />
      <SeatLine z={1.6} opacity={0.45} comic={comic} />
      <SeatLine z={-1.6} opacity={0.45} comic={comic} />
    </group>
  );
}

function SeatLine({ z, opacity, comic }: { z: number; opacity: number; comic: boolean }): JSX.Element {
  return (
    <mesh
      geometry={UNIT_PLANE}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.0005, z]}
      scale={[TABLE_HALF_X * 2 - 0.6, comic ? 0.03 : 0.012, 1]}
      renderOrder={-9}
    >
      <meshBasicMaterial
        color={comic ? COMIC_LINE : FELT_LINE}
        transparent
        opacity={comic ? Math.min(1, opacity + 0.2) : opacity}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
