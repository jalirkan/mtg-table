# 03 — Card Library: Scryfall data, images, caching, and the Forge name mapping

Research date: **2026-09-11**. Everything marked "verified" was checked against a live HTTP
response or a file read during this session; everything marked "guess" is my inference.

Forge source citations are relative to the sparse checkout at
`…/scratchpad/forge-src` (the full path is
`/tmp/claude-1000/-home-justin-a--config-Claude-scratch-workspaces-889ad522-c1ff-402b-8b23-6ae666c9b9a2-dcfb1aed-ebb2-456c-9dd7-5ecedf00d397-scratch-2026-09-11-0947cb/8723af12-0157-421e-988a-473182e5a3f1/scratchpad/forge-src`).

---

## 0. Executive summary — the five findings that change the design

1. **The user's deck spans two Scryfall sets, not one.** 18 of the 28 distinct cards are in
   `msh` (Marvel Super Heroes); 10 are in `msc` (Marvel Super Heroes Commander, which Scryfall
   reports as `parent_set_code: "msh"`). `Peggy Carter, Secret Agent` **does not exist in `msh`
   at all** — `GET /cards/named?exact=…&set=msh` returns HTTP 404. Any resolver that assumes
   "deck set = MSH" will fail on a third of the deck. Verified (§2.4).

2. **Scryfall's bulk data format changed: it is now gzipped JSONL, and the field is
   `jsonl_download_uri`, not `download_uri`.** Anything written from memory of the old
   "one giant JSON array + `download_uri` + `size`" API will break. Verified against
   `https://api.scryfall.com/bulk-data` (§1.5).

3. **`oracle_cards` is the wrong file for images.** It contains one card per *oracle_id*, so
   `Plains` in it is the `trk` (Star Trek) print, not the `msh` one. Verified:
   `/cards/search?q=!Plains&unique=cards` → `total_cards: 1`, `trk 317`. Use `oracle_cards`
   (24 MB) for rules text and `/cards/search?q=e:<set>&unique=prints` per-set for prints and
   images. Downloading `default_cards` (78 MB compressed, ~650 MB raw) is not needed (§1.5, §4.3).

4. **Forge already solved the Scryfall join, and its cache layout is directly reusable.** Forge
   2.0.14 ships `CdnUuidCache`, which stores `{cacheDir}/cdn_uuid/{setCode}.json.gz` mapping
   `collector_number → lang → scryfall UUID`, and builds CDN URLs as
   `https://cards.scryfall.io/{size}/{side}/{u[0]}/{u[1]}/{uuid}.jpg`. That file is a ready-made,
   rate-limit-free image index we can read directly. But Forge's *picture* cache is named by
   card name (`{SET}/{Card Name}[artIdx].full.jpg`), not by Scryfall id — it is **not** worth
   reusing as our image store (§3.5, §3.6).

5. **`node:sqlite` with FTS5 works out of the box on this machine** (Node v24.20.0, verified by
   running it). No native module, no `better-sqlite3` build step, no Python toolchain. That
   settles the index storage question (§4.4).

---

## 1. Scryfall API

Base URI: `https://api.scryfall.com`. HTTPS only, TLS 1.2+; plaintext HTTP is not honored.
UTF-8 everywhere. Source: <https://scryfall.com/docs/api> (verified; note the page returns
HTTP 403 to WebFetch's default client but 200 to a normal browser User-Agent).

### 1.1 Required headers — both are mandatory

> "All HTTP requests to api.scryfall.com must include a User-Agent header and an Accept header."

- **`User-Agent`** must be accurate to your usage context — "the name of your application, such
  as `MTGExampleApp/1.0`". The docs say explicitly: *"Do not allow HTTP libraries to choose the
  header for you."* For browser-side JS, keep the browser's UA intact.
- **`Accept`** must be present but may be generic. Both `*/*` and
  `application/json;q=0.9,*/*;q=0.8` are called out as acceptable.

For us: `User-Agent: mtg-table/0.1 (+https://github.com/<user>/mtg-table)`,
`Accept: application/json`. (Forge uses `"Forge/" + version` —
`forge-core/src/main/java/forge/util/BuildInfo.java:83-85`.)

### 1.2 Rate limits (verified, <https://scryfall.com/docs/api/rate-limits>)

| Endpoint | Limit | Min interval |
|---|---|---|
| `/cards/search` | 2/second | 500 ms |
| `/cards/named` | 2/second | 500 ms |
| `/cards/random` | 2/second | 500 ms |
| `/cards/collection` | 2/second | 500 ms |
| `/cards/manifest` | 10/minute | 6,000 ms |
| **All other methods** | 10/second | 100 ms |
| `*.scryfall.io` file origins | **no rate limit** | — |

A 429 limits access for 30 seconds; the docs state *"It is not acceptable to ignore HTTP 429
responses."* Continued overload can get an application temporarily or permanently banned.
Scryfall's 429 normally carries a `Retry-After` header (seconds).

The docs also direct: *"If you need to rapidly look up card names, prices, or resolve a large
number of card images, you must use the bulk data files."* And: cache for at least 24 hours;
gameplay data (names, oracle text, mana costs) changes rarely — "once per week or right after
set releases would most likely be sufficient."

**Forge's implementation is a good model to copy** —
`forge-gui/src/main/java/forge/util/ScryfallRateLimiter.java`:
- Two separate pacing buckets, 500 ms for `/cards/search` + `/cards/named`, 100 ms for
  everything else (lines 15–16, 34–36, 133–162).
- A global cooldown gate on 429 that honors `Retry-After` and falls back to 30 s (lines 17–18,
  58–63, 66–75).
- `isApiUrl()` returns false for `cards.scryfall.io`, so CDN image fetches are never throttled
  (lines 14, 29–31; comment at lines 7–8).

### 1.3 `GET /cards/named` (verified, <https://scryfall.com/docs/api/cards/named>)

Rate limit 2/s. Formats: `json`, `text`, `image`.

| Param | Notes |
|---|---|
| `exact` | Exact name, case-insensitive. No match → 404. |
| `fuzzy` | Misspellings and partial words allowed (`jac bele` → Jace Beleren). |
| `set` | Optional. Limits both the name search **and** the returned print to that set. |
| `format` | `json` \| `text` \| `image` (default `json`). |
| `face` | With `format=image`, `back` returns the back face; 422 if none. |
| `version` | With `format=image`: `small`, `normal`, `large`, `png`, `art_crop`, `border_crop` (default `large`). |
| `pretty` | Avoid in production. |

For both modes names are case-insensitive and punctuation is optional (`smugglers copter` ==
`Smuggler's Copter`).

Fuzzy failure modes, verified live:
- `?fuzzy=peggy carter secret` → the card (`msc` #523).
- `?fuzzy=agent` → HTTP 404, `{"code":"not_found","type":"ambiguous","details":"Too many cards
  match ambiguous name “agent”. …"}`. **The `type: "ambiguous"` discriminator is how you tell
  "too vague" from "doesn't exist"** — worth surfacing in our error type.

### 1.4 `POST /cards/collection` (verified, <https://scryfall.com/docs/api/cards/collection>)

Rate limit 2/s. **Maximum 75 identifiers per request.** Must be posted with
`Content-Type: application/json`. Body: `{"identifiers": [ … ]}`.

Valid identifier schemas:

| Schema | Resolves to |
|---|---|
| `id` (UUID) | that exact print |
| `mtgo_id`, `multiverse_id` | that print |
| `oracle_id` (UUID) | **newest** edition with that oracle_id |
| `illustration_id` (UUID) | preferred scans for that illustration |
| `name` | **newest** edition with that name |
| `name` + `set` | that name in that set |
| `collector_number` + `set` | that exact print (collector numbers are **strings**) |

Misses come back in a `not_found` array. The docs warn: *"cards that aren't found will throw off
the mapping of request identifiers to results, so you should not rely on positional index alone
while parsing the data."* Match results back by `(name, set)` / `(set, collector_number)`, never
by index.

**Verified live on the real deck** (28 identifiers, one request):
`{"name": …}` alone returned 28/28 found — but `Plains` and `Island` resolved to `trk` #317/#319
(newest print), *not* MSH. Adding `set: "msh"`:

```
FOUND:    Agent Phil Coulson msh #4 · S.H.I.E.L.D. Helicarrier msh #249
          Plains msh #287 · Island msh #289
NOT FOUND: [{"name":"Peggy Carter, Secret Agent","set":"msh"},
            {"name":"Thriving Heath","set":"msh"},
            {"name":"Nick Fury, Spymaster","set":"msh"}]
```

This is the whole resolution problem in one response and drives the fallback chain in §4.6.

### 1.5 `GET /bulk-data` — **format changed; read this carefully**

<https://scryfall.com/docs/api/bulk-data> (verified) plus a live call to the endpoint.

> "Each bulk file is a **gzipped JSONL (JSON Lines) archive** … You will specifically download a
> `jsonl.gz` archive and need to decompress or stream it on disk. They are **not** wrapped in
> tarballs (it's just `.gz`, not `.tar.gz`)."

Bulk-data object fields are `id`, `uri`, `type`, `name`, `description`, `updated_at`,
**`jsonl_download_uri`**, **`compressed_size`**. (The older `download_uri` / `size` names are
gone — writing against them from memory will fail.)

Live listing on 2026-09-11 (verified, exact byte counts from the API):

| `type` | `compressed_size` | Doc's stated size | Content |
|---|---|---|---|
| `oracle_cards` | 24,574,454 (23.4 MB) | 23.4 MB | **one card object per `oracle_id`** — "most up-to-date recognizable version" |
| `unique_artwork` | 37,755,800 (36 MB) | 36 MB | one card per unique artwork, best scans |
| `default_cards` | 78,191,099 (74.6 MB) | 74.6 MB | **every** card object in English (or printed lang if English-only) |
| `all_cards` | 392,820,617 (375 MB) | 375 MB | every card in every language |
| `rulings` | 5,366,171 (5.12 MB) | 5.12 MB | rulings keyed by `oracle_id` |
| `art_tags` | 12,770,373 | 12.2 MB | Tagger community art tags |
| `oracle_tags` | 5,906,013 | 5.63 MB | Tagger community oracle tags |

URL shape (verified): `https://data.scryfall.io/oracle-cards/oracle-cards-20260911090152.jsonl.gz`
— the timestamp changes daily, so **always resolve through `/bulk-data`; never hardcode a file URL.**

I downloaded the first 400 KB of `oracle_cards` and inflated it with a raw
`zlib.decompressobj(16+MAX_WBITS)` (verified): 400,001 compressed bytes → 3,310,331 bytes →
634 complete lines. **Compression ratio ≈ 8.3×**, so `oracle_cards` inflates to roughly
**200 MB** and `default_cards` to roughly **650 MB**. Each line is one complete JSON object; the
first object had **69 keys**:

```
all_parts artist artist_ids booster border_color card_back_id cardmarket_id cmc
collector_number color_identity colors digital edhrec_rank finishes flavor_text foil
frame frame_effects full_art game_changer games highres_image id illustration_id
image_status image_updated_at image_uris keywords lang layout legalities mana_cost
mtgo_id multiverse_ids name nonfoil object oracle_id oracle_text oversized power
preview prices prints_search_uri promo purchase_uris rarity related_uris released_at
reprint reserved rulings_uri scryfall_set_uri scryfall_uri security_stamp set set_id
set_name set_search_uri set_type set_uri story_spotlight tcgplayer_id textless
toughness type_line uri variation watermark
```

Note `image_updated_at` — useful as a cache-busting signal (guess: it is the `?<timestamp>`
suffix on the CDN URLs; I did not confirm they are identical values).

Bulk data is regenerated only every 12–24 hours and prices in it are "dangerously stale after
24 hours". A newer `/cards/manifest` endpoint (10/minute) exists "to check for anything that has
changed on Scryfall" — I did not exercise it; worth a look if we ever want incremental refresh.

**Forge's bulk consumer** is a useful reference:
`forge-gui/src/main/java/forge/gui/download/ScryfallBulkDataSync.java` — resolves the listing at
line 29, streams the gz (`GZIPInputStream`, line 22), accumulates `set → cn → lang → [front,back]`
and merges into `CdnUuidCache` (lines 64–90). Its `approxSizeLabel()` (lines 41–43) hardcodes
"375 MB" / "75 MB", matching what I measured.

### 1.6 `GET /cards/search` (verified, <https://scryfall.com/docs/api/cards/search>)

Rate limit 2/s. Formats `json` and `csv`. **Paginated at 175 cards per page**; follow
`next_page` while `has_more` is true. Returns a `List` even for one result. `q` max 1000
Unicode characters.

Params: `q`, `unique` (`cards` default / `art` / `prints`), `order` (`name` default, plus `set`,
`released`, `rarity`, `color`, `usd`, `tix`, `eur`, `cmc`, `power`, `toughness`, `edhrec`,
`penny`, `artist`, `review`), `dir` (`auto`/`asc`/`desc`), `include_extras`,
`include_multilingual`, `include_variations`, `page`, `format`, `pretty`.

"Missing luxuries": unlike the website, the API does **not** auto-retry with `include:extras` or
`lang:any`, does not redirect set-only searches, and gives no spelling help.

Verified sizing for our sets:

```
e:msh unique=prints include_extras include_variations → total_cards 453, 175/page, 3 pages
e:msc same                                            → total_cards 866, 175/page, 5 pages
```

8 pages at 500 ms pacing ≈ **4 seconds** to index both sets completely. This is the cheap path
and the one I recommend (§4.3).

Forge builds exactly this query in
`forge-gui/src/main/java/forge/gui/download/ScryfallSetSync.java:34` (`DEFAULT_SEARCH_URL`),
paginating on `has_more` / `next_page` at lines 56–62.

### 1.7 `GET /sets` and `GET /sets/:code` (verified, <https://scryfall.com/docs/api/sets>)

`GET /sets` returned a `List` of **1,049** sets with `has_more: false` — effectively unpaginated,
one 10/s-bucket request. Set object fields: `id`, `code`, `mtgo_code`, `arena_code`,
`tcgplayer_id`, `name`, `set_type`, `released_at`, `block_code`, `block`, `parent_set_code`,
`card_count`, `printed_size`, `digital`, `foil_only`, `nonfoil_only`, `scryfall_uri`, `uri`,
`icon_svg_uri`, `search_uri`.

Of `icon_svg_uri` the docs say: *"Hotlinking this image isn't recommended, because it may change
slightly over time. You should download it and use it locally for your particular user interface
needs."* — the one place "hotlink" appears in the docs.

### 1.8 Data and image usage policy (verified, <https://scryfall.com/docs/api>)

Provided free under the WotC Fan Content Policy for "creating additional Magic software,
performing research, or creating community content."

**Data rules:** no Scryfall logos or use of the Scryfall name implying endorsement; **no
paywalling** Scryfall data (no payments, surveys, subscriptions, ratings, chat-server joins, or
channel follows in exchange for card data — with an account system, end users must be able to
get card data anonymously or with a free account); do not use the data to create new games or
imply it is from a game other than Magic; do not "simply repackage, republish, or proxy Scryfall
data — your software must create additional value for end-users."

**Image rules:** do not cover, crop, or clip off the copyright or artist name; do not distort,
skew, or stretch; do not blur, sharpen, desaturate, or color-shift; do not add your own
watermarks, stamps, or logos; do not imply someone other than WotC created the card. When using
`art_crop`, **list the artist name and copyright elsewhere in the same interface**, or show the
full card image in the same interface.

Repeated mishandling "may result in Scryfall restricting or blocking your API access."

**On attribution and hotlinking, be precise about what is actually required.** The docs do not
contain a literal "you must credit Scryfall" clause or a literal "do not hotlink card images"
clause. What exists is: (a) the `icon_svg_uri` hotlinking advisory above; (b) the strong caching
directive on the rate-limits page (*"We encourage you to cache the data you download from
Scryfall or process it locally in your own system, at least for 24 hours"* and *"If you need to …
resolve a large number of card images, you must use the bulk data files"*); (c) the `art_crop`
artist-and-copyright requirement. Forge's own code comments treat `cards.scryfall.io` as
unthrottled and hotlinkable, and it does hotlink-then-cache.

**My recommendation for mtg-table** (opinion, not a quoted rule): cache every image to disk on
first fetch and serve from our own origin thereafter; never proxy an image request per page view.
Put a footer on the client reading approximately:

> Card data and images from [Scryfall](https://scryfall.com). Portions of mtg-table are unofficial
> Fan Content permitted under the Wizards of the Coast Fan Content Policy. The literal and
> graphical information about Magic: The Gathering, including card images and mana symbols, is
> copyright Wizards of the Coast, LLC. mtg-table is not produced by or endorsed by Wizards of the
> Coast or by Scryfall. Rules engine: [Forge](https://github.com/Card-Forge/forge) (GPLv3).

This satisfies (a) not implying Scryfall endorsement, (b) the WotC copyright line Scryfall itself
displays, and (c) the GPLv3 attribution we owe Forge.

---

## 2. Images

### 2.1 `image_uris` sizes — the documented six, plus five new WEBP variants

<https://scryfall.com/docs/api/images> (verified). The classic set:

| Key | Dimensions | Format | Use |
|---|---|---|---|
| `png` | 744 × 1040 | PNG | transparent, rounded corners; best for video/high-quality |
| `small` | 146 × 204 | JPG | thumbnail / list icon |
| `normal` | 488 × 680 | JPG | medium full card |
| `large` | 672 × 936 | JPG | large full card |
| `border_crop` | 480 × 680 | JPG | corners + most of border cropped |
| `art_crop` | varies | JPG | art rectangle only; "not guaranteed to be perfect for cards with outlier designs" |

**New since the docs I remembered — WEBP replacements, now documented and present in live
responses:**

| Key | Dimensions | Format | Replaces |
|---|---|---|---|
| `thumb` | 146 × 204 | WEBP | `small` |
| `grid` | 488 × 680 | WEBP | `normal` |
| `display` | 672 × 936 | WEBP | `large` |
| `crop` | 480 × 680 | WEBP | `border_crop` |
| `art` | 626 × 457 | WEBP | `art_crop` |

Verified in a live card response — `image_uris` keys on Agent Phil Coulson were exactly:
`['small','normal','large','png','art_crop','border_crop','thumb','grid','display','art','crop']`.

For a browser front-end the WEBP variants are the better default (smaller at equal dimensions,
universally supported in a modern browser). **Recommendation: store `normal` (JPG) as the
interoperable baseline and `display`/`grid` (WEBP) when we want the crisper battlefield render;
`art_crop` only if we build an art-forward UI, and then only with the artist credit shown.**

`image_status` (verified, same page) is one of `missing`, `placeholder`, `lowres`,
`highres_scan`. Forge skips caching anything `missing` or `placeholder`
(`ScryfallSetSync.java:88-90`) — we should do the same, and re-check those cards later rather
than caching a placeholder forever. Our three sample cards are all `highres_scan`.

### 2.2 CDN URL shape (verified)

```
https://cards.scryfall.io/{size}/{side}/{id[0]}/{id[1]}/{id}.jpg?{cache-buster}
```

e.g. `https://cards.scryfall.io/normal/front/1/3/1383e587-df58-4b45-9067-b9399e90b9ed.jpg?1783902979`

Live checks: that URL → HTTP 200, `image/jpeg`, 73,417 bytes. The `png` variant
(`/png/front/1/3/….png`) → HTTP 200, 605,487 bytes. `{side}` is `front` or `back`.
The `?…` query is a cache buster and can be dropped when storing locally.

`*.scryfall.io` has **no rate limit** — this is the endpoint to hammer for a deck prefetch.

Forge constructs the same string in
`forge-gui/src/main/java/forge/gui/download/CdnUuidCache.java:384-387`:

```java
public static String cdnUrl(String uuid, String side, String size) {
    return ForgeConstants.URL_SCRYFALL_CDN + size + "/" + side
            + "/" + uuid.charAt(0) + "/" + uuid.charAt(1) + "/" + uuid + ".jpg";
}
```

with `URL_SCRYFALL_CDN = "https://cards.scryfall.io/"`
(`forge-gui/src/main/java/forge/localinstance/properties/ForgeConstants.java:350`).

### 2.3 Multi-face cards — where `image_uris` lives

Scryfall models multi-face cards as one object with a `card_faces` array
(<https://scryfall.com/docs/api/cards>, "Multiface Cards"). The face object's `image_uris` doc
(same page) says it is present *"if this is a double-sided card. If this card is not
double-sided, then the `image_uris` property will be part of the parent object instead."*

Verified live — this distinction is real and matters:

| Card | `layout` | top-level `image_uris`? | per-face `image_uris`? |
|---|---|---|---|
| `Delver of Secrets // Insectile Aberration` | `transform` | **no** | **yes**, both faces |
| `Fire // Ice` | `split` | **yes** | no |
| `Bonecrusher Giant // Stomp` | `adventure` | **yes** | no |

So the rule is **not** "has `card_faces` → use face images". It is: *prefer top-level
`image_uris`; if absent, fall back to `card_faces[i].image_uris`.* Split and adventure cards have
two faces printed on one physical face and therefore one image.

Forge encodes exactly this precedence in `ScryfallSetSync.java:86-110` (`frontBackUuids`):
check `image_uris` first, then `card_faces[0].image_uris` / `card_faces[1].image_uris`, and bail
out returning `null` if neither exists. Its `CdnUuidCache` stores the result as either a single
UUID string or a `["front","back"]` array (see the class doc comment,
`CdnUuidCache.java:26-33`).

Note the face objects carry their own `mana_cost`, `name`, `type_line`, `oracle_text`, `power`,
`toughness`, `colors`, `artist`, `illustration_id`, `defense`, `loyalty`, `flavor_text`,
`color_indicator`, and (for reversible cards) their own `cmc` and `layout`
(<https://scryfall.com/docs/api/cards>, "Card Face Objects").

### 2.4 Direct image endpoint `/cards/:code/:number(/:lang)?format=image`

<https://scryfall.com/docs/api/cards/collector> (verified). Formats `json`, `text`, `image`;
params `face` (`back`, 422 if none) and `version` (`small`/`normal`/`large`/`png`/`art_crop`/
`border_crop`, default `large`).

Verified live:

```
GET https://api.scryfall.com/cards/msh/4?format=image&version=normal
→ HTTP/2 302
  location: https://cards.scryfall.io/normal/front/1/3/1383e587-…-…-…-….jpg?1783902979
```

It is a **redirect to the CDN**, and it is on the **10/s (100 ms)** bucket, not the 2/s one
(only `/cards/search` and `/cards/named` are named in the 2/s list). Convenient for a one-off
lookup, but for bulk prefetch resolve UUIDs once and hit `cards.scryfall.io` directly — that path
has no limit at all.

This is precisely the URL Forge builds —
`forge-core/src/main/java/forge/util/ImageUtil.java:260-262`:

```java
return String.format("%s/%s/%s?format=image&version=%s%s", editionCode, encodeUtf8(cardCollectorNumber),
        langCode, versionParam, faceParam);
```

appended to `URL_PIC_SCRYFALL_DOWNLOAD = "https://api.scryfall.com/cards/"`
(`ForgeConstants.java:349`).

### 2.5 The user's set and cards on Scryfall — all present

`GET https://api.scryfall.com/sets/msh` → **HTTP 200** (verified):

```json
{"object":"set","id":"ba9bf625-681c-4a4e-ab48-399b2fecac6b","code":"msh","mtgo_code":"msh",
 "arena_code":"msh","tcgplayer_id":24553,"name":"Marvel Super Heroes",
 "released_at":"2026-06-26","set_type":"expansion","card_count":453,"digital":false,
 "icon_svg_uri":"https://svgs.scryfall.io/sets/msh.svg?1788753600"}
```

Related sets from `GET /sets` (verified): `msc` Marvel Super Heroes Commander, `set_type`
`commander`, 866 cards, **`parent_set_code: "msh"`**; `mar` Marvel Universe, `set_type`
`masterpiece`, 100 cards.

Three cards in full (verified via `/cards/named?exact=`):

**Agent Phil Coulson** — `msh` #4, rare
- `id` `1383e587-df58-4b45-9067-b9399e90b9ed`, `oracle_id` `dae20bcd-dc24-4f9d-9400-a6f013b49f14`
- `{1}{W}`, cmc 2.0, Legendary Creature — Human Spy Hero, 2/2, colors `["W"]`,
  keywords `["Vigilance"]`, layout `normal`, artist Marc Aspinall, `image_status` `highres_scan`
- oracle: `Vigilance\n{T}: Put a +1/+1 counter on each other Hero you control.`
- `image_uris.normal`: `https://cards.scryfall.io/normal/front/1/3/1383e587-df58-4b45-9067-b9399e90b9ed.jpg?1783902979`
- `legalities.standard`: `legal`

**S.H.I.E.L.D. Helicarrier** — `msh` #249, uncommon
- `id` `364dc091-3161-4cd7-838c-742b9325fc32`, `oracle_id` `0f2335bf-6a13-4483-997a-fd19d30c4d48`
- `{4}`, cmc 4.0, Artifact — Vehicle, 4/5, colors `[]`, keywords `["Flying","Crew"]`, artist Arthur Yuan
- oracle: `Flying\nWhen this Vehicle enters, create two 1/1 white Soldier creature tokens.\nCrew 6 (…)`
- `image_uris.normal`: `https://cards.scryfall.io/normal/front/3/6/364dc091-3161-4cd7-838c-742b9325fc32.jpg?1783902891`
- `legalities.standard`: `legal`

**Peggy Carter, Secret Agent** — **`msc` #523**, uncommon *(not in MSH)*
- `id` `1f98293e-9d94-4185-8546-8beaf281dfa3`, `oracle_id` `2f3c6b8e-df89-4f0c-97bb-fbfcda5232b4`
- `{1}{W}`, cmc 2.0, Legendary Creature — Human Spy Hero, 2/1, artist Michael MacRae,
  `frame_effects: ["legendary"]`, `promo_types: ["universesbeyond"]`
- oracle: `Whenever a creature you control attacks alone, it gains indestructible until end of turn. (…)`
- `image_uris.normal`: `https://cards.scryfall.io/normal/front/1/f/1f98293e-9d94-4185-8546-8beaf281dfa3.jpg?1783903106`
- `legalities.standard`: `not_legal`
- `/cards/search?q=!"Peggy Carter, Secret Agent"&unique=prints` → **`total_cards: 1`** — `msc` is
  its only printing anywhere.

**Full deck resolution** (one `POST /cards/collection`, name-only identifiers, 28/28 found):

| Card | Set | # | Card | Set | # |
|---|---|---|---|---|---|
| Agent Phil Coulson | msh | 4 | Giant-Sized Flying Ant | msh | 56 |
| Agent 13, Sharon Carter | msh | 1 | Bold Biochemist | msh | 48 |
| Agents of S.H.I.E.L.D. | msh | 5 | A.I.M. Scientists | msh | 44 |
| Quake, Agent of S.H.I.E.L.D. | msh | 32 | Aerial Doombot | msh | 43 |
| S.H.I.E.L.D. Helicarrier | msh | 249 | Super Suit | msh | 78 |
| S.H.I.E.L.D. Spy Kit | msh | 36 | Depower | msh | 50 |
| Web Up | msh | 41 | Pym Particles | msh | 70 |
| Helicarrier Strike | msh | 15 | Plains | **msh 287/289 with `set:msh`** (name-only → `trk` 317) |
| Borough Backup | msh | 7 | Island | **msh 289** (name-only → `trk` 319) |
| **Peggy Carter, Secret Agent** | **msc** | **523** | **Wasp, Shrinking Savior** | **msc** | **646** |
| **Nick Fury, Spymaster** | **msc** | **603** | **Ant-Man, Reformed Rogue** | **msc** | **739** |
| **Strategic Intervention** | **msc** | **609** | **Ant-Man's Air Force** | **msc** | **759** |
| **Robotics Mastery** | **msc** | **786** | **Quantum Reduction** | **msc** | **635** |
| **Thriving Heath** | **msc** | **580** | **Thriving Isle** | **msc** | **581** |

Prefetch cost: 28 distinct cards × ~75 KB (`normal`) ≈ **2 MB**. Both sets in full (453 + 866 =
1,319 prints) ≈ **100 MB** at `normal`.

---

## 3. Forge's side

### 3.1 Card script format — `res/cardsfolder/cardsfolder.zip`

Read with `unzip -p /home/justin-a/forge/res/cardsfolder/cardsfolder.zip p/peggy_carter_secret_agent.txt`.
Entries are `<first letter>/<snake_case name>.txt`; the name is lowercased with all
non-alphanumerics collapsed to `_` (`S.H.I.E.L.D. Helicarrier` → `s_h_i_e_l_d_helicarrier.txt`;
`Agent Phil Coulson` → `a/agent_phil_coulson.txt`). The zip is 16.4 MB.

Line grammar is `Key:Value`, one per line, order-insensitive except that `A:`/`T:` precede their
`SVar:` helpers by convention:

| Key | Meaning |
|---|---|
| `Name:` | card name — **front face only** for multi-face cards |
| `ManaCost:` | space-separated symbols (`1 W`), `no cost` for a face with none |
| `Types:` | space-separated supertypes + types + subtypes, no `—` |
| `PT:` | `power/toughness` |
| `K:` | keyword; parameterized as `K:Crew:6`, `K:Teamwork:2` |
| `T:` | triggered ability — `Mode$ … | … | Execute$ <SVar> | TriggerDescription$ …` |
| `A:` | activated (`AB$`) or spell (`SP$`) ability — `Cost$`, `ValidTgts$`, `SpellDescription$`, … |
| `SVar:` | named sub-ability (`DB$ …`), static ability, or count expression (`SVar:X:Count$…`) |
| `DeckHas:` / `DeckHints:` | deckbuilder hints for the AI |
| `AlternateMode:` | `DoubleFaced` \| `Split` \| `Adventure` \| `Meld` \| `Specialize` … |
| `Colors:` | explicit color override (used on faces with `no cost`) |
| `Oracle:` | printed oracle text, `\n` for line breaks |

Parameters inside `T:`/`A:`/`SVar:` are `|`-separated `Key$ Value` pairs. `CARDNAME` is the
self-reference placeholder.

Verified example — `p/peggy_carter_secret_agent.txt`:

```
Name:Peggy Carter, Secret Agent
ManaCost:1 W
Types:Legendary Creature Human Spy Hero
PT:2/1
T:Mode$ Attacks | ValidCard$ Creature.YouCtrl | Alone$ True | TriggerZones$ Battlefield | Execute$ TrigPump | TriggerDescription$ Whenever a creature you control attacks alone, it gains indestructible until end of turn. (Damage and effects that say "destroy" don't destroy it.)
SVar:TrigPump:DB$ Pump | Defined$ TriggeredAttackerLKICopy | KW$ Indestructible
Oracle:Whenever a creature you control attacks alone, it gains indestructible until end of turn. (Damage and effects that say "destroy" don't destroy it.)
```

and `a/agent_phil_coulson.txt`, showing `K:`, `A:`, and the deck hints:

```
Name:Agent Phil Coulson
ManaCost:1 W
Types:Legendary Creature Human Spy Hero
PT:2/2
K:Vigilance
A:AB$ PutCounterAll | Cost$ T | ValidCards$ Hero.Other+YouCtrl | CounterType$ P1P1 | CounterNum$ 1 | AILogic$ AtEOTOrBlock | SpellDescription$ Put a +1/+1 counter on each other Hero you control.
DeckHas:Ability$Counters
DeckHints:Type$Hero
Oracle:Vigilance\n{T}: Put a +1/+1 counter on each other Hero you control.
```

**Multi-face scripts** use a literal `ALTERNATE` separator line between two full blocks. Verified
in `d/delver_of_secrets_insectile_aberration.txt` (`AlternateMode:DoubleFaced`),
`f/fire_ice.txt` (`AlternateMode:Split`, front `Name:Fire`, back `Name:Ice`), and
`b/bonecrusher_giant_stomp.txt` (`AlternateMode:Adventure`). **The filename joins both face names
with `_`; `Name:` carries only the front.**

Comparing Forge's `Oracle:` to Scryfall's `oracle_text` for our three cards: byte-identical on
all three (Peggy, Coulson, Helicarrier). That is a strong signal Forge's scripts are generated
from Scryfall oracle text — so **we should never render Forge's `Oracle:` in the UI; render
Scryfall's, and keep Forge's scripts purely as engine input.** (Guess as to provenance; the
equality is verified.)

### 3.2 Edition file format — `res/editions/Marvel Super Heroes.txt`

INI-style `[section]` blocks. `[metadata]` uses `Key=Value` (verified, first 6 lines):

```
[metadata]
Code=MSH
Date=2026-06-26
Name=Marvel Super Heroes
Type=Expansion
ScryfallCode=MSH
```

`ScryfallCode` defaults to `Code` when absent —
`forge-core/src/main/java/forge/card/CardEdition.java:760`:
`res.scryfallCode = metadata.get("ScryfallCode", res.code);` — and is lowercased on read at
line 374: `public String getScryfallCode() { return scryfallCode.toLowerCase(); }`.
`/home/justin-a/forge/res/editions/Marvel Super Heroes Commander.txt` has `Code=MSC`,
`ScryfallCode=MSC`, `Type=Commander`.

Card lines live in sections enumerated by `EditionSectionWithCollectorNumbers`
(`CardEdition.java:120-141`): `cards`, `special slot`, `precon product`, `borderless`, `etched`,
`showcase`, `full art`, `extended art`, `alternate art`, `retro frame`, `buy a box`, `promo`,
`prerelease promo`, `bundle`, `box topper`, `jumpstart`, `rebalanced`, `eternal`, `conjured`,
`scheme`, `printsheets`. (`[tokens]` and `[metadata]` are handled separately, and MSH also has
non-card sheet sections like `[scene]`, `[logo]`, `[panel]`, `[city calm]`, `[borderless land]`.)

The line grammar is one regex — `CardEdition.java:596-615`:

```java
"(^(.?[0-9A-Z-]+\\S*[A-Z]*)\\s)?(([SCURML])\\s)?([^@$]+)( @([^$]*))?( \\$\\{(.+)\\})?$"
```

with groups: **2 = collector number**, **4 = rarity**, **5 = name**, **7 = artist**,
**9 = extra params** (a small JSON string map, `EXTRA_PARAMS_PATTERN` at line 628). Consumed at
`CardEdition.java:681-686`. Rarity letters are `S C U R M L` (special, common, uncommon, rare,
mythic, land) — `CardRarity.smartValueOf(matcher.group(4))`.

So the documented shape `number:? rarity name @artist` is right, with number, rarity, artist and
`${…}` params all optional. Verified samples:

```
[cards]
1 U Agent 13, Sharon Carter @Michael MacRae
4 R Agent Phil Coulson @Marc Aspinall
5 C Agents of S.H.I.E.L.D. @Borja Pindado
15 C Helicarrier Strike @Maxim Ruabtsev
249 …  287 L Plains @Domenico Cava   289 L Island @Raymond Bonilla

[extended art]
402 R Agent Phil Coulson @Marc Aspinall

[tokens]
3 w_1_1_soldier @Nathaniel Himawan
```

Two structural consequences:

- **A name maps to many collector numbers within one set.** `Agent Phil Coulson` is `[cards]` #4
  *and* `[extended art]` #402. `Plains` in MSH appears at #277, #278, #287, #288, #433, #434.
  Verified against Scryfall: `GET /cards/msh/402` → Agent Phil Coulson, `frame_effects:
  ["legendary","extendedart"]`, id `258b663e-2fa0-4203-9f5f-f9963940c5b3` — a *different* Scryfall
  id from #4. **Name alone is not a key; `(set, collector_number)` is.**
- Forge's `artIndex` (1-based, `IPaperCard.DEFAULT_ART_INDEX = 1`,
  `forge-core/src/main/java/forge/item/IPaperCard.java:14`) is what disambiguates duplicates in
  its own card request strings.

### 3.3 The join key: `ScryfallCode` + `collector_number`

**`(edition.getScryfallCode().toLowerCase(), paperCard.getCollectorNumber())` → a unique Scryfall
print.** That is exactly how Forge does it
(`forge-gui/src/main/java/forge/util/ImageFetcher.java:73-91`, `ImageUtil.java:209-262`), and it
round-trips cleanly for MSH/MSC because `ScryfallCode == Code` in both files.

Known collector-number fixups Forge applies before using the number as a Scryfall key
(`ImageUtil.java:216-232, 236-260`) — copy these or we will 404 on edge cases:

| Forge value | Fixup |
|---|---|
| starts `OHOP` / `OPCA` / `OPC2` | strip the prefix, override set code to `ohop`/`opca`/`opc2` (Scryfall moved planechase cards out of their original set) |
| matches `^F\d+` (funny cards) | drop the leading `F` |
| ends with `☇` | strip it and force `&face=back` |
| Meld back face | base card's number with `(\d+)([sp]?)` → `$1b$2` |
| Specialize faces | append the color letter (`2` → `2w`, `2u`, `2b`, `2r`, `2g`) |
| `N.A.` (`IPaperCard.NO_COLLECTOR_NUMBER`) | **no Scryfall lookup possible** — Forge logs and skips (`ImageFetcher.java:257-264`) |

### 3.4 Name mapping between Forge and Scryfall — three distinct cases

This is the subtle part, and the rule differs by layout. All three verified.

| Layout | Scryfall `name` | Forge card script `Name:` | Forge **edition file** name |
|---|---|---|---|
| transform (DFC) | `Delver of Secrets // Insectile Aberration` | `Delver of Secrets` (front only) | `51 C Delver of Secrets` — front only (`Innistrad.txt:64`) |
| adventure | `Bonecrusher Giant // Stomp` | `Bonecrusher Giant` (front only) | `115 R Bonecrusher Giant` — front only (`Throne of Eldraine.txt:129`) |
| split | `Fire // Ice` | `Fire` (front only, `Ice` after `ALTERNATE`) | `215 U Fire // Ice` — **full `A // B`** (`Dominaria Remastered.txt:228`) |

So: **Forge edition files match Scryfall's `name` for split cards but carry only the front-face
name for transform and adventure cards.** A name-based matcher must try, in order: the literal
name; the name as a Scryfall front-face name (`card_faces[0].name`); and the full `A // B`.
Confirmed that `Stand // Deliver`, `Spite // Malice`, `Dusk // Dawn`, `Never // Return`,
`Commit // Memory` all appear with ` // ` in Forge edition files.

One more trap: Forge's *image filename* for split cards concatenates the two names with **no
separator** — `ImageUtil.getNameToUse()` at
`forge-core/src/main/java/forge/util/ImageUtil.java:191-192`:

```java
} else if (CardSplitType.Split == cp.getRules().getSplitType()) {
    return card.getMainPart().getName() + card.getOtherPart().getName();
```

i.e. `FireIce`, not `Fire // Ice`. Another reason not to build on Forge's picture filenames (§3.6).

### 3.5 Forge's `CdnUuidCache` — a reusable Scryfall index sitting on disk

`forge-gui/src/main/java/forge/gui/download/CdnUuidCache.java`. Class doc at lines 26–33:

> Thread-safe cache of Scryfall CDN image URLs … stored at `{cacheDir}/cdn_uuid/{setCode}.json.gz`.
> … Set JSON: `{"cn": {"lang": "uuid" | ["front","back"] | {"miss": timestamp}}}`

Directory constant: `CACHE_CDN_UUID_DIR = CACHE_DIR + "cdn_uuid" + PATH_SEPARATOR`
(`ForgeConstants.java:243`) → on this machine `/home/justin-a/.cache/forge/cdn_uuid/`. **It does
not exist yet** — the user has never run an image download; `/home/justin-a/.cache/forge` contains
only `db/` and `pics/` (verified).

Populated two ways:
- `ScryfallSetSync.sync(setCode)` — one set on demand via `/cards/search`
  (`ScryfallSetSync.java:46-71`).
- `ScryfallBulkDataSync.sync(type, allowedLangs, …)` — every set in one pass from `default_cards`
  or `all_cards` (`ScryfallBulkDataSync.java:58-93`).

Lookup: `getCdnUrlIfCached(scryfallCode, collectorNum, lang, face, size)`
(`CdnUuidCache.java:229-244`) returns a CDN URL or `null`; a miss is recorded with a timestamp
and retried after `MISS_RETRY_AFTER = Duration.ofDays(1)` (line 37). 19 language codes are
enumerated at lines 44–64.

**This is genuinely reusable.** `{setCode}.json.gz` is plain gzipped JSON with a trivial shape;
a TypeScript reader is ~20 lines. If the user ever runs Forge's image downloader, we get a free
`collector_number → scryfall id` index for every set with zero API calls. **But do not depend on
it** — it may never be populated, and we can build the same map ourselves in 4 seconds for the
two sets we care about (§1.6). Treat it as an opportunistic warm start.

### 3.6 Forge's picture cache — **not** worth reusing as our image store

Location: `/home/justin-a/.cache/forge/pics/cards/` (`ForgeConstants.java:236`,
`CACHE_CARD_PICS_DIR = ForgeProfileProperties.getCardPicsDir()`). Currently near-empty: the whole
`pics/` tree is 3.3 MB / 114 files, and `pics/cards/` holds exactly one file (verified):

```
/home/justin-a/.cache/forge/pics/cards/SLD/'Tis But a Scratch!.fullborder.jpg
```

Naming comes from `ImageUtil.getImageRelativePath()`
(`forge-core/src/main/java/forge/util/ImageUtil.java:101-155`):
`{SET}/{MWS-sanitized name}{artIndex if >1}.full.jpg`, where `toMWSFilename()` (line 293) strips
accents and removes `"`, `/`, `:`, `?`. A `.fullborder` variant is substituted when the plain
`.full` file is absent (`GuiDownloadService.java:281-286`,
`GuiDownloadSetPicturesLQ.java:90-94`). The set folder is the **Forge Code2 alias**, not the
Scryfall code (`ImageUtil.java:147`, `getCode2ByCode(edition)`).

Why to skip it:
- Keyed by **display name**, which is exactly the key we established is ambiguous (§3.2) and
  layout-dependent (§3.4) — `FireIce` with no separator, `artIndex` suffix rules that depend on
  how many prints Forge knows about.
- Set folder uses a Forge-internal alias, not `ScryfallCode`.
- It's empty here, so there's nothing to inherit anyway.
- Size is whatever Forge chose (`normal` or `art_crop` only — `ImageUtil.java:233`), no `png`, no WEBP.

**Recommendation: build our own image cache keyed by Scryfall id (§4.5), and read
`~/.cache/forge/cdn_uuid/*.json.gz` only as an optional warm start for the id map.** Note that
Forge also tries its own mirror first for non-art-crop images —
`URL_PIC_DOWNLOAD = "https://downloads.cardforge.org/images/cards/"`
(`ForgeConstants.java:345`) — which we have no reason to use.

### 3.7 The `.dck` format — the user's actual deck file

`/home/justin-a/.forge/decks/constructed/Pacho SHIELD.dck` (verified, read in full):

```
[metadata]
Name=Pacho SHIELD (Marvel Super Heroes)
[main]
1 Agent Phil Coulson|MSH
1 Peggy Carter, Secret Agent
1 Agent 13, Sharon Carter|MSH
…
1 Thriving Heath
1 Thriving Isle
7 Plains|MSH
7 Island|MSH
```

Sections are `[metadata]` (`Key=Value`) plus one per `DeckSection`
(`forge-core/src/main/java/forge/deck/DeckSection.java:11-21`): `Main`, `Sideboard`, `Commander`,
`Avatar`, `Planes`, `Schemes`, `Conspiracy`, `Dungeon`, `Attractions`, `Contraptions`. Case
varies in the wild — this file writes `[main]`, `res/cube/*.dck` write `[Main]`; **match
case-insensitively.**

Card lines are `<count> <card request string>`, where the request string is parsed by
`CardDb.CardRequest` (`forge-core/src/main/java/forge/card/CardDb.java:109-190`) with
`NameSetSeparator = '|'` (line 44) and `foilSuffix = "+"` (line 43):

```
Name
Name|SET
Name|SET|artIndex          ← artIndex is an int ≥ 1
Name|SET|[collectorNumber] ← collector number wrapped in square brackets
Name+                      ← foil
```

The bracketed-collector-number form is visible in MSH's own `[scene]` sheet section, e.g.
`1 Captain America, Super-Soldier|MSH|[316]`.

**The set suffix is optional and its absence is meaningful** — the ten cards without `|MSH` in
this file are exactly the ten cards that are not in MSH (§2.5). Forge fell back to
"any set that has this card" for them. Our parser must handle both forms.

---

## 4. Proposed module: `@mtg-table/card-library`

### 4.1 Package layout

```
packages/card-library/
  package.json            # "type": "module", exports "." and "./cli", engines node >=24
  tsconfig.json           # NodeNext, strict, target ES2023
  src/
    index.ts              # public API surface (§4.7)
    types.ts              # CardRecord, CardFace, ImageSize, Legalities, SetRecord
    scryfall/
      client.ts           # fetch wrapper: headers, pacing, 429 + Retry-After backoff
      limiter.ts          # two-bucket pacer, port of ScryfallRateLimiter
      endpoints.ts        # named(), collection(), search(), sets(), bulkData()
    index/
      schema.sql          # cards, card_faces, sets, images, meta + FTS5
      build.ts            # oracle_cards stream + per-set print sync → SQLite
      query.ts            # getByName / getBySetNumber / search / resolveDeckEntry
    images/
      store.ts            # content-addressed disk cache keyed by scryfall id + size
      prefetch.ts         # deck → image set → parallel CDN fetch
    forge/
      edition.ts          # parse res/editions/*.txt (metadata + card sections)
      cardscript.ts       # parse cardsfolder entries incl. ALTERNATE blocks
      deck.ts             # .dck read/write; CardRequest compose/parse
      cdnUuidCache.ts     # optional reader for ~/.cache/forge/cdn_uuid/*.json.gz
    cli.ts                # mtg-cards <command>
  test/
    fixtures/             # committed JSON captures + 3 real .dck / edition excerpts
    *.test.ts             # node:test
```

Runtime deps: **none required.** `fetch`, `node:sqlite`, `node:zlib`, `node:stream`,
`node:test` are all built in (Node v24.20.0 verified on this machine). Dev deps: `typescript`,
`@types/node`. Keeping this dependency-free matters because the whole point of mtg-table is that
it runs locally without ceremony.

### 4.2 Fields we keep

Per the task list plus a few that earned their place. One row per **print**:

| Column | Source | Why |
|---|---|---|
| `id` TEXT PK | `id` | the only true unique key; image cache key |
| `oracle_id` TEXT | `oracle_id` | groups prints; joins to rulings bulk file |
| `name` TEXT | `name` | full Scryfall name, `A // B` for multi-face |
| `set_code` TEXT | `set` | joins to Forge `ScryfallCode` |
| `collector_number` TEXT | `collector_number` | **string**, never int (`287`, `4b`, `2w`, `F12`) |
| `rarity` TEXT | `rarity` | deck UI |
| `mana_cost` TEXT | `mana_cost` | `""` and absent are different values |
| `cmc` REAL | `cmc` | |
| `type_line` TEXT | `type_line` | |
| `oracle_text` TEXT | `oracle_text` | **render this, not Forge's `Oracle:`** |
| `colors` TEXT JSON | `colors` | null on multi-face — see `card_faces` |
| `color_identity` TEXT JSON | `color_identity` | |
| `power`, `toughness` TEXT | as-is | strings: `*`, `1+*`, `∞` exist |
| `keywords` TEXT JSON | `keywords` | |
| `layout` TEXT | `layout` | drives the face/image rule (§2.3) |
| `image_uris` TEXT JSON | `image_uris` | nullable — absent on transform |
| `image_status` TEXT | `image_status` | skip/retry `missing` + `placeholder` |
| `legalities` TEXT JSON | `legalities` | |
| `artist` TEXT | `artist` | **required in UI when showing `art_crop`** (§1.8) |
| `frame_effects` TEXT JSON | `frame_effects` | distinguishes msh #4 from #402 |
| `released_at` TEXT | `released_at` | |
| `lang` TEXT | `lang` | `en` only for now |

`card_faces` normalizes to a child table `(card_id, idx, name, mana_cost, type_line, oracle_text,
power, toughness, colors, artist, illustration_id, image_uris)`.

`sets` table: `code`, `name`, `set_type`, `released_at`, `card_count`, `parent_set_code`,
`icon_svg` (the downloaded SVG bytes — the docs say don't hotlink it, §1.7).

`meta` table: `oracle_bulk_updated_at`, `schema_version`, per-set `synced_at`.

### 4.3 How the index gets built — hybrid, and why

**Do not download `default_cards`.** 78 MB compressed / ~650 MB inflated to get 1,319 cards we
care about is absurd for a hobby app on one machine.

1. **Oracle layer** — stream `oracle_cards` (24 MB gz, ~200 MB inflated) once, straight from the
   `jsonl_download_uri` resolved via `/bulk-data`. Never buffer it: pipe
   `Readable.fromWeb(res.body) → createGunzip() → createInterface({crlfDelay: Infinity})` and
   `JSON.parse` per line into a transaction. Gives every card's rules text keyed by `oracle_id`.
   Refresh weekly or on set release (the docs' own guidance).
2. **Print layer** — for each set we actually reference, page
   `/cards/search?q=e:<code>&unique=prints&include_extras=true&include_variations=true&order=set`
   at 500 ms. `msh` = 3 pages, `msc` = 5 pages, ~4 s total. This is what supplies
   `collector_number`, `image_uris` and per-print `frame_effects` — the things `oracle_cards`
   cannot (§0.3).
3. **Sets layer** — one `/sets` call (1,049 sets, unpaginated, 10/s bucket).
4. **Opportunistic** — if `~/.cache/forge/cdn_uuid/<set>.json.gz` exists, read it first and skip
   step 2 for that set.

Which sets to sync is derived automatically: parse every `.dck` under `~/.forge/decks/` and every
`|SET` suffix, plus the sets any unqualified name resolves into. For this user that's
`{msh, msc}` — both, from one deck.

### 4.4 Storage: `node:sqlite`, verified working

Confirmed on this machine (Node v24.20.0):

```
$ node -e "const {DatabaseSync}=require('node:sqlite'); …"
node:sqlite OK -> [Object: null prototype] { a: 'ok' }
FTS5 available
```

So: `db/cards.sqlite` with a real FTS5 virtual table over `name`, `type_line`, `oracle_text` for
`search()`. No `better-sqlite3`, no `node-gyp`, no prebuilt-binary roulette. A JSON index would
mean loading the whole oracle set into memory on every process start; SQLite with an index on
`(set_code, collector_number)` and one on `lower(name)` answers a lookup in microseconds and
survives a front-end restart. **Recommend SQLite over JSON**, with a `--json` escape hatch on the
build CLI for anyone who wants to eyeball the data.

### 4.5 Image cache on disk

```
cache/images/{size}/{id[0]}{id[1]}/{id}[.back].{ext}
e.g. cache/images/normal/13/1383e587-df58-4b45-9067-b9399e90b9ed.jpg
     cache/images/normal/4e/4e1a…-….back.jpg
```

Mirroring Scryfall's own two-character fan-out keeps directories small and makes the mapping from
a CDN URL to a local path a pure string transform. Keyed by **Scryfall id + size + side** —
immutable, unambiguous, and layout-independent, which is exactly what Forge's name-keyed scheme
is not (§3.6).

Rules:
- Fetch from `cards.scryfall.io` directly (no rate limit), concurrency ~8, never through
  `api.scryfall.com`.
- Strip the `?<timestamp>` query when storing; keep `image_updated_at` in the DB and re-fetch when
  it advances.
- Skip cards whose `image_status` is `missing` or `placeholder`; record a dated miss and retry
  after 24 h (Forge's `MISS_RETRY_AFTER`, `CdnUuidCache.java:37`).
- Write to `<path>.tmp` then `rename()` so a killed process never leaves a truncated JPEG.
- Serve from our own HTTP origin. Never hotlink per page view (§1.8).
- Default sizes: `normal` for the battlefield, `small` for list/deck views. `art_crop` only behind
  a flag, and only with the artist credit rendered.

Budget: 28-card deck ≈ 2 MB; `msh` + `msc` complete at `normal` ≈ 100 MB.

### 4.6 Name/print resolution — the fallback chain

Resolving one deck entry `{count, name, setCode?, artIndex?, collectorNumber?, foil?}`:

1. `setCode` + `collectorNumber` → exact row. Done.
2. `setCode` + `name` → rows in that set. If exactly one, done. If several (Plains ×6 in MSH),
   pick by `artIndex` over rows ordered by `collector_number`, else the lowest collector number
   in the `[cards]`-equivalent (non-variant `frame_effects`).
3. `setCode` + `name` → **nothing** (the Peggy case). Widen to the parent/child set family:
   `msh → {msh, msc}` via `parent_set_code`. Then to any set, newest print first.
4. Name not found verbatim → try as a front-face name (`card_faces[0].name`), then as `A // B`
   (§3.4).
5. Still nothing → `/cards/named?fuzzy=`, one call, and **surface the result as a suggestion for
   the user to confirm** rather than silently substituting. Distinguish `type: "ambiguous"` from
   a plain miss (§1.3).

Batch the network side through `POST /cards/collection` — 75 identifiers per request means the
entire 28-card deck is one call, and a 500-card collection is 7 calls / 3.5 s. Always match
results back by identifier content, never by array position (§1.4).

### 4.7 Typed API

```ts
export type ImageSize =
  | 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop'   // JPG/PNG
  | 'thumb' | 'grid'   | 'display' | 'crop' | 'art';                    // WEBP

export interface CardLibrary {
  getByName(name: string, opts?: { set?: string; fuzzy?: boolean }): Promise<CardRecord | null>;
  getBySetNumber(set: string, collectorNumber: string): Promise<CardRecord | null>;
  getById(scryfallId: string): Promise<CardRecord | null>;
  search(query: string, opts?: { limit?: number; set?: string }): Promise<CardRecord[]>;
  imagePath(card: CardRecord, size?: ImageSize, face?: 'front' | 'back'): Promise<string | null>;
  imageUrl(card: CardRecord, size?: ImageSize, face?: 'front' | 'back'): string | null;
  resolveDeck(deck: ParsedDeck): Promise<ResolvedDeck>;   // applies §4.6
}
```

- `search()` hits local FTS5 — **never** the network. A UI type-ahead must not be able to trip
  Scryfall's 2/s limit.
- `imagePath()` returns a local path, fetching and caching on miss; `null` when
  `image_status` is `missing`/`placeholder`.
- `imageUrl()` is the pure CDN-URL builder (§2.2), for when the caller wants the remote URL.
- `resolveDeck()` returns `{ resolved: ResolvedCard[]; unresolved: { entry, reason, suggestion? }[] }`
  — never throw on one bad line; a deck list is user input.

### 4.8 CLI

```
mtg-cards build   [--oracle] [--sets msh,msc] [--all-sets] [--from-decks ~/.forge/decks]
mtg-cards sync    <set>...                    # per-set print sync only
mtg-cards prefetch <deck.dck|deck.txt> [--size normal,small] [--concurrency 8]
mtg-cards resolve  <deck.dck|deck.txt> [--json]   # dry run; prints the unresolved table
mtg-cards show     "Agent Phil Coulson" [--set msh]
mtg-cards stats                                   # rows, sets, image bytes, last sync
```

`build --from-decks` is the one-command path for this user: scan `~/.forge/decks`, discover
`{msh, msc}`, pull oracle + both sets, prefetch every image in every deck. Expect roughly
30 seconds and ~200 MB on disk (dominated by the inflated oracle stream, which we don't keep).

### 4.9 Deck list parsing — both formats

**Plain text (`1 Card Name`)**

```ts
const LINE = /^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s*$/;
```

- Optional leading count (default 1), optional `x` (`4x Island`).
- Skip blank lines, `#`/`//` comments, and `SB:` / `Sideboard` section markers — switch section
  on the latter.
- **Do not** split on `//` when it is surrounded by spaces: ` // ` is a card-name separator
  (`Fire // Ice`), whereas `//` at line start is a comment. Forge's `DeckRecognizer` has the same
  hazard and handles single-vs-double slash explicitly
  (`forge-core/src/main/java/forge/deck/DeckRecognizer.java:407-408`: `SEARCH_SINGLE_SLASH`
  and `DOUBLE_SLASH`).

**Forge `.dck`**

```ts
type DeckEntry = {
  count: number; name: string;
  set?: string; artIndex?: number; collectorNumber?: string; foil?: boolean;
};
```

Parse: split into `[section]` blocks (case-insensitive); `[metadata]` is `Key=Value`; every other
block is `<count> <request>`. Split the request on `|` (`CardDb.NameSetSeparator`,
`CardDb.java:44`):

- 1 part → name only.
- 2 parts → `name|SET`.
- 3 parts → third is `[123]` (bracketed collector number) or an integer `artIndex`.
- Trailing `+` on the name → foil (`CardDb.foilSuffix`, `CardDb.java:43`); strip before matching.

Round-tripping the user's deck through parse → resolve → write should reproduce the file
byte-for-byte except that we can now *add* the missing `|MSC` suffixes, which makes the deck
unambiguous for both Forge and us. That's a nice first user-visible win: **`mtg-cards resolve
--write` turns `1 Peggy Carter, Secret Agent` into `1 Peggy Carter, Secret Agent|MSC`.**

### 4.10 Tests (`node:test`, no framework)

Unit, on committed fixtures — no network in CI:

- `forge/edition.ts` — run `CARD_PATTERN`'s equivalent over real MSH lines: `4 R Agent Phil
  Coulson @Marc Aspinall` → `{cn:'4', rarity:'R', name:'Agent Phil Coulson', artist:'Marc
  Aspinall'}`; `402 R Agent Phil Coulson @Marc Aspinall` from `[extended art]`; a line with no
  collector number; a line with no artist; `${…}` extra params.
- `forge/cardscript.ts` — Peggy (T:/SVar:), Coulson (K:/A:/DeckHas:/DeckHints:), Helicarrier
  (two `K:` lines, one parameterized `K:Crew:6`), `fire_ice.txt` and
  `delver_of_secrets_insectile_aberration.txt` for the `ALTERNATE` split, `Colors:` and
  `ManaCost:no cost` on a back face.
- `forge/deck.ts` — the real `Pacho SHIELD.dck`: 28 entries, 40 cards total, ten without a set
  suffix; `[main]` vs `[Main]`; `Name|SET|3`; `Name|SET|[316]`; `Name+`.
- `images/store.ts` — path derivation for front/back/sizes; `.tmp`-then-rename; a truncated
  download does not leave a readable file.
- `scryfall/limiter.ts` — with a fake clock: two `/cards/search` calls ≥ 500 ms apart; two `/sets`
  calls ≥ 100 ms apart; a 429 with `Retry-After: 5` blocks API calls for 5 s but leaves
  `cards.scryfall.io` untouched.
- `index/query.ts` — the §4.6 chain against a seeded DB: `Plains|MSH` picks a deterministic print
  among six; `Peggy Carter, Secret Agent` with `set: 'msh'` falls through to `msc`;
  `Delver of Secrets` matches `Delver of Secrets // Insectile Aberration`; `Fire // Ice` matches
  directly.
- Image-URI selection — table-driven over the three verified layouts (§2.3): transform → face
  images; split and adventure → top-level.

One opt-in live test (`MTG_TABLE_LIVE=1`) that re-verifies the assumptions most likely to rot:
`/bulk-data` still exposes `jsonl_download_uri`; `/sets/msh` is 200; `image_uris` still contains
all eleven keys; `POST /cards/collection` still caps at 75.

---

## 5. Open risks

- **Scryfall changed its bulk format once already** (array → JSONL, `download_uri` →
  `jsonl_download_uri`). Pin the live test above so we find out from a red test, not a
  broken build.
- **`/cards/manifest`** (10/min) is new and undocumented in the pages I read beyond a passing
  mention. It may be a cheaper incremental-refresh path than re-streaming `oracle_cards`.
  Unverified.
- **`image_updated_at`** appears in bulk rows; I assume it corresponds to the `?…` cache-buster on
  CDN URLs but did not confirm it.
- **Forge's `Code2` alias** (`getCode2ByCode`, used for picture folders) is a third set-code
  namespace alongside `Code` and `ScryfallCode`. We only need `ScryfallCode`, but if we ever read
  Forge's `pics/cards/` we'd have to resolve it.
- **MSH art variants**: the deck says `Plains|MSH` with no art index, so Forge itself is picking
  arbitrarily among six. Whatever we pick will sometimes differ from what Forge's engine reports.
  Since the engine is the source of truth for gameplay and we only choose the picture, a mismatch
  is cosmetic — but if we ever show "the card Forge thinks is in play", we need Forge to tell us
  the collector number, not just the name.
