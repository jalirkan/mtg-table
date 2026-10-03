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
{"ok":true,"helper":1,"claude":"2.1.287 (Claude Code)","models":["opus","sonnet","haiku"],"match":1}
{"ok":false,"helper":1,"error":"the claude CLI is not installed or not on PATH — …","match":1}
```

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
  "games": 3,
  "ms": 14210,
  "warnings": []
}
```

`cards` is the main-deck count **as the engine loaded it**. When it is lower
than what you sent, the engine left out a card it does not know, and
`warnings` says so in plain words, e.g. `"the engine loaded 39 of the 40
main-deck cards of your deck — a card it does not know was left out"`.
`aiDeck` is a name and a count, never a list (hard rule 8, amendment M44) —
the same two keys `hello_ok.match.aiDeck` carries.

**Then reconnect** the seat to `/ws` (`ws://127.0.0.1:<wsPort>/ws`, or the LAN
URL with the same token as before — a restart keeps it). The new engine sends
`hello_ok` with a new `gameId` and `match` naming the new decks, then `state`.

### Every refusal

One JSON body, `{"ok": false, "type": "error", "message": "<plain words>"}`,
plus a key where the table says:

| status | when | extra |
|---|---|---|
| 400 | the body is not JSON, or a field breaks a rule above, or a card name the engine's scripts do not know (`"aiDeck: 2 card names the engine does not know: Black Lotus; Moxen Galore"`) | `problems: string[]`, every one found |
| 403 | another `Origin`, or a LAN caller without the token | (the gate's body: `type`, `message`) |
| 405 | not `GET`/`POST` | |
| 409 | a match is already being started | |
| 413 | over 64 KB | |
| 502 | the engine did not start on these decks; `message` carries the end of its log | `restored: true` — the previous match is running again (reconnect to it); `false` — no engine is running and `play.sh` is stopping (the connection may drop before this reply arrives) |
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
    "games": 3
  }
}
```

`state` is `"restarting"` while a `POST` is in flight. `match` is what the
running engine loaded — `play.sh`'s own decks until the first `POST`, and
`null` if `play.sh` has not written one yet. 503 as above when there is no
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
}
export interface MatchStarted {
  ok: true;
  yourDeck: { name: string; path: string; cards: number };
  aiDeck: { name: string; cards: number };
  aiProfile: string;
  games: number;
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
  state: 'running' | 'restarting';
  match: null | {
    yourDeck: { name: string; cards: number } | null;
    aiDeck: { name: string; cards: number } | null;
    aiProfile: string | null;
    games: number | null;
  };
}
// GET /health gains: match: 0 | 1
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

## Not covered

- The helper runs only while `play.sh` runs, and `play.sh` still exits when a
  match is over and nobody is connected (M6's linger) or after an hour with no
  seat (D286). A draft longer than that needs `play.sh` started again; `GET
  /health` failing is the sign.
- One engine, one seat: `POST /match` replaces the running match, whoever is
  playing it.
