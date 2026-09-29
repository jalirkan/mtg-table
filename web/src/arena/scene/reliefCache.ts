/*
 * mtg-table — arena/scene/reliefCache.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief cache, loaded** (D225–D228; since the portrait standee, **D260**,
 * the arena's): the dev route's address, the index, the depth maps — and the
 * standee built from them, the personal tier's second renderer path.
 *
 * **Development only, and that is mechanical.** The route's name is
 * {@link RELIEF_BASE}, built behind `import.meta.env.DEV` on its own line: a
 * production build replaces the gate with `false`, the string never reaches a
 * chunk, no index is asked for, every inspect backdrop is flat and no standee
 * stands (`personal.test.ts` greps `dist`). It is named HERE and nowhere else —
 * the workshop's inspect view reads it from this module (it moved from
 * `workshop/Pedestal.tsx` with the standee: the arena cannot import the
 * workshop, D102). The relief cache is card-art-derived and never committed
 * (D190, D225); nothing here draws it outside the dev server.
 *
 * Nothing is a poll: the index once a page ({@link useReliefIndex}, three's
 * `FileLoader`), a map and a back image once per card and per page's standee
 * layer ({@link useStandees}), the card's own image through `CardPlane`'s cache
 * (`useCardTexture.ts`'s `loadCardTexture` — the same texture, one upload).
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { ART_BOX, EMPTY_RELIEF, reliefIndexOf, type ReliefIndex } from '../relief.ts';
import { COMIC } from '../look.ts';
import { RELIEF_DEPTH, RELIEF_CLIFF, STANDEE_FACES_CAMERA } from '../perf.ts';
import {
  STANDEE_FRAGMENT,
  STANDEE_STANCES,
  STANDEE_VERTEX,
  standeeAspectOf,
  standeeSheets,
  type StandeeChoice,
  type StandeeFit,
} from '../standee.ts';
import type { FigurePose } from '../figures/pose.ts';
import { loadCardTexture } from './useCardTexture.ts';

/**
 * **The relief cache's address — DEV only** (D225): in a build this is `null`,
 * the string is not in the chunk, no index is asked for, every backdrop is flat
 * and nothing stands as a standee. The Vite dev server's personal route
 * (`web/src/personal/devRoute.ts`) serves the gitignored `personal/relief/` —
 * card-art-derived depth maps, never committed — and nothing else serves it.
 */
export const RELIEF_BASE: string | null = import.meta.env.DEV ? 'personal/relief/' : null;

let reliefPromise: Promise<ReliefIndex> | null = null;
let reliefResolved: ReliefIndex | null = null;

/** The relief index, once a page (three's `FileLoader`, never a `fetch` and never a poll). */
function loadReliefIndex(): Promise<ReliefIndex> {
  if (RELIEF_BASE === null) return Promise.resolve(EMPTY_RELIEF);
  reliefPromise ??= new Promise<ReliefIndex>((resolve) => {
    new THREE.FileLoader().setResponseType('json').load(
      `${RELIEF_BASE}index.json`,
      (data) => {
        resolve(reliefIndexOf(data));
      },
      undefined,
      () => {
        // No route (MTG_TABLE_PERSONAL=off), no cache yet, a 404: flat backdrops, no standee.
        resolve(EMPTY_RELIEF);
      },
    );
  }).then((index) => {
    reliefResolved = index;
    if (index.dropped.length > 0) console.info(`[arena] relief: ${index.dropped.join('; ')}`);
    return index;
  });
  return reliefPromise;
}

/**
 * **The relief index** — empty until it has loaded, forever in a build, and
 * whenever `enabled` is false (the arena's `?personal=0` or `?standee=0`).
 */
export function useReliefIndex(enabled = true): ReliefIndex {
  const [index, setIndex] = useState<ReliefIndex>(() => reliefResolved ?? EMPTY_RELIEF);
  useEffect(() => {
    if (!enabled || RELIEF_BASE === null) return;
    let live = true;
    void loadReliefIndex().then((loaded) => {
      if (live) setIndex(loaded);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return enabled ? index : EMPTY_RELIEF;
}

// ---------------------------------------------------------------------------
// The inspect view's depth map (D226): data, one upload per page
// ---------------------------------------------------------------------------

/** URL → the depth map's upload. Module scope: one per page, as `useCardTexture`'s. */
const depthCache = new Map<string, Promise<THREE.Texture>>();

/**
 * A depth map, as the inspect window's vertex shader samples it: DATA, not colour
 * (`NoColorSpace`, so the upload converts nothing), linear, no mipmaps (a vertex
 * fetch reads level 0), uploaded at once (`gl.initTexture`).
 */
function loadDepthTexture(url: string, gl: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const cached = depthCache.get(url);
  if (cached !== undefined) return cached;
  const pending = new THREE.TextureLoader().loadAsync(url).then((texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    gl.initTexture(texture);
    return texture;
  });
  pending.catch(() => {
    depthCache.delete(url);
  });
  depthCache.set(url, pending);
  return pending;
}

/** The inspect view's depth map, or `null` while it loads (or when there is none). */
export function useDepthTexture(url: string | null): THREE.Texture | null {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    setTexture(null);
    if (url === null) return;
    let live = true;
    loadDepthTexture(url, gl)
      .then((loaded) => {
        if (!live) return;
        setTexture(loaded);
        invalidate();
      })
      .catch(() => {
        // A map that did not arrive: the backdrop is drawn flat, at the window.
        if (live) setTexture(null);
      });
    return () => {
      live = false;
    };
  }, [url, gl, invalidate]);
  return texture;
}

// ---------------------------------------------------------------------------
// The standee (D260–D264)
// ---------------------------------------------------------------------------

/** One standee's textures and its cut, loaded: what every mounted copy of it draws with. */
export interface LoadedStandee {
  /** Opaque (`s0`, `s1`, …, in load order): the id a dressed pose carries. */
  id: string;
  aspect: number;
  /** The card image (CardPlane's texture — not ours to dispose). */
  map: THREE.Texture;
  /** The depth map (red, green, the keep mask) and the back layer's colour: this layer's own. */
  depth: THREE.Texture;
  back: THREE.Texture;
  /** `[u0, v0, du, dv]` in the map's UV (v up): the cut's box. */
  box: [number, number, number, number];
  /** `[u0, v0, du, dv]`: the map's UV → the back image's (inside its margin). */
  backBox: [number, number, number, number];
  near: number;
}

/** What the standee loader hands back: the fits the dressing reads (by the choice's key) and the standees by opaque id. */
export interface StandeesLoaded {
  fits: ReadonlyMap<string, StandeeFit>;
  standees: ReadonlyMap<string, LoadedStandee>;
}

export const NO_STANDEES: StandeesLoaded = Object.freeze({
  fits: new Map<string, StandeeFit>(),
  standees: new Map<string, LoadedStandee>(),
});

/** A standee's depth map: data (`NoColorSpace`), mipmapped — at figure size the painting is minified 4–10× and the cut must not shimmer. */
function standeeDepth(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function standeeBack(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * **Load what is wanted** — the standees THE lookup chose (`standeeChoicesOf`) —
 * and hand back what has loaded. Each print once per owner (the arena, the
 * workshop's pedestal): its depth map and back image are this hook's own, uploaded
 * at once and DISPOSED when the owner unmounts; the card image is `CardPlane`'s.
 * A new map arrives only when a standee does, so the poses recompute once per
 * arrival. A load that fails is the CC0 figure.
 */
export function useStandees(choices: ReadonlyMap<number, StandeeChoice>): StandeesLoaded {
  const wanted = useMemo(() => {
    const byKey = new Map<string, StandeeChoice>();
    for (const choice of choices.values()) if (!byKey.has(choice.key)) byKey.set(choice.key, choice);
    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [choices]);
  const wantedKey = wanted.map((c) => c.key).join(',');
  const [loaded, setLoaded] = useState<ReadonlyMap<string, LoadedStandee>>(() => new Map());
  // The owner's own: one request per print (a StrictMode rehearsal re-attaches to
  // it rather than asking again), the next opaque id, and the textures to dispose.
  const owned = useRef<{ next: number; requests: Map<string, Promise<LoadedStandee>>; textures: THREE.Texture[] }>({
    next: 0,
    requests: new Map(),
    textures: [],
  });
  useEffect(() => {
    let live = true;
    const loader = new THREE.TextureLoader();
    for (const choice of wanted) {
      if (loaded.has(choice.key)) continue;
      let request = owned.current.requests.get(choice.key);
      if (request === undefined) {
        // Called outside the canvas (the poses are the page's), so no renderer: the
        // card image is CardPlane's upload (`loadCardTexture` hands the renderer's
        // settings to it when CardPlane asks), and the two maps are uploaded when a
        // standee MOUNTS (`FigureLayer`'s `Standee`, at commit) — never on the frame
        // it is first drawn.
        request = Promise.all([loadCardTexture(choice.image, null), loader.loadAsync(choice.map), loader.loadAsync(choice.back)]).then(
          ([map, depthRaw, backRaw]) => {
            const depth = standeeDepth(depthRaw);
            const back = standeeBack(backRaw);
            owned.current.textures.push(depth, back);
            const { entry, cut } = choice;
            const b = entry.back;
            return {
              id: `s${String(owned.current.next++)}`,
              aspect: standeeAspectOf(entry, cut),
              map,
              depth,
              back,
              box: [cut.box.left, 1 - cut.box.bottom, cut.box.right - cut.box.left, cut.box.bottom - cut.box.top],
              backBox: [b.margin / b.width, b.margin / b.height, entry.width / b.width, entry.height / b.height],
              near: cut.near,
            };
          },
        );
        owned.current.requests.set(choice.key, request);
        request.catch((error: unknown) => {
          owned.current.requests.delete(choice.key);
          console.info(`[arena] standee: a painting did not load (${String(error)}) — its CC0 figure stands`);
        });
      }
      request
        .then((standee) => {
          if (!live) return;
          setLoaded((previous) => {
            if (previous.has(choice.key)) return previous;
            const next = new Map(previous);
            next.set(choice.key, standee);
            return next;
          });
        })
        .catch(() => {
          // Said once, above.
        });
    }
    return () => {
      live = false;
    };
    // `wantedKey` is `wanted`, as a string React can compare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);
  // Disposed with the owner: the depth maps and back images this hook uploaded
  // (the list is kept: a StrictMode rehearsal's dispose is re-uploaded on the next
  // draw, and the real unmount disposes them again).
  useEffect(
    () => () => {
      for (const texture of owned.current.textures) texture.dispose();
    },
    [],
  );
  return useMemo(() => {
    if (loaded.size === 0) return NO_STANDEES;
    const fits = new Map<string, StandeeFit>();
    const standees = new Map<string, LoadedStandee>();
    for (const [key, standee] of loaded) {
      fits.set(key, { id: standee.id, aspect: standee.aspect });
      standees.set(standee.id, standee);
    }
    return { fits, standees };
  }, [loaded]);
}

let sharedGeometry: THREE.BufferGeometry | null = null;

/**
 * **THE standee geometry** (D263): two sheets in one buffer, so a standee is ONE
 * draw call — the FRONT (`STANDEE_GRID`) and the BACK (`STANDEE_BACK_GRID`),
 * told apart by `aLayer`. Its positions are placeholders (the vertex shader builds
 * every point from the UV, the maps and the pose); its bounding sphere covers the
 * widest cut at the deepest relief, so three's culling is still right. One for
 * the page, shared by every standee and every falling body; never disposed (it is
 * 4,000 vertices).
 */
export function standeeGeometry(): THREE.BufferGeometry {
  if (sharedGeometry !== null) return sharedGeometry;
  const sheets = standeeSheets();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(sheets.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(sheets.uvs, 2));
  geometry.setAttribute('aLayer', new THREE.Float32BufferAttribute(sheets.layers, 1));
  geometry.setIndex(sheets.indices);
  // The widest cut the deck's paintings give is 2.2 heights across; a bow, a sink or a fall stays inside.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.8);
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-1.8, -1.3, -1.8), new THREE.Vector3(1.8, 1.8, 1.8));
  sharedGeometry = geometry;
  return geometry;
}

/** The uniforms a standee's material carries — the frame loop's numbers are a figure's own names. */
export interface StandeeUniforms {
  map: { value: THREE.Texture };
  uBack: { value: THREE.Texture };
  uDepth: { value: THREE.Texture };
  uBox: { value: THREE.Vector4 };
  uArtBox: { value: THREE.Vector4 };
  uBackBox: { value: THREE.Vector4 };
  uAspect: { value: number };
  uRelief: { value: number };
  uBehind: { value: number };
  uNear: { value: number };
  uCut: { value: number };
  uRim: { value: number };
  uInk: { value: THREE.Color };
  uLean: { value: number };
  uSink: { value: number };
  uFaceCamera: { value: number };
  uTint: { value: THREE.Color };
  uOpacity: { value: number };
  uMaterialize: { value: number };
  uDrain: { value: number };
  uDrainTo: { value: THREE.Color };
  uWash: { value: number };
  uWashTo: { value: THREE.Color };
}

export type StandeeMaterial = THREE.ShaderMaterial & { uniforms: StandeeUniforms };

/**
 * **The ink rim round every cut** (D261, as the fix pass amended it): its width
 * in the render target's pixels and its colour, ONE value object each that every
 * standee material shares — the figures' outer ink (`COMIC.inkCssPx` × the render
 * dpr, `COMIC.ink`), so a standee's edge weighs what a figure's silhouette does.
 * Written at COMMIT when the dpr changes ({@link applyStandeeRim}, `FigureLayer`'s
 * look effect), never in the frame loop.
 */
const STANDEE_RIM = { value: Math.max(1, COMIC.inkCssPx) };
const STANDEE_INK = { value: new THREE.Color(COMIC.ink) };

/** The rim at this render dpr — never under one pixel (as `Post.tsx`'s `inkWidthFor`). At commit only. */
export function applyStandeeRim(dpr: number): void {
  STANDEE_RIM.value = Math.max(1, COMIC.inkCssPx * dpr);
}

/** How far the back sheet stands behind the front, in the standee's heights (a hair: it only shows through a cut). */
const BACK_BEHIND = 0.004;
/** §6.4's freeze wash, as the figures' (`CueRunner`'s `FREEZE_WASH`, `FREEZE_MIX`). */
const FREEZE_WASH = new THREE.Color('#8d949e');
const FREEZE_MIX = 0.45;

/**
 * **One standee's material** — its own uniforms on the ONE program every standee
 * shares (`STANDEE_VERTEX`, `STANDEE_FRAGMENT`). Built at commit, per mounted
 * standee and per falling body; the textures are the loaded standee's.
 */
export function makeStandeeMaterial(standee: LoadedStandee, tint: string): StandeeMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: STANDEE_VERTEX,
    fragmentShader: STANDEE_FRAGMENT,
    uniforms: {
      map: { value: standee.map },
      uBack: { value: standee.back },
      uDepth: { value: standee.depth },
      uBox: { value: new THREE.Vector4(...standee.box) },
      uArtBox: { value: new THREE.Vector4(ART_BOX.left, 1 - ART_BOX.bottom, ART_BOX.right - ART_BOX.left, ART_BOX.bottom - ART_BOX.top) },
      uBackBox: { value: new THREE.Vector4(...standee.backBox) },
      uAspect: { value: standee.aspect },
      uRelief: { value: RELIEF_DEPTH },
      uBehind: { value: BACK_BEHIND },
      uNear: { value: standee.near },
      uCut: { value: RELIEF_CLIFF },
      uRim: STANDEE_RIM,
      uInk: STANDEE_INK,
      uLean: { value: 0 },
      uSink: { value: 0 },
      uFaceCamera: { value: STANDEE_FACES_CAMERA ? 1 : 0 },
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uMaterialize: { value: 1 },
      uDrain: { value: 0 },
      uDrainTo: { value: new THREE.Color('#8b939e') },
      uWash: { value: 0 },
      uWashTo: { value: FREEZE_WASH.clone() },
    },
    transparent: true,
    // As a figure's (`figureMaterial.ts`): the cut is a discard, so what is drawn
    // is opaque and writes depth; the sick translucency blends over what is behind.
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return material as StandeeMaterial;
}

/**
 * **A pose's stance on a standee, at COMMIT** (D262): the lean and the sink of
 * `STANDEE_STANCES`, and the combat freeze's wash — never from the frame loop.
 */
export function applyStandeeStance(material: StandeeMaterial, pose: Pick<FigurePose, 'stance' | 'frozen'>): void {
  const stance = STANDEE_STANCES[pose.stance];
  material.uniforms.uLean.value = stance.lean;
  material.uniforms.uSink.value = stance.sink;
  material.uniforms.uWash.value = pose.frozen ? FREEZE_MIX : 0;
}

/** A standee's mesh: the shared geometry, its own material, no click (`HitProxy` stays the only thing the raycaster sees). */
export function makeStandeeMesh(material: StandeeMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(standeeGeometry(), material);
  mesh.name = 'standee';
  mesh.raycast = () => {};
  return mesh;
}
