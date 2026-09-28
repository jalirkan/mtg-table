/*
 * mtg-table — arena/scene/Table.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The table itself: one quad at `y = 0` on the XZ plane, plus the two thin
 * lines that tell you where the seats are (report 09 §3.1) — and, under the comic
 * look, the STAGE around it (Lane LOOK, **D124**, report 15 §4).
 *
 * The scene has **no lights at all** (§4.3), and the table and the cards are
 * never shaded (report 13 §8.3 rule 2): the ground is a flat colour with a
 * painted falloff, in `meshBasicMaterial`. Two grounds, the look's choice:
 *
 *  - **the felt** (the hologram's, `?look=holo` or `?stage=felt`): `styles.css`'s
 *    `--felt` and `--felt-line`, because the arena and the board are two
 *    renderers of one game. L* 7–13 — the comic look's ink and bands vanish on it
 *    (report 15 §4.1: `comic-first-cut-dark-felt-fury.png`).
 *  - **the comic stage** (the default): a MID-value ground (L* about 30–38) —
 *    each seat's half in the colour of the cards that seat has SHOWN (`look.ts`'s
 *    `stageColoursOf`: public zones only, face-up cards only, a seat's default
 *    until it shows one), a slate centre band, a warm stage light, a Ben-Day dot
 *    vignette toward the rim and the seat lines as a heavy ink stroke. The light
 *    and the dots are painted ONCE per page; the seats' colours are the quad's
 *    vertex colours, written at commit when a seat shows its first coloured card —
 *    never a repaint, never the frame loop.
 *
 * And two things only the comic stage has, each a pose or a paint-once texture:
 *
 *  - **the backdrop**: one open cylinder round the table with a painted sky, a
 *    Ben-Day screen and a skyline band — +1 draw call, 96 triangles, one canvas
 *    painted once per page. It writes no depth, so the ink pass sees the table's
 *    own edge against it and nothing on it.
 *  - **the combat stage**: a radial burst of action lines at the table's centre
 *    while `state.combat` has a band (`look.ts`'s `combatStageOf`, a POSE, D56:
 *    right after a skip, a scrub and a `resync`) — +1 draw call only during
 *    combat. Its canvas is painted and its program compiled when the stage
 *    MOUNTS (§8.3 rule 3), not on the first combat, which is the worst frame to
 *    pay for either on.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TABLE_HALF_X, TABLE_HALF_Z } from '../layout.ts';
import { COMIC, type StageColours } from '../look.ts';
import { UNIT_PLANE } from './geometry.ts';
import { compileFor } from './prime.ts';

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

/** A Ben-Day screen over `ctx`: dots on a staggered grid, sized by `radiusAt(x, y)` (0 = none). */
function benDay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  step: number,
  fill: string,
  radiusAt: (x: number, y: number) => number,
): void {
  ctx.fillStyle = fill;
  for (let y = step / 2; y < h; y += step) {
    const row = Math.round((y - step / 2) / step);
    for (let x = (row % 2) * (step / 2) + step / 2; x < w; x += step) {
      const r = radiusAt(x, y);
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * **The comic stage's ground** (D124) — painted ONCE per page, in light only:
 * a warm stage light at the centre falling off toward the rim, and a Ben-Day dot
 * vignette growing toward the rim. The seats' colours are NOT in it: they are
 * the stage quad's vertex colours ({@link stageColoursInto}), which the texture
 * multiplies, so a seat showing its first coloured card is ten colours written
 * at commit — never a repaint (a 1024-px paint and a 4 MB upload measured 4–20 ms
 * and 1–19 ms on the GTX 1080 page, `docs/evidence/look.md`). 1024 px wide,
 * anisotropy 1 (a full-table quad at 4× was part of the spike's SwiftShader cost,
 * report 15 §4.1).
 */
let stageTex: THREE.CanvasTexture | null | undefined;

function stageTexture(): THREE.CanvasTexture | null {
  if (stageTex !== undefined) return stageTex;
  if (typeof document === 'undefined') return (stageTex = null);
  const w = 1024;
  const h = Math.round((w * TABLE_HALF_Z) / TABLE_HALF_X);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (stageTex = null);
  // The multiplier the seat colours are drawn through: warm white at the centre
  // (the stage light), darker toward the rim.
  const light = ctx.createRadialGradient(w / 2, h / 2, w * 0.04, w / 2, h / 2, w * 0.62);
  light.addColorStop(0, '#fff3dc');
  light.addColorStop(0.5, '#d9d4cc');
  light.addColorStop(1, '#8a8790');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);
  // Ben-Day dots, growing toward the rim: the page's own vignette.
  const step = 10;
  benDay(ctx, w, h, step, 'rgba(12,10,28,0.42)', (x, y) => {
    const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
    return step * 0.46 * Math.min(1, Math.max(0, (d - 0.55) / 0.6));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return (stageTex = texture);
}

/**
 * The stage quad's rows, along the table from YOUR edge (0) to the opponent's
 * (1): your colour to 44 %, the slate centre band at the middle, the opponent's
 * from 56 % — the spike's canvas gradient, as five rows of vertex colours.
 */
const STAGE_ROWS: readonly number[] = [0, 0.44, 0.5, 0.56, 1];
/** How much brighter than its tone a seat is drawn before the light texture multiplies it. */
const STAGE_GAIN = 1.3;

/** A flat quad in the XY plane, two columns by {@link STAGE_ROWS}, with a colour per vertex. */
function stageGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let r = 0; r < STAGE_ROWS.length; r++) {
    const t = STAGE_ROWS[r]!;
    // Plane y = t − 0.5; the quad is laid flat with −π/2 about x, so +y is the far (−z) edge.
    for (const x of [-0.5, 0.5]) {
      positions.push(x, t - 0.5, 0);
      uvs.push(x + 0.5, t);
    }
    if (r > 0) {
      const a = (r - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array<number>(STAGE_ROWS.length * 2 * 3).fill(1), 3));
  geometry.setIndex(index);
  return geometry;
}

const TONE = new THREE.Color();

/** Write both seats' tones into the stage quad's vertex colours — commit time only. */
function stageColoursInto(geometry: THREE.BufferGeometry, colours: StageColours): void {
  const colour = geometry.getAttribute('color') as THREE.BufferAttribute;
  for (let r = 0; r < STAGE_ROWS.length; r++) {
    const t = STAGE_ROWS[r]!;
    TONE.set(t < 0.47 ? colours.you : t > 0.53 ? colours.opp : COMIC.centre).multiplyScalar(STAGE_GAIN);
    for (let c = 0; c < 2; c++) colour.setXYZ(r * 2 + c, TONE.r, TONE.g, TONE.b);
  }
  colour.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// The backdrop — one open cylinder round the table, painted once per page
// ---------------------------------------------------------------------------

const BACKDROP_RADIUS = 21;
const BACKDROP_BOTTOM = -7;
const BACKDROP_TOP = 11;
/**
 * 48 segments, one height segment: 96 triangles — turned INSIDE OUT (x mirrored,
 * which flips the winding), so the inside faces are front faces and the material
 * is `FrontSide` with white vertex colours: the same program as the stage's own
 * `meshBasicMaterial` (a map and vertex colours), where `BackSide` would compile
 * a second one (`FLIP_SIDED`).
 */
const BACKDROP_GEOMETRY = new THREE.CylinderGeometry(
  BACKDROP_RADIUS,
  BACKDROP_RADIUS,
  BACKDROP_TOP - BACKDROP_BOTTOM,
  48,
  1,
  true,
).scale(-1, 1, 1);
// White vertex colours, so the backdrop's material is the stage's program too.
BACKDROP_GEOMETRY.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(new Array<number>(BACKDROP_GEOMETRY.getAttribute('position').count * 3).fill(1), 3),
);

let backdropTex: THREE.CanvasTexture | null | undefined;

/**
 * The sky, the screen and the skyline: a night-blue gradient to a warm horizon at
 * the table's height, Ben-Day dots thickening toward the horizon, and a city of
 * flat ink blocks with a few lit windows — procedural, painted once, not an asset
 * (report 15 §4.2). The canvas's u runs round the cylinder from your side (0)
 * through the opponent's (0.5); the tallest block sits behind the opponent.
 */
function backdropTexture(): THREE.CanvasTexture | null {
  if (backdropTex !== undefined) return backdropTex;
  if (typeof document === 'undefined') return (backdropTex = null);
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (backdropTex = null);
  // v = 0 is the cylinder's BOTTOM, drawn as the canvas's LAST row (flipY).
  const horizon = Math.round(h * ((BACKDROP_TOP - 0.2) / (BACKDROP_TOP - BACKDROP_BOTTOM)));
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#171538');
  sky.addColorStop(horizon / h - 0.08, '#342b56');
  sky.addColorStop(horizon / h, '#6a4a60');
  sky.addColorStop(horizon / h + 0.02, '#1b1a33');
  sky.addColorStop(1, '#0d0c1c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  benDay(ctx, w, h, 8, 'rgba(255,214,170,0.10)', (_x, y) => {
    const near = 1 - Math.min(1, Math.abs(y - horizon) / (h * 0.45));
    return y < horizon ? 8 * 0.42 * near : 0;
  });
  // The skyline: ink blocks standing on the horizon, a deterministic walk.
  let seed = 7;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let x = 0;
  while (x < w) {
    const width = 10 + rand() * 26;
    const behindOpp = 1 - Math.min(1, Math.abs(x + width / 2 - w / 2) / (w * 0.3));
    const height = 5 + rand() * 16 + behindOpp * 16;
    ctx.fillStyle = '#0e1016';
    ctx.fillRect(x, horizon - height, width - 2, height);
    ctx.fillStyle = 'rgba(255,208,120,0.55)';
    for (let wy = horizon - height + 3; wy < horizon - 2; wy += 4) {
      for (let wx = x + 2; wx < x + width - 4; wx += 4) if (rand() < 0.16) ctx.fillRect(wx, wy, 1, 2);
    }
    x += width;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return (backdropTex = texture);
}

// ---------------------------------------------------------------------------
// The combat stage — a radial burst at the table's centre, painted once per page
// ---------------------------------------------------------------------------

let burstTex: THREE.CanvasTexture | null | undefined;

/** Action lines from the centre, clear in the middle, and a tighter dot ring: a panel's "now". */
function burstTexture(): THREE.CanvasTexture | null {
  if (burstTex !== undefined) return burstTex;
  if (typeof document === 'undefined') return (burstTex = null);
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (burstTex = null);
  const c = size / 2;
  let seed = 11;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  ctx.fillStyle = 'rgba(14,16,22,0.34)';
  const rays = 72;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rand() * 0.03;
    const spread = 0.006 + rand() * 0.012;
    const inner = size * (0.2 + rand() * 0.08);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
    ctx.lineTo(c + Math.cos(a - spread) * c * 1.42, c + Math.sin(a - spread) * c * 1.42);
    ctx.lineTo(c + Math.cos(a + spread) * c * 1.42, c + Math.sin(a + spread) * c * 1.42);
    ctx.closePath();
    ctx.fill();
  }
  benDay(ctx, size, size, 12, 'rgba(12,10,28,0.30)', (x, y) => {
    const d = Math.hypot(x - c, y - c) / c;
    return 12 * 0.42 * Math.min(1, Math.max(0, (d - 0.72) / 0.28));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return (burstTex = texture);
}

export interface TableProps {
  /** The comic stage's seat colours, or `null` for the felt (the hologram's table). */
  stage?: StageColours | null;
  /** The combat stage (a pose: `look.ts`'s `combatStageOf`). Drawn only on the comic stage. */
  combat?: boolean;
  /** Whether a composer draws the frames (bloom or the ink): the burst is primed for that target (`prime.ts`). */
  composer?: boolean;
}

export function Table({ stage = null, combat = false, composer = false }: TableProps): JSX.Element {
  const comic = stage !== null;
  const you = stage?.you ?? '';
  const opp = stage?.opp ?? '';
  // The felt is this table's own texture; the stage's light is painted once per page.
  const felt = useMemo(() => (comic ? null : feltTexture()), [comic]);
  useEffect(() => () => felt?.dispose(), [felt]);
  const light = useMemo(() => (comic ? stageTexture() : null), [comic]);
  // The seats' colours, at commit — ten vertex colours, never a repaint.
  const ground = useMemo(() => stageGeometry(), []);
  useEffect(() => () => ground.dispose(), [ground]);
  useLayoutEffect(() => {
    if (comic) stageColoursInto(ground, { you, opp });
  }, [ground, comic, you, opp]);
  const backdrop = useMemo(() => (comic ? backdropTexture() : null), [comic]);
  const burst = useMemo(() => (comic ? burstTexture() : null), [comic]);
  // §8.3 rule 3: the burst's program is compiled when the stage mounts —
  // `compile` skips invisible objects, so it is shown for the one call.
  const burstRef = useRef<THREE.Mesh | null>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const combatRef = useRef(combat);
  combatRef.current = combat;
  useLayoutEffect(() => {
    const mesh = burstRef.current;
    if (mesh === null) return;
    mesh.visible = true;
    // For the target the frames are drawn into — the composer's, or the canvas.
    compileFor(gl, scene, camera, composer);
    mesh.visible = combatRef.current;
  }, [burst, gl, scene, camera, composer]);
  useLayoutEffect(() => {
    invalidate();
  }, [felt, light, you, opp, combat, invalidate]);
  return (
    <group>
      {comic && (
        <mesh
          geometry={BACKDROP_GEOMETRY}
          position={[0, (BACKDROP_TOP + BACKDROP_BOTTOM) / 2, 0]}
          renderOrder={-20}
          raycast={() => {}}
        >
          <meshBasicMaterial map={backdrop} vertexColors color={backdrop === null ? COMIC.background : '#ffffff'} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {comic ? (
        <mesh
          geometry={ground}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[TABLE_HALF_X * 2, TABLE_HALF_Z * 2, 1]}
          position={[0, 0, 0]}
          renderOrder={-10}
        >
          <meshBasicMaterial map={light} vertexColors toneMapped={false} />
        </mesh>
      ) : (
        <mesh
          geometry={UNIT_PLANE}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[TABLE_HALF_X * 2, TABLE_HALF_Z * 2, 1]}
          position={[0, 0, 0]}
          renderOrder={-10}
        >
          <meshBasicMaterial map={felt} color={felt === null ? FELT : '#ffffff'} toneMapped={false} />
        </mesh>
      )}
      {burst !== null && (
        <mesh
          ref={burstRef}
          visible={combat}
          geometry={UNIT_PLANE}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[TABLE_HALF_Z * 1.9, TABLE_HALF_Z * 1.9, 1]}
          position={[0, 0.0003, 0]}
          renderOrder={-9}
          raycast={() => {}}
        >
          <meshBasicMaterial map={burst} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
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
        color={comic ? COMIC.line : FELT_LINE}
        transparent
        opacity={comic ? Math.min(1, opacity + 0.2) : opacity}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
