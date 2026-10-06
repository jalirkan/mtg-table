## D404 — The draft room takes each player's deck, checked against that player's picks, and starts the game between them with a seat token per player per game

*Branch `c/room-decks`.* Phase 2 of play-with-a-friend, the room's half (D402 is the bridge's). Amends D400 (the room gains a route and three state keys) and D303 (the match launcher gains a table request, and refuses `POST /match` while a game between two people runs) and D308 (a wake never restarts a friend's game).

**2026-10-06**

**Context.** After a draft in the room (D400) each player builds a 40-card deck
from their own picks in ForgeCoach's deck editor. The bridge can now seat two
people (D402), each behind a token per seat per game. Something has to take
each deck privately, check it is made of that player's own picks, mint the two
tokens, start the engine, and hand each player their own token — over a channel
the player already trusts, which only the room has.

**Decision.**

- **`POST /room/<id>/deck`** on the room listener, behind the seat's
  `X-Room-Token` like every room route: `{name, main: [[n, card]…],
  sideboard?: [[n, card]…]}`, at most 16 KB (the other seat routes keep 1 KB).
  The shape is the match launcher's (`checkDeck`: a deck name and card names
  from the strict patterns, 40–250 main-deck cards). Then **every card of the
  main deck and the sideboard together must be one this seat drafted, as many
  times as it drafted it** — names compared without their `|SET` and folded —
  except the basic lands (and their snow-covered kin), which a paper table hands
  out freely. Wrong: 400 `{code: "deck", problems}`. Before the draft is over:
  409 `drafting`. While a game between them is starting or being played: 409
  `playing`.
- **What each seat sees.** The room state gains `decks: [{ready, name, cards}] ×
  2` — the other player's deck by name and count only, as `hello_ok.match`
  names it (M44) — `yourDeck`, this seat's own list, to this seat alone, and
  `game`. A grid draft has no hidden information, but a deck is a choice made
  from the pool, and it stays the player's until the cards are played.
- **Both in, a game starts — no button.** When both seats are `ready`, the room
  mints **two fresh 128-bit seat tokens for this game** and calls the match
  launcher's `startTable` (in the same process) with both decks, both names and
  the two tokens' **SHA-256 digests**. The launcher writes
  `var/match/<id>/seat0.dck`, `seat1.dck` and `seats.json` (names and digests:
  no token is ever on disk or on a command line), then the D303 request
  (`{humans: 2, deck, deck2, seats, games: 1}`) and SIGUSR1; `play.sh`
  re-checks the three paths, restarts the bridge with `--humans 2 … --seats-file
  … --table-port <tablePort> --games 1 --game-id friend-<id>` (plus `--lan` on a
  `--lan` run, and nothing of the AI or the site), waits for `/health`, and
  reports the table's port from the bridge's `TABLE LISTENING` line. The room's
  `game` goes `starting` → `ready` (or `failed`, with the launcher's reason, and
  both decks have to be handed in again).
- **Each player's token through their own stream.** `game.token` is in a seat's
  state only, only for its own seat, only while the game is `ready`. Game tokens
  live in the room's memory and nowhere else: not in `rooms.json`, not in a log.
  A helper restart keeps the room and forgets the tokens — the players' browsers
  keep theirs, which is all a running game needs.
- **The seat is on the room's own origin.** A player opens
  `ws(s)://<the room page's host>/ws?seat=<token>` — never the table's port by
  number. The room listener passes a `/ws` upgrade, byte for byte, to the table
  port of the game being played (on loopback; 404 when none is, 502 when it does
  not answer), adding the client's address as `CF-Connecting-IP` for the table's
  wrong-token limit (replacing any the client sent, unless the client is a
  loopback peer — a tunnel daemon — that named one). The table checks the token
  and the `Origin` itself, before any handshake. Through a tunnel the same URL
  is routed to the table port directly by D405's GAME SEAT rule, so one page
  works on a LAN and behind Cloudflare alike, and the table port need not be
  reachable from the network at all.
- **A rematch is two more decks.** The decks are spent on the game they started
  (`ready` goes back to false); handing in two again — the same or changed —
  starts game 2 with fresh tokens, once the engine says the first is over. Best
  of three, with sideboarding between games, is Phase 3.
- **The engine is the owner's, and a friend's game is protected while it runs.**
  The room starts it without asking the owner, because the owner made the room
  and drafted in it. While it runs, `POST /match` is 409 (it would end their
  game); `/engine/start` was already "running: nothing restarts". A wake after
  the game restarts the last match against the AI (`LAST_AI_ARGS`), never the
  friend's game, whose tokens are spent; a friend's game that fails to start
  leaves the engine asleep rather than restoring it.
- **`/health`** on the coach helper says `roomGames: 1` beside `draftRoom: 1`.
- **D405's requests, met here:** the coach helper refuses any request that
  carries a tunnel's headers (`CF-Connecting-IP`, `CF-Ray`,
  `Cf-Access-Jwt-Assertion`; `admit`, first), and `scripts/tunnel/policy.mjs`'s
  GAME SEAT is confirmed (`tablePort` 8646, `^/ws$`, no longer a placeholder;
  the template carries the rule uncommented).

**Rejected.**

- *The owner presses Start.* One more round trip for nothing: both players have
  said they are ready by handing in their decks.
- *Tokens in `rooms.json`, or derived from the room tokens.* A file the owner's
  other processes can read would hold a key to the friend's seat; a derivation
  ties a game's seat to the room's link forever. Memory is enough for a session.
- *The deck through `POST /match` on the coach helper.* That is the owner's
  door, never tunnelled (D386); the friend has no business there.
- *Checking decks only in ForgeCoach.* A client is a convenience; the room is the
  authority on what each seat drafted.

**Measured.** `tools/draft-room-selftest.mjs` (179 checks, 44 new; among them
the `/ws` passthrough against a stand-in table — the request as sent, the
client's address added once, 404 for another path or no game, 502 for a table
that does not answer — and both decks handed to the launcher in the shape its
own `checkDeck` takes): after a full
18-grid draft, a deck of the other seat's picks, two of a card drafted once, a
card in both the main deck and the sideboard, 39 cards, an unknown field, a bad
name, 17 KB and a wrong token are refused; seat 0's deck goes in and seat 1 sees
its name and count and no list; the second deck starts one game with both decks
in seat order and the two tokens' digests; each stream carries its own token and
never the other's; no token on disk or in the log; a deck during the game is
409; a game that fails says why; a rematch has fresh tokens; a restart keeps the
game and drops the tokens. `tools/match-launcher-selftest.mjs` (188 checks):
`startTable` against `play.sh` and its fake engine — `--humans 2`, both decks,
the seats file of names and digests, the table port, one game, `friend-<id>`, no
AI or site flags, no name on a command line; `POST /match` is 409 while it runs;
the wake after it starts the AI match.
