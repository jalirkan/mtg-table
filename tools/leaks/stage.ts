// mtg-table — the leak report's input: which recorded games are the owner's own (D438, J129).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The judging is pure (judgeName, judgeLog, guessCube); the CLI (cli.ts
// `stage`) does the reading and the copying.  A game is the owner's when ONE of
// these holds, and is otherwise excluded with the reason:
//
//   - a game against Forge's AI under a match id `match-m<13 digits>[-g<n>]`:
//     ForgeCoach's match launcher (D303), the owner's door; the seat is the
//     header's, a person (`isAi: false`) against an AI, transport ws/console;
//   - one seat of a game between two people (`friend-m<13 digits>-seat0`,
//     D402/D407): seat 0 is the room owner's (D400: `POST /room` answers seat
//     0 to the owner), its header says `humans: 2` and `record: true` (his own
//     consent, D407), and hello_ok names that seat with the owner's name.
//     ANY OTHER SEAT'S LOG IS NEVER OPENED: it is the other person's view and
//     the other person's decisions, and it is excluded by its file name alone;
//   - a play.sh id `human-ws-<seed>` / `human-console-<seed>` named with
//     --include-id (the owner's own say-so).  Without it such a game is
//     excluded: scripted clients and Claude's own verification games write the
//     same ids (docs/evidence/m5-board.md names human-ws-42 as one), and the
//     log cannot tell them apart.
//
// A game that is his is graded only when it has a decision (an act) and a cube
// for pool mode (D348: the opponent's hidden cards are dealt from the cube list
// minus his deck, pool and every public card; with no cube they could only be
// basic lands, and every number would flatter him).

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const MATCH_ID = /^match-m\d{13}(-g\d+)?$/;
export const PLAY_ID = /^human-(ws|console)-\d+(-g\d+)?$/;
export const FRIEND_ID = /^friend-m\d{13}-seat(\d+)$/;
export const CUBE_MIN_SHARE = 0.8;
export const BASICS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'];

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === 'object' ? (x as Obj) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** A frame log's bytes (plain or gzip) as its non-blank lines. */
export function logLines(buf: Buffer): string[] {
  const raw = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return raw.toString('utf8').split('\n').filter((l) => l.trim() !== '');
}

export interface Log {
  header: Obj;
  /** WireLog's frames: every line after the header, so frames[i] is the review's frame index i. */
  frames: Obj[];
}

/** Parse a log; a cut-short last line (a game still being written) is dropped, as WireLog does. */
export function parseLog(lines: string[]): Log {
  if (lines.length === 0) throw new Error('empty log');
  const header = JSON.parse(lines[0] as string) as Obj;
  if (header.kind !== 'session') throw new Error('line 0 is not an mtg-table session header');
  const frames: Obj[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      frames.push(JSON.parse(lines[i] as string) as Obj);
    } catch (e) {
      if (i < lines.length - 1) throw e;
    }
  }
  return { header, frames };
}

export type NameVerdict =
  | { open: false; why: string }
  | { open: true; family: 'match' | 'play' | 'friend' };

/** Before a file is opened: is its game id one that may be the owner's, and may it be read at all? */
export function judgeName(gameId: string): NameVerdict {
  const f = FRIEND_ID.exec(gameId);
  if (f) {
    return f[1] === '0'
      ? { open: true, family: 'friend' }
      : { open: false, why: 'the other seat of a game between two people: never opened' };
  }
  if (MATCH_ID.test(gameId)) return { open: true, family: 'match' };
  if (PLAY_ID.test(gameId)) return { open: true, family: 'play' };
  return { open: false, why: 'not a person\'s game id (a gate, smoke or lab recording)' };
}

export interface LogFacts {
  gameId: string;
  key: string;
  seat: number;
  startedAt: string;
  transport: string;
  acts: number;
  mulligans: number;
  turns: number;
  finished: boolean;
  deckPath: string | null;
}

/** The facts the stage records, from a parsed log. */
export function factsOf(log: Log): LogFacts {
  const h = log.header;
  let acts = 0;
  let mulligans = 0;
  let turns = 0;
  let finished = false;
  let input: Obj | null = null;
  for (const f of log.frames) {
    const b = obj(f.body);
    if (f.type === 'state') {
      turns = Math.max(turns, typeof b.turn === 'number' ? b.turn : 0);
      if (b.gameOver) finished = true;
    } else if (f.type === 'input') {
      input = b;
    } else if (f.type === 'over') {
      finished = true;
    } else if (f.type === 'act') {
      acts++;
      const btn = obj(input?.buttons);
      if ((b.action === 'buttonOk' || b.action === 'buttonCancel') && obj(btn.cancel).label === 'Mulligan') mulligans++;
    }
  }
  const seat = typeof h.seat === 'number' ? h.seat : -1;
  const deck = arr(h.decks).map(obj).find((d) => d.player === seat);
  return {
    gameId: String(h.gameId ?? ''),
    key: `${h.gameId}|${h.seed}|${h.startedAt}`,
    seat,
    startedAt: String(h.startedAt ?? ''),
    transport: String(h.transport ?? ''),
    acts,
    mulligans,
    turns,
    finished,
    deckPath: typeof deck?.path === 'string' ? deck.path : null,
  };
}

export type Identity = { his: true; kind: 'ai' | 'friend'; why: string } | { his: false; why: string };

/**
 * Whose seat a log is, from its header and hello_ok (the rules in the header).
 * `ownerName` is the room owner's display name; `included` the play.sh ids the
 * owner named as his.
 */
export function judgeLog(log: Log, ownerName: string, included: ReadonlySet<string>): Identity {
  const h = log.header;
  const gameId = String(h.gameId ?? '');
  const hello = obj(log.frames.find((f) => f.type === 'hello_ok')?.body);
  const seat = h.seat;
  if (!['ws', 'console'].includes(String(h.transport))) return { his: false, why: `transport ${String(h.transport)}: not a person's seat` };
  if (hello.you === undefined) return { his: false, why: 'no hello_ok' };
  if (hello.you !== seat) return { his: false, why: 'the header\'s seat is not hello_ok.you' };
  const players = arr(hello.players).map(obj);
  const me = players.find((p) => p.id === seat);
  const others = players.filter((p) => p.id !== seat);
  if (!me || me.isAi !== false) return { his: false, why: 'the viewing seat is not a person' };
  if (h.humans === 2) {
    if (!/^friend-m\d{13}$/.test(gameId)) {
      return { his: false, why: 'a table of two under an id the stage does not know' };
    }
    if (seat !== 0) return { his: false, why: 'not the room owner\'s seat (seat 0)' };
    if (h.record !== true) return { his: false, why: 'his seat\'s recording consent is not on the header (D407)' };
    if (!ownerName || me.name !== ownerName) return { his: false, why: 'seat 0 is not named as the owner: cannot be told' };
    if (others.length !== 1 || others[0]?.isAi !== false) return { his: false, why: 'a table of two whose other player is not a person' };
    return { his: true, kind: 'friend', why: 'seat 0 of a table of two (the room owner\'s, D400), recorded with his consent (D407), named as the owner' };
  }
  if (others.length === 0 || !others.every((p) => p.isAi === true)) return { his: false, why: 'the other player is not Forge\'s AI' };
  if (MATCH_ID.test(gameId)) return { his: true, kind: 'ai', why: 'a match ForgeCoach\'s launcher started (D303): the owner\'s door' };
  if (PLAY_ID.test(gameId)) {
    return included.has(gameId)
      ? { his: true, kind: 'ai', why: 'a play.sh game the owner named as his (--include-id)' }
      : { his: false, why: 'a play.sh id that scripted clients and Claude\'s own verification games also write: cannot be told' };
  }
  return { his: false, why: 'not a person\'s game id' };
}

/** The key a card name is matched by (encode.py's norm_name). */
export function normName(name: string): string {
  const s = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').split(' // ')[0] as string;
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** A .dck's [main] card names, counts ignored. */
export function mainCards(dck: string): string[] {
  const out: string[] = [];
  let sect = '';
  for (const raw of dck.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('[') && l.endsWith(']')) {
      sect = l.slice(1, -1).toLowerCase();
      continue;
    }
    if (sect !== 'main') continue;
    const m = /^(\d+)\s+(.+)$/.exec(l);
    const n = ((m ? m[2] : l) as string).split('|')[0]?.trim();
    if (n) out.push(n);
  }
  return out;
}

/** The cube holding at least 80% of the deck's non-basic main cards (human_collect.py's rule), or null. */
export function guessCube(dck: string, cubes: Record<string, string[]>): { cube: string | null; share: number | null } {
  const basics = new Set(BASICS.flatMap((b) => [normName(b), 'snow-covered ' + normName(b)]));
  const cards = new Set(mainCards(dck).map(normName).filter((n) => !basics.has(n)));
  if (cards.size === 0) return { cube: null, share: null };
  let best: string | null = null;
  let share = 0;
  for (const [id, names] of Object.entries(cubes).sort(([a], [b]) => a.localeCompare(b))) {
    const pool = new Set(names.map(normName));
    let hit = 0;
    for (const c of cards) if (pool.has(c)) hit++;
    const s = hit / cards.size;
    if (s > share) {
      best = id;
      share = s;
    }
  }
  const r = Math.round(share * 1000) / 1000;
  return best && share >= CUBE_MIN_SHARE ? { cube: best, share: r } : { cube: null, share: best ? r : null };
}

export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}
