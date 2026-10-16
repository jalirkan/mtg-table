## D449 — The Synergy Cube is version 3: J135's eight swaps, tested in J137, shipped on Justin's word

*Branch `pc/synergy-v3`. `node tools/decisions.mjs next` gave D448 on 2026-10-16, which PR #155
(`pc/stalled-game-no-exit`, open) holds, so this is D449.*

**2026-10-17**

**Decision.** Justin said "Ship v3" on 2026-10-17. `cubes/synergy-cube-180.md` is now version 3, the
same document as ForgeCoach's `public/cubes/synergy-cube-180.md` (ForgeCoach PR #176):
- the source is pc-results' `results/J135/synergy-cube-180.v3-designed.md` (sha256 `61989547…fab65c`);
- its header reads "version 3 (2026-10-17)";
- its changelog carries J137's result and points at the study.

The lab's copy was still version 1, so it takes v2's three swaps along with v3's eight:
- **v2's three:** Skullclamp, Ledger Shredder and Man-o'-War out; Yawgmoth, Reanimate and Murderous Redcap in.
- **v3's eight out:** Welcoming Vampire, Adeline, Elspeth, Consider, Ponder, Brainstorm, Deep Analysis and Lonis.
- **v3's eight in:** Kor Skyfisher, Militia Bugler, Serra Paragon, Tolarian Terror, Sower of Temptation, Brazen Borrower, Mist Raven and Uro.

**The evidence it shipped on** (pc-results `results/J137/summary.md`; the design and its pre-registered
rule are `study/synergy-v3-design.md`). J137 drafted v2 and v3 1,500 times each on one seed block:

| measure | v2 | v3 |
|---|---|---|
| pair spread, pts | 38.9 [33.7, 44.3] | 27.1 [20.8, 35.1] |
| card flatness, true SD | 7.95 | 5.89 |
| blue decks | 42.5 | 48.4 |
| white decks | 63.8 | 60.1 |
| lowest pair | | RG 35.5 [29.0, 42.6] |

- **Verdict under the strict rule: NOT SHOWN.** The rule needed the two spread intervals not to overlap, and they overlap by 1.4 points. The paired difference, v2 − v3 = +11.8 [+3.2, +19.5], excludes 0.
- **Every prediction held.** Blue rose +5.9, inside its +4 to +8. White fell −3.8, inside its −2 to −6. Each blue deck carries 1.88 fewer card-flow cards.
- **Sower of Temptation** sits +4.8 over its colour and stays under "Cards to watch".
- **Uro** went into only 3.6% of decks.
- **The ship was Justin's call, not the rule's.**

**What was regenerated here.**
- **`tools/cubelab.sh check`** (one engine boot): 180 cards listed, 180 in Forge's database, 0 unsupported, every section at its count.
  - 8 `AI:RemAIDeck`, the same 8 as v2's.
  - 0 cards unranked.
- **`cubes/synergy-cube-180.ratings.tsv`** comes from `tools/cubelab.sh ratings init … --force` (one more boot): 180 ratings, 0 unranked.
  - The 169 cards v1 and v3 share keep their ratings to the digit.
  - The file holds the 11 new cards' Forge ranks. Of the eight, Sower of Temptation is 95.7, Kor Skyfisher 90.4 and Serra Paragon 49.5.
- **`cubes/library/synergy-v2-180.md`** stays as it is: J136's and J137's v2 reference.

**What predates v3.**
- **The Synergy meta ForgeCoach ships** is J075's: 6,980 drafts of version 1. J123's table of shipped metas quotes it.
  - It has no numbers for v2's three cards or v3's eight.
  - Its other numbers were measured beside v1's list.
  - ForgeCoach keeps it and marks it `"stale": true` with a note. A card it lacks reads "The lab has no numbers for this card.", never borrowed numbers.
- **The Synergy rows of any earlier lab run** are v1's or v2's: J111's blue note, J135's evolve, J136's populations.
- **A v3 lab meta** is a job for the runner. Nothing here invents one.

**Rejected.**
- **Waiting for a test that passes the strict rule** (about 2,500 drafts a side, by J137's reading). The rule was the study's, the decision is Justin's, and he made it on the paired evidence.
- **Trimming the outgoing cards' rows out of ForgeCoach's meta.** It would make a v1 run's record inconsistent (its archetypes, pairs and totals name them) and change nothing a v3 draft shows.
