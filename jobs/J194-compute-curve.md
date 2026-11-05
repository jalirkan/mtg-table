id: J194
title: The compute curve: three fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule) in one night: (a) search-v1-anytime (search-v2, today's main) vs forge-default, the re-anchor; (b) search-v2-ms6000-r48 vs search-v2, the rule's match; (c) search-v2-ms3000-r24 vs search-v2, read beside; the two new players are search-v2 with the wall-clock budget and the round cap raised together, 2x and 4x (D514)
public_title: Search compute curve: three fixed matches
public_est: ~10-12 h (one long night)
public_decides: Whether more search time per decision buys strength
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@72302c695999f9dbbd5a886d173e31fb5ca4b921 (the merge commit of D514's lane on main: the ladder players search-v2-ms3000-r24 and search-v2-ms6000-r48, search-v1-anytime's params with budgetMs 3000 and maxRounds 24, and budgetMs 6000 and maxRounds 48, and nothing else. Pinned so every game of the three matches is one code version, D341; the copier and determinizer fixes D474-D500 are all on it, so match (a) measures today's search)
decides: which lanes come next for the play AI (the play-AI review of 2026-11-05, §5): COMPUTE PAYS opens parallel rollouts or a faster copy (row 4) and a learned prior from per-option values (row 5); COMPUTE DOES NOT PAY closes both and points the work at the rollout policy instead; INCONCLUSIVE posts a 4,800-game confirmation of search-v2-ms6000-r48 against search-v2 first. It never decides the live seat, which stays search-v2 at 1.5 s (the owner: "a production model needs to be fast but we can experiment for testing")
hypothesis: the search is short of samples: at 1.5 s a searched decision takes ~907 ms and plays ~14-16 rollouts, 2-3 a candidate (J139; J131 16.2), 42% of its picks sit inside the runner-up's interval and 18% are more likely the worse of the two (J068). Three things point to compute paying: the anytime loop's +9.3 Elo [+2.5, +16.0] came from deciding the decisions the old loop handed back (J102, D412); on gate 2's set 12 rounds against 3 flip 4.4% of picks with regret(3) - regret(12) = +0.001 [-0.000, +0.003] a decision (J068), which, if it added up over ~23 searched decisions a game (a hypothesis), is about +16 Elo, +50 at the upper end; and no ladder match has ever been played at another budget. Against it: the rollouts play the opponent as Forge Default (D312) to the end of the turn, so more of them sharpen the same estimate, not a better one, and with the round cap raised with the budget the race still retires alternatives early, so 6 s with 48 rounds buys more rollouts than 1.5 s with 12 but perhaps not 4x (D514's pilot: the budget alone, with the 12-round cap, bought 1.41x the time and ~1.15x the rollouts). PAYS and INCONCLUSIVE are both plausible; DOES NOT PAY needs a point near +6 Elo or below
rule: written 2026-11-05 before any J194 game was played, from the play-AI review of 2026-11-05 §5 row 2, word for word: "COMPUTE PAYS if ms6000's lower end is above 0.5 and its point is ≥ +15 Elo. COMPUTE DOES NOT PAY if its upper end is below +20 Elo (0.529). Otherwise inconclusive: confirm with 4,800 games." Three fixed matches (D398, no stopping rule), each 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), in this order: (a) search-v1-anytime vs forge-default, var/ai-ladder/match-J194a.json; (b) search-v2-ms6000-r48 vs search-v1-anytime, var/ai-ladder/match-J194b.json; (c) search-v2-ms3000-r24 vs search-v1-anytime, var/ai-ladder/match-J194c.json. Each matchup is new, so each takes this host's match blocks 114,900,000-114,900,149: the same 600 deals for all three, and (a) the same deals as J101's search-v1 vs forge-default. In the quoted rule ms6000 is the player search-v2-ms6000-r48 (D514 replaced the budget-only arms before any game). Nothing is tuned: the two arms are search-v2 with the wall-clock budget and the round cap raised in proportion (3,000 ms and 24 rounds, 6,000 ms and 48 rounds), every other knob search-v2's. A match is COMPLETE when its line says complete: true, all 1,200 games were played and engine errors plus timeouts are at most 60 (one in 20). The verdict is match (b)'s alone, read from match-J194b.json, and only when (b) is complete: COMPUTE PAYS when its 95% lower end on search-v2-ms6000-r48's score is above 0.5 (lo > 0.5) and its point estimate is at least +15 Elo (elo >= 15); COMPUTE DOES NOT PAY when its upper end is below +20 Elo (eloHi < 20; 0.529 in score) and it is not PAYS; otherwise INCONCLUSIVE, to be confirmed with 4,800 games. An incomplete (b) gives no verdict. Match (a) carries no verdict: it is the baseline number (score, Elo, interval) of today's search-v2 against Forge. Match (c) is read beside, deciding nothing: the curve's shape (is 3 s about half of 6 s's gain?), (c)'s Elo over (b)'s. Reported beside, deciding nothing: each side's milliseconds per decision (p + a + b, and by kind), searched and changed decisions by kind, budget fallbacks with their interval and other fallbacks. An interval that includes 0.5 is never "no effect"
followup: morning-read
est: ~10-12 h, 14.5 h at worst. Games: J139's 4,800 search-vs-search games took 8.8 h on 7 workers (~545 games an hour), J101's search vs Forge ~600 an hour. (a) ~2 h. The arms: D514's skeptic puts a game against a true search-v2 mirror at ~2.2x as long for r48 and ~1.45x for r24 (the lane's own 1.2x and 1.9x were measured against its budget-only pilots, not search-v2 against itself), so (b) ~4.5 h and (c) ~3 h, ~10 h of matches. Each match stops itself at --hours 3, 7 and 4.5: 14.5 h in all, under the 16 h timeout, so a slow (b) cannot let the timeout cut (c); a match that reaches its stop reports complete: false and, for (b), gives no verdict. The arms' matches run under a 900 s per-game timeout (the ladder's default is 300 s, which D514 says arms that lift maxRounds put at risk). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games on one worker)
resumable: no
timeout: 16h
clean: var/j194 var/ai-ladder-pilot/J194 var/ai-ladder/match-J194a.json var/ai-ladder/match-J194b.json var/ai-ladder/match-J194c.json
progress: metric j194_games games of 3600
metrics: j194_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v1-anytime","forge-default"],["search-v2-ms6000-r48","search-v1-anytime"],["search-v2-ms3000-r24","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j194_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v1-anytime","forge-default"],["search-v2-ms6000-r48","search-v1-anytime"],["search-v2-ms3000-r24","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J194a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J194b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmc = sh: cat var/ai-ladder/match-J194c.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: rob = sh: cat var/j194/rollouts-b.json 2>/dev/null || echo '{"games":0}'
metrics: roc = sh: cat var/j194/rollouts-c.json 2>/dev/null || echo '{"games":0}'
metrics: v = sh: cat var/j194/verdict.json 2>/dev/null || echo '{"written":0,"pays":0,"doesNotPay":0,"inconclusive":0,"complete":0}'
headline: cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.aSearch.msPerDecision, cmb.played, cmb.score, cmb.lo, cmb.hi, cmb.elo, cmb.aSearch.msPerDecision, cmb.bSearch.msPerDecision, cmc.played, cmc.score, cmc.lo, cmc.hi, cmc.elo, cmc.aSearch.msPerDecision, cmc.bSearch.msPerDecision, rob.ratio, roc.ratio, v.pays, v.doesNotPay, v.inconclusive

**Why this job** (the play-AI review of 2026-11-05, §3a and §5 rows 1-2). All the measured strength is the search's
one-step lookahead over Forge, about +60 to +80 Elo over Forge Default; every addition measured since the anytime loop
landed between -80 and +9 Elo, none adopted. The search plays 2-3 rollouts a candidate, at which its options sit about
one standard error apart, so the review names the question it has never measured: does more compute per decision buy
strength? This night answers it at two budgets and re-anchors today's search against Forge, which has never been
matched directly on the confirm set (search-v2's +82 is a chain of J101 and J102), while the search changed under it
since the last ladder line (2026-10-17): the copier and determinizer fixes D474, D477, D479, D493, D497, D498 and D500
each name the search's rollouts, and D498 says results from before and after it are not pooled.

**What is built** (D514, mtg-table merge 72302c695999f9dbbd5a886d173e31fb5ca4b921). Two ladder players in `tools/ai-ladder/players.json`, kind
`search`, search-v1-anytime's params (`profile: Default`, `outlets: on`, `anytime: on`) with the wall-clock budget AND the
round cap raised together:
- `search-v2-ms3000-r24` (`budgetMs` 3000, `maxRounds` 24):
  `Default+outlets+search:ms=3000,cands=6,turns=0,rounds=2,margin=20,maxrounds=24,what=pab,seed=0,anytime=1`;
- `search-v2-ms6000-r48` (`budgetMs` 6000, `maxRounds` 48): the same with `ms=6000,…,maxrounds=48`;
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`): `ms=1500,…,maxrounds=12`.

**Why both knobs.** D514's lane first registered the arms with the budget alone, and its pilot (4 games each, the same
deals) showed that buys little: search-v2 ends most decisions before the deadline, at its 12-round cap or when the race
retires every alternative, so 4x the clock bought 1.41x the time a decision and about 15% more rollouts (ms6000 1,017 ms
against search-v2's 720 ms, 17.7 against 15.4 rollouts a decision; at 2x, 1,055 against 786 ms, 16.5 against 14.8).
That arm would have tested "do 15% more rollouts pay", not the review's question. Raising the round cap in proportion
lets the rollouts scale with the clock where the race does not end a decision first. The race and every other knob (6
candidates, 2 rounds before an override, margin 20, the end-of-turn horizon) stay search-v2's, so the 4x arm is not
expected to reach exactly 4x the rollouts. The players need no search code: `ms=` and `maxrounds=` are `SearchConfig`
keys the ladder already passes. Computed from `registry.ts`'s `configHash` on main 1d0d18f3 with exactly those params,
their hashes would be `994bf685f6b9` (r24) and `6bab8ca5e273` (r48); the pilot records the real ones
(`var/j194-tools/players.json`) and checks the config strings, not the hashes.

**Rollouts a decision are not on the match line.** Its `aSearch`/`bSearch` carry `msPerDecision`, `searched`,
`byKind` and the fallbacks but no rollout count (`tallyLine` in `tools/ai-ladder/match.ts`). The counter is in each
batch's ai-bench lines: `aStats.counts["search.rollouts"]` (and `search.rounds`) beside `search.<p|a|b>.considered`,
where D514's pilot read it. `var/j194-tools/rollouts.cjs` sums those over a match's batch folder
(`<ladder dir>/batches/<run>/b*.jsonl`, the run from the match line's `id`) into rollouts and rounds per searched
decision per side, and checks its decision count against the match line's `searched`. On D514's two pilots it gives
16.49 against 14.78 and 17.70 against 15.41, D514's table.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host (`justin-a-B650-GAMING-X-AX-V2`, base 114,000,000), in
this order:
1. **(a) the re-anchor**, `search-v1-anytime` vs `forge-default`, `--out var/ai-ladder/match-J194a.json`. No verdict:
   the baseline number. Its deals are J101's search-v1 vs forge-default (0.6033 [0.582, 0.6247], +72.9 [+57.5, +88.5]),
   so the two read side by side on the same 600 deals; search-v1 and search-v2 differ by the anytime loop and the
   code underneath, so the comparison is a description, not a test.
2. **(b) the rule's match**, `search-v2-ms6000-r48` vs `search-v1-anytime`, `--out var/ai-ladder/match-J194b.json`.
3. **(c) beside it**, `search-v2-ms3000-r24` vs `search-v1-anytime`, `--out var/ai-ladder/match-J194c.json`.

All three matchups are new on this host, so each takes blocks 114,900,000-114,900,149: (b) and (c) play the same deals,
which makes their side-by-side reading fairer. A match retried after a memory stop takes the next unused blocks for the
games it plays again, so its deals then differ in part. At 600 pairs the score's 95% half-width is about ±0.019,
about ±13-15 Elo (J131: +8.7 [-4.7, +22.1]; J101: ±15). Under that width, as approximations: a true +30 Elo PAYS with
about 98% probability, a true +15 about 50%, and a true 0 is DOES NOT PAY with about 80% (it needs a point below about
+6.6). The rule's two arms cannot both hold at this size (that needs an interval narrower than 20 Elo); the verdict
script gives PAYS precedence all the same.

**Why one night and no tuning.** The compute (budget and round cap in proportion) is the only change and the hypothesis itself; the deals and decks are the
held-out confirm set. Nothing is selected, so each score is read as it is. 4,800 games of (b) are a later job, posted
only on INCONCLUSIVE.

**When it runs.** No `after:`. `cores: 7` takes the whole width for every match, so no other heavy job runs beside it
and both players see the same CPU; that matters more here than in J139, because the arms' strength is bought in wall
clock time. The deals are mirrored, so Justin at the table or a light job falls on both sides alike. If Justin plays,
the runner holds the pools; each match's own `--hours` stop (3, 7 and 4.5 h) is about 1.5 times its expected time,
and the three add up to 14.5 h, under the 16 h timeout.

## Pilot
About 15 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the four players, and each arm's seat config is search-v1-anytime's with only `ms=`
  and `maxrounds=` changed;
- the verdict script written and tested on synthetic match files;
- 4 games of `search-v2-ms3000-r24` vs `search-v1-anytime` on one worker in the pilot's own folder: both sides search, and
  the 2x arm plays at least 1.4 times search-v2's rollouts per searched decision (the compute is really bought).
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j194-merged.txt || echo 0 > var/j194-merged.txt
cat var/j194-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the four players resolve, and each arm is search-v2 with its wall-clock budget and round cap scaled together (D514)
mkdir -p var/j194-tools
./tools/ai-ladder.sh list > var/j194-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-ms3000-r24|search-v2-ms6000-r48|forge-default) ' var/j194-tools/players.txt
node - <<'J194EOF'
// J194's pilot: the four players resolve, and each new one is search-v1-anytime (search-v2) with only its wall-clock budget and round cap changed.
const fs = require('fs');
const L = fs.readFileSync('var/j194-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), m3 = get('search-v2-ms3000-r24'), m6 = get('search-v2-ms6000-r48'), fd = get('forge-default');
const only = (p, ms, mr) => (v1 && v1.cfg && p && p.cfg && p.kind === 'search' && v1.cfg.includes(',anytime=1') && /:ms=1500,/.test(v1.cfg) && v1.cfg.includes(',maxrounds=12,')
  && p.cfg === v1.cfg.replace(':ms=1500,', `:ms=${ms},`).replace(',maxrounds=12,', `,maxrounds=${mr},`) ? 1 : 0);
const r = {
  present: [v1, m3, m6, fd].every((p) => p && p.cfg) ? 1 : 0,
  v1_hash_ok: v1 && v1.hash === 'cdd55e02a89c' ? 1 : 0,
  forge_ok: fd && fd.kind === 'forge' && fd.cfg === 'Default' ? 1 : 0,
  r24_only_ms_and_cap: only(m3, 3000, 24),
  r48_only_ms_and_cap: only(m6, 6000, 48),
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-ms3000-r24': m3?.hash ?? null, 'search-v2-ms6000-r48': m6?.hash ?? null, 'forge-default': fd?.hash ?? null },
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-ms3000-r24': m3?.cfg ?? null, 'search-v2-ms6000-r48': m6?.cfg ?? null },
};
r.ok = r.present && r.v1_hash_ok && r.forge_ok && r.r24_only_ms_and_cap && r.r48_only_ms_and_cap ? 1 : 0;
fs.writeFileSync('var/j194-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J194EOF
```
```bash
cat > var/j194-tools/verdict.mjs <<'J194EOF'
// J194's reading, pre-registered 2026-11-05 before any game (the job's rule: line; the play-AI review of 2026-11-05, §5 rows 1-2).
// usage: node verdict.mjs <match-a.json> <match-b.json> <match-c.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// COMPLETE (each match): the match line names the planned players, says complete: true, all 1,200 games were played,
//   errors + timeouts <= 60 (one in 20, J131's bar).
// The verdict is match (b)'s alone, search-v2-ms6000-r48 against search-v1-anytime (search-v2), and only when (b) is complete:
//   COMPUTE PAYS          (b)'s 95% lower end above 0.5 and its point estimate at least +15 Elo (lo > 0.5 and elo >= 15);
//   COMPUTE DOES NOT PAY  (b)'s upper end below +20 Elo, 0.529 in score (eloHi < 20), and not PAYS;
//   INCONCLUSIVE          otherwise: confirm with 4,800 games.
// (a) carries no verdict: the baseline number. (c) is read beside: the curve's shape, c.elo / b.elo when b.elo > 0.
// The job's check: lines restate the same rule in the runner's language.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const MATCHES = {
  a: ['search-v1-anytime', 'forge-default'],
  b: ['search-v2-ms6000-r48', 'search-v1-anytime'],
  c: ['search-v2-ms3000-r24', 'search-v1-anytime'],
};

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function side(which, m) {
  const [A, B] = MATCHES[which];
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const complete = names === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR ? 1 : 0;
  return {
    match: m === null ? 0 : 1, names, complete, a: A, b: B, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
  };
}

export function verdict(ma, mb, mc) {
  const a = side('a', ma), b = side('b', mb), c = side('c', mc);
  const ok = b.complete === 1;
  const pays = ok && b.lo !== null && b.elo !== null && b.lo > 0.5 && b.elo >= 15 ? 1 : 0;
  const doesNotPay = ok && pays === 0 && b.eloHi !== null && b.eloHi < 20 ? 1 : 0;
  const inconclusive = ok && pays === 0 && doesNotPay === 0 ? 1 : 0;
  const reading = !ok ? (b.match === 0 ? 'NO MATCH (b): no verdict' : b.names === 0 ? 'NOT THIS MATCH (b): no verdict' : 'INCOMPLETE (b): no verdict')
    : pays ? `COMPUTE PAYS: search-v2-ms6000-r48's lower end ${b.lo} is above 0.5 and its point ${b.elo} Elo is at least +15`
    : doesNotPay ? `COMPUTE DOES NOT PAY: search-v2-ms6000-r48's upper end ${b.eloHi} Elo is below +20`
    : `INCONCLUSIVE: lower end ${b.lo}, point ${b.elo} Elo, upper end ${b.eloHi} Elo; confirm with 4,800 games`;
  const cOverB = c.complete === 1 && ok && c.elo !== null && b.elo !== null && b.elo > 0 ? Math.round((c.elo / b.elo) * 100) / 100 : null;
  return {
    written: 1, games: GAMES, bar: BAR, complete: b.complete, pays, doesNotPay, inconclusive, reading,
    shape: { cOverB, note: 'c.elo / b.elo, read beside, deciding nothing (null unless both are complete and b.elo > 0)' },
    a, b, c,
  };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (which, o = {}) => {
    const [A, B] = MATCHES[which];
    return { a: A, b: B, complete: true, played: GAMES, errors: 0, timeouts: 0, score: 0.52, lo: 0.505, hi: 0.535, elo: 13.9, eloLo: 3.5, eloHi: 24.4,
      aSearch: { msPerDecision: 900 }, bSearch: { msPerDecision: 900 }, ...o };
  };
  const A = mk('a', { score: 0.6, lo: 0.58, hi: 0.62, elo: 70.4, eloLo: 55.9, eloHi: 85.1, bSearch: { msPerDecision: null } });
  const C = mk('c', { elo: 10, aSearch: { msPerDecision: 1700 } });
  const PAY = mk('b', { score: 0.53, lo: 0.512, hi: 0.548, elo: 20.9, eloLo: 8.3, eloHi: 33.5, aSearch: { msPerDecision: 3300 } });
  const cases = [
    ['a clear gain is PAYS', [A, PAY, C], (r) => r.pays === 1 && r.doesNotPay === 0 && r.inconclusive === 0 && r.shape.cOverB === 0.48],
    ['a point of exactly +15 with the lower end above 0.5 is PAYS', [A, mk('b', { lo: 0.501, elo: 15 }), C], (r) => r.pays === 1],
    ['a lower end above 0.5 but a point of +14.9 is INCONCLUSIVE', [A, mk('b', { lo: 0.501, elo: 14.9, eloHi: 29.8 }), C], (r) => r.pays === 0 && r.doesNotPay === 0 && r.inconclusive === 1],
    ['a lower end of exactly 0.5 is not PAYS', [A, mk('b', { lo: 0.5, elo: 18, eloHi: 36 }), C], (r) => r.pays === 0 && r.inconclusive === 1],
    ['an upper end of +19.9 Elo is DOES NOT PAY', [A, mk('b', { score: 0.505, lo: 0.49, hi: 0.5285, elo: 3.5, eloLo: -7, eloHi: 19.9 }), C], (r) => r.doesNotPay === 1 && r.pays === 0 && r.inconclusive === 0],
    ['an upper end of exactly +20 Elo is INCONCLUSIVE', [A, mk('b', { score: 0.505, lo: 0.49, hi: 0.529, elo: 3.5, eloLo: -7, eloHi: 20 }), C], (r) => r.inconclusive === 1 && r.doesNotPay === 0],
    ['a loss is DOES NOT PAY', [A, mk('b', { score: 0.47, lo: 0.455, hi: 0.485, elo: -20.9, eloLo: -31.3, eloHi: -10.4 }), C], (r) => r.doesNotPay === 1],
    ['a stopped (b) gives no verdict', [A, { ...PAY, complete: false, played: 800 }, C], (r) => r.complete === 0 && r.pays + r.doesNotPay + r.inconclusive === 0],
    ['1,199 games of (b) is not complete', [A, { ...PAY, played: 1199 }, C], (r) => r.complete === 0 && r.pays + r.doesNotPay + r.inconclusive === 0],
    ['61 errors and timeouts in (b) is not complete', [A, { ...PAY, errors: 40, timeouts: 21 }, C], (r) => r.complete === 0 && r.pays === 0],
    ['60 errors and timeouts in (b) is complete', [A, { ...PAY, errors: 40, timeouts: 20 }, C], (r) => r.complete === 1 && r.pays === 1],
    ['(c) in (b)\'s file is not (b)', [A, { ...PAY, a: 'search-v2-ms3000-r24' }, C], (r) => r.b.names === 0 && r.pays === 0],
    ['the budget-only arm search-v2-ms6000 (D514, replaced) is not (b)', [A, { ...PAY, a: 'search-v2-ms6000' }, C], (r) => r.b.names === 0 && r.pays + r.doesNotPay + r.inconclusive === 0],
    ['no (b) file gives no verdict', [A, null, C], (r) => r.b.match === 0 && r.complete === 0 && r.pays + r.doesNotPay + r.inconclusive === 0],
    ['(a) and (c) missing change nothing in (b)\'s verdict', [null, PAY, null], (r) => r.pays === 1 && r.a.match === 0 && r.c.match === 0 && r.shape.cOverB === null],
    ['(a) and (c) are read as complete or not, deciding nothing', [{ ...A, played: 1100 }, PAY, C], (r) => r.a.complete === 0 && r.c.complete === 1 && r.pays === 1],
  ];
  let ok = 0;
  cases.forEach(([what, ms, pred], i) => {
    const fs3 = ['a', 'b', 'c'].map((w, j) => {
      const f = path.join(scratch, `case-${i}-${w}.json`);
      if (ms[j] !== null) fs.writeFileSync(f, JSON.stringify(ms[j]));
      return f;
    });
    const r = verdict(...fs3.map(read));
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
} else if (argv.length === 4) {
  const r = verdict(read(argv[0]), read(argv[1]), read(argv[2]));
  fs.mkdirSync(path.dirname(argv[3]), { recursive: true });
  fs.writeFileSync(argv[3], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match-a.json> <match-b.json> <match-c.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J194EOF
cat > var/j194-tools/rollouts.cjs <<'J194EOF'
// J194's pilot: rollouts per searched decision (p + a + b) for each side of the pilot match. The match line has no
// rollouts field, so this reads the counters D514's pilot read: each batch line's aStats/bStats `search.rollouts`
// and `search.<p|a|b>.considered` (config A is the match's first player, as tools/ai-ladder/match.ts tallyBatch reads it).
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, decisions: 0, lines: 0 });
const t = { a: side(), b: side() };
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
      t[k].rollouts += n('search.rollouts'); t[k].rounds += n('search.rounds');
      t[k].decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered'); t[k].lines++;
    }
  }
}
const per = (s, x) => (s.decisions > 0 ? Math.round((s[x] / s.decisions) * 100) / 100 : null);
const r = { run, a: m?.a ?? null, b: m?.b ?? null, aRolloutsPerDecision: per(t.a, 'rollouts'), bRolloutsPerDecision: per(t.b, 'rollouts'),
  aRoundsPerDecision: per(t.a, 'rounds'), bRoundsPerDecision: per(t.b, 'rounds'), aDecisions: t.a.decisions, bDecisions: t.b.decisions, games: t.a.lines };
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J194EOF
rm -rf var/j194-tools/selftest
node var/j194-tools/verdict.mjs --selftest var/j194-tools/selftest > var/j194-tools/selftest.json
cat var/j194-tools/selftest.json
```
```bash
# 4 games of match (c) (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range,
# then each side's rollouts per searched decision from the batch's counters (the match line has none)
./tools/ai-ladder.sh match search-v2-ms3000-r24 search-v1-anytime --games 4 --batch-pairs 1 --game-timeout 900 --host j194-pilot --purpose pilot --dir var/ai-ladder-pilot/J194 --experiments var/ai-ladder-pilot/J194/experiments.jsonl --out var/ai-ladder-pilot/J194/match.json --jobs 1
node var/j194-tools/rollouts.cjs var/ai-ladder-pilot/J194 var/ai-ladder-pilot/J194/match.json var/j194-tools/rollouts-pilot.json
```
metrics: merged = sh: cat var/j194-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j194-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: st = sh: cat var/j194-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pm = sh: cat var/ai-ladder-pilot/J194/match.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pr = sh: cat var/j194-tools/rollouts-pilot.json 2>/dev/null || echo '{"games":0}'
check: merged == 1
check: pl.ok == 1
check: pl.r24_only_ms_and_cap == 1
check: pl.r48_only_ms_and_cap == 1
check: st.ok == 1
check: st.cases == 16
check: pm.complete == true
check: pm.played == 4
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.searched >= 10
check: pm.bSearch.searched >= 10
check: pr.games == 4
check: pr.aDecisions == pm.aSearch.searched
check: pr.bDecisions == pm.bSearch.searched
check: pr.aRolloutsPerDecision >= 1.4 * pr.bRolloutsPerDecision
check: pm.aSearch.msPerDecision < 3000
check: pm.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken, and one thing more:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- the four players resolve on this PC: `pl.ok` is search-v1-anytime at its hash `cdd55e02a89c`, forge-default, and both
  arms present; `pl.r24_only_ms_and_cap` and `pl.r48_only_ms_and_cap` say each arm's ai-bench config is
  search-v1-anytime's with `ms=1500` and `maxrounds=12` replaced (3000 and 24, 6000 and 48) and nothing else;
- the verdict script reads sixteen synthetic sets of match files as the rule says;
- in 4 games both sides search and stay under their own budgets on average, the rollout reader saw all 4 games and
  exactly the decisions the match line counts (`pr.aDecisions`, `pr.bDecisions` against `searched`), and **the 2x arm
  (`search-v2-ms3000-r24`) plays at least 1.4 times search-v2's rollouts per searched decision**: the compute is really
  bought, not cut short by the race. The bar sits between the two things it separates. The break it exists to catch,
  the budget alone with the 12-round cap, bought 1.12x at 2x (D514's pilot: 16.5 against 14.8). The r24 arm's own
  evidence is 1.75x (its pilot) and 1.69x (a census), both on ONE deck pair, and this pilot's `--host j194-pilot`
  may draw a different deal, so a bar at 1.6 could fail a working arm on a deal and cost the night; 1.4 still catches
  the 1.12x failure with room on both sides. This is the pilot's only check that 4
  games can fail on a real effect rather than on a break: if it fails, the arms do not buy rollouts on this PC, the
  night would measure little, and the PC session reports the two numbers before anything is re-posted.
- **the 4x arm is read, not checked.** The pilot does not play `search-v2-ms6000-r48`; its rollouts per decision in
  match (b), expected at about 3x search-v2's or more (the race may end decisions before the clock or the cap, so not
  necessarily 4x), are read from the night's own batches into `var/j194/rollouts-b.json` and reported beside the
  verdict. A low ratio there does not change the verdict; it changes what the verdict is about, and `summary.md` says
  so.

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J194a.json
```bash
# (a) the re-anchor: today's search-v2 against Forge Default, 1,200 games, no verdict
test -f var/j194-tools/verdict.mjs
mkdir -p var/j194
echo "J194 (a): search-v1-anytime (search-v2) against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v1-anytime forge-default --games 1200 --hours 3 --out var/ai-ladder/match-J194a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J194b.json
```bash
# (b) the rule's match: search-v2 at 6 s and 48 rounds against search-v2 at 1.5 s and 12, 1,200 games
echo "J194 (b): search-v2-ms6000-r48 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-ms6000-r48 search-v1-anytime --games 1200 --hours 7 --game-timeout 900 --out var/ai-ladder/match-J194b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J194c.json
```bash
# (c) beside it: search-v2 at 3 s and 24 rounds against search-v2 at 1.5 s and 12, 1,200 games
echo "J194 (c): search-v2-ms3000-r24 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-ms3000-r24 search-v1-anytime --games 1200 --hours 4.5 --game-timeout 900 --out var/ai-ladder/match-J194c.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j194/verdict.json var/j194/report.md var/j194/rollouts-a.json var/j194/rollouts-b.json var/j194/rollouts-c.json
```bash
# the pre-registered reading; each match's rollouts per searched decision (read, not gated); report.md (numbers only;
# the PC session writes the summary beside it)
for x in a b c; do node var/j194-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J194$x.json var/j194/rollouts-$x.json; done
node var/j194-tools/verdict.mjs var/ai-ladder/match-J194a.json var/ai-ladder/match-J194b.json var/ai-ladder/match-J194c.json var/j194/verdict.json
node - <<'J194EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const M = { a: read('var/ai-ladder/match-J194a.json'), b: read('var/ai-ladder/match-J194b.json'), c: read('var/ai-ladder/match-J194c.json') };
const v = read('var/j194/verdict.json');
const RO = { a: read('var/j194/rollouts-a.json'), b: read('var/j194/rollouts-b.json'), c: read('var/j194/rollouts-c.json') };
const pct = (x) => (typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : '-');
const L = ['# J194: the compute curve (search-v2 at 1.5 s and 12 rounds, 3 s and 24, 6 s and 48; D514)', ''];
L.push(`**Reading under the pre-registered rule (match b alone): ${v.reading ?? 'no verdict'}.**`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of ['a', 'b', 'c']) {
  const m = M[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${RO[k].aRolloutsPerDecision ?? '-'} | ${RO[k].bRolloutsPerDecision ?? '-'} | ${RO[k].ratio ?? '-'} |`);
}
L.push('');
for (const k of ['a', 'b', 'c']) {
  const m = M[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Rounds per decision ${RO[k].aRoundsPerDecision ?? '-'} / ${RO[k].bRoundsPerDecision ?? '-'}; the rollout reader saw ${RO[k].games ?? '-'} games and ${RO[k].aDecisions ?? '-'} / ${RO[k].bDecisions ?? '-'} searched decisions.`);
}
L.push('', '| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of ['a', 'b', 'c']) {
  const m = M[k];
  for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| (${k}) | ${who} | no search | | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    const ms = t.msMean || {};
    L.push(`| (${k}) | ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} |`);
  }
}
const vb = v.b || {};
L.push('', `Rule parts, match (b) only: complete ${v.complete} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${typeof vb.lo === 'number' && vb.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${typeof vb.elo === 'number' && vb.elo >= 15 ? 1 : 0}; upper end below +20 Elo: ${typeof vb.eloHi === 'number' && vb.eloHi < 20 ? 1 : 0}. PAYS ${v.pays}, DOES NOT PAY ${v.doesNotPay}, INCONCLUSIVE ${v.inconclusive}.`);
L.push(`Beside it, deciding nothing: (a) complete ${(v.a || {}).complete}, the baseline; (c) complete ${(v.c || {}).complete}; (c)'s Elo over (b)'s: ${(v.shape || {}).cOverB ?? '-'}.`);
fs.writeFileSync('var/j194/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J194EOF
```
check: cma.complete == true
check: cma.played == 1200
check: cma.errors + cma.timeouts <= 60
check: cmb.complete == true
check: cmb.played == 1200
check: cmb.errors + cmb.timeouts <= 60
check: cmc.complete == true
check: cmc.played == 1200
check: cmc.errors + cmc.timeouts <= 60
check: v.written == 1
check: v.complete == 1
check: v.pays + v.doesNotPay + v.inconclusive == 1
check: v.pays == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.pays == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.doesNotPay == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 20 and not (cmb.lo > 0.5 and cmb.elo >= 15))
check: v.doesNotPay == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 20 and not (cmb.lo > 0.5 and cmb.elo >= 15))

The first nine checks say each match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next three say the verdict script ran, agrees that (b) is complete, and
gave exactly one reading. The last four are the rule in the runner's own language: `v.pays` is 1 exactly when (b) is
complete with its lower end above 0.5 and its point at least +15 Elo, and `v.doesNotPay` exactly when (b) is complete,
not PAYS, and its upper end is below +20 Elo. Any of the three readings passes them; a reading is not a failure. The
time per decision, the changed answers and the fallbacks are reported, not gated.

## Abort if
abort: j194_err >= 30 and j194_err > j194_games / 10

Engine trouble only: once 30 games of the three matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J194a.json
collect: var/ai-ladder/match-J194b.json
collect: var/ai-ladder/match-J194c.json
collect: var/j194/verdict.json
collect: var/j194/report.md

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J131 and J139:
- **the reading under the rule** (match (b) alone): COMPUTE PAYS, COMPUTE DOES NOT PAY or INCONCLUSIVE. Give
  search-v2-ms6000-r48's score against search-v2 with its 95% interval, the same in Elo, and the pair and game counts; on
  INCONCLUSIVE, say that the 4,800-game confirmation of (b) is what follows;
- **the baseline** (match (a)): today's search-v2 against Forge Default, score and Elo with the interval, beside J101's
  search-v1 on the same deals (+72.9 [+57.5, +88.5]) and J141's +62 [+56, +69] on random census decks; a description,
  no verdict;
- **the curve** (match (c) beside (b)): search-v2-ms3000-r24's score and Elo with the interval, and whether 3 s gave about
  half of 6 s's gain (`shape.cOverB`), with both intervals named, since each is about ±14 Elo;
- **the compute actually bought:** each side's rollouts and rounds per searched decision in (b) and (c)
  (`rollouts-b.json`, `rollouts-c.json`, the ratio the headline's `rob.ratio` and `roc.ratio`), and its ms per decision
  (p + a + b, and by kind), against search-v2's, and each arm's budget fallbacks. If the 4x arm bought far fewer than
  about 3x the rollouts, say what the verdict then measured: that many more rollouts, not 4x;
- **the changed answers by kind:** each side's p/a/b decisions searched and changed, in all three matches;
- **the run:** draws, errors and timeouts (the arms' matches ran under a 900 s per-game timeout), each match's hours,
  and whether the PC was in other use.

Never write "no gain" or "no effect" for an interval that includes 0.5. If (b) stopped early (`complete: false`), say
so: it gets no verdict. If (a) or (c) stopped early, report what was played as incomplete.
