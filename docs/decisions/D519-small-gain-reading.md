## D519 — SMALL GAIN, the fourth reading of a 4,800-game knob confirmation: a lower end above 0.5 with a point under +15 Elo keeps the knob track open and names a live-seat candidate; J197 read NOT SHOWN under it, and the knob track is closed for the confirm deck set

*Branch `pc/d519-small-gain`, off main `57320655` (D521's merge). The number is lower than D520's and D521's because
J197's job text (`~/code/mtg-table-pcjobs/jobs/J197-routlets-confirm.md`, written 2026-11-07 before any of its
games) reserved D519 by name for this reading, "to be recorded as D519 when the night is read, whichever way it
lands"; D520's lane took D520 for that reason (its own first note), and D521 followed. Numbers are final (D200), so
this file takes the reserved number although `node tools/decisions.mjs next` prints D522. Extends D517 (the knob
arms and their rule, Decision 5); uses D398's fixed match unchanged; reads J197. A reading and a result: no player, search,
bridge, wire or protocol change, and the live seat is untouched, so it is free under D509.*

**2026-11-08**

**Context.**

- **D517's rule had three readings and one consequence for a NOT SHOWN.** For each knob arm, a fixed D398 match on
  the confirm set against `search-v1-anytime` (search-v2): SHOWN if the arm's lower end is above 0.5 and its point is
  at least +15 Elo; NOT SHOWN if its upper end is below +15 Elo; otherwise INCONCLUSIVE, "confirm with 4,800 games";
  both NOT SHOWN closes the knob track (the play-AI review of 2026-11-05, §5 row 6), a routlets NOT SHOWN only at 3%
  exposure or more.
- **J195 (2026-11-07) read the two knobs at 1,200 games each.** `search-v2-ranked` (D389's `rank=prior,gen=24`)
  was NOT SHOWN, −12.2 Elo [−21.4, −2.9]. `search-v2-routlets` (D390's `rollout=outlets`) was INCONCLUSIVE: +6.9 Elo
  [−2.7, +16.6], score 0.510 [0.4962, 0.5238], its point under +15 but its upper end over it; exposure 74 of 1,200
  games (6.2%), no errors or timeouts, 984 against 978 ms a decision. D517 sends that to a 4,800-game confirmation,
  J197.
- **At 4,800 games D517's bar can close the track on a measured gain.** Four times the games halve the interval to
  about ±4.8 Elo, so any point between about +4.8 and +10.2 gives a lower end above 0.5 and an upper end under +15: NOT
  SHOWN under D517, which closes the track (from about +10.2 to +15 the upper end reaches +15 and D517 reads
  INCONCLUSIVE instead). J195's own point would read about [+2.2, +11.7] at that size — a gain
  measured with 95% confidence, at no measured cost — and D517 would have discarded it. The +15 bar was chosen for a
  1,200-game night that could not resolve less; it was never meant to call a resolved small gain "not shown".

**Decision.**

1. **SMALL GAIN, pre-registered in J197 before any of its games** (written 2026-11-07, after J195's report and
   before J197's first game; recorded here as that job said it would be). Its sentence, word for word from the job:

   > So for this confirmation a complete match whose lower end is above 0.5 and whose point is below +15 Elo reads
   > SMALL GAIN, after SHOWN and before INCONCLUSIVE AT 4,800 and NOT SHOWN: D517's bar is unchanged (the reading is
   > NOT SHOWN or INCONCLUSIVE under it, and the verdict says which), the knob track does not close, and the knob is
   > recorded as a candidate for the live seat, for the owner to decide under a separate decision with its own
   > evidence.

   Restated: a **complete** 4,800-game confirmation whose lower end (`lo`, the match line's 95% lower end on the
   arm's score) is above 0.5 and whose Elo point (`elo`) is below +15 is a **measured small gain**. It is **not
   SHOWN** under D517's bar, which is unchanged — SMALL GAIN changes what follows a result under the bar, not the bar
   — and D517's own reading (NOT SHOWN, or INCONCLUSIVE when `eloHi` ≥ 15) is reported beside it. **The knob track
   does not close on it**, and the knob is **recorded as a live-seat candidate for the owner**, to be decided under a
   separate decision with its own evidence (under D509, a seat-queue row), never by the job that read it.
2. **Exactly one reading, in this precedence: SHOWN > SMALL GAIN > INCONCLUSIVE AT 4,800 > NOT SHOWN.** SHOWN when
   `lo` > 0.5 and `elo` ≥ 15; SMALL GAIN when `lo` > 0.5 and `elo` < 15; INCONCLUSIVE AT 4,800 when `lo` ≤ 0.5 and
   `eloHi` ≥ 15; NOT SHOWN when `lo` ≤ 0.5 and `eloHi` < 15. "Complete" is J197's: the match line names the two
   players in that order, is not J195's match, says `complete: true`, played all 4,800 games, and has engine errors
   plus timeouts at most 240 (one in 20). An incomplete match gives no reading.
3. **INCONCLUSIVE AT 4,800 is not confirmed again.** The 4,800-game match is the confirmation D517 names; an
   interval that still straddles both bars at that size leaves the knob as information — not a candidate, and the
   track neither closed by it nor reopened.
4. **Exposure's UNEXPOSED applies to NOT SHOWN only.** D517's exposure reading carries over unchanged in its
   threshold (3% of games, 144 of 4,800, in integers: `exposedGames × 100 ≥ 3 × played`): a NOT SHOWN under it is NOT
   SHOWN, UNEXPOSED and keeps the knob open until a rollout-level counter exists; so is a NOT SHOWN with no exposure
   read for the match. Exposure never changes SHOWN, SMALL
   GAIN or INCONCLUSIVE AT 4,800, and is reported beside them.
5. **Cost is reported, never required.** The arm's ms a decision against search-v2's is read from the match line:
   "no cost" (within 5%) when `aMs × 100 ≤ 105 × bMs`, a cheaper arm being within. A SMALL GAIN outside 5% is still
   SMALL GAIN; its cost is what the owner's seat decision weighs.
6. **The scope is the 4,800-game confirmation of a knob arm under D517's rule** (in practice this one, J197's: ranked
   was NOT SHOWN at 1,200 and never reached a confirmation). It changes nothing at 1,200 games,
   where D517's three readings stand as written, and nothing in D514's compute-curve rule; a later rule that wants a
   SMALL GAIN reading writes its own, before its games.
7. **J197's reading under this rule: NOT SHOWN, exposed; the knob track is closed for the confirm deck set.**
   `search-v2-routlets` against search-v2, 4,800 games: score 0.5042 [0.4970, 0.5113], +2.9 Elo [−2.1, +7.9]. The
   lower end is below 0.5, so not SHOWN and not SMALL GAIN; the upper end +7.9 is below +15, so NOT SHOWN (D517 alone
   reads the same). Exposure 231 of 4,800 games (4.81%) clears the bar of 144, so not UNEXPOSED. With J195's
   `search-v2-ranked` NOT SHOWN (−12.2 [−21.4, −2.9]) the other half, **the knob track is closed** — for this deck
   set, where the knob can act in about one game in twenty-one, not for an outlet-heavy one (a different question,
   not planned). No live-seat candidate; the live seat stays search-v2 (D517 Decision 4).
8. **J195's routlets line was the upper tail of a smaller effect.** J197 puts the effect near +3 Elo; J195's +6.9
   [−2.7, +16.6] at 1,200 games is the high draw the INCONCLUSIVE band favours, as J197's hypothesis warned ("the
   true effect is more likely below +6.9 than above it"; it gave a true +3 about a 77% chance of reading NOT SHOWN).
   The two matches are never pooled (D398): J195's 1,200 games triggered the confirmation and stay outside it.
9. **The rollout-level counter (cube-lab follow-up 38) stays wanted, as a diagnostic.** No counter sees the outlet
   policy act inside a rollout (`SearchPolicy` discards `rc.counts()`, D517's Residuals). With the track closed on an
   exposed NOT SHOWN, the counter no longer gates any reading; it would say how often the knob acted, for whoever
   reopens the question on an outlet-heavy deck set.

**Rejected.**

- **Closing the knob track on a NOT SHOWN whose lower end is above 0.5** (D517 applied as written at 4,800 games).
  That is the reason this reading exists: a gain measured with 95% confidence at no measured cost would have been
  discarded because the bar was set for a smaller match.
- **Requiring "no cost" for SMALL GAIN.** A small gain that costs time is still a measured gain; whether it is worth
  the time is the owner's seat decision, which has the cost in front of it. Folding the cost into the reading would
  decide that question in a lab rule.
- **Confirming a 4,800-game INCONCLUSIVE again** (at 19,200 games). The confirmation is the step D517 names; a second
  one is a stopping rule chosen after the data, which the fixed match (D398) exists to avoid.
- **Lowering D517's bar** (SHOWN at a smaller point). SHOWN means the same at every size; SMALL GAIN names a
  different, weaker claim — a candidate for a decision, not an adoption — which is why a truly null knob reading
  SMALL GAIN about 2.5% of the time (the lower end's one-sided error) is acceptable.
- **Pooling J195's 1,200 games with J197's 4,800.** The games that triggered the confirmation would sit inside it
  (D398; J197's own text).

**Measured.** From `~/code/lab/pc-results/results/J197/` (`match-J197.json`, `verdict.json`, `report.md`; read only),
J197 run 2026-11-08 00:20–09:53 EST on the runner (`forgecoach-runner ac07876b`) at mtg-table `310ba71b`, match id
`<this host>:20261108T052348-2746448` (the match id, its host part not spelled here, D516), 9.5 hours:

- The verdict's reading line, word for word: "NOT SHOWN: search-v2-routlets's upper end 7.9 Elo is below +15;
  exposure 231 of 4800 games (4.81%); 935.199 against 935.821 ms a decision (x0.9993, within 5%); with
  search-v2-ranked NOT SHOWN at J195, the knob track is closed for this deck set".

| match | games | pairs | score [95%] | Elo [95%] | errors, timeouts | ms a decision, arm / search-v2 | rollouts a decision | exposure (arm's seat) | reading |
|---|---|---|---|---|---|---|---|---|---|
| J197, `search-v2-routlets` (`b704d57245a1`) vs `search-v1-anytime` (`cdd55e02a89c`) | 4,800 / 4,800 | 2,400 | 0.5042 [0.4970, 0.5113] | +2.9 [−2.1, +7.9] | 0, 1 | 935.2 / 935.8 (×0.9993, no cost) | 15.12 / 15.18 | 231 of 4,800 (4.81%; bar 144) | NOT SHOWN |
| beside it, never pooled: J195 (a), the same matchup | 1,200 / 1,200 | 600 | 0.510 [0.4962, 0.5238] | +6.9 [−2.7, +16.6] | 0, 0 | 984.4 / 977.5 | 14.45 / 14.52 | 74 of 1,200 (6.2%) | INCONCLUSIVE |

- Verdict flags: `complete` 1, `shown` 0, `smallGain` 0, `inconclusive4800` 0, `notShown` 1, `d517` "NOT SHOWN",
  `unexposed` 0, `noCost` 1, `knobTrackClosed` 1, `liveSeatCandidate` 0. The job's checks: **24 of 24 PASS**
  (completeness, 600 deal blocks 114,900,150–114,900,749 with none of J195's 150, exactly one reading, each reading
  both ways against the match line, exposure, the track and the cost).
- Search-v2's own seat recorded an `opportunity.*` key in 233 of 4,800 games; both sides searched about 110,700
  decisions and changed Forge's answer on 18.7% and 18.6% of them; budget fallbacks 0.5% each side.
- The runner logged 30 memory-pressure drops and raises during the night (none stopped the job); a dropped worker
  slows the match and changes no deal or budget, and the deals are mirrored.
