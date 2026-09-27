/*
 * mtg-table — arena/scene/holoMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The holographic treatment** — the art direction the user chose, and the
 * reason it is also the cheapest thing on report 13 §13's list: it *hides* low
 * model quality, it keeps the scene **unlit**, and it makes one generic humanoid
 * serve six archetypes with only a tint change.
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
 *    model's own Y, not of the wall clock, so nothing here can keep
 *    `frameloop='demand'` awake (§1.5). An idle table still renders zero frames.
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

export interface HoloUniforms {
  uTint: { value: THREE.Color };
  uOpacity: { value: number };
  /** How tight the rim is. Higher is a thinner edge. */
  uRim: { value: number };
  /** How much of the tint the body carries before the rim is added. */
  uCore: { value: number };
  /** 0 ⇒ no scanlines. */
  uScan: { value: number };
}

export type HoloMaterial = THREE.ShaderMaterial & { uniforms: HoloUniforms };

const VERTEX = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;

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
    vLocalY = transformed.y;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uCore;
  uniform float uScan;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;

  void main() {
    vec3 normal = normalize( vViewNormal );
    // abs() so a back face rims like a front one: the figure is translucent
    // and both sides are visible at a grazing angle.
    float facing = abs( dot( normal, normalize( vViewDir ) ) );
    float fresnel = pow( 1.0 - facing, uRim );

    // A function of the model's own Y, not of time: free, and it cannot wake the
    // frame loop.
    float scan = 1.0 - uScan * step( 0.5, fract( vLocalY * 34.0 ) ) * 0.35;

    vec3 colour = uTint * ( uCore + fresnel * 1.7 ) * scan;
    float alpha = clamp( uOpacity * ( 0.38 + fresnel * 0.85 ), 0.0, 1.0 );

    gl_FragColor = vec4( colour, alpha );

    #include <colorspace_fragment>
  }
`;

/** The one material every figure is cloned from, so there is one program. */
export function makeHoloMaterial(tint: string): HoloMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uRim: { value: 2.1 },
      uCore: { value: 0.55 },
      uScan: { value: 1 },
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
