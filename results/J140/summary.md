# J140 — the deck census, night 1 (D447): summary

Written by the PC session, 2026-10-17, from `spectrum.md`, `spectrum.json`, `cards.tsv`, `counts.json`, `checks.txt`, `pilot-checks.txt`, `metrics.json`, STATUS and the step logs.

**A measurement job. There is no verdict.** The job drew 10,000 decks straight from four band pools at random colour makeups and played 80,000 Bo1 games, Default vs Default, numbers only. Every rate below is "in a random deck of this makeup, as Forge's AI plays it". Any difference is a candidate until it holds on fresh seeds (D447 point 9).

## The run
- **Pin.** mtg-table 2e107b6 (#154 merged). Deck seeds 1401–1404 (pauper, peasant, legacy, powered); game seeds S × 1,000,000 + g.
- **Wall time.** 01:29 → 12:05, 10 h 36 m.
  - run1 started on 7 workers. It was killed once on memory (oomd/OOM, no exit code) after 6,920 pauper games.
  - It resumed at 02:49 on **5 workers**: the runner's cap was 5 because the GPU lane was painting beside it. It ran 9 h 16 m from there, with one 5-minute drop to 4 workers at 08:19 (swap-in).
- **Games.** 80,000 of 80,000; all 24 final checks PASS.
  - **Engine errors:** 3 (peasant 1, powered 2).
  - **Timeouts:** 23 (10 / 5 / 7 / 1). **Draws:** 59.
- **Decks.** 10,000; every deck played 15–16 games.
  - Castability **rejections: 0** and new makeups 0 in every band. The castability rule never had to reject a deck.
- **Rate at 5 workers.** Every band's games/h is below the ~11,400/h projected for 7 workers.

| band | games/h | mean turns | first player won |
|---|---|---|---|
| pauper | 5,203 (13,080 games after the restart) | 22.6 | 0.502 |
| peasant | 8,186 | 19.2 | 0.517 |
| legacy | 9,467 | 16.6 | 0.535 |
| powered | 9,156 | 16.5 | 0.530 |

## Win rate by colours with 3+ spells (95% deck-clustered bootstrap)
Within a band, every decisive game is one win and one loss, so the band rate is 0.5 by construction.

| band | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| pauper | .574 (.560–.588) | .516 (.504–.528) | .467 (.455–.481) | .402 (.386–.420) | .354 (.305–.407) |
| peasant | .599 (.586–.612) | .539 (.528–.551) | .466 (.454–.478) | .393 (.380–.407) | .400 (.371–.429) |
| legacy | .597 (.585–.609) | .536 (.524–.548) | .459 (.447–.471) | .408 (.394–.421) | .378 (.353–.401) |
| powered | .593 (.579–.605) | .530 (.517–.542) | .473 (.462–.484) | .415 (.402–.429) | .341 (.316–.366) |

Decks per cell: 1 colour 570–650; 5 colours 56 (pauper) to 142 (legacy).

## Win rate by main-colour share of pips

| band | < .4 | .4–.5 | .5–.6 | .6–.7 | .7–.8 | .8–.9 | .9–<1 | 1.0 (mono) |
|---|---|---|---|---|---|---|---|---|
| pauper | .401 | .434 | .478 | .508 | .498 | .570 | .585 | .580 (.564–.596) |
| peasant | .397 | .421 | .489 | .521 | .553 | .557 | .558 | .608 (.594–.622) |
| legacy | .397 | .427 | .480 | .509 | .534 | .554 | .586 | .601 (.588–.613) |
| powered | .385 | .442 | .487 | .510 | .530 | .572 | .585 | .593 (.579–.606) |

Interval half-widths: about ±.015 at the ends; about ±.02 in the .7–.9 bins; about ±.04 in .9–<1 (64–96 decks a band). The full tables, with Wilson intervals and the prior's k, are in `spectrum.md`.

## The three most surprising rows
- **Mono wins in every band.** It scores .580–.608, and every interval clears 0.5 by at least .064.
- **4–5-colour decks lose in every band.** Four colours score .393–.415. Five colours score .341–.378, except peasant at .400 (.371–.429), which is no better than its own four-colour row.
- **The slope barely changes with power.** From < .4 main share to mono, every band rises about .18–.21, and the curves sit within about .03 of each other in every bin. The one step down is pauper .6–.7 → .7–.8 (.508 → .498), and those two intervals overlap.

## The per-card data (`cards.tsv`: 4,271 band × card rows)

| band | in-band rows | median deck-games (min) | cross / fill rows |
|---|---|---|---|
| pauper | 423 | 2,176 (1,584) | 398 / 9 |
| peasant | 399 | 2,112 (1,280) | 919 / 47 |
| legacy | 613 | 1,584 (944) | 420 / 0 |
| powered | 645 | 1,504 (864) | 398 / 0 |

Cross-band rows have a median of 96–224 deck-games.

**Top 5 and bottom 5 by shrunk rate** (500+ deck-games; deck-games in brackets), each "in a random deck of this makeup":
- **pauper** — top: Militia Bugler .588 (2,336), Crude Bent Blade .580, Salt Road Packbeast .580, Annoyed Altisaur .578, Inspiring Overseer .578; bottom: Cavern Harpy .378 (1,888), Spell Blast .391, Izzet Charm .391, Frantic Search .398, Flash Counter .402
- **peasant** — top: Charging Monstrosaur .581 (2,464), Casey Jones, Jury-Rig Justiciar .581, Flametongue Kavu .578, Samurai's Katana .574, Spiteful Prankster .571; bottom: Rise of the Witch-king .393 (1,776), Thopter Foundry .397, Winding Constrictor .397, Quandrix Charm .401, Risen Reef .405
- **legacy** — top: Sanguine Evangelist .612 (1,328), Overlord of the Mistmoors .603, Angel of Invention .602, Phelia, Exuberant Shepherd .591, Giant Killer .587; bottom: Deceit .361 (1,264), Adun Oakenshield .364, Dakkon Blackblade .389, Omnath, Locus of Creation .389, Gyruda, Doom of Depths .389
- **powered** — top: Elspeth, Storm Slayer .633 (1,264), Giant Killer .605, Surrak, Elusive Hunter .602, Welcoming Vampire .594, Deep Forest Hermit .593; bottom: Tetsuo Umezawa .387 (1,408), Grindstone .388, Omnath, Locus of Creation .390, Sol'kanar the Swamp King .393, Atraxa, Grand Unifier .393

**Read these with care.** The rates are not adjusted for the deck around the card. A gold card sits only in multicolour decks, which lose in every band, and the bottom lists are mostly gold cards. Phase 3's model adjusts for that, from the context columns.

## Known gaps
- **Utility lands never appear.** Single-colour and colourless utility lands are never drawn, so they have no rows. Nonland mana sources do not count toward the land formula.
- **Powered is drawn as one pool with legacy.** That gives about 1.5 powered cards a deck. The "powered" band is mostly legacy cards: its rows are legacy cards in decks that sometimes hold power.
- **Peasant decks' fixers are mostly pauper's** (47 fill rows): peasant has one fixer of its own.
- **The decks are uniform random draws** (no curve or synergy rule) piloted by Forge, which plays aggro well and control poorly. The colour slope may partly be how inconsistent random multicolour decks are, rather than colour count as such.
- **Pauper's rate counts only part of its games.** Its session tally covers the 13,080 games after the restart; the first 6,920 were played on 7 workers.
- **`cards.tsv` carries more columns than #154's census-read wrote** (`n_colours`, `mv0`–`mv6p`, `creatures`, `fixers_real`, `share_*`), so the read ran from a later tree than the job's pin. The wall time above is from the logs (prepare 01:29 to finish 12:05); `elapsed_s` (33,362 s) counts from the 02:49 resume.
