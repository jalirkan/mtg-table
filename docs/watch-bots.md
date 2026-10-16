# Watch two bots — draft, then a best of three

**D440.** Two AIs grid-draft a cube with the cube lab's drafters, build their
decks with the lab's builder, and play a best of three that you watch as it is
played. It is for seeing how a cube plays, not for testing a deck of yours.
mtg-table does the engine half (`tools/cubelab.sh watch`, served by the coach
helper's `/watch` routes); ForgeCoach builds the lobby tile, the draft replay
viewer and the game view from this page. Everything below is what the helper
answers today; a change to it is a change in both repositories (`tools/CLAUDE.md`,
*The coach helper*, rule 1).

## The routes

All on the coach helper, `http://127.0.0.1:8643` (`config.json` `coachPort`),
behind its door exactly as `/review` and `/match` are (`docs/security/endpoints.md`):
loopback, or `--lan` plus the pairing token (`?token=` or `X-ForgeCoach-Token`);
a loopback caller's `Host` must be a loopback name; `Origin` on
`wsAllowedOrigins` (`https://jalirkan.github.io` and loopback are); a tunnel's
headers are refused. Never tunnelled. `/health` says `"watch": 1` when the helper
can run one (the bridge is built) and `"watchRunning": "<id>"|null`; show the tile
only when `watch` is 1.

| Route | Answer |
|---|---|
| `POST /watch` `{"cube", "seed"?, "games"?, "playerA"?, "playerB"?, "pace"?}` (4 KB) | `202 {"ok": true, "id", "seed", "state": "/watch/<id>", "game": "/watch/<id>/game/<n>"}` — `409 {"code": "busy", "running": "<id>"}` while another watch runs (one at a time); `400` a bad body, unknown fields included; `503` the bridge is not built or `--no-watch` |
| `GET /watch` | `200 {"ok": true, "running": "<id>"|null, "watches": [{id, status, cube, seed, bestOf, players, wins, winner, updatedAt}]}`, newest first, at most 20 |
| `GET /watch/<id>` | `200 {"ok": true, "id", "running": bool, "match": <match.json>|null, "draft": <draft.json>|null}` — each null until written; `404` an unknown id |
| `GET /watch/<id>/game/<n>` | game `n`'s frame log, complete lines that passed the redaction check only (below); `404` until that game has started; `500 {"code": "redaction-failed"}` once it failed the check |
| `POST /watch/<id>/stop` | `200 {"ok": true, "id", "stopping": true}`; `409 {"code": "not-running"}`; then `match.status` becomes `"stopped"` |

The body:

- `cube` — a cube id, the file name under mtg-table's `cubes/` without `.md`
  (`fair-fight-cube-180`, `pauper-cube-180`, `peasant-cube-180`, `vintage-cube-180`,
  …; ForgeCoach's `src/cube/cubes.ts` `file` field). A path is a 400.
- `seed` — 1 … 799,999,999 (the lab's seed range); absent: random, and the
  answer says which. The same cube and seed draft the same picks and decks
  (D294); a second watch of them replaces the first's folder.
- `games` — the best of: 1, 3 (default), 5 or 7. It stops once a side has more
  than half.
- `playerA`, `playerB` — who plays each drafter's deck: a Forge AI profile
  (`Default`, `Cautious`, `Reckless`, `Experimental`; any case) or `"search"`
  (search-v2, the live search seat: Default plus the outlet policy and the
  anytime search; the AI ladder's `search-v1-anytime`). Default `Default`. A
  profile is a style, not a difficulty (D107): never label one harder.
- `pace` — milliseconds the recorder waits at a frame where something happened
  (a quarter of it after one that only moved the phase strip); 0 … 5000, default
  600. At 0 a game is over in seconds.

Both seats draft with the lab's drafter. The CLI can also put ForgeCoach's
human pick model in one chair (`--drafter-a human-picks:<x.picks.json>`, D416);
the route does not take it yet.

## The lifecycle

1. `POST /watch` → 202 with the `id` (`watch-<cube>-<seed>`). Poll
   `GET /watch/<id>` every 1–2 s from here on.
2. `match.status` is `"drafting"`. The engine boots to look the cube's cards up
   and to make Forge's fallback decks; **`draft` arrives in about 5–10 s**.
   Start the draft replay as soon as it does.
3. `"playing"`: `match.games` grows one game at a time. A game appears with
   `status: "playing"` a few seconds before its log exists (the recorder is
   booting): `GET /watch/<id>/game/<n>` is 404 until then. Follow it (below).
   When it ends its entry gets `winner`, `reason`, `turns`, `redaction`, and
   `match.wins` moves. The next game starts at once.
4. `"done"`, with `match.winner` (`"A"`, `"B"` or `"draw"`). Or `"error"` /
   `"stopped"` with `match.error` in words; a game cut short has
   `status: "error"`.

`match.json` is written whole after each change (a renamed temp file), so a GET
never sees half of one. Its moves are a state machine: `drafting → playing →
done`, and `drafting | playing → error | stopped`; `done`, `error` and
`stopped` stay. Games are appended one at a time, at most one is `"playing"`,
a finished game never changes, `wins` is the count of finished games, and
nothing is played after a side reaches `need`.

Measured on this desktop (load average 12–17, the lab running beside it): the
draft step 4–9 s (the first watch of a cube boots the engine to look its cards
up; later ones reuse the cache); a game between two Forge profiles about 9 s at
`pace: 0`; with a `search` seat about 40 s at `pace: 0` and a minute at
`pace: 150`. A best of three, Reckless against search at `pace: 150`: 137 s in
all. At the default 600 ms expect a few minutes a game.

## Following a game

`GET /watch/<id>/game/<n>` serves the log as the spectate dev route serves
`var/spectate/` (D122): **only complete lines** — a line the recorder is half way
through is never sent — at most 4 MiB an answer, and **only lines that passed
`tools/check-redaction.mjs`**: before it sends bytes past the last check, the
helper checks the log's whole complete-lines prefix with `--partial` (every leak
rule and every exact-shape rule; not the three coverage checks a game's first
lines cannot meet; about 0.1 s for 2 MB) and sends what passed, so a follower
runs one check behind the recorder. Until the first `state` frame is written
(the session line and `hello_ok` come about 10 s before it) nothing has passed:
the answer is `200`/`206` with no body and `X-Log-Next: 0`, not an error. A last
`state` whose reveal the next line (its `ask`) may justify is held back until
that line is written. Every one of the 17,757 line-prefixes of the committed
recordings (`fixtures/games/`, `fixtures/synthetic/`) passes `--partial`
(measured 2026-10-16, about 3.5 minutes in memory); the checker's self-test
re-runs a stride of them. A game that fails is never sent past
its last passing line: every later request for it is
`500 {"ok": false, "code": "redaction-failed", "message"}` (which game, never
what failed: the checker's own words can name the card, and stay on the helper's
console), and the watch ends `error` saying so. Two ways to poll, and every
answer carries `X-Log-Next` (the byte after the last line sent) and `X-Log-Size`
(exposed to the page through `Access-Control-Expose-Headers`):

- `?from=<byte>` → `200`, the lines written since that byte; `416` when the byte
  is past the end of the file (it was re-recorded: start again from 0).
- `Range: bytes=<b>-` → `206` with `Content-Range`, the same lines. This is how
  ForgeCoach's `src/live.ts` already polls a `frames.jsonl` over HTTP: it asks
  from one byte before its offset, and the `206`'s first byte is that newline.
  `416` when `<b>` is at or past the end (re-recorded). The helper's preflight
  allows the `Range` header.
- neither → `200` from byte 0.

So `live.ts`'s HTTP mode follows a game unchanged when given
`http://127.0.0.1:8643/watch/<id>/game/<n>`: line 0 is the session header, the
log ends with the `over` frame, and `live.ts` stops there. Treat its 404 as
"starting" while `match.games[n-1].status` is `"playing"`. When game `n`'s
`over` lands, wait for `match.json` to show game `n + 1` (or `done`).

Each game's `gameId` is `<id>-g<n>`, so two watches never share one.

## Hidden information

- **Every game is drafter A's eyes** (`match.view`: seat 0). Drafter B's hand is
  the five-key stub, exactly as on the board (hard rule 8). Every line the
  helper serves passed `tools/check-redaction.mjs` before it was sent (above,
  *Following a game*), and each finished recording is checked again, whole,
  before its result is written (`games[].redaction: "pass"`; a fail at either
  point ends the watch with `"error"`). There is no omniscient view, and no
  seat-1 recording.
- **`draft` shows both pools and both decks.** A grid draft is played face up:
  both drafters see every grid and every line the other takes, so the picks and
  the pools in `draft.json` hid nothing from either drafter. The decks are the
  exception: each drafter builds its own in private, so **B's main / side
  choice was hidden from A** (and A's from B) — the AI playing A never saw which
  of B's cards B put in its 40. Showing deck B's list beside a game tells the
  viewer something seat A did not know; it is a decklist, never what B holds
  or draws, so it is no leak of the game, but label it as B's list rather than
  as anything A could see.

## draft.json (`kind: "watch-draft"`, v1)

```json
{
  "v": 1, "kind": "watch-draft", "id": "watch-fair-fight-cube-180-440", "faceUp": true,
  "cube": { "title": "The Fair Fight Cube — flat power at every rarity (180 cards, two-player)",
            "file": "cubes/fair-fight-cube-180.md", "sha256": "…" },
  "format": "grid", "seed": 440, "startedAt": "2026-10-16T03:25:01.912Z", "draftedMs": 9311,
  "drafters": { "A": { "drafter": "lab" }, "B": { "drafter": "lab" } },
  "firstSeat": "A", "grids": 18,
  "picks": [
    { "n": 1, "grid": 1, "seat": "A", "order": 1,
      "slots": ["Experimental Synthesizer", "Blossoming Sands", "Restless Bivouac",
                "Unearth", "Kitesail Freebooter", "Vraska, Swarm's Eminence",
                "Fatal Push", "Fervent Champion", "Ravenous Chupacabra"],
      "line": 3, "lineName": "col 1",
      "took": ["Experimental Synthesizer", "Unearth", "Fatal Push"], "value": 103.4 },
    { "n": 2, "grid": 1, "seat": "B", "order": 2,
      "slots": [null, "Blossoming Sands", "Restless Bivouac",
                null, "Kitesail Freebooter", "Vraska, Swarm's Eminence",
                null, "Fervent Champion", "Ravenous Chupacabra"],
      "line": 5, "lineName": "col 3",
      "took": ["Restless Bivouac", "Vraska, Swarm's Eminence", "Ravenous Chupacabra"], "value": 87.2 }
  ],
  "pools": { "A": ["…53 or so names…"], "B": ["…"] },
  "decks": {
    "A": { "name": "Drafter A (UB)", "file": "deck-A.dck", "builder": "lab", "colors": "UB", "splash": null,
           "cards": 40, "main": [[1, "Snapcaster Mage"], [1, "Counterspell"], "…", [8, "Island"]],
           "sideboard": [[1, "Experimental Synthesizer"], "…"],
           "why": { "spells": 23, "lands": 17, "creatures": 16, "curve": [4, 8, 2, 4, 3, 2], "avgCmc": 3.04,
                    "themes": [["SPL", 10], ["EVA", 8], ["FLK", 6]], "score": 128.9,
                    "parts": { "meanRating": 71.9, "playables": 42, "theme": 21, "curve": -6, "splash": 0 },
                    "alternatives": [{ "colors": "UB", "splash": "W", "score": 128.9 }], "stretched": false },
           "labErrors": [] },
    "B": { "…": "the same shape" }
  }
}
```

- `picks` is the whole draft in order: for each of the `grids` grids, its
  opener's pick (`order: 1`), then the other drafter's (`order: 2`). `n` counts
  from 1 over the draft. The opener alternates grid by grid; `firstSeat` opens
  grid 1.
- `slots` is the grid as that drafter saw it, nine entries row by row (slot
  `3 × row + column`), `null` where the opener's line already emptied it. The
  opener's nine are all cards.
- `line` 0–2 is a row, 3–5 a column — ForgeCoach's draft and the draft room
  number them the same way. `took` is what that line held, in slot order (three
  cards, or two when the second pick crosses the first). The rest of the grid is
  discarded.
- `value` is the lab drafter's own number for the line it took (`pick.ts`'s set
  value: card ratings plus colour, curve and theme fit). It is a score to show
  as "how much it liked this", not a probability.
- `pools.A` / `pools.B` are everything each drafter took, in pick order: the
  sum of its `took`.
- `decks.A` / `decks.B` are the decks the games play. `builder: "lab"` is the
  lab's builder (`why` is its reasoning: the colours chosen, `score` and its
  `parts`, the next-best builds in `alternatives`, `stretched` when it needed a
  wide splash, 18 lands or three colours). When the lab's builder found no legal
  deck, Forge's builder made it: `builder: "forge"`, `why: null`, and
  `labErrors` says why the lab's failed. `main` and `sideboard` are
  `[count, name]`; basic lands are in `main` and in no pool. Every deck is 40.
- `draftedMs` is when the draft and both decks were done, from the start.
  The picks themselves are computed in milliseconds, so they carry no times of
  their own: the viewer paces the replay (a second or two a pick reads well).

## match.json (`kind: "watch-match"`, v1)

```json
{
  "v": 1, "kind": "watch-match", "id": "watch-fair-fight-cube-180-4242",
  "status": "playing", "startedAt": "2026-10-16T03:25:28.796Z", "updatedAt": "2026-10-16T03:26:36.000Z",
  "cube": { "title": "The Fair Fight Cube — …", "file": "cubes/fair-fight-cube-180.md" },
  "seed": 4242, "bestOf": 3, "need": 2, "paceMs": 150,
  "view": { "seat": 0, "side": "A" },
  "players": {
    "A": { "player": "Reckless", "profile": "Reckless", "policy": "plain", "deck": "Drafter A (UG+w)" },
    "B": { "player": "search", "profile": "Default", "policy": "search", "deck": "Drafter B (WU+g)" }
  },
  "games": [
    { "n": 1, "file": "watch-fair-fight-cube-180-4242-g1.jsonl", "seed": 42421, "status": "done",
      "winner": "B", "reason": "AllOpponentsLost", "turns": 20, "startedMs": 4369, "endedMs": 67026, "redaction": "pass" },
    { "n": 2, "file": "watch-fair-fight-cube-180-4242-g2.jsonl", "seed": 42422, "status": "playing",
      "winner": null, "reason": null, "turns": null, "startedMs": 67186, "endedMs": null, "redaction": null }
  ],
  "wins": { "A": 0, "B": 1, "draws": 0 }, "winner": null, "current": 2
}
```

- `status`: `drafting | playing | done | error | stopped`; `error` (and
  `stopped`) carry `error`, in words.
- `players.X.player` is what was asked for; `profile` the Forge `.ai` file the
  seat plays under and `policy` `plain` (Forge's AI) or `search`. The handshake
  inside each game log (`hello_ok.match`) names the profile only, so say
  "search" from here. `deck` is the deck's name (also the game's
  `hello_ok.match.yourDeck` / `aiDeck` name), null while drafting.
- `games[]`: `winner` `A | B | draw`, Forge's `reason`, `turns` (player turns),
  `startedMs` / `endedMs` from the watch's start, `seed` the game's own (the
  watch's seed × 10 + n). Who goes first is Forge's coin toss each game.
- `wins` counts finished games; `winner` is set once a side has `need` wins, or
  every game is played (the side ahead, or `draw`).

## The lobby button

A tile **Watch two bots** (shown when `/health` has `"watch": 1`):

1. A small form: the cube (ForgeCoach's cube list, which `GET /health` does not
   check — a cube mtg-table does not have is a 400 naming the ones it has), who
   plays each side (the four profiles and *Search AI*), best of 1 / 3 / 5, an
   optional seed. **Watch** posts `/watch`.
2. On `409`, offer **Watch the one running** (`running` from the answer) and
   **Stop it and start mine** (`POST /watch/<running>/stop`, wait for
   `GET /watch` to say `running: null`, post again). On `GET /watch` with a
   `running` id when the lobby opens, offer to rejoin it.
3. The view, from `GET /watch/<id>`: a "drafting…" state until `draft` arrives;
   then the **draft replay** — the grids one at a time, the line each drafter
   took highlighted, both pools growing, a step / play / skip-to-decks control —
   ending on the two decks with the builder's `why`. Then the **games**: follow
   `/watch/<id>/game/<n>` with the live follower (it is seat A's view: label it
   so), a scoreboard from `match.wins` and `players`, and the next game picked
   up from `match.games`. When the draft replay is still running while game 1
   starts, let the viewer finish the draft first; the game log keeps.
4. A **Stop** button posts `/watch/<id>/stop`. Leaving the page does not stop
   the watch; it ends by itself.

A finished watch stays in `var/spectate/watch-<cube>-<seed>/` and in
`GET /watch` until the same cube and seed are watched again, or until it is no
longer among the 10 most recent: starting a watch removes the older folders
(the helper's `--watch-keep N`; by `match.json`'s `updatedAt`, a running watch
never).
