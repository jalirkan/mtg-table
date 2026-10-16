// mtg-table — the cube lab: the library census's population (Phase 0, D445).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh census build --fc <ForgeCoach checkout> [--editions <dir>] [--pool cubes/library/library-pool.tsv]
//                                 [--out cubes/library/census.tsv] [--check]
//
// One row a card of cubes/library/library-pool.tsv (the whole library, 1,592 cards), with what the
// census needs to know about it before any census game is played:
//
//   - name, sources (the lists it is in), forge_supported, forge_ai_flag, colour_identity, type,
//     mana_value: library-pool.tsv's own columns (the engine's facts), copied;
//   - lowest_rarity, lowest_rarity_set: the lowest rarity of any printing of the card in Forge's
//     edition files (res/editions/*.txt beside the jar; C < U < R < M < S, Forge's L -- the land
//     slot of a booster -- read as C), and the edition printing it at that rarity (a paper set's own first,
//     then an Online edition, then a promo or collector product; then the earliest Date); blank for a card no edition prints;
//   - lab_games, lab_wr_shrunk: the cube lab's metas in ForgeCoach's public/cubes, every meta that
//     played the card, games summed and winRateShrunk averaged with those games as weights (as
//     library-pool.tsv pools them); the rate is blank under MIN_LAB_GAMES (80) games;
//   - member_vintage, member_legacy, member_peasant, member_pauper: 1 when a list of that kind
//     lists the card (MEMBERSHIP, below);
//   - band, band_source, provisional: the band by the written rule (bandOf, below), which rule
//     fired, and 1 on every row: each label is provisional until the census's first round, whose
//     re-labelling rule is written before that round is run.
//
// THE BAND RULE, in order, the first that applies:
//   powered  the card is on the POWERED list (a fixed list, below and in the file's header);
//   pauper   it was ever printed at common            (band_source rarity:C);
//   peasant  ever at uncommon, never at common       (rarity:U);
//   legacy   everything else with a printing          (rarity:R, rarity:M, rarity:S);
//   and for a card no edition prints, by membership: a Pauper cube lists it -> pauper, else a
//   Peasant cube -> peasant, else legacy (membership:pauper, membership:peasant, membership:other).
//
// Deterministic: the same pool, editions and metas give the same bytes, and the header carries each
// input's sha256 so `--check` (which builds it again and compares) can say which input moved.  No
// engine: everything here reads files.  Tested by web/test/cubelab-census.test.ts.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { parseLibraryPool, type LibraryCard, type MetaCards } from './library-candidates.ts';

// ---------------------------------------------------------------- the fixed lists

/**
 * The powered band, a fixed list (D445): the Power Nine, the ten original dual lands, the cards the
 * programme named (2026-10-16), and the Vintage cubes' restricted-style cards -- cards on Vintage's
 * restricted list that a Vintage cube list here plays (vintage180 or mtgovc), never printed at
 * common.  Every name is a library card (the test holds that).
 */
export const POWERED: ReadonlyArray<{ group: string; names: readonly string[] }> = [
  { group: 'the Power Nine', names: ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Timetwister', 'Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald'] },
  { group: 'the original dual lands', names: ['Tundra', 'Underground Sea', 'Badlands', 'Taiga', 'Savannah', 'Scrubland', 'Volcanic Island', 'Bayou', 'Plateau', 'Tropical Island'] },
  { group: 'named by the programme', names: ['Library of Alexandria', 'Bazaar of Baghdad', "Mishra's Workshop", 'Candelabra of Tawnos', 'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Time Vault', 'Tolarian Academy', 'Strip Mine'] },
  { group: "the Vintage cubes' restricted-style cards", names: ['Balance', 'Demonic Tutor', 'Imperial Seal', "Lion's Eye Diamond", 'Memory Jar', 'Mystic Forge', 'Mystical Tutor', 'Narset, Parter of Veils', 'Tinker', 'Vampiric Tutor', 'Wheel of Fortune', "Yawgmoth's Will"] },
];
export const POWERED_NAMES: ReadonlySet<string> = new Set(POWERED.flatMap((g) => g.names));

/** Restricted in Vintage and in a Vintage cube list, but printed at common, so the rarity rule bands them (the Pauper cube plays two of them). */
export const RESTRICTED_AT_COMMON: readonly string[] = ['Brainstorm', 'Gitaxian Probe', 'Gush', 'Lotus Petal', 'Treasure Cruise'];

/** Which source lists are which kind of cube (library-pool.tsv's `sources` labels); any other label is a legacy-ish list. */
export const MEMBERSHIP = { vintage: ['vintage180', 'mtgovc'], peasant: ['peasant'], pauper: ['pauper'] } as const;

export const MIN_LAB_GAMES = 80;
export const RARITIES = 'CURMS';
export const BANDS = ['pauper', 'peasant', 'legacy', 'powered'] as const;
export type Band = (typeof BANDS)[number];

// ---------------------------------------------------------------- Forge's editions

export interface Printing { rarity: string; set: string; date: string; type: string }

/**
 * Edition types a paper set's own printing comes from.  lowest_rarity_set names one of these where
 * one prints the card at its lowest rarity, then an Online edition (MTGO's sets and promos), then
 * anything else (Promo, Collector_Edition, Funny, Other).  The rarity itself counts every printing.
 */
export const SET_TYPES: readonly string[] = ['Core', 'Expansion', 'Reprint', 'Draft', 'Starter', 'Commander', 'Duel_Deck', 'Multiplayer', 'Boxed_Set'];
const typeRank = (t: string): number => (SET_TYPES.includes(t) ? 0 : t === 'Online' ? 1 : 2);

/**
 * Every card line of one edition file: `[cards]` and every other printing section (`[borderless]`,
 * `[promo]` ...), not `[tokens]` and not `[metadata]`.  A line is `<number> <rarity> <name>` and
 * then ` @artist` and/or ` ${json}`.
 */
export function parseEdition(text: string): { code: string; date: string; type: string; cards: Array<{ name: string; rarity: string }> } {
  let section = '', code = '', date = '', type = '';
  const cards: Array<{ name: string; rarity: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const h = /^\[(.+)\]\s*$/.exec(line);
    if (h) { section = (h[1] as string).toLowerCase(); continue; }
    if (section === 'metadata') {
      const m = /^(Code|Date|Type)=(.*)$/.exec(line.trim());
      if (m?.[1] === 'Code') code = (m[2] as string).trim();
      if (m?.[1] === 'Date') date = (m[2] as string).trim();
      if (m?.[1] === 'Type') type = (m[2] as string).trim();
      continue;
    }
    if (section === 'tokens' || section === '') continue;
    const m = /^(\S+)\s+([CURMSL])\s+(.+?)(?:\s+@.*|\s+\$\{.*)?$/.exec(line);
    if (!m) continue;
    cards.push({ name: (m[3] as string).trim(), rarity: m[2] === 'L' ? 'C' : (m[2] as string) });
  }
  return { code, date, type, cards };
}

/** The lowest-rarity printing of every card any edition prints; ties go to a paper set's own edition (SET_TYPES), then an Online one, then a promo or collector product, then the earliest Date, then the set code. */
export function lowestPrintings(editions: Array<{ file: string; text: string }>): Map<string, Printing> {
  const best = new Map<string, Printing>();
  const better = (a: Printing, b: Printing): boolean => {
    const ra = RARITIES.indexOf(a.rarity), rb = RARITIES.indexOf(b.rarity);
    const ta = typeRank(a.type), tb = typeRank(b.type);
    return ra !== rb ? ra < rb : ta !== tb ? ta < tb : a.date !== b.date ? a.date < b.date : a.set < b.set;
  };
  for (const e of editions) {
    const ed = parseEdition(e.text);
    const set = ed.code || path.basename(e.file, '.txt');
    for (const c of ed.cards) {
      const p: Printing = { rarity: c.rarity, set, date: ed.date, type: ed.type };
      const b = best.get(c.name);
      if (!b || better(p, b)) best.set(c.name, p);
    }
  }
  return best;
}

/** The printing for a library name: the name as Forge keys it, else its front face. */
export function printingOf(lowest: Map<string, Printing>, name: string): Printing | undefined {
  return lowest.get(name) ?? lowest.get(name.split(' // ')[0] as string);
}

// ---------------------------------------------------------------- the rule

export interface Membership { vintage: boolean; legacy: boolean; peasant: boolean; pauper: boolean }

export function membershipOf(sources: string[]): Membership {
  const has = (labels: readonly string[]): boolean => sources.some((s) => labels.includes(s));
  const known = [...MEMBERSHIP.vintage, ...MEMBERSHIP.peasant, ...MEMBERSHIP.pauper] as string[];
  return { vintage: has(MEMBERSHIP.vintage), peasant: has(MEMBERSHIP.peasant), pauper: has(MEMBERSHIP.pauper), legacy: sources.some((s) => !known.includes(s)) };
}

/** THE BAND RULE (the header comment, and D445). */
export function bandOf(name: string, lowestRarity: string, m: Membership): { band: Band; source: string } {
  if (POWERED_NAMES.has(name)) return { band: 'powered', source: 'powered-list' };
  if (lowestRarity === 'C') return { band: 'pauper', source: 'rarity:C' };
  if (lowestRarity === 'U') return { band: 'peasant', source: 'rarity:U' };
  if (lowestRarity) return { band: 'legacy', source: `rarity:${lowestRarity}` };
  if (m.pauper) return { band: 'pauper', source: 'membership:pauper' };
  if (m.peasant) return { band: 'peasant', source: 'membership:peasant' };
  return { band: 'legacy', source: 'membership:other' };
}

// ---------------------------------------------------------------- the rows

export const CENSUS_COLUMNS = ['name', 'sources', 'forge_supported', 'forge_ai_flag', 'colour_identity', 'type', 'mana_value', 'lowest_rarity', 'lowest_rarity_set',
  'lab_games', 'lab_wr_shrunk', 'member_vintage', 'member_legacy', 'member_peasant', 'member_pauper', 'band', 'band_source', 'provisional'] as const;

export interface CensusRow {
  name: string;
  sources: string[];
  supported: boolean;
  aiFlag: string;
  identity: string;
  type: string;
  mv: number;
  lowestRarity: string;
  lowestRaritySet: string;
  labGames: number;
  /** Blank (null) under MIN_LAB_GAMES games. */
  labWr: number | null;
  member: Membership;
  band: Band;
  bandSource: string;
  provisional: boolean;
}

/** Pool the metas' games and games-weighted shrunk win rates by the library's names (exact, else the front face). */
export function poolLab(names: string[], metas: Array<{ label: string; cards: MetaCards }>): { games: Map<string, number>; wr: Map<string, number>; unmatched: string[] } {
  const known = new Set(names);
  const front = new Map(names.map((n) => [n.split(' // ')[0] as string, n]));
  const games = new Map<string, number>(), sums = new Map<string, number>();
  const unmatched: string[] = [];
  for (const m of metas) {
    for (const [n, row] of Object.entries(m.cards)) {
      const key = known.has(n) ? n : front.get(n) ?? front.get(n.split(' // ')[0] as string);
      if (!key) { unmatched.push(`${m.label}: ${n}`); continue; }
      const g = row.games ?? 0;
      if (!(g > 0) || typeof row.winRateShrunk !== 'number') continue;
      games.set(key, (games.get(key) ?? 0) + g);
      sums.set(key, (sums.get(key) ?? 0) + g * row.winRateShrunk);
    }
  }
  const wr = new Map<string, number>();
  for (const [k, g] of games) wr.set(k, (sums.get(k) as number) / g);
  return { games, wr, unmatched };
}

export function buildCensus(pool: LibraryCard[], lowest: Map<string, Printing>, metas: Array<{ label: string; cards: MetaCards }>): { rows: CensusRow[]; unmatchedMeta: string[] } {
  const lab = poolLab(pool.map((c) => c.name), metas);
  const rows = pool.map((c): CensusRow => {
    const p = printingOf(lowest, c.name);
    const member = membershipOf(c.sources);
    const { band, source } = bandOf(c.name, p?.rarity ?? '', member);
    const g = lab.games.get(c.name) ?? 0;
    return {
      name: c.name, sources: c.sources, supported: c.supported, aiFlag: c.aiFlag, identity: c.identity, type: c.type, mv: c.mv,
      lowestRarity: p?.rarity ?? '', lowestRaritySet: p?.set ?? '', labGames: g, labWr: g >= MIN_LAB_GAMES ? (lab.wr.get(c.name) as number) : null,
      member, band, bandSource: source, provisional: true,
    };
  });
  rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { rows, unmatchedMeta: lab.unmatched };
}

const bit = (b: boolean): string => (b ? '1' : '0');

export function censusTsv(rows: CensusRow[], comments: string[]): string {
  const body = rows.map((r) => [r.name, r.sources.join(' '), r.supported ? 'yes' : 'no', r.aiFlag, r.identity, r.type, String(r.mv), r.lowestRarity, r.lowestRaritySet,
    String(r.labGames), r.labWr === null ? '' : r.labWr.toFixed(4), bit(r.member.vintage), bit(r.member.legacy), bit(r.member.peasant), bit(r.member.pauper),
    r.band, r.bandSource, bit(r.provisional)].join('\t'));
  return `${comments.map((l) => `# ${l}`.trimEnd()).join('\n')}\n${CENSUS_COLUMNS.join('\t')}\n${body.join('\n')}\n`;
}

export function parseCensus(text: string): CensusRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const head = (lines.shift() ?? '').split('\t');
  const ix = Object.fromEntries(CENSUS_COLUMNS.map((c) => {
    const i = head.indexOf(c);
    if (i < 0) throw new Error(`census: no ${c} column`);
    return [c, i];
  })) as Record<(typeof CENSUS_COLUMNS)[number], number>;
  return lines.map((l) => {
    const f = l.split('\t');
    const g = (k: (typeof CENSUS_COLUMNS)[number]): string => f[ix[k]] ?? '';
    const band = g('band') as Band;
    if (!BANDS.includes(band)) throw new Error(`census: ${g('name')}: band "${band}"`);
    return {
      name: g('name'), sources: g('sources').split(/\s+/).filter(Boolean), supported: g('forge_supported') === 'yes', aiFlag: g('forge_ai_flag'), identity: g('colour_identity'),
      type: g('type'), mv: Number(g('mana_value')) || 0, lowestRarity: g('lowest_rarity'), lowestRaritySet: g('lowest_rarity_set'), labGames: Number(g('lab_games')) || 0,
      labWr: g('lab_wr_shrunk') === '' ? null : Number(g('lab_wr_shrunk')),
      member: { vintage: g('member_vintage') === '1', legacy: g('member_legacy') === '1', peasant: g('member_peasant') === '1', pauper: g('member_pauper') === '1' },
      band, bandSource: g('band_source'), provisional: g('provisional') === '1',
    };
  });
}

/** The `# Inputs:` line's hashes, by input (`library-pool.tsv`, `editions`, `meta:<label>`). */
export function recordedInputs(text: string): Map<string, string> {
  const line = text.split('\n').find((l) => l.startsWith('# Inputs: ')) ?? '';
  return new Map([...line.matchAll(/([\w:.-]+) sha256 ([0-9a-f]{12})/g)].map((m) => [m[1] as string, m[2] as string]));
}

// ---------------------------------------------------------------- the command

export const sha12 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex').slice(0, 12);

/** The jar's directory's res/editions: $FORGE_JAR (tools/config.sh exports it), else config.json's forgeJar (hard rule 9). */
export function defaultEditionsDir(repo: string): string {
  let jar = process.env.FORGE_JAR;
  if (!jar) jar = (JSON.parse(fs.readFileSync(path.join(repo, 'config.json'), 'utf8')) as { forgeJar?: string }).forgeJar;
  if (!jar) throw new Error('census: no FORGE_JAR and no forgeJar in config.json; pass --editions <Forge res/editions>');
  return path.join(path.dirname(jar), 'res', 'editions');
}

export interface CensusInputs { poolText: string; editions: Array<{ file: string; text: string }>; metas: Array<{ label: string; text: string }> }

export function readCensusInputs(repo: string, poolFile: string, editionsDir: string, fc: string): CensusInputs {
  const poolText = fs.readFileSync(path.resolve(repo, poolFile), 'utf8');
  const editions = fs.readdirSync(editionsDir).filter((x) => x.endsWith('.txt')).sort().map((x) => ({ file: x, text: fs.readFileSync(path.join(editionsDir, x), 'utf8') }));
  if (!editions.length) throw new Error(`census: no edition files in ${editionsDir}`);
  const dir = path.join(fc, 'public/cubes');
  const metas = fs.readdirSync(dir).filter((x) => x.endsWith('.meta.json')).sort().map((x) => ({ label: x.replace(/\.meta\.json$/, ''), text: fs.readFileSync(path.join(dir, x), 'utf8') }));
  if (!metas.length) throw new Error(`census: no *.meta.json in ${dir}`);
  return { poolText, editions, metas };
}

/** The whole file, from its inputs: pure, so `--check` and the test build it the same way. */
export function censusText(inp: CensusInputs): { text: string; rows: CensusRow[]; unmatchedMeta: string[] } {
  const pool = parseLibraryPool(inp.poolText);
  const lowest = lowestPrintings(inp.editions);
  const metas = inp.metas.map((m) => ({ label: m.label, cards: (JSON.parse(m.text) as { cards: MetaCards }).cards }));
  const { rows, unmatchedMeta } = buildCensus(pool, lowest, metas);
  const missing = POWERED.flatMap((g) => g.names).filter((n) => !rows.some((r) => r.name === n));
  if (missing.length) throw new Error(`census: the powered list names card(s) the library lacks: ${missing.join(', ')}`);
  const editionsSha = sha12(inp.editions.map((e) => `${e.file}\0${e.text}`).join('\0'));
  const count = (pred: (r: CensusRow) => boolean): number => rows.filter(pred).length;
  const by = (band: Band): string => {
    const srcs = [...new Set(rows.filter((r) => r.band === band).map((r) => r.bandSource))].sort();
    return `${band} ${count((r) => r.band === band)} (${srcs.map((s) => `${s} ${count((r) => r.band === band && r.bandSource === s)}`).join(', ')})`;
  };
  const sup = (band: Band): number => count((r) => r.band === band && r.supported);
  const comments = [
    'mtg-table cubes/library/census.tsv: the library census\'s population (Phase 0, D445), one row a card of library-pool.tsv.',
    'Written by tools/cubelab.sh census build (tools/cubelab/census.ts); do not edit by hand. `census build --check` fails when it is stale.',
    `Inputs: library-pool.tsv sha256 ${sha12(inp.poolText)}; editions sha256 ${editionsSha} (Forge's res/editions, ${inp.editions.length} files); ${inp.metas.map((m) => `meta:${m.label} sha256 ${sha12(m.text)}`).join('; ')} (ForgeCoach's public/cubes).`,
    'name, sources, forge_supported, forge_ai_flag, colour_identity, type, mana_value: library-pool.tsv\'s columns (the engine\'s facts), copied.',
    'lowest_rarity: the lowest rarity of any printing in Forge\'s edition files ([cards] and the other printing sections, not [tokens]), C < U < R < M < S, Forge\'s L (a booster\'s land slot) read as C;',
    'lowest_rarity_set: the edition printing it at that rarity, a paper set\'s own (Core, Expansion, Reprint, Draft, Starter, Commander, Duel_Deck, Multiplayer, Boxed_Set) first, then an Online edition, then a promo or collector product, then the earliest Date, then the code. Both blank for a card no edition prints.',
    `lab_games, lab_wr_shrunk: the cube lab's metas (${inp.metas.map((m) => m.label).join(', ')}), games summed over every meta that played the card and winRateShrunk averaged with those games as weights; the rate is blank under ${MIN_LAB_GAMES} games.`,
    `member_vintage: in ${MEMBERSHIP.vintage.join(' or ')}; member_peasant: in ${MEMBERSHIP.peasant.join(' or ')}; member_pauper: in ${MEMBERSHIP.pauper.join(' or ')}; member_legacy: in any other list (the legacy-ish lists).`,
    'BAND, the first rule that applies: powered = on the POWERED list below; pauper = ever printed at common (rarity:C); peasant = ever at uncommon and never at common (rarity:U);',
    'legacy = everything else with a printing (rarity:R, rarity:M, rarity:S); a card no edition prints goes by membership: a Pauper cube -> pauper, else a Peasant cube -> peasant, else legacy',
    '(membership:pauper, membership:peasant, membership:other). band_source says which rule fired. provisional = 1 on every row: the labels stand until the census\'s first round, whose re-labelling rule is written before it runs.',
    ...POWERED.map((g) => `POWERED, ${g.group} (${g.names.length}): ${g.names.join('; ')}.`),
    `Restricted in Vintage but printed at common, so banded by rarity: ${RESTRICTED_AT_COMMON.join('; ')}.`,
    `${rows.length} cards: ${BANDS.map(by).join('; ')}.`,
    `Supported by Forge 2.0.14 (drawable unless a basic land): ${BANDS.map((b) => `${b} ${sup(b)}`).join(', ')}; ${count((r) => r.labWr !== null)} cards have ${MIN_LAB_GAMES}+ lab games.`,
  ];
  return { text: censusTsv(rows, comments), rows, unmatchedMeta };
}

export function censusCommand(repo: string, pos: string[], f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  if (pos[0] !== 'build') throw new Error('census: the command is `census build --fc <ForgeCoach checkout> [--editions <dir>] [--pool <tsv>] [--out <tsv>] [--check]`');
  const fc = one('fc');
  if (!fc) throw new Error('census build needs --fc <a ForgeCoach checkout> (its public/cubes/*.meta.json are the lab\'s numbers)');
  const poolFile = one('pool') ?? 'cubes/library/library-pool.tsv';
  const out = path.resolve(repo, one('out') ?? 'cubes/library/census.tsv');
  const editionsDir = one('editions') ?? defaultEditionsDir(repo);
  const inp = readCensusInputs(repo, poolFile, editionsDir, fc);
  const { text, rows, unmatchedMeta } = censusText(inp);
  if (unmatchedMeta.length) say(`WARNING: ${unmatchedMeta.length} meta row(s) match no library card: ${unmatchedMeta.slice(0, 10).join('; ')}`);
  if (f.has('check')) {
    const had = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (had === text) { say(`census: ${path.relative(repo, out)} is current (${rows.length} rows)`); return 0; }
    const before = recordedInputs(had), now = recordedInputs(text);
    const moved = [...new Set([...before.keys(), ...now.keys()])].filter((k) => before.get(k) !== now.get(k));
    say(`census: ${path.relative(repo, out)} is STALE${had ? '' : ' (missing)'}; ${moved.length ? `inputs changed: ${moved.join(', ')}` : 'its inputs are the same, so the file was edited or the rule changed'}. Run tools/cubelab.sh census build --fc ${fc} again.`);
    return 1;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  const line = text.split('\n').find((l) => / cards: pauper /.test(l)) ?? '';
  say(`census: wrote ${path.relative(repo, out)}, ${rows.length} rows. ${line.replace(/^# /, '')}`);
  return 0;
}
