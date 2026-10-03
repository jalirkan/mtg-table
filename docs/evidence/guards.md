## Guards — the lint proves itself, counts the hops, reads `tools/`, and the AI decks meet their specs (2026-09-28)

Worked in the worktree `/home/justin-a/code/mtg-table-t2w` on branch `guards`,
from `main` at `b9af15d`. The structure review of 2026-09-28 found the repo's
mechanical guards weaker than their prose: two lint rules that could not fire,
nothing that proved any rule could, hard rule 3's "exactly three hops" held by
memory alone, a lint that never looked at `tools/`, and the AI-deck check
nowhere in the gate. Decisions **D180–D183** (the lane's reserved range);
PLAN.md *Guards* has the status and the follow-ups.

Run on the user's desktop (16 threads, OpenJDK 21 JRE, Forge 2.0.14, jar sha256
`3c0a7c38…8e5dd9`) beside other lanes' work, ports 8960–8979. Every output named
below is under the worktree's gitignored `var/` — the controls' under
`var/guards-evidence/`, the gate's under `var/check-all/<run>/`.

| # | Finding | Fix | Held by |
|---|---|---|---|
| 1 | `GameView.getDeck` / `GameView.getGame` matched literal text no call contains: **dead** | the rules watch the type — declared `GameView` names, `getGameView()`, `getView()`, a cast, `GameView::` (D180) | 8 self-test cases; the old patterns fail all 8 (§1, §2) |
| 2 | nothing proved any lint rule could fire | `tools/lint-bridge-selftest.sh`: every rule, read from `--list-rules`, must fire on a planted snippet, alone (D180) | build.sh, gate 2b, CI; four controls on the self-test itself (§2) |
| 3 | "three game-thread hops" was a sentence | rule `game-thread-hop`: exactly `HOP_ALLOW`'s three, each tagged `// ALLOW hop: D<n> <method>` (D181) | 9 cases, among them a fourth *tagged* hop (§3) |
| 4 | the lint skipped `tools/`; `AuditDeck.java` called the two-argument `createAiPlayer` | the lint reads `tools/**/*.java`, exemptions are paths; `AuditDeck` seats through `Bootstrap.createAiPlayer`; `audit-deck.mjs` fingerprints preferences (D182) | a planted bad AI-profile pref: the old helper SAVED 8,045 bytes of prefs, the new one touches nothing (§4) |
| 5 | `build-deck.ts --check` was in neither CI nor the gate | gate step **12e**, local (it needs the card index); CI's header says why (D183) | a `|MSH`→`|MSC` swap the hermetic test passes and `--check` fails (§5) |

---

### 1. The two dead rules, shown dead

`main`'s `tools/lint-bridge.sh` (from `b9af15d`) was copied into a scratch tree
`var/guards-evidence/old/` beside a copy of `bridge/src`, and a probe was
planted there — the finding's own two calls:

```java
static Deck deckOf(final GameView gameView, final PlayerView p) { return gameView.getDeck(p); }
static Game gameOf(final GameView view) { return view.getGame(); }
```

The probe **compiles** against the pinned jar (javac through `jdk.compiler`, into
`var/guards-evidence/old/out/`), and the old lint said `bridge lint OK (25
file(s))`, exit 0. Its two patterns were `-F 'GameView.getDeck'` and `-F
'GameView.getGame'`; the probe contains neither string, and no instance call
ever will. Both rules date from the first commit (`34aeba7`, M0 and M1,
2026-09-11), so the whole-decklist and live-`Game` accessors were unguarded
from then to this lane. Nothing on `main` calls either one (grep, both trees),
which is why nobody noticed and why the new rules need no ALLOW.

`GameView`'s own surface, by javap: `getGame()`, `getDeck(PlayerView)`,
`getGameLog()`, `getPlayers()`, `getStack()`, `getCombat()`. The rules now
watch every identifier declared `GameView <name>` in either tree (`game`,
`gameView` in today's code), `getGameView()` (IGuiGame, AbstractGuiGame,
HostedMatch), `getView()` — `Game.getView()` is the only `getView()` whose
result has either method: `CardView`, `PlayerView` and `GameEntityView` have
neither — a cast to `GameView`, and `GameView::getDeck` / `::getGame`.
`HostedMatch.getGame()`, which the bridge calls 17 times, is not a
`GameView` call and stays legal (a PASS case).

### 2. The lint self-test

`tools/lint-bridge-selftest.sh`, 73 checks:

- **The rule list, from the lint.** `--list-rules` gives 31 ids; the same ids,
  in order, are read off the source's `ban` / `ban_except` / `rule` lines; they
  are unique; `LINT FAIL` is printed and `fail=1` set only in `lint_fail`.
- **The real tree passes**, and so does a pristine scratch copy of `bridge/src`,
  `tools/**/*.java` and `DECISIONS.md`.
- **60 firing cases**, each in its own scratch tree under
  `var/lint-selftest/`, each required to exit 1 with exactly its own id:

  | rule | cases | rule | cases | rule | cases |
  |---|---|---|---|---|---|
  | `getDecks` | 1 | `getGameLog` | 2 | `outcomeStrings` | 1 |
  | `createAiPlayer` | 4 | `GameView-getDeck` | 5 | `matchSummary` | 1 |
  | `createAiPlayer-ref` | 1 | `GameView-getGame` | 3 | `getAlternateState` | 3 |
  | `GamePlayerUtil-wildcard` | 1 | `canBeShownToAny` | 1 | `StackItemView-getKey` | 3 |
  | `setNoGUIUser` | 1 | `mayView` | 1 | `CardView` | 3 |
  | `gson` | 1 | `mayFlip` | 1 | `thread-name` | 4 |
  | `getBackup` | 1 | `mayLookAtAllCards` | 1 | `defaultThreadFactory` | 1 |
  | `getLeftSplitState` | 1 | `targetDescription` | 1 | `thread-builder` | 2 |
  | `getRightSplitState` | 1 | `stackDescription` | 1 | `game-thread-hop` | 9 |
  | `getOracleName` | 1 | `getCloner` | 1 | `game-pool-reflection` | 2 |
  | `getMergedCards` | 1 | | | | |

  The identity accessors are planted in `Snap.java` and the `AbstractGuiGame`
  ones in `WireGuiGame.java` — the files that may name a `CardView`, i.e. where a
  second read would really land — so each fires its own rule and not the
  `CardView` one. The budgets are held both ways (a second call, and the one
  real call removed or untagged); three cases put a banned call in
  `tools/probe/Bootstrap.java`, `…/Smoke.java` and `…/Snap.java` to show an
  exemption is a path, not a file name.
- **Five PASS cases**: `hosted.getGame()` on a `HostedMatch`, a `Map.Entry`'s
  `getKey()`, the banned calls named in comments, `new Thread(r,
  HeadlessGuiBase.EDT_NAME)`, and `Bootstrap.createAiPlayer` in `tools/`.
- **Coverage**: every rule has a case; every case names a rule.

**It found a gap on its first run**: the new GameView cast pattern was
`\(GameView\)`, and the case `((forge.game.GameView) o).getDeck(p)` passed the
lint — exit 0, no rule fired. The pattern is now `GameView\)`, which a qualified
cast also ends in.

**Its own controls**, each a scratch mutation of `tools/lint-bridge.sh`,
restored by checksum afterwards (`var/guards-evidence/selftest-control*.txt`):

| mutation | self-test |
|---|---|
| the two GameView rules put back to `ban … 'GameView.getDeck'` / `'GameView.getGame'` | **FAILED**, 8 of 73: every GameView case, `exit 0, fired []` — the method-reference case too |
| a new `ban getStackDescription …` with no case | **FAILED**: `rule(s) with NO case … getStackDescription` |
| an `if grep …; then echo "LINT FAIL: …"; fi` outside `lint_fail` | **FAILED**: `LINT FAIL is printed outside lint_fail()` |
| `ban mayLookAtAllCards` wrapped in `if [ -n "${LINT_STRICT:-}" ]` | **FAILED**, 3: `--list-rules` differs from the source, the case does not fire, the case names no rule |

**Cost.** The cases run concurrently (`LINT_SELFTEST_JOBS`, default `nproc/2`,
here 8): **1.3 s** standalone on a quiet desktop, 3.1–3.9 s beside a running
gate, 7.7 s with `LINT_SELFTEST_JOBS=1` beside the same gate. In the gate, job
`02b-lintself` took 2.2 s (rehearsal). `bridge/build.sh` runs it `--quiet`
before the lint — the whole build from a deleted `bridge/out` was 3.0 s, the
self-test included.

### 3. The game-thread hops, counted

javap of `forge.util.ThreadUtil` (2.0.14): the public surface is
`invokeInGameThread(Runnable)`, `delay(int, Runnable)`, `getComputingPool(float)`,
`getServicePool()`, `refreshServicePool()`, `limit(Callable, long)`,
`executeWithTimeout(Callable, int)`, `isGameThread()`, `isMultiCoreSystem()`.
`javap -c` of its static initialiser: `gameThreadPool =
newCachedThreadPool(new WorkerThreadFactory("Game"))`, `scheduledPool =
newScheduledThreadPool(…, new WorkerThreadFactory("Delayed"))`, `service =
newWorkStealingPool()`; `getComputingPool` and `executeWithTimeout` use
default-named pools. `WorkerThreadFactory` is package-private (javap `-p`). So
`invokeInGameThread` is the only public way onto a thread `isGameThread()`
accepts, and anything else is reflection — which `game-pool-reflection` bans.
There is no `GameThreadUtil` in the jar (`unzip -Z1 | grep -i thread`: only
`ThreadUtil`, `ThreadUtil$WorkerThreadFactory`, `FThreads`); `FThreads`'
`invokeInEdt*` and `invokeInBackgroundThread` are not hops onto the game pool.
Inside Forge, `zipgrep` finds `invokeInGameThread` referenced by `GameAction`,
`InputPassPriority`, `InputConfirmMulligan`, `InputBlock`,
`QuestTournamentController` and `AchievementCollection` — the engine's own input
protocol (D136 item 5), not counted.

The bridge's three, tagged on their lines in `WireGuiGame.java`:

```
1376  ThreadUtil.invokeInGameThread(this::captureOutcome);  // ALLOW hop: D39 captureOutcome -- only at game end (hard rule 3)
2595  ThreadUtil.invokeInGameThread(() -> {  // ALLOW hop: D22 asyncAbilityMenu -- the input-generation stamp (hard rule 3)
3822  ThreadUtil.invokeInGameThread(() -> {  // ALLOW hop: D39 refreshState -- the stamp and the parked engine (hard rule 3)
```

The new lint on `main`'s tree before the tags (`var/guards-evidence/new-lint-before-fixes.txt`)
failed `game-thread-hop` three times (untagged) plus the set comparison
(`listed, not found` ×3), and `createAiPlayer` on `AuditDeck.java:448` and
`:451`. After the tags and §4's fix: `bridge lint OK (24 file(s) under
bridge/src, 1 under tools/; 31 rules)`.

The nine `game-thread-hop` cases: a **fourth hop tagged with a real decision and
its own method** (fails: not on `HOP_ALLOW`), a fourth untagged, a hop in
`tools/`, `ThreadUtil::invokeInGameThread`, a static import and a bare call, the
method looked up by name through reflection, `captureOutcome`'s hop removed (two
found, three listed), its tag renamed to `refreshState` (the nearest method
declaration disagrees), and a tag citing `D9999`. The count is **3**.

### 4. `tools/` in the lint, and the audit helper's preferences

javap of `forge.player.GamePlayerUtil`: `createAiPlayer(String, int)` calls
`createAiPlayer(String, int, String)` with `""`, which reaches the five-argument
overload; its empty-override branch reads `FPref.UI_CURRENT_AI_PROFILE`, checks
it against `AiProfileUtil.getProfilesDisplayList()`, and on a miss sets
`"Default"` and calls `ForgePreferences.save()` (offset 83). `GamePlayerUtil` is
`final`, so there is no subclass route.

Runs of `node tools/audit-deck.mjs`, each fingerprinted before and after with
step 9e's function over `~/.forge/preferences`, `var/forge/preferences` and the
audit's own throwaway `var/audit-deck/ce84bbd3db/user/preferences`
(`var/guards-evidence/prefs-fp.sh`, `audit-*-{before,after}.txt`):

| run | helper | planted in the audit home | result |
|---|---|---|---|
| A | `main`'s (two-argument call) | nothing | no preferences file anywhere, before or after; `pacho-shield` 40 ok |
| B | `main`'s | `forge.preferences`: `UI_CURRENT_AI_PROFILE=NoSuchProfile` (36 bytes) | **rewritten: 8,045 bytes**, `UI_CURRENT_AI_PROFILE=Default` and every in-memory pref Bootstrap sets — `UI_SELECT_FROM_CARD_DISPLAYS=false` (D13), `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE=true` (D14), `UI_MANA_LOST_PROMPT=false`, `LOAD_CARD_SCRIPTS_LAZILY=false`; the engine log says `Unknown profile NoSuchProfile was requested, resetting to default` |
| C | fixed (`Bootstrap.createAiPlayer(…, DEFAULT_AI_PROFILE)`) | the same 36 bytes | **unchanged**, no `Unknown profile` line; 40 ok |
| D | fixed | nothing | no preferences file anywhere; 40 ok |
| E | fixed, `decks/fra-rw-aggro.dck` | nothing | no preferences file; 19 ok, 31 missing, 0 broken, exit 1 — as documented |
| F | `main`'s, under the new `audit-deck.mjs` guard | the 36 bytes | **exit 2**: `the audit SAVED a Forge preferences file under var/audit-deck/ce84bbd3db/user/preferences` |
| G | fixed, under the guard | the 36 bytes | exit 0, 40 ok |
| H | fixed, under the guard | nothing | exit 0 |

The branch never fired in a real audit because nothing writes that pref; the
audit's home is reused between runs, so one stray file would have made every
later audit persist the bridge's in-memory decisions there. `~/.forge` was not
touched by any run (its three files' hashes and mtimes identical throughout).

### 5. The AI decks against their specs — gate step 12e

`tools/build-deck.ts` opens `var/cards/cards.sqlite` (`libraryPaths(ROOT).db`,
no flag to point elsewhere). `fixtures/cards/`, the committed test slice, holds
84 MSH/MSC prints; of the four specs' lines it has 3 of Doom Legion's 27, 2 of
Hulk Family's 24, 1 of Masters of Evil's 27 and 2 of Wakanda's 24 — an index
built from it cannot resolve the decks, and building the real one downloads
Scryfall's bulk file. So `--check` is a local gate job, not a CI step.

**For these runs the index was copied from the main checkout's
`var/cards/cards.sqlite`** (58,429,440 bytes, sha256 `99031f4a…`, read, not
modified) into this worktree's gitignored `var/cards/`, rather than downloaded
again; no worktree but `main`'s had one.

- `node tools/build-deck.ts --check`: all four decks `is its spec's, byte for
  byte`, exit 0, about 0.1 s.
- **Control**: `decks/wakanda.dck`'s `1 Vibranium Energy Daggers|MSH` edited to
  `|MSC` — `web/test/deck-specs.test.ts` still **passes 6 of 6** (it compares
  names, counts and order, and a set only where the spec pins one); `--check`
  **fails**: `STALE: decks/wakanda.dck differs from what decks/specs/wakanda.json
  builds`, exit 1. The deck was restored by checksum.
- **12e without the index** (the step function run on its own, the index moved
  aside): `check-all FAILED at step 12: var/cards/cards.sqlite is missing: build
  the local card index with  node tools/card-library/build.ts …, or pass
  SKIP_DECKS=1`. Under `SKIP_DECKS=1` the job is `12e-skipped`, which prints that
  the decks were NOT checked.

### 6. CI

`.github/workflows/checks.yml` parses (PyYAML 6.0.1: jobs `web`, `bridge`,
`redaction`; the bridge job's steps now open with
`tools/lint-bridge-selftest.sh`, then `tools/lint-bridge.sh`). Its commands were
run locally in order (`var/guards-evidence/ci-local.txt`), from a deleted
`bridge/out` and with `MTGTABLE_WS_LOGS` unset, except the two that download:
`npm ci` (`web/node_modules` was in place) and the engine fetch (the local
pinned jar, which the fetch step's checksum would name). All passed: the
self-test's 73 checks, the lint, `check-forge.sh`, the build and its five
self-tests, the redaction corpus and its self-test, the narrator's 87 checks,
wire-drift's 20 cases, the catalog check, `npm --prefix web run build`, and
`npm --prefix web test` **933 / 933 pass** plus vitest **120 (8 files)** —
`main`'s counts, since the lane added no web test.

### 7. The gate

Three runs of `./tools/check-all.sh` at `GATE_JOBS=4`, each from a deleted
`bridge/out`, all **exit 0**, **48 jobs** each (46 on `main`, plus `02b-lintself`
and `12e-decks`), beside another lane's gate at `WSPORT=8920`:

| run | `WSPORT` | wall | jobs' seconds summed | load (1 min) | 02b | 03-build | 12e | log |
|---|---|---|---|---|---|---|---|---|
| rehearsal | 8960 | 257.0 s | 988.5 s | 4.1–11.0 | 2.2 s | 5.8 s | 0.1 s | `var/check-all-guards-p0-rehearsal.log` |
| p1 | 8960 | **259.9 s** | 1,006.2 s | 4.8–12.4 | 1.5 s | 4.3 s | 0.0 s | `var/check-all-guards-p1.log` |
| p2 | 8970 | **249.1 s** | 968.1 s | 7.9–11.5 | 1.3 s | 3.4 s | 0.0 s | `var/check-all-guards-p2.log` |

In each: `lint-bridge-selftest OK: 31 rules, 60 firing cases (each fired its own
rule and no other), 73 checks` twice (2b, and `bridge/build.sh` inside 3),
`bridge lint OK (24 file(s) under bridge/src, 1 under tools/; 31 rules)`, the
five build self-tests, 12e's four decks `byte for byte`, and `node --test`
**943 / 935 pass / 0 fail / 8 skipped** with vitest **120 (8 files)** — `main`'s
counts. The two new jobs cost the critical path two or three seconds (2b,
which step 3 waits for, and the self-test again inside `bridge/build.sh`); the
wall times sit in `main`'s band (243–265 s for polish-1's two runs). p1 ran on
a tree that differs from the committed one only in the wording of four
comments (in `lint-bridge.sh`, `lint-bridge-selftest.sh`, `bridge/build.sh` and
`check-all.sh`), edited between p1 and p2; p2 is the committed code.

### 8. `~/forge` and `~/.forge`

Fingerprinted before any work and after the last run (`find -printf '%P %y %s
%T@'` over each tree, hashed; the jar's sha256; `~/.forge/decks/constructed/`
and `~/.forge/preferences/` by content): **unchanged**. `~/forge`: 22,128
entries, tree digest `ffd65a11…` both times, the jar `3c0a7c38…8e5dd9`;
`~/.forge`: 27 entries, digest `d03583eb…` both times, `decks/constructed/`
empty, `preferences/` `272dad74…` both times.
