## D414 — search-v2 is the default opponent wherever the owner plays the AI; his games reach the human test set within a minute, labelled with the AI's version and budget and with whether the coach helped

*Branch `c/search-default`.* Amends D314 (the search seat was opt-in), D333 and D381 (the
picker's and `/engine/start`'s defaults) and D369 (when the human test set is collected, and
its labels). Reads J101 and J102 (`results/J101/`, `results/J102/` on `pc-results`) and D412.
Protocol amendment **M62**.

**2026-10-08** (the owner's request: play search-v2 by default, and have those games become
human-vs-search data)

### 1. The default opponent

**Why.** J101 (B2, mtg-table `c9ae213`, the confirm set, 1,200 games, 600 mirrored pairs,
complete) measured the search against the anchor the ladder's scale is tied to:
search-v1 vs forge-default scored **0.6033 [0.582, 0.6247]**, **+72.9 Elo [+57.5, +88.5]**.
J101's (A) SPRT left Forge's Default profile as the default (forge-reckless vs forge-default:
H0 after 808 games, score 0.501), and its (C) left the search on Default (H0 after 392 games,
0.487). J102 then made the live seat search-v2, search-v1 plus the anytime loop
(+9.3 Elo [+2.5, +16.0] over search-v1; budget fallbacks 0.71% vs 5.61%; D412). So the
strongest opponent measured on the confirm set is search-v2 on the Default profile, and it is
what every AI seat the owner meets should be unless he asks for Forge.

**Decision.**

1. **`scripts/play.sh` starts the search AI by default** (`--ai-policy search`, which
   `SearchConfig.parseLive` makes search-v2, D412): a bare run, `--engine-only`, `--lan`,
   `--funnel` and `--tunnel` alike, so every later `POST /match` without an `aiPolicy` and
   every `/engine/start` wake (both reuse the startup flags) plays it too.
   - `--ai-plain` opts out (`--ai-policy plain`, kept across restarts and wakes).
   - `--ai-search` and `--ai-search-ms <n>` keep working (they name what is now the default,
     or set its budget).
   - `--ai-plain` beside `--ai-search` or an `--ai-policy` after `--` is an error ("pick
     one"), not a silent winner.
   - The start prints which AI it is (`AI policy: search-v2 (the default, D414 …)`).
2. **`MtgTable`'s own default stays `plain`.** The gate, the smoke runs, the redaction
   fixtures and every recorder pass their own flags; only `play.sh`, the owner's command,
   changes. **The lab is unaffected**: no job, runner or bench launches `play.sh` (grep of
   `tools/` and the job files: only `match-launcher-selftest.mjs` and ForgeCoach's e2e, which
   pass their own flags), and the ladder's players carry explicit policies. **A table of two
   people** (D402) has no AI seat; its restart builds its own command line and is unaffected.
3. **`POST /engine/start` takes `{"aiPolicy"}`** (plain | outlets | search, exactly as
   `/match`), advertised as `/health` `engine_start_policy: 1`. Plain Play vs Forge could not
   name an opponent before (only `aiProfile` and `seed`), so ForgeCoach's picker had nothing to
   send. It replaces `--ai-policy`/`--ai-search` (a budget too) and stays the last setup's, like
   a profile; an engine already running is not restarted, and a warning says the request was
   not applied.
4. **ForgeCoach** (its own PR) starts both pickers on the search AI whenever `/health` lists
   it: the Draft vs AI setup's opponent and plain Play vs Forge's (sent only to a helper with
   `engine_start_policy: 1`). Plain Forge is one tap away in both. An older helper that does not
   advertise search gets plain, as `policyFields` already does. The board names the AI
   (`aiName.ts`, M56).

### 2. Why the owner's games were not counted

**What the collector counts** (D369, `tools/ml/human_collect.py`): every
`var/games/<id>/frames.jsonl` of the checkout `play.sh` runs from, `<id>` one of
`human-(ws|console)-<seed>[-g<n>]` or `match-m<13 digits>[-g<n>]`, whose session header says
`transport` ws/console, whose viewing seat is a person and the other seat an AI, and which is
finished (an `over` with a winner or a reason). No AI policy, threshold or opt-out excludes
anything; `--no-human-collect` is off by default.

**When it ran**: at `play.sh`'s start, when the engine falls asleep (D308), and at `play.sh`'s
exit — never after a game. Two facts make that miss an evening's games:

- the start's line (`human test set: N games`) is computed before any game of the session, so
  it can only count earlier sessions;
- a ForgeCoach page that stays connected keeps the engine awake: with `--keep-open` (M6) the
  bridge waits for `newGame` for as long as a client is connected, and D286's idle exit needs
  no client. The engine does not fall asleep while the board is open, and `restart_match`
  (Draft vs AI's `POST /match`) does not collect. The session's games are therefore collected
  only when `play.sh` exits — by Ctrl-C, the launcher's Stop (SIGTERM, 20 s before a group
  KILL), or the 240-minute idle exit, which needs the engine asleep first.

Measured on this branch with the pinned engine: a scripted seat that keeps its socket across
three games (as ForgeCoach does) had game 1 in the set within one collector period while game
2 was being played. On `main` nothing has a trigger there: its runs (one at start, one when
the engine exited after the third game, one at exit) were the only ones.

A second way to see 0, which only the owner's PC can settle: the ForgeCoach launcher plays from
the checkout it remembered (`MTG_DIR` in `~/.config/forgecoach/config`), chosen on its first run
as the most recently checked-out mtg-table under the home folder — which can be a lab clone
(`~/code/lab/mtg-table*`, whose `.git/index` the runner rewrites per job). Games played through
the launcher are then in that clone's `var/games/`, and a `play.sh` typed in
`~/code/mtg-table` counts none of them.

**Decision.**

5. **play.sh collects every minute while it runs** (`MTGTABLE_HUMAN_COLLECT_EVERY_S`, default
   60), in the background, with `--quiet --only-new`: one line when a game was added, nothing
   otherwise. It stops with play.sh (killed in `stop()`, and it checks play.sh is alive before
   each run). The collector takes an flock on `var/ml/human/.collect.lock`, so the minute's run
   and the start/asleep/exit runs never write the manifest at once.
6. **`--dry-run`** is documented as the diagnostic: it lists what would be copied and, for
   every other log, why not.

### 3. Labels

7. **The AI's version and budget — amendment M62.** `hello_ok.match.aiPolicy` says `search`
   but not which search or at what budget. The session header (§8.1, off the wire) gains `ai`
   when the seat is not plain Forge: `{policy: "outlets"}` or `{policy: "search", version,
   budgetMs, config}` — `version` `"search-v2"` when the seat runs the live default at any
   budget, else null; `config` `SearchConfig`'s own string. Never a card or a deck; omitted for
   plain Forge, so no plain recording changes. `check-redaction.mjs` checks the shape (two
   controls, `fixtures/negative/redaction/m62-*`). The manifest's new `aiSearch` carries it
   (null for plain, outlets, and logs older than M62). The cube (`cube`, ≥ 80% of the deck's
   non-basics), the decks (`yourDeck`, `aiDeck` by public name and count), the profile and the
   result were already there; collecting within a minute also means a Draft vs AI deck file
   (`var/match/<id>/you.dck`, pruned after five newer matches) is still on disk when the cube
   is guessed.
8. **Whether the coach helped.** There is no clean existing path from the browser to the
   bridge's log or the collector: the coach runs in ForgeCoach, through the user's key or the
   helper's `/coach`, neither keyed by game, and ForgeCoach keeps no saved log of a game
   against Forge (only a table's, D402). So ForgeCoach records it **client-side**, per game, in
   its own storage, keyed by the collector's own key (`gameId|seed|startedAt`) and the seat:
   the live coach's answers shown (auto-coach plans and the player's own questions), the models
   and sources; exported from Settings. The collector joins every `coach-usage*.json` saved in
   `var/ml/human/` (and `--coach-usage FILE`) into the manifest's `coach`:
   `{used, answers, plans, asks, models, sources}`, or null when no record names the game
   (unknown, not "no coach"). It is re-read on every run, so an export saved later labels games
   already collected. Games against a friend (D407's set) are never labelled.

**Hidden information.** Nothing new reaches the wire. The header's `ai` is the AI's own
settings; the coach record is counts and model names, written by the player's own browser.
D407's consent and opt-out rules are untouched.

**Takes effect** when `play.sh` restarts.

**Tests.** `tools/match-launcher-selftest.mjs` (a bare start is `--ai-policy search` once,
`/match` without a policy keeps it, `--ai-plain`, `--ai-search-ms`, the refused combinations,
`/engine/start`'s `aiPolicy` asleep and running, `checkWake`, `/health`);
`tools/ml/tests/test_human.py` (the `aiSearch` label, the coach join and re-labelling,
`--only-new`, the lock); `tools/check-redaction-selftest.mjs` (M62's controls); the bridge
build's self-tests; and an end-to-end run against the pinned engine (above).
