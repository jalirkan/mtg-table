## The 2026-09-27 hardening pass — seven small defects, each at its cause

The small-defect backlog from PLAN.md's follow-up lists, worked in the worktree
`/home/justin-a/code/mtg-table-t2j` on branch `hardening`, from `main` at
`bf0392b`. Match setup's `a092d3a` landed on `main` while this was open, and the
branch was rebased onto it the same night (§8). The pass is numbered after it:
decisions **D113–D115**, protocol amendments **M45–M46**.

Each item has four parts:

- **the reproduction** — the defect made to happen first, deterministically
  where the original was intermittent;
- **the cause**, read from the code or from Forge's bytecode (`javap -c` on the
  2.0.14 jar);
- **the fix**;
- **a test or gate assertion that fails without it**, with that failure actually
  run.

Everything here was run on the user's desktop (16 cores, OpenJDK 21 JRE, Forge
2.0.14) at a load average of 2–9 from other worktrees, except where a run says it
loaded the machine on purpose.

| # | Item | Fixed | Proved by |
|---|---|---|---|
| 1 | Gate step 6 exits 141 silently, and its byte diff fails an identical game under load (slice 4 follow-up 13(b)) | yes, **D113** | 3 loaded re-recordings; 11-case selftest in the step |
| 2 | 10g's restarted game ends at once (13(c)) | yes, **D114** / **M45** | a test hook that forces the window; the unfixed bridge fails, the client exits 8 |
| 3 | `MtgTable` exits 0 when the engine crashes before turn 1 | yes, **D115** / **M46** | `tools/check-engine-crash.sh`: 9 assertions fail on the old bridge, 20 pass on the new |
| 4 | The T-pose flash is hidden, not fixed (slice 4 follow-up 8) | yes | `web/test/clip-lane.test.tsx` fails without the line |
| 5 | `visibleShare` ignores the player plates (slice 4 follow-up 3) | modelled; no number moved — and on the rebase, the plate held inside the band (§8) | `camera.test.ts`, with a negative control |
| 6 | `catalog.json` drift is not a gate step (workshop follow-up 17) | yes, step **12b** | a fake `cues.json` row fails it |
| 7 | `@gltf-transform/cli` on a caret (slice 4 follow-up 9) | pinned | `npm ci` + `npm ls`; the rebuild itself was NOT run |

---

### 1. Gate step 6 — silent under load, and strict where it cannot be

**The two defects.**

- **Exit 141.** Step 6 was `diff a b | head -20 >&2` inside
  `if ! diff -q …; then … die …; fi`, under `set -euo pipefail`. When the diff
  runs past 20 lines, `head` closes the pipe, `diff` takes SIGPIPE, and the
  pipeline's status is 141. `set -e` ends the script there, before `die` prints
  a word. The old logic was replayed on a real loaded recording (`r3` below): a
  770-line diff, exit **141**, no `check-all FAILED` line.
- **Byte-strict on a partition.** The step compared the normalised files byte
  for byte. The documented failures were one extra `state` frame at a load
  average of 42–73.

**The reproduction.** Seed 42 was re-recorded with `RecordMatch` while the load
was confined to one core, so no other worktree was disturbed. Both the JVM and N
busy loops were pinned there: `taskset -c 15 ./bridge/run.sh mtgtable.RecordMatch …`
beside N × `taskset -c 15 node -e 'for(;;){}'`.

| run | load | wall | lines (g1: 377) | byte diff | 9b multiset (only g1 / only fresh) | distinct card objects (182) | the four invariants |
|---|---|---|---|---|---|---|---|
| r0 | none | 7 s | 377 | **identical** | 0 / 0 | 182 | hold |
| r2 | 2 loops | 33 s | 383 | differs | 7 / 13 | 178 (4 moved) | **hold** |
| r1 | 4 loops | 55 s | 387 | differs | 13 / 23 | 182 | **hold** |
| r3 | 8 loops | 104 s | 395 | differs | 26 / 44 | 180 (10 moved) | **hold** |

**The cause.** A recording's `state` frames are flushes: `GameEventForwarder`
flushes at 500 ms, at 50 events, and on the recorder's phase boundaries, and a
batch posted off the game thread is deferred to the next game-thread flush. So
WHERE the event stream is cut depends on timing. Under load the same game comes
back cut differently, and events migrate across frame boundaries — not only
across phases:

- a `stats` event g1 put in `COMBAT_BEGIN`'s frame lands at the end of `MAIN1`'s;
- a `tap` of an attacker moves from `DECLARE_BLOCKERS` to `DECLARE_ATTACKERS`;
- the mulligan's first `zone` event moves from turn 1's `UNTAP` frame to turn
  0's.

The intermediate boards differ with them: one snapshot has an attacker tapped
and the other does not.

**Why not 9b's multiset**, which the task offered: it fails the same three runs.
A re-partitioned batch is a *different* frame, not a reordered one. Even the set
of distinct card objects moves, so that is not a stable question either.

**What IS invariant**, in all four runs and by construction:

1. **every non-state frame**, `seq` aside (the session header, `hello_ok`,
   `over`);
2. **the event stream**, concatenated in frame order (**1,651 events**);
3. **the phase walk**, (turn, phase, active player) with repeats collapsed
   (**322 steps**);
4. **the final `state`**, events aside.

`tools/wire-drift.mjs` asks those four. It prints a `same` or `DIFFER` line for
each, with the first difference, and never pipes through `head`. `--strict` is
the old byte-for-byte comparison. `check-all.sh` step 6 runs it and takes
`STRICT_G1=1` for the strict mode.

**The negative controls.** `tools/wire-drift-selftest.mjs` runs first in step 6.
It builds eleven one-edit copies of g1:

| case | default | `--strict` |
|---|---|---|
| identical copy | accepts | accepts |
| a batch split into two frames | accepts | rejects |
| an event moved to the next frame | accepts | rejects |
| a phase flushed twice (an extra empty frame — the documented failure) | accepts | rejects |
| one event dropped | **rejects** | rejects |
| one `zone` event's destination changed | **rejects** | rejects |
| phase names lowercased | **rejects** | rejects |
| `power` as a number on the final board | **rejects** | rejects |
| `over` names the other winner | **rejects** | rejects |
| `hello_ok` gains an unsupported card | **rejects** | rejects |
| no `state` frames | **rejects** | rejects |

All eleven give the expected verdict, in about 3 s. This is **D113**, with its
known cost (intermediate boards are no longer compared) and the rejected
alternatives.

---

### 2. The restarted game that ends at once (10g)

**The documented symptom.** Once in two gate runs at a load average of 15–32, the
server logged `NEW GAME REQUESTED mode=restart` before its own
`WAITING for act: newGame`. Game 3 then began and ended at once
(`OVER WITHOUT A gameOver STATE`), with a four-frame log.

**The cause — not the wait.** `MtgTable.awaitNextGame` only watches a counter
(`gamesStarted >= n`), so an act applied before the wait is armed is simply
seen as "already started". The log-line order is a symptom of a fast client,
not the defect. The defect is in what Forge does after the outcome, read from
the 2.0.14 jar:

- `forge.game.Match.startGame`: after `GameAction.startGame` returns it calls
  `executeOwnershipChanges`, `clearCaches`, **fires `GameEventGameFinished`**,
  and then `System.gc()`.
- `forge.gui.control.FControlGameEventHandler.visit(GameEventGameFinished)` sets
  `gameFinished` and `invokeInEdtLater(processEvents)`. `processEvents`
  (`FControlGameEventHandler$1`) ends with `showPromptMessage(pv, "")`,
  `updateButtons(pv, "", "", false, false, false)` and
  **`matchController.finishGame()`**, on our `WireGuiGame`.
- Our `over` goes out at the OUTCOME (amendment M4), before all of that.

A client that answers `over` at once can therefore get `newGame` onto the EDT
first. `restartMatch()` runs inline, `openView(n+1)` resets
`overEmitted = false`, and then game n's queued `processEvents` runs:
`finishGame()` → `emitOver()` → game n+1's `over`, with no outcome and no
`gameOver` state. Game n's `showPromptMessage` / `updateButtons` also land in
game n+1's log as an empty `input`, and game n's old forwarder could flush into
game n+1's view on game n's thread (hard rule 3).

**The deterministic reproduction.** `WireGuiGame` gained a test hook,
`MTGTABLE_HOLD_GAME_END_MS`: the game thread sleeps that long after it has
emitted `over`, inside the outcome handler, so the window between the outcome
and `GameEventGameFinished` is open every time. The client is unchanged:
`tools/ws-auto-play.mjs` already sends `newGame` in the same handler that reads
`over`, so no `--newgame-immediately` flag was needed. The negative-control
build disabled the queue check (`if (false && !engineFinished)`):

| run | bridge | hold | games | result |
|---|---|---|---|---|
| `race-neg` | queue disabled | 1500 ms | 2 | game 2: `NEW GAME REQUESTED` with no wait, then `OVER WITHOUT A gameOver STATE`, a 65-line log with 11 states; server `games = 2 played of 2`, **exit 0** (the old client exited 0 too) |
| `race-neg2` | queue disabled | 2000 ms | 3 | game 2 ended the same way; server `2 played of 3`; **the client exited 8**: `over #2 arrived with no state carrying gameOver in front of it` |
| `race-pos` | fixed | 1500 ms | 3 | `NEW GAME QUEUED` → `NEW GAME RELEASED` → `NEW GAME REQUESTED` twice (continue, then restart); three full games, 830 / 1,140 / 920 lines, 115 / 153 / 127 states; no `OVER WITHOUT` |

In `race-neg` the server also printed `GAME FINISHED for game 1 while game 2 is
being played: ignored (D114)`. That line is the fix's own guard, keyed by game
number, refusing to release the wrong game.

**The fix (D114, M45).** `newGame` queues an act that arrives before Forge has
finished the game, keeping one and dropping a second. `FinishWatcher` releases
it. The watcher is registered LAST on game n's bus and keyed by n. It sees
`GameEventGameFinished` on game n's thread and queues the release on the EDT,
which puts it behind `processEvents`, because the EDT is one FIFO thread.

- The pre-input concede (M11) never reaches Forge's game-over, so a `newGame`
  after its `over` is applied at once, as before.
- `MtgTable.awaitNextGame` gives a queued act up to 10 s to run if its client
  has already gone.

**What now fails without the fix:**

- **Gate step 10g.** The server runs with `MTGTABLE_HOLD_GAME_END_MS=2000` and
  the step asserts: no `OVER WITHOUT A gameOver STATE`; queued = released ≥ 1;
  and a `"gameOver":{` state in every game's log.
- **`ws-auto-play`'s exit 8**, for any run.

---

### 3. An engine crash before turn 1 looked like a clean run

**The reproduction.** The engine-upgrade lane noted that a 2.0.15 card script
with an ApiType the 2.0.14 jar lacks makes zone preparation throw. That was
rebuilt in a scratch Forge home under `var/crash-probe/`, with:

- its own `config.json`, `userDir` and `cacheDir`;
- D14's overlay;
- a Depower script with `A:SP$ Empower`.

The committed `forge-home/custom-cards/` still holds exactly one file (hard rule
11). The game thread dies in `Match.prepareAllZones` →
`Card.fromPaperCard` → `CardFactory.getCard` with
`RuntimeException: crash in raw Ability, check card script of Depower` ← …
← `Element Empower not found in ApiType enum`. Nothing in Forge catches it:
`ThreadUtil.invokeInGameThread` is a plain `ExecutorService.execute`. The trace
is printed as `Game-0 > …` by the default handler already installed.

| | MtgTable `--transport null` | RecordMatch |
|---|---|---|
| before | no frame for 60,886 ms → `AUTO STUCK … conceding` → `CONCEDE BEFORE START` → `OVER WITHOUT A gameOver STATE` → **`MTGTABLE OK`, exit 0**, 65 s, `player turns = 0` | exit 1 (`the game thread threw`), but its log **stopped at `hello_ok`** (2 lines) |
| after | `ENGINE CRASHED on Game-0: <cause chain>`, error `notice` + null `over`, `engine crash = …` in the summary, **`MTGTABLE FAILED: … the engine crashed (D115)`, exit 1, 4 s** | the same two frames and the cause, exit 1, 3 s |

**The fix (D115, M46).**

- `EngineCrash` is the JVM's default uncaught-exception handler. It chains:
  every trace is still printed, first.
- A `Game-n` thread whose throwable carries a `forge.game.Match.startGame` frame
  reaches `WireGuiGame.engineCrashed`, which sends an error `notice` in our own
  words and a null `over`.
- `MtgTable` breaks its game loop and throws.
- `RecordMatch` writes the same two frames from its own catch and closes its log
  before exiting.
- The notice never carries the engine's message, which names the card, and the
  card could be the opponent's.

**The check.** `tools/check-engine-crash.sh` takes about 8 s and is not in the
gate. It asserts, for each main:

- exit 1, promptly;
- `ENGINE CRASHED` and the ApiType message on stderr;
- no stuck-watchdog concede;
- the log ends in `over`, with the error notice right before it;
- no `state` frame;
- the card's name not in the frame log;
- `MTGTABLE FAILED` / `RECORD FAILED`.

On the pre-fix bridge (`git archive HEAD bridge/src`, compiled into
`bridge/out`) **9 assertions fail**. On the fixed bridge all 20 pass.
`bridge/run.sh` now honours `MTG_TABLE_CONFIG` (Config.java already documented
it; run.sh's `-D` used to override it).

---

### 4. The T-pose flash (slice 4 follow-up 8)

`CueRunner.driveClips` now gives the action that is both the stance's rest and
the cue's transient weight 1. The early return used to leave it at the ramp
weight, and three's `PropertyMixer` fills the remainder with the clone's original
pose — the bind pose on a model with no `idle`.

The test is `web/test/clip-lane.test.tsx` (vitest, because `CueRunner.tsx` is
JSX). It builds a one-bone model whose only clip is `attack` (no `idle`), uses
a real `AnimationMixer`, and runs the attack envelope at weights 0.1–0.95.
Without the line the bone sits at y **0.920, 0.520, 0.240, 0.680, 0.960**
(w·0.2 + (1−w)·1) where the clip holds 0.2. With it, 0.2 every frame.

`driveClips` is now exported for the test. Nothing else in `CueRunner.tsx`
changed. The side effect: the cue's own fade no longer shows when the two lanes
are one action (PLAN.md hardening follow-up 4).

---

### 5. The seat plates in `visibleShare` (slice 4 follow-up 3)

`camera.ts` (still pure) now has:

- `PLAYER_PLATES` — the opponent's plate is top-right, 9.6 px in and 41.6 px
  down, 224 × 84.4; yours is bottom-right, 9.6 px in and 8 px up, 224 × 103.2
  with its name row wrapped;
- `underRect`;
- `visibleShareOnCanvas` — the band plus the plates on a canvas of real pixels.

The rectangles come from `styles.css` (`.arena__seats`, `.arena__seat` and the
row fonts) plus two rows measured in Chromium on `g1`@355, identical at
1600 × 1000 and 1024 × 768. `camera.test.ts` holds them to the stylesheet.

**No duelist share changed**, at any seat-safe view × aspect × canvas height (745
and 946 px). The follow-up's "y ≈ 180" was a WINDOW coordinate. The canvas
starts 52.7 px down, so the opponent's plate ends at canvas y **126.0**, inside
the 128-px `HUD_TOP_PX` band that was measured with that plate in it. The
verifier's helm sighting (1024 × 768, shoulder view) is real: 24 of 77 samples
are under the plate. All 24 are also under the band, so the share is 68% with
the band alone and 68% with band and plates.

- **Negative control:** with the band removed, the plate alone must hide exactly
  those 24. Removing `underRect` from the share fails it.
- **Printed, not asserted:** what a wrapped opponent name (a long `--ai-name`)
  would cost. The shoulder view falls 90 → 82% at 4:3 / 946 px.

---

### 6. The catalog drift check in the gate (workshop follow-up 17)

Step **12b** runs `node tools/build-workshop-catalog.ts --check`. It is byte for
byte, needs no `node_modules`, and so runs under `SKIP_WEB=1`. The mutation: a
`"Giant Growth": {}` row added to `cues.json`'s `cards` block made it exit **1**
(`catalog.json is stale — run node tools/build-workshop-catalog.ts`), and
restoring the file made it exit 0.

---

### 7. The `@gltf-transform/cli` pin (slice 4 follow-up 9)

`web/package.json` now pins the toolchain exactly:

- `"@gltf-transform/cli": "4.5.0"`;
- `overrides` for its nested `meshoptimizer` (`1.2.0`) and for
  `@gltf-transform/core`, `/extensions` and `/functions` (`4.5.0`), the three
  libraries `tools/build-figures.mjs` imports.

`npm install --package-lock-only` changed one line of the lockfile (the root
spec). `npm ci` then installed exactly the versions the lock always recorded,
which `npm ls` shows as `overridden`. `gltf-transform --version` is 4.5.0 and
the nested meshoptimizer is 1.2.0.

**Not proved: a byte-identical rebuild of `figures.glb`.** `build-figures.mjs`
refuses anything but the five verified source archives. None of them is on this
machine (no worktree has a `var/assets/figures/` at all), and downloading
~130 MB is the user's call (slice 4 follow-up 12). What stands instead: the
toolchain is the same bytes as the lock that built the committed file, and
`figures.test.ts` still holds `figures.glb` to the sha256 `models.json`
records.

---

### Tests and the gate

- `./bridge/build.sh`: 21 files, lint OK, the three self-tests pass (Json 38,
  Ask 106, GameLog 35 checks).
- `npm --prefix web test`: **863 `node --test` (863 pass, 0 fail)** + **94 vitest
  in 7 files**. It was 862 + 93 in 6 files before this pass.
- `npm --prefix web run build`: OK. The entry chunk is 87.39 kB gzip (87.40 at
  `bf0392b`) and `arena-scene` 347.97 (347.96).

**The gate**, from a deleted `bridge/out`:
`rm -rf bridge/out && WSPORT=8685 ./tools/check-all.sh`. The result was
**`check-all OK`, exit 0, 752.7 s** (12 m 33 s), at a load average of 2–8, in
`var/check-all-hardening.log`.

- **Step 6.** The selftest gave 11/11 expected verdicts. The comparison said
  `same` to all four questions and `byte for byte too: 377 normalised lines
  identical`: an unloaded run is still byte-identical, and the step says so.
- **9b.** Identical multiset.
- **9c.** 10/10 games reached `over` with zero UNIMPL. 9b and 9c took about
  303 s together.
- **9d.** The sideboard ask. AutoTransport's `newGame` was applied directly: its
  game was already finished, so it was not queued.
- **10g**, held at 2000 ms:
  - `NEW GAME QUEUED` → `NEW GAME RELEASED` → `NEW GAME REQUESTED` for the
    continue and then the restart;
  - no `OVER WITHOUT A gameOver STATE`;
  - three full games, `games 3/3`;
  - `autoYield key=y2 isAbility=true repeats=4 promptsWhileOnTop=0` (the same
    numbers as M6's measurement);
  - `OK: 2 early newGame act(s) queued behind Forge finishing the game and
    released`.
- **12b.** `catalog.json is current`.
- **Step 13.** **873 `node --test` tests, 865 pass, 0 fail, 8 skipped** (the
  ws-log suite skips the candidates `MTGTABLE_WS_LOGS` does not name) + **94
  vitest in 7 files**.

### The user's Forge install

`/home/justin-a/forge` (22,128 entries, listed with size and mtime) and
`/home/justin-a/.forge` (27 entries; sha1 of every file) were fingerprinted
before any work and again after the gate.

**Unchanged.** Every one of the 22,128 entries of `/home/justin-a/forge` has the
same size and mtime. All 7 files under `~/.forge` have the same sha1, and its 27
entries the same listing. The main checkout `/home/justin-a/code/mtg-table` was
not written (`git status` clean).

---

### 8. The rebase onto match setup (`a092d3a`)

`git rebase a092d3a` in the same worktree, one commit. `main` had gained match
setup: `hello_ok.match` (M44), `--ai-deck` / `--ai-profile`,
`Bootstrap.createAiPlayer`, the villain deck, gate step 9e and rows 11–14 of
`ten-games.sh`, `OverRaceSelfTest` as `build.sh`'s fourth self-test, and the
arena's seat plates printing the match.

**Conflicts.** Six files, all prose except two: `CLAUDE.md`, `DECISIONS.md`,
`PLAN.md`, `README.md`, `docs/protocol.md` and `tools/check-all.sh`'s usage
lines. Each was resolved keeping both sides:

- `DECISIONS.md`: match setup's D105–D108, then this pass's D113–D115. `main`
  stops at D108, so nothing was renumbered, and the count reads one hundred and
  eleven.
- `docs/protocol.md`: this pass's section (M45, M46) above match setup's (M44),
  because the list is newest first.
- The prose: both sub-step lists merged (9e and 12b), both web-test counts, and
  both gate histories.

**Merged without a conflict, and read for a semantic one.** `WireGuiGame.java`,
`MtgTable.java`, `RecordMatch.java` and `tools/ws-auto-play.mjs`. The post-`over`
path now carries both sides:

- **match setup's:** `emit`, `logC2s` and the ask path re-check `overEmitted`
  under the log's monitor, so once it is set only `over` is emitted. `emit`
  returns whether the frame went out, and `gameOverStateEmitted` is set only
  when it did.
- **this pass's:** the `newGame` that arrives before Forge has finished the game
  is queued, and released from that game's own `GameEventGameFinished`
  (`FinishWatcher`, subscribed last in `openView`, reset in the same place as
  `overEmitted`). The 10g hold runs after `captureOutcome` and only once
  `overEmitted` is set.
- **the crash path:** `engineCrashed` emits its error `notice` BEFORE
  `emitOver` sets the flag, so the notice is never one of the frames match
  setup's re-check drops. `tools/check-engine-crash.sh` proves the ordering on
  the merged bridge: the `notice` is the second-to-last frame of both logs.
- `ws-auto-play.mjs` has match setup's `hello_ok.match` check and this pass's
  exit 8 side by side, on different frames.

One cosmetic fix: in `RecordMatch.java` the crash method had been inserted
between `emitOver` and its javadoc. The javadoc is back on `emitOver`.

**The catalog.** `node tools/build-workshop-catalog.ts --check` said `current`
straight after the rebase. Match setup had regenerated `catalog.json` for
`decks/doom-legion.dck`, and this branch changes no deck, recording or
`cues.json` row. Nothing was regenerated.

#### 8.1 The engine-crash check joins the gate (step 12c)

Decided on review: it is lettered **12c**, after 12b, beside the other
self-checks. The step runs the script under `jvm` (the `GAME_TIMEOUT` cap). It
fails on a non-zero exit, and it also requires exactly twenty `ok` lines, so a
script that silently lost an assertion would fail too. On the rebased bridge it
takes **5.4 s** standalone: MtgTable exits 1 in 3 s and RecordMatch in 3 s, 20
of 20 assertions pass, and neither log carries the card's name. It needs no
`node_modules`, so it runs under `SKIP_WEB=1` and `SKIP_TEN=1`.

#### 8.2 The seat plate — truncated, and held inside the band

**What was decided on review.** Ellipsise a long `--ai-name` so the plate can
never leave the top band. Assert it in `camera.test.ts` rather than print it.

**What the rebase found first.** Match setup's own plate was already below the
band on every live game, whatever the name. Measured in Chromium on
`?replay=synthetic/sample-handwritten.jsonl#arena` (the corpus's one stream
with `hello_ok.match`), at 1600 × 1000, frame 4, before any change here:

| plate | rows | height | ends, canvas px |
|---|---|---|---|
| opponent, `Opponent` / `AI (Reckless)` / `Morph probe` | who, deck, life, zones, pips | 101.34 | **142.94** |
| yours, name row wrapped | who ×2, deck, life, zones, pips | 120.14 | (bottom-anchored) |

Two causes:

- the deck on a line of its own (+15.4 px and a 1.6 px gap);
- the profile in the name row's tags. `AI (Reckless) · active · priority` is
  198.7 px of a 206-px content box, so on the AI's own turn the name row wraps.
  In the same page that is 120.1 px, ending 161.7. `AI (Experimental) · active
  · priority` wraps the tags themselves: 134.1 px.

`camera.test.ts` puts numbers on what those plates hide. In the shoulder view at
745 px and 16:10, 60% (the deck line) and 44% (the AI's turn) of the
opponent's duelist are visible, against the duelist test's own 70%. At 946 px
it is 83% and 71%, against 90%. Four seat-safe cells fail for each.

**The fix.** A plate is four rows, and every row is one line:

- the name is ellipsised, with the whole name in its `title`;
- the tags never wrap, and on the opponent's plate the name row cannot wrap;
- match setup's deck name and profile ride the life row: the deck gives way
  first (`flex-shrink` 1000), then the profile;
- player counters ride the life row too, beside poison, instead of a row of
  their own.

Nothing is dropped. The same reader (`seatMatchOf`) prints the same two facts,
and main's `arena-hud` and liveness clauses pass unchanged. `PLAYER_PLATES` did
not move: 84.4 px for the opponent's plate and 103.2 for yours.

Measured after the fix, in the same page:

- **the natural frame:** the opponent's plate is 84.36 px, ending **125.95**;
  yours is 103.16.
- **the worst frame the page could be forced into**, by editing its DOM: a
  77-character name, `AI · active · priority`, a 67-character deck name,
  `AI (Experimental)`, poison and two player counters. It is still 84.36 px,
  ending 125.95. The deck is cut to nothing, the profile to 28.8 px, and nothing
  overflows the row.

**The tests.**

- **`camera.test.ts`** now asserts seven one-line rules in `styles.css`, and
  that the opponent's plate ends inside `HUD_TOP_PX` (126.0 ≤ 128). Removing
  `flex-wrap: nowrap` from the opponent's name row fails it, and so does
  removing `white-space: nowrap` from the name. Both were run.
- **The negative controls** replace the old printed block. Three plates must
  each end below the band and fail the duelist threshold in at least one
  seat-safe cell, and all three do, in 4 cells each: a wrapped name row (144.8
  px), match setup's deck line (143.0), and match setup's plate on the AI's
  turn (161.8).
- **`arena-hud.test.tsx`** has a new case. The worst frame it can build — the
  long name, the AI active and holding priority, poison, two counters and the
  match — renders four rows per plate: `who, vitals, zones, pool`. The deck,
  the profile and the counters sit inside the life row, and the whole name is
  in the `title`. With match setup's `DecisionLayer.tsx` put back, it fails:
  six rows.

#### 8.3 Tests, the build and the gate

- `./bridge/build.sh`: 22 files, lint OK, the four self-tests pass (Json 38, Ask
  106, GameLog 35, OverRace 11 checks).
- `npm --prefix web test`: **871 `node --test` (871 pass, 0 fail)** + **96
  vitest in 7 files**. Match setup's 870 + 94, plus this pass's one `camera`
  case, `clip-lane`, and the new `arena-hud` case.
- `npm --prefix web run build`: OK.
- **The gate**, from a deleted `bridge/out`:
  `rm -rf bridge/out && WSPORT=8685 ./tools/check-all.sh`, into
  `var/check-all-hardening-rebased.log`. The result was **`check-all OK`, exit
  0, 938.8 s** (15 m 39 s), at a load average of 5–10 from other worktrees. It
  is 186 s more than §"Tests and the gate"'s 752.7 s, and match setup's five
  games account for most of that: 9c is fourteen games now (379 s), and 9e is
  one.
  - **Step 3.** 22 files; the four self-tests, `OverRaceSelfTest` 11/11.
  - **Step 6.** The selftest gave 11/11 verdicts, and all four questions said
    `same`: 1,651 events, 322 phase steps, and 377 normalised lines, byte for
    byte too.
  - **9b.** Identical multiset.
  - **9c.** 14/14 `over`, zero UNIMPL, no preferences file touched.
  - **9d, 9e.** 9d's sideboard ask passed. 9e's `hello_ok.match` was equal
    field for field, `NoSuchProfile` was refused before `FModel.initialize`, and
    no preferences file changed.
  - **10a–10g.** Seven ws servers passed. In **10g**, held at 2000 ms, both
    early `newGame` acts were `QUEUED` and then `RELEASED` (2 and 2), with no
    `OVER WITHOUT A gameOver STATE`. It played `games 3/3`, and auto-yield
    measured `repeats=4 promptsWhileOnTop=0`. Every session summary in the run
    printed `late frames = 0`: match setup's re-check had nothing to drop.
  - **12b.** `catalog.json is current`.
  - **12c.** Both mains exited 1 in 2 s, with 20 of 20 assertions.
  - **Step 13.** **881 `node --test` tests: 873 pass, 0 fail, 8 skipped** (the
    ws-log candidates `MTGTABLE_WS_LOGS` does not name), plus **96 vitest in 7
    files**.

**The user's Forge install.** `/home/justin-a/forge` and
`/home/justin-a/.forge` were fingerprinted before the rebase and again after the
gate: 21,374 files and links with size and mtime, and a sha1 of each of the 7
files under `~/.forge`. **Unchanged**: both listings are identical, and so are
the sha1s. The main checkout `/home/justin-a/code/mtg-table` was not written
(`git status` clean). It had moved on to `aead79d` during the run — the
engine-upgrade lane landed on `main`, after `a092d3a` — so this branch is one
rebase behind `main` again.

