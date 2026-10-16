## D442 — The LLM drafter gets a spend cap and a fallback stop: one budget a run, a call cap and a dollar cap that refuse the call that would pass them, and a stop once more than a quarter of the decisions fell back

*Branch `pc/review-followups`, the cloud's review of #144 (pc-jobs `README.md`, *NOTES TO THE PC*,
2026-10-16, item 1). Amends **D439**. `tools/cubelab/llmdraft.ts` (`LlmBudget`, `LlmStop`,
`llmCapsOf`), `tools/cubelab/run.ts`, `tools/cubelab/cli.ts`, `tools/llm-seat/lib/model.mjs` (an abort
signal), `web/test/cubelab-llmdraft.test.ts`, `docs/guides/cube-lab.md`.*

**2026-10-16**

**Context.** The review: D439's drafter had no spending limit and no stop on failures
(`llmdraft.ts:409-440`). A logged-out CLI makes two failed calls a decision and then falls back,
so a run quietly becomes lab against lab while it is still labelled `llm`. The watch (D440) is
about to offer `llm:` drafters from a button, which makes both a requirement.

**Decision.**

1. **One `LlmBudget` a run**, shared by every draft and every `--llm-jobs` lane, counting calls,
   failed calls, decisions, retries, fallbacks, tokens and the CLI's cost figure (dollars at list
   price). A caller may make it and pass it in (`RunOptions.llmBudget`), so it can read the spend
   afterwards, a stopped run's included (the watch writes it into `match.json`).
2. **`--llm-max-calls N`** (no default) and **`--llm-max-usd X`** (default **$5**, `none` lifts it)
   are checked *before* each call: the call that would make the N+1th, or whose projected cost (the
   run's mean cost a call so far, times the calls in flight plus one) would pass $X, is refused.
   The dollar default is there so that a 100-draft Sonnet arm (about $30, D439) needs its cap said
   on the command line.
3. **`--llm-fallback-rate R`** (default 0.25; 1 never stops) is checked after each decision: the
   run stops once its fallbacks exceed R × max(decisions so far, 8). The floor of 8 keeps one early
   fault from ending a run; a CLI that fails every call stops after its third decision.
4. **A stop is an `LlmStop`** with its reason (`max-calls`, `max-usd`, `fallbacks`) and the counts
   in words. It is remembered (every later call refuses with it), it aborts a signal that kills the
   in-flight `claude -p` process groups (`model.mjs`'s new `signal`), the draft in progress is
   abandoned (finished drafts keep their replay files, so a resume never pays for them twice), and
   the run exits with the message. `<out>/llm/spend.json` holds the caps, the spend and the reason
   after every LLM run, stopped or not.
5. None of it is part of a folder's identity or lab version: the caps change when a run ends, not
   what a finished draft is.

**Alternatives rejected.**
- *Checking the dollars after each call*: it overshoots by a whole call per lane every time; the
  projection stops before the crossing and overshoots only when one call costs more than the mean.
- *A per-draft fallback rate*: the runs that matter are a single draft (the watch) or a hundred
  (a lab arm); a running share over the run serves both, and the floor makes the first decisions
  safe.
- *No default dollar cap for `run`*: the lab's jobs are written by a session that may not think of
  it; a default that needs lifting out loud is the safer failure.

**2026-10-16, the #148 review (low).** Three holes, closed on this branch:
- *The dollar cap read only `total_cost_usd`*, which the CLI may leave out (`model.mjs`'s
  `parseCliOutput` gives null), so a run without `--llm-max-calls` had no bound at all. A call with
  no cost figure is now charged an estimate, the run's mean priced call or `UNPRICED_CALL_USD`
  ($0.05, about three times D439's Sonnet draft call) when none is priced, into `spent.usdAssumed`
  beside `spent.unpriced`; the cap checks `usd + usdAssumed`. With nothing priced the default $5
  is 100 calls: the dollar cap counts calls.
- *A call killed in flight was not spent*: the stop's abort and the wrapper's timeout kill a
  `claude -p` that has used tokens and reports none. `model.mjs` tags the rejection `killed:
  'abort' | 'timeout'`, and the budget charges such a call the same estimate (`spent.aborted`). A
  call that failed on its own (a logged-out CLI) is not charged.
- *The watch's SIGKILL missed `claude -p`*: the wrapper spawns each call in a process group of its
  own (so one `kill(-pid)` reaches what it started), which also takes it out of the watch's group.
  When `MTGTABLE_CHILD_GROUPS` names a directory, `model.mjs` registers each group there for its
  lifetime (a file named by its pgid, holding the leader's start time from `/proc` so that a reused
  pid is never signalled), and the watch runner sets it to `<watch>/.child-groups/` and sends every
  signal it sends the watch's group to the registered groups too. `watch-runner-selftest.mjs` holds
  it with a fake `claude` that leaves a grandchild and ignores SIGTERM.
