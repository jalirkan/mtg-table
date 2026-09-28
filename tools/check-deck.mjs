#!/usr/bin/env node
// mtg-table — tools/check-deck.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Is this .dck a deck the engine will actually play, card for card?  Three
// passes, each answering a question the one before it cannot:
//
//   1. STATIC (always).  Parse the .dck with the same grammar tools/fetch-art.ts
//      uses; for every line find the Forge script by its `Name:` line — the
//      D14 overlay in forge-home/custom-cards/ first, because that is what the
//      engine loads, then cardsfolder.zip — and, when the line carries a set
//      code (`|MSH`), confirm that edition file lists the name.  Flags a card
//      Forge's own AI hints say it cannot play (`AI:RemoveDeck:All`).  Prints
//      the curve, the colour pips and the land/creature split.
//
//   2. ENGINE (default; --no-engine skips it).  Runs the bridge's own audit,
//      `./bridge/run.sh mtgtable.Smoke <deck>`, which boots Forge exactly as
//      every other entry point does (Bootstrap, hard rule 11), loads the deck
//      with DeckSerializer.fromFile (hard rule 4), applies the predicate
//      Match.prepareAllZones uses to drop cards — CardRules.isUnsupported(),
//      which in the 2.0.14 jar is true only for the placeholder
//      CardDb.createUnsupportedCard(name) builds when a name has NO script —
//      checks Limited conformance, and then plays one AI-vs-AI game with the
//      deck on both seats.  There is no stderr line for a dropped card (see
//      Smoke.auditDeck), so the audit's own report is parsed.  The card and
//      distinct-name counts Forge loaded are compared with pass 1's as a
//      backstop; measured, an unknown name does not vanish — it loads as a
//      placeholder in edition `???`, which the audit counts and Limited
//      conformance rejects by name.
//
//   3. SCRYFALL (--scryfall).  For every distinct name, fetch the printing in
//      the hinted set (else msh, then msc), 1 request / 500 ms with the
//      config.json User-Agent and `Accept: application/json`, honouring
//      Retry-After on 429 — Scryfall's own terms.  Diffs mana cost, type line,
//      P/T, keywords and Oracle text against the script, the way
//      docs/research/08-deck-card-coverage.md did by hand.  A `K:` keyword the
//      printed card does not have is a MISMATCH (that is exactly A.I.M.
//      Scientists' stray Trample, report 08 §2); Oracle-text drift is reported
//      and does not fail, because Forge's `Oracle:` line is display text and
//      reprints carry older templating.
//
// Usage — from the repo root (hard rule 9; paths come from config.json):
//
//   node tools/check-deck.mjs decks/doom-legion.dck                # static + engine
//   node tools/check-deck.mjs decks/doom-legion.dck --scryfall     # + Scryfall diff
//   node tools/check-deck.mjs decks/*.dck --no-engine              # static only, seconds
//   node tools/check-deck.mjs decks/pacho-shield.dck --no-engine --scryfall --stock
//       # --stock ignores the D14 overlay: the negative control, which must
//       # report A.I.M. Scientists' Trample as a MISMATCH
//
// Other flags: --size N (expected main-deck size, default 40), --timeout S
// (engine pass, default 300), --json (one machine-readable object per deck on
// stdout after the report).  Exit 0 when every deck passed, 1 when any check
// failed, 2 on bad usage.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// config (hard rule 9)
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
if (!existsSync(join(REPO_ROOT, 'config.json')) || !existsSync(join(REPO_ROOT, 'bridge'))) {
  process.stderr.write('check-deck: run me from the repo root (no config.json / bridge/ here)\n');
  process.exit(2);
}
const CONFIG = JSON.parse(readFileSync(join(REPO_ROOT, 'config.json'), 'utf8'));
const FORGE_HOME = resolve(REPO_ROOT, CONFIG.forgeHome ?? 'forge-home');
const RES = join(FORGE_HOME, 'res');
const CARDS_ZIP = join(RES, 'cardsfolder', 'cardsfolder.zip');
const EDITIONS_DIR = join(RES, 'editions');
const OVERLAY_DIR = join(FORGE_HOME, 'custom-cards');
const USER_AGENT =
  process.env.SCRYFALL_UA ?? CONFIG.scryfallUserAgent ?? 'mtg-table/0.1 (local hobby client)';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { decks: [], engine: true, scryfall: false, stock: false, size: 40, timeout: 300, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-engine') opts.engine = false;
    else if (a === '--engine') opts.engine = true;
    else if (a === '--scryfall') opts.scryfall = true;
    else if (a === '--stock') opts.stock = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--size') opts.size = Number.parseInt(argv[++i] ?? '', 10);
    else if (a === '--timeout') opts.timeout = Number.parseInt(argv[++i] ?? '', 10);
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('--')) {
      process.stderr.write(`check-deck: unknown flag ${a}\n`);
      process.exit(2);
    } else opts.decks.push(a);
  }
  if (!Number.isFinite(opts.size) || !Number.isFinite(opts.timeout)) {
    process.stderr.write('check-deck: --size and --timeout take a number\n');
    process.exit(2);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// the .dck (the same grammar as tools/fetch-art.ts's parseDeck)
// ---------------------------------------------------------------------------

function parseDeck(text) {
  const entries = [];
  let section = '';
  let name = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase();
      continue;
    }
    if (section === 'metadata') {
      const m = /^Name=(.*)$/.exec(line);
      if (m) name = m[1].trim();
      continue;
    }
    if (section === '') continue;
    const m = /^(\d+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    const parts = m[2].split('|');
    const cardName = parts[0].trim();
    const setHint = parts.length > 1 && parts[1].trim() !== '' ? parts[1].trim().toUpperCase() : null;
    if (cardName === '') continue;
    entries.push({ count: Number.parseInt(m[1], 10), name: cardName, setHint, section });
  }
  return { name, entries };
}

// ---------------------------------------------------------------------------
// Forge card scripts
// ---------------------------------------------------------------------------

function parseScript(text) {
  const s = { name: null, manaCost: null, types: null, pt: null, keywords: [], oracle: null, ai: [], lines: [] };
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    s.lines.push(line);
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i);
    const val = line.slice(i + 1);
    // First face only: a second face starts at ALTERNATE, and every card in
    // these decks is single-faced — a multi-face card is reported, not diffed.
    if (line === 'ALTERNATE') break;
    if (key === 'Name' && s.name === null) s.name = val.trim();
    else if (key === 'ManaCost' && s.manaCost === null) s.manaCost = val.trim();
    else if (key === 'Types' && s.types === null) s.types = val.trim();
    else if (key === 'PT' && s.pt === null) s.pt = val.trim();
    else if (key === 'K') s.keywords.push(val.trim());
    else if (key === 'Oracle' && s.oracle === null) s.oracle = val;
    else if (key === 'AI') s.ai.push(val.trim());
  }
  s.multiFace = text.split('\n').some((l) => l.trim() === 'ALTERNATE');
  return s;
}

/** Forge's file-naming convention: lowercase, diacritics and apostrophes dropped, other runs → `_`. */
function slugOf(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

let zipListing = null;
function zipEntries() {
  if (zipListing === null) {
    zipListing = execFileSync('unzip', ['-Z1', CARDS_ZIP], { maxBuffer: 64 * 1024 * 1024 })
      .toString('utf8')
      .split('\n')
      .filter((l) => l.endsWith('.txt'));
  }
  return zipListing;
}

function readZipEntry(entry) {
  try {
    return execFileSync('unzip', ['-p', CARDS_ZIP, entry], {
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'], // a miss is normal here; unzip's own complaint is noise
    }).toString('utf8');
  } catch {
    return null;
  }
}

let overlayIndex = null;
function overlay() {
  if (overlayIndex === null) {
    overlayIndex = new Map();
    if (existsSync(OVERLAY_DIR)) {
      for (const f of readdirSync(OVERLAY_DIR)) {
        if (!f.endsWith('.txt')) continue;
        const text = readFileSync(join(OVERLAY_DIR, f), 'utf8');
        const s = parseScript(text);
        if (s.name !== null) overlayIndex.set(s.name, { where: `forge-home/custom-cards/${f}`, text });
      }
    }
  }
  return overlayIndex;
}

/** The script the engine loads for `name`, and the stock one under it when an overlay wins. */
function findScript(name, useOverlay) {
  const slug = slugOf(name);
  let stock = null;
  const first = /^[a-z]/.test(slug) ? slug[0] : null;
  const guesses = first ? [`${first}/${slug}.txt`] : [];
  for (const g of guesses) {
    const text = readZipEntry(g);
    if (text !== null && parseScript(text).name === name) {
      stock = { where: g, text };
      break;
    }
  }
  if (stock === null) {
    // The convention missed (punctuation Forge treats differently); scan the
    // listing for any entry whose basename contains the slug and read each.
    for (const e of zipEntries()) {
      if (!basename(e, '.txt').includes(slug.slice(0, Math.max(4, Math.min(slug.length, 12))))) continue;
      const text = readZipEntry(e);
      if (text !== null && parseScript(text).name === name) {
        stock = { where: e, text };
        break;
      }
    }
  }
  const over = useOverlay ? overlay().get(name) ?? null : null;
  return { loaded: over ?? stock, stock, overlay: over };
}

// ---------------------------------------------------------------------------
// Forge edition files
// ---------------------------------------------------------------------------

let editionIndex = null;
/** code → { file, cards: Map<name, collectorNumbers[]> } (a basic has several prints) */
function editions() {
  if (editionIndex === null) {
    editionIndex = new Map();
    for (const f of readdirSync(EDITIONS_DIR)) {
      if (!f.endsWith('.txt')) continue;
      const text = readFileSync(join(EDITIONS_DIR, f), 'utf8');
      const code = /^Code=(.+)$/m.exec(text)?.[1]?.trim();
      if (!code) continue;
      const cards = new Map();
      let section = '';
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (line.startsWith('[') && line.endsWith(']')) {
          section = line.slice(1, -1).toLowerCase();
          continue;
        }
        if (section === 'metadata' || section === 'tokens' || section === 'other') continue;
        const m = /^(\S+)\s+([CURMLST])\s+(.+?)(?:\s+@.*)?$/.exec(line);
        if (!m) continue;
        const cardName = m[3].replace(/\s*\$\{.*$/, '').trim();
        const numbers = cards.get(cardName) ?? [];
        if (!numbers.includes(m[1])) numbers.push(m[1]);
        cards.set(cardName, numbers);
      }
      editionIndex.set(code.toUpperCase(), { file: f, cards });
    }
  }
  return editionIndex;
}

// ---------------------------------------------------------------------------
// mana, types, colours
// ---------------------------------------------------------------------------

function forgeManaSymbols(mc) {
  if (mc === null || mc === 'no cost' || mc === '') return [];
  return mc
    .split(/\s+/)
    .filter((t) => t !== '')
    .map((t) => {
      if (/^\d+$/.test(t) || /^[WUBRGCXSYZ]$/.test(t)) return t;
      return t.split('').sort().join('/'); // hybrid / phyrexian: GU → G/U, 2W → 2/W, WP → P/W
    });
}

function scryfallManaSymbols(mc) {
  return (mc ?? '').match(/\{[^}]+\}/g)?.map((s) => s.slice(1, -1).split('/').sort().join('/')) ?? [];
}

function manaValue(symbols) {
  let mv = 0;
  for (const s of symbols) {
    if (/^\d+$/.test(s)) mv += Number.parseInt(s, 10);
    else if (s === 'X') continue;
    else if (s.includes('/') && /^\d/.test(s)) mv += Number.parseInt(s, 10); // {2/W} counts 2
    else mv += 1;
  }
  return mv;
}

const sameMultiset = (a, b) => [...a].sort().join(' ') === [...b].sort().join(' ');

// ---------------------------------------------------------------------------
// Scryfall
// ---------------------------------------------------------------------------

const SCRYFALL = 'https://api.scryfall.com';
const MIN_INTERVAL_MS = 500;
let lastRequestAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scryfallGet(url) {
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (res.status === 429 && attempt < 3) {
      const s = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
      await sleep((Number.isFinite(s) && s > 0 ? s : 30) * 1000);
      continue;
    }
    if (!res.ok) {
      await res.text();
      return { card: null, status: res.status };
    }
    return { card: await res.json(), status: res.status };
  }
}

async function scryfallFor(name, setHint) {
  const sets = setHint ? [setHint.toLowerCase()] : ['msh', 'msc'];
  const tried = [];
  for (const set of sets) {
    const { card, status } = await scryfallGet(
      `${SCRYFALL}/cards/named?exact=${encodeURIComponent(name)}&set=${set}`,
    );
    if (card) return { card, via: `set=${set}`, inTargetSets: true };
    tried.push(`${set}:${status}`);
  }
  const { card, status } = await scryfallGet(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(name)}`);
  if (card) return { card, via: 'exact (any set)', inTargetSets: false };
  tried.push(`exact:${status}`);
  return { card: null, via: tried.join(', '), inTargetSets: false };
}

/** Forge-internal `K:` names that are not printed keyword abilities. */
const NOT_PRINTED_KEYWORDS = new Set(['etbreplacement', 'chapter', 'alternateadditionalcost']);
/** Evergreen keywords Forge scripts as `K:` lines when the card has them unconditionally. */
const EVERGREEN = new Set([
  'flying', 'menace', 'deathtouch', 'lifelink', 'vigilance', 'flash', 'trample', 'first strike',
  'double strike', 'haste', 'reach', 'hexproof', 'defender', 'ward',
]);

function normOracle(s) {
  return (s ?? '')
    .replace(/\\n/g, '\n')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '');
}

function diffCard(script, card) {
  const mismatches = [];
  const notes = [];

  const fMana = forgeManaSymbols(script.manaCost);
  const sMana = scryfallManaSymbols(card.mana_cost);
  if (!sameMultiset(fMana, sMana)) mismatches.push(`mana cost: Forge ${script.manaCost} vs Scryfall ${card.mana_cost}`);

  const fTypes = (script.types ?? '').split(/\s+/).filter(Boolean);
  const sTypes = (card.type_line ?? '').replace(/—/g, ' ').split(/\s+/).filter(Boolean);
  if (!sameMultiset(fTypes, sTypes)) mismatches.push(`type line: Forge "${script.types}" vs Scryfall "${card.type_line}"`);

  if (card.power !== undefined || script.pt !== null) {
    const sPt = card.power !== undefined ? `${card.power}/${card.toughness}` : null;
    if (sPt !== script.pt) mismatches.push(`P/T: Forge ${script.pt} vs Scryfall ${sPt}`);
  }

  const sKw = new Set((card.keywords ?? []).map((k) => k.toLowerCase()));
  const fKw = new Set();
  for (const k of script.keywords) {
    // `K:TypeCycling:Basic:2` → `typecycling`, which Scryfall lists beside
    // "Basic landcycling"; a head with a space is an old-style static text
    // keyword ("CARDNAME can't block.") unless it is an evergreen two-worder.
    const head = k.split(':')[0].trim().toLowerCase();
    if (NOT_PRINTED_KEYWORDS.has(head) || (head.includes(' ') && !EVERGREEN.has(head))) continue;
    fKw.add(head);
    if (!sKw.has(head)) mismatches.push(`keyword: Forge has K:${k}, the printed card does not`);
  }
  for (const k of sKw) {
    if (EVERGREEN.has(k) && !fKw.has(k)) notes.push(`keyword: printed ${k} is not a K: line (check it is scripted another way)`);
  }

  const fo = normOracle(script.oracle);
  const so = normOracle(card.oracle_text ?? (card.card_faces ?? []).map((f) => f.oracle_text).join('\n'));
  if (fo.join('\n') !== so.join('\n')) {
    const onlyF = fo.filter((l) => !so.includes(l));
    const onlyS = so.filter((l) => !fo.includes(l));
    notes.push(
      `oracle text drift:${onlyF.map((l) => `\n        Forge:    ${l}`).join('')}${onlyS
        .map((l) => `\n        Scryfall: ${l}`)
        .join('')}`,
    );
  }
  return { mismatches, notes };
}

// ---------------------------------------------------------------------------
// the engine pass
// ---------------------------------------------------------------------------

function engineAudit(deckPath, timeoutS) {
  if (!existsSync(join(REPO_ROOT, 'bridge', 'out'))) {
    return { ok: false, problems: ['bridge/out missing — run ./bridge/build.sh first'], raw: '' };
  }
  const t0 = Date.now();
  const r = spawnSync(join(REPO_ROOT, 'bridge', 'run.sh'), ['mtgtable.Smoke', deckPath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: timeoutS * 1000,
    maxBuffer: 256 * 1024 * 1024,
  });
  const raw = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const out = { ok: true, problems: [], wallMs: Date.now() - t0, raw };
  if (r.error) {
    out.ok = false;
    out.problems.push(`Smoke did not finish: ${r.error.message}`);
  }
  const grab = (re) => re.exec(raw);
  const deckLine = grab(/^deck from file = (.*) \((\d+) cards, (\d+) distinct\)$/m);
  if (deckLine) {
    out.name = deckLine[1];
    out.cards = Number(deckLine[2]);
    out.distinct = Number(deckLine[3]);
  }
  out.sets = grab(/^deck sets = \{(.*)\}$/m)?.[1] ?? null;
  const drop = grab(/^deck cards Forge would drop = (.*)$/m)?.[1] ?? null;
  out.dropped = drop;
  out.limited = grab(/^deck conformance \(Limited, 40 cards\) = (.*)$/m)?.[1] ?? null;
  out.result = grab(/^RESULT: winner = (.*)$/m)?.[1] ?? null;
  out.turns = grab(/^RESULT: player turns = (.*)$/m)?.[1] ?? null;
  out.gameMs = grab(/^game took (\d+) ms$/m)?.[1] ?? null;
  out.smokeOk = /^SMOKE OK$/m.test(raw);
  out.watched = [...raw.matchAll(/^(svar-fallback|unsupported-text) \[(\w+)\]: (\d+) line\(s\)$/gm)].map(
    (m) => `${m[1]}=${m[3]}`,
  );
  if (drop === null || !drop.startsWith('none')) {
    out.ok = false;
    out.problems.push(`engine would drop cards: ${drop ?? '(audit line missing)'}`);
  }
  if (out.limited !== 'legal') {
    out.ok = false;
    out.problems.push(`Limited conformance: ${out.limited ?? '(line missing)'}`);
  }
  if (!out.smokeOk) {
    out.ok = false;
    out.problems.push(`Smoke did not print SMOKE OK (exit ${String(r.status)})`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function checkDeck(deckPath, opts) {
  const report = { deck: deckPath, failures: [], warnings: [], cards: [] };
  const fail = (m) => report.failures.push(m);
  const warn = (m) => report.warnings.push(m);

  const text = readFileSync(resolve(REPO_ROOT, deckPath), 'utf8');
  const { name, entries } = parseDeck(text);
  const main = entries.filter((e) => e.section === 'main');
  const side = entries.filter((e) => e.section === 'sideboard');
  const total = main.reduce((a, e) => a + e.count, 0);
  const distinctMain = new Map();
  for (const e of main) {
    const prev = distinctMain.get(e.name);
    if (prev) {
      prev.count += e.count;
      if (e.setHint && !prev.setHint) prev.setHint = e.setHint;
    } else distinctMain.set(e.name, { ...e });
  }
  report.name = name;
  report.total = total;
  report.distinct = distinctMain.size;

  process.stdout.write(`\n== ${deckPath} — ${name ?? '(no Name= metadata)'} ==\n`);
  process.stdout.write(
    `main: ${String(total)} cards, ${String(distinctMain.size)} distinct names; sideboard: ${String(
      side.reduce((a, e) => a + e.count, 0),
    )}\n`,
  );
  if (total !== opts.size) fail(`main deck is ${String(total)} cards, expected ${String(opts.size)}`);

  // ---- pass 1: static --------------------------------------------------------
  process.stdout.write('\n  count name                              set  script                                   notes\n');
  const curve = new Map();
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let lands = 0;
  let creatures = 0;
  const bySet = new Map();
  const typeTally = new Map();
  for (const e of distinctMain.values()) {
    const found = findScript(e.name, !opts.stock);
    const row = { name: e.name, count: e.count, setHint: e.setHint, script: found.loaded?.where ?? null, notes: [] };
    report.cards.push(row);
    if (found.loaded === null) {
      fail(`${e.name}: no Forge script with that Name: in cardsfolder.zip or the overlay`);
      row.notes.push('NO SCRIPT');
    } else {
      const s = parseScript(found.loaded.text);
      row.parsed = s;
      if (found.overlay) row.notes.push(`overlay (D14) over stock ${found.stock?.where ?? '?'}`);
      if (s.multiFace) row.notes.push('multi-face: only the front face is diffed');
      for (const ai of s.ai) {
        if (/^RemoveDeck:All/i.test(ai)) {
          warn(`${e.name}: AI:${ai} — Forge's AI is marked as unable to play this card`);
          row.notes.push(`AI:${ai}`);
        } else if (/^RemoveDeck/i.test(ai)) row.notes.push(`AI:${ai}`);
      }
      const types = (s.types ?? '').split(/\s+/);
      if (types.includes('Land')) lands += e.count;
      else {
        const syms = forgeManaSymbols(s.manaCost);
        const mv = manaValue(syms);
        curve.set(mv, (curve.get(mv) ?? 0) + e.count);
        for (const sym of syms) for (const c of sym.split('/')) if (c in pips) pips[c] += e.count;
      }
      if (types.includes('Creature')) creatures += e.count;
      for (const t of ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Planeswalker']) {
        if (types.includes(t)) typeTally.set(t, (typeTally.get(t) ?? 0) + e.count);
      }
    }
    if (e.setHint) {
      const ed = editions().get(e.setHint);
      if (!ed) {
        fail(`${e.name}: set code ${e.setHint} is not the Code= of any edition file`);
        row.notes.push(`unknown set ${e.setHint}`);
      } else if (!ed.cards.has(e.name)) {
        fail(`${e.name}: not listed in ${ed.file} (${e.setHint})`);
        row.notes.push(`not in ${e.setHint}`);
      } else {
        row.collectors = ed.cards.get(e.name);
        row.notes.unshift(`${e.setHint} #${row.collectors.join('/')}`);
      }
      bySet.set(e.setHint, (bySet.get(e.setHint) ?? 0) + e.count);
    } else {
      row.notes.unshift('no set hint (Forge picks the printing)');
      bySet.set('(none)', (bySet.get('(none)') ?? 0) + e.count);
    }
    process.stdout.write(
      `  ${pad(e.count, 5)} ${pad(e.name, 33)} ${pad(e.setHint ?? '-', 4)} ${pad(row.script ?? '-', 40)} ${row.notes.join('; ')}\n`,
    );
  }
  report.bySet = Object.fromEntries(bySet);
  report.lands = lands;
  report.creatures = creatures;
  report.curve = Object.fromEntries([...curve.entries()].sort((a, b) => a[0] - b[0]));
  report.pips = pips;
  const spells = total - lands;
  process.stdout.write(
    `\n  lands ${String(lands)}, spells ${String(spells)} (creatures ${String(creatures)}); types ${[
      ...typeTally.entries(),
    ]
      .map(([t, n]) => `${t} ${String(n)}`)
      .join(', ')}\n` +
      `  curve (mana value: cards) ${[...curve.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([mv, n]) => `${String(mv)}:${String(n)}`)
        .join('  ')}\n` +
      `  coloured pips ${Object.entries(pips)
        .filter(([, n]) => n > 0)
        .map(([c, n]) => `${c}=${String(n)}`)
        .join(' ')}\n` +
      `  by set hint ${[...bySet.entries()].map(([s, n]) => `${s}=${String(n)}`).join(' ')}\n`,
  );

  // ---- pass 3 (before the slow one): Scryfall ------------------------------
  if (opts.scryfall) {
    process.stdout.write(`\n  Scryfall (${USER_AGENT}; 1 request / ${String(MIN_INTERVAL_MS)} ms)\n`);
    for (const row of report.cards) {
      const { card, via, inTargetSets } = await scryfallFor(row.name, row.setHint);
      if (card === null) {
        fail(`${row.name}: not found on Scryfall (${via})`);
        process.stdout.write(`  MISS  ${row.name} — ${via}\n`);
        continue;
      }
      row.scryfall = { set: card.set, collectorNumber: card.collector_number, id: card.id, via };
      const where = `${card.set.toUpperCase()} #${card.collector_number}`;
      const parts = [];
      if (!inTargetSets) {
        if (row.setHint) fail(`${row.name}: not in ${row.setHint} on Scryfall (resolved ${where} via ${via})`);
        else warn(`${row.name}: resolved outside MSH/MSC (${where})`);
      }
      if (
        row.collectors &&
        card.set.toUpperCase() === row.setHint &&
        !row.collectors.includes(card.collector_number)
      ) {
        parts.push(`collector number: Forge ${row.collectors.join('/')} vs Scryfall ${card.collector_number}`);
      }
      let status = 'ok';
      if (row.parsed && !(row.parsed.types ?? '').includes('Basic')) {
        const { mismatches, notes } = diffCard(row.parsed, card);
        for (const m of mismatches) fail(`${row.name}: ${m}`);
        if (mismatches.length > 0) status = 'MISMATCH';
        else if (notes.length > 0) status = 'note';
        parts.push(...mismatches, ...notes);
        row.scryfall.mismatches = mismatches;
        row.scryfall.notes = notes;
      } else if (row.parsed) parts.push('basic land: existence only');
      process.stdout.write(`  ${pad(status, 8)} ${pad(row.name, 33)} ${pad(where, 10)} ${via}\n`);
      for (const p of parts) process.stdout.write(`           - ${p}\n`);
    }
  }

  // ---- pass 2: the engine ----------------------------------------------------
  if (opts.engine) {
    process.stdout.write(`\n  engine audit: ./bridge/run.sh mtgtable.Smoke ${deckPath} (boots Forge, plays one AI mirror game)\n`);
    const eng = engineAudit(deckPath, opts.timeout);
    report.engine = { ...eng, raw: undefined };
    for (const p of eng.problems) fail(p);
    if (eng.cards !== undefined && eng.cards !== total) {
      fail(`engine loaded ${String(eng.cards)} cards, the file lists ${String(total)} — a line did not resolve`);
    }
    if (eng.distinct !== undefined && eng.distinct !== distinctMain.size) {
      fail(`engine loaded ${String(eng.distinct)} distinct names, the file lists ${String(distinctMain.size)}`);
    }
    process.stdout.write(
      `  deck from file = ${eng.name ?? '?'} (${String(eng.cards ?? '?')} cards, ${String(eng.distinct ?? '?')} distinct)\n` +
        `  deck sets      = {${eng.sets ?? '?'}}\n` +
        `  would drop     = ${eng.dropped ?? '?'}\n` +
        `  Limited        = ${eng.limited ?? '?'}\n` +
        `  mirror game    = winner ${eng.result ?? '?'}; ${eng.turns ?? '?'}; ${eng.gameMs ?? '?'} ms (wall ${String(
          Math.round(eng.wallMs / 1000),
        )} s)\n` +
        `  watched output = ${eng.watched.join(', ') || '(none)'}\n`,
    );
  }

  process.stdout.write(
    `\n  ${report.failures.length === 0 ? 'PASS' : 'FAIL'} — ${String(report.failures.length)} failure(s), ${String(
      report.warnings.length,
    )} warning(s)\n`,
  );
  for (const f of report.failures) process.stdout.write(`    ✗ ${f}\n`);
  for (const w of report.warnings) process.stdout.write(`    ! ${w}\n`);
  return report;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts.decks.length === 0) {
    process.stdout.write(
      'usage: node tools/check-deck.mjs <deck.dck>... [--no-engine] [--scryfall] [--stock] [--size N] [--timeout S] [--json]\n',
    );
    process.exit(opts.help ? 0 : 2);
  }
  if (!existsSync(CARDS_ZIP)) {
    process.stderr.write(`check-deck: ${CARDS_ZIP} not found — run ./tools/make-forge-home.sh\n`);
    process.exit(2);
  }
  const reports = [];
  for (const d of opts.decks) reports.push(await checkDeck(d, opts));
  if (opts.json) {
    for (const r of reports) {
      for (const c of r.cards) delete c.parsed;
      process.stdout.write(`${JSON.stringify(r)}\n`);
    }
  }
  process.exit(reports.every((r) => r.failures.length === 0) ? 0 : 1);
}

await main();
