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
 * Each row prints what the key does, the milestone that made it do it, and
 * Forge's own binding — including the four places we diverge from Forge, which
 * is information the user of a Forge front-end actually wants (§16.4.3 asks the
 * user to object to the `T` collision; this is where they would see it).
 *
 * **M6 emptied the "not yet" column.** Every row in the table now does something
 * — the milestone is provenance, not a warning — so the greyed-out styling and
 * the "M5"/"M6" pill went with it, except for the one row that is still a
 * pointer at another control (`A`: Auto Pay is the engine's own label on the OK
 * button, so the answer is "press SPACE"). A help screen that greys out a key
 * that works is the same defect as one that lists a key that does not.
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
              <tr key={binding.id}>
                <th scope="row">
                  <kbd>{binding.chord}</kbd>
                </th>
                <td>{binding.what}</td>
                <td className="muted">{binding.forge}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Keys are ignored while a text field has focus, and a focused button keeps SPACE for
          itself — the browser already activates it. SPACE otherwise presses whichever button the
          engine focused (<code>input.buttons.focus</code>), and a key the engine currently has
          nothing for says why in the decision panel rather than doing nothing silently.
        </p>
      </div>
    </div>
  );
}
