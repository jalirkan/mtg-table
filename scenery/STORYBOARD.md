# STORYBOARD.md: the live board, land by land, against SYSTEM.md

Made on 2026-11-02 for Justin to judge. These are real screenshots of the live ForgeCoach `#ambience` board at
`https://jalirkan.github.io/ForgeCoach/`, with scenery `pack-v9.2` and pairs `pairs-v7.1`. The shots are mostly
taken behind `?pairfull=1`; sequences 5 and 6 are also shot on the default board. Each state is taken after a land is
played. Every state is shot on desktop (1600x1000) and on phone (390x844 @2x). The clip is your half ("bottom"),
except sequence 9, which shows the whole table. The shots use reduced motion and `waitMs 9000`. 182 shots, with no
console errors.

The situations are chosen by design, not by data. The owner's rule is that any colour can be on the board, up to 6
lands each.

**Where things are:**

- **Sheets:** `~/scenery-packs/panoramas-v1/sheets/storyboard-<n>-<name>.jpg`, about 3000 px wide, plus a half-size
  `-web.jpg`. Each sheet has one column per turn. Desktop is the upper row and phone the lower. Each tile is
  labelled with:
  - the turn and the land played;
  - the weights;
  - the plan read off the page: the pair, its cell, the split, any mirror, the painted third colour and its side;
  - the board's own caption;
  - the gaps, in red.
- **Raw shots and report.json:** under the session scratchpad,
  `/tmp/claude-1000/-home-justin-a-code-mtg-table/8723af12-0157-421e-988a-473182e5a3f1/scratchpad/sb/out/`. These go
  when the session ends; the sheets keep them.
- **The tool:** a scratch copy of `panoramas-v1/tools/shoot.mjs`, called `sb/shoot-sb.mjs`. Its only change is that
  it also records each side's summary, its caption, every slot's `data-*` fields and the visible overlays. The
  original tool is untouched.
- **Undo:** the page's Undo button, `button:text-is("Undo")`, worked with the stock `clicks` option.

**How the "should show" column is computed.** It applies `SYSTEM.md` §A steps 1–6 and *One world* §C.4–5 to the
lands, turn by turn. It carries state forward, because A5's tie rule ("the pair already showing stays") needs the
previous turn.

- Weights: a basic counts 1, and a dual counts ½ to each of its colours.
- The geography order Island → Swamp → Plains → Forest → Mountain picks the left half.
- Each half's stage is its own colour's weight (§C.5). The cell is `<left stage>x<right stage>`.
- The split is the share of the colour drawn on the left. The picture is mirrored when the geography's right colour
  arrived first (A4).
- A dual's two colours arrive together. The spec gives them no board order, so geography order is used and the
  picture is not mirrored. The board does the same.
- A third colour's element goes on the heavier pair colour's ground (A5). Colours past the third show nothing (A6).
- Transitions (A8, the B7 fronts) can't be judged from stills, so they are not checked.

**A gap is one of these:**

- a colour that shows nothing;
- a wrong pair;
- a cell, split or mirror that differs from the spec;
- a caption that misreads;
- desktop and phone disagreeing;
- a picture that flips or re-keys.

A re-key is in the list because §C's rule is "adding a single mana should not completely redraw the entire landscape".
Folds marked *by design* are what A6 says. They are listed because of the owner's soup rule.

## The gaps, each at the smallest turn that shows it

1. **The phone never shows a third colour.** *(First seen: seq 7 T2, Tropical Island + Tundra, the 2nd land. Also
   seq 4/5/8 T3 and seq 6 T3.)*
   - `pairs-v7.1`'s painted-in cells have desktop pictures only. On a phone the slot carries no `data-pairfull-painted`
     and draws the bare seam picture.
   - Desktop, by contrast, shows black channels and dead trees on the plains, a smoking cone in the sea, a green islet
     and a light shaft.
   - So every three-colour state is a two-colour picture on the phone. This fails A5 on every phone tile in seqs 4–8.
2. **A5's tie rule is not followed: the board leaves the showing pair on a tie.** *(First seen: seq 7 T5, U2 G1.5
   W1.5.)*
   - Seq 7 T5: Island+Plains was showing. Forest tied Plains at 1.5, and the board went back to Island+Forest. The
     whole plains half became forest, and the element changed from G to W.
   - Seq 5 T6: U2 B2 R2. Island+Mountain was showing, and the board went back to Island+Swamp, so the half flips from
     red desert back to green bog.
   - From seq 5 T6 to T9 every later difference (R painted instead of B, B folded instead of R) follows from that one
     tie. Given the pair the board did choose, its later picks are consistent with A6.
   - The board looks like it breaks ties by arrival order alone.
3. **Re-keys redraw the whole half.** *(First seen: seq 5 T4, a second Mountain: Island+Swamp becomes Island+Mountain.
   The swamp half, its bog and dead trees, is replaced by red desert, and the swamp drops to a small element. Also seq 7
   T4.)*
   - This is what A5 asks for ("a re-key is a new makeup", A8). It is also exactly what *One world* §C forbids
     ("adding a single mana should not completely redraw"). The spec contradicts itself here, and only Justin can
     settle it.
   - At its worst it is seq 6 T10 → T11 → T12: three lands bring three unrelated landscapes. They go
     plains/coast → savannah/forest → floating-island dusk/forest.
4. **An uneven pair (|i−j| > 1) moves the light colour's half without a land of that colour.** *(First seen: seq 3
   T4, Forest 3 + Island 1.)*
   - `pairs-v7.1` paints only the cells with |i−j| ≤ 1, so the board clamps. Island 1 is drawn at s2, then s3, then s4
     as Forests arrive. The caption says so ("island s1→s4 … (clamped)").
   - By T6 a single Island draws as a stage-4 sunset coast, while the summary says "Island 1 · stage 1".
   - This breaks §C.5 ("adding one land changes one half's stage, never the other half"). It also breaks the
     owner's 5+2 splash case, a common shape.
5. **Colours past the third show nothing (by design, A6).** *(First seen: seq 6 T4 and seq 8 T4, the 4th colour on
   the 4th land.)*
   - In the five-colour soup, Mountain and Forest show nothing from T4 to T10, even at two lands each at T9–T10.
   - At T11 the board re-keys and Swamp and Mountain vanish instead.
   - Under "any and every colour can be on the board", that is up to two-fifths of a soup deck's colours invisible
     for most of a game. This needs Justin's word: it is per spec, but it is the biggest visible gap for soup decks.
6. **The caption names a dual card that is not on the board.** *(First seen: seq 2 T2, Island + Forest captioned
   "Pair band · Tropical Island (Breeding Pool)".)*
   - This happens on every pair, on both boards and both shapes.
   - A learner can read it as "you have a Tropical Island". It is the pair's label from the manifest's `dual`/`shock`,
     not a card in play.
7. **The default board (no `?pairfull=1`) is not §A at all.** *(First seen: seq 5d T2.)*
   - It draws two or three mono panels side by side, joined by 10%-wide road bands, with no single pair picture and
     no elements.
   - It keeps three panels and drops the rest. In seq 5d T7–T8 Forest shows nothing. At T9 Mountain disappears and
     Forest takes its panel.
8. **The two halves of a pair show different times of day.** *(First seen: seq 2 T5, Island s3's lilac dusk beside
   Forest s2's daylight. Also seq 4 T7, a dusky plains sky beside a bright noon sea.)*
   - This is per §C.6 ("each half carries its own hour"), but the sky visibly changes hour at the seam. On the
     sheets it reads as two pictures, not one.
9. **Small render oddities, seen by eye:**
   - In seq 4 T7–T9 desktop (Plains at stage 3), a white torn-paper strip runs along the top-left edge, and two faint
     concentric arcs sit in the sky. These are probably the plains `front-s3` area accent and the seam picture's
     painted halo, but this is not confirmed.
   - In seq 1 T3+ the island `front-s3` accent puts a pale shell at the bottom-right corner. At phone size it reads
     like a mouse cursor.
   - In seq 9, on the phone from T6, the opponent's header grows to four lines (the summary plus the pair caption).
     That pushes the far picture down and makes it shorter than the near one.
10. **Places where the spec is silent and the board chose something.** These are not board bugs:
    - On a tied pair, A5's element ground is unspecified. The board uses the first-arrived colour's ground (island
      in seq 5 T3, plains in seq 4 T3).
    - A dual's own board order is unspecified for A4's mirror. The board uses geography order, so Tropical Island
      first is not mirrored.

**What works as the spec says:**

- Mono 1–6 on both shapes (seq 1).
- The even pair: each land moves only its own half and the cells step 1x1 → 4x4 (seq 2).
- Splits and mirrors throughout. Plains first mirrors Island+Plains, and the split is the left colour's share.
- The empty-table piece on the opponent's empty half (seq 9 T1). It shows a field of standing stones in mist.
- Both chairs (seq 9). The far half is upright, faded toward the centre, with its own pair.
- Undo (seq 8). Taking back Forest leaves the picture as it was. Taking back Mountain removes the red element, and
  T6 draws the same picture as T2.

## My read of the sheets, by eye

- **storyboard-5 (Justin's four) looks the most wrong.** The coast and bog go to red desert (T4), then turquoise and
  red (T5), then back to green bog (T6), then jungle (T9). That is four different landscapes in nine lands, and one
  of the jumps (T6) is the tie-rule bug. On the phone, the R/B elements never appear at all.
- **storyboard-6 (five-colour soup)** is calm for T2–T10, and that calm is the problem. A WUBRG board at two lands
  each looks like an Island+Plains coast with a black channel. Then T11 and T12 are two total redraws in a row.
- **storyboard-3 (splash)** looks wrong to the eye from T5. A one-Island splash grows into a lit sunset lagoon strip at
  the right edge, and its sky does not match the forest's.
- **storyboard-7 (duals first)** reads well through T4, where the Forest is a small green islet in the coast and that
  is the best element on the sheets. Then T5 throws the plains away for forest cliffs.
- **storyboard-4 (three even)** is coherent on desktop. The swamp's black channels run through the plains and get
  stronger. But the phone row is plain Island+Plains all the way, and T7's sky has the strip and arcs oddity.
- **storyboard-1, -2, -8 and -9 look right.** Seq 2 is the clearest demonstration of *One world* working: the island
  half and the forest half evolve in turn.
- **storyboard-5d and -6d (default board)** look like a row of postcards: hard vertical panels with misty bands. Next
  to the flag's sheets they show what the panorama system gains. They also show that the default drops a colour
  exactly as the flag does, just a different one.

## Per-sequence tables

The tables are generated from report.json by `sb/analyse.py` and `sb/md.py`. Where the phone's caption equals the
desktop's, it is marked "caption as desktop".

### 1. Mono: Island x6

Sheet: `sheets/storyboard-1-mono.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/1-mono/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | 1:Island -> U2 | island mono s2 (A3) | island s2; overlays 1 | island s2; overlays 1 | -- |
| 3 | 1:Island -> U3 | island mono s3 (A3) | island s3; overlays 1 | island s3; overlays 1 | -- |
| 4 | 1:Island -> U4 | island mono s4 (A3) | island s4; overlays 1 | island s4; overlays 1 | -- |
| 5 | 1:Island -> U5 | island mono s5 (A3) | island s5; overlays 1 | island s5; overlays 1 | -- |
| 6 | 1:Island -> U6 | island mono s6 (A3) | island s6+1; overlays 1 | island s6+1; overlays 1 | -- |

### 2. Even pair: Island/Forest alternating (4+4)

Sheet: `sheets/storyboard-2-even-pair.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/2-even-pair/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | 1:Forest -> U1 G1 | island+forest cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 1x1 split 0.50 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s1 / forest s1, seam 1x1" | island+forest cell 1x1 split 0.50 (caption as desktop) | caption names Tropical Island (not on the board) |
| 3 | 1:Island -> U2 G1 | island+forest cell 2x1 (§C.5), split 0.67 (island share) (A4, §C.4) | island+forest cell 2x1 split 0.67; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 67% / forest 33%, island s2 / forest s1, seam 2x1" | island+forest cell 2x1 split 0.67; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 4 | 1:Forest -> U2 G2 | island+forest cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 2x2 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s2 / forest s2, seam 2x2" | island+forest cell 2x2 split 0.50; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 5 | 1:Island -> U3 G2 | island+forest cell 3x2 (§C.5), split 0.60 (island share) (A4, §C.4) | island+forest cell 3x2 split 0.60; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 60% / forest 40%, island s3 / forest s2, seam 3x2" | island+forest cell 3x2 split 0.60; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 6 | 1:Forest -> U3 G3 | island+forest cell 3x3 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 3x3 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s3 / forest s3, seam 3x3" | island+forest cell 3x3 split 0.50; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 7 | 1:Island -> U4 G3 | island+forest cell 4x3 (§C.5), split 0.57 (island share) (A4, §C.4) | island+forest cell 4x3 split 0.57; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 57% / forest 43%, island s4 / forest s3, seam 4x3" | island+forest cell 4x3 split 0.57; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 8 | 1:Forest -> U4 G4 | island+forest cell 4x4 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 4x4 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s4 / forest s4, seam 4x4" | island+forest cell 4x4 split 0.50; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |

### 3. Splash: Forest x3, Island, Forest, Forest, Island (5+2)

Sheet: `sheets/storyboard-3-splash.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/3-splash/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Forest -> G1 | forest mono s1 (A3) | forest s1 | forest s1 | -- |
| 2 | 1:Forest -> G2 | forest mono s2 (A3) | forest s2; overlays 1 | forest s2; overlays 1 | -- |
| 3 | 1:Forest -> G3 | forest mono s3 (A3) | forest s3; overlays 1 | forest s3; overlays 1 | -- |
| 4 | 1:Island -> G3 U1 | island+forest cell 1x3 (§C.5), split 0.75 (forest share), mirrored (A4, §C.4) | island+forest cell 2x3 split 0.75 mirrored; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: forest 75% / island 25%, island s1→s2 / forest s3, seam 2x3 (clamped)" | island+forest cell 2x3 split 0.75 mirrored; overlays 1 (caption as desktop) | cell 2x3 vs expected 1x3 (no seam painted for /i-j/>1); caption names Tropical Island (not on the board) |
| 5 | 1:Forest -> G4 U1 | island+forest cell 1x4 (§C.5), split 0.80 (forest share), mirrored (A4, §C.4) | island+forest cell 3x4 split 0.80 mirrored; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: forest 80% / island 20%, island s1→s3 / forest s4, seam 3x4 (clamped)" | island+forest cell 3x4 split 0.80 mirrored; overlays 1 (caption as desktop) | cell 3x4 vs expected 1x4 (no seam painted for /i-j/>1); caption names Tropical Island (not on the board) |
| 6 | 1:Forest -> G5 U1 | island+forest cell 1x5 (§C.5), split 0.80 (forest share), mirrored (A4, §C.4) | island+forest cell 4x5 split 0.80 mirrored; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: forest 80% / island 20%, island s1→s4 / forest s5, seam 4x5 (clamped)" | island+forest cell 4x5 split 0.80 mirrored; overlays 1 (caption as desktop) | cell 4x5 vs expected 1x5 (no seam painted for /i-j/>1); caption names Tropical Island (not on the board) |
| 7 | 1:Island -> G5 U2 | island+forest cell 2x5 (§C.5), split 0.71 (forest share), mirrored (A4, §C.4) | island+forest cell 4x5 split 0.71 mirrored; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: forest 71% / island 29%, island s2→s4 / forest s5, seam 4x5 (clamped)" | island+forest cell 4x5 split 0.71 mirrored; overlays 1 (caption as desktop) | cell 4x5 vs expected 2x5 (no seam painted for /i-j/>1); caption names Tropical Island (not on the board) |

### 4. Three even: Plains, Island, Swamp x3

Sheet: `sheets/storyboard-4-three-even.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/4-three-even/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Plains -> W1 | plains mono s1 (A3) | plains s1 | plains s1 | -- |
| 2 | 1:Island -> W1 U1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4) | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | island+plains cell 1x1 split 0.50 mirrored (caption as desktop) | caption names Tundra (not on the board) |
| 3 | 1:Swamp -> W1 U1 B1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 1x1 split 0.50 mirrored; B painted right -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1; B painted in, on plains's ground" | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 4 | 1:Plains -> W2 U1 B1 | island+plains cell 1x2 (§C.5), split 0.67 (plains share), mirrored (A4, §C.4); B element on plains ground (A5) | island+plains cell 1x2 split 0.67 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 67% / island 33%, island s1 / plains s2, seam 1x2; B painted in, on plains's ground" | island+plains cell 1x2 split 0.67 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 67% / island 33%, island s1 / plains s2, seam 1x2" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 5 | 1:Island -> W2 U2 B1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 6 | 1:Swamp -> W2 U2 B2 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 7 | 1:Plains -> W3 U2 B2 | island+plains cell 2x3 (§C.5), split 0.60 (plains share), mirrored (A4, §C.4); B element on plains ground (A5) | island+plains cell 2x3 split 0.60 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 60% / island 40%, island s2 / plains s3, seam 2x3; B painted in, on plains's ground" | island+plains cell 2x3 split 0.60 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 60% / island 40%, island s2 / plains s3, seam 2x3" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 8 | 1:Island -> W3 U3 B2 | island+plains cell 3x3 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 3x3 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s3 / plains s3, seam 3x3; B painted in, on plains's ground" | island+plains cell 3x3 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s3 / plains s3, seam 3x3" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 9 | 1:Swamp -> W3 U3 B3 | island+plains cell 3x3 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 3x3 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s3 / plains s3, seam 3x3; B painted in, on plains's ground" | island+plains cell 3x3 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s3 / plains s3, seam 3x3" | phone: third colour B shows nothing; caption names Tundra (not on the board) |

### 5. Justin's four: I S M M I S F F F

Sheet: `sheets/storyboard-5-justin-four.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/5-justin-four/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | 1:Swamp -> U1 B1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | island+swamp cell 1x1 split 0.50 (caption as desktop) | caption names Underground Sea (not on the board) |
| 3 | 1:Mountain -> U1 B1 R1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4); R element on either (pair tied) ground (A5) | island+swamp cell 1x1 split 0.50; R painted left -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1; R painted in, on island's ground" | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | phone: third colour R shows nothing; caption names Underground Sea (not on the board) |
| 4 | 1:Mountain -> U1 B1 R2 | island+mountain cell 1x2 (§C.5), split 0.33 (island share) (A4, §C.4); B element on mountain ground (A5) [re-key: new makeup, A8] | island+mountain cell 1x2 split 0.33; B painted right; overlays 1 -- "Pair band · Volcanic Island (Steam Vents), whole half: island 33% / mountain 67%, island s1 / mountain s2, seam 1x2; B painted in, on mountain's ground" | island+mountain cell 1x2 split 0.33; overlays 1 -- "Pair band · Volcanic Island (Steam Vents), whole half: island 33% / mountain 67%, island s1 / mountain s2, seam 1x2" | phone: third colour B shows nothing; caption names Volcanic Island (not on the board); re-keyed from island+swamp |
| 5 | 1:Island -> U2 B1 R2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5) | island+mountain cell 2x2 split 0.50; B painted left; overlays 1 -- "Pair band · Volcanic Island (Steam Vents), whole half: island 50% / mountain 50%, island s2 / mountain s2, seam 2x2; B painted in, on island's ground" | island+mountain cell 2x2 split 0.50; overlays 1 -- "Pair band · Volcanic Island (Steam Vents), whole half: island 50% / mountain 50%, island s2 / mountain s2, seam 2x2" | phone: third colour B shows nothing; caption names Volcanic Island (not on the board) |
| 6 | 1:Swamp -> U2 B2 R2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5) | island+swamp cell 2x2 split 0.50; R painted left; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2; R painted in, on island's ground" | island+swamp cell 2x2 split 0.50; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2" | desktop: painted R, expected B; phone: third colour B shows nothing; WRONG PAIR: drew island+swamp, expected island+mountain; caption names Underground Sea (not on the board); re-keyed from island+mountain |
| 7 | 1:Forest -> U2 B2 R2 G1 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5); G show nothing (A6 fold) | island+swamp cell 2x2 split 0.50; R painted left; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2; R painted in, on island's ground" | island+swamp cell 2x2 split 0.50; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2" | desktop: painted R, expected B; phone: third colour B shows nothing; WRONG PAIR: drew island+swamp, expected island+mountain; G folded: shows nothing (by design, A6); caption names Underground Sea (not on the board) |
| 8 | 1:Forest -> U2 B2 R2 G2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5); G show nothing (A6 fold) | island+swamp cell 2x2 split 0.50; R painted left; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2; R painted in, on island's ground" | island+swamp cell 2x2 split 0.50; overlays 1 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s2 / swamp s2, seam 2x2" | desktop: painted R, expected B; phone: third colour B shows nothing; WRONG PAIR: drew island+swamp, expected island+mountain; G folded: shows nothing (by design, A6); caption names Underground Sea (not on the board) |
| 9 | 1:Forest -> U2 B2 R2 G3 | island+forest cell 2x3 (§C.5), split 0.40 (island share) (A4, §C.4); R element on forest ground (A5); B show nothing (A6 fold) [re-key: new makeup, A8] | island+forest cell 2x3 split 0.40; B painted right; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 40% / forest 60%, island s2 / forest s3, seam 2x3; B painted in, on forest's ground" | island+forest cell 2x3 split 0.40; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 40% / forest 60%, island s2 / forest s3, seam 2x3" | desktop: painted B, expected R; phone: third colour R shows nothing; B folded: shows nothing (by design, A6); caption names Tropical Island (not on the board); re-keyed from island+swamp |

### 6. Five-colour soup: WUBRG x2, then Forest, Island

Sheet: `sheets/storyboard-6-five-soup.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/6-five-soup/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Plains -> W1 | plains mono s1 (A3) | plains s1 | plains s1 | -- |
| 2 | 1:Island -> W1 U1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4) | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | island+plains cell 1x1 split 0.50 mirrored (caption as desktop) | caption names Tundra (not on the board) |
| 3 | 1:Swamp -> W1 U1 B1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | island+plains cell 1x1 split 0.50 mirrored; B painted right -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1; B painted in, on plains's ground" | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | phone: third colour B shows nothing; caption names Tundra (not on the board) |
| 4 | 1:Mountain -> W1 U1 B1 R1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); R show nothing (A6 fold) | island+plains cell 1x1 split 0.50 mirrored; B painted right -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1; B painted in, on plains's ground" | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | phone: third colour B shows nothing; R folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 5 | 1:Forest -> W1 U1 B1 R1 G1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | island+plains cell 1x1 split 0.50 mirrored; B painted right -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1; B painted in, on plains's ground" | island+plains cell 1x1 split 0.50 mirrored -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s1 / plains s1, seam 1x1" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 6 | 1:Plains -> W2 U1 B1 R1 G1 | island+plains cell 1x2 (§C.5), split 0.67 (plains share), mirrored (A4, §C.4); B element on plains ground (A5); RG show nothing (A6 fold) | island+plains cell 1x2 split 0.67 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 67% / island 33%, island s1 / plains s2, seam 1x2; B painted in, on plains's ground" | island+plains cell 1x2 split 0.67 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 67% / island 33%, island s1 / plains s2, seam 1x2" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 7 | 1:Island -> W2 U2 B1 R1 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 8 | 1:Swamp -> W2 U2 B2 R1 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 9 | 1:Mountain -> W2 U2 B2 R2 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 10 | 1:Forest -> W2 U2 B2 R2 G2 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | island+plains cell 2x2 split 0.50 mirrored; B painted right; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2; B painted in, on plains's ground" | island+plains cell 2x2 split 0.50 mirrored; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: plains 50% / island 50%, island s2 / plains s2, seam 2x2" | phone: third colour B shows nothing; RG folded: shows nothing (by design, A6); caption names Tundra (not on the board) |
| 11 | 1:Forest -> W2 U2 B2 R2 G3 | plains+forest cell 2x3 (§C.5), split 0.40 (plains share) (A4, §C.4); U element on forest ground (A5); BR show nothing (A6 fold) [re-key: new makeup, A8] | plains+forest cell 2x3 split 0.40; U painted right; overlays 1 -- "Pair band · Savannah (Temple Garden), whole half: plains 40% / forest 60%, plains s2 / forest s3, seam 2x3; U painted in, on forest's ground" | plains+forest cell 2x3 split 0.40; overlays 1 -- "Pair band · Savannah (Temple Garden), whole half: plains 40% / forest 60%, plains s2 / forest s3, seam 2x3" | phone: third colour U shows nothing; BR folded: shows nothing (by design, A6); caption names Savannah (not on the board); re-keyed from island+plains |
| 12 | 1:Island -> W2 U3 B2 R2 G3 | island+forest cell 3x3 (§C.5), split 0.50 (island share) (A4, §C.4); W element on either (pair tied) ground (A5); BR show nothing (A6 fold) [re-key: new makeup, A8] | island+forest cell 3x3 split 0.50; W painted left; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s3 / forest s3, seam 3x3; W painted in, on island's ground" | island+forest cell 3x3 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s3 / forest s3, seam 3x3" | phone: third colour W shows nothing; BR folded: shows nothing (by design, A6); caption names Tropical Island (not on the board); re-keyed from plains+forest |

### 7. Duals first: Tropical Island, Tundra, Island, Plains, Forest

Sheet: `sheets/storyboard-7-duals-first.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/7-duals-first/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Tropical Island -> U0.5 G0.5 | island+forest cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 1x1 split 0.50 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s1 / forest s1, seam 1x1" | island+forest cell 1x1 split 0.50 (caption as desktop) | -- |
| 2 | 1:Tundra -> U1 G0.5 W0.5 | island+forest cell 1x1 (§C.5), split 0.67 (island share) (A4, §C.4); W element on island ground (A5) | island+forest cell 1x1 split 0.67; W painted left -- "Pair band · Tropical Island (Breeding Pool), whole half: island 67% / forest 33%, island s1 / forest s1, seam 1x1; W painted in, on island's ground" | island+forest cell 1x1 split 0.67 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 67% / forest 33%, island s1 / forest s1, seam 1x1" | phone: third colour W shows nothing |
| 3 | 1:Island -> U2 G0.5 W0.5 | island+forest cell 2x1 (§C.5), split 0.80 (island share) (A4, §C.4); W element on island ground (A5) | island+forest cell 2x1 split 0.80; W painted left; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 80% / forest 20%, island s2 / forest s1, seam 2x1; W painted in, on island's ground" | island+forest cell 2x1 split 0.80; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 80% / forest 20%, island s2 / forest s1, seam 2x1" | phone: third colour W shows nothing |
| 4 | 1:Plains -> U2 G0.5 W1.5 | island+plains cell 2x1 (§C.5), split 0.57 (island share) (A4, §C.4); G element on island ground (A5) [re-key: new makeup, A8] | island+plains cell 2x1 split 0.57; G painted left; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: island 57% / plains 43%, island s2 / plains s1, seam 2x1; G painted in, on island's ground" | island+plains cell 2x1 split 0.57; overlays 1 -- "Pair band · Tundra (Hallowed Fountain), whole half: island 57% / plains 43%, island s2 / plains s1, seam 2x1" | phone: third colour G shows nothing; re-keyed from island+forest |
| 5 | 1:Forest -> U2 G1.5 W1.5 | island+plains cell 2x1 (§C.5), split 0.57 (island share) (A4, §C.4); G element on island ground (A5) | island+forest cell 2x1 split 0.57; W painted left; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 57% / forest 43%, island s2 / forest s1, seam 2x1; W painted in, on island's ground" | island+forest cell 2x1 split 0.57; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 57% / forest 43%, island s2 / forest s1, seam 2x1" | desktop: painted W, expected G; phone: third colour G shows nothing; WRONG PAIR: drew island+forest, expected island+plains; re-keyed from island+plains |

### 8. A land leaving: Island, Swamp, Mountain, Forest, then Undo x2

Sheet: `sheets/storyboard-8-land-leaving.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/8-land-leaving/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | 1:Swamp -> U1 B1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | island+swamp cell 1x1 split 0.50 (caption as desktop) | caption names Underground Sea (not on the board) |
| 3 | 1:Mountain -> U1 B1 R1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4); R element on either (pair tied) ground (A5) | island+swamp cell 1x1 split 0.50; R painted left -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1; R painted in, on island's ground" | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | phone: third colour R shows nothing; caption names Underground Sea (not on the board) |
| 4 | 1:Forest -> U1 B1 R1 G1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4); R element on either (pair tied) ground (A5); G show nothing (A6 fold) | island+swamp cell 1x1 split 0.50; R painted left -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1; R painted in, on island's ground" | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | phone: third colour R shows nothing; G folded: shows nothing (by design, A6); caption names Underground Sea (not on the board) |
| 5 | Undo x1 -> U1 B1 R1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4); R element on either (pair tied) ground (A5) | island+swamp cell 1x1 split 0.50; R painted left -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1; R painted in, on island's ground" | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | phone: third colour R shows nothing; caption names Underground Sea (not on the board) |
| 6 | Undo x2 -> U1 B1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island+swamp cell 1x1 split 0.50 -- "Pair band · Underground Sea (Watery Grave), whole half: island 50% / swamp 50%, island s1 / swamp s1, seam 1x1" | island+swamp cell 1x1 split 0.50 (caption as desktop) | caption names Underground Sea (not on the board) |

### 9. Both chairs (table): you I I F F, opponent S S M M, interleaved

Sheet: `sheets/storyboard-9-both-chairs.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/9-both-chairs/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | **you** 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 1 | **opp** 1:Island -> none | empty table (A2) | nothing (no slot); pieces empty:pieces/empty-half.webp@1 | nothing (no slot); pieces empty:pieces/empty-phone.webp@1 | -- |
| 2 | **you** 2:Swamp -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | **opp** 2:Swamp -> B1 | swamp mono s1 (A3) | swamp s1 | swamp s1 | -- |
| 3 | **you** 1:Island -> U2 | island mono s2 (A3) | island s2; overlays 1 | island s2; overlays 1 | -- |
| 3 | **opp** 1:Island -> B1 | swamp mono s1 (A3) | swamp s1 | swamp s1 | -- |
| 4 | **you** 2:Swamp -> U2 | island mono s2 (A3) | island s2; overlays 1 | island s2; overlays 1 | -- |
| 4 | **opp** 2:Swamp -> B2 | swamp mono s2 (A3) | swamp s2; overlays 1 | swamp s2; overlays 1 | -- |
| 5 | **you** 1:Forest -> U2 G1 | island+forest cell 2x1 (§C.5), split 0.67 (island share) (A4, §C.4) | island+forest cell 2x1 split 0.67; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 67% / forest 33%, island s2 / forest s1, seam 2x1" | island+forest cell 2x1 split 0.67; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 5 | **opp** 1:Forest -> B2 | swamp mono s2 (A3) | swamp s2; overlays 1 | swamp s2; overlays 1 | -- |
| 6 | **you** 2:Mountain -> U2 G1 | island+forest cell 2x1 (§C.5), split 0.67 (island share) (A4, §C.4) | island+forest cell 2x1 split 0.67; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 67% / forest 33%, island s2 / forest s1, seam 2x1" | island+forest cell 2x1 split 0.67; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 6 | **opp** 2:Mountain -> B2 R1 | swamp+mountain cell 2x1 (§C.5), split 0.67 (swamp share) (A4, §C.4) | swamp+mountain cell 2x1 split 0.67; overlays 1 -- "Pair band · Badlands (Blood Crypt), whole half: swamp 67% / mountain 33%, swamp s2 / mountain s1, seam 2x1" | swamp+mountain cell 2x1 split 0.67; overlays 1 (caption as desktop) | caption names Badlands (not on the board) |
| 7 | **you** 1:Forest -> U2 G2 | island+forest cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 2x2 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s2 / forest s2, seam 2x2" | island+forest cell 2x2 split 0.50; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 7 | **opp** 1:Forest -> B2 R1 | swamp+mountain cell 2x1 (§C.5), split 0.67 (swamp share) (A4, §C.4) | swamp+mountain cell 2x1 split 0.67; overlays 1 -- "Pair band · Badlands (Blood Crypt), whole half: swamp 67% / mountain 33%, swamp s2 / mountain s1, seam 2x1" | swamp+mountain cell 2x1 split 0.67; overlays 1 (caption as desktop) | caption names Badlands (not on the board) |
| 8 | **you** 2:Mountain -> U2 G2 | island+forest cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4) | island+forest cell 2x2 split 0.50; overlays 1 -- "Pair band · Tropical Island (Breeding Pool), whole half: island 50% / forest 50%, island s2 / forest s2, seam 2x2" | island+forest cell 2x2 split 0.50; overlays 1 (caption as desktop) | caption names Tropical Island (not on the board) |
| 8 | **opp** 2:Mountain -> B2 R2 | swamp+mountain cell 2x2 (§C.5), split 0.50 (swamp share) (A4, §C.4) | swamp+mountain cell 2x2 split 0.50; overlays 1 -- "Pair band · Badlands (Blood Crypt), whole half: swamp 50% / mountain 50%, swamp s2 / mountain s2, seam 2x2" | swamp+mountain cell 2x2 split 0.50; overlays 1 (caption as desktop) | caption names Badlands (not on the board) |

### 5d. Justin's four, DEFAULT board (no ?pairfull=1)

Sheet: `sheets/storyboard-5d-justin-four-default.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/5d-justin-four-default/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Island -> U1 | island mono s1 (A3) | island s1 | island s1 | -- |
| 2 | 1:Swamp -> U1 B1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4) | island s1 / [island+swamp band s1] / swamp s1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | island s1 / [island+swamp band s1] / swamp s1 (caption as desktop) | not the pair picture: 2 biome panels side by side |
| 3 | 1:Mountain -> U1 B1 R1 | island+swamp cell 1x1 (§C.5), split 0.50 (island share) (A4, §C.4); R element on either (pair tied) ground (A5) | island s1 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s1 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s1 (caption as desktop) | not the pair picture: 3 biome panels side by side |
| 4 | 1:Mountain -> U1 B1 R2 | island+mountain cell 1x2 (§C.5), split 0.33 (island share) (A4, §C.4); B element on mountain ground (A5) [re-key: new makeup, A8] | island s1 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s2; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s1 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side |
| 5 | 1:Island -> U2 B1 R2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5) | island s2 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s2; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s2 / [island+swamp band s1] / swamp s1 / [mountain+swamp band s1] / mountain s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side |
| 6 | 1:Swamp -> U2 B2 R2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5) | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side |
| 7 | 1:Forest -> U2 B2 R2 G1 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5); G show nothing (A6 fold) | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; G shows nothing (panel dropped) |
| 8 | 1:Forest -> U2 B2 R2 G2 | island+mountain cell 2x2 (§C.5), split 0.50 (island share) (A4, §C.4); B element on either (pair tied) ground (A5); G show nothing (A6 fold) | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Badlands (Blood Crypt): 10% wide, 0 duals, pair stage 1" | island s2 / [island+swamp band s1] / swamp s2 / [mountain+swamp band s1] / mountain s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; G shows nothing (panel dropped) |
| 9 | 1:Forest -> U2 B2 R2 G3 | island+forest cell 2x3 (§C.5), split 0.40 (island share) (A4, §C.4); R element on forest ground (A5); B show nothing (A6 fold) [re-key: new makeup, A8] | island s2 / [island+swamp band s1] / swamp s2 / [forest+swamp band s1] / forest s3; overlays 1 -- "Pair band · Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1   Bayou (Overgrown Tomb): 10% wide, 0 duals, pair stage 1" | island s2 / [island+swamp band s1] / swamp s2 / [forest+swamp band s1] / forest s3; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; R shows nothing (panel dropped) |

### 6d. Five-colour soup, DEFAULT board (no ?pairfull=1)

Sheet: `sheets/storyboard-6d-five-soup-default.jpg` (and `-web.jpg`). Shots: scratchpad `sb/out/6d-five-soup-default/`.

| T | Lands (weights) | SYSTEM.md says it should show | Desktop drew | Phone drew | Gap |
|---|---|---|---|---|---|
| 1 | 1:Plains -> W1 | plains mono s1 (A3) | plains s1 | plains s1 | -- |
| 2 | 1:Island -> W1 U1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4) | plains s1 / [island+plains band s1] / island s1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1" | plains s1 / [island+plains band s1] / island s1 (caption as desktop) | not the pair picture: 2 biome panels side by side |
| 3 | 1:Swamp -> W1 U1 B1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5) | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 (caption as desktop) | not the pair picture: 3 biome panels side by side |
| 4 | 1:Mountain -> W1 U1 B1 R1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); R show nothing (A6 fold) | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 (caption as desktop) | not the pair picture: 3 biome panels side by side; R shows nothing (panel dropped) |
| 5 | 1:Forest -> W1 U1 B1 R1 G1 | island+plains cell 1x1 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s1 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 6 | 1:Plains -> W2 U1 B1 R1 G1 | island+plains cell 1x2 (§C.5), split 0.67 (plains share), mirrored (A4, §C.4); B element on plains ground (A5); RG show nothing (A6 fold) | plains s2 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s1 / [island+swamp band s1] / swamp s1; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 7 | 1:Island -> W2 U2 B1 R1 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s1; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s1; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 8 | 1:Swamp -> W2 U2 B2 R1 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 9 | 1:Mountain -> W2 U2 B2 R2 G1 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 10 | 1:Forest -> W2 U2 B2 R2 G2 | island+plains cell 2x2 (§C.5), split 0.50 (plains share), mirrored (A4, §C.4); B element on either (pair tied) ground (A5); RG show nothing (A6 fold) | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Underground Sea (Watery Grave): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s2 / [island+swamp band s1] / swamp s2; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; RG shows nothing (panel dropped) |
| 11 | 1:Forest -> W2 U2 B2 R2 G3 | plains+forest cell 2x3 (§C.5), split 0.40 (plains share) (A4, §C.4); U element on forest ground (A5); BR show nothing (A6 fold) [re-key: new makeup, A8] | plains s2 / [island+plains band s1] / island s2 / [forest+island band s1] / forest s3; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Tropical Island (Breeding Pool): 10% wide, 0 duals, pair stage 1" | plains s2 / [island+plains band s1] / island s2 / [forest+island band s1] / forest s3; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; BR shows nothing (panel dropped) |
| 12 | 1:Island -> W2 U3 B2 R2 G3 | island+forest cell 3x3 (§C.5), split 0.50 (island share) (A4, §C.4); W element on either (pair tied) ground (A5); BR show nothing (A6 fold) [re-key: new makeup, A8] | plains s2 / [island+plains band s1] / island s3 / [forest+island band s2] / forest s3; overlays 1 -- "Pair band · Tundra (Hallowed Fountain): 10% wide, 0 duals, pair stage 1   Tropical Island (Breeding Pool): 10% wide, 0 duals, pair stage 2" | plains s2 / [island+plains band s1] / island s3 / [forest+island band s2] / forest s3; overlays 1 (caption as desktop) | not the pair picture: 3 biome panels side by side; BR shows nothing (panel dropped) |

