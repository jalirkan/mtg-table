# The narrator — a frame log read back as a story

`tools/narrate.mjs` turns one per-seat frame log (`docs/protocol.md` §8) into a
turn-by-turn story a beginner can follow — *who drew, what was played, who
attacked, who blocked, who took damage, what died, who won and how* — for
watching AI-vs-AI recordings and reading back your own games. It is a tool, not a
page: plain Node, one file, no dependency beyond `node:fs` and `node:path`, no
engine, no network, no `config.json`. `tools/narrate-selftest.mjs` is its gate,
and `tools/check-all.sh` runs it as sub-step **12d**. Decision **D123**.
(Written as **D109**, with the step lettered **12b**, on the branch; renumbered on
its rebase onto spectating's `a5c8e39`, where the engine and sets' D109–D112, the
hardening pass's D113–D115 and its 12b and 12c, more villains' D116–D117 and
spectating's D118–D122 had landed first — §8.)

Built on 2026-09-28 in the worktree `/home/justin-a/code/mtg-table-t2q`, branch
`narrate`, from `main` at `a092d3a`. Every number below was measured there, and
the command that produced it is beside it.

```bash
node tools/narrate.mjs fixtures/games/g1.jsonl              # the whole story
node tools/narrate.mjs fixtures/games/g1.jsonl --turn 14    # one turn; --turn 1-3 a range, 0 = before the game
node tools/narrate.mjs fixtures/games/g1.jsonl --summary    # per-seat totals, the winner, how
node tools/narrate.mjs fixtures/games/g1.jsonl --seat       # whose view the log is
node tools/narrate.mjs fixtures/games/g1.jsonl --json       # every fact, with its card ids and names
node tools/narrate.mjs var/games/<gameId>/frames.jsonl      # any game you just played
node tools/narrate-selftest.mjs                             # the gate (~1 s)
node tools/narrate-selftest.mjs --write-golden              # regenerate fixtures/narrate/
```

---

## 1. What it reads, and why not only the snapshots

A `state` frame is a full snapshot **plus `events`**, the id-only transitions it
already reflects, in engine order (§3.6). The narrator reads both, for different
things:

- **The events say what happened, in what order, and when.** In an AI-vs-AI
  recording one flush holds a whole cast: g1's S.H.I.E.L.D. Spy Kit (turn 2) goes
  hand → stack → battlefield, resolves and unstacks inside the frame at seq 30,
  and **no snapshot of g1 ever shows it on the stack**. A narrator that only
  diffed snapshots would miss most spells. The `turn` and `phase` events inside a
  batch place each thing in its step: seq 9's snapshot already says
  `COMBAT_BEGIN`, but its land play comes before the `phase` event, so it is told
  under *main 1*.
- **The snapshots say what each id is.** Every name, cost, type line and P/T is
  read off a card object in the event's own frame or the frame before it, and
  from nowhere else (§3 below).
- **A diff of the battlefields adds what no event says**: a permanent turned face
  up (a special action with no event — 33 in the corpus, told just before the
  first event that mentions the card, so Ashcloud Phoenix turns face up *before*
  its "when turned face up" trigger), a change of control, and — only across a gap
  in a client log — a permanent that appeared or vanished while the client was
  away.

Five things about the stream that the first version got wrong, each found on the
corpus and each now handled:

1. **A spell and its enters trigger are both `cast` events with the same
   `cardId`.** Web Up's exile trigger read as a second cast until the rule became:
   the first `cast` after the card moved to the stack is the spell, any later one
   is an ability of it (M6 logs say it outright with `stack[].isAbility`, and that
   wins when present). A human's cast can span two flushes — the move, the mana
   payment, the event — so the "moved to the stack" set lives across frames.
2. **`resolved` and its `unstacked` can straddle two flushes** (g1 turn 14,
   Helicarrier Strike: `resolved` ends seq 201, `unstacked` opens seq 202). The
   pairing that tells "resolved" from "left the stack without resolving" is kept
   per game.
3. **In a human-seat log a snapshot can LEAD its events.** `WireGuiGame.ask()`
   flushes a `state` one frame ahead (report 06 W4), so in
   `human-trample-7.jsonl` the blocker is already in the graveyard one frame
   before its death arrives as an event. The unexplained-battlefield diff
   therefore runs only across a gap, and the snapshot's `phase` overrides the
   events' only there too.
4. **Two same-named cards on opposite sides** (every mirror match: g1, g2, g3 and
   the `human-auto-*` games are Pacho vs Pacho) needed an owner. A name that is
   on both sides of the battlefield in the frame or the one before is printed
   with its controller: *"AI-Seat1's Aerial Doombot deals 5 damage to AI-Seat0's
   S.H.I.E.L.D. Helicarrier"*. A card leaving the battlefield carries the P/T it
   had there, which is what tells two of one player's Doombots apart
   (*"Doom's Aerial Doombot (-4/1) is exiled"* — the one under Quantum Reduction).
5. **An animated Vehicle is an artifact again in the graveyard**, so "dies" asks
   the battlefield copy whether it was a creature.

## 2. What it prints

```
Turn 14 · Human (you)
  draw    Draws Web Up.
  main 1  Casts Agent 13, Sharon Carter ({2}{W}, legendary creature 3/2). Casts Web Up ({2}{W},
          enchantment). Web Up triggers: "When this enchantment enters, exile target nonland
          ...
```

One heading per turn (`Turn N · player (you|AI)`), then one line per step that
had anything in it — *upkeep, draw, main 1, combat, main 2, end, cleanup* —
wrapped at 100 characters. Priority passes, mana taps, P/T recomputes, shuffles
and the engine's command-zone effect objects are left out; a turn with nothing
in it says `(nothing but passes)`. The subject is omitted when it is the turn's
player (*"Plays Island."*) and named when it is not (*"AI-Seat0 casts Helicarrier
Strike ({W}, instant) targeting Soldier Token."*). A cost is printed as the log
spells it (`{2}{G/U}`) and never evaluated; an ability's text is the bridge's own
gated `cast.text` with its `(id)` references and reminder text removed, quoted
once per card, and *"triggers again"* after that. Before turn 1: each seat's
mulligans and kept hand (counted from the `mulligan` events and the hand count at
the first `turn`), who goes first, and the seat's sideboarding when a `sideboard`
ask was answered. The last line is the result and **how**: a life total at or
below zero, ten poison, an empty library, a concede (the seat's own `act:
concede`), or — for M11's `over` with no outcome — *"conceded before the game
began; the engine recorded no winner"*.

### g1, turns 1–3 — the golden file

`fixtures/narrate/g1-turns-1-3.txt`, byte for byte (`--turn 1-3`):

```
== g1 · seed 42: AI-Seat0 (AI) vs AI-Seat1 (AI) ==
This is AI-Seat0's view (seat 0): AI-Seat1's hand and every library stay hidden,
so an unseen card is "a card" here, and a face-down one "a face-down card".

Turn 1 · AI-Seat0 (AI)
  main 1  Plays Island.

Turn 2 · AI-Seat1 (AI)
  draw    Draws a card.
  main 1  Plays Plains.
  main 2  Casts S.H.I.E.L.D. Spy Kit ({W}, Equipment).

Turn 3 · AI-Seat0 (AI)
  draw    Draws A.I.M. Scientists.
  main 1  Plays Island.
```

(`--turn 0` adds *"AI-Seat1 mulligans twice and keeps 5 cards … AI-Seat0 goes
first."*) The seat's own draws are named — its hand is visible to it — and the
opponent's are *"a card"*.

### g1, the summary — the second golden file

`fixtures/narrate/g1-summary.txt` (`--summary`):

```
== g1 · seed 42: AI-Seat0 (AI) vs AI-Seat1 (AI) ==
Seen from AI-Seat0's seat. 25 turns (13 rounds).
Game over after turn 25: AI-Seat0 wins. AI-Seat1's life fell to -1.

                              AI-Seat0 (seat)         AI-Seat1
  turns taken                              13               12
  mulligans                                 0                2
  lands played                             10                8
  spells cast                               8                8
  abilities used                            9               17
  their creatures that died                 3                1
  damage dealt to players                  21               18
  damage dealt to creatures                14               18
  life at the end                           2               -1
```

Damage is credited to the controller of its source card; *their creatures that
died* counts a player's own creatures going from the battlefield to a graveyard
(Helicarrier included, once it had been crewed into a creature).

### g1, a mirror-match combat (turn 22)

```
Turn 22 · AI-Seat1 (AI)
  draw    Draws a card.
  main 1  Plays Plains.
  combat  Uses S.H.I.E.L.D. Helicarrier again. Attacks with Aerial Doombot (5/5) and S.H.I.E.L.D.
          Helicarrier (4/5). AI-Seat0 uses S.H.I.E.L.D. Helicarrier: "S.H.I.E.L.D. Helicarrier
          becomes an artifact creature until end of turn." AI-Seat0's S.H.I.E.L.D. Helicarrier (4/5)
          blocks AI-Seat1's Aerial Doombot. AI-Seat1's Aerial Doombot deals 5 damage to AI-Seat0's
          S.H.I.E.L.D. Helicarrier. AI-Seat0 takes 4 damage from AI-Seat1's S.H.I.E.L.D.
          Helicarrier; life 8 → 4. AI-Seat0's S.H.I.E.L.D. Helicarrier deals 4 damage to AI-Seat1's
          Aerial Doombot. AI-Seat0's S.H.I.E.L.D. Helicarrier dies.
```

### A villain game — Pacho vs Doom Legion

Recorded here, not committed (it lives in `var/`, which is gitignored; a seed is a
hint and not a replay, §8.7):

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 \
    --ai-deck decks/doom-legion.dck --ai-name Doom --game-id narrate-villain-7
node tools/narrate.mjs var/games/narrate-villain-7/frames.jsonl
```

27 s, `MTGTABLE OK`, 15 turns, Doom won. Its opening, from `hello_ok.match`
(amendment M44 — the AI's deck by its public name only):

```
== narrate-villain-7 · seed 7: Human (you) vs Doom (AI) ==
Human plays Pacho SHIELD (Marvel Super Heroes); Doom plays Doom Legion (Marvel Super Heroes
villains) (AI profile Default).
This is Human's view (seat 0): Doom's hand and every library stay hidden,
so an unseen card is "a card" here, and a face-down one "a face-down card".

Before the game
  Human keeps 7 cards.
  Doom keeps 7 cards.
  Doom goes first.

Turn 1 · Doom (AI)
  main 1  Plays Island.
  main 2  Casts Aerial Doombot ({U}, artifact creature 1/1).
```

and its last five turns:

```
Turn 11 · Doom (AI)
  draw    Draws a card.
  main 1  Plays Swamp.
  combat  Attacks with Aerial Doombot (1/1) and Agents of HYDRA (1/1). Human does not block. Uses
          Aerial Doombot: "Doom puts three +1/+1 counters on Aerial Doombot." Aerial Doombot gets 3
          +1/+1 counters (now 3). Human takes 5 damage (Aerial Doombot 4, Agents of HYDRA 1); life
          14 → 9.

Turn 12 · Human (you)
  draw    Draws Plains.
  main 1  Plays Plains. Casts Ant-Man, Reformed Rogue ({2}{G/U}, legendary creature 2/3). Casts
          Peggy Carter, Secret Agent ({1}{W}, legendary creature 2/1).

Turn 13 · Doom (AI)
  draw    Draws a card.
  main 1  Plays Island. Casts Hour of Defeat ({3}{B}, instant) targeting Ant-Man, Reformed Rogue.
          Human's Ant-Man, Reformed Rogue dies. Surveils 1: keeps it on top.
  combat  Attacks with Aerial Doombot (4/4) and Agents of HYDRA (1/1). Human does not block. Human
          takes 5 damage (Aerial Doombot 4, Agents of HYDRA 1); life 9 → 4.

Turn 14 · Human (you)
  draw    Draws Web Up.
  main 1  Casts Agent 13, Sharon Carter ({2}{W}, legendary creature 3/2). Casts Web Up ({2}{W},
          enchantment). Web Up triggers: "When this enchantment enters, exile target nonland
          permanent an opponent controls until this enchantment leaves the battlefield. (targeting
          Aerial Doombot)" Doom's Aerial Doombot (-4/1) is exiled. Human's Quantum Reduction is put
          into the graveyard.

Turn 15 · Doom (AI)
  draw    Draws a card.
  combat  Attacks with Aerial Doombot (4/4) and Agents of HYDRA (1/1). Human does not block. Human
          takes 5 damage (Aerial Doombot 4, Agents of HYDRA 1); life 4 → -1.

Game over after turn 15: Doom wins. Human's life fell to -1.
```

— which is exactly the lesson a beginner wants from it: Web Up spent itself on
the Doombot that Quantum Reduction had already shrunk to -4/1, and the 4/4 one
that the Doombot's own ability had grown kept attacking unanswered.

```
== narrate-villain-7 · seed 7: Human (you) vs Doom (AI) ==
...
                              Human (seat)          Doom
  turns taken                            7             8
  mulligans                              0             0
  lands played                           6             7
  spells cast                            9             5
  abilities used                         1             1
  their creatures that died              2             0
  damage dealt to players                0            21
  damage dealt to creatures              0             0
  life at the end                       -1            20
```

## 3. Hard rule 8, by construction and by test

The log is already redacted for its seat (§8.3); the narrator's job is not to
undo that. Three rules in the code:

1. **One face reader, `faceOf()`.** A five-key stub yields nothing *whatever else
   is on it*; a face-down card with `alt: null` yields "a face-down card" and never
   a name; `alt` is read because the bridge writes it only for the seat's own
   face-down cards (§3.2) — *"Casts Ashcloud Phoenix face down (as a 2/2
   creature)"* in `morph.jsonl`, where the opponent's morphs are *"a face-down 2/2
   creature"*.
2. **No memory.** A name comes from the event's own frame or the one before it.
   A zone move reads the source zone in the frame before and the destination in
   this one (a public card that goes into hiding is named from where it was
   public). **Everything else takes the latest view**: if the card is in this
   frame at all, this frame's face is the answer, concealed or not — protocol
   invariant 10 applied to a story. `disjoint.jsonl` is why. On turn 14, Ashcloud
   Phoenix blocks face up, dies, and its trigger returns it face down, all in one
   flush; in that frame the card is face down, and **the bridge blanked the
   trigger's text** (§3.6 rule 1) precisely so that the name and the concealed id
   are never joined. The first version resolved the trigger's source from the
   frame before and printed *"Ashcloud Phoenix's ability goes on the stack"* — the
   join the bridge had refused. It now reads:

   ```
   ... Peggy Carter, Secret Agent deals 6 damage to a face-down card. AI-Seat1 takes 3 damage from
   Wasp, Shrinking Savior; life 9 → 6. A face-down card deals 4 damage to Peggy Carter, Secret
   Agent. AI-Seat1's Ashcloud Phoenix dies. A face-down card's ability goes on the stack.
   AI-Seat1's face-down card (2/2) returns to the battlefield from the graveyard.
   ```

   (*"dies"* is a zone move: the Phoenix was face up on the battlefield in the
   frame before, where everybody saw it.)
3. **Engine strings.** Only `cast.text` is quoted — gated, swept and stripped by
   `Snap.stackText` already — with its `(id)` references and Forge's `(H4)`
   face-down labels removed. Notices, prompts and option labels are never printed,
   except the `sideboard` ask's labels, which are the seat's own pool (§5.3).

`tools/narrate-selftest.mjs` checks it over all 19 committed logs (the 18 in
`fixtures/games/` and `fixtures/synthetic/sample-handwritten.jsonl`) and every log
the gate records, with an oracle written apart from the narrator:

| check | what it asserts | measured |
|---|---|---|
| by ids | an id concealed in **every** appearance in the log (a stub, or face-down with no `alt`, in any frame, ask or input) is never given a name by any fact | 67 such ids across the 19 logs, 0 named |
| by names | no card name in `decks/*.dck` that the log never shows as a visible card (or as the seat's own sideboard label, or an M44 deck name) appears in any output line | 65 deck names as ground truth, 0 printed unbacked |
| no memory | every name a fact carries is on a visible card of that id in the fact's own frame or the frame before; and a non-move fact never names a card its own frame conceals | 1,613 named card references, all backed |
| hygiene | no `(123)` engine id in the text, no turn headed twice, no line over 100 characters | 0 |

And five negative controls, because a check that cannot fail proves nothing:

| control | what it does | result |
|---|---|---|
| **N1** | a copy of `disjoint.jsonl` in which the stub of card #79 — an opponent's card concealed in every frame — carries `name: "Zzyzx, the Injected Leak"` and no `hidden` flag, in the frame of the opponent's draw of it (seq 94) | the story prints *"Draws Zzyzx, the Injected Leak"*, and **both** the by-ids and the by-names check reject it (3 problems) |
| **N2** | the same name, `hidden: true` kept | the name is not printed at all: `faceOf()` reads nothing off a stub |
| **N3** | one named fact renamed to a name its two frames do not show | the backing check rejects it |
| **N4** | the turn-14 damage fact above given the name its card had in the frame before (*"Ashcloud Phoenix"*) | the invariant-10 check rejects it |
| **N5** | the client log below narrated with the resync dedupe switched off | 70 facts instead of 66: re-delivered frames narrated twice |

## 4. Client logs — a resync never narrates a moment twice

A client that reconnects is re-sent the cached `hello_ok`, the last `state` and
any outstanding ask **verbatim**, same `seq` (amendment M10), so a client log is
neither contiguous nor monotonic. The narrator skips every s2c frame whose `seq`
this game has already produced, and judges gaps against the whole file rather
than "the last seq seen" — because two harmless gaps are in every client log:
the `input` frames sent before the client connected (seqs 3–4 below), and an ask
raised while it was away, which arrives *after* later frames with its original
seq. A gap is narrated only when the battlefield visibly changed across it.

- **Synthetic, in the self-test.** `human-comfort-13.jsonl` rebuilt as its client
  saw it: its own three resyncs plus three more inserted after `state`s that hold
  a cast, each followed by the verbatim re-delivery, `recordedBy: "client"`. 6
  resyncs, **12 frames re-delivered and skipped, 66 facts — identical to the
  bridge log's 66**; `tools/check-redaction.mjs` accepts the synthesised log
  (its `--client-log` rule auto-detected). With five frames cut out around a land
  play it says *"(Frames …–… never reached this client; while it was away:)"* and
  names the land now on the battlefield; the uncut log narrates no gap.
- **Real, recorded here.** A ws server on port 8705 at seed 13 and
  `tools/ws-auto-play.mjs --refuse-first-ask --reconnect-after 5000 --log …` —
  gate step 10d's shape: the client drops the socket on the first `ask` frame and
  comes back. The client log: 4 frames re-delivered and skipped, one untold gap
  (seqs 3–4, the pre-connect `input`s), and **65 facts, the same 65 texts as the
  bridge's own log of that game**. `ws-smoke`'s raw log (no header, no `dir`) and
  M11's four-line concede-before-input log narrate without error; the bridge's
  copy of the latter ends *"Human conceded before the game began; the engine
  recorded no winner."*
- **In the gate.** 12d passes every client log step 10 writes **paired** with the
  bridge's own log of the same game (`client=bridge`), and asserts that the
  client's story tells no moment — a `(kind, frame, cards)` triple — more often
  than the bridge's does.

## 5. What the corpus exercised

`node tools/narrate.mjs` over every committed log (turns / facts / named card
references / unnamed references / ids concealed in every appearance / story lines
/ ms):

| log | turns | facts | named | unnamed | always hidden | lines | ms |
|---|---|---|---|---|---|---|---|
| `games/disjoint.jsonl` | 18 | 120 | 119 | 23 | 4 | 141 | 115 |
| `games/future-sight.jsonl` | 16 | 56 | 42 | 11 | 3 | 87 | 62 |
| `games/g1.jsonl` | 25 | 150 | 167 | 12 | 6 | 191 | 133 |
| `games/g2.jsonl` | 15 | 97 | 102 | 8 | 3 | 121 | 52 |
| `games/g3.jsonl` | 18 | 118 | 126 | 11 | 1 | 151 | 82 |
| `games/human-ability-42.jsonl` | 22 | 115 | 115 | 11 | 6 | 154 | 74 |
| `games/human-amount-7.jsonl` | 15 | 74 | 60 | 16 | 4 | 93 | 16 |
| `games/human-auto-2026.jsonl` | 14 | 74 | 73 | 7 | 1 | 103 | 12 |
| `games/human-auto-42.jsonl` | 22 | 115 | 115 | 11 | 6 | 154 | 31 |
| `games/human-auto-7.jsonl` | 13 | 80 | 81 | 7 | 2 | 100 | 16 |
| `games/human-comfort-13.jsonl` | 15 | 66 | 61 | 8 | 3 | 95 | 18 |
| `games/human-number-7.jsonl` | 19 | 81 | 68 | 16 | 4 | 123 | 16 |
| `games/human-scry-7.jsonl` | 15 | 90 | 64 | 16 | 4 | 96 | 11 |
| `games/human-search-7.jsonl` | 15 | 68 | 54 | 16 | 4 | 91 | 6 |
| `games/human-sideboard-7.jsonl` | 30 | 84 | 82 | 15 | 1 | 145 | 13 |
| `games/human-trample-7.jsonl` | 17 | 74 | 60 | 15 | 3 | 99 | 12 |
| `games/human-yield-13.jsonl` | 13 | 123 | 148 | 6 | 5 | 125 | 7 |
| `games/morph.jsonl` | 16 | 70 | 64 | 13 | 3 | 95 | 15 |
| `synthetic/sample-handwritten.jsonl` | 2 | 12 | 12 | 2 | 4 | 23 | 2 |

Facts by kind over those 19: draw 341, land 258, cast 233, ability 181, damage
158, attack 111, blocks 110, counters 55, keep 36, face up 33, other zone moves
27, dies 27, attach 25, token 25, first 18, scry 18, sacrificed 5, sideboard 2,
and one each of life, surveil, phased and foretold — the last three only in the
hand-written synthetic log, which also exercises a log that begins mid-game
(*"This log begins in the middle of turn 8"*). `human-sideboard-7` is game 2 of a
match and opens *"Human sideboards: in Giant Growth; out Garruk's Companion"*.
**Never reached by a committed log**: poison, phasing and foretell from an
engine, a control change, a fizzle and a countered spell; the concede paths are
cut from `human-auto-2026.jsonl` in the self-test, both mid-game and M11's.

The self-test takes **about a second** for all of it (0.5–1.5 s measured,
depending on the machine's load); one story of g1 is 0.12 s.

## 6. The gate

`WSPORT=8707 ./tools/check-all.sh` from a deleted `bridge/out`, teed to
`var/check-all-narrate.log`: **987 s (16 m 27 s), exit 0, `check-all OK`**, 9c's
fourteen games 383 s, at a load average of 15 falling to 9 on a desktop running
other worktrees' gates. 12b (now 12d) took **2.2 s** there: the 19 committed logs, the five
controls, the synthetic client log, the concede cuts and the goldens, plus the
**19 logs that run recorded** — seven bridge logs (the fresh `RecordMatch`, the
null, console and auto sessions, both games of 9d's sideboard match and 9e's
Reckless game against Doom Legion), and step 10's client logs each paired with
the bridge's own log of the same game: `ws-auto-13` (2 frames re-delivered and
skipped), `ws-auto-refuse-13` (4, the 10d reconnect), `ws-auto-probe-42` (2), the
three games of 10g (2, 0, 0), and the header-less `ws-smoke` logs of 10a, 10b and
10e — **every client's story telling no moment more often than the bridge's**.
104 checks. The web step: **872 `node --test` passes, 0 failures, 8 skipped (880)
and 94 vitest in 6 files** inside the gate, where `MTGTABLE_WS_LOGS` names step
10's logs; **870 / 870 and 94** standalone. This branch touches nothing under
`web/`, `bridge/` or `fixtures/games/`, so those are `main`'s counts.

`/home/justin-a/forge` (22,128 paths) and `/home/justin-a/.forge` (27 paths;
`decks/constructed/` holds no file) were fingerprinted — paths, sizes and mtimes
— before this branch's first JVM and after the gate: **unchanged**.

## 7. Not done, and why

- **A `#story` page in the web client** is the obvious next step and is not built
  here: the narrator is Node and reads a file; the page would run the same pure
  functions over a `ReplayTransport`'s frames and scroll with the replay cursor.
  PLAN.md, *The narrator*, follow-up 1. *(Built since, 2026-09-28, on branch
  `story`: the narration moved into `web/src/story/narrate.ts`, which this tool now
  imports, and `#story` runs it — `docs/evidence/story.md`, D150–D154.)*
- It says **what** happened, never **why**: no "the AI attacked because…". The
  log does not carry the AI's reasoning, and inventing it would be rules logic.
- It narrates the **events the bridge emits**, so what Forge does not emit it
  cannot tell: mana taps are left out on purpose, *"gets +1/+1 until end of turn"*
  exists only as a P/T change, and which card caused a tap is never on the wire.

## 8. Rebased onto spectating (2026-09-28)

The branch was rebased onto the `spectate` branch's `a5c8e39` — the engine and
sets (D109–D112), the hardening pass (D113–D115, amendments M45–M46), more
villains (D116–D117) and spectating (D118–D122, amendment M47) underneath it.
CLAUDE.md, DECISIONS.md, PLAN.md, README.md and `tools/check-all.sh` conflicted;
each kept both sides, the base's text first. This branch's decision became
**D123** and its gate sub-step **12d** (the hardening pass's 12b and 12c run
first). Three things changed in the code:

- **12d reads 6b's two spectate recordings** (`var/spectate/check-all-spectate-paced.jsonl`,
  seat 0 with `paceMs: 25`, and `…-seat1.jsonl`, seat 1 at engine speed) as well
  as the 19 logs it read before. Both narrate without error: 87 facts each, the
  same count of every kind from both chairs (13 draws, 10 lands, 10 casts, 14
  abilities, 5 attacks, 5 blocks, 10 damage, one death, …), and `--summary`
  prints the same table from both, only the `(seat)` marker moving. The
  `paceMs` header needed no code: the narrator reads a header's seat, seed and
  decks and ignores what it does not use.
- **The opening line names the viewing seat's own profile** when the handshake
  carries `yourProfile` (M47 writes it only for a spectated `RecordMatch` game,
  where the viewing seat is an AI too): *"AI-Seat0 plays Pacho SHIELD (Marvel
  Super Heroes) (AI profile Default); AI-Seat1 plays Doom Legion (Marvel Super
  Heroes villains) (AI profile Reckless)."* Before, only the other seat's
  profile was printed. No committed log carries a `match` block, so the golden
  files did not move.
- **`EPIPE`** (the verifier's minor): `node tools/narrate.mjs g1.jsonl --json |
  head -1` printed an unhandled `write EPIPE` stack trace and exited 1; stdout's
  `EPIPE` now exits 0 quietly, and any other write error still throws. The
  verifier's other minor — the client/bridge pair check is one-directional — is
  PLAN.md's narrator follow-up 9, not changed here.

`./tools/make-forge-home.sh`, `node tools/fetch-art.ts` and
`node tools/build-workshop-catalog.ts` were re-run first and changed nothing
(`web/public/art.json`, 158 entries, and `web/src/workshop/catalog.json` were
already spectating's). `./bridge/build.sh`: `build OK`, all four self-tests.
`npm --prefix web test` standalone: **893 `node --test` pass, 0 fail, and 98
vitest in 7 files**; `npm --prefix web run build` OK — spectating's counts,
because this branch touches nothing under `web/`.

**The gate**: `rm -rf bridge/out && WSPORT=8735 ./tools/check-all.sh`, teed to
`var/check-all-narrate-train.log`: **912 s, exit 0, `check-all OK`**, at a load
average of 2–4. Step 6 `wire-drift: SAME`; 6b `SAME GAME` (151 dwells) and the
mutant rejected; 9c's fourteen games 368 s; 12b the catalog current; 12c
`check-engine-crash OK`; **12d 106 checks in 0.8 s** — the 19 committed logs,
the five controls, the synthetic client log, the concede cuts, the goldens, and
the run's own **18** logs (the fresh `RecordMatch`, 6b's two, the null, console
and auto sessions, 9d's two games, 9e, and step 10's nine client logs, each
paired with the bridge's own log of that game). Inside the gate the web step counted **903 `node
--test`, 895 pass, 0 fail, 8 skipped, and 98 vitest in 7 files**.

`/home/justin-a/forge` (22,128 paths) and `/home/justin-a/.forge` (27 paths)
were fingerprinted — the jar's sha256, every file's sha1 under `~/.forge`, and
paths, sizes and mtimes of both trees — before the rebase and after the gate:
**unchanged**.
