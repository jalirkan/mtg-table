# Playing with a friend over Tailscale Funnel

**D409.** Your friend drafts and plays from a plain browser, anywhere. Only your PC
runs Tailscale. Your friend installs nothing and signs in to nothing. They open
one `https://` link.

- **Tailscale Funnel** gives your PC a public name, `https://<machine>.<tailnet>.ts.net`,
  with a real certificate. Funnel carries visitors of that name to one local port.
  `play.sh --funnel` points it at the draft room's listener (8644) and nothing else.
- **There is no login gate.** Cloudflare Access ([`cloudflare.md`](cloudflare.md))
  puts an email login in front. Funnel has nothing like that. Anyone who finds
  the name reaches the room listener, and `*.ts.net` names show up in public
  certificate logs, so scanners will find yours. What keeps them out is the
  **seat token** in each player's link (128 bits, one per seat). Without it every
  room route is 403, and the owner's routes do not exist on that port.
- **Never through Funnel:** the coach helper (8643: it spends your Claude usage,
  restarts the engine and returns your games), the bridge (8642: it trusts
  loopback), `/observe` (your hand), Vite (5173) and the lab's status (8645). The
  helper and the bridge also refuse any request carrying the headers tailscaled
  adds (`Tailscale-Funnel-Request`, `Tailscale-User-Login`, `X-Forwarded-For`,
  `X-Forwarded-Host`), whatever its `Host`. This is the same rule they apply to
  Cloudflare's headers.

## Once

1. **Install Tailscale and log in** (Ubuntu):

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up                       # opens a login link; use any account
   sudo tailscale set --operator=$USER     # so play.sh may run `tailscale funnel` without sudo
   ```

   **No sudo?** Run tailscaled in userspace-networking mode. Funnel works the
   same there, because it reaches 127.0.0.1 either way. Download the static
   binaries from <https://pkgs.tailscale.com/stable/#static>, unpack them into
   `~/.local/opt/tailscale/`, then:

   ```bash
   mkdir -p ~/.local/share/tailscale
   ~/.local/opt/tailscale/tailscaled --tun=userspace-networking \
     --statedir=$HOME/.local/share/tailscale \
     --socket=$HOME/.local/share/tailscale/tailscaled.sock &
   # play.sh runs plain `tailscale`, so give it a wrapper on PATH that names the socket:
   printf '#!/bin/sh\nexec ~/.local/opt/tailscale/tailscale --socket=$HOME/.local/share/tailscale/tailscaled.sock "$@"\n' > ~/.local/bin/tailscale
   chmod +x ~/.local/bin/tailscale
   tailscale up
   ```

2. **Turn on HTTPS certificates.** In the admin console
   (<https://login.tailscale.com/admin/dns>), turn on **MagicDNS**, then
   **HTTPS Certificates → Enable**.

3. **Allow Funnel for this machine.** In the admin console, go to **Access controls**
   (the tailnet policy file). Make sure `nodeAttrs` has a `funnel` entry that
   covers your PC:

   ```json
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```

   Tailnets created since late 2023 have this entry already. To allow only this
   machine, target your own login (`"you@example.com"`) or a tag instead of
   `autogroup:member`. If it is missing, the first `play.sh --funnel` prints a
   `login.tailscale.com/f/funnel…` link that adds it for you.

## Each session

```bash
./scripts/play.sh --funnel                 # add --pause-lab to hold the lab's new jobs meanwhile
```

`play.sh` then does the following:

1. It reads your PC's `*.ts.net` name from `tailscale status --json` and stops at
   once if Tailscale is not up, has no name, or has HTTPS off.
2. It starts the engine and the draft room on 127.0.0.1, as `--engine-only
   --draft-room --room-public-url https://<name>` would. The room gets the
   ForgeCoach site, so the friend has a page.
3. It runs `tailscale funnel <room port>` in **foreground mode**, as its own child
   (log: `var/play/funnel.log`). Funnel then maps `https://<name>/` to
   `http://127.0.0.1:8644`. The room passes `/ws` to a game's table itself.
4. It runs `./scripts/tunnel/tunnel-check.sh --local --funnel <name>`. This checks
   that tailscaled routes the name to the room alone (nothing else on any Funnel
   port, no handler naming a never-port). It also checks every door as Funnel
   reaches it: the room wants a seat token, and the helper and the bridge refuse
   Funnel's headers. If anything FAILs, Funnel goes off again and play.sh stops.
5. It prints what to send.

Then:

1. Make the room: open <https://jalirkan.github.io/ForgeCoach/> (or
   `http://127.0.0.1:8644/`), go to **Draft → Draft with a friend → Create room**.
2. Send your friend the **"Over the internet"** link it shows,
   `https://<name>/#draft/friend/join?room=…&t=…`. Send it privately (a direct
   message, not a group chat).
3. When you are done, press **Close room** on the room's page, then press Ctrl-C
   in play.sh's terminal. Ctrl-C ends the funnel child. Tailscale removes a
   foreground route the moment its command ends, even after a crash or a
   `kill -9`, so nothing stays public after play.sh.

## What your friend does

Your friend opens the link in any browser (phone or computer), types a name and
presses **Join**. That's all. They install nothing, sign in to nothing and need no
Tailscale. When both decks are in, the board opens by itself. A reload reconnects:
the page keeps their seat in that browser.

## Security, in short

- **Tokens only.** Funnel has no login in front of it, so a link is a key. If one
  leaks, use **New link for your friend** (the old link stops working at once) or
  **Close room**.
- **One port.** Funnel carries 8644 and nothing else. play.sh's check fails if any
  Funnel or `tailscale serve` handler names 8642, 8643, 8645, 5173 or 4173. Don't
  add your own `tailscale serve`/`funnel` routes while playing.
- **Rate limits count the real client.** On a Funnel request the room counts wrong
  links and requests by the `X-Forwarded-For` that tailscaled sets (it replaces
  whatever the client sent). It never counts by a `CF-Connecting-IP` header a
  visitor made up. So a scanner's wrong links cannot lock your friend out.
- **Off means off.** Ctrl-C play.sh. `tailscale serve status` then shows nothing.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Tailscale is not up` | `sudo tailscale up` (userspace: start tailscaled first, as above). |
| `HTTPS certificates are off` | Admin console → DNS → HTTPS Certificates → Enable. |
| `Access denied: serve config denied` in the log | `sudo tailscale set --operator=$USER`, once. |
| A `login.tailscale.com/f/funnel…` link in the log, and play.sh waits | Open it and allow Funnel (or add the `nodeAttrs` entry above). play.sh waits up to two minutes. |
| `tunnel-check --funnel` FAILs on `serve …` | Another `tailscale serve`/`funnel` route is set. Look at `tailscale serve status`, and remove what is not yours with `tailscale serve --https=<port> off` (or `tailscale serve reset` if none of it matters). |
| The friend's first load is slow or fails | The first request fetches the certificate, which takes up to a minute. A brand-new Funnel name can also take a few minutes to resolve everywhere. Reload. |
| The friend sees "connection keeps dropping" | play.sh stopped, or your PC went to sleep. The room keeps every pick: restart play.sh and they reload. |
| You want to check from outside | On a phone with Wi-Fi off, open `https://<name>/`. The ForgeCoach page should load. `https://<name>/coach` and `/health` must be 404. |

See also [`cloudflare.md`](cloudflare.md) (the same idea with a login gate and your
own domain), [`draft-room.md`](draft-room.md) (the room itself) and
[`security/endpoints.md`](security/endpoints.md) (every port).
