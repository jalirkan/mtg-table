#!/usr/bin/env bash
# mtg-table — the engine analysis of a decision (D334–D336).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Rebuilds a decision of a game from the viewing seat's redacted log, the hidden
# cards determinized (never the real ones), and plays every legal option (spell
# / pass, attack, block, target) out with Forge's Default AI on both seats, on
# common random numbers with racing: each option gets a win rate and a regret
# (best win rate minus its own) with intervals.  Two uses: the LIVE analysis a
# coach explains (analyse / serve, a few seconds), and the coach bench's regret
# tables (grade / batch, minutes; ForgeCoach `bench:coach -- import-graded`).
# A tool beside the game, like ai-bench: NOT in the gate (it boots the engine);
# its arithmetic is held by bridge/build.sh (mtgtable.grade.GradeSelfTest).
#
#   ./tools/coach-grade.sh grade --log F --frame N [--mode live|review] --type T \
#        [--opp-deck D | --opp-pool P] [--deck D] [--playouts 200] [--seed 1] ...
#   ./tools/coach-grade.sh batch --moments M.jsonl --out OUT.jsonl [--jobs K] ...
#   ./tools/coach-grade.sh selftest [--log F --frame N --type T --opp-deck D]
#   ./tools/coach-grade.sh analyse --log F --type T [--frame N] [--opp-pool P] [--opp-known "N; N"] [--budget-ms 3000]
#   ./tools/coach-grade.sh serve [defaults]      # JSON requests on stdin, one answer line each
#   ./tools/coach-grade.sh fit-scale --logs DIR[,DIR] [--out F]   # D349: refit the leaf -> P(win) scale
#   ./tools/coach-grade.sh rollout --moments M.jsonl --out OUT.jsonl [--jobs K] [--k 32] [--seed 1] \
#        [--max-turns 40] [--timeout-ms 120000] [--max-ms 0]     # D378: rollout labels (tools/ml/rollout_labels.py)
#   ./tools/coach-grade.sh rollout-selftest [--log F] [--cube C] [--k 4]   # D378: one position labelled, same seed twice
#   ./tools/coach-grade.sh review --log F --seat N [--opp-pool P] [--opp-known "N; N"] [--jobs 7] \
#        [--triage-s 15] [--deep-s 150] [--deep-k 6] [--out R.json]   # D353: the post-game review
#   ./tools/coach-grade.sh review-smoke [--log F] [--jobs 2]   # D353: the review at tiny budgets, report checked (~2 min)
#
# Every flag of grade / batch is mtgtable.grade.CoachGrade's (see its header):
# --playouts N rounds an option still in the race ends with (200), --initial N
# (40) and --batch N (20) for racing, --no-race, --horizon T (-1 = to the end of
# the game), --max-turns, --timeout-ms (per playout), --max-ms (per decision),
# --max-playouts, --cap, --lands, --only 'tok tok', --extra 'tok tok', --budget-ms.
#
# batch --jobs K runs K JVMs on every K-th moment, each with a Forge home of its
# own under var/coach-grade/<run>/home-<i>/ (forge_home_make, D129), appending
# to <out>.shard-<i>.jsonl, then concatenates them into <out>; a rerun resumes.
#
# analyse / serve are the LIVE analysis (D336): the current decision of a game
# being played, inside a wall-clock budget (default 3 s, at least two rounds),
# playouts to the end of this turn scored by the search's leaf evaluator, so a
# coach can explain the engine's numbers.  serve keeps one booted engine (Forge
# takes ~10 s to start) and answers one JSON request per stdin line:
#   {"id","log","type","frame"?,"mode"?,"oppPool"?,"oppKnown"?,"ownPool"?,"deck"?,"budgetMs"?,"horizon"?,"seed"?,
#    "only"?,"leafScale"?,"oppDeck"?,"oppDeckPublic"?,"oppDeckPublicReason"?}
# with one JSON line on stdout (`{"ready":true}` first); see CoachGrade's header.
# Hidden information (D348): the live modes take POOL knowledge -- the cube list
# minus your deck, your drafted pool and every public card, the AI picks you
# saw (oppKnown) drawn first -- and REFUSE the AI's deck list ("status":
# "refused") unless the request marks it public with a reason, for a match
# whose lists both players share.  The leaf's pseudo win rate uses the scale
# fit-scale fitted (var/coach-grade/leaf-scale.json when present).
#
# review (D353; docs/game-review.md): every graded-type decision the log's
# seat made, triaged at the live settings (--triage-s of wall budget over
# --jobs JVMs), the --deep-k most likely to matter graded again to the end of
# the game (--deep-s; one decision per JVM), one JSON report.  The knowledge is
# the LIVE guard's (D348): pool mode, never the AI's list.  Stage lines
# "REVIEW STAGE <name> ..." on stdout; the work under var/coach-grade/review/<run>/.
# It ends with ONE of (D353, amended after the PC's J028):
#   REVIEW DONE <report> decisions=N graded=G errors=E deepened=D    exit 0
#   REVIEW FAILED <stage>: <why>     exit 3 (plan: a refused log or knowledge, an unusable leaf scale),
#                                    4 (triage graded nothing; or every decision an error -- the report
#                                    is still written, as evidence), 5 (the report step itself failed)
# A shard that dies says why on a "REVIEW WARN" line.  review-smoke prints the same lines as
# "REVIEW-SMOKE ...", so a log holding a smoke and a review counts each once.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
[ -d bridge/out/mtgtable/grade ] || { echo "bridge/out is missing or stale -- run ./bridge/build.sh" >&2; exit 1; }

# Hard rule 6's flags, a config of the caller's choosing.
jvm() {
  local config="$1"; shift
  env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -Dmtgtable.config="$config" \
    -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" mtgtable.grade.CoachGrade "$@"
}

# A Forge home of its own (D129) for one JVM of this run.
home_for() { forge_home_make "$REPO_ROOT/var/coach-grade/$1"; }

# batch / rollout --jobs K: K JVMs, each on every K-th moment with a Forge home of its own, then joined.
batch() { sharded batch "$@"; }

sharded() {
  local what="$1"; shift
  local jobs=1 run="" out="" args=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --jobs) jobs="$2"; shift 2 ;;
      --run) run="$2"; shift 2 ;;
      --out) out="$2"; shift 2 ;;
      *) args+=("$1"); shift ;;
    esac
  done
  [ -n "$out" ] || { echo "$what needs --out" >&2; exit 2; }
  [ -n "$run" ] || run="$what-$(date +%Y%m%d-%H%M%S)-$$"
  case "$run" in */*|.*) echo "--run must be a plain name" >&2; exit 2 ;; esac
  mkdir -p "$(dirname "$out")"
  local pids=() i rc=0 done_args=()
  if [ "$what" = rollout ]; then
    # D379: every shard's lines so far, so a retry under another --jobs labels no moment twice
    cat "$out".shard-*.jsonl 2>/dev/null > "$out.done" || true
    done_args=(--done "$out.done")
  fi
  for ((i = 0; i < jobs; i++)); do
    local home; home="$(home_for "$run/home-$i")"
    jvm "$home" "$what" "${args[@]}" ${done_args[@]+"${done_args[@]}"} --shard "$i/$jobs" --out "$out.shard-$i.jsonl" \
      > "$out.shard-$i.log" 2>&1 &
    pids+=("$!")
  done
  for p in "${pids[@]}"; do wait "$p" || rc=1; done
  : > "$out"
  if [ "$what" = rollout ]; then
    # every shard file, an earlier run's under another --jobs included
    for f in "$out".shard-*.jsonl; do [ -f "$f" ] && cat "$f" >> "$out"; done
  else
    for ((i = 0; i < jobs; i++)); do
      [ -f "$out.shard-$i.jsonl" ] && cat "$out.shard-$i.jsonl" >> "$out"
    done
  fi
  echo "coach-grade: $(wc -l < "$out") $([ "$what" = rollout ] && echo labelled || echo graded) moment(s) -> $out"
  [ "$rc" = 0 ] || echo "coach-grade: a shard failed -- see $out.shard-*.log" >&2
  return "$rc"
}

now_ms() { date +%s%3N; }

# The first JVM failure in a stage's shard logs, one line (D353, amended: the review's own output
# says why a shard died, so a job's log keeps it even when the shard logs are not collected).
shard_why() {
  local w
  w="$(cat "$1".shard-*.log 2>/dev/null | grep -m1 '^COACH-GRADE FAILED' || true)"
  printf '%s' "${w#COACH-GRADE FAILED: }" | cut -c1-300
}

# The review's line prefix: REVIEW for a review, REVIEW-SMOKE inside review-smoke, so a log holding
# both (a PC job's pilot and its run) never counts the smoke's lines as the review's (D353, amended).
RV=REVIEW

review() {
  local log="" seat="" out="" run="" jobs=7 triage_s=15 deep_s=150 deep_k=6 deep_horizon=-1 full_min_s=60
  local triage_min_ms=1500 triage_max_ms=6000 seed=1 deep_options=5 know=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --log) log="$2"; shift 2 ;;
      --seat) seat="$2"; shift 2 ;;
      --out) out="$2"; shift 2 ;;
      --run) run="$2"; shift 2 ;;
      --jobs) jobs="$2"; shift 2 ;;
      --triage-s) triage_s="$2"; shift 2 ;;
      --deep-s) deep_s="$2"; shift 2 ;;
      --deep-k) deep_k="$2"; shift 2 ;;
      --deep-horizon) deep_horizon="$2"; shift 2 ;;
      --deep-full-min-s) full_min_s="$2"; shift 2 ;;
      --triage-min-ms) triage_min_ms="$2"; shift 2 ;;
      --triage-max-ms) triage_max_ms="$2"; shift 2 ;;
      --seed) seed="$2"; shift 2 ;;
      --deep-options) deep_options="$2"; shift 2 ;;
      --deck|--own-pool|--opp-pool|--opp-known|--opp-deck|--opp-deck-public) know+=("$1" "$2"); shift 2 ;;
      *) echo "review: unknown flag $1" >&2; exit 2 ;;
    esac
  done
  [ -n "$log" ] && [ -n "$seat" ] || { echo "review needs --log and --seat" >&2; exit 2; }
  local n
  for n in "$seat" "$jobs" "$triage_s" "$deep_s" "$deep_k" "$full_min_s" "$triage_min_ms" "$triage_max_ms" "$seed" "$deep_options"; do
    [[ "$n" =~ ^[0-9]+$ ]] || { echo "review: $n is not a whole number" >&2; exit 2; }
  done
  [[ "$deep_horizon" =~ ^-?[0-9]+$ ]] || { echo "review: --deep-horizon must be a whole number" >&2; exit 2; }
  [ "$jobs" -ge 1 ] || jobs=1
  [ -n "$run" ] || run="review-$(date +%Y%m%d-%H%M%S)-$$"
  case "$run" in */*|.*) echo "--run must be a plain name" >&2; exit 2 ;; esac
  local dir="var/coach-grade/review/$run"
  mkdir -p "$dir"
  # A review is not resumable: a rerun under the same --run starts clean.  Left behind, the claim
  # files would keep the decisions an earlier run's JVMs claimed (and maybe died on) from ever
  # being graded again, and old shard files would be merged in (D353, amended).
  rm -rf "$dir/claim-triage" "$dir/claim-deep"
  rm -f "$dir"/triage.jsonl.shard-* "$dir"/deep.jsonl.shard-* "$dir/report.json"
  [ -n "$out" ] || out="$dir/report.json"
  local scale=()
  [ -f var/coach-grade/leaf-scale.json ] && scale=(--leaf-scale var/coach-grade/leaf-scale.json)
  local t0 t1 plan_ms tri_wall=0 deep_wall=0
  t0="$(now_ms)"

  echo "$RV STAGE plan $log seat $seat"
  local planned rc=0
  planned="$(jvm "$(home_for review-home)" review-plan --log "$log" --seat "$seat" --out "$dir/plan.jsonl" --jobs "$jobs" \
    --triage-ms "$((triage_s * 1000))" --triage-min-ms "$triage_min_ms" --triage-max-ms "$triage_max_ms" ${scale[@]+"${scale[@]}"} ${know[@]+"${know[@]}"} \
    2> "$dir/plan.log")" || rc=$?
  echo "$planned"
  [ "$rc" = 0 ] || { echo "$RV FAILED plan: $(echo "$planned" | tail -1)"; return 3; }
  local decisions tjobs tms
  decisions="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.decisions))' "$planned")"
  tjobs="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.jobs))' "$planned")"
  tms="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.triageMsPerDecision))' "$planned")"
  t1="$(now_ms)"; plan_ms=$((t1 - t0))

  local sel='{"k":0,"jobs":0,"perJvm":0,"msPerDecision":0,"horizon":-1,"picks":[]}' djobs=0 dms=0 dh="$deep_horizon"
  : > "$dir/triage.jsonl"; : > "$dir/deep.jsonl"; echo "$sel" > "$dir/select.json"
  if [ "$decisions" -gt 0 ]; then
    echo "$RV STAGE triage $decisions decision(s) on $tjobs JVM(s), ${tms} ms each"
    t0="$(now_ms)"
    batch --run "$run" --jobs "$tjobs" --guard live --claim "$dir/claim-triage" --moments "$dir/plan.jsonl" --out "$dir/triage.jsonl" \
      --horizon 0 --playouts 10000 --initial 4 --batch 2 --cap 12 --max-options 8 --timeout-ms 2500 --min-rounds 2 \
      --budget-ms "$tms" --seed "$seed" ${scale[@]+"${scale[@]}"} ${know[@]+"${know[@]}"} \
      || echo "$RV WARN a triage shard failed: $(shard_why "$dir/triage.jsonl") (see $dir/triage.jsonl.shard-*.log)"
    t1="$(now_ms)"; tri_wall=$((t1 - t0))
    # D353, amended: a triage that graded nothing is a failed review, never a report of errors marked done.
    local tl
    tl="$(wc -l < "$dir/triage.jsonl")"
    if [ "$tl" -eq 0 ]; then
      echo "$RV FAILED triage: 0 of $decisions decision(s) graded: $(shard_why "$dir/triage.jsonl") (see $dir/triage.jsonl.shard-*.log)"
      return 4
    fi

    sel="$(jvm "$(home_for review-home)" review-select --plan "$dir/plan.jsonl" --triage "$dir/triage.jsonl" \
      --out "$dir/deep-moments.jsonl" --k "$deep_k" --jobs "$jobs" --deep-ms "$((deep_s * 1000))" \
      --deep-horizon "$deep_horizon" --full-min-ms "$((full_min_s * 1000))" --deep-options "$deep_options" 2> "$dir/select.log")"
    echo "$sel" > "$dir/select.json"
    djobs="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.jobs))' "$sel")"
    dms="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.msPerDecision))' "$sel")"
    dh="$(node -e 'const o=JSON.parse(process.argv[1]);process.stdout.write(String(o.horizon))' "$sel")"
    if [ "$djobs" -gt 0 ]; then
      echo "$RV STAGE deepen $(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).k))' "$sel") decision(s) on $djobs JVM(s), ${dms} ms each, horizon $dh"
      t0="$(now_ms)"
      batch --run "$run" --jobs "$djobs" --guard live --claim "$dir/claim-deep" --moments "$dir/deep-moments.jsonl" --out "$dir/deep.jsonl" \
        --horizon "$dh" --playouts 200 --initial 8 --batch 4 --timeout-ms 60000 --min-rounds 2 \
        --max-ms "$dms" --seed "$((seed + 1))" ${scale[@]+"${scale[@]}"} ${know[@]+"${know[@]}"} || echo "$RV WARN a deepen shard failed: $(shard_why "$dir/deep.jsonl") (see $dir/deep.jsonl.shard-*.log)"
      t1="$(now_ms)"; deep_wall=$((t1 - t0))
    fi
  fi

  echo "$RV STAGE report"
  local config timing
  config="{\"jobs\":$jobs,\"triageS\":$triage_s,\"triageMsPerDecision\":$tms,\"triageJobs\":$tjobs,\"deepK\":$deep_k,\"deepS\":$deep_s,\"deepJobs\":$djobs,\"deepMsPerDecision\":$dms,\"deepHorizon\":$dh,\"seed\":$seed}"
  timing="{\"planMs\":$plan_ms,\"triageWallMs\":$tri_wall,\"deepWallMs\":$deep_wall,\"totalMs\":$(( $(now_ms) - REVIEW_T0 ))}"
  local said rrc=0
  said="$(jvm "$(home_for review-home)" review-report --log "$log" --plan "$dir/plan.jsonl" --triage "$dir/triage.jsonl" \
    --deep "$dir/deep.jsonl" --picks "$dir/select.json" --out "$out" --config "$config" --timing "$timing" \
    --triage-jobs "$tjobs" --deep-jobs "$djobs" 2> "$dir/report.log")" || rrc=$?
  [ -z "$said" ] || echo "$said"
  # D353, amended: exit 4 is a report in which every decision is an error (written, but not a review).
  if [ "$rrc" = 4 ]; then
    echo "$RV FAILED report: $(echo "$said" | sed -n 's/^failed: //p' | head -1) (the report, kept as evidence: $out)"
    return 4
  fi
  [ "$rrc" = 0 ] || { echo "$RV FAILED report: exit $rrc (see $dir/report.log)"; return 5; }
  # The DONE line names the run and counts what came out, so a log holding several is unambiguous.
  echo "$RV DONE $out $(node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const e = r.decisions.filter((d) => d.status === "error" || d.status === "refused").length;
    process.stdout.write("decisions=" + r.summary.decisions + " graded=" + r.summary.graded + " errors=" + e + " deepened=" + r.summary.deepened);
  ' "$out")"
}

mode="${1:-}"
case "$mode" in
  grade)
    shift
    jvm "$(home_for grade-home)" grade "$@"
    ;;
  selftest)
    shift
    jvm "$(home_for selftest-home)" selftest "$@"
    ;;
  batch)
    shift
    batch "$@"
    ;;
  rollout)
    shift
    sharded rollout "$@"
    ;;
  rollout-selftest)
    # D378: one decision row of the committed lab recording, labelled twice on one seed (the same
    # results, playout by playout) and once on another, with the refusals; the pool is its cube's list.
    shift
    rs_log=fixtures/cubelab/recorded/games/7/g1-seat0.jsonl.gz
    rs_cube=fixtures/cubelab/recorded/cube.md
    rs_args=()
    while [ $# -gt 0 ]; do
      case "$1" in
        --log) rs_log="$2"; shift 2 ;;
        --cube) rs_cube="$2"; shift 2 ;;
        *) rs_args+=("$1"); shift ;;
      esac
    done
    mkdir -p var/coach-grade/rollout-selftest
    python3 tools/ml/rollout_labels.py pool --cube "$rs_cube" --out var/coach-grade/rollout-selftest/pool.txt >/dev/null
    rs_seq="$(python3 tools/ml/rollout_labels.py first-row --log "$rs_log" --min-turn 3)"
    jvm "$(home_for rollout-selftest-home)" rollout-selftest --log "$rs_log" --seq "$rs_seq" \
      --opp-pool var/coach-grade/rollout-selftest/pool.txt ${rs_args[@]+"${rs_args[@]}"}
    ;;
  analyse)
    shift
    jvm "$(home_for analyse-home)" analyse "$@"
    ;;
  fit-scale)
    shift
    jvm "$(home_for fit-home)" fit-scale "$@"
    ;;
  serve)
    shift
    # COACH_GRADE_HOME: a Forge home of its own per serve JVM when several run
    # side by side (D129; tools/ml/gate_regret_grade.py, D354).
    jvm "$(home_for "${COACH_GRADE_HOME:-serve-home}")" serve "$@"
    ;;
  review)
    shift
    REVIEW_T0="$(now_ms)"
    review "$@"
    ;;
  review-smoke)
    # D353's engine smoke: a fixture game reviewed at tiny budgets (the deepening to the end of
    # the next turn, under the full-game floor), then the report's shape and rules checked.
    shift
    sm_log=fixtures/games/human-trample-7.jsonl sm_jobs=2
    while [ $# -gt 0 ]; do
      case "$1" in
        --log) sm_log="$2"; shift 2 ;;
        --jobs) sm_jobs="$2"; shift 2 ;;
        *) echo "review-smoke: unknown flag $1" >&2; exit 2 ;;
      esac
    done
    sm_seat="$(node -e 'const l=require("fs").readFileSync(process.argv[1]);const t=(l[0]===0x1f?require("zlib").gunzipSync(l):l).toString("utf8");process.stdout.write(String(JSON.parse(t.slice(0,t.indexOf("\n"))).seat))' "$sm_log")"
    sm_run="review-smoke-$$"
    REVIEW_T0="$(now_ms)"
    RV=REVIEW-SMOKE
    review --log "$sm_log" --seat "$sm_seat" --jobs "$sm_jobs" --triage-s 4 --triage-min-ms 400 --triage-max-ms 1000 \
      --deep-k 2 --deep-s 20 --deep-options 3 --run "$sm_run"
    node -e '
      const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      let n = 0, bad = 0;
      const check = (ok, what) => { n++; if (!ok) bad++; console.log((ok ? "ok   " : "FAIL ") + what); };
      check(r.kind === "game-review" && r.v === 1, "a game-review report, v1");
      check(Array.isArray(r.decisions) && r.decisions.length === r.summary.decisions && r.decisions.length > 0, r.decisions.length + " decision(s), as the summary says");
      check(r.decisions.every((d) => ["spell", "attack", "block", "target"].includes(d.type) && Number.isInteger(d.frame) && d.stateFrame < d.frame), "every decision has a graded type and its frames");
      check(r.decisions.every((d) => d.clear === (d.verdict === "mistake")), "clear exactly when the verdict is a mistake");
      check(r.decisions.filter((d) => d.verdict === "mistake").every((d) => d.regretLo > 0), "a mistake has its regret interval above zero");
      check(r.decisions.filter((d) => d.verdict === "close").every((d) => d.regretLo === 0 || d.regretLo < 1e-9), "a close call has its interval touching zero");
      check(r.decisions.filter((d) => d.status === "ok" && d.playedOption).every((d) => d.options.filter((o) => o.played).length === 1), "one played option in every table that has it");
      check(r.decisions.filter((d) => d.status === "ok").every((d) => d.options.every((o) => o.winRate === undefined || (o.winRate >= 0 && o.winRate <= 1))), "win rates in [0, 1]");
      check(r.summary.deepened >= 0 && r.summary.deepened <= 2 && r.decisions.filter((d) => d.stage === "deep").length === r.summary.deepened, r.summary.deepened + " deepened, at most --deep-k");
      check(r.keyMoments.every((f) => r.decisions.some((d) => d.frame === f && d.key)), "every key moment is a decision marked key");
      check(r.knowledge.opponentModel === "basic-lands", "no pool given: the opponent model says basic lands");
      // D353, amended: the PC job J028 passed every check above with every decision an error (its triage
      // JVMs all died); the smoke now holds that the triage graded and that errors are few.
      const errs = r.decisions.filter((d) => d.status === "error" || d.status === "refused").length;
      check(r.decisions.some((d) => d.status === "ok"), "the triage graded: " + r.decisions.filter((d) => d.status === "ok").length + " decision(s) ok");
      check(errs * 4 <= r.decisions.length, errs + " error(s) of " + r.decisions.length + " decision(s): at most a quarter");
      console.log("review-smoke: " + n + " check(s), " + bad + " failure(s); timing " + JSON.stringify(r.timing));
      process.exit(bad ? 1 : 0);
    ' "var/coach-grade/review/$sm_run/report.json"
    ;;
  *)
    sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
