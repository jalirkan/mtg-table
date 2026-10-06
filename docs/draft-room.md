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
  builds a deck from your own pool in the usual deck editor.

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
| Room listener (8644) | `GET /room/<id>`, `GET /room/<id>/events`, `POST /room/<id>/join`, `POST /room/<id>/pick` | The seat's token in `X-Room-Token`, **always**: a loopback peer gets no exemption, because a tunnel daemon connects from 127.0.0.1. `Origin` must be absent, on `wsAllowedOrigins`, the page's own (`http(s)://<Host>`), or a `--room-origin`. There is no `Host` check, because the token is the lock and a tunnel's name must pass. |
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
- Seat bodies of at most 1 KB, and a create body of at most 256 KB.
- At most 16 live rooms.

## Wire format

### `POST /room` (coach helper)

```json
{ "cubeId": "synergy", "cubeTitle": "Synergy Cube", "cards": ["…every name, in document order…"],
  "name": "Justin", "firstSeat": 0 }
```

`cards` holds 9–2,000 names, each 1–150 characters with no control characters;
duplicates are dropped and the first one kept. `firstSeat` (0 or 1) opens grid 1;
when it is absent, a random seat opens. `name` is 1–24 characters. Any other field
is a 400.

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
  room expires. The client reads it with `fetch()`, because `EventSource` cannot
  send a header.
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

## Phase 2: playing the decks against each other

Phase 2 is not built yet. The room is shaped for it:

- **Both seats and both tokens already exist**, and they are seat tokens, not run
  tokens, so a friend's link stays one person's.
- **The deck goes to the room, privately.** The next route would be
  `POST /room/<id>/deck` (`{main, sideboard}` checked against that seat's own
  picks, then visible to that seat alone). Once both decks are in, the owner's
  door asks `POST /match` (D303, `docs/match-launcher.md`) to start the bridge
  with **two human seats** instead of an AI seat. That bridge change is its own
  decision: each seat gets a token minted per game, the bridge gains a second
  `/ws` seat, and hard rule 8's redaction applies to each viewer. The draft room
  hands each player their own seat's token through the state they already
  stream.
- **The tunnel's needs are already met here.** There is no loopback exemption,
  and `https://` origins pass through `--room-origin` or the page-own rule. A
  `CF-Connecting-IP` is read only from a loopback peer, and only for rate limits.
  `bases.public` carries the tunnel's URL. `docs/security/endpoints.md` lists the
  room listener as the one listener that may sit behind a tunnel as it is. The
  bridge's `/ws` still needs the five changes listed there.
