## D453 — The search hint at a table of two: each seat asks the draft room (`POST /room/<id>/hint`), for its own log only

*Branch `pc/hint-table-of-two`. ForgeCoach's half is branch `pc/search-coach-friend` there. D452 is
not used: it is the last number of D450's reserved block (D450–D452), which stays unused (D200).*
Amends **D429** (the hint refused every game between two people) and extends **D407** (each seat's
own things, through the room, behind its own token) to the live game. Builds on **D402** (a table
of two writes one redacted log per seat) and **D404** (the room starts the game).

**2026-10-17**

**Context.** Justin, 2026-10-17: the Search AI coach must work at a table of two as well, for both
players, each seeing only their own hint. Until now it was refused there on purpose: the helper's
`POST /hint` 403s every `friend-…` game, because a seat's log holds that player's hand and the
helper's port is the host's door (D386) — the host's page could ask for the friend's hint, and the
friend's browser, on another machine, cannot reach `127.0.0.1:8643` at all. ForgeCoach gated its
coach on `againstAi` for the same reason.

**Decision.**

- **The route is the room's.** `POST /room/<id>/hint` on the draft room's listener (`roomPort`,
  8644), behind the seat's `X-Room-Token`, a loopback peer included — the door D407 already uses
  for a seat's review and log. The helper's own `/hint` keeps refusing every `friend-…` game,
  unchanged; the hint runner takes a friend game only through `post(q, {room: true})`, an option
  the room's wiring passes and no request can set.
- **The seat is the token's, the game is the room's.** The room names the log itself:
  `var/games/friend-<matchId>-seat<N>/frames.jsonl` for the game it is playing now and the token's
  seat — never the other seat's log, never a name from the request. The body is `/hint`'s
  (`stateSeq`, `inputSeq`, `budgetMs`); a `gameId` is accepted only as that game's own id
  (`friend-<matchId>` or that seat's log name, else 409 `game`), a `seat` only as the token's
  (else 403 `seat`); no game being played is 409 `no-game`. The runner's own seat check (the log
  header's seat) runs after it.
- **The opponent is modelled from the room.** `oppPool` / `oppKnown` from the page are refused
  (400). The room sends the cube list minus this seat's own picks as the pool (one copy a name;
  under 80, none, and the answer says `basic-lands`) and the other seat's picks as the cards
  drawn first. A grid draft is face up, so both are what this player saw; the other seat's deck,
  which the room holds, is never read. `HiddenPool.checkLive` runs as on every hint.
- **Everything else is D429's.** One runner, one engine (`coach-grade.sh serve`, `nice -n 10`, its
  own Forge home), the same queue, the same answer and refusals. Each seat's log is its own queue
  key, so one seat's hint never supersedes the other's.
- **Availability is in the room's state.** `"hint": 1|0` in each seat's state (the helper has a
  hint runner and the bridge is built); a friend's page reads this, not the helper's `/health`.
  A helper from before D453 has neither the key nor the route (404), and ForgeCoach treats both
  as off.
- **Limits.** The room's per-seat limits, plus 30 hints a seat a minute past a burst of 10 (429
  `slow`); a 1 KB body.
- **Not gated on recording consent (D407).** The hint reads the working log the bridge writes for
  every game (D402) and keeps nothing: its moment file is replaced by the next hint. Consent
  governs what is kept and reviewed; a seat that opted out still gets its own hints.

**Rejected.**

- *Opening the helper's own `/hint` to friend games.* That is the owner's door: the owner's page
  could ask for the friend's hint (the friend's hand, read through the engine's choice), and the
  friend's browser cannot reach it, loopback-only by D386. D407 rejected the same for reviews.
- *An omniscient hint* (the bridge's view of both hands, or the other seat's deck as the
  opponent's list). It would tell a player what their friend holds — the very leak hard rule 8
  exists to prevent — and HiddenPool's live guard refuses a deck list for the same reason.
- *Taking the pool from the page* (as `/hint` does against the AI). The room already holds the
  cube and both seats' picks; the page's copy could only be stale or wrong, and a 256 KB pool
  body does not fit the room's 1 KB seat bodies.
- *Gating the hint on the seat's recording consent.* Nothing is recorded; refusing would cost the
  player the coach for no privacy gain.

**Measured.** `tools/draft-room-selftest.mjs` §3d (28 checks): each seat's hint asked of its own
log with its own seq; the pool the cube minus that seat's picks, the known cards the other seat's
picks; `oppPool`/`oppKnown`/unknown fields 400, another seat 403, another game's id 409, none of
them reaching the engine; no game 409; off 503 and `hint: 0`; one seat past its limit 429 while
the other is still answered; no token 403. `tools/hint-runner-selftest.mjs` (12 new checks):
the runner refuses a friend log without the room's option, answers it with it, still checks the
header's seat; the helper's `/hint` still 403s a friend game; and through a real room listener
wired as the helper wires it, each seat's hint reads its own seat's log and no other (the fake
engine's moment file). No engine was run: Justin's live game held the engine unit.
