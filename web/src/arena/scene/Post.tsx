/*
 * mtg-table — arena/scene/Post.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Bloom, and the ink line that rides it** (report 13 §8; **user decision 6**:
 * bloom via `@react-three/postprocessing` 2.19.1 — the React-18 line — "allowed
 * and default ON if the bench stays within budget on this machine, else default
 * off with a toggle"; Lane LOOK's **D122**: the comic look's ink is a depth-edge
 * EFFECT merged into bloom's own `EffectPass`, not a second pass).
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
 *  - `enableNormalPass={false}`: nothing here wants normals (no SSAO; the ink
 *    line reads DEPTH, which the scene render writes anyway).
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
import { memo, useEffect, useLayoutEffect, useMemo } from 'react';
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
// **The ink line** (Lane LOOK, **D122**, report 15 §3.4's option B): one more
// EFFECT, not one more pass. `postprocessing` merges every non-convolution effect
// in a composer into ONE full-screen `EffectPass`, so with bloom on (D61's
// default) the ink costs a few depth reads per pixel inside the pass bloom already
// pays for — **+0 draw calls, +0 triangles** at `g1`@355; with bloom off it is
// the composer plus that one pass. It reads the DEPTH buffer the scene render
// already wrote — no normal pass, no second render of the scene (report 09 §9.2
// rule 3 stands) — and inks every pixel where the depth surface BENDS: the
// Laplacian of 1/z, which is exactly zero on any plane (1/z is affine in screen
// space), so the table, the cards and the land slabs get no line and every figure,
// prop and carrier gets one at its silhouette and its deep creases.
//
// **Resolution-independent** (report 15 §9.1 item 3): the sample distance is
// `COMIC.inkCssPx` CSS pixels, i.e. × the render dpr in the render target's own
// texels, written when the dpr changes. A finite difference over a fixed CSS
// distance measures the same bend at every rung of the DPR ladder, so the
// relative threshold — and the line's weight on screen — hold from 0.6 to 1.5
// (measured, `docs/evidence/look.md`). The inverted hull the spike also built is
// deleted (D122): +16 draw calls and +20,000 triangles at `g1`@355, over both of
// §8.2's lines, and the weaker line besides.
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

/** The sample distance in the render target's texels, for a render dpr — never under one texel. */
export function inkWidthFor(dpr: number): number {
  return Math.max(1, COMIC.inkCssPx * dpr);
}

/** The ink edge effect. Built once per composer; every number is a uniform, and each is `look.ts`'s. */
export class InkEffect extends Effect {
  constructor() {
    super('InkEffect', INK_FRAGMENT, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['uInk', new THREE.Uniform(new THREE.Color(COMIC.ink))],
        ['uWidth', new THREE.Uniform(inkWidthFor(1))],
        ['uThreshold', new THREE.Uniform(COMIC.inkThreshold)],
      ]),
    });
  }

  /** The render dpr changed (the governor's ladder): the sample distance follows. Commit time only. */
  setDpr(dpr: number): void {
    const width = this.uniforms.get('uWidth');
    if (width !== undefined) width.value = inkWidthFor(dpr);
  }
}

/**
 * **The composer, and one rule about it** (Lane LOOK's bench): `EffectComposer`
 * rebuilds every pass — `new EffectPass(…)` — whenever its `children` change
 * IDENTITY (`@react-three/postprocessing` 2.19.1, `EffectComposer.js`'s layout
 * effect), and a pass holding the ink's depth read re-derives its programs and
 * its depth texture when it is rebuilt. So the children are memoised on the two
 * switches, and the component itself is `memo`, so the arena's re-renders — every
 * snapshot, every loop-mode change — never reach it. Measured before the fix
 * (production build, GTX 1080, `g1`@316, three interleaved runs): p95 35.5–39.1
 * ms against the hologram's 8.5–10.3, with a program linked mid-run in every one
 * (33 → 34), and a CPU profile of 5 s of 4× playback spending 274 ms in
 * `getProgramInfoLog`, which a warm table never calls; `docs/evidence/look.md`.
 */
export const Post = memo(function Post({
  onMount,
  bloom = true,
  ink = false,
}: {
  onMount?: () => void;
  /** Bloom, as before (user decision 6). */
  bloom?: boolean;
  /** The comic look's depth-edge ink line (D122). */
  ink?: boolean;
}): JSX.Element {
  // Built once; it holds no render target or texture of its own to dispose.
  const inkEffect = useMemo(() => new InkEffect(), []);
  const dpr = useThree((s) => s.viewport.dpr);
  useLayoutEffect(() => {
    inkEffect.setDpr(dpr);
  }, [inkEffect, dpr]);
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
  // The children are rebuilt only when a switch changes: the composer re-derives
  // its passes whenever `children` changes identity (see above).
  const effects = useMemo(
    () => (
      <>
        {ink ? <primitive object={inkEffect} /> : null}
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
        ) : null}
      </>
    ),
    [ink, bloom, inkEffect],
  );
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
});
