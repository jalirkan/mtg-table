# Watch two bots — draft, then a best of three

**D440, D443, D444.** Two AIs grid-draft a cube with the cube lab's drafters, build their
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
only when `watch` is 1. It also lists the choices `POST /watch` takes (D443):

```json
"watchDrafters": [
  { "id": "lab",         "label": "Lab drafter (card ratings, themes and colours)" },
  { "id": "forge-ranks", "label": "Forge's card ranks (no themes, commits early)" },
  { "id": "llm:haiku",   "label": "Claude Haiku, asked once a pick",
    "costNote": "about $0.02 a draft at list price (measured $0.015); spends Claude usage through the logged-in Claude Code CLI, at most $1 and 40 calls a watch, and stops the watch if more than 25% of its picks fall back; asks for a confirm" },
  { "id": "llm:sonnet",  "label": "Claude Sonnet, asked once a pick", "costNote": "about $0.30 a draft at list price; …" }
],
"watchPlayers": [
  { "id": "Cautious", "label": "Forge AI (Cautious)" }, { "id": "Default", "label": "Forge AI (Default)" },
  { "id": "Experimental", "label": "Forge AI (Experimental)" }, { "id": "Reckless", "label": "Forge AI (Reckless)" },
  { "id": "search-v2", "label": "Search AI (search-v2: Forge AI plus a look-ahead search)" }
],
"watchLlmCap": { "maxUsd": 1, "maxCalls": 40, "maxFallbackRate": 0.25 },
"watchCustom": 1
```

`watchCustom: 1` (D444) means `POST /watch` takes a cube of your own, carried
in the body (*Your own cube*, below): enable the cube builder's cubes in the
form only when it is there.

Build the form from these lists, not from a copy: `watchPlayers` is the helper's
`forge-home/res/ai/*.ai` files, and the cap is its `config.json` (`coach.watchMaxUsd`,
`coach.watchMaxCalls`). An entry with a `costNote` spends money: show the note,
never preselect it, and ask for a confirm before posting it. **There is no Claude
player**: the games are recorded by `mtgtable.RecordMatch`, whose seats are Forge
AIs (plain or search), and the LLM seat (D418, D419) is a client of the live
socket, not a RecordMatch player. `llm:opus` (about five times Sonnet's price,
past the $1 cap in one draft), `llm:fake` and `human-picks:<file>` are the CLI's
only.

| Route | Answer |
|---|---|
| `POST /watch` `{"cube", "seed"?, "games"?, "drafterA"?, "drafterB"?, "playerA"?, "playerB"?, "pace"?, "cubeDoc"?}` (600 KB) | `202 {"ok": true, "id", "seed", "state": "/watch/<id>", "game": "/watch/<id>/game/<n>"}`, `match.json` (and with a `cubeDoc`, `cube.md`) already written — `409 {"code": "busy", "running": "<id>"}` while another watch runs (one at a time); `400` a bad body: unknown fields, an id not in `/health`'s lists (the message lists the known ones), two non-`lab` drafters, or a `cubeDoc` that is not a cube (the parser's words); `413` markdown over 256 KB, or a body over 600 KB; `503` the bridge is not built or `--no-watch` |
| `GET /watch` | `200 {"ok": true, "running": "<id>"|null, "watches": [{id, status, cube, seed, bestOf, players, wins, winner, updatedAt}]}`, newest first, at most 20 |
| `GET /watch/<id>` | `200 {"ok": true, "id", "running": bool, "match": <match.json>|null, "draft": <draft.json>|null}` — each null until written; `404` an unknown id |
| `GET /watch/<id>/game/<n>` | game `n`'s frame log, complete lines that passed the redaction check only (below); `404` until that game has started; `500 {"code": "redaction-failed"}` once it failed the check |
| `POST /watch/<id>/stop` | `200 {"ok": true, "id", "stopping": true}`; `409 {"code": "not-running"}`; then `match.status` becomes `"stopped"` |

The body:

- `cube` — a cube id, the file name under mtg-table's `cubes/` without `.md`
  (`fair-fight-cube-180`, `pauper-cube-180`, `peasant-cube-180`, `vintage-cube-180`,
  …; ForgeCoach's `src/cube/cubes.ts` `file` field). A path is a 400. Or, with
  `cubeDoc`, your own cube's id, `my-<slug>` (below).
- `cubeDoc` (D444) — `{"title": "...", "markdown": "..."}`, only beside a
  `my-<slug>` cube (*Your own cube*, below).
- `seed` — 1 … 799,999,999 (the lab's seed range); absent: random, and the
  answer says which. The same cube and seed draft the same picks and decks
  (D294); a second watch of them replaces the first's folder.
- `games` — the best of: 1, 3 (default), 5 or 7. It stops once a side has more
  than half.
- `drafterA`, `drafterB` — who drafts each side: an id from `watchDrafters`
  (`lab`, `forge-ranks`, `llm:haiku`, `llm:sonnet`), exactly. Default `lab`.
  **One side at most is not `lab`**: the lab measures a drafter against its own
  (D416, D439), so `forge-ranks` against `llm:sonnet` is a 400. `forge-ranks` is
  each card at Forge's raw draft score, no themes, committing after its first
  line; `llm:<model>` asks Claude once a pick (D439) and spends (below).
- `playerA`, `playerB` — who plays each drafter's deck: an id from
  `watchPlayers`, any case — a Forge AI profile (`Default`, `Cautious`,
  `Reckless`, `Experimental`) or `search-v2` (the live search seat: Default plus
  the outlet policy and the anytime search; the AI ladder's `search-v1-anytime`;
  the older `"search"` is the same). Default `Default`. A profile is a style,
  not a difficulty (D107): never label one harder.
- `pace` — milliseconds the recorder waits at a frame where something happened
  (a quarter of it after one that only moved the phase strip); 0 … 5000, default
  600. At 0 a game is over in seconds.

## Your own cube (D444)

A cube made in ForgeCoach's cube builder (`src/cube/custom.ts`, id `my-<slug>`)
is not in mtg-table's `cubes/`, so the body carries it:

```json
{ "cube": "my-izzet-tempo", "seed": 7,
  "cubeDoc": { "title": "Izzet Tempo", "markdown": "# Izzet Tempo\n\n## The list (name — tags)\n\n### Blue (40)\nOpt · …" } }
```

- `cube` is `my-` and then 1–60 lowercase letters, digits and dashes
  (`^my-[a-z0-9-]{1,60}$`). A `my-` cube without its `cubeDoc` is a 400, and so is a
  `cubeDoc` beside a cube from `cubes/` (it never stands in for one).
- `title`: 1–80 characters of one line (white space collapsed).
- `markdown`: the cube document, as `cubeMarkdown` writes it — the shape the
  cube lab's parser reads (`tools/cubelab/cube.ts`, the same format as
  ForgeCoach's `parseCube.ts`): `## The list…`, then `### Section (n)` headings
  with ` · `-separated names. At most 256 KB in UTF-8, else `413`. It is read
  with the lab's own parser, the one the watch drafts from; fewer than 9
  different cards (a grid draft deals grids of nine) is a `400` whose message
  carries the parser's words — `the cube document lists 0 different cards; a grid
  draft needs at least 9 (the cube parser: no "## The list" section with "###
  Section (N)" headings found)`. At most 2,000 different names, each at most 150
  characters (the draft room's limits). A `## Not in Forge` section, or any card
  the engine has no script for, is drafted without it, as for every cube (the
  lab logs which).
- The helper writes the document to `var/spectate/watch-my-<slug>-<seed>/cube.md`
  **before** it answers `202`, with its first `# ` heading set to `title` (added on
  top when it has none; a document whose heading already is the title is kept
  byte for byte), and that file is the watch's cube: `match.cube` is
  `{"title": "<title>", "file": "var/spectate/watch-my-…/cube.md"}`, and
  `draft.cube.sha256` is that file's.
- **No ratings:** a cube in `cubes/` may have a `.ratings.tsv` beside it; yours
  has none, so the lab drafter rates every card at Forge's draft ranks (the
  lab's default when a cube has no ratings file), and there is no meta. The draft
  is still the lab's drafters and builders; it is just less tuned to the cube.
- Everything else is as for any cube: the id is `watch-<cube>-<seed>`, the
  same cube and seed replace the folder, and the games are served only after the
  redaction check.

## Spending: an `llm:` drafter (D442, D443)

An `llm:` drafter asks Claude through the helper machine's logged-in Claude Code
CLI, one call a pick (18 a draft; a reply it cannot read is asked once more).
Three rules hold it, for the whole watch:

- **The cap**: at most `watchLlmCap.maxUsd` dollars at list price (the CLI's own
  cost figure; on a subscription login, what the API would charge) and
  `maxCalls` calls. A call that would pass either is not made — the dollar check
  projects the next call at the mean so far — and the watch ends.
- **The fallback stop**: a pick whose two replies both failed (a logged-out
  CLI, an error, a reply it cannot read) takes the lab drafter's line and counts
  a fallback. Once more than `maxFallbackRate` (25%) of its picks so far fell
  back, counted over at least 8 picks, the watch ends — a logged-out CLI ends it
  after three picks. It never goes on as a lab draft under an `llm:` name.
- **The record**: `match.cost` is what it really spent (below), current while it
  drafts, written when it stops.

When either ends the watch, `match.status` is `"error"` and `match.error` says
which drafter stopped it and why, in words, with the counts:
`drafter B (llm:sonnet) stopped the watch -- the fallback stop: 3 of 3
decision(s) fell back to the lab drafter's line (more than 25% of at least 8); 6
of 6 call(s) failed -- is the Claude Code CLI logged in? (…)`, or
`… -- the spend cap: $0.97 spent of at most $1.00 at list price, and the next
call (about $0.017 each) would pass it (…)`. No game is played. A stop of the
watch (`POST /watch/<id>/stop`) kills the calls in flight too.

## The lifecycle

1. `POST /watch` → 202 with the `id` (`watch-<cube>-<seed>`). `match.json` is
   already there, `"drafting"`, naming the cube, the seed, the players, the
   drafters and `startedAt`, so a watch killed at any moment still says what it
   was. Poll `GET /watch/<id>` every 1–2 s from here on.
2. `match.status` is `"drafting"`. The engine boots to look the cube's cards up
   and to make Forge's fallback decks; **`draft` arrives in about 5–10 s** with
   the lab's drafters and Forge's ranks, **about two minutes** with an `llm:`
   drafter (18 calls of about 6 s; `match.cost` moves meanwhile). Start the
   draft replay as soon as it does.
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
- `value` is the lab drafter's own number for the line taken (`pick.ts`'s set
  value: card ratings plus colour, curve and theme fit), whoever chose it: for
  a `forge-ranks` or `llm:` side it is still the lab's view of that line. It is
  a score to show as "how much the lab liked this", not a probability.
- `drafters.A` / `drafters.B` are the `watchDrafters` ids that drafted
  (`lab`, `forge-ranks`, `llm:haiku`, `llm:sonnet`).
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
  "drafters": { "A": { "drafter": "lab" }, "B": { "drafter": "llm:sonnet" } },
  "cost": { "side": "B", "drafter": "llm:sonnet", "caps": { "maxCalls": 40, "maxUsd": 1, "maxFallbackRate": 0.25 },
            "calls": 18, "callErrors": 0, "decisions": 18, "retries": 0, "fallbacks": 0,
            "tokensIn": 36, "cacheRead": 0, "cacheCreate": 57935, "tokensOut": 6610, "usd": 0.2979,
            "stopped": null, "why": null },
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
- `drafters.X.drafter` is the `watchDrafters` id that drafted side X (the same
  in `draft.json`'s `drafters`).
- `cost` is null unless a side drafts with an `llm:` drafter. Then: which side,
  the caps the watch ran under, `calls` (retries included), `callErrors` (calls
  that failed), `decisions` (picks asked), `retries`, `fallbacks` (picks that
  took the lab drafter's line), the tokens (`tokensIn` plain, `cacheRead`,
  `cacheCreate`, `tokensOut`), `usd` (dollars at list price, the CLI's own
  figure), and `stopped` (`max-usd`, `max-calls`, `fallbacks`, `aborted` for a
  stop of the watch, or null) with `why` in words. It moves while the draft
  runs and is final once `draft` is written or the watch has stopped.
- `games[]`: `winner` `A | B | draw`, Forge's `reason`, `turns` (player turns),
  `startedMs` / `endedMs` from the watch's start, `seed` the game's own (the
  watch's seed × 10 + n). Who goes first is Forge's coin toss each game.
- `wins` counts finished games; `winner` is set once a side has `need` wins, or
  every game is played (the side ahead, or `draw`).

## The lobby button

A tile **Watch two bots** (shown when `/health` has `"watch": 1`):

1. A small form: the cube (ForgeCoach's cube list, which `GET /health` does not
   check — a cube mtg-table does not have is a 400 naming the ones it has), who
   drafts each side (`watchDrafters`; `lab` preselected on both, one side at most
   something else) and who plays it (`watchPlayers`), best of 1 / 3 / 5, an
   optional seed. **Watch** posts `/watch`; with an `llm:` drafter chosen, show
   its `costNote` and ask for a confirm first, and never preselect one.
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
