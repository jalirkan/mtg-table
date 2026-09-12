/*
 * mtg-table — main.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Two modes, one board (docs/research/05-architecture-synthesis.md §4):
 *
 *     /?replay=games/g1.jsonl     a `.jsonl` frame log, no JVM        [M1]
 *     /?ws=1   (the default)      ws://127.0.0.1:8642/ws, a live seat [M3]
 *
 * `?replay=` is a path under `fixtures/`, which the dev server mounts at
 * `/fixtures/` (see vite.config.ts). `?port=` overrides the WebSocket port,
 * whose default is a build-time constant (`transport/ws.ts`).
 *
 * **The mode switch is the whole of the difference.** `<Board>` takes the same
 * `ClientState` either way; what M3 adds is an `actions` object, and a replay
 * passes `null` for it because a replay has no server to send an `act` to.
 *
 * The keyboard lives here rather than in `Board.tsx`:
 *
 *   - **Space = OK, Escape = Cancel**, and only when the engine has that button
 *     enabled. They are not Forge shortcuts we are reimplementing — `Space`
 *     activates the *focused* button in Forge's own desktop UI, which is what
 *     `input.buttons.focus` (§10.2, not yet on the wire) will let us honour
 *     properly. Until then this is the two-button case, which is every case;
 *   - a window listener is an effect, and `Board.tsx` has none on purpose:
 *     `web/test/render.test.tsx` renders every frame of every fixture with
 *     `renderToStaticMarkup`, which runs no effects at all.
 */

import { StrictMode, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { EMPTY_ART_INDEX, loadArtIndex, type ArtIndex } from './art.ts';
import type { AnswerValue } from './protocol.ts';
import { Board, type BoardActions } from './render/Board.tsx';
import { ErrorBoundary } from './render/ErrorBoundary.tsx';
import { ReplayControls } from './render/ReplayControls.tsx';
import { LogReplayTransport, parseFrameLog } from './transport/replay.ts';
import { DEFAULT_WS_PORT, WebSocketTransport, type WsStatus } from './transport/ws.ts';
import './styles.css';

/** Where `./bridge/run.sh mtgtable.RecordMatch --out fixtures/games/g1.jsonl` lands. */
const DEFAULT_REPLAY = 'games/g1.jsonl';
/**
 * The hand-built log (`fixtures/synthetic/`, not `fixtures/games/`) so the UI
 * runs before the recorder has ever been run. It is deliberately *not* under
 * `fixtures/games/`: it was written by the same hand as `protocol.ts`, so it
 * cannot detect Java↔TypeScript drift and must not inflate the contract test.
 */
const FALLBACK_REPLAY = 'synthetic/sample-handwritten.jsonl';

// ---------------------------------------------------------------------------
// Mode
// ---------------------------------------------------------------------------

type Mode = { kind: 'replay'; path: string } | { kind: 'ws'; port: number };

/**
 * `?replay=` wins; anything else is the live socket, `?ws=1` or not.
 *
 * The default changed in M3: with no query at all the board now tries to play a
 * game rather than open the primary fixture, which is contract (f) — the URL
 * `./scripts/play.sh` opens is `http://127.0.0.1:5173/?ws=1`, and a bare
 * `http://127.0.0.1:5173/` must do the same thing. `npm run dev:replay` still
 * opens the replay.
 */
function modeFromQuery(): Mode {
  const params = new URLSearchParams(window.location.search);
  const replay = params.get('replay');
  if (replay !== null && replay.trim() !== '') {
    return { kind: 'replay', path: replay.trim().replace(/^\/+/, '') };
  }
  const port = Number.parseInt(params.get('port') ?? '', 10);
  return { kind: 'ws', port: Number.isFinite(port) && port > 0 ? port : DEFAULT_WS_PORT };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function useArt(): ArtIndex {
  const [art, setArt] = useState<ArtIndex>(EMPTY_ART_INDEX);
  useEffect(() => {
    void loadArtIndex().then(setArt);
  }, []);
  return art;
}

function Footer(): JSX.Element {
  return (
    <footer className="app__foot muted">
      Card images and data from <a href="https://scryfall.com">Scryfall</a>. Rules engine:{' '}
      <a href="https://github.com/Card-Forge/forge">Forge</a> (GPLv3). Unofficial Fan Content — not
      approved or endorsed by Wizards of the Coast.
    </footer>
  );
}

/** §1 — an unknown type / ask.kind / v mismatch is a loud banner, never a silent skip. */
function FrameErrorBanner({
  message,
  frameIndex,
  frame,
  onResync,
}: {
  message: string;
  frameIndex: number;
  frame: unknown;
  onResync?: (() => void) | null;
}): JSX.Element {
  return (
    <div className="banner banner--error" role="alert">
      <strong>Frame rejected at index {frameIndex}.</strong>
      <div>{message}</div>
      {onResync != null && (
        <button type="button" className="btn" onClick={onResync}>
          Clear and resync
        </button>
      )}
      {frame != null && <pre>{JSON.stringify(frame, null, 2).slice(0, 2000)}</pre>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live mode — the WebSocket seat (M3)
// ---------------------------------------------------------------------------

/**
 * One transport per page, kept on `window`.
 *
 * `<StrictMode>` mounts, unmounts and re-mounts every component in development.
 * A transport created in an effect would therefore open a socket, close it and
 * open another — and contract (c) says the server takes **one client at a time**
 * and refuses the second with a close code. So the socket outlives the
 * component tree, exactly as the React root does two screens down.
 */
interface WsHolder {
  __mtgTableWs?: WebSocketTransport;
}

function liveTransport(port: number): WebSocketTransport {
  const holder = window as unknown as WsHolder;
  const existing = holder.__mtgTableWs;
  if (existing !== undefined && existing.url.includes(`:${String(port)}/`)) return existing;
  existing?.close();
  const made = new WebSocketTransport({ port });
  holder.__mtgTableWs = made;
  return made;
}

function StatusBar({
  status,
  onResync,
  onReconnect,
}: {
  status: WsStatus;
  onResync: () => void;
  onReconnect: () => void;
}): JSX.Element {
  return (
    <div className={`wsbar wsbar--${status.status}`} role="status">
      <span className={`wsbar__dot wsbar__dot--${status.status}`} aria-hidden="true" />
      <strong>{status.status}</strong>
      <code>{status.url}</code>
      <span className="muted">
        in {status.framesIn} · out {status.framesOut}
        {status.dropped > 0 && ` · dropped ${String(status.dropped)}`}
        {status.attempts > 0 && ` · attempt ${String(status.attempts)}`}
        {status.retryInMs !== null && ` · retrying in ${String(Math.round(status.retryInMs))} ms`}
      </span>
      {status.lastError !== null && <span className="muted">{status.lastError}</span>}
      <button type="button" className="btn btn--small" onClick={onResync}>
        Resync
      </button>
      <button type="button" className="btn btn--small" onClick={onReconnect}>
        Reconnect
      </button>
    </div>
  );
}

function LiveApp({ port }: { port: number }): JSX.Element {
  const art = useArt();
  const transport = useMemo(() => liveTransport(port), [port]);
  // The transport is mutable; this counter is what tells React to re-read it.
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const offState = transport.onState(() => {
      bump();
    });
    const offStatus = transport.onStatus(() => {
      bump();
    });
    transport.connect();
    // NOTE: no `transport.close()` here. See `liveTransport` — the socket is
    // page-scoped, and StrictMode's remount must not be a disconnect.
    return () => {
      offState();
      offStatus();
    };
  }, [transport]);

  const state = transport.state;
  const status = transport.status;

  const actions = useMemo<BoardActions>(
    () => ({
      clickCard: (cardId: number) => {
        transport.act({ action: 'clickCard', cardId });
      },
      clickPlayer: (playerId: number) => {
        transport.act({ action: 'clickPlayer', playerId });
      },
      buttonOk: () => {
        transport.act({ action: 'buttonOk' });
      },
      buttonCancel: () => {
        transport.act({ action: 'buttonCancel' });
      },
      concede: () => {
        transport.act({ action: 'concede' });
      },
      answer: (askId: string, value: AnswerValue) => {
        transport.answer(askId, value);
      },
    }),
    [transport],
  );

  const resync = useCallback(() => {
    transport.resync();
  }, [transport]);
  const reconnect = useCallback(() => {
    transport.reconnect();
  }, [transport]);

  // Space = OK, Escape = Cancel — and only when the engine enabled that button.
  const okEnabled = state.input?.buttons.ok.enabled === true;
  const cancelEnabled = state.input?.buttons.cancel.enabled === true;
  const live = state.ask === null && state.gameOver === null && status.status === 'open';
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      // `target?.tagName.toLowerCase()` is not enough: an event dispatched at
      // `window` or `document` has a target with no `tagName` at all, and the
      // optional chain guards only the null target, so the handler threw for
      // exactly the events that are hardest to notice. Measured in the browser.
      const tag = typeof target?.tagName === 'string' ? target.tagName.toLowerCase() : '';
      // A control has its own idea of what these keys mean: Space presses the
      // focused button, Escape leaves a field. Never take them from it.
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
      if (target?.isContentEditable === true) return;
      if (!live) return;
      // `event.code === 'Space'` is the physical-key spelling, and it is here
      // because `key` alone is not testable: an automation driver delivers Space
      // as `{key: "", code: "", keyCode: 0}` (measured with a keydown recorder
      // in the live page, while Escape arrived correctly as `{key: "Escape"}`),
      // and a remapped layout can report anything at all in `key`. Any driver or
      // layout that sets `code` agrees on this one.
      if (event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space') {
        if (!okEnabled) return;
        event.preventDefault();
        actions.buttonOk();
      } else if (event.key === 'Escape' || event.key === 'Esc') {
        if (!cancelEnabled) return;
        event.preventDefault();
        actions.buttonCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [actions, live, okEnabled, cancelEnabled]);

  return (
    <div className="app">
      <header className="app__head">
        <h1>mtg-table</h1>
        <span className="muted">
          live · seat {state.hello === null ? '—' : state.hello.you} · Space = OK, Escape = Cancel
        </span>
      </header>

      <StatusBar status={status} onResync={resync} onReconnect={reconnect} />

      {transport.error !== null && (
        <FrameErrorBanner
          message={transport.error.message}
          frameIndex={transport.error.frameIndex}
          frame={transport.error.frame}
          onResync={() => {
            transport.clearErrorAndResync();
          }}
        />
      )}

      {state.board === null && status.status !== 'open' && (
        <div className="banner banner--warn">
          <strong>Waiting for the bridge.</strong>
          <div>
            Start it with <code>./scripts/play.sh</code>, or{' '}
            <code>./bridge/run.sh mtgtable.MtgTable --transport ws --port {port}</code>.
          </div>
        </div>
      )}

      {art.misses.length > 0 && (
        <p className="pad muted">
          art misses ({art.misses.length}): {art.misses.join(', ')} — these render as text cards.
        </p>
      )}

      {/* The render half of §1's unknown-frame policy: a drift that survives
          `reduce()` must be a banner naming the frame, not a blank page. */}
      <ErrorBoundary resetKey={state.framesApplied} label="The board">
        <Board
          state={state}
          art={art}
          actions={actions}
          clientNotices={transport.clientNotices}
        />
      </ErrorBoundary>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Replay mode — unchanged from M1 apart from being one branch of two
// ---------------------------------------------------------------------------

type LoadState =
  | { status: 'loading'; path: string }
  | { status: 'error'; path: string; message: string }
  | { status: 'ready'; path: string; transport: LogReplayTransport };

/**
 * In-flight and completed log fetches, keyed by path.
 *
 * `<StrictMode>` deliberately mounts, unmounts and re-mounts every component in
 * development, which runs the load effect twice — and the dev server sends
 * `Cache-Control: no-store`, so without this the browser really does download
 * g1.jsonl (3.5 MB) twice on every page load. Keeping the *promise* rather than
 * guarding with a flag means the second invocation joins the first request
 * instead of starting another one, and StrictMode keeps doing its job.
 *
 * A rejected fetch is evicted, so the fallback ladder below can still retry.
 */
const logCache = new Map<string, Promise<string>>();

async function fetchLog(path: string): Promise<string> {
  const cached = logCache.get(path);
  if (cached !== undefined) return cached;

  const pending = (async () => {
    const response = await fetch(`/fixtures/${path}`, {
      headers: { Accept: 'application/x-ndjson' },
    });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)} for /fixtures/${path}`);
    return response.text();
  })();
  logCache.set(path, pending);
  pending.catch(() => logCache.delete(path));
  return pending;
}

function ReplayApp({ requested }: { requested: string }): JSX.Element {
  const art = useArt();
  const [load, setLoad] = useState<LoadState>({ status: 'loading', path: requested });
  // The transport is mutable; this counter is what tells React to re-read it.
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    let created: LogReplayTransport | null = null;

    void (async () => {
      let path = requested;
      let text: string;
      try {
        text = await fetchLog(path);
      } catch (first) {
        if (requested !== DEFAULT_REPLAY) {
          if (!cancelled) {
            setLoad({ status: 'error', path, message: (first as Error).message });
          }
          return;
        }
        // The recorder has not run yet. Fall back to the committed hand-written log.
        try {
          path = FALLBACK_REPLAY;
          text = await fetchLog(path);
        } catch (second) {
          if (!cancelled) {
            setLoad({
              status: 'error',
              path: requested,
              message: `${(first as Error).message}; then ${(second as Error).message}`,
            });
          }
          return;
        }
      }
      if (cancelled) return;
      created = new LogReplayTransport(parseFrameLog(text));
      created.onState(() => {
        bump();
      });
      setLoad({ status: 'ready', path, transport: created });
    })();

    return () => {
      cancelled = true;
      created?.close();
    };
  }, [requested]);

  if (load.status === 'loading') {
    return <p className="pad muted">loading /fixtures/{load.path}…</p>;
  }

  if (load.status === 'error') {
    return (
      <div className="pad">
        <div className="banner banner--error">
          <strong>Could not load /fixtures/{load.path}</strong>
          <div>{load.message}</div>
        </div>
        <p className="muted">
          Record one with{' '}
          <code>
            ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 --out
            fixtures/games/g1.jsonl
          </code>
          , or pass <code>?replay=synthetic/sample-handwritten.jsonl</code>. To play a live game
          instead, drop the <code>?replay=</code> and start the bridge.
        </p>
      </div>
    );
  }

  const transport = load.transport;
  const frame = transport.currentFrame;

  return (
    <div className="app">
      <header className="app__head">
        <h1>mtg-table — replay</h1>
        <span className="muted">/fixtures/{load.path}</span>
      </header>

      <ReplayControls
        index={transport.index}
        total={transport.total}
        playing={transport.playing}
        speed={transport.speed}
        currentType={frame?.type ?? null}
        currentDir={frame?.dir ?? null}
        onPrev={() => transport.stepBack()}
        onNext={() => transport.stepForward()}
        onToggle={() => {
          transport.toggle();
        }}
        onScrub={(index) => {
          transport.scrubTo(index);
        }}
        onSpeed={(speed) => {
          transport.setSpeed(speed);
        }}
      />

      {transport.error !== null && (
        <FrameErrorBanner
          message={transport.error.message}
          frameIndex={transport.error.frameIndex}
          frame={transport.error.frame}
        />
      )}

      {transport.warnings.length > 0 && (
        <div className="banner banner--warn">
          <strong>Log warnings:</strong>
          <ul>
            {transport.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {art.misses.length > 0 && (
        <p className="pad muted">
          art misses ({art.misses.length}): {art.misses.join(', ')} — these render as text cards.
        </p>
      )}

      {/* §1's unknown-frame policy, applied to the render half: a drift that
          survives `reduce()` must be a banner naming the frame, not a blank
          page. The boundary wraps only <Board>, so <ReplayControls> above stays
          mounted and the user can step back off the frame that threw; moving to
          a different frame clears it. */}
      <ErrorBoundary resetKey={transport.index} label="The board" frame={frame}>
        {/* No `actions`: a replay has no server, and a control that did nothing
            would be worse than a disabled one. */}
        <Board state={transport.state} art={art} />
      </ErrorBoundary>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function App(): JSX.Element {
  const mode = useMemo(modeFromQuery, []);
  return mode.kind === 'replay' ? (
    <ReplayApp requested={mode.path} />
  ) : (
    <LiveApp port={mode.port} />
  );
}

const container = document.getElementById('root');
if (container === null) throw new Error('index.html has no #root element');

// Cache the root across hot updates. Without this, editing main.tsx re-runs the
// module and React warns that createRoot was already called on this container.
interface RootHolder {
  __mtgTableRoot?: Root;
}
const holder = window as unknown as RootHolder;
holder.__mtgTableRoot ??= createRoot(container);
holder.__mtgTableRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
