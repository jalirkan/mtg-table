# docs/drafts — prepared, not in use

Things written ahead of the day an **official Forge release ships Reality
Fracture** (FRA). Nothing in this directory is read by the game, the bridge, the
gate or the web client, and nothing here changes how mtg-table runs today on
Forge 2.0.14. The plan they belong to is
[`../research/14-engine-upgrade.md`](../research/14-engine-upgrade.md), section
"On the day Forge releases with FRA".

| file | what it is | status |
|---|---|---|
| `decks/fra-gb-leftovers.dck` | An FRA **opponent** for `decks/fra-rw-aggro.dck`: the green-black midrange deck the user's own list proposes as "a second deck from the leftovers (for the coworker to play)" (`/mnt/e/jalir/Projects/Magic/fra-pool-red-white-aggro.md`, read-only). Its 22 named cards are copied exactly; the only addition is the mana: 18 basics (8 Forest, 8 Swamp, 2 Plains, because Bloombrute "needs a Plains or two", in the list's own words). | **Draft, for the user to review.** Today (2.0.14): 20 ok, 20 missing. On the 2.0.15-SNAPSHOT-09.27 daily build: 40 of 40 ok, every card Forge's own script. |

## Why the deck is here and not in `decks/`

Everything that lists `decks/` reads a deck there as one of the repo's decks:

- The dev card browser lists every `decks/*.dck`, where a draft would look like a
  reviewed deck.
- Since match setup and the workshop, `tools/fetch-art.ts` fetches art for every
  `decks/*.dck`, and `tools/build-workshop-catalog.ts` puts every card of one into
  the workshop's list.
- `web/test/cards-lib.test.ts` ("every deck in decks/ parses with nothing
  skipped") parses every `.dck` and `.txt` there. When this was written (on
  `754f504`) it opened **every entry**, so a `decks/drafts/` directory threw
  `EISDIR`; match setup narrowed it to the two extensions, and `decks/` has a
  `README.md` of its own now.

So a draft lives here until the user accepts it. On the day, after review:

```bash
cp docs/drafts/decks/fra-gb-leftovers.dck decks/
node tools/audit-deck.mjs decks/fra-rw-aggro.dck decks/fra-gb-leftovers.dck   # expect 90 ok
```

## What was measured with it (snapshot only; nothing merged)

All on the 2.0.15-SNAPSHOT-09.27 jar in throwaway homes under the session
scratchpad, never under `forge-home/` or `var/forge/`
(`docs/evidence/engine-upgrade.md`, "Preparation pass"):

- **40 AI-vs-AI games** against `fra-rw-aggro`, seeds 7–26 with each deck on each
  seat: the draft won 25, the red-white deck 15; 11 to 44 player turns; **0
  exceptions**; all 16 of its nonland names went on the stack.
- **6 `RecordMatch` games and 3 `MtgTable --transport auto` games** through spike
  B's ported bridge: all reached `over` with `UNIMPL members = none` and 0
  snapshot or emit errors, and all 9 frame logs PASS `tools/check-redaction.mjs`.

It is a playable opponent, somewhat stronger than the red-white deck **when the
Forge AI pilots both**. A human pilots the red-white deck differently, so that
number says nothing about how a game against it will feel.

## What is not here

- **No hand-written card scripts.** None is needed: all 285 FRA names, and all 50
  cards of the user's deck and sideboard, have Forge's own scripts in the
  snapshot (`docs/research/08-deck-card-coverage.md` §9). A `fra-cards/` directory
  was planned for drafts and was not created.
- **The bridge port** is not a draft of ours to edit. It is spike B's reviewable
  patch, saved with its build identity and seam diff at
  `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch`.
