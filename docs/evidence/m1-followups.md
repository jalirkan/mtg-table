# M1 follow-ups — evidence

Dated 2026-09-11. The six items filed under **"M1 follow-ups (minor, from the
hardening verifier)"** in `PLAN.md`, all six now cleared (item 6
landed in M2).
Everything below is a measurement or a diff, not a plan.

| # | `PLAN.md` follow-up | Status |
|---|---|---|
| 1 | opponent library dumped as full cards must **fail**, with an `--opponent-library-ok` escape; seat check in the web P2 test | **done** (§1) |
| 2 | per-kind `answer` shape assertions, keyed off the matching `ask.kind` | **done** (§2) |
| 3 | `check-all.sh`: normalise the fresh re-record and diff it against `fixtures/games/g1.jsonl` | **done** (§3) |
| 4 | no component-level render test — Node's type stripping does not transform JSX | **done** (§4) |
| 5 | `fixtures/synthetic/sample-handwritten.jsonl` still pre-amendment | **done** (§5) |
| 6 | redacted-stub `zone` nullability disagrees across ends | **done** — `Snap.card()` falls back to the caller's zone hint and then to the literal `"unknown"`, so `zone` is a non-null string in both branches (M2; see `docs/evidence/m2-console.md` §5). The M2 review pass extended the same reasoning to the *gate*: a card with no `ZoneType` whose owner is not the viewer is now concealed rather than emitted in full (protocol §3.3) |

Plus two things the pass produced that were not on the list: the board now draws
an outstanding `ask` as a modal-like block and the engine's button labels
verbatim (§6), and A10 learned to read option labels, which no artifact in the
repo had until §7's recordings arrived (§7.4).

The interactive half — `fixtures/games/human-auto-*.jsonl`, the first recordings
with a human seat in them — is §7. They landed while this pass was running, and
they are what turns §2's per-kind answer assertions from a shape nobody had
produced into a measurement.

---

## 1. An opponent's library is a failure, not a warning

**What it was.** `tools/check-redaction.mjs` A3 warned when a seat *other than
the viewer* carried full cards in `library.cards`, on the grounds that the shape
is legitimately reachable — Opposition Agent, Bribery, Gonti all make
`canBeShownTo(viewer)` true for cards in somebody else's library.

**Why that was the wrong default.** An opponent's library is the single largest
hidden-information surface in the game: thirty-odd cards, in order, naming the
rest of their deck. No card in any deck under `decks/` reaches that shape, so
the warning could only ever fire for a regression — and a warning line inside a
1,200-line script's output is indistinguishable from silence in a gate that only
reads the exit code.

**What it is now.** It fails. A recording that genuinely exercises such an effect
declares that on the command line:

```bash
node tools/check-redaction.mjs --opponent-library-ok fixtures/games/bribery.jsonl
```

The flag relaxes **A3 and nothing else**. In particular it does not relax A6: an
id revealed out of an opponent's library still buys no permanent
name-before-reveal exemption, because that reveal is transient (it ends when the
search does) while A6's exemption would last the rest of the log.

Measured, on a probe built by copying a viewer card into the opponent's
`library.cards` in every `state` frame of the synthetic fixture:

```
$ node tools/check-redaction.mjs probe-opp-library.jsonl
FAIL  probe-opp-library.jsonl
      ! :3: players[1] (id 1, NOT the viewing seat 0) has 1 full card(s) in library.cards.
        Legal ONLY while a canBeShownTo-true effect is running on THEIR library (Opposition
        Agent, Bribery, Gonti); anything else is the largest possible leak. Pass
        --opponent-library-ok if this recording really exercises one (A3)

$ node tools/check-redaction.mjs --opponent-library-ok probe-opp-library.jsonl
PASS  probe-opp-library.jsonl
      ~ :3: players[1] (id 1, NOT the viewing seat 0) has 1 full card(s) in library.cards. …
```

**The seat check in the web P2 test.** `web/test/fixtures.test.ts`'s
"a library carries its count, and only cards the viewer may see" test asserted
`cards.length <= count` and "no stub in `cards`" — and never asked *whose*
library it was looking at. It does now: for every `state` frame of every
committed recording, a player who is not the viewing seat has
`library.cards.length === 0`. That is the same statement the checker makes, from
the other end of the wire, and it is the half a shape assertion cannot make.

**Coupled files.** The change made
`fixtures/negative/redaction/a3-opponent-library-revealed.jsonl` a `fail` probe
rather than a `warn` one, so three files outside the web/tools set had to move
with it: `tools/make-negative-fixtures.mjs` (the probe's declared level),
`fixtures/negative/redaction/manifest.json` (the one entry — hand-edited, so the
`.jsonl` probes themselves are untouched), and
`tools/check-redaction-selftest.mjs` (a new block asserting the flag turns the
probe back into a WARN, and that it does **not** excuse either A6 probe). Without
them `check-all.sh` step 8 fails on a stale expectation.

```
$ node tools/check-redaction-selftest.mjs
  ok    a3-opponent-library-revealed.jsonl is rejected (A3: an opponent library dumped as
        full cards -- reachable, but it must be declared)
  ok    a3-opponent-library-revealed.jsonl is a WARN under --opponent-library-ok
  ok    a6-library-reveal-is-not-a-whitelist.jsonl is still rejected under --opponent-library-ok
  ok    a6-opponent-hand-named.jsonl is still rejected under --opponent-library-ok

check-redaction self-test OK
```

---

## 2. A12 — the `answer` half of the ask path

**What it was.** `tools/check-redaction.mjs` audited `ask` frames (A11: the kind
is one of the eleven; every card in the body through the one gated function) and
treated an `answer` body as opaque. So `{"askId":"a7","value":null}` for an
`order` — which `IGuiGame.java:229,232` and `PlayerControllerHuman.java:2317` all
dereference with a bare `.ordered()` — read exactly like a legal cancel.

**What it is now.** The checker keeps `askId → {kind, option count}` from every
`ask` and validates the `answer` that closes it:

| kind | `null` legal? | non-null shape |
|---|---|---|
| `ability_menu`, `options` | yes | an integer option index in `[0, n)` |
| `confirm` | yes | a boolean |
| `text` | yes | a string |
| `choose_list` | **no** (§5.4, invariant 6) | option indices in `[0, n)` |
| `order` | **no** (§5.4, invariant 6) | `{ordered: [index…], remember: bool}`, indices into `dest ++ source` |
| `choose_entities`, `sideboard` | yes | option indices |
| `assign_damage`, `assign_amount` | yes (`null` = "let Forge assign") | `{"<index>": int}` with every key an index in `[0, n)` |
| `manipulate_list` | **no** (§5.4) | a **permutation of all `n` indices** — `PlayerControllerHuman.java:986` indexes the result, so a short answer is an index error waiting to happen |

`n` is the ask's option count, taken from whichever list the kind puts its
options in; for the two kinds that present **one** server-side array in **two**
halves (`order`'s `dest`/`source`, `sideboard`'s `main`/`side`) it is the sum,
because §5.1 says the ids run across both.

Plus the pairing rules of §2.3: an `answer` for an `askId` no `ask` opened fails,
a **second** answer for a completed one fails, a reused `askId` fails, and an ask
still open at EOF **warns** (a log truncated by a kill, or one whose game ended
while the thread was parked, legitimately ends mid-question — what it must never
be is invisible).

Seven one-defect probes against `fixtures/synthetic/sample-handwritten.jsonl`,
each mutating exactly one answer, all rejected:

| probe | message |
|---|---|
| `order` answered `null` | `answer for the order ask "a13" … is null. That kind has NO usable null default: §5.4 and invariant 6` |
| `choose_list` answered `null` | same, for `a9` and `a11` |
| `options` answered `99` | `§5.2 wants an option index in [0, 3) -- got 99` |
| `manipulate_list` answered `[0]` | `§5.2 wants all 3 indices (the full list, reordered) -- got 1` |
| `confirm` answered `"yes"` | `§5.2 wants a boolean` |
| an answer with an unknown `askId` | `answer for askId "a99", which no ask in this log opened` |
| the opponent-library probe of §1 | (A3, above) |

On the corpus:

```
fixtures/synthetic/sample-handwritten.jsonl
  A12 answers=12 (kinds: ability_menu, assign_amount, assign_damage, choose_entities,
  choose_list, confirm, manipulate_list, options, order, sideboard, text), value shape
  checked against the matching ask.kind, unanswered asks=0
```

Every **AI-vs-AI** recording reports `answers=0`: such a log has no ask at all
(§8.4). The three human-seat recordings of §7 report 8, 5 and 11, all of them
`choose_list` and `order` — the two kinds whose answer may never be `null`, and
neither is.

---

## 3. The value-level drift diff

`check-all.sh` re-records a fresh game at seed 42 into `var/` and runs the
redaction checker over it. That catches a **shape** regression. It would happily
pass a `Snap.java` that started writing every phase name lowercased, every
`power` as a number, a stack ordered top-first, or one fewer event per flush —
all of those are still "a string where a string belongs".

New step 6 closes that. It normalises away the four per-run values and diffs:

- `t` — epoch ms, different every run, at any depth;
- `startedAt` — the session header's ISO-8601 timestamp;
- `gameId` — the `--out` basename, so `g1` vs `check-all-record`, which appears
  in the header, in the `hello_ok` body and in every `state` body.

Nothing else is touched: `seq`, `forgeJarSha256`, the deck sha256s and every
value inside every card stay exactly as the emitter wrote them. Those *are* the
wire, and a difference in one is the finding.

Measured, before the step was written (the fresh recording left by an earlier
`check-all` run, against the committed fixture):

```
$ wc -l var/check-all-record.jsonl fixtures/games/g1.jsonl
  377 var/check-all-record.jsonl
  377 fixtures/games/g1.jsonl
$ diff <(normalise var/check-all-record.jsonl) <(normalise fixtures/games/g1.jsonl)
$ echo $?
0
```

Byte-identical after normalisation — 3,910,733 raw bytes against 3,905,469, all
of the difference being timestamps and the six-character game id. And in the
gate:

```
=== 6. value-level drift -- normalise the fresh recording and diff it against fixtures/games/g1.jsonl ===
OK: 377 normalised lines identical to fixtures/games/g1.jsonl
```

Failure prints the first 20 differing lines and dies with
`Snap.java changed the wire: re-record fixtures/games/*.jsonl`.

**The one caveat, written down on purpose.** `docs/protocol.md` §8.7 declines to
promise byte-identical replay, because thread interleaving is not deterministic.
Measured here it *is* identical, twice. If this step ever goes **flaky** rather
than failing consistently, that is the reason — and the fix is to compare the two
normalised files frame-type-by-frame, not to delete the step. The comment at the
top of `check-all.sh` says so.

---

## 4. `<Board/>` is finally mounted by a test

**The gap.** `npm test` was `node --test test/*.test.ts`, and **Node's type
stripping does not transform JSX**, so no test in the repo could import
`Board.tsx` at all. M1 shipped a `TypeError` that blanked the page on the primary
fixture while 122 tests stayed green; the workaround was to call `describeEvent`
directly from `fixtures.test.ts` — one leaf of the tree, nothing above it.

**The fix.** `vitest` (one devDependency, 18 packages) plus
`web/vitest.config.ts` and `web/test/render.test.tsx`. `npm test` is now
`node --test test/*.test.ts && vitest run`; `npm run test:node` and
`npm run test:render` run the halves separately. Vitest's `include` is narrowed
to `test/**/*.test.tsx` so it does not also pick up the five `node --test` files,
whose `test()` comes from `node:test` and takes different arguments.

**What it asserts.** One test per fixture — `fixtures/games/` *and*
`fixtures/synthetic/` — folding every frame through the real reducer and
rendering the real `<Board/>` after **every** frame, starting with the empty
board before the first `state`. A throw anywhere in the tree fails the fixture
and names the frame (`seq`, `type`). Each render must also produce more than 64
bytes and must not contain the literal `undefined` or `[object Object]` — both
are how a missing guard reaches the user as *text* instead of as a crash, which
is strictly worse because nothing fails.

```
✓ fixtures/games/disjoint.jsonl: <Board/> renders every frame without throwing      202ms
✓ fixtures/games/future-sight.jsonl: …                                              133ms
✓ fixtures/games/g1.jsonl: …                                                        271ms
✓ fixtures/games/g2.jsonl: …                                                        142ms
✓ fixtures/games/g3.jsonl: …                                                        193ms
✓ fixtures/games/human-auto-2026.jsonl: …                                           645ms
✓ fixtures/games/human-auto-42.jsonl: …                                            1240ms
✓ fixtures/games/human-auto-7.jsonl: …                                              854ms
✓ fixtures/games/morph.jsonl: …                                                     132ms
✓ fixtures/synthetic/sample-handwritten.jsonl: …                                     21ms
✓ an outstanding ask renders as a read-only block listing the engine's option labels 83ms
✓ input.buttons labels reach the board verbatim, engine spelling and all              70ms
✓ the corpus renders at least one ask and one input (the synthetic half)             55ms
✓ NEGATIVE CONTROL: the harness still notices when the board cannot draw a state     11ms

Test Files  1 passed (1)      Tests  15 passed (15)      Duration  4.17s
```

That is **5,409 board renders** across ten fixtures — all 5,399 frames plus the
ten empty boards, with the three human-seat recordings included.

**Why `renderToStaticMarkup` and not jsdom.** The board is a tree of pure
function components: no `useState`, no `useEffect`, no refs, no browser API
beyond `<img src>`. A server render executes every component function and
evaluates every JSX expression in the tree — which is where all four classes of
board crash live — so a DOM would add a dependency and catch nothing extra. If
the board ever grows an effect, that decision needs revisiting; the reasoning is
in the header of `render.test.tsx` so the next reader does not have to guess.

**The negative control.** A render test that cannot fail proves nothing — the
same argument that produced `check-redaction-selftest.mjs` after a checker
quietly accepted five reverted amendments. The last test corrupts a real state
(a player whose `zones` is `null`) and asserts the harness still throws. If it
ever stops, every test above it is vacuous.

**The art index.** The test loads `web/public/art.json` when it exists and falls
back to `EMPTY_ART_INDEX` otherwise, and says which it got. It matters: with art
loaded, `CardLine` takes its `<img>` branch and builds the `title` string out of
`setCode` / `collectorNumber` / `artist`; with the empty index every card takes
the text-thumbnail branch. `art.json` is gitignored, so the test has to be total
over both.

---

## 5. The synthetic corpus, and the WARN that is gone

`tools/make-sample-fixture.mjs` had already been brought to the amended shapes
before this pass started — five-key stubs, `token` and `alt` on every card,
`library.cards`, `input.focusCard`/`weak`/`openZones`, all eleven ask kinds with
option objects and a matching `answer`, and the `scry`/`surveil`/`phased`/
`foretold` events. `node tools/check-redaction.mjs` on it prints no `WARN` line
at all, which is the follow-up's actual acceptance test.

Two genuine holes were left, and this pass filled them:

- **`tokens=0`.** No card in the fixture had `token: true`, so amendment P15 had
  no renderer evidence here. There is now a `Soldier Token` — shape copied from a
  real one in `g1.jsonl` so the hand-built file cannot drift from what the
  emitter writes — and its id is **90 on purpose**: 90 is the id of the `zone`
  event whose `from` is `null`, so the event that says *a token came from
  nowhere* and the token it created are in the same frame. That join is exactly
  what a renderer needs and what nothing was testing.
- **Four frame types with no artifact.** An AI-vs-AI recording is `hello_ok` + a
  run of `state` + `over` (§8.4). `notice` (§6), `ping`/`pong` (§2.5) and
  `resync` (§2.4) each had a branch in `reduce()` reachable only from frames
  hand-built inside a unit test — which is not the same thing as a log the
  transport parses. The fixture now carries one of each.

```
$ node tools/make-sample-fixture.mjs fixtures/synthetic/sample-handwritten.jsonl
wrote …: 1 session header + 35 frames (20 s2c, 15 c2s), 11/11 ask kinds: ability_menu,
assign_amount, assign_damage, choose_entities, choose_list, confirm, manipulate_list,
options, order, sideboard, text
  11/11 frame types: act, answer, ask, hello_ok, input, notice, over, ping, pong, resync, state

$ node tools/check-redaction.mjs fixtures/synthetic/sample-handwritten.jsonl
PASS  fixtures/synthetic/sample-handwritten.jsonl
      frames=35 (state=2, other=33)  bytes=35284  events=24
      cards checked=42  redacted=4  face-down=6  stack cards=2  …
      A6 ever-revealed ids=21  library cards revealed=2  alt blocks=2  tokens=1  asks=12
      A12 answers=12 (…), unanswered asks=0
```

`web/test/synthetic.test.ts` gained one test asserting both — all eleven frame
types of §2 (`deepEqual` against `FRAME_TYPES`, so a twelfth type added to
`protocol.ts` without an artifact fails here), a token with `manaCost: null`, and
that a token is the subject of the null-`from` `zone` event.

---

## 6. The text board shows the question

`docs/protocol.md` §5: an `ask` **blocks the Forge game thread** until an answer
arrives, and it is the only frame the server waits on. M1 drew it in a column
beside the event log, where a reader scrolling the board cannot tell a stopped
game from a slow one.

It is now a **modal-like block at the top of the board**, above the seats,
absent entirely when there is no question (an empty "no outstanding question"
panel occupying that space every frame would train the reader to ignore the place
the question appears). It carries the kind, the `askId`, the timeout, the prompt,
`the game thread is blocked on this`, and one row per option:

```html
<section class="ask-modal" role="dialog" aria-label="The engine is asking: choose_entities">
  <div class="ask-modal__head">
    <span class="k">choose_entities</span> <span class="muted">a15 · timeout 120000 ms</span>
    <span class="ask-modal__blocked">the game thread is blocked on this</span></div>
  <p class="prompt">Search your library for a card</p>
  <ol class="ask-modal__options">
    <li class="ask-modal__option"><span class="ask-modal__index">[0]</span>
      <span class="ask-modal__label">A.I.M. Scientists</span>
      <span class="muted"> — A.I.M. Scientists #108</span></li>
    <li class="ask-modal__option"><span class="ask-modal__index">[1]</span>
      <span class="ask-modal__label">Web Up</span>
      <span class="muted"> — Web Up #109</span></li>
    <li class="ask-modal__option"><span class="ask-modal__index">·</span>
      <span class="ask-modal__label">Nick Fury, Spymaster #106</span>
      <span class="muted"> — Searching: library of player 0</span></li>
    …
  </ol>
  <p class="hint">Read-only: M1 renders the question, M2/M5 answer it. …</p>
</section>
```

Three decisions in that markup:

- **`role="dialog"`, not `aria-modal`.** Nothing is trapped and nothing is
  clickable; the board behind it is still the truth, and telling a screen reader
  otherwise about a read-only block would be a lie.
- **The index is the ask-local index** (§5.1), rendered `[0]` for a real option
  and `·` for a row that is not one — `confirm`'s two button labels, `text`'s
  initial value, a `delayedReveal` card. The alternative was printing a plausible
  index for a row an answer cannot address.
- **The label is the engine's, verbatim.** The bridge already decided what each
  option may be called: a concealed option arrives labelled `"???"`, because
  `String.valueOf(CardView)` prints the real name and an option label is the one
  place outside `Snap.card` where that reaches the wire (report 07 §7). A client
  that rebuilt the label from `option.card` would re-open exactly that hole.

`askOptionRows(ask)` is total over all eleven kinds with no `default` arm, so a
twelfth kind added to `protocol.ts` fails the typecheck here rather than
rendering a blank question at runtime. The two kinds that carry two lists
(`order`, `sideboard`) emit their rows in `dest ++ source` / `main ++ side`
order, the same order the answer indexes them in.

**`input.buttons` labels, verbatim.** `Undo (2)`, `End Turn` and `Auto` are
Forge's own labels — `InputPassPriority.java:162-178`,
`InputPayMana.java:376-395` — not client features, which is why §10.3 says there
is **no `autoPay` act and no `endTurn` act**. The buttons now go through one
`EngineButton` component that prints `button.label` and carries the title
*"the engine's own label — clicking would send act: buttonOk"*, so the next
reader cannot mistake `Auto` for something the board invented. `disabled` is
likewise the engine's answer, and §4.2's hint ("OK is disabled and cards are
selectable: the engine wants a card click") still fires beneath it.

Two tests pin the "verbatim" half, because it is a rule and not a default:
every option label of every ask in the synthetic fixture must appear in the
rendered markup (HTML-escaped — one of them is `S.H.I.E.L.D. Spy Kit`), and
every `buttons.ok.label` / `buttons.cancel.label` of every `input` frame must
too, with `Undo (1)` asserted by name.

---

## 7. The human-seat fixtures

Three landed during this session — seat 0 played by a `PlayerControllerHuman`
under a scripted policy, seat 1 the AI — and they are the first artifacts in the
repo with real `input` / `ask` / `act` / `answer` frames rather than hand-written
ones:

| file | frames | state | input | ask | answer | asks answered |
|---|---|---|---|---|---|---|
| `human-auto-42.jsonl` | 1,609 | 226 | 987 | 8 | 8 | 8/8 |
| `human-auto-7.jsonl` | 1,215 | 165 | 758 | 5 | 5 | 5/5 |
| `human-auto-2026.jsonl` | 927 | 133 | 529 | 11 | 11 | 11/11 |

### 7.1 `check-redaction.mjs`: all three PASS

```
PASS  fixtures/games/human-auto-42.jsonl
      frames=1609 (state=226, other=1383)  bytes=2651137  events=1393
      cards checked=5575  redacted=430  face-down=0  stack cards=41
      opponent-hand cards=430  viewer-hand named=883
      shape-checked state bodies=226 (exact key set + runtime type of every key, §3)
      engine strings=73 (stack[].text + events[].cast.text), concealed=0,
      none joinable to a card concealed in the same frame
      A6 ever-revealed ids=42  library cards revealed=0  alt blocks=0  tokens=638
      asks=8  prompts scanned=1003
      A12 answers=8 (kinds: choose_list, order), value shape checked against the
      matching ask.kind, unanswered asks=0
```

**That `A12 answers=8` is the first non-zero answer count from an engine
recording**, and therefore the first time §2's per-kind answer shapes were
asserted against something the Java side produced rather than something a
generator wrote. Both kinds present are kinds whose answer may never be `null`,
and neither is: `choose_list` answers `[]` and `[0]`, `order` answers
`{"ordered":[0],"remember":false}`.

The `order` ask is worth spelling out, because it is the shape M1 guessed wrong
and this is the first engine-produced instance of it:

```jsonc
{"askId":"a7","kind":"order","timeoutMs":30000,
 "prompt":"Select order for replacement effects","destLabel":"Apply first",
 "dest":[],
 "source":[{"id":0,"label":"Thriving Isle (9) - Thriving Isle enters tapped.","kind":"other"},
           {"id":1,"label":"Thriving Isle (9) - As Thriving Isle enters, choose a color other than blue.","kind":"other"}],
 "min":0,"max":1,"referenceCardId":null,"sideboardMode":false,"showRemember":true}
// answered: {"ordered":[0],"remember":false}
```

`dest ++ source` is a two-element array, the answer's index 0 is in `[0, 2)`, and
it is `{ordered, remember}` and not `{top, bottom}` — §5.3, confirmed against the
engine.

No protocol violation was found in any of the three. Every `ask` body's key set
matches `protocol.ts` exactly (`choose_list`:
`askId,kind,max,min,options,preselected,prompt,reveal,timeoutMs`; `order`:
`askId,dest,destLabel,kind,max,min,prompt,referenceCardId,showRemember,sideboardMode,source,timeoutMs`),
every `input` carries all nine §4 keys, the `notice` bodies are
`{level,title,text}`, and the `act` bodies are `buttonOk` / `buttonCancel` /
`clickCard` / `alphaStrike`, all four in §2.2's table.

### 7.2 `web/test/human-seat.test.ts` — 15 tests, 5 per recording

1. **it is a human-seat log at all** — `hello_ok.you` agrees with the session
   header's `seat`, that seat's `isAi` is `false`, and the log carries `input`,
   `ask` and `answer` frames. Without this, an AI-vs-AI recording under a
   different filename would satisfy every assertion below by being empty.
   Measured frame types: `act, answer, ask, hello_ok, input, notice, over, state`
   — eight of §2's eleven, against the three an AI-vs-AI recording has.
2. **`reduce()` does not throw on a single frame**, and the log ends game over.
3. **`input` and `ask` merge into the one `ClientState`** (§4.1: two frames on
   the wire, one object in the client) — after an `input` frame `state.input`
   deep-equals the body and carries every key §4 declares always present
   (`prompt`, both buttons' `label`/`enabled`, `selectable.{cardIds,mode}`,
   `highlighted`, `weak`, `openZones`, and `focusCard` agreeing with
   `focusCardId`); after an `ask` frame `state.ask` deep-equals the body; after
   the matching `answer`, `state.ask` is `null`.
4. **exactly one answer per ask** (§2.3) — every `askId` opened once, answered
   once, and answered *after* it was asked. Zero answers is called out as a wedge
   (an ask blocks the game thread; §5.4 exists so that cannot happen), two as the
   `ReplyPool` completing a future twice.
5. **every `ask.kind` is one of the eleven** and every option `id` is the
   ask-local index it claims to be, across `dest ++ source` / `main ++ side` for
   the two-list kinds — plus: a concealed card inside an ask body is still the
   five-key stub.

The suite globs `human-*.jsonl` so the other seeds get the same treatment, and
asserts at the end that `human-auto-42.jsonl` — the one `PLAN.md` names — is
among them. It skips, with a diagnostic, if no such recording exists.

The three recordings also pick up the whole existing contract for free, because
`fixtures.test.ts` and `render.test.tsx` both glob `fixtures/games/`: the
opponent's hand is stubs (430 / 676 / 531 of them), no engine string names a card
concealed in the same frame, the session header does not identify the opponent's
decklist, the P2 seat check of §1 — and `<Board/>` renders **every one of their
3,751 frames** without throwing.

### 7.3 What the engine actually labels its buttons

This is the evidence for §6's "verbatim" rule, and it is better than the
argument. The distinct `input.buttons` labels in `human-auto-42.jsonl`:

| | labels |
|---|---|
| `ok` | `Play`, `Keep`, `OK`, `Auto`, `""` |
| `cancel` | `Draw`, `Mulligan`, `Cancel`, `End Turn`, `Alpha Strike`, `Call Back`, `""` |

`Auto`, `End Turn`, `Alpha Strike` and `Call Back` are Forge's, on the same two
buttons the client answers with `buttonOk` / `buttonCancel`. A board that printed
its own "Pass" and "Confirm" would have hidden four engine features behind two
invented ones — which is precisely why §10.3 says there is no `autoPay` act and
no `endTurn` act. (`""` is a real label too: Forge blanks a button it does not
want used, alongside `enabled: false`.)

The `act` frames the policy actually sent: `buttonOk`, `buttonCancel`,
`clickCard`, `alphaStrike`.

### 7.4 One thing the human fixture exposed: A10 never looked at option labels

`docs/protocol.md` §5 is explicit — *"every card inside an `ask` or `input` body
goes through the same function, and every option **label** through the same gate.
The label is the leak that will actually happen."* The checker's A10 scanned
`ask.prompt` and `input.prompt` for `name (id)` joins and **never looked at a
single option label**, because until now no artifact in the repo had an
engine-built one.

`human-auto-42.jsonl` has them, and they are exactly the shape A10 exists for:

```
"Thriving Isle (9) - Thriving Isle enters tapped."
```

Card 9 is the viewer's own land, so nothing leaks. The point is that nothing was
looking. A10 now scans every option `label` in an ask body plus `yesLabel`,
`noLabel`, `destLabel`, `label`, `title` and `suggestions[]` — scanned-string
counts went from 990 to 1,003 on `human-auto-42` and from 11 to 47 on the
synthetic fixture, and the whole corpus is clean. A probe that puts a concealed
opponent card's id into an option label is caught:

```
~ ask.options[0].label names card #201, which the last snapshot concealed from
  seat 0: "Bold Biochemist (201)" (A10 -- the engine builds this string, we do not)
```

It is a **warning**, matching A10's existing treatment of prompts, and
deliberately so for now: an ask can legitimately name a card the previous
snapshot concealed, because the ask itself is the reveal (`delayedReveal`, a
`tempShowCards` window). Promoting it to a failure wants a corpus with a search
effect in it — `choose_entities` with a `delayedReveal` has still never been
emitted by the engine — and is the obvious next hardening once one exists.

---

## 8. The gate

```
$ ./tools/check-all.sh
=== 1. check-forge.sh -- the jar and the eight classes ===
=== 2. lint-bridge.sh -- the grep bans ===
=== 3. bridge/build.sh -- javac + Json self-test ===
=== 4. Smoke -- boot the engine, prove the prefs (D13) and the card overlay (D14) ===
=== 5. RecordMatch -- a FRESH recording (seed 42) into var/, not a committed fixture ===
=== 6. value-level drift -- normalise the fresh recording and diff it against fixtures/games/g1.jsonl ===
OK: 377 normalised lines identical to fixtures/games/g1.jsonl
=== 7. check-redaction.mjs -- every committed fixture, then the fresh recording ===
PASS  fixtures/games/disjoint.jsonl
PASS  fixtures/games/future-sight.jsonl
PASS  fixtures/games/g1.jsonl
PASS  fixtures/games/g2.jsonl
PASS  fixtures/games/g3.jsonl
PASS  fixtures/games/human-auto-2026.jsonl
PASS  fixtures/games/human-auto-42.jsonl
PASS  fixtures/games/human-auto-7.jsonl
PASS  fixtures/games/morph.jsonl
PASS  fixtures/synthetic/sample-handwritten.jsonl
PASS  var/check-all-record.jsonl
=== 8. check-redaction-selftest.mjs -- the checker's own negative controls ===
check-redaction self-test OK
=== 9. web -- npm run build && npm test ===
ℹ tests 181   ℹ pass 181   ℹ fail 0   ℹ skipped 0
 ✓ test/render.test.tsx (15 tests) 4068ms

check-all OK
```

`npm run build` is `tsc --noEmit && vite build`: zero TypeScript errors, 34
modules, 180.88 kB. Run at 17:13 against the Java side's in-progress M2 tree
(`WireGuiGame`, `ReplyPool`, `Transport`, `ConsoleTransport`, `AutoTransport`,
`MtgTable` all present and compiling) — step 6 in particular is green against a
`Snap.java` that had been edited twice since the committed fixtures were
recorded, which is the strongest form the claim takes: the wire did not move.
