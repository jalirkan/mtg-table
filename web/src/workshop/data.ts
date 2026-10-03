/*
 * mtg-table — workshop/data.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's data files, validated exactly as `Arena.tsx` validates them** —
 * once, at import, with the arena's own validators — so the workshop previews the
 * same `FigureData`, `ModelData` and `CueData` a game does.
 *
 * `Arena.tsx`'s `useFigureData` / `useCueData` are hooks inside the arena's one
 * component file and are not exported, so the few lines are repeated here (the
 * pure half is `validated.ts`, which `node --test` drives): the same
 * `validateModels` → `validateFigures` (cross-checked against the model ids) →
 * `validateCues` → `mergeCueData`, in the same order. `traits.json` needs no line
 * here: its validated table is `figures/traits.ts`'s exported `TRAITS`.
 *
 * **The three JSON imports are spelled as `Arena.tsx` spells them** — with no
 * import attributes — because the bundler warns when one module is imported two
 * ways, and this file is only ever bundled (the tests import the JSON themselves,
 * with the attributes Node needs, and call `validated.ts`).
 */

import cuesJson from '../arena/cues/cues.json';
import type { CueData } from '../arena/cues/types.ts';
import figuresJson from '../arena/figures/figures.json';
import modelsJson from '../arena/figures/models.json';
import type { FigureData, ModelData } from '../arena/figures/types.ts';
import { cueDataOf, figureDataOf, modelDataOf } from './validated.ts';

/** `models.json`, validated. */
export const MODEL_DATA: ModelData = modelDataOf(modelsJson);

/** `figures.json`, validated against the model ids — `Arena.tsx`'s `useFigureData`. */
export const FIGURE_DATA: FigureData = figureDataOf(figuresJson, MODEL_DATA);

/** The raw cue file, for the tuning panel's patched copies. */
export const CUES_RAW: unknown = cuesJson;

/** `cues.json`, validated — what a game plays. */
export const CUE_DATA: CueData = cueDataOf(cuesJson).data;
