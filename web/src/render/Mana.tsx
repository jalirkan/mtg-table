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

import { MANA_COLORS, type ManaColor, type ManaPool } from '../protocol.ts';
import { manaPipAct, poolTotal, spendableColors } from './pool.ts';

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
 *
 * **M5: a pip with mana under it is a button** (`PLAN.md`: *"`useMana` — this is
 * the one real dead end, and it goes first"*). `onSpend` is the seat's own
 * `act: useMana {color}`; without it — a replay, the opponent's rail, an
 * outstanding ask — the pips are the read-only M4 row, which is what they have
 * always been.
 *
 * The act carries **a colour and nothing else** (§2.2): tapping a land for mana
 * is a `clickCard` on the land. The mapping from a pip to an act is
 * {@link manaPipAct}, which is pure and unit-tested, so the only thing here is
 * the markup.
 */
export function ManaPoolPips({
  pool,
  onSpend = null,
  provisional = false,
}: {
  pool: ManaPool;
  /** `null` → the read-only pips. Non-null → this seat may spend, right now. */
  onSpend?: ((color: ManaColor) => void) | null;
  /**
   * **M5 review: the counts are stale and we know it.** A `useMana` that
   * actually pays part of a cost produces no `state` frame — measured in the
   * payment for A.I.M. Scientists' landcycling, where the act took
   * `Pay Mana Cost: {2}` to `{1}` and Forge pushed only `input` frames after it,
   * so the last snapshot still said `manaPool {U:1}` and the pip went on
   * rendering a live button with the count 1 over an empty pool.
   *
   * Between sending a `useMana` and the next `state`, the pips are drawn
   * **dimmed with the count hidden**: still clickable, because paying `{2}` with
   * two blue mana is two clicks and the second one is real, but no longer
   * claiming a number the wire has not confirmed. The honest alternative is a
   * snapshot from the bridge after an applied `useMana`; that is a game-thread
   * change (hard rule 3) and an M6 row.
   */
  provisional?: boolean;
}): JSX.Element {
  const total = poolTotal(pool);
  const spendable = spendableColors(pool);
  return (
    <span
      className={`pool${onSpend !== null && spendable.length > 0 ? ' pool--live' : ''}${provisional ? ' pool--provisional' : ''}`}
      title={
        provisional
          ? 'floating mana — waiting for the next snapshot; the engine sends no `state` for a mana payment (§2.2, M30)'
          : `floating mana — ${MANA_COLORS.map((c) => `${c}${String(pool[c])}`).join(' ')}`
      }
      data-provisional={provisional ? 'true' : 'false'}
    >
      {MANA_COLORS.map((color) => {
        const n = pool[color];
        const live = onSpend !== null && n > 0;
        const glyph = <i className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`} aria-hidden="true" />;
        // A count the wire has not confirmed is not printed. `·` is not a
        // number: "a hint that lies is worse than no hint" (report 10 §5).
        const shown = provisional ? '·' : String(n);
        const className =
          `pool__pip${n > 0 ? ' pool__pip--on' : ''}${live ? ' pool__pip--live' : ''}` +
          `${provisional ? ' pool__pip--provisional' : ''}`;
        if (!live) {
          return (
            <span key={color} className={className}>
              {glyph}
              <span className="pool__n">{shown}</span>
            </span>
          );
        }
        return (
          <button
            key={color}
            type="button"
            className={className}
            data-act="useMana"
            data-mana={color}
            aria-label={
              provisional
                ? `spend one ${color} — count unconfirmed`
                : `spend one ${color} — ${String(n)} floating`
            }
            title={
              `act: useMana ${color} — spend one floating ${color} (key ${color}). ` +
              `The engine accepts it only during a mana payment (§2.2, M30); at any other ` +
              `time it is silently dropped.` +
              (provisional ? ' The count is unconfirmed until the next snapshot.' : '')
            }
            onClick={() => {
              // Pure, and the same function the keyboard goes through.
              const act = manaPipAct(pool, color);
              if (act !== null) onSpend(act.color);
            }}
          >
            {glyph}
            <span className="pool__n">{shown}</span>
            <span className="pool__key" aria-hidden="true">
              {color}
            </span>
          </button>
        );
      })}
      <span className="sr-only">
        {provisional
          ? 'mana pool: unconfirmed — waiting for the next snapshot'
          : total === 0
            ? 'mana pool empty'
            : `mana pool: ${spendable.map((c) => `${String(pool[c])} ${c}`).join(', ')}`}
        {onSpend !== null && total > 0 ? ' — click a pip or press its letter to spend one' : ''}
      </span>
    </span>
  );
}
