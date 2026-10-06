## D406 — Best of three at a table of two: the draft room runs the match, one engine start per game, sideboarding is a deck handed in again, and the loser of the previous game chooses to play or draw

*Branch `c/friend-bo3`.* Phase 3 of play-with-a-friend (D400 the draft, D402–D404 one game). Amends D402 (a table's seats file gains `match` and `chooser`; the bridge writes `result.json`) and D404 (the room scores games and runs a best of three; a deck handed in after a game is the next game's). Protocol amendment **M60**. D407 is this lane's other decision (recording and reviews).

**2026-10-06**

**Context.** Phase 2 played one game: a rematch was two more decks. Cube
players play best of three with sideboarding from their drafted pool (every cube
document under `cubes/` says so). Two ways to build it: let Forge run the match
inside one process (`--games 3` and M6's `newGame`, Forge's own sideboard
question between games), or let the draft room run it, one engine start per game.

**Decision.**

- **The room runs the match; a process still plays one game.** When both decks
  are in, the room starts game *n* of a best of three exactly as D404 starts a
  game: fresh seat tokens, its own match id, its own seat logs. The seats file
  tells the bridge where the game stands (`match: {bestOf: 3, game, wins}`),
  and the handshake says it to both seats (M41's `gameNumber` / `gameCount`,
  `match.games: 3`, and `match.score`, the games each side won before this one,
  from that seat's side). Why not Forge's own match loop: at a table it is two
  GUIs, two `nextGameDecision`s, D114's queued `newGame`, two sets of logs
  rolling over to `-g2` and Forge's sideboard question on the game thread for
  each seat in turn — a path no test has ever run with two people — and its
  sideboard is whatever the `.dck`'s sideboard holds, not the room's rule. One
  game per process reuses the path Phase 2 measured end to end, a game that
  goes wrong (a crash, an abandoned seat) cannot take the rest of the match
  with it, and the room stays the one authority on what each player may play.
- **Sideboarding is a deck handed in again** (`POST /room/<id>/deck`, D404's
  check unchanged): any 40+ cards of this seat's own picks plus basic lands. A
  player who changes nothing hands in the same deck. Both decks in is both
  players confirming; the next game starts then, as D404's did. A deck is
  accepted as soon as the game has a result, while the engine still lingers on
  the final board.
- **Play or draw: the loser of the previous game chooses** — Forge's own rule
  for a later game of a match (`GameAction.determineFirstTurnPlayer`: game 1 a
  coin toss whose winner chooses, game 2 on the loser of the last game). A fresh
  process has no last game, so the seats file names the `chooser`, and the
  table's controller (`TableMatch.TableController`, a `PlayerControllerHuman`
  with one method changed, made by a `LobbyPlayerHuman` whose
  `createIngamePlayer` is the 2.0.14 jar's own body with that class swapped)
  hands the coin-toss winner's `chooseStartingPlayer` to the chooser's with
  Forge's later-game wording: "*Sam*, you lost the last game. Would you like to
  play or draw?". The other seat is asked nothing. Game 1, and a game after a
  draw (nobody lost it), is the coin toss.
- **Scoring.** When the game ends the bridge writes `result.json` beside the
  seats file — the winning seat from Forge's outcome, else a claimed win
  (D403) or a lone concede, which M11 can end before any outcome exists. The
  room polls it (every 2 s) and scores the game: **a concede and a claimed win
  are losses**; a draw counts for nobody and the same game number is played
  again; a game whose engine stopped with no result (an abandoned table, a
  crash) does not count and is played again. Two wins take the match; the next
  pair of decks starts a new match. The room's state says the match (`match:
  {n, bestOf, wins, over, winner, next: {game, chooser}}`) and every finished
  game (`games`), so both rooms and both boards show the score.

**Rejected.**

- *Forge's match loop in one process.* Above: untested with two GUIs, the
  sideboard is not the room's rule, and one bad game would end the match.
- *The room asks the loser "play or draw?" and passes `--first <seat>`.* A
  second place to answer a question Forge already asks, and the answer would
  have to be forced onto Forge's coin toss anyway.
- *A seed chosen so the coin falls to the loser.* The flip is one draw among
  many of `MyRandom`; steering it would make the seed lie about the shuffle.
- *An automatic next game with the same decks.* Sideboarding is the point of
  games two and three, and "both confirm" is a deck each.

**Measured.** `mtgtable.TableMatch` with a seats file `match: {bestOf: 3,
game: 2, wins: [1, 0]}, chooser: 1` (seed 11, two automated seats, Pacho SHIELD
against Doom Legion): seat 1 alone was asked "Ben, you lost the last game. Would
you like to play or draw?", answered Play and took turn 1; both handshakes said
game 2 of 3 and the score from their own side; 43 turns; `result.json` named
seat 1, as both `over`s did; both logs pass check-redaction and
check-seat-pair. `tools/ws-two-humans.mjs`: `result.json` names seat 0 after the
`concede` and `claim` scenarios. `tools/draft-room-selftest.mjs` 3c (39 checks):
a whole match through the store and the room listener — a concede scored as a
loss, a sideboarded deck, the loser choosing, a draw replayed with a coin toss,
a game with no result not counted, 2–1 ending the match and the next decks
starting match 2. `tools/match-launcher-selftest.mjs` (11 new checks) and
`mtgtable.TableSelfTest` (15 new) hold the seats file's new keys; six
`fixtures/negative/redaction/m60-*` controls hold the wire. Gate step 10i's
automated game is now game 2 of 3 with a chooser.

**Also closed here (D408's open gap).** At a table of two the bridge's own
`wsPort` is `TableServer`'s loopback `/health` door, which answered `ok` to a
request carrying Cloudflare's headers. It now refuses them (403) on every path,
`/health` included, as `TunnelGate` does in every other mode; `tunnel-check`'s
three WARNs on it are FAILs, `web/test/tunnel.test.ts` holds both sides, and
`TableSelfTest` checks the real door (6 new checks). Measured on a real table
(`ws-two-humans.mjs`): `CF-Connecting-IP`, `CF-Ray` and
`Cf-Access-Jwt-Assertion` → 403 on `/health` and `/`, while the game played on.

