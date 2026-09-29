# The arena's caption — the story at the table

The arena shows what happened and `#story` says it in words; at the table the
moments scrolled past unnamed. This lane puts the narrator's sentence for the
frame on screen in a strip over the arena's table: the frame's moments, the one or
two before them dimmed above, each turn's lines under that turn's marker, and
nothing else. It works in a replay, while following a spectated game, and at a
live seat. Decisions **D255** (the caption is the one narrator's, handed to the
arena as plain data; the live seat records its game off the socket) and **D256**
(where it sits, when it is on, and `N`); PLAN.md *The arena's caption* has the
status and the follow-ups. It closes the story page's follow-up 1 by another road
than the one that follow-up drew (D255, *Rejected*).

Built on 2026-09-29 in the worktree `/home/justin-a/code/mtg-table-t2c`, branch
`arena-story-caption`, from `main` at `24ba603`. Every number in §1–§11 was
measured there, and the command that produced it is beside it. The branch was
then rebased onto `main`'s `2c7ed8e` (more villain identity and the sound cues);
§12 is what that moved, measured on the rebased tree.

```bash
npm --prefix web run dev                    # then /?replay=games/g1.jsonl#arena — N or the cue strip's checkbox
node --test web/test/caption.test.ts        # which moments, the live feed, the choice, where it sits (from web/: test/…)
(cd web && ./node_modules/.bin/vitest run test/arena-caption.test.tsx)   # hard rule 8 on the strip
node tools/story-shot.mjs --url 'http://127.0.0.1:5219/?replay=games/g1.jsonl#arena' \
    --frame 208 --wait 2500 --port 9268 --out var/caption/cast-g1-208.png   # a picture, and the strip's lines
```

---

## 1. One narrator, handed down as data (D255)

```
main.tsx ── import('./story/caption.ts') ── captionIndexOf(header, frames)   narrate() once per log
   │                                         captionAt(index, cursor)         the caption for a cursor
   │   frames: the replay transport's (growing while followed), or at a live seat
   │           the game liveLog.ts records off the socket
   └── <Arena caption={…} onCaptionShown={…}/>  ── <CaptionStrip caption={…}/>  (arena/, pure)
```

- **The arena runs no narrator.** Nothing under `web/src/arena/` imports
  `story/`, anything named for the narrator, or a transport; `CaptionStrip.tsx`
  is a pure function of its prop (no hook, timer, request, storage or clock) and
  imports only `arena/caption.ts`'s types; `arena/caption.ts` imports only
  `camera.ts`'s `CornerRect` type (`liveness.test.ts`'s new clause; its negative
  control splices a static, a type-only and a dynamic import of `story/` into a
  copy of `Arena.tsx` and all three are caught).
- **`main.tsx` reaches the narrator only through `import()`** — the page's
  `lazy(() => import('./story/Story.tsx'))` and now `import('./story/caption.ts')`,
  nothing static (`story.test.ts` and `liveness.test.ts`). `story/caption.ts`
  imports `narrate.ts` and `page.ts` and nothing else. So *"nothing but `main.tsx`
  imports `story/`"* (D125) stands, unrelaxed.
- **It narrates only while someone reads.** The arena reports its switch
  (`onCaptionShown`); `main.tsx` loads the narrator and narrates only while the
  arena is mounted with the strip on.

**The chunks** (`npm --prefix web run build`, gzip; the base is `24ba603`'s own
build of the same tree, `vite build` in a scratch copy):

| chunk | `24ba603` | this branch | |
|---|---|---|---|
| 2D entry `index-*.js` | 93.75 kB | 94.52 kB | +0.77: the live recorder (`liveLog.ts`), `useArenaCaption`, the `N` row and its pre-pass |
| `Arena-*.js` | 17.43 kB | 18.12 kB | +0.69: `CaptionStrip`, `arena/caption.ts`, the checkbox and the stored choice |
| `Story-*.js` | 15.53 kB | 4.24 kB | the narrator and `page.ts` left it for the shared chunk below |
| `page-*.js` (new, shared) | — | 11.68 kB | `narrate.ts` + `page.ts`, loaded by `#story` or by the caption, whichever comes first |
| `caption-*.js` (new) | — | 0.96 kB | `story/caption.ts` |
| `arena-scene-*.js` | 379.53 kB | 379.53 kB | unchanged |
| stylesheet | 19.37 kB | 19.58 kB | the strip's rules |

The narrator was never in the entry chunk — it was the story page's — and it is
in neither the entry nor the arena chunk now: a grep of the built chunks for one
of its sentences (`triggers again`) finds it in `page-*.js` alone.

**The cost.** `captionIndexOf` (the narration plus the index) is 2.93 ms for g1's
376 frames, 3.15 ms for `villain-doom-248`'s 400 and 1.46 ms for
`human-ability-42`'s 1,594, and `captionAt` 1.5–5.4 µs a cursor (Node 24, this
machine, at a load average of about 1–3).

## 2. What a caption is (D255)

The frame on screen is the last server `state` the cursor has applied — the
snapshot the arena draws — and none after a newer `hello_ok`. Its moments are
every moment of the frames from that snapshot up to the cursor, in the story
page's order (a game's setup lines before its turns), at most four (past four,
three and `+N more`); above them the one moment before, two when the frame has
one, dimmed; and the story page's turn heading wherever the turn changes.

`caption.test.ts`, over every cursor of all 20 committed logs (16,303 cursors),
against a reading of the facts written apart from `caption.ts`:

| | |
|---|---|
| captioned / hidden | **6,005 / 10,298** cursors |
| captions spanning two turns or more | **2,522** (42%), at most **3** markers — why every line carries its own turn: the first cut printed one marker for the frame, and at a live seat's turn 3 the opponent's turn-2 *"Plays Plains."* sat under *"Turn 3 · Human (you)"* |
| the caption's lines end on the moment `#story` highlights at the same cursor | at **5,920** cursors (every caption with no `+N more`) |
| the busiest caption the picker can make, and the corpus's tallest at its upper bound | **208.0 px**, the 13rem cap |

One measurement changed the order: in a frame that holds turn 1's first land and
the setup the narrator tells at the end of that batch, the facts' own order put
*"Plays Mountain."* above *"Human keeps 7 cards."*, where the story page lists the
setup first; the index now takes the page's order within a frame
(`outlineGame`, stably by frame).

## 3. Where it sits (D256)

`.arena__caption`, mounted right after the art credit in `.arena__layer` (the
mount point the story page's follow-up 1 named), is placed absolutely at the
canvas's right edge between the seat plates, growing upward from 7.4rem above the
bottom (7.2 px over your plate), `min(28rem, 19.5vw)` wide and at most 13rem tall.
`caption.test.ts` holds `CAPTION_BOX` to the stylesheet and projects every board
frame of the corpus (4,077 frames, 99,818 cards and figures) through the table
view's camera at eight canvases; a thing counts as covered when a tenth of its
screen box is under the strip:

| canvas | frames touched | hand | stack | battlefield | piles | duelists |
|---|---|---|---|---|---|---|
| 1024 × 700 | 249 | 0 | 0 | 255 (0.26%) | 0 | 0 |
| 1280 × 660 · 1366 × 680 · 1440 × 800 · 1600 × 944 · 1600 × 974 · 1920 × 1000 · 2560 × 1340 | **0** | 0 | 0 | 0 | 0 | 0 |

**The control**: the same box at the bottom centre, where a subtitle would go,
covers hand cards 9,384–12,150 times at every canvas (4,072 of the 4,077 frames
touched it; 3,922 at 2560 × 1340).

**The width is the land rank's.** The first width tried, `min(22rem, 26vw)`,
covered **126 frames at 1280, 1440 and 1600 px**: the ninth card of a full land
rank, tapped, reaches 79.6% of a 1600-px canvas (g1@346: its box from x 1130 to
1274, the strip from 1238). `min(28rem, 19.5vw)` clears it at every canvas from
1280 up.

**The other views** (a scratch run of the same measure at 1600 × 944, not a test):

| view | frames touched | what |
|---|---|---|
| table (seat-safe) | 0 | — |
| low (seat-safe) | 0 | — |
| shoulder (seat-safe) | 2,208 | 1,582 hand cards, 650 battlefield: the right end of your fan |
| their shoulder (spectator) | 498 | 573 of the opponent's piles, 223 battlefield |
| side-on (spectator) | 2,343 | 4,880 battlefield |

The strip does not move with the view (PLAN.md's follow-up); at a live seat —
where a covered hand card is one you cannot click — it is off by default.

**The cue strip's row.** The checkbox widened the cue strip to 728 px, and at
1600 px the camera switcher (672 px with its labels) wrapped onto a row of its own
under it — over the opponent's back rank, the defect slice 2's verification fix
removed. The switcher's labels now collapse to their keys below 1800 px (1400
before). Measured in headless Chromium (the page's own DOM rectangles):

| width | idle: strips | playing: strips |
|---|---|---|
| 1280 | one row, 964 of 1,040 px | **two rows**: 814 + 230 px (the queue's status grows by ~86 px while cues play) |
| 1600 | one row, 964 of 1,360 | one row, 1,044 of 1,360 |
| 1920 | one row, 1,406 of 1,680 | one row, 1,492 of 1,680 |

At 1280 px while cues play the switcher wraps for the length of the batch (PLAN.md's
follow-up, beside the sound lane's checkbox, which will widen the same strip).

## 4. On, off, and `N` (D256)

- **Watching** (a replay, a followed recording) the strip is **on** by default; at
  a **live seat** it is **off**. `N` (in the arena) and the cue strip's
  **caption** checkbox flip it; the choice is stored per context under
  `mtg-table.arena.caption` (`{"watch":true,"seat":true}` after `N` at a seat),
  inside `try`, by `Arena.tsx` alone.
- **`N` is two rows.** Forge's always-no (`alwaysNo`) stays first, so
  `bindingFor` is unchanged; `planKey`'s pre-pass gives `N` to `toggleCaption` in
  the arena (which has no auto-yield control — it answered *"N is a board
  control — press V"*) and on a read-only board (`inert`, *"toggles the 3D arena's
  caption strip — the board has none; press V"*). On a live board `N` still sends
  `setYield … no` (`keys.test.ts`).

## 5. The live seat (D255)

**Parity, over the corpus.** Every committed log fed frame by frame through
`LiveFrameLog`, its own `resync`s re-delivered as the socket delivers them (the
hello, the last snapshot and every open ask, verbatim — 6 frames each in
`human-comfort-13` and `human-yield-13`), and captioned at every snapshot as it
arrives: **equal to the replay's caption of the same frame at 4,075 of 4,077
snapshots** (2.0 s for the sweep). The two others are `human-sideboard-7`@13 and
`sample-handwritten`@33, whose replay caption holds a sideboard answer — a moment
the narrator tells from the seat's own `c2s` frame, which a socket client never
hears back.

**In the browser.** `./bridge/run.sh mtgtable.MtgTable --transport ws --port 9252
--seed 42 --keep-open`, the page at `/?ws=1&port=9252#arena` driven over CDP (a
scratch driver, `var/caption/`'s pictures): the strip off, the checkbox unticked
(`var/caption/live-seat-default-off.png`); `N` → ticked and stored; then eight
presses of Space (play first, keep, pass):

| after | the strip |
|---|---|
| Space 1–3 | hidden (the coin toss, the mulligan, your own empty turn 1) |
| Space 4 | *Before the game* · Human goes first. · *Turn 2 · Forge AI (AI)* · Draws a card. · Plays Plains. |
| Space 5 | hidden (a quiet step) |
| Space 6 | *Turn 2 · Forge AI (AI)* · Draws a card. · Plays Plains. · Casts S.H.I.E.L.D. Spy Kit ({W}, Equipment). |
| Space 8 | *Turn 2 · Forge AI (AI)* · Plays Plains. · Casts S.H.I.E.L.D. Spy Kit … · *Turn 3 · Human (you)* · Draws **A.I.M. Scientists**. — `var/caption/live-seat-caption-on.png` |

## 6. Following a spectated game

`./scripts/spectate.sh --no-serve --no-build --name caption-follow-7 --seed 7
--pace 600 --web-port 5219`: 285 state + 2 other frames, 19 turns, AI-Seat1 won,
120 s of pace; `check-redaction.mjs` **PASS**. The arena at
`/?replay=spectate/caption-follow-7.jsonl&follow=1#arena`, opened while it recorded
and read every 1.5 s: the cursor followed the live edge 0.6–1.2 s behind, and the
strip came and went with the frames as they arrived — *"Turn 3 · AI-Seat1 (AI) /
Draws a card. / Plays Swamp. / Attacks with Aerial Doombot (1/1)."*, then *"…
AI-Seat0 does not block. / AI-Seat0 takes 1 damage from Aerial Doombot; life
20 → 19."*, then hidden through the quiet steps, then *"Turn 4 · AI-Seat0 (AI) /
Quantum Reduction is attached to Aerial Doombot. / Turn 5 · AI-Seat1 (AI) / Draws
a card. / Plays Swamp."* (`var/caption/follow-caption-7.png`, frame 72 of the 72
arrived). At 600 ms a frame a caption is up for about as long as its frame
(PLAN.md's follow-up asks whether it should linger).

## 7. Hard rule 8 on the strip

`arena-caption.test.tsx` renders `<CaptionStrip/>` with `renderToStaticMarkup` at
**every cursor of every committed log — 16,303 renderings, 6,005 with a caption,
17,111 marked card names checked — and at each of 4,077 live snapshots**, against
`test/hidden-oracle.ts` (the story page's oracle, moved out of
`story-render.test.tsx` unchanged so both are held to one): no id concealed in
every frame of the log is marked with a name, every marked name is one that id
carries on a visible card, no deck card the log never shows appears anywhere in
the markup (the `title` tooltips included), no line is of a frame the cursor has
not applied, and no `undefined`, `[object Object]` or `(123)`.

**The negative control**: `disjoint.jsonl`'s card #79, the opponent's, concealed
in every frame, given `name: "Borough Backup"` (a card of `decks/pacho-shield.dck`
the log never shows) with its `hidden` flag dropped: at the frame of the
opponent's draw of it the strip prints *"Draws Borough Backup."*, and the by-ids
and the by-names checks both catch it (the second from the decks alone). With
`hidden: true` kept the name is nowhere on the strip: the clean line is *"Draws a
card."*.

## 8. The pictures

1600 × 1000, headless Chromium (SwiftShader), `tools/story-shot.mjs` for the
replays (it now also prints the strip's lines) and a scratch CDP driver for the
live seat and the follow:

| file | what |
|---|---|
| `var/caption/cast-g1-208.png` | g1@208, a cast: *Turn 14 · AI-Seat1 (AI)* · AI-Seat1's Soldier Token dies. · Scries 1: keeps it on top. (dimmed) · Casts **Aerial Doombot** ({U}, artifact creature 1/1). |
| `var/caption/attack-g1-342.png` | g1@342, an attack: *Turn 23 · AI-Seat0 (AI)* · the Flying Ant's trigger (dimmed) · Attacks with **Wasp, Shrinking Savior** (3/5), **Aerial Doombot** (4/4) and **Robot Token** (1/1). · Wasp's trigger · Puts **Thriving Heath** … into their hand. |
| `var/caption/death-g1-359.png` | g1@359, a death: … blocks (dimmed) · four damage lines · AI-Seat0's **Giant-Sized Flying Ant** dies. |
| `var/caption/turn-boundary-g1-198.png` | g1@198, two turns: *Turn 13 · AI-Seat0 (AI)* (blue, dimmed) · Plays Thriving Isle. · Casts Wasp … · *Turn 14 · AI-Seat1 (AI)* (orange) · Draws a card. |
| `var/caption/quiet-g1-210.png` | g1@210, the cleanup step: the strip hidden, the checkbox still ticked |
| `var/caption/live-seat-default-off.png` | a live seat at the coin toss: the checkbox unticked, no strip |
| `var/caption/live-seat-caption-on.png` | the same seat after `N` and eight Spaces: turn 3's draw under its marker, the opponent's turn 2 above |
| `var/caption/follow-caption-7.png` | a spectated game being recorded, followed at frame 72 |

The `.json` beside each replay picture is `story-shot.mjs`'s report, the strip's
lines among it.

## 9. Tests and build

**`web/test/caption.test.ts`** (`node --test`, 8): §2's sweep against the apart
reading; the story page's highlighted moment; hidden before the first snapshot,
on a quiet frame and after a new game's `hello_ok`; `LiveFrameLog`'s rule; §5's
parity; the stored choice; the rectangle held to the stylesheet with every corpus
caption under its cap; §3's coverage with its control. **`arena-caption.test.tsx`**
(vitest, 24): §7, the strip's shape, a line under its own turn's marker, the
control. **`keys.test.ts`** +2 (`N` in the arena, on a read-only board and on a
live board; the dispatcher sends nothing), **`liveness.test.ts`** +1 (§1) and the
widget table's `CaptionStrip` row, **`story.test.ts`** (the caption module in the
route and boundary scans), `story-render.test.tsx` (the oracle moved to
`hidden-oracle.ts`, unchanged).

`npm --prefix web test` standalone: **1,110 `node --test` (1,101 pass, 0 fail, 9
skipped) and 148 vitest in 9 files** (`24ba603`: 1,099 — 1,090 pass, 9 skipped —
and 124 in 8).
`npm --prefix web run build`: §1's table.

## 10. The gate

Twice from a deleted `bridge/out` at `GATE_JOBS=4`, both **`check-all OK`**, 48
jobs, the lane adding no step and no job (its tests are in the web step):

| run | `WSPORT` | wall | jobs' seconds summed | load average (1 min) | log |
|---|---|---|---|---|---|
| 1 | 9250 | **276.1 s** | 1,053.6 s | 4.5 at the start, 17.4 at most | `var/check-all-caption-p1.log`, `var/check-all/20260929-080359-3400004/` |
| 2 | 9260 | **267.5 s** | 1,017.7 s | 14.2 at the start and at most, 11.1 at the end | `var/check-all-caption-p2.log`, `var/check-all/20260929-080846-3544020/` |

Inside the gate the web step read **1,125 `node --test` (1,114 pass, 0 fail, 11
skipped) and 148 vitest in 9 files** both times; `arena-caption.test.tsx` its
16,303 cursors and 4,077 live snapshots, `caption.test.ts` its live parity at
4,075 of 4,077 (7.5 s for that sweep on the loaded gate, 2.0 s standalone). The
relief's three Python-step tests were skipped, as the gate says when
`MTG_TABLE_LIKENESS` is not exported.

## 11. The user's Forge install

`/home/justin-a/forge`'s jar (sha256
`3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`), the top of
`/home/justin-a/forge` (names, sizes, mtimes) and every file of
`/home/justin-a/.forge` (7 files: sha1, sizes and mtimes) were fingerprinted before
this branch's first command and after the second gate run: **unchanged** (`diff` of the two fingerprints: empty).

## 12. The rebase onto `2c7ed8e` (more villain identity and the sound cues)

`main` gained two lanes after `24ba603`: more villain identity (three villain
recordings, so the corpus is 23 logs where it was 20; D230–D233) and the sound
cues (a `sound` cue param, `scene/audio.ts`, the `M` row and a **sound** checkbox
in the cue strip; D250–D252). `git rebase 2c7ed8e` conflicted in ten files, each
resolved keeping both behaviours, `main`'s first in the docs:

- **`web/src/keys.ts`**: both rows kept, `toggleSound` (`M`) then `toggleCaption`
  (`N`, still after `alwaysNo`, so `bindingFor` stays Forge's) — **27 rows**, and
  every document that said 26 says 27 (`web/CLAUDE.md` M4 convention 4,
  `web/src/arena/CLAUDE.md` slice 2's convention 5, README's *Keys*).
- **`web/src/arena/Arena.tsx`**: the sound's stored choice beside the caption's,
  both toggles in the key handler's dependencies, and `<CueControls>` carrying
  **sound** and then **caption** after *on twos*.
- `DECISIONS.md`, `PLAN.md`, `README.md`, `web/CLAUDE.md`,
  `web/src/arena/CLAUDE.md`, `docs/claude-md-rules.txt` (regenerated, with
  `CLAUDE_MD_RULES_WRITE=1`), `gate-history.md` and `test-count-history.md`:
  `main`'s entries first, this lane's after. PLAN.md's index was recounted from
  its rows — 327 items across 35 lists — and two stale rows and two stale
  paragraphs more villain identity's rebase had left were removed (PLAN.md's
  index paragraph says which).

**The cue strip's row, re-measured** (headless Chromium over CDP, `g1.jsonl` at
frame 330 and then played for 8 s, the strips' DOM rectangles sampled every
40 ms; *the row* is the strips' container less its padding and the 15rem kept for
the opponent's plate). The sound checkbox widens the cue strip to **790 px idle**
and **882 px at most while cues play** (*"12 steps · 4155 ms"*); the switcher is
230 px with its labels collapsed and 672 px with them.

| viewport | the row | labels | idle | while cues play |
|---|---|---|---|---|
| 1280 × 800 | 1,021 px | collapsed | **two rows** (790 + 230 need 1,026) | two rows, 136 of 136 samples |
| 1600 × 1000 | 1,341 px | collapsed | **one row, 1,026 px** | **one row, 1,118 px at most**; 0 of 108 samples wrapped |
| 1800 × 1000, breakpoint 1800 | 1,540 px | shown | one row, 1,468 px | **two rows in 97 of 97 samples** |
| 1840 × 1000, breakpoint 1800 | 1,580 px | shown | one row | one row, 1,560 px; 0 of 95 |
| 1899 × 1000 | 1,640 px | collapsed | one row, 1,026 px | one row, 1,118 px; 0 of 95 |
| 1900 × 1000 | 1,641 px | shown | one row, 1,468 px | one row, 1,560 px; 0 of 94 |

So D256's breakpoint became **1900 px** (`@media (max-width: 1899px)`): at 1800 px
the labelled switcher wrapped whenever a batch played, and the labelled row needs
1,560 px, which a viewport of 1,820 px and up gives; 1900 leaves 80 px for a
longer status. At 1600 × 1000 the two strips keep one row, idle and playing. At
1280 × 800 they no longer keep one row even idle — 5 px over — which widens
PLAN.md's follow-up 3 (the branch's own 1280 figure, *964 of 1,040*, was taken
against 1280 − 240 px, not the measured row).

**The corpus sweeps, over 23 logs** (`node --test web/test/caption.test.ts`,
`vitest run test/arena-caption.test.tsx`), every assertion unchanged and green:

| | 20 logs (`24ba603`) | 23 logs (`2c7ed8e`) |
|---|---|---|
| cursors captioned / hidden | 6,005 / 10,298 | **6,449 / 11,308** |
| captions spanning two turns or more | 2,522 | **2,667** (at most 3 markers) |
| a caption ends on `#story`'s highlighted moment | 5,920 cursors | **6,351** |
| live = replay | 4,075 of 4,077 snapshots | **5,520 of 5,522** (the same two sideboard answers) |
| the busiest caption | 208.0 px | 208.0 px, the cap |
| coverage: frames / things | 4,077 / 99,818 | **5,522 / 153,501** |
| under the strip at 1280 × 660 … 2560 × 1340 | nothing | **nothing** (hand, stack, battlefield, piles, duelists) |
| under it at 1024 × 700 | 255 battlefield (0.26%), 249 frames | **644 battlefield (0.42%), 608 frames** |
| the control (bottom centre), hand cards | 9,384–12,150 | **11,752–14,964**, in 5,517 of 5,522 frames (5,112 at 2560 × 1340) |
| hard rule 8 on the strip (vitest) | 16,303 cursors + 4,077 live snapshots, 24 tests | **17,757 cursors + 5,522 live snapshots, 27 tests** (6,449 captions, 18,577 marked names) |

The hidden-name sweep passes on each villain recording, replayed and live
(`arena-caption.test.tsx`'s per-fixture cases for `villain-doom-248`,
`villain-hulk-family-261`, `villain-masters-of-evil-33` and
`villain-wakanda-232`), and the story page's sweep over the same 23 logs reads
322 renderings and 27,251 marked names.

**Tests and build.** `npm --prefix web test` standalone: **1,184 `node --test`
(1,175 pass, 0 fail, 9 skipped) + 157 vitest in 9 files**, from `2c7ed8e`'s own
1,173 + 130 (8 files), measured in a scratch copy of that tree: this lane's 11
`node --test` cases and 27 vitest (24 and one per villain recording).
`node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK
(lint 31 rules, its self-test 60 firing cases, the five self-tests). `npm --prefix
web run build`, gzip: the 2D entry `index-*.js` 94.68 kB, `Arena-*.js` 18.61 kB,
`caption-*.js` 0.97 kB, `page-*.js` 11.68 kB, `Story-*.js` 4.24 kB,
`arena-scene-*.js` 393.36 kB, the stylesheet 19.59 kB.

**The pictures**, 1600 × 1000, headless Chromium (SwiftShader), under
`var/caption/merge/`:

| file | what |
|---|---|
| `strips-1600x1000.png`, `strips-1600x1000-strip.png` | `g1`@342: the cue strip with **sound** (unticked, the default) and **caption** (ticked) and the collapsed camera switcher on one row, 1,026 px of 1,341; the second file is the row alone at 1.5× (the measuring driver's JSON beside them) |
| `villain-masters-of-evil-33-291.png` | `villain-masters-of-evil-33`@291, a block and a death on a villain table: *Turn 19 · AI-Seat1 (AI)* · Yellowjacket, Heartless Marauder (1/2) blocks Ant-Man's Air Force. (dimmed) · Ant-Man's Air Force deals 4 damage to **Yellowjacket, Heartless Marauder**. · **Yellowjacket, Heartless Marauder** deals 1 damage to **Ant-Man's Air Force**. · AI-Seat0's **Yellowjacket, Heartless Marauder** dies. — with both strips on one row (`tools/story-shot.mjs`; its report beside it) |

**The gate** on the rebased tree: twice from a deleted `bridge/out` at
`GATE_JOBS=4`, both **`check-all OK`**, 48 jobs, the lane still adding no step
and no job:

| run | `WSPORT` | wall | jobs' seconds summed | load average (1 min) | log |
|---|---|---|---|---|---|
| 1 | 9290 | **257.4 s** | 964.4 s | 1.08 at the start, 9.31 at most, 8.47 at the end | `var/check-all-caption-merge-p1.log`, `var/check-all/20260929-085024-3956383/` |
| 2 | 9300 | **258.7 s** | 970.2 s | 7.17 at the start, 9.42 at most, 6.37 at the end | `var/check-all-caption-merge-p2.log`, `var/check-all/20260929-085452-4030426/` |

Inside the gate the web step read **1,199 `node --test` (1,188 pass, 0 fail, 11
skipped) and 157 vitest in 9 files** both times. The documents' gate lines and
this section were written after the runs; no code, test or CLAUDE.md changed
after them.

**The user's Forge install**: `/home/justin-a/forge`'s jar (sha256
`3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`), every path,
size and mtime under `/home/justin-a/forge`, and every file of
`/home/justin-a/.forge` (7 files: sha1, sizes and mtimes) were fingerprinted
before the rebase's first command and after the second gate run: **unchanged**.
