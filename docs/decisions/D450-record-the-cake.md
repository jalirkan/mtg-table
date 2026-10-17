## D450 — Record the cake: `census-play --record none|rows|full` keeps both seats' decision rows and a per-turn ledger by default, the frame logs on request, all checked for hidden information; `LAB_DATA_DIR` puts the lab's heavy outputs on another drive; `census-replay` plays a game again from its recipe and asserts it is the same game

*Branch `pc/record-the-cake`. `node tools/decisions.mjs next` gave D450 on 2026-10-16; this lane
reserves D450–D452 (D451 is the move atlas, `pc/move-atlas`, stacked on this branch; D452 is
unused unless a review needs it).*

**2026-10-16**

**Context.** Justin, 2026-10-16 evening, in substance: "we have terabytes" — a drive will be
mounted; record the full game data, not win/loss; "isn't the cake going to make a stronger
model?" Until now the deck census (D447) kept one line per game (who won, in how many turns), and
the D435 row exporter wrote rows only for a SEARCHING seat. A census game is played by two plain
Forge seats, so it left nothing a model could learn a decision from. The engine is deterministic
for a fixed seed, decks and pilots, so a game's full log is a function of its recipe — which is
what makes it cheap to keep the recipe always and the cake on request.

**Decision.**

1. **`census-play --record none|rows|full`, default `rows`.** `none` is D447's numbers-only run.
   `rows` adds, per game: every p, a and b decision of BOTH seats as a D435 row
   (`<out>/rows/rows-<pid>.jsonl`), and one ledger line (`<out>/ledger.jsonl`). `full` adds both
   seats' frame logs, `<out>/frames/g<g>-seat{0,1}.jsonl.gz` (the bridge's own `SeatRecorder`, each
   redacted for its seat). `plan.json` records the mode, and a folder keeps one mode: a plan written
   before this decision reads as `none`, so a run started without `--record` is extended with
   `--record none` or not at all.
2. **Rows for a seat the search does not drive: the observing seat** (`SearchConfig` `observe=1`).
   The seat is our controller (`PolicyControllerAi`, D309) with a search config that generates the
   search's own candidates at p, a and b and then plays Forge's answer: no rollout, no verdict. Its
   candidate generation runs inside `Decisions.quiet` (D347's throwaway `MyRandom`), so Forge's
   random stream does not move. The row is written once the seat's final answer is known (play
   exploration, D358, may change Forge's), with that answer's index among the candidates, appended
   as a candidate of its own when the enumeration did not hold it. A searching seat's rows are
   written exactly as before. Every row now names who answered (`policy`: `search`, `forge`,
   `random`), and `tools/ml/distill.py` trains on `search` rows only (the rest counted as
   `rowsOtherPolicy`).
3. **Each game's recipe goes before its rows.** A `begin` line names the census seed, the deck ids
   and files, the decks' sha, the pilots, the mode, the game seed and who was on the play — strings
   and numbers only, nothing a seat could not know about the game it sits in. A reader keys a game
   by its rows key, `census:<seed>` (the seed is S × 1,000,000 + g, unique in a run), and keeps only
   games with an `end` line, as D435 said.
4. **The ledger is public information only** (`mtgtable.ai.GameLedger`): per turn, per seat — life,
   cards in hand and in library (counts), lands / creatures / other permanents, spells cast, lands
   played, mana spent (the spells' and non-mana abilities' `getTotalManaSpent`), damage dealt by the
   seat's sources (to anything, and to players). It reads the engine's own `Game` objects at every
   phase change and at the outcome, names no card and walks no view. Damage is attributed through
   Forge's own `Game.getDamageLKI`, keyed by (amount, combat), so two equal instances in a turn are
   attributed as Forge attributes them; damage to a card that left for a zone other than the
   graveyard is not seen.
5. **Hidden information, three checks.** A row is ONE seat's decision: its state is D361's encoder
   over `GamePosition` (other hands and every library by size only), its tokens are wire ids of the
   seat's own plays and of public cards. (a) The engine check, `RowsLeakCheck`: on every N-th row
   (`--rows-check-every`, default 50 in rows mode) the opponent's hand and library are redealt from
   their own cards and the deciding seat's library shuffled — the state must not move — and the
   negative control swaps the seat's OWN hand, which must. Every zone is put back. It is off in
   `full` mode, because `setCards` fires a zone event the recorder would log. (b) The file check,
   `tools/cubelab/rowscheck.ts`, on every rows file a run wrote: known line types and keys only,
   tokens in the token grammar (no names, no engine text), numbers where numbers belong, a `begin`
   line with plain values and no card-bearing key; and in `full` mode every id a row names must be
   one its seat's own frame log shows as a full card. (c) Every frame log through
   `tools/check-redaction.mjs`. Any problem fails the run (exit 3).
6. **`LAB_DATA_DIR`** (the environment, else `config.json`'s `labDataDir`): a relative path under
   `var/` that the lab is given is re-rooted there — writes always, reads when the re-rooted path
   exists (else the repo's, so older data is still found). Absolute paths and paths outside `var/`
   never move. A setting that names no existing directory is an error, never a new folder on the
   system disk. It applies to `census-play`, `census-read`, `census-replay`, `decks`, `run`, `evolve`
   and `queue` (`--root`); the Forge homes (D129) and the compiled classes stay in the repo's `var/`.
   Unset, every path resolves exactly as before.
7. **`census-replay <rows-file> --game census:<seed> [--record full]`** plays the game again from its
   begin line and asserts it is the same game: every row the same but its wall time, the same
   winner; with an original frame recording beside the rows, both frame logs equal under a
   normalisation that drops the wall clock, renumbers the stack's instance ids (Forge counts them
   per process) and compares an event's `cardIds` as a set (D121). Exit 0 on a match, 4 otherwise.
   A search pilot is refused: it is wall-clock bound.

**Rejected.** Keeping only the frame logs and deriving rows from them in Python (D435 rejected it:
two implementations of one feature). Gzipping the rows files as they are written (they are appended
by several processes and read by `distill.py` as plain JSONL; they compress about 11× and D370's
archiver can do it after a night). A ledger read off the events' card views (lint rule 5: a card
view outside the serialiser). Running the leak check in recorded games (its zone events would be in
the logs). Moving the Forge homes under `LAB_DATA_DIR` (`forge_home_make` keeps them under the
repo's `var/` on purpose, and they are small).

**Measured** (this branch, `--jobs 2` beside the lab's seven-worker J139/J140; legacy decks of
seed 4501).

- Sizes per game over 100 games, `--record full`: rows 45.4 KB mean (median 43.0, p90 70.7, max
  124.6; 35.9 rows a game; gzip 11.0×, about 4.2 KB), ledger 1.5 KB (median 1.4), both frame logs
  103.1 KB (median 89.4, p90 168.4, max 401.5). So `rows` keeps about 47 KB a game and `full` about
  150 KB: 20,000 census games are ~0.9 GB in rows mode, ~3 GB in full.
- Rate: 1,902 games an hour on 2 workers with `full`, against D447's 2,472 for `none` (a different
  load; the 20-game `none` and `rows` runs below were 1,760 and 1,695 games an hour side by side).
- The same game: the first 20 games played with `none`, with `rows` (leak check on EVERY row), and
  with `full` gave the same winner, turn count and first player in 20 of 20; the rows of `rows` and
  `full` were identical row for row (but `ms`) in 20 of 20 games, so neither the observing seat nor
  the leak check's swaps moved a game.
- Hidden information: 671 leak checks, 0 leaks; the negative control moved the state in 668 of 669
  (the other swapped identical cards). 3,588 rows of 100 games passed the file check, every id
  checked against its seat's own log; 200 frame logs passed `check-redaction.mjs` (10 s).
- Recipe → cake: `census-replay` of g1 and g4 from the `rows` run (leak-checked) and of g37 from
  the `full` run: every row identical, the same winner, and both frame logs equal to the `full`
  run's independent recordings of the same games under the normalisation in point 7.

**Review follow-ups** (the cloud's review of #160, 2026-10-17).

- `census-replay` refuses an `--out` holding `plan.json` or `games.jsonl`, or containing the rows file
  it replays, before it clears anything: it empties `<out>/rows` and `<out>/frames`, and a census
  folder given as `--out` lost its night (131 rows became 41).
- `LAB_DATA_DIR` refuses a write whose repo copy holds work the re-rooted copy lacks (a non-empty
  folder against a missing or empty one, or a `plan.json` against none), naming both: re-rooting a
  folder begun before the setting would start it again from scratch on the drive.
- The begin line's deck files are the recipe and nothing else: `census-replay` reads them to play
  the game again, and no reader may use a path, a file name or a deck id as a feature. Under
  `LAB_DATA_DIR` a deck file is stored as `var/<path under the data root>`, the spelling `labPath`
  reads back re-rooted, so a recording still replays when the drive is mounted elsewhere.
- `RowsLeakCheck` holds every candidate's vector to the same rule as the state: neither may move
  when only the opponent's hidden cards do (`rowsCheck.candidates` counts the checks that compared
  them).
- #159's follow-up (D448): an abandon refused because the game is already over is not a failure —
  the loop waits for that `over`, counts the game as played (not stalled) and starts the next one
  itself, since nobody is connected to ask.
