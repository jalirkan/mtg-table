# Security

mtg-table is **localhost-only by design** (the README's [NON-GOALS](README.md#non-goals)). The bridge, the coach
helper, the lab runner's status page and the Vite dev server bind `127.0.0.1`, and a browser page may open the
game's socket only from an origin on `config.json`'s `wsAllowedOrigins` (D281). There are no accounts: on loopback,
whoever connects is the owner.

## What can be exposed, and under which lock

[`docs/security/endpoints.md`](docs/security/endpoints.md) is the inventory (D386): every port the repository
listens on, its bind, its auth, its Origin rule, what it reads and writes, and whether it spends the owner's
Claude usage. In short:

- **`./scripts/play.sh --lan`** (D287–D289, D292) binds the bridge, and the coach helper beside it, on every
  interface for a phone on the home network. A request from another machine needs the run's **pairing token**, a
  bearer secret in the phone's URL and written to `var/play/server.log`; anyone with that URL has the seat and the
  coach until the next run.
- **The draft room and the table of two** (D400–D407) put every route behind a per-seat token, a loopback peer
  included; they may be reached through a Cloudflare tunnel (`docs/cloudflare.md`) or Tailscale Funnel
  (`docs/tailscale-funnel.md`), and nothing else may.
- **Never tunnelled:** the bridge's own port and the coach helper refuse any request carrying a tunnel's headers,
  and the Vite dev server serves private files (the personal tier, spectate recordings) and must never be bound
  wider. The endpoints file's *Headline risks* are the known weak points, each with what holds today.

## Reporting a problem

Open a GitHub issue on this repository. If the finding exposes a running game, the LAN pairing token or a seat
token, or would let a page or another machine take the seat, **say so in the title**, and leave the working
exploit out of the issue until the owner has answered. This is a hobby project: there is no bounty and no
response-time promise, but a security report is read before anything else.

Hidden information is a security property here too: a frame that shows a card its seat should not see (the
opponent's hand, a face-down card, the library) is a bug of the same rank. `tools/check-redaction.mjs` checks every
recording, and `docs/research/06-hidden-information-audit.md` is every reveal path in Forge.
