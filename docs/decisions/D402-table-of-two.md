## D402 — A table of two: `MtgTable --humans 2` seats two people, each a WireGuiGame of its own, on a listener where every seat needs its own token

*Branch `c/two-humans`.* Phase 2 of play-with-a-friend (D400 was the draft). Lifts README's *No multiplayer* in part, for a game between two people on the owner's machine; amends M13 (one client per seat, by token, for a table) and M50 (no `/observe` at a table); adds a row to D386's map and answers four of its five tunnel changes. Protocol amendment **M59**.

**2026-10-06**

**Context.** Two people drafted against each other in the draft room (D400) and
now want to play the two decks against each other through Forge on the owner's
machine, each from their own browser, perhaps one day through a Cloudflare
tunnel. The bridge seated one person and the Forge AI. It refused `--seat 1`
because `HostedMatch` sorts human seats first (`HostedMatch.java:181-187`). The
seat's socket admitted one client, trusted a loopback peer outright under
`--lan`'s `LanGate`, and `docs/security/endpoints.md` listed five changes before
anything a tunnel carries could reach it.

**Decision.**

- **Forge already seats two people; the bridge gives each its own GUI.**
  `HostedMatch.startMatch(rules, variants, players, Map<RegisteredPlayer,
  IGuiGame>, playlist)` (javap, the pinned 2.0.14 jar) makes every
  `LobbyPlayerHuman` a `PlayerControllerHuman` driving the GUI the map names, and
  calls each GUI's `openView` with its own player alone. So a table is two
  `WireGuiGame`s, each exactly the seat it always was: its own transport, its own
  reply pool, its own frame log, and every card through `Snap` against its own
  viewer (hard rule 8). Nothing in `Snap` changed; nothing walks the view graph
  off the game thread that did not before (each GUI's forwarder flushes on
  `Game-0`, and each observes both human input queues, which `openView` already
  did for "every human controller"). The stable sort keeps the order given when
  both seats are human, so `--deck` is seat 0 and player 0, `--deck2` seat 1.
  `TableMatch` wires the two and owns what neither seat knows alone (D403).
- **A listener of its own, with no loopback exemption** (endpoints.md change 1).
  The seats live on the **table port** (`tablePort`, 8646), which exists only
  while a game between two people runs, so a tunnel pointed at it can never land
  on a seat that trusts loopback — the separate listener endpoints.md asks for
  rather than a `Host` rule a forwarder can rewrite. Every `/ws` upgrade needs a
  seat's token, from 127.0.0.1 as from anywhere. The bridge's own `wsPort`
  answers `/health` on loopback and nothing else, so `play.sh`'s readiness poll
  and its second-launch check keep working. The table port serves `/ws` and
  nothing else — `/health`, `/observe` and every other path are 404 — so a
  tunnel's `/ws` rule (D405) reaches exactly one thing. With `--lan` the table
  port binds every interface; without it, loopback.
- **A token per seat per game** (change 2). The draft room mints them (D404) and
  hands each player their own; the bridge is given only the two SHA-256 digests
  in `--seats-file` and never sees a token. A presented token is hashed and
  compared with both digests every time (`MessageDigest.isEqual`), travels as
  `?seat=` (a browser websocket sets no header), is stripped before the handshake
  and is never logged. Ten wrong tokens a minute from one address, then 429 for
  the rest of the minute; behind a tunnel the address is a loopback peer's
  `CF-Connecting-IP`, which nothing off the machine can forge.
- **`https://` origins** (change 3): `Origin` absent, on `wsAllowedOrigins`, a
  `--table-origin`, or `http(s)://` on the request's own host name at any port —
  the draft room's page on 8644 opening 8646, or a tunnel's name. The token is
  the lock; `Origin` only keeps a drive-by page from spending one.
- **Access in front** (change 4) is the tunnel's lane, Phase 4: checking
  `Cf-Access-Jwt-Assertion` needs Cloudflare's keys, and nothing here is
  tunnelled yet. **Hidden information is unchanged** (change 5): a friend's seat
  sees what a seat sees; no new redaction mode exists.
- **One client per seat, by token.** M13's 4001 refusal would lock a player out
  behind their own half-open socket (a phone off the Wi-Fi), so at a table a
  second connection that shows the same seat's token replaces the first, which is
  told so and closed **4002**. A client treats any close ≥ 4000 as terminal, so
  the old tab stops rather than taking the seat back.
- **The two-person handshake.** `hello_ok.match` is `{yourDeck, opponentDeck,
  opponent: "human", games: 1}`: the opponent's deck by name and count only, no
  AI profile or policy, every player `isAi: false`. The session header gains
  `humans: 2`. One game: best of three is Phase 3, so `newGame` is refused.
- **Logs per seat, outside the datasets.** `var/games/<gameId>-seat<N>/
  frames.jsonl`. `play.sh` names the game `friend-m<13 digits>`, which neither
  D369's human test set nor D385's automatic review matches, so neither reads a
  friend's game until Phase 3 adds both seats with each player's opt-out.
- **The bridge's own port refuses a tunnel's headers** (D405's request): any
  request carrying `CF-Connecting-IP`, `CF-Ray` or `Cf-Access-Jwt-Assertion`
  is 403 before anything else, in every mode (`TunnelGate`), because that port
  trusts loopback and a tunnel daemon connects from loopback.
- **Also fixed here:** gate step 9e had expected M56's `aiPolicy` to be absent
  and failed every full gate since `7995435`; it now expects `"plain"`.

**Rejected.**

- *Two `WsTransport`s on two ports, one per seat.* Less code, but two ports to
  open, to tunnel and to explain, and each would carry M51's loopback exemption
  unless both were rebuilt anyway.
- *The seats on `wsPort` behind a seat token.* The next one-person game on that
  port trusts loopback again (D303 restarts the bridge between matches), so a
  tunnel left pointing at it would hand that seat to the internet.
- *Tokens on the bridge's command line or in `var/match/`.* Digests are enough to
  check a token and useless to present one.
- *Refusing a second connection (M13) at a table.* See above: the token is the
  person, and a refusal strands them.
- *One GUI for both seats, as Forge's desktop hot-seat does.* Its redaction would
  have to choose a viewer per frame; two GUIs make "whose eyes" structural.

**Measured.** Two automated seats (`--humans 2 --transport auto`, seed 7,
Pacho SHIELD against Doom Legion): 43 turns to `over`, 648 and 647 states, no
UNIMPL, no emit errors, `REVEAL count = 0`; both logs pass check-redaction
(1,511 opponent-hand cards redacted in seat 1's) and `tools/check-seat-pair.mjs`
(45,489 frame-and-secret-name pairs scanned in seat 0's log, 23,231 in seat
1's). `mtgtable.TableSelfTest`, 83 checks on every build (the origin rule for a tunnel's one hostname among them). Gate step 10i.
