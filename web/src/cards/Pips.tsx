/*
 * mtg-table — cards/Pips.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Mana symbols as `mana-font` pips — a cost (`{1}{W}`) and rules text with its
 * symbols inline (`{T}: Put a +1/+1 counter…`). The glyph classes come from
 * `text.ts`'s `pipClass`; the stylesheet is the app's one (`main.tsx` imports
 * `mana.css` and `styles.css`), so nothing here imports CSS.
 *
 * Glyphs are `aria-hidden`; the braces travel in an `sr-only` span, so a screen
 * reader reads `{1}{W}` rather than private-use codepoints (the board's rule,
 * report 10 §14).
 */

import { costSymbols, paragraphsOf, pipClass, segmentParagraph } from './text.ts';

function Pip({ symbol, size }: { symbol: string; size: 'sm' | 'md' | 'inline' }): JSX.Element {
  const cls = pipClass(symbol);
  if (cls === '') return <span className="cardlib-pip--raw">{`{${symbol}}`}</span>;
  return <i className={`ms ${cls} ms-cost ms-shadow cardlib-pip cardlib-pip--${size}`} aria-hidden="true" />;
}

/** A mana cost; `null` (a land, most tokens) draws nothing. */
export function Pips({ cost, size = 'sm' }: { cost: string | null; size?: 'sm' | 'md' }): JSX.Element | null {
  const symbols = costSymbols(cost);
  if (cost === null || symbols.length === 0) return null;
  return (
    <span className={`cardlib-cost cardlib-cost--${size}`} data-cost={cost}>
      {symbols.map((symbol, i) => (
        <Pip key={`${symbol}-${String(i)}`} symbol={symbol} size={size} />
      ))}
      <span className="sr-only">{cost}</span>
    </span>
  );
}

/** Rules text: one `<p>` per ability, symbols as pips, reminder text in italics. */
export function RulesText({ text, className }: { text: string; className?: string }): JSX.Element | null {
  const paragraphs = paragraphsOf(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className={className ?? 'cardlib-rules'}>
      {paragraphs.map((paragraph, p) => (
        <p key={String(p)}>
          {segmentParagraph(paragraph).map((segment, i) => {
            const key = String(i);
            if (segment.kind === 'symbol') {
              const pip = (
                <>
                  <Pip symbol={segment.symbol} size="inline" />
                  <span className="sr-only">{`{${segment.symbol}}`}</span>
                </>
              );
              return segment.reminder ? (
                <em key={key} className="cardlib-reminder">
                  {pip}
                </em>
              ) : (
                <span key={key}>{pip}</span>
              );
            }
            return segment.reminder ? (
              <em key={key} className="cardlib-reminder">
                {segment.text}
              </em>
            ) : (
              <span key={key}>{segment.text}</span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
