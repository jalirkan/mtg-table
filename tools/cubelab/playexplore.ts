// mtg-table — the cube lab: play exploration, a share of drafts whose games explore (D358).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every queue game is Forge's AI against Forge's AI, and its habits are
// deterministic, so the positions the games record -- the learned position
// evaluator's training data (D305, D315, D316) -- follow Forge's well-worn
// paths.  Play exploration spends a share of the drafts on games that leave
// those paths a little:
//
//   1. A draft EXPLORES with probability `share`, drawn from its own stream
//      rng(seed, 'play-explore'): a pure function of the seed (any --jobs, any
//      machine, a resumed run), and no other stream moves (the draft, the
//      picks, the decks, D347's profile mix and D356's deck exploration are
//      what they would be without it).
//   2. In an exploring draft both seats of every game explore (mtgtable.ai.Explorer,
//      after Forge has answered): each decision of an explorable kind -- what to
//      play with a priority, the attack, the blocks, a single target -- is
//      replaced with probability `epsilon` by a uniformly random LEGAL answer;
//      where Forge chose a creature by its own score and the nearest legal rival
//      is within `closeCall` (relative), a fair coin picks between them; with
//      `opening` on, who plays first is a fair coin and the seven-card mulligan
//      decision explores too.  The Java side seeds every draw from (draft seed,
//      game, seat).
//
// HOW IT IS READ.  drafts.jsonl tags an exploring draft (`playExplore`: its
// settings) and its game rows (`playExplore`: what was randomised).  Win
// rates -- report, meta, learn, the queue's coverage, tools/ml/matchup*.py --
// leave exploring drafts OUT by default: a random move is not the deck's
// strength.  The position dataset (tools/ml/dataset.py) keeps them (an
// outcome after a random move is still a true outcome; `--play-explore
// include|exclude|only`), and the policy dataset (policy_data.py) drops every
// randomised decision (it is not the seat's choice).
//
// Pure: no engine, no file system.

import { rng } from './rng.ts';

export interface PlayExploreOptions {
  /** Share of drafts whose games explore, 0..1 (0 = off). */
  share: number;
  /** Per explorable decision, the probability of a uniformly random legal answer. */
  epsilon: number;
  /** Relative margin on Forge's creature score under which Forge's choice and its nearest rival are a coin flip; 0 = off. */
  closeCall: number;
  /** Play/draw by a coin and the seven-card mulligan explorable. */
  opening: boolean;
}

/** What `--play-explore on` means, and the values a partial `name=value` list starts from. */
export const PLAY_EXPLORE_DEFAULTS: PlayExploreOptions = { share: 0.15, epsilon: 0.05, closeCall: 0.02, opening: false };

/** What a match line and a draft line carry: the settings without the share (the draft is exploring). */
export interface PlayExploreTag { epsilon: number; closeCall: number; opening: boolean }

/** A game row's counts (CubeLab.java's exploreRow): both seats summed. */
export interface PlayExploreGame {
  decisionsRandomised: number;
  changed: number;
  closeCalls: number;
  closeCallsChanged: number;
  coins: number;
  failures: number;
  byKind: Record<string, number>;
  /** With `opening` on: who the coin put on the play. */
  onPlayDrawn?: 'A' | 'B';
}

const KEYS: Record<string, keyof PlayExploreOptions> = { share: 'share', epsilon: 'epsilon', eps: 'epsilon', closecall: 'closeCall', cc: 'closeCall', opening: 'opening' };

/**
 * `--play-explore` values: `on`, or `name=value` (repeatable, or comma-separated in one):
 * share, epsilon (eps), closecall (cc), opening (on|off).  Returns null when none is given.
 */
export function parsePlayExploreArgs(args: string[]): PlayExploreOptions | null {
  if (args.length === 0) return null;
  const out: PlayExploreOptions = { ...PLAY_EXPLORE_DEFAULTS };
  for (const a of args.flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean)) {
    if (a === 'on') continue;
    const m = /^([A-Za-z]+)=(.+)$/.exec(a);
    if (!m) throw new Error(`--play-explore wants on or name=value, got "${a}"`);
    const k = KEYS[(m[1] as string).toLowerCase()];
    if (!k) throw new Error(`--play-explore: unknown ${m[1]} (known: share, epsilon, closecall, opening)`);
    const v = m[2] as string;
    if (k === 'opening') {
      if (v !== 'on' && v !== 'off') throw new Error(`--play-explore opening is on or off, got ${v}`);
      out.opening = v === 'on';
    } else {
      out[k] = Number(v);
    }
  }
  checkPlayExplore(out);
  return out;
}

export function checkPlayExplore(o: PlayExploreOptions): void {
  if (!(o.share > 0 && o.share <= 1)) throw new Error(`--play-explore share must be in (0, 1], got ${o.share}`);
  if (!(o.epsilon >= 0 && o.epsilon <= 1)) throw new Error(`--play-explore epsilon must be in [0, 1], got ${o.epsilon}`);
  if (!(o.closeCall >= 0 && o.closeCall < 1)) throw new Error(`--play-explore closecall must be in [0, 1), got ${o.closeCall}`);
  if (o.epsilon === 0 && o.closeCall === 0 && !o.opening) throw new Error('--play-explore with epsilon 0, closecall 0 and opening off explores nothing');
}

/** Whether the draft at `seed` explores: a pure function of the seed and the share. */
export function draftExplores(seed: number, share: number): boolean {
  return share > 0 && rng(seed, 'play-explore').next() < share;
}

/** The tag an exploring draft's match line and drafts.jsonl line carry. */
export function playExploreTag(o: PlayExploreOptions): PlayExploreTag {
  return { epsilon: o.epsilon, closeCall: o.closeCall, opening: o.opening };
}

/** `share=0.15,epsilon=0.05,closecall=0.02,opening=off`: the form the flag takes, for a printed command. */
export function playExploreText(o: PlayExploreOptions): string {
  return `share=${o.share},epsilon=${o.epsilon},closecall=${o.closeCall},opening=${o.opening ? 'on' : 'off'}`;
}

/** A drafts.jsonl line explored its games (D358). Readers of win rates leave these out by default. */
export function isPlayExplored(rec: { playExplore?: unknown }): boolean {
  return rec.playExplore !== undefined && rec.playExplore !== null;
}

/**
 * The win-rate readers' filter: `exclude` (the default) drops exploring drafts, `only` keeps them alone,
 * `include` keeps everything.  Returns the kept lines and how many were dropped.
 */
export function filterPlayExplore<T extends { playExplore?: unknown }>(recs: T[], mode: 'include' | 'exclude' | 'only' = 'exclude'): { recs: T[]; dropped: number } {
  if (mode === 'include') return { recs, dropped: 0 };
  const kept = recs.filter((r) => isPlayExplored(r) === (mode === 'only'));
  return { recs: kept, dropped: recs.length - kept.length };
}
