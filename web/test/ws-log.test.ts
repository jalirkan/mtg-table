/*
 * mtg-table — web/test/ws-log.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **A recorded socket session, replayed through the real reducer.**
 *
 * The M3 gate this file is: a `--transport ws` session is a frame log like any
 * other (§8), so the proof that the socket half did not invent a shape is that
 * the same `reduce()` the browser runs folds the whole file without throwing —
 * and that the ask path closed properly.
 *
 * ---------------------------------------------------------------------------
 * THE CORPUS IS GIVEN TO THIS FILE, NOT DISCOVERED BY IT
 *
 * It used to glob `var/` for anything that looked like a ws log. That made
 * `npm test` depend on scratch state: any session left behind by any earlier
 * command — a browser game, a probe, a deliberately-interrupted run — became an
 * assertion, and three such directories were enough to turn a green suite red
 * with nothing in the repo changed (measured: 282 pass / 3 fail with
 * `var/games/verify-cancelall-13`, `verify-askdrop-13` and `verify-ws17-askdrop`
 * present; 279 / 0 with them moved aside). A test whose result depends on what
 * is lying around in `var/` is not a test.
 *
 * So the corpus is exactly one of two things:
 *
 *   1. the paths in **`MTGTABLE_WS_LOGS`** (comma- or newline-separated), which
 *      `tools/check-all.sh` sets to the logs **it just produced** in step 10 —
 *      the client's own `--log` file and the bridge's `var/games/<id>/` copies;
 *   2. otherwise the committed `fixtures/games/human-*.jsonl` and nothing else.
 *
 * A run that got (2) says so on stderr, so proving less is visible rather than
 * being mistaken for evidence about the socket.
 * ---------------------------------------------------------------------------
 *
 * **At most one answer per ask** is the assertion that matters (§2.3, §5.4), and
 * for a client log it is exactly one. Its two failure modes are both invisible
 * in a green run:
 *
 *   - an ask with **no** answer is, in a client log, a game thread parked
 *     forever: `--transport ws` has an infinite ask timeout while a client is
 *     connected (D15 extended, contract (c)), so an unanswered ask does not
 *     resolve itself the way the 30 s transports' does — it is the on-disk shape
 *     of a wedge. In the **bridge's own** log it is also the documented shape of
 *     `ReplyPool.cancelAll()` at a disconnect (§5.4), where no `answer` line is
 *     ever written — which is the whole path M3 exists to support, so it is not
 *     asserted there;
 *   - an ask with **two** answers is a client that re-sent after a reconnect;
 *     §2.3 says the second is dropped with a notice and never applied, and a
 *     client that produces one is relying on the server to clean up after it.
 */

import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { isFaceDown, isHidden, keywordsOf, type AnswerBody, type AnyCard, type AskBody, type Frame } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { cardStatus } from '../src/status.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const GAMES = `${REPO}fixtures/games/`;

interface Candidate {
  path: string;
  why: string;
  /** True when this file really is a socket session, not the M2 fallback. */
  isWs: boolean;
  /**
   * Whether **every** ask in this file must carry an answer, and whether the
   * amendment-M8 click assertion applies.
   *
   * True for a log a *client* wrote (`recordedBy: "client"`, §8.1) and for the
   * committed fixtures: both were played by the dumb-human policy, which
   * answers every ask and clicks cards Forge never put in `selectable`. False
   * for the bridge's own logs under `var/games/`, where an ask outstanding at a
   * disconnect is completed by `ReplyPool.cancelAll()` (§5.4) with **no `answer`
   * line at all**, and where the client on the other end may have been a browser
   * session, a smoke test, or a person — none of whom owe this file a click
   * pattern. Those are still held to "at most one answer per ask".
   */
  strict: boolean;
}

/** §8.1: a client wrote this file, so it is the policy's own transcript. */
function wroteItsOwnLog(path: string): boolean {
  const first = readFileSync(path, 'utf8').split('\n', 1)[0] ?? '';
  return first.includes('"recordedBy":"client"') || first.includes('"recordedBy": "client"');
}

function shortName(path: string): string {
  const at = path.indexOf('/mtg-table/');
  return at === -1 ? path : path.slice(at + '/mtg-table/'.length);
}

/** The logs `tools/check-all.sh` just produced, named explicitly. */
function given(): Candidate[] {
  const raw = process.env['MTGTABLE_WS_LOGS'] ?? '';
  const out: Candidate[] = [];
  for (const entry of raw.split(/[\n,]/)) {
    const path = entry.trim();
    if (path === '') continue;
    const full = path.startsWith('/') ? path : REPO + path;
    // A named log that is not there is a failure of whoever named it, and the
    // `there is a corpus at all` test below is where that surfaces.
    if (!existsSync(full)) {
      missing.push(full);
      continue;
    }
    const strict = wroteItsOwnLog(full);
    out.push({
      path: full,
      why: `MTGTABLE_WS_LOGS — ${strict ? "the client's own --log" : "the bridge's own frame log"}`,
      isWs: true,
      strict,
    });
  }
  return out;
}

function fallbacks(): Candidate[] {
  const names = [
    'human-auto-42.jsonl',
    'human-auto-7.jsonl',
    'human-auto-2026.jsonl',
    'human-trample-7.jsonl',
    'human-scry-7.jsonl',
  ];
  return names
    .filter((name) => existsSync(GAMES + name))
    .map((name) => ({
      path: GAMES + name,
      why: 'committed M2 human-seat fixture (MTGTABLE_WS_LOGS was not set)',
      isWs: false,
      strict: true,
    }));
}

const missing: string[] = [];
const named = given();
const chosen = named.length > 0 ? named : fallbacks();

test('there is a seat recording to replay at all', () => {
  assert.deepEqual(
    missing,
    [],
    'MTGTABLE_WS_LOGS names a file that does not exist — the caller (tools/check-all.sh) ' +
      'is pointing this test at a log it did not produce',
  );
  assert.ok(
    chosen.length > 0,
    'MTGTABLE_WS_LOGS is empty and there are no committed fixtures/games/human-*.jsonl — ' +
      'this test proves nothing',
  );
  for (const c of chosen) {
    process.stderr.write(`# ws-log: ${shortName(c.path)} — ${c.why}\n`);
  }
  if (named.length === 0) {
    process.stderr.write(
      '# ws-log: no MTGTABLE_WS_LOGS — this run proves the ASK PATH over the committed M2 ' +
        'fixtures and says NOTHING about the socket. tools/check-all.sh step 10 sets it.\n',
    );
  }
});

for (const candidate of chosen) {
  const file = shortName(candidate.path);

  test(
    `${file}: folds through reduce(), and ${candidate.strict ? 'every ask is answered exactly once' : 'no ask is answered twice'}`,
    () => {
      const log = parseFrameLog(readFileSync(candidate.path, 'utf8'));
      assert.ok(log.frames.length > 0, `${file} carries no frames`);

      // A ws log is written by, or for, a client that saw a `hello_ok`, so the
      // header must be there and must say which transport played the seat
      // (§8.1, amendment M3).
      if (candidate.isWs) {
        assert.notEqual(log.header, null, `${file} has no §8.1 session header on line 0`);
        assert.equal(
          log.header?.transport,
          'ws',
          `${file}: the session header does not say transport="ws"`,
        );
      }

      let state = initialState(log.header);
      const askSeen = new Map<string, AskBody>();
      const answerCount = new Map<string, number>();
      const answerOrder: string[] = [];
      let overs = 0;
      let lastType = '';
      let acts = 0;
      let notSelectable = 0;

      for (let i = 0; i < log.frames.length; i++) {
        const frame: Frame = log.frames[i]!;
        // §1: an unknown type / ask.kind / v mismatch THROWS. Letting it do so
        // here, un-caught, is the whole point — the message names the frame.
        state = reduce(state, frame);
        lastType = frame.type;

        if (frame.type === 'ask') {
          const body = frame.body as AskBody;
          // Amendment M10: a client log legitimately carries the SAME ask twice
          // when a resync or a reconnect re-delivered it, verbatim — same seq,
          // same t. That is a repeat, not a re-use, so it is only a defect when
          // the body differs.
          const prior = askSeen.get(body.askId);
          if (prior !== undefined) {
            assert.deepEqual(
              body,
              prior,
              `${file}: askId ${body.askId} was issued twice with DIFFERENT bodies (§5: an ` +
                `askId is unique for the life of the connection; M10 permits a verbatim repeat)`,
            );
          } else {
            askSeen.set(body.askId, body);
          }
          assert.equal(
            state.ask?.askId,
            body.askId,
            `${file}: reduce() did not make ${body.askId} the outstanding question`,
          );
        }

        if (frame.type === 'answer') {
          const body = frame.body as AnswerBody;
          assert.ok(
            askSeen.has(body.askId),
            `${file}: an answer for ${body.askId}, which was never asked`,
          );
          answerCount.set(body.askId, (answerCount.get(body.askId) ?? 0) + 1);
          answerOrder.push(body.askId);
          assert.notEqual(
            body.value,
            undefined,
            `${file}: answer ${body.askId} carries no value key (§2.3)`,
          );
        }

        if (frame.type === 'act') {
          acts += 1;
        }
        if (frame.type === 'notice' && frame.body.title === 'Not selectable') {
          notSelectable += 1;
        }
        if (frame.type === 'over') overs += 1;
      }

      // The reason this test exists.
      let unanswered = 0;
      for (const [askId, ask] of askSeen) {
        const n = answerCount.get(askId) ?? 0;
        assert.ok(
          n <= 1,
          `${file}: ask ${askId} (kind=${ask.kind}) got ${String(n)} answers — §2.3 is exactly ` +
            `one, and a second answer for a completed askId is dropped, never applied`,
        );
        if (n === 0) unanswered += 1;
        if (candidate.strict) {
          assert.equal(
            n,
            1,
            `${file}: ask ${askId} (kind=${ask.kind}) was never answered — a client that stops ` +
              `answering leaves the game thread parked (§5.4), and the ws transport's ask ` +
              `timeout is 0 while a client is connected, so nothing unparks it but a disconnect`,
          );
        }
      }
      if (unanswered > 0) {
        process.stderr.write(
          `# ${file}: ${String(unanswered)} ask(s) with no \`answer\` line — legitimate only as ` +
            `ReplyPool.cancelAll() at a disconnect (§5.4)\n`,
        );
      }
      /*
       * …and the answers that were given came in the order the asks were asked.
       * A SUBSEQUENCE, not an equality: an ask completed by
       * `ReplyPool.cancelAll()` at a disconnect never gets an `answer` line at
       * all (§5.4), so demanding `answerOrder === [...askSeen.keys()]` failed on
       * exactly the documented path M3 exists to support. What is still true,
       * and is what a single blocking call site can produce, is that no answer
       * ever overtakes an earlier one.
       */
      const askOrder = [...askSeen.keys()];
      let at = 0;
      for (const askId of answerOrder) {
        const found = askOrder.indexOf(askId, at);
        assert.notEqual(
          found,
          -1,
          `${file}: answers are out of ask order — ${askId} was answered after an ask that ` +
            `came later (asks ${askOrder.join(',')}; answers ${answerOrder.join(',')})`,
        );
        at = found + 1;
      }

      // §8.4: exactly one `over`, and it is the last frame.
      assert.equal(overs, 1, `${file}: ${String(overs)} \`over\` frames; §7 says exactly one`);
      assert.equal(lastType, 'over', `${file}: the last frame is ${lastType}, not \`over\` (§8.4)`);

      // A seat recording with no acts in it is not a seat recording.
      assert.ok(acts > 0, `${file}: no c2s \`act\` lines — nobody played this seat (§8.4)`);

      process.stderr.write(
        `# ${file}: ${String(log.frames.length)} frames · ${String(acts)} acts · ` +
          `${String(askSeen.size)} asks (${[...new Set([...askSeen.values()].map((a) => a.kind))].sort().join(',') || 'none'}) · ` +
          `${String(notSelectable)} "Not selectable" notices · winner ${String(state.gameOver?.winner)}\n`,
      );
    },
  );

  test(`${file}: amendment M49 — every full card carries keywords, constants only, [] face down, and the status layer shows them face up only`, (t) => {
    /*
     * The gate's fresh sessions are the only M49 recordings the suite ever sees:
     * every committed fixture predates the key, and none is re-recorded for it.
     * So this is where "the bridge writes `keywords` on every full card, as
     * `Keyword` constants, `[]` on a face-down card, never on a stub" is read on
     * a real session — and where the client's one reader and the status layer's
     * decision are run over it. A pre-M49 file (the fallback corpus) skips.
     */
    const log = parseFrameLog(readFileSync(candidate.path, 'utf8'));
    let full = 0;
    let carrying = 0;
    let named = 0;
    let faceDown = 0;
    let statuses = 0;
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      const cards: AnyCard[] = [];
      for (const player of frame.body.players) for (const zone of Object.values(player.zones)) cards.push(...zone.cards);
      cards.push(...frame.body.stackCards);
      for (const card of cards) {
        const raw = (card as { keywords?: unknown }).keywords;
        if (isHidden(card)) {
          assert.equal(raw, undefined, `${file}: stub #${String(card.id)} carries keywords (a sixth key)`);
          continue;
        }
        full += 1;
        if (raw === undefined) continue;
        carrying += 1;
        assert.ok(Array.isArray(raw) && raw.every((k) => typeof k === 'string' && /^[A-Z][A-Z0-9_]*$/.test(k) && k !== 'UNDEFINED'),
          `${file}: card #${String(card.id)} keywords ${JSON.stringify(raw)} are not Keyword constants`);
        if (isFaceDown(card)) {
          faceDown += 1;
          assert.deepEqual(raw, [], `${file}: face-down card #${String(card.id)} carries keywords`);
          assert.deepEqual(keywordsOf(card), []);
          assert.equal(cardStatus(card), null, `${file}: a face-down card has a status`);
          continue;
        }
        if ((raw as string[]).length > 0) named += 1;
        assert.deepEqual(keywordsOf(card), raw);
        if (cardStatus(card) !== null) statuses += 1;
      }
    }
    if (carrying === 0) {
      t.skip('no card on this wire carries keywords — a recording from before amendment M49 (every committed fixture), or a session with no full card at all');
      return;
    }
    assert.equal(carrying, full, `${file}: ${String(full - carrying)} of ${String(full)} full cards carry no keywords — M49 is all or none per file`);
    // A deck with no keyword at all (10g's Thallids) is legitimate; that SOME
    // session writes one is asserted across the logs, below the loop.
    process.stderr.write(
      `# ${file}: M49 — ${String(carrying)} full cards carry keywords (${String(named)} non-empty, ` +
        `${String(faceDown)} face-down all []), ${String(statuses)} with a status strip\n`,
    );
  });

  test(`${file}: amendment M8 — most clicks name a card outside input.selectable`, (t) => {
    /*
     * The rule the board is written against, re-measured on whatever session
     * this run got (§4.1, amendment M8). `selectable` is the EXPLICIT selection
     * set: `InputPassPriority` never calls `setSelectables`, so at your own main
     * phase it is empty while your whole hand is clickable. A board that gated
     * the click on it could not play a land — which is exactly what M1 and M2
     * would have shipped, and what `web/test/human-seat.test.ts` pinned for the
     * committed fixtures. Here it is re-asserted on a socket session, because
     * the ws path is where a "fix" would be tempting.
     *
     * **Only on a log the dumb-human policy wrote** (`candidate.strict`). It is
     * a property of that POLICY, not of the protocol: a client whose clicks all
     * landed inside `selectable` — a short browser session, a smoke test, any
     * other policy — violates nothing, and asserting it on the bridge's copy of
     * whatever happened to connect made this a test of the session rather than
     * of the board.
     */
    if (!candidate.strict) {
      t.skip(
        'not a dumb-human-policy transcript — M8 is a property of that policy, not of the wire',
      );
      return;
    }
    const log = parseFrameLog(readFileSync(candidate.path, 'utf8'));
    let selectable: number[] = [];
    let clicks = 0;
    let outside = 0;
    for (const frame of log.frames) {
      if (frame.type === 'input') selectable = frame.body.selectable.cardIds;
      if (frame.type === 'act' && frame.body.action === 'clickCard') {
        clicks += 1;
        if (!selectable.includes(frame.body.cardId)) outside += 1;
      }
    }
    if (clicks === 0) {
      t.skip('no clickCard acts in this session — the ask test above still ran');
      return;
    }
    assert.ok(
      outside > 0,
      `${file}: every one of ${String(clicks)} clickCard acts named an id inside ` +
        `input.selectable — that is the pre-M8 reading of §4, and a board written to it ` +
        `cannot play a land`,
    );
    process.stderr.write(
      `# ${file}: ${String(outside)}/${String(clicks)} clickCard acts name an id OUTSIDE ` +
        `input.selectable (amendment M8)\n`,
    );
  });
}

/**
 * **Across the sessions, the emitter writes a keyword** (M49). Per file a deck may
 * have none — step 10g plays `decks/yield-probe.dck`, 22 Thallids and not one
 * keyword — so the per-log case above cannot ask for one; but a bridge that wrote
 * the key and never a constant would pass it everywhere. Step 10c plays the deck
 * in play, whose fliers and first strikers are keywords. Skips when no given log
 * carries M49 (the committed fallback).
 */
test('amendment M49 — across the sessions, some full card carries a keyword', (t) => {
  let m49 = 0;
  let named = 0;
  for (const candidate of chosen) {
    const log = parseFrameLog(readFileSync(candidate.path, 'utf8'));
    let carries = false;
    for (const frame of log.frames) {
      if (frame.type !== 'state') continue;
      for (const player of frame.body.players) {
        for (const zone of Object.values(player.zones)) {
          for (const card of zone.cards) {
            const raw = (card as { keywords?: unknown }).keywords;
            if (!Array.isArray(raw)) continue;
            carries = true;
            if (raw.length > 0) named += 1;
          }
        }
      }
    }
    if (carries) m49 += 1;
  }
  if (m49 === 0) {
    t.skip('no given log carries amendment M49 (the committed fallback predates it)');
    return;
  }
  assert.ok(named > 0, `${String(m49)} M49 session(s), and not one full card carries a keyword — the emitter writes the key and never a constant`);
  process.stderr.write(`# M49 across ${String(m49)} session log(s): ${String(named)} full-card sightings with a keyword\n`);
});

