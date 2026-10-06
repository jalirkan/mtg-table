## D405 — The tunnel policy: one hostname behind Cloudflare Access, path-routed to the draft room's player listener alone (and later the table's seat), with cloudflared checking the Access token and the edge 404-ing every owner route

*Branch `c/cloudflare-tunnel`.* Phase 4 of play-with-a-friend ("Cloudflare readiness"). D405 is the first number free once the Phase 2 lane (`c/two-humans`, open at the same time) takes D402–D404. This lane adds files only: `docs/cloudflare.md`, `scripts/tunnel/` and `web/test/tunnel.test.ts`. It changes no listener. It answers change 4 of D386's tunnel list (`docs/security/endpoints.md`) and leaves the rest to their owners as numbered requests (`docs/cloudflare.md` §12).

**2026-10-06**

**Context.** The owner wants to draft, and later play, with a friend over the
internet. The machine runs the bridge, the coach helper and the draft room. The
plan is Cloudflare Tunnel with Cloudflare Access in front.

D386 mapped every listener and named the trap: cloudflared connects to each origin
from 127.0.0.1, and the bridge's `LanGate` and the coach helper treat a loopback
peer as the owner. D400 built the draft room's player listener (8644) with no
loopback exemption, and endpoints.md lists it as the one port a tunnel may carry
as it is. What was missing:

- a policy precise enough to check;
- a config that matches it;
- a way to check both before each session;
- a runbook a non-expert can follow.

**Decision.**

- **One hostname, routed by path.** The Access cookie belongs to one hostname,
  and a WebSocket upgrade cannot follow Access's login redirect. So the friend's
  page, its room calls and stream, and (later) its game seat all share the name
  they logged in to. In order, the ingress rules are:
  1. *(Phase 2, commented out)* `^/ws$` → `127.0.0.1:8646`;
  2. an **edge deny**: `^/(coach|vision|match|engine|review|eval|observe|health|ws|api|personal|spectate|cards|fixtures)(/.*)?$`
     → `http_status:404`;
  3. `^/room/?$` → `http_status:404`, because rooms are made on the helper only;
  4. the rest of the hostname → `127.0.0.1:8644`;
  5. a catch-all → `http_status:404`.

  The deny rules are defence in depth. The room listener 404s those paths
  already, but at the edge they stay dead even if the service line is ever
  pointed elsewhere. `ws` sits in the deny list until the Phase 2 rule above it
  is uncommented and shadows it, so turning the game seat on is one edit.
- **Never tunnelled**, and refused by the checker if a rule names them:
  - the bridge (8642): it trusts loopback;
  - the coach helper (8643): it spends Claude usage, restarts the engine,
    returns reviews and makes rooms;
  - the runner's status (8645);
  - Vite (5173, 4173): the personal tier;
  - build-sounds (9238);
  - `/observe` on any port. It is one seat's view. A redacted spectator stream
    would be a new listener and a new decision.

  The friend's coach never reaches the owner's helper. Their page's helper probe
  is mixed content and the port is not proxied.
- **cloudflared checks the Access token itself.** A top-level
  `originRequest.access {required: true, teamName, audTag}` (measured below:
  cloudflared's own `AccessConfig` type) makes cloudflared verify
  `Cf-Access-Jwt-Assertion` before forwarding anything. That meets endpoints.md
  change 4 ("the origin should check Access's JWT rather than trust that the
  tunnel is the only way in") at the one process every tunnelled request passes
  through. It needs no JWKS client in Java or in Node. A deleted or loosened Access
  application then fails closed at cloudflared.
- **Access policy:**
  - a self-hosted application on the whole hostname (no path);
  - **Allow → Emails**, listing the owner and the friend;
  - One-time PIN as the only login method, with Instant Auth;
  - a session duration of 24 h.

  Never Everyone, a domain rule or Bypass. Access decides who reaches the origin;
  the seat tokens still decide which seat (D386's change 4: neither replaces the
  other).
- **The friend's page comes through the tunnel; the owner's never does.**
  - The owner keeps using github.io or `127.0.0.1:8644` against loopback.
  - The friend opens `https://<host>/#draft/friend/join?…`, served by the room
    listener. Same-origin, so the Access cookie covers it and D400's page-own
    Origin rule passes it with no `--room-origin`.

  Cross-origin (github.io → tunnel) would need Access CORS and credentialed
  fetches, which ForgeCoach does not send. The first login loses the `#fragment`
  (a PIN form POST), so the runbook sends the bare hostname first and the join
  link second. That also keeps the seat token off the login page's URL.
- **Run `play.sh` without `--lan`.** cloudflared reaches loopback, and `--lan`
  would also open every port to the Wi-Fi. The checker warns on any mtg-table
  port bound beyond loopback, and fails on Vite.
- **Run the tunnel in the foreground, for a session.** The runbook installs no
  service. Ctrl-C on cloudflared is the "everyone out, now" switch.
- **The policy is one file and everything reads it.** `scripts/tunnel/policy.mjs`
  holds the allowlist, the never-ports and never-paths, the deny regexes and
  `expectedIngress()`. It also holds `checkConfig()`, a strict reader for the
  config's YAML shape that refuses anchors, tags and block strings rather than
  misread them, and the probe verdicts.
  - `config.yml.example` must parse to exactly `expectedIngress()`, with the game
    seat commented and uncommented.
  - `tunnel-check.mjs` asks; it decides nothing of its own.
- **`tunnel-check.sh`**, run before every session:
  - **`--local`** checks:
    - the real `~/.cloudflared/config.yml` against the policy;
    - cloudflared's own `ingress validate`, and `ingress rule` for every
      never-path, the routing exactly as cloudflared does it;
    - each door as the tunnel reaches it, from 127.0.0.1 with the tunnel's
      `Host` and `https://` Origin. The room wants a token, a foreign Origin is
      403, every never-path is 404 or 405, and the helper refuses the tunnel's
      `Host` (D386).
  - **From outside**, it checks:
    - that the name resolves to Cloudflare;
    - with no login, every path is answered by Access, and plain http never
      reaches the origin;
    - nothing listens on the hostname's or the router's mtg-table ports;
    - with a service token or the `CF_Authorization` cookie, in the environment
      and never in argv, the doors behind Access.

  It sends at most 4 wrong-token requests, under the room's 10-a-minute
  failure limit.

**Rejected.**

- *A hostname per service* (room, seat). This means two Access cookies, and a
  WebSocket on the second one cannot follow its login redirect.
- *Quick tunnels (`trycloudflare.com`).* They need no domain, but have a random
  name and cannot sit behind Access.
- *Verifying the Access JWT in each listener.* That is a JWKS fetch and cache in
  Java and in Node, for what cloudflared already does in front of both.
- *`httpHostHeader: 127.0.0.1`* to "make the helper work through the tunnel".
  That is exactly the rewrite that defeats D386's `Host` check. The checker
  refuses it anywhere in the config.
- *Serving the friend from github.io with `&s=<tunnel>`.* This is cross-origin to
  an Access-protected host: the preflight meets a login redirect.
- *A `cloudflared service install` systemd unit.* It is always on, and the
  owner's habit should be a tunnel that exists only while playing. It also needs
  sudo.
- *Editing play.sh, the helper, the bridge or ForgeCoach in this lane.* Phase 2
  is changing them at the same time. What they owe is listed in `docs/cloudflare.md`
  §12, as numbered requests.

**Measured.**

- `node --test web/test/tunnel.test.ts`: 34 tests. They cover:
  - the template is the policy (both ways);
  - 21 broken configs each refused for its own reason (each never-port,
    `localhost`, https and tcp services, no catch-all, a second or wildcard
    hostname, a Host rewrite, warp-routing, no Access check, Access not required,
    each deny rule dropped, a path on the room rule, `/ws` to the room, an
    unknown key, a YAML anchor);
  - the deny regexes against every never-path and every room route;
  - the YAML reader, the verdicts, `ss` parsing, the Cloudflare ranges and the
    CLI's arguments;
  - end to end, the real `tools/draft-room.mjs` listener with a live room passes
    `--local` (`403 token` without the seat token). A listener that answers
    everything, a helper that answers a tunnel's `Host`, and a config pointing at
    8643 each fail it.
- With cloudflared 2026.10.0, the filled template passes `ingress validate`.
  `ingress rule` sends every never-path, and `/ws` while the seat is commented,
  to `http_status:404`, and `/`, `/room/<id>` and `/room/<id>/events` to 8644.
  Uncommented, `/ws` goes to 8646 and `/ws/x` still 404s. An unknown key under
  `access` makes cloudflared warn "field … not found in type
  config.AccessConfig", which shows `required`/`teamName`/`audTag` are its own
  fields.
- `tunnel-check.sh --local` was run against the real coach helper with
  `--draft-room` on spare ports and a live room. Nothing failed: the room
  answered `403 token` and the helper answered `403` to the tunnel's `Host`.
  The outside mode was not run here; it needs a real hostname.
