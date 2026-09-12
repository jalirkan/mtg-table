/*
 * mtg-table — render/CardTile.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE card renderer** (report 10 §4). Every card anywhere on the board goes
 * through this one component — battlefield, hand, graveyard strip, stack panel,
 * the focus thumbnail in the decision panel — which is the rendering half of
 * hard rule 8's "exactly one card-serialisation function".
 *
 * The rules that are not negotiable, each with a failure behind it:
 *
 *   - **A concealed card gets a CSS card back with no name in the DOM, no
 *     `title`, no `alt` and no `aria-label` that names it** (report 10 §18.1,
 *     §14 rule 2). Redaction extends to the accessibility tree; a leak through
 *     `aria-label` is a leak. `data-card-name` is emitted **only** for a card
 *     whose identity this frame already made public, and
 *     `web/test/render.test.tsx` asserts the set of them is a subset of the
 *     non-hidden names in that same frame — which is what catches a renderer
 *     that remembered a name for an id whose latest serialisation is
 *     `hidden: true` (report 06 §0.6).
 *   - **The tile is a `<button>` for every card with a real id** (amendment M8,
 *     report 10 §5.1 row 4). `selectable` decides the *outline*, never the
 *     element: it is the explicit selection set and is empty for the whole of
 *     your own main phase, so a tile that is only clickable when selectable
 *     cannot play a land. Forge is the judge; a click it will not take comes
 *     back as `notice {title: "Not selectable"}`.
 *   - **A missing image is cosmetic.** The generated text frame is rendered
 *     *underneath* the `<img>` and the click handler is on the button, which
 *     exists before any network call. A 404, a slow CDN, a blocked request and a
 *     fresh checkout with no `art.json` all render the same text card and none of
 *     them changes the layout or blocks a click (report 10 §18.10).
 *   - **Overlays live on `.tile`, not inside `.tile__face`** (report 10 §4.3),
 *     because the face is what rotates 90° when the card is tapped and a P/T
 *     pill that rotated with it is the single most common way this goes wrong.
 *   - **`damage` is its own chip and is never subtracted from `toughness`** —
 *     that subtraction is a rules computation (report 10 §4.5).
 *   - A face-down card the viewer **may** look at (`alt`, amendment P3, emitted
 *     only under `canFaceDownBeShownTo`) draws the back the table sees plus a
 *     marked "you may look" ribbon. The table sees a 2/2 with no name; only this
 *     seat sees what it is, and the tile says which is which.
 */

import { useState } from 'react';

import { artEntryFor, imageUrl, type ArtIndex, type ImgSize } from '../art.ts';
import {
  altFace,
  isHidden,
  type AnyCard,
  type Card,
  type InputBody,
} from '../protocol.ts';
import { counterLabel, tileAriaLabel } from './labels.ts';
import { ManaCost } from './Mana.tsx';
import { cardKey, useRects } from './rects.ts';

/** What a tile may do when clicked, or `null` for "nothing, and say so". */
export interface Clicks {
  card: (cardId: number) => void;
  player: (playerId: number) => void;
}

/** Which row this tile is in — the CSS variables, and which image variant. */
export type TileKind = 'bf' | 'land' | 'hand' | 'strip' | 'stack' | 'zoom';

const IMAGE_SIZE: Record<TileKind, ImgSize> = {
  bf: 'grid',
  land: 'grid',
  hand: 'grid',
  strip: 'thumb',
  stack: 'thumb',
  // The one place the extra pixels are visible, and still fewer bytes than the
  // `normal` JPG it replaces (report 10 §0, §4.2).
  zoom: 'display',
};

/**
 * URLs whose `<img>` fired `onError`, module-level so the failure is permanent
 * and cheap (report 10 §4.2). Never retried: a retry loop against a CDN that is
 * answering 404 is a self-inflicted rate limit.
 */
const failedImages = new Set<string>();

export interface CardTileProps {
  card: AnyCard;
  kind: TileKind;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  /** Position in its row — the shingling z-index (report 10 §2.3). */
  index?: number;
  /** `true` when the viewer controls it: the 3 px stripe colour (§4.5). */
  mine?: boolean;
  /** Which way the hover/focus zoom opens, or `none` for a tile too small to matter. */
  zoom?: 'up' | 'down' | 'none';
  /** Auras and Equipment hoisted out of their own row into their host's tile (§4.4). */
  attachments?: AnyCard[];
  /** One extra line of combat text ("blocks #14"), already resolved by the caller. */
  note?: string | null;
  /**
   * Is this tile **the** place this card is on the board, for the arrows
   * overlay (report 10 §9.1)?
   *
   * A card can legitimately be drawn more than once in one frame — the stack
   * panel's thumbnail of a spell whose source is also a permanent, the decision
   * panel's focus thumbnail, the `Z` zoom. Exactly one of those may own the
   * `c:<id>` rect, or an attack arrow would end in the left rail. The row tiles
   * own it; every secondary copy passes `anchor={false}`.
   */
  anchor?: boolean;
}

export function CardTile({
  card,
  kind,
  input,
  art,
  clicks,
  index = 0,
  mine = false,
  zoom = 'none',
  attachments = [],
  note = null,
  anchor = true,
}: CardTileProps): JSX.Element {
  const rects = useRects();
  const registerRect = anchor ? rects.register(cardKey(card.id)) : undefined;

  // The engine's answer, echoed. The client computes no legality (§9 invariant 8).
  const selectable =
    input !== null && input.selectable.mode === 'cards' && input.selectable.cardIds.includes(card.id);
  const highlighted = input !== null && input.highlighted.includes(card.id);
  const focused = input !== null && input.focusCardId === card.id;
  const weak = input !== null && input.weak.includes(card.id);

  const full: Card | null = isHidden(card) ? null : card;
  const concealed = full === null;
  // A redacted stub is five keys and `tapped` is not one of them (§3.3); the
  // legacy `faceDownHidden` shape does carry it. Total over both.
  const tapped = full?.tapped ?? ('tapped' in card && card.tapped === true);

  const className = [
    'tile',
    `tile--${kind}`,
    tapped ? 'tile--tapped' : '',
    concealed ? 'tile--concealed' : '',
    selectable ? 'tile--selectable' : '',
    highlighted ? 'tile--highlighted' : '',
    focused ? 'tile--focus' : '',
    weak ? 'tile--weak' : '',
    full?.sick === true && full.zone === 'battlefield' ? 'tile--sick' : '',
    full?.token === true ? 'tile--token' : '',
    full?.attacking === true ? 'tile--attacking' : '',
    full?.blocking === true ? 'tile--blocking' : '',
    mine ? 'tile--mine' : 'tile--theirs',
  ]
    .filter(Boolean)
    .join(' ');

  // §3.3 / §14 rule 2: a concealed card announces itself as concealed and
  // nothing else. There is no name to announce, and no `title` either.
  const label =
    full === null
      ? 'face-down card'
      : tileAriaLabel({
          name: displayName(full),
          manaCost: full.manaCost,
          types: full.types,
          power: full.power,
          toughness: full.toughness,
          tapped: full.tapped,
          sick: full.sick && full.zone === 'battlefield',
          attacking: full.attacking,
          blocking: full.blocking,
          damage: full.damage,
          counters: full.counters,
        });

  return (
    <li
      className={className}
      style={{ '--i': String(index) } as React.CSSProperties}
      // M4 evening 3: where this card is, for the arrows overlay. The key is
      // namespaced (`c:`) because `Card.id` and `stack[].id` are different id
      // spaces and they collide (report 10 §10.1). The registry is a no-op under
      // `renderToStaticMarkup`, where no element exists to measure.
      ref={registerRect}
      data-card-id={String(card.id)}
      // Only ever the name this frame made public. The render test reads these.
      data-card-name={full === null || full.name === '' ? undefined : full.name}
      data-selectable={selectable ? 'true' : undefined}
    >
      <button
        type="button"
        className="tile__btn"
        disabled={clicks === null}
        data-act="clickCard"
        aria-label={`${label} — card ${String(card.id)}`}
        title={`act: clickCard ${String(card.id)} — Forge is the judge of every click (§4.1)`}
        onClick={() => {
          clicks?.card(card.id);
        }}
      >
        <Face card={card} kind={kind} art={art} />
      </button>

      <Overlays card={card} note={note} />

      {attachments.length > 0 && (
        <span className="tile__attachments" aria-hidden="true">
          {attachments.map((attachment, i) => (
            <span
              key={attachment.id}
              className="tile__attachment"
              style={{ '--a': String(i) } as React.CSSProperties}
            >
              <Face card={attachment} kind={kind} art={art} />
            </span>
          ))}
        </span>
      )}

      {zoom !== 'none' && <Zoom card={card} art={art} where={zoom} />}
    </li>
  );
}

/**
 * The card face: the image layer over the generated text frame, or the CSS back.
 *
 * **The back is drawn in CSS, not fetched** (report 10 §4.2). Scryfall has no
 * generic-back endpoint, synthesis §8 forbids committing Forge's `res/` assets,
 * and a radial-gradient rounded rectangle is free, always available, scales to
 * any `--cw` and carries no licensing question at all.
 */
function Face({ card, kind, art }: { card: AnyCard; kind: TileKind; art: ArtIndex }): JSX.Element {
  const [broken, setBroken] = useState(false);

  if (isHidden(card)) {
    return (
      <span className="tile__face tile__face--back">
        <span className="back" aria-hidden="true" />
      </span>
    );
  }

  const full = card;
  const alt = altFace(full);

  // A face-down card the table sees as a nameless body. Its face is what the
  // gate withholds, so the front of the tile is the back of a card (P3).
  if (full.faceDown) {
    return (
      <span className="tile__face tile__face--back">
        <span className="back" aria-hidden="true" />
        {alt !== null && (
          <span className="back__alt">
            <span className="k">you may look</span>
            <span className="back__altname">{alt.name}</span>
            {(alt.power !== null || alt.toughness !== null) && (
              <span className="back__altpt">
                {alt.power ?? '?'}/{alt.toughness ?? '?'}
              </span>
            )}
          </span>
        )}
      </span>
    );
  }

  const entry = artEntryFor(art, full);
  const url = entry === null ? null : imageUrl(entry, IMAGE_SIZE[kind]);
  const showImage = url !== null && !broken && !failedImages.has(url);

  return (
    <span className="tile__face">
      {/* Always rendered, always underneath: a slow image, a 404 or a blocked
          request changes nothing about the layout and cannot block a click. */}
      <TextFrame card={full} />
      {showImage && (
        <img
          className="tile__img"
          src={url}
          width={488}
          height={680}
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
          draggable={false}
          alt=""
          onLoad={(event) => {
            event.currentTarget.classList.add('tile__img--loaded');
          }}
          onError={() => {
            failedImages.add(url);
            setBroken(true);
          }}
        />
      )}
    </span>
  );
}

/**
 * The generated text card frame: name, cost, type line, P/T — every one of them
 * already in the snapshot (`PLAN.md` M4: "A missing image renders a generated
 * text card frame and never blocks a click").
 */
function TextFrame({ card }: { card: Card }): JSX.Element {
  const name = displayName(card);
  return (
    <span className="frame" aria-hidden="true">
      <span className="frame__head">
        <span className="frame__name">{name}</span>
        <ManaCost cost={card.manaCost} />
      </span>
      <span className="frame__art" />
      {/* §10.4: Forge's `CardType.toString()` verbatim, plain hyphen and all. */}
      <span className="frame__type">{card.types}</span>
      <span className="frame__foot">
        {card.power !== null || card.toughness !== null ? (
          <span className="frame__pt">
            {card.power ?? '?'}/{card.toughness ?? '?'}
          </span>
        ) : card.loyalty !== null ? (
          <span className="frame__pt">{card.loyalty}</span>
        ) : (
          <span className="frame__set">{card.setCode ?? ''}</span>
        )}
      </span>
    </span>
  );
}

/**
 * Everything drawn *on* the card rather than *in* it (report 10 §4.5), outside
 * `.tile__face` so nothing rotates with a tapped card, and
 * `pointer-events: none` so every pixel of the tile still belongs to the button
 * underneath.
 */
function Overlays({ card, note }: { card: AnyCard; note: string | null }): JSX.Element {
  if (isHidden(card)) {
    return (
      <span className="tile__overlays" aria-hidden="true">
        <span className="tile__stripe" />
        <span className="tile__micro">face-down</span>
        {note !== null && <span className="tile__note">{note}</span>}
      </span>
    );
  }

  const counters = Object.entries(card.counters);
  return (
    <span className="tile__overlays" aria-hidden="true">
      <span className="tile__stripe" />

      {card.tapped && <span className="tile__tapmark" title="tapped">⭮</span>}
      {card.sick && card.zone === 'battlefield' && (
        <span className="tile__badge tile__badge--sick" title="summoning sick">
          ✦
        </span>
      )}
      {card.attacking && <span className="tile__mark tile__mark--attack">⚔</span>}
      {card.blocking && <span className="tile__mark tile__mark--block">⛊</span>}
      {card.token && <span className="tile__micro">TOKEN</span>}
      {card.faceDown && <span className="tile__micro">face-down</span>}

      {counters.length > 0 && (
        <span className="tile__counters">
          {counters.map(([name, n]) => {
            const label = counterLabel(name);
            return (
              <span key={name} className={`ctr ${label.cls}`} title={`${label.text} ×${String(n)}`}>
                {label.glyph !== null && <i className={`ms ${label.glyph}`} aria-hidden="true" />}
                <span className="ctr__n">{n}</span>
                <span className="ctr__t">{label.text}</span>
              </span>
            );
          })}
        </span>
      )}

      <span className="tile__bottom">
        {/* Never subtracted from toughness — that is a rules computation. */}
        {card.damage > 0 && <span className="tile__dmg">−{card.damage}</span>}
        {card.loyalty !== null ? (
          <span className="tile__loyalty">{card.loyalty}</span>
        ) : card.power !== null || card.toughness !== null ? (
          <span className="tile__pt">
            {card.power ?? '?'}/{card.toughness ?? '?'}
          </span>
        ) : null}
      </span>

      {note !== null && <span className="tile__note">{note}</span>}
    </span>
  );
}

/**
 * Hover / focus zoom (report 10 §4.2's `display` variant, 672×936 WEBP — fewer
 * bytes than the `normal` JPG it replaces). Pure CSS visibility: the `<img>` is
 * `loading="lazy"` inside a `display: none` box, so nothing is fetched until a
 * card is actually hovered, and the board's ~1 MB `grid` preload stays the whole
 * of the network cost.
 *
 * The credit line travels with the art, because the Fan Content Policy and
 * Scryfall's terms both require it wherever the image is shown.
 */
function Zoom({
  card,
  art,
  where,
}: {
  card: AnyCard;
  art: ArtIndex;
  where: 'up' | 'down';
}): JSX.Element | null {
  const entry = artEntryFor(art, card);
  if (entry === null) return null;
  if (!isHidden(card) && card.faceDown) return null;
  return (
    <span className={`tile__zoom tile__zoom--${where}`} aria-hidden="true">
      <img
        className="tile__zoomimg"
        src={imageUrl(entry, 'display')}
        width={672}
        height={936}
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable={false}
        alt=""
      />
      <span className="tile__credit">
        {entry.setCode} #{entry.collectorNumber} · art by {entry.artist} · © Wizards of the Coast
      </span>
    </span>
  );
}

/**
 * What to call a card that has a shape but may have no name. A face-down card
 * comes through with `name: ""` — Forge's face-down characteristic verbatim
 * (`CardUtil.getFaceDownCharacteristic`), not a missing value — so printing it
 * raw leaves a blank frame where a 2/2 is standing.
 */
export function displayName(card: Card): string {
  if (card.name !== '') return card.name;
  if (card.faceDown) return 'face-down card';
  return '(unnamed card)';
}
