# Card library — evidence

Built 2026-09-27 in the `card-library` worktree (`/home/justin-a/code/mtg-table-t2g`,
based on `main` at `0368a90`), on the user's request to expedite PLAN.md's
deferred list — whose entry reads *"the SQLite (`node:sqlite`) + FTS5 card
library, the `oracle_cards` bulk stream, a local image cache … report 03 is the
spec"* — and for a card viewer. Report 03 §4 is the spec; `tools/card-library/README.md`
is how to use it. Node v24.20.0, `node:sqlite` on SQLite 3.53.4, FTS5 with the
porter tokenizer, no npm dependency.

> **The NON-GOAL this contradicts is now a decision.** README.md's NON-GOALS read
> *"No card-library package. No SQLite, no FTS5, no bulk Scryfall dump, no card
> search, no card browser."* **DECISIONS.md D90** (2026-09-27) records the user's
> request, what it lifts — a local index and a `#cards` browser, as dev-server
> tools — and what stays a no: a package, a production route, any proxy of
> Scryfall, any deck editing. README's NON-GOALS, NOTICE §2, PLAN.md's deferred
> list and CLAUDE.md were edited to match.
>
> **The documentation pass** (2026-09-27) wrote up the four choices underneath as
> **D91** (`node:sqlite` + FTS5, no npm dependency, a fresh file per build),
> **D92** (the dev-only same-origin route that never fetches), **D93** (the image
> cache keyed by id + size + face) and **D94** (`CardView` apart from `CardTile`,
> and `#cards` unmounting the mode app); added PLAN.md's *The card library and the
> card browser* (status, commands, twelve follow-ups, questions 15–17), README's
> *Card library and browser — `#cards`*, CLAUDE.md's *Card library* conventions and
> NOTICE §2/§4's caching and credit lines. It changed no code. `npm --prefix web
> test`, run once after it: **797 `node --test` pass / 0 fail, 91 vitest pass / 0
> fail (6 files)**, exit 0.

## Data — the index, the image cache, the queries

### What was built

| file | what it is |
|---|---|
| `tools/card-library/scryfall.ts` | the one door to Scryfall: both headers, two pacing buckets, 429 + `Retry-After`, a request log and the measured rate |
| `tools/card-library/model.ts` | the pure rules: the multi-face image rule, the compact image storage, name normalisation, collector-number order, "plain printing", the FTS5 query builder |
| `tools/card-library/db.ts` | the schema and the writer (`cards`, `prints`, `print_faces`, `card_names`, `sets`, `meta`, `cards_fts`) |
| `tools/card-library/build.ts` | the CLI: fetch into `var/cards/`, then index into a fresh file renamed over `var/cards/cards.sqlite` |
| `tools/card-library/store.ts` | the image cache: `var/cards/images/<scryfallId>/<size>[.back].<ext>`, `.part` then rename |
| `tools/card-library/images.ts` | the prefetch CLI: `--deck`, `--all-decks`, `--all-prints` (reports and stops without `--yes`) |
| `tools/card-library/deck.ts` | `.dck` and `.txt` parsers, Forge's `Name|SET|art|[cn]+` request grammar |
| `tools/card-library/query.ts` | the read side, a pure synchronous module the dev server imports, and a JSON-on-stdout CLI |
| `tools/card-library/make-fixture.ts` | cuts `fixtures/cards/` out of a real fetch |
| `fixtures/cards/` | 172 `oracle_cards` lines, 51 MSH + 33 MSC print lines, 6 sets, no images — **reduced to the fields the library reads** (0.69 MB; the verbatim lines were 1.33 MB). The index built from either has the same content digest, `eedeafed…a667`, so nothing the tests exercise was dropped |
| `web/test/cards-lib.test.ts` | 49 tests, offline, fake Scryfall on a fake clock |

Everything the tools write is under `var/cards/`, which the repo's `.gitignore`
already covers (`var/`); no new ignore file was needed.

### The real build

Three runs of `node tools/card-library/build.ts`, from the repo root:

| | first build 21:15Z | online rebuild 21:28Z | `--offline` rebuild |
|---|---|---|---|
| `GET /bulk-data` → `oracle_cards` | `updated_at 2026-09-27T21:01:57.440+00:00`, `compressed_size 24,561,334` | same | — |
| bulk download (`data.scryfall.io`) | **24,561,334 B in 2.0 s** | *"already on disk — not downloading"* | — |
| oracle cards (rows = FTS rows) | 38,690 (0 lines skipped) | 38,690 | 38,690 |
| prints | 39,167 = 1,319 synced + 37,848 representative | 39,167 | 39,167 |
| `e:msh` / `e:msc` | 453 in 3 pages / 866 in 5 pages (= Scryfall `total_cards`) | same | same |
| sets | 1,053 | 1,053 | 1,053 |
| index file | 149.7 MiB (before compaction, below) | 54.8 MiB | **55.7 MiB** (+ the NOCASE name index) |
| index time | 2.3 s | 2.1 s | 2.3 s |
| wall time | **8.5 s** | 6.4 s | — |
| `content_sha256` | (earlier schema) | `d39f2487…6a30` | `d39f2487…6a30` |

The online rebuild re-fetched `/sets` and all eight search pages and produced
the **same content digest** as an offline re-index of the earlier fetch: the
build is idempotent across fetches, not only across re-indexes. The digest
covers every `cards`, `card_names`, `prints`, `print_faces` and `sets` row
(not the fetch timestamps), and `meta` records `built_at`,
`oracle_bulk_updated_at`, `oracle_bulk_uri`, `oracle_bulk_fetched_at`, the
row counts, the Node and SQLite versions and the measured request rates.

**The 150 → 56 MB compaction, measured with `dbstat`.** The first file stored
each print's eleven `image_uris` verbatim — **45,512,054 + 3,256,179 B** of URL
text — and each card's full legalities, **18,942,788 B**, most of it the word
`not_legal`. Every one of the **461,956** stored URLs (41,996 sides × 11 sizes)
turned out to be exactly `https://cards.scryfall.io/<size>/<side>/<a>/<b>/<id>.<ext>`
plus a `?<version>` that is the same for every size of a print, and that
version is the print's `image_updated_at` as a Unix timestamp (Peggy Carter:
`1783903106` = `2026-07-13T00:38:26Z`) — which settles report 03 §5's open
question. So a print keeps its size list and the version, the build checks
every URL against the pattern as it packs it (a print that deviated would keep
its URIs verbatim; none did), and a card keeps only the formats it is not
`not_legal` in. Rules text lives on `cards` alone, and the FTS table reads
`cards` as external content, so the text is stored once.

### The rate limit, measured

Every request went through `ScryfallClient`, with
`User-Agent: mtg-table/0.1 (local hobby client; github.com/<user>/mtg-table)`
(config.json's `scryfallUserAgent`) and `Accept: application/json`. The numbers
are from each run's own request log (`rateStats`), not from the limiter's source:

| run | bucket | requests | mean rate | min gap | most in any 1 s | limit |
|---|---|---|---|---|---|---|
| first build | `search` | 8 | 1.99/s | 500 ms | **2** | 2/s |
| | `api` (`/bulk-data`, `/sets`) | 2 | — | 2,176 ms | 1 | 10/s |
| | `file` (bulk + 2 icons) | 3 | — | — | 1 | none |
| online rebuild | `search` | 8 | 1.99/s | 501 ms | **2** | 2/s |
| | `api` | 2 | — | 232 ms | 2 | 10/s |
| | `file` (2 icons) | 2 | — | — | 1 | none |
| images, `pacho-shield.dck` | `file` (`cards.scryfall.io`) | 28 | 35.7/s | 0 ms | 28 | none |
| images, the other decks | `file` | 13 | 27.8/s | 0 ms | 13 | none |

Every status was 200; no 429 was seen. Across the whole session Scryfall's API
received **21 requests** (a one-off `/bulk-data` probe, then 10 per build), and
the file origins one bulk download (24.6 MB), 4 icon SVGs and 41 card images.

### The images

`node tools/card-library/images.ts --deck decks/pacho-shield.dck --size normal`:
28 distinct cards → **28 images, 2,388,446 B (85.3 KB mean), 0.9 s**. Agent Phil
Coulson's `normal` is **73,417 B**, byte-for-byte the size report 03 §2.2
measured live on 2026-09-11. `--all-decks` (the ten `.dck` files) resolved every
line and fetched the **13** prints the probe decks add — Manamorphose, Future
Sight, Opt, Rampant Growth, Garruk's Companion, Thallid, Volcano Hellion, the
three morph cards, and MSH's Mountain, Forest and Giant Growth — for **41 images,
3,805,454 B** in all. A second run fetched **0** and listed all 41 as present.

`--all-prints --size normal` (no `--yes`) reported and stopped:
*"1,338 images at normal (31 already cached), 1,307 to fetch, estimated 104.3 MiB"*
— 1,319 prints plus 19 back faces, the estimate from the mean of the images
already on disk. **Not downloaded**; that is the user's call.

### The queries

**`getByName('Peggy Carter, Secret Agent')`** → `match: "exact"`, print **MSC
#523** (`printVia: "synced"`), id `1f98293e-9d94-4185-8546-8beaf281dfa3`,
artist Michael MacRae, `{1}{W}` Legendary Creature — Human Spy Hero 2/1,
legal in commander and not in standard. With `{set: 'msh'}` it answers the
same print with `printVia: "family"` — the Peggy case of report 03 §0.1: MSH has
no such card, and the ladder widens to MSC through `parent_set_code`.

**`resolve decks/pacho-shield.dck`** → 40 cards, 28 lines, **28 resolved, 0
unresolved**, every one by `exact` name. The eighteen `|MSH` lines land on the
MSH numbers report 03 §2.5 lists (#4, #1, #5, #32, #249, #36, #41, #15, #7, #56,
#48, #44, #43, #78, #50, #70) and the ten unsuffixed lines on its MSC numbers
(#523, #603, #609, #646, #739, #759, #786, #635, #580, #581). Plains and Island
land on **#277 / #279**, where report 03's `/cards/collection` call returned
#287 / #289: #277 is the first `Plains` line of `[cards]` in Forge's own
`res/editions/Marvel Super Heroes.txt`, i.e. Forge's art index 1.

**`search('shrink')`** → *Shrink* (me2 #175) and **Wasp, Shrinking Savior**
(MSC #646), the deck's shrink card; *Shrinking Plane* is a plane and appears
only with `includeExtras`. **It returns no Ant-Man card, and that is the data,
not the search**: none of the index's seven Ant-Man cards has "shrink" in its
name, type line, Oracle text or (checked separately) flavour text — Ant-Man,
Reformed Rogue's shrink is *"gets -1/-0"*. **`search('ant-man')`** returns all
seven, name matches first: Ant-Man, Scott Lang (MSC #834); Ant-Man, Elusive
Avenger (MSC #73); Ant-Man's Air Force (MSC #759); The Astonishing Ant-Man (MSH
#204); Ant-Man, Reformed Rogue (MSC #739); Ant-Man, Colony Commander (MSH #201);
Ant-Man's Army (MSH #161). A hyphenated word is a prefix *phrase*, so `ant-man`
does not also match every card with "ant…" and "man…" in it.

Latency, warm, on the real 55.7 MiB index (mean of 200–2,000 calls):

| call | time |
|---|---|
| `getByName('Peggy Carter, Secret Agent')` | 21 µs |
| `getByName('shield helicarrier')` (normalised) | 23 µs |
| `getByName('peggy secret')` (fuzzy, FTS5) | 56 µs |
| `getBySetNumber('msh', '402')` | 16 µs |
| `search('shrink')` | 80 µs |
| `search('attacks alone')` (phrase first) | 1.4 ms |
| `search('flying')` (thousands of matches ranked) | 5.4 ms |
| `browseSet('msc', {limit: 1000})` | 14.6 ms |
| `resolveDeckFile('decks/pacho-shield.dck')` | 0.5 ms |

`getByName` was **2.7 ms** before the `name COLLATE NOCASE` index — a full scan
of 38,690 rows — and the deck **80 ms**; the index cost 0.9 MiB.

### Checked against Forge and against Scryfall

- **"Plain printing" agrees with Forge's edition file for all 453 MSH prints**:
  a print is `isMain` exactly when its collector number is in `[cards]` rather
  than `[borderless]` (105) or `[extended art]` (52). The surge-foil basics #433
  and #434 are `[extended art]` to Forge; `promo_types: ["surgefoil"]` is what
  says so on Scryfall. Forge's MSC file has a single `[cards]` section of 866, so
  there is nothing to agree with there; Scryfall marks 521 of those prints as
  treatments, and 290 MSC cards have only treatment prints in MSC — the ladder
  still returns one (plain first, else any), so no card is unresolvable for want
  of a plain print.
- **Two layouts newer than report 03** are in today's bulk file: `front_card`
  (291 rows, all type line `Card`) and `prepare` (70, e.g. *Adventurous Eater //
  Have a Bite*, which carries a top-level image like an adventure). The first
  matters: **`Pym Particles` and `Agents of S.H.I.E.L.D.` — both in the deck —
  each share their name with a `front_card` theme card**. Those are kind
  `extra`, and a name lookup prefers `card`, which the tests hold.
- The bulk listing's shape is report 03 §1.5's (`jsonl_download_uri`,
  `compressed_size`), and `oracle_cards`' Plains is still Star Trek's (`trk`
  #317) — which is why a synced set's print outranks the bulk's representative.

### Tests

`node --test web/test/cards-lib.test.ts`: **49 pass, 0 fail, ~0.3 s**, no
network, no `var/` (46 at first; the review added the download-cleanup test, the
fixture-fields test and the User-Agent warning test). `tsc --noEmit` (which
includes `../tools`): 0 errors.

Negative controls, each a one-line mutation of the library, reverted after:

| mutation | failures |
|---|---|
| faces-first image rule (the report 03 §2.3 mistake) | 3 |
| search bucket paced at 100 ms instead of 500 | 3 |
| a 429's `Retry-After` ignored | 1 |
| the `synced` print rung removed (Plains → Star Trek) | 2 |
| a key dropped from `SCRY_SET_FIELDS` (the fixture's field list) | `tsc`: 1 error |

### Not done, on purpose or for later

- `--all-prints --yes` was not run (~104 MiB).
- The name ladder is local only: report 03 §4.6's last rung, `/cards/named?fuzzy=`,
  is not called — the local FTS5 guess is offered as a `suggestion` instead,
  which keeps `query.ts` free of the network.
- No `resolve --write` (adding `|MSC` to the ten unsuffixed lines), no
  `~/.cache/forge/cdn_uuid` warm start (report 03 §3.5; it does not exist on this
  machine), no `/cards/manifest` incremental refresh.
- `config.json`'s `scryfallUserAgent` still carries the `<user>` placeholder in
  its contact URL; Scryfall asks for an accurate one, and only the user can
  supply it. `build.ts` and `images.ts` now print a warning on every run while it
  is there (`config.ts` `userAgentWarning`).
- Report 03 §4.5's refresh rules: no re-fetch when a print's `image_updated_at`
  moves on, and no dated retry for a `missing` / `placeholder` image (it is
  skipped and listed).
- **A failed bulk download left debris**, found in review and fixed: the
  `.part` file stayed when the stream failed, and a short file was renamed to the
  real name before its size was checked. `download()` now checks the size before
  `rename()` and removes the part on any failure, and the next fetch sweeps a
  `.part` whose process is gone (`cards-lib`: a short body and a mid-stream reset
  both leave the bulk directory empty).

## Browser — `#cards`

The card browser is a third view beside the board and the arena: `#cards`
(or `?view=cards`), lazily imported, reading the index above through a
dev-server-only route. It shows public card data, not a game, so none of hard
rule 8's machinery is involved. It still keeps the web conventions: no CSS
import (the rules are appended to `styles.css`), its own card renderer (never
`render/CardTile.tsx`, whose importer list stays at ten), one keymap table, pure
logic in `.ts` files that `node --test` reaches, and no hook below a return.

### What was built

| file | what it is |
|---|---|
| `web/src/useView.ts` | `View` gains `'cards'`; `#cards`, `#/cards`, `?view=cards`; the hash is matched on the part before `?`, so `#cards?q=agent` is still the browser |
| `web/src/main.tsx` | `lazy(() => import('./cards/CardBrowser.tsx'))`, chosen in `App` above both modes (no transport is created for it, and a live game's page-scoped socket survives the detour), plus a `▦ cards` link beside the arena toggle. `#cards` **unmounts** the mode app on purpose — kept mounted, the board's and the arena's `window` keydown listeners would press OK or Cancel in a live game from under the browser — so `App` remembers the view it came from (the back link returns to the arena when you came from it) and `ReplayApp` remembers each replay's frame (`replayCursors`) |
| `web/vite.config.ts` | `cardsPlugin()`: the route in `configureServer` **only** — not `vite preview`, not the build; `MTG_TABLE_CARDS_DB=<path>` points it at another index |
| `web/src/cards/devApi.ts` | the route (Node only): `/cards/api/{status,search,card/<id>,decks}` and `/cards/img/<id>/<size>[?face=back]`; loads `tools/card-library/query.ts` with a runtime `import()` so a missing or half-written library is a state, never a crash |
| `web/src/cards/model.ts` | `LibraryCard`, `LibraryStatus`, `SearchResponse`, `DeckFile` and total readers for each |
| `web/src/cards/search.ts` | the filters, one-row-per-card, the ranking and the URL round-trip: pure, and what both the route and the tests run |
| `web/src/cards/decks.ts` | a small `.dck` parser, the deck index (`in decks/x.dck ×N`), the in-deck filter, the `.dck` line |
| `web/src/cards/text.ts` | rules text → words and `{…}` symbols, `pipClass` (`{T}` is `ms-tap`: there is no `ms-t`), stats, legalities, credit, copyright, the image ladder |
| `web/src/cards/keys.ts` | the browser's keymap: `/`, the arrows, `Enter`, `Esc`, as a table plus `planCardsKey` |
| `web/src/cards/{CardBrowser,CardView,CardDetail,Pips}.tsx` | the page, the card renderer, the detail panel, the pips |
| `web/src/cards/api.ts` | the four GETs; "not JSON" from the route means it is not running here (a production build) and says so |
| `web/test/cards-ui.test.ts` | 29 tests: the pure half, 6 of them over `fixtures/cards/`' real MSH/MSC print lines |
| `web/test/cards-api.test.ts` | 15 tests: the route on a real loopback socket, with no index, over an index built from the fixture by `indexFromManifest` into a temp dir, and with an injected scan cap the fixture overruns |
| `web/test/cards-render.test.tsx` | 12 vitest tests: the empty state (both commands), the back link, the grid, the detail, the prints row, the capped, the capped-and-empty and the colour-only summaries |

### Search, as the route does it

- **Words** go to the library's `search()` (FTS5, name 10 / type 3 / text 1)
  **with every filter in its SQL**: the chosen sets as `p.set_code IN (…)`, the
  chosen deck resolved first (its ~30 cards by name and set hint) and passed as an
  oracle-id allow-list, the colours as an any-of over the card's own `colors`
  (the faces' for a card Scryfall colours per face), and the type as a substring
  superset. Only then are up to 1,000 hits read, 200 at a time, plus one to tell
  "exactly 1,000" from "more"; past that the page says "Showing 120 of 1,000+"
  and `approximate: true` rides on the response. The cap is injectable
  (`BackendOptions.scanCap`) so a test can make it matter.
- **No words, a deck** → that deck's lines, resolved by name and set hint through
  `getByName` (so Peggy is MSC #523 and the MSH lines are MSH).
- **No words, a set** → `browseSet()`, in collector-number order.
- **Nothing else** → no search. Colour or type alone would read every card, so the
  route answers `needsQuery` and the page shows the intro.
- Then `search.ts` runs over what came back: the same set, colour and deck
  predicates (now a no-op check), **type as a whole word**, one row per card
  without a set (keeping the MSH/MSC print), every print of each hit in the chosen
  sets with one (Agent Phil Coulson MSH #4 **and** #402), and the order: exact
  name, name prefix, all words in the name (each A–Z), then the index's bm25
  order. With no words nothing moves, so a set keeps collector order and a deck
  keeps file order.
- The index is a little looser than `search.ts`'s reference `matchesText`, which
  the fixture tests pin: FTS5's porter stemmer makes `agents` also find `agent`
  (`query.ts search agents --set msh` opens with *Agent Phil Coulson*), where the
  reference, a word-prefix match, would not.

**The first version filtered AFTER the cap, and gave false negatives** (found in
review, fixed). It read the top 1,000 FTS hits over all 38,690 cards and applied
set, deck and colour in JS; only a single set went into the SQL. Measured on the
real index before and after the fix:

| query | before | after |
|---|---|---|
| `creature`, MSH | 374 | 374 |
| `creature`, MSC | 647 | 647 |
| `creature`, MSH + MSC | **1** ("Showing 1 of 1+") | **1,021** (= 374 + 647) |
| `creature` in `decks/pacho-shield.dck` | **0** ("No cards match.") | 23 |
| `creature`, type creature, in the deck | **0** | **13** (= the deck's 13 creatures) |
| `flying`, MSH / MSC / both | 74 / 147 / **33** | 74 / 147 / **221** |
| `counter`, MSH / MSC / both | 147 / 191 / **24** | 147 / 191 / **338** |

The colour predicate was checked against the page's own `matchesColors` over
every card of MSH + MSC matching `a` (852), for all seven options and three
combinations: identical sets every time, the five face-coloured DFCs (Tony Stark
// The Invincible Iron Man and four more) included. `cards-api` now holds all of
it over the fixture index with an injected cap of 40 against `creature`'s 130
hits: both sets and the deck come back exactly as the uncapped route answers
them, a cap of 4 trims the *filtered* answer to 4 cards and says "+", and the SQL
colour filter equals `matchesColors` for every option. **Negative control:** with
the filters taken back out of the SQL (a single set only, as before), three of
those tests fail. And the page no longer tests `total === 0` before
`approximate`: a capped search that found nothing says "Nothing matched in the
part of the library this search read — narrow the search", never "No cards
match." (`cards-render`).

**There was no index gap.** The first write-up said `cards_fts` tokenised the raw
name, so `shield` could not reach `S.H.I.E.L.D. Helicarrier`, and the route ran
a supplementary SQL query over `card_names` to compensate. That was wrong:
`cards_fts` indexes `cards.norm_name` as external content, where `normName` has
already deleted the periods, and `node tools/card-library/query.ts search shield
--set msh` returns *S.H.I.E.L.D. Deployment Drone, Quake, Agent of S.H.I.E.L.D.,
Agents of S.H.I.E.L.D., Captain America's Shield, Take Up the Shield, Patriot,
Shield Wielder, S.H.I.E.L.D. Flying Car, S.H.I.E.L.D. Helicarrier, S.H.I.E.L.D.
Spy Kit, Nick Fury, Agent of S.H.I.E.L.D., Captain America, Super-Soldier* and
*U.S.Agent, John Walker*. The supplement (`#nameSupplement`, the one place the
route ran raw SQL against the index's schema) was dead code and is deleted; the
`shield` tests still pass without it.

Server-side times from `CardsBackend.search` on the real 55.7 MiB index, warm
(median of 7):

| query | results | time |
|---|---|---|
| `agent` | 64 | 2 ms |
| `agent`, set MSH | 17 (Coulson #4 and #402 both) | 1 ms |
| `shield` | 141 | 4 ms |
| `shield`, sets MSH + MSC | 28, S.H.I.E.L.D. included | 1 ms |
| `hero`, MSH, white, creature | 68 | 3 ms |
| `flying` | 1,000+ (the scan cap) | 94 ms |
| `creature`, sets MSH + MSC | 1,021 | 127 ms |
| `flying`, sets MSH + MSC | 221 | 18 ms |
| `counter`, sets MSH + MSC | 338 | 32 ms |
| `creature` in `decks/pacho-shield.dck` | 23 | 8 ms |
| in `decks/pacho-shield.dck`, no words | 28 | 1 ms |
| set MSC, no words | 866 | 18 ms |

### Images, credit and copyright

A tile's `<img>` tries the same-origin cache first (`/cards/img/<id>/normal`,
served from `var/cards/images` with `Cache-Control: public, max-age=86400`).
On a miss the route answers 404 and never fetches, and the page falls back to
Scryfall's CDN URL, which the result already carries. With neither, it draws a
text frame, never a broken `<img>`. The image is drawn whole: printed aspect
ratio, `object-fit: contain`, no filter. **Every image, tile or detail, has
`Illus. <artist>` under it.** The detail also prints the artist and the
copyright line: `™ & © <year> Wizards of the Coast, LLC`, plus
`MARVEL © <year> MARVEL` for MSH/MSC/MAR. Scryfall's data has no copyright
field, so this is the line as printed on the card, dated by the set's release.
The top bar carries the Scryfall / Fan Content credit, and it is **never
clipped**: the first fix made it wrap only at 900 px and below, and review found
it still cut off by the board bar's `nowrap` + ellipsis from 901 px to about
1,400 px (at 1,024 px, 378 of its 754 px showed, and the missing half was the Fan
Content notice). `.cardlib .app__bar` now wraps at every width. Measured in the
browser pane after the fix, credit `clientWidth` = `scrollWidth` at 375, 800,
1,024, 1,280, 1,400 and 1,600 px (356 px at 375, 754 px elsewhere), with no
horizontal page scroll at any of them.

### Screenshots — headless Chromium over CDP, 1600 × 1000, dev server on 5183

They show card art, so they live in the gitignored `var/evidence/card-browser/`
and are **not** committed (NOTICE §4: no Marvel artwork in the repository). The
numbers beside each were read off the live DOM by the same CDP session. The
page logged **no console errors or warnings** in any of them.

| file | URL | what it shows |
|---|---|---|
| `cards-search-agent.png` | `/#cards?q=agent` | "64 cards · 9 ms"; name hits first (Agent 13, Sharon Carter; Agent Bishop…); of the first 12 images, 1 from the same-origin cache and 11 from `cards.scryfall.io` (only the decks' 41 images are cached); every tile credited |
| `cards-detail-peggy.png` | `/#cards?q=peggy&open=1f98293e-…` | the detail: `{1}{W}` as two `mana-font` glyphs (`ms-1`, `ms-w`; computed font family `Mana`, 20.8 px wide), the rules text with the reminder text in italics, 2/1, *Marvel Super Heroes Commander · MSC #523 · Uncommon*, Michael MacRae, the copyright line, `in decks/pacho-shield.dck ×1`, `1 Peggy Carter, Secret Agent|MSC`, and Standard/Pioneer/Modern *not legal*, Legacy/Vintage/Commander *legal* |
| `cards-in-deck.png` | `/#cards?deck=decks/pacho-shield.dck` | the in-deck filter: 28 cards in the deck file's order, the select highlighted, **28 of 28 images from the cache** |
| `cards-detail-coulson-402.png` | `/#cards?q=coulson&open=1383e587-…`, then a click | the prints row: MSH #4 then MSH #402; clicking #402 switches the panel (extended art, `MSH #402 · Rare`) and the URL's `open=` |
| `cards-narrow-800.png` | 800 × 900 | the aside as a fixed sheet, no horizontal scroll (`scrollWidth − innerWidth = 0`), the credit wrapped |
| `cards-empty-no-index.png` | server started with `MTG_TABLE_CARDS_DB=var/cards/no-index-here.sqlite` | "No card library yet", the missing path, `node tools/card-library/build.ts`; no search box, no grid |

**Re-checked after the review fixes**, in the Claude browser pane against the dev
server on 5183 (DOM readings, no screenshots kept; no console errors):
`#cards?q=creature&set=msh,msc` reads *"Showing 120 of 1,021 — narrow the
search."* with MSH and MSC tiles; `q=creature` in the deck, *"23 cards"*; with
type creature, *"13 cards"*; `flying` and `counter` over both sets, *"of 221"* and
*"of 338"*; `flying` alone, *"Showing 120 of 1,000+"*. A replay stepped to frame
5, sent to `#cards` by the `▦ cards` link and brought back by `▤ board`, was at
**frame 5 / 376**; the same from `#arena` at frame 8 came back to **`#arena`**
(the back link read `▣ arena`, `href="#arena"`) at **frame 8 / 376**. Shrink (ME2)
copies as `1 Shrink` with the note naming why there is no `|ME2`; Wasp, Shrinking
Savior as `1 Wasp, Shrinking Savior|MSC`. The empty state (a server pointed at a
missing index) prints both commands, `build.ts` and `images.ts --all-decks`, and
says the build fetches no card image.

The empty state was produced by pointing the route at a path that does not
exist, not by moving the real index: the index is the data half's, and it was
never touched.

**The keyboard, driven through `Input.dispatchKeyEvent`:** `/` focused
`.cardlib__search`; typing `agent` searched; `↓` left the box for result 0, `→`
moved to 1 and `↓` to 7 (the grid measured 6 columns at 1600 px, read from
`grid-template-columns` rather than assumed); `Enter` opened *Agent of Horizons*,
result 7; `Esc` closed it.

### Build and tests

`npm run build` (`tsc --noEmit && vite build`): **0 errors**. Chunks, before
(this worktree at `0368a90`, measured first) → after the review fixes:

| chunk | before | after |
|---|---|---|
| entry `index-*.js` | 276.96 kB / **86.24 kB gzip** | 277.65 kB / **86.47 kB gzip** |
| `CardBrowser-*.js` (new, lazy) | — | 27.83 kB / 9.67 kB gzip |
| `index-*.css` | 73.00 kB / 14.99 kB gzip | 80.25 kB / 16.26 kB gzip |
| `Arena-*.js` | 1,224.97 kB / 347.70 kB gzip | 1,224.97 kB / 347.70 kB gzip |
| `Post-*.js` | 67.78 kB / 16.54 kB gzip | 67.78 kB / 16.54 kB gzip |

**The entry chunk is not byte-identical.** It grew 0.69 kB (0.23 kB gzip):
the `lazy()` import, the `view === 'cards'` branch in `App` and the view it
remembers, the replay cursor map, the `▦ cards` link and `useView`'s two new
spellings. None of the browser itself is in it;
that is the 26.8 kB chunk, and `cards-ui.test.ts` fails if `main.tsx` ever
imports `./cards/` statically. The stylesheet grew 1.24 kB gzip, because
CLAUDE.md's rule is one stylesheet imported once, and the browser's rules
follow it rather than shipping a per-chunk CSS file.

`npm --prefix web test`: **797 `node --test` pass, 0 fail**, of which the card
browser's are 29 (`cards-ui`) + 15 (`cards-api`) and the library's 49
(`cards-lib`); and **91 vitest pass, 0 fail** (6 files), of which 12 are
`cards-render`. `main` at `0368a90` is 704 + 79, and the differences are exactly
those four files (CLAUDE.md now records both).

### Not done, and worth knowing

- ~~`hooks-order.test.ts` does not scan `web/src/cards/`.~~ **It does now**
  (`TREES` gained `'../src/cards/'`, and `cards/CardBrowser.tsx` is on its
  required list): 33 files, 86 components. Negative control: a `useMemo` put
  below `PrintsRow`'s `return null` fails it by file, line and component.
- **The keymap is its own table** (`cards/keys.ts`), not rows in
  `web/src/keys.ts`. That table is the board's and the arena's, and
  `keys.test.ts` requires every chord in it to appear in the board's `?`
  overlay, where `/` and `Enter` would advertise keys the board does not
  handle. The browser's help line is rendered from its own table, so the
  one-table rule holds per surface.
- **The `.dck` line is `1 <Name>|<SET>`**, the shape `decks/pacho-shield.dck` is
  written in — **for MSH and MSC only**, the two sets whose Scryfall code is
  checked equal to Forge's `Code`; any other print copies as the bare name
  ("any print", always a valid line) and the panel says why. It does not add Forge's `|[<collector number>]` for a specific
  print (Coulson #402): report 03 §3.7 reads that grammar from the 2.0.15
  source, and it was not checked against the 2.0.14 jar here.
- **The route is dev-only by design.** A production build (or `vite preview`)
  shows the same empty state, saying the route is served by
  `npm --prefix web run dev`.
- The README NON-GOALS conflict noted at the top of this file covered the browser
  too ("no card search, no card browser"); **D90** now records it.

### Three defects found in review, fixed in this change

- **A deep link lost its card.** Moving from one `#cards?…` URL to another in
  the same document fired `hashchange`, and the listener re-read the filters
  but not `open=`. The URL effect then wrote the hash back without it before
  the new one was ever read, so `#cards?q=peggy&open=<id>` opened nothing. The
  listener now re-reads `open=` too. The CDP run above timed out on the Peggy
  panel until this was fixed.
- **Colour or type alone said "No cards match."** The route answers such a
  request with `needsQuery` rather than reading every card, and the page now
  says so. A search stopped at the scan cap also reads "1,000**+**" now, where it
  read as an exact 1,000. `cards-render` holds both.
- **The arrows would have been taken from a focused `<select>`,** so the type
  and deck dropdowns could not be driven from the keyboard. `planCardsKey` now
  leaves a select its arrows and `Enter` (only `/` and `Esc` are the page's
  there), while a result tile, which is a button, keeps the arrows. `cards-ui`
  holds both halves.

### Found in the second review, fixed in this change

- **Search false negatives** with a common word and a filter: the filters now go
  into the SQL before the cap (*Search, as the route does it*, above).
- **The NON-GOAL conflict**: D90, and README, NOTICE §2, PLAN.md and CLAUDE.md.
- **A dead name supplement and a false evidence claim**: deleted and corrected
  (*There was no index gap*, above).
- **1.3 MB of verbatim Scryfall JSON in the fixture**: reduced to the fields the
  library reads, 0.69 MB, same index digest; whether to commit even that is the
  user's call (D90).
- **`#cards` lost the replay's frame and always went back to the board**: it now
  resumes the frame and returns to the arena when that is where you were. Board-
  and arena-local UI state (an open panel, a zoomed card, a camera dragged by
  hand; the chosen camera view persists through D71's `localStorage`) is still
  lost across the detour, by design — see `App` in `main.tsx`.
- **The credit clipped at 901–1,400 px**: the bar wraps at every width.
- **The empty state promised images the build does not fetch**: it prints both
  commands.
- **A failed bulk download left a `.part`, and a short one landed at the real
  name**: fixed in `download()`.
- **`hooks-order` did not scan the browser**: it does.
- **Doc and UX drift**: the `--all-prints` figure (104.3 MiB, the tool's own
  estimate, not ~96), `Home`/`End` in the key help, the set-code guard, and
  report 03 §4.5's omissions listed in `tools/card-library/README.md`.
