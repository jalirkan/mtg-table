# The scenery storyboard walk

Generated 2026-11-02T13:11:14.913Z by `src/ambience/storyboard.test.ts` (ForgeCoach branch `pc/storyboard`): `STORYBOARD_REPORT=<dir> npx vitest run src/ambience/storyboard.test.ts`. The JSON beside this file has every state with no dual.

**What was walked.** 79,525 mana states: every vector of 0–6 basics in each of W U B R G (16,806), in three arrival orders -- WUBRG, its reverse, and heaviest last (an order giving the same arrival walked once: 48,275 states) -- and each vector of 0–4 a colour plus one dual of any of the ten pairs, arriving WUBRG (31,250). Each through the board's own functions (makeup.ts, layout.ts `halfLayout`, pairfull.ts `pairFullPlan` / `pairFullCandidates` / `pairFullChoice`, the cut-out rule, pairs.ts `pairBands`, bridges.ts) with pack-v9.1, pairs-v3.1 without the flag and the tagged pairs-v7.1 under `?pairfull=1`; at a desktop (1600 px, half ≈ 5 : 1) and a phone (375 px: phone-width, half ≈ 2.1 : 1). Every picture is taken as loaded (the load gate's hold is not walked). The caption is `#ambience`'s (AmbiencePage `bandCaption`); the board itself prints none.

**Visible** means something on the half is of that colour: a panel, the pair picture (a seam cell or a stage picture: both its colours), a painted-in third colour, a cut-out, a band, a motif or a bridge. **Invisible**: the colour has lands and none of these.

## States with an invisible colour, by colours

| colours | default/desktop | default/phone | pairfull/desktop | pairfull/phone |
|---|---|---|---|---|
| 1 | 0 / 30 (0.0%) | 0 / 30 (0.0%) | 0 / 30 (0.0%) | 0 / 30 (0.0%) |
| 2 | 0 / 970 (0.0%) | 0 / 970 (0.0%) | 0 / 970 (0.0%) | 0 / 970 (0.0%) |
| 3 | 0 / 8,720 (0.0%) | 0 / 8,720 (0.0%) | 0 / 8,720 (0.0%) | 8,720 / 8,720 (100.0%) |
| 4 | 30,735 / 30,735 (100.0%) | 30,735 / 30,735 (100.0%) | 30,735 / 30,735 (100.0%) | 30,735 / 30,735 (100.0%) |
| 5 | 39,070 / 39,070 (100.0%) | 39,070 / 39,070 (100.0%) | 39,070 / 39,070 (100.0%) | 39,070 / 39,070 (100.0%) |
| no dual | 41,805 / 48,275 (86.6%) | 41,805 / 48,275 (86.6%) | 41,805 / 48,275 (86.6%) | 47,525 / 48,275 (98.4%) |
| one dual | 28,000 / 31,250 (89.6%) | 28,000 / 31,250 (89.6%) | 28,000 / 31,250 (89.6%) | 31,000 / 31,250 (99.2%) |
| **all** | 69,805 / 79,525 (87.8%) | 69,805 / 79,525 (87.8%) | 69,805 / 79,525 (87.8%) | 78,525 / 79,525 (98.7%) |

## …by the land count of the colour that shows nothing

For each state with an invisible colour, the fewest lands any invisible colour has (a dual counts ½): a one-land splash that shows nothing, against a four-land colour that shows nothing.

| fewest lands hidden | default/desktop | default/phone | pairfull/desktop | pairfull/phone |
|---|---|---|---|---|
| 0.5 | 10,080 | 10,080 | 10,080 | 11,160 |
| 1 | 32,837 | 32,837 | 32,837 | 35,737 |
| 1.5 | 3,780 | 3,780 | 3,780 | 4,410 |
| 2 | 14,632 | 14,632 | 14,632 | 16,522 |
| 2.5 | 1,000 | 1,000 | 1,000 | 1,300 |
| 3 | 5,468 | 5,468 | 5,468 | 6,568 |
| 3.5 | 120 | 120 | 120 | 210 |
| 4 | 1,583 | 1,583 | 1,583 | 2,113 |
| 5 | 293 | 293 | 293 | 473 |
| 6 | 12 | 12 | 12 | 32 |

**default/desktop**, colours × fewest lands hidden:

| colours | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | 4,320 | 13,095 | 1,890 | 6,690 | 600 | 2,880 | 90 | 955 | 205 | 10 |
| 5 | 5,760 | 19,742 | 1,890 | 7,942 | 400 | 2,588 | 30 | 628 | 88 | 2 |

**default/phone**, colours × fewest lands hidden:

| colours | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | 4,320 | 13,095 | 1,890 | 6,690 | 600 | 2,880 | 90 | 955 | 205 | 10 |
| 5 | 5,760 | 19,742 | 1,890 | 7,942 | 400 | 2,588 | 30 | 628 | 88 | 2 |

**pairfull/desktop**, colours × fewest lands hidden:

| colours | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | 4,320 | 13,095 | 1,890 | 6,690 | 600 | 2,880 | 90 | 955 | 205 | 10 |
| 5 | 5,760 | 19,742 | 1,890 | 7,942 | 400 | 2,588 | 30 | 628 | 88 | 2 |

**pairfull/phone**, colours × fewest lands hidden:

| colours | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | 1,080 | 2,900 | 630 | 1,890 | 300 | 1,100 | 90 | 530 | 180 | 20 |
| 4 | 4,320 | 13,095 | 1,890 | 6,690 | 600 | 2,880 | 90 | 955 | 205 | 10 |
| 5 | 5,760 | 19,742 | 1,890 | 7,942 | 400 | 2,588 | 30 | 628 | 88 | 2 |

## The rules that hide a colour

| rule | states | smallest state | what the half draws there | hidden | smallest with no dual | drawn there | hidden there |
|---|---|---|---|---|---|---|---|
| `default/desktop/dropped` | 69,805 | B1 G1 +U/R dual (arrived U B R G) | island s1 \| swamp s1 \| forest s1 | R:dropped | U1 B1 R1 G1 (arrived G R B U) | forest s1 \| mountain s1 \| swamp s1 | U:dropped |
| `default/phone/dropped` | 69,805 | B1 G1 +U/R dual (arrived U B R G) | island s1 \| swamp s1 \| forest s1 | R:dropped | U1 B1 R1 G1 (arrived G R B U) | forest s1 \| mountain s1 \| swamp s1 | U:dropped |
| `pairfull/desktop/dropped` | 69,805 | B1 G1 +U/R dual (arrived U B R G) | forest+swamp cell 1x1 +U [s1x1+UL-panorama] | R:dropped | U1 B1 R1 G1 (arrived G R B U) | forest+mountain cell 1x1 +B [s1x1+BL-panorama] | U:dropped |
| `pairfull/phone/dropped` | 69,805 | B1 G1 +U/R dual (arrived U B R G) | forest+swamp cell 1x1 [s1x1-panorama-phone] | U:third-on-cell-phone R:dropped | U1 B1 R1 G1 (arrived G R B U) | forest+mountain cell 1x1 [s1x1-panorama-phone] | B:third-on-cell-phone U:dropped |
| `pairfull/phone/third-on-cell-phone` | 78,525 | B1 +R/G dual (arrived B R G) | mountain+swamp cell 1x1 [s1x1-panorama-phone] | G:third-on-cell-phone | B1 R1 G1 (arrived B R G) | mountain+swamp cell 1x1 [s1x1-panorama-phone] | G:third-on-cell-phone |

- `third-on-cell-phone`: the third colour on a seam cell shows nothing on a phone: the cell has it painted in for the desktop, but no painted cell in pairs-v7.1 has a phone picture, and spec 1.18 draws the plain cell's phone picture rather than fall back to the stage's painted picture (which has one).
- `dropped`: a fourth or fifth colour shows nothing: makeup.ts keeps the three heaviest by their own weights (a tie: the colour showing, then the earlier arrival) and "the rest show nothing" -- no panel, no share of the pan, no element.

The test's allow-list today (`KNOWN_GAPS`): `default/desktop/dropped`, `default/phone/dropped`, `pairfull/desktop/dropped`, `pairfull/phone/dropped`, `pairfull/phone/third-on-cell-phone`.

## Five colours: a side with 1–6 of every colour

Every vector with all five colours on 1–6 lands (23,070 states with the orders).

| mode | colours showing nothing | what the half draws |
|---|---|---|
| default/desktop | 2: 23,070 | 3 panels: 23,070 |
| default/phone | 2: 23,070 | 3 panels: 23,070 |
| pairfull/desktop | 2: 23,070 | pair cell + painted third: 23,070 |
| pairfull/phone | 3: 23,070 | pair cell: 23,070 |

Some five-colour sides, arriving WUBRG:

| side | default/desktop: drawn / hidden | default/phone: drawn / hidden | pairfull/desktop: drawn / hidden | pairfull/phone: drawn / hidden |
|---|---|---|---|---|
| W1 U1 B1 R1 G1 | plains s1 \| island s1 \| swamp s1 / **R:dropped G:dropped** | plains s1 \| island s1 \| swamp s1 / **R:dropped G:dropped** | island+plains cell 1x1 +B [s1x1+BR-panorama] / **R:dropped G:dropped** | island+plains cell 1x1 [s1x1-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W2 U2 B2 R2 G2 | plains s2 \| island s2 \| swamp s2 / **R:dropped G:dropped** | plains s2 \| island s2 \| swamp s2 / **R:dropped G:dropped** | island+plains cell 2x2 +B [s2x2+BR-panorama] / **R:dropped G:dropped** | island+plains cell 2x2 [s2x2-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W3 U3 B3 R3 G3 | plains s3 \| island s3 \| swamp s3 / **R:dropped G:dropped** | plains s3 \| island s3 \| swamp s3 / **R:dropped G:dropped** | island+plains cell 3x3 +B [s3x3+BR-panorama] / **R:dropped G:dropped** | island+plains cell 3x3 [s3x3-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W4 U4 B4 R4 G4 | plains s4 \| island s4 \| swamp s4 / **R:dropped G:dropped** | plains s4 \| island s4 \| swamp s4 / **R:dropped G:dropped** | island+plains cell 4x4 +B [s4x4+BR-panorama] / **R:dropped G:dropped** | island+plains cell 4x4 [s4x4-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W5 U5 B5 R5 G5 | plains s5 \| island s5 \| swamp s5 / **R:dropped G:dropped** | plains s5 \| island s5 \| swamp s5 / **R:dropped G:dropped** | island+plains cell 5x5 +B [s5x5+BR-panorama] / **R:dropped G:dropped** | island+plains cell 5x5 [s5x5-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W6 U6 B6 R6 G6 | plains s6 \| island s6 \| swamp s6 / **R:dropped G:dropped** | plains s6 \| island s6 \| swamp s6 / **R:dropped G:dropped** | island+plains cell 6x6 +B [s6x6+BR-panorama] / **R:dropped G:dropped** | island+plains cell 6x6 [s6x6-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W1 U2 B3 R4 G5 | swamp s3 \| mountain s4 \| forest s5 / **W:dropped U:dropped** | swamp s3 \| mountain s4 \| forest s5 / **W:dropped U:dropped** | forest+mountain cell 5x4 +B [s5x4+BL-panorama] / **W:dropped U:dropped** | forest+mountain cell 5x4 [s5x4-panorama-phone] / **W:dropped U:dropped B:third-on-cell-phone** |
| W6 U5 B4 R3 G2 | plains s6 \| island s5 \| swamp s4 / **R:dropped G:dropped** | plains s6 \| island s5 \| swamp s4 / **R:dropped G:dropped** | island+plains cell 5x6 +B [s5x6+BR-panorama] / **R:dropped G:dropped** | island+plains cell 5x6 [s5x6-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W1 U1 B1 R1 G6 | plains s1 \| island s1 \| forest s6 / **B:dropped R:dropped** | plains s1 \| island s1 \| forest s6 / **B:dropped R:dropped** | forest+plains cell 5x6 (clamped) +U [s5x6+UR-panorama] / **B:dropped R:dropped** | forest+plains cell 5x6 (clamped) [s5x6-panorama-phone] / **U:third-on-cell-phone B:dropped R:dropped** |
| W6 U6 B1 R1 G1 | plains s6 \| island s6 \| swamp s1 / **R:dropped G:dropped** | plains s6 \| island s6 \| swamp s1 / **R:dropped G:dropped** | island+plains cell 6x6 +B [s6x6+BR-panorama] / **R:dropped G:dropped** | island+plains cell 6x6 [s6x6-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W6 U6 B6 R1 G1 | plains s6 \| island s6 \| swamp s6 / **R:dropped G:dropped** | plains s6 \| island s6 \| swamp s6 / **R:dropped G:dropped** | island+plains cell 6x6 +B [s6x6+BR-panorama] / **R:dropped G:dropped** | island+plains cell 6x6 [s6x6-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |
| W2 U2 B2 R2 G3 | plains s2 \| island s2 \| forest s3 / **B:dropped R:dropped** | plains s2 \| island s2 \| forest s3 / **B:dropped R:dropped** | forest+plains cell 2x3 +U [s2x3+UR-panorama] / **B:dropped R:dropped** | forest+plains cell 2x3 [s2x3-panorama-phone] / **U:third-on-cell-phone B:dropped R:dropped** |
| W3 U3 B3 R2 G2 | plains s3 \| island s3 \| swamp s3 / **R:dropped G:dropped** | plains s3 \| island s3 \| swamp s3 / **R:dropped G:dropped** | island+plains cell 3x3 +B [s3x3+BR-panorama] / **R:dropped G:dropped** | island+plains cell 3x3 [s3x3-panorama-phone] / **B:third-on-cell-phone R:dropped G:dropped** |

## Justin’s board: Island 2, Swamp 2, Mountain 2, Forest 3 (arrived U B R G)

| mode | visible | invisible | drawn | caption |
|---|---|---|---|---|
| default/desktop | UBG | R:dropped | island s2 \| swamp s2 \| forest s3 | Underground Sea (Watery Grave): motif 20% wide, 0 duals, pair stage 1   Bayou (Overgrown Tomb): motif 20% wide, 0 duals, pair stage 1 |
| default/phone | UBG | R:dropped | island s2 \| swamp s2 \| forest s3 | Underground Sea (Watery Grave): motif 20% wide, 0 duals, pair stage 1   Bayou (Overgrown Tomb): motif 20% wide, 0 duals, pair stage 1 |
| pairfull/desktop | UBG | R:dropped | forest+island cell 2x3 +B [s2x3+BR-panorama] | Tropical Island (Breeding Pool), whole half: island 40% \| forest 60%, island s2 \| forest s3, seam 2x3; B painted in, on forest's ground |
| pairfull/phone | UG | B:third-on-cell-phone R:dropped | forest+island cell 2x3 [s2x3-panorama-phone] | Tropical Island (Breeding Pool), whole half: island 40% \| forest 60%, island s2 \| forest s3, seam 2x3 |

## One land more: does the half switch picture?

Every state with no dual, plus one basic land of each colour that has fewer than six, with what the half showed before as the tie-breaker (MakeupMemory). A **pair flip** is the whole half switching from one pair picture to another; **a colour lost** is a colour on screen before the land and not after it.

| mode | steps | pair flips | a colour lost |
|---|---|---|---|
| default/desktop | 206,555 | 0 (0.0%) | 15,105 (7.3%) |
| default/phone | 206,555 | 0 (0.0%) | 15,105 (7.3%) |
| pairfull/desktop | 206,555 | 15,745 (7.6%) | 15,105 (7.3%) |
| pairfull/phone | 206,555 | 15,745 (7.6%) | 15,745 (7.6%) |

**pairfull/desktop, flips by colours after the land:** 1 colours 0/25 (0.0%); 2 colours 0/1,320 (0.0%); 3 colours 1,300/16,460 (7.9%); 4 colours 5,800/73,890 (7.8%); 5 colours 8,645/114,860 (7.5%).

Smallest flips (pairfull/desktop):

| after the land | added | before | after |
|---|---|---|---|
| B1 R1 G2 (arrived B R G) | G | mountain+swamp cell 1x1 +G [s1x1+GL-panorama] | forest+swamp cell 1x2 +R [s1x2+RR-panorama] |
| B2 R1 G1 (arrived G R B) | B | forest+mountain cell 1x1 +B [s1x1+BL-panorama] | forest+swamp cell 2x1 +R [s2x1+RL-panorama] |
| U1 B1 G2 (arrived U B G) | G | island+swamp cell 1x1 +G [s1x1+GL-panorama] | forest+island cell 1x2 +B [s1x2+BR-panorama] |
| U1 B1 R2 (arrived U B R) | R | island+swamp cell 1x1 +R [s1x1+RL-panorama] | island+mountain cell 1x2 +B [s1x2+BR-panorama] |
| U1 R1 G2 (arrived U R G) | G | island+mountain cell 1x1 +G [s1x1+GL-panorama] | forest+island cell 1x2 +R [s1x2+RR-panorama] |
| U2 B1 G1 (arrived G B U) | U | forest+swamp cell 1x1 +U [s1x1+UR-panorama] | forest+island cell 2x1 +B [s2x1+BL-panorama] |
| U2 B1 R1 (arrived R B U) | U | mountain+swamp cell 1x1 +U [s1x1+UR-panorama] | island+mountain cell 2x1 +B [s2x1+BL-panorama] |
| U2 R1 G1 (arrived G R U) | U | forest+mountain cell 1x1 +U [s1x1+UL-panorama] | forest+island cell 2x1 +R [s2x1+RL-panorama] |

**pairfull/phone, flips by colours after the land:** 1 colours 0/25 (0.0%); 2 colours 0/1,320 (0.0%); 3 colours 1,300/16,460 (7.9%); 4 colours 5,800/73,890 (7.8%); 5 colours 8,645/114,860 (7.5%).

Smallest flips (pairfull/phone):

| after the land | added | before | after |
|---|---|---|---|
| B1 R1 G2 (arrived B R G) | G | mountain+swamp cell 1x1 [s1x1-panorama-phone] | forest+swamp cell 1x2 [s1x2-panorama-phone] |
| B2 R1 G1 (arrived G R B) | B | forest+mountain cell 1x1 [s1x1-panorama-phone] | forest+swamp cell 2x1 [s2x1-panorama-phone] |
| U1 B1 G2 (arrived U B G) | G | island+swamp cell 1x1 [s1x1-panorama-phone] | forest+island cell 1x2 [s1x2-panorama-phone] |
| U1 B1 R2 (arrived U B R) | R | island+swamp cell 1x1 [s1x1-panorama-phone] | island+mountain cell 1x2 [s1x2-panorama-phone] |
| U1 R1 G2 (arrived U R G) | G | island+mountain cell 1x1 [s1x1-panorama-phone] | forest+island cell 1x2 [s1x2-panorama-phone] |
| U2 B1 G1 (arrived G B U) | U | forest+swamp cell 1x1 [s1x1-panorama-phone] | forest+island cell 2x1 [s2x1-panorama-phone] |
| U2 B1 R1 (arrived R B U) | U | mountain+swamp cell 1x1 [s1x1-panorama-phone] | island+mountain cell 2x1 [s2x1-panorama-phone] |
| U2 R1 G1 (arrived G R U) | U | forest+mountain cell 1x1 [s1x1-panorama-phone] | forest+island cell 2x1 [s2x1-panorama-phone] |

Smallest steps that take a colour off screen (default/desktop):

| after the land | added | lost | before | after |
|---|---|---|---|---|
| U1 B1 R1 G2 (arrived U B R G) | G | R | UBR island s1 \| swamp s1 \| mountain s1 | island s1 \| swamp s1 \| forest s2 |
| U2 B1 R1 G1 (arrived G R B U) | U | B | GRB forest s1 \| mountain s1 \| swamp s1 | forest s1 \| mountain s1 \| island s2 |
| W1 B1 R1 G2 (arrived W B R G) | G | R | WBR plains s1 \| swamp s1 \| mountain s1 | plains s1 \| swamp s1 \| forest s2 |
| W1 U1 B1 G2 (arrived W U B G) | G | B | WUB plains s1 \| island s1 \| swamp s1 | plains s1 \| island s1 \| forest s2 |
| W1 U1 B1 R2 (arrived W U B R) | R | B | WUB plains s1 \| island s1 \| swamp s1 | plains s1 \| island s1 \| mountain s2 |
| W1 U1 R1 G2 (arrived W U R G) | G | R | WUR plains s1 \| island s1 \| mountain s1 | plains s1 \| island s1 \| forest s2 |

Smallest steps that take a colour off screen (default/phone):

| after the land | added | lost | before | after |
|---|---|---|---|---|
| U1 B1 R1 G2 (arrived U B R G) | G | R | UBR island s1 \| swamp s1 \| mountain s1 | island s1 \| swamp s1 \| forest s2 |
| U2 B1 R1 G1 (arrived G R B U) | U | B | GRB forest s1 \| mountain s1 \| swamp s1 | forest s1 \| mountain s1 \| island s2 |
| W1 B1 R1 G2 (arrived W B R G) | G | R | WBR plains s1 \| swamp s1 \| mountain s1 | plains s1 \| swamp s1 \| forest s2 |
| W1 U1 B1 G2 (arrived W U B G) | G | B | WUB plains s1 \| island s1 \| swamp s1 | plains s1 \| island s1 \| forest s2 |
| W1 U1 B1 R2 (arrived W U B R) | R | B | WUB plains s1 \| island s1 \| swamp s1 | plains s1 \| island s1 \| mountain s2 |
| W1 U1 R1 G2 (arrived W U R G) | G | R | WUR plains s1 \| island s1 \| mountain s1 | plains s1 \| island s1 \| forest s2 |

Smallest steps that take a colour off screen (pairfull/desktop):

| after the land | added | lost | before | after |
|---|---|---|---|---|
| U1 B1 R1 G2 (arrived U B R G) | G | R | UBR island+swamp cell 1x1 +R [s1x1+RL-panorama] | forest+island cell 1x2 +B [s1x2+BR-panorama] |
| U2 B1 R1 G1 (arrived G R B U) | U | B | GRB forest+mountain cell 1x1 +B [s1x1+BL-panorama] | forest+island cell 2x1 +R [s2x1+RL-panorama] |
| W1 B1 R1 G2 (arrived W B R G) | G | R | WBR plains+swamp cell 1x1 +R [s1x1+RR-panorama] | forest+plains cell 1x2 +B [s1x2+BR-panorama] |
| W1 U1 B1 G2 (arrived W U B G) | G | B | WUB island+plains cell 1x1 +B [s1x1+BR-panorama] | forest+plains cell 1x2 +U [s1x2+UR-panorama] |
| W1 U1 B1 R2 (arrived W U B R) | R | B | WUB island+plains cell 1x1 +B [s1x1+BR-panorama] | mountain+plains cell 1x2 +U [s1x2+UR-panorama] |
| W1 U1 R1 G2 (arrived W U R G) | G | R | WUR island+plains cell 1x1 +R [s1x1+RR-panorama] | forest+plains cell 1x2 +U [s1x2+UR-panorama] |

Smallest steps that take a colour off screen (pairfull/phone):

| after the land | added | lost | before | after |
|---|---|---|---|---|
| B1 R1 G2 (arrived B R G) | G | R | BR mountain+swamp cell 1x1 [s1x1-panorama-phone] | forest+swamp cell 1x2 [s1x2-panorama-phone] |
| B2 R1 G1 (arrived G R B) | B | R | GR forest+mountain cell 1x1 [s1x1-panorama-phone] | forest+swamp cell 2x1 [s2x1-panorama-phone] |
| U1 B1 G2 (arrived U B G) | G | B | UB island+swamp cell 1x1 [s1x1-panorama-phone] | forest+island cell 1x2 [s1x2-panorama-phone] |
| U1 B1 R2 (arrived U B R) | R | B | UB island+swamp cell 1x1 [s1x1-panorama-phone] | island+mountain cell 1x2 [s1x2-panorama-phone] |
| U1 R1 G2 (arrived U R G) | G | R | UR island+mountain cell 1x1 [s1x1-panorama-phone] | forest+island cell 1x2 [s1x2-panorama-phone] |
| U2 B1 G1 (arrived G B U) | U | B | GB forest+swamp cell 1x1 [s1x1-panorama-phone] | forest+island cell 2x1 [s2x1-panorama-phone] |

## Captions

No state has a caption that names a colour the half does not draw, or (where there is a caption) leaves out one it draws.

A side with no caption (one colour, or no band) is not counted as leaving anything out: the caption describes bands and pair pictures only.
