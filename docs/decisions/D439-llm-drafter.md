## D439 — The cube lab gets two more drafters for one seat: Forge's ranks, and an LLM asked once a grid decision through the Claude Code CLI, with a strict JSON reply, one retry, the lab drafter's line as the fallback, and every token counted

*Branch `pc/llm-drafter`, for lab job J134 (pc-jobs). Amends **D416** (`--drafter` was the human-pick
model only). `tools/cubelab/llmdraft.ts`, `tools/cubelab/drafters.ts`, `tools/cubelab/draft.ts`
(`gridDraftAsync`), `tools/cubelab/run.ts`, `tools/cubelab/cli.ts`, `tools/llm-seat/lib/model.d.mts`,
`web/test/cubelab-llmdraft.test.ts`, `docs/guides/cube-lab.md` (*The drafters, and how to name each*).*

**2026-10-15**

**Context.** Justin: "which AI does the best at drafting? Can we make it so the user can select Forge
AI, Search AI or the Sonnet model?" The lab has the lab drafter (D294) and the human-pick model (D416,
which lost to the lab drafter on Vintage in J114) as drafters, and an LLM seat for *playing*
(D418, D419) but none for drafting. "Search AI" is a way of playing (search-v2), not of drafting.
"Forge's card ranks" had no name on the command line: they are the lab drafter's starting ratings, and
D294 rejected Forge's own pick function. The Sonnet pilot is parked for cost; building the option is
approved, spending on it at scale is Justin's call.

**Decision.**

1. **`--drafter forge-ranks`**: one seat drafts with each card at Forge's raw draft score (what
   `ratings init` seeds, whatever the ratings file says; unranked at `unrated`), synergy 0, lean 0, and
   commits after its first line (`commitAt 0.04`). It is D294's description of Forge's pick function
   ("commits on the first strong pick", "no notion of the cube's themes") in the lab's terms, so it can
   be measured; it is not Forge's code, which has no grid draft (D293).
2. **`--drafter llm:<haiku|sonnet|opus|fake>[:thinking=off|low|default]`** (thinking defaults to `low`,
   the LLM seat's default): one seat asks Claude for each of its 18 grid decisions, one fresh call each,
   through `tools/llm-seat/lib/model.mjs` (the CLI as D292/D418 run it: every tool off, one turn, the
   system prompt by argv). The other seat is the lab drafter and both build with the lab builder and
   the cube's ratings, so a mirrored pair of folders isolates picking. Grid only, one cube, no
   `--synergy`, `--bridge`, head-to-head or `--explore`, as D416.
3. **The prompt.** System: the grid's rules and the exact reply format. User: the cube's name; a
   summary of its own document (its "What it is", "The themes and how they connect" or "Design
   principles", then its italic opening line and "Source and credit", markdown dropped, ≤ 600
   characters); the grid, each card's name, cost, type, P/T and oracle text ≤ 200 characters; the
   legal lines with their cards; its pool so far grouped by colour with mana value and type. The
   opponent's pool only under `--llm-sees-opponent` (public in a grid draft, left out by default to keep
   the prompt small). A grid draft has no hidden information: all nine cards are face up for both.
4. **The reply is strict JSON** — `{"take": "row"|"col", "index": 0..2, "reason": "…"}`, the object alone
   or in one fence, no other key, an integer index, a legal line; a reason over 20 words is cut, not
   refused. A failed parse or a failed call is retried **once** with the fault named; a second failure
   takes **the lab drafter's line** and counts a fallback. A model that never answers therefore drafts
   exactly the plain draft (tested).
5. **Every draft's cost is in its `drafts.jsonl` line** (`llm`: calls, retries, fallbacks, failed calls,
   plain / cache-read / cache-write input tokens, output tokens, the CLI's cost figure, model ms, wall
   ms, each decision's line, reason and faults), and the run prints the totals, as J119's seat did.
6. **Determinism by replay.** The CLI has no temperature setting, so answers are not a function of the
   seed. Each finished draft's decisions are written to `<out>/llm/<seed>.json` at once and a resumed
   run replays them (refusing a file another model, seat or prompt version wrote), so a stopped run
   never pays twice. `LLM_PROMPT_VERSION` (1) is bumped when the prompt's meaning changes.
7. **Identity and version.** The drafter (kind, seat; for the LLM its model, thinking, `seesOpponent`
   and prompt version) is `run.json`'s `drafter`, one of `IDENTITY_FIELDS`, and enters the lab version
   by kind; D416's human-pick object is unchanged, so its folders' version ids do not move.
8. **`llm:fake`** (the first line listed; no network, no spend) is the model for tests, pilots and the
   runner's dry run. `--llm-jobs N` (default 2) asks N drafts at once.
9. **The grid's rules stay one copy**: `gridDraft` is now a generator driven synchronously, and
   `gridDraftAsync` drives the same generator with an async chooser. Every existing test and golden
   passes unchanged.

**Measured** (one real smoke, the only spend: Vintage, seed 899,000,001, seat A `llm:haiku` thinking
low, seat B the lab drafter, `--games 0`). 18 decisions, 18 calls, 0 retries, 0 fallbacks; 57,971
input tokens (36 plain, 57,935 cache writes, 0 cache reads: each call is fresh), 6,610 output tokens,
114.6 s (6.4 s a call), the CLI's cost $0.0149 (Haiku 5.5's list price with one-hour cache writes at
2× input reproduces it). The model's reasons were on topic (it took Black Lotus, Sol Ring, the
planeswalkers and the colourless bombs and named its white core). Sonnet 5.5 at the same token counts
and its list price (claude-api skill, cached 2026-10-06: $2 / $10 per million, cache write 2× in the
one-hour TTL): about **$0.30 a draft**, more if it writes longer replies; a 100-draft arm ≈ $30.

**Alternatives rejected.**
- *The Messages API directly, with temperature 0*: deterministic, but a second way to reach Claude with
  its own key and billing beside the CLI login every other LLM tool here uses (coach helper, LLM seat).
  The replay file gives reproducibility without it.
- *One session per draft* (the seat's `--resume`): cache reads would cut input cost, but a session's
  context grows with every grid and its decisions stop being independent; at 18 short calls fresh
  calls are simpler and the measured cost is small. A later change can measure it.
- *The LLM also building its deck*: the comparison would mix picking and building; the lab builder
  builds both seats, as D416.
- *Falling back to a random or first line*: the lab drafter's line keeps a fallback from handicapping the
  seat, and makes "all fallbacks" exactly the control.

**Not decided here.** Which drafter is best (J134 measures it, the LLM arm only with Justin's spend
approval), and whether ForgeCoach offers any of them in Draft vs Bot (ForgeCoach's change).
