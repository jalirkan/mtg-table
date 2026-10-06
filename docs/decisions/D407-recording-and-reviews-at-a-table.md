## D407 — Recording a game between two people: each player's consent per game, a set of its own for the human test games, and each player's engine review shown to that player alone

*Branch `c/friend-bo3`.* Phase 3 of play-with-a-friend, with D406. Amends D369 (the collector takes a consenting seat of a table into `var/ml/human-friends/`), D385 (the automatic review takes a consenting seat of a table), D353 (the coach helper's own `/review` never serves a table's review) and D402 (`friend-*` games are no longer excluded outright). Protocol amendment **M60** (the header's `record`).

**2026-10-06**

**Context.** D402 kept games between two people out of the human test set
(D369) and out of the automatic review (D385) until each player could opt out.
A seat's log is that player's view: their own hand, their decisions. The owner
wants these games as human test data and both players want the engine's review
of their own play; the friend's log is the friend's, and a review of it shows
the friend's hand.

**Decision.**

- **Consent is per seat, per game, and is the player's.** The owner chooses the
  room's default when making it (`POST /room`'s `record`, false when absent;
  ForgeCoach's *Record our games* box). Each player can turn their own seat off
  or on for the next game, in the room, before handing in a deck (`POST
  /room/<id>/record`, or a deck's `record`). The room snapshots both answers when
  a game starts and passes them in the seats file (`record: [bool, bool]`); the
  bridge writes each seat's own answer into that seat's session header
  (`record`, M60). A player sees only their own answer. A choice made during a
  game applies from the next one: the header is written at the game's start.
- **The log itself decides.** The collector and the automatic review read the
  header, so a log carries its own consent and nothing else has to be joined to
  it. A seat is taken only with `humans: 2`, `record: true`, transport `ws`,
  both players people and a finished game. A Phase 2 log (no `record`) is never
  taken. One-sided consent records exactly that player's seat.
- **One seat is a whole test game.** D369's rows are the viewing seat's own
  decisions over its own redacted view (`encode.py`), so a seat needs nothing of
  the other: measured, 283 decision rows from one automated seat of a 43-turn
  game. **They go to a set of their own**, `var/ml/human-friends/` (same
  manifest, plus `opponent: "human"`, `opponentDeck` {name, cards} and `match`
  {game, of, score}): D369's pre-registered first check is over the owner's
  first thirty games against Forge's AI, and a game against a person is another
  population; adding them to `var/ml/human/` would change what that check
  reads. `human_eval.py --human var/ml/human-friends` scores them on their own.
- **Reviews: each consenting seat, at idle priority, shown to that player only.**
  The automatic review queues a consenting seat's log like any other (D385's
  gates unchanged: one at a time, `nice`/`ionice`, only when the lab leaves
  room). The report is that player's alone, because it is built from their log:
  the coach helper's own door (8643) never serves a table's review — `POST
  /review` of a `friend-*` game is 403, `GET /review` leaves them out and `GET
  /review/<id>` is 404 — and the draft room hands each seat its own through
  `GET /room/<id>/review/<matchId>`, behind that seat's token, built from that
  seat's log name only — with `GET /room/<id>/log/<matchId>`, that seat's own
  frame log, whose frame numbers the report's are (the browser's own copy can
  differ after a reload). The room's state carries each finished game's review
  state for this seat (`off`, `waiting`, `queued`, `running`, `done`, `failed`),
  never the other seat's.
- **Nothing leaves the owner's machine.** The logs, the test set and the
  reports stay under `var/`; the friend's browser receives only its own review,
  over the room listener it already uses.
- **What opting out does not do.** The bridge still writes both seats' working
  logs under `var/games/` on the owner's machine, as for every game (D402); an
  opted-out seat's log is not copied into any set and not reviewed.

**Rejected.**

- *One consent for the whole room.* The friend could not say no for themselves.
- *Consent kept by the room and joined to logs later.* Two sources of truth; a
  log copied anywhere would lose its consent.
- *The friends' games in `var/ml/human/`.* It would change the population of a
  pre-registered check (D369) after the fact.
- *Each player's review through the coach helper's `/review`.* That is the
  owner's door: the owner's page could open the friend's review, and the friend
  cannot reach it at all (D386).
- *Not writing an opted-out seat's log.* The log is the engine's record of the
  game on its owner's machine (D402's per-seat logs, M59); what consent governs
  is what is kept for the test set and reviewed.

**Measured.** `tools/auto-review-selftest.mjs` (17 new checks): a consenting
seat reviewed, an opted-out seat never queued (its verdict says why), a Phase 2
log not taken, `find()` and the helper's `seatReviewOf` giving the seat its own
report and nothing for the other, and the owner's door leaving a table's review
out of `GET /review`, 404 on `GET /review/<id>` and 403 on `POST /review`.
`tools/ml/tests/test_human.py` `test_friends`: one consenting seat of two taken,
into its own set, with its match and the opponent's deck by name, encoded into
rows on its own; Phase 2's logs not taken; the test set itself unchanged.
`tools/draft-room-selftest.mjs` 3c: the owner's default, a seat opting out
without touching the other, each seat seeing only its own consent, the review
route giving seat 0 its report and its own log and seat 1 (opted out) nothing
of either, and the review of an opted-out seat never even looked up.
