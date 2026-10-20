## D455 — Real drafts' decks: one ledger of the decks people built after drafting a cube, read back as colour counts only

*Branch `pc/draft-deck-ledger`. ForgeCoach's half is branch `pc/draft-colour-shares` there
(`src/cube/draftShares.ts`, the cube page's *Drafted colours (real drafts)*). D452 is the
cake block's and D453–D454 are taken, so this is D455.*

**2026-10-19**

**Context.** Justin, 2026-10-19, the first piece of a "cube colour balance" programme: a cube's
page should show the colour shares of REAL drafts of that cube — what share of the decks people
actually built contain each colour, each pair and each triple, four and five colours as "4+", with
the count behind each number and an interval. It is the human ground truth the lab's bot-drafted
shares will be compared against.

Nothing on this machine kept that. Measured on 2026-10-19:

- a draft room keeps a seat's handed-in deck in `var/draft-room/rooms.json` only while the room
  lives (24 h after its last pick, D400), and the one room there (an Omega draft of 2026-10-17)
  finished with no deck handed in;
- the match launcher's `var/match/<id>/` folders hold the decks of the last **five** matches only
  (`KEEP_MATCH_DIRS`): today a friend draft of Omega (Justin's and Evan's decks, both seats
  consenting, played twice) and two Draft vs Bot drafts (one Synergy, one Omega, played twice).
  None of them names its cube, and the next five matches remove them;
- ForgeCoach keeps the draft in progress and the last finished one in `localStorage`
  (`forgecoach.draft.v1`), overwritten by the next draft;
- the session headers of `var/games/friend-…` name each seat's deck by path into `var/match/`,
  which is pruned as above; the automatic review keeps nothing about decks.

**Decision.**

1. **One ledger**: `var/draft-decks/decks.jsonl` (mode 600, folder 700, real path under `var/`),
   one line per deck, `{v, at, source, key, cubeId, format, main}`, appended; a later line with
   the same key replaces it (a deck handed in again between games is the same draft's final
   deck, sideboarded). **A withdrawal deletes** (#169's review): every line of the seat's keys is
   removed by rewriting the file (a temp file, then rename), so no card of an opted-out seat's
   deck stays on disk; it is never refused by the 32 MB cap, which is for new decks only; a
   rewrite that fails throws and is logged as an ERROR, and the process stops serving those keys
   either way. The main deck only; no player name, no
   deck name, no token. `tools/draft-decks.mjs` is the store, the reader and the contract; the lab
   can read the file as it is.
2. **Where lines come from.**
   - **A draft room seat, only with that seat's own consent** (D407's `record`, as it stands when
     the deck goes in). `draft-room.mjs` calls `onDeck` after a seat hands in a deck and after a
     seat changes its consent: a consenting seat's deck is written, a seat that is not consenting
     writes nothing, and a seat that opts out after its deck was written has its lines deleted —
     its `room:<roomId>:<seat>` key and the `table:<matchId>:<seat>` key of each of the room's games.
     The consent D407 asks for ("record our games") covers keeping what the seat played; a seat
     that said no is not counted at all.
   - **A draft against the bot**: ForgeCoach's `POST /draft-deck` on the coach helper's own door
     (the owner's page, the gate of `/match`), sent when the player starts the match with the deck
     they built (`{cubeId, draftId, format, main}`, keyed `solo:<draftId>`, so a rebuilt deck
     replaces the first).
   - **`node tools/draft-decks.mjs import <var/match/m…> --cube <id>`** for a match recorded
     before the ledger: a table game's `seat<N>.dck` only where its `seats.json` says that seat
     consented, a Draft vs Bot match's `you.dck` (never `ai.dck`); every nonbasic must be in
     `cubes/<id>.md` when that file exists. A table seat's line is keyed `table:<matchId>:<seat>`
     (so its room's seat can still withdraw it while the room lives) and dated by the match id; the
     same deck from game 2 of the match is not added twice. Nothing runs it on its own: the owner
     decides what goes in. `withdraw <key>` deletes a deck's lines by hand (a friend who asks after
     their room expired; `list --keys` prints the keys).
3. **A friend's list leaves the ledger only as its colour makeup.** `GET /draft-decks?cube=<id>`
   (the coach helper's door, D386: loopback, the Origin list, never a tunnel) answers each deck as
   `{source, day, format, spells: {W,U,B,R,G}, colourless, lands, unread}` — the count of its
   nonland cards of each colour — never a card name, a key, a room id or a time of day, sorted by
   day and makeup. The cube page counts; it cannot show a list it never receives. The owner's own
   decks get the same treatment, so the route has one shape.
4. **A card's colours are the lab census's** (D447, `deckcensus.ts` `coloursOf`): its printed
   colours (a script's `Colors:`) and every colour of its cost's symbols, from Forge's own scripts
   (`tools/forge-scripts.ts`, no engine boot); a split card both halves, any other two-faced card
   its front; a land front is a land. A card with no script is `unread`, and the page says so.
   "Main colours" (3+ spells, the census's `coloursWith3`) is applied by the reader, ForgeCoach's
   `draftShares.ts`, so the wire carries counts and the rule lives in one place.

**Rejected.**

- *Reading `var/match/` or `rooms.json` at request time.* Both are pruned by design, neither names
  the cube, and `var/match/` holds an opted-out seat's deck too.
- *Keeping solo drafts in ForgeCoach's `localStorage`.* The lab could not read them, and a second
  browser or a cleared site would lose them.
- *Sending the lists to the page and counting there.* The friend's list would reach a browser for
  a count; the colour makeup is all the page needs.
- *Counting a seat that opted out, as an anonymous colour profile.* It said no to being recorded.

**Measured.** `tools/draft-decks-selftest.mjs` (gate 12f, CI): 109 checks — the census's colour rule
on hand-written scripts and on 2.0.14's own, a deck's makeup, the fold, the body checks, the 600
file and the full ledger, GET carrying no name, key or time; a room seat's deck in only with its
consent, deleted from the file on an opt-out (past a full ledger, and loudly when the rewrite fails), back on an opt-in, a throwing ledger never stopping a deck; both routes
behind the helper's door; `import` taking only consenting seats and your own deck, once. On this
machine's five match folders `import` would give Omega three decks (Justin's and Evan's from the
friend draft of 2026-10-17, Justin's Rakdos against the bot) and Synergy none (its 2026-10-10 deck
holds a card no longer in `cubes/synergy-cube-180.md`).
