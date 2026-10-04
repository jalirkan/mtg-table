# J059 — the 684 quarantined night-2 recordings: what they are (PC, 2026-10-04)

## (b) Counts
By key: normal/peasant 560 · bridge/peasant+modern-era 21 · bridge/pauper+peasant 21 · bridge/peasant+synergy 20 · bridge/peasant+omega 17 · bridge/peasant+vintage 16 · bridge/fair-fight+peasant 14 · normal/modern-era 6 · normal/fair-fight 4 · bridge/fair-fight+modern-era 3 · normal/synergy 1 · bridge/fair-fight+vintage 1. **669 of 684 involve the peasant cube.**
By seat: seat0 358, seat1 326. All are `g1-` files.

## (a) Reasons — two different failures
Tally of the first `!` line over every 6th file (114 files): **103 x A9, 11 x "own hand card has no name"**.

**1. A9 — a real leak (about 90%):** an opponent's FACE-DOWN card carries an `alt` block that names it.
```
normal/peasant/games/5202/g1-seat0.jsonl.gz:313: face-down card 78 is controlled by player 1 (owner 1), not the viewing seat 0, yet carries an "alt" block naming it "Sink into Stupor" -- canFaceDownBeShownTo ends isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer) (A9)
normal/peasant/games/4789/g1-seat0.jsonl.gz:198: face-down card 95 is controlled by player 1 (owner 1), not the viewing seat 0, yet carries an "alt" block naming it "Charging Monstrosaur" (A9)
normal/peasant/games/5847/g1-seat1.jsonl.gz:270: face-down card 20 is controlled by player 0 (owner 0), not the viewing seat 1, yet carries an "alt" block naming it "Vampire Nighthawk" (A9)
bridge/peasant+omega/games/211/g1-seat1.jsonl.gz:203: face-down card 37 is controlled by player 0 … naming it "Sword of Feast and Famine" (A9)
normal/modern-era/games/4041/g1-seat0.jsonl.gz:225: face-down card 79 is controlled by player 1 … naming it "Chandra, Torch of Defiance" (A9)
normal/modern-era/games/3806/g1-seat0.jsonl.gz:158: face-down card 78 is controlled by player 1 … naming it "Elspeth, Knight-Errant" (A9)
```
The named cards are ordinary cards of every kind (a planeswalker, an equipment, a creature), so something TURNS them face down (a manifest/cloak-style effect — the peasant cube must hold one or more such cards, modern-era fewer), and the viewer still gets the `alt`. The failing lines repeat on consecutive frames while the card stays face down.

**2. "the viewer's own hand card N has no name — redaction is too aggressive" (about 10%, the non-peasant keys):**
```
normal/fair-fight/games/2823/g1-seat1.jsonl.gz:93: the viewer's own hand card 81 has no name -- redaction is too aggressive
normal/synergy/games/2839/g1-seat0.jsonl.gz:83: the viewer's own hand card 14 has no name -- redaction is too aggressive
bridge/fair-fight+vintage/games/278/g1-seat1.jsonl.gz:152: the viewer's own hand card 65 has no name -- redaction is too aggressive
```
That is the opposite direction (too much hidden, no leak).

## (c) Night-1 files caught by mistake?
No, as far as the two keys I checked show: quarantined draft folders in normal/peasant run 3198-5962 and night 1's version (`ver e4c1d36daaee`) ends at draft line 3191 (night 2's `e44397143492` starts at seed 3195); normal/modern-era quarantined 2258-4041, night 1 (`64ebf7ebd1fc`) ends at line 2110. All quarantined files are night-2 drafts.

Full checker output for nine files: ask and I will attach it; the files stay in `~/code/lab/mtg-table/var/cubelab/queue-quarantine-n2/`.
