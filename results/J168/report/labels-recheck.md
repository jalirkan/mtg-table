# Labels re-read with the lost-spell branches taken out

Random map only (no affected spine has a Forge map). `atlas` = atlas.json; `drop` = the same paired regret over the branch indices where no option's branch lost a spell (bin/relabel2.py, my own 10,000-draw bootstrap: points match atlas.json exactly, intervals within ~0.5 point); `dead` = an option whose own forced cast was lost in at least half its branches taken out. Control = the share of 200 random drops of the same number of rows that keep the label confident with the same best (2,000 draws each). s07 is Headliner Scarlett's dropped trigger, Forge's own behaviour (it happens in the Forge map too), shown for completeness. Every decision with no tainted row is omitted. Full rows: labels-recheck.jsonl.

| spine d | kind k | rows tainted | atlas | drop | dead option(s) | reading |
|---|---|---|---|---|---|---|
| s02 d2 | p 2 | 1/200 | o0 0.0 [0.0, 7.5] | o0 0.0 [0.0, 7.5] (n 199) |  | unchanged |
| s02 d3 | a 2 | 1/200 | o1 13.2 [5.2, 21.2] **conf** | o1 13.3 [5.3, 21.4] **conf** (n 199) |  | holds |
| s02 d4 | p 2 | 3/200 | o0 0.0 [0.0, 0.0] | o0 0.0 [0.0, 0.0] (n 197) |  | unchanged |
| s02 d5 | p 3 | 1/200 | o2 3.0 [0.0, 7.5] | o2 2.8 [0.0, 7.3] (n 199) |  | unchanged |
| s05 d0 | p 3 | 200/200 | o1 5.2 [0.0, 12.5] | no paired rows left | o2 -> o1 23.1 [0.0, 50.0] (n 13) | **quarantine**: Suplex (o2) lost 200/200; o0 and o1 lose Suplex later in 121 and 162 branches; nothing clean left |
| s05 d2 | p 3 | 20/200 | o0 0.0 [0.0, 5.5] | o0 0.0 [0.0, 3.9] (n 180) |  | unchanged (Suplex as o1 resolved in 100/100 here) |
| s05 d3 | p 3 | 160/200 | o0 0.0 [0.0, 2.9] | no paired rows left | o2 -> o0 0.0 [0.0, 4.9] (n 163) | option o2 (Suplex) lost 150/150: drop it; verdict unchanged (o0, not confident) |
| s05 d5 | p 6 | 101/200 | o5 1.5 [0.0, 9.0] | no paired rows left | o4 -> o5 1.5 [0.0, 9.3] (n 199) | option o4 (Suplex) lost 100/100: drop it; verdict unchanged (not confident) |
| s05 d8 | p 5 | 200/200 | o4 7.8 [2.5, 14.8] **conf** | no paired rows left | o0 -> VOID | **VOID**: Forge's own answer (cast Suplex) lost its spell in 200 of 200 branches; the label measures "throw Suplex away" |
| s06 d2 | p 5 | 78/200 | o2 26.8 [19.7, 34.0] **conf** | o2 25.4 [17.2, 36.1] **conf** (n 122) |  | holds |
| s06 d4 (screened) | p 6 | 7/25 | o1 4.0 [0.0, 12.0] | o1 5.6 [0.0, 16.7] (n 18) |  | still screened (clean mean .98) |
| s06 d5 (screened) | p 5 | 8/25 | o1 4.0 [0.0, 12.0] | o1 5.9 [0.0, 17.6] (n 17) |  | still screened (clean mean .99) |
| s06 d6 | p 6 | 26/200 | o4 3.5 [1.0, 6.5] **conf** | o4 1.4 [0.0, 4.0] (n 174) |  | **loses confidence**; a random drop of 26 rows keeps it 96.5% of the time, so the lost spells carried it |
| s06 d8 | p 5 | 35/200 | o0 0.0 [0.0, 0.5] | o0 0.0 [0.0, 0.6] (n 165) |  | unchanged |
| s10 d2 | p 4 | 75/200 | o3 9.0 [0.5, 16.8] **conf** | o3 5.6 [0.0, 16.0] (n 125) |  | loses confidence; a random drop of 75 rows keeps it only 38%: mostly the smaller n |
| s10 d10 | p 3 | 42/200 | o1 8.2 [1.5, 16.5] **conf** | o2 7.0 [0.0, 16.1] (n 158) |  | loses confidence and best moves o1 -> o2; random drop keeps it 65% |
| s10 d15 | a 4 | 52/200 | o1 9.0 [2.8, 16.5] **conf** | o1 8.8 [0.0, 17.9] (n 148) |  | loses confidence; random drop keeps it 72.5% |
| s10 d22 | a 7 | 57/200 | o0 0.0 [0.0, 5.0] | o0 0.0 [0.0, 8.5] (n 143) |  | unchanged |
| s10 d28 | a 5 | 27/200 | o2 11.0 [2.8, 19.8] **conf** | o2 7.8 [0.0, 16.5] (n 173) |  | **loses confidence**; random drop keeps it 95%, so the lost spells carried it |
| s10 d33 | p 3 | 9/200 | o0 0.0 [0.0, 0.0] | o0 0.0 [0.0, 0.0] (n 191) |  | unchanged |
| s10 d40 | p 4 | 8/200 | o0 0.0 [0.0, 4.5] | o0 0.0 [0.0, 5.2] (n 192) |  | unchanged |
| s10 d43 | p 4 | 6/200 | o1 0.5 [0.0, 4.0] | o1 0.5 [0.0, 4.1] (n 194) |  | unchanged |
| s10 d44 (screened) | p 3 | 1/25 | o1 4.0 [0.0, 12.0] | o1 4.2 [0.0, 12.5] (n 24) |  | still screened |
| s10 d45 (screened) | a 8 | 1/25 | o0 0.0 [0.0, 0.0] | o0 0.0 [0.0, 0.0] (n 24) |  | still screened |
| s07 d4 | p 6 | 23/200 | o0 0.0 [0.0, 3.5] | o0 0.0 [0.0, 4.4] (n 177) |  | unchanged (Forge's own trigger drop) |
| s07 d6 | p 5 | 17/200 | o0 0.0 [0.0, 4.0] | o0 0.0 [0.0, 3.8] (n 183) |  | unchanged |
| s07 d7 | a 3 | 7/200 | o2 4.0 [0.5, 7.5] **conf** | o2 3.6 [0.0, 7.2] (n 193) |  | loses confidence on the drop, random drop keeps it 75.5%; Forge's own play, kept |
| s07 d8 | p 5 | 8/200 | o2 5.0 [0.0, 10.0] | o2 4.7 [0.0, 9.9] (n 192) |  | unchanged (not confident in atlas.json) |
| s07 d10 | a 4 | 3/200 | o0 0.0 [0.0, 1.6] | o0 0.0 [0.0, 1.2] (n 197) |  | unchanged |
| s07 d12 | a 5 | 2/200 | o0 0.0 [0.0, 0.5] | o0 0.0 [0.0, 0.5] (n 198) |  | unchanged |

**Count.** 97 labels: 71 have no branch with a lost spell (all of s01, s03, s04, s08, s09, s11, s12, s13; s02 d0-d1; s05 d10, d11, d13; s06 d10, d12, d15, d17, d19; s07 d11, d13). 26 are touched: 20 by the random seat's lost spells (s02 4, s05 5, s06 3, s10 8) and 6 by Scarlett on s07. s13's 14 Tamiyo's Safekeeping fizzles touch at most 7 of 200 rows of any decision (d2); nothing there can move.

**Confident labels, 27:** 1 void (s05 d8); 2 lose confidence beyond what a random drop of as many rows does (s06 d6, s10 d28); 3 lose it about as often as a random drop would (s10 d2, d10, d15); 21 hold (s07 d7 counted as holding: Forge's own play, and the drop is within chance). Strict count, the six out: 21; middle count (void plus the two bias flips out): 24.
