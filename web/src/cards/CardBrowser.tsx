/*
 * mtg-table — cards/CardBrowser.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser** — `#cards` (or `?view=cards`), lazily imported by
 * `main.tsx`, so none of this is on the board's critical path.
 *
 * A search box over the local card library's FTS5 index (name, type line, rules
 * text), four filters (set, colour, type, in-deck), a grid of card images served
 * same-origin from the `var/cards` cache (Scryfall's CDN on a miss), and a
 * detail panel. It is public card data, not a game: no transport, no reducer,
 * no board, and none of hard rule 8's machinery applies — but it keeps the
 * repo's web conventions: no CSS import (every rule is in `styles.css`), one
 * keymap table (`cards/keys.ts`), pure logic in `.ts` files `node --test` can
 * reach, and no hook below a return.
 *
 * Without an index the page says so and prints the command that builds one —
 * an honest empty state, never an empty grid that looks like "no results".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { View } from '../useView.ts';
import { fetchApi, type CardsApi } from './api.ts';
import { CardDetail } from './CardDetail.tsx';
import { CardView } from './CardView.tsx';
import { buildDeckIndex } from './decks.ts';
import { CARDS_KEYMAP, planCardsKey } from './keys.ts';
import type { DeckFile, LibraryCard, LibraryStatus, SearchResponse } from './model.ts';
import {
  COLOR_OPTIONS,
  EMPTY_FILTERS,
  SET_OPTIONS,
  TYPE_OPTIONS,
  filtersFromQuery,
  filtersToQuery,
  isBlank,
  toggle,
  type CardFilters,
} from './search.ts';
import { printLabel } from './text.ts';

// ---------------------------------------------------------------------------
// The URL — `#cards?q=agent&set=msh&open=<id>`
// ---------------------------------------------------------------------------

/** The part of the location that carries the browser's state: the hash's query, else the page's. */
export function stateQueryOf(hash: string, search: string): string {
  const q = hash.indexOf('?');
  if (q >= 0) return hash.slice(q + 1);
  return search.replace(/^\?/, '');
}

function readLocation(): { filters: CardFilters; open: string | null } {
  if (typeof window === 'undefined') return { filters: EMPTY_FILTERS, open: null };
  const query = stateQueryOf(window.location.hash, window.location.search);
  let open: string | null = null;
  try {
    open = new URLSearchParams(query).get('open');
  } catch {
    open = null;
  }
  return { filters: filtersFromQuery(query), open: open === '' ? null : open };
}

function writeLocation(filters: CardFilters, open: string | null): void {
  if (typeof window === 'undefined') return;
  const query = filtersToQuery(filters, { open });
  const hash = query === '' ? '#cards' : `#cards?${query}`;
  if (window.location.hash === hash) return;
  // `replaceState` fires no `hashchange`, so `useView` stays where it is and
  // typing does not stack a history entry per keystroke.
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
}

/**
 * Where the back link goes, by the view the page was opened from. The workshop's
 * remembers its card in this browser, so `#workshop` returns to the card you
 * left it on.
 */
const BACK_LINKS: Readonly<Record<'arena' | 'workshop' | 'board', { href: string; label: string; title: string }>> = {
  arena: { href: '#arena', label: '▣ arena', title: 'Back to the 3D arena' },
  workshop: { href: '#workshop', label: '⚒ workshop', title: 'Back to the workshop, on the card you left it on' },
  board: { href: '#', label: '▤ board', title: 'Back to the board' },
};

/** Columns the grid is laid out in right now — what ↑/↓ step by. */
function gridColumns(grid: HTMLElement | null): number {
  if (grid === null || typeof getComputedStyle !== 'function') return 1;
  const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').filter((t) => t.trim() !== '');
  return Math.max(1, tracks.length);
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Credits(): JSX.Element {
  return (
    <span className="app__credit">
      Card data and images from <a href="https://scryfall.com">Scryfall</a> · mana symbols via mana-font
      (MIT/OFL) · Unofficial Fan Content — not approved or endorsed by Wizards of the Coast.
    </span>
  );
}

/**
 * The second command of the empty state: `build.ts` fetches no card image, so
 * without this every tile is hotlinked from Scryfall's CDN.
 */
export const IMAGES_COMMAND = 'node tools/card-library/images.ts --all-decks';

/** No index (or no route): say exactly that, and how to fix it. */
export function EmptyState({ status }: { status: LibraryStatus }): JSX.Element {
  return (
    <div className="cardlib-empty" role="status">
      <h2>No card library yet</h2>
      <p>{status.message}</p>
      <p>Build it from the repo root, then cache the decks&apos; card images:</p>
      <pre className="cardlib-empty__cmd">
        <code>
          {status.buildCommand}
          {'\n'}
          {IMAGES_COMMAND}
        </code>
      </pre>
      <p className="muted">
        The build downloads Scryfall&apos;s <code>oracle_cards</code> bulk file and the MSH and MSC prints and
        writes the index to <code>{status.dbPath}</code>; it fetches no card image. The second command caches
        the images of every card in <code>decks/</code> under <code>var/cards/images</code> — without it the
        page still works and shows each image from Scryfall&apos;s CDN instead. Nothing under <code>var/</code>{' '}
        is committed. Reload this page when they finish.
      </p>
    </div>
  );
}

function Intro({
  onTry,
  primaryDeck,
  onDeck,
  status,
}: {
  onTry: (q: string) => void;
  primaryDeck: string | null;
  onDeck: (deck: string) => void;
  status: LibraryStatus;
}): JSX.Element {
  const cards = status.counts?.['cards'];
  const prints = status.counts?.['prints'];
  return (
    <div className="cardlib-intro">
      <p>
        Search{' '}
        {typeof cards === 'number' ? `${cards.toLocaleString('en-US')} cards` : 'the library'}
        {typeof prints === 'number' ? ` (${prints.toLocaleString('en-US')} prints)` : ''} by name, type or rules
        text. Try{' '}
        {['agent', 'hero', 'flying', 'counter'].map((q, i) => (
          <span key={q}>
            {i > 0 && ', '}
            <button type="button" className="btn btn--small" onClick={() => onTry(q)}>
              {q}
            </button>
          </span>
        ))}
        .
      </p>
      {primaryDeck !== null && (
        <p>
          Or{' '}
          <button type="button" className="btn btn--small btn--primary" onClick={() => onDeck(primaryDeck)}>
            show {primaryDeck}
          </button>{' '}
          — the in-deck filter, set to the deck in play.
        </p>
      )}
    </div>
  );
}

function Tile({
  card,
  index,
  selected,
  onPick,
}: {
  card: LibraryCard;
  index: number;
  selected: boolean;
  onPick: (index: number) => void;
}): JSX.Element {
  return (
    <li className="cardlib-grid__cell">
      <button
        type="button"
        className={`cardlib-tile${selected ? ' cardlib-tile--selected' : ''}`}
        data-index={index}
        data-card-id={card.id}
        aria-current={selected ? 'true' : undefined}
        title={`${card.name} — ${printLabel(card)}`}
        onClick={() => onPick(index)}
      >
        <CardView key={card.id} card={card} variant="tile" />
        <span className="cardlib-tile__name">{card.name}</span>
        <span className="cardlib-tile__print">{printLabel(card)}</span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export interface CardBrowserProps {
  onSetView?: ((view: View) => void) | null;
  /**
   * The view the page was opened from — where the back link goes: the arena, the
   * workshop (its *card text* link, D102), or the board by default.
   */
  backTo?: View;
  /** The data route; a test passes a fake. */
  api?: CardsApi;
  /** Server-rendered starting state (the vitest render suite). */
  initialStatus?: LibraryStatus | null;
  initialFilters?: CardFilters;
  initialResults?: SearchResponse | null;
  initialDecks?: DeckFile[];
}

export function CardBrowser({
  onSetView = null,
  backTo = 'board',
  api = fetchApi,
  initialStatus = null,
  initialFilters,
  initialResults = null,
  initialDecks = [],
}: CardBrowserProps): JSX.Element {
  const [status, setStatus] = useState<LibraryStatus | null>(initialStatus);
  const [decks, setDecks] = useState<DeckFile[]>(initialDecks);
  const [filters, setFilters] = useState<CardFilters>(() => initialFilters ?? readLocation().filters);
  const [results, setResults] = useState<SearchResponse | null>(initialResults);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(-1);
  const [open, setOpen] = useState<LibraryCard | null>(null);
  const [pendingOpen, setPendingOpen] = useState<string | null>(() => readLocation().open);
  const [tookMs, setTookMs] = useState<number | null>(null);
  /** Every print of the open card, from the route; `[]` until it answers. */
  const [prints, setPrints] = useState<LibraryCard[]>([]);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLUListElement | null>(null);
  const focusGridRef = useRef(false);

  const deckIndex = useMemo(() => buildDeckIndex(decks), [decks]);
  const ready = status !== null && status.ready;
  const cards = useMemo(() => results?.cards ?? [], [results]);
  const blank = isBlank(filters);

  // Status and decks, once.
  useEffect(() => {
    let cancelled = false;
    void api.status().then((s) => {
      if (!cancelled) setStatus(s);
    });
    void api.decks().then((d) => {
      if (!cancelled) setDecks(d);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  // The search, debounced and abortable: a keystroke cancels the one before.
  const filtersKey = filtersToQuery(filters);
  useEffect(() => {
    if (!ready) return undefined;
    if (isBlank(filters)) {
      setResults(null);
      setSearching(false);
      setError(null);
      return undefined;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      const started = typeof performance === 'undefined' ? Date.now() : performance.now();
      api
        .search(filters, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return;
          const now = typeof performance === 'undefined' ? Date.now() : performance.now();
          setTookMs(Math.round(now - started));
          setResults(response);
          setError(null);
          setSearching(false);
          setSelected(-1);
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError((reason as Error).message);
          setSearching(false);
        });
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `filtersKey` is the value identity of `filters`: an `update` that changes
    // nothing makes a new object and must not start a new search.
  }, [filtersKey, ready, api]);

  // A deep link (`open=<id>`) opens once its card is in the results — or is fetched.
  useEffect(() => {
    if (pendingOpen === null || !ready) return;
    const at = cards.findIndex((c) => c.id === pendingOpen);
    if (at >= 0) {
      setSelected(at);
      setOpen(cards[at] ?? null);
      setPendingOpen(null);
      return;
    }
    if (results === null && !blank) return; // the search is still coming
    const id = pendingOpen;
    setPendingOpen(null);
    void api
      .card(id)
      .then((found) => {
        if (found !== null) setOpen(found.card);
      })
      .catch(() => undefined);
  }, [pendingOpen, ready, cards, results, blank, api]);

  // The open card's other prints (MSH #4 and #402; six MSH Plains). Keyed by the
  // CARD, so switching between its prints neither refetches nor flickers the row.
  const openId = open?.id ?? null;
  const openOracle = open === null ? null : (open.oracleId ?? open.id);
  const openIdRef = useRef(openId);
  openIdRef.current = openId;
  useEffect(() => {
    setPrints([]);
    const id = openIdRef.current;
    if (openOracle === null || id === null) return undefined;
    let cancelled = false;
    void api
      .card(id)
      .then((found) => {
        if (!cancelled && found !== null) setPrints(found.prints);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [openOracle, api]);

  // The URL follows the state.
  useEffect(() => {
    if (pendingOpen !== null) return;
    writeLocation(filters, openId);
  }, [filtersKey, openId, pendingOpen, filters]);

  // A hand-edited hash re-reads the filters — and the open card, or the URL
  // effect below would write the hash back without its `open=` before the new
  // one was ever read (a same-document navigation to a deep link did exactly that).
  useEffect(() => {
    const onHash = (): void => {
      const next = readLocation();
      setFilters((current) => (filtersToQuery(current) === filtersToQuery(next.filters) ? current : next.filters));
      if (next.open !== null) setPendingOpen(next.open);
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // Keep the selected tile in view, and focus it when the keyboard moved there.
  useEffect(() => {
    if (selected < 0) return;
    const tile = gridRef.current?.querySelector<HTMLElement>(`[data-index="${String(selected)}"]`);
    if (tile === null || tile === undefined) return;
    tile.scrollIntoView({ block: 'nearest' });
    if (focusGridRef.current) {
      tile.focus({ preventScroll: true });
      focusGridRef.current = false;
    }
  }, [selected]);

  const openAt = useCallback(
    (index: number) => {
      const card = cards[index];
      if (card === undefined) return;
      setSelected(index);
      setOpen(card);
    },
    [cards],
  );

  // The keyboard — one listener, planned by the pure table in `cards/keys.ts`.
  const live = useRef({ selected, total: cards.length, detailOpen: open !== null, openAt });
  live.current = { selected, total: cards.length, detailOpen: open !== null, openAt };
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const now = live.current;
      const plan = planCardsKey({
        key: event.key,
        modifier: event.ctrlKey || event.metaKey || event.altKey,
        inInput: tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true,
        inControl: tag === 'BUTTON' || tag === 'A',
        inSelect: tag === 'SELECT',
        index: now.selected,
        total: now.total,
        columns: gridColumns(gridRef.current),
        detailOpen: now.detailOpen,
      });
      switch (plan.kind) {
        case 'none':
          return;
        case 'focusSearch':
          searchRef.current?.focus();
          searchRef.current?.select();
          break;
        case 'select':
          focusGridRef.current = true;
          if (plan.focusGrid) searchRef.current?.blur();
          setSelected(plan.index);
          break;
        case 'open':
          now.openAt(plan.index);
          break;
        case 'close':
          setOpen(null);
          break;
        case 'blur':
          (target as HTMLElement | null)?.blur();
          break;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const update = (patch: Partial<CardFilters>): void => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const primaryDeck = decks[0]?.file ?? null;
  const back = backTo === 'arena' || backTo === 'workshop' ? backTo : 'board';
  const backLink = BACK_LINKS[back];

  // ---- render (no hooks below this line) ----------------------------------

  let body: JSX.Element;
  if (status === null) {
    body = <p className="pad muted">checking the card library…</p>;
  } else if (!status.ready) {
    body = <EmptyState status={status} />;
  } else {
    const summary = blank
      ? null
      : searching && results === null
        ? 'searching…'
        : results === null
          ? ''
          : results.needsQuery === true
            ? 'Colour and type narrow a search; on their own they are not one. Add a word, a set or a deck.'
            : // `approximate` first: a search stopped at the route's scan cap is a
              // floor, never a fact — not even when nothing in the part it read matched.
              results.approximate === true
              ? results.total === 0
                ? 'Nothing matched in the part of the library this search read — narrow the search.'
                : `Showing ${String(results.cards.length)} of ${results.total.toLocaleString('en-US')}+ — narrow the search.`
              : results.total === 0
                ? 'No cards match.'
                : results.truncated
                  ? `Showing ${String(results.cards.length)} of ${results.total.toLocaleString('en-US')} — narrow the search.`
                  : `${results.total.toLocaleString('en-US')} ${results.total === 1 ? 'card' : 'cards'}`;
    body = (
      <div className={`cardlib__body${open === null ? '' : ' cardlib__body--open'}`}>
        <main className="cardlib__results" aria-busy={searching}>
          {error !== null && (
            <div className="banner banner--error" role="alert">
              <strong>Search failed.</strong> <span>{error}</span>
            </div>
          )}
          {blank ? (
            <Intro
              status={status}
              primaryDeck={primaryDeck}
              onTry={(q) => update({ q })}
              onDeck={(deck) => update({ deck })}
            />
          ) : (
            <p className="cardlib__summary muted">
              {summary}
              {tookMs !== null && results !== null && !searching && ` · ${String(tookMs)} ms`}
              {searching && results !== null && ' · searching…'}
            </p>
          )}
          <ul className="cardlib-grid" ref={gridRef} aria-label="Search results">
            {cards.map((card, i) => (
              <Tile key={card.id} card={card} index={i} selected={i === selected} onPick={openAt} />
            ))}
          </ul>
        </main>
        <aside className="cardlib__aside">
          {open === null ? (
            <p className="cardlib__placeholder muted">
              Pick a card — click it, or move with the arrows and press Enter.
            </p>
          ) : (
            <CardDetail
              key={open.id}
              card={open}
              decks={deckIndex}
              prints={prints}
              onPickPrint={(print) => {
                setOpen(print);
              }}
              onClose={() => {
                setOpen(null);
              }}
            />
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="app cardlib">
      <div className="app__bar">
        <h1>mtg-table — cards</h1>
        <a
          className="viewtoggle"
          href={backLink.href}
          onClick={(event) => {
            event.preventDefault();
            onSetView?.(back);
          }}
          title={backLink.title}
        >
          {backLink.label}
        </a>
        {status !== null && status.ready && status.builtAt !== null && (
          <span className="muted">index built {status.builtAt.slice(0, 10)}</span>
        )}
        <span className="muted cardlib__keys">
          {CARDS_KEYMAP.map((row) => (
            <span key={row.chord}>
              <kbd>{row.chord}</kbd> {row.label}
            </span>
          ))}
        </span>
        <Credits />
      </div>

      {ready && (
        <div className="cardlib__controls">
          <input
            ref={searchRef}
            className="cardlib__search"
            type="search"
            placeholder="Search name, type or rules text  ( / )"
            aria-label="Search cards"
            value={filters.q}
            autoFocus
            onChange={(event) => update({ q: event.target.value })}
          />
          <fieldset className="cardlib__chips" aria-label="Set">
            {SET_OPTIONS.map((set) => (
              <button
                key={set.code}
                type="button"
                className={`btn btn--small${filters.sets.includes(set.code) ? ' btn--on' : ''}`}
                aria-pressed={filters.sets.includes(set.code)}
                onClick={() => update({ sets: toggle(filters.sets, set.code) })}
              >
                {set.label}
              </button>
            ))}
          </fieldset>
          <fieldset className="cardlib__chips" aria-label="Colour">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.code}
                type="button"
                className={`btn btn--small cardlib__color${filters.colors.includes(color.code) ? ' btn--on' : ''}`}
                aria-pressed={filters.colors.includes(color.code)}
                title={color.label}
                onClick={() => update({ colors: toggle(filters.colors, color.code) })}
              >
                <i className={`ms ${color.glyph} ms-cost ms-shadow`} aria-hidden="true" />
                <span className="sr-only">{color.label}</span>
              </button>
            ))}
          </fieldset>
          <select
            className="cardlib__select"
            aria-label="Type"
            value={filters.type ?? ''}
            onChange={(event) => update({ type: event.target.value === '' ? null : event.target.value })}
          >
            <option value="">any type</option>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className={`cardlib__select${filters.deck === null ? '' : ' cardlib__select--on'}`}
            aria-label="In deck"
            value={filters.deck ?? ''}
            onChange={(event) => update({ deck: event.target.value === '' ? null : event.target.value })}
          >
            <option value="">in any deck or none</option>
            <option value="any">in some deck under decks/</option>
            {decks.map((deck) => (
              <option key={deck.file} value={deck.file}>
                in {deck.file}
              </option>
            ))}
          </select>
          {!blank && (
            <button
              type="button"
              className="btn btn--small"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setOpen(null);
                searchRef.current?.focus();
              }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {body}
    </div>
  );
}

export default CardBrowser;
