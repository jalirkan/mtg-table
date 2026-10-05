# The match launcher — `/match` on the coach helper (D303)

The one place ForgeCoach's side copies from. ForgeCoach's cube draft builds
both 40-card decks in the browser; **Play this match** sends them here, and
`scripts/play.sh` restarts the engine on them. The code is
`tools/match-launcher.mjs` (its header repeats these shapes),
`tools/coach-helper.mjs` (the route and the gate) and `scripts/play.sh` (the
restart); `tools/match-launcher-selftest.mjs` holds all three. Decision
**D303**; protocol amendment **M53** (`docs/protocol.md`).

## Where it is

The coach helper: `http://127.0.0.1:<coachPort>` (`config.json` `coachPort`,
8643), the same place as `/coach`. On a phone in LAN mode it is
`http://<the page's host>:8643` with the pairing token, exactly as `/coach`.
It exists only when `play.sh` started the helper (every mode, `--engine-only`
and `--lan` included) and was not given `--no-coach` or `--no-match`. Without
`claude` on PATH the helper still runs for `/match` (its `/health` then says
`ok: false` for the coach).

**Detect it** with `GET /health`: `"match": 1` means `POST /match` will work;
`"match": 0` (or no key, an older helper, or no helper) means it will not. The
key is there whether `ok` is `true` or `false` — read it on both.

```json
{"ok":true,"helper":1,"claude":"2.1.287 (Claude Code)","models":["opus","sonnet","haiku"],"match":1,"engine":"running","engine_start":1}
{"ok":true,"helper":1,"claude":"2.1.287 (Claude Code)","models":["opus","sonnet","haiku"],"match":1,"engine":"idle","idleSince":"2026-10-03T18:04:11.402Z","exitsAt":"2026-10-03T22:04:11.402Z"}
{"ok":false,"helper":1,"error":"the claude CLI is not installed or not on PATH — …","match":1,"engine":"running"}
```

**The engine can be asleep (D308).** A draft takes longer than the engine
lives, so when the engine exits — its match is over and the linger window
closed, or D286's hour with no seat — `play.sh` and the helper stay up (in
`--engine-only` and `--lan`, the modes ForgeCoach uses) and `/health` says so:
`"engine": "idle"`, with `idleSince` and `exitsAt` (ISO times; `exitsAt` is
`null` when `play.sh` never gives up). Nothing listens on the ws port then, and
no JVM runs. `POST /match` starts the engine from there, exactly as it
restarts a running one (10–20 s). `"engine"` is there only when `"match": 1`;
absent means an older helper — treat it as running. `"engine_start": 1`
(same condition as `"match": 1`) says `POST /engine/start` exists.

**The opponent AI (D333).** With `"match": 1`, `/health` also carries
`"aiPolicies": ["plain","outlets","search"]` and
`"aiSearchMs": {"min":500,"max":5000,"default":1500}`: `POST /match` then takes
`aiPolicy` and `aiSearchMs` (below). No `aiPolicies` key: an older helper — offer
no choice and send neither key.

## `POST /engine/start` (D308, D381, D384)

Wakes a sleeping engine **on the last match setup** — the decks, profile and
games of the last `POST /match`, or `play.sh`'s own startup decks when there
never was one — with a game id of its own and **a fresh shuffle** (D384): a
random `--seed`, as `POST /match` gets, never the last wake's again (unless
`play.sh` was started with `--seed`). The
helper's own gate, exactly as `/match`; it goes through the same request file and SIGUSR1, so a wake and a
`POST /match` never run at once (409 for the second). This is what ForgeCoach's
ordinary **Play vs Forge** calls when `engine` is `"idle"`, then it connects to
`/ws`.

**The body (D381, D384)** is optional, 4 KB at most:

- **none** (or only whitespace): the last setup exactly, as before D381;
- **`{"aiProfile": "Cautious"}`**: the last setup, but the AI plays that
  profile — one of the engine's `.ai` files (`Default`, `Cautious`,
  `Reckless`, `Experimental`), any case, checked exactly as `/match`'s
  `aiProfile`. It replaces the setup's profile and **stays the last setup's**:
  a later wake with no body plays it again, until a `POST /match` or another
  profile replaces it. No deck is named, sent or revealed: the AI's list stays
  hidden information, which is why plain **Play vs Forge** uses this rather
  than `/match`. `{}` and unknown keys are the no-body wake;
- **`{"seed": 4242}`** (D384, with or without `aiProfile`): that shuffle
  instead of a fresh one — for tests and for replaying a game. A non-negative
  safe integer (0 to 2^53 − 1); it holds for this wake only, and the next wake
  without one deals a fresh seed again. A `--seed` `play.sh` was started with
  holds for every wake without one, as it does for `POST /match`;
- anything else (not JSON, not an object, an unknown profile, a seed that is
  negative, fractional, a string, `null` or past 2^53 − 1): **400** with
  `problems`, and nothing starts.

`/health` says the helper takes the body with `"engine_start_profile": 1`
(beside `"engine_start": 1`), and the seed with `"engine_start_seed": 1`
(D384); an older helper ignores a body, so send one only when the key is there.

200 — the engine is running: the `POST /match` 200's shape (`yourDeck`, `aiDeck`,
`aiProfile`, `games`, `seed`, `ms`, `warnings`; `yourDeck.path` is `null` for the startup
decks) plus `"already": false`; `aiProfile` is the profile the engine says it
loaded, and `seed` (D384) the shuffle it says it dealt — the same number
`hello_ok.seed` and the recording's session header carry. The engine already
running is also 200, at once, and **nothing restarts**:
`{"ok":true,"already":true,"yourDeck":…,"aiDeck":…,"aiProfile":…,"games":…}`
(the current match, or just `"ok"` and `"already"` when none is known); when the
body asked for another profile than the running match's, or named a seed,
`"warnings"` says it was not applied (a seed also when an engine started
between the check and `play.sh` taking the wake up: then the 200 carries the
running engine's `seed`). Refusals are `/match`'s: 400 (the body, D381), 403 (gate), 405
(not POST), 409, 502 (`restored:false`: the engine stays asleep), 503 (no
launcher), 504.

**A second `play.sh` beside a sleeping one** (ForgeCoach's launcher runs
`play.sh --engine-only` on every click of its menu entry): when the coach port
already answers with `match: 1`, a new `play.sh --engine-only` builds nothing,
binds nothing and starts no second helper. Engine asleep: it `POST`s
`/engine/start`, prints `Engine ready on ws://…`, and exits 0 (the first
`play.sh` keeps running). Engine running: it says so and exits 0. Not with
`--port` (a second bridge on purpose), `--no-coach` or `--no-match`; the flags of
the second launch (decks, `--lan`) are not applied — the wake uses the first
launch's setup.

## Who may call it

The helper's own gate, unchanged (D292; amendments M50, M51): the `Origin`
must be on `config.json`'s `wsAllowedOrigins` (`https://jalirkan.github.io`,
`http://127.0.0.1:*`, `http://localhost:*` by default) or be a LAN page of this
machine; a non-loopback caller needs the pairing token (`?token=<T>` or the
header `X-ForgeCoach-Token`). A `POST` with `Content-Type: application/json`
is preflighted; the preflight answers 204 with
`Access-Control-Allow-Private-Network: true`. Anything else is **403**
`{"type":"error","message":"origin not allowed"}` (or `"pairing token missing
or wrong"`) and starts nothing.

D386 added two refusals in front of those, both 403 with the same body shape:
a caller whose socket address is not loopback, on a helper started without
`--lan` (`"origin refused: this coach helper answers this machine only …"`),
whatever the bind; and a loopback caller whose `Host` is not `localhost` (or
`*.localhost`) or a loopback IP literal (`"origin refused: Host is not a
loopback name …"`) — a page that rebound its name to 127.0.0.1, a tunnel, or a
port relay that kept its client's `Host`. ForgeCoach calls
`http://127.0.0.1:8643` from this machine and `http://<LAN IP>:8643` (a
non-loopback caller, with the token) from a phone, so neither refusal touches
it. `docs/security/endpoints.md` is every port and its door.

## `POST /match`

```http
POST /match HTTP/1.1
Content-Type: application/json
```

```json
{
  "deck": {
    "name": "Izzet Spells (cube draft)",
    "main": [[16, "Island"], [1, "Lightning Bolt"], [1, "Fire // Ice"], [1, "Counterspell|M10"]],
    "sideboard": [[1, "Pyroblast"]]
  },
  "aiDeck": {
    "name": "AI Drafter — Golgari",
    "main": [[17, "Forest"], [1, "Llanowar Elves"]]
  },
  "aiProfile": "Default",
  "games": 3
}
```

| field | type | rule |
|---|---|---|
| `deck`, `aiDeck` | object | required; yours and the AI's |
| `.name` | string | 1–80 characters: letters, digits, spaces and `' ’ , . ! ? & ( ) + : / _ -`, starting with a letter or digit; no double space, no leading or trailing space. It becomes the `.dck`'s `Name=` and what the board and `hello_ok.match` print |
| `.main` | `[count, cardName][]` | required; **40–250 cards** in all; at most 500 entries |
| `.sideboard` | `[count, cardName][]` | optional; at most 250 cards |
| `count` | integer | 1–250 |
| `cardName` | string | Forge's spelling (`Kongming, "Sleeping Dragon"`, `Fire // Ice`, `Lim-Dûl the Necromancer`), letters, digits, spaces and `' ’ " , . ! ? & ( ) + : / _ -`, at most 141 characters, optionally `\|SET` (2–8 of `A-Z0-9`). Checked against the engine's own card scripts when they are on disk — any case, accents folded |
| `aiProfile` | string | optional, default `"Default"`; one of the engine's `.ai` files — `Default`, `Cautious`, `Reckless`, `Experimental` — any case. A profile is not a difficulty |
| `games` | integer | optional, default `3`; 1–9: the match is played to this many games (`hello_ok.gameCount`) |
| `aiPolicy` | string | optional (D333); exactly `"plain"` (Forge's own AI), `"outlets"` (with D310's sacrifice-outlet policy) or `"search"` (D312's look-ahead search behind it), passed as `MtgTable --ai-policy`. Absent: the AI `play.sh` was started with (`--ai-search` included); the seat reads it back in `hello_ok.match.aiPolicy` (amendment M56) |
| `aiSearchMs` | integer | optional (D333), only with `"aiPolicy": "search"`; 500–5000, the search's budget per searched decision (`--ai-search ms=<n>`); absent: the bridge's default, 1500 |

The body is at most **64 KB**. Unknown keys are ignored.

**What happens.** The helper checks everything, writes `var/match/<id>/you.dck`
and `ai.dck`, and asks `play.sh` to restart the engine. `play.sh` stops the
running engine — **the seat's `/ws` socket closes** (1006: the engine is
stopped, it sends no close frame), and `/observe` followers' with it — waits until its
port is quiet, starts the engine on the new decks with every other flag as it
was, and waits for its `/health`. The reply comes when the new engine is
ready: usually 10–20 s (a cold engine boot), up to 180 s on a busy machine.

### 200 — the new match is running

```json
{
  "ok": true,
  "yourDeck": { "name": "Izzet Spells (cube draft)", "path": "var/match/m1791014114724/you.dck", "cards": 40 },
  "aiDeck":   { "name": "AI Drafter — Golgari", "cards": 40 },
  "aiProfile": "Default",
  "aiPolicy": "plain",
  "games": 3,
  "seed": 48213,
  "ms": 14210,
  "warnings": []
}
```

`seed` (D384) is the shuffle the engine dealt (`hello_ok.seed`): a random one
unless `play.sh` was started with `--seed`. `cards` is the main-deck count **as
the engine loaded it**. When it is lower
than what you sent, the engine left out a card it does not know, and
`warnings` says so in plain words, e.g. `"the engine loaded 39 of the 40
main-deck cards of your deck — a card it does not know was left out"`.
`aiDeck` is a name and a count, never a list (hard rule 8, amendment M44) —
the same two keys `hello_ok.match.aiDeck` carries.

**Then reconnect** the seat to `/ws` (`ws://127.0.0.1:<wsPort>/ws`, or the LAN
URL with the same token as before — a restart keeps it). The new engine sends
`hello_ok` with a new `gameId` (`match-<id>`) and `match` naming the new decks, then `state`.

### Every refusal

One JSON body, `{"ok": false, "type": "error", "message": "<plain words>"}`,
plus a key where the table says:

| status | when | extra |
|---|---|---|
| 400 | the body is not JSON, or a field breaks a rule above, or a card name the engine's scripts do not know (`"aiDeck: 2 card names the engine does not know: Black Lotus; Moxen Galore"`) | `problems: string[]`, every one found |
| 403 | another `Origin`, a LAN caller without the token, a non-loopback caller of a non-LAN helper, or a DNS-name `Host` from loopback (D386) | (the gate's body: `type`, `message`) |
| 405 | not `GET`/`POST` | |
| 409 | a match is already being started | |
| 413 | over 64 KB | |
| 502 | the engine did not start on these decks; `message` carries the end of its log | `restored: true` — the previous match is running again (reconnect to it); `false` — no engine is running: `play.sh` stays up with the engine asleep when it was asleep before (D308), else it is stopping (the connection may drop before this reply arrives) |
| 503 | no `play.sh` behind this helper (started by hand, `--no-match`, or `play.sh` has exited) | |
| 504 | no answer from `play.sh` within 180 s | |

Nothing is written or restarted on a 400, 403, 405, 409, 413 or 503.

## `GET /match`

```json
{
  "ok": true,
  "state": "running",
  "match": {
    "yourDeck": { "name": "Izzet Spells (cube draft)", "cards": 40 },
    "aiDeck":   { "name": "AI Drafter — Golgari", "cards": 40 },
    "aiProfile": "Default",
    "aiPolicy": "plain",
    "games": 3
  }
}
```

`aiPolicy` (D333) is the policy the engine says it started with (its banner).

`state` is `"restarting"` while a `POST` is in flight and `"idle"` while the
engine is asleep (D308; `match` is then `null`: there is no current match).
`match` is what the running engine loaded — `play.sh`'s own decks until the
first `POST`, and `null` if `play.sh` has not written one yet. 503 as above when there is no
launcher.

## TypeScript, to copy

```ts
export type DeckEntry = [count: number, cardName: string];
export interface MatchDeck { name: string; main: DeckEntry[]; sideboard?: DeckEntry[] }
export interface MatchRequest {
  deck: MatchDeck;
  aiDeck: MatchDeck;
  aiProfile?: 'Default' | 'Cautious' | 'Reckless' | 'Experimental';
  games?: number; // 1..9, default 3
  aiPolicy?: 'plain' | 'outlets' | 'search'; // D333; only when /health lists aiPolicies
  aiSearchMs?: number; // D333; 500..5000, only with aiPolicy 'search'
}
export interface MatchStarted {
  ok: true;
  yourDeck: { name: string; path: string; cards: number };
  aiDeck: { name: string; cards: number };
  aiProfile: string;
  aiPolicy?: string | null; // D333
  games: number;
  seed?: number | null; // D384: the engine's --seed (null: its log did not say)
  ms: number;
  warnings: string[];
}
export interface MatchRefused {
  ok: false;
  type: 'error';
  message: string;
  problems?: string[]; // 400
  restored?: boolean;  // 502
}
export interface MatchCurrent {
  ok: true;
  state: 'running' | 'restarting' | 'idle';
  match: null | {
    yourDeck: { name: string; cards: number } | null;
    aiDeck: { name: string; cards: number } | null;
    aiProfile: string | null;
    aiPolicy?: string | null; // D333
    games: number | null;
  };
}
// POST /engine/start, body none or EngineStartRequest (D381; only when /health has engine_start_profile: 1)
//   -> MatchStarted & { already: false } | { ok: true, already: true, ...current, warnings?: string[] }
export interface EngineStartRequest {
  aiProfile?: 'Default' | 'Cautious' | 'Reckless' | 'Experimental';
  seed?: number; // D384: 0..2^53-1; only when /health has engine_start_seed: 1; absent = a fresh shuffle
}
// GET /health gains: match: 0 | 1, engine_start?: 1, engine_start_profile?: 1 (D381), engine_start_seed?: 1 (D384), and (when match is 1) engine: 'running' | 'idle',
// idleSince?: string, exitsAt?: string | null  (only when idle),
// aiPolicies?: string[], aiSearchMs?: {min, max, default}  (D333, when match is 1)
```

## What ForgeCoach does

1. `GET /health` (it already does, for the coach): show **Play this match**
   when `match === 1`; otherwise say that `./scripts/play.sh` (or the
   ForgeCoach launcher) must be running.
2. Close its own seat socket first (or expect it to drop), then `POST /match`
   with a long timeout (180 s) and a "starting the engine…" state.
3. On 200: show `warnings` if any, then connect to `/ws` as for **Play vs
   Forge**; treat the next `hello_ok` as a new match. On 502 with `restored:
   true`, show `message` and offer to reconnect to the previous match. On 400,
   show `problems`.
4. The decks' names are public at the table (`hello_ok.match`), so name the
   AI's deck by its archetype, not after a card in it.
5. Plain **Play vs Forge** with the engine asleep: `POST /engine/start`, with
   `{"aiProfile"}` when the player picked a profile and `/health` has
   `engine_start_profile: 1` (D381); show `warnings` from an `already` reply
   (the running match keeps its profile).

## Not covered

- The helper runs only while `play.sh` runs. With the launcher on, `play.sh`
  no longer exits when the engine does (M6's linger, D286's hour): it sleeps
  (`"engine": "idle"`) and `POST /match` wakes the engine. It does exit by
  itself after `--idle-exit-after <minutes>` asleep with no request (default
  240; `0` never), and on Ctrl-C or the launcher's Stop; `GET /health` failing
  is then the sign. Without the launcher (`--no-match`, `--no-coach`) and in
  `play.sh`'s bare board mode the old exit stays.
- ForgeCoach's launcher holds a sleep lock (`systemd-inhibit`) for as long as
  `play.sh` runs. An asleep engine is still a running `play.sh`, so the lock is
  held until the idle exit — up to four hours after the last match with the
  default. The machine cannot suspend meanwhile; that costs nothing but power,
  and `--idle-exit-after` is the dial.
- One engine, one seat: `POST /match` replaces the running match, whoever is
  playing it.
