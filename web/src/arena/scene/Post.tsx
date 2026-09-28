/*
 * mtg-table — arena/scene/Post.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Bloom, and nothing else** (report 13 §8; **user decision 6**: bloom via
 * `@react-three/postprocessing` 2.19.1 — the React-18 line — "allowed and default
 * ON if the bench stays within budget on this machine, else default off with a
 * toggle").
 *
 * ---------------------------------------------------------------------------
 * **Why this is the one post pass the arena gets, and why it is not "rendering the
 * scene twice".**
 *
 * Report 09 §9.2 rule 3 forbids a second *scene* pass — a reflection probe, drei's
 * `ContactShadows`, a second camera — because the arena is **fill-rate bound** and
 * drawing the table again doubles the bill. Bloom is not that: the scene is
 * rendered **once**, into a render target, and the bloom pass then works on a
 * downsampled copy of the result. The cost is a fixed number of full-screen
 * fragment passes at a fraction of the resolution, independent of how many cards
 * are on the table — which is why it is affordable at all on a scene of 40 quads,
 * and why its price has to be *measured* rather than argued (see
 * `docs/evidence/m7-tier2.md`, T7: p95 1.1 ms on this machine's GTX 1080, p95
 * 82 ms under SwiftShader).
 *
 * **Whether it is on is `perf.ts`'s `BLOOM_DEFAULT`** — ON, because the GTX 1080
 * bench stays inside §9.4's gate — and `?bloom=1` / `?bloom=0` plus the checkbox
 * in the cue controls are the hand control either way. `main.tsx` reads the flag;
 * nothing in this file reads a URL.
 *
 * **Three settings are deliberate, and each one is a cost avoided:**
 *
 *  - `multisampling={0}`: the composer renders to its own target, so the canvas's
 *    own MSAA does not apply to it and the composer's default of 8 samples would
 *    be a full-resolution multisampled target on a software rasteriser. The arena
 *    is a scene of large flat quads whose edges are mostly card art; the dpr
 *    governor is the control that matters here, not sample count.
 *  - `enableNormalPass={false}`: nothing here wants normals (no SSAO, no outline).
 *    (2.19.1 renamed drei's older `disableNormalPass`; the installed `.d.ts` is the
 *    authority and `npm run build` is what caught the old spelling.)
 *  - `luminanceThreshold` above the table's own brightness, so **bloom is a
 *    property of the additive layer** — the glows, rings, motes, tethers, halos and
 *    holographic rims — and not a wash over the card art. Scryfall's paintings are
 *    already lit; blooming them is the same mistake as lighting them (§8.3 rule 2).
 * ---------------------------------------------------------------------------
 */

import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { BlendFunction, Effect, EffectAttribute, KernelSize } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { COMIC } from '../look.ts';

/*
 * The default is `perf.ts`'s {@link BLOOM_DEFAULT}, not a constant here: this whole
 * module — and the 16.6 kB gzip of `postprocessing` behind it — is **lazily
 * imported** (`Arena.tsx`), so a table with bloom off never downloads the composer
 * at all, exactly as the 2D board never downloads `three` (**D49**). Reading the
 * default from here would defeat that in one import.
 */

/**
 * The additive layer blooms; the cards do not.
 *
 * The threshold is above the table felt and above a card's own brightest paint, and
 * the arena's additive primitives (`effects.ts`, `discs.ts`, `overlays.ts`,
 * `casting.ts`, `busts.ts`) all draw well above it — which is what makes bloom read
 * as *the holographic layer glowing* rather than as a soft-focus filter.
 */
const THRESHOLD = 0.62;
const SMOOTHING = 0.22;
const INTENSITY = 0.9;

// ---------------------------------------------------------------------------
// **The art-direction spike's ink pass** (report 15 §3.4, option B): one more
// EFFECT, not one more pass. `postprocessing` merges every non-convolution effect
// in a composer into ONE full-screen `EffectPass`, so with bloom on the ink costs
// a few depth reads per pixel inside the pass bloom already pays for; with bloom
// off it is the composer plus that one pass. It reads the DEPTH buffer the scene
// render already wrote — no normal pass, no second render of the scene (report 09
// §9.2 rule 3 stands) — and inks every pixel where the depth surface BENDS: the
// Laplacian of 1/z, which is exactly zero on any plane (1/z is affine in screen
// space), so the table, the cards and the land slabs get no line and every figure,
// prop and carrier gets one at its silhouette and its deep creases.
// ---------------------------------------------------------------------------

const INK_FRAGMENT = /* glsl */ `
  uniform vec3 uInk;
  uniform float uWidth;
  uniform float uThreshold;

  float invZ( const in vec2 uv ) {
    return 1.0 / max( 1e-4, -getViewZ( readDepth( uv ) ) );
  }

  void mainImage( const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor ) {
    vec2 px = texelSize * uWidth;
    float c = 1.0 / max( 1e-4, -getViewZ( depth ) );
    float l = invZ( uv - vec2( px.x, 0.0 ) );
    float r = invZ( uv + vec2( px.x, 0.0 ) );
    float d = invZ( uv - vec2( 0.0, px.y ) );
    float u = invZ( uv + vec2( 0.0, px.y ) );
    // Relative, so a line is the same weight near the lens and across the table.
    float bend = abs( l + r + u + d - 4.0 * c ) / c;
    float ink = smoothstep( uThreshold, uThreshold * 2.5, bend );
    outputColor = vec4( mix( inputColor.rgb, uInk, ink ), inputColor.a );
  }
`;

/** The ink edge effect. Built once per composer; every number is a uniform. */
export class InkEffect extends Effect {
  constructor() {
    super('InkEffect', INK_FRAGMENT, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['uInk', new THREE.Uniform(new THREE.Color(COMIC.ink))],
        ['uWidth', new THREE.Uniform(COMIC.inkPx)],
        ['uThreshold', new THREE.Uniform(0.012)],
      ]),
    });
  }
}

export function Post({
  onMount,
  bloom = true,
  ink = false,
}: {
  onMount?: () => void;
  /** Bloom, as before (user decision 6). */
  bloom?: boolean;
  /** Spike (report 15 §3.4): the depth-edge ink pass. */
  ink?: boolean;
}): JSX.Element {
  // Built once; it holds no render target or texture of its own to dispose.
  const inkEffect = useMemo(() => new InkEffect(), []);
  // Under `frameloop='demand'` mounting or unmounting the composer is a change
  // React makes and the frame loop does not see: without a repaint the toggle
  // would take effect on the next cue rather than when it is clicked.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // The composer draws the scene into its own render target, which needs its
    // own program variants: `onMount` asks the frame loop to warm them now.
    onMount?.();
    invalidate();
    return () => {
      invalidate();
    };
  }, [invalidate, onMount]);
  // The children array is rebuilt only when a switch changes: the composer
  // re-derives its passes whenever `children` changes identity.
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {ink ? <primitive object={inkEffect} /> : <></>}
      {bloom ? (
        <Bloom
          intensity={INTENSITY}
          luminanceThreshold={THRESHOLD}
          luminanceSmoothing={SMOOTHING}
          // MEDIUM rather than LARGE: the kernel is the cost, and a table read from
          // 9 units away does not need a 9-tap halo.
          kernelSize={KernelSize.MEDIUM}
          mipmapBlur
          blendFunction={BlendFunction.SCREEN}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
}
