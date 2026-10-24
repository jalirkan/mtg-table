# The library loop: a revised rule for finding a balanced cube (draft v2, 2026-10-24)

This replaces `omega-swap-rule.md` (one gold-for-gold swap in Omega a generation, a full re-measure per swap). It is
written for Justin's yes or no before any night runs it. Numbers and method: `omega-balance-model.md` and
`omega-balance-model/` beside it; code: mtg-table branch `pc/balance-model` (D472).

## In plain language

**What changed.** Justin, 2026-10-24: "We have over 1,000 cards in the library. We don't know which cards make
the best cubes or the best decks." The old rule improved one hand-designed cube one card a night; at that rate a
cube of 180 is out of reach. The new loop uses the 80,000 recorded census games to value every card in the
library, **generates whole cubes** predicted to win evenly in every colour and pair, and spends engine nights
only on **measuring several generated cubes at once**. The model learns from every night's games.

**What it optimises.** Every colour and every colour pair **winning** evenly when the lab drafter drafts the cube
and Forge plays it (Justin, 2026-10-24). How evenly each colour is **drafted** is measured and reported beside it,
never optimised.

**What it is not.** Not built from Omega, not built around archetypes. Omega's skeleton is used for structure
only (24 a colour, 2 gold a pair, 18 colourless, 22 lands, Omega's curve), as the lab's `sample` already does.

## The loop

1. **Fit.** `tools/cubelab.sh balance-model` fits every library card's value from the recorded census
   (J144/J149) and every measured night so far, controlling for the deck's colour makeup and the opponent's
   (no engine, about a minute).
2. **Generate.** It writes candidate cubes from the whole library, each predicted to put every colour and pair
   at .500, with the model's intervals. Up to 8 a night, varied by idea (the value level, the band, with or
   without the powered list).
3. **Measure.** One night measures every candidate on J145's judged arm, on **fresh seeds**: 2,000 grid drafts by
   the lab drafter, each draft's two decks playing each other twice (once each on the play), Forge Default both
   seats, recorded (~0.5 h each at 6 workers; pauper cubes about twice that). Read with J145's own read
   (balance.py: colour and pair payoff, deck-clustered bootstrap, OFF / EVEN / UNCLEAR at band .05).
4. **Refit.** The night's drafted games join the model as a source (card values in drafted context), the
   predictions are compared with the measurements cell by cell, and the next candidates are generated.
5. **Confirm.** A candidate that passes is measured again in the next night, on fresh seeds, at **three times**
   the size (6,000 drafts, 12,000 games, ~1.5 h), before it is called balanced (D447 point 9).

## The registered rule (for a yes or no)

**A candidate PASSES a night** when, on that night's measurement:
- every colour is **EVEN** on payoff (J145's classifier, unchanged); and
- no colour pair with **400+ deck-games** is **OFF** (the same classifier applied to pairs).

**A candidate is BALANCED** when it passes, and then its confirmation (next night, fresh seeds, 3× size) shows:
- every colour **EVEN**; and
- every pair with 400+ deck-games **EVEN** — or, if Justin prefers the weaker bar, **not OFF** (question 3).

**Pull** (how evenly each colour is drafted) is reported for every candidate, by every bot drafter J145 used, and
**never** decides anything (Justin's standing answer 2: not before 30 real drafts of a cube; and the 2026-10-24
objective).

**What a night may change.** Anything the generator produces under the structural constraints: the lab's
`two-colour` plan exactly (size, singleton, colour counts, gold per pair, colourless, lands per pair, curve), at
least 10 creatures a colour, Forge-supported cards only, no AI:RemoveDeck:All. Justin's notes file wins over the
model as always: a `cut` note keeps a card out of every candidate; a `keep` note puts it in (code still to
write, below).

**The stop rule.**
- **Stop on success:** a cube is BALANCED. It is copied to `cubes/` only when Justin agrees.
- **Stop after two nights in a row** in which no candidate improves on the best measured cube's worst cell
  (max |payoff − .5| over colours and judged pairs). This is Justin's standing answer 4, applied to nights.
- **Stop and report** when the model's predictions miss the measurements by more than their intervals on two
  nights running: the model, not the cubes, is then the problem.

**What it costs.** About 10 hours a night at 6 workers: up to 8 candidates (~4 h) plus any confirmations (~1.5 h
each), plus the read. Storage at J145's rate (~62 KB a game): ~2 GB a night for 32,000 games.

**How long, by simulation** (the model's own error, J145's cell sizes; details in `omega-balance-model.md`):

| bar | candidates a night | median nights to a confirmed cube |
|---|---|---|
| every colour EVEN, no pair OFF | 4–8 | 3–4 (truly in band 95–99% of the time) |
| every colour and pair EVEN, 3× measurements, colours drafted evenly | 4–8 | 4–6 |
| the same, with the bots' current pull (BR, BG, RG rarely drafted) | 4–8 | 11–19 |
| every pair EVEN at J145's size | any | not within 30 nights (a 544-deck-game pair's interval is ±.042) |

## Code still to write before the first loop night

- `balance-model` reads a notes file (`cut` excludes, `keep` forces in) and an optional exclusion list (the
  powered list, question 4).
- `balance-model` takes any number of measured nights as sources (`--drafted <night dir>`, repeated), not only
  J145's, so step 4's refit is one command.
- A night file for the measurement (J145's arm-B scripts, one cube per profile, fresh seed bases).

## What night 0 (J159) is now

J159, running tonight, re-measures Omega on fresh seeds. It is **still needed**, for two new reasons:
- **The model's second validation.** The census model predicted J145's payoffs (r .84 drafted) without seeing
  them. J159 is a fresh measurement of the same cube: the model's predicted-against-measured error on it is the
  transfer error the programme's timing depends on (simulated at 0, .015 and .03; .03 roughly doubles the nights).
- **The reference.** Every candidate's table is read beside Omega's on the same measurement.

It no longer starts a chain of Omega swaps: the Omega batch the model would make (blue first) is an appendix to
`omega-balance-model.md`, information only.

## Which of Justin's earlier answers this replaces

| earlier answer (2026-10-23) | now |
|---|---|
| 1. Re-measure UG on fresh seeds before any swap (night 0) | **kept, re-purposed**: night 0 is the model's validation and the reference (above) |
| 2. No pull-driven swaps before 30 real Omega drafts | **kept**, widened: pull never drives a choice; real drafts enter as their own source at 30+ decks a cube |
| 3. One swap a generation | **replaced**: whole generated cubes, up to 8 a night, judged together |
| 4. Stop after two generations without a confirmed improvement | **kept**, as two nights without an improvement |

## What the model cannot see

- **People.** Every payoff is the lab drafter's and Forge's AI's. Human pull and human play enter only through
  real drafts (the draft-deck ledger), judged beside the lab's at 30+ decks a cube.
- **Combinations.** The model adds card values; cards that matter only together show up as a gap between
  predicted and measured on drafted cubes, which the refit is there to catch.
- **Lands.** Not modelled; chosen by the plan, the band and Forge's rating.
- **Forge's AI.** Cards it cannot use (tutors, combo pieces, Time Vault) read as weak; cards it cannot be beaten
  with read as strong. The power cards are a case: the census valued Black Lotus, the Moxen, Time Walk and
  Ancestral Recall inside an ordinary level, so the generator takes them unless told not to (question 4).

## Questions for Justin (yes or no each)

1. **Run the library loop instead of the Omega swap rule** (this file replaces `omega-swap-rule.md`)?
   *The PC recommends yes.*
2. **Measure up to 8 generated cubes a night** on J145's judged arm (lab drafter only, 2,000 drafts each), with
   confirmations at 3× in the next night? *The PC recommends yes.*
3. **Balanced means every pair EVEN** (with 400+ deck-games) at confirmation, rather than only "no pair OFF"?
   *The PC recommends yes, knowing it can take 11+ nights while the bots draft BR, BG and RG rarely; "no pair
   OFF" is reachable in 3–4.*
4. **Keep the powered list out of the generated cubes** (Black Lotus, Moxen, Time Walk, Ancestral Recall, Sol
   Ring, Library of Alexandria and the rest of the census's powered list)? *The PC has no recommendation: the
   data allows them; the question is what the cube is for.*
