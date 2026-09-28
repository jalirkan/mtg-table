/*
 * mtg-table — arena/scene/holoMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The holographic treatment** — the art direction the user chose, and the
 * reason it is also the cheapest thing on report 13 §13's list: it *hides* low
 * model quality, it keeps the scene **unlit**, and it lets two proportioned
 * bodies serve every humanoid card.
 *
 * **Slice 4 — a person in a costume, still a hologram.** The user's verdict on
 * slice 3 was "the avatars are still pretty generic": one tint over a toy. A body
 * now carries a costume SLOT per vertex (the build's `_REGION`: skin, hair, top,
 * shirt, legs, shoes, gloves, belt) and each figure's material a PALETTE, one
 * colour per slot, written at commit from the pose ({@link applyCostume}) — so
 * Peggy is a blue jacket over a white shirt and Wasp gold and black, the
 * silhouette still glows in the card's own tint, and it is still one program, no
 * texture and no per-frame work. A figure with no palette (the drone, the bee) is
 * drawn exactly as slices 1–3 drew it.
 *
 * Three properties, and each one is a budget line:
 *
 *  - **Unlit.** Tier 1 has no lights at all, which is why 40 draw calls buy a
 *    whole table (report 09 §4.3, §9.2 rule 3). A figure in `meshLambertMaterial`
 *    would need one, and "just one directional light" is how an unlit scene that
 *    runs at 40 draw calls becomes a lit scene that does not (§12). The fresnel
 *    rim gives the silhouette its form with no light in the scene.
 *  - **One program.** Every figure gets its **own material instance** (the tint
 *    is a uniform and each creature has its own colour), but they are all built
 *    from the same source, so three's program cache compiles **one** program for
 *    the whole library — measured in the browser as `gl.info.programs`.
 *  - **No clock.** There is no `uTime`: the scanlines are a function of the
 *    figure's own height (its model Y × `uUnitScale`), not of the wall clock, so
 *    nothing here can keep `frameloop='demand'` awake (§1.5). An idle table still
 *    renders zero frames.
 *
 * ---------------------------------------------------------------------------
 * The one non-obvious line is `#include <colorspace_fragment>`. Three's built-in
 * shaders end with it (`gl_FragColor = linearToOutputTexel(gl_FragColor)`); a
 * custom `ShaderMaterial` gets no such thing for free, and without it every tint
 * is visibly wrong in the same direction the card textures were before
 * `useCardTexture.ts` started setting `colorSpace` by hand. `THREE.Color.set`
 * converts an sRGB hex into the working space on the way in, this converts back
 * on the way out, and the round trip is what makes `#f6f0d8` arrive as `#f6f0d8`.
 *
 * Skinning is three's own: `USE_SKINNING` is defined for **any** material on a
 * `SkinnedMesh` (`WebGLPrograms.js:330`, `WebGLProgram.js:579`) and the renderer
 * sets `bindMatrix` / `boneTexture` with `setOptional`
 * (`WebGLRenderer.js:2689`), so including the four skinning chunks is the whole
 * of what a custom shader has to do.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { COSTUME_SLOTS } from '../figures/props.ts';

/** How many costume slots a palette carries — the shader's array length. */
export const COSTUME_SIZE = COSTUME_SLOTS.length;

/**
 * **The attribute a body's costume slots arrive in.** `tools/build-figures.mjs`
 * writes them as the glTF custom attribute `_REGION`, which `GLTFLoader` names
 * `_region`; `scene/models.ts` renames it once, at load, on the shared geometry
 * (a leading underscore is legal GLSL, but the rename keeps the shader's names
 * the arena's own). A body without it (the drone, the bee) reads slot 0 and draws
 * no costume anyway (`uCostumeOn` 0).
 */
export const COSTUME_ATTRIBUTE = 'costumeRegion';

export interface HoloUniforms {
  uTint: { value: THREE.Color };
  uOpacity: { value: number };
  /** How tight the rim is. Higher is a thinner edge. */
  uRim: { value: number };
  /** How much of the tint the body carries before the rim is added. */
  uCore: { value: number };
  /** 0 ⇒ no scanlines. */
  uScan: { value: number };
  /**
   * **Slice 4 — the costume.** One colour per `COSTUME_SLOTS` slot, looked up per
   * vertex by the body's `costumeRegion`; `uCostumeOn` 0 draws the body in
   * `uTint` alone, exactly as slices 1–3 did (the drone, the bee, an anonymous
   * figure never gets a palette). Written at COMMIT, from the pose — never per
   * frame — by {@link applyCostume}.
   */
  uCostume: { value: THREE.Color[] };
  uCostumeOn: { value: number };
  /**
   * The model's own units → figure units (`LoadedModel.unitScale`), so the
   * scanlines are a function of the FIGURE's height whichever pack it came from:
   * the proportioned bodies are 1.9 units tall in their own space and the chibis
   * 0.67, and slice 3's `* 34.0` on raw model Y drew them 65 and 23 lines apart.
   */
  uUnitScale: { value: number };
  /**
   * **D64's drain, as a uniform** (slice 4): a dying body fades toward
   * `uDrainTo` by `uDrain`, 0…1, which the departing body's frame loop writes as
   * a number — so the drain reaches every costume slot, not just the tint, and
   * the loop still allocates nothing.
   */
  uDrain: { value: number };
  uDrainTo: { value: THREE.Color };
}

export type HoloMaterial = THREE.ShaderMaterial & { uniforms: HoloUniforms };

const VERTEX = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>

  attribute float ${COSTUME_ATTRIBUTE};
  uniform vec3 uCostume[ ${String(COSTUME_SIZE)} ];
  uniform float uUnitScale;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying vec3 vCostume;

  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
    // Both in VIEW space. Mixing a view-space normal with a world-space view
    // vector is the classic fresnel bug: the rim then swims as the camera
    // orbits instead of hugging the silhouette.
    vViewNormal = normalize( transformedNormal );
    vViewDir = normalize( -mvPosition.xyz );
    vLocalY = transformed.y * uUnitScale;
    // The slot is looked up HERE, per vertex (a dynamic index into a uniform
    // array is legal in a vertex shader), and interpolated: where two slots meet
    // across a triangle the colours blend, which at 60 px reads as a seam.
    int slot = int( clamp( ${COSTUME_ATTRIBUTE} + 0.5, 0.0, ${String(COSTUME_SIZE - 1)}.0 ) );
    vCostume = uCostume[ slot ];
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uCore;
  uniform float uScan;
  uniform float uCostumeOn;
  uniform float uDrain;
  uniform vec3 uDrainTo;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying vec3 vCostume;

  void main() {
    vec3 normal = normalize( vViewNormal );
    // abs() so a back face rims like a front one: the figure is translucent
    // and both sides are visible at a grazing angle.
    float facing = abs( dot( normal, normalize( vViewDir ) ) );
    float fresnel = pow( 1.0 - facing, uRim );

    // A function of the figure's own height, not of time: free, and it cannot
    // wake the frame loop. 23 lines a figure (slices 1–3's chibi count).
    float lines = fract( vLocalY * 23.0 );
    float scan = 1.0 - uScan * mix( 0.35, 0.12, uCostumeOn ) * step( 0.5, lines );

    // **The costume** (slice 4): the body is its palette and the silhouette glows
    // in the card's own colour — so Peggy is a blue jacket over a white shirt
    // with a white-gold edge, and still a hologram. With no costume both are the
    // tint and this is slices 1–3's shader to the last term.
    vec3 body = mix( uTint, vCostume, uCostumeOn );
    vec3 rimColour = mix( body, uTint, 0.55 * uCostumeOn );
    body = mix( body, uDrainTo, uDrain );
    rimColour = mix( rimColour, uDrainTo, uDrain );
    float core = mix( uCore, 0.95, uCostumeOn );
    float rim = mix( 1.7, 1.05, uCostumeOn );
    vec3 colour = ( body * core + rimColour * fresnel * rim ) * scan;
    // A costume is more solid than a bare hologram: a colour has to read as the
    // cloth it is, not as a tint over the card below.
    float alpha = clamp( uOpacity * ( mix( 0.38, 0.74, uCostumeOn ) + fresnel * mix( 0.85, 0.4, uCostumeOn ) ), 0.0, 1.0 );

    gl_FragColor = vec4( colour, alpha );

    #include <colorspace_fragment>
  }
`;

/**
 * The one material every figure is cloned from, so there is one program.
 * `unitScale` is the model's (`LoadedModel.unitScale`) — see {@link HoloUniforms.uUnitScale}.
 */
export function makeHoloMaterial(tint: string, unitScale = 1): HoloMaterial {
  const costume: THREE.Color[] = [];
  for (let i = 0; i < COSTUME_SIZE; i++) costume.push(new THREE.Color(tint));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uRim: { value: 2.1 },
      uCore: { value: 0.55 },
      uScan: { value: 1 },
      uCostume: { value: costume },
      uCostumeOn: { value: 0 },
      uUnitScale: { value: unitScale },
      uDrain: { value: 0 },
      uDrainTo: { value: new THREE.Color('#8b939e') },
    },
    transparent: true,
    // **`depthWrite` stays on.** A hologram that writes no depth shows its own
    // back through its front and reads as a smear rather than a body; with it
    // on, the figure is solid against itself and translucent against the table.
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  return material as HoloMaterial;
}

/** §6.4's freeze wash — the grey `CueRunner` lerps a frozen figure's tint toward. */
const FREEZE_WASH = new THREE.Color('#8d949e');
const FREEZE_MIX = 0.45;

/**
 * **Write a pose's costume into a figure's material** — at COMMIT, from
 * `FigureLayer`'s layout effect, never from the frame loop (the palette is a
 * pose: it changes when the snapshot does). `costume` is the pose's resolved
 * palette, one `#rrggbb` per slot, or `null` for a body that wears none. A frozen
 * pose (§6.4's combat freeze) washes the palette as `CueRunner` washes the tint,
 * so a frozen figure is grey all over. Returns the key it wrote, so the caller can
 * skip an unchanged pose; `previous` is the key it wrote last time.
 */
export function applyCostume(
  material: HoloMaterial,
  costume: readonly string[] | null,
  frozen: boolean,
  previous: string | null = null,
): string {
  const key = costume === null ? 'none' : `${frozen ? 'f' : 'l'}${costume.join('')}`;
  if (key === previous) return key;
  const uniforms = material.uniforms;
  if (costume === null) {
    uniforms.uCostumeOn.value = 0;
    return key;
  }
  for (let i = 0; i < COSTUME_SIZE; i++) {
    const colour = uniforms.uCostume.value[i]!;
    colour.set(costume[i] ?? '#ffffff');
    if (frozen) colour.lerp(FREEZE_WASH, FREEZE_MIX);
  }
  uniforms.uCostumeOn.value = 1;
  return key;
}
