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
 * **M7 adds a second renderer, not a second app.** `#arena` (or `?view=arena`)
 * swaps `<Board>` for `<Arena>` over the *same* `ClientState`: the transport,
 * the reducer and the frame stream are untouched, and switching views mid-game
 * drops nothing. The arena is `lazy()`-imported so the 2D entry chunk does not
 * grow by the 3D stack — measured, and it is the reason the import below is
 * dynamic (report 09 §1.3).
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

import {
  StrictMode,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { EMPTY_ART_INDEX, loadArtIndex, preloadArt, type ArtIndex } from './art.ts';
import type {
  ActBody,
  AnswerValue,
  ManaColor,
  SetYieldMode,
  YieldKind,
  YieldToAct,
} from './protocol.ts';
import { gameLabel } from './reduce.ts';
import { Board, type BoardActions } from './render/Board.tsx';
import { ErrorBoundary } from './render/ErrorBoundary.tsx';
import { ReplayControls } from './render/ReplayControls.tsx';
import { LogReplayTransport, parseFrameLog } from './transport/replay.ts';
import { DEFAULT_WS_PORT, WebSocketTransport, type WsStatus } from './transport/ws.ts';
import { useView, type View } from './useView.ts';
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

/**
 * **The arena chunk, fetched only when someone opens it** (report 09 §1.3).
 *
 * `three` + `@react-three/fiber` + `@react-three/drei` are ~240 kB gzip. A
 * static import would put every byte of that in the entry chunk, on the 2D
 * board's critical path, for a renderer most sessions never open. `npm run
 * build` prints both chunk sizes and `docs/evidence/m7-arena.md` records them.
 */
const Arena = lazy(() => import('./arena/Arena.tsx'));

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

/**
 * The arena's two debug switches, read once. Both default off: a grid under 40
 * cards is noise, and drei's `<Stats>` panel is a DOM overlay in the corner.
 *
 *     ?stats=1   drei <Stats> — the fps / ms / MB panel
 *     ?grid=1    a debug grid in card-height units
 */
interface ArenaFlags {
  stats: boolean;
  grid: boolean;
  /**
   * `?arena=off` — the kill switch (report 09 §11, E6).
   *
   * WebGL is the one thing in this app that can fail for a reason the user
   * cannot see: a driver, a blocklisted GPU, a remote session with no hardware
   * context. With it set, `#arena` renders the 2D board and says why, so a
   * bookmarked arena URL can never be a page that will not come up.
   */
  off: boolean;
  /**
   * `?dpr=0.75` — pin the arena's render resolution (report 09 §9.2 rule 9).
   *
   * The automatic ladder is `<PerformanceMonitor>` inside the arena; this is the
   * hand control beside it, and it exists because the scene is **fill-rate
   * bound** (measured: SwiftShader at 1920×1080 p50 19.4 ms, at 1280×633 p50
   * 8.0 ms, same 35 draw calls) — so on a machine that cannot hold 60, the one
   * number worth turning down is this one.
   */
  dpr: number | null;
  /**
   * `?glinfo=1` — expose `gl.info`'s counters on `window.__mtgArena.info()` from
   * a **production** build (report 09 §9.1's draw-call budget).
   *
   * `tools/arena-bench.mjs` measures the built bundle on purpose, and the dev
   * handle it was reading is `import.meta.env.DEV`-only, so its draw-call line
   * silently came from a dev build while the frame times beside it came from the
   * production one. Off by default; six numbers and nothing else.
   */
  glinfo: boolean;
}

function arenaFlagsFromQuery(): ArenaFlags {
  const params = new URLSearchParams(window.location.search);
  const on = (key: string): boolean => {
    const value = params.get(key);
    return value !== null && value !== '0' && value !== 'false';
  };
  const arena = params.get('arena');
  const dpr = Number.parseFloat(params.get('dpr') ?? '');
  return {
    stats: on('stats'),
    grid: on('grid'),
    off: arena === 'off' || arena === '0',
    dpr: Number.isFinite(dpr) && dpr >= 0.25 && dpr <= 3 ? dpr : null,
    glinfo: on('glinfo'),
  };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/**
 * Board ⇄ Arena. A link and not a `<button>` because it really is a URL: the
 * hash is the state (`web/src/useView.ts`), so middle-click, bookmark and Back
 * all behave, and `npm run dev:arena` opens the same page the toggle would.
 *
 * **It is not the only way across.** `V` is a row of `web/src/keys.ts` — the one
 * tested table both renderers read (CLAUDE.md, M4 convention 4) — and E6 added
 * it there rather than as a handler of its own, so the `?`/`H` overlay lists it
 * for free. The key is handled in `arena/Arena.tsx` (arena → board) and in
 * `render/Board.tsx` (board → arena); this link and that row do the same thing
 * through the same `setView`, which is why neither can drift from the other.
 */
function ViewToggle({ view, onSet }: { view: View; onSet: (view: View) => void }): JSX.Element {
  const next: View = view === 'arena' ? 'board' : 'arena';
  return (
    <a
      className="viewtoggle"
      href={next === 'arena' ? '#arena' : '#'}
      onClick={(event) => {
        event.preventDefault();
        onSet(next);
      }}
      title={next === 'arena' ? 'Open the 3D arena (#arena)' : 'Back to the 2D board'}
    >
      {next === 'arena' ? '▣ arena' : '▤ board'}
    </a>
  );
}

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

function LiveApp({ port, view, onSetView }: { port: number; view: View; onSetView: (view: View) => void }): JSX.Element {
  const art = useArt();
  const flags = useMemo(arenaFlagsFromQuery, []);
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

      // M6 — five more acts, and not a line of logic between the control and
      // the wire: every one of them is `transport.act` with the body §2.2
      // spells out, and every effect arrives as the next `state` / `input`.
      undo: () => {
        transport.act({ action: 'undo' });
      },
      passPriority: () => {
        transport.act({ action: 'passPriority' });
      },
      alphaStrike: () => {
        transport.act({ action: 'alphaStrike' });
      },
      yieldTo: (kind: YieldKind, phase?: string, turn?: 'own' | 'opp') => {
        const body: YieldToAct = { action: 'yieldTo', kind };
        if (phase !== undefined) body.phase = phase;
        // The marker's column. Without it the bridge defaults to the viewer,
        // and "before my turn" lands on the viewer's OWN end step — measured in
        // the browser, 2026-09-12 (docs/evidence/m6-board.md).
        if (turn !== undefined) body.turn = turn;
        transport.act(body);
      },
      setYield: (yieldKey: string, mode: SetYieldMode) => {
        transport.act({ action: 'setYield', yieldKey, mode });
      },
      setPhaseStop: (phase: string, turn: 'own' | 'opp', stop: boolean) => {
        transport.act({ action: 'setPhaseStop', phase, turn, stop });
      },
      newGame: (mode: 'continue' | 'restart') => {
        transport.act({ action: 'newGame', mode });
      },
    }),
    [transport],
  );

  // The arena sends acts the same way the board's `actions` object does — one
  // function, the act verbatim, no logic between the click and the wire.
  const onAct = useCallback(
    (act: ActBody) => {
      transport.act(act);
    },
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
          live · seat {state.hello === null ? '—' : state.hello.you}
          {/* M6 — a match is more than one game, and each one is a new
              `hello_ok` with a new `gameId` (§2.1). The number is the reducer's
              own count unless the bridge ships one. */}
          {gameLabel(state) !== null && <> · {gameLabel(state)}</>} · Space = the focused button,
          Escape = Cancel, H = keys
        </span>
        <ViewToggle view={view} onSet={onSetView} />
        {flags.off && view === 'arena' && (
          <span className="muted">?arena=off — the 3D arena is disabled; this is the board</span>
        )}
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
        {view === 'arena' && !flags.off ? (
          <Suspense fallback={<p className="pad muted">loading the arena…</p>}>
            <Arena
              state={state}
              art={art}
              onAct={onAct}
              // The arena is a seat, not a spectator: the same act function the
              // board's `actions` object wraps, the same `answer` the ask modals
              // send, and the same socket state the New Game row reads.
              onAnswer={(askId, value) => {
                transport.answer(askId, value);
              }}
              connected={status.status === 'open'}
              onSetView={onSetView}
              showStats={flags.stats}
              showGrid={flags.grid}
              dpr={flags.dpr}
              glInfo={flags.glinfo}
            />
          </Suspense>
        ) : (
          <Board
            state={state}
            art={art}
            actions={actions}
            clientNotices={transport.clientNotices}
            // M6 fix — the New Game row is the one control that must know. It
            // appears at `over`, and an act sent into a closed socket is a toast
            // and nothing else (`DecisionPanel`'s `NewGameRow`).
            connected={status.status === 'open'}
            // M7 verification fix — `V` is a row of the one keymap and the board
            // has to handle it, or the only view that prints the key table is
            // the one view where the key is dead.
            onSetView={onSetView}
          />
        )}
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

function ReplayApp({
  requested,
  view,
  onSetView,
}: {
  requested: string;
  view: View;
  onSetView: (view: View) => void;
}): JSX.Element {
  const art = useArt();
  const flags = useMemo(arenaFlagsFromQuery, []);
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
        <ViewToggle view={view} onSet={onSetView} />
        {flags.off && view === 'arena' && (
          <span className="muted">?arena=off — the 3D arena is disabled; this is the board</span>
        )}
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
        {/* No `actions` / no `onAct`: a replay has no server, and a control that
            did nothing would be worse than a disabled one. Both renderers are
            read-only and every affordance is inert — that is the whole of the
            difference between the two modes, and the arena inherits it for free
            because it takes the same prop the board does.

            The controls above drive BOTH: prev / next / play / speed / scrub are
            transport controls, they move the same `LogReplayTransport` through
            the same pure `reduce()`, and the arena is a function of its output.
            Scrubbing backwards re-folds from the session header (M1), which is
            why a 3D scene can follow it at all. */}
        {view === 'arena' && !flags.off ? (
          <Suspense fallback={<p className="pad muted">loading the arena…</p>}>
            <Arena
              state={transport.state}
              art={art}
              onAct={null}
              onSetView={onSetView}
              showStats={flags.stats}
              showGrid={flags.grid}
              dpr={flags.dpr}
              glInfo={flags.glinfo}
            />
          </Suspense>
        ) : (
          <Board state={transport.state} art={art} onSetView={onSetView} />
        )}
      </ErrorBoundary>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function App(): JSX.Element {
  const mode = useMemo(modeFromQuery, []);
  // One `useView` for the page, above both modes: the view is a property of the
  // window, not of the transport, and neither app may re-mount when it changes.
  const [view, setView] = useView();
  return mode.kind === 'replay' ? (
    <ReplayApp requested={mode.path} view={view} onSetView={setView} />
  ) : (
    <LiveApp port={mode.port} view={view} onSetView={setView} />
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
