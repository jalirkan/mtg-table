/*
 * mtg-table — cards/CardDetail.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The card browser's detail panel: the card whole, then everything the image
 * says as text — cost as pips, type line, rules text (symbols inline), P/T, set
 * and collector number, artist and copyright, legalities — plus the two things
 * the image cannot say: which of the repo's decks it is in, and the `.dck` line
 * that would put it in one.
 *
 * Scryfall's image terms want the artist and the copyright "elsewhere in the
 * same interface" whenever art is cropped; the browser never crops, and prints
 * both here anyway (NOTICE §2).
 *
 * **View in 3D** opens the card in the workshop (`#workshop?card=<exact name>`,
 * D102) — live only for a card the workshop's catalog can show: a creature or a
 * Vehicle, or another card with its own `cues.json` entry. Anything else draws the
 * button greyed, with the reason as its tooltip. The answer is
 * `workshop/links.ts`'s, over the workshop's generated catalog: the one workshop
 * module this directory imports, and it imports no arena and nothing that draws.
 */

import { useEffect, useState } from 'react';

import { threeDLinkFor } from '../workshop/links.ts';
import { CardView } from './CardView.tsx';
import { dckLine, dckLineNote, deckUseLabel, deckUsesOf, type DeckIndex } from './decks.ts';
import type { LibraryCard, LibraryFace } from './model.ts';
import { Pips, RulesText } from './Pips.tsx';
import { copyrightLine, legalityLabel, legalityRows, printLabel, statLine } from './text.ts';

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the selection path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function CopyLine({ line, note = null }: { line: string; note?: string | null }): JSX.Element {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');
  useEffect(() => {
    setCopied('idle');
  }, [line]);
  return (
    <div className="cardlib-copy">
      <code className="cardlib-copy__line">{line}</code>
      <button
        type="button"
        className="btn btn--small cardlib-copy__btn"
        onClick={() => {
          void copyText(line).then((ok) => {
            setCopied(ok ? 'ok' : 'failed');
          });
        }}
      >
        copy .dck line
      </button>
      <span className="cardlib-copy__status" role="status">
        {copied === 'ok' ? 'copied' : copied === 'failed' ? 'copy failed — select the line' : ''}
      </span>
      {note !== null && <p className="cardlib-copy__note muted">{note}</p>}
    </div>
  );
}

function FaceBlock({ face }: { face: LibraryFace }): JSX.Element {
  const stats = statLine(face);
  return (
    <section className="cardlib-face">
      <h3 className="cardlib-face__name">
        {face.name} <Pips cost={face.manaCost} size="md" />
      </h3>
      <div className="cardlib-detail__type">{face.typeLine}</div>
      <RulesText text={face.oracleText} />
      {face.flavorText !== null && <p className="cardlib-flavor">{face.flavorText}</p>}
      {stats !== null && <div className="cardlib-detail__stats">{stats}</div>}
    </section>
  );
}

/**
 * The card's prints, as buttons: the open one pressed. A print that is only the
 * bulk file's representative of a set the library never synced is listed like
 * any other — the image ladder handles its art the same way.
 */
function PrintsRow({
  card,
  prints,
  onPick,
}: {
  card: LibraryCard;
  prints: readonly LibraryCard[];
  onPick: (print: LibraryCard) => void;
}): JSX.Element | null {
  if (prints.length < 2) return null;
  return (
    <section className="cardlib-prints" aria-label="Prints">
      <h3>Prints ({prints.length})</h3>
      <ul>
        {prints.map((print) => (
          <li key={print.id}>
            <button
              type="button"
              className={`btn btn--small${print.id === card.id ? ' btn--on' : ''}`}
              aria-pressed={print.id === card.id}
              title={`${print.setName ?? print.set.toUpperCase()} #${print.collectorNumber} — ${print.artist ?? 'unknown artist'}`}
              onClick={() => onPick(print)}
            >
              {`${print.set.toUpperCase()} #${print.collectorNumber}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * **View in 3D** — the workshop's pedestal for this card, when the workshop has
 * something of the card's own to show; otherwise a greyed button whose tooltip
 * says why (`aria-disabled`, not `disabled`, so the tooltip still shows and the
 * reason is still read out).
 */
export function ViewIn3D({ card }: { card: LibraryCard }): JSX.Element {
  const link = threeDLinkFor({ name: card.name, faceNames: card.faces.map((face) => face.name), typeLine: card.typeLine });
  if (link.href !== null) {
    return (
      <a className="btn btn--small btn--primary cardlib-3d" href={link.href} title={link.title}>
        ⚒ View in 3D
      </a>
    );
  }
  return (
    <button
      type="button"
      className="btn btn--small btn--future cardlib-3d cardlib-3d--off"
      aria-disabled="true"
      title={link.title}
      aria-label={`View in 3D — unavailable: ${link.title}`}
    >
      ⚒ View in 3D
    </button>
  );
}

export function CardDetail({
  card,
  decks,
  onClose,
  prints = [],
  onPickPrint,
}: {
  card: LibraryCard;
  decks: DeckIndex;
  onClose: () => void;
  prints?: readonly LibraryCard[];
  onPickPrint?: (print: LibraryCard) => void;
}): JSX.Element {
  const uses = deckUsesOf(decks, card);
  const stats = statLine(card);
  const hasBack = card.imageRemoteBack !== null || card.imageLocalBack !== null;
  const facesTextOnly = card.faces.length > 1;

  return (
    <article className="cardlib-detail" aria-label={`${card.name} — details`}>
      <header className="cardlib-detail__bar">
        <button type="button" className="btn btn--small" onClick={onClose} title="Close (Esc)">
          ✕ close
        </button>
        <span className="cardlib-detail__links">
          <ViewIn3D card={card} />
          {card.scryfallUri !== null && (
            <a className="cardlib-detail__ext" href={card.scryfallUri} target="_blank" rel="noreferrer noopener">
              on Scryfall ↗
            </a>
          )}
        </span>
      </header>

      <div className="cardlib-detail__images">
        <CardView key={`${card.id}-front`} card={card} variant="detail" />
        {hasBack && <CardView key={`${card.id}-back`} card={card} variant="detail" side="back" />}
      </div>

      <h2 className="cardlib-detail__name">
        <span>{card.name}</span> <Pips cost={card.manaCost} size="md" />
      </h2>

      {facesTextOnly ? (
        card.faces.map((face) => <FaceBlock key={face.name} face={face} />)
      ) : (
        <>
          <div className="cardlib-detail__type">{card.typeLine}</div>
          <RulesText text={card.oracleText} />
          {card.flavorText !== null && <p className="cardlib-flavor">{card.flavorText}</p>}
          {stats !== null && (
            <div className="cardlib-detail__stats" aria-label="power and toughness">
              {stats}
            </div>
          )}
        </>
      )}

      <dl className="cardlib-facts">
        <dt>Set</dt>
        <dd>
          {card.setName ?? card.set.toUpperCase()} · {printLabel(card)}
        </dd>
        <dt>Artist</dt>
        <dd>{card.artist ?? 'unknown'}</dd>
        <dt>©</dt>
        <dd>{copyrightLine(card)}</dd>
        <dt>Decks</dt>
        <dd>
          {uses.length === 0 ? (
            <span className="muted">in no deck under decks/</span>
          ) : (
            <ul className="cardlib-decks">
              {uses.map((use) => (
                <li key={`${use.file}-${use.section}`}>{deckUseLabel(use)}</li>
              ))}
            </ul>
          )}
        </dd>
      </dl>

      <CopyLine line={dckLine(card, 1)} note={dckLineNote(card)} />

      {onPickPrint !== undefined && <PrintsRow card={card} prints={prints} onPick={onPickPrint} />}

      <section className="cardlib-legal" aria-label="Legalities">
        <h3>Legalities</h3>
        <ul>
          {legalityRows(card.legalities).map((row) => (
            <li key={row.format} className={`cardlib-legal__row cardlib-legal--${row.status}`}>
              <span className="cardlib-legal__format">{row.label}</span>
              <span className="cardlib-legal__status">{legalityLabel(row.status)}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
