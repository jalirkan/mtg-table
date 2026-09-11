/*
 * mtg-table — main.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * M1 wiring: a `.jsonl` frame log in, a text board out.
 *
 *     /?replay=games/g1.jsonl
 *
 * `?replay=` is a path under `fixtures/`, which the dev server mounts at
 * `/fixtures/` (see vite.config.ts). There is no WebSocket here and no JVM:
 * `LogReplayTransport` drives the same reducer `ws.ts` will drive in M3, and the
 * `<Board>` component cannot tell the difference.
 */

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { EMPTY_ART_INDEX, loadArtIndex, type ArtIndex } from './art.ts';
import { Board } from './render/Board.tsx';
import { ErrorBoundary } from './render/ErrorBoundary.tsx';
import { ReplayControls } from './render/ReplayControls.tsx';
import { LogReplayTransport, parseFrameLog } from './transport/replay.ts';
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

type LoadState =
  | { status: 'loading'; path: string }
  | { status: 'error'; path: string; message: string }
  | { status: 'ready'; path: string; transport: LogReplayTransport };

function replayPathFromQuery(): string {
  const param = new URLSearchParams(window.location.search).get('replay');
  return param !== null && param.trim() !== '' ? param.trim().replace(/^\/+/, '') : DEFAULT_REPLAY;
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

function App(): JSX.Element {
  const requested = useMemo(replayPathFromQuery, []);
  const [load, setLoad] = useState<LoadState>({ status: 'loading', path: requested });
  const [art, setArt] = useState<ArtIndex>(EMPTY_ART_INDEX);
  // The transport is mutable; this counter is what tells React to re-read it.
  const [, bump] = useState(0);

  useEffect(() => {
    void loadArtIndex().then(setArt);
  }, []);

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
        bump((n) => n + 1);
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
          , or pass <code>?replay=synthetic/sample-handwritten.jsonl</code>.
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

      {/* §1: an unknown type / ask.kind / v mismatch is a loud banner, never a silent skip. */}
      {transport.error !== null && (
        <div className="banner banner--error" role="alert">
          <strong>Frame rejected at index {transport.error.frameIndex}.</strong>
          <div>{transport.error.message}</div>
          {transport.error.frame !== null && (
            <pre>{JSON.stringify(transport.error.frame, null, 2).slice(0, 2000)}</pre>
          )}
        </div>
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
        <Board state={transport.state} art={art} />
      </ErrorBoundary>

      <footer className="app__foot muted">
        Card images and data from <a href="https://scryfall.com">Scryfall</a>. Rules engine:{' '}
        <a href="https://github.com/Card-Forge/forge">Forge</a> (GPLv3). Unofficial Fan Content — not
        approved or endorsed by Wizards of the Coast.
      </footer>
    </div>
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
