// mtg-table — the cube lab: which AI style plays each drafter's deck (D347).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A seat spec is `<Profile>[+outlets|+shadow][+search[:k=v,...]]` -- a Forge AI
// profile (an .ai file: Default, Cautious, Reckless, Experimental), D310's outlet
// policy and D312's search (mtgtable.ai.SeatSpec reads the same grammar).
// `--profiles A,B` gives every draft the same two seats, as before.
// `--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25` instead draws EACH
// drafter's seat for each draft from the mix, independently, with a generator
// seeded from the draft's seed and its own stream name: so the draw is a pure
// function of the seed (D294's rule -- any --jobs, any machine, a resumed run),
// and it never touches the draft's own random stream (the picks and decks are
// what they would be without the mix).  The recordings' headers name every
// seat's profile and policy (`seats`), and drafts.jsonl each draft's `profiles`,
// so a dataset can stratify or filter by style.  Inside a mix a search spec
// separates its knobs with "/" (`Default+search:ms=1000/turns=0:0.25`), since
// "," separates the mix's entries.

import { rng } from './rng.ts';

export interface MixEntry { spec: string; weight: number }

const SPEC = /^[A-Za-z][A-Za-z0-9_-]*(\+(outlets|shadow|search(:[a-z]+=[0-9a-z]+(,[a-z]+=[0-9a-z]+)*)?))*$/;

/** A seat spec is well formed (its profile is checked against the .ai files by `checkProfiles`). */
export function isSeatSpec(s: string): boolean {
  return SPEC.test(s);
}

/** `Default:0.5,Reckless:0.25,Default+search:0.25` -> entries with weights summing to 1. Throws on a bad mix. */
export function parseProfileMix(text: string): MixEntry[] {
  const out: MixEntry[] = [];
  for (const part of text.split(',').map((p) => p.trim()).filter(Boolean)) {
    // the weight follows the LAST colon: a search spec may hold its own "search:k=v"
    const at = part.lastIndexOf(':');
    // inside a mix, a search spec's knobs are separated by "/" (the mix itself uses ","): ms=1000/turns=0
    const spec = (at > 0 ? part.slice(0, at) : part).replace(/\//g, ',');
    const w = at > 0 ? Number(part.slice(at + 1)) : NaN;
    if (!isSeatSpec(spec)) throw new Error(`--profile-mix: "${spec}" is not a seat spec (<Profile>[+outlets][+search[:k=v]])`);
    if (!Number.isFinite(w) || w <= 0) throw new Error(`--profile-mix: "${part}" wants a positive weight after the last colon, e.g. Reckless:0.25`);
    if (out.some((e) => e.spec === spec)) throw new Error(`--profile-mix: ${spec} twice`);
    out.push({ spec, weight: w });
  }
  if (out.length === 0) throw new Error('--profile-mix is empty');
  const sum = out.reduce((s, e) => s + e.weight, 0);
  return out.map((e) => ({ spec: e.spec, weight: e.weight / sum }));
}

/** The mix as written back into run.json (normalised weights, 6 decimals). */
export function mixText(mix: MixEntry[]): string {
  return mix.map((e) => `${e.spec.replace(/,/g, '/')}:${Number(e.weight.toFixed(6))}`).join(',');
}

/** Drafter A's and B's seats for the draft at `seed`: a pure function of the mix and the seed. */
export function pickProfiles(mix: MixEntry[], seed: number): [string, string] {
  const r = rng(seed, 'profile-mix');
  const one = (): string => {
    const x = r.next();
    let acc = 0;
    for (const e of mix) {
      acc += e.weight;
      if (x < acc) return e.spec;
    }
    return (mix[mix.length - 1] as MixEntry).spec;
  };
  const a = one();
  return [a, one()];
}

/** Every profile a spec names exists as an .ai file under `aiDir` (when that directory is there). */
export function checkProfiles(specs: string[], aiNames: string[] | null): void {
  if (!aiNames) return;
  const known = new Set(aiNames);
  for (const s of specs) {
    const p = s.split('+')[0] as string;
    if (!known.has(p)) throw new Error(`AI profile "${p}" (in ${s}) is not one of ${aiNames.join(', ')}`);
  }
}
