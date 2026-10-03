# M1 evidence — AI-vs-AI recording

> **Superseded in part, same day.** The M1 integration review found a renderer
> crash and four wire problems; the fixes changed `state` (see
> `docs/protocol.md` §3.3 `stackCards` + `faceDownHidden`, §3.2 `manaCost: null`,
> §3.6 rule 5) and **every fixture below was re-recorded**. Frame counts, timings
> and the redaction results still hold; byte counts and any `"no cost"` /
> four-keys-only statement do not. `docs/protocol.md` is the current contract.

Run 2026-09-11 on this machine (OpenJDK 21.0.12 **JRE only**, Node v24.20.0, no
Maven, no `javac` binary). Every number below is copied from a real run, not an
estimate.

Engine: `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`,
sha256 `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`.
Its manifest calls itself **`2.0.14-SNAPSHOT-08.08`** — much closer to master
than the version number suggests, which is why `GameEventForwarder`,
`IGuiGame.handleGameEvents` and `DeltaSyncManager` are all present in it.

Deck: `decks/pacho-shield.dck`, sha256
`477275b16285f7a5e5a98a51a1dfbe0e515ec4276e204092820823ab551df2f2`,
40 cards, on **both** seats.

---

## 1. The commands

```bash
./bridge/build.sh                       # compiles 8 files, then runs JsonSelfTest
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42   --out fixtures/games/g1.jsonl
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 7    --out fixtures/games/g2.jsonl
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 2026 --out fixtures/games/g3.jsonl
node tools/check-redaction.mjs fixtures/games/g1.jsonl fixtures/games/g2.jsonl fixtures/games/g3.jsonl
```

`build.sh` now ends with `mtgtable.JsonSelfTest`: **38 checks, 0 failures** —
escaping (quotes, backslash, the five named control escapes, other C0 controls,
non-ASCII passthrough, unpaired surrogates), numbers (long bounds, doubles,
NaN/Infinity → `null`), nesting, nine structural-error cases, and the documented
return shapes of Jetty's parser (integral → `Long`, array → `Object[]`).

---

## 2. Run summaries

| | g1 | g2 | g3 |
|---|---|---|---|
| seed | 42 | 7 | 2026 |
| `state` frames | 374 | 223 | 274 |
| other frames (`hello_ok` + `over`) | 2 | 2 | 2 |
| lines in file (header + frames) | 377 | 226 | 277 |
| bytes | 3,671,028 (3.50 MiB) | 1,736,410 (1.66 MiB) | 2,388,017 (2.28 MiB) |
| bytes gzipped | 60,135 | 30,597 | 40,984 |
| bytes / frame | 9,763 | 7,717 | 8,652 |
| mapped `events` | 1,648 | 707 | 1,359 |
| player turns (rounds) | 25 (13) | 15 (8) | 18 (9) |
| winner | seat 0, `AllOpponentsLost` | seat 1, `AllOpponentsLost` | seat 1, `AllOpponentsLost` |
| game wall time | 3,490 ms | 1,401 ms | 2,725 ms |
| `FModel.initialize` | ~2.0 s | ~2.0 s | ~2.1 s | 
| snapshot errors | 0 | 0 | 0 |
| `UNIMPL` members fired | **none** | **none** | **none** |
| cards Forge would silently drop | **none** | **none** | **none** |

Total wall time per run is ~5.6 s when the machine is idle. Two of the three
runs above reported ~34 s total; re-running the same command alone reproduced
5.6 s, so that was contention with another process on this box (a second agent
was building `web/` in the same repo at the time), not the recorder.

### Determinism

`--seed 42` was recorded twice. Both runs produced **374 state frames, 25 player
turns, and a seat-0 win** — the game itself is reproducible. The files were not
byte-identical (3,671,028 vs 3,674,788 bytes): which events land in which flush
batch shifts with thread timing. This is exactly what `docs/protocol.md` §8.5
warns about — the seed is a hint for reproducing something *like* the game, and
the log, not the seed, is the record of what happened.

---

## 3. Warnings seen, verbatim

Every line of stdout and stderr was passed through a line watcher during the run
(same mechanism as `Smoke`), matching three needles.

**`svar-fallback` — the `SVar 'Any' not found` warning: 0 lines in g1, 0 in g2,
1 in g3.** It is real, and the card is **not** the one the synthesis predicted:

```
SVar 'Any' not found in ability, fallback to Card (Helicarrier Strike). Ability is
(Helicarrier Strike deals 2 damage to target attacking or blocking creature. If this
spell was cast using teamwork, it deals 4 damage to that creature instead.)
```

- The synthesis (`05-architecture-synthesis.md` §9-M1) expected this for
  **Quantum Reduction**. In three complete games Quantum Reduction never
  produced it; **Helicarrier Strike** did, once, in g3.
- It fires only when the ability is *built*, i.e. when the card is actually
  cast — which is why two of three games are clean. It is a script-authoring
  complaint inside Forge, not an mtg-table problem, and the spell resolved
  normally (the g3 log shows the `cast` → `resolved` pair and the damage event).

**`unsupported-text`: 0 lines in all three runs.** Separately, and more
reliably, `RecordMatch` applies `CardRules.isUnsupported()` to every card in
both decks itself, because `Match.prepareAllZones` drops unsupported cards
**silently**: it hands them to `PlayerController.revealUnsupported`, whose AI
override (`forge-ai/.../PlayerControllerAi.java:1410-1412`) is an empty method
whose entire body is the comment "Ai won't understand that anyway". There is no
stderr line to grep for. Result: **all 40 cards of `pacho-shield.dck` are
supported**; `hello_ok.unsupportedCards` is `[]` in all three fixtures.

**`UNIMPL`: 0 lines in all three runs.** All 36 `IGuiGame` members that
`AbstractGuiGame` leaves abstract are implemented as safe no-op / null /
identity defaults that log `UNIMPL <name>` once per name. **Not one of them
fired.** That is the expected result and it is informative: in an AI-vs-AI game
there is no `PlayerControllerHuman`, so nothing calls the GUI at all except our
own `GameEventForwarder`. It also means M1 has proved the *serialisation* half
and nothing about the *input* half — that is M2's job.

Boot chatter not counted as a warning: Forge prints ~13 `The card X was not
assigned to any set` lines (A-Goldspan Dragon, Blinding Radiance, …) and one
`Upcoming set Star Trek (TRK) dated in the future` line on every start. None of
those cards is in this deck.

---

## 4. Redaction check

```
$ node tools/check-redaction.mjs fixtures/games/g1.jsonl fixtures/games/g2.jsonl fixtures/games/g3.jsonl
PASS  fixtures/games/g1.jsonl
      frames=376 (state=374, other=2)  bytes=3671028  events=1648
      cards checked=9940  redacted=640  opponent-hand cards=640  viewer-hand named=1406
PASS  fixtures/games/g2.jsonl
      frames=225 (state=223, other=2)  bytes=1736410  events=707
      cards checked=5020  redacted=849  opponent-hand cards=849  viewer-hand named=1095
PASS  fixtures/games/g3.jsonl
      frames=276 (state=274, other=2)  bytes=2388017  events=1359
      cards checked=6719  redacted=904  opponent-hand cards=904  viewer-hand named=864
exit=0
```

What that asserts, per file:

1. Line 0 is a session header (`"kind":"session"`, `v == 1`, with `gameId`,
   `startedAt`, `seat`, `decks`), and no later line is one — so every `state`
   frame has a header before it.
2. Every later line carries the full envelope: `v`, numeric `seq`, numeric `t`,
   `dir ∈ {s2c, c2s}`, a non-empty `type`, and an **object** `body`. `seq` is
   checked to be gapless and monotonic **per direction**.
3. **No card in `players[1].zones.hand` ever carries a `name`** — and, stronger,
   every one of them is `hidden: true` and carries **exactly** the four keys
   `id`, `zone`, `controller`, `hidden` and nothing else.
4. **No `library` anywhere ever has a `cards` array** — not even the viewer's
   own. `count` only.
5. The viewer's own hand cards **do** have names (otherwise the test proves
   nothing — an emitter that redacted everything would pass 3 and 4).
6. Every zone's `count` equals `cards.length`.
7. No key named `name` appears anywhere under `state.events` (§3.6 rule 1:
   events carry ids only).

The numbers line up exactly: `redacted == opponent-hand cards` in all three
files, i.e. the *only* cards redacted are the opponent's hand — battlefields,
graveyards and exiles stay public, which is correct Magic.

**Negative test** (a checker that always passes is worthless). A copy of
`g1.jsonl` was mutated in three ways — a `name` added to an opponent hand card,
a `cards` array added to a library, a `name` key added inside `events` — and
re-checked. All three were caught, on every frame, and the exit code was 1:

```
! ...:3: players[0].zones.library has a "cards" array -- a library is a count and NOTHING else
! ...:3: redacted card 68 leaks extra keys: name
! ...:3: players[1] (the opponent) hand card 68 carries a name: "Quantum Reduction"
! ...:3: state.events contains a "name" key at events[0].name -- events are ids only
! ... and 1284 more
```

---

## 5. Shape checks on the recorded data

Counted over `g1.jsonl`:

- **`combat` is `null` outside combat phases** in every frame — 100% of `UNTAP`,
  `UPKEEP`, `DRAW`, `MAIN1`, `MAIN2`, `END_OF_TURN`, `CLEANUP` and
  `COMBAT_BEGIN` frames. Inside combat it is an object whose `bands` is `[]`
  before attackers are declared and populated afterwards (49 frames with bands).
- **`gameOver`** is `null` until the game ends, then mirrors the `over` body in
  the final 3 `state` frames (and in the `over` frame itself), so a replay scrubbed to its end still renders the result.
- **Phase coverage**: all 13 `PhaseType` values appear; 321 `phase` events over
  25 turns (25 × 13 = 325).
- **Event kinds actually produced by this deck** (g1): `phase` 321, `stats` 730,
  `tap` 184, `zone` 140, `cast`/`resolved`/`unstacked` 42 each, `turn` 25,
  `attackers` 25, `combat_end` 24, `damage` 22, `land` 18, `blockers` 10,
  `life` 7, `attach` 6, `shuffle` 5, `counters` 2, `mulligan` 2, `outcome` 1.
- **Where the bytes go** (g1, 3.5 MB): `players` 3.47 MB of it, of which
  `battlefield` is 2.40 MB, `hand` 0.50 MB, `graveyard` 0.23 MB, `exile` 0.10 MB;
  `events` 0.10 MB; `combat` 11 KB; `stack` 4 KB. 9,940 cards serialised at a
  mean 324 bytes each.

The synthesis estimated "~1.5 KB/frame × 605 frames ≈ 1 MB". Measured: ~9.8 KB
per frame and 3.5 MB. The frame *count* is right (coalescing works — see §6);
the per-frame size is 6× the estimate because the estimate was for a "minimal
projection" and the protocol's `Card` shape (§3.2) is not minimal, and because a
25-turn game ends with ~20 permanents on the table. It gzips to 60 KB, so the
committed fixtures cost ~130 KB in the repo, and over loopback it is 3.5 MB
across three minutes of play. Not worth deviating from the spec for.

---

## 6. Coalescing — and the trigger that is missing without a human

`docs/protocol.md` §3.5 says `GameEventForwarder` flushes at 50 events / 500 ms
/ **InputQueue change**, and that the third trigger is the important one because
it puts a frame boundary exactly where the game pauses for a decision.

**That observer only exists for a `PlayerControllerHuman`.** An AI-vs-AI game
registers no `InputQueue`, so only the size and time thresholds survive — which,
at ~3,400 raw events in a 3.4-second game, would have produced roughly 70 frames
and collapsed most of a turn into one. Useless for a scrubber.

So `RecordMatch` registers a second, tiny subscriber (`BoundaryFlusher`) that
calls `forwarder.flush()` on `GameEventTurnPhase`, `GameEventTurnBegan` and
`GameEventGameOutcome` — the same boundaries a human's input queue would have
created. It is registered **after** the forwarder, and Guava's `EventBus`
dispatches to subscribers in registration order, so the triggering event is
already inside the batch being flushed. Both run on the game thread (EventBus
dispatch is synchronous on the posting thread), so no thread rule is bent.

Result: 374 / 223 / 274 `state` frames, i.e. about one frame per step of the
game. This is documented in `docs/protocol.md` §10.8.

---

## 7. The game-thread assert is real

`Snap.state()` opens with `if (!ThreadUtil.isGameThread()) throw ...`. Two proofs
it is not vacuous:

1. **Indirect, from the fixtures.** If the snapshots had been built off the game
   thread, all 374 would have thrown, `snapshot errors` would be 374 and the
   files would contain only a header. They contain 374 frames and 0 errors, so
   `handleGameEvents` genuinely arrives on a Forge `Game*` thread — which is the
   whole point of hand-registering `GameEventForwarder` instead of snapshotting
   in `updateCards` / `updateZones` (those arrive on the EDT).
2. **Direct, with a throwaway probe** (not committed) calling
   `Snap.state(null, null)` from two threads:

```
thread = main, ThreadUtil.isGameThread() = false
GOOD (main): Snap.state must run on the Forge game thread (ThreadUtil.isGameThread(),
  i.e. a thread whose name starts with "Game"); this is "main". The Tracker is not
  thread safe and walking the view graph off the game thread corrupts it silently.
GOOD (Game thread): passed the game-thread assert, then rejected the null view
```

This is also why `RecordMatch` runs the match inside
`game.getAction().invoke(...)` rather than on `main` the way `Smoke` does:
`ThreadUtil.isGameThread()` is a `getName().startsWith("Game")` test, so
`match.startGame(game)` on `main` would make every snapshot throw.

---

## 8. Nothing of the user's was touched

`/home/justin-a/forge` and `/home/justin-a/.forge` have **no file modified**
after the M0 baseline; every Forge write went to `var/forge` and `var/cache`
via `forge-home/forge.profile.properties`. Decks are loaded with
`DeckSerializer.fromFile` only — `bridge/build.sh` still refuses to compile if
`getDecks()` appears anywhere under `bridge/src`, because that path reaches
`DeckStorage.adjustFileLocation`, which renames `.dck` files to their `Name=`
metadata and deletes unparseable ones.

---

## 9. Addendum — the M1 review re-record (2026-09-11, later the same day)

An independent audit of this milestone found a hidden-information leak that
nothing in §1–§8 above could have caught, plus four pieces of protocol drift.
Everything in this section was re-run after the fixes; `docs/protocol.md` §3.6
rule 1, §8.3 and §10.12 are the spec side of it.

**The leak.** `stack[].text` and `events[].cast.text` carried
`StackItemView.getText()` with **no visibility test at all**, on the assumption
(written into the spec as a fact) that a stack description is public. Forge
redacts the *cast* of a morph but not a *trigger* of one, so a face-down
creature's death trigger reached the wire as

```
When Ashcloud Phoenix dies, return it to the battlefield face down under your
control. [Zone Changer: Ashcloud Phoenix (75)]
```

in the same frame that serialised card 75 as `faceDownHidden` — the name twice,
and the id to join the two. It was invisible to every test in the repo because
`tools/check-redaction.mjs` and `web/test/fixtures.test.ts` asserted key sets and
the absence of a key named `name`, and neither ever read the **value** of a
string. Both do now.

**Why no committed fixture could have shown it.** All four recordings played the
same deck on both seats, so every name the opponent could leak was also a name
the viewer legitimately held. `fixtures/games/disjoint.jsonl` (pacho-shield vs
morph-probe, seed 99) is the fifth fixture and the only one where an opponent's
card name is unambiguous.

**Re-recorded corpus** (clean `rm -rf bridge/out && ./bridge/build.sh`, then five
runs):

| file | seed | decks | state frames | bytes | winner |
|---|---|---|---|---|---|
| `g1.jsonl` | 42 | pacho-shield ×2 | 374 | 3,658,410 | AI-Seat0 |
| `g2.jsonl` | 7 | pacho-shield ×2 | 223 | 1,732,626 | AI-Seat1 |
| `g3.jsonl` | 2026 | pacho-shield ×2 | 274 | 2,380,529 | AI-Seat1 |
| `morph.jsonl` | 42 | morph-probe ×2 | 233 | 1,498,183 | AI-Seat1 |
| `disjoint.jsonl` | 99 | pacho-shield vs morph-probe | 273 | 2,044,731 | AI-Seat0 |

The state-frame counts are unchanged from the pre-fix recordings (374 / 223 /
274 / 233), and a second run of all five is **byte-identical modulo `t`,
`startedAt` and `gameId`** — determinism survived the change. `~/forge` and
`~/.forge`: 22,155 entries, size and mtime identical before and after.

**Correction to §3.** That section reports the `SVar 'Any' not found` warning as
0 / 0 / 1 lines over g1 / g2 / g3 and notes Quantum Reduction never produced it.
It does: the seed-99 disjoint run fires it for **Quantum Reduction** by name
(`svar-fallback: 1 line(s)`), exactly as the synthesis predicted. The g1–g3
result was a sampling artifact of which cards those three games happened to
cast, as §3 itself suspected.

---

## 7. M1 hardening pass — the amendments from reports 06, 08, 10, 11 (2026-09-11, later the same day)

Everything in §1–§6 above was recorded against the **pre-amendment** `Snap.java`.
This section is the engine-side half of the amendment pass (P1–P5, P8–P11, P13,
P15, P17, P19). The wire changed in four places, so **all five fixtures were
re-recorded again**; the frame counts below are the ones now in
`fixtures/games/`.

### 7.1 What changed on the wire

| # | change | before | after |
|---|---|---|---|
| P1 | redacted stub gains `owner` | `{id, zone, controller, hidden}` | `{id, zone, owner, controller, hidden}` — **exactly** five keys |
| P2 | `library` carries the revealed subset | `{count}` | `{count, cards:[Card]}`, `cards` holding only cards `canBeShownTo(viewer)` already admits, never a stub |
| P3 | face-down cards | a separate 11-key `faceDownHidden` shape | the ordinary card shape with `faceDown: true`, plus `alt: {name, manaCost, types, power, toughness} \| null` gated on `canFaceDownBeShownTo` |
| P15 | `token` | — | `CardView.isToken()`, on every card |

`faceDownHidden` no longer exists anywhere in the corpus (`grep -c` = 0 in all
five files). A full card is now **23 keys**, and there is exactly **one**
redacted shape instead of two.

**The face-down decision, restated.** The snapshot reads `getCurrentState()` and
nothing else, which for a face-down card *is*
`CardUtil.getFaceDownCharacteristic` — no name, set code `"???"`, a 2/2 Creature
— i.e. exactly what every player at the table can see. Three things are forced
rather than inherited from that state, so the guarantee does not depend on which
`CardState` Forge selected: `name` is `""` and `manaCost` is `null` for *every*
face-down card, and `types` / `power` / `toughness` are suppressed for a
face-down card **outside battlefield and stack** (report 06 §1.4 — the 2/2 is an
artifact of the state object, not a rules fact about a card in exile).

### 7.2 The `alt` block, measured on `morph.jsonl`

```
faceDown emissions:  viewer-controlled 121, opponent-controlled 120
alt blocks:          121   (all of them viewer-controlled)
alt on an opponent's face-down card:   0
faceDown outside battlefield/stack carrying a body:  0
```

A viewer's own morph, which before this pass rendered as an unnamed 2/2:

```json
{"id":37,"name":"","setCode":"???","manaCost":null,"types":"Creature","power":"2",
 "toughness":"2","faceDown":true,"token":false,
 "alt":{"name":"Ashcloud Phoenix","manaCost":"{2}{R}{R}","types":"Creature - Phoenix",
        "power":"4","toughness":"1"},
 "controller":0,"owner":0,"zone":"battlefield", …}
```

and the opponent's, in the same recording, with `"alt": null` and nothing else
that identifies it. That is `canFaceDownBeShownTo` doing exactly what report 06
§1.3 says it does, and it is the one call to `getAlternateState()` in the whole
bridge — `tools/lint-bridge.sh` fails the build if a second one appears.

### 7.3 P2 proved, on a throwaway probe deck

No committed fixture can evidence `library.cards`: neither `pacho-shield` nor
`morph-probe` contains a continuous `MayLookAt$` effect, so the array is
correctly empty in all five (`library cards revealed=0`). The path was therefore
exercised separately, with a deck that exists only in gitignored `var/`:

```bash
# var/probe/maylook-probe.dck = 22 Forest + 18 Oracle of Mul Daya
./bridge/run.sh mtgtable.RecordMatch --deck var/probe/maylook-probe.dck \
    --seed 5 --out var/probe/maylook.jsonl
```

```
state frames 2221, library-card emissions 3866
  viewer's own library      2005
  the OPPONENT's library    1861      <- Oracle's "MayLookAt$ Player" is everyone
  stubs inside library.cards   0
  frames where cards.length > count   0
check-redaction.mjs: PASS (library cards revealed=3866)
```

The opponent entry is the interesting one and it is correct: Oracle of Mul Daya
says *"Play with the top card of your library revealed"*, which Forge scripts as
`MayLookAt$ Player`, so `canBeShownTo(viewer)` is genuinely true for that one
card. Exactly one card per library per frame, never the rest of it.

**Recommendation for whoever owns `decks/`:** `web/test/fixtures.test.ts` has a
test for P2 that currently `t.skip`s because no committed recording carries
`library.cards`. A sixth fixture recorded from a may-look deck would un-skip it.

### 7.4 P4 — four new event kinds, one of them live

`scry`, `surveil`, `phased` and `foretold` are emitted (accessors confirmed with
`javap` against the 2.0.14 jar). `scry` fires in a real recording — g1 carries
three, from S.H.I.E.L.D. Spy Kit:

```json
{"kind":"scry","player":1,"toTop":1,"toBottom":0}
```

`surveil`, `phased` and `foretold` need cards neither deck has, so they are
code-complete and unexercised. **One correction to the amendment list:**
`foretold` cannot carry a `cardId`. The record is
`GameEventCardForetold(PlayerView activatingPlayer)` — one component, no card
(`javap`; fired at `CardFactoryUtil.java:3005`) — so the body is `{player}`, as
report 06 §5.3 has it.

The field-level bans are now comments at the emitting sites *and* lint rules:
`targetDescription()`, `stackDescription()`, `outcomeStrings()`,
`matchSummary()`.

### 7.5 P8 / P9 — the bootstrap and the card overlay, from a real Smoke run

`bridge/src/mtgtable/Bootstrap.java` is now the one boot sequence (`Smoke`,
`RecordMatch`, and M2's `MtgTable` when it exists). `./bridge/run.sh mtgtable.Smoke`:

```
FModel.initialize took 1880 ms
pref UI_SELECT_FROM_CARD_DISPLAYS = false   (D13)
pref LOAD_CARD_SCRIPTS_LAZILY     = false   (asserted, not set)
pref ALLOW_CUSTOM_CARDS...        = true    (D14)
custom cards dir = …/var/forge/custom/cards/ (1 file(s))
cards in DB = 95126 printings, 33137 unique
deck sets = {MSC=10, MSH=30}
deck cards Forge would drop = none (all 28 distinct names have a working card script)
== card-script overlay (D14) ==
A.I.M. Scientists: custom=true, type=Creature - Human Scientist Villain, pt=3/3, keywords=[TypeCycling:Basic:2]
A.I.M. Scientists has no Trample: OK
deck conformance (Limited, 40 cards) = legal
SMOKE OK
```

`keywords=[TypeCycling:Basic:2]` is the whole point: stock Forge loads that card
with `K:Trample`, which the printed card does not have.
`forge-home/custom-cards/a_i_m_scientists.txt` is the stock script byte for byte
with that one line deleted plus a provenance comment header (`#` lines are
skipped by `CardRules.Reader.readCard`), and `tools/make-forge-home.sh` copies it
into `var/forge/custom/cards/` — `ForgeConstants.USER_CUSTOM_CARDS_DIR`, which
Forge does **not** create for itself and whose absence silently means "no
overlay" (`CardStorageReader` throws, `FModel` swallows it into
`customReader = null`).

Two things the overlay needed that were not obvious:
`ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE` defaults to `"false"` and
`DeckFormat.getDeckConformanceProblem` rejects any deck containing a card that
`StaticData.loadCustomCards()` marked custom (`DeckFormat.java:449`) — so the
overlay would have made the user's own deck illegal. `Bootstrap` sets it *before*
`FModel.initialize`, because `FModel`'s `StaticData` supplier reads it at
construction and is memoized. `prefs.save()` is never called.

### 7.6 P10 — the `SVar 'Any'` warning is now labelled informational

`Smoke` and `RecordMatch` print a severity beside each watched needle:

```
== watched engine output ==
svar-fallback [informational]: 1 line(s)
unsupported-text [warning]: 0 line(s)
unimpl [warning]: 0 line(s)
unzoned [warning]: 0 line(s)
```

The reasoning (report 08 §3) is in a comment on the table itself: the missing
"SVar" is `CostTeamwork`'s hard-coded `"Any"` sentinel, not an SVar name, and
every rules path returns before consulting it. It fired in 2 of the 5 re-records
(g3 and disjoint), which is the same sampling behaviour §6 already noted.

`unzoned` is new and counts report 06 S5's fail-open case: a `CardView` we
serialised whose `getZone()` is null. **0 in all five recordings**, and
`RecordMatch` prints `unzoned cards = 0` in its summary beside `events dropped`.

### 7.7 The re-recorded corpus

Clean build (`rm -rf bridge/out && ./bridge/build.sh`), then five runs:

| file | seed | decks | state frames | bytes | turns | winner |
|---|---|---|---|---|---|---|
| `g1.jsonl` | 42 | pacho-shield ×2 | 374 | 3,905,469 | 25 | AI-Seat0 |
| `g2.jsonl` | 7 | pacho-shield ×2 | 223 | 1,850,316 | 15 | AI-Seat1 |
| `g3.jsonl` | 2026 | pacho-shield ×2 | 274 | 2,541,045 | 18 | AI-Seat1 |
| `morph.jsonl` | 42 | morph-probe ×2 | 233 | 1,631,992 | 16 | AI-Seat1 |
| `disjoint.jsonl` | 99 | pacho-shield vs morph-probe | 273 | 2,208,747 | 18 | AI-Seat0 |

**Every state-frame count is identical to the pre-amendment recording** (374 /
223 / 274 / 233 / 273): the changes are to what a frame contains, not to when a
frame is cut. Bytes are up ~7% (the `owner`, `token` and `alt` keys, and the
`library.cards` array). `snapshot errors = 0`, `events dropped = 0`,
`unzoned cards = 0`, `UNIMPL members = none` in all five.

`tools/check-redaction.mjs` (the web agent's amended version, which already knows
P1–P3 and P15) passes on all five:

```
PASS g1  cards checked=9959   redacted=640   tokens=694  alt blocks=0   strings=61 concealed=0
PASS g2  cards checked=5025   redacted=849   tokens=106  alt blocks=0   strings=34 concealed=0
PASS g3  cards checked=6736   redacted=904   tokens=352  alt blocks=0   strings=51 concealed=0
PASS morph     cards checked=4726  redacted=1305  face-down=234  alt blocks=118  strings=16 concealed=8
PASS disjoint  cards checked=5990  redacted=1167  face-down=172  alt blocks=0    strings=41 concealed=10
```

The two numbers that matter for the M1 review's blocker are the last two rows'
`concealed` counts: 8 of 16 and **10 of 41** engine strings are blanked, and none
of the survivors names a card concealed in the same frame. The disjoint
recording — the only one whose two seats play different decks — is where a leak
would be unambiguous, and it is clean.

`web/`: `npm run build` clean, `npm test` **102 tests, 0 failures** against these
files.

### 7.8 P11 / P17 / P19 — the new tooling

`tools/lint-bridge.sh` (wired into `bridge/build.sh`, which now runs it *before*
`javac` because every rule in it is about a call that compiles):

- data loss: `getDecks(`
- 2.0.15-only: `setNoGUIUser`, `com.google.gson`
- identity accessors: `getBackup(`, `getLeftSplitState(`, `getRightSplitState(`,
  `getOracleName(`, `getCloner(`, `getMergedCards(`, `getGameLog(`,
  `GameView.getDeck`, `GameView.getGame`
- fail-open predicates: `canBeShownToAny`, `mayView`, `mayFlip`,
  `mayLookAtAllCards`
- engine strings: `targetDescription(`, `stackDescription(`, `outcomeStrings(`,
  `matchSummary(`
- **budget, not ban:** `getAlternateState(` — exactly one occurrence, and only in
  `Snap.java`
- **rule 8, mechanically:** the identifier `CardView` may appear only in
  `Snap.java` (the one serialiser) and in `RecordMatch.java` (its `IGuiGame`
  no-op stubs take `CardView` parameters). A file that cannot name the type
  cannot grow a second serialiser. Two exemptions, each with its reason at the
  call site; `Smoke.java` gets the only other one, for `getGameLog(` — it prints
  `MATCH_RESULTS` to the operator's console and emits no protocol at all.

A comment line (`//`, `*`, `/*`) never counts as a hit, or the lint would ban
explaining the ban.

`HeadlessGuiBase` now asserts at class-init that neither of its thread names
starts with `"Game"`, because `ThreadUtil.isGameThread()` is a bare
`getName().startsWith("Game")` and a thread of ours that matched it would be
allowed to walk the `Tracker` off-thread — which corrupts it *silently*.

`Snap.java` opens with the three conventions from
`docs/guides/java-for-typescript-people.md`: enums cross the wire as `.name()`
(never `toString()`, which `forge.card.CardRarity` overrides), nullable integers
go through `JsonOut.nInt(String, Integer)` (never the `long` overload, which
cannot express null and unboxes a null into an NPE), and every
`CardStateView`-derived key is written in **both** branches of the null-state
check so the renderer never tests for a key's absence.

`tools/check-all.sh` is the one command to run before committing:
check-forge → lint-bridge → build → Smoke → **a fresh RecordMatch into `var/`** →
check-redaction over every fixture *and* that fresh recording → `npm run build`
→ `npm test`. It stops at the first failure. Step 5 is what makes it more than a
replay of old evidence: the committed fixtures were produced by whatever
`Snap.java` looked like the day they were recorded, so a checker that only reads
them cannot see a change made an hour ago. Full run: **44 s**, exit 0.

### 7.9 Nothing was written outside the repo

`find ~/.forge -newermt <run start>` is empty for both the Smoke run and the
whole `check-all.sh` window, and `ls -la ~/.forge/` is byte-identical before and
after. `find ~/forge -newermt …` is likewise empty — the card overlay is copied
**into `var/forge/custom/cards/`**, never into the installation's
`res/cardsfolder`. (mtimes rather than a whole-tree checksum, because the user's
own Forge desktop app may be running and writes `~/.forge` on its own.)

### 7.10 Negative controls — the new gates were checked by breaking them

A gate that has never failed is a gate nobody has tested. Both new ones were run
against a deliberate violation:

```bash
# a throwaway bridge/src/mtgtable/ZZLintProbe.java doing three banned things at once
$ ./tools/lint-bridge.sh
LINT FAIL: getDecks( …            ZZLintProbe.java:5
LINT FAIL: getAlternateState( outside Snap.java …   ZZLintProbe.java:5
LINT FAIL: CardView named in ZZLintProbe.java …     ZZLintProbe.java:2,4
bridge lint FAILED                                  # exit 1
$ rm bridge/src/mtgtable/ZZLintProbe.java && ./tools/lint-bridge.sh
bridge lint OK (9 file(s))                          # exit 0
```

and `check-forge.sh`'s new member check, asked for an accessor that does not
exist, prints `MISSING MEMBER: forge.game.card.CardView :: getThisDoesNotExist()`
and exits 1. That check now also covers `canFaceDownBeShownTo`,
`getAlternateState`, `isToken`, `PlayerView.getLibrary`,
`AbstractPreferences.setPref(T, String)`, the two `FPref` constants and the four
new event classes — every member this pass added, so swapping the jar for a
different Forge build fails at the gate instead of at `javac`.

Final `./tools/check-all.sh`: **exit 0 in 47 s**, all seven steps, 102 web tests.
