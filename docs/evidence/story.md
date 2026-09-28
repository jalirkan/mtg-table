# The story page — the narrator in the browser, in step with the replay

`#story` tells the frame log the replay is playing as a story, beside the replay's
own cursor: a column of moments grouped by turn, the moment on screen highlighted,
the `--summary` table as a card at the head, the frame on screen with the cards it
names — and, while a spectated game is still being recorded, the story growing as
the recorder writes it. The narrator it runs is the CLI's own, moved into one pure
TypeScript module both readers share. Decisions **D124–D128** (written as
D150–D154 in the `story` branch's reserved range; renumbered at merge); PLAN.md
*The story page* has the status and follow-ups, CLAUDE.md *The story page — the
conventions D124–D128 added* the rules.

Built on 2026-09-28 in the worktree `/home/justin-a/code/mtg-table-t2r`, branch
`story`, from `main` at `4408283`. Every number below was measured there, and the
command that produced it is beside it.

```bash
npm --prefix web run dev                              # or: (cd web && ./node_modules/.bin/vite --port 5196 --strictPort)
#   /?replay=games/g1.jsonl#story                     # any replay; ☰ story in the replay bar
./scripts/spectate.sh --story                         # a spectated game, followed live
node tools/story-shot.mjs --url 'http://127.0.0.1:5196/?replay=games/g1.jsonl#story' \
    --frame 208 --wait 1500 --out var/story/story-g1.png
node --test web/test/story.test.ts                    # the pure half (from web/: node --test test/story.test.ts)
(cd web && ./node_modules/.bin/vitest run test/story-render.test.tsx)   # the markup half
```

---

## 1. One narrator: the CLI did not move by a byte (D124)

`tools/narrate.mjs` (1,574 lines) became a 143-line shell: the file read, the flags,
the `EPIPE` rule, and re-exports for `tools/narrate-selftest.mjs`. Everything
else — `faceOf`, the no-memory and latest-view rules, the client-log dedupe, the
text, `renderStory`, `renderSummary`, `toJson` — is `web/src/story/narrate.ts`,
erasable TypeScript with **no import at all**, which Node 24 imports by type
stripping (no build step, no experimental warning on this Node, `v24.20.0`).

**Byte identity, measured.** Before the move, the old CLI's output was saved for
every committed log (the 18 in `fixtures/games/` and
`fixtures/synthetic/sample-handwritten.jsonl`) in seven modes — the whole story,
`--summary`, `--seat`, `--json`, `--turn 0`, `--turn 1-3`, `--turn 5-9` —
capturing stdout, stderr and the exit code: **133 files**. After the move, the
same 133: `diff -r` **identical**. Eight error paths (no argument, `--help`, a
missing file, a malformed line, `--turn x`, an unknown flag, two files,
`--turn=2-3`) print the same text and exit with the same code from the old copy
(`var/story/narrate-old.mjs`) and the new CLI; `… --json | head -1` still exits 0.
A spectated recording with `hello_ok.match` and `yourProfile`
(`var/spectate/story-follow-7.jsonl`, §4) in five modes: identical.
`node tools/narrate-selftest.mjs`: **79 checks, 5 negative controls, both goldens
byte-identical** (0.5–0.6 s), unchanged.

**`frameIndex`.** Every fact now carries the index of the frame whose processing
produced it — the page's link from a moment to the replay cursor. `toJson` strips
it (`story.test.ts` asserts the key is absent and the other eight lead in their
old order). Over the corpus every fact's `frameIndex` is in range, non-decreasing
within a game, and — for every fact with a `seq` — the frame at that index is a
`state` carrying that `seq`.

**One pass, not an incremental narrator.** The narrator is now a closure that is
pushed each frame and asked once (`narrate()` does both). An incremental API was
built and checked first — fed frame by frame with `story()` asked every seventh
frame, it told the same story as the whole-file narration over all 19 logs — and
then dropped (D126): narration is cheap (next section), and an incremental
narrator needs its own rule for the client-log gap check, which judges gaps
against every seq the FILE holds.

## 2. Cheap enough to re-tell (D126)

`narrate()` over g1's 376 frames: **about 4 ms** in Node 24 on this machine
(3.6 ms in the first measurement; `story.test.ts` prints it every run and bounds
it at 250 ms so a loaded gate cannot flake). The other 18 logs: 0.1–3.7 ms. So the
page re-tells the whole held log whenever the frame count changes — at most twice a
second in follow mode — and the story of a log still being written is the CLI's
story of the same bytes.

**The hidden future is a prefix.** With what comes after the cursor hidden, the
page narrates `frames.slice(0, cursor)`. `story.test.ts` cuts every committed
bridge log at five places and asserts the prefix's facts are the full story's
facts before the cut, frame for frame: **90 cuts, all equal**. The page's parse
(`parseFrameLog`, the replay transport's) and the CLI's (`parseLog`) tell the same
story and the same summary over all 19 logs.

## 3. The page (D125)

`fixtures/games/g1.jsonl` at frame 208 of 376, 1600 × 1000, headless Chromium —
**`var/story/story-g1.png`**:

```bash
node tools/story-shot.mjs --url 'http://127.0.0.1:5196/?replay=games/g1.jsonl#story' \
    --frame 208 --wait 1500 --out var/story/story-g1.png
```

What was on it (the script reads the DOM, never a dev handle):

| | |
|---|---|
| replay bar | frame 208 / 376, `s2c state` |
| column | 150 moments in 26 sections (turns 1–25 and *Before the game*), 84 of them after the cursor and dimmed; 164 card names marked |
| on screen | *Turn 14 · main 2 · AI-Seat1's turn*; AI-Seat0 20 life · 2 in hand · 26 in library; AI-Seat1 20 life · 0 in hand · 28 in library; the moment *"Casts Aerial Doombot ({U}, artifact creature 1/1)."* and its card, *Illus. Michael MacRae* |
| summary card | *g1 · seed 42: AI-Seat0 (AI) vs AI-Seat1 (AI)*, whose view, *25 turns (13 rounds)*, *Game over after turn 25: AI-Seat0 wins. AI-Seat1's life fell to -1.*, the nine-row table — the CLI's `--summary`, row for row |

The moment on screen sits about a third of the way down the column (the page
scrolls it there when it leaves the middle band; `F` turns that off), the seat's
own turns are headed in blue and the other seat's in orange, and the step is in
the margin. The same page at 390 × 844 stacks the side over the column with no
horizontal scroll (`var/story/try-narrow.png`).

**The keys, driven through CDP's Input domain** (`--keys`): from frame 200, `→ → →`
lands on 208 (*Casts Aerial Doombot*: the turn-14 combat is two frames, each told
at once); from 100, `↓ ↓ ↑ End` lands on 376, *"AI-Seat1 takes 9 damage
(AI-Seat0's Aerial Doombot 4, Wasp, Shrinking Savior 3, Robot Token 1, AI-Seat0's
Soldier Token 1); life 8 → -1."*

**One cursor across the views** (`--click`):

| from | action | landed |
|---|---|---|
| `#story` at 316 | click `▣ arena` | `#arena`, the canvas drawn, replay bar at **316** |
| `#arena` at 250 | click `☰ story` | `#story` at **250**, on screen *"Draws Plains."* |
| `#story` at 316 | key `B` | the 2D board (`data-readonly`), replay bar at **316** |

## 4. Following a spectated game live (D125, D128)

```bash
./scripts/spectate.sh --no-serve --no-build --story --name story-follow-7 --seed 7 --pace 600
node tools/story-shot.mjs --url 'http://127.0.0.1:5196/?replay=spectate/story-follow-7.jsonl&follow=1#story' \
    --follow-for 15000 --wait 1000 --out var/story/story-follow-live.png
```

The recorder (Pacho SHIELD, Default, vs Doom Legion, Default, seat 0's eyes):
288 frames, 19 turns, **AI-Seat1 won**, 124.75 s of wall time of which 120.45 s
were the pace's 263 dwells; `tools/check-redaction.mjs` **PASS**, `hello_ok.match`
checked. `spectate.sh --no-serve --story` printed
`http://127.0.0.1:5173/?replay=spectate/story-follow-7.jsonl&follow=1#story`.

The page, opened about 20 s into the game and sampled once a second for 15 s:
the cursor tracked the frames that had arrived (56 → 88; at most **one** frame
arrived and not yet played, which the tail line says), the story grew from 17 to
25 moments, the bar's chip read **`● following · 0.6 s behind`**, the column's tail
**`● following — the story grows as the recorder writes it`**, and the summary card
**"The game is still being recorded."** — nothing after the cursor on the page
(the default while following), so no winner named early. Once the recorder had
written `over`, the same URL (`var/story/story-follow-finished.png`, `End`): 288 /
288, 115 moments in 20 sections, *"Game over after turn 19: AI-Seat1 wins.
AI-Seat0's life fell to -1."*, and the tail and chip *"recording finished — this is
a replay now"*.

## 5. Hard rule 8 on the page (D127)

`web/test/story-render.test.tsx` renders `<Story/>` with `renderToStaticMarkup`
over all 19 committed logs, at seven cursors each (0, 1, a quarter, half,
three quarters, the last frame and the end), dimmed and hidden: **266 renderings,
16,225 marked card names checked, 1.6 s**. Against an oracle written apart from
the narrator:

| check | holds |
|---|---|
| by ids | no id concealed in every appearance in the log is marked with a name |
| by backing | every marked `(data-card-id, data-card-name)` pair is a name that id carries on a visible card in the log |
| by names | no `decks/*.dck` card name the log never shows (nor an M44 deck name, nor a sideboard label) is anywhere in the markup, attributes and `alt` text included |
| hidden / dimmed | hidden: no moment of a frame at or after the cursor; dimmed: every fact drawn, exactly the later ones marked `ahead` |
| hygiene | no `undefined`, no `[object Object]`, no `(123)` engine id |

**The negative control**: a copy of `disjoint.jsonl` whose stub of card #79 — an
opponent's card concealed in every frame — carries `name: "Borough Backup"`, a
card of `decks/pacho-shield.dck` that the log never shows (the test asserts
both), with its `hidden` flag dropped, rendered at the frame of the opponent's
draw of it: the page prints *"Draws Borough Backup"* and the by-ids and the
by-names checks **both** reject it — the by-names check from `decks/*.dck` alone,
with nothing added to its forbidden list (the branch's first version handed it
the injected string, so that half could not miss; the verification pass's minor,
fixed at merge). With `hidden: true` kept, the name is nowhere on the page, and
with `faceOf`'s `hidden === true` guard taken out of `narrate.ts` the control
fails on exactly that half (*"expected … not to contain 'Borough Backup'"*, 1
failed, 21 passed) — measured at merge and put back.

The card image is M4 convention 2's third exemption (CLAUDE.md, checked by
`story.test.ts`): one `imageUrl(` and one `lookupArt(` on the page, looked up by
the name a fact carries, face-up refs only (`namedCardsOf`), over a text frame of
the name so a slow or failed image is still the card.

## 6. Tests and build

**`web/test/story.test.ts`** (`node --test`, 39): the goldens from the module; the
CLI defines no narration of its own; `--json` without `frameIndex`; per fixture,
every fact on its own frame and the outline holding each once (19); the page's
parse tells the CLI's story; 90 prefix cuts; the narration bound; the cursor's
landmarks, turn placement, the view over g1, `segmentText`, `namedCardsOf`; the
keymap (one row per action, fields keep their keys, a focused moment keeps Space,
one `Record` and no `case` on a key name); the route; and the page's boundaries by
source scan — `main.tsx` reaches `story/` only through `lazy()` and nothing else in
`web/src` imports it; no transport, nothing from `render/`, `arena/`, `cards/` or
`workshop/`, no CSS; no `fetch`, socket, timer, `localStorage` or dynamic import;
`narrate.ts` imports nothing and names no host (`node:`, DOM, clock, `process`),
and has no enum or namespace; `spectate.sh --story` opens `#story`; the card-image
exemption. **`web/test/story-render.test.tsx`** (vitest, 22): §5, plus follow
mode's tail and "still being recorded". `hooks-order.test.ts` scans
`web/src/story/` (37 files, 112 components).

`npm --prefix web test` standalone: **932 `node --test` pass, 0 fail, and 120
vitest in 8 files** (`narrate(g1)` printed 6.3 ms a telling in that run) — spectating's `main` was 893 + 98 (7 files). `npm --prefix web
run build`: the 2D entry chunk is **90.27 kB gzip** (89.49 on `main`, +0.78: the
story's chrome in `main.tsx` and the shared `useReplayLoad`), **no `three`,
fiber or drei** among its 47 sources; the page is its own lazy chunk,
`Story-*.js`, **43.64 kB (15.45 kB gzip)** — `keys.ts`, `narrate.ts`, `page.ts`
and `Story.tsx`, nothing else; the stylesheet 18.73 kB gzip (17.92 on `main`).
`web/src/arena/` is untouched (`git diff --stat -- web/src/arena` is empty).

## 7. The gate

`rm -rf bridge/out && WSPORT=8741 ./tools/check-all.sh`, teed to
**`var/check-all-story.log`**: **969 s, exit 0, `check-all OK`**, at a load
average of about 3–6. Step 6 `wire-drift: SAME`; 6b `SAME GAME`; 9c's fourteen
games **374 s**, 14/14 `over`, zero UNIMPL; 10g three games over one socket,
`undo=ok`, `repeats=4 promptsWhileOnTop=0`; **12d 106 checks in 1.0 s** — the
narrator's selftest, now importing `web/src/story/narrate.ts` through the CLI,
over the 19 committed logs and the run's own 18. The web step inside the gate:
**942 `node --test`, 934 pass, 0 fail, 8 skipped, and 120 vitest in 8 files**
(`MTGTABLE_WS_LOGS` naming step 10's logs), `story-render` 266 renderings and
16,225 marked names in 1.8 s; the build's entry chunk 90.27 kB gzip, `Story-*.js`
15.45 kB gzip. This branch added no gate step: the page's tests are in the web
step and the narrator's in 12d.

**The first run failed, and not on this branch's code.** `WSPORT=8740`, also from
a deleted `bridge/out`: 765 s, **exit 1 at step 10g**
(`var/check-all-story-run1.log`). The three-game session's first game ended with
an error `notice` and a null `over`: the automated client's `act: undo`, sent
while the engine was paying a Thallid's `{G}`, raced the game thread, and
`MagicStack.clearUndoStack` threw `ArrayIndexOutOfBoundsException: Array index
out of range: 0` inside `PhaseHandler.mainGameLoop` — an engine crash, which D115
turns into a failed run (`var/check-all-story-run1-ws-3g.log` has the stack,
`var/check-all-story-run1-ws-auto-3g.jsonl` the client's log). M6's evidence
(`m6-engine.md` §4.3) saw the same race throw out of `undoLastAction()` itself,
where the act path caught it; this time the corrupted undo stack surfaced on the
game thread. `bridge/` is untouched by this branch; the second run passed with
`undo=ok`. PLAN.md's story follow-up 9 records it for the bridge's desk.

## 8. The user's Forge install

`/home/justin-a/forge` (22,128 paths, the jar's sha256
`3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`) and
`/home/justin-a/.forge` (27 paths, 7 files, every file's sha1) were fingerprinted
— paths, sizes and mtimes of both trees — before this branch's first command and
after the second gate run: **unchanged** (`var/story/*-before.txt` and
`*-after.txt`).
