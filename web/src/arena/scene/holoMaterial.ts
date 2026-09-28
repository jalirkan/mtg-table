/*
 * mtg-table — arena/scene/holoMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Moved to `figureMaterial.ts`** by Lane LOOK (report 15 §9.1, D120): the
 * figure material draws two looks, and the hologram is one of them. This
 * re-export is kept for ONE release so a branch cut before the move still
 * compiles (`makeHoloMaterial`, `HoloMaterial` and `HoloUniforms` are aliases
 * there); it holds no shader of its own (`liveness.test.ts`), and the next lane
 * deletes it together with `scene/models.ts`'s one import of it.
 */

export * from './figureMaterial.ts';
