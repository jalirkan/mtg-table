/*
 * mtg-table — arena/scene/personalModels.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier's two loads** (phase 2, **D195**; the tier is **D190**):
 * the dev route's index, read once a page through `arena/personal.ts`'s one
 * reader, and each personal model a face-up card or a seat wants, through
 * `scene/models.ts`'s loader (three's `GLTFLoader` and `MeshoptDecoder` — never
 * drei's `useGLTF`).
 *
 * **Development only, and that is mechanical.** Both addresses are built behind
 * `import.meta.env.DEV`, which a production build replaces with `false`: the
 * route's name never reaches a built chunk, a built page asks for nothing, and
 * the overlay is empty — the CC0 figures draw, exactly as a checkout with no
 * `personal/` folder draws them (`personal.test.ts` greps the build). A load that
 * fails, a 404, a model the index withheld: each is a supported state, and the
 * CC0 figure stands.
 *
 * Neither is a poll: each address is asked once per page (a module-level cache),
 * the index when the arena or the workshop mounts and a model the first time a
 * card or a seat wants it.
 */

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

import type { Seat } from '../layout.ts';
import { EMPTY_PERSONAL, personalOverlayOf, type PersonalEntry, type PersonalFit, type PersonalOverlay } from '../personal.ts';
import { loadPersonalModel, type LoadedModel, type PersonalModelSet } from './models.ts';

/** The index's address — DEV only: in a build this is `null` and the string is not in the chunk. */
const INDEX_URL: string | null = import.meta.env.DEV ? 'personal/index.json' : null;

let overlayPromise: Promise<PersonalOverlay> | null = null;
let overlayResolved: PersonalOverlay | null = null;

function loadOverlay(): Promise<PersonalOverlay> {
  if (INDEX_URL === null) return Promise.resolve(EMPTY_PERSONAL);
  overlayPromise ??= new Promise<PersonalOverlay>((resolve) => {
    new THREE.FileLoader().setResponseType('json').load(
      INDEX_URL,
      (data) => {
        resolve(personalOverlayOf(data));
      },
      undefined,
      () => {
        // No route (MTG_TABLE_PERSONAL=off), no folder, a 404: the CC0 figures stand.
        resolve(EMPTY_PERSONAL);
      },
    );
  }).then((overlay) => {
    overlayResolved = overlay;
    if (overlay.skipped.length > 0) console.info(`[arena] personal tier: ${overlay.skipped.join('; ')}`);
    return overlay;
  });
  return overlayPromise;
}

/**
 * **The overlay** — empty until the index has loaded, forever in a build, and
 * whenever `enabled` is false (the workshop's personal/repo toggle, `?personal=0`).
 */
export function usePersonalOverlay(enabled = true): PersonalOverlay {
  const [overlay, setOverlay] = useState<PersonalOverlay>(() => overlayResolved ?? EMPTY_PERSONAL);
  useEffect(() => {
    if (!enabled || INDEX_URL === null) return;
    let live = true;
    void loadOverlay().then((loaded) => {
      if (live) setOverlay(loaded);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return enabled ? overlay : EMPTY_PERSONAL;
}

/** What has loaded: every model and variant by id (`p0`, `p0@folded`), each model's fit, and the seats' bodies. */
export interface PersonalLoaded {
  models: ReadonlyMap<string, LoadedModel>;
  fits: ReadonlyMap<string, PersonalFit>;
  seats: ReadonlyMap<Seat, LoadedModel>;
}

export const NO_PERSONAL_LOADED: PersonalLoaded = Object.freeze({
  models: new Map<string, LoadedModel>(),
  fits: new Map<string, PersonalFit>(),
  seats: new Map<Seat, LoadedModel>(),
});

/**
 * **Load what is wanted** — the models the cards on the table have chosen
 * (`personalChoicesOf`) and the seats' — and hand back what has loaded. A new
 * map arrives only when a model does, so the poses recompute once per arrival.
 */
export function usePersonalModels(overlay: PersonalOverlay, choices: ReadonlyMap<number, PersonalEntry>, seats = true): PersonalLoaded {
  const wanted = useMemo(() => {
    const byId = new Map<string, PersonalEntry>();
    for (const entry of choices.values()) byId.set(entry.id, entry);
    // The seats' models, where there are duelists (the arena; not the workshop's pedestal).
    if (seats) for (const entry of overlay.seats.values()) byId.set(entry.id, entry);
    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }, [overlay, choices, seats]);
  const wantedKey = wanted.map((e) => `${e.id}|${e.url}`).join(',');
  const [sets, setSets] = useState<ReadonlyMap<string, PersonalModelSet>>(() => new Map());
  useEffect(() => {
    let live = true;
    for (const entry of wanted) {
      if (sets.has(entry.id)) continue;
      loadPersonalModel(entry.url, entry.id)
        .then((set) => {
          if (!live) return;
          setSets((previous) => {
            if (previous.has(entry.id)) return previous;
            const next = new Map(previous);
            next.set(entry.id, set);
            return next;
          });
        })
        .catch((error: unknown) => {
          console.info(`[arena] personal tier: a model did not load (${String(error)}) — its CC0 figure stands`);
        });
    }
    return () => {
      live = false;
    };
    // `wantedKey` is `wanted`, as a string React can compare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);
  return useMemo(() => {
    if (sets.size === 0) return NO_PERSONAL_LOADED;
    const models = new Map<string, LoadedModel>();
    const fits = new Map<string, PersonalFit>();
    for (const [id, set] of sets) {
      for (const [key, model] of set.models) models.set(key, model);
      fits.set(id, { ratio: set.ratio });
    }
    const bySeat = new Map<Seat, LoadedModel>();
    if (seats) {
      for (const [seat, entry] of overlay.seats) {
        const model = models.get(entry.id);
        if (model !== undefined) bySeat.set(seat, model);
      }
    }
    return { models, fits, seats: bySeat };
  }, [sets, overlay, seats]);
}
