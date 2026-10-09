# J115 — the mulligan search and the target search, two fixed matches against search-v2 (D417)

Written by the PC session, 2026-10-08 23:50 EDT, from `match-J115-mull.json` and `match-J115-targets.json`.
Job 19:08 → 23:32 EDT (4 h 24 m), 7 workers, all 6 checks PASS, both matches complete, 0 draws, 0 errors,
0 timeouts in either. Rule (pre-registered): ADOPT a switch if its match is complete and the 95% interval on
its score has its lower end above 0.5; otherwise NOT SHOWN.

## Mulligan search (`search-v2-mull` vs search-v2) — NOT SHOWN

- **Score 0.492 [0.475, 0.508]**, i.e. **−5.8 Elo [−17.4, +5.8]**; 600 mirrored pairs, 1,200 games, 590 wins.
  The interval includes 0.5, so the switch is not shown to help (and not shown to hurt).
- **How often it changed Forge's answer:** keep/mulligan (`m`) searched 1,422, changed 114, **8.0%**; London
  bottom (`k`) searched 189, changed 38, **20.1%**. So about one opening hand in twelve was mulliganed or kept
  against Forge's instinct, and one bottom-choice in five.
- The ordinary decisions on each side (p/a/b = priority plays, attacks, blocks), searched → changed:
  - mull side: p 19,229 → 3,784 (19.7%), a 6,310 → 920 (14.6%), b 2,392 → 393 (16.4%); budget fallback
    0.47% [0.34, 0.60] (132), rollout errors 73, unmappable 47.
  - search-v2 side: p 19,219 → 3,751 (19.5%), a 6,205 → 888 (14.3%), b 2,400 → 392 (16.3%); budget fallback
    0.54% [0.38, 0.70] (151), rollout errors 60, unmappable 46.

## Target search (`search-v2-targets` vs search-v2) — NOT SHOWN

- **Score 0.510 [0.496, 0.524]**, i.e. **+6.9 Elo [−2.7, +16.6]**; 600 pairs, 1,200 games, 612 wins. The lower
  end sits just under 0.5, so NOT SHOWN under the rule, though the point estimate is on the right side.
- **How often it changed Forge's answer:** targets (`t`) searched 2,700, changed 302, **11.2%**.
- p/a/b, searched → changed:
  - targets side: p 19.6%, a 14.3%, b 17.2% changed; budget fallback 0.63% [0.42, 0.84] (174), rollout errors
    70, unmappable 107 (more than the other three sides; target choices that the search could not map back).
  - search-v2 side: p 19.3%, a 14.4%, b 17.8%; budget fallback 0.44% [0.32, 0.56] (121), rollout errors 61,
    unmappable 40.

## Both on the same deals (decides nothing)

Targets scored 0.510 against mull's 0.492 on identical deals, a gap of 1.8 points whose intervals overlap
almost entirely. If either switch is worth anything it is the target search, at about +7 Elo, and 600 pairs
(±9.6 Elo) cannot resolve a gain that small. Neither switch joins the next search version under the rule.
A longer targets-only match (about 2,400 pairs for ±5 Elo, ~9 h) would settle whether +7 is real.
