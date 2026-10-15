// The leak report (D438, J129): its kinds, its pre-registered honesty rule and its
// input's identity rules, on synthetic graded decisions.  No engine, no file.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockPairs, classify, contextOf, isChump, KIND_IDS, KINDS } from '../../tools/leaks/classify.ts';
import { buildLeaks, reportMd, rowsOf, strictShape, verify, type Row, type Tally } from '../../tools/leaks/report.ts';
import { isLeak, isMistake, kindStats, meanInterval, needed, RULE, type GradedRow } from '../../tools/leaks/rule.ts';
import { factsOf, guessCube, judgeLog, judgeName, mainCards, parseLog, type Log } from '../../tools/leaks/stage.ts';

const B = 2000; // the tests' bootstrap size: the rule's is 10,000, the arithmetic is the same

// ---------------------------------------------------------------- the board context

function card(id: number, types: string, tapped = false, power: string | null = null, toughness: string | null = null, damage = 0) {
  return { id, name: 'x', types, tapped, power, toughness, damage };
}
function state(mine: object[], theirs: object[]) {
  return {
    turn: 5,
    players: [
      { id: 0, zones: { battlefield: { count: mine.length, cards: mine } } },
      { id: 1, zones: { battlefield: { count: theirs.length, cards: theirs } } },
    ],
  };
}

test('contextOf counts only the opponent\'s untapped lands and creatures, and reads every P/T', () => {
  const s = state(
    [card(1, 'Basic Land - Plains'), card(2, 'Creature - Human', false, '2', '2')],
    [card(10, 'Basic Land - Swamp'), card(11, 'Land', true), card(12, 'Creature - Zombie', false, '3', '3', 1), card(13, 'Artifact Creature - Golem', true, '4', '4'), card(14, 'Basic Land - Island')],
  );
  const c = contextOf(s, 0);
  assert.equal(c.oppUntappedLands, 2);
  assert.equal(c.oppUntappedCreatures, 1);
  assert.deepEqual(c.pt['12'], { p: 3, t: 3, damage: 1 });
  assert.deepEqual(c.pt['2'], { p: 2, t: 2, damage: 0 });
  assert.equal(contextOf(s, 1).oppUntappedLands, 1, 'from the other seat, seat 0\'s one untapped land');
});

// ---------------------------------------------------------------- every kind

const open = contextOf(state([], [card(10, 'Land'), card(11, 'Land')]), 0);
const shut = contextOf(state([], [card(10, 'Land'), card(11, 'Land', true)]), 0);
const opts = (...t: string[]) => t.map((token) => ({ token }));

test('spell decisions: held, cast into open mana, sequencing, tapped out (in that order)', () => {
  assert.deepEqual(classify({ type: 'spell', played: 'pass', playedOption: 'pass', options: opts('pass', 'cast:5') }, open),
    { kind: 'mana-up-vs-tap-out', direction: 'held' }, 'a pass is holding up, open mana or not');
  assert.deepEqual(classify({ type: 'spell', played: 'cast:5', playedOption: 'cast:5', options: opts('pass', 'cast:5', 'cast:6') }, open),
    { kind: 'cast-into-open-mana' }, 'open mana comes before sequencing');
  assert.deepEqual(classify({ type: 'spell', played: 'cast:5', playedOption: 'cast:5', options: opts('pass', 'cast:5', 'cast:6') }, shut),
    { kind: 'sequencing' });
  assert.deepEqual(classify({ type: 'spell', played: 'cast:5', playedOption: 'cast:5', options: opts('pass', 'cast:5') }, shut),
    { kind: 'mana-up-vs-tap-out', direction: 'tapped' });
});

test('attack decisions: no attack into an empty board is its own kind', () => {
  const empty = contextOf(state([], [card(12, 'Creature', true, '2', '2')]), 0);
  const guarded = contextOf(state([], [card(12, 'Creature', false, '2', '2')]), 0);
  assert.equal(classify({ type: 'attack', played: 'attack:none', playedOption: 'attack:none' }, empty).kind, 'no-attack-when-free');
  assert.equal(classify({ type: 'attack', played: 'attack:none', playedOption: 'attack:none' }, guarded).kind, 'attack-other');
  assert.equal(classify({ type: 'attack', played: 'attack:3', playedOption: 'attack:3' }, empty).kind, 'attack-other');
});

test('block decisions: double blocks and chumps by printed P/T less damage; trades and no block are other', () => {
  const ctx = contextOf(state(
    [card(1, 'Creature', false, '1', '1'), card(2, 'Creature', false, '3', '3'), card(3, 'Creature', false, '1', '4')],
    [card(20, 'Creature', false, '3', '3'), card(21, 'Creature', false, '2', '5', 4)],
  ), 0);
  assert.deepEqual(blockPairs('block:1>20,2>20'), [['1', '20'], ['2', '20']]);
  assert.deepEqual(blockPairs('block:none'), []);
  assert.equal(classify({ type: 'block', played: 'block:1>20,2>20', playedOption: 'block:1>20,2>20' }, ctx).kind, 'chump-or-double-block', 'double');
  assert.equal(classify({ type: 'block', played: 'block:1>20', playedOption: 'block:1>20' }, ctx).kind, 'chump-or-double-block', '1/1 into 3/3: chump');
  assert.equal(classify({ type: 'block', played: 'block:2>20', playedOption: 'block:2>20' }, ctx).kind, 'block-other', '3/3 into 3/3: a trade');
  assert.equal(classify({ type: 'block', played: 'block:3>20', playedOption: 'block:3>20' }, ctx).kind, 'block-other', '1/4 survives a 3/3');
  assert.equal(classify({ type: 'block', played: 'block:1>21', playedOption: 'block:1>21' }, ctx).kind, 'block-other', '1/1 kills a 2/5 with 4 damage');
  assert.equal(classify({ type: 'block', played: 'block:none', playedOption: 'block:none' }, ctx).kind, 'block-other');
  assert.equal(isChump({ p: NaN, t: 1, damage: 0 }, { p: 3, t: 3, damage: 0 }), false, 'a */* is never called a chump');
});

test('targets, the two kinds no grader covers, and an unknown type', () => {
  assert.equal(classify({ type: 'target', played: 'target:9', playedOption: 'target:9' }, shut).kind, 'target-choice');
  assert.deepEqual(KINDS.filter((k) => !k.covered).map((k) => k.id), ['land-late', 'keep-or-mulligan']);
  assert.equal(new Set(KIND_IDS).size, 10);
  assert.throws(() => classify({ type: 'mulligan' }, shut), /does not know/);
});

// ---------------------------------------------------------------- the honesty rule

test('a mistake is an interval that excludes zero: touching it is not', () => {
  assert.equal(isMistake({ regretLo: 0 }), false);
  assert.equal(isMistake({ regretLo: 1e-9 }), true);
  assert.equal(isMistake({ regretLo: NaN }), false);
});

test('a leak: 5 mistakes, 3 games, mean interval above zero -- each edge on its own', () => {
  assert.equal(isLeak({ mistakes: 5, mistakeGames: 3, meanLo: 0.01 }), true);
  assert.equal(isLeak({ mistakes: 4, mistakeGames: 3, meanLo: 0.01 }), false, '4 mistakes');
  assert.equal(isLeak({ mistakes: 5, mistakeGames: 2, meanLo: 0.01 }), false, '2 games');
  assert.equal(isLeak({ mistakes: 5, mistakeGames: 3, meanLo: 0 }), false, 'an interval touching zero');
  assert.equal(isLeak({ mistakes: 5, mistakeGames: 3, meanLo: -0.02 }), false);
  assert.equal(isLeak({ mistakes: 9, mistakeGames: 9, meanLo: null }), false);
  assert.deepEqual([RULE.minMistakes, RULE.minGames, RULE.level, RULE.mistakeLoAbove], [5, 3, 0.95, 0]);
});

const clear = (game: string, r = 0.15): GradedRow => ({ game, regret: r, regretLo: r - 0.05, regretHi: r + 0.05 });
const fine = (game: string): GradedRow => ({ game, regret: 0, regretLo: 0, regretHi: 0.04 });

test('kindStats on synthetic decisions: the counts, then the verdict', () => {
  const five3 = [clear('g1'), clear('g1'), clear('g2'), clear('g2'), clear('g3'), fine('g1'), fine('g4')];
  const s = kindStats(five3, B, 7);
  assert.deepEqual([s.n, s.games, s.mistakes, s.mistakeGames], [7, 4, 5, 3]);
  assert.ok((s.meanLo as number) > 0, `meanLo ${s.meanLo}`);
  assert.equal(s.leak, 1);
  assert.equal(kindStats([clear('g1'), clear('g1'), clear('g2'), clear('g2'), clear('g3')].slice(0, 4).concat([fine('g3')]), B, 7).leak, 0, '4 mistakes');
  assert.equal(kindStats([clear('g1'), clear('g1'), clear('g1'), clear('g2'), clear('g2')], B, 7).leak, 0, '5 mistakes in 2 games');
  const empty = kindStats([], B, 7);
  assert.deepEqual([empty.n, empty.meanRegret, empty.meanLo, empty.leak], [0, null, null, 0]);
});

test('5 clear mistakes in 3 games are still not a leak when the kind\'s mean interval reaches zero', () => {
  // small clear mistakes drowned among many wide, zero-regret decisions of the same kind
  const rows: GradedRow[] = [
    { game: 'g1', regret: 0.03, regretLo: 0.001, regretHi: 0.059 }, { game: 'g1', regret: 0.03, regretLo: 0.001, regretHi: 0.059 },
    { game: 'g2', regret: 0.03, regretLo: 0.001, regretHi: 0.059 }, { game: 'g2', regret: 0.03, regretLo: 0.001, regretHi: 0.059 },
    { game: 'g3', regret: 0.03, regretLo: 0.001, regretHi: 0.059 },
  ];
  for (let i = 0; i < 40; i++) rows.push({ game: `h${i % 8}`, regret: 0, regretLo: 0, regretHi: 0.9 });
  const s = kindStats(rows, B, 7);
  assert.equal(s.mistakes, 5);
  assert.equal(s.mistakeGames, 3);
  assert.ok((s.meanLo as number) <= 0, `meanLo ${s.meanLo} should reach zero`);
  assert.equal(s.leak, 0);
});

test('the bootstrap is a function of its seed', () => {
  const rows = [clear('a'), clear('b', 0.3), fine('c'), clear('c', 0.08)];
  assert.deepEqual(meanInterval(rows, 500, 3), meanInterval(rows, 500, 3));
  assert.notDeepEqual(meanInterval(rows, 500, 3), meanInterval(rows, 500, 4));
  assert.equal(meanInterval(rows, 500, 3).mean, (0.15 + 0.3 + 0 + 0.08) / 4);
});

test('needed: the best kind\'s rate per graded game, never fewer than minGames', () => {
  const by = { a: kindStats([clear('g1'), clear('g2')], B, 1), b: kindStats([fine('g1')], B, 1) };
  assert.deepEqual(needed(by, 4), { bestKindMistakes: 2, bestKindMistakeGames: 2, mistakesPerGame: 0.5, gamesNeededAtBestRate: 10 });
  assert.equal(needed({ a: kindStats([clear('g1'), clear('g1'), clear('g1'), clear('g1'), clear('g2')], B, 1) }, 1).gamesNeededAtBestRate, 3);
  assert.equal(needed({ b: kindStats([fine('g1')], B, 1) }, 7).gamesNeededAtBestRate, null);
});

// ---------------------------------------------------------------- leaks.json, verify, strictness

function row(game: string, kind: string, r: GradedRow, frame: number): Row {
  return { game, frame, seq: frame + 1, stateFrame: frame - 2, turn: 3, type: 'spell', kind, direction: kind === 'mana-up-vs-tap-out' ? 'held' : null,
    regret: r.regret, regretLo: r.regretLo, regretHi: r.regretHi, measure: 'wins', stage: 'deep', verdict: isMistake(r) ? 'mistake' : 'best', mistake: isMistake(r) ? 1 : 0 };
}
const tally: Tally = { planned: 12, graded: 11, trivial: 1, notGraded: 0, byType: { spell: 12 } };
const meta = { gamesIdentified: 4, gamesGraded: 4, gamesExcluded: 2, reviewsFailed: 0, gamesEmpty: 0, mulligans: 4, review: { jobs: 7 } };

test('leaks.json: strict, every kind present, examples only for a leak, and verify agrees', () => {
  const rows = [
    ...['g1', 'g1', 'g2', 'g3', 'g3'].map((g, i) => row(g, 'sequencing', clear(g, 0.1 + i / 100), 10 + i)),
    row('g4', 'sequencing', fine('g4'), 30),
    row('g1', 'target-choice', clear('g1'), 40),
    ...['g1', 'g2', 'g3', 'g4'].map((g, i) => row(g, 'mana-up-vs-tap-out', fine(g), 50 + i)),
  ];
  const leaks = buildLeaks(rows, tally, meta, B, 11) as Record<string, any>;
  const text = JSON.stringify(leaks);
  assert.doesNotMatch(text, /NaN|Infinity/);
  assert.equal(strictShape(JSON.parse(text)), true);
  assert.deepEqual(Object.keys(leaks.kinds), [...KIND_IDS]);
  assert.equal(leaks.leaks, 1);
  assert.equal(leaks.kinds.sequencing.leak, 1);
  assert.equal(leaks.kinds.sequencing.examples.length, 5);
  assert.deepEqual(leaks.kinds.sequencing.examples[0], { game: 'g3', seq: 15, frame: 14, turn: 3, regret: 0.14, regretLo: 0.14 - 0.05 }, 'largest regret first, with the act\'s seq');
  assert.equal(leaks.kinds['target-choice'].leak, 0);
  assert.deepEqual(leaks.kinds['target-choice'].examples, []);
  assert.equal(leaks.kinds['keep-or-mulligan'].covered, 0);
  assert.equal(leaks.kinds['keep-or-mulligan'].seen, 4);
  assert.equal(leaks.kinds['mana-up-vs-tap-out'].held, 4);
  assert.deepEqual(verify(rows, JSON.parse(text), B, 11), { mismatches: 0, what: [] });
  // tampering is caught
  const bad = JSON.parse(text);
  bad.kinds['target-choice'].leak = 1;
  assert.ok(verify(rows, bad, B, 11).mismatches >= 2);
  const fewer = JSON.parse(text);
  fewer.kinds.sequencing.mistakes = 4;
  assert.ok(verify(rows, fewer, B, 11).what.some((w) => w.startsWith('sequencing.mistakes')));
  const notStrict = JSON.parse(text);
  notStrict.kinds.sequencing.meanLo = 'about 0.1';
  assert.equal(strictShape(notStrict), false);
  const md = reportMd(leaks, [{ gameId: 'friend-m1-seat1', why: 'the other seat of a game between two people: never opened' }]);
  assert.match(md, /1 leak shown/);
  assert.match(md, /### Leak: which spell to cast first/);
  assert.match(md, /friend's log was never opened/);
});

test('no leak: the report says what a verdict needs', () => {
  const rows = [row('g1', 'sequencing', clear('g1'), 10), row('g2', 'sequencing', fine('g2'), 11)];
  const leaks = buildLeaks(rows, tally, meta, B, 11) as Record<string, any>;
  assert.equal(leaks.leaks, 0);
  assert.equal(leaks.needed.gamesNeededAtBestRate, 20);
  assert.match(reportMd(leaks, []), /No leak shown[\s\S]*about 20 graded games/);
});

// ---------------------------------------------------------------- whose game it is

const header = (o: object) => JSON.stringify({ v: 1, kind: 'session', seed: 1, startedAt: '2026-10-10T00:00:00Z', ...o });
const hello = (players: object[], you = 0) => JSON.stringify({ v: 1, seq: 1, dir: 's2c', type: 'hello_ok', body: { you, players } });
const logOf = (...lines: string[]): Log => parseLog(lines);
const vsAi = [{ id: 0, name: 'Human', isAi: false }, { id: 1, name: 'Forge AI', isAi: true }];
const table = [{ id: 0, name: 'Justin', isAi: false }, { id: 1, name: 'Friend', isAi: false }];

test('judgeName: the other seat of a table is never opened; gate recordings are not candidates', () => {
  assert.deepEqual(judgeName('friend-m1791336206841-seat1'), { open: false, why: 'the other seat of a game between two people: never opened' });
  assert.deepEqual(judgeName('friend-m1791336206841-seat0'), { open: true, family: 'friend' });
  assert.deepEqual(judgeName('match-m1791649145759-g2'), { open: true, family: 'match' });
  assert.deepEqual(judgeName('human-ws-92410'), { open: true, family: 'play' });
  assert.equal(judgeName('check-all-ws-3g').open, false);
});

test('judgeLog: whose seat a log is', () => {
  const none = new Set<string>();
  const match = logOf(header({ gameId: 'match-m1791649145759', seat: 0, transport: 'ws' }), hello(vsAi));
  assert.equal(judgeLog(match, 'Justin', none).his, true);
  const play = logOf(header({ gameId: 'human-ws-7', seat: 0, transport: 'ws' }), hello(vsAi));
  assert.equal(judgeLog(play, 'Justin', none).his, false, 'a play.sh id cannot be told');
  assert.equal(judgeLog(play, 'Justin', new Set(['human-ws-7'])).his, true, 'unless the owner names it');
  const auto = logOf(header({ gameId: 'match-m1791649145759', seat: 0, transport: 'auto' }), hello(vsAi));
  assert.equal(judgeLog(auto, 'Justin', none).his, false, 'a scripted seat');
  const aiView = logOf(header({ gameId: 'match-m1791649145759', seat: 1, transport: 'ws' }), hello(vsAi, 1));
  assert.equal(judgeLog(aiView, 'Justin', none).his, false, 'the AI\'s seat');
  const friend = (o: object, players = table, you = 0) => logOf(header({ gameId: 'friend-m1791336206841', transport: 'ws', humans: 2, ...o }), hello(players, you));
  assert.deepEqual(judgeLog(friend({ seat: 0, record: true }), 'Justin', none).his, true);
  assert.equal(judgeLog(friend({ seat: 0 }), 'Justin', none).his, false, 'no consent on the header');
  assert.equal(judgeLog(friend({ seat: 0, record: false }), 'Justin', none).his, false);
  assert.equal(judgeLog(friend({ seat: 0, record: true }), 'Someone', none).his, false, 'seat 0 not named as the owner');
  assert.equal(judgeLog(friend({ seat: 1, record: true }, table, 1), 'Friend', none).his, false, 'never the other seat, whatever its name');
});

test('factsOf counts acts, mulligans, turns and the end; guessCube needs 80% of the non-basics', () => {
  const log = logOf(
    header({ gameId: 'match-m1', seat: 0, transport: 'ws', decks: [{ player: 0, path: 'var/match/m1/you.dck' }, { player: 1, path: null }] }),
    hello(vsAi),
    JSON.stringify({ seq: 2, type: 'input', body: { buttons: { ok: { label: 'Keep' }, cancel: { label: 'Mulligan' } } } }),
    JSON.stringify({ seq: 3, type: 'act', body: { action: 'buttonCancel' } }),
    JSON.stringify({ seq: 4, type: 'act', body: { action: 'buttonOk' } }),
    JSON.stringify({ seq: 5, type: 'state', body: { turn: 6 } }),
    JSON.stringify({ seq: 6, type: 'over', body: {} }),
    '{"seq":7,"type":"st',
  );
  const f = factsOf(log);
  assert.deepEqual([f.acts, f.mulligans, f.turns, f.finished, f.deckPath, f.seat], [2, 2, 6, true, 'var/match/m1/you.dck', 0]);
  const dck = '[metadata]\nName=x\n[Main]\n1 Thraben Inspector|MH3\n1 Blood Artist\n1 Fáerie Vandal\n1 Kept Out\n8 Plains\n[Sideboard]\n1 Other\n';
  assert.deepEqual(mainCards(dck), ['Thraben Inspector', 'Blood Artist', 'Fáerie Vandal', 'Kept Out', 'Plains']);
  const cubes = { a: ['Thraben Inspector', 'Blood Artist', 'Faerie Vandal', 'Z'], b: ['Kept Out'] };
  assert.deepEqual(guessCube(dck, cubes), { cube: null, share: 0.75 }, '3 of 4 non-basics: under 80%');
  assert.deepEqual(guessCube(dck, { ...cubes, a: [...cubes.a, 'Kept Out'] }), { cube: 'a', share: 1 });
});

test('rowsOf: a review report over its log, each decision once, with the act\'s seq and the board it saw', () => {
  const log = logOf(
    header({ gameId: 'g', seat: 0, transport: 'ws' }),
    hello(vsAi),
    JSON.stringify({ seq: 2, type: 'state', body: state([], [card(10, 'Land'), card(11, 'Land')]) }),
    JSON.stringify({ seq: 3, type: 'input', body: {} }),
    JSON.stringify({ seq: 4, type: 'act', body: { action: 'clickCard', cardId: 5 } }),
  );
  const t: Tally = { planned: 0, graded: 0, trivial: 0, notGraded: 0, byType: {} };
  const review = { kind: 'game-review', decisions: [
    { type: 'spell', status: 'ok', frame: 3, stateFrame: 1, turn: 3, played: 'cast:5', playedOption: 'cast:5', options: opts('pass', 'cast:5'),
      regret: 0.2, regretLo: 0.1, regretHi: 0.3, measure: 'wins', stage: 'deep', verdict: 'mistake' },
    { type: 'spell', status: 'trivial', frame: 3, stateFrame: 1 },
    { type: 'attack', status: 'error', frame: 3, stateFrame: 1 },
  ] };
  const rows = rowsOf('g', 0, review, log, t);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0]?.kind, rows[0]?.seq, rows[0]?.mistake], ['cast-into-open-mana', 4, 1]);
  assert.deepEqual([t.planned, t.graded, t.trivial, t.notGraded], [3, 1, 1, 1]);
});
