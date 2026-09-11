/*
 * mtg-table — web/test/render.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The render half of the contract test**, and the gap the M1 hardening pass
 * left open.
 *
 * `fixtures.test.ts` replays every committed recording through `reduce()` and
 * asserts the board never sees a shape it cannot describe — but `reduce()` never
 * calls a component. M1 shipped a `TypeError` that blanked the page on the
 * primary fixture (`event.from.zone` on a token that came from nowhere) while
 * every test in the suite passed, and the workaround was to call `describeEvent`
 * directly from the fixture test: one leaf of the tree, nothing above it. The
 * reason nobody wrote the real test is mechanical — **Node's type stripping does
 * not transform JSX**, so `node --test` cannot import `Board.tsx` at all. That
 * is what vitest is here for, and for nothing else (`web/vitest.config.ts`).
 *
 * What this file does: folds every committed frame log through the real reducer
 * and renders the real `<Board/>` after **every frame**, over every fixture —
 * `fixtures/games/` (engine-produced) and `fixtures/synthetic/` (the eleven ask
 * kinds, `input.focusCard`, `openZones`, the three face-down positions, which no
 * AI-vs-AI recording contains). A throw anywhere in the tree fails the fixture
 * and names the frame.
 *
 * **Why `renderToStaticMarkup` and not jsdom.** The board is a tree of pure
 * function components: no `useState`, no `useEffect`, no refs, and no browser
 * API beyond `<img src>`. A server render executes every component function and
 * evaluates every JSX expression in the tree — which is where all four classes
 * of board crash live (an unguarded `null`, a missing key, a bad `.map`, a label
 * function that throws) — so a DOM would add a dependency and catch nothing
 * extra. If the board ever grows an effect, this decision needs revisiting and
 * this paragraph is the place it is written down.
 *
 * **The negative control.** A render test that cannot fail proves nothing —
 * exactly the argument that produced `tools/check-redaction-selftest.mjs`. The
 * last test in this file asserts that the harness still detects a board crash,
 * by rendering a state the renderer genuinely cannot draw.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { EMPTY_ART_INDEX, parseArtFile, type ArtIndex } from '../src/art.ts';
import type { AskBody, GameStateBody, InputBody, StateFrame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { Board } from '../src/render/Board.tsx';
import { parseFrameLog } from '../src/transport/replay.ts';

const GAMES_DIR = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
const SYNTHETIC_DIR = fileURLToPath(new URL('../../fixtures/synthetic/', import.meta.url));
const ART_JSON = fileURLToPath(new URL('../public/art.json', import.meta.url));

/**
 * The real art index when `tools/fetch-art.ts` has run, the empty one
 * otherwise. It matters: with art loaded, `CardLine` takes its `<img>` branch
 * and the `title` string interpolating `setCode` / `collectorNumber` / `artist`
 * is actually built; with the empty index every card takes the text-thumbnail
 * branch. `art.json` is gitignored, so the test has to be total over both and
 * says which one it got.
 */
function loadArt(): { art: ArtIndex; source: string } {
  try {
    const art = parseArtFile(JSON.parse(readFileSync(ART_JSON, 'utf8')));
    return { art, source: `web/public/art.json (${String(Object.keys(art.cards).length)} entries)` };
  } catch {
    return { art: EMPTY_ART_INDEX, source: 'EMPTY_ART_INDEX (no web/public/art.json — run node tools/fetch-art.ts)' };
  }
}

const { art, source: artSource } = loadArt();

function fixtures(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => dir + name);
}

const files = [...fixtures(GAMES_DIR), ...fixtures(SYNTHETIC_DIR)];

/** `fixtures/games/g1.jsonl` rather than the whole absolute path, in messages. */
function shortName(path: string): string {
  const at = path.indexOf('/fixtures/');
  return at === -1 ? path : path.slice(at + 1);
}

/**
 * React escapes text nodes, so a label containing `&`, `<` or `"` does not
 * appear in the markup as it appears on the wire. The card names in the corpus
 * include `Agents of S.H.I.E.L.D.` and `Bolas's Citadel`-shaped apostrophes, and
 * `renderToStaticMarkup` escapes the apostrophe as `&#x27;`.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Every option label one `ask` body carries, wherever the kind puts them
 * (§5.2). `confirm` has no option array — its two labels are `yesLabel` /
 * `noLabel` — and `text` has none at all.
 */
function optionLabels(ask: AskBody): string[] {
  const listKeys: Record<string, string[]> = {
    order: ['dest', 'source'],
    sideboard: ['main', 'side'],
    assign_damage: ['targets'],
    assign_amount: ['targets'],
    manipulate_list: ['cards'],
  };
  if (ask.kind === 'confirm') return [ask.yesLabel, ask.noLabel];
  if (ask.kind === 'text') return [];
  const body = ask as unknown as Record<string, unknown>;
  const keys = listKeys[ask.kind] ?? ['options'];
  return keys.flatMap((key) =>
    Array.isArray(body[key]) ? (body[key] as { label: string }[]).map((o) => o.label) : [],
  );
}

/**
 * Render one client state exactly the way `main.tsx` does, minus the error
 * boundary — the boundary is what turns a crash into a red panel in the
 * browser, and here we want the throw.
 */
function render(state: ClientState): string {
  return renderToStaticMarkup(<Board state={state} art={art} />);
}

test('the fixture corpus is non-empty, and this is the art index it rendered with', () => {
  expect(files.length).toBeGreaterThan(0);
  // Printed so a run that silently fell back to the empty index is visible.
  expect(artSource).toMatch(/art\.json|EMPTY_ART_INDEX/);
});

for (const path of files) {
  const file = shortName(path);

  test(`${file}: <Board/> renders every frame without throwing`, () => {
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);

    // The empty board — `board === null`, before the first `state` frame. It is
    // its own branch in Board.tsx and the browser shows it for a real fraction
    // of a second on every load.
    expect(() => render(state)).not.toThrow();

    let rendered = 0;
    let stateFrames = 0;
    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i]!;
      state = reduce(state, frame);
      if (frame.type === 'state') stateFrames += 1;
      let html: string;
      try {
        html = render(state);
      } catch (cause) {
        // Name the frame, not just the stack: "TypeError: cannot read zone of
        // null" three components deep is unactionable without it.
        expect.fail(
          `${file}: <Board/> threw on frame ${String(i)} ` +
            `(seq=${String(frame.seq)} type=${frame.type}): ${String(cause)}`,
        );
      }
      rendered += 1;
      // A render that produced nothing is a render that proved nothing — e.g. a
      // component that returned null all the way up because of a bad guard.
      expect(html.length, `${file}: frame ${String(i)} rendered an empty board`).toBeGreaterThan(64);
      // The board must never print a raw `undefined` or `[object Object]`: both
      // are how a missing guard reaches the user as text instead of as a crash,
      // which is strictly worse because nothing fails.
      expect(html, `${file}: frame ${String(i)} rendered the string "undefined"`).not.toContain(
        'undefined',
      );
      expect(html, `${file}: frame ${String(i)} rendered "[object Object]"`).not.toContain(
        '[object Object]',
      );
    }

    expect(rendered).toBe(log.frames.length);
    expect(stateFrames, `${file}: no state frames — the render test proves nothing`).toBeGreaterThan(
      0,
    );
  });
}

test('an outstanding ask renders as a read-only block listing the engine\'s option labels', () => {
  /*
   * §5. An ask blocks the Forge game thread, so the board draws it at the top
   * rather than in a column beside the log — and it draws the labels the engine
   * sent, verbatim. That "verbatim" is a rule and not a default: an option whose
   * card is concealed arrives labelled `"???"` because `String.valueOf(CardView)`
   * prints the real name (report 07 §7), so a client that rebuilt the label from
   * `option.card` would re-open exactly the hole the bridge closed.
   *
   * Over the WHOLE corpus, because it is no longer only the synthetic file that
   * can drive this: `fixtures/games/human-auto-*.jsonl` are recorded with a
   * `PlayerControllerHuman` on seat 0 and carry real asks — the first option
   * labels in the repo that came out of Forge rather than out of a generator.
   */
  let checked = 0;
  const kinds = new Set<string>();

  for (const path of files) {
    const file = shortName(path);
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);

    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (frame.type !== 'ask') continue;
      const ask = state.ask;
      expect(ask, `${file}: reduce dropped an ask frame`).not.toBeNull();
      kinds.add(ask!.kind);
      const html = render(state);

      // The kind, the id and the fact that something is blocked.
      expect(html).toContain(ask!.kind);
      expect(html).toContain(ask!.askId);
      expect(html).toContain('the game thread is blocked on this');
      // Read-only: M1 renders questions, M2/M5 answer them. If a clickable
      // affordance ever appears here it must send a real `answer`, and this
      // assertion is where that decision gets made on purpose.
      expect(html).toContain('Read-only');

      // Every option label the ask carries, exactly as it arrived. `escapeHtml`
      // is why this compares against an escaped label rather than the raw one:
      // the labels are real card names, and `Agents of S.H.I.E.L.D.` is fine
      // but `Bolas's Citadel`-shaped apostrophes are not.
      for (const label of optionLabels(frame.body as AskBody)) {
        expect(
          html,
          `${file}: the ask block dropped or rewrote the engine's option label ` +
            `${JSON.stringify(label)}`,
        ).toContain(escapeHtml(label));
        checked += 1;
      }
    }
  }
  expect(checked, 'no ask option labels were checked').toBeGreaterThan(20);
  expect(kinds.size, `ask kinds rendered: ${[...kinds].sort().join(', ')}`).toBeGreaterThan(1);
});

test('input.buttons labels reach the board verbatim, engine spelling and all', () => {
  /*
   * §2.2 / report 11 §0.1. `Undo (1)`, `End Turn` and `Auto` are Forge's own
   * labels on the Cancel and OK buttons — `InputPassPriority.java:162-178`,
   * `InputPayMana.java:376-395` — and the client renders them and sends
   * `buttonOk` / `buttonCancel`. There is no `autoPay` act and no `endTurn` act
   * precisely because the engine already said what the button does; a board
   * that prints its own "Pass" has thrown that answer away.
   *
   * `Undo (1)` is in the synthetic fixture for this reason: it is the one label
   * that looks most like a client feature and is not. The human-seat recordings
   * carry Forge's real ones.
   *
   * Rendering all ~2,300 input frames of the corpus twice (the per-fixture test
   * above already renders every frame once) buys nothing, so this renders the
   * frame the FIRST time a distinct label pair appears — which is exactly the
   * set of boards that could show a label this test has not checked.
   */
  const labelsSeen = new Set<string>();
  const pairsRendered = new Set<string>();
  let cardClickHints = 0;

  for (const path of files) {
    const file = shortName(path);
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);

    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (frame.type !== 'input') continue;
      const body = frame.body as InputBody;
      const { ok, cancel } = body.buttons;
      const pair = `${ok.label} ${cancel.label} ${String(ok.enabled)}` +
        ` ${String(cancel.enabled)} ${String(body.selectable.cardIds.length > 0)}`;
      labelsSeen.add(ok.label);
      labelsSeen.add(cancel.label);
      if (pairsRendered.has(pair)) continue;
      pairsRendered.add(pair);

      const html = render(state);
      for (const label of [ok.label, cancel.label]) {
        expect(
          html,
          `${file}: the board did not print the engine's button label ${JSON.stringify(label)}`,
        ).toContain(escapeHtml(label));
      }
      // §4.2: a disabled OK means "click a card", not "nothing to do". The board
      // says so out loud whenever the engine sets that combination up.
      if (!ok.enabled && body.selectable.cardIds.length > 0) {
        expect(html, `${file}: §4.2's hint is missing`).toContain('card click');
        cardClickHints += 1;
      }
    }
  }

  expect(
    labelsSeen.has('Undo (1)'),
    `button labels seen: ${[...labelsSeen].sort().join(' | ')}`,
  ).toBe(true);
  expect(
    cardClickHints,
    'no input in the whole corpus has a disabled OK with selectable cards, so §4.2 — the ' +
      'invariant that silently stalls a button-only client at the discard step — is unexercised',
  ).toBeGreaterThan(0);
});

test('the corpus renders at least one ask and one input (the synthetic half)', () => {
  // An AI-vs-AI recording has neither (§8.4), so without `fixtures/synthetic/`
  // in the list above, `AskPanel` and `InputPanel` would be rendered only in
  // their empty state by every test in this file — and the ask modal, the
  // eleven per-kind option renderers and the verbatim button labels would go
  // out untested.
  let asks = 0;
  let inputs = 0;
  for (const path of files) {
    for (const frame of parseFrameLog(readFileSync(path, 'utf8')).frames) {
      if (frame.type === 'ask') asks += 1;
      if (frame.type === 'input') inputs += 1;
    }
  }
  expect(asks, 'no fixture carries an `ask` frame').toBeGreaterThan(0);
  expect(inputs, 'no fixture carries an `input` frame').toBeGreaterThan(0);
});

test('NEGATIVE CONTROL: the harness still notices when the board cannot draw a state', () => {
  /*
   * A render test that cannot fail is worth nothing — the same argument that
   * produced `tools/check-redaction-selftest.mjs` after a checker quietly
   * accepted five reverted amendments.
   *
   * The defect is the M1 blocker itself, re-injected: a `zone` event whose
   * `from` is `null`. `docs/protocol.md` §3.6 declares both legs nullable (a
   * token created straight onto the battlefield came from nowhere), the reducer
   * passes it straight through because it partitions on `kind` and never looks
   * at a body, and a renderer that dereferences `from.zone` crashes three
   * components deep. Here the damage is done to the state *after* reduce, so
   * this asserts the harness, not the protocol: if `render()` ever stops
   * throwing on a genuinely undrawable state, every test above is vacuous.
   */
  const log = parseFrameLog(readFileSync(GAMES_DIR + 'g1.jsonl', 'utf8'));
  let state = initialState(log.header);
  let seeded: ClientState | null = null;
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state' && (frame as StateFrame).body.players.length > 0) {
      seeded = state;
      break;
    }
  }
  expect(seeded, 'g1.jsonl has no state frame to corrupt').not.toBeNull();

  const board: GameStateBody = structuredClone(seeded!.board!);
  // A player whose zones are gone: every zone panel dereferences `.cards`.
  (board.players[0] as unknown as { zones: unknown }).zones = null;
  expect(() => render({ ...seeded!, board })).toThrow();
});
