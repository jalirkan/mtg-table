/*
 * mtg-table — arena/StatsOverlay.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **`?stats=1`'s frame-rate panel, in a chunk of its own** (the GPU pass, D272).
 * drei's `<Stats>` carries `stats.js`; it is a debugging aid behind a URL flag, so
 * `Arena.tsx` reaches it only through `lazy(() => import(...))`, as it reaches the
 * composer (D61): a table nobody is measuring never downloads it.
 */

export { Stats as StatsOverlay } from '@react-three/drei';
