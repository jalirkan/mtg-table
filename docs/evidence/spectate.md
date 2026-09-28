# Spectating — watch two AIs play your deck (evidence)

**2026-09-28**, branch `spectate` (a worktree cut from `main`'s `a092d3a`).
Protocol amendment **M47**; decisions **D118–D122**; PLAN.md's *Spectating* has
the status and the follow-ups. Everything below was run on this desktop — Ubuntu,
OpenJDK 21 JRE, Forge 2.0.14, a GTX 1080 — while other worktrees were running
their own gates (load average 4–11), which matters for two of the numbers.

The user's ask: *"I'd also like to watch AIs vs each other with my deck vs
different decks so I can see how they play it. With the animations, some of it
should become more intuitive and just generally more visually stimulating."*

---

## A. What a user types

```bash
./scripts/spectate.sh                                   # your deck vs config.json's match.aiDeck, followed in the arena
./scripts/spectate.sh --seed 7                          # a game you can watch again
./scripts/spectate.sh --seed 7 --seat 1                 # the same game from the other chair
./scripts/spectate.sh --ai-deck decks/morph-probe.dck --profile Cautious --ai-profile Reckless
./scripts/spectate.sh --no-follow                       # record first (~7 s), then replay it
./scripts/spectate.sh --no-open --seed 7                # serve, print the URL, no browser
./scripts/spectate.sh --no-serve --no-follow --seed 7   # record + redaction check, print the URL, exit
node tools/same-game.mjs a.jsonl b.jsonl                # are two recordings of one seed the same game?
```

`--no-open --seed 7` printed, and the page it named followed the game:

```
seat 0: Pacho SHIELD (Marvel Super Heroes)  [decks/pacho-shield.dck]  -- Default
seat 1: Doom Legion (Marvel Super Heroes villains)  [decks/doom-legion.dck]  -- Default
seed:   7
seen from: seat 0 (Pacho SHIELD (Marvel Super Heroes)'s chair -- the other hand stays hidden)
follow: yes -- the engine is paced at 600 ms a frame (150 ms for a bare phase change)
file:   var/spectate/pacho-shield-vs-doom-legion-7.jsonl
...
== following -- http://127.0.0.1:5187/?replay=spectate/pacho-shield-vs-doom-legion-7.jsonl&follow=1#arena
...
== the recorder finished (exit 0)
frames         = 285 state + 2 other = 287 (plus 1 session header line)
player turns   = 19 (round 10)
winner         = AI-Seat1, reason = AllOpponentsLost
game wall time = 125274 ms
paced dwell    = 263 dwell(s), 120000 ms asleep (--pace 600)
RECORD OK
PASS  var/spectate/pacho-shield-vs-doom-legion-7.jsonl
      hello_ok.match checked on 1 of 1 hello_ok frame(s) (exact key sets; aiDeck held to {name, cards};
      cross-checked against the session header; yourProfile on an AI viewer, M47)
still serving the page -- Ctrl-C when you are done watching
```

(`--web-port 5187` was passed as well — this worktree's assigned port.)
`node tools/check-redaction.mjs var/spectate/pacho-shield-vs-doom-legion-7.jsonl`,
run by hand afterwards: **PASS**, 287 frames, 6,931 cards checked, 709 redacted
(every one of them the other seat's hand), 2,685,464 bytes. A bad argument costs a
second: `--seat 2` and `--ai-profile Bogus` are refused before anything builds
(`--ai-profile Bogus is not one of: Cautious Default Experimental Reckless`).

## B. How long a game takes to record

| run | seed | pace | game wall time (paced: dwells included) | whole process | frames |
|---|---|---|---|---|---|
| `RecordMatch`, pacho vs doom, Default/Default | 7 | none | 3,412 ms · 3,328 ms · 3,160 ms (seat 1) | 6.8 s · 6.0 s · 5.7 s | 287 |
| `spectate.sh --no-serve --no-follow` | 7 | none | 2,286 ms | **7.95 s** (with check-forge and the redaction check) | 287 |
| `RecordMatch`, pacho vs doom, Default/Default | 11 | none | 3,730 ms | 7.2 s | 315 |
| gate 6b, seat 1, Default/Reckless | 5 | none | 1,687 ms | — | 170 |
| gate 6b, seat 0, Default/Reckless | 5 | 25 ms | 3,939 ms, 151 dwells, 2,464 ms asleep | — | 170 |
| `RecordMatch --pace 600` | 7 | 600 ms | **122,888 ms**, 263 dwells, 120,000 ms asleep | 126.3 s | 287 |
| `spectate.sh` follow mode | 7 | 600 ms | 125,274 ms, 263 dwells, 120,000 ms asleep | — | 287 |

**Unpaced, a whole AI-vs-AI game is 1.7–3.7 s of engine time** (M1 measured
1.4–3.5 s for the mirror, `m1-record.md`). That is why `--pace` exists (**D120**):
there is nothing to follow at engine speed. At 600 ms the 263 dwells split into
179 frames where something happened (600 ms each) and 84 bare phase changes
(150 ms each) — 179 × 600 + 84 × 150 = 120,000 exactly — so the game takes about
two minutes; a uniform 600 ms would have been nearly three. The paced file is
2,680,298 bytes against the unpaced 2,678,563: the same frames, with longer `t`
values and the header's `paceMs`.

## C. Redaction

- Every spectate recording is checked by the script as soon as it is finished
  (`tools/check-redaction.mjs`), and every recording behind this document was
  checked too: all **PASS** — seed 5 from both chairs (gate 6b, one paced), seed 7
  from seat 0 (twice unpaced, once at 600 ms, once through `spectate.sh`) and seat
  1 (unpaced; and a 40 ms-paced Reckless game), seed 11 from both chairs.
- **The M47 controls**: `tools/make-negative-fixtures.mjs` now writes
  `m47-spectated-present.jsonl` (the control: `yourProfile` on an AI viewer and a
  paced header, which must pass) and three one-defect probes — `yourProfile` on a
  viewer `players[]` marks human, `yourProfile` as a path, `paceMs: "fast"` — and
  `tools/check-redaction-selftest.mjs` requires all four by name. The regenerated
  corpus is byte-identical to the committed one apart from the four new files and
  the manifest. Self-test: OK, 24 files.
- **A finding, not a leak** (PLAN.md's spectating follow-up 3): comparing the two
  chairs of seed 11, the stack text *Hour of Defeat (42) - Destroy Agent Phil
  Coulson (30). AI-Seat1 surveils (1).* is `""` from seat 1 — the seat that cast
  it — and whole from seat 0. `Snap.sweepText` reads `(1)` as a card id, and card
  1 is in seat 0's hand, concealed from seat 1. Over-concealment of the caster's
  own text; the gate's rule (a string naming a concealed id is swept) is doing
  exactly what it says.

## D. One seed, one game — and the two things that are not the game

**Two unpaced runs of seed 7 from seat 0** (`d7-a1`, `d7-a2`): byte-identical
after normalising `t`, `startedAt` and `gameId` (gate step 6's normaliser), and
`tools/fixture-multiset-diff.mjs` says `MULTISET IDENTICAL: 288 frame(s)`.

**Paced and unpaced** (seed 7, 600 ms against none): `fixture-multiset-diff.mjs`
differs in exactly one line — the session header, which carries `paceMs` — and all
287 frames are identical, the `stats` id order included. `tools/same-game.mjs`:
`SAME GAME`, framing identical.

**Seat 0 and seat 1 of one seed** — the claim `--seat 1` makes. The multiset diff
cannot see it (every frame differs: each chair's hand is full in its own log and
stubs in the other's), so `tools/same-game.mjs` compares everything both chairs
can see, frame by frame, and says what it set aside:

```
same-game: var/spectate-probe/d7-a1.jsonl (seat 0, 287 frames)
       vs  var/spectate-probe/d7-seat1.jsonl (seat 1, 287 frames)
  set aside as viewer-dependent: 3848 hand card(s), 0 revealed library card(s), 0 face-down face(s),
  86 engine string(s); 1218 stats event(s) compared as id sets
  1276 events and 264 phase-boundary states equal; outcome {"winner":1,"reason":"AllOpponentsLost","matchOver":true}
  framing: identical -- every one of the 287 frames equal
SAME GAME
```

Seed 11 (315 frames, 3,576 hand cards set aside) and seed 5 — gate step 6b's pair,
one PACED from seat 0 and one unpaced from seat 1 (686 events, 152 phase
boundaries) — say the same. A raw structural diff of seed 11's two chairs found
differences in exactly four places: hand-card bodies (1,788 per field), `t`,
`gameId`, and one stack text plus one `cast` text (§C). **One seed is one game,
from either chair.** Its negative controls: a copy with one life total changed is
`NOT THE SAME GAME` (gate 6b), and two seeds differ at the handshake.

**What does move: the ORDER of the ids inside a `stats` event.** The first cut of
this branch made gate step 6 fail. Its fresh seed-42 recording differed from
`fixtures/games/g1.jsonl` in 90 lines, and every difference was two ids swapped
inside a `stats` event's `cardIds` — the same ids, the same frames, the same game.
Measured:

| build | seed-42 recordings byte-identical to `g1` (normalised) |
|---|---|
| `main` (`a092d3a`), compiled into a scratch directory | **15 of 15** |
| this branch before the gate change | **3 of 14** (1 of 5 as first written, 2 of 4 with `quiet()` guarded, 0 of 5 alternated run for run with `main`) |
| bisect V1: `main` + this branch's `Bootstrap.java` | 3 of 3 |
| bisect V3: this branch without its new pre-boot main-thread code | 3 of 3 |
| bisect V4: … with the profile validation before `installGui` only | 2 of 3 |
| bisect V5: … with the new summary `println`s only | 0 of 3 |

Sorting the ids of every `stats` event made every recording still on disk
identical to `g1` — nine of them, from both builds and the bisect — and the only
exception seen at all was the one reframed run below. The order is a hash-set iteration inside Forge over objects hashed by
IDENTITY — `GameEntity.hashCode()` is the card id, so the set is keyed by something
else — and HotSpot's identity hash codes come from a per-thread sequence, so work
done on the main thread before `FModel.initialize` (new string-concatenation call
sites to link, a lambda) moves which object gets which hash. It is not the game and
not the wire: protocol §3.6 gives `cardIds` no order. So gate step 6 now sorts
those ids in both files and still compares the set (**D121**); the new summary
lines stay. Guarding `SpectatorGui.quiet()` behind `--pace` (so an unpaced run
executes no new code on the game thread) is kept as a discipline; V3 showed it was
not the cause.

**And, rarely, a frame boundary.** One of the 41 seed-42 recordings above (the
third of the first batch) had 378 lines instead of 377: turn 20's combat-damage
batch was cut in two — `damage ×4, zone, stats` | `stats, phase` — where every
other run wrote it as one frame. `GameEventForwarder` flushes on a 500 ms wall
clock as well as on size and on the recorder's phase boundaries, and on a loaded
desktop the game thread paused long enough once. Same events, same game; it is why
`tools/same-game.mjs` judges by events and phase-boundary states and reports the
framing separately, and why protocol §8.7 still promises no identical bytes.

## E. Follow mode without a browser

`web/test/spectate.test.ts`, 13 cases, inside `npm --prefix web test`:

- **the route** (`web/src/spectate/devRoute.ts`): complete lines only — a
  half-written line is held back until its `\n` arrives; `?from=` continues exactly
  where `X-Log-Next` said; an empty 200 when nothing is new; 404 before the file
  exists; 416 when it shrank; a 4 MiB cap that still cuts at a line, and a line
  longer than the cap still delivered; one segment, `.jsonl`, no traversal in any
  encoding (`..%2F`, `%2e%2e%2f`, `sub%2F`); other paths handed on;
- **Node-only and dev-only**: no module under `web/src/` imports the route,
  `vite.config.ts` mounts it in `configureServer` and not `configurePreviewServer`,
  and the fixtures middleware (which is in preview) knows nothing of it;
- **the poller over a file that GROWS under a real loopback HTTP server**: waiting
  (404) → the transport created when the header arrives → a half-written line not
  parsed → every appended frame in file order → `over` ends polling; the frames
  read in pieces equal the file read at once; a recorder that goes quiet is
  `stalled` and still polled, and comes back to `following`; a re-recorded file
  (416) is an error that stops following;
- **the recorder's clock** (node's mock timers): live frames play at `t + 600`, a
  late one on arrival and the next back on its slot; a slow first poll snaps to the
  live schedule; a burst 3 ms apart is spread by the 50 ms floor and caught up; a
  late join folds its stale frames and plays from the edge, the backlog kept for
  the scrubber; a follower paused before PLAY does not jump, and a 12 s think is
  capped at 5 s; after a pause the recorder's pace resumes from the cursor and 2×
  catches up to live; once the log has ended the transport is an ordinary replay at
  400 ms / speed.

Plus `reduce-match.test.ts` (two M47 cases: `seatMatchOf` gives an AI viewer its
`yourProfile`; `matchupOf` orders the viewer first and sets `aiOnly`),
`arena-hud.test.tsx` (the watching line from a spectated handshake — both decks,
both profiles, *seen from here*, *● following*, no `.dck`, no Concede; a bare g1
still says who plays by seat name; a human seat's recording has no watching line
and keeps its Concede) and a `liveness.test.ts` clause (no arena module fetches,
polls or opens a socket; `Arena.tsx` declares `follow` as a plain prop; the
watching line reads `matchupOf(state.hello)` and no zone, card or board).

## F. Follow mode in a browser, and its lag

A scratch driver (headless Chromium over CDP, modelled on `tools/arena-bench.mjs`,
ANGLE on the GTX 1080, 1600 × 1000; not committed) opened
`/?replay=spectate/pacho-shield-vs-doom-legion-7.jsonl&follow=1#arena` one second
after `./scripts/spectate.sh --no-open --seed 7 --web-port 5187` started, and
every three seconds read `window.__mtgFollow` (the dev-only handle), the replay
transport's own lag measurement — **frame written (`t`) → frame played** — the
arena's watching line and the app bar, with screenshots on the way. Four runs,
because the first three found the pacing wrong:

| run | pacing | what the lag did |
|---|---|---|
| 1 | each frame its recorder gap after the last frame PLAYED | followed from 9 s after launch; lag p50 0.28 s at the start, **0.6 s by the end** — the floor between frames and late timers added up and nothing took them back |
| 2 | each frame from one anchor set at the first frame | **0.83 s from the first frame to the last**: the anchor kept whatever the first poll's latency was (the driver's CDP session then stopped answering; not investigated) |
| 3 | the same, the page loaded late | **stuck at 2.2 s**: the first poll came 2.2 s after the first frame, and every later frame was in hand before its anchored time, so nothing ever caught it up (Chromium's GL process died at 55 s) |
| 4 | **the committed one**: live, each frame at `t + 600 ms`; within 1 s of that, snap to it; a JOINING page more than 1 s behind folds to the live edge | the page took **36 s** to load (load average ~10 while other gates ran), JOINED at frame 81 of 118 with one fold, and then followed to the end at **p50 600 ms, p95 638 ms, max 1,222 ms** over 213 played frames; arrival lag (written → polled) p50 365 ms over 193 polls |

What the page showed in run 4 (and 1): the bar's chip *● following · 0.6 s
behind*, *frame 137 / 137+ (still recording)*; in the decision strip's place
*WATCHING Pacho SHIELD (Marvel Super Heroes) (Default) · seen from here vs Doom
Legion (Marvel Super Heroes villains) (Default) · ● following*; both plates with
`AI (Default)` and their deck; no Concede; spectator mode ✓ on its own; the table
view with Pacho's hand face up at the bottom and Doom Legion's as backs; figures,
lands and cue flashes animating. At 600 ms the cue strip reported *7 steps · 1958
ms* queued in a busy turn — the arena's own budget compresses it (PLAN follow-up
5). When the recorder wrote `over`: *recording finished — this is a replay now*,
the arena's *Defeat* over the table (the viewing seat lost — follow-up 2), *Game
over. Winner: AI-Seat1. AllOpponentsLost*, and the replay bar at *287 / 287*.

The measurement is on one machine's clock: the bridge's `System.currentTimeMillis`
and the page's `Date.now`, which is what the live schedule compares (**D120**).

## G. The gate, the build and the tests

**Step 6b** (spectating, new): 16.6 s standalone —

```
=== 6b. spectating: a paced AI-vs-AI recording, and the same seed from the other chair (M47) ===
  villain deck decks/doom-legion.dck
frames         = 168 state + 2 other = 170 (plus 1 session header line)
winner         = AI-Seat1, reason = AllOpponentsLost
game wall time = 3939 ms
paced dwell    = 151 dwell(s), 2464 ms asleep (--pace 25)
PASS  var/spectate/check-all-spectate-paced.jsonl
...
PASS  var/spectate/check-all-spectate-seat1.jsonl
OK: both handshakes name the decks and each seat its own profile; paceMs=25
  686 events and 152 phase-boundary states equal; outcome {"winner":1,"reason":"AllOpponentsLost","matchOver":true}
  framing: identical -- every one of the 170 frames equal
SAME GAME
OK: same-game.mjs rejects the one-life-point mutant (its negative control)
```

**The whole gate**, `rm -rf bridge/out && WSPORT=8690 ./tools/check-all.sh`
(`var/check-all-spectate.log`), with no `SKIP_*`: **`check-all OK`, exit 0, 951 s**
(00:38:00 → 00:53:51), at a load average of 6–13 while other worktrees ran their
own gates. Step 6 compared the fresh seed-42 recording with `g1` — `OK: 377
normalised lines identical` — with the `stats` ids sorted (**D121**); 6b took the
same shape as above (seat 0 paced: 4,002 ms engine time, 151 dwells; seat 1: 1,775
ms; `SAME GAME`; the mutant rejected); 9c 14 / 14; the redaction self-test 24
controls; 9b's advisory multiset diff reported its usual timing noise (six extra
`input {prompt:"Waiting for Forge AI..."}` re-pushes and two `buttonCancel` acts,
every one of the 233 `state` frames identical). Inside the gate `node --test` was
**896 / 888 pass / 0 fail / 8 skipped** (`MTGTABLE_WS_LOGS` naming step 10's four
logs) and vitest **95 (6 files)**.

**Web**: `npm --prefix web test` standalone is **886 `node --test` (886 pass, 0
fail) + 95 vitest (6 files)** — `main` was 870 + 94; this branch added
`spectate.test.ts` (13), two `reduce-match` cases, one `liveness` clause and one
`arena-hud` case. `npm run build`: the 2D entry chunk is **89.49 kB gzip, no
`three`** (87.67 on `main`: `replay.ts`'s follow mode, `matchupOf`, the bar's chip);
the poller is its own lazy chunk (`follow-*.js`, 1.72 kB gzip), fetched only by a
page with `&follow=1`; the dev route is in no chunk at all.

## H. The user's Forge install

`/home/justin-a/forge` and `/home/justin-a/.forge` were fingerprinted before the
first command of this branch and after the gate — `sha1sum` of every file (21,374)
and `find -printf '%p %s %T@ %y'` of every entry (22,155: path, size, mtime,
type). **Both identical.** Every JVM here reads `forge-home/res`, the symlink into
the install, and writes only under `var/`.

## I. The rebase onto more villains (2026-09-28)

The branch was rebased onto more villains' `90b97bb` (on the hardening pass's
`4d26637`, on `main`'s `aead79d`) in the `mtg-table-t2o` worktree, and renumbered on
the way: D109–D113 became **D118–D122**, amendment M45 became **M47**, and the
negative fixtures `m45-*` became `m47-*` (`node tools/make-negative-fixtures.mjs`
regenerates them byte for byte under the new names). Seven files conflicted —
CLAUDE.md, DECISIONS.md, PLAN.md, `docs/protocol.md`, `RecordMatch.java`,
`tools/check-all.sh`, `web/test/arena-hud.test.tsx` — and every one kept both
sides (PLAN.md's *Spectating*, *The rebase*, lists them).

**Step 6 met D113.** The hardening pass had replaced the byte diff this branch
taught to sort `stats` ids with `tools/wire-drift.mjs`, whose event-stream question
compares every event as JSON, in order. The sort moved into wire-drift's own
normalisation (both modes), and its selftest gained a case each way:

```
wire-drift-selftest: 20 cases, every verdict as expected -- 2 accepted by both (the identical copy
and D121's reordered stats ids), 5 re-partitions accepted by default and rejected by --strict,
13 drifts rejected by both
```

With the sort taken out (a scratch copy of the tool), the reversed-ids case is
`DIFFERENT`. And the gate's own fresh seed-42 recording, compared with that
unsorted copy, differs from `g1` in the event stream at event #1026 — a `stats`
event's id order — while the tool as committed says `SAME`, and byte for byte too
once sorted: the move is what kept step 6 green on this tree.

**The gate**, `rm -rf bridge/out && WSPORT=8730 ./tools/check-all.sh`
(`var/check-all-spectate-train.log`), no `SKIP_*`: **`check-all OK`, exit 0,
916 s**, at a load average of 3–5. 6b: seat 0 paced, 151 dwells, 4,023 ms of
game wall time — the recorder's `game wall time` line, which includes the 2,464 ms
it slept in those dwells, so about 1.6 s of engine time (corrected by polish-1:
this line said "4,023 ms of engine time"); seat 1 unpaced, 1,630 ms; `SAME GAME` (686 events and 152
phase-boundary states equal, 498 `stats` events compared as id sets, every one of
the 170 frames equal); the mutant rejected. 9c 14 / 14 (the fourteen games
370 s). 12b: the catalog is what `decks/`, `fixtures/games/` and `cues.json` make;
12c: the crash check's twenty assertions. Inside the gate `node --test` was
**903 / 895 pass / 0 fail / 8 skipped** and vitest **98 (7 files)**.

**Web**, standalone: **893 `node --test` + 98 vitest (7 files)** — more villains'
877 + 97 plus this branch's 16 and 1. `node tools/fetch-art.ts` and
`node tools/build-workshop-catalog.ts` were re-run after the rebase and changed
nothing: this branch adds no deck, no committed recording and no `cues.json` row.

**The user's Forge install**: the `~/forge` jar's sha256 (`3c0a7c38…8e5dd9`), the
path, size and mtime of every file under `~/forge` and `~/.forge`, and the entry
count (22,155) were taken before the rebase and after the gate. **Identical.**
