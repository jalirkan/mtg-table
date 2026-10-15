## D438 — the leak report (A3): the owner's own decisions, graded by the post-game review in pool mode, grouped into kinds by what he chose and what he saw, a leak only under a rule written before grading

*Branch `pc/j129-leak-report`, for lab job J129 (pc-jobs). D436 is the D435 block's unused
number and D437 is left to the J128 lane, written at the same time; this lane takes D438.*

**2026-10-15**

**Context.** The cloud's brief (pc-jobs README, 2026-10-15) asks for A3: Justin's
recurring mistakes in his own recorded games. For each of his decisions the search
covers, the engine review gives a regret against the best option with an interval;
the decisions are grouped into kinds of mistake (a land played late, not attacking when
the attack was free, chump or double blocks, holding mana up versus tapping out, casting
into open mana, keep or mulligan, sequencing two spells); a decision is a mistake only
when its interval excludes zero, and a kind is a *leak* only with at least 5 such
mistakes across at least 3 games and a mean regret whose 95% interval excludes zero.
Everything else is "not shown". Friend games are read for his seat only, never the
friend's. Nothing ships automatically.

**Decision.**

1. **The grader is the post-game review, unchanged** (`coach-grade.sh review`, D353,
   with D334's grader and D349's intervals). It is what ForgeCoach's review already
   shows, its verdict "mistake" is exactly "the regret interval excludes zero", and its
   knowledge is D348's live rule: pool mode, the cube list minus his deck, his drafted
   pool and every public card, never the opponent's list. Its playouts are Forge
   Default on both seats (its yardstick, `forge-default`). "search-v2" in the brief
   names the search AI, which is a player, not a grader: no yardstick plays search-v2
   out, and building one is not this lane. J129 runs the review with more budget than
   the helper's default, fixed in `tools/leaks/rule.ts` `REVIEW`: triage 60 s of wall
   over the workers (so 6 s a decision, the clamp), every decision the triage did not
   call best deepened (`--deep-k 50`) to the end of the game within 600 s of wall a
   game, five options a decision, seed 1.

2. **Whose game it is** (`tools/leaks/stage.ts`, by the log alone):
   - a game against Forge's AI under a match id `match-m<13 digits>[-g<n>]`: ForgeCoach's
     match launcher (D303), the owner's door;
   - seat 0 of a table of two (`friend-m<13 digits>-seat0`): the room owner's seat
     (D400), with `record: true` on its header (his consent, D407) and hello_ok naming
     that seat with the owner's name (`--owner-name`). **Any other seat's log is never
     opened**: it is excluded by its file name before a byte is read;
   - a play.sh id (`human-ws-<seed>`, `human-console-<seed>`) only when the owner names
     it (`--include-id`): scripted clients and Claude's own verification games write
     the same ids (docs/evidence/m5-board.md: `human-ws-42` was one), and nothing in the
     log tells them apart. The human test set's collector (D369) takes them; this report
     does not, because a leak report about someone else's clicks would be wrong about him.
   A game of his is graded when it has an act, his deck file and a cube holding 80% of
   his deck's non-basics (human_collect.py's rule); with no cube, pool mode has no pool
   and the review would deal the opponent basic lands, which flatters every number.

3. **The data is staged by the PC session, not read by the job.** The lab runner
   refuses any script that reaches Justin's checkouts (`homeReference`). So `node
   tools/leaks/cli.ts stage --from ~/code/mtg-table --from ~/code/play-table
   --owner-name <name> --out <lab clone>/var/j129/input` copies his seat's logs (byte
   for byte, sha256 in `manifest.json`) and his deck files into the lab clone, with
   every excluded log and its reason; the job's `inventory` refuses a staged log whose
   sha256 changed or a friend seat other than 0.

4. **The kinds, by choice and context, never by the engine's answer**
   (`tools/leaks/classify.ts`). Every graded decision goes into exactly one kind, by its
   type, what he chose and the state frame he saw (his own redacted log):
   - a main-phase play: he passed → *holding up versus tapping out* (held); he cast and
     the opponent had at least 2 untapped lands → *casting into open mana*; he cast with
     two or more different spells castable → *sequencing*; he cast otherwise → *holding
     up versus tapping out* (tapped);
   - an attack: no attack while the opponent had no untapped creature → *not attacking
     when free*; anything else → *other attacks*;
   - a block: two blockers on one attacker, or a blocker that dies to its attacker
     without killing it (printed P/T less marked damage) → *chump or double block*;
     anything else → *other blocks*;
   - a target → *choosing a target*.
   A kind defined by "the engine disagreed" would include only his worse choices, and its
   mean regret would be above zero by construction. Two of the brief's kinds are not
   graded by anything and are listed as such with their counts: *a land played late*
   (the review plays Forge's land drop first in every option of a spell decision; its
   `--lands` mode is not in the review) and *keep or mulligan* (no grader takes the
   opening hand; D417's mulligan search is a player switch).

5. **The rule** (`tools/leaks/rule.ts` `RULE`, written before any of his decisions was
   graded, and copied into leaks.json):
   - a *mistake*: `regretLo > 0` — the review's own "mistake"; an interval touching zero
     is not one;
   - a *leak*: at least 5 mistakes of the kind, in at least 3 different games, and the
     95% interval of the kind's mean regret over ALL its graded decisions above zero;
   - the mean's interval: a parametric game-cluster bootstrap, 10,000 resamples, seed
     129: games drawn with replacement, and each decision's regret drawn from
     Normal(regret, se), se = (regretHi − regretLo) / 3.92, unclamped. A percentile
     interval of the point regrets alone would exclude zero for any kind with a few
     positive regrets, since a review's regret is ≥ 0 by construction (the best is
     picked on the same noisy numbers); the draws carry each decision's own noise;
   - anything else is "not shown", which says the games do not show a pattern, not that
     he plays it well.
   With no leak, the report says how many games he has and what a verdict needs: the
   kind with the most mistakes, its rate per graded game, and the games at that rate to
   reach 5 (never fewer than 3); with no mistake at all, that there is no rate.

6. **The outputs.** `leaks.json` is strict JSON: per kind only numbers (or null where a
   mean is undefined), and each leak's example moments (up to five, largest regret first)
   as the game id, the act's frame `seq` and the review's frame index. `report.md` is the
   same in plain words for the owner. Neither names a card, a deck or a person, the other
   player of a table game included. `verify` redoes the arithmetic from
   `decisions.jsonl` (same seed) and the job's checks hold leaks.json to it; the checks
   never read the outcome. `summary.md` and `metrics.json` are the runner's names and
   are not used.

**Alternatives rejected.**
- *Grading with search-v2's own search statistics* (D347's decision records): they exist
  only for the AI's seats, not the human's, and the search's per-option numbers are
  its pruning budget's, not a regret with an interval.
- *Taking every `human-ws-*` log as his* (the human test set's rule): at least one is
  documented as Claude's, and a scripted client's would make "his" leaks a bot's.
- *Kinds by the engine's best answer* ("passed when the engine cast"): see point 4.
- *The friend's seat as context* (the friend's picks as `--opp-known`): grid picks are
  public to both, but the brief says never the friend's, and pool mode stands without it.

**Measured** (the data on 2026-10-15, staged from both checkouts): 14 games his for
certain (13 ForgeCoach matches, 1 table seat), 7 with decisions, 153 decisions planned by
the review's own planner (95 main-phase plays, 30 attacks, 12 blocks, 16 targets) and 8
keep-or-mulligan answers; 29 play.sh logs and one table seat without consent excluded.
A review of the 6-decision game at small budgets took 21 s on 3 JVMs, pool mode.
