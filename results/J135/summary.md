# J135 — Synergy balance, measure and propose: 8 evolve generations of Synergy v2, input vs final batch

Written by the PC session, 2026-10-16, from `balance.json`, `balance.md`, `changelog.md`, `evolve.json`,
`gen-01..08-result.json`/`-stats.json`, `explore-health.json`, `checks.txt`, `metrics.json`, STATUS, the step logs
and the run's own facts cache (pool ratings). Job 00:06:51 → 01:56:50 EDT (1 h 50 m, pilot included), 7 workers,
**every pilot check (36) and every final check (22) PASS**. Pinned mtg-table@0c5de78 (no code change) and
ForgeCoach@3e3b007 (the v2 cube, sha256 checked; `flatness.ts`, imported as it is).

## Verdict
- **No swap.** In none of the 8 generations did discovery find a single candidate (0 of ~326–330 tests each, FDR
  10%), so no confirmation batch was ever played and no card was confirmed dead or dominant.
- **The v3 candidate is v2, unchanged** (`synergy-cube-180.v3-candidate.md`: same 180-card list; only evolve's
  iteration-log lines differ).
- **"Justin decides whether v3 ships" is moot**: there is nothing to ship.

## The before/after table is a noise measurement — say so first
The input batch (v2, seeds 172,000,001–300) and the final batch (seeds 173,000,001–300) drafted **the identical
cube**, same list, same settings, 300 fresh drafts each. Every difference between them is sampling noise, and that
is the most useful thing this job measured:

| measure | input batch | final batch (same cube) | pre-registered reading |
|---|---|---|---|
| pair spread, max − min (pairs ≥ 40 games) | 35.8 (WG − UG) | 42.5 (WB − UG) | change +6.7, 95% −5.8 to +20.6: not shown |
| archetype true SD (`flatness.ts`) | 12.1 [7.8, 19.2] | 16.1 [11.4, 23.8] | not shown |
| card true SD (`flatness.ts`) | 6.4 [5.3, 8.3] | 8.3 [7.1, 10.2] | not shown |

- On one cube, two 300-draft batches moved the pair spread by 6.7 points, the archetype true SD by 4.0 and the card
  true SD by 1.9. All three intervals overlapped, so the rule called nothing, correctly.
- A real cube change would have to move these numbers well past those amounts to be read at 300 drafts a side. Any
  v2-vs-v3 comparison needs batches several times this size, or a paired design (J136's compare).
- The shipped meta's 8.9 / 14.9 sit inside this run's interval for archetypes and at the top for cards. The pilot
  reproduced both exactly from the shipped meta (`repro.json`). The shipped meta is v1 on 6,980 drafts.

## The reading: the imbalance is in the colours, not in single cards
Colour pairs, the two 300-draft batches (decisive games, Wilson 95%):

| pair | input games | input rate | final games | final rate |
|---|---|---|---|---|
| WU | 261 | 59.8 [53.7, 65.5] | 249 | 57.0 [50.8, 63.0] |
| WB | 174 | 64.4 [57.0, 71.1] | 154 | 72.1 [64.5, 78.6] |
| WR | 67 | 64.2 [52.2, 74.6] | 75 | 72.0 [61.0, 80.9] |
| WG | 166 | 66.9 [59.4, 73.6] | 170 | 66.5 [59.1, 73.1] |
| UB | 158 | 39.2 [32.0, 47.0] | 139 | 33.8 [26.5, 42.0] |
| UR | 115 | 41.7 [33.1, 50.9] | 141 | 36.9 [29.4, 45.1] |
| UG | 270 | 31.1 [25.9, 36.9] | 284 | 29.6 [24.6, 35.1] |
| BR | 64 | 42.2 [30.9, 54.4] | 35 | 65.7 [49.1, 79.2] |
| BG | 124 | 46.0 [37.5, 54.7] | 139 | 48.2 [40.1, 56.4] |
| RG | 27 | 48.1 [30.7, 66.0] | 24 | 50.0 [31.4, 68.6] |

**Every white pair is at 57–72% in both batches; every blue pair (UB, UR, UG) is at 30–42%.** WU, white with blue,
sits between them at 57–60%.

All ten batches in this job drafted the same v2 list: eight discovery batches of plain drafts (1,116 drafts) plus
the input and final batches. Pooled over all of them, as a description that decides nothing:
- **Pairs:** WB 70.2% [67.2, 73.1] (913 games), WG 68.9 [66.1, 71.7], WR 68.3 [63.4, 72.8], WU 58.0 [55.5, 60.5],
  BG 46.7, BR 46.0, RG 44.5, UB 36.9 [33.7, 40.3], UR 32.6 [29.3, 36.1], UG 31.5 [29.3, 33.9] (1,595 games).
- **Colours** (8 discovery batches): W 65.4% [63.5, 67.2], B 51.6, G 47.1, R 42.3, U 41.0 [39.2, 42.7].
- The ranking agrees with ForgeCoach's shipped v1 meta.

**Why evolve cannot see it.** Since D377 a card's win rate is tested against its own colour pairs' rate (shrunk
toward the batch mean, its own matches left out).
- A white card is judged against about 60%, a blue card against about 43%, so the colour effect is absorbed.
- Pooled over 8 discovery batches, white cards win 66–69% against their pairs' ~59–62%, 6–8 points over. At ~170
  games a card a generation that does not pass Benjamini–Hochberg in a family of ~330.
- Blue cards lose 37–41% against ~43%.
- Evolve finds a card out of line *within* its colours; this cube has none it could confirm.

### What the generations flagged (all `watch`, no candidate, so no confirmation)
Leads per generation: 4, 8, 6, 11, 7, 8, 9, 7. Each changelog verdict says "insufficient data", and estimates that
690–2,099 drafts a generation would find half.
- **Conclave Mentor**: 6 of 8 generations, always on a handful of games (generation 8: played in 2 of 20 on-colour
  pools, won 2 of 2). A low deck rate, not evidence of strength.
- **Flame Slash**: 4 of 8 (three lean-dead, one lean-dominant; generation 8: 9 of 33 pools, won 3 of 11).
- **Elspeth**: 3 of 8.
- **Twice each:** Restoration Angel, Reveillark, Reflector Mage, Woe Strider, Kari Zev, Hanweir Garrison, Lightning
  Helix, Kitesail Freebooter, Legion Warboss, Unburial Rites. Once each: 26 more.
- Of the doc's "Cards to watch": **Yawgmoth** once (generation 8: 64 of 66 on-colour pools, won 58 of 100, 0.58
  [0.48, 0.68] against its pairs' 0.44) and **Chandra** once. Grumgully, Reanimate, Archon, Mana Leak and Remand
  never moved past a lead.

Other statuses per generation: rating-limited 31–38, ai-limited 12, builder-limited 20 (the lands), note-keep 2.

### Exploration (D356), pooled over 8 generations
- **Share:** 484 of 1,600 drafts explored (0.302, z 0.22); 761 forced decks against 763.3 expected (z −0.08).
- **Pooled delta:** +0.005 ± 0.016; choice-deck rating balance −0.025.
- **Errors and timeouts:** engine error rate explored 0%, plain 0.27%; timeouts 0.17% and 0.07%.
- **Verdicts:** 69 targets: **0 hold their own, 0 weak, 34 undecided, 35 too few.**
- **Nearest a verdict, all undecided:** Conclave Mentor −0.20 (−0.42 to +0.02), Winding Constrictor +0.18 (−0.04 to
  +0.40), Kitesail Freebooter −0.15 (−0.32 to +0.01), Reflector Mage +0.13, Unsummon +0.12. No direction read in.

### Human-test candidates for the weakest archetypes (`balance.json`)
`AI:RemoveDeck:All` pool cards, never added without a `try` note, by fit: Gitaxian Probe (U), Mystic Confluence (U),
Tamiyo, Collector of Tales (UG), Ghostly Flicker (U), Masticore, Urza's Bauble, Embercleave, Manifold Key, Memory
Jar, Tortured Existence. The top four are all blue, matching the colour reading.

## J120's pool bug: what it did and did not change
J120 left the cube's own cards out of its seed pool. Evolve reads a cube card's rating, mana value, fixing and AI
flag from the pool, so J120 rated every cube card 40 and flagged none. **Its 40 "rating-limited" rows were an
artefact in their stated reason** (every one says "rated 40"). With the cube in the pool, on Forge's real ranks:
- **30 of the 40 are still rating-limited:** real ranks 9.4–57.1, under 60 anyway (Soul-Scar Mage 9.4, Ephemerate
  22.9, Mayhem Devil 33.9, Fatal Push 51).
- **10 were mislabelled:** 6 are `ai-limited` (Beast Within, Chromatic Star, Intangible Virtue, Prismatic Ending,
  Soulherder, Viscera Seer), 2 are `watch` (Conclave Mentor, Kitesail Freebooter), Bloodghast is `ok`, Winding
  Constrictor is `note-keep`.
- **New:** Prized Amalgam and Experimental Synthesizer are rating-limited.

The fix made dead cuts possible. None happened, because every card rated 60 or more was played when on colour.

## Recommendation (NOT pre-registered: a reading of this job, for Justin and the cloud)
The automatic editor will not fix a colour-level imbalance. Two steps follow:
- **A designed v3** that moves strength from white to blue (the PC session is drafting one as a candidate:
  `synergy-cube-180.v3-designed.md` beside this file, with `study/synergy-v3-design.md`).
- **Test v2 against v3 head-to-head** under J136's compare. It takes a v3 only when `results/J135/APPROVED` exists,
  which Justin's word writes.

**White's strongest payoffs** (pooled over 8 discovery batches, ≥ 40 games, by shrunk win rate; cut candidates for
Justin to choose from):

| card | games | won | shrunk | its pairs |
|---|---|---|---|---|
| Soul Warden | 535 | 69.2 | 68.5 | 61.7 |
| Luminarch Aspirant | 1,446 | 67.6 | 67.4 | 58.9 |
| Adeline, Resplendent Cathar | 1,341 | 67.3 | 67.1 | 59.6 |
| Elspeth, Sun's Champion | 1,332 | 67.0 | 66.8 | 60.0 |
| Sun Titan | 1,199 | 66.9 | 66.6 | 61.1 |
| Welcoming Vampire | 1,385 | 66.7 | 66.5 | 59.3 |
| Lunarch Veteran | 993 | 66.8 | 66.4 | 61.1 |
| Brimaz, King of Oreskos | 1,120 | 66.6 | 66.3 | 60.4 |
| Lingering Souls (WB) | 1,261 | 66.4 | 66.1 | 60.4 |

White is uniformly strong: it is the depth of the tokens and lifegain package, not one card. Adeline, Elspeth and
Brimaz are the standalone token engines, and the doc already offers Elspeth up.

**Blue's weakest:** Mulldrifter 37.3, Emry 39.2, Brainstorm 39.3, Talrand 39.4, Thought Scour 39.5, Consider 39.7,
Mana Leak 39.7. In gold: Saheeli 30.8, Third Path Iconoclast 33.0, Risen Reef 35.2, Baleful Strix 36.5. Blue lacks
threats and payoffs.

**Blue strength the notes allow** (pool candidates by Forge rank: nonland, not AI:All, not cut by a note). A
designer's power-band filter comes first: keep the Vintage-level ones out (Hullbreacher, Urza, Jace TMS, Time
Spiral, Brain Freeze, Echo of Eons). The ones that fit the themes:
- **Mono blue:** Tishana's Tidebinder (95.7), Memory Lapse (98.4, the doc's own "add Memory Lapse"), Memory Deluge
  (95.5), Sower of Temptation (95.7), Chart a Course (92.0), Hard Evidence (89.3), Preordain (85.3).
- **UB:** Psychic Frog (98.7).
- **UR:** Prismari Command (91.7), Vivi Ornitier (85.3), Lutri (97.9).
- **UG:** the allowed UG cards rank low (Uro 54.2, Mystic Snake 44.0, Wistfulness 44.9), so UG's help has to come
  from mono-colour cards.

## Totals and health
| item | value |
|---|---|
| Wall time | 1 h 50 m |
| Pilot | 188 s, 3 workers |
| Input batch | 300 drafts in 15.4 min (3.1 s a draft) |
| Evolve | 1,600 drafts in 79 min (~1,215 drafts an hour) |
| Final batch | 300 drafts in 12.2 min (2.4 s a draft) |
| Read | 13 s |
| Drafts | 2,216 (0 confirmation) |
| Workers | 7, peak 2.36 GB a worker |
| Pressure events | 0 for this job |

J132 was stopped by the OOM killer around midnight and J131 was restarted at 01:56 after a memory stop (the PC
session's own agents were running gates and engine dry runs beside the runner; a rule now limits that). J135
started at 00:06 into the room that left.

| batch | games | engine errors | timeouts | draws |
|---|---|---|---|---|
| Evolve | 3,857 | 4 (0.19%) | 4 | 7 |
| Input | 713 decisive | 0 | — | — |
| Final | 705 decisive | 1 (0.33%) | — | — |

Evolve's games averaged 6.85 s (median 2.52 s) and 19.2 turns; the worst design effect was 1.20. All 22 final
checks PASS (`checks.txt`).

**Justin decides** whether to commission a designed v3. This run gives him nothing to ship. It gives the colour
reading above, and a measured noise floor any v2-vs-v3 test has to beat.
