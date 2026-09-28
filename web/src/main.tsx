/*
 * mtg-table — main.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Two modes, one board (docs/research/05-architecture-synthesis.md §4):
 *
 *     /?replay=games/g1.jsonl     a `.jsonl` frame log, no JVM        [M1]
 *     /?ws=1   (the default)      ws://127.0.0.1:8642/ws, a live seat [M3]
 *     /?replay=spectate/x.jsonl&follow=1
 *                                 an AI-vs-AI game while it is being
 *                                 recorded (./scripts/spectate.sh)    [M47]
 *
 * `?replay=` is a path under `fixtures/`, which the dev server mounts at
 * `/fixtures/` (see vite.config.ts) — or, with the `spectate/` prefix, a
 * recording in `var/spectate/`, which ONLY the dev server mounts, at
 * `/spectate/` (D122). `&follow=1` follows it as it grows (`transport/follow.ts`,
 * D118/D120). `?port=` overrides the WebSocket port, whose default is a
 * build-time constant (`transport/ws.ts`).
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
 * **The workshop is a page, not a third renderer.** `#workshop` (or
 * `?view=workshop`) mounts `web/src/workshop/Workshop.tsx` — lazily, like the
 * arena, so the 2D entry chunk carries none of its code — and mounts it INSTEAD
 * of the replay or live app, exactly as `#cards` mounts the card browser (D94):
 * it builds its own synthetic boards and needs no transport, so none is opened;
 * a live socket already open survives on `window`, a replay resumes at its frame,
 * and the workshop's header says when the live game is waiting on you. `W` in the
 * arena opens it (a `keys.ts` row, dispatched in `App` below because the view is
 * `App`'s — and only while the arena is really mounted, never under
 * `?arena=off`), and the workshop's links go back.
 *
 * **The story is a page over the replay, not a renderer** (D125). `#story` (or
 * `?view=story`) mounts `web/src/story/Story.tsx` — lazily, like the workshop —
 * INSTEAD of the mode app, as `#cards` and `#workshop` do, and for their reason:
 * a hidden board or arena would keep its `window` keydown listeners live under
 * the story's own keys. Unlike those two it reads the replay: `StoryReplay`
 * below loads the same `?replay=` log through the same `useReplayLoad` the
 * replay app uses (the fetch cache, the follow-mode poller, `replayCursors`), so
 * the story opens at the frame the arena was on and the arena comes back at the
 * frame the story was on. The story page itself is handed frames and a cursor
 * and imports no transport.
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
import { planKey, type KeyContext } from './keys.ts';
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
// Types only: the poller itself is imported lazily, by a page that follows a log.
import type { FollowStatus, LogFollower } from './transport/follow.ts';
import { canFollow, LogReplayTransport, logUrlFor, parseFrameLog } from './transport/replay.ts';
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

/**
 * **The card browser, fetched only when someone opens `#cards`** — the same rule
 * as the arena's, for the same reason: it is a page most sessions never open,
 * and none of it belongs on the board's critical path. It needs no transport, so
 * it is chosen above both modes in `App` (docs/evidence/card-library.md).
 */
const CardBrowser = lazy(() => import('./cards/CardBrowser.tsx'));

/**
 * **The workshop's chunk, fetched only when someone opens it** — the same rule
 * as the arena's (D49), for the same reason: it is `three` and the arena's scene,
 * and a session that never opens it never downloads it.
 */
const Workshop = lazy(() => import('./workshop/Workshop.tsx'));

/**
 * **The story page, fetched only when someone opens `#story`** (D125) — the same
 * rule again: it is the narrator and a column of moments, a page most sessions
 * never open, and nothing of it belongs in the 2D entry chunk.
 */
const StoryPage = lazy(() => import('./story/Story.tsx'));

// ---------------------------------------------------------------------------
// Mode
// ---------------------------------------------------------------------------

type Mode = { kind: 'replay'; path: string; follow: boolean } | { kind: 'ws'; port: number };

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
    const path = replay.trim().replace(/^\/+/, '');
    const follow = params.get('follow');
    // Follow mode reads a log that is still being written, which only the
    // spectate route can serve (`?from=`, complete lines); anything else is a
    // finished file and plays as an ordinary replay.
    return { kind: 'replay', path, follow: follow !== null && follow !== '0' && follow !== 'false' && canFollow(path) };
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
  /**
   * `?bloom=1` / `?bloom=0` — where **user decision 6's toggle** starts, for the
   * one post pass the arena has (`arena/scene/Post.tsx`); the checkbox in the
   * arena's cue controls flips it at runtime.
   *
   * `null` means "nobody said", and the default is then `BLOOM_DEFAULT`, which is a
   * measurement (`arena/perf.ts`): ON, because on this machine's GTX 1080 bloom
   * costs p95 1.1 ms against 0.4 without it. Under SwiftShader it is p95 82 ms, so
   * `?bloom=0` is the escape hatch on weak hardware — and the DPR governor drops it
   * by itself when frames are still late at its lowest rung.
   */
  bloom: boolean | null;
  /**
   * **The look** (Lane LOOK, D137) — `?look=holo|comic` and its options
   * (`?ink=none`, `?halftone=0`, `?key=world`, `?stage=felt`, `?shadow=0`), kept
   * as a query string of exactly those keys. The arena parses it with
   * `arena/look.ts`'s `lookFromSearch`, whose default is `perf.ts`'s
   * `LOOK_DEFAULT` (the comic look); this file imports nothing under `arena/`
   * statically (**D49**), which is why it hands the string on rather than a spec.
   */
  look: string;
}

/** The query keys the look reads — `arena/look.ts`'s `lookFromSearch`. */
const LOOK_KEYS = ['look', 'ink', 'halftone', 'key', 'stage', 'shadow'] as const;

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
    // A tri-state, unlike every other flag here: absent is "use the measured
    // default", and `?bloom=0` has to be able to turn it OFF again if that default
    // is ever flipped on.
    bloom: params.get('bloom') === null ? null : on('bloom'),
    look: (() => {
      const kept = new URLSearchParams();
      for (const key of LOOK_KEYS) {
        const value = params.get(key);
        if (value !== null) kept.set(key, value);
      }
      return kept.toString();
    })(),
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
    <>
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
      {/* The card browser (#cards) — a plain hash link, so the page never
          reloads and a live game's socket is still there when you come back. */}
      <a className="viewtoggle" href="#cards" title="Browse the card library (#cards)">
        ▦ cards
      </a>
    </>
  );
}

/** The workshop, as a link: a URL like the toggle beside it, so Back comes home. */
function WorkshopLink({ onSet }: { onSet: (view: View) => void }): JSX.Element {
  return (
    <a
      className="viewtoggle"
      href="#workshop"
      onClick={(event) => {
        event.preventDefault();
        onSet('workshop');
      }}
      title="Open the workshop: one card on a pedestal — its figure, props, clips and cues (W in the arena)"
    >
      ⚒ workshop
    </a>
  );
}

/**
 * **The story of this replay** (D125): the same log told turn by turn, at the
 * frame on screen. A URL like the links beside it; the cursor survives the trip
 * both ways through `replayCursors` / `followCursors` below.
 */
function StoryLink({ onSet }: { onSet: (view: View) => void }): JSX.Element {
  return (
    <a
      className="viewtoggle"
      href="#story"
      onClick={(event) => {
        event.preventDefault();
        onSet('story');
      }}
      title="Read this game as a story, turn by turn, at this frame (#story)"
    >
      ☰ story
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
        <WorkshopLink onSet={onSetView} />
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
              bloom={flags.bloom}
              lookQuery={flags.look}
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
 * **Follow mode's word** (spectating, D118), for the story page and — through
 * {@link arenaFollowOf} — the arena. The arena imports no transport (M7
 * convention 1), so what it is told about the stream is this plain value: the
 * log is still being written, has gone quiet, has ended, or was LOST — or
 * `null`, an ordinary replay.
 *
 * `lost` is a 416 (polish-1, spectating's skeptic): the file was re-recorded
 * under the same name and the follower has stopped for good. It used to fold
 * into `stalled`, and the page kept a live "● following" over a poller that had
 * stopped. `error` still reads `stalled`: a failed poll is retried.
 * `web/test/spectate.test.ts` evaluates this function from this file's source.
 */
type FollowWord = 'following' | 'stalled' | 'finished' | 'lost';

function followWordOf(status: FollowStatus | null): FollowWord | null {
  switch (status) {
    case null:
      return null;
    case 'stalled':
    case 'error':
      return 'stalled';
    case 'ended':
    case 'stopped':
      return 'finished';
    case 'lost':
      return 'lost';
    default:
      return 'following';
  }
}

/**
 * The arena's three words (`ArenaFollow`, declared in `arena/Arena.tsx`, which
 * this branch does not touch) have none for `lost`, so a lost follow reaches the
 * arena as no word at all: its watching line keeps the matchup and drops the
 * live "● following", and the strip above it (`FollowChip`) says what happened.
 * PLAN.md's polish-1 follow-up gives the arena a word of its own.
 */
function arenaFollowOf(word: FollowWord | null): Exclude<FollowWord, 'lost'> | null {
  return word === 'lost' ? null : word;
}

/** The dev-only handle a measurement reads (`import.meta.env.DEV` only, like `__mtgArena`). */
interface FollowHolder {
  __mtgFollow?: LogFollower;
}

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
    const url = logUrlFor(path);
    const response = await fetch(url, {
      headers: { Accept: 'application/x-ndjson' },
    });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
    return response.text();
  })();
  logCache.set(path, pending);
  pending.catch(() => logCache.delete(path));
  return pending;
}

/**
 * Where each replay was left, by fixture path, for the page's lifetime. `#cards`
 * unmounts `ReplayApp` (see `App`), and without this a replay stepped to frame 5
 * came back from the card browser at frame 0.
 */
const replayCursors = new Map<string, number>();

/**
 * **Where each FOLLOWED log was left** (spectating's follow-up 8, closed for the
 * page's own views by D128): the cursor, and whether the viewer had paused.
 * Back from `#story` (or `#cards`, `#workshop`) a viewer who had PAUSED is put
 * back on that frame, paused, while one who was watching live rejoins the live
 * edge — which is where they were. A reload still starts at the live edge: this
 * map lives as long as the page.
 */
const followCursors = new Map<string, { index: number; paused: boolean }>();

/**
 * **The replay, loaded** — the whole-file fetch or the follow-mode poller,
 * whichever the URL asked for, and the cursor put back where this page last left
 * it. The replay app (board and arena) and the story page (`#story`) both call
 * it, which is what keeps them on one log and one cursor: switching between them
 * unmounts one and mounts the other over the same cached text.
 */
function useReplayLoad(requested: string, follow: boolean): { load: LoadState; follower: LogFollower | null } {
  const [load, setLoad] = useState<LoadState>({ status: 'loading', path: requested });
  // The transport is mutable; this counter is what tells React to re-read it.
  const [, bump] = useReducer((n: number) => n + 1, 0);
  // Follow mode's poller, while there is one. Mutable too; `bump` re-reads it.
  const [follower, setFollower] = useState<LogFollower | null>(null);

  useEffect(() => {
    if (!follow) return undefined;
    // **Follow mode** (D118): poll the growing log from the transport layer and
    // hand the frames to a follow-mode transport as they are written. Nothing
    // here — and nothing in the arena — decides when a frame plays; that is the
    // recorder's clock, inside `LogReplayTransport`.
    //
    // The poller is a lazy import, like the arena (D49's rule, applied to a
    // smaller thing): a page that never follows a log never downloads it.
    let cancelled = false;
    let created: LogReplayTransport | null = null;
    let polling: LogFollower | null = null;
    // Coming back from another view at the frame the viewer paused on (D128);
    // a viewer who was watching live is not held back: the transport joins the
    // live edge as it does on a fresh page.
    const resume = followCursors.get(requested);
    const resumeAt = resume !== undefined && resume.paused && resume.index > 0 ? resume.index : null;
    void import('./transport/follow.ts').then(({ LogFollower: Follower }) => {
      if (cancelled) return;
      polling = new Follower({
        url: logUrlFor(requested),
        autoplay: resumeAt === null,
        onTransport: (transport) => {
          created = transport;
          if (resumeAt !== null) transport.scrubTo(resumeAt);
          transport.onState((_state, index) => {
            followCursors.set(requested, { index, paused: !transport.playing });
            bump();
          });
          setLoad({ status: 'ready', path: requested, transport });
        },
        onChange: () => {
          bump();
        },
      });
      setFollower(polling);
      if (import.meta.env.DEV) (window as unknown as FollowHolder).__mtgFollow = polling;
      polling.start();
    });
    return () => {
      cancelled = true;
      polling?.stop();
      created?.close();
    };
  }, [requested, follow]);

  useEffect(() => {
    if (follow) return undefined;
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
      // Back from the card browser, the workshop or the story (each unmounts
      // this app — see `App`): resume at the frame the replay was left on, not
      // at frame 0.
      const resumeAt = replayCursors.get(path);
      if (resumeAt !== undefined && resumeAt > 0) created.scrubTo(resumeAt);
      const loaded = path;
      created.onState((_state, index) => {
        replayCursors.set(loaded, index);
        bump();
      });
      setLoad({ status: 'ready', path, transport: created });
    })();

    return () => {
      cancelled = true;
      created?.close();
    };
  }, [requested, follow]);

  return { load, follower };
}

/** The replay's two states before it has a transport: loading (or waiting for the recorder), and failed. */
function ReplayNotReady({
  load,
  follow,
  follower,
}: {
  load: Exclude<LoadState, { status: 'ready' }>;
  follow: boolean;
  follower: LogFollower | null;
}): JSX.Element {
  if (load.status === 'loading') {
    if (follow) {
      return (
        <div className="pad">
          <p className="muted">
            following {logUrlFor(load.path)} — waiting for the recorder to write its first line
            {follower !== null && follower.status === 'error' && follower.detail !== null ? ` (${follower.detail})` : '…'}
          </p>
          <p className="muted">
            <code>./scripts/spectate.sh</code> starts the recorder and this page together, and booting the engine
            takes about ten seconds. The recorder&apos;s own output is <code>var/spectate/&lt;name&gt;.log</code>.
          </p>
        </div>
      );
    }
    return <p className="pad muted">loading {logUrlFor(load.path)}…</p>;
  }

  return (
    <div className="pad">
      <div className="banner banner--error">
        <strong>Could not load {logUrlFor(load.path)}</strong>
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

/** The replay bar: prev / play / next / speed / scrub over one transport. The board, the arena and the story share it. */
function ReplayBar({ transport }: { transport: LogReplayTransport }): JSX.Element {
  const frame = transport.currentFrame;
  return (
    <ReplayControls
      index={transport.index}
      total={transport.total}
      live={transport.live}
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
  );
}

/** The replay's banners: a frame the reducer refused, and the parser's warnings. */
function ReplayOverlays({ transport }: { transport: LogReplayTransport }): JSX.Element {
  return (
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
  );
}

function ReplayApp({
  requested,
  follow,
  view,
  onSetView,
}: {
  requested: string;
  /** `&follow=1` on a spectate recording: follow the log as it is written. */
  follow: boolean;
  view: View;
  onSetView: (view: View) => void;
}): JSX.Element {
  const art = useArt();
  const flags = useMemo(arenaFlagsFromQuery, []);
  const { load, follower } = useReplayLoad(requested, follow);

  if (load.status !== 'ready') return <ReplayNotReady load={load} follow={follow} follower={follower} />;

  const transport = load.transport;
  const frame = transport.currentFrame;
  const followWord = follow ? followWordOf(follower?.status ?? null) : null;

  return (
    <div className="app">
      <div className="app__bar">
        <h1>mtg-table — {follow ? 'spectate' : 'replay'}</h1>
        <span className="muted">{logUrlFor(load.path)}</span>
        {follow && follower !== null && <FollowChip follower={follower} transport={transport} />}
        <ViewToggle view={view} onSet={onSetView} />
        <StoryLink onSet={onSetView} />
        <WorkshopLink onSet={onSetView} />
        {flags.off && view === 'arena' && (
          <span className="muted">?arena=off — the 3D arena is disabled; this is the board</span>
        )}
        <ArtMisses art={art} />
        <Credits />
      </div>

      <ReplayBar transport={transport} />

      <ReplayOverlays transport={transport} />

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
              bloom={flags.bloom}
              follow={arenaFollowOf(followWord)}
              lookQuery={flags.look}
            />
          </Suspense>
        ) : (
          <Board state={transport.state} art={art} onSetView={onSetView} />
        )}
      </ErrorBoundary>
    </div>
  );
}

/**
 * **Follow mode, said out loud** (spectating): where the recorder is and how far
 * behind it the page is. The lag is the transport's own measurement — a frame's
 * `t` (written) to the moment the play loop applied it — so it is the number a
 * watcher cares about, on one machine's clock.
 */
function FollowChip({ follower, transport }: { follower: LogFollower; transport: LogReplayTransport }): JSX.Element {
  const lag = transport.followLag();
  const lagText = lag === null ? '' : ` · ${(lag.p50 / 1000).toFixed(1)} s behind`;
  const behind = transport.total - transport.index;
  switch (follower.status) {
    case 'ended':
      return (
        <span className="follow follow--ended" title="the recorder wrote its `over` frame; polling has stopped">
          {transport.live || transport.paced ? `game over — playing the last ${String(behind)} frame(s)` : 'recording finished — this is a replay now'}
        </span>
      );
    case 'stopped':
      return <span className="follow follow--ended">follow stopped</span>;
    case 'lost':
      // A 416: polling has stopped for good. No live dot here — the dot is a
      // live word, and nothing is live any more (polish-1).
      return (
        <span className="follow follow--lost" title={follower.detail ?? ''}>
          recording lost — {follower.detail ?? 'the log was re-recorded under the same name'}
        </span>
      );
    case 'stalled':
    case 'error':
      return (
        <span className="follow follow--stalled" title={follower.detail ?? ''}>
          ● following — {follower.detail ?? 'no new frame'}
        </span>
      );
    default:
      return (
        <span className="follow follow--live" title={`${String(follower.framesSeen)} frames so far, polled every 0.5 s`}>
          ● following{lagText}
          {behind > 0 && !transport.playing ? ` · ${String(behind)} frame(s) queued` : ''}
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// The story — a page over the replay (D125)
// ---------------------------------------------------------------------------

/**
 * **`#story`**: the replay's log told turn by turn, beside the replay's own
 * cursor. With no `?replay=` there is no log to tell — a live seat's story is
 * PLAN.md's follow-up — so the page says so and offers the committed game.
 */
function StoryApp({ mode, onSetView }: { mode: Mode; onSetView: (view: View) => void }): JSX.Element {
  if (mode.kind !== 'replay') return <StoryWithoutLog onSetView={onSetView} />;
  return <StoryReplay requested={mode.path} follow={mode.follow} onSetView={onSetView} />;
}

function StoryWithoutLog({ onSetView }: { onSetView: (view: View) => void }): JSX.Element {
  return (
    <div className="pad story__nolog">
      <h1>The story reads a recorded game</h1>
      <p>
        <code>#story</code> tells a frame log turn by turn, in step with its replay. Open one with{' '}
        <a href="/?replay=games/g1.jsonl#story">?replay=games/g1.jsonl#story</a>, or watch two AIs play with{' '}
        <code>./scripts/spectate.sh --story</code>. A live seat has no log on this page yet (PLAN.md, the story&apos;s
        follow-ups).
      </p>
      <p>
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onSetView('board');
          }}
        >
          back to the board
        </a>
      </p>
    </div>
  );
}

/**
 * The replay's chrome — the bar, the replay controls, the banners — around the
 * story page. The transport, the poller and the cursor are the replay app's own
 * (`useReplayLoad`), so the scrubber here and the scrubber over the arena are
 * one cursor, and `▣ arena` comes back at this frame.
 */
function StoryReplay({
  requested,
  follow,
  onSetView,
}: {
  requested: string;
  follow: boolean;
  onSetView: (view: View) => void;
}): JSX.Element {
  const art = useArt();
  const { load, follower } = useReplayLoad(requested, follow);

  if (load.status !== 'ready') return <ReplayNotReady load={load} follow={follow} follower={follower} />;

  const transport = load.transport;
  const followWord = follow ? followWordOf(follower?.status ?? null) : null;
  const to = (view: View) => (event: { preventDefault(): void }) => {
    event.preventDefault();
    onSetView(view);
  };

  return (
    <div className="app app--story">
      <div className="app__bar">
        <h1>mtg-table — story</h1>
        <span className="muted">{logUrlFor(load.path)}</span>
        {follow && follower !== null && <FollowChip follower={follower} transport={transport} />}
        <a className="viewtoggle" href="#arena" onClick={to('arena')} title="The 3D arena, at this frame (V)">
          ▣ arena
        </a>
        <a className="viewtoggle" href="#" onClick={to('board')} title="The 2D board, at this frame (B)">
          ▤ board
        </a>
        <Credits />
      </div>

      <ReplayBar transport={transport} />

      <ReplayOverlays transport={transport} />

      <ErrorBoundary resetKey={transport.index} label="The story" frame={transport.currentFrame}>
        <Suspense fallback={<p className="pad muted">loading the story…</p>}>
          <StoryPage
            header={transport.header}
            frames={transport.frames}
            total={transport.total}
            cursor={transport.index}
            state={transport.state}
            playing={transport.playing}
            follow={followWord}
            art={art}
            // Following a game still being recorded, the story shows what the
            // cursor has played and nothing after it; a finished log shows it
            // all, what is still to come dimmed (S switches).
            initialAhead={follow && transport.live ? 'hide' : 'dim'}
            onScrub={(index) => {
              transport.scrubTo(index);
            }}
            onToggle={() => {
              transport.toggle();
            }}
            onStep={(delta) => {
              if (delta > 0) transport.stepForward();
              else transport.stepBack();
            }}
            onSetView={onSetView}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The workshop — its own page, no transport
// ---------------------------------------------------------------------------

function WorkshopApp({ onSetView, waiting }: { onSetView: (view: View) => void; waiting: string | null }): JSX.Element {
  const art = useArt();
  return (
    <ErrorBoundary resetKey={0} label="The workshop">
      <Suspense fallback={<p className="pad muted">loading the workshop…</p>}>
        <Workshop art={art} onSetView={onSetView} waiting={waiting} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * **"Your game is waiting"** — while the workshop is open over a live seat, the
 * mode app is unmounted (see `App`), so nothing on screen would say the engine
 * has asked the player something. This reads the page's socket if one is ALREADY
 * open (`__mtgTableWs`, the holder `liveTransport` fills) — it never opens one,
 * so a workshop opened on its own stays a page with no transport — and returns a
 * line for the workshop's header, or `null`.
 *
 * Nothing is decided from an engine string: an open `ask` is the flag it is, and
 * an `input` is shown by its own prompt, verbatim (M5 convention 4).
 */
function useLiveGameWaiting(active: boolean): string | null {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const transport = active ? ((window as unknown as WsHolder).__mtgTableWs ?? null) : null;
  useEffect(() => {
    if (transport === null) return undefined;
    const offState = transport.onState(() => {
      bump();
    });
    return offState;
  }, [transport]);
  if (transport === null) return null;
  const state = transport.state;
  if (state.board === null || state.gameOver !== null) return null;
  if (state.ask !== null) return 'your live game is waiting on an answer';
  if (state.input !== null) {
    const prompt = state.input.prompt.trim();
    return prompt === '' ? 'your live game is waiting on you' : `your live game is waiting: “${prompt}”`;
  }
  return null;
}

/**
 * What `W` is planned against in the arena: a picture key, so none of the
 * engine's flags matter — only that the renderer on screen is the arena. The
 * pool is empty for the same reason `Arena.tsx`'s own context says so: the arena
 * has no mana pips, so no letter is borrowed by the pool there.
 */
const ARENA_PICTURE_KEYS: KeyContext = {
  live: false,
  askOpen: false,
  okEnabled: false,
  cancelEnabled: false,
  haveSelectable: false,
  poolColors: [],
  overlay: 'none',
  arena: true,
};

/**
 * **`W` in the arena opens the workshop** — the `openWorkshop` row of the one
 * keymap, dispatched here because the view is the App's and `Arena.tsx` (on
 * another branch's desk) is left untouched. It listens in the CAPTURE phase and
 * stops the event there, so the arena's own handler never sees a key it has no
 * branch for; every other key passes through untouched.
 */
function useWorkshopKey(view: View, setView: (view: View) => void, arenaOff: boolean): void {
  useEffect(() => {
    // Only where the arena is really mounted: `?arena=off#arena` draws the board.
    if (view !== 'arena' || arenaOff) return;
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const resolved = planKey(
        {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          isComposing: event.isComposing,
          target: target === null ? null : { tagName: target.tagName, isContentEditable: target.isContentEditable },
        },
        ARENA_PICTURE_KEYS,
      );
      if (resolved?.plan.kind === 'view' && resolved.plan.id === 'openWorkshop') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setView('workshop');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [view, setView, arenaOff]);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function App(): JSX.Element {
  const mode = useMemo(modeFromQuery, []);
  // One `useView` for the page, above both modes: the view is a property of the
  // window, not of the transport, so switching between the board and the arena
  // never re-mounts the mode app.
  const [view, setView] = useView();
  // `W` opens the workshop from the arena — but only when the arena is really
  // on screen: under `?arena=off` the 2D board is drawn at `#arena`, and there
  // `W` is the board's own (spend floating white mana, M5), and the WebGL kill
  // switch must not lead to another WebGL page.
  const arenaOff = useMemo(() => arenaFlagsFromQuery().off, []);
  useWorkshopKey(view, setView, arenaOff);
  const waiting = useLiveGameWaiting(mode.kind === 'ws' && view === 'workshop');
  // The renderer the card browser was opened from: its back link returns there
  // (to the arena when that is where you were), not always to the 2D board.
  const [backTo, setBackTo] = useState<View>(view === 'arena' ? 'arena' : 'board');
  useEffect(() => {
    if (view !== 'cards') setBackTo(view);
  }, [view]);
  if (view === 'cards') {
    // Not a renderer and not a seat: no transport, no reducer, no board.
    //
    // **`#cards` DOES unmount the mode app**, deliberately. Kept mounted and
    // hidden, the board's and the arena's `window` keydown listeners would still
    // be live under the card browser — Space, Enter and Esc typed there would
    // press OK or Cancel in a live game. So the detour costs the mode app's own
    // UI state (an open panel, a zoomed card, a camera dragged by hand): the live socket is
    // page-scoped and survives (`liveTransport`), a replay resumes at the frame
    // it was left on (`replayCursors`), and the back link returns to the view
    // you came from.
    return (
      <Suspense fallback={<p className="pad muted">loading the card browser…</p>}>
        <CardBrowser onSetView={setView} backTo={backTo} />
      </Suspense>
    );
  }
  if (view === 'workshop') {
    // Not a renderer and not a seat either: the workshop builds its own boards
    // and opens no transport. **It unmounts the mode app, as `#cards` does
    // (D94), for the same reason**: a hidden board or arena would keep its
    // `window` keydown listeners live under the workshop, whose own keys
    // (Space, `.`, `,`, `K`, `V`, the arrows) would then also press OK, pass
    // priority or switch the renderer in a live game. The socket is page-scoped
    // and survives, a replay resumes at its frame (`replayCursors`), and the
    // header carries a chip while the live game is waiting on you.
    return <WorkshopApp onSetView={setView} waiting={waiting} />;
  }
  if (view === 'story') {
    // A page over the replay (D125), and like the two above it unmounts the mode
    // app: a hidden board or arena would keep its `window` keydown listeners
    // live under the story's own keys (Space, the arrows, `,` `.` `V` `B`). It
    // loads the same log through `useReplayLoad`, from the fetch cache, and the
    // cursor maps put it on the frame the replay was on — and back.
    return <StoryApp mode={mode} onSetView={setView} />;
  }
  return mode.kind === 'replay' ? (
    <ReplayApp requested={mode.path} follow={mode.follow} view={view} onSetView={setView} />
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
