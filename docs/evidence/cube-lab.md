# The cube lab — what was run (2026-10-03, D293–D296)

Branch `c/cube-lab`, off `main`'s `4204bc6`. The engine: the pinned Forge 2.0.14
fat jar (`FORGE_JAR=` a copy in the session scratchpad, `res/` beside it), Node
v22.22.0 for the runs, OpenJDK 21. The machine: 4 cores (`nproc`), a container.

## 1. `check`, both cubes

```bash
tools/cubelab.sh check cubes/synergy-cube-180.md
tools/cubelab.sh check cubes/modern-era-cube-180.md
```

| | Synergy Cube | Modern-Era Cube |
|---|---|---|
| sections as promised | 8 / 8 | 8 / 8 |
| cards in Forge's database | 180 / 180 | 180 / 180 |
| two-faced (looked up by front face) | 3 | 17 (ten Pathways among them) |
| unsupported scripts | 0 | 0 |
| `AI:RemAIDeck` | 8: Prismatic Ending, Viscera Seer, Goblin Bombardment, Faithless Looting, Beast Within, Mishra's Bauble, Chromatic Star, Prophetic Prism | 4: Adanto Vanguard, Prismatic Ending, Embercleave, Beast Within |
| `AI:RemRandomDeck` | 6 | 2 |
| draft rank: CubeCobra list / a set's file / none | 125 / 55 / 0 | 133 / 43 / 4 |
| unranked (start at 40, not Forge's −100) | — | Clearwater, Cragcrown, Brightclimb, Riverglide Pathway |
| ranked only under an older printing than Forge's default | 49 | 36 |

The facts boot took 5.5–10 s (one JVM). `ratings init` wrote both
`cubes/*.ratings.tsv` from these ranks.

## 2. The runs

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 40 --games 3 --jobs 4 --seed 1 \
    --record 3 --out var/cubelab/runs/synergy-grid-40
tools/cubelab.sh run cubes/modern-era-cube-180.md --format winston --drafts 20 --games 3 --jobs 4 --seed 1 \
    --out var/cubelab/runs/modern-winston-20
tools/cubelab.sh report var/cubelab/runs/synergy-grid-40
tools/cubelab.sh report var/cubelab/runs/modern-winston-20
```

| | synergy, grid, 40 drafts | modern, Winston, 20 drafts |
|---|---|---|
| drafting + deckbuilding, all drafts | 0.4 s | 0.3 s |
| matches, 4 workers | 484 s (12.1 s a draft, wall) | 146 s (7.3 s a draft, wall) |
| whole run | 574 s, with 3 recordings (20.1 / 21.5 / 47.2 s each) | 146 s |
| games | 95, all decisive | 47, all decisive |
| timeouts / engine errors / worker restarts | 0 / 0 / 0 | 0 / 0 / 0 |
| a game | 19.5 turns, 18.2 s (four JVMs on four cores) | 18.2 turns, 10.1 s |
| on the play wins | 59% (49–68%) | 51% (37–65%) |
| lab decks / Forge-built | 80 / 0 | 40 / 0 |
| splash / stretched | 11 / 0 | 34 / 10 |
| spells a deck: lab / Forge's builder | 23.7 / 21.9 | 23.1 / 19.9 |
| Forge's builder chose the lab's colours | 43% | 57% |
| `drafts.jsonl` | 632 KB (~16 KB a draft) | 332 KB |
| worker logs | 104 KB | — |
| `report.html` | 63 KB | 58 KB |

The load average ran 8–10 during the four-worker phases (Forge's own pools plus
GC threads), so a game took about twice its single-worker time; per draft the
pool still finished in 12 s of wall time against about 25 s for one worker
alone. Every `onPlayVerified` equalled the forced `onPlay`.

## 3. What the reports say (headline, not verdict)

With 40 and 20 drafts every interval below is wide; these are where to look
next, not conclusions.

**Synergy Cube (grid).** The drafters went white and blue most (WU 20 decks, UG
20, WG 8, WB 7, UB 7); WB won 75% of its games (51–90%), WG 65%, WU 55%, UG 41%,
UR 18% (5–48%) and RG 25% from 11 and 8 games. By primary theme, tokens 65% and
sacrifice 59% led, graveyard 35% trailed. Best cards in deck (≥ 6 decisive
games): Soul Warden 77%, Mentor of the Meek 73% (33–12), Brimaz 72%, Thraben
Inspector 71% (34–14), Elspeth 68%; at the bottom Mana Leak 33% (15–30), Burst
Lightning 30%, Monastery Swiftspear 27%, Elvish Visionary 26%, Third Path
Iconoclast 25% — the spells-matter red cards lose under Forge's AI. 28 cards were
never in a played deck, among them Ephemerate, Reflector Mage, Zulaport
Cutthroat, Winding Constrictor, Mayhem Devil, Delver of Secrets and Village
Rites. Forge's RemAIDeck cards did make decks: Prophetic Prism 37 times (40–49),
Mishra's Bauble 29 (29–39), Chromatic Star 9 (7–13). Being on the play was
worth 59%.

**Modern-Era Cube (Winston).** Winston pools are thin (about 45 cards, half of
the 90 dealt, no colourless filler), so 34 of 40 decks splashed and 10 needed
the stretched second pass; Forge's builder made 19.9 spells a deck on the same
pools. RG 6–0, BR 62%, BG 60%; WU 35% (6–11) and WG 25% trail. Cards: Questing
Beast 13–2, Fury 11–2, Rankle, Liliana of the Veil, Oko and Thundermaw Hellkite
around 75%; Teferi, Time Raveler and Stoneforge Mystic 1–8 each, Gideon, Ally of
Zendikar 3–13, Cryptic Command 2–8 — the cards that ask the most of a pilot do
worst under the AI. Never played: Expressive Iteration, March of Otherworldly
Light. Pick % is 100% for every card in Winston by construction (the report says
so).

## 3b. Two more cubes: Vintage and Pauper (grid, 20 drafts each)

Added on the coordinator's request after the first two runs: `cubes/vintage-cube-180.md`
and `cubes/pauper-cube-180.md`, each with its own theme codes (Vintage: AGG SPL
CTRL GY REAN FAT ART RAMP LND ETB SAC; Pauper: FLK EVA TOK SAC SPL GY ART RMP
AGG), Vintage's lands as group lines with shared tags (`Fetchlands (LND GY): …`),
Pauper's prices after the tags. The parser now keeps exactly a cube's own table
codes, reads group lines, and keys pairs in WUBRG order (which also restored the
Modern report's GW, RW and GU plans).

`check`: both 180 / 180, no unsupported card, none unranked. Vintage: 5
two-faced, 8 `AI:RemAIDeck` (Mystic Confluence, Toxic Deluge, Faithless Looting,
Goblin Welder, Goblin Bombardment, Sylvan Library, Beast Within, Mishra's
Bauble), ranks 155 CubeCobra / 25 set-only. Pauper: 4 two-faced, 9
`AI:RemAIDeck` (Prismatic Strands, Ghostly Flicker, Tortured Existence, Bogardan
Dragonheart, Faithless Looting, Utopia Sprawl, Fireblade Artist, Prophetic
Prism, Chromatic Star), ranks only 76 CubeCobra / **104 set-only** — the mixed
scale of follow-up 3 matters most here.

```bash
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 20 --games 3 --jobs 4 --seed 1 --out var/cubelab/runs/vintage-grid-20
tools/cubelab.sh run cubes/pauper-cube-180.md  --format grid --drafts 20 --games 3 --jobs 4 --seed 1 --out var/cubelab/runs/pauper-grid-20
```

These two ran while another session's four benchmark JVMs shared the machine
(load average 9–12), so their times are slower than the first two's.

| | Vintage, grid, 20 | Pauper, grid, 20 |
|---|---|---|
| matches, 4 workers | 298 s (14.9 s a draft, wall) | 318 s (15.9 s a draft, wall) |
| games / timeouts / engine errors | 51 / 0 / 0 | 49 / 0 / 0 |
| a game | 15.7 turns, 18.9 s | 22.1 turns, 20.8 s |
| on the play wins | 53% (40–66%) | 43% (30–57%) |
| splash / stretched | 6 / 0 | 33 / 0 |
| spells: lab / Forge's builder (same colours) | 23.3 / 21.7 (43%) | 23.2 / 21.9 (25%) |

**Vintage.** WU was drafted most (15 of 40 decks) and won 44%; UR 67% (8–4), RG
67%; BR 36%, BG 20%. Artifacts (24 decks) 55%. Mox Emerald 29–16, Karn, Scion of
Urza 12–5, Craterhoof 8–3; Exhume 2–8, Thoughtseize 2–8, Recurring Nightmare
3–8, Demonic Tutor 5–12, Thalia 6–13 — the reanimation and tutor cards need a
plan Forge's AI does not have. 33 cards never played, among them Balance,
Liliana of the Veil, Dark Confidant, Psychic Frog, Goblin Welder. Mystic
Confluence (RemAIDeck) made 11 decks, 11–18.

**Pauper.** Blue dominates the drafts (UB 14, UR 9, WU 9 of 40 decks); UR 62%
and spells-matter 67% (24–12), blink (FLK, 19 decks) 36%, WU 29%. Rolling
Thunder 8–0, Skewer the Critics 20–5, Fireball 10–2; Militia Bugler 2–14,
Journey to Nowhere 2–10, Momentary Blink 3–9. 41 cards never played (Carrier
Thrall, Ephemerate, Kuldotha Rebirth, Goblin Bushwhacker, …). Prophetic Prism
(RemAIDeck) 16 decks, 12–27.

## 3c. meta.json (D297)

`report` now also writes `meta.json`; for the four runs above it is 127, 99,
104 and 96 KB (synergy, modern, vintage, pauper). On the synergy run: the run's
card-game mean is 0.4994; Mentor of the Meek is 33–12 (0.733) and shrinks to
0.661; the largest archetype is `WU-ETB` (12 decks, 28 games, 64%); 300 pairs
reach six games together (top lift 1.28, Emry + Tireless Tracker); 16-land
decks 48% against 17-land 54%; splashing decks 35% (26 games), 18 points under
the rest.

## 4. The recordings and ForgeCoach

The three `--record 3` games, `frames/draft-{1,2,3}-g1.jsonl` (16 MB together),
were read by ForgeCoach's own parser — a Node script importing
`/home/user/ForgeCoach/src/log.ts` (`readLogBytes`) and `src/decisions.ts`
(`extractDecisions`):

```
OK   draft-1-g1.jsonl: seat 0, 287 frames, 285 states, hello yes, over {"winner":0,…}, last over, 34 decisions extracted
OK   draft-2-g1.jsonl: seat 0, 327 frames, 325 states, hello yes, over {"winner":1,…}, last over, 40 decisions extracted
OK   draft-3-g1.jsonl: seat 0, 498 frames, 496 states, hello yes, over {"winner":1,…}, last over, 57 decisions extracted
```

`tools/check-redaction.mjs` passes the first two and **fails the third** on
rule A3 ("a seat other than the viewer has full cards in `library.cards`"),
from frame 414 on: seat 1 has Courser of Kruphix on the battlefield, which plays
with the top card of its library **revealed** to everyone, so the card is public
and Forge's `canBeShownTo` is right to show it. The checker's A3 knows only
look-at effects (Opposition Agent, Bribery, Gonti). PLAN.md's cube-lab follow-up 1; the recording
is not a leak, and nothing in the bridge changed.

## 5. The gate step and the tests

- `GATE_ONLY="12g-cubelab" GATE_JOBS=1 ./tools/check-all.sh`: green, 27.1 s.
  The same two seeds (7, 8) built decks of the same colours as a smoke run an
  hour earlier (A WU+g vs B UG; A UR+w vs B UG). With the forced coin flip inverted in
  `CubeLab.java` (a planted mutant) it failed: `seed 7: on the play B but turn 1
  was A`.
- `web/test/cubelab.test.ts`: 18 tests, green (16 before `meta.json` and the
  two new cubes). 12g again after `meta.json` was added: green, 58.6 s under
  the shared machine's load.
- `./bridge/build.sh` (the lint, its self-test — 31 rules, 60 firing cases — and
  seven self-tests): green; `CubeLab.java` compiles with `-Xlint:all` and no
  warning.
- `npm --prefix web run build`: green. `npm --prefix web test` under Node
  v24.20.0: `node --test` 1,270 tests, 1,261 pass, 0 fail, 9 skipped; vitest 159.
  Under Node v22.22.0 one test fails —
  `motion.test.ts`'s pre-lane film digest — and fails the same way on a clean
  checkout of `origin/main`, so it is not this lane's (PLAN.md's cube-lab follow-up 5).
- `web/test/claude-md.test.ts`: green, `docs/claude-md-rules.txt` regenerated.
- The full gate was not run.

## 6. Before this lane (the prototype's findings)

The prototype in the session scratchpad (`cubelab/`) established what D293
rests on: Forge 2.0.14's Winston AI picks at random and
`LimitedPlayerAI.determineDeckColor` crashes on its pool; there is no Grid draft;
`CardRanker` with CubeCobra's list ranks 125 of the synergy cube's cards and an
unranked card scores −100; `BoosterDeckBuilder` left to its committed colours
built 11 spells and 29 lands from one pool; `RecordMatch` records one game per
process; a draft plus a best of three took about 24 s of one JVM.

## 7. Recording the played games (D315)

`run --record-all` on this shared 4-core container (load 15–30), synergy cube,
grid, seeds 101–108, one game a draft, `--jobs 2`, off and on alternating:

| run | turns | worker CPU / turn | game thread CPU / turn | wall / turn |
|---|---|---|---|---|
| off 1 | 153 | 1,338 ms | 383 ms | 2,926 ms |
| on 1 | 153 | 1,307 ms | 373 ms | 1,838 ms |
| off 2 | 153 | 1,307 ms | 385 ms | 2,409 ms |
| on 2 | 153 | 1,654 ms | 441 ms | 5,220 ms |

Every seed played the same turns in all four runs, so the recording does not
change the game. Wall time is the load's, not the recorder's; CPU is +12%
(worker) and +6% (game thread) over the two rounds. Recordings: 16 games, 148
KiB a game for both chairs (median 142, max 252), 672 state frames a game;
both chairs of every game passed `check-redaction.mjs`. A third round run
concurrently was stopped at a load of 130 (the container is shared); its
wall-clock overhead on the owner's PC is a PC job.

## 8. J182's checker failures (D502–D504, 2026-11-02)

The lab's atlas night J182 (2026-11-01) failed `tools/check-redaction.mjs` on 11 branch frame logs in 3 units. In
every one, the engine and the bridge were right, and the checker's admitted shapes were too narrow. These are the
logs, under `/home/justin-a/code/lab/data/lab-j182/`, checked with the atlas's `--empty-hand-ok`:

| unit | logs | shape | decision | `main` (`ac07876b`) | `pc/d502-checker-shapes` |
|---|---:|---|---|---|---|
| `b-s04-powered-2504` | 1 | an opponent's spell cast from its hand inside a held batch, targeted on the stack | D504 | 1 FAIL | 1 PASS, `an opponent's cast=2` |
| `b-s06-peasant-2506` | 5 | an opponent's hideaway card shown to the seat that took control of the Watcher | D502 | 5 FAIL | 5 PASS, `1 an opponent's hideaway card` each |
| `b-s10-peasant-2510` | 5 | the opponent's Goat Token, sacrificed, named as a source by Eye for an Eye | D503 | 5 FAIL | 5 PASS, `another seat's token=2` (3 logs) or `=1` (2) |
| **all** | **11** | | | **11 FAIL** | **11 PASS** |

All 11 pass without the flag too. `fixtures/games/` and `fixtures/synthetic/` check byte-for-byte as on `main`. The
checker's self-test passes 205 controls (149 before). The rest of J182's spines were not re-run here.


## 9. J183's overflow: Old Man of the Sea (D506, 2026-11-02)

The lab's atlas night J183 (mtg-table `3275af30`) failed three checks on one spine, `b-s11-legacy-2524` (legacy, spine
seed 2524; decks `s11-legacy-2424`, Old Man of the Sea in deck 1, Preacher and Oko, Thief of Crowns in deck 2), under
`/home/justin-a/code/lab/data/lab-j183/`:

| measure | value |
|---|---|
| branch games | 4,175, all on the random seat, 0 timed out |
| errored (`turns: 0`) | 71: 51 StackOverflowError, 19 *Delayed* StackOverflowError (ReservedStackAccess), 1 NullPointerException in `checkStaticAbilities` |
| errored by decision | d0 9/300, d5 11/450, d6 23/600, d7 5/150, d11 11/700, d12 1/150, d13 11/750; d9, d14–d16 none |
| Old Man on the battlefield at the last state of seat 0's log | 69 of 71 (34 alone, 34 with Preacher, 1 with Tamiyo, Inquisitive Student) |
| Old Man targeted itself earlier in the branch (either seat's log) | 69 of 71 errored; 1,127 of the 4,104 clean branches too |
| `Correcting zone for Old Man of the Sea (4)` lines, six worker logs | 210,644; 66 unbroken runs of 1,210–11,744, clustered at ~1,222 and ~5,860 |
| units hung 1,800 s (`units.jsonl`) | 9 units, 10 attempts: `d15-random-75` hung on both of its attempts and never finished (`atlas.unitsShort` 1) |
| checks failed (`pc-results/results/J183/checks.txt`) | `engine_errors - atlas.branchTimeoutsInStep <= 50` (71, 1); `unit_errors == 0` (1); `atlas.unitsShort == 0` (1) |

One branch traced end to end, `d7-random-o2-b47`: Old Man's only legal target at turn 9 is itself; at turn 14 seat 1's
Oko, Thief of Crowns −5 exchanges a Golem token for it, and the engine stops. The cause in the pinned jar is D506's (a
self-targeted change-controller command that re-enters `controllerChangeZoneCorrection` on the same card before its list
is cleared). Earlier spines with Old Man (J176 s08, J180 s08) and with Rubinia Soulsinger (J176 s12, J181 s03, J182 s07
and s08) had no overflow; Rubinia, whose script takes the same path, is listed on Old Man's measurement (D492's rule).

The draw on the new list: J183's 13 spine and 13 validation pairs redrawn from their seeds give 51 of 52 decks
byte-identical; `s11-legacy-2424` deck 1 changes from its eleventh spell pick (Old Man of the Sea, 1 skip), 15 of its 40
cards by copies. Rubinia Soulsinger is in none of the 52 and takes 0 skips.
