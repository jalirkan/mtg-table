## D408 — Cloudflare readiness, finished: `play.sh --tunnel` checks before and after it starts, and the owner can close a room or replace the friend's link, on the owner's door only

*Branch `c/cloudflare-phase4`.* Phase 4 of play-with-a-friend. It meets the
requests D405 left in `docs/cloudflare.md` §12 (1, 5, 6, 7 and 8; 2, 3 and 4
were Phase 2's, D402–D404). D406 and D407 are left to the Phase 3 lane
(best of three, recording both seats), which runs at the same time. Amends D400
(two owner routes, a stream event) and D405 (the check grows).

**2026-10-06**

**Context.** After Phase 2 the pieces a tunnel needs existed (a room listener
and a table port that trust nobody by address, the owner's doors refusing
Cloudflare's headers, cloudflared checking Access) but a session still needed
hand work: the friend's link was made by editing a URL, the check was a
separate command that nothing made you run, a leaked room link could only be
killed by editing `var/draft-room/rooms.json` with `play.sh` stopped, and a
friend's ForgeCoach on the tunnel probed `http://<tunnel host>:8643` for a coach.

**Decision.**

- **`play.sh --tunnel https://<host>`** is `--engine-only --draft-room
  --room-public-url https://<host>`, and:
  - it refuses `--lan` (cloudflared reaches loopback; `--lan` would open every
    port to the Wi-Fi as well), a URL that is not `https://` and a bare
    origin, and a `--room-public-url` that disagrees;
  - it runs `scripts/tunnel/tunnel-check.sh --local <host>` (on this run's
    ports; `--tunnel-config <path>` for a config elsewhere) **before anything
    slow or bound** and **again once the room listens**, and stops on a FAIL
    either time, taking the engine and the helper down with it. The first
    catches the config (a never-port, no Access check, a Host rewrite …); the
    second every door as the tunnel reaches it. A WARN does not stop it;
  - it prints the friend's two steps: the bare URL first (Access's PIN login
    drops a link's `#` part), then the room's "Over the internet" link,
    privately.

  It never starts or stops cloudflared: the tunnel stays a foreground process
  the owner runs and Ctrl-Cs (D405).
- **`--room-public-url <url>`** alone passes the URL to the helper (with
  `--draft-room`), for a tunnel run by hand. Nothing changes without either
  flag.
- **Revoking, on the coach helper's port (the owner's door, D386) only:**
  - `POST /room/<id>/close`: the room leaves memory and `rooms.json` at once,
    its streams get `event: gone`, both links are `404 gone`, now and after a
    restart;
  - `POST /room/<id>/friend-link`: the friend's seat gets a fresh 128-bit
    token; the old one is `403 token` at once and after a restart (the file
    holds the new digest), the old link's open streams get the new
    `event: revoked`, and the seat keeps its name, picks and deck. The answer
    carries the new token and the `bases`, so the page shows the new links.

  POST rather than `DELETE`: the helper's preflight and every route already
  speak GET and POST, and a cross-site POST is refused by the Origin rule as
  every other owner route's is. The room listener has neither route (404), so
  a seat token, a tunnel or the friend can never revoke. `/health` says
  `"roomRevoke": 1`; ForgeCoach shows the buttons only then.
- **What a revoke does not touch.** A game already being played keeps its
  per-game seat tokens (D404) until it ends: closing the room stops the room's
  port passing `/ws`, but a tunnel routes `/ws` to the table directly. Ending
  the game is ending the engine (Ctrl-C), as D405 §9 says.
- **tunnel-check, more doors.** `--local` now also asks:
  - the coach helper and the bridge's port, with a loopback `Host`, each of
    `CF-Connecting-IP`, `CF-Ray`, `Cf-Access-Jwt-Assertion` → 403 (D404's
    `admit`, D402's `TunnelGate`); the list is `policy.mjs`'s `TUNNEL_HEADERS`,
    held equal to the helper's and `WsTransport`'s by a test;
  - the table port, while a game runs: `/ws` with no or a wrong token opens
    nothing, `/observe` opens nothing, `/`, `/health`, `/observe`,
    `/index.html` are 404;
  - the room port's `/ws` (passed to the table) opens nothing without a token.
- **The five tunnel changes of `docs/security/endpoints.md`, checked against
  Phase 2:** 1 (no loopback exemption), 2 (a token per seat per game), 3
  (`https://` origins) and 5 (hidden information) were done by D402–D404; 4
  (Access in front) is met by cloudflared's `originRequest.access` (D405) plus
  the CF-header refusals. **One gap stays open, recorded rather than fixed
  here:** at a table of two the bridge's own `wsPort` is `TableServer`'s
  loopback `/health` door, without `TunnelGate`, so it answers `ok` to
  Cloudflare's headers. It serves nothing else, binds loopback, and the policy
  refuses any rule naming 8642; `tunnel-check` WARNs on it. A fix is a Java
  change in a file the Phase 3 lane is changing.
- **ForgeCoach** (its own PR): an `https://` page that is not GitHub Pages or
  loopback is a tunnel page — the bridge serves plain http only — so it is the
  room's page, never the engine's; its coach looks only for the visitor's own
  helper on 127.0.0.1 and otherwise says the coach needs their own API key or
  their own helper; repeated stream failures or a sign-in redirect on such a
  page say "reload — your Cloudflare sign-in may have expired"; the owner's
  room page has **New link for your friend** and **Close room**.

**Rejected.**

- *A revoke route on the room listener behind the owner's seat token.* The
  owner's seat token travels the same paths as the friend's (a link, a
  browser's storage); the owner's door is the machine itself.
- *Rotating both seats' tokens.* The owner's own link has not leaked when the
  friend's has; the owner's seat can be closed with the room.
- *`play.sh --tunnel` starting cloudflared.* It would turn a foreground process
  the owner sees and stops into a child of a script, and need the tunnel's name.
- *Fixing the table's health port here.* See above: a Java change for a
  loopback `ok`, in a file another lane is editing.

**Measured.**

- `tools/draft-room-selftest.mjs`: 208 checks (29 new, section 8): the routes on
  the helper; neither on the room listener (404, even with the owner's token);
  a tunnel's `Host` and a foreign `Origin` refused on the helper; GET is 405;
  the old friend link 403 at once and after a restart, the new one seat 2 with
  its name kept; the friend's stream ended with `revoked`, the owner's open;
  close → both links 404, the owner's stream `gone`, the other room untouched,
  still closed after a restart; no token in the log or the file; neither route
  nor `roomRevoke` without `--draft-room`.
- `tools/match-launcher-selftest.mjs`: 197 checks (9 new): `play.sh --tunnel`
  with the fake engine and the filled template runs the check before the engine
  and after the room listens, nothing failed; `bases.public` is the tunnel URL;
  a new friend link through play.sh's helper; a config naming 8643 stops
  `play.sh` with exit 1 before any engine or helper starts.
- `web/test/tunnel.test.ts`: 38 tests (4 new): the header lists agree; the real
  coach helper and a gated stand-in bridge pass every CF-header probe, an
  ungated one fails once per header; a stand-in table (TableDoor's rules) and
  the real room listener's `/ws` passthrough pass, a table that answers
  `/health` and opens `/observe` fails exactly those two; `play.sh` refuses
  `--tunnel` with `--lan`, `http://`, a path, a disagreeing public URL,
  `--no-coach`, and `--room-public-url` without the room, before the build.
