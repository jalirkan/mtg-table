/*
 * mtg-table — arena/scene/colourCache.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **A parsed `THREE.Color` per colour string, for the frame loop** (report 09
 * §9.2 rule 6: no allocation in the hot path).
 *
 * `THREE.Color.set('#f6f0d8')` goes through `setStyle`, which runs two regular
 * expressions and allocates their match arrays — every call. The pose layers
 * (`discs.ts`, `overlays.ts`, `casting.ts`, `busts.ts`) each tint an instance per
 * frame from a string, so the obvious spelling parses the same handful of strings
 * sixty times a second. T2 solved the same problem for the figures' own tint with
 * `FigureRig.appliedTint`; this is the shared version for the instanced layers.
 *
 * The strings come from the app's colour table (`colour.ts`), `cues.json` and
 * `figures.json`, so the set is small and closed. The cap is a guard against a
 * future caller handing it something unbounded, not a working limit.
 */

import * as THREE from 'three';

const CACHE = new Map<string, THREE.Color>();
const CAP = 256;

/**
 * The parsed colour for `hex`. **Read-only** — copy it (`scratch.copy(...)`)
 * before multiplying, because every caller shares the one instance.
 */
export function parsedColour(hex: string): THREE.Color {
  let colour = CACHE.get(hex);
  if (colour === undefined) {
    if (CACHE.size >= CAP) CACHE.clear();
    colour = new THREE.Color(hex);
    CACHE.set(hex, colour);
  }
  return colour;
}
