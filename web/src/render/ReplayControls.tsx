/*
 * mtg-table — render/ReplayControls.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * prev / next / play / pause / speed / scrub over a recorded frame log.
 * These are transport controls, not game controls: nothing here sends anything
 * to an engine. The board component never learns they exist (M3 swaps the
 * transport for a WebSocket and this bar simply is not rendered).
 */

export const SPEEDS = [0.5, 1, 2, 4, 8] as const;

export interface ReplayControlsProps {
  /** Frames applied so far: a cursor between frames, 0…total. */
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  /** The frame that produced the current state, for the caption. */
  currentType: string | null;
  currentDir: string | null;
  onPrev(): void;
  onNext(): void;
  onToggle(): void;
  onScrub(index: number): void;
  onSpeed(speed: number): void;
}

export function ReplayControls(props: ReplayControlsProps): JSX.Element {
  const { index, total, playing, speed } = props;
  const atStart = index <= 0;
  const atEnd = index >= total;

  return (
    <div className="replay">
      <div className="replay__buttons">
        <button type="button" onClick={props.onPrev} disabled={atStart} title="Step back one frame">
          ◀ prev
        </button>
        <button type="button" onClick={props.onToggle} disabled={atEnd && !playing} title="Play / pause">
          {playing ? '⏸ pause' : '▶ play'}
        </button>
        <button type="button" onClick={props.onNext} disabled={atEnd} title="Step forward one frame">
          next ▶
        </button>
      </div>

      <label className="replay__speed">
        speed{' '}
        <select
          value={String(speed)}
          onChange={(event) => {
            props.onSpeed(Number(event.currentTarget.value));
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={String(s)}>
              {s}×
            </option>
          ))}
        </select>
      </label>

      <input
        className="replay__scrub"
        type="range"
        min={0}
        max={total}
        step={1}
        value={index}
        aria-label="Frame"
        onChange={(event) => {
          props.onScrub(Number(event.currentTarget.value));
        }}
      />

      <span className="replay__count">
        frame <strong>{index}</strong> / {total}
        {props.currentType !== null && (
          <span className="muted">
            {' '}
            · {props.currentDir ?? '?'} {props.currentType}
          </span>
        )}
      </span>
    </div>
  );
}
