# The web suite's test-count history — moved out of CLAUDE.md

*Moved here verbatim on 2026-09-28 by the docs-block lane (branch `docs-block`, off
`102fb1f`), when `CLAUDE.md` kept one current sentence about `npm --prefix web
test` and nothing else about its past. Nothing below was re-counted or edited:
every count, date, commit and log name is as `CLAUDE.md` carried it on
`102fb1f`.*

The `var/check-all-*.log` files named below were local gate logs and are not in
the repository (`var/` is gitignored). A count *inside* `check-all.sh` is higher
than the standalone one because step 13's `node --test` also replays the step-10
logs `MTGTABLE_WS_LOGS` names.

## The test-count paragraph under *The web client — the conventions M4 added*

`npm --prefix web test` is **994 `node --test` + 121 vitest (8 files)**
standalone with **the three art-direction lanes merged onto `main`'s `a08c15f`**
(Polish 1's follow-word test on top of the lanes' tree; polish-1's follow-up 2
added assertions to existing cases, not cases; **1004 / 996 pass / 0 fail / 8
skipped** plus 121 vitest inside `check-all.sh`, `var/check-all-visual-final-p1.log`),
and was **993 `node --test` + 121 vitest (8 files)**
standalone with **Lane BODIES merged** (branch `bodies`, rebased onto Lane MOTION's
`e2aee03`, 2026-09-28, D156–D165: its `palette` suite, 5 — the hostile corpus
with a case per gate among them — cases in `traits`, `clips`, `facing`,
`figures`, `figure-pose`, `duelists`, `liveness` and `workshop`, and the vitest
`clip-lane.test.tsx`'s tapped mount; **889 + 94 (6 files)** on its own branch off
`a092d3a`; **1003 / 995 pass / 0 fail / 8 skipped** plus 121 vitest inside `check-all.sh`, `var/check-all-bodies-merge.log`),
and was **973 `node --test` + 120 vitest (8 files)**
standalone with **Lane MOTION merged** (branch `motion`, rebased onto Lane LOOK's
`4c76785`, 2026-09-28, D147–D155: its `motion` suite, 13 — the merge's speed-line
projection among them — and cases in `cues-exhaustive`, `replay-cues`, `liveness`,
`camera` and `workshop`; **893 + 94 (6 files)** on its own branch off `a092d3a`;
**983 / 975 pass / 0 fail / 8 skipped** plus 120 vitest inside `check-all.sh`,
`var/check-all-motion-merge.log`), and was **949 `node --test` + 120 vitest (8 files)**
standalone with **Lane LOOK merged** (branch `look`, rebased onto the undo race's
`f6bad35`, 2026-09-28, D137–D146: its `look` suite, 9, `figure-material`, 6, one
liveness clause and one `workshop` case — **887 + 94 (6 files)** on its own branch
off `a092d3a`, 870 + 94 before it, **897 / 889 pass / 0 fail / 8 skipped** inside
its gate — on top of the undo race's 932 + 120; **959 / 951 pass / 0 fail / 8
skipped** plus 120 vitest inside `check-all.sh`, `var/check-all-look-merge.log`),
and was **932 `node --test` + 120 vitest (8 files)**
standalone with **the story page** (branch `story`, off `4408283`, 2026-09-28,
D124–D128: `story.test.ts`, 39, and the vitest `story-render.test.tsx`, 22, on
top of the narrator's tree; **942 / 934 pass / 0 fail / 8 skipped** plus 120
vitest inside `check-all.sh`, `var/check-all-story.log`), and was **893 `node
--test` + 98 vitest (7 files)** standalone with **spectating rebased onto more villains** (`90b97bb`,
2026-09-28, D118–D122: its `spectate` suite, 13 — the dev route, the poller over
a file that grows under a real HTTP server, and the recorder's clock under mock
timers — two `reduce-match` cases, one liveness clause and one `arena-hud` case
on top of more villains' tree; **903 / 895 pass / 0 fail / 8 skipped** plus 98 vitest inside `check-all.sh`,
`var/check-all-spectate-train.log`; **886 + 95 (6 files)** on its own branch off
`a092d3a`, **896 / 888 pass / 0 fail / 8 skipped** inside the gate,
`var/check-all-spectate.log`), and was **877 `node --test` + 97 vitest (7 files)**
standalone with **more-villains rebased onto the hardening pass** (`4d26637`,
2026-09-28, D116–D117: the six `deck-specs` cases on top of hardening's tree;
**887 / 879 pass / 0 fail / 8 skipped** plus 97 vitest inside `check-all.sh`,
`var/check-all-more-villains-train.log`; **876 + 94 (6 files)** on its own
branch off `a092d3a`, **886 / 878 pass / 0 fail / 8 skipped** inside the gate,
`var/check-all-more-villains.log`), and was **871 `node --test` + 97 vitest (7 files)**
standalone with **the 2026-09-27 hardening pass after its first verification
round, rebased onto engine and sets** (`aead79d`: `clip-lane.test.tsx`'s second
case, a stance → cue → stance walk with no jump; **881 / 873 pass / 0 fail / 8
skipped** plus 97 vitest inside `check-all.sh`,
`var/check-all-hardening-fix1.log`), and was **871 + 96 (7 files)** with **the
hardening pass rebased onto match setup**
(`a092d3a`: `camera.test.ts`'s seat-plate test, which now asserts the
opponent's plate inside the band; the vitest `clip-lane.test.tsx`, which calls
`CueRunner`'s exported `driveClips` on a model with no `idle`; and an
`arena-hud` case holding a plate to four one-line rows under a long
`--ai-name` — on top of match setup's tree; **863 + 94 (7 files)** on `bf0392b`
before the rebase), and was **870 `node --test` + 94 vitest (6 files)** standalone
as of **match setup rebased onto the workshop** (`bf0392b`, 2026-09-27: its seven
`reduce-match` cases, its liveness clause for the arena's plates and one
`arena-hud` case on top of the workshop's tree), and was **862 + 93 (6 files)**
with **the workshop rebased onto Tier 2's fourth slice and reconciled**
(2026-09-27, from `npm ci`: its `workshop` suite, 43, two `keys` cases and two
`cards-render` cases on top of slice 4's tree; **872 / 864 pass / 0 fail / 8 skipped** plus 93 vitest inside `check-all.sh`, `var/check-all-workshop-reconcile.log`),
**825 + 92 (6 files)** as of **match setup rebased onto `23e26b3`** (its seven
`reduce-match` cases, 711 + 79 on its own branch, plus its fix commit's liveness
clause for the arena's plates and one `arena-hud` case), **817
+ 91 (6 files)** as of **M7 Tier 2's fourth slice rebased onto the card library**
(the two sides add — slice 4's twenty new `node --test` cases, its `duelists`
suite among them, and D90's 93 plus 12 vitest), **837 + 91** with the workshop on
the card library alone (its `workshop` suite then 38), **797 + 91 (6 files)** as of
**the card library (D90, 2026-09-27)** — its four suites `cards-lib` (49),
`cards-api` (15), `cards-ui` (29) and the vitest `cards-render` (12) — **724 + 79
(5 files)** as of **M7 Tier 2's fourth slice** before the rebase, and
**704 + 79 (5 files)** as of **M7 Tier 2's third slice** after its second fix pass (698 after its first,
690 before that, 655 after the second slice, 610 + 79 after the first slice,
534 + 79 at M7 Tier 1, 456 + 75 at M6), and **881 / 873 pass / 0 fail / 8
skipped** plus 96 vitest inside `check-all.sh` as of the 2026-09-27 hardening
pass rebased onto match setup (`var/check-all-hardening-rebased.log`; 873 / 865
plus 94 on `bf0392b`), **880 / 872** plus 94 vitest as of match setup rebased onto the
workshop (`var/check-all-match-setup-final.log`), **835 / 827** as of its first
rebase and fix commit (`var/check-all-ms-rebase.log`; 721 / 713 on its own
branch), **827 / 819** after
slice 4's rebase (`var/check-all-t2s4-rebase-pre2.log`) — the first in-gate
count since slice 3's **714 / 706**, because neither side read one: slice 4's
documentation pass's gate runs stopped before the web step, and D90's predicted
807 / 799 was not measured inside the gate (708 / 700 after slice 3's first fix pass, 665 / 657
after slice 2, 662 / 654 before slice 2's second fix pass, 620 / 612 after
Tier 2's first slice, 544 / 536 at Tier 1), where `MTGTABLE_WS_LOGS` names the four logs step 10 just
produced and the ws-log suite skips the candidates it does not name. M7's eight
suites (`layout`, `colour`, `replay-cues`, `cues-exhaustive`, `camera`,
`liveness`, `perf`, plus the vitest `arena-hud`) and Tier 2's nine (`figures`,
`figure-pose`, `clips`, `tiles`, `attach`, `stack`, slice 3's `traits` and
`facing`, and slice 4's `duelists`) are in the same glob and need
no GPU and no DOM — which is what report 09 §2.4's `[NO three]` annotations
bought, and report 13 §10 bought again for `figures/`.
**The gate-speed lane changed no test and no count**: in the parallel gate the two
halves of `npm test` are jobs of their own — `13b-render` (`vitest run`, ~60 s on
one thread) and `13c-node` (`node --test`, ~7 s, after step 10) — and they report
the same **903 / 895 pass / 0 fail / 8 skipped** plus 98 vitest.

## *The comic look — the conventions Lane LOOK added*, its closing lines

`npm --prefix web test` was **887 `node --test` + 94 vitest**
on the branch after the verification pass (870 + 94 before the lane), and is
**949 + 120 (8 files)** merged (the count paragraph under *The web client* has
the rest).

## *The comic motion lane — the conventions D147–D155 added*, the lane's tests

— **893 `node --test` + 94 vitest** on the branch after its verification pass, and
**973 + 120 (8 files)** merged (the count paragraph under *The web client* has the
rest).

## *Lane BODIES — the conventions D156–D165 added*, the lane's tests

`npm --prefix web test` was **889 `node --test` + 94
vitest** on the branch, **993 + 121 (8 files)** merged onto MOTION and is **994 +
121** onto `main`'s `a08c15f` (the count paragraph
under *The web client* has the rest).

## *The status layer — the conventions D210–D212 added*, the lane's tests

`npm --prefix web test` went from **999 `node --test` + 121 vitest (8 files)** on
`f2c934d` to **1014 + 122 (8 files)** on branch `status-layer`: the new
`status.test.ts` (8), a liveness clause, the ws-log suite's per-log M49 case (5
more, which skip on a pre-M49 recording) and its across-the-sessions M49 case (1,
which skips with no M49 log — the standalone run's 6 skipped), and
`render.test.tsx`'s hostile keyword case.

## The personal tier's phase 2, onto the status layer (`2bd8514`)

`npm --prefix web test` was **1,044 `node --test` + 121 vitest (8 files)** on
branch `personal-tier-2` at its fix pass 1 (off `096c952`), and is **1,060 + 122
(8 files)** rebased onto the status layer's `2bd8514` (1,054 pass, 6 skipped
standalone — the status layer's M49 cases with no M49 log): the two lanes' cases
add, plus one merge case in `personal.test.ts` (the status strip over the
DRESSED poses, with a hostile dressing as its control).

## Villain identity (`villain-identity`, off `9dfdce4`)

`npm --prefix web test` went from **1,060 `node --test` + 122 vitest (8 files)**
on `9dfdce4` to **1,077 + 124 (8 files)** (1,071 pass, 6 skipped standalone):
fifteen are the per-recording cases `fixtures.test.ts` and `story.test.ts`
generate for a twentieth file, and two are the lane's own — the villain
costume-and-rest list and a `workshop` case (the Doom Legion listed second, its
search) — with the census's task list, the raster and the kinds budget extended
in place; vitest's two more are `story-render`'s and `render.test.tsx`'s
per-fixture cases for the twentieth recording. Inside `check-all.sh`:
**1,092 / 1,084 pass / 0 fail / 8 skipped**, and 124 vitest.
