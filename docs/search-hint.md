# The search hint — `POST /hint` on the coach helper (D429)

"When I'm playing, can I see what Search AI would recommend that I do?" On a
button press — or, when ForgeCoach's coach selector is on Search AI (its
default), once per decision by itself — the engine on the player's PC plays the
decision in front of them out for a few seconds and says which option it
would take and how sure it is: "Attack with both — clearly best", or "Cast
Shock, or cast nothing now — too close to call". It is the post-game review's
**triage** (`docs/game-review.md`) for one moment of a game still in play,
with the same hidden-information rule. ForgeCoach's `src/searchHint.ts` is
built against exactly this file. Decision **D429**; the pick's line of
sub-choices (what to target, sacrifice, equip …) is **D454**.

## What it runs

The live analysis of D336, unchanged: `tools/coach-grade.sh serve` — one booted
engine answering one JSON request per line — grading the moment with
`CoachGrade.liveSettings`: a wall-clock budget (`budgetMs`, default 3000, at
least two rounds), playouts to the end of this turn scored by the leaf
evaluator (`"measure": "leaf"`, a short-horizon estimate on the fitted leaf
scale, D349 — never a win rate), racing from round 4, every option on the same
round seeds (paired, D334). The rollouts are the search AI's own
(`SearchPolicy.playout`: its copier, determinizer and forced first answer), so
the hint and a search decision mean the same thing.

- **Which decision**: `"type": "auto"` — `Review.liveType`, the review's own
  rule (`Review.kindOf`) applied to the latest state and input of the log so
  far: the attack prompt (`attack`), the block prompt (`block`), a target
  prompt (`target`), a priority prompt in the viewer's own main phase with an
  empty stack (`spell`). Anything else is `"status": "unsupported"`.
  ForgeCoach shows the button only where `hintKindOf` (the same rule in
  TypeScript) says one of the four is open.
- **The land drop**: in a `spell` decision with the land drop open, every
  option plays Forge's choice of land first (D334); the answer carries its id as
  `landFirst` and ForgeCoach says "Play Forest first, then: …".
- **The engine** starts on the first hint (about 10 s: Forge's boot and the
  first rebuild), under `nice -n 10`, with a Forge home of its own
  (`var/coach-grade/hint-home`), and stops after 20 minutes without one. The
  bridge is a separate process at normal priority and the seat is parked on
  the player while they think, so the game is never slowed: the probe measured
  the bridge's own `GET /health` at 22 ms or less during every hint.

## What it knows (D348, as the review)

- **The moment is the bridge's own log of that game**, never frames a request
  sends: `var/games/<gameId>/frames.jsonl`, the seat's redacted view (hard rule
  8), whose session header names the player's own deck. The request says
  which moment by the `seq` of the state (and input) the board shows; the
  helper copies the log's complete lines to `var/coach-grade/hint/moment.jsonl`
  and grades everything before its end (`liveMoment`). A log already past that
  state or input is refused `409 moved-on`; one that has not reached it yet is
  waited for (2 s), then `409 not-yet`.
- **The opponent's hidden cards** are never the real ones: there is no field
  for the AI's deck (an unknown field is refused, and the refusal says so);
  `oppPool` (the cube list, at least 80 cards) and `oppKnown` (the AI picks the
  player saw, at most 60) are checked by the review's own validator and written
  to files; `HiddenPool.checkLive` runs on every request (pool mode: the cube
  list minus the player's deck, drafted pool and every public card). With no
  pool the opponent's hidden cards are basic lands, and the answer's
  `knowledge.opponentModel` says `basic-lands` — ForgeCoach's caveat then
  says "hidden cards as lands".
- **A game between two people** (`friend-…`, D402/D407) is refused on this
  door (403): a seat's log there holds that player's hand, and this door is the
  host's. Each seat asks through the draft room instead — *At a table of two*,
  below (D453).

## `POST /hint`

Only when `/health` says `"hint": 1` (the bridge is built: the helper finds
`bridge/out/mtgtable/grade/`; `--no-hint` turns it off). `/health` also carries
`"hintEngine": "idle"|"starting"|"ready"` and `"hintBudgetMs": {"default":
3000, "min": 1500, "max": 6000}`. The helper's own gate (Origin, LAN token),
exactly as `/coach` and `/review`.

```json
{"gameId": "human-ws-7", "seat": 0, "stateSeq": 1004, "inputSeq": 1008,
 "oppPool": [[1, "Lightning Bolt"], …], "oppKnown": ["Shock"], "budgetMs": 3000}
```

`gameId` names `var/games/<gameId>/frames.jsonl` (the review's pattern; `.gz`
when there is no plain file); `seat` is checked against the log header;
`stateSeq` (required) and `inputSeq` are the frames the board shows.
Answer, **200** (seed 42's turn-12 block from the probe below, numbers rounded, a third option left out):

```json
{"ok": true, "v": 1, "kind": "search-hint", "gameId": "hint-probe-42", "seat": 0,
 "stateSeq": 824, "inputSeq": 828, "frame": 967, "status": "ok",
 "type": "block", "turn": 12, "phase": "COMBAT_DECLARE_BLOCKERS",
 "budgetMs": 3000, "ms": 2425, "wallMs": 2480, "measure": "leaf", "rounds": 6, "playouts": 16,
 "pick": "block:none", "strength": "clear", "forgeChoice": "block:none",
 "options": [
   {"token": "block:none", "label": "no blocks", "forge": true, "n": 6, "winRate": 0.495,
    "winLo": 0.474, "winHi": 0.516, "regret": 0, "regretLo": 0, "regretHi": 0, "verdict": "best"},
   {"token": "block:90>78", "label": "block Soldier Token #90 > Crossbones, Malicious Mercenary #78", "forge": false,
    "n": 6, "winRate": 0.458, "winLo": 0.437, "winHi": 0.479, "regret": 0.037, "regretLo": 0.016, "regretHi": 0.058,
    "verdict": "worse"}, …],
 "knowledge": {"opponent": "unknown", "opponentModel": "basic-lands", "ownDeck": "deck:decks/pacho-shield.dck"}}
```

| Field | Meaning |
|---|---|
| `status` | `ok` (graded), `trivial` (one legal option: `pick` is it, `strength: "only"`), `unsupported` (`message` says why: no gradable decision is open, the rebuild could not be graded, or no option finished a playout) |
| `type` | `spell` · `attack` · `block` · `target` (the review's tokens) |
| `options[]` | the grader's table (D336's fields), the best first, then by verdict and estimate; `same` lists other tokens that are the same choice (another copy of a card) |
| `options[].verdict` | the review's vocabulary, never stronger than the interval: `best`; `tie` (not the best, regret under 0.005 — ForgeCoach's `TIE_REGRET`); `close` (its regret interval includes zero: not a worse choice by this look); `worse` (the interval excludes zero); `not-graded` (no playout finished) |
| `pick` | the best option's token |
| `strength` | `clear` only when every other graded option is `worse`; else `close`; `only` for a single option |
| `runnerUp` | with `close`: the best of the ties and close calls (a tie first) |
| `landFirst` | the land played first in every option (a `spell` decision with the land drop open) |
| `forgeChoice` | what Forge's own AI would do here |
| `line` | D454: what Forge's AI answered inside the pick — `[{kind, text, ids}]`, below; `[]` when the move asks nothing more; absent when none was recorded or it was withheld |
| `lineStop`, `lineWithheld` | why the line ends (`passed`, `applied`, `turn`, `full`, `cut`); why a line was withheld (never a card name) |
| `measure` | `leaf` (to the end of this turn): a short-horizon estimate, never a win rate |
| `knowledge.opponentModel` | `pool` or `basic-lands` (never `deck`: there is no field for one) |
| `ms`, `wallMs` | the analysis's own time, and the request's (the engine's start included on the first) |

### The line (D454)

"Cast Quantum Reduction" does not say on what. The pick's `line` does: the
sub-decisions Forge's own AI answered inside that move, **reported as the
engine's default, never graded** (the grader chooses the top-level move only;
the target search stays off). The grader plays the pick once more on round 0's
seed and base — the same playout the race began with — and records, from its
forced answer until the seat hands priority back with the stack empty (an
attack or block: until that combat's damage), what the AI answered:

| `kind` | `text` | what it is |
|---|---|---|
| `target` | `Quantum Reduction → Peggy Carter, Secret Agent` | the spell's targets (every part of it) |
| `x` | `Fireball: X = 3` | the X it paid (only for a card you are shown by name) |
| `sacrifice` · `discard` · `exile` · `return` · `tap` | `sacrifice → Memnite` | what a cost took, or a resolution made it sacrifice or discard |
| `mode` | `Abrade mode → Destroy target artifact.` | a charm's chosen mode, in the card script's own words (only for a card you are shown by name: an unseen card's mode would say which card it is) |
| `choose` | `choose → Griselbrand` | a choice the resolution asked for |
| `number` | `number = 2` | a number it chose |
| `trigger` | `Memnite trigger → the opponent` | a trigger of the seat's and its targets |
| `then` | `then equip S.H.I.E.L.D. Spy Kit → Quake, Agent of S.H.I.E.L.D.` | what it played next before passing (`cast`, `activate`, `equip`, `play`), at most 3 |

At most 8 steps. `ids` are the wire ids of exactly the cards `text` names.
**A card is named only when the moment's state — the bridge's own redacted log
for this seat — shows it by name** (hard rule 8): anything else is "an unseen
card" (a hidden card, a face-down one without its face, a card the playout drew
or redealt, an opponent card dealt from the pool model, a card tutored from the
library), or "a token" for one the playout made. The helper checks every line
again before it leaves (`checkLine`: every id shown by name, the text one of the
shapes above with only "you", "the opponent", "an unseen card" and "a token"
besides those names; a `mode` or `x` step names exactly its own card); a step
that fails withholds the whole line (`lineWithheld`) and the hint still answers.
The analysis prints its answers in UTF-8 whatever the locale (`CoachGrade.main`;
under `LANG=C` Java would print "→" as "?"), and `bridge/build.sh` checks that
under `LC_ALL=C`.

Seed 42, turn 7's MAIN2 (`fixtures/games/human-auto-42.jsonl` cut there, the
real engine):

```json
{"status": "ok", "type": "spell", "turn": 7, "pick": "cast:5", "strength": "clear",
 "line": [{"kind": "target", "text": "Quantum Reduction → Peggy Carter, Secret Agent", "ids": [5, 44]}],
 "lineStop": "passed"}
```

Refusals are `{"ok": false, "type": "error", "message", "code"?}`: **400** a
body that is not this (`problems` lists every one), **403** a game between two
people (on this door; D453's room route below), or knowledge the live guard refuses (`"status": "refused"`), **404** no
such game, **405**, **409** `code: "moved-on" | "not-yet" | "superseded"`, **413**
over 256 KB, **429** hints for two other games already waiting, **503** off
(`--no-hint`, the bridge not built, or the engine could not start — its last
line says why), **504** no answer in `budgetMs` + 60 s (the engine is stopped
and starts again on the next hint), **500** the engine died mid-hint.

**One at a time; the newest wins.** One engine, one analysis at a time. A
newer request for the same game supersedes the older: a waiting one is
answered `409 superseded` at once, a running one when it ends (a grading
cannot be stopped mid-round; at most `budgetMs` plus a rebuild). Requests for
other games wait, two at most.

## At a table of two — `POST /room/<id>/hint` (D453)

A game between two people (a room's game, `friend-m<13 digits>`, D402/D404)
has the hint too, for **both** seats, each for its own decisions only. It is
asked on the draft room's listener (`roomPort`, 8644; `docs/draft-room.md`),
behind the seat's own `X-Room-Token` — loopback included — exactly like that
seat's review and log (D407), never on the coach helper's door, which still
refuses every `friend-…` game.

```json
{"stateSeq": 1004, "inputSeq": 1008, "budgetMs": 3000}
```

- **The seat is the token's seat; the game is the room's.** The room names
  the log itself: `var/games/friend-<matchId>-seat<N>/frames.jsonl`, the
  bridge's redacted view for that seat (D402's per-seat logs) — never the other
  seat's log and never a name the page sends. `gameId` and `seat` may be sent
  and are checked: a `gameId` other than `friend-<matchId>` or
  `friend-<matchId>-seat<N>` is **409 `code: "game"`** (the room is playing
  another game now), a `seat` other than the token's **403 `code: "seat"`**.
  No game being played (still drafting, between games, the game over) is **409
  `code: "no-game"`**.
- **The opponent is modelled from the room, not from the page.** `oppPool` and
  `oppKnown` are refused (400): the room sends the cube list minus this seat's
  own picks as the pool (one copy of each name; under 80 names, none — basic
  lands) and the other seat's picks as the cards drawn first. A grid draft is
  face up, so both are what this player saw; the other seat's deck is never
  read (the room holds it, and the hint has no field for it). The live guard
  (`HiddenPool.checkLive`) runs as on every hint.
- **Everything else is `/hint`'s.** The same runner, engine, queue and Forge
  home (`var/coach-grade/hint-home`); the same answer; `409 moved-on |
  not-yet | superseded`, `429`, `504`, `500` as above. The two seats are two
  games to the queue (each log its own key), so one seat's hint never
  supersedes the other's.
- **Off and limits.** The seat's state carries `"hint": 1` when the room's
  computer can answer (the helper has a hint runner and the bridge is built),
  else `0` — a friend's browser cannot read the helper's `/health` on
  `127.0.0.1:8643`, so this is the page's switch. A helper without the hint
  answers **503 `code: "off"`**; a helper from before D453 has no such route
  (404) and no `hint` key in the state, and ForgeCoach treats both as off. Per
  seat at most 30 hints a minute past a burst of 10, then **429 `code:
  "slow"`**; the body at most 1 KB (413).
- **No recording is needed.** The hint reads the seat's working log, which the
  bridge writes for every game (D402), and keeps nothing: its moment file is
  replaced by the next hint. A seat that opted out of recording (D407) still
  gets its hints.

## Measured (the real engine, `tools/hint-probe.mjs`)

This repo's 4-core cloud container, shared; the scripted seat
(`tools/ws-auto-play.mjs --hold-hook`) against Doom Legion, budget 3000 ms.
Seed 42: 22 live hints and 2 recorded ones (an attack and a block cut from
`fixtures/games/human-auto-42.jsonl`), every one 200:

- the first hint **10.1 s** (the engine's boot and the first rebuild); then a
  graded hint **2.3–3.3 s** (attacks 3.1–3.3 s, blocks 2.5–3.3 s, spells
  2.3–3.1 s), a `trivial` one about 0.1 s; a `target` with many legal targets
  **6–8 s** (each target is its own rebuild: one 14-target moment took 8.4 s);
- the bridge's `GET /health` at 17 ms or less during every hint;
- examples: turn 12's block "no blocks" **clear** (blocking Crossbones with a
  Soldier Token `worse`); turn 5's MAIN2 "cast Quantum Reduction" **clear**
  (pass `worse`); turn 11's attack "both" **close**, the runner-up "Quake
  alone" a tie (0.671 vs 0.668); several main phases "cast nothing now"
  **close** with a cast tied — a three-second look to the end of the turn often
  cannot tell two quiet plays apart, and says so; three `target` moments
  `unsupported` ("no option finished a playout").

Seeds 7 and 13 the same (9 and 10 hints; no attack prompt in either game).
Every run: the bridge's log passes `tools/check-redaction.mjs`; every moment the
analysis read is a prefix of that log; every answer's knowledge is `pool` when
the request carried the pool and `basic-lands` otherwise; and no card of the
bot's real deck the player had not yet seen (and that is not in the pool or
the player's own deck) appears anywhere in any answer (407 such checks at
seed 42).
