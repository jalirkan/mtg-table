# Evidence — more villain identity (D230–D233)

Branch `more-villain-identity`, off `main` at `c330942`, in the worktree
`mtg-table-t2v2`, on 2026-09-29. Everything below was run on this machine that
morning; every number names what produced it. The pictures are under
`var/villains2/` (gitignored, local) and listed in §7. No personal model was
present: this lane is the repository tier.

The brief: the three AI decks match setup's more-villains lane added —
`decks/masters-of-evil.dck` (black-red villains), `decks/hulk-family.dck`
(red-green gamma) and `decks/wakanda.dck` (green-white) — had no committed
recording and no identity rows (PLAN.md's villain-identity follow-up 1). Their
creatures stood as bare bodies in a colour, or as glow discs where no rung
claimed them, and the workshop previewed their names from the engine's card
scripts.

---

## 1. The fixtures — three recordings, one per deck

**The search.** `RecordMatch` — M1's recorder, default policy, no `--probe`, no
`--match` — with seat 0 = the AI deck and seat 1 = `decks/pacho-shield.dck`,
seen from seat 0, at every seed from 1 to 300 of each deck: **900 games, 900
`RECORD OK`, no failure**, four workers, each in a Forge home of its own under
`var/villain2-try/` (the gate's `forge_home_make`), each recording censused and
then deleted (a scratch census, `var/villain2-try/census.mjs`, not committed:
which of the deck's names the viewer saw FACE UP and where, which of its
creatures reached the battlefield, the most battlefield cards at once, the turns,
the winner and the size). The first criterion was the most names face up, the
second the most identity subjects on the table, and size and crowd broke ties.

How often each creature (or creature token) reached the table, in 300 games of
its deck:

| Masters of Evil | games | Hulk family | games | Wakanda | games |
|---|---|---|---|---|---|
| Volcanic Villain | 178 | Gamma Grotesque | 180 | Dora Milaje Elite | 196 |
| Common Crook | 176 | Birds of Paradise | 174 | Wakandan Tusker | 193 |
| Whiplash, Vengeful Engineer | 119 | Knight of Wundagore | 159 | Gallant Citizen | 181 |
| Titania, Proud Pummeler | 116 | Gallant Citizen | 137 | Wakandan Shield Guard | 168 |
| Whirlwind, Killer Cyclone | 115 | Hellcat, Undying Vigilante | 121 | Black Panther, Most Dangerous | 133 |
| Songbird, Sonic Screamer | 114 | Wolverine, Fierce Fighter | 116 | Wakandan Drone Flock | 132 |
| Yellowjacket, Heartless Marauder | 99 | Hulk, Gamma Goliath | 112 | Black Panther, Claws of Bast | 131 |
| White Widow, Yelena Belova | 97 | She-Hulk, Attorney-at-Law | 108 | Warriors of Wakanda | 131 |
| MACH-1, Swooping Scoundrel | 95 | Abomination, Irradiated Brute | 107 | Shuri, the Black Panther | 129 |
| Boomerang, Blade Flinger | 91 | Rick Jones, Destined Sidekick | 103 | Shuri, Vibranium Technologist | 127 |
| Fixer, Techno Terror | 91 | Abomination, Terrifying Titan | 102 | Okoye, Dora Milaje Leader | 121 |
| Atlas, Sizable Stooge | 87 | She-Hulk, Jade Defender | 100 | Nakia, Wakandan Operative | 119 |
| Klaw, Sonic Subjugator | 86 | Hercules, Prince of Power | 93 | Black Panther, Vanguard | 113 |
| Moonstone, Harsh Mistress | 85 | Brawn, Amadeus Cho | 91 | Storm, Queen of Wakanda | 106 |
| Tiger Shark, Abyssal Hunter | 81 | Hulkling, Burgeoning Bruiser | 87 | T'Chaka, Venerable King | 103 |
| Radioactive Man | 80 | Hulk, Strongest There Is | 77 | Okoye, Mighty and Adored | 102 |
| The Masters of Evil | 80 | Hulk, Brutal Brawler | 70 | T'Challa, the Black Panther | 100 |
| Villain Token | 52 | Red Hulk | 70 | Soldier Token | 236 |

(The AI deck won 212, 237 and 205 of its 300 games; the median game ran 16, 16
and 18 turns and 2.2, 2.0 and 2.6 MB.)

**The choices.**

- **Masters of Evil, seed 33.** No seed showed all 27 names; the most was 22,
  at seeds 1 and 33. Seed 33 also puts **14 of the 17 creatures on the table**
  (the most of any seed; seed 1 puts 7) — the three that never arrive are the
  three names it never draws. 30 turns; the villains win.
- **Hulk family, seed 261.** Two seeds showed all 24 names — 261 and 269 — and
  261 was taken: 13 of 18 creatures on the table in 6.0 MB, where 269 puts 14
  in 8.3 MB. The runner-up by table was seed 187 (16 of 18, but 22 of 24 face
  up). 28 turns; the gamma deck wins.
- **Wakanda, seed 232.** Four seeds showed all 24 names — 27, 222, 232 and 284 —
  and 232 was taken: 15 of 17 creatures on the table, a 48-card crowded table,
  8.6 MB. Seed 284 puts all 17 on the table but runs 40 turns, 12.8 MB and a
  62-card table; seed 27 is 14.1 MB. 35 turns; Wakanda wins.

**The committed files** were recorded afresh, one after another, alone, into
`fixtures/games/` with the default Forge home, at a load average of 2–3 (a first
take of two of them during the search, at a load average of 14, was set aside):

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/masters-of-evil.dck \
    --deck2 decks/pacho-shield.dck --seed 33 --out fixtures/games/villain-masters-of-evil-33.jsonl
./bridge/run.sh mtgtable.RecordMatch --deck decks/hulk-family.dck \
    --deck2 decks/pacho-shield.dck --seed 261 --out fixtures/games/villain-hulk-family-261.jsonl
./bridge/run.sh mtgtable.RecordMatch --deck decks/wakanda.dck \
    --deck2 decks/pacho-shield.dck --seed 232 --out fixtures/games/villain-wakanda-232.jsonl
```

| file | lines | bytes | turns | `RECORD OK` | redaction (no flags) |
|---|---|---|---|---|---|
| `villain-masters-of-evil-33.jsonl` | 482 (header, `hello_ok`, 479 `state`, `over`) | 6,733,275 | 30 | yes, 0 snapshot errors, `UNIMPL` none | **PASS**, M49 keywords on every full card |
| `villain-hulk-family-261.jsonl` | 438 (435 `state`) | 5,989,231 | 28 | yes, the same | **PASS**, the same |
| `villain-wakanda-232.jsonl` | 534 (531 `state`) | 8,611,519 | 35 | yes, the same | **PASS**, the same |

Each header carries what every committed recording's does (`gameId` the file's
name, `seed`, `forgeVersion` `2.0.14-SNAPSHOT-08.08`, `forgeJarSha256`
`3c0a7c38…8e5dd9`, `seat` 0, the viewer's deck path and sha256, the other seat's
`null`s). `node tools/same-game.mjs` against the first takes: the Masters of
Evil **SAME GAME** (2,517 events and 418 phase-boundary states equal, the framing
different from frame 248 — 505 against 481 frames, the forwarder's flush clock
under the search's load, D113); the Hulk family's two takes identical, frame for
frame.

**The census of each committed file** — which of the deck's names the viewer sees
face up, and where:

| deck | face up | never face up | creatures on the table | tokens | most battlefield cards |
|---|---|---|---|---|---|
| Masters of Evil | 22 of 27 | Whiplash, Titania, Tiger Shark (never drawn), Lightning Bolt, Avengers: Under Siege | 14 of 17 | none (the Saga was never drawn) | 40 |
| Hulk family | **24 of 24** | — | 13 of 18 (Brutal Brawler, She-Hulk Attorney-at-Law, both Gamma Grotesques and Abomination, Terrifying Titan milled by Rick Jones; Red Hulk drawn on the last turn) | none | 37 |
| Wakanda | **24 of 24** | — | 15 of 17 (Shuri, Vibranium Technologist and Okoye, Dora Milaje Leader milled by T'Chaka's arrival on turn 33) | Soldier Token | 48 |

**Steps 6 and 9b compare nothing to them**: `tools/check-all.sh` hands
`tools/wire-drift.mjs` `fixtures/games/g1.jsonl` and
`tools/fixture-multiset-diff.mjs` `fixtures/games/human-auto-42.jsonl`, by name —
the seed-42 recordings only (§9's gate logs say so).

## 2. What the AI did with each deck

`node tools/narrate.mjs <file> --summary`:

| | Masters of Evil (seed 33) | Hulk family (seed 261) | Wakanda (seed 232) |
|---|---|---|---|
| turns · winner | 30 · the villains, Pacho's life to −1 | 28 · the gamma deck, Pacho's life to −6 | 35 · Wakanda, Pacho's life to −8 |
| spells cast (AI · Pacho) | 17 · 16 | 15 · 13 | 18 · 14 |
| abilities used | 23 · 23 | 27 · 11 | 33 · 20 |
| damage to players | 21 · 15 | 26 · 6 | 33 · 7 |
| life at the end | 11 · −1 | 14 · −6 | 15 · −8 |

The Masters of Evil curve a Villain a turn (Boomerang, Volcanic Villain, MACH-1)
and cast the team card on turn 12, which Pacho answers with Quantum Reduction on
turn 13; Moonstone grows off every discard until Web Up exiles her on turn 29, and
the villains' last attack — Whirlwind, Klaw, Boomerang, White Widow and the shrunken
team among them — ends it on turn 30. The Hulk family ramps on Birds of Paradise,
digs with Rick Jones (milling five of its own Hulks), and ends it on turn 28 with a
nine-creature attack for 22 — Hulk, Gamma Goliath powered up to 11/10 in it.
Wakanda goes wide — two Dora Milaje, two Shield Guards and their Soldiers, four
Black Panthers — takes the monarchy with Okoye, Mighty and Adored on turn 11, and
Storm, grown by Claws of Bast's trigger every lone attack, ends it alone at 11
power on turn 35.

## 3. What the fixtures changed in the corpus — the recount

Every number below is printed by `npm --prefix web test`, before (on `c330942`,
20 recordings: the 19 of `fixtures/games/` and the synthetic
`sample-handwritten`) and after (23). The **asserted** ones were moved to the new
truth in the same change; the rest are printed only.

| test | number | before | after | asserted? |
|---|---|---|---|---|
| `attach` | board frames with an attachment | 1,294 | 2,375 | yes |
| `attach` | `attach` events | 34 | 66 | yes |
| `attach` | looks: shrink · shell · glints · circuit · halo | 1,253 · 522 · 553 · 405 · 0 | 1,610 · 1,555 · 1,098 · 405 · 0 | yes (Wakanda's Vibranium Energy Daggers wears the glints, D231) |
| `attach` | host-centre clicks · strips unreachable | 1,026 · 30 | 1,749 · 30 | yes (0 missed; the 3% bound holds) |
| `stack` | frames with a stack | 428 | 531 | yes |
| `stack` | tethers | 57 | 83 (1 whose target this viewer cannot place, 0 before) | yes |
| `stack` | frozen (stack in combat) frames | 72 | 87 | yes |
| `stack` | resolutions | 493 | 723 | yes |
| `stack` | `orb` forms | 3 (`Land`) | 11 (`Land`, and `''`: the Monarch's end-step draw, an effect with no type line) | yes — its type lines |
| `tiles` | lands PLACED in the busiest frame (the fix pass: counted apart from the tiles laid) | 21 | **25** (`villain-wakanda-232@525`–`@532`) | yes — and every one laid: the cap went from 24 to 32 (D230, §11) |
| `motion` | classic film (comic FX off, on twos off) | 305,737 over the 19 + 45,744 for `villain-doom-248` | unchanged, + 48,367 · 34,571 · 44,122 for the three new files | yes — a pin each (`POST_LANE_FILMS`) |
| `clips` | modelled figures that left · died on their own `die` | 20 · 20 | 41 · 40 (the 41st is §4.3) | yes (§4.3) |
| `traits` | cards with an identity in the census | 29 | 69 | printed; rows asserted |
| `traits` | prop kinds at once (every other recording) | 17 | 17 (the Hulk family's own: 16, then **17** after the fix pass, `@323`; 10 on its most crowded frames, from 8) | yes |
| `traits` | the villain recordings' own holds | doom 22 · 17 | doom 22 · 17; Masters 26 · 12; Wakanda 20 · 15 (§6) | yes |
| `workshop` | the Hulks the personal tier dresses take the engine's facts | yes | no — the corpus's (all 24 Hulk family names face up) | yes |
| `status` | strips · with the wire's keywords | 13,951 · 1,332 | 26,851 · 7,977 | printed |
| `status` | the closest strip to a head | 2.2 px (Ant-Man) | 1.4 px (Birds of Paradise); 1.7 px (Volcanic Villain, attacking) after the fix pass drew Birds as a flock | yes (≥ 1) |
| `figure-pose` | stand points · back-row · boxed in | 15,773 · 805 · 4 | 28,808 · 2,538 · 4 | yes (boxed in unchanged) |
| `figure-pose` | poses · with a model · anonymous · ghosts | 15,909 · 9,266 · 1,179 · 136 | 28,968 · 20,641 · 1,179 · 160 | printed |
| `layout` | state frames · placements · backs | 4,077 · 99,818 · 17,248 | 5,522 · 153,501 · 21,834 | printed |
| `camera` | director: batches · beats · cuts | 8,154 · 4,162 · 660 | 11,044 · 5,736 · 904 | printed (the rules asserted per cut) |
| `camera` | shakes taken · dropped | 43 · 192 | 86 · 387 | printed |
| `replay-cues` | non-empty batches · effects over §9.3's cap | 3,689 · 86 | 5,128 · 174 | printed |
| `replay-cues` | cast-and-entered batches · rule 5 fired | — | 150 · 136 | printed |
| `look` | painted figure-instances (sick) · ghosts | 9,217 (2,095) · 95 | 20,579 (3,411) · 119 | printed |
| `palette` | face-up figure-instances | 14,730 | 27,789 | printed |
| `duelists` | stances ready · won · lost | 8,088 · 33 · 33 | 10,960 · 42 · 42 | printed |
| `tiles` | tile-instances | 33,450 | 50,993; 51,001 after the fix pass lays the eight frames' 25th land | printed |
| `story-render` | renderings · logs · names marked | 280 · 20 · 18,910 | 322 · 23 · 27,251 | printed |
| `workshop` | rehearsal batches · cues | 4,086 · 7,533 | 4,100 · 7,554 | printed |
| `figures` | face-down battlefield instances | 1,138 | 1,138 | yes (unchanged) |
| `figure-pose`, `look`, `status` | anonymous figure-instances · concealed creatures | 1,179 · 1,179 | 1,179 · 1,179 | printed — **the three new recordings add none**: they carry no face-down and no redacted battlefield card, so every hidden-information sweep over the corpus says nothing about their rows; the fix pass's face-down control (§11) does |
| `traits` | the figure layer's most triangles at once (the fix pass's new test, D233) | — | Doom 31,318 · Masters 31,449 · Wakanda 28,710 · every other `g1`'s 24,701 | yes — `FIGURE_TRIS_HELD` |

**The corpus lists.** Every sweep that reads the corpus globs `fixtures/games/`,
so the three files joined every one of them by being there; the lists that name
files did not — `motion.test.ts`'s `POST_LANE_FILMS` (a pin each), and
`traits.test.ts`'s `OVER_THE_LINE` and `OFF_THE_TABLE`, which name recordings and
rows (§5, §6). The root `CLAUDE.md`'s count of committed recordings that name the
pinned jar went from 19 to 22.

## 4. What the corpus found — five findings

Three new oracles, three new kinds of table, and five things none of the old
recordings had shown.

### 4.1 A squad over the figure budget was a swarm with a disc's width (`figures/pose.ts`)

`traits: a swarm is clamped by its whole ring, a squad by its whole rank` failed
on the Masters of Evil: at the thirteenth creature of a crowded table, *The
Masters of Evil* (a squad, `swarm: 2`) was over `MAX_FIGURES`, drew the disc — its
followers are its leader's body, baked, so `propsOf` already drew no `squad`
without a model — but its pose still said `swarm: 2`, `formation: squad`, with a
disc's width. No earlier squad (the S.H.I.E.L.D. Agents, the HYDRA Agents) had
ever been the thirteenth creature. A squad with no model is now no swarm (a ring's
bees need no rig and keep their ring).

### 4.2 An arrival and a same-cue connive played twice (the queue's rule 6b)

`queue: a permanent cast and resolved in ONE snapshot animates once` failed on
the Masters of Evil: Pacho's A.I.M. Scientists was cast, resolved, entered and
connived inside one snapshot, and its arrival (`zone:*>battlefield`) and its
connive counter (`counters`) both name `fx.hologram` — two selectors, so rule 6
kept both, and the two shimmers composed into one twice as strong (the class of
D220's doubled land rise). Rule 6b: a card's arrival and another event's cue of
the same id play once — the arrival, which carries rule 5b's gesture; the
connive's card still flies to the hand on its own `zone` event. **Nothing in the
old corpus moved**: `PRE_LANE_FILM` and `villain-doom-248`'s pin hold op for op.

### 4.3 A snapshot ran ahead of its own zone event (held, not fixed — and a race)

`clips: every figure that dies over the corpus is carried by its own die request`
failed on the Masters of Evil: Web Up's exile trigger resolving against Moonstone.
The frame at transport index 455 already holds Moonstone in exile — and holds the
trigger on the stack too — while the `zone` event that moves her arrives in the
next frame's batch, so the departure is decided (D64: once, on its first frame)
before her death is queued, and her body is not drawn dying. The test tells it
apart — a departure whose `zone` event comes one batch late — names it and holds
it to the one; PLAN.md's more-villain-identity follow-up 1 is the arena change (a
departure that waits a batch for its death) that would draw it.

**It is a flush-timing race, not the engine's order** (corrected by the fix pass;
the lane first wrote that a quiet re-record "put it in the same place", which was
one re-record). Six re-records of seed 33, every one `SAME GAME` by
`tools/same-game.mjs` (the same 2,517 events, the framing different from frame 248
on):

| re-record | load | Moonstone leaves the snapshot | her `zone` event | |
|---|---|---|---|---|
| the committed file | 2–3 | `@455` | `@456` | a frame late |
| the verifier's `rr-moe` | 4–17 | frame 456 | frame 456 | the SAME frame: drawn dying |
| the verifier's two others | 4–17 | `@457`, `@460` | `@458`, `@461` | a frame late |
| the fix pass's three, recorded at once (`var/vf/rr{1,2,3}.jsonl`) | ~5 | `@463`, `@462`, `@462` | `@464`, `@463`, `@463` | a frame late |

(The verifier's frames are as the verifier reported them.) Five
of six put her snapshot a frame ahead and one did not: the forwarder's clock
decides which batch her event lands in, the D113 class. So `clips.test.ts`'s count
of one is an outcome of that race pinned by the committed recording, and a
re-record can change it — to zero, if the event lands in the snapshot's frame. The
arena change is the real fix, because it draws her whichever way the race goes.

### 4.4 A sacrificed token named in its own ability (`fixtures.test.ts`)

`a name only the opponent's deck holds is never printed unbacked` failed on the
Masters of Evil: "Clue Token (86) - AI-Seat1 draws a card." — Pacho cracking a
Clue. The token was sacrificed to pay for its own ability, so in the frame that
prints the ability no card anywhere carries its name: a token ceases to exist
when it leaves the battlefield. It was public on the battlefield the frame before.
In the two-deck recordings before these, Pacho never cracked a Clue in view. The
check is now a pure function, `unbackedNames`: a TOKEN name is backed by the
frame immediately before (the narrator's own look-behind, D123) and no further,
and every other card keeps the same-frame rule — with four negative controls (no
frame before; a token last seen two frames back; a non-token card seen only the
frame before; and the same frame, which still needs no look-behind). The corpus
uses the look-behind once.

### 4.5 A long-bodied flier and a winged figure reached over the status strip

`status: … the strip's lowest pixel is above every figure's head and what it
wears` failed twice while the rows were written: Birds of Paradise on the insect
body (whose head reaches forward, so from your seat it projects over the strip)
and Songbird on her wings (a full-sized figure's wing tips over its head when its
guard or its attack bends it forward, −1.8 px). Birds of Paradise stands at 0.38
(a 0/1), and a person's wings hang from the shoulder blades (y 0.71, from 0.76 —
Wasp's and the Legionnaire's too; both still read, §5.3). The closest strip over
the corpus is now 1.4 px above Birds of Paradise's head.

## 5. Identity — what each card is (D231)

All data: `figures/figures.json` (a `creature/subtype:human` archetype, nineteen
card rows, one attachment row), `figures/traits.json` (fifty new rows),
`cues/cues.json` (twenty-four rows), and one new kind in the shared kit.

### 5.1 The rungs, and the reuse rule

- **A Human is a person** (`creature/subtype:human`, the man's body). `human` was
  always the last word of `SUBTYPE_ORDER` and no archetype answered it, so a
  green or red Human with no other recognised word — Rick Jones, Gallant Citizen,
  the Warriors of Wakanda — fell to `creature/*` and stood as a glow disc (a white
  one, the Dora Milaje, reached `creature/W`'s man's body, and now reaches this
  rung's). No earlier recording has a creature that reaches it (every earlier
  Human is a Spy, Scientist, Hero, Soldier or Villain first).
- **The body rows** put the women the villain and human rungs would stand in the
  man's body in the woman's (Songbird, Yellowjacket, White Widow, Titania,
  Moonstone, the Dora Milaje) and the men the hero rung would stand in the
  woman's in the man's (the three Hulks, Hercules, Hulkling, Wolverine, T'Chaka,
  T'Challa and three Black Panthers); Klaw aliases `attack` to `pistolDraw`, as
  Kang the Conqueror does; Birds of Paradise stands on the insect, the library's
  one organic flier.
- **Reuse first.** Every row wears the kit's existing kinds where the look
  allows, and three looks moved to a kind the table already draws: Fixer's, Klaw's
  and Atlas's hair is the man's own parted cut (not a crop), the Warriors of
  Wakanda's too, and T'Chaka wears a cloak (the `cape` Storm and the Shield Guard
  wear) where a robe was the coat and its skirt — two kinds. §6 has what each
  saved.
- **A skin is a costume only when the body is transformed.** `skin` is one
  neutral tone for every person (slice 4: a costume is identity data, a
  complexion is not). The rows paint it only where the skin IS the costume —
  gamma green, gamma red, gamma grey-olive, a lava body, a radioactive glow, a
  mutant shark's hide, a cat-knight's fur, a Kree-Skrull's green — fifteen rows,
  listed in `traits.test.ts`'s `TRANSFORMED_SKIN`, which fails a row that paints a
  skin and is not listed, and a listed one that stops. Every Wakandan, like every
  other person in the repo, wears the one tone.

### 5.2 The kit: one new kind, two anchors moved

- **`spear`** (`PROP_KINDS`, fixed vibranium silver `#d4dae4`, preset `metal`):
  planted upright at the figure's right side on `root`, its butt on the ground and
  its leaf blade a head over the crown — a shaft, a gold binding, the blade and a
  foot spike, **68 triangles**. On `root` it rides the lunge and the turn and
  stays planted while the body kneels; no rest pose has to hold it. Worn by five
  Wakandan names: the Dora Milaje Elite, both Okoyes, the Shield Guard and the
  Warriors' leader. Its measured cost is §6: one draw call where it stands, and
  none at Wakanda's crowded frames once T'Chaka's robe went.
- **A person's `visor`** stands outside the head's outermost shell (0.084 × 0.16
  × 0.094 of a figure, from 0.072 × 0.1 × 0.085): no person had worn one, and
  sized inside the hair it showed White Widow's goggles 16 px from behind her bob
  and MACH-1's lenses 2 px under his helm. Now 102/57 and 92/54.
- **A person's `wings`** hang from y 0.71 (0.76 before), under the status strip
  (§4.5). Wasp reads 347/204 px (347/212 before) and the Legionnaire 1,104/592
  (1,025/643).

### 5.3 The rows

**The Masters of Evil** (black-red villains; the villain rung's body unless a row
says the woman's):

| card | body · rest | head | props | in short |
|---|---|---|---|---|
| Whiplash, Vengeful Engineer | man · ready | cowl, teal | gauntlets (electric blue) | a dark suit under a teal hood, his whips crackling in both hands (fix pass: was dark green) |
| Songbird, Sonic Screamer | woman · braced | long, white | wings (pink) | charcoal and white; the hard-sound wings she flies on |
| MACH-1, Swooping Scoundrel | man · ready, hovering | cowl | mask, visor (red), jetpack, exhaust | a gunmetal flying suit, red lenses, thrusters — an Artifact Creature — Human Villain, so a man in a suit |
| Yellowjacket, Heartless Marauder | woman · akimbo, 0.6, hovering | bald under the helmet | helmet, wings (yellow) | small and winged like Wasp; the antennae helmet tells her from Wasp |
| Boomerang, Blade Flinger | man · highReady | cowl, dark navy | mask (silver) | steel blue, steel gloves and belt, his helm's silver faceguard, a blade raised (fix pass: was slate in a slate hood, no mask) |
| Fixer, Techno Terror | man · working | parted | visor (red), labBench (red) | red goggles over a bench of gadgets, grey harness over red |
| White Widow, Yelena Belova | woman · ready | bob, blonde | visor (ice) | a white suit, silver gloves and belt, goggles |
| Common Crook | man · atEase | long, dark | — | bare-headed and long-haired in rust-orange over tan (fix pass: was a balaclava) |
| Whirlwind, Killer Cyclone | man · braced, hovering | cowl | mask | green armour and finned helm on his own cyclone |
| Volcanic Villain | man · braced, 1.05 | long, fire | gauntlets (lava) | molten skin, dark rock with glowing seams, burning fists |
| Klaw, Sonic Subjugator | man · braced | parted | gauntlets (magenta) | a cream shirt, brown trousers, sound at his hands; aims to attack |
| Titania, Proud Pummeler | woman · braced, 1.2 | long, red | — | deep blue with a red belt and boots — her bulk is her scale |
| Moonstone, Harsh Mistress | woman · braced, hovering | long, blonde | gauntlets (gold) | white and gold, the moonstone's light in her hands |
| Tiger Shark, Abyssal Hunter | man · braced, 1.12 | cowl, purple | — | an orange suit, purple finned hood, a shark's grey skin |
| Atlas, Sizable Stooge | man · akimbo, 1.3 | parted | — | a maroon giant with gold bracers |
| Radioactive Man | man · braced | bald | gauntlets (green) | a glowing green body, the yellow star on his chest — no lab bench |
| The Masters of Evil | man · akimbo, a squad of three | cowl, purple | mask, cape | Baron Zemo's purple hood, mask and cloak over a dark tunic, and two figures in shadow behind him — a squad's followers wear the leader's `top` (fix pass: all three were purple). Zemo himself carries `AI:RemoveDeck:All` and is not in the deck |

**The Hulk family** (gamma bodies; the woman's body is the hero rung's):

| card | body · rest | head | props | in short |
|---|---|---|---|---|
| Rick Jones, Destined Sidekick | man · atEase, 0.94 | crop, brown | — | a red jacket, yellow sweater, jeans |
| Birds of Paradise | insect rig, not drawn · a `ring` swarm of 3, hovering | — | (swarmBee) | a flock of three small fliers in crane grey (fix pass: was the insect body at 0.38) |
| Brawn, Amadeus Cho | man · braced | crop | — | gamma green, a dark purple vest over white, charcoal trousers, white gloves — no lab bench (fix pass: vest and trousers were purple) |
| Hellcat, Undying Vigilante | woman · ready | long, red | — | the yellow catsuit, brown gloves, boots and belt |
| Knight of Wundagore | man · ready | long, orange | mask (orange) | a cat-knight: a lion's face (the mask) under an orange mane, dark blue armour (fix pass: was an orange face with human eyes) |
| Gallant Citizen (also Wakanda's) | man · atEase | parted | — | an astronaut in white with red trim, as the card paints him |
| Gamma Grotesque | man · working (hunched, no bench), 1.18 | bald | — | a teal-green gamma monster in black torn trunks (fix pass: was braced, green in purple-grey) |
| She-Hulk, Attorney-at-Law | woman · akimbo, 1.12 | long, dark green | — | green, a purple suit over a white blouse |
| She-Hulk, Jade Defender | woman · braced, 1.18 | long, dark green | — | green, in her fighting white and purple |
| Hercules, Prince of Power | man · akimbo, 1.16 | crop | — | bare-chested, green trunks, gold belt and bracers |
| Hulkling, Burgeoning Bruiser | man · highReady, 1.08 | crop, blond | — | a yellow-green Kree-Skrull in lavender, the olive-gold of his scale down the chest, a fist raised (fix pass: was braced in purple) |
| Hulk, Brutal Brawler · Strongest There Is · Gamma Goliath | man · braced / akimbo / ready, 1.34 / 1.38 / 1.42 | parted · crop · long, dark olive | — | barefoot, the biggest people on the table, each his own: green in torn purple · a deeper green in maroon-brown · a bright green, maned, in indigo (fix pass: all three were one green in purple, cropped) |
| Red Hulk | man · akimbo, 1.38 | crop | — | red, in black trousers |
| Abomination, Irradiated Brute · Terrifying Titan | man · braced / akimbo, 1.3 / 1.34 | bald | — | a grey-olive scaled hide · a darker green one |
| Wolverine, Fierce Fighter | man · braced, 0.92 | cowl, yellow | gauntlets (steel) | the yellow and blue, claws glinting — and short |

**Wakanda** (green-white):

| card | body · rest | head | props | in short |
|---|---|---|---|---|
| Shuri, the Black Panther | woman · ready | cowl | mask | the black suit, gold at her belt and gloves |
| T'Chaka, Venerable King | man · clasped | crop, white | cape (royal purple) | a cloak over black with gold |
| Dora Milaje Elite | woman · ready | bald | spear | red armour, gold at the chest, arms and feet |
| Wakandan Shield Guard | man · ready | crop | cape (blue), spear | brown leather, the blanket that becomes a shield |
| Wakandan Tusker | the disc | — | — | no row: an armoured elephant has no body in the library, and the art rung colours its disc |
| T'Challa, the Black Panther | man · braced | cowl | mask | the black suit, silver vibranium at the belt and gloves |
| Black Panther, Claws of Bast | man · ready | cowl | mask, gauntlets (white) | claws out |
| Black Panther, Most Dangerous | man · akimbo | cowl | mask, gauntlets, visor (violet) | charged with kinetic violet at the chest, hands and eyes |
| Black Panther, Vanguard | man · folded, 1.06 | cowl | mask, cape (black) | the king at the head of his army |
| Nakia, Wakandan Operative | woman · ready | crop | gauntlets (gold) | red and gold, her ring blades lit |
| Shuri, Vibranium Technologist | woman · working | bun | gauntlets (violet) | lavender and white, at her work |
| Okoye, Dora Milaje Leader · Mighty and Adored | woman · atEase / akimbo, 1.04 | bald | spear | the general in red and gold · red over blue |
| Wakandan Drone Flock | drone, hovering | — | laserEye, visor, wings | the robot rung's drone in Wakandan white, a cyan eye |
| Warriors of Wakanda | man · ready, a squad of three | parted | spear | a war party in indigo and white |
| Storm, Queen of Wakanda | woman · braced, hovering | long, white | gauntlets, cape (white) | the queen in white and gold, lightning in her hands |
| Vibranium Energy Daggers (Equipment) | — | — | the attachment `glints` | the Spy Kit's gadget glints, metal-cooled, on its host |

**The cues** (twenty-four rows, each keyed off an event about THAT card):
Whirlwind attacks on the jet's lunge with a WHOOSH; Klaw aims (two flashes at his
hands) and his Sonic Attack resolving rings from his feet; Radioactive Man,
Titania, the Hulks, Red Hulk, the Abominations, She-Hulk, Jade Defender,
Wolverine, the Dora Milaje, Claws of Bast and T'Challa charge on speed lines with
a word of their own; MACH-1, Yellowjacket and Storm fly to the attack on the
jet's lunge; the Masters of Evil assemble with Zemo's `channel` and a KRAK (no
beams: the card makes no token); Okoye, Dora Milaje Leader arrives with beams to
the `beside` anchors where her two Soldiers materialise (never to a token, as
Nick Fury's and Doctor Doom's); Black Panther, Most Dangerous's damage trigger
resolving throws violet rings from his feet with a fissure to what the previous
frame's stack targeted (T6's look-behind, as Quake's); Shuri's arrival is a
violet shimmer; the Drone Flock's eye fires at the defender its attack band
names; the Warriors step forward as a squad. The film each recording plays is
pinned (§3).

**The raster** (`traits.test.ts`, the real `figures.glb` and `PropField`, the table
view at 1600 × 1000, paint after the ink, the fewest pixels over standing/kneeling
and centre/edge, `you` · `opp`): every identity prop of the three decks is at 48
px or more on both seats, except the one-sided details with their partners — the
`mask` (partner the cowl), MACH-1's `jetpack` and `exhaust` (partner the visor, 54
px in front), the Drone Flock's `laserEye` (the visor), and *The Masters of Evil*'s
cloak from the front (46 px: a squad's leader is drawn smaller; `ONE_SIDED`'s
cloak row now names Doom and the Masters, each carried by the hood in front).
The tightest that pass: Black Panther, Most Dangerous's gauntlets 48 px from your
seat, Storm's cloak 49 from the far seat, the spears 157/114 (the Dora Milaje)
and 93/87 (the Warriors' smaller leader). The fix pass's masks are details carried
by their partners, as every mask is: Boomerang's faceguard 0 px from your seat and
57 from the far one, his cowl 302/214; the Knight of Wundagore's lion face 0/40,
his mane 283/101 — the one raster rule the fix pass changed is `ONE_SIDED`'s
`mask` partner, the cowl OR the long style (D232). Two looks were taken off the raster's
bar while the rows were written: Birds of Paradise's extra wings (28 px from your
seat at 0.38) and the Warriors' crop (44 px from the front; their parted hair is
the S.H.I.E.L.D. squad's, with the same partner).

**What the corpus does not reach** (`traits.test.ts`'s `OFF_THE_TABLE`, each read
off a pose built from the workshop catalog's facts): Whiplash, Titania and Tiger
Shark (never drawn in the Masters of Evil's game); She-Hulk, Attorney-at-Law,
Hulk, Brutal Brawler, both Gamma Grotesques and Abomination, Terrifying Titan
(milled by Rick Jones) and Red Hulk (drawn on the last turn); Shuri, Vibranium
Technologist and Okoye, Dora Milaje Leader (milled by T'Chaka). The Villain token
is still made by no recording.

## 6. The budget — kinds, calls and triangles

**Prop kinds at once** (the census's own counting; a scratch
`var/villains2/kinds.mts`), the base tree being `c330942`'s data with these
recordings added:

| recording | most kinds at once · where | on its most crowded frames (cards) | base tree: at once · crowded |
|---|---|---|---|
| Masters of Evil | 26 · `@235` (26 cards) | 12 (40, `@438`) | 19 · 3 |
| Hulk family | 16 · `@323`; **17** after the fix pass (the Knight's mask; a lance with it made 18, and went) | 8 (37, `@410`–`@436`); **10** after the fix pass | 14 · 13 |
| Wakanda | 20 · `@485` (46 cards) | 15 (48, `@525`–`@532`) | 15 · 14 |
| Doom Legion (unchanged) | 22 · `@296` | 17 (49) | 22 · 17 |

The Masters of Evil's 26 is Pacho's side's own fifteen or so — Peggy's hat,
shield, sidearm and waves, Agent 13's pistol, muzzle and bun, the A.I.M. bench and
hood, the Aerial Doombot's eye, visor, pack and flame, the Air Force's bees —
beside a Masters table that reuses nearly every kind it wears (the cowl, mask and
cape are the Doom Legion's; the jetpack, exhaust and visor the Doombot's; the
bench the scientists'). `traits.test.ts`'s `OVER_THE_LINE` holds the Masters of
Evil to 26 and 12, Wakanda to 20 and 15; the Hulk family keeps the 17 every other
recording keeps.

**The static sweeps** (every transport index, scrubbed down from the last — each
reading a flush and snap, that frame's pose with no cue running; `vite preview` of
each tree, 1920 × 1080, `?glinfo=1&bloom=0`; a scratch `var/villains2/sweep.mjs`).
The GTX 1080 and SwiftShader read the same counts on every file:

| recording | tree | worst calls · where | worst triangles · where | frames over 120 calls · over 90 · over 30,000 triangles |
|---|---|---|---|---|
| Masters of Evil | base | 99 · `@471` | 30,247 · `@371` | 0 · 60 · 11 |
| Masters of Evil | lane | **107** · `@471` | **35,567** · `@371` | 0 · 211 · 257 |
| Hulk family | base | 111 · `@427` | 25,794 · `@431` | 0 · 114 · 0 |
| Hulk family | lane | **106** · `@427` | **27,042** · `@368` | 0 · 117 · 0 |
| Wakanda | base | 119 · `@527` | 29,450 · `@382` | 0 · 189 · 0 |
| Wakanda | lane, T'Chaka in a robe (coat and skirt), with the spear | 121 · `@527` | 33,592 · `@382` | 7 · 215 · 198 |
| Wakanda | the same, **no spear** | 120 · `@527` | 33,388 · `@382` | 0 · 214 · 197 |
| Wakanda | **lane** (T'Chaka in the cloak, with the spear) | **119** · `@477`, `@527`–`@533` | **33,592** · `@382` | 0 · 215 · 198 |
| Doom Legion | base = lane | 128 · `@392` | 37,546 · `@393` | 16 · 130 · 97 |
| `g1` | base = lane | 89 · `@353` | 29,609 · `@355` | 0 · 0 · 0 |
| Masters of Evil | **the fix pass** (D232) | 107 · `@471` | **35,689** · `@371` | 0 · 211 · 257 |
| Hulk family | **the fix pass** | 107 · `@427` | 27,318 · `@368` | 0 · 118 · 0 |
| Wakanda | **the fix pass** (the 25th land laid, D230) | 119 · `@477`, `@527`–`@533` | 33,592 · `@382` | 0 · 215 · 198 |
| Doom Legion, `g1` | **the fix pass** | 128, 89 (unchanged) | 37,546, 29,609 (unchanged) | 16 · 130 · 97; 0 · 0 · 0 |

The fix pass's sweeps (`var/vf/sweep-fix1-*.json`, a scratch copy of the same
driver on CDP port 9172, 2026-09-29 at 07:05–07:12, load 3–9) read the same counts
on the GTX 1080 and SwiftShader for every file. What its re-dressing moved: the
Masters of Evil +122 triangles at `@371` (Boomerang's faceguard; the crook's long
hair for his cowl), the Hulk family +1 call at `@427` and +276 triangles at `@368`
(the Knight's mask, Birds of Paradise's three fliers for the insect body, the
Goliath's mane), and Wakanda **+124 triangles and no call** at `@525`–`@533`, the
25th land's tile the old cap left undrawn.

**The spear's argument, measured**: at Wakanda's worst frames it is exactly one
call (120 → 121) and about 200 triangles, and with T'Chaka's robe it would have
put seven frames over the bench's hard 120; T'Chaka's cloak — a kind the table
already draws — took two kinds off those frames, and the recording's worst is 119,
the base tree's own. The Hulk family's table draws fewer calls dressed than bare,
and it is the kinds: its most crowded frames carry 8 prop kinds dressed against
the base tree's 13 (the base tree stood the hero rung's women, each in her own
long hair and face, beside the rungs' men; dressed, most of that table is bald
or crop-haired gamma bodies).

**The triangle line is NOT met on two of these tables, and that is accepted (D233),
not watched.** The lane first called the triangles "the increment to watch"; the
verifier's point was that a line crossed without a decision is a line nobody
keeps. The dressed Masters of Evil add 5,442 at their worst frame (`@371`: props
14,415 against the base tree's 8,487 — the S.H.I.E.L.D. Agents' squad and the
Masters' own, 2,800 a squad, the cowls 432 an instance against the parted hair's
114, the gauntlets 120 a fist), and over the whole file 257 frames are over §8.2's
30,000 where the base tree has 11; Wakanda adds 4,142 (198 frames over, none on the
base tree, whose worst is 29,450 — 98% of the line). The calls stay under the
bench's 120 on both. D233 accepts each table with those numbers, says why a cut
does not meet the line short of taking a card's first read (§11 has the measured
cuts), and holds the part identity owns — the figure layer — in
`traits.test.ts`'s `FIGURE_TRIS_HELD`; villain identity's follow-up 4, a budget for
a crowded table, is still the real fix.

**The bench** (`tools/arena-bench.mjs --no-bloom`, the default 600 ms settle;
`--index N` reads its counters at the end of its five-second sample, so the
indices below are the busiest frame minus fifty; single runs, then interleaved
SwiftShader pairs):

| bench | renderer | lane: calls / triangles · p95 | base tree: calls / triangles · p95 |
|---|---|---|---|
| `g1` `--index 355` | GTX 1080 | 88 / 26,619 · 2.7 ms | (unchanged: the same tree for g1) |
| `g1` `--index 355` | SwiftShader | 89 / 26,621 · 33.3 ms | — |
| Masters of Evil `--index 421` | GTX 1080 | 103 / 34,273 · 3.8 ms | 94 / 28,251 · 6.1 ms |
| Masters of Evil `--index 421` | SwiftShader, three pairs | 106 / 34,367 · 52.6 ms; 104 · 34.2; 103 · 34.5 | 96 / 28,277 · 34.5; 89 · 262.1 (a loaded moment); 95 · 35.4 |
| Hulk family `--index 377` | GTX 1080 | 102 / 26,792 · 3.0 ms | 106 / 25,532 · 4.2 ms |
| Hulk family `--index 377` | SwiftShader | 98 / 26,784 · 34.7 ms | 103 / 25,526 · 34.9 ms |
| Wakanda `--index 477` | GTX 1080 | 117 / 31,976 · 3.9 ms | 118 / 27,591 · 4.7 ms |
| Wakanda `--index 477` | SwiftShader, three pairs | 122 / 32,008 · 68.5 ms; 119 · 47.4; 118 · 34.9 | 118 / 27,613 · 34.4; 118 · 35.4; 118 · 34.6 |

**The fix pass's benches** (`var/vf/bench-*.log`: the same flags, `--port 9174`,
07:12–07:14 at a load average of 7–9, one run each — other lanes were running):

| bench | GTX 1080: calls / triangles · p95 | SwiftShader: calls / triangles · p95 |
|---|---|---|
| `g1` `--index 355` | 88 / 26,619 · 0.6 ms | 89 / 26,621 · 47.6 ms |
| Masters of Evil `--index 421` | 103 / 34,395 · 1.2 ms — FAIL on triangles | 103 / 34,417 · 38.0 ms — FAIL |
| Hulk family `--index 377` | 106 / 26,552 · 1.2 ms | 99 / 26,538 · 35.3 ms — FAIL on time |
| Wakanda `--index 477` | 118 / 32,102 · 5.6 ms — FAIL on triangles | 120 / 32,004 · 47.1 ms — FAIL |

The verdicts are the lane's: the triangle FAILs are D233's accepted breach, the
SwiftShader time FAILs are every tree's, `g1`'s included; the calls stay under 120
(Wakanda's SwiftShader sample read 120 — a played sample includes the cues'
transients).

A played sample includes the cues' transients, so it can read a call or two over
the static sweep (Wakanda's 122 on one SwiftShader run). On the GTX 1080 the p95 is
2.7–3.9 ms everywhere; on SwiftShader every bench of both trees fails §9.4's 20
ms, `g1` included (33.3 ms), at a load average of 3–12 — the other lanes were
running — and the interleaved pairs put lane and base within a millisecond of each
other (34.2–34.9 against 34.4–35.4) once the loaded outliers are set aside. The
bench's own verdict line FAILs every villain frame on the 30,000 triangles (the
lane) and on frame times (both trees), as it did `villain-doom-248`'s (D222).

## 7. The workshop, and the pictures

`node tools/build-workshop-catalog.ts`: every name of the Hulk family and of
Wakanda now takes its facts from the corpus, and of the Masters of Evil the
engine still speaks for the five its game never drew (Whiplash, Lightning Bolt,
Titania, Tiger Shark, Avengers: Under Siege) — `workshop.test.ts` holds both, and
the Hulks the personal tier dresses (D196) take the corpus's facts now too. The
catalog check (`--check`, gate step 12b) is current.

Pictures, headless Chromium on the GTX 1080 (scratch drivers
`var/villains2/shot-cards.mjs` against the dev server and
`var/villains2/shot-table.mjs` against `vite preview`, sheets by
`var/villains2/montage.mjs`):

- `var/villains2/pedestal-1x-sheet-masters-of-evil.png`,
  `…-hulk-family.png`, `…-wakanda.png` — every creature and creature token of each
  deck on the workshop's pedestal at its default **1× front**, the comic look,
  seventeen, eighteen and eighteen figures (the Soldier token with Wakanda; the
  Villain token, which the workshop's list does not carry, is in the Doom lane's
  pictures), cropped side by side; the single shots are under
  `var/villains2/pedestal/<deck>/front-<card>.png`;
- `var/villains2/eval-sheet-<deck>.png` — the same in the workshop's INSPECT view,
  each figure over its card's art (`var/villains2/pedestal/<deck>/inspect-<card>.png`);
- `var/villains2/table-villain-masters-of-evil-33-at-471.png` and `…-at-371.png`,
  `table-villain-hulk-family-261-at-427.png` and `…-at-368.png`,
  `table-villain-wakanda-232-at-527.png` and `…-at-477.png` — the arena's table
  view at each recording's worst-calls frame and its worst-triangles or second
  frame;
- `var/villains2/view3-villain-masters-of-evil-33-at-471.png`,
  `view3-villain-hulk-family-261-at-427.png`, `view3-villain-wakanda-232-at-527.png`
  — the same frames over the opponent's shoulder (view 3).

As with `villain-doom-248`, each recording is seen from the AI deck's seat, so the
S.H.I.E.L.D. director duelist stands behind the villains (PLAN.md's
villain-identity follow-up 12).

**The fix pass's pictures** (§11), the same drivers copied to `var/vf/` (CDP ports
9171–9174), headless Chromium on the GTX 1080, under `var/villains2/fix1/`:

- `var/villains2/fix1/pedestal-1x-sheet-masters-of-evil.png`, `…-hulk-family.png`,
  `…-wakanda.png` — every creature of each deck at the workshop's 1× front, comic
  look (the singles under `var/villains2/fix1/pedestal/<deck>/front-<card>.png`);
- `var/villains2/fix1/eval-sheet-<deck>.png` — the inspect view, each figure over
  its card's art (`…/pedestal/<deck>/inspect-<card>.png`);
- `var/villains2/fix1/table-villain-masters-of-evil-33-at-471.png` and `…-at-371.png`,
  `table-villain-hulk-family-261-at-427.png` and `…-at-368.png`,
  `table-villain-wakanda-232-at-527.png`, `…-at-477.png` and `…-at-382.png` — the
  table view at each recording's worst-calls and worst-triangles frames;
- `var/villains2/fix1/view3-villain-masters-of-evil-33-at-471.png`,
  `view3-villain-hulk-family-261-at-427.png`, `view3-villain-wakanda-232-at-527.png`
  — over the opponent's shoulder;
- `var/villains2/fix1/try1/` — the first look at the thirteen re-dressed cards.

## 8. Tests and the gate

`npm --prefix web test`: `node --test` **1,124 tests, 1,118 pass, 0 fail, 6
skipped** (1,077 / 1,070 / 0 / 7 on `c330942` with no `dist` — the build-check
skip goes when a `dist` is there, so 1,071 / 6 like for like), and vitest **130**
(124: `render.test.tsx` renders the three new recordings). The new cases: the three
decks' costume, rest and skin-rule list (`traits.test.ts`), the unbacked-name
check's negative controls (`fixtures.test.ts`), and the per-file cases every
recording gets. `./bridge/build.sh`: build OK, its self-tests green. `npm --prefix
web run build`: OK — the 2D entry chunk 93.53 kB gzip, as on `c330942`, and the
shared scene chunk 389.79 kB, from 379.64 on `c330942`: the fifty rows and
twenty-four cues are data the scene chunk carries. The gate: §9.

## 9. The gate, from a deleted `bridge/out`, twice

`GATE_JOBS=4`, `bridge/out` deleted before each run, the log teed:

| run | `WSPORT` | wall | result | log |
|---|---|---|---|---|
| 1 | 9160 | 273.4 s (48 jobs, 1,019.5 s of job time, load 5.6 → 13.8 at most → 7.4) | **check-all OK**, exit 0 | `var/check-all-villains2-p1.log` (`var/check-all/20260929-060224-2112587/`) |
| 2 | 9170 | 253.1 s (48 jobs, 955.6 s of job time, load 5.3 → 10.1 at most → 9.0) | **check-all OK**, exit 0 | `var/check-all-villains2-p2.log` (`var/check-all/20260929-060716-2217362/`) |
| **fix pass** | 9160 | **267.9 s** (48 jobs, 1,011.3 s of job time, load 7.9 → 12.8 at most → 8.5) | **check-all OK**, exit 0 | `var/check-all-villains2-fix1.log` (`var/check-all/20260929-071502-2950549/`) |

Inside the gate `node --test` is **1,139 / 1,131 pass / 0 fail / 8 skipped** (the
ws-log suite reads step 10's logs, `MTGTABLE_WS_LOGS`) and vitest **130**, both
runs; **1,142 / 1,134 / 0 / 8** and 130 in the fix pass's run (its three new
tests). Step 6 compared `fixtures/games/g1.jsonl` (`wire-drift: SAME`, M49's
keywords removed from the fresh file as ever) and 9b
`fixtures/games/human-auto-42.jsonl` — neither of the new files; 9b is advisory
and printed its usual framing differences. Step 11 passed the corpus's 23
recordings through `check-redaction.mjs`, 12b found the catalog current and 12d
the narrator's 99 checks and six negative controls green over every fixture. The
lane added no step.

## 10. `~/forge` and `~/.forge`

Fingerprinted before the lane's first JVM and after its second gate — every path,
size and mtime under both (`find -printf '%p %s %T@'`, sorted), the sha1 of every
file under `~/.forge` and the jar's sha256: 22,128 entries under `~/forge` and 27
under `~/.forge`, the two listings and the `~/.forge` sha1s byte for byte identical
before and after, the jar's sha256 still `3c0a7c38…8e5dd9`. **Unchanged.** The
fix pass did the same again, before its first JVM (the three re-records of seed 33)
and after its gate (`var/vf/{forge,dotforge,dotforge-sha1,jar}-{before,after}.txt`):
22,128 and 27 entries, every listing, sha1 and the jar's sha256 byte for byte
identical — **unchanged**. Every
JVM of the lane booted in `var/` — the seed search in homes of its own
(`forge_home_make`), the committed recordings and the gate in the checkout's.

## 11. The fix pass — what the verifier found, and what changed (D230, D232, D233)

The verifier (round 1, at `690fa18`) found three majors and five minors, and read
the pictures. Every major is fixed; four minors are fixed and one is the owner's
(question 31).

**The terrain's cap (major; D230 item 5).** The lane's "24 lands in the busiest
frame" was `MAX_TILES`, not the table: `tiles.test.ts` counted tiles LAID, which
can never exceed the cap. Counted apart, `villain-wakanda-232`'s last turns PLACE
**25** lands on eight frames (`@525`–`@532`), and the cap of 24 (report 13 §2's 21
with room) left one land of each without its terrain — the frames the lane benched
and pictured, and README's frame 527. The cap is **32** now (`figures/tiles.ts`'s
`MAX_TILES`; `scene/tiles.ts`'s `TILE_CAPACITY` is `MAX_TILES` itself). The
terrain is instanced, so the 25th land costs **no draw call**; it costs 124
triangles (one slab; `var/vf/tiletris.mts` counts 124 for every tile mesh), and the
sweep reads exactly that: Wakanda `@525`–`@533` 31,978 / 32,004 → 32,102 / 32,128
triangles at 118 / 119 calls, unchanged. The test now holds 25 placed at those
eight frames, every placed land laid (`laid = min(placed, MAX_TILES)` on all 5,522
board frames), no frame capped, and the cap's own order with a synthetic table of
40 lands built from `@525` (32 laid, the first 32 in placement order). Tile
instances over the corpus: 50,993 → 51,001.

**The triangles (major; D233).** Accepted per recording with its numbers (§6), and
the figure layer held by a new test. `traits.test.ts`'s `FIGURE_TRIS_HELD` counts,
every frame of every recording, each modelled body's triangles (`models.json`) and
each prop kind's geometry as `PropField` builds it — procedural, or baked (a squad
follower is its body, the carved parted hair 114, the long 416) — times its
instances, and holds the worst:

| recording | figure layer, dressed: worst · where | bare tree (`c330942`'s rows) | the scene's worst (§6) |
|---|---|---|---|
| Masters of Evil | **31,449** `@376` (bodies 16,792, props 14,657) | 25,285 `@363` | 35,689 `@371` (its figure layer there 31,331) |
| Doom Legion | **31,318** `@393` | = (dressed in `c330942`) | 37,546 `@393` |
| Wakanda | **28,710** `@376` (bodies 18,092, props 10,618) | 24,870 `@359` | 33,592 `@382` (its figure layer there 28,710) |
| every other: `g1` | **24,701** `@342` | = | 29,609 `@355` |
| Hulk family | 23,600 `@427` | 22,584 `@429` | 27,318 `@368` |

(`var/vf/figtris.mts`, the test's counting as a scratch, reads the bare tree.) Each
held number must stay within 5% of the corpus's, so a cut is recorded, not left as
slack. The measured cuts that were NOT taken (`var/vf/cutsim.mts`: the sweep's
triangles, frame by frame, minus the named props' figure-layer part): Wakanda
without the Warriors' squad 30,792 and 64 frames over; with it and every lit fist
gone 29,992 (8 under); with it and every Panther's hood gone 29,928 (the raster
forbids a mask without its hood); with a mask, or a cloak and a spear, in place of
the fists 30,340 and 30,348, 26 frames over. The Masters of Evil without their
squad 32,889, 68 over.

**Moonstone (major; D230's bullet).** A race, not the engine's order: §4.3.

**The census's thin checks (minor).** Every census row of the three decks must
read its own `card` rung, and the rows carry their costume, so Hellcat (yellow,
red hair, the woman's body), the Knight (the lion's mask, orange fur, blue
armour), Boomerang (mask, cowl, steel gloves) and Brawn (green, white under a
dark vest, charcoal) are each checked for what is theirs.

**The token field (minor).** `fixtures.test.ts`'s `unbackedNames` reads the wire's
`token: true` from the frame before, never `name.endsWith(' Token')`; two new
negative controls (a card named like a token that is not one; a Doombot token).
The corpus still uses the look-behind once.

**The pictures (minor, and the verifier's reading).** Nine rows re-dressed, each
on a kind its table already draws (D232; §5's rows say what each was): the Masters
of Evil's two followers in shadow behind a purple Zemo (a squad's followers wear
the leader's `top`, and his tunic went dark); Whiplash dark under a teal hood;
Boomerang's silver faceguard; the Common Crook bare-headed and long-haired; the
green bodies apart (three Hulks with their own hair, green and trousers; Gamma
Grotesque teal and hunched; Hulkling lavender, a fist raised; Brawn a dark vest
over white); Birds of Paradise a flock of three; the Knight's lion face. The green
bodies' pairwise distance (the most of skin, top and trousers, RGB) is now 49 at
the closest pair (Gamma Grotesque and Abomination, Terrifying Titan), held at ≥ 40.
A lance for the Knight was tried and taken off: with his mask it put the Hulk
family's table at 18 prop kinds at once (`@323`). Kinds, recounted: the Hulk
family 17 at once and 10 crowded (from 16 and 8); the Masters of Evil 26 / 12 and
Wakanda 20 / 15 unchanged. The status strip's closest head is 1.7 px (Volcanic
Villain, attacking), from Birds of Paradise's 1.4.

**The skin tone (minor; the owner's).** Every Wakandan wears the one pale default,
against art of a Black cast — slice 4's rule, kept by D231. Changing it is a
decision about the rule, not a row; PLAN.md's owner question 31 asks it.

**Concealment (minor).** The three recordings add no anonymous figure (1,179
before and after) and no face-down battlefield instance (1,138): every hidden-
information sweep is vacuous over them, and §3 now says so. A new test turns each
of the 50 dressed names face down twice (its name kept; Forge's empty face) and
requires the anonymous disc with nothing on it, and a five-key stub in its place to
stand nothing; the same card face up must read its own row. With `pose.ts`'s gate
narrowed to redacted cards (`placement.back && isHidden(placement.card)`), the test
fails on its first name, Whiplash.

**Tests after the fix pass**: `npm --prefix web test` — `node --test` **1,127
tests, 1,121 pass, 0 fail, 6 skipped** (1,124 / 1,118 before: the tile control,
the face-down control and the figure-layer test), vitest **130** (8 files).
`npm --prefix web run build`: OK — the 2D entry chunk 93.53 kB gzip (unchanged),
the shared scene chunk 390.67 kB (389.79: the rows' notes grew).

**The fix pass's gate**: from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT`
9160 — **267.9 s**, check-all OK, exit 0, `node --test` inside it 1,142 / 1,134 /
0 / 8 and 130 vitest (§9's table). `~/forge` and `~/.forge` unchanged (§10).
