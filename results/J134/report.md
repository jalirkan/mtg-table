# J134: which drafter drafts best?

Each challenger drafter against the cube lab's own drafter, mirrored seats on the same seeds, the lab builder for both, Forge Default piloting both decks, best of three. A drafter BEATS another when its 95% interval on match win rate lies entirely above 50% (cluster bootstrap over seeds); otherwise NOT SHOWN.

## Primary

| arm | cube | challenger's match win rate [95%] | W-L-D | matches (seeds) | verdict | as seat A / B | game win rate [95%] | engine errors left out |
|---|---|---|---|---|---|---|---|---|
| FL (Forge's ranks) | vintage | **53.8% [49.8%, 57.7%]** | 322-277-0 | 599 (300) | **NOT SHOWN** | 55.9% / 51.7% | 52.4% [50.0%, 54.9%] | 1 |
| FL (Forge's ranks) | synergy | **52.8% [49.1%, 56.4%]** | 316-283-1 | 600 (300) | **NOT SHOWN** | 49.3% / 56.2% | 51.9% [49.4%, 54.4%] | 0 |
| FL (Forge's ranks) | twobert | **49.5% [45.7%, 53.2%]** | 297-303-0 | 600 (300) | **NOT SHOWN** | 53.0% / 46.0% | 49.9% [47.5%, 52.3%] | 0 |
| HL (the human-pick model) | vintage | **51.3% [45.7%, 57.0%]** | 154-146-0 | 300 (150) | **NOT SHOWN** | 48.7% / 54.0% | 50.7% [46.9%, 54.4%] | 0 |
| HL (the human-pick model) | synergy | **54.2% [48.7%, 59.4%]** | 162-137-0 | 299 (150) | **NOT SHOWN** | 55.7% / 52.7% | 52.9% [49.2%, 56.7%] | 1 |
| LL (the LLM) | vintage | - | - | - | **SKIPPED** (not run: it spends API money and needs Justin's approval) | - | - | - |

## Secondary (description only)

| arm | cube | drafter | W | U | B | R | G | mean lab deck score | Forge-built decks |
|---|---|---|---|---|---|---|---|---|---|
| FL | vintage | Forge's ranks | 53.1% | 61.1% | 30.0% | 33.6% | 22.2% | 140.8394 | 0 |
| FL | vintage | the lab drafter | 48.8% | 59.8% | 31.1% | 38.7% | 21.7% | 141.0963 | 0 |
| FL | synergy | Forge's ranks | 49.2% | 64.5% | 23.2% | 14.5% | 48.7% | 132.6923 | 0 |
| FL | synergy | the lab drafter | 46.7% | 66.7% | 19.2% | 17.3% | 50.2% | 134.1823 | 0 |
| FL | twobert | Forge's ranks | 33.7% | 79.8% | 28.5% | 23.5% | 34.5% | 107.9275 | 0 |
| FL | twobert | the lab drafter | 33.8% | 80.3% | 25.7% | 20.2% | 40.0% | 108.8588 | 0 |
| HL | vintage | the human-pick model | 47.3% | 62.7% | 37.7% | 36.0% | 16.7% | 134.6063 | 0 |
| HL | vintage | the lab drafter | 54.0% | 65.0% | 28.0% | 35.3% | 17.7% | 142.083 | 0 |
| HL | synergy | the human-pick model | 49.2% | 54.2% | 44.5% | 24.8% | 28.4% | 123.0592 | 0 |
| HL | synergy | the lab drafter | 45.8% | 63.5% | 18.7% | 14.1% | 57.9% | 136.8873 | 0 |

Evan's Twobert: Forge 2.0.14 lacks 4 of its 180 cards (Reality Fracture); the lab drafts without them (run.json `missing`), so its grids deal 162 of the other 176.

The lab deck score is the lab drafter's own currency (the cube's ratings), not a measure of strength; the games are.
