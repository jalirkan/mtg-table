# Evidence — villain identity (D220–D222)

Branch `villain-identity`, off `main` at `9dfdce4`, in the worktree
`mtg-table-t2v`, on 2026-09-29. Everything below was run on this machine that
night; every number names what produced it. The pictures are under
`var/villains/` (gitignored, local) and listed in §7. No personal model was
present: this lane is the repository tier. **§11 is the fix pass** that followed
the lane's first verification (D222, and D221 amended): §5, §6 and §7 are as it
left them, and the numbers the lane first wrote in §6 are corrected there.

The brief: a bare `./scripts/play.sh` seats you against `decks/doom-legion.dck`,
but no committed recording played it, so the workshop previewed 24 of its 27
names from the engine's card scripts (D196) — none of them face up in a game —
and none of its creatures had an identity row: every villain was a bare body, and
the black Human Villains (Crossbones, Baron Strucker, Madame Hydra, the Unliving
Legionnaire, every Villain token) had no rung at all and stood as glow discs.

---

## 1. The fixture — `fixtures/games/villain-doom-248.jsonl`

**The search.** `RecordMatch` — the M1 recorder, default policy, no `--probe`,
no `--match` — with seat 0 = `decks/doom-legion.dck` and seat 1 =
`decks/pacho-shield.dck`, seen from seat 0, at every seed from 1 to 440 (four
workers, each in a Forge home of its own under `var/villain-try/`, the gate's
`forge_home_make`): 440 games, 440 `RECORD OK`, no failure. A scratch census
(`var/villain-try/`, not committed) read every `state` frame for the Doom
Legion's cards the viewer saw FACE UP (any zone — the viewer's hand is its own)
and for which of its creatures reached the battlefield or the stack.

How often each creature reached the table over the 440 games:

| creature (or token) | games |
|---|---|
| Aerial Doombot | 263 |
| Agents of HYDRA | 254 |
| HYDRA Troopers | 246 |
| Doom's Servo-Guards | 172 |
| Crossbones, Malicious Mercenary | 165 |
| Unliving Legionnaire | 161 |
| Loki, God of Mischief | 158 |
| Villain Token | 158 |
| Kang the Conqueror | 153 |
| Kang, Temporal Tyrant | 146 |
| Baron Strucker, HYDRA Overlord | 144 |
| A.I.M. Bot | 143 |
| Pharaoh Rama-Tut | 135 |
| Madame Hydra, Reanimated | 124 |
| Doctor Doom | 76 |
| Doombot (token) | 76 |

No seed put all fifteen on the table: the best put twelve (seeds 201, 214 and
248). Five seeds showed all 27 names face up (35, 44, 198, 227, 424); the best of
those, 198, puts ten of the fifteen on the table, runs 32 turns and is a 7.7 MB
file. **Seed 248 was chosen**: 26 of 27 names face up (one short — a land), twelve
of fifteen identity subjects on the table (Doctor Doom and his Doombots among
them), a thirteen-villain board on its last turn for the table view, the Plan's
payoff, and 5.8 MB.

**The census of seed 248** — which of the deck's 27 names the viewer sees face
up, and where (a scratch read of the committed file):

| # | card | seen face up | where |
|---|---|---|---|
| 2 | Aerial Doombot | yes | hand, battlefield, graveyard |
| 2 | Agents of HYDRA | yes | hand, battlefield, graveyard |
| 1 | Loki, God of Mischief | yes | hand, stack, battlefield |
| 1 | Doom's Servo-Guards | yes | hand, battlefield |
| 1 | Doom Reigns Supreme | yes | hand, stack, battlefield, graveyard |
| 1 | Dark Deed | yes | hand |
| 1 | Doom Blade | yes | hand, stack, graveyard |
| 1 | Baron Strucker, HYDRA Overlord | yes | hand, battlefield |
| 2 | HYDRA Troopers | yes | graveyard (milled, turn 22) |
| 1 | A.I.M. Bot | yes | hand, stack, battlefield |
| 1 | Visions of Villainy | yes | hand, stack, graveyard |
| 1 | Frozen in Ice | yes | graveyard (milled) |
| 1 | Kang the Conqueror | yes | hand, stack, battlefield |
| 1 | Kang, Temporal Tyrant | yes | hand, stack, battlefield, exile |
| 1 | Unliving Legionnaire | yes | hand, stack, battlefield |
| 1 | Madame Hydra, Reanimated | yes | hand, stack, battlefield, graveyard |
| 1 | Hour of Defeat | yes | hand, stack, graveyard |
| 1 | Crossbones, Malicious Mercenary | yes | hand, stack, battlefield |
| 1 | Pharaoh Rama-Tut | yes | graveyard (milled, turn 22) |
| 1 | Doctor Doom | yes | hand, stack, battlefield |
| 1 | Thriving Isle | yes | hand |
| 1 | Thriving Moor | yes | hand |
| 1 | **Hidden Lair** | **never** | — |
| 1 | Castle Doom | yes | hand, battlefield |
| 1 | Villainous Hideout | yes | hand, stack, battlefield |
| 7 | Swamp | yes | hand, battlefield, graveyard |
| 5 | Island | yes | hand, battlefield |

Tokens on the viewer's side: **Doombot** (two, from Doctor Doom) and two Robot
Tokens (Pacho's Robotics Mastery, cast by the Plan's payoff). No Villain token:
no Agent of HYDRA died on the table and no Trooper entered.

**The committed file** was recorded afresh, alone, into `fixtures/games/` with
the default Forge home:

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/doom-legion.dck \
    --deck2 decks/pacho-shield.dck --seed 248 --out fixtures/games/villain-doom-248.jsonl
```

`RECORD OK`, 0 snapshot errors, `UNIMPL members = none`, nothing unsupported;
401 lines — the session header, `hello_ok`, 398 `state` frames and `over`; 24
turns, AI-Seat0 (Doom Legion) wins. Its header carries the fields every committed
recording does (`v`, `kind`, `gameId` `villain-doom-248`, `startedAt`, `seed`
248, `forgeVersion` `2.0.14-SNAPSHOT-08.08`, `forgeJarSha256` `3c0a7c38…8e5dd9`,
`seat` 0, `decks` — the viewer's path and sha256, the other seat's `null`s).
`node tools/same-game.mjs` against the search's own seed-248 recording:
**SAME GAME** — 2,251 events and 334 phase-boundary states equal, the framing
different from frame 326 (400 vs 406 frames: the forwarder's flush clock under
load, D113).

- `node tools/check-redaction.mjs fixtures/games/villain-doom-248.jsonl` (no
  flags): **PASS**, and *"M49 keywords present on every full card"* — the
  corpus's first recording on amendment M49's wire.
- `tools/narrate-selftest.mjs` over the corpus with it: OK, 90 checks.
- `node tools/build-workshop-catalog.ts --check`: current after the rebuild (§7).
- **Step 6 and 9b compare nothing to it**: `tools/check-all.sh` hands
  `tools/wire-drift.mjs` `fixtures/games/g1.jsonl` and
  `tools/fixture-multiset-diff.mjs` `fixtures/games/human-auto-42.jsonl`, by
  name — seed-42 recordings only (`DRIFT_FIXTURE`, the step-6 command line).

## 2. What the AI did with the deck

`node tools/narrate.mjs fixtures/games/villain-doom-248.jsonl --summary`:

```
== villain-doom-248 · seed 248: AI-Seat0 (AI) vs AI-Seat1 (AI) ==
Seen from AI-Seat0's seat. 24 turns (12 rounds).
Game over after turn 24: AI-Seat0 wins. AI-Seat1's life fell to -3.

                              AI-Seat0 (seat)         AI-Seat1
  turns taken                              12               12
  mulligans                                 0                0
  lands played                              9                9
  spells cast                              18               16
  abilities used                           29               18
  their creatures that died                 1                3
  damage dealt to players                  16               14
  damage dealt to creatures                35               34
  life at the end                          11               -3
```

AI-Seat0 is the Doom Legion (the viewer); AI-Seat1 plays Pacho's deck. What the
story says, in short: the villains lay Baron Strucker on turn 6, then Kang,
Temporal Tyrant (conniving Loki into hand on his first attack), Loki and **Doom
Reigns Supreme** on turn 10. S.H.I.E.L.D.'s Web Up exiles Kang the Tyrant; Hour of
Defeat kills Ant-Man and Doom Blade kills Wasp. Every Villain after that feeds the
Plan — Doom's Servo-Guards, Kang the Conqueror, the Unliving Legionnaire — and on
turn 20 **Doctor Doom** enters with two Doombots, which takes the Plan to its
fifth counter: it is sacrificed, S.H.I.E.L.D.'s top five are exiled, and the AI
casts Pacho's own Robotics Mastery (two Robot tokens) and Strategic Intervention
for free. Crossbones and Madame Hydra arrive on turn 22 (Crossbones' trigger deals
2); on turn 24 the A.I.M. Bot and an Agent of HYDRA join, and **thirteen
villains attack at once** — Helicarrier Strike kills Madame Hydra in the attack
step, S.H.I.E.L.D. blocks seven, and the rest take AI-Seat1 from 2 to −3.

## 3. What the fixture changed in the corpus — the recount

Every number below is printed by `npm --prefix web test`, before (on `9dfdce4`,
19 recordings) and after (20). The **asserted** ones were moved to the new truth
in the same change; the rest are printed only.

| test | number | before | after | asserted? |
|---|---|---|---|---|
| `attach` | board frames with an attachment | 985 | 1,294 | yes |
| `attach` | `attach` events | 28 | 34 | yes |
| `attach` | looks: shrink · shell · glints · circuit | 944 · 409 · 362 · 315 | 1,253 · 522 · 553 · 405 | yes |
| `attach` | host-centre clicks · strips unreachable | (sweep) | 1,026 · 30 — bound 1% → 3% (§4.2) | yes |
| `stack` | frames with a stack | 389 | 428 | yes |
| `stack` | tethers | 44 | 57 | yes |
| `stack` | frozen (stack in combat) frames | 66 | 72 | yes |
| `stack` | resolutions | 412 | 493 | yes |
| `stack` | `orb` forms | 0 | 3 (`Land`: Villainous Hideout's ability) | yes — its one type line |
| `motion` | classic film (comic FX off, on twos off) | 310,369 ops | 305,737 over the 19 + 45,744 for the new one (§4.1) | yes — re-derived |
| `traits` | cards with an identity in the census | 17 | 29 | printed; rows asserted |
| `traits` | prop kinds on the table at once | 17 | 17 (the 19) · 22 (the villain file, held to 22) · 17 on its most crowded frames (held to 17, D222) | yes (§6) |
| `traits` | prop instances at once | 60 | 91 (≤ 96) | yes |
| `status` | strips · with the wire's keywords | 10,763 · 0 | 13,951 · 1,332 | yes — keywords now allowed, each the card's own |
| `figure-pose` | stand points · back-row · boxed in | 12,500 · 200 · — | 15,773 · 805 · 4 (§4.3) | yes |
| `figure-pose` | poses · with a model · anonymous | 12,628 · 6,824 · 1,179 | 15,909 · 9,266 · 1,179 | printed |
| `layout` | state frames · placements · backs | 3,679 · 84,418 · 15,019 | 4,077 · 99,818 · 17,248 | printed |
| `camera` | director: batches · beats · cuts | 7,358 · 3,656 · 596 | 8,154 · 4,162 · 660 | printed (the rules asserted per cut) |
| `camera` | shakes taken · dropped | 37 · 168 | 43 · 192 | printed |
| `clips` | dying bodies (drained) | 17 | 20 | printed |
| `replay-cues` | non-empty batches · cast-and-entered · rule 5 fired | 3,293 · 66 · 60 | 3,689 · 86 · 78 | printed |
| `replay-cues` | effects over §9.3's cap | 26 | 86 | printed |
| `look` | painted figure-instances (sick) · ghosts | 6,781 (1,487) · 87 | 9,217 (2,095) · 95 | printed |
| `palette` | face-up figure-instances | 11,449 | 14,730 | printed |
| `duelists` | stances ready · won · lost | 7,298 · 30 · 30 | 8,088 · 33 · 33 | printed |
| `tiles` | tile-instances | 29,389 | 33,450 | printed |
| `story-render` | renderings · logs · names marked | 266 · 19 · 16,225 | 280 · 20 · 18,910 | printed |
| `workshop` | rehearsal batches · cues | 4,050 · 7,465 | 4,086 · 7,533 | printed |
| `figures` | face-down battlefield instances | 1,138 | 1,138 | yes (unchanged) |

`tools/arena-bench.mjs`'s bench frame is unchanged: `g1.jsonl` at transport
index 316 is still that file's index, and the villain file is a new URL.

## 4. What the corpus found — three defects, each fixed

A new recording is a new test oracle, and this one had a table no earlier one
had: a rank of six wrapped over a land rank of nine, the opponent's aura on a
front-row villain, and the Doom Legion's basic Swamps.

### 4.1 Every land with no row of its own rose twice (`cues/queue.ts`, rule 6)

`queue: a permanent cast and resolved in ONE snapshot animates once` failed on
the villain file: Villainous Hideout, played and activated in one snapshot,
planned `land.rise + land.rise + land.tap`. Forge reports a land drop twice — the
`zone` event onto the battlefield and the `land` event — and for a land with no
per-card row both resolve to `land/*`'s `land.rise`, under two selectors, which
rule 6 kept apart; two rises composed into one twice as high. It was never
caught because that test only looks at cast-and-entered batches, and Pacho's
Plains and Islands have per-card rows whose arrival is `fx.terrain`. Rule 6 now
claims a land's two arrival events as one (`isArrival`).

The classic film moved **exactly where a land rose twice**. Both queues (the
committed `9dfdce4` one and this one) played over every recording with comic FX
and on twos off, per-file digest and the old queue's doubled rises:

| recording | ops before → after | doubled rises (before) | film |
|---|---|---|---|
| g1, g2, g3, human-ability-42, human-auto-2026, human-auto-42, human-auto-7, human-comfort-13, sample-handwritten | unchanged | 0 | identical |
| disjoint | 21,808 → 21,542 | 7 | moved |
| future-sight | 9,980 → 9,714 | 7 | moved |
| human-amount-7 | 12,001 → 11,508 | 13 | moved |
| human-number-7 | 15,468 → 14,859 | 16 | moved |
| human-scry-7 | 12,927 → 12,700 | 6 | moved |
| human-search-7 | 11,912 → 11,418 | 13 | moved |
| human-sideboard-7 | 15,024 → 14,226 | 21 | moved |
| human-trample-7 | 12,926 → 12,355 | 15 | moved |
| human-yield-13 | 17,444 → 17,030 | 11 | moved |
| morph | 12,223 → 11,729 | 13 | moved |
| villain-doom-248 | 45,972 → 45,744 | 6 | new |

138 doubled rises in eleven recordings, every one a probe deck's Forest,
Mountain or Swamp. `motion.test.ts`'s `PRE_LANE_FILM` is re-derived to the 19's
new digest (305,737 ops, `15c94385…`), its old pin kept in the comment, and the
villain file has a pin of its own (`POST_LANE_FILMS`, 45,744 ops, `99f600b0…`).

### 4.2 A back-row card took the front card's centre click (`layout.ts`, `HitProxy`)

`attach: a click on a host's face hits the host` failed on the villain file: a
click at the centre of Baron Strucker's card (a host, under the opponent's
Quantum Reduction) hit the Robot token behind him. A wrapped rank's back row lies
`RANK_WRAP_Z` = 0.55 behind the front row and above it, and a click target
`PROXY_SCALE` = 1.1 deep reaches exactly 0.55 forward — the front card's centre
line — though the DRAWN back card starts 0.05 further back. `layout.ts`'s new
`proxySizeOf` gives the back row its card's own depth (1.0); `HitProxy` and the
test read it. After: 1,026 host-centre clicks from three views, **0 missed**.
The test's unreachable-strip bound went from 1% to 3%: without the villain file
the sweep has 4 of 765; with it 30 of 1,026, 26 of them its Quantum Reduction,
which lies wholly under Strucker and the back row from `@312` and is not drawn
either (the `buried` rule still holds every one to a crowded board).

### 4.3 A back-row figure could find nowhere to stand (`layout.ts`, `placeStands`)

`figure-pose: no figure stands inside another card` failed: the Robot token
behind Strucker stood on the Quantum Reduction in nine frames. A back-row figure
steps back from the centre line, 0.05 at a time, until its stand point is clear;
at `@341` the aura covered it to `anchor + 0.64` and a land from `anchor + 0.60`,
so no step was clear and it stayed on the aura. It now also tries **±0.035
aside** (half the rank's 0.076 gutter — a first cut of ±0.12 put two Doombots
through each other, which `figure-pose`'s neighbour test caught), which clears
five of the nine. The other four (`@346`, `@383`–`@385`) are **boxed in**: the
host's card, its aura and a land cover the figure's whole centre column within
that width. `figure-pose.test.ts` now tells the two apart with its own `onCard`,
prints the boxed-in ones and holds them to four, in this file; the fix is the
layout's (a land rank that steps back behind a wrapped creature rank — PLAN.md's
villain-identity follow-up 3).

## 5. Identity — what each villain is (D221)

All data: `figures/figures.json` (one archetype, three card rows),
`figures/traits.json` (fifteen new rows, and Aerial Doombot's unchanged), `cues/cues.json` (seven rows), and two new
pieces of the shared kit.

**The kit grew by two kinds, each shared:**

- **`mask`** (`PROP_KINDS`, colour `tint`, preset `metal`): a faceplate over the
  front of the head, from under the hairline to under the chin and round to the
  ears, standing proud of the nose, with dark eye slits, a shadowed brow, a pale
  nose ridge and a grille — **226 triangles**. Anchored like the eyepatch, in
  unit-head space (HEAD_SHAPE on a person, the chibi's head on the fallback).
  Worn by Doctor Doom (iron), Kang the Conqueror and Kang, Temporal Tyrant (blue),
  Crossbones (bone white) and — since the fix pass — the Unliving Legionnaire
  (pale lavender).
- **`cowl`** (a hairstyle, the derived kind `hairCowl`, in the costume's hair
  slot, preset `cloth`): a smooth hood from the brow round the jaw to the nape,
  and a mantle over the neck to the shoulders so no skin shows between it and a
  cloak — **432 triangles**. Worn by Doom (green hood), both Kangs (a purple
  helm), Crossbones (balaclava), Agents of HYDRA, the Villain token and — since
  the fix pass — the HYDRA Troopers and the Unliving Legionnaire.

| card | body · rest | head | props | costume, in short |
|---|---|---|---|---|
| Doctor Doom | man · akimbo | cowl (green), no face | mask, cape, coatTails | iron armour, green tunic and hood, gold belt |
| Doombot (token) | drone | — | laserEye, visor (robot rung) | iron, a green eye, low |
| Doom's Servo-Guards | drone | — | laserEye, visor | gunmetal, a red eye, lowest |
| A.I.M. Bot | drone, hovering | — | laserEye, visor, wings | A.I.M. yellow, cyan eye |
| Aerial Doombot | drone | — | (unchanged) | (unchanged) |
| Agents of HYDRA | man · atEase, a squad of three | cowl | squad | HYDRA green, yellow chest, gloves and belt |
| HYDRA Troopers | man · highReady | cowl | pistol | HYDRA green, yellow gloves and belt |
| Baron Strucker | man · atEase | bald | coat, coatTails | black uniform, green greatcoat, yellow belt |
| Loki | man · braced | long, black | cape, gauntlets (green) | green and gold |
| Kang the Conqueror | man · aim, hovering | cowl (purple), no face | mask (blue), gauntlets | green tunic over purple |
| Kang, Temporal Tyrant | man · folded | cowl, no face | mask (blue), cape (purple) | purple armour over green |
| Pharaoh Rama-Tut | man · folded | long, gold (the headdress) | cape (royal blue) | gold collar, white linen |
| Unliving Legionnaire | man · folded, hovering | cowl (wine-black), no face | mask (pale lavender), wings (magenta) | violet and crimson |
| Madame Hydra | woman · akimbo | long, GREEN | cape (charcoal) | charcoal catsuit, yellow belt |
| Crossbones | man · braced, scale 1.14 | cowl (charcoal), no face | mask (bone white) | warm charcoal fatigues, bone-white chest |
| Villain Token | man · atEase | cowl | — | black |

**The villain rung.** `creature/subtype:villain` in `figures.json` stands a
Villain the earlier rungs do not claim in the man's body; `SUBTYPE_ORDER` keeps
the Doombots drones and Doom in the scientist's body (the same node), and
Madame Hydra has a card row for the woman's.

**The raster** (`traits.test.ts`, the real `figures.glb` and `PropField`, the
table view at 1600 × 1000, the fewest pixels of paint after the ink over
standing/kneeling and centre/edge, `you` · `opp`):

| card | kind | you | opp |
|---|---|---|---|
| Doctor Doom | mask · cape · coatTails · hairCowl | 0 · 1,364 · 31 · 353 | 66 · 13 · 601 · 259 |
| Kang the Conqueror | mask · gauntlets · hairCowl | 0 · 81 · 310 | 59 · 116 · 218 |
| Kang, Temporal Tyrant | mask · cape · hairCowl | 0 · 1,208 · 329 | 61 · 65 · 236 |
| Crossbones | mask · hairCowl | 0 · 402 | 74 · 254 |
| Loki | cape · gauntlets · hairLong | 933 · 87 · 281 | 69 · 116 · 100 |
| Madame Hydra | cape · hairLong | 1,128 · 275 | 48 · 106 |
| Pharaoh Rama-Tut | cape · hairLong | 1,208 · 304 | 68 · 117 |
| Baron Strucker | coat · coatTails | 517 · 732 | 155 · 480 |
| HYDRA Troopers | pistol · hairCowl | 104 · 302 | 103 · 215 |
| Agents of HYDRA | squad · hairCowl | 994 · 218 | 672 · 155 |
| Unliving Legionnaire | mask · wings · hairCowl | 0 · 1,025 · 324 | 59 · 643 · 219 |
| A.I.M. Bot | laserEye · visor · wings | 0 · 151 · 87 | 38 · 112 · 159 |
| Doombot · Servo-Guards | laserEye · visor | 0 · 144 / 145 | 40 / 39 · 111 / 110 |
| Villain Token | hairCowl | 302 | 214 |

Three one-sided details are new, each with the partner that carries the card on
the other side (`ONE_SIDED`): the `mask` (a face; the cowl from behind), and
Doom's `cape` and `coatTails` — his cloak is behind him from the front (13 px) and
his tunic under the cloak from behind (31 px), so each is carried by the other
side's (the hood from the front, the cloak from behind). Every other cloak and
coat reads from both seats — and since the fix pass the test holds that:
`ONE_SIDED`'s cloak and tunic rows carry `only: ['Doctor Doom']`, where the lane
first exempted every wearer (Madame Hydra's cloak is exactly 48 px from the far
seat, on the bar). Loki first rested `clasped`, and his lit hands were
behind his back from your seat (6 px); he rests `braced` now (87).

**The cues**, each keyed off an event about that card: Doctor Doom's arrival is
`fx.agents` (his own `channel`, beams to the `beside` anchors where the Doombots
materialise — never to a token), and he attacks on speed lines; a Doombot comes
online in green and its eye fires at the defender its attack band names; the
Agents of HYDRA step forward as a squad; the Troopers and Kang the Conqueror open
fire (`pistolDraw`, two muzzle flashes); Crossbones charges and his own trigger
resolving rings from his feet with a BLAM; Loki's draw trigger is an illusion's
shimmer and a card to his controller's hand. Over the corpus (`replay-cues`'s E5
census, which counts an event once, by its subject): Loki's `resolved` ×6,
Crossbones' `resolved` ×3, Doom's arrival ×1, the Doombots' arrival ×2. The
thirteen-villain attack (frame 392) plans a cue per attacker (a scratch
`planBatch` over that frame): Doom's `attack.lunge`, both Doombots' `attack.jet`,
Crossbones', Kang the Conqueror's and the rest on their own rows or rungs.

**What the corpus does not reach** (`traits.test.ts`'s `OFF_THE_TABLE`): HYDRA
Troopers and Pharaoh Rama-Tut (both milled on turn 22) and the Villain token (none
made). Their rows are read off a pose built from the catalog's facts — the
Villain token's from Forge's token script (report 08 §8.1) — and the census fails
the day a recording puts one on the table until the name leaves the list.

## 6. The budget (D222 — rewritten by the fix pass)

**What the lane first wrote here was wrong**, and the verifier found it: it named
`@296` and `@304` as the villain file's busiest frames (114–117 calls, the base
tree 110–112), but `tools/arena-bench.mjs --index N` reads its counters at the
END of its sample — five seconds of replay at 4×, 100 ms a frame, is fifty frames
past N — so those were readings of about `@346` and `@354`, and the lane's own
table picture's frame, `--index 388`, read the recording's LAST frame at 128
calls, over the bench's hard 120. The fix pass measured every frame instead.

**The sweeps** (a scratch driver, `var/villains/sweep.mjs`, against `vite
preview` of each tree, 1920 × 1080, `?glinfo=1&bloom=0`): *static* scrubs the
replay slider down from its last index to 0 — every step back is a flush and
snap, so each reading is that frame's pose with no cue running — and *played*
runs it from index 0 at 4× and keeps the worst reading per index, transients
included. The base tree is `9dfdce4`'s web with this recording added (every
villain a bare body; the verifier's `var/verify/base`, its `web/src` checked
identical to `git archive 9dfdce4`).

| sweep | renderer | worst calls | worst triangles | frames over 120 calls · over 90 · over 30,000 triangles |
|---|---|---|---|---|
| base tree, static | GTX 1080 | 124 (`@392`, `@393`) | 33,149 (`@387`) | 10 · 105 · 90 |
| base tree, static | SwiftShader | 124 (`@392`, `@393`) | 33,149 (`@387`) | 10 · 105 · 90 |
| base tree, played 4× | GTX 1080 | 126 (`@396`, `@397`) | 33,151 | 12 · 108 · 89 |
| the lane as verified (`1803dba`), static | GTX 1080 | 129 (`@392`, `@393`) | 37,288 (`@393`) | 24 · 130 · 97 |
| **fix pass**, static | GTX 1080 | **128** (`@392`, `@393`) | **37,546** (`@393`) | 16 · 130 · 97 |
| **fix pass**, static | SwiftShader | **128** (`@392`, `@393`) | **37,546** (`@393`) | 16 · 130 · 97 |
| **fix pass**, played 4× | GTX 1080 | **130** (`@396`, `@397`) | 37,548 | 27 · 145 · 97 |

**The bench, in interleaved pairs** (`var/villains/bench-pairs.sh`: each tree
served in turn on port 5214, the serving directory checked before every bench;
`tools/arena-bench.mjs --no-bloom`, the default 600 ms settle; *reads* is the
frame the counters come from):

| bench | reads | renderer | base tree | fix pass |
|---|---|---|---|---|
| `villain-doom-248` `--index 388` | `@400` | GTX 1080 | 123 / 32,943 (twice) | 127 / 37,522 (twice) |
| `villain-doom-248` `--index 388` | `@400` | SwiftShader | 123 / 32,943 | 128 / 37,524 |
| `villain-doom-248` `--index 296` | about `@346` | GTX 1080 | 111 / 30,507 · 109 / 30,503 | 117 / 34,683 · 117 / 34,679 |
| `g1` `--index 355` | | GTX 1080 | 88 / 26,619 | 88 / 26,619 |
| `g1` `--index 355` | | SwiftShader | 89 / 26,621 | 89 / 26,621 |
| `g1` `--index 316` | | SwiftShader | 91 / 29,613 | 91 / 29,613 |

(The verifier's readings of `1803dba`: `--index 388` 128 / 37,264 on the GTX
1080 and 129 on SwiftShader, the base tree 123 / 32,943 — the same base.)

**What the numbers say.**

- **`g1` is unchanged** — no villain is on that table — so report 13 §8.2's line
  holds where it was drawn: 88/89 at `@355`, and `@316`'s 91 on SwiftShader is the
  status layer's (its follow-up 4).
- **The villain file's table is over the lines before any identity.** Its last
  turns put **49 cards on the two battlefields** (`@388`–`@392`) — the corpus's
  most crowded table; `human-sideboard-7`'s is 42 and `g1`'s 35. With every
  villain a bare body it draws 124 calls and 33,149 triangles at worst: the
  bench's hard 120 and §8.2's 30,000 are both crossed by the cards, the twelve
  figures and the discs.
- **Identity's increment at the worst frame is +4 calls and about +4,600
  triangles** — exactly its prop kinds: 17 there against the base tree's 13
  (`var/villains/kinds.mts`, the census's own counting). Nine kinds are the
  villains' (the cloak, the coat and its skirt, the gauntlets, the wings, the long
  hair, the mask, the cowl, the HYDRA squad) and five of the base tree's are gone:
  Peggy Carter's hat, shield, sidearm and waves and the parted hair, because the
  dressed villains now take the twelve model slots, where the base tree gave four
  of them to Peggy, a second Doombot and the two Robot tokens. The triangles are
  mostly the squad's two followers (about 2,800) and the cowls (432 each).
- **The fix pass took one kind off that table** (129 → 128; 24 → 16 frames over
  120): the Unliving Legionnaire wears the mask and the cowl the table already
  draws for Doom instead of a crop of its own. It costs 258 triangles (the cowl is
  heavier than the crop). Every kind left carries a card there; D222 lists what
  was weighed and rejected (the mask, the squad, a coarser cowl, `hood`).
- **Held by a test**: `traits.test.ts`'s `OVER_THE_LINE` holds the file to 22
  prop kinds at once (at `@296`, where the scene draws 102 calls) and to **17 on
  its most crowded frames** — the second is the one the calls follow. A control
  set to 16 fails it: *"17 prop kinds on its most crowded frames, over its
  measured 16"*. Every other recording is still held to 17 at once.
- **Frame times**: on the GTX 1080 the p95 is 4.0–6.0 ms at every villain bench
  above (base 4.0–4.4, fix pass 4.2–6.0); on SwiftShader it fails §9.4's 20 ms on
  every bench of both trees, `g1` included (20.8–37.1 ms), on a desktop at a load
  average of 1–6.

PLAN.md's villain-identity follow-up 4 is a budget for a crowded table (props shed
past a figure count, as `MAX_FIGURES` sheds models) — an arena change, measured
against every view, which this lane does not make.

## 7. The workshop, and the pictures

`node tools/build-workshop-catalog.ts`: 140 cards (139), 6 tokens (5 — the
Doombot added), the engine's facts for 71 names (94: 23 of the Doom Legion's 24
left the list for the corpus; only Hidden Lair is still the engine's), and — the
catalog's optional fact from the status layer, filled for the first time — the
wire's own `keywords` for the 24 cards the villain recording shows (Crossbones'
`DEATHTOUCH`, the A.I.M. Bot's `FLYING`, Frozen in Ice's `ENCHANT`), which the
pedestal's strip draws. The list
orders the Doom Legion second, after the deck in play, and its search matches
every deck that names a card (`catalog.ts`'s `matchesSearch`), so *doom legion*
finds all 27 — Aerial Doombot, Thriving Isle and Island are listed under Pacho.

Pictures, headless Chromium on the GTX 1080 against the dev server (a scratch
driver, `var/villains/shot.mjs`), **re-taken by the fix pass** after its changes;
the lane's first set is kept under `var/villains/r0/` for the comparison:

- `var/villains/pedestal-1x-<card>.png` — every Doom Legion creature and the
  Doombot token on the pedestal at the workshop's default **1× front**, comic look,
  fifteen files, and `var/villains/pedestal-1x-sheet.png`, the fifteen figures
  cropped side by side;
- `var/villains/eval-<card>.png` and `var/villains/eval-sheet.png` — the same in
  the INSPECT view, against each card's art;
- `var/villains/crops/cmp1.png` and `cmp2.png` — before (`r0/`) and after, side by
  side: the Legionnaire and Crossbones; Strucker (unchanged in the end), Madame
  Hydra and the Troopers;
- `var/villains/table-villain-doom-248-at-388.png` and `…-at-392.png` — the
  arena's table view at transport indices 388 and 392 of the villain file (392 is
  the sweep's worst frame): turn 24, thirteen villains on the table (twelve
  figures; a Doombot and the Robot tokens past `MAX_FIGURES` draw discs);
- `var/villains/oppshoulder-villain-doom-248-at-388.png` — the same frame over
  the opponent's shoulder (view 3), the villains seen from Pacho's side.

**The seats in those pictures.** The recording is seen from the Doom Legion's
seat (seat 0), and a duelist is a SEAT's (D99): so the S.H.I.E.L.D. director
duelist stands behind the villains and the Doom-cloaked villain duelist behind
Pacho's deck. That is the recording's seat, not a defect of the layer; a duelist
look keyed to the deck a seat plays is PLAN.md's villain-identity follow-up 12.

## 8. Tests and the gate

`npm --prefix web test`: `node --test` **1,077 tests, 1,071 pass, 0 fail, 6
skipped** (1,060 / 1,053 / 7 on `9dfdce4` — the skip that went is the build
check, which found a `dist`), and vitest **124** (122). `./bridge/build.sh`: build
OK, its five self-tests green. The gate: §9. The fix pass extended cases in place
and added none: the same **1,077 / 1,071 / 0 / 6** and **124** after it (§11).

## 9. The gate, from a deleted `bridge/out` — the lane twice, its fix pass twice

`GATE_JOBS=4`, `bridge/out` deleted before each run, the log teed:

| run | `WSPORT` | wall | result | log |
|---|---|---|---|---|
| 1 | 9120 | 263.3 s (48 jobs, 1,003.6 s of job time, load 1.3 → 12.2) | **check-all OK**, exit 0 | `var/check-all-villains-p1.log` |
| 2 | 9130 | 252.0 s (48 jobs, 953.8 s of job time, load 8.7 → 10.5) | **check-all OK**, exit 0 | `var/check-all-villains-p2.log` |
| fix pass | 9120 | 250.1 s (48 jobs, 961.3 s of job time, load 2.8 → 8.0 at most → 4.3) | **check-all OK**, exit 0 | `var/check-all-villains-fix1-run1.log` (`var/check-all/20260929-034451-765333/`) |
| fix pass, final tree | 9120 | 251.0 s (48 jobs, 953.2 s of job time, load 0.6 → 8.9) | **check-all OK**, exit 0 | `var/check-all-villains-fix1.log` (`var/check-all/20260929-035135-840825/`) |

Inside the gate `node --test` is 1,092 / 1,084 pass / 0 fail / 8 skipped (the
ws-log suite reads step 10's logs, `MTGTABLE_WS_LOGS`) and vitest 124 — the fix
pass's run the same. Step 6
compared `fixtures/games/g1.jsonl` (`wire-drift: SAME`) and 9b
`fixtures/games/human-auto-42.jsonl` — neither the villain file.

## 10. `~/forge` and `~/.forge`

Fingerprinted before the first JVM of this lane and after the last — every path,
size and mtime under both (`find -printf '%p %s %T@'`, sorted): 22,155 entries
both times, the listing's sha1 `d994c439…` both times, and no entry under either
newer than the lane's start stamp. The jar's sha256 is still `3c0a7c38…8e5dd9`.
**Unchanged.** Every JVM of the lane booted in `var/` (the seed search in homes of
its own, `forge_home_make`).

The fix pass fingerprinted both again before its first command and after its
gate: 22,155 entries and sha1 `d994c439…` both times, the two listings byte for
byte identical, no entry newer than its start stamp, the jar's sha256 still
`3c0a7c38…8e5dd9`. **Unchanged.**

## 11. The fix pass (D222, and D221 amended)

After the lane's first verification, on the same branch and worktree. Each
finding, and what was done:

- **Major — the busiest frame was misnamed, and it breaks the bench's hard 120.**
  Measured at every frame instead (§6): the worst is `@392`/`@393`, 129 calls on
  the lane as verified, 124 on the base tree, 49 battlefield cards. The cause of
  the misnaming: `arena-bench --index N` reads fifty frames past N. Recorded as
  **D222**, with the numbers; D220's item 6, PLAN.md's follow-up 4 and the
  `OVER_THE_LINE` comment corrected to them. One kind taken off that table (the
  Legionnaire's crop, for the cowl and mask the table already draws): 128 at
  worst, 16 frames over 120 where there were 24. `OVER_THE_LINE` now also holds
  the file's most crowded frames to their 17 kinds, negative-controlled.
- **Minor — five guards loosened.** `ONE_SIDED`'s cloak and tunic rows narrowed to
  Doom (`only`); the raster still passes with every other wearer's cloak held to
  both seats (Madame Hydra's at exactly 48 px from the far seat). The attach bound
  (3%) and the four boxed-in frames stay, now named in follow-up 3 with the table
  that causes both; `OVER_THE_LINE` is follow-up 4 and D222.
- **Minor — the Troopers' note named a cowl they did not wear.** They wear it
  now: HYDRA's hood, as the Agents'; the census's task list and the villain
  costume list read it back.
- **Minor — the look** (the verifier's reading of the pictures, acted on):
  - the Unliving Legionnaire was an ordinary man in navy with a red sash; it is
    now a corpse-pale lavender face (`mask`, `shade: 1`) under a wine-black hood,
    violet and crimson, on magenta wings (its card's membranes are pink), every
    colour above the comic look's black threshold;
  - Crossbones read navy — the comic look lifts a paint under its black threshold
    to navy (Lane LOOK) — and slim: he is in warm charcoal fatigues over the
    threshold, at scale 1.14 (0.969 of a height, the width clamp untouched);
  - green dominated: Madame Hydra's catsuit and cloak are charcoal, as her card
    paints them, with her green hair; Strucker went to field grey first and came
    back, because his card's coat is green (so are Doom's, HYDRA's and Loki's);
  - Loki's horns, the Legionnaire's wings from eye level, Doom-shaped Doombots,
    Crossbones' bulk: PLAN.md's villain-identity follow-ups 8–11.
- **Minor — the duelists stand behind the wrong seats in this replay.** Noted in
  §7, and follow-up 12.
- **Minor — the commit's attribution line.** Left as the session's rule sets it;
  noted in PLAN.md's *Villain identity*.
- **Found in passing**: PLAN.md's villain-identity follow-ups carried the anchor
  `fu-villains`, which the *More villains* lane's list already had, so every
  *Open now* link to them opened the other list. Renamed `fu-villain-identity`,
  and the twelve rows point at it.

**The controls, re-run**: `npm --prefix web test` 1,077 / 1,071 / 0 / 6 and 124
vitest; `traits.test.ts` 32 of 32 (the census, the raster from both seats, the
villain costume list, the crowded-frame guard and its control at 16); the
catalog `--check` current; the gate from a deleted `bridge/out`, twice (§9:
250.1 s, then 251.0 s on the final tree after a last `_note` wording edit, both
`check-all OK`); the budget sweeps and bench pairs (§6); the pictures (§7);
`~/forge` and `~/.forge` (§10).
