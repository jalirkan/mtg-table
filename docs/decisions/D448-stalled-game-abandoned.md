## D448 — A stalled game on a `--games N` server is abandoned with no result, and the session goes on

*Branch `pc/stalled-game-no-exit`. `node tools/decisions.mjs next` gave D448 on 2026-10-16 (D447 is
taken). Amends D286's idle limit for multi-game sessions only. Protocol amendment **M70**.*

**2026-10-16.**

**Context.** D286 gave a `ws` seat no game clock and one way out instead: `--idle-timeout` (3600 s
by default), the time with no `/ws` client connected, after which `MtgTable` printed `ABANDONED`,
threw `the game did not reach over` and exited 1 (`MTGTABLE FAILED`). That is right for one game
nobody is in. It is wrong for the PC's long-lived server (`play.sh --engine-only --funnel --games
6`, `--keep-open` by default): on 2026-10-16 a game whose seat no client ever took
(`ws connections = 0 accepted`) ran into the limit, the JVM exited 1 after `total wall = 3605504
ms` (`var/play/server.prev.log`), and play.sh, the draft room and the Funnel behind it went down
for hours until the unit was given `Restart=on-failure` (the cloud's note of a7a9675e in
`pc-results/HEARTBEAT.md`, and its #154 note in `pc-jobs`' README). A server meant to outlive its
games should not die of one nobody played.

**Decision.**

1. **Where.** On a `ws` seat of a session with `--games N`, N > 1 (`MtgTable.abandonsStalled`),
   a game whose seat has had no `/ws` client for `--idle-timeout` seconds is **abandoned**: ended
   with no result, and the session goes on. A single game (`--games 1`, the default) keeps D286
   exactly — `ABANDONED: no client connected for N s, so the session ends`, exit 1 — because a
   stalled single game *is* a failure there; gate step 10h holds that half unchanged. The console
   seat and the recorders have no idle limit and are untouched; `--game-timeout`'s wall clock is
   the wedged-engine limit, never an absence, and still fails the run.
2. **How the engine ends it: the concede path, on the EDT.** The main thread's loop
   (`MtgTable.playGames`, extracted so it can be driven with a fake clock) calls
   `WireGuiGame.abandonForAbsentSeat`, which posts onto the EDT -- where every act runs -- a warn
   `notice` titled `Game abandoned` in the bridge's own words, then `concede(c)`: the `act:
   concede` path exactly as a client's, and as `concedeForAbsentSeat` (D403). D136 decides how:
   applied whole when `ActGuard` says the engine is quiet on this seat, else the outcome now and
   `Game-0`'s own state-based check for the rest (parked asks answered with their default).
   Forge's outcome event then reaches `captureOutcome`, whose hop (D39, "only at game end") runs as
   after any concede. **No fourth hop**: nothing new calls `invokeInGameThread`, nothing walks a
   view off the game thread, and the lint's `HOP_ALLOW` is unchanged (hard rule 3). A reset
   (`restartMatch` over a running game) was rejected: it leaves `Game-0` parked on an input that
   nothing will ever answer, and the next game would start beside it.
3. **What the wire says: no result.** The concession is only the engine's way out — an absent
   player did not lose a game — so `emitOver` sends amendment M11's null body,
   `{winner: null, reason: null, matchOver: true}`, for the game it was told was abandoned (by id,
   so the reset hook between games has nothing to clear). No new `reason` value: the null body
   already means "this game has no result", every reader treats it so (the board prints *No
   result*; `tools/ml/encode.game_outcome` calls it unlabelled, so `human_collect.py` never copies an
   abandoned game into the human test set as a loss), and `check-redaction.mjs` needs no change.
   The `Game abandoned` notice in front of it is the marker, as `Engine error` is M46's. The final
   `state` still carries Forge's own `gameOver` (the concession); a reader that wants the result
   reads `over`, which is §7's rule already.
4. **What follows: as after any `over`, except that nobody is there to ask.** The abandoned game
   counts as one of the N. If it was not the last, the server starts the next game itself —
   `WireGuiGame.newGameAfterAbandon`, `act: newGame {mode:"restart"}` on the EDT, queued behind
   Forge's wind-down when it must be (D114) — because waiting for a `newGame` with no client would
   end the session 30 s later, which is the outage this exists to prevent. `restart` is a fresh
   match, so the concession counts in no score. If it was the last, `--keep-open`'s linger runs as
   after a played game (`KEEP_OPEN_MS` with nobody connected), and the session then ends cleanly:
   `MTGTABLE OK`, exit 0. A game that cannot be conceded — the engine has not asked the seat
   anything yet (`inputSeen`), or no `over` comes within `ABANDON_OVER_MS` (60 s) — or a next game
   that does not begin within `NEXT_AFTER_ABANDON_MS` (60 s) fails the run as before.
5. **Who was there, in the log.** The `STALLED GAME n` line names the client that began the game
   (or first took the seat during it), as `WS CONNECT` prints it — address and connection number —
   and the last client's connect time, the time it last sent a frame and the time it left, in UTC
   (`WsTransport.clientLine`); or `no /ws client ever connected to this session`. The session
   header has no client id to give; the peer is what the log already records. The summary prints
   `stalled games = k`.
6. **`/health` counts them in a header.** `GET /health` gains `X-Stalled-Games: <k>` on every
   answer; the body stays exactly `ok` / `starting`, because the gate's poller requires `ok`
   verbatim and play.sh matches `ok*`, and ForgeCoach is another repository's reader.
7. **The test.** `mtgtable.StalledGameSelfTest`, in `bridge/build.sh` (78 checks): `playGames`
   over a fake seat whose clock moves only when the loop waits on it — a client opens game 1 of 2
   and leaves at 600 s; the game is abandoned within one poll of 4200 s and not before; the line
   names the client and when it last spoke; `/health`'s count is set; the server starts game 2
   itself; game 2's client holds the seat for twice the limit with no abandonment and concedes; the
   session ends at `--keep-open`'s disconnect, finished — plus a single game that still fails with
   10h's line, a game that cannot be conceded, a wall-clock timeout that is not an abandonment, an
   abandoned last game that lingers and ends cleanly, and a socketless transport that never
   abandons; and a real `WsTransport` with raw clients for `clientLine()` and the header. No engine
   (CI's `bridge` job runs it). Three mutations fail it (no abandonment for N > 1, the idle clock
   not reset by a connected client, no next game started). The idle limit needed no new knob:
   `--idle-timeout <sec>` (D286) is already read once at startup, and the self-test passes its
   seconds straight to the loop.

**Run on the real engine** (2026-10-16, worktree `mtg-table-stall`, the pinned 2.0.14 jar): `MtgTable
--transport ws --games 2 --keep-open --idle-timeout 4 --seed 42 --game-id stall-e2e`, a Node client
that took the seat, pressed OK through the coin toss and the mulligan, saw turn 1's `MAIN1` and
left. Four seconds later: `STALLED GAME 1 (stall-e2e): no client connected for 4 s -- began by
/127.0.0.1:52002 (connection #1); the last client … last spoke 2026-10-16T19:55:16.063Z, left
2026-10-16T19:55:16.171Z`; the concede applied at once; game 1's log ends `notice {warn, "Game
abandoned"}`, the concession's `state`, `over {winner: null, reason: null, matchOver: true}`; `NEW
GAME REQUESTED mode=restart`; `/health` 200 `ok` with `X-Stalled-Games: 1`; a second client took
game 2 (`stall-e2e-g2`), conceded, left; the session ended `finished = true`, `stalled games = 1`,
`MTGTABLE OK`, exit 0. `check-redaction.mjs` passes both logs (game 1: 62 cards checked, 27
redacted, the opponent's whole hand), and `encode.game_outcome` reads game 1 as unlabelled.

**Not done.** `NO_CLIENT_ASK_TIMEOUT_MS` (120 s, PLAN.md's M3 follow-up "has never fired") is not
exercised by any of this — the run's engine was parked on an input, not an ask — so that
follow-up stays open. No gate step plays an abandonment on the real engine; 10h could grow a third
session for it.

**Rejected.** A new `over.reason` value such as `"Abandoned"`: every existing reader would count it
as a draw with a reason (`human_collect` would copy it as one), where the null body is already
read as "no result" everywhere. Not counting an abandoned game toward N, so an unattended server
cycles for ever: that undoes D286's reason for the limit (no JVM held for a session nobody is in),
and play.sh's match launcher already sleeps the engine when a session ends (D308). A JSON
`/health` body: it breaks the gate's exact `ok` and an unknown reader in ForgeCoach.
