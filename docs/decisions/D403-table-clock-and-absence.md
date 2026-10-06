## D403 — A table's clock and an absent player: three minutes a decision, then the engine's default; nothing answers for someone who is away, and after two minutes their opponent may claim the win; no observers

*Branch `c/two-humans`.* Companion to D402 (the table) and protocol amendment **M59**. Amends D286 (a human seat has no wall clock) for a table of two, D24 (a disconnect answers parked asks with their defaults) for a table seat, and M50 (`/observe`) for a table.

**2026-10-06**

**Context.** Against the AI, the only person waiting on a slow player is the
player, so D286 gave a human seat no clock, and a dropped socket answered parked
asks with their defaults so the engine could not wedge (D24). At a table of two
the other person is waiting, and answering for an absent player decides their
game for them. The opponent also needs to know what is going on: thinking, gone,
or about to run out of time.

**Decision.**

- **A `table` frame** tells each seat who is connected, who the engine is waiting
  on (`deciding`: an input up on that seat's queue or an ask parked in its pool,
  sampled five times a second), that seat's clock, and whether this seat may
  claim the win. It goes out when any of it changes, from the main thread, and is
  re-sent on a reconnect. "Sam is thinking" is `deciding`; "Sam is away" is
  `awaySince`.
- **A decision clock, 180 s by default** (`--decision-timeout`, 0 off). It runs
  only while the deciding seat is connected, and restarts whenever the engine
  pushes that seat a new prompt or asks it something — a player clicking through
  a multi-card choice is not timed out mid-way. When it runs out, the decision
  gets the answer nobody chose: an outstanding ask is answered `null` (§5.4, the
  default a dropped connection used to give), and an input gets OK when OK is
  enabled and Cancel otherwise — the console's empty line. Both seats are told
  "Time's up". Three minutes is long for a priority pass and enough for a
  complex turn's single decision; it exists so one person cannot hold the other
  hostage, not to make anyone hurry.
- **Away pauses; it never answers.** A seat with no socket is away. Its asks
  never time out (no 120 s `NO_CLIENT_ASK_TIMEOUT_MS`, no `cancelAll` on its
  disconnect) and its clock does not run, so when it is that seat's decision the
  game simply waits; the other seat's decisions go on as normal. A reconnect by
  token resumes exactly where it was (the cached handshake, state, table and
  input, and every outstanding ask, M10).
- **After 120 s away** (`--seat-grace`), the opponent may **claim the win**:
  `table.canClaimWin`, then `act: claimWin`, which concedes for the absent player
  through the seat's own concede path. Earlier it is refused, "Not yet". This is
  the simplest policy that is robust both ways: a phone that sleeps for a minute
  loses nothing, and a friend who leaves for good cannot strand the other at the
  board. Nobody is conceded automatically, because a pause a player chose (a
  doorbell) and a pause a network chose look the same from here.
- **Both gone ends the session.** D286's idle limit (an hour, `--idle-timeout`)
  counts a table as empty only when neither seat has a socket.
- **A concede is applied at once when the engine is parked on either seat.**
  D136 applied a concede whole only when the engine was quiet on the conceding
  seat; at a table the engine is just as quiet inside the other seat's
  `showAndWait()`, so D136's guard is asked of the other seat too, with this
  seat's own hops still counted. Otherwise the outcome is written as before, and
  parked asks of both seats are answered with their defaults so `Game-0` reaches
  the state-based check that ends the game.
- **No observers.** `/observe` is a copy of one seat's stream, so a follower sees
  that seat's hand; at a table there is nobody it would be safe to show to the
  other player, so the table port does not have it (404: it serves `/ws` and
  nothing else) and the bridge's own port serves only `/health`. Watching both hands would be a new redaction mode, which
  endpoints.md change 5 says not to invent; a one-seat spectator link is a later
  decision if anyone wants it.

**Rejected.**

- *A chess clock (a bank per player per game).* Fairer for tournaments, more state
  and more UI; one game between friends needs only a backstop.
- *Auto-passing an absent player's priority.* It decides their game: a land not
  played, a block not made, an ask answered for them.
- *An automatic loss after the grace.* A player who came back at minute three
  would find their game gone without the opponent having chosen that.
- *Keeping D24's `cancelAll` on disconnect.* A browser refresh would spend the
  player's decisions — exactly what D24's own follow-up feared.

**Measured.** `tools/ws-two-humans.mjs`, against the real engine (seed 5, Pacho
SHIELD against Doom Legion), each about 12 s and each auditing both seat logs:
`concede` — a wrong token, no token, `/observe` and the health port refused; seat
0 dropped at turn 3, was shown away to seat 1, reconnected by token to a
`hello_ok` with the same `gameId` and a full state at once; a second seat-1
socket replaced the first (4002); seat 1's concede at turn 6 ended both streams
with seat 0 the winner. `claim` (`--seat-grace 3`) — seat 1 left at its own
decision; no state for 2 s (paused) while the table said it was away and
deciding; an early `claimWin` was refused "Not yet"; the claim after the grace
ended the game. `timeout` (`--decision-timeout 3`) — seat 1 sat on its priority;
the default was taken after 3,247 ms and both seats were told "Time's up".
