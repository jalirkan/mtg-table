# M5 evidence — the probe decks, and which ask kinds the engine can actually reach

Status: engine-side evidence for M5, 2026-09-12. Scope: the **six ask kinds that
had no engine evidence** (`confirm`, `options`, `text`, `assign_amount`,
`manipulate_list`, `sideboard`), the two typed acts with no client that sent them
(`useMana`, `clickAbility`), and the tooling for PLAN.md M5's exit criterion.

Everything below was run in the `m5` worktree against the 2.0.14 jar
(`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`), from
a clean `bridge/out`.

---

## 0. The headline

**Four of the six kinds now have a recording. Two are unreachable and the proof
is in the bytecode, not in a failed search.**

| kind | before M5 | after | how |
|---|---|---|---|
| `choose_entities` **with a `delayedReveal`** | one uncommitted console session | **`fixtures/games/human-search-7.jsonl`**, 7 asks | `decks/search-probe.dck` — Rampant Growth |
| `assign_amount` | none | **`fixtures/games/human-amount-7.jsonl`**, 10 asks | `decks/amount-probe.dck` — Manamorphose |
| `confirm` | none | **`fixtures/games/human-amount-7.jsonl`**, 2 asks | the same deck plus `--mana-lost-prompt` |
| `text` | none | **`fixtures/games/human-number-7.jsonl`**, 6 asks | `decks/number-probe.dck` — Volcano Hellion |
| `manipulate_list` | none | **unreachable** with D13's pref off — §3 | one call site in the whole jar, pref-gated |
| `options` | none | **unreachable at all** — §4 | `IGuiGame.showOptionDialog` has **zero** call sites in the jar |
| `sideboard` | none | **still none**, and `--games 2` is not enough — §5 | needs M6's multi-game session |

And the two acts:

| act | before M5 | after |
|---|---|---|
| `useMana` | no client sent it; PLAN.md M5 calls it "the one real dead end" | **12 acts in `fixtures/games/human-amount-7.jsonl`**, each one measurably spending a floating mana (§6) |
| `clickAbility` | the console seat only; "the browser never has" | **7 acts in `fixtures/games/human-ability-42.jsonl`** (in-process) and 7 more over the **socket** in `check-all.sh` step 10f (§7) |

**No wire shape changed.** Every ask body the probes produced already matched
`docs/protocol.md` §5.2 as written, `tools/check-redaction.mjs`'s exact-key-set
check passed on all four new fixtures, and no field's type, default, `min`/`max`
or `delayedReveal` shape needed correcting. The protocol amendment dated
2026-09-12 records reachability, not a change of shape.

---

## 1. The per-kind table

`lines` is the frame log's line count including the §8.1 header. Every recording
is `--transport auto`, and every one of them was run through
`tools/check-redaction.mjs` with **no flags** (CLAUDE.md: never
`--pre-amendment`, never `--opponent-library-ok`).

| kind | card / Forge call | deck | fixture | what the ask body looked like | what answered it |
|---|---|---|---|---|---|
| `choose_entities` + `delayedReveal` | **Rampant Growth**, `A:SP$ ChangeZone \| Origin$ Library \| ChangeType$ Land.Basic \| ChangeNum$ 1` → `ChangeZoneEffect` builds a `DelayedReveal` over the whole library (`ChangeZoneEffect.java:1042-1062`) → `PlayerControllerHuman.chooseSingleEntityForEffect:596-618` → `IGuiGame.chooseSingleEntityForEffect` | `decks/search-probe.dck` (20 Forest, 20 Rampant Growth) | `fixtures/games/human-search-7.jsonl` — 776 lines, 7 `choose_entities` + 4 `choose_list` | `prompt:"Select a card from your library"`, `min:0`, `max:1`, 14 options (each a `kind:"card"` Forest with a full `card` object), `delayedReveal:{owner:0, zones:["library"], messagePrefix:"Rampant Growth - Looking at cards in ", cards:[31 Cards]}` | `[0]` — the probe policy picks one card so the search actually fetches (§8) |
| `assign_amount` | **Manamorphose**, `A:SP$ Mana \| Produced$ Combo Any \| Amount$ 2` → `ManaEffect.java:89-91` (`colorsNeeded == null && amount > 1 && !Each`) → `PlayerControllerHuman.specifyManaCombo:340-366` → `IGuiGame.assignGenericAmount` | `decks/amount-probe.dck` (20 Mountain, 20 Manamorphose) | `fixtures/games/human-amount-7.jsonl` — 1,186 lines, 10 `assign_amount` | `sourceCardId:28`, `total:2`, `atLeastOne:false`, `label:"mana"`, `targets:[{id:0,label:"white",kind:"color",max:2}, …blue, black, red, green]` | `{"0":2}` — **the colour-keyed branch of §5.3**, which until now existed only in `AskSelfTest` |
| `confirm` | **`InputPassPriority.passPriority`** (`InputPassPriority.java:304-326`), the floating-mana warning. The only `IGuiGame` confirm a human seat reaches — §2 | the same deck, plus `--mana-lost-prompt` | the same fixture — 2 `confirm` | `prompt:"You have mana floating in your mana pool that could be lost if you pass priority now."`, `title:"Mana Floating"`, `yesLabel:"OK"`, `noLabel:"Cancel"`, `defaultYes:true`, `card:null` | `true` — the engine's own default button (§9) |
| `text` | **Volcano Hellion**, `SVar:TrigDmg:DB$ ChooseNumber \| ChooseAnyNumber$ True` → `ChooseNumberEffect.java:72` → `PlayerControllerHuman.announceRequirements:395` → `getGui().getInteger(msg, 0, 99, 9)` → `AbstractGuiGame.getInteger:819-864`'s **"Other…"** branch → `showInputDialog` | `decks/number-probe.dck` (24 Mountain, 16 Volcano Hellion) | `fixtures/games/human-number-7.jsonl` — 1,358 lines, 6 `text` + 11 `choose_list` | `prompt:"Enter a number between 0 and 99:"`, `title:"Choose amount of damage to be dealt for Volcano Hellion"`, `initial:""`, `suggestions:[]`, `numeric:true` | `"0"` (**all six** — see §10.1) — and the `choose_list` in front of it is the giveaway shape: ten `kind:"number"` options `0`…`9` plus exactly one `kind:"text"` option labelled `Other...`, answered `[10]` |
| `ability_menu` + the `clickAbility` **act** | **A.I.M. Scientists** ({3}{U} cast + `K:TypeCycling:Basic:2`) — two playable abilities, so `getAbilityToPlay` raises a real menu (D20/D22) | `decks/pacho-shield.dck`, seed 42 | `fixtures/games/human-ability-42.jsonl` — 1,595 lines, 7 `ability_menu`, **7 `clickAbility` acts** | `cardId:2`, two options: `{abilityId:444, canPlay:true, label:"A.I.M. Scientists - Creature 3 / 3"}` and `{abilityId:443, canPlay:true, label:"Basic landcycling {2} (…"}` | the menu is answered **`null`** and the same choice is then made as `act {action:"clickAbility", cardId:2, abilityId:444}`; the next `input` is `"A.I.M. Scientists - Creature 3 / 3\n\nPay Mana Cost: {3}{U}"`, i.e. the act reached `IGameController.selectAbility` and Forge moved on |
| `manipulate_list` | — | — | — | **unreachable**, §3 | — |
| `options` | — | — | — | **unreachable**, §4 | — |
| `sideboard` | — | `decks/sideboard-probe.dck` exists and is right | — | **not reached**: `--games 2` is necessary and not sufficient, §5 | — |

Reproduce all five recordings:

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-search-7 --deck decks/search-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt --seed 7 \
    --game-id human-amount-7 --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-number-7 --deck decks/number-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 42 --game-id human-ability-42
# then, for each:  cp var/games/<id>/frames.jsonl fixtures/games/<id>.jsonl
```

`--deck2 decks/morph-probe.dck` is load-bearing on the three probe rows for the
reason `docs/evidence/m2-console.md` §9.3 already measured: leaving it off
changes what the engine asks. `human-ability-42` deliberately has none — it is
`pacho-shield` against itself, exactly like `human-auto-42`.

---

## 2. `confirm` — one reachable call site, and it needs one preference

`IGuiGame.confirm` and `IGuiGame.showConfirmDialog` are **twelve** call sites in
the 2.0.14 jar. Scanned mechanically rather than read:

```bash
cd <a directory holding the jar's forge/ classes>
for f in $(grep -ral confirm --include='*.class' .); do
  cls=$(echo "$f" | sed 's|^\./||; s|\.class$||; s|/|.|g')
  java -m jdk.jdeps/com.sun.tools.javap.Main -p -c -cp "$FORGE_JAR" "$cls" \
    | awk -v C="$cls" '/^  [a-zA-Z].*\(.*\);$/ {m=$0}
        /InterfaceMethod forge\/gui\/interfaces\/IGuiGame\.confirm:/ {print C " :: " m}'
done
```

| call site | why it does not produce an `ask` for us |
|---|---|
| `PlayerControllerHuman.confirmTrigger` (`:826`) | inside `if (getGui().isLibgdxPort())`; the else branch is `InputConfirm.confirm`, the **input** path |
| `PlayerControllerHuman.confirmReplacementEffect` (`:1487`) | same |
| `PlayerControllerHuman.confirmPayment` (`:2073`) | same |
| `PlayerControllerHuman.notifyOfValue` (`:1882`) | same; the else branch is `IGuiGame.message`, i.e. our `notice` |
| `HumanCostDecision.confirmAction` (`:1532`) | same |
| `InputConfirm.confirm` (`:69-78`) | **the guard itself**: `if (controller.getGui().isLibgdxPort()) return getGui().confirm(...)`, else build an `InputConfirm` and `showAndWait()` |
| `PlayerControllerHuman$DevModeCheats` ×3 | dev-mode cheats; we never call them |
| `InputConfirmMulligan.onCardSelected` (`:119`) | **not** libgdx-guarded — but it is Serum Powder only, and it runs on the **click thread**, where R2 forbids blocking, so `WireGuiGame.confirm` returns `defaultIsYes` locally and emits no ask |
| `PlayerControllerHuman$DevModeCheats.dumpGameState` | dev mode |
| **`InputPassPriority.passPriority`** (`:304-326`) | **this one works.** |

The one that works, in full:

```java
private void passPriority(final Runnable runnable) {
    if (FModel.getPreferences().getPrefBoolean(FPref.UI_MANA_LOST_PROMPT)) {
        …
        if (player.getManaPool().willManaBeLostAtEndOfPhase() && …) {
            //must invoke in game thread so dialog can be shown on mobile game
            ThreadUtil.invokeInGameThread(() -> {
                …
                if (getController().getGui().showConfirmDialog(message, "Mana Floating", "OK", "Cancel")) {
                    runnable.run();
                }
            });
            return;
```

Two things make it reachable where the other eleven are not: it is **not**
`isLibgdxPort`-guarded, and Forge itself hops to a `Game-n` thread before
calling, so `ThreadUtil.isGameThread()` is true and `WireGuiGame.showConfirmDialog`
emits the ask instead of answering locally. The thread it runs on is a *second*
`Game-n` from Forge's cached pool, which is decision **D22**'s situation exactly:
the real game thread is parked inside `InputPassPriority.showAndWait()` and
cannot mutate the view graph until the input is stopped, and the input is not
stopped until the confirm returns.

**The preference.** `FPref.UI_MANA_LOST_PROMPT` defaults to `"false"`
(`ForgePreferences.java:123`), so on stock settings this prompt never appears.
`MtgTable --mana-lost-prompt` sets it **in memory only**, never `save()`, exactly
like D13's pref — and it is a flag rather than a new default because it changes
how the *user's* game plays, which is not M5's call to make. It is Forge's own
user-facing option and belongs on M6's comfort list.

---

## 3. `manipulate_list` is unreachable with `UI_SELECT_FROM_CARD_DISPLAYS` off

`IGuiGame.manipulateCardList` has exactly **one** caller in the 2.0.14 jar:

```
=== InterfaceMethod forge/gui/interfaces/IGuiGame.manipulateCardList callers ===
  forge.player.PlayerControllerHuman  (1 call site(s))
```

and the chain above it is one deep and pref-gated. `PlayerControllerHuman`'s own
`manipulateCardList(String, Iterable, Iterable, boolean, boolean, boolean)` is
called from `arrangeForMove` and nowhere else; `arrangeForMove` is called from
`arrangeForScry` and nowhere else; and `arrangeForScry`'s call to it is inside
the branch D13 turns off. From `javap -c` of the jar (not the 2.0.15 source):

```
  public …ImmutablePair<…> arrangeForScry(forge.game.card.CardCollection);
      27: invokestatic  #286   // Method forge/model/FModel.getPreferences:…
      30: getstatic     #612   // Field …FPref.UI_SELECT_FROM_CARD_DISPLAYS:…
      33: invokevirtual #298   // Method …ForgePreferences.getPrefBoolean:(…)Z
      36: ifeq          110                      <-- pref false: skip
      43: invokeinterface #615  // InterfaceMethod …IGuiGame.isLibgdxPort:()Z
      48: ifne          110                      <-- libgdx: skip
      83: invokevirtual #1240  // Method arrangeForMove:(…)
```

`Bootstrap.initializeModel` sets that pref to `"false"` in **every** process
(decision D13), and `HeadlessGuiBase` is not the libGDX port, so control always
takes the `110` branch — `willPutCardOnTop` for scry 1 (a `confirm` on the
*input* path, which is what `decks/scry-probe.dck` records) or
`getGui().many(...)` over the top N for scry N (a `choose_list`).

So `manipulate_list` cannot be probed without reverting D13, and reverting D13 is
the thing that ships the player's whole library to the browser (report 06 §P4,
report 08 §5). **The kind stays implemented, `AskSelfTest`-checked and
shape-pinned, with no recording, on purpose**, and `docs/protocol.md` §5.3 now
says so.

---

## 4. `options` has no call site at all

`IGuiGame.showOptionDialog` is declared, implemented by `CMatchUI` /
`RemoteClientGuiGame` / `HeadlessNetworkGuiGame` / us — and **called by nothing**.
Every `showOptionDialog` call in the jar resolves to `forge.gui.util.SOptionPane`
(which delegates to `IGuiBase`, a different interface, implemented by our
`HeadlessGuiBase`) or to the desktop `forge.toolbox.FOptionPane`:

```
=== every bytecode CALL of a method named showOptionDialog (owner shown) ===
      5   forge.toolbox.FOptionPane            -> Method showOptionDialog:
      4   forge.gamemodes.quest.QuestTournamentController -> Method forge/gui/util/SOptionPane.showOptionDialog:
      4   forge.download.AutoUpdater           -> Method forge/gui/util/SOptionPane.showOptionDialog:
      3   forge.screens.match.CMatchUI         -> Method forge/toolbox/FOptionPane.showOptionDialog:
      3   forge.gui.util.SOptionPane           -> Method showOptionDialog:
      1   forge.gui.util.SOptionPane           -> InterfaceMethod forge/gui/interfaces/IGuiBase.showOptionDialog:
      …   (every remaining row is a desktop screen calling FOptionPane)
=== InterfaceMethod forge/gui/interfaces/IGuiGame.showOptionDialog callers ===
  (none)
```

This is stronger than "unreachable for a human seat": in Forge 2.0.14 the method
is dead code on the `IGuiGame` interface. The `options` ask kind therefore has no
engine evidence and cannot get any, and that is a fact about Forge rather than a
gap in our probing.

---

## 5. `sideboard` — `--games 2` is necessary and not sufficient

`IGuiGame.sideboard` has one caller, `PlayerControllerHuman.sideboard(Deck,
GameType, String)` (`:245-280`), which `Match.java:278` calls **between games of a
match** and which returns early when `sbSize == 0 && mainSize == deckMinSize`. So
a probe needs (a) more than one game per match and (b) a deck with a real
`[sideboard]` section. `decks/sideboard-probe.dck` is (b) —
18 Forest / 22 Garruk's Companion main, 15 Giant Growth side — and `MtgTable
--games 2` is the one-line (a):

```java
rules.setGamesPerMatch(a.games);   // was the literal 1
```

Measured, that is not enough:

```
$ ./bridge/run.sh mtgtable.MtgTable --transport auto --probe --games 2 --seed 7 \
      --game-id probe-sideboard-7 --deck decks/sideboard-probe.dck --deck2 decks/morph-probe.dck
games/match   = 2
finished      = true
winner        = Forge AI, reason = AllOpponentsLost
ask kinds     = [assign_damage, choose_list]
members fired = 12 of 37 [… no `sideboard` …]
```

and the last frame of the log is

```json
{"type":"over","body":{"winner":1,"reason":"AllOpponentsLost","matchOver":false}}
```

**`matchOver:false` is the whole finding.** The protocol already carries the
fact; the *session* does not survive it. `WireGuiGame.emitOver` counts down the
`finished` latch and sets `overEmitted`, `MtgTable.run`'s `awaitFinish` returns
and closes the transport and the gui, and — separately — `WireGuiGame.ask`'s very
first lines are `if (closed || overEmitted) return null; // degrade, never
wedge`, so even a `sideboard` call that did arrive would be answered `null`
without an ask ever reaching the wire.

Making it fire is **M6's** row, not M5's: PLAN.md M6 is "New Game without
restarting the JVM (`HostedMatch.restartMatch`)", and a session that survives
`matchOver:false` is the same piece of work. The deck and the flag are committed
so that whoever does it has the probe ready; `--games` defaults to 1 and nothing
in the gate passes it.

---

## 6. `useMana` — the engine path, and what the client must send

**The engine path.** `IGameController.useMana(byte)` →

```java
// PlayerControllerHuman.java:2738-2742
public void useMana(final byte mana) {
    if (inputQueue.getInput() instanceof InputPayMana ipm) {
        ipm.useManaFromPool(mana);
    }
}
```

→ `InputPayMana.useManaFromPool` (`:197-204`) →
`player.getManaPool().tryPayCostWithColor(colorCode, saPaidFor, manaCost, …)`.
Two consequences the client must know:

1. **It is silently ignored unless the current input is an `InputPayMana`.** No
   exception, no `notice`, no state change — `instanceof` fails and the method
   returns. The board should only offer the control while a payment is up.
2. **Floating mana is not applied for you.** `InputPayManaOfCostPayment` only
   auto-pays from the pool when `spellAbility.getPayCosts().isMandatory()`
   (CR 118.3c, `:28-32`). For an ordinary cast the mana sits in the pool until
   the player clicks a pip — or presses the engine's own **`Auto`** button, which
   runs `ComputerUtilMana.payManaCost` and drains the pool for them. That is why
   the probe sends `useMana` *before* pressing OK: press OK first and the act
   would be untestable.

**What the client sends** (`docs/protocol.md` §2.2, unchanged):

```json
{"v":1,"seq":n,"t":…,"type":"act","body":{"action":"useMana","color":"white"}}
```

`color` is a **name**, not a `cardId` and not a symbol: the bridge does
`MagicColor.fromName(String.valueOf(col))`, which accepts `white`/`blue`/`black`/
`red`/`green`/`colorless` and also the single letters `w`/`u`/`b`/`r`/`g`/`c`
(`MagicColor.java:40-71`). A two-character string is parsed as a *pair* of
colours, so `"WU"` is not "white" — send the full name.

**Measured.** `fixtures/games/human-amount-7.jsonl`, 12 `useMana` acts. Pairing
each act with the next `state`, the pool moves:

```
useMana white  pool before {"W":2,"U":0,…}  after {"W":1,"U":0,…}
useMana white  pool before {"W":2,"U":0,…}  after {"W":1,"U":0,…}
…
```

(Two of the twelve land while the pool is already being rebuilt by the next
Manamorphose and show `W:2 → W:2`; the act is still legal and still dropped
harmlessly, which is §2.2's "tolerate any act at any time".) The `{W}{W}` is
Manamorphose's own output — the probe answers `assign_amount` with
`{"0": total}`, and index 0 of `ColorSet.getOrderedColors()` for "any colour" is
white — and the mana it pays is the generic `{1}` of the *next* Manamorphose's
`{1}{R/G}`.

---

## 7. `clickAbility` from a non-console client

`tools/ws-auto-play.mjs --probe` answers every `ability_menu` with `null` and
then sends the same choice as an act:

```json
{"type":"act","body":{"action":"clickAbility","cardId":2,"abilityId":444}}
```

Both keys, as §2.2's row declares them — the bridge resolves `abilityId` alone
through `abilityIndex`, and a client that sent only that would be relying on an
emitter detail rather than on the documented act.

Measured over the socket, seed 42, `decks/pacho-shield.dck`:

```
[ws-auto] frames in 1355, out 239 · states 237 · inputs 946 · acts 221 ·
          asks 16 answered 16 · notices 154 ·
          ask kinds ability_menu,assign_damage,choose_list,order ·
          probe acts 0 useMana, 7 clickAbility · 35.4s
[ws-auto] OVER — exit 0
```

and in the bridge's own log, 7 `clickAbility` acts, **0** `"Unknown ability"`
notices. `tools/check-all.sh` step **10f** is that run, asserted: at least one
`clickAbility` act and no unresolvable one.

Answering the menu `null` is not a trick — §5.3 says it means "never mind", the
game does not advance and nothing is spent, and Forge's input is still the one
that asked. The act is then applied through the identical
`IGameController.selectAbility` call the answer would have made
(`WireGuiGame.applyAsyncAbilityMenu` vs `applyAct`'s `clickAbility` arm), which
is what makes this a test of the **act** and not of the menu.

---

## 8. The probe policy, and why it is a flag

`AutoTransport.setProbe(true)` / `MtgTable --probe` / `ws-auto-play --probe`.
Four decisions taken the other way, and nothing else:

| | default policy | `--probe` |
|---|---|---|
| `choose_entities` with `min: 0` | `[]` — "none", so an optional library search fetches nothing and the answer marshalling never runs | `[0]` |
| `choose_list` that is `getInteger`'s option list (all `kind:"number"` plus one `kind:"text"`) | the minimum, i.e. `[]` → `getInteger` returns null | the index of the text option → `showInputDialog` |
| an `input` that is an `InputPayMana`, with a non-empty mana pool | press the engine's `Auto` button | `act useMana` for each non-empty colour first |
| `ability_menu` | answer the index | answer `null`, then `act clickAbility` |

It is a flag, not a new default, because the default is what PLAN.md M5's ten
consecutive games are asserted against and what the M2/M3 fixtures were recorded
with. A policy that reaches further also loses more games and takes longer to do
it, and the two must not be confused.

**`tools/ws-auto-play.mjs` mirrors it line for line**, for the same reason the
rest of that file mirrors `AutoTransport`: the point of the ws client is that the
*same* policy plays a game through `WsTransport`.

---

## 9. Two policy answers that were legal and still dead ends

> **Superseded in part, 2026-09-12 — see `docs/evidence/m5-fixes.md` §1.** The
> `confirm` backstop described below as *"a flip after two identical prompts"*
> **latched** rather than alternated, and reproduced the very loop it was written
> to prevent: 2,278 identical asks and a 35 MB frame log in one 300 s step, with
> and without `--probe`. It now alternates, the counters clear whenever the game
> makes progress, and a ceiling of 20 identical asks concedes. The two numbered
> findings below are still correct about what the *engine* does.

Both found by running a probe, both fixed in the **default** policy:

1. **`confirm` answered `false` forever.** The first amount-probe run produced
   **969 identical `confirm` asks** before it was killed. The floating-mana
   prompt's "no" means *do not pass priority*, so `false` returns to the same
   input, which passes priority again, which asks again. The answer is now the
   body's own **`defaultYes`** — which is also §5.4's null default
   (`RemoteClientGuiGame.java:451-454`: `result != null ? result : defaultIsYes`)
   — and from the third identical prompt **with no progress in between** the
   answer alternates, as the backstop for the mirror-image case. (The first
   version of that backstop latched; see the note at the top of this section.)
2. **`text` answered `""` forever.** `AbstractGuiGame.getInteger`'s "Other…"
   branch is a `while (true)` that re-asks until the string parses as a number
   **inside its own `[min,max]`** — bounds the `text` ask body does not carry. So
   `""` is an infinite ask loop that looks exactly like a wedge. A numeric `text`
   ask is now answered `null` by default ("that is 'cancel'",
   `AbstractGuiGame.java:857`) and `"0"` once per prompt under `--probe` —
   "per prompt" meaning *per prompt since the game last made progress*, so the
   six Volcano Hellion casts in `human-number-7.jsonl` are six separate
   questions and all six are answered `"0"`. The board has the same rule since
   amendment **M29**: its one-click *Default* for a numeric `text` ask is `null`,
   not `initial`.

Neither was reachable before M5, which is precisely why neither had been found:
they are the shape of defect a kind with no engine evidence hides. The *third*
defect of the same shape — the latching backstop — was not reachable by anything
in the gate either, and that is why `tools/ten-games.sh` now asserts a per-kind
ask ceiling (`docs/evidence/m5-fixes.md` §1).

---

## 10. The exit criterion: `tools/ten-games.sh`

```bash
./tools/ten-games.sh              # ten games, seeds 1..10
./tools/ten-games.sh --games 3    # the first three rows
```

Ten consecutive `--transport auto` games, **alternating the user's own deck and
the probe decks** — ten games of one deck would prove the engine does not
dead-end on the paths that deck reaches, and every kind M5 added evidence for is
on a path `pacho-shield` does not take.

| seed | deck | flags |
|---|---|---|
| 1, 3, 5, 7 | `decks/pacho-shield.dck` | — (9 adds `--probe`) |
| 2 | `decks/search-probe.dck` | `--probe` |
| 4 | `decks/amount-probe.dck` | `--probe --mana-lost-prompt` |
| 6 | `decks/number-probe.dck` | `--probe` |
| 8 | `decks/trample-probe.dck` | — |
| 10 | `decks/scry-probe.dck` | `--probe` |

Six assertions per game: exit 0 and `MTGTABLE OK`; `finished = true`;
`UNIMPL members = none` **and** not one raw `UNIMPL` line in the server log or
the frame log (two different questions — the summary is a set the emitter
maintains, the grep is the text `unimpl()` actually writes); `emit errors = 0`;
exactly one `over` and it is the last line; and `check-redaction.mjs` over the
whole frame log.

It is **step 9c** of `tools/check-all.sh` — a lettered sub-step and not step 11,
so that every "step 10d" reference in `CLAUDE.md` and the evidence files stays
correct. `SKIP_TEN=1` skips it. It is the single most expensive thing in the
gate.

### The run, 2026-09-12

```
== ten-games: 10/10 games reached `over`, zero UNIMPL, every log through check-redaction ==
  seed 1   pacho-shield             16 (round 8)           29s       [choose_list, ability_menu]
  seed 2   search-probe             16 (round 8)           17s       [choose_entities, choose_list]
  seed 3   pacho-shield             13 (round 7)           20s       [order, choose_list]
  seed 4   amount-probe             14 (round 7)           27s       [assign_amount, confirm, choose_list]
  seed 5   pacho-shield             13 (round 7)           32s       [choose_list, ability_menu]
  seed 6   number-probe             21 (round 11)          29s       [choose_list, text, order]
  seed 7   pacho-shield             13 (round 7)           25s       [order, choose_list, ability_menu]
  seed 8   trample-probe            21 (round 11)          30s       [choose_list]
  seed 9   pacho-shield             24 (round 12)          31s       [ability_menu, order, choose_list]
  seed 10  scry-probe               18 (round 9)           27s       [choose_list]
  ask kinds seen across the run: ability_menu assign_amount choose_entities choose_list confirm order text
  total wall: 268s
TEN GAMES OK
```

**Seven of the eleven kinds in one command**, 268 s, 165 player turns, zero
`UNIMPL`, ten `PASS` lines from `check-redaction.mjs`. `var/ten-games/` holds
every server log and every redaction report.

Two things the table says that a green line would hide. Seed 8 is
`trample-probe` and it produced **no `assign_damage`** this time — the ask needs
two blockers on one attacker or a trampler that gets through, and which of those
a shuffle produces is not something a seed guarantees; the committed
`human-trample-7.jsonl` is where that kind's evidence lives, not here. And seed
10 is `scry-probe`, whose point is `input.focusCard` and not an ask kind at all
(`docs/evidence/m2-console.md` §9.3), so `[choose_list]` is the expected row.
**This gate asserts that nothing dead-ends, not that every kind fires.**

> **2026-09-12, the fix pass.** Both caveats are now *in the script* rather than
> only here: the `ROWS` comment says beside seed 8 why `assign_damage` is not a
> seed-guaranteed kind, each row names the kind it exists to force, and a missing
> one prints an `ADVISORY:` line that is never an exit code. The script also grew
> a real assertion in the same place — **no more than 150 asks of any one kind in
> one game** — because the one wedge every other assertion is blind to is a loop
> on a single ask, and one shipped (`docs/evidence/m5-fixes.md` §1).

---

## 11. The gate, run green twice, today

`./tools/check-all.sh` from a deleted `bridge/out`, 2026-09-12, twice — the
second time on the final tree:

```
real    8m52.470s      real    8m51.938s
user    7m33.411s      user    7m32.891s
sys     0m25.061s      sys     0m25.641s
…                      …
check-all OK           check-all OK
```

It was **3 m 19–32 s** before M5 (CLAUDE.md, measured over four green runs); 9c's ten games are
269 s of the difference and 10f's sixth ws server most of the rest. That is the
price of the exit criterion being a gate step rather than a command someone
remembers to type, and `SKIP_TEN=1` is there for the times it is too much.

It is **thirteen numbered steps and three lettered sub-steps** now: 9b (the
advisory fixture-drift multiset diff), **9c** (`ten-games.sh`, above) and **10f**
(`ws-auto-play --probe`), plus 10a–10e as before. The new numbers:

| step | what it said |
|---|---|
| 3 | `JsonSelfTest: 38`, **`AskSelfTest: 76`** (was 62 — §9's two dead ends are now unit-checked; **106** after the fix pass), `GameLogSelfTest: 35`, all 0 failures |
| 6 | `OK: 377 normalised lines identical to fixtures/games/g1.jsonl` — the emitter did not move |
| 9b | `MULTISET IDENTICAL: 1588 frame(s)` against `human-auto-42.jsonl` — **the probe policy is a flag and the default did not change**, which this step is the proof of |
| **9c** | `10/10 games reached \`over\`, zero UNIMPL, every log through check-redaction`, 269 s, seven of the eleven kinds |
| **10f** | `probe acts 0 useMana, 7 clickAbility`, then `OK: 7 clickAbility act(s) over the socket, none of them unresolvable` |
| 11 | every committed fixture PASS, including the four new ones |
| 13 | web: **374** `node --test` (369 pass, 0 fail, 5 skipped) + **54** vitest, over a corpus that now includes the four new fixtures — `render.test.tsx` mounts `<Board/>` for every frame of each |

`AskSelfTest`'s new `policy()` block has teeth. Mutating the two fixes of §9 back
to what they were:

```
AskSelfTest: 76 check(s), 3 failure(s)
  FAIL confirm answers defaultYes=true with true
  FAIL the same confirm prompt, 2nd time
  FAIL a NUMERIC text ask is cancelled by default
```

It lives in `AskSelfTest` rather than beside the transport because nothing else
in the repo would notice a regression: the corpus contains no `confirm` or `text`
ask except the two M5 fixtures, and **a fixture replays an answer rather than
recomputing it**.

---

## 12. What M5's engine side did not do

- **`sideboard` has no recording** and cannot have one until the session
  survives `matchOver:false` (§5). The deck and the `--games` flag are there.
- **`manipulate_list` and `options` have no recording and never will** in this
  configuration (§3, §4). Both remain implemented, `AskSelfTest`-driven and
  shape-pinned by `ASK_SHAPES`; that is now a documented ceiling rather than an
  open gap.
- **`--mana-lost-prompt` is off by default**, so the `confirm` kind is still
  invisible in an ordinary game. Turning it on for the user is an M6 comfort
  decision.
- **The `useMana` and `clickAbility` acts still have no control on the board.**
  This file is the engine half: the acts work, the client that sends them is a
  script, and the browser's half is the other M5 agent's.
- **`assign_damage` with a `maySkip` of true, `order` with `sideboardMode`, and
  `choose_list` with `reveal: true`** are still un-recorded corners of kinds that
  are otherwise evidenced. They were not chased: none of them is a *kind* without
  evidence, which is what this milestone was scoped to.

---

## 13. Status — the documentation pass, 2026-09-12

What this file's findings became, plus one correction to §12 that should not
survive into M6's reading of it.

**Where each finding now lives.**

- **`PLAN.md` §M5** carries the commands (`scripts/play.sh`,
  `tools/ten-games.sh`, the three probe runs), an **eleven-kind** evidence table
  (nine recorded, two documented ceilings), the thirteen **M5 follow-ups** and a
  **"What M5 hands to M6"** section. Follow-up 1 is the `sideboard` row of §5 and
  follow-up 2 is §2's preference.
- **`README.md`** documents the five probe decks as a table — what each one is
  for, and that `sideboard-probe` does not fire yet — plus `--probe`,
  `--mana-lost-prompt`, `--deck2` and `ten-games.sh`.
- **`DECISIONS.md` D35** is §3, §4 and §8 as a dated decision: the two
  unreachable kinds are **ceilings** rather than gaps, and the probe policy is a
  **flag** because the default is what the exit criterion measures.
- **`CLAUDE.md`** gains six M5 conventions, two of them from this file: the
  probe-flag rule (including *do not re-record a committed fixture with
  `--probe`*), and *a typed act earns its gate in `ten-games.sh`'s sixth `ROWS`
  field — with its **effect**, not just its count*.

**Correction to §12.** Two of the three "un-recorded corners" listed there are in
fact recorded. Counted with `grep -o` over the fifteen committed recordings in
`fixtures/games/`:

| field | §12 claimed | actually |
|---|---|---|
| `choose_list` with `reveal: true` | un-recorded | **22 asks**, across `human-amount-7`, `human-number-7`, `human-scry-7`, `human-search-7`, `human-trample-7` |
| `assign_damage` with `maySkip: true` | un-recorded | **2 asks** — `human-ability-42`, `human-auto-42` |
| `order` with `sideboardMode: true` | un-recorded | **correct**: 4 `order` asks, all `false` — and it is blocked on the same M6 work as the `sideboard` row (§5) |

So the only corner of an otherwise-evidenced kind that no engine recording
carries is `sideboardMode`, and it is not a separate piece of work: the session
that makes `sideboard` fire makes that one fire too. `PLAN.md` M5 follow-up 12
records the correction.

Everything else in §12 stands: `sideboard` has no recording, `manipulate_list`
and `options` never will in this configuration, `--mana-lost-prompt` is off by
default, and the `useMana` / `clickAbility` acts — which had no board control
when §12 was written — now have one (`docs/evidence/m5-board.md` §2 for
`useMana`; `clickAbility` is still script-only, `PLAN.md` M5 follow-up 9).

**The gate on this pass.** `rm`-free, from the tree as it stands, with the ws
steps on port **8663** (never the user's 8642):

```
WSPORT=8663 ./tools/check-all.sh      →  check-all OK      EXIT=0
real    8m52.621s      user    7m35.123s      sys     0m24.900s
```

| step | what it said |
|---|---|
| 3 | `JsonSelfTest: 38` / **`AskSelfTest: 106`** / `GameLogSelfTest: 35`, 0 failures |
| 6 | `OK: 377 normalised lines identical to fixtures/games/g1.jsonl` |
| **9b** | **`MULTISET IDENTICAL: 1588 frame(s)`** — the advisory drift the fix pass saw under load did **not** recur on a quiet machine; the default policy is still the default |
| **9c** | `10/10 games reached over, zero UNIMPL, every log through check-redaction`, **267 s**, seven kinds, and seed 4's `acts: useMana x18 (pool dropped after 7 of 18)` |
| **10f** | `probe acts 0 useMana, 7 clickAbility`, then `OK: 7 clickAbility act(s) over the socket, none of them unresolvable` |
| 13 | **377** `node --test` (372 pass, 0 fail, 5 skipped) + **55** vitest; `npm run build` clean |

No code changed in this pass — the diff is `PLAN.md`, `README.md`,
`DECISIONS.md`, `CLAUDE.md` and these two evidence files — so the run is a
regression check on the tree the documentation describes, not new evidence.
