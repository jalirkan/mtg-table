## The 2026-09-27 hardening pass — seven small defects, each at its cause

The small-defect backlog from PLAN.md's follow-up lists, worked in the worktree
`/home/justin-a/code/mtg-table-t2j` on branch `hardening`, from `main` at
`bf0392b`. Match setup's `a092d3a` landed on `main` while this was open, and the
branch was rebased onto it the same night (§8). Its first verification round
found step 6 blind to the stack, and five smaller things; all six were fixed,
and the branch was rebased again onto engine and sets' `aead79d` (§9). The
decisions are **D113–D115**: they were written as D109–D111 and renumbered on
that second rebase, because the engine and sets' D109–D112 landed first. The
protocol amendments are **M45–M46**.

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
| 1 | Gate step 6 exits 141 silently, and its byte diff fails an identical game under load (slice 4 follow-up 13(b)) | yes, **D113** — and after round 1 it compares the stack, `priority` and mid-game combat too (§9.1) | 3 loaded re-recordings; 18-case selftest in the step |
| 2 | 10g's restarted game ends at once (13(c)) | yes, **D114** / **M45** | a test hook that forces the window; the unfixed bridge fails, the client exits 8 |
| 3 | `MtgTable` exits 0 when the engine crashes before turn 1 | yes, **D115** / **M46** | `tools/check-engine-crash.sh`: 9 assertions fail on the old bridge, 20 pass on the new |
| 4 | The T-pose flash is hidden, not fixed (slice 4 follow-up 8) | yes — by two actions per clip since round 1 (§9.2) | `web/test/clip-lane.test.tsx`, two cases, each failing without the fix |
| 5 | `visibleShare` ignores the player plates (slice 4 follow-up 3) | modelled; no number moved — and on the rebase, the plate held inside the band (§8) | `camera.test.ts`, with a negative control |
| 6 | `catalog.json` drift is not a gate step (workshop follow-up 17) | yes, step **12b** | a `cues.json` row for a non-creature deck card (Giant Growth) fails it |
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

**Superseded in part by §9.1.** That known cost was understated. None of the
four questions ever compared the stack, `priority` or mid-game combat, and the
first verification round showed four such drifts passing. Two more questions (the
boundary boards and the stack) and seven more selftest cases answer it.

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

**Superseded by §9.2.** The side effect was wider than stated. It covered every
attack and block cue on every model, and it was a jump at both ends of each. The
line is gone. The stance now holds on an action of its own (`restTwin`), so the
two lanes are never one action.

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

What that proves is narrower than "any new row": the catalog reads `cues.json`
only for `threeD`, so only a row that changes a card's `threeD` makes the
catalog stale — a non-creature card that is in a deck or is a token (a creature
is already `figure`, and a card in no deck is not in the catalog). The branch's
verifier added rows for `Ashcloud Phoenix` (a creature) and `Nonesuch Card` (in
no deck) and `--check` passed, correctly: `catalog.json` does not depend on
them.

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

- `DECISIONS.md`: match setup's D105–D108, then this pass's, at the time
  D109–D111. `main` stopped at D108, so nothing was renumbered then, and the
  count read one hundred and eleven. (§9.6 renumbered them D113–D115, and the
  count now reads one hundred and fifteen.)
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


---

### 9. The first verification round, and the rebase onto engine and sets (`aead79d`)

A verifier re-ran every claim above against the branch at `3e4acbd` and returned
**`passed: false`** on one major finding and five minor ones. All six are fixed
here, and none was skipped. The verifier's own measurements that this section
builds on are quoted as theirs.

#### 9.1 Step 6 never compared the stack (the major finding)

**The finding.** The verifier mutated a copy of g1 four ways, and the four
questions of §1 **accepted every one** (exit 0): the stack reversed top-first in
every frame; a stack-item key renamed in every frame; `priority` nulled in every
state but the last; combat's `blockerIds` renamed in every state but the last.
Step 6's own comment still said it caught "a stack ordered top-first".

**Why.** None of the four questions ever looks at a mid-game board. The final
board is the only board they compare, and g1's has an empty stack, empty
`stackCards` and no combat. A phase boundary never has a stack either, because a
step ends only once the stack is empty. So D113's "the band is narrow"
understated it: **the whole stack serialisation was outside the check**, and so
were `priority` and combat everywhere but the last frame.

**The fix: two more questions**, each invariant by construction and then
measured.

5. **Every boundary board.** A `state` whose last event is a `turn`, `phase` or
   `outcome` is compared whole (events aside), in order. `Snap.java` writes those
   three kinds only for `GameEventTurnBegan`, `GameEventTurnPhase` and
   `GameEventGameOutcome`, and `RecordMatch.BoundaryFlusher` flushes
   synchronously at each of them. Such a frame is therefore cut at an engine
   event, never by the clock or the 50-event threshold, and the game alone fixes
   its board. g1 has **347** of them. This question compares `priority`, the
   players, every public zone, and combat at the step boundaries: the attackers
   at the blockers step and the blockers at the damage step. Nine of g1's twelve
   frames with a blocker are boundary boards.
6. **The stack, by id-set.** For every set of stack ids that both files caught,
   `stack` and `stackCards` must be the same JSON, order included. The committed
   file's id-sets must also include at least one that the fresh file caught. A
   stack's order is its push order, so one set of items has one order.

**The obvious generalisation was tried first and flakes.** That generalisation
is "compare the boards at the same point in the event stream": key each frame by
its cumulative event count and compare the frames that share a key. On the same
loaded runs, **1 of the 370 shared keys differed in r1**. Key 16 is in the
mulligan, and one board has player 1's hand at 7 and the other at 6. The wire
drops the engine events `Snap` does not serialise, so one wire position can be
several engine positions. A boundary frame has no such ambiguity, because its
last event is the engine event it was cut at.

**Measured on §1's four re-recordings** (`var/exp/r0–r3.jsonl`), on two more
recorded with this round's bridge after the gate (`var/exp/r4-fix1`, `r5-fix1`:
`var/exp/loaded.sh`, the JVM and N busy loops pinned to core 15, as in §1), and
on the gate's own:

| run | load | boundary boards | stack id-sets both caught (of g1's 17 / the run's) | the three-item stack (turn 14) | id-sets with two serialisations | verdict |
|---|---|---|---|---|---|---|
| r0 | none | 347, same | 17 (17 / 17) | caught, same | 0 | SAME |
| r2 | 2 loops | 347, same | 17 (17 / 17) | caught, same | 0 | SAME |
| r1 | 4 loops | 347, same | 17 (17 / 18) | caught, same | 0 | SAME |
| r3 | 8 loops | 347, same | 14 (17 / 18) | caught, same | 0 | SAME |
| r4, this bridge | 4 loops, 47 s, 386 lines | 347, same | 17 (17 / 17) | caught, same | 0 | SAME (`--strict`: DIFFERENT) |
| r5, this bridge | 8 loops, 84 s, 395 lines | 347, same | 17 (17 / 19) | caught, same | 0 | SAME (`--strict`: DIFFERENT) |
| the gate's (§9.7) | idle core | 347, same | 17 (17 / 17) | caught, same | 0 | SAME, byte for byte too |

In all seven files, each stack id-set maps to exactly one serialisation, so "an
item does not change while it waits" held on this game. The check has a limit,
and the tool's header and D113 both state it: the stack's **order** is checked
only on an id-set of two or more items that both files caught. g1 has exactly
one such id-set, the three-item stack in turn 14's declare-attackers step. Every
loaded run caught it.

**The selftest** now has **18 cases**:

- 1 identical copy;
- **5 re-partitions** that the default must accept and `--strict` must reject.
  Two of them are new, and both move a stack snapshot: one merges a mid-phase
  frame that caught a one-item stack into the next frame, so the fresh file
  lacks that id-set; the other adds a frame that caught the three-item stack one
  item short, so it has an id-set g1 never caught;
- **12 drifts** that both modes must reject. Five of them are new.

Each new drift was also run against the **pre-fix** tool (`git show
HEAD:tools/wire-drift.mjs`):

| new drift | pre-fix default | now | caught by |
|---|---|---|---|
| the stack reversed (top-first) in every state | exit 0 | exit 1 | 6, the stack |
| a stack-item key renamed (`sourceCardId` → `sourceId`) in every state | exit 0 | exit 1 | 6, the stack |
| `priority` nulled in every state but the last | exit 0 | exit 1 | 5, boundary boards |
| combat's `blockerIds` renamed in every state but the last | exit 0 | exit 1 | 5, boundary boards |
| the stack never written (every `stack` and `stackCards` empty) | exit 0 | exit 1 | 6's guard (no committed id-set caught) |

`check-all.sh`'s step-6 comment and die message now name six questions. D113's
title, decision, rationale and *Known cost* were amended with a dated note
rather than silently. The *Known cost* now says what the first version
understated, and what the default still gives up. That is a board field that
differs only between two phase boundaries, is in no event and is not on the
stack. It also includes the stack-order limit above.

#### 9.2 The weight-1 line changed every attack and block cue (minor)

**The finding.** All 8 models in `models.json` have an `idle`, and every clone
starts at idle frame 0. So §4's line prevented no T-pose on any shipped model.
What it changed was every `attack.lunge`, `attack.jet` and `attack.aegis` cue on
an attacking figure, and every `block.interpose` on a blocking one. That covers
essentially every deck creature's attack and block. Those cues had been a blend
with idle frame 0 at `1 − weight`, and the line made them the raw clip at full
weight.

**Measured on the shipped models.** The measurement used the real
`figures.glb`, loaded in Node by `test/prop-raster.ts`'s `loadLibrary`. Each
figure was built by the arena's own `instantiateFigure` and a real mixer. For
each model and stance, `driveClips` ran the stance alone, then the cue's
envelope over 51 frames (attack.lunge's 850 ms at 60 fps), then the stance
again, applying `mixer.update(0)` after each frame. The number is the largest
joint displacement between two consecutive frames, **as a fraction of the
body's height**. It is taken at the cue's two ends (in / out), and compared with
the clip's own median step in the middle of the cue:

| model, stance | `main` (`aead79d`) | §4, weight 1 | a time ramp (tried) | **now, two actions** | the clip's own mid-cue step |
|---|---|---|---|---|---|
| agent (also scientist), attacking | 0.64 / 0.66 | 0.46 / 0.45 | 0.010 / 0.021 | **0.048 / 0.032** | 0.015 |
| hero, attacking | 0.61 / 0.63 | 0.42 / 0.41 | 0.010 / 0.021 | **0.045 / 0.031** | 0.014 |
| agent, blocking | 0.29 / 0.30 | 0.041 / 0.044 | 0.010 / 0.007 | **0.005 / 0.004** | 0.005 |
| any chibi, attacking | 0.22 / 0.22 | 0.21 / 0.24 | 0.15 / 0.25 | **0.026 / 0.020** | 0.034 |
| any chibi, blocking | 0.32 / 0.34 | 0 / 0 | 0 / 0 | **0 / 0** | 0 |
| drone, attacking (`attack`) | 0.61 / 0.62 | 0.58 / 0.62 | 0.59 / 0.75 | **0.087 / 0.062** | 0.043 |
| drone as Aerial Doombot (`attack` → `jet`) | 0.28 / 0.28 | 0.27 / 0.28 | — | **0.035 / 0.024** | 0.016 |
| insect, attacking | 0.021 / 0.022 | 0.018 / 0.014 | 0.005 / 0.001 | **0.002 / 0.001** | 0.001 |

`main`'s blend jumped toward idle frame 0 at both ends. §4's weight 1 removed
that blend, but it jumped from the stance's held frame to the clip's first frame
and back. The held frame is 45% into the clip for `attacking` and 60% for
`blocking`.

**First try: a time ramp.** The first fix kept one action and moved its time
from the held frame (weight 0) to the cue's own frame (weight 1). It worked on
the proportioned bodies, but not on the chibis or the drone (the "time ramp"
column). The drone's attack clip moves 0.35 body-heights per 2% of its length at
exactly the point where the attacking stance holds it. A ramp in time sweeps
through that motion.

**The fix: two actions.**

- `models.ts`'s **`restTwin(clip)`** is the same tracks under an
  `AnimationClip` of its own. A mixer keys its actions by clip, so the twin gets
  an action of its own. Twins are cached per source clip, so every figure of a
  model shares one, and no keyframe is copied.
- `FigureLayer` builds a second action map on the twins,
  **`FigureRig.restActions`**, at commit.
- `actionFor(…, 'rest')` reads that map, and `driveClips` holds the stance on it.

The stance and the cue are therefore always two actions, even on the same clip.
Their weights always sum to 1, and the cue crossfades off the held pose and back
exactly as it does over a different clip. The `rest === wanted` branch is gone.
The cost was measured in Node, as the median of 10 runs: 12 `agent` figures
build in **4.3 ms instead of 3.9 ms**. Nothing is added to the frame loop.

**The test.** `web/test/clip-lane.test.tsx` now has two cases. The first is
§4's, on a model with no `idle`. The second walks both `attacking` and
`blocking` from stance to cue to stance, on a clip whose bone height is its
time. It asserts the held frame at both ends, the cue's own frame at full weight,
and no step between frames above 0.05.

The negative controls were all run:

- with the two maps collapsed into one shared action, both cases fail: the
  bone reads y 0.28 … 0.24, not 0.2, and mid-cue reads 1.0, not 0.5;
- with §4's `CueRunner.tsx` or `main`'s, both cases fail on their identity
  assertions, because the rest lane is the transient's own action;
- with those assertions taken out, so that only the pose is judged, §4's fails
  the second case on a **0.44** jump at the cue's first frame (0.45 → 0.01). `main`'s
  fails both: the bind pose (y 0.92, 0.52, 0.24, 0.68, 0.96 against 0.2) and a
  0.49 jump (0.45 → 0.94).

**Not eyeballed in a browser.** The Claude browser pane fires no
`requestAnimationFrame` (M7's note), and a single screenshot cannot show a jump
between two frames. The table above is the arena's own code path (`driveClips`,
`instantiateFigure`, `restTwin` and three's mixer) on the shipped models, and it
is a number where a look would be an impression.

#### 9.3 `MTG_TABLE_CONFIG` could leak into the gate (minor)

- `check-all.sh` and `scripts/play.sh` now `unset MTG_TABLE_CONFIG` near the
  top, each with a comment saying why.
- `check-engine-crash.sh` still exports its own, so 12c is unaffected.
- `bridge/run.sh` now names any config that is not the repo's on stderr
  (`bridge/run.sh: config … (from MTG_TABLE_CONFIG), not …/config.json`), so a
  stray export shows in every log a run writes. The crash check's logs carry
  that line, which is correct.

#### 9.4 One number for the crash check (minor)

The five quotes (~10 s, ~8 s, about six seconds, ~6 s, about 5 s) are now **~8
s** everywhere: the script header, CLAUDE.md (the command list and the gate
paragraph), README (the command list and the gate paragraph), PLAN.md (twice)
and `check-all.sh`'s 12c comment. The timing note for §8's gate run now quotes
what that log shows, each main exiting 1 in 2 s. The script now prints its own
wall time on its last line. Standalone on this machine it took **6.4 s** at a
load average of about 9, and the verifier measured 8.5 s.

#### 9.5 The catalog claim, narrowed (minor)

§6 and PLAN.md now say "a `cues.json` row for a non-creature deck card (Giant
Growth)". The catalog reads `cues.json` only for `threeD`, so a row for a
creature (already `figure`) or for a card in no deck rightly changes nothing.
The verifier's `Ashcloud Phoenix` and `Nonesuch Card` rows showed exactly that.

#### 9.6 The rebase onto `aead79d`, and the renumbering

`main` moved to `aead79d` (engine and sets) while round 1 was running. Before
the rebase, `git merge-base --is-ancestor` confirmed the branch was one commit
on `a092d3a`, and it is now one commit on `aead79d` plus this round's commit.
`a092d3a` is still an ancestor, so the branch is a fast-forward of both.

**The decision numbers collided.** The engine-upgrade lane numbered its four
decisions D109–D112 and landed first. `main`'s DECISIONS.md carries an italic
note above D109 saying "whichever of the two lands second renumbers its own". So
this branch's **D109–D111 became D113–D115**.

The renumbering was done **before** the rebase, on the branch's own tree, where
every `D109`–`D111` was this branch's (92 lines in 16 files: the bridge
comments and strings, `check-all.sh`, the two tools, `ws-auto-play.mjs` and
every doc). No citation could be ambiguous. After the rebase, `main`'s note and
PLAN.md's *Engine and sets* line about the collision were updated to say it was
settled. D113's dated note records the renumbering. `docs/protocol.md`'s M45 and
M46 were not touched: `main` added no amendment.

**The conflicts** were prose only: CLAUDE.md (the gate's timing notes and the
docs table), DECISIONS.md (both blocks kept, `main`'s first), PLAN.md (both
status paragraphs and both sections) and README.md (the tree listing and two
table rows). The counts now read **one hundred and fifteen**. `main`'s side
changed no bridge or web source apart from `catalog.json`, which it regenerated
for `decks/fra-rw-aggro.dck`. `node tools/build-workshop-catalog.ts --check`
says **current** on the rebased tree.

#### 9.7 Tests, the build and the gate

- `./bridge/build.sh`: 22 files, lint OK, the four self-tests pass (Json 38, Ask
  106, GameLog 35, OverRace 11 checks).
- `npm --prefix web test`, standalone: **871 `node --test` (871 pass, 0 fail)**
  + **97 vitest in 7 files**. That is §8.3's 871 + 96 plus `clip-lane`'s second
  case. The `wire-drift` changes are tools, not tests.
- `npm --prefix web run build`: OK. The entry chunk is 87.67 kB gzip and
  `arena-scene` 348.07.
- **The gate**, from a deleted `bridge/out`:
  `rm -rf bridge/out && WSPORT=8685 ./tools/check-all.sh`, into
  `var/check-all-hardening-fix1.log`. The result was **`check-all OK`, exit 0,
  940.5 s** (15 m 41 s), at a load average of about 9–16 from other worktrees.
  - **Step 3.** 22 files, and the four self-tests.
  - **Step 6.** `wire-drift-selftest: 18 cases, every verdict as expected -- 1
    identical accepted by both, 5 re-partitions accepted by default and rejected
    by --strict, 12 drifts rejected by both`. The comparison said `same` to all
    six questions: 1,651 events, 322 phase steps, 347 boundary boards, and 17
    stack id-sets. It was byte for byte too, 377 normalised lines.
  - **9b** (advisory) reported a difference this time, and it was not in the
    snapshots. The two files had the same 233 `state` frames. The difference was
    3 more `buttonCancel` acts and 4 more `input` frames in the fresh file: the
    automated seat met more prompts. That is the seat's input timing under load,
    the class 9b's own header describes (M3 follow-up 7). `bridge/` changed no
    code in this round.
  - **9c.** 14/14 `over`, zero UNIMPL, every log through `check-redaction`, and
    no preferences file touched, in a total wall of 384 s.
  - **10g**, held at 2000 ms: `NEW GAME QUEUED` 2 and `NEW GAME RELEASED` 2, with
    no `OVER WITHOUT A gameOver STATE`. It played `games 3/3`, and auto-yield
    measured `repeats=4 promptsWhileOnTop=0`.
  - **12b.** `catalog.json is current`.
  - **12c.** MtgTable exited 1 in 2 s and RecordMatch in 3 s, 20 of 20
    assertions, `(6 s)` on the script's own new last line.
  - **Step 13.** **881 `node --test` tests: 873 pass, 0 fail, 8 skipped**, plus
    **97 vitest in 7 files**.
- **Changed after the gate started.**
  - Comments only: `driveClips`' docstring in `CueRunner.tsx` (before step 13
    ran, so the gate built and tested it) and `check-all.sh`'s header and 9b
    comments (after the gate; `bash -n` clean, and every non-comment line of
    `check-all.sh` was in place before the gate started).
  - The docs.

#### 9.8 The user's Forge install

`/home/justin-a/forge` (22,128 entries with size and mtime) and
`/home/justin-a/.forge` (27 entries, and a sha1 of each of its 7 files) were
fingerprinted before the rebase and again after the gate and the two loaded
recordings. **Unchanged**: every listing and every sha1 is identical. The main
checkout `/home/justin-a/code/mtg-table` was not written. It is still at
`aead79d` and `git status` is clean.
