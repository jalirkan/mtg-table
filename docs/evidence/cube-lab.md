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
- `web/test/cubelab.test.ts`: 16 tests, green.
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
