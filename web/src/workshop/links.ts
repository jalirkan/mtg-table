/*
 * mtg-table — workshop/links.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The two links between the card browser and the workshop, and how the
 * workshop reads its own URL.**
 *
 *  - `#cards` → `#workshop?card=<exact name>`: the browser's detail panel has a
 *    *View in 3D* button, live only for a card the workshop's catalog can show —
 *    a creature or a Vehicle (a body on the pedestal), or another card with its
 *    own `cues.json` entry — and grey, with a tooltip saying why, for anything
 *    else ({@link threeDLinkFor}, over `catalog.json`'s generated `threeD`).
 *  - `#workshop` → `#cards?open=<scryfall id>`: the workshop's *card text* link,
 *    shown when `art.json` has the card's Scryfall id ({@link cardsHref}). No
 *    request is made to find out whether the local library holds it: the browser
 *    opens the id or says it has no library.
 *  - {@link cardFromLocation}: `card` from the hash's query (`#workshop?card=…`,
 *    how the browser keeps its own state — `#cards?open=…`), else the page's
 *    (`?view=workshop&card=…`, `/?card=peggy#workshop`).
 *
 * **This is the one workshop module the card browser may import** (D94, D102):
 * `web/src/cards/` reaches no arena, render or workshop page code, so this file
 * imports nothing but the generated `catalog.json` (and a type), and the
 * browser's lazy chunk carries the catalog's names and nothing that draws.
 * `[NO three]`, `[NO React]`, no clock; `workshop.test.ts` and `cards-ui.test.ts`
 * hold all of that.
 */

import catalogJson from './catalog.json' with { type: 'json' };
import type { CatalogFile, ThreeD } from './catalogBuild.ts';

const CATALOG = catalogJson as unknown as CatalogFile;

/** The query key both spellings of the workshop's deep link use. */
export const CARD_PARAM = 'card';

/** `#workshop?card=<name>` — the workshop opened on exactly this catalog name. */
export function workshopHref(name: string): string {
  return `#workshop?${new URLSearchParams({ [CARD_PARAM]: name }).toString()}`;
}

/** `#cards?open=<scryfall id>` — the card browser's own deep link (its detail panel, opened). */
export function cardsHref(scryfallId: string): string {
  return `#cards?${new URLSearchParams({ open: scryfallId }).toString()}`;
}

/**
 * The card the workshop was asked to open: `card` from the hash's query when the
 * hash has one (`#workshop?card=…` — the card browser's rule for its own state,
 * `CardBrowser.tsx`'s `stateQueryOf`), else from the page's query. `null` when
 * neither says, or says nothing but blanks. Total: a malformed query is none.
 */
export function cardFromLocation(hash: string, search: string): string | null {
  const q = hash.indexOf('?');
  const query = q >= 0 ? hash.slice(q + 1) : search.replace(/^\?/, '');
  try {
    const card = new URLSearchParams(query).get(CARD_PARAM);
    return card === null || card.trim() === '' ? null : card;
  } catch {
    return null;
  }
}

/** What a library card is called, in every spelling the catalog might list it under. */
export interface LibraryNames {
  name: string;
  /** Each face's name — a double-faced card is `A // B` in the library and `A` in a deck. */
  faceNames: readonly string[];
  typeLine: string;
}

/**
 * The catalog's name for a library card, or `null`: the name itself, then each
 * face's, then — for a token (Scryfall's `Hero`, type line `Token Creature — Hero`)
 * — the corpus's spelling, `Hero Token`. Exact matches only: the workshop must
 * open on the card the button named.
 */
export function catalogNameFor(card: LibraryNames, catalog: CatalogFile = CATALOG): string | null {
  const known = (name: string): boolean => Object.prototype.hasOwnProperty.call(catalog.threeD, name);
  const candidates = [card.name, ...card.faceNames];
  if (/(^|\s)Token(\s|$)/.test(card.typeLine)) candidates.push(`${card.name} Token`);
  return candidates.find(known) ?? null;
}

export interface ThreeDLink {
  /** The catalog name the workshop would open on, or `null` when it lists no such card. */
  name: string | null;
  /** `#workshop?card=…` when there is something of the card's own to show; else `null` (the button is grey). */
  href: string | null;
  /** What `figure` / `cues` / `null` said — `null` also when the catalog lists no such card. */
  kind: ThreeD;
  /** The tooltip: what the button opens, or why it is grey. */
  title: string;
}

/**
 * **The card browser's *View in 3D* button**, decided from `catalog.json`'s
 * `threeD` alone (no arena import, no request): live for a creature or a Vehicle
 * and for any other card with its own `cues.json` entry; grey, with the reason, for
 * a card the workshop lists with nothing of its own to show, and for a card it
 * does not list at all.
 */
export function threeDLinkFor(card: LibraryNames, catalog: CatalogFile = CATALOG): ThreeDLink {
  const name = catalogNameFor(card, catalog);
  if (name === null) {
    return {
      name: null,
      href: null,
      kind: null,
      title:
        'Not in the workshop: it shows the cards of the decks under decks/ and the tokens the recorded games have seen.',
    };
  }
  const kind = catalog.threeD[name] ?? null;
  if (kind === 'figure') {
    return {
      name,
      href: workshopHref(name),
      kind,
      title: `Open ${name} in the workshop — its figure on the pedestal: clips, cues, tuning and legibility.`,
    };
  }
  if (kind === 'cues') {
    return {
      name,
      href: workshopHref(name),
      kind,
      title: `Open ${name} in the workshop — its own cues (cues.json), rehearsed on the pedestal.`,
    };
  }
  const types = catalog.cards[name]?.types ?? '';
  return {
    name,
    href: null,
    kind: null,
    title:
      `The workshop lists ${name}, but it has nothing of its own to show in 3D — no body and no cues.json entry, ` +
      `only the defaults every ${types === '' ? 'card of its kind' : types} shares.`,
  };
}
