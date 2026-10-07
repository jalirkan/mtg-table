# The draft room — grid-draft a cube with a friend

**D400.** Two people grid-draft a cube against each other, each from their own
browser, with the owner's machine holding the draft. ForgeCoach's **Draft → Draft
with a friend** is the client. `tools/draft-room.mjs` is the server and its header
is the contract; this page is the copyable form of it. `tools/draft-room-selftest.mjs`
holds it (gate step 12f, CI).

## Run it

```bash
./scripts/play.sh --engine-only --lan --draft-room
```

- **You** open ForgeCoach (`https://jalirkan.github.io/ForgeCoach/`, or the page
  play.sh prints), go to **Draft → Draft with a friend**, pick a cube, give your
  name and press **Create room**. The page shows your friend's link, one for
  each address this machine has on the network. Copy it and send it.
- **Your friend**, on the same Wi-Fi, opens that link:
  `http://<your LAN IP>:8644/#draft/friend/join?room=<id>&t=<their seat token>`.
  The page comes from your machine (the room listener serves ForgeCoach's site).
  They type a name and press **Join**.
- You draft. Each of you can ask your own coach about a pick; the advice is
  private to the browser that asked. When the 18 grids are done, each of you
  builds a deck from your own pool in the usual deck editor and presses **Hand
  in this deck**.
- When both decks are in, the room starts the game on your machine's Forge (about
  15 s), and both pages open the board, each on its own seat (below, *Phase 2*).
  The game's seats are reached on the room's own port: the room listener passes
  `/ws` through to the bridge's table port (`config.json` `tablePort`, 8646,
  `--table-port`) on this machine, so a firewall needs only 8644 open to the
  home network.

Without `--lan`, the room listener answers this machine only (two browsers on one
PC, or a tunnel later). `--room-port <n>` or `config.json` `roomPort` moves it off
8644. A reload or a dropped connection reconnects by itself: the page keeps the
seat token in that browser's storage, and the room keeps every pick. Rooms live in
`var/draft-room/rooms.json` and survive a restart. A room expires 24 hours after
its last pick, and 72 hours after it was made.

## Who may call what

| Listener | Route | Door |
|---|---|---|
| Coach helper (8643) | `POST /room`, `GET /room` | The owner's door (D386): loopback with a loopback `Host`, or the `--lan` pairing token. It is never tunnelled. Only the owner makes rooms. |
| Coach helper (8643) | `POST /room/<id>/close`, `POST /room/<id>/friend-link` (D408) | The same owner's door. Only the owner closes a room or replaces the friend's link; the room listener has no such route. |
| Room listener (8644) | `GET /room/<id>`, `GET /room/<id>/events`, `POST /room/<id>/join`, `POST /room/<id>/pick`, `POST /room/<id>/deck` (D404), `POST /room/<id>/record`, `GET /room/<id>/review/<matchId>`, `GET /room/<id>/log/<matchId>` (D407), `POST /room/<id>/bug` (D411) | The seat's token in `X-Room-Token`, **always**: a loopback peer gets no exemption, because a tunnel daemon connects from 127.0.0.1. `Origin` must be absent, on `wsAllowedOrigins`, the page's own (`http(s)://<Host>`), or a `--room-origin`. There is no `Host` check, because the token is the lock and a tunnel's name must pass. |
| Room listener (8644) | `GET /`, `GET /assets/…` | No token. These are ForgeCoach's public build (`--room-site-dir`, which play.sh fills with the `--lan` download or `--site-dir`). Only GET and HEAD are allowed, and a path cannot leave the folder: `..`, encoded separators and symlinks are refused. |

Tokens are 128 bits (22 base64url characters). The server stores only their
SHA-256 digests and compares them with `crypto.timingSafeEqual`. A token is never
in a URL the server sees: the join link carries it in the `#fragment`, and the page
moves it to local storage and out of the address bar. No log line holds one.

Limits:

- 120 requests a minute per seat, with a burst of 60.
- 1,200 requests a minute in all.
- 10 wrong links a minute per address, then 429 for the rest of that minute. Behind
  a tunnel, a loopback peer's `CF-Connecting-IP` names the address.
- At most 3 event streams per seat and 32 in all.
- Seat bodies of at most 1 KB (a deck, 16 KB), and a create body of at most 256 KB.
- At most 16 live rooms.

## Wire format

### `POST /room` (coach helper)

```json
{ "cubeId": "synergy", "cubeTitle": "Synergy Cube", "cards": ["…every name, in document order…"],
  "name": "Justin", "firstSeat": 0, "record": true }
```

`cards` holds 9–2,000 names, each 1–150 characters with no control characters;
duplicates are dropped and the first one kept. `firstSeat` (0 or 1) opens grid 1;
when it is absent, a random seat opens. `name` is 1–24 characters. `record`
(D407, optional, false when absent) is the room's default for recording each
seat's games — each player can still opt their own seat out, game by game. Any
other field is a 400.

→ `201`

```json
{ "ok": true, "id": "rAbC12_x", "seat": 0, "token": "<seat 0>", "friendToken": "<seat 1>",
  "cube": { "id": "synergy", "title": "Synergy Cube", "hash": "<sha256 hex>", "size": 540 },
  "grids": 18, "expiresAt": "…", "roomPort": 8644,
  "bases": { "local": "http://127.0.0.1:8644", "lan": ["http://192.168.1.5:8644"], "public": null } }
```

`cube.hash` is the SHA-256 of the de-duplicated names joined by `\n`. A client
can check that its copy of the cube is the room's. `bases.lan` is filled only with
`--lan`, with home networks first. `bases.public` is `--room-public-url`, which is
for a tunnel later. Errors: `400 {code:"bad"}` and `429 {code:"full"}`.

`GET /room` returns `{ok, rooms: [{id, cubeId, joined: [bool, bool], grid, done, expiresAt}]}`.
It carries no tokens.

### Revoking (D408, coach helper)

- `POST /room/<id>/close` → `200 {ok, id, closed: true}`. The room leaves memory
  and `rooms.json` at once: both links are `404 gone`, now and after a restart,
  and every open stream gets `event: gone`. A game between the two that is being
  played keeps its table until it ends (its seat tokens are per game); the room's
  port stops passing `/ws` to it.
- `POST /room/<id>/friend-link` → `200 {ok, id, seat: 1, friendToken, roomPort, bases}`.
  The friend's seat gets a new token: the old link is `403 token` at once, and
  after a restart (`rooms.json` holds the new digest), and the friend's open
  streams on it get `event: revoked`. The seat keeps its name, picks and deck.
  ForgeCoach shows the new links from `bases`, as after `POST /room`.
- Both are `404 {code: "gone"}` for an unknown room, POST only, with a body of at
  most 1 KB (ignored). `/health` says `"roomRevoke": 1`.

### The seat's state (room listener)

```json
{ "v": 1, "id": "rAbC12_x", "version": 7, "you": 1, "format": "grid",
  "cube": { "id": "synergy", "title": "Synergy Cube", "hash": "…", "size": 540 },
  "grids": 18, "g": 2, "slots": ["Card", null, "…9 entries…"], "firstLine": 3,
  "firstSeat": 0, "toAct": 1, "done": false,
  "seats": [ { "name": "Justin", "joined": true, "online": true, "picks": ["…"] },
             { "name": "Sam", "joined": true, "online": true, "picks": ["…"] } ],
  "log": [ { "n": 1, "seat": 0, "grid": 1, "line": 4, "cards": ["…"] } ],
  "createdAt": "…", "expiresAt": "…", "seed": null }
```

- Lines are numbered 0–2 for the rows and 3–5 for the columns, as in ForgeCoach's
  `LINES`.
- `version` goes up on every join and pick.
- Both seats see the same state, apart from `you`. A grid draft has no hidden
  information, so each seat sees the other seat's picks.
- The grids still to come, and the `seed`, are not sent until the draft is over.
  At the end, `seed` lets a client re-deal and replay the whole draft with
  ForgeCoach's own `draft.ts` and confirm that it matches.

### Routes

- `GET /room/<id>` → `200` state.
- `GET /room/<id>/events` → `200 text/event-stream`. It sends `event: state` with
  `data: <state>` straight away and after every change (including the other
  seat's `online` flag), a `: ping` comment every 15 s, and `event: gone` when the
  room expires or its owner closes it, and `event: revoked` when the owner made a
  new link for this seat (D408). The client reads it with `fetch()`, because
  `EventSource` cannot send a header.
- `POST /room/<id>/join` `{"name"?: string}` → `200` state. It is idempotent, and
  sending a new name renames the seat.
- `POST /room/<id>/pick` `{"line": 0-5, "expect": <state.version>}` → `200` state,
  or one of these errors:
  - `409 {code:"stale"}`: `expect` is not the room's current version.
  - `409 {code:"turn"}`: it is not this seat's pick.
  - `409 {code:"waiting"}`: the second seat has not joined yet.
  - `409 {code:"done"}`: the draft is over.
  - `400 {code:"illegal"}`: the line was already taken, or it has no cards left.

  Every `409` and `400` carries `state`, the room as it is now.
- `POST /room/<id>/bug` (D411) → `201 {ok, id, screenshot}`: a bug report from
  this seat's page (ForgeCoach's "Report a bug"; `tools/bug-reports.mjs` has
  the body), saved on the owner's machine in `var/bugs/<id>.json`, with the room
  and this seat recorded and the seat's token scrubbed out of it. The body may
  be up to 6 MB, because it holds the last frames of this seat's log and an
  optional screenshot. Each seat may send three in a burst, then one about
  every three minutes (`429 {code:"slow"}`). `400 {code:"bad"}` is a body that
  is not a report, `507 {code:"full"}` means the owner's folder is full, and
  `404 {code:"off"}` means this listener has no bug store.
- Other errors: `403 {code:"token"}`, `404 {code:"gone"}` (no such room, or it
  expired), `403 {code:"origin"}`, `413`, `429 {code:"slow"|"streams"}`.

## The rules, and how the two implementations stay in step

The server's grid draft is ForgeCoach's `src/draft/draft.ts`, which is the cube
lab's `tools/cubelab/draft.ts`:

1. The deal is `rng(seed, "grid")` (sfc32 seeded through splitmix32, from
   `tools/cubelab/rng.ts`) shuffling the de-duplicated names. The first
   `9 × min(18, floor(n/9))` cards are dealt into grids.
2. The first drafter takes a line that has cards. The second takes another line
   that has cards, and the rest of the grid is discarded.
3. The first pick alternates grid by grid.

`fixtures/draft-room/grid-golden.json` is written by ForgeCoach's `draft.ts`: six
deals and six whole drafts, with seeds up to 5×10⁹ and both opening seats. It is
committed in both repositories (ForgeCoach's copy is
`src/draft/testdata/grid-golden.json`). Each side's tests must reproduce every case,
so a change to either implementation fails a test somewhere. This repository's
self-test also draws the server's `rng` side by side with `tools/cubelab/rng.ts`.

## Phase 2: playing the decks against each other (D402, D403, D404)

When the 18 grids are done, each player builds a deck from their own pool in
ForgeCoach's deck editor and hands it to the room. When both decks are in, the
room starts a game between them on this machine's Forge, and each player's page
connects to their own seat.

### `POST /room/<id>/deck` (room listener)

```json
{ "name": "Izzet Tempo", "main": [[1, "Lightning Bolt"], [1, "Counterspell"], [8, "Island"], [8, "Mountain"]],
  "sideboard": [[1, "Pyroblast"]] }
```

- The seat's `X-Room-Token`, as every room route. At most 16 KB.
- The deck shape is the match launcher's (`docs/match-launcher.md`): a name, 40–250
  main-deck cards, `[count, cardName]` pairs. **Every card of the main deck and the
  sideboard together must be one this seat drafted, no more often than it drafted
  it**; basic lands (and the snow-covered ones) are free.
- `200` state; `400 {code: "deck", problems, state}`; `409 {code: "drafting"}` before
  the draft is over; `409 {code: "playing"}` while a game between you is starting or
  being played. A deck handed in again replaces the earlier one until the game starts.

### What the state adds

```json
"decks": [ { "ready": true, "name": "Izzet Tempo", "cards": 40 }, { "ready": false, "name": null, "cards": null } ],
"yourDeck": { "name": "Izzet Tempo", "main": [[1, "Lightning Bolt"], "…"], "sideboard": [[1, "Pyroblast"]] },
"game": { "n": 1, "state": "ready", "error": null, "matchId": "m1791306948840",
          "tablePort": 8646, "token": "<THIS seat's seat token>" }
```

- `decks` — each seat's deck for the next game: whether it is in, its name and its
  card count. The other player's list is never sent.
- `yourDeck` — this seat's own list, to this seat alone.
- `game` — `null` until both decks have been in once. `state` is `starting`, then
  `ready` (or `failed` with `error`, and both decks go in again; `unavailable` when
  this coach helper was not started by `scripts/play.sh` and so cannot start an
  engine). **`token` is this seat's seat token for this game, in this seat's state
  only, only while `ready`.**

### Playing

The page connects to `ws(s)://<the room's host>/ws?seat=<token>` — `/ws` on the
room's own origin, which the room listener passes, byte for byte, to the bridge's
table port on loopback (D404; 404 when no game is being played). The table (D402,
protocol amendment **M59**) checks the token and the `Origin` before any
handshake, every seat needs its own token, and loopback gets no exemption. The
owner's page on github.io connects to `ws://127.0.0.1:8644/ws?seat=…`; the friend's
page, served by the room listener at `http://<LAN IP>:8644`, to
`ws://<LAN IP>:8644/ws?seat=…`; through a Cloudflare tunnel, to
`wss://<the tunnel's name>/ws?seat=…`, which the tunnel routes to the table port
itself (D405's GAME SEAT rule). Each player's stream is that
seat's alone, redacted for it (hard rule 8): the other hand, library and face-down
cards are never sent to the other browser. A `table` frame says who is connected,
whose decision it is and that decision's clock (three minutes, then the engine's
default), and an absent player's opponent may claim the win after two minutes away
(D403). The next game of the match is two decks handed in again (Phase 3, below).

The tokens are minted per game, in memory only: `rooms.json` never holds one, and
the bridge is given only their SHA-256 digests (`var/match/<id>/seats.json`).

## Phase 3: best of three, recording and reviews (D406, D407)

### The match

The room runs a **best of three**, one engine start per game (D406). Game 1
starts when both decks are in, as above. When it ends the bridge writes
`var/match/<id>/result.json` (the winning seat), the room scores it within two
seconds and both rooms and both boards show the score. For the next game each
player **hands in a deck again**: the same one, or sideboarded — any 40+ cards
of their own picks plus basic lands, checked exactly as above. Both in, the next
game starts, with fresh seat tokens. The loser of the previous game is asked
Forge's own "*you lost the last game: play or draw?*" on their board; game 1 is
Forge's coin toss. A concede and a claimed win are losses; a draw is played
again; a game whose engine stopped with no result does not count. Two wins take
the match; the next pair of decks starts a new one.

What the state adds:

```json
"game":  { "…": "as above", "game": 2, "result": { "winner": 1, "reason": "Conceded" } },
"match": { "n": 1, "bestOf": 3, "wins": [0, 1], "over": false, "winner": null,
           "next": { "game": 2, "chooser": 0, "newMatch": false } },
"games": [ { "match": 1, "game": 1, "matchId": "m1791306948840", "winner": 1, "reason": "Conceded",
             "recorded": true, "review": "running" } ],
"record": { "you": true, "default": true }
```

- `game.game` is the game's number in the match; `game.result` is null while it
  is played.
- `match.next` is the game the next pair of decks starts, and who chooses to
  play or draw in it (null: a coin toss); `newMatch` after a decided match.
- `games` is every finished game (24 kept), oldest first. `recorded` and
  `review` are **this seat's own**.
- The seats file the room hands the bridge gains `match: {bestOf, game, wins}`,
  `chooser` (from game 2) and `record: [bool, bool]`; `hello_ok` says game *n* of
  3 and `match.score`, the games each side won before it (protocol **M60**).

### Recording, each player's choice (D407)

The room's owner picks the default when making the room (`POST /room`
`{"record": true}`; false when absent). Each player can opt their **own** seat
in or out of the **next** game, in the room:

- `POST /room/<id>/record` `{"record": true|false}` → `200` state (a body with
  any other key, or a non-boolean, is `400`). A deck may carry `"record"` too.
- Each seat sees only its own answer (`record.you`). The answers are fixed when
  a game starts and go into that seat's session header (`record`, M60).

A recorded seat's log is copied into `var/ml/human-friends/` by
`tools/ml/human_collect.py` (the human test games of D369, kept apart from the
games against the AI) and reviewed by the automatic engine review (D385) at idle
priority. A seat that opted out is neither. One seat is a whole test game, so a
game in which only one player agreed gives that player's seat. Nothing leaves
this machine.

### Each player's own review

- `GET /room/<id>/review/<matchId>` → `200 {ok, matchId, match, game, state,
  stage?, why?, report?}`: **this seat's** engine review of that game of the
  room. `state` is `off` (not recorded, or automatic reviews are off here),
  `waiting`, `queued`, `running`, `done` (with `report`, docs/game-review.md's
  shape) or `failed`. `404 {code: "game"}` for a game that is not this room's.
- `GET /room/<id>/log/<matchId>` → `200 application/x-ndjson`: this seat's own
  frame log of that game, as the bridge wrote it (the frames the review's numbers
  point at), for a game this seat was recorded in; `404` otherwise.
- The review is built from this seat's own log, which holds this player's hand,
  so it is never served to the other seat — and the coach helper's own `/review`
  (8643) never serves a game between two people at all (`POST` 403, `GET` 404,
  left out of the list).

## The tunnel (Phase 4, D405, D408)

The room listener and the table port are built to be tunnelled (no loopback
exemption, `https://` origins, the table serving `/ws` only), and
`docs/cloudflare.md` is the runbook: cloudflared checks Access itself.
`./scripts/play.sh --tunnel https://<host>` (D408) hands the room its public URL,
so the page shows the "Over the internet" link.
Tailscale Funnel is the no-domain alternative: `./scripts/play.sh --funnel` (D409,
`docs/tailscale-funnel.md`) routes the PC's `https://<machine>.<tailnet>.ts.net` to
the room listener alone, with no login gate in front. A review and a seat log go out
only to their own seat, over the room listener, like everything else in the room.
