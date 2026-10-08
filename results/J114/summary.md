# J114: the human-pick drafter against the current cube-lab drafter

**Verdict: FAIL** (pre-registered: Vintage's 95% interval on the human-pick drafter's match win rate above 50%, and Synergy's point estimate not below 50%). Vintage 47.8% [45.7, 49.9]; Synergy 50.7% [47.6, 53.8].

Seat A drafts with ForgeCoach's human pick model (17Lands, CC BY 4.0) in one folder and seat B in its mirror, on the same seeds; the other seat drafts as the lab always has. Both seats are Forge Default, best of three; interval = cluster bootstrap over seeds.

## Primary

| cube | matches (seeds) | human-pick drafter's match win rate [95%] | W-L-D | as seat A / as seat B | game win rate [95%] | engine errors left out |
|---|---|---|---|---|---|---|
| vintage | 2000 (1000) | **47.8% [45.7, 49.9]** | 956-1044-0 | 48.5% / 47.1% | 48.1% [46.7, 49.6] | 0 |
| synergy | 999 (500) | **50.7% [47.6, 53.8]** | 506-492-1 | 54.1% / 47.3% | 49.9% [47.8, 52.1] | 1 |

## Secondary: colours (description only)

| cube | drafter | W | U | B | R | G | blue difference (human - current) [95%] | lab deck score | uncovered share of the human pools |
|---|---|---|---|---|---|---|---|---|---|
| vintage | human | 47.9% | 62.6% | 35.9% | 38.0% | 16.1% | +1.8 points [-1.5, 5.1] | 135.1176 | 12.7% |
| vintage | current | 56.9% | 60.9% | 27.4% | 34.2% | 20.8% |  | 142.6227 |  |
| synergy | human | 48.5% | 54.0% | 34.1% | 30.6% | 32.9% | -12.1 points [-17.1, -7.0] | 124.0116 | 49.3% |
| synergy | current | 45.8% | 66.2% | 20.5% | 12.6% | 54.9% |  | 136.9863 |  |

J111's equal-quality blue rate (one-blue matches, decisive; logit on the deck-score z-gap and who was on the play):

| cube | blue deck drafted by | one-blue matches | blue's match win rate | equal quality (b0) [95%] |
|---|---|---|---|---|
| vintage | human | 670 | 45.4% | 49.1% [44.7, 53.6] |
| vintage | current | 634 | 47.0% | 35.4% [30.0, 41.2] |
| synergy | human | 278 | 29.1% | 35.5% [28.4, 43.4] |
| synergy | current | 398 | 35.7% | 21.7% [14.7, 30.7] |

## Pairing and runs

- vintage: 1000 seeds in both folders (0 only with the human at A, 0 only at B); Forge-built decks: human 0, current 0.
- synergy: 500 seeds in both folders (0 only with the human at A, 0 only at B); Forge-built decks: human 0, current 0.

The lab deck score is the current drafter's own currency (the cube's ratings), so it is not a measure of strength here; the games are. The blue numbers carry no verdict.

---

## The PC session's reading (2026-10-08 19:30 EDT)

**Data credit: 17Lands public datasets (https://www.17lands.com/public_datasets), CC BY 4.0, through
ForgeCoach's fitted pick model.**

**Verdict under the rule: FAIL.** Vintage: the human-pick drafter's match win rate is **47.8% [45.7, 49.9]**,
the whole interval below 50%. Synergy: **50.7% [47.6, 53.8]**, point estimate above 50% but the interval
includes it, so "not shown". The rule needed Vintage above 50% with its interval; it is below.

**The decision it gives:** the drafter stays as it is. No follow-up makes the human-pick drafter ForgeCoach's
default Draft-vs-AI drafter. Result recorded.

**For description only.**
- Game win rate: Vintage 48.1% [46.7, 49.6]; Synergy 49.9% [47.8, 52.1].
- As seat A / seat B: Vintage 48.5% / 47.1%; Synergy 54.1% / 47.3% (Synergy's seat-A edge is what lifts its
  point estimate; the mirror gives it back).
- Lab deck score (the current drafter's own currency, not strength): Vintage human 135.1 vs current 142.6;
  Synergy 124.0 vs 137.0.
- Uncovered share of the human pools: Vintage 12.7%, Synergy 49.3% (half of Synergy's picks fall outside
  what 17Lands humans ever saw, so the model is guessing there).
- Time: the whole job 18:06 → 19:08 EDT (1 h 2 m) on 7 workers, 7,306 games, 1 engine error, 1 timeout.

**Blue.** Vintage: the human drafter drafts slightly MORE blue (62.6% vs 60.9%, +1.8 points [−1.5, +5.1],
not shown). Synergy: markedly LESS blue (54.0% vs 66.2%, −12.1 points [−17.1, −7.0]). Its blue decks fare
better at equal quality in both cubes (Vintage 49.1% vs 35.4%; Synergy 35.5% vs 21.7%), but their raw blue
match win rates are not better (45.4% vs 47.0%; 29.1% vs 35.7%). So the human model picks blue cards Forge
can play a little better, but not enough to win more. No verdict.

**Plainly:** drafting like a human does not make Forge's decks stronger in Forge's hands; on Vintage it makes
them slightly weaker. The lab's drafter is tuned to what this AI can pilot, and that beats human taste here.
