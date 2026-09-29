# The gate's timing history — moved out of CLAUDE.md

*Moved here verbatim on 2026-09-28 by the docs-block lane (branch `docs-block`, off
`102fb1f`), when `CLAUDE.md` kept one current paragraph about the gate and
nothing else about its past. Nothing below was re-measured or edited: every
number, date, commit and log name is as `CLAUDE.md` carried it on `102fb1f`.*

The `var/check-all-*.log` files named below were each lane's local gate logs.
`var/` is gitignored, so none of them is in the repository, and a checkout does
not have them; the numbers they recorded are what survives, here and in each
lane's own evidence file (`gate-speed.md` §10 is the parallel gate's). What the
gate is, what each step checks and how long it takes today are in the CLAUDE.md
files: the root's *The gate, in one paragraph* points at the rest.

## The timing sentence in the gate paragraph (after *Nothing is retried*)

At
`GATE_JOBS=4` it takes **about four minutes** from a deleted `bridge/out`
(242.3, 258.4 and 246.6 s back to back at merge, after the last edit to the
script, at a load average of 2.5–12; 151.2 s at `GATE_JOBS=8`; 906.9 s
serially — each beside another worktree's work, at the end of the history below
and in `docs/evidence/gate-speed.md` §10).

## The gate-timing history paragraph that followed the list of steps

Serially it exited
non-zero on the first failure and took **about eleven and a half minutes from a
deleted `bridge/out`** before match setup (682 s and 706 s on two clean M6 runs, then 711 s, 712 s and
711 s on three more after the verification fixes — the last is M6's
documentation pass, `var/check-all-m6-docs.log` at `WSPORT=8666`, which did not
delete `bridge/out` first and landed in the same band because `build.sh`
recompiles every source anyway; 10g's new deck plays faster and its new
assertion costs nothing; it was 8 m 52–57 s before M6 added 9d and 10g), of
which **9c's ten games are 265–269 s**. Tier 2's documentation pass ran it once
more, in the `tier2-slice1` worktree at `WSPORT=8661` without deleting
`bridge/out`: **727 s**, exit 0 (`var/check-all-t2-docs.log`), on a desktop that
was not idle; Tier 2 added no step. Slice 2's fix pass ran it from a deleted
`bridge/out` in the `tier2-slice2` worktree at `WSPORT=8662`: **731 s**, exit 0;
its second fix pass the same way at `WSPORT=8665`: **729 s**, exit 0
(`var/check-all-t2-fix2.log`); and its documentation pass at `WSPORT=8666`,
without deleting `bridge/out`: **727 s**, exit 0 (`var/check-all-t2s2-docs.log`).
Slice 2 added no step. Slice 3's fix pass ran it from a deleted `bridge/out` in
the `tier2-slice3` worktree at `WSPORT=8666`: **731 s**, exit 0; its second fix
pass the same way at `WSPORT=8665`: **729 s**, exit 0; and its documentation pass
at `WSPORT=8666`, without deleting `bridge/out`: **726 s**, exit 0
(`var/check-all-t2s3-docs.log`). Slice 3 added no step either. **Slice 4 added no step, and its documentation
pass did not get a green run**: three runs at `WSPORT=8666` without deleting
`bridge/out` failed at step 6 (63 s and 56 s, exit 141, at a load average of
42–73) and at step 10b (622 s, exit 1). All three were timing in the bridge,
not the slice (PLAN.md's slice-4 follow-up 13): one extra `state` frame in the
byte-strict seed-42 diff, and an `input` emitted after `over` when a concede
races the mulligan prompt. Logs: `var/check-all-t2s4-docs-run{1,2,3}.log`. **Rebased
onto the card library** (`754f504`, 2026-09-27, which added no step), the merged
tree ran it twice at `WSPORT=8665` without deleting `bridge/out`, before the
rebase commit: the first run failed at step **10g** (750 s, exit 1) — the
three-game session's third game, the `restartMatch()`, sent `over` 2 ms after
its `hello_ok` with no `state` (`OVER WITHOUT A gameOver STATE`), and
`check-redaction.mjs` failed that four-frame log (timing in the bridge again;
`bridge/` is untouched by both sides; `var/check-all-t2s4-rebase-pre1*.log`);
the second passed, **849 s**, exit 0, 9c's ten games 311 s, on a desktop at a
load average of 15–25 (`var/check-all-t2s4-rebase-pre2.log`). **The workshop,
rebased onto slice 4 and reconciled** (2026-09-27, the `mtg-table-t2e` worktree;
it added no step), ran it from a deleted `bridge/out` at `WSPORT=8680`: **888 s**,
exit 0, 9c's ten games 317 s, at a load average of 17–23
(`var/check-all-workshop-reconcile.log`).
**Match setup
added five games** (9c's rows 11–14 and 9e, about 125 s) and the gate grew to
match: on its branch, off `0368a90`, **874 s**, exit 0, from a deleted
`bridge/out` at `WSPORT=8671` (`var/check-all-match-setup.log`), then **1,141 s**
and **1,143 s**, exit 0, the same way after its review fix pass and its
documentation pass (`var/check-all-msfix.log`, `var/check-all-ms-docs.log`) — all
three on a desktop that was not idle. **Rebased onto `23e26b3`** with its second
fix commit (`OverRaceSelfTest` among it), it ran twice from a deleted
`bridge/out` at `WSPORT=8670`: **1,106 s** and then **970 s**, exit 0 both times,
9c's fourteen games 466 s and 408 s, at a load average of 17–29 falling to 4 —
the second is the committed tree (`var/check-all-ms-rebase.log`,
`docs/evidence/match-setup.md` §R.3). **Rebased onto the workshop** (`bf0392b`)
with the verifier's four findings fixed, it ran from a deleted `bridge/out` at
`WSPORT=8680`: **897 s**, exit 0, 9c's fourteen games 370 s, at a load
average of 11–19 (`var/check-all-match-setup-final.log`, evidence §R.4).
**Engine and sets, rebased onto match setup** (`a092d3a`, 2026-09-28, the
`mtg-table-t2h` worktree; it added no step) ran it from a deleted `bridge/out` at
`WSPORT=8695`: **906 s**, exit 0, 9c's fourteen games 373 s, at a load average of
3–8 (`var/check-all-engine-upgrade.log`).
**The 2026-09-27 hardening pass** (branch `hardening`, the `mtg-table-t2j`
worktree at `WSPORT=8685`, from a deleted `bridge/out`) added **12b** and changed
steps 6 and 10g as above: **752.7 s**, exit 0, at a load average of 2–8, with
**873 / 865 pass / 0 fail / 8 skipped** `node --test` and 94 vitest inside it
(`var/check-all-hardening.log`, `docs/evidence/hardening.md`), on `bf0392b`
before match setup landed. **Rebased onto match setup** (`a092d3a`), with **12c**
added, it ran from a deleted `bridge/out` at `WSPORT=8685`: **938.8 s**, exit 0,
9c's fourteen games 379 s, 12c's twenty assertions (each main exiting 1 in 2 s), at a load
average of 5–10
(`var/check-all-hardening-rebased.log`, evidence §8). **After its first
verification round, rebased onto engine and sets** (`aead79d`, 2026-09-28; step
6 now asks six questions, and no step was added), it ran from a deleted
`bridge/out` at `WSPORT=8685`: **940.5 s**, exit 0, 9c's fourteen games 384 s, at
a load average of about 9–16 (`var/check-all-hardening-fix1.log`, evidence §9.7).
**More villains added no step** (D116: its `tools/deck-smoke.sh` stays out of
the gate on purpose); from a deleted `bridge/out` at `WSPORT=8700` it ran
**923 s**, exit 0, 9c's fourteen games 385 s, beside another worktree's gate
(`var/check-all-more-villains.log`). **Rebased onto the hardening pass**
(`4d26637`, 2026-09-28, the `mtg-table-t2p` worktree) it ran from a deleted
`bridge/out` at `WSPORT=8725`: **936 s**, exit 0, 9c's fourteen games 379 s, at
a load average of 8–13 (`var/check-all-more-villains-train.log`).
**Spectating added step 6b** (about 20 s: two recordings of seed 5 and the
same-game comparison) and ran the gate on the `spectate` branch from a deleted
`bridge/out` at `WSPORT=8690`: **951 s**, exit 0, at a load average of 6–13
(`var/check-all-spectate.log`, `docs/evidence/spectate.md` §G). **Rebased onto
more villains** (`90b97bb`, 2026-09-28, the `mtg-table-t2o` worktree; step 6's
selftest gained D121's two cases, no step added) it ran from a deleted
`bridge/out` at `WSPORT=8730`: **916 s**, exit 0, 9c's fourteen games 370 s,
6b `SAME GAME`, at a load average of 3–5 (`var/check-all-spectate-train.log`).
**The narrator added 12d** (lettered 12b on its own branch, off `a092d3a`, before
the hardening pass's 12b and 12c landed; about a second standalone, 2.2 s in the
gate with the run's own 19 logs) and ran it from a deleted `bridge/out` at
`WSPORT=8707`: **987 s**, exit 0, 9c's fourteen games 383 s, at a load average
of 9–15 (`var/check-all-narrate.log`, `docs/evidence/narrate.md` §6).
**Rebased onto spectating** (`a5c8e39`, 2026-09-28, the `mtg-table-t2q` worktree;
the narrator's step re-lettered **12d**, 6b's two spectate recordings added to
its list) it ran from a deleted `bridge/out` at `WSPORT=8735`: **912 s**, exit 0,
9c's fourteen games 368 s, 12d 0.8 s over the run's own 18 logs, at a load
average of 2–4 (`var/check-all-narrate-train.log`, `docs/evidence/narrate.md` §8).
**The story page added no step** (branch `story`, off `4408283`, 2026-09-28,
D124–D128: its tests are in the web step, and 12d now runs the narrator through
`web/src/story/narrate.ts`). From a deleted `bridge/out` at `WSPORT=8741`:
**969 s**, exit 0, 9c's fourteen games 374 s, 12d 106 checks in 1.0 s, at a load
average of 3–6 (`var/check-all-story.log`, `docs/evidence/story.md` §7). Its first
run, at `WSPORT=8740`, failed at **10g** on an engine crash that is not the
branch's — the client's `act: undo` racing the game thread into
`MagicStack.clearUndoStack` (`var/check-all-story-run1.log`; PLAN.md's story
follow-up 9, closed by **D136**).
**The gate-speed lane** (branch `gate-speed`, the `mtg-table-t2s` worktree,
**D129–D135**; it added no step, split 6b, 9c, 10, 11 and 13 into jobs, and added
10g's per-game "was played" assertion, **D134**) ran it from a deleted `bridge/out`:
at `GATE_JOBS=4`, **253.4 s, 253.5 s and 253.6 s**, exit 0, three runs back to
back at `WSPORT=8750` and a load average of 9–16; at `GATE_JOBS=8`,
`WSPORT=8770`, **151.0 s**, exit 0, at 14–19; serially at `WSPORT=8780`,
`main`'s script **921 s** and `GATE_JOBS=1` **933 s**, 9c's fourteen games 369 s
and 381 s; and its final run at the default `GATE_JOBS=4`, `WSPORT=8790`,
**274.4 s**, exit 0, 46 jobs whose seconds sum to 1,061.8 s, at a load average
of 5.8 that other lanes' work beside it raised to 18 (`var/check-all-gate-speed.log`,
`docs/evidence/gate-speed.md`).
**At merge** (rebased onto the story page's `0af97a9`; D160–D166 renumbered
D129–D135; every job, and every ten-games row, given a Forge home of its own)
it ran after the last edit to `tools/check-all.sh`, each from a deleted
`bridge/out`: at `GATE_JOBS=4`, **242.3 s, 258.4 s and 246.6 s**, exit 0, at
`WSPORT=8820`, `8830` and `8840` and a load average of 2.5–12 — a first attempt
at the second failed at step 8 on an engine race that is not the gate's (the
scripted console concede racing Forge's game thread; evidence §3.3, PLAN.md's
gate-speed follow-up 8, closed by **D136**'s deferred concede) and was run again; at `GATE_JOBS=8`, `WSPORT=8850`,
**151.2 s**, exit 0, at 6–14; serially at `WSPORT=8860`, **906.9 s**, exit 0,
9c's fourteen games 367.2 s (`var/check-all-gate-speed-merge-{p1,p2,p3,j8,s1}.log`,
evidence §10).
**The undo race** (branch `undo-race`, the `mtg-table-t2t` worktree, **D136**,
amendment **M48**) added no step and no job. 10g's job now also holds the undo
window and asserts the refusal, and `bridge/build.sh` runs a fifth self-test.
Rebased onto `6b35054`, each run from a deleted `bridge/out`, all exit 0: at
`GATE_JOBS=4`, **238.6 s** and **242.0 s** at `WSPORT=8800` and `8810`, 10g's
job about 122 s; serially at `WSPORT=8820`, **907.4 s**, 9c's fourteen games
371.2 s; load average 2–12 (`var/check-all-undo-race-merge-{p1,p2,s1}.log`,
`docs/evidence/undo-race.md` §10). Step 8's scripted concede took the deferred
path in all three runs (gate speed's follow-up 8).
**Polish 1** (branch `polish-1`, the `mtg-table-t2u` worktree, off `f6bad35`; nine
skeptics' minors, no step and no job added — 6b, 10g and 12d each assert more)
ran it from a deleted `bridge/out` at `GATE_JOBS=4`: **243.0 s** at `WSPORT=8850`
and **264.8 s** at `8860`, exit 0 both, at a load average of 1.6–18.6 beside other
lanes' work (`var/check-all-polish-1-p{1,2}.log`, `docs/evidence/polish-1.md`
§10); a rehearsal before them failed at 12d on its own first cut of the two-way
pair check, and that failure is its `own` rule.
**Lane LOOK** (branch `look`, the `mtg-table-t2l` worktree, **D137–D146**) added
no step and no job. On its own branch, off `a092d3a` and before gate speed, it
ran the serial gate from a deleted `bridge/out` at `WSPORT=8710`: **890 s** and,
after its verification pass, **932 s**, exit 0 (`var/check-all-look.log`,
`var/check-all-look-fix1.log`). Rebased onto the undo race's `f6bad35`, from a
deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=8900`: **260.6 s**, exit 0, 46
jobs whose seconds sum to 1,016.4 s, at a load average of 4.7 that other lanes'
work beside it raised to 12.1
(`var/check-all-look-merge.log`, `docs/evidence/look.md`'s merge section).
**Lane MOTION** (branch `motion`, the `mtg-table-t2m` worktree, **D147–D155**)
added no step and no job. On its own branch, off `c81f674` and before gate speed,
it ran the serial gate from a deleted `bridge/out` at `WSPORT=8715`: **929 s** and,
after its verification pass, **872 s**, exit 0 (`var/check-all-motion.log`,
`var/check-all-motion-fix1.log`). Rebased onto Lane LOOK's `4c76785`, from a
deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=8910`: **237.6 s**, exit 0, 46 jobs
whose seconds sum to 934.2 s, at a load average of 2.4 rising to 6.0
(`var/check-all-motion-merge.log`, `docs/evidence/motion.md`'s merge section).
**Lane BODIES** (branch `bodies`, the `mtg-table-t2n` worktree, **D156–D165**)
added no step and no job. On its own branch, off `c81f674` and before gate speed,
it ran the serial gate from a deleted `bridge/out` at `WSPORT=8720`: **893 s**, and
**912 s**, **877 s** and **923 s** after its three fix passes, exit 0
(`var/check-all-bodies.log`, `var/check-all-bodies-fix1-round1.log`,
`var/check-all-bodies-fix1.log`, `var/check-all-bodies-fix2.log`). Rebased onto
Lane MOTION's `e2aee03`, from a deleted `bridge/out` at `GATE_JOBS=4`,
`WSPORT=8920`: **253.8 s**, exit 0, 46 jobs whose seconds sum to 976.8 s, at a
load average of 3.5 rising to 10.3 (`var/check-all-bodies-merge.log`,
`docs/evidence/bodies.md`'s merge section).
**The three art-direction lanes onto `main`'s `a08c15f`** (after CI, Polish 1 and
Guards; the `mtg-table-t2n` worktree, branch `bodies`; no step and no job added —
the 48 are `main`'s) ran it twice from a deleted `bridge/out` at `GATE_JOBS=4`:
**239.0 s** at `WSPORT=8980`, 926.3 s summed, at a load average of 2.6–6.2, and
**240.5 s** at `WSPORT=8990`, 933.3 s summed, at 5.4–7.7, exit 0 both, with
1004 / 996 pass / 0 fail / 8 skipped and 121 vitest in each (`var/check-all-visual-final-p{1,2}.log`; PLAN.md's *Lane BODIES* → *Onto
`main`'s `a08c15f`*).

## *The comic look — the conventions Lane LOOK added*, its closing lines

Its gate runs are `var/check-all-look.log`,
`var/check-all-look-fix1.log` and, merged, `var/check-all-look-merge.log`.

## *The comic motion lane*, its evidence drivers (local, never committed)

Its evidence drivers and PNGs are local, under `var/motion/` (the fix pass's
under `var/motion/fix1/`, the merge's under `var/motion/merge/`).

## *Lane BODIES — the conventions D156–D165 added*, its closing lines

Its gate runs are
`var/check-all-bodies-fix2.log` (the branch, 923 s serially) and, merged,
`var/check-all-bodies-merge.log`.

## *Villain identity* (D220–D221)

From a deleted `bridge/out` at `GATE_JOBS=4` on branch `villain-identity`, off
`9dfdce4`: **263.3 s** at `WSPORT` 9120 and **252.0 s** at 9130, exit 0 both, 48
jobs, `node --test` inside them 1,092 / 1,084 pass / 0 fail / 8 skipped and 124
vitest (`var/check-all-villains-p1.log`, `var/check-all-villains-p2.log`). The
lane added no step; the corpus's twentieth recording is read by the steps that
glob `fixtures/games/` (11, 12b, 12d and the web suite).

Its fix pass (D222), the same way at `WSPORT` 9120: **250.1 s** and, on the final
tree, **251.0 s**, exit 0 both, 48 jobs, the same test counts
(`var/check-all-villains-fix1-run1.log`, `var/check-all-villains-fix1.log`).
## The relief window (D225–D226)

Twice from a deleted `bridge/out` at `GATE_JOBS=4`, branch `relief-window` off
`9dfdce4`: `WSPORT=9140` **244.6 s** (48 jobs, 944.1 s summed, load average
2.4–6.1) and `WSPORT=9150` **244.5 s** (940.9 s summed, 5.5–8.8), exit 0 both —
`var/check-all-relief-p1.log`, `-p2.log`. The lane added no step and no job.

## The relief window's fix pass (D227)

Once from a deleted `bridge/out` at `GATE_JOBS=4`, branch `relief-window`:
`WSPORT=9150` **262.3 s** (48 jobs, 1,003.0 s summed, load average 5.1–13.4),
exit 0 — `var/check-all-relief-fix1.log`. A first run at `WSPORT=9140` failed at
10a in 0.0 s (`var/check-all-relief-fix1-collided.log`): another worktree's gate
was running at the same moment with its step-10 servers on 9135–9141, so 10a's
`GET /health` on 9140 was answered by the other gate's server and its own log had
no `WS LISTENING` line — a port collision between two gates, not this branch.
The fix pass added no step and no job.

## The relief window's second fix pass (D228)

Once from a deleted `bridge/out` at `GATE_JOBS=4`, branch `relief-window`, with
`MTG_TABLE_LIKENESS` exported so the relief's three Python-step tests ran inside
the gate (the gate now says which): `WSPORT=9140` **258.0 s** (48 jobs, 985.0 s
summed, load average 2.1–16.4), exit 0 — `var/check-all-relief-fix2.log`,
`var/check-all/20260929-052046-1765885/`. The pass added no step and no job; the
web step and the closing line print whether the relief's Python tests ran.

## *More villain identity* (D230–D231)

From a deleted `bridge/out` at `GATE_JOBS=4` on branch `more-villain-identity`,
off `c330942`: **273.4 s** at `WSPORT` 9160 and **253.1 s** at 9170, exit 0 both,
48 jobs, `node --test` inside them 1,139 / 1,131 pass / 0 fail / 8 skipped and 130
vitest (`var/check-all-villains2-p1.log`, `var/check-all-villains2-p2.log`). The
lane added no step; the corpus's three new recordings are read by the steps that
glob `fixtures/games/` (11, 12b, 12d and the web suite).

**Its fix pass** (D230 corrected, D232–D233), from a deleted `bridge/out` at
`GATE_JOBS=4`, `WSPORT` 9160: **267.9 s**, check-all OK, exit 0, 48 jobs whose
seconds sum to 1,011.3 s, at a load average of 7.9 → 12.8 at most → 8.5; `node
--test` inside it **1,142 / 1,134 pass / 0 fail / 8 skipped** and 130 vitest
(`var/check-all-villains2-fix1.log`, `var/check-all/20260929-071502-2950549/`).
Step 6 compared `fixtures/games/g1.jsonl` (`wire-drift: SAME`) and 9b
`fixtures/games/human-auto-42.jsonl`; step 11 passed the corpus's 23 recordings
through `check-redaction.mjs`; 12b found the catalog current. The fix pass added no
step.

## The arena's caption (D255–D256)

Twice from a deleted `bridge/out` at `GATE_JOBS=4`, branch `arena-story-caption`:
`WSPORT=9250` **276.1 s** (48 jobs, 1,053.6 s summed, load average 4.5–17.4) and
`WSPORT=9260` **267.5 s** (1,017.7 s summed, 11.1–14.2), exit 0 both —
`var/check-all-caption-p1.log` and `-p2.log`. The lane added no step and no job.

### Rebased onto `2c7ed8e` (the sound cues and more villain identity)

Twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9290` **257.4 s** (48
jobs, 964.4 s summed, load average 1.08 → 9.31 at most → 8.47) and `WSPORT=9300`
**258.7 s** (970.2 s summed, 7.17 → 9.42 → 6.37), exit 0 both, `node --test`
inside them 1,199 / 1,188 pass / 0 fail / 11 skipped and 157 vitest (9 files) —
`var/check-all-caption-merge-p1.log` and `-p2.log`. No step and no job added.

## The play-distance audit (D265–D266)

Twice from a deleted `bridge/out` at `GATE_JOBS=4`, branch `play-distance-audit`:
`WSPORT=9340` **269.2 s** (48 jobs, 994.6 s summed, load average 3.66 → 13.11 at
most → 11.82) and `WSPORT=9350` **277.6 s** (1,029.2 s summed, 9.62 → 17.86 →
16.56), exit 0 both, `node --test` inside them 1,206 / 1,195 pass / 0 fail / 11
skipped and 157 vitest (9 files) — `var/check-all-audit-1.log` and `-2.log`. No
step and no job added.
