# tools/CLAUDE.md — the gate, the checkers, the card library and the personal tier

These load when you work under `tools/`, on top of the root `CLAUDE.md`, whose
*The gate, in one paragraph* is the short version of the first section here.
`tools/README.md` is every script in this directory in one table.

## The gate, step by step

`check-forge.sh` is the gate for everything below it. Run it first when something
behaves strangely. **`check-all.sh` is what you run before saying you are done**,
and **since the gate-speed lane it runs its steps CONCURRENTLY** (**D129–D135**).
Every step is a JOB — a function run in a subshell of its own, whose output goes
to `var/check-all/<run>/<job>.log` — and a scheduler keeps **`GATE_JOBS`** of them
running: default `min(4, nproc/4)`, so four here; **`GATE_JOBS=1` is the serial
gate**, the steps below one after another in the old order, each job's log
streamed to the console as it runs — the old log's lines, but **not** its bytes:
every job runs under `2>&1 | tee`, so `die`'s stderr arrives on stdout (PLAN.md's
gate-speed follow-up 5), 10g prints three new `was played` lines (D134), and the
timing table follows `check-all OK`. A job starts once every job it depends on
has passed, and the dependencies ARE the ordering rules: check-forge, lint (with 2b, its self-test) and build first and
alone; step 6 after step 5's recording; 6b's comparison after its two
recordings; 9c's report after its fourteen rows (`tools/ten-games.sh --run-row
N`, each row a job of the gate's own pool with all its assertions;
`ten-games.sh --jobs N` is the same thing standalone); 9c's rows and 9e after
Smoke, so an engine that cannot boot fails once; `node --test` after the six
step-10 jobs whose logs `MTGTABLE_WS_LOGS` names, while `npm run build` and `vitest run` start at once (D131); step 11's fresh half
and 12d after every recorder. Step 10's seven servers listen on **`WSPORT+0` ..
`WSPORT+6`** (all on `WSPORT` serially). **Every job boots Forge in a home of its
own** (D129, amended at merge): `var/check-all/<run>/<job>/`, built as the job
starts by `tools/config.sh`'s `forge_home_make` — a `forge-home/` whose `res/` is
the jar's, a `userDir` and `cacheDir` of its own, D14's overlay copied in, and a
`config.json` that is `config.json` with `forgeHome` pointed there and
`repoRoot` naming the checkout, so `Config.root()` (`var/games/`, `--deck
decks/…`, the header's deck `path`) resolves exactly as before; the job exports
it as `MTG_TABLE_CONFIG`. `tools/ten-games.sh` gives each row one of its own
(`var/ten-games/home-<seed>/`), serially and under `--jobs` alike; 12c keeps its
scratch home. Before it every JVM of a parallel gate shared `var/forge/`, whose
`achievements/constructed.xml` a JVM that exits mid-save leaves EMPTY for the next
reader (a caught `SAXParseException`; `docs/evidence/gate-speed.md` §3.2). Every
home starts with no preferences file, and a job fails if any JVM of it saved one
— so every JVM in the gate is under the preferences check, not only 9c's rows and
9e. The console prints a line as each job starts and ends, then the **TIMING TABLE** — every job's start and end in seconds
since the gate began, its seconds, its status and the 1-minute load average at
its end, and the run's wall time against the sum of its jobs' seconds —
also written to `var/check-all/<run>/timing.txt`; `var/check-all/<run>/gate.log`
is every job's log in the serial order, i.e. the log `GATE_JOBS=1` prints.
**Only the last `GATE_KEEP_RUNS` runs are kept** (default **20**, this one
included; polish-1, closing gate speed's follow-up 4): a run is ~4 MB since
every job keeps its Forge home in it, so the gate prunes the oldest as it
starts and prints `keeping the last 20 runs … (N there, K pruned)`. Only
directories named like a run id (`YYYYmmdd-HHMMSS-<pid>`, so name order is start
order) are removed, never the running one; anything else under `var/check-all/`
is left alone. A
failure starts no new job, TERMs every running job's whole process tree (found
through `ps --ppid`: only what this gate started), prints the failed job's log
tail, the table and a `check-all FAILED at step N` line — even for a job that
died of `set -e` without one, so D113's silent 141 cannot recur (D130) — and
exits 1. **Nothing is retried** (**D135**): a step that fails under the gate's
own load and never serially is a finding, reported with its log. What it runs, in the serial order,
is **thirteen numbered steps** (plus **twelve** lettered sub-steps — **2b**, **6b**,
9b, 9c, **9d**, **9e**, 10f, **10g**, **12b**, **12c**, **12d** and **12e**; 9d and 10g
added by **M6**, 9e by **match setup**, 12b and 12c by the 2026-09-27 hardening
pass, 6b by **spectating**, 12d by **the narrator**, 2b and 12e by **the guards
lane** — so the numbering and every
reference to "10d" stayed correct when they were added): lint
→ **2b**, the lint's self-test (`tools/lint-bridge-selftest.sh`, **D180**: every
rule the lint declares fires on a planted snippet, and a rule with no case
fails; about a second) → build → `Smoke` → a fresh `RecordMatch` into `var/` → **step 6, the value-level
drift check** (`tools/wire-drift.mjs` against `fixtures/games/g1.jsonl`: the same
non-state frames, event stream, phase walk and final board, every board cut at a
turn, phase or outcome event (`priority` and mid-game `combat` among it), and the
stack wherever both recordings caught the same items on it, flush boundaries
aside — **D113**, because under load the same game cuts its event stream into
different frames; the ids inside a `stats` event compared as a set in both modes,
**D121**, because their order follows HotSpot identity hashes;
`tools/wire-drift-selftest.mjs` runs first and must still reject thirteen drifts
and accept a reordered `stats` event; `STRICT_G1=1` is the old byte-for-byte
diff) → **6b** (**spectating**, amendment **M47**, ~20 s): `./scripts/spectate.sh
--no-serve` records seed 5 of your deck against the villain deck PACED from seat 0
and at engine speed from seat 1 — `paceMs`, both handshakes' `match` with each
seat's own `yourProfile`, the recorder's dwells, redaction — and
`tools/same-game.mjs` must call the two the same game and a one-life-point mutant
not
→ three fresh `MtgTable` sessions (`--transport null`, the scripted
`--transport console` smoke, and `--transport auto --seed 11`) → **9b**, the
ADVISORY fixture-drift check (`tools/fixture-multiset-diff.mjs`: re-record seed 42
and compare it against `fixtures/games/human-auto-42.jsonl` as a multiset with
`seq` stripped, because the fixtures are stable in content and not in frame order;
never an exit code unless you pass `DRIFT_FATAL=1`, skipped by `SKIP_DRIFT=1`) →
**9c**, **M5's exit criterion** (`tools/ten-games.sh`: ten consecutive
`--transport auto` games at seeds 1..10 alternating `decks/pacho-shield.dck` and
the five probe decks, eight assertions each plus **M6's 6b**, which requires
every seat recording of the run to carry the comfort block — see that file's own
header — and the single most expensive thing in the gate; `SKIP_TEN=1` skips it,
and skipping it means the exit criterion did NOT run; **match setup added rows
11–14**, your deck against `decks/doom-legion.dck` — named once, in
`tools/villain-deck.sh`, which 9e sources too — under each of the four AI
profiles, each asserting the profile's values read back from the in-game AI and
no Forge preferences file touched; they prove the profile reaches the engine, not
that it changes the play, `docs/evidence/match-setup.md` §P) → **9d** (**M6**), the
**`sideboard` ask**, which needs a session that survives `over`
(`--probe --games 2` on `decks/sideboard-probe.dck`: the ask fires between the
two games and is answered with a legal, main-sized, non-identity deck) → **9e**
(**match setup**, amendment **M44**), one game of your deck against the villain
deck under `--ai-profile Reckless` — `over`, zero UNIMPL, redaction,
`hello_ok.match` equal field for field to one rebuilt from the two `.dck` files,
the profile's values read back from the in-game AI, **no Forge preferences file
touched** (`~/.forge/preferences/`, `var/forge/preferences/` and the job's own
home's fingerprinted before and after), and `--ai-profile NoSuchProfile` refused before
`FModel.initialize`; it runs even under `SKIP_TEN=1` →
**seven fresh `--transport ws` servers** — the `ws-smoke` doorstep test (10a), its
`--disconnect-mid-ask` variant (10b), a whole game through
`tools/ws-auto-play.mjs` (10c), that same client with `--refuse-first-ask` (10d),
which drops the socket on the first `ask` FRAME and is the only thing in the repo
that exercises `ReplyPool.cancelAll()` with a game thread actually parked (the
gate asserts the server's own `cancelling 1 pending ask(s)` line), and
`ws-smoke --concede-before-input` (**10e**), which concedes from inside the
`hello_ok` handler before the engine has asked this seat anything and is the only
thing that reaches amendment **M11**'s `over`-with-no-`gameOver`-`state` branch,
asserting `OVER WITHOUT A gameOver STATE` and `CONCEDE BEFORE START` on the
server's stderr and deliberately NOT running `check-redaction.mjs`, because a
four-line session has no `state` frame and the checker calls that a failure (see
PLAN's M4 follow-up 8), and **10f** (M5), `ws-auto-play --probe` at seed 42,
which is the only thing anywhere that sends the `clickAbility` **act** from a
client rather than answering an `ability_menu` by index (asserted `>= 1`, and
none of them unresolvable), and **10g** (**M6**), the milestone's own command:
**three games back to back over one socket** (`--games 3 --comfort`), which is
the only step where a session outlives an `over`, exercises both
`HostedMatch.continueMatch()` and `restartMatch()`, and asserts M6's five typed
acts by the **effect** each had on the next `state` (`passPriority` is a count
and the step says so). **It plays `decks/yield-probe.dck`** — 22 Thallids, one
mandatory upkeep trigger each — and passes `--require-yield-repeat`, which is
what turned auto-yield's *behavioural* half from a printed number into an
assertion: the same `yieldKey` comes back to the top of the stack every turn,
and after `yielded:"yes"` the engine must raise **no** `input` carrying
`buttons.ok.enabled` while it is there (`chooseSpellAbilityToPlay` returns null
without raising an `InputPassPriority` at all). Measured at seed 13:
`repeats=4`, `promptsWhileOnTop=0`. **Since D136** 10g also holds the undo window
(`MTGTABLE_HOLD_UNDO_WINDOW_MS=1000`) and passes `--require-late-undo` — the
server's `undo window` line and, since polish-1, the client's `undo(late)=ok`
are each grepped, so dropping either half fails the step: an
`undo` sent on the state a mana payment flushes must draw `notice {title:"Not
now"}`, and `undo`'s effect is proven by a second undo that floats one of the
seat's lands at priority and undoes it while the engine is parked. **Since the 2026-09-27 hardening pass 10g's
server runs with `MTGTABLE_HOLD_GAME_END_MS=2000`** (**D114**, amendment **M45**):
each game's thread is held 2 s after its `over`, so the client's instant
`newGame` always arrives before Forge has finished the game, and the step asserts
the bridge QUEUED it and RELEASED it (`NEW GAME QUEUED` / `NEW GAME RELEASED`),
that no game ended with `OVER WITHOUT A gameOver STATE`, and that every game's
log carries a `gameOver` state — the window that, unheld, ended game 3 at once
once in two runs; `ws-auto-play` itself exits **8** on an `over` with no
`gameOver` state in front of it. Each of the seven is asserted for exactly one `over`,
`over` last, and its log through `check-redaction.mjs` — including the CLIENT
log, which is a different shape on purpose. Then `check-redaction.mjs` over the
committed fixtures (`games/` **and** `synthetic/`) *and* every fresh recording →
`check-redaction-selftest.mjs` → **12b**, `node tools/build-workshop-catalog.ts
--check` (the workshop's generated `catalog.json` is byte for byte what `decks/`,
`fixtures/games/` and `cues.json`'s card names make; it needs no `node_modules`,
so it runs under `SKIP_WEB=1` too) → **12c**, `tools/check-engine-crash.sh`
(**D115**: a card script the 2.0.14 jar cannot build, placed in a SCRATCH Forge
home under `var/crash-probe/` through `MTG_TABLE_CONFIG`, must fail both
`MtgTable --transport null` and `RecordMatch` — exit 1, promptly, `ENGINE
CRASHED` and the cause on stderr, and a frame log that ends in an error `notice`
and a null `over` and never names the card; twenty assertions, about 8 s, and it runs under `SKIP_WEB=1` and `SKIP_TEN=1` too) → **12d**,
`tools/narrate-selftest.mjs` (**D123**: the narrator over every fixture and every
log this run recorded, 6b's two spectate recordings among them, named one by one
rather than globbed out of `var/`, each client log paired with the bridge's log of
the same game; about a second) → **12e**, `node tools/build-deck.ts --check`
(**D183**: every AI deck is byte for byte what its `decks/specs/*.json` builds,
every name re-resolved against the local card index `var/cards/cards.sqlite` —
which only `node tools/card-library/build.ts` makes, so a checkout without it
FAILS 12e with that command, and `SKIP_DECKS=1` skips it and says so; about a
tenth of a second) → `npm run build && npm test`.
`SKIP_TEN=1` skips 9c, about six of the serial gate's fifteen minutes. **Pass
`WSPORT=<n>` if 8643 is busy** — step 10 starts **seven** servers: on `WSPORT`,
one after another, serially; on `WSPORT` .. `WSPORT+6`, at once, in parallel.
**Adding a step is adding a JOB** (D129): a function that prints its own `===`
header and calls `die`, one `job <id> <step> both <function> "<deps>"` line in the
table at the bottom of `tools/check-all.sh`, in the serial order — and then the
three questions the scheduler cannot answer for you. What must pass before it
reads anything (its deps)? Does it write a frame log (add it to `RECORDERS`, so
step 11's fresh half and 12d wait for it — and to 12d's list)? Does it need a
port or a `var/` path another job uses (give it its own: two jobs never share a
game id, a log name or a port)? Its Forge home comes with the job (`job_home`),
so a new JVM step needs nothing for that. A job reads no variable another job sets — a
path more than one job needs is a constant at the top of the file.
**Every JVM step runs under `timeout`** (`GAME_TIMEOUT`, default 300 s,
overridable in the environment): a gate whose failure mode is "hangs until
someone notices" cannot catch the one defect class M2's threading work is most
exposed to.

**CI runs the gate's engine-free half, and only that**
(`.github/workflows/checks.yml`, on every push to `main` and every pull request;
README's *Continuous integration*). Three jobs on `ubuntu-latest`: **`web`**
(`npm ci`, `npm --prefix web run build`, `npm --prefix web test` on Node 24 —
hermetic because `MTGTABLE_WS_LOGS` is unset and `web/public/art.json` is absent,
and every reader of it already falls back to the empty index), **`bridge`**
(`tools/lint-bridge-selftest.sh`, `tools/lint-bridge.sh`, `tools/check-forge.sh`, then `./bridge/build.sh` — javac
and its five self-tests, on Temurin 21's JDK: this machine's Ubuntu JRE happens
to carry `jdk.compiler` and `jdk.jdeps`, and a Temurin JRE image is not built
to) and **`redaction`** (`check-redaction.mjs` over `fixtures/games/` and `fixtures/synthetic/`, the
checker's selftest, 12d's `narrate-selftest.mjs`, step 6's
`wire-drift-selftest.mjs` and 12b's catalog check; not 12e, whose card index only
the network build makes — D183). **It is the one place anything
downloads the engine, and the pin still holds there**: the bridge job fetches
`forge-installer-2.0.14.tar.bz2` (301,832,993 bytes) from Forge's tagged
`forge-2.0.14` release — never `daily-snapshots` (D109, D110) — checks it against
the digest GitHub publishes, extracts **the jar alone**, fails unless its sha256
is `3c0a7c38…8e5dd9`, and hands it to the scripts as `FORGE_JAR` (hard rule 9;
`config.json` untouched). Only the jar is cached, in the Actions cache under a key
naming the asset and both digests — never in git, never as an artifact. `res/` is
not extracted and `make-forge-home.sh` is not run, because none of the five
self-tests boots an engine or reads `res/` (measured: `OverRaceSelfTest` and
`ActGuardSelfTest` pass over an empty Forge home with no profile and write nothing
outside `var/`); **a self-test that starts needing `res/` fails CI first**, and
then the job extracts `res/` too and runs `make-forge-home.sh`, whose `res/` is
derived from the jar's directory. Everything that plays — Smoke, the recordings,
the drift check against them, 6b, 7–9e, step 10's servers, 12c and every check
over what they produce — and `tools/arena-bench.mjs` stay local. **A green CI run
is a subset of a green gate, never a substitute: `check-all.sh` is still what you
run before saying you are done.**

## The redaction checker's flags

**Never pass `--pre-amendment` to `check-redaction.mjs`.** It downgrades a
missing `owner` / `token` / `alt` / `library.cards` to a warning, and those four
absences are exactly what the gate exists to catch. It is there to read a log
recorded before 2026-09-11, and nothing in the repo is one.

**`--client-log` is different and is safe to pass** (amendment M17): it relaxes
the `seq` continuity rule, and nothing else, for a log a *client* wrote
(`tools/ws-auto-play.mjs --log`), where a verbatim re-delivery and a forward gap
are amendment M10 rather than a dropped frame. It is auto-detected from the
header's `recordedBy:"client"`, so you rarely have to type it; every content
assertion is unchanged either way, and a bridge log under `var/games/` keeps the
hard monotonic rule.

**And never pass `--opponent-library-ok`,** which gets the identical treatment:
it downgrades "a seat other than the viewer has full cards in `library.cards`" —
the single largest hidden-information surface in the game — from a failure to a
warning. The shape is legitimately reachable (Opposition Agent, Bribery, Gonti)
and **nothing in the repo passes it**, so the day a recording needs it is the day
someone types it on the command line and says why in the commit message.

## The narrator

**The narrator (D123) tells a frame log as a story, and it is hard rule 8's
third reader.** Its one implementation is `web/src/story/narrate.ts` (**D124**:
pure, erasable TypeScript, no import at all), and `tools/narrate.mjs` is a shell
over it that reads the file (Node 24 imports the `.ts` by type stripping): the
`events` of each `state` say what happened and when, the
snapshots say what each id is, and one function, `faceOf()`, reads a card's face
— a stub yields nothing whatever else is on it, a face-down card with no `alt`
yields "a face-down card". **A name is read from the event's own frame or the one
before it and never remembered**; a zone move names the card from its source in
the frame before, and everything else takes the **latest view** — if this frame
holds the card concealed, it is concealed (protocol invariant 10;
`disjoint.jsonl`'s face-down Ashcloud Phoenix is the case that made it a rule).
`tools/narrate-selftest.mjs` holds that over every fixture and every log the gate
records — ids concealed in every appearance are never named, no card name in
`decks/*.dck` that the log never shows is ever printed, every name is backed by
its two frames — with six negative controls, a client log whose verbatim
re-deliveries (M10) must narrate nothing twice and whose skip rule may drop no
frame it holds (the pair check runs both ways since polish-1: a moment is
excused only when its frame never reached the client — before it connected, in
a gap its story counts, or after it left; 12d pairs each of step 10's
client logs with the bridge's own log of that game), and two golden files under
`fixtures/narrate/`. **A change to the narration is a `--write-golden` and a read
diff, never a hand edit of the goldens.** The same module is the `#story` page's
narrator (D125, `web/CLAUDE.md`'s *The story page*), so a sentence changed for one reader is
changed for both, and the CLI's output did not move by a byte when it moved there
(D124, `docs/evidence/story.md` §1).

## Card library — the conventions D90–D94 added

Six, and the thesis is one sentence: **public card data, a tool beside the game,
and nothing the game depends on.** On the user's request of 2026-09-27 README's
card-library NON-GOAL was lifted *in part* (**D90**): a local index of every card
(`tools/card-library/`) and a browser for it (`#cards`, `web/src/cards/`) exist as
dev-server tools. Report 03 §4 is the spec, `tools/card-library/README.md` the
manual, `docs/evidence/card-library.md` what was measured, and PLAN.md's *The card
library and the card browser* the status and twelve follow-ups. Hard rule 8 is the
engine wire's and does not govern public card data — but the web client's own
conventions all still hold, and the list below is where they bite.

1. **It is a tool, not a package, and the game never reads it** (**D90**,
   **D91**). No `package.json`, no npm dependency: `node:sqlite` with FTS5, `fetch`,
   `node:zlib` and type stripping, run from the repo root (hard rule 9). Everything
   it writes is under the gitignored `var/cards/`; the only Scryfall data in git is
   `fixtures/cards/`, **reduced to the fields the library reads** and regenerated
   by `make-fixture.ts`, never hand-edited (whether it is committed at all is
   PLAN.md question 15). The engine, the bridge, the board and the arena do not
   import it, and the board still draws from `art.json` — a board that needed the
   library would need a dev-only route to render a game.
2. **One door to Scryfall.** `tools/card-library/scryfall.ts`'s `ScryfallClient`
   is the only thing in the library that makes a request: `config.json`'s
   `scryfallUserAgent` plus `Accept: application/json` on every API call, 2 req/s
   on `/cards/search|named|random|collection` and 10 elsewhere, a 429 honoured for
   its `Retry-After`, and a request log every run prints as measured rates. A new
   call goes through it, never through a bare `fetch`. Anything at scale is the
   bulk file; set icons are downloaded, never hotlinked; `query.ts` has **no
   network in it**, so a search never reaches Scryfall. The committed User-Agent
   still carries a placeholder contact (question 16) and the tools say so on every
   run that talks to Scryfall.
3. **A build writes a fresh file** (**D91**): `cards.sqlite.building`, then
   `rename()`, with a `content_sha256` in `meta`. Never edit the index in place and
   never migrate it — a schema change is a rebuild (`build.ts --offline`). Two
   builds from the same data must carry the same digest; that is the idempotence
   check.
4. **The route is dev-only, and it never fetches** (**D92**). `/cards/api/*` and
   `/cards/img/*` are mounted in `vite.config.ts`'s `configureServer` and nowhere
   else — not `vite preview`, not the build (`cards-ui.test.ts` asserts it). An
   image miss is a **404**; the page then hot-links the CDN URL itself, and with
   neither draws a text frame. A route that fetched on a miss would be a Scryfall
   proxy, which is what the terms warn against and what D90 kept out. `devApi.ts`
   is Node-only — no browser module imports it — and loads `query.ts` with a
   runtime `import()`, so a missing or half-built index is a **state**, never a
   crash. **Every filter goes into the SQL before the scan cap**
   (`CardLibrary.search`'s `sets`, `oracleIds`, `colorsAny`): filtering after the
   1,000-hit cap made `creature` over MSH + MSC answer 1 card and `creature` in the
   deck 0, and `cards-api` holds the fix with an injected cap (negative-controlled:
   with the filters taken back out of the SQL, three of its tests fail). A new
   filter goes into the library first, and the page tests `approximate` before
   `total === 0`.
5. **The image cache is keyed by Scryfall id + size + face** (**D93**).
   `store.ts`'s `imagePathFor` is THE path — `var/cards/images/<id>/<size>[.back].<ext>`
   — and throws on anything that is not a UUID; `model.ts`'s `imageSides` is THE
   multi-face rule (top-level `image_uris` first, the faces only when it is
   absent; faces-first is a negative control that fails three tests). Never key
   an image by name. `.part` then `rename()`, never fetched twice. The browser
   shows **whole card images only** (`normal`, never `art_crop`), never cropped,
   stretched or filtered, with `Illus. <artist>` under **every** image, the
   copyright line in the detail, and a credit bar that wraps rather than clips.
6. **`CardView` is the browser's card renderer, and it is not `CardTile`**
   (**D94**). Nothing under `cards/` imports `render/CardTile.tsx` (its importer
   list stays closed at ten), anything from `render/` or `arena/`, or a stylesheet,
   and from `workshop/` only `links.ts` (the detail panel's *View in 3D*, **D102**:
   it imports nothing but the generated `catalog.json`); `Board.tsx`,
   `CardTile.tsx` and `Arena.tsx` never reach into `cards/`; `main.tsx` reaches the
   browser only through `lazy()` — all asserted by `cards-ui.test.ts` (and the
   `links.ts` half by `workshop.test.ts`).
   The browser keeps the client's rules **per surface**: its own keymap table
   (`cards/keys.ts` — `web/src/keys.ts` is the board's and the arena's, and
   `keys.test.ts` would demand its chords in the board's `?` overlay), its rules
   appended to `styles.css`, its logic in pure `.ts` for `node --test`, and its
   components in `hooks-order.test.ts`'s scan. **`#cards` unmounts the mode app**
   rather than hiding it, because a hidden board's `window` keydown listeners would
   press OK or Cancel in a live game from under the browser; the socket is
   page-scoped, a replay resumes at its frame (`replayCursors`), and the back link
   returns to the view you came from — the board, the arena or the workshop.

What stays a no, from D90: a package, a production route, any proxy of Scryfall,
any deck editing (the *copy .dck line* button copies; nothing writes a deck, and
it writes `|SET` only for MSH and MSC, the two sets whose code is checked against
Forge's), and any rules logic — legalities are Scryfall's data, displayed. The real
build needs the network and is **not** in `check-all.sh`; the four suites
(`cards-lib`, `cards-api`, `cards-ui` and the vitest `cards-render`) run
offline inside `npm --prefix web test` over `fixtures/cards/`.

## The personal tier — the conventions D190–D193 added

Five, and the thesis is the user's own sentence: **"this can never ever ever be
sold or published."** The personal tier is `personal/models/<slug>/` — rigged
models of the actual characters that the USER downloaded for their own use —
and it sits beside the CC0 repository tier (**D54**, unchanged) without ever
entering it. `docs/guides/personal-tier.md` is the manual,
`docs/evidence/personal-tier.md` is Doctor Doom run through it, and PLAN.md's
*The personal tier* has the status and phase 2 (the loader). Phase 1 is the
folder, the manifest and the pipeline, `tools/personal/`; **nothing in the game
reads `personal/` yet**. Its half of hard rule 8 is in the root `CLAUDE.md`.

1. **It is never committed, and the ignore rule is anchored** (**D190**).
   `.gitignore` names `/personal/`; an unanchored `personal/` also hides
   `tools/personal/`, the committed pipeline. `web/test/personal-tier.test.ts`
   holds both halves with `git check-ignore --no-index` (without it git never
   calls a tracked file ignored, and the unanchored rule slipped past once the
   pipeline was committed) and fails if git tracks a file under `personal/`.
   Nothing under `web/src/` or `web/public/` reads it, a picture of a personal
   model stays in its folder, and phase 2 serves it from the Vite dev server
   alone (**D92**'s rule) — never `vite preview`, never a build.
2. **Claude never sources a model.** The user downloads, with their own account,
   under a licence they read; the tools read what is on disk, fetch nothing,
   accept nothing and refuse nothing (game-asset name patterns are flagged, not
   refused). No model of a real character, and no picture of one, goes anywhere
   in the repo — the test builds its own fixtures, a box on two bones and a
   figure of boxes.
3. **A tool writes only inside its slug's folder.** Every path goes through
   `tools/personal/lib.mjs`'s `insideSlug`; `prepare.mjs` writes `model.glb` and
   `manifest.json` and nothing else. So does the browser `check.mjs` starts for
   the previews (**D192**): its profile is
   `personal/models/<slug>/.preview-profile/`, made fresh for the run and deleted
   after it, every answer is `no-store`, and its own net log must show no
   connection, byte, DNS query or answer beyond 127.0.0.1 — a profile under
   `var/` once kept a copy of `model.glb` in its cache. **Since D193 the HTTP
   cache and the profile are measured too**: every entry the cache keyed (the
   net log's `SET_KEY` and `ENTRY_IMPL` events) must be for 127.0.0.1, and the
   profile, read before it is deleted, must hold no copy of the model (three
   64-byte cuts of its binary chunk); `AimServerRequestOnStartupEnabled` is off,
   because the omnibox's AI-mode eligibility request keyed a `www.google.com`
   entry even though the resolver refused it. The one write outside the folder
   is the snap Chromium LAUNCHER's, which no flag reaches and any Chromium start
   makes (`tools/arena-bench.mjs` too): it rewrites the 40-byte
   `~/snap/chromium/common/chromium/Crash Reports/settings.dat` and re-links
   `~/snap/chromium/<revision>/.config/ibus/bus` to `~/.config/ibus/bus`, and
   neither holds a byte of the model. The slug is the card's name lowercased,
   accents folded, everything but letters, digits, spaces and hyphens dropped,
   spaces to hyphens. `manifest.json` (`validateManifest` is its schema) says what
   the model dresses — a `card` by exact name and/or a duelist `seat` — and how it
   was made.
4. **A prepared model speaks OUR rig** (**D191**). `prepare.mjs` rebuilds the
   skeleton as `root` + the 22 joints `tools/build-figures.mjs` retargets (never
   the source's own hierarchy — Auto-Rig Pro's deform bones hang from the rig's
   root), at the source's positions and in the `agent` body's bind rotations,
   turns an A-pose to our T and bakes it (inverse bind matrices rewritten, so the
   skin is the identity at rest), skins an unskinned cloak by height
   (`spine_03` / `spine_02` / `pelvis`), decimates with the meshoptimizer the CLI
   pins, keeps base colour and normal ≤ 1024 px, and runs meshopt last. The
   automatic rig map knows Auto-Rig Pro, Mixamo, Unreal, VRM and Character
   Creator; `bones.json` beside the model overrides it joint by joint.
5. **There is one retarget, and it is proven.** `tools/personal/retarget.mjs` is
   the build's `humanClips` world-space delta as a function (the build cannot be
   imported: it builds on import). `check.mjs` and the test hold the copy to the
   build: `agent`'s baked clips carried onto `hero` must reproduce `hero`'s own
   (worst joint 0.77°, the clip compression; a mutant with the bind offset
   dropped is 8.5° off). Change the build's retarget and this copy together, or
   factor them (PLAN.md follow-up). **Those rotations prove the retarget, never
   the rig map**: prepare builds every skeleton in the `agent`'s bind rotations,
   so they hold for ANY map, and under `--pose t` it turns each arm link onto the
   agent's direction too. A map is judged against the `agent` body by where the
   weight goes and where the joints stand (`judgeBody`, **D192**: weight on every
   core joint, sides, the feet in front of the ankles, the branches and the toes)
   and by its LIMBS (`judgeLimbs`, **D193**): each link of the spine, the arms and
   the legs points within 25° (45° for the spine and the neck) of the agent's,
   each limb keeps the agent's proportion of its two links within 1/1.6–1.6×,
   each limb joint's vertices lie ahead of it along its link, and at attack
   t = 0.5 the hands, the feet and the head move the agent's way. A swap of two
   joints of a chain — the forearm and the hand — passed D192's checks; it fails
   the proportion (0.52×) and the flesh (−0.42). `check.mjs`'s closing OK line
   lists what was judged and nothing else, and `personal-tier.test.ts` runs the
   whole pipeline on a figure of boxes and fails every wrong map that once
   passed.

```bash
node tools/personal/import.mjs <download.zip|.gltf|.glb|.vrm> <slug>   # unpack + inspect.json
node tools/personal/prepare.mjs <slug> --card "<name>" [--seat opp] [--budget 6000]
node tools/personal/check.mjs <slug>          # our clips on it, the map judged, previews (headless Chromium)
```
