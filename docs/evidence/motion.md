## The comic motion lane — bursts, lettering, splats, dots, speed lines, on twos, the ink summon

Report 15's Lane MOTION ([`docs/research/15-art-direction.md`](../research/15-art-direction.md)
§5 and §9.2): a comic's motion vocabulary for the arena's cues, with the cue
engine's rules unchanged. Built in the worktree `/home/justin-a/code/mtg-table-t2m`,
branch `motion`, from `c81f674` (`main` at `a092d3a` plus the art-direction
report and its `?look=comic` spike). Decisions **D130–D136** (the lane's reserved
range, renumbered contiguously at merge). Everything below was measured on this
machine on 2026-09-28; every frame time says what drew it.

### What it is

| beat | where it fires (comic FX on) | kit |
|---|---|---|
| **impact star** | every struck body (unlettered); lethal damage **POW**; a block's contact; a strike's target | `burst` shape on a `glow` slot, normal-blended |
| **lettering** | the per-card rows: POW, BLAM, KRAK, ZZAK, WHOOSH — a closed list | the word drawn ON the star (D133): one slot, not two |
| **ink splat** | a creature that dies from the battlefield (not a discard, not a spell resolving) | `splat` shape on a `ring` slot, flat under the falling body |
| **halftone** | the flash behind a struck player's life; Coulson's badge ring | `dots` shape on the `plate` / `ring` slot it replaces |
| **speed lines** | every dash: the lunges, the jet, the aegis, the shrink, Fury's charge, a block, the Helicarrier's descent | the one new kind, `streak` (4 slots; pool 45 → **49**) |
| **the ink summon** | every arrival (`toZone: battlefield`, from anywhere else) | `Offset.materialize` 0 → 1, written into LOOK's `uMaterialize` (on this branch's spike material, which has none: `uLook = committed look × materialize`) |
| **impact shake** | a strike landing, a Helicarrier Strike's beam, a death, a lethal blow | `camera.ts`'s existing shake: shake-only, priority 0, one per cue |
| **on twos** | every cue | each cue's progress quantised to 12 drawings/s of screen time, ≥ 4 per cue |

Two switches, both the QUEUE's settings (presentation, like its speed): **comic
FX** (`?fx=classic|comic`, default comic) and **on twos** (`?twos=0|1`, default on,
always off under `prefers-reduced-motion`). Each is a checkbox in the arena's cue
strip and in the workshop's queue bar.

```bash
npm --prefix web run dev
#   /#workshop?card=Nick%20Fury%2C%20Spymaster     play "attacks alone": speed lines, then POW
#   /?look=comic#workshop?card=Peggy               play "enters": the hologram inks in
#   /?replay=games/g1.jsonl#arena                  step to 356 / 359: the Helicarrier's lines,
#                                                  the Doombot's ZZAK, POW, the splat, the dots
#   /?replay=games/g1.jsonl&fx=classic&twos=0#arena   the same film before the lane
```

### The A/B is honest: comic FX off is the film before the lane, op for op

A cue's comic-only effect keys are declared apart (`CueDef.comic`) and released by
`end()` only for a comic cue, and every lane helper emits nothing with comic FX
off. **Measured**: the pre-lane engine (`c81f674`, from `git archive` into
`var/motion/base/`) and this tree with `comic: false, onTwos: false`, run over all
**19** committed recordings through the real queue against a `NullStage`, 25 ms
ticks, draining each batch — **310,369 ops each, sha256
`3710d0b439f9d022157a14c4229eaeb129e627d58ae3a3de527e7255bda45f81` both**, with the
one new `Offset` field (`materialize`) stripped at its identity value. (The first
run differed by 19,716 no-op `clearEffect`s of keys a classic cue never set; that
is what `CueDef.comic` is for.) `web/test/motion.test.ts` holds the committed
half: no comic op, no materialise and no impact shake with comic FX off, over the
whole corpus.

With comic FX on, the same corpus plays **9,964** ink / streak / lettered effect
ops, **3,947** streak ops, **9,805** materialise offsets, **477** impact-shake
requests and **1,598** lettered bursts (POW 556, WHOOSH 552, ZZAK 242, KRAK 214,
BLAM 34) — and every batch still drains to an empty offset, effect and clip map.

### Pictures

All headless Chromium on the GTX 1080 (`ANGLE (NVIDIA Corporation, NVIDIA GeForce
GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`), 1600 × 1000, the dev server, the queue paused
and stepped by hand (`queue.advance(ms)`, then fiber's own `advance()`). **Before**
is the same build at `?fx=classic&twos=0` — the pre-lane film, above — and
**after** is the lane's default. Workshop shots are the pedestal crop at the
default framing (1× close, faces its player, target dummy, bloom) unless noted;
aimed beats whose target is off the close-up are at table distance or the whole
table. Every picture was re-shot from the final tree at 02:36–02:41 on
2026-09-28 (the continuation pass, same driver and scripts, dev server on port
5192); the workshop shots came out byte-identical or within a few hundred bytes
of the first set. The table shots wait 15 s after the seek, because the first
re-shoot waited 3.5 s and caught the cards before their Scryfall images arrived
(text frames). The one code change after them — `applyMaterialize` now writes
LOOK's `uMaterialize` first when a material has it (D131) — takes the same fallback
path on this branch's spike material, so they stand. Local, gitignored, under
`var/motion/png/`:

| pair | what the after shows |
|---|---|
| `{before,after}-fury-attack.png` | Fury's charge on speed lines, POW at the top of the dash |
| `{before,after}-peggy-attack.png` | her aegis dash on lines, POW |
| `{before,after}-agents-attack.png` | the squad's lines streaming back over its card |
| `{before,after}-agent13-attack.png` | BLAM on her muzzle |
| `{before,after}-coulson-counter.png` | the badge's ring as a Ben-Day dot burst |
| `{before,after}-coulson-lethal.png` | POW over the struck body |
| `{before,after}-coulson-dies.png` | the splat under the falling body |
| `{before,after}-antman-hit.png` | POW as he pops back to size |
| `{before,after}-helicarrier-enters.png` | the descent on lines, WHOOSH |
| `{before,after}-quake-resolves.png` | KRAK where the fissure lands (table distance) |
| `{before,after}-wasp-cast.png` | ZZAK where the beam lands (table distance) |
| `{before,after}-doombot-attack.png` | ZZAK where the laser lands (whole table) |
| `{before,after}-airforce-cast.png` | WHOOSH where the swarm arrives (table distance) |
| `{before,after}-coulson-hits-player.png` | the halftone flash behind the life total (whole table) |
| `{before,after}-{fury,peggy}-enters-comiclook.png` | under `?look=comic`: the figure still a hologram mid-summon |
| `{before,after}-workshop-page-comiclook.png` | the whole page, the queue bar's two new checkboxes |
| `{before,after}-table-g1-355.png` | the arena's table view at the budget frame, at rest — identical |
| `{before,after}-table-g1-356-attack.png` | +330 ms: the Helicarrier's dash on lines |
| `{before,after}-table-g1-356-laser.png` | +1,100 ms: the Doombot's lines and its ZZAK |
| `{before,after}-table-g1-359-lethal.png` | +200 ms: POW on the ant; **before**, the old push-in has swung the camera to the graveyard pile (D134) |
| `{before,after}-table-g1-359-player.png` | +620 ms: the halftone flash at your life |
| `{before,after}-table-g1-359-splat.png` | +1,770 ms: the splat under the falling ant |

What the pictures found, and the code changed for:

- **Speed lines led the dash** in the first cut: a body stands 0.52 in front of its
  card, so at the top of a lunge it has passed the lane anchor it dashes at, and
  "head → anchor" flips. The lines now lie along the motion's own vector
  (`Effect.from → to`, the card's rest to the anchor — the vector the offset
  travels), and a dash is flattened to the table unless it is mostly vertical.
- **The lettering was cut by the body it names**: a star is now pulled toward the
  lens by half its size.
- **The splat was invisible on the hologram's felt** (an ink body with a coloured
  rim) and **hidden inside a flier's falling body** (the "ground" of a departing
  flier kept its lift). The splat is now the card's colour with an ink outline,
  sized to the body (`fit`, `#fitOf` reading the departing body), on the ground.
- **The old lethal push-in framed the card in its graveyard** while the star
  landed on the body; under comic FX a lethal blow jolts instead (D134).

### Frame times

`tools/arena-bench.mjs --index 316 --settle 4000` (warm), production build of the
final tree, `vite preview` on port 5192, a 1920 × 993 viewport at dpr 1, 4× replay,
05:32–05:38 on 2026-09-28. **The machine was not idle**: a likeness job was running
SPAR3D on the same GTX 1080, another worktree's JVM gate and two other headless
Chromiums ran throughout (load average 4–9, printed per run). Raw logs:
`var/motion/bench-final/` (driver `var/motion/bench-final.sh`); the first pass's
logs, at load 6–17 and before the documentation pass, are `var/motion/bench/` and
say the same thing. "Base" is `c81f674` built from `git archive`
(`var/motion/base-web/`); comic and classic are this branch's build with and
without `?fx=classic&twos=0`. Two runs each, **p50 / p95 ms (load)**:

| rasteriser, bloom (app default: on) | base | classic | comic |
|---|---|---|---|
| **GTX 1080** | 0.5 / 1.6 (9.2) · 0.5 / 4.4 (5.9) | 0.5 / 1.6 (5.2) · 0.5 / 1.4 (5.5) | 0.5 / 9.6 (5.9) · 0.5 / 8.0 (6.3) |
| **SwiftShader** | 14.1 / 18.5 (8.1) · 15.2 / 33.6 (6.1) | 14.9 / 17.5 (7.2) · 14.5 / 19.0 (4.7) | 15.0 / 33.2 (8.9) · 14.0 / 16.6 (4.2) |
| **GTX 1080, bloom off** | 0.5 / 0.9 (7.1) · 0.4 / 1.5 (5.6) | 0.4 / 5.4 (5.7) · 0.4 / 0.5 (5.5) | 0.4 / 0.9 (6.4) · 0.4 / 2.1 (4.0) |

Read: **the three are the same within this machine's noise on both rasterisers.**
p50 is 0.4–0.5 ms on the GTX 1080 and 14.0–15.2 ms under SwiftShader for every
variant; p95 moves between runs of the SAME build by more than it moves between
builds (SwiftShader base 18.5 → 33.6, comic 33.2 → 16.6), and the GPU's max of
50–170 ms is a periodic stall every variant shares while the likeness job holds
the card. The comic column's GPU p95 with bloom on (8.0 and 9.6) is the one
number that leans against the lane; the same build with bloom off is 0.9 and 2.1,
and the first pass measured comic 8.6 / 9.6 against base 10.8 / 8.3 — so it is not
read as a cost. Programs: **16** with bloom off and **28** (SwiftShader) / **31**
(GTX 1080) with it on, in every variant — the lane adds no program. Report 09
§9.4's gate (p95 ≤ 20, max ≤ 50) is failed on max by every variant here, the base
included, because of the shared stalls.

**Draw-call census** (dev build, GTX 1080, `?bloom=0`, 1600 × 1000, `g1`, the queue
paused mid-cue): at rest @355 **79 calls, 27,416 triangles** in both; @356 +330 ms
**79 → 80** (+1, the Helicarrier's streak); @356 +1,100 ms **82 → 84** (+2, the
Doombot's streak and ZZAK); programs **15** in both. (Report 13 §8.2's budget line
is ≤ 90 calls; the lane's worst case is +4 streaks + its stars inside the
eight-slot cap.) Textures: +1 to +4 as the star, word, dot and splat canvases are
first drawn (lazily, once per page; a lettered star is 512²).

Build (gzip): the 2D entry chunk **87.67 kB, unchanged byte for byte** from the base
build (281.34 kB raw both) and carrying no `three` and no lane code;
`arena-scene` 351.20 → **356.07** kB; `Arena` 14.58 → 14.85 kB; `Workshop` 23.64 →
23.89 kB (the final tree, `var/motion/build-final.log`).

### Tests

`npm --prefix web test`: **892 `node --test` + 94 vitest (6 files)**, 0 failures
(baseline on `c81f674`: 870 + 94). New: `web/test/motion.test.ts` (11 — on twos'
properties and the queue's stepping, the two switches, the closed word list, the
classic/comic A/B over the corpus); `cues-exhaustive.test.ts` (+5: the pooled
compose with `materialize`, the new params' ranges, every cue decaying with comic
FX and every comic param on, the beats landing on the body the event names, reduced
motion, the shake's shape); `replay-cues.test.ts` (+1: the net over the lettering
and every `text`); `liveness.test.ts` (+1: the lane's frame-loop bodies allocate
nothing, the look is written only by `applyMaterialize`, the pool is 49 and the
streak is counted against the cap); `camera.test.ts` (+3: one shake per cue, the
director's rules, the auto director over the corpus with the shakes in play —
**37 shakes taken, 168 dropped**, the shot rules hold); `workshop.test.ts` (+1:
every headline beat is rehearsable on the pedestal, and absent with comic FX off).

### The gate

`rm -rf bridge/out && WSPORT=8715 ./tools/check-all.sh`, the final tree, in this
worktree: **929 s, exit 0** (`var/check-all-motion.log`), 05:38–05:53 on
2026-09-28, at a load average of 6–10 (another worktree's gate, a likeness job and
other headless Chromiums). 9c's fourteen games **403 s**; step 6's byte-strict
seed-42 diff identical (377 lines); 9b advisory only (the known `c2s`-only
difference). The web step inside the gate: **902 `node --test` / 894 pass / 0
fail / 8 skipped** (the ws-log suite skips the candidates `MTGTABLE_WS_LOGS` does
not name) **+ 94 vitest**. The lane added no gate step. An earlier full run of the
same code before the documentation pass passed too (898 s, exit 0,
`var/check-all-motion-prev.log`); a third, started at 02:41, was cut at step 10 by a
usage limit and is kept as `var/check-all-motion-cut-0241.log` — it says nothing
either way.

`~/forge` and `~/.forge`: `find -type f -printf '%p %s %T@'` over both, taken at
00:11 before the lane's first run and again after this gate, **identical — 21,374
files, every path, size and mtime** (`var/motion/forge-{before,after}.txt`); the
jar's sha256 is still `3c0a7c38…8e5dd9`.

### What is not done

- **The summon's fallback outlives this branch only until LOOK merges.**
  `applyMaterialize` writes LOOK's `uMaterialize` handle whenever a figure material
  has one (branch `look`, `7d91dcd`) and otherwise scales `uLook` itself, which is
  all the spike's `holoMaterial.ts` here allows; the fallback is deleted at the
  merge (PLAN, the lane's follow-up 2), where LOOK's liveness clause would
  otherwise fail on it.
- **The death's reverse summon has only its cue half.** `zone.dissolve` ramps
  `materialize` 1 → 0 on the dying card, but the departing body is `FigureLayer`'s
  `DepartureField`, LOOK's file (PLAN, the lane's follow-ups).
- **A summoned figure's props do not materialise** — the prop field's own `uLook`
  is written at commit by `PropField.setLook` (LOOK's), per kind, not per figure.
- **A camera shake is not seen on the pedestal**: `PedestalDirector` drops every
  camera request by the workshop's convention (the pedestal's camera is yours);
  the arena shows it.
- On twos steps each cue, not the idle breathing and not the camera — deliberately
  (D132).
