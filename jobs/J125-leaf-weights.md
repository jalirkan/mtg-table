id: J125
title: Search leaf weights (growth plan #3): eight coordinate steps of search-v2's hand leaf (x0.5 and x1.5 on its life, hand, creature and other-permanent terms) tuned on the dev deck set against search-v2, 140 mirrored pairs each; then ONE fixed 1,200-game match (600 mirrored pairs, D398, the live 1.5 s budget) of the best step against search-v2 on the held-out confirm set, read on a 95% interval (D431)
public_title: Search leaf weights tuning and fixed match
public_est: ~6-7 h (one night)
public_decides: New leaf weights for the next search version
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@c74468e (the head of branch pc/j125-leaf-weights, mtg-table PR #140 (D431), on main 37c6ae6a: SearchConfig wlife/whand/wcreature/wother, the ladder kind's wLife/wHand/wCreature/wOther and the eight players search-v2-{wlife,whand,wcreature,wother}{50,150}. The cloud merges that PR before this job runs; this commit is the code either way, pinned so every game is one code version, D341)
decides: whether search-v2's hand leaf gets new weights in the next search version (search-v3): the one coordinate step chosen on the dev set is adopted only if the held-out fixed match shows it beats search-v2
hypothesis: the hand-written leaf (D312) was never tuned; its four big terms (on the bench board: life 200, creatures 226, other permanents 106, hand -40 points) are guesses, so one of the eight steps may be worth +10 to +25 Elo; with eight steps at 140 pairs each the tuning winner's score is biased upward, which is why it is confirmed on held-out deals and read alone
rule: written 2026-10-14 before any J125 game was played. Tuning (dev set, never the confirm set): each of the eight steps plays a 280-game match (35 batches, 140 mirrored pairs) against search-v1-anytime (search-v2) on tools/ai-bench/pairs-dev.txt, all eight on the same deals (seed blocks 610,900,000-610,900,034, host label j125-tune). Selection: the step with the highest tuning score (the match line's score, 4 decimals); a tie goes to the step listed first in the order wlife50, wlife150, whand50, whand150, wcreature50, wcreature150, wother50, wother150; if the highest score is 0.5000 or less, NO step is chosen, the current weights stay, no confirmation is played and the reading is NOT SHOWN. All eight tuning matches must be complete (280 games, engine errors and timeouts at most 1 in 20) or the selection refuses and the job fails before any confirmation game. Confirmation: ONE fixed match (D398) of the chosen step against search-v1-anytime, 1,200 games (600 mirrored pairs) on the confirm set (tools/ai-bench/pairs-confirm.txt, seed blocks from this host's 114,900,000, the matchup's first 150), read from var/ai-ladder-j125/match-J125.json alone (the tuning games are never pooled in). ADOPT the chosen step's weight into the next search version if the match is complete (all 1,200 games) and the 95% interval on its score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict
followup: morning-read
est: ~6-7 h. The tuning plays 8 x 280 = 2,240 games and the confirmation 1,200, 3,440 in all. J116 played 4,800 search-vs-search games at 7 workers at about 585 games an hour (8 h 31 m with its pilot) and J115 2,400 in 4 h 24 m, so the tuning takes ~3.8-4 h (35 batches of 8 games is 5 rounds of 7 workers, so little idle tail) and the confirmation ~2.1 h; pilot ~15 min. At J115's worst case (75 s a game a worker) it would be ~10 h; each tuning match stops itself at 3 h, the confirmation at 8 h, and the step timeout is 14 h
resumable: no
timeout: 14h
clean: var/ai-ladder-j125 var/ai-ladder-pilot/J125
progress: metric j125_games games of 3440
metrics: j125_games = sh: node -e 'const fs=require("fs");let n=0;const rd=(f,pick)=>{for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.trim()&&pick(l))n++;};rd("var/ai-ladder-j125/tune/results",()=>true);rd("var/ai-ladder/results",(l)=>l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-w")&&l.includes("\"b\":\"search-v1-anytime\""));console.log(n)'
metrics: j125_err = sh: node -e 'const fs=require("fs");let n=0;const bad=(l)=>l.includes("\"error\":true")||l.includes("\"timeout\":true");const rd=(f,pick)=>{for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.trim()&&pick(l)&&bad(l))n++;};rd("var/ai-ladder-j125/tune/results",()=>true);rd("var/ai-ladder/results",(l)=>l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-w")&&l.includes("\"b\":\"search-v1-anytime\""));console.log(n)'
metrics: sel = sh: cat var/ai-ladder-j125/selection.json 2>/dev/null || echo '{"written":0,"tuned":0,"chosen":0}'
metrics: cm = sh: cat var/ai-ladder-j125/match-J125.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: v = sh: node var/j125-tools/verdict.mjs 2>/dev/null || echo '{"written":0,"adopt":0}'
headline: sel.chosen, sel.score, cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.adopt

**What is tuned.** D431 (mtg-table PR #140, the commit this job pins) gave search-v2's hand-written leaf (`SearchPolicy.leaf`) a weight on each of its four big terms, in percent, 100 by default:
- `wlife`: the life curve (30 a point to 5, 18 to 10, 8 to 20, 2 beyond), both sides;
- `whand`: 40 a card in hand, both sides;
- `wcreature`: every creature through Forge's `CreatureEvaluator` (`evalCard`), ours plus and theirs minus;
- `wother`: every other permanent through `evalCard` (lands through `evaluateLand`, others 50 + 30 x mana value).

Wins, losses, poison, the empty library and the `untapped` term (D351) keep their points. On the bench self-test's board the four are life 200, hand -40, creatures 226 and other permanents 106 points, so these are the terms that move the leaf. At 100 the leaf is the plain one to the bit, and search-v2 (the ladder's `search-v1-anytime`, hash `cdd55e02a89c`) is unchanged.

**The eight steps** (`tools/ai-ladder/players.json`, from the PR). Each is search-v1-anytime with ONE weight changed, every other knob search-v2's, on the wall clock (1.5 s) like the live seat:
- `search-v2-wlife50`, `search-v2-wlife150`;
- `search-v2-whand50`, `search-v2-whand150`;
- `search-v2-wcreature50`, `search-v2-wcreature150`;
- `search-v2-wother50`, `search-v2-wother150`.

A coordinate step of x0.5 and x1.5 on each term: large enough that a real effect could show in 140 pairs, small enough that the leaf keeps its shape. Scaling a term also changes the margin rule's 20 points in that term's units; the match measures the result as played and does not separate the two.

**The splits, in numbers.**
- *Tuning:* the dev deck set `tools/ai-bench/pairs-dev.txt` (34 deck pairs), in its own ladder folder `var/ai-ladder-j125/tune`, with `--host j125-tune`, so its seed blocks are 610,900,000 to 610,900,034 (the D398 base for that host label plus 900,000; one block a batch). All eight steps play the SAME 35 blocks, so their scores are compared on the same deals.
- *Confirmation:* the confirm deck set `tools/ai-bench/pairs-confirm.txt` (34 other deck pairs, no deck in common with the dev set), in the real ladder folder `var/ai-ladder` like J115 and J116, on this host (`justin-a-B650-GAMING-X-AX-V2`, base 114,000,000): the matchup has never been played, so its blocks are 114,900,000 to 114,900,149. Different decks AND numerically disjoint seeds from the tuning, so nothing the selection saw is in the confirmation.
- *Pilot:* `--host j125-pilot` (837,900,000+) in `var/ai-ladder-pilot/J125`, never in the real results.

**Sizes.**
- *Tuning, 140 pairs a step* (280 games, 35 batches: five full rounds of 7 workers). J115's pair-score SD was about 0.21, so a step's score has an SE of about 0.017 (95% about +-24 Elo). That ranks steps that differ by 20 Elo or more; the winner's score is biased upward by the choice of the best of eight, which is why it is read only for the choice and never as the result.
- *Confirmation, 600 pairs* (1,200 games), as J115: SE about 0.0085, 95% about +-12 Elo (J115's targets match: 0.510 [0.496, 0.524]). A true +15 Elo clears 0.5 with about 85% probability.

**One fixed match only.** The confirmation is a single D398 match with no stopping rule, played only for the chosen step. The selection (below) is a script written into the job before any game; the pilot tests it on synthetic results.

**When it runs.** No `after:`. `cores: 7` takes the whole width, so no other heavy job runs beside it and every player sees the same CPU. The deals are mirrored, so Justin at the table or a light job falls on both sides alike. If Justin plays, the runner holds the pools; each tuning match's own `--hours 3` stop is about six times its expected 30 minutes.

## Pilot
About 15 minutes: the build (its DecisionSelfTest has D431's checks), the bench self-test (its two D431 engine scenarios: the leaf is linear in the four weights and exact at 100, and a search with all four at 0 scores every unfinished rollout 0), the ladder registry test, the selection script written and tested on synthetic results (a clear winner, a tie, a best at 0.5, all below 0.5, one step incomplete), and 8 games each of one tuning-style match (dev set) and one confirmation-style match (confirm set), in the pilot's own folder.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
mkdir -p var/j125-tools
cat > var/j125-tools/select.mjs <<'J125EOF'
// J125's selection, pre-registered 2026-10-14 before any game (the job's rule: line).
// usage: node select.mjs <dir of <step>.json match files> <out.json> [--played N]
//        node select.mjs --selftest <scratch dir>
// Picks the step with the highest tuning score (4 decimals); a tie goes to the step listed first
// in ORDER; a best score of 0.5000 or less chooses NO step. Every step's match must be complete,
// with N games played and errors + timeouts at most N / 20, and a score; otherwise the file says
// so (chosen 0) and the script exits 1, so no confirmation is ever played on a partial tuning.
import fs from 'node:fs';
import path from 'node:path';

export const ORDER = ['wlife50', 'wlife150', 'whand50', 'whand150', 'wcreature50', 'wcreature150', 'wother50', 'wother150']
  .map((s) => `search-v2-${s}`);

export function select(dir, played) {
  const scores = {};
  const bad = [];
  for (const name of ORDER) {
    const f = path.join(dir, `${name}.json`);
    let m = null;
    try { m = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { m = null; }
    const ok = m && m.complete === true && m.played === played && (m.errors ?? 0) + (m.timeouts ?? 0) <= played / 20
      && typeof m.score === 'number' && Number.isFinite(m.score);
    if (!ok) { bad.push(name); continue; }
    scores[name] = { score: m.score, lo: m.lo, hi: m.hi, elo: m.elo, pairs: m.pairs, played: m.played };
  }
  const out = { written: 1, tuned: Object.keys(scores).length, steps: ORDER.length, played, scores, incomplete: bad };
  if (bad.length) return { ...out, chosen: 0, name: null, score: null, reason: `tuning incomplete: ${bad.join(', ')}` };
  let best = null;
  for (const name of ORDER) if (best === null || scores[name].score > scores[best].score) best = name;   // strict: ties keep the earlier
  if (scores[best].score <= 0.5) return { ...out, chosen: 0, name: null, score: scores[best].score, best, reason: 'no step scored above 0.5 in tuning: the current weights stay' };
  return { ...out, chosen: 1, name: best, score: scores[best].score, best, reason: 'highest tuning score above 0.5' };
}

function selftest(scratch) {
  const mk = (tag, vals, opt = {}) => {
    const d = path.join(scratch, tag);
    fs.mkdirSync(d, { recursive: true });
    ORDER.forEach((n, i) => {
      if (opt.missing === i) return;
      fs.writeFileSync(path.join(d, `${n}.json`), JSON.stringify({ complete: opt.incomplete === i ? false : true, played: 280, errors: 0, timeouts: 0, score: vals[i], lo: vals[i] - 0.03, hi: vals[i] + 0.03, pairs: 140 }));
    });
    return d;
  };
  const cases = [
    ['clear winner', mk('a', [0.49, 0.51, 0.47, 0.53, 0.5, 0.52, 0.48, 0.505]), (r) => r.chosen === 1 && r.name === 'search-v2-whand150' && r.tuned === 8],
    ['tie keeps the earlier', mk('b', [0.49, 0.53, 0.47, 0.53, 0.5, 0.52, 0.48, 0.53]), (r) => r.chosen === 1 && r.name === 'search-v2-wlife150'],
    ['best exactly 0.5 chooses none', mk('c', [0.49, 0.5, 0.47, 0.45, 0.5, 0.42, 0.48, 0.44]), (r) => r.chosen === 0 && r.name === null],
    ['all below 0.5 chooses none', mk('d', [0.49, 0.48, 0.47, 0.45, 0.46, 0.42, 0.48, 0.44]), (r) => r.chosen === 0],
    ['one incomplete refuses', mk('e', [0.49, 0.6, 0.47, 0.45, 0.46, 0.42, 0.48, 0.44], { incomplete: 1 }), (r) => r.chosen === 0 && r.tuned === 7 && r.incomplete.length === 1],
    ['one missing refuses', mk('f', [0.49, 0.6, 0.47, 0.45, 0.46, 0.42, 0.48, 0.44], { missing: 7 }), (r) => r.chosen === 0 && r.tuned === 7],
  ];
  let ok = 0;
  for (const [what, d, pred] of cases) {
    const r = select(d, 280);
    const pass = pred(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: chosen ${r.chosen} ${r.name ?? '-'} (${r.reason})`);
    ok += pass ? 1 : 0;
  }
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length >= 2) {
  const i = argv.indexOf('--played');
  const played = i >= 0 ? Number(argv[i + 1]) : 280;
  const r = select(argv[0], played);
  fs.writeFileSync(argv[1], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
  process.exit(r.tuned === ORDER.length ? 0 : 1);
}
J125EOF
cat > var/j125-tools/verdict.mjs <<'J125EOF'
// J125's reading, pre-registered 2026-10-14: ADOPT iff a step was chosen and its confirmation match is
// complete, played all 1,200 games, and the lower end of the 95% interval on its score is above 0.5.
// Prints one JSON object for the job's metrics; the job's check: lines restate the same rule.
import fs from 'node:fs';
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const sel = read('var/ai-ladder-j125/selection.json');
const cm = read('var/ai-ladder-j125/match-J125.json');
const chosen = sel?.chosen === 1 ? 1 : 0;
const adopt = chosen === 1 && cm !== null && cm.complete === true && cm.played === 1200 && typeof cm.lo === 'number' && cm.lo > 0.5 ? 1 : 0;
console.log(JSON.stringify({ written: sel ? 1 : 0, chosen, confirmed: cm ? 1 : 0, adopt }));
J125EOF
rm -rf var/j125-tools/selftest
node var/j125-tools/select.mjs --selftest var/j125-tools/selftest > var/j125-tools/selftest.json
node var/j125-tools/verdict.mjs
./tools/ai-ladder.sh match search-v2-wlife50 search-v1-anytime --games 8 --pairs tools/ai-bench/pairs-dev.txt --host j125-pilot --purpose pilot --dir var/ai-ladder-pilot/J125/tune --experiments var/ai-ladder-pilot/J125/experiments.jsonl --out var/ai-ladder-pilot/J125/tune.json --jobs {workers}
./tools/ai-ladder.sh match search-v2-wcreature150 search-v1-anytime --games 8 --host j125-pilot --purpose pilot --dir var/ai-ladder-pilot/J125/confirm --experiments var/ai-ladder-pilot/J125/experiments.jsonl --out var/ai-ladder-pilot/J125/confirm.json --jobs {workers}
```
metrics: st = sh: cat var/j125-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pt = sh: cat var/ai-ladder-pilot/J125/tune.json 2>/dev/null || echo '{"played":0}'
metrics: pc = sh: cat var/ai-ladder-pilot/J125/confirm.json 2>/dev/null || echo '{"played":0}'
check: st.ok == 1
check: st.cases == 6
check: pt.complete == true
check: pt.played == 8
check: pt.errors + pt.timeouts <= 1
check: pt.aSearch.searched >= 20
check: pt.bSearch.searched >= 20
check: pc.complete == true
check: pc.played == 8
check: pc.errors + pc.timeouts <= 1
check: pc.aSearch.searched >= 20
check: pc.bSearch.searched >= 20

The pilot only asks whether anything is broken:
- the build, the bench self-test and the registry test pass (D431's checks among them);
- the selection script picks what the rule says on six synthetic cases;
- a weighted player plays 8 games on each deck set against search-v2, and both sides search.

There are no timing or win-rate bounds. The matches themselves are the test.

## Commands
Tuning: the eight steps, one after another, each a 280-game match on the dev set against search-v2, all on the same deals. Then the selection (pre-registered above; exits 1 on an incomplete tuning, which fails the job before the confirmation). Then the one confirmation match, only if a step was chosen.
```bash
test -f var/j125-tools/select.mjs
mkdir -p var/ai-ladder-j125/tune-out
for step in wlife50 wlife150 whand50 whand150 wcreature50 wcreature150 wother50 wother150; do
  ./tools/ai-ladder.sh match "search-v2-$step" search-v1-anytime --games 280 --hours 3 --pairs tools/ai-bench/pairs-dev.txt --host j125-tune --dir var/ai-ladder-j125/tune --experiments var/ai-ladder-j125/experiments.jsonl --out "var/ai-ladder-j125/tune-out/search-v2-$step.json" --jobs {workers}
done
```
```bash
node var/j125-tools/select.mjs var/ai-ladder-j125/tune-out var/ai-ladder-j125/selection.json --played 280
```
```bash
chosen=$(node -e 'const s=JSON.parse(require("fs").readFileSync("var/ai-ladder-j125/selection.json","utf8"));process.stdout.write(s.chosen===1?s.name:"")')
if [ -n "$chosen" ]; then
  echo "J125: confirming $chosen against search-v1-anytime"
  ./tools/ai-ladder.sh match "$chosen" search-v1-anytime --games 1200 --hours 8 --out var/ai-ladder-j125/match-J125.json --jobs {workers}
  tail -1 var/ai-ladder/match.jsonl
else
  echo "J125: no step scored above 0.5 in tuning; no confirmation is played (NOT SHOWN, the current weights stay)"
fi
node var/j125-tools/verdict.mjs
```
check: sel.written == 1
check: sel.tuned == 8
check: sel.chosen == 0 or (cm.complete == true and cm.played == 1200)
check: sel.chosen == 0 or cm.errors + cm.timeouts <= cm.played / 20
check: v.written == 1
check: v.adopt == 1 or not (sel.chosen == 1 and cm.complete == true and cm.played == 1200 and cm.lo > 0.5)
check: v.adopt == 0 or (sel.chosen == 1 and cm.complete == true and cm.played == 1200 and cm.lo > 0.5)

The first four checks say the job did what it set out to: every tuning match complete, and the confirmation complete when a step was chosen. The last two are the ADOPT rule in the runner's own language: `v.adopt` (from `verdict.mjs`) must be 1 exactly when a step was chosen and its confirmation is complete with all 1,200 games and a 95% lower end above 0.5. A NOT SHOWN result passes them; it is a reading, not a failure.

## Abort if
abort: j125_err >= 30 and j125_err > j125_games / 10

This aborts on engine trouble only: once 30 games have ended in an engine error or a timeout, it stops if they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder-j125/selection.json
collect: var/ai-ladder-j125/match-J125.json
collect: var/ai-ladder-j125/tune-out/search-v2-wlife50.json
collect: var/ai-ladder-j125/tune-out/search-v2-wlife150.json
collect: var/ai-ladder-j125/tune-out/search-v2-whand50.json
collect: var/ai-ladder-j125/tune-out/search-v2-whand150.json
collect: var/ai-ladder-j125/tune-out/search-v2-wcreature50.json
collect: var/ai-ladder-j125/tune-out/search-v2-wcreature150.json
collect: var/ai-ladder-j125/tune-out/search-v2-wother50.json
collect: var/ai-ladder-j125/tune-out/search-v2-wother150.json

summary.md, the same way as J115 and J116:
- the tuning table: each of the eight steps' score against search-v2 with its 95% interval, in Elo too, and its pair and game counts; which step the rule chose and why (or that none scored above 0.5). Say plainly that these eight scores are the selection's and are biased upward for the winner; they decide nothing on their own;
- the confirmation, if one was played: the chosen step's score against search-v1-anytime with its 95% interval, the same in Elo, and the pair and game counts;
- each side's p/a/b decisions searched and changed, its budget-fallback rate with the interval, and the other fallback reasons (the weights change the leaf, so a changed rate of the weighted side is worth a line);
- draws, errors and timeouts;
- the reading under the rule: ADOPT (the step's weight joins the next search version), or NOT SHOWN with the interval.

Never write "no gain" for an interval that includes 0.5. If the confirmation stopped early (`complete: false`), say so; it gets no verdict. If no step was chosen, the reading is NOT SHOWN and no confirmation exists; say so and give the eight tuning scores.
