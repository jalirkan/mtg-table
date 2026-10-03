# Match setup evidence

Status: evidence for the match-setup work, 2026-09-27, in the `match-setup`
worktree (`/home/justin-a/code/mtg-table-t2f`, based on main `0368a90`), against
the 2.0.14 jar (`forge-gui-desktop-2.0.14-jar-with-dependencies.jar`). Every
number below was measured, and the command that produced it is next to it.

This file has one section per part of match setup: **§D** the villain deck,
**§B** the bridge, the wire and the gate, **§P** what the four AI profiles
actually change, and **§R** the review's findings and what closed each one. §D and
§B were written by the work itself; §P and §R, and the dated notes inside §D and
§B that point at them, by the review fix pass (same day, same worktree). §R.3 is
the branch's rebase onto `main`'s `23e26b3` (the card library and Tier 2 slice 4)
and the second fix commit that followed it: `over` made terminal under load, the
arena's plates printing the match, and the one test the merge broke.

---

## D. A second real deck: `decks/doom-legion.dck`

### D.0 The headline

**The AI now has a deck of its own, and it plays through every gate the user's
deck does.** `decks/doom-legion.dck` — *Doom Legion (Marvel Super Heroes
villains)* — is 40 cards from MSH and MSC, blue-black, 23 spells and 17 lands:
Doctor Doom and his Doombots, HYDRA, three Kangs, Loki. What it is and how it
plays: [`decks/README.md`](../../decks/README.md). The card-by-card fidelity
review: [report 08 §8](../research/08-deck-card-coverage.md).

| check | result |
|---|---|
| every card has a Forge script, none unsupported, Limited-legal | **27 / 27**, 0 dropped (`tools/check-deck.mjs`, engine pass) |
| every card on Scryfall in the set its line names | **27 / 27** in `msh` / `msc`; mana, type, P/T, keywords identical; 3 display-only Oracle drifts |
| `web/public/art.json` covers it | **27 / 27** (`node tools/fetch-art.ts`, now every deck) |
| full wire path, `--transport auto` | **21 / 21 games** `MTGTABLE OK`, 1 `over`, 0 `UNIMPL`, 0 emit errors, `check-redaction.mjs` clean |
| the same, **before** one card swap | **8 / 10** — Kang Prime's library reveal fails the redaction gate (§D.3) |
| **review fix:** the second swap, Trickster's Stratagem → Crossbones, Malicious Mercenary | the AI never cast the Stratagem; after the swap **38 / 38 games** PASS with the AI on Doom Legion, and **all 20 nonland cards** reached the stack from the AI's side (§D.6) |

### D.1 The tool: `tools/check-deck.mjs`

New, plain Node, no dependencies, run from the repo root; paths come from
`config.json` (`forgeHome` → `res/cardsfolder/cardsfolder.zip`, `res/editions/`,
`custom-cards/`). Three passes — static, engine (`./bridge/run.sh mtgtable.Smoke
<deck>`), Scryfall — are documented at the top of the file and in
`decks/README.md`. What each costs, measured:

| pass | command | wall time |
|---|---|---|
| static | `node tools/check-deck.mjs decks/doom-legion.dck --no-engine` | 0.17 s |
| static, all eleven decks | `node tools/check-deck.mjs decks/*.dck --no-engine` | < 1 s; 11 PASS, 2 warnings (`AI:RemoveDeck:All` on Manamorphose and Volcano Hellion — seat-played probes, expected) |
| + Scryfall, 27 names | `… --no-engine --scryfall` | 13 s and 73 s on two runs (Scryfall's own latency) |
| + engine | `node tools/check-deck.mjs decks/doom-legion.dck` | 5–6 s (`FModel.initialize` 2.0–2.2 s, the mirror game 2.2–3.6 s) |

**Why the engine pass exists and is not a grep.** `Match.prepareAllZones` drops
every card whose `CardRules.isUnsupported()` is true, and nothing says so
(`Smoke.auditDeck`'s Javadoc). In the 2.0.14 jar that flag is set in exactly one
place — the placeholder `CardRules.getUnsupportedCardNamed(String)` builds
(javap: `putfield unsupported` at offset 117 of that method, the only write to
the field in `CardRules` or `CardRules$Reader`), which `CardDb.getRulesOrElseUnsupported` and
`CardDb.createUnsupportedCard` hand out for **a name with no script**. So the
static pass (a script whose `Name:` matches) and the engine pass answer the same
question from two sides. The engine pass also compares the card and
distinct-name counts Forge loaded with the file's, as a backstop — measured
below, an unknown name does **not** vanish: `DeckSerializer.fromFile` keeps it as
a placeholder in edition `???`, the audit counts it, and Limited conformance
rejects the deck by name.

**Negative controls, all run:**

| control | expected | got |
|---|---|---|
| a 39-card deck with `Doctor Doooom\|MSH`, `Doom Blade\|MSH`, `Kang Prime\|XYZ` | 5 failures | **FAIL, 5**: size 39 ≠ 40; no script for Doctor Doooom; Doctor Doooom and Doom Blade not in `Marvel Super Heroes.txt`; `XYZ` is no edition's `Code=` — exit 1 |
| `A.I.M. Scientists\|MSH` + 39 Island, `--scryfall --stock` (the overlay ignored) | the stray Trample (report 08 §2) | **MISMATCH** `keyword: Forge has K:Trample, the printed card does not` — exit 1 |
| the same without `--stock` (the D14 overlay, which the engine loads) | clean | **PASS** — exit 0 |
| a 40-card deck, `1 Doctor Doooom\|MSH` + 39 Swamp, **engine pass** | the engine's own verdict on a name with no script | **FAIL, 5**: static (no script, not in MSH) **and** engine — `deck sets = {MSH=39, ???=1}`, `would drop = 1 -- SILENTLY removed …`, Limited `contains the nonexisting card Doctor Doooom`, no `SMOKE OK`; the unsupported-text watcher counted 2 lines — exit 1 |
| `decks/pacho-shield.dck`, engine pass | clean, and the known benign `svar-fallback` | **PASS**: 40 cards / 28 distinct, `{MSC=10, MSH=30}`, 0 dropped, legal; `svar-fallback=1` (report 08 §3) |

### D.2 The deck's own run

```
$ node tools/check-deck.mjs decks/doom-legion.dck --scryfall
main: 40 cards, 27 distinct names; sideboard: 0
  lands 17, spells 23 (creatures 16); types Creature 16, Artifact 4, Enchantment 2, Instant 4, Sorcery 1, Land 17
  curve (mana value: cards) 1:2  2:7  3:6  4:6  5:1  6:1
  coloured pips U=10 B=16
  by set hint MSH=33 MSC=7
  … 27 × ok on Scryfall, except:
  note     Thriving Isle   MSC #581   oracle text drift (older "Thriving Isle enters tapped." templating)
  note     Thriving Moor   MSC #582   oracle text drift (the same)
  note     Hidden Lair     MSH #269   oracle text drift: Forge "…or if your control a basic land." / Scryfall "…if you control…"
  engine audit: ./bridge/run.sh mtgtable.Smoke decks/doom-legion.dck
  deck from file = Doom Legion (Marvel Super Heroes villains) (40 cards, 27 distinct)
  deck sets      = {MSH=33, MSC=7}
  would drop     = none (all 27 distinct names have a working card script)
  Limited        = legal
  mirror game    = winner AI-One, reason = AllOpponentsLost; 19 (round 10)
  watched output = svar-fallback=0, unsupported-text=0
  PASS — 0 failure(s), 0 warning(s)
```

The basics are checked for existence only. Scryfall's `named?exact=Swamp&set=msh`
lands on #291 and Forge's edition file lists Swamp at #281/282/291/292/437/438;
the tool compares against **every** collector number the edition lists for a
name (a first version compared against the first one only and reported a false
"collector number" mismatch for both basics).

### D.3 The card that did not survive: Kang Prime

The first version of the deck had **Kang Prime** (MSC #85, `{3}{U}{B}` 3/5
flyer) in the 5-drop slot. Ten `--transport auto` games, seeds 1–10:

| game | redaction |
|---|---|
| `doom-ai-1,2,4,5,6`, `doom-seat-7,8,9` | ok |
| `doom-ai-3` (Pacho vs the AI's Doom Legion, seed 3) | **FAIL** — lines 597, 734, 881, 1040 |
| `doom-mirror-10` (Doom Legion both seats, seed 10) | **FAIL** — line 1057 |

Every failure is the same assertion (A3): *"players[1] (NOT the viewing seat 0)
has N full card(s) in library.cards"*. Every one of those frames has **Kang
Prime's trigger on top of the stack** ("Whenever Kang Prime enters or attacks,
exile cards from the top of your library until you exile a nonland card…"), and
every card it exposed is in **exile, face up, in the next `state`**:

| frame | cards shown in the AI's `library.cards` | next `state` |
|---|---|---|
| `doom-ai-3:597` | HYDRA Troopers | line 600: exile |
| `doom-ai-3:734` | Kang the Conqueror | line 737: exile |
| `doom-ai-3:881` | Swamp, Island, Kang, Temporal Tyrant | line 884: all three in exile |
| `doom-ai-3:1040` | Unliving Legionnaire | line 1043: exile |
| `doom-mirror-10:1057` | Unliving Legionnaire | line 1060: exile |

The script is `DB$ DigUntil | Valid$ Card.nonLand | FoundDestination$ Exile |
RevealedDestination$ Exile`. `DigUntilEffect.resolve` calls
`GameAction.reveal(CardCollectionView, Player, boolean)` on the cards it digs
(javap: offset 697 of `resolve`), and the frames above catch them in that reveal
while they are still in the library — so `CardView.canBeShownTo(viewer)` is
honestly true for that frame and `Snap` is right to ship it: **it is a reveal,
not a leak** —
the lands before the hit and the hit itself are public a frame later. But the
gate cannot tell a reveal on the opponent's library from the largest leak there
is, and CLAUDE.md is explicit that `--opponent-library-ok` is never passed to
make a recording green. A deck the AI plays in `tools/ten-games.sh` would fail
the gate on every seed where Kang Prime resolves, so **Kang Prime was replaced
by Pharaoh Rama-Tut** (MSC #634, `{4}{U}` 4/4 ward 2 — one of Kang's earlier identities,
no library reveal) rather than the gate being loosened. Whether A3 should learn
`DigUntil`'s reveal is a question for `tools/check-redaction.mjs` and report 06,
not for this deck; the five frames above are the evidence it would need.

The logs are kept: `var/games/doom-ai-3/frames.jsonl`,
`var/games/doom-mirror-10/frames.jsonl`, and `var/deck-check/*.redaction.txt`.

### D.4 The final deck through the wire: 21 games

`./bridge/run.sh mtgtable.MtgTable --transport auto --seed <n> --game-id <id>
--deck <seat> --deck2 <ai> [--probe] [--ai-profile <p>]`, each game then held to
`tools/ten-games.sh`'s assertions by hand: exit 0 and `MTGTABLE OK`;
`UNIMPL members = none` and no `UNIMPL` line in the log or the frames; `emit
errors = 0`; exactly one `over`, last; `node tools/check-redaction.mjs` with no
flags; no ask kind over 150.

| game | seed | seat's deck | AI's deck | flags | turns | wall | asks |
|---|---|---|---|---|---|---|---|
| doom2-ai-1 | 1 | Pacho | Doom Legion | | 12 | 26 s | choose_list 1, ability_menu 4 |
| doom2-ai-2 | 2 | Pacho | Doom Legion | | 14 | 27 s | ability_menu 13, choose_list 2 |
| doom2-ai-3 | 3 | Pacho | Doom Legion | | 13 | 22 s | order 2, choose_list 5 |
| doom2-ai-4 | 4 | Pacho | Doom Legion | | 12 | 28 s | choose_list 10, ability_menu 11 |
| doom2-ai-5 | 5 | Pacho | Doom Legion | | 11 | 25 s | choose_list 19, ability_menu 18 |
| doom2-ai-6 | 6 | Pacho | Doom Legion | `--probe` | 17 | 20 s | order 1, choose_list 1 |
| doom2-ai-11 | 11 | Pacho | Doom Legion | | 12 | 19 s | choose_list 5, ability_menu 4 |
| doom2-ai-12 | 12 | Pacho | Doom Legion | | 16 | 28 s | choose_list 13, order 1 |
| doom2-seat-7 | 7 | Doom Legion | Pacho | | 15 | 25 s | — |
| doom2-seat-8 | 8 | Doom Legion | Pacho | | 17 | 26 s | order 1, choose_list 1 |
| doom2-seat-9 | 9 | Doom Legion | Pacho | `--probe` | 20 | 34 s | — |
| doom2-seat-13 | 13 | Doom Legion | Pacho | | 23 | 36 s | order 3 |
| doom2-seat-14 | 14 | Doom Legion | Pacho | `--probe` | 18 | 25 s | — |
| doom2-mirror-10 | 10 | Doom Legion | Doom Legion | | 14 | 24 s | order 1, choose_list 1 |
| doom2-mirror-15 | 15 | Doom Legion | Doom Legion | `--probe` | 19 | 37 s | — |
| doom2-mirror-16 | 16 | Doom Legion | Doom Legion | | 18 | 34 s | order 1, choose_list 1 |
| doom3-prof-11 | 11 | Pacho | Doom Legion | `--ai-profile Default` | 12 | 19 s | choose_list 5, ability_menu 4 |
| doom3-prof-12 | 12 | Pacho | Doom Legion | `--ai-profile Cautious` | 16 | 27 s | choose_list 13, order 1 |
| doom3-prof-13 | 13 | Pacho | Doom Legion | `--ai-profile Reckless` | 13 | 24 s | order 1, choose_list 1 |
| doom3-prof-14 | 14 | Pacho | Doom Legion | `--ai-profile Experimental` | 14 | 24 s | order 1, choose_list 1 |
| doom3-prof-21 | 21 | Pacho | Doom Legion | `--ai-profile Reckless` | 15 | 41 s | order 2, choose_list 1, ability_menu 10 |

**All 21 PASS.** 27,461 frames, 41.4 MB of frame log. The AI won all 21: the
`auto` seat is a policy, not a player, and that is not what this measures.
The `doom3-prof-*` rows are the same invocations as `tools/ten-games.sh`'s
match-setup rows 11–14 (the four AI profiles, seeds 11–14) and `check-all.sh`
step 9e (Reckless, seed 21), run under this section's own game ids so they could
not collide with the gate's `ten-*` directories while §B's work was running it.

Which cards actually reached the stack (a spell, a trigger or an activated
ability whose source is that card; `land` events for lands), over the 21 games.
Aerial Doombot, Thriving Isle and Island are in both decks, so their numbers
include Pacho's:

| card | stack entries | land drops | games |
|---|---|---|---|
| Aerial Doombot | 21 | | 12 |
| Agents of HYDRA | 16 | | 14 |
| Loki, God of Mischief | 21 | | 7 |
| Doom's Servo-Guards | 10 | | 5 |
| Doom Reigns Supreme | 22 | | 6 |
| Dark Deed | 6 | | 6 |
| Doom Blade | 11 | | 11 |
| Baron Strucker, HYDRA Overlord | 22 | | 6 |
| HYDRA Troopers | 42 | | 15 |
| A.I.M. Bot | 3 | | 3 |
| Visions of Villainy | 8 | | 7 |
| Frozen in Ice | 20 | | 9 |
| Kang the Conqueror | 8 | | 8 |
| Kang, Temporal Tyrant | 42 | | 10 |
| Unliving Legionnaire | 5 | | 5 |
| Madame Hydra, Reanimated | 19 | | 6 |
| Hour of Defeat | 8 | | 8 |
| Trickster's Stratagem | 1 | | 1 |
| Pharaoh Rama-Tut | 11 | | 5 |
| Doctor Doom | 18 | | 5 |
| Thriving Isle | | 11 | 10 |
| Thriving Moor | | 6 | 6 |
| Hidden Lair | | 14 | 13 |
| Castle Doom | | 10 | 10 |
| Villainous Hideout | 17 | 11 | 9 |
| Swamp | | 67 | 20 |
| Island | | 89 | 21 |

**Every one of the 20 nonland cards reached the stack at least once** — from
EITHER side: this census counts the deck's cards whoever played them, and eight
of the 21 games gave the deck to the seat. *(Review fix pass: counted from the
AI's side only, Trickster's Stratagem had **no** entry — its one cast is the
seat's, below — and Dark Deed none either. The Stratagem is replaced in §D.6,
where the census is the AI's alone.)* Three paths worth naming, because each is
the rare one:

- **Doom Reigns Supreme paid off** in `doom2-mirror-15`: the AI's copy took its
  fifth plan counter at line 1450, was sacrificed, and exiled the seat's top five
  (Island, HYDRA Troopers, Swamp, Swamp, Island), then **cast the HYDRA Troopers
  from exile** for free. The five were the viewer's own library; the gate passed.
- **Trickster's Stratagem** resolved once, in `doom2-mirror-16` (line 1480): the
  seat tucked the AI's creature (card 45) into the AI's library — the AI was the
  owner, so the AI made the top/bottom choice — then its own creature connived.
  Card 45 is a five-key stub from the moment it enters the library; the gate
  passed.
- **The seat's own Doom Reigns Supreme**, exiling the **AI's** top five, is
  the mirror image of the above and the one place the Kang Prime lesson said to
  look — `DigEffect` builds a `DelayedReveal` for the chooser when the script
  has no `Reveal$` (javap, `DigEffect.resolve` offsets 683–731). None of the 21
  games reached it, so a scratch deck forced it (`16 Swamp, 8 Doom Reigns
  Supreme, 16 Agents of HYDRA`, kept in the session scratchpad and **not** in
  `decks/`, where `check-all.sh` 9e would take it for the villain deck), played
  by the `auto` seat against Pacho, seeds 1–6: all six PASS with
  `check-redaction.mjs` clean. Seeds 3 and 4 reached the fifth plan counter:
  the AI's top five moved library → exile (lines 948 and 1322), and the seat got
  `choose_entities` *"Select a card to play"*, `min 0`, `max 1`, whose options
  are those cards **in `exile`** (seed 3: Pym Particles, Borough Backup,
  Strategic Intervention, Helicarrier Strike — the fifth was a land). The seat
  never saw them in the AI's library. Logs: `var/games/plan-seat-{1..6}/`.
- **Not reached in any game** — named so nobody takes the table as coverage it
  is not: Kang the Conqueror's power-up (an **extra turn** — two consecutive
  `turn` events for one player, which no recording in the repo has), Castle
  Doom's Doombot ability, and the **seat** being the owner who chooses for
  Trickster's Stratagem.

### D.5 Art: `tools/fetch-art.ts` over every deck

`fetch-art.ts` read one deck (`config.json`'s `deck`) and wrote `art.json` for
it; with match setup either seat can be any deck, so it now reads **every
`decks/*.dck`** (`config.json`'s first, so its set hints win, then by file name;
`--deck a,b` narrows it), de-duplicates names across them, and tries a line's own
set code before the fixed `msh → msc → exact → fuzzy` ladder. `art.json` gains
`decks: [...]`; `deck` stays a string (the list, comma-joined) so nothing that
reads it changes — `web/src/art.ts` reads only `cards`, `misses` and
`generatedAt`, and `node --test web/test/art.test.ts` is 4 / 4.

```
$ node tools/fetch-art.ts
11 deck(s), 65 distinct names:
  …
  429 — honouring Retry-After: sleeping 60s          (three times)
summary
  exact     10          ← the probe decks' non-Marvel cards
  set=msc   16
  set=msh   39
  misses     0
coverage
  decks/pacho-shield.dck            28/28
  decks/doom-legion.dck             27/27
  … every probe deck n/n
wrote web/public/art.json (65 entries)
real 3m49s
```

Three HTTP 429s, each honoured with the server's `Retry-After: 60`, account for
three of the four minutes; the other ~80 requests took under a minute. All 28
of pacho-shield's entries are the **same Scryfall printing** (`scryfallId`) as in
the one-deck `art.json` this run replaced — 18 via `set=msh`, 10 via `set=msc`,
exactly as before. `web/public/art.json` is gitignored; this run regenerated the
worktree's copy.

### D.6 The second swap: Trickster's Stratagem out, Crossbones in (review fix pass)

**The finding.** The review gave the AI 14 copies of Trickster's Stratagem, 24
Islands and the seat's HYDRA creatures to aim at, over 61 turns and 37 draws, and
the AI **never cast it**; in §D.4's 21 games its one stack entry was the seat's
own cast. A card the AI never plays is a 39-card deck, and the path the card was
there for — the **seat** as the owner choosing top-2 or bottom — cannot be
reached from the AI's side at all. Report 08 §8.3b has the script (it is
faithful; it carries no `AILogic$`).

**The swap.** `1 Trickster's Stratagem|MSH` → `1 Crossbones, Malicious
Mercenary|MSH` (MSH #91, `{3}{B}` 3/3 deathtouch; the first time each turn
another Villain of yours enters, a +1/+1 counter on him and 2 damage to each
opponent — `DealDamage | Defined$ Player.Opponent`, no target, no reveal). It is
the swap list's own candidate (`decks/README.md`), and it keeps the curve: a
4-drop for a 4-drop.

| check | command | result |
|---|---|---|
| deck | `node tools/check-deck.mjs decks/doom-legion.dck --scryfall` (`var/msfix/check-deck-doom.log`) | **PASS, 0 failures, 0 warnings.** 40 cards, 27 distinct; creatures 17 (was 16), instants 4, sorceries 0 (was 1); curve unchanged `1:2 2:7 3:6 4:6 5:1 6:1`; pips U 9 B 17 (were 10 / 16); `MSH=33 MSC=7`. Crossbones `ok` on Scryfall at MSH #91; the same three display-only Oracle drifts as §D.2. Engine pass: 0 dropped, Limited legal, the mirror game finished (AI-One by `AllOpponentsLost`, round 8). 23 s |
| art | `node tools/fetch-art.ts` (`var/msfix/fetch-art.log`) | 65 entries, **0 misses**, `decks/doom-legion.dck 27/27`; Crossbones at `set=msh` MSH #91 (Kevin Sidharta). The other 64 entries are the **same Scryfall printing** (`scryfallId`) as the `art.json` it replaced; Trickster's Stratagem's entry is gone. 4 m 47 s, three of those minutes Scryfall's `Retry-After: 60` |
| games | 38 × `--transport auto`, the AI on Doom Legion (below) | **38 / 38 PASS**: exit 0, `MTGTABLE OK`, exactly one `over` and last, `UNIMPL members = none`, `emit errors = 0`, `check-redaction.mjs` exit 0 on every log. 40,633 frames, 56 MB; 23–45 s each, four at a time |

The 38 games are this section's six (`msfix-cen-1..6`: pacho-shield seat, AI on
Doom Legion, `Default`, seeds 1–6) and §P's 32 profile games — every one of them
with the AI on the new list. **The AI's own census**, a stack entry being a
spell, trigger or activated ability whose source is the card and whose
controller is the AI (`stack[]` snapshots and `cast` events, de-duplicated by
stack id):

| card | AI stack entries | games |
|---|---|---|
| HYDRA Troopers | 58 | 24 |
| Kang, Temporal Tyrant | 55 | 13 |
| Baron Strucker, HYDRA Overlord | 44 | 12 |
| **Crossbones, Malicious Mercenary** | **42** | **16** |
| Frozen in Ice | 36 | 18 |
| Agents of HYDRA | 35 | 25 |
| Villainous Hideout (a land's ability) | 28 | 8 |
| Madame Hydra, Reanimated | 26 | 8 |
| Aerial Doombot | 23 | 15 |
| Doom Blade | 19 | 19 |
| Loki, God of Mischief | 16 | 7 |
| Unliving Legionnaire | 16 | 13 |
| Doom Reigns Supreme | 14 | 4 |
| Doom's Servo-Guards | 14 | 7 |
| Pharaoh Rama-Tut | 14 | 10 |
| Kang the Conqueror | 9 | 9 |
| Visions of Villainy | 8 | 8 |
| A.I.M. Bot | 7 | 7 |
| Hour of Defeat | 4 | 4 |
| Doctor Doom | 4 | 1 |
| Dark Deed | 1 | 1 |

**All 20 nonland cards reached the stack from the AI's side**, Crossbones in 16
of 38 games (his cast plus his once-a-turn trigger). **Dark Deed is the one to
watch**: one cast in 38 games (`msfix-vr-47`, turn 14, after sitting in the AI's
opening hand the whole game), and none from the AI's side in §D.4's 21. It is
cast, so it is not dead the way the Stratagem was, but the AI holds it; if a
later census shows it never leaving the hand, it is the next swap.

---

## B. The bridge, the wire and the gate — `--ai-deck`, `--ai-profile`, `hello_ok.match` (amendment M44)

Date: 2026-09-27. Worktree `match-setup` off `main` 0368a90. Every number below
was measured on this machine against
`forge-gui-desktop-2.0.14-jar-with-dependencies.jar` (`sha256 3c0a7c38…5dd9`),
Java 21 JRE, Node 24. Scope: the bridge half of match setup — seating the AI
with a deck of its own and a chosen Forge AI profile, putting both on the wire,
the board's two lines of text, and the gate rows that keep it true. The villain
deck itself (`decks/doom-legion.dck`, *Doom Legion (Marvel Super Heroes
villains)*, 40 cards) is not this section's (§D above); this section only plays
against it. The deck changed once while this work ran (Kang Prime out, §D.3, at
21:21:16Z). **Every villain run cited below started after that**, against the
final file (`sha256 fd2a7674…1a16`); two earlier trial runs on the old list
passed too, but their logs were overwritten by the gate's and are not cited.

### B.0 The one-paragraph version

`MtgTable` takes `--ai-deck <path>` (an alias of `--deck2`) and
`--ai-profile <Default|Cautious|Reckless|Experimental>`, validated against the
`.ai` files in `forge-home/res/ai/` **before the engine boots**, and seats the
AI through one new function, `Bootstrap.createAiPlayer(name, avatar, profile)`,
which always passes a non-empty `profileOverride` — the empty one reaches a
branch of `GamePlayerUtil` that **saves the preferences file**, and §B.2 below
makes it do exactly that in a scratch home. `hello_ok` gains
`match: {yourDeck: {name, path, cards}, aiDeck: {name, cards}, aiProfile, games}`
(protocol amendment **M44**), the AI's deck a **name and a count and nothing
else**; `check-redaction.mjs` holds the exact key sets and rejects all nine
one-defect probes of §B.4. `scripts/play.sh` gets `--deck`, `--ai-deck`,
`--ai-profile` and `--mirror` with defaults in `config.json`'s new `match`
block; the board's seat rails print each seat's deck name and the AI's
profile. `tools/ten-games.sh` gains rows 11–14 (your deck vs the villain, once
per profile) and `check-all.sh` a sub-step **9e** (one Reckless game plus a
refused bogus profile); both read the profile **back from the in-game AI** and
fingerprint every preferences file before and after.

### B.1 The seam, confirmed with `javap` against the jar

```
public static forge.LobbyPlayer createAiPlayer(java.lang.String, int);                    // what MtgTable called
public static forge.LobbyPlayer createAiPlayer(java.lang.String, int, java.lang.String);  // what it calls now
public static forge.LobbyPlayer createAiPlayer(java.lang.String, int, int, java.util.Set<forge.ai.AIOption>, java.lang.String);
```

`createAiPlayer(String, int)` is `createAiPlayer(name, avatar, "")`. The
three-argument overload computes the sleeve index (`getSleevesCount()` is 0 in
`HeadlessGuiBase`, so **no `MyRandom` draw** either way) and delegates to the
five-argument one, whose offsets 15–83 are the branch report 11 §9 described:
`profileOverride` null or empty → read `FPref.UI_CURRENT_AI_PROFILE` → if
`AiProfileUtil.getProfilesDisplayList()` does not contain it, print
`[AI Preferences] Unknown profile … resetting to default.`, `setPref(…,
"Default")` and **`ForgePreferences.save()`** (offset 83). A non-empty override
jumps straight to offset 120 and `setAiProfile(profile)` (offset 150).

It never fired before today only because the pref was `"Default"`: neither
`var/forge/preferences/` in the main checkout nor in this worktree has ever held
a `forge.preferences` file. It is closed anyway, in all three entry points
(`MtgTable`, `RecordMatch`, `Smoke`), because "the file happened to be absent"
is not a rule. Choosing the three-argument overload keeps a seeded `Default`
game the game it was — gate step 6, the value-level byte diff of a fresh
`RecordMatch` against `fixtures/games/g1.jsonl`, passes unchanged with
`RecordMatch` on the new path.

`Bootstrap.createAiPlayer` also asserts `AiProfileUtil.getAvailableProfiles()`
contains the profile, because `AiProfileUtil.getAIProp` (offsets 20–62) returns
each property's built-in default for a profile name with no loaded map: a file
that failed to load would otherwise play on defaults while every log line named
the profile.

### B.2 The negative control: the empty-override branch really saves

`SaveProbe` (a scratch class, not committed) boots through `Bootstrap` against a
**scratch forge home** whose `forge.profile.properties` points `userDir` into
the session scratchpad, sets `UI_CURRENT_AI_PROFILE=NoSuchProfile` **in memory**
— what a stale or hand-edited preferences file would hand the branch — and then
seats one AI:

| call | `forge.preferences` before | after |
|---|---|---|
| `GamePlayerUtil.createAiPlayer("x", 0)` — the old call, override `""` | absent | **written, 8,045 bytes**, printing `[AI Preferences] Unknown profile NoSuchProfile was requested, resetting to default.`; the file carries `UI_CURRENT_AI_PROFILE=Default` **and** `UI_SELECT_FROM_CARD_DISPLAYS=false` and `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE=true` — Bootstrap's in-memory D13/D14 decisions, persisted |
| `Bootstrap.createAiPlayer("x", 0, "Reckless")` — the new call | absent | **absent** |

`~/.forge/preferences/` and this worktree's `var/forge/preferences/` were
fingerprinted (sha256 + mtime + size of every file) before and after the probe:
identical. The only file the probe could write was its own.

### B.3 Games played

| run | transport | decks (you vs AI) | profile | result | log checks |
|---|---|---|---|---|---|
| `ms-try1`, seed 13 | auto | pacho-shield vs morph-probe | `reckless` → **Reckless** | `over`, AI won, 15 turns, 27 s | check-redaction PASS, 1,416 frames |
| `ten-13` (gate step 9c, row 13) | auto | pacho-shield vs **doom-legion** | Reckless | `over`, 13 turns, 22 s of game | PASS, 1,157 frames; profile read back; prefs unchanged |
| `check-all-match-reckless` (gate step 9e, seed 21) | auto | pacho-shield vs doom-legion | Reckless | `over`, 15 turns, 35 s of game | PASS, 1,983 frames |
| `human-ws-5` (`scripts/play.sh --port 8670 --web-port 5182 --ai-deck decks/doom-legion.dck --ai-profile reckless -- --games 1 --seed 5`) | **ws, a real browser** | pacho-shield vs doom-legion | Reckless | conceded at the mulligan from the board's Concede button, `over`; `the client disconnected (--keep-open) -- the session ends here`; play.sh exited 0 | PASS, 10 frames (it tests the wiring, not a game) |
| **`console-doom-reckless-42`** | **console** | pacho-shield vs doom-legion | Reckless | **`over` on its own: AI won by `AllOpponentsLost` in combat damage, turn 12 (round 6), you at −10** | **check-redaction PASS**, 382 frames, 224 opponent-hand cards redacted, `hello_ok.match` checked |

The console game is the task's named proof. It was driven by a scratch script
that reads the session's own frame log and types one console line per decision
— `.` for an ask, `c <first selectable id>` for a click the engine demands (the
cleanup discard), and an empty line (the focused button) otherwise — i.e. the
line protocol of CLAUDE.md's console table, typed by a passive player who never
casts anything. 52 lines typed (47 Enter, 5 clicks, 0 asks); 11.4 s wall. The
summary line it printed is the profile's evidence:

```
ai profile     = Reckless  (LobbyPlayerAi.getAiProfile()=Reckless)  (in game: PLAY_AGGRO=true
                 CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=75, read through AiProfileUtil.getProperty(Player,
                 AiProps) -- the call AiController.getProperty makes)
```

`PLAY_AGGRO=true` is Reckless's alone (`Reckless.ai:7`; `false` in the other
three) and `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS` differs in all four files
(Default 90, Cautious 25, Reckless 75, Experimental 100, line 132 of each), so
the pair identifies the profile the **in-game** AI player consulted, not the
string we passed.

**Preferences, before and after the console game** (the same fingerprint as §B.2):
`~/.forge/preferences/` — `forge.preferences` `058de39d…a28a` (8,083 B, mtime
1789142209), `server.preferences` `d7448edb…9efc`, `window.xml` `8d554a3b…1347`
— identical after; `var/forge/preferences/` — present (FModel.initialize
creates it) and **empty** before and after. The same holds after every other
run in this table.

**The AI's deck is a name on the wire, not a list.** Over the three
doom-legion logs, none of the 24 card names that only the villain deck holds
appears anywhere in the `hello_ok` frame; the session header's entry for the AI
seat stays `{path: null, sha256: null, cards: 40}` as protocol §8.1 requires.

### B.4 `check-redaction.mjs`: the match audit, and its nine negative controls

New per-file line: `hello_ok.match checked on N of M hello_ok frame(s)` or, for
the committed corpus (all 18 engine recordings predate M44, and `RecordMatch`
never writes it), `hello_ok.match absent from N hello_ok frame(s)
(legitimate …)`. Absence is never a failure. Presence is held to exact key sets
and cross-checked against the session header (viewer's `path` and `cards`, the
AI seat's `cards`) and against M41's `gameCount`.

Nine copies of `ms-try1`'s log, each with exactly one defect spliced into the
`hello_ok` line and every other line untouched (the untouched file passes):

| probe | verdict | the checker's words |
|---|---|---|
| `aiDeck.path` added | **rejected** | `aiDeck carries "path" -- the AI's deck is its NAME and card COUNT only …` |
| `aiDeck.sha256` added | **rejected** | `aiDeck carries "sha256" …` |
| `aiDeck.main` (a list) added | **rejected** | `aiDeck carries "main" …` |
| `aiDeck.cards` replaced by a list of names | **rejected** | `aiDeck.cards must be an integer` |
| `aiDeck.cards` 40 → 60 | **rejected** | `aiDeck.cards=60 but the session header says 40` |
| `yourDeck.path` changed | **rejected** | `yourDeck.path="decks/other.dck" but the session header says "decks/pacho-shield.dck"` |
| `aiProfile` a path | **rejected** | `aiProfile must be a Forge AI profile name` |
| an extra key on `match` | **rejected** | `has keys [...], expected exactly yourDeck, aiDeck, aiProfile, games` |
| `games: 0` | **rejected** | `games must be an integer >= 1` |

These live in the session scratchpad, not in `fixtures/negative/redaction/`:
that directory and `check-redaction-selftest.mjs` were outside this change's
files. Promoting one probe (`aiDeck.path`) into the selftest is the follow-up.
*(Review fix pass: done — §R item 2. Three of them and a control are committed
as `fixtures/negative/redaction/m44-*`, generated by
`tools/make-negative-fixtures.mjs` and required by name in the selftest.)*

### B.5 The client

`seatMatchOf(hello, playerId)` in `web/src/protocol.ts` is the one reader: the
viewing seat reads `yourDeck`, the other `aiDeck`, and only a seat
`players[]` marks `isAi` gets the profile; a stream without `match` reads
`null` and the rail draws nothing. `web/test/reduce-match.test.ts` (7 tests)
folds it through `reduce`, pins "a path on the AI deck never reaches a
component", and walks all 18 committed handshakes (`absent from 18 of 18`).
`npm --prefix web test`: **711** `node --test` (704 + these 7) + **79** vitest,
0 fail; `tsc --noEmit` clean.

In a browser (vite on 5182): the synthetic sample's rails read
`Deck: Morph probe · AI profile: Reckless` / `Deck: Pacho SHIELD (Marvel Super
Heroes)`; `games/human-auto-42.jsonl` draws **no** match line (2 rails, 0
`.rail__match`); and the live `play.sh` game above drew
`Deck: Doom Legion (Marvel Super Heroes villains) · AI profile: Reckless` on the
AI's rail at the mulligan. The arena's HUD plates (`web/src/arena/`) were
outside this change and do not print it yet.

### B.6 The gate

`./tools/check-all.sh` from a **deleted `bridge/out`**, `WSPORT=8671`:
**exit 0 in 874 s** (`var/check-all-match-setup.log`), on a desktop that was not
idle: another agent was running games from the same worktree until 28 s
before the run began, which the wrapper waited out before deleting
`bridge/out`. Rows 11–14 and 9e add five games, about 125 s. The rest of the
difference from the slice-3 band (726–731 s) is load, and is not measured here.

| step | what match setup changed | result |
|---|---|---|
| 3 | `Bootstrap.createAiPlayer` / `resolveAiProfile` / `aiProfiles`; `Smoke`, `RecordMatch` and `MtgTable` all seat the AI through it | lint clean (20 files), build + three self-tests OK |
| 6 | `RecordMatch` now on the explicit-`Default` path | value-level diff against `g1.jsonl` **empty**: the same game, byte for byte |
| 9b | (advisory) | **fired, and said exactly what changed**: the one `s2c` difference is `hello_ok` gaining `"match":{…}` at character 350. Every other emitter frame is identical: 233 `state`s, 951 `input`s, 16 asks, 154 notices. The seat's half shows the known ±1 `act buttonCancel` (45 vs 46). The re-record the advisory asks for is `fixtures/games/`, outside this change |
| 9c | rows **11–14**: pacho-shield vs `decks/doom-legion.dck` under Default / Cautious / Reckless / Experimental, seeds 11–14 | **14/14** reached `over`, zero UNIMPL, all through check-redaction, and **no preferences file touched**; in-game reads `PLAY_AGGRO=false/false/true/false`, `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=90/25/75/100`, each equal to its own `.ai` file; 12 / 16 / 13 / 14 turns, 19–26 s each; 9c total 370 s |
| **9e** | one Reckless game vs the villain at seed 21, then `--ai-profile NoSuchProfile` | `over`, UNIMPL none, emit errors 0, check-redaction PASS; `hello_ok.match` equal field for field to one rebuilt from the two `.dck` files; prefs unchanged; the bogus profile **refused before `FModel.initialize`** with `is not one of Cautious, Default, Experimental, Reckless` |
| 10a–10g | every ws server now emits `match`; `ws-auto-play.mjs` fails a run whose `aiDeck` is not exactly `{name, cards}` and prints the match in its summary | all seven green (`… · match Default vs "Pacho SHIELD (Marvel Super Heroes)" · …` — step 10 plays mirrors) |
| 11 | `check-redaction.mjs`'s new `hello_ok.match` audit | 21 files checked **with** the block (every fresh seat recording and the regenerated synthetic sample); 19 **without** it (the 18 committed engine recordings + the fresh `RecordMatch`), each said out loud and none failed |
| 13 | `seatMatchOf`, the rail line, `reduce-match.test.ts` | build OK (2D entry chunk 86.51 kB gzip, no `three`); **721 `node --test` (713 pass, 0 fail, 8 skipped)** + **79 vitest** inside the gate, where `MTGTABLE_WS_LOGS` names step 10's four logs; 711 + 79 with 0 skipped standalone |

The **`~/.forge/preferences/` fingerprint** taken before the first run of this
work and again after the gate is **identical**, file for file. This
worktree's `var/forge/preferences/` exists (FModel.initialize creates it) and
has held **zero files** throughout.

### B.7 Follow-ups this section leaves (outside its files)

*(Review fix pass: 1, 2, 3 and 6 are closed and 5 is closed except for
CLAUDE.md — §R has each; 4 is still open.)*

1. **Re-record the human fixtures** so 9b goes quiet: its only emitter-side
   finding is the new `hello_ok.match`.
2. **Promote one probe into `fixtures/negative/redaction/`** (an `aiDeck`
   carrying `path`) and `check-redaction-selftest.mjs`. §B.4's nine were run by
   hand.
3. **A lint rule** in `tools/lint-bridge.sh`: `GamePlayerUtil.createAiPlayer(`
   only in `Bootstrap.java`. Today all three call sites go through Bootstrap,
   but nothing mechanical stops a fourth.
4. **The arena's HUD plates** (`web/src/arena/DecisionLayer.tsx`, the
   `isAi ? 'AI' : 'human'` line) should print `seatMatchOf(state.hello, id)`
   like the board's rail does.
5. **CLAUDE.md** still says "five lettered sub-steps" and "704 + 79". It is
   now six (9e) and 711 + 79, and ten-games has fourteen rows. PLAN.md's
   deferred list still carries "a second deck … and an AI profile selector", and
   open question 8 ("AI difficulty stays deferred") needs the user's word that
   it has now come forward. DECISIONS.md has no entry yet for the two calls made
   here: the AI deck's *name* is public, and `config.json`'s `match` block is
   read by `play.sh` only, so the gate never plays what the player last chose.
6. **`config.json`'s `match.aiDeck` is `null`** (a mirror), because the villain
   deck is another branch's file. Once it merges, making it the default is one
   line: `"aiDeck": "decks/doom-legion.dck"`.

---

## P. What the AI profiles change, measured (review fix pass)

### P.0 The headline

**A profile reaches the engine, and it is not a difficulty.** Gate rows 11–14 and
step 9e read `PLAY_AGGRO` and `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS` back from the
in-game AI and hold them to the `.ai` file (§B.6); that is the whole of what they
prove. Whether Cautious and Reckless **play differently** is a different
question, and the answer is situational: **against the automated seat they were
not measurably different**; against a seat that leaves an untapped creature an
attacker can trade with, the first choice where the two games part was, in 6 of
10 pairs, **a trade Reckless takes and Cautious declines** — four attacks, two
blocks — and in the other 4 when to spend removal or which play comes first. The README,
`scripts/play.sh`'s header and `decks/README.md` said *"Reckless attacks into
trades, Cautious holds back"* with nothing behind it but gate rows 12 and 13 —
7 attackers against 14, at **different seeds**, i.e. two different shuffles. They
now say what is below.

### P.1 Where Forge reads the two profiles apart (javap, 2.0.14 jar)

Each `.ai` file is **121** `KEY=value` lines; Cautious and Reckless differ in
**63** of them (`diff` over the sorted key lines of `forge-home/res/ai/*.ai`).
The two that decide an attack are `PLAY_AGGRO` (`false` / `true`) and
`CHANCE_TO_ATTACK_INTO_TRADE` (`0` / `100`). In
`forge.ai.AiAttackController.declareAttackers(Combat)`:

- offsets 283–351 — unless `AiController.usesFullSimulation()`, read
  `PLAY_AGGRO`, `CHANCE_TO_ATTACK_INTO_TRADE`, `ATTACK_INTO_TRADE_WHEN_TAPPED_OUT`,
  `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA`, `RANDOMLY_ATKTRADE_ONLY_ON_LOWER_LIFE_PRESSURE`
  and `COMBAT_ATTRITION_ATTACK_EVASION_PREDICTION` through
  `AiController.getBoolProperty` / `getIntProperty`;
- offsets 2286–2311 — `if (playAggro && MyRandom.percentTrue(chanceToAttackIntoTrade)
  && <a ratio> > 1) aiAggression = 4` ("attack expecting to trade"); the next
  clause (2314–2457) reaches the same level through
  `percentTrue(chanceToAttackIntoTrade)` plus life, board and mana conditions;
  otherwise the level falls to 3, 2, 1 or 0 on board ratios alone.

With Cautious's `false` / `0` neither route to level 4 is open; with Reckless's
`true` / `100` the first is open on every declaration whose ratio test passes
(`percentTrue(100)` always does). The level changes a declaration **mainly where
a potential blocker can kill the attacker**: in `shouldAttack`'s `tableswitch`
on the level, case 4 (offsets 280–329) attacks when the attacker's factors say
`canKillAll`, case 3 (330–395) wants `canKillAll` **and**
`isWorthLessThanAllKillers`, and both attack with an attacker that cannot be
blocked — so the profile shows up where a trade is on offer. (`notNeededAsBlockers`
also reads `PLAY_AGGRO`, offsets 324–341, and only when
`PlayerControllerAi.pilotsNonAggroDeck()`.)

### P.2 Why the automated seat hides it

`AutoTransport` declares attackers with **`alphaStrike`** — everything, every
turn (its own Javadoc, *"Attack with everything"*). A creature that attacks stays
tapped through the opponent's next turn, so on the AI's turn the seat's only
untapped creatures are the ones it cast that turn (too new to attack), and most of the AI's
attacks are decided where levels 3 and 4 agree. The review measured exactly that on the
**pre-swap** list: 11 same-seed pairs, Cautious against Reckless, the AI on Doom
Legion — seeds 31–37 with pacho-shield as the seat, 51–54 with a scratch seat of
A.I.M. Bot and Doom's Servo-Guards — attack counts equal in 8 of 11, totals
80 / 81 and 29 / 29, seeds 31 and 51 byte-identical state streams, and seed 52's
difference only in how events were batched into states. The blocker deck did not
change the picture, most likely because its creatures alpha-struck too.

### P.3 A seat that leaves a blocker up: same-seed pairs, first divergence

Counting attackers over a whole game is the wrong measure once two games part:
from that choice on they are different games of different lengths. So these
pairs are read with a new tool, **`tools/first-divergence.mjs`**, which flattens
each log's `state.events[]` in order (so where the bridge happened to cut a
snapshot — the first `state` of a game may or may not hold the opening hands —
is not a difference), finds the first event that differs, prints each side's
next decision (an attack, a block, a cast, a card leaving a hand) and says whose
it is: the **seat's** (then the pair is not evidence about the AI) or the AI's.

**Seat A: pacho-shield (the automated seat as the gate plays it).** Seeds 31–36,
the AI on Doom Legion, `--ai-profile Cautious` against `Reckless`:

| seed | first differing choice | AI attackers C / R |
|---|---|---|
| 31 | **the seat's**: its own mulligan, turn 0 (a wall-clock re-push) — not evidence | 7 / 8 |
| 32 | **identical**: all 819 events equal | 12 / 12 |
| 33 | the AI: Reckless casts Doom Blade at the start of the seat's combat, turn 6 | 11 / 11 |
| 34 | **identical**: all 386 events equal | 12 / 12 |
| 35 | the AI: **Reckless attacks with Loki (2/1) into the seat's untapped Peggy Carter (2/1)**; Cautious holds, turn 5 | 6 / 7 |
| 36 | the AI: C casts Frozen in Ice first · R plays a land first, turn 9 | 9 / 10 |

Totals **57 / 60**. Two pairs played the same game, one split on the seat, and
the one attack difference is the one pair where the seat had left a creature up.

**Seat B: a seat that cannot tap its blockers by attacking** — a scratch deck of
**18 `Veteran Cavalier|9ED` (2/2 vigilance) and 22 `Plains|9ED`**, kept in the
session scratchpad and not in `decks/` (it tests the AI, not a card): the seat
still alpha-strikes, and vigilance leaves every Cavalier untapped. Seeds 41–50:

| seed | first differing choice (both the AI's) | the board | AI attackers C / R |
|---|---|---|---|
| 41 | C: declares no attackers · R: plays a land first (after a stats change on a seat Cavalier), turn 9 | — | 3 / 3 |
| 42 | C: Doom Blade in main 1 · R: in the draw step, turn 8 | — | 5 / 7 |
| 43 | **Reckless attacks with HYDRA Troopers**, Cautious declares none, turn 9 | AI: Troopers 3/2, Agents 1/1 · seat: three untapped 2/2 Cavaliers | 4 / 6 |
| 44 | **Reckless attacks with HYDRA Troopers**, Cautious declares none, turn 7 | AI: Troopers 3/2 · seat: two untapped 2/2s | 10 / 7 |
| 45 | **Reckless blocks** a Cavalier with Baron Strucker (2/2), Cautious takes 2, turn 6 | a 2/2 into a 2/2 | 13 / 8 |
| 46 | **Reckless attacks with Loki**, Cautious declares none, turn 5 | AI: Loki 2/1 · seat: one untapped 2/2 | 10 / 10 |
| 47 | **Reckless blocks** a Cavalier with Loki (2/1), Cautious takes 2, turn 5 | a 2/2 into a 2/1 | 6 / 10 |
| 48 | C: Doom Blade in upkeep · R: a land first, turn 5 | — | 14 / 7 |
| 49 | **Reckless attacks with HYDRA Troopers**, Cautious declares none, turn 7 | AI: Troopers 3/2, Agents 1/1 · seat: two untapped 2/2s | 7 / 10 |
| 50 | C: Doom Blade in upkeep · R: in the draw step, turn 5 | — | 9 / 6 |

**10 of 10 pairs part on an AI choice. In 6 the first different choice is a
trade Reckless takes and Cautious declines** — four attacks into an untapped
blocker that would trade, two blocks that trade — which is P.1's level 4 against
level 3 exactly; the other four are when to spend removal or which play comes
first (other lines of the 63). Attack totals are **81 / 74**: Cautious *higher*,
because the games are different games after the split (146 and 144 turns over the
ten; the AI won all 20). A total was never the measure.

Every one of the 32 games PASSED the same checks as §D.6's census games
(`check-redaction.mjs` clean, one `over`, no `UNIMPL`). To reproduce one pair
(`var/` is gitignored):

```bash
printf '[metadata]\nName=Vigilant blockers (scratch)\n[main]\n18 Veteran Cavalier|9ED\n22 Plains|9ED\n' > var/cavalier.dck
for p in Cautious Reckless; do
  ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 44 --game-id cav-44-$p \
      --deck var/cavalier.dck --ai-deck decks/doom-legion.dck --ai-profile $p
done
node tools/first-divergence.mjs var/games/cav-44-Cautious/frames.jsonl var/games/cav-44-Reckless/frames.jsonl
```

### P.4 What changed because of it, and what did not

- **Reworded**: README's match-setup block, `scripts/play.sh`'s header and
  `decks/README.md` now say a profile is a set of ~120 heuristics whose effect is
  situational, that against the automated seat Cautious and Reckless were not
  measurably different, and where the difference does show. PLAN.md's open
  question 8 says the same.
- **No gate assertion compares the profiles' attacks.** The pairs above are the
  evidence the review asked for; a gate step built on them would be flaky by
  construction, because the seat can split a pair first on wall-clock alone
  (seed 31) — and a flaky gate step teaches everyone to re-run until it is green
  (the argument of `check-all.sh` 9b). `tools/first-divergence.mjs` is committed so
  the pairs can be re-run and read the same way.

---

## R. The review's findings, and what closed each (review fix pass, 2026-09-27)

One major and eight minors. Each row is what was found, what changed, and the
evidence; the files are listed so a reader can find the change without a diff.

| # | finding | what changed | evidence |
|---|---|---|---|
| 1 | **major** — README, the `play.sh` header and `decks/README.md` promised *"Reckless attacks into trades, Cautious holds back"*; 11 same-seed pairs found no measurable difference | Reworded all three (and PLAN.md question 8): a profile is a set of ~120 heuristics whose effect is situational, not measurably different against the automated seat, and where it does show. Found the board where `PLAY_AGGRO` decides and measured it as same-seed pairs; new `tools/first-divergence.mjs` reads a pair by its first differing choice and says whose it is | §P: 16 new pairs; against a seat of untapped 2/2s, 10 of 10 part on an AI choice and 6 of those are a trade Reckless takes and Cautious declines. No gate assertion, deliberately (§P.4) |
| 2 | the `hello_ok.match` audit had no committed negative control | `tools/make-negative-fixtures.mjs` writes `fixtures/negative/redaction/m44-match-present.jsonl` (the control, must PASS) and three probes — `m44-aideck-carries-path`, `m44-aideck-cards-is-a-list`, `m44-yourdeck-path-mismatch`; `tools/check-redaction-selftest.mjs` requires all four **by name**, so a regenerated manifest cannot drop one | selftest OK, 20 controls. Negative-controlled twice in a scratch copy: with the audit disabled the selftest FAILS 3 (the three probes pass); with `m44-aideck-carries-path` removed from the manifest it FAILS 1 (`is missing from … manifest.json`). The regeneration left every existing file byte-identical (`git diff` touches only `manifest.json`) |
| 3 | 9b's advisory fired on every run: the committed fixtures predate `hello_ok.match` | `tools/fixture-multiset-diff.mjs` gains `AMENDED_KEYS` (one row: `hello_ok.match`, M44): when A — the committed, older side — has no frame of that type carrying the key and B does, the key is dropped from B and a line says so; `--keep-amended` turns it off; the reverse (A has it, B lacks it) is still a difference. `check-all.sh` 9b's comment says why the fixtures were not re-recorded (frame indices into them are cited; a re-record reorders a human-seat log) | on §B.6's own drift recording: s2c `MULTISET IDENTICAL` (1,357 frames) with the note; with `--keep-amended`, the one `hello_ok` difference again; swapped (fresh as A), still reported. **In the re-run gate below 9b still fired** — not on `match` (the note printed and the `hello_ok`s compared equal) but on load: +13 `input {prompt:"Waiting for Forge AI..."}` re-pushes and a few `state`s cut at a different phase, the known wall-clock class, amplified by a load average of 18–30 while two other worktrees ran their own gates. A second seed-42 recording at load 30 showed the same (+14 inputs, 233 = 233 states) |
| 4 | `config.json` `match.aiDeck` was `null`, so a bare `play.sh` played a mirror while `decks/README.md` called Doom Legion "what match setup seats against you" | `"aiDeck": "decks/doom-legion.dck"`. play.sh's `--mirror` message now names `--mirror` too. README, play.sh and decks/README say a bare `play.sh` plays the villains and a bare `MtgTable` a mirror (**D106**) | `./scripts/play.sh --port 8673 --web-port 5182 --no-open --no-keep-open -- --games 1 --seed 5` printed `AI: Doom Legion (Marvel Super Heroes villains)  [decks/doom-legion.dck]` / `AI profile: Default`, and `tools/ws-auto-play.mjs --port 8673` played the game to `over` (30 s, 1,185 frames in, `match Default vs "Doom Legion (Marvel Super Heroes villains)"`); the client log's `hello_ok.match` is `{yourDeck: Pacho …, aiDeck: {name: "Doom Legion (Marvel Super Heroes villains)", cards: 40}, aiProfile: "Default", games: 1}`, `check-redaction.mjs` exit 0; play.sh exited 0 and both ports closed |
| 5 | Trickster's Stratagem is dead for the Forge AI | Swapped for **Crossbones, Malicious Mercenary**; `check-deck --scryfall` and `fetch-art` re-run; report 08 §8.1 / §8.2 / §8.3b / §8.4 and `decks/README.md` updated | §D.6: PASS, 27/27 art, 38/38 games clean, all 20 nonland cards cast by the AI |
| 6 | the gate's villain was "the first `decks/*.dck` not on a hard-coded list", the list kept twice | `tools/villain-deck.sh`, **sourced** by `ten-games.sh` and `check-all.sh` 9e: `VILLAIN_DECK`, else `decks/doom-legion.dck` by name, else the morph-probe STAND-IN said out loud. Both `KNOWN` lists are gone | the three cases exercised: default → `decks/doom-legion.dck`; `VILLAIN_DECK=decks/x.dck` → that; a checkout without doom-legion but with a new `aaa-hero.dck` → the STAND-IN, not the hero deck |
| 7 | stale docs | PLAN.md (question 8, the deferred entry, M6 follow-up 10), **D105** (the AI deck's name is public) and **D106** (only `play.sh` reads `match`) in DECISIONS.md (written as D90 and D91; renumbered to D102 and D103 by the documentation pass, §R.2, and to their final numbers by the second rebase, §R.4), README (the gate summary, the tree, the decision count, the two morph-art sentences), `docs/evidence/m4-board.md` §4 (a dated note). **CLAUDE.md was not edited** — see the fix pass's report | — |
| 8 | nothing stopped a new direct `GamePlayerUtil.createAiPlayer(` | `tools/lint-bridge.sh` §1: `GamePlayerUtil.createAiPlayer` allowed only in `Bootstrap.java` (no `(` in the pattern, so a static import is caught too), plus the method reference and a static wildcard import of `GamePlayerUtil` | lint OK on the tree; in a scratch copy each of a direct two-argument call, the static import, the method reference and the wildcard import FAILS the lint; the same call in a comment passes |
| 9 | a builder-session `tail -f` (PID 62213) was still running | killed | `ps -p 62213`: gone |

### R.1 The gate, re-run

`WSPORT=8672 ./tools/check-all.sh` from a **deleted `bridge/out`**:
**exit 0 in 1,141 s** (`var/check-all-msfix.log`), on a desktop at load average
18–30 — two other worktrees were running their own `check-all.sh` at the same
time — so the time says nothing about the gate itself (§B.6 was 874 s).

| step | result |
|---|---|
| 2 | the lint, with the new `GamePlayerUtil.createAiPlayer` rule: clean, 20 files |
| 9b | advisory fired on load noise, not on `match` (row 3 above) |
| 9c | **14 / 14**, 482 s. Rows 11–14 now play the post-swap Doom Legion, named by `tools/villain-deck.sh` (`rows 11-14 = villain deck decks/doom-legion.dck`); in-game `PLAY_AGGRO=false/false/true/false`, `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=90/25/75/100`, prefs unchanged; 14 / 14 / 13 / 14 turns, 30–35 s |
| 9e | `villain deck decks/doom-legion.dck`; `hello_ok.match` equal to the rebuilt one; no preferences file changed; `NoSuchProfile` refused before `FModel.initialize` |
| 10a–10g | all seven green |
| 11 | every committed fixture and fresh recording PASS |
| 12 | `check-redaction self-test: 20 controls` — the four `m44-*` among them — **OK** |
| 13 | build OK, 2D entry chunk **86.51 kB** gzip; **721 `node --test` (713 pass, 0 fail, 8 skipped) + 79 vitest** |

After it: `ps` shows no process of this worktree's; ports 8670–8674 and 5182
closed.

### R.2 The documentation pass (2026-09-27)

It edited documents and no code: PLAN.md (the *Match setup* section, its status
row and nine follow-ups, and a shorter deferred-list entry), README (*Choosing decks
and the AI*), and DECISIONS.md, where it wrote D104 (the profile is always an
explicit `profileOverride`, and it is not a difficulty) and D105 (the villain
deck's composition, and the four rules a card in it must meet) — **D107** and
**D108** since the second rebase (§R.4). It also
**renumbered** the fix pass's D90 and D91 to D102 and D103 (now **D105** and
**D106**), because while
this branch was open `main` committed D90–D94 (the card library) and the Tier 2
slice-4 branch wrote D95–D101. Every reference was updated: PLAN.md, README,
`decks/README.md` and §R row 7 above. Nothing in the code cites a decision
number. CLAUDE.md was not edited.

`WSPORT=8673 ./tools/check-all.sh` from a **deleted `bridge/out`**: **exit 0 in
1,143 s** (`var/check-all-ms-docs.log`), with a load average of 27–37 at the start
and 19 at the end — the tier2-slice4 worktree was running its own gate at the same
time — so, like §R.1's 1,141 s, the time measures the desktop, not the gate.

| step | result |
|---|---|
| 2 | bridge lint OK, 20 files |
| 6 | 377 normalised lines identical to `fixtures/games/g1.jsonl` |
| 9b | advisory fired on the known wall-clock class, not on `match`: the M44 note printed and `hello_ok.match` was ignored on the fresh side; +16 `input` re-pushes, +5 `act buttonCancel`, two `state`s cut at a different phase, 233 = 233 `state`s |
| 9c | **14 / 14** in 458 s. Rows 11–14 against `decks/doom-legion.dck`: in-game `PLAY_AGGRO=false/false/true/false`, `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=90/25/75/100`, each as its `.ai` file says; prefs unchanged; 14 / 14 / 13 / 14 turns, 27–29 s each |
| 9d | sideboard ask: 40 main + 15 side, answered with 40 indices, 1 from the sideboard |
| 9e | `hello_ok.match` = `{yourDeck: {name: "Pacho SHIELD (Marvel Super Heroes)", path: "decks/pacho-shield.dck", cards: 40}, aiDeck: {name: "Doom Legion (Marvel Super Heroes villains)", cards: 40}, aiProfile: "Reckless", games: 1}`; no Forge preferences file changed; `NoSuchProfile` refused before `FModel.initialize` |
| 10a–10g | all seven green; 10f sent 7 `clickAbility` acts, none unresolvable |
| 12 | `check-redaction self-test: 20 controls` — OK |
| 13 | 2D entry chunk **86.51 kB** gzip; **721 `node --test` (713 pass, 0 fail, 8 skipped) + 79 vitest (5 files)** |

After it: no process of this worktree's was left, and ports 8670–8674 and 5182
were closed. `~/.forge/preferences/` still held the same three files with their
2026-09-11 mtimes, and this worktree's `var/forge/preferences/` was still empty.

### R.3 The rebase onto `main`, and the second fix commit (2026-09-27)

**The rebase.** `19a984a` was replayed onto `main`'s `23e26b3` (the card library,
`754f504`, and Tier 2 slice 4) as `7737f61`, with its own commit message. Three
files conflicted and every conflict kept both sides: **DECISIONS.md** (main's
D90–D101 first, then this branch's D102–D105 — **D105–D108** since §R.4; the
italic note above them then
says the numbers were chosen to miss D90–D101 and did), **PLAN.md** (the status
table — main's M7 row, then this branch's row; the deferred list — this branch's
"a second deck … **Done** as match setup" and main's "card library … **Brought
forward**", each superseding the other side's old bullet) and **README.md** (the
tree's DECISIONS line and the `tools/` block, where main's `card-library/` entry
and this branch's `first-divergence.mjs` and `fetch-art.ts` lines both stay).
`config.json` merged by itself: main's `scryfallUserAgent`, this branch's `match`
block.

- **Decision numbers.** Nothing to renumber: the documentation pass (§R.2) had
  already moved the fix pass's D90 and D91 to **D102** and **D103**. Every
  `D90` / `D91` left in the tree was checked against its origin, and every one is
  main's card library (DECISIONS.md, PLAN.md, README.md, CLAUDE.md,
  `tools/card-library/`). `grep -c '^## D[0-9]'` over DECISIONS.md is **105**,
  D1 to D105 with no gap and no duplicate, so every count now says **one hundred
  and five** (README twice, CLAUDE.md's docs table). *Superseded by §R.4*: the
  workshop reached `main` first with D102–D104, and these four are D105–D108.
- **CLAUDE.md.** The fix pass's prepared patch
  (`scratchpad/msfix/claude-md.patch`, seven hunks, written against `0368a90`)
  does not apply to main's CLAUDE.md as a whole: its first four hunks applied
  with an offset of three lines (lint rule 10's `GamePlayerUtil.createAiPlayer`
  ban, `play.sh`'s villain default and `--mirror` line, the six lettered
  sub-steps with **9e**, ten-games' rows 11–14), and the other three were
  re-applied by hand — the gate time, the test counts, and the docs-table row,
  which said **D102–D105** and "one hundred and five" where the patch said
  D90–D91 and "ninety-one". *Corrected by §R.4*: this bullet said CLAUDE.md was
  then complete, and it was not. The patch that was meant to land was the
  documentation pass's later one, `var/claude-md-match-setup.patch` (eight
  hunks), whose **hunks 2 and 3** carry what the fix pass's copy never had: in
  the Build-and-run block, the bridge example (`MtgTable --transport console
  --seed 42 --ai-deck decks/doom-legion.dck --ai-profile Reckless`) and the
  `fetch-art.ts` / `ten-games.sh` line edits; after the `play.sh` block, the
  whole *Match setup (amendment M44, …)* paragraph. Only two of hunk 2's added
  lines (`ten-games.sh --seed 13` and `check-deck.mjs`, reworded) and hunk 3's
  `play.sh` lines were in the tree; `--ai-deck` appeared in CLAUDE.md **0**
  times. PLAN.md's follow-ups 8 (CLAUDE.md) and 9 (decision numbers at merge)
  were marked closed; 8 was closed only in part, and §R.4 finishes it.
- **One semantic conflict the text merge could not see.** Main's
  `web/test/cards-lib.test.ts` parses every file in `decks/` as a deck, and this
  branch put `decks/README.md` there: `npm test` on the rebased tree failed 1 of
  825 (`every deck in decks/ parses with nothing skipped`, `AssertionError:
  README.md`). Every tool that lists `decks/` already filters to `.dck`
  (`fetch-art.ts`, `card-library/images.ts`, `make-fixture.ts`, `devApi.ts`), so
  the test now reads only `.dck` / `.txt` files (and asserts it found at least
  two). Fixed in the second commit.

**Fix (a): `over` is terminal under load.** Slice 4's follow-up 13(a) and three
gate runs at a load average of 20–60 (steps 10a, 10b and 10g: "the last frame of
the ws session is not `over`") had one cause. `WireGuiGame.emit` checked
`overEmitted` *before* `synchronized (log)`, the monitor that numbers and pushes
a frame; an `input` that read the flag false could be descheduled there while the
concede's `emitOver` set the flag, took the monitor and pushed `over`, and then be
numbered one past it. The flag is now re-checked **under** the monitor, and the
invariant is: once `overEmitted` is set, only `over` is emitted. (*Corrected by
§R.4*: this paragraph first said a frame that reached the monitor first "is
numbered ahead of `over`", but `emitOver` sets the flag and may sleep up to a
second for the outcome capture before it numbers `over`, so a frame that takes
the monitor inside that window is dropped too.) `logC2s` had the same shape for an act (it would be written after `over`
in the file), and so did the ask path (checked at the top, numbered after
`flushState` and the body): both re-check under the same monitor, and the ask is
now numbered before its `ReplyPool` registration, so a dropped ask leaves nothing
registered. A dropped frame is counted (the run summary's new `late frames` line)
and named on stderr (`EMIT AFTER OVER dropped:` / `C2S AFTER OVER not logged: …
lost the race` / `ASK AFTER OVER dropped:`).

`mtgtable.OverRaceSelfTest`, run by `bridge/build.sh` as its fourth self-test,
drives a real `WireGuiGame` over a real `GameLog` with a recording transport — no
engine. Its deterministic half holds the log's monitor on one thread, starts an
`input` emit (or an act) and waits, through `ThreadMXBean`, until it is BLOCKED
on that very monitor, then starts `finishGame()` and waits the same way, then
lets go: the losing interleaving happens every run. Its stress half races two
emitters against `finishGame()` for 300 rounds with no help.

| build | checks | stress rounds ending on a non-`over` frame (wire / file) | frames the re-check dropped |
|---|---|---|---|
| the fix | 11, **0 failures** (five back-to-back runs, and every `build.sh`) | 0 / 0 | 265–306 per 300 rounds |
| **negative control**: the three re-checks disabled (`if (false && overEmitted …)`) in a scratch copy | 11, **11 failures**, exit 1 (three runs) | 71–94 / 91–127 | — |

In the control the deterministic half shows the defect exactly as the gate saw
it: `over` pushed at seq 1 and an `input` at seq 2, in the same millisecond. The
self-test borrows `HeadlessGuiBase`'s own `mtg-table-bg` threads, so there is no
ninth thread name and lint section 6 and the class-init assert are untouched; it
installs the headless GUI first (hard rule 1) and runs under hard rule 6's flags.

**Fix (b): a bare `play.sh` plays the villains.** Already true since §R row 4:
`config.json`'s `match.aiDeck` is `decks/doom-legion.dck`. README, `play.sh`'s
header and `decks/README.md` say a bare `./scripts/play.sh` plays Doom Legion and
a bare `MtgTable` a mirror (D106); CLAUDE.md's `play.sh` block now says so too.

**Fix (c): the arena's plates print the match.** `SeatPlates` passes
`seatMatchOf(state.hello, player.id)` — the one reader the board's rail uses — to
each plate, which draws the deck NAME on a line of its own (`.arena__seat-deck`:
ellipsised to one line at 13rem, the whole name in its `title`, because the plate
sits beside the opponent's duelist, D100) and the profile beside the AI's tag,
`AI (Reckless)`. A stream with no `match` draws no line. In a dev server on 5182,
`?replay=synthetic/sample-handwritten.jsonl#arena` at 1600 × 900, frame 4: the
opponent's plate read `Opponent / AI (Reckless) / Morph probe`, yours `Pacho /
human · you · active · priority / Pacho SHIELD (Marvel Super Heroes)` (180 px, no
ellipsis). Tests: `arena-hud.test.tsx` renders the sample's last frame (both deck
names, `AI (Reckless)`, two deck lines, no `.dck` anywhere in the markup) and
every frame of `g1.jsonl` (no deck line) — negative-controlled with the plates
handed `match={null}`: 1 failure. `liveness.test.ts` gains a clause: the plates
read `seatMatchOf(state.hello, player.id)`, never `hello.match` / `.yourDeck` /
`.aiDeck` directly, and never compare a deck name or a profile — negative-
controlled three ways (a direct `hello?.match?.aiDeck` read, a `match.deck !==
'Doom Legion'` branch, the call removed): each fails exactly that clause.

**The web client**, from `web/`: `npm ci` (339 packages); `npm run build` — `tsc
--noEmit` with **zero errors**, the 2D entry chunk **86.74 kB** gzip; `npm test`
standalone — **825 `node --test` (825 pass) + 92 vitest (6 files)**, where main
had 817 + 91: this branch's 7 `reduce-match` cases, the new liveness clause and
the new arena-hud case.

**The gate**, `rm -rf bridge/out && WSPORT=8670 ./tools/check-all.sh`, on a
desktop running other sessions' headless Chromium (load average 17–29):

| run | tree | result | wall | 9c | node --test in the gate | notes |
|---|---|---|---|---|---|---|
| 1 | the fixes, before `OverRaceSelfTest` stopped storing its stderr | **exit 0** | **1,106 s** | 466 s, 14 / 14 | 835 / 827 pass / 0 fail / 8 skipped; vitest 92 | the self-test buffered 614,523 stderr lines in memory under that load; it now classifies them as they are written and its racers stop at `over` (`var/check-all-ms-rebase-run1.log`) |
| 2 | **the committed tree** | **exit 0** | **970 s** | 408 s, 14 / 14 | 835 / 827 pass / 0 fail / 8 skipped; vitest 92 (6 files) | `OverRaceSelfTest` 11 checks, 0 failures, 274 frames dropped over 300 rounds, 35,751 stderr lines counted and none unexpected; lint 21 files; redaction self-test 20 controls; 2D entry chunk 86.74 kB gzip (`var/check-all-ms-rebase.log`) |

In both runs all 13 session summaries printed `late frames = 0` — the race is rare
enough that a green gate says nothing about it, which is why the self-test forces
it. 9b's advisory fired both times on the known wall-clock class, not on `match`:
run 1, 8 s2c / 2 c2s frame instances (a `Stack: 1 to Resolve` prompt against
`Stack: Empty`); run 2, 38 / 7 (`Waiting for Forge AI...` re-pushes, `act
buttonCancel`, a yield prompt cut at a different moment).

**Under load, live.** Twenty back-to-back sessions of check-all's step 10b —
`MtgTable --transport ws --seed 13 --keep-open` on port 8671 and
`tools/ws-smoke.mjs --disconnect-mid-ask`, the variant that concedes at the
mulligan prompt — while four lanes of `--transport auto` games and twelve
`node -e 'for(;;){}'` burners ran beside them (the script and the load are in the
session scratchpad; the logs in `var/loadproof/`). The load average climbed from
11 to 43. **20 of 20 passed**: client and server exit 0, exactly one `over`, `over`
the last line of the frame log, and `check-redaction.mjs` exit 0 on every log.
And the race happened: in run 20, at a load average of 38, the server printed
``EMIT AFTER OVER dropped: input lost the race to `over` `` and its summary `late
frames = 1`, and the frame log still ends `concede` (c2s 3) → the `gameOver`
`state` (s2c 7) → `over` (s2c 8). Before the fix that `input` would have been s2c
9, and step 10b's "the last frame … is not `over`" would have failed.

After it: `~/forge` and `~/.forge` were fingerprinted before any of this work
(22,155 paths, sizes and mtimes; `~/.forge`'s file hashes) and again at the end,
and neither changed; no process of this worktree's was left, and ports 8670–8674
and 5182 were closed.

### R.4 The second rebase, onto the workshop (`bf0392b`), and the verifier's four findings (2026-09-27)

**The rebase.** `main` moved to `bf0392b` after §R.3 — the workshop, `ca97a82`
and `bf0392b`, with its own **D102–D104**. `git rebase bf0392b` replayed both of
this branch's commits. The first conflicted in CLAUDE.md (the gate-time
paragraph and the two docs-table rows), DECISIONS.md (both sides append after
D101) and README.md (the `tools/` tree and the docs table); the second in
CLAUDE.md's test-count sentence. Every conflict kept both sides, `main`'s text
first; PLAN.md, `web/src/styles.css` and `web/test/liveness.test.ts` merged by
themselves. The verifier's four findings on the rebased branch, and what closed
each:

**1 (blocker): the decision numbers collided.** The workshop reached `main`
first, so, as its own D102 says, the side that lands second renumbers: D102 →
**D105**, D103 → **D106**, D104 → **D107**, D105 → **D108**, in DECISIONS.md's
four headings and the italic note above them (rewritten to say why), and in
every citation this branch wrote — CLAUDE.md (the new paragraph and the
docs-table row), README (the `play.sh` header, *Choosing decks and the AI*, the
tree and the docs table), PLAN.md, `decks/README.md`, this file,
`web/src/arena/DecisionLayer.tsx` and `web/test/liveness.test.ts`. The
workshop's own D102–D104 citations (CLAUDE.md's workshop section, README,
PLAN.md's *The workshop*, `web/src/cards/`, `web/src/workshop/links.ts` and three
tests) were left alone. Each line was classified by whether `git diff bf0392b`
shows this branch adding it, renumbered only if so, and every hit of
`grep -rn 'D10[2-8]'` was then read. `grep -c '^## D[0-9]' DECISIONS.md` is
**108**, D1 to D108, each exactly once, and every count reads **one hundred and
eight** (CLAUDE.md's docs table; README's tree line, which `main` had left at
"one hundred and one", and its docs table). Where §R.2 and §R.3 recount the
earlier renumbering they keep the numbers of the day and say what they are now.
One of `main`'s sentences changed with it: CLAUDE.md's workshop section said
the `match-setup` branch "numbers its own D102–D105, and whichever lands second
renumbers", and now says it landed second and renumbered; PLAN.md's workshop
follow-up 16 is struck through as closed. DECISIONS.md's D102 is left verbatim —
a decision is not edited silently, and what it predicted is what happened.

**2 (major): CLAUDE.md was missing hunks 2 and 3** of
`var/claude-md-match-setup.patch` (§R.3's bullet, corrected above). Added, with
the new numbers: in the Build-and-run block, the bridge example
`./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 --ai-deck
decks/doom-legion.dck --ai-profile Reckless` and the `fetch-art.ts` ("every
decks/*.dck") and `ten-games.sh` ("+ match setup's rows 11-14; check-all's 9c")
line edits; after the `play.sh` block, the paragraph *Match setup (amendment M44,
D105–D108) chose what the seat plays against* — `--ai-deck` / `--deck2`,
`--ai-profile` validated before `FModel.initialize`, the two defaults (only
`play.sh` reads `config.json`'s `match` block; a bare `MtgTable` and the gate
play a mirror, D106), the `Bootstrap.createAiPlayer` seam (D107), "a profile is
not a difficulty", `seatMatchOf` as the one reader of `hello_ok.match` (D105)
and D108's four rules. `--ai-deck` now appears in CLAUDE.md twice (it was 0).
CLAUDE.md's `OverRaceSelfTest` paragraph also gained the corrected invariant
and the open ask gap (findings 3 and 4).

**3 (minor): `emit`'s comment stated the wrong invariant, and a dropped
`gameOver` state counted as sent.** The comment on the re-check said a frame
that got the monitor first "is numbered ahead of `over`". It is not: `emitOver`
sets `overEmitted` and may then sleep up to a second (50 × 20 ms) for an
in-flight outcome capture before it numbers `over`, so a frame that takes the
monitor inside that window is dropped as well. The comment (and
`OverRaceSelfTest`'s header, and §R.3's paragraph) now says the real invariant:
**once `overEmitted` is set, only `over` is emitted**. And `emit` now returns
whether it numbered and pushed the frame; `flushState` counts a `state` and sets
`gameOverStateEmitted` only when it did. Before, the game-thread capture could
build the `gameOver` `state` while the EDT's `emitOver` was waiting for it, have
it dropped by the re-check, and still mark it sent — silencing `emitOver`'s
`OVER WITHOUT A gameOver STATE` on exactly the run where it is true.
`./bridge/build.sh`: lint OK (21 files), and all four self-tests pass —
`OverRaceSelfTest` 11 checks, 0 failures.

**4 (minor): the ask path's push.** `WireGuiGame.ask` numbers its frame under
the log's monitor but pushes it later, inside `Transport.ask`, so a concede's
`over` can be numbered after that ask and still reach the socket first. Not
restructured (that is the transport's ask); recorded open as **Tier 2 slice 4's
follow-up 13(d)** in PLAN.md, beside (b) and (c), and in a comment at the
re-check. **No ask-path case was added to `OverRaceSelfTest`**: `ask` asserts a
game thread (`Transport.assertGameThread`, a bare `startsWith("Game")`), and
reaching one from the self-test would take either a fourth
`ThreadUtil.invokeInGameThread` hop — hard rule 3 wants a written exclusion
argument in DECISIONS.md for that — or a thread of ours named into the `Game`
prefix, which the thread-name rule and lint section 6 exist to forbid. The
follow-up and the self-test's header both say it does not cover the ask path.

**One more semantic conflict: the workshop's catalog.** `main`'s
`tools/build-workshop-catalog.ts` reads every `decks/*.dck`, and
`workshop.test.ts` fails when `web/src/workshop/catalog.json` has drifted from
them, so this branch's `decks/doom-legion.dck` made the committed catalog stale
(`--check` exit 1). Regenerated: 11 decks, and 25 names *never face up* where
there was 1 — 24 of Doom Legion's 27, because no committed recording plays it
(only Aerial Doombot, Thriving Isle and Island have been seen, in other decks'
games). The workshop is a dev page reading committed deck files; D105 governs
`hello_ok`, not it. That the pedestal cannot yet show a villain is match setup's
new follow-up 10.

**The web client**, from `web/` (its `node_modules` already matched the lock
file; neither side changed `package.json`): `npm --prefix web test` standalone —
**870 `node --test` (870 pass, 0 skipped) + 94 vitest (6 files)**, where `main`
had 862 + 93: this branch's 7 `reduce-match` cases, its liveness clause for the
arena's plates and its `arena-hud` case. `node tools/fetch-art.ts` wrote
`web/public/art.json` (65 entries, gitignored) and `./tools/make-forge-home.sh`
was re-run before the gate.

**The gate**, `rm -rf bridge/out && WSPORT=8680 ./tools/check-all.sh`
(`var/check-all-match-setup-final.log`), with no `SKIP_*`: **`check-all OK`, exit
0, 897 s**, at a load average of 11 at the start and 19 at the end. 9c's
fourteen games took 370 s, 14 / 14. Inside the gate `node --test` was **880 /
872 pass / 0 fail / 8 skipped** (`MTGTABLE_WS_LOGS` naming step 10's four logs)
and vitest 94 (6 files); the 2D entry chunk is 87.67 kB gzip, and the scene chunk
`arena-scene-*.js` 347.96 kB. `OverRaceSelfTest` passed its 11 checks with 293
frames dropped over 300 stress rounds; lint 21 files; 9b's multiset diff was
identical (1,587 frames); all 13 session summaries printed `late frames = 0`.
After the run, `WireGuiGame.java` took one more comment-only edit (the note that
an ask is pushed outside `emit`), and `./bridge/build.sh` — the lint and the four
self-tests — was run again on the final tree: build OK, `OverRaceSelfTest` 11
checks, 0 failures.

`~/forge` and `~/.forge` were fingerprinted before this work (`~/forge`'s path
count, 22,128, and its top level's sizes and mtimes; every `~/.forge` path's size
and mtime, 27 paths; a checksum of `~/.forge/decks/constructed/`) and again at
the end: unchanged. No process of this pass was left running, and ports 8680–8684
were closed.
