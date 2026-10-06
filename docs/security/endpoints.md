# Every port mtg-table listens on, and its door

**D386** (2026-10-04). This is the inventory a tunnel (or anything else that
puts a port in front of people other than the owner) has to start from: every
HTTP or websocket endpoint in the repository, where it binds, who it lets in,
what it can read or write, and whether it can spend the owner's Claude usage.
Nothing here is exposed by this document. The hard rules, `bridge/CLAUDE.md`'s
*The socket* (M50, M51) and `tools/CLAUDE.md`'s *The coach helper* (D292) are
the rules; this is the map.

## Headline risks

1. **"Loopback is trusted" is the assumption every door makes, and a tunnel
   breaks it.** The bridge's `LanGate` admits any loopback peer without the
   token, and the coach helper does the same. A tunnel daemon (`cloudflared`,
   `tailscale serve`, an nginx) running on this machine connects FROM
   127.0.0.1, so whatever it forwards arrives as the owner. So does a plain
   port relay (`socat`, `ssh -L 9000:127.0.0.1:8643`): the helper cannot tell
   any of them from the owner by the peer. What holds since D386 is the `Host`
   check alone: the coach helper refuses a loopback peer whose `Host` is not
   `localhost`, `*.localhost` or a loopback IP literal (`127.0.0.0/8`, `[::1]`,
   `[::ffff:127.x.x.x]`), so a tunnel's hostname or a relay's
   `Host: 192.168.1.5:9000` (a `socat` on `0.0.0.0` reached from the LAN) is
   turned away. A forwarder that rewrites `Host` to `127.0.0.1`, or a client
   whose own end of the relay is loopback — the usual `ssh -L`, browsed as
   `http://127.0.0.1:9000` on the far machine — still arrives as the owner,
   token-free; nothing on this port can tell. **The bridge has no such
   check** and would hand a forwarded `/ws` the seat (a client that sends no
   `Origin` — any script — is allowed by design, D281).
2. **The coach helper's `/coach` and `/vision` spend the owner's Claude usage**
   (`claude -p` under the owner's login). It is the only endpoint in the repo
   that does. Its door is loopback, or `--lan` plus the pairing token; the queue
   caps it at one running and `--queue-max` (4) waiting. It must never be
   tunnelled.
3. **The pairing token is a bearer secret written to `var/play/server.log`**
   (the phone's URL line, which `play.sh` reads back for the helper and for a
   restart). It is never in any other log line (the bridge prints paths without
   their query; the helper cuts every logged path at `?`). D386 makes
   `var/play/` mode 700. Anyone who can read that file, or who sees the phone's
   URL or QR code, has the seat and the coach until the next run.
4. **DNS rebinding reached the coach helper's GET routes** before D386: a page
   that rebinds its own name to 127.0.0.1 makes same-origin GETs, which carry
   no `Origin`, and "no `Origin` from loopback" was allowed — `/health`,
   `/match` (the current decks' names), `/review` and `/review/<id>` (a post-game
   report: the owner's own hand, turn by turn). Fixed: a loopback peer's `Host`
   must be `localhost` or a loopback IP literal. The bridge's sockets were already safe
   (a websocket upgrade always carries `Origin`, and a rebound one is not on the
   list); its `/health` and the static site are readable that way and hold
   nothing private.
5. **The Vite dev server serves private files** — the personal tier's models and
   relief maps (`/personal/`, D190), the spectate recordings (`/spectate/`) and
   the card library (`/cards/`) — on 127.0.0.1, guarded by Vite's own Host and
   CORS checks (Vite 7: `server.allowedHosts` and `server.cors` default to
   localhost). It must never be bound wider or tunnelled.
6. **ForgeCoach's live-mode HTTP fallback can publish the owner's hand.** Its
   `src/live.ts` and README suggest `npx http-server <dir> -p 8650 --cors` on a
   game folder; `http-server` binds `0.0.0.0` by default and `--cors` answers
   `Access-Control-Allow-Origin: *`, so `frames.jsonl` — the owner's seat's
   view, hand included — is readable by anyone on the LAN and by any page the
   browser opens. Run it as `npx http-server <dir> -a 127.0.0.1 -p 8650 --cors`.
   It is ForgeCoach's text to change (D386's *Follow-ups for ForgeCoach*); it
   is not a listener of this repository and has no row below.

## The table

| Listener | Bind | Routes | Auth | Origin / CORS | Reads / writes on disk | Spends Claude usage |
|---|---|---|---|---|---|---|
| **Bridge** `WsTransport` (`MtgTable --transport ws`, `config.json` `wsPort`, 8642) | `127.0.0.1`; `0.0.0.0` with `--lan` | `GET /health` (200 `ok` / 503 `starting`; other methods 405); `/ws` the seat (one client, 4001 for a second); `/observe` read-only followers; `/` the built ForgeCoach site, only with `--site-dir` (`GET`/`HEAD`) | any request carrying a tunnel's headers (`CF-Connecting-IP`, `CF-Ray`, `Cf-Access-Jwt-Assertion`; D409: and tailscaled's `Tailscale-Funnel-Request`, `Tailscale-User-Login`, `X-Forwarded-For`, `X-Forwarded-Host`) is 403 first, in every mode (`TunnelGate`, D402 for D405: this port is never tunnelled) — at a table of two too, where `wsPort` is `TableServer`'s loopback `/health` alone and refuses them on every path, `/health` included (D406's lane, closing D408's open gap); then none on loopback; with `--lan`, `LanGate`: a non-loopback peer needs `?token=` (sockets) or `?token=`/the `mtgtable_token` cookie (site, `/health`), SHA-256 + `MessageDigest.isEqual` | `/ws`, `/observe`: no `Origin` (a tool) or one on `wsAllowedOrigins` (loopback any port, `https://jalirkan.github.io`); with `--lan` also `http://<Host>` for a non-loopback peer only; else 403 before the handshake. No CORS on HTTP (nothing cross-origin reads it) | reads the `--site-dir` tree (text, normalised and real-path checks, symlinks refused, 64 MB a file); writes `var/games/<gameId>/frames.jsonl` (the frame log). A socket can only play the seat's game (acts, answers, `newGame`) | no |
| **Coach helper** `tools/coach-helper.mjs` (`coachPort`, 8643; started by `play.sh`) | `127.0.0.1`; `0.0.0.0` with `--lan` | `GET /health`; `POST /coach` (512 KB); `POST /vision` (24 MB, 8 images of 5 MB); `GET/POST /review`, `GET /review/<id>` (256 KB); `POST /eval` (2 MB); `GET/POST /match` (64 KB); `POST /engine/start` (4 KB); with `--draft-room`, `GET/POST /room` (256 KB) and D408's `POST /room/<id>/close` and `POST /room/<id>/friend-link` (1 KB: close a room, or a new token for the friend's seat); else 404, 405, 413 | any request carrying a tunnel's headers (`CF-Connecting-IP`, `CF-Ray`, `Cf-Access-Jwt-Assertion`; D409: and tailscaled's `Tailscale-Funnel-Request`, `Tailscale-User-Login`, `X-Forwarded-For`, `X-Forwarded-Host`) is 403 first (D405: never tunnelled); then none on loopback; **D386: a non-loopback peer is 403 unless `--lan`**, checked on the socket's remote address; with `--lan` it needs `?token=` or `X-ForgeCoach-Token`, SHA-256 + `crypto.timingSafeEqual` | **D386: a loopback peer's `Host` must be `localhost`/`*.localhost` or a loopback IP literal (`127.0.0.0/8`, `[::1]`, `[::ffff:127.x.x.x]`), port ≤ 65535.** `Origin` on `wsAllowedOrigins`; with `--lan`, a non-loopback peer also `http://<Host>` and `http://<Host name>:<wsPort>` (the bridge's LAN page); no `Origin` from loopback only. Allowed origins echoed with `Vary: Origin`; preflight 204 with `Allow-Private-Network`, needs only the origin | `/coach`, `/vision`: an empty temp dir per call, removed after (the system prompt in a temp file when over 100 KB). `/review`: reads `var/games/<gameId>/frames.jsonl` (name pattern, no `..`, real path inside `var/games/`), writes `var/coach-grade/review/<id>/`, runs `tools/coach-grade.sh` (JVMs). `/eval`: a long-lived Python child reading the model under `var/ml/`. `/match`: writes `var/match/<id>/{you,ai}.dck` and `var/match/request.json` (names through strict patterns, never in a path or argv), signals `play.sh`, which restarts the engine; D386: the match dir's real path must stay under `var/` | **yes**: `/coach`, `/vision` run `claude -p` (no tools, one turn, `dontAsk`); nothing else does |
| **Draft room** `tools/draft-room.mjs` (D400; in the coach helper's process with `--draft-room`, `roomPort` 8644; `play.sh --draft-room`) | `127.0.0.1`; `0.0.0.0` with `--lan` | `GET /room/<id>`, `GET /room/<id>/events` (SSE), `POST /room/<id>/join`, `POST /room/<id>/pick` (1 KB), `POST /room/<id>/deck` (16 KB, D404: a deck from that seat's own picks; both in, the room starts a game between the two through the match launcher, and each seat's state carries its own game seat token, minted per game, in memory only); a `GET /ws` upgrade is passed through to the running game's table port on loopback (D404: 404 with no game, 502 if it does not answer; the table checks the seat token and `Origin`; the client's address goes along as `CF-Connecting-IP`); `GET`/`HEAD` the site (`--room-site-dir`); rooms are MADE only on the coach helper's port (`POST /room`, 256 KB, its D386 door) | **every room route needs the seat's `X-Room-Token`, a loopback peer included** (128 bits, SHA-256 digests on disk, `timingSafeEqual`); the site needs none (ForgeCoach's public build). Per seat 120 req/min, 3 streams; 10 wrong links/min per address (a loopback peer's `CF-Connecting-IP` when present), then 429; 16 rooms | `Origin` absent, on `wsAllowedOrigins`, the page's own `http(s)://<Host>`, or a `--room-origin`; else 403. No `Host` check (the token is the lock). Allowed origins echoed; preflight 204 with `Allow-Private-Network` | writes `var/draft-room/rooms.json` (mode 600, folder 700, real path under `var/`; token digests only; D408: a closed room or a replaced seat token is gone from it at once, so a revoke survives a restart); reads the `--room-site-dir` tree (`sitePath`: no `..`, encoded separator, NUL or symlink) | no |
| **Table** `TableServer` (D402, M59; `MtgTable --humans 2 --transport ws`, `config.json` `tablePort` 8646, `--table-port`; exists only while a game between two people runs) | `127.0.0.1`; `0.0.0.0` with `--lan`. The bridge's own `wsPort` then binds `127.0.0.1` for `/health` alone | `/ws?seat=<token>` one of the two seats, and nothing else: `/observe` (D403), `/health` and every other path 404 (`/health` is the bridge's own `wsPort`'s, loopback only: 200 once both seats have a `hello_ok`, 503 before) | **every `/ws` upgrade needs a seat's token, a loopback peer included** (128 bits, minted per game by the draft room, D404); the bridge holds only their SHA-256 digests (`--seats-file`) and compares with `MessageDigest.isEqual`; the token is stripped from the URI before the handshake and never logged. 10 wrong tokens/min per address (a loopback peer's `CF-Connecting-IP` when present), then 429. A second socket with the same seat's token replaces the first (closed 4002) | `Origin` absent, on `wsAllowedOrigins`, a `--table-origin`, or `http(s)://` on the request's own host name at any port; else 403. No `Host` check (the token is the lock) | writes `var/games/<gameId>-seat0/` and `-seat1/frames.jsonl` (each seat's own redacted view); reads `--seats-file` (names and digests). A socket can only play its own seat | no |
| **Lab runner status** `tools/runner/serve.ts` (`--http-port`, 8645) | `127.0.0.1` only (`STATUS_HOST`) | `GET /public-status.json` (`/status.json`, `/`), `/public-ladder.json`, `/public-warehouse.json`; else 404/405 | none | `https://jalirkan.github.io` and loopback dev origins, else 403; no `Origin` allowed; preflight answers private network | reads the runner's status, sanitised to the public copy (the same bytes `lab-status` publishes) | no |
| **Vite dev server** (`npm --prefix web run dev`, `play.sh`'s board, `webPort` 5173; preview 4173) | `127.0.0.1` (`vite.config.ts`) | the app; `/fixtures/` (dev and preview); dev only: `/cards/api/*`, `/cards/img/*` (D92), `/spectate/<name>.jsonl` (D122), `/personal/*` (D195, D225) | none | Vite's defaults: `allowedHosts` (DNS-rebinding guard) and `cors` limited to localhost | reads `fixtures/` (resolved, inside the folder), `var/cards/`, `var/spectate/` (name pattern), `personal/models/` and `personal/relief/` (slug pattern, resolved inside) — **the personal tier is private (D190)** | no |
| `tools/personal/check.mjs` (preview pages for headless Chromium, a run's lifetime) | `127.0.0.1` | `/`, `/clip/*.json`, `/model.glb`, `/three/*` | none | none | reads one model and `web/node_modules/three` (resolved inside) | no |
| `tools/build-sounds.mjs` (the encoder page, a run's lifetime, 9238) | `127.0.0.1` | `/`, `/check.html`, `/pcm/*`, `/out/*`, `POST /report`, `/hold` | none | D386: any `Origin` but its own is 403 | D386: `/out/` serves only a file directly under the output dir; the report body is capped and a bad one is 400 rather than a crash | no |
| Test servers (`*-selftest.mjs`, `web/test/*`, `tools/ml/tests/test_outside_exam.py`) | `127.0.0.1`, port 0 | per test | — | — | scratch under `var/` | no (the coach self-test puts a FAKE `claude` on PATH) |

No other process in the repository listens: `grep` for `createServer`,
`listen(`, `bind(`, `ServerSocket`, `http.server` over `tools/`, `scripts/`,
`web/` and `bridge/src` finds the rows above and nothing else. Nothing in the
repository except the coach helper calls the Anthropic API or the `claude` CLI.

## Notes

- **`/observe` is read-only by construction.** The door adds the observer's
  handlers or the seat's, never both, and `ObserverHandler` releases every
  inbound frame unread (`WsTransport.java`). `WsObserveSelfTest` sends an act
  (`concede`), an answer, a resync, a ping, garbage and a binary frame on
  `/observe` and requires that no seat method was called (`acts=0 answers=0
  resyncs=0 disconnects=0`) and that the seat's inbound counter did not move —
  on every build (gate step 1, CI's `bridge` job). D386 needed no change there.
- **Body and frame limits.** Bridge: an HTTP request is aggregated up to 1 MB
  (`MAX_HTTP_CONTENT`), a seat message up to 1 MB (`MAX_WS_FRAME`, with a frame
  aggregator), an observer's up to 64 KB, and an observer that falls 8 MB
  behind is dropped. Helper: the per-route caps in the table, 413 on
  `Content-Length` or as the bytes arrive; Node's own 16 KB header cap.
- **Path traversal.** Every path built from a request is checked: the bridge's
  site (`sitePath`: no NUL, backslash, `.`/`..` segment or absolute remainder,
  then the normalised path and the real path inside the root), the review's
  `gameId` (pattern, no `..`, real path inside `var/games/`), the dev routes
  (name or slug patterns, resolved inside their folder) and `build-sounds`'
  `/out/`. The match launcher puts nothing from a request into a path.
- **Tokens.** Both implementations hash before comparing, so neither length
  nor the first differing byte shows in the timing. The token is minted per
  run (128 bits), handed to the helper in the environment (never argv), never
  logged except the bridge's one phone-URL line, and `play.sh` redacts it from
  every tail it prints. The bridge's site page sets `Referrer-Policy:
  no-referrer` so the URL's token does not leave as a `Referer`.
- **A GET route must stay side-effect-free.** A cross-site GET with no
  `Origin` from loopback is admitted (a top-level navigation or an `<img>`
  sends none), so a GET can only read; anything that writes, spends or
  restarts is a POST, whose cross-site form the Origin rule refuses.
- **What D386 did not change.** The bridge has no `Host` check: its sockets are
  covered by `Origin`, and adding one would be a Java change for no current
  exposure (and would move D341's lab version, which hashes `bridge/src`). It
  is the first thing a tunnel to the bridge would need (below).

## What a tunnel may expose and what must stay loopback

The premise: friends play from their own browsers, through a tunnel
(Cloudflare Tunnel) with an identity check in front of it (Cloudflare Access),
so only people the owner named reach the origin at all. **The runbook is
[`docs/cloudflare.md`](../cloudflare.md)** (D405); the allowlist is one file,
[`scripts/tunnel/policy.mjs`](../../scripts/tunnel/policy.mjs), which the
cloudflared template and `scripts/tunnel/tunnel-check.sh` are both held to; and
`./scripts/play.sh --tunnel https://<host>` (D408) runs that check before and
after it starts. What a tunnel carries, on one hostname behind Access:

| Path | Listener | Door |
|---|---|---|
| `/ws` | **the table port (8646, D402)**, only while a game between two people runs | `/ws` by seat token and nothing else; every other path 404 |
| `/` and `/room/<id>[/events,join,pick,deck]` | the draft room's listener (8644, D400) | the seat's `X-Room-Token`; the site needs none |
| everything an owner door serves (`/coach`, `/vision`, `/match`, `/engine`, `/review`, `/eval`, **`/observe`**, `/health`, `/room` itself, …) | none: **cloudflared answers 404 at the edge** | — |

**Tailscale Funnel (D409, [`docs/tailscale-funnel.md`](../tailscale-funnel.md))**
is the same shape with no Access in front: `play.sh --funnel` routes
`https://<machine>.<tailnet>.ts.net/` (tailscaled, from 127.0.0.1, the ts.net
`Host` kept) to the room listener (8644) alone, in foreground mode so the route
ends with play.sh, and `tunnel-check --local --funnel` FAILs any Funnel route but
that one and any serve handler naming a never-port. The seat tokens are the only
lock. The room counts a Funnel visitor by the `X-Forwarded-For` tailscaled sets
(`clientKey`), never by a `CF-Connecting-IP` the visitor sent.

**`/observe` is never tunnelled**, on any port: it is one seat's view (the
owner's hand on the bridge), the table refuses it (D403), and the edge rule
404s it before anything local is asked.

**Must stay loopback, never behind a tunnel:**

- **The coach helper (8643), all of it.** `/coach` and `/vision` spend the
  owner's Claude usage, `/match` and `/engine/start` restart the engine,
  `/review` runs JVMs and returns the owner's games. Its D386 `Host` check
  refuses a tunnel's hostname by default; do not undo that with an
  `httpHostHeader` rewrite to `127.0.0.1`. A friend's ForgeCoach coaches
  through their own helper on their own machine, or not at all.
- **The Vite dev server**: the personal tier is never published (D190).
- **Never** serve a game folder with `http-server` (or anything) on `0.0.0.0`
  with `Access-Control-Allow-Origin: *`: `frames.jsonl` is the owner's hand
  (headline risk 6). `-a 127.0.0.1`.
- **The lab runner's status server**: already public through `lab-status`; a
  tunnel adds nothing.
- **`/observe` for anyone but the owner**, until it is decided whose eyes it is:
  it is one seat's view, so a friend following it sees the owner's hand.

**May be exposed as it is:**

- **The draft room's listener (8644, D400)**, alone: it was built to this
  section's rules — no loopback exemption (every room route needs a seat token),
  a token per seat, `https://` origins by the page-own rule or `--room-origin`,
  rate limits keyed by a tunnel's `CF-Connecting-IP`, and room creation on the
  coach helper's port, which stays loopback. Point the tunnel at `127.0.0.1:8644`
  only, and keep Access in front of it.

**May be exposed, after named changes:**

- **The table port (D402, M59), for the two seats of a game between two
  people**, with Access in front of it. All five changes this section listed
  for the bridge's `/ws` are made there, on a listener of its own rather than
  on the bridge's `wsPort` (checked against what Phase 2 built, D408):
  1. *Loopback is no longer the owner* — done: the table port exists only while
     a game between two people runs, and it has no loopback exemption; every
     upgrade needs a seat's token, from 127.0.0.1 as from anywhere. A tunnel
     points at the table port and never at `wsPort`, which a later one-person
     game reopens with M51's exemption.
  2. *A token per seat, not per run* — done: one per seat per game, minted by
     the draft room (D404), held by the bridge as digests only.
  3. *`https://` origins* — done: `http(s)://` on the request's own host name,
     or a `--table-origin` (a tunnel's name).
  4. *Access in front, the token behind it* — **done, by cloudflared** (D405):
     the config's `originRequest.access {required: true, teamName, audTag}`
     makes cloudflared verify `Cf-Access-Jwt-Assertion` on every request before
     anything reaches 127.0.0.1, so a deleted or loosened Access application
     fails closed there, with no JWKS code in any listener; `tunnel-check.sh`
     fails a config without it. Behind it, the owner's doors refuse what came
     through Cloudflare whatever the `Host` (D404's `admit` on the coach
     helper, D402's `TunnelGate` on the bridge's port: `CF-Connecting-IP`,
     `CF-Ray`, `Cf-Access-Jwt-Assertion` → 403; `tunnel-check --local` asks
     each). At a table of two the bridge's own `wsPort` is a loopback
     `/health` alone (`TableServer`'s health door), and it refuses those
     headers too, on every path (D406's lane closed D408's open gap;
     `tunnel-check` FAILs a bridge that answers, `TableSelfTest` holds it).
  5. *Hidden information is unchanged* — held: each seat is a seat (hard rule
     8), and `/observe` is refused at a table (D403) rather than given a new
     redaction mode. `tools/check-seat-pair.mjs` reads the two seats' logs
     against each other on every gate (step 10i).
- **The bridge's `/ws` and its site, for one friend on the owner's single
  seat**: never. That is what the table port is for; `wsPort` keeps M51's
  loopback exemption and is on the policy's never-list.
- **Nothing else.** A new route a tunnel should carry is a new row in the
  table above and a decision, before it is a line of code.
