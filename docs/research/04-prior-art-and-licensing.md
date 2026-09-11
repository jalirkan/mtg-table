# 04 — Prior art and licensing

Research date: 2026-09-11. Everything below is either **verified** (I read the file / fetched the
live page and quote it) or explicitly marked **guess / inference**.

Forge source citations are paths relative to the sparse checkout at
`…/scratchpad/forge-src` (full prefix:
`/tmp/claude-1000/-home-justin-a--config-Claude-scratch-workspaces-889ad522-c1ff-402b-8b23-6ae666c9b9a2-dcfb1aed-ebb2-456c-9dd7-5ecedf00d397-scratch-2026-09-11-0947cb/8723af12-0157-421e-988a-473182e5a3f1/scratchpad/forge-src`).

---

## 0. TL;DR — what changes the plan

1. **The exact thing we want to build already exists in open source, and it is AGPL.**
   `witchesofthehill/manabrew` contains `forge-harness/`, a Maven module that links Forge as a
   library and exposes an interactive, headless, JSON-protocol engine surface driven by a
   React/TypeScript client. It is the single most valuable artefact found. Reusing its code makes
   mtg-table AGPL-3.0-or-later; reading it as a design reference costs nothing.
2. **Forge already ships most of the "bridge" abstractions** we would otherwise invent:
   `IGuiGame` (the view sink), `IGameController` (the input sink), `ProtocolMethod` (a complete
   enumerated RPC surface between them), `FServerManager` (Netty host) and a headless `IGuiBase`
   pattern used by Forge's own network tests. We do not have to design a protocol from scratch —
   we have to *transcode* an existing one to JSON/WebSocket.
3. **Stops, auto-pay, undo, "pass to phase" are all engine features, not UI features.** Phase stops
   are `FPref.PHASE_HUMAN_*`; "pass to my next turn" is Forge's *yield marker* system
   (per-(player, phase)); "Auto Pay" is the `Auto` button on `InputPayMana` that runs the AI mana
   solver; Undo is `PlayerControllerHuman.tryUndoLastAction()`. Endstep's Decision panel is a
   re-skin of Forge behaviour, not new logic. Build the UI as a thin renderer of these.
4. **Neither forgeweb.app nor endstep.cc is open source.** Forge Web publishes its architecture
   in `llms-full.txt` (React + TypeScript + Vite front-end, **Kotlin** product server running the
   engine, HTTP APIs + WebSocket game connection, "the engine does not run entirely in the
   browser") and states its app repo is *not* public. Endstep publishes prose-level architecture
   only and has no public repo. Both are valid as UX references, neither as code.
5. **Licensing is simple and not scary for a hobby project:** Forge is GPL-3.0-or-later. A Java
   bridge that links Forge is a derivative work → GPL. A separate TypeScript front-end that only
   talks JSON over a socket is, under the FSF's own arm's-length-process reading, a separate work →
   we may license it how we like. Publishing on GitHub is fine as long as the GPL'd Java part ships
   with source + licence. Card names/text/images are Wizards IP handled under the Fan Content
   Policy; Forge ships **no** card images (it downloads them), and Scryfall's terms allow our use
   with concrete rules (rate limits, no paywalling, no image mutilation).

---

## 1. forgeweb.app — "Forge Web"

**Verdict: closed-source competitor/sibling; useful only as proof the architecture works. Do not
plan to build on it.**

Fetched 2026-09-11.

| Fact | Evidence |
|---|---|
| What it is | "Play Magic: The Gathering against AI in your browser for free. Import a Standard or Commander deck, or watch live AI games. No download required." — `<meta name="description">`, https://forgeweb.app/ |
| Architecture (first-party disclosure) | https://forgeweb.app/llms-full.txt, section **Technology**: "The interface uses React, TypeScript and Vite. A **Kotlin product server** runs the rules engine and handles accounts, saved decks and game sessions. The browser uses **HTTP APIs and a WebSocket game connection**. **The engine does not run entirely in the browser.** Card artwork is served through Scryfall." |
| Not WASM / not CheerpJ | Verified twice: (a) the sentence above; (b) I downloaded the entry bundle `https://forgeweb.app/assets/index-0g7cjKY_.js` (95 KB) and grepped it — no `cheerpj`, no `.wasm` asset, no socket.io; only three chunks referenced (`react-*.js`, `mount-*.js`, `validation-*.js`). The five `WebAssembly` string hits are library feature-detection, not a Java runtime. |
| Source public? | **No.** https://forgeweb.app/llms.txt lists under "Engine" only: "[Card-Forge](https://github.com/Card-Forge/forge): The upstream rules engine, **not the Forge Web application repository**." `llms-full.txt` repeats: "The upstream engine link is not the Forge Web application repository." No GitHub link, no licence page, no author name anywhere on the public pages; contact is a form on `/about`. |
| Hosting/stack fingerprints | Vite-built React SPA with pre-rendered `<!-- seo:content -->` blocks per route; self-hosted Umami-style analytics at `a.forgeweb.app`; `preconnect` to `cards.scryfall.io` (card art straight from Scryfall's CDN, unlike Endstep which proxies). |
| Scope / limits (their own words) | "Draft, sealed and the general puzzle browser are parked… Play is against AI. Human multiplayer is not currently offered… Desktop is the best experience." |
| Account model | Watching AI games needs no account; deck import/save/play needs an email-code sign-in. |

**Can we build on it?** No — there is no published code, no licence grant, and no documented API.
What it *does* give us is confirmation that the winning shape is exactly the one we planned:
**JVM-hosted Forge + WebSocket + React/TS SPA**, with card art from Scryfall. Note it is a *second*
independent team that landed on "Kotlin/Java server + WS + React" rather than compiling Forge to
WASM. That is a meaningful signal.

---

## 2. endstep.cc

**Verdict: closed source, confirmed. Best available UX reference; their changelog is effectively a
free backlog for us.**

Fetched 2026-09-11: `/about`, `/`, `/changelog`, `/robots.txt`, `/llms.txt`.

### What they disclose about architecture

From https://endstep.cc/about (verbatim):

> "Every card in Endstep resolves through **Forge**, the long-running open-source Magic rules
> engine, **running headless on our server**. The browser is a window onto that engine: it shows you
> what the engine says and sends back what you clicked. It does not know the rules, and it is not
> allowed to guess at them."

> "If a card behaves in a way you think is wrong… the fix usually lives **in the engine or in the
> bridge between the engine and your browser**, not in a re-interpretation of the rule. We do not
> implement card behaviour by hand."

From https://endstep.cc/llms.txt:

> "Games resolve through Forge… running headless on the server. The browser displays what the engine
> reports and sends back the player's choices; **it holds no rules logic of its own.** The card pool
> is roughly 94,000 cards: the engine's full pool, not a curated subset."

Additional architecture facts, each **verified** from the live pages:

- **Front-end is a client-rendered SPA**, single JS bundle `/assets/main-<hash>.js` plus
  `/assets/main-<hash>.css`, service worker `/registerSW.js` (vite-plugin-pwa signature), web app
  manifest → installable PWA. HTML comment in `/`: "Endstep is a client-rendered SPA, so the
  link-preview bots … see only this static `<head>`."
- **TypeScript, with a `web/` package.** Their own HTML comments and `robots.txt` reference test
  files by path: `web/src/tests/seo-meta.test.ts` and `web/src/tests/public-pages.test.ts`. Static
  marketing pages build to `dist/pages/*.html`.
- **nginx in front.** `robots.txt`: "`/pages/` is the on-disk location those files are built to
  (`dist/pages/*.html`). **nginx** serves them at their clean URLs."
- **Card images are proxied through their own origin**, not hot-linked: HTML comment in `/`: "Card
  art lives on the Scryfall CDN, but every `<img>` asks our own origin first (**`/api/cards/image`
  302s to it**)". So there is an HTTP API under `/api/` (disallowed in robots.txt) beside the game
  socket.
- **Auth-gated app routes**: `/game/`, `/lobby/`, `/draft/`, `/deck/`, `/build/`, `/spectate/`,
  `/join/`, `/u/`, `/history/`, `/settings`, `/admin` — a useful route map to copy.
- **Server keeps a replay of the current game** for reconnects: changelog 8 Aug 2026 — "The server
  now keeps a short replay of the current game and hands it back when you return — including on a
  fresh device. You only get back what was sent to you originally, so a card revealed privately to
  your opponent stays private." (Confirms: per-seat filtered event log, server-side.)
- **Disconnect handling**: seat shows "lost connection" + countdown, then concedes; own-connection
  stutter shows a reconnect banner while the seat is held (changelog 10 Jul 2026).
- **They pin a Forge release and bump it**: "The card pool is updated to **the engine's newest
  release**, bringing in more recent cards."
- **Engine cost is a real operational concern**: "~55% less engine time per game and ~21% less
  memory"; "the engine runs on about half the memory it reserved before." Relevant to us: one JVM
  per game is expensive; they optimised it twice.
- **Their bridge leaks in the changelog** in ways worth reading before we design ours, e.g. "it is
  never fetched. The engine offered it every time; the board had nowhere to put it, so the offer
  never reached you" (playing from exile/graveyard), and "their fetchlands and activated abilities
  could not be used. The engine was offering them the whole time; **the board was throwing the
  answer away**." That is exactly the failure mode of a hand-written protocol adapter: the engine's
  offered action set is richer than the UI's model of it.

### Closed source — confirmation

- No repository link on any public page. The `/about` credits link out only to
  `github.com/Card-Forge/forge`, `scryfall.com`, `patreon.com/endstep`, and the WotC Fan Content
  Policy.
- GitHub org `endstep` does not exist (404). A **user** account `github.com/EndStep` exists (id
  281447168, created 2026-05-03) with **0 public repositories** — consistent with, but not proof of,
  the same project. *(Inference, not verified.)*
- GitHub repo search for `endstep magic` / `endstep.cc` returns nothing.
- They are not obliged to publish: Forge is GPLv3, not AGPL, and GPLv3 imposes no source-offer duty
  for software merely *run* on a server (see §5).

### What to steal (behaviour, not code)

Their FAQ line is our feature list: *"Tap your own lands or let it auto-pay. Set phase stops where
you want them. Undo a misclick before priority passes. Watch a friend's game as a spectator without
seeing anyone's hand."* All four are Forge engine features (§6).

---

## 3. Also-found: mtgbattles.com (new, not in the brief)

**Verdict: third independent Forge-on-a-server web product; closed source; interesting for
*throughput* engineering, not for our UI.**

- Fetched https://mtgbattles.com/ and `/about`. Self-described: "Forge—a free, community-built Magic
  game engine—plays your deck against other entrants over and over."
- Live counters at fetch time: "Last hour **2,221** games finished / Last 24 hours **54,384** games
  finished", "2 playing now · 6 ready next · **8 leased** · **2-worker capacity**". So: a **worker
  pool of leased headless Forge instances**, plus a web "Live Matches" spectator view. This is the
  strongest public evidence that headless Forge scales as a pooled worker, which is the deployment
  shape we would want if we ever run more than one game.
- Credits Forge, MTGJSON, Scryfall, CubeCobra; carries the Fan Content Policy notice.
- Author appears to be John Shedletsky (`shedletsky.com` newsletter link from `/about`), who also
  publishes `Shedletsky/forge-ai-lab` (GPL-3.0, Java, pushed 2026-09-09): "Experimental Forge fork
  for stronger AI and faster AI-vs-AI matches. Independent research sandbox; **not used by
  mtgbattles.com**." So the site's own runtime is closed; only the AI research fork is public.

---

## 4. Open-source Forge front-ends, bridges, and adjacent projects

Searched: GitHub repo search (`gh search repos`) across ~12 query shapes, GitHub code search
(`gh search code`), Forge's wiki, and web search. Ranked by usefulness to us.

### 4.1 ⭐ `witchesofthehill/manabrew` — the closest prior art that exists

- **URL:** https://github.com/witchesofthehill/manabrew · app at https://play.manabrew.app · docs at
  https://docs.manabrew.app · Discord https://discord.gg/NqrKpbhtcd
- **Licence:** **AGPL-3.0-or-later** for their own code (README: "this project's own code is
  AGPL-3.0-or-later (a GPL-compatible license that also covers network use). The vendored `forge/`
  tree stays GPL-3.0-or-later."). GitHub's licence detector says `other`/NOASSERTION because the file
  is `LICENSE.md`. Repo topics include `rules-engine`, `tauri`, `wasm`.
- **Activity:** created 2026-05-18, **pushed 2026-09-11** (today), 43 stars. Very much alive.
- **What it does:** React + Tauri client and a Rust re-implementation of Forge's engine, with Forge
  vendored as a **git submodule** and a **parity harness** that runs Rust and Java Forge with the
  same decks/seed/choices and diffs traces. Crucially it *also* ships a production path where the
  same client drives **Java Forge** directly: "Java Forge interop for Forge-backed games through the
  same client stack… The client and **Java Forge backend path are the most practical way to play
  today**."
- **The part we care about — `forge-harness/`** (a Maven module whose parent POM is
  `../forge/pom.xml`, depending on `forge-core`, `forge-game`, `forge-ai`, `forge-gui` + Gson,
  assembled as `jar-with-dependencies` with `mainClass forge.harness.Main`):

  | File (in manabrew) | What it is |
  |---|---|
  | `forge-harness/src/main/java/forge/harness/Main.java` | CLI dispatcher: one-shot, `--server`, `--interactive-server` |
  | `…/common/HeadlessGuiBase.java` | Minimal `IGuiBase` for running Forge with no display (only `getAssetsDir()` is real; everything else no-op) |
  | `…/common/ActionSpace.java`, `ChoiceSpace.java`, `CombatChoiceSpace.java`, `EngineHandler.java` | Turn a Forge prompt into an **enumerated legal action set** for the wire, and post-validate the submitted answer (e.g. `CombatUtil.validateBlocks`) |
  | `…/common/AutoPay.java` | Auto-pay / float-mana helper |
  | `…/common/SnapshotExtractor.java` | Game-state → serialisable snapshot |
  | `…/host/ManaBrewInteractiveController.java` | The controller the human seat runs (mirrors `PlayerControllerHuman`) |
  | `…/host/ManaBrewInteractiveSession.java`, `InteractiveBridge.java`, `ManabrewProtocolAdapter.java` | Session loop, protocol encode/decode, action-id parsing |
  | `…/host/PriorityFastForward.java` | "pass until (player, phase)" / "resolve stack" fast-forward |
  | `forge-harness/native/` | GraalVM `native-image` build so the node can link Forge **in-process via FFI** instead of spawning a JVM; plus a `wasm-src/` experiment with a `SabTransport` (SharedArrayBuffer) |
  | `…/src/main/java/forge/harness/AGENTS.md` | ~6 pages of hard-won notes on exactly the traps of this job |

- **`AGENTS.md` is worth reading in full before we write a line of bridge code.** Three findings from
  it that will save us days (all their words, condensed):
  1. *Forge does no mana-payability prediction for humans.* `Card.getAllPossibleAbilities` filters on
     `sa.canPlay(true)`, `CostPartMana.canPay()` is permissive, "and the GUI simply offers
     unaffordable actions and lets the mana input be cancelled." A web protocol that wants a *legal
     action list* must therefore predict payability itself, and the only predictor available
     (`ComputerUtilMana`, in forge-ai) is deliberately conservative — "which is where every
     divergence comes from."
  2. *Feasibility probes must be silenced.* Their controller sets a `probingPayability` flag while
     `ComputerUtilMana.canPayManaCost` / `ComputerUtilCost.canPayCost` run, because those paths call
     ordinary `PlayerController` choosers (convoke/improvise, delve, sacrifice-to-offering) that in
     native Forge only the AI ever hits — without the flag, every payability check round-trips to the
     UI.
  3. *The protocol drives; the client only echoes ids.* "The `pay_mana_cost` prompt presents every
     payment option as one `PaymentAction` in a single `actions` list… **The protocol drives; the
     client only renders the actions and echoes an `id` back — it holds no payment state and
     synthesizes no ids.**" That is the design rule that prevents Endstep's "the board was throwing
     the answer away" class of bug.
- **Reuse verdict:** *Do not copy code unless we accept AGPL-3.0-or-later for mtg-table.* Do read
  `AGENTS.md` and the `forge-harness` file list as the reference architecture; it validates the
  "Java bridge module built against Forge's Maven modules, emitting JSON" plan and names every
  sub-problem. If the user is happy to be AGPL (a reasonable choice for a hobby GPL-adjacent
  project), forking `forge-harness` alone is the single biggest shortcut available.
  Their build also documents the JDK constraint: "**JDK 18–21** and Maven … Newer JDKs (e.g. 26)
  currently fail to compile Forge" — our OpenJDK 21 is in the supported window.

### 4.2 ⭐ Forge's own network stack (in-tree, GPLv3) — a protocol we can transcode

Not a web client, but it is a complete, working, *maintained* remote-play protocol whose shape maps
1:1 onto what a browser needs. Files (all in `forge-gui/src/main/java/forge/gamemodes/net/`):

- `ProtocolMethod.java` — an enum of every call that crosses the wire, with direction and signature.
  Lines 33–60 show the server→client half: `setGameView`, `openView`, `showCombat`,
  `showPromptMessage`, `updateButtons`, `showManaPool`, `getAbilityToPlay`, `assignCombatDamage`,
  `showConfirmDialog`, `showOptionDialog`, … Client→server methods follow further down. **This enum
  is the de-facto specification of "what a Forge front-end must be able to render and answer."**
- `server/FServerManager.java` (Netty `ServerBootstrap`), `server/GameServerHandler.java`,
  `server/RemoteClientGuiGame.java` (server-side `IGuiGame` that forwards to a remote client),
  `server/DeltaSyncManager.java` (delta packets), `client/FGameClient.java`,
  `client/NetGameController.java`, `NetworkChecksumUtil.java` (desync detection),
  `CompatibleObjectEncoder/Decoder.java`, `TrackableSerializer.java`, `WireClassFilter.java`.
- Transport: **Netty 4.1.115.Final** (`forge-gui/pom.xml:50-52`) carrying **Java object
  serialization** of `CardView`/`GameView` trackable objects. Port **36743** by default
  (https://github.com/Card-Forge/forge/wiki/network-play).
- **Reuse verdict:** we cannot speak this from TypeScript (Java serialization + `TrackableCollection`
  deltas), but we should not invent a message list either — derive our JSON schema from
  `ProtocolMethod` and `IGuiGame`, and keep the same "view object + prompt + answer" cadence. Also
  read `NetworkChecksumUtil` / `DeltaSyncManager` before deciding whether to send snapshots or deltas.

### 4.3 ⭐ Forge's own headless harness (in-tree test sources, GPLv3)

`forge-gui-desktop/src/test/java/forge/net/` — ~3,900 lines that already run Forge with no display:

| File | Lines | Role |
|---|---|---|
| `HeadlessGuiDesktop.java` | 130 | `extends GuiDesktop`; doc comment: "Headless GuiDesktop for automated testing — the `GuiBase` interface that enables running without a display. Overrides UI methods (dialogs, audio, FSkin) with no-ops or defaults." |
| `HeadlessNetworkGuiGame.java` | 209 | "Headless server-side GUI for hosted games. Extends `NetworkGuiGame` to get delta packet processing… while providing no-op/default implementations for all abstract UI methods." |
| `HeadlessNetworkClient.java` | 522 | Auto-responding client incl. delta logging |
| `UnifiedNetworkHarness.java` | 912 | Full host+client orchestration |
| `MultiProcessGameExecutor.java` | 625 | Multi-JVM game runner |
| `NetworkPlayIntegrationTest.java` | 440 | End-to-end network game test |
| `TestDeckLoader.java` | 271 | Deck loading without the GUI |

**Reuse verdict:** this is our "does it even boot headless" answer, in-tree and GPL-compatible with
whatever we do in Java. Copying from here into our Java module is clean (same licence, same project).
`HeadlessGuiDesktop` + `TestUtils.ensureFModelInitialized()` is the bootstrap recipe.

### 4.4 Forge Docker images (community, streams the Swing GUI)

- https://github.com/Card-Forge/forge/wiki/docker-setup (mirrored in-tree at `docs/Docker-Setup.md`).
  `docker pull xanxerdocker/forge-desktop-snapshot`, `docker run --rm -it -p 3002:3000 …`, then
  `bash setup_forge_desktop.sh` / `bash forge_game_selector.sh`; browse to `localhost:3002`.
- The wiki does not name the display tech; the pattern (container port 3000 → browser) is almost
  certainly a **noVNC/web-VNC/Kasm-style desktop stream of the Swing client**. *(Inference — the page
  says "web browser access" without naming VNC.)*
- **Reuse verdict:** this is "Forge pixels in a browser", not a web client. It is a legitimate
  *fallback* if our own UI stalls (zero protocol work), and a useful sanity harness, but it gives up
  everything the user wants (own layout, own shortcuts, mobile, low bandwidth).

### 4.5 `Cockatrice/Webatrice` — the best open-source *web board client* to learn from

- **URL:** https://github.com/Cockatrice/Webatrice · **Licence:** GPL-2.0 · 5 stars · created
  2026-05-08, **pushed 2026-08-25**.
- "The Cockatrice web client — a React/TypeScript SPA that connects to a Servatrice server over a
  WebSocket." Stack: **React 19 + TypeScript, Vite 8, Redux Toolkit + RxJS, MUI v9, Vitest**,
  Turborepo monorepo; protobuf bindings from the `sockatrice` npm package; Playwright e2e against a
  vendored Servatrice in Docker. Ships mermaid architecture diagrams (`architecture/*.mmd`) of the
  WebSocket layering and the command/response/event sequence.
- **Reuse verdict:** best available reference for *how to structure a TS SPA over a game WebSocket*
  (command/response/event split, RxJS for the event stream, Redux for board state). It is a virtual
  tabletop with **no rules enforcement**, so none of its game logic applies — but the transport and
  store layering do. GPL-2.0 means we cannot lift code into a GPL-3 project without care (GPL-2.0
  only, if the headers say "version 2" without "or later", is incompatible with GPL-3); read, don't
  copy. *(The "v2 only vs v2+" question is unverified — I did not read their file headers.)*

### 4.6 `phase-rs/phase` — a from-scratch Rust/WASM MTG engine

- **URL:** https://github.com/phase-rs/phase · preview at http://preview.phase-rs.dev/ ·
  **Licence: MIT OR Apache-2.0** · 273 stars · created 2026-03-10, pushed 2026-09-11.
- "A Rust-native MTG engine compiling to native and WASM, powering a Tauri desktop app, browser PWA,
  and WebSocket multiplayer." Claims turns/priority/stack/combat/SBAs/layers/triggers/replacement
  effects, an AI with game-tree search, 34,300+ cards parsed from MTGJSON. **No Forge involvement.**
  Front-end is React + TypeScript + Tailwind with a *transport-agnostic adapter* (WASM, Tauri IPC,
  WebSocket, WebRTC) — a pattern worth copying for our client.
- **Reuse verdict:** not a Forge front-end, so not reusable for our engine goal, and re-implementing
  rules is exactly what the user is avoiding. Useful as (a) evidence that the "adapter per
  transport" client shape works, (b) a permissively-licensed source of UI ideas.

### 4.7 Everything else found, briefly

| Project | URL | Licence | Last activity | What | Verdict |
|---|---|---|---|---|---|
| `Card-Forge/forge` | https://github.com/Card-Forge/forge | GPL-3.0 | 2026-09-11 | The engine, 2,683★ | The dependency. |
| `magefree/mage` (XMage) | https://github.com/magefree/mage | MIT | 2026-09-11 | Java client/server MTG engine, 2,354★ | Alternative engine (MIT is friendlier), but it is a *different* engine with its own card coverage; switching contradicts the user's Forge/Endstep parity goal. **No browser client exists** — searched; XMage remains a Java desktop client (xmage.today). Its **client/server split** is a good protocol reference. |
| `Cockatrice/Cockatrice` | https://github.com/Cockatrice/Cockatrice | GPL-2.0 | 2026-09-09 | C++/Qt virtual tabletop, 1,836★ | UI ideas only (zone menus, arrows, counters); no rules engine. |
| `Shedletsky/forge-ai-lab` | https://github.com/Shedletsky/forge-ai-lab | GPL-3.0 | 2026-09-09 | Forge fork for stronger AI / faster AI-vs-AI | Watch it if AI speed becomes a problem; not a front-end. |
| `AceVik/ace-forge` | https://github.com/AceVik/ace-forge | GPL-3.0 | 2026-08-31 | "fork of Card-Forge/forge with some unfair extras" | Ignore. |
| `laryziinha/forge-scryfall-scrapper` | https://github.com/laryziinha/forge-scryfall-scrapper | **MIT** | 2025-12-27 | Python: Scryfall → Forge-named image files (sets/singles/tokens), layout-aware, audit workflow | **Directly useful**: solves "populate `~/.cache/forge/pics/cards` with correctly-named art", MIT, Python (user's second language). Small (9★) so treat as a starting point, not a dependency. |
| `Reilley64/mtgfr` | https://github.com/Reilley64/mtgfr | Apache-2.0 | 2026-08-14 | TypeScript, 1★, has `scripts/sync-forge.sh` (found via code search for `cardsfolder forge`) | Unknown scope, tiny; a possible example of parsing Forge's cardsfolder from TS. Low priority. |
| `kevgbailey/forge-commander-gauntlet` | https://github.com/kevgbailey/forge-commander-gauntlet | none stated | 2026-08-09 | Python scripts that drive the Forge fat jar (found via `forge-gui-desktop jar-with-dependencies`) | No licence = no rights granted. Read-only curiosity for CLI invocation patterns. |
| `boardgameio/boardgame.io` | https://github.com/boardgameio/boardgame.io | MIT | 2026-08-18 | Turn-based game framework, 12.4k★ | **Not applicable** — it wants to own game state and turn order; our authority is Forge. Skip. |
| `scryfall/api-types` | https://github.com/scryfall/api-types | MIT | 2024-09-09 | TS types for the Scryfall API | Small, safe dependency for the card library. |

**Notable absence (verified by repeated search):** there is **no** existing open-source
"Forge headless ⇄ WebSocket ⇄ browser" project other than manabrew's `forge-harness`. GitHub code
search for `PlayerControllerHuman websocket` and `GuiBase setInterface headless` returns nothing.
Forge's wiki has a Network Play page and a Docker page but **no** headless-server/API page.

---

## 5. Licensing

### 5.1 Forge itself — verified

- `LICENSE` (673 lines, md5 `e49f4652534af377a713df3d9dec60cb`) is the verbatim **GNU General Public
  License, Version 3, 29 June 2007**.
- `README.md:…` — "**📄 License:** [GPL-3.0](LICENSE)".
- `pom.xml:36-41` — `<licenses><license><name>GPL 3</name><url>…gpl-3.0-standalone.html</url>`.
- Source headers are **GPL-3.0-*or-later***: e.g. `forge-game/src/main/java/forge/game/Game.java:8`
  and `forge-gui-desktop/src/main/java/forge/screens/match/TargetingOverlay.java:5-8` — "either
  version 3 of the License, **or (at your option) any later version**."
- `README.md` — "Forge operates independently and is **not affiliated with Wizards of the Coast**."
  `docs/Home.md:7` — "Forge is not related in any way with Wizards of the Coast."
- `CONTRIBUTING.md` (General Notes) — "**Art files need to be copyright-free and they should be in
  the public domain.** Credits and attribution should be included in Credit and Thanks." This is
  about Forge's own UI art, not card scans.
- `docs/Card-Images.md` — "**You DO NOT need images to play forge** … Due to charges in Forges
  hosting and **scryfall terms** you can **no longer predownload card images**. Turn on auto download
  in forge to download card images when first viewed." Images live in the user's cache
  (`/home/<user>/.cache/forge/` on Linux), named `Card Name#.border.ext`, optionally under an
  edition-code subfolder. **Forge ships no card images.**
- Forge already talks to Scryfall itself: `forge-gui/src/main/java/forge/gui/download/ScryfallBulkDataSync.java:26-29`
  (`https://api.scryfall.com/bulk-data`) and `…/CdnUuidCache.java`, with a comment at
  `ScryfallBulkDataSync.java:153` noting that `*.scryfall.io` file origins are "unthrottled, no
  acquire() needed" — i.e. Forge implements Scryfall's rate-limit etiquette.
- `CONTRIBUTING.md` also has a policy we should honour if we ever upstream: "**If you use an AI agent
  … to substantially code a contribution to Forge please identify this when you make a pull
  request**, either by including the coding agent as a co-author or by noting in the body."

*(Not legal advice — this is a reading of the licence text and the project's own documents.)*

### 5.2 (a) A Java bridge that links Forge

- Our bridge would `import forge.game.*`, subclass `PlayerControllerHuman` / implement `IGuiGame`
  and `IGuiBase`, and be compiled against `forge-core/game/ai/gui`. That is **linking and deriving**:
  under GPLv3 the combined work is covered, so **our Java module must be GPL-3.0-or-later** (or a
  GPL-3-compatible licence whose combination is GPL-3, e.g. AGPL-3.0, as manabrew chose).
- Concrete obligations if we **distribute** that Java module (publishing a jar or a GitHub repo
  counts): ship the complete corresponding source, keep the licence and copyright notices, state
  changes, and pass the same rights on. Nothing more.
- **Running it privately imposes nothing.** GPLv3 has no "network use" clause. Forge Web and Endstep
  can run modified Forge as a service without publishing anything — that is why both are legitimately
  closed. If we chose **AGPL-3.0** for our own code (as manabrew did), *we* would take on the
  network-use obligation. For a local single-user hobby app there is no reason to.
- Practical mechanics: build the bridge as a Maven module that declares `forge-core`, `forge-game`,
  `forge-ai`, `forge-gui` as dependencies (mirroring `manabrew/forge-harness/pom.xml`), or —
  simpler with no Maven installed — compile against the installed fat jar
  `/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar` on the classpath.
  *Either way the resulting program is a GPLv3 derivative; the classpath trick changes nothing legally.*

### 5.3 (b) A separate TypeScript front-end over a socket

- The FSF's own position (GPL FAQ, "MereAggregation" / "GPLPlugins" reasoning): programs that
  communicate **at arm's length** — separate processes exchanging messages over pipes/sockets,
  sharing no address space and no complex internal data structures — are normally **separate works**.
  A browser SPA speaking JSON over a WebSocket to our Java process is the textbook arm's-length case.
- So the TypeScript front-end may be **MIT, Apache-2.0, GPL, or anything else**. It is not forced to
  be GPL by Forge.
- Two caveats that would change the analysis, both easy to avoid:
  1. **Don't ship Forge's own data files in the web bundle** (card scripts from `cardsfolder`,
     `editions/*.txt`, Forge's skin art). Those are part of the GPL work. Serve card text/art from
     Scryfall instead, or have the Java side serve them (in which case they stay on the GPL side).
  2. **Don't vendor GPL'd code into the TS tree** (e.g. porting a Forge algorithm line-by-line).
- Pragmatic recommendation: put the repo under **GPL-3.0-or-later as a whole** and be done with it.
  It is the least-thought option, it matches the ecosystem (Forge, Cockatrice, Webatrice), it keeps
  the door open to upstreaming, and it costs a hobby project nothing. Choose a split licence
  (GPL for `/server-java`, MIT for `/web`) only if the user specifically wants the front-end reusable
  by others.

### 5.4 Publishing on GitHub

- Allowed and normal. Include: `LICENSE` (GPL-3.0), a `NOTICE`/README section crediting Forge with a
  link to https://github.com/Card-Forge/forge and its licence, and the Wizards Fan Content Policy
  disclaimer (all three of Forge Web, Endstep and mtgbattles carry one; copy Endstep's wording
  pattern): *"mtg-table is unofficial Fan Content permitted under the Wizards of the Coast Fan
  Content Policy. Not approved, endorsed, or affiliated with Wizards. Magic: The Gathering and all
  related properties are © Wizards of the Coast LLC."* — https://company.wizards.com/en/legal/fancontentpolicy
- **Do not commit** to the repo: card images, Forge's `cardsfolder`/`res` tree, or bulk Scryfall
  dumps. Fetch them at runtime/setup time. (Forge itself stopped pre-distributing images "due to
  charges in Forges hosting and scryfall terms".)
- The Fan Content Policy's practical constraints for us: non-commercial (no paywall, no ads against
  the content), clear disclaimer, no use of WotC logos/trade dress in *our* branding. Endstep and
  Forge Web both stay deliberately "trademark-light" in titles/metadata — an HTML comment on
  endstep.cc calls naming the mark in indexable metadata "the riskier 'trading on the mark' use."

### 5.5 Scryfall — verified from https://scryfall.com/docs/api and /docs/api/rate-limits

- **Required headers:** every request to `api.scryfall.com` must send an accurate `User-Agent`
  (e.g. `MtgTable/0.1`) and an `Accept` header. "Do not allow HTTP libraries to choose the header for
  you." (In-browser JS keeps the browser UA.)
- **Rate limits (hard):** `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` →
  **2/second (500 ms)**; `/cards/manifest` → 10/minute; **all other methods → 10/second (100 ms)**.
  HTTP 429 ⇒ 30-second lockout; persistent overuse ⇒ ban. **`*.scryfall.io` file origins (card
  images) have no rate limit.**
- **Use bulk data for anything at scale:** "If you need to rapidly look up card names, prices, or
  resolve a large number of card images, you **must** use the bulk data files." Cache locally ≥24 h;
  gameplay data changes rarely ("once per week or right after set releases would most likely be
  sufficient").
- **Data-use rules:** no implying Scryfall endorsement; **no paywalling** Scryfall data (no payments,
  surveys, subscriptions, forced chat-server joins); anonymous or free access must exist if we have
  accounts; don't create new games from the data; don't merely repackage/proxy — "Your software must
  create additional value for end-users."
- **Image rules:** do **not** cover/crop/clip the copyright or artist name; do not distort, skew,
  stretch, blur, sharpen, desaturate or colour-shift; do not add watermarks or logos; when using
  `art_crop`, show the artist name and copyright elsewhere in the same interface. *(This constrains
  our board rendering: a rotated/tapped card is fine, but a card art tile that hides the credit line
  needs the artist shown somewhere in the UI — e.g. the card-detail panel.)*
- Scryfall's own footer: "Portions of Scryfall are unofficial Fan Content permitted under the Wizards
  of the Coast Fan Content Policy."

### 5.6 Third-party assets we might use

| Asset | Licence | Note |
|---|---|---|
| **Mana** font (`andrewgioia/mana`, npm `mana-font` 1.18.0, ~9.7 MB unpacked) | **Font: SIL OFL 1.1; CSS/LESS/Sass: MIT.** "All mana, tap, and card type symbol images are copyright Wizards of the Coast." Attribution "greatly appreciated but not required." | Both licences are fine alongside GPL. The symbols are still WotC IP → Fan Content Policy territory, same as everything else here. |
| **Keyrune** set symbols (`andrewgioia/keyrune`, npm 3.19.0, ~7 MB) | npm metadata declares **`(OFL-1.1 AND GPL-3.0-only)`**; README: "All set symbol images are trademarks of Wizards of the Coast." | GPL-3.0-only component means: safe inside a GPL-3.0 project; **not** safe to pull into an MIT-licensed front-end. If we split licences, keep Keyrune on the GPL side or skip it (Scryfall serves set symbol SVGs too). |
| Scryfall card images | WotC copyright, served under Scryfall's terms (§5.5) | Hot-link from `cards.scryfall.io` (what Forge Web does) or proxy through our own origin (what Endstep does, via `/api/cards/image` → 302). Proxying gives us caching + a stable URL shape; hot-linking is zero work. |

---

## 6. UI: what is an engine feature, and what we actually have to build

### 6.1 Engine features Forge already exposes (verified, with citations)

| Endstep UI element | Forge feature | Where |
|---|---|---|
| **Phase strip doubles as stop toggles** | Per-phase, per-player stop preferences, 12 phases × 2 sides | `forge-gui/src/main/java/forge/localinstance/properties/ForgePreferences.java:240-264` — `PHASE_AI_UPKEEP … PHASE_AI_CLEANUP` and `PHASE_HUMAN_UPKEEP … PHASE_HUMAN_CLEANUP`, each defaulting `"true"`/`"false"` (note defaults: human MAIN1, MAIN2, DECLAREBLOCKERS = true). Grouped into arrays at `:406-416`. Queried by the GUI via `IGuiGame.isUiSetToSkipPhase(PlayerView playerTurn, PhaseType phase)` — `forge-gui/src/main/java/forge/gui/interfaces/IGuiGame.java:294`, used at `forge-gui/src/main/java/forge/gui/control/FControlGamePlayback.java:77`. |
| **"Pass To → end of turn / my next turn / before my turn"** | Forge's **yield markers**, set per (player, phase) | `docs/Advanced-Yield-Options.md` (in-tree): "A **yield marker** tells Forge to auto-pass priority until a specific phase is reached… **Per-(player, phase) precision:** Each phase indicator cell is distinct per player. Right-clicking your own End Step yields to *your* End Step; right-clicking an opponent's End Step yields to *that opponent's* End Step." Implementation: `forge-gui/src/main/java/forge/gamemodes/match/YieldController.java:69-78` (`autoPassUntilEOT`, `autoPassUntilStackEmpty`, `autoPassUntilMarker`, `hasLeftMarker`, `activationOnMarker`). |
| **Hold Priority** | The inverse of auto-pass; Forge's "Auto-Pass" toggle plus interrupt settings | `ForgePreferences.java:138-139` `YIELD_AUTO_PASS_NO_ACTIONS`, `YIELD_AUTO_PASS_RESPECTS_INTERRUPTS`; `:141` `YIELD_SKIP_PHASE_DELAY`; hotkey `SHORTCUT_YIELD_AUTO_PASS ("80")` = **P** at `:342`. Docs: "**Auto-Pass** is a persistent toggle that automatically passes priority whenever you have no playable actions available… The **P** hotkey doubles as a 'stop everything' shortcut." |
| **Pass Priority button** | `IGameController.selectButtonOk()` / `selectButtonCancel()`; `InputPassPriority` | `forge-gui/src/main/java/forge/interfaces/IGameController.java:30-32`; `forge-gui/src/main/java/forge/gamemodes/match/input/` |
| **Auto Pay** | The **Auto** button on the mana-payment input runs Forge's AI mana solver on the human's behalf | `forge-gui/src/main/java/forge/gamemodes/match/input/InputPayMana.java:367-395`: `supportAutoPay()` returns true; `onOk()` → `ComputerUtilMana.payManaCost(manaCost, saPaidFor, player, effect)` run via `runAsAi(...)` inside `game.getAction().invoke(...)`; `updateButtons()` labels the OK button `lblAuto`. Preview toggle: `ForgePreferences.java:101` `UI_SHOW_AUTOTAP_PREVIEW`. |
| **Undo** | Stack-level undo of the last action | `forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:2684-2710`: `canUndoLastAction()` → `getGame().stack.canUndo(player)`; `undoLastAction()` → `tryUndoLastAction()` → `getGame().getStack().undo()`, with a comment at `:2709` "Flush events to remote clients — the undo modifies game state". Exposed on the wire: `IGameController.undoLastAction()` at `IGameController.java:40`. |
| **"Always yes/no" on repeated triggers** | Auto-yield store with GAME/MATCH/SESSION tiers and ASK/ACCEPT/DECLINE trigger decisions | `forge-gui/src/main/java/forge/player/AutoYieldStore.java:10-53` (`enum Tier { GAME, MATCH, SESSION }`, `enum TriggerDecision { ASK, ACCEPT, DECLINE }`); controller surface at `IGameController.java:58-91` (`shouldAutoYield`, `setShouldAutoYield`, `setTriggerDecision`, `applyYieldUpdate`, `getYieldController`, `setYieldPref`); persistence in `forge-gui/src/main/java/forge/player/PersistentAutoDecisionStore.java`; hotkeys `SHORTCUT_AUTOYIELD_ALWAYS_YES ("89")` = **Y**, `..._ALWAYS_NO ("78")` = **N** (`ForgePreferences.java:339-340`). |
| **Targeting arrows on the stack** | Already computed engine-side (`StackItemView` targets, `CombatView`); the desktop client just draws them | `forge-gui-desktop/src/main/java/forge/screens/match/TargetingOverlay.java` (Java2D `GeneralPath` arcs over `GameEntityView` / `StackItemView` / `CombatView`) — the geometry code is ours to redo in SVG, but **the target relationships come from the engine**. |
| **Spectator without seeing hands** | `IGuiGame.setSpectator(IGameController)` | `forge-gui/src/main/java/forge/gui/interfaces/IGuiGame.java:66` |
| **Life / library / hand counts, mana pool, combat, prompt text, button labels** | All pushed by the engine | `IGuiGame.java`: `updateLives` (:140), `updateShards` (:141), `showManaPool`/`hideManaPool` (:102-103), `updateStack` (:105), `showCombat` (:72), `showPromptMessage` (:74-77), `updateButtons` (:82-85), `updatePhase` (:91), `updateTurn` (:93), `updateZones` (:123), `flashIncorrectAction` (:87), `alertUser` (:89) |
| **Combat damage assignment / "divide N among targets" dialogs** | Engine asks, UI answers | `IGuiGame.java:149` `assignCombatDamage(...)`, `:152` `assignGenericAmount(...)` |

**Design consequence:** the Decision panel and the Pass-To menu are *not* client state machines.
They are (1) a boolean pref per phase cell, (2) a yield-marker command, (3) one button press mapped to
`selectButtonOk`, (4) `undoLastAction`. If our TS client ever *computes* whether to stop, we have
already lost parity with Forge. Mirror `ForgePreferences` values to the client for rendering; let the
engine decide.

### 6.2 Web libraries worth using (all checked on npm/GitHub 2026-09-11)

Sizes are **npm unpacked package size** (install footprint, not gzipped bundle) — that is the figure
the registry actually reports; gzipped runtime cost will be far smaller for most of these.

**Drag & drop**

| Package | Licence | Unpacked | Latest publish | Notes |
|---|---|---|---|---|
| `@dnd-kit/core` 6.3.1 | MIT | 1.0 MB | 2024-12-05 | 17.6k★ (`clauderic/dnd-kit`, repo pushed 2026-09-06). Sensor-based, no HTML5 DnD, works with touch + keyboard; the usual pick for a board where cards move between arbitrary zones. |
| `@atlaskit/pragmatic-drag-and-drop` 3.1.0 | Apache-2.0 | 493 KB | 2026-08-29 | 12.8k★, actively maintained by Atlassian; framework-agnostic, built on native HTML5 DnD; smallest core of the serious options. Good if we want drag from hand → battlefield with autoscroll. |
| `interactjs` 1.10.28 | MIT | 1.4 MB | 2026-08-01 | Drag/resize/gesture, framework-free; overkill unless we want free-positioning permanents. |
| `react-dnd` 16.0.1 | MIT | 226 KB | 2022-04-19 | Mature but effectively dormant; only if we already know it. |
| `@hello-pangea/dnd` 18.0.1 | Apache-2.0 | 1.2 MB | 2025-02-09 | List/board reordering (the react-beautiful-dnd fork). Wrong shape for a battlefield; right shape for deck-editor lists. |

**Arrows / SVG overlays (stack targeting, attacker→blocker)**

| Package | Licence | Unpacked | Latest publish | Notes |
|---|---|---|---|---|
| `perfect-arrows` 0.3.7 | MIT | 263 KB | 2021-09-28 | *Just math*: give it two boxes, get back a curve + arrowhead angle; we draw the SVG. Unmaintained but it is ~200 lines of geometry that does not rot. **Best fit** — matches how `TargetingOverlay` works. |
| `react-xarrows` 2.2.0 | MIT | 387 KB | 2026-08-28 | Declarative `<Xarrow start={refA} end={refB}/>`; fastest to a working stack panel, less control over styling under transforms. |
| `react-archer` 5.1.0 | MIT | 374 KB | 2026-06-05 | Similar; anchor-based. |
| `leader-line` 1.0.8 | MIT | 144 KB | 2025-04-11 | Imperative, non-React, injects its own SVG; awkward inside React. |

Honest recommendation: hand-rolled `<svg>` in a single absolutely-positioned overlay layer +
`perfect-arrows` for the curve maths. That is ~150 lines and avoids fighting a library over z-index,
card transforms (tapped = rotated 90°) and scroll containers.

**Keyboard shortcuts**

| Package | Licence | Unpacked | Latest publish | Notes |
|---|---|---|---|---|
| `tinykeys` 4.0.0 | MIT | 75 KB | 2026-05-20 | ~1 KB gzipped, no deps, key-sequence support. **Recommended.** |
| `react-hotkeys-hook` 5.3.3 | MIT | 30 KB | 2026-06-26 | React-idiomatic (`useHotkeys`), scopes/enabled flags — handy for "only when priority is mine". |
| `hotkeys-js` 4.0.8 | MIT | 4.8 MB | 2026-09-09 | Popular, but the package is bloated with builds. |
| `mousetrap` 1.6.5 | Apache-2.0 WITH LLVM-exception | 191 KB | 2020-01-23 | Legacy; skip. |

Forge already defines the shortcut *semantics* we should mirror — `ForgePreferences.java:339-342`
gives Y = always-yes, N = always-no, P = auto-pass; the full `SHORTCUT_*` block is worth reading and
copying wholesale so muscle memory transfers from Forge desktop.

**Card rendering / MTG symbols**

- **Don't render cards; use Scryfall's images.** `normal` (488×680) or `png` (745×1040) from
  `cards.scryfall.io`; `art_crop` only with the artist credit shown somewhere (§5.5).
- `mana-font` (MIT CSS / OFL font, 9.7 MB unpacked — most of it alternate builds; ship only the woff2
  + one CSS) for mana pips in costs, the mana pool, and cost strings from the engine.
- `keyrune` (OFL-1.1 AND GPL-3.0-only, 7 MB) for set symbols — optional; Scryfall serves set SVGs.
- `scryfall-client` (MIT, 237 KB, last publish 2025-04-21) or just `fetch` + `scryfall/api-types`
  (MIT) — the API is simple enough that a typed `fetch` wrapper is less risk than a stale client.

**Other useful, all MIT**

| Package | Licence | Unpacked | Notes |
|---|---|---|---|
| `@floating-ui/react` 0.27.20 | MIT | 912 KB | Card-detail popovers, zone menus, tooltips that must stay on-screen — a real need on a crowded board. |
| `motion` 13.2.0 (the slim entry for framer-motion) | MIT | 701 KB (vs 4.7 MB for `framer-motion`) | Card-moves-to-zone animation. Endstep's changelog warns "Motion changed shape substantially here" — animate *positions*, never game truth. |
| `zustand` 5.0.15 | MIT | 93 KB | Minimal store for the engine-pushed view state. (Webatrice uses Redux Toolkit + RxJS; for a single-player local app zustand + a plain event stream is enough.) |

### 6.3 The layout the user wants, mapped to work

Opponent lands/permanents row, middle table, own permanents/lands, hand at the bottom; left rail
(life, library, hand counts, Decision panel, Pass-To); right rail (phase strip as stop toggles, Hold
Priority); floating Stack panel with arrows. Practically:

- **Board rows** = CSS grid, no library.
- **Hand** = flex row with overlap + hover-raise, no library.
- **Drag hand→battlefield** = `@dnd-kit/core` or pragmatic-dnd; note that in Forge the *click* path is
  the authoritative one (`selectCard`, `selectAbility` on `IGameController`), so drag must resolve to
  the same calls, and clicking must always work as a fallback.
- **Stack panel + arrows** = one SVG overlay + `perfect-arrows`; data from the engine's
  `StackItemView` targets and `CombatView`.
- **Left/right rails** = pure render of engine state + 4 commands (`selectButtonOk`,
  `undoLastAction`, set-yield-marker, set phase pref).

---

## 7. Recommendations

1. **Read `manabrew/forge-harness/src/main/java/forge/harness/AGENTS.md` before designing our
   protocol.** It is free, specific, hard-won knowledge about this exact bridge.
2. **Decide the licence question up front:** GPL-3.0-or-later for the whole repo is the low-friction
   answer and keeps the door open to forking `forge-harness` (AGPL is GPL-compatible in the direction
   AGPL→ nothing, so note: we can *use* manabrew code only by becoming AGPL). If the user wants to
   lift manabrew code, the repo becomes **AGPL-3.0-or-later**; if not, **GPL-3.0-or-later**.
3. **Derive the JSON protocol from `ProtocolMethod.java` + `IGuiGame.java`**, not from scratch. Every
   method there is a message we will eventually need.
4. **Bootstrap headless using Forge's own test classes** (`HeadlessGuiDesktop`,
   `HeadlessNetworkGuiGame`, `TestUtils`) — same licence, same project, already proven.
5. **Treat stops / auto-pay / undo / pass-to as engine calls**, mirroring `ForgePreferences` keys to
   the client for display only.
6. **Card art: Scryfall, hot-linked or proxied**; obey the header + rate-limit rules; never commit
   images. `laryziinha/forge-scryfall-scrapper` (MIT) is a ready-made way to fill Forge's own
   `~/.cache/forge/pics/cards` if we also want the engine-side cache populated.

---

## 8. Open questions

1. **Will the user accept AGPL-3.0-or-later** in exchange for being able to fork manabrew's
   `forge-harness` (weeks of saved work)? If not, we write the bridge from Forge's own classes and
   use their `AGENTS.md` only as prose guidance.
2. **Does `forge-harness` actually build against Forge 2.0.14**, or does it require the pinned
   submodule commit? Their README warns the Forge Java API moves and "A Forge bump can change Forge's
   Java API, which may require fixing compile errors in `forge-harness/`". Unverified for our version.
3. **One JVM per game, or a pooled worker?** mtgbattles runs "8 leased, 2-worker capacity"; Endstep
   spent two release cycles cutting engine memory. For a single local player one JVM is fine — but it
   determines whether we design a session-id protocol now or later.
4. **Snapshot or delta?** Forge's own net layer sends deltas with checksums (`DeltaSyncManager`,
   `NetworkChecksumUtil`); manabrew sends snapshots (`SnapshotExtractor`). Snapshots are far simpler
   for a local app; confirm the payload size for a big Commander board before committing.
5. **How does the Docker image at `localhost:3002` actually stream the GUI** (noVNC? Kasm? xpra?) —
   worth 10 minutes if we want a zero-effort fallback UI while the real client is unfinished.
6. **Is Webatrice GPL-2.0-only or GPL-2.0-or-later?** Determines whether any of its transport code
   could be borrowed into a GPL-3 project. I did not read its file headers.
7. **Does the user want the MSH (Marvel Super Heroes) set's card images at all**, given Scryfall
   coverage of a brand-new set may be partial and Forge's image cache naming (`Card Name#.border.ext`)
   has to match? Worth checking `~/.cache/forge/pics/cards` for MSH before assuming art is free.
