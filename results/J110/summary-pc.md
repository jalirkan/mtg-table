# J110 — lab metas for Omega, Fair Fight, Peasant and Evan's cube (PC summary, 2026-10-08 06:45 EDT)

**Done, exit 0, every check PASS.** 05:52 → 06:17 EDT (25 min), 7 workers at 1.96 GB peak, no pressure
events. (The job wrote no `summary.md` of its own, so my reading is here.)

## What it did
- **Three metas from the queue** (plain Default-vs-Default lines only, nights 4-5's mixed profiles dropped):
  omega kept 6,682 of 12,566 lines, fair-fight 7,434 of 14,087, peasant 10,956 of 21,195. 0 bad lines.
- **Evan's cube (`evybaby`, 360 cards)** drafted fresh, best-of-one: it met the per-card bar at the FIRST step,
  4,500 drafts (~24 min at 1.8 s a game, 19 turns), so the 6,000 and 7,000 steps never ran. 2 engine errors in
  4,500 games (rate 0), 2 draws.
- **Coverage, all four ship (`mc.ship_count 4`)**, bar = 80 games on 81% of playable non-lands:
  omega 89.2% (median 1,983 games a card), peasant 89.9% (2,772), fair-fight 83.8% (1,695), evybaby 85.2%
  (median 530, p10 44). Evybaby is the thinnest; it clears the bar but a card's evidence is a quarter of the
  others'.
- **Forge 2.0.14 lacks 13 of Evan's 360 cards** (Rescue Girl, Flickering Hound, Generous Revival, Apex
  Witchstalker, Pompous Battlemage, Awaken the Inferno, Fblthp Knows the Way, Theorix Charm, Twisted Fates,
  Twinned Vision, Saheeli Jewel of Avishkar, Primal Witchstalker, Warrior's Blades); drafted around as designed,
  list matches `evy-check.txt`. 6 cards carry `AI:RemAIDeck`; 4 unranked.
- Outputs left in place for the cloud to copy: `omega-cube-180.meta.json`, `fair-fight-cube-180.meta.json`,
  `peasant-cube-180.meta.json`, `evybaby-cube-360.meta.json`, `coverage.json`.
