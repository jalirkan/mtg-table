**Forge-pilot caveat:** every game was played by Forge's Default AI in both seats. J141 found that the live search seat lifts every colour about equally (+8.9 points). So a payoff measured with Forge alone is the right first cut, but these payoffs are Forge's.

# J145 — Omega colour balance, night 1: summary

Written by the PC session, 2026-10-22, from:
- **The read:** `balance.md` and `balance.json` (the copy here is the night's real file, restored from the data folder after the collect step overwrote it with the self-test's; see *Known gaps*).
- **The job's files:** `counts.json`, `card-shares.tsv`, `coverage.json`, `real-drafts.json`, the checks, `metrics.json`, STATUS and the step logs.
- **The context:** the heartbeat and the job file's `rule:`, including its registered change.

**Justin's goal, in his words** (heartbeat, 2026-10-19): a cube "just as enticing to draft in each colour". The next layer: "players also win with each colour and each combination". Tonight judges that second layer, at colour level only.

## The verdict: BALANCED ON PAYOFF
No colour is OFF on arm B's lab-vs-lab payoff. Each cell is the colour's win rate in decisive games between decks that differ in it (target .500, deck-clustered bootstrap).

| | W | U | B | R | G |
|---|---|---|---|---|---|
| Blab | .495 (.475–.513) EVEN | .480 (.459–.498) EVEN | .519 (.498–.538) EVEN | .527 (.506–.548) EVEN | .468 (.446–.489) UNCLEAR |
| n | 2,982 | 2,756 | 2,672 | 2,222 | 1,938 |

- **Green is UNCLEAR.** Its interval leaves the [.45, .55] band, but the point is only .032 below .5.
- **Blue and red are EVEN, but their intervals clear .5:** blue sits just below it and red above it. Both are candidates.
- **Pull is NOT judged tonight.** The human-pick model was demoted to context before any data: it covers 105 of the 180 cards, unevenly by colour, and values the rest by its rating fallback. Pull becomes judged when the draft-deck ledger holds 30+ real Omega decks, or a human model covers the whole cube.

## Pull (arm A): information only
The share of two-colour decks that contain the colour (target .400, draft-clustered bootstrap). The labels are information only.

| drafter | k = 1/2/3 | W | U | B | R | G |
|---|---|---|---|---|---|---|
| lab | 1/3,841/158 | .485 (.474–.496) OFF | .598 (.587–.609) OFF | .382 (.369–.394) EVEN | .294 (.281–.306) OFF | .242 (.230–.254) OFF |
| human-pick | 0/497/103 | .433 (.387–.477) EVEN | .519 (.476–.561) OFF | .555 (.512–.598) OFF | .360 (.315–.404) UNCLEAR | .133 (.104–.163) OFF |
| forge-ranks | 0/584/16 | .493 (.454–.536) OFF | .594 (.555–.632) OFF | .387 (.347–.425) EVEN | .294 (.260–.336) OFF | .231 (.197–.265) OFF |

- **The human-pick model's coverage:** W 15/24, U 13/24, B 11/24, R 14/24, G 13/24, gold 12/20, colourless 7/18, lands 20/22.
- **No deck had 0, 4 or 5 colours.** The lab drafter's one mono deck is mono-blue.
- **Every bot over-drafts blue and under-drafts red and green.**
  - **The lab drafter and Forge's ranks** draft almost identically.
  - **The human-pick model** over-drafts black (.555, and black is in .825 of its three-colour decks) and drafts green least (.133).
- **Pairs** (average .100; candidates):
  - **The lab drafter:** WU .209 (.197–.221) and UB .212 (.201–.224) lead, and BR .031 (.026–.037; 119 of 3,841 decks) and RG .046 (.038–.052) trail.
  - **The human-pick model:** UB .245 (.207–.284), BR .129 (.099–.159), UG .026, RG .024.
  - **Forge's ranks** follow the lab drafter.
- **Triples:** no drafter has one with 40+ decks.

## Payoff: the context arms and the pool (candidates)

| arm | W | U | B | R | G |
|---|---|---|---|---|---|
| Bhp (1,200) | .478 (.447–.515) UNCLEAR | .468 (.433–.503) UNCLEAR | .495 (.460–.528) EVEN | .542 (.506–.582) UNCLEAR | .506 (.458–.554) UNCLEAR |
| Bfr (1,200) | .512 (.477–.545) EVEN | .482 (.446–.517) UNCLEAR | .510 (.472–.544) EVEN | .513 (.476–.551) UNCLEAR | .493 (.449–.534) UNCLEAR |
| C, pool (7,996) | .507 (.489–.525) EVEN | .445 (.429–.462) OFF | .493 (.474–.510) EVEN | .508 (.489–.524) EVEN | .457 (.441–.474) UNCLEAR |

- **A vs C.** W, B and R are EVEN in both arms, green is UNCLEAR in both, and blue is EVEN in B but OFF in C. The registered readings fire only on a colour that is OFF in B, so none applies.
- **What blue reads as:** the pool's random blue decks lose, yet drafted blue decks hold close to even (.480), and blue is the most drafted colour.
  - **One reading:** drafters find Omega's strong blue cards and pass the weak ones.
  - **Another:** blue's partners, W and B, may carry it.
  - **Report, don't act.**
- **Pairs' payoff:**
  - **UG** is low on both drafted and random decks: Blab .423 (.382–.465, 544 deck-games), pool .424 (.388–.465). It is the only Blab pair whose interval sits below .5.
  - **WR** is high: .545 (.507–.578).
  - **BR** reads .563, but its interval (.496–.634) includes .5 and it rests on 238 deck-games.
  - **The pool's UB** is .455 (.412–.496).
- **The pool's triples:** UBR .409 (.363–.457) and URG .416 (.365–.471). These are in `balance.json` only.
- **By colour count:**
  - **Blab's k1 1.000 is not a rate.** It is one deck: the single mono-blue deck, which won both its games.
  - **Two colours beat three:** in Blab, k2 .567 (.513–.620) against k3 .430 (.376–.483). Bfr reverses it, but on only 68 deck-games.
  - **The pool:** k1 .554 (.537–.570), k2 .479, k3 .451, which is J140's slope again.

## Closeness (reported only)
The winner's final life and the game's turns, as median (IQR).
- **Blab:**
  - **Overall:** life 20 (15–25), turns 18 (15–21). Every colour is within one point and one turn of that.
  - **The closest pairs:** BR at 18 (12.25–24) and RG at 19 (13.25–23.75). RG is also the quickest, at 16.5 turns.
- **The pool:**
  - **Overall:** life 17 (12–21), turns 17 (14–20). Random decks finish closer than drafted ones.
  - **The quickest pair:** RG, at 15 turns (13–18).

## Real drafts
The ledger holds 3 Omega decks (heartbeat, 10-19). But the read's one fetch from the coach helper returned `{"ok":false}`, so the read shows none. That is under 30 decks either way, so they are not judged.

## Arm C's decks
- **The draw:** 2,000 decks, from all 180 cards. Every deck is 40 cards and castable.
  - **The makeup prior:** k 676 / 638 / 686. By colours with 3+ spells: 818 / 777 / 405.
- **The repeat cap never bound.** The largest share of the k=1 decks is .197 (Ephemerate).
- **The repeat within a colour is structural (D456).** A card sits in a median .818 of the mono decks its colour admits.
- **Never drawn:** Mishra's Factory and Mutavault.

## The run (EDT)
- **Pins:** mtg-table 60252b32 (merged == 1) and ForgeCoach 866c256. The pick file's sha256 matched.
- **Workers:** 6. Peak worker RSS measured 2.24 GB, against 3 GB declared.
- **The steps:**
  - **prepare** started at 09:07:55.
  - **The pilot** ran 09:08–09:10: 26/26 checks; the planted black edge read OFF, the others EVEN.
  - **run1, the drafts:** 09:10:23–09:12:21, 3,200 drafts in under 2 minutes.
  - **run2, arm B:** 09:12:21–09:58:31, 6,400 games at 7,015–8,769/h.
  - **run3, arm C:** to 10:45:17, 8,000 games at 10,281/h.
  - **run4, the read:** 13 s.
- **The restart at 09:13:25:** the runner restarted and adopted run2 while it was still running.
  - **Why, per STATUS:** there was no earlier exit record (the first start that keeps one). The boot was 5 h 39 min old, so it was not a reboot. (It was the PC's install of the runner at 8fca7250, right after the cloud's merge.)
  - **What it cost:** nothing. run2 played as one session, and no game was lost.
- **Totals:** 1 h 38 min, against ~2.5 h estimated. 14,400 games, 0 engine errors, 4 timeouts (arm C's 4 draws), 14/14 checks.

## Storage
- **On the data folder:** `lab-j145` is 987 MB, against ~0.7 GB estimated.
- **Rows a game:** 62 KB in arm B and 56 KB in arm C, against 47 KB estimated. One census game wrote 7.85 MB.
- **The record checks:** 0 problems and 0 leaks.
- **Free space:** 732 GB at the end.

## Known gaps
- **The collect step wrote the self-test's `balance.json` over the night's.** Both `collect:` paths end in `balance.json`, so the self-test's file (sha256 f3b4b232…; it reads INCOMPLETE) was collected last. The PC restored the real file (`/home/justin-a/code/lab/data/lab-j145/out/balance.json`, sha256 6832c663…) into this folder before committing; `balance.md` and the checks read the real file throughout. The next balance job file names the self-test's output differently.
- **The human-pick model's coverage** is partial and uneven, so pull cannot be judged.
- **One spine decides:** lab-vs-lab only.
- **Green is UNCLEAR at n 1,938,** the thinnest colour cell.
- **Some pairs rest on few decks:** BR 238 deck-games, RG 350.
- **Every game is Forge-piloted.**
- **The pool census draws k ≤ 3 only,** with no drafter.
- **Closeness is a description,** not a test.

## What it says
On Forge's play, Omega is balanced by colour on payoff: no drafted colour's win rate is clearly off even, and only green (.468) cannot be called. How much each colour is drafted is far from even for every bot (blue .598, green .242), but that is not judged tonight, and the bots and the partial human model disagree on black. The pool's own blue is its weakest colour (.445, OFF) while drafted blue holds even, and UG is the weakest pair whether drafted or drawn at random (.423, .424).

## What the swap rule should consider
The swap rule is written after this report and before any evolve night. These are the candidates it would look at:
- **UG's payoff:** .423 drafted and .424 in the pool.
- **Blue:** its pool weakness (.445) against its draft pull (.598).
- **Red and green:** under-drafted by every bot. Green's payoff is UNCLEAR in both arms.
- **BR:** almost never drafted by the lab drafter (.031), yet .563 on its few games.
- **The pool's triples:** UBR .409 and URG .416.
