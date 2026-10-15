id: J129
title: A3, the leak report: Justin's recurring mistakes in his own recorded games. Every decision of his seat that the post-game review covers (main-phase plays, attacks, blocks, targets) is graded by coach-grade.sh review in pool mode (D348), put into one kind by what he chose and what he saw, and judged by a rule written before grading (D438): a mistake is a regret interval above zero; a leak is at least 5 mistakes in at least 3 games with a mean regret whose 95% interval is above zero; everything else "not shown"
public_title: Leak report from my own games
public_est: ~1-2 h
public_decides: Whether ForgeCoach shows a Your leaks page
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@8988d8d2 (the head of branch pc/j129-leak-report, mtg-table PR #142 (D438): tools/leaks/ stage, inventory, review, aggregate, verify; web/test/leaks.test.ts. The cloud reviews and merges that PR (merge commit) before this job runs and RE-PINS this line to the merge commit; the pilot refuses a pin that is not on origin/main)
decides: whether ForgeCoach shows the owner a "Your leaks" page (each leak's example moments linked to the replay), and from which kinds; nothing ships from this job by itself
hypothesis: the data is small (on 2026-10-15: 14 games his for certain, 7 with decisions, 153 decisions planned, 95 main-phase plays, 30 attacks, 12 blocks, 16 targets), and the helper's own automatic reviews of five of these games (basic-lands knowledge, default budgets) found 3 clear mistakes in all, so the expected outcome is "not shown" for every kind, with the report saying how many games a verdict needs; a leak is possible only in a kind he meets often (main-phase plays) and only if his clear mistakes cluster there
rule: written 2026-10-15 before any of his decisions was graded at J129's settings; D438 and tools/leaks/rule.ts RULE (copied into leaks.json). A decision is a MISTAKE when its regret interval excludes zero (regretLo > 0, the review's own "mistake"; touching zero is not). A kind is a LEAK when it has at least 5 mistakes, in at least 3 different games, and the 95% interval of its mean regret over ALL its graded decisions is above zero (a parametric game-cluster bootstrap: 10,000 resamples, seed 129, each decision's regret drawn from Normal(regret, (regretHi - regretLo)/3.92)). Everything else is NOT SHOWN. The kinds (classify.ts, by choice and context, never by the engine's answer, one kind a decision, in this order): a main-phase play he passed -> holding up vs tapping out; he cast with the opponent on 2+ untapped lands -> casting into open mana; he cast with 2+ different spells castable -> sequencing; he cast otherwise -> holding up vs tapping out; no attack while the opponent had no untapped creature -> not attacking when free; other attacks; a double block or a chump (printed P/T less damage) -> chump or double block; other blocks; targets. Land-late and keep-or-mulligan are listed as not graded (no grader covers them). The grading settings are fixed (rule.ts REVIEW: triage 60 s, every non-best decision deepened, 600 s of deepening a game, 5 options, seed 1). Nothing is tuned on these games; the checks hold the arithmetic, never the outcome
followup: morning-read
est: ~1-1.5 h. The pilot ~3-5 min (the tests ~1 s, the inventory ~2 s, one 6-decision game reviewed at small budgets ~30-60 s on 3 workers). The run: 7 games with decisions (2 more are skipped as empty in seconds), one at a time on 7 JVMs: per game ~10 s of JVM boot, the triage at 6 s a decision over 7 JVMs (<= ~40 s for the 40-decision game), then the deepening of every decision the triage did not call best, inside 600 s of wall (~10 s boot), the report ~5 s: <= ~11.5 min a game, ~1-1.4 h for 7 (measured: 21 s for the 6-decision game at small budgets). The aggregate and verify: seconds (10 kinds x 10,000 resamples over ~150 decisions)
resumable: yes
timeout: 4h
progress: metric games_done units of 9
metrics: merged = sh: cat var/j129-merged.txt 2>/dev/null || echo 0
metrics: staged = sh: test -s var/j129/input/manifest.json && echo 1 || echo 0
metrics: inv = sh: cat var/j129/input/inventory.json 2>/dev/null || echo '{"written":0,"inputOk":0,"otherSeats":-1,"gamesWithDecisions":0,"decisions":0}'
metrics: rs = sh: cat var/j129/reviews/review-status.json 2>/dev/null || echo '{"games":0,"done":0,"failed":0,"empty":0}'
metrics: games_done = sh: node -e 'let s={};try{s=JSON.parse(require("fs").readFileSync("var/j129/reviews/review-status.json","utf8"))}catch(e){}console.log((s.done||0)+(s.failed||0)+(s.empty||0))'
metrics: lk = sh: node tools/leaks/cli.ts verify --out var/j129/out
headline: lk.leaks, lk.gamesGraded, lk.decisions, lk.mistakes, inv.decisions, rs.failed

**What it reads, and whose it is.** Only Justin's own seat. On 2026-10-15 the PC session staged his games with
`node tools/leaks/cli.ts stage` (PR #142, D438) from his two checkouts into this clone's `var/j129/input/`. The runner
refuses a job that reaches his checkouts, so the job reads only that copy. The copy is byte for byte, with a sha256
per log in `manifest.json`, and every excluded log is listed with its reason.
- **His:** the games ForgeCoach's match launcher started (`match-m…`, D303), and seat 0 of a recorded table of two:
  the room owner's seat (D400), with his consent on the header (D407) and named as the owner.
- **Never opened:** the other seat of a table game is excluded by its file name before a byte is read. **The friend's
  decisions are never read or graded.**
- **Left out:** the 29 play.sh logs (`human-ws-…`). Scripted clients and Claude's own verification games write the
  same ids (`docs/evidence/m5-board.md`: `human-ws-42` was Claude's), and the log cannot tell them apart. Also left
  out: one table seat whose header carries no consent.
- **Re-staging.** If Justin has played since 2026-10-15, the PC session stages again before the job is admitted.
  Staging is idempotent; it overwrites `var/j129/input/` (the progress line's 9 is the staged gradable count). Run it
  from a checkout at the pinned commit, from the repo root:
  `node tools/leaks/cli.ts stage --from ~/code/mtg-table --from ~/code/play-table --owner-name Justin --out ~/code/lab/mtg-table/var/j129/input`.

**Privacy.** mtg-table is a private repository (`gh repo view jalirkan/mtg-table --json isPrivate` → true, 2026-10-15),
and `pc-results` is a branch of it. Even so, `leaks.json` and `report.md` name no card, no deck and no person: they
hold game ids, counts, regrets and frame seqs. The collected `decisions.jsonl` holds the same, plus each decision's
kind and type. The review reports, which carry card labels, stay in this clone's `var/` and are not collected. Nothing
leaves `pc-results`. Nothing ships: the cloud decides whether ForgeCoach shows it.

**What "search" means here.** The brief names "coach-grade / search-v2". The grader is the post-game review
(D353): it plays every option out with Forge Default on both seats, and its yardstick is `forge-default`. search-v2
is a player, not a grader, and no yardstick plays search-v2 out. Its knowledge is the live rule (D348, pool mode): the
cube list minus his deck, his drafted pool and every public card. It never sees the opponent's list.

## Pilot
About 3-5 minutes. It checks:
- the pin is merged;
- the leak report's tests pass;
- the staged input is intact (sha256s, seat 0 only), and the review's own planner counts its decisions;
- the smallest game with decisions is reviewed at small budgets into the pilot's own folder, then aggregated and
  verified.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j129-merged.txt || echo 0 > var/j129-merged.txt
cat var/j129-merged.txt
node --test web/test/leaks.test.ts
test -s var/j129/input/manifest.json || { echo "J129: var/j129/input is not staged: the PC session runs tools/leaks/cli.ts stage first (see the job)"; exit 1; }
node tools/leaks/cli.ts inventory --input var/j129/input
```
```bash
# the smallest game with decisions, at small budgets, into the pilot's own folders
G=$(node -e 'const i=JSON.parse(require("fs").readFileSync("var/j129/input/inventory.json","utf8"));const g=i.perGame.filter(x=>x.decisions>0).sort((a,b)=>a.decisions-b.decisions)[0];if(!g)process.exit(1);console.log(g.gameId)')
echo "pilot game: $G"
node tools/leaks/cli.ts review --input var/j129/input --out var/j129/pilot/reviews --jobs {workers} --triage-s 6 --deep-k 2 --deep-s 40 --only "$G"
node tools/leaks/cli.ts aggregate --input var/j129/input --reviews var/j129/pilot/reviews --out var/j129/pilot/out
node tools/leaks/cli.ts verify --out var/j129/pilot/out
```
metrics: ps = sh: cat var/j129/pilot/reviews/review-status.json 2>/dev/null || echo '{"games":0,"done":0,"failed":0}'
metrics: pv = sh: node tools/leaks/cli.ts verify --out var/j129/pilot/out
check: merged == 1
check: staged == 1
check: inv.written == 1
check: inv.inputOk == 1
check: inv.otherSeats == 0
check: inv.gamesWithDecisions >= 1
check: ps.games == 1
check: ps.done == 1
check: ps.failed == 0
check: pv.written == 1
check: pv.strict == 1
check: pv.mismatches == 0
check: pv.kinds == 10
check: pv.gamesGraded == 1
check: pv.minMistakes == 5
check: pv.minGames == 3
check: pv.bootstrapB == 10000

The pilot asks only whether anything is broken. It has no bound on mistakes or leaks: one game at small budgets is
not the data, and its numbers are thrown away.

## Commands
cores: 7
```bash
# 1. every gradable game, one at a time on {workers} JVMs, at the fixed settings (rule.ts REVIEW); resumes by game
node tools/leaks/cli.ts review --input var/j129/input --out var/j129/reviews --jobs {workers}
cat var/j129/reviews/review-status.json
```
cores: 1
clean: var/j129/out
```bash
# 2. the kinds, the pre-registered rule, leaks.json and report.md; then the arithmetic again
node tools/leaks/cli.ts aggregate --input var/j129/input --reviews var/j129/reviews --out var/j129/out
node tools/leaks/cli.ts verify --out var/j129/out
cat var/j129/out/report.md
```
check: rs.games == inv.gamesGradable
check: rs.done + rs.empty + rs.failed == rs.games
check: rs.failed <= rs.games / 5
check: lk.written == 1
check: lk.strict == 1
check: lk.mismatches == 0
check: lk.kinds == 10
check: lk.gamesGraded == rs.done
check: lk.minMistakes == 5
check: lk.minGames == 3
check: lk.bootstrapB == 10000

The checks cover the job's health and the rule's arithmetic. They never check the outcome:
- `strict`: leaks.json parses, and each kind holds only numbers (or null).
- `mismatches == 0`: `verify` redoes, from `decisions.jsonl`, every count, every mistake flag, the bootstrap (same
  seed) and every leak flag under the rule, and finds no difference from leaks.json.
- The rule's three bars are the pre-registered ones.

A result of no leak is a finding, not a failed job. A review that fails drops its game (the report counts it); more
than one game in five failing fails the job. Block 1 resumes: a done game is skipped, and a game a stop cut short is
reviewed again from its start. Block 2 owns `var/j129/out`.

## Abort if
abort: rs.failed >= 3 and rs.failed > rs.games / 3

Engine trouble only: three or more reviews failing, and more than a third of the games. Nothing stops on a regret.

## Report
collect: var/j129/out/leaks.json
collect: var/j129/out/report.md
collect: var/j129/out/decisions.jsonl
collect: var/j129/input/inventory.json
collect: var/j129/reviews/review-status.json

`report.md` is written by the job for Justin, in plain words. The runner reserves `summary.md` and `metrics.json`.
The PC session writes `summary.md` afterwards, plainly:
- **The verdict per kind** (leaks.json): LEAK or not shown, each beside the rule's numbers: mistakes against 5, games
  with a mistake against 3, the mean regret's interval against zero. For each leak, its example moments (game id,
  frame seq).
- **The data:** games his for certain, games graded (and empty or failed), decisions planned and graded by type, how
  many were graded to the end of the game against the end of the turn, and the keep-or-mulligan answers no grader
  covers. Excluded logs by reason, the play.sh ones and the unconsented table seat named as such.
- **If no leak:** say so plainly, with `needed`: the kind with the most clear mistakes, its rate per game, and about
  how many graded games a verdict needs. If there is no clear mistake at all, there is no rate. Never write "he plays
  X well" for a kind that is not shown.
- **The run:** hours, workers, and whether the PC was in other use.
- Nothing ships: the cloud decides whether ForgeCoach shows a "Your leaks" page.
