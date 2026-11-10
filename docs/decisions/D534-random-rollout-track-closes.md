## D534 — the random-rollout track closes: eight nights, thirteen arms, none a candidate; a search that values its options on guarded random play is 19 to 44 Elo behind the same search on Forge's rollouts on the point (about 7 with half its rounds Forge's), the gap is in the value and not the budget, and what would reopen it is named (closes D523's loop; amends D533)

*Branch `pc/search-kinds`, off main `4e823718` (D533's merge, the pin of J209). The number was reserved for this
closing when the kinds lane was written beside J209 (D535, the same branch); `node tools/decisions.mjs next` printed
D534 then. Closes the iteration loop of D523's point 10 as D532 point 6 and D533 points 7 and 8 pre-registered it:
written from the track's closing draft with the counters of every iteration, J209's mix counters among them, naming
what would reopen it. **No code changes**: no file under `bridge/src`, `web/src` or `tools/` is touched by this
decision, every arm stays registered in `tools/ai-ladder/players.json` at its hash, the rollout values `random`,
`random-self`, `random3`, `random3-held`, `random4`, `random4-them` and `mix4-them` stay in `SearchConfig` (ladder
only; `parseLive` refuses each), and the live seat, the atlas's random seat (D508's frozen population), the wire and
the protocol are what they were.*

**Status: the track is closed.** J209 finished at 18:16 on 2026-11-10: its match complete, 1,200 of 1,200 with no
draw, error or timeout, all 49 of the job's checks passing, the runner's status `done`; `verdict.json` carries
`candidate` 0, `confirm` 0 and `trackCloses` 1.

**2026-11-10**

**Context.**

- **The question** (D523): whether the search can value its options on guarded random play instead of Forge's own AI
  in the rollouts — the owner's principle that knowledge comes from randomised exploration within reasonable bounds,
  and the cheap path to Forge leaving the loop. The measure was fixed before the first night: each arm one D398
  match of 1,200 games (600 mirrored pairs) against `search-v1-anytime` (search-v2, the Forge-rollout search) on the
  same 600 deals (blocks 114,900,000–114,900,149, the confirm set), read by a pre-registered table (D523 point 9,
  D527's from random-v4 on, its SHOWN row restated by D530 point 7).
- **The chain, complete.**

  | iteration | arm | change | Elo vs search-v2 [95%] | reading |
  |---|---|---|---|---|
  | random-v2 (J199 a) | `search-v2-rrandom` | the atlas's random seat + R1–R7, both rollout seats | −43.7 [−57.1, −30.4] | loses badly |
  | random-v2 (J199 b) | `search-v2-rrandom-self` | the same, searching seat only | −25.5 [−38.3, −12.8] | worse, not badly |
  | random-v3 (J201 a) | `search-v2-rrandom3` | + R8 the good block | −30.8 [−44.4, −17.2] | loses badly |
  | random-v3 (J201 b) | `search-v2-rrandom3-held` | + R9 the held instant | −29.6 [−43.7, −15.6] | loses badly |
  | random-v4 (J202 a) | `search-v2-rrandom4` | R8 made lethal-aware | −39.5 [−53.9, −25.3] | loses badly |
  | random-v4 (J202 b) | `search-v2-rrandom4-m40` | + the override margin 20 → 40 | −20.9 [−34.1, −7.7] | worse, not badly |
  | random-v5 (J204 a) | `search-v2-rrandom4-m60` | the override margin 40 → 60 | −24.4 [−38.4, −10.4] | worse, not badly |
  | random-v5 (J204 b) | `policy-outlet` (the baseline) | search-v2's seat, the search off | −84.4 [−99.9, −69.3] | (no reading of its own) |
  | random-v6 (J205 a) | `search-v2-rrandom4-lcb-m40` | D350's `override=lcb`, z 1, at margin 40 | −35.4 [−49.5, −21.5] | loses badly |
  | random-v6 (J205 b) | `search-v2-rrandom4-lcb-m60` | the same at margin 60 | −34.3 [−47.8, −20.9] | loses badly |
  | random-v7 (J206) | `search-v2-rrandom4them-lcb-m40` | the rollout's opponent alone random (`random4-them`) | −23.2 [−34.7, −11.7] | worse, not badly |
  | random-v8 (J208 a) | `search-v2-rrandom4them-m40` | J206's arm on the margin rule (no lcb), margin 40 | −19.1 [−30.3, −8.0] | worse, not badly |
  | random-v8 (J208 b) | `search-v2-rrandom4them` | the same at search-v2's own margin, 20 | −19.7 [−31.0, −8.4] | worse, not badly |
  | random-v9 (J209) | `search-v2-rmix4them-m40` | Forge's and `random4-them`'s rollouts by round (`mix4-them`), margin 40 | −6.9 [−17.8, +3.9] | worse, not badly (too wide) |

  Every number is the runner's match line as each night's summary states it
  (`~/code/pc-results/results/J199`–`J209/summary.md`); J203 and J207 are not rows (J203 is the judges' night, D522's
  other half; J207 failed in its pilot on a metric line of the job file before any rated game and was reposted
  unchanged as J208).
- **J209's reading** (D533 point 7, quoted word for word in the job). `search-v2-rmix4them-m40` scored 0.4900
  [0.4743, 0.5057], −6.9 Elo [−17.8, +3.9], 588 won and 612 lost. The row that held is NOT SHOWN, worse, not badly,
  by D527's too-wide case: the interval contains 0, so it is not "upper end below 0", and its lower end, −17.8, is
  at or below −15, so it is not the candidate row "indistinguishable" either. No candidate, so no confirmation, and
  the track closes. **The mix's counters**, the arm's side, over 27,951 mix decisions: 96,832 Forge rounds and
  82,261 random (3.46 and 2.94 a decision); 250,585 Forge rollouts and 197,737 random scored into a round (8.97 and
  7.07 a decision; `search.rr.rollouts`, which counts every rollout that seated the random seat however it ended,
  202,549); the best alternative's paired differences against Forge's answer, 36,532 pairs in Forge rounds with a
  mean of +793.1 and 33,885 in random rounds with a mean of +692.6; of the 8,311 decisions where that candidate was
  paired in both kinds of round, the two kinds disagreed in sign in 872, 10.5%. Overrides of Forge by kind (priority
  / attack / block) and the priority directions (from a pass / to another play / to a pass): the arm 15.5% / 11.7%
  / 18.2% and 6.62% / 5.74% / 3.12%; search-v2's side in the same match 19.3% / 15.3% / 21.0% and 8.16% / 6.33% /
  4.81%; J208 (a) 15.3% / 14.1% / 17.5% and 6.70% / 5.58% / 3.03%. Cost the same on both sides: 923 against 911 ms a
  decision, 16.0 against 15.6 rollouts, 6.2 against 6.0 rounds. Information, deciding nothing, each about ±16 to ±17
  between two lines: the arm minus J208 (a) +12.2, minus J208 (b) +12.8, minus J206's arm +16.3, minus J202 (b)
  +14.0; the arm minus J204 (b)'s `policy-outlet` +77.5 [58.7, 96.3].

**Decision.**

1. **The random-rollout track is closed.** J209's arm is not a candidate (NOT SHOWN, worse, not badly), so by D533 point 7 exactly one
   thing follows from its complete match, the track closing with this decision and no further iteration. No arm of
   the thirteen was a candidate on any night; none goes to a confirmation; none reaches the seat queue (D509). The
   live seat never changed and does not change here.
2. **What the track measured.**
   - **The size.** At equal time a decision, the search on guarded random rollouts sits **19 to 44 Elo under** the
     search on Forge's rollouts on these deals, on the point (the intervals' upper ends reach −7.7). Its four best arms with every rollout's opponent random are within
     about 4 Elo of one another (−19.1, −19.7, −20.9, −23.2), each interval's upper end below 0: the best the
     track found with every round's opponent random is about −20, across two override rules, both seatings and two margins. The one arm above it
     is the mix, −6.9 [−17.8, +3.9], 54% of whose rounds and 56% of whose scored rollouts are Forge's own.
   - **It is the value, not the budget.** The random arms searched *more* than search-v2 at the same ms (×1.08 to
     ×1.15 rollouts a decision on J199 and J201, since a random rollout is cheaper), and J194's
     `search-v2-ms6000-r48`, ×3.14 search-v2's rollouts a decision, bought +1.7 Elo [−6.7, +10.2] against it: more
     Forge rollouts buy nothing measurable at this budget, and the random arms' extra rollouts (the only larger
     random budget measured, ×1.08 to ×1.15) did not close the gap. A much larger random budget was never run
     (Residual).
   - **Where it loses.** With both rollout seats random the arm overrode Forge's answer at priority about twice as
     often as search-v2 at the same margin (39.3% against 18.8%, J201), led by plays chosen over a pass (16.4% and
     19.2% of priority decisions on J202's two arms against search-v2's 8.1%). Which overrides lose was measured once, on J199's attacks (the search overrode
     Forge's "attack none" ×1.55 as often and lost those games); for priority the counters give rates, not which
     overrides win. Neither rollout seat carries the loss alone: the searching seat alone random read −25.5 (J199
     b), the opponent alone random −19 to −23 (J206, J208), both −21 to −44. And the from-pass plays are a symptom,
     not the whole of it: with the opponent alone random that share fell to search-v2's (6.7% and 8.9%, J208) and
     the arm stayed 19 behind.
   - **What the guardrails bought.** R1–R7 fired as designed (on J199 (a), R7 2.4 a rollout, R3 0.6, R4 0.23). The block-side rules
     (R8 the good block, its lethal-aware form) moved the point by at most 13 Elo, each move inside the noise between two nights; R9 the
     held instant by nothing measurable. Rules written from the arm's worst games did not make the random seat's play a better
     estimate of the position.
   - **What the verdict rules bought.** Doubling the override margin was worth about 19 Elo on the point with both
     seats random (J202 b over a) and nothing with the opponent alone random (J208 a and b, 0.6 apart); 60 was no
     better than 40 (J204 a); the noise-aware override (`lcb`) cost 10 to 15 on the point (9.9 and 14.5) with both seats random (J205 (a) against
     J202 (b), (b) against J204 (a)), and with the opponent alone random it held back 35.5% of the overrides for no
     measured gain (J208 (a), the same arm without it, +4.1 on the point, inside the noise). A margin is the
     search trusting a noisier value less; it is not a better value.
   - **The mix.** `mix4-them` was built on an argument (D532 point 5): since more Forge rollouts of the same kind
     buy nothing, a second, differently wrong opponent model beside Forge's is the one way random rollouts could add
     information rather than replace it. J209 does not show that. The arm reads −6.9 where J208 (a), the same margin
     with the random opponent in every round, read −19.1; +12.2 between two lines is inside their ±16, and half of
     −19.1 is −9.6, so the point is consistent with plain dilution (fewer random rounds, proportionally less of
     their cost); the interval is as consistent with a full recovery and nearly with J208 (a) itself, and the night
     cannot tell these apart. The two kinds of round agreed on the sign of the best alternative's difference in
     89.5% of the 8,311 decisions that paired it in both; over each kind's own pairs (36,532 and 33,885, not the
     same decisions) the means have the same sign (+793 and +693). There is no Forge-against-Forge split to say
     whether 10.5% is many, and nothing in the night's result says the decisions where they parted were the random
     rounds being right. An arm made no weaker by being half Forge's would in any case leave Forge in the
     loop for half the rollouts, which is not the question the track asked.
   - **What the search is worth on random rollouts all the same.** Against `policy-outlet` on the same deals
     (J204 b, search-v2's seat with the search off, −84.4 against search-v2) the pure-random arms read from J204 on sit 49 to 65
     Elo over it on the point (J204 (a) +60.0 [39.3, 80.7], J205 (a) +49.0 [28.3, 69.7], J206 +61.2 [42.1, 80.3];
     J208 (a) −19.1 against −84.4; the mix, half Forge's, +77.5 [58.7, 96.3]). Guarded random play is a usable rollout policy; it is a worse one than Forge's
     AI.
3. **The conclusion, in the question's own words.** The cheap path — Forge out of the rollout loop at no cost — is
   **NOT SHOWN**. Forge's opponent model, wrong as it is, is a better stand-in for an opponent inside a rollout than
   a random one under the track's guardrails, by about 20 Elo at this budget, and neither a wider margin nor a noise-aware override recovered it. This is a statement about *uniform random play inside rollouts*; it is not a statement
   about randomised exploration as a source of knowledge (the atlas, D508, is that, and its labels are the input to
   what item 4's second line names), and it is not a statement that Forge's AI is the ceiling: the same nights put
   the search 84 Elo over the same seat with the search off.
4. **What would reopen it** (D530 point 7's list, D533 point 8). Not a tenth guardrail and not another verdict knob:
   - **a seating where the search decides the random defender's blocks**, so the defender is not uniform where it
     matters: the opponent's turn played at random, its blocks chosen by the searching side's own values;
   - **a learned rollout policy**: the atlas's labels, or the judges' picks (D522's step 2 with a teacher that is not
     Forge), distilled into a policy cheap enough to play rollouts. This is the one version where random exploration
     and outside knowledge meet, and it is its own track with its own decision, not an iteration of this one.
   Either reopens the question under a new decision that names its arm, its night and its table before any rated
   game; nothing in this file schedules one.
5. **What stays.** Every arm's registration and hash, every rollout value, every counter (`search.rr.*`,
   `search.mix.*`), the self-test cases and the nights' match files and summaries stay as they are: they are the
   baseline a reopened track is read against, and removing a value would change no hash but would lose the ability
   to replay a night. `PLAN.md`'s track items (42, 44, 46, 47, 49, 50, 51 and 52) are closed with this reading; D535 (the kinds night, the same
   branch) is the next thing the machine plays, and it does not depend on any of this.

**Alternatives rejected.**

- **One more iteration** (a second mix ratio, the mix at margin 20, the mix confirmed at 4,800 games, the them-only
  arm at a larger budget). D532 point 6 fixed the track's end before J208 was read precisely so that a near miss
  could not buy another night: thirteen arms have been read against one table on one set of deals, and a fourteenth
  chosen after those looks would be read against a false-positive rate they have already spent.
- **Confirming an arm at 4,800 games anyway.** No arm is a candidate under the table it was registered on. The
  all-random arms' intervals are wholly below 0, and the mix is the residual's first point.
- **Removing the rollout values and arms.** They cost nothing at rest (`parseLive` refuses each; no live path reads
  them), their hashes are in the nights' match files, and item 4's first line would start from `random4-them`.
- **Reading the track as "Forge is the ceiling".** The baseline row says the opposite about the seat, and D535 asks
  which of the search's three kinds carries that 84.

**Residual.**

- Every number is on one cube's confirm set (600 deals) at one budget (search-v2's ms a decision). The gap could be
  smaller on other deals or at a much larger budget; nothing here measured that.
- The comparisons between nights (an arm minus another night's arm) are across merges that changed no path a match
  runs (D529, D532's Context) and are about ±16 to ±20 Elo each (two 1,200-game lines); they order nothing inside that.
- **J209's interval reaches 0, and the track closes all the same.** The table and its too-wide case were fixed
  before the first night and D532 point 6 fixed the end before J208 was read; a mix is the arm most likely to land
  there, because it is half the baseline. Whether a mix at 4,800 games would read indistinguishable is not known and
  is not asked: it would answer whether half-random rollouts are tolerable, not whether Forge can leave the loop.
- J209 ran with one five-minute drop from 7 workers to 6 (16:25 to 16:30, a pressure event of the runner's); the
  deals are fixed by block, so the drop changes the hour and not a game.

**Follow-up.** None added. The cube lab's 42, 44, 46, 47, 49, 50, 51 and 52 (`PLAN.md`), the track's rows, are closed by this file. D535's kinds night, J210, follows on the
merge that carries both.

**Evidence.** `~/code/pc-results/results/J199`–`J209/summary.md` (J200, J203 and J207 are not the track's rows);
`var/ai-ladder/match-J199a.json` … `match-J209.json` on the lab's checkout; D523, D525, D527, D528, D530, D531,
D532, D533.
