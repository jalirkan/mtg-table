/*
 * mtg-table — render/ErrorBoundary.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The render half of the unknown-frame policy (docs/protocol.md §1).
 *
 * `reduce()` already turns an unknown `type` / `ask.kind` / `v` mismatch into a
 * loud red banner naming the frame. The renderer had no equivalent, so a drift
 * that survived the reducer — one unexpected `null` in a field typed non-null —
 * unmounted the entire React tree and left a blank dark page with no message.
 * That is strictly worse than the case the design worried about: nothing on
 * screen, nothing in the UI to step back with, and the error visible only in the
 * devtools console.
 *
 * This boundary catches it, renders the same banner shape `reduce()` errors get,
 * names the frame index it died on, and — because it wraps only `<Board>` — it
 * leaves `<ReplayControls>` mounted so the user can step back off the bad frame.
 * Changing `resetKey` (the frame index) clears the error automatically, so
 * stepping away recovers without a reload.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** The frame index being rendered; named in the banner and used to reset. */
  resetKey: number;
  /** What this boundary protects, for the banner's first line. */
  label?: string;
  /**
   * The frame being rendered, printed in the banner (amendment P20). A drift
   * that survives `reduce()` is almost always one unexpected `null` in a body,
   * and the fastest way to a fix is seeing the bytes that caused it — in the
   * page, not in a devtools console the user may not have open.
   */
  frame?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
  /** The `resetKey` the error happened on, so we can tell when it changes. */
  key: number | null;
}

/** Never let the banner itself throw: a cyclic or huge frame must still print. */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch (err) {
    return `(frame could not be stringified: ${String(err)})`;
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, componentStack: null, key: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, componentStack: info.componentStack ?? null, key: this.props.resetKey });
    // Keep the console trace: the banner is for the user, this is for whoever
    // has to find the field that was null.
    console.error('mtg-table: the board threw while rendering a frame', error, info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    // Stepping to a different frame clears the error and re-renders the board.
    if (this.state.error !== null && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null, componentStack: null, key: null });
    }
  }

  override render(): ReactNode {
    const { error, componentStack, key } = this.state;
    if (error === null) return this.props.children;

    const where = key ?? this.props.resetKey;
    return (
      <div className="banner banner--error" role="alert">
        <strong>
          {this.props.label ?? 'The board'} could not render frame {where}.
        </strong>
        <div>
          {error.name}: {error.message}
        </div>
        <p className="muted">
          The reducer accepted this frame, so the bridge and{' '}
          <code>web/src/protocol.ts</code> have drifted in a way{' '}
          <code>reduce()</code> does not check — most often a field that arrived{' '}
          <code>null</code> under a non-nullable type. Step back to the previous
          frame to carry on; the controls above still work.
        </p>
        {this.props.frame !== undefined && this.props.frame !== null && (
          <pre>{safeJson(this.props.frame).slice(0, 2000)}</pre>
        )}
        {componentStack !== null && <pre>{componentStack.trim().slice(0, 2000)}</pre>}
      </div>
    );
  }
}
