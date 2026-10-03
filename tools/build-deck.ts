#!/usr/bin/env node
/*
 * mtg-table — tools/build-deck.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **An AI deck, reproducible from a spec.** `tools/villain-deck.sh` names the
 * ONE deck the gate seats the AI behind; this is its sibling for the decks
 * themselves. Each AI deck under `decks/` has a spec in `decks/specs/<deck>.json`
 * — a named card list, in the order the `.dck` prints it, every line with a
 * one-line reason — and this tool is the only thing that writes the `.dck`:
 *
 *     node tools/build-deck.ts                      # every decks/specs/*.json -> its .dck
 *     node tools/build-deck.ts decks/specs/hulk-family.json
 *     node tools/build-deck.ts --check              # exit 1 if a committed .dck is not its spec's
 *     node tools/build-deck.ts --pool RG            # the MSH + MSC cards castable in red-green
 *     node tools/build-deck.ts --pool BR --type Villain --text menace
 *
 * Run it from the repo root (hard rule 9). It reads the local card library,
 * `var/cards/cards.sqlite` (`tools/card-library/README.md`; D90), and **never
 * touches the network**: the library's query module has none. Every name is
 * held to the rules a deck in this repo keeps, each of which is a failure, not
 * a warning:
 *
 *   - the name resolves EXACTLY (no fuzzy guess is ever written into a deck);
 *   - the card is a real card (`kind: card`), printed in MSH or MSC — the
 *     line's set code is `MSH` when MSH prints it, else `MSC` (the convention
 *     `decks/doom-legion.dck` was written by hand to, and which this tool
 *     reproduces byte for byte from its spec), or the spec's own `set`;
 *   - every mana symbol of a nonland card is payable with the spec's two
 *     colours (a hybrid `{B/G}` needs only one of its halves), and a land's
 *     colour identity is inside them;
 *   - at most `maxCopies` of a nonbasic name, and ONE of a legendary name;
 *   - the main deck is `size` cards, `lands` of them lands, and at least
 *     `minCreatures` creatures.
 *
 * What it does NOT decide is whether the ENGINE plays a card faithfully, or
 * whether Forge's AI will cast it: that is `tools/check-deck.mjs` (every card's
 * script, `AI:RemoveDeck`, a library reveal the redaction gate would fail, one
 * mirror game) and `tools/deck-smoke.sh` (five games with the AI on the deck).
 * The order is spec → this → check-deck → deck-smoke → `node tools/fetch-art.ts`
 * → `node tools/build-workshop-catalog.ts` (`decks/README.md`, *Building a
 * deck*).
 *
 * `--pool` is the query half: every MSH / MSC card castable in the colours
 * given, cheapest first, with its type line — optionally narrowed by a type
 * word and an Oracle-text substring. It is how a card for a spec is found, and
 * a pool line is not a recommendation: check-deck and deck-smoke still decide.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { libraryPaths } from './card-library/config.ts';
import { LibraryMissingError, openLibrary, type CardLibrary, type CardRecord } from './card-library/query.ts';

const ROOT = process.cwd();
if (!existsSync(join(ROOT, 'config.json')) || !existsSync(join(ROOT, 'decks'))) {
  process.stderr.write('build-deck: run me from the repo root (no config.json / decks/ here)\n');
  process.exit(2);
}
const SPEC_DIR = 'decks/specs';
const COLOURS = ['W', 'U', 'B', 'R', 'G'] as const;
const SETS = ['msh', 'msc'] as const;

// ---------------------------------------------------------------------------
// the spec
// ---------------------------------------------------------------------------

interface SpecLine {
  count: number;
  name: string;
  /** Pin the printing's set (`MSH` / `MSC`); omitted, MSH wins when it prints the card. */
  set?: string;
  /** One line: what the card is doing in the deck. Not written to the `.dck`. */
  why: string;
}

interface Spec {
  /** The `.dck` this spec writes, e.g. `decks/hulk-family.dck`. */
  deck: string;
  /** Its `Name=` — what `hello_ok.match` and the board print. */
  name: string;
  /** The deck's colours, e.g. `RG`. */
  colors: string;
  archetype: string;
  size: number;
  lands: number;
  minCreatures: number;
  maxCopies: number;
  cards: SpecLine[];
}

function fail(msg: string): never {
  process.stderr.write(`build-deck: ${msg}\n`);
  process.exit(1);
}

function readSpec(path: string): Spec {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
  } catch (error) {
    fail(`${path}: not JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  const o = raw as Record<string, unknown>;
  const str = (k: string): string => {
    if (typeof o[k] !== 'string' || o[k] === '') fail(`${path}: "${k}" must be a non-empty string`);
    return o[k] as string;
  };
  const int = (k: string): number => {
    if (typeof o[k] !== 'number' || !Number.isInteger(o[k]) || (o[k] as number) < 0) fail(`${path}: "${k}" must be a whole number`);
    return o[k] as number;
  };
  const known = new Set(['$comment', 'deck', 'name', 'colors', 'archetype', 'size', 'lands', 'minCreatures', 'maxCopies', 'cards']);
  for (const k of Object.keys(o)) if (!known.has(k)) fail(`${path}: unknown key "${k}"`);
  const colors = str('colors').toUpperCase();
  if (![...colors].every((c) => (COLOURS as readonly string[]).includes(c))) fail(`${path}: "colors" is letters from WUBRG`);
  if (!Array.isArray(o['cards']) || o['cards'].length === 0) fail(`${path}: "cards" must be a non-empty array`);
  const cards = (o['cards'] as unknown[]).map((c, i): SpecLine => {
    const l = c as Record<string, unknown>;
    for (const k of Object.keys(l)) if (!['count', 'name', 'set', 'why'].includes(k)) fail(`${path}: cards[${String(i)}] has unknown key "${k}"`);
    if (typeof l['count'] !== 'number' || !Number.isInteger(l['count']) || l['count'] < 1) fail(`${path}: cards[${String(i)}].count`);
    if (typeof l['name'] !== 'string' || l['name'].trim() === '') fail(`${path}: cards[${String(i)}].name`);
    if (typeof l['why'] !== 'string' || l['why'].trim() === '') fail(`${path}: cards[${String(i)}] (${String(l['name'])}) needs a "why"`);
    if (l['set'] !== undefined && (typeof l['set'] !== 'string' || !(SETS as readonly string[]).includes(l['set'].toLowerCase()))) {
      fail(`${path}: cards[${String(i)}].set must be MSH or MSC`);
    }
    return { count: l['count'], name: l['name'].trim(), why: l['why'], ...(typeof l['set'] === 'string' ? { set: l['set'].toUpperCase() } : {}) };
  });
  const deck = str('deck');
  if (!/^decks\/[a-z0-9-]+\.dck$/.test(deck)) fail(`${path}: "deck" must be decks/<lower-case-name>.dck`);
  return {
    deck,
    name: str('name'),
    colors,
    archetype: str('archetype'),
    size: int('size'),
    lands: int('lands'),
    minCreatures: int('minCreatures'),
    maxCopies: int('maxCopies'),
    cards,
  };
}

// ---------------------------------------------------------------------------
// the rules
// ---------------------------------------------------------------------------

function symbols(manaCost: string | null): string[] {
  return (manaCost ?? '').match(/\{[^}]+\}/g)?.map((s) => s.slice(1, -1).toUpperCase()) ?? [];
}

/**
 * Can a player with only `colours` pay this mana symbol? Generic, X and snow
 * always; `{C}` too, which is loose (it wants a colourless SOURCE, and nothing
 * here knows what the lands make) and matters for no card in MSH or MSC.
 */
function payable(symbol: string, colours: string): boolean {
  if (/^\d+$/.test(symbol) || symbol === 'X' || symbol === 'C' || symbol === 'S') return true;
  const halves = symbol.split('/');
  // {2/W} and a Phyrexian {W/P} can be paid without the colour; a hybrid needs one half.
  if (halves.some((h) => /^\d+$/.test(h) || h === 'P')) return true;
  return halves.some((h) => colours.includes(h));
}

const isLand = (c: CardRecord): boolean => /\bLand\b/.test(c.typeLine ?? '');
const isBasic = (c: CardRecord): boolean => /\bBasic\b/.test(c.typeLine ?? '') && isLand(c);
const isCreature = (c: CardRecord): boolean => /\bCreature\b/.test(c.typeLine ?? '');
const isLegendary = (c: CardRecord): boolean => /\bLegendary\b/.test(c.typeLine ?? '');

interface Resolved {
  line: SpecLine;
  card: CardRecord;
  set: 'MSH' | 'MSC';
}

function setsPrinting(lib: CardLibrary, card: CardRecord): Set<string> {
  const out = new Set<string>();
  for (const p of lib.printsOf(card.oracleId)) if (p.source === 'set' && (SETS as readonly string[]).includes(p.set)) out.add(p.set);
  return out;
}

function build(lib: CardLibrary, specPath: string): { spec: Spec; text: string; report: string[] } {
  const spec = readSpec(specPath);
  const problems: string[] = [];
  const resolved: Resolved[] = [];
  const seen = new Map<string, number>();
  for (const line of spec.cards) {
    const card = lib.getByName(line.name, { fuzzy: false });
    if (card === null || card.match !== 'exact' || card.name !== line.name) {
      problems.push(`${line.name}: not an exact card name in the library${card ? ` (nearest: ${card.name}, ${card.match})` : ''}`);
      continue;
    }
    if (card.kind !== 'card') problems.push(`${line.name}: is a ${card.kind}, not a card`);
    const printed = setsPrinting(lib, card);
    if (printed.size === 0) {
      problems.push(`${line.name}: not printed in MSH or MSC`);
      continue;
    }
    let set: 'MSH' | 'MSC' = printed.has('msh') ? 'MSH' : 'MSC';
    if (line.set !== undefined) {
      if (!printed.has(line.set.toLowerCase())) problems.push(`${line.name}: the spec pins ${line.set}, which does not print it`);
      set = line.set as 'MSH' | 'MSC';
    }
    if (isLand(card)) {
      const off = card.colorIdentity.filter((c) => !spec.colors.includes(c));
      if (off.length > 0) problems.push(`${line.name}: a land whose colour identity (${card.colorIdentity.join('')}) is outside ${spec.colors}`);
    } else {
      const unpayable = symbols(card.manaCost).filter((s) => !payable(s, spec.colors));
      if (unpayable.length > 0) problems.push(`${line.name}: ${card.manaCost ?? ''} needs {${unpayable.join('}{')}}, which ${spec.colors} cannot pay`);
    }
    const total = (seen.get(card.name) ?? 0) + line.count;
    seen.set(card.name, total);
    if (!isBasic(card)) {
      if (isLegendary(card) && total > 1) problems.push(`${line.name}: legendary, so one copy (the spec has ${String(total)})`);
      else if (total > spec.maxCopies) problems.push(`${line.name}: ${String(total)} copies, the spec allows ${String(spec.maxCopies)}`);
    }
    resolved.push({ line, card, set });
  }
  if (problems.length > 0) fail(`${specPath}:\n  - ${problems.join('\n  - ')}`);

  const count = (pred: (c: CardRecord) => boolean): number => resolved.filter((r) => pred(r.card)).reduce((a, r) => a + r.line.count, 0);
  const size = count(() => true);
  const lands = count(isLand);
  const creatures = count(isCreature);
  if (size !== spec.size) problems.push(`the list is ${String(size)} cards, the spec says ${String(spec.size)}`);
  if (lands !== spec.lands) problems.push(`${String(lands)} lands, the spec says ${String(spec.lands)}`);
  if (creatures < spec.minCreatures) problems.push(`${String(creatures)} creatures, the spec wants at least ${String(spec.minCreatures)}`);
  if (problems.length > 0) fail(`${specPath}:\n  - ${problems.join('\n  - ')}`);

  const curve = new Map<number, number>();
  const pips = new Map<string, number>();
  for (const r of resolved) {
    if (isLand(r.card)) continue;
    const mv = r.card.cmc ?? 0;
    curve.set(mv, (curve.get(mv) ?? 0) + r.line.count);
    // A hybrid half outside the deck (Brawn's {G/U} in red-green) is not a pip this deck pays.
    for (const s of symbols(r.card.manaCost)) for (const h of s.split("/")) if (spec.colors.includes(h)) pips.set(h, (pips.get(h) ?? 0) + r.line.count);
  }
  const bySet = new Map<string, number>();
  for (const r of resolved) bySet.set(r.set, (bySet.get(r.set) ?? 0) + r.line.count);
  const report = [
    `${spec.deck} — ${spec.name}`,
    `  ${spec.archetype}; ${spec.colors}; ${String(size)} cards, ${String(resolved.length)} lines, ${String(lands)} lands, ` +
      `${String(size - lands)} spells (${String(creatures)} creatures)`,
    `  curve (mana value: cards) ${[...curve.entries()].sort((a, c) => a[0] - c[0]).map(([mv, n]) => `${String(mv)}:${String(n)}`).join('  ')}`,
    `  coloured pips ${COLOURS.filter((c) => pips.has(c)).map((c) => `${c}=${String(pips.get(c))}`).join(' ')}; ` +
      `by set ${[...bySet.entries()].map(([s, n]) => `${s}=${String(n)}`).join(' ')}`,
  ];
  const text = `[metadata]\nName=${spec.name}\n[main]\n${resolved.map((r) => `${String(r.line.count)} ${r.card.name}|${r.set}`).join('\n')}\n`;
  return { spec, text, report };
}

// ---------------------------------------------------------------------------
// --pool
// ---------------------------------------------------------------------------

function pool(lib: CardLibrary, colours: string, type: string | null, text: string | null): void {
  const rows = lib.db
    .prepare(
      `SELECT DISTINCT c.oracle_id FROM cards c JOIN prints p ON p.oracle_id = c.oracle_id
       WHERE p.set_code IN ('msh', 'msc') AND p.source = 'set' AND c.kind = 'card'`,
    )
    .all()
    .map((r) => String(r['oracle_id']));
  const hits: { card: CardRecord; sets: string }[] = [];
  const nameOf = lib.db.prepare('SELECT name FROM cards WHERE oracle_id = ?');
  for (const id of rows) {
    const row = nameOf.get(id);
    const card = row === undefined ? null : lib.getByName(String(row['name']), { fuzzy: false });
    if (card === null) continue;
    const castable = isLand(card)
      ? card.colorIdentity.every((c) => colours.includes(c))
      : symbols(card.manaCost).every((s) => payable(s, colours)) && symbols(card.manaCost).length > 0;
    if (!castable) continue;
    if (type !== null && !(card.typeLine ?? '').toLowerCase().includes(type.toLowerCase())) continue;
    if (text !== null && !(card.oracleText ?? '').toLowerCase().includes(text.toLowerCase())) continue;
    hits.push({ card, sets: [...setsPrinting(lib, card)].map((s) => s.toUpperCase()).sort().reverse().join('+') });
  }
  hits.sort((a, c) => (a.card.cmc ?? 0) - (c.card.cmc ?? 0) || a.card.name.localeCompare(c.card.name));
  for (const { card, sets } of hits) {
    const pt = card.power === null ? '' : ` ${card.power}/${card.toughness ?? ''}`;
    process.stdout.write(`${String(card.cmc ?? 0).padStart(2)}  ${(card.manaCost ?? '').padEnd(16)} ${card.name.padEnd(40)} ${sets.padEnd(8)} ${card.typeLine ?? ''}${pt}\n`);
  }
  process.stdout.write(`${String(hits.length)} card(s) castable in ${colours} from MSH + MSC${type ? `, type ~ ${type}` : ''}${text ? `, text ~ "${text}"` : ''}\n`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const argv = process.argv.slice(2);
  const valueOf = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    if (i < 0) return null;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) fail(`${flag} takes a value`);
    argv.splice(i, 2);
    return v;
  };
  const poolColours = valueOf('--pool');
  const type = valueOf('--type');
  const text = valueOf('--text');
  const check = argv.includes('--check');
  const rest = argv.filter((a) => a !== '--check');
  for (const a of rest) if (a.startsWith('--')) fail(`unknown flag ${a}`);

  let lib: CardLibrary;
  try {
    lib = openLibrary(libraryPaths(ROOT).db);
  } catch (error) {
    if (error instanceof LibraryMissingError) {
      fail('var/cards/cards.sqlite is missing — build it with node tools/card-library/build.ts (tools/card-library/README.md)');
    }
    throw error;
  }

  if (poolColours !== null) {
    const colours = poolColours.toUpperCase();
    if (![...colours].every((c) => (COLOURS as readonly string[]).includes(c))) fail('--pool takes letters from WUBRG');
    pool(lib, colours, type, text);
    return;
  }

  const specs =
    rest.length > 0
      ? rest
      : readdirSync(resolve(ROOT, SPEC_DIR))
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((f) => `${SPEC_DIR}/${f}`);
  if (specs.length === 0) fail(`no spec in ${SPEC_DIR}/`);
  let stale = 0;
  for (const path of specs) {
    const { spec, text: dck, report } = build(lib, path);
    if (basename(path, '.json') !== basename(spec.deck, '.dck')) fail(`${path} writes ${spec.deck}; a spec is named after its deck`);
    process.stdout.write(`${report.join('\n')}\n`);
    const target = resolve(ROOT, spec.deck);
    const committed = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (check) {
      if (committed === dck) process.stdout.write(`  ${spec.deck} is its spec's, byte for byte\n\n`);
      else {
        stale++;
        process.stdout.write(`  STALE: ${spec.deck} ${committed === null ? 'does not exist' : 'differs from'} what ${path} builds\n\n`);
      }
    } else if (committed === dck) {
      process.stdout.write(`  ${spec.deck} unchanged\n\n`);
    } else {
      writeFileSync(target, dck);
      process.stdout.write(`  wrote ${spec.deck}\n\n`);
    }
  }
  lib.close();
  if (stale > 0) fail(`${String(stale)} deck(s) differ from their spec — run node tools/build-deck.ts`);
}

main();
