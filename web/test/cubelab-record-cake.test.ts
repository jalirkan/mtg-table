/*
 * mtg-table — web/test/cubelab-record-cake.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Recording the cake (D450), engine-free:
 *
 *  - LAB_DATA_DIR: a var/ path re-rooted for writes and (when there) reads, everything else untouched,
 *    unset meaning exactly what it meant before, a missing drive refused; and a real lab job (`decks`,
 *    which needs no engine) run with the setting writes under it and nothing under the var/ folders it
 *    re-roots (with a planted file and a run with the drive unset as the controls that the check sees);
 *  - census-play --record: the match line's blocks for rows and full, plan.json refusing a folder of
 *    another mode (an old plan reads as `none`), the game row picking up rows / leak check / frames /
 *    ledger, the size statistics;
 *  - the rows' redaction check: a well-formed file passes; a name, an unknown key, a token outside the
 *    grammar, a card-bearing begin key and a chosen index out of range each fail; an id the seat's own
 *    frame log never shows fails the id check, one it does show passes;
 *  - D499: a game is one play, the rows between a begin and its end in one rows file: a killed attempt's begin with no end,
 *    whose key ended in another file (J181 s13's d28-forge-o2-b39), is abandoned -- left out of the id check and the size,
 *    counted -- while a begin with no end and no ended play elsewhere is the truncated case, checked as before; a key that
 *    ended ok:true in two files is a problem, each play checked on its own; an ok:false end beside an ok:true one is superseded,
 *    and two ok:false ends (census-play's retry of a stuck game, J160) are one game timed out twice, never a problem; a row
 *    outside any begin..end is counted as an orphan;
 *  - census-replay's comparison: the last complete run of a game is the one read (a retried game is
 *    written twice), only the wall time may differ, and the first different row is named.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { labArg, labDataDir, labPath, recipePath, strandedReason, underVar } from '../../tools/cubelab/labdata.ts';
import { planExtension, recordBlocks, rowOf, rowsKeyOf, sizeStats, type PlannedGame } from '../../tools/cubelab/censusplay.ts';
import { checkRowsDir, checkRowsText, collectRows, rowBytesByGame, tokenIds, TOKEN, visibleIds, type RowsCheck } from '../../tools/cubelab/rowscheck.ts';
import { censusReplayCommand, compareFrames, compareGames, framesFace, gameLines, replayOutRefusal } from '../../tools/cubelab/censusreplay.ts';
import type { MatchResult } from '../../tools/cubelab/engine.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

test('LAB_DATA_DIR: var/ paths re-rooted, the rest untouched, unset is the old behaviour, a missing drive refused', () => {
  const root = mkdtempSync(join(tmpdir(), 'labdata-'));
  try {
    assert.equal(underVar('var/census/games'), join('census', 'games'));
    assert.equal(underVar('./var/x'), 'x');
    assert.equal(underVar('cubes/a.md'), null);
    assert.equal(underVar('/abs/var/x'), null);
    assert.equal(underVar('var/../etc'), null);
    assert.equal(underVar('var'), null);
    // write: always re-rooted; read: re-rooted only when it exists there
    const uniq = `labdata-t-${process.pid}`;
    assert.equal(labPath(REPO, `var/${uniq}/games`, 'write', root), join(root, uniq, 'games'));
    assert.equal(labPath(REPO, 'var/census/decks', 'read', root), join(REPO, 'var/census/decks'));
    mkdirSync(join(root, 'census', 'decks'), { recursive: true });
    assert.equal(labPath(REPO, 'var/census/decks', 'read', root), join(root, 'census', 'decks'));
    assert.equal(labPath(REPO, 'decks/pacho-shield.dck', 'read', root), join(REPO, 'decks/pacho-shield.dck'));
    assert.equal(labPath(REPO, '/tmp/x', 'write', root), '/tmp/x');
    // unset: exactly path.resolve, and labArg leaves the spelling alone
    assert.equal(labPath(REPO, 'var/census/games', 'write', null), join(REPO, 'var/census/games'));
    assert.equal(labArg(REPO, 'var/cubelab/runs/x', 'write', null), 'var/cubelab/runs/x');
    assert.equal(labArg(REPO, `var/${uniq}/runs/x`, 'write', root), join(root, uniq, 'runs', 'x'));
    assert.equal(labDataDir(REPO, { LAB_DATA_DIR: root }), root);
    assert.throws(() => labDataDir(REPO, { LAB_DATA_DIR: join(root, 'not-mounted') }), /not an existing directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// What a lab job could write under the repo's var/ if LAB_DATA_DIR failed to re-root it: the folders
// labdata.ts re-roots -- the lab's own default homes (var/cubelab, var/census, var/lab-*) and the job's
// own --out -- less the parts it keeps in the repo by design (Forge homes, compiled classes, the engine's
// facts cache, the atlas self-test's absolute folder).  NOT the whole of var/: in the parallel gate,
// 13c-node runs beside jobs that write var/check-all*, var/games and logs the whole time, and a check
// on all of var/ failed on their writes, not the lab's.
const LAB_KEPT_IN_REPO = ['cubelab/classes', 'cubelab/homes', 'cubelab/watch-homes', 'cubelab/facts', 'cubelab/atlas-selftest'];
function labRootsUnderVar(outRel: string): string[] {
  const v = join(REPO, 'var');
  const top = underVar(outRel)?.split(sep)[0];
  const names = ['cubelab', 'census', ...readdirSync(v).filter((n) => n.startsWith('lab-')), ...(top ? [top] : [])];
  return [...new Set(names)].map((n) => join(v, n)).filter((p) => existsSync(p));
}
/**
 * The first FILE under those folders newer than `marker`, or '' (`find`, pruning what stays in the repo).  Files
 * only: a folder's own mtime moves when anything inside it is added or removed (the gate's 12g compiling
 * into var/cubelab/classes moves var/cubelab's), and the lab writes nothing that is not a file.
 */
function labWriteSince(marker: string, outRel: string): string {
  const roots = labRootsUnderVar(outRel);
  if (roots.length === 0) return '';
  const prune = LAB_KEPT_IN_REPO.flatMap((p, i) => [...(i ? ['-o'] : []), '-path', join(REPO, 'var', p)]);
  const found = spawnSync('find', [...roots, '(', ...prune, ')', '-prune', '-o', '-type', 'f', '-newer', marker, '-print', '-quit'], { encoding: 'utf8' });
  assert.equal(found.status, 0, `find failed: ${found.stderr}`);
  return found.stdout.trim();
}
const decksJob = (rel: string, env: NodeJS.ProcessEnv) => spawnSync(process.execPath,
  [join(REPO, 'tools/cubelab/cli.ts'), 'decks', '--band', 'pauper', '--count', '4', '--seed', '7', '--out', rel],
  { cwd: REPO, encoding: 'utf8', env, timeout: 120_000 });

test('LAB_DATA_DIR: a lab job writes under it and nowhere it re-roots under the repo\'s var/', async (t) => {
  mkdirSync(join(REPO, 'var'), { recursive: true });   // so `find` below looks at a real folder, never a missing one
  const root = mkdtempSync(join(tmpdir(), 'labdata-job-'));
  const marker = join(root, '.t0');
  writeFileSync(marker, '');
  const rel = `var/labdata-selftest-${process.pid}/decks`;
  const relUnset = `var/labdata-selftest-unset-${process.pid}/decks`;
  const control = join(REPO, 'var', 'cubelab', `labdata-selftest-control-${process.pid}`);
  // the drive unset: no LAB_DATA_DIR, and a config with no labDataDir (the machine's may name one)
  const noCfg = join(root, 'no-labdata-config.json');
  writeFileSync(noCfg, '{}');
  const { LAB_DATA_DIR: _drop, ...envUnset } = process.env;
  let madeCubelab = false;
  try {
    await t.test('set: the decks land under LAB_DATA_DIR and nothing is written where the check watches', () => {
      const r = decksJob(rel, { ...process.env, LAB_DATA_DIR: root });
      assert.equal(r.status, 0, `decks failed: ${r.stderr.slice(-800)}`);
      assert.ok(existsSync(join(root, `labdata-selftest-${process.pid}`, 'decks', 'decks.jsonl')), 'the decks are under LAB_DATA_DIR');
      assert.ok(!existsSync(join(REPO, rel)), 'nothing at the repo path');
      const w = labWriteSince(marker, rel);
      assert.equal(w, '', `something the lab re-roots under the repo's var/ was written: ${w}`);
    });
    await t.test('control: a file planted under a watched folder is seen', () => {
      madeCubelab = !existsSync(join(REPO, 'var', 'cubelab'));
      mkdirSync(join(REPO, 'var', 'cubelab'), { recursive: true });
      writeFileSync(control, 'x');
      assert.equal(labWriteSince(marker, rel), control, 'the check can see a write under var/cubelab');
      rmSync(control, { force: true });
    });
    await t.test('control: the same job with the drive unset writes under the repo\'s var/, and the check catches it', () => {
      const r = decksJob(relUnset, { ...envUnset, MTG_TABLE_CONFIG: noCfg });
      assert.equal(r.status, 0, `decks (unset) failed: ${r.stderr.slice(-800)}`);
      assert.ok(existsSync(join(REPO, relUnset, 'decks.jsonl')), 'unset, the decks are at the repo path');
      const w = labWriteSince(marker, relUnset);
      assert.ok(w.startsWith(join(REPO, 'var', `labdata-selftest-unset-${process.pid}`)), `the check missed the unset run's write (saw '${w}')`);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(control, { force: true });
    rmSync(join(REPO, 'var', `labdata-selftest-unset-${process.pid}`), { recursive: true, force: true });
    if (madeCubelab) try { rmdirSync(join(REPO, 'var', 'cubelab')); } catch { /* something else wrote there since: leave it */ }
  }
});

test('LAB_DATA_DIR: a write whose repo copy holds a run the drive copy lacks is refused, naming both (#160 review)', () => {
  const root = mkdtempSync(join(tmpdir(), 'labdata-strand-'));
  const rel = `var/labdata-strand-${process.pid}`;
  const here = join(REPO, rel);
  try {
    // a census folder in progress under the repo's var/, nothing on the drive yet
    mkdirSync(join(here, 'census'), { recursive: true });
    writeFileSync(join(here, 'census', 'plan.json'), '{}');
    writeFileSync(join(here, 'census', 'games.jsonl'), '{}\n');
    assert.throws(() => labPath(REPO, `${rel}/census`, 'write', root), (e: Error) => e.message.includes(join(here, 'census')) && e.message.includes(join(root, `labdata-strand-${process.pid}`, 'census')) && /plan\.json/.test(e.message));
    assert.throws(() => labArg(REPO, `${rel}/census`, 'write', root), /start it again from scratch/);
    // a run folder (no plan.json) with output: refused too; reads are never refused
    mkdirSync(join(here, 'run'), { recursive: true });
    writeFileSync(join(here, 'run', 'games.jsonl'), '{}\n');
    assert.throws(() => labArg(REPO, `${rel}/run`, 'write', root), /earlier output/);
    assert.equal(labPath(REPO, `${rel}/census`, 'read', root), join(here, 'census'));
    // a drive copy with an empty folder is no answer; one without plan.json while the repo's has one is none either
    const moved = join(root, `labdata-strand-${process.pid}`, 'census');
    mkdirSync(moved, { recursive: true });
    assert.match(String(strandedReason(join(here, 'census'), moved)), /plan\.json/);
    writeFileSync(join(moved, 'games.jsonl'), '{}\n');
    assert.match(String(strandedReason(join(here, 'census'), moved)), /plan\.json/);
    // moved: the drive copy has the plan, so the write goes there
    writeFileSync(join(moved, 'plan.json'), '{}');
    assert.equal(labPath(REPO, `${rel}/census`, 'write', root), moved);
    // an empty repo folder strands nothing; unset, nothing is refused
    mkdirSync(join(here, 'empty'), { recursive: true });
    assert.equal(labPath(REPO, `${rel}/empty`, 'write', root), join(root, `labdata-strand-${process.pid}`, 'empty'));
    assert.equal(labPath(REPO, `${rel}/census`, 'write', null), join(here, 'census'));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(here, { recursive: true, force: true });
  }
});

const P: PlannedGame = { g: 17, seed: 1401000017, a: 'legacy-1401-00811', b: 'legacy-1401-02213' };

test('census-play --record: the match line\'s blocks, the plan\'s mode, the game row, the sizes', () => {
  assert.deepEqual(recordBlocks('none', '/o', P, { a: '/d/a.dck', b: '/d/b.dck', sha: 'x', dir: '/d' }, 'plain', 'plain', 50, REPO), {});
  const rows = recordBlocks('rows', '/o', P, { a: '/d/a.dck', b: '/d/b.dck', sha: 'abc', dir: '/d' }, 'plain', 'plain', 50, REPO) as Record<string, any>;
  assert.equal(rows.rows.dir, '/o/rows');
  assert.equal(rows.rows.key, 'census:1401000017');
  assert.equal(rowsKeyOf(P), 'census:1401000017');
  assert.equal(rows.rows.begin.deckFileA, '/d/a.dck');
  assert.equal(rows.rows.begin.decksSha, 'abc');
  assert.equal(rows.ledger, true);
  assert.equal(rows.rowsCheckEvery, 50);
  assert.equal(rows.record, undefined, 'rows mode writes no frame log');
  // under LAB_DATA_DIR the recipe spells a deck file var/<rest>, so a remounted drive still replays (#160 review)
  const drive = mkdtempSync(join(tmpdir(), 'recipe-'));
  const remount = mkdtempSync(join(tmpdir(), 'recipe-remount-'));
  try {
    const onDrive = recordBlocks('rows', '/o', P, { a: join(drive, 'census', 'decks', 'a.dck'), b: join(REPO, 'decks', 'b.dck'), sha: 'abc', dir: '/d' }, 'plain', 'plain', 50, REPO, drive) as Record<string, any>;
    assert.equal(onDrive.rows.begin.deckFileA, join('var', 'census', 'decks', 'a.dck'));
    assert.equal(onDrive.rows.begin.deckFileB, join('decks', 'b.dck'), 'a repo file stays repo-relative');
    mkdirSync(join(remount, 'census', 'decks'), { recursive: true });
    writeFileSync(join(remount, 'census', 'decks', 'a.dck'), '');
    assert.equal(labPath(REPO, onDrive.rows.begin.deckFileA, 'read', remount), join(remount, 'census', 'decks', 'a.dck'), 'read back from the drive where it is mounted now');
    assert.equal(recipePath(REPO, '/elsewhere/a.dck', drive), '/elsewhere/a.dck');
    assert.equal(recipePath(REPO, join(drive, 'x.dck'), null), join(drive, 'x.dck'), 'unset: as before');
  } finally {
    rmSync(drive, { recursive: true, force: true });
    rmSync(remount, { recursive: true, force: true });
  }
  const full = recordBlocks('full', '/o', P, { a: '/d/a.dck', b: '/d/b.dck', sha: 'abc', dir: '/d' }, 'plain', 'plain', 50, REPO) as Record<string, any>;
  assert.equal(full.record.dir, '/o/frames');
  assert.equal(full.record.name, 'g17');
  assert.equal(full.rowsCheckEvery, 0, 'no zone swaps in a recorded game');
  // the plan: an old plan (no record) is `none`; another mode is refused; the same mode resumes
  const base = { decksSha: 'x', replaySha: null, seed: 1, pairs: 10, policyA: 'plain', policyB: 'plain', games: 10, replay: null };
  assert.equal(planExtension(base, { ...base, record: 'none' }).error, null);
  assert.match(String(planExtension(base, { ...base, record: 'rows' }).error), /record "none" -> "rows"/);
  assert.equal(planExtension({ ...base, record: 'rows' }, { ...base, record: 'rows', pairs: 20, games: 20 }).extended, true, 'a larger --pairs in the same mode extends');
  assert.match(String(planExtension({ ...base, record: 'rows' }, { ...base, record: 'full', pairs: 20, games: 20 }).error), /record/);
  // the game row
  const r = { type: 'match', id: 'g17', forge: [], games: [{ n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'B', turns: 12, ms: 900, timeout: false, reason: 'x', error: null,
    rows: { key: 'census:1401000017', rowsA: 30, rowsB: 28, errorsA: 0, errorsB: 0 }, rowsCheck: { checks: 1, leaks: 0, controls: 1, controlMoved: 1 },
    recorded: { dir: 'frames', bytes: 1000, frames: 40, errors: 0 }, ledger: { v: 1, seats: 2, errors: 0, fields: [], turns: [{ t: 1, active: 0, s: [] }, { t: 2, active: 1, s: [] }] } }] } as unknown as MatchResult;
  const row = rowOf(P, r, 0, 'plain', 'plain');
  assert.equal(row.rows?.rowsA, 30);
  assert.equal(row.rowsCheck?.leaks, 0);
  assert.equal(row.recorded?.bytes, 1000);
  assert.equal(row.ledgerTurns, 2);
  assert.equal((row as unknown as Record<string, unknown>).ledger, undefined, 'the ledger goes to ledger.jsonl, not the games row');
  const st = sizeStats([10, 20, 30, 40]);
  assert.deepEqual([st.games, st.total, st.mean, st.max], [4, 100, 25, 40]);
  assert.equal(sizeStats([]).mean, null);
});

const HEADER = JSON.stringify({ type: 'header', v: 1, featureVersion: 1, stateSchemaId: 'x', stateSize: 10, stateNames: [], cand: { p: ['a', 'b'], a: ['a'], b: ['a'] } });
const BEGIN = (key: string, extra: Record<string, unknown> = {}): string => JSON.stringify({ type: 'begin', v: 1, game: key, g: 3, seed: 5, a: 'd1', b: 'd2', deckFileA: 'x/d1.dck', deckFileB: 'x/d2.dck', seat0: 'Drafter A', seat1: 'Drafter B', ...extra });
const ROW = (key: string, extra: Record<string, unknown> = {}): string => JSON.stringify({ type: 'row', v: 1, game: key, seat: 'Drafter A', kind: 'p', turn: 3, n: 2, chosen: 0, overrode: false, fallback: null, ms: 1.5, policy: 'forge', tokens: ['cast:12', 'pass'], s: [[0, 1], [4, 2.5]], c: [[1, 0], [0, 1]], ...extra });
const END = (key: string): string => JSON.stringify({ type: 'end', v: 1, game: key, ok: true, winner: 'A' });
const run = (lines: string[]): RowsCheck => { const out: RowsCheck = { files: 0, rows: 0, games: 0, problems: [] }; checkRowsText(lines.join('\n'), 'f', out); return out; };

test('the rows\' redaction check: shape', () => {
  assert.deepEqual(run([HEADER, BEGIN('k'), ROW('k'), END('k')]).problems, []);
  assert.match(run([HEADER, ROW('k', { name: 'Lightning Bolt' })]).problems.join(), /unknown row key name/);
  assert.match(run([HEADER, ROW('k', { tokens: ['cast:12', 'Lightning Bolt'] })]).problems.join(), /token outside the grammar/);
  assert.match(run([HEADER, BEGIN('k', { hand: '3' })]).problems.join(), /card-bearing key hand/);
  assert.match(run([HEADER, BEGIN('k', { decklist: ['x'] })]).problems.join(), /not a plain value/);
  assert.match(run([HEADER, ROW('k', { chosen: 2 })]).problems.join(), /chosen 2 is not a candidate/);
  assert.match(run([HEADER, ROW('k', { s: [[11, 1]] })]).problems.join(), /state/);
  assert.match(run([HEADER, ROW('k', { c: [[1, 0, 3], [0, 1]] })]).problems.join(), /width/);
  for (const t of ['pass', 'land:3', 'cast:12', 'activate:7', 'activate:7#1', 'attack:none', 'attack:3,9', 'block:none', 'block:4>9,5>9', '?']) assert.ok(TOKEN.test(t), t);
  for (const t of ['cast:', 'cast:Bolt', 'attack:3,', 'block:4-9', 'pass ']) assert.ok(!TOKEN.test(t), t);
  assert.deepEqual(tokenIds('block:4>9,5>9'), [4, 9, 5, 9]);
  assert.deepEqual(tokenIds('activate:7#1'), [7]);
});

test('the rows\' redaction check: every id a row names is one its seat\'s own log shows', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rowscheck-'));
  try {
    const rows = join(dir, 'rows');
    mkdirSync(rows);
    writeFileSync(join(rows, 'rows-1.jsonl'), [HEADER, BEGIN('k'), ROW('k'), ROW('k', { kind: 'a', n: 2, tokens: ['attack:none', 'attack:12,40'], c: [[1], [0]] }), END('k')].join('\n') + '\n');
    // seat 0's log shows 12 in its hand and 40 on the battlefield; 99 only as a hidden stub
    const log = (ids: number[]): Buffer => zlib.gzipSync([JSON.stringify({ kind: 'session' }), JSON.stringify({ dir: 's2c', type: 'state', body: { players: [{ zones: {
      hand: { cards: ids.map((id) => ({ id, name: 'X', zone: 'hand' })) }, battlefield: [{ id: 40, name: 'Y', zone: 'battlefield' }], library: { count: 3, cards: [] } } },
    { zones: { hand: { cards: [{ id: 99, zone: 'hand', owner: 1, controller: 1, hidden: true }] } } }] } })].join('\n'));
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), log([12]));
    assert.deepEqual([...visibleIds(zlib.gunzipSync(readFileSync(join(dir, 'g3-seat0.jsonl.gz'))).toString())].sort(), [12, 40]);
    const ok = checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`));
    assert.deepEqual(ok.problems, []);
    assert.equal(ok.games, 1);
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), log([13]));       // 12 never shown to seat 0
    const bad = checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`));
    assert.match(bad.problems.join(), /names id 12 .*never shows it/);
    // D491 (D481's first shape): a token born onto the viewer's own battlefield between frames, gone to its graveyard
    // before the next snapshot, is shown by its zone events alone (J173 s04: Food Token 96, made and sacrificed in one step).
    const events = (moves: unknown[]): string => JSON.stringify({ dir: 's2c', type: 'state', body: { players: [], events: moves } });
    const bornLog = (to: { zone: string; player: number }, from: unknown = null): Buffer => zlib.gzipSync([JSON.stringify({ kind: 'session' }), log([13]).length ? zlib.gunzipSync(log([13])).toString().split('\n')[1] : '',
      events([{ kind: 'zone', cardId: 12, from, to: { zone: 'battlefield', player: 0 } }, { kind: 'sacrificed', cardId: 12 }, { kind: 'zone', cardId: 12, from: { zone: 'battlefield', player: 0 }, to }])].join('\n'));
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), bornLog({ zone: 'graveyard', player: 0 }));
    assert.ok(visibleIds(zlib.gunzipSync(readFileSync(join(dir, 'g3-seat0.jsonl.gz'))).toString(), 0).has(12), 'born to seat 0, ended in its graveyard: shown');
    assert.ok(!visibleIds(zlib.gunzipSync(readFileSync(join(dir, 'g3-seat0.jsonl.gz'))).toString()).has(12), 'without a seat the events vouch for nothing');
    assert.deepEqual(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems, []);
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), bornLog({ zone: 'exile', player: 0 }));            // its latest move is into exile
    assert.match(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems.join(), /names id 12 .*never shows it/);
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), bornLog({ zone: 'graveyard', player: 0 }, { zone: 'hand', player: 0 }));   // not born: it came from a hand
    assert.match(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems.join(), /names id 12 .*never shows it/);
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), bornLog({ zone: 'graveyard', player: 1 }));        // the other seat's graveyard
    assert.match(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems.join(), /names id 12 .*never shows it/);
    // Born onto the OTHER seat's battlefield and ending in the viewer's graveyard (stolen, then lost): not the viewer's birth.
    const otherBorn = zlib.gzipSync([JSON.stringify({ kind: 'session' }), zlib.gunzipSync(log([13])).toString().split('\n')[1],
      events([{ kind: 'zone', cardId: 12, from: null, to: { zone: 'battlefield', player: 1 } }, { kind: 'zone', cardId: 12, from: { zone: 'battlefield', player: 1 }, to: { zone: 'graveyard', player: 0 } }])].join('\n'));
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), otherBorn);
    assert.match(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems.join(), /names id 12 .*never shows it/);
    // The seat index is the one checked: a seat-1 row is vouched for by seat 1's own log, with the birth onto seat 1's battlefield.
    writeFileSync(join(rows, 'rows-1.jsonl'), [HEADER, BEGIN('k'), ROW('k', { seat: 'Drafter B', kind: 'a', n: 2, tokens: ['attack:none', 'attack:12'], c: [[1], [0]] }), END('k')].join('\n') + '\n');
    const seat1Born = (player: number): Buffer => zlib.gzipSync([JSON.stringify({ kind: 'session' }),
      events([{ kind: 'zone', cardId: 12, from: null, to: { zone: 'battlefield', player } }, { kind: 'zone', cardId: 12, from: { zone: 'battlefield', player }, to: { zone: 'graveyard', player } }])].join('\n'));
    writeFileSync(join(dir, 'g3-seat1.jsonl.gz'), seat1Born(1));
    assert.deepEqual(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems, []);
    writeFileSync(join(dir, 'g3-seat1.jsonl.gz'), seat1Born(0));                                    // seat 0's token, in seat 1's log
    assert.match(checkRowsDir(rows, (_b, seat) => join(dir, `g3-seat${seat}.jsonl.gz`)).problems.join(), /names id 12 .*never shows it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D499: a killed attempt\'s play (a begin with no end) is abandoned when its key ended in another file; the id check reads the ended play only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rowscheck-d499-'));
  try {
    const rows = join(dir, 'rows');
    mkdirSync(rows);
    const K = 'atlas:d28:forge:o2:b39';
    const B = (): string => BEGIN(K, { decision: 28, continuation: 'forge', option: 2, branch: 39 });
    const atk = (ids: string): string => ROW(K, { seat: 'Drafter B', kind: 'a', n: 2, tokens: ['attack:none', `attack:${ids}`], c: [[1], [0]] });
    // J181 s13: the hung attempt (worker 1522578) wrote its begin and rows naming id 250, a card of that play alone, and no end;
    // the unit's re-run (worker 1522575) played the branch again to its end, and the frame logs on disk are the re-run's.
    const killed = [HEADER, BEGIN('atlas:d28:forge:o2:b38'), ROW('atlas:d28:forge:o2:b38'), END('atlas:d28:forge:o2:b38'), B(), ROW(K), atk('77,250'), atk('250')].join('\n') + '\n';
    const rerun = [HEADER, B(), ROW(K), atk('77'), JSON.stringify({ type: 'end', v: 1, game: K, ok: false, winner: null })].join('\n') + '\n';
    writeFileSync(join(rows, 'rows-1522578.jsonl'), killed);
    writeFileSync(join(rows, 'rows-1522575.jsonl'), rerun);
    // seat 1's log (the re-run's) shows 77 and never 250; seat 0's shows 12 and 40
    const log = (ids: number[]): Buffer => zlib.gzipSync([JSON.stringify({ kind: 'session' }), JSON.stringify({ dir: 's2c', type: 'state', body: { players: [{ zones: {
      battlefield: ids.map((id) => ({ id, name: 'X', zone: 'battlefield' })) } }] } })].join('\n'));
    writeFileSync(join(dir, 'seat0.jsonl.gz'), log([12, 40]));
    writeFileSync(join(dir, 'seat1.jsonl.gz'), log([77]));
    const logOf = (_b: Record<string, unknown>, seat: number): string => join(dir, `seat${seat}.jsonl.gz`);
    const rc = checkRowsDir(rows, logOf);
    assert.deepEqual(rc.problems, [], 'the killed play\'s id 250 is not read against the re-run\'s log');
    assert.equal(rc.rows, 6, 'every row is still shape-checked, the abandoned ones too');
    assert.equal(rc.games, 2, 'b38 and b39, b39 once');
    assert.deepEqual(rc.abandoned, [{ game: K, file: 'rows-1522578.jsonl', rows: 3 }]);
    assert.deepEqual(rc.playedTwice, []);
    const { games } = collectRows(rows, logOf);
    assert.deepEqual(games.find((g) => g.key === K)?.rows.map((r) => r.tokens.join(' ')), ['cast:12 pass', 'attack:none attack:77'], 'the ended play\'s rows, and only those');
    // the size reads the same play: b39's bytes are the re-run's lines alone
    const bytes = (lines: string[]): number => lines.reduce((a, l) => a + Buffer.byteLength(l) + 1, 0);
    assert.equal(rowBytesByGame(rows).get(K), bytes(rerun.split('\n').slice(1, -1)));
    // the control, the truncated case: with no ended play anywhere the killed play is kept and checked, as before D499
    rmSync(join(rows, 'rows-1522575.jsonl'));
    const trunc = checkRowsDir(rows, logOf);
    assert.deepEqual(trunc.abandoned, []);
    assert.equal(trunc.problems.length, 2);
    assert.match(trunc.problems.join('\n'), /atlas:d28:forge:o2:b39: seat Drafter B's row names id 250 \(attack:77,250\), which its own log never shows it/);
    assert.equal(rowBytesByGame(rows).get(K), bytes(killed.split('\n').slice(4, -1)), 'a truncated play still has its size');
    // a key that ended ok:true in two files is a problem, and each play is checked on its own (the second's 250 still fails)
    const rerunOk = rerun.replace(/\{"type":"end".*\n$/, `${END(K)}\n`);
    writeFileSync(join(rows, 'rows-1522575.jsonl'), rerunOk);
    writeFileSync(join(rows, 'rows-1522578.jsonl'), killed + END(K) + '\n');
    const twice = checkRowsDir(rows, logOf);
    assert.deepEqual(twice.playedTwice, [{ game: K, files: ['rows-1522575.jsonl', 'rows-1522578.jsonl'] }]);
    assert.deepEqual([twice.abandoned, twice.superseded], [[], []]);
    assert.equal(twice.games, 3);
    assert.match(twice.problems[0] as string, /^atlas:d28:forge:o2:b39: ended ok:true 2 times \(rows-1522575.jsonl, rows-1522578.jsonl\)/);
    assert.equal(twice.problems.filter((p) => /names id 250/.test(p)).length, 2);
    // the review: an ok:false end beside an ok:true one is superseded, not a second game (the killed file's play here ends
    // ok:true, the re-run's ok:false): no problem though the ok:false play names 250, which it is not checked for, and its rows
    // are not in the size
    writeFileSync(join(rows, 'rows-1522575.jsonl'), [HEADER, B(), atk('250'), JSON.stringify({ type: 'end', v: 1, game: K, ok: false, winner: null })].join('\n') + '\n');
    writeFileSync(join(rows, 'rows-1522578.jsonl'), [HEADER, B(), atk('77'), END(K)].join('\n') + '\n');
    const sup = checkRowsDir(rows, logOf);
    assert.deepEqual([sup.problems, sup.playedTwice, sup.abandoned, sup.superseded, sup.games], [[], [], [], [{ game: K, file: 'rows-1522575.jsonl', rows: 1 }], 1]);
    assert.equal(rowBytesByGame(rows).get(K), bytes([B(), atk('77'), END(K)]));
    // a begin again in the SAME file (a worker that lived on) leaves its earlier play unended: abandoned beside the later one
    rmSync(join(rows, 'rows-1522575.jsonl'));
    writeFileSync(join(rows, 'rows-1522578.jsonl'), [HEADER, B(), atk('250'), B(), atk('77'), END(K)].join('\n') + '\n');
    const again = checkRowsDir(rows, logOf);
    assert.deepEqual([again.problems, again.abandoned], [[], [{ game: K, file: 'rows-1522578.jsonl', rows: 1 }]]);
    // the review: a row outside any begin..end of its key (after its end, or with no begin in its file) is an orphan, counted and
    // not id-checked; a begin-less play gives no size, so the begun play's is the game's
    writeFileSync(join(rows, 'rows-1522578.jsonl'), [HEADER, atk('250'), B(), atk('77'), END(K), atk('250')].join('\n') + '\n');
    const orphans = checkRowsDir(rows, logOf);
    assert.deepEqual([orphans.problems, orphans.orphanRows, orphans.games, orphans.rows], [[], 2, 1, 3]);
    writeFileSync(join(rows, 'rows-1522575.jsonl'), [HEADER, atk('77'), END(K)].join('\n') + '\n');
    writeFileSync(join(rows, 'rows-1522578.jsonl'), [HEADER, B(), atk('77')].join('\n') + '\n');
    assert.equal(rowBytesByGame(rows).get(K), bytes([B(), atk('77')]), 'the begun play, not the begin-less one that ended');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D499, the review: census-play\'s retry of a stuck game (J160 B-lab\'s census:1803001575) is one game, not a key played twice', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rowscheck-d499-census-'));
  try {
    const rows = join(dir, 'rows');
    mkdirSync(rows);
    const K = 'census:1803001575';
    const stuck = JSON.stringify({ type: 'end', v: 1, game: K, ok: false, winner: null });
    // J160: the game timed out and its thread would not stop; CubeLab wrote end ok:false, the worker exited 3, the pool called
    // it an engine error, and census-play retried it on a fresh worker under the same key -- which timed out the same way.
    const play = [HEADER, BEGIN(K), ROW(K), ROW(K, { tokens: ['cast:40', 'pass'] }), stuck].join('\n') + '\n';
    writeFileSync(join(rows, 'rows-1397355.jsonl'), play);
    writeFileSync(join(rows, 'rows-3965741.jsonl'), play);
    writeFileSync(join(dir, 'g3-seat0.jsonl.gz'), zlib.gzipSync(JSON.stringify({ dir: 's2c', type: 'state', body: { players: [{ zones: { battlefield: [12, 40].map((id) => ({ id, name: 'X', zone: 'battlefield' })) } }] } })));
    const logOf = (_b: Record<string, unknown>, seat: number): string => join(dir, `g3-seat${seat}.jsonl.gz`);
    const both = checkRowsDir(rows, logOf);
    assert.deepEqual([both.problems, both.playedTwice, both.abandoned, both.superseded, both.games], [[], [], [], [], 2], 'two ok:false ends: a game that timed out twice, each play checked, no problem');
    const one = play.split('\n').slice(1, -1);
    assert.equal(rowBytesByGame(rows).get(K), one.reduce((a, l) => a + Buffer.byteLength(l) + 1, 0), 'one play\'s size, not both added');
    // the retry that finished: the stuck play is superseded, never a problem, and left out of the check and the size
    const retry = [HEADER, BEGIN(K), ROW(K), END(K)];
    writeFileSync(join(rows, 'rows-3965741.jsonl'), retry.join('\n') + '\n');
    const fin = checkRowsDir(rows, logOf);
    assert.deepEqual([fin.problems, fin.playedTwice, fin.superseded, fin.games], [[], [], [{ game: K, file: 'rows-1397355.jsonl', rows: 2 }], 1]);
    assert.equal(rowBytesByGame(rows).get(K), retry.slice(1).reduce((a, l) => a + Buffer.byteLength(l) + 1, 0));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('census-replay: the last complete run of a game is read, the wall time ignored, the first difference named', () => {
  const twice = [HEADER, BEGIN('k'), ROW('k', { turn: 1 }), JSON.stringify({ type: 'end', game: 'k', ok: false, winner: null }),
    BEGIN('k'), ROW('k', { turn: 1, ms: 9 }), ROW('k', { turn: 2 }), END('k'), BEGIN('other'), ROW('other'), END('other')].join('\n');
  const g = gameLines(twice, 'k');
  assert.equal(g.rows.length, 2, 'the retried run, not the failed one');
  assert.equal(g.end?.winner, 'A');
  const same = gameLines([BEGIN('k'), ROW('k', { turn: 1, ms: 400 }), ROW('k', { turn: 2, ms: 1 }), END('k')].join('\n'), 'k');
  assert.deepEqual(compareGames(g, same), { same: true, rows: 2, firstDiff: null });
  const other = gameLines([BEGIN('k'), ROW('k', { turn: 1 }), ROW('k', { turn: 2, chosen: 1 }), END('k')].join('\n'), 'k');
  const c = compareGames(g, other);
  assert.equal(c.same, false);
  assert.match(String(c.firstDiff), /row 2 .*played 0 vs 1/);
  const shorter = gameLines([BEGIN('k'), ROW('k', { turn: 1 }), END('k')].join('\n'), 'k');
  assert.match(String(compareGames(g, shorter).firstDiff), /has no row here/);
});

test('census-replay: two recordings of one game are equal but for the wall clock; a changed frame is named', () => {
  const log = (t: number, ms: number, life: number): string => [
    JSON.stringify({ v: 1, kind: 'session', startedAt: t }),
    JSON.stringify({ v: 1, seq: 1, t, dir: 's2c', type: 'state', body: { turn: 1, players: [{ life }] } }),
    JSON.stringify({ v: 1, seq: 2, t: t + 5, dir: 'ai', type: 'decisions', body: { seat: 0, written: 3, recordMs: ms, buildMs: ms * 2 } }),
  ].join('\n');
  assert.equal(framesFace(log(1, 2, 20)).length, 2, 'the session header is not compared');
  assert.equal(compareFrames(log(1000, 21, 20), log(99999, 17, 20)), null);
  assert.match(String(compareFrames(log(1, 2, 20), log(1, 2, 19))), /line 1 .*"life":20.* vs .*"life":19/);
  // the stack's instance ids are the process's count, not the game's: renumbered by first appearance
  const st = (ids: number[]): string => ids.map((id, i) => JSON.stringify({ seq: i, dir: 's2c', type: 'state', body: { stack: [{ id, name: 'x' }], events: [{ type: 'cast', stackId: id }] } })).join('\n');
  assert.equal(compareFrames(st([1376, 1380, 1376]), st([1, 5, 1])), null);
  assert.notEqual(compareFrames(st([1376, 1380, 1376]), st([1, 5, 5])), null, 'a different stack order still shows');
});

test('census-replay: --out naming a census folder, or one holding the rows file, is refused before anything is deleted (#160 review)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'replay-out-'));
  try {
    const census = join(dir, 'census');
    mkdirSync(join(census, 'rows'), { recursive: true });
    mkdirSync(join(census, 'frames'), { recursive: true });
    for (const d of ['a', 'b']) writeFileSync(join(dir, `${d}.dck`), '[metadata]\nName=x\n[Main]\n');
    const rowsFile = join(census, 'rows', 'rows-1.jsonl');
    writeFileSync(rowsFile, [HEADER, BEGIN('census:5', { deckFileA: join(dir, 'a.dck'), deckFileB: join(dir, 'b.dck') }), ROW('census:5'), END('census:5')].join('\n') + '\n');
    writeFileSync(join(census, 'frames', 'g3-seat0.jsonl.gz'), 'x');
    writeFileSync(join(census, 'plan.json'), '{}');
    writeFileSync(join(census, 'games.jsonl'), '{}\n');
    const f = (out: string): Map<string, string[]> => new Map([['game', ['census:5']], ['out', [out]]]);
    // the whole command: it refuses, and the night is still there
    await assert.rejects(censusReplayCommand(dir, [rowsFile], f(census), () => {}), /holds plan\.json, so it is a census folder/);
    assert.ok(existsSync(rowsFile), 'the rows survive');
    assert.ok(existsSync(join(census, 'frames', 'g3-seat0.jsonl.gz')), 'the frame logs survive');
    // games.jsonl alone marks a census folder too; a folder holding the rows file (no plan) is refused
    rmSync(join(census, 'plan.json'));
    assert.match(String(replayOutRefusal(census, rowsFile)), /holds games\.jsonl/);
    rmSync(join(census, 'games.jsonl'));
    assert.match(String(replayOutRefusal(census, rowsFile)), /contains the rows file/);
    assert.match(String(replayOutRefusal(join(census, 'rows'), rowsFile)), /contains the rows file/);
    await assert.rejects(censusReplayCommand(dir, [rowsFile], f(join(census, 'rows')), () => {}), /contains the rows file/);
    assert.ok(existsSync(rowsFile), 'the rows survive');
    // a folder of its own is fine
    assert.equal(replayOutRefusal(join(dir, 'replay'), rowsFile), null);
    assert.equal(replayOutRefusal(join(dir, 'census-2'), rowsFile), null, 'a sibling whose name starts the same is not inside');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
