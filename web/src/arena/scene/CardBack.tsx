/*
 * mtg-table — arena/scene/CardBack.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The card back, as a **texture** rather than as a component.
 *
 * Report 09 §2.4 lists a `CardBack` in `scene/`, and this is it — but it mounts
 * nothing. The arena has exactly **one** card renderer, `CardPlane.tsx`, which
 * is the 3D half of CLAUDE.md's M4 convention 2 ("`CardTile` is THE card
 * renderer", imported by exactly ten files): a second component that puts a quad
 * on the table is how a surface that has not learned about `hidden` appears.
 * So the back is a hook that hands `CardPlane` a texture, and the branch that
 * chooses it lives in the one place a reviewer has to read.
 *
 * The image itself is drawn, never scanned — see `textFrame.ts`.
 */

import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type * as THREE from 'three';

import { cardBackTexture } from './textFrame.ts';

/** The shared procedural card back. One canvas for the whole page. */
export function useCardBackTexture(): THREE.Texture | null {
  const gl = useThree((s) => s.gl);
  return useMemo(() => cardBackTexture(gl), [gl]);
}
