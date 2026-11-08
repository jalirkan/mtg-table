## D524 — the move atlas's `--only <file>`: phase B branched at given decisions with given options, the baseline's listing checked first (exit 4 on a mismatch); off by default, byte for byte (extends D451, D480, D511)

*Branch `pc/atlas-only`, off main `45615036` (D519's merge). D524 was handed to this lane: D522 is held by the shelved
design branch `pc/d522-rollout-policy` and D523 by `pc/rollout-random`, so `node tools/decisions.mjs next` (which printed
D522, reading only the merged files) is lower than the number taken. Serves J200 (the PC jobs' draft
`J200-judge-the-judge.md`, its "lane" section). Touches `tools/cubelab/atlas.ts`, `atlascuts.ts` and `cli.ts`, a test file,
the cube-lab guide and this file; nothing under `bridge/src`, `tools/cubelab/CubeLab.java`, `forge-home/` or
`fixtures/cubelab/seat-identity.json` changes.*

**2026-11-08**

**Context.**

- **J200 asks one question of 82 judged decisions** (106 with the split ones as information): does the option two blind
  language-model judges agreed on, where it is not Forge's option 0, beat option 0 when Forge's AI plays both seats on
  (D451's Forge map, 40 branches an option, D498's redeal, D511's replay of the night's recorded game)? Each decision
  must be played for exactly two options (three for nine of the split ones), on the Forge map alone, with no random
  branch.
- **The atlas could not do that.** `tools/cubelab.sh atlas` chooses its decisions itself (`--decisions all|N`, spread
  by `pickDecisions`, with D480's `--min-options` and screen) and plays every listed option of each. The bridge already
  plays a subset — `Atlas.Unit.options` (D480's early-stopping survivors) makes the hook skip every other option, and
  `unitJob` forwards a unit's `options` — but nothing set it from a list. J200's draft rejected the two workarounds:
  `--decisions all --branch-random 0` plays every option of every listed decision (~30× the cost), and a hand-written
  `schedule.jsonl` can drop options only through a `stop` line at a random-map checkpoint, so every option would still
  play random branches, and it depends on the plan hash and a frozen file format.

**Decision.**

1. **`--only <file>`**: a JSON array of `{d, options, tokens?}`. `d` is an index into the baseline's listing; `options`
   two or more distinct option indices, **option 0 among them** (an addition to the draft's wording: the atlas's regret
   is against option 0, D480 never stops it, and every J200 entry has it); `tokens` the listing the caller expects at
   `d` (optional; J200 gives it everywhere). `parseOnly` (`atlascuts.ts`) refuses anything else and keeps the list
   normalised — entries by `d`, options ascending, keys in that order — with the sha256 of that JSON.
2. **What phase B plays.** Exactly the list's decisions, each a `pick` with `why: "only"` and its `options` in
   `phaseB/schedule.jsonl`; every unit of a decision carries its sorted options (also when they are all of its options),
   which is the job's `atlas.options` and the bridge's `Atlas.Unit.options`; on whichever maps `--branch-random` and
   `--branch-forge` ask for. `--branch-random 0` is a Forge map alone (the parser always took 0; the label now reads it).
   Nothing is decided after a pick: no barrier, no checkpoint, no replacement.
3. **The baseline is checked before any unit** (`checkOnly`): each `d` listed, each option below the listing's option
   count there, and the tokens, when given, the listing's token for token. Otherwise the atlas **exits 4**, one line a
   failing `d` naming both token lists, with no unit played, no `schedule.jsonl`, no atlas.json, and `baseline.json`
   kept for the caller to read the drift. This is D511's guarantee, checked: a unit's replay is the recorded game, so a
   baseline that lists other tokens at `d` is another game, and each unit's own `expect` check would fail it later,
   unit by unit, after the workers had booted.
4. **Refused, exit 2** (written, nothing created): beside `--decisions` (any value), `--screen` other than 0,
   `--early-stop` other than `off`, `--futility` other than `off`, `--min-options` other than 1 (`onlyClash`); a
   malformed or missing file; and both maps at 0. `checkCuts` refuses the same combinations again, for a caller that
   builds `Cuts` by hand. It is a measurement of given options, not a schedule.
5. **The record.** The list lives in `Cuts.only`, so plan.json carries it as `cuts.only` (its entries and sha256) and
   the schedule header's plan carries it under `cuts`; a resume under another list is refused twice over (plan.json's
   `cuts` key, the schedule's plan hash), and `--phase report` reads the folder's own list. With the flag absent
   neither key exists, so a schedule hashes as before (the test holds D480's `cuts` key for key).
6. **The label.** An option not given has `n` 0. Each map's regret and the agreement are over the given options (the
   decision's `only`, written in place of `forgeOptions`). With `--branch-random 0` under `--only` there is no random
   map: a decision is `complete` on its Forge map, `phaseB.randomMap` and `agreement.randomMap` are false, no agreement
   is read, atlas.md says so, and nothing divides by zero. The checks run unchanged.
7. **Without `--only` nothing changes, byte for byte.** Every new branch is guarded by `cuts.only`; `decisionAtlas`'s new
   `randomMap` argument defaults to true and is false only for an `--only` spine with no random branches (so a spine
   with `--branch-random 0` and no list reads exactly as before, never complete).

**Why atlas.ts may change between landings (D509).** D509's frozen paths are the seat — `bridge/src`, `CubeLab.java`,
the seat-identity golden, `forge-home/` and the engine — and D509 point 2 lets the cut design (`atlascuts.ts`), the
checks and the report land between landings. `atlas.ts` builds the unit jobs the frozen code plays, and J200's draft
treats it and `atlascuts.ts` as frozen, so the argument is written anyway: the flag is **opt-in**; the frozen
population's runs (the nights' `--decisions N --early-stop on --futility 0 …` spines) never pass it; with it absent
every unit job, schedule line, plan.json and atlas.json is what it was (Measured); the bridge's `Atlas.Unit.options`,
D480's hook, is untouched and is the only thing the flag drives; and J200 is a measurement that pools with no night.
No population boundary.

**Measured.**

- **Without `--only`, byte for byte (the proof).** `tools/cubelab.sh atlas-selftest --jobs 3` was run in this worktree
  on the untouched tree (`45615036`'s code; 12 min 46 s, OK) and again with the lane's code (18 min 0 s, OK), and the
  two `var/cubelab/atlas-selftest/` folders compared file by file over everything the first run wrote (429 files and
  rows folders, every leg: the main spine's phases A and B, the G5 and G6 legs, the three cuts legs with their
  schedules, and D511's replay leg on the s13 pair). 27 are identical in their bytes. The other 402 are identical once
  wall-clock fields are taken out (`ms`, `cpuMs`, `t`, `startedAt`, `bytes`, every `…Ms`, the frame-size means and
  `timing`; jsonl lines compared as sets, since workers finish in any order; each `rows/` folder read as one set, its
  files being named by the worker's pid) — `plan.json`, `schedule.jsonl` (header, plan hash and every event),
  `baseline.json`, `branches.jsonl`, `units.jsonl`, the rows, `atlas.json` and `atlas.md` among them — except 13 frame
  logs. Those 13 differ in how state frames were batched (the forwarder flushes on its 500 ms clock): the same seat
  decisions in the same order, the same final state and end, a state-frame count off by at most 2; and 10 of them are
  phase A games (the main spine's, the G5 and G6 legs), which run no line this lane touched, so it is the engine's run-to-
  run timing, not the flag. The comparison scripts were throwaway (scratchpad), not committed.
- **`atlas-selftest`'s new `--only` leg** (`atlasSelftestOnly`, on D511's committed pair, seed 2552): the list
  `[{d: 30, options: [0, 2], tokens: ["cast:27", "pass", "cast:5"]}]` (Wall of Earth, pass, Fog at turn 19, past the
  turn-14 split D511 found), `--branch-random 0 --branch-forge 2 --chunk 2 --leak-checks 1`. One unit, `d30-forge-0`,
  carrying `[0, 2]`, replayed to d30 with no divergence (234 s for the replay, four branches and the leak check); the
  rows are exactly options 0 and 2 at branches 0 and 1 on the Forge map; plan.json and the schedule's header carry list
  sha256 `d9e846a5c99d…`; d30 is complete on its Forge map, option 1 at `n` 0 (option 0 1.0, option 2 0.75 over two
  branches); checks clean, the leak check unmoved, one warning (a Fog branch at the turn cap, D478's addendum, never a
  problem). The same list with `cast:5-not-listed` at option 2: exit 4, naming d30 and both lists, no unit line, no
  atlas.json, baseline.json kept. Before this lane the leg's flag did not exist; the leg adds about five minutes to
  `atlas-selftest`, which is not in the gate.
- **`web/test/cubelab-atlas-only.test.ts`**, engine-free, 8 tests: the list's parsing, normalisation, sha256 and 14
  refusals; `checkOnly`'s three failures; the schedule (picks with options, every unit carrying them, `--branch-random 0`
  the Forge map alone, a resume deciding nothing again, the plain schedule unchanged, the cuts refused); the plan hash
  (changed by a list and by another list, D480's `cuts` key for key without one, another list refused on resume); the
  label (`n` 0, each map over the given options, complete with no random map, no NaN); and `atlasCommand` end to end
  through the real pool with a fake `java` — the jobs carry `[0, 2]`, the rows, plan.json, the schedule, atlas.json and
  atlas.md as above, a rerun plays nothing, another list is refused; three drifts exit 4 writing nothing but plan.json;
  ten refusals exit 2 creating no folder. The four existing atlas test files pass unchanged (56 tests with this one and
  the redaction file); `tsc --noEmit` clean; `./bridge/build.sh` OK; `npm --prefix web test` green.

**Rejected.**

- **`--decisions` and an option list beside it** (pick by the spread, then restrict). J200's decisions are given by
  index and must be exactly those; any spread would pick others.
- **A hand-written `schedule.jsonl`** (J200's draft): options drop only at a random-map checkpoint, so the random map
  would play anyway, and it binds a job to the plan hash and a frozen internal format.
- **Options without option 0.** Allowed by the draft's wording, but the label's regret, the Forge map's projection and
  every reader's comparison are against option 0; a list that leaves it out would write a decision with no reference.
- **Exit 3 (a failed check) for a drifted baseline.** Exit 3 means the atlas played and its checks found a problem; a
  drift means nothing was played, and J200's driver must tell the two apart (it reads the drift from `baseline.json`).
- **A separate `only` key at plan.json's top level.** The list is what phase B plays, as the cuts are; keeping it in
  `cuts` gives the existing resume refusal and the schedule hash for free.

**Residuals.**

- `decisions` in plan.json and the schedule header stays `"all"` under `--only` (the flag cannot be given beside it);
  the list is `cuts.only`.
- `--phase both` (the default) still plays phase A first; J200 passes `--phase b`.
- A list naming every option of a decision is no restriction for the label (`only` is not written) but its units still
  carry the options.
