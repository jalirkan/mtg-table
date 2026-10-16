// mtg-table — the cube lab's commands.  Run it through tools/cubelab.sh.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   check   <cube.md>                       every card against the engine's database
//   library-candidates --fc <ForgeCoach> [--out cubes/library] [--seed 180] [--min-games 80]   the library pool and its candidate 180s (library-candidates.ts)
//   census build --fc <ForgeCoach> [--editions <dir>] [--pool <tsv>] [--out cubes/library/census.tsv] [--check]   the census's population (census.ts, D445)
//   sample  --band <pauper|peasant|legacy|powered|all> --structure <mono-heavy|two-colour|three-colour|good-stuff> --seed S --count N --out <dir>
//           [--cross-band 0.10] [--allow-ai-flagged] [--census <tsv>] [--pool <tsv>]   stratified cube documents from the census (sample.ts, D445)
//   ratings init <cube.md> [--out <tsv>] [--force]
//   ratings apply <cube.md> --from <evolve-dir|changelog.md> --rule explore-eb --out <tsv> [--base <tsv>] [--report <md>]
//           raise the low-rated cards exploration found holding their own (D360, raisecmd.ts)
//   run     <cube.md> [--format grid|winston] [--drafts N] [--games 3] [--jobs K]
//           [--seed S] [--profiles Default,Default] [--ratings <tsv>] [--record M]
//           [--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25]  each drafter's AI drawn per draft, seeded (D347)
//           [--record-all | --record-every N]                  every game, both chairs, in the worker (D315)
//           [--out <dir>] [--builder lab|forge] [--game-timeout <sec>]
//           [--winston-cards 90] [--weights <json>] [--weight name=value]...
//           [--synergy <tsv>] [--deck-synergy on|off]          learned pairs (D301)
//           [--allow-version-change]                           append to a folder another lab version wrote (D341)
//           [--play-explore on | --play-explore name=value]... a share of drafts whose games explore (D358):
//                                                              share=0.15 epsilon=0.05 closecall=0.02 opening=off
//           [--deckset]                                        the AI ladder's deck sets: reserved seeds, --games 0 (D340)
//           [--drafter human-picks:<x.picks.json> [--drafter-seat A|B]]   one seat drafts with ForgeCoach's human
//                                                              pick model, the other as always; grid only (D416)
//           [--drafter forge-ranks | llm:<haiku|sonnet|opus|fake>[:thinking=off|low|default] [--drafter-seat A|B]]
//           [--llm-sees-opponent] [--llm-jobs 2]               Forge's ranks, or Claude asked once a decision (D439)
//           [--llm-max-calls N] [--llm-max-usd 5|none] [--llm-fallback-rate 0.25]   the LLM's spend cap and fallback stop
//   run     --bridge <a,b[,c]> [--bridge-ratio 0.5,0.5] [--bridge-size 180] [--bridge-ratings even|own] [run's flags]   a pool mixed from cubes (bridge.ts)
//   queue   plan|run|check --night N --drafts D [--bridge-share 0.2] [--jobs K] [--root <dir>]   the overnight mix (queue.ts)
//           [--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25]   each drafter's AI drawn per draft (D375; off by default)
//   learn   <run-dir...> --out <x.ratings.tsv> [--cube <cube.md>] [--prior <tsv>] [--learn name=value]...   (D301)
//   selfplay <cube.md> [--iterations 2] [--drafts-per-iter 30] [--h2h N] [--deck-h2h N] [--deck-synergy on|off]
//           [--from <run-dir>]... [--jobs K] [--seed S] [--out <dir>]   (D302; learncmd.ts has every flag)
//   report  <out> [--min-games N] [--play-explore include|exclude|only]   <out>/report.html, report.md, summary.json and meta.json
//   meta    <out> [--cube <cube.md>] [--min-pair-games 6] [--max-pairs 300] [--play-explore include|exclude|only]   <out>/meta.json (ForgeCoach, D297)
//           (both leave drafts whose games explored OUT by default: D358)
//   evolve  <cube.md> --pool <pool.tsv> [--notes <tsv>] [--generations G] [--drafts-per-gen N] [--jobs K]
//           [--seed S] [--out <dir>] [--swaps M] [--games 3] [--evolve name=value]...   (D299-D300, D331)
//           [--record-all | --record-every N]                  record both batches' games (D315)
//           [--explore on | --explore name=value]...           controlled exploration of low-rated cards (D356):
//                                                              share=0.3 cap=4 gold=4 margin=0.1 minDecks=10
//   watch   <cube.md> [--format grid] [--seed S] [--games 3] [--drafter-a lab|human-picks:<f>] [--drafter-b ...]
//           [--player-a <Profile>|search] [--player-b ...] [--pace 600] [--out <dir>]   (D440, watch.ts)
//           ONE grid draft (run --drafts 1 --games 0), draft.json, then a paced best of N recorded from seat 0's eyes
//   compare <cubeA.md> <cubeB.md>... [--variant name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...]... [--drafts N] [--seed S]
//           [--games 3] [--jobs K] [--out <dir>] [--boot 1000] [--min-pair-games 30] [--rule <measure>:lower-better:margin=x]...
//           [--no-run]   2-6 populations on the same seeds, through `run`; balance measures with paired bootstrap intervals (D441)
//
// docs/guides/cube-lab.md is the manual; D293-D296 are the decisions.

import fs from 'node:fs';
import path from 'node:path';

import { parseCube } from './cube.ts';
import { engineEnv, engineFacts } from './engine.ts';
import { GUILD } from './cards.ts';
import { initialRating, ratingsTsv } from './ratings.ts';
import { ratingsApply } from './raisecmd.ts';
import { buildMeta, DEFAULT_META } from './meta.ts';
import { aggregate, renderHtml, renderMarkdown, type CardInfo, type Recording } from './report.ts';
import { defaultRatings, runLab, type DraftRecord, type RunMeta, type RunOptions } from './run.ts';
import { DEFAULT_WEIGHTS, mergeWeights, parseWeightArgs } from './weights.ts';
import { learnCommand, selfplayCommand } from './learncmd.ts';
import { bridgeOptions } from './bridge.ts';
import { DRAFTER_SPECS, parseDrafter } from './drafters.ts';
import { LlmBudget, llmCapsOf, MAX_LLM_JOBS } from './llmdraft.ts';
import { checkProfiles, isSeatSpec, mixText, parseProfileMix } from './profiles.ts';
import { queueCommand } from './queue.ts';
import { filterPlayExplore, parsePlayExploreArgs, playExploreText } from './playexplore.ts';
import { EVOLVE_DEFAULTS, mergeKnobs } from './evolve.ts';
import { defaultNotes, evolve, parseExploreArgs } from './evolve-run.ts';
import { readJsonLines } from './lines.ts';
import { watchCommand } from './watch.ts';
import { compareCommand } from './compare.ts';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const say = (s: string): void => { process.stdout.write(`${s}\n`); };

function usage(msg?: string): never {
  if (msg) process.stderr.write(`cubelab: ${msg}\n`);
  process.stderr.write(`usage: tools/cubelab.sh check <cube.md>
       tools/cubelab.sh ratings init <cube.md> [--out <tsv>] [--force]
       tools/cubelab.sh ratings apply <cube.md> --from <evolve-dir|changelog.md> --rule explore-eb --out <tsv>
                        [--base <tsv>] [--report <md>] [--raise name=value]... [--explore name=value]...   (D360)
       tools/cubelab.sh run <cube.md> [--format grid|winston] [--drafts N] [--games 3] [--jobs K] [--seed S]
                        [--profiles Default,Default] [--ratings <tsv>] [--record M] [--out <dir>]
                        [--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25]   (seat specs: <Profile>[+outlets][+search[:k=v]])
                        [--record-all | --record-every N]
                        [--builder lab|forge] [--game-timeout <sec>] [--winston-cards 90]
                        [--weights <json>] [--weight name=value]... [--synergy <tsv>] [--deck-synergy on|off]
                        [--allow-version-change] [--deckset]   (seeds 900000000+ are the deck sets', seeds.ts)
                        [--play-explore on | --play-explore share=0.15,epsilon=0.05,closecall=0.02,opening=off]   (D358)
                        [--drafter human-picks:<x.picks.json> | forge-ranks | llm:<model>[:thinking=off|low|default]]
                        [--drafter-seat A|B] [--llm-sees-opponent] [--llm-jobs 1..4]   (D416, D439; grid)
                        [--llm-max-calls N] [--llm-max-usd 5|none] [--llm-fallback-rate 0.25]   (the LLM's caps)
       tools/cubelab.sh run --bridge <a,b[,c]> [--bridge-ratio 0.5,0.5] [--bridge-size 180] [--bridge-ratings even|own]
                        [the flags above but --ratings]
       tools/cubelab.sh queue plan|run|check --night N --drafts D [--bridge-share 0.2] [--jobs K] [--games 1] [--root <dir>]
                        [--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25]   (D375; off: Default vs Default)
                        [--cubes a,b,...] [--power <power.tsv>] [--chunk 250] [--allow-version-change]
                        [--record-every N] [--play-explore share=0.15,epsilon=0.05,closecall=0.02,opening=off]   (D358)
       tools/cubelab.sh learn <run-dir...> --out <x.ratings.tsv> [--cube <cube.md>] [--prior <tsv>] [--learn name=value]...
       tools/cubelab.sh selfplay <cube.md> [--iterations 2] [--drafts-per-iter 30] [--h2h N] [--deck-h2h N]
                        [--deck-synergy on|off] [--from <run-dir>]... [--jobs K] [--seed S] [--out <dir>] [--ratings <tsv>]
       tools/cubelab.sh report <out> [--min-games N] [--play-explore include|exclude|only]
       tools/cubelab.sh meta <out> [--cube <cube.md>] [--min-pair-games 6] [--max-pairs 300] [--play-explore include|exclude|only]
       tools/cubelab.sh evolve <cube.md> --pool <pool.tsv> [--notes <tsv>] [--generations G] [--drafts-per-gen N]
                        [--jobs K] [--seed S] [--out <dir>] [--swaps M] [--games 3] [--profiles A,B]
                        [--ratings <tsv>] [--game-timeout <sec>] [--date YYYY-MM-DD] [--evolve name=value]...
                        [--record-all | --record-every N] [--explore on | --explore name=value]...   (D356)
       tools/cubelab.sh watch <cube.md> [--format grid] [--seed S] [--games 3] [--drafter-a lab|human-picks:<f>] [--drafter-b ...]
                        [--player-a <Profile>|search] [--player-b ...] [--pace 600] [--out <dir>] [--ratings <tsv>]   (D440)
       tools/cubelab.sh census build --fc <ForgeCoach> [--editions <dir>] [--pool <tsv>] [--out cubes/library/census.tsv] [--check]   (D445, no engine)
       tools/cubelab.sh sample --band <pauper|peasant|legacy|powered|all> --structure <mono-heavy|two-colour|three-colour|good-stuff>
                        --seed S --count N --out <dir> [--cross-band 0.10] [--allow-ai-flagged] [--census <tsv>] [--pool <tsv>]   (D445, no engine)
       tools/cubelab.sh compare <cubeA.md> <cubeB.md>... [--variant name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...]...
                        [--drafts N] [--seed S] [--games 3] [--jobs K] [--out <dir>] [--boot 1000] [--boot-seed 1]
                        [--min-pair-games 30] [--rule <measure>:lower-better|higher-better[:margin=x]]... [--no-run]
                        [run's other flags, for every population]   (D441: the same seeds; compare.json, compare.md)
`);
  process.exit(2);
}

function flags(argv: string[]): { pos: string[]; f: Map<string, string[]> } {
  const pos: string[] = [];
  const f = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === '--force') { f.set('force', ['1']); continue; }
    if (a === '--record-all') { f.set('record-all', ['1']); continue; }
    if (a === '--deckset' || a === '--allow-version-change' || a === '--llm-sees-opponent' || a === '--no-run' || a === '--check' || a === '--allow-ai-flagged') { f.set(a.slice(2), ['1']); continue; }
    if (a.startsWith('--')) {
      const v = argv[++i];
      if (v === undefined) usage(`${a} needs a value`);
      f.set(a.slice(2), [...(f.get(a.slice(2)) ?? []), v]);
    } else pos.push(a);
  }
  return { pos, f };
}
const one = (f: Map<string, string[]>, k: string): string | undefined => f.get(k)?.at(-1);
const int = (f: Map<string, string[]>, k: string, d: number): number => {
  const v = one(f, k);
  if (v === undefined) return d;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) usage(`--${k} wants a whole number, got "${v}"`);
  return n;
};

function check(cubeFile: string): number {
  const env = engineEnv(REPO);
  const cube = parseCube(fs.readFileSync(cubeFile, 'utf8'));
  const facts = engineFacts(env, cube.cards.map((c) => c.name), say);
  say(`== ${cubeFile}: ${cube.title}`);
  say(`sections        ${cube.sections.map((s) => `${s.name} ${s.parsed}/${s.expected}`).join(', ')}`);
  for (const w of cube.warnings) say(`WARNING         ${w}`);
  const found = facts.filter((f) => f.found);
  const missing = facts.filter((f) => !f.found);
  say(`cards listed    ${cube.cards.length}`);
  say(`in Forge's DB   ${found.length}${missing.length ? `   MISSING ${missing.length}` : ''}`);
  for (const m of missing) say(`  MISSING       ${m.listed}   did you mean: ${(m.suggestions ?? []).join(' | ') || '-'}`);
  const mdfc = found.filter((f) => f.otherFace);
  if (mdfc.length) say(`two-faced       ${mdfc.length}: ${mdfc.map((f) => `${f.name} // ${f.otherFace}`).join('; ')}  (looked up by the front face)`);
  const renamed = found.filter((f) => f.name !== f.listed);
  for (const f of renamed) say(`  NAME          listed "${f.listed}" -> Forge "${f.name}"`);
  const unsupported = found.filter((f) => f.unsupported);
  say(`unsupported     ${unsupported.length}${unsupported.length ? `: ${unsupported.map((f) => f.name).join(', ')}` : ''}`);
  const rem = found.filter((f) => f.remAIDeck);
  say(`AI:RemAIDeck    ${rem.length} (Forge: its AI plays these poorly or not at all)`);
  for (const f of rem) say(`  ${f.name}`);
  const remR = found.filter((f) => f.remRandomDeck);
  say(`AI:RemRandomDeck ${remR.length}${remR.length ? `: ${remR.map((f) => f.name).join(', ')}` : ''} (left out of Forge's random decks; harmless here)`);
  const bySource = { cube: 0, set: 0, none: 0 };
  for (const f of found) bySource[f.rank?.source ?? 'none']++;
  say(`draft ranks     CubeCobra list ${bySource.cube}, a set's rank file only ${bySource.set}, none ${bySource.none}`);
  const unranked = found.filter((f) => (f.rank?.source ?? 'none') === 'none');
  say(`unranked        ${unranked.length} (Forge would score these -100 and draft them last; the lab starts them at ${DEFAULT_WEIGHTS.unrated})`);
  for (const f of unranked) say(`  ${f.name}`);
  const setOnly = found.filter((f) => f.rank?.source === 'set' && f.rank.edition !== f.rank.defaultEdition);
  if (setOnly.length) say(`best printing   ${setOnly.length} card(s) are ranked only under an older printing than Forge's default (the lab uses that rank): ${setOnly.map((f) => `${f.name} [${f.rank?.edition}]`).join(', ')}`);
  return missing.length > 0 ? 1 : 0;
}

function ratingsInit(cubeFile: string, out: string | undefined, force: boolean): number {
  const env = engineEnv(REPO);
  const cube = parseCube(fs.readFileSync(cubeFile, 'utf8'));
  const facts = engineFacts(env, cube.cards.map((c) => c.name), say);
  const file = out ?? `${cubeFile.replace(/\.md$/, '')}.ratings.tsv`;
  if (fs.existsSync(file) && !force) usage(`${file} exists -- edit it, or pass --force to overwrite it`);
  const rows = facts.filter((f) => f.found).map((f) => initialRating(f, DEFAULT_WEIGHTS.unrated));
  fs.writeFileSync(file, ratingsTsv(cube.title, rows, DEFAULT_WEIGHTS.unrated));
  say(`wrote ${rows.length} ratings to ${file} (${rows.filter((r) => r.source === 'none').length} unranked at ${DEFAULT_WEIGHTS.unrated})`);
  return 0;
}

async function run(cubeFile: string, f: Map<string, string[]>): Promise<number> {
  const env = engineEnv(REPO);
  const format = (one(f, 'format') ?? 'grid') as 'grid' | 'winston';
  if (format !== 'grid' && format !== 'winston') usage(`--format is grid or winston, got ${format}`);
  const builder = (one(f, 'builder') ?? 'lab') as 'lab' | 'forge';
  if (builder !== 'lab' && builder !== 'forge') usage(`--builder is lab or forge, got ${builder}`);
  // a seat spec's search knobs are separated by "/" here, as in --profile-mix (the "," separates the seats)
  const profiles = (one(f, 'profiles') ?? 'Default,Default').split(',').map((p) => p.replace(/\//g, ','));
  if (profiles.length !== 2 || profiles.some((p) => !p)) usage('--profiles wants two names, e.g. Default,Reckless');
  if (profiles.some((p) => !isSeatSpec(p))) usage('--profiles wants two seat specs, e.g. Default,Reckless+search:ms=1000/turns=0');
  let profileMix;
  if (one(f, 'profile-mix') !== undefined) {
    if (one(f, 'profiles') !== undefined) usage('--profiles and --profile-mix: give one');
    try { profileMix = parseProfileMix(one(f, 'profile-mix') as string); } catch (e) { usage((e as Error).message); }
  }
  const aiDir = path.join(REPO, 'forge-home', 'res', 'ai');
  try {
    checkProfiles(profileMix ? profileMix.map((m) => m.spec) : profiles,
      fs.existsSync(aiDir) ? fs.readdirSync(aiDir).filter((n) => n.endsWith('.ai')).map((n) => n.slice(0, -3)) : null);
  } catch (e) { usage((e as Error).message); }
  let weights = DEFAULT_WEIGHTS;
  for (const wf of f.get('weights') ?? []) weights = mergeWeights(weights, JSON.parse(fs.readFileSync(wf, 'utf8')) as Record<string, unknown>);
  weights = mergeWeights(weights, parseWeightArgs(f.get('weight') ?? []));
  const seed = int(f, 'seed', 1);
  const ratingsFile = one(f, 'ratings') ?? defaultRatings(cubeFile);
  const o: RunOptions = {
    cubeFile, format, drafts: int(f, 'drafts', 10), games: int(f, 'games', 3), jobs: Math.max(1, int(f, 'jobs', 1)), seed,
    profiles: [profiles[0] as string, profiles[1] as string], ratingsFile, record: int(f, 'record', 0),
    ...(profileMix ? { profileMix } : {}),
    recordEvery: one(f, 'record-all') ? 1 : int(f, 'record-every', 0),
    out: one(f, 'out') ?? path.join('var/cubelab/runs', `${path.basename(cubeFile, '.md')}-${format}-${seed}`),
    builder, gameTimeoutSec: int(f, 'game-timeout', 300), winstonCards: int(f, 'winston-cards', 90), weights,
    ...(one(f, 'synergy') ? { synergyFile: one(f, 'synergy') as string, deckSynergy: one(f, 'deck-synergy') === 'on' } : {}),
    ...(f.has('deckset') ? { deckset: true } : {}),
    ...(f.has('allow-version-change') ? { allowVersionChange: true } : {}),
  };
  try {
    const pe = parsePlayExploreArgs(f.get('play-explore') ?? []);
    if (pe) o.playExplore = pe;
  } catch (e) { usage((e as Error).message); }
  if (one(f, 'deck-synergy') === 'on' && !one(f, 'synergy')) usage('--deck-synergy on needs --synergy <tsv>');
  const drafterArg = one(f, 'drafter');
  if (drafterArg !== undefined) {
    const spec = parseDrafter(drafterArg);
    if (!spec) usage(`--drafter wants ${DRAFTER_SPECS}, got ${drafterArg}`);
    const seat = one(f, 'drafter-seat') ?? 'A';
    if (seat !== 'A' && seat !== 'B') usage(`--drafter-seat is A or B, got ${seat}`);
    if (spec.kind === 'human-picks') {
      if (!fs.existsSync(spec.file)) usage(`--drafter: no file ${spec.file}`);
      o.drafter = { ...spec, seat };
    } else if (spec.kind === 'forge-ranks') o.drafter = { kind: 'forge-ranks', seat };
    else {
      o.drafter = { kind: 'llm', model: spec.model, thinking: spec.thinking, seat, seesOpponent: f.has('llm-sees-opponent') };
      o.llmJobs = int(f, 'llm-jobs', 2);
      if (o.llmJobs < 1 || o.llmJobs > MAX_LLM_JOBS) usage(`--llm-jobs is 1..${MAX_LLM_JOBS} (each is one claude -p at a time, and the spend cap projects per lane), got ${o.llmJobs}`);
      try { o.llmBudget = new LlmBudget(llmCapsOf((k) => one(f, k))); } catch (e) { usage((e as Error).message); }
    }
  } else if (one(f, 'drafter-seat') !== undefined) usage('--drafter-seat needs --drafter');
  const llmFlags = ['llm-sees-opponent', 'llm-jobs', 'llm-max-calls', 'llm-max-usd', 'llm-fallback-rate'];
  if (o.drafter?.kind !== 'llm' && llmFlags.some((k) => f.has(k))) usage(`${llmFlags.map((k) => `--${k}`).join(', ')} need --drafter llm:<model>`);
  const bridgeArg = one(f, 'bridge');
  if (bridgeArg) {
    if (cubeFile || one(f, 'ratings')) usage('--bridge names its cubes itself (no cube file, no --ratings: each cube keeps its own ratings)');
    o.bridge = bridgeOptions(REPO, bridgeArg, one(f, 'bridge-ratio'), int(f, 'bridge-size', 180), one(f, 'bridge-ratings') ?? 'even');
    o.cubeFile = `bridge:${o.bridge.sources.map((s) => s.id).join('+')}`;
    o.ratingsFile = null;
    if (!one(f, 'out')) o.out = path.join('var/cubelab/runs', `bridge-${o.bridge.sources.map((s) => s.id).join('+')}-${format}-${seed}`);
    say(`bridge: ${o.bridge.sources.map((s, i) => `${s.id} ${Math.round((o.bridge?.shares[i] ?? 0) * 100)}%`).join(' + ')} of ${o.bridge.size} cards, sampled afresh for every draft from its seed`);
  }
  if (o.jobs > env.homes.length) usage(`--jobs ${o.jobs} but only ${env.homes.length} Forge home(s) were built (tools/cubelab.sh builds --jobs of them)`);
  // --games 0 drafts and builds only, plays nothing (the AI ladder's deck sets, D318); a report of such a run has no games
  if (o.games < 0) usage('--games must be 0 or more');
  if (one(f, 'record-all') && f.has('record-every')) usage('--record-all is --record-every 1; give one');
  say(`cube lab: ${cubeFile}, ${format}, ${o.drafts} draft(s) from seed ${seed}, best of ${o.games}, ${o.jobs} job(s), AI ${o.profileMix ? `mixed per drafter (${mixText(o.profileMix)})` : o.profiles.join(' vs ')}, ratings ${ratingsFile ?? "Forge's ranks"}, out ${o.out}${o.recordEvery ? `, recording ${o.recordEvery === 1 ? 'every game' : `every game of every ${o.recordEvery}th draft`} (both chairs) into ${path.join(o.out, 'games')}` : ''}${o.playExplore ? `, play exploration ${playExploreText(o.playExplore)} (D358)` : ''}${o.drafter ? `, seat ${o.drafter.seat} drafting with ${o.drafter.kind === 'human-picks' ? `human picks ${o.drafter.file} (D416)` : o.drafter.kind === 'llm' ? `llm:${o.drafter.model} (thinking ${o.drafter.thinking}, D439)` : "Forge's ranks (D439)"}` : ''}`);
  await runLab(env, o, say);
  say(`next: tools/cubelab.sh report ${o.out}`);
  return 0;
}

/**
 * A run folder's files.  Drafts whose games explored (D358) are left out unless `playExplore` says otherwise:
 * a random move is not the deck's strength, so every win rate the report and meta.json print would be biased.
 */
export function readRun(out: string, playExplore: 'include' | 'exclude' | 'only' = 'exclude'): { meta: RunMeta; cards: Record<string, CardInfo>; recs: DraftRecord[]; recordings: Recording[]; playExploreDropped: number } {
  const meta = JSON.parse(fs.readFileSync(path.join(out, 'run.json'), 'utf8')) as RunMeta;
  const cards = JSON.parse(fs.readFileSync(path.join(out, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  const jsonl = path.join(out, 'drafts.jsonl');
  const all = fs.existsSync(jsonl) ? readJsonLines<DraftRecord>(jsonl) : [];
  const { recs, dropped } = filterPlayExplore(all, playExplore);
  const rf = path.join(out, 'recordings.json');
  const recordings = fs.existsSync(rf) ? JSON.parse(fs.readFileSync(rf, 'utf8')) as Recording[] : [];
  return { meta, cards, recs, recordings, playExploreDropped: dropped };
}

function playExploreMode(f: Map<string, string[]>): 'include' | 'exclude' | 'only' {
  const m = one(f, 'play-explore') ?? 'exclude';
  if (m !== 'include' && m !== 'exclude' && m !== 'only') usage(`--play-explore here is include, exclude or only, got ${m}`);
  return m;
}

export function pairNames(meta: RunMeta): Record<string, string> {
  // A run.json written before the parser keyed pairs in WUBRG order may say GW.
  const plans: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta.archetypes ?? {})) plans[[...k].sort((a, b) => 'WUBRG'.indexOf(a) - 'WUBRG'.indexOf(b)).join('')] = v;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(GUILD)) out[k] = plans[k] ? `${v}: ${plans[k]}` : v;
  return out;
}

function report(out: string, f: Map<string, string[]>): number {
  const { meta, cards, recs, recordings, playExploreDropped } = readRun(out, playExploreMode(f));
  if (playExploreDropped > 0) say(`${playExploreDropped} draft(s) whose games explored (D358) left out (--play-explore include keeps them)`);
  const s = aggregate(meta, cards, recs, recordings, { pairs: pairNames(meta), themes: meta.themeNames ?? {} });
  fs.writeFileSync(path.join(out, 'report.html'), renderHtml(s));
  fs.writeFileSync(path.join(out, 'report.md'), renderMarkdown(s, int(f, 'min-games', 6)));
  fs.writeFileSync(path.join(out, 'summary.json'), `${JSON.stringify(s, null, 1)}\n`);
  writeMeta(out, f);
  say(`${recs.length} draft(s): ${path.join(out, 'report.html')}, ${path.join(out, 'report.md')}, ${path.join(out, 'meta.json')}`);
  return 0;
}

/** <out>/meta.json, ForgeCoach's draft and deck assistant's input (schema 1, D297). */
function writeMeta(out: string, f: Map<string, string[]>): string {
  const { meta, cards, recs } = readRun(out, playExploreMode(f));
  const cubeFile = one(f, 'cube') ?? path.join(REPO, meta.cubeFile);
  const cube = fs.existsSync(cubeFile) ? parseCube(fs.readFileSync(cubeFile, 'utf8')) : null;
  const doc = buildMeta(meta, cards, recs, cube, {
    minPairGames: int(f, 'min-pair-games', DEFAULT_META.minPairGames), maxPairs: int(f, 'max-pairs', DEFAULT_META.maxPairs),
  });
  const file = path.join(out, 'meta.json');
  fs.writeFileSync(file, `${JSON.stringify(doc)}\n`);
  return file;
}

async function evolveCmd(cubeFile: string, f: Map<string, string[]>): Promise<number> {
  const env = engineEnv(REPO);
  const poolFile = one(f, 'pool');
  if (!poolFile) usage('evolve needs --pool <pool.tsv>');
  const profiles = (one(f, 'profiles') ?? 'Default,Default').split(',');
  if (profiles.length !== 2 || profiles.some((p) => !p)) usage('--profiles wants two names, e.g. Default,Reckless');
  let weights = DEFAULT_WEIGHTS;
  for (const wf of f.get('weights') ?? []) weights = mergeWeights(weights, JSON.parse(fs.readFileSync(wf, 'utf8')) as Record<string, unknown>);
  weights = mergeWeights(weights, parseWeightArgs(f.get('weight') ?? []));
  let knobs = mergeKnobs(EVOLVE_DEFAULTS, f.get('evolve') ?? []);
  if (one(f, 'swaps') !== undefined) knobs = { ...knobs, swaps: int(f, 'swaps', knobs.swaps) };
  const notes = one(f, 'notes') ?? defaultNotes(cubeFile);
  const seed = int(f, 'seed', 1);
  const jobs = Math.max(1, int(f, 'jobs', 1));
  if (jobs > env.homes.length) usage(`--jobs ${jobs} but only ${env.homes.length} Forge home(s) were built`);
  const date = one(f, 'date') ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) usage(`--date wants YYYY-MM-DD, got ${date}`);
  if (one(f, 'record-all') && f.has('record-every')) usage('--record-all is --record-every 1; give one');
  const recordEvery = one(f, 'record-all') ? 1 : int(f, 'record-every', 0);
  const o = {
    cubeFile, poolFile, notesFile: fs.existsSync(notes) ? notes : null, generations: Math.max(1, int(f, 'generations', 1)),
    drafts: Math.max(1, int(f, 'drafts-per-gen', 30)), jobs, seed,
    out: one(f, 'out') ?? path.join('var/cubelab/evolve', `${path.basename(cubeFile, '.md')}-${seed}`),
    games: Math.max(1, int(f, 'games', 3)), profiles: [profiles[0] as string, profiles[1] as string] as [string, string],
    ratingsFile: one(f, 'ratings') ?? null, gameTimeoutSec: int(f, 'game-timeout', 300), weights, knobs, date, recordEvery,
    explore: parseExploreArgs(f.get('explore') ?? []),
  };
  say(`cube lab evolve: ${cubeFile}, pool ${poolFile}, notes ${o.notesFile ?? '(none)'}, ${o.generations} generation(s) x ${o.drafts} draft(s) from seed ${seed}, ${jobs} job(s), at most ${knobs.swaps} swap(s) a generation, out ${o.out}${recordEvery ? `, recording ${recordEvery === 1 ? 'every game' : `every game of every ${recordEvery}th draft`} (both chairs, both batches)` : ''}${o.explore ? `, exploring ${o.explore.share} of the discovery drafts (D356: cap ${o.explore.cap}, gold ${o.explore.gold}, margin ${o.explore.margin}, minDecks ${o.explore.minDecks})` : ''}`);
  await evolve(env, o, say);
  return 0;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, f } = flags(rest);
  switch (cmd) {
    case 'check': if (!pos[0]) usage('check needs a cube file'); return check(pos[0]);
    case 'library-candidates': return (await import('./library-candidates.ts')).libraryCandidates(REPO, f, say);   // the library pool and its candidate 180s (J136)
    case 'census': return (await import('./census.ts')).censusCommand(REPO, pos, f, say);   // the library census's population (D445)
    case 'sample': return (await import('./sample.ts')).sampleCommand(REPO, f, say);   // the census's stratified cubes (D445)
    case 'ratings':
      if (pos[0] === 'apply' && pos[1]) return ratingsApply(REPO, pos[1], f, say);
      if (pos[0] !== 'init' || !pos[1]) usage('ratings init <cube.md> | ratings apply <cube.md> --from ... --rule explore-eb --out <tsv>');
      return ratingsInit(pos[1], one(f, 'out'), f.has('force'));
    case 'run': if (!pos[0] && !f.has('bridge')) usage('run needs a cube file (or --bridge a,b)'); return run(pos[0] ?? '', f);
    case 'queue': if (pos[0] !== 'plan' && pos[0] !== 'run' && pos[0] !== 'check') usage('queue plan|run|check --night N --drafts D'); return queueCommand(REPO, pos[0], f, say);
    case 'report': if (!pos[0]) usage('report needs a run directory'); return report(pos[0], f);
    case 'learn': return learnCommand(REPO, pos, f, say);
    case 'selfplay': if (!pos[0]) usage('selfplay needs a cube file'); return selfplayCommand(REPO, pos[0], f, say);
    case 'meta': if (!pos[0]) usage('meta needs a run directory'); say(writeMeta(pos[0], f)); return 0;
    case 'evolve': if (!pos[0]) usage('evolve needs a cube file'); return evolveCmd(pos[0], f);
    case 'watch': if (!pos[0]) usage('watch needs a cube file'); return watchCommand(REPO, pos[0], f, say);   // D440
    case 'compare': return compareCommand(REPO, pos, f, say, run);
    default: return usage(cmd ? `unknown command ${cmd}` : undefined);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().then((rc) => process.exit(rc), (e: unknown) => { process.stderr.write(`cubelab: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); });
}
