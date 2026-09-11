# M1 evidence — the web half: replay a recorded game in the browser

> **Superseded in part, same day.** The M1 integration review found a renderer
> crash and four wire problems; the fixes changed `state` (see
> `docs/protocol.md` §3.3 `stackCards` + `faceDownHidden`, §3.2 `manaCost: null`,
> §3.6 rule 5) and **every fixture below was re-recorded**. Frame counts, timings
> and the redaction results still hold; byte counts and any `"no cost"` /
> four-keys-only statement do not. `docs/protocol.md` is the current contract.

Recorded 2026-09-11 on Ubuntu, Node v24.20.0 / npm 11.19.0, against
`docs/protocol.md` v1 (including its §10, added by the M1 Java work the same
afternoon). Nothing here is inferred; every line below came from a run on this
machine. Companion evidence: `docs/evidence/m0-smoke.md` (the engine boot) and
the Java half of M1 (the recorder that wrote `fixtures/games/g*.jsonl`).

## The one command

```bash
cd web && npm run dev:replay          # vite, opening /?replay=games/g1.jsonl
```

and the two that prove it:

```bash
cd web && npm run build               # tsc --noEmit && vite build
cd web && npm test                    # node --test test/*.test.ts
```

---

## 1. What was built

| Path | Lines | Role |
|---|---:|---|
| `web/src/protocol.ts` | 836 | Hand-written mirror of `docs/protocol.md`: `Envelope`, the ten frame types, `GameStateBody`, `Card` / `RedactedCard`, the 21 event kinds, the twelve `AskKind`s, `SessionHeader`. Types and const tables only. |
| `web/src/reduce.ts` | 268 | `(ClientState, Frame) => ClientState`. Pure — no DOM, no IO, no console, no mutation. |
| `web/src/transport/transport.ts` | 42 | `interface Transport { onFrame(cb); send(frame); close?() }`. |
| `web/src/transport/replay.ts` | 367 | `parseFrameLog` + `LogReplayTransport` (play / pause / step / scrub / speed). |
| `web/src/render/Board.tsx` | 779 | The plain text board. |
| `web/src/render/ReplayControls.tsx` | 89 | prev / play / next / speed / scrub / `frame n / total`. |
| `web/src/art.ts` | 167 | `art.json` lookup with a text-card fallback. |
| `web/src/main.tsx` | 208 | `?replay=` → fetch → transport → `<Board>`. |
| `web/src/styles.css` | 398 | One plain stylesheet. No framework. |
| `web/test/reduce.test.ts` | 200 | Unknown-frame policy, notice cap, input/ask merge, purity. |
| `web/test/fixtures.test.ts` | 168 | Every `fixtures/games/*.jsonl` replayed; redaction assertions. |
| `tools/fetch-art.ts` | 374 | Deck → Scryfall → `web/public/art.json`. Bare `node`, zero deps. |
| `tools/make-sample-fixture.mjs` | 248 | Regenerates the committed hand-written fixture. |

Dependencies are exactly `react`, `react-dom`, `vite`, `typescript`,
`@vitejs/plugin-react`, `@types/react`, `@types/react-dom` — **plus
`@types/node`**, which is a types-only package with no runtime code, needed
because `tsc --noEmit` also type-checks `web/test/` (which imports `node:test`,
`node:fs`) and `tools/fetch-art.ts`. Without it the tests and the art tool would
be the only unchecked TypeScript in the repo. 73 packages installed in total,
0 vulnerabilities. No state library, no CSS framework.

Resolved versions: vite 7.3.6, @vitejs/plugin-react 5.2.0, typescript 5.9.3,
react 18.3.1, react-dom 18.3.1.

---

## 2. `npm run build` — zero TypeScript errors

```
> mtg-table-web@0.1.0 build
> tsc --noEmit && vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 32 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.28 kB
dist/assets/index-enQ2qfID.css    4.33 kB │ gzip:  1.49 kB
dist/assets/index-6yatcL_i.js   171.15 kB │ gzip: 54.80 kB │ map: 470.73 kB
✓ built in 307ms
wall 1.11s
```

`tsconfig.json` is not merely `strict: true`: it also sets
`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`,
`verbatimModuleSyntax` and `isolatedModules`. `allowImportingTsExtensions` is on
because every internal import carries its `.ts` / `.tsx` extension — which is
what lets `node --test` run the same source files with no build step.

---

## 3. `npm test` — 36 tests, 0 failures

```
✔ there is at least one committed fixture to replay
✔ g1.jsonl: parses as a frame log with a session header
✔ g1.jsonl: replays through the reducer without throwing, and ends game over
✔ g1.jsonl: opponent hand cards never carry a name
✔ g1.jsonl: libraries are a count, never a card list
✔ g1.jsonl: no 'name' key appears anywhere under events (§3.6 rule 1)
✔ g1.jsonl: stepping back re-derives exactly the state stepping forward produced   (30.9ms)
   … the same six for g2.jsonl, g3.jsonl and sample-handwritten.jsonl …
✔ a protocol-major mismatch throws and names the frame
✔ an unknown frame type throws rather than being ignored
✔ an unknown ask.kind throws — a blocked game thread must never be silent
✔ input and ask are merged into the one state object
✔ an answer for some other askId is ignored
✔ notices append and cap at MAX_NOTICES
✔ over sets gameOver and clears any outstanding ask
✔ gameOver is sticky: a later snapshot with gameOver null does not un-end the game
✔ unknown event kinds are dropped, not thrown (§3.6 rule 3 — the one exception)
✔ the pre-game frame (§10.5: turn 0, phase/active/priority null) reduces cleanly
✔ reduce does not mutate the state it is given
ℹ tests 36   ℹ pass 36   ℹ fail 0   ℹ duration_ms 213.3
```

Node 24 runs the `.ts` test files directly by type stripping; there is no build
step and no test framework beyond `node:test`.

The four tests the milestone asked for are all present and all green:

1. **every fixture replays without throwing** — `g1`, `g2`, `g3` and the
   hand-written sample, 885 frames in total.
2. **the final state has `gameOver` set** — all four logs end with an `over`
   frame. The test asserts `state.gameOver !== null` rather than "the last frame
   is an `over`", because `g2.jsonl` passed it even while the Java recorder was
   still appending to it: §3.1 makes `state.gameOver` mirror the `over` body, and
   the reducer makes it sticky, so a log truncated after the game is decided
   still renders its result.
3. **opponent hand cards never have names** — the assertion is stronger than
   "no name": every card in a non-viewing seat's hand must be `hidden:true` and
   carry **exactly** the four keys `id, zone, controller, hidden` (§3.3). A fifth
   key fails the test. Two further redaction tests ride along: libraries carry
   `count` and never `cards` (§3.4), and no key named `name` appears anywhere in
   the `events` tree (§3.6 rule 1).
4. **a protocol-major mismatch throws** — and the assertion checks the message
   names the offending frame (`v=2`, `#17`, `"state"`), because an error that
   does not say which frame died is barely better than a silent skip.

The sixth test per fixture is not in the milestone list but is the one that
actually guards the replay transport: **step back over the whole log and compare
each state to the state the forward walk produced.** It passes because "back" is
implemented as "replay from the session header to index-1 through the pure
reducer", which is only correct if `reduce` really has no side effects. For
g1.jsonl that is 376 forward steps plus 375 full re-folds in 31 ms.

---

## 4. The dev server serves the page and the fixtures

`npm run dev:replay` → `vite --open "/?replay=games/g1.jsonl"`:

```
  VITE v7.3.6  ready in 55 ms
  ➜  Local:   http://127.0.0.1:5173/
```

```
200     603B text/html                        /?replay=games/g1.jsonl
200   28813B text/javascript                  /src/main.tsx
200 3671028B application/x-ndjson; charset=utf-8   /fixtures/games/g1.jsonl
200   15597B application/x-ndjson; charset=utf-8   /fixtures/games/sample-handwritten.jsonl
200    9998B application/json                 /art.json
404                                           /fixtures/../../config.json  (traversal, --path-as-is)
```

`fixtures/` lives outside `web/`, so `vite.config.ts` mounts it with a small
middleware in both `configureServer` and `configurePreviewServer` rather than
copying committed files into `public/`. The middleware refuses any path that
resolves outside `fixtures/` — the 404 above is that check firing (plain `curl`
normalises `..` away client-side, so `--path-as-is` is needed to actually send
it). The server was started, curled, and stopped; nothing is left running.

### Rendered, in a real browser

Loaded in Chrome and driven with the real controls. On a fresh page load the
console holds **exactly three lines — no warnings, no errors**:

```
[debug] [vite] connecting...
[debug] [vite] connected.
[info]  Download the React DevTools for a better development experience…
```

(Getting there cost two small fixes found this way: `Board.tsx` was exporting a
non-component helper, which silently disables React Fast Refresh for the whole
file, and `main.tsx` called `createRoot` at module scope, which warns on every
hot update. The root is now cached on `window`, and the helper is not exported.)

Prev / next / play / pause / speed / scrub were each exercised on `g3.jsonl`:
three `next` clicks then 2.2 s of play at 1× landed on `frame 5 / 276`; two
`prev` clicks walked back to `frame 3 / 276` and one `next` returned to 4; the
speed select accepted 4×. Three frames of `g1.jsonl`, quoted from the live DOM:

**Frame 2 of 376 — the pre-game frame (§10.5).** `turn 0`, `phase` / `activePlayer`
/ `priority` all `null`; the board renders `PHASE pre-game`, `ACTIVE —`,
`PRIORITY —`, both opening hands drawn, seat 0's seven cards named and seat 1's
seven as `card back #68 … #80`.

**Frame 298 of 376.** `TURN 20 ROUND 10 · PHASE End of combat (COMBAT_END) ·
ACTIVE AI-Seat1 · PRIORITY AI-Seat0 · YOU AI-Seat0`, eighteen permanents with
art thumbnails, `S.H.I.E.L.D. Helicarrier {4} #69 4/5 tapped attacking 3 damage`,
`Aerial Doombot {U} #65 5/5 tapped attacking 1 damage +1/+1×3 attachments #47`,
`Super Suit {1}{U} #80 attached to #44`, and three tokens rendered as text cards
because tokens have no deck entry and therefore no art.

**Frame 376 of 376 — the last frame.** Green banner: `Game over. Winner:
AI-Seat0. AllOpponentsLost`; AI-Seat1 at `LIFE -1`; five combat bands listed
(`Soldier Token #107 → AI-Seat1 blocked by Peggy Carter, Secret Agent #44 ·
damage order #44`, four unblocked).

The hand-written fixture exercises what an AI-vs-AI recording cannot: at its
frame 5 the board shows `ASK · CONFIRM a1 timeout 120000 ms` with the prompt and
both labels, an `INPUT` panel with the engine's prompt and seven selectable ids,
and three lands outlined in yellow because their ids are in
`input.selectable.cardIds`. At frame 7 it shows a stack item with a target
(`stack #88 Quantum Reduction … targets: Aerial Doombot #211`) and two combat
bands, one blocked and one not.

### The unknown-frame policy, end to end in the browser

`fixtures/negative/` holds two deliberately broken three-line logs, so invariant
7 is provable from the browser and not only from `node --test`. Both were loaded
and stepped into; both produced a red banner and stopped playback dead at the
offending frame, exactly as `docs/protocol.md` §1 demands:

```
/?replay=negative/v2-major-mismatch.jsonl
  Frame rejected at index 1.
  reduce: protocol major mismatch — s2c frame #2 type="state" t=1757600000100
  has v=2, this client speaks v=1. Regenerate the log or update
  web/src/protocol.ts.
  { "v": 2, "seq": 2, … }                      ← the frame, pretty-printed

/?replay=negative/unknown-type.jsonl
  Frame rejected at index 1.
  reduce: unknown frame type — s2c frame #2 type="state_patch" t=1757600000100
  is not one of the ten types in docs/protocol.md §2. The bridge and
  web/src/protocol.ts have drifted.
```

`state_patch` is not an arbitrary name: it is the type §3.5 reserves for the
delta upgrade. If someone ships it on the Java side before teaching the reducer,
this is what they will see, at the frame it happened, instead of a board that
quietly stops updating.

A missing log is also handled: `/?replay=games/does-not-exist.jsonl` renders
`Could not load /fixtures/games/does-not-exist.jsonl — HTTP 404`, and prints the
`RecordMatch` command that would create one. The default `?replay=games/g1.jsonl`
falls back to `games/sample-handwritten.jsonl` when the recorder has never run.

---

## 5. Card art — `node tools/fetch-art.ts`

Run for real against `api.scryfall.com`, from the repo root, with the
`User-Agent` from `config.json` and `Accept: application/json`, paced at one
request per 500 ms (Scryfall allows 2/s on `/cards/*`):

```
deck decks/pacho-shield.dck: 40 cards, 28 distinct names
user-agent: mtg-table/0.1 (local hobby client)
pacing: 1 request / 500 ms (Scryfall allows 2/s on /cards/*)

  ok    Agent Phil Coulson                 set=msh  MSH #4    Marc Aspinall
  ok    Peggy Carter, Secret Agent         set=msc  MSC #523  Michael MacRae
  ok    Agent 13, Sharon Carter            set=msh  MSH #1    Michael MacRae
  ok    Agents of S.H.I.E.L.D.             set=msh  MSH #5    Borja Pindado
  ok    Quake, Agent of S.H.I.E.L.D.       set=msh  MSH #32   Solan
  ok    Nick Fury, Spymaster               set=msc  MSC #603  Michael MacRae
  ok    S.H.I.E.L.D. Helicarrier           set=msh  MSH #249  Arthur Yuan
  ok    S.H.I.E.L.D. Spy Kit               set=msh  MSH #36   Bachzim
  ok    Strategic Intervention             set=msc  MSC #609  Elizabeth Peiró
  ok    Web Up                             set=msh  MSH #41   Nathaniel Himawan
  ok    Helicarrier Strike                 set=msh  MSH #15   Maxim Ruabtsev
  ok    Borough Backup                     set=msh  MSH #7    Gal Or
  ok    Wasp, Shrinking Savior             set=msc  MSC #646  Ryan Pancoast
  ok    Ant-Man, Reformed Rogue            set=msc  MSC #739  David Álvarez
  ok    Ant-Man's Air Force                set=msc  MSC #759  Ioannis Fiore
  ok    Giant-Sized Flying Ant             set=msh  MSH #56   Zoltan Boros
  ok    Bold Biochemist                    set=msh  MSH #48   Marco Turini
  ok    A.I.M. Scientists                  set=msh  MSH #44   Bartek Fedyczak
  ok    Aerial Doombot                     set=msh  MSH #43   Michael MacRae
  ok    Super Suit                         set=msh  MSH #78   Smirtouille
  ok    Robotics Mastery                   set=msc  MSC #786  Domenico Cava
  ok    Quantum Reduction                  set=msc  MSC #635  Justine Cruz
  ok    Depower                            set=msh  MSH #50   Nathaniel Himawan
  ok    Pym Particles                      set=msh  MSH #70   Eli Minaya
  ok    Thriving Heath                     set=msc  MSC #580  Pablo Mendoza
  ok    Thriving Isle                      set=msc  MSC #581  Pablo Mendoza
  ok    Plains                             set=msh  MSH #287  Domenico Cava
  ok    Island                             set=msh  MSH #289  Raymond Bonilla

summary
  set=msh    18
  set=msc    10
  exact       0
  fuzzy       0
  misses      0

wrote web/public/art.json (28 entries)
```

**Report 03's predictions all held, exactly.** 18 of 28 distinct names resolved
from `set=msh` and 10 from `set=msc`; the ten `msc` names are precisely the ten
lines in `pacho-shield.dck` written without a `|MSH` suffix. `Peggy Carter,
Secret Agent` came from `msc` #523 — the `msh` rung 404s, as predicted, and the
ladder fell through to the second rung on its own. `Plains` resolved to MSH #287
and `Island` to MSH #289, matching report 03 §2. Neither of the last two rungs
(bare `exact`, then `fuzzy`) was needed for this deck; they exist for the day a
token or a second deck is not in MSH/MSC. **Zero misses**, so the text-card
fallback in `art.ts` is currently exercised only by mid-game tokens, which have
no deck entry by construction.

`web/public/art.json` is 9,998 bytes and gitignored (regenerate with one
command). Its shape:

```json
{ "generatedAt": "…", "source": "https://scryfall.com", "imageSize": "normal",
  "deck": "decks/pacho-shield.dck",
  "cards": { "Peggy Carter, Secret Agent": {
      "front": "https://cards.scryfall.io/normal/front/1/f/1f98293e-….jpg?1783903106",
      "back": null, "artist": "Michael MacRae",
      "setCode": "MSC", "collectorNumber": "523",
      "scryfallId": "1f98293e-9d94-4185-8546-8beaf281dfa3" } },
  "resolvedVia": { "Peggy Carter, Secret Agent": "set=msc" },
  "misses": [] }
```

The six fields the plan specifies are the entry; `cards` nests them so `misses`
cannot ever collide with a card named "misses", and `resolvedVia` records which
rung each name came from. `web/src/art.ts` reads both this and the flatter
`{ "<name>": {…}, "misses": [] }` shape, so the file format can be simplified
later without breaking the client.

`artist` is stored on every entry and rendered into the thumbnail's `title`
attribute, because the WotC Fan Content Policy and Scryfall's terms require the
credit wherever the art is shown. The footer credits Scryfall and Forge and
carries the Fan Content disclaimer.

---

## 6. Fixtures

`fixtures/` at the time of this run:

| File | Bytes | Frames | Shape |
|---|---:|---:|---|
| `games/g1.jsonl` | 3,671,028 | 376 | header + `hello_ok` + 374 `state` + `over`; 25 turns / 13 rounds; winner seat 0 |
| `games/g2.jsonl` | 1,736,410 | 225 | header + `hello_ok` + 223 `state` + `over`; winner seat 1 |
| `games/g3.jsonl` | 2,388,017 | 276 | header + `hello_ok` + 274 `state` + `over`; winner seat 1 |
| `games/sample-handwritten.jsonl` | 15,597 | 8 | header + **6 s2c frames** (`hello_ok`, `state`, `input`, `ask`, `state`, `over`) + 2 c2s lines (`act`, `answer`) |
| `negative/v2-major-mismatch.jsonl` | 800 | 2 | a `v:2` frame — must be rejected |
| `negative/unknown-type.jsonl` | 611 | 2 | a `type:"state_patch"` frame — must be rejected |

`fixtures/negative/` is deliberately *not* under `fixtures/games/`, so the
replay-every-fixture test does not pick it up. The three `g*.jsonl` sizes above
are as of this run; the Java recorder was writing them in parallel and re-ran
some of them, which is itself a small piece of evidence — the test asserts
protocol properties, not byte counts, so a re-recording does not invalidate it.

The first three are real recordings from the Java half of M1. The fourth is
hand-written, committed, and named so nobody mistakes it for a recording; it
exists because an AI-vs-AI recorder emits no `input`, no `ask`, no `notice` and
no `c2s` line at all (§10.7), so without it the reducer's merge of `input` and
`ask` and the board's ask/selectable rendering would have no test input until
M2. Regenerate it with `node tools/make-sample-fixture.mjs
fixtures/games/sample-handwritten.jsonl`. Its card names, mana costs and type
lines are the real MSH/MSC printings from the user's deck, pulled from Scryfall
while writing it; its type-line spelling (plain hyphen) and `"no cost"` match
what the bridge actually emits, not what Scryfall prints.

Event kinds observed across the three recordings, all handled by the reducer and
the board: `shuffle`, `mulligan`, `zone`, `turn`, `phase`, `land`, `attackers`,
`blockers`, `combat_end`, `tap`, `cast`, `resolved`, `unstacked`, `attach`,
`stats`, `damage`, `counters`, `life`, `outcome`. Zero unknown kinds were
dropped. The remaining two of the 21 (`poison`, `sacrificed`) never fired in a
mono-W/U game and are implemented but unexercised.

---

## 7. Protocol decisions this implementation pinned down

These came out of building against the spec and are already reflected in
`web/src/protocol.ts`; §10 of `docs/protocol.md` (written by the Java half) says
the same things from the other side.

- **`phase`, `activePlayer` and `priority` are nullable** (§10.5). Every
  recording opens with a pre-game `state` where they are `null` and `turn` is 0.
  `render(state)` is total over it: the strip shows `pre-game` and `—`.
- **`damage.damageType` is always present and `null` for player damage** (§10.6).
  Measured across the three recordings: 34 `null`, 20 set.
- **`stack[].id` is a different id space from `Card.id` and they collide**
  (§10.1). The board labels it `stack #n` and reaches the card through
  `sourceCardId`; nothing ever resolves a stack id against `players[].zones`.
- **`events` is filtered, not trusted.** Unknown kinds are dropped into
  `state.droppedEventKinds` (a visible list on the board) instead of thrown —
  §3.6 rule 3 is the one deliberate exception to the throw-on-unknown policy, and
  making it the *only* exception is what keeps the rule honest.
- **`gameOver` is sticky.** `over` sets it; a `state` whose `gameOver` is `null`
  never clears it. That is what let `g2.jsonl` pass the end-of-game assertion
  while the recorder was still appending to it, and it is what would let a log
  from a killed JVM still render its result when scrubbed to the end.

---

## 8. What M1's web half deliberately does not do

No WebSocket transport (`transport/ws.ts` is M3). Nothing is clickable: buttons
render with the engine's own `enabled` flag and are inert, and selectable cards
get an outline and no handler. No mana-payability prediction, no targeting
validation, no phase-stop logic — the client computes no rules answers at all
(§9 invariant 8). `LogReplayTransport.send()` records the frame and drops it,
because a replay has no server.

---

## 9. The hidden-information amendments (2026-09-11) — the web half

This section records the second pass over `web/`, applying amendments **P1–P7,
P12, P15 and P20** from `docs/research/06-hidden-information-audit.md` §6,
`07-wireguigame-spec.md` §1 and reports 10/11. `docs/protocol.md` changed first;
`web/src/protocol.ts`, `web/src/reduce.ts`, the text board,
`tools/check-redaction.mjs` and the tests followed.

### 9.1 What each amendment cost, in this half

| # | Change in `web/` |
|---|---|
| **P1** | `RedactedCard` gains `owner` — **five** keys. The board prints "owned by X" when `owner !== controller` (Gonti, a stolen permanent), which is the case the fifth key exists for. |
| **P2** | `LibraryZone` gains `cards`. A new `<LibraryPanel>` renders "Library — revealed (n of count)" and says out loud that the rest is a count. `findCard()` searches it, so a stack target that is a revealed library card resolves. |
| **P3** | `Card` gains `alt: AltFace \| null`, read **only** through `altFace(card)`, which returns `null` for every concealed shape. A face-down card renders as `face-down card #id` with a card-back thumbnail; when `alt` is present the board adds a marked `you may look` line. `types` is `""` — not `null` — for a face-down card outside battlefield/stack, matching the emitter (`Snap.java` writes `bodyPublic ? … : ""`). |
| **P4** | Four event kinds added (`scry`, `surveil`, `phased`, `foretold`) with `describeEvent` lines. `foretold` carries `player`, **not** `cardId`: `javap forge.game.event.GameEventCardForetold` shows one component, `activatingPlayer()`. There is no card accessor to build the amendment's `{cardId}` from. `g1.jsonl` contains 3 real `scry` events. |
| **P5** | Written down and tested rather than "fixed": the reducer keeps **no card map at all**, so a `hidden` card necessarily replaces. `findCard()` walks the current frame every time, and `reduce.ts`'s header says why nothing may cache a card by id. |
| **P6** | `open_zones` deleted — `ASK_KINDS` is eleven, and `reduce()` **throws** on an `ask` that still carries it (a bridge doing that has blocked the game thread on a question this client will never answer). `input` gains `openZones`, rendered as a hint line. |
| **P7** | `AskOption` is `{id: ask-local index, label, kind, cardId?, playerId?, abilityId?, card?}`; `order` is `{source, dest, min, max, …}` answering `{ordered, remember}`; `choose_list` carries `reveal`; `choose_entities.delayedReveal` is `{owner, zones, messagePrefix, cards}`; `assign_damage`'s defender is index 0; `assign_amount` allows colour keys; `input` gains `focusCard` and `weak`; `setYield` carries a `yieldKey`, never a `cardId`. |
| **P15** | `Card.token`, rendered as a marker. `g1.jsonl` has 694 token emissions (Soldier and Hero tokens). |
| **P20** | A 500-entry log ring in `reduce()`, `eventIds()` for the id summary, a `<GameLogPanel>`, and the error boundary now prints the failing **frame**. The single-fetch caches for `art.json` and the fixture were already in place; `web/test/art.test.ts` now proves the art one. |

### 9.2 `npm run build`, `npm test`

```
$ cd web && npm run build
tsc --noEmit && vite build
✓ 34 modules transformed.
dist/assets/index-DDu-iEvq.css    4.61 kB
dist/assets/index-CYCNJ4Al.js   179.92 kB │ gzip: 57.05 kB
✓ built in 328ms                                  (zero TypeScript errors)

$ npm test
ℹ tests 102     ℹ pass 102     ℹ fail 0
  reduce.test.ts     17   (was 11)
  fixtures.test.ts   76   (was 60; 15 per fixture × 5 + 3 corpus-wide)
  synthetic.test.ts   5
  art.test.ts         4   (new)
```

The four tests the amendment asked for, by name:

- `P5: a hidden card REPLACES the client card for that id — it never merges` —
  two hand-built frames, a named card in an opponent's hand and then the same id
  redacted; asserts the string `Quantum Reduction` is nowhere in the resulting
  state and that the surviving object has exactly the five stub keys.
- `<fixture>: replays through the reducer without throwing, and ends game over` —
  per fixture, all five.
- `P4: the four new event kinds are known, and an invented one is still dropped`
  — `teleport` lands in `droppedEventKinds`; nothing throws.
- `an unknown frame type throws rather than being ignored` — unchanged, still
  the loud half of §1's policy. `P6: open_zones is gone` is its sibling for ask
  kinds.

### 9.3 `tools/check-redaction.mjs` — report 06 §9, A1–A11

A1–A7 and A9–A11 are implemented over recorded frames (A8 is the reducer unit
test above — a log cannot show what a client remembers). All six committed logs
pass:

```
$ node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl
PASS  fixtures/games/disjoint.jsonl    cards 5990  redacted 1167  face-down 172  alt 0
PASS  fixtures/games/g1.jsonl          cards 9959  redacted  640  tokens 694
PASS  fixtures/games/g2.jsonl          cards 5025  redacted  849  tokens 106
PASS  fixtures/games/g3.jsonl          cards 6736  redacted  904  tokens 352
PASS  fixtures/games/morph.jsonl       cards 4726  redacted 1305  face-down 234  alt 118
PASS  fixtures/synthetic/sample-handwritten.jsonl
      WARN  recorded before P1 (owner…), P15 (token), P2 (library.cards), P3 (alt)
exit 0
```

`alt 118` against `face-down 234` in `morph.jsonl` is the gate doing its job:
the viewer's own morphs carry their real face, the opponent's 116 do not. In
`disjoint.jsonl` — two different decks, the opponent playing `morph-probe` — all
172 face-down cards are the opponent's and **none** carries an `alt`.

**The checker has teeth, measured.** Fifteen one-defect probes were built in the
session scratchpad (not committed: `fixtures/` belongs to the recorder) and run
through it. Eleven must fail and four must pass — a checker that rejects a
*sanctioned* shape is over-strict, not safe, so the passes matter as much:

| probe | verdict |
|---|---|
| control: amended shapes, nothing wrong | **PASS** |
| a face-down card in exile with `types: ""`, no P/T | **PASS** |
| a stub with a sixth key (`name`) | FAIL (A1) |
| a stub missing `zone` | FAIL (A1) |
| a card that is neither `hidden` nor named | FAIL (A2) |
| a redacted stub inside `library.cards` | FAIL (A3) |
| `library.cards.length > library.count` | FAIL (A3) |
| a full, never-revealed card in the opponent's hand | FAIL (A4/A6) |
| an event carrying `targetDescription` | FAIL (A5) |
| an opponent's morph carrying `alt` | FAIL (A9) |
| a face-down card in exile keeping its 2/2 and type line | FAIL (A9) |
| an `ask` of kind `open_zones` | FAIL (A11) |
| a `choose_list` option carrying a card the last snapshot had in the opponent's hand | FAIL (P12) |
| the viewer's own morph on the battlefield, with its real face in `alt` | **PASS** |
| an engine prompt naming a concealed id | PASS **with a warning** (A10) |

A10 warns rather than fails because the engine builds those strings and we do
not filter them yet (report 06 §4, §10.3). A7 likewise warns: a `hidden → full`
transition with no `ask` behind it is exactly what a continuous `MayLookAt`
static or an Opposition Agent search produces legally.

**Mid-regeneration tolerance, stated so it cannot rot.** The checker accepts the
*absence* of a key an amendment added (a four-key stub, a library with no
`cards`, a card with no `token`/`alt`), counts it, and prints one `WARN` line per
file naming what that recording cannot evidence. It never tolerates an **extra**
key, in either generation. Only `fixtures/synthetic/sample-handwritten.jsonl` is
still on the old shapes; it is generated by `tools/make-sample-fixture.mjs`,
which this pass did not own.

### 9.4 The board, driven against the real recordings

`npm run dev`, Chromium, three fixtures, console filtered to errors. Nothing
threw; these are the amendment-shaped lines the page actually rendered.

`?replay=games/morph.jsonl`, frame 152 — seat 0 is the morph deck, so this is
both halves of gate 2 in one frame:

```
AI-Seat1 …  BATTLEFIELD (7)   face-down card #52   2/2  summoning sick  face down  Creature
AI-Seat0 #0 AI — you …        face-down card #37   2/2  summoning sick  face down
                              YOU MAY LOOK Ashcloud Phoenix {2}{R}{R} — Creature - Phoenix 4/1
LOG (400 ENTRIES, NEWEST FIRST, CAPPED AT 500)
  #152 UNSTACKED face-down card #37
  #152 ZONE face-down card #37, AI-Seat0
  #151 CAST face-down card #37, AI-Seat0
```

The opponent's #52 has no name and no `alt`; the viewer's #37 has both. The log
ring resolves every id **against the frame on screen**, which is why #37 prints
as `face-down card #37` and not as the name it will have when it is turned up.

`?replay=games/g1.jsonl`, frame 330 — `P15` in the wild:

```
SOSoldier Token #91   1/1  tapped  token  Creature - Soldier
HEHero Token #102     3/2  tapped  token  Creature - Hero
Aerial Doombot {U} #65  5/5 tapped attacking 4 damage +1/+1×3 attachments #47
```

`?replay=synthetic/sample-handwritten.jsonl` — the pre-amendment file still
replays: its legacy `faceDownHidden` card renders as `face-down card #213 2/2`,
its `confirm` ask renders, its `input` frame renders. That is the point of
keeping the superseded shape readable.

> **Superseded later the same day.** The file was regenerated in the amended
> shapes (`tools/make-sample-fixture.mjs`): card #213 is now an ordinary card
> with `faceDown: true` and `name: ""`, there is no `faceDownHidden` object left
> anywhere in the repo, and the file now carries **all eleven** ask kinds rather
> than one `confirm`. The reader stays total over the old object — that half of
> the claim still holds — but this run is no longer a description of that file.

### 9.5 What the corpus still cannot evidence

- **`library.cards` is present but always empty** (748 player-frames in `g1`, 0
  cards). Neither deck runs a continuous `MayLookAt` effect — Future Sight,
  Bolas's Citadel, Oracle of Mul Daya — so P2's *renderable* half is exercised
  only by hand-built frames and by `<LibraryPanel>`'s own guard.
- **No face-down card outside battlefield/stack** exists in any recording (406
  on the battlefield, 11 on the stack, 0 elsewhere), so P3's "no public body
  outside play" rule is proved only by the negative probes. A foretell or
  manifest-to-exile deck would close it.
- **No `ask`, `input` or `notice` frame** in any engine recording (§10.7), so
  every P6/P7 shape is typed and checked but not yet emitted by anything. M2 is
  where they first travel.
- `phased` and `foretold` have no source in these decks; `surveil` neither.
  `scry` does appear (3 events in `g1`).

> **Closed and narrowed later the same day (the hardening review).** The first
> bullet is **closed**: `decks/future-sight-probe.dck` (22 Island + 18 Future
> Sight) was recorded as `fixtures/games/future-sight.jsonl`, where 98 frames
> carry a revealed top card, and `web/test/fixtures.test.ts` now asserts the
> corpus still contains that content rather than only the shape of `[]`. The
> other three are **renderer-covered but still engine-unevidenced**:
> `fixtures/synthetic/sample-handwritten.jsonl` was regenerated with a face-down
> card in exile, all eleven `ask` kinds with their answers, an `input` carrying
> `focusCard` / `weak` / `openZones`, and the `surveil` / `phased` / `foretold`
> events — so the reducer and the renderer are total over every one of them
> today. What no *recording* produces is tracked as M2-E1…M2-E6 in
> `docs/evidence/m1-hardening.md` §2.2.

### 9.6 Divergences left open, deliberately

- **`web/src/protocol.ts` types `library.cards`, `input.focusCard`, `input.weak`
  and `input.openZones` as optional**, while `docs/protocol.md` §3.4/§4 declares
  them always present. The emitter does always write them; the optionality is
  for the one committed file that predates the amendment, and it forces every
  reader in `web/` to guard instead of assuming. If
  `fixtures/synthetic/sample-handwritten.jsonl` is regenerated, these can become
  required in one edit.
- **`passPriority` is in `ACT_ACTIONS`** (amendment P7 says to add it) while
  `docs/protocol.md` lists it under §10 "planned additions, not yet emitted".
  The type carries that note verbatim; nothing sends it in M1/M2.
