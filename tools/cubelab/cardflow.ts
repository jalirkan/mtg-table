// mtg-table — the cube lab: which cards are CARD FLOW, the census's bias feature (D446 point 5).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The Synergy v3 study (pc-results/study/synergy-v3-design.md, section 1) counted 17 cards that "draw
// or filter without adding to the board" -- Opt, Consider, Brainstorm, Ponder, Thought Scour, Deep
// Analysis, Mulldrifter, Faithless Looting, Cathartic Reunion, Unexpected Windfall, Mishra's Bauble,
// Chromatic Star, Prophetic Prism, Ichor Wellspring, Candy Trail, Village Rites and Deadly Dispute --
// and found each one in a deck cost it -2.9 points [-3.7, -2.1] of win share as Forge plays it.  The
// census has 1,592 cards, so the list becomes a rule on the engine's own facts (its oracle text):
//
//   a card is card flow when it is not a land or a planeswalker, it is not a creature unless it has
//   evoke (it can be cast for its draw alone), its text draws at least one card, and every sentence of
//   its rules text -- reminder text removed, its own name read as "~", and a trigger of its own
//   entering or dying, or an activation cost of mana, {T}, sacrificing it, life or a discard, stripped
//   first -- is, clause by clause (split at ", then" and " and "), one of the ALLOWED clauses below.
//
// The study's 17 are card flow by this rule, and web/test/cubelab-shapes.test.ts holds them with
// controls that are not.  Pure: no engine, no file system.

import type { Fact } from './cards.ts';

const NUM = '(?:a|an|one|two|three|four|five|six|seven|x|that many|\\d+)';

/** Whole sentences allowed as they are (costs and keyword lines). */
const SENTENCES: RegExp[] = [
  /^as an additional cost to cast (?:this spell|~), (?:sacrifice|discard|pay|exile|return|tap) .*$/,
  /rather than pay (?:this spell's|~'s) mana cost$/,
  /^(?:flashback|evoke|delve|buyback|retrace|jump-start|\w*cycling)\b.*$/,
];

/** On an evoke creature only: a line of evergreen keywords (Mulldrifter's Flying). */
const KEYWORDS = /^(?:flying|vigilance|reach|haste|lifelink|deathtouch|first strike|trample|menace|defender)(?:, (?:flying|vigilance|reach|haste|lifelink|deathtouch|first strike|trample|menace|defender))*$/;

/** One clause of a sentence; the first group is the draws. */
const DRAWS: RegExp[] = [
  new RegExp(`^(?:you |target player |each player |that player )?(?:may )?draws? ${NUM}(?: additional)? cards?(?: at the beginning of the next turn's upkeep)?$`),
];
const CLAUSES: RegExp[] = [
  new RegExp(`^(?:you |target player |each player )?(?:may )?discards? (?:${NUM} cards?|their hand|your hand)(?: unless you attacked this turn)?$`),
  /^(?:each player |target player )?shuffles their hand\+graveyard into their library$/,
  /^investigate$/,
  /^add (?:one mana of any colou?r|two mana in any combination of colou?rs)$/,
  /^(?:you )?untap up to \w+ lands$/,
  /^look at a card at random in target (?:player's|opponent's) hand$/,
  /^put ~ on top of its owner's library$/,
  new RegExp(`^put ${NUM} cards? from your hand on top of your library(?: in any order)?$`),
  /^(?:scry|surveil) (?:\d+|x)$/,
  new RegExp(`^(?:target player |each player |you )?mills? ${NUM} cards?$`),
  new RegExp(`^look at the top (?:card|${NUM} cards) of (?:your|target player's|target opponent's) library$`),
  /^look at (?:target player's|target opponent's|an opponent's) hand$/,
  new RegExp(`^reveal the top (?:card|${NUM} cards) of your library$`),
  /^put (?:them|those cards) back in any order$/,
  /^you may shuffle(?: your library)?$/,
  /^you may put (?:that card|it|them) into your graveyard$/,
  new RegExp(`^put ${NUM} of (?:them|those cards) into your hand$`),
  /^(?:put )?the rest (?:on the bottom of your library|into your graveyard)(?: in (?:any|a random) order)?$/,
  new RegExp(`^create ${NUM} (?:tapped )?(?:treasure|clue|food) tokens?$`),
  /^(?:you |target player |that player )?(?:gain|gains|lose|loses) \d+ life$/,
  /^pay \d+ life$/,
];

/** The card's own trigger, or an activation cost of mana, {T}, sacrificing it, life or a discard. */
const PREFIXES: RegExp[] = [
  /^when ~ (?:enters|dies|is put into a graveyard from the battlefield|enters or is put into a graveyard from the battlefield|enters the battlefield)(?: or is put into a graveyard from the battlefield)?, /,
  /^(?:(?:\{[^}]+\}|sacrifice ~|pay \d+ life|discard a card)(?:, )?)+: /,
  /^if you do, /,
];

/** The card's rules text as sentences: reminder text out, its name as ~, lower case. */
export function flowSentences(name: string, oracle: string): string[] {
  let t = oracle.replace(/\\n/g, '\n').replace(/\([^)]*\)/g, '');
  const names = [name, ...name.split(/, | \/\/ /).slice(0, 1)].filter((n) => n.length > 0);
  for (const n of names) t = t.split(n).join('~');
  t = t.toLowerCase().replace(/\bthis (?:spell|card|creature|artifact|enchantment)\b/g, '~').replace(/\bhand and graveyard\b/g, 'hand+graveyard');
  const out: string[] = [];
  for (const line of t.split('\n')) {
    for (const raw of line.split(/(?<=\.)\s+/)) {
      const s = raw.trim().replace(/\.$/, '').trim();
      if (s) out.push(s);
    }
  }
  return out;
}

/** Card flow, by the rule above (D446 point 5). */
export function isCardFlow(f: Pick<Fact, 'name' | 'oracle' | 'land' | 'planeswalker' | 'creature' | 'type'>): boolean {
  if (f.land || f.planeswalker) return false;
  if (/\b(?:Land|Planeswalker|Battle)\b/.test(f.type ?? '')) return false;
  const sentences = flowSentences(f.name ?? '', f.oracle ?? '');
  if (sentences.length === 0) return false;
  const evoke = sentences.some((s) => /^evoke\b/.test(s));
  if (f.creature && !evoke) return false;
  let draws = false;
  for (let s of sentences) {
    if (SENTENCES.some((re) => re.test(s))) continue;
    if (f.creature && evoke && KEYWORDS.test(s)) continue;
    for (const p of PREFIXES) s = s.replace(p, '');
    for (const c of s.split(/,? then |,? and /).map((x) => x.trim().replace(/^then /, '')).filter(Boolean)) {
      if (DRAWS.some((re) => re.test(c))) { draws = true; continue; }
      if (CLAUSES.some((re) => re.test(c))) continue;
      return false;
    }
  }
  return draws;
}
