# 14 — Engine upgrade for Reality Fracture: the decision, and the plan for the day

Written 2026-09-27 on branch `engine-upgrade` (worktree `mtg-table-t2h`, based on
`754f504`). It judges two spikes whose raw measurements are in
[`docs/evidence/engine-upgrade.md`](../evidence/engine-upgrade.md) ("Spike A":
overlaying the daily snapshot's card scripts onto 2.0.14; "Spike B": porting the
bridge to the daily snapshot; "Preparation pass": what this branch leaves in the
tree and how it was checked). This report cites that file rather than repeating
it, and re-ran the numbers it leans on hardest (§2).

**The decision is WAIT.** The engine stays Forge 2.0.14 at `~/forge`. Nothing
engine-related is merged or wired into `config.json`. Reality Fracture arrives the
day an **official Forge release** ships it, through the checklist in §0 (the
detail is §5), which is a short, rehearsed list rather than a project.

**The user's constraint, which governs the whole report:** *"Let's not break anything
to force in the latest cards. Things will be available through official channels
soon enough; no need to create unnecessary friction and work for ourselves."* So the
port to a daily snapshot, and running two engines side by side, were never options.
The only real question was whether a **card-script overlay on 2.0.14** was clean
enough to count as "not breaking anything". It is not (§3).

---

## 0. On the day Forge releases with FRA — the checklist

Everything this list names already exists in the tree except the four items marked
**(new on the day)**, whose specification is §5.2. Each step is its own reviewable
change, the user commits, and any step that fails **stops the switch**; rollback is
reverting `config.json` and the patch, because `~/forge` (2.0.14) is never touched.

**Before the day, on `main`, whenever the user likes** (it is independent of the
cards, but it must land before any engine switch):

- [ ] Fix the **M6 next-game race** (§4.1): a late `finishGame` lands after the next
      game's `openView` has reset `overEmitted` (`WireGuiGame.java:816`). Pick
      "defer `nextGameDecision` until `finishGame`" or "key `finishGame` to a per-game
      generation", and write the choice into `DECISIONS.md`.
- [ ] Fix the two gate defects (§4.2, §4.3): step 6's `diff | head -20` exits 141
      under `pipefail` before it prints its failure; step 10g does not assert that
      each game was played.

**On the day:**

1. [ ] **Is it the day?** A new tag on
       `https://github.com/Card-Forge/forge/releases.atom` that is not
       `daily-snapshots`, whose `res/editions/Reality Fracture.txt` lists the full
       set (461 entries in the 09.27 snapshot). It must load FRA **outside**
       `upcoming/`: a release build skips that directory (§5.1).
2. [ ] **Get the release, pinned.** Write `tools/forge-engine.json` by hand from the
       real release page (version, `Implementation-Version`, URL, archive and jar
       bytes and sha256, date, licence) **(new on the day)**, then run
       `tools/get-forge.sh` **(new on the day)**, which verifies both hashes and
       leaves `var/forge-engine/<v>/` with the jar, `res/` and `.verified`. Nothing
       is written under `~/forge` or `~/.forge`. `sha1sum` the
       `~/.forge/decks/constructed/` tree and the `~/forge` jar before step 3.
3. [ ] **`check-forge` against it:**
       `FORGE_JAR=var/forge-engine/<v>/forge-gui-desktop-<v>-jar-with-dependencies.jar ./tools/check-forge.sh`.
       Its pinned surface (the 8 classes, 7 members and 4 event classes it asserts
       today) must all be there; it prints the jar's sha256, which must equal the pin.
4. [ ] **Audit both decks against it** (read-only; a throwaway home under
       `var/audit-deck/`):
       ```bash
       FORGE_JAR=<release jar> node tools/audit-deck.mjs \
           decks/fra-rw-aggro.dck docs/drafts/decks/fra-gb-leftovers.dck    # expect 90 ok (50 + 40)
       FORGE_JAR=<release jar> node tools/audit-deck.mjs decks/pacho-shield.dck \
           decks/morph-probe.dck decks/yield-probe.dck decks/sideboard-probe.dck   # expect 175 ok
       ```
       Anything `missing` or `broken` stops the switch (the likeliest cause is a
       release that still keeps FRA under `upcoming/`).
5. [ ] **Is the seam still the one the saved port was written for?**
       ```bash
       ./tools/javap-seam-diff.sh /home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar \
           <release jar> > var/javap-release.txt
       diff <(sed 1,3d docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt) \
            <(sed 1,3d var/javap-release.txt)
       ```
       - The release's seam differs from 2.0.14's **the way the snapshot's did** (no
         output from the second `diff` in `IGuiGame`, `AbstractGuiGame`,
         `IGameController`, `InputPassPriority`, `PlayerControllerHuman`):
         `git apply docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch`.
       - It **drifted further**: re-port by the same method; the patch header says
         what each hunk is for. It is a guide, not a promise.
       - It does **not** differ from 2.0.14 at all: no patch.
       Also change `MtgTable`'s `members fired = N of 37` to 28 (cosmetic; that file
       belongs to the match-setup worktree).
6. [ ] **Point the repo at it:** `tools/config.sh` resolves a relative `forgeJar`
       against the repo root **(new on the day)**; `config.json` gets
       `forgeJar = var/forge-engine/<v>/…jar`, `forgeJarSha256`, `forgeVersion`; and
       `tools/check-forge.sh` asserts that pin **(new on the day)**. Then
       `./tools/make-forge-home.sh` (no change: it derives `res/` from the jar's
       directory) and `./bridge/build.sh`.
7. [ ] **Run the gate:** `WSPORT=<free port> ./tools/check-all.sh`. If the release
       behaves like the snapshot, **step 6 fails** on the order of `cardIds` inside
       `stats` events and nothing else; every other step must pass, 9c's ten games
       and 10g's three included. Re-recording `g1` (probably `g2`/`g3`) is a
       **separate commit and a separate decision** (§5.4), never a side effect.
8. [ ] **Play.**
       ```bash
       ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 \
           --deck decks/fra-rw-aggro.dck --deck2 docs/drafts/decks/fra-gb-leftovers.dck
       ./bridge/run.sh mtgtable.RecordMatch --deck decks/fra-rw-aggro.dck \
           --deck2 docs/drafts/decks/fra-gb-leftovers.dck --seed 1 --out var/fra-ai-vs-ai-1.jsonl
       node tools/check-redaction.mjs var/games/<game-id>/frames.jsonl var/fra-ai-vs-ai-1.jsonl
       ./scripts/play.sh -- --deck decks/fra-rw-aggro.dck --deck2 docs/drafts/decks/fra-gb-leftovers.dck
       ```
       Read **`player turns`**, not just `MTGTABLE OK` (a 0-turn crash still prints
       OK today, §4.4). The last line is the first time a human casts an Empower
       spell (No Admittance) through the bridge: try it first. `--deck2` is how the
       bridge takes the AI's deck today; if the match-setup worktree's
       `--ai-deck` has landed by then, use that.
9. [ ] **Record it:** a `DECISIONS.md` entry for the switch (the next free number at
       merge, at least D95), then the D14 follow-up: retire the A.I.M. Scientists
       overlay and `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE` once the release's own
       script is confirmed (the snapshot's already dropped `K:Trample`).

---

## 1. What the user wants, and what stands between them and it

- **Goal 1:** play their Reality Fracture pre-release pool (`decks/fra-rw-aggro.dck`,
  40 main, 10 sideboard) against the AI, ideally against an FRA AI deck.
- **Goal 2:** watch AI-vs-AI games with it.
- **The obstacle:** Forge 2.0.14 (`2.0.14-SNAPSHOT-08.08`) predates the set. Its
  `Reality Fracture.txt` lists 43 entries and 20 distinct names. Of the user's 50
  cards, 31 copies do not exist in that engine, and Forge drops a missing card from
  a deck **silently** at `Match.prepareAllZones`.

## 2. The measurements that decide it

Every number in this table was produced by the spikes. The three audit rows were
**re-run by this report** with `tools/audit-deck.mjs --classes
var/spike-a/bridge-out`, and each reproduced exactly:

| engine | deck: ok / missing / broken (copies) | games |
|---|---|---|
| **2.0.14 as it runs today** | **19 / 31 / 0** (re-run: 5.7 s). ok = Woodwork Prodigy, 17 basics (FRA→TRK), Austere Command (SPG→MSC) | the deck is not playable: 31 copies would be dropped |
| **2.0.14 + the snapshot's 249 FRA scripts as a user overlay** | **47 / 0 / 3** (re-run: 4.7 s). broken = **No Admittance** (main), Hexhaven Battalion and Way of the Pyromancer (sideboard): `Element Empower not found in ApiType enum` in `CardFactory.getCard` | exact deck, seeds 7/8/9: **0 turns** each, engine crash at zone preparation, `AUTO STUCK`, concede. Without the three Empower cards: 3 MtgTable games and 10 AI games finish, with **17 swallowed AI `NullPointerException`s** in 2.0.14's `ComputerUtil.hasACardGivingHaste` on the new haste statics (Whiplash Wordsmith is one) |
| **snapshot `2.0.15-SNAPSHOT-09.27`, stock scripts** | **50 / 0 / 0** (re-run: 2.9 s), every card set FRA, Austere Command SPG | 16 games with the bridge patch (spike B) plus 13 without it (spike A): **0 exceptions**, 0 UNIMPL, redaction PASS. 24 of 26 distinct names cast. The AI has no logic for `Empower` ("No AI assigned for API: Empower"); it cast No Admittance once in spike B's 11 games and 0 times in spike A's 12 |

Two findings correct the premise both spikes were handed:

- **Nothing in the deck is unscripted upstream.** "Ajani's Anguish, Chandra's
  Emberling and Woodwork Prodigy are missing from the snapshot" was a
  lookup-by-file-name artefact. 249 of the set's scripts live under `upcoming/`, and
  22 carry the prepared spell's name in the file name
  (`w/woodwork_prodigy_soul_tether.txt`). Both spikes found this independently.
  **No card needs hand-writing**, so no drafts were made. The spikes checked the
  snapshot's Oracle text for the deck's 25 FRA names against Scryfall: 23 match
  exactly. Pyre Rhymer's Molten Tide face has a display-only typo ("additonal"),
  and Ghalta differs by an apostrophe.
- **The seam change is smaller than briefed.** No new abstract member appeared, and
  the abstract set shrank from 37 to 28. The overlay pair and `updateShards` became
  defaults rather than being removed. `tempShowZones`, `hideZones` and
  `restoreOldZones` were deleted. `IGameController.passPriority()` is gone.
  Spike B's patch is two files, +18/−59 lines of code, and needs no `Snap`, lint,
  protocol or `check-forge.sh` change.

## 3. The overlay test, applied strictly

The bar for "overlay" was: the snapshot's FRA scripts load into 2.0.14 with **zero
parse errors**, **zero silently ignored mechanics for every card in the deck and
sideboard**, and **no hand-written scripts**.

| criterion | result | met? |
|---|---|---|
| zero parse errors | 249 of 249 parse into `CardRules`, 0 "Error loading cardscript" | yes |
| no hand-written scripts | none needed: all 285 names are Forge's own | yes |
| zero broken or silently ignored mechanics, deck + sideboard | **3 cards cannot be built** (Empower). Any unbuildable card crashes the game before turn 1, including one in the sideboard, so the exact deck **cannot start a game**. Also, 2.0.14's AI throws on the new haste statics and skips the option. And "builds" is not a rules review: a parameter 2.0.14 never reads (`YouScryThisTurn`, `PlaneswalkerType`, `dealtCombatDamagetoAny` were found by a constant-pool scan) is ignored without a word. None of those three is in this deck, but the scan is a heuristic and cannot prove absence | **no** |

**Verdict: the overlay fails.** Beyond the failed criterion, it would also:

- make about 250 scripts "custom", when D14 accepted `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`
  only while `forge-home/custom-cards/` holds exactly one file;
- need a user edition file that replaces stock FRA with a `CUSTOM_SET`, or else
  every overlaid card resolves to `USER`;
- leave the user's deck needing edits (swap No Admittance, drop two sideboard
  cards). For a hobbyist learning Magic, a card that silently misbehaves is worse
  than a card that is absent.

`port` and `both` are not on the table: the user does not want a development
snapshot wired in. For completeness, the port would also not be ready today:

- **A race in the bridge's M6 lifecycle.** The previous game's late `finishGame`
  can land after the next game's `openView` has reset `overEmitted`
  (`WireGuiGame.java:816`), so the next game is born dead. It happened in 2 of 6
  three-game sessions on the snapshot and 0 of 5 on 2.0.14.
- **Committed fixtures would change.** Strict gate step 6 fails on the snapshot
  because 290 `stats` events list their `cardIds` in a different order, which
  forces a re-record of `g1` (and probably `g2`/`g3`).
- **A daily build** is not a release.

## 4. What the gate showed, independent of the engine

These were found while measuring. They are defects in the gate and bridge as they
stand on `main` today, and none of them forces in a card. Each is a candidate for
its own small change on `main` whenever the user wants it; **none is made here.**

1. **The M6 next-game race** (above). It is latent on 2.0.14 (0 hits in 5 sessions)
   and **must be fixed before any engine switch**. Spike B's evidence gives two
   candidate fixes: defer `nextGameDecision` until this game's `finishGame`, or make
   a stale `finishGame` a no-op keyed by a per-game generation. Choosing one is a
   `DECISIONS.md` entry.
2. **`check-all.sh` step 6 dies silently.** At `tools/check-all.sh:231`,
   `diff … | head -20` runs under `set -o pipefail` (line 140). A long diff exits
   141 and `set -e` ends the gate before `die` prints "FAILED at step 6". Step 6 is
   also load-sensitive on 2.0.14 itself, because `GameEventForwarder`'s 500 ms flush
   moves frame boundaries.
3. **Step 10g does not assert that each game was played.** It printed "OK: three
   games" over a game that died at birth. Only `web/test/ws-log.test.ts` caught it,
   at step 13.
4. **`MtgTable` prints `MTGTABLE OK` and exits 0 on a 0-turn crash.** That file
   belongs to the match-setup worktree.
5. **`check-redaction.mjs` A10 warns about an opponent's spell that is already on
   the stack.** Found by the preparation pass: in an automated-seat game against a
   blue-black test deck, the engine's "counter unless you pay {3}" prompt names the
   counterspell (`"Icy Reception (58) … Pay Mana Cost: {3}"`) and A10 printed 8
   advisory `~` lines, because the checker's `lastZoneOf` map is filled only from
   `players[].zones` and never from `stackCards`: card 58 is public and named on the
   stack in the two `state` frames before the prompt, but the map still says
   "opponent's hand". It is a WARN, the file PASSes, and the leak it describes is
   not real. A counter-unless-pay spell cast at the seat had never happened in the
   corpus, which is why it never showed. Fixing it means updating `lastZoneOf` from
   `stackCards` (with a negative control); it is not engine-specific.

## 5. The plan for the day an official release ships Reality Fracture

### 5.0 What is already prepared, and nothing in it changes how the game runs today

| file | purpose |
|---|---|
| `decks/fra-rw-aggro.dck`, `decks/fra-rw-aggro.txt` | the user's pool: 40 main + 10 sideboard, from the user's own list (the `.txt` names the source and says the deck does not play on 2.0.14). Austere Command is `\|SPG` (its FRA-release printing is Special Guests; `\|FRA` silently falls back to MSC) |
| `docs/drafts/decks/fra-gb-leftovers.dck`, `docs/drafts/README.md` | a **draft** FRA opponent: the green-black "second deck from the leftovers" the user's own list proposes, finalised to 40 with basics only. Outside `decks/` because `cards-lib.test.ts` parses every entry in `decks/` (a `decks/README.md` or a `decks/drafts/` directory would fail step 13) |
| `tools/audit-deck.mjs`, `tools/audit-deck/AuditDeck.java` | per-card ok / missing / broken against any jar (`FORGE_JAR=…`). Read-only, writes only under `var/audit-deck/`, negative-controlled (175/175 on the MSH and probe decks) |
| `tools/javap-seam-diff.sh` | spike B's 95-class javap recipe as a read-only script: `<old.jar> <new.jar>` in, the seam diff out. Reproduces spike B's diff line for line |
| `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch` | the seam port, with the snapshot's build identity (version, sizes, sha256s) and the seam diff in its header. `git apply --check` passes. **One-way**: 5 compile errors on 2.0.14, so it stays a patch until the switch |
| `docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt` | the seam the patch was written against, to diff the release's against (§0 step 5) |
| `docs/evidence/engine-upgrade.md`, `docs/research/08-deck-card-coverage.md` §9 | the measurements and reproduce commands; the card-by-card view of the deck |

None of them is read by the game, the bridge build, `make-forge-home.sh` or the
web client. `bridge/`, `config.json`, `tools/check-forge.sh`,
`forge-home/custom-cards/` and every committed fixture are exactly as on `main`, and
`./tools/check-all.sh` is green with these files present (evidence, "Preparation
pass").

### 5.1 How we know the day has come

The user can check this, or a session can on request; nothing is scheduled.

- A new tag appears on `https://github.com/Card-Forge/forge/releases.atom` that is
  **not** `daily-snapshots`.
- In that release's tarball, `res/editions/Reality Fracture.txt` lists the full set
  (461 entries in the snapshot).
- **The release must be a release build.** `CardStorageReader.collectCardFiles`
  skips `upcoming/` unless `BuildInfo.isDevelopmentVersion()`. If the release still
  keeps FRA under `upcoming/`, a release jar would silently load none of it. The
  audit tool's "expect 50 ok" is exactly the check for this.

### 5.2 Obtaining and pinning the jar — new file `tools/get-forge.sh`

Today the jar path is a machine-local absolute path in `config.json`, which a fresh
clone cannot reproduce. On the day, the pin moves into the repo, and the bytes go
under `var/` (gitignored), never under `~/forge`:

```
var/forge-engine/<version>/                      # e.g. var/forge-engine/2.0.16/
    forge-gui-desktop-<version>-jar-with-dependencies.jar
    res/                                         # the release's res/, beside the jar
    .verified                                    # written last, after every check passes
```

**`tools/forge-engine.json`** is a new committed file, written by hand like
`tools/assets-manifest.json`: the evidence is what was true on the day.

```json
{
  "version": "2.0.16",
  "implementationVersion": "<manifest Implementation-Version, verbatim>",
  "url": "https://github.com/Card-Forge/forge/releases/download/<tag>/<asset>.tar.bz2",
  "archiveBytes": 0, "archiveSha256": "<sha256 of the tarball>",
  "jarName": "forge-gui-desktop-<version>-jar-with-dependencies.jar",
  "jarBytes": 0, "jarSha256": "<sha256 of the jar>",
  "retrieved": "YYYY-MM-DD", "licence": "GPL-3.0 (Forge)"
}
```

The asset name and tag format must be read off the real release page on the day.
They are not guessed here.

**`tools/get-forge.sh`** (new, about 60 lines of bash, sources `config.sh`):

1. Read `tools/forge-engine.json`. Refuse any target that does not resolve under
   `$REPO_ROOT/var/forge-engine/`. It also refuses any path under
   `/home/justin-a/forge` or `~/.forge`, as a guard, not a hope.
2. If `.verified` exists and the jar's sha256 still matches, exit 0 (idempotent).
3. Download with `curl -fL` into `var/forge-engine/<version>.part/`, check
   `archiveBytes` and `archiveSha256`, extract only the jar and `res/`, check
   `jarBytes` and `jarSha256`, `javap`-assert that `IGuiGame` exists, then
   `mv -T` the directory into place and write `.verified`. Any mismatch deletes the
   `.part` directory and exits non-zero. **Never auto-update**: a new version is a
   hand edit of `forge-engine.json`, reviewed like code.

**`config.json`** changes on the day, and only on the day:

```json
"forgeJar": "var/forge-engine/2.0.16/forge-gui-desktop-2.0.16-jar-with-dependencies.jar",
"forgeJarSha256": "<same as forge-engine.json jarSha256>",
"forgeVersion": "<Implementation-Version>"
```

`tools/config.sh` needs one small edit: resolve a **relative** `forgeJar` against
`$REPO_ROOT`. Hard rule 9 says to read the jar from `config.json`; it does not say
the path must be absolute. `FORGE_JAR` in the environment still wins.
`tools/make-forge-home.sh` needs **no** change: it already derives `res/` from the
jar's directory (spike B confirmed with `readlink -f`).

**`tools/check-forge.sh`** gains the pin assertions, after its existing class and
member checks (it already prints the sha256):

- if `config.json` carries `forgeJarSha256` and `FORGE_JAR` came from config (not
  the environment), fail on a mismatch with *"jar is not the pinned engine; run
  tools/get-forge.sh"*;
- fail if the jar's manifest `Implementation-Version` differs from `forgeVersion`;
- an explicit `FORGE_JAR=` override only prints a loud `UNPINNED ENGINE` line. That
  keeps `audit-deck.mjs` against an arbitrary jar possible, which is how the next
  release gets evaluated.

**The 2.0.14 install at `~/forge` stays untouched.** Nothing reads or writes it
after the switch except by an explicit `FORGE_JAR=`. Rollback is a one-line revert
of `config.json` plus reverting the patch. Before and after the first run on the
new engine, `sha1sum` the `~/.forge/decks/constructed/` tree and the `~/forge` jar
(CLAUDE.md, *Never write outside this repo*).

### 5.3 The switch, in order

**§0 is the list.** It supersedes the first draft of this section, and its order is
deliberate in three places:

- **The race fix comes first,** on `main`, before any engine moves. It is a real bug
  on 2.0.14 too, independent of the cards, and the one known blocker: on the
  snapshot it killed a game in 2 of 6 three-game sessions.
- **The audit (§0 step 4) comes before the patch (step 5).** `audit-deck.mjs` needs
  no ported bridge: it links the 2.0.14-compiled `mtgtable.Bootstrap` against the
  new jar, which works because `IGuiBase` is byte-identical across the two (it did
  so against the snapshot). So a release that still keeps FRA under `upcoming/`, or
  ships a card that does not build, stops the switch before any code changes.
- **The seam is compared, not assumed (step 5).** `tools/javap-seam-diff.sh`
  regenerates spike B's 95-class diff for the release jar, and the saved snapshot
  diff is the baseline. The patch is applied only when the release's seam moved the
  way the snapshot's did.

### 5.4 Fixtures, if the engine changed how games play

Spike B measured that the snapshot plays **the same games** as 2.0.14 at every MSH
seed tried: the same 1,651 events in `g1`, the same ten-games turn counts, and the
same `human-auto-42` events. It differs in one thing, the order of `cardIds` inside
290 `stats` events. The procedure on the day:

1. For each committed recording, re-record at its own seed and flags (each file's
   session header names them) into `var/`, then compare. Use `tools/fixture-multiset-diff.mjs`
   for frame-order-insensitive content, and for step-6-style files a normalised diff
   that also **sorts `stats.cardIds`**, so that ordering noise is separated from real
   change.
2. If a recording differs **only** by `stats` order or frame batching, re-record it
   at the same seed with the same flags (for example `RecordMatch --deck
   decks/pacho-shield.dck --seed 42 --out fixtures/games/g1.jsonl`, run on an idle
   machine). Note in the commit that content is unchanged.
3. If a recording differs **in content** (a different winner, different asks,
   different turns), stop. That is a rules change in the engine and gets its own
   look before any fixture moves.
4. Every re-recorded file then goes through `check-redaction.mjs` (never with
   `--pre-amendment` or `--opponent-library-ok`), and then `npm --prefix web test`,
   because `render.test.tsx` replays every fixture twice.
5. Re-recording is a **separate commit and a separate decision** from the engine
   switch. The session header already carries the jar sha256, so every new recording
   names its engine.

### 5.5 On the day, also decide (not forced by the seam)

- **D14's A.I.M. Scientists overlay** is redundant upstream: the snapshot's script
  dropped `K:Trample`. Retiring it would also let the bootstrap stop setting
  `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`. This needs a re-check on the release
  and is a D14 follow-up.
- **The `input.openZones` `{hand}` hint** no longer arrives (the `tempShowZones`
  path is gone). The wire shape is unchanged. Restoring it from `Snap`'s per-id zones
  would be a new decision.
- **Prepare** (three cards in the deck) has a prepared flag
  (`CardView.hasPreparedSpell()`, new in 2.0.15) and a spell face that the wire does
  not carry for a face-up card. Hard rule 8 keeps `getAlternateState` inside the
  face-down `alt` block. Surfacing either is a protocol amendment plus a hard-rule-8
  review, not a port detail. The game still plays without it; the player just cannot
  see "prepared" on the board.
- **Empower has no AI logic** in Forge. That is Forge's to close, not ours.

## 6. Risks

| risk | mitigation |
|---|---|
| The release differs from the 09-27 snapshot the patch was written against | §0 step 5 diffs the release's seam against the saved snapshot seam (`tools/javap-seam-diff.sh`) before anything is applied; the patch is a guide, not a promise |
| The release ships FRA under `upcoming/` in a non-development build, so 0 of the set loads | §0 step 4's audit (expect 90 ok over both FRA decks) catches it before any code changes |
| Upstream moves a jar or retags a release | `tools/forge-engine.json` pins bytes and sha256; `get-forge.sh` refuses a mismatch; `var/forge-engine/` keeps the verified copy |
| A fresh clone has no jar | `tools/get-forge.sh` is step one of setup; `check-forge.sh` names it in its failure message |
| Two engines drift apart in the tree | there is **one** pinned engine at a time. 2.0.14 remains only as an unmodified install and a `git revert` away, never as a second supported configuration |
| The next-game race ships with the switch | it is step 0, and 10g should assert every game was played (§4.3) so the gate would catch it |
| A committed fixture is silently re-recorded along with an engine change | §5.4: a separate commit, content-diffed first, and stopped on any real change |
| The snapshot artefacts disappear | they live in the session scratchpad under `/tmp`. The evidence file records the jar's sha256 (`70f756bc…4f229`, re-checked here) and build date, which is enough to recognise the build. The measurements do not need to be reproduced from it, because the release supersedes it |
| The new deck appears in the dev card browser with unresolved cards | cosmetic; it resolves when the card library syncs `fra` |
| A draft is mistaken for a reviewed deck | the opponent lives in `docs/drafts/`, not `decks/`, and says "draft" in its own `Name=`; it moves only when the user accepts it |
| `check-redaction.mjs` A10 warns on a counter-unless-pay prompt against the seat (§4.5) | advisory only, and the card is public on the stack; worth a checker fix with a negative control before FRA's counterspells become routine |

## 7. Decisions only the user can make

1. **Confirm WAIT**: no FRA play until an official Forge release ships the set, and
   the three Empower cards stay as printed (no deck edits to dodge the engine).
2. **Fix the next-game race on `main` now**, as its own change, or leave it for
   the day. It is a latent bug on 2.0.14, found here; it does not touch cards.
3. **The gate fixes** (§4.2 step 6's silent exit 141, §4.3 10g not checking that
   each game was played) and `MtgTable`'s OK on a 0-turn crash: fix now or later,
   and who owns them (`MtgTable` belongs to the match-setup worktree).
4. **Keep the prepared files** (§5.0's table: the decks, `tools/audit-deck*`,
   `tools/javap-seam-diff.sh`, `docs/research/patches/`, `docs/drafts/`, the evidence
   and this report) in the tree to commit, and whether `audit-deck.mjs` should join
   `check-all.sh` (it needs a compiled bridge, takes 3–6 s, and would run over the
   MSH and probe decks) or stay a hand tool.
5. **On the day: re-record the committed fixtures** (`g1`, likely `g2`/`g3`) if they
   differ only in `stats` order. This is a separate decision from switching the
   engine.
6. **On the day: accept moving the engine pin into the repo** (`tools/forge-engine.json`,
   `var/forge-engine/<version>/`, a relative `forgeJar`) instead of an absolute path
   to a hand install.
7. **An FRA opponent.** `docs/drafts/decks/fra-gb-leftovers.dck` is the user's own
   "second deck from the leftovers" (green-black), with only the 18 basics added.
   Accept it (copy it into `decks/`), change the mana, or supply another list. On
   the snapshot it beat the red-white deck 25–15 when the Forge AI piloted both,
   which says little about a human at the red-white seat. A blue-black list invented
   from the set was measured first and dropped in favour of the user's own
   (evidence, "Preparation pass"): which cards the AI plays is the user's call.
8. **Later, not on the day:** whether the board should show Prepare (the prepared
   flag and the spell face). That means a protocol amendment and a hard-rule-8 review.
9. **On the day, D14:** retire the A.I.M. Scientists overlay and the conformance
   relaxation once the release's A.I.M. Scientists is confirmed correct.
