# decks/

Every `.dck` here is Forge's own deck format — a `[metadata]` block with a
`Name=`, then `[main]` (and optionally `[sideboard]`) lines of
`<count> <Card Name>|<SET>`. The set code is optional; when it is there it pins
the printing, both for Forge and for `tools/fetch-art.ts`, which asks Scryfall
for that set first.

The bridge loads a deck with `DeckSerializer.fromFile` and nothing else (hard
rule 4): `FModel.getDecks()` would rename a file to its `Name=`, move it up a
directory and delete one it cannot parse. So these files are only ever read.

| file | `Name=` | what it is |
|---|---|---|
| `pacho-shield.dck` | Pacho SHIELD (Marvel Super Heroes) | **the user's real deck.** W/U S.H.I.E.L.D., 40 cards. What you play. |
| `pacho-shield.txt` | — | the same list as the user wrote it, without set codes. Not read by anything. |
| `doom-legion.dck` | Doom Legion (Marvel Super Heroes villains) | **the AI's deck.** U/B villains, 40 cards. What a bare `./scripts/play.sh` seats against you (`config.json`'s `match.aiDeck`). |
| `*-probe.dck` (nine) | … probe | test decks that force one engine path each. Never meant to be fun. |

## Using them

```bash
./scripts/play.sh                                        # your deck vs the villains (config.json's match block)
./scripts/play.sh --mirror                               # vs a copy of your own deck
./scripts/play.sh --ai-profile Cautious                  # one of Forge's four AI profiles
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck
node tools/check-deck.mjs decks/doom-legion.dck --scryfall  # is every card really in the engine?
node tools/fetch-art.ts                                  # art for EVERY deck here -> web/public/art.json
```

`--ai-deck` is `--deck2`'s newer spelling. `scripts/play.sh` takes its default
from `config.json`'s `match.aiDeck` — shipped as `decks/doom-legion.dck`, and
`null` (or `--mirror`) means the AI plays a copy of your deck. The bridge itself
does not read that block (**D103**): `./bridge/run.sh mtgtable.MtgTable` with no
`--ai-deck` plays a mirror, which is also what keeps the gate's games fixed.

`--ai-profile` picks one of the four `.ai` files in `forge-home/res/ai/`
(`Default`, `Cautious`, `Reckless`, `Experimental`). **It is not a difficulty
setting** — Forge has none. Each profile is 121 heuristic values (report 11 §9)
whose effect is situational. In same-seed pairs against the automated seat —
which attacks with everything every turn and so rarely leaves a blocker up —
Cautious and Reckless were **not measurably different**. Against a seat that
does leave untapped creatures, the first choice where the two games part was
a **trade** in 6 of 10 pairs: Reckless (`PLAY_AGGRO=true`,
`CHANCE_TO_ATTACK_INTO_TRADE=100`) attacks or blocks into it, Cautious (`false`,
`0`) holds back; in the rest it was when to spend removal or which play comes
first (`docs/evidence/match-setup.md` §P).

A new deck needs a `node tools/fetch-art.ts` before the board can draw its
art — until then its cards render as generated text frames, which is a supported
state, not an error.

### Checking a deck: `tools/check-deck.mjs`

Three passes, from the repo root:

1. **static** (always, milliseconds): every line's Forge script found by its
   `Name:` line — the D14 overlay in `forge-home/custom-cards/` first, because
   that is what the engine loads — the edition file consulted for a line's set
   code, `AI:RemoveDeck:All` flagged (Forge's own "the AI cannot play this"),
   and the curve, colour pips and land/creature split printed;
2. **engine** (default; `--no-engine` skips it, ~6 s): `./bridge/run.sh
   mtgtable.Smoke <deck>` — the bridge's own boot, `Smoke.auditDeck`'s
   `CardRules.isUnsupported()` audit (the predicate `Match.prepareAllZones`
   drops cards by, silently), Limited conformance, and one AI-vs-AI mirror
   game. A name Forge has no script for loads as a placeholder (edition `???`)
   that the audit counts and Limited conformance rejects by name; the card and
   distinct-name counts are compared with the file's as a backstop;
3. **Scryfall** (`--scryfall`): the printing in the line's set, 2 requests a
   second with `config.json`'s User-Agent, diffed against the script — mana
   cost, type line, P/T, keywords (a `K:` line the printed card lacks is a
   **mismatch**: that is how A.I.M. Scientists' stray Trample would have been
   caught) and Oracle text (drift is reported, not failed).

`--stock` ignores the overlay; `node tools/check-deck.mjs decks/pacho-shield.dck
--no-engine --scryfall --stock` is the negative control and must fail on A.I.M.
Scientists. Exit 0 is a pass, 1 a failure, 2 bad usage.

---

## `pacho-shield.dck` — Pacho SHIELD

The user's own table deck, card for card. White-blue S.H.I.E.L.D. agents whose
theme is **attacking alone** (Peggy Carter, Agent 13, Agents of S.H.I.E.L.D.,
Nick Fury, Strategic Intervention, the Spy Kit), with an Ant-Man/Wasp
shrink-and-fly package and two Teamwork spells.

- 40 cards, 28 distinct; 16 lands (7 Plains, 7 Island, Thriving Heath, Thriving
  Isle); 24 spells, 13 creatures.
- Curve (mana value: cards) `1:4  2:7  3:7  4:3  5:3`; pips W 11, U 12, G 1 (Ant-Man's
  hybrid `{G/U}` counts for both).
- 30 cards MSH, 10 MSC. The ten lines without `|MSH` are exactly the ten cards
  MSH does not print (report 08 §1).
- Verified card by card in
  [`docs/research/08-deck-card-coverage.md`](../docs/research/08-deck-card-coverage.md):
  27 of 28 faithful; A.I.M. Scientists' Trample is removed by the D14 overlay.

## `doom-legion.dck` — Doom Legion

**The villains' deck: Doctor Doom's robots, HYDRA's endless agents, Kang across
three of his identities, and Loki.** Built for the AI to play against Pacho's
deck, from the same two sets (Marvel Super Heroes, MSH, and Marvel Super Heroes
Commander, MSC), with every card confirmed in Forge 2.0.14 and on Scryfall.

### Colours: blue-black, because that is where the villains are

Doom, HYDRA and the Masters of Evil are black in MSH; Kang the Conqueror, Loki,
the Doombots and A.I.M.'s robots are blue; Kang, Temporal Tyrant is the gold
card that says so. Black is the main colour (17 pips, including Doom's `{B}{B}`),
blue the second (9 pips, including Kang the Conqueror's `{U}{U}`).

### The list — 23 spells (17 creatures), 17 lands

| mana value | cards | role |
|---|---|---|
| 1 | 2 Aerial Doombot | 1/1 flying robot; power-up `{5}{U}` makes it a 4/4 flyer late |
| 2 | 2 Agents of HYDRA | 1/1 that leaves a 2/1 **menace** Villain token when it dies — cut off one head… |
| 2 | Loki, God of Mischief | 2/1; draws when an ability of yours targets something (once a turn) |
| 2 | Doom's Servo-Guards | 2/2 artifact robot: gain 2, mill 2 |
| 2 | Doom Reigns Supreme | **the Plan.** Every Villain that enters drains 1; the fifth plan counter exiles the opponent's top five and casts two of them free |
| 2 | Dark Deed · Doom Blade | removal: −4/−4 at instant speed; destroy a nonblack creature (every creature Pacho plays is nonblack) |
| 3 | Baron Strucker, HYDRA Overlord | **Villain spells cost `{1}` less** (all 17 creatures are Villains); another Villain entering may connive, once a turn |
| 3 | 2 HYDRA Troopers | 3/2; a tapped 2/1 menace token if two creature cards are in your graveyard, else mill 2 (which sets that up) |
| 3 | A.I.M. Bot | 2/3 flying artifact robot |
| 3 | Visions of Villainy | draw two, lose 2 — costs `{1}{B}` with a Villain out |
| 3 | Frozen in Ice | removal aura: tap, lose all abilities, never untap |
| 4 | Kang the Conqueror | **4/5 flyer**; power-up `{5}{U}{U}{U}` (`{3}{U}` the turn he lands) takes an **extra turn** |
| 4 | Kang, Temporal Tyrant | 3/4; connives on attack; your second draw each turn drains 1 |
| 4 | Unliving Legionnaire | 3/2 flyer; power-up returns a creature card from the graveyard and grows |
| 4 | Madame Hydra, Reanimated | menace, +1/+1 per creature card in your graveyard; mills 2 on entering and attacking |
| 4 | Hour of Defeat | destroy target creature, surveil 1 |
| 4 | Crossbones, Malicious Mercenary | 3/3 **deathtouch**; the first time each turn another Villain of yours enters, he grows a +1/+1 counter and deals **2 to each opponent** |
| 5 | Pharaoh Rama-Tut | 4/4 **ward 2** — one of Kang's earlier identities; connives whenever you cast a noncreature spell |
| 6 | Doctor Doom | 3/3 who brings **two 3/3 Doombot tokens**, is **indestructible** while you control an artifact creature *or a Plan*, and draws you a card every end step |

Lands: 7 Swamp, 5 Island, Thriving Isle, Thriving Moor, Hidden Lair (a U/B dual
while you control a basic), Castle Doom (colourless, any colour for artifact
spells, and `{3}`, tap, sacrifice an artifact: a 3/3 Doombot), Villainous Hideout
(colourless, any colour for a Villain spell or a Villain's ability, and
`{3}`, tap: a Villain connives). Black sources 10 and blue 8 (both Thriving lands
make both colours once the AI names the other one), plus the Hideout for any
Villain and Castle Doom for the four artifact creatures.

- 40 cards, 27 distinct; 17 creatures (every one a Villain), 4 instants,
  2 enchantments (4 of the creatures are artifacts).
- Curve `1:2  2:7  3:6  4:6  5:1  6:1`. At most two copies of anything; the
  seven legendaries are singletons.
- 33 cards MSH, 7 MSC, and **every line carries its set code**.

### How it plays

Early, it trades: Doombots and HYDRA agents are cheap Villains, and a dead
Agent of HYDRA is a 2/1 menace token — so blocking them is never clean. **Doom
Reigns Supreme** turns each of those Villains (tokens included) into a point of
drain, and once it is on the table **Doctor Doom is indestructible** even with no
robot around, because the Plan alone satisfies him. Baron Strucker makes every
creature a mana cheaper, and each turn the first Villain to arrive after him may
connive (draw, discard, and a +1/+1 counter if the discard was a spell).

It has four answers for Pacho's key pieces — Doom Blade, Dark Deed, Hour of
Defeat and Frozen in Ice — and Crossbones, a deathtouch wall that turns every
Villain after him into 2 damage; and it goes over the top in the air: A.I.M.
Bot, Aerial Doombot, Unliving Legionnaire and Kang the Conqueror all fly, and
Kang's power-up is an extra turn. Card flow comes from connive
(Kang, Temporal Tyrant, Rama-Tut, Strucker, the Hideout), Visions of Villainy and
Doom's end step.

Against Pacho: Pacho wants to attack **alone**; Doom Legion goes wide, so a lone
attacker walks into a board of blockers, and every menace token needs two of
Pacho's creatures to stop it. Pacho's five fliers (the Helicarrier, Wasp, the
Air Force, the Giant-Sized Flying Ant, its own Aerial Doombot) meet four flying
villains.

### What was checked (details: report 08 §8, `docs/evidence/match-setup.md`)

- `node tools/check-deck.mjs decks/doom-legion.dck --scryfall` — PASS: 27 scripts
  found, every set code in its edition file, 0 dropped, Limited-legal, the
  mirror game completes; on Scryfall every name is in `msh` / `msc` with mana,
  type, P/T and keywords identical. Three Oracle-text drifts, all display-only
  (the two Thriving lands' older templating, and Hidden Lair's `Oracle:` line
  reading "if your control").
- **21 games through the real wire path** (`--transport auto`), the deck in
  every role — the AI's deck against Pacho's under all four AI profiles, the
  seat's deck, and the mirror — every one `MTGTABLE OK`, one `over`, no
  `UNIMPL`, 0 emit errors, and **`check-redaction.mjs` clean**. Then, after the
  second swap below, **38 more with the AI on this list**, all clean, and every
  one of the 20 nonland cards cast or activated **by the AI** at least once
  (Crossbones in 16 of the 38; Dark Deed only once — the AI holds it).
- Doom Reigns Supreme's payoff in both directions: the AI's copy exiling your
  top five (reached in one of the 21), and your copy exiling the AI's (forced
  with a scratch deck, 6 games, reached twice) — the redaction gate clean both
  ways. Not reached anywhere: Kang the Conqueror's extra turn and Castle Doom's
  Doombot ability.
- `node tools/fetch-art.ts` — 27/27 names resolved, all in the deck's own sets
  (re-run after the second swap: Crossbones at MSH #91).

**One card was swapped out after testing: Kang Prime** (MSC #85). Its "exile
cards from the top of your library until you exile a nonland card" is Forge's
`DigUntil`, which *reveals* each card while it is still in the library, so the
opponent's `library.cards` carries full cards for one frame. That is a real
reveal (they are exiled face up a frame later), but `tools/check-redaction.mjs`
cannot tell it from a leak and fails it (A3), 2 recordings out of 10. Pharaoh
Rama-Tut took the slot: a Kang, a 5-drop, no library reveal.

**A second was swapped out after review: Trickster's Stratagem** (MSH #81).
Forge's AI never casts it — 14 copies over 61 turns in a probe, and no cast from
the AI's side in any of the 21 games — so the deck was really 39 cards, and the
one path it was there for (you, as the owner, choosing top-2 or bottom) could
never happen. **Crossbones, Malicious Mercenary** took the slot: a 4-drop the AI
does cast. Report 08 §8.3b, `docs/evidence/match-setup.md` §D.6.

### Other villains you could swap in

All in Forge 2.0.14 and in MSH/MSC; each is a one-line change, and
`tools/check-deck.mjs` then `tools/fetch-art.ts` is the whole procedure.

- **Loki, Lord of Misrule** (MSC, `{3}{U}` 3/4) — a bigger Loki; its ability
  makes your creatures copies of one of them, which no game here has exercised.
- **Doctor Doom, Unrivaled** (MSC, `{2}{B}{B}` 4/4 lifelink) — a second Doom at
  four mana (a different name, so the legend rule lets both stand).
- **Arnim Zola, Bio-Fanatic** (MSH, `{2}{B}` 2/3) — more HYDRA, makes menace
  tokens from a full graveyard.
- **Kang Prime** — see above: fine in the engine, fails the redaction gate.
- **Trickster's Stratagem** — see above: fine in the engine, never cast by the
  AI. Worth checking any removal card for the same thing: count its AI casts
  over a few `--transport auto` games before trusting it in an AI deck.
- **Baron Helmut Zemo** (MSH) — carries `AI:RemoveDeck:All`; Forge's AI cannot
  play him, so he stays out of an AI deck.
- **Super Villain Lockup** (MSH #37) is **white** — a hero's card that locks a
  villain up — so it is not in a blue-black villain deck.

---

## The probe decks

Each exists to make the engine reach one path the real decks never (or rarely)
reach; `docs/evidence/m2-console.md` §9, `m5-probes.md` and `m6-engine.md` are
where each was introduced. They are 40 cards of one to four names on purpose:
the path fires every game.

| file | contents | forces | used by |
|---|---|---|---|
| `amount-probe.dck` | 20 Mountain, 20 Manamorphose | `assign_amount` (a mana combination), floating mana (`useMana`) | ten-games seed 4 (`--probe --mana-lost-prompt`), `human-amount-7` |
| `future-sight-probe.dck` | 22 Island, 18 Future Sight | a continuous may-look static: `library.cards` beyond `count` | `fixtures/games/future-sight.jsonl` (RecordMatch) |
| `morph-probe.dck` | 18 Mountain, 8 Ainok Tracker, 8 Battering Craghorn, 6 Ashcloud Phoenix | face-down cards (morph) | the `--deck2` of every probe row; `morph.jsonl`, `disjoint.jsonl` |
| `number-probe.dck` | 24 Mountain, 16 Volcano Hellion | the `text` ask (choose a number, "Other…") | ten-games seed 6, `human-number-7` |
| `scry-probe.dck` | 24 Island, 16 Opt | scry 1 → `input.focusCard` with a library card | ten-games seed 10, `human-scry-7` |
| `search-probe.dck` | 20 Forest, 20 Rampant Growth | `choose_entities` with a `delayedReveal` (library search) | ten-games seed 2, `human-search-7` |
| `sideboard-probe.dck` | 18 Forest, 22 Garruk's Companion; sideboard 15 Giant Growth | the `sideboard` ask between games | check-all step 9d |
| `trample-probe.dck` | 18 Forest, 22 Garruk's Companion | `assign_damage` (a trampler) | ten-games seed 8, `human-trample-7` |
| `yield-probe.dck` | 18 Forest, 22 Thallid | the same triggered ability on the stack every turn (auto-yield) | check-all step 10g, `human-yield-13` |

`tools/check-deck.mjs` warns `AI:RemoveDeck:All` on Manamorphose and Volcano
Hellion. That is expected: those decks are played by the **seat**, not the AI.
