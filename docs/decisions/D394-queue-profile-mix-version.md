## D394 — A key folder's profile mix is part of its lab version, not its identity; a queue night checks every key folder before it plays, and `queue check` does only that

*Branch `c/queue-night-key`.* Corrects D375 (the queue's `--profile-mix`); extends D341 (version stamps).

**2026-10-06**

**Context.** Night 4 (J096, pinned to ef7e73f) failed in its first minute: all 165 chunks said
"`var/cubelab/queue/normal/<cube>` holds a run with a different cube, format, games, profiles,
builder, weights, learned files or exploration -- use a new --out", and so did every bridge key.
`run.ts` checks two things when it appends to a folder:

1. the folder's **identity** (cube, format, games, profiles, builder, weights, Winston cards,
   learned files, bridge, deck exploration and, before this decision, the profile mix), which no
   flag passes; and
2. D341's **version** (code tree, diff, jar, ratings, cube, weights), which
   `--allow-version-change` passes and logs.

D375 says the mix is "part of a key folder's lab version (D341, `run.ts` already compares
`profileMix`)", so the first mixed night would need `--allow-version-change`. But `run.ts`
compared it under (1), not (2). Night 4 passed the flag, as D375 told it to, and was refused
anyway. Its pilot played in a fresh root, where there was no earlier `run.json` to clash with.
Nothing was written: the check runs before `run.json`. Night 4's plan and the ledger's seeds were
written, and a re-run re-reads them.

**Decision.**

- **The profile mix moves from the identity to the version** (`run.ts` `versionWeights`,
  alongside D356's and D358's exploration). The version id hashes it only when it is set, so an
  unmixed run keeps its old id. Adding, changing or dropping the mix in a folder is a D341
  version change: refused without `--allow-version-change`, appended and logged in `run.json`
  (`versions[].allowedChange`) with the flag. Every line still carries `ver`, and a mixed run's
  lines also carry their seats' `profiles`.
- **The identity refusal names what differs** (`identityDiff`: "a different games", not the whole
  list). A queue night treats it like a version refusal: the night stops instead of failing chunk
  after chunk.
- **Key folders first.** Before `queue run` records the run in the plan or plays a chunk, it checks
  every key folder of the night. It uses `runLab` itself with the options of that key's first
  chunk (`checkOnly`: the cube, the meta, both checks, nothing written) and stops on any refusal,
  printing one line per folder. `queue check` (same flags as `run`) does only this and writes
  nothing, not even a new night's plan. A job's pilot can run it against the real root.

**Why the version and not the other two options.**

- **A new `--out` root per night** would split `queue.json`, the seed ledger that keeps two nights
  from drafting the same deck pair (D340). It would also leave every reader that takes the root to
  find a cube's games (the matchup model, `dataset.py --queue-root`, the warehouse, the cold
  archive, the night-only reader in the night jobs) looking in one place for four nights.
- **A per-night key-folder suffix** (`normal/vintage-n4`) breaks the same readers' one-folder-per-key
  layout, and nothing in a mixed night's lines needs a separate folder: `profiles` and `ver` are on
  every line.
- **A flag that accepts a deliberate config change** is what D341's `--allow-version-change`
  already is. It needed the mix on the version side of the line, as D375 intended and D358 did for
  play exploration.

**Readers.** Unchanged and correct. `matchup_data.py`, `dataset.py`, `reserved.py` and the
warehouse read each line's `ver` (and `profiles`, falling back to `run.json`'s Default pair for
older lines). The night-only readers and the cold archive select by the plan's seeds. `run.json` is
the folder's latest run, as it always was. The night-1–4 matchup read should stratify or adjust by
`profiles` (D375's *Not done*), which is that job's business.

**Tests** (`web/test/cubelab-resume.test.ts`). No engine: a planted facts cache.

- The identity list has no `profileMix`.
- An unmixed version id equals its pre-D394 value, and the mix changes the id.
- Night 4 on a night-3 folder is refused without the flag (`weightsSha` changed). With the flag it
  is accepted and logged, and `checkOnly` writes nothing.
- The same night again is the same version. Dropping the mix is a version change again.
- A `--games` change is refused even with the flag, and the refusal names `games`.
- `checkKeyFolders` checks one chunk per key folder and lists the refusals.

**Night 4.** It is re-posted on this commit with the same flags, including `--allow-version-change`.
Its pilot runs `queue check` on the real `var/cubelab/queue`, so this exact refusal would stop the
pilot. It also plays its 60 drafts in a pilot root seeded with copies of the real key folders'
`run.json` files, so the pilot's chunks resume exactly what the night resumes.
