/*
 * mtg-table — workshop/validated.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **`Arena.tsx`'s `useFigureData` / `useCueData`, as three pure functions** — the
 * arena's own validators in the arena's own order, over whatever JSON they are
 * handed. `data.ts` hands them the committed files; the tuning panel hands them
 * patched copies; `node --test` hands them both.
 *
 * `[NO three]`, `[NO React]`, and no JSON import of its own.
 */

import { REGISTRY } from '../arena/cues/registry.ts';
import { EMPTY_CUE_DATA, type CueData, type Problem } from '../arena/cues/types.ts';
import { mergeCueData, validateCues } from '../arena/cues/validate.ts';
import {
  EMPTY_FIGURE_DATA,
  EMPTY_MODEL_DATA,
  type FigureData,
  type ModelData,
} from '../arena/figures/types.ts';
import { validateFigures, validateModels } from '../arena/figures/validate.ts';

export function modelDataOf(raw: unknown): ModelData {
  return { ...EMPTY_MODEL_DATA, ...validateModels(raw).data };
}

/** `figures.json` validated against the model ids, as `Arena.tsx` does it. */
export function figureDataOf(raw: unknown, models: ModelData): FigureData {
  return {
    ...EMPTY_FIGURE_DATA,
    ...validateFigures(raw, { modelIds: new Set(Object.keys(models.models)) }).data,
  };
}

/**
 * A cue file (the committed one, or the tuning panel's patched copy) validated
 * against the registry and merged onto the empty table — `Arena.tsx`'s `useCueData`.
 */
export function cueDataOf(raw: unknown): { data: CueData; errors: Problem[] } {
  const { data, errors } = validateCues(raw, { cueIds: new Set(REGISTRY.keys()) });
  return { data: mergeCueData(EMPTY_CUE_DATA, data), errors };
}
