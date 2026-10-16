id: J137
title: Synergy v2 against the designed v3, head to head under the design study's pre-registered rule: ForgeCoach's v2 (3e3b007b, sha-checked) and results/J135/synergy-cube-180.v3-designed.md (pc-results 8ac778d1, sha-checked; 8 swaps), tools/cubelab.sh compare on the SAME 1,500 seeds (837,000,001-837,001,500), grid, best of three, Default vs Default, Forge's ranks, no exploration, unrecorded; runs only when results/J135/APPROVED exists
public_title: Synergy v2 against the designed v3
public_est: ~3 h
public_decides: Whether the designed Synergy v3 is shown better balanced than v2
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@0c9bab7c (re-pinned 2026-10-16 to origin/main after #144–#147 merged; was the PR branch head) (the head of branch pc/cubelab-compare, mtg-table PR #147: `tools/cubelab.sh compare`, D441. RE-PIN to its merge commit on origin/main before posting: the pilot fails on merged == 1 until then), ForgeCoach@3e3b007b (J135's pin: public/cubes/synergy-cube-180.md, Synergy version 2, sha256 8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36)
decides: whether the designed Synergy v3 (8 swaps, pc-results study/synergy-v3-design.md) is shown better balanced than v2 for the lab's AI, by the study's rule; a pass ships nothing -- Justin decides whether v3 ships
hypothesis: the study (section 3) guesses the pair spread falls from about 38.7 points to about 28-34, with blue up 4-8 points and white down 2-6; its power calculation (section 4) says 1,500 drafts a side barely separates a v3 30% flatter (v2 [38.6, 48.1], v3 [26.6, 36.2]), 300 cannot
rule: synergy-v3-design.md section 4, written 2026-10-16 before any v3 draft, as written there: v3 is BETTER BALANCED iff v3's pair-spread 95% interval lies wholly below v2's (v3's upper bound < v2's lower bound), AND no v3 pair with >= 40 decisive games has a Wilson 95% interval wholly below 35%. Anything else is NOT SHOWN, never "no change". Pair spread = max - min over the two-colour pairs with >= 40 decisive games in that cube's batch; its interval is D441 compare's paired draft-clustered bootstrap (1,000 replicates, boot seed 1; compare is merged code here, so the study's fallback, balance.mts, is not used). The pair Wilson interval carries the study's design effect 1.25 (its stated convention for rates; the plain interval is reported beside it). The paired difference and every pair's rate are description and decide nothing
followup: morning-read
est: ~2.5-3.5 h on 7 workers: 3,000 drafts at J135's ~1,215 drafts an hour (2.5 h), plus Synergy's long games; pilot ~10 min
resumable: yes
timeout: 8h
clean: var/lab-j137 var/cubelab/homes-J137
progress: cubelab var/lab-j137/compare/runs of 3000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: all = cubelab var/lab-j137/compare/runs
metrics: cmp = sh: cat var/lab-j137/compare/compare.json 2>/dev/null || echo '{"written":0}'
metrics: strict = sh: python3 -c "import json,sys; json.load(open('var/lab-j137/compare/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: vv = sh: cat var/lab-j137/out/v2v3.json 2>/dev/null || echo '{"schema":0}'
headline: vv.verdict.better_balanced, vv.verdict.decided, vv.spread.v2.est, vv.spread.v2.lo, vv.spread.v3.est, vv.spread.v3.hi, vv.verdict.low_pairs, all.engine_error_rate

**Why (2026-10-16).** J135's evolve could not move Synergy's colour imbalance (white ~65% in its decks, blue ~41%,
pair spread 38.7 points). The PC session's design study, `study/synergy-v3-design.md` on pc-results, traced it to
colour, not pair: blue's card flow (−2.9 points a flow card, accounting for all of blue's deficit) and white's
token density. It proposed v3 in eight swaps, `results/J135/synergy-cube-180.v3-designed.md`. Out: Welcoming
Vampire, Adeline, Elspeth, Consider, Ponder, Brainstorm, Deep Analysis and Lonis. In: Kor Skyfisher, Militia Bugler,
Serra Paragon, Tolarian Terror, Sower of Temptation, Brazen Borrower, Mist Raven and Uro. This is not evolve's
identical `v3-candidate.md`. The study pre-registered a head-to-head (section 4), and this job is that test. It runs
only on Justin's word: `results/J135/APPROVED` on pc-results, which only the PC session writes and only when he
says so.

**The populations** (one `compare`, `var/lab-j137/compare/runs/<name>/`; grid, best of three, Default vs Default,
the lab builder, Forge's ranks -- neither copy has a ratings file beside it -- no exploration, no evolve,
unrecorded; the study's settings, which are J135's):
- `synergy_v2`: ForgeCoach's `public/cubes/synergy-cube-180.md` from the pinned clone (3e3b007b), copied as J135
  copies it, sha256 `8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36`.
- `synergy_v3`: `results/J135/synergy-cube-180.v3-designed.md` as committed at pc-results **8ac778d1**, read with
  `git show` from the runner's pc-results worktree (`/home/justin-a/code/lab/pc-results`, lab-runner.md's *On the
  PC*), sha256 `61989547fb03548e349f5b6c85571fbca89da0ba439140e70a15a9c960fab65c`. A later edit to that file on
  pc-results is not this job's v3.

**Seeds.** 837,000,001-837,001,500 for both (D340's verification range; no job in `jobs/` uses 837M), so both cubes
draft the same deals. compare refuses unless both hold exactly those seeds. Pilot: 837,900,001-837,900,006.

**Outputs** (`var/lab-j137/out/`): `v2v3.json` (numbers only) and `v2v3.md`, written by
`var/lab-j137/v2v3.mts`, which the pilot writes from this file. They hold the rule's verdict, with each half and
the intervals it read. They also hold, for information only: every pair's rate with its Wilson interval (design
effect 1.25 and plain); each colour's inclusion and win rate; card flow per played deck (the study's 17 cards:
all decks, blue, white and red decks); the eight swapped cards' own decks, games and raw and shrunk win rates; and
the two cubes' flatness. compare's own `compare.json` and `compare.md` are copied beside them. Never `summary.md` or
`metrics.json`.

**Not beside a queue night.** It aborts if a `queue run` starts. compare resumes (`run` skips the seeds it has), so
a stop costs only the games in flight; `tools/runner.sh stop J137` stops it cleanly.

## Pilot
About 10 minutes, cheapest first. The block reads the approval marker LAST, after every cheap check. Cheap checks:
the pin is merged and holds compare; the compare tests pass; both cubes are copied and their sha256s match; both
are 180 cards Forge 2.0.14 has and supports; v3 differs from v2 by exactly 8 out and 8 in. Then compare at 6
drafts a side (best of three), and the analysis over it with the pair floor at 1 game (a plumbing test of every
table; the real job's floor is 40). `approved == 1` is the last check. Every other check can pass without Justin's
word, so a pilot run before the approval fails on that check alone.
```bash
mkdir -p var/lab-j137/cubes
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j137/merged.txt || echo 0 > var/lab-j137/merged.txt
grep -q "case 'compare'" tools/cubelab/cli.ts && echo 1 > var/lab-j137/has-compare.txt || echo 0 > var/lab-j137/has-compare.txt
node --test web/test/cubelab-compare.test.ts
cp {ForgeCoach}/public/cubes/synergy-cube-180.md var/lab-j137/cubes/synergy-v2-cube-180.md
PCR=/home/justin-a/code/lab/pc-results
git -C "$PCR" show 8ac778d1:results/J135/synergy-cube-180.v3-designed.md > var/lab-j137/cubes/synergy-v3-cube-180.md
sha256sum -c > var/lab-j137/sha.txt <<'SHA' || true
8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36  var/lab-j137/cubes/synergy-v2-cube-180.md
61989547fb03548e349f5b6c85571fbca89da0ba439140e70a15a9c960fab65c  var/lab-j137/cubes/synergy-v3-cube-180.md
SHA
cat var/lab-j137/sha.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J137
for V in v2 v3; do
  tools/cubelab.sh check "var/lab-j137/cubes/synergy-$V-cube-180.md" > "var/lab-j137/check-$V.txt" || true
  grep -E "^(cards listed|in Forge's DB|unsupported)" "var/lab-j137/check-$V.txt"
done
cat > var/lab-j137/v2v3.mts <<'TS'
// J137: Synergy v2 against the designed v3 -- the study's pre-registered rule over compare's output, plus
// the information-only tables.  Reads <compare>/compare.json and its two run folders; writes
// <out>/v2v3.json (numbers only) and <out>/v2v3.md.  Never summary.md or metrics.json.
//   node var/lab-j137/v2v3.mts --compare <dir> --v2 <cube.md> --v3 <cube.md> --min-pair-games 40 --out <dir>
import fs from 'node:fs';
import path from 'node:path';
import { cardUnits, readPopulation, type Population } from '../../tools/cubelab/compare.ts';
import { parseCube } from '../../tools/cubelab/cube.ts';

const arg = (k: string): string => {
  const i = process.argv.indexOf(`--${k}`);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`v2v3: --${k} is required`);
  return process.argv[i + 1] as string;
};
const dir = arg('compare'), out = arg('out'), minPair = Number(arg('min-pair-games'));
const DEFF = 1.25, Z = 1.959964, FLOOR = 0.35;
// The study's card-flow list (synergy-v3-design.md §1): 17 cards that draw or filter without adding to the board.
const FLOW = ['Opt', 'Consider', 'Brainstorm', 'Ponder', 'Thought Scour', 'Deep Analysis', 'Mulldrifter', 'Faithless Looting',
  'Cathartic Reunion', 'Unexpected Windfall', "Mishra's Bauble", 'Chromatic Star', 'Prophetic Prism', 'Ichor Wellspring',
  'Candy Trail', 'Village Rites', 'Deadly Dispute'];
const COLOURS = ['W', 'U', 'B', 'R', 'G'];

/** Wilson 95% on w of g, with the study's design effect (n and successes divided by it; deff 1 is the plain interval). */
function wilson(w: number, g: number, deff: number): [number, number] {
  if (g <= 0) return [0, 1];
  const n = g / deff, p = w / g, z2 = Z * Z;
  const mid = (p + z2 / (2 * n)) / (1 + z2 / n), half = (Z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const pct = (x: number | undefined, d = 1): string => (x === undefined ? '-' : (100 * x).toFixed(d));

const cmp = JSON.parse(fs.readFileSync(path.join(dir, 'compare.json'), 'utf8')) as any;
const names = { v2: 'synergy_v2', v3: 'synergy_v3' } as const;
const cubeNames = (f: string): Set<string> => new Set(parseCube(fs.readFileSync(f, 'utf8')).cards.map((c) => c.name));
const v2Cards = cubeNames(arg('v2')), v3Cards = cubeNames(arg('v3'));
const swappedOut = [...v2Cards].filter((n) => !v3Cards.has(n)), swappedIn = [...v3Cards].filter((n) => !v2Cards.has(n));

interface Side { pop: Population; drafts: ReturnType<Population['drafts']['values']> extends Iterable<infer D> ? D[] : never }
const sides: Record<'v2' | 'v3', Side> = {
  v2: { pop: readPopulation(names.v2, path.join(dir, 'runs', names.v2)), drafts: [] },
  v3: { pop: readPopulation(names.v3, path.join(dir, 'runs', names.v3)), drafts: [] },
};
for (const s of Object.values(sides)) s.drafts = [...s.pop.drafts.values()];

const J: Record<string, unknown> = { schema: 1, drafts_v2: sides.v2.drafts.length, drafts_v3: sides.v3.drafts.length, min_pair_games: minPair, deff: DEFF, floor: FLOOR,
  swapped_out: swappedOut.length, swapped_in: swappedIn.length, flow_cards: FLOW.length };
const md: string[] = ['# J137: Synergy v2 against the designed v3', '',
  `Compare folder: \`${dir}\`; ${sides.v2.drafts.length} and ${sides.v3.drafts.length} drafts on the same seeds (compare asserts it). Pairs count with ${minPair}+ decisive games. Wilson intervals carry the study's design effect ${DEFF} (the plain Wilson interval beside it).`, ''];

// ---------------------------------------------------------------- the pre-registered rule
const sp = (k: 'v2' | 'v3'): { est?: number; lo?: number; hi?: number } => cmp?.pop?.[names[k]]?.m?.pair_spread ?? {};
const s2 = sp('v2'), s3 = sp('v3');
const pairsOf = (s: Side) => {
  const m = new Map<string, { w: number; g: number; decks: number }>();
  for (const d of s.drafts) for (const deck of d.decks) {
    if ([...deck.key].filter((c) => COLOURS.includes(c)).length !== 2) continue;
    const p = m.get(deck.key) ?? { w: 0, g: 0, decks: 0 };
    p.w += deck.wins; p.g += deck.decisive; p.decks++;
    m.set(deck.key, p);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
const p2 = pairsOf(sides.v2), p3 = pairsOf(sides.v3);
const lowPairs = p3.filter(([, p]) => p.g >= minPair && wilson(p.w, p.g, DEFF)[1] < FLOOR).map(([k]) => k);
const decided = s2.lo !== undefined && s3.hi !== undefined ? 1 : 0;
const spreadBelow = decided && (s3.hi as number) < (s2.lo as number) ? 1 : 0;
const noLowPair = lowPairs.length === 0 ? 1 : 0;
const better = decided && spreadBelow && noLowPair ? 1 : 0;
J.verdict = { better_balanced: better, decided, spread_below: spreadBelow, no_low_pair: noLowPair, low_pairs: lowPairs.length };
J.spread = {
  v2: { est: r6(s2.est ?? -1), lo: r6(s2.lo ?? -1), hi: r6(s2.hi ?? -1) }, v3: { est: r6(s3.est ?? -1), lo: r6(s3.lo ?? -1), hi: r6(s3.hi ?? -1) },
  diff: cmp?.diff?.[names.v2]?.[names.v3]?.pair_spread ?? { valid: 0 },
};
md.push('## The pre-registered rule (synergy-v3-design.md §4, written 2026-10-16 before any v3 draft)', '',
  `v3 is **BETTER BALANCED** iff v3's pair-spread 95% interval lies wholly below v2's (v3's upper bound < v2's lower bound) AND no v3 pair with ${minPair}+ decisive games has a Wilson 95% interval wholly below ${FLOOR * 100}%. Anything else is **NOT SHOWN**, never "no change". A pass ships nothing: Justin decides.`, '',
  `| cube | pair spread | 95% interval (compare's paired draft-clustered bootstrap) | pairs counted |`, '|---|---|---|---|',
  `| v2 | ${pct(s2.est)} | [${pct(s2.lo)}, ${pct(s2.hi)}] | ${cmp?.pop?.[names.v2]?.pairs_included ?? '-'} |`,
  `| v3 | ${pct(s3.est)} | [${pct(s3.lo)}, ${pct(s3.hi)}] | ${cmp?.pop?.[names.v3]?.pairs_included ?? '-'} |`, '',
  `- Spread: v3's upper ${pct(s3.hi)} ${spreadBelow ? '<' : 'is not below'} v2's lower ${pct(s2.lo)}${decided ? '' : ' (an interval is missing: undecided, so NOT SHOWN)'}.`,
  `- Pairs: ${lowPairs.length ? `v3 pair(s) wholly below ${FLOOR * 100}%: ${lowPairs.join(', ')}` : `no v3 pair wholly below ${FLOOR * 100}%`}.`,
  `- Paired difference v2 − v3 (description only): ${(() => { const d = cmp?.diff?.[names.v2]?.[names.v3]?.pair_spread; return d?.est === undefined ? '-' : `${pct(d.est)} [${pct(d.lo)}, ${pct(d.hi)}]`; })()}.`, '',
  `**Verdict: ${better ? 'v3 is BETTER BALANCED (by the rule)' : 'NOT SHOWN'}.**`, '');

// ---------------------------------------------------------------- information only
md.push('## Information only (decides nothing)', '', '### Colour pairs', '', '| pair | v2 rate | v2 Wilson (deff) | v2 games | v3 rate | v3 Wilson (deff) | v3 plain Wilson | v3 games |', '|---|---|---|---|---|---|---|---|');
const pairJ: Record<string, unknown> = {};
const keys = [...new Set([...p2, ...p3].map(([k]) => k))].sort();
for (const k of keys) {
  const a = p2.find(([x]) => x === k)?.[1], b = p3.find(([x]) => x === k)?.[1];
  const row = (p?: { w: number; g: number }) => p && p.g ? { rate: p.w / p.g, ci: wilson(p.w, p.g, DEFF), plain: wilson(p.w, p.g, 1), g: p.g } : null;
  const ra = row(a), rb = row(b);
  pairJ[k] = Object.fromEntries(([['v2', ra], ['v3', rb]] as const).filter(([, r]) => r).map(([s, r]) => [s, { rate: r6(r!.rate), lo: r6(r!.ci[0]), hi: r6(r!.ci[1]), plain_lo: r6(r!.plain[0]), plain_hi: r6(r!.plain[1]), games: r!.g, counted: r!.g >= minPair ? 1 : 0 }]));
  md.push(`| ${k} | ${ra ? pct(ra.rate) : '-'} | ${ra ? `[${pct(ra.ci[0])}, ${pct(ra.ci[1])}]` : '-'} | ${ra?.g ?? 0} | ${rb ? pct(rb.rate) : '-'} | ${rb ? `[${pct(rb.ci[0])}, ${pct(rb.ci[1])}]` : '-'} | ${rb ? `[${pct(rb.plain[0])}, ${pct(rb.plain[1])}]` : '-'} | ${rb?.g ?? 0} |`);
}
J.pairs = pairJ;

md.push('', '### Colours: inclusion and win rate when in the deck (main colours)', '', '| colour | v2 in % of decks | v2 win [Wilson, deff] | v3 in % of decks | v3 win [Wilson, deff] |', '|---|---|---|---|---|');
const colJ: Record<string, unknown> = {};
const colourOf = (s: Side, c: string) => {
  let decks = 0, w = 0, g = 0, all = 0;
  for (const d of s.drafts) for (const deck of d.decks) { all++; if (deck.key.includes(c)) { decks++; w += deck.wins; g += deck.decisive; } }
  return { incl: all ? decks / all : 0, rate: g ? w / g : 0, ci: wilson(w, g, DEFF), g };
};
for (const c of COLOURS) {
  const a = colourOf(sides.v2, c), b = colourOf(sides.v3, c);
  colJ[c] = { v2: { inclusion: r6(a.incl), rate: r6(a.rate), lo: r6(a.ci[0]), hi: r6(a.ci[1]), games: a.g }, v3: { inclusion: r6(b.incl), rate: r6(b.rate), lo: r6(b.ci[0]), hi: r6(b.ci[1]), games: b.g } };
  md.push(`| ${c} | ${pct(a.incl)} | ${pct(a.rate)} [${pct(a.ci[0])}, ${pct(a.ci[1])}] | ${pct(b.incl)} | ${pct(b.rate)} [${pct(b.ci[0])}, ${pct(b.ci[1])}] |`);
}
J.colours = colJ;

md.push('', `### Card flow per played deck (the study's ${FLOW.length} cards)`, '', '| decks | v2 | v3 |', '|---|---|---|');
const flowOf = (s: Side, c?: string): number => {
  const flow = new Set(FLOW.map((n) => s.pop.names.indexOf(n)).filter((i) => i >= 0));
  let decks = 0, n = 0;
  for (const d of s.drafts) for (const deck of d.decks) { if (c && !deck.key.includes(c)) continue; decks++; n += deck.cards.filter((i) => flow.has(i)).length; }
  return decks ? n / decks : 0;
};
const flowJ: Record<string, unknown> = {};
for (const [label, c] of [['all', undefined], ['U', 'U'], ['W', 'W'], ['R', 'R']] as const) {
  const a = flowOf(sides.v2, c), b = flowOf(sides.v3, c);
  flowJ[label] = { v2: r6(a), v3: r6(b) };
  md.push(`| ${label === 'all' ? 'every deck' : `decks with ${label}`} | ${a.toFixed(2)} | ${b.toFixed(2)} |`);
}
J.flow = flowJ;

md.push('', '### The eight swapped cards, their own numbers', '', '| card | cube | decks | in % of decks | decisive games | win rate | shrunk |', '|---|---|---|---|---|---|---|');
const cardJ: Record<string, unknown> = {};
const cardRow = (s: Side, n: string, label: string, key: string): void => {
  const u = cardUnits(s.pop, s.drafts).units.find((x) => x.name === n);
  const decks = s.drafts.length * 2;
  const row = u ? { decks: u.clumps ?? 0, games: u.games, rate: u.games ? u.wins / u.games : 0, shrunk: u.shrunk } : { decks: 0, games: 0, rate: 0, shrunk: 0 };
  cardJ[key] = { decks: row.decks, inclusion: r6(decks ? row.decks / decks : 0), games: row.games, rate: r6(row.rate), shrunk: r6(row.shrunk) };
  md.push(`| ${n} | ${label} | ${row.decks} | ${pct(decks ? row.decks / decks : 0)} | ${row.games} | ${row.games ? pct(row.rate) : '-'} | ${row.games ? pct(row.shrunk) : '-'} |`);
};
swappedOut.forEach((n, i) => cardRow(sides.v2, n, 'v2 (out)', `out${i + 1}`));
swappedIn.forEach((n, i) => cardRow(sides.v3, n, 'v3 (in)', `in${i + 1}`));
J.cards = cardJ;

md.push('', '### Card-rate flatness (compare\'s, ForgeCoach\'s flatness.ts)', '', '| cube | true SD (pts) | 95% interval | ForgeCoach\'s own interval | cards read |', '|---|---|---|---|---|');
const flatJ: Record<string, unknown> = {};
for (const k of ['v2', 'v3'] as const) {
  const f = cmp?.pop?.[names[k]]?.m?.flatness ?? {}, d = cmp?.pop?.[names[k]]?.flatness_detail ?? {};
  flatJ[k] = { est: r6(f.est ?? -1), lo: r6(f.lo ?? -1), hi: r6(f.hi ?? -1), cards: d.n ?? 0 };
  md.push(`| ${k} | ${pct(f.est, 2)} | [${pct(f.lo, 2)}, ${pct(f.hi, 2)}] | [${pct(d.fc_lo, 2)}, ${pct(d.fc_hi, 2)}] | ${d.n ?? 0} |`);
}
J.flatness = flatJ;
md.push('', `Swapped out of v2: ${swappedOut.join(', ')}. Into v3: ${swappedIn.join(', ')}.`, '');

const check = (o: unknown, at: string): void => {
  if (typeof o === 'number') { if (!Number.isFinite(o)) throw new Error(`${at} is not finite`); return; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`${at}: numbers only`);
  for (const [k, v] of Object.entries(o)) { if (!/^[A-Za-z0-9_]+$/.test(k)) throw new Error(`${at}.${k}: bad key`); check(v, `${at}.${k}`); }
};
check(J, 'v2v3.json');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'v2v3.json'), `${JSON.stringify(J, null, 1)}\n`);
fs.writeFileSync(path.join(out, 'v2v3.md'), `${md.join('\n')}\n`);
console.log(`v2v3: ${better ? 'BETTER BALANCED' : 'NOT SHOWN'} (decided ${decided}, spread below ${spreadBelow}, no low pair ${noLowPair}); wrote ${path.join(out, 'v2v3.json')} and v2v3.md`);
TS
node -e '
  const fs = require("node:fs");
  const ok = (v) => { const t = fs.readFileSync("var/lab-j137/check-" + v + ".txt", "utf8");
    return /^cards listed\s+180$/m.test(t) && /^in Forge.s DB\s+180$/m.test(t) && /^unsupported\s+0$/m.test(t) ? 1 : 0; };
  const sha = fs.readFileSync("var/lab-j137/sha.txt", "utf8");
  const doc = { v2_db: ok("v2"), v3_db: ok("v3"),
    v2_sha: /synergy-v2-cube-180\.md: OK$/m.test(sha) ? 1 : 0, v3_sha: /synergy-v3-cube-180\.md: OK$/m.test(sha) ? 1 : 0 };
  fs.writeFileSync("var/lab-j137/cubes.json", JSON.stringify(doc) + "\n");
  console.log(JSON.stringify(doc));
'
# LAST: Justin's word. Only the PC session writes results/J135/APPROVED, and only when he says so.
git -C "$PCR" cat-file -e origin/pc-results:results/J135/APPROVED 2>/dev/null && echo 1 > var/lab-j137/approved.txt || echo 0 > var/lab-j137/approved.txt
cat var/lab-j137/approved.txt
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J137
tools/cubelab.sh compare --variant synergy_v2=var/lab-j137/cubes/synergy-v2-cube-180.md \
    --variant synergy_v3=var/lab-j137/cubes/synergy-v3-cube-180.md --min-pair-games 1 \
    --drafts 6 --games 3 --jobs {workers} --seed 837900001 --out var/lab-j137/pilot
node var/lab-j137/v2v3.mts --compare var/lab-j137/pilot --v2 var/lab-j137/cubes/synergy-v2-cube-180.md \
    --v3 var/lab-j137/cubes/synergy-v3-cube-180.md --min-pair-games 1 --out var/lab-j137/pilot/out
head -30 var/lab-j137/pilot/out/v2v3.md
```
metrics: merged = sh: cat var/lab-j137/merged.txt 2>/dev/null || echo 0
metrics: has_compare = sh: cat var/lab-j137/has-compare.txt 2>/dev/null || echo 0
metrics: cubes = sh: cat var/lab-j137/cubes.json 2>/dev/null || echo '{"v2_db":0}'
metrics: pc = sh: cat var/lab-j137/pilot/compare.json 2>/dev/null || echo '{"written":0}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j137/pilot/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pv = sh: cat var/lab-j137/pilot/out/v2v3.json 2>/dev/null || echo '{"schema":0}'
metrics: pe = cubelab var/lab-j137/pilot/runs
metrics: approved = sh: cat var/lab-j137/approved.txt 2>/dev/null || echo 0
check: merged == 1
check: has_compare == 1
check: qwriters == 0
check: cubes.v2_sha == 1
check: cubes.v3_sha == 1
check: cubes.v2_db == 1
check: cubes.v3_db == 1
check: pstrict == 1
check: pc.same_seeds == 1
check: pc.populations == 2
check: pc.drafts == 6
check: pc.seed_first == 837900001
check: pc.seed_last == 837900006
check: pc.boot.replicates == 1000
check: pv.schema == 1
check: pv.drafts_v2 == 6
check: pv.drafts_v3 == 6
check: pv.swapped_out == 8
check: pv.swapped_in == 8
check: pv.flow_cards == 17
check: pe.drafts == 12
check: pe.engine_errors == 0
check: pe.recorded_games == 0
check: approved == 1

What the pilot asks: the pin is merged and holds compare; both cubes are the sha-checked files, and each is 180
cards that Forge 2.0.14 has and supports; the two cubes differ by exactly the study's eight swaps; compare ran both
populations on the same six seeds and wrote strict JSON; the analysis wrote every table as strict numbers-only
JSON. Then, last, whether Justin has approved: until `results/J135/APPROVED` exists the pilot fails there, and the
runner never reaches the 3,000 drafts. The pilot's verdict (at a floor of 1 game and 6 drafts) means nothing and
is not read.

Dry run (2026-10-16, `tools/runner.sh dry-run --max-seconds 120 --workers 2`, user-namespace sandbox, against
the compare worktree at bb980366, ForgeCoach overlaid from a checkout with 3e3b007b's unchanged v2): pilot1 ok in
10 s, pilot2 ok in 86 s. 22 of the 24 pilot checks passed: both sha256s, both cubes 180/180 in Forge, 8 out and 8 in,
the six-seed compare strict and paired, and v2v3.json/.md written with every table. Two failed, as they must
before the merge and before Justin's word: `merged == 1` (bb980366 is not on origin/main yet) and `approved == 1`
(no `results/J135/APPROVED` on origin/pc-results). The commands block, run anyway by the dry run, refused at its
first line, the second approval gate: `fatal: path 'results/J135/APPROVED' does not exist in 'origin/pc-results'`.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J137
git -C /home/justin-a/code/lab/pc-results cat-file -e origin/pc-results:results/J135/APPROVED
test -s var/lab-j137/v2v3.mts
sha256sum -c <<'SHA'
8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36  var/lab-j137/cubes/synergy-v2-cube-180.md
61989547fb03548e349f5b6c85571fbca89da0ba439140e70a15a9c960fab65c  var/lab-j137/cubes/synergy-v3-cube-180.md
SHA
tools/cubelab.sh compare --variant synergy_v2=var/lab-j137/cubes/synergy-v2-cube-180.md \
    --variant synergy_v3=var/lab-j137/cubes/synergy-v3-cube-180.md --min-pair-games 40 \
    --drafts 1500 --games 3 --jobs {workers} --seed 837000001 --out var/lab-j137/compare
node var/lab-j137/v2v3.mts --compare var/lab-j137/compare --v2 var/lab-j137/cubes/synergy-v2-cube-180.md \
    --v3 var/lab-j137/cubes/synergy-v3-cube-180.md --min-pair-games 40 --out var/lab-j137/out
cp var/lab-j137/compare/compare.json var/lab-j137/out/compare.json
cp var/lab-j137/compare/compare.md var/lab-j137/out/compare.md
cat var/lab-j137/out/v2v3.md
```
check: strict == 1
check: cmp.same_seeds == 1
check: cmp.populations == 2
check: cmp.drafts == 1500
check: cmp.seed_first == 837000001
check: cmp.seed_last == 837001500
check: cmp.min_pair_games == 40
check: cmp.boot.replicates == 1000
check: vv.schema == 1
check: vv.drafts_v2 == 1500
check: vv.drafts_v3 == 1500
check: vv.min_pair_games == 40
check: vv.swapped_out == 8
check: vv.swapped_in == 8
check: all.drafts == 3000
check: all.engine_error_rate <= 2%
check: all.recorded_games == 0

What the checks mean: both cubes were drafted on exactly the 1,500 seeds, with compare's 1,000 replicates and a
pair floor of 40, and the analysis read them all. No check is on the verdict: BETTER BALANCED and NOT SHOWN are
both results. `vv.verdict.decided` is 0 only if a spread interval is missing, which reads as NOT SHOWN.

## Abort if
abort: qwriters > 0
abort: all.drafts >= 500 and all.engine_errors > 0.02 * all.drafts
abort: all.games >= 500 and all.timeouts > 0.05 * all.games
- Free disk under 10 GB.

## Report
collect: var/lab-j137/out/v2v3.json
collect: var/lab-j137/out/v2v3.md
collect: var/lab-j137/out/compare.json
collect: var/lab-j137/out/compare.md

summary.md (the PC session's; the job's own outputs are the four files above):
- The verdict in one line, exactly as v2v3.md gives it: **v3 is BETTER BALANCED** or **NOT SHOWN**. Never "no
  change", and never "worse": the rule tests one direction.
- The two pair spreads with their intervals and the two halves of the rule (spread: v3's upper bound against v2's
  lower; pairs: any v3 pair wholly below 35%). The paired difference is description only.
- Information only: the colours' inclusion and win rates side by side (did blue rise and white fall, as the study
  guessed?), card flow per deck, the eight swapped cards' own numbers, and the flatness of both.
- A pass ships nothing: Justin decides whether v3 ships. Engine errors, timeouts and wall time.
