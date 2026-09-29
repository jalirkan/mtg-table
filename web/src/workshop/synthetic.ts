/*
 * mtg-table — workshop/synthetic.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The pedestal's board, as a pure function** — the one place the workshop makes
 * a `ClientState`, and the only thing it ever feeds the arena.
 *
 * The arena is a renderer over a frame stream (CLAUDE.md, M7 convention 1), so a
 * viewer that shows "a card as it appears on the table" has exactly one honest
 * way to do it: build the frame a game would have sent with that card on the
 * table, fold it through the real reducer, and hand the result to the real
 * `layout`, `figurePose`, `FigureLayer` and `CueRunner`. Nothing downstream
 * knows the frame was not Forge's. That is also why every rule of the arena still
 * holds on the pedestal — a face-down creature is the anonymous disc, a redacted
 * stub has no figure, an attack turns the attacker toward its defender — without
 * a line of workshop code saying so.
 *
 * Two kinds of board come out of here:
 *
 *  - **the resting board** ({@link pedestalState}): the card on its seat (and on
 *    the other seat too, in "both seats" mode) in the stance the panel picked;
 *  - **a rehearsal** ({@link rehearse}): an event batch and the two boards it
 *    joins — the `before` a `resolved` aims from (T6's one frame of look-behind)
 *    and the `after` the batch is enqueued against — exactly what the arena's
 *    intake hands `CueQueue.enqueueBatch`.
 *
 * The events are the ones the corpus shows Forge sending for each transition (an
 * attack is one `attackers` event naming the band's defender; a death in combat is
 * a `damage` then a `zone` battlefield → graveyard; a trigger going on the stack
 * is a `cast` whose card is the permanent itself). **They are a fiction in one
 * respect, and the panel says so:** what a spell or a trigger TARGETS is the
 * engine's to say, and here the workshop says it — the target dummy, the other
 * seat's copy, or the host an Aura goes on.
 *
 * `[NO three]`, `[NO React]`, no clock: `web/test/workshop.test.ts` drives it.
 */

import type {
  AnyCard,
  Combat,
  CombatBand,
  Frame,
  GameEvent,
  GameStateBody,
  StackItem,
} from '../protocol.ts';
import { initialState, reduce, type ClientState } from '../reduce.ts';
import { isCreatureTypeLine } from '../render/labels.ts';
import { CATALOG, cardOf, roleOf, workshopEntries, type CardOptions, type Role, type WorkshopEntry } from './catalog.ts';

/** The viewer's seat and the other one — the corpus's own two ids. */
export const YOU = 0;
export const OPP = 1;

/**
 * The card ids the pedestal uses. Card ids and stack ids are different id spaces
 * on the wire (`docs/protocol.md` §10.1) and they are kept apart here too.
 */
export const IDS = Object.freeze({
  subject: 101,
  wingman: 102,
  host: 103,
  oppSubject: 201,
  oppWingman: 202,
  oppHost: 203,
  dummy: 301,
  stack: 501,
  oppStack: 502,
});

export const GAME_ID = 'workshop';

export type StanceChoice = 'ready' | 'tapped' | 'sick' | 'attacking' | 'blocking';
export const STANCE_CHOICES: readonly StanceChoice[] = ['ready', 'tapped', 'sick', 'attacking', 'blocking'];

export interface PedestalOptions {
  /** "Both seats": the same card as your figure and as the opponent's. */
  both: boolean;
  stance: StanceChoice;
  /**
   * An opposing creature to aim at (single seat only). In "both seats" mode the
   * two copies are each other's targets and no dummy is drawn.
   */
  dummy: boolean;
}

export const DEFAULT_OPTIONS: PedestalOptions = Object.freeze({ both: false, stance: 'ready', dummy: true });

/** One side of a sketched board. */
interface Side {
  battlefield: AnyCard[];
  graveyard: AnyCard[];
  exile: AnyCard[];
  hand: AnyCard[];
  life: number;
}

/** A board before it is a frame: what each seat has, the stack and the combat. */
interface Sketch {
  sides: [Side, Side];
  stack: StackItem[];
  stackCards: AnyCard[];
  combat: Combat | null;
  phase: string;
}

/** The workshop's supporting cast — the host, the wingman and the dummy — is a Soldier token. */
function extraEntry(): WorkshopEntry {
  const all = workshopEntries(CATALOG);
  return all.find((e) => e.key === 'card:Soldier Token') ?? all.find((e) => e.key === 'arch:soldier')!;
}

const EXTRA = extraEntry();

/** The body an Aura or Equipment is shown on — and the dummy and the wingman. */
export const HOST_ENTRY: WorkshopEntry = EXTRA;

/** A copy of the card: yours, or the opponent's in "both seats" mode. */
interface Copy {
  side: 0 | 1;
  controller: number;
  other: number;
  id: number;
  host: number;
  wingman: number;
  stack: number;
}

function copiesOf(options: PedestalOptions): Copy[] {
  const yours: Copy = {
    side: 0,
    controller: YOU,
    other: OPP,
    id: IDS.subject,
    host: IDS.host,
    wingman: IDS.wingman,
    stack: IDS.stack,
  };
  if (!options.both) return [yours];
  return [
    yours,
    {
      side: 1,
      controller: OPP,
      other: YOU,
      id: IDS.oppSubject,
      host: IDS.oppHost,
      wingman: IDS.oppWingman,
      stack: IDS.oppStack,
    },
  ];
}

function emptySide(): Side {
  return { battlefield: [], graveyard: [], exile: [], hand: [], life: 20 };
}

/** The card a body stands for: the card itself, or the host an Aura or Equipment is on. */
export function figureIdOf(entry: WorkshopEntry, copy: { id: number; host: number }): number {
  return roleOf(entry) === 'attached' ? copy.host : copy.id;
}

/** The ids of every figure the pedestal frames, yours first. */
export function figureIds(entry: WorkshopEntry, options: PedestalOptions): number[] {
  return copiesOf(options).map((copy) => figureIdOf(entry, copy));
}

/** The stance's fields on a creature card. */
function stanceFields(stance: StanceChoice): CardOptions {
  switch (stance) {
    case 'tapped':
      return { tapped: true };
    case 'sick':
      return { sick: true };
    case 'attacking':
      return { attacking: true, tapped: true };
    case 'blocking':
      return { blocking: true };
    default:
      return {};
  }
}

/** Build one copy's permanent onto its side, in the stance asked for. */
function placeCopy(
  sketch: Sketch,
  entry: WorkshopEntry,
  copy: Copy,
  stance: StanceChoice,
  options: { attached?: boolean } = {},
): void {
  const side = sketch.sides[copy.side];
  const role = roleOf(entry);
  const bodily = role === 'creature';
  const fields = bodily ? stanceFields(stance) : stance === 'tapped' ? { tapped: true } : {};
  switch (role) {
    case 'spell': {
      sketch.stackCards.push(cardOf(entry, copy.id, copy.controller, { zone: 'stack' }));
      sketch.stack.push(stackItem(copy.stack, copy.id, copy.controller, []));
      return;
    }
    case 'attached': {
      const attached = options.attached ?? true;
      side.battlefield.push(
        cardOf(EXTRA, copy.host, copy.controller, {
          ...stanceFields(stance),
          attachmentIds: attached ? [copy.id] : [],
        }),
      );
      side.battlefield.push(cardOf(entry, copy.id, copy.controller, { attachedToId: attached ? copy.host : null }));
      return;
    }
    default:
      side.battlefield.push(cardOf(entry, copy.id, copy.controller, fields));
  }
}

function stackItem(id: number, source: number, controller: number, targetCards: number[], targetPlayers: number[] = []): StackItem {
  return {
    id,
    sourceCardId: source,
    controller,
    // The public stack description: a renderer never reads it (the arena has no
    // caption), and a workshop fiction should not invent one.
    text: '',
    targetCardIds: targetCards,
    targetPlayerIds: targetPlayers,
  };
}

function band(attackers: number[], defender: number | null, blockers: number[] = []): CombatBand {
  return {
    attackerIds: attackers,
    defender: defender === null ? null : { kind: 'player', id: defender },
    blockerIds: blockers,
    damageOrder: blockers,
  };
}

/** The resting sketch: the card(s) in the stance asked for, and the dummy. */
function restSketch(entry: WorkshopEntry, options: PedestalOptions): Sketch {
  const sketch: Sketch = {
    sides: [emptySide(), emptySide()],
    stack: [],
    stackCards: [],
    combat: null,
    phase: 'MAIN1',
  };
  const copies = copiesOf(options);
  const role = roleOf(entry);
  const combatStance = (role === 'creature' || role === 'attached') && (options.stance === 'attacking' || options.stance === 'blocking');

  for (const copy of copies) placeCopy(sketch, entry, copy, options.stance);

  if (!options.both && (options.dummy || (combatStance && options.stance === 'blocking'))) {
    sketch.sides[1].battlefield.push(
      cardOf(EXTRA, IDS.dummy, OPP, options.stance === 'blocking' && combatStance ? { attacking: true, tapped: true } : {}),
    );
  }

  if (combatStance) {
    const bands: CombatBand[] = [];
    for (const copy of copies) {
      const body = figureIdOf(entry, copy);
      if (options.stance === 'attacking') bands.push(band([body], copy.other));
      else if (!options.both) bands.push(band([IDS.dummy], YOU, [body]));
      else {
        // Each copy blocks the other seat's wingman, so both stand blocking.
        const attacker = copy.side === 0 ? IDS.oppWingman : IDS.wingman;
        sketch.sides[copy.side === 0 ? 1 : 0].battlefield.push(
          cardOf(EXTRA, attacker, copy.other, { attacking: true, tapped: true }),
        );
        bands.push(band([attacker], copy.controller, [body]));
      }
    }
    sketch.combat = { bands };
    sketch.phase = options.stance === 'attacking' ? 'COMBAT_DECLARE_ATTACKERS' : 'COMBAT_DECLARE_BLOCKERS';
  }
  return sketch;
}

/** A sketch (and the batch it reflects) folded through the real reducer. Pure: same sketch, same state. */
function stateOf(sketch: Sketch, events: readonly GameEvent[] = []): ClientState {
  const zone = (cards: AnyCard[]): { count: number; cards: AnyCard[] } => ({ count: cards.length, cards });
  const player = (id: number, side: Side): GameStateBody['players'][number] => ({
    id,
    name: id === YOU ? 'you' : 'opponent',
    isAi: id !== YOU,
    life: side.life,
    poison: 0,
    counters: {},
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    zones: {
      hand: zone(side.hand),
      battlefield: zone(side.battlefield),
      graveyard: zone(side.graveyard),
      exile: zone(side.exile),
      command: zone([]),
      library: { count: 30, cards: [] },
    },
  });
  const hello = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: {
      gameId: GAME_ID,
      you: YOU,
      seed: null,
      forgeVersion: 'workshop',
      forgeJarSha256: '',
      unsupportedCards: [],
      players: [
        { id: YOU, name: 'you', isAi: false },
        { id: OPP, name: 'opponent', isAi: true },
      ],
    },
  } as unknown as Frame;
  const body: GameStateBody = {
    gameId: GAME_ID,
    turn: 3,
    round: 2,
    phase: sketch.phase,
    activePlayer: YOU,
    priority: YOU,
    gameOver: null,
    players: [player(YOU, sketch.sides[0]), player(OPP, sketch.sides[1])],
    stack: sketch.stack,
    stackCards: sketch.stackCards,
    combat: sketch.combat,
    events: [...events],
  };
  // `seq` is the arena intake's cursor; the workshop enqueues its batches by hand
  // and never runs the intake, so one constant keeps this a pure function.
  const frame = { v: 1, seq: 2, t: 2, type: 'state', body } as unknown as Frame;
  return reduce(reduce(initialState(), hello), frame);
}

/** The resting board the pedestal draws. */
export function pedestalState(entry: WorkshopEntry, options: PedestalOptions = DEFAULT_OPTIONS): ClientState {
  return stateOf(restSketch(entry, options));
}

/**
 * **The card alone on one seat** — the legibility meter's board, and the same one
 * `traits.test.ts`'s raster reads: nothing else on the table, so the rank is one
 * card at the anchor and nothing stands in front of the figure.
 */
export function soloState(entry: WorkshopEntry, seat: 'you' | 'opp', stance: StanceChoice = 'ready'): ClientState {
  const sketch: Sketch = { sides: [emptySide(), emptySide()], stack: [], stackCards: [], combat: null, phase: 'MAIN1' };
  const copy = copiesOf({ both: true, stance, dummy: false })[seat === 'you' ? 0 : 1]!;
  placeCopy(sketch, entry, copy, stance);
  return stateOf(sketch);
}

/** The figure id of the card on {@link soloState}'s seat. */
export function soloFigureId(entry: WorkshopEntry, seat: 'you' | 'opp'): number {
  return seat === 'you'
    ? figureIdOf(entry, { id: IDS.subject, host: IDS.host })
    : figureIdOf(entry, { id: IDS.oppSubject, host: IDS.oppHost });
}

// ---------------------------------------------------------------------------
// Rehearsals — an event batch and the two boards it joins
// ---------------------------------------------------------------------------

export type RehearsalKind =
  | 'enters'
  | 'land'
  | 'attackAlone'
  | 'attackTogether'
  | 'blocks'
  | 'hit'
  | 'lethal'
  | 'hitsPlayer'
  | 'dies'
  | 'exiled'
  | 'sacrificed'
  | 'tap'
  | 'untap'
  | 'counterUp'
  | 'counterDown'
  | 'cast'
  | 'resolves'
  | 'fizzles'
  | 'attach'
  | 'detach'
  | 'transform'
  | 'crew'
  | 'crewedAttack'
  | 'crewedBlock'
  | 'status';

export const REHEARSAL_LABEL: Readonly<Record<RehearsalKind, string>> = {
  enters: 'enters the battlefield',
  land: 'played as a land',
  attackAlone: 'attacks alone',
  attackTogether: 'attacks with another',
  blocks: 'blocks',
  hit: 'takes damage',
  lethal: 'takes lethal damage and dies',
  hitsPlayer: 'hits the player',
  dies: 'dies',
  exiled: 'is exiled',
  sacrificed: 'is sacrificed',
  tap: 'taps',
  untap: 'untaps',
  counterUp: 'gets a +1/+1 counter',
  counterDown: 'loses a +1/+1 counter',
  cast: 'cast / its trigger goes on the stack',
  resolves: 'resolves',
  fizzles: 'fizzles',
  attach: 'attaches to its host',
  detach: 'comes off its host',
  transform: 'transforms',
  crew: 'is crewed',
  crewedAttack: 'crewed, attacks alone',
  crewedBlock: 'crewed, blocks',
  status: 'status strip: keywords, damage and a counter',
};

/**
 * **The status rehearsal's keywords when the catalog has none** (D210) — which
 * is every card today: no committed recording carries amendment M49's keywords.
 * Three glyphs the strip draws and one it folds into its generic `ability` icon,
 * so the owner can judge the icons' size and placement on the pedestal. The
 * rehearsal's `fiction` line says they are the workshop's.
 */
export const STATUS_SAMPLE_KEYWORDS: readonly string[] = ['FLYING', 'FIRST_STRIKE', 'LIFELINK', 'TEAMWORK'];

/** Which rehearsals make sense for a card, by what it is on the table. */
export function rehearsalsFor(entry: WorkshopEntry): RehearsalKind[] {
  if (entry.concealed === 'redacted') return ['enters', 'tap', 'untap', 'dies'];
  if (entry.concealed === 'faceDown') {
    // `status` too: the damage and the counter land, and no strip is drawn — a
    // face-down card shows none (hard rule 8), which is worth seeing.
    return ['enters', 'attackAlone', 'blocks', 'hit', 'lethal', 'hitsPlayer', 'tap', 'untap', 'dies', 'exiled', 'status'];
  }
  const role: Role = roleOf(entry);
  switch (role) {
    case 'creature':
      return [
        'enters',
        'attackAlone',
        'attackTogether',
        'blocks',
        'hit',
        'lethal',
        'hitsPlayer',
        'dies',
        'exiled',
        'sacrificed',
        'tap',
        'untap',
        'counterUp',
        'counterDown',
        'cast',
        'resolves',
        'transform',
        'status',
      ];
    case 'vehicle':
      // A Vehicle is a creature only while crewed (Forge rewrites its type line to
      // `Artifact Creature - Vehicle`, 115 corpus sightings), and that is when it
      // attacks and blocks — so those rehearsals crew it first.
      return ['enters', 'crew', 'crewedAttack', 'crewedBlock', 'cast', 'resolves', 'tap', 'untap', 'dies', 'exiled'];
    case 'permanent':
      return ['enters', 'cast', 'resolves', 'tap', 'untap', 'dies', 'exiled'];
    case 'attached':
      return ['cast', 'resolves', 'attach', 'detach', 'dies'];
    case 'land':
      return ['land', 'enters', 'tap', 'untap', 'dies'];
    case 'spell':
      return ['cast', 'resolves', 'fizzles'];
    default:
      return [];
  }
}

export interface Rehearsal {
  kind: RehearsalKind;
  label: string;
  events: GameEvent[];
  /** The board the batch leaves — T6's `previous`, where a resolution aims from. */
  before: ClientState;
  /** The board the batch arrives with; `enqueueBatch(events, after, …, before.board)`. */
  after: ClientState;
  /** What the workshop decided that the engine would have (a target), or `null`. */
  fiction: string | null;
}

/** Remove a card id from every zone, the stack and the combat of a sketch. */
function lift(sketch: Sketch, id: number): AnyCard | null {
  let found: AnyCard | null = null;
  for (const side of sketch.sides) {
    for (const zone of [side.battlefield, side.graveyard, side.exile, side.hand]) {
      const at = zone.findIndex((c) => c.id === id);
      if (at >= 0) {
        found = zone[at] ?? null;
        zone.splice(at, 1);
      }
    }
  }
  const s = sketch.stackCards.findIndex((c) => c.id === id);
  if (s >= 0) {
    found = found ?? sketch.stackCards[s] ?? null;
    sketch.stackCards.splice(s, 1);
  }
  return found;
}

/** Rewrite one card of a sketch in place (it must be on a battlefield). */
function patch(sketch: Sketch, id: number, fields: Record<string, unknown>): void {
  for (const side of sketch.sides) {
    const at = side.battlefield.findIndex((c) => c.id === id);
    if (at >= 0) side.battlefield[at] = { ...(side.battlefield[at] as object), ...fields } as unknown as AnyCard;
  }
}

function cardIn(sketch: Sketch, id: number): AnyCard | null {
  for (const side of sketch.sides) {
    const hit = side.battlefield.find((c) => c.id === id);
    if (hit !== undefined) return hit;
  }
  return sketch.stackCards.find((c) => c.id === id) ?? null;
}

function numberOf(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function moveTo(sketch: Sketch, id: number, controller: number, zone: 'graveyard' | 'exile' | 'hand'): void {
  const card = lift(sketch, id);
  if (card === null) return;
  const side = sketch.sides[controller === YOU ? 0 : 1];
  const moved = { ...(card as object), zone, tapped: false, attacking: false, blocking: false, damage: 0 } as AnyCard;
  (zone === 'graveyard' ? side.graveyard : zone === 'exile' ? side.exile : side.hand).push(moved);
}

/**
 * What a copy's spell or trigger aims at — **the workshop's fiction**: the target
 * dummy on the other seat, the other seat's copy in "both seats" mode, the host an
 * Aura or Equipment goes on, or (with nothing to aim at) the other player.
 */
function aimOf(entry: WorkshopEntry, copy: Copy, options: PedestalOptions): { cards: number[]; players: number[]; what: string } {
  const role = roleOf(entry);
  if (role === 'attached') return { cards: [copy.host], players: [], what: 'its host' };
  if (options.both) {
    if (role === 'spell') return { cards: [], players: [copy.other], what: 'the other player' };
    const other = copy.side === 0 ? IDS.oppSubject : IDS.subject;
    return { cards: [other], players: [], what: "the other seat's copy" };
  }
  if (options.dummy) return { cards: [IDS.dummy], players: [], what: 'the target dummy' };
  return { cards: [], players: [OPP], what: 'the opponent' };
}

/**
 * **A Vehicle as it is while crewed**: the same card with `Creature` in its type
 * line — `Artifact - Vehicle` becomes `Artifact Creature - Vehicle`, exactly the
 * rewrite the corpus shows Forge sending for the Helicarrier (g1, g3). Every other
 * fact is the printing's; the arena then poses it as a creature with its
 * silhouette (D77: "crewed or not").
 */
export function crewedEntry(entry: WorkshopEntry): WorkshopEntry {
  const types = entry.facts.types;
  if (isCreatureTypeLine(types)) return entry;
  const dash = types.search(/\s[—–-]\s/);
  const crewed = dash < 0 ? `${types} Creature` : `${types.slice(0, dash)} Creature${types.slice(dash)}`;
  return { ...entry, facts: { ...entry.facts, types: crewed } };
}

/**
 * **One rehearsal**, for every copy on the pedestal (one, or two in "both seats"
 * mode). The resting stance is not carried in: every rehearsal starts from a
 * creature that is ready, because that is the board the transition starts from.
 */
export function rehearse(entry: WorkshopEntry, kind: RehearsalKind, options: PedestalOptions = DEFAULT_OPTIONS): Rehearsal {
  // A crewed Vehicle's attack and block are a creature's, on the crewed card.
  if (kind === 'crewedAttack' || kind === 'crewedBlock') {
    const inner = rehearse(crewedEntry(entry), kind === 'crewedAttack' ? 'attackAlone' : 'blocks', options);
    const crewNote = 'crewed before the batch — on the wire that is its own `cast`/`resolved` of the crew ability ("is crewed")';
    return {
      ...inner,
      kind,
      label: REHEARSAL_LABEL[kind],
      fiction: inner.fiction === null ? crewNote : `${inner.fiction}; ${crewNote}`,
    };
  }
  const base: PedestalOptions = { ...options, stance: 'ready' };
  const before = restSketch(entry, base);
  const after = restSketch(entry, base);
  const events: GameEvent[] = [];
  let fiction: string | null = null;
  const copies = copiesOf(base);
  const role = roleOf(entry);

  for (const copy of copies) {
    const id = copy.id;
    const body = figureIdOf(entry, copy);
    const subject = cardIn(after, body);
    const toughness = numberOf((subject as { toughness?: unknown } | null)?.toughness, 1);
    const power = numberOf((subject as { power?: unknown } | null)?.power, 1);
    switch (kind) {
      case 'enters': {
        const card = lift(before, id);
        if (card !== null) before.sides[copy.side].hand.push({ ...(card as object), zone: 'hand' } as AnyCard);
        if (role === 'creature') patch(after, id, { sick: true });
        events.push({ kind: 'zone', cardId: id, from: { zone: 'hand', player: copy.controller }, to: { zone: 'battlefield', player: copy.controller } });
        break;
      }
      case 'land': {
        const card = lift(before, id);
        if (card !== null) before.sides[copy.side].hand.push({ ...(card as object), zone: 'hand' } as AnyCard);
        events.push({ kind: 'land', player: copy.controller, cardId: id });
        break;
      }
      case 'attackAlone':
      case 'attackTogether': {
        const attackers = [body];
        if (kind === 'attackTogether') {
          after.sides[copy.side].battlefield.push(cardOf(EXTRA, copy.wingman, copy.controller, { attacking: true, tapped: true }));
          before.sides[copy.side].battlefield.push(cardOf(EXTRA, copy.wingman, copy.controller));
          attackers.push(copy.wingman);
        }
        patch(after, body, { attacking: true, tapped: true });
        const bands = after.combat?.bands ?? [];
        bands.push(band(attackers, copy.other));
        after.combat = { bands };
        after.phase = 'COMBAT_DECLARE_ATTACKERS';
        events.push({ kind: 'attackers', player: copy.controller, bands: [{ defender: { kind: 'player', id: copy.other }, attackerIds: attackers }] });
        break;
      }
      case 'blocks': {
        if (copy.side === 1) break; // the other seat's copy is the attacker being blocked
        const attacker = base.both ? IDS.oppSubject : IDS.dummy;
        if (!base.both && cardIn(after, IDS.dummy) === null) {
          before.sides[1].battlefield.push(cardOf(EXTRA, IDS.dummy, OPP));
          after.sides[1].battlefield.push(cardOf(EXTRA, IDS.dummy, OPP));
        }
        patch(after, attacker, { attacking: true, tapped: true });
        patch(after, body, { blocking: true });
        after.combat = { bands: [band([attacker], YOU, [body])] };
        after.phase = 'COMBAT_DECLARE_BLOCKERS';
        events.push({ kind: 'blockers', defendingPlayer: YOU, blocks: [{ attackerId: attacker, blockerIds: [body] }] });
        fiction = base.both ? "blocks the other seat's copy" : 'blocks the target dummy';
        break;
      }
      case 'hit': {
        const amount = Math.max(1, Math.min(2, toughness - 1));
        patch(after, body, { damage: amount });
        events.push({ kind: 'damage', target: { kind: 'card', id: body }, sourceCardId: sourceFor(copy, base), amount, combat: true, damageType: null });
        break;
      }
      case 'lethal': {
        events.push({ kind: 'damage', target: { kind: 'card', id: body }, sourceCardId: sourceFor(copy, base), amount: Math.max(1, toughness), combat: true, damageType: null });
        events.push({ kind: 'zone', cardId: body, from: { zone: 'battlefield', player: copy.controller }, to: { zone: 'graveyard', player: copy.controller } });
        moveTo(after, body, copy.controller, 'graveyard');
        break;
      }
      case 'hitsPlayer': {
        const amount = Math.max(1, power);
        events.push({ kind: 'damage', target: { kind: 'player', id: copy.other }, sourceCardId: body, amount, combat: true, damageType: null });
        const victim = after.sides[copy.side === 0 ? 1 : 0];
        events.push({ kind: 'life', player: copy.other, from: victim.life, to: victim.life - amount });
        victim.life -= amount;
        break;
      }
      case 'dies':
      case 'exiled': {
        const zone = kind === 'dies' ? 'graveyard' : 'exile';
        events.push({ kind: 'zone', cardId: id, from: { zone: 'battlefield', player: copy.controller }, to: { zone, player: copy.controller } });
        moveTo(after, id, copy.controller, zone);
        if (role === 'attached') patch(after, copy.host, { attachmentIds: [] });
        break;
      }
      case 'sacrificed': {
        events.push({ kind: 'sacrificed', cardId: id });
        events.push({ kind: 'zone', cardId: id, from: { zone: 'battlefield', player: copy.controller }, to: { zone: 'graveyard', player: copy.controller } });
        moveTo(after, id, copy.controller, 'graveyard');
        break;
      }
      case 'tap':
      case 'untap': {
        const tapped = kind === 'tap';
        patch(before, id, { tapped: !tapped });
        patch(after, id, { tapped });
        events.push({ kind: 'tap', cardId: id, tapped });
        break;
      }
      case 'counterUp':
      case 'counterDown': {
        const up = kind === 'counterUp';
        const grown = { counters: { '+1/+1': 1 }, power: String(power + 1), toughness: String(toughness + 1) };
        if (up) patch(after, id, grown);
        else patch(before, id, grown);
        events.push({ kind: 'counters', cardId: id, counter: '+1/+1', from: up ? 0 : 1, to: up ? 1 : 0 });
        break;
      }
      case 'cast':
      case 'resolves':
      case 'fizzles': {
        const aim = aimOf(entry, copy, base);
        fiction = `aimed at ${aim.what} — on the wire the engine says what a spell targets; here the workshop does`;
        // The board with the spell or trigger ON the stack, aimed.
        const onStack = kind === 'cast' ? after : before;
        if (role === 'spell') {
          const item = onStack.stack.find((s) => s.id === copy.stack);
          if (item !== undefined) {
            item.targetCardIds = aim.cards;
            item.targetPlayerIds = aim.players;
          }
        } else if (role === 'attached') {
          // An Aura or Equipment being cast is on the stack, not yet on its host.
          const card = lift(onStack, id);
          patch(onStack, copy.host, { attachmentIds: [] });
          if (card !== null) onStack.stackCards.push({ ...(card as object), zone: 'stack', attachedToId: null } as AnyCard);
          onStack.stack.push(stackItem(copy.stack, id, copy.controller, aim.cards, aim.players));
        } else {
          // A permanent's trigger: the card stays where it is and is also the
          // stack item's source (`stackCards`), as the corpus shows it.
          const card = cardIn(onStack, id);
          if (card !== null) onStack.stackCards.push(card);
          onStack.stack.push(stackItem(copy.stack, id, copy.controller, aim.cards, aim.players));
        }
        if (kind === 'cast') {
          events.push({ kind: 'cast', stackId: copy.stack, cardId: id, controller: copy.controller, text: '' });
        } else {
          // Resolved: the stack empties; a spell goes to its owner's graveyard.
          if (role === 'spell') {
            after.stack = after.stack.filter((s) => s.id !== copy.stack);
            const card = lift(after, id);
            if (card !== null) after.sides[copy.side].graveyard.push({ ...(card as object), zone: 'graveyard' } as AnyCard);
          }
          events.push({ kind: 'resolved', cardId: id, fizzled: kind === 'fizzles' });
        }
        break;
      }
      case 'attach':
      case 'detach': {
        const on = kind === 'attach';
        const unattached = { attachedToId: null };
        if (on) {
          patch(before, id, unattached);
          patch(before, copy.host, { attachmentIds: [] });
        } else {
          patch(after, id, unattached);
          patch(after, copy.host, { attachmentIds: [] });
        }
        events.push({ kind: 'attach', cardId: id, to: on ? { kind: 'card', id: copy.host } : null });
        break;
      }
      case 'transform':
        events.push({ kind: 'stats', cardIds: [id], transform: true });
        break;
      case 'crew': {
        // The corpus's crew batch (g3 seq 206): the crew taps, the crew ability
        // goes on the stack as a `cast` whose card is the Vehicle, its type line
        // changes (`stats`), and it resolves — all in one snapshot. The crew is a
        // Soldier token (the wingman) here; in the corpus it is whoever the AI tapped.
        const crewed = crewedEntry(entry);
        before.sides[copy.side].battlefield.push(cardOf(EXTRA, copy.wingman, copy.controller));
        after.sides[copy.side].battlefield.push(cardOf(EXTRA, copy.wingman, copy.controller, { tapped: true }));
        patch(after, id, { types: crewed.facts.types });
        events.push({ kind: 'tap', cardId: copy.wingman, tapped: true });
        events.push({ kind: 'cast', stackId: copy.stack, cardId: id, controller: copy.controller, text: '' });
        events.push({ kind: 'stats', cardIds: [id], transform: false });
        events.push({ kind: 'resolved', cardId: id, fizzled: false });
        fiction = 'crewed by a Soldier token — the engine says who crews; here the workshop does';
        break;
      }
      case 'status': {
        // The status layer (D210): the card's keywords on the strip, then a
        // batch the corpus shows Forge sending — damage marked on it and a +1/+1
        // counter — so the bar drains and a pip appears in one snapshot. A
        // face-down card gets no keywords (the bridge writes `[]`) and no strip.
        const own = entry.facts.keywords;
        const keywords = entry.concealed !== null ? [] : own !== undefined && own.length > 0 ? own : STATUS_SAMPLE_KEYWORDS;
        if (entry.concealed === null && (own === undefined || own.length === 0)) {
          fiction =
            'keywords: the workshop’s sample (FLYING, FIRST_STRIKE, LIFELINK, TEAMWORK) — no committed recording ' +
            'carries amendment M49’s keywords yet; the damage and the counter are the corpus’s own event shapes';
        }
        const amount = Math.max(1, Math.min(2, toughness - 1));
        patch(before, body, { keywords: [...keywords] });
        patch(after, body, {
          keywords: [...keywords],
          damage: amount,
          counters: { '+1/+1': 1 },
          power: String(power + 1),
          toughness: String(toughness + 1),
        });
        events.push({ kind: 'damage', target: { kind: 'card', id: body }, sourceCardId: sourceFor(copy, base), amount, combat: false, damageType: 'Normal' });
        events.push({ kind: 'counters', cardId: body, counter: '+1/+1', from: 0, to: 1 });
        break;
      }
      default:
        break;
    }
  }

  return {
    kind,
    label: REHEARSAL_LABEL[kind],
    events,
    before: stateOf(before),
    after: stateOf(after, events),
    fiction,
  };
}

/** Who deals the damage: the dummy, or the other seat's copy. Never the card itself. */
function sourceFor(copy: Copy, options: PedestalOptions): number {
  if (options.both) return copy.side === 0 ? IDS.oppSubject : IDS.subject;
  return IDS.dummy;
}

/**
 * **A clip on its own** — a `stats` event naming every figure, which the
 * workshop's cue data resolves to `workshop.clip` (`clipCue.ts`): the real queue,
 * the real clip lane, and no offset at all, so the clip is all there is to see.
 */
export function clipBatch(entry: WorkshopEntry, options: PedestalOptions = DEFAULT_OPTIONS): Rehearsal {
  // Over the stance on the pedestal: a clip plays against whatever it rests in.
  const state = restSketch(entry, options);
  const events: GameEvent[] = [{ kind: 'stats', cardIds: figureIds(entry, options), transform: false }];
  return {
    kind: 'transform',
    label: 'clip',
    events,
    before: stateOf(state),
    after: stateOf(state, events),
    fiction: null,
  };
}
