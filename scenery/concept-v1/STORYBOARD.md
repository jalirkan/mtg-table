# STORYBOARD.md: one game, beat by beat

**The game:** the friend game of 2026-10-17, Justin (seat 0) against Evan (seat 1), an Omega draft
(`mtg-table/var/games/friend-m1792262156023-seat{0,1}/frames.jsonl`). Read-only, public information only:
- the lands on each battlefield;
- life totals;
- creature and other-permanent counts;
- the `mulligan`, `attackers`, `damage`, `sacrificed` and `outcome` events.

No hand, library or deck list was read. The ledger is `work/ledger-friend.json`, made by `tools/ledger.py`.

**Why this game:** Justin played it and will remember it, and it passes through more situations than a lab game
would:
- a mulligan;
- an uncracked fetch, then the fetch cracked into a dual;
- two duals;
- a third colour on the far half;
- a 9-point swing to 6 life;
- a concession.

**What it lacks:**
- a third colour on Justin's own half;
- a life total at 5 or less (Evan stopped at 6).

The storm beat therefore sketches what a threshold one point looser would show (Q2 in CONCEPT-NOTES).

**Outputs:**
- `sheets/storyboard.jpg`: the 17 frames in order, captioned.
- `preview/storyboard.mp4`: each frame held 2 s, 0.6 s cross-fades, 43 s, 1280 × 896.
- `frames/<id>.jpg`: each frame at 2048 × 1280.

**How a frame is made** (`tools/compose.py`):
- The board's two desktop halves are stacked. The opponent's half is on top, drawn upright as the far country:
  hazed 22% toward the mist colour, contrast 0.86, a little cooler and softer. The viewing seat's half is below.
- The centre mist runs between them, and a flare in the attacker's colours shows on combat beats.
- Ghost card rows show the real land count and colours (the border and pip are the land's mana) and the
  creature count.
- A life chip sits in each half's outer corner. It is lit on the active player's half, and that half gets +5% light.
- The grades are the cloud's planned ones, approximated as per-channel tints in post:
  - cool (opening);
  - neutral (midgame);
  - warm (late);
  - storm (peril);
  - night + wither (loss);
  - clear (win);
  - dusk-grey (draw).

**Half states:** each is either existing art or a new sketch.
- **Existing art** (`mp:<stage>:<split>`): the panoramas-v1 mountain+plains panorama at that pair stage. It is a
  2048-wide window panned so the transition sits at the left biome's share, as the 1.13 draft's `pairfull.ts`
  pans it. The pair stage comes from the total land count, through `stageMap` [1–2, 3–4, 5–6].
- **New sketches:** painted on the GPU over a code-painted guide (§ table below).

## The beats (Justin's chair)

| Id | Turn | Board state (public) | Far half (Evan) | Near half (Justin) | Beat |
|---|---|---|---|---|---|
| B00 | T0 | 20 / 20, no lands | prologue, mirrored | **J0 prologue** (sketch) | the empty table: one unformed land at first light, shared |
| B01 | T0 | Evan mulligans | prologue + mist swirl (post) | prologue | the mulligan as mist stirring |
| B02 | T1 | J: Mountain | prologue | **J1 first land** (sketch) | the mist burns off the mountain (mono s1) |
| B03 | T2 | E: Arid Mesa | **V1 fetch road** (sketch) | J1 | a fetch is a road into the mist, lit at the far end in its colours |
| B04 | T3 | J: Plains, 1 creature | V1 | **J2 front of light** (sketch) | the second colour as a weather front, hiding the mono → pair swap |
| B05 | T3 end | E cracks Mesa → Plateau (19) | **V2 path opens** (sketch) | mp:1:0.5 | the road opens into the pair's place; both halves now mesa country |
| B06 | T5 | J: 3rd land (R1 W2); E: Plains (T4) | mp:1:0.25 | mp:2:0.33 | stage 2: the pair's afternoon, panned to the plains |
| B07 | T7 | J attacks with 3; E 19 → 17 | mp:1:0.25 | **J4c1 combat** (sketch, candidate 1) + RW flare | combat: dust off the near plain, the mist flares at the centre |
| B08 | T8 | E: Island | **V4 third colour** (sketch) | mp:2:0.33 | the third colour as an element: a cold river, sea fog |
| B09 | T10–11 | E: Tundra (16); J: 5th land, 4 creatures | **V5 tundra** (sketch) | mp:3:0.6 | late: frost thickens the element; Justin's pair reaches s3 (dusk) |
| B10 | T13 | J: 6th land; E 15 → 6 | **V6 storm** (sketch) | mp:3:0.5 + flare | peril on Evan's half only; Justin's sky stays clear |
| B11 | T14 | concession, winner Justin | **V7 night** (sketch), withered | **J8 clearing** (sketch) | the end: morning after for the winner, night and grey for the loser |

## The same beats from Evan's chair

Evan's half is the near one; Justin's is the far country. The same renders are used, so the two chairs see one world.

| Id | Turn | Far half (Justin) | Near half (Evan) | Beat |
|---|---|---|---|---|
| E01 | T2 | J1 | V1 | his fetch is the road into his own mist |
| E02 | T3 end | mp:1:0.5 | V2 | two colours at once: a dual needs no front, the path opening is the arrival |
| E03 | T8 | mp:2:0.33 | V4 | his third colour from his side; Justin's afternoon across the mist |
| E04 | T13 | mp:3:0.5 | V6 | his own peril (matrix row 10): the storm over his ground |
| E05 | T14 | J8 | V7 | the loss from the loser's chair: night at home, a sunrise across the valley |

## The new sketches

Each sketch is a single candidate, except where c0 did not show its idea; then a c1 was painted and both are kept
in `work/gen/`.

**Common settings for every sketch:**
- DreamShaper XL with the panorama lane's STYLE and negative words, and the pair's own words from `pano.py`;
- 2048 × 640, three 1024-wide windows;
- the strength map: the new element at full strength, the rest at a fraction (`sm_floor`).

| Half | Guide (code-painted) | Strength / steps | Reads? |
|---|---|---|---|
| J0 prologue | the five stage-1 halves averaged, desaturated, blurred, pale; standing stones; fog | 0.74 / 16 | **yes**: mist, stones, a pale plain |
| J1 first land | mountain s1 with prologue mist at the edges and low ground | 0.55 / 14 | yes, quietly (the mist is subtle) |
| V1 fetch road | prologue mirrored, a dirt path, a red-gold glow at its end | 0.60 / 14 | the road yes; the glow stays a flat smear |
| J2 front of light | mountain s1 → mp s1 cross-fade; a light front with rays and dust from the right | 0.62 / 16 | **yes**: the strongest new idea on the sheet |
| V2 path opens | mp s1 + a road to the cliff foot + a light burst + mist at the edges | 0.58 / 14 | the road yes; the burst and the mist dissolved |
| J4c combat (c0) | mp s2 + dust band + spark streaks | 0.58 / 14 | **no**: the sparks became rain-like streaks |
| J4c1 combat (c1) | mp s2 + billowing dust toward the horizon + motes | 0.64 / 14 | partly: a dust cloud at the horizon |
| V4 third colour | mp s2 (0.2) + a blue meltwater river + sea fog | 0.62 / 14 | **yes** |
| V5 tundra | V4 + frost, snow on the mesa tops, a denser river | 0.58 / 14 | **yes** |
| V6 storm | V5 desaturated and darkened + storm cloud, sleet, a bolt | 0.60 / 14 | **yes**: the most dramatic frame |
| V7 night | V5 darkened, a moon, ash, embers | 0.60 / 14 | yes |
| J8 clearing | mp s3, sky warmed, sunrise rays | 0.60 / 16 | weak: hazy warm rather than a clear morning |

The situations sketches (S01–S12) are logged the same way in `SUMMARY.md` and judged in CONCEPT-NOTES.md.
