## D400 — The draft room: two people grid-draft a cube through the coach helper, on a listener of its own where every route needs a seat token

*Branch `c/draft-room`.* D400, the first number free at push: D398 and D399 went to the ladder (#85) and the bridge (#86) while this lane was open. Lifts README's *No multiplayer* in part (for a draft, never a second game seat). Amends D292 (the coach helper gains `/room` behind its own door) and adds a row to D386's map.

**2026-10-06**

**Context.** The owner wants to grid-draft a cube against a friend, each from
their own browser, and later to play the two decks against each other through
Forge on this machine, perhaps reached through a Cloudflare tunnel. ForgeCoach
already runs a grid draft against the cube lab's AI (`src/draft/draft.ts`, which
is the lab's `tools/cubelab/draft.ts`). Two people need one authority on the draft
that neither browser controls. Because the friend's machine is not the owner's,
the listener they reach must hold up behind a tunnel, where every peer is
127.0.0.1 (D386, headline risk 1).

**Decision.**

- **The room lives in the coach helper's process. It has two doors.** `POST
  /room` and `GET /room` sit on the helper's port (8643), behind D386's
  `admit()`: loopback with a loopback `Host`, or the `--lan` pairing token. That
  port is the owner's door, and it is never tunnelled. Only the owner makes a room,
  as only the owner starts a match (D303). Everything a player does — read, stream,
  join, pick — is on the **room listener**, a port of its own (`roomPort`, 8644).
  Every `/room/<id>` route there needs that seat's token in `X-Room-Token`,
  **a loopback peer included**. D386's tunnel design asks for exactly this
  separation: a tunnel can point at 8644 and never at 8643, whose `/coach`
  spends the owner's Claude usage. The helper process was chosen because
  `play.sh` already supervises it, it already serves ForgeCoach's other
  owner-only calls, and the room needs no engine.
- **Tokens.** Each seat gets its own 128-bit token, made when the room is made.
  The owner's page receives both: it keeps its own and shows the friend's inside a
  join link's `#fragment`. The fragment never reaches a server or a `Referer`, and
  ForgeCoach moves the token to local storage and out of the address bar. Tokens
  are stored as SHA-256 digests (`var/draft-room/rooms.json`, mode 600, in a
  folder of mode 700 whose real path must stay under `var/`) and compared in
  constant time. No log line holds one.
- **The server holds the draft and checks every pick.** It checks turn order,
  legality (a line with cards, not the first drafter's line), that both seats
  have joined, and `expect: <version>`. A pick against an old view is a `409
  stale` that carries the current state, so a double click or a lagging tab
  cannot pick twice. The client renders the server's state and never applies a
  pick on its own.
- **One set of rules in two languages, held together by a golden file.**
  `tools/draft-room.mjs` ports `rng.ts` and the grid part of `draft.ts` to plain JS,
  so the helper still needs no type stripping. `fixtures/draft-room/grid-golden.json`
  is written by ForgeCoach's `draft.ts`: six deals and drafts, with seeds up to
  5×10⁹ and both opening seats. Both repositories' tests must reproduce it. The
  self-test also compares this file's rng with `tools/cubelab/rng.ts` directly.
  At the end of a draft the seed is revealed, and ForgeCoach re-deals and replays
  the whole draft with its own `draft.ts`.
- **The card list comes from the owner's page; the deal comes from the server.**
  The page sends the cube's names in document order, the same input `newDraft`
  takes. The server mints the seed (`crypto.randomInt`) and, by default, which
  seat opens. `cube.hash` lets each client check that its copy of the cube
  document is the room's. Future grids and the seed are not sent until the end,
  as a paper grid draft turns up one grid at a time.
- **State, not deltas.** Each change sends the whole seat view (about 15 KB at
  the end of a draft). The stream is server-sent events, which ForgeCoach reads
  with `fetch()` so the token can travel in a header. A reconnect is a new stream
  whose first event is the current state. Presence (`online`) is pushed to both
  seats but does not move `version`.
- **The listener serves ForgeCoach's site.** An https page cannot call `http://`
  on a LAN address (mixed content). The friend therefore opens a page served by
  the room listener itself: the site `play.sh` already downloads for `--lan`, or
  `--site-dir`. These are the one set of files served without a token. They are
  public bytes, the same as GitHub Pages, behind the bridge's `sitePath` rules
  rewritten here (no `..`, no encoded separator, no symlink).
- **Limits.** Per seat: 120 requests a minute (a burst of 60) and at most 3
  streams. In all: 1,200 requests a minute and at most 32 streams. Per address:
  10 wrong links a minute, then 429. Behind a tunnel the address is the loopback
  peer's `CF-Connecting-IP`; only a process on this machine can reach loopback,
  so it cannot be forged from outside. Seat bodies are capped at 1 KB and a
  create body at 256 KB. There are at most 16 live rooms. A room expires 24 h
  after its last join or pick, or 72 h after it was made, whichever comes first.
- **`play.sh --draft-room`** starts the helper with `--draft-room` even without
  `claude` on PATH, and gives the room listener the site. The listener binds
  0.0.0.0 only with `--lan`. Nothing changes without the flag: no `/health` key,
  `/room` is a 404, no port is opened, and the bridge's flags are unchanged.

**Rejected.**

- *The room on the coach helper's own port with the pairing token.* The pairing
  token opens `/coach`, `/match` and the review, so handing it to a friend would
  give them the owner's Claude usage and engine. A seat token opens one seat in
  one room.
- *Authorising by loopback, as the helper does.* A tunnel daemon is loopback, so
  that would authorise the whole internet the day a tunnel is added.
- *Room creation on the room listener with a per-run owner token.* The owner's
  page would have to learn that token from somewhere. The owner's door already
  answers the owner, and a tunnel never carries it.
- *WebSocket.* Node has no server for it without a dependency, and a browser
  `WebSocket` cannot send the token in a header. A fetch-read SSE stream through
  plain `node:http` does both.
- *Sending the whole deal at the start.* The future grids are information a
  paper draft does not give. The seed at the end is enough to check the deal.
- *Making the server read the cube documents itself.* mtg-table's `cubes/` and
  ForgeCoach's `public/cubes/` move separately. The page's own list, with its
  hash in the state, is the one both clients render.

**Measured.** `node tools/draft-room-selftest.mjs`: 135 checks. They cover the
six golden cases move for move and the rng against `rng.ts`. They then run the
real helper and room listener in one process with two simulated players and their
event streams, through a full 18-grid draft. On the way they refuse every
out-of-turn pick (18), every second pick of the first line (18), a stale pick,
missing and wrong tokens (including from loopback), a foreign Origin, oversized
bodies, and a pick before the friend joined. They accept a tunnel's `Host` and
`https://` origin, reconnect a seat at grid 10, and replay the draft from the
revealed seed. The remaining checks cover:

- a restart that keeps every link (with digests only on disk), expiry, the cap
  on rooms, and room directories outside `var/` or through a symlink;
- the request, failure and stream limits, including two tunnelled clients told
  apart by `CF-Connecting-IP`;
- the site's traversal cases;
- the CLI with and without `--draft-room`.

`node tools/match-launcher-selftest.mjs` adds a `play.sh --draft-room` run against
its fake engine (175 checks in all). `node tools/coach-helper-selftest.mjs` is
unchanged (132).
