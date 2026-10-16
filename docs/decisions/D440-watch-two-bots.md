## D440 — watch two bots: one grid draft by the lab's drafters, then a paced best of three from seat 0's eyes, served by the coach helper

*Branch `pc/watch-bots`. Written as D439, renumbered before its PR: `pc/llm-drafter` holds D439. The engine half; ForgeCoach builds the lobby tile and the viewers from `docs/watch-bots.md`.*

**2026-10-15**

**Context.** The owner: watch two AIs do a grid draft and then play each other,
maybe a best of three — to see how different cubes play. Every part existed
apart: the cube lab drafts and builds (D293–D296, `run`), the spectate recorder
plays a paced both-AI game from one seat's eyes (amendment M47, D118–D122), and
ForgeCoach follows a growing frame log over HTTP (`src/live.ts`). Nothing put
them in one run, recorded the draft so a viewer could replay it grid by grid, or
served the result to ForgeCoach: the spectate route is the Vite dev server's
alone (D122, D92's rule), which ForgeCoach's public page never talks to.

**Decision.**

1. **`tools/cubelab.sh watch <cube.md>`** (`tools/cubelab/watch.ts`) is one run
   in one folder, `var/spectate/watch-<cube>-<seed>/`: the draft is `run` itself
   with `--drafts 1 --games 0` into `lab/` — the same picks and decks `run` makes
   at that seed (D294), the lab's builder and, where it finds no legal deck,
   Forge's — then each game a paced `mtgtable.RecordMatch` (both seats AI,
   `--match`, seat 0 = drafter A) into `<id>-g<n>.jsonl`, until a side has more
   than half of `--games`. Grid only: a Winston draft has no grid to replay.
2. **draft.json is rebuilt from the lab's own pick log, not a second drafter.**
   An opener's look is the grid's nine cards in slot order, so the grid as each
   drafter saw it (nine slots, null where the opener's line was) and the line
   taken (0–2 rows, 3–5 columns, as ForgeCoach and the draft room number them)
   follow from `PickRecord`; the rebuild checks the second drafter's own log
   against what the first left, and `draftProblems` (nine slots, a legal line
   holding what was taken, pools the sum of the picks, 40-card decks) runs on
   every watch before the file is written.
3. **match.json is a state machine** (`drafting → playing → done`, or `error` /
   `stopped` from the first two; games appended one at a time, a finished game
   frozen, `wins` the finished games, nothing past the decision), written whole
   through a renamed temp file, and every write is checked against
   `transitionProblem` — the function the unit test holds.
4. **A seat is a Forge profile or `search`**: RecordMatch gains `--policy` /
   `--ai-policy` (`plain` | `search`); `search` seats `Bootstrap.createAiSeat`
   with the outlet policy and `SearchConfig.parseLive` — exactly
   `MtgTable --ai-policy search`'s seat (search-v2, D412). `plain`, the default,
   is the old seat, so every existing recording and gate step is unchanged. The
   wire is unchanged too: `hello_ok.match` names the profile as before, and
   match.json says which seat searched. A game with a search seat gets 30 more
   minutes of timeout; the summary prints the search's counters.
5. **The coach helper serves it** (`tools/watch-runner.mjs`): `POST /watch`
   starts one (409 while one runs), `GET /watch[/<id>]` reads draft.json and
   match.json, `GET /watch/<id>/game/<n>` serves a game's log as complete lines
   with the dev route's `?from=` / 404 / 416 semantics and also by
   `Range: bytes=<n>-` (206), because that is how `live.ts` already polls — so
   ForgeCoach follows a watch game with the follower it has. `POST
   /watch/<id>/stop` kills the run's process group. No new port: the helper's
   D386 door holds every route (loopback or `--lan` plus the token, the Host
   check, the Origin list, tunnel headers refused); the preflight now allows
   `Range` and the game answers expose `X-Log-Next`, `X-Log-Size` and
   `Content-Range`. A GET reads only.
6. **Hidden information.** Each game is seat 0's view, the other hand the
   five-key stub, and each recording must pass `tools/check-redaction.mjs`
   before its result is written (a fail ends the watch with `error`). draft.json
   shows both pools and both decks: a grid draft is face up, both drafters saw
   every grid, so it reveals nothing either did not see. No omniscient view.
7. **A watch boots its own Forge home** (`var/cubelab/watch-homes/0`), so a
   watch the helper starts beside a lab run never shares a userDir with that
   run's job 0; the lab's no-saved-preferences check covers it.

**Rejected.** Serving `var/spectate/` from the helper generally (it would
publish every spectate recording through the owner's door; the helper serves
`watch-*` folders, through the game route, and nothing else); a new port (the
helper's door already is the owner's); recording seat 1 too, or an omniscient
log (a new redaction mode, which M47 refused); a second grid implementation for
the record (two drafters to keep equal; the lab's log already carries what the
viewer needs); a draft replay with real times between picks (the lab's picks
take milliseconds; the viewer paces them).

**Measured** (this desktop, load average 12–17 with the lab running):
`tools/cubelab.sh watch cubes/fair-fight-cube-180.md --games 1 --pace 0` end to
end, 36 picks over 18 grids, two 40-card lab decks, one game of 18–19 turns,
redaction PASS: 17–19 s wall (the draft step 9 s with the engine's card lookup
cold, about 4 s warm; the game about 9 s). With `--player-b search`: the game
38 s. Through a helper on a free port, `POST /watch` best of 3, Reckless vs
search, pace 150: done in 137 s, B 2–0 (20 and 22 turns, 58 and 65 s of game
wall time each; the search seat changed 2 and 6 of Forge's decisions), both
logs PASS; a 409 to a second POST; a Range-polling follower (live.ts's
method) rebuilt game 1 byte for byte (3,304,627 bytes, 327 lines, 114 206s).
A real `POST /watch/<id>/stop` mid-game: `match.status` `stopped`, game 1
`error`, the slot free, no JVM left. Tests: `web/test/cubelab-watch.test.ts`
(8), `tools/watch-runner-selftest.mjs` (67 checks; gate 12f and CI),
`coach-helper-selftest.mjs` 150. The gate (`SKIP_DECKS=1`, `WSPORT=8750`: this
PC's lab runner holds 8645; load average 40–60) passed every job but three
known ones: 12f's two match-launcher checks (no `claude` / `tailscale` here,
the rest of 12f's self-tests run by hand: all OK) and 12i's D399 control, which
fails identically with `origin/main`'s own classes under `bridge/run.sh`'s
flags on this machine.

Touching `bridge/src` and `tools/cubelab` moves D341's lab version, as every
change there does; the overnight queue's folders log it under
`--allow-version-change`.
