/*
 * mtg-table — render/Mana.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Mana pips, drawn with `mana-font@1.18.0` (report 10 §13; code MIT, font SIL
 * OFL 1.1, symbols © Wizards of the Coast — see NOTICE §6). The stylesheet is
 * imported **once, in `main.tsx`**, next to `styles.css`: nothing under
 * `render/` may import CSS, because `web/test/render.test.tsx` imports this tree
 * into a `node` environment with no CSS loader (report 10 §1, §15).
 *
 * `manaCost` on the wire is Forge's brace string — `"{1}{W}"`, and **`null`**
 * for a card with no mana cost (docs/protocol.md §3.2, amendment: never `""`,
 * never Forge's `"no cost"`). Parsing is a regex over the braces and a lowercase
 * of the contents; `mana-font` already has classes for hybrid, Phyrexian, split
 * and generic symbols (`{W/U}` → `ms-wu`, `{2/W}` → `ms-2w`, `{W/P}` → `ms-wp`,
 * `{X}` → `ms-x`, `{T}` → `ms-tap`), all verified present at 1.18.0.
 *
 * The glyphs are `aria-hidden`; the raw cost travels in an `sr-only` span, so a
 * screen reader reads `{1}{W}` rather than two unpronounceable private-use
 * codepoints (report 10 §14).
 */

import { MANA_COLORS, type ManaPool } from '../protocol.ts';

/**
 * `{W/U}` → `ms-wu`. Anything outside `[a-z0-9]` is dropped, so a symbol we have
 * never seen can only ever produce a class that does not exist — a blank pip,
 * never a crash and never a broken selector. `''` means "no glyph": the caller
 * prints the brace text instead.
 */
export function manaSymbolClass(symbol: string): string {
  const cleaned = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === '' ? '' : `ms-${cleaned}`;
}

/** Split `"{1}{W}"` into `["1", "W"]`. Total: a string with no braces is `[]`. */
export function manaSymbols(cost: string): string[] {
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? '');
}

/**
 * A card's mana cost as pips. `null` is the one spelling of "no mana cost" —
 * every land, every token — and renders nothing at all.
 */
export function ManaCost({ cost, size }: { cost: string | null; size?: 'sm' | 'md' }): JSX.Element | null {
  if (cost === null || cost === '') return null;
  const symbols = manaSymbols(cost);
  if (symbols.length === 0) return null;
  return (
    <span className={`mana mana--${size ?? 'sm'}`}>
      {symbols.map((symbol, i) => {
        const cls = manaSymbolClass(symbol);
        return cls === '' ? (
          <span key={`${symbol}-${String(i)}`} className="mana__raw" aria-hidden="true">
            {symbol}
          </span>
        ) : (
          <i key={`${symbol}-${String(i)}`} className={`ms ${cls} ms-cost ms-shadow`} aria-hidden="true" />
        );
      })}
      <span className="sr-only">{cost}</span>
    </span>
  );
}

/**
 * The floating mana pool (docs/protocol.md §3.1 — all six keys always present,
 * zeros included). Zeros are drawn dim rather than dropped, so the row does not
 * reflow every time a land is tapped.
 */
export function ManaPoolPips({ pool }: { pool: ManaPool }): JSX.Element {
  const total = MANA_COLORS.reduce((sum, color) => sum + pool[color], 0);
  return (
    <span className="pool" title={`floating mana — ${MANA_COLORS.map((c) => `${c}${String(pool[c])}`).join(' ')}`}>
      {MANA_COLORS.map((color) => (
        <span key={color} className={`pool__pip${pool[color] > 0 ? ' pool__pip--on' : ''}`}>
          <i className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`} aria-hidden="true" />
          <span className="pool__n">{pool[color]}</span>
        </span>
      ))}
      <span className="sr-only">
        {total === 0
          ? 'mana pool empty'
          : `mana pool: ${MANA_COLORS.filter((c) => pool[c] > 0)
              .map((c) => `${String(pool[c])} ${c}`)
              .join(', ')}`}
      </span>
    </span>
  );
}
