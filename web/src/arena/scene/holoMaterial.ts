/*
 * mtg-table — arena/scene/holoMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Moved to `figureMaterial.ts`** by Lane LOOK (report 15 §9.1): the figure
 * material draws two looks, and the hologram is one of them. This re-export is
 * kept for ONE release so a branch cut before the move still compiles; the next
 * lane deletes it.
 */

export * from './figureMaterial.ts';
