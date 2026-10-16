## D444 — Custom cubes reach the engine: the draft room serves its whole cube on `GET /room/<id>/cube`, and `POST /watch` takes a `my-<slug>` cube with its document in the body

*Branch `pc/custom-cubes`, stacked on `pc/review-followups` (#148) and `pc/watch-choices` (#149).
The cloud's note of 2026-10-16 (pc-jobs `README.md`, "ForgeCoach #174 (Make your own cube) is
merging; two engine changes for custom cubes, please"). Amends **D400** (the room's routes) and
**D440**/**D443** (`POST /watch`). `tools/draft-room.mjs`, `tools/watch-runner.mjs`,
`tools/coach-helper.mjs`, `tools/cubelab/watch.ts`, `tools/draft-room-selftest.mjs`,
`tools/watch-runner-selftest.mjs`, `web/test/cubelab-watch.test.ts`, `docs/draft-room.md`,
`docs/watch-bots.md`, `docs/security/endpoints.md`.*

**2026-10-16**

**Context.** ForgeCoach's cube builder saves cubes of the user's own, id `my-<slug>`, kept in that
browser. Two engine-side places assumed every cube was one both ends already had:

1. The draft room: the owner's `POST /room` sends the card list, but the friend's browser has no
   copy of a custom cube, so it sees only the cards dealt so far and ForgeCoach skips its hash
   check and its end-of-draft replay.
2. `POST /watch` takes only a cube id under mtg-table's `cubes/`.

**Decision 1: `GET /room/<id>/cube`, not a field in the state.** The cloud offered both. The
room's state is not fetched once: it is pushed on the event stream after every join, pick,
deck, consent, review change and every change of the other seat's `online` flag, and it is the
answer to every `POST`. A 180- to 2,000-name list on each of those is about 4–60 KB repeated
dozens of times a draft, for a list that never changes. So the list is its own route,
`→ 200 {ok, room, id, title, hash, size, cards}`, fetched once: `cards` is the owner's `POST`
order with duplicates dropped (the first kept), exactly the names the existing `cube.hash` is the
SHA-256 of (`'\n'`-joined, as `cubeHash` in both repositories); `id`, `title`, `hash` and `size`
are the state's `cube`. Behind the seat's `X-Room-Token` and the room listener's Origin rule like
every room route, the same answer to both seats, GET only. The room keeps the list
(`cubeCards`) in memory and in `rooms.json`; a room written before this has none and answers
`404 {code: "cube"}` rather than a guess.

*Hidden information.* The list in document order says nothing about the deal: the shuffle is the
room's `seed`, which stays hidden until the draft is over. A friend who has a shipped cube has
had this list all along; this gives a custom cube's friend the same, no more.

**Decision 2: `cubeDoc` beside `cube: "my-<slug>"`.** `validateWatch` takes
`cubeDoc: {title, markdown}` (added to its fields) and then skips the `cubes/` listing check —
only then, and only for an id matching `^my-[a-z0-9-]{1,60}$`; a `my-` id without it, or a
`cubeDoc` beside a shipped cube's id, is a 400, so a body can never stand in for a file in
`cubes/`. The markdown is read with the cube lab's own parser (`tools/cubelab/cube.ts`, the one
the watch drafts from, imported by the helper through Node's type stripping): fewer than 9
different cards (a grid needs nine) is a 400 carrying the parser's warnings (for prose,
`no "## The list" section with "### Section (N)" headings found`); the draft room's limits
hold (2,000 names, 150 characters each); the title is one line of at most 80 characters;
the markdown at most 256 KB in UTF-8 (413), and the helper's body cap rises from 4 KB to 600 KB
for it. The runner writes it to `var/spectate/watch-<cube>-<seed>/cube.md` before the 202, its
first `# ` heading set to the title (so `match.json` and `draft.json`, which read the title from
the document, name the cube as the caller does; a document whose heading is already the title is
byte for byte the caller's), and passes that fixed path to `tools/cubelab.sh watch`, which
already takes any cube path; `watch.ts` keeps a `cube.md` in its folder when it is the cube file
and treats one as foreign otherwise. Only the fixed path reaches the argv — never the title or
the markdown. With no `.ratings.tsv` beside it, `defaultRatings` is null and the lab drafts with
Forge's ranks; there is no meta. `/health` says `"watchCustom": 1`.

**Rejected.** (a) The list in the room state — the waste above. (b) A route that serves the
list only to the friend's seat — the owner has it, and two answers would be two shapes to test.
(c) Writing a custom cube under `cubes/` — that folder is the committed, curated set the lab's
history is keyed by; a caller's cube is per-watch data and lives in the watch's own folder,
pruned with it. (d) A `--title` flag for `watch.ts` — request text in an argv, when setting the
document's own heading does the same with no new flag. (e) Validating with ForgeCoach's parser —
it is not in this repository; the lab's reads the builder's `cubeMarkdown` output and is the one
whose reading decides what is drafted.

**Evidence.** `tools/draft-room-selftest.mjs` (the friend's and the owner's token get the list,
equal to the owner's POST order de-duplicated, its hash the SHA-256 and `POST /room`'s; no or a
wrong token 403, a foreign Origin 403, POST 405; the state still without the list; the list
survives a restart; a pre-D444 room 404 `cube`). `tools/watch-runner-selftest.mjs` (a valid
`cubeDoc` runs with the fake watch, `cube.md` on disk before the 202 and its path the argv's
cube; oversized markdown 413 and a body past 600 KB 413; bad slugs 400; unreadable markdown 400
in the parser's words, no folder made; `watchCustom: 1`). `web/test/cubelab-watch.test.ts` (a
watch over its own folder's `cube.md` keeps it, drafts from it with no ratings, names it in
`match.json`). One real-engine smoke, 2026-10-16, through `createWatchRunner` with the real
`tools/cubelab.sh watch` (load average 13–16, the lab's J133 running beside it):
`cubes/fair-fight-cube-180.md` posted as `cubeDoc` (title "Fair Fight (my copy)") under
`my-fair-fight-smoke`, seed 444, best of 1, pace 0 — 202 with `cube.md` written, done in 17 s:
180 cards read, 18 grids and 36 picks, two 40-card lab decks (WU, UR+b), the lab's `run.json`
`ratingsFile: null`, the game won by A in 29 turns, `redaction: "pass"`, and the game route served
its whole 4,186,430-byte log after the served-frames check.

**2026-10-16, the #150 review (low).** A name the engine does not know was drafted without, and
said only in the lab's log. `POST /watch` with a `cubeDoc` now checks the document's names before
the `202` against the engine's own card names — every `Name:` line (each face) of the pinned
engine's `cardsfolder.zip`, read through `tools/forge-scripts.ts` (`forgeCardNames`, a hand-walked
zip and `node:zlib`, no engine boot): about 0.3 s once per helper process (35,495 names for
2.0.14's 33,587 scripts), then about a millisecond for a 180-card cube; any case, accents and
ligatures folded, a split card as `A // B` or by its front face — and writes the ones it lacks
into the first `match.json` as `unknownCards` (`null` where the checkout has no engine resources;
the watch still starts). `watch.ts` carries the list over its first write and, once the draft has
run, replaces it with `run.json`'s `missing` (the engine's own lookup) for every watch. *Rejected:*
`cubelab.sh check`, which boots Forge (seconds, a JVM a request); the card library's
`var/cards/cards.sqlite`, which is Scryfall's and knows the cards Forge 2.0.14 lacks (Reality
Fracture's among them); Forge's edition files, which list printings, not scripts.

*Smoke, 2026-10-16 (load average about 20, the lab's J134 beside it):* one watch through
`createWatchRunner` and the real `tools/cubelab.sh watch` — Fair Fight posted as `my-smoke-unknown`
with two planted names, seed 445, best of 1, pace 0, game 1 polled every 250 ms from the start.
`202` in 376 ms (the name index built inside it), `unknownCards` the two planted names from the
first `match.json` and still the two once the engine's `run.json` replaced it; 77 polls, no `500`
(the #148 fix: `hello_ok` at 11.7 s, nothing served until the first state, the first 12,061 bytes at
17.0 s), the whole 2,186,747-byte log served, A won in 16 turns, `redaction: "pass"`.

