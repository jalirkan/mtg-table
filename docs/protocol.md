# mtg-table wire protocol — v1

**Status: living spec.** This file is the contract between the Java emitter in
`bridge/` and the TypeScript reducer in `web/src/`. Both ends are hand-written
against it (decision D4 — no codegen). **Change this file first, then both ends.**

Derived from `docs/research/05-architecture-synthesis.md` §3 and §4, and amended
by the audits listed below.

Transport: JSON text frames over `ws://127.0.0.1:8642/ws`, one message per frame.
`GET /health` on the same port answers `200 ok` and is the readiness check, not a
frame (amendment **M13**). `ws://127.0.0.1:8642/observe` on the same port is a
read-only copy of the seat's stream for any number of followers, and both socket
paths refuse a browser page whose `Origin` is not on `config.json`'s
`wsAllowedOrigins` (amendment **M50**). Loopback bind only, no auth (an explicit non-goal) — except a
LAN server (`--lan`, amendment **M51**), which binds every interface behind a
per-run pairing token and may serve ForgeCoach's static site on the same port. The same frames, in the same
shapes, are what `var/games/<id>/frames.jsonl` contains (§8), so a log replays
through exactly the reducer a live socket feeds.

Message *shapes* are adapted from `forge.gamemodes.net.ProtocolMethod` (45
server→client, 15 client→server), which is a battle-tested enumeration of every
question a Magic engine asks a UI. **None of its encoding is reused** —
`DeltaPacket` carries `Map<TrackableProperty,Object>` with `ColorSet`, `ManaCost`,
`EnumSet`, `CounterMap` and serialized lambdas over LZ4'd Java serialization with
`IdRef` substitution, and its entire saving assumes both ends are Forge instances.
A browser is not one.

---

## Amendments

### 2026-10-10 — a yield to the opponent's next move, what an input has chosen, and which players a click is taken for

Asked for by the ForgeCoach board rebuild (the PC session's Endstep study, 2026-10-10)
and approved by the owner the same day: three follow-ups to the play board's
protocol, each a field or a kind Forge already has the answer to. A "hold
priority" flag stays out (§10.4: Forge has no such feature). Decisions **D421**
(M64), **D422** (M65) and **D423** (M66). Held by `mtgtable.SelectionSelfTest`
(gate step 12l, beside `PlayableSelfTest`: the player rule on Lightning Bolt,
Into the Void, Duress, Curse of the Pierced Heart and Leyline of Sanctity, a
declaration read off a real `Combat`), `tools/check-redaction.mjs` (the shapes,
the per-file rule and who a selection may name; six controls in
`fixtures/negative/redaction/m65-*` / `m66-*`), `web/test/selection.test.ts` and
`tools/llm-seat/test/selection.test.mjs` on real frames
(`fixtures/select-probe/m64-m66-frames.json`), and verified live by
`tools/ws-select-probe.mjs`, a scripted seat on `/ws` against the real engine
(`docs/evidence/select-probe.md`).

| # | Section | Change | Source |
|---|---|---|---|
| M64 | §2.2, §3.1 | **`yieldTo {kind: "endStepOrOpponent"}`: pass priority until an opponent acts or the current turn's end step begins, whichever is first.** **"An opponent acts"** is exactly: (a) an item an opponent controls goes on the stack — a spell cast, an ability activated, a triggered ability (Forge's `GameEventSpellAbilityCast`, fired by `MagicStack.add` for every item; the item's activating player is its controller); or (b) an opponent declares attackers attacking this seat or a permanent it controls (`GameEventAttackersDeclared`). The bridge ends the yield at the event itself, on the game thread, before the seat is next offered priority, so the seat gets priority with that item on the stack, or in the declare-attackers step. **The end step**: when the turn's `END_OF_TURN` begins the yield ends and the seat gets priority there **even if its phase stops skip that step** (for that one step). The seat's own items do not end it, and nor does anything else: its own triggers, the opponent's land drops, a phase change. **What else clears it**: `buttonCancel` (Forge's Cancel, as for every yield), any other `yieldTo` (Forge runs one yield at a time), a later turn beginning (an effect ended the turn before its end step), the end of the game. Sent in the end step or the cleanup step it is **refused** with `notice {level:"warn", title:"yieldTo"}` and nothing changes — "the current turn's end step" has already begun, and the next one is a whole turn away. The passing itself is Forge's own marker at the turn player's `END_OF_TURN` (the mechanism of `kind:"marker"`), so `input.prompt` reads Forge's "Yielding until *X*'s End step" and the other rules of a yield hold (on the seat's own turn Forge skips an optional attack declaration while yielding; a block declaration is still asked). While it runs, **`state.yield` is `{kind: "endStepOrOpponent", playerId: <the turn player>, phase: "END_OF_TURN"}`** — a state is only written when something flushes one, so a short yield may never show it, exactly as for the other kinds. Forge's own yield interrupts (`YIELD_INTERRUPT_ON_OPPONENT_SPELL`, `_ON_ATTACKERS`, on by default) end every yield on the same two events; the bridge enforces (a) and (b) itself, so this kind means the same whatever those preferences say (measured both ways, `docs/evidence/select-probe.md`). **Optional**: a bridge before M64 answers the kind with `notice {title:"yieldTo"}` ("kind must be …") and does nothing; `state.yield.kind` is one of the three older kinds on every stream before it. | Endstep study, D421 |
| M65 | §4 | **`input.selectable.chosen`: what the seat has already chosen in the input that is up.** `{cardIds, playerIds, blocks, attacks}` (ids ascending), or `null`. Read off Forge's own input, never worked out from the prompt: **targets** (`InputSelectTargets`) — the cards and players targeted so far; **a list** (`InputSelectEntitiesFromList`, e.g. discard two, convoke) — the entries ticked; **a block declaration** (`InputBlock`) — `cardIds` the seat's blockers and `blocks: [{blockerId, attackerId}]`, one row per pair, read off the game's own combat, which Forge writes as each click is taken **and which `state.combat` does not show until the declaration ends** (the clicks run on the EDT; the snapshot is the game thread's); **an attack declaration** (`InputAttack`) — `cardIds` the attackers and `attacks: [{attackerId, defender: {kind: "player"\|"card", id}}]`. `blocks` and `attacks` are `[]` outside their declarations. **`null`** when no selection is up (priority, a mana payment, an ask) or the bridge cannot say; a targeting or list input's `chosen` holds while its selection is up and goes `null` in the frames its `onStop` pushes. Every chosen target or list entry is one `selectable.cardIds` offered in the same input. **Hidden information**: ids only, the viewing seat's own input; a chosen card is one the engine offered this seat, a declared blocker or attacker is its own creature on the battlefield. **Written on every `input` a seat writes** (per file, all or none). **Optional**: absent before M65; a reader treats absent and `null` alike — "this frame does not say", never "nothing chosen". The client's one reader is `chosenOf()` in `web/src/protocol.ts`. | Endstep study; the LLM seat's block tracking (PR #130), D422 |
| M66 | §4, §10.2 | **`input.selectable.playerIds`: the players a click (`clickPlayer`) would be taken for in the input that is up.** Ids ascending; **player ids never travel in `cardIds`**. Forge's own rule for each input: **targets** — `InputSelectTargets.onPlayerSelected`'s: a player already targeted (the click takes it back), or one not out of the game, attachable for an Aura spell, that the ability `canTarget` (hexproof, "target opponent", protection are Forge's), not under a must-target filter that narrowed the choice to cards, and through the caller's filter; **a list** — the players among its valid choices; **an attack declaration** — the defending players (a click picks whom the next attacker attacks). **`[]`** when a player click does nothing in the input (priority, a block declaration, a confirm, the mulligan) — a fact, not an unknown. **`null`** when the bridge cannot say: no input, a mana payment (Forge takes a click on yourself there as Phyrexian life), any input class it does not read. `selectable.mode` is still computed from `cardIds` alone, so a player-only choice ("target opponent") still reads `"none"`: read `playerIds`. **Hidden information**: seat ids only. **Written on every `input` a seat writes** (per file, all or none). **Optional**: absent before M66, and absent and `null` alike mean "this frame does not say", never "no player is clickable". The client's one reader is `selectablePlayersOf()` in `web/src/protocol.ts`. One quirk this does not change: `input.highlighted` can carry a **player** id — Forge highlights the targeted player, and the current defender in an attack declaration, through the same `setHighlighted` call as cards (`highlighted: [1]` in every committed human-seat recording) — so read players from `playerIds` / `chosen.playerIds`, never from `highlighted`. | Endstep study, §10.2, D423 |

### 2026-10-09 — what the seat may activate on the battlefield

Found by nine shakedown games of the LLM seat (D418, D419) with a real model:
M61 tells a seat what it may play from outside the battlefield, but the
battlefield was left out ("its cards were always clickable"), so a client that
must *say* what it can do there guessed from card text — and every guess
missed a family: `Equip {1}`, `Murasame — Equip {5}`, a planeswalker's loyalty
abilities, a Clue token with no card text at all. Forge already answers the
question for a click. One row. Decision **D420**. Held by
`mtgtable.PlayableSelfTest` (gate step 12l, on Forge's own cards: Jace, the
Mind Sculptor, Samurai's Katana, a Clue token, Smuggler's Copter),
`tools/check-redaction.mjs` (the shape, the per-file rule and the
hidden-information rule; five controls in `fixtures/negative/redaction/m63-*`)
and `web/test/playable.test.ts`.

| # | Section | Change | Source |
|---|---|---|---|
| M63 | §3, §3.1 | **`state.activatable`: at the seat's own priority, each permanent it controls with a non-mana ability Forge would activate on a click now, with those abilities.** `[{cardId, zone: "battlefield", abilities: [{abilityId, label, isSpell: false}]}]` — M61's entry shape, `zone` always `battlefield`, `isSpell` always `false`. The list is Forge's own: `Card.getAllPossibleAbilities(player, true)` **[jar]** on each permanent the seat **controls** (an owner's card under the opponent's control is the opponent's), each ability kept only if `SpellAbility.canPlay()` — loyalty abilities once a turn at sorcery speed and only those the loyalty can pay (`SubCounter`), equip at sorcery speed, crew with enough untapped power, a Clue's `{2}, Sacrifice`, a tapped permanent's `{T}` ability not at all — **and, beyond `canPlay()`, only when every target the ability must choose has a candidate** (`TargetRestrictions.hasCandidates` **[jar]** on the ability and its sub-abilities whose minimum is above 0: an equip with no creature in play, or Jace's −1 with none, is a click Forge starts and then cancels, so it is not listed; M61's `playable` does not apply this). **Mana is not predicted**; mana abilities are left out (they are used to pay, never clicked for). **A separate key, so `playable` (M61) keeps its meaning** — outside the battlefield only — for every reader that outlines cards by it. **Written only at the seat's priority, `null` otherwise**, exactly as M61 (the same moment, the same `ask`-flush rule), on every `state` a seat writes and never by an AI-vs-AI recorder, so a file carries the key on every frame or on none — a file recorded between M61 and M63 carries `playable` alone. **Hidden information:** only permanents the viewing seat controls, shown in full in this frame (`Snap.state` gates each entry again and drops any other with an `ACTIVATABLE DROPPED` line); `label` goes through the one ability-label gate (`Snap.abilityLabel`). **The act is still `clickCard`** on the permanent; with more than one ability Forge asks its own `ability_menu` (M14), whose options carry the same labels. `abilityId` is Forge's id in that frame and is matched against the menu's, never sent as `clickAbility`. **Optional**: absent from every stream before this amendment; a reader treats absent and `null` alike. The client's one reader is `activatableOf()` in `web/src/protocol.ts`. | LLM seat shakedown |

### 2026-10-08 — the session header names a search seat's version and budget

The human test set (D369) labels each of the owner's games with the AI it was
played against. `hello_ok.match.aiPolicy` (M56) says `search`, but not which
search: since D412 the live seat is search-v2, and a picker can set its budget
(D333). The header now says so — off the wire, so no client changes. One row.
Decision **D414**. Held by `tools/check-redaction.mjs` (the shape; two controls
in `fixtures/negative/redaction/m62-*`) and `tools/ml/tests/test_human.py`.

| # | Section | Change | Source |
|---|---|---|---|
| M62 | §8.1 | **The session header's `ai` (D414): who answered for the AI seat when it is not plain Forge.** `{policy: "outlets"}`, or `{policy: "search", version, budgetMs, config}` — `version` the live default's name (`"search-v2"`, D412) when the seat runs it at any budget, `null` when other knobs were changed; `budgetMs` its wall-clock budget per searched decision; `config` `SearchConfig`'s own string (`ms=…,cands=…,…`). The search's knobs only: never a card, a deck or a path to either. **Omitted for plain Forge**, so no plain recording changes; written only on a seat's log (beside `transport`), never at a table of two. Off the wire (the header is the log's); `hello_ok.match.aiPolicy` (M56) still names the policy on the wire. Its reader is the human test set's collector (`tools/ml/human_collect.py`, the manifest's `aiSearch`). | D414 |

### 2026-10-07 — what the seat may play from outside the battlefield

Found by ForgeCoach's full-game playtest: a card in the seat's graveyard with an
activated ability that is not a keyword (Cauldron Familiar's "Sacrifice a Food:
return it", Seasoned Pyromancer's and Unwilling Ingredient's "exile it from
your graveyard: …") could not be used from the board. Forge takes the click
(§4.1, M8: the seat's cards are clickable at priority), but nothing on the wire
said which non-battlefield card had something to play, and a board that
outlines by keyword (flashback, unearth…) cannot see an ability like these.
One row. Decision **D413**. Held by `mtgtable.PlayableSelfTest` (gate step
12l, on Forge's own cards), `tools/check-redaction.mjs` (the shape, the
per-file rule and the hidden-information rule; five controls in
`fixtures/negative/redaction/m61-*`) and `web/test/playable.test.ts`.

| # | Section | Change | Source |
|---|---|---|---|
| M61 | §3, §3.1, §3.2 | **`state.playable`: at the seat's own priority, each of its own cards outside the battlefield that Forge would play on a click, with the abilities it would play.** `[{cardId, zone, abilities: [{abilityId, label, isSpell}]}]`, `zone` one of `hand`, `graveyard`, `exile`, `command`, `library` (the top card only). The list is Forge's own: `Card.getAllPossibleAbilities(player, true)` **[jar]**, the call `InputPassPriority.onCardSelected` plays a click from — every spell and ability, alternative costs included (flashback, escape, foretell, adventure…), each kept only if `SpellAbility.canPlay()`: its zone (`ActivationZone$ Graveyard`), its timing and restrictions, and its non-mana costs (`CostPayment.canPayAdditionalCosts`: Cauldron Familiar with no Food to sacrifice is not listed). **Mana is not predicted**, as Forge's click does not predict it (§3.2). Mana abilities are left out. **Written only at the seat's priority** — the rules engine's priority player, the frame's own `priority` naming the viewer, nothing resolving, and not the frame an `ask` flushes — and **`null` otherwise**; written by a seat on every `state` and never by an AI-vs-AI recorder, so a file carries the key on every frame or on none (the M49 rule). **Hidden information:** only the viewing seat's own cards (owner and controller), only cards this frame shows in full (`Snap.state` gates each entry again and drops any other, whatever it was handed); `label` is `SpellAbilityView.getDescription()` through the same one ability-label gate an `ability_menu` option's goes through. **The act is still `clickCard`**: with more than one ability Forge asks its own `ability_menu` (M14), exactly as for a card on the battlefield. `abilityId` is Forge's id for the ability **in that frame** — an alternative cost is a fresh copy each time — so it is not a handle for `clickAbility`. `Card.abilities` (§3.2) stays `[]`. **Optional**: absent from every stream before this amendment; a reader treats absent and `null` alike, as "this frame does not say", never as "nothing is playable". The client's one reader is `playableOf()` in `web/src/protocol.ts`. | ForgeCoach playtest |

### 2026-10-06 — a best of three at a table of two, and each seat's consent to recording

Applied by the play-with-a-friend lane's third phase (branch `c/friend-bo3`;
decisions **D406** and **D407**). A table's process still plays one game: the
draft room runs the match, one engine start per game (D406). What changes on the
wire is only ever sent at a table of two whose seats file asks for it, so no
stream against the AI changes by a byte, and a table without those keys is
M59's. Held by `tools/check-redaction.mjs` (the `score` key and its range, the
header's `record`; six controls in `fixtures/negative/redaction/m60-*`),
`mtgtable.TableSelfTest` (the seats file) and gate step 10i (an automated game 2
of 3: who chose, who went first, both handshakes, both headers, `result.json`).

| # | Section | Change | Source |
|---|---|---|---|
| M60 | §2.1, §8.1, M41, M59 | **A best of three at a table of two (D406), and each seat's consent (D407).** **(1) `hello_ok`** of a game of a best of three carries M41's `gameNumber` (1–3) and `gameCount` (3), and `match` becomes `{yourDeck, opponentDeck, opponent, games: 3, score}` — `score` is `{you, opponent}`, the games each side won **before** this one, from the viewing seat's side (0 or 1 each, never more than `gameNumber − 1` together). A one-game table is M59's exactly (`games: 1`, no `score`, no `gameNumber`). **(2) Play or draw**: from game 2 on, the seat that lost the previous game is asked Forge's own later-game question, an `input` with OK `Play` and Cancel `Draw` and the prompt "*<name>*, you lost the last game. Would you like to play or draw?"; the other seat is asked nothing. Game 1, and a game after a draw, is Forge's coin toss as before. **(3) The session header's `record`** (§8.1): `true` or `false`, this seat's consent to the human test set (D369) and the automatic review (D385) for this game; only beside `humans: 2`; absent on a table that did not ask (M59's), which is read as not consented. **(4) `newGame` is still refused at a table** (M59 (8)): the next game is the room's (a new engine start with new decks and new seat tokens), not the session's. **(5) Off the wire**: the bridge writes `result.json` beside `--seats-file` when the game ends — `{v: 1, gameId, finished, winnerSeat: 0\|1\|null, draw, reason, from: "outcome"\|"claimWin"\|"concede"\|"none", turns}`, no card and nothing either seat did not see — which the room scores; the seats file gains the optional `match: {bestOf, game, wins}`, `chooser` and `record: [bool, bool]` (`docs/draft-room.md`). | D406, D407 |

### 2026-10-06 — a table of two: two people, two seats, one game

Applied by the play-with-a-friend lane (branch `c/two-humans`; decisions
**D402** and **D403**). `MtgTable --humans 2` seats two people and no AI. **Every
frame either seat already understood is unchanged**: each seat is the single seat
this file always described, its own stream redacted for that seat alone (§3.3,
hard rule 8). What is new is only ever sent at a table of two, so no stream of
one person against the AI changes by a byte. Held by `tools/check-redaction.mjs`
(the two-person `match`, the `table` frame's exact keys, the header's `humans`),
`tools/check-seat-pair.mjs` (the two seats' logs against each other),
`mtgtable.TableSelfTest` (the door) and gate step 10i (a whole game of two
automated seats, and two scripted clients on the table port).

| # | Section | Change | Source |
|---|---|---|---|
| M59 | §2, §2.1, §2.2, §2.6, §8.1, M13, M44, M50, M51 | **A table of two.** **(1) Where.** The two seats are on the **table port** (`config.json` `tablePort`, 8646; `--table-port`), `ws://<host>:<tablePort>/ws?seat=<token>`, bound to `127.0.0.1` or, with `--lan`, every interface. **Every upgrade must carry a seat's token, a loopback peer included** — there is no loopback exemption, because a tunnel daemon connects from 127.0.0.1. The token opens that seat and no other; the bridge holds only the two tokens' SHA-256 digests (`--seats-file`, `{names, tokenSha256}`), hashes what it is shown and compares digests (`MessageDigest.isEqual`), strips the query before the handshake and never logs a token. No token or a wrong one is **HTTP 403**; ten wrong tokens a minute from one address (a loopback peer's `CF-Connecting-IP`, when it sends one) and the rest of that minute is **429**. `Origin` must be absent, on `wsAllowedOrigins`, a `--table-origin`, or `http(s)://` on the request's own host name at any port (the draft room's page on 8644). **The table port serves `/ws` and nothing else**: `/observe` (no observers at a table of two: either stream shows its seat's hand), `/health`, a site and every other path are **404**, so a tunnel that routes `/ws` to it (D405) reaches exactly one thing. `GET /health` is the bridge's own `wsPort`'s, on loopback alone: 200 once both seats have their `hello_ok`, 503 before, so `play.sh`'s poll still works. A token is checked before the handshake, so a missing or wrong one never gets a socket. **(2) One client per seat, by token** (M13 for a table): a second connection that shows the same seat's token **replaces** the first, which is sent a `seq: 0` `notice {title: "Connection replaced"}` and closed **4002**; the seat is the newer one's, and its catch-up is M10's (the cached `hello_ok`, the last `state`, the last `table`, the `input` once there is one, every outstanding `ask`). **(3) `hello_ok.match` in its two-person form**: `{yourDeck, opponentDeck, opponent: "human", games: 1}` — `opponentDeck` is `{name, cards}` and nothing else (hard rule 8), there is no `aiDeck`, `aiProfile` or `aiPolicy`, and every `players[]` entry has `isAi: false`. **(4) A new s→c frame, `table` (§2.6)**: `{you, seats: [{seat, playerId, name, connected, deciding, decisionDeadline, awaySince}] × 2, decisionTimeoutMs, graceMs, claimWinAt, canClaimWin}` — sent to each seat whenever any of it changes, cached and re-sent on a reconnect after the `state`; times are the bridge's epoch ms, the envelope's `t`'s clock. **(5) The decision clock (D403)**: while a seat is connected and the engine waits on it, its clock runs (`--decision-timeout`, 180 s by default; 0 off); it restarts whenever the engine pushes that seat a new prompt or asks it something; when it runs out the decision gets the answer nobody chose — an outstanding `ask` is answered `null` (§5.4), an `input` gets OK when OK is enabled and Cancel otherwise — and both seats get a `notice {title: "Time's up"}`. **(6) Away (D403)**: a seat with no socket is away; **nothing answers for it** — its asks never time out (no `NO_CLIENT_ASK_TIMEOUT_MS`, no `cancelAll` on its disconnect) and its clock does not run, so the game pauses when it is that seat's decision; after `--seat-grace` (120 s) the other seat's `table.canClaimWin` is true and **`act: claimWin`** (§2.2) concedes for the absent player; earlier it is refused with `notice {title: "Not yet"}`. **(7) `concede`** is the seat's own, as ever, and is applied at once when the engine is parked on EITHER seat (D136's guard asked of both). **(8) One game**: `newGame` / `nextGame` are refused with `notice {title: "No next game"}`. **(9) The logs**: one per seat, `var/games/<gameId>-seat<N>/frames.jsonl`, each redacted for its seat (§8.3); the session header gains **`humans: 2`**, and its `decks` entry for the other seat carries no path or hash, as ever. `play.sh` names these games `friend-m<13 digits>`, which neither the human test set (D369) nor the automatic review (D385) reads. | D402, D403 |

### 2026-10-06 — the search's prior in decision records

Applied by the search week-3 lane (branch `c/search-week3`; written as M56, renumbered: M56 and M57 went to `hello_ok.match.aiPolicy` and play exploration first). One row. **No
frame on the wire changes**: two optional keys inside M55's `search` block,
written only when the search ran with `rank=prior` (D389). Held by
`tools/check-redaction.mjs` (the key sets and their types) and by
`mtgtable.ai.DecisionSelfTest`.

| # | Section | Change | Source |
|---|---|---|---|
| M58 | §8.2 | **M55's `search` block may carry the prior that ranked the candidates.** Each `search.options[]` entry may carry **`prior`** (a number: the leaf, or the learned evaluator's logit × 500, of the position after that candidate was applied once; absent when that option was not scored, as Forge's own answer and `pass` never are), and the block may carry **`generated`** (an integer: how many candidates were generated before the prior kept `options.length` of them). Both are absent when the search did not rank (its default), so an M55 record is unchanged. Under `anytime=1` (D388) each option's `n` is its own rounds rather than a shared count, and `diff`/`seDiff` are over the rounds it shares with Forge's answer — the same keys, already per option. | search week 3 |

### 2026-10-04 — play exploration marks an exploring recording and its random answers

Applied by the queue-exploration lane (branch `c/queue-exploration`), so a dataset can
tell the AI's own choices from the moves play exploration drew. One row. **No frame on
the wire changes**: the keys are written by the in-process recorder
(`mtgtable.SeatRecorder`, the cube lab's) into AI-vs-AI recordings only. Decision
**D358**; held by `tools/check-redaction.mjs` and its five `m57-*` controls, by
`web/test/cubelab-record.test.ts` over `fixtures/cubelab/explore/`, and by
`mtgtable.ai.DecisionSelfTest` on every build.

| # | Section | Change | Source |
|---|---|---|---|
| M57 | §8.1, §8.2, M55 | **An exploring game says so.** The session header of an AI-vs-AI recording whose seats explored gains an optional **`playExplore: {epsilon, closeCall, opening}`** (two numbers in [0, 1] and a boolean; never beside `transport`: a seat a person plays never explores). A **`decision`** record (M55) the explorer answered gains **`explore: {rule, forge}`** — `rule` is `random` (a uniformly random legal answer, with probability `epsilon`) or `closeCall` (a fair coin between the seat's creature choice and its nearest rival on Forge's own score), `forge` the answer the seat's policy had given, as a token (audited like every option: its card ids must be ones the record's state frame shows the seat); `chosen` is the answer played. The **`decisions`** summary gains **`explore: {decisionsRandomised, changed, closeCalls, closeCallsChanged, coins, failures, byKind}`**. **Optional**: absent from every recording that did not explore and from every one before this amendment. A dataset must not learn a marked record's `chosen` as the seat's choice (`policy_data.py` drops them); the positions and the outcome that follow are true. | D358 |

### 2026-10-03 — `hello_ok.match` names the AI's policy

Found by ForgeCoach: after a match setup chose the search AI, the board still
said "Forge AI", because nothing on the wire said which AI the launcher had
started. One row. Held by `tools/check-redaction.mjs` and its two `m56-*`
controls, and by `web/test/reduce-match.test.ts`.

| # | Section | Change | Source |
|---|---|---|---|
| M56 | §2.1, M44 | **`hello_ok.match` gains an optional `aiPolicy`: who answers for the AI seat**, exactly `MtgTable --ai-policy` — `"plain"` (Forge's own AI), `"outlets"` (with D310's sacrifice-outlet policy) or `"search"` (D312's look-ahead search; `--ai-search` alone implies it), the value `POST /match`'s `aiPolicy` (D333) restarts the engine with. One word of a fixed set: never the search's knobs (`--ai-search ms=…`), a path or a name. `mtgtable.MtgTable` writes it on every handshake, last in the object so M44's and M47's keys keep their positions; `mtgtable.RecordMatch` and the in-process recorders (`SeatRecorder`) do not — an AI-vs-AI recording names every seat's policy in its session header's `seats` (M55). **Optional**: absent from every stream before this amendment, and a reader must treat a missing key as "this stream does not say", never as `plain`. `tools/check-redaction.mjs` admits the key and fails any value but the three. The client's one reader is `aiPolicyOf()` in `web/src/protocol.ts`. | ForgeCoach |

### 2026-10-03 — decision records: an AI seat's choices, in its own recording

Applied by the decision-records lane (branch `c/decision-records`), so recorded
games can train a policy and drive expert iteration, not only the value
evaluator. One row. **No frame on the wire changes**: the new lines are written
by the in-process recorder (`mtgtable.SeatRecorder`: the cube lab's and
ai-bench's recordings) and never reach a socket. Decision **D347**; held by
`tools/check-redaction.mjs` (rules D1–D4) and its seven `m55-*` controls, and by
`mtgtable.ai.DecisionSelfTest` on every build.

| # | Section | Change | Source |
|---|---|---|---|
| M55 | §8.2, §8.1, §8.3 | **A third `dir`, `"ai"`: recorder-only lines in an AI-vs-AI recording, with a `seq` series of their own.** Two types. **`decision`** — one per decision the log's viewing seat took (priority, attack, block, target, choice, mulligan): `{seat, n, kind, frame, stateSeq, turn, phase, options, complete?, atoms?, hidden?, chosen, by, why?, parent?, source?, search?}`. `frame` is the index in the log's frames (every line after the header, as ForgeCoach's `log.ts` and the grader count them) of the `state` frame the decision was taken in, `stateSeq` its `seq`: the recorder flushes the events it holds before each decision, so that frame IS the position. `options` are every legal answer as the coach bench's tokens over wire ids (`pass`, `land:<id>`, `cast:<id>`, `activate:<id>[#k]`, `attack:none\|<ids>`, `block:none\|<b>><a>,…`, `target:<id>\|p<id>`, `option:<id>\|p<id>\|hidden`, `yes`, `no`, `keep`, `mulligan`); `chosen` is one of them (a list for a multi-card choice); `by` is `forge`, `outlets` or `search`; `search` is the rollout search's statistics per candidate (`{token, n, meanLeaf, se, diff, seDiff, win}`: the mean leaf and its standard error, the paired difference to Forge's answer and its standard error, the win estimate) and its `rounds`, `playouts`, `horizon`, `rule`, `margin`, `stat`, `z` (lcb only), `ms`, `budgetMs`, `timedOut`, `overrode` and `fallback`. **`decisions`** — one per seat at the game's end: counts by kind and policy, forced (one-option) decisions, errors. **They are private to the seat that decided**: `cast:41` says card 41 is in that hand and castable, so a seat's records go into its OWN log only, and the other seat's recorder is not even flushed by them (its frame cuts would show when this seat thought). No card name and no engine string: tokens, numbers and four enumerations. A card the seat cannot see (a library search) is counted in `hidden` and answered `option:hidden`, never named by id. The session header of these recordings also gains **`seats`**, `[{player, kind, profile, policy, search?}]` — which AI style played each seat (the opponent's profile was already public in `hello_ok.match.aiProfile`). Readers that feed `s2c` frames to the reducer skip the lines (`dir` is not `s2c`); `encode.py` already did. | decision records |

### 2026-10-03 — the AI's "can't play these cards well" reveal is off

Found by ForgeCoach's draft-to-match e2e on a real engine. One row.

| # | Section | Change | Source |
|---|---|---|---|
| M54 | §5, M44 | **The seat is no longer sent Forge's pre-game "AI can't play these cards well" reveal.** Before game 1, `Match.prepareAllZones` calls `GameAction.revealUnplayableByAI`, which — when `!gameType.isCardPoolLimited() && rules.warnAboutAICards()` — reveals every `AI:RemAIDeck` card in the AI's deck to every player. The bridge relayed it to the human seat as a `choose_list` ask with `reveal: true`, prompt `"AI can't play these cards well from <AI deck name>"` and the cards as options (measured: `"Chromatic Star (BRR)"` from a cube-drafted AI deck). That names cards of the AI's hidden decklist, which M44 and hard rule 8 keep off the wire (`hello_ok.match.aiDeck` is `{name, cards}` and nothing else). `MtgTable` now builds its `GameRules` with `setWarnAboutAICards(false)` **[jar]** (`forge.game.GameRules`, pinned 2.0.14), so the reveal is never raised. `RecordMatch` (no human seat) is unchanged. ForgeCoach also auto-acknowledges such a reveal unseen, as a second lock for older engines. | ForgeCoach e2e |

### 2026-10-03 — the match launcher: a match from decks the browser built

Applied by the match-launcher lane (branch `c/match-launcher`), for
ForgeCoach's cube draft, which builds both decks in the page and then plays
them. One row. **No frame changes**: the wire's shapes are what they were, and
the AI's deck still reaches the seat as `hello_ok.match.aiDeck` `{name, cards}`
and nothing else. What it adds is a door beside the wire — the coach helper's
`/match`, which restarts the engine — and one environment variable the bridge
reads. Decision **D303**; held by `tools/match-launcher-selftest.mjs` (gate step
12f, CI) and `mtgtable.WsLanSelfTest`'s `lanToken` cases on every build.

| # | Section | Change | Source |
|---|---|---|---|
| M53 | §2, §2.1, M44, M51 | **`POST /match` on the coach helper starts a match on two decklists the browser sent, by restarting the engine; `GET /health` there gains `match: 0\|1`.** The helper (D292's, on `coachPort`, behind its `wsAllowedOrigins` and LAN-token gate) checks the request — strict name patterns, 40–250 main-deck cards, a profile among the `.ai` files, 1–9 games, every card name against the engine's own scripts when they are on disk — writes `var/match/<id>/you.dck` and `ai.dck`, and asks `scripts/play.sh`, which owns the engine, to restart it (SIGUSR1; `var/match/request.json`, `status.json`, `current.json`). `play.sh` stops the bridge, waits for its port to go quiet — never two engines — and starts it with `--deck var/match/<id>/you.dck --ai-deck var/match/<id>/ai.dck --ai-profile <P> --games <N>` and every other flag it had. **A restart is a new session**: the seat's socket and every observer's drop with the old process (no close frame: the JVM is stopped, 1006), and a client reconnects and reads a new `hello_ok` — a new `gameId` (`match-<id>`: with a `--seed` the default id would repeat, and §2.1 reads a repeated `gameId` as a reconnect), `match` naming the new decks, `yourDeck.path` the `var/match/…/you.dck` file. **The opponent's decklist is never on the wire**: the bridge reads `ai.dck` exactly as it reads `decks/doom-legion.dck`, and `hello_ok.match.aiDeck` stays `{name, cards}`; the helper's own replies name the AI's deck by name and count too. **`MTGTABLE_LAN_TOKEN`** (§2, M51): a `--lan` bridge whose environment carries it uses it as its pairing token instead of minting one (unset or empty: a fresh token, as before; anything but 16+ of `[A-Za-z0-9_-]`: refused at startup, the value not echoed). Only `play.sh` sets it, on a restart, to the first run's token, so a phone's link and the helper's copy stay good across matches; M51's "one per run" now reads "one per `play.sh` run". The request and reply shapes are `docs/match-launcher.md`. | match launcher |

### 2026-10-01 — the `blockers` event: an unblocked attacker has no blockers

Applied by the blockers-event lane (branch `c/blockers-event`), for
ForgeCoach, whose coach and review read the event and said an unblocked attacker
was "blocked by itself". One row. It changes a **value's spelling** inside an
existing key — no key, no type, no `seq` rule — so it is not a `v` bump; every
committed recording keeps the old spelling, is still valid, and is **not**
re-recorded (a reader accepts both). Decision **D290**; held by
`mtgtable.JsonSelfTest`'s blockers cases on every build.

| # | Section | Change | Source |
|---|---|---|---|
| M52 | §3.6, M7 | **A `blockers` event's unblocked attacker is `{attackerId: n, blockerIds: []}`, never `[n]`.** Supersedes M7's "relayed verbatim". `GameEventBlockersDeclared`'s map is Forge's own: `PhaseHandler.declareBlockersTurnBasedAction` puts, for every attacker of every defender the defending player controls, `combat.getBlockers(att).isEmpty() ? List.of(att) : combat.getBlockers(att)` (**[jar]**, `javap -c` on the pinned 2.0.14 jar) — the attacker itself is a **sentinel** for "no blockers", and Forge's own `GameLogFormatter` reads it back that way (an empty list, or a first value equal to the key, is `lblLogPlayerDidntBlockAttacker`). M7 relayed the sentinel and told every reader to un-derive it; ForgeCoach did not, and neither did `render/describe.ts`. A creature can never block itself, so the bridge now drops the attacker's own id from its list (`Snap.block`), and the event says what `state.combat` says for the same attacker in the same frame — `combat.bands[].blockerIds` never carried the sentinel (none of the 1,365 combat bands in the 23 committed recordings names its own attacker). **Every attacker is still listed**, blocked or not: an entry with `[]` is the event's way of saying "this attacker went unblocked", which an omitted entry could not. Measured, seed 42 with the pinned jar: `RecordMatch` — 19 entries, 14 `[]` and 5 real blocks, where `fixtures/games/g1.jsonl` has the same 5 and 14 self-blocks; `--transport auto` and `--transport ws` (`tools/ws-auto-play.mjs`) — 10 entries, 9 `[]` and 1 real; **all 48 entries agree with the frame's `state.combat`**, against 5 of g1's 19. **Readers must accept both spellings** while any recording made before this row exists — and all of `fixtures/` is: read `[n]` with `n === attackerId` as `[]`. The web client's readers already did or now do (`cues/resolve.ts`, `story/narrate.ts`, `figures/pose.ts` on `state.combat`, and `render/describe.ts`, which printed "#12 blocked by #12" and now prints "#12 unblocked"); `tools/first-divergence.mjs` reads both as `[]`. Gate step 6 compares a fresh recording against g1, which predates this row: `tools/wire-drift.mjs` reads every self-block in both files as `[]` when the committed file carries one and says how many (9b's `tools/fixture-multiset-diff.mjs` the same way), so the rewrite turns itself off the day g1 is re-recorded; until then a fresh file that went back to the old spelling is caught by the build's self-test, not by step 6. `tools/check-redaction.mjs` is unchanged (`blockerIds` was already `number[]`, and both spellings pass). | blockers event |

### 2026-10-01 — LAN play: the pairing token and the static site

Applied by the LAN-play lane (branch `c/lan-play`), on the owner's approval, so
the owner can play ForgeCoach from a phone on the same Wi-Fi. One row. It adds an
HTTP surface and a credential on the socket's port, both off unless asked for, and
changes **no frame**: no key, no type, no `seq` rule, so it is not a `v` bump and
every recording is untouched. Without `--lan` and `--site-dir` the server binds,
answers and refuses exactly as M50 left it, save one fix any client sees: a query
string on `/ws` or `/observe` is now dropped before netty's handshaker, which
matched the path exactly and left such an upgrade hanging. Decisions
**D287**–**D289**; held by `mtgtable.WsLanSelfTest`, the build's seventh
self-test.

| # | Section | Change | Source |
|---|---|---|---|
| M51 | §2, M13, M15, M50 | **`--lan`: every interface, behind a pairing token; `--site-dir`: ForgeCoach's static site on the socket's port.** **(1) Why.** An https page may not open `ws://` to a LAN address (mixed content; only loopback is exempt), so a phone cannot use `https://jalirkan.github.io/ForgeCoach/` against the desktop. In LAN mode the bridge serves ForgeCoach itself over plain http on the ws port, and the phone opens `http://<desktop's LAN IP>:<wsPort>/?token=<T>`; the page then connects to `ws://<same host>/ws?token=<T>` — the same origin, so no mixed content. **(2) The bind.** `MtgTable --transport ws --lan` binds **`0.0.0.0`** instead of `127.0.0.1`. **(3) The token.** One per run: 128 bits from `SecureRandom`, base64url without padding (22 characters), printed only in the phone URLs (`WS LAN PAGE  http://<ip>:<port>/?token=<T>`, one line per non-loopback IPv4 address, best guess first — the default route's source address, then private ranges, virtual interfaces last; `WS LAN SEAT  ws://…/ws?token=<T>` when no site is served). **A loopback peer never needs it** (the desktop's browser, github.io's ForgeCoach, `play.sh`'s `/health` poll and every tool see what they saw). **A non-loopback peer must present it on every request**, `/health` included, or is answered **HTTP 403** (`text/plain`, `Connection: close`) before any other handler: on `/ws` and `/observe` as the query parameter **`token`**; on anything else as `token` or as the cookie **`mtgtable_token`**, which the server sets (`Path=/; HttpOnly; SameSite=Strict`) on an HTML response to a non-loopback request whose query carried a valid token, because a browser fetches the page's scripts, styles and samples without the page's query. The cookie never opens a socket. The comparison hashes both strings (SHA-256) and compares the digests with `MessageDigest.isEqual`, so its time depends on neither the first difference nor the length. The query is stripped from a socket path's URI before the handshake, and the token is never logged (a refusal logs the method, the path and the peer). **(4) `Origin`.** M50's check is unchanged and still runs on both paths; on a LAN server it additionally admits an `Origin` equal to **`http://` + the request's `Host` header** (case-insensitive, `Host` a name or IPv4 address with an optional port) — the page this server served — **only from a non-loopback peer**, which has already shown the token. A loopback peer gets M50's list alone, so a page whose name rebinds to 127.0.0.1 is still refused. **(5) The site.** `--site-dir <path>` (with or without `--lan`; a directory holding `index.html` at its root, checked at startup) is served at `/` for **`GET` and `HEAD` only** (else **405**, `Allow: GET, HEAD`): `/` is `index.html`; a request's path is percent-decoded, and one with a NUL, a backslash, a `.` or `..` segment, a doubled leading slash, or that normalises outside the root is **403**; a name that is not a regular file — a directory included, so there is no listing — is **404**; a file whose real path (symlinks resolved) leaves the root is **403**. `Content-Type` by extension: `text/html; charset=utf-8`, `text/javascript; charset=utf-8`, `text/css; charset=utf-8`, `application/json`, `image/svg+xml`, `image/png` (and jpeg, gif, webp, ico, woff/woff2, wasm, txt, webmanifest), anything else — **`.gz` among it — `application/octet-stream`, and never a `Content-Encoding`**: ForgeCoach fetches its `samples/*.jsonl.gz` and decompresses them itself. Every file carries `X-Content-Type-Options: nosniff`; HTML carries **`Cache-Control: no-cache`** and `Referrer-Policy: no-referrer` (its URL holds the token), everything else `max-age=3600`. `/ws`, `/observe` and `/health` are untouched by it, and without `--site-dir` no request outside them is answered, as before. **(6) The run** prints `WS SITE      http://127.0.0.1:<port>/  (<dir>)` and `WS LAN       bound 0.0.0.0:<port> …` after `WS HEALTH`, then the `WS LAN PAGE` lines, and its summary gains `ws lan / site = N requests refused for want of the token, N site files served, N not found, N refused`. **(7) What it is not.** The token is the only gate between the network and the seat: no TLS, so anyone who can read the network's traffic can read it; it is for a home network. D286's idle limit still ends a session after an hour with no `/ws` client. | LAN play |

### 2026-10-01 — the observer socket and the Origin check

Applied by the observe-endpoint lane (branch `c/observe-endpoint`), on the
owner's approval, for ForgeCoach (`https://jalirkan.github.io/ForgeCoach/`), a
static page that follows a live game read-only. One row. It adds a socket path
and a handshake check and changes **no frame**: no key, no type, no `seq` rule,
so it is not a `v` bump, every committed recording is untouched, and a client
of `/ws` from a non-browser (every Node tool here) or from the board's own page
sees exactly what it saw. Decisions **D280**–**D282**; held by
`mtgtable.WsObserveSelfTest`, the build's sixth self-test.

| # | Section | Change | Source |
|---|---|---|---|
| M50 | §2, §2.5, §8, M10, M13, M16, M19 | **`/observe`: a read-only copy of the seat's stream, any number of followers, never the seat; and an `Origin` allowlist on `/ws` and `/observe` both.** **(1) The path.** `ws://127.0.0.1:<port>/observe`, same port as `/ws`. **On connect, once a session exists**, an observer is sent the cached `hello_ok`, the last `state`, then this game's `over` if it has one or else the last `input` of this game if the engine has pushed one (M42's rule, read off the stream: `hello_ok` clears both), then every `ask` still outstanding — each the seat's own frame **byte for byte, same `seq`, same `t`**, and with the seat's redaction, because it is the same string (hard rule 8 is not reopened: an observer sees what the seat sees and nothing more). **After that it receives every session frame the seat is sent** — everything the session emits, in the order it reaches the seat's socket, whether or not a seat is connected — **and nothing else**: never a verbatim re-delivery the seat gets on a `resync` or a reconnect (M10; the observer already has that frame), and never a `seq: 0` frame (§2.5: each answers something the seat's own connection did). Catch-up and fan-out are ordered by one monitor, so an observer sees neither a gap nor a duplicate between them. **Before any session exists** an observer is sent nothing, then `openView`'s frames as they are pushed. **Between games** it stays connected: one that joins after `over` is told that game's `hello_ok`, last `state` and `over`, and the next game's `hello_ok` (M38) reaches every observer when it is emitted — read it as "a new game began", exactly as the seat does; one that joins after that `hello_ok` and before the new game's first `state` is sent the previous game's last `state` after it, which is what a reconnecting seat is sent in the same instant. **(2) Read-only.** Every message an observer sends — an `act`, an `answer`, a `resync`, a `ping`, garbage, a binary frame — is **released unread**: not parsed, not logged, not answered, never in the frame log, never reaching `onAct`/`onAnswer`/`onResync`. An observer's connect and disconnect touch nothing but the observer set: **not the seat** (M13's one-client rule counts `/ws` only, so a second `/ws` is still refused **4001** with any number of observers on, and an observer on before the seat never keeps the seat out), **not a resync** (M16's implicit resync is the seat's alone, so no `resync` line is written for one), **not the reply pool** (M19: no `cancelAll`, no `reopen`, and with no seat connected an ask still parks for `NO_CLIENT_ASK_TIMEOUT_MS`, not forever), and not `awaitNextGame`'s linger. Measured on a live seed-42 game with `tools/ws-auto-play.mjs` in the seat and five observers coming and going: the observer connected the moment the port bound received **2,447** frames, exactly the seat's 2,448 minus its one verbatim re-delivery, same bytes, same order, and the same `type@seq` series as the frame log's s2c lines; the log's 440 c2s lines are the seat's 439 sends plus its one implicit resync; eight observer messages, among them `act: concede`, changed nothing. **(3) Bounded.** Each observer carries the bytes handed to it and not yet flushed; one that would pass **8 MB** (`OBSERVER_BACKLOG_BYTES`) is disconnected on the spot — the TCP connection closed with no close frame, because one would queue behind the backlog that is the problem, so the client sees **1006** and may reconnect for a fresh catch-up. The game thread pays one enqueue per frame per observer and never waits on one. **(4) Closing.** When the server closes (the session's `over`, `--keep-open`'s end), every observer is sent close **1000** (`"game over"` or `"server closing"`), as the seat is; an observer that connects to a closing server is closed 1000 at once. **(5) The `Origin` check, on both paths.** A browser sends `Origin` on every websocket upgrade and a page cannot forge it, and a websocket is not subject to CORS — so before this row any page the user had open could open `/ws` while the board was not connected, and act (concede) or sit on every ask. The upgrade request is now checked before any handshake: **no `Origin` header is allowed** (a non-browser client, which could send any header it liked anyway), and otherwise the origin must match `config.json`'s **`wsAllowedOrigins`**, default `["http://127.0.0.1:*", "http://localhost:*", "https://jalirkan.github.io"]` (`:*` is any port, or none) — else **HTTP 403** and the connection closed: no socket, no `notice`, no close code, nothing counted as a connection, one stderr line and the run summary's `ws observers` line. `"null"` (a `file:` page, a sandboxed frame) is refused and cannot be listed. **(6) The run** prints `WS OBSERVE   ws://127.0.0.1:<port>/observe` after `WS LISTENING`, and its summary gains `ws observers = N accepted, N dropped as too far behind, N messages from them released unread, N upgrades refused by Origin`. | observe endpoint |

### 2026-09-28 — the status layer: a card's keywords

Applied by the status-layer lane (branch `status-layer`). One row. It is an
**added key on a full card**, so it is not a `v` bump and every existing
recording stays valid: the key is optional, and all nineteen committed
recordings (`fixtures/games/`'s eighteen and `fixtures/synthetic/`'s one)
predate it and replay unchanged. Evidence: `docs/evidence/status-layer.md`;
decisions **D210**–**D212**.

| # | Section | Change | Source |
|---|---|---|---|
| M49 | §3.2, §3.3, §9 | **A full card gains `keywords: string[]`** — the card's keyword abilities as the engine has them NOW, read from `CardView.getCurrentState().getKeywords()` **[jar]** (`CardStateView.getKeywords()` returns a `forge.game.keyword.KeywordCollectionView` of `KeywordView`s; javap on the pinned 2.0.14 jar), so a keyword a static grants is there and one an effect removed is not. **Every entry is a `forge.game.keyword.Keyword` constant spelled by `name()`** — `"FLYING"`, `"FIRST_STRIKE"`, `"WARD"`, `"EQUIP"` — with no parameter (Ward's cost, Equip's cost and Protection's quality stay off the wire), deduplicated, in Forge's order. **No display string is ever emitted.** A keyword Forge could not map to a constant is `Keyword.UNDEFINED`, and it is omitted: a census of fourteen recordings over every deck in `decks/` found exactly one such keyword, `ETBReplacement:Other:ChooseColor` — engine script, not a keyword printed on a card — whose `title()` is `""`, so "the display string otherwise" had nothing to say, and whose `original()` is an engine string, which hard rule 8 lets through one function only. A closed vocabulary needs no sweep: `tools/check-redaction.mjs` holds every entry to the constant's shape (`^[A-Z][A-Z0-9_]*$`, never `UNDEFINED`, no repeats), and a card name cannot pass it. **`[]`** for a card with no keywords, in the no-state branch (bridge convention (c): the key is written in both branches), and for **every face-down card, in both branches of gate 2** — exactly as its `name` is `""`: the face-down characteristic exposed no keyword on any of the census's 433 face-down instances, and the empty list is forced rather than trusted, for the reason the name is. **A stub never carries it**: the five keys of §3.3 are exact, and a `keywords` array on a `hidden: true` card fails A1. **Optional on the wire, with one reader**: `keywordsOf(card)` in `web/src/protocol.ts` is where "the key is absent" becomes "this recording predates M49", and it answers `[]` for a stub, a face-down card and an absent key alike, because none of the three draws an icon (the renderers' half of hard rule 8). **M6's all-or-nothing rule does not apply**, and the reason is in that rule itself: it is about a BLOCK of distinct keys (the comfort fields) which a SEAT answers and an AI-vs-AI recording legitimately lacks, so one of them absent beside another present is the only signature a broken emitter leaves. `keywords` is one key, written by both recorders for every viewer on every full card — there is no block to be half present and no recording that may omit it. What the checker holds instead is the single-key form of the same idea: **a file is pre-M49 (no full card carries the key) or M49 (every full card does)**, and a file with some of each is a `Snap.card` branch that forgot it, which fails as *"M49's keywords are HALF PRESENT"*. Negative controls: `fixtures/negative/redaction/m49-*` (a control that passes and four one-defect probes). Gate step 6 compares a fresh recording against `fixtures/games/g1.jsonl`, which predates M49, with `keywords` removed from the fresh file (`tools/wire-drift.mjs`, and 9b's `tools/fixture-multiset-diff.mjs` the same way): the key's VALUES come under step 6 the day g1 is next re-recorded on purpose. | status layer |

### 2026-09-28 — the undo race: an act the engine cannot take now

Applied by the undo-race lane (branch `undo-race`). One row, and it adds no key
and no frame type: two `act`s the server used to apply whenever they arrived are
now sometimes refused with a `notice`, which §2.2 always allowed ("drop it —
optionally with a `notice`"), and a third, `concede`, is sometimes finished by
the engine a moment later instead of by the server at once. Evidence:
`docs/evidence/undo-race.md`; decision **D136**. *(Numbered **M48** on the lane's instruction, after spectating's M47, and
kept at merge: no amendment landed in between. The decision was written as D170
and is **D136** since the merge.)*

| # | Section | Change | Source |
|---|---|---|---|
| M48 | §2.2, §6 | **`undo` and `useMana` are applied only while the engine is waiting on this seat; otherwise they are refused with `notice {level:"warn", title:"Not now"}` and have no effect.** Both acts write engine state directly — `undo` pops the rules engine's undo stack and refunds, `useMana` spends pool mana — and neither goes through Forge's input protocol, so the server applied them from its own thread whenever they arrived. An `undo` sent on the `state` a mana payment flushes (the one state that offers the undo of that payment) arrived while Forge's game thread was putting the spell on the stack and walking the same undo stack, and Forge threw `ArrayIndexOutOfBoundsException` inside its game loop — an engine crash, which M46 turned into an error `notice` and a null `over` (the story branch's gate run, step 10g). The server now checks, immediately before the write, that the engine is parked on an input for this seat and that nothing else is running (D136's eight conditions); when it is not, the act is dropped and the seat is told `Not now`, whose `text` begins with the act's name (`"undo: …"`, `"useMana: …"`). **Nothing is queued**: the act was a decision about the board the player saw. A client may send the act again once the engine is waiting on it — the next `input`, or a moment later, since the engine can offer the undo in a `state` it flushes just before it parks. `state.undo` is unchanged and still says whether an undo would do anything. **And a `concede` that arrives while the engine is running is carried forward, never refused**: Forge's concede walks the player list on the server's thread, which crashed the engine (`ConcurrentModificationException`) when the engine was walking it too, so the server writes only the conceding seat's outcome and the engine ends the game at its own next check — the `state` with `gameOver` and the `over` arrive a moment later, as for any other game end. From that point **the seat is asked nothing more**: an `ask` that was outstanding is answered by the server with its §5.4 default (so a client's own answer to it may come back as `notice {title:"Late answer"}`, §2.3), and any later one is never sent. | D136 |

### 2026-09-28 — spectating: an AI-vs-AI recording that says what it is

Applied when `./scripts/spectate.sh` learned to record two Forge AIs playing each
other — each on its own deck and profile — and the page learned to follow that
recording while it is written (decisions **D118**–**D122**). One row. Both
changes are **optional keys** — one inside a `body`, one in the session header —
so it is not a `v` bump, and every existing recording, the gate's seed-42
re-recording among them, is byte-for-byte what it was. Evidence:
`docs/evidence/spectate.md`. *(Numbered after the hardening pass's M45–M46,
which landed on `main` first.)*

| # | Section | Change | Source |
|---|---|---|---|
| M47 | §2.1, §8.1, §8.4, §8.7 | **`mtgtable.RecordMatch` writes M44's `hello_ok.match` when it is given a match setup** — `--match`, or either profile flag, `--profile` (seat 0's, the `--deck` seat) and `--ai-profile`/`--profile2` (seat 1's) — read from the VIEWING seat exactly as `MtgTable` reads it: `yourDeck` is the `--seat` seat's deck, `aiDeck` the other seat's (**`{name, cards}` and nothing else**, M44's hard-rule-8 line), `aiProfile` the other seat's profile, `games` 1. **One key is added, last: `yourProfile`, the viewing seat's own profile** — written only by `RecordMatch`, because only there is the viewing seat an AI; `tools/check-redaction.mjs` fails it on a stream whose `players[]` marks the viewer human, and holds it to a profile name. **Without any of the three flags nothing is written** — the M41 precedent, an optional key omitted when nobody asked, which keeps gate step 6's value-level diff against `fixtures/games/g1.jsonl` meaningful. **The session header gains an optional `paceMs`** (§8.1): the recorder ran with `--pace <ms>` and dwelt that long at each frame boundary (a quarter of it after a frame that only moved the phase strip), so every `t` is the engine's clock stretched for a watcher; absent means engine speed, and it is a failure beside `transport` (only an AI-vs-AI recording is paced). Profiles are tied to the DECK, never to `--seat`, so recording one seed from the other chair records the same game (§8.7, measured). The client reads the block through `seatMatchOf()` still — the viewing seat's profile now comes from `yourProfile` when `players[]` marks it an AI — and composes it per seat in `matchupOf()` for the arena's "watching" line. Negative controls: `fixtures/negative/redaction/m47-*` (a control that passes and three one-defect probes). | spectating |

### 2026-09-27 — the hardening pass, the end of a game

Applied by the small-defect pass (branch `hardening`). Two rows, and neither
changes a frame's shape: M45 changes WHEN a `newGame` is honoured, M46 says what
a session whose engine crashed puts on the wire. Evidence:
`docs/evidence/hardening.md`; decisions **D114** and **D115**. *(Numbered after
match setup's M44, which landed on `main` while this pass was open.)*

| # | Section | Change | Source |
|---|---|---|---|
| M45 | §2.2, §7 | **A `newGame` that arrives before Forge has FINISHED the game it follows is queued, and honoured the moment Forge has.** `over` is emitted at the outcome (M4), while Forge's game thread is still winding the game down: ownership changes, cache clears, `GameEventGameFinished`, and `FControlGameEventHandler`'s answer to that event — `showPromptMessage`, `updateButtons` and `finishGame()` queued on the EDT for this seat's GUI. A client that answers `over` with `newGame` at once could get its act onto the EDT first; the restart ran, the next game's `openView` re-armed the terminal-frame latch, and the previous game's late `finishGame()` then emitted the NEW game's `over` — before it had dealt a card, with no `gameOver` state (gate step 10g, once in two runs at a load average of 15–32: a four-frame game 3). The act is now held until the game's own `GameEventGameFinished` has been dispatched and the EDT has drained behind it, then applied exactly as before; the client sees the same frames, a moment later (a new `hello_ok`). One act is queued; a second before the release is dropped (stderr). There is still no frame to refuse with between games (§8.4). The pre-input concede (M11) never reaches Forge's game-over, so a `newGame` after ITS `over` is applied at once, as it always was. | 13(c) |
| M46 | §6, §7, §8.4 | **An engine crash ends the game on the wire: an error `notice`, then amendment M11's null `over`.** When an exception escapes Forge's game loop (measured: a card script the 2.0.14 jar cannot build throws out of `Match.prepareAllZones` before turn 1), nothing in Forge catches it and no outcome is ever published. The bridge now sends `notice {level:"error", title:"Engine error", text:<our own words>}` and `over {winner:null, reason:null, matchOver:true}`, so the frame log ends in its terminal frame and a client stops waiting; the process exits non-zero with the cause on stderr, and a multi-game session plays no further game. **The notice never carries the engine's message**: it names the card ("check card script of …"), and the card can be in the opponent's deck (hard rule 8). A consumer that sees an error `notice` titled `Engine error` in front of a null `over` is looking at an INCOMPLETE game. `RecordMatch` writes the same two frames. | D115 |

### 2026-09-27 — match setup, the AI's deck and profile

Applied when the bridge learned to seat the AI with a deck of its own and a
chosen Forge AI profile (`MtgTable --ai-deck <path>` / `--ai-profile <name>`,
`scripts/play.sh`'s flags of the same names, `config.json`'s `match` block). One
row. It is an **added key inside a `body`**, so it is not a `v` bump, and every
existing recording stays valid: the key is optional and absent from every log
made before this date. Evidence: `docs/evidence/match-setup.md`.

| # | Section | Change | Source |
|---|---|---|---|
| M44 | §2.1, §8.1 | **`hello_ok` gains `match: {yourDeck: {name, path, cards}, aiDeck: {name, cards}, aiProfile, games}`** — what this match *is*, which nothing else on the wire says and no client can derive. **The AI's deck is its NAME and its card COUNT, and nothing else**: never a path, a sha256 or a list, for exactly §8.1's reason for nulling the opponent's `decks` entry — a path plus a hash identifies a decklist exactly, and hard rule 8 says the opponent's library is hidden. The name is the `.dck` file's own `[metadata] Name=` (the file's base name when it has none): the thing a player says across a real table, and public in a real match. A deck *named after a card* announces that card, exactly as saying the name at a table would; nothing else about the list reaches the wire. `yourDeck` adds the viewing seat's own `path`, which §8.1 already puts in the session header. `aiProfile` is the canonical name of one `.ai` file in `forge-home/res/ai/` (`Default`, `Cautious`, `Reckless`, `Experimental` in 2.0.14 — report 11 §9), validated before the engine boots and passed to `GamePlayerUtil.createAiPlayer(String, int, String)` **[jar]** as `profileOverride`, **never empty**: the empty-override branch reads `FPref.UI_CURRENT_AI_PROFILE` and, when that value is not in `AiProfileUtil.getProfilesDisplayList()`, **calls `ForgePreferences.save()`** (bytecode offsets 28–83 of the five-argument overload), which is the persistent edit CLAUDE.md forbids. `games` is `--games N` and, unlike M41's pair, is **always present**: M41 omits `gameCount` for a one-game session because "where in the match are we" says nothing there, whereas "how long is this match" always says something. Emitted by `mtgtable.MtgTable` on every transport; `mtgtable.RecordMatch` (AI vs AI, no seat) did not write it until amendment **M47**, and writes it now only when given a match setup. `tools/check-redaction.mjs` asserts the exact key sets — an `aiDeck` carrying any key but `name` and `cards` **fails** — and cross-checks `yourDeck.path`/`.cards` and `aiDeck.cards` against the session header's `decks` and `games` against M41's `gameCount`. The client's one reader is `seatMatchOf()` in `web/src/protocol.ts`; the board prints a seat's deck name on its rail, and the AI's profile on the AI's. | match setup |

### 2026-09-13 — M7 verification, the counter spelling

Applied after an independent verification pass read this file against the bytes
in `fixtures/`. One row; it changes **no bytes at all** — it corrects a spelling
this file has asserted since M1 and that no emitter has ever written. Evidence:
`docs/evidence/m7-arena.md` §7; decision **D46**.

| # | Section | Change | Source |
|---|---|---|---|
| M43 | §3.1, §3.2, §3.6 | **Every counter type on the wire is Forge's DISPLAY name — `+1/+1`, `-1/-1`, `Spore` — never its enum constant.** §3.6's `counters` row said the field carried *"the `CounterType` name, e.g. `P1P1`"*, and §3.1/§3.2 gave `P1P1` as the example key of the `counters` map on a player and on a `Card`. The emitter has always called `CounterType.getName()` (`Snap.java`, three call sites), and `getName()` returns the printed name: **all 1,316 counter values in the committed corpus are `+1/+1` or `Spore`**, and there is not one `P1P1` anywhere in `fixtures/`. The enum-constant spelling was never on the wire; the spec simply named the wrong accessor's output. A second consumer written from the old text would look up a key that cannot occur — which is exactly what happened: the arena's §7.3 selector grammar spells the counter `P1P1`, so `counters:P1P1+` matched nothing until `counterToken()` in `web/src/arena/cues/types.ts` normalised the wire's spelling into it. **The wire is not changing** (D46): `getName()` is what Forge shows a player, fourteen committed recordings carry it, and a client that wants a token spelling normalises one. A consumer must therefore treat the key as **an opaque display string**, match it case-sensitively or normalise it, and never assume an identifier shape. | M7 verification |

### 2026-09-12 — M6 fix pass, the pre-input `input`

Applied after gate step **10g** failed once under load and passed three times
standalone — a race, not a regression. One row, one rule, and it is the rule the
`Not yet` guard always implied: the wire must not say "the engine is asking you
something" before the engine has asked. Evidence: `docs/evidence/m6-engine.md`
§11.

| # | Section | Change | Source |
|---|---|---|---|
| M42 | §2.1, §2.4 | **An `input` frame is only ever delivered after the engine has asked; a client may treat the first `input` as the pre-input guard lifting.** A connect and a `resync` re-deliver `hello_ok` and the last `state` unconditionally; the `input` half goes through `Transport.Inbound.onResync()` and is now emitted **only once `WireGuiGame.inputSeen` is armed** — which `engineInput` does and no client frame ever can (M3's doorstep test). Before this, a pre-input connect got the empty struct the seat was constructed with, and a client that read it as "I may act now" had its act dropped by `applyAct`'s pre-input guard with `notice {title: "Not yet"}`. Measured, and it is why this row exists: under gate load `tools/ws-auto-play.mjs --comfort` armed `pendingInput` from that frame and sent `act: setPhaseStop` **128 ms before** the engine's first real `input` (`var/ws-auto-3g.jsonl` lines 3–7: `input`@t=…646, `input`@…649, `state`@…728, the act@…730, `notice {"title":"Not yet"}`@…731, the first engine `input`@…858); the act was dropped, the effect never arrived, and step 10g failed on a true statement about a dropped act. The guard is per **game** — `resetForGame` re-arms it with every `hello_ok` (M38), and `WsTransport` nulls its cached `input` there for the same reason. The client half is a retry: a `Not yet` notice that follows a comfort act un-sends that step, which is counted in ws-auto-play's summary as `retries=N`. | M6 fix |

### 2026-09-12 — M6, §10 becomes live protocol

M6 is where **§10's planned additions stop being planned**. Every row below is an
added field inside a `body` or a new `act.action`, so none of them is a `v` bump
and every existing fixture stays parseable. The shapes were fixed **before**
either end was written, because two agents build against them at once. Evidence:
`docs/evidence/m6-engine.md`.

| # | Section | Change | Source |
|---|---|---|---|
| M32 | §3, §3.1 | **`players[].phaseStops` is `{"own": [PhaseType…], "opp": [PhaseType…]}`**, not a flat array. A phase stop in Forge is a per-(turn player, phase) bit — "stop at MAIN1 **on my turn**" and "stop at MAIN1 **on the AI's turn**" are two different switches (`FPref.PHASES_HUMAN` vs `PHASES_AI`, report 11 §3.2), and a flat array cannot say which. `own` is the set that applies while **this** player is the turn player; `opp` is the set that applies while any other player is. In a two-player game `players[0].phaseStops.opp` and `players[1].phaseStops.own` are therefore the same list, which is redundant and deliberate: a client renders one strip per seat and reads one field. Server-owned, seeded per game from the prefs, **never saved**. | M6 |
| M33 | §2.2 | **`setPhaseStop` takes `{phase, turn, stop}`** — `turn` is `"own"` or `"opp"`, relative to the **viewing seat**, and there is no `playerId`. A seat may only change its own stops, and naming the turn rather than the player is what makes `own`/`opp` in `state` and in the act the same word. The bridge still accepts the M3-era `{playerId, phase, stop}` spelling (the server tolerates any act), and nothing sends it. | M6 |
| M34 | §3, §3.1 | **`state.yield` gains its discriminator**: `{kind: "endOfTurn" \| "marker" \| "stack", playerId, phase} \| null`. §10.1 left `kind` out and said adding it was a one-line amendment; this is that line. `phase` is `null` for the two kinds that have no phase; `playerId` is the **yielding seat for all three** (§3.1), and is never null. The three kinds are three different engine mechanisms behind one call (`sendYieldUpdate`), and **all three are cancelled by `buttonCancel`** — there is no `cancelYield` act. | M6 |
| M35 | §3, §3.1 | **`state.undo` is `{can, depth}`**, refreshed with every snapshot. `can` is `PlayerControllerHuman.canUndoLastAction()` **[jar]**, `depth` is `MagicStack.getUndoStackSize()` **[jar]**. Undo holds **mana abilities only** and is cleared at every phase change and whenever priority leaves you (report 11 §7.1): a UI that promises to un-cast a spell is promising something the engine does not do. | M6 |
| M36 | §3.1 | **`stack[]` gains `yieldKey`, `isAbility`, `isOptionalTrigger`, `yielded`.** `yieldKey` is a **bridge-minted opaque handle** (`"y1"`, `"y2"`, …) interned for the life of one game — never `StackItemView.getKey()`, which is `CardView.toString() + ": " + …`, i.e. a card name, an id and its rules text (report 11 §5.2). It is `null` for an item with no key. The client passes it back in `setYield` and **never renders it**; `tools/check-redaction.mjs` fails any log whose `yieldKey` contains a space or a `(`, and `tools/lint-bridge.sh` fails a build where `getKey()` appears outside the one handle table. `yielded` is `"yes" \| "no" \| null` — the engine's standing answer for this key (`ACCEPT` / `DECLINE` / a plain auto-yield / nothing), not a boolean. | M6 |
| M37 | §2.2 | **Three new acts**: `yieldTo {kind, phase?}`, `setYield {yieldKey, mode}` with `mode ∈ {"yes","no","clear"}`, and `newGame {mode}` with `mode ∈ {"continue","restart"}`. `newGame` **supersedes the bare `nextGame`** of M3 (kept as an alias for `{mode:"continue"}`) and is only meaningful after an `over`. `passPriority` and `undo`, listed since M3 as "from M6", are now live. | M6 |
| M38 | §2.1, §8 | **A new `hello_ok` per game, with a new `gameId`, and a new frame-log file.** Game 1 of a session keeps the session's `gameId`; game *n* is `<gameId>-g<n>` and writes `var/games/<gameId>-g<n>/frames.jsonl`, line 0 its own session header. `HostedMatch.endCurrentGame()` replaces every `PlayerView` and empties `getHumanControllers()`, so **every id the client cached is invalid**: the reducer drops its card map on `hello_ok` (invariant 10) and the bridge rebuilds the card/player indexes, the ability index, the yield-handle table, the phase-stop map, the `ReplyPool` and the log from `openView`. | M6 |
| M39 | §4 | **`input.buttons.focus` is `"ok" \| "cancel" \| null`** — `updateButtons`' sixth argument `focus1`, which the emitter had been dropping. Space activates the **focused** button; "space = OK" is not a Forge shortcut and never was (report 11 §11). | M6 |
| M40 | §5.2, §8.1 | **`sideboard` is reachable, and `UI_MANA_LOST_PROMPT` is on by default.** The first is M27's other half: with a session that survives `matchOver: false`, `Match.prepareAllZones` → `PlayerController.sideboard` fires **on the game thread** between games of a `--games N` match, which is where `fixtures/games/human-sideboard-7.jsonl` comes from. The second is M5 follow-up 2 taken: `config.json`'s `"manaLostPrompt": true` sets `FPref.UI_MANA_LOST_PROMPT` **in memory, never saved**, so the floating-mana `confirm` now appears in ordinary games and every session header carries `prefs: ["UI_MANA_LOST_PROMPT"]` (M31). `--no-mana-lost-prompt` turns it back off. | M6 |
| M41 | §2.1 | **`hello_ok` gains `gameNumber` and `gameCount`** — which game of the match this handshake opens (1-based) and how many the match is played to (`--games N`). Both are known to the bridge at `openView` (`WireGuiGame.gamesStarted()` and the CLI's `--games`) and neither is derivable by a client: counting `hello_ok`s restarts at 1 on a page reload, and "of 3" has no client-side source at all. **Both keys are absent from a `--games 1` session** — "where in the match are we" has no answer when there is one game, and the header's own `policy` / `prefs` (M31) set the precedent for an optional key that is omitted when it says nothing. Added by the M6 verification pass, which found the client reading two fields no emitter wrote. | M6 fix |

### 2026-09-12 — M5 verification, the three dead ends a review found

Applied after an independent verification pass played the board in a browser and
re-ran the gate from a deleted `bridge/out`. All three are **dead ends that
survived M5** — the milestone whose name is "nothing dead-ends" — and none of
them changes a frame shape. Evidence: `docs/evidence/m5-fixes.md`.

| # | Section | Change | Source |
|---|---|---|---|
| M28 | §4.2 | **The wedge banner needs a _seventh_ clause: `buttons.cancel.enabled` → not a wedge.** Measured live on `decks/pacho-shield.dck`: clicking a spell whose cost you cannot pay pushes `Pay Mana Cost: {2}{W}` with OK (`Auto`) **disabled**, `selectable` empty, no ask, game not over and your own priority — all six M21 clauses — while an **enabled `Cancel`** sits next to the red *"Nothing to do … concede"* banner and recovers the game in one click. A state the engine is offering a labelled way out of is by construction not "nothing to do", and a genuinely wedged game thread is not pushing an enabled button at you. Corpus effect (`web/test/wedge.test.ts`): `human-auto-42.jsonl` 311 flagged frames → 40, `human-search-7.jsonl` 122 → 12, and still nothing anywhere in the corpus stays flagged for 2.5 s (worst gap after a flagged frame: 58 ms). | M5 review |
| M29 | §5.4 | **A client's one-click "default" for a `numeric: true` `text` ask must be `null`, not `initial`.** M25 established the engine fact; this row states the client consequence, because the board shipped the other way and looped. `initial` is `""` whenever Forge has none (§5.2), and `""` into `AbstractGuiGame.getInteger`'s `while (true)` is the identical question back, forever — reproduced in the browser on `decks/number-probe.dck` (Volcano Hellion → `choose_list` → "Other…" → `text a2`; **Default** produced `a3`, `a4`, `a5`, `a6`). A UI may still offer a free-text box, but its *documented default* is the cancel, and it must not send a value it cannot know is in range: the body carries neither bound and CLAUDE.md §Scope forbids the client guessing one. | M5 review |
| M30 | §2.2 | **`useMana`'s `color` accepts the single letters, and this client sends them; and this client offers the pips whenever the pool is non-empty.** M26 ended "send the full name", while the browser — the only human client — has sent `"U"` / `"R"` since M1 (`ManaColor` in `protocol.ts`). Verified in the 2.0.14 bytecode: `MagicColor.fromName` tests `length == 2` on the **raw** string first (offsets 18–44) and only then lowercases and switches on `w u b r g c` for length 1 (offsets 45–257, returning 1/2/4/8/16/0), so a one-character `ManaColor` can never reach the colour-pair branch. **A two-character string is still parsed as a pair.** Separately, M26's *"offer the control only while the engine is asking for mana (an `input` whose OK button the engine labelled `Auto`)"* is **not** what this client does and is not what it should do: matching an engine button label to decide what a control means is exactly what CLAUDE.md §Scope forbids. Until `input` carries a typed `payingMana` (an M6 row), the pips are live whenever the pool is non-empty and no ask is outstanding, and the pip's own title says the engine only accepts the act during a mana payment. | M5 review |
| M31 | §8.1 | **The session header records the two run-shaping flags it was silently dropping.** `policy: "probe"` (`--probe`) and `prefs: ["UI_MANA_LOST_PROMPT"]` (`--mana-lost-prompt`), both **optional and omitted when unset**, so no existing recording changes. Without them `fixtures/games/human-amount-7.jsonl` carries two `confirm` asks that cannot occur on stock Forge preferences with nothing in the file saying why, and a reader who re-records it on defaults concludes the emitter changed. `tools/check-redaction.mjs` tolerates both and requires neither. The deck-path nulling for player 1 is deliberate and unchanged. | M5 review |

### 2026-09-12 — M5, the probe decks

Applied after five probe decks forced the engine to ask the six kinds that had
no engine evidence. **No frame shape changed**: every ask body Forge produced
already matched §5.2 as written, `tools/check-redaction.mjs`'s exact-key-set and
declared-nullability checks passed on all four new fixtures, and no type,
default, `min`/`max` or `delayedReveal` shape needed correcting. What these rows
add is **reachability** — which kinds this configuration can ever see, and what a
client has to send for the two acts nothing had sent. Evidence:
`docs/evidence/m5-probes.md`.

| # | Section | Change | Source |
|---|---|---|---|
| M22 | §5.2, §5.3 | **`options` is unreachable, and not only for a human seat: `IGuiGame.showOptionDialog` has no call site anywhere in the 2.0.14 jar.** Every `showOptionDialog` call resolves to `forge.gui.util.SOptionPane` (which delegates to **`IGuiBase`**, a different interface, implemented by `HeadlessGuiBase`) or to the desktop `forge.toolbox.FOptionPane`. Scanned over every class in the jar, not read: zero `invokeinterface forge/gui/interfaces/IGuiGame.showOptionDialog`. The kind stays in the eleven — it is on the interface, `RemoteClientGuiGame` implements it, and a later Forge may use it — but it is a **documented ceiling**, not an open gap, and `mtgtable.AskSelfTest` plus `fixtures/synthetic/` are the whole of its contract on purpose. | M5 |
| M23 | §5.2, §5.3, §5.4 | **`manipulate_list` is unreachable while decision D13 holds.** `IGuiGame.manipulateCardList` has exactly one caller in the jar, `PlayerControllerHuman`, whose chain is one deep and pref-gated: `arrangeForScry` → (only when `UI_SELECT_FROM_CARD_DISPLAYS` **and** `!isLibgdxPort()`) → `arrangeForMove` → `manipulateCardList`. `Bootstrap` sets that pref to `"false"` in every process and `HeadlessGuiBase` is not the libGDX port, so the branch is never taken — confirmed in the jar's own bytecode (`ifeq 110` / `ifne 110`), not only in the 2.0.15 source. §5.3's warning that "this is where the whole library can arrive" is therefore a statement about the pref, and turning the pref on is the leak it describes. | M5 |
| M24 | §5.2, §5.3 | **`confirm` is reachable, from exactly one call site, and only with one Forge preference on.** Eleven of the twelve `IGuiGame.confirm` / `showConfirmDialog` call sites are inside `if (getGui().isLibgdxPort())` (including `InputConfirm.confirm` itself, whose else branch is the **input** path) or are dev-mode cheats or the click-thread Serum Powder case, where R2 forbids blocking and the bridge answers `defaultIsYes` locally. The twelfth is `InputPassPriority.passPriority`'s floating-mana warning, which is not libgdx-guarded and which Forge itself runs on a game thread (`ThreadUtil.invokeInGameThread`, "must invoke in game thread so dialog can be shown on mobile game") — so it emits a real ask. It is gated on `FPref.UI_MANA_LOST_PROMPT`, whose default is `"false"`; `MtgTable --mana-lost-prompt` sets it in memory only. Measured body: `{prompt:"You have mana floating…", title:"Mana Floating", yesLabel:"OK", noLabel:"Cancel", defaultYes:true, card:null}`. | M5 |
| M25 | §5.2, §5.3 | **`text` is reachable through `getInteger`'s "Other…" option, and a numeric one must not be answered with a non-number.** `IGuiGame.showInputDialog` has two call sites in the jar (both macro systems) plus `AbstractGuiGame.getInteger(String,int,int,int)`, which offers the numbers `min…cutoff` as a `choose_list` with **one extra `kind:"text"` option**, and calls `showInputDialog` only if that option is picked. Its loop is `while (true)`: an answer that is not a number **inside its own `[min,max]`** re-asks forever, and the `text` body carries neither bound. So `null` — "cancel", `AbstractGuiGame.java:857` — is the only universally safe answer to a `numeric: true` ask, and a client that offers a free-text box must expect the same question again if the number is out of range. | M5 |
| M26 | §2.2 | **`useMana` and `clickAbility` now have a client that sends them, and two facts about `useMana` belong in the spec.** (1) `PlayerControllerHuman.useMana` is `if (inputQueue.getInput() instanceof InputPayMana ipm) ipm.useManaFromPool(mana)` — outside a mana payment the act is **silently ignored**: no exception, no `notice`, no state change. (2) Floating mana is **not** applied for you on an ordinary cast (`InputPayManaOfCostPayment` auto-pays from the pool only when the cost `isMandatory()`, CR 118.3c), so a pool pip is spent by this act or by the engine's own `Auto` button and by nothing else. `color` is a colour **name or letter** (`MagicColor.fromName` takes `white`…`colorless` and the single letters `w`…`c`; a **two-character** string is parsed as a *pair* of colours — **superseded in part by M30**, which records that this client sends the single letter and why that is safe). `clickAbility` carries **both** `cardId` and `abilityId`. | M5 |
| M27 | §5.2, §7 | **`sideboard` needs a multi-game match, and a multi-game match needs more than `setGamesPerMatch(2)`.** `IGuiGame.sideboard`'s one caller runs between games (`Match.java:278`) and returns early unless the deck has a sideboard. `MtgTable --games 2` supplies the match and `decks/sideboard-probe.dck` the sideboard, and the ask still does not fire: game 1's `over` carries **`matchOver: false`** — which §7 already models — but `WireGuiGame.emitOver` counts the session's `finished` latch down and sets `overEmitted`, after which `WireGuiGame.ask` returns `null` before emitting anything ("degrade, never wedge"). The wire is right and the *session* ends too early. Making it fire is M6's `HostedMatch.restartMatch` row. | M5 |

### 2026-09-11 — M3, the WebSocket transport

Applied while `WsTransport` was written. Every row is something the socket made
true that the file did not yet say; none of them bumps `v`, and none of them
changes a byte of any frame an M1 or M2 recording contains.

| # | Section | Change | Source |
|---|---|---|---|
| M10 | §1, §2.1, §2.4, §2.5, §8 | **`seq` is per *session*, not per connection, and a re-delivered frame keeps the one it was born with.** Contract (b) says a client that connects gets `hello_ok`, a full `state` and the current `input`; contract (c) says a reconnecting one gets all three again. `WsTransport` satisfies both by **re-delivering the cached frames verbatim** — same `seq`, same `t`, and **not written to the frame log a second time**, because §8's log records what the *session* produced and a repeat on a socket is a repeat, not a new frame. Three consequences a reader must not mistake for defects: a client connecting mid-game sees its first `state` at (say) `seq: 340` and **that gap is not a dropped frame**, it is the frames it was not connected for; a mid-stream `resync` re-sends the *last* `state`, whose `seq` is therefore lower than the frame before it; and §2.1's "one `hello_ok` per **game**, not per connection" still holds exactly — only one is ever *generated*, and a reconnecting client is handed a copy of that one. (The `input` half of a resync is the exception and is deliberate: it goes through `Transport.Inbound.onResync`, a real re-emission with a fresh `seq`, because that call carries the guard M3's doorstep test exists to keep fixed.) **Two server frames carry `seq: 0`**, which amendment M9 otherwise forbids: the `pong` that answers a keepalive, and the single `notice` a refused second connection receives before it is closed. Both belong to no session stream — the `pong` is not game state and the refused connection is not a session at all — and `seq: 0` is now reserved to say exactly that. A session frame still starts at 1. | M3 |
| M11 | §7, §8.4 | **Amendment M4 is softened: `over` follows the `state` that carries `gameOver` on every path where Forge published an outcome, and there is one path where it does not.** M4 said the frame is emitted "after the `state` that carries it" and the emitter did not guarantee it: `captureOutcome` reached `emitOver` through the event forwarder, which on a concede is routinely holding nothing to flush, so a run ended with `over` and no `gameOver` snapshot in front of it (measured: `fixtures/games/human-auto-42.jsonl` had 227 `state` frames and the same seed re-recorded gave 226). `captureOutcome` now emits that snapshot itself, on the game thread, when nothing else has — which is M4 as written. The exception is **a concede before the engine has asked this seat for anything**: `applyAct`'s pre-`inputSeen` guard ends the session without reaching Forge's game-over at all, so there is no outcome to snapshot and no thread it would be legal to build one on (the act is dispatched on the EDT). There, `over` carries `{winner: null, reason: null, matchOver: true}` and has no `gameOver` `state` in front of it, and the bridge says `OVER WITHOUT A gameOver STATE` on stderr. A client must not require the preceding snapshot. | M3 |
| M12 | §7, §8.4 | **`over` is terminal for the log as well as for the wire, and that is now enforced rather than observed.** Forge keeps pushing after the game ends — a concede's wind-down calls `afterGameEnd`, which calls `updateButtons` and `showPromptMessage` — and over a socket that put an empty `input` frame on the wire and on disk *after* `over` (`seq: 10` after `seq: 9`), which is precisely what §8.4's "the terminal frame of a session" and the gate's `tail -1` assertion say cannot happen. `WireGuiGame.emit` now drops every s2c frame after `over` (the `over` itself excepted), and `logC2s` drops every c2s line, with a stderr note. An `act` that arrives after `over` is still *dispatched*; it is only not written. | M3 |
| M13 | §2, §8.1 | **`GET /health` on the same port answers `200 ok`.** It is not a protocol frame and carries no game meaning: it exists because `scripts/play.sh` has to know the bridge is ready before it opens a browser, and a second port to wait on would be a second thing to get wrong. The server also prints `WS LISTENING ws://127.0.0.1:<port>/ws` on stdout once bound. **One client at a time**: a second connection receives one `notice` (`seq: 0`, per M10) and is then closed with WebSocket close code **4001** — an application code (≥ 4000) precisely so a browser can tell "the server said no" from "the network broke" and stop reconnecting. | M3 |

### 2026-09-11 — M3 fix pass

Applied after a second independent verifier played a real browser game, raced
the socket against a booting server, and read the threads a live server runs.
Every row is a rule this file *stated* and the code did not keep — two of them
stated as guarantees. Neither bumps `v`, and no committed recording changes.

| # | Section | Change | Source |
|---|---|---|---|
| M20 | §2.1, §2.5, M15 | **The pre-`hello_ok` window is closed from the INBOUND side too, and M15's "both halves" was two of three.** M15 suppressed the connect-time `resend`; it did nothing about a c2s frame that *arrives* in the window, and any such frame still produced an s2c frame **ahead of the handshake**. Reproduced twice, from scratch, by retrying the connect every 20 ms against a booting server: an `act` came back as `notice@seq1` then `hello_ok@seq2`, and a `resync` came back as `input@seq1` then `hello_ok@seq2` — which is byte for byte the inversion M15's own row quotes as the bug, and it is on disk as well as on the wire. It is reachable from this repo's own documented commands: `tools/ws-auto-play.mjs` and `tools/ws-smoke.mjs` both send `resync` from their `open` handler, and only the `/health` poll inside `tools/check-all.sh` and `scripts/play.sh` hid it. **Now: while no session exists, every inbound frame is dropped at the door with no reply** (the `dropped()` notice of M18 would itself be a pre-handshake frame), counted, and named on stderr (`WS PRE-SESSION c2s frame dropped`); the run summary prints `N read before the session existed`. `resend()` carries the same guard at its own top, so the invariant does not depend on `handshake()` being the only caller. Nothing is lost by the drop: `openView`'s own `hello_ok` + `state` + `input` reach that channel in order, which is all a `resync` in the window could have asked for. | M3 fix |
| M21 | §4.2 | **§4.2's wedged-game-thread banner needs two qualifiers, because as stated it fires on ordinary play.** The four clauses — OK disabled, `selectable` empty, no outstanding `ask`, game not over — are *also* the ordinary state of not holding priority, and the red "the signature of a wedged game thread" banner duly fired twice inside the first two turns of a real browser game: under Forge's own `Waiting for Forge AI…` at turn 1 upkeep, and under `Yielding until end of turn`. The rule gains **"and this seat holds priority"** (`state.priority === hello.you`) and **"and no s2c frame has arrived for ~2.5 s"**. Neither weakens a real wedge, which by definition persists and happens on your own priority; both are measured against the committed corpus (`web/test/wedge.test.ts`): the unqualified rule is true on 103–359 frames per human-seat recording, the priority clause removes 5–7% of them, and **the largest gap to the next frame after any flagged frame in the whole corpus is 121 ms** — because Forge's own `awaitNextInput()` re-pushes the prompt every 250 ms while it thinks, so a stream that is silent for 2.5 s really has stopped. | M3 fix |

### 2026-09-11 — M3 review pass

Applied after an independent verifier played the socket in a real browser and
read the logs it produced. Every row is something M3 shipped and the file did not
yet say; none bumps `v`, and only **M14** changes what a recording contains.

| # | Section | Change | Source |
|---|---|---|---|
| M14 | §2.3, §5.2, §5.3 | **An `ability_menu` can be asked with no game thread parked on it, and that is how a card with two or more abilities becomes playable at all.** `getAbilityToPlay` is reached from inside a click — `act: clickCard` → `IGameController.selectCard` → `InputPassPriority.onCardSelected` → `PlayerControllerHuman.getAbilityToPlay` — which runs on the virtual EDT, where R2 forbids blocking. The bridge therefore returned `null` there, and the effect was that **clicking such a card was a silent no-op**: no `state`, no `input`, not even a `notice`, because `selectCard` still returns `true`. Reproduced in Chrome on A.I.M. Scientists (`{3}{U}` cast + `K:TypeCycling:Basic:2` landcycling): `act clickCard 2` was the last line of the frame log and zero frames came back. The menu is now pushed **asynchronously** — a normal `ask` frame, same body, same `answer` shape — and the answer is applied with `IGameController.selectAbility`, which is the path `act: clickAbility` already used and which Forge implements as `InputPassPriority.selectAbility(sa)`: set `chosenSa`, `stop()`, i.e. exactly what a non-null return would have done. Three consequences for a reader. (1) It is **not re-delivered by `resync`**: it is not in `ReplyPool`, because there is nothing to unpark. Forge's input is still the one that asked, so a client that lost the menu clicks the card again. (2) Answering it `null` is "never mind" and is always legal (§5.4) — the game does not advance and nothing is spent. (3) Only the newest menu is live; a board is modal while an ask is outstanding, so there is never a second one to lose. The kind now has engine evidence for the first time: 7 asks in `fixtures/games/human-auto-42.jsonl`, each answered, each followed by Forge's own `Pay Mana Cost` prompt. **Amended by decision D22:** the body is built on a *second* `Game-n` thread from Forge's cached pool (`Game-0` is running the match), so the menu is stamped with the input generation it was raised for and is **abandoned without walking anything** if that generation moved — a fourth consequence for a reader, and a menu dropped that way is a click the player simply repeats. It fires on none of the five committed recordings. | M3 review |
| M15 | §2.1, §8.1 (M13) | **`GET /health` is the SESSION's readiness, not the port's: 503 `starting` until `hello_ok` exists, 200 `ok` after.** The port binds ~1.2 s before `openView` runs, and a client that connected in that window was sent nothing — `resend` found no cached handshake, sent no `state`, and then re-emitted an `input` at `seq: 1`. Measured with a client retrying the connect every 20 ms: `input@1`, `notice@2`, `notice@3`, `hello_ok@4`, which is §2.1's "immediately after the socket opens, before the first `state`" inverted. Both halves are closed: `/health` answers 503 until the session exists, and a socket that gets in during the window is handed **nothing** — `openView`'s own `hello_ok` + `state` + `input` reach it in order instead. `WS LISTENING` is printed after `startMatch` for the same reason, so the line and the readiness say the same thing. **"Both halves" was two of three, and this row overstated what shipped: see M20.** M15 suppressed only the connect-time `resend`; a c2s frame that *arrived* in the window was still dispatched and still answered, ahead of the handshake. | M3 review |
| M16 | §8.2 | **A client `resync` is written to the frame log; a re-delivered s2c frame deliberately is not.** §8 claimed "the whole frame stream, both directions", and a `resync` was the one c2s frame that vanished — so §8's record showed a re-emitted `input` with no cause, and an auditor could not tell a resync-driven re-emission from an engine-driven one. `Transport.Inbound.onResync` now writes a `{"type":"resync","body":{},"dir":"c2s"}` line, for an explicit `resync` frame **and** for the implicit one a (re)connect performs — it is the same request, made by connecting rather than by asking. The other direction stays as M10 left it: a frame re-delivered verbatim keeps its original `seq` and is **not** written a second time, because the log records what the session produced. | M3 review |
| M17 | §8.1 | **The session header may carry `recordedBy: "client"`.** Present only on a log a client wrote (`tools/ws-auto-play.mjs --log`); absent means the bridge wrote it. One reader uses it: `tools/check-redaction.mjs` relaxes the `seq` continuity rule — and nothing else — for a client log, because a client legitimately sees a frame re-delivered verbatim and real forward gaps (the frames it was not connected for), both M10. In a bridge log the same shapes are a dropped frame and stay a failure. Before this, running the repo's own checker over the repo's own documented `--log` output exited non-zero on five `gap or reorder` lines with every content assertion passing. | M3 review |
| M18 | §2.5, §6 | **A dropped c2s frame comes back as an out-of-band `notice`**, `seq: 0` like the `pong` and the refusal (M10): unparseable JSON, a frame that is not an object, an unknown `type`, an `act` with no `action`, an `answer` with no `askId`, a binary frame. M10 said there were exactly two `seq: 0` frames; there are now three kinds, and the rule they share is unchanged — they belong to no session stream and are not in the frame log. The server also **enforces** "one protocol frame per websocket message" rather than assuming it: a `WebSocketFrameAggregator` reassembles a fragmented message and the inbound frame size is stated (1 MB) instead of inheriting netty's 64 KB, which the 1 MB HTTP aggregator never covered — it bounds the handshake alone. | M3 review |
| M19 | §5.4, contract (c) | **`ReplyPool.cancelAll()` cancels what is parked; it does not latch the seat shut.** A WebSocket disconnect used to leave the pool closed until the next handshake, so every ask raised between the drop and the reconnect resolved **instantly** to its §5.4 default with no `answer` line at all — a browser refresh spent the player's decisions, and `NO_CLIENT_ASK_TIMEOUT_MS` (120 s) was unreachable after the first disconnect. The latch is now lifted the moment the socket goes away (never during shutdown), so an ask raised with nobody connected parks up to that cap and `resend` hands it to a client that comes back inside it. Measured: a client that refused ask `a1` (`order`, `timeoutMs: 0`) and dropped the socket saw `a2` (`choose_list`) raised 7 ms later with **`timeoutMs: 120000`**, park for 9 s, and be answered by the reconnecting client. Asks outstanding *at* the drop stay cancelled — those game threads have already degraded and cannot be un-degraded. **Provenance, corrected — and now committed.** The `a2 @ timeoutMs: 120000` measurement above was made with a throwaway client in a scratch directory, and for a while no committed tool reproduced it: an independent attempt (drop at `a1`, stay away 40 s) raised no ask at all in the window, because every ask in these decks is downstream of a client act. It is reproducible now, in the gate itself. `tools/ws-auto-play.mjs --refuse-first-ask` drops the socket on the first `ask` **frame**, and `tools/check-all.sh` step 10d asserts the server's `cancelling 1 pending ask(s)` and the absence of any `ASK TIMEOUT` line. At the gate's seed 13 the whole row is visible on disk in one file: `a1` (`order`, `timeoutMs: 0`) cancelled at the drop with **no `answer` line at all**, `a2` (`choose_list`) raised **7 ms later carrying `timeoutMs: 120000`**, parked for the 5 s nobody was connected, re-delivered verbatim to the reconnecting client and answered by it, and the game reached `over`. **Whether that window catches an ask is a property of the seed** (at seed 17 the next ask is raised after the reconnect and carries `timeoutMs: 0`), so step 10d *reports* that half instead of asserting it. `NO_CLIENT_ASK_TIMEOUT_MS` has still never **fired**: no ask has ever timed out, and the cap is a deadline that has been set and never reached. | M3 review |

### 2026-09-11 — M2 verification pass

Applied after an independent verifier replayed the M2 recordings and found the
spec disagreeing with them. Neither row bumps `v`; the first changes no bytes at
all and every byte of the second is one nobody has ever seen.

| # | Section | Change | Source |
|---|---|---|---|
| M8 | §4, §4.1, §4.2 | **`selectable` is the explicit selection set, not the set of clickable cards.** §4 called `selectable.cardIds` "the ids the engine will accept a click on" and §4.1 said "a card is clickable iff its id is in `state.input.selectable.cardIds`" — and **every human-seat recording falsifies it**. `InputPassPriority` never calls `setSelectables`, so the commonest interaction in Magic — clicking a card in your own hand at your own main phase — happens while `selectable` is `{"cardIds":[],"min":0,"max":0,"mode":"none"}`. Measured over the committed corpus: **78 of 86** `clickCard` acts in `human-auto-42.jsonl` name an id that is absent from the preceding `input.selectable.cardIds` (57/63 at seed 7, 48/51 at seed 2026, 96/96 and 49/49 in the two probes), all of them while `mode === "none"`, and they work — card 38 is clicked at a `Main phase, precombat` prompt with an empty `selectable` and is on the battlefield as `Island` four frames later. Reproduced by hand through the console. A board written to the old rule cannot play a land or cast a spell. `setSelectables` populates `selectable` for the *explicit* choices — targeting, discard, declare blockers, `InputSelectEntities` — and **Forge is the judge of every other click**: send the `clickCard` act and a rejected one comes back as `notice {level:"warn", title:"Not selectable"}` (5 of 152 notices at seed 42). Pinned by a test over the fixtures (`web/test/human-seat.test.ts`), because the next reader would otherwise re-derive the wrong rule from the spec. | M2 verification |
| M9 | §1, §8.1 | **A frame produced before the session header still gets a real `seq`.** `WireGuiGame.emit` wrote `seq: 0` for any frame emitted before `openView` — reachable through `applyAct`'s pre-`ready` `notice("warn","Not yet",…)` and through the `over` of a concede during the pre-game prompts — while §1 declares `seq` "monotonic, per direction, starting at 1" and says a gap means a dropped frame, so a client saw `0` and then `1`. `GameLog` now numbers such a frame, holds it (bounded), and writes it immediately after line 0 when the header arrives; a header that never arrives leaves the file empty and says so on stderr. No committed recording contains a `seq: 0`. | M2 verification |

### 2026-09-11 — M2 review pass

Applied after `WireGuiGame` shipped and a reviewer read the first human-seat
recordings. Every row is a rule the emitter could break and nothing was
watching; none of them bumps `v`.

| # | Section | Change | Source |
|---|---|---|---|
| M1 | §6 | **Both `notice` strings are gated.** They are Forge's own — `IGuiGame.message` / `showErrorDialog` — and `PlayerControllerHuman.notifyOfValue` passes `CardView.get(sa.getHostCard()).toString()`, i.e. `name (id)`, as the *title*. Measured in five independent recordings: `{"level":"info","title":"Thriving Isle (49)","text":"Forge AI picked White"}` one frame before card 49 was legitimately revealed, while the client's model held 49 as a hidden stub in the opponent's hand. Each string now goes through `Snap.sweepText` — §3.6 rule 1's sweep, in its third channel — and is `""` when it named a concealed id. `check-redaction.mjs` scans both and **fails**, not warns: it is our gate now, not Forge's phrasing. | M2 review |
| M2 | §5.2 | **Three declared nullabilities, one per end.** `assign_damage.attackerId` is `number \| null` (Forge's signature allows a null attacker and the emitter has a live path to it). `ability_menu.cardId` stays `number` — with no host card there is nothing to attach a menu to, so the bridge **skips the ask** instead of emitting a null. `text.initial` is always a string, `""` when Forge has none. The checker now asserts the exact key set and the declared type of every `ask` body, per kind. | M2 review |
| M3 | §8.1 | The session header gains **`transport`** (`"null" \| "auto" \| "console" \| "ws"`), **absent from an AI-vs-AI recording**, which has none. `--transport null` answers every ask with a literal `null` on purpose, and without this key a null-transport log is indistinguishable on disk from a wedge (A12). | M2 review |
| M4 | §7, §8.4 | **`over` is emitted by the outcome capture, not by `finishGame`.** Forge calls neither `finishGame` nor `afterGameEnd` reliably after a concede during the pre-game prompts: two of four identical console runs ended with a final `state` carrying `gameOver` and **no `over` frame at all**, and still exited 0. The frame is now emitted the instant the result exists, after the `state` that carries it, and the console's quit path exits non-zero when there is still no `over`. | M2 review |
| M5 | §3.2 | `abilities` is **`[]` in every recording to date, human-seat ones included**, and the milestone that fills it is **M5**, not M2. Report 06 §S10's route needs `Card.getAllPossibleAbilities`, which takes a `Card` and not a `CardView`, so `getAbilityToPlay`'s menu — the one place the array could come from today — only ever fires for the one-ability shortcut, which never reaches an ask. **The second half is superseded by M14**: the menu now fires as an asynchronous ask (7 of them in `human-auto-42.jsonl`). `abilities` is still `[]` in every recording and still M5's job. | M2 review |
| M6 | §8.4, §8.5 | **Human-seat recordings are described and listed.** §8.4 said `input` / `ask` / `notice` / `c2s` lines are absent from `fixtures/games/`; five of its files now carry them. | M2 review |
| M7 | §3.6 | The `blockers` event's **unblocked attackers map to themselves**. `PhaseHandler.java:728-736` builds the payload as `putAll(att, blockers.isEmpty() ? List.of(att) : blockers)`, so an unblocked attacker arrives as `{attackerId: n, blockerIds: [n]}`. That is Forge's encoding, faithfully relayed; a reader must not render it as "blocked by itself". `state.combat` is the authority on who blocked what. **Superseded by M52** (2026-10-01): the bridge now writes `[]` for an unblocked attacker; recordings made before it keep `[n]`, and a reader accepts both. | M2 review |

### 2026-09-11 — M1 hardening pass

Applied from `docs/research/06-hidden-information-audit.md` (the reveal-path
audit), `07-wireguigame-spec.md` (the M2 implementation spec),
`08-deck-card-coverage.md` (the deck review), `10-board-ui-spec.md` (M4) and
`11-engine-comfort-features.md` (M6). Every row changes a wire shape or a rule;
none of them bumps `v`, because all growth is inside a `body` (§1).

| # | Section | Change | Source |
|---|---|---|---|
| A | §3.3 | The redacted stub gains **`owner`**: exactly five keys `{id, zone, owner, controller, hidden}`. `canBeShownTo`'s `case Hand` compares *controllers* while the zone arrays are keyed by the zone's player, so without `owner` the client cannot say whose card it is when the two differ. | 06 §6.1 |
| B | §3.4 | **`library` becomes `{count, cards}`.** `cards` holds **only** library cards for which `canBeShownTo(viewer)` is true (a continuous `MayLookAt` static — Future Sight, Bolas's Citadel, Experimental Frenzy), never a redacted stub; `count` is the full library size. Without it those cards are invisible forever, because no blocking call ever fires for them. | 06 §0.4, §6.3 |
| C | §3.2 | A `Card` gains **`alt`** — `{name, manaCost, types, power, toughness}` read from `CardView.getAlternateState()`, emitted **only** when `cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)`, and `null` otherwise. Everything else on every card is read from `getCurrentState()` only. Power/toughness are `null` and `types` is `""` for a face-down card outside `battlefield`/`stack`. **This supersedes M1's eleven-key `faceDownHidden` shape:** a face-down card takes the ordinary full branch with Forge's own `name: ""` / `setCode: "???"`, so there is now **one** concealed shape, not two (§3.3, §9 invariant 4). `protocol.ts` still *reads* the old object; nothing writes one, and `check-redaction.mjs` fails a file that carries one. | 06 §1.3, §1.4, §6.2 |
| D | §3.6 | **Events:** rule 4's parenthetical was wrong — `GameEventZone` is *not* payload-less in 2.0.14 (it carries `card()` and `sa()`); it is dropped anyway. `GameEventAddLog`, `GameEventRandomLog`, `GameEventSubgameStart`/`End` and `GameEventAnteCardsSelected` join the drop list; `targetDescription()`, `stackDescription()`, `outcomeStrings()` and `matchSummary()` are banned at field level. Four kinds added: `scry`, `surveil`, `phased`, `foretold`. | 06 §5.3, §5.4 |
| E | §9 | **New invariant 10: a `hidden` card *replaces* the client's card object for that id — it never merges.** Forge card ids are stable across zone changes (`GameAction.java:207` → `CardCopyService.java:53-55`), so a reducer that merges by id keeps a name it learned during a legitimate reveal and renders it forever after. The worst remaining leak was in `reduce.ts`, not in `Snap.java`. | 06 §0.6, §6.10 |
| F | §4.3, §5 | **The `open_zones` ask kind is deleted.** `openZones`/`tempShowZones`/`hideZones`/`restoreOldZones` reveal nothing (`PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)`); they are EDT-side "open a floating zone panel" notifications. They become the non-blocking hint `input.openZones` and are answered locally. **Eleven ask kinds remain.** | 06 §3; 07 §0.2, §0.3 |
| G | §5 | The `ask` bodies are rewritten to report 07's amendments A1–A8: every option is `{id (ask-local index), label, kind, cardId?, playerId?, abilityId?, card?}`; `order`'s body is `{source, dest, min, max, …}` and its answer `{ordered, remember}` (Forge's `OrderResult` is `(List, boolean)`, not top/bottom) and is **never** `null`; `assign_damage`'s defender is option index 0; `assign_amount` keys may be colours; `choose_list` carries `reveal: true` when Forge's `min < 0`; `confirm`/`options` carry an optional `card`; `choose_entities.delayedReveal` has a shape. | 07 §1, §7 |
| H | §4 | `input` gains **`weak`** (`setWeaklySelectable`, needed for the M5 auto-tap preview) and **`focusCard`** — `setCard`/`setPanelSelection` are frequently pushed with a card that is *not in the snapshot* (surveil, `willPutCardOnTop`), so a bare `focusCardId` renders blank. | 06 §6.9; 07 A8 |
| I | §3.2 | A `Card` gains **`token`** (`CardView.isToken()` **[jar]**). There is no other way to know, and guessing from `setCode` would be a guess. | 10 §16.1 |
| J | §10 | New section: **planned additions (M3/M6), not yet emitted** — phase stops, the yield marker, undo depth, the stack's yield fields, `input.buttons.focus`, `input.selectable.playerIds`, and the `passPriority` / `yieldTo` / `newGame` / `setYield` acts. Also: **there is no `autoPay` act.** Undo, End Turn and Auto Pay arrive as the engine's own button *labels*. | 10 §16.1; 11 §0.1, §10 |
| K | §5.3 | `FModel.getPreferences().setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false")` at bootstrap (decision **D13**) is a *protocol-relevant* deviation: with the pref on, a scry 1 from Spy Kit routes the player's **entire library** into `manipulate_list`, and library searches are routed to a board-click input for cards that are not in the snapshot. | 08 §5; 06 §0.3 |
| L | all | §10's "notes from the M1 implementation" appendix has been folded into the sections it annotates (§3.1, §3.2, §3.3, §3.5, §3.6, §8). Nothing was dropped. | — |

---

## 1. Envelope

Every frame, both directions, is exactly this object:

```json
{ "v": 1, "seq": 128, "t": 1757600000123, "type": "state", "body": {} }
```

| Field | Type | Meaning |
|---|---|---|
| `v` | int | Protocol **major** version. The reducer **throws** on a mismatch. |
| `seq` | int | Monotonic counter, **per direction**, starting at 1. Gaps mean a dropped frame. |
| `t` | int | Epoch milliseconds when the frame was produced. |
| `type` | string | One of the ten types in §2. The reducer **throws** on an unknown value. |
| `body` | object | Type-specific. Always an object, never a scalar or array, never absent. |

All growth happens **inside `body`**, so an old frame log stays parseable by a
newer reducer. Adding a field to a `body` is not a `v` bump; removing one,
renaming one, or changing a type is.

**Unknown-frame policy.** The client never silently ignores a frame it does not
understand. An unknown `type`, an unknown `ask.kind`, or a `v` major mismatch
raises in `reduce()` and renders a loud red banner naming the dropped frame. Silent
ignores are how the two hand-written ends drift apart without anyone noticing.

---

## 2. Message types — 7 server→client, 4 client→server

| `type` | dir | blocks the game thread | emitted from | summary |
|---|---|---|---|---|
| `hello_ok` | s→c | no | any | handshake reply; sent once per **game** (§2.1) |
| `table` | s→c | no | main | **a table of two only** (amendment **M59**): who is at the table, whose decision it is, its clock, and whether this seat may claim the win (§2.6) |
| `state` | s→c | no | **game thread** | full redacted snapshot (§3) |
| `input` | s→c | no | **EDT** | prompt / buttons / selectables / hints (§4) |
| `ask` | s→c | **YES** | game thread | a blocking question (§5) |
| `notice` | s→c | no | any | a message to show the user (§6) |
| `over` | s→c | no | any | the game ended (§7) |
| `act` | c→s | — | — | an unsolicited user action |
| `answer` | c→s | — | — | exactly one per `ask` |
| `resync` | c→s | — | — | request a fresh `state` + `input` |
| `ping` / `pong` | both | no | — | keepalive |

**Design rule, copied verbatim from Forge (`ProtocolMethod.java:84-86`):
client→server messages never expect a reply.** All blocking is one-directional:
only the server ever waits, and only on an `ask`.

`state` replaces Forge's `setGameView` and every `update*` / `showCombat` call.
There is no separate "card updated" or "zone updated" message.

### 2.1 `hello_ok` (s→c)

Sent once, immediately after the socket opens, before the first `state`.

"Opens" means **after the session exists** (amendments **M15** and **M20**). The
port binds about a second before `openView` has a seat to hand out, and the
server closes that window on all three sides rather than sending a
handshake-less stream: `GET /health` answers **503 `starting`** until the frame
exists; a socket that connects in the window is sent nothing at all until
`openView`'s own `hello_ok`, `state` and `input` reach it, in that order; and a
**c2s frame sent in the window is dropped with no reply**, because an answer to
it — a `notice` for a rejected `act`, the `input` a `resync` re-emits — is an
s2c frame ahead of the handshake, which is exactly what this rule forbids. The
drop costs the client nothing: the three frames it would have asked for are
already on their way.

**An `input` frame is only ever delivered after the engine has asked, and a
client may treat its first `input` as the pre-input guard lifting** (amendment
**M42**). A connect and a `resync` (§2.4) re-deliver `hello_ok` and the last
`state` unconditionally, and the `input` **only once the engine has pushed one
for this game** — `WireGuiGame.inputSeen`, armed by Forge and by nothing else.
Before that there is no "current input" to re-send: the struct holds the empty
prompt and two disabled buttons the seat was constructed with, and delivering it
told the client the engine was asking for something while `applyAct` was still
dropping every act (`concede` excepted) with `notice {title: "Not yet"}`. So a
pre-input connect reads `hello_ok`, `state`, *silence* — and the silence is
honest. The rule is per **game**, not per session: a new `hello_ok` (**M38**)
re-arms the guard, and the next `input` is that game's first.

```json
{ "v": 1, "seq": 1, "t": 1757600000000, "type": "hello_ok",
  "body": {
    "gameId": "g1",
    "you": 0,
    "seed": 42,
    "gameNumber": 1,
    "gameCount": 3,
    "forgeVersion": "2.0.14",
    "forgeJarSha256": "3f6c…",
    "unsupportedCards": [],
    "players": [
      { "id": 0, "name": "Pacho",    "isAi": false },
      { "id": 1, "name": "Opponent", "isAi": true  }
    ],
    "match": {
      "yourDeck": { "name": "Pacho SHIELD (Marvel Super Heroes)",
                    "path": "decks/pacho-shield.dck", "cards": 40 },
      "aiDeck":   { "name": "Morph probe", "cards": 40 },
      "aiProfile": "Reckless",
      "games": 3
    }
  }}
```

`you` is the viewing player's `id` — the seat every redaction decision in this
stream was made against. `unsupportedCards` is whatever
`Match.prepareAllZones` → `revealUnsupported` complained about **for the viewing
seat's own deck**; an empty array is the happy case, and a non-empty one should
be shown to the user, not swallowed. It is the viewer's deck alone because each
entry is a literal card name: the union over both decks would put names from a
decklist this seat has never seen into the first frame the client reads.

**A match emits one `hello_ok` per game, not one per connection.**
`HostedMatch.endCurrentGame()` nulls the `Game`, clears the human controllers and
replaces every `PlayerView`, so **every id the client cached is invalid the moment
a new `hello_ok` arrives** (`HostedMatch.java:369-407`, report 11 §8.3). The
reducer resets its card map on `hello_ok`; it does not merge across games.

**`gameId` changes with it** (amendment **M38**). Game 1 keeps the session's id;
game *n* is `<gameId>-g<n>`, and that is also the directory of its own frame log
(§8). The two ids are how a reader tells "the client reconnected" (same `gameId`,
a **verbatim** re-delivery — §2.4) from "a new game started" (a different
`gameId`, a fresh `seq` series, new `players[]` objects behind the same names).
The seat, the seed and the jar hashes do not change; the players' **ids** may.

**`gameNumber` and `gameCount` say where in the match that is** (amendment
**M41**). `gameNumber` is 1-based and counts the games this *session* has begun,
so it is `1` for the first handshake and `n` for `<gameId>-g<n>`; `gameCount` is
`--games N`, i.e. what the match is played *to*. **Both are absent when
`--games` is 1**, which is most recordings in the corpus: a one-game session has
no "where in the match", the client prints nothing for it either, and an optional
key omitted when it says nothing is what the session header already does with
`policy` and `prefs` (M31). They exist because neither is derivable on the client: a client
that counts `hello_ok`s restarts at 1 on a page reload — a `resync` re-delivers
the **cached** handshake, not the ones it missed (§2.4) — and nothing on the wire
otherwise says how long the match is. A reader that predates M41 sees neither
key; `web/src/reduce.ts` falls back to its own count and says *Game 2* instead of
*Game 2 of 3*.

**`match` says what this match is** (amendment **M44**): each seat's deck by
name, the AI's profile, and how many games it is played to.

| key | type | meaning |
|---|---|---|
| `yourDeck` | `{name, path, cards}` | the **viewing seat's** deck: its `.dck` `Name=` (the file's base name when it has none), its repo-relative path (the same string §8.1's header carries for this seat) and its main-deck card count |
| `aiDeck` | `{name, cards}` | the **other seat's** deck: name and card count **only** — never `path`, `sha256` or a list (§8.1, hard rule 8). A mirror match names the same deck twice |
| `aiProfile` | string | the Forge AI profile the other seat plays under — one `.ai` file of `forge-home/res/ai/`; `Default` unless `--ai-profile` said otherwise |
| `games` | int ≥ 1 | `--games N`. **Always present**, unlike M41's `gameCount`, which is omitted for a one-game session. At a table of two: 1, or 3 for a game of the draft room's best of three (amendment **M60**) |
| `yourProfile` | string, **optional** | amendment **M47**: the **viewing seat's own** Forge AI profile. Only `mtgtable.RecordMatch` writes it (a spectated game), because only there is the viewing seat an AI; a stream whose `players[]` marks the viewer human must not carry it. Last in the object, so M44's keys keep their positions |
| `aiPolicy` | string, **optional** | amendment **M56**: who answers for the other seat — `plain`, `outlets` or `search`, `MtgTable --ai-policy` (D314, D333). Written by `MtgTable` only; absent means the stream does not say. Read with `aiPolicyOf()` |
| `opponentDeck` | `{name, cards}`, **a table of two** | amendment **M59**: the other PERSON's deck, name and card count only, exactly as `aiDeck`. At a table of two the object is exactly `{yourDeck, opponentDeck, opponent, games}` — no `aiDeck`, `aiProfile` or `aiPolicy` — and `games` is 1. Read with `seatMatchOf()` / `opponentIsHuman()` |
| `opponent` | `"human"`, **a table of two** | amendment **M59**: the other seat is a person (`MtgTable --humans 2`). Absent whenever it is the AI |
| `score` | `{you, opponent}`, **a best of three at a table of two** | amendment **M60**: the games each side won BEFORE this one, from the viewing seat's side; 0 or 1 each. Present exactly when `games` is 3, beside M41's `gameNumber` / `gameCount` |

**Optional, and absent from every recording made before 2026-09-27** — the whole
committed corpus — so a reader must treat a missing `match` as "this stream does
not say", never as an empty match. `mtgtable.RecordMatch` (AI vs AI) writes it
only when given a match setup (`--match`, `--profile`, `--ai-profile`; amendment
**M47**), from the viewing seat as `MtgTable` does, plus `yourProfile`; with no
setup flag it writes none, and a bare recording is what it always was. The name
is the deck's public name, and a deck named after a card announces that card;
the decklist itself is never on the wire.

A spectated recording's handshake, from seat 1's chair (`--seat 1`):

```json
"match": {
  "yourDeck": { "name": "Doom Legion (Marvel Super Heroes villains)",
                "path": "decks/doom-legion.dck", "cards": 40 },
  "aiDeck":   { "name": "Pacho SHIELD (Marvel Super Heroes)", "cards": 40 },
  "aiProfile": "Default",
  "games": 1,
  "yourProfile": "Reckless"
}
```

### 2.2 `act` (c→s)

An action the user took without being asked. Never expects a reply; its effect
arrives as the next `state` / `input`.

```json
{ "v": 1, "seq": 7, "t": 1757600000500, "type": "act",
  "body": { "action": "clickCard", "cardId": 41 } }
```

| `action` | extra body fields | maps to | from |
|---|---|---|---|
| `clickCard` | `cardId` | `IGameController.selectCard(cv, null, null)` — returns `boolean`; `false` → a `notice` | M2 |
| `clickPlayer` | `playerId` | `selectPlayer(pv, null)` | M2 |
| `clickAbility` | `cardId`, `abilityId` | `selectAbility(SpellAbilityView)` | M2 |
| `buttonOk` | — | `selectButtonOk()` | M2 |
| `buttonCancel` | — | `selectButtonCancel()` | M2 |
| `passPriority` | — | `IGameController.passPriority()` **[jar]** — genuinely distinct from `buttonOk`, and what "pass until something happens" needs (§10.3) | M6 |
| `concede` | — | `getOriginalGameControllers().forEach(IGameController::concede)` — **never** `AbstractGuiGame.concede()`, which runs a nested confirm dialog off the game thread. While the engine is running it is **carried forward**: the seat's outcome now, the game ended by the engine's own check a moment later, the seat asked nothing more (amendment **M48**) | M2 |
| `claimWin` | — | **a table of two only** (amendment **M59**, D403): the other seat has been away for `table.graceMs`, so the bridge concedes for them and this seat wins. Before that, or anywhere else, `notice {title: "Not yet"}` (or `"Unknown act"`) and nothing happens | M59 |
| `newGame` | `mode` = `"continue"` \| `"restart"` | `nextGameDecision(CONTINUE)` / `nextGameDecision(NEW)` → `HostedMatch.continueMatch()` / `restartMatch()`. **Only meaningful after an `over`**; a new `hello_ok` follows and the client drops its card map (§2.1). See below | M6 |
| `nextGame` | — | the M3 spelling of `newGame {mode:"continue"}`, kept as an alias | M3 |
| `undo` | — | `undoLastAction()`, gated on `canUndoLastAction` — read `state.undo` (§3.1) for whether it will do anything. **Applied only while the engine is waiting on this seat**, else `notice {title:"Not now"}` and no effect (amendment **M48**, below) | M6 |
| `alphaStrike` | — | `alphaStrike()` — only meaningful during `InputAttack` | M5 |
| `useMana` | `color` | `useMana(byte)`, `byte = MagicColor.fromName(...)`. **A `cardId` is a `clickCard`, not a `useMana`.** Like `undo`, applied only while the engine is waiting on this seat (**M48**) | M5 |
| `setPhaseStop` | `phase`, `turn` = `"own"` \| `"opp"`, `stop` | `WireGuiGame`'s own stop map — *not* `FPref`, and *not* `YieldController` — mirrored to the controller with `YieldUpdate.SkipPhase` so Forge's own `tryAutoPassNow()` fires. `turn` is relative to the **viewing seat**; `{playerId, phase, stop}` is still accepted (amendment **M33**) | M6 |
| `yieldTo` | `kind` = `"endOfTurn"` \| `"marker"` \| `"stack"` \| `"endStepOrOpponent"` (amendment **M64**); `phase` and an optional `turn` (`"own"`/`"opp"`, default own) for `marker` | `IGameController.sendYieldUpdate` with `SetAutoPassUntilEndOfTurn` / `AbstractGuiGame.handleYieldMarkerToggle` / `StackYield`; `endStepOrOpponent` is a `SetMarker` at the turn player's `END_OF_TURN` that the bridge ends the moment an opponent puts an item on the stack or attacks the seat (M64 is the definition). **Cancelled by `buttonCancel`**, which is the Cancel button `InputLockUI` labels while a yield runs | M6, M64 |
| `setYield` | `yieldKey`, `mode` = `"yes"` \| `"no"` \| `"clear"` | `setShouldAutoYield(key, on, isAbilityScope)` plus `setTriggerDecision(key, ACCEPT\|DECLINE\|ASK, …)`; `yieldKey` is the **bridge-minted handle** from `state.stack[]`, never Forge's own key | M6 |

**`newGame`, exactly** (amendment **M38**). It is answered by
`IGameController.nextGameDecision`, which votes on the `Match`'s event bus;
`HostedMatch.addNextGameDecision` acts once every human controller has voted, and
we have exactly one. `"continue"` is the next game of the same match
(`continueMatch()` = `endCurrentGame(); startGame()`), which is what an `over`
with `matchOver: false` invites; `"restart"` is a fresh match from the same rules
and players (`restartMatch()`), which is the only one of the two that means
anything after `matchOver: true`. **Both run on the EDT and both emit a new
`hello_ok`**, so a client that sends one waits for that frame and rebuilds from
it rather than trying to patch the board it has. An act sent while a game is
still running is dropped with a `notice`: a client that has not seen `over`
cannot know the engine is between games.

**Between games there is no channel to say "no" on**, because `emit` refuses
every non-`over` frame once `over` has gone out (§8.4). So a `newGame` the
server cannot take literally is **corrected rather than refused**, loudly on
stderr: an unknown `mode` reads as `"continue"`, and `"continue"` after
`matchOver: true` reads as `"restart"` — which is the only mode that can produce
another game, and "another game" is the only thing the act can have meant.

**A `newGame` sent the instant `over` arrives is queued, not raced** (amendment
**M45**). `over` goes out at the outcome, and Forge is still finishing the game
for a few milliseconds after it — on a loaded machine, longer. An act that
arrives in that window waits until the game's `GameEventGameFinished` has been
handled (stderr: `NEW GAME QUEUED`, then `NEW GAME RELEASED`) and is then applied
as above. The client needs to do nothing: it sends the act when it likes and
waits for the new `hello_ok`, as it always did.

**The session has to be there to continue into.** Nothing in the bridge starts a
game, so a process that has played the games it was asked for exits: a server
that means to offer New Game is started with `--games N` (play N, then exit) or
with `--keep-open` (after the last game, 30 s in which a connected client may
ask for another — and if it does, the session plays on). A `newGame` that
arrives after the process has gone is not a protocol error; the socket is
simply closed, which the client already handles (§2.4).

The server must tolerate any `act` arriving at any time, including one that is now
meaningless (a click on a card that just left the battlefield). The response to a
meaningless `act` is to drop it — optionally with a `notice` — never to crash and
never to block.

**Four acts are answered with a `state` the engine did not ask for** (M6).
"Its effect arrives as the next `state` / `input`" is automatic for every M2
act: a click makes the engine do something and something makes events. It is
**not** automatic for `setYield`, `setPhaseStop`, `yieldTo` and `undo`, whose
whole effect can be a field in a snapshot — `setYield` changes
`stack[].yielded` and produces no game event at all, and the engine is parked
waiting for this seat, so with no push the board would never show the toggle it
just asked for. The bridge therefore flushes a fresh `state` after each of those
four. A client needs no special handling: it is an ordinary snapshot arriving
slightly sooner than it otherwise would.

**`undo` and `useMana` wait for the engine, and `concede` is carried forward**
(amendment **M48**, decision **D136**). Every other act reaches Forge through its input protocol, which
resolves the input at the moment of the call and ignores one that has finished.
These two do not: `undo` pops the rules engine's undo stack and refunds what it
held, and `useMana` spends pool mana, both from the server's own thread. So each
is applied only while the engine is **parked on an input for this seat and
nothing else is running** — no ask outstanding, the input the act arrived under
still up, no mana ability being activated, no pass still with the engine — and
otherwise it is dropped with `notice {level:"warn", title:"Not now"}`, whose
`text` begins with the act's name. The act had **no effect**; nothing is queued.
The one moment a client is likely to meet this is the `state` a mana payment
flushes: it offers the undo of that payment (`undo.can: true`) while the engine
is already putting the spell on the stack, and an `undo` sent on it is refused —
it used to crash the engine. A client that wants the undo sends it again if a
later `state` still offers it; by then the engine is usually waiting on an
`input`, and if it is not, the answer is `Not now` again and nothing else.
`concede` writes the engine the same way but is never refused: sent while the
engine is running, the seat's outcome is recorded at once and the engine ends
the game at its own next check, so `over` follows as it always did; an
outstanding `ask` is answered by the server with its default, and the seat is
asked nothing more.

**`useMana`, exactly** (amendment **M26**). `IGameController.useMana(byte)` is

```java
// PlayerControllerHuman.java:2738-2742
public void useMana(final byte mana) {
    if (inputQueue.getInput() instanceof InputPayMana ipm) { ipm.useManaFromPool(mana); }
}
```

so the act is **silently ignored outside a mana payment** — no exception, no
`notice`, no state change. And floating mana is **not** applied for you:
`InputPayManaOfCostPayment` auto-pays from the pool only when the cost
`isMandatory()` (CR 118.3c), so on an ordinary cast a pool pip is spent by this
act or by pressing the engine's own `Auto` and by nothing else.

**When a client may offer the control** (amendment **M30**). M26 said "only while
the engine is asking for mana (an `input` whose OK button the engine labelled
`Auto`)", and that is the wrong rule for this repo: deciding what a control *does*
by matching an engine button label is exactly what CLAUDE.md §Scope forbids, and
the label is Forge's to change. There is no typed signal on the wire today —
`input` carries no `payingMana` — so **this client offers the pips whenever the
pool is non-empty and no `ask` is outstanding**, and says in the pip's own title
that the engine only accepts the act during a mana payment. A pip clicked outside
a payment puts an act on the wire that changes nothing, which is the documented
behaviour of the act and not a client bug. Adding `input.payingMana` (a one-line
emitter change reading `inputQueue.getInput() instanceof InputPayMana`) is an M6
row; when it lands, gate the control on it and delete this paragraph.

**The `color` value** (amendment **M30**). `MagicColor.fromName` accepts `white`,
`blue`, `black`, `red`, `green`, `colorless` **and the single letters
`w u b r g c`, case-insensitively** — verified in the 2.0.14 bytecode: it tests
`length == 2` on the raw string first (offsets 18–44) and only then lowercases and
switches on the single letters (offsets 45–257, returning 1/2/4/8/16/0). The
browser sends the **single letter** (`"U"`, `"R"` — `ManaColor` in `protocol.ts`
since M1); the console seat and `AutoTransport` send the full name. Both are
correct. A **two-character** string is parsed as a *pair* of colours, so `"WU"` is
not "white" and a client must never abbreviate to two letters.

`clickAbility` carries **both** `cardId` and `abilityId`; the bridge resolves the
ability id alone, and a client that sent only that would be relying on an emitter
detail rather than on the row above.

**There is no `autoPay` act, and there is no `endTurn` act.** Forge's own
`InputPassPriority` labels the *Cancel* button `Undo (n)` or `End Turn`, and
`InputPayMana` labels the *OK* button `Auto`
(`InputPassPriority.java:162-178`, `InputPayMana.java:376-395`; report 11 §0.1).
The client renders `input.buttons.*.label` **verbatim** and sends `buttonOk` /
`buttonCancel`. Inventing a parallel action for a button the engine already sends
is the "the board threw the engine's answer away" failure mode.

### 2.3 `answer` (c→s)

```json
{ "v": 1, "seq": 8, "t": 1757600001200, "type": "answer",
  "body": { "askId": "a17", "value": [0, 3] } }
```

Exactly one `answer` per `ask`. The shape of `value` is per-kind (§5.2, with the traps in §5.3). A second
`answer` for an already-completed `askId` is dropped with a `notice`; it is never
applied. **Answer values that reference options are ask-local indices** (§5.2),
not Forge ids.

### 2.4 `resync` (c→s)

```json
{ "v": 1, "seq": 9, "t": 1757600001300, "type": "resync", "body": {} }
```

The server replies with a fresh full `state` followed by the current `input`, and
re-sends any `ask` still outstanding. Used after a reconnect. Because `state` is a
full snapshot, resync is cheap and always correct.

**The `input` is the one conditional frame** (amendment **M42**, §2.1): it is
re-emitted only once the engine has pushed one for this game, so a `resync` sent
before the first prompt answers with `state` alone. A client must not wait on an
`input` that a `resync` it sent in that window would have produced — it waits on
the engine, which is what it was doing anyway.

"Fresh" means *current*, not *rebuilt*: the `state` and any outstanding `ask` are
the last ones the **game thread** produced, re-delivered verbatim with the `seq`
and `t` they were born with (amendment **M10** — a snapshot can only be built on
the game thread, and the socket's thread is not one). The `input` is genuinely
re-emitted and carries a new `seq`.

A `resync` **is written to the frame log** as a `c2s` line (§8.2, amendment
**M16**), including the implicit one a connect or a reconnect performs — without
it the re-emitted `input` appeared in the log with no cause at all.

### 2.5 `ping` / `pong`

`{"v":1,"seq":n,"t":…,"type":"ping","body":{}}` in either direction; the peer
replies `pong` with the same body. Keepalive only — it carries no game meaning and
the reducer ignores it. The server's `pong` carries **`seq: 0`** (amendment
**M10**): it belongs to no session stream, and numbering it would put a gap in
the one the client is counting.

**Three kinds of server frame carry `seq: 0`** and no others: this `pong`, the
single `notice` a refused second connection receives before it is closed (M13),
and the `notice` that answers a **dropped** c2s frame — unparseable JSON, a
non-object, an unknown `type`, an `act` with no `action`, an `answer` with no
`askId`, a binary frame (amendment **M18**). None is in the frame log; a session
frame still starts at 1.

None of the three ever reaches an observer on `/observe` (amendment **M50**),
and nothing an observer sends is answered at all — not even its `ping`.

**One drop gets no reply at all** (amendment **M20**): a frame that arrives
before the session exists. A `notice` for it would be a pre-handshake frame, and
§2.1's ordering outranks M18's "say so rather than nothing" — the server says so
on stderr and in the run summary instead.

### 2.6 `table` (s→c) — a table of two only

Amendment **M59** (D402, D403). Sent to each seat of `MtgTable --humans 2`
whenever any of it changes, by the bridge's main thread — so its `seq` sits in
the seat's own series like any frame — and cached and re-sent on a reconnect
right after the last `state`. A stream of one person against the AI never
carries one.

```json
{ "v": 1, "seq": 57, "t": 1757600123000, "type": "table",
  "body": {
    "you": 1,
    "seats": [
      { "seat": 0, "playerId": 0, "name": "Justin", "connected": true,  "deciding": true,
        "decisionDeadline": 1757600291000, "awaySince": null },
      { "seat": 1, "playerId": 1, "name": "Sam",    "connected": true,  "deciding": false,
        "decisionDeadline": null, "awaySince": null }
    ],
    "decisionTimeoutMs": 180000, "graceMs": 120000,
    "claimWinAt": null, "canClaimWin": false } }
```

- `deciding` — the engine is waiting on that seat: an `input` is up on its queue
  or an `ask` is parked. It is sampled five times a second, so a decision taken
  faster than that may never show; the other seat reads it as "Justin is
  thinking".
- `decisionDeadline` — when that seat's clock runs out, while it is connected
  and deciding with the clock on; `null` otherwise. Count down with
  `decisionDeadline - t`: the envelope's `t` is the same clock, so the client's
  own offset never matters.
- `awaySince` — since when that seat has had no socket; `null` while it has one.
  An away seat's decision waits for them (D403).
- `claimWinAt` / `canClaimWin` — **this** seat's right to claim the win: the
  other seat has been away since `awaySince`, and from `awaySince + graceMs` on
  `canClaimWin` is true and `act: claimWin` ends the game.

Exact keys, the names the only strings (`tools/check-redaction.mjs`).

---

## 3. The `state` body

A **full** redacted snapshot of the game as the viewing player is allowed to see
it. Built on the game thread only (`Snap.state()` opens with
`if (!ThreadUtil.isGameThread()) throw new IllegalStateException(...)`), emitted
from `handleGameEvents` and from inside value-returning `IGuiGame` methods.

```jsonc
{
  "gameId": "g1",
  "turn": 17,
  "round": 9,
  "phase": "COMBAT_DECLARE_BLOCKERS",
  "activePlayer": 0,
  "priority": 1,
  "gameOver": null,
  "players": [
    {
      "id": 0,
      "name": "Pacho",
      "isAi": false,
      "life": 17,
      "poison": 0,
      "counters": {},
      "manaPool": { "W": 1, "U": 0, "B": 0, "R": 0, "G": 0, "C": 0 },
      "phaseStops": { "own": ["MAIN1", "COMBAT_DECLARE_BLOCKERS", "MAIN2"],
                      "opp": ["COMBAT_BEGIN", "COMBAT_DECLARE_ATTACKERS",
                              "COMBAT_DECLARE_BLOCKERS", "END_OF_TURN"] },
      "zones": {
        "hand":        { "count": 5, "cards": [ /* Card */ ] },
        "battlefield": { "count": 4, "cards": [ /* Card */ ] },
        "graveyard":   { "count": 2, "cards": [ /* Card */ ] },
        "exile":       { "count": 0, "cards": [] },
        "command":     { "count": 0, "cards": [] },
        "library":     { "count": 21, "cards": [ /* Card — §3.4 */ ] }
      }
    }
  ],
  "stack": [
    { "id": 88, "sourceCardId": 41, "controller": 0, "text": "…",
      "targetCardIds": [17], "targetPlayerIds": [],
      "yieldKey": "y3", "isAbility": true, "isOptionalTrigger": false,
      "yielded": null }
  ],
  "stackCards": [ /* Card — the card behind each stack item, §3.3 */ ],
  "yield": null,
  "undo": { "can": false, "depth": 0 },
  "playable": null,
  "combat": {
    "bands": [
      { "attackerIds": [12],
        "defender": { "kind": "player", "id": 1 },
        "blockerIds": [31],
        "damageOrder": [31] }
    ]
  },
  "events": [ /* Event — §3.6 */ ]
}
```

### 3.1 Field notes

- **`turn` counts player turns, not rounds.** Report 04 measured 17
  `GameEventTurnBegan` events at turns 1..17 for a game whose log calls it "Turn
  9". Both are emitted: `round = ceil(turn / 2)`. **Label the UI accordingly** —
  showing `turn` where the player expects `round` is a bug report waiting to
  happen.
- `activePlayer` and `priority` are player `id`s, not array indices. They happen to
  coincide in a two-player game; do not rely on it.
- `phase` is the Forge phase name verbatim (`UPKEEP`, `MAIN1`,
  `COMBAT_DECLARE_ATTACKERS`, `COMBAT_DECLARE_BLOCKERS`, `MAIN2`, `END_OF_TURN`,
  `CLEANUP`, …), written with `PhaseType.name()`. The client maps it to a label;
  it never parses meaning out of it.
- **The first frames of a game have `turn: 0`, `round: 0` and `phase`,
  `activePlayer`, `priority` all `null`.** Two `state` frames are emitted before
  the first turn begins. `render(state)` must be total over that — a reducer that
  assumes a phase string crashes on frame 1 of every fixture.
- `gameOver` is `null` while the game is live. When it is set it mirrors the `over`
  body (§7), so a replay scrubbed to its last frame still renders the result.
- `counters` on a player is a map of counter name → int, keyed by
  `CounterType.getName()` — Forge's **display** name, so `+1/+1`, `-1/-1`,
  `Spore`, `Energy`, **not** the enum constant `P1P1` (amendment **M43**) — and
  **excludes poison**;
  `players[].poison` carries that, because the UI always shows it. On a `Card`,
  `counters` carries every type with no exclusion.
- `manaPool` always has all six keys, zeros included, so the renderer never
  branches on absence.
- Zone keys are exactly `hand`, `battlefield`, `graveyard`, `exile`, `command`,
  `library`. **Every zone object has `count` and `cards`**; `count` is
  authoritative and may exceed `cards.length` only for `library` (§3.4). There is
  no `flashback` zone: `PlayerView.getFlashback()` is a derived collection whose
  members keep their real zone and are already in `library` / `graveyard` /
  `exile` (report 06 §P6).
- `combat.bands` is `[]` outside combat, and `combat` is `null` outside a combat
  phase.
- `defender.kind` is `"player"` or `"card"` (planeswalkers, battles); `id` is a
  player id or a card id accordingly.
- `stack` is ordered **bottom first**; the last element is the top of the stack,
  the one that resolves next.
- **`stack[].id` is a different id space from card ids.** It is Forge's
  `StackItemView` id, an independent counter, and **they collide**: fixture
  `g1.jsonl` has a hidden card with `id: 56` in a hand and a stack item with
  `id: 56` on the stack in the same frame. Never put both in one map keyed by
  `id`, and never resolve a `stack[].id` against `players[].zones`.
- `stack[].sourceCardId` resolves against **`stackCards`** first and the player
  zones second: a spell on the stack is in `ZoneType.Stack`, which is not one of
  the six zones a player carries. In the committed fixtures, 7 of g1's 19 stack
  items pointed at an id that existed nowhere else in the same frame. See §3.3.
- **Every `defender` on the wire is nullable** — `combat.bands[].defender` and
  `events[].bands[].defender` both. A band whose defender the engine could not
  give us is still a band; dropping it would misreport the board. Guard it.
- `stack[].sourceCardId` and `stack[].controller` are likewise nullable for the
  same reason: a stack item is never dropped, so the reader guards instead. Every
  **event** field is the opposite — see the nullability rule in §3.6.
- `stack[].text` is **`""` when the viewer may not have it** (§3.6 rule 1). It is
  a string, never null; the client labels the absence and never prints an empty
  line.
- **`players[].phaseStops` is `{own, opp}`, two arrays of `PhaseType` names**
  (amendment **M32**). `own` is where the game stops while **this player** is the
  turn player; `opp` is where it stops while anybody else is. Both are
  server-owned: they are `WireGuiGame`'s own map, seeded once per game from
  `FPref.PHASES_HUMAN` / `PHASES_AI` and **never saved** — which is exactly what
  Forge's desktop does (`CMatchUI.java:1389-1441`). `UNTAP` is never in either
  (it has no preference and no priority pass). The client renders a toggle per
  cell and sends `act: setPhaseStop {phase, turn, stop}`; **it derives
  nothing** — the next `state` says what happened. In a two-player game
  `players[0].phaseStops.opp === players[1].phaseStops.own`, and that is not a
  bug: each seat's strip reads its own object.
- **`yield` is the active pass-to, or `null`** (amendment **M34**):
  `{kind: "endOfTurn" | "marker" | "stack" | "endStepOrOpponent", playerId, phase}`
  (the fourth kind is amendment **M64**: `playerId` the turn player, `phase`
  `"END_OF_TURN"`, ended early by an opponent's action — M64 says exactly which). `endOfTurn` and
  `stack` carry `playerId` (the yielding seat) and `phase: null`; `marker` carries
  the `(playerId, phase)` cell priority is being fast-forwarded to. Forge allows
  **one at a time** — setting any of the three clears the other two
  (`YieldController.java:127-158`) — so this is one object, not three flags.
  While it is non-null the engine is driving the prompt itself
  (`AbstractGuiGame.updateAutoPassPrompt`): `input.prompt` says *"Yielding
  until…"* in Forge's own words and `buttons.cancel` is enabled, which is how the
  yield is cancelled. There is no `cancelYield` act and an enabled Cancel is by
  construction not a wedge (§4.2, amendment M28).
- **`undo` is `{can, depth}`** (amendment **M35**), both read on the game thread
  with the rest of the snapshot. `can` is false whenever priority is not this
  seat's. `depth` is how many *mana abilities* are on the undo stack — Forge
  clears it at every phase change and whenever a non-undoable ability is
  activated — and `buttons.cancel.label` is independently `Undo (n)` whenever
  `InputPassPriority` is up, which is the same fact arriving through the button
  the engine labelled. If the two ever disagree, the label wins.
- **`playable` is what the seat may play from outside the battlefield, or
  `null`** (amendment **M61**, D413). At the seat's own priority it lists each
  of its own cards in `hand`, `graveyard`, `exile`, `command` or on top of its
  `library` that has a spell or ability Forge would play on a click now —
  `{cardId, zone, abilities: [{abilityId, label, isSpell}]}`, never empty
  `abilities` — and `[]` when there is none; off its priority, and in the frame
  an `ask` flushes, it is `null`. It is the engine's answer to "would a click
  do something", not to "can I pay for it": mana is never predicted. The board
  outlines these cards and sends `clickCard`; Forge asks its own `ability_menu`
  when a card has more than one. A seat writes the key on every frame; an
  AI-vs-AI recording never does.
- **`activatable` is what the seat may activate on the battlefield, or `null`**
  (amendment **M63**, D420). At the seat's own priority it lists each permanent
  the seat controls that has a non-mana ability Forge would activate on a click
  now — `{cardId, zone: "battlefield", abilities: [{abilityId, label, isSpell:
  false}]}`, never empty `abilities` — and `[]` when there is none; off its
  priority, and in the frame an `ask` flushes, it is `null`. Same rules as
  `playable`: mana never predicted, mana abilities left out, written on every
  frame of a seat and never by an AI-vs-AI recording. A separate key, so
  `playable` still means "outside the battlefield".
- **`stack[].yieldKey` is an opaque handle** (amendment **M36**) such as `"y3"`,
  or `null` for an item Forge gave no key. It is minted by the bridge, interned
  for the life of one game, and **must never be rendered**: Forge's own key is a
  card name plus an id plus rules text. `isAbility` and `isOptionalTrigger` come
  from `StackItemView` **[jar]** and gate the affordance (an *Always* control for
  an ability; *Always Yes* / *Always No* only for an optional trigger this seat
  controls). `yielded` is `"yes" | "no" | null`: the engine's standing answer for
  that key — `ACCEPT`, `DECLINE`, or nothing outstanding. A plain auto-yield with
  no trigger decision reads as `"yes"`, because that is what it does.

### 3.2 The `Card` shape

```jsonc
{
  "id": 41,
  "name": "Agent Phil Coulson",
  "setCode": "MSH",
  "manaCost": "{1}{W}",
  "types": "Legendary Creature - Human Spy Hero",
  "power": "2",
  "toughness": "2",
  "loyalty": null,
  "keywords": ["FIRST_STRIKE"],
  "damage": 0,
  "counters": { "+1/+1": 1 },
  "tapped": false,
  "sick": false,
  "attacking": false,
  "blocking": false,
  "faceDown": false,
  "token": false,
  "alt": null,
  "attachedToId": null,
  "attachmentIds": [],
  "controller": 0,
  "owner": 0,
  "zone": "battlefield",
  "abilities": [
    { "id": 7, "text": "{T}: …", "canPlay": true, "isSpell": false }
  ]
}
```

- `id` is Forge's `CardView` id and is **stable for the life of the game** — and
  across zone changes and face-down transitions (`GameAction.java:207` →
  `CardCopyService.java:53-55`). It is the only identity the client has; it is the
  key for React lists, for `act` bodies, and for `input.selectable.cardIds`. Its
  stability is exactly why invariant 10 (§9) exists.
- **`manaCost` is `null` for a card with no mana cost** — every land, every
  token. Never `""`, and never Forge's `ManaCost.NO_COST.toString()`, which is
  the literal string `"no cost"`: that is a label for a Swing table cell, not a
  value for a wire format. The bridge tests `ManaCost.isNoCost()`. A renderer
  that also accepts `""` or `"no cost"` is carrying a second source of truth;
  don't.
- `name` and `types` are always strings and never `null` (`""` if Forge has
  nothing), so a renderer never branches on their absence. `types` is Forge's
  `CardType.toString()` verbatim, which uses a plain **hyphen**:
  `"Legendary Creature - Human Hero"`. Do not expect an em dash and do not
  rewrite it.
- `power` / `toughness` / `loyalty` are **strings** (`"*"`, `"1+*"` are real
  values) or `null`. `loyalty` is `null` unless the card is a planeswalker —
  `CardStateView.getLoyalty()` returns the string `"0"` for everything else,
  which is noise. `power` / `toughness` are `null` unless the card is a creature
  or has a printed P/T.
- `keywords` (amendment **M49**) is the card's keyword abilities as the engine
  has them now — `CardStateView.getKeywords()` of the current state — each one a
  `forge.game.keyword.Keyword` constant spelled by `name()` (`"FLYING"`,
  `"FIRST_STRIKE"`, `"WARD"`), without its parameter, deduplicated, in Forge's
  order. A keyword Forge could not name (`Keyword.UNDEFINED`) is omitted, so the
  vocabulary is closed: never a display string, never rules text. `[]` for a card
  with none and for **every face-down card** (its keywords are withheld like its
  name). **Optional**: absent from every recording made before 2026-09-28, and read
  through `keywordsOf()`, never by testing for the key. The client maps a constant
  to an icon and a label; it never decides what a keyword does.
- `sick` is summoning sickness.
- `token` is `CardView.isToken()` **[jar]**. A token has no `art.json` entry and
  no collector number; the renderer draws its generated frame and says so.
- `abilities[].canPlay` is the engine's answer and the **only** basis for showing
  an ability as available. The client does **not** predict mana payability — Forge
  itself does no payability prediction for humans.
- `abilities[].id` is what `act: clickAbility` sends back. The client echoes the
  id; it never reconstructs an ability.
- **`abilities` is `[]` in every recording, human-seat ones included, and that
  is the true answer,** not a stub. The playable-ability list is not a property
  of `CardView`; Forge asks the GUI for it through `IGuiGame.getAbilityToPlay`,
  which fires only for a human seat **and only at the moment of a click** — and
  M2 measured it firing only as the one-ability shortcut, which is answered
  locally and never reaches an ask. **M5 is the milestone that fills the array**
  (amendment M5): report 06 §S10's route is `Card.getAllPossibleAbilities`,
  which takes a `Card` and not a `CardView`, so it needs a game-thread hop that
  does not exist yet. Until then, `act: clickAbility` is resolvable only against
  the `abilityId`s the last `ability_menu` filled, and a client must not expect
  a card object to carry its own playable list. (What a card outside the
  battlefield may do at the seat's priority is `state.playable`, amendment
  **M61**, and what a permanent may activate is `state.activatable`, amendment
  **M63** — not this array.)
- `setCode` is a string, or **`null` when Forge has no current state for the
  card** (`CardView.getCurrentState()` is a plain property read; the bridge
  writes `null` rather than inventing a set code). `setCode` plus `name` is what
  `art.ts` keys on. There is **no collector number** in the engine's view, so
  per-print art cannot be selected at runtime.
- `controller` and `owner` are numbers for every card in a player zone, where
  the bridge's fallback hint is that zone's own player and cannot be missing.
  **They may be `null` on `state.stackCards` and only there**, because the hint
  for a stack card is `StackItemView.getActivatingPlayer()` — the same nullable
  accessor that makes `stack[].controller` nullable. Never observed in nine
  recordings; declared because the emitter has a live path to it. (A redacted
  stub may also carry nulls — §3.3.)

#### Face-down cards and `alt`

The snapshot reads **`CardView.getCurrentState()` and nothing else**, with one
exception:

```jsonc
"alt": { "name": "Ashcloud Phoenix", "manaCost": "{2}{R}{R}",
         "types": "Creature - Phoenix", "power": "2", "toughness": "2" }
```

`alt` is read from `CardView.getAlternateState()` and is emitted **only** when
`cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)` — i.e. the viewer's own
morph / manifest / cloak / disguise, and a face-down card someone gave them
permission to look at. It is `null` in every other case, and the key is always
present. The permission case is real and common in the cube lab (D371): Gonti,
Lord of Luxury and Thief of Sanity exile an **opponent's** card face down and let
their controller look at (and cast) it, so that card — owned and controlled by
the opponent, in the opponent's `exile` — carries an `alt` for the seat whose
effect exiled it (Forge's `DigEffect`: `turnFaceDown(true)`, then
`addMayLookFaceDownExile(activator)`; `canFaceDownBeShownTo` opens with
`mayPlayerLook(viewer)`). Hideaway is the same for the seat's own card. In play
the face is the **controller's** only: the owner of a stolen face-down creature
does not see it. A face-down card in exile that nobody may look at (Bomat
Courier's "You can't look at it") is not a face-down full card at all but the
five-key stub, for its owner too: `canBeShownTo` answers a face-down card in
exile with the look permission alone. This is the single sanctioned use of `getAlternateState()` in the whole
bridge; `tools/lint-bridge.sh` rejects the identifier anywhere else, because for
an opponent's face-down permanent that accessor is the **real card** — name, mana
cost, type line, P/T and oracle text (`CardView.java:1104-1109`).

Two further rules for any card with `faceDown: true`:

- **Outside `battlefield` and `stack`, `power` and `toughness` are `null` and
  `types` is `""`.** The 2/2 Creature is `CardUtil.getFaceDownCharacteristic`'s
  artifact, not a rules fact; `CardStateView.getType()` already returns
  `CardType.EMPTY` there, `getPower()`/`getToughness()` do not, and Forge's own
  detail panel shows neither (`CardDetailUtil.java:156-180`).
- **A face-down card the viewer *controls* comes through with `name: ""` and
  `setCode: "???"`** — Forge's face-down characteristic verbatim
  (`CardUtil.getFaceDownCharacteristic`: no name, `CardEdition.UNKNOWN_CODE`, a
  2/2 Creature), not a missing value. Do not look art up for an empty name
  (`art.ts` already handles the miss) and do not print `"???"` as an edition.
  When `alt` is present, render that instead — before this amendment the viewer's
  own morph rendered as an unnamed 2/2 even though the rules let them see it.

### 3.3 One concealed shape, one concealed *face*, and `stackCards`

There is **one** card-serialisation function and it opens with **three** gates,
all of them Forge's own predicates or the caller's own knowledge. Gate 0 uses the
zone the caller already knows; gate 1 asks *may the viewer see this card at all*;
gate 2 asks *may the viewer see **which card** it is*.

Gates 0 and 1 produce the one concealed **shape**, the five-key stub. Gate 2
produces no shape at all: it decides whether the full branch may add the `alt`
block of §3.2. A face-down card the viewer may not identify is therefore an
ordinary `Card` whose *face* is missing — `name: ""`, `setCode: "???"`,
`alt: null` — which is exactly what every player at the table can see.

```java
static void card(JsonOut o, CardView cv, PlayerView me, String zoneHint, PlayerView ownerHint) {
    if (concealedByZoneHint(cv, me, zoneHint, ownerHint)         // gate 0
            || !cv.canBeShownTo(me)) {                            // gate 1
        /* {id, zone, owner, controller, hidden:true} -- the ONLY concealed shape */ return;
    }
    final boolean faceVisible =                                   // gate 2
            cv.isFaceDown() && cv.canFaceDownBeShownTo(me);
    /* full fields, always read from getCurrentState();
       "alt": faceVisible ? getAlternateState() : null            */
}
```

**Gate 0 — the zone the caller already knows.** `canBeShownTo` opens with
`ZoneType zone = getZone(); if (zone == null) { return true; } //cards outside
any zone are visible to all` (`CardView.java:625-626`). But the bridge does not
need to ask: `Snap` found the card by iterating `p.getHand()` /
`p.getBattlefield()` / `p.getLibrary()` / …, so it knows both the zone and whose
it is, and **it uses that `zoneHint` rather than `cv.getZone()`**. Without gate 0,
a `CardView` sitting in an opponent's hand whose `ZoneType` property happened to
be unset would take the **full-fields** branch and be emitted with its name beside
`zone: "hand"` from the hint. Never observed — the property is set in practice —
but a redaction decision must not depend on which property Forge happened to
populate. So: a card with no `ZoneType`, found in a **hand** or **library** that
is not the viewer's, takes the hidden branch unconditionally.

A `CardView` with no zone at all is also *logged* — `UNZONED <id>`, once per game
— because `CardView.java:626` is fail-open and every card the snapshot walks
should belong to a zone. LKI copies, `Card.getCardForUi(...)` views and the
synthetic pile headers of `chooseCardsPile`
(`new CardView(Integer.MIN_VALUE, null, "-- Pile 1 (3 cards) --")`) have a null
zone **and** a null controller, so the redacted branch tolerates a null
`zone`, `owner` and `controller` rather than dereferencing them.

**Gate 1 — `hidden`.** A card the viewer may not see at all is serialised as
**exactly this and nothing else**:

```json
{ "id": 42, "zone": "hand", "owner": 1, "controller": 1, "hidden": true }
```

No `name`, no `manaCost`, no `types`, no `power`, no `abilities`. **Five keys** —
`owner` joined the set in this amendment (report 06 §6.1) because
`canBeShownTo`'s `case Hand` compares `getController()` while the zone arrays are
keyed by the zone's player; when a control-change effect makes them differ, the
client would otherwise be guessing whose card it is looking at. Any sixth key on
a `hidden` object is a leak, and `tools/check-redaction.mjs` asserts the key set
exactly.

`canBeShownTo` encodes the whole rules answer, including `PlayerMayLook`
temporary reveals; report 04 verified it works from a pure event-bus path with no
human seat (viewer hand 3/3 visible, opponent hand 0/2). The bridge calls it with
the engine's own `PlayerView` for the viewing seat and **never** calls
`canBeShownToAny`, which returns `true` for an empty viewer set
(`CardView.java:616-620`), nor `AbstractGuiGame.mayView`, which has three
fail-open branches — one of them, `!hasLocalPlayers()`, is exactly the AI-vs-AI
recorder (`AbstractGuiGame.java:273-283`). `Snap.state()` **throws** when the
viewer is null rather than letting `canBeShownTo(null) == false` silently redact
the viewer's own hand into an unplayable game.

**Gate 2 — the face, not the object.** Gate 1 is not sufficient, and this is the
trap:
`CardView.canBeShownTo` returns `true` **unconditionally** for `Battlefield`,
`Stack`, `Graveyard` and `Command` — face down or not
(`CardView.java:629-638`) — because for a face-down permanent the *object* is
public and only its *face* is secret. A face-down permanent therefore sails
through gate 1. Forge's actual identity gate is the separate
`canFaceDownBeShownTo` (`CardView.java:688-704`), which its own
`AbstractGuiGame.mayFlip` and `AiBlockController` use, and which ends
`isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer)` —
the controller of a face-down permanent may see its face and nobody else may.
Without gate 2, whether a face-down permanent's identity leaks depends on which
`CardState` Forge happens to have selected rather than on a gate, and the
inconsistency is visible in one switch: a face-down card in **exile** is
correctly redacted by gate 1 while a face-down card on the **battlefield** is
not.

(`case Exile` is not simply "redacted", and the difference matters for foretell:
it falls through to `mayPlayerLook(viewer)`, which `Card.addMayLookFaceDownExile`
makes true for the card's own controller. So **your own foretold card passes gate
1 and fails gate 2** — a full card with `name: ""`, `types: ""`, null P/T and
`alt: null`, because `canFaceDownBeShownTo` ends
`isInZone(Battlefield, Stack, Sideboard)` and exile is not on that list. It is
the one card in the game you are allowed to look at and the protocol cannot name;
closing that is an M3 item, not a leak.)

A face-down permanent's *state* is public even though its identity is not —
everyone at the table can see that it is tapped, that it is attacking, that it
has a +1/+1 counter. **Failing gate 2 therefore does not produce a separate
object.** The card takes the full branch of §3.2, and what the gate withholds is
the face:

```json
{ "id": 213, "name": "", "setCode": "???", "manaCost": null, "types": "Creature",
  "power": "2", "toughness": "2", "loyalty": null, "keywords": [], "damage": 0, "counters": {},
  "tapped": false, "sick": true, "attacking": false, "blocking": true,
  "faceDown": true, "token": false, "alt": null, "attachedToId": null,
  "attachmentIds": [], "controller": 1, "owner": 1, "zone": "battlefield",
  "abilities": [] }
```

`name` is `""` and `setCode` is `"???"` because that is Forge's face-down
characteristic verbatim (`CardUtil.getFaceDownCharacteristic`: no name,
`CardEdition.UNKNOWN_CODE`, a 2/2 Creature) — **not** a value the bridge blanked
out. `alt` is `null` and `keywords` is `[]` (amendment M49, forced for every
face-down card as the name is), and that is the whole of gate 2's effect: the real card sits
one accessor away on `getAlternateState()` and nothing but the gate puts it on the
wire. Outside `battlefield`/`stack` the same card carries `types: ""` and null
`power`/`toughness`, for the reason given in §3.2 — a face-down card in exile has
no public body either.

A card whose identity is concealed therefore carries `hidden: true` (the stub) or
`faceDown: true` with `alt: null`. `protocol.ts`'s `isHidden` answers the first,
`altFace(card)` the second, and anything that must not leak an identity — an art
lookup, a name in a label — asks one of the two and cannot pick the wrong gate.
An empty `name` is never a card to look art up for.

**Superseded: the eleven-key `faceDownHidden` object (M1).** Before amendment P3
this section specified a *second* concealed shape for exactly this case:

```jsonc
// M1, SUPERSEDED by amendment P3. No emitter writes this; check-redaction.mjs
// fails any file that carries one; protocol.ts still reads one, so a stored
// pre-amendment log stays renderable.
{"id":47,"zone":"battlefield","controller":1,"faceDownHidden":true,"tapped":false,
 "attacking":false,"blocking":false,"damage":0,"counters":{},"power":"2","toughness":"2"}
```

It was dropped because it solved a problem Forge does not have while creating one
it does. What the pre-gate code actually put on the wire, measured on the same
seed, was this:

```jsonc
// pre-gate-2: the full-fields branch, because canBeShownTo is unconditionally
// true on the battlefield -- and note that it does NOT name the card
{"id":47,"name":"","setCode":"???","manaCost":null,"types":"Creature","power":"2",
 "toughness":"2","loyalty":null,"damage":0,"counters":{},"tapped":false,"sick":true,
 "attacking":false,"blocking":false,"faceDown":true,"attachedToId":null,
 "attachmentIds":[],"controller":1,"owner":1,"zone":"battlefield","abilities":[]}
```

In Forge 2.0.14 the old path did **not** leak a name: `getCurrentState()` of a
face-down permanent is already the face-down characteristic. What was wrong is
that this was an **accident of which `CardState` Forge happened to select**, not a
decision. P3 keeps the shape and adds the decision: the emitter reads
`getCurrentState()` *and nothing else*, and the single `getAlternateState()` call
in the whole bridge sits behind `isFaceDown() && canFaceDownBeShownTo(viewer)`
(`tools/lint-bridge.sh` enforces the "nothing else" half mechanically). A third
shape would have bought only a second thing for every renderer, every test and
every reader of this file to be total over.

**`state.stackCards`.** `ZoneType.Stack` is not one of the six zones a player
carries, so a spell on the stack is in no zone of the snapshot and
`stack[].sourceCardId` would resolve against nothing — leaving the renderer with
only `text` for the card that is *currently resolving*, the one moment in a game
a player most needs to see it. `stackCards` is the source card of every stack
item, through the same single gate:

- distinct card ids only, in stack order;
- a **spell**'s card has `zone: "stack"` and appears **only** here;
- an **activated ability**'s source is usually still on the battlefield and
  appears both here and in that zone — resolve by id and take the first hit;
- `[]` whenever the stack is empty, which is most frames.

There is deliberately no second path that could forget: `players[].zones`,
`stackCards` and every card inside an `ask` or `input` body (§4, §5) are all
callers of the one function.

**Forge does not redact on the wire.** `DeltaSyncManager.collectDeltas` ships
opponent hands and libraries and hides them client-side. The bridge sees
everything, so the default failure mode of any new serialisation code is leaking
it. Route every card through the one function.

**The open gap is closed.** Earlier revisions of this section carried an "open
gap, to close before M3 ships: enumerate every place `DelayedReveal` /
`tempShowZones` / `openZones` legitimately reveals library cards".
`docs/research/06-hidden-information-audit.md` §2 is that enumeration: **twelve
reveal paths**, each with its wire channel and its leak signature, and §1.2's
exhaustive grep of the three `mayLook` sets — `addMayLookAt`,
`addMayLookFaceDownExile`, `addMayLookTemp` — which is the complete dynamic-reveal
surface. Nothing else can turn a hidden card visible. The protocol consequences
are §3.4 (`library.cards`), §4.3 (`openZones` is not a question) and §5.3
(`delayedReveal`).

### 3.4 The library carries a count and the cards the viewer may see

```jsonc
"library": { "count": 21, "cards": [ /* only canBeShownTo(viewer) === true */ ] }
```

- `count` is the **full** library size, always.
- `cards` contains **only** library cards for which `cv.canBeShownTo(viewer)` is
  true, each serialised by the one function. It is **never** a redacted stub, and
  `cards.length <= count`. In an ordinary game it is `[]`.
- It is non-empty when a continuous `MayLookAt` static is running — Future Sight,
  Bolas's Citadel, Experimental Frenzy, Oracle of Mul Daya, Hidden Agenda
  (`StaticAbilityContinuous.java:925-926`, `CardFactoryUtil.java:182`). **None of
  those effects blocks**, so there is no `ask` for such a card to ride on, and
  under the old "library is always a count" rule it was invisible forever
  (report 06 §0.4, §P6).
- The emitter walks `PlayerView.getLibrary()` and discards the ~99% that fail the
  predicate. That is cheap and it is the only correct way to catch this path; do
  not shortcut it with "only the top card", which is not what the effects say.
- A library **search** (`DelayedReveal`, `tempShowCards`) delivers its cards
  through the `ask` body (§5), not through `state` — though a `state` emitted
  while the game thread is parked inside that call legitimately shows them too,
  because `tempShowCards` made `canBeShownTo` true. The frame after
  `endTempShowCards()` re-redacts them, which is why invariant 10 exists.

### 3.5 Snapshot, not delta

v1 sends full coalesced snapshots. Measured on the committed fixtures: **~9.8 KB
per frame**, 223–374 frames per game, 1.7–3.7 MB per recording. (The pre-M1
estimate of ~1.5 KB/frame was a minimal projection and was wrong by 6×; the real
number is accepted for v1 — these files gzip to 30–60 KB and only the test suite
reads them all.)

Coalescing is mandatory and comes free: `GameEventForwarder` flushes at 50 events
/ 500 ms / **whenever the `InputQueue` changes, i.e. immediately before the game
thread blocks for input** — exactly when the browser needs state. A measured 3,388
raw `GameEvent`s collapse to 605 observable states (1,528 of them `GameEventZone`);
naive per-event snapshots produced 5.3 MB.

**The `InputQueue` trigger does not exist in an AI-vs-AI game** — that observer is
registered only for a `PlayerControllerHuman` — which leaves the size and time
thresholds and collapses whole turns into single frames. `RecordMatch` therefore
registers a second subscriber that flushes the forwarder on `GameEventTurnPhase`,
`GameEventTurnBegan` and `GameEventGameOutcome`: the same boundaries a human's
input queue would have created. The result is roughly one frame per step.

If a large board ever feels slow, the upgrade is to diff **our own JSON tree** (RFC
7386 merge patch, ~80 lines in `Snap`) and add a `state_patch` type — a server-side
change only, because the reducer already applies snapshot and patch through one
path. It is explicitly **not** to couple to Forge's `TrackableProperty` dirty bits.

### 3.6 `events` — the transitions this snapshot reflects

*Added 2026-09-11 for the arena renderer (M7, `docs/ideas/arena-mode.md`). Ships in M1.*

Every `state` body carries an `events` array: the engine events whose effects this
snapshot **already reflects**, in engine order. One `state` frame is emitted per
`GameEventForwarder` flush (`IGuiGame.handleGameEvents(List<GameEvent>)`), and
`events` is that batch, mapped. It exists so a renderer can animate *transitions* —
a spell being cast, an attack, damage, a death — instead of diffing two snapshots.
The M1 text board shows it as a running log; the arena is its real consumer.

**Rules.**

1. **Events carry ids only — never card names, never oracle text.** The client
   resolves ids against `players[].zones` and `stack` of the *same frame*. An id
   that does not resolve is, by construction, a card the viewer may not see (it
   moved into a library or into the opponent's hand). That is correct, not a bug.

   The only string an event may carry is `cast.text`, the stack item's
   description — the same string as `stack[].text`, from the same
   `StackItemView`. **That string was once described here as "the stack item's
   public description". It is not public, and asserting that it was is how this
   spec shipped a false guarantee.** Forge redacts the *cast* of a morph
   (`"Morph - Creature 2/2"`) but not a *trigger* of one: a face-down creature's
   death trigger arrived as

   ```
   When Ashcloud Phoenix dies, return it to the battlefield face down under
   your control. [Zone Changer: Ashcloud Phoenix (75)]
   ```

   in the very frame in which card 75's identity was concealed from this seat — the name
   twice, and the id to join the two. So both strings go through **one**
   function, `Snap.stackText`, which applies three rules in order:

   1. **Gate.** If the source card's identity is concealed from this viewer —
      the same predicate `card()` uses (§3.3, all three gates) — the text is
      `""`.
   2. **Sweep.** If the raw text mentions `(<id>)` for *any* id this same frame
      concealed, the text is `""`. The gate alone is not sufficient: a trigger's
      `getSourceCard()` can be a last-known-information view of the card as it
      was when the trigger fired — face up, in the graveyard — while the live
      card of that id is already back on the battlefield face down, and that LKI
      view passes both of Forge's own gates. The id is what makes a concealed
      card identifiable, so the id is what is tested. **The sweep runs before the
      strip, on the raw text**, because stripping first would remove the id and
      hide the join.
   3. **Strip.** Forge appends an engine-debug annotation,
      `WrappedAbility.getStackDescription` →
      `" [" + Trigger.getImportantStackObjects(sa) + "]"`, whose payload is
      `Card.toString()`, i.e. `name (id)` — `[Zone Changer: …]`,
      `[Attacker: …]`, `[Card: …, Activator: …, SpellAbility: …]`. Nothing in the
      client consumes it, so it is removed from whatever survived the first two
      rules.

   **`text` is therefore `""` whenever the viewer may not have it.** It is
   always a string, never null; the client labels the absence
   (`stackTextLabel` → `(hidden)`) and renders the card itself from
   `stackCards`, which carries the concealed card's public half. In
   `fixtures/games/disjoint.jsonl` 10 of 41 engine strings are concealed this
   way.

   Three decisions behind that rule, recorded because each cost something:
   **a concealed text is `""`, not a synthesised description** (Forge's own
   `"Morph - Creature 2/2"` was the alternative and was legitimately public;
   `stackCards` already hands the renderer a better basis for a label than any
   string the bridge could invent, and the alternative is a second place that
   decides what may be shown); **the sweep tests ids, not names** (names are
   unbounded and localisable, and the guarantee then survives a Forge version
   that phrases the annotation differently); and **the checkers read text
   content** — `tools/check-redaction.mjs` and `web/test/fixtures.test.ts` had
   only ever asserted key sets, which is how a green suite shipped the leak.
   Re-running them against the pre-fix recording fails 2 id-joins and 13
   surviving annotations in one game.
2. Player references are player ids; card references are card ids. Where a target
   may be either, it is an entity ref: `{"kind":"player","id":1}` or
   `{"kind":"card","id":17}`.
3. **Unknown event kinds are ignored by the reducer** (logged, not thrown). Events
   are informational and never drive input, so this is the one place the
   unknown-frame policy of §1 does not apply. Adding a kind is not a `v` bump.
4. **Forge events not listed below are dropped, not emitted**, and four accessors
   are banned at field level.

   | dropped event | why |
   |---|---|
   | `GameEventZone` | a "a zone changed" ping. **It is not payload-less in 2.0.14** — **[jar]** shows `zoneType()`, `player()`, `mode()`, `card()`, `sa()` — but it is still dropped: `GameEventCardChangeZone` covers real movements, and `GameEventZone` also fires from `Player.updateFlashbackForView`, which would broadcast that a *library* card became activatable. |
   | `GameEventCombatChanged` / `GameEventCombatUpdate` | payload-less; `state.combat` carries the board. |
   | `GameEventManaPool`, `GameEventPlayerPriority` | `state` carries both. |
   | `GameEventAddLog`, `GameEventRandomLog` | free-form engine text built from `CardView.toString()` — `"X discards <card>"`, `CostReveal`, `ChangeZoneEffect`. Never redacted by Forge. **Do not build a game-log pane out of these.** |
   | `GameEventSubgameStart` / `GameEventSubgameEnd` | carry a whole `Game` object. |
   | `GameEventAnteCardsSelected` | ante is off; it names cards. |
   | `GameEventGameStarted` / `GameEventGameFinished` | `hello_ok` and `over` carry both. |
   | `GameEventCardDestroyed`, `GameEventTokenCreated`, `GameEventFlipCoin`, `GameEventRollDie`, `GameEventTurnEnded` | genuinely payload-less **[jar]**: a destroyed creature is visible as a `zone` event battlefield→graveyard, a new token as a `zone` event into battlefield with a previously unseen id. |

   **Banned accessors, never emitted from any event:**
   `GameEventSpellAbilityCast.targetDescription()` (joins `TargetChoices.toString()`
   and names targets, including library cards — `stack[].targetCardIds` carries
   the same information as ids), `GameEventSpellResolved.stackDescription()` (the
   ungated form of `stack[].text`), and
   `GameEventGameOutcome.outcomeStrings()` / `.matchSummary()` (free text). The
   bridge carries a `// not emitted:` comment beside each so a later reader does
   not "improve" the mapping.

5. **Missing ids drop the event; they never become `null`.** An event whose
   subject the engine could not give us — a `zone` with no card, a `cast` with no
   stack item, a `land` with no player — is **not emitted at all**, because an
   event with no card is of no use to a renderer and a `null` wearing a
   non-nullable type is how a renderer crashes three milestones later. The bridge
   counts every drop and `RecordMatch` prints the total (`events dropped`); the
   expected value is 0. Consequently **every `cardId` / `player` / `controller` /
   `defendingPlayer` / `target` / `counter` / `phase` in an event is non-null**,
   and the only nullable fields are nullable *by design*:

   | field | why it can be `null` |
   |---|---|
   | `zone.from` | a token created directly onto the battlefield came from nowhere |
   | `zone.to` | a token that ceases to exist goes nowhere |
   | `<zoneRef>.player` | a shared zone (the stack) has no owner |
   | `attackers.bands[].defender` | §3.1: every `defender` on the wire is nullable |
   | `attach.to` | `null` **is** the unattach event |
   | `damage.damageType` | player damage has no type enum in Forge 2.0.14 — only `GameEventCardDamaged` has one. The key is **always written**, as `null` for player damage, so the shape of a `damage` event does not depend on its target |
   | `poison.sourcePlayer` | poison from an effect with no player source |
   | `outcome.winner` | `null` is a draw |

   Anything else arriving as `null` is drift. `tools/check-redaction.mjs` asserts
   the exact key set and the runtime type of every key of every event against
   this table, so that class of drift fails in CI instead of in a browser tab.

**Implementation note (Java).** In the 2.0.14 jar the `GameEvent` classes are
records whose accessors already return *views* (`CardView`, `PlayerView`,
`ZoneView`, `StackItemView`, `GameEntityView`), e.g.
`GameEventCardChangeZone.card()/from()/to()`,
`GameEventPlayerDamaged.target()/source()/amount()/combat()/infect()`,
`GameEventAttackersDeclared.player()/attackersMap()`,
`GameEventBlockersDeclared.defendingPlayer()/blockers()`. Map them with an
`instanceof` chain on the game thread inside `handleGameEvents`; do not implement
`IGameEventVisitor` (sixty methods). Confirm each accessor with `javap` before use.
Every enum goes on the wire as `.name()`, never `toString()`.

```jsonc
"events": [
  { "kind": "cast",      "stackId": 88, "cardId": 41, "controller": 0, "text": "Quake, Agent of S.H.I.E.L.D. — …" },
  { "kind": "zone",      "cardId": 41, "from": { "zone": "hand", "player": 0 }, "to": { "zone": "stack", "player": null } },
  { "kind": "attackers", "player": 0, "bands": [ { "defender": { "kind": "player", "id": 1 }, "attackerIds": [12, 14] } ] },
  { "kind": "damage",    "target": { "kind": "player", "id": 1 }, "sourceCardId": 12, "amount": 3, "combat": true, "damageType": null },
  { "kind": "life",      "player": 1, "from": 20, "to": 17 }
]
```

| `kind` | Forge event | body (besides `kind`) |
|---|---|---|
| `zone` | `GameEventCardChangeZone` | `cardId`, `from:{zone,player}` **or `null`**, `to:{zone,player}` **or `null`** — `zone` is the `ZoneType` name lowercased (`hand`, `library`, `battlefield`, `graveyard`, `exile`, `stack`, `command`, …); `player` is the zone owner's id, `null` for shared zones. **`from` is `null` when the card did not come from a zone** (a token created directly onto the battlefield) and **`to` is `null` when it went to no zone** (a token ceasing to exist). Both occur in every recorded fixture — g1 has 8 such events, g2 4, g3 6 — so a reader that dereferences `from.zone` unguarded crashes on the primary fixture. |
| `cast` | `GameEventSpellAbilityCast` | `stackId`, `cardId`, `controller`, `text` — the same gated string as `stack[].text`, `""` when concealed (rule 1). **`targetDescription()` is never emitted.** |
| `resolved` | `GameEventSpellResolved` | `cardId`, `fizzled`. **`stackDescription()` is never emitted.** |
| `unstacked` | `GameEventSpellRemovedFromStack` | `cardId` — left the stack without resolving (countered, etc.) |
| `attackers` | `GameEventAttackersDeclared` | `player`, `bands:[{defender:{kind,id}` or `null`, `attackerIds:[]}]` |
| `blockers` | `GameEventBlockersDeclared` | `defendingPlayer`, `blocks:[{attackerId, blockerIds:[]}]` — one entry per attacker, blocked or not. **An unblocked attacker has `blockerIds: []`** (amendment **M52**), exactly as its `state.combat` band does. Forge builds the payload with the attacker itself as a "no blockers" sentinel (`PhaseHandler.java:728-736`: `putAll(att, blockers.isEmpty() ? List.of(att) : blockers)`), and the bridge drops it, since a creature never blocks itself. **A recording made before M52 — every committed fixture — still carries the sentinel** (`{attackerId: 12, blockerIds: [12]}`, amendment M7): read it as `[]`, render it as "unblocked", never as "blocked by itself". `state.combat` stays the authority on who blocked what. |
| `damage` | `GameEventPlayerDamaged`, `GameEventCardDamaged` | `target:{kind,id}`, `sourceCardId`, `amount`, `combat` (players: `combat()`; cards: `true` iff `type().name()` contains `Combat`), `damageType` (the enum name for cards, `null` for players) |
| `life` | `GameEventPlayerLivesChanged` | `player`, `from`, `to` |
| `poison` | `GameEventPlayerPoisoned` | `player`, `sourcePlayer`, `from`, `amount` |
| `tap` | `GameEventCardTapped` | `cardId`, `tapped` |
| `counters` | `GameEventCardCounters` | `cardId`, `counter` — **Forge's display name**, `CounterType.getName()`: `+1/+1`, `-1/-1`, `Spore`, **never** the enum constant `P1P1` (amendment **M43**; every one of the 1,316 counter values in `fixtures/` is a display name) — `from`, `to`. Treat it as an opaque string. A consumer that needs an identifier-shaped token normalises it itself, as `counterToken()` in `web/src/arena/cues/types.ts` does for the arena's §7.3 selector grammar. |
| `attach` | `GameEventCardAttachment` | `cardId`, `to:{kind,id}` or `null` when unattached |
| `sacrificed` | `GameEventCardSacrificed` | `cardId` |
| `land` | `GameEventLandPlayed` | `player`, `cardId` |
| `stats` | `GameEventCardStatsChanged` | `cardIds:[]`, `transform` |
| `turn` | `GameEventTurnBegan` | `player`, `turn` (player-turn number, see §3.1) |
| `phase` | `GameEventTurnPhase` | `player`, `phase` (the `PhaseType` name, same vocabulary as `state.phase`) |
| `combat_end` | `GameEventCombatEnded` | `attackerIds:[]`, `blockerIds:[]` |
| `shuffle` | `GameEventShuffle` | `player` |
| `mulligan` | `GameEventMulligan` | `player` |
| `scry` | `GameEventScry` | `player`, `toTop`, `toBottom` — **counts only**, genuinely public. `javap`: `GameEventScry(PlayerView, int, int)` with `player()`, `toTop()`, `toBottom()` |
| `surveil` | `GameEventSurveil` | `player`, `toLibrary`, `toGraveyard` — same. `javap`: `GameEventSurveil(PlayerView, int, int)` |
| `phased` | `GameEventCardPhased` | `cardId`, `phasedOut` (the record's `phaseState()`) — battlefield-public, and phasing is otherwise invisible in `state` |
| `foretold` | `GameEventCardForetold` | `player` — **the event carries no card at all** (`javap`: `GameEventCardForetold(PlayerView)`, accessor `activatingPlayer()`), which makes it safe by construction. It is the only cue that a foretell happened; the face-down card itself appears in `exile` as a stub |
| `outcome` | `GameEventGameOutcome` | `winner` (player id, or `null` for a draw — map `winningPlayerName()` to an id by name), `lastTurn`. **`outcomeStrings()` and `matchSummary()` are never emitted.** |

`GameEventTurnPhase` and `GameEventTurnBegan` fire on every step, so `events` is
rarely empty; a frame with only `phase` events is normal and animates nothing.

---

## 4. The `input` body

What the engine currently wants from the player. Assembled from Forge's
`showPromptMessage` + `updateButtons` + `setSelectables` / `setHighlighted` /
`setWeaklySelectable` / `setCard` / `tempShowZones`, and therefore emitted **from
the EDT**, not the game thread.

```json
{ "v": 1, "seq": 129, "t": 1757600000200, "type": "input",
  "body": {
    "prompt": "Declare blockers",
    "focusCardId": null,
    "focusCard": null,
    "buttons": {
      "ok":     { "label": "OK",     "enabled": true  },
      "cancel": { "label": "Cancel", "enabled": false },
      "focus":  "ok"
    },
    "selectable": { "cardIds": [31, 32], "min": 0, "max": 2, "mode": "cards",
                    "playerIds": [], "chosen": { "cardIds": [31], "playerIds": [], "blocks": [], "attacks": [] } },
    "highlighted": [],
    "weak": [],
    "openZones": []
  }}
```

| Field | Meaning |
|---|---|
| `prompt` | The engine's own prompt text. Rendered verbatim; never rewritten. |
| `focusCardId` | Card id the prompt is about, or `null`. |
| `focusCard` | **The serialised card** for `focusCardId`, or `null`. `IGuiGame.setCard` / `setPanelSelection` are frequently pushed with a card that is **not in the snapshot** — a library card during surveil or `willPutCardOnTop` — so an id alone renders blank. Produced by the one serialising function (§3.3). |
| `buttons.ok` / `.cancel` | Label and enabled flag, straight from `updateButtons`. **Render the label verbatim**: `Undo (2)`, `End Turn` and `Auto` are engine labels, not client features (§2.2). |
| `buttons.focus` | `"ok"` \| `"cancel"` \| `null` — `updateButtons`' sixth argument, `focus1` **[jar]**, which says which button the desktop would have focused (amendment **M39**). **Space activates the focused button**, and that is the whole reason the field exists: "space = OK" is not a Forge shortcut, it is Swing button focus. A client binds Space to `buttonOk` / `buttonCancel` per this field and to `passPriority` when it is `null`. **`focus1` is a `boolean`** — it names button 1, the OK button — so this emitter writes `"ok"` or `null` and never `"cancel"`. The type keeps the third value because a client must not assume the engine can only focus one of the two buttons, and because `"cancel"` is the honest encoding the day `updateButtons` grows a `focus2`. |
| `selectable.cardIds` | **The explicit selection set** — the ids `setSelectables` named for a *choice*: targeting, discard, declare blockers, `InputSelectEntities`. It is **not** the set of cards the engine will accept a click on (amendment M8): `InputPassPriority` never calls `setSelectables`, so at your own main phase this is `[]` and your hand is still clickable. May contain an id that is **not** in this frame's `state` (a library card that is a legal target): render nothing for it, never throw. |
| `selectable.min` / `.max` | How many, for that explicit choice. Both `0` when there is none. |
| `selectable.mode` | `"cards"` \| `"players"` \| `"none"`. `"none"` means *no explicit selection is outstanding* — not "nothing is clickable". Computed from `cardIds` alone (`"players"` is not emitted): a player-only choice reads `"none"`, and `playerIds` (M66) is where it shows. |
| `selectable.playerIds` | Amendment **M66**: the players a `clickPlayer` would be taken for in this input, `[]` when a player click does nothing here, `null` when the bridge cannot say; absent before M66. See M66 for each input's rule. |
| `selectable.chosen` | Amendment **M65**: `{cardIds, playerIds, blocks, attacks}`, what the seat has already chosen in this input — targets, list entries, or a declaration's blockers / attackers (which `state.combat` does not show until the declaration ends); `null` when no selection is up or the bridge cannot say; absent before M65. |
| `highlighted` | Card ids to emphasise without making clickable. |
| `weak` | Card ids from `setWeaklySelectable` — Forge's "this would be tapped by Auto" hint. It is a multiset on Forge's side (a count of 2 means *Auto would tap it*); the wire carries the distinct ids. `[]` until M5. |
| `openZones` | Zone panels the engine asked the client to open: `[{playerId, zones:["graveyard","exile"]}]`. A **hint**, not a question — see §4.3. `[]` most of the time. |

### 4.1 `input` is a separate frame but not separate client state

A client that correlates a prompt frame against a board frame is where "the board
threw the engine's answer away" bugs live. But prompt and buttons arrive on the
EDT while the snapshot must be built on the game thread, so they cannot share one
frame without fighting the thread model.

Resolution: **two frames on the wire, one object in the client.** `reduce()` merges
`input` into the single `GameState`, so `render(state)` is total and the view never
sees two streams. A button is enabled iff the engine said so. **The client computes
legality for nothing** — not mana payability, not targeting, not stops.

**What is clickable (amendment M8).** This paragraph used to say "a card is
clickable iff its id is in `state.input.selectable.cardIds`", and the recordings
say otherwise:

- when `selectable.mode !== "none"` the engine is asking for an **explicit
  selection** and `cardIds` is that set: outline those cards, and count the
  clicks against `min`/`max`;
- when `selectable.mode === "none"` and no `ask` is outstanding, the seat has
  **priority** and the viewer's own cards are clickable anyway — that is
  `InputPassPriority`, which sets a prompt and two buttons and never calls
  `setSelectables`. 78 of the 86 `clickCard` acts in `human-auto-42.jsonl` are
  this case.

**Forge is the judge.** The client does not decide which of its own cards may be
clicked (that would be rules logic, invariant 8); it sends `act: clickCard` and
Forge answers. A click the engine will not take comes back as
`notice {level:"warn", title:"Not selectable", text:"card <id> cannot be selected
now"}` — `IGameController.selectCard` returning `false` — and nothing else
happens. A board that greys out everything outside `selectable.cardIds` cannot
play a land.

### 4.2 Invariant: disabled OK means "click a card"

**`updateButtons` with `ok.enabled === false` means the engine wants a card click,
not a button press.** Confirmed live in report 02 §4.7 — this is exactly what
stalls a button-only client at the discard step.

A UI that only renders buttons will appear to hang with no error. Whenever
`selectable.cardIds` is non-empty, the cards are the interaction.

**The converse does not hold** (amendment M8). An empty `selectable.cardIds` does
*not* mean the buttons are the only interaction: it is also the ordinary state of
having priority, where OK is enabled (`OK`, `End Turn`, `Auto` — the engine's own
labels) *and* every card in your hand is clickable.

The diagnostic that matters is narrower — and it needs **seven** clauses, not
four (amendments **M21** and **M28**). **OK disabled, _Cancel disabled_,
`selectable` empty, no outstanding `ask`, game not over, _this seat holds
priority_, and _no s2c frame for ~2.5 s_** is the signature of a wedged game
thread and must be rendered loudly (`docs/research/10-board-ui-spec.md` §5.2).
The first four on their own are the ordinary state of *not holding priority*, of
*waiting for a push that is already in flight*, and of *a cast you cannot pay
for*: stated as four, the banner fired twice in the first two turns of the first
real browser game, under Forge's own `Waiting for Forge AI…` and `Yielding until
end of turn`; stated as six, it fired on `Pay Mana Cost: {2}{W}` with an enabled
`Cancel` beside it. A wedge persists, happens on your own priority, and is not
offering you a labelled way out, so no qualifier can hide one; the corpus
measurements are in `web/test/wedge.test.ts` (worst gap after a flagged frame,
over nine human-seat recordings: **58 ms**, because `awaitNextInput()` re-pushes
every 250 ms; and the Cancel clause takes 311 flagged frames to 40 in
`human-auto-42.jsonl` while still flagging nothing that stays silent). A replay
renders no banner at all: there is no thread there to be wedged.

### 4.3 `openZones` is a hint, and was never a question

`openZones`, `tempShowZones`, `hideZones` and `restoreOldZones` **reveal
nothing**. `PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)` **[jar]** — there
is no card accessor of any kind on it — and the desktop implementation only opens
and closes floating zone panels (`CMatchUI.java:584-625, 1362-1386`), each of
which then renders its cards through Forge's own `mayView`. Every actual reveal
goes through `PlayerControllerHuman.tempShow*` → `Card.addMayLookTemp` →
`TrackableProperty.PlayerMayLook` → `canBeShownTo`, i.e. through `state` (§3.3).

They are also called **on the EDT**
(`InputSelectEntitiesFromList.java:65-68`, `PlayerControllerHuman.java:955-959`),
where blocking is forbidden: a value-returning method that parks the EDT stalls
every prompt with no error. So the bridge answers them locally and immediately —
`tempShowZones` echoes its argument (that value is only the token `hideZones`
will be handed back), `openZones` builds the same list `CMatchUI` builds, minus
Battlefield / Hand / Stack — and pushes `input.openZones` as a non-blocking hint.

**The `open_zones` ask kind is deleted** (report 06 §3, report 07 §0.2). Eleven
kinds remain.

---

## 5. The `ask` body — the blocking calls

**An `ask` blocks the Forge game thread until an `answer` arrives.** This is the
only place the server waits.

```json
{ "v": 1, "seq": 130, "t": 1757600000300, "type": "ask",
  "body": { "askId": "a17", "kind": "choose_list", "timeoutMs": 120000,
            "prompt": "Choose a card to discard",
            "options": [ { "id": 0, "label": "Agent Phil Coulson", "kind": "card",
                           "cardId": 41, "card": { /* Card */ } },
                         { "id": 1, "label": "Quantum Reduction", "kind": "card",
                           "cardId": 42, "card": { /* Card */ } } ],
            "min": 1, "max": 1, "reveal": false } }
```

`askId` is unique for the life of the connection. `timeoutMs` is advisory for the
client and enforced by the server.

**Every card inside an `ask` (or `input`) body is produced by the one serialising
function of §3.3**, including `delayedReveal.cards`, `manipulate_list.cards`,
`assign_damage.targets` and every option's `card`. The label leak — not the card
object — is the one that will actually happen otherwise: `String.valueOf(cardView)`
prints the real name for a card in any zone, so a `CardView` option's `label` is
`"???"` whenever its card is concealed.

### 5.1 The option object

Forge's choice methods are generic. `T` is frequently **not** a view object: it is
`MagicColor.Color` for choose-a-colour, `SpellAbilityView` for modal spells,
`Integer` / `String` for `getInteger`, and also `PaperCard`, `CostPart`,
`CardRules`, `ReplacementEffectView`. There is no usable Forge id across that set,
and `Integer 3` and `CardView 3` would collide. So:

```jsonc
{ "id": 0,                 // ask-local index into the server-side option array
  "label": "Agent Phil Coulson",
  "kind": "card",          // "card" | "player" | "ability" | "color" | "number" | "text" | "other"
  "cardId": 41,            // present iff the option is a CardView
  "playerId": null,        // present iff the option is a PlayerView
  "abilityId": null,       // present iff the option is a SpellAbilityView
  "card": { /* Card */ } } // present iff a card can be shown for this option
```

- **`id` is the ask-local index, not a Forge id.** Answers address options by
  index; the bridge keeps the `askId → Object[]` map (`pendingOpts`) and it is
  the only identity mapping in the ask path. The client only ever echoes an
  index.
- **One ask, one option array.** A kind that carries *two* lists —
  `order`'s `dest` / `source`, `sideboard`'s `main` / `side` — is presenting one
  server-side array in two halves, and the ids run across both in the order the
  §5.2 table names them (`dest ++ source`, `main ++ side`). So an option's `id`
  is unique within the ask and is never "index into the list it appears in";
  that is exactly why `order`'s answer addresses `dest ++ source` as one thing
  (§5.3).
- `kind` says how to render. The client never parses `label`.
- `card` exists because a bare label throws away the art, P/T and cost the M4/M5
  UI needs — and because building a second string for a card is how a second,
  non-redacting stringifier comes into existence.

### 5.2 The eleven kinds

Eleven kinds cover the twelve blocking `IGuiGame` methods that remain after
`openZones` / `tempShowZones` moved to `input` (§4.3).

| `kind` | `IGuiGame` method(s) | extra body | `answer.value` |
|---|---|---|---|
| `ability_menu` | `getAbilityToPlay` | `cardId` (**never null** — with no host card the bridge skips the ask), `options:[opt]` (each with `abilityId`, `label` from `SpellAbilityView.getDescription()`, `canPlay`, `isSpell`) | option index, or `null`. **The one kind that may be asked with no game thread parked on it** — amendment **M14**, §5.3 |
| `confirm` | `confirm(CardView,…)`, `showConfirmDialog` | `prompt`, `title`, `yesLabel`, `noLabel`, `defaultYes`, **`card`** (`Card` or `null`) | `true` \| `false` \| `null` |
| `options` | `showOptionDialog` | `prompt`, `title`, `options:[opt]`, `defaultIndex`, **`card`** (`Card` or `null`) | option index, or `null` |
| `text` | `showInputDialog` | `prompt`, `title`, `initial` (**a string, `""` when Forge has none**), `suggestions:[string]`, `numeric` | string, or `null` |
| `choose_list` | `getChoices` — and everything `AbstractGuiGame` builds on it: `one` / `oneOrNone` / `many` / `reveal` / `getInteger` / `insertInList` | `prompt`, `options:[opt]`, `preselected:[index]`, `min`, `max`, **`reveal`** | `[index…]` (length in `[min,max]`), or `null` |
| `order` | `order` → `OrderResult` | `prompt`, `destLabel`, `source:[opt]`, `dest:[opt]`, `min`, `max`, `referenceCardId`, `sideboardMode`, `showRemember` | `{ "ordered": [index…], "remember": bool }` — **never `null`** |
| `choose_entities` | `chooseSingleEntityForEffect` (min=max=1, or min=0 when optional), `chooseEntitiesForEffect` | `prompt`, `options:[opt]`, `min`, `max`, **`delayedReveal`** | `[index…]`, or `null` |
| `assign_damage` | `assignCombatDamage` | `attackerId` (**or `null`**: Forge's signature allows a null attacker), `total`, `overrideOrder`, `maySkip`, `targets:[opt]` — **the defender is index 0** | `{ "<index>": n, … }`, or `null` |
| `assign_amount` | `assignGenericAmount` | `sourceCardId`, `total`, `atLeastOne`, `label`, `targets:[opt]` | `{ "<index>": n, … }`, or `null` |
| `manipulate_list` | `manipulateCardList` (surveil, scry-likes) | `prompt`, `cards:[opt]` (full list, in order), `manipulable:[index]`, `toTop`, `toBottom`, `toAnywhere` | `[index…]` — the full list in its new order |
| `sideboard` | `sideboard` | `prompt`, `main:[opt]`, `side:[opt]` | `[index…]` = the new main deck, or `null` |

**Which of the eleven this configuration can actually see** (amendment
**M22**/**M23**/**M24**/**M27**, measured in `docs/evidence/m5-probes.md`). The
kinds are a description of `IGuiGame`, not a promise that Forge dispatches all of
them to a human seat:

| kind | engine evidence | where |
|---|---|---|
| `choose_list` | yes | every human-seat fixture |
| `order` | yes | `human-auto-*.jsonl` |
| `ability_menu` | yes | `human-auto-42`, `human-ability-42` |
| `assign_damage` | yes | `human-trample-7`, `human-ability-42` |
| `choose_entities` (+ `delayedReveal`) | yes | `human-search-7` — `decks/search-probe.dck` |
| `assign_amount` | yes | `human-amount-7` — `decks/amount-probe.dck` |
| `confirm` | yes, **and `FPref.UI_MANA_LOST_PROMPT` is now on by default** (M40) | `human-amount-7` |
| `text` | yes | `human-number-7` — `decks/number-probe.dck` |
| `manipulate_list` | **unreachable while D13 holds** (M23) | — |
| `options` | **unreachable: no call site in the jar** (M22) | — |
| `sideboard` | **yes, since M6** — between games of a `--games N` match | `human-sideboard-7` — `decks/sideboard-probe.dck` |

`manipulate_list` and `options` are implemented, driven by
`mtgtable.AskSelfTest`, shape-pinned by `ASK_SHAPES` and rendered by
`AskModal`, and that is a **documented ceiling** rather than an open gap: it is
a property of one preference (D13) and of Forge 2.0.14. `sideboard` was the
third of them and is no longer — the session that survives `matchOver: false`
(amendment **M38**) is exactly what M27 said it was waiting for, and
`fixtures/games/human-sideboard-7.jsonl` is game 2 of a two-game match. **Nine
of the eleven kinds now have an engine recording; the other two are the
documented ceilings above.** (The census over `fixtures/games/*.jsonl`:
`choose_list` 56, `ability_menu` 20, `assign_amount` 10, `choose_entities` 7,
`text` 6, `order` 4, `assign_damage` 3, `confirm` 2, `sideboard` 1 — nine
recorded plus `manipulate_list` and `options` unreachable is the eleven.)

### 5.3 Per-kind notes that a reader will otherwise get wrong

- **`ability_menu` is usually asynchronous, and that is the only reason a card
  with two abilities is playable** (amendment **M14**). Forge asks
  `getAbilityToPlay` from *inside the click* — on the virtual EDT, where the
  bridge may not block — so the menu is pushed as an ordinary `ask` with **no
  game thread parked on it**, and the answer is applied afterwards with
  `IGameController.selectAbility`. The frame, the body and the `answer` are
  identical to a blocking ask; three things differ, and only for a reader who
  cares:
  - it is **not re-sent by `resync`** (it is not in the reply pool, because there
    is nothing to unpark). Forge's input is still the one that asked, so a client
    that lost it clicks the card again and gets a fresh menu;
  - answering it `null` means "never mind" — the game does not advance, and
    nothing is spent. §5.4 applies as written;
  - only the newest menu is live. The board is modal while an ask is
    outstanding, so there is never a second one to lose.

  It still blocks when Forge asks from a game thread (a `PlayEffect`, a
  `DiscoverEffect`), which is the path the one-ability shortcut and the
  `host == null` skip were written for.

- **`order` is not top/bottom.** Forge's `OrderResult` is
  `(List<T> ordered, boolean rememberDecision)` **[jar]**, and `ordered()` is the
  *destination* list. The answer is `{ordered, remember}` and **must never be
  `null`**: `IGuiGame.java:229,232` and `PlayerControllerHuman.java:2317` all call
  `.ordered()` unguarded, so a null answer wedges or NPEs the game thread. On
  timeout the bridge computes a non-null default (report 07 §6.7).
  `min` / `max` are Forge's `remainingMin` / `remainingMax` — they constrain how
  many options may be **left in `source`**, and `-1` means unconstrained.
  **Answer indices address `dest ++ source` as one array, in that order.**
- **`choose_list` with `reveal: true` is "acknowledge only".** Forge's
  `AbstractGuiGame.reveal` is `getChoices(message, -1, -1, items)`; a negative
  `min` means *show these, select nothing*. The client renders a reveal with one
  OK button and answers `[]`. Without this flag it renders as an impossible "pick
  −1 cards". `getChoices` must also never return `null`
  (`AbstractGuiGame.java:767, 780-781` dereference it).
  **It is also a reveal channel in its own right**, which matters to
  `tools/check-redaction.mjs`: the whole purpose of the call is to put those
  cards in front of this seat, so a `reveal: true` list may legitimately carry a
  card the last snapshot had in an opponent's hand — measured,
  `{"prompt":"Looking at cards in Forge AI's hand","reveal":true,
  "options":[{"cardId":76,…}]}`. Every card in it still goes through
  `Snap.card`'s `canBeShownTo(viewer)` gate; what the flag says is that
  amendment **P12** ("a list-shaped ask must not carry more than the effect
  reveals") is satisfied by the ask itself rather than by a `delayedReveal`.
  **Without the flag, P12 is unchanged and a card from an opponent's hidden zone
  is still a failure.**
  And because `WireGuiGame.ask()` flushes a `state` *before* it emits the ask
  (report 06 W4 — that is the snapshot in which a temporarily revealed card is
  visible), the snapshot showing the revealed card is written **one frame
  earlier** than the ask that justifies it. The checker allows an `ask` to
  justify the `state` immediately before it, and **nothing further back**; both
  halves are negative-controlled in `fixtures/negative/redaction/`
  (`a6-reveal-ask-one-frame-too-late.jsonl`,
  `p12-choose-list-reveals-without-the-flag.jsonl`).
- **`assign_damage`'s defender is option index 0**, carrying `"defender": true`
  plus `playerId` or `cardId`; the blockers follow, each with `cardId` and
  `lethal` (remaining toughness, computed on the game thread). The bridge
  marshals index 0 back to the map key `null`, which is what
  `PlayerControllerHuman.java:305-311` accepts for "the defending player", and
  index `i` back to `blockers.get(i - 1)`. A `null` answer is legal here and
  means "let Forge assign" (`PCH:302-304`).
  **A one-off error in that marshalling is invisible on the wire** — both
  spellings are a well-formed `{"<index>": n}` object — so it is not left to a
  recording to catch: `mtgtable.Ask` holds the marshalling for all eleven kinds
  with no Forge types in it, and `mtgtable.AskSelfTest` drives each one from real
  JSON in `bridge/build.sh`, beside the `Json` self-test. Forge dispatched only
  `choose_list` and `order` in the games recorded for M2 and
  `assign_damage` in the trample probe, so for the remaining eight kinds that
  self-test and `fixtures/synthetic/sample-handwritten.jsonl` are the whole of
  the contract.
- **`assign_amount` keys may be colours.** `assignGenericAmount` takes a
  `Map<Object,Integer>` whose keys are `GameEntityView` **or** `MagicColor.Color`
  ("mana of any combination of colours"), so each target carries
  `kind: "entity" | "color"` and an optional per-key `max`. Answers stay indices.
- **`choose_entities.delayedReveal`** is `null` or

  ```jsonc
  { "owner": 1, "zones": ["library","hand"], "messagePrefix": "Searching: ",
    "cards": [ /* Card — each through the one function */ ] }
  ```

  `DelayedReveal` lives in `forge.game.player` (**not** `forge.game.card`) and its
  accessors are jar-verified: `getCards()`, `getZone()`, `getOwner()`,
  `getMessagePrefix()`. It is the *context* ("here is what you are looking at")
  while `options` is the *choice*; the two overlap only partially. Its three
  construction sites are all library or opponent-hand searches, so this is the
  single largest legitimate reveal on the wire.
- **`manipulate_list` is where the whole library can arrive.** With
  `FPref.UI_SELECT_FROM_CARD_DISPLAYS` on (Forge's default), a scry 1 routes the
  player's **entire ordered library** into this call. Decision **D13** turns that
  pref off at bootstrap, which reroutes scry to `confirm` / `choose_list` over
  the top N only. The redaction checker asserts that no `manipulate_list` or
  `choose_list` body carries a card that is in an opponent's hand or library
  unless it arrived via `delayedReveal`.
- **`sideboard` options are `PaperCard`s, not `CardView`s** — your own pool, no
  redaction question. Never emit the opponent's pool; Forge never gives it to us.
  Its one caller runs **between games** (`Match.java:278`) and returns early
  unless the deck has a sideboard, so it needs `--games 2` *and* a session that
  survives an `over` with `matchOver: false` (amendments **M27** and **M38**).
  It is raised **on the game thread** — `Match.startGame` runs under
  `game.getAction().invoke(...)` — so it parks like any other ask, and the
  answer is the new main deck as indices into `main ++ side`. The identity
  ("no sideboarding") is legal and is what a player clicking straight through
  sends.
- **`confirm`'s one reachable call site is the floating-mana warning**
  (amendment **M24**). Eleven of the twelve `IGuiGame.confirm` /
  `showConfirmDialog` sites are inside `if (getGui().isLibgdxPort())` — including
  `InputConfirm.confirm` itself, whose else branch is the **input** path, which
  is why the mulligan, the coin toss and every "are you sure" a player actually
  sees arrive as an `input` and not as this kind — or are dev-mode cheats, or run
  on the click thread where the bridge must answer locally. The twelfth is
  `InputPassPriority.passPriority`, which Forge itself hops to a game thread for.
  It is gated on `FPref.UI_MANA_LOST_PROMPT` (default `"false"`).
- **A `text` ask with `numeric: true` is a loop if you answer it badly**
  (amendment **M25**). It is `AbstractGuiGame.getInteger`'s "Other…" branch, and
  that branch re-asks in a `while (true)` until the string parses as a number
  **inside its own `[min,max]`** — bounds this body does not carry. `null` is
  "cancel" and is always safe; a free-text box must expect the same question
  again when the number is out of range. The `choose_list` that offers the
  "Other…" option is recognisable by its shape: every option `kind:"number"` plus
  exactly one `kind:"text"`.
- **`options` has no call site in Forge 2.0.14 at all** (amendment **M22**), and
  `manipulate_list` has one that decision D13 turns off (amendment **M23**).
  Neither can be given engine evidence in this configuration.

The reducer **throws** on an unknown `kind` rather than ignoring it, so a new
blocking method added on the Java side surfaces immediately as a red banner rather
than as a hang.

### 5.4 Invariant: every `ask` must be answerable with `null`

On disconnect or timeout, complete the future with `null` and return Forge's
documented default for that method — otherwise **the game thread wedges forever
with no error**, which looks exactly like a hung app. **Three kinds have no usable
null default and must synthesise one**: `order` (§5.3), `choose_list`
(`AbstractGuiGame` dereferences the result), and `manipulate_list` — whose result
`PlayerControllerHuman.java:986` indexes directly, so its default is the input
list in its original order.

**And one kind is answerable with `null` and still a dead end** (amendment
**M25**): a `text` ask with `numeric: true` re-asks forever unless the string is
a number in range, so `null` — *cancel* — is the answer that terminates and `""`
is not. "Answerable with null" is about the game thread; it is not a promise that
any *non*-null answer advances the game, and the two places where a legal answer
does not are `text` and `confirm` (§5.3).

**So a client's one-click "default" for that kind is `null`** (amendment
**M29**). This is not a restatement of M25: the board shipped `initial` as its
default, `initial` is `""` whenever Forge has none (§5.2), and pressing
*Default* on a live `text a2` produced `a3`, `a4`, `a5`, `a6` — the identical
question every time. A UI may still offer a free-text box; what it must not do is
present a value it cannot know is in range as "the documented default, always
legal". It cannot know: the body carries neither bound, and CLAUDE.md §Scope
forbids the client inventing one. `AutoTransport.answerFor` and
`tools/ws-auto-play.mjs` already answer `null` here; `web/test/ask-modal.test.tsx`
now pins the board's.

The machinery, all of which must exist before the first `ask` is emitted:

- `ReplyPool` mapping `askId` → `CompletableFuture`, with `cancelAll()` on
  disconnect.
- A per-`ask` timeout, completing with `null`.
- Forge's documented null-defaults per method (`RemoteClientGuiGame.java:436,442,453`;
  `assignCombatDamage`'s null case is handled at `PlayerControllerHuman.java:302`).
- A second `answer` for a completed `askId` dropped with a `notice`, never applied.
- A malformed answer (wrong JSON shape) treated as `null`, never thrown on the
  game thread.
- **Concede reachable from every UI state**, so a wedge is always escapable.

---

## 6. The `notice` body

```json
{ "v": 1, "seq": 131, "t": 1757600000400, "type": "notice",
  "body": { "level": "warn", "title": "Illegal action",
            "text": "That creature cannot block." } }
```

`level` is `"info"` | `"warn"` | `"error"`. Carries Forge's `message`,
`showErrorDialog`, `alertUser` and `flashIncorrectAction`. Never blocks — a
`notice` is a toast, not a question. Anything the user must answer is an `ask`.

Two `warn` titles are the server's own refusals of an `act`, and each means the
act had **no effect**: `Not yet` — the engine has not asked this seat anything in
this game (amendment **M42**, §2.1) — and `Not now` — an `undo` or `useMana`
arrived while the engine was not waiting on this seat (amendment **M48**, §2.2),
with the act's name at the start of `text`. A client may retry either; neither is
an error.

**Both strings are gated** (amendment M1). They are the engine's, and one of
them is routinely a card: `PlayerControllerHuman.notifyOfValue` calls
`message(value, CardView.get(sa.getHostCard()).toString())`, and
`CardView.toString()` is `name (id)`. So `title` and `text` each pass through
`Snap.sweepText` — rule 2 of §3.6's gate/sweep/strip, applied on its own — and
arrive as `""` when the string named an id the current snapshot conceals. Both
are always present and always strings; a client renders them verbatim and must
be total over an empty one.

This is invariant 4's second half stated as a rule rather than as a call site:
**`Snap.stackText` and `Snap.sweepText` are the same sweep**, and nothing else in
the bridge may put an engine string on the wire ungated.
`tools/check-redaction.mjs` scans `notice.title` and `notice.text` and **fails**
on a hit — unlike `ask.prompt` and `input.prompt`, which only warn, because those
are strings Forge builds and we do not (report 06 §10, residual risk 3).

`UNIMPL <name>` conditions (an unimplemented `IGuiGame` member firing) are emitted
as a `notice` at `level: "error"` **and** logged server-side, so they are visible
in the browser and greppable in `var/*.log`. Zero `UNIMPL` lines over ten
consecutive games is the M5 exit criterion.

---

## 7. The `over` body

```json
{ "v": 1, "seq": 605, "t": 1757600120000, "type": "over",
  "body": { "winner": 0, "reason": "AllOpponentsLost",
            "matchOver": false } }
```

**From the outcome, not from `finishGame`** (amendment M4). `winner` is a player
`id`, or `null` for a draw. `matchOver` distinguishes the end of a game from the
end of the match; when it is `false` the client may send
`act: newGame {mode:"continue"}`, and when it is `true` only
`{mode:"restart"}` can produce another game (§2.2, amendment **M38**). Either
way the next game opens with a **new `hello_ok`**, carrying a **new `gameId`**,
that invalidates every cached id (§2.1) — and writes its own frame log (§8).

The emitter's trigger is `GameEventGameOutcome`, read on the game thread and
shipped immediately after the `state` frame that carries the same body as
`gameOver`. It used to be `IGuiGame.finishGame` / `afterGameEnd`, and **Forge
does not reliably call either**: two of four identical console runs (four button
presses, then a concede during the pre-game prompts) ended with a final `state`
carrying `gameOver: {winner: 1, reason: "AllOpponentsLost"}`, no `over` frame at
all, and exit 0. `finishGame` and `afterGameEnd` remain as late triggers, and the
emission is idempotent, so whichever comes first wins. A session that cannot end
is not a cosmetic problem: it is a client that waits forever.

**`reason` is a string, or `null` when the engine had not published a win
condition yet.** `Snap.state()` writes this body the instant `Game.isGameOver()`
is true, while `GameView.getOutcome()` is `getMatch().getOutcomeById(getId())` —
a lookup in the `Match`'s outcome map, which is not populated at the same
instant. A snapshot landing in that window genuinely has no reason to report,
and `""` would misreport it as a known empty one. `reason: string | null` is the
declared type in `protocol.ts`, in `tools/check-redaction.mjs` and here.
Unobserved in the committed fixtures (all of them say `AllOpponentsLost`); a draw
or a concede is the likeliest way to reach it.

The same object appears as `state.gameOver` in subsequent snapshots, so a scrubbed
replay renders the result without special-casing the final frame.

**An engine crash is the other way to reach the null body** (amendment **M46**):
an exception out of Forge's game loop publishes no outcome, so the bridge sends
an error `notice` titled `Engine error` and then this `over` with `winner`,
`reason` null and `matchOver: true`. The notice is the marker that the game is
incomplete; its text is the bridge's own and never the engine's message.

---

## 8. The frame log

`var/games/<gameId>/frames.jsonl`, written by the `mtg-table-log` thread, **flushed
per line** so a killed JVM still leaves a complete, parseable file.

**One file per game, not per process** (amendment **M38**). A session that plays
three games writes three directories — `<gameId>/`, `<gameId>-g2/`,
`<gameId>-g3/` — each with its own session header on line 0, its own `seq`
series starting at 1, and its own terminal `over`. The alternative (one file with
three headers) would break the one property every reader depends on: line 0 is
the header and every other line is a frame.

### 8.1 Line 0 — the session header

Line 0 is **not** a frame. It is the session header, distinguished by
`"kind":"session"`:

```json
{"v":1,"kind":"session","gameId":"g1","startedAt":"2026-09-11T20:14:03Z","seed":42,
 "forgeVersion":"2.0.14","forgeJarSha256":"3f6c…","seat":0,
 "decks":[{"player":0,"path":"decks/pacho-shield.dck","sha256":"9ab1…","cards":40},
          {"player":1,"path":null,"sha256":null,"cards":40}]}
```

| Field | Meaning |
|---|---|
| `v` | Protocol major, matching the frames that follow. |
| `kind` | Always `"session"`. Its presence is how a reader tells the header from a frame. |
| `gameId` | Matches `state.gameId` and the containing directory. |
| `startedAt` | ISO-8601 UTC. |
| `seed` | The value passed to `MyRandom.setRandom(new Random(seed))`, or `null`. |
| `forgeVersion`, `forgeJarSha256` | Exactly which engine produced this log. |
| `seat` | **The player id this log was redacted for** (§8.3). In a two-player game ids and `players[]` indices coincide, but readers should use ids. |
| `transport` | Which client played this seat: `"null"` \| `"auto"` \| `"console"` \| `"ws"`. **Absent from an AI-vs-AI recording**, which has no transport and nobody at the keyboard. It is not decoration: `--transport null` answers every ask with a literal `null` so that §5.4's documented defaults get exercised, and without this key that log is indistinguishable on disk from a wedged session (§8.3, A12). |
| `policy` | **Optional** (amendment **M31**). `"probe"` when the run used `--probe`, `AutoTransport`'s M5 policy — four decisions taken the other way so that `useMana`, `clickAbility`, `showInputDialog` and a library search that actually fetches are reachable. **Absent** means the default policy; no recording made before M31 carries it. |
| `prefs` | **Optional** (amendment **M31**). The Forge preferences this process set **in memory** beyond the bootstrap's own three, as `FPref` names: today only `["UI_MANA_LOST_PROMPT"]`, from `--mana-lost-prompt`. It is why `fixtures/games/human-amount-7.jsonl` carries two `confirm` asks that **cannot** occur on stock preferences; without it a reader who re-records that fixture on defaults concludes the emitter changed. `tools/check-redaction.mjs` tolerates it and requires it of nothing. |
| `recordedBy` | `"client"` on a log a **client** wrote (`tools/ws-auto-play.mjs --log`); **absent** means the bridge wrote it. `tools/check-redaction.mjs` reads it and relaxes the `seq` continuity rule, and nothing else: a client legitimately sees a frame re-delivered verbatim and real forward gaps, both amendment **M10** (M17). |
| `paceMs` | **Optional** (amendment **M47**). Present only on a PACED AI-vs-AI recording — `mtgtable.RecordMatch --pace <ms>`, which `./scripts/spectate.sh` passes in follow mode: the engine dwelt `paceMs` at every phase boundary (a quarter of it after a frame that only moved the phase strip), so the `t` gaps are the watcher's pace, not the engine's. It changes nothing else — a paced and an unpaced recording of one seed are the same frames (§8.7). A positive integer; `tools/check-redaction.mjs` fails it beside `transport`, because a seat's pace is its player's. |
| `humans` | **Optional** (amendment **M59**). `2` on each seat's log at a table of two (`MtgTable --humans 2`): the other seat is a person, so `hello_ok.match` takes its two-person form and `table` frames appear. Only beside `transport`. Each seat writes its own log, `var/games/<gameId>-seat<N>/frames.jsonl`. |
| `record` | **Optional** (amendment **M60**, D407). `true` or `false`: this seat's player agreed (or not) to this game going into the human test set (D369, `var/ml/human-friends/`) and the automatic engine review (D385, that player's own). Only beside `humans: 2`; absent means not agreed. |
| `ai` | **Optional** (amendment **M62**, D414). The AI seat's controller when it is not plain Forge: `{"policy":"outlets"}` or `{"policy":"search","version":"search-v2"\|null,"budgetMs":1500,"config":"ms=1500,…"}`. Absent for plain Forge and on every log before M62. Only beside `transport`, never beside `humans`. |
| `decks` | One entry per seat: `{player, path, sha256, cards}`. **`path` and `sha256` are the viewing seat's alone and are `null` for every other seat** — see below. `cards` is the main deck's card count and is public for every seat. |

**A frame produced before the header is held, not dropped** (amendment M9). The
emitter can reach a `notice` or an `over` before the seat exists — an act typed
ahead of the game, or a concede during the pre-game prompts — and those frames
go on the wire with a real `seq` (§1: monotonic per direction, starting at 1).
`GameLog` buffers them, bounded, and writes them immediately after line 0. If
the header never arrives at all, the file is left **empty** rather than
headerless, and the close says so on stderr: a reader identifies line 0 by
position, so a file that begins with a frame is worse than no file.

**Why the opponent's deck is not named.** A path plus a sha256 identifies a
decklist exactly, and §8.3 promises the log contains only what *this* player was
allowed to see. With two AI seats that is harmless; the moment a human sits down
in M2/M3 it is the opponent's entire deck, handed to the player in the file the
client reads. The same reasoning scopes `hello_ok.unsupportedCards` to the
viewing seat's deck (§2.1), because each of its entries is a literal card name.
`tools/check-redaction.mjs` asserts both. (Amendment **M44** does name the
opponent's deck in `hello_ok.match.aiDeck` — by its public *name* and card count,
never its path, hash or list — and the checker holds that object to exactly those
two keys.)

### 8.2 Every later line — a frame plus `dir`

Each subsequent line is a §1 envelope with **one added field, `dir`**:

```json
{"v":1,"seq":1,"t":1757600000000,"dir":"s2c","type":"hello_ok","body":{"gameId":"g1","you":0}}
{"v":1,"seq":7,"t":1757600000500,"dir":"c2s","type":"act","body":{"action":"clickCard","cardId":41}}
```

(the `hello_ok` body is abridged here; on disk it carries every field from §2.1)

`dir` is `"s2c"` or `"c2s"` — or, in an AI-vs-AI recording made by the
in-process recorder, `"ai"`: an AI seat's own decision records, never on the
wire (amendment **M55**). `seq` is per direction, so the interleaved series
each count independently; `t` gives the true ordering. A replay transport reads the
file in file order and feeds only `s2c` frames to the reducer, using `c2s` lines to
show what the player did.

**A `resync` is logged; a re-delivered s2c frame is not** (amendment **M16**).
Every c2s frame the server acts on is written, `resync` included — and so is the
implicit resync a (re)connect performs, because it is the same request made by
connecting rather than by asking. In the other direction, a frame the socket
re-delivers verbatim on a resync or a reconnect keeps the `seq` and `t` it was
born with and is **not** written a second time: this file records what the
session *produced*, and a repeat on a socket is a repeat, not a new frame. So a
bridge log is contiguous per direction and a gap in it **is** a dropped frame —
while a **client's** log (`recordedBy: "client"`, §8.1) is neither contiguous nor
monotonic, and `tools/check-redaction.mjs` reads the header to know which rule to
apply.

### 8.3 The log is per seat

**A log contains exactly what one player was allowed to see.** Redaction happens in
the bridge before the frame is written, not in a viewer — so an opponent's hand
card appears in the file as the five-key redacted shape (§3.3) and nowhere in that
file does its name exist.

Three consequences:

1. A log is **safe to paste into a bug report**. A bug is a file, not a story.
   (Your own log. Not an opponent's.)
2. It is **the same stream the client consumed**, so a replay is exact, not an
   approximation.
3. The M1 redaction test is a checker over a recorded log asserting that no
   opponent hand card ever carries a `name`.

**A same-deck recording cannot evidence any of this.** If both seats play
`decks/pacho-shield.dck`, every card name the opponent could leak is also a name
the viewer legitimately holds, so every name-based assertion is satisfied by
coincidence and the claim above — "nowhere in that file does its name exist" —
is untestable on the corpus that is supposed to prove it. That is exactly how
`cast.text` naming a concealed face-down card (§3.6 rule 1) passed every test in
the repo. `fixtures/games/disjoint.jsonl` is recorded with **different decks on the
two seats** for this reason:

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
    --deck2 decks/morph-probe.dck --seed 99 --out fixtures/games/disjoint.jsonl
```

`web/test/fixtures.test.ts` fails if the corpus ever loses its two-deck
recording, and on any two-deck log it asserts that a name only the opponent's
deck holds is never printed in a frame that does not also show the viewer a card
carrying it.

### 8.4 What an AI-vs-AI recording contains

Line 0 is the session header; then exactly one `hello_ok`, then a run of `state`,
then exactly one `over`. There is no `input`, no `ask`, no `notice` and no `c2s`
line, because nobody is playing. **A replay transport must not wait for an
`input` frame before rendering.** The header carries no `transport` key (§8.1).

**A human-seat recording** (`fixtures/games/human-*.jsonl`, written by
`mtgtable.MtgTable`, M2) is the same envelope stream with the interactive half
present: line 0 carries `transport`, and between the `state` frames come `input`
frames (one per EDT push — a prompt and a button update are two), `ask` /
`answer` pairs, `notice` toasts, and `c2s` `act` lines for every click the seat
made. `seq` counts per direction, so the two series interleave. It still ends
with **exactly one `over`**, and that frame is now emitted from the outcome
capture rather than from `finishGame` (§7), which is what makes "exactly one"
true of a conceded game as well as of a played-out one.

`abilities` is `[]` on every card of every recording, human-seat ones included —
**M5** is the milestone that fills it (§3.2, amendment M5).

**A spectated recording** (`./scripts/spectate.sh`, amendment **M47**) is an
AI-vs-AI recording with two additions and no other difference: `hello_ok.match`
names both decks and both profiles (the viewing seat's as `yourProfile`), and,
when it was paced, the header says `paceMs`. It is still ONE seat's view — the
other seat's hand is the five-key stub it would be at the table, and there is no
omniscient viewer — and `--seat 1` is the other chair. It is written to
`var/spectate/<deckA>-vs-<deckB>-<seed>[-seat1].jsonl`, never committed, and
served by the dev server alone at `/spectate/<name>.jsonl`, with `?from=<byte>`
answering the complete lines written since that offset (`X-Log-Next` says where
they end) — which is how the page FOLLOWS a recording that is still being
written (`web/src/transport/follow.ts`). The frames are the frames a reader of
any other AI-vs-AI log already knows; follow mode is a transport, not a protocol.

### 8.5 The fixture corpus, and why it is split

`fixtures/games/` holds **engine-produced** recordings and nothing else; they are
the drift contract between `Snap.java` and `protocol.ts`, and
`web/test/fixtures.test.ts` globs exactly that directory. Each file is there for
a reason:

| file | why it exists |
|---|---|
| `g1` / `g2` / `g3` | the primary deck at seeds 42 / 7 / 2026 |
| `morph.jsonl` | `decks/morph-probe.dck` (18 Mountain + 22 morph creatures) — the only recording that produces a **face-down card** at all (`faceDown: true`, `name: ""`, and an `alt` block on the 121 the viewing seat controls), because `pacho-shield.dck` has no morph, manifest, disguise or cloak card |
| `disjoint.jsonl` | the first recording whose two seats play **different** decks, which is the only way a name-based redaction assertion can tell a leak from a coincidence (§8.3). `pacho-shield` vs `morph-probe`, seed 99 |
| `future-sight.jsonl` | `decks/future-sight-probe.dck` (22 Island + 18 Future Sight) vs `morph-probe` — the only recording in which **`library.cards` is non-empty**. No card in `pacho-shield` or `morph-probe` runs a continuous `MayLookAt` static, so before it, §3.4's amendment was proved only by the shape of an empty array. 98 frames carry a revealed top card; it is a two-deck recording as well |
| `human-auto-{42,7,2026}.jsonl` | **the first recordings with a seat in them** (M2): `pacho-shield` played by `AutoTransport`'s scripted policy against the AI, at seeds 42 / 7 / 2026. They are where `input`, `ask`, `answer`, `act` and `notice` stop being hand-written (§8.4). Ask kinds actually dispatched, after amendment **M14** re-recorded them: `choose_list`, `order`, **`ability_menu`** (7 at seed 42, 1 at seed 7) and **`assign_damage`** (1 at seed 42 — the primary deck reaches it for the first time, because the menu is what lets this policy cast a creature at all). Before M14 the three of them dispatched `choose_list` and `order` and nothing else |
| `human-trample-7.jsonl` | `decks/trample-probe.dck` (18 Forest + 22 Garruk's Companion, a 3/2 **trampler**) vs `morph-probe`, seed 7 — the only recording that reaches **`assign_damage`**, the kind §5.3 calls the worst trap of the eleven. `PlayerControllerHuman.java:289` only asks the GUI when the attacker has trample or is blocked by more than one creature, and neither deck above can produce either. Its one ask carries the defender at index 0 with `lethal: null` and a **face-down** blocker at index 1 with `lethal: 2` — so it is evidence for the option gate as well |
| `human-yield-13.jsonl` | `decks/yield-probe.dck` (18 Forest + 22 **Thallid**) at seed 13, recorded by `tools/ws-auto-play.mjs --comfort --require-yield-repeat` — the only recording that proves **auto-yield's behaviour** rather than its wire. Thallid's `At the beginning of your upkeep…` trigger is mandatory, so the same `stack[].yieldKey` returns to the top of the stack every turn: after `setYield {mode:"yes"}` the handle reappears on top four times (turns 5, 7, 9, 11) and **no `input` carrying `buttons.ok.enabled` is pushed while it is there**, which is `PlayerControllerHuman.chooseSpellAbilityToPlay` returning null without raising an `InputPassPriority` at all. Every other recording could only show `yielded:"yes"`, i.e. the store being *written* |
| `human-scry-7.jsonl` | `decks/scry-probe.dck` (24 Island + 16 Opt) vs `morph-probe`, seed 7 — the only recording in which **`input.focusCard` is non-null**. Scry 1 with `UI_SELECT_FROM_CARD_DISPLAYS` off (decision **D13**) routes to `willPutCardOnTop`, which pushes `setCard` on the **game thread** with a card that is in the viewer's *library* and therefore not in the snapshot (amendment H's whole reason). 24 such pushes, 12 of them naming a card no frame of the log contains |

`fixtures/synthetic/sample-handwritten.jsonl` is hand-built by
`tools/make-sample-fixture.mjs` and lives **apart** because it was written from
the same reading of this document as `protocol.ts` — it cannot detect drift
between the two ends, so counting it as a contract fixture inflates the number of
recordings that can actually fail. Its job is the shapes an AI-vs-AI game never
emits,
and it carries one of each: an `input` whose `focusCard` is **not** in the
snapshot plus a non-empty `weak` and `openZones`, **all eleven `ask` kinds** with
the `answer` that closes each, a face-down card in three positions (an opponent's
morph with no `alt`, the viewer's own manifest with one, and a foretold card in
exile with no public body at all), a library with a card revealed in it, the
`surveil` / `phased` / `foretold` events no recording fires, and `zone` events
with a null `from` and a null `to`. It is held to the **same** `check-redaction`
standard as an engine recording — `check-all.sh` step 6 runs over
`fixtures/synthetic/*.jsonl` too.

`fixtures/negative/` holds logs that must **fail**: an unknown frame type, a `v`
mismatch, and one the reducer accepts but the renderer cannot draw.
`fixtures/negative/redaction/` is the **checker's own** negative control — a
clean slice of `g1` plus nine copies of it carrying exactly one defect each (a
stub without `owner`, a card without `token` or `alt`, a library without `cards`,
a revived `faceDownHidden` object, a stub with a `name`, a named opponent hand
card, and two opponent-library reveals). `tools/check-redaction-selftest.mjs`
asserts the baseline passes and every probe is rejected, because a checker that
cannot fail proves nothing about the emitter it is watching.

### 8.6 What the log buys

- **Front-end development with no JVM running.** `web/` has a `ReplayTransport`
  that reads a `.jsonl` and exposes play / step / scrub behind the same `Transport`
  interface as the WebSocket. The board component cannot tell them apart.
- **Committed golden fixtures** under `fixtures/games/`, so the renderer has real
  input from day one and every later front-end evening runs without the engine.

### 8.7 Seeding, honestly

`MyRandom.setRandom(new Random(seed))` (verified present in 2.0.14;
`SimulateMatch.java:89` uses it) makes engine-level re-runs plausible. **Do not
promise byte-identical replay** — thread interleaving is not deterministic. The log
is the record of what happened; the seed is a hint for reproducing something like
it.

**Measured for AI-vs-AI recordings** (amendment **M47**, `docs/evidence/spectate.md`
§D). `RecordMatch` has one game thread and no seat, and **one seed is one game**:
two runs, a paced and an unpaced run, and a seat-0 and a seat-1 run of the same
seed and decks all played the same game, event for event
(`tools/same-game.mjs`, which sets aside only what one chair cannot see). Two
things still move between runs, and neither is the game: the **order of the ids
inside a `stats` event**, a hash-set iteration inside Forge over objects hashed by
identity — stable for one build, reshuffled by unrelated code running before
`FModel.initialize` (gate step 6 compares it as a set, **D121**); and, rarely, a
**frame boundary**, because `GameEventForwarder` also flushes on a 500 ms wall
clock, so a loaded machine can cut one batch in two. The seed is therefore a
reliable way to see a game again, and from the other side; it is still not a
promise of identical bytes.

---

## 9. Summary of invariants

1. Client→server messages never expect a reply. Only `ask` blocks, and only the
   server waits.
2. `state` is built on the **game thread**; `input` comes from the **EDT**; answers
   are delivered from the **netty thread** and from nowhere else.
3. `state` is always a **full** snapshot. There are no deltas in v1.
4. Exactly **one** card-serialisation function, gated on the caller's own zone
   knowledge *and* `canBeShownTo` *and* `canFaceDownBeShownTo`. It has exactly
   **one** concealed shape, the five-key `hidden` card; a face-down card whose
   identity is concealed is an ordinary `Card` with `name: ""` and `alt: null`
   (§3.3, amendment P3 — the eleven-key `faceDownHidden` object is superseded and
   no longer emitted). **Every** card on the wire goes through it — `players[].zones`,
   `stackCards`, `library.cards`, `input.focusCard`, every ask option's `card`,
   `delayedReveal.cards`. A full card's `keywords` (M49) are `Keyword` constants
   and nothing else, and a face-down card's are `[]`. **Libraries carry a count plus only the cards
   `canBeShownTo` allows** (§3.4). And exactly **one sweep** for every
   engine *string* that reaches the wire: `Snap.stackText` (`stack[].text` and
   `events[].cast.text`, §3.6 rule 1) and `Snap.sweepText` (`notice.title` and
   `notice.text`, §6) are the same rule, tested on the same ids, because the
   string path was the second leak and the notice path was the third.
5. **`ok.enabled === false` means the engine wants a card click**, not a button.
6. **Every `ask` must be answerable with `null`**, and Concede must be reachable
   from every UI state. The two kinds with no null default (`order`,
   `choose_list`) synthesise one.
7. The reducer **throws** on an unknown `type`, an unknown `ask.kind`, or a `v`
   mismatch. It never silently ignores a frame.
8. The client computes no rules answers. Ever.
9. `state.events` carries **ids only**, plus `cast.text` — which is *not*
   assumed public: it is gated, swept for concealed ids and stripped of Forge's
   engine annotation, and is `""` whenever the viewer may not have it (§3.6
   rule 1). Unknown event kinds are ignored, not thrown — the one deliberate
   exception to invariant 7.
10. **A `hidden` card REPLACES the client's card object for that id. It never
    merges** — and the same holds for a face-down card arriving with `name: ""`
    and `alt: null`, which is the P3 spelling of the same concealment. Forge card
    ids are stable across zone changes and across face-down transitions, so a
    reducer that keeps a `name` learned during a legitimate reveal goes on
    rendering it after the card returns to a hidden zone. That is a leak in `reduce.ts` that no amount of care in `Snap.java` can
    prevent, and it is the one the log checker structurally cannot see — it is
    tested directly against `reduce()` (report 06 §0.6, §9.A8). The same rule
    applies across games: a new `hello_ok` resets the map (§2.1).
11. An **event** with a missing id is dropped, never emitted with a `null` under
    a non-nullable type; a **card**, **stack item** or **combat band** is never
    dropped, so the handful of fields the engine cannot guarantee are declared
    nullable and every reader guards them (§3.1, §3.6 rule 5). The renderer is
    total over every shape this document allows, and
    `tools/check-redaction.mjs` proves both halves over the committed fixtures.

---

## 10. Planned additions — **most of this shipped in M6**

**Read the live sections first.** As of 2026-09-12 (amendments **M32**–**M40**)
`players[].phaseStops`, `state.yield`, `state.undo`, `stack[].yieldKey` /
`isAbility` / `isOptionalTrigger` / `yielded`, `input.buttons.focus` and the acts
`passPriority`, `yieldTo`, `setYield`, `newGame` and `undo` are **live protocol**,
specified in §2.2, §3, §3.1 and §4 — and where the two descriptions differ, the
live one wins (`phaseStops` is `{own,opp}`, not a flat array; `yield` carries its
`kind`; `setPhaseStop` names a `turn`, not a `playerId`; `setYield`'s modes are
`yes` / `no` / `clear`; `newGame`'s are `continue` / `restart`). What is left
below and **still not emitted** is `state.autoPassNoActions` and
`attachedToPlayerId` on a `Card`; `input.selectable.playerIds` shipped in
amendment **M66** (2026-10-10), beside `input.selectable.chosen` (M65).

The rest of this section is kept as written, because it is the reasoning the live
shapes came out of. Everything in it was specified but **not on the wire** when it
was written. It is
written down now, while M3 is being built, because each item is an added field
inside a `body` — not a `v` bump — and adding them later means touching a frozen
reducer and invalidating every fixture. A client may read these fields
defensively; it must not require them.

Naming is reconciled across `docs/research/10-board-ui-spec.md` §16.1 and
`docs/research/11-engine-comfort-features.md` §10; where the two overlapped,
report 11's names are the ones used here.

### 10.1 `state` additions

| field | shape | meaning | source |
|---|---|---|---|
| `players[].phaseStops` | `string[]` of `PhaseType` names | the phases at which **this player's turn** stops for the viewer. Server-owned; the client never derives it. Answered from `WireGuiGame`'s own map, seeded once from `FPref.PHASES_HUMAN` / `PHASES_AI`, **never saved** — which is exactly what Forge's desktop does (`CMatchUI.java:1389-1441`). `PlayerControllerHuman.isUiSetToSkipPhase` only consults `YieldController` `if (isRemoteClient())`, and we are not one, so the `YieldController` skip map is dead code for us. | 11 §3 |
| `state.yield` | `{playerId, phase} \| null` | the active pass-to target — the marker Forge draws on its own phase strip. From `YieldController.getAutoPassUntilMarker()` → `YieldMarker(PlayerView, PhaseType)`. Report 11 §10 also proposed a `kind: "endOfTurn"\|"stack"\|"marker"` discriminator and a sibling `autoPassNoActions` boolean (from `autoPassUntilEndOfTurn()` / `autoPassUntilStackEmpty()`); they are **not** in this shape today, and adding either is a one-line amendment when M6 needs to tell the three cases apart. | 11 §4, §10; 10 §16.1 |
| `state.undo` | `{can, depth}` | `canUndoLastAction()` + `MagicStack.getUndoStackSize()`, both game-thread reads. Undo only ever holds *mana abilities* and is cleared on every phase change — do not build UI that promises more. | 11 §7 |
| `stack[].yieldKey` | opaque string \| `null` | a **bridge-minted handle**. Forge's own `StackItemView.getKey()` is `CardView.toString() + ": " + …`, i.e. *the card name and id* — never put it on the wire, and never render this handle. | 11 §5.2 |
| `attachedToPlayerId` (on `Card`) | `number \| null` | the player an Aura is attached to, when `attachedToId` is `null` because the attachment target is a **player** (Curse of Death's Hold, Eldrazi Conscription's cousins, any "enchant player" Aura). Today such an Aura serialises with `attachedToId: null` and is indistinguishable from an unattached one. The emitter writes `attachedToId` from `CardView.getAttachedTo()`, which returns a **`CardView`** **[jar]** and is therefore `null` for a player attachment — the information is not missing, it is on the *other* accessor, `CardView.getEntityAttachedTo()` → `GameEntityView` **[jar]**, whose runtime type is a `PlayerView` or a `CardView`. So this field is an `instanceof` branch on that second accessor, not a cast on the first. | 06 §6; builders' notes |
| `stack[].isAbility`, `stack[].isOptionalTrigger`, `stack[].yielded` | bool | from `StackItemView.isAbility()` / `isOptionalTrigger()` **[jar]** and `shouldAutoYield(rawKey)`; the always-yes / always-no affordance. | 11 §5 |

### 10.2 `input` additions

| field | shape | meaning |
|---|---|---|
| `buttons.focus` | `"ok" \| "cancel" \| null` | `updateButtons(owner, label1, label2, enable1, enable2, **focus1**)` **[jar]** already carries it. Space activates the focused button; that is how the desktop behaves, and it is why "space = OK" is not a Forge shortcut. |
| `selectable.playerIds` | `number[]` | which seats are clickable. **Player ids never travel in `cardIds`.** Today §4's `mode: "players"` leaves the reader to guess. **Shipped as amendment M66**, nullable (`null`: the bridge cannot say). |
| `weak` | `number[]` | already specified in §4; `[]` until M5 fills it. |

### 10.3 `act` additions

| action | body | maps to |
|---|---|---|
| `passPriority` | — | listed in §2.2's table (`from: M6`), because the server must tolerate any `act` at any time and the two ends must agree on the spelling; `IGameController.passPriority()` **[jar]**. |
| `yieldTo` | `{kind: "endOfTurn" \| "stack" \| "marker", playerId?, phase?}` | one act for all three engine mechanisms: `SetAutoPassUntilEndOfTurn`, `StackYield`, `SetMarker`, all through `sendYieldUpdate(YieldUpdate)`. All three are cancelled by the same `buttonCancel`. |
| `newGame` | `{mode: "continue" \| "new" \| "quit"}` | `nextGameDecision(NextGameDecision…)`. Supersedes the bare `nextGame` of §2.2, or redefines it to take a mode. |
| `setYield` | `{yieldKey, mode}` | `setShouldAutoYield(key, …)`, keyed by the bridge-minted handle above — **a `cardId` cannot express it**. |
| `useMana` | `{color}` | already narrowed in §2.2: a `cardId` is a `clickCard`. |

**And one that does not exist:** there is **no `autoPay` act**. Auto Pay is
`InputPayMana`'s own label on the OK button, exactly as Undo and End Turn are
`InputPassPriority`'s labels on Cancel. Render `buttons.*.label` verbatim and send
`buttonOk` / `buttonCancel` (§2.2, report 11 §0.1, §6.1).

### 10.4 Deliberately not planned

- `state_patch` / merge-patch deltas (§3.5) — a documented future server-side
  change, not a v1 feature.
- A "hold priority" flag. **Forge has no such feature**: it always returns
  priority to a human after they cast (report 10 §0). Rendering a toggle with no
  engine behind it would be client-side rules logic.
- Anything derived. If the client would have to compute it, the field belongs in
  `state`, computed by the engine, or it does not belong at all.
