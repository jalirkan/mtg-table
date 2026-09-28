/*
 * mtg-table — story/Story.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **`#story` — the narrator in the browser, in step with the replay** (D151).
 *
 * `tools/narrate.mjs` tells a frame log as a story in a terminal; this page
 * tells the log the replay is playing, beside the replay's own cursor: a
 * scrolling column of moments grouped by turn, the moment on screen
 * highlighted, the summary as a card at the head, and — while a spectated game
 * is still being recorded — the story growing as the recorder writes it. It is
 * the other half of watching two AIs play (`./scripts/spectate.sh --story`):
 * the arena shows what happened, the story says it in words.
 *
 * **What it is handed, and what it is not.** `main.tsx` owns the transport, the
 * poller and the cursor (`replayCursors`), exactly as it does for the board and
 * the arena; this component is handed the frames the transport holds, the
 * cursor, the folded state at the cursor and four callbacks. It imports no
 * transport, never fetches and starts no timer (`web/test/story.test.ts`), so
 * following a live recording is the transport's business and this page reads
 * one more word about it (`follow`), as the arena does.
 *
 * **Hard rule 8, by construction.** Every sentence is `narrate.ts`'s, and every
 * card name on the page is one of the names a fact carries — the narrator's one
 * face reader put it there, from the event's own frame or the one before it,
 * never remembered. `segmentText` only marks names the narrator resolved, so an
 * id the log never showed is never joined to a name here: an unseen card is
 * "a card" or "an unknown card", a face-down one "a face-down card".
 * `web/test/story-render.test.tsx` renders this page over every fixture and
 * holds it to that, with a negative control.
 *
 * **The future.** In a finished replay the whole story is drawn and what comes
 * after the cursor is dimmed (`S` hides it); following a live recording, it is
 * hidden — the page then narrates only the frames the cursor has played, so the
 * summary at the head is the game so far and not a spoiler.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import type { ClientState } from '../reduce.ts';
import type { View } from '../useView.ts';
import { STORY_KEYMAP, storyActionFor, type StoryKeyAction } from './keys.ts';
import {
  decksLineOf,
  narrate,
  phaseLabel,
  renderSeat,
  seenFromLine,
  summaryHeadOf,
  summaryRowsOf,
  titleOf,
  type CardRef,
  type Moment,
  type OutlineTurn,
  type Story as NarratedStory,
  type StoryGame,
} from './narrate.ts';
import {
  momentKey,
  namedCardsOf,
  nextMomentCursor,
  nextTurnCursor,
  nowFrameOf,
  nowMoments,
  placementOf,
  prevMomentCursor,
  prevTurnCursor,
  segmentText,
  storyViewOf,
  turnPlacement,
  type StoryView,
} from './page.ts';

/** Follow mode's word, as `main.tsx` tells the arena (`followWordOf`). */
export type StoryFollow = 'following' | 'stalled' | 'finished';

/** What comes after the cursor: drawn dimmed, or not drawn at all. */
export type Ahead = 'dim' | 'hide';

export interface StoryProps {
  /** The log's session header, as the transport parsed it. */
  header: unknown;
  /** The frames the transport holds. The array may grow (follow mode); `total` says how far to read. */
  frames: readonly unknown[];
  total: number;
  /** The replay cursor: frames applied, `0…total`. */
  cursor: number;
  /** The state folded to the cursor — for the "at this frame" strip, public fields only. */
  state: ClientState;
  playing: boolean;
  /** Follow mode's word, or `null` for an ordinary replay. */
  follow: StoryFollow | null;
  art: ArtIndex;
  /** Where "what comes after the cursor" starts; `main.tsx` passes `hide` while a log is followed. */
  initialAhead?: Ahead;
  onScrub(cursor: number): void;
  onToggle(): void;
  onStep(delta: 1 | -1): void;
  onSetView(view: View): void;
}

// ---------------------------------------------------------------------------
// The page

export default function Story(props: StoryProps): JSX.Element {
  const { header, frames, total, cursor, follow } = props;
  const [ahead, setAhead] = useState<Ahead>(props.initialAhead ?? 'dim');
  const [keepInView, setKeepInView] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const columnRef = useRef<HTMLElement | null>(null);

  // THE narration. Dimmed: the whole log the transport holds, re-told when
  // more arrives (about 4 ms for g1 — D152). Hidden: only the frames the cursor
  // has played, so nothing ahead of it is on the page at all.
  const upTo = ahead === 'hide' ? Math.min(cursor, total) : total;
  const story = useMemo<NarratedStory>(
    () => narrate({ header, frames: frames.slice(0, upTo) }),
    // `frames` is the transport's own array and grows in place; `upTo` is what changes.
    [header, frames, upTo],
  );
  const view = useMemo<StoryView>(() => storyViewOf(story), [story]);
  const now = nowFrameOf(view.frames, cursor);

  // The keyboard reads the latest props through a ref, so the listener is added once.
  const latest = useRef({ props, view, cursor });
  latest.current = { props, view, cursor };
  useEffect(() => {
    const go = (to: number | null): void => {
      if (to !== null) latest.current.props.onScrub(to);
    };
    const actions: Record<StoryKeyAction, () => void> = {
      toggle: () => latest.current.props.onToggle(),
      prevMoment: () => go(prevMomentCursor(latest.current.view.frames, latest.current.cursor)),
      nextMoment: () => go(nextMomentCursor(latest.current.view.frames, latest.current.cursor)),
      prevTurn: () =>
        go(prevTurnCursor(latest.current.view.turnStarts, latest.current.view.frames, latest.current.cursor)),
      nextTurn: () => go(nextTurnCursor(latest.current.view.turnStarts, latest.current.cursor)),
      stepBack: () => latest.current.props.onStep(-1),
      stepForward: () => latest.current.props.onStep(1),
      start: () => go(0),
      end: () => go(latest.current.props.total),
      keepInView: () => setKeepInView((k) => !k),
      ahead: () => setAhead((a) => (a === 'dim' ? 'hide' : 'dim')),
      arena: () => latest.current.props.onSetView('arena'),
      board: () => latest.current.props.onSetView('board'),
    };
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const action = storyActionFor({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        target: target === null ? null : { tagName: target.tagName, isContentEditable: target.isContentEditable },
      });
      if (action === null) return;
      event.preventDefault();
      actions[action]();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Keep the moment on screen in view: into the column's upper third when it
  // has scrolled out of the middle, and not at all while the reader has turned
  // it off (F) to read somewhere else. An effect, not a layout effect: a scroll
  // one paint late costs nothing, and a server render (the corpus test) runs
  // neither.
  useEffect(() => {
    if (!keepInView) return;
    const column = columnRef.current;
    if (column === null) return;
    const target =
      column.querySelector<HTMLElement>('[data-now="true"]') ?? column.querySelector<HTMLElement>('[data-tail]');
    if (target === null) return;
    const box = column.getBoundingClientRect();
    const at = target.getBoundingClientRect();
    const top = at.top - box.top;
    if (top >= box.height * 0.12 && at.bottom - box.top <= box.height * 0.8) return;
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    column.scrollTo({ top: column.scrollTop + top - box.height * 0.3, behavior: reduce ? 'auto' : 'smooth' });
  }, [now, keepInView, view]);

  const onGo = useCallback((to: number) => {
    latest.current.props.onScrub(to);
  }, []);
  const onHover = useCallback((frameIndex: number | null) => {
    setHovered(frameIndex);
  }, []);

  const shown = hovered !== null ? nowMoments(view, hovered) : nowMoments(view, now);

  return (
    <div className="story" data-ahead={ahead}>
      <aside className="story__side" aria-label="The game at a glance">
        {view.games.map(({ game }, gi) => (
          <SummaryCard
            key={`${game.gameId ?? 'game'}:${String(gi)}`}
            story={story}
            game={game}
            ahead={ahead}
            follow={follow}
            upTo={upTo}
            total={total}
          />
        ))}
        <AtFrame
          state={props.state}
          cursor={cursor}
          total={total}
          moments={shown}
          previewing={hovered !== null}
          art={props.art}
        />
        <StoryControls ahead={ahead} keepInView={keepInView} onAhead={setAhead} onKeepInView={setKeepInView} />
        <KeyLegend />
      </aside>

      <main
        className="story__column"
        ref={columnRef}
        aria-label="The story, turn by turn"
        onMouseLeave={() => {
          setHovered(null);
        }}
      >
        {view.count === 0 && (
          <p className="story__empty muted">
            {total === 0 ? 'Nothing has arrived yet.' : 'Nothing has happened yet at this frame — press → or play.'}
          </p>
        )}
        {view.games.map(({ game, outline }, gi) => (
          <section className="story__game" key={`${game.gameId ?? 'game'}:${String(gi)}`}>
            {view.games.length > 1 && <h2 className="story__gametitle">{titleOf(game)}</h2>}
            {outline.setup.length > 0 && (
              <TurnBlock
                gameIndex={gi}
                heading="Before the game"
                turn={0}
                side={null}
                runs={[{ label: '', moments: outline.setup }]}
                {...clip(outline.setup, cursor, now)}
                onGo={onGo}
                onHover={onHover}
              />
            )}
            {typeof outline.startsAtTurn === 'number' && (
              <p className="story__note">
                (This log begins in the middle of turn {outline.startsAtTurn}; what came before is not in it.)
              </p>
            )}
            {outline.turns.map((t) => (
              <TurnBlock
                key={t.turn}
                gameIndex={gi}
                heading={t.heading}
                turn={t.turn}
                side={t.player === null ? null : t.player === game.you ? 'you' : 'opp'}
                runs={t.runs}
                {...clip(
                  t.runs.flatMap((r) => r.moments),
                  cursor,
                  now,
                )}
                onGo={onGo}
                onHover={onHover}
              />
            ))}
            {game.ending !== null && game.ending.text !== null && (
              <p className="story__ending">
                {game.ending.text}
                {game.ending.matchOver === false && ' The match goes on: the next game is its own log.'}
              </p>
            )}
          </section>
        ))}
        <FollowTail follow={follow} ahead={ahead} cursor={cursor} total={total} />
      </main>
    </div>
  );
}

/**
 * A turn's cursor, clipped for `memo`: a turn wholly behind the cursor or
 * wholly ahead of it is handed constants, so stepping through the game redraws
 * only the turn the cursor is in (`turnPlacement`).
 */
function clip(moments: readonly Moment[], cursor: number, now: number): { cursor: number; now: number } {
  const placement = turnPlacement(moments, cursor, now);
  if (placement === 'past') return { cursor: Number.MAX_SAFE_INTEGER, now: -2 };
  if (placement === 'ahead') return { cursor: -1, now: -2 };
  return { cursor, now };
}

// ---------------------------------------------------------------------------
// One turn

interface TurnBlockProps {
  gameIndex: number;
  heading: string;
  turn: number;
  /** Whose turn, against the log's seat: the heading's colour (the words say it too). */
  side: 'you' | 'opp' | null;
  runs: OutlineTurn['runs'];
  cursor: number;
  now: number;
  onGo(cursor: number): void;
  onHover(frameIndex: number | null): void;
}

const TurnBlock = memo(function TurnBlock(props: TurnBlockProps): JSX.Element {
  const { gameIndex, heading, turn, side, runs, cursor, now, onGo, onHover } = props;
  const moments = runs.flatMap((r) => r.moments);
  const placement = turnPlacement(moments, cursor, now);
  // A frame can tell more than one moment; the ordinal keeps their keys apart.
  const ordinals = new Map<number, number>();
  const keyOf = (m: Moment): string => {
    const n = ordinals.get(m.frameIndex) ?? 0;
    ordinals.set(m.frameIndex, n + 1);
    return momentKey(gameIndex, m, n);
  };
  return (
    <section className={`story__turn story__turn--${placement}`} data-turn={turn} data-side={side ?? undefined}>
      <h3 className="story__turnhead">{heading}</h3>
      {runs.length === 0 ? (
        <p className="story__passes muted">(nothing but passes)</p>
      ) : (
        <ol className="story__runs">
          {runs.map((run, ri) => (
            <li className="story__run" key={`${run.label}:${String(ri)}`}>
              <span className="story__phase">{run.label}</span>
              <ol className="story__moments">
                {run.moments.map((m) => (
                  <MomentItem
                    key={keyOf(m)}
                    moment={m}
                    placement={placementOf(m.frameIndex, cursor, now)}
                    onGo={onGo}
                    onHover={onHover}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});

function MomentItem({
  moment,
  placement,
  onGo,
  onHover,
}: {
  moment: Moment;
  placement: 'past' | 'now' | 'ahead';
  onGo(cursor: number): void;
  onHover(frameIndex: number | null): void;
}): JSX.Element {
  return (
    <li
      className={`story__moment story__moment--${placement}`}
      data-frame={moment.frameIndex}
      data-kind={moment.kind}
      data-now={placement === 'now' ? 'true' : undefined}
      data-seat={moment.seat ?? undefined}
    >
      <button
        type="button"
        className="story__go"
        title={`frame ${String(moment.frameIndex + 1)} — show the game here`}
        onClick={() => {
          onGo(moment.frameIndex + 1);
        }}
        onMouseEnter={() => {
          onHover(moment.frameIndex);
        }}
        onFocus={() => {
          onHover(moment.frameIndex);
        }}
        onBlur={() => {
          onHover(null);
        }}
      >
        {segmentText(moment.text, moment.cards).map((piece, i) =>
          piece.card === null ? (
            piece.text
          ) : (
            <span
              key={i}
              className="story__card"
              data-card-id={piece.card.id}
              data-card-name={piece.card.name ?? undefined}
            >
              {piece.text}
            </span>
          ),
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The side: the summary card, the frame on screen, the switches, the keys

function SummaryCard({
  story,
  game,
  ahead,
  follow,
  upTo,
  total,
}: {
  story: NarratedStory;
  game: StoryGame;
  ahead: Ahead;
  follow: StoryFollow | null;
  upTo: number;
  total: number;
}): JSX.Element {
  const decks = decksLineOf(game);
  const head = summaryHeadOf(game);
  // While a log is still being written, "the game so far" is the whole point
  // and says so once; otherwise a hidden future is said out loud.
  const recording = follow === 'following' || follow === 'stalled';
  const partial = ahead === 'hide' && upTo < total && !recording;
  const result =
    game.ending !== null && game.ending.text !== null
      ? game.ending.text
      : recording
        ? 'The game is still being recorded.'
        : partial
          ? 'So far: the rest of the game is after the frame on screen (S shows it, dimmed).'
          : 'The log ends before the game does.';
  return (
    <section className="story__summary" aria-label="Summary">
      <h2 className="story__title">{titleOf(game)}</h2>
      {decks !== null && <p className="story__decks">{decks}</p>}
      <p className="story__seat muted">{renderSeat(story, game).join(' ')}</p>
      <p className="story__seen">
        {partial && <span className="story__sofar">so far · </span>}
        {seenFromLine(game)}
      </p>
      <p className="story__result">{result}</p>
      {head.length > 0 && (
        <table className="story__totals">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">total</span>
              </th>
              {head.map((h, i) => (
                <th scope="col" key={`${h}:${String(i)}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryRowsOf(game).map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * The frame on screen: where the game is (the snapshot's public fields — turn,
 * phase, life, how many cards in each hand and library), the moment the cursor
 * is on (or the one under the pointer), and the face-up cards it names, as
 * their Scryfall images where `art.json` has them.
 */
function AtFrame({
  state,
  cursor,
  total,
  moments,
  previewing,
  art,
}: {
  state: ClientState;
  cursor: number;
  total: number;
  moments: readonly Moment[];
  previewing: boolean;
  art: ArtIndex;
}): JSX.Element {
  const board = state.board;
  const active = board?.players.find((p) => p.id === board.activePlayer)?.name ?? null;
  const cards = namedCardsOf(moments);
  return (
    <section className="story__at" aria-label="The frame on screen">
      <h2 className="story__attitle">
        {previewing ? 'Previewing' : 'On screen'}{' '}
        <span className="muted">
          · frame {cursor} / {total}
        </span>
      </h2>
      {board !== null && board.turn > 0 && (
        <p className="story__where">
          Turn {board.turn} · {phaseLabel(board.phase)}
          {active !== null && <> · {active}’s turn</>}
        </p>
      )}
      {board !== null && (
        <ul className="story__seats">
          {board.players.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> {p.life} life
              {p.poison > 0 && <>, {p.poison} poison</>} · {p.zones.hand.count} in hand · {p.zones.library.count} in
              library
            </li>
          ))}
        </ul>
      )}
      {moments.length > 0 ? (
        <ul className="story__saying">
          {moments.map((m, i) => (
            <li key={`${String(m.frameIndex)}:${String(i)}`}>
              <span className="story__phase">{m.label}</span> {m.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing has happened yet.</p>
      )}
      {cards.length > 0 && (
        <div className="story__cards">
          {cards.map((card) => (
            <CardImage key={card.id} card={card} art={art} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * One named card, as the log's seat saw it: its Scryfall image over a text
 * frame of its name, so an image that is slow or fails is still the card (D28's
 * rule for the board, kept here). The name is the fact's own — never looked up
 * by id — and a card with no name is never drawn at all (`namedCardsOf`).
 */
function CardImage({ card, art }: { card: CardRef; art: ArtIndex }): JSX.Element {
  const [failed, setFailed] = useState(false);
  const entry = card.name === null ? null : lookupArt(art, card.name);
  return (
    <figure className="story__cardimg" data-card-id={card.id} data-card-name={card.name ?? undefined}>
      <div className={entry === null ? 'story__cardframe story__cardframe--bare' : 'story__cardframe'}>
        <div className="story__cardtext">{card.name}</div>
        {entry !== null && !failed && (
          <img
            src={imageUrl(entry, 'normal')}
            alt={card.name ?? ''}
            onError={() => {
              setFailed(true);
            }}
          />
        )}
      </div>
      <figcaption>{entry !== null ? `Illus. ${entry.artist}` : 'no image in art.json'}</figcaption>
    </figure>
  );
}

function StoryControls({
  ahead,
  keepInView,
  onAhead,
  onKeepInView,
}: {
  ahead: Ahead;
  keepInView: boolean;
  onAhead(ahead: Ahead): void;
  onKeepInView(on: boolean): void;
}): JSX.Element {
  return (
    <div className="story__switches">
      <label>
        <input
          type="checkbox"
          checked={ahead === 'dim'}
          onChange={(event) => {
            onAhead(event.currentTarget.checked ? 'dim' : 'hide');
          }}
        />{' '}
        show what comes after the cursor, dimmed (S)
      </label>
      <label>
        <input
          type="checkbox"
          checked={keepInView}
          onChange={(event) => {
            onKeepInView(event.currentTarget.checked);
          }}
        />{' '}
        keep the moment on screen in view (F)
      </label>
    </div>
  );
}

function KeyLegend(): JSX.Element {
  return (
    <details className="story__keys">
      <summary>keys</summary>
      <table>
        <tbody>
          {STORY_KEYMAP.map((row) => (
            <tr key={row.action}>
              <th scope="row">
                <kbd>{row.chord}</kbd>
              </th>
              <td>{row.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Click a moment to show the game there; hover one to see its cards.</p>
    </details>
  );
}

/** The column's last line: where the log is — still being written, gone quiet, or done. */
function FollowTail({
  follow,
  ahead,
  cursor,
  total,
}: {
  follow: StoryFollow | null;
  ahead: Ahead;
  cursor: number;
  total: number;
}): JSX.Element | null {
  const behind = Math.max(0, total - cursor);
  if (follow === 'following') {
    return (
      <p className="story__tail follow follow--live" data-tail="following">
        ● following — the story grows as the recorder writes it
        {ahead === 'hide' && behind > 0 ? ` (${String(behind)} frame(s) arrived and not played yet)` : ''}
      </p>
    );
  }
  if (follow === 'stalled') {
    return (
      <p className="story__tail follow follow--stalled" data-tail="stalled">
        ● following — no new frame for a while; is the recorder still running?
      </p>
    );
  }
  if (follow === 'finished') {
    return (
      <p className="story__tail follow" data-tail="finished">
        recording finished — this is a replay now
      </p>
    );
  }
  return null;
}
