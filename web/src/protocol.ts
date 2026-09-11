/*
 * mtg-table — protocol.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Hand-written TypeScript mirror of docs/protocol.md v1 (decision D4: no codegen).
 * CHANGE docs/protocol.md FIRST, then this file, then bridge/src/mtgtable/Snap.java.
 *
 * Section numbers in the comments below are docs/protocol.md section numbers.
 * This file is types + small const tables only: no runtime logic, no IO.
 *
 * 2026-09-11 — the hidden-information amendments (docs/research/06 §6, 07 §1):
 *   P1  the redacted stub gains `owner` — five keys, still no identity.
 *   P2  `library` gains `cards`: the library cards a continuous "may look"
 *       effect reveals, never a stub, never completing the count.
 *   P3  face-down cards are read from `getCurrentState()` and carry an `alt`
 *       block only when `canFaceDownBeShownTo(viewer)`.
 *   P4  four new event kinds (scry, surveil, phased, foretold); the engine's
 *       free-text accessors stay banned.
 *   P5  a `hidden` card REPLACES the client's card for that id; ids are stable
 *       across zone changes, so merging is a leak (see reduce.ts).
 *   P6  the `open_zones` ask kind is deleted — eleven kinds remain.
 *   P7  ask options are ask-local indices with an optional serialised card.
 *   P15 `Card.token`.
 */

/** §1. Protocol major. `reduce()` throws on a frame whose `v` differs from this. */
export const PROTOCOL_VERSION = 1;

/** §8.2. Direction marker present on every line of a frame log; absent on the wire. */
export type Direction = 's2c' | 'c2s';

// ---------------------------------------------------------------------------
// §1 Envelope
// ---------------------------------------------------------------------------

/** §2. The ten frame types: 6 server→client, 4 client→server (ping/pong both). */
export const FRAME_TYPES = [
  'hello_ok',
  'state',
  'input',
  'ask',
  'notice',
  'over',
  'act',
  'answer',
  'resync',
  'ping',
  'pong',
] as const;
export type FrameType = (typeof FRAME_TYPES)[number];

/**
 * §1. Every frame, both directions, is exactly this object. `dir` is the one
 * extra field a frame-log line carries (§8.2); it is absent on the wire.
 */
export interface Envelope<T extends FrameType, B> {
  /** Protocol major version. */
  v: number;
  /** Monotonic counter, per direction, starting at 1. Gaps mean a dropped frame. */
  seq: number;
  /** Epoch milliseconds when the frame was produced. */
  t: number;
  type: T;
  body: B;
  /** §8.2 — frame logs only. */
  dir?: Direction;
}

/** A body with no fields (`resync`, `ping`, `pong`). */
export type EmptyBody = Record<string, never>;

// ---------------------------------------------------------------------------
// §2.1 hello_ok (s→c)
// ---------------------------------------------------------------------------

export interface PlayerIdentity {
  id: number;
  name: string;
  isAi: boolean;
}

export interface HelloOkBody {
  gameId: string;
  /** The viewing player's id — the seat every redaction in this stream was made against. */
  you: number;
  seed: number | null;
  forgeVersion: string;
  forgeJarSha256: string;
  /** Whatever `Match.prepareAllZones` → `revealUnsupported` complained about. */
  unsupportedCards: string[];
  players: PlayerIdentity[];
}

// ---------------------------------------------------------------------------
// §3 state
// ---------------------------------------------------------------------------

/** §3.1. Zone keys are exactly these six. */
export const ZONE_NAMES = [
  'hand',
  'battlefield',
  'graveyard',
  'exile',
  'command',
  'library',
] as const;
export type ZoneName = (typeof ZONE_NAMES)[number];

/** Every zone except `library` carries its cards. */
export interface CardZone {
  count: number;
  cards: AnyCard[];
}

/**
 * §3.4, **amended** (report 06 §0.4 / §6.3). A library is still a `count` — but
 * it now also carries the cards a *continuous* effect lets the viewer see.
 *
 * Future Sight, Bolas's Citadel, Experimental Frenzy and Oracle of Mul Daya call
 * `Card.addMayLookAt` from a static ability: nothing blocks, so there is no
 * `ask` for those cards to ride on, and under the old "a library is a count and
 * nothing else" rule they were invisible forever.
 *
 * Two invariants, both asserted by `tools/check-redaction.mjs` (A3):
 *
 * - `cards` holds **only** library cards for which `canBeShownTo(viewer)` is
 *   true. It is never a redacted stub and never completes the count.
 * - `count` is the **full** library size, so `cards.length <= count` always.
 *
 * `cards` is **not optional**. Every emitter writes it, every committed
 * recording carries it (`[]` in an ordinary game), and
 * `tools/check-redaction.mjs` fails a file whose library lacks it. It was
 * optional for one afternoon, while `fixtures/synthetic/sample-handwritten.jsonl`
 * still predated the amendment, and the cost was every reader in `web/` guarding
 * a key that cannot be absent — the pattern CLAUDE.md rule 10 bans outright on
 * the Java side ("the renderer never tests for key absence").
 */
export interface LibraryZone {
  count: number;
  cards: Card[];
}

export interface Zones {
  hand: CardZone;
  battlefield: CardZone;
  graveyard: CardZone;
  exile: CardZone;
  command: CardZone;
  library: LibraryZone;
}

/** §3.1. All six keys are always present, zeros included. */
export interface ManaPool {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
}

export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

export interface PlayerState {
  id: number;
  name: string;
  isAi: boolean;
  life: number;
  poison: number;
  /** Counter name → count. Poison is broken out because the UI always shows it. */
  counters: Record<string, number>;
  manaPool: ManaPool;
  zones: Zones;
}

/** §3.2. An ability as the engine offers it. `canPlay` is the engine's own answer. */
export interface CardAbility {
  id: number;
  text: string;
  canPlay: boolean;
  isSpell: boolean;
}

/**
 * §3.2 (report 06 §6.2, amendment P3). The real face of a face-down card, and
 * the **only** place `CardView.getAlternateState()` may reach the wire.
 *
 * The bridge emits it only when `cv.isFaceDown() && cv.canFaceDownBeShownTo(me)`
 * — Forge's own "you may look at face-down permanents you control" predicate
 * (`CardView.java:688-704`), the same one `AbstractGuiGame.mayFlip` uses. Every
 * other card on the wire is read from `getCurrentState()` alone, whose name for
 * a face-down card is `""` (`CardUtil.getFaceDownCharacteristic`).
 *
 * So: `alt` present ⇒ this seat is entitled to flip the card. It is how a viewer
 * sees their **own** morph, which M1 could not do at all.
 */
export interface AltFace {
  name: string;
  manaCost: string | null;
  /** A string, `""` if Forge has nothing — never `null`, like {@link Card.types}. */
  types: string;
  power: string | null;
  toughness: string | null;
}

/** §3.2. A card the viewer is allowed to see. */
export interface Card {
  /** Forge's `CardView` id; stable for the life of the game. The only identity we have. */
  id: number;
  name: string;
  setCode: string | null;
  /**
   * `"{1}{W}"`, or **`null` for a card with no mana cost** (every land, every
   * token). Never `""`, and never Forge's internal `"no cost"` display string —
   * §3.2 pins this, and the bridge emits it through `ManaCost.isNoCost()`.
   */
  manaCost: string | null;
  /**
   * Forge's `CardType.toString()` verbatim (a plain hyphen, not an em dash).
   * Always a string, never `null` — and **`""` for a face-down card outside the
   * battlefield and the stack** (report 06 §1.4 / amendment P3):
   * `CardStateView.getType()` returns `CardType.EMPTY` there, and the "2/2
   * Creature" of `CardUtil.getFaceDownCharacteristic` is an artifact of the
   * face-down state object rather than a rules fact. `""` is the same spelling
   * §3.2 already uses for "Forge has nothing here", so the renderer has one
   * absence to handle rather than two.
   */
  types: string;
  /**
   * Strings, because `"*"` and `"1+*"` are real values. Both are `null` for a
   * face-down card outside battlefield/stack, for the reason on {@link types}.
   */
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  damage: number;
  counters: Record<string, number>;
  tapped: boolean;
  /** Summoning sickness. */
  sick: boolean;
  attacking: boolean;
  blocking: boolean;
  faceDown: boolean;
  /**
   * §3.2 (amendment P15, `CardView.isToken()` — javap-confirmed). A token has a
   * card id like any other permanent but no printing behind it, so `art.json`
   * can never have an entry for it and a miss is expected rather than a gap in
   * the art index.
   */
  token: boolean;
  /**
   * The card's real face, **only** when this seat may look at it (see
   * {@link AltFace}). `null` for every face-up card and for every face-down card
   * this seat may not flip — which is how an opponent's morph stays a 2/2 with
   * no name.
   */
  alt: AltFace | null;
  attachedToId: number | null;
  attachmentIds: number[];
  /**
   * §3.2. A number for a card in a player zone, where the bridge's fallback
   * hint is that zone's own player. **`null` is possible only on
   * `state.stackCards`**, where the hint is
   * `StackItemView.getActivatingPlayer()` — the same nullable accessor that
   * makes `StackItem.controller` nullable. Guard it the same way.
   */
  controller: number | null;
  owner: number | null;
  zone: string;
  abilities: CardAbility[];
  /** Present only so the union below discriminates; never emitted as `true` here. */
  hidden?: false;
  /** Present only so the union below discriminates; never emitted as `true` here. */
  faceDownHidden?: false;
}

/**
 * §3.3, gate 1 (`canBeShownTo`). A card the viewer may not see **at all**:
 * exactly **five** keys and nothing else (amendment P1, report 06 §6.1).
 *
 * `owner` joined the stub because `canBeShownTo`'s `case Hand` compares against
 * `getController()` (`CardView.java:646-650`) while the zone arrays are keyed by
 * the zone's *player*: when the two diverge — Gonti, a stolen permanent — the
 * client otherwise cannot tell whose card it is looking at. An owner id is not
 * identity-bearing; a name is.
 */
export interface RedactedCard {
  id: number;
  zone: string;
  /** §3.2 — `null` only on `state.stackCards`; see {@link Card.controller}. */
  controller: number | null;
  /** §3.3 — the fifth key (P1). `null` only where `controller` may be null. */
  owner: number | null;
  hidden: true;
  /** Present only so the union discriminates; never emitted. */
  faceDownHidden?: false;
}

/**
 * **Superseded (amendment P3), still accepted.** The eleven-key `faceDownHidden`
 * shape M1 invented for a face-down permanent.
 *
 * The amendment replaces it: a face-down card now takes the ordinary
 * full-fields branch read from `getCurrentState()` — whose name is `""`, whose
 * type is `Creature` and whose P/T is 2/2, i.e. exactly what every player at the
 * table can see — carrying `faceDown: true` and an {@link AltFace} `alt` block
 * *only* when this seat may flip it. One shape fewer, one gate more.
 *
 * **Nothing in the repo emits this any more** — not the bridge, not
 * `tools/make-sample-fixture.mjs`, and `tools/check-redaction.mjs` fails any
 * file that carries one (its own negative control is
 * `fixtures/negative/redaction/p3-facedownhidden-revived.jsonl`). The type stays
 * only so a log recorded before 2026-09-11 still replays instead of being read
 * as a full card. `isHidden` covers it, so nothing downstream can accidentally
 * treat one as identifiable.
 */
export interface FaceDownCard {
  id: number;
  zone: string;
  /** §3.2 — `null` only on `state.stackCards`; see {@link Card.controller}. */
  controller: number | null;
  faceDownHidden: true;
  /** Present only so the union discriminates; never emitted. */
  hidden?: false;
  tapped: boolean;
  attacking: boolean;
  blocking: boolean;
  damage: number;
  counters: Record<string, number>;
  power: string | null;
  toughness: string | null;
}

export type AnyCard = Card | RedactedCard | FaceDownCard;

/**
 * §3.3. **The** predicate: is this card's identity concealed from the viewer?
 * True for both concealed shapes, so anything that must not leak an identity
 * (art lookup, a name in a label) has one thing to ask and cannot pick the
 * wrong gate.
 */
export function isHidden(card: AnyCard): card is RedactedCard | FaceDownCard {
  return card.hidden === true || card.faceDownHidden === true;
}

/** §3.3 gate 1 only — the five-key stub. Use {@link isHidden} unless you mean this. */
export function isRedacted(card: AnyCard): card is RedactedCard {
  return card.hidden === true;
}

/**
 * The superseded `faceDownHidden` shape (see {@link FaceDownCard}) — true only
 * for a pre-amendment recording. New logs express the same card as a
 * `faceDown: true` {@link Card} with no {@link AltFace}.
 */
export function isFaceDownHidden(card: AnyCard): card is FaceDownCard {
  return card.faceDownHidden === true;
}

/**
 * Is this card face down, in either spelling? True for the superseded
 * `faceDownHidden` shape and for a full {@link Card} with `faceDown: true`.
 *
 * A face-down card is **not** necessarily concealed: the viewer's own morph
 * comes through as a full card with an {@link AltFace}. Ask {@link isHidden} for
 * "may I name this", and this for "is it face down on the table".
 */
export function isFaceDown(card: AnyCard): boolean {
  return card.faceDownHidden === true || (card as Card).faceDown === true;
}

/**
 * The card's real face when this seat may look at it, else `null`
 * (amendment P3). The one accessor anything that renders a morph should use —
 * it is impossible to reach `alt` on a concealed shape through it.
 */
export function altFace(card: AnyCard): AltFace | null {
  if (isHidden(card)) return null;
  return (card as Card).alt ?? null;
}

/** §3.1. `"player"` or `"card"` (planeswalkers, battles). */
export interface EntityRef {
  kind: 'player' | 'card';
  id: number;
}

/** §3. Stack items are ordered bottom first; the last element resolves next. */
export interface StackItem {
  /**
   * Forge's `StackItemView` id. §10.1: this is a **different id space** from
   * `Card.id` and the two collide (g1.jsonl has a hidden card #56 and a stack
   * item #56 in the same frame). Never key one map on both; never resolve a
   * `stack[].id` against `players[].zones` — go through `sourceCardId`.
   */
  id: number;
  /**
   * The card this item came from — resolve it against `state.stackCards`
   * (§3.3), **not** against `players[].zones`: a spell on the stack is in
   * `ZoneType.Stack`, which is not one of the six zones a player carries.
   * `null` only if the engine gave us a stack item with no source card; a stack
   * item is never dropped, so the reader guards instead.
   */
  sourceCardId: number | null;
  controller: number | null;
  /**
   * The engine's public stack description — or **`""` when this viewer may not
   * have it** (§3.6 rule 1): the bridge blanks it when the source card's
   * identity is concealed, or when the string mentions the id of any card this
   * same frame concealed. Render the absence from `stackCards` (which carries
   * the concealed card's public half); never print an empty line.
   */
  text: string;
  targetCardIds: number[];
  targetPlayerIds: number[];
}

export interface CombatBand {
  attackerIds: number[];
  /** §3.1 — every `defender` on the wire is nullable; guard it. */
  defender: EntityRef | null;
  blockerIds: number[];
  damageOrder: number[];
}

/** §3.1. `combat` is `null` outside a combat phase; `bands` is `[]` outside combat. */
export interface Combat {
  bands: CombatBand[];
}

export interface GameStateBody {
  gameId: string;
  /** §3.1. Counts **player turns**, not rounds. */
  turn: number;
  /** §3.1. `ceil(turn / 2)`. Label the UI with this where the player expects "round". */
  round: number;
  /**
   * The Forge `PhaseType` name verbatim. The client maps it to a label, never
   * parses it. **`null` in the pre-game frames** (§10.5) — the first one or two
   * `state`s of a recording arrive before the first turn, with `turn` and
   * `round` 0 and phase / activePlayer / priority all null. `render(state)` must
   * be total over that.
   */
  phase: string | null;
  /** A player id, not an array index. `null` before the game starts (§10.5). */
  activePlayer: number | null;
  /** A player id, not an array index. `null` before the game starts (§10.5). */
  priority: number | null;
  /** `null` while the game is live; mirrors the `over` body (§7) once it is set. */
  gameOver: OverBody | null;
  players: PlayerState[];
  stack: StackItem[];
  /**
   * §3.3. The source card of every stack item, through the same single
   * redaction gate as every other card. Distinct ids only, in stack order. A
   * spell's card has `zone: "stack"` and appears **only** here; an activated
   * ability's source is usually also on the battlefield and appears in both.
   */
  stackCards: AnyCard[];
  combat: Combat | null;
  /** §3.6. The `GameEventForwarder` batch this snapshot already reflects. */
  events: GameEvent[];
}

/*
 * §9 invariant 10 (amendment P5). **A `hidden` card replaces the client's card
 * for that id; it never merges into it.** Forge card ids are stable across zone
 * changes, so a reducer that merged by id would keep the name it learned during
 * a legitimate reveal and keep rendering it after the card went back to a hidden
 * zone. The rule is enforced — and explained — in `reduce.ts`, because `state`
 * is a full snapshot and the reducer is the only place a card could be carried
 * from one frame to the next.
 */

// ---------------------------------------------------------------------------
// §3.6 events — ids only, never names. Unknown kinds are ignored, not thrown.
// ---------------------------------------------------------------------------

export const EVENT_KINDS = [
  'zone',
  'cast',
  'resolved',
  'unstacked',
  'attackers',
  'blockers',
  'damage',
  'life',
  'poison',
  'tap',
  'counters',
  'attach',
  'sacrificed',
  'land',
  'stats',
  'turn',
  'phase',
  'combat_end',
  'shuffle',
  'mulligan',
  'outcome',
  // Amendment P4 / report 06 §5.3 — four kinds that carry counts and ids only
  // and were previously invisible in the stream.
  'scry',
  'surveil',
  'phased',
  'foretold',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

const EVENT_KIND_SET: ReadonlySet<string> = new Set<string>(EVENT_KINDS);

export function isKnownEventKind(kind: string): kind is EventKind {
  return EVENT_KIND_SET.has(kind);
}

/**
 * §3.6 — **the nullability rule for events.** An event whose subject id the
 * engine could not supply is *dropped by the bridge*, not emitted with a `null`
 * under a non-nullable type. So every `cardId` / `player` / `controller` /
 * `target` below is genuinely non-null, and the handful of fields that *are*
 * nullable are nullable **by design**, each for a stated reason:
 *
 * | field | why it can be `null` |
 * |---|---|
 * | `ZoneEvent.from` | a token created directly onto the battlefield came from nowhere |
 * | `ZoneEvent.to` | a token that ceases to exist goes nowhere |
 * | `ZoneRef.player` | a shared zone (the stack) has no owner |
 * | `AttackBand.defender` | see §3.1: every `defender` on the wire is nullable |
 * | `AttachEvent.to` | `null` *is* the unattach event |
 * | `DamageEvent.damageType` | player damage has no type enum in Forge 2.0.14 |
 * | `PoisonEvent.sourcePlayer` | poison from an effect with no player source |
 * | `OutcomeEvent.winner` | `null` is a draw |
 *
 * Anything else arriving as `null` is drift, and `tools/check-redaction.mjs`
 * fails the fixture for it.
 */
export interface ZoneRef {
  /** The `ZoneType` name lowercased: `hand`, `library`, `battlefield`, `stack`, … */
  zone: string;
  /** The zone owner's id; `null` for a shared zone. */
  player: number | null;
}

export interface ZoneEvent {
  kind: 'zone';
  cardId: number;
  /** `null` when the card came from nowhere — a token entering the battlefield. */
  from: ZoneRef | null;
  /** `null` when the card went nowhere — a token ceasing to exist. */
  to: ZoneRef | null;
}

/** The only string an event may carry is `cast.text` — the public stack description. */
export interface CastEvent {
  kind: 'cast';
  stackId: number;
  cardId: number;
  controller: number;
  /** The same string as `StackItem.text`, through the same gate — `""` when concealed. */
  text: string;
}

export interface ResolvedEvent {
  kind: 'resolved';
  cardId: number;
  fizzled: boolean;
}

export interface UnstackedEvent {
  kind: 'unstacked';
  cardId: number;
}

export interface AttackBand {
  /** §3.1 — every `defender` on the wire is nullable; guard it. */
  defender: EntityRef | null;
  attackerIds: number[];
}

export interface AttackersEvent {
  kind: 'attackers';
  player: number;
  bands: AttackBand[];
}

export interface BlockAssignment {
  attackerId: number;
  blockerIds: number[];
}

export interface BlockersEvent {
  kind: 'blockers';
  defendingPlayer: number;
  blocks: BlockAssignment[];
}

export interface DamageEvent {
  kind: 'damage';
  target: EntityRef;
  sourceCardId: number;
  amount: number;
  combat: boolean;
  /**
   * The Forge damage-type enum name. §10.6: the key is always present, and is
   * `null` for player damage — `GameEventPlayerDamaged` has no type enum in
   * 2.0.14 — so the shape does not depend on the target.
   */
  damageType: string | null;
}

export interface LifeEvent {
  kind: 'life';
  player: number;
  from: number;
  to: number;
}

export interface PoisonEvent {
  kind: 'poison';
  player: number;
  sourcePlayer: number | null;
  from: number;
  amount: number;
}

export interface TapEvent {
  kind: 'tap';
  cardId: number;
  tapped: boolean;
}

export interface CountersEvent {
  kind: 'counters';
  cardId: number;
  /** The `CounterType` name, e.g. `P1P1`. */
  counter: string;
  from: number;
  to: number;
}

export interface AttachEvent {
  kind: 'attach';
  cardId: number;
  to: EntityRef | null;
}

export interface SacrificedEvent {
  kind: 'sacrificed';
  cardId: number;
}

export interface LandEvent {
  kind: 'land';
  player: number;
  cardId: number;
}

export interface StatsEvent {
  kind: 'stats';
  cardIds: number[];
  transform: boolean;
}

export interface TurnEvent {
  kind: 'turn';
  player: number;
  /** The player-turn number, matching `state.turn` (§3.1). */
  turn: number;
}

export interface PhaseEvent {
  kind: 'phase';
  player: number;
  /** Same vocabulary as `state.phase`. */
  phase: string;
}

export interface CombatEndEvent {
  kind: 'combat_end';
  attackerIds: number[];
  blockerIds: number[];
}

export interface ShuffleEvent {
  kind: 'shuffle';
  player: number;
}

export interface MulliganEvent {
  kind: 'mulligan';
  player: number;
}

export interface OutcomeEvent {
  kind: 'outcome';
  /**
   * A player id, or `null` for a draw. `GameEventGameOutcome` also carries
   * `outcomeStrings()` and `matchSummary()` — free text built from
   * `CardView.toString()`, **banned from the wire** (report 06 §4, §5.1).
   */
  winner: number | null;
  lastTurn: number;
}

/**
 * `GameEventScry(PlayerView, int toTop, int toBottom)` — javap-confirmed.
 * Counts only, and genuinely public: everyone at the table sees that a scry
 * happened and how many cards went where. *Which* cards is the `ask`'s business.
 */
export interface ScryEvent {
  kind: 'scry';
  player: number;
  toTop: number;
  toBottom: number;
}

/** `GameEventSurveil(PlayerView, int toLibrary, int toGraveyard)` — counts only. */
export interface SurveilEvent {
  kind: 'surveil';
  player: number;
  toLibrary: number;
  toGraveyard: number;
}

/**
 * `GameEventCardPhased(CardView card, boolean phaseState)` — javap-confirmed.
 * Battlefield-public, and otherwise invisible: a phased-out permanent simply
 * vanishes from the zone array with no event to explain it.
 */
export interface PhasedEvent {
  kind: 'phased';
  cardId: number;
  phasedOut: boolean;
}

/**
 * `GameEventCardForetold(PlayerView activatingPlayer)` — javap-confirmed
 * against the 2.0.14 jar: the record's **only** component is the player. It
 * carries no card at all, which is what makes it safe by construction (the
 * foretold card is face down in exile and nobody but its owner may look).
 *
 * Amendment P4 writes this kind as `{cardId}`; there is no card accessor to
 * build that from, so the body is `{player}` and this comment is the evidence.
 */
export interface ForetoldEvent {
  kind: 'foretold';
  player: number;
}

export type GameEvent =
  | ZoneEvent
  | CastEvent
  | ResolvedEvent
  | UnstackedEvent
  | AttackersEvent
  | BlockersEvent
  | DamageEvent
  | LifeEvent
  | PoisonEvent
  | TapEvent
  | CountersEvent
  | AttachEvent
  | SacrificedEvent
  | LandEvent
  | StatsEvent
  | TurnEvent
  | PhaseEvent
  | CombatEndEvent
  | ShuffleEvent
  | MulliganEvent
  | OutcomeEvent
  | ScryEvent
  | SurveilEvent
  | PhasedEvent
  | ForetoldEvent;

// ---------------------------------------------------------------------------
// §4 input
// ---------------------------------------------------------------------------

export interface InputButton {
  label: string;
  enabled: boolean;
}

export interface InputButtons {
  ok: InputButton;
  cancel: InputButton;
}

export type SelectableMode = 'cards' | 'players' | 'none';

export interface Selectable {
  /** The ids the engine will accept a click on. */
  cardIds: number[];
  min: number;
  max: number;
  mode: SelectableMode;
}

/**
 * §4, amended (report 06 §3, report 07 A1 / amendment P6). `openZones`,
 * `tempShowZones`, `hideZones` and `restoreOldZones` **reveal nothing** —
 * `PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)` and carries no card
 * accessor of any kind — and they are called on the EDT, where blocking is
 * forbidden. They are "open a floating zone panel" hints, so they became this
 * non-blocking field and the `open_zones` *ask* kind was deleted.
 *
 * The cards themselves arrive the way they always did: through `canBeShownTo`
 * in `state`, or in the body of whatever `ask` is blocking at the time.
 */
export interface OpenZoneHint {
  playerId: number;
  /** Zone names, lowercased, as in {@link ZoneName} plus Forge's extras. */
  zones: string[];
}

export interface InputBody {
  /** The engine's own prompt text. Rendered verbatim; never rewritten. */
  prompt: string;
  /**
   * The id of the card the prompt is about. Kept for the common case; prefer
   * {@link InputBody.focusCard}, because the card frequently is not in the
   * snapshot at all.
   */
  focusCardId: number | null;
  /**
   * §4, amended (report 06 §6.9 / amendment P7). `IGuiGame.setCard(CardView)`
   * and `setPanelSelection(CardView)` are pushed with cards that are often
   * **not** in `state` — a library card during surveil, the card
   * `willPutCardOnTop` is asking about — so an id alone is unresolvable. The
   * serialised card comes through the one gated function, like every other card
   * on the wire. Always present; `null` when there is no focus.
   */
  focusCard: AnyCard | null;
  /** §4.2. `ok.enabled === false` means the engine wants a **card click**, not a button. */
  buttons: InputButtons;
  selectable: Selectable;
  /** Emphasised without being clickable. */
  highlighted: number[];
  /**
   * Report 07 A8 / amendment P7 — `AbstractGuiGame.setWeaklySelectable`. Card
   * ids the engine will accept but does not want: in Forge's own UI a weak
   * selection is what "Auto" would have tapped. Ids, because that is what the
   * `Multiset` behind it holds; a card may appear twice (strength 2).
   *
   * §4 declares this key always present, and it is: `[]` until M5 fills it. See
   * {@link LibraryZone.cards} for why it is not optional.
   */
  weak: number[];
  /**
   * The floating-zone hint of {@link OpenZoneHint}. Always present; `[]` most of
   * the time.
   */
  openZones: OpenZoneHint[];
}

// ---------------------------------------------------------------------------
// §5 ask — the eleven blocking kinds
//
// Amendment P6 / report 06 §3 / report 07 A1 deleted the twelfth, `open_zones`:
// `openZones` and `tempShowZones` are not questions. They carry no cards
// (`PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)`), they are invoked on the
// EDT where blocking is forbidden, and Forge's own desktop client answers them
// by opening a panel and handing the token straight back. They are now the
// non-blocking `input.openZones` hint (§4).
// ---------------------------------------------------------------------------

export const ASK_KINDS = [
  'ability_menu',
  'confirm',
  'options',
  'text',
  'choose_list',
  'order',
  'choose_entities',
  'assign_damage',
  'assign_amount',
  'manipulate_list',
  'sideboard',
] as const;
export type AskKind = (typeof ASK_KINDS)[number];

const ASK_KIND_SET: ReadonlySet<string> = new Set<string>(ASK_KINDS);

export function isAskKind(kind: string): kind is AskKind {
  return ASK_KIND_SET.has(kind);
}

/**
 * What an option *is*, when the client needs to know. Report 07 §0.7: the `T`
 * of `getChoices` / `order` is frequently not a view object at all — it is a
 * `MagicColor.Color`, a `SpellAbilityView`, an `Integer`, a `String`, a
 * `CostPart`, a `PaperCard` — so `kind` is how a renderer decides whether it can
 * draw a card, a player avatar or just a line of text.
 */
export const OPTION_KINDS = [
  'card',
  'player',
  'ability',
  /** `assign_amount` only: a `GameEntityView` key of the engine's amount map. */
  'entity',
  /** A `MagicColor.Color` — "mana of any one combination of colours". */
  'color',
  'number',
  'text',
  'other',
] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

/**
 * §5, amended (report 07 A3 / amendment P7). One option of one `ask`.
 *
 * **`id` is an ask-local index**, not a Forge id: the 0-based position in the
 * server's option array for this `askId`. It has to be, because the options of a
 * single ask can be colours, abilities, integers and cards at once, and
 * `Integer 3` and `CardView 3` would collide on any shared id space. The answer
 * echoes indices and the server marshals them back to objects.
 *
 * `cardId` / `playerId` / `abilityId` are present only when the option really is
 * that thing, and exist so the board can highlight it. `card` is the serialised
 * card — from the **one** gated function, like every other card on the wire —
 * because `label` alone throws away the art, the P/T and the cost the UI needs,
 * and because building a second stringifier for options is precisely how a name
 * leaks (report 07 §7: `String.valueOf(CardView)` prints the card's name).
 */
export interface AskOption {
  /** Ask-local index into the server's option array for this `askId`. */
  id: number;
  label: string;
  kind: OptionKind;
  cardId?: number;
  playerId?: number;
  abilityId?: number;
  /** The serialised card, gated like every other card (`"???"` label if hidden). */
  card?: AnyCard;
}

export interface AskBase<K extends AskKind> {
  /** Unique for the life of the connection. */
  askId: string;
  kind: K;
  /** Advisory for the client; enforced by the server (§5.2). */
  timeoutMs: number;
}

/** `getAbilityToPlay` → the chosen option index, or `null`. */
export interface AbilityMenuAsk extends AskBase<'ability_menu'> {
  cardId: number;
  /** `label` is `SpellAbilityView.getDescription()`; `canPlay` is the engine's answer. */
  options: Array<AskOption & { canPlay: boolean; isSpell: boolean }>;
}

/**
 * `confirm(CardView, …)`, `showConfirmDialog` → `true` | `false` | `null`.
 *
 * `card` is not decoration (report 06 §6.6): `confirm(CardView c, …)` is how
 * surveil's single-card case, `willPutCardOnTop` and `confirmAction` ask about a
 * card that is usually in a **library**, and therefore not in `state` at all.
 */
export interface ConfirmAsk extends AskBase<'confirm'> {
  prompt: string;
  title: string;
  yesLabel: string;
  noLabel: string;
  /** What a `null` answer (timeout, disconnect) means for this call. */
  defaultYes: boolean;
  card: AnyCard | null;
}

/** `showOptionDialog` → index int, or `null`. */
export interface OptionsAsk extends AskBase<'options'> {
  prompt: string;
  title: string;
  options: AskOption[];
  defaultIndex: number;
  /** Same reason as {@link ConfirmAsk.card}: it is the same Forge call. */
  card: AnyCard | null;
}

/** `showInputDialog` → string, or `null`. */
export interface TextAsk extends AskBase<'text'> {
  prompt: string;
  title: string;
  initial: string;
  suggestions: string[];
  numeric: boolean;
}

/**
 * `getChoices` and everything `AbstractGuiGame` builds on it → an array of
 * option indices, or `null`.
 *
 * **`reveal`** (report 07 A7 / report 06 §6.5): `AbstractGuiGame.reveal` is
 * `getChoices(message, -1, -1, items)`. A `min`/`max` of `-1` is not a choice at
 * all — it means *show the player these cards and wait for an acknowledgement* —
 * and a client that renders it literally asks the user to pick −1 cards. When
 * `reveal` is true the answer is `[]`.
 */
export interface ChooseListAsk extends AskBase<'choose_list'> {
  prompt: string;
  options: AskOption[];
  min: number;
  max: number;
  reveal: boolean;
  /** Indices the engine pre-selected (`getChoices`'s `selected` argument). */
  preselected: number[];
}

/**
 * `order(…)` → `OrderResult`, which the jar declares as
 * `record OrderResult(List<T> ordered, boolean rememberDecision)` — **not** the
 * `{top, bottom}` M1 guessed (report 07 A2 / §0.5).
 *
 * `dest` is the list being built and `source` the pool left to draw from;
 * answer indices address **`dest ++ source` as one array, in that order**.
 * The answer is **never `null`**: three call sites dereference `.ordered()`
 * unguarded, so a cancel must send the default order rather than nothing.
 */
export interface OrderAsk extends AskBase<'order'> {
  prompt: string;
  /** Forge's label for the destination list (its `top` argument). */
  destLabel: string;
  source: AskOption[];
  dest: AskOption[];
  /**
   * Forge's `remainingMin` / `remainingMax`: how many options may be **left in
   * `source`**, with `-1` meaning unconstrained. They do not bound `dest`.
   */
  min: number;
  max: number;
  referenceCardId: number | null;
  sideboardMode: boolean;
  showRemember: boolean;
}

/**
 * §5, amended (report 06 §6.8 / amendment P7). The context of a
 * `choose_entities`: *here is what you are looking at*, as distinct from
 * `options`, *here is what you may pick*. The two overlap only partially — a
 * deck search reveals the whole library and offers the legal targets.
 *
 * Jar-verified accessors: `getCards()`, `getZone()`, `getOwner()`,
 * `getMessagePrefix()` on `forge.game.player.DelayedReveal` (note the package).
 * Every card in it goes through the one gated function.
 */
export interface DelayedReveal {
  /** The player whose zone is being revealed; `null` if the engine had none. */
  owner: number | null;
  zones: string[];
  messagePrefix: string;
  cards: AnyCard[];
}

/** `chooseSingleEntityForEffect` (min = max = 1), `chooseEntitiesForEffect`. */
export interface ChooseEntitiesAsk extends AskBase<'choose_entities'> {
  prompt: string;
  options: AskOption[];
  min: number;
  max: number;
  delayedReveal: DelayedReveal | null;
}

/**
 * `assignCombatDamage` → `{ "<index>": n }`, or `null`.
 *
 * **The defender is `targets[0]`** (report 07 A4 / amendment P7), carrying
 * `defender: true` and a `playerId` or `cardId`; the server marshals index 0
 * back to the `null` key `PlayerControllerHuman` reads as "the defending
 * player". Blockers follow, each with its remaining toughness as `lethal`.
 */
export interface AssignDamageAsk extends AskBase<'assign_damage'> {
  attackerId: number;
  total: number;
  /** Forge's own flags, passed through. */
  overrideOrder: boolean;
  maySkip: boolean;
  /** Index 0 is the defender (`defender: true`); blockers follow with `lethal`. */
  targets: Array<AskOption & { lethal?: number; defender?: boolean }>;
}

/**
 * `assignGenericAmount` → `{ "<index>": n }`, or `null`.
 *
 * The engine's map is `Map<Object,Integer>` and its keys may be a
 * `GameEntityView` **or** a `MagicColor.Color` ("mana of any one combination"),
 * so a target's `kind` is `entity` or `color` and `max` is the incoming per-key
 * cap (report 07 A5 / amendment P7).
 */
export interface AssignAmountAsk extends AskBase<'assign_amount'> {
  sourceCardId: number | null;
  total: number;
  /** Forge's `atLeastOne`: every target must receive at least one. */
  atLeastOne: boolean;
  /** Forge's `amountLabel` — what the amount *is* ("damage", "counters"). */
  label: string;
  targets: Array<AskOption & { max?: number }>;
}

/**
 * `manipulateCardList` (surveil, scry-likes) → the **full list in its new
 * order**, as indices. Never `null`: `PlayerControllerHuman` indexes the result.
 *
 * `cards` is the whole list in engine order and `manipulable` the indices the
 * player may actually move. With `UI_SELECT_FROM_CARD_DISPLAYS` off (decision
 * D13) the whole-library path never fires, but every entry still goes through
 * the gated card function, so an unrevealed library card arrives redacted.
 */
export interface ManipulateListAsk extends AskBase<'manipulate_list'> {
  prompt: string;
  cards: AskOption[];
  manipulable: number[];
  toTop: boolean;
  toBottom: boolean;
  toAnywhere: boolean;
}

/** `sideboard` → the new main deck as indices, or `null`. Your own pool only. */
export interface SideboardAsk extends AskBase<'sideboard'> {
  prompt: string;
  main: AskOption[];
  side: AskOption[];
}

export type AskBody =
  | AbilityMenuAsk
  | ConfirmAsk
  | OptionsAsk
  | TextAsk
  | ChooseListAsk
  | OrderAsk
  | ChooseEntitiesAsk
  | AssignDamageAsk
  | AssignAmountAsk
  | ManipulateListAsk
  | SideboardAsk;

// ---------------------------------------------------------------------------
// §6 notice, §7 over
// ---------------------------------------------------------------------------

export type NoticeLevel = 'info' | 'warn' | 'error';

/** §6. A toast, never a question. Anything the user must answer is an `ask`. */
export interface NoticeBody {
  level: NoticeLevel;
  title: string;
  text: string;
}

/** §7. Also appears verbatim as `state.gameOver` in later snapshots. */
export interface OverBody {
  /** A player id, or `null` for a draw. */
  winner: number | null;
  /**
   * Forge's `GameOutcome.getWinCondition()` name, or **`null` when the engine
   * had not published a win condition yet** (§7). `Snap.state()` writes this
   * body the instant `Game.isGameOver()` is true, while `GameView.getOutcome()`
   * is a lookup in the `Match`'s outcome map, which is not populated at the same
   * instant — so "not known yet" is a real state and `""` would misreport it as
   * a known empty reason.
   */
  reason: string | null;
  /** `false` → the client may send `act: nextGame`. */
  matchOver: boolean;
}

// ---------------------------------------------------------------------------
// §2.2 act, §2.3 answer (client→server)
// ---------------------------------------------------------------------------

export const ACT_ACTIONS = [
  'clickCard',
  'clickPlayer',
  'clickAbility',
  'buttonOk',
  'buttonCancel',
  /**
   * **Planned (M6) — not emitted yet**, and listed in §2.2's act table with
   * `from: M6` alongside `undo`, `alphaStrike` and `setYield`, because §2.2 also
   * promises the server tolerates any `act` at any time; §10.3 cross-references
   * it rather than defining it twice. Report 07 A6 / amendment P7:
   * `IGameController.passPriority()` exists and is **not** `selectButtonOk`, so
   * a button-only client cannot express "pass until something happens". Typed
   * here so the two ends agree on the spelling before M6 writes it; the M1/M2
   * client sends `buttonOk` / `buttonCancel` with the engine's own labels.
   *
   * §10's other planned acts — `yieldTo`, `newGame` — are deliberately not
   * typed yet: their bodies are still being designed. There is **no `autoPay`
   * act**: "Auto" is the label Forge's `InputPayMana` puts on the OK button.
   */
  'passPriority',
  'useMana',
  'undo',
  'alphaStrike',
  'concede',
  'nextGame',
  'setPhaseStop',
  'setYield',
] as const;
export type ActAction = (typeof ACT_ACTIONS)[number];

export interface ClickCardAct {
  action: 'clickCard';
  cardId: number;
}
export interface ClickPlayerAct {
  action: 'clickPlayer';
  playerId: number;
}
export interface ClickAbilityAct {
  action: 'clickAbility';
  cardId: number;
  abilityId: number;
}
export interface ButtonOkAct {
  action: 'buttonOk';
}
export interface ButtonCancelAct {
  action: 'buttonCancel';
}
export interface PassPriorityAct {
  action: 'passPriority';
}
/**
 * §2.2 — `IGameController.useMana(byte)`. **Colour only**: clicking a land to
 * tap it for mana is a `clickCard`, not a `useMana`, and conflating the two is
 * how a client ends up with two ways to say one thing.
 */
export interface UseManaAct {
  action: 'useMana';
  color: ManaColor;
}
export interface UndoAct {
  action: 'undo';
}
export interface AlphaStrikeAct {
  action: 'alphaStrike';
}
export interface ConcedeAct {
  action: 'concede';
}
export interface NextGameAct {
  action: 'nextGame';
}
export interface SetPhaseStopAct {
  action: 'setPhaseStop';
  playerId: number;
  phase: string;
  stop: boolean;
}
/**
 * Report 07 A6 / amendment P7: a yield **cannot** be addressed by `cardId`.
 * `IGameController.setShouldAutoYield(String key, …)` takes
 * `SpellAbility.yieldKey()` — an opaque engine handle — so the client echoes a
 * `yieldKey` it was given (planned on `state.stack[]`, M3/M6) and never
 * synthesises one.
 */
export interface SetYieldAct {
  action: 'setYield';
  yieldKey: string;
  mode: string;
}

export type ActBody =
  | ClickCardAct
  | ClickPlayerAct
  | ClickAbilityAct
  | ButtonOkAct
  | ButtonCancelAct
  | PassPriorityAct
  | UseManaAct
  | UndoAct
  | AlphaStrikeAct
  | ConcedeAct
  | NextGameAct
  | SetPhaseStopAct
  | SetYieldAct;

/**
 * §5.1 — `order`'s answer (report 07 A2 / amendment P7). The jar's
 * `OrderResult` is `record(List<T> ordered, boolean rememberDecision)`, and
 * `ordered` addresses `dest ++ source` by index. **Never `null`.**
 */
export interface OrderAnswer {
  ordered: number[];
  remember: boolean;
}

/** §5.1. The shape of an answer value is per-kind; this is their union. */
export type AnswerValue =
  | null
  | boolean
  | number
  | string
  | number[]
  | Record<string, number>
  | Record<string, number[]>
  | OrderAnswer;

/** §2.3. Exactly one per `ask`. A second for a completed `askId` is dropped. */
export interface AnswerBody {
  askId: string;
  value: AnswerValue;
}

// ---------------------------------------------------------------------------
// The frame union
// ---------------------------------------------------------------------------

export type HelloOkFrame = Envelope<'hello_ok', HelloOkBody>;
export type StateFrame = Envelope<'state', GameStateBody>;
export type InputFrame = Envelope<'input', InputBody>;
export type AskFrame = Envelope<'ask', AskBody>;
export type NoticeFrame = Envelope<'notice', NoticeBody>;
export type OverFrame = Envelope<'over', OverBody>;
export type ActFrame = Envelope<'act', ActBody>;
export type AnswerFrame = Envelope<'answer', AnswerBody>;
export type ResyncFrame = Envelope<'resync', EmptyBody>;
export type PingFrame = Envelope<'ping', EmptyBody>;
export type PongFrame = Envelope<'pong', EmptyBody>;

export type ServerFrame =
  | HelloOkFrame
  | StateFrame
  | InputFrame
  | AskFrame
  | NoticeFrame
  | OverFrame;

export type ClientFrame = ActFrame | AnswerFrame | ResyncFrame;

export type Frame = ServerFrame | ClientFrame | PingFrame | PongFrame;

// ---------------------------------------------------------------------------
// §8.1 The frame-log session header (line 0 — NOT a frame)
// ---------------------------------------------------------------------------

/**
 * §8.1. One entry per seat. `path` and `sha256` are the **viewing seat's
 * alone** and are `null` for every other seat: a deck path plus its sha256
 * identifies a decklist exactly, and §8.3 promises the log contains only what
 * this player was allowed to see. `cards` (the main deck's card count) is
 * public for every seat.
 */
export interface DeckRef {
  player: number;
  path: string | null;
  sha256: string | null;
  cards: number;
}

/**
 * §8.1. Line 0 of a `.jsonl` frame log. Distinguished from a frame by `kind:"session"`.
 * `seat` is the player id the whole log was redacted for (§8.3).
 */
export interface SessionHeader {
  v: number;
  kind: 'session';
  gameId: string;
  /** ISO-8601 UTC. */
  startedAt: string;
  seed: number | null;
  forgeVersion: string;
  forgeJarSha256: string;
  seat: number;
  decks: DeckRef[];
}

/** A parsed frame log: the header plus every frame line, in file order. */
export interface FrameLog {
  header: SessionHeader;
  frames: Frame[];
}
