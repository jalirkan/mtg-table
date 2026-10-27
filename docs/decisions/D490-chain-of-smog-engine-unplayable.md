## D490 — Chain of Smog joins the census draw's engine-unplayable list: with Forge's AI in both seats the copies never end, and one step runs until the branch deadline (amends D482)

*Branch `pc/d490-chain-of-smog`, on origin/main `8e6a3a1e` (D489's comparability section). `node tools/decisions.mjs next`
gave D490. Amends **D482**'s list (its point 1: "it starts with exactly one card").*

**2026-10-27**

**Context.** J173 (atlas rung 4b, night two, the first on D488's seat), spine s06 (peasant, spine seed 2119, deck folder `s06-peasant-2019`, decks
`peasant-2019-00001` and `-00002`, one copy of Chain of Smog in deck 1), ran from 01:54 to 04:54 and was killed by the
runner's 10,800 s step cap, which failed the job with nine of its fifteen spines unplayed. The spine's 2,925 branch games
had **494 timed out** (16.9%; 0 in the night's five other spines): 486 a `BranchTimeout: the branch's deadline
passed inside one engine step (N events into its play)` with N from 82,386 to 598,583 (median 272,353), 4 the same deadline
at a `confirmAction` or `chooseTargetsFor` callback, 4 with no error text; and at the last state frame of a seat's log the
stack held *Chain of Smog (…) - Drafter A discards two cards* in every one of the 494 (492 in seat 0's log, the other two,
`d5-random-o3-b17` and `d9-random-o1-b44`, in seat 1's, seat 0's last state having an empty stack). The log of `d5-random-o0-b0` shows the loop: Forge's
AI in seat 0 answers the copy's *confirm* with `yes` and its target with the other player, the AI in seat 1 answers the
same, and the two copy the spell at each other 150-odd times in the last 400 frames alone. The card's text is the loop:
*Target player discards two cards. That player may copy this spell and may choose a new target for that copy.* Nothing
in Forge's AI declines the copy, so with an AI in both seats the chain is unbounded; D467's StepClock is read between
steps and on events, and D484's DecisionClock ends the branch at 120 s, which is what every one of the 494 cost. A
branch that does not time out in this spine takes 1.3 s (mean; median 0.85 s). Evidence: `/home/justin-a/code/lab/data/lab-j173/b-s06-peasant-2119/phaseB/`
(`branches.jsonl`; `frames/d5-random-o0-b0-seat0.jsonl.gz`, its last state's stack and its `ai`/`decision` frames),
and the runner's journal (`journalctl --user`, 2026-10-27 04:54 EDT): *J173: failed (timeout: step run6 ran past
10800 s)*; the job's `STATUS` in pc-results was last published at run4 and does not show the end. J174, drafted before this was known, had drawn the card into three of its thirteen spines (s02, s03, s10); it was
stopped at its pilot and is withdrawn, and J175 reposts it on this fix.

**Decision.** `tools/cubelab/engine-unplayable.json` gains **Chain of Smog**, `since: "J173"`, with the measurement above as
its `why` and the paths as its `evidence`. D482's rule holds exactly: a card goes on the list only with a measured stall,
inside one engine step, with the card on the board or the stack; this is that measurement. The list is read by the band
census draw alone (D482 point 3): the drafts, the evolve loop and the board never see it, and a deck that already holds the
card plays as it always did.

**What this is not.** Not a judgement of the card, and not Chain of Vapor, Chain of Plasma, Chain of Acid or Chain of
Silence, whose text invites the same loop: none of them is in `cubes/library/library-pool.tsv` today, so none can be dealt,
and none is listed without its own measurement. If one enters the pool, the first spine that stalls on it is its evidence.

**The deck draw, measured.** D482's draw passes a listed fixer land over in the shuffled order, but a spell pick that lands
on a listed card is redrawn with a fresh pick (`tools/cubelab/deckcensus.ts`, D482), so a deck changes from that pick on.
J174's thirteen spine pairs redrawn on this list from the same seeds (`tools/cubelab.sh decks --band <b> --count 2 --seed
<s> --cross-band 0.10`): 23 of the 26 decks are byte-identical to the pilot's; the three that held Chain of Smog
(`s02-peasant-2028` deck 2, `s03-legacy-2029` deck 1, `s10-peasant-2036` deck 2) differ from that pick on, by a dozen or
more cards each. J175 runs on the redrawn pairs.

**Tests.** `web/test/cubelab-deck-census.test.ts`: the committed list is exactly Scute Swarm (J166) and Chain of Smog
(J173), both library cards; `decks` reports both with their skips.
