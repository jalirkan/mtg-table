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
import { BlendFunction, KernelSize } from 'postprocessing';
import { useEffect } from 'react';

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

export function Post({ onMount }: { onMount?: () => void }): JSX.Element {
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
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
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
    </EffectComposer>
  );
}
