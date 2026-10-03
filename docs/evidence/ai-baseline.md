# The AI baseline — what Forge's AI does on the owner's cubes, measured (D309–D311)

*2026-10-03, branch `c/ai-baseline`. Every number here comes from
`tools/ai-bench.sh` runs kept under `var/ai-bench/<run>/` (gitignored; one JSON
line per game) and is reproducible with the command beside it. The report on
how the AI works is [`docs/research/ai-architecture.md`](../research/ai-architecture.md).*

## 0. Conditions — read this before any time below

The container has **4 cores** and was shared with two other lanes' engines and
an ML job for the whole session: the 1-minute load average ran from 6 to **171**
(08:12), never below 6. Win rates are not affected by load except through one
mechanism (§1, Forge's 5-second evaluation timeout), which is counted per game.
**Game times are wall-clock under that load** and are only comparable between
runs that ran at the same time; each comparison below says which.

Decks (`tools/ai-bench/decks/`): ten pairs Forge's own AI drafted and built in
the cube-lab prototype's two-player grid draft — seven from the synergy cube,
three from the modern-era cube (`pairs-cube.txt`) — and two hand-built Rakdos
sacrifice decks from the synergy cube against five Forge-built opponents each
(`pairs-sac.txt`). Game g of a pair: config A plays the first deck when g is
even and sits in seat 0 when g/2 is even, so decks and seats are balanced; a
game's seed depends only on `--seed`, the pair and g, so two runs on one seed
deal the same games (**paired**). Intervals are Wilson 95%; a paired difference
is tested with McNemar's exact test on the games that changed hands.

## 1. Failure modes seen

| mode | how often | what it is |
|---|---|---|
| Forge's AI evaluation timeout | 0.00–0.03 per game at load ≤ 12; **0.11–0.17 per game** in the runs that crossed the load-171 spike | `AiController.chooseSpellAbilityToPlay…` evaluates on a `Game AI Eval` thread with a 5 s limit (`MATCH_AI_TIMEOUT`); on timeout it prints `AI eval thread at timeout` and **plays nothing that priority**. The AI gets weaker on a slow or busy machine — a reason any search we add must budget by wall clock and degrade to Forge's answer, never to "pass". |
| Game over the bench's 300 s cap | 5 of 800 sacrifice-deck games, all during the spike | Counted as draws and left out of win rates. |
| Engine exceptions | 0 in every run | — |
| RemAIDeck cards dead in hand | 289 at game end over 400 plain-Forge sacrifice games (both seats), 8 with the policy (§4) | `AI:RemoveDeck:All` filter (§4). |

## 2. Profiles: Default vs Experimental, Reckless, Cautious

PENDING

## 3. Simulation (`AIOption`) vs the default AI

PENDING

## 4. Sacrifice outlets — what Forge does, and the policy (D310)

**What Forge does with them** (400 games, `pairs-sac.txt`, both seats plain
Forge with the policy in shadow mode — it counts, never acts —
`--a Default+shadow --b Default+shadow --games 40 --seed 7`):

- **Viscera Seer and Goblin Bombardment: cast 0 times** in 400 games (each
  sacrifice deck holds one of each). The `AI:RemoveDeck:All` filter in
  `AiController.getSpellAbilityToPlay` hides them; the self-test's
  `cast-outlet` scenario shows it on one board, with Typhoid Rats as the
  control that Forge does cast. Forge's deckbuilder agrees: over 98 decks it
  drafted and built from the two cubes, the ten flagged cards are in a main deck
  0 times and in a sideboard 149 times.
- **Carrion Feeder** (unflagged; `AILogic$ AristocratCounters`): cast 160 times,
  activated 1,149 times by the sacrifice decks. The game log keeps 60 events a
  seat, so the victims below are a lower bound: **849 non-token creatures and
  470 tokens** fed to it — Gravecrawler 353 (its script says `SacMe:3`; fine),
  Bloodghast 46, but also Woe Strider 44, Zulaport Cutthroat 25, **Blood Artist
  23**, Hangarback Walker 21, **Priest of Forgotten Gods 19**, Kari Zev 18,
  Mayhem Devil 18, Goblin Rabblemaster 17. The cause, pinned by the self-test's
  `fodder-OFF` scenario: the AristocratCounters logic activates when *some*
  fodder exists (a `SacMe`, threatened or useless creature), and the payment then
  follows Carrion Feeder's `AIPreference SacCost$Creature.Other` — the
  worst-evaluated other creature on the board, fodder or not. With Gravecrawler
  and Blood Artist beside it, Forge pays with Blood Artist.
- **Woe Strider** (`AILogic$ AtOppEOT`): activated 72 times, at the opponent's
  end step, on Gravecrawler, Bloodghast, Cauldron Familiar, Myr Sire —
  sensible.
- **Priest of Forgotten Gods**: cast 74, activated 73 times — Forge's own logic,
  which the policy leaves alone (it sacrifices two).
- **What it never does**, counted by the shadow policy: sacrifice a creature in
  response to removal (47 opportunities), before it dies in combat (191), or to
  finish the opponent — **50 games** in which the outlets plus the drains on the
  board were lethal at some priority; Forge won 39 of them anyway, later, and
  lost 11.

**The policy, measured.** The same 400 deals with the policy acting on both
seats (`--a Default+outlets --b Default+outlets --games 40 --seed 7`; the
opponents hold no outlets, so it acts only for the sacrifice decks), in the
version before FODDER and the Blood Artist correction:

| | sacrifice deck wins | 95% CI | mean turns |
|---|---|---|---|
| plain Forge (`sac-before`) | **140 of 400, 35.0%** | 30.5–39.8% | 18.2 |
| with the policy (`sac-after`) | **175 of 400, 43.8%** | 39.0–48.6% | 17.2 |

+8.8 points (95% CI +2.0 to +15.5, unpaired). Paired by seed: 51 deals turned
from a loss into a win and 16 the other way (McNemar exact p < 0.0001). By
opponent, the sacrifice decks gained in 8 of 10 pairings and lost ground in one
(`rakdos-sac-2` vs `synergy-1009-A`, 9–31 → 7–33). What the policy did, per 400
games: cast an outlet Forge had hidden 342 times (Seer 168, Bombardment 174
casts in all), answered removal 135 times, sacrificed a doomed combatant 475
times, and went all in 131 times — **118 of those ended the game that turn;
13 did not, and 9 of those 13 games were then lost**. Eight of the 13 were
against the two opponents that hold Blood Artist (`synergy-1006-B`,
`synergy-1018-B`), which gains them a life for every creature we sacrifice; the
other five met life gain the sum cannot see (Scavenging Ooze, Vampire Nighthawk,
Prosperous Innkeeper) or a drain aimed elsewhere. For Blood Artist the lethal sum now subtracts that
(`OPPONENT_GAIN_PER_DEATH`), refuses a line their drains would kill us on, and no
longer counts Mayhem Devil, whose any-target trigger Forge aims as it likes
(commit `e225eb1`, self-test `lethal-vs-artist`).

**The corrected policy** (FODDER plus the Blood Artist correction, `sac-after2`,
the first 20 deals of each pair — 200 games, `--games 20 --seed 7`), against the
same 200 deals of plain Forge and of the first policy:

| | sacrifice deck wins | 95% CI | lethal all-ins that failed | paired vs plain Forge |
|---|---|---|---|---|
| plain Forge | 72 of 200, 36.0% | 29.7–42.9% | — | — |
| first policy | 89 of 200, 44.5% | 37.8–51.4% | 3 of 66 (2 games lost) | — |
| corrected policy | 85 of 200, **42.5%** | 35.9–49.4% | **0 of 58** | 21 gained, 8 lost, exact p = 0.024 |

The corrections did what they were for — no failed all-in in 200 games, and
315 of Forge's own outlet activations paid with fodder — but the two policies
are not distinguishable in win rate on 200 deals (first vs corrected: 7 and 3
discordant games, p = 0.34). The policy's measured effect is the 400-deal one
above: about +7 to +9 points for a sacrifice deck, interval from about +2 to
+16.

## 5. The self-test

`./tools/ai-bench.sh --selftest` — 22 checks, about 15 s at low load: Wilson
intervals against known values, the seat-config parser, and ten boards built
with Forge's `GameState` loader — removal answered (Viscera Seer; and Carrion
Feeder end to end, paying with the threatened Bears though the Feeder's own
preference would pay with a Memnite), a bounce not answered, lethal taken (8
life) and not taken (9 life; and 8 life against their Blood Artist), Forge's
Carrion Feeder paying with Blood Artist and the policy paying with Gravecrawler,
Forge not casting Viscera Seer and the policy casting it, Forge casting Typhoid
Rats on the same board (control), and a quiet board left alone. Removing the
`AIPreference` lift fails two checks; removing the RemAIDeck finding's premise
(a Forge that cast Seer) would fail one.
