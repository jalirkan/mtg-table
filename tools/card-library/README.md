# tools/card-library — the local card index

A local, offline-searchable index of every Magic card plus every print of the
two sets the deck is built from (MSH, MSC), and a disk cache of card images,
built from Scryfall with Node 24's built-in `node:sqlite` (FTS5) and no npm
dependency. `docs/research/03-scryfall-card-library.md` is the spec (§4 above
all); `docs/evidence/card-library.md` is what was measured.

It is a **tool**, not a package: nothing here is published, there is no
`package.json`, and the engine, the bridge and the board do not use it. The
card browser's dev-server route (`web/src/cards/devApi.ts`) imports
`query.ts`. `tools/fetch-art.ts` and `web/public/art.json` are untouched and
still what the board draws with.

> **README.md's NON-GOALS said "No card-library package … no card browser".**
> This directory exists on the user's request of 2026-09-27, and **DECISIONS.md
> D90** records what it lifts and what stays out: it is a tool, not a package;
> the browser's route is dev-server only and never fetches; there is no proxy of
> Scryfall.

## Commands (from the repo root, hard rule 9)

```bash
node tools/card-library/build.ts                    # fetch what changed from Scryfall, then index
node tools/card-library/build.ts --offline          # re-index the files already in var/cards/
node tools/card-library/build.ts --sets msh,msc     # which sets' prints to sync (the default)
node tools/card-library/build.ts --force            # re-download the bulk file even if current

node tools/card-library/images.ts --deck decks/pacho-shield.dck --size normal
node tools/card-library/images.ts --all-decks --size normal,grid
node tools/card-library/images.ts --all-prints --size normal         # count + bytes, then STOPS
node tools/card-library/images.ts --all-prints --size normal --yes   # ~104 MiB for MSH + MSC

node tools/card-library/query.ts name "Peggy Carter, Secret Agent"   # JSON on stdout
node tools/card-library/query.ts number msh 402
node tools/card-library/query.ts search shrink --set msc --limit 10
node tools/card-library/query.ts search creature --sets msh,msc --color W,M   # any-of, own colours
node tools/card-library/query.ts set msh --limit 50
node tools/card-library/query.ts resolve decks/pacho-shield.dck
node tools/card-library/query.ts image <scryfallId> --size normal [--face back]
node tools/card-library/query.ts stats

node tools/card-library/make-fixture.ts             # regenerate fixtures/cards/ from var/cards/
node --test web/test/cards-lib.test.ts              # offline; fake Scryfall, fake clock
```

A first build downloads ~24 MB (the gzipped `oracle_cards` bulk file) plus 8
search pages and takes under ten seconds; a rebuild whose bulk file is still
current downloads nothing but the 8 pages. Images are ~85 KB each at `normal`;
`--all-prints` prints its own estimate before it fetches anything (1,338 images,
**104.3 MiB** on 2026-09-27, from the mean of the images already cached) and
stops there without `--yes`.

## What is on disk

Everything lives under `var/cards/`, which the repo's `.gitignore` already
ignores (`var/`), so no index, bulk file or image can be committed by accident:

```
var/cards/cards.sqlite                      the index (~55 MB)
var/cards/bulk/oracle-cards-<ts>.jsonl.gz   the bulk file, kept for --offline rebuilds (one at a time)
var/cards/sync/manifest.json                what was fetched, when, with the bulk's updated_at
var/cards/sync/sets.json                    GET /sets, verbatim
var/cards/sync/prints-<set>.jsonl           /cards/search?q=e:<set>&unique=prints, one card per line
var/cards/sync/icons/<set>.svg              set icons, downloaded (Scryfall: do not hotlink them)
var/cards/images/<scryfallId>/<size>.<ext>        front, or the only side
var/cards/images/<scryfallId>/<size>.back.<ext>   back of a two-sided card
```

`fixtures/cards/` is the committed test slice: 172 `oracle_cards` lines, 84
MSH/MSC print lines and 6 sets, no images — real lines of the real files
**reduced to the fields the library reads** (`model.ts` `SCRY_CARD_FIELDS`,
`SCRY_FACE_FIELDS`, `SCRY_SET_FIELDS`, held to the interfaces at compile time),
~0.7 MB. The index built from it has the same content digest as one built from
the verbatim lines. Regenerate it with `make-fixture.ts`; never hand-edit it.
Whether it is committed at all is the user's call (D90).

## The index

| table | one row per | from |
|---|---|---|
| `cards` | oracle id — name, cost, type, Oracle text, P/T, colours, keywords, legalities, rules faces | the `oracle_cards` bulk file |
| `prints` | Scryfall id — set, collector number, rarity, artist, flavour, frame effects, image sizes | the MSH/MSC syncs **and** each bulk row's representative print |
| `print_faces` | face of a print — its name, artist, flavour, illustration id | both |
| `card_names` | name a card answers to (full + each face), normalised | both |
| `sets` | set — name, type, parent (msc → msh), icon, when synced | `GET /sets` |
| `cards_fts` | FTS5 over normalised name, type line, Oracle text (external content) | `cards` |
| `meta` | `schema_version`, `built_at`, `oracle_bulk_updated_at`, `content_sha256`, the measured request rates | the build |

A build writes a **fresh** file at `cards.sqlite.building` and renames it into
place, so a failed build leaves the old index and a reader never sees half a
file. `content_sha256` digests every card, print and set row: two builds from
the same data have the same digest, which is how "idempotent" is checked.

## The query module

`query.ts` is synchronous, read-only and never touches the network:

- `getByName(name, {set?, fuzzy?})` — `exact` → `normalized` (punctuation-free)
  → `face` (a Forge front-face name) → `fuzzy` (FTS5); every answer says which.
- `getBySetNumber(set, cn)`, `getById(id)`, `printsOf(oracleId)`,
  `browseSet(set)`, `syncedSets()`, `stats()`, `meta()`.
- `search(text, {set?, sets?, oracleIds?, type?, colors?, colorsAny?, includeExtras?, limit?, offset?})` —
  every word a prefix, phrase matches first, FTS5 syntax in the input inert.
  **Every filter is SQL**, so `limit`/`offset` page the filtered answer: `sets` is
  `p.set_code IN (…)`, `oracleIds` an allow-list (a deck resolved first),
  `colorsAny` any-of over the card's own colours (a face-coloured card answers
  with its faces'), `colors` Commander-style identity. The card browser's route
  depends on this: filtering after a capped read dropped every card outside the
  first 1,000 hits.
- `imageTarget(id, size, face)` / `imagePath(...)` / `imageUrl(...)` — where an
  image lives on disk, whether it is there, where it comes from.
- `resolveDeck(parsedDeck)` — report 03 §4.6's chain. A misspelt name is never
  substituted: it comes back unresolved with a `suggestion`.

The print ladder is `number` → `set` (the plain printing, or Forge's Nth art
index) → `family` (msh ↔ msc — Peggy Carter is only in MSC) → `synced` (a
Plains with no set is MSH's, not the bulk file's Star Trek one) → `oracle`.

## Scryfall's terms, as code

- `User-Agent` from `config.json`'s `scryfallUserAgent` (or `SCRYFALL_UA`) and
  `Accept: application/json` on every API request — `scryfall.ts` sets both.
- 2 req/s on `/cards/search|named|random|collection`, 10 req/s elsewhere; a
  429 closes the API for `Retry-After` seconds. Every run prints the measured
  rate per bucket from its own request log.
- Bulk data for anything at scale (the whole card pool is one 24 MB file);
  images straight from `cards.scryfall.io`, cached once, never re-fetched.
- `artist` ships with every print, and must be shown wherever that print's art
  is. Nothing here paywalls, repackages or proxies Scryfall's data.

## Not done

- **Report 03 §4.5's refresh rules.** A cached image is never fetched again, so a
  print whose `image_updated_at` moves on (a better scan) keeps the old file until
  it is deleted by hand; and a print whose `image_status` is `missing` or
  `placeholder` is skipped and listed, with no dated retry.
- `--all-prints --yes` has not been run (~104 MiB).
- The name ladder is local only: report 03 §4.6's last rung, `/cards/named?fuzzy=`,
  is not called; the local FTS5 guess is offered as a `suggestion` instead.
- No `resolve --write` (adding `|MSC` to the deck's ten unsuffixed lines), no
  `~/.cache/forge/cdn_uuid` warm start (§3.5), no `/cards/manifest` incremental
  refresh.
- **Set codes.** The browser's copy line upper-cases the Scryfall set code as a
  Forge `|SET` **only for MSH and MSC** (`web/src/cards/decks.ts`
  `FORGE_SET_CODES_CHECKED`), the two sets whose `ScryfallCode` is checked equal
  to Forge's `Code` (report 03 §3.3). Any other print gets the bare name, which
  Forge reads as "any print", and the page says why.
- **`config.json`'s `scryfallUserAgent`** names this project's contact
  (`github.com/jalirkan/mtg-table`); a fork should replace it with its own.
