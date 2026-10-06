## D393 — `calibrate.ts` reads a night's drafts within the metrics slice; a failed metrics command is written to the results

*Branch `c/runner-light-var`.* Amends D337 (the runner's `metrics:` lines) and D376/D377 (`calibrate.ts`).

**2026-10-06**

**Context.** J085 (mtg-table 369f613) ran `node tools/cubelab/calibrate.ts var/cubelab/runs/j072-a
var/cubelab/runs/j072-b … --slice 1400 --flat` as `metrics: c = sh:`. Every `c.*` key came back
missing and `metrics_errors` was 1, while the same command without `--flat` (run2, a job unit)
printed the full report, and the pilot's `pc = sh: … --flat` on 16 drafts worked. So `--flat`,
its keys, the `.ts` loading and the cwd were all fine. The runner's journal had `exit 1: 10:
0x19c77d1 [node]`: node died of heap exhaustion. Metrics commands run in `runInSlice`, a
transient unit with `MemoryMax=2G`; run2 ran in the job's unit with its full budget.
`readBatch` read each 132 MB `drafts.jsonl` into one string, split it, and parsed every line with
its own copy of every card name. The PC re-ran the line with `--max-old-space-size=6000` and got
the JSON (`results/J085/calibrate-pc.log` on pc-results). The cause was the reader's heap inside
the metrics slice. The 300 s timeout was not involved: calibrate took 13 s.

**Decision.**

- **`readBatch` streams and shares strings.** `readDraftLines` reads `drafts.jsonl` in 8 MB
  chunks, so no copy of the whole file is held. It parses each complete line with a reviver that
  interns string values, so one copy of each card name serves every record. A torn last line is
  left out, as the runner's readers do. The records are deep-equal to `JSON.parse`'s, and the
  `--flat` output is byte-identical. Measured on two J072-sized synthetic batches (2 × 8,400
  drafts, 2 × 147 MB, built from a real synergy run): before, the line needed 768–896 MB of old
  space (it died at 768) and peaked at 1.20 GB RSS. After, it needs 384–512 MB (it passes at 512)
  and peaks at 0.84 GB RSS.
- **A failed metrics command is written to the results.** The pilot and final checks write
  `metrics-errors.txt` (`pilot-metrics-errors.txt`) to `results/<id>/`: each failed `metrics:` line
  and why. The file is removed when a later evaluation has no errors. Both names are reserved
  from `collect:`. The reason is `stderrGist`: node's `FATAL ERROR … heap out of memory` or an
  `…Error:` line when there is one, else the last line. Before, the reason was the last line,
  a native stack frame, and it reached only the runner's journal.
- The metrics slice keeps `MemoryMax=2G`. A metrics command is the job's code under a small,
  fixed budget beside running jobs, so a reader that needs more is the thing to fix.

**Tests.** `web/test/cubelab-calibrate.test.ts`: J085's exact line shape (relative paths, node
on the `.ts`, `--flat` last) on two 12-draft batches from the mini fixture. It prints one JSON
object whose keys include every one J085 checked (`slices`, `a_mean`, `b_mean`, `a_deff`, `b_deff`,
`a_load_stamped`, `b_load_stamped`, `a_colour_win_tests`, `b_colour_win_tests`). `readDraftLines`
gives `JSON.parse`'s records at chunk sizes 1, 7, 64, 1000 and 8 MB, without the torn last
line. `web/test/lab-runner.test.ts`: a final metric that dies like J085's leaves
`metrics-errors.txt` naming the FATAL line, the check reports the key missing, and no pilot error
file is written.

**Rejected.**

- *A bigger `MemoryMax` or `NODE_OPTIONS=--max-old-space-size` for every metrics command.* It
  moves the limit and does not fix the reader. A night twice as large would fail again, now
  beside a running job's memory.
- *Projecting records to the fields calibrate reads.* evolve's discovery stage reads picks,
  pools and decks. A projection would have to track that code, while interning keeps the
  records whole.
