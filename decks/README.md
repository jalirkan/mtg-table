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
| `masters-of-evil.dck` | Masters of Evil (Marvel Super Heroes villains) | **an AI deck.** B/R villain aggro, 40 cards. The AI curves out a Villain a turn from its second, swings with everything from its third (2.5 attackers a combat, the widest of the four), and spends Lightning Bolt and Shock on the one blocker you leave. |
| `hulk-family.dck` | Hulk Family (Marvel Super Heroes gamma) | **an AI deck.** R/G gamma stompy, 40 cards. The AI plays Birds of Paradise first when it has one, attacks from its third turn with Hellcat or a Gamma Grotesque, then lands a 4/4 trampler a turn; it holds HULK SMASH! until you have a creature worth hitting. |
| `wakanda.dck` | Wakanda (Marvel Super Heroes Black Panther) | **an AI deck.** G/W go-wide, 40 cards. The AI puts down a 2-drop a turn (T'Chaka, a Gallant Citizen, Shuri), widens the army with Okoye's Soldiers and Black Panther, Vanguard's tokens, attacks with all of it from its third turn, and keeps Swords to Plowshares for a real threat. |
| `specs/*.json` (four) | — | **the AI decks' specs**: each `.dck` above and `doom-legion.dck` is written from one by `tools/build-deck.ts`, never typed by hand (below). |
| `*-probe.dck` (nine) | … probe | test decks that force one engine path each. Never meant to be fun. |
| `fra-rw-aggro.dck` | Reality Fracture red-white legends aggro | **the user's Reality Fracture pool** (FRA), 40 cards + 10 sideboard. **Does not play on Forge 2.0.14** — see below. |
| `fra-rw-aggro.txt` | — | the same list as the user wrote it, under a `#` header that says so. Not read by the engine. |

## Using them

```bash
./scripts/play.sh                                        # your deck vs the villains (config.json's match block)
./scripts/play.sh --mirror                               # vs a copy of your own deck
./scripts/play.sh --ai-profile Cautious                  # one of Forge's four AI profiles
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # the Masters of Evil (B/R villain aggro)
./scripts/play.sh --ai-deck decks/hulk-family.dck       # the Hulk family (R/G gamma stompy)
./scripts/play.sh --ai-deck decks/wakanda.dck           # Wakanda (G/W go-wide)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck
node tools/check-deck.mjs decks/doom-legion.dck --scryfall  # is every card really in the engine?
node tools/build-deck.ts --check                         # is every AI deck still its spec's?
./tools/deck-smoke.sh                                    # five games per AI deck, the AI piloting it (NOT in the gate)
node tools/fetch-art.ts                                  # art for EVERY deck here -> web/public/art.json
```

The three `--ai-deck` lines are the same match setup as Doom Legion's: you in
the browser, the AI on the deck you name. The five games per deck that
`tools/deck-smoke.sh` plays put the automated seat in your chair instead (it
plays badly on purpose, `AutoTransport`), and their frame logs stay under
`var/games/smoke-<deck>-<seed>/`; against that seat the AI wins in five to eleven
of its own turns, eight or fewer in most games
(`docs/evidence/more-villains.md`).

`--ai-deck` is `--deck2`'s newer spelling. `scripts/play.sh` takes its default
from `config.json`'s `match.aiDeck` — shipped as `decks/doom-legion.dck`, and
`null` (or `--mirror`) means the AI plays a copy of your deck. The bridge itself
does not read that block (**D106**): `./bridge/run.sh mtgtable.MtgTable` with no
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

Two warnings came out of building the AI decks (neither fails a deck, because
both are fine for the SEAT's deck): a script that **reveals cards while they are
still in the library** (`DigUntil`, a `Dig` with `Reveal$ True`,
`PeekAndReveal` — Kang Prime and Wakanda Forever!), which `check-redaction.mjs`
fails when the AI owns that library (A3, §D.3 of match-setup's evidence); and an
edition print with a **flavour name** — Forge may pick it, and then the wire
names the card by it (Fleecemane Lion in MSC is always *Wakandan War Panther*),
which the deck's own name, `art.json` and the workshop do not match.

### Building an AI deck: `decks/specs/` and `tools/build-deck.ts`

Every AI deck is **written from a spec, never typed**: `decks/specs/<deck>.json`
is the card list in the order the `.dck` prints it, every line with a one-line
`why`, plus the deck's `Name=`, its two colours, its size, its land count and a
minimum creature count. `tools/build-deck.ts` resolves every name against the
local card library (`var/cards/cards.sqlite`, `tools/card-library/README.md`),
refuses anything that is not an exact name, not printed in MSH or MSC, not
payable in the two colours, over two copies (one for a legendary) or off the
spec's counts, and writes the `.dck` with the set convention Doom Legion was
hand-written to — `|MSH` when MSH prints the card, else `|MSC`. It reproduces
`doom-legion.dck` byte for byte from its spec.

```bash
node tools/build-deck.ts --pool BR --type Villain      # what the pool offers (no network)
$EDITOR decks/specs/masters-of-evil.json                # change a line, with its why
node tools/build-deck.ts                                # write every .dck from its spec
node tools/check-deck.mjs decks/masters-of-evil.dck --scryfall   # the engine and Scryfall
./tools/deck-smoke.sh decks/masters-of-evil.dck         # does the AI actually play it?
node tools/fetch-art.ts                                 # its art (Scryfall, a few minutes)
node tools/build-workshop-catalog.ts                    # the workshop's list reads every deck
node tools/build-deck.ts --check                        # 0 = every .dck is its spec's
```

`web/test/deck-specs.test.ts` holds the hermetic half inside `npm --prefix web
test`: each `.dck` is its spec line for line, every line carries `|MSH` or
`|MSC`, and every `decks/*.dck` that is not yours or a probe **has** a spec.

### Playing them: `tools/deck-smoke.sh` (not in the gate)

Five `--transport auto` games per AI deck at seeds 1–5, your deck in the seat
and the AI on the deck, each asserted to reach `over` inside `GAME_TIMEOUT`, to
pass `check-redaction.mjs`, and to show the AI **attacking** at least once and
**casting** at least `min(8, its turns − 3)` spells (`DECK_SMOKE_STRICT=1`
demands the flat 8; **D117** says why the flat 8 is not the default). Then a
table — AI wins, losses, turns, spells, attacks — and, advisory, the lines the AI
never cast. About two and a half minutes with `--jobs 4`; the first run is
`docs/evidence/more-villains.md`.

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

### Its recording, and how it looks in the arena (2026-09-29, D220–D221)

`fixtures/games/villain-doom-248.jsonl` is this deck's committed game — the
Doom Legion's seat against Pacho's deck, seed 248, chosen by a census of 440
seeds for the most of the deck face up and on the table (26 of the 27 names;
twelve of its fifteen creatures and tokens on the battlefield; Doom Reigns
Supreme paying off the turn Doctor Doom arrives with his Doombots). Every
creature it names, and both tokens, reads as itself in the arena and the
workshop — Doom's iron mask under a green hood, HYDRA in green and yellow, the
Kangs' blue masks. `docs/evidence/villain-identity.md` is what was measured, and
README's *Villain identity* is what each one looks like.

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

## `fra-rw-aggro.dck` — waiting for an official Forge release

The user's Reality Fracture (Scryfall `fra`, Forge edition `FRA`) pre-release
pool: red-white legends aggro, 40 main and 10 sideboard, copied line for line
from the user's own list. Every line is `|FRA` except Austere Command, `|SPG`
(the set's Special Guests reprint).

**It does not play on the engine this repo runs, and that is a decision, not a
bug** (DECISIONS.md **D109**–**D111**). Forge 2.0.14 predates the set: 17 of the
main deck's 20 names have no script there, and Forge would drop those cards from
the library without a word. So, on 2.0.14 and by design:

- `node tools/check-deck.mjs decks/fra-rw-aggro.dck` **fails** (and so does any
  `check-deck.mjs decks/*.dck`);
- `node tools/audit-deck.mjs decks/fra-rw-aggro.dck` reports **19 ok, 31
  missing, 0 broken** (copies, main + sideboard) and exits 1;
- no gate step plays it, and nothing hand-writes or overlays a card script to
  make it play early (**D111**).

What does work today: `node tools/fetch-art.ts` resolves all 28 of its names on
Scryfall, the workshop lists its cards (with no figure facts yet), and the card
browser lists the deck. Its opponent is a draft outside this directory,
`docs/drafts/decks/fra-gb-leftovers.dck` (**D112**), until the user accepts it.
The day an official Forge release ships the set is
[`docs/research/14-engine-upgrade.md`](../docs/research/14-engine-upgrade.md)
§0's checklist; report 08 §9 is the deck card by card.

---

## `masters-of-evil.dck` — Masters of Evil

**Baron Zemo's team, without Baron Zemo** (Forge's AI cannot play him,
`AI:RemoveDeck:All`): Titania, Moonstone, Whirlwind, Klaw, Radioactive Man, Tiger
Shark, Atlas and Yellowjacket (Rita DeMara) have all been Masters of Evil in the
comics, and Songbird, MACH-1 and Fixer were Masters before they were
Thunderbolts; Yelena Belova, Boomerang and Whiplash are villains of the same
street, the Common Crooks and Volcanic Villains the henchmen, and *The Masters of
Evil* the lord. Black-red **villain aggro**.

- 40 cards, 27 lines; 17 lands (7 Swamp, 6 Mountain, Hell's Kitchen, Dark
  Fortress, Villainous Hideout, Dragonskull Summit); 23 spells: 19 creatures, every one a Villain
  (what the team card's +2/+1 and Villainous Hideout's mana want), two burn
  spells, Night's Whisper and the Saga.
- Curve `1:3  2:9  3:4  4:5  5:1  6:1`; pips B 19, R 7 (Tiger Shark's and
  Atlas's hybrid `{U/B}` / `{B/G}` halves are paid with black). 24 MSH, 16 MSC.
- One of everything but Common Crook and Volcanic Villain (two each).

| mana value | cards | role |
|---|---|---|
| 1 | Whiplash · Lightning Bolt · Shock | a 2/2 for one; 3 and 2 damage for {R} |
| 2 | Songbird · MACH-1 · Yellowjacket · Boomerang · Fixer · Yelena Belova · 2 Common Crook · Night's Whisper | the curve: lifelink, two fliers, a drain on attack, deathtouch, henchmen that leave Treasure; draw two |
| 3 | Whirlwind · 2 Volcanic Villain · Klaw | three hasty attackers; Klaw takes a card from your hand |
| 4 | Titania, Proud Pummeler · Moonstone · Tiger Shark · Atlas · Avengers: Under Siege | first strike and melee for the team, a 2/4 flier, connive, a 5/4 reach; the Saga's menace tokens and 2 to you |
| 5 | Radioactive Man | deathtouch; his combat damage halves your life |
| 6 | The Masters of Evil | every other Villain gets +2/+1 |

**How the AI plays it** (20 games, `docs/evidence/more-villains.md`): a Villain a
turn from its second, the first attack by its third turn in 9 of 10 games, and
the widest attacks of the four decks (2.5 attackers a combat). Lightning Bolt and
Shock go at the one creature you leave back, not your face. Volcanic Villain
(haste) and Common Crook are what it casts most; Radioactive Man and the team
card seldom arrive before the game is over.

**Cut while it was built:** Deadly Dispute (the AI never cast it — not in ten
real games, and not from eight copies in either of two probe games: the
Trickster's Stratagem lesson again), and Living Laser (a 5-drop the curve could not afford).

**Its recording** (2026-09-29, D230–D231): `fixtures/games/villain-masters-of-evil-33.jsonl`,
the Masters of Evil's seat against Pacho's deck, seed 33 — chosen by a census of
300 seeds for the most names face up (22 of 27; no seed showed all 27) and the
most creatures on the table (14 of 17). Every creature reads as itself in the
arena and the workshop — the team as Zemo's squad, MACH-1's red lenses, Radioactive
Man's glow (README's *More villain identity*; `docs/evidence/more-villain-identity.md`).

## `hulk-family.dck` — Hulk Family

**Everyone the gamma bomb touched, and the people around them:** Hulk three ways
(Brutal Brawler, Strongest There Is, Gamma Goliath), Red Hulk, She-Hulk twice,
Abomination twice, Brawn (Amadeus Cho) and the Gamma Grotesques, with Rick Jones,
Hercules (Cho's partner after *World War Hulk*), Hulkling, Hellcat (a Defender
beside Hulk) and Wolverine, whose first appearance was a fight with Hulk.
Red-green **stompy**: 22 creatures that grow each other with +1/+1 counters.

- 40 cards, 24 lines; 17 lands (9 Forest, 5 Mountain, Los Diablos Missile Base —
  where Banner tested the gamma bomb — Training Compound, Rootbound Crag); 23 spells,
  22 creatures and HULK SMASH!.
- Curve `1:3  2:7  3:5  4:6  5:1  6:1`; pips G 27, R 6 — **every double pip is
  green**, and red is a splash (see below). 28 MSH, 12 MSC.
- **Three cards from outside the family, named as such:** two Birds of Paradise
  (a generic reprint: mana of any colour, so a 4-drop Hulk lands on turn three),
  two Gallant Citizens (a generic 1/1 that draws a card; its flavour text is
  J. Jonah Jameson's) and two Knights of Wundagore (the High Evolutionary's
  cat-knights: a Villain 2-drop that grows whenever the Hulks hand out a
  counter, and whose combat damage grows Abomination, Irradiated Brute).

| mana value | cards | role |
|---|---|---|
| 1 | Rick Jones · 2 Birds of Paradise | the sidekick digs four for a Hero; ramp |
| 2 | Brawn · Hellcat · 2 Knight of Wundagore · 2 Gallant Citizen · HULK SMASH! | card draw, haste, counters; a bite spell |
| 3 | 2 Gamma Grotesque · She-Hulk, Attorney-at-Law · Hercules · Hulkling | 3/3s, two with vigilance |
| 4 | Hulk, Brutal Brawler · Hulk, Strongest There Is · Abomination ×2 · She-Hulk, Jade Defender · Wolverine | four tramplers, a counter engine, a fight on arrival |
| 5 | Hulk, Gamma Goliath | 6/5 reach trample |
| 6 | Red Hulk | 6/7 reach trample that shoots back |

**How the AI plays it:** Birds first when it has one (the card it casts most),
the first attack on its second or third turn with Hellcat or a Gamma Grotesque,
then a 4-drop trampler a turn. It holds HULK SMASH! until you have a creature
worth hitting. Its games are the shortest of the four (10–12 player turns), so
the top end seldom arrives: Hulk, Gamma Goliath and Red Hulk were cast in a
probe deck of them and in earlier versions of the list, but in none of the
fifteen games of the final one.

**Cut while it was built:** She-Hulk, Jennifer Walters (the AI sacrifices its own
lands to her draw ability and stalls on three); Hulk, Bruce Banner (`{R}{R}` —
with red and green both double-pipped the AI missed whole turns holding a full
hand, so every double pip but Red Hulk's is green now and red is a splash); Doc
Samson (not cast in twenty games) and She-Hulk, Wallbreaker (the curve), for the
two Knights; Origin of the Hulk and Beast (not cast in ten), for the two
Citizens; Shock, Lightning Strike and Giant Growth (the second list cast neither
burn spell in five games: a seat that keeps no creature leaves them nothing to
hit). World War Hulk stays out on purpose: its
chapter I lets you play creature cards from your **library**, a may-play the
redaction gate has never been shown.

**Its recording** (2026-09-29, D230–D231): `fixtures/games/villain-hulk-family-261.jsonl`,
the Hulk family's seat against Pacho's deck, seed 261 — all 24 names face up, 13 of
its 18 creatures on the table (Rick Jones mills five of its own Hulks). The Hulks
are gamma bodies — green, red, grey-olive, the biggest people on the table
(README's *More villain identity*).

## `wakanda.dck` — Wakanda

**Black Panther's kingdom:** four Black Panthers (T'Challa, Claws of Bast, Most
Dangerous, Vanguard) and Shuri twice, T'Chaka, Okoye twice, Nakia, Storm as
Queen of Wakanda, the Dora Milaje, the Shield Guard, the Tuskers, the Warriors
and the Drone Flock. Green-white **go-wide**: a 2-drop a turn, tokens, lifelink
and +1/+1 counters.

- 40 cards, 24 lines; 17 lands (7 Plains, 7 Forest, Birnin Zana Plaza — the
  capital — Gathering Place, Sunpetal Grove); 23 spells, 21 creatures, Swords to
  Plowshares and Vibranium Energy Daggers.
- Curve `1:2  2:10  3:5  4:5  5:1`; pips W 22, G 14. 20 MSH, 20 MSC.
- Two Gallant Citizens here too: a generic 1/1 that draws a card (its flavour
  text is J. Jonah Jameson's), for the curve and the card.

| mana value | cards | role |
|---|---|---|
| 1 | Swords to Plowshares · Vibranium Energy Daggers | the one removal spell; +2/+2 indestructible equipment |
| 2 | Shuri, the Black Panther · T'Chaka · 2 Dora Milaje Elite · 2 Wakandan Shield Guard · 2 Gallant Citizen · 2 Wakandan Tusker | lifelink, first strike, a Soldier token, a card, life and scry |
| 3 | T'Challa · Black Panther, Claws of Bast · Black Panther, Most Dangerous · Nakia · Shuri, Vibranium Technologist | Vibranium, lifelink, a counterpunch, +1/+1 counters, a flier or a card |
| 4 | Black Panther, Vanguard · Okoye, Dora Milaje Leader · Okoye, Mighty and Adored · Wakandan Drone Flock · Warriors of Wakanda | tokens or a team pump per Hero, two Soldiers, the monarch, a flier, a 4/4 trampler |
| 5 | Storm, Queen of Wakanda | a 4/5 flier who lends an attacker flight |

**How the AI plays it:** a 2-drop a turn, the first attack on its third turn in
8 of 10 games, then the whole army (two attackers a combat on average, more once
Okoye's and Vanguard's tokens arrive). Swords to Plowshares waits
for a real threat — against the automated seat, which rarely keeps a creature, it
was never cast.

**Cut while it was built:** Fleecemane Lion (MSC prints it only as *Wakandan War
Panther*, a flavour name the wire then carries instead of the deck's name —
`tools/check-deck.mjs` now warns about it), Zuri (not cast in ten games),
Panther Pounce (not in five: a trick the AI holds), Bast and Wakandan Royal
Guard (the curve). **Wakanda Forever!** stays out: `PeekAndReveal` shows the top six of the
AI's library while they are still in it — Kang Prime's problem.

**Its recording** (2026-09-29, D230–D231): `fixtures/games/villain-wakanda-232.jsonl`,
Wakanda's seat against Pacho's deck, seed 232 — all 24 names face up, 15 of its 17
creatures on the table, a 48-card table on its last turns. The Black Panthers wear
the panther's mask and cowl, and the Dora Milaje carry the spear, the kit's one new
kind for these decks (README's *More villain identity*).

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
| `select-probe.dck` | 9 Mountain, 8 Island, 6 Lightning Bolt, 4 Into the Void, 4 Careful Study, 9 Gray Ogre | a player target ("any target"), a creatures-only multi-target, a discard-two list, attack and block declarations: `input.selectable.chosen` / `playerIds` (M65, M66) | `tools/ws-select-probe.mjs` (D421–D423) |
| `trample-probe.dck` | 18 Forest, 22 Garruk's Companion | `assign_damage` (a trampler) | ten-games seed 8, `human-trample-7` |
| `yield-probe.dck` | 18 Forest, 22 Thallid | the same triggered ability on the stack every turn (auto-yield) | check-all step 10g, `human-yield-13` |

`tools/check-deck.mjs` warns `AI:RemoveDeck:All` on Manamorphose and Volcano
Hellion. That is expected: those decks are played by the **seat**, not the AI.
