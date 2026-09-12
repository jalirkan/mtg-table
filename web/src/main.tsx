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
 * **The keyboard moved into `<Board>` in M4** (report 10 §12.2 rule 1). M3 kept
 * it here because `Board.tsx` had no effects and the render test folds every
 * frame of every fixture through `renderToStaticMarkup`, which runs none — but
 * that is still true with the listener inside the board: an effect that never
 * runs under SSR costs the test nothing, and the alternative was two handlers
 * for one keyboard, only one of which the `?` overlay could describe. The map
 * itself is `web/src/keys.ts`: pure, unit-tested, and the single source for both
 * the handler and the help screen.
 */

import { StrictMode, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { EMPTY_ART_INDEX, loadArtIndex, preloadArt, type ArtIndex } from './art.ts';
import type { AnswerValue, ManaColor } from './protocol.ts';
import { Board, type BoardActions } from './render/Board.tsx';
import { ErrorBoundary } from './render/ErrorBoundary.tsx';
import { ReplayControls } from './render/ReplayControls.tsx';
import { LogReplayTransport, parseFrameLog } from './transport/replay.ts';
import { DEFAULT_WS_PORT, WebSocketTransport, type WsStatus } from './transport/ws.ts';
// M5 (M4 follow-up 1): our own extract of `mana-font`, in place of the
// package's stylesheet. `mana.css@1.18.0` opens with two `@font-face` blocks
// naming eot/woff/ttf/svg for Mana AND for MPlantin, which the bundler faithfully
// emitted: nine font files, 3.72 MB, of which the browser ever fetched exactly
// one — the 187 KB `mana.woff2` that `styles.css` overrode them with. `mana.css`
// here is the same rules with those two blocks gone (see its header).
import './mana.css';
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
    void loadArtIndex().then((index) => {
      setArt(index);
      // Report 10 §4.2: ~1.0 MB of `grid` WEBP, once. Scryfall answers
      // `cache-control: public, max-age=31556952`, so the second game and every
      // reload are instant. A failure here is cosmetic by construction.
      preloadArt(index);
    });
  }, []);
  return art;
}

/**
 * The credit line, in the top bar rather than in a footer of its own: at
 * 1600x900 the board's fixed rows already claim 736 px of the 900, and a second
 * chrome strip would come out of the hand row (report 10 §2.2).
 */
function Credits(): JSX.Element {
  return (
    <span className="app__credit">
      Card images and data from <a href="https://scryfall.com">Scryfall</a> · engine{' '}
      <a href="https://github.com/Card-Forge/forge">Forge</a> (GPLv3) · mana symbols via mana-font
      (MIT/OFL) · Unofficial Fan Content — not approved or endorsed by Wizards of the Coast.
    </span>
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
      // M5 — §2.2. A colour and nothing else: tapping a land for mana is a
      // `clickCard` on the land, and this is what spends what that produced.
      useMana: (color: ManaColor) => {
        transport.act({ action: 'useMana', color });
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

  // M4 evening 3: the keyboard moved into `<Board>` (report 10 §12.2 rule 1 —
  // ONE listener, registered once, reading the current state through a ref) and
  // is driven by the pure table in `web/src/keys.ts`, which is also what the `?`
  // overlay renders. Two handlers for one keyboard is how `H` opens a help
  // screen that lists a key nothing implements.

  return (
    <div className="app">
      {/* One thin bar. Every pixel of chrome above the board is a pixel the hand
          row does not have (report 10 §2.2), so the title, the seat, the socket
          status and the credits share a single 26 px line. */}
      <div className="app__bar">
        <h1>mtg-table</h1>
        <span className="muted">
          live · seat {state.hello === null ? '—' : state.hello.you} · Space = OK, Escape = Cancel,
          H = keys
        </span>
        <StatusBar status={status} onResync={resync} onReconnect={reconnect} />
        <ArtMisses art={art} />
        <Credits />
      </div>

      {/* Banners float over the board instead of shortening it. */}
      <div className="app__overlays">
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
      </div>

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
    </div>
  );
}

/**
 * `art.json` is gitignored and generated; a miss renders as the text card frame
 * and blocks nothing, so this is a chip in the bar rather than a banner. It is
 * never swallowed, because "why is that one card text" is otherwise unanswerable
 * without reading the console.
 */
function ArtMisses({ art }: { art: ArtIndex }): JSX.Element | null {
  if (art.misses.length === 0) return null;
  return (
    <span className="muted" title={art.misses.join(', ')}>
      art misses: {art.misses.length} (text frames)
    </span>
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
      <div className="app__bar">
        <h1>mtg-table — replay</h1>
        <span className="muted">/fixtures/{load.path}</span>
        <ArtMisses art={art} />
        <Credits />
      </div>

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

      <div className="app__overlays">
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
      </div>

      {/* §1's unknown-frame policy, applied to the render half: a drift that
          survives `reduce()` must be a banner naming the frame, not a blank
          page. The boundary wraps only <Board>, so <ReplayControls> above stays
          mounted and the user can step back off the frame that threw; moving to
          a different frame clears it. */}
      <ErrorBoundary resetKey={transport.index} label="The board" frame={frame}>
        {/* No `actions`: a replay has no server, and a control that did nothing
            would be worse than a disabled one. The board renders Read-only and
            every affordance is inert — that is the whole of the difference
            between the two modes. */}
        <Board state={transport.state} art={art} />
      </ErrorBoundary>
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
