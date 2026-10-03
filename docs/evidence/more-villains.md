# More villains — evidence

Built 2026-09-28 on branch `more-villains` (the worktree
`/home/justin-a/code/mtg-table-t2p`, off `main`'s `a092d3a`), against the 2.0.14
jar (`forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, sha256 `3c0a7c38…e5dd9`),
Node v24.20.0, with the card library copied read-only from the main checkout's
`var/cards/` (91 MB) rather than rebuilt from Scryfall. The user's request, of
2026-09-27: *"I'd also like to watch AIs vs each other with my deck vs different
decks so I can see how they play it."* Every number below was measured, and the
command that produced it is beside it. **D116** is the decks and the builder,
**D117** the smoke's spell count; `decks/README.md` is what each deck is.

## 0. The headline

| | result |
|---|---|
| three new AI decks, 40 cards, 17 lands, two colours, MSH + MSC | `masters-of-evil.dck` (B/R villain aggro), `hulk-family.dck` (R/G gamma stompy), `wakanda.dck` (G/W go-wide) |
| written from a spec, not typed | `decks/specs/*.json` → `tools/build-deck.ts`; Doom Legion's spec rebuilds `doom-legion.dck` **byte for byte** |
| `tools/check-deck.mjs --scryfall` (static, engine, Scryfall) | **3 / 3 PASS, 0 warnings**; 0 cards dropped, Limited-legal, the mirror game finishes; 8 display-only Oracle drifts |
| `tools/deck-smoke.sh --jobs 4` (seeds 1–5, four AI decks) | **20 / 20 games** reach `over`, pass `check-redaction.mjs`, show the AI attacking and casting; 150 s wall |
| the same, seeds 1–10 | **39 / 40** (Doom Legion's seed 6: 4 spells in 8 AI turns) |
| the brief's flat "8 spells a game" | **5 of 40** games reach it, whatever the deck: see §3 and **D117** |
| `web/public/art.json` | 132 entries, **0 misses**, every deck n/n (`node tools/fetch-art.ts`, 8 m 21 s, seven Scryfall 429s) |
| `web/src/workshop/catalog.json` | regenerated (`node tools/build-workshop-catalog.ts`): 14 decks |
| `~/forge` and `~/.forge` | **unchanged** (§9) |
| `tools/ten-games.sh` | **no rows added**, on purpose (§8) |

## 1. The decks, and what `check-deck.mjs` says

`node tools/check-deck.mjs decks/hulk-family.dck decks/masters-of-evil.dck
decks/wakanda.dck --scryfall` (`var/lane/check-deck-scryfall.log`, and
`var/lane/check-deck-hulk-rerun.log` after the fix below):

| deck | lines | lands / spells / creatures | curve (MV: cards) | pips (paid) | sets | engine | Scryfall |
|---|---|---|---|---|---|---|---|
| Masters of Evil | 27 | 17 / 23 / 19 | `1:3 2:9 3:4 4:5 5:1 6:1` | B 19, R 7 | MSH 24, MSC 16 | 27 scripts, 0 dropped, legal, mirror 18 turns | 27 ok (4 notes) |
| Hulk Family | 24 | 17 / 23 / 22 | `1:3 2:7 3:5 4:6 5:1 6:1` | G 27, R 6 | MSH 28, MSC 12 | 24 scripts, 0 dropped, legal, mirror 13 turns | 24 ok (2 notes) |
| Wakanda | 24 | 17 / 23 / 21 | `1:2 2:10 3:5 4:5 5:1` | W 22, G 14 | MSC 20, MSH 20 | 24 scripts, 0 dropped, legal, mirror 22 turns | 24 ok (2 notes) |

(`check-deck` counts both halves of a hybrid symbol, so it also prints the unpaid
half — Brawn's `{G/U}`, Tiger Shark's `{U/B}`; `build-deck.ts` counts only the
halves the deck pays.)

**The eight notes are all display text.** Three MSH lands carry the same Forge
typo in their `Oracle:` line that report 08 found in Hidden Lair — *"if your
control a basic land"* (Training Compound, Dark Fortress, Gathering Place); three
MSC check-lands carry the older *"<Name> enters tapped"* templating (Rootbound
Crag, Dragonskull Summit, Sunpetal Grove); Fixer's line drops *"the
battlefield"*, and Night's Whisper's keeps an old *"and you lose"*. No rules line
differs.

**One false MISMATCH, fixed in the tool.** The first run failed Hulk, Strongest
There Is: *"keyword: Forge has K:etbCounter:P1P1:1, the printed card does not"*.
`K:etbCounter` is how Forge scripts "enters with a +1/+1 counter" — rules text,
not a keyword; 475 scripts in the 2.0.14 cardsfolder use it. It joined
`NOT_PRINTED_KEYWORDS` beside `etbReplacement` and `Chapter`; the re-run is PASS.

**Two new warnings, both negative-controlled** (`var/lane/probes/`, not in `decks/`):

| control deck | expected | got |
|---|---|---|
| `1 Kang Prime\|MSC` + 39 Island | the `DigUntil` library reveal | `! Kang Prime: reveals cards while they are still in the library (SVar:TrigDigUntil:DB$ DigUntil …)` |
| `1 Fleecemane Lion\|MSC`, `1 Wakanda Forever!\|MSC` + 38 Forest | a flavour-named print; a `PeekAndReveal` | three warnings: MSC #282 **and** #423 both carry *"Wakandan War Panther"*; Wakanda Forever!'s `PeekAndReveal` |
| every `decks/*.dck` | no new warning on any existing deck | 14 PASS; the only warnings are the two expected `AI:RemoveDeck:All` (Manamorphose, Volcano Hellion) |

Both are warnings, not failures, because both are harmless in the SEAT's deck.

## 2. The builder: `tools/build-deck.ts`

```
$ node tools/build-deck.ts --check
decks/doom-legion.dck — Doom Legion (Marvel Super Heroes villains)
  tempo-control villains: …; UB; 40 cards, 27 lines, 17 lands, 23 spells (17 creatures)
  curve (mana value: cards) 1:2  2:7  3:6  4:6  5:1  6:1
  coloured pips U=9 B=17; by set MSH=33 MSC=7
  decks/doom-legion.dck is its spec's, byte for byte
  … the same for hulk-family, masters-of-evil, wakanda
```

Doom Legion was typed by hand for match setup; its spec, written in the file's
order, rebuilds it **byte for byte** — the set-code rule (`MSH` when MSH prints
the card, else `MSC`) is the one the hand-typed file followed, and the builder's
curve and pips agree with `check-deck`'s. `--pool BR --type Villain` answers in
0.19 s (103 cards). Negative controls, all run:

| control | result |
|---|---|
| a `.dck` line edited by hand (2 Gallant Citizen → 1 + 1 Swords) | `--check`: `STALE: decks/wakanda.dck differs …`, exit 1; `deck-specs.test.ts`: the Wakanda case fails |
| a spec-less `decks/handtyped.dck` (40 Island) | `deck-specs.test.ts`: *every decks/\*.dck other than the user decks and the probe decks has a spec* fails (named "the user deck" until the rebase onto hardening brought `fra-rw-aggro.dck`, the second user deck, into `decks/`) |
| the spec of a 39-card list | `build-deck: … the list is 39 cards, the spec says 40`, exit 1 (hit twice while building) |

## 3. What the smoke counts, and why the spell count is a rate (D117)

`tools/deck-smoke.sh` reads each game's frame log (`var/games/smoke-<deck>-<seed>/frames.jsonl`):

- **the AI's id** — the `hello_ok.body.players[]` entry with `isAi: true`;
- **a spell** — a `state.events[]` entry with `kind: "cast"` and `controller` =
  the AI, whose stack item — the `state.stack[]` entry with that `id`, in any
  frame — has `isAbility: false`; distinct `stackId`s. Triggered and activated
  abilities (a Saga chapter, a power-up, a land's ability) arrive as `cast`
  events too and are counted apart (`abilities`); in every game here, every AI
  `cast` found its stack item (`unknown` = 0, which the smoke asserts);
- **an attack** — a `kind: "attackers"` event with `player` = the AI and at least
  one id in `bands[].attackerIds` (Forge fires the event every combat, empty
  bands included);
- **turns** — the largest `turn` event's `turn` (player turns, both seats), and
  the AI's own turns — the `turn` events whose `player` is the AI.

**The brief asked for at least 8 spells a game. Against the automated seat, that
is not reachable by any deck with 17 lands.** Measured over the final lists'
forty games (seeds 1–10, `var/lane/smoke8/`):

| deck | AI turns (min–max) | spells a game (min–max) | spells per AI turn | games with ≥ 8 spells |
|---|---|---|---|---|
| Doom Legion | 6–11 | 4–13 | 0.83 | 3 / 10 |
| Hulk Family | 5–8 | 3–5 | 0.70 | 0 / 10 |
| Masters of Evil | 5–10 | 4–8 | 0.82 | 1 / 10 |
| Wakanda | 6–9 | 4–10 | 0.79 | 1 / 10 |

Why, from turn-by-turn traces of the logs:

- **The seat does not make the game last.** `AutoTransport` attacks with
  everything, rarely blocks, and often keeps no creature at all (in one early
  Masters of Evil game it had one creature in nine turns and cast Pym Particles
  on the AI's Whiplash). The AI won **all 40** games, in five to eleven of its own turns
  and eight or fewer in 35.
- **The AI casts about one spell a turn.** It taps out for the biggest castable
  card rather than two small ones (in one Wakanda game: four lands and a hand
  of seven, one spell, Black Panther, Vanguard), and it casts its creatures in its
  **second** main phase, after combat — so its first turn (no one-drop in hand)
  and its winning turn (the game ends in combat) are usually empty.
- **A card it holds never counts.** A removal spell or a trick waits for a
  target, and this seat rarely offers one: the second Hulk list cast neither
  Shock nor Lightning Strike in five games.

**An ideal caster does not get there either.** A greedy simulation — draw, play
a land, cast the cheapest castable cards until the mana runs out, repeat —
over 20,000 shuffles of a 17-land deck with sixteen one- and two-drops (four of
them drawing a card), five threes and two fours, on the draw: mean 5.9 spells by
the AI's fifth turn (8 or more **6%** of the time), 7.2 by its sixth (**41%**),
8.3 by its seventh (74%). Doom Legion's own curve (`1:2 2:7 3:6 4:6 5:1 6:1`):
4.3 / 5.4 / 6.4 by turns 5 / 6 / 7, and 8 or more in 0%, 0% and 7% of shuffles.
So the smoke asserts the brief's number as a **rate**: at least `min(8, T − 3)` spells, T the AI's turns, and
`DECK_SMOKE_STRICT=1` asserts the flat 8. How the three candidate floors fare on
the same forty games:

| floor | Doom Legion | Hulk Family | Masters of Evil | Wakanda |
|---|---|---|---|---|
| flat 8 | 7 fail | 10 fail | 9 fail | 9 fail |
| `T − 2` (the ideal curve-out) | 3 fail | 2 fail | 0 | 1 fail |
| **`T − 3`** | **1 fail** (seed 6) | 0 | 0 | 0 |

`T − 3` still has teeth. **Negative control:** a deck of 17 Island and 23
Trickster's Stratagem — the card the AI never casts (D108) — fails both halves,
`the AI cast 0 spell(s) in 31 turn(s), fewer than 8; the AI attacked 0 time(s)`,
at seeds 1 and 2 (63-turn games that end when the seat decks). And the
red-heavy Hulk list of §5 failed `T − 3` in 4 of 10 games, with turns in which
the AI held a full hand on enough lands and cast nothing.

## 4. The smoke's run

`rm -rf var/deck-smoke && time ./tools/deck-smoke.sh --jobs 4`
(`var/lane/deck-smoke-final.txt`; 2 m 30 s wall, 6 m 57 s CPU, on a desktop also
running another worktree's gate):

```
deck                   passed  AI won  AI lost        turns      AI spells     AI attacks    wall
                                                 mean (min)     mean (min)     mean (min)    mean
doom-legion.dck           5/5       5        0    15.2 (11)        5.8 (5)        3.8 (3)   30.0s
hulk-family.dck           5/5       5        0    10.8 (10)        3.8 (3)        3.4 (3)   23.2s
masters-of-evil.dck       5/5       5        0     10.8 (9)        4.6 (4)        3.6 (3)   26.8s
wakanda.dck               5/5       5        0    12.8 (11)        4.6 (4)        4.4 (4)   30.0s
  20/20 games passed; total wall 150s
DECK SMOKE OK
```

Every game: exit 0, `MTGTABLE OK`, `finished = true`, `UNIMPL members = none`,
`emit errors = 0`, exactly one `over` and it is the last frame,
`check-redaction.mjs` with no flags clean. Each game is 17–37 s; the twenty sum
to 550 s, which is roughly what `--jobs 1` costs (not measured).

**Seeds 1–10** (`DECK_SMOKE_DIR=var/lane/smoke8 ./tools/deck-smoke.sh --jobs 6
--seeds "1 2 3 4 5 6 7 8 9 10"`, 204 s): 39 / 40; the one miss is Doom Legion
at seed 6 (4 spells in 8 turns), outside the default seeds — PLAN.md's follow-up 5.
Where two runs share a seed and a deck list, the games came out the same (the
seed decides the shuffle; §8.7 of the protocol does not promise it).

**How the AI plays each deck** (the ten seeds' traces):

| deck | first AI attack, on its own turn | attackers per attacking combat | cast most |
|---|---|---|---|
| Doom Legion | 2–6 (3 or 4 in 7 of 10) | 1.8 | HYDRA Troopers, Aerial Doombot (9 each), Agents of HYDRA, Doom Blade (6) |
| Hulk Family | 2–4 (by its third in 8 of 10) | 1.8 | Birds of Paradise, She-Hulk, Jade Defender, then Hellcat, Gamma Grotesque, Gallant Citizen, both Abominations, Hercules, Hulkling |
| Masters of Evil | 2–4 (by its third in 9 of 10) | **2.5** | Volcanic Villain (7), Common Crook (5), Yelena Belova, Shock (4) |
| Wakanda | 3–5 (on its third in 8 of 10) | 2.0 | Vibranium Energy Daggers (6), Gallant Citizen (5), Okoye, Shuri, Dora Milaje, Shield Guard, Nakia (4) |

## 5. How each list got here

Eight runs of the smoke, every one kept under `var/lane/smoke<n>/`, and three
probes. Each change is what a run showed; none of them is a tuning to a seed.

| run | lists | what it showed | changed |
|---|---|---|---|
| 1 (seeds 1–5) | first drafts, 3–7 noncreature spells each | 0 / 15 at the flat 8; 2–7 spells. Hulk seed 5: the AI **sacrificed its own lands** to She-Hulk, Jennifer Walters's draw ability (four lands to three) and cast two spells in six turns | She-Hulk, Jennifer Walters out; burn and tricks cut to a minimum |
| 2–3 (seeds 1–5) | lower curves, card draw (Night's Whisper, Gallant Citizen, Shuri, Vibranium Technologist) | still 3–6 spells; the traces of §3 (one spell a turn, creatures after combat) | the smoke's floor became a rate (§3) |
| 4 (seeds 1–10) | Hulk with red and green both double-pipped (Hulk, Bruce Banner and Red Hulk at `{R}{R}`; 8 Forest, 6 Mountain) | `T − 3` fails Hulk in 4 of 10: turns with a full hand on enough lands and nothing cast | Hulk, Bruce Banner out for She-Hulk, Wallbreaker (one `{R}`); 9 Forest, 5 Mountain: every double pip but Red Hulk's green |
| 5 (seeds 1–10) | that Hulk list; Wakanda with Vibranium Energy Daggers for Wakandan Royal Guard | Doc Samson not cast in its twenty games across runs 4–5 | Doc Samson and She-Hulk, Wallbreaker out for two Knights of Wundagore; Zuri (not cast in twenty) out for Fleecemane Lion |
| 6 (seeds 1–10) | those lists | the census named a card in no deck, *Wakandan War Panther*: Forge picked Fleecemane Lion's flavour-named MSC print, and the wire carried its name. Origin of the Hulk and Beast not cast in ten | Fleecemane Lion out for a second Wakandan Tusker; Origin of the Hulk and Beast out for two Gallant Citizens; `check-deck.mjs` warns on flavour names (§1) |
| 7 (seeds 1–10) | Hulk and Wakanda final | Hulk 8 / 10 and Wakanda 9 / 10 at `T − 2`, 10 / 10 at `T − 3` | Masters of Evil: Deadly Dispute (probe below) out for Atlas, Sizable Stooge |
| 8 (seeds 1–10) | the final four | 39 / 40 at `T − 3` | — |

The probes (`var/lane/probes/`, two games each, `var/lane/probe-smoke.txt`),
for cards the census never showed on the stack:

| probe deck | result | verdict |
|---|---|---|
| 9 Swamp, 8 Mountain, **8 Deadly Dispute**, 8 Boomerang, 7 Avengers: Under Siege | Under Siege cast 5 times, Boomerang 2, **Deadly Dispute 0** | Deadly Dispute is Trickster's Stratagem again — out, for Atlas, Sizable Stooge |
| 9 Forest, 8 Mountain, 11 Hulk, Gamma Goliath, 12 Red Hulk | both cast (each is legendary, so one at a time) | castable; kept |
| 17 Island, 23 Trickster's Stratagem | 0 spells, 0 attacks | the smoke's negative control (§3) |

Two cards stayed out on principle rather than on a run: **World War Hulk**
(chapter I is `MayPlay` from `Hand,Graveyard,Library,…` — a may-play on the AI's
library, which no recording has shown the redaction gate) and **Wakanda
Forever!** (`PeekAndReveal` on the AI's library: Kang Prime's problem, D108 rule 4).

## 6. The census: what the AI cast

From the ten-seed run (`var/lane/smoke8.txt`). A nonland line missing from this
list was not cast in those ten games.

- **Masters of Evil** — Volcanic Villain 7, Common Crook 5, Yelena Belova 4,
  Shock 4, Boomerang 3, Lightning Bolt 3, Moonstone 3, Songbird 3, Fixer 3,
  Atlas 2, Titania 2, Whiplash 2, Whirlwind 2, Yellowjacket 2, Klaw 2, Tiger
  Shark 2, MACH-1 2, Avengers: Under Siege 1, The Masters of Evil 1. **Not cast:**
  Night's Whisper and Radioactive Man (both cast in runs 4 and 5).
- **Hulk Family** — Birds of Paradise 5, She-Hulk, Jade Defender 4, Hellcat 3,
  Gamma Grotesque 3, Gallant Citizen 3, Abomination, Terrifying Titan 3,
  Hulkling 3, Abomination, Irradiated Brute 3, Hercules 3, She-Hulk,
  Attorney-at-Law 2, Wolverine 2, Hulk, Brutal Brawler 2, Knight of Wundagore 2,
  Rick Jones 2, HULK SMASH! 1, Brawn 1, Hulk, Strongest There Is 1. **Not cast:**
  Hulk, Gamma Goliath and Red Hulk (castable: §5's probe).
- **Wakanda** — Vibranium Energy Daggers 6, Gallant Citizen 5, Okoye, Dora
  Milaje Leader 4, Shuri, the Black Panther 4, Dora Milaje Elite 4, Wakandan
  Shield Guard 4, Nakia 4, T'Chaka 3, Storm 3, Wakandan Drone Flock 3, Wakandan
  Tusker 3, Shuri, Vibranium Technologist 2, Black Panther, Most Dangerous 2,
  Black Panther, Claws of Bast 2, Black Panther, Vanguard 1, Okoye, Mighty and
  Adored 1, T'Challa 1, Warriors of Wakanda 1. **Not cast:** Swords to Plowshares
  (cast 2 and 4 times in runs 1 and 6: it waits for a real threat).
- **Doom Legion** — every nonland card but **Dark Deed** and **Doctor Doom**.

## 7. Art and the workshop's catalog

`/usr/bin/time -v node tools/fetch-art.ts` (`var/lane/fetch-art.log`): 14 decks,
132 distinct names — `set=msh` 67, `set=msc` 55, `exact` 10 (the probe decks'
non-Marvel cards) — **0 misses**, every deck n/n; 8 m 21 s, of which seven
Scryfall `429`s cost seven minutes (`Retry-After: 60`, honoured). Of the entries
the main checkout's `art.json` shares with it, 64 are the same Scryfall printing;
Mountain moved to MSH #293, because the new decks' `Mountain|MSH` lines now name
a set. `web/public/art.json` is gitignored; this run regenerated the worktree's.

`node tools/build-workshop-catalog.ts` rewrote `web/src/workshop/catalog.json`
(34,396 bytes, 14 decks). Every new name is on its *never face up* list (92 names
now), as Doom Legion's were: the facts come from face-up sightings in the
committed `fixtures/games/`, and none of those plays the new decks (PLAN.md
follow-up 3).

## 8. Tests, and the gate

`npm --prefix web test` standalone (`var/lane/web-test-standalone.log`, 58 s):
**876 `node --test` pass / 0 fail**, plus **94 vitest in 6 files**. Six of the
`node --test` cases are new, in `web/test/deck-specs.test.ts` (§2); one workshop
case changed its example of a card in no deck from Lightning Bolt — now in the
Masters of Evil — to Black Lotus, the only edit to an existing test. The first
standalone run, before that edit, was 875 / 1 fail, which is how it was found.
`tsc --noEmit` (the web project, which includes `tools/`) is clean.

**The gate:** `rm -rf bridge/out && WSPORT=8700 ./tools/check-all.sh`
(`var/check-all-more-villains.log`) — **exit 0, 923 s** (`/usr/bin/time`: 923.10 s),
with 9c's fourteen games 385 s, on a desktop running another worktree's gate at
the same time. Inside it, `npm --prefix web test` was **886 / 878 pass / 0 fail /
8 skipped** plus **94 vitest (6 files)** — the ws-log suite skipping the
candidates `MTGTABLE_WS_LOGS` does not name, as always.

**No rows were added to `tools/ten-games.sh`**, and nothing else joined the
gate: it is already 15–20 minutes, and what these games measure is the decks,
which change less often than the code. `tools/deck-smoke.sh` is the check for a
deck, run by hand after changing one (`decks/README.md`, *Building an AI deck*).

## 9. The user's Forge install

Path counts and the checksum of every file under `~/.forge/decks/constructed/`,
before the first command of the lane and after the last (`var/lane/forge-before.txt`,
`var/lane/forge-after.txt`):

```
                         before (23:52, first command)     after (the gate done)
forge paths:             22128                             22128
.forge paths:            27                                27
constructed sha1 (all):  5cd337198ead0768975610a135e26257153198c7   the same
```

`diff var/lane/forge-before.txt var/lane/forge-after.txt` is empty: **unchanged**.
Every Forge process of the lane — over two hundred games, the gate's included —
wrote its profile under the worktree's `var/forge/`.

## 10. What is not done

PLAN.md's *More villains follow-ups* has the ten; in short: the flat 8 comes back
only with a seat that makes games last; the arena has no identity rows and the
workshop no facts for the 67 new names; nothing read the ability lines by hand;
Doom Legion misses the floor at seed 6; the Hulks' top end seldom arrives
against this seat; the builder cannot pin a collector number; `fixtures/cards/`
does not carry the new cards; the smoke's advisory cannot tell an undrawn land
from an uncast spell; and three prompts the new decks can raise for the seat
(Klaw's reveal, the monarch) were not counted.

## 11. The rebase onto the hardening pass (2026-09-28)

The lane was cut from `main`'s `a092d3a`. Before it merged, the engine and sets
(D109–D112, `aead79d`) and the 2026-09-27 hardening pass (D113–D115, amendments
M45–M46, `4d26637`) landed ahead of it, so it was rebased onto `4d26637` and its
two decisions, written as D109–D110, became **D116–D117** everywhere they are
cited. Nothing about the decks, the builder or the smoke changed.

**What conflicted, and how it was resolved** — both sides kept, the base's text
first:

- `DECISIONS.md` — the base's D109–D115 and then D116–D117. Every id from D1 to
  D117 appears exactly once.
- `CLAUDE.md` — the command list (the base's crash check and `wire-drift.mjs`
  lines, then `build-deck.ts` and `deck-smoke.sh`), the gate's timing paragraph,
  the web test count, and the docs table (one hundred and seventeen decisions,
  this lane's D116–D117 after the hardening pass's D113–D115).
- `README.md` — the docs table's count and summary; the repo tree's count line
  and the base's new *Decks* table were brought up to date as well (a row for the
  three new AI decks).
- `PLAN.md` — the base's questions 18–22 stand, and this lane's two became
  **23** and **24** (its follow-up 1 now points at question 24); its section
  moved after the hardening pass's, just above *Deferred*.
- `decks/README.md` — the base's `fra-rw-aggro.dck` section, then this lane's
  three deck sections.
- `web/src/workshop/catalog.json` — regenerated, never hand-merged.

**What the base changed under the lane.** The engine and sets put a second user
deck in `decks/`: `fra-rw-aggro.dck`, the user's Reality Fracture pool, which no
spec could write (it is FRA; the builder takes MSH and MSC). The spec-coverage
case in `web/test/deck-specs.test.ts` now excludes both user decks by name
(`pacho-shield.dck`, `fra-rw-aggro.dck`) and was renamed to say so; the comment in
`tools/villain-deck.sh` says the same. `tools/check-deck.mjs` merged cleanly:
the base's note that `check-deck.mjs decks/*.dck` exits 1 on the FRA deck, and
this lane's two warnings and `etbCounter`, side by side.

**Generated files.** `node tools/fetch-art.ts`: 15 decks, 158 names —
`set=msh` 66, `set=msc` 55, `set=fra` 26, `set=spg` 1, `exact` 10 — **0
misses**, every deck n/n, through nine Scryfall `429`s (other worktrees were
fetching at the same time). `node tools/build-workshop-catalog.ts`: 39,159
bytes, 15 decks, `--check` current.

**Tests and the gate.** `npm --prefix web test` standalone: **877 `node --test`
pass / 0 fail** plus **97 vitest in 7 files** (hardening's 871 + 97 and this
lane's six `deck-specs` cases). `npm --prefix web run build` is clean.
`rm -rf bridge/out && WSPORT=8725 ./tools/check-all.sh`
(`var/check-all-more-villains-train.log`): **exit 0, 936 s**, 9c's fourteen
games 379 s, with hardening's steps 12b (the catalog is current) and 12c (an
engine crash fails the run) in it; inside it `npm --prefix web test` was **887 /
879 pass / 0 fail / 8 skipped** plus 97 vitest, at a load average of 8–13.

**The user's Forge install**, fingerprinted before the rebase and after the
gate (the jar's sha256, every file under `~/.forge`, and `~/forge`'s top level):
**unchanged** — `~/forge` 22,128 paths, `~/.forge` 27, the
`~/.forge/decks/constructed/` digest `5cd33719…153198c7` as in §9.
