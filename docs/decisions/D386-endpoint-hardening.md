## D386 — A security pass on the local endpoints: the coach helper checks its peer's address and a loopback peer's Host, the match dir's real path stays in var/, the play log's folder is the owner's, and every port is mapped in docs/security/endpoints.md

*Branch `c/endpoint-hardening`.* Amends D292 and D303 (the coach helper's door); touches no rule of M50 or M51.

**2026-10-04**

**Context.** The owner may later let friends play through a Cloudflare Tunnel
behind Cloudflare Access. Before anything is exposed, what exists was mapped and
hardened, and nothing new was exposed. The map is `docs/security/endpoints.md`:
every listener, its bind, its auth, its Origin rule, what it reads and writes,
and whether it spends the owner's Claude usage (only the coach helper's
`/coach` and `/vision` do). Most doors were already right — the bridge's
`LanGate` and `Door` (M50, M51), constant-time token compares on both sides,
body and frame caps, the site's and the review's path checks, an `/observe`
that releases every inbound frame unread. Four gaps were not:

1. **DNS rebinding reached the coach helper's GETs.** A page that rebinds its
   own name to 127.0.0.1 makes same-origin GETs with no `Origin`, and "no
   `Origin` from loopback" was allowed: `/health`, `/match` (the current decks'
   names) and `/review/<id>` (a post-game report of the owner's own game).
2. **The helper's non-LAN mode trusted its bind.** A non-loopback peer was
   turned away only because nothing could reach 127.0.0.1; a request that did
   arrive (a bind changed later, a proxy) with an allowed `Origin` was served.
3. **`--match-dir` was checked as text.** `var/match` through a symlink out of
   `var/` passed the prefix test, and the launcher would write there.
4. **The pairing token sits in `var/play/server.log`** (the phone's URL line,
   by design: `play.sh` reads it back), in a folder of default permissions, and
   six of `play.sh`'s log tails printed it to the terminal.

**Decision.**

- **`admit()` is the coach helper's whole door, as one pure function**, in
  order: (a) a peer whose socket address is not loopback is 403 unless the
  helper runs `--lan` — the remote address, not the bind; (b) a loopback peer's
  `Host` must be `localhost`, a name under `.localhost`, or a loopback IP
  literal (`127.0.0.0/8`, `[::1]`, `[::ffff:127.x.x.x]`) with a port of at most
  65535 (`loopbackHostOk`), else 403 — a rebinding name and a tunnel's hostname
  are DNS names, and a port relay (`socat`, `ssh -L`) arrives from loopback
  keeping its client's `Host`, which a LAN client types as the LAN address
  (`192.168.1.5:9000`; `0.0.0.0` is refused too). A relay whose client end is
  itself loopback, or a forwarder that rewrites `Host` to `127.0.0.1`, still
  passes: the check stops what names another address, not every forwarder; (c) then M51's order as before: the Origin for a preflight,
  the token for a non-loopback peer under `--lan`, the Origin for the rest.
  Every 403 carries `X-Content-Type-Options: nosniff`. The two new refusals'
  messages start `origin refused:` (`… Host is not a loopback name …`, `… this
  coach helper answers this machine only …`): ForgeCoach's `refusedMessage`
  sorts a 401/403 by `/origin/i` alone and calls anything else a pairing-token
  problem, which these are not. The "wrong address" branch is the honest one
  for both, so the helper's words choose it without a ForgeCoach release. `/match`,
  `/engine/start`, `/review`, `/eval`, `/coach` and `/vision` all sit behind it,
  so the match launcher's routes get it too.
- **The match dir's REAL path must be under `var/`** (`realInside`): at startup
  (exit 2) and again before every write (a 500 that writes nothing). The check
  and the write are two steps, so a process that swaps `var/match` for a
  symlink between them wins the race; only a process running as the owner can,
  and it could write there anyway, so the race is accepted.
- **`play.sh` makes `var/play/` mode 700** and cuts `token=` out of every log
  tail it prints (`server_tail`), as the 502 path already did.
- **`tools/build-sounds.mjs`'s run-long server** answers its own page only
  (another `Origin` is 403), serves `/out/` files directly under its output
  dir, caps the report body and answers a bad one 400 instead of crashing.
- **No Java change.** The bridge's doors already did what this pass asked
  (`MessageDigest.isEqual`, 1 MB frames, `sitePath`, Origin before the
  handshake, `/observe` read-only — `WsObserveSelfTest` sends an act there on
  every build). Its one gap is the coach helper's (b), which matters only once
  something forwards to it from loopback — a tunnel — and is the first item of
  the doc's tunnel design; a Java change for no current exposure would also move
  D341's lab version, which hashes `bridge/src`.
- **The tunnel is design only**: the doc's *What a tunnel may expose and what
  must stay loopback*. The coach helper, the Vite dev server and `/observe`
  stay loopback; the bridge's seat may be exposed after five named changes.

**What ForgeCoach sends, and why it still passes** (read from its
`src/coachHelper.ts`, `src/draft/launch.ts`, `src/live.ts`,
`src/play/seatUrl.ts`, `src/evalClient.ts`, `src/gameReviewClient.ts`): from
`https://jalirkan.github.io/ForgeCoach/` or a Vite dev page it calls
`http://127.0.0.1:8643` — a loopback peer, an IP-literal `Host`, an allowed
`Origin`, `Content-Type: application/json` on a POST, no body on a bare
`/engine/start`. From the bridge's LAN page on a phone it calls
`http://<LAN IP or name>:8643` with `X-ForgeCoach-Token` — a non-loopback peer
of a `--lan` helper, `Origin: http://<host>:8642`, unchanged. On the desktop,
the bridge's own page at `http://127.0.0.1:8642` or `http://localhost:8642`
calls the helper by that same name. `live.ts` opens `ws://127.0.0.1:8642/observe`
and sends nothing. Bodies stay far below the caps (a /vision JPEG is about
0.3-0.6 MB of the 5 MB per image).

**Measured.** `node tools/coach-helper-selftest.mjs`: 131 checks, among them a
DNS-name `Host` refused on `/health`, `/match`, `/review` and a preflight, a
tunnel hostname refused even with an allowed `Origin`, a relay's
`Host: 192.168.1.5:9000` refused and `127.0.0.2` admitted, `admit()` as a table, and
a non-LAN helper bound to `0.0.0.0` by a test-only `bindHost` answering this
machine's non-loopback address 403. `node tools/match-launcher-selftest.mjs`:
148 checks against the real `play.sh`, among them a rebinding `Host` on `/match`
and `/engine/start` and a `--match-dir` through a symlink out of `var/` refused
at startup.

**Follow-ups for ForgeCoach** (its repository; nothing here edits it):

- (a) `refusedMessage` (`src/coachHelper.ts`) should recognise the peer and
  `Host` refusals explicitly (or read a `why` field the helper could add as a
  new key) rather than rely on the word "origin" in the body.
- (b) `helperTarget`'s `?coach=<url>` override keeps the token it would send
  to the engine's own helper: on a page served by the engine, a link
  `http://<LAN IP>:8642/?coach=https://evil.example` sends the phone's stored
  pairing token to that host in `X-ForgeCoach-Token`. Drop the token whenever
  the override is used.
- (c) `src/live.ts` and the README suggest `npx http-server <dir> -p 8650
  --cors` for live mode's HTTP fallback, which binds `0.0.0.0` with
  `Access-Control-Allow-Origin: *` and serves `frames.jsonl` — the owner's
  hand — to the LAN. Suggest `-a 127.0.0.1`
  (`docs/security/endpoints.md`, headline risk 6).

**Rejected.**

- *A `Host` check on the bridge now.* Its sockets are guarded by `Origin` (a
  websocket upgrade always carries one) and its HTTP routes hold nothing
  private; the check belongs with the tunnel's changes, as a decision of its
  own.
- *Refusing `/match` from the LAN.* ForgeCoach's draft on a phone starts its
  match through the helper with the token (`draft/launch.ts`); "loopback only"
  is the rule without `--lan`, and the token's with it, as M51 has it.
- *Requiring `Content-Type: application/json` on every POST.* The Origin rule
  already refuses a cross-site form, and a bare `/engine/start` has no body.
- *Printing the phone's URL without its token.* The URL is the pairing; the
  log is what `play.sh` reads it back from. The folder's permissions protect it
  instead.
