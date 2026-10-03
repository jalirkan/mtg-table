## Polish 1 — the skeptics' nine minors (2026-09-28)

Worked in the worktree `/home/justin-a/code/mtg-table-t2u` on branch `polish-1`,
from `main` at `f6bad35`. Nine minors the skeptics of the undo race, the story
page, the narrator, spectating and gate speed left behind; each is fixed with a
test or a negative control that fails without the fix, except item 8, whose file
(`web/test/liveness.test.ts`) belongs to three visual lanes this week and is
written down for the merge pass instead. No wire change, no gate step, no new
decision. PLAN.md *Polish 1* has the status and the four follow-ups.

Run on the user's desktop (16 cores, OpenJDK 21 JRE, Forge 2.0.14, jar sha256
`3c0a7c38…8e5dd9`) beside other lanes' work, ports 8850–8869. The logs named
below are under the worktree's `var/` (gitignored); `var/polish-1/` holds every
control's output.

| # | Finding | Fix | Held by |
|---|---|---|---|
| 1 | `ActGuardSelfTest` held `whyNotNow`'s table, not which live read fed each condition | `ActGuard.facts(Feeds, gen)`; `engineFacts` is `facts(new GuardFeeds(c), gen)` | the self-test drives `facts` with a fake; 11 mis-wirings each fail it (§1) |
| 2 | 10g did not notice the client's `--require-late-undo` removed | 10g also greps the client's `undo(late)=ok` | flag removed → the new grep fails; hold removed → the server grep fails (§2) |
| 3 | N1 handed its injected name to check 3 as an extra forbidden name | N1 injects a real deck card, `Borough Backup`, and hands check 3 nothing | decks emptied → new N1 fails, old passed; hidden guard removed → N2 fails (§3) |
| 4 | the pair check was one-sided (narrator follow-up 9) | both ways, with the moments a client never had set aside by where they fell | N6: a dropped frame the client holds fails it; N5 now asserts the first half (§4) |
| 5 | a 416 read `stalled` with a live "● following" | status `lost`; `followWordOf` → `lost`; chip and `#story` say so; the arena gets no word | `spectate.test.ts` evaluates the function from `main.tsx`; removing its case fails (§5) |
| 6 | `same-game.mjs`'s header claimed a same-seat pair has nothing set aside | header corrected; per-log set-aside lines; a same-seat line | 6b asserts both (§6) |
| 7 | "4,023 ms of engine time" was game wall time with 2,464 ms of dwell | `spectate.md` and PLAN.md corrected | (§7) |
| 8 | spectating's liveness clause misses a recursive `setTimeout` poll | the exact clause, for the merge pass, in PLAN.md | proven offline over today's arena (§8) |
| 9 | `var/check-all/<run>/` never pruned (gate speed follow-up 4) | keep the last `GATE_KEEP_RUNS` (20) | the gate's first run pruned 26 of 42 seeded runs; an id-format drift exits 2 (§9) |

---

### 1. `ActGuard`'s wiring, under its self-test

Before: `WireGuiGame.engineFacts` read twelve live values into `ActGuard.Facts`,
and `ActGuardSelfTest` built `Facts` by hand — so `f.pendingAsks = 0`, or
`f.hopsInFlight = pool.pending()`, or a dropped `removeIf` passed every build.

After: `ActGuard.Feeds` is one method per read (`ready`, `inputSeen`, `closed`,
`overEmitted`, `pendingAsks`, `input`, `inputGen`, `activatingManaAbility(input)`,
`passPress`, `engineAsks`, `hopsInFlight`, `engineThreads`), `ActGuard.facts`
does all the combining (the `live` conjunction, `inputUp`, the generation, the
condition-6 mark's three comparisons, the pruning of terminated threads), and
`WireGuiGame.GuardFeeds` answers each method with one read. `ActGuard` stays free
of Forge types (the input is an `Object`; `InputPayMana` is asked back through
`activatingManaAbility`), and `PassPress` became `ActGuard.PassMark`.

`ActGuardSelfTest` gained `wiring()` over a `FakeFeeds`: all quiet applies; each
feed turned busy on its own refuses with its own condition's reason (the four
`live` feeds, pending 2, no input, generation 7 → 8, activating, the mark, one
hop, a running thread); a mark for another input, from generation 6, or from
before the engine asked, applies; the input and the generation are read once;
condition 5 is asked about the input condition 3 read; a parked thread applies,
a terminated one is pruned. **39 → 74 checks.** The GUI is installed first and
every thread is `runBackgroundTask`'s `mtg-table-bg` (hard rules 1–3).

**The negative control** (`var/polish-1/actguard-mutants.sh`, output
`actguard-mutants.log`): a scratch copy of `ActGuard.java`, one mis-wiring at a
time, compiled with the self-test into a scratch directory ahead of `bridge/out`:

| mis-wiring | self-test |
|---|---|
| 1 `live` fed `true` | exit 1, 8 failures |
| 1 `closed()` not read | exit 1, 2 |
| 2 `pendingAsks` fed 0 | exit 1, 2 |
| 3 `inputUp` fed `true` | exit 1, 2 |
| 4 `genNow` fed `genAtArrival` | exit 1, 3 |
| 5 `manaActivating` fed `false` | exit 1, 3 |
| 6 the mark never outstanding | exit 1, 2 |
| 6 the mark's generation not compared | exit 1, 1 |
| 7 hops fed condition 2's read | exit 1, 2 |
| 8 no thread ever running | exit 1, 2 |
| 8 terminated threads not pruned | exit 1, 1 |

11 of 11 rejected. End to end, `tools/undo-race-repro.sh` passed 13 of 13 on the
refactored bridge (guarded: refused, "no input is up"; guard off: the stack
written under the held thread) — `var/polish-1/undo-race-repro.log`. What the
self-test cannot drive is `GuardFeeds` itself (PLAN follow-up 3).

### 2. 10g holds both halves of the late undo

`ws-auto-play --comfort` sends the late undo whatever its flags, so without
`--require-late-undo` the server still refuses it and the server's `undo window`
grep stays green; the client, requiring nothing, prints no `undo(late)`. 10g now
also requires `undo(late)=ok` in the client's summary.

The controls — scratch copies of `tools/check-all.sh` with only the 10g job,
`GATE_JOBS=1`, `WSPORT=8865` (`var/polish-1/10g-control-{no-flag,no-hold}.log`):

- **`--require-late-undo` removed**: the server line passed (`OK: the late undo
  … was refused "Not now"`), and the step failed at the new grep —
  `10g: the client's summary does not say undo(late)=ok`. Every line of 10g
  before it passed, and the one after it (auto-yield's) would have: the
  client's summary says `repeats=4 promptsWhileOnTop=0`.
- **`MTGTABLE_HOLD_UNDO_WINDOW_MS=1000` removed**: the step failed at the
  server's grep (`the late undo was not refused inside the held undo window`) —
  while the client still printed `undo(late)=ok`, because the late undo was
  refused naturally. Each half needs its own grep.

Both gate runs printed `OK: the client's summary says undo(late)=ok` and
`undo window = 1 hold(s) … 1 refused, 0 applied`.

### 3. N1 finds the leak in `decks/*.dck` on its own

N1 now injects `Borough Backup` — a card of `decks/pacho-shield.dck` that
`disjoint.jsonl` never shows face up, asserted both ways — onto always-hidden
card #79's stub (seq 94), `hidden` dropped, and calls the checks with no extra
forbidden name (the fix `web/test/story-render.test.tsx` made for the page).
N2 does the same with `hidden: true` kept and prints every problem it finds.

- **`DECK_NAMES` emptied** (`narrate-no-deck-names.log`): the new selftest fails
  N1 twice (`not a card in decks/*.dck`, `check 3 … did NOT find, in decks/*.dck
  alone, a name the story prints`). `HEAD`'s selftest under the same edit
  (`narrate-head-no-deck-names.log`) **passed**, N1 "rejected" — the weakness.
- **`faceOf()`'s `hidden` guard removed from `web/src/story/narrate.ts`**
  (`narrate-no-hidden-guard.log`, restored after): N2 fails, and checks 2 (by
  ids), 4 (backing) and 3 (by names, from the decks alone — `output line 40
  prints "Borough Backup"`) all fire. N1, which drops the flag, is unaffected.

### 4. The pair check, both ways

A moment is `(kind, seq, card ids)`. A client story may tell no moment more often
than the bridge's own log of that game, and none less often unless the client
never had it: its frame's seq is not in the client file and lies before the
client's first snapshot (`before`), inside a gap its own story counts (`gap`), or
after the last frame it holds (`after`); or it is told from the seat's own frames
(a concede, a sideboard answer) and the client file holds no c2s frame at all
(`own` — `tools/ws-smoke.mjs --log` writes only what it received). Anything else
fails as a fact dropped silently.

- **N6**: in the synthesised client log, the turn-2+ `state` at seq 51 (a land or
  a cast in it) is preceded by a copy of itself with no events, so the real
  frame is skipped as a re-delivery. The pair check fails twice (`HOLDS frame 51
  … a fact dropped silently`); its one-sided half finds nothing — the old check.
- **N5** (the dedupe off) now also requires the first half to fire: 4 problems.
- The **cut-out** client log (frames around a land play removed) sets 2 moments
  aside as a counted gap and fails nothing.

**The rehearsal gate run** (`var/check-all-polish-1-p0-rehearsal.log`, 233.8 s)
failed at 12d on the first cut of this check: 10a, 10b and 10e's ws-smoke logs
hold no c2s frame, and the bridge's log tells the seat's `concede`. That is the
`own` rule, and in both gate runs those three pairs print `1 of its own acts in a
receive-only log`; the six ws-auto-play pairs print `every moment exactly as
often`.

### 5. A 416 is `lost`

`FollowStatus` gained `lost`, set by the 416 branch (polling stops for good);
`error` keeps its meaning (a failed poll, retried). `main.tsx`: `followWordOf`
maps `lost` → `lost` (and `error` still → `stalled`); `FollowChip`, the strip in
the app bar, renders *recording lost — …* with no dot, class `follow--lost`
(`--error`'s colour); `arenaFollowOf` hands the arena `null` for `lost`, since
`ArenaFollow` has three words and `web/src/arena/` is not this branch's, so the
watching line keeps the matchup and drops "● following". `#story`'s tail says
*recording lost — the file was re-recorded under the same name, so following
stopped; this is the game it had read*.

`web/test/spectate.test.ts` — the 416 test now waits for `lost`, then holds that
ten poll intervals bring no poll and no change of word; a new test evaluates
`followWordOf` and `arenaFollowOf` from `main.tsx`'s own source (each body is
plain JavaScript under a typed signature), requires a row for every status in
`follow.ts`'s `FollowStatus` union, and checks `FollowChip`'s `lost` case has no
dot. With the `lost` case taken out of `followWordOf` it fails
(`followWordOf('lost')`, `var/polish-1/follow-word-control.log`).
`story-render.test.tsx` renders the tail. `npm --prefix web test`: **933 + 120**.

### 6. `tools/same-game.mjs` says what it set aside

The header now says a same-seat pair goes through the same projection — the hand
as stubs, a revealed library as ids, face-down cards as stubs, engine strings
dropped — so it is no stricter than a cross-seat pair, and points at
`tools/wire-drift.mjs` for whole boards. The output prints one `set aside, never
compared` line per log and, for one seat's pair, `both logs are seat 0's: the
values above were set aside although both logs show them the same way`. 6b now
asserts the two lines on its paced/seat-1 pair (`1409 hand card(s) as stubs … 34
engine string(s) dropped`, each) and the same-seat line on the paced log against
itself.

### 7. The 4,023 ms

`docs/evidence/spectate.md` (the rebased gate run's paragraph, and the table's
column, now *game wall time (paced: dwells included)*) and PLAN.md's *Spectating*
said 4,023 ms "of engine time". It is the recorder's `game wall time` line, and
2,464 ms of it are the 151 dwells asleep (`paced dwell = 151 dwell(s), 2464 ms
asleep`), about 1.6 s the engine and the recorder.

### 8. The liveness clause, for the merge pass

`var/polish-1/liveness-poll-clause-proof.log`: the proposed predicate (PLAN.md
*Polish 1*, follow-up 1) over today's 52 arena files rejects no line; the four
probes — a recursive `setTimeout`, `window.setTimeout`, `globalThis.setTimeout (`
and a recursive `requestIdleCallback` — are each rejected, where the current
regex misses all four; and `DecisionLayer.tsx` with a recursive poll spliced in is
rejected, where the current regex passes it.

### 9. `var/check-all/` keeps 20 runs

`prune_runs`, as the gate starts: the run-id-named directories, sorted by name
(the id is `YYYYmmdd-HHMMSS-pid`, so name order is start order), all but the last
`GATE_KEEP_RUNS` removed, never the running one; anything else under
`var/check-all/` is left alone. Before the first gate run, 42 fake old runs
(`20200101-…`, `20200102-…`) and a `not-a-run/` directory were seeded:

```
p1: check-all: run 20260928-154843-3903315; keeping the last 20 runs under var/check-all/ (46 there, 26 pruned)
p2: check-all: run 20260928-155246-3929735; keeping the last 20 runs under var/check-all/ (21 there, 1 pruned)
```

After each: 20 runs plus `not-a-run/`. The guard: a run whose id does not match
the pattern exits 2 before any job (`prune-guard-control.log`: today's format
exit 0, `run-bad` exit 2), so a format change cannot silently stop the pruning.

### 10. The runs

Standalone, on the finished tree: `./bridge/build.sh` — lint, compile and five
self-tests (`ActGuardSelfTest: 74 check(s), 0 failure(s)`);
`tools/undo-race-repro.sh` 13 of 13; `node tools/narrate-selftest.mjs` 87
checks, 6 controls; `npm --prefix web test` **933 `node --test` + 120 vitest (8
files)** (`main`'s 932 + 120, plus the follow-word test); `npm --prefix web run
build` OK.

The gate, each from a deleted `bridge/out` at `GATE_JOBS=4`
(`var/check-all-polish-1-p{1,2}.log`; timing tables in `var/polish-1/p{1,2}-timing.txt`):

| run | WSPORT | wall | jobs' seconds | load (1 min) | exit |
|---|---|---|---|---|---|
| p1 | 8850 | **243.0 s** | 954.4 s | 1.6 → 9.5 max | 0 |
| p2 | 8860 | **264.8 s** | 1,004.5 s | 9.0 → 18.6 max | 0 |

In both: 10g 123.4 s / 122.4 s; 12d 114 checks in about a second; inside the
gate `node --test` **943 / 935 pass / 0 fail / 8 skipped** and vitest **120 (8
files)**.

`~/forge` and `~/.forge`: the jar's sha1, a sha1 over every `~/.forge` file (7),
over `~/forge`'s top-level files, the count of `~/forge` files newer than
`build.txt`, and an `ls -la` of both roots were taken before the first command
and after the last gate run — identical (`var/polish-1/forge-fingerprint.txt`);
the jar's sha256 is still `3c0a7c38…8e5dd9`.
