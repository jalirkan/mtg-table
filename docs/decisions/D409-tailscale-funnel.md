## D409 — Tailscale Funnel: `play.sh --funnel` routes the PC's ts.net name to the draft room alone, in foreground mode, checked; the owner's doors refuse tailscaled's headers

*Branch `tailscale`.* Play-with-a-friend through Tailscale Funnel, beside D405/D408's Cloudflare tunnel. D406 and D407 belong to the Phase 3 lane. This amends D405 (the tunnel-header list grows, and tunnel-check gains `--funnel`) and D400/D404 (whom the room's limits count).

**2026-10-06**

**Context.** The owner wants to draft and play with a friend tonight. The friend
will install nothing, so a shared tailnet is out. A Cloudflare tunnel needs a
domain and Access set up first. Tailscale Funnel gives the PC a public
`https://<machine>.<tailnet>.ts.net` name with a certificate, and needs only
Tailscale on the PC. tailscaled's serve proxy (`ipn/ipnlocal/serve.go`, read for
this decision) reaches a local port from 127.0.0.1. It keeps the `Host` the
visitor asked for (`r.Out.Host = r.In.Host`) and sets `X-Forwarded-For` (to the
client's address, replacing any sent), `X-Forwarded-Host` and `X-Forwarded-Proto`.
On a Funnel request it also sets `Tailscale-Funnel-Request: ?1`. For a tailnet
user it sets `Tailscale-User-Login`/`-Name`/`-Profile-Pic`. This is D405's tunnel
model (loopback peer, the public name as `Host`, `https://` origins on 443), with
one difference: **nothing in front checks who the visitor is.**

**Decision.**

- **`play.sh --funnel`** is `--engine-only --draft-room --room-public-url
  https://<Self.DNSName>` (from `tailscale status --json`). It stops before
  anything is built if Tailscale is missing or not `Running`, if it has no `*.ts.net`
  name, or if that name is not in `CertDomains` (HTTPS off). It refuses `--lan`
  and `--tunnel`, and works with `--pause-lab`. Once the room listens, it runs
  `tailscale funnel <roomPort>` **in foreground mode as its own child**. That maps
  `/` to `http://127.0.0.1:<roomPort>` and nothing else (the room passes `/ws` to
  a game's table itself, D404). tailscaled ties a foreground route to the CLI's
  session, so the route goes when the child goes, whether by Ctrl-C, a crash or
  `kill -9` of play.sh. No `--bg` config can outlive the session. It then runs
  `tunnel-check --local --funnel <name>`, and stops (Funnel off) on any FAIL. It
  prints the friend's one step.
- **`tunnel-check --local --funnel <name>`** reads tailscaled's own routing
  (`tailscale serve status --json`: the background config and every foreground
  session's). The rules: on every host:port Funnel is on for, exactly one
  handler, `/` → `http://127.0.0.1:<room>` (or `localhost`); no TCP forward; the
  name asked about routed; and no handler anywhere, Funnel or tailnet-only,
  naming a never-port. Then it runs D408's door checks unchanged, with the ts.net
  `Host` and `https://` `Origin`.
- **The owner's doors refuse tailscaled's headers** as they refuse Cloudflare's:
  `TUNNEL_HEADERS` (policy.mjs, coach-helper.mjs, `WsTransport`'s `TunnelGate`)
  gains `tailscale-funnel-request`, `tailscale-user-login`, `x-forwarded-for` and
  `x-forwarded-host`. The forwarded pair is on every serve/funnel request, the
  tagged-node and local cases included. Nothing that may legitimately reach 8642
  or 8643 sends them: there is no proxy in front of either, and Vite proxies
  nothing. The coach helper already refused the ts.net `Host` (D386). The headers
  are the second lock, for a forwarder that rewrites `Host`.
- **Whom the room's limits count** (`clientKey`). On a loopback request marked
  `Tailscale-Funnel-Request`, the room uses `X-Forwarded-For`, which tailscaled
  sets. It never uses a `CF-Connecting-IP`, which a Funnel visitor can send as
  they like and tailscaled passes through. The same address goes to the table as
  `CF-Connecting-IP` on the `/ws` pass-through. Before this, every Funnel visitor
  was one bucket, `127.0.0.1`, and ten wrong links from a scanner would have
  locked the friend out for a minute.
- **ForgeCoach** labels the link "Over the internet" as for a tunnel, with a
  Funnel note (one link, no sign-in, close the room after). On a `*.ts.net` page a
  dropping stream asks for a reload without blaming a Cloudflare sign-in.
- **Security posture:** the per-seat tokens are the only lock (D400, D404). This
  is the posture D405 rejected for a Cloudflare quick tunnel, and it is accepted
  here because the owner asked for it, the room listener was built to stand
  alone behind such a name, and the owner's routes do not exist on that port.
  `docs/tailscale-funnel.md` says it plainly.

**Rejected.**

- *A shared tailnet (the friend installs Tailscale and accepts a share).* It is
  the safer design, but the friend will not install anything. It also has a trap
  for the next lane to know: under userspace tailscaled every loopback port of
  the PC is reachable by whoever the ACL lets in.
- *`tailscale funnel --bg`.* Background config persists across reboots until
  someone turns it off, so a crashed play.sh would leave the room public. Foreground
  mode cannot outlive play.sh.
- *Routing `/ws` to the table port separately* (as D405's GAME SEAT rule does):
  the room's pass-through already carries it, and one route is easier to check.
- *An outside check through Funnel.* It is not built: from the PC itself a
  ts.net name resolves inside the tailnet, so it would not test the public path.
  The runbook gives the phone-off-Wi-Fi check instead.

**Measured.**

- `tools/match-launcher-selftest.mjs` (16 new checks), with a fake `tailscale`
  CLI: `play.sh --funnel --pause-lab` reads the name and starts one engine. It
  runs a foreground `tailscale funnel <room port>` after the room listens. Its
  tunnel-check passes the route, `tailscale-funnel-request` on the helper and
  `x-forwarded-for` on the bridge. It prints the one link, and the lab is held
  and then released. `bases.public` is `https://<name>`. The room admits the
  friend as Funnel delivers them (ts.net Host, https Origin, its headers, the
  token) and refuses them without the token. The helper refuses the same
  request. Ctrl-C ends the funnel child and the route is gone. Tailscale stopped,
  `--lan`, `--tunnel` and no `tailscale` are refused before any engine. A route
  that also names 8643 FAILs the check, and play.sh exits 1 with the funnel off.
- `tools/draft-room-selftest.mjs`: the ts.net Origin/Host rule, `clientKey` (Funnel's
  `X-Forwarded-For`, a forged `CF-Connecting-IP` ignored, a malformed one), a
  Funnel request with and without the token, and the `/ws` pass-through telling
  the table the Funnel client and dropping the visitor's own header.
- `tools/coach-helper-selftest.mjs`: `viaTunnel` for the four headers. The live
  helper answers 403 to a Funnel request, and to `Tailscale-Funnel-Request` or
  `X-Forwarded-For` with a loopback `Host`.
- `WsLanSelfTest`: `viaTunnel` rows, and `/health` and `/ws` with Funnel's
  headers are 403. `TableSelfTest`: `originOk` for a ts.net Origin and Host.
- `web/test/tunnel.test.ts`: `funnelRules` (the room alone passes; a never-port,
  the bridge instead of the room, a file handler, a raw TCP forward, no route
  and a tailnet-only serve of the helper fail), and `--funnel` wants `--local`.
