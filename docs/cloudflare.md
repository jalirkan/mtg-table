# Playing with a friend over the internet: Cloudflare Tunnel + Access

**D405.** This runbook lets a friend reach your draft room (and, once Phase 2
lands, the game) from anywhere, while nobody else can reach anything. You don't
need to open any ports on your router.

- **Cloudflare Tunnel** (`cloudflared`) runs on your machine. It makes an
  outbound connection to Cloudflare, which then sends visitors of one hostname
  (say `play.example.com`) down that connection to the local ports you name.
- **Cloudflare Access** sits in front of that hostname. Nobody gets past it
  without logging in with an email address on your list (you and your friend),
  using a one-time PIN sent to that address.
- **mtg-table's own tokens** stay the lock behind Access. Each seat in a room has
  its own token, so getting past Access is not enough to touch a room.

The policy behind this (what may go through and what may not) is in one file,
[`scripts/tunnel/policy.mjs`](../scripts/tunnel/policy.mjs). The config template
[`scripts/tunnel/config.yml.example`](../scripts/tunnel/config.yml.example) and the
checker [`scripts/tunnel/tunnel-check.sh`](../scripts/tunnel/tunnel-check.sh) are
both held to it, and `web/test/tunnel.test.ts` fails if the template drifts.
[`docs/security/endpoints.md`](security/endpoints.md) is the map of every port this
repo opens.

> **The one fact to remember.** cloudflared connects to your services *from
> 127.0.0.1*. The bridge (8642) and the coach helper (8643) treat a 127.0.0.1
> visitor as you. So the tunnel may point only at a listener that trusts nobody
> by address, and today that is just the draft room's player listener (8644).

---

## Contents

1. [What goes through, and what never does](#1-what-goes-through-and-what-never-does)
2. [What you need, and what it costs](#2-what-you-need-and-what-it-costs)
3. [Setup, once](#3-setup-once)
4. [Cloudflare Access, once](#4-cloudflare-access-once)
5. [WebSockets and the event stream](#5-websockets-and-the-event-stream)
6. [ForgeCoach and the links](#6-forgecoach-and-the-links)
7. [Each session: start, check, play, stop](#7-each-session-start-check-play-stop)
8. [Security checklist](#8-security-checklist)
9. [Revoking access](#9-revoking-access)
10. [Troubleshooting](#10-troubleshooting)
11. [The game seat (Phase 2): placeholder](#11-the-game-seat-phase-2-placeholder)
12. [Changes the other lanes still owe](#12-changes-the-other-lanes-still-owe)

---

## 1. What goes through, and what never does

Use **one hostname**, with routing by path. The Access login cookie belongs to one
hostname, and a WebSocket cannot follow Access's login redirect. So the friend's
page, its room calls and (later) its game seat all have to live on the name they
logged in to.

| Path on `https://play.example.com` | Goes to | Who can use it once past Access |
|---|---|---|
| `/room/<id>`, `/room/<id>/events`, `/join`, `/pick` | `127.0.0.1:8644`, the draft room's player listener (D400) | Only a holder of that seat's token, sent in `X-Room-Token`. A wrong token gets 403, an unknown room 404, and 10 wrong tries a minute from one address get 429. |
| `/`, `/assets/…` and the rest of the site | `127.0.0.1:8644` (the same listener) | Anyone past Access. These are ForgeCoach's public build, the same bytes as GitHub Pages. |
| `/ws` | **Phase 2, placeholder:** `127.0.0.1:8646` (the table's game seat, [§11](#11-the-game-seat-phase-2-placeholder)) | Only a holder of that seat's token for that game. Until Phase 2 lands, the edge answers 404. |
| `/coach`, `/vision`, `/match`, `/engine/…`, `/review`, `/eval`, `/observe`, `/health`, `/api`, `/personal`, `/spectate`, `/cards`, `/fixtures`, and `/room` itself | **Answered 404 by cloudflared at the edge**, so nothing local is asked | No one |
| Any other hostname | 404 (the catch-all) | No one |

**Never through the tunnel, on any path:**

- **The coach helper, port 8643.** `/coach` and `/vision` spend your Claude usage.
  `POST /match` and `POST /engine/start` restart the engine. `/review` returns your
  past games, hand included. `POST /room` makes rooms, which only you do. Your
  friend's coach is their own business (see [§6](#6-forgecoach-and-the-links)).
- **The bridge, port 8642.** Its `LanGate` lets any 127.0.0.1 visitor in without
  a token, and cloudflared is 127.0.0.1. That covers its seat `/ws`, its `/observe`,
  its `/health` and the site it serves with `--lan`. A tunnel pointed at it would
  hand your seat to the internet.
- **`/observe`, on any port.** It is one seat's view, which means your hand. A
  redacted spectator stream would need its own listener and its own decision
  first. Until then the edge answers 404.
- **The Vite dev server, 5173 and 4173.** It serves your personal tier and your
  recordings (D190).
- **The lab runner's status, 8645.** It is already public through the
  `lab-status` branch, so a tunnel adds nothing.

`tunnel-check.sh` fails if any rule in your config names one of these ports.

---

## 2. What you need, and what it costs

| Item | Cost |
|---|---|
| A Cloudflare account | Free |
| **A domain whose DNS is on Cloudflare.** Tunnels with Access need one: the free `trycloudflare.com` quick tunnels give a random name and no Access, so this policy does not allow them. | About $10 a year to register one at Cloudflare Registrar (at cost). It is free if you already own a domain and move its nameservers to Cloudflare. |
| Cloudflare Tunnel | Free, with no bandwidth charge for this use |
| Cloudflare Zero Trust, **Free plan** (Access, one-time PIN, service tokens) | Free for up to 50 users, and you need 2. The sign-up may ask for a payment card even on the Free plan. You are not charged on it. |
| WebSockets through Cloudflare | Free, on by default on every plan |

So the only cost is the domain, if you don't already have one.

---

## 3. Setup, once

Everything here runs on **the machine that runs `play.sh`**. If you use WSL, run
it in the same WSL distro as `play.sh`, because each distro has its own
127.0.0.1. Commands assume you're in the repo, `~/code/mtg-table`.

### 3.1 Install cloudflared

With sudo (Cloudflare's own apt repository):

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install cloudflared
```

Without sudo, use the single binary from Cloudflare's GitHub releases:

```bash
mkdir -p ~/.local/bin
curl -fL -o ~/.local/bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/.local/bin/cloudflared
cloudflared --version        # (~/.local/bin must be on PATH)
```

Compare the binary's `sha256sum` with the checksum on that release's page.

Do **not** run `cloudflared service install`. A tunnel that runs only while you
play is the safer habit ([§7](#7-each-session-start-check-play-stop)).

### 3.2 Log in, create the tunnel, give it a name

```bash
cloudflared tunnel login
```

This prints a URL; open it in any browser, log in, and pick your domain. It writes
`~/.cloudflared/cert.pem`.

```bash
cloudflared tunnel create forge-table
```

This prints the tunnel's **UUID** and writes `~/.cloudflared/<UUID>.json`.

```bash
cloudflared tunnel route dns forge-table play.example.com
```

This creates a proxied CNAME `play.example.com → <UUID>.cfargotunnel.com`.

```bash
chmod 700 ~/.cloudflared
```

The credentials file lets anyone who has it run *your* tunnel, so keep it private.
`cert.pem` lets its holder create and delete tunnels on your domain. You need it
only for `create`, `route` and `delete`, so you may move it somewhere offline
after this step.

### 3.3 The config

```bash
cp scripts/tunnel/config.yml.example ~/.cloudflared/config.yml
```

Edit `~/.cloudflared/config.yml` and replace the placeholders:

| Placeholder | With |
|---|---|
| `<TUNNEL-UUID>` (twice) | the UUID from `tunnel create` |
| `play.example.com` (in every rule) | your hostname |
| `your-team` | your Zero Trust team name, the `<team>` in `<team>.cloudflareaccess.com` |
| `<AUD-TAG>` | the Access application's AUD tag (made in [§4](#4-cloudflare-access-once)) |

Change nothing else. In particular:

- Never add `httpHostHeader`. The coach helper refuses a tunnel's hostname in
  `Host` (D386), and a rewrite to `127.0.0.1` would undo that.
- Never use `localhost` in place of `127.0.0.1`.
- Never add `warp-routing`.

The `originRequest.access` block makes **cloudflared itself** check the Access
token on every request before anything reaches 127.0.0.1. Even if the Access
application were deleted or its policy loosened by mistake, requests would stop
at cloudflared. This is how D405 answers the "check `Cf-Access-Jwt-Assertion`"
change listed in `docs/security/endpoints.md`.

Check the result:

```bash
./scripts/tunnel/tunnel-check.sh --local play.example.com
```

This checks the config against the policy. If cloudflared is installed, it also
runs `cloudflared … ingress validate` and `ingress rule` for every never-path,
which is the routing exactly as cloudflared will do it.

---

## 4. Cloudflare Access, once

All of this is in the Zero Trust dashboard (`one.dash.cloudflare.com`, or
**Zero Trust** in the main dashboard). Menu names drift. If one has moved, look
for the same words.

1. **Login method.** Go to **Settings → Authentication → Login methods → Add
   new → One-time PIN**. No password and no third-party account: Cloudflare emails
   a code to the address being checked.
2. **The application.** Go to **Access → Applications → Add an application →
   Self-hosted** and fill in:
   - **Name:** `Forge table`.
   - **Session duration: 24 hours.** A draft plus a game fits in it, and a lost
     laptop is locked out again by tomorrow. Shorter is fine; you'll just log in
     more often.
   - **Application domain:** `play.example.com`, with **no path**, so the whole
     hostname is covered. A path here would leave the rest of the hostname
     unprotected.
   - **Identity providers:** only **One-time PIN**, with **Instant Auth** on, so
     the login page goes straight to the PIN.
   - **Cookie settings:** leave the defaults (HttpOnly on, SameSite Lax). You
     don't need CORS settings, because everything is same-origin
     ([§6](#6-forgecoach-and-the-links)).
3. **The policy.** Add a policy named `Justin and friend` with **Action: Allow**,
   **Include → Emails:** your address and your friend's, one per line.
   - Never use **Everyone**, **Emails ending in**, or a **Bypass** action. Each of
     those lets strangers through.
   - When a different friend plays, edit this list ([§9](#9-revoking-access)).
4. **The AUD tag.** Open the application's overview, copy **Application Audience
   (AUD) Tag**, and paste it into `~/.cloudflared/config.yml` under `audTag`. Your
   team name goes in `teamName`.
5. **Optional: a service token for the checker.** Go to **Access → Service auth →
   Service tokens → Create** and name it `tunnel-check`. Then, on the application,
   add a second policy: **Action: Service Auth**, **Include → Service Token →
   tunnel-check**. `tunnel-check.sh` can then look behind Access from outside:

   ```bash
   CF_ACCESS_CLIENT_ID=… CF_ACCESS_CLIENT_SECRET=… ./scripts/tunnel/tunnel-check.sh play.example.com
   ```

   Pass the token in the environment, never on the command line. Anyone holding the
   token gets past Access (not past the seat tokens), so keep it like a password.
   Delete it when you're done, or skip this step and use your browser's
   `CF_Authorization` cookie instead: `CF_AUTHORIZATION=<value> ./scripts/tunnel/…`.

---

## 5. WebSockets and the event stream

- **The draft room has no WebSocket.** Each player's page streams the room with
  server-sent events (`GET /room/<id>/events`), read with `fetch()` so the seat
  token can go in a header (D400). This works through Cloudflare unchanged:
  - The listener sends `Cache-Control: no-store, no-transform`, so Cloudflare
    neither caches nor compresses the stream.
  - It sends a `: ping` every 15 seconds, well inside Cloudflare's 100-second idle
    limit.
  - A reconnect starts with the whole state.
- **The game seat (Phase 2) is a WebSocket.** Cloudflare proxies WebSockets on
  every plan. Check **your domain → Network → WebSockets: On** (the default).
  cloudflared carries the upgrade to an `http://` service as-is. Access checks the
  upgrade by its `CF_Authorization` cookie, which the browser sends because the
  page and the socket share one hostname. A socket on a second hostname would
  fail: an upgrade cannot follow a login redirect.
- **Don't turn on page-rewriting features for this hostname**, such as Rocket
  Loader or a "Cache Everything" rule. The room's JSON says `no-store`, and the
  page should arrive byte for byte.

---

## 6. ForgeCoach and the links

**You (the owner)** use ForgeCoach the way you always do:
`https://jalirkan.github.io/ForgeCoach/`, or `http://127.0.0.1:8644/`, on the
machine that runs `play.sh`. Your page talks to the coach helper and the room
listener on 127.0.0.1 directly. **Your own traffic never goes through the
tunnel**, so your coach works as always.

**Your friend** opens a page **served through the tunnel**,
`https://play.example.com/…`. The room listener serves ForgeCoach's site, so the
page, its room calls and its stream are all same-origin:

- the Access cookie covers all of them;
- the room listener's Origin rule passes the page's own origin
  (`https://<Host>`, D400), so you don't need `--room-origin`.

Why not GitHub Pages for the friend, with the room on the tunnel? That would be
cross-origin requests to an Access-protected host. Access would answer the
browser's preflight with a login redirect, and the calls would fail.

### The friend's link

ForgeCoach's **Draft → Draft with a friend → Create room** shows links built from
the room's `bases` (the D400 public-URL support). `bases.public` comes from the
coach helper's `--room-public-url`, which ForgeCoach shows as **"Over the
internet"**. `play.sh` does not pass that flag yet (request 1 in
[§12](#12-changes-the-other-lanes-still-owe)). Until it does, make the link by
hand:

1. Copy the **"On this computer (another browser)"** link. It looks like
   `http://127.0.0.1:8644/#draft/friend/join?room=rAbC12_xY&t=<friend's seat token>`.
2. Replace `http://127.0.0.1:8644` with `https://play.example.com`. **Keep
   everything from `#` on exactly as it is.**
3. You get `https://play.example.com/#draft/friend/join?room=rAbC12_xY&t=…`.

The seat token is in the `#fragment`, which no server sees: not Cloudflare, not
your machine. ForgeCoach moves it into the browser's storage and drops it from the
address bar.

**Send it in two steps.** On the friend's first visit, Access's login (a form
with a PIN) drops the `#fragment`, so they would land on ForgeCoach's start page
instead of the join page:

1. Send `https://play.example.com/` first. Your friend enters their email, then
   the PIN Cloudflare emails them.
2. Then send the join link, privately (a direct message, not a group chat), and
   ask your friend to open it in the same browser. The token never visits the
   login page this way.

### The friend's coach

The friend's page was not served by GitHub Pages, so ForgeCoach looks for a coach
helper at `http://play.example.com:8643`. An https page cannot call that (mixed
content), and Cloudflare doesn't carry that port anyway. So **your helper is never
reachable from their page, by design**, and their coach panel says the helper
isn't running. If they want advice, they can set ForgeCoach's coach source to
**API key** in Settings and use their own Anthropic key. Request 7 in [§12](#12-changes-the-other-lanes-still-owe)
asks ForgeCoach to say this more clearly.

### The game seat (Phase 2)

ForgeCoach's `src/play/seatUrl.ts` already does the right thing for a page that
was not served by GitHub Pages or Vite: the seat is same-origin, at
`wss://<page host>/ws?…`. Through the tunnel that becomes
`wss://play.example.com/ws`, which the placeholder rule routes to the table's
port. What the bridge must match is request 2 in
[§12](#12-changes-the-other-lanes-still-owe).

---

## 7. Each session: start, check, play, stop

```bash
# 1. The engine and the draft room -- WITHOUT --lan: cloudflared reaches loopback,
#    and --lan would also open every port to your Wi-Fi.
./scripts/play.sh --engine-only --draft-room

# 2. In a second terminal: the tunnel, in the foreground (Ctrl-C stops it).
cloudflared tunnel run forge-table          # reads ~/.cloudflared/config.yml

# 3. In a third terminal: the local check (config, routing, every door).
./scripts/tunnel/tunnel-check.sh --local play.example.com
```

Then do the outside check. The best place is a laptop on your phone's hotspot, or
any machine that is not on your home network:

```bash
./scripts/tunnel/tunnel-check.sh play.example.com --ip <your home's public IP>
```

| The outside check expects | Why |
|---|---|
| Every path (`/`, a room, every never-path, `/ws`, `/observe`) answered by **Access** with a login redirect, never by your machine | Access covers the whole hostname |
| Plain `http://` redirected to `https://` or to Access | Nothing goes over plain http |
| Nothing listening on the hostname's 8642, 8643, 8644, 8646 or 5173 | The name points at the tunnel, not your IP |
| With `--ip`: nothing on your router's ports | No port forwards |
| With a service token or cookie: every never-path 404, a room route without the seat token 403 or 404, a foreign Origin 403, and no socket on `/observe` or `/ws` | The doors behind Access |

Add `--room <id>` (the `room=` from the link) to test a live room. A room
route with no token must then answer `403 token`.

**From a phone on mobile data.** Turn Wi-Fi off and open
`https://play.example.com/`:

1. Expect the Cloudflare Access page. Enter your email and then the PIN.
2. ForgeCoach loads.
3. Open the join link. The draft room appears.

Do the same on the friend's side if you like (use your own seat's link from the
same page, not theirs).

**Stopping.** Press Ctrl-C in the cloudflared terminal. The hostname immediately
answers Cloudflare's error 1033 (no tunnel) to everyone, and nothing on your
machine is reachable from outside any more. Then press Ctrl-C in `play.sh`.
Rooms survive a restart (D400), so a draft can continue tomorrow.

---

## 8. Security checklist

Before you send a link, check every box:

- [ ] `play.sh` was started **without `--lan`**. `tunnel-check.sh --local` should
  say "listening ports: every mtg-table port is on loopback only".
- [ ] `tunnel-check.sh --local play.example.com` reports **nothing failed**: the
  config is the policy's, cloudflared routes every never-path to 404, the room
  wants a token, and the coach helper refuses the tunnel's `Host`.
- [ ] The outside check (`tunnel-check.sh play.example.com`) reports **nothing
  failed**, ideally run with a service token or cookie so the doors behind Access
  are checked too.
- [ ] The Access application covers the **whole hostname** (no path). Its only
  policies are **Allow → Emails: you and this friend** (plus the optional Service
  Auth for the checker). There is no Everyone, no domain rule and no Bypass.
  Session duration is 24 hours or less, and the login method is One-time PIN.
- [ ] `~/.cloudflared/config.yml` has no `httpHostHeader`, no `warp-routing`, no
  `localhost`, and no port other than 8644 (and 8646 once Phase 2 is confirmed).
- [ ] Your router forwards none of 8642–8646 or 5173. A tunnel needs no inbound
  ports (`--ip` checks this).
- [ ] `~/.cloudflared` is mode 700, and the credentials JSON has never been
  shared, committed or pasted anywhere.
- [ ] The friend's join link goes **to them only**, after they have logged in
  once ([§6](#6-forgecoach-and-the-links)). It holds their seat token.
- [ ] After the session, stop cloudflared.

Cloudflare terminates TLS, so it sees request headers, including `X-Room-Token`,
in transit. The design accepts that: Cloudflare is the trusted middle, and a seat
token opens one seat in one room until the room expires.

---

## 9. Revoking access

From the fastest to the most targeted:

| To shut out… | Do |
|---|---|
| **Everyone, now** | Ctrl-C cloudflared. Nothing is reachable until you start it again. |
| **One person, for good** | Remove their email from the Access policy. Then revoke their session: **Access → Applications → Forge table → Revoke existing tokens**, or **My Team → Users → (user) → Revoke**. Their next request goes back to the login page, and their PIN no longer works. |
| **A leaked room link** (seat token) | Behind Access, a leaked link alone gets a stranger nowhere. To kill the link anyway: a room's tokens last until the room expires (24 h after its last pick, 72 h at most). **A restart does not revoke them**, because rooms are kept in `var/draft-room/rooms.json`. Today the only way is to stop `play.sh` and delete that room's entry from the file, or the whole file to drop every room. Request 6 in [§12](#12-changes-the-other-lanes-still-owe) asks for a revoke button. |
| **A game seat token** (Phase 2) | Tokens are minted per game. Ending the game (`play.sh` restarts the engine for the next match) makes them worthless. |
| **The service token** | **Access → Service auth → Service tokens → delete** (or rotate). |
| **A leaked tunnel credentials file** | `cloudflared tunnel delete forge-table` (Ctrl-C it first). Then `tunnel create` and `route dns` again with a new UUID, and update the config. |
| **The `--lan` pairing token** | It isn't used here. It changes on every `play.sh` run. |

---

## 10. Troubleshooting

| You see | Likely cause | Fix |
|---|---|---|
| Cloudflare **error 1033** | cloudflared isn't running or isn't connected | Start `cloudflared tunnel run forge-table`, and read its log lines |
| **502 Bad Gateway** | The tunnel is up, but nothing listens on 8644 | Start `./scripts/play.sh --engine-only --draft-room`, and check its "Draft room: on" line |
| **404** on the page itself | The hostname in the config differs from the one in DNS, so the catch-all answers | Run `cloudflared tunnel ingress rule https://play.example.com/`: it must say `http://127.0.0.1:8644` |
| The page says *no site here* | The room listener has no ForgeCoach site (no network when `play.sh` started) | Restart with network, or use `--site-dir <a built ForgeCoach>` |
| No PIN email | Spam folder, a typo in the policy's address, or One-time PIN not enabled | Check §4 steps 1 and 3 |
| A login loop | The application domain covers only a path, or the browser blocks Cloudflare's cookies | Cover the whole hostname, and allow cookies for `*.cloudflareaccess.com` |
| The friend lands on ForgeCoach's **start page**, not the join page | First login dropped the `#fragment` | Open the join link again in the same browser (§6) |
| `403 {"code":"origin"}` | The page wasn't served by the tunnel (say, github.io with `&s=`), or `Host` is rewritten (`httpHostHeader`) | Use `https://play.example.com/#…`, and remove `httpHostHeader` |
| `403 {"code":"token"}` | Wrong or old link for that room | Make a fresh link from your room's page |
| `404 {"code":"gone"}` | The room expired, or its id is mistyped | Make a new room |
| `429 {"code":"slow"}` | 10 wrong links in a minute from that address (`CF-Connecting-IP`) | Wait a minute |
| The draft **stops updating** after hours | The Access session expired: Cloudflare now answers the stream with a login redirect, which `fetch()` can't follow | Reload the page and log in again. The room has kept every pick. |
| `tunnel-check` says **"answered WITHOUT an Access login"** | Access doesn't cover that path, or a Bypass policy exists | Fix the application (§4 step 2) |
| `tunnel-check` says **"something answers on …:8643"** | The DNS record points at your IP (a grey cloud or an A record), not only the tunnel | Delete that record, run `cloudflared tunnel route dns` again, and remove router forwards |
| `cloudflared … unused keys` | A typo in `config.yml` | Run `cloudflared tunnel --config ~/.cloudflared/config.yml ingress validate` |
| It works from home but not from the phone | Your home network resolves the name differently (split DNS, hosts file) | Test on mobile data, which is the real path |

---

## 11. The game seat (Phase 2): placeholder

> **PLACEHOLDER.** Phase 2 (two human seats in the bridge, branch `c/two-humans`)
> is not merged. Its plan is a **table port, `tablePort` 8646**. That port exists
> only while a game between two people runs, has no loopback exemption, and needs
> a per-seat, per-game token on `/ws`. Its endpoints.md row and its decision are
> the authority once merged. Until then, nothing routes to it.

When it lands:

1. Confirm the port and the path (`/ws`) in its decision and in endpoints.md.
2. If either differs, change `GAME_SEAT` in `scripts/tunnel/policy.mjs`, and the
   commented block in `config.yml.example` to match. Set `placeholder: false`.
   Run `npm --prefix web test`: `web/test/tunnel.test.ts` checks the uncommented
   block against the policy.
3. In `~/.cloudflared/config.yml`, uncomment the three rule lines between
   `# >>> GAME SEAT` and `# <<< GAME SEAT`. They come before the edge-deny rule,
   so they take `/ws` back from it.
4. Restart cloudflared, then run `tunnel-check.sh --local … --game-seat` during a
   game, and the outside check. `/ws` with no seat token must not open a socket.

---

## 12. Changes the other lanes still owe

This lane (D405) added only docs, scripts and a test. The changes below are
needed in files other lanes own. They are numbered so they can be referred to.

1. **`play.sh`: hand the public URL to the draft room.** Add something like
   `--public-url https://play.example.com`, or `config.json` `publicUrl`, that
   becomes the helper's `--room-public-url`. ForgeCoach then shows the **"Over the
   internet"** link and the hand edit in §6 goes away. Leave `--lan` out of it:
   the tunnel needs loopback only.
2. **Phase 2 table listener: make it tunnel-shaped.**
   - The friend's seat is `wss://<the page's host>/ws?seat=<token>` on the **same
     hostname with no port**. Cloudflare doesn't carry 8646, and an https page
     needs `wss:`.
   - The table port serves `/ws` only: no `/observe`, no site, and a plain GET or
     an unknown path is 404.
   - A missing or wrong token is refused **before** the handshake.
   - Its Origin rule accepts `https://<Host>` on port 443.
   - Confirm the port, so `GAME_SEAT` in `scripts/tunnel/policy.mjs` can drop its
     placeholder flag.
3. **ForgeCoach either-seat play: build the seat URL from the page.** When the
   draft room hands a game seat to a page served through the tunnel, use
   `wss://<page host>/ws` (or `bases.public`), never `ws(s)://<host>:<tablePort>`.
4. **The owner's doors: refuse anything that came through Cloudflare.** The coach
   helper (8643) and the bridge's `LanGate` (8642) should refuse a request that
   carries `Cf-Connecting-IP`, `Cf-Ray` or `Cf-Access-Jwt-Assertion`. Only
   Cloudflare adds those headers, so a tunnel mis-pointed at either port, even
   with a `Host` rewrite, is turned away. The bridge has no `Host` check today
   (endpoints.md, change 1), so this is the cheapest guard for it.
5. **`docs/security/endpoints.md`:**
   - record that change 4 (verify Access's JWT) is met by cloudflared's
     `originRequest.access` (D405), with no code in each listener;
   - add the table port's row;
   - point *What a tunnel may expose* at this runbook and `scripts/tunnel/policy.mjs`;
   - state that `/observe` is never tunnelled (edge 404).
6. **Draft room: a way to revoke one room.** Rooms and their tokens survive a
   restart (D400), and the only revoke today is editing `var/draft-room/rooms.json`
   with `play.sh` stopped. Add an owner-door `DELETE /room/<id>` (closing its
   streams), or "new link for the friend" (rotate `friendToken`), plus a
   ForgeCoach button.
7. **ForgeCoach on a tunnel page:**
   - `helperTarget` points at `http://<tunnel host>:8643`, which is mixed content
     and never reachable. On an https page that isn't loopback, don't probe the
     page's host. Say "use your own API key", or try the visitor's own
     `127.0.0.1` helper.
   - After repeated network errors on the room stream on such a page, say "reload:
     your Cloudflare sign-in may have expired".
8. **Optional: `play.sh --tunnel`.**
   - It implies `--engine-only --draft-room` and refuses `--lan`.
   - It runs `scripts/tunnel/tunnel-check.sh --local <publicUrl's host>` at start
     and prints the result.
   - It prints the "Over the internet" base.
