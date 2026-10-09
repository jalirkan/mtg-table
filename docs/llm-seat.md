# The LLM seat — Claude plays a seat against Forge (D418)

`tools/llm-seat/` lets a Claude model (Sonnet, through the Claude Code CLI you are
logged in to) play the human seat of a game against the Forge AI, so we can
measure one thing: **does one long chat degrade?** Every model decision is made
under one of three *context arms*, and every decision is logged so the arms can
be compared on win rate and, much more precisely, on the engine's grade of the
same recorded positions.

Nothing here runs a model unless you say `--model sonnet` (or `opus`/`haiku`).
The default is `--model fake`: deterministic, free, and what every test and dry
run uses.

## Files

| file | what it is |
|---|---|
| `tools/llm-seat/seat.mjs` | the seat: one game on the bridge's `/ws`, a decision log, a game summary, the client's frame log |
| `tools/llm-seat/run-match.mjs` | games against Forge: a fixed deck pair at fixed seeds, mirrored, once per arm; starts one bridge per game |
| `tools/llm-seat/replay.mjs` | the positions mode: a recorded game's positions posed to every arm, and the coach-grade moments to grade them; `join` pairs the grades |
| `tools/llm-seat/lib/decision.mjs` | one decision as numbered engine options, the moves each makes, the default, and whether the model is asked |
| `tools/llm-seat/lib/history.mjs`, `prompt.mjs` | the game log as text, the state table, the card text, the three kinds of message |
| `tools/llm-seat/lib/arms.mjs`, `model.mjs` | the context arms; the fake model and the `claude -p` model |
| `tools/llm-seat/lib/stops.mjs` | Forge's phase stops: the defaults and the `setPhaseStop` acts |
| `tools/llm-seat/lib/reply.mjs` | the strict reply parser |
| `tools/llm-seat/test/*.test.mjs` | `node --test tools/llm-seat/test/*.test.mjs` (about a second; a fake bridge, no engine, no model) |

## On the PC

1. `claude` on PATH and logged in (`claude` once in a terminal). The calls are the
   coach helper's (D292): every tool off (`--tools ""`), no MCP
   (`--strict-mcp-config`), `--permission-mode dontAsk`, `--max-turns 1`,
   `--safe-mode` / `--disable-slash-commands` when the CLI has them, the user text
   on stdin, in a working directory of the run's own
   (`var/llm-seat/<run>/claude-cwd/`, because Claude Code keys its sessions by
   directory). Output is `--output-format json`, which carries the usage
   (input, cache-creation, cache-read, output tokens) and the session id.
2. **Model and effort.** `--model sonnet`. `--thinking low` is the default
   (coach-helper's D346 mapping: `MAX_THINKING_TOKENS=1024
   CLAUDE_CODE_EFFORT_LEVEL=low` in the child's environment); `--thinking
   default` is the CLI as it is, `off` the least Sonnet allows. Keep one
   setting for every arm of a comparison.
3. The bridge built (`./bridge/build.sh`) and the card library's index for the
   oracle text (`node tools/card-library/build.ts`, which writes
   `var/cards/cards.sqlite`; the seat reads it by default). Without it the cards
   read "(no oracle text available)" — names, types, P/T and keywords are still
   on the wire.

### (a) The pilot: 2 games against Forge Default

```bash
node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck \
     --seeds 1 --mirror --context fresh --model sonnet --run pilot-1
```

One seed, both seatings (the decks swapped), the `fresh` arm. The AI is
`--ai-profile Default --ai-policy plain` (Forge's own AI, no search). Check
`var/llm-seat/pilot-1/games.jsonl` (result, turns, model calls, fallbacks,
tokens, time) and `decisions.jsonl` (every decision: `how` is `auto`, `model`
or `fallback`). A `--dry-run` prints the bridge commands and starts nothing.

### (b) The arm comparison

```bash
node tools/llm-seat/run-match.mjs --pairs tools/ai-bench/pairs-dev.txt --pair 0 --seeds 1-10 --mirror \
     --context fresh,session:10,game --model sonnet --run arms-1
```

20 games an arm (10 seeds, mirrored), the arms one after another. **Win rate
will not separate the arms**: 20 games give about ±22 points. The games are for
the decision logs and for (c).

### (c) The replay grading (the paired comparison)

For each game of (b) (or any human-seat log), pose every recorded position to
every arm, then let the engine grade every answer:

```bash
node tools/llm-seat/replay.mjs --replay var/games/llm-arms-1-001/frames.jsonl \
     --arms fresh,session:10,game --model sonnet --run replay-001 --opp-deck decks/doom-legion.dck
./tools/coach-grade.sh batch --moments var/llm-seat/replay-001/moments.jsonl \
     --out var/llm-seat/replay-001/graded.jsonl --jobs 7
node tools/llm-seat/replay.mjs join --choices var/llm-seat/replay-001/choices.jsonl \
     --graded var/llm-seat/replay-001/graded.jsonl
```

`join` prints each arm's mean regret (win-rate points lost against the best
option, coach-grade's D334 yardstick: "best against Forge Default, played on by
Forge Default") with a 95% interval, and the **paired** difference of every two
arms over the positions both answered — the number the experiment is about.

## What the seat does at each frame

**When the model is asked** (Justin's "common sense" rule; each part switchable
and logged):

- Every engine question goes to the model — targets, choices, a confirm, an
  ability menu, the mulligan and play/draw, the attack and block declarations, a
  selection the engine asks for — **except one with exactly one legal answer**,
  which is answered with no call (`how: "auto"`, with the reason).
- **Priority with nothing playable is passed with no call.** Playable is the
  engine's own list, `state.playable` (amendment M61: each card outside the
  battlefield Forge would play on a click now), plus every permanent of yours
  whose oracle text has a non-mana activated ability (`--no-battlefield-abilities`
  turns that off; the wire has no list for the battlefield, §3.2). On an engine
  older than M61 the seat's hand is offered instead (everything at its own main
  phase with an empty stack, else Instants and FLASH cards) and Forge refuses
  what it will not take.
- Mana payment is the engine's own Auto (`buttonOk`), never a call.
- Not asked, and answered with the bridge's own default (written in each
  record): `order`, `assign_damage` (null: Forge assigns), `assign_amount`,
  `manipulate_list`, `sideboard`, `text`. A reveal is acknowledged.

**The options** are the engine's: `state.playable` at priority, an ask's own
options, `input.selectable` for a selection. Two lists are not on the wire and
are read off the board: the attack candidates (your untapped creatures without
summoning sickness, or with haste) and the block pairs (your untapped creatures
× the attackers in `state.combat`), because Forge's attack and block inputs never
name selectables (§4.1, M8). The engine still judges: a click it refuses is a
`notice`, and the seat then plays the default on the same input, then OK /
Cancel / pass, so a refused click never loops (`refused` in the game summary).
An attack is its clicks then OK, sent one per settled input and dropped as soon
as the engine's prompt is no longer the attack; a block is attacker-then-blocker
clicks per pair, then OK.

**Echoes.** After every move the bridge sends a burst within a few ms — Forge's
echo of the old prompt (`awaitNextInput`), the new state, the new prompt (in
`fixtures/games/human-comfort-13.jsonl` the old prompt is the first frame after
164 of 186 moves). So the seat decides only once the stream has been quiet for
120 ms (every frame restarts that clock), never twice on the same prompt and
state unless the engine refused the move or 6 s passed, and reads a `Priority:`
prompt as a question only while the state gives it priority.

**The reply** is strict: `choice: 3` (or `choice: 2, 5` where several may be
chosen, `choice: none` where nothing may be) and an optional `next: opp
END_OF_TURN, own MAIN1`. Any other line, a number out of range, a forbidden
combination, or an unknown phase is malformed: the seat says why and asks once
more (inside the same session for a session arm), then plays the default — pass,
no attack, no blocks, keep, the ask's own default — and counts a `fallback`. The
next message starts with a note saying so.

**Phase stops** (amendments M32/M33). After every model decision the seat sets
the seat's own Forge stops to a minimal default set plus whatever the reply's
`next:` named, so Forge itself skips the phases with nothing to decide:

- own `MAIN1` and `MAIN2`, always;
- opponent's `COMBAT_DECLARE_BLOCKERS` while you control a creature;
- opponent's `END_OF_TURN` while you have an untapped land and an instant-speed
  option (an Instant or a FLASH card in hand, or a permanent with a non-mana
  activated ability).

A reply with no `next:` line goes back to the defaults; `--no-stops` leaves
Forge's stops alone. Each `setPhaseStop` is an act on the wire and in the
client's frame log.

### Verified: what the stops do NOT gate

**An opponent's spell on the stack reaches the seat whatever its phase stops
say.** Forge's priority loop asks the GUI only through
`PlayerControllerHuman.chooseSpellAbilityToPlay()`, whose pass-without-asking is
`nowMayAutoPass = mayAutoPass() || skipsPromptForStackOrPhase()`
(`PlayerControllerHuman.java:1677-1679`), and `skipsPromptForStackOrPhase()`
(`:3804-3812`) consults the phase stop (`isUiSetToSkipPhase`) **only when the
stack is empty**; with something on the stack it skips only when the top item
is an ability this seat auto-yielded (`shouldAutoYield(top.getKey())`). (Forge
line numbers as quoted in `docs/research/11-engine-comfort-features.md:190-201`,
read from Forge's source by that report; not re-read here.) The bridge adds no
stack logic of its own: `WireGuiGame.isUiSetToSkipPhase`
(`bridge/src/mtgtable/WireGuiGame.java:2282-2289`) answers from the seat's stop
map and nothing else. The recordings agree: `fixtures/games/human-auto-42.jsonl`
line 134 (input seq 111) is `Priority: Human | Turn: 2 (Forge AI) | Phase: Main
phase, postcombat | Stack: 1 to Resolve.` while the seat's opponent-turn stops
were `COMBAT_BEGIN COMBAT_DECLARE_ATTACKERS COMBAT_DECLARE_BLOCKERS END_OF_TURN`
(no `MAIN2`), with the AI's spell on top — and there are **134** such prompts
(priority, a non-empty stack, a phase that was not a stop) across
`human-auto-42` (36), `human-comfort-13` (26), `human-sideboard-7` (41) and
`human-yield-13` (31).

Three things can still hide an opponent's spell, and the seat uses none of them:
a pass-to (`mayAutoPass()`: `act: yieldTo`), an auto-yield on the top item
(`act: setYield`) — the seat never sends either — and the seat's own auto-pass
rule, which passes without a call when it has nothing it could respond with.
That last one is by design: the model is asked when it can act, and sees what
happened in the game log of its next message.

**The attack declaration is not gated by a stop either**: the same four
recordings hold 193 `Select creatures to attack` inputs while the seat's own
`COMBAT_DECLARE_ATTACKERS` was not a stop. The block declaration has no
recorded case without the opponent's `COMBAT_DECLARE_BLOCKERS` stop, so the
default set keeps that stop whenever the seat has a creature.

**Time.** An ask never times out on a connected `ws` seat
(`WsTransport.askTimeoutMs`, `bridge/src/mtgtable/WsTransport.java:1152-1153`:
0 while a client is connected) and an input has no deadline at all
(`bridge/src/mtgtable/MtgTable.java:120-124`, D286), so a slow model call cannot lose a decision to a
timer. The seat's own `--timeout` (2 h) caps a game, `--model-timeout` (180 s) a
call; a call that fails is a fallback, never a retry storm.

## The context arms

| arm | what each call carries |
|---|---|
| `fresh` | a new `claude -p` (`--no-session-persistence`): the game log since the start, the state table, the card text of every visible card, the decision |
| `session:N` | one CLI session (`--session-id <uuid>`, then `--resume <id>`): its first message is a `fresh` one; every later message carries only what happened since the last decision, the state table, the card text of cards not yet shown in the session, and the decision. After N calls the session is dropped and the next call starts a new one with the whole history re-supplied |
| `game` | `session:∞`: one session for the whole game |

The system prompt is the same for every arm, and so is the decision block — the
arms differ only in how the context is carried (the golden test checks both).
The game log is the redacted event stream as compact text (`T5 (you): you land
Island [35]; opp cast …; opp attack: …; you life 20->17;`), built from s2c frames
only: an id the seat was never shown is "a hidden card". Card text is the oracle
text without reminder text (`--oracle FILE`: a Scryfall card-object JSONL such
as `fixtures/cards/oracle-cards.slice.jsonl`, or the card library's
`.sqlite`; default `var/cards/cards.sqlite`).

## Logs

`var/llm-seat/<run>/decisions.jsonl` — one line per decision: `game`, `seat`,
`decision` (its number in the run), `stateSeq` (the `seq` of the state frame it
was posed on), `frameSeq` (the input's or ask's), `turn`, `phase`, `kind`,
`prompt`, `options` (labels), `how` (`auto` | `model` | `fallback`) with
`reason`, `chosen` (option numbers) and `chosenLabels`, `token` (coach-grade's
spelling), `next`, `arm`, `sessionPos` (calls since the session began; 0 for
`fresh`), `fullContext`, `retries`, `stale` (the engine moved on while the
model thought), and `calls`: per call `promptBytes`, `systemBytes`,
`replyBytes`, `usage` (`input`, `cacheCreate`, `cacheRead`, `output`),
`costUsd`, `ms`, `reply`, `error`.

`var/llm-seat/<run>/games.jsonl` — one line per game: `result` (`win` / `loss` /
`draw` / `unfinished`), `reason`, `turns`, `rounds`, `ms`, `decisions`, `auto`,
`modelDecisions`, `fallbacks`, `retries`, `refused`, `stale`, `modelCalls`,
`sessionResets`, `promptBytes`, `tokensIn`, `tokensOut`, `cacheRead`,
`cacheCreate`, `costUsd`, `modelMs`, and the `match` (deck, AI deck, seed,
mirrored) when `run-match.mjs` ran it.

`var/llm-seat/<run>/frames/<gameId>.jsonl` — the client's frame log
(`recordedBy: "client"`, §8.1). Grade from the **bridge's** log,
`var/games/<gameId>/frames.jsonl`: its header names the seat's deck, which
coach-grade reads.

## The positions mode, in detail

`replay.mjs --replay <frames.jsonl>` walks the recorded game and takes every
decision the seat made that the live seat would have put to the model, with the
prompt snapshot as it stood then (the same `classify` and the same message
builder the live seat uses) and the move actually made, as option numbers. A
recorded seat that tried a card, was refused and tried another is one position,
not several. Then, for each arm:

- `fresh`: one call per position, the full context.
- a session arm, `--history chain` (default): one real CLI session walked
  through the positions in order; the model answers each, and the next message
  begins with the move the game actually made when it differed ("the game
  continued from that"), so the session's context follows the real game; the
  session restarts every N positions with the history re-supplied. One call per
  (position, arm), as live.
- a session arm, `--history transcript`: one fresh call per (position, arm),
  whose single message holds the session as it would have been — the full
  context at the session's start, then each earlier position's decision and the
  move made, then this position's delta. Independent calls; the earlier turns are
  text inside one message rather than turns of a conversation.

Writing earlier turns as real assistant turns would mean writing Claude Code's
session files ourselves (`~/.claude/projects/…/<id>.jsonl`, an internal format),
so it is not done; `chain` is the faithful version, `transcript` the cheap one.

Output: `choices.jsonl` (one line per position and arm: `chosen`, labels,
`token`, `actual`, `actualToken`, `how`, `sessionPos`, `promptBytes`, the calls),
`moments.jsonl` (one coach-grade moment per gradeable position) and
`summary.json` (prompt sizes per arm, agreement with the recorded move).

**How it feeds the engine grader.** coach-grade's `batch` (D334) grades a
moment `{log, frame, mode, type}` — `frame` the index (line 0 excluded) of the
seat's c2s line that answered the decision, `mode: "live"` reading the last
`state` and `input` before it, exactly as the review plans its moments
(`Review.fromActs`, D353) — and plays every legal option of four types out with
Forge Default on both seats: `spell` (priority in the seat's own main phase with
an empty stack: `pass`, `cast:<id>`, `land:<id>` when `lands: true`), `attack`
(`attack:none` / `attack:<ids>`), `block` (`block:none` / `block:<b>><a>,…`) and
`target` (`target:<id>`). Each moment carries every arm's token and the recorded
one in `extra`, so all of them are graded even when the grader shortlists, and
`played` is the recorded move. Knowledge: `--deck` / `--opp-deck` go into the
moments (the bridge's log already names the seat's deck); without `--opp-deck`
the grader uses its own default knowledge.

**What the grader does not cover, and would need:** positions of other kinds —
priority outside the seat's own main phase or with a non-empty stack (an
instant in response, a flash creature at end of turn), activating a permanent's
ability, the mulligan and play/draw, and every ask (`choose_list`,
`choose_entities`, `confirm`, `ability_menu`) — get no grade. They are in
`choices.jsonl` with `gradeType: null`; the comparison rests on the four graded
types (on the fixture below, 56 of 117 positions). Grading them would need new
option kinds in `Grader` (a `respond:<id>` at any priority, an `ability:<card>:<n>`,
`keep` / `mull`, and an ask answered by index), each with its rebuild in
`Rebuild` — the D417 search already plays the opening hand and its own targets,
which is the nearest code.

## Prompt sizes and tokens

Measured with the dry run on `fixtures/games/human-auto-42.jsonl` (22 turns,
11 of the seat's; `fixtures/cards/oracle-cards.slice.jsonl` as the oracle,
which covers every card of that game but its tokens), every arm on the fake
model:

```bash
node tools/llm-seat/replay.mjs --replay fixtures/games/human-auto-42.jsonl \
     --arms fresh,session:5,session:10,game --oracle fixtures/cards/oracle-cards.slice.jsonl \
     --run dry-42 --save-prompts
```

117 positions (104 of them under the seat's default stops; the recorded seat
played on Forge's default stops, so a live game asks a little less). System
prompt: 1,491 bytes.

| arm | new bytes / call (mean) | bytes the model reads / call (mean, max) | per game: bytes read | ≈ tokens read per game |
|---|---|---|---|---|
| `fresh` | 4,891 | 6,394 (10,282) | 0.75 MB | ~190k |
| `session:5` | 2,820 | 10,798 (20,304) | 1.26 MB | ~320k |
| `session:10` | 2,543 | 16,131 (33,515) | 1.89 MB | ~470k |
| `game` | 2,288 | 120,000 (270,583) | 14.0 MB | ~3.5M |

How: "new bytes" is the user message of each call; "bytes read" is what the
model reads at that call — the system prompt plus every message and reply so
far in its session (a reply counted as 12 bytes, thinking not counted).
Tokens ≈ bytes / 4 (this text is English with ids and costs; read it as ±15%,
bytes/4.5 to bytes/3.5). Two smaller fixtures give the same shape:
`human-auto-7` (13 turns, 82 positions): fresh ~110k, session:10 ~260k, game
~1.4M tokens read; `human-comfort-13` (15 turns, 57 positions): ~80k, ~200k,
~0.8M.

`--history transcript` (replay only) puts the session in one message: for
`session:10` that is 8.4 KB a call on average, ~245k tokens a game, none of it
cached between calls.

So a game costs about **60–120 model calls**. `fresh` reads the fewest tokens
because nothing accumulates; a session re-reads its whole conversation every
call, so the `game` arm reads ~20× more — but nearly all of it from the prompt
cache (`cacheRead` in the usage), which Claude Code uses on `--resume`; its
largest call is ~70k tokens, inside the context window. Not in the estimate:
Claude Code's own per-call overhead and the thinking tokens (`--thinking low`
caps the budget at 1,024); the pilot's `usage` numbers are the real ones — read
`games.jsonl`'s `tokensIn`, `cacheRead`, `cacheCreate` and `tokensOut` after
(a) before planning (b). At about 10–30 s a call, a game is roughly 20–60
minutes of model time.

## Not built, and why

- **Asks the model is not shown** (`order`, `assign_damage`, `assign_amount`,
  `manipulate_list`, `sideboard`, `text`): answered with the bridge's default.
  They are rare in these decks (the corpus census: `order` 4, `assign_damage` 3,
  `text` 6 in 22 recordings) and each needs its own reply grammar.
- **Planeswalkers and battles as attack targets**: the attack clicks attack the
  engine's current defender (the player). Choosing another defender is a
  `clickCard` on it first; not offered.
- **Grading beyond the four types**: above.
- **A real-engine run**: this session has no Forge jar, so the seat was run
  end to end only against `test/fake-bridge.mjs` (a scripted engine over a real
  socket) and on the recorded fixtures. The pilot is the first run on the
  engine; read its `decisions.jsonl` for `refused` and `stale` lines before (b).
