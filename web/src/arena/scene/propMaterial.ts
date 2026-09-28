/*
 * mtg-table — arena/scene/propMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The prop field's one shader** — moved out of `scene/props.ts` by Lane LOOK's
 * first commit (report 15 §9.1 and §9.4), so that `props.ts`'s geometry and kit
 * binding belong to Lane BODIES and this file's paint belongs to Lane LOOK. The
 * seam between the two is four names: {@link PropLook} (a kind's material
 * numbers), {@link PROP_LOOK} (the presets a kind picks from), {@link
 * makePropMaterial} (a kind's material, built once) and {@link applyPropLook}
 * (the look, written at COMMIT). `props.ts` says which preset each kind wears; it
 * never writes a uniform.
 *
 * Three properties, the figure material's own (`figureMaterial.ts`):
 *
 *  - **One program.** Every kind is built from this one source with its own
 *    uniforms, so three compiles one program for the whole field (primed at mount,
 *    `PropField.setPrimeVisible`). `side` and `blending` are part of three's
 *    program key only through their defines, and every kind is `DoubleSide`.
 *  - **No clock.** The scanlines are a function of the prop's own y and the
 *    halftone a function of the fragment's screen position; nothing here reads
 *    time, so nothing here can keep `frameloop='demand'` awake.
 *  - **Two looks, one number.** `uLook` 0 draws the D53 hologram (a view-space
 *    fresnel, unlit), 1 the comic look (D120): the same three bands, key light,
 *    halftone and specular dot as the figures, so a coat and the body under it are
 *    painted in one hand. A kind that EMITS — additive, or a `glow`, `glass` or
 *    `membrane` preset (a muzzle, a laser eye, a visor, the gauntlets, the helmet
 *    glass, the wings) — stays a light under both looks, because a light is not
 *    paint (`PropLook.paint`).
 */

import * as THREE from 'three';

import { COMIC_FRAGMENT_GLSL, COMIC_UNIFORMS, COMIC_VERTEX_GLSL } from './figureMaterial.ts';
import type { MaterialLook } from '../look.ts';

/** A kind's material numbers: every one is a uniform, so every kind is the same program. */
export interface PropLook {
  core: number;
  rim: number;
  rimBoost: number;
  rimLift: number;
  alpha: number;
  alphaRim: number;
  glow: number;
  scan: number;
  depthWrite: boolean;
  /**
   * Whether the comic look PAINTS this kind (cel bands, halftone, specular) or
   * leaves it a light. An additive kind is never painted, whatever this says.
   */
  paint: boolean;
}

const BODY: PropLook = { core: 0.55, rim: 2.1, rimBoost: 1.7, rimLift: 0, alpha: 0.38, alphaRim: 0.85, glow: 1, scan: 1, depthWrite: true, paint: true };
const SOLID: PropLook = { core: 0.8, rim: 2, rimBoost: 1.1, rimLift: 0.35, alpha: 0.66, alphaRim: 0.45, glow: 1, scan: 0.5, depthWrite: true, paint: true };
const DARK: PropLook = { core: 1, rim: 2.5, rimBoost: 0.5, rimLift: 0.25, alpha: 0.92, alphaRim: 0.08, glow: 1, scan: 0, depthWrite: true, paint: true };
const GLASS: PropLook = { core: 0.4, rim: 1.8, rimBoost: 1.5, rimLift: 0.4, alpha: 0.2, alphaRim: 0.85, glow: 1, scan: 0, depthWrite: false, paint: false };
const MEMBRANE: PropLook = { core: 0.95, rim: 1.6, rimBoost: 1.1, rimLift: 0.3, alpha: 0.46, alphaRim: 0.45, glow: 1, scan: 0, depthWrite: false, paint: false };
/**
 * A garment that reads as its own colour: Fury's black coat, the Biochemist's
 * white one. Nearly opaque, and rim-lit only at its SILHOUETTE (a steep fresnel,
 * power 3) — the second verification pass found a soft 0.6 rim lift turning
 * Fury's black coat into a pale grey bell from the table view's steep camera,
 * where most of a flared coat is at a grazing angle; with no rim at all it was a
 * black shape on a black table. Its shape is drawn by that edge and its trim.
 */
const CLOTH: PropLook = { core: 1, rim: 3, rimBoost: 0.9, rimLift: 0.45, alpha: 0.93, alphaRim: 0.07, glow: 1, scan: 0.15, depthWrite: true, paint: true };
/** A small hard object that has to read at table distance: the pistol. */
const METAL: PropLook = { core: 0.9, rim: 1.5, rimBoost: 1.3, rimLift: 0.55, alpha: 0.9, alphaRim: 0.1, glow: 1, scan: 0, depthWrite: true, paint: true };
/**
 * A lit emblem — gold, not blown out to white. Normal blend since the
 * verification pass: additive gold over a navy body summed to white.
 */
const BADGE: PropLook = { core: 1, rim: 2, rimBoost: 0.35, rimLift: 0.15, alpha: 0.95, alphaRim: 0.05, glow: 1, scan: 0, depthWrite: true, paint: true };
/** Cloth that has to read as a colour, not a sheen: the shirt-front and tie, the hat. */
const FABRIC: PropLook = { core: 0.95, rim: 2, rimBoost: 0.55, rimLift: 0.35, alpha: 0.94, alphaRim: 0.06, glow: 1, scan: 0, depthWrite: true, paint: true };
/** The carrier: the body look, a little more solid, so it reads against the dark table from above. */
const HULL: PropLook = { core: 0.72, rim: 2, rimBoost: 1.6, rimLift: 0.2, alpha: 0.55, alphaRim: 0.7, glow: 1, scan: 0.6, depthWrite: true, paint: true };
const EMBLEM: PropLook = { core: 0.95, rim: 2, rimBoost: 0.5, rimLift: 0.2, alpha: 0.82, alphaRim: 0.15, glow: 1, scan: 0, depthWrite: true, paint: true };
const GLOW: PropLook = { core: 1, rim: 2, rimBoost: 0.6, rimLift: 0.3, alpha: 0.9, alphaRim: 0.1, glow: 1.5, scan: 0, depthWrite: false, paint: false };

/**
 * **The presets a kind picks from** — `scene/props.ts`'s `LOOKS` table names one
 * per kind. A new kind picks an existing preset; a new preset is a Lane LOOK
 * change (a row here, with a reason).
 */
export const PROP_LOOK = Object.freeze({
  body: BODY,
  solid: SOLID,
  dark: DARK,
  glass: GLASS,
  membrane: MEMBRANE,
  cloth: CLOTH,
  metal: METAL,
  badge: BADGE,
  fabric: FABRIC,
  hull: HULL,
  emblem: EMBLEM,
  glow: GLOW,
});

const VERTEX = /* glsl */ `
  #include <common>
  #include <color_pars_vertex>
  attribute float aOpacity;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying float vOpacity;
  varying vec3 vKey;

  void main() {
    #include <color_vertex>
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vViewNormal = normalize( transformedNormal );
    vViewDir = normalize( -mvPosition.xyz );
    vLocalY = transformed.y;
    vOpacity = aOpacity;
    vKey = comicKeyOf( viewMatrix );
  }
`;

const FRAGMENT = /* glsl */ `
  #include <color_pars_fragment>
  uniform float uCore;
  uniform float uRim;
  uniform float uRimBoost;
  uniform float uRimLift;
  uniform float uAlpha;
  uniform float uAlphaRim;
  uniform float uGlow;
  uniform float uScan;
  uniform float uLook;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying float vOpacity;
  varying vec3 vKey;

  void main() {
    vec3 viewDir = normalize( vViewDir );
    vec3 n = normalize( vViewNormal );
    float facing = abs( dot( n, viewDir ) );
    float fresnel = pow( 1.0 - facing, uRim );
    // A function of the prop's own y, never of time (the hologram's rule).
    float scan = 1.0 - uScan * step( 0.5, fract( vLocalY * 30.0 ) ) * 0.3;
    // three 0.186 declares vColor as a vec4 (vertex colour times instance colour).
    vec3 base = vColor.rgb;
    vec3 rimColour = mix( base, vec3( 1.0 ), uRimLift );
    vec3 colour = ( base * uCore + rimColour * fresnel * uRimBoost ) * scan * uGlow;
    float alpha = clamp( vOpacity * ( uAlpha + fresnel * uAlphaRim ), 0.0, 1.0 );

    if ( uLook > 0.0 ) {
      // **The comic look** (D120): the figures' bands, key light, halftone and
      // specular dot, so a coat and the body under it are painted in one hand. A
      // double-sided sheet's back face turns its normal to the lens first. No rim:
      // a prop's colour is its own, and the ink pass draws its edge.
      n = gl_FrontFacing ? n : -n;
      float lit;
      vec3 comic = comicShade( comicPaint( base ), n, viewDir, normalize( vKey ), lit );
      colour = mix( colour, comic, uLook );
      alpha = mix( alpha, clamp( vOpacity * max( uAlpha, 0.85 ), 0.0, 1.0 ), uLook );
    }
    gl_FragColor = vec4( colour, alpha );
    #include <colorspace_fragment>
  }
`;

/** Every uniform a prop material carries: its preset's numbers, the look, and the comic block (shared). */
export type PropMaterial = THREE.ShaderMaterial & {
  uniforms: Record<'uCore' | 'uRim' | 'uRimBoost' | 'uRimLift' | 'uAlpha' | 'uAlphaRim' | 'uGlow' | 'uScan' | 'uLook', { value: number }>;
  userData: { painted: boolean };
};

/**
 * **A kind's material**, built once per kind. `additive` is the kit's blend
 * (`figures/props.ts`'s `PROP_KIT[kind].blend`); an additive kind writes no depth
 * and is never painted. The comic block's uniforms are the SAME objects every
 * figure and prop material holds (`figureMaterial.ts`'s `COMIC_UNIFORMS`), so
 * one write at commit reaches them all.
 */
export function makePropMaterial(look: PropLook, additive: boolean): PropMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: COMIC_VERTEX_GLSL + VERTEX,
    fragmentShader: COMIC_FRAGMENT_GLSL + FRAGMENT,
    uniforms: {
      uCore: { value: look.core },
      uRim: { value: look.rim },
      uRimBoost: { value: look.rimBoost },
      uRimLift: { value: look.rimLift },
      uAlpha: { value: look.alpha },
      uAlphaRim: { value: look.alphaRim },
      uGlow: { value: look.glow },
      uScan: { value: look.scan },
      uLook: { value: 0 },
      ...COMIC_UNIFORMS,
    },
    vertexColors: true,
    transparent: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: look.depthWrite && !additive,
    // DoubleSide for EVERY kind: `side` is part of the program key, and one
    // program for the whole field is the point. A wing is a single sheet anyway.
    side: THREE.DoubleSide,
    toneMapped: false,
  }) as PropMaterial;
  material.userData.painted = look.paint && !additive;
  return material;
}

/**
 * **The look, at COMMIT** (`FigureLayer`'s layout effect through
 * `PropField.setLook`, never the frame loop): a painted kind takes the look's
 * number, a light keeps 0 — the hologram's own unlit glow under both looks.
 */
export function applyPropLook(material: PropMaterial, look: MaterialLook): void {
  material.uniforms.uLook.value = material.userData.painted ? look.look : 0;
}
