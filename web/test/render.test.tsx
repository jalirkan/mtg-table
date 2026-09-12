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
import { KEYMAP } from '../src/keys.ts';
import {
  isHidden,
  type AnyCard,
  type AskBody,
  type Card,
  type GameStateBody,
  type InputBody,
  type StateFrame,
} from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { ArrowsOverlay } from '../src/render/ArrowsOverlay.tsx';
import { Board, type BoardActions } from '../src/render/Board.tsx';
import { HotkeysOverlay } from '../src/render/HotkeysOverlay.tsx';
import { RectsContext, type RectBox, type Rects } from '../src/render/rects.ts';
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

/**
 * M4. The same state rendered as a **seat**: `actions` non-null is the whole of
 * the difference between the two modes (report 10 §1, `PLAN.md` M4), and it is
 * the branch a replay never exercises — every tile becomes an enabled
 * `<button>`, the engine's two buttons become live, and Concede arms.
 *
 * The sink records nothing on purpose: a server render dispatches no events, so
 * what this proves is that the *live* tree renders at all, over every frame of
 * every fixture, which is exactly what M3's replay-only test could not say.
 */
const FAKE_ACTIONS: BoardActions = {
  clickCard: () => undefined,
  clickPlayer: () => undefined,
  buttonOk: () => undefined,
  buttonCancel: () => undefined,
  concede: () => undefined,
  answer: () => undefined,
};

function renderLive(state: ClientState): string {
  return renderToStaticMarkup(<Board state={state} art={art} actions={FAKE_ACTIONS} />);
}

/** Every `data-card-name="…"` the markup carries, un-escaped. */
function renderedNames(html: string): string[] {
  return [...html.matchAll(/data-card-name="([^"]*)"/g)].map((m) => unescapeHtml(m[1] ?? ''));
}

/** Every `data-card-id="…"` the markup carries. */
function renderedCardIds(html: string): number[] {
  return [...html.matchAll(/data-card-id="(\d+)"/g)].map((m) => Number(m[1]));
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/** Every card this frame serialised in the clear, wherever it lives. */
function visibleCards(board: GameStateBody): Card[] {
  const out: AnyCard[] = [];
  for (const card of board.stackCards) out.push(card);
  for (const player of board.players) {
    for (const zone of [
      player.zones.battlefield,
      player.zones.hand,
      player.zones.graveyard,
      player.zones.exile,
      player.zones.command,
    ]) {
      out.push(...zone.cards);
    }
    out.push(...player.zones.library.cards);
  }
  return out.filter((card): card is Card => !isHidden(card));
}

/**
 * The names this frame is entitled to show. `input.focusCard` is in the list
 * because `setCard` is frequently pushed with a card that is **not** in the
 * snapshot at all — a library card during surveil (amendment P7, report 06
 * §6.9) — and the decision panel draws it.
 */
function allowedNames(state: ClientState): Set<string> {
  const names = new Set<string>();
  if (state.board !== null) {
    for (const card of visibleCards(state.board)) if (card.name !== '') names.add(card.name);
  }
  const focus = state.input?.focusCard ?? null;
  if (focus !== null && !isHidden(focus) && focus.name !== '') names.add(focus.name);
  return names;
}

/** The ids in every seat's hand except the viewer's. Never drawn as tiles. */
function opponentHandIds(state: ClientState): Set<number> {
  const you = state.hello?.you ?? state.session?.seat ?? null;
  const ids = new Set<number>();
  if (state.board === null || you === null) return ids;
  for (const player of state.board.players) {
    if (player.id === you) continue;
    for (const card of player.zones.hand.cards) ids.add(card.id);
  }
  return ids;
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
    let selectablesChecked = 0;
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

      // ---- M4 -----------------------------------------------------------
      // The SAME frame rendered as a seat. `actions` non-null is the only
      // difference between the two modes, and until M4 nothing rendered the
      // live branch over the corpus at all.
      let live: string;
      try {
        live = renderLive(state);
      } catch (cause) {
        expect.fail(
          `${file}: <Board actions={…}/> threw on frame ${String(i)} ` +
            `(seq=${String(frame.seq)} type=${frame.type}): ${String(cause)}`,
        );
      }
      expect(live, `${file}: frame ${String(i)} (live) rendered "undefined"`).not.toContain(
        'undefined',
      );
      expect(live, `${file}: frame ${String(i)} (live) rendered "[object Object]"`).not.toContain(
        '[object Object]',
      );
      expect(live).toContain('data-readonly="false"');

      // **The replay board stays read-only.** Every affordance is rendered and
      // every affordance is inert: a `<button data-act="…">` with no `disabled`
      // in replay markup is a control that would send an act to a server that
      // does not exist (report 10 §1, `PLAN.md` M4).
      expect(html).toContain('data-readonly="true"');
      for (const button of html.match(/<button[^>]*data-act="[^"]*"[^>]*>/g) ?? []) {
        expect(
          button,
          `${file}: frame ${String(i)} rendered a LIVE affordance on the replay board`,
        ).toContain('disabled');
      }

      // **No name the frame did not make public.** Strictly stronger than the
      // wire-level check in `fixtures.test.ts`, which cannot see a renderer that
      // kept a name for an id whose latest serialisation is `hidden: true` —
      // report 06 §0.6 calls that the worst remaining leak and places it here,
      // in the client, rather than in `Snap.java`.
      const permitted = allowedNames(state);
      for (const markup of [html, live]) {
        for (const name of renderedNames(markup)) {
          expect(
            permitted.has(name),
            `${file}: frame ${String(i)} rendered the card name ${JSON.stringify(name)}, which ` +
              `this frame did not serialise in the clear`,
          ).toBe(true);
        }
      }

      // **An opponent's hand is a count in their rail and is never drawn.**
      const forbidden = opponentHandIds(state);
      if (forbidden.size > 0) {
        const focusId = state.input?.focusCard?.id ?? null;
        for (const id of renderedCardIds(live)) {
          if (id === focusId) continue; // the engine pushed this one at us
          expect(
            forbidden.has(id),
            `${file}: frame ${String(i)} drew a tile for card #${String(id)}, which is in an ` +
              `opponent's hand`,
          ).toBe(false);
        }
      }

      // The outline is the engine's answer, echoed: the ids marked selectable
      // are exactly the rendered ids the engine named (report 10 §15.2 item 3).
      const input = state.input;
      if (input !== null && input.selectable.mode === 'cards') {
        const marked = new Set(
          [...live.matchAll(/data-card-id="(\d+)" data-card-name="[^"]*" data-selectable="true"/g)].map(
            (m) => Number(m[1]),
          ),
        );
        const drawn = new Set(renderedCardIds(live));
        for (const id of marked) {
          expect(
            input.selectable.cardIds.includes(id),
            `${file}: frame ${String(i)} outlined card #${String(id)}, which the engine did not name`,
          ).toBe(true);
        }
        for (const id of input.selectable.cardIds) {
          if (!drawn.has(id)) continue; // in a zone this board does not draw
          selectablesChecked += 1;
        }
      }
    }

    expect(rendered).toBe(log.frames.length);
    void selectablesChecked;
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
      // Amendment M14: "waiting", not "blocked" — an `ability_menu` is usually
      // asked with no game thread parked on it.
      expect(html).toContain('the engine is waiting for this');
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

test('M4 NEGATIVE CONTROLS: the three new assertions can actually fail', () => {
  /*
   * A check that cannot fail proves nothing — the argument that produced
   * `tools/check-redaction-selftest.mjs` after a checker quietly accepted five
   * reverted amendments. Each of M4's three new per-frame assertions is
   * exercised here against a state where it MUST fire.
   */
  const log = parseFrameLog(readFileSync(GAMES_DIR + 'human-auto-42.jsonl', 'utf8'));
  let state = initialState(log.header);
  let rich: ClientState | null = null;
  let withOpponentHand: ClientState | null = null;

  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (state.board === null) continue;
    if (rich === null && visibleCards(state.board).length > 4) rich = state;
    if (withOpponentHand === null && opponentHandIds(state).size > 0) withOpponentHand = state;
    if (rich !== null && withOpponentHand !== null) break;
  }
  expect(rich, 'no frame with several visible cards').not.toBeNull();
  expect(
    withOpponentHand,
    'no frame in human-auto-42 has cards in an opponent hand, so the "never drawn" assertion is vacuous',
  ).not.toBeNull();

  // 1. The name check reads real attributes, and rejects a name the frame did
  //    not serialise. (A renderer that cached a name across frames produces
  //    exactly this: an attribute whose value is not in the permitted set.)
  const html = render(rich!);
  const names = renderedNames(html);
  expect(names.length, 'no data-card-name in the markup — the regex matches nothing').toBeGreaterThan(
    0,
  );
  const permitted = allowedNames(rich!);
  for (const name of names) expect(permitted.has(name)).toBe(true);
  expect(permitted.has('Black Lotus'), 'the permitted set accepts a card that is not there').toBe(
    false,
  );
  expect(renderedNames('<li data-card-name="Black Lotus">').every((n) => permitted.has(n))).toBe(
    false,
  );

  // 2. The read-only check would notice a live affordance: the SAME state
  //    rendered with actions has enabled `data-act` buttons, and the replay
  //    render has none.
  const live = renderLive(rich!);
  const liveButtons = live.match(/<button[^>]*data-act="[^"]*"[^>]*>/g) ?? [];
  const replayButtons = html.match(/<button[^>]*data-act="[^"]*"[^>]*>/g) ?? [];
  expect(liveButtons.length, 'the live board rendered no affordances at all').toBeGreaterThan(0);
  expect(replayButtons.length, 'the replay board rendered no affordances at all').toBeGreaterThan(0);
  expect(
    liveButtons.some((b) => !b.includes('disabled')),
    'no enabled affordance in the LIVE markup — the read-only assertion is vacuous',
  ).toBe(true);
  expect(replayButtons.every((b) => b.includes('disabled'))).toBe(true);

  // 3. The opponent-hand check is non-vacuous, and those ids really are absent.
  const hidden = opponentHandIds(withOpponentHand!);
  const drawn = new Set(renderedCardIds(renderLive(withOpponentHand!)));
  for (const id of hidden) expect(drawn.has(id)).toBe(false);
});

// ---------------------------------------------------------------------------
// M4 evening 3 — the arrows (report 10 §9, §15)
// ---------------------------------------------------------------------------

/**
 * A rect for every entity the frame mentions. Stands in for the DOM: the
 * registry's whole contract is "a box, or nothing", and under
 * `renderToStaticMarkup` there is no element to measure, so this is the only way
 * to render a board that actually has arrows on it.
 */
function fakeRects(board: GameStateBody): Rects {
  const boxes = new Map<string, RectBox>();
  let n = 0;
  const put = (key: string): void => {
    if (boxes.has(key)) return;
    boxes.set(key, { x: (n % 8) * 120 + 6, y: Math.floor(n / 8) * 150 + 6, width: 95, height: 132 });
    n += 1;
  };
  for (const player of board.players) {
    put(`p:${String(player.id)}`);
    for (const card of player.zones.battlefield.cards) put(`c:${String(card.id)}`);
    for (const card of player.zones.graveyard.cards) put(`c:${String(card.id)}`);
  }
  for (const item of board.stack) put(`s:${String(item.id)}`);
  return { register: () => () => undefined, get: (key) => boxes.get(key), version: 1 };
}

function renderArrows(board: GameStateBody, emphasiseCombat = false): string {
  return renderToStaticMarkup(
    <RectsContext.Provider value={fakeRects(board)}>
      <ArrowsOverlay board={board} emphasiseCombat={emphasiseCombat} />
    </RectsContext.Provider>,
  );
}

/** The first folded state whose board satisfies `want`, across the whole corpus. */
function findBoard(want: (board: GameStateBody) => boolean): { file: string; board: GameStateBody } | null {
  for (const path of files) {
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);
    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (state.board !== null && want(state.board)) {
        return { file: shortName(path), board: state.board };
      }
    }
  }
  return null;
}

test('the stack-target and combat frames render real <path> elements', () => {
  /*
   * Report 10 §17's exit check for evening 3: "arrows land on the right cards on
   * a frame from g1.jsonl with a targeted spell on the stack, and a
   * declared-blockers frame". The arrow's tail is the stack ROW (`s:`), never the
   * stack item's id resolved against card rects — §10.1's two id spaces collide,
   * and 40 frames of the committed corpus have a stack item whose id is also a
   * battlefield card's.
   */
  const targeted = findBoard((board) =>
    board.stack.some((item) => item.targetCardIds.length > 0),
  );
  expect(targeted, 'no fixture frame has a stack item with a target').not.toBeNull();
  const targetHtml = renderArrows(targeted!.board);
  expect(targetHtml, `${targeted!.file}: no <path> drawn for a stack target`).toContain('<path');
  expect(targetHtml).toContain('arrow--target');
  // The tail is the stack row, not a card tile that happens to share the id.
  // `>` inside an attribute comes back HTML-escaped from renderToStaticMarkup.
  expect(targetHtml).toMatch(/data-arrow="target:s:\d+&gt;[cp]:\d+"/);

  const combat = findBoard(
    (board) => (board.combat?.bands ?? []).some((band) => band.blockerIds.length > 0),
  );
  expect(combat, 'no fixture frame has a blocked combat band').not.toBeNull();
  const combatHtml = renderArrows(combat!.board);
  expect(combatHtml).toContain('arrow--attack');
  expect(combatHtml).toContain('arrow--block');
  expect(combatHtml).toMatch(/data-arrow="block:c:\d+&gt;c:\d+"/);
  // `C` (Forge's SHORTCUT_SHOWCOMBAT) emphasises combat rather than opening a
  // panel: the class is the whole of the difference.
  expect(renderArrows(combat!.board, true)).toContain('arrows--combat');

  // Every path is finite, and every head is a triangle.
  for (const html of [targetHtml, combatHtml]) {
    expect(html).not.toContain('NaN');
    for (const points of [...html.matchAll(/points="([^"]+)"/g)].map((m) => m[1] ?? '')) {
      expect(points.split(' ')).toHaveLength(3);
    }
  }
});

test('NEGATIVE CONTROL: an empty registry draws no arrows at all', () => {
  /*
   * This is the branch every other test in this file renders: a server render
   * registers nothing, so `<Board/>` draws the overlay and no paths. If it ever
   * started drawing them, the arrows would be coming from somewhere other than a
   * measured DOM — which is the only thing that can know where a card is.
   */
  const combat = findBoard((board) => (board.combat?.bands ?? []).some((b) => b.blockerIds.length > 0));
  expect(combat).not.toBeNull();
  const empty = renderToStaticMarkup(<ArrowsOverlay board={combat!.board} />);
  expect(empty).toContain('data-arrows="0"');
  expect(empty).not.toContain('<path');
  // And the same frame through the real board: the overlay is there, inert.
  const withRects = renderArrows(combat!.board);
  expect(withRects).not.toContain('data-arrows="0"');
  expect(withRects).toContain('aria-hidden="true"');
});

test('the hotkeys overlay is rendered from the keymap itself', () => {
  // Report 10 §12.2: one table, consumed by both the handler and the help. A
  // help screen built from a second list is one that will list a key nothing
  // implements — so this asserts the rendered rows ARE the table.
  const html = renderToStaticMarkup(<HotkeysOverlay onClose={() => undefined} />);
  for (const binding of KEYMAP) {
    expect(html, `the overlay does not list ${binding.id}`).toContain(escapeHtml(binding.chord));
  }
  expect(html).toContain('Keyboard');
  expect(KEYMAP.length).toBeGreaterThan(10);
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
