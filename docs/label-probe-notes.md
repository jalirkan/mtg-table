# The label probe: notes for its first compile (D538 lane, `pc/label-probe`)

*Working notes, not for merging as they are. Every line of this lane was written while the machine was measuring
(J211), with no Java, node, test or build run: what follows is what reading could and could not settle.*

## What it is

At a recorded move-atlas decision, which option a ladder player picks. One replay per (decision, repeat):

1. `tools/label-probe.sh` resolves the player's seat config with `node tools/ai-ladder/cli.ts cfg <name>` (new:
   the registry's `resolvePlayer`, so `kinds.ts` stays the one mapping), compiles `tools/cubelab/CubeLab.java` and
   `tools/cubelab/AtlasProbe.java` into `var/label-probe/classes/`, and starts `--workers` JVMs (hard rule 6's flags,
   a Forge home each from `forge_home_make`), each `--shard i/K`, all appending to `--out`.
2. `AtlasProbe` (package `mtgtable.cubelab`) reads the spine's `plan.json` and `phaseB/baseline.json`, builds the
   match line `atlas.ts`'s `unitJob` builds for a branch unit (same decks, seed, `Default` on both seats, turn cap,
   `cands` = `plan.options`, `expect` = the baseline's tokens at d) with `i0 = i1 = 0` and a `probe` block, parses it
   with `Json.parse` (so the map is exactly what a worker reads from stdin) and hands it to `CubeLab.playMatch`.
3. `playMatch` plays it as any unit (observe seats, `ReplaySink`, D511); `CubeLab.atlasUnit` reads the probe block
   into `Atlas.Unit.probe`; at decision d `Atlas.Hook.decision` checks the listing, then calls
   `LabelProbe.ask` instead of branching, and ends the game.
4. `AtlasProbe` reads `CubeLab.lastHook`: every decision the replay listed up to d is compared with the baseline's
   (`LabelProbe.listingDiff`); then the answer; one row.

## Every Forge call or signature assumed (check with javap against the pinned jar)

```bash
jp(){ java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" "$@"; }
jp forge.ai.LobbyPlayerAi | grep getAiProfile         # assumed: public String getAiProfile()   (read in the 2.0.15 source only)
jp forge.ai.PlayerControllerAi | grep chooseSpellAbilityToPlay   # assumed: public List<SpellAbility> chooseSpellAbilityToPlay(), no overload that makes super:: ambiguous
jp forge.game.phase.PhaseHandler | grep getCombat     # public final Combat getCombat() (the repo already calls it: SearchPolicy BlockCand.install)
```

Everything else `LabelProbe` calls is the repo's own (`SearchPolicy.candSa/candAttack/candBlock/setAttack/setBlock`,
all package-private statics in `mtgtable.ai`; `chooseAttack`, `chooseBlock`, `takeReport`, `takeTargetReport`,
`token`, `identity`, `attackCand`, `blockCand`, `priorityCand`, the `Report` fields) or already compiled elsewhere in
the bridge (`Player.getLobbyPlayer()`, `Player.getController()`, `Player.getGame()`, `Game.setGameOver`).

## Java I could not confirm without javac

- `PolicyControllerAi.choose()` now passes `super::chooseSpellAbilityToPlay` as a `Supplier<List<SpellAbility>>`.
  Legal Java (a `super::` method reference, bound to PlayerControllerAi's implementation as `super.x()` was); check
  it compiles and that `RolloutController.Random`/`Outlets` and `AtlasController` (subclasses) still behave.
- `choose0`'s new parameters shadow the fields `policy` and `search` on purpose (the body is unchanged); `observing()`
  there became `search.config().observe`, the same test on the parameter. `searchBy` is now static and takes the search.
- `LabelProbe.ask`: a blank `final SearchPolicy.Cand pick` assigned inside `try { … } finally { … }` in two switch
  cases, and once in a third. Definite assignment should hold (each case ends in `break`, `default` throws).
- `PolicyControllerAi.Probe` is a nested `record` (implicitly static).
- `DecisionSelfTest.labelProbe()` calls `Decision.attackToken(List.of())` and `Decision.blockToken(List.of())`, typed by
  inference; and loads `LabelProbe` (which imports Forge types) without booting Forge, as `Decisions.ghostLine`
  already does in the same test. If the verifier balks, move the pure helpers to a class with no Forge import.

## The behaviour change to rule out first

`PolicyControllerAi.choose/choose0` is the frozen seat's path (D509). The refactor is meant to change nothing: the
existing call passes the seat's own policy, search and `super.chooseSpellAbilityToPlay()`. `SearchPolicy`'s
`flushObservedAttack/Block` now call `declaredAttack/declaredBlocks`, their own loops moved out. Gate step **12m**
(`tools/cubelab.sh seat-identity`, every decision record of four fixed games against
`fixtures/cubelab/seat-identity.json`) and `tools/cubelab.sh atlas-selftest` are the checks that would see a moved
record; both must pass with no `--write`.

## Self-test count

`DecisionSelfTest.labelProbe` adds **29** checks: main's 396 becomes **425**; with D537's 8, **433**.

## The lint

No new rule should fire and no exemption is needed: no `CardView`, no `invokeInGameThread`, no thread, no reflection,
no field read by name. `tools/cubelab/AtlasProbe.java` is under `tools/` and is scanned. If the lint objects to
anything, report it rather than adding an exemption.

## What to check first, in order

```bash
./tools/check-forge.sh
./bridge/build.sh 2>&1 | tail -20                     # javac, the lint, the self-tests: "decision selftest: 425 check(s), 0 failure(s)"
python3 -m unittest discover -s tools/atlas/tests      # test_agreement.py's nine cases beside test_atlas.py's
./tools/cubelab.sh seat-identity                      # the refactor moved no record (12m)
node tools/ai-ladder/cli.ts cfg forge-default         # "<hash>\tDefault"
node tools/ai-ladder/cli.ts cfg search-v1-anytime     # "<hash>\tDefault+outlets+search:ms=1500,...,anytime=1"
```

Then one spine, forge-default first. **forge-default must pick option 0 at every `ok` row**: it is Forge's own answer
handed back, so anything else is a mapping fault, not a finding.

```bash
LABELS=<the judged labels file, labels-judged.jsonl>
mkdir -p var/label-probe
python3 -I -c 'import json,sys
for l in open(sys.argv[1]):
    r = json.loads(l)
    if r["key"].startswith("J186/s01/"): print(json.dumps({"key": r["key"]}))' "$LABELS" > var/label-probe/one-spine.jsonl
./tools/label-probe.sh --decisions var/label-probe/one-spine.jsonl --player forge-default \
    --data ~/code/lab/data --repeats 1 --workers 1 --out var/label-probe/smoke.jsonl
./tools/label-probe.sh --decisions var/label-probe/one-spine.jsonl --player policy-outlet \
    --data ~/code/lab/data --repeats 1 --workers 1 --out var/label-probe/smoke.jsonl
./tools/label-probe.sh --decisions var/label-probe/one-spine.jsonl --player search-v1-anytime \
    --data ~/code/lab/data --repeats 3 --workers 1 --out var/label-probe/smoke.jsonl
python3 -I tools/atlas/agreement.py --labels "$LABELS" --boot 200 var/label-probe/smoke.jsonl
grep -c '"status":"mismatch"' var/label-probe/smoke.jsonl; tail -50 var/label-probe/smoke-forge-default/shard-0.log
```

What to read in the smoke: every row `ok` (a `mismatch` means the replay is not the baseline's game on today's code:
the nights ran at pins e557dedf … 1d0d18f3, J203 replayed all six nights' spines without one on 2026-11-09, and since
2026-11-08 only the search's rollouts changed under `bridge/src/mtgtable/ai/SearchPolicy.java`); forge-default and
policy-outlet `searched: false` everywhere; search-v1-anytime `searched: true` on most p rows with `rounds` > 0 and
`ms` near 1500; `replayMs` per row (sizes a full run); a kind-restricted player (`search-v2-only-p`) `searched: false`
and option 0 at every a and b row.

## Things reading could not settle

- **Wall-clock budgets.** Every ladder search player but the fixed3 family stops on time (1,500 ms); its pick depends
  on the machine's load, as on a ladder night. Run the probe at the ladder's worker count, not alone and idle.
- **Forge's random stream inside the ask.** The hook runs inside the observing seat's `Decisions.quiet`
  (`PolicyControllerAi.java:482`, `Decisions.java:264-272`), so whatever Forge draws while the player decides
  (`canPlaySa`, its payment checks) comes from that throwaway generator's state, the same in every repeat; only the
  search's own seed (`seatWithSeed`) differs per repeat. In a ladder game those draws come from the game's stream.
- **The outlet policy's memory.** A fresh `OutletPolicy` per ask: its all-in mode (`allInTurn`, `allInPhase`) starts
  empty, where a ladder seat's would carry the turn's earlier decisions.
- **Profiles.** Forge reads its AI profile off the seat's lobby player, the atlas seat's `Default` (`atlas.ts:407`).
  Players on another profile (forge-reckless, forge-cautious, forge-experimental, policy-outlet-reckless,
  search-v1-reckless) are written `unsupported`, never asked under Default. Setting the lobby player's profile for the
  duration of the ask is possible (`LobbyPlayerAi.setAiProfile`) but whether `AiController` caches profile values at
  construction was not read; not done.
- **Identity.** A pick whose token is unique in the listing is that option even when its play identity differs (an
  alternative cost of the same card the listing did not hold); the row says `sameIdentity: false`. Filter on it if it
  turns up.
- **The replay's tail.** `setGameOver(Draw)` inside the hook leaves Forge to finish the current step (it plays the
  atlas seat's own answer into a game that is over), as D465's retirement already does; the hook keeps listing any
  decision that follows, which `AtlasProbe` ignores past d.
- **Speed.** One replay per (decision, repeat): about the baseline's time to d plus one search budget. 605 decisions x 3
  repeats is 1,815 replays; `replayMs` in the smoke gives the real figure.
