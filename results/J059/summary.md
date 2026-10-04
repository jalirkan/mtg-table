# J059 — overnight queue, night 2 (PC summary, 2026-10-04 12:30)

**What ran:** 20,000 recorded drafts across the seven cubes (4,000 bridge drafts, share 0.2), 5 workers, 05:38 → 12:19 (run1 ~6.7 h incl. a runner restart that adopted the unit at 10:48), then a redaction sweep (run2).

**Headline numbers** (metrics.json; the `night.*` totals include night 1, so drafts/games read 40,000/39,998):
- Night 2's own: 20,000 / 20,000 planned drafts, 4,000 / 4,000 bridge drafts; every cube hit its plan.
- Engine errors 2 (rate 0.0001), timeouts 9, draws 10, recorded errors 18 of 39,998 recorded games.
- Median game 2.7 s, mean 4.7 s, 19.4 turns; ~166 KB per recording; 7.3 GB of output.
- Peak worker RSS 1.24 GB (declared 2.0), 0 memory-pressure events.
- All three final checks PASS.

**Something to look at — redaction quarantine: 684 recordings moved** to `var/cubelab/queue-quarantine-n2/` (list: runner jobs/J059/out/failed.txt).
- ~650 of them involve the **peasant** cube (560 normal/peasant, the rest bridge pairs that include peasant). Gonti, Lord of Luxury is in that cube and in no other.
- In the 80 files we sampled, every failure has the same form: *"face-down card N is controlled by player P, not the viewing seat, yet carries an `alt` block naming it ..."*. The named cards vary (Loxodon Warhammer, Fact or Fiction, ...). In the file we checked by hand (normal/peasant/games/5202 seat0, lines 313–314), Gonti had just exiled an opponent's card face down.
- Reading: Gonti's controller may look at that card and cast it, so Forge's `canFaceDownBeShownTo` may legitimately say yes. In that case **check-redaction's face-down rule is a false positive for "may look at" exiles.** The other case is a real leak if the viewer was not Gonti's controller. Not checked further. The cloud session needs to decide this.
- About 15 non-peasant failures (fair-fight, modern-era, synergy, vintage) were not classified.
- The quarantined games are still counted in drafts.jsonl. Only the recordings were moved.
