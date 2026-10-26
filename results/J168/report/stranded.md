# Lost spells by spine (phase B frame logs, read only)

Signature: a `{hand}->{stack}` zone event for the card with no later state holding it in `stackCards` and no later event moving it off the stack (the card is gone, its mana spent). Headliner Scarlett is different: the creature resolves and its enter trigger is dropped (no `Headliner Scarlett (5)'s Effect` in the command zone within six state frames). Scanned in the caster's own seat log (seat 0 = Drafter A, ids 1-40; seat 1 = Drafter B, ids 41-80). `scan/<spine>.jsonl` holds one row per branch frame log; bin/strand.py made it.

| spine | spell (owner) | worker-log lines | frame events | at the forced option / later in the branch | branches | by decision |
|---|---|---|---|---|---|---|
| s02 | Tear Asunder (A) | 8 | 7 | 0 / 7 | 7 | d2 1, d3 1, d4 3, d5 2 |
| s02 | **all** | | | | **7 of 2500 branch games (0.3%)** | |
| s05 | Suplex (A) | 453 | 991 | 650 / 341 | 991 | d0 483, d2 20, d3 187, d5 101, d8 200 |
| s05 | **all** | | | | **991 of 5500 branch games (18.0%)** | |
| s06 | Knockout Maneuver (A) | 107 | 105 | 0 / 105 | 105 | d2 48, d4 7, d5 8, d6 19, d8 23 |
| s06 | Troll Negotiations (A) | 107 | 107 | 0 / 107 | 107 | d2 49, d4 10, d5 9, d6 16, d8 23 |
| s06 | **all** | | | | **201 of 7350 branch games (2.7%)** | |
| s07 | Headliner Scarlett ETB trigger (A) | 138 | 118 | 0 / 118 | 118 | d4 36, d6 29, d7 19, d8 15, d10 15, d12 4 (Forge map 24) |
| s07 | **all** | | | | **118 of 5970 branch games (2.0%)** | |
| s10 | Tear Asunder (B) | 7 | 7 | 0 / 7 | 7 | d2 1, d10 2, d15 2, d22 1, d28 1 |
| s10 | Troll Negotiations (B) | 508 | 507 | 0 / 507 | 507 | d2 124, d10 62, d15 104, d22 136, d28 44, d33 10, d40 18, d43 7, d44 1, d45 1 |
| s10 | **all** | | | | **512 of 5875 branch games (8.7%)** | |

- No other spine has a `failed to target` line (s01, s03, s04, s08, s09, s11, s12, s13: 0). Lines total 1,328 over the 13 spines; the brief's ~1,346 adds 18 from J167's aside `.j167-cop`.
- **s05's worker logs undercount**: 453 lines against 991 lost casts in the frames. Lines exist for d3, d5 and d8 (150, 100, 203) and none for d0 and d2 or for d3's later casts; the frames show Suplex gone each time (sampled by hand: d8-random-o0-b0, d0-random-o2-b0, d0-random-o0-b171). A census that reads the worker logs misses half of s05.
- Every lost cast is in the random continuation except Scarlett's (24 of 118 in the Forge map: Forge's own AI drops that trigger too, so it is Forge's play, not the random seat's).
- Cast attempts in the scanned logs: s05 Suplex 991 lost of 3,389 casts; s06 212 of 490; s10 514 of 2,722 (Troll Negotiations and Tear Asunder together).
- **A sibling shape on s13** (no `failed to target` line): Tamiyo's Safekeeping aimed at a creature or token that had already left (14 target decisions, all random seat), cast and countered on resolution for want of a target. The one of its 6 redaction-failing logs I traced is this (d2-random-o0-b149: target 93, a Saproling token gone to the graveyard 14 lines earlier). bin/stale.py over all 13 spines finds the same stale-target pattern only for Troll Negotiations and Knockout Maneuver (s06 114 branch logs, s10 343) and Tamiyo's Safekeeping (s13 14); every other off-board target it lists is a graveyard spell (Regrowth, Unearth, Pulse of Murasa, ...), legitimately.
