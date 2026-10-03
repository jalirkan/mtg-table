# Evidence — the status layer (amendment M49, D210–D212)

Branch `status-layer`, off `main` at `f2c934d`, in the worktree
`mtg-table-t2z`, on 2026-09-28. Everything below was run on this machine that
evening; every number names what produced it. The pictures are under
`var/status/` (gitignored, local) and listed in §7.

The brief, the owner's, with a Final Fantasy XIII screenshot: watching a game
should read like a turn-based RPG — each creature with a small status strip of
its keyword abilities, a bar of what is left of its toughness, a pip per counter
and a mark per attachment, and the phase strip as a turn-order bar. Everything a
pose: derived from the snapshot, correct after a skip, a scrub, a `resync` and a
new `gameId`, never remembered.

---

## 1. The wire — amendment M49

**The accessor, on the pinned jar** (`javap`, 2.0.14, sha256 `3c0a7c38…8e5dd9`):
`forge.game.card.CardView$CardStateView.getKeywords()` returns a
`forge.game.keyword.KeywordCollectionView`, an `Iterable<KeywordView>`;
`KeywordView` has `keyword()` (the `Keyword` enum), `title()`, `original()` and
`reminderText()`. `updateKeywords(Card, CardState)` fills it from the STATE's
cached keywords (`CardState.getCachedKeywords()`), so it is the current state's,
statics included. The enum has **202 constants**, `UNDEFINED` among them, and all
fourteen of the owner's evergreen names are constants.

**The census** — a temporary stderr line in `Snap.card` (removed before the
commit) printing every distinct `(keyword, title, original)` it serialised, over
fourteen `RecordMatch` recordings that between them seat every deck in `decks/`:

| recordings | pairs (seat 0 vs seat 1, seed) |
|---|---|
| ten | pacho-shield vs doom-legion 1 · masters-of-evil vs hulk-family 2 · wakanda vs pacho-shield 3 · morph-probe vs trample-probe 4 · yield-probe vs search-probe 5 · doom-legion vs wakanda 6 · hulk-family vs masters-of-evil 7 · amount-probe vs number-probe 8 · sideboard-probe vs scry-probe 9 · future-sight-probe vs pacho-shield 10 |
| four more, face-down only | morph-probe vs trample-probe 4 · morph-probe vs pacho-shield 11 · trample-probe vs morph-probe 12 · morph-probe vs morph-probe 13 |

Every keyword seen: `FLYING`, `VIGILANCE`, `TRAMPLE`, `REACH`, `LIFELINK`,
`INDESTRUCTIBLE`, `FIRST_STRIKE`, `TEAMWORK`, `MENACE`, `HASTE`, `FLASH`, `EQUIP`,
`ENCHANT`, `WARD`, `TYPECYCLING`, `MORPH`, `MELEE`, `ECHO`, `DEATHTOUCH`, `CREW`
— and one `UNDEFINED`, whose `original()` is `ETBReplacement:Other:ChooseColor`
(engine script: the Thriving lands' "choose a colour") and whose `title()` is
`""`. So the wire carries `name()` and nothing else, `UNDEFINED` is omitted, and
"the display string otherwise" had nothing to say (D210 item 4).

**Face down.** The four face-down recordings serialised **433 face-down card
instances** (`"faceDown":true` lines: 68 + 143 + 48 + 174); the census line was
widened to face-down states for that run and printed **none** — the face-down
characteristic carried no keyword. The bridge forces `[]` for every face-down card
anyway, in both branches of gate 2, as it forces the name.

**Fresh recordings, after.** Seed 42 re-recorded as gate step 5 does
(`var/status/census/g1-fresh.jsonl`): `node tools/check-redaction.mjs` passes and
prints *"M49 keywords present on every full card"*; `node tools/wire-drift.mjs
fixtures/games/g1.jsonl` against it says **SAME** on all six questions, *"and byte
for byte too: 377 normalised lines identical"*, after *"g1.jsonl predates keywords
(M49): removed from 9319 object(s) of the fresh file"*. A morph-probe mirror at
seed 13 (`var/status/census/morph-m49.jsonl`): 4,405 full cards carry the key,
1,335 non-empty, **295 face-down, all `[]`**. The committed corpus (18 + 1 files)
still passes the checker, reporting *"M49 keywords absent from every full card
(legitimate — recorded before amendment M49)"*.

**The checker's controls** (`node tools/check-redaction-selftest.mjs`, OK): the
generator adds `keywords` to every full card of the g1 slice exactly as `Snap.card`
writes it, and five files come out of it —

| file | verdict | the checker's words |
|---|---|---|
| `m49-keywords-present.jsonl` | pass (the control) | — |
| `m49-stub-carries-keywords.jsonl` | fail | *redacted card 80 leaks extra keys: keywords (A1)* |
| `m49-keyword-is-a-display-string.jsonl` | fail | *`.keywords = ["Flying"]` does not match the type docs/protocol.md declares* |
| `m49-face-down-carries-keywords.jsonl` | fail | *is face down and carries keywords ["FLYING"]* |
| `m49-keywords-half-present.jsonl` | fail | *M49's keywords are HALF PRESENT — 29 full card(s) carry "keywords" and 1 do not* |

Regenerating the corpus left every existing negative fixture byte-identical.

**Drift tools.** `tools/wire-drift-selftest.mjs`: 22 cases, every verdict as
expected — 3 accepted by both modes (the identical copy, D121's reordered stats
ids and M49's newer keywords), 5 re-partitions, 14 drifts (one new: keywords added
AND a zone move changed, so the strip hides nothing else). 9b's
`tools/fixture-multiset-diff.mjs` drops the key the same way (`AMENDED_CARD_KEYS`);
over g1 against the fresh seed-42 file its remaining 90 differing frames are the
D121 stats-id order it has never normalised, not keywords.

## 2. The data — one table, two renderers

`web/src/status.ts` is pure (no React, three or DOM): 20 glyphs of 24 × 24 SVG
path data (the fourteen evergreen keywords, the generic *ability*, the overflow
*more*, the Aura / Equipment / attachment marks and the pip), the keyword map,
`keywordLabel` (`FIRST_STRIKE` → *First strike*), the bar (`hpOf`), the pips, the
marks, and `cardStatus`, which answers `null` for a stub and for every face-down
card. Keywords are read through `protocol.ts`'s `keywordsOf` only.

## 3. The board

`CardTile` draws the row inside the tile's button — so an icon's `title` shows on
hover and a click on it is still a click on the card — on battlefield, land and
hand tiles: up to five icons (a fifth and later fold into a *more* whose title
lists them), each with `data-keyword` and the keyword's words as its title, and on
a battlefield creature the bar along the bottom edge, its title
`toughness 4 − damage 1 = 3`. The P/T pill and the counters step up above it
(`.tile--kw`, `.tile--hp`); the damage chip is unchanged (D211). The tile's
accessible name gains the keywords as words.

`render.test.tsx`'s new case renders four frames of every fixture as a seat with
EVERY card handed keywords: **74 frames, 25 concealed tiles drew no icon, 1,367
face-up tiles drew icons.** The control: with the gates taken out of `cardStatus`
and `keywordsOf` it fails at once (*"fixtures/games/disjoint.jsonl: frame 69 drew
a keyword icon on concealed card #48"*); restored, it passes. The per-frame
`data-card-name` backstop is unchanged and green.

## 4. The arena

`figures/status.ts` (pure) lays each strip out as pixel quads above an anchor;
`scene/status.ts`'s `StatusField` draws them all in ONE `InstancedMesh` — 384
quads, one `ShaderMaterial`, one 512 × 256 canvas atlas painted once per page.
Committed by `FigureLayer` once per snapshot, bound from `DiscField.bind` (a
lunge carries the strip, a hover bob moves it), the viewport read as the mesh is
drawn (`onBeforeRender` → `getCurrentViewport` over the pixel ratio — the first
cut measured against the canvas, and the workshop's split view drew every icon
half as wide; now round in both halves).

**The corpus sweep** (`status.test.ts`): **3,679 frames, 10,763 strips** (10,763
with a bar, 1,295 with pips, 1,627 with marks), **1,179 concealed creature
instances with none**. Hostile, every card handed keywords: **10,763 keyworded
strips, all face up; an ungated layout would have drawn 1,138 over concealed
cards** (the control).

**Size.** An icon is a 16 CSS px quad from every view; the shader maps CSS px
through the drawn viewport, so at the table view at 1600 × 1000 it is 16 px (the
owner's floor 14). Four icons and their gaps are 70 px, under the ~78 px between
two figures of the far rank at `g1`@355.

**Above the head, by measurement.** `status.test.ts` projects every figure pose a
corpus sample reaches (every 25th state frame, one pose per card × seat × stance)
through `prop-raster.ts`'s camera at the table view and the real `figures.glb`,
with the props, and holds the strip's lowest pixel above the head and anything
worn on it (the kinds the kit anchors on the `Head` joint) and, for a carrier,
the whole hull. The first cut (anchor at the standing height + 0.07, strip 4 px
above it) failed there:

| what | gap | why |
|---|---:|---|
| S.H.I.E.L.D. Helicarrier (opp) | −12.8 px | a carrier's `height` is its hull's thickness; the island is 0.25 hull lengths up |
| Ant-Man's helmet | −1.8 px | worn above the head |
| Giant-Sized Flying Ant (opp): head, rider | −0.6, −0.5 px | flown side-on (D76), the wing and rider reach up and back |
| Ant-Man's Air Force: a bee | −0.3 px | the swarm flies round the strip's anchor |

The fix: the strip's lowest pixel 8 px above the anchor, and a carrier's anchor
over its island (`CARRIER_TOP`). Now: **65 figure poses measured, the closest
strip 2.2 px above a head** (Ant-Man, Reformed Rogue, your seat, ready, `g2`
frame 200); **with no pixel lift the closest would be 5.8 px into one** — the
control. Raised hands and held props are not the head and may reach the strip
(Quake's gauntlets attacking, −9 px; Agent 13's muzzle at the ready, −7.6 px):
follow-up 6. On the far seat the heads lean toward the lens, so the strips sit
~30 px above them, over the opponent's land rank (follow-up 5).

**It stays upright when its figure kneels** — the anchor is the standing height's;
a kneel only widens the gap.

## 5. The turn-order bar

`DecisionLayer.tsx`'s `TurnOrderBar`, at the arena's left edge under the chrome
band: the eleven phases a turn gives priority in (`UPKEEP` … `END_OF_TURN`), the
active one lit in the turn player's colour (your `--you`, their `--opp`), and per
phase two stop pips from `phaseStopsOf(seat)` — the board's own reader — which
send `act: setPhaseStop {phase, turn, stop}` exactly as the board's dots do, live
only at a seat with no question open and before `over`. `UNTAP` and `CLEANUP`
are named in the header when the game is in one. A stream with no stops draws no
pips. Its `.arena__phases` class is in `liveness.test.ts`'s widget table with its
`pointer-events: auto` rule. Picture: `var/status/phase-bar-zoom.png`
(`human-comfort-13` frame 790: their turn, round 5, *Block* lit, the recording's
stops marked).

## 6. The budget, the bench and the build

**The bench** (`tools/arena-bench.mjs --index <n> --no-bloom --settle 4000`, the
production build under `vite preview`, base = `f2c934d`'s web client built from
`git archive` into `var/status/base/`, three interleaved base/branch pairs per
row; the counts were identical within a side in every pair):

| frame | rasteriser | draw calls base → branch | triangles base → branch | p95 ms base / branch |
|---|---|---|---|---|
| `g1`@355 | GTX 1080 (ANGLE GL) | 87 → **88** | 26,539 → 26,619 | 0.6–0.7 / 0.6 |
| `g1`@355 | SwiftShader | 88 → **89** | 26,541 → 26,621 | 34.2–34.6 / 34.0–34.4 |
| `g1`@316 | GTX 1080 (ANGLE GL) | 86 → **87** | 26,315 → 26,395 | 0.6–0.7 / 0.6–0.7 |
| `g1`@316 | SwiftShader | 90 → **91** | 29,521 → 29,613 | 33.5–33.8 / 34.0–34.2 |

The strip is **one draw call** for the table, as the brief required, and 80–92
triangles (40–46 quads). At `g1`@355 — the brief's frame — it is 88 / 89, under
90; triangles stay under 30,000 everywhere. At the bench frame `g1`@316 on
SwiftShader it is **91, one over report 13 §8.2's line** — D212 item 5 accepts it,
measured, and follow-up 4 says what the next layer must give back. SwiftShader's
p95 over §9.4's 20 ms gate is the base's too (34 ms both sides; the software
rasteriser has been over it since Lane BODIES); frame times move within the pair
spread.

**The build** (`npm --prefix web run build`, gzip): the 2D entry chunk **90.40 →
93.52 kB** (the glyph kit and the tile's row; `grep WebGLRenderer` finds nothing
in it — no `three`), `arena-scene` **369.35 → 371.93 kB**, `Arena` 16.46 kB,
`Workshop` 25.81 kB, `Post` 17.71 kB.

**The tests.** `npm --prefix web test` standalone: **1014 `node --test` (1008
pass, 6 skipped — the ws-log suite's two new M49 cases skip on the committed,
pre-M49 fallback corpus) + 122 vitest (8 files)**, up from 999 + 121.
`./bridge/build.sh`: the lint and its self-test, javac, the five self-tests, OK.

## 7. The pictures (`var/status/`, local)

| file | what |
|---|---|
| `before-g1-355-table.png` | the arena at `g1`@355, table view, before the lane |
| `after-g1-355-table.png` | the same frame after: bars, pips and marks (g1 predates M49, so no icons) |
| `after-g1m49-355-table.png` | the same game re-recorded with M49 (seed 42): the strips with their keyword icons |
| `after-g1m49-355-zoom-your-rank.png` | your rank of that frame at 2.4×: the flying ant, the Doombot with its three +1/+1 pips, Wasp, the Robot token, two Soldier tokens |
| `after-g1m49-355-zoom-their-rank.png` | the opponent's rank at 2.4× |
| `before-g1-355-board.png` · `after-g1m49-355-board.png` | the 2D board before, and after with the keyword row and the bar |
| `after-g1m49-355-board-their-permanents.png` | the opponent's permanents row at 1.6× |
| `closeup-fury-peggy.png` (`closeup-fury.png`, `closeup-peggy.png`) | the workshop's *status strip* rehearsal on Nick Fury, Spymaster and Peggy Carter, Secret Agent, 1× from your seat: the sample keywords (flying, first strike, lifelink, one *ability*), the bar drained by the rehearsal's damage, the +1/+1 pip |
| `workshop-peggy-status-both-seats.png` | the same rehearsal in the split view, after the viewport fix |
| `phase-bar-comfort-13.png` · `phase-bar-zoom.png` | the turn-order bar (`human-comfort-13` frame 790) |

## 8. The workshop

The rehearsal list gains **status strip: keywords, damage and a counter** for
every creature (and the face-down entry, where it shows that no strip appears):
the before board gives the subject its keywords, the batch is a `damage` event
(non-combat, `damageType: "Normal"`, the corpus's shape) and a `counters` +1/+1
0 → 1, and the after board carries both. No committed recording has keywords, so
the rehearsal uses a sample — `FLYING`, `FIRST_STRIKE`, `LIFELINK`, `TEAMWORK` —
and its fiction line says so. The catalog learned an optional `keywords` fact,
read from a face-up sighting that carries the key; `node
tools/build-workshop-catalog.ts` rebuilt `catalog.json` **byte for byte
unchanged**, because no committed recording carries one yet. The pedestal lays
the strips out with the arena's own `statusLayout` (listed in `Workshop.tsx`'s
coupling header); `workshop.test.ts` plays every rehearsal of every card through
the real queue, `status` included, and every one decays to identity.

## 9. The gate

`./tools/check-all.sh` at `GATE_JOBS=4`, each run from a deleted `bridge/out`:

| run | `WSPORT` | wall | jobs' seconds | load (1 min) | result |
|---|---:|---:|---:|---|---|
| first try (`var/check-all-status-p1-failed.log`) | 9030 | 263.9 s | 1,027.1 s | 2.37 → 12.20 | **failed at step 13 (`13c-node`)** — this lane's own ws-log case asked every M49 session for a non-empty keyword, and step 10g plays `decks/yield-probe.dck`, 22 Thallids with none. The per-file case now holds "every full card carries the key" and an across-the-sessions case holds "some card carries a keyword"; replayed over that run's logs, green |
| pass 1 (`var/check-all-status-p1.log`) | 9030 | **245.5 s** | 945.3 s | 6.42 → 8.49 | **check-all OK**, exit 0 |
| pass 2 (`var/check-all-status-p2.log`) | 9040 | **249.6 s** | 961.3 s | 7.03 → 7.96 | **check-all OK**, exit 0 |

Both green passes: 48 jobs; `node --test` inside the gate **1029 / 1021 pass / 0
fail / 8 skipped**, and **122 vitest**; the ws-log suite's across-the-sessions
case read *"M49 across 10 session log(s): 5,790 full-card sightings with a
keyword"* (5,787 in pass 2).

## 10. `~/forge` and `~/.forge`

Fingerprinted before the lane (`sha256` of the jar — `3c0a7c38…8e5dd9` — and
`sha1sum` of every file under `~/.forge` and at `~/forge`'s top level, and the
two-deep file list, 32 lines) and after the second green gate pass: **unchanged**,
line for line.
