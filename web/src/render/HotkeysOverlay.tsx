/*
 * mtg-table — render/HotkeysOverlay.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `H` / `?` — the keymap, **rendered from the same table the handler reads**
 * (report 10 §1, §12.2). That is the whole point of the file: a help screen
 * built from a second list is a help screen that will one day list a key nothing
 * implements.
 *
 * Each row prints what the key does, the milestone that makes it do it, and
 * Forge's own binding — including the four places we diverge from Forge, which
 * is information the user of a Forge front-end actually wants (§16.4.3 asks the
 * user to object to the `T` collision; this is where they would see it).
 */

import { KEYMAP } from '../keys.ts';

export function HotkeysOverlay({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="overlay__scrim" onClick={onClose} aria-hidden="true" />
      <div className="overlay__panel hotkeys">
        <div className="overlay__head">
          <h2>Keyboard</h2>
          <button type="button" className="btn btn--small" onClick={onClose} autoFocus>
            close (ESC)
          </button>
        </div>
        <table className="hotkeys__table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Does</th>
              <th scope="col">Forge</th>
            </tr>
          </thead>
          <tbody>
            {KEYMAP.map((binding) => (
              <tr key={binding.id} className={binding.milestone === 'M4' ? '' : 'hotkeys__later'}>
                <th scope="row">
                  <kbd>{binding.chord}</kbd>
                </th>
                <td>
                  {binding.what}
                  {binding.milestone !== 'M4' && (
                    <span className="pill pill--later"> {binding.milestone}</span>
                  )}
                </td>
                <td className="muted">{binding.forge}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Keys are ignored while a text field has focus, and a focused button keeps SPACE for
          itself — the browser already activates it. A key whose milestone has not arrived says so
          in the decision panel rather than doing nothing silently.
        </p>
      </div>
    </div>
  );
}
