/*
 * mtg-table — web/test/sound.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Sound cues** (D250–D252): the audio module's voice pool against a fake Web
 * Audio context (nothing before a gesture, eight voices, a ninth dropped, no node
 * built on the play path, `stopAll` silences at once), the sound ladder and its
 * concealed-card gate, the queue's firing rules (once, at the cue's moment; a snap
 * is silent; a flush, a skip and a pause cut the voices), and the committed clips
 * against their manifest rows. The corpus sweep — every recording, made hostile,
 * with an ungated control — is `replay-cues.test.ts`'s.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SOUNDS } from '../src/arena/cues/defaults.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { cuesFor, resolve, selectorsFor } from '../src/arena/cues/resolve.ts';
import {
  MAX_PENDING_SOUNDS,
  PendingSounds,
  SOUND_IDS,
  defaultSoundFor,
  defaultSoundIds,
  isConcealed,
  isSoundId,
  soundFor,
  type SoundId,
} from '../src/arena/cues/sound.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { EMPTY_CUE_DATA, type CueData } from '../src/arena/cues/types.ts';
import { isValidSelector, validateCues } from '../src/arena/cues/validate.ts';
import {
  ArenaAudio,
  MAX_VOICES,
  PAN_LIMIT,
  SOUND_DEFAULT,
  SOUND_FILES,
  VOICE_GAIN_MAX,
  soundOn,
  type AudioContextLike,
} from '../src/arena/scene/audio.ts';
import type { AnyCard, Frame, GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC = `${REPO}web/public/`;

// ---------------------------------------------------------------------------
// A fake Web Audio context: counts what is built, started and stopped
// ---------------------------------------------------------------------------

class FakeNode {
  readonly connected: unknown[] = [];
  connect(destination: unknown): unknown {
    this.connected.push(destination);
    return destination;
  }
}
class FakeGain extends FakeNode {
  readonly gain = { value: 1 };
}
class FakePanner extends FakeNode {
  readonly pan = { value: 0 };
}
class FakeSource extends FakeNode {
  buffer: { duration: number } | null = null;
  onended: ((event: { target: unknown }) => void) | null = null;
  started = 0;
  stopped = 0;
  start(): void {
    this.started += 1;
  }
  stop(): void {
    this.stopped += 1;
  }
  /** The browser's `ended` event: the source finished (or was stopped). */
  end(): void {
    this.onended?.({ target: this });
  }
}
class FakeContext implements AudioContextLike {
  state = 'running';
  readonly sampleRate = 48000;
  readonly destination = new FakeNode();
  readonly made = { gain: 0, panner: 0, source: 0 };
  readonly sources: FakeSource[] = [];
  readonly gains: FakeGain[] = [];
  readonly panners: FakePanner[] = [];
  createGain(): FakeGain {
    this.made.gain += 1;
    const node = new FakeGain();
    this.gains.push(node);
    return node;
  }
  createStereoPanner(): FakePanner {
    this.made.panner += 1;
    const node = new FakePanner();
    this.panners.push(node);
    return node;
  }
  createBufferSource(): FakeSource {
    this.made.source += 1;
    const node = new FakeSource();
    this.sources.push(node);
    return node;
  }
  decodeAudioData(data: ArrayBuffer): Promise<{ duration: number }> {
    return Promise.resolve({ duration: data.byteLength / 1000 });
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
}

async function unlockedAudio(): Promise<{ audio: ArenaAudio; ctx: FakeContext; loads: string[] }> {
  const contexts: FakeContext[] = [];
  const loads: string[] = [];
  const audio = new ArenaAudio({
    context: () => {
      const ctx = new FakeContext();
      contexts.push(ctx);
      return ctx;
    },
    load: (path) => {
      loads.push(path);
      return Promise.resolve(new ArrayBuffer(300));
    },
  });
  audio.setEnabled(true);
  assert.equal(audio.unlock(), true);
  // Let the loader's and the decoder's promises settle.
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return { audio, ctx: contexts[0]!, loads };
}

/** The sources a test started, newest last. */
const playing = (ctx: FakeContext): FakeSource[] => ctx.sources.filter((s) => s.started > 0 && s.stopped === 0);

// ---------------------------------------------------------------------------
// The audio module
// ---------------------------------------------------------------------------

test('audio: nothing is built before a gesture, and a muted page never builds a context (D251)', () => {
  let built = 0;
  const audio = new ArenaAudio({
    context: () => {
      built += 1;
      return new FakeContext();
    },
    load: null,
  });
  assert.equal(audio.enabled, false, 'sound starts muted');
  assert.equal(audio.unlocked, false);
  assert.equal(audio.play('hit', 1, 0), false);
  audio.setEnabled(true);
  const pending = new PendingSounds();
  pending.push('enter', 1, 3, -1);
  audio.bind(pending, () => 0);
  assert.equal(built, 0, 'a context was built without unlock() — i.e. outside a gesture');
  assert.equal(audio.stats.played, 0);
  assert.equal(audio.stats.silenced, 2);
  assert.equal(pending.count, 0, 'bind drains the buffer even with nothing to play into');
  assert.deepEqual(audio.describe(), { state: 'none', sampleRate: 0, voices: 0, busy: 0, clips: 0, enabled: true });
});

test('audio: unlock builds one master, eight voices, arms eight sources and loads every clip once', async () => {
  const { audio, ctx, loads } = await unlockedAudio();
  assert.equal(ctx.made.gain, 1 + MAX_VOICES, 'one master gain and a gain per voice');
  assert.equal(ctx.made.panner, MAX_VOICES);
  assert.equal(ctx.made.source, MAX_VOICES, 'every voice holds one ARMED source');
  assert.deepEqual([...loads].sort(), SOUND_IDS.map((id) => SOUND_FILES[id]).sort());
  assert.equal(audio.stats.loaded, SOUND_IDS.length);
  assert.equal(audio.describe().clips, SOUND_IDS.length);
  // A second gesture builds nothing more; a suspended context is resumed.
  ctx.state = 'suspended';
  assert.equal(audio.unlock(), true);
  await Promise.resolve();
  assert.equal(ctx.state, 'running');
  assert.equal(ctx.made.gain, 1 + MAX_VOICES);
  assert.equal(loads.length, SOUND_IDS.length, 'the clips are loaded once a page');
});

test('audio: the voice pool — eight at once, the ninth dropped, and no node built on the play path', async () => {
  const { audio, ctx } = await unlockedAudio();
  const before = { ...ctx.made };
  for (let i = 0; i < MAX_VOICES; i++) assert.equal(audio.play('hit', 0.8, 0), true, `voice ${String(i)}`);
  assert.equal(audio.play('lunge', 1, 0), false, 'a ninth sound must be dropped, never queued');
  assert.equal(audio.stats.dropped, 1);
  assert.equal(audio.busyVoices(), MAX_VOICES);
  assert.deepEqual(ctx.made, before, 'play built a node — a voice arms its source off the play path');
  // Gain and pan are clamped, never trusted.
  const { audio: other, ctx: ctx2 } = await unlockedAudio();
  other.play('hit', 9, -4);
  const started = playing(ctx2)[0]!;
  const voice = ctx2.gains.find((g) => started.connected.includes(g))!;
  assert.equal(voice.gain.value, VOICE_GAIN_MAX);
  const panner = ctx2.panners.find((p) => voice.connected.includes(p))!;
  assert.equal(panner.pan.value, -PAN_LIMIT);
  // A clip not decoded yet is silence, not an error.
  const cold = new ArenaAudio({ context: () => new FakeContext(), load: null });
  cold.setEnabled(true);
  cold.unlock();
  assert.equal(cold.play('victory', 1, 0), false);
  assert.equal(cold.stats.silenced, 1);
});

test('audio: a voice frees and re-arms itself when its sound ends', async () => {
  const { audio, ctx } = await unlockedAudio();
  audio.play('enter', 1, 0.2);
  const source = playing(ctx)[0]!;
  const made = ctx.made.source;
  source.end();
  assert.equal(audio.busyVoices(), 0);
  assert.equal(ctx.made.source, made + 1, 'the ended voice armed exactly one fresh source (Web Audio sources play once)');
  for (let i = 0; i < MAX_VOICES; i++) assert.equal(audio.play('hit', 1, 0), true);
});

test('audio: stopAll silences every voice at once, frees them for the next sound, and a late ended event changes nothing', async () => {
  const { audio, ctx } = await unlockedAudio();
  for (let i = 0; i < MAX_VOICES; i++) audio.play('death', 1, 0);
  const old = playing(ctx);
  const lateHandler = old[0]!.onended!;
  audio.stopAll();
  for (const source of old) assert.equal(source.stopped, 1, 'every sounding voice is stopped');
  assert.equal(audio.busyVoices(), 0, 'stopAll left a voice sounding');
  assert.equal(audio.stats.cuts, 1);
  // Free at once — the sounds of a batch that follows a flush in the same frame play.
  for (let i = 0; i < MAX_VOICES; i++) assert.equal(audio.play('hit', 1, 0), true, `after the cut, voice ${String(i)}`);
  // The cut source's ended event arrives late: it must not free the voice's NEW sound.
  lateHandler({ target: old[0] });
  assert.equal(audio.busyVoices(), MAX_VOICES, 'a late ended event from a cut source freed a voice that is sounding');
});

test('audio: muting cuts every voice and plays nothing until it is on again', async () => {
  const { audio, ctx } = await unlockedAudio();
  audio.play('laser', 1, 0);
  audio.play('rumble', 1, 0);
  audio.setEnabled(false);
  assert.equal(playing(ctx).length, 0);
  assert.equal(audio.play('hit', 1, 0), false);
  audio.setEnabled(true);
  assert.equal(audio.play('hit', 1, 0), true);
});

test('audio: bind honours a cut before the frame’s sounds, pans each by its card, and empties the buffer', async () => {
  const { audio, ctx } = await unlockedAudio();
  for (let i = 0; i < MAX_VOICES; i++) audio.play('resolve', 1, 0);
  const pending = new PendingSounds();
  pending.cutAll();
  pending.push('enter', 0.7, 12, -1);
  pending.push('hit', 0.9, -1, 2);
  const asked: Array<[number, number]> = [];
  audio.bind(pending, (card, player) => {
    asked.push([card, player]);
    return card >= 0 ? 0.5 : 0;
  });
  assert.equal(audio.busyVoices(), 2, 'the cut came first, then the frame’s two sounds');
  assert.deepEqual(asked, [
    [12, -1],
    [-1, 2],
  ]);
  assert.equal(pending.count, 0);
  assert.equal(pending.cut, false);
  assert.equal(ctx.panners.some((p) => p.pan.value === 0.5), true);
  // The buffer's own cap: a frame's seventeenth request is dropped, never queued.
  const full = new PendingSounds();
  for (let i = 0; i < MAX_PENDING_SOUNDS + 4; i++) full.push('hit', 1, i, -1);
  assert.equal(full.count, MAX_PENDING_SOUNDS);
  assert.equal(full.dropped, 4);
});

test('audio: an explicit choice wins, and reduced motion never turns a default on (D251)', () => {
  assert.equal(SOUND_DEFAULT, false, 'sound is muted by default');
  assert.equal(soundOn(null, false), SOUND_DEFAULT);
  assert.equal(soundOn(null, true), false);
  assert.equal(soundOn('on', true), true, 'a viewer who turned sound on hears it under reduced motion too');
  assert.equal(soundOn('on', false), true);
  assert.equal(soundOn('off', false), false);
});

// ---------------------------------------------------------------------------
// The clips on disk, against their provenance
// ---------------------------------------------------------------------------

test('sound: every clip id has one committed Ogg Opus file, recorded in the manifest byte for byte, under 100 kB in all', () => {
  assert.deepEqual(Object.keys(SOUND_FILES).sort(), [...SOUND_IDS].sort(), 'SOUND_FILES and SOUND_IDS differ');
  const manifest = JSON.parse(readFileSync(`${REPO}tools/assets-manifest.json`, 'utf8')) as {
    procedural: { soundClips: { licence: string; downloaded: boolean; totalBytes: number; clips: Record<string, { file: string; bytes: number; sha256: string }> } };
  };
  const entry = manifest.procedural.soundClips;
  assert.equal(entry.downloaded, false);
  assert.match(entry.licence, /^GPL-3\.0-or-later/);
  let total = 0;
  for (const id of SOUND_IDS) {
    const path = SOUND_FILES[id];
    assert.match(path, /^audio\/[a-z]+\.ogg$/);
    const bytes = readFileSync(PUBLIC + path);
    total += bytes.length;
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'OggS', `${path} is not an Ogg stream`);
    assert.equal(bytes.subarray(28, 36).toString('ascii'), 'OpusHead', `${path} is not Ogg Opus`);
    const row = entry.clips[id];
    assert.ok(row !== undefined, `${id} has no manifest row`);
    assert.equal(row.file, `web/public/${path}`);
    assert.equal(row.bytes, bytes.length, `${path}: the manifest's byte count is stale`);
    assert.equal(row.sha256, createHash('sha256').update(bytes).digest('hex'), `${path}: the manifest's sha256 is stale`);
  }
  assert.equal(entry.totalBytes, total);
  assert.ok(total < 100_000, `the clips are ${String(total)} B — the budget is under 100 kB`);
  assert.deepEqual(
    readdirSync(`${PUBLIC}audio`).sort(),
    SOUND_IDS.map((id) => `${id}.ogg`).sort(),
    'web/public/audio/ holds a file no clip id names — commit only the clips you use',
  );
});

// ---------------------------------------------------------------------------
// The ladder and its gate
// ---------------------------------------------------------------------------

test('sound: the default table is small, keyed by real selectors, and names only clips', () => {
  for (const [selector, spec] of Object.entries(DEFAULT_SOUNDS)) {
    assert.ok(isValidSelector(selector), `DEFAULT_SOUNDS key "${selector}" is not a selector`);
    assert.ok(spec.sound === 'none' || isSoundId(spec.sound), `${selector}: ${spec.sound}`);
  }
  assert.ok(Object.keys(DEFAULT_SOUNDS).length <= 14, 'the default set grew past "small and readable"');
  // The per-card clips are exactly the ones no default names — what a concealed card must never play.
  const defaults = defaultSoundIds();
  assert.deepEqual([...defaults].sort(), ['death', 'defeat', 'enter', 'hit', 'lunge', 'resolve', 'victory']);
  assert.deepEqual(
    SOUND_IDS.filter((id) => !defaults.has(id)).sort(),
    ['comms', 'laser', 'rumble', 'sting'],
  );
});

test('sound: a face-up row names, moves or silences its sound; every key it leaves out falls through', () => {
  const selectors = ['attackers:alone', 'attackers:*', 'attackers'];
  const fallback = defaultSoundFor(selectors, EMPTY_CUE_DATA);
  assert.deepEqual(fallback, { sound: 'lunge', at: 0, gain: 0.8 });
  const row = (params: Record<string, string | number | boolean>) => ({ source: 'card' as const, params });
  assert.deepEqual(soundFor(selectors, row({ sound: 'comms' }), false, EMPTY_CUE_DATA), { sound: 'comms', at: 0, gain: 1 });
  assert.deepEqual(soundFor(selectors, row({ sound: 'comms', soundAt: 0.4, soundGain: 0.5 }), false, EMPTY_CUE_DATA), {
    sound: 'comms',
    at: 0.4,
    gain: 0.5,
  });
  assert.deepEqual(soundFor(selectors, row({ colour: '#ffffff' }), false, EMPTY_CUE_DATA), fallback, 'a row that only retints keeps its sound');
  assert.deepEqual(soundFor(selectors, row({ soundGain: 0.3 }), false, EMPTY_CUE_DATA), { sound: 'lunge', at: 0, gain: 0.3 });
  assert.equal(soundFor(selectors, row({ sound: 'none' }), false, EMPTY_CUE_DATA), null);
  // The gate: a concealed subject reads NO row — not its clip, its moment or its gain.
  const hostileRows: Array<Record<string, string | number | boolean>> = [{ sound: 'comms' }, { soundGain: 0.1 }, { soundAt: 0.9 }, { sound: 'none' }];
  for (const params of hostileRows) {
    assert.deepEqual(soundFor(selectors, row(params), true, EMPTY_CUE_DATA), fallback, JSON.stringify(params));
    assert.deepEqual(soundFor(selectors, { source: 'archetype', params }, true, EMPTY_CUE_DATA), fallback);
  }
  // A cue file's own `defaults` override is a default too — a concealed card may play it.
  const data: CueData = { ...EMPTY_CUE_DATA, defaults: { attackers: { cue: 'attack.lunge', ms: 850, params: { sound: 'hit', soundGain: 0.4 } } } };
  assert.deepEqual(soundFor(selectors, row({ sound: 'comms' }), true, data), { sound: 'hit', at: 0, gain: 0.4 });
  // Silence has a default too: a fizzle rings nothing.
  assert.equal(defaultSoundFor(['resolved:fizzled', 'resolved:*', 'resolved'], EMPTY_CUE_DATA), null);
  // A tap, a draw, a turn: no default at all.
  assert.equal(defaultSoundFor(['tap:on', 'tap:*', 'tap'], EMPTY_CUE_DATA), null);
});

// -- a small synthetic table, as cues-exhaustive builds one ---------------------

const EMPTY = { count: 0, cards: [] as AnyCard[] };

function card(id: number, extra: Record<string, unknown> = {}): AnyCard {
  return {
    id,
    name: 'Nick Fury, Spymaster',
    setCode: 'MSH',
    manaCost: '{1}{W}{U}',
    types: 'Legendary Creature — Human Spy Hero',
    power: '3',
    toughness: '3',
    loyalty: null,
    damage: 0,
    counters: {},
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    token: false,
    alt: null,
    attachedToId: null,
    attachmentIds: [],
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    abilities: [],
    ...extra,
  } as AnyCard;
}

function stateWith(cards: AnyCard[], you = 0, extra: Record<string, unknown> = {}): ClientState {
  const seat = (id: number, battlefield: AnyCard[]): Record<string, unknown> => ({
    id,
    name: `p${String(id)}`,
    isAi: id !== 0,
    life: 20,
    poison: 0,
    counters: {},
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    zones: { hand: EMPTY, battlefield: { count: battlefield.length, cards: battlefield }, graveyard: EMPTY, exile: EMPTY, command: EMPTY, library: { count: 30, cards: [] } },
  });
  const hello = { v: 1, seq: 1, t: 1, type: 'hello_ok', body: { gameId: 'g', you, players: [], protocol: 1 } } as unknown as Frame;
  const body = {
    gameId: 'g',
    turn: 3,
    round: 2,
    phase: 'COMBAT_DECLARE_ATTACKERS',
    activePlayer: 0,
    priority: 0,
    gameOver: null,
    players: [seat(0, cards), seat(1, [])],
    stack: [],
    stackCards: [],
    combat: null,
    events: [],
    ...extra,
  };
  const frame = { v: 1, seq: 2, t: 2, type: 'state', body } as unknown as Frame;
  return reduce(reduce(initialState(), hello), frame);
}

const CUES = validateCues(
  JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8')) as unknown,
  { cueIds: new Set(REGISTRY.keys()) },
).data;

const attack = (id: number): GameEvent => ({ kind: 'attackers', player: 0, bands: [{ defender: { kind: 'player', id: 1 }, attackerIds: [id] }] }) as GameEvent;

test('sound: Nick Fury face up calls it in; the same card face down or as a stub only lunges (hard rule 8)', () => {
  const faceUp = cuesFor(attack(7), stateWith([card(7)]), CUES);
  assert.equal(faceUp[0]?.params['sound'], 'comms', 'his own row names his radio call');
  // Face down: the wire keeps his name OFF (Forge's face-down characteristic), and
  // a hostile stream that left it on still plays only the default.
  const faceDown = card(7, { faceDown: true });
  assert.ok(isConcealed(faceDown));
  assert.equal(cuesFor(attack(7), stateWith([faceDown]), CUES)[0]?.params['sound'], 'lunge');
  const stub = { id: 7, zone: 'battlefield', owner: 0, controller: 0, hidden: true, name: 'Nick Fury, Spymaster' } as unknown as AnyCard;
  assert.ok(isConcealed(stub));
  const cues = cuesFor(attack(7), stateWith([stub]), CUES);
  assert.equal(cues[0]?.params['sound'], 'lunge', 'a named stub played a per-card sound');
  assert.equal(cues[0]?.params['soundGain'], 0.8, 'a concealed card takes the default gain too');
});

test('sound: the outcome is won, lost or drawn from the viewer’s seat', () => {
  const state = stateWith([card(7)], 0);
  const outcome = (winner: number | null): GameEvent => ({ kind: 'outcome', winner, lastTurn: 5, reason: null }) as unknown as GameEvent;
  assert.equal(selectorsFor(outcome(0), state)[0], 'outcome:won');
  assert.equal(selectorsFor(outcome(1), state)[0], 'outcome:lost');
  assert.equal(selectorsFor(outcome(null), state)[0], 'outcome:draw');
  assert.equal(cuesFor(outcome(0), state, CUES)[0]?.params['sound'], 'victory');
  assert.equal(cuesFor(outcome(1), state, CUES)[0]?.params['sound'], 'defeat');
  // The outcome is about the players: its sound is centred, never panned to the
  // loser's first permanent (the cue's first target).
  const lost = cuesFor(outcome(1), state, CUES)[0]!;
  assert.equal(lost.targets[0], 7, 'the loser’s permanents are the outcome’s targets');
  assert.equal(lost.params['soundCard'], -1);
  const stage = new NullStage();
  const queue = queueOn(stage);
  queue.enqueueBatch([outcome(1)], state);
  queue.advance(10);
  assert.deepEqual(stage.sounds.map((s) => [s.sound, s.cardId]), [['defeat', -1]]);
  // …and the cue itself is unchanged: the banner resolves exactly as before.
  const found = resolve(selectorsFor(outcome(0), state), 'outcome', null, CUES);
  assert.equal(found.spec.cue, 'outcome.finish');
  assert.equal(found.selector, 'outcome');
});

// ---------------------------------------------------------------------------
// The queue: once, at its moment; a snap is silent; a flush cuts
// ---------------------------------------------------------------------------

function queueOn(stage: NullStage, data: CueData = CUES): CueQueue {
  return new CueQueue({ stage, registry: REGISTRY, data, mode: 'replay' });
}

test('queue: a sound fires once, when the cue’s real progress crosses its soundAt', () => {
  const stage = new NullStage();
  const queue = queueOn(stage);
  // Helicarrier Strike resolving: its laser is at half the cue.
  const strike = card(9, { name: 'Helicarrier Strike', types: 'Instant', manaCost: '{3}{W}', zone: 'graveyard', power: null, toughness: null });
  const state = stateWith([card(7)], 0);
  const withStrike = { ...state, board: { ...state.board!, players: state.board!.players.map((p, i) => (i === 0 ? { ...p, zones: { ...p.zones, graveyard: { count: 1, cards: [strike] } } } : p)) } } as ClientState;
  assert.equal(queue.enqueueBatch([{ kind: 'resolved', cardId: 9, fizzled: false } as GameEvent], withStrike), 1);
  queue.advance(0);
  assert.equal(stage.sounds.length, 0, 'the laser fired before its moment');
  queue.advance(300);
  assert.equal(stage.sounds.length, 0, 'the laser fired before half of an 820 ms cue');
  queue.advance(150);
  assert.deepEqual(stage.sounds.map((s) => s.sound), ['laser']);
  queue.advance(2000);
  assert.equal(stage.sounds.length, 1, 'a sound fired twice');
  assert.equal(stage.sounds[0]!.cardId, 9, 'the sound is about the card its event names');
});

test('queue: skip all, a flush, a skip and a pause cut the voices, and a snapped cue plays nothing', () => {
  const stage = new NullStage();
  const queue = queueOn(stage);
  const state = stateWith([card(7)]);
  queue.enqueueBatch([attack(7)], state);
  queue.advance(10);
  assert.deepEqual(stage.sounds.map((s) => s.sound), ['comms']);
  // Skip all mid-cue: a cut, and nothing new rings.
  queue.skipAll();
  assert.equal(stage.soundCuts, 1);
  assert.equal(stage.sounds.length, 1);
  // A batch skipped before it plays: silent.
  queue.enqueueBatch([attack(7)], state);
  queue.flushAndSnap();
  assert.equal(stage.sounds.length, 1, 'a snapped cue played its sound');
  assert.equal(stage.soundCuts, 2);
  // skip cue, step batch and pause each cut too.
  queue.enqueueBatch([attack(7)], state);
  queue.skipCurrent();
  queue.enqueueBatch([attack(7)], state);
  queue.stepBatch();
  queue.enqueueBatch([attack(7)], state);
  queue.setPaused(true);
  assert.equal(stage.soundCuts, 5);
  queue.setPaused(false);
  queue.flushAndSnap();
  // A batch compressed past §5.2's floor snaps — and a snap is silent.
  const compressed = new NullStage();
  const q2 = queueOn(compressed);
  q2.enqueueBatch([attack(7)], state, 1);
  q2.advance(2000);
  assert.equal(compressed.sounds.length, 0, 'a cue with no length made a sound');
});

test('queue: one sound per clip per card per batch — a land’s two arrival events are one noise', () => {
  const stage = new NullStage();
  const queue = queueOn(stage, EMPTY_CUE_DATA);
  const swamp = card(5, { name: 'Swamp', types: 'Basic Land — Swamp', manaCost: null, power: null, toughness: null });
  const state = stateWith([swamp]);
  queue.enqueueBatch(
    [
      { kind: 'zone', cardId: 5, from: { zone: 'hand', player: 0 }, to: { zone: 'battlefield', player: 0 } } as GameEvent,
      { kind: 'land', cardId: 5, player: 0 } as GameEvent,
    ],
    state,
  );
  queue.advance(3000);
  assert.deepEqual(stage.sounds.map((s) => s.sound), ['enter']);
});

test('queue: reduced motion still plays a sound the viewer turned on — the film is shorter, the clip is not', () => {
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay', reducedMotion: true });
  queue.enqueueBatch([attack(7)], stateWith([card(7)]));
  queue.advance(3000);
  assert.deepEqual(stage.sounds.map((s) => s.sound), ['comms']);
});

test('sound: the vocabulary is closed and the NullStage net reads it', () => {
  const stage = new NullStage();
  stage.playSound('sting', 1, 3, -1);
  assert.ok(stage.strings().includes('sting'), 'the redaction net does not read a sound id');
  const ids: SoundId[] = [...SOUND_IDS];
  for (const id of ids) assert.ok(isSoundId(id));
  assert.equal(isSoundId('Nick Fury, Spymaster'), false);
  assert.equal(isSoundId('none'), false);
});
