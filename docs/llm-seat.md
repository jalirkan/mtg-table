# The LLM seat — Claude plays a seat against Forge (D418, D419)

`tools/llm-seat/` lets a Claude model (Sonnet, through the Claude Code CLI you are
logged in to) play the human seat of a game against the Forge AI. It has two modes:

- **Plan mode** (`--mode plan`, the default, D419): the model plays the way a person
  uses an assistant. It is shown the game plainly, asked what to do this turn in
  plain words, and answers with a short plan of steps; the program carries the steps
  out on the engine and asks again only when something new needs an answer, or when
  a step cannot be done — then it says exactly why and asks for corrected steps.
- **Decision mode** (`--mode decision`, D418, the older one): one call per engine
  prompt, the engine's options as a numbered menu, a `choice:` reply. It was built to
  measure **does one long chat degrade?** under three *context arms*, with a
  positions mode for paired grading; everything below *Decision mode* is that.

Nothing here runs a model unless you say `--model sonnet` (or `opus`/`haiku`).
The default is `--model fake`: deterministic, free, and what every test and dry
run uses.

## Files

| file | what it is |
|---|---|
| `tools/llm-seat/seat.mjs` | the seat: one game on the bridge's `/ws` in either mode, a decision log, a game summary, the client's frame log |
| `tools/llm-seat/run-match.mjs` | games against Forge: a fixed deck pair at fixed seeds, mirrored, once per arm; starts one bridge per game; `--mode` |
| `tools/llm-seat/plan-dry.mjs` | plan mode's dry run: a recorded game walked through the plan-mode seat with the fake model; prints the prompts and the call count |
| `tools/llm-seat/lib/plan-core.mjs` | plan mode: when the model is asked, how a step becomes engine moves, corrections, the asker (arms) |
| `tools/llm-seat/lib/plan.mjs` | plan mode's strict reply parser and the name matcher |
| `tools/llm-seat/lib/plan-prompt.mjs` | plan mode's system prompt and the game in plain words |
| `tools/llm-seat/lib/mana.mjs` | what the untapped mana can pay, in words (a hint; the engine judges); optional costs the seat can pay |
| `tools/llm-seat/replay.mjs` | decision mode's positions mode: a recorded game's positions posed to every arm, and the coach-grade moments to grade them; `join` pairs the grades |
| `tools/llm-seat/lib/seat-core.mjs` | decision mode's core (plan mode's extends it): frames in, moves out, the loop guard |
| `tools/llm-seat/lib/decision.mjs` | one engine decision as numbered engine options, the moves each makes, the default, and whether the model is asked (both modes read the options from it) |
| `tools/llm-seat/lib/history.mjs`, `prompt.mjs` | the game log as text, the state table, the card text, decision mode's three kinds of message |
| `tools/llm-seat/lib/arms.mjs`, `model.mjs` | the context arms; the fake model and the `claude -p` model |
| `tools/llm-seat/lib/stops.mjs` | Forge's phase stops: the defaults and the `setPhaseStop` acts |
| `tools/llm-seat/lib/reply.mjs` | decision mode's strict reply parser |
| `tools/llm-seat/test/*.test.mjs` | `node --test tools/llm-seat/test/*.test.mjs` (about two seconds; a fake bridge, no engine, no model) |

## Plan mode (D419)

**Why.** The first real run (J119: two games against Forge Default, decision mode,
`fresh`) finished both games with no fallback, but took 150 and 110 model calls a
game, about 460k tokens a game, a third of first replies carried prose before the
`choice:` line, half the main-phase menus listed cards the seat could not afford,
and every call saw one micro-step, never the turn.

### What the model is told first: the system prompt

The reply format comes first, exactly, with a worked example and what happens to a
reply not in it (`lib/plan-prompt.mjs` `PLAN_SYSTEM`, 2,318 bytes):

```
REPLY FORMAT. Every reply you write must have exactly this shape:

PLAN: <one or two sentences, plain words>
STEPS:
1. <step>
2. <step>
END

A program reads your reply, not a person. A reply not in this shape cannot be read: it is sent back to you as invalid, and that costs a turn of conversation. You may write a few lines of reasoning before the PLAN: line. Nothing may come after END.

Each step is one of these, using card names exactly as the game shows them:
  play land <card>
  cast <card>                      or  cast <card> -> <target>
  activate <card>                  or  activate <card> -> <target>
  activate <card>: <ability>       (a permanent with several: its cost, as in "+2", or words of it)
  attack with <creature>, <creature>, ...      or  attack with none
  block <attacker> with <your creature>        (one line per block)
  target <card or player>          (answers a question that asks for a target)
  choose <option>                  (answers any other question, in the words shown)
  keep   or   mulligan             (your opening hand)
  pass                             (do nothing now: no response, no blocks; last step)
  hold                             (do nothing more this turn; last step)
The players are "opponent" and "me". When two cards share a name, add the number shown after it, as in "Island #12".

Example:
Their only creature is a 2/1, so I develop first and keep my Shock for it.
PLAN: Play a Forest, cast Grizzly Bears, then attack with Llanowar Elves.
STEPS:
1. play land Forest
2. cast Grizzly Bears
3. attack with Llanowar Elves
END

THE GAME. You are playing a two-player game of Magic: The Gathering against the Forge AI. You see only what your seat may see. The program carries out your steps in order on the rules engine: steps before an attack happen in your first main phase, the attack at declare attackers, steps after it in your second main phase. Mana is paid for you from your untapped mana. If a step cannot be done (not enough mana, a name that matches nothing, the engine says no), the program stops, tells you exactly why, and asks for new steps from there. When your steps run out it passes for you until you are needed again: when the opponent casts or activates something you could respond to, when you must declare blockers, when a card asks you to choose, and at the end of the opponent's turn if you could cast something then.

Play to win.
```

**The parser is strict** (`lib/plan.mjs` `parsePlan`): reasoning only before `PLAN:`;
`STEPS:` on its own line; steps numbered 1, 2, 3 …, each one of the eleven verbs;
`pass` / `hold` only last, `keep` / `mulligan` only alone; `END`, and after it nothing
but blank lines or a code fence. Backticks or bold round a step and a final full stop
are tolerated. An invalid reply gets a precise reason — `there is no END line; the
reply must end with END on a line of its own`, `step 2 "tap Forest": "tap" is not a
verb this program knows; the verbs are: …`, `the steps must be numbered 1, 2, 3 …:
found 3 where 2 was due` — which is sent back with the reply (a correction).

### What it sees

Plain text, no menus (`planView`, `offersText`): the turn and phase in words, life,
hand / library / graveyard / exile counts (the opponent's hand is a count), each
side's lands (tapped or not) and permanents (P/T, tapped, summoning sick, counters,
damage, keywords, attachments, tokens), its hand with mana costs and types, its
untapped mana and what colours it makes, whether its land is played, graveyards,
exile, the stack (top first, with targets), combat, the game log so far (the same
compact log as decision mode), what the engine lets it do now (lands it may play;
spells its untapped mana can pay for; **spells in hand it cannot pay for, said so**;
permanents with abilities; creatures that can attack), and the card text once per
conversation (the oracle lookup, reminder text dropped). A name carries `#id` only
when two visible cards share it. Only the seat's redacted view.

An example, the start of a turn against real Forge (fake model, `pacho-shield` vs
`doom-legion`, seed 1, the 5th turn):

```
It is your turn 5. What do you do this turn?

GAME SO FAR ("you" is you, "opp" the opponent; [n] is a card's number)
T1 (you): you land Island [34];
T2 (opp): opp land Hidden Lair [43];
T3 (you): you land Island [36];
T4 (opp): opp land Villainous Hideout [44]; opp cast Loki, God of Mischief [53];
T5 (you):

NOW
Turn 5, your turn, first main phase. You have priority.

YOU (Human): life 20, hand 7, library 31, graveyard 0, exile 0
  Hand: Robotics Mastery {4}{U} (Enchantment - Aura); Strategic Intervention {1}{W} (Enchantment); Giant-Sized Flying Ant {3}{U} (Creature - Insect 3/2); Depower {2}{U} (Instant); Island #33 (Land - Island); Island #37 (Land - Island); Plains (Land - Plains)
  Untapped mana: 2 (Island, Island: U U). Land played this turn: no.
  Lands: Island #34, Island #36 -- 2 untapped
  Creatures and other permanents: none

OPPONENT (Forge AI): life 20, hand 6 (hidden), library 31, graveyard 0, exile 0
  Lands: Hidden Lair (tapped), Villainous Hideout (tapped) -- 0 untapped
  Creatures and other permanents: Loki, God of Mischief 2/1 (summoning sick)

STACK: empty

WHAT THE ENGINE LETS YOU DO NOW (mana checked against your untapped mana)
  play a land: Island #33, Island #37, Plains
  cast: Depower {2}{U}
  in your hand, but your untapped mana (2) cannot pay for it now: Robotics Mastery {4}{U}; Strategic Intervention {1}{W}; Giant-Sized Flying Ant {3}{U}

CARD TEXT
Depower: This spell costs {2} less to cast if it targets an attacking creature. / Target creature gets -4/-0 until end of turn. / Draw a card.
Giant-Sized Flying Ant: Flash / Flying / When this creature enters, choose one — / • Tap target nonland permanent. / • Untap target nonland permanent.
Hidden Lair: (no oracle text available)
Loki, God of Mischief: (no oracle text available)
Robotics Mastery: Flash / Enchant creature / When this Aura enters, create two 1/1 colorless Robot artifact creature tokens with flying. / Enchanted creature gets +2/+2.
Strategic Intervention: Whenever a creature you control attacks alone, it gets +1/+1 until end of turn. Tap up to one target creature defending player controls.
Villainous Hideout: (no oracle text available)

It is your turn 5. What do you do this turn?
Reply with PLAN:, STEPS: and END, as the system prompt shows.
```

(Depower is listed as one it can cast: its text makes it cheaper at times, so the
mana hint cannot tell and leaves it to the engine.) A valid reply to it:

```
Loki is summoning sick and I have nothing I can pay for but Depower, which is better saved.
PLAN: Play an Island and keep Depower up for their attack.
STEPS:
1. play land Island
2. hold
END
```

### When it is asked (a *moment*)

Each moment is one call — a fresh `claude -p` with the full picture under the
`fresh` arm (the default); under `session:N` / `game` a message in one CLI session
carrying only what changed since the last one, as in decision mode.

| moment | when | the question |
|---|---|---|
| `play-draw`, `mulligan` | the start of the game | "You won the coin toss. Do you play first or draw first?" / "Do you keep it?" |
| `turn` | the seat's first decision of its own turn with something it could do — its first main phase, or the attack declaration when the main phase had nothing it could pay for | "It is your turn N. What do you do this turn?" |
| `response` | the opponent's spell or ability on top of the stack, once per item, when the seat holds something it could pay for (a spell its untapped mana covers, an ability) | "This just happened: the opponent cast X (targets Y). It is on the stack now. Your plan was: …. What do you do now?" |
| `blocks` | the block declaration, when a block is possible | the attackers and your untapped creatures; one `block A with B` per block, or `pass` |
| `end-step` | the opponent's end step, once a turn, when the seat could cast or activate something there (the default stops, below) | "Do you cast or activate anything before your turn?" |
| `question` | an engine question the plan did not answer: a target the step did not name, a mode, a discard, an optional cost it can pay | "Robotics Mastery needs a target: which? Legal targets: …" |
| correction | a step that cannot be done, or a reply that cannot be read (below) | the reason, what was done, the plan, the question again |

Everything else is code, with no call: mana is the engine's own Auto; priority with
no step left is passed; an engine question with one legal answer is answered; a
spell of the seat's own on the stack is let resolve; an ability menu after a
`cast X` step picks the spell (after `activate X`, the one ability when there is
one, or the one the step named, M63); a delve cost is paid by the seat through the
engine's own two prompts (below); an optional cost the seat cannot pay is never offered (below). The phase stops
are decision mode's default set (own MAIN1 and MAIN2; the opponent's declare-blockers
step while the seat has a creature; the opponent's end step while it has an untapped
land and an instant-speed option), with no `next:` line.

### How steps are carried out

In order, against what the wire offers (decision.mjs's options): `state.playable`
(M61) and `state.activatable` (M63, D420: each permanent you control with the
abilities Forge would activate on a click now; on an engine without the key, the
permanents whose card text has a non-mana activated ability) at priority, the attack candidates and block
pairs read off the board, an ask's options, `input.selectable`. A name matches by
verb and card name — case, accents and punctuation do not count; `Island #35` (or
`[35]`, the log's spelling) picks one card; same-named cards of one owner in one
zone are interchangeable; same-named cards of two owners or zones are ambiguous
without an id. A comma inside a card name ("Peggy Carter, Secret Agent") is kept
when the name is one of the candidates.

- `play land` / `cast` / `activate` run at the seat's priority. A `cast` from hand is
  first checked against the untapped mana (`lib/mana.mjs`; cost reducers, convoke
  and alternative costs are left to the engine; delve counts the graveyard, at
  most the generic part).
- `activate X` picks the permanent from the engine's list; when it has more than one
  ability there, `activate X: +2` (a loyalty cost; `2` reads as `+2`) or `activate
  X: draw three` (words only one label contains) names one, and the engine's menu
  is answered with it; with none named the menu is asked as a question. An ability
  the list does not have is a correction that lists the ones it does. The prompt
  lists every one, permanent and the engine's label, under *activate on the
  battlefield*, marked when its mana cost cannot be paid from the untapped mana.
- A question that needs N choices (Ghostly Flicker's two targets, "choose 2") takes
  the `target` / `choose` steps that follow, in order, until N are named.
- **Delve** (measured: Forge asks `choose_list` "Delve how many cards?", `"0"`..`k`,
  then "Exile which card(i/n)?" once per card, where none clears the whole delve):
  the seat answers both with no call — what the untapped mana cannot cover (minus
  the mana the plan's later `cast` steps need), all of it when short anyway; lands
  first, never a card the engine listed as playable from the graveyard while another
  will do. A payment that still fails says how many cards delve exiled.
- `cast X -> Y` answers the targeting question that follows with Y; a target the step
  did not name is one plain question.
- `attack with A, B` is played at the declaration (priority before combat is passed
  to get there); steps after it run in the second main phase; no attack step means no
  attack. `block A with B` lines are one declaration.
- **Blocks the wire rules out are not offered.** A block pair is dropped when the
  keywords on the wire forbid it (`decision.mjs` `blockRule`: flying without flying
  or reach, shadow, horsemanship, fear, skulk); the blocks question says so ("By the
  rules: Eldrazi Spawn Token cannot block Vampire Nighthawk, Mulldrifter (flying)")
  and a step naming one is corrected before any click. A "can't block" effect is not
  on the wire: the engine still judges.
- **A block declaration is kept as it is clicked.** Forge keeps each block it takes,
  a click on a declared block again takes it back, and the state shows none of them
  until the declaration ends. So the seat keeps the blocks it declared (a click the
  engine refused undone; `seat-core.mjs` `blockDecl`): a correction is told what is
  already declared, the new block steps are the whole declaration (a declared block
  they leave out is clicked off, one they keep is not clicked again), and the
  default after the corrections is "no new block" — the blocks the engine already
  took stay. (m20-search-p15: the Spawn's refused block left the Dragon declared on
  Writhing Chrysalis, so every later "block Mulldrifter with Amethyst Dragon" was
  "cannot be selected now"; state 1041's combat shows the Dragon's block.)
- When the steps run out, priority is passed with no call until the next moment.

**The engine is the rules judge.** When a step has no matching action, the
untapped mana cannot pay it, a name matches nothing, the engine refuses the click
(a `notice` on the same prompt), the engine could not pay the mana, or a cast comes
back cancelled, the program stops and asks for corrected directions from here with
the precise reason:

```
Step 2 'cast Grizzly Bears' cannot be done: it costs {1}{G} (2 mana) and you have 1 untapped mana source (Forest).
Done so far: step 1 'play land Forest'.
Your plan was: 1. play land Forest (done); 2. cast Grizzly Bears.
Give corrected steps from here; what was done stays done. (Correction 1 of 2; after that the program plays it safe.)
```

Other reasons it gives: `the engine refused it: "Not selectable: …"`, `you have no
creature named "X" on the battlefield`, `Elf is summoning sick (it came under your
control this turn)`, `"Grizzly Bears" fits more than one choice: Grizzly Bears #20,
Grizzly Bears #31; add the number`, `you have already played a land this turn`,
`X is not an instant: it can be cast only in your own main phase with an empty
stack`, `that cast was cancelled: X went back to where it was …`. A payment the
engine could not make quotes the cost of what was paid for: the card's cost for a
cast from the hand, its flashback / escape cost from the graveyard, and for an
activation the ability's own cost from the engine's label (Equip too), with what the
engine asked for when the cost has an X (`its ability "{X}: Crypt Rats deals X
damage …" costs {X}; the engine asked for {B}{B}{B} (3 mana) and you have 2 untapped
mana sources (Swamp, Plains)`; before, the Rats' casting cost {2}{B} was quoted). When the engine
is mid-question (a target), the correction also carries the question and its legal
answers. **At most 2 corrections a moment** (an unreadable reply counts as one); then
the safe default — pass, no attack, no blocks, keep, the ask's own default — and a
`fallback` is counted.

### The loop guard (both modes)

A fake-model game in decision mode on the real engine cast Helicarrier Strike 1,900
times in one turn: it chose the Teamwork optional cost it could not pay (no creature
to tap), Forge cancelled the cast, priority came back, the same cast again. Two
guards, in both modes:

- **An optional cost the seat cannot pay is never offered** (`decision.mjs`
  `classifyAsk`, `mana.mjs` `optionalCostPayable`): Teamwork's "total power N or
  greater" against the untapped creatures, "tap N untapped creatures", a mana cost
  against the untapped mana; a cost it cannot read is offered. With none payable the
  ask is answered "none" with no call.
- **A play that comes back cancelled is counted** (`seat-core.mjs` `checkCancelled`):
  back at priority after a click on a card at priority, the card still where it was,
  nothing of it on the stack, no `cast` / `land` event. After **2** in one turn the
  card is no longer offered that turn (decision mode drops the option and says so in
  the decision; plan mode turns each cancel into a correction — "that cast was
  cancelled …; it was cancelled 2 times this turn and is not tried again"). The same
  game now finishes (decision mode, fake model, 14 turns: Helicarrier Strike cast
  twice a turn at most).

### Logs (plan mode)

The same files as decision mode. `decisions.jsonl` holds three kinds of line, all with
`mode: "plan"`: `kind: "plan"` — one per moment: `moment`, `momentNo`, `correction`
(its number, 0 for a first ask), `question` (its first line), `how` (`model` /
`fallback`), `plan`, `steps`, `corrections`, and `calls` (per call: `promptBytes`,
`systemBytes`, `full`, `sessionPos`, `replyBytes`, `usage`, `costUsd`, `ms`, `reply`,
`parse` — `ok` or the parser's reason, `error`/`transport` for a CLI failure);
`kind: "step"` — `status: "sent"` with the moves, or `status: "failed"` with the
`reason`; and the engine decisions the code settled (`how: "auto"` with the reason,
`how: "fallback"`). `games.jsonl` adds `mode`, `moments` (calls by kind),
`corrections`, `invalidReplies`, `stepsSent`, `stepsFailed` to decision mode's fields
(`modelCalls`, `fallbacks`, `refused`, `stale`, tokens, cost, time).

### Calls and tokens per game

**Real engine, fake model** (this container, Forge 2.0.14 pinned jar, `pacho-shield`
vs `doom-legion`, seeds 1–2 mirrored, Default AI, `fresh`, the fixture oracle slice):
four games played out (14–16 turns, all losses — the fake attacks with everything
and passes on the rest), **16, 30, 30 and 31 model calls** (mean 27), 3 corrections,
0 fallbacks, 0 refused clicks, 0 stale. The calls by moment, summed over the four:
turn 34, response 29, end-step 14, question 15, blocks 7, mulligan 4, play-draw 4.
Mean user message 3.5 KB; with the 2.3 KB system prompt ≈ 5.9 KB, **≈ 1.5k tokens a
call, ≈ 40k tokens of our text a game**.

```bash
node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck \
     --seeds 1-2 --mirror --context fresh --model fake --port 8660 \
     --oracle fixtures/cards/oracle-cards.slice.jsonl --run plan-real-4 --save-prompts
```

**Fixture dry run** (`plan-dry.mjs`, recordings made before M61, so no playable list):
`human-auto-42` 63 calls, ~115k tokens; `human-auto-7` 45, ~75k; `human-comfort-13`
26, ~40k (bytes / 4). These over-count: the recorded game does not follow the fake's
plan, so a step the recording did not play becomes a correction (11, 12 and 3 of
them), and a recording's own choices (17 "Choose optional costs" / ability menus in
`human-auto-42`) become questions.

```bash
node tools/llm-seat/plan-dry.mjs --replay fixtures/games/human-auto-42.jsonl \
     --oracle fixtures/cards/oracle-cards.slice.jsonl --print 3
```

**Estimate for Sonnet:** 25–50 calls a game (a real model will plan more steps,
answer more questions and need some corrections), 40–80k tokens of prompt a game,
against J119's 110–150 calls and ~460k. Claude Code's own per-call overhead comes on
top: J119's usage works out to ≈ 3.5k tokens a call against a ≈ 1.6k-token prompt,
so read **≈ 100–180k tokens a game** as the likely total until the pilot's `usage`
says otherwise.

### Not built in plan mode, and why

- **Ordering, damage assignment, amounts, library manipulation, sideboarding, text**:
  as decision mode, the bridge's default.
- **Attacking a planeswalker or battle**: as decision mode, the attack goes to the
  engine's current defender.
- **Filter mana (Prophetic Prism)**: Forge's Auto never pays with a `{1}, {T}: Add
  one mana of any color` source, the payment prompt lists no mana sources at all
  (`selectable` empty; the seat's smart pay clicks lands unlisted), and
  `state.activatable` holds no mana ability. Whether a click on the Prism during a
  payment would use its ability (a nested `{1}` payment) is on no recorded wire. So the
  mana words count no mana ability whose cost needs mana (`mana.mjs` `isFilterCost`:
  the Prism, Signets, Eggs, filter lands' second line — a land with only such lines,
  Sungrass Prairie, is no source): s2-search-p20-s6's six lands and Prism were told
  "7 mana, any colour", and Welcoming Vampire {2}{W} was sent with no white. Paying
  with one is open.
- **Grading plan-mode choices**: the positions mode and coach-grade work per engine
  decision; plan mode's records keep the `stateSeq` of every moment and step, but no
  replay of a plan against a recorded game is built.

## Decision mode (D418)

### On the PC

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

#### (0) The probe: one tiny call

```bash
node tools/llm-seat/probe.mjs --model sonnet [--session]
```

One call (two more with `--session`) with exactly the seat's CLI arguments; it
prints the reply and its usage, or the CLI's error and exits 1. Put it in a
job's pilot so a `claude` that is not logged in (or refuses a flag) fails the
pilot instead of a game. In a game, a decision whose every call failed in the
CLI prints `MODEL ERROR` with the reason, and **3 in a row stop the game**
(exit 6, the reason in `games.jsonl`), so no game is played on fallbacks (J117).

#### (a) The pilot: 2 games against Forge Default

```bash
node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck \
     --seeds 1 --mirror --context fresh --model sonnet --run pilot-1
```

One seed, both seatings (the decks swapped), the `fresh` arm. The AI is
`--ai-profile Default --ai-policy plain` (Forge's own AI, no search). Check
`var/llm-seat/pilot-1/games.jsonl` (result, turns, model calls, fallbacks,
tokens, time) and `decisions.jsonl` (every decision: `how` is `auto`, `model`
or `fallback`). A `--dry-run` prints the bridge commands and starts nothing.

#### (b) The arm comparison

```bash
node tools/llm-seat/run-match.mjs --pairs tools/ai-bench/pairs-dev.txt --pair 0 --seeds 1-10 --mirror \
     --context fresh,session:10,game --model sonnet --run arms-1
```

20 games an arm (10 seeds, mirrored), the arms one after another. **Win rate
will not separate the arms**: 20 games give about ±22 points. The games are for
the decision logs and for (c).

#### (c) The replay grading (the paired comparison)

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

### What the seat does at each frame

**When the model is asked** (Justin's "common sense" rule; each part switchable
and logged):

- Every engine question goes to the model — targets, choices, a confirm, an
  ability menu, the mulligan and play/draw, the attack and block declarations, a
  selection the engine asks for — **except one with exactly one legal answer**,
  which is answered with no call (`how: "auto"`, with the reason).
- **Priority with nothing playable is passed with no call.** Playable is the
  engine's own list, `state.playable` (amendment M61: each card outside the
  battlefield Forge would play on a click now), plus `state.activatable`
  (amendment M63, D420: each permanent you control with the non-mana abilities
  Forge would activate on a click now, one option per ability). On an engine
  without M63 every permanent of yours whose oracle text has a non-mana
  activated ability is offered instead (`--no-battlefield-abilities` turns that
  hint off). On an engine
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
× the attackers in `state.combat`, less the pairs flying / reach, shadow,
horsemanship, fear or skulk rule out), because Forge's attack and block inputs never
name selectables (§4.1, M8). The engine still judges: a click it refuses is a
`notice`, and the seat then plays the default on the same input, then OK /
Cancel / pass, so a refused click never loops (`refused` in the game summary).
An attack is its clicks then OK, sent one per settled input and dropped as soon
as the engine's prompt is no longer the attack; a block is attacker-then-blocker
clicks per pair, then OK, built on the blocks already declared in the same
declaration (the default on a refused block keeps those, adds none).

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
  activated ability: one the engine last listed in `state.activatable` with an
  ability that is not a loyalty ability or an equip, or one whose card text says so).

A reply with no `next:` line goes back to the defaults; `--no-stops` leaves
Forge's stops alone. Each `setPhaseStop` is an act on the wire and in the
client's frame log.

#### Verified: what the stops do NOT gate

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

### The context arms

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

### Logs

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

### The positions mode, in detail

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

### Prompt sizes and tokens

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

### Not built, and why

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
