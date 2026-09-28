/*
 * mtg-table — story/narrate.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE NARRATOR**: one per-seat frame log (docs/protocol.md §8) told as a
 * turn-by-turn story, for someone learning Magic by watching how the AI plays
 * it. It has two readers and this is its one implementation (decision D150):
 *
 *   - `tools/narrate.mjs`, the CLI (D123) — a thin shell over this module that
 *     reads a file and prints `renderStory` / `renderSummary` / `toJson`. Node 24
 *     imports this file by type stripping, so it is written in erasable
 *     TypeScript only: no enums, no namespaces, no parameter properties, and no
 *     import at all.
 *   - the `#story` page (`web/src/story/Story.tsx`, D151), which narrates the
 *     frames the replay transport already holds and draws the same facts as a
 *     column of moments beside the replay cursor.
 *
 * Pure: no DOM, no React, no `node:` module, no clock, no fetch. It takes
 * parsed frames and returns facts; `web/test/story.test.ts` scans for all of it.
 *
 * WHAT IT READS, AND WHY THE EVENTS AND NOT ONLY THE SNAPSHOTS.  A `state`
 * frame is a full snapshot plus `events`, the id-only transitions that snapshot
 * already reflects, in engine order (protocol section 3.6).  In an AI-vs-AI
 * recording a spell is cast and resolves inside ONE flush -- g1's
 * S.H.I.E.L.D. Spy Kit is never on the snapshot's stack at all -- so a narrator
 * that only diffed snapshots would miss most of the game.  So:
 *   - the EVENTS say what happened and in what order, and the `turn` and
 *     `phase` events inside a batch say WHEN (a land played in main 1 arrives in
 *     the frame whose snapshot already says COMBAT_BEGIN);
 *   - the SNAPSHOTS say what each id IS: every name, cost, type and P/T printed
 *     here is read off a card object in the event's own frame or the frame
 *     before it, and from nowhere else;
 *   - a diff of consecutive battlefields adds what no event says: a permanent
 *     turned face up, a change of control, and (only when an event was lost --
 *     a client that was disconnected) a permanent that simply appeared or left.
 *
 * HARD RULE 8, BY CONSTRUCTION.  A frame log is already redacted for its seat
 * (section 8.3); the narrator's job is not to undo that.  Three rules:
 *   1. ONE function reads a card's face -- faceOf() below.  A five-key stub
 *      (`hidden: true`) yields nothing, whatever else is on it; a face-down card
 *      with `alt: null` yields "a face-down card" and never a name; `alt` is
 *      read only because the bridge writes it only for the seat's OWN face-down
 *      cards (section 3.2).
 *   2. A name is resolved against the event's own frame and the one before it,
 *      NEVER remembered across frames (DECISIONS.md D123).  A zone move reads
 *      the card in its source zone in the frame before and its destination in
 *      this one; every other fact takes the LATEST view -- if this frame holds
 *      the card concealed, it is concealed (nowRef() below).  That is protocol
 *      invariant 10 applied to a story: a card seen once and later concealed
 *      again is "a card" again, exactly as web/src/render/LogDrawer.tsx resolves
 *      against the frame on screen.  So the narrator cannot print a name that is
 *      not in the log, and cannot print one for an id that was concealed in
 *      every frame it appeared in.  tools/narrate-selftest.mjs asserts all of it
 *      over every committed fixture and negative-controls the assertions, and
 *      web/test/story-render.test.tsx holds the page's markup to it.
 *   3. Engine strings: only `cast.text` / `stack[].text` (already gated, swept
 *      and stripped by Snap.stackText) is quoted, with its `(id)` references and
 *      reminder text removed.  Notices, prompts and option labels are never
 *      printed -- except the `sideboard` ask's option labels, which are the
 *      seat's OWN card pool (section 5.3) -- and nothing here is rules logic: a
 *      mana cost is printed as the log spells it, never evaluated.
 *
 * CLIENT LOGS (recordedBy: "client", amendments M10/M17).  A `resync`
 * re-delivers the cached hello_ok, the last `state` and any outstanding ask
 * VERBATIM -- same `seq`, same `t`.  Every s2c frame whose seq this game has
 * already produced is skipped (and counted), so a reconnect never narrates a
 * turn twice.  A gap -- seqs between two snapshots that the FILE never holds
 * (not merely "not yet seen": an ask raised while the client was away arrives
 * after later frames) -- is said out loud where it happened when the
 * battlefield visibly changed across it, and counted either way.
 *
 * ONE PASS, AND CHEAP ENOUGH TO REPEAT.  The page narrates the frames the
 * replay transport holds, and in follow mode it narrates them again each time
 * the poller appends more: g1's 376 frames take about 4 ms (Node 24, this
 * machine; docs/evidence/story.md), so re-telling a growing log whole is
 * cheaper than keeping a second, incremental rule for "the seqs the file
 * holds" -- and the story of a log still being written is, frame for frame,
 * the story the CLI tells of the same bytes (D152).
 *
 * Every fact carries `frameIndex` -- the index, in the frames it was handed, of
 * the frame whose processing produced it -- which is how the page puts a moment
 * beside the replay cursor.  `toJson()` leaves it out, so `--json` is what it was.
 */

// ---------------------------------------------------------------------------
// What the narrator reads: the wire's shapes, loosely.  A frame log is data
// from a file; every field below is checked where the code depends on it, and
// nothing here is the protocol's contract (that is `web/src/protocol.ts`).

interface WireAlt {
  name?: unknown;
}

interface WireCard {
  id: number;
  hidden?: boolean;
  faceDown?: boolean;
  alt?: WireAlt | null;
  name?: string;
  controller?: number;
  owner?: number;
  zone?: string;
  types?: string;
  power?: number | null;
  toughness?: number | null;
  manaCost?: string;
}

interface WireZone {
  cards?: WireCard[];
  count?: number;
}

interface WirePlayer {
  id: number;
  name?: unknown;
  isAi?: boolean;
  life?: number;
  poison?: number;
  zones?: Record<string, WireZone | undefined>;
}

interface WireStackItem {
  id?: unknown;
  isAbility?: unknown;
  controller?: number;
  targetCardIds?: unknown[];
  targetPlayerIds?: unknown[];
}

interface WireEntity {
  kind?: string;
  id: number;
}

interface WireZoneRef {
  zone: string;
  player: number;
}

interface WireBand {
  attackerIds?: number[];
  blockerIds?: number[];
  defender?: WireEntity | null;
}

interface WireEvent {
  kind?: string;
  cardId?: number;
  sourceCardId?: number;
  cardIds?: unknown;
  stackId?: unknown;
  controller?: unknown;
  text?: unknown;
  turn: number;
  player: number;
  phase: string;
  from?: unknown;
  to?: unknown;
  fizzled?: unknown;
  amount?: unknown;
  counter?: unknown;
  toTop?: unknown;
  toBottom?: unknown;
  toLibrary?: unknown;
  toGraveyard?: unknown;
  phasedOut?: unknown;
  winner?: unknown;
  lastTurn?: unknown;
  bands?: WireBand[];
  blocks?: Array<{ attackerId?: unknown; blockerIds?: number[] } | null>;
  defendingPlayer?: number;
  target?: unknown;
  combat?: unknown;
}

interface WireBody {
  players?: WirePlayer[];
  stackCards?: WireCard[];
  stack?: WireStackItem[];
  events?: WireEvent[];
  turn?: number;
  phase?: string;
  activePlayer?: number;
  combat?: { bands?: WireBand[] } | null;
}

interface WireHello {
  gameId?: string | null;
  you?: unknown;
  seed?: unknown;
  gameNumber?: unknown;
  gameCount?: unknown;
  match?: unknown;
  players?: Array<{ id: number; name?: unknown; isAi?: unknown }>;
}

interface WireAskOption {
  id?: unknown;
  label?: unknown;
}

interface WireAsk {
  kind?: string;
  askId?: string;
  main?: WireAskOption[];
  side?: WireAskOption[];
}

interface WireOver {
  winner?: unknown;
  reason?: unknown;
  matchOver?: unknown;
}

interface WireFrame {
  seq?: unknown;
  dir?: string;
  type?: string;
  body?: unknown;
}

/** The session header (§8.1) as far as the narrator reads it. */
export interface NarrateHeader {
  kind?: unknown;
  gameId?: string | null;
  seat?: unknown;
  seed?: unknown;
  recordedBy?: unknown;
}

// ---------------------------------------------------------------------------
// What the narrator returns

/** A card a fact is about: its id, and its name only where the seat may know it. */
export interface CardRef {
  id: number;
  name: string | null;
  faceDown?: true;
}

export type FactKind =
  | 'faceUp'
  | 'mulligan'
  | 'land'
  | 'cast'
  | 'ability'
  | 'fizzled'
  | 'countered'
  | 'poison'
  | 'counters'
  | 'attach'
  | 'sacrificed'
  | 'scry'
  | 'surveil'
  | 'phased'
  | 'foretold'
  | 'keep'
  | 'first'
  | 'token'
  | 'draw'
  | 'dies'
  | 'destroyed'
  | 'zone'
  | 'attack'
  | 'blocks'
  | 'damage'
  | 'life'
  | 'control'
  | 'gap'
  | 'appears'
  | 'leaves'
  | 'concede'
  | 'sideboard';

export interface Gap {
  from: number;
  to: number;
  frames: number;
  told: boolean;
}

/**
 * One thing that happened, in one sentence. `seq` is the `state` frame it came
 * from (`null` for the setup lines, a concede and a sideboard); `prevSeq` the
 * frame before it -- the only other frame a name may come from; `frameIndex`
 * the index of the frame whose processing produced it, in the frames the
 * narrator was handed.  The optional fields are each kind's own facts, as
 * `--json` has always printed them.
 */
export interface Fact {
  seq: number | null;
  prevSeq: number | null;
  turn: number;
  phase: string | null;
  kind: FactKind;
  actor: number | null;
  cards: CardRef[];
  text: string;
  frameIndex: number;
  count?: number;
  amount?: number;
  combat?: boolean;
  target?: { kind: 'player' | 'card'; id: number };
  lifeFrom?: number;
  lifeTo?: number;
  from?: unknown;
  to?: unknown;
  counter?: string;
  stackId?: unknown;
  abilityText?: string;
  mulligans?: number;
  kept?: number;
  gap?: Gap;
  in?: string[];
  out?: string[];
}

export interface TurnRecord {
  turn: number;
  player: number | null;
}

export interface StoryPlayer {
  id: number;
  name: string;
  isAi: boolean;
}

export interface SeatStats {
  turns: number;
  mulligans: number;
  lands: number;
  spells: number;
  abilities: number;
  creaturesDied: number;
  damageToPlayers: number;
  damageToCreatures: number;
  lifeEnd: number | null;
  poisonEnd: number | null;
}

export interface SeatSummary extends SeatStats {
  player: number;
  name: string;
  isAi: boolean;
}

export interface Ending {
  winner: unknown;
  reason: unknown;
  matchOver: unknown;
  how: string | null;
  lastTurn: number;
  text: string | null;
}

/** One game of a story: what the narrator learned, and every fact in order. */
export interface StoryGame {
  gameId: string | null;
  /** The seat whose view the log is. */
  you: number | null;
  seed: unknown;
  gameNumber: unknown;
  gameCount: unknown;
  match: unknown;
  players: StoryPlayer[];
  facts: Fact[];
  turns: TurnRecord[];
  startsAtTurn: number | null;
  redelivered: number;
  resyncs: number;
  gaps: Gap[];
  unexplained: number;
  ignoredEvents: number;
  summary: SeatSummary[];
  ending: Ending | null;
}

export interface Story {
  file: string | null;
  header: NarrateHeader | null;
  clientLog: boolean;
  games: StoryGame[];
}

export interface ParsedLog {
  header: unknown;
  frames: readonly unknown[];
}

export interface NarrateOptions {
  file?: string | null;
  /**
   * For tools/narrate-selftest.mjs's negative control only: turns the resync
   * dedupe OFF, to prove the dedupe is what keeps a client log from narrating
   * the same moment twice.
   */
  keepRedelivered?: boolean;
}

interface NarratorOptions extends NarrateOptions {
  /** The seqs the whole file holds, per game ({@link presentSeqs}). */
  present: Map<unknown, Set<number>>;
}

/** The narrator's one pass: every frame pushed in order, then the story asked for once. */
interface Narrator {
  push(frame: unknown, frameIndex: number): void;
  story(): Story;
}

// ---------------------------------------------------------------------------
// The one face reader.  Every name in the output comes through here.

/**
 * What this seat may know about one card object: `{name, faceDown}` or null.
 * `name` is null for a face-down card whose face is concealed.  A redacted stub
 * yields null WHATEVER ELSE IS ON IT -- a sixth key on a stub is a leak the
 * checker exists to catch (check-redaction.mjs), and this function will not
 * be the thing that prints it.
 */
export function faceOf(card: unknown): { name: string | null; faceDown: boolean } | null {
  if (card === null || typeof card !== 'object') return null;
  const c = card as WireCard;
  if (c.hidden === true) return null;
  if (c.faceDown === true) {
    const alt = c.alt;
    const altName =
      alt !== null && typeof alt === 'object' && typeof alt.name === 'string' ? alt.name : '';
    return { name: altName !== '' ? altName : null, faceDown: true };
  }
  if (typeof c.name === 'string' && c.name !== '') return { name: c.name, faceDown: false };
  return null;
}

// ---------------------------------------------------------------------------
// Parsing

/** Parse a frame log's text into {header, frames}.  Throws on a malformed line. */
export function parseLog(text: string): { header: NarrateHeader | null; frames: unknown[] } {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  let header: NarrateHeader | null = null;
  const frames: unknown[] = [];
  lines.forEach((line, i) => {
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      throw new Error(`line ${i + 1}: not JSON (${(err as Error).message})`);
    }
    if (i === 0 && obj !== null && (obj as { kind?: unknown }).kind === 'session') header = obj as NarrateHeader;
    else frames.push(obj);
  });
  return { header, frames };
}

// ---------------------------------------------------------------------------
// Small text helpers

const PHASE_LABEL: Readonly<Record<string, string>> = {
  UNTAP: 'untap',
  UPKEEP: 'upkeep',
  DRAW: 'draw',
  MAIN1: 'main 1',
  COMBAT_BEGIN: 'combat',
  COMBAT_DECLARE_ATTACKERS: 'combat',
  COMBAT_DECLARE_BLOCKERS: 'combat',
  COMBAT_FIRST_STRIKE_DAMAGE: 'combat',
  COMBAT_DAMAGE: 'combat',
  COMBAT_END: 'combat',
  MAIN2: 'main 2',
  END_OF_TURN: 'end',
  CLEANUP: 'cleanup',
};

/** A phase as the story says it: `MAIN1` → `main 1`, every combat step → `combat`. */
export const phaseLabel = (phase: string | null | undefined): string =>
  phase === null || phase === undefined ? 'start' : (PHASE_LABEL[phase] ?? String(phase).toLowerCase());

const cap = (s: string): string => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1));
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const TIMES = ['', 'once', 'twice'];
const times = (n: number): string => TIMES[n] ?? `${n} times`;
const NUMBER_WORD = ['no', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countWord = (n: number): string => NUMBER_WORD[n] ?? String(n);

/** A scry's or a surveil's split: "keeps it on top", "keeps 1 on top and puts 1 on the bottom". */
function lookAt(a: number, verbA: string, whereA: string, b: number, verbB: string, whereB: string): string {
  const one = a + b === 1;
  const part = (n: number, verb: string, where: string): string => `${verb} ${one ? 'it' : n} ${where}`;
  const parts: string[] = [];
  if (a > 0) parts.push(part(a, verbA, whereA));
  if (b > 0) parts.push(part(b, verbB, whereB));
  return parts.length > 0 ? parts.join(' and ') : 'moves nothing';
}

/** "A", "A and B", "A, B and C". */
function andList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]!}`;
}

/** Word-wrap `text` to `width`, the first line after `first`, the rest after `rest`. */
export function wrap(text: string, first: string, rest: string, width = 100): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const out: string[] = [];
  let line = first;
  let empty = true;
  for (const w of words) {
    if (!empty && line.length + 1 + w.length > width) {
      out.push(line);
      line = rest + w;
    } else {
      line = empty ? line + w : `${line} ${w}`;
    }
    empty = false;
  }
  out.push(line);
  return out;
}

/** "Legendary Creature - Human Spy Hero" -> "legendary creature"; Aura/Equipment/Vehicle by name. */
function kindOfTypes(types: unknown): string {
  if (typeof types !== 'string' || types === '') return '';
  const halves = types.split(' - ');
  const main = halves[0]!;
  const sub = halves[1] ?? '';
  const words = main.split(/\s+/).filter((w) => w.length > 0);
  const legendary = words.includes('Legendary');
  const kept = words
    .filter((w) => !['Legendary', 'Basic', 'Snow', 'World'].includes(w))
    .map((w) => w.toLowerCase());
  let kind = kept.join(' ');
  const subs = sub.split(/\s+/);
  for (const special of ['Aura', 'Equipment', 'Vehicle']) {
    if (subs.includes(special)) kind = special;
  }
  return legendary ? `legendary ${kind}` : kind;
}

const hasType = (card: WireCard | null, t: string): boolean =>
  card !== null && typeof card.types === 'string' && card.types.split(' - ')[0]!.includes(t);
const ptOf = (card: WireCard | null): string | null =>
  card !== null &&
  card.power !== null &&
  card.power !== undefined &&
  card.toughness !== null &&
  card.toughness !== undefined
    ? `${card.power}/${card.toughness}`
    : null;

/**
 * An engine stack description made readable: Forge's `Name (id) - ` prefix,
 * every `(id)` reference and parenthesised reminder text removed, a
 * `(Targeting: [[...]])` tail turned into words, trimmed to one short line.
 * The string is already gated by the bridge (Snap.stackText); nothing here adds
 * to it.
 */
export function tidyText(text: unknown, sourceName: string | null): string {
  let t = String(text ?? '');
  if (sourceName) {
    for (const pre of [`${sourceName} - `, `${sourceName}: `]) {
      if (t.startsWith(pre)) t = t.slice(pre.length);
    }
  }
  t = t.replace(/^[^-]{1,80}? \(\d{1,9}\) -\s+/, ''); // "A.I.M. Scientists (2) - " prefix
  t = t.replace(/\s*\([A-Z]?\d{1,9}\)/g, ''); // every (id) reference, and Forge's (H4) for a face-down one
  t = t.replace(/\s*\(Targeting: \[\[\s*\]\]\)/g, '');
  t = t.replace(/\(Targeting: \[\[(.*?)\]\]\)/g, (_, who: string) => `(targeting ${who})`);
  t = t.replace(/\(Targeting: ([^()]*)\)/g, (_, who: string) => `(targeting ${who})`);
  t = t.replace(/\s*\([^()]*\.\)/g, ''); // reminder text
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > 240) {
    const stop = t.lastIndexOf('. ', 239);
    t = stop >= 40 ? t.slice(0, stop + 1) : `${t.slice(0, 239).replace(/\s+\S*$/, '')}…`;
  }
  return t;
}

/** "Forest (TRK)" -> "Forest": a sideboard option label is a PaperCard. */
const stripSetCode = (label: unknown): string => String(label ?? '').replace(/\s+\([A-Z0-9]{2,6}\)$/, '');

// ---------------------------------------------------------------------------
// Snapshot index

interface Hit {
  card: WireCard;
  zone: string;
  player: number | null;
}
type StateIndex = Map<number, Hit[]>;

/** id -> [{card, zone, player}] over every card object in one state body. */
function indexState(body: WireBody | null | undefined): StateIndex {
  const byId: StateIndex = new Map();
  const add = (card: WireCard | null | undefined, zone: string, player: number | null): void => {
    if (card === null || typeof card !== 'object' || typeof card.id !== 'number') return;
    if (!byId.has(card.id)) byId.set(card.id, []);
    byId.get(card.id)!.push({ card, zone, player });
  };
  for (const p of body?.players ?? []) {
    for (const [zone, z] of Object.entries(p?.zones ?? {})) {
      for (const card of z?.cards ?? []) add(card, zone, p.id);
    }
  }
  for (const card of body?.stackCards ?? []) add(card, typeof card?.zone === 'string' ? card.zone : 'stack', null);
  return byId;
}

/** Names a visible permanent carries on more than one side of the table in these frames. */
function ambiguousNames(...indexes: Array<StateIndex | null | undefined>): Set<string> {
  const sides = new Map<string, Set<number>>();
  for (const index of indexes) {
    if (!index) continue;
    for (const hits of index.values()) {
      for (const h of hits) {
        if (h.zone !== 'battlefield' || typeof h.card.controller !== 'number') continue;
        const f = faceOf(h.card);
        if (f === null || f.name === null || f.faceDown) continue;
        if (!sides.has(f.name)) sides.set(f.name, new Set());
        sides.get(f.name)!.add(h.card.controller);
      }
    }
  }
  return new Set([...sides].filter(([, s]) => s.size > 1).map(([name]) => name));
}

// ---------------------------------------------------------------------------
// The narrator

/**
 * Which s2c seqs a file holds, per game.  A client log is neither contiguous
 * nor monotonic (M10): the `input` frames sent before the client connected are
 * simply absent, and an ask raised while it was away arrives AFTER later
 * frames, carrying its original seq.  So a gap is judged against the whole
 * file, never against "the last seq seen".
 */
function presentSeqs(header: unknown, frames: readonly unknown[]): Map<unknown, Set<number>> {
  const present = new Map<unknown, Set<number>>();
  let id: unknown = (header as NarrateHeader | null)?.gameId ?? null;
  for (const raw of frames) {
    if (raw === null || typeof raw !== 'object') continue;
    const f = raw as WireFrame;
    if ((f.dir ?? 's2c') !== 's2c' || typeof f.seq !== 'number' || f.seq === 0) continue;
    if (f.type === 'hello_ok') id = (f.body as WireHello | undefined)?.gameId ?? id;
    if (!present.has(id)) present.set(id, new Set());
    present.get(id)!.add(f.seq);
  }
  return present;
}

interface PlayerInfo {
  id: number;
  name: string;
  isAi: boolean;
}

interface Cur {
  seq: number;
  body: WireBody;
  index: StateIndex;
}

interface Ref {
  id: number;
  name: string | null;
  faceDown: boolean;
  card: WireCard | null;
  controller: number | null;
  owner: number | null;
}

interface GameState {
  gameId: string | null;
  you: number | null;
  seed: unknown;
  gameNumber: unknown;
  gameCount: unknown;
  match: unknown;
  players: Map<number, PlayerInfo>;
  facts: Fact[];
  turns: TurnRecord[];
  seen: Set<number>;
  present: Set<number>;
  redelivered: number;
  resyncs: number;
  gaps: Gap[];
  prev: WireBody | null;
  prevIndex: StateIndex | null;
  prevSeq: number | null;
  turn: { turn: number; player: number | null } | null;
  phase: string | null;
  startsAtTurn: number | null;
  setupDone: boolean;
  /** Pending keep counts, finalised at the end of the batch that holds turn 1. */
  setup: { kept: Map<number, number>; first: number | null } | null;
  mulligans: Map<number, number>;
  asks: Map<string, WireAsk>;
  concededBy: number | null;
  over: WireOver | null;
  outcome: { winner: unknown; lastTurn: unknown } | null;
  lastState: WireBody | null;
  stats: Map<number, SeatStats>;
  unexplained: number;
  ignoredEvents: number;
  /**
   * A card that moved to the stack and has not had its `cast` yet: the NEXT
   * cast event for it is the spell itself (a human's cast can span two flushes
   * -- the move, then the mana payment, then the event), and any later one is a
   * trigger of the card that resolved (Web Up's own ETB).
   */
  pendingSpell: Set<unknown>;
  /** `resolved` and its `unstacked` can straddle two flushes (g1 turn 14). */
  resolvedOpen: Map<unknown, number>;
  /**
   * Ability texts already quoted once in this game; the second time it is
   * "triggers again".  Text, not identity: nothing here is a name memory.
   */
  quoted: Set<string>;
  ambiguous: Set<string>;
}

interface Where {
  frame: 'cur' | 'prev';
  zone?: string;
}

interface DamageEntry {
  total: number;
  sources: Array<{ ref: Ref; amount: number }>;
  lifeTo: number | null;
  lifeFrom: number | null;
  fact: Fact;
}

interface ZoneCtx {
  landIds: Set<unknown>;
  sacrificedIds: Set<unknown>;
  drawOpen: { fact: Fact | null; player: number | null; phase: string | null; refs: Ref[] };
  tokenOpen: { fact: Fact | null; key: string | null; count: number; ref: Ref | null };
}

type FactExtra = Partial<Omit<Fact, 'turn' | 'phase' | 'kind' | 'actor' | 'cards' | 'text' | 'frameIndex'>>;

/**
 * The narrator for one log: {@link narrate} pushes every frame in order and asks
 * for the story once.  (A closure rather than one long loop so that the frame
 * loop reads as the protocol does: one frame, one dispatch.)
 */
function createNarrator(rawHeader: unknown, opts: NarratorOptions): Narrator {
  const header = (rawHeader ?? null) as NarrateHeader | null;
  const clientLog = header !== null && header.recordedBy === 'client';
  const games: GameState[] = [];
  // The current game.  `games.length === 0` is "no game yet"; `g` is only read
  // once there is one, exactly as the CLI's `g === null` guards had it.
  let g = null as unknown as GameState;
  // The index of the frame being pushed: every fact records it.
  let frameAt = -1;

  // Which s2c seqs this file holds, per game (see presentSeqs).
  const presentByGame = opts.present;

  const newGame = (hello: WireHello | null): void => {
    const gameId = hello?.gameId ?? header?.gameId ?? null;
    g = {
      gameId,
      you: typeof hello?.you === 'number' ? hello.you : typeof header?.seat === 'number' ? header.seat : null,
      seed: hello?.seed ?? header?.seed ?? null,
      gameNumber: hello?.gameNumber ?? null,
      gameCount: hello?.gameCount ?? null,
      match: hello?.match ?? null,
      players: new Map(
        (hello?.players ?? []).map((p) => [p.id, { id: p.id, name: String(p.name ?? `Player ${p.id}`), isAi: p.isAi === true }]),
      ),
      facts: [],
      turns: [],
      seen: new Set(),
      present: presentByGame.get(gameId) ?? new Set(),
      redelivered: 0,
      resyncs: 0,
      gaps: [],
      prev: null,
      prevIndex: null,
      prevSeq: null,
      turn: null,
      phase: null,
      startsAtTurn: null,
      setupDone: false,
      setup: null,
      mulligans: new Map(),
      asks: new Map(),
      concededBy: null,
      over: null,
      outcome: null,
      lastState: null,
      stats: new Map(),
      unexplained: 0,
      ignoredEvents: 0,
      pendingSpell: new Set(),
      resolvedOpen: new Map(),
      quoted: new Set(),
      ambiguous: new Set(),
    };
    games.push(g);
  };

  const stat = (player: unknown): SeatStats | null => {
    if (typeof player !== 'number') return null;
    if (!g.stats.has(player)) {
      g.stats.set(player, {
        turns: 0,
        mulligans: 0,
        lands: 0,
        spells: 0,
        abilities: 0,
        creaturesDied: 0,
        damageToPlayers: 0,
        damageToCreatures: 0,
        lifeEnd: null,
        poisonEnd: null,
      });
    }
    return g.stats.get(player)!;
  };

  const pname = (id: unknown): string => {
    if (typeof id !== 'number') return 'someone';
    const p = g.players.get(id);
    return p ? p.name : `Player ${id}`;
  };
  const poss = (id: unknown): string => `${pname(id)}'s`;

  // --- card references ------------------------------------------------------

  /**
   * Resolve a card id for one fact.  `where` is an ordered list of
   * {frame: 'cur'|'prev', zone?} places to look; the first place holding a
   * card object this seat may read the face of wins.  Returns a ref:
   * {id, name, faceDown, card, controller, owner} -- `card` is the visible
   * object (for cost, types, P/T), never serialised.
   */
  const refOf = (id: unknown, where: readonly Where[], cur: Cur): Ref => {
    const ref: Ref = { id: id as number, name: null, faceDown: false, card: null, controller: null, owner: null };
    for (const w of where) {
      const index = w.frame === 'cur' ? cur.index : g.prevIndex;
      if (index === null || index === undefined) continue;
      for (const hit of index.get(id as number) ?? []) {
        if (w.zone !== undefined && hit.zone !== w.zone) continue;
        if (ref.controller === null && typeof hit.card.controller === 'number') ref.controller = hit.card.controller;
        if (ref.owner === null && typeof hit.card.owner === 'number') ref.owner = hit.card.owner;
        const face = faceOf(hit.card);
        if (face === null) continue;
        if (face.name !== null || !ref.faceDown) {
          ref.faceDown = face.faceDown;
          ref.card = hit.card;
          ref.name = face.name;
          if (typeof hit.card.controller === 'number') ref.controller = hit.card.controller;
          if (typeof hit.card.owner === 'number') ref.owner = hit.card.owner;
        }
        if (ref.name !== null) return ref;
      }
    }
    return ref;
  };
  /**
   * THE LATEST VIEW -- for everything that is not a zone move.  If the card is
   * in this frame at all, this frame's face is the answer, concealed or not;
   * only a card this frame no longer holds is looked up in the frame before.
   * That is protocol invariant 10: a concealed card REPLACES what was known
   * about it.  (disjoint.jsonl is why: Ashcloud Phoenix dies face up, and its
   * trigger goes on the stack in the frame where the card is already back on
   * the battlefield face down -- the bridge blanked that trigger's text for
   * exactly this reason, and naming it from the frame before would undo it.)
   */
  const nowRef = (id: unknown, cur: Cur, prefer: readonly string[] = []): Ref => {
    const frame: 'cur' | 'prev' = (cur.index.get(id as number) ?? []).length > 0 ? 'cur' : 'prev';
    return refOf(id, [...prefer.map((zone) => ({ frame, zone })), { frame }], cur);
  };

  /**
   * How a ref reads in a sentence.  In a mirror match both seats hold cards
   * of the same name, so a name that is on BOTH sides of the battlefield in
   * this frame or the one before gets its controller: "AI-Seat0's Quake".
   * `owner: false` where the sentence already says whose it is.
   */
  const label = (ref: Ref, unknown = 'an unknown card', owner = true): string => {
    if (ref.name !== null && !ref.faceDown) {
      return owner && g.ambiguous.has(ref.name) && typeof ref.controller === 'number'
        ? `${poss(ref.controller)} ${ref.name}`
        : ref.name;
    }
    if (ref.faceDown && ref.name !== null) return `a face-down ${ref.name}`;
    if (ref.faceDown) return 'a face-down card';
    return unknown;
  };
  /** The name alone, where the sentence already says whose it is. */
  const bare = (ref: Ref, unknown?: string): string => label(ref, unknown, false);
  /** A ref with its P/T when it has one: "Quake (3/3)". */
  const withPt = (ref: Ref, owner = true): string => {
    const pt = ref.card !== null ? ptOf(ref.card) : null;
    const l = label(ref, 'an unknown card', owner);
    return pt !== null ? `${l} (${pt})` : l;
  };
  /** "AI-Seat1's Quake", "AI-Seat1's face-down card": a possessive never takes an article. */
  const owned = (player: unknown, ref: Ref, pt = false): string => {
    const l = (pt ? withPt(ref, false) : bare(ref)).replace(/^(a|an) /, '');
    return `${poss(player)} ${l}`;
  };
  const jsonRef = (ref: Ref): CardRef => ({ id: ref.id, name: ref.name, ...(ref.faceDown ? { faceDown: true as const } : {}) });

  // --- facts ------------------------------------------------------------------

  const turnRecord = (): TurnRecord | null => {
    if (g.turn === null) return null;
    const last = g.turns[g.turns.length - 1];
    if (last && last.turn === g.turn.turn) return last;
    const rec: TurnRecord = { turn: g.turn.turn, player: g.turn.player };
    g.turns.push(rec);
    return rec;
  };

  /** Add one fact.  `actor` is the player doing it (null for a thing that happens). */
  const fact = (
    cur: Cur | null,
    kind: FactKind,
    actor: unknown,
    refs: readonly Ref[],
    text: string,
    extra: FactExtra = {},
  ): Fact => {
    const rec = turnRecord();
    const f: Fact = {
      seq: cur ? cur.seq : null,
      prevSeq: cur ? g.prevSeq : null,
      turn: g.turn === null ? 0 : g.turn.turn,
      phase: g.turn === null ? 'SETUP' : g.phase,
      kind,
      actor: typeof actor === 'number' ? actor : null,
      cards: refs.map(jsonRef),
      text,
      frameIndex: frameAt,
      ...extra,
    };
    if (rec !== null && rec.player === null && g.turn !== null && typeof g.turn.player === 'number') rec.player = g.turn.player;
    g.facts.push(f);
    return f;
  };

  /** Subject-first sentence: omitted subject when the actor is the turn's player. */
  const said = (actor: unknown, verbPhrase: string): string => {
    const active = g.turn !== null ? g.turn.player : null;
    const s = typeof actor === 'number' && actor !== active ? `${pname(actor)} ${verbPhrase}` : cap(verbPhrase);
    return /[.!?]"?$/.test(s) ? s : `${s}.`;
  };

  // --- setup: mulligans and who goes first ------------------------------------

  const beginSetup = (cur: Cur, turnEv: WireEvent): void => {
    g.setupDone = true;
    const kept = new Map<number, number>();
    for (const p of cur.body.players ?? []) kept.set(p.id, Number(p.zones?.['hand']?.count ?? 0));
    g.setup = { kept, first: turnEv.turn === 1 ? turnEv.player : null };
  };
  // A draw inside the batch that began turn 1 is not part of the kept hand.
  const adjustKept = (player: number, delta: number): void => {
    if (g.setup !== null && g.setup.kept.has(player)) g.setup.kept.set(player, g.setup.kept.get(player)! + delta);
  };
  const finishSetup = (): void => {
    if (g.setup === null) return;
    const { kept, first } = g.setup;
    g.setup = null;
    const saveTurn = g.turn;
    const savePhase = g.phase;
    g.turn = null; // setup facts belong to "before the game"
    const ids = [...kept.keys()].sort((a, b) => a - b);
    for (const id of ids) {
      const m = g.mulligans.get(id) ?? 0;
      const k = kept.get(id)!;
      const text =
        m === 0
          ? `${pname(id)} keeps ${plural(k, 'card')}.`
          : `${pname(id)} mulligans ${times(m)} and keeps ${plural(k, 'card')}.`;
      fact(null, 'keep', id, [], text, { mulligans: m, kept: k });
    }
    if (typeof first === 'number') fact(null, 'first', first, [], `${pname(first)} goes first.`);
    g.turn = saveTurn;
    g.phase = savePhase;
  };

  // --- zone moves -------------------------------------------------------------

  const tokenLabel = (ref: Ref, many: boolean): string => {
    const name = ref.name !== null && !ref.faceDown ? ref.name : 'token';
    const pt = ref.card !== null ? ptOf(ref.card) : null;
    const base = many ? (/s$/i.test(name) ? name : `${name}s`) : /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`;
    return pt !== null ? `${base} (${pt})` : base;
  };

  const drawText = (who: number, refs: readonly Ref[]): string => {
    const named = refs.filter((r) => r.name !== null && !r.faceDown).map((r) => r.name!);
    // In the draw step it is THE draw; anywhere else a card went from the
    // library to the hand by some effect (a draw spell, a search), and the
    // ability line just before it says which.
    const inDrawStep = g.phase === 'DRAW';
    const unnamed = refs.length - named.length;
    const list = [
      ...named,
      ...(unnamed > 0 ? [unnamed === 1 && named.length === 0 ? 'a card' : plural(unnamed, 'unseen card')] : []),
    ];
    if (inDrawStep) {
      if (refs.length === 1) return said(who, `draws ${named.length === 1 ? named[0]! : 'a card'}`);
      if (named.length === 0) return said(who, `draws ${countWord(refs.length)} cards`);
      return said(who, `draws ${countWord(refs.length)} cards: ${andList(list)}`);
    }
    if (named.length === 0) {
      return said(who, `puts ${refs.length === 1 ? 'a card' : `${countWord(refs.length)} cards`} from the library into their hand`);
    }
    return said(who, `puts ${andList(list)} from the library into their hand`);
  };

  const onZone = (cur: Cur, e: WireEvent, ctx: ZoneCtx): void => {
    const from = e.from && typeof e.from === 'object' ? (e.from as WireZoneRef) : null;
    const to = e.to && typeof e.to === 'object' ? (e.to as WireZoneRef) : null;
    const fz = from ? from.zone : null;
    const tz = to ? to.zone : null;
    // Opening hands, mulligans and the bottoming that follows them.
    if (g.turn === null) return;
    if (g.setup !== null) {
      if (fz === 'library' && tz === 'hand') adjustKept(to!.player, -1);
      else if (fz === 'hand' && tz !== 'hand') adjustKept(from!.player, +1);
    }
    if (tz === 'stack') g.pendingSpell.add(e.cardId);
    if (fz === 'stack') g.pendingSpell.delete(e.cardId);
    if (fz === 'stack' || tz === 'stack') return; // the cast and its resolution say it
    if (tz === null) return; // a token ceasing to exist; its death was the story
    if (fz === 'library' && tz === 'library') return; // a scry's reorder
    // The command zone holds the engine's own effect objects here ("Pym
    // Particles (6)'s Effect"), not cards anyone played: not part of the story.
    if (fz === 'command' || tz === 'command') return;
    if (fz === 'hand' && tz === 'battlefield' && ctx.landIds.has(e.cardId)) return; // the land event says it

    // The name: the source zone in the frame before, the destination zone in
    // this one.  Never anything older (invariant 10).  A card LEAVING the
    // battlefield is read as it stood there first -- its P/T with counters,
    // which is what tells two Aerial Doombots apart -- and from where it went
    // only when the battlefield view was face down.
    const where: Where[] = [];
    if (fz === 'battlefield') where.push({ frame: 'prev', zone: fz });
    if (tz) where.push({ frame: 'cur', zone: tz });
    if (fz && fz !== 'battlefield') where.push({ frame: 'prev', zone: fz });
    const ref = refOf(e.cardId, where, cur);
    const owner = to?.player ?? from?.player ?? ref.owner;

    // A token created directly onto the battlefield.
    if (fz === null && tz === 'battlefield') {
      const key = `${ref.name}|${ref.card ? ptOf(ref.card) : ''}|${owner}`;
      if (ctx.tokenOpen.fact !== null && ctx.tokenOpen.key === key) {
        ctx.tokenOpen.count += 1;
        const f = ctx.tokenOpen.fact;
        f.cards.push(jsonRef(ref));
        f.count = ctx.tokenOpen.count;
        f.text = said(owner, `creates ${countWord(ctx.tokenOpen.count)} ${tokenLabel(ctx.tokenOpen.ref!, true)}`);
        return;
      }
      ctx.tokenOpen.fact = fact(cur, 'token', owner, [ref], said(owner, `creates ${tokenLabel(ref, false)}`), { count: 1 });
      ctx.tokenOpen.key = key;
      ctx.tokenOpen.count = 1;
      ctx.tokenOpen.ref = ref;
      return;
    }
    ctx.tokenOpen.fact = null;

    // Draws: one line per run of draws by the same player in the same phase.
    if (fz === 'library' && tz === 'hand') {
      const who = to!.player;
      const run = ctx.drawOpen;
      if (run.fact !== null && run.player === who && run.phase === g.phase) {
        run.refs.push(ref);
        run.fact.cards.push(jsonRef(ref));
        run.fact.count = run.refs.length;
        run.fact.text = drawText(who, run.refs);
        return;
      }
      run.player = who;
      run.phase = g.phase;
      run.refs = [ref];
      run.fact = fact(cur, 'draw', who, [ref], drawText(who, run.refs), { count: 1 });
      return;
    }
    ctx.drawOpen.fact = null;

    const card = ref.card;
    if (fz === 'battlefield' && tz === 'graveyard') {
      if (ctx.sacrificedIds.has(e.cardId)) {
        const who = ref.controller ?? from!.player;
        fact(cur, 'sacrificed', who, [ref], said(who, `sacrifices ${bare(ref)}`));
        if (hasType(card, 'Creature')) {
          const s = stat(who);
          if (s) s.creaturesDied += 1;
        }
        return;
      }
      // Was it a creature ON THE BATTLEFIELD?  The graveyard copy of an
      // animated Vehicle is an artifact again, so ask the frame before first.
      const onField =
        (g.prevIndex?.get(e.cardId as number) ?? []).find((h) => h.zone === 'battlefield')?.card ?? card;
      const creature =
        hasType(onField, 'Creature') || (onField !== null && onField.faceDown === true && onField.types === 'Creature');
      const whose = ref.controller ?? from!.player;
      if (creature) {
        const s = stat(whose);
        if (s) s.creaturesDied += 1;
        fact(cur, 'dies', whose, [ref], `${owned(whose, ref)} dies.`);
      } else {
        fact(cur, 'destroyed', whose, [ref], `${owned(whose, ref)} is put into the graveyard.`);
      }
      return;
    }
    const whoseFrom = ref.controller ?? from?.player ?? owner;
    const text = ((): string => {
      switch (`${fz}>${tz}`) {
        case 'battlefield>exile': return `${owned(whoseFrom, ref, true)} is exiled.`;
        case 'battlefield>hand': return `${owned(whoseFrom, ref, true)} returns to ${poss(to!.player)} hand.`;
        case 'battlefield>library': return `${owned(whoseFrom, ref, true)} is put into ${poss(to!.player)} library.`;
        case 'hand>graveyard': return said(from!.player, `discards ${bare(ref, 'a card')}`);
        case 'hand>exile': return said(from!.player, `exiles ${bare(ref, 'a card')} from their hand`);
        case 'hand>library': return said(from!.player, `puts ${bare(ref, 'a card')} from their hand into their library`);
        case 'hand>battlefield': return said(from!.player, `puts ${withPt(ref, false)} onto the battlefield`);
        case 'library>graveyard': return `${cap(bare(ref, 'a card'))} goes from ${poss(from!.player)} library to the graveyard.`;
        case 'library>exile': return `${cap(bare(ref, 'a card'))} is exiled from ${poss(from!.player)} library.`;
        case 'library>battlefield': return `${owned(to!.player, ref, true)} enters the battlefield from the library.`;
        case 'graveyard>hand': return said(to!.player, `returns ${bare(ref, 'a card')} from the graveyard to their hand`);
        case 'graveyard>battlefield': return `${owned(to!.player, ref, true)} returns to the battlefield from the graveyard.`;
        case 'graveyard>exile': return `${cap(bare(ref, 'a card'))} is exiled from ${poss(from!.player)} graveyard.`;
        case 'graveyard>library': return `${cap(bare(ref, 'a card'))} is put from the graveyard into ${poss(to!.player)} library.`;
        case 'exile>battlefield': return `${owned(to!.player, ref, true)} returns to the battlefield from exile.`;
        case 'exile>hand': return `${cap(bare(ref, 'a card'))} goes from exile to ${poss(to!.player)} hand.`;
        case 'exile>graveyard': return `${cap(bare(ref, 'a card'))} goes from exile to ${poss(to!.player)} graveyard.`;
        default:
          return `${cap(owned(whoseFrom, ref))} moves from ${fz === null ? 'nowhere' : fz} to ${tz}.`;
      }
    })();
    fact(cur, 'zone', whoseFrom, [ref], text, { from: fz, to: tz });
  };

  // --- casts and abilities ----------------------------------------------------

  /** "Wasp, Shrinking Savior ({1}{U}, creature 1/3)" -- read off the card, never computed. */
  const spellText = (ref: Ref): string => {
    const card = ref.card;
    if (ref.faceDown) {
      const pt = card !== null ? ptOf(card) : null;
      return ref.name !== null
        ? `${ref.name} face down (as a ${pt !== null ? `${pt} ` : ''}creature)`
        : `a face-down ${pt !== null ? `${pt} ` : ''}creature`;
    }
    if (ref.name === null) return 'a spell';
    const bits: string[] = [];
    if (card !== null && typeof card.manaCost === 'string' && card.manaCost !== '') bits.push(card.manaCost);
    const kind = card !== null ? kindOfTypes(card.types) : '';
    const pt = card !== null ? ptOf(card) : null;
    if (kind !== '') bits.push(pt !== null ? `${kind} ${pt}` : kind);
    return bits.length > 0 ? `${ref.name} (${bits.join(', ')})` : ref.name;
  };

  const targetsOf = (stackItem: WireStackItem | null, cur: Cur): { refs: Ref[]; players: number[] } => {
    const refs: Ref[] = [];
    const players: number[] = [];
    if (stackItem === null) return { refs, players };
    for (const id of stackItem.targetCardIds ?? []) {
      if (typeof id === 'number') refs.push(nowRef(id, cur));
    }
    for (const id of stackItem.targetPlayerIds ?? []) if (typeof id === 'number') players.push(id);
    return { refs, players };
  };

  const onCast = (cur: Cur, e: WireEvent): void => {
    const stackItem =
      [...(cur.body.stack ?? []), ...(g.prev?.stack ?? [])].find((s) => s && s.id === e.stackId) ?? null;
    // M6 logs say it outright (`stack[].isAbility`).  Otherwise: the first
    // cast after the card moved to the stack is the spell, and a cast for a
    // card that did not move is an ability of it (section 3.3: an ability's
    // source keeps its own zone).
    const isSpell =
      stackItem !== null && typeof stackItem.isAbility === 'boolean'
        ? !stackItem.isAbility
        : g.pendingSpell.has(e.cardId);
    g.pendingSpell.delete(e.cardId);
    const who = typeof e.controller === 'number' ? e.controller : (stackItem?.controller ?? null);
    const s = stat(who);
    if (isSpell) {
      if (s) s.spells += 1;
      const ref = nowRef(e.cardId, cur, ['stack']);
      const targets = targetsOf(stackItem, cur);
      const tail =
        targets.refs.length + targets.players.length > 0
          ? ` targeting ${andList([...targets.refs.map((r) => label(r, 'a hidden card')), ...targets.players.map(pname)])}`
          : '';
      fact(cur, 'cast', who, [ref, ...targets.refs], said(who, `casts ${spellText(ref)}${tail}`), { stackId: e.stackId });
      return;
    }
    if (s) s.abilities += 1;
    const src = nowRef(e.cardId, cur, ['battlefield']);
    const text = tidyText(e.text, src.name !== null && !src.faceDown ? src.name : null);
    const srcLabel = label(src);
    const key = `${e.cardId}|${text}`;
    const again = text !== '' && g.quoted.has(key);
    g.quoted.add(key);
    // "When…/Whenever…/At…" is a trigger's own wording; the verb is the only
    // thing it chooses.  An empty text is the bridge's gate (section 3.6 rule 1).
    const trigger = /^(?:[^—]{1,40} — )?(when|whenever|at) /i.test(text);
    let sentence: string;
    if (text === '') sentence = `${cap(srcLabel)}'s ability goes on the stack.`;
    else if (trigger) sentence = again ? `${cap(srcLabel)} triggers again.` : `${cap(srcLabel)} triggers: "${text}"`;
    else {
      const own = src.controller === who ? label(src, 'an unknown card', false) : srcLabel;
      sentence = again ? said(who, `uses ${own} again`) : said(who, `uses ${own}: "${text}"`);
    }
    fact(cur, 'ability', who, [src], sentence, { stackId: e.stackId, abilityText: text });
  };

  // --- combat -----------------------------------------------------------------

  const onAttackers = (cur: Cur, e: WireEvent): void => {
    const bands = (e.bands ?? []).filter((b) => b && Array.isArray(b.attackerIds) && b.attackerIds.length > 0);
    if (bands.length === 0) return; // no attack: nothing to say
    const byDefender = new Map<string, { defender: WireEntity | null; refs: Ref[] }>();
    const allRefs: Ref[] = [];
    for (const b of bands) {
      const d = b.defender && typeof b.defender === 'object' ? `${b.defender.kind}:${b.defender.id}` : 'none';
      if (!byDefender.has(d)) byDefender.set(d, { defender: b.defender ?? null, refs: [] });
      for (const id of b.attackerIds!) {
        const ref = nowRef(id, cur, ['battlefield']);
        byDefender.get(d)!.refs.push(ref);
        allRefs.push(ref);
      }
    }
    const opponents = [...g.players.keys()].filter((id) => id !== e.player);
    const parts = [...byDefender.values()].map(({ defender, refs }) => {
      const who = andList(refs.map((r) => withPt(r, false)));
      if (defender === null) return who;
      if (defender.kind === 'player') {
        return opponents.length === 1 && defender.id === opponents[0] ? who : `${who} at ${pname(defender.id)}`;
      }
      const target = nowRef(defender.id, cur, ['battlefield']);
      allRefs.push(target);
      return `${who} at ${label(target)}`;
    });
    fact(cur, 'attack', e.player, allRefs, said(e.player, `attacks with ${parts.join('; ')}`));
  };

  const onBlockers = (cur: Cur, e: WireEvent): void => {
    // state.combat is the authority on who blocked what (amendment M7); the
    // event's own map sends an unblocked attacker to itself.
    const blocks = new Map<unknown, number[]>();
    const bands = cur.body.combat?.bands;
    if (Array.isArray(bands)) {
      for (const b of bands) {
        for (const a of b?.attackerIds ?? []) blocks.set(a, (b.blockerIds ?? []).filter((x) => x !== a));
      }
    }
    for (const b of e.blocks ?? []) {
      if (!b || typeof b.attackerId !== 'number') continue;
      if (!blocks.has(b.attackerId)) blocks.set(b.attackerId, (b.blockerIds ?? []).filter((x) => x !== b.attackerId));
    }
    const lines: string[] = [];
    const refs: Ref[] = [];
    for (const [attacker, blockers] of blocks) {
      if (blockers.length === 0) continue;
      const a = nowRef(attacker, cur, ['battlefield']);
      const bs = blockers.map((id) => nowRef(id, cur, ['battlefield']));
      refs.push(a, ...bs);
      lines.push(`${andList(bs.map((r) => withPt(r)))} ${bs.length === 1 ? 'blocks' : 'block'} ${label(a)}`);
    }
    if (lines.length === 0) {
      if (blocks.size > 0) fact(cur, 'blocks', e.defendingPlayer, [], `${pname(e.defendingPlayer)} does not block.`);
      return;
    }
    fact(cur, 'blocks', e.defendingPlayer, refs, `${cap(lines.join('; '))}.`);
  };

  const damageText = (player: unknown, entry: DamageEntry): string => {
    const srcs = entry.sources;
    let from: string;
    if (srcs.length === 1) from = `from ${label(srcs[0]!.ref, 'an unknown source')}`;
    else if (srcs.length <= 4) from = `(${srcs.map((x) => `${label(x.ref, 'an unknown source')} ${x.amount}`).join(', ')})`;
    else from = `from ${srcs.length} sources`;
    const life = entry.lifeTo !== null ? `; life ${entry.lifeFrom} → ${entry.lifeTo}` : '';
    return `${pname(player)} takes ${entry.total} damage ${from}${life}.`;
  };

  const onDamage = (cur: Cur, e: WireEvent, damageOpen: Map<unknown, DamageEntry>): void => {
    const amount = Number(e.amount ?? 0);
    const src = nowRef(e.sourceCardId, cur, ['battlefield']);
    const srcController = src.controller;
    const s = stat(srcController);
    const target = e.target && typeof e.target === 'object' ? (e.target as WireEntity) : null;
    if (target === null) return;
    if (target.kind === 'player') {
      if (s) s.damageToPlayers += amount;
      const open = damageOpen.get(target.id);
      if (open) {
        open.total += amount;
        open.sources.push({ ref: src, amount });
        open.fact.cards.push(jsonRef(src));
        open.fact.amount = open.total;
        open.fact.text = damageText(target.id, open);
        return;
      }
      const entry: DamageEntry = {
        total: amount,
        sources: [{ ref: src, amount }],
        lifeTo: null,
        lifeFrom: null,
        fact: fact(cur, 'damage', srcController, [src], '', {
          target: { kind: 'player', id: target.id },
          amount,
          combat: e.combat === true,
        }),
      };
      entry.fact.text = damageText(target.id, entry);
      damageOpen.set(target.id, entry);
      return;
    }
    if (s) s.damageToCreatures += amount;
    const victim = nowRef(target.id, cur, ['battlefield']);
    fact(cur, 'damage', srcController, [src, victim], `${cap(label(src))} deals ${amount} damage to ${label(victim)}.`, {
      target: { kind: 'card', id: target.id },
      amount,
    });
  };

  const onLife = (cur: Cur, e: WireEvent, damageOpen: Map<unknown, DamageEntry>): void => {
    const from = Number(e.from ?? 0);
    const to = Number(e.to ?? 0);
    const open = damageOpen.get(e.player);
    if (open && open.lifeTo === null && from - to === open.total) {
      open.lifeFrom = from;
      open.lifeTo = to;
      open.fact.lifeFrom = from;
      open.fact.lifeTo = to;
      open.fact.text = damageText(e.player, open);
      damageOpen.delete(e.player);
      return;
    }
    const delta = to - from;
    if (delta === 0) return;
    fact(
      cur,
      'life',
      e.player,
      [],
      delta < 0 ? `${pname(e.player)} loses ${-delta} life (now ${to}).` : `${pname(e.player)} gains ${delta} life (now ${to}).`,
      { from, to },
    );
  };

  // --- what no event says: a diff of the battlefields -------------------------

  /** Permanents face down in the frame before and face up in this one: id -> card. */
  const faceUpsOf = (cur: Cur): Map<number, WireCard> => {
    const out = new Map<number, WireCard>();
    if (g.prevIndex === null) return out;
    for (const [id, hits] of cur.index) {
      const a = hits.find((h) => h.zone === 'battlefield' && h.player !== null);
      const b = (g.prevIndex.get(id) ?? []).find((h) => h.zone === 'battlefield' && h.player !== null);
      if (a && b && b.card.faceDown === true && a.card.faceDown === false) out.set(id, a.card);
    }
    return out;
  };

  /**
   * Control changes have no event of their own, so every batch is diffed for
   * them.  A permanent that simply appears or vanishes is diffed only across a
   * GAP (frames a client never received): in a gapless log the events say it,
   * and a snapshot can LEAD its events -- WireGuiGame.ask() flushes a `state`
   * one frame ahead (report 06 W4), so trample's blocker is already in the
   * graveyard one frame before its death is an event.
   */
  const bf = (index: StateIndex): Map<number, Hit> => {
    const m = new Map<number, Hit>();
    for (const [id, hits] of index) for (const h of hits) if (h.zone === 'battlefield' && h.player !== null) m.set(id, h);
    return m;
  };
  const afterBatch = (cur: Cur): void => {
    if (g.prev === null || g.prevIndex === null) return;
    const before = bf(g.prevIndex);
    for (const [id, a] of bf(cur.index)) {
      const b = before.get(id);
      if (b === undefined) continue;
      if (typeof b.card.controller === 'number' && typeof a.card.controller === 'number' && b.card.controller !== a.card.controller) {
        const ref = nowRef(id, cur, ['battlefield']);
        fact(cur, 'control', a.card.controller, [ref], `${pname(a.card.controller)} gains control of ${label(ref)}.`);
      }
    }
  };
  /** Say what the battlefield shows changed across a gap; true if anything was said. */
  const acrossGap = (cur: Cur, gap: Gap, turnJumped: boolean): boolean => {
    if (g.prev === null || g.prevIndex === null || g.turn === null) return false;
    const moved = new Set((cur.body.events ?? []).filter((e) => e && e.kind === 'zone').map((e) => e.cardId));
    const before = bf(g.prevIndex);
    const after = bf(cur.index);
    const appeared = [...after].filter(([id]) => !before.has(id) && !moved.has(id));
    const left = [...before].filter(([id]) => !after.has(id) && !moved.has(id));
    if (appeared.length === 0 && left.length === 0 && !turnJumped) return false;
    const range = gap.frames === 1 ? `Frame ${gap.from}` : `Frames ${gap.from}–${gap.to}`;
    fact(cur, 'gap', null, [], `(${range} never reached this client; while it was away:)`, { gap });
    for (const [id, a] of appeared) {
      g.unexplained += 1;
      const ref = refOf(id, [{ frame: 'cur', zone: 'battlefield' }], cur);
      const who = a.card.controller ?? a.player;
      fact(cur, 'appears', who, [ref], `${cap(withPt(ref, false))} is now on ${poss(who)} battlefield.`);
    }
    for (const [id, b] of left) {
      g.unexplained += 1;
      const ref = refOf(id, [{ frame: 'prev', zone: 'battlefield' }], cur);
      fact(cur, 'leaves', b.card.controller ?? b.player, [ref], `${owned(b.card.controller ?? b.player, ref)} is no longer on the battlefield.`);
    }
    return true;
  };

  // --- one state frame --------------------------------------------------------

  const onState = (frame: WireFrame): void => {
    const body = (frame.body ?? {}) as WireBody;
    const cur: Cur = { seq: frame.seq as number, body, index: indexState(body) };
    const events = Array.isArray(body.events) ? body.events : [];
    const firstTurnEv = events.find((e) => e && e.kind === 'turn');
    g.ambiguous = ambiguousNames(g.prevIndex, cur.index);

    // Where are we when this batch starts?  A log that begins mid-game (a
    // client that connected late, the hand-written synthetic fixture) has no
    // `turn` event for the turn already running.
    if (g.prev === null && typeof body.turn === 'number' && body.turn > 0) {
      const t = firstTurnEv !== undefined ? firstTurnEv.turn - 1 : body.turn;
      if (t > 0) {
        g.turn = { turn: t, player: firstTurnEv !== undefined ? null : (body.activePlayer ?? null) };
        g.phase = firstTurnEv !== undefined ? null : (body.phase ?? null);
        g.startsAtTurn = t;
        g.setupDone = true;
      }
    }
    // Frames between the last snapshot and this one that never reached this
    // log (a client that was disconnected).  Nothing is invented for them:
    // the battlefield is diffed across the gap and said, and the gap itself is
    // said only when something visibly changed in it.
    const missing: number[] = [];
    if (g.prevSeq !== null && typeof cur.seq === 'number') {
      for (let q = g.prevSeq + 1; q < cur.seq; q += 1) if (!g.present.has(q)) missing.push(q);
    }
    let turnJumped = false;
    if (g.turn !== null && firstTurnEv === undefined && typeof body.turn === 'number' && body.turn > g.turn.turn) {
      // A turn went by with no `turn` event in our hands.
      g.turn = { turn: body.turn, player: body.activePlayer ?? null };
      g.phase = body.phase ?? null;
      turnJumped = true;
    }
    if (missing.length > 0) {
      const gap: Gap = { from: missing[0]!, to: missing[missing.length - 1]!, frames: missing.length, told: false };
      g.gaps.push(gap);
      gap.told = acrossGap(cur, gap, turnJumped);
    }

    // Pass 1 over the batch: what each id is doing, so pass 2 narrates each
    // thing once (a land's zone move is the land play; a spell's move to the
    // stack is the cast; a sacrifice is not also a death).
    const landIds = new Set<unknown>();
    const sacrificedIds = new Set<unknown>();
    const zoneIds = new Set<unknown>();
    for (const e of events) {
      if (!e || typeof e !== 'object') continue;
      if (e.kind === 'land' && typeof e.cardId === 'number') landIds.add(e.cardId);
      if (e.kind === 'sacrificed' && typeof e.cardId === 'number') sacrificedIds.add(e.cardId);
      if (e.kind === 'zone' && typeof e.cardId === 'number') zoneIds.add(e.cardId);
    }
    const resolvedOpen = g.resolvedOpen;
    // Turned face up (a special action: no event of its own) -- said just
    // before the first event of the batch that mentions the card, so Ashcloud
    // Phoenix is turned face up BEFORE its "when turned face up" trigger.
    const faceUps = faceUpsOf(cur);
    const mentions = (e: WireEvent): number[] =>
      [e.cardId, e.sourceCardId, ...(Array.isArray(e.cardIds) ? (e.cardIds as unknown[]) : [])].filter(
        (id): id is number => typeof id === 'number',
      );
    const sayFaceUp = (id: number): void => {
      const card = faceUps.get(id);
      if (card === undefined) return;
      faceUps.delete(id);
      const ref = refOf(id, [{ frame: 'cur', zone: 'battlefield' }], cur);
      fact(cur, 'faceUp', card.controller ?? null, [ref], said(card.controller, `turns ${withPt(ref, false)} face up`));
    };
    const damageOpen = new Map<unknown, DamageEntry>(); // player -> the open damage fact for that player
    const ctx: ZoneCtx = {
      landIds,
      sacrificedIds,
      drawOpen: { fact: null, player: null, phase: null, refs: [] },
      tokenOpen: { fact: null, key: null, count: 0, ref: null },
    };

    const closeRuns = (): void => {
      ctx.drawOpen.fact = null;
      ctx.tokenOpen.fact = null;
    };

    events.forEach((e) => {
      if (!e || typeof e !== 'object') return;
      if (faceUps.size > 0) for (const id of mentions(e)) sayFaceUp(id);
      switch (e.kind) {
        case 'turn': {
          closeRuns();
          g.turn = { turn: e.turn, player: e.player };
          g.phase = null;
          const s = stat(e.player);
          if (s) s.turns += 1;
          turnRecord();
          if (!g.setupDone) beginSetup(cur, e);
          return;
        }
        case 'phase': {
          if (g.phase !== e.phase) closeRuns();
          g.phase = e.phase;
          if (g.turn !== null && g.turn.player === null) {
            g.turn.player = e.player;
            const rec = turnRecord();
            if (rec && rec.player === null) rec.player = e.player;
          }
          return;
        }
        case 'mulligan': {
          g.mulligans.set(e.player, (g.mulligans.get(e.player) ?? 0) + 1);
          const s = stat(e.player);
          if (s) s.mulligans += 1;
          if (g.setupDone && g.turn !== null) {
            fact(cur, 'mulligan', e.player, [], said(e.player, 'takes a mulligan'));
          }
          return;
        }
        case 'zone':
          onZone(cur, e, ctx);
          return;
        case 'land': {
          closeRuns();
          const ref = refOf(e.cardId, [{ frame: 'cur', zone: 'battlefield' }, { frame: 'prev', zone: 'hand' }], cur);
          const s = stat(e.player);
          if (s) s.lands += 1;
          fact(cur, 'land', e.player, [ref], said(e.player, `plays ${bare(ref, 'a land')}`));
          return;
        }
        case 'cast':
          closeRuns();
          onCast(cur, e);
          return;
        case 'resolved': {
          resolvedOpen.set(e.cardId, (resolvedOpen.get(e.cardId) ?? 0) + 1);
          if (e.fizzled === true) {
            const ref = nowRef(e.cardId, cur);
            fact(cur, 'fizzled', null, [ref], `${cap(label(ref, 'a spell'))} fizzles: its target is gone.`);
          }
          return;
        }
        case 'unstacked': {
          const open = resolvedOpen.get(e.cardId) ?? 0;
          if (open > 0) {
            resolvedOpen.set(e.cardId, open - 1);
            return;
          }
          const ref = nowRef(e.cardId, cur);
          fact(cur, 'countered', null, [ref], `${cap(label(ref, 'a spell'))} leaves the stack without resolving.`);
          return;
        }
        case 'attackers':
          closeRuns();
          onAttackers(cur, e);
          return;
        case 'blockers':
          closeRuns();
          onBlockers(cur, e);
          return;
        case 'damage':
          closeRuns();
          onDamage(cur, e, damageOpen);
          return;
        case 'life':
          closeRuns();
          onLife(cur, e, damageOpen);
          return;
        case 'poison': {
          const amount = Number(e.amount ?? 0);
          fact(cur, 'poison', e.player, [], `${pname(e.player)} gets ${plural(amount, 'poison counter')} (now ${Number(e.from ?? 0) + amount}).`);
          return;
        }
        case 'counters': {
          const ref = nowRef(e.cardId, cur, ['battlefield']);
          const delta = Number(e.to ?? 0) - Number(e.from ?? 0);
          if (delta === 0) return;
          const kind = String(e.counter ?? 'a');
          const n = Math.abs(delta);
          const what = n === 1 ? `a ${kind} counter` : `${n} ${kind} counters`;
          fact(
            cur,
            'counters',
            null,
            [ref],
            delta > 0
              ? `${cap(label(ref))} gets ${what} (now ${String(e.to)}).`
              : `${cap(label(ref))} loses ${what} (now ${String(e.to)}).`,
            { counter: kind, from: e.from, to: e.to },
          );
          return;
        }
        case 'attach': {
          if (e.to === null || typeof e.to !== 'object') return; // an unattach: the host's own fate says it
          const to = e.to as WireEntity;
          const ref = nowRef(e.cardId, cur, ['battlefield']);
          if (to.kind === 'player') {
            fact(cur, 'attach', null, [ref], `${cap(label(ref))} is attached to ${pname(to.id)}.`);
            return;
          }
          const host = nowRef(to.id, cur, ['battlefield']);
          fact(cur, 'attach', null, [ref, host], `${cap(label(ref))} is attached to ${label(host)}.`);
          return;
        }
        case 'sacrificed': {
          if (zoneIds.has(e.cardId)) return; // its zone event narrates it
          const ref = refOf(e.cardId, [{ frame: 'prev', zone: 'battlefield' }], cur);
          fact(cur, 'sacrificed', ref.controller, [ref], said(ref.controller, `sacrifices ${bare(ref)}`));
          return;
        }
        case 'scry': {
          const top = Number(e.toTop ?? 0);
          const bottom = Number(e.toBottom ?? 0);
          fact(cur, 'scry', e.player, [], said(e.player, `scries ${top + bottom}: ${lookAt(top, 'keeps', 'on top', bottom, 'puts', 'on the bottom')}`));
          return;
        }
        case 'surveil': {
          const lib = Number(e.toLibrary ?? 0);
          const gy = Number(e.toGraveyard ?? 0);
          fact(cur, 'surveil', e.player, [], said(e.player, `surveils ${lib + gy}: ${lookAt(lib, 'keeps', 'on top', gy, 'puts', 'into the graveyard')}`));
          return;
        }
        case 'phased': {
          const ref = nowRef(e.cardId, cur, ['battlefield']);
          fact(cur, 'phased', null, [ref], `${cap(label(ref))} phases ${e.phasedOut === false ? 'in' : 'out'}.`);
          return;
        }
        case 'foretold':
          fact(cur, 'foretold', e.player, [], said(e.player, 'foretells a card (exiled face down)'));
          return;
        case 'outcome':
          g.outcome = { winner: e.winner ?? null, lastTurn: e.lastTurn ?? null };
          return;
        case 'shuffle':
        case 'tap':
        case 'stats':
        case 'combat_end':
          return; // mana taps, P/T recomputes and shuffles: the noise a story leaves out
        default:
          g.ignoredEvents += 1;
      }
    });

    for (const id of [...faceUps.keys()]) sayFaceUp(id);
    afterBatch(cur);
    finishSetup();

    // The events say which phase the NEXT batch starts in.  Only across a gap
    // -- where the events that would say it never arrived -- does the snapshot
    // get the last word: in a human-seat log a snapshot can LEAD its events
    // (report 06 W4), and trusting it there would file the next batch's first
    // events under a phase that has not begun yet.
    if (typeof body.turn === 'number' && body.turn > 0 && g.turn !== null && body.turn === g.turn.turn) {
      if (typeof body.activePlayer === 'number') g.turn.player = body.activePlayer;
      if ((missing.length > 0 || turnJumped) && typeof body.phase === 'string') g.phase = body.phase;
    }
    for (const p of body.players ?? []) {
      const s = stat(p.id);
      if (s) {
        s.lifeEnd = p.life ?? s.lifeEnd;
        s.poisonEnd = p.poison ?? s.poisonEnd;
      }
      if (!g.players.has(p.id)) g.players.set(p.id, { id: p.id, name: String(p.name ?? `Player ${p.id}`), isAi: p.isAi === true });
    }
    g.lastState = body;
    g.prev = body;
    g.prevIndex = cur.index;
    g.prevSeq = cur.seq;
  };

  // --- the seat's own sideboarding --------------------------------------------

  const onAnswer = (frame: WireFrame): void => {
    const answer = (frame.body ?? {}) as { askId?: string; value?: unknown };
    const ask = g.asks.get(answer.askId as string);
    if (ask === undefined || ask.kind !== 'sideboard') return;
    g.asks.delete(answer.askId as string);
    const value = answer.value;
    if (!Array.isArray(value)) {
      fact(null, 'sideboard', g.you, [], `${pname(g.you)} keeps the same deck for this game.`, { in: [], out: [] });
      return;
    }
    const main = ask.main ?? [];
    const side = ask.side ?? [];
    const chosen = new Set<unknown>(value);
    const out = main.filter((o) => !chosen.has(o.id)).map((o) => stripSetCode(o.label));
    const inn = side.filter((o) => chosen.has(o.id)).map((o) => stripSetCode(o.label));
    const tally = (names: readonly string[]): string[] => {
      const m = new Map<string, number>();
      for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
      return [...m].map(([n, c]) => (c === 1 ? n : `${c} ${n}`));
    };
    const text =
      out.length === 0 && inn.length === 0
        ? `${pname(g.you)} sideboards nothing: the same deck again.`
        : `${pname(g.you)} sideboards: in ${andList(tally(inn)) || 'nothing'}; out ${andList(tally(out)) || 'nothing'}.`;
    const saveTurn = g.turn;
    if (!g.setupDone) g.turn = null;
    fact(null, 'sideboard', g.you, [], text, { in: inn, out });
    g.turn = saveTurn;
  };

  // --- one frame ----------------------------------------------------------------

  const push = (raw: unknown, frameIndex: number): void => {
    frameAt = frameIndex;
    if (raw === null || typeof raw !== 'object') return;
    const frame = raw as WireFrame;
    const dir = frame.dir ?? (['act', 'answer', 'resync'].includes(frame.type ?? '') ? 'c2s' : 's2c');
    if (dir === 'c2s') {
      if (games.length === 0) return;
      const body = frame.body as { action?: unknown } | undefined;
      if (frame.type === 'resync') g.resyncs += 1;
      else if (frame.type === 'act' && body?.action === 'concede') {
        g.concededBy = g.you;
        fact(null, 'concede', g.you, [], `${pname(g.you)} concedes.`, { seq: null });
      } else if (frame.type === 'answer') onAnswer(frame);
      return;
    }
    if (frame.seq === 0) return; // a pong or a refusal: not part of any session (M10)
    if (frame.type === 'hello_ok') {
      const hello = (frame.body ?? null) as WireHello | null;
      const id = hello?.gameId ?? null;
      if (games.length > 0 && id === g.gameId) {
        g.redelivered += 1; // a resync's verbatim copy
        return;
      }
      newGame(hello);
      g.seen.add(frame.seq as number);
      return;
    }
    if (games.length === 0) newGame(null); // a log with no handshake (never written by this repo, tolerated)
    if (typeof frame.seq === 'number') {
      if (g.seen.has(frame.seq) && opts.keepRedelivered !== true) {
        g.redelivered += 1;
        return;
      }
      g.seen.add(frame.seq);
    }
    switch (frame.type) {
      case 'state':
        onState(frame);
        break;
      case 'ask': {
        const ask = frame.body as WireAsk | undefined;
        if (ask?.kind === 'sideboard' && typeof ask.askId === 'string') g.asks.set(ask.askId, ask);
        break;
      }
      case 'over':
        g.over = (frame.body ?? {}) as WireOver;
        break;
      default:
        break; // input, notice: the seat's prompts and toasts are not the game
    }
  };

  // --- the end ------------------------------------------------------------------

  /** A game as told: its ending (if it has one), its summary, and every fact. */
  const finishGame = (game: GameState): StoryGame => {
    const saved = g;
    g = game;
    try {
      const over = game.over;
      const players = [...game.players.keys()].sort((a, b) => a - b);
      const winner = over && 'winner' in over ? over.winner : game.outcome ? game.outcome.winner : undefined;
      const lastTurnRaw =
        game.outcome?.lastTurn ?? (game.turns.length > 0 ? game.turns[game.turns.length - 1]!.turn : 0);
      const lastTurn = lastTurnRaw as number;
      const when = lastTurn > 0 ? `after turn ${lastTurn}` : 'before turn 1';
      const conceder = game.concededBy;
      let how: string | null = null;
      let text: string | null = null;
      if (winner !== undefined) {
        const losers = players.filter((id) => id !== winner);
        const last = game.lastState;
        const lifeOf = (id: number): number | undefined => last?.players?.find((p) => p.id === id)?.life;
        const poisonOf = (id: number): number | undefined => last?.players?.find((p) => p.id === id)?.poison;
        const libraryOf = (id: number): number | undefined =>
          last?.players?.find((p) => p.id === id)?.zones?.['library']?.count;
        if (conceder !== null && winner === null) {
          // Amendment M11: a concede before the engine asked the seat anything
          // ends the session with no outcome at all -- not a draw.
          how = `${pname(conceder)} conceded before the game began; the engine recorded no winner.`;
          text = `Game over ${when}: ${how}`;
        } else if (winner === null) {
          how = over?.reason ? 'The game is a draw.' : 'The engine recorded no winner.';
          text = `Game over ${when}: ${over?.reason ? 'a draw' : 'no winner was recorded'}.`;
        } else if (conceder !== null && losers.includes(conceder)) {
          how = `${pname(conceder)} conceded.`;
        } else {
          const dead = losers.filter((id) => typeof lifeOf(id) === 'number' && lifeOf(id)! <= 0);
          const poisoned = losers.filter((id) => typeof poisonOf(id) === 'number' && poisonOf(id)! >= 10);
          const decked = losers.filter((id) => libraryOf(id) === 0);
          if (dead.length > 0) how = dead.map((id) => `${poss(id)} life fell to ${lifeOf(id)}.`).join(' ');
          else if (poisoned.length > 0) how = poisoned.map((id) => `${pname(id)} has ${poisonOf(id)} poison counters.`).join(' ');
          else if (decked.length > 0) how = decked.map((id) => `${pname(id)} had to draw from an empty library.`).join(' ');
          else how = over?.reason ? `(Forge's reason: ${String(over.reason).replace(/\.$/, '')}.)` : null;
        }
        if (text === null) text = `Game over ${when}: ${pname(winner)} wins. ${how ?? ''}`.trim();
      }
      const ending: Ending | null =
        over === null && winner === undefined
          ? null
          : { winner: winner ?? null, reason: over?.reason ?? null, matchOver: over?.matchOver ?? null, how, lastTurn, text };
      const summary: SeatSummary[] = players.map((id) => ({
        player: id,
        name: pname(id),
        isAi: game.players.get(id)?.isAi === true,
        ...stat(id)!,
      }));
      return {
        gameId: game.gameId,
        you: game.you,
        seed: game.seed,
        gameNumber: game.gameNumber,
        gameCount: game.gameCount,
        match: game.match,
        players: players.map((id) => game.players.get(id)!),
        facts: game.facts.slice(),
        turns: game.turns.map((t) => ({ turn: t.turn, player: t.player })),
        startsAtTurn: game.startsAtTurn,
        redelivered: game.redelivered,
        resyncs: game.resyncs,
        gaps: game.gaps.map((x) => ({ ...x })),
        unexplained: game.unexplained,
        ignoredEvents: game.ignoredEvents,
        summary,
        ending,
      };
    } finally {
      g = saved;
    }
  };

  return {
    push,
    story: () => ({ file: opts.file ?? null, header, clientLog, games: games.map(finishGame) }),
  };
}

/**
 * Narrate a parsed log.  Returns {file, header, clientLog, games:[...]}, where
 * every game carries `facts` -- each with `seq` (the frame it came from),
 * `prevSeq` (the frame before it, the only other frame a name may come from),
 * `turn`, `phase`, `kind`, `actor`, `cards: [{id, name}]`, its sentence `text`
 * and its `frameIndex` -- plus `summary`, `ending` and the resync bookkeeping.
 */
export function narrate(parsed: ParsedLog, opts: NarrateOptions = {}): Story {
  const header = parsed.header ?? null;
  const narrator = createNarrator(header, { ...opts, present: presentSeqs(header, parsed.frames) });
  parsed.frames.forEach((frame, i) => {
    narrator.push(frame, i);
  });
  return narrator.story();
}

// ---------------------------------------------------------------------------
// Moments and the outline: the grouping both the CLI's text and the page draw

/**
 * **One moment of the story, for the page** (D151): a fact as the `#story`
 * column shows it.  `seat` is the player who did it (`null` for a thing that
 * happens: a death, a trigger), `label` the phase word the CLI prints in its
 * margin, and `frameIndex` where it sits on the replay cursor.
 */
export interface Moment {
  turn: number;
  seat: number | null;
  phase: string | null;
  label: string;
  kind: FactKind;
  text: string;
  frameIndex: number;
  seq: number | null;
  cards: readonly CardRef[];
}

/** The margin word for a fact: its phase, or `note` for a gap and `concede` for a concede. */
function labelOf(f: Fact): string {
  return f.kind === 'gap' ? 'note' : f.kind === 'concede' ? 'concede' : phaseLabel(f.phase);
}

export function momentOf(f: Fact): Moment {
  return {
    turn: f.turn,
    seat: f.actor,
    phase: f.phase,
    label: labelOf(f),
    kind: f.kind,
    text: f.text,
    frameIndex: f.frameIndex,
    seq: f.seq,
    cards: f.cards,
  };
}

/** Every moment of one game, in the order the narrator told them. */
export function momentsOf(game: StoryGame): Moment[] {
  return game.facts.map(momentOf);
}

/** A run of moments with one margin word: the CLI prints it as one wrapped line. */
export interface OutlineRun {
  label: string;
  moments: Moment[];
}

export interface OutlineTurn {
  turn: number;
  player: number | null;
  /** `Turn 14 · Human (you)`. */
  heading: string;
  /** Empty for a turn of nothing but passes. */
  runs: OutlineRun[];
}

export interface Outline {
  /** Turn 0: mulligans, the kept hands, who goes first, the seat's sideboarding. */
  setup: Moment[];
  /** A log that begins mid-game begins in this turn. */
  startsAtTurn: number | null;
  turns: OutlineTurn[];
}

/** The story of one game grouped as the CLI prints it and the page draws it. */
export function outlineGame(game: StoryGame): Outline {
  const setup = game.facts.filter((f) => f.turn === 0).map(momentOf);
  const byTurn = new Map<number, Moment[]>();
  for (const f of game.facts) {
    if (f.turn === 0) continue;
    if (!byTurn.has(f.turn)) byTurn.set(f.turn, []);
    byTurn.get(f.turn)!.push(momentOf(f));
  }
  const turns = game.turns.map((rec): OutlineTurn => {
    const runs: OutlineRun[] = [];
    let run: OutlineRun | null = null;
    for (const m of byTurn.get(rec.turn) ?? []) {
      if (run === null || run.label !== m.label) {
        run = { label: m.label, moments: [] };
        runs.push(run);
      }
      run.moments.push(m);
    }
    return {
      turn: rec.turn,
      player: rec.player,
      heading: `Turn ${rec.turn} · ${typeof rec.player === 'number' ? whoTag(game, rec.player) : 'unknown player'}`,
      runs,
    };
  });
  return { setup, startsAtTurn: game.startsAtTurn, turns };
}

// ---------------------------------------------------------------------------
// Rendering (the CLI's text; the page reads the same pieces)

/** `AI-Seat0 (AI)`, `Human (you)`: a player as a heading names them. */
export function whoTag(game: StoryGame, id: number): string {
  const p = game.players.find((x) => x.id === id);
  if (!p) return `Player ${id}`;
  if (id === game.you && !p.isAi) return `${p.name} (you)`;
  return p.isAi ? `${p.name} (AI)` : p.name;
}

/** The title and the one line that says whose view this is. */
export function renderSeat(story: Story, game: StoryGame): string[] {
  const you = game.players.find((p) => p.id === game.you);
  const others = game.players.filter((p) => p.id !== game.you);
  const youName = you ? you.name : `seat ${game.you}`;
  const hidden = others.length > 0 ? `${andList(others.map((p) => `${p.name}'s`))} hand` : 'the other hands';
  const lines: string[] = [];
  lines.push(`This is ${youName}'s view (seat ${game.you}): ${hidden} and every library stay hidden,`);
  lines.push('so an unseen card is "a card" here, and a face-down one "a face-down card".');
  if (story.clientLog) {
    lines.push(
      ...wrap(
        `It is a CLIENT log: ${plural(game.redelivered, 'frame')} re-delivered on ` +
          `${plural(game.resyncs, 'resync')} were skipped` +
          (game.gaps.length > 0
            ? `; ${plural(game.gaps.reduce((n, x) => n + x.frames, 0), 'frame')} between snapshots never reached it.`
            : '.'),
        '',
        '',
      ),
    );
  }
  return lines;
}

/** `g1 · seed 42: AI-Seat0 (AI) vs AI-Seat1 (AI)` -- the title without its `==` rules. */
export function titleOf(game: StoryGame): string {
  const names = game.players.map((p) => whoTag(game, p.id)).join(' vs ');
  const bits = [game.gameId ?? 'a game'];
  if (game.seed !== null && game.seed !== undefined) bits.push(`seed ${String(game.seed)}`);
  if (typeof game.gameNumber === 'number') {
    bits.push(`game ${game.gameNumber}${typeof game.gameCount === 'number' ? ` of ${game.gameCount}` : ''}`);
  }
  return `${bits.join(' · ')}: ${names}`;
}

interface MatchDeckLike {
  name?: unknown;
}
interface MatchLike {
  yourDeck?: MatchDeckLike | null;
  aiDeck?: MatchDeckLike | null;
  yourProfile?: unknown;
  aiProfile?: unknown;
}

/** Who plays which deck (amendment M44's `hello_ok.match`), or `null` when the log does not say. */
export function decksLineOf(game: StoryGame): string | null {
  const m = game.match as MatchLike | null;
  if (!m || typeof m !== 'object') return null;
  const you = game.players.find((p) => p.id === game.you)?.name ?? 'you';
  const other = game.players.find((p) => p.id !== game.you)?.name ?? 'the AI';
  const parts: string[] = [];
  // `yourProfile` (amendment M47) is written only when the viewing seat is an
  // AI too -- a spectated RecordMatch game -- so then both seats name a profile.
  if (m.yourDeck?.name) {
    parts.push(`${you} plays ${String(m.yourDeck.name)}${m.yourProfile ? ` (AI profile ${String(m.yourProfile)})` : ''}`);
  }
  if (m.aiDeck?.name) {
    parts.push(`${other} plays ${String(m.aiDeck.name)}${m.aiProfile ? ` (AI profile ${String(m.aiProfile)})` : ''}`);
  }
  return parts.length > 0 ? `${parts.join('; ')}.` : null;
}

export function renderTitle(_story: Story, game: StoryGame): string[] {
  const lines = [`== ${titleOf(game)} ==`];
  const decks = decksLineOf(game);
  if (decks !== null) lines.push(...wrap(decks, '', ''));
  return lines;
}

/** Render the story (or the turns `range` = [lo, hi] of it) as text. */
export function renderStory(story: Story, opts: { range?: readonly [number, number] | null } = {}): string {
  const out: string[] = [];
  const [lo, hi] = opts.range ?? [0, Infinity];
  story.games.forEach((game, gi) => {
    if (gi > 0) out.push('');
    out.push(...renderTitle(story, game));
    out.push(...renderSeat(story, game));
    const inRange = (t: number): boolean => t >= lo && t <= hi;
    const outline = outlineGame(game);
    if (inRange(0) && outline.setup.length > 0) {
      out.push('');
      out.push('Before the game');
      for (const m of outline.setup) out.push(...wrap(m.text, '  ', '  '));
    }
    if (typeof outline.startsAtTurn === 'number' && inRange(outline.startsAtTurn)) {
      out.push('');
      out.push(`(This log begins in the middle of turn ${outline.startsAtTurn}; what came before is not in it.)`);
    }
    for (const t of outline.turns) {
      if (!inRange(t.turn)) continue;
      out.push('');
      out.push(t.heading);
      if (t.runs.length === 0) {
        out.push('  (nothing but passes)');
        continue;
      }
      // One line per run of facts in the same phase; the label names the phase.
      for (const run of t.runs) {
        out.push(...wrap(run.moments.map((m) => m.text).join(' '), `  ${run.label.padEnd(8)}`, ' '.repeat(10)));
      }
    }
    if (game.ending && inRange(game.ending.lastTurn ?? Infinity)) {
      out.push('');
      out.push(...wrap(game.ending.text ?? '', '', ''));
      if (game.ending.matchOver === false) out.push('The match goes on: the next game is its own log.');
    }
  });
  return `${out.join('\n')}\n`;
}

/** The last turn the log reached (0 before turn 1). */
export function turnsPlayed(game: StoryGame): number {
  return game.turns.length > 0 ? game.turns[game.turns.length - 1]!.turn : 0;
}

/** `Seen from AI-Seat0's seat. 25 turns (13 rounds).` */
export function seenFromLine(game: StoryGame): string {
  const you = game.players.find((p) => p.id === game.you);
  const n = turnsPlayed(game);
  return `Seen from ${you ? you.name : `seat ${game.you}`}'s seat. ${plural(n, 'turn')} (${plural(Math.ceil(n / 2), 'round')}).`;
}

export interface SummaryRow {
  label: string;
  values: Array<number | string>;
}

/** The summary table's column heads: each seat's name, the viewing seat marked. */
export function summaryHeadOf(game: StoryGame): string[] {
  return game.summary.map((c) => (c.player === game.you ? `${c.name} (seat)` : c.name));
}

/** The summary table's rows, one value per seat in `game.summary` order. */
export function summaryRowsOf(game: StoryGame): SummaryRow[] {
  const cols = game.summary;
  const rows: SummaryRow[] = [
    { label: 'turns taken', values: cols.map((c) => c.turns) },
    { label: 'mulligans', values: cols.map((c) => c.mulligans) },
    { label: 'lands played', values: cols.map((c) => c.lands) },
    { label: 'spells cast', values: cols.map((c) => c.spells) },
    { label: 'abilities used', values: cols.map((c) => c.abilities) },
    { label: 'their creatures that died', values: cols.map((c) => c.creaturesDied) },
    { label: 'damage dealt to players', values: cols.map((c) => c.damageToPlayers) },
    { label: 'damage dealt to creatures', values: cols.map((c) => c.damageToCreatures) },
    { label: 'life at the end', values: cols.map((c) => (c.lifeEnd === null ? '?' : c.lifeEnd)) },
  ];
  if (cols.some((c) => (c.poisonEnd ?? 0) > 0)) rows.push({ label: 'poison at the end', values: cols.map((c) => c.poisonEnd ?? 0) });
  return rows;
}

/** Per-seat totals, the winner and how. */
export function renderSummary(story: Story): string {
  const out: string[] = [];
  story.games.forEach((game, gi) => {
    if (gi > 0) out.push('');
    out.push(...renderTitle(story, game));
    out.push(seenFromLine(game));
    if (game.ending) out.push(...wrap(game.ending.text ?? '', '', ''));
    else out.push('The log ends before the game does.');
    out.push('');
    const head = summaryHeadOf(game);
    const w = Math.max(10, ...head.map((h) => h.length));
    const row = (label: string, vals: ReadonlyArray<number | string>): string =>
      `  ${label.padEnd(26)}${vals.map((v) => String(v).padStart(w + 2)).join('')}`;
    out.push(row('', head));
    for (const r of summaryRowsOf(game)) out.push(row(r.label, r.values));
  });
  return `${out.join('\n')}\n`;
}

/** A fact as `--json` prints it: everything but the page's `frameIndex`. */
function jsonFact(f: Fact): Omit<Fact, 'frameIndex'> {
  const { frameIndex: _frameIndex, ...rest } = f;
  return rest;
}

/** The structured form: one object per game, every fact with its card refs. */
export function toJson(story: Story, opts: { range?: readonly [number, number] | null } = {}): unknown {
  const [lo, hi] = opts.range ?? [0, Infinity];
  return {
    file: story.file,
    clientLog: story.clientLog,
    games: story.games.map((game) => ({
      gameId: game.gameId,
      seat: game.you,
      seed: game.seed,
      gameNumber: game.gameNumber,
      gameCount: game.gameCount,
      match: game.match,
      players: game.players,
      startsAtTurn: game.startsAtTurn,
      redelivered: game.redelivered,
      resyncs: game.resyncs,
      gaps: game.gaps,
      unexplained: game.unexplained,
      ignoredEvents: game.ignoredEvents,
      turns: game.turns.filter((t) => t.turn >= lo && t.turn <= hi),
      facts: game.facts.filter((f) => f.turn >= lo && f.turn <= hi).map(jsonFact),
      summary: game.summary,
      ending: game.ending,
    })),
  };
}
