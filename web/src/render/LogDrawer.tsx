/*
 * mtg-table — render/LogDrawer.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The left-edge drawer (report 10 §10), over the rail. It holds every fact M1
 * and M3 printed in columns and the new board has no room for: the running log,
 * the engine's notices, this frame's event batch, the combat bands, the cards on
 * the stack and the session/handshake block.
 *
 * **It is not Forge's game log.** Report 06 §0.5/§5.4 establish that
 * `GameEventAddLog` / `GameEventRandomLog` are text leak channels —
 * `CardView.toString()` returns the real name for a card in *any* zone — and
 * protocol §3.6 rule 4 drops them at the bridge. This drawer is built from
 * `state.log` (ids only, folded in `reduce()`) and `state.notices`.
 *
 * Two properties that are not decoration:
 *
 *   - **The ring is folded in `reduce()`, not here** (amendment P20). `reduce`
 *     is the only function that sees every frame and it is pure, so the replay
 *     transport's "step back" — which re-folds from the session header —
 *     rebuilds the log exactly as it was. A drawer that accumulated its own
 *     entries would be wrong the first time the user scrubbed backwards.
 *   - **Ids are resolved against the frame currently on screen.** A card named
 *     ten frames ago that is now back in a hidden zone prints as `#42` here, not
 *     as the name the client used to know (§3.6 rule 1, report 06 §0.6).
 *
 * §14 rule 4: every fact the arrows will draw in evening 3 is also text, and
 * this is where the text lives.
 */

import type { GameEvent, GameStateBody } from '../protocol.ts';
import type { ClientState, LogEntry, TimestampedNotice } from '../reduce.ts';
import { describeEvent } from './describe.ts';
import { cardLabel, entityLabel, findCard, playerName } from './resolve.ts';

export function LogDrawer({
  state,
  board,
  clientNotices,
  open,
  onToggle,
}: {
  state: ClientState;
  board: GameStateBody | null;
  clientNotices: readonly TimestampedNotice[];
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <>
      <button
        type="button"
        className={`drawer__handle${open ? ' drawer__handle--open' : ''}`}
        aria-expanded={open}
        onClick={onToggle}
        title="the running log, notices, this frame's events, combat and the session header"
      >
        {open ? '‹ close' : '› log & details'}{' '}
        <span className="muted">
          {state.log.length} entries · {state.notices.length} notices
        </span>
      </button>

      {open && (
        <div className="drawer" aria-label="Log and details">
          <Section title={`Log (${String(state.log.length)} entries, newest first, capped at 500)`}>
            {state.log.length === 0 ? (
              <p className="muted">nothing has happened yet</p>
            ) : (
              <ol className="drawer__log">
                {state.log
                  .slice(-80)
                  .reverse()
                  .map((entry, i) => (
                    <li key={`${String(entry.seq)}-${String(state.log.length - i)}-${entry.kind}`}>
                      <span className="muted">#{entry.seq}</span>{' '}
                      <span className="k">{entry.kind}</span> {logEntryText(entry, board)}
                    </li>
                  ))}
              </ol>
            )}
          </Section>

          <Section title={`Notices (${String(state.notices.length + clientNotices.length)})`}>
            {state.notices.length + clientNotices.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <ul className="drawer__notices">
                {[...state.notices, ...clientNotices].slice(-40).map((notice) => (
                  <li
                    key={`${String(notice.seq)}-${String(notice.t)}-${notice.title}`}
                    className={`notice notice--${notice.level}`}
                  >
                    <strong>{notice.title}</strong> {notice.text}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Events in this frame (${String(state.events.length)})`}>
            {state.events.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <ol className="drawer__events">
                {state.events.map((event: GameEvent, i) => (
                  <li key={`${String(i)}-${event.kind}`}>
                    <span className="k">{event.kind}</span> {describeEvent(event)}
                  </li>
                ))}
              </ol>
            )}
            {state.droppedEventKinds.length > 0 && (
              <p className="hint">
                dropped unknown event kinds: {state.droppedEventKinds.join(', ')} (docs/protocol.md
                §3.6 rule 3)
              </p>
            )}
          </Section>

          {board !== null && (
            <Section title="Combat">
              {board.combat === null ? (
                <p className="muted">not in combat</p>
              ) : board.combat.bands.length === 0 ? (
                <p className="muted">no attackers declared</p>
              ) : (
                <ul className="drawer__bands">
                  {board.combat.bands.map((band, i) => (
                    <li key={`${String(i)}-${band.attackerIds.join('.')}`}>
                      <strong>{band.attackerIds.map((id) => cardLabel(board, id)).join(', ')}</strong>
                      {' → '}
                      {entityLabel(board, band.defender)}
                      {band.blockerIds.length === 0 ? (
                        <span className="muted"> · unblocked</span>
                      ) : (
                        <>
                          {' blocked by '}
                          {band.blockerIds.map((id) => cardLabel(board, id)).join(', ')}
                          {band.damageOrder.length > 0 && (
                            <span className="muted">
                              {' '}
                              · damage order {band.damageOrder.map((id) => `#${String(id)}`).join(' → ')}
                            </span>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {board !== null && board.stackCards.length > 0 && (
            <Section title={`Cards on the stack (${String(board.stackCards.length)})`}>
              <ul className="drawer__cards">
                {board.stackCards.map((card) => (
                  <li key={card.id}>{cardLabel(board, card.id)}</li>
                ))}
              </ul>
            </Section>
          )}

          <SessionSection state={state} />
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="drawer__section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/**
 * Ids only, resolved against the frame on screen — never a remembered name.
 *
 * An id that does not resolve **prints "a card"** (report 10 §3.9, §10), with
 * the id after it so a bug report is still actionable. That is the honest answer
 * and it is the common one: the log entry for a card that went to an opponent's
 * hand three frames ago names an id this frame has no business naming, and the
 * alternative — remembering what it was called — is the leak report 06 §0.6
 * places in the client rather than in `Snap.java`.
 */
function logEntryText(entry: LogEntry, board: GameStateBody | null): string {
  const cards = entry.cardIds.map((id) =>
    board === null || findCard(board, id) === undefined
      ? `a card (#${String(id)})`
      : cardLabel(board, id),
  );
  const players = entry.playerIds.map((id) =>
    board === null ? `player ${String(id)}` : playerName(board, id),
  );
  return [...cards, ...players].join(', ');
}

function SessionSection({ state }: { state: ClientState }): JSX.Element {
  const { hello, session } = state;
  return (
    <section className="drawer__section">
      <h3>Session</h3>
      <dl className="drawer__meta">
        {session !== null && (
          <>
            <dt>log</dt>
            <dd>
              {session.gameId} · started {session.startedAt} · seed{' '}
              {session.seed === null ? 'none' : session.seed} · seat {session.seat}
            </dd>
            <dt>decks</dt>
            <dd>
              {/* §8.1: only the viewing seat's entry names a file — a path plus a
                  sha256 identifies a decklist, and this log is one seat's. */}
              {session.decks
                .map((deck) =>
                  deck.path === null
                    ? `p${String(deck.player)} ${String(deck.cards)} cards`
                    : `p${String(deck.player)} ${deck.path} (${(deck.sha256 ?? '').slice(0, 8)}…, ` +
                      `${String(deck.cards)} cards)`,
                )
                .join(', ')}
            </dd>
          </>
        )}
        {hello !== null && (
          <>
            <dt>engine</dt>
            <dd>
              Forge {hello.forgeVersion} · jar {hello.forgeJarSha256.slice(0, 12)}…
            </dd>
            <dt>players</dt>
            <dd>
              {hello.players
                .map((p) => `${p.name} (#${String(p.id)}, ${p.isAi ? 'AI' : 'human'})`)
                .join(' vs ')}
            </dd>
            {hello.unsupportedCards.length > 0 && (
              <>
                <dt>unsupported cards</dt>
                <dd className="notice notice--warn">{hello.unsupportedCards.join(', ')}</dd>
              </>
            )}
          </>
        )}
        <dt>frames applied</dt>
        <dd>{state.framesApplied}</dd>
      </dl>
    </section>
  );
}
