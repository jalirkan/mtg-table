#!/usr/bin/env node
// mtg-table — audit a deck against a Forge engine, card by card.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// "Will this deck actually play?"  Forge answers that question badly on its own:
// a card it cannot resolve becomes a placeholder that Match.prepareAllZones drops
// from the library WITHOUT A WORD (Smoke.auditDeck has the long form), and a card
// whose script names an ability the engine does not have throws inside
// CardFactory.getCard and takes the whole game down with it.  This tool boots the
// engine the way every mtg-table process does (mtgtable.Bootstrap) and reports,
// per card of each .dck:
//
//   ok        in the database, builds into a real Card, every ability / trigger /
//             static / replacement SVar parses, no unknown keyword, every
//             TokenScript$ resolves
//   missing   not in this engine's card database (Forge would drop it silently)
//   broken    in the database but fails one of the build checks above
//
// "ok" means the engine can BUILD the card.  A parameter the engine does not
// read is ignored without a word and no static check sees it; the only real
// test is a game.  tools/audit-deck/AuditDeck.java says the same thing longer.
//
// IT CANNOT CHANGE HOW THE GAME RUNS.  It never touches forge-home/ or
// var/forge/: every run builds a throwaway Forge home under var/audit-deck/<key>/
// (res/ symlinked read-only beside the jar, exactly as tools/make-forge-home.sh
// derives it; a fresh userDir; forge-home/custom-cards/*.txt copied in, as
// make-forge-home.sh does) and points -Dmtgtable.config at a config written
// there.  --overlay adds scripts to THAT home only.
//
// Usage (from the repo root, hard rule 9):
//
//   node tools/audit-deck.mjs decks/fra-rw-aggro.dck
//   node tools/audit-deck.mjs decks/fra-rw-aggro.dck --overlay var/fra-scripts
//   FORGE_JAR=/path/to/new/forge-gui-desktop-...jar node tools/audit-deck.mjs decks/x.dck
//   node tools/audit-deck.mjs --names var/names.txt           # one card name per line
//   node tools/audit-deck.mjs --overlay var/fra-scripts --all-custom   # every overlaid card
//
// Flags:
//   --overlay <dir>   extra scripts for the throwaway home; <dir>/cards/**.txt ->
//                     custom/cards, <dir>/tokens/*.txt -> custom/tokens,
//                     <dir>/editions/*.txt -> custom/editions.  Repeatable.
//   --config <file>   config.json to read forgeJar from (default: <repo>/config.json).
//                     FORGE_JAR in the environment wins, as in tools/config.sh.
//   --classes <dir>   compiled bridge classes (default: <repo>/bridge/out).  The
//                     helper links mtgtable.Bootstrap / Config / Json from there.
//   --json <file>     also write the full JSON report here.
//   --names <file>    audit these card names (no deck needed).
//   --all-custom      audit every card the overlay loaded (CardRules.isCustom()).
//   --verbose         print every card's engine log lines and the notable boot lines.
//
// Exit: 0 every card ok, 1 at least one missing/broken, 2 the audit itself failed.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELPER_SRC = path.join(REPO, 'tools', 'audit-deck', 'AuditDeck.java');

function usage(msg) {
  if (msg) console.error(`audit-deck: ${msg}`);
  console.error('usage: node tools/audit-deck.mjs [--overlay <dir>]... [--config <file>] '
    + '[--classes <dir>] [--json <file>] [--names <file>] [--all-custom] [--verbose] <deck.dck>...');
  process.exit(2);
}

// ---------------------------------------------------------------- arguments
const opts = { overlays: [], decks: [], config: path.join(REPO, 'config.json'),
  classes: path.join(REPO, 'bridge', 'out'), json: null, names: null, allCustom: false, verbose: false };
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const need = () => { if (i + 1 >= argv.length) usage(`${a} needs a value`); return argv[++i]; };
    if (a === '--overlay') opts.overlays.push(path.resolve(REPO, need()));
    else if (a === '--config') opts.config = path.resolve(REPO, need());
    else if (a === '--classes') opts.classes = path.resolve(REPO, need());
    else if (a === '--json') opts.json = path.resolve(REPO, need());
    else if (a === '--names') opts.names = path.resolve(REPO, need());
    else if (a === '--all-custom') opts.allCustom = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '-h' || a === '--help') usage();
    else if (a.startsWith('--')) usage(`unknown flag ${a}`);
    else opts.decks.push(path.resolve(REPO, a));
  }
  if (opts.decks.length === 0 && !opts.names && !opts.allCustom) usage('nothing to audit');
}

// ---------------------------------------------------------------- engine
const cfg = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
const forgeJar = path.resolve(path.dirname(opts.config), process.env.FORGE_JAR || cfg.forgeJar);
if (!fs.existsSync(forgeJar)) usage(`Forge jar not found: ${forgeJar}`);
// res/ sits beside the jar -- the same derivation as tools/make-forge-home.sh.
const forgeRes = path.join(path.dirname(forgeJar), 'res');
if (!fs.existsSync(path.join(forgeRes, 'cardsfolder'))) usage(`no res/cardsfolder beside the jar: ${forgeRes}`);
if (!fs.existsSync(path.join(opts.classes, 'mtgtable', 'Bootstrap.class'))) {
  usage(`no compiled bridge in ${opts.classes} -- run ./bridge/build.sh first (or pass --classes)`);
}
for (const d of opts.decks) if (!fs.existsSync(d)) usage(`deck not found: ${d}`);
for (const o of opts.overlays) if (!fs.statSync(o, { throwIfNoEntry: false })?.isDirectory()) usage(`overlay is not a directory: ${o}`);

// Never build the throwaway home inside the user's Forge install or real profile.
const HOME = process.env.HOME || '';
for (const forbidden of [path.dirname(forgeJar), path.join(HOME, '.forge')]) {
  if ((REPO + path.sep).startsWith(forbidden + path.sep)) usage(`refusing to write inside ${forbidden}`);
}

const key = createHash('sha1').update([forgeJar, opts.classes, ...opts.overlays].join('\n')).digest('hex').slice(0, 10);
const WORK = path.join(REPO, 'var', 'audit-deck', key);
const home = path.join(WORK, 'home');
const user = path.join(WORK, 'user');
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(path.join(WORK, 'cache'), { recursive: true });

// res -> the engine's own read-only tree.  Replace the link, never write through it.
const resLink = path.join(home, 'res');
try { fs.unlinkSync(resLink); } catch { /* absent */ }
fs.symlinkSync(forgeRes, resLink);
fs.writeFileSync(path.join(home, 'forge.profile.properties'),
  '# Written by tools/audit-deck.mjs: a throwaway Forge home for one audit.\n'
  + `userDir=${user}/\ncacheDir=${path.join(WORK, 'cache')}/\n`);

// The overlay, rebuilt from scratch each run so nothing stale survives.
const custom = path.join(user, 'custom');
fs.rmSync(custom, { recursive: true, force: true });
for (const d of ['cards', 'tokens', 'editions']) fs.mkdirSync(path.join(custom, d), { recursive: true });
const copied = { cards: 0, tokens: 0, editions: 0 };
// 1. what make-forge-home.sh copies for the real game (decision D14)
const committed = path.join(REPO, 'forge-home', 'custom-cards');
if (fs.existsSync(committed)) {
  for (const f of fs.readdirSync(committed)) {
    if (f.endsWith('.txt')) { fs.copyFileSync(path.join(committed, f), path.join(custom, 'cards', f)); copied.cards++; }
  }
}
// 2. each --overlay.  Card scripts are FLATTENED into custom/cards/overlay-<n>/:
//    CardStorageReader.collectCardFiles skips a directory named "upcoming" on a
//    non-development build, so copying Forge's own layout would hide the very
//    cards an overlay of an unreleased set is for.
const walkTxt = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return walkTxt(p);
  return e.name.endsWith('.txt') ? [p] : [];
});
opts.overlays.forEach((o, n) => {
  const cardsDir = path.join(o, 'cards');
  if (fs.existsSync(cardsDir)) {
    const dst = path.join(custom, 'cards', `overlay-${n}`);
    fs.mkdirSync(dst, { recursive: true });
    for (const f of walkTxt(cardsDir)) {
      const target = path.join(dst, path.basename(f));
      if (fs.existsSync(target)) usage(`two overlay scripts share a file name: ${path.basename(f)}`);
      fs.copyFileSync(f, target); copied.cards++;
    }
  }
  for (const kind of ['tokens', 'editions']) {
    const src = path.join(o, kind);
    if (!fs.existsSync(src)) continue;
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith('.txt')) { fs.copyFileSync(path.join(src, f), path.join(custom, kind, f)); copied[kind]++; }
    }
  }
});

const auditConfig = path.join(WORK, 'config.json');
fs.writeFileSync(auditConfig, JSON.stringify({
  forgeJar, forgeHome: home, deck: opts.decks[0] || path.join(REPO, cfg.deck || 'decks/pacho-shield.dck'),
}, null, 2) + '\n');

// ---------------------------------------------------------------- helper build
// javac through the jdk.compiler module (JRE only; never --release -- see bridge/build.sh).
const classesOut = path.join(WORK, 'classes');
const helperClass = path.join(classesOut, 'mtgtable', 'audit', 'AuditDeck.class');
const stale = !fs.existsSync(helperClass)
  || fs.statSync(helperClass).mtimeMs < fs.statSync(HELPER_SRC).mtimeMs
  || fs.statSync(helperClass).mtimeMs < fs.statSync(path.join(opts.classes, 'mtgtable', 'Bootstrap.class')).mtimeMs;
if (stale) {
  fs.rmSync(classesOut, { recursive: true, force: true });
  fs.mkdirSync(classesOut, { recursive: true });
  const jc = spawnSync('java', ['-m', 'jdk.compiler/com.sun.tools.javac.Main',
    '-cp', `${opts.classes}:${forgeJar}`, '-d', classesOut, '-Xlint:all', HELPER_SRC],
  { cwd: REPO, encoding: 'utf8' });
  if (jc.status !== 0) {
    process.stderr.write(jc.stdout + jc.stderr);
    usage('the audit helper did not compile against this jar');
  }
}

// ---------------------------------------------------------------- run
// Hard rule 6: exactly these JVM flags.  The engine's chatter (thousands of lines)
// goes to a log file; the report comes back as JSON.
const report = path.join(WORK, 'report.json');
const engineLog = path.join(WORK, 'engine.log');
fs.rmSync(report, { force: true });
const javaArgs = ['-u', 'DISPLAY', 'java', '-Xmx4096m', '-Djava.awt.headless=true',
  '-Dio.netty.tryReflectionSetAccessible=true', '-Dfile.encoding=UTF-8',
  '-Dsentry.uncaught.handler.enabled=false', `-Dmtgtable.config=${auditConfig}`,
  '-cp', `${classesOut}:${opts.classes}:${forgeJar}`, 'mtgtable.audit.AuditDeck',
  ...opts.decks, '--json', report];
if (opts.names) javaArgs.push('--names', opts.names);
if (opts.allCustom) javaArgs.push('--all-custom');
// The run must SAVE no Forge preferences (hard rule 11; D107, D182).  Every
// preferences file of the throwaway home is fingerprinted before and after, the
// way gate step 9e does its three directories (D133): the helper's two AIs once
// went through GamePlayerUtil's empty-profileOverride branch, which saves the
// whole in-memory preference set when the preferences name an AI profile that
// did not load (docs/evidence/guards.md section 4).
const prefsDir = path.join(user, 'preferences');
const prefsPrint = () => {
  let names = [];
  try { names = fs.readdirSync(prefsDir).sort(); } catch { return ''; }
  return names.map((f) => {
    const p = path.join(prefsDir, f);
    const st = fs.statSync(p, { throwIfNoEntry: false });
    if (!st?.isFile()) return null;
    return `${f} ${st.size} ${st.mtimeMs} ${createHash('sha256').update(fs.readFileSync(p)).digest('hex')}`;
  }).filter(Boolean).join('\n');
};
const prefsBefore = prefsPrint();
const logFd = fs.openSync(engineLog, 'w');
const t0 = Date.now();
const run = spawnSync('env', javaArgs, { cwd: REPO, stdio: ['ignore', logFd, logFd],
  env: { ...process.env, FORGE_JAR: forgeJar }, timeout: 600_000 });
fs.closeSync(logFd);
if (prefsPrint() !== prefsBefore) {
  console.error(`audit-deck: the audit SAVED a Forge preferences file under ${path.relative(REPO, prefsDir)} -- `
    + 'a run must never save prefs (CLAUDE.md hard rule 11; seat an AI only through Bootstrap.createAiPlayer, D107)');
  process.exit(2);
}
if (!fs.existsSync(report)) {
  console.error(`audit-deck: the engine produced no report (exit ${run.status}${run.signal ? `, ${run.signal}` : ''}); see ${path.relative(REPO, engineLog)}`);
  const tail = fs.readFileSync(engineLog, 'utf8').split('\n').slice(-25).join('\n');
  console.error(tail);
  process.exit(2);
}
const r = JSON.parse(fs.readFileSync(report, 'utf8'));
if (opts.json) { fs.mkdirSync(path.dirname(opts.json), { recursive: true }); fs.copyFileSync(report, opts.json); }

// ---------------------------------------------------------------- print
const rel = (p) => (p && p.startsWith(REPO + path.sep) ? path.relative(REPO, p) : p);
console.log(`engine    ${rel(r.engine.jar)}  (${r.engine.version}${r.engine.developmentBuild ? ', development build' : ''})`);
console.log(`home      ${rel(r.engine.forgeHome)}   (throwaway; forge-home/ and var/forge/ untouched)`);
console.log(`overlay   ${copied.cards} card script(s), ${copied.tokens} token script(s), ${copied.editions} edition file(s)`
  + `${opts.overlays.length ? ` from ${opts.overlays.map(rel).join(', ')}` : ' (the committed forge-home/custom-cards only)'}`);
for (const [code, e] of Object.entries(r.engine.editions || {})) {
  if (code === '???') continue;
  console.log(`edition   ${code}: ${e ? `${e.name}, ${e.type}, ${e.entries} entries` : 'NOT KNOWN to this engine'}`);
}
for (const d of r.decks) console.log(`deck      ${rel(d)}`);
console.log(`boot      FModel.initialize ${r.engine.initMs} ms; engine log: ${rel(engineLog)}`);
console.log('');

const counts = { ok: 0, missing: 0, broken: 0 };
const width = Math.min(40, Math.max(...r.cards.map((c) => c.requested.length), 4));
let section = null;
for (const c of r.cards) {
  const where = `${c.source ? `${c.source} ` : ''}[${c.section}]`;
  if (where !== section) { section = where; console.log(where); }
  counts[c.verdict] = (counts[c.verdict] || 0) + c.qty;
  // Forge's CardEdition.UNKNOWN has the code "???": the placeholder it makes for a
  // name it could not resolve.
  const resolved = c.resolvedSet === '???' ? 'none' : c.resolvedSet;
  const set = c.requestedSet
    ? (resolved && resolved.toUpperCase() !== c.requestedSet.toUpperCase() ? `${c.requestedSet}->${resolved}` : c.requestedSet)
    : (resolved || '-');
  const src = !c.inDb || c.unsupported ? '' : (c.custom ? 'overlay' : 'stock');
  console.log(`  ${c.verdict.padEnd(7)} ${String(c.qty).padStart(2)} ${c.requested.padEnd(width)} ${set.padEnd(9)} ${src}`);
  for (const p of c.problems) console.log(`            ! ${p}`);
  if (opts.verbose) {
    for (const n of c.notes) console.log(`            . ${n}`);
    for (const l of c.log) console.log(`            | ${l}`);
  }
}
console.log('');
console.log(`summary   ${counts.ok} ok, ${counts.missing} missing, ${counts.broken} broken (copies, over ${r.cards.length} line(s))`);
console.log('          "ok" = the engine can build the card; it is not a rules review. Play a game to know.');
if (r.notableLog.length) {
  console.log(`notable   ${r.notableLog.length} engine line(s) name no audited card${opts.verbose ? ':' : ' (--verbose to list)'}`);
  if (opts.verbose) for (const l of r.notableLog) console.log(`          | ${l}`);
}
console.log(`time      ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(counts.missing + counts.broken > 0 ? 1 : 0);
