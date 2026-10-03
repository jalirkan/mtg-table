# The post-game review — `coach-grade.sh review` and `/review` on the coach helper

The one place ForgeCoach's side copies from. After a game, every decision the
player made of a graded type (spell / pass, attack, block, target) is graded
by the engine, the ones most likely to matter are graded again with a bigger
budget, and one JSON report says, per decision, what each option was worth,
what the player chose and what the engine thinks was best — with intervals,
and a flag for whether the difference is statistically clear. The code is
`tools/coach-grade.sh review` (bash: the stages and the parallel JVMs),
`bridge/src/mtgtable/grade/Review.java` (the plan, the triage selection, the
budget allocation and the report: engine-free, held by `GradeSelfTest`),
`Grader` (the grading, D334) and `tools/review-runner.mjs` (the helper's
`/review`). Decision **D353**.

## What it grades, and with what knowledge

- **The log is the player's own view** — `var/games/<gameId>/frames.jsonl`,
  the seat's redacted log (protocol §8.3). `--seat N` must be the log's seat;
  anything else is refused (another seat's review needs that seat's log).
- **The decisions** (`Review.plan`): in a human-seat log (one with acts), the
  first act of each decision — the viewer's main phase with an empty stack
  (`spell`), the attack prompt (`attack`), the block prompt (`block`), each
  target prompt (`target`). An AI-vs-AI recording has no acts: the first state
  of each of the viewer's main phases, declare-attackers steps and (when
  something attacks them) declare-blockers steps. **What the player did** is
  read from the engine's events after it (the first spell cast from hand, the
  `attackers` / `blockers` event) or, for a target, from the click — never
  from anything hidden.
- **Hidden information is the live analysis's rule (D348), not D334's
  review rule.** The opponent's real deck list is refused unless marked public
  with a reason (`--opp-deck-public "<reason>"`); the default is pool mode —
  `--opp-pool <cube list>` minus the player's deck, drafted pool and every
  public card, the AI picks the player saw (`--opp-known`) drawn first. With no
  pool, the opponent's hidden cards are basic lands (the report's
  `knowledge.opponent` says which). `HiddenPool.checkLive` runs on every
  graded moment.

## The two stages

1. **Triage** — every planned decision, cheaply: the live analysis's settings
   (playouts to the end of this turn scored by the leaf evaluator, `"measure":
   "leaf"`, racing from round 4), a per-decision budget of
   `triage_s × jobs / decisions` ms clamped to `[--triage-min-ms, --triage-max-ms]`
   (1500–6000), at least 2 rounds. `--jobs` JVMs share the decisions, each
   taking the next unclaimed one (`batch --claim`), so one slow decision does
   not hold up the rest.
2. **Deepen** — the `--deep-k` (6) decisions most likely to matter, graded
   again from scratch with a bigger budget: playouts to the end of the game
   (`"measure": "wins"`, `--deep-horizon -1`) when each decision gets at least
   `--deep-full-min-s` (60 s), else to the end of the next turn (`1`, leaf).
   One decision per JVM when `k ≤ jobs`, so every option of a decision plays
   the same round seeds in the same process (the paired comparison D334 needs);
   otherwise `ceil(k / jobs)` decisions per JVM, each a share of the wall
   budget (`Review.allocate`). A deepened decision plays only its shortlist
   again (`Review.deepOptions`, `--deep-options` 5): the player's option, the
   triage's best, Forge's, then the rest by the triage's win rate — every one
   of them on every round, so the comparison stays paired.

**Which decisions deepen** (`Review.select`): a decision is a candidate when
it graded `ok`, the player's choice is one of its options, and that option was
not the best. Candidates are ranked by the upper end of the player's regret
interval (`regretHi`: what the choice might have cost — large regrets and wide
close calls both rank high), ties by the point regret. At most `--deep-k`.

**Measured** (this repo's 4-core cloud container, shared, 3 JVMs; one human-seat
game of 32 decisions, 6 deepened): see D353. On the PC's 7 JVMs the same budgets
are the targets: triage ≈ 15 s, deepening 6 decisions ≈ 2.5 min.

Budgets (defaults; all flags): `--triage-s 15`, `--deep-s 150`, `--jobs 7`,
`--deep-k 6`. JVM boot (≈10 s per stage, the JVMs boot in parallel) is not in
either budget; the report's `timing` gives both.

## The report (`"kind": "game-review"`, `"v": 1`)

```json
{
  "v": 1, "kind": "game-review",
  "gameId": "g-20261003-1", "seat": 0, "log": "var/games/g-20261003-1/frames.jsonl",
  "frames": 1155, "createdAt": "2026-10-03T21:00:00Z", "yardstick": "forge-default",
  "knowledge": { "opponent": "pool:… minus the viewer's deck and pool and every public card", "opponentModel": "pool",
                 "ownDeck": "deck:decks/x.dck" },
  "config": { "jobs": 7, "triageS": 15, "triageMsPerDecision": 3500, "deepK": 6, "deepS": 150,
              "deepMsPerDecision": 140000, "deepHorizon": -1 },
  "timing": { "planMs": 40, "triageWallMs": 26000, "triageGradeMs": 15200, "deepWallMs": 161000,
              "deepGradeMs": 148000, "totalMs": 190000 },
  "summary": { "decisions": 24, "graded": 21, "best": 15, "closeCalls": 4, "mistakes": 2,
               "notGraded": 3, "trivial": 2, "deepened": 6 },
  "keyMoments": [612, 941, 388],
  "decisions": [
    {
      "frame": 941, "stateFrame": 932, "turn": 12, "round": 6, "phase": "COMBAT_DECLARE_ATTACKERS",
      "type": "attack", "status": "ok", "stage": "deep",
      "measure": "wins", "rounds": 48, "playouts": 190, "ms": 139000,
      "played": "attack:21,22", "playedOption": "attack:21,22", "playedLabel": "attack with Grizzly Bears #21, …",
      "best": "attack:none", "bestLabel": "no attack", "forgeChoice": "attack:21",
      "regret": 0.12, "regretLo": 0.03, "regretHi": 0.21,
      "verdict": "mistake", "clear": true, "key": true, "rank": 1, "selectReason": "regretHi 0.21",
      "options": [
        { "token": "attack:none", "label": "no attack", "n": 48, "winRate": 0.61, "winLo": 0.47, "winHi": 0.73,
          "regret": 0, "regretLo": 0, "regretHi": 0.04, "best": true, "forge": false, "played": false },
        { "token": "attack:21,22", "label": "attack with …", "n": 48, "winRate": 0.49, "winLo": 0.35, "winHi": 0.63,
          "regret": 0.12, "regretLo": 0.03, "regretHi": 0.21, "best": false, "forge": false, "played": true }
      ],
      "fidelity": [], "notes": [],
      "triage": { "measure": "leaf", "rounds": 6, "best": "attack:none", "regret": 0.09, "regretLo": 0.01, "regretHi": 0.17 }
    }
  ]
}
```

Per decision:

| Field | Meaning |
|---|---|
| `frame` | the moment: everything **before** this frame index (ForgeCoach `log.frames`, as `liveMoment`) |
| `stateFrame` | the state frame in force — what the board shows |
| `type` | `spell` · `attack` · `block` · `target` |
| `status` | the grader's: `ok`, `trivial` (one option), `unsupported` (the rebuild or the type cannot be graded here; `error` says why), `error`, `refused` (the hidden-information guard) |
| `stage` | `deep` (graded again with the big budget; its numbers are those) or `triage` |
| `measure` | `wins` (playouts to the end of the game: a win rate) or `leaf` (to the end of the turn: a short-horizon estimate on the fitted leaf scale, D349 — never call it a win rate without saying so) |
| `played` | the player's choice as a token over the log's card ids; `playedOption` the option it is (same class: identical creatures, another copy of a card) or `null` when the table has no such option (`verdict: "not-graded"`) |
| `best`, `forgeChoice` | the engine's best option, and what Forge's own AI would have done |
| `regret`, `regretLo`, `regretHi` | the played option's regret (best win rate minus its own, paired) and its 95% interval |
| `verdict` | `best` (the played option is the best) · `close` (it was not the best, but its regret interval includes zero: a close call, not a mistake) · `mistake` (the interval excludes zero) · `not-graded` |
| `clear` | `regretLo > 0`: the difference is statistically clear |
| `key`, `rank` | one of the moments that mattered, and its order (1 = first) |
| `options[]` | the grader's table (D336's fields), `played: true` on the player's option |
| `triage` | for a deepened decision, the triage's summary |

`keyMoments` lists the key decisions' `frame`s, most important first: the
deepened mistakes by their final regret, then the deepened close calls whose
point regret is at least 0.02 (a tie with the best is not a moment that
mattered), then any other clear mistakes from triage. `summary` counts
verdicts; `trivial` counts decisions with a single legal option (their verdict
is `not-graded`).

`knowledge.opponentModel` says what the opponent's hidden cards were drawn
from: `pool` (the cube list minus what the player owns and everything public),
`deck` (a list marked public with a reason), or `basic-lands` — nothing was
known, the opponent was modelled with no spells, and **every number flatters
the player**; a screen showing such a report must say so.

## How a review ends (D353, amended after the PC's J028)

`coach-grade.sh review` prints `REVIEW STAGE <plan|triage|deepen|report> …` lines
and ends with exactly one of:

- `REVIEW DONE <report> decisions=N graded=G errors=E deepened=D` — exit 0. A few
  `errors` (decisions whose status is `error` or `refused`) leave the review done;
  the counts say how many.
- `REVIEW FAILED <stage>: <why>` — non-zero exit, and the helper's `/review` is
  `failed` with that reason:
  - `plan` (exit 3): the log or the knowledge is refused, or the leaf scale
    (`var/coach-grade/leaf-scale.json`) is unusable — not a positive number;
  - `triage` (exit 4): the triage graded **no** decision; the reason is the
    first `COACH-GRADE FAILED` line of its shard logs;
  - `report` (exit 4): every decision of the report is an error or refused (the
    report is still written, as evidence); exit 5 if the report step itself failed.

A shard that dies leaves a `REVIEW WARN … shard failed: <why>` line. A rerun under
the same `--run` starts clean (claims and shard files removed): a review is not
resumable. `review-smoke` prints the same lines as `REVIEW-SMOKE …`, so a log that
holds a smoke and a review counts each once, and it fails unless the triage graded
at least one decision and at most a quarter are errors.

## `/review` on the coach helper

Only when `/health` says `"review": 1` (the bridge is built: the helper finds
`bridge/out/mtgtable/grade/`; `--no-review` turns it off). The helper's own
gate (Origin, LAN token), exactly as `/coach` and `/match`.

- `POST /review` `{"gameId": "<id>", "seat"?: 0|1, "oppPool"?: [[n, "Card"], …],
  "oppKnown"?: ["Card", …], "deepK"?: 1-12, "triageS"?: 5-120, "deepS"?: 30-900}`
  → **202** `{"ok":true,"id":"r1759520000000","state":"queued","position":0}`.
  `gameId` must name `var/games/<gameId>/frames.jsonl` (letters, digits, `.`,
  `_`, `-`; resolved inside `var/games/`); `oppPool` is the cube list (at least
  80 cards, card names as the match launcher checks them), written by the
  helper to the review's own folder; `oppKnown` at most 60 names. The AI's
  deck is never accepted: there is no field for it.
- `GET /review/<id>` → `{"ok":true,"id","state":"queued"|"running"|"done"|"failed",
  "position"?, "stage"?: "plan"|"triage"|"deepen"|"report", "startedAt"?, "endedAt"?,
  "error"?, "report"?}` (`report` once `done`).
- `GET /review` → the last few reviews' `{id, gameId, state}`.
- One review runs at a time; up to `--review-queue-max` (2) wait; past that 429.
  Refusals are `{"ok":false,"type":"error","message":"…"}` with 400 / 404 / 405 /
  413 (over 256 KB) / 429 / 503 (review off).
