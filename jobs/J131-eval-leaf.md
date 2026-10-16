id: J131
title: Search-v2 with the learned evaluator at its leaves: ONE fixed 1,200-game match (600 mirrored pairs, D398, the live 1.5 s budget) of search-v2-evalleaf (search-v2 whose unfinished rollouts are scored by evaluator v2's P(win) for the searching seat, D437) against search-v1-anytime (search-v2) on the confirm deck set, read on a 95% interval; no tuning
public_title: Search with the learned evaluator as its leaf: one fixed match
public_est: ~2-3 h
public_decides: Whether the next search version scores its rollouts with the learned evaluator
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@0c5de786 (J128 re-posted as J131 after its pilot failed only on `merged == 1`: PR #143 is now merged, and this commit on main carries both #142 and #143. Was: the head of branch pc/j131-eval-leaf, mtg-table PR #143 (D437): the ladder player search-v2-evalleaf (kind search-eval, search-v1-anytime's params plus model dcdae3745b84, evaluator v2), the counters search.leaf.eval and search.leaf.evalNs, the match line's evalLeaves and evalLeafUs, the self-tests. The cloud reviews and merges that PR (a merge commit) before this job runs and RE-PINS this line to the merge commit; the pilot's first check refuses a pin that is not on origin/main. Pinned so every game is one code version, D341)
decides: whether the next search version (search-v3) scores the leaves of its unfinished rollouts with the learned evaluator (D354's leaf=eval, evaluator v2) instead of the hand-written leaf
hypothesis: the evaluator v2 judges a position with what the seat knows (a 731-card vocabulary covering every card of the confirm decks) where the hand leaf counts life, cards and Forge's card values, so it may steer search-v2's overrides better; against that, D354's gate 2 on v2 (J081) found no regret gain at the live horizon (hand - eval -0.0009 [-0.0063, +0.0047], 291 decisions) and J100 found v2 orders a decision's options slightly worse than the hand leaf (pairwise agreement 0.680 against 0.711), and the eval leaf changes Forge's answer more often (the 8-game smoke: 27% against 17%), so a score near 0.5 or below is as plausible as a gain; ADOPT is not the expected outcome
rule: written 2026-10-15 before any J131 game was played. ONE fixed match (D398, no stopping rule): search-v2-evalleaf against search-v1-anytime (search-v2), 1,200 games (150 batches of 8, 600 mirrored pairs), the live 1.5 s wall-clock budget on both sides, on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), this host's match seed blocks from 114,900,000 (the matchup has never been played, so 114,900,000-114,900,149: the deals of J115's and J125's confirmations), read from var/ai-ladder/match-J131.json alone. Nothing is tuned: the evaluator is v2 as trained (D364, var/ml/models/nights-1-3-eval.json, sha256 dcdae3745b84...), every search knob is search-v2's. The match is COMPLETE when the match line says complete: true, all 1,200 games were played, and engine errors plus timeouts are at most 60 (one in 20). ADOPT the evaluator leaf into the next search version if the match is complete and the 95% interval on search-v2-evalleaf's score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict. Reported beside it, deciding nothing: each side's searched and changed decisions by kind (p, a, b), its milliseconds per decision (p + a + b, and by kind), its budget fallbacks with their interval and its other fallbacks, and the evaluator's leaves and microseconds per leaf. A blended leaf (evaluator plus hand) is not part of this job: if it is ever tried, its one mix is chosen on the dev set first, in a job of its own
followup: morning-read
est: ~2-2.5 h. The match: J125's confirmation (search-v2 with one leaf weight against search-v2, the same 1,200 games on the same deals, 7 workers) took 2 h 00 m (10:19-12:19 on 2026-10-14). The evaluator leaf adds its own cost to each searched decision: the smoke on this PC measured 3,534 evaluator leaves in 206 decisions at 79 us each, about 1.4 ms a decision against search-v2's ~650-900 ms, and the anytime loop's deadline caps a decision either way, so ~2 h again. Pilot ~15 min (the build, the bench self-test, the ladder tests, 8 games on one worker ~5 min). At J115's worst case (75 s a game a worker) the match would be ~3.6 h; it stops itself at 5 h, the step timeout is 7 h
resumable: no
timeout: 7h
clean: var/j131 var/ai-ladder-pilot/J131 var/ai-ladder/match-J131.json
progress: metric j131_games games of 1200
metrics: j131_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-evalleaf\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(n)'
metrics: j131_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-evalleaf\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J131.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: v = sh: cat var/j131/verdict.json 2>/dev/null || echo '{"written":0,"adopt":0,"complete":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, cm.aSearch.msPerDecision, cm.bSearch.msPerDecision, cm.aSearch.evalLeafUs, v.adopt

**What is built** (mtg-table PR #143, D437). The search's leaf switch already existed: D354's `SearchConfig`
`leaf=eval:<model.json>` scores a rollout that did not finish the game as `LEAF_SCALE · logit(P(win))` from the
learned evaluator, read through `GamePosition` from the searching seat's chair only (every other hand and every
library is a size, a face-down card its face-down body; in a rollout the copy has been determinized first anyway). A
finished game keeps the hand leaf's ±WIN, and the margin rule keeps its meaning (20 points ≈ 1 point of win rate at
50%). The PR adds what this job needs on top:
- **the player** `search-v2-evalleaf` (`tools/ai-ladder/players.json`): kind `search-eval`, search-v1-anytime's params
  (Default, outlets, 1.5 s, anytime) plus `model: dcdae3745b84`. Its seat config is search-v2's plus
  `,leaf=eval:var/ml/models/eval-dcdae3745b84.json` and nothing else, hash `c6d9a3990415`; search-v2's stays
  `cdd55e02a89c`. The model file is PC-only: the pilot copies `var/ml/models/nights-1-3-eval.json` to that name after
  checking its hash, and the kind checks it again;
- **counters**: each evaluator leaf (`search.leaf.eval`) and its cost in ns (`search.leaf.evalNs`). The match line
  carries `evalLeaves` and `evalLeafUs` per side, beside `msPerDecision`, `byKind` and the budget fallbacks;
- **self-tests**: `DecisionSelfTest` (search-v2 + `leaf=eval` differs from search-v2 in one config field, `leafModel`,
  by reflection); three `ai-bench --selftest` engine scenarios (only the leaf changes: the same rollouts end alike and
  differ only in the score of the end position; nothing hidden: two games that differ only in hidden cards give the
  same evaluator features and the same evaluator-leaf rollouts, with a control that does change them; the budget: a
  search-v2 decision with evaluator leaves stays inside 1.5 s); `web/test/ai-ladder.test.ts` (the player and the
  tally).

**The match** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule): `search-v2-evalleaf`
vs `search-v1-anytime`, 1,200 games, 600 pairs, in the real ladder folder `var/ai-ladder` on this host
(`justin-a-B650-GAMING-X-AX-V2`, base 114,000,000). The matchup is new, so its blocks are 114,900,000 to
114,900,149: the same deals as J115's and J125's confirmations. At 600 pairs the score's 95% half-width is about
±0.015 (J125: SE 0.0075, [0.477, 0.507]), about ±10 Elo; a true +15 Elo clears 0.5 with about 85% probability.

**Why one match and no tuning.** The evaluator is used as trained; the only choice, the evaluator over the hand
leaf, is the hypothesis itself. The deals and decks are the held-out confirm set. Nothing is selected, so the score
is read as it is.

**The blended leaf** (evaluator plus hand) is not played here. The brief allows it only with its one mix chosen on
the dev set first, as J125 chose its step. That is about 4 more hours of games, and J081 and J100 put the best
mix near the hand leaf. It is a follow-up if this match comes out close.

**When it runs.** No `after:`. `cores: 7` takes the whole width for the match, so no other heavy job runs beside it
and both players see the same CPU. The deals are mirrored, so Justin at the table or a light job falls on both
sides alike. If Justin plays, the runner holds the pools; the match's own `--hours 5` stop is about two and a half
times its expected 2 hours.

## Pilot
About 15 minutes:
- the pin is merged;
- the build (DecisionSelfTest has D437's checks), the bench self-test (its three J131 engine scenarios) and the
  ladder registry test;
- the model registered under its hash and the player available;
- the verdict script written and tested on synthetic match files;
- 8 games of the match in the pilot's own folder, where the evaluator side must score leaves and search-v2 none.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j131-merged.txt || echo 0 > var/j131-merged.txt
cat var/j131-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# evaluator v2, registered under its content hash (the ladder kind search-eval checks it again)
M=var/ml/models
test "$(sha256sum "$M/nights-1-3-eval.json" | cut -c1-12)" = dcdae3745b84
test -f "$M/eval-dcdae3745b84.json" || cp "$M/nights-1-3-eval.json" "$M/eval-dcdae3745b84.json"
test "$(sha256sum "$M/eval-dcdae3745b84.json" | cut -c1-12)" = dcdae3745b84
mkdir -p var/j131-tools
./tools/ai-ladder.sh list > var/j131-tools/players.txt
grep -E '^search-v2-evalleaf ' var/j131-tools/players.txt
grep -E '^search-v2-evalleaf .*leaf=eval:var/ml/models/eval-dcdae3745b84\.json"' var/j131-tools/players.txt > /dev/null && echo 1 > var/j131-tools/player-ok.txt || echo 0 > var/j131-tools/player-ok.txt
cat var/j131-tools/player-ok.txt
```
```bash
cat > var/j131-tools/verdict.mjs <<'J131EOF'
// J131's reading, pre-registered 2026-10-15 before any game (the job's rule: line).
// usage: node verdict.mjs <match.json> <out.json>          node verdict.mjs --selftest <scratch dir>
// COMPLETE: the match line says complete: true, all 1,200 games were played, errors + timeouts <= 60.
// ADOPT: complete and the 95% lower end of search-v2-evalleaf's score against search-v1-anytime above 0.5.
// Otherwise NOT SHOWN (an incomplete match gives no verdict). The job's check: lines restate the same rule.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const A = 'search-v2-evalleaf';
export const B = 'search-v1-anytime';

export function verdict(m) {
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const complete = names === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= GAMES / 20 ? 1 : 0;
  const lo = m !== null && typeof m.lo === 'number' && Number.isFinite(m.lo) ? m.lo : null;
  const adopt = complete === 1 && lo !== null && lo > 0.5 ? 1 : 0;
  const reading = complete === 0 ? (m === null ? 'NO MATCH: no verdict' : 'INCOMPLETE: no verdict')
    : adopt === 1 ? `ADOPT: the lower end ${lo} is above 0.5` : `NOT SHOWN: the lower end ${lo} is not above 0.5`;
  return {
    written: 1, match: m === null ? 0 : 1, names, complete, adopt, reading, games: GAMES,
    played: m?.played ?? 0, score: m?.score ?? null, lo, hi: m?.hi ?? null, elo: m?.elo ?? null, eloLo: m?.eloLo ?? null, eloHi: m?.eloHi ?? null,
  };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const base = { a: A, b: B, complete: true, played: GAMES, errors: 0, timeouts: 0, score: 0.53, lo: 0.515, hi: 0.545 };
  const cases = [
    ['a clear gain is ADOPT', base, (r) => r.complete === 1 && r.adopt === 1],
    ['a lower end of exactly 0.5 is NOT SHOWN', { ...base, lo: 0.5 }, (r) => r.complete === 1 && r.adopt === 0],
    ['an interval across 0.5 is NOT SHOWN', { ...base, score: 0.5, lo: 0.485, hi: 0.515 }, (r) => r.complete === 1 && r.adopt === 0],
    ['a stopped match gives no verdict', { ...base, complete: false, played: 800 }, (r) => r.complete === 0 && r.adopt === 0],
    ['1,199 games is not complete', { ...base, played: 1199 }, (r) => r.complete === 0 && r.adopt === 0],
    ['61 errors and timeouts is not complete', { ...base, errors: 40, timeouts: 21 }, (r) => r.complete === 0 && r.adopt === 0],
    ['another matchup is not this match', { ...base, a: 'search-v2-whand50' }, (r) => r.names === 0 && r.adopt === 0],
    ['no match file', null, (r) => r.match === 0 && r.complete === 0 && r.adopt === 0],
  ];
  let ok = 0;
  cases.forEach(([what, m, pred], i) => {
    const f = path.join(scratch, `case-${i}.json`);
    if (m !== null) fs.writeFileSync(f, JSON.stringify(m));
    const r = verdict(read(f));
    const pass = pred(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 2) {
  const r = verdict(read(argv[0]));
  fs.mkdirSync(path.dirname(argv[1]), { recursive: true });
  fs.writeFileSync(argv[1], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J131EOF
rm -rf var/j131-tools/selftest
node var/j131-tools/verdict.mjs --selftest var/j131-tools/selftest > var/j131-tools/selftest.json
cat var/j131-tools/selftest.json
```
```bash
# 8 games of the match (one batch, one worker), in the pilot's own ladder folder and seed range
./tools/ai-ladder.sh match search-v2-evalleaf search-v1-anytime --games 8 --host j131-pilot --purpose pilot --dir var/ai-ladder-pilot/J131 --experiments var/ai-ladder-pilot/J131/experiments.jsonl --out var/ai-ladder-pilot/J131/match.json --jobs {workers}
```
metrics: merged = sh: cat var/j131-merged.txt 2>/dev/null || echo 0
metrics: player_ok = sh: cat var/j131-tools/player-ok.txt 2>/dev/null || echo 0
metrics: st = sh: cat var/j131-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pm = sh: cat var/ai-ladder-pilot/J131/match.json 2>/dev/null || echo '{"played":0,"complete":false}'
check: merged == 1
check: player_ok == 1
check: st.ok == 1
check: st.cases == 8
check: pm.complete == true
check: pm.played == 8
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.searched >= 20
check: pm.bSearch.searched >= 20
check: pm.aSearch.evalLeaves > 0
check: pm.bSearch.evalLeaves == 0
check: pm.aSearch.msPerDecision < 1500
check: pm.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`. The cloud merged PR #143 and re-pinned this job to the merge commit;
- the build and the self-tests pass (D437's checks among them);
- evaluator v2 is on this PC with the expected hash and the player resolves to search-v2's config plus the one key;
- the verdict script reads eight synthetic match files as the rule says;
- in 8 games both sides search, the evaluator side's leaves are the evaluator's and search-v2's are not, and both
  sides' mean time per decision is inside the 1.5 s budget. The smoke on this PC: 679 ms against 654 ms, 79 µs an
  evaluator leaf.

There are no win-rate bounds. The match itself is the test.

## Commands
```bash
test -f var/j131-tools/verdict.mjs
test "$(sha256sum var/ml/models/eval-dcdae3745b84.json | cut -c1-12)" = dcdae3745b84
mkdir -p var/j131
echo "J131: search-v2-evalleaf against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-evalleaf search-v1-anytime --games 1200 --hours 5 --out var/ai-ladder/match-J131.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
```bash
# the pre-registered reading, and report.md (numbers only; the PC session writes the summary beside it)
node var/j131-tools/verdict.mjs var/ai-ladder/match-J131.json var/j131/verdict.json
node - <<'J131EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder/match-J131.json');
const v = read('var/j131/verdict.json');
const pct = (x) => (typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : '-');
const L = ['# J131: search-v2 with the learned evaluator at its leaves (D437)', ''];
L.push(`**Reading under the pre-registered rule: ${v.reading ?? 'no verdict'}.**`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts |');
L.push('|---|---|---|---|---|---|');
L.push(`| ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} |`);
L.push('', `Players' config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs.`, '');
L.push('| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | evaluator leaves | us per leaf |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [who, t] of [[m.a, m.aSearch || {}], [m.b, m.bSearch || {}]]) {
  const k = t.byKind || {};
  const ch = (x) => (k[x] ? `${k[x].changed}/${k[x].searched} (${pct(k[x].rate)})` : '-');
  const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  const ms = t.msMean || {};
  L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.evalLeaves ?? '-'} | ${t.evalLeafUs ?? '-'} |`);
}
L.push('', `Rule parts: complete ${v.complete} (complete: true, ${v.games} games, errors + timeouts at most ${v.games / 20}), lower end above 0.5: ${typeof v.lo === 'number' && v.lo > 0.5 ? 1 : 0}; ADOPT ${v.adopt}.`);
fs.writeFileSync('var/j131/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J131EOF
```
check: cm.complete == true
check: cm.played == 1200
check: cm.errors + cm.timeouts <= 60
check: v.written == 1
check: v.complete == 1
check: v.adopt == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.lo > 0.5)
check: v.adopt == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.lo > 0.5)

The first five checks say the match is complete: it was not stopped, all 1,200 games were played, at most one in 20
ended in an engine error or a timeout, and the verdict script agrees. The last two are the ADOPT rule in the
runner's own language: `v.adopt` must be 1 exactly when the match is complete and its 95% lower end is above 0.5.
A NOT SHOWN result passes them; it is a reading, not a failure. The time per decision, the changed answers and the
fallbacks are reported, not gated.

## Abort if
abort: j131_err >= 30 and j131_err > j131_games / 10

Engine trouble only: once 30 games have ended in an engine error or a timeout, the job stops if they are more than
one in ten. The match has no stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J131.json
collect: var/j131/verdict.json
collect: var/j131/report.md

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J115 and J125:
- **the reading under the rule:** ADOPT (the evaluator leaf joins the next search version) or NOT SHOWN. Give
  search-v2-evalleaf's score against search-v1-anytime with its 95% interval, the same in Elo, and the pair and game
  counts;
- **the changed answers by kind:** each side's p/a/b decisions searched and changed. The evaluator leaf changes the
  score of every unfinished rollout, so a different changed rate is expected and worth a line;
- **the time:** ms per decision (p + a + b, and by kind) on both sides, the evaluator's leaves and µs per leaf;
- **the fallbacks:** each side's budget-fallback rate with its interval, and the other fallback reasons;
- **the run:** draws, errors and timeouts, the hours, and whether the PC was in other use.

Never write "no gain" or "no effect" for an interval that includes 0.5. If the match stopped early
(`complete: false`), say so: it gets no verdict.
