## D429 — the search hint: "what would the search AI do?" for the decision in front of the player, on request, through the coach helper

*Branch `claude/search-hint`.* ForgeCoach's half is its `src/searchHint.ts` and
`src/ui/play/SearchHint.tsx` (branch `claude/search-hint` there).

**2026-10-12**

**Context.** The owner asked: "When I'm playing, can I see what Search AI
would recommend that I do?" The design agreed with him: a button in the
decision panel, never automatic; the engine on his PC runs the search's
analysis of the decision in front of him for a few seconds and returns its
pick and, when close, the runner-up, each with how sure it is; it knows only
what the player knows (D348's rule, as the engine review); it runs locally,
free, through the coach helper. Everything it needs exists: the live analysis
(D336: `coach-grade.sh serve`, one booted engine answering JSON lines,
`liveSettings` — the review's triage settings, D353), the hidden-information
guard (`HiddenPool.checkLive`, D348), the review's decision rule
(`Review.plan`), its verdict vocabulary and honesty rules (D353; ForgeCoach's
`gameReview.ts`: an interval including zero is never a mistake, a zero-regret
close call is a tie, leaf is short-horizon), and the helper's runner pattern
(`review-runner.mjs`, `eval-runner.mjs`).

**Decision.**

- **`POST /hint` on the coach helper** (`tools/hint-runner.mjs`; `/health`
  `"hint": 1`, `"hintEngine"`, `"hintBudgetMs"`; `--no-hint`), the contract in
  `docs/search-hint.md`. One `coach-grade.sh serve` child, started on the
  first hint under `nice -n 10` with its own Forge home (`hint-home`), stopped
  after 20 idle minutes; one analysis at a time; a newer request for the same
  game supersedes the older (409 `superseded`), other games wait (two at most,
  then 429); a budget of 1500–6000 ms, default 3000.
- **The moment is the bridge's own log**, read by `gameId` from
  `var/games/` (the review's `gameLog`), never frames from the request. The
  request names the moment by the `seq` of the state and input the board shows;
  the helper copies the log's complete lines to its own file and asks the
  engine for `"type": "auto"` at the end of them. A log past that moment is
  409 `moved-on`, one behind it is waited for, then 409 `not-yet`. Rejected:
  posting ForgeCoach's `log.frames` (what the brief sketched) — a late game's
  log is megabytes (over the helper's 256 KB body), the browser's log has a
  synthesized header without the player's deck path the grader reads, and a
  request's frames are one more input whose redaction would have to be
  re-proven; the engine's own file is the redacted view by construction.
- **Which decision: the review's own rule.** `Review.kindOf` is factored out
  of `Review.plan` (no behaviour change: GradeSelfTest's plan checks are
  unchanged), `Review.liveType(log, frame)` applies it to the latest state and
  input, and `serve`/`analyse` take `"type": "auto"` — `"status":
  "unsupported"` when no gradable decision is open. ForgeCoach's `hintKindOf`
  is the same rule in TypeScript and gates the button. The grader's answer
  gains `landFirst` (the land every `spell` option plays first, D334's rule)
  so the hint can say "play Forest first".
- **The words are the review's, never stronger than the interval**: each
  option `best` / `tie` (regret under 0.005, ForgeCoach's `TIE_REGRET`) /
  `close` (regret interval includes zero) / `worse` (excludes it) /
  `not-graded`; the pick `clear` only when every other graded option is
  `worse`, else `close` with the runner-up (a tie before a close call); `only`
  for one legal option. The measure stays `leaf`: ForgeCoach says "looks to the
  end of this turn" and never shows it as a win rate.
- **Hidden information, as D348 for the review**: no field for the AI's deck
  (unknown fields refused, by name); `oppPool` / `oppKnown` validated by the
  review's validator and passed as files; `checkLive` on every request; no
  pool → basic lands, and the answer says `basic-lands`. A game between two
  people (`friend-…`) is refused at this door (D407's reason).
- **Proof on the real engine**: `tools/hint-probe.mjs` — the bridge, the helper
  and `tools/ws-auto-play.mjs --hold-hook` (new: the scripted seat stays parked
  on each new decision while an outside check runs) play a whole game against
  Doom Legion asking `/hint` at real main phases, attacks, blocks and targets,
  plus an attack and a block cut from `fixtures/games/human-auto-42.jsonl`. It
  checks the bridge's log with `check-redaction.mjs`, that every moment the
  analysis read is a prefix of that log, the knowledge of every answer, the
  bridge's `/health` latency during every hint, and that no card of the bot's
  real deck the player had not yet seen (and that is not in the pool or the
  player's deck) appears in any answer. Not in the gate (it boots Forge
  twice); `tools/hint-runner-selftest.mjs` is the gate's half (12f, CI).

**Measured** (`docs/search-hint.md` § Measured): this container, budget 3000
ms, seed 42 — 24 hints, all 200; the first 10.1 s (the engine's start), graded
hints 2.3–3.3 s, a many-target `target` 6–8.4 s, a `trivial` one ~0.1 s; the
bridge's `/health` ≤ 17 ms throughout; no leak in 407 unseen-card checks.
Seeds 7 and 13 the same (no attack prompt in either game).

**Consequences.**

- The three-second look often cannot separate two quiet plays (a cast tied
  with passing) and says "too close to call"; that is the honest answer at this
  budget, and the reason the strength word exists.
- A `target` with many legal targets costs one rebuild per target per round:
  over budget (8.4 s for 14 targets). A cap on the targets graded live is a
  follow-up if the owner finds it slow.
- Some target moments answer `unsupported` ("no option finished a playout")
  where the rebuild cannot play the targeted spell on; the button then says
  the search AI can't judge this decision.
- No wire change: `web/src/protocol.ts` (and so ForgeCoach's copy) is
  untouched.
