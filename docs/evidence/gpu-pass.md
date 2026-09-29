# The GPU pass — the whole arena measured, and what it paid for nothing (2026-09-29, D270–D273)

Eight lanes landed on the arena's frame loop since the last GPU measurement — the
comic look's ink and bands, MOTION's bursts and halftone, the status layer's strip
and turn bar, the personal tier's models and the relief window, villain identity's
props and the terrain's cap of 32, sound, the caption strip — and each measured
only itself. This pass measured the whole, removed what the frame loop paid for
nothing, and graded the two open performance items. Branch `gpu-pass` off `main`'s
`e2c337c`, worktree `mtg-table-t2g`; decisions **D270–D272**, and **D273** from
its fix pass (§10: what a skeptic's re-measure found, and what was done about it;
the lane reserved D270–D274).

## 0. The fixes, one line each (before → after, same bench line)

| fix | the number that moved (what drew it) | before → after | held by |
|---|---|---|---|
| **1. No colour string parsed in the frame loop** (D271.1) | `Color.setStyle` calls a frame, pumped batch, DEV server, GTX 1080 | 57 (`g1`@316) · 66 (@370) · 76 (Masters @476) · 99 (Wakanda @527, Doom @393) → **0** | `liveness.test.ts` (the colour clause, five spliced controls; the bodies in the allocation scan) |
| **2. The prop field refreshes only the joints it reads** (D271.2) | `Object3D.updateMatrix` calls a frame, same | 1,417 → **984** (@316) · 2,020 → **1,337** (Masters) · 1,955 → **1,327** (Wakanda) · 1,532 → **1,096** (Doom) | `gpu-pass.test.ts` (every body's chain against `updateMatrixWorld(true)`; a missing link as the control) |
| **3. Bone trees hidden from the render walk** (D271.3) | what `projectObject` walks at `g1`@316: 871 objects, 618 of them bones | the 618 bones **leave the walk** (their tree roots are hidden); its self time over a pumped Doom death batch 10.0 → **4.3** ms / 200 frames | `gpu-pass.test.ts` (no bone walked, no mesh lost, on all 38 bodies; a mesh under a bone keeps its tree) |
| **4. An empty tile kind is not set up** (D271.4) | render-list items at zero instances, `g1`@370, 450 pumped frames | 450 → **0** (no draw call either way: three skips zero-instance draws) | `gpu-pass.test.ts` (a bucket is visible iff it holds a tile; prime shows all; the old field as the control) |
| **5. An unchanged buffer is not re-sent** (D271.5) | `bufferSubData` a frame, pumped batch | 70 → **31** (@316, @370) · 71 → **20** (Masters) · 70 → **30** (Wakanda) · 78 → **32** (Doom). **Its cost** (the fix pass, §10): unthrottled on the GTX 1080 the WebGL command buffer's drain comes less often and lasts longer — the bench frame's max, bloom off, 35–37 → **52–53 ms**; at a browser's pacing (`--vsync`) no drain in either build (D273) | `gpu-pass.test.ts` — the tile field, the prop field and the status strip each held to "flagged iff its array changed" through still, moved, faded and washed frames, with a buffer flagged every frame and a write left unflagged as the controls; the writers store setMatrixAt's bits (the float64 comparison as the control); seven source reverts each turn it red (§10.7) |
| **(1–5 together)** the frame loop's share | `CueRunner`'s `useFrame`, inclusive, pumped Doom @393 death batch, DEV, GTX 1080 | 19.2% → **12.7%** of the main thread (32.7 → 24.9 ms / 200 frames); `DiscField.bind` (props inside) 14.5 → 7.5; `applyOffsets` 4.9 → 2.8; `TileField.bind` 2.9 → 0.8 | the above |
| **6. The governor takes a decided verdict early; the settle counts in time** (D272) | SwiftShader, `g1`@316, bloom on by default: from the scrub to render dpr 0.6 with the composer off; interleaved production builds — and the bench's own line, the default page (bloom on, governed) at all five frames | 7.6 s · 9.2 s · not in 14 s (57 frames of 100–200 ms) → **4.6–7.2 s (29–32 frames)**; the bench's p50 **111–116 → 15.7–19.7 ms** at loads of 2.5–6 (41 → 116–198 frames in the sample: the base build was still descending with bloom on when the sample ended, this one has settled) — under load the ladder does not always finish inside the sample: 16–38 ms in 13 of 16 runs and 104–164 in 3 at loads of 6–28 (the verifier's), §10.6 for the fix pass's own | `perf.test.ts` (a SwiftShader model: 3.9 s against 7.2; every burst of 1–24 uploads of 30/80/150 ms steps exactly as the full window does; the refresh rate unchanged; the first cut as the control) |
| **7. `<AdaptiveDpr />` removed; `?stats=1` lazy** (D272) | `Arena-*.js` | 48.75 → **46.49 kB** (18.61 → **17.58** gzip) | the build's own output |

A row this table carried before its verification is withdrawn: **the frame body**
(the JS time of one pumped `fiber.advance()`, 0.64 → 0.48 ms a frame at Wakanda
@527). The verifier's own pumped blocks read 0.71 → 0.60 there and 0.48 → 0.88 at
`g1`@316: the page clock is coarsened to 0.1 ms and the timing swings 2–3× under
load (follow-up 8), so it is not a number either way. The counts above are the
evidence, and each reproduced exactly.

Pixels: the bench frame and four others, shot deterministically before and after
(§6), are byte-identical on SwiftShader and with bloom on; on the GTX 1080 with
bloom off any two runs of ONE build differ by one level in 16–26 pixels, and
before/after differ by the same.

## 1. What drew every number

- **Machine**: the dev box — Ryzen 7 9700X (16 threads), GeForce GTX 1080 (driver
  580.178.04), Ubuntu 24.04. Shared all day with three other lanes' headless
  Chromium benches and gates: every row carries the 1-minute load average when it
  ran, and nothing below is from an idle machine. The GTX 1080's clocks were seen
  at P5 (734 MHz) under 100% load as well as P0 (1,632 MHz): its absolute frame
  times depend on where the driver's power management stood, so its comparisons
  are interleaved pairs. **Its max is not load** (corrected by the fix pass,
  §10): unthrottled, a GTX 1080 frame over 30 ms is the WebGL command buffer
  draining (D273; every one traced bloom off, 31–33 of 35 bloom on) — every few
  dozen frames while the driver holds the GPU at P5, and none in the base matrix's
  series, whose GPU kept up — and it can be longer in this lane's build than in the
  base, at the same load, because of D271.5. The draft attributed the GTX maxes
  of §2.2 to load; interleaved pairs at equal load (the verifier's, and §10.5)
  put them on the build.
- **Rasterisers**, as WebGL's unmasked renderer string prints them:
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)),
  SwiftShader driver)` — the default, the software floor; and `ANGLE (NVIDIA
  Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)` — `--gpu gl`.
  Headless Chromium 152.0.7977.64 (snap), window 1920 × 1080, viewport 1920 × 993,
  device dpr 1, `--disable-gpu-vsync --disable-frame-rate-limit`.
- **Builds**: *base* is `e2c337c`'s production build (`vite build`, served by
  `vite preview` on 127.0.0.1:5250), *fix* this lane's. The personal tier exists
  only on the DEV server (D195), so its rows are the DEV server's (`vite` on 5250),
  `personal=1` against `?personal=0`.
- **The bench**: `tools/arena-bench.mjs`, as ever: the page, 6 s to load, scrub to
  `--index`, 600 ms settle (COLD — a fresh card's texture uploads in the sample),
  then play the replay at `--speed` (4 unless said) for 5 s and read every rAF
  interval; the counters (`?glinfo=1`: `gl.info`, the layer census) are read at
  the END of the sample, whose transport index each row names ("counters at"). The
  pass added: **`RENDERED`**, a second line over back-to-back frames the arena drew
  (`gl.info.render.frame` moved) — under `frameloop='demand'` an idle stretch is a
  string of ~0.1 ms rAFs; in every sample here the two lines agree to 0.1 ms,
  because every benched table bobs or animates — **`--speed`**, **`--json`**,
  **`--cpu-profile`** (the DevTools protocol's profile of the sample, 100 µs
  sampling), and the caption's share of the sampled frames. `tools/profile-top.mjs`
  names a production profile's functions through the build's source maps.
- **Frames.** The bench frame, `g1.jsonl --index 316` (four 4× seconds onto
  @350–365); **`g1`'s busiest combat**, turn 25 — five attackers, a blocker, 35
  battlefield cards at @370–375 — benched `--index 369 --speed 1` (the combat's
  own cues, at 1×, for the whole sample); **the Masters of Evil** and **Wakanda**
  near their most crowded tables (40 cards at @438; 48 at @525–532) and the tables
  D233 accepted over 30,000 triangles, benched `--index 388` and `--index 477` (the
  villain lanes' convention: fifty frames before, so the counters are read there);
  **`villain-doom-248`** `--index 342` (onto its 49-card @391), personal tier on and
  off.
- **Scratch drivers** (gitignored, `var/gpu/`): `matrix.mjs` (the bench over the
  matrix), `ab.mjs` (interleaved base/fix production builds), `devprobe.mjs` and
  `pumpcensus.mjs` (the DEV handle: scrub, pause the queue, pump
  `queue.advance(16.7)` and fiber's own pre-bundled `advance()` — the evidence
  technique — with a WebGL call census and three's `updateMatrix` / `setStyle`
  counted per frame), `waste.mjs` (per-frame: buffers flagged with unchanged
  bytes, bone palettes unchanged, render-list items at zero opacity or zero
  instances), `ablate.mjs` / `groundexp.mjs` (a static frame, synced by a one-pixel
  `readPixels`, with parts of the scene moved to layer 31), `rafbench.mjs`,
  `govtrace.mjs` (the governor's descent), `shoot.mjs` (deterministic shots: the
  queue paused, the page clock and the prop field's clock frozen).

## 2. The whole, measured (Part 1)

### 2.1 The bench over the matrix — base (`e2c337c`), production build

09:26–09:40, load 3.4–9.5. Bloom-on rows count one draw call (the composer's last
pass, Tier 2 convention 6), so their calls are not read.

| frame (`--index`, speed) | rasteriser | bloom | `--dpr` → render dpr | p50 · p95 · max ms | calls · triangles (bloom off) | programs | counters at | load |
|---|---|---|---|---|---|---|---|---|
| g1@316 | SwiftShader | off | 1 → 1 | 35.3 · 50.9 · 53 | 88 · 29,501 | 16 | @349 | 4.09 |
| g1@316 | SwiftShader | off | governor → 0.6 | 19.4 · 34.4 · 46 | 91 · 29,535 | 16 | @355 | 6.19 |
| g1@316 | SwiftShader | on | 1 → 1 | 137.8 · 155.0 · 173 | (1: the composer) | 29 | @334 | 7.61 |
| g1@316 | SwiftShader | on | governor → 0.6 | 116.2 · 155.2 · 202 | (1: the composer) | 29 | @337 | 9.53 |
| g1@316 | GTX 1080 | off | 1 → 1 | 0.5 · 0.7 · 12 | 87 · 26,395 | 16 | @365 | 9.54 |
| g1@316 | GTX 1080 | off | governor → 1 | 0.5 · 0.8 · 13 | 87 · 26,395 | 16 | @365 | 8.69 |
| g1@316 | GTX 1080 | on | 1 → 1 | 0.6 · 1.6 · 19 | (1: the composer) | 29 | @364 | 7.97 |
| g1@316 | GTX 1080 | on | governor → 1 | 0.6 · 1.7 · 18 | (1: the composer) | 29 | @365 | 7.59 |
| g1-combat@369 | SwiftShader | off | 1 → 1 | 35.0 · 51.1 · 67 | 89 · 26,621 | 16 | @376 | 6.58 |
| g1-combat@369 | SwiftShader | off | governor → 0.6 | 20.4 · 34.4 · 52 | 89 · 26,621 | 16 | @376 | 6.75 |
| g1-combat@369 | SwiftShader | on | 1 → 1 | 133.3 · 166.5 · 187 | (1: the composer) | 29 | @376 | 5.99 |
| g1-combat@369 | SwiftShader | on | governor → 0.6 | 115.7 · 132.0 · 147 | (1: the composer) | 29 | @376 | 7.30 |
| g1-combat@369 | GTX 1080 | off | 1 → 1 | 0.5 · 0.7 · 14 | 89 · 26,621 | 16 | @376 | 8.91 |
| g1-combat@369 | GTX 1080 | off | governor → 1 | 0.5 · 0.7 · 10 | 89 · 26,621 | 16 | @376 | 8.05 |
| g1-combat@369 | GTX 1080 | on | 1 → 1 | 0.6 · 1.3 · 18 | (1: the composer) | 29 | @376 | 6.70 |
| g1-combat@369 | GTX 1080 | on | governor → 1 | 0.6 · 1.2 · 18 | (1: the composer) | 29 | @376 | 5.83 |
| masters@388 | SwiftShader | off | 1 → 1 | 36.9 · 52.8 · 100 | 101 · 31,249 | 16 | @419 | 5.13 |
| masters@388 | SwiftShader | off | governor → 0.6 | 19.6 · 34.7 · 61 | 100 · 31,247 | 16 | @426 | 5.67 |
| masters@388 | SwiftShader | on | 1 → 1 | 133.3 · 153.1 · 164 | (1: the composer) | 29 | @406 | 5.11 |
| masters@388 | SwiftShader | on | governor → 0.6 | 113.3 · 132.1 · 139 | (1: the composer) | 29 | @410 | 4.81 |
| masters@388 | GTX 1080 | off | 1 → 1 | 0.7 · 1.2 · 18 | 97 · 31,354 | 16 | @437 | 6.49 |
| masters@388 | GTX 1080 | off | governor → 1 | 0.7 · 1.1 · 18 | 97 · 31,354 | 16 | @437 | 5.43 |
| masters@388 | GTX 1080 | on | 1 → 1 | 0.8 · 1.4 · 18 | (1: the composer) | 29 | @437 | 4.59 |
| masters@388 | GTX 1080 | on | governor → 1 | 0.8 · 1.3 · 18 | (1: the composer) | 29 | @437 | 4.28 |
| wakanda@477 | SwiftShader | off | 1 → 1 | 39.3 · 48.6 · 168 | 117 · 31,998 | 16 | @506 | 4.19 |
| wakanda@477 | SwiftShader | off | governor → 0.6 | 20.6 · 37.2 · 111 | 120 · 32,004 | 16 | @514 | 3.78 |
| wakanda@477 | SwiftShader | on | 1 → 1 | 130.4 · 155.4 · 156 | (1: the composer) | 29 | @496 | 4.79 |
| wakanda@477 | SwiftShader | on | governor → 0.6 | 111.3 · 138.0 · 301 | (1: the composer) | 29 | @498 | 5.28 |
| wakanda@477 | GTX 1080 | off | 1 → 1 | 0.6 · 0.8 · 18 | 118 · 32,102 | 16 | @526 | 5.57 |
| wakanda@477 | GTX 1080 | off | governor → 1 | 0.6 · 0.8 · 7 | 118 · 32,102 | 16 | @526 | 4.86 |
| wakanda@477 | GTX 1080 | on | 1 → 1 | 0.7 · 1.6 · 11 | (1: the composer) | 29 | @526 | 4.14 |
| wakanda@477 | GTX 1080 | on | governor → 1 | 0.7 · 1.8 · 19 | (1: the composer) | 29 | @526 | 3.89 |
| doom@342 | SwiftShader | off | 1 → 1 | 37.3 · 51.8 · 62 | 118 · 34,242 | 16 | @375 | 3.68 |
| doom@342 | SwiftShader | off | governor → 0.6 | 20.2 · 31.7 · 162 | 119 · 34,256 | 16 | @378 | 4.27 |
| doom@342 | SwiftShader | on | 1 → 1 | 129.1 · 257.5 · 273 | (1: the composer) | 29 | @360 | 4.25 |
| doom@342 | SwiftShader | on | governor → 0.6 | 112.1 · 140.4 · 144 | (1: the composer) | 29 | @363 | 4.74 |
| doom@342 | GTX 1080 | off | 1 → 1 | 0.6 · 0.8 · 19 | 124 · 36,914 | 16 | @391 | 5.06 |
| doom@342 | GTX 1080 | off | governor → 1 | 0.6 · 0.9 · 32 | 124 · 36,914 | 16 | @391 | 4.60 |
| doom@342 | GTX 1080 | on | 1 → 1 | 0.6 · 2.0 · 14 | (1: the composer) | 29 | @390 | 3.96 |
| doom@342 | GTX 1080 | on | governor → 1 | 0.6 · 1.9 · 16 | (1: the composer) | 29 | @390 | 3.66 |

### 2.2 The same matrix — this lane's build

11:31–11:40, load 2.5–6.1, the final build. The GTX 1080 rows' p95 is 2–4× the
base matrix's, in both builds alike (interleaved pairs, §0, §5 and §10.5, where
both builds read p95 2.6–3.4 ms bloom off): the driver's clocks, not the tree. **Their max is the tree's** (corrected
by the fix pass): 52–224 ms here against 7–32 in §2.1 is the command buffer's
drain (§10.2, D273) — absent from §2.1's runs, whose GPU kept up, and longer in
this build than in the base (35–37 → 52–53 ms bloom off, 104–137 → 121–156 bloom
on, §10.5); at a browser's pacing neither build drains (§10.4). The two SwiftShader rows that moved are the
governor's (D272): with bloom on by default it now reaches the floor rung and
drops the composer inside the five-second sample (programs 29 → 32, calls read)
at every frame, where the base build was still drawing bloom at 112–141 ms.

| frame (`--index`, speed) | rasteriser | bloom | `--dpr` → render dpr | p50 · p95 · max ms | calls · triangles (bloom off) | programs | counters at | load |
|---|---|---|---|---|---|---|---|---|
| g1@316 | SwiftShader | off | 1 → 1 | 29.2 · 45.3 · 51 | 88 · 29,501 | 16 | @350 | 2.67 |
| g1@316 | SwiftShader | off | governor → 0.6 | 16.1 · 34.3 · 36 | 91 · 29,613 | 16 | @356 | 2.67 |
| g1@316 | SwiftShader | on | 1 → 1 | 117.5 · 138.6 · 142 | (1: the composer) | 29 | @336 | 3.70 |
| g1@316 | SwiftShader | on | governor → 0.6 | 16.5 · 102.0 · 222 | (1: the composer) | 32 | @347 | 3.78 |
| g1@316 | GTX 1080 | off | 1 → 1 | 0.4 · 3.9 · 70 | 87 · 26,425 | 16 | @361 | 5.70 |
| g1@316 | GTX 1080 | off | governor → 1 | 0.4 · 3.3 · 70 | 87 · 26,425 | 16 | @359 | 4.65 |
| g1@316 | GTX 1080 | on | 1 → 1 | 0.5 · 6.1 · 172 | (1: the composer) | 29 | @342 | 4.18 |
| g1@316 | GTX 1080 | on | governor → 1 | 0.5 · 6.6 · 139 | (1: the composer) | 29 | @344 | 3.69 |
| g1-combat@369 | SwiftShader | off | 1 → 1 | 29.8 · 48.5 · 52 | 89 · 26,621 | 16 | @376 | 3.09 |
| g1-combat@369 | SwiftShader | off | governor → 0.6 | 15.7 · 21.2 · 35 | 89 · 26,621 | 16 | @376 | 4.50 |
| g1-combat@369 | SwiftShader | on | 1 → 1 | 118.0 · 135.0 · 150 | (1: the composer) | 29 | @376 | 5.33 |
| g1-combat@369 | SwiftShader | on | governor → 0.6 | 15.7 · 102.0 · 207 | (1: the composer) | 32 | @376 | 4.37 |
| g1-combat@369 | GTX 1080 | off | 1 → 1 | 0.4 · 2.5 · 70 | 89 · 26,621 | 16 | @376 | 4.82 |
| g1-combat@369 | GTX 1080 | off | governor → 1 | 0.4 · 0.6 · 71 | 89 · 26,621 | 16 | @376 | 4.24 |
| g1-combat@369 | GTX 1080 | on | 1 → 1 | 0.5 · 7.1 · 207 | (1: the composer) | 29 | @376 | 4.65 |
| g1-combat@369 | GTX 1080 | on | governor → 1 | 0.5 · 7.1 · 224 | (1: the composer) | 29 | @376 | 4.08 |
| masters@388 | SwiftShader | off | 1 → 1 | 32.7 · 50.3 · 53 | 100 · 31,247 | 16 | @421 | 3.40 |
| masters@388 | SwiftShader | off | governor → 0.6 | 18.5 · 35.0 · 119 | 100 · 31,247 | 16 | @425 | 3.04 |
| masters@388 | SwiftShader | on | 1 → 1 | 125.9 · 144.4 · 156 | (1: the composer) | 29 | @408 | 2.74 |
| masters@388 | SwiftShader | on | governor → 0.6 | 18.5 · 110.0 · 201 | (1: the composer) | 32 | @419 | 3.86 |
| masters@388 | GTX 1080 | off | 1 → 1 | 0.5 · 5.1 · 53 | 103 · 31,479 | 16 | @432 | 3.08 |
| masters@388 | GTX 1080 | off | governor → 1 | 0.5 · 3.8 · 70 | 100 · 31,495 | 16 | @430 | 4.01 |
| masters@388 | GTX 1080 | on | 1 → 1 | 0.6 · 7.2 · 173 | (1: the composer) | 29 | @417 | 3.90 |
| masters@388 | GTX 1080 | on | governor → 1 | 0.6 · 6.4 · 168 | (1: the composer) | 29 | @416 | 3.40 |
| wakanda@477 | SwiftShader | off | 1 → 1 | 34.0 · 52.5 · 161 | 119 · 32,002 | 16 | @509 | 2.87 |
| wakanda@477 | SwiftShader | off | governor → 0.6 | 19.0 · 35.3 · 104 | 120 · 32,004 | 16 | @514 | 2.51 |
| wakanda@477 | SwiftShader | on | 1 → 1 | 127.4 · 157.8 · 302 | (1: the composer) | 29 | @496 | 3.52 |
| wakanda@477 | SwiftShader | on | governor → 0.6 | 19.7 · 139.0 · 307 | (1: the composer) | 32 | @503 | 4.38 |
| wakanda@477 | GTX 1080 | off | 1 → 1 | 0.6 · 6.2 · 70 | 118 · 32,102 | 16 | @525 | 4.66 |
| wakanda@477 | GTX 1080 | off | governor → 1 | 0.5 · 5.3 · 70 | 118 · 32,000 | 16 | @520 | 4.26 |
| wakanda@477 | GTX 1080 | on | 1 → 1 | 0.6 · 8.7 · 155 | (1: the composer) | 29 | @503 | 3.88 |
| wakanda@477 | GTX 1080 | on | governor → 1 | 0.7 · 7.7 · 156 | (1: the composer) | 29 | @505 | 3.54 |
| doom@342 | SwiftShader | off | 1 → 1 | 33.9 · 51.1 · 69 | 118 · 34,242 | 16 | @377 | 3.94 |
| doom@342 | SwiftShader | off | governor → 0.6 | 18.5 · 35.2 · 106 | 120 · 34,266 | 16 | @379 | 4.54 |
| doom@342 | SwiftShader | on | 1 → 1 | 130.7 · 171.2 · 280 | (1: the composer) | 29 | @360 | 5.45 |
| doom@342 | SwiftShader | on | governor → 0.6 | 19.4 · 121.9 · 274 | (1: the composer) | 32 | @370 | 5.80 |
| doom@342 | GTX 1080 | off | 1 → 1 | 0.5 · 5.3 · 70 | 120 · 34,274 | 16 | @384 | 6.14 |
| doom@342 | GTX 1080 | off | governor → 1 | 0.5 · 0.8 · 52 | 124 · 36,914 | 16 | @390 | 5.81 |
| doom@342 | GTX 1080 | on | 1 → 1 | 0.6 · 7.8 · 121 | (1: the composer) | 29 | @374 | 5.38 |
| doom@342 | GTX 1080 | on | governor → 1 | 0.6 · 7.9 · 156 | (1: the composer) | 29 | @372 | 4.56 |

### 2.3 The personal tier on and off (DEV server)

`villain-doom-248` `--index 342` and `g1` `--index 316`; `personal=1` dresses what
the six active models name (the table's line with it is §8.2's 30,000 plus D197's
36,000). Base, 10:03–10:11, load 2.3–13.1:

| frame (`--index`, speed) | rasteriser | bloom | `--dpr` → render dpr | p50 · p95 · max ms | calls · triangles (bloom off) | programs | counters at | load |
|---|---|---|---|---|---|---|---|---|
| dev-doom@342-personal | SwiftShader | off | 1 → 1 | 39.0 · 64.9 · 117 | 118 · 45,898 | 16 | @373 | 2.29 |
| dev-doom@342-personal | SwiftShader | off | governor → 0.6 | 22.1 · 30.8 · 212 | 119 · 45,912 | 16 | @378 | 3.86 |
| dev-doom@342-personal | SwiftShader | on | 1 → 1 | 130.4 · 172.7 · 180 | (1: the composer) | 29 | @361 | 4.62 |
| dev-doom@342-personal | GTX 1080 | off | 1 → 1 | 0.6 · 0.8 · 13 | 124 · 48,570 | 16 | @391 | 8.96 |
| dev-doom@342-personal | GTX 1080 | off | governor → 1 | 0.6 · 1.0 · 31 | 124 · 48,570 | 16 | @391 | 7.97 |
| dev-doom@342-personal | GTX 1080 | on | 1 → 1 | 7.1 · 26.4 · 68 | (1: the composer) | 29 | @387 | 7.22 |
| dev-doom@342-personal | GTX 1080 | on | governor → 1 | 0.7 · 1.9 · 16 | (1: the composer) | 29 | @391 | 11.15 |
| dev-doom@342-cc0 | SwiftShader | off | 1 → 1 | 45.6 · 65.2 · 184 | 118 · 34,242 | 15 | @370 | 10.89 |
| dev-doom@342-cc0 | SwiftShader | off | governor → 0.6 | 24.7 · 35.3 · 129 | 118 · 34,242 | 15 | @378 | 11.55 |
| dev-doom@342-cc0 | SwiftShader | on | 1 → 1 | 148.7 · 178.5 · 294 | (1: the composer) | 28 | @359 | 11.22 |
| dev-doom@342-cc0 | SwiftShader | on | governor → 0.6 | 140.8 · 171.7 · 174 | (1: the composer) | 28 | @360 | 12.12 |
| dev-doom@342-cc0 | GTX 1080 | off | 1 → 1 | 0.6 · 0.9 · 18 | 124 · 36,914 | 15 | @391 | 12.63 |
| dev-doom@342-cc0 | GTX 1080 | off | governor → 1 | 0.6 · 0.7 · 12 | 124 · 36,914 | 15 | @391 | 10.40 |
| dev-doom@342-cc0 | GTX 1080 | on | 1 → 1 | 0.6 · 2.0 · 25 | (1: the composer) | 28 | @391 | 9.12 |
| dev-doom@342-cc0 | GTX 1080 | on | governor → 1 | 0.7 · 2.2 · 14 | (1: the composer) | 28 | @391 | 8.77 |
| dev-g1@316-personal | SwiftShader | off | 1 → 1 | 33.1 · 50.8 · 53 | 83 · 45,687 | 16 | @351 | 7.19 |
| dev-g1@316-personal | SwiftShader | off | governor → 0.6 | 19.7 · 27.9 · 60 | 85 · 45,691 | 16 | @354 | 7.45 |
| dev-g1@316-personal | SwiftShader | on | 1 → 1 | 128.9 · 187.0 · 221 | (1: the composer) | 29 | @335 | 7.47 |
| dev-g1@316-personal | GTX 1080 | off | 1 → 1 | 0.9 · 3.4 · 68 | 81 · 42,699 | 16 | @365 | 11.51 |
| dev-g1@316-personal | GTX 1080 | off | governor → 1 | 0.8 · 3.1 · 18 | 81 · 42,699 | 16 | @365 | 11.59 |
| dev-g1@316-personal | GTX 1080 | on | 1 → 1 | 0.5 · 1.6 · 18 | (1: the composer) | 29 | @364 | 11.40 |
| dev-g1@316-personal | GTX 1080 | on | governor → 1 | 0.6 · 3.0 · 19 | (1: the composer) | 29 | @365 | 11.43 |
| dev-g1@316-cc0 | SwiftShader | off | 1 → 1 | 31.4 · 54.2 · 77 | 88 · 29,501 | 15 | @349 | 11.89 |
| dev-g1@316-cc0 | SwiftShader | off | governor → 0.6 | 17.6 · 34.6 · 46 | 91 · 29,535 | 15 | @355 | 12.59 |
| dev-g1@316-cc0 | SwiftShader | on | 1 → 1 | 129.2 · 158.3 · 162 | (1: the composer) | 28 | @336 | 13.06 |
| dev-g1@316-cc0 | SwiftShader | on | governor → 0.6 | 116.8 · 150.6 · 187 | (1: the composer) | 28 | @338 | 11.70 |
| dev-g1@316-cc0 | GTX 1080 | off | 1 → 1 | 0.5 · 4.4 · 36 | 87 · 26,425 | 15 | @361 | 10.19 |
| dev-g1@316-cc0 | GTX 1080 | on | 1 → 1 | 0.6 · 7.6 · 122 | (1: the composer) | 28 | @348 | 9.74 |
| dev-g1@316-cc0 | GTX 1080 | on | governor → 1 | 0.6 · 5.0 · 122 | (1: the composer) | 28 | @353 | 9.17 |

This lane's build, 11:44–11:53, load 2.2–10.6 (one run, Doom CC0 bloom-on
governed, did not start: its browser never answered):

| frame (`--index`, speed) | rasteriser | bloom | `--dpr` → render dpr | p50 · p95 · max ms | calls · triangles (bloom off) | programs | counters at | load |
|---|---|---|---|---|---|---|---|---|
| dev-doom@342-personal | SwiftShader | off | 1 → 1 | 38.3 · 62.6 · 107 | 118 · 45,898 | 16 | @374 | 2.58 |
| dev-doom@342-personal | SwiftShader | off | governor → 0.6 | 21.4 · 41.4 · 93 | 120 · 45,922 | 16 | @379 | 2.22 |
| dev-doom@342-personal | SwiftShader | on | 1 → 1 | 131.0 · 167.5 · 173 | (1: the composer) | 29 | @361 | 3.16 |
| dev-doom@342-personal | SwiftShader | on | governor → 0.6 | 23.3 · 125.8 · 257 | (1: the composer) | 33 | @370 | 4.07 |
| dev-doom@342-personal | GTX 1080 | off | 1 → 1 | 0.5 · 5.6 · 53 | 130 · 45,948 | 16 | @385 | 4.13 |
| dev-doom@342-personal | GTX 1080 | off | governor → 1 | 0.5 · 5.6 · 52 | 121 · 46,058 | 16 | @386 | 3.65 |
| dev-doom@342-personal | GTX 1080 | on | 1 → 1 | 0.6 · 7.9 · 134 | (1: the composer) | 29 | @374 | 4.24 |
| dev-doom@342-personal | GTX 1080 | on | governor → 1 | 0.6 · 9.0 · 155 | (1: the composer) | 29 | @373 | 3.83 |
| dev-doom@342-cc0 | SwiftShader | off | 1 → 1 | 36.1 · 51.5 · 62 | 118 · 34,242 | 15 | @377 | 4.23 |
| dev-doom@342-cc0 | SwiftShader | off | governor → 0.6 | 19.0 · 28.6 · 41 | 125 · 34,284 | 15 | @380 | 4.94 |
| dev-doom@342-cc0 | SwiftShader | on | 1 → 1 | 128.2 · 159.6 · 271 | (1: the composer) | 28 | @361 | 5.56 |
| dev-doom@342-cc0 | SwiftShader | on | governor → 0.6 | 20.8 · 116.4 · 208 | (1: the composer) | 31 | @371 | 4.77 |
| dev-doom@342-cc0 | GTX 1080 | off | 1 → 1 | 0.5 · 5.0 · 52 | 120 · 34,274 | 15 | @383 | 6.34 |
| dev-doom@342-cc0 | GTX 1080 | off | governor → 1 | 0.5 · 4.6 · 38 | 129 · 34,290 | 15 | @383 | 5.31 |
| dev-doom@342-cc0 | GTX 1080 | on | 1 → 1 | 0.6 · 4.4 · 453 | (1: the composer) | 28 | @371 | 4.42 |
| dev-g1@316-personal | SwiftShader | off | 1 → 1 | 39.2 · 52.1 · 92 | 83 · 45,757 | 16 | @348 | 4.22 |
| dev-g1@316-personal | SwiftShader | off | governor → 0.6 | 21.3 · 29.3 · 73 | 85 · 45,815 | 16 | @354 | 6.90 |
| dev-g1@316-personal | SwiftShader | on | 1 → 1 | 129.1 · 182.2 · 237 | (1: the composer) | 29 | @335 | 8.05 |
| dev-g1@316-personal | SwiftShader | on | governor → 0.6 | 22.3 · 134.7 · 239 | (1: the composer) | 33 | @342 | 10.37 |
| dev-g1@316-personal | GTX 1080 | off | 1 → 1 | 0.4 · 5.3 · 172 | 84 · 45,759 | 16 | @351 | 10.57 |
| dev-g1@316-personal | GTX 1080 | off | governor → 1 | 0.4 · 6.6 · 206 | 84 · 45,635 | 16 | @343 | 8.52 |
| dev-g1@316-personal | GTX 1080 | on | 1 → 1 | 0.5 · 11.3 · 430 | (1: the composer) | 29 | @329 | 7.82 |
| dev-g1@316-personal | GTX 1080 | on | governor → 1 | 0.5 · 9.2 · 447 | (1: the composer) | 29 | @329 | 7.80 |
| dev-g1@316-cc0 | SwiftShader | off | 1 → 1 | 40.9 · 53.8 · 101 | 88 · 29,377 | 15 | @347 | 7.39 |
| dev-g1@316-cc0 | SwiftShader | off | governor → 0.6 | 29.6 · 52.0 · 68 | 90 · 29,409 | 15 | @353 | 6.34 |
| dev-g1@316-cc0 | SwiftShader | on | 1 → 1 | 133.6 · 155.0 · 155 | (1: the composer) | 28 | @335 | 9.06 |
| dev-g1@316-cc0 | SwiftShader | on | governor → 0.6 | 19.8 · 120.5 · 253 | (1: the composer) | 31 | @345 | 8.45 |
| dev-g1@316-cc0 | GTX 1080 | off | 1 → 1 | 0.4 · 1.3 · 124 | 87 · 26,425 | 15 | @359 | 8.92 |
| dev-g1@316-cc0 | GTX 1080 | off | governor → 1 | 0.5 · 6.4 · 105 | 89 · 29,609 | 15 | @358 | 7.30 |
| dev-g1@316-cc0 | GTX 1080 | on | 1 → 1 | 0.5 · 8.3 · 257 | (1: the composer) | 28 | @342 | 6.66 |
| dev-g1@316-cc0 | GTX 1080 | on | governor → 1 | 0.6 · 7.6 · 325 | (1: the composer) | 28 | @336 | 8.99 |

What the tier costs, read across the two: dressed, Doom's table carries
45,774–48,570 triangles against 34,242–36,914 CC0 (inside §8.2's 30,000 plus
D197's 36,000) and the same 118–130 calls — one a dressed figure since D240; on
the GTX 1080 its p95 moves with the machine, not the tier (0.8–9.0 ms dressed
against 0.7–4.9 undressed over the day's loads); on SwiftShader at the floor the
dressed table reads p95 30.8–41.4 against 28.6–35.3. `g1`@316 dressed is 83–85
calls (the undressed 87–90) and 45,633–45,815 triangles. The GTX 1080's max
column in both tables is the command buffer's drain (§10.2, D273), not the tier.

### 2.4 Draw calls, triangles and programs — static, per frame

From the pumped census (the GTX 1080 through ANGLE — `ANGLE (NVIDIA Corporation,
NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)` — render dpr 1 (`?dpr=1`), the
DEV server, `personal=0`, bloom off, 240 frames of the
frame's own batch; the same on both builds — the pass moved no call):

| frame | draw calls | of which instanced | `useProgram` a frame | bone textures uploaded a frame |
|---|---:|---:|---:|---:|
| `g1`@316 | 84.2 | 27.0 | 30.7 | 12 |
| `g1`@370 (the combat) | 90.1 | 27.0 | 28.8 | 12 |
| Masters of Evil @476 (their combat: ten attackers, five blockers) | 104.9 | 28.0 | 32.6 | 14 |
| Wakanda @527 (48 cards) | 119.9 | 28.0 | 34.6 | 14 |
| Doom Legion @393 (the death batch) | 128.8 | 31.0 | 36.4 | 14 |
| Doom Legion @393, personal on | 128.8 | 31.0 | 38.4 | 14 |

Programs: **15–16 with bloom off, 28–29 with it on** (report 13 §8.2's budget is
≤ 14: Tier 2 slice 1's follow-up 5, unchanged), and 32 after the governor drops
the composer (the composer's are cached, not drawn). The played bench reads a
call or two more than the static frame (a live effect), and reads its counters at
its END frame: `g1`@316 reads 91 on SwiftShader and 87 on the GTX 1080 because
SwiftShader plays fewer frames in five seconds and stops at @355–356, where the
table is 89 plus the batch's effects; the GTX 1080 stops at @359–365. The status
layer's follow-up 4 ("`g1`@316 on SwiftShader is 91 draw calls") is that frame,
not that rasteriser (§8).

### 2.5 The status layer and the caption

- **The status layer has no flag**: nothing turns the strip off (`scene/status.ts`
  is one mesh bound from `DiscField.bind`). Measured instead: it is **one draw
  call** (§2.4), its bind 0.1–0.2 ms over a 200-frame pumped batch (0.1% of the
  main thread), and its per-frame upload the anchors alone — now only when one
  moves (D271.5). Hidden by layer on the static SwiftShader frame (§3.3) it saved
  nothing measurable.
- **The caption strip was on screen in 22–49% of the sampled frames** (it hides
  on a frame no moment names; the matrix prints the share). Hiding the whole DOM
  layer (`.arena__layer{display:none}`) on SwiftShader at the floor, two
  interleaved pairs: p50 16.4 / 16.7 against 16.8 / 16.5 ms — nothing.

### 2.6 The CPU: the top ten self-time functions

The production profile of the bench frame on the GTX 1080, bloom off, base build,
at 09:3x (load ~4, the quietest profile of the day; 5,620 ms sampled, 5,569 ms busy
— the unthrottled loop keeps the main thread busy, so these are shares of the
frame), named by `tools/profile-top.mjs`:

| rank | self | % of busy | function (original source) |
|---:|---:|---:|---|
| 1 | 681.6 ms | 12.2 | (program) — native, GC and the command buffer |
| 2 | 649.7 | 11.7 | `updateMatrixWorld` (three.core.js) |
| 3 | 415.1 | 7.5 | `projectObject` (three.module.js) |
| 4 | 385.5 | 6.9 | `multiplyMatrices` |
| 5 | 303.3 | 5.4 | `renderBufferDirect` |
| 6 | 185.8 | 3.3 | `bufferSubData` (WebGL) |
| 7 | 164.5 | 3.0 | `compose` |
| 8 | 145.0 | 2.6 | `texSubImage2D` (WebGL: the bone palettes, and first card uploads) |
| 9 | 128.4 | 2.3 | `setProgram` |
| 10 | 126.8 | 2.3 | `upload` (a program's uniforms) |

Inclusive, the same profile: fiber's loop 80.7%, three's `render` 61.5%,
**`CueRunner`'s `useFrame` 17.6%** — `DiscField.bind` 8.6% (of which
**`PropField.bind` 8.1%, and 7.4% its `updateMatrixWorld` of whole rigs**),
`applyFigures` 3.2%, `applyOffsets` 2.2% (0.6% of it `Color.setStyle`),
`BustField.bind` → `DuelistLayer`'s bind 1.0%, `TileField.bind` 0.9% (0.3% of it
`setStyle`), `OverlayField.bind` 0.5%, `EffectPool.bind` 0.4%, the queue's tick
0.4%, `StatusField.bind` 0.1%; `DepartureField.bind` 0.1% over the Doom death
batch. The post pass: with bloom on the composer is `Post`'s chunk and 13 more
programs; on the GTX 1080 bloom on costs p95 +0.9 ms at the bench frame
(§5.1: +0.2 to +1.2 over the five frames), on SwiftShader +95 ms (§3.1). Its own functions were not ranked: the
profile of a bloom-on sample is dominated by the same three.js walk.

The same bench line after the fixes could not be profiled on a quiet machine: at
a load of 8–11 the WebGL entry points blocked on a contended GPU process
(`uniformMatrix4fv` alone 10–13%), in both builds alike. Interleaved there, the
JavaScript of the walk moved as §0 says: `updateMatrixWorld` 6.4% → 3.8%,
`bufferSubData` 4.8% → 2.5%, `projectObject` 3.8% → under 2.5%.

## 3. Where SwiftShader's frame goes

### 3.1 It fails §9.4 at every benched frame, at every rung

At the floor (render dpr 0.6, bloom and ink off — where the governor settles),
over the day: `g1`@316 **p50 15.7–19.4, p95 33.3–34.6 ms** (base and fix alike;
four interleaved pairs at 11:24, load 5.8–9.9: base 15.7–17.3 / 33.3–34.4, fix
16.3–17.1 / 33.4–34.3); the villain tables p95 31.7–53.0; `g1`'s combat at 1×
came closest, p95 21.2 ms once (15.7 p50). At dpr 1 with bloom off: p50 29–48, p95
45–68 (one run at a load of 7, 64 / 125). With bloom on: p50 112–150 ms at every
dpr — bloom is +95 ms at the floor.

### 3.2 Its p95 is its present beat

Headless Chromium on SwiftShader ticks rAF at ~17.2 ms even on an empty page (an
empty page and one that spins 12 ms a frame both read p50 17.2, p95 17.3, on both
rasterisers — the GTX path runs unthrottled only while WebGL draws). A frame that
misses the beat reads ~34 ms and the next ~0.5: at the floor 20 of 274 frames were
34 ms and 11 under 1 ms. So p95 is 34 ms whenever more than one frame in twenty
misses, which at a p50 of 16–17 ms is always.

### 3.3 What the ~15 ms is

The static bench frame on the DEV server, synced by a one-pixel `readPixels` (one
`finish()` is a flush in Chromium and synced nothing: 0.4 ms), pumped 40–60 times
per variant, parts moved to layer 31 (the frame loop re-shows what it binds, so
`visible` cannot hide them):

| variant (SwiftShader, 1152 × 563, 4× MSAA) | p50 ms | calls |
|---|---:|---:|
| the frame | 14.1–17.4 (about 15) | 83 |
| without the 39 card planes | 11.9–15.2 | 44 |
| without the 10 figures | 12.1–13.7 | 73 |
| without the 2 duelists | 13.8–15.9 | 81 |
| without the comic stage's ground (one quad) | 10.1–10.5 | 82 |
| …the ground without its texture / without mipmaps / at anisotropy 16 | 11.7 / 13.0 / 17.3 | 83 |
| without the backdrop cylinder | 13.9–14.2 | 82 |
| the backdrop drawn after the ground (no overdraw) | 14.1 | 83 |
| look options: `halftone=0` / `shadow=0` / `stage=felt` / `look=holo` | 14.3 / 14.0 / 13.8 / 13.9–16.3 | 81–83 |
| nothing drawn | 0.3 | 0 |

| render dpr (the frame, pumped) | 1 | 0.6 | 0.5 | 0.4 |
|---|---:|---:|---:|---:|
| p50 ms | 27.4–32.9 | 14.4 | 11.6 | 9.7 |

About 6 ms does not shrink with the resolution (vertex work of 26,000 triangles
and 83 calls), about 24 ms × the pixel fraction does; the frame interval adds the
page's compositing (2–4 ms). None of it is the frame loop's JavaScript: flagging
no unchanged buffer (the experiment of D271.5, patched into the page before it
was written) and the pass's fixes together left the floor where it was (§3.1).

### 3.4 Below the floor

`g1`@316 at dpr 0.5: p95 18.9 ms (DEV, load ~8) and 31.5 (production, load 7); at
0.45: **p95 16.9 — the one pass of the day**. The villain tables at 0.45 (load
12–18): Masters 34.7, Wakanda 34.4, Doom 36.2. D270: the floor is a legibility
line and SwiftShader's number is the software floor's.

## 4. The fixes (Part 2)

What was found, and how:

- **The profile** (§2.6) put `PropField.bind` at 8.1% of the main thread, 7.4% of
  it `updateMatrixWorld(true)` on every rig a prop rides — each ~68 nodes,
  recomputed moments later by the renderer's own pass — and `Color.setStyle`
  under `applyOffsets` and `TileField.bind`.
- **The scene census** at `g1`@316: 871 objects, **618 of them bones**, 207 meshes
  (84 visible), 126 invisible (40 hit proxies, the effect pool's parked slots).
- **The waste census** (`waste.mjs`, 150 pumped frames of `g1`@370): about 40
  of 70 uploads a frame carried the bytes the GPU held (every prop kind's colour and
  opacity, the tiles, the busts, the overlays' colours); 741 of 1,788 bone-palette
  frames were unchanged; one render-list item a frame was an `InstancedMesh` at
  count 0 (the slab tile kind); no drawn item at zero opacity in four batches
  (`g1`@356 and @370, Doom @393, Masters @476).

Each fix, its number and its test are §0's table. Notes:

- **Fix 1** also made `applyOffsets` allocation-free by the scan's own rule: a
  `Map.forEach` with a module-level callback (`applyRigOffset`) and the frame's
  inputs in a module-level record, instead of a `for…of` over `rigs.values()`; the
  tile field walks a per-snapshot array (the disc field's `refill`).
- **Fix 2**: the chains are built at commit (`PropField.commit` → `chainFresh` →
  `worldChainOf`): every noted root and the path from it to each `joint` and
  `jointB` a binding follows. Over the library's 38 bodies, 591 of 2,302 nodes.
- **Fix 3**: `hideBoneTrees` hides a bone tree's root at instantiation, unless
  something drawable hangs under it. 618 bones out of the walk at `g1`@316.
- **Fix 4** is setup, not a call: three's `renderInstances` returns before the
  draw at zero instances and `gl.info` never counted it. `TileField.prime` shows
  every bucket at mount, beside the pool's, so no kind's program compiles
  mid-game.
- **Fix 5**: `scene/instanceWrite.ts`'s three writers compare against
  `Math.fround(v)` — comparing the float64 would call every inexact value changed
  on every frame (the test's control).

What was looked at and left (D271's *Rejected*): the bone palettes (41% unchanged,
uploaded from inside three's render), figures in the opaque pass (84 of 90 draws
are transparent; 29–38 program switches a frame follow depth order — changing
that changes pixels), `matrixAutoUpdate` off on parked meshes.

## 5. The open items (Part 3)

### 5.1 The bloom-off +1.65 ms (Lane LOOK follow-up 9): closed by D146, and still closed

The +1.65 was the comic look's ink composer drawn with bloom off; since D146 the
ink rides bloom only and bloom off mounts no composer. Re-measured on the merged
tree: with bloom off the GTX 1080 draws 15–16 programs and no composer at every
benched frame; at 09:26–09:40 (load 4–10) p95 read 0.7–1.2 ms with bloom off and
1.2–2.0 with it on over the five frames — the composer's whole cost, +0.2 to +1.2
ms, inside report 15's +1.5 with bloom ON. The comic-against-hologram A/B with bloom
off, interleaved, the final build at `g1`@316 on the GTX 1080 (`ANGLE (NVIDIA
Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`, governed, render
dpr 1 in all six runs; 11:40, load 2.8–3.8): p50 0.40
against 0.40 ms, p95 2.6–3.1 against 2.5–2.6 (**+0.1 to +0.5**), 3,335–3,736
frames in five seconds against 4,398–4,559, 16 programs against 15. Closed.

### 5.2 SwiftShader's p95 (D270)

§3: it fails §9.4 at the floor at every frame, on every tree since the comic look,
and passes only at dpr 0.45 on `g1`@316. **D270** names it the software floor,
reported and never gated, and grades §9.4 on the real GPU; the GTX 1080 reads p95
0.6–8.7 ms at every frame, bloom on or off, at loads of 2–12. No rung below the
floor. *(The fix pass: that is the unthrottled p95. The GTX 1080's unthrottled
max is the command buffer's drain, over 50 ms bloom on in both builds; at a
browser's pacing it reads p95 16.7 and no frame misses a beat — §10.4, D273.)* A regression on SwiftShader is a higher p50 at the floor in interleaved
pairs.

### 5.3 The governor (D272)

The ladder on SwiftShader at `g1`@316, bloom on by default, traced from the scrub
(`govtrace.mjs`, 100 ms samples of the canvas's backing dpr and whether the
composer draws), interleaved production builds, loads 5–11:

| build | 1 → 0.75 | → 0.6 | → the composer off | frames before settling |
|---|---:|---:|---:|---:|
| base | 2.52 · 2.39 · 8.63 s | 4.98 · 5.18 · 12.04 s | 7.59 · 9.21 · — (not in 14 s) | 57 · 57 · 58 |
| fix | 2.68 · 1.74 · 1.34 s | 4.93 · 3.00 · 3.07 s | 7.16 · 4.60 · 4.79 s | 32 · 31 · 29 |

After settling both builds draw p50 16–25 ms, p95 34–53 at the floor (§3). On the
GTX 1080 the governor stayed at render dpr 1 on all ten governed benches of the
final build. The pass's first cut — a window "enough" after a quarter-second of
frames — stepped the GTX 1080 to 0.75 on three of ten (four slow texture uploads
make a quarter-second); it is `perf.test.ts`'s control, and D272 records why the
decided-verdict rule replaced it.

## 6. Pictures

Deterministic shots (`shoot.mjs`: the DEV server, 1600 × 1000, the queue paused, the
page clock frozen at one value and the prop field's clock zeroed, fiber's
`advance()` pumped), before (`e2c337c`'s sources) and after (this lane's), under
`var/gpu/shots/` (gitignored):

| frame | rasteriser | bloom | before → after (ImageMagick `compare -metric AE`) |
|---|---|---|---|
| `g1`@316 | GTX 1080 | on | 0 pixels |
| `g1`@316 | GTX 1080 | off | 20 pixels, each one level (of 255) in one channel — and 16–26 between runs of one build (§0) |
| `g1`@316 | SwiftShader | on | 0 |
| `g1`@316 | SwiftShader | off | 0 |
| `g1`@372 (the combat's damage) | GTX 1080 | on | 0 |
| Masters of Evil @438 | GTX 1080 | on | 0 |
| Wakanda @527 | GTX 1080 | on | 0 |
| Doom Legion @392, CC0 | GTX 1080 | on | 0 |
| Doom Legion @392, personal on | GTX 1080 | on | 0 |

## 7. Chunk sizes

`npm --prefix web run build`, base → this lane:

| chunk | base | fix |
|---|---:|---:|
| `index-*.js` (the 2D entry) | 300.43 kB · 94.68 gzip | 300.43 · 94.67 |
| `Arena-*.js` | 48.75 · 18.61 | **46.49 · 17.58** |
| `arena-scene-*.js` | 1,371.15 · 393.36 | **1,373.33 · 394.12** |
| `Workshop-*.js` | 89.16 · 30.30 | 89.16 · 30.29 |
| `Post-*.js` | 70.67 · 17.72 | 70.67 · 17.72 |
| `StatsOverlay-*.js` (new, loaded only with `?stats=1`) | — | 2.59 · 1.35 |

`arena-scene` grew by the pass's own code — **+2.18 kB, +0.76 gzip**: by file,
`props.ts` (the chains and the flags, with `worldChain.ts` and the writers it
pulls in) +1.03 kB, `tiles.ts` +0.50, `models.ts` (`hideBoneTrees`) +0.24,
`status.ts` +0.12, `CueRunner.tsx` +0.11. `Arena-*.js` shrank by more (the dormant
`<AdaptiveDpr />` gone, `stats.js` lazy, the governor's window in `governor.ts`):
the arena's page, its two chunks together, is **0.27 kB gzip smaller**.

## 8. Follow-ups this closes or re-grades

- M7 Tier 1 follow-up 6 (`<AdaptiveDpr />` mounted and dormant) — **closed** (D272).
- Lane LOOK follow-up 16 (the governor reaches its floor later with the comic look)
  — **closed** (D272: in 29–32 frames where it took 57).
- Lane LOOK follow-up 9 (bloom off +1.65 ms) — closed by D146; re-measured, §5.1.
- The status layer's follow-up 4 (`g1`@316 on SwiftShader is 91 calls) —
  **re-graded**: it is the frame the sample ends on (@355), not the rasteriser
  (§2.4); the budget item stands.
- The fix pass (§10): its own follow-up 1 **re-graded** (the GTX 1080's swing is
  the driver's clock, P5 on an idle machine too; the max is the command buffer's
  drain, D273), and a tenth follow-up (at a browser's pacing the cold scrub can
  step the GTX 1080 to 0.75, in either build, and it never climbs back).

## 9. The gate, and `~/forge`

**The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9360`
**283.1 s** and `WSPORT=9370` **275.3 s**, exit 0 both, 48 jobs (1,066.6 s and
1,015.9 s summed) at a load average of 5.2–12.1, `node --test` 1,208 / 1,197 pass /
0 fail / 11 skipped and vitest 157 (9 files) each time (`var/check-all-gpu-1.log`,
`-2.log`). The lane added no step and no job: its tests are in the web step.
`~/forge` and `~/.forge`: unchanged — a listing of every path under each with its
size, mtime and mode, and the `~/.forge` files' contents hashed, identical before
the lane's first command (09:19) and after its second gate (12:01); the jar still
`3c0a7c38…8e5dd9`.
The fix pass's gate and its `~/forge` check are §10.9.

## 10. The fix pass — what a skeptic's re-measure found, and what was done (D273)

A verifier re-benched the lane's build against `e2c337c`'s in interleaved pairs
and bisected the fixes. Its one major finding: on the GTX 1080 at the bench frame
with bloom off, this build's max was over §9.4's 50 ms in every run (51–53 ms
frames, 8–23 a sample) and the base build's in none (28–40), and reverting D271.5
alone — the upload flags — brought the long frames back to the base's. The draft
had put §2.2's GTX maxes down to load; interleaved pairs at equal load put them
on the build. It also found the prop field's and the status strip's upload flags
untested, the governor's default untested, and five smaller things (six minor
findings in all); each is below.

### 10.1 What drew these numbers

The same machine, rasterisers and bench as §1, on `e2c337c`'s production build
(*base*, `var/verify/before/web/dist`, built from a `git archive` of that commit)
and this lane's (*fix*: the app code is the lane's commit's, byte for byte — the
fix pass changed tests, the bench and documents only, and its `vite build` wrote
the same chunk hashes), served by `vite preview` on 127.0.0.1:5250, CDP on 9377–
9378. 12:54–13:40; the other lanes had stopped benching, and most runs were at a
load under 3 (1.0–10.2 in all, the highest this pass's own SwiftShader runs and
the first `--vsync` pairs): the quietest series of the day. `nvidia-smi` sampled every 500 ms through one
unthrottled bench-frame run. Scratch drivers under `var/gpu-fix/` (gitignored):
`ab.mjs` (interleaved production builds, the order alternating each round, and a
histogram of each run's long frames in 17 ms beats), `traceprobe.mjs` (the bench's
own sequence under a Chromium trace), `traceread.cjs`, `gapwait.cjs`, `tasks.cjs`
(what the renderer's main thread and the GPU process did inside each long frame),
`nc/run.py` (the source reverts of §10.7).

**The tables' line names**: `g1` is `g1.jsonl --index 316` (the bench frame),
`combat` `g1.jsonl --index 369 --speed 1`, `masters` `villain-masters-of-evil-33
--index 388`, `wak` `villain-wakanda-232 --index 477`, `doom` `villain-doom-248
--index 342`; `gl` is the GTX 1080 (`ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX
1080/PCIe/SSE2, OpenGL 4.5.0)`) and `ss` SwiftShader (`ANGLE (Google, Vulkan 1.3.0
(SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`); `default` is
the page as a user opens it (bloom on, the governor choosing the dpr) and
`nobloom` the same with `--no-bloom`; the personal tier is off (production
builds); the render dpr each run ended on is the last column. A long frame is an
interval over 20 ms, counted in the headless display's ~17 ms beats (2: under
43 ms, 3: 43–60, 4+: over 60).

### 10.2 The long frame is the WebGL command buffer draining

A trace of the bench (categories `gpu`, `devtools.timeline`, `toplevel`, `viz`,
`cc`) over the five-second sample, `g1`@316 bloom off and Wakanda @477 bloom on,
unthrottled as the bench runs:

| frame | build | frames a second | drains (a wait ≥ 10 ms) | frames between drains, median | a drain, ms (median · range) | waited in all | long frames (> 30 ms) holding a drain |
|---|---|---:|---:|---:|---|---:|---|
| g1@316, bloom off | base | 743 | 52 | 56 | 35 · 10–41 | 2.10 s of 5.0 | 40 of 40 |
| g1@316, bloom off | fix | 735 | 48 | 62 | 30 · 10–48 | 1.74 s of 5.0 | 25 of 25 |
| Wakanda @477, bloom on | base | 282 | 34 | 41 | 97 · 17–104 | 3.32 s of 5.0 | 33 of 35 |
| Wakanda @477, bloom on | fix | 280 | 31 | 45 | 110 · 40–118 | 3.37 s of 5.1 | 31 of 35 |

Every frame over 30 ms bloom off, in both builds, holds a wait of 10 ms or more
on the renderer's main thread inside `requestAnimationFrame` — fiber's render —
in `CommandBufferHelper::WaitForAvailableEntries`, which calls
`CommandBufferProxyImpl::WaitForGetOffset`: the WebGL command buffer is full and
the page waits for the GPU process to execute what is in it. Bloom on, 31–33 of
35 do (the other two to four hold no single wait of 10 ms). The page draws ~740 frames a second
bloom off, ~280 bloom on; the GPU does not keep up (§10.3), so the buffer fills
and drains, every ~56 frames in the base build and every ~62 in this one (the
medians above). Fewer commands a frame (D271.5's forty fewer `bufferSubData`) mean
more frames in a full buffer: the drain comes less often and can last longer, and
the waits add up to about the same (2.10 and 1.74 s of five bloom off, 3.32 and
3.37 s bloom on). The frame that holds a drain reads in whole beats of the
headless display (~17.4 ms): every one of the base build's long frames bloom off
read two (35–37 ms), and 60 of this build's 174 read three (52–53) — §10.5.

### 10.3 The GPU was not keeping up — at P5, on an idle machine

`nvidia-smi` through an unthrottled bench-frame run of the fix build, bloom off,
load 1.5: while the sample ran the GPU sat at **P5, 746 MHz core / 810 MHz memory,
94–98% busy**; it rose to P0 (1,632 MHz) only between runs, idle. The driver's
power management chose the low clock for this load, so the GPU was the
bottleneck, which is when the buffer drains. The base matrix of §2.1 (09:26) read
maxes of 7–19 ms and ~9,000 frames in five seconds — a series in which the GPU
kept up and nothing drained; every unthrottled bloom-off GTX run of this section
read ~3,200–3,900 frames.
This is the swing §1 and follow-up 1 attribute to the machine: it is the driver's
clock, and an idle machine did not remove it.

### 10.4 At a browser's pacing nothing drains

`--vsync` (new, `tools/arena-bench.mjs`) keeps Chromium's vsync and frame-rate
limit. The trace of the same sequence shows **no command-buffer wait at all** in
five seconds, in either build, and the page draws 59–60 frames a second.
Interleaved:

| line | pacing | build | runs | frames | p50 ms | p95 ms | max ms | long frames: 2 · 3 · 4+ beats | render dpr |
|---|---|---|---:|---|---|---|---|---|---|
| combat-gl-default | vsync | base | 1 | 300 | 16.7 | 16.8 | 16.8 | 0 · 0 · 0 | 1 |
| combat-gl-default | vsync | fix | 1 | 300 | 16.7 | 16.8 | 16.8 | 0 · 0 · 0 | 1 |
| combat-gl-nobloom | vsync | base | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| combat-gl-nobloom | vsync | fix | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| doom-gl-default | vsync | base | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| doom-gl-default | vsync | fix | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| doom-gl-nobloom | vsync | base | 1 | 300 | 16.7 | 16.8 | 16.8 | 0 · 0 · 0 | 1 |
| doom-gl-nobloom | vsync | fix | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| g1-gl-default | vsync | base | 3 | 300 | 16.7 | 16.7–16.8 | 16.8 | 0 · 0 · 0 | 1 |
| g1-gl-default | vsync | fix | 3 | 300–301 | 16.7 | 16.7–16.8 | 16.8 | 0 · 0 · 0 | 1 |
| g1-gl-nobloom | vsync | base | 9 | 300–301 | 16.7 | 16.7–16.8 | 16.8 | 0 · 0 · 0 | 1 |
| g1-gl-nobloom | vsync | fix | 9 | 300 | 16.7 | 16.7–16.8 | 16.8 | 0 · 0 · 0 | 1, 0.75 |
| masters-gl-default | vsync | base | 1 | 300 | 16.7 | 16.8 | 16.8 | 0 · 0 · 0 | 0.75 |
| masters-gl-default | vsync | fix | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| masters-gl-nobloom | vsync | base | 1 | 301 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 0.75 |
| masters-gl-nobloom | vsync | fix | 1 | 301 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |
| wak-gl-default | vsync | base | 3 | 300–301 | 16.7 | 16.7–16.8 | 16.8–33.3 | 1 · 0 · 0 | 1 |
| wak-gl-default | vsync | fix | 3 | 300–301 | 16.7 | 16.7–16.8 | 16.8 | 0 · 0 · 0 | 1 |
| wak-gl-nobloom | vsync | base | 1 | 300 | 16.7 | 16.8 | 16.8 | 0 · 0 · 0 | 1 |
| wak-gl-nobloom | vsync | fix | 1 | 300 | 16.7 | 16.7 | 16.8 | 0 · 0 · 0 | 1 |

**The governor at a browser's pacing.** Three of the 44 `--vsync` runs ended at
render dpr 0.75: one of this build's 22 (the bench frame, bloom off) and two of
the base's 22 (the Masters of Evil, bloom off and on). None of those samples missed a beat, so the late
frames that decided it came before the sample — at the cold scrub, where fresh
card textures upload. The decision is the full window's in both builds
(`perf.test.ts`: the early verdict only moves it sooner); at 60 Hz the governor
cannot see headroom and never climbs back, so the table drew at 0.75 for the
rest of the session. Follow-up 10.

### 10.5 The interleaved pairs, unthrottled, with the max

| line | pacing | build | runs | frames | p50 ms | p95 ms | max ms | long frames: 2 · 3 · 4+ beats | render dpr |
|---|---|---|---:|---|---|---|---|---|---|
| g1-gl-default | unthrottled | base | 3 | 1499–1570 | 0.5–0.6 | 6.1–6.8 | 121.5–136.9 | 1 · 1 · 90 | 1 |
| g1-gl-default | unthrottled | fix | 3 | 1520–1533 | 0.5 | 5.9–6.5 | 138.5–155.3 | 3 · 1 · 81 | 1 |
| g1-gl-nobloom | unthrottled | base | 3 | 3825–3869 | 0.5 | 3.3–3.4 | 35.8–36.7 | 171 · 0 · 0 | 1 |
| g1-gl-nobloom | unthrottled | fix | 3 | 3868–3895 | 0.4 | 2.7–2.8 | 52.5–52.8 | 114 · 60 · 0 | 1 |
| g1-ss-default | unthrottled | base | 3 | 46–48 | 102.0–110.5 | 123.7–137.9 | 141.2–251.3 | 0 · 0 · 141 | 0.6 |
| g1-ss-default | unthrottled | fix | 3 | 174–189 | 15.7–18.3 | 99.3–102.5 | 215.6–219.9 | 60 · 2 · 65 | 0.6 |
| wak-gl-default | unthrottled | base | 3 | 1385–1455 | 0.7–0.8 | 7.0–7.9 | 103.8–109.7 | 6 · 3 · 99 | 1 |
| wak-gl-default | unthrottled | fix | 3 | 1400–1413 | 0.6 | 7.6–8.4 | 121.0–122.2 | 6 · 2 · 93 | 1 |
| wak-gl-nobloom | unthrottled | base | 3 | 3246–3297 | 0.6 | 4.4–5.0 | 35.5–37.2 | 88 · 0 · 0 | 1 |
| wak-gl-nobloom | unthrottled | fix | 3 | 3299–3326 | 0.5 | 4.4–4.8 | 35.9–41.1 | 146 · 0 · 0 | 1 |
| wak-ss-default | unthrottled | base | 3 | 45–46 | 106.7–108.2 | 128.2–135.6 | 133.5–224.6 | 0 · 0 · 137 | 0.6 |
| wak-ss-default | unthrottled | fix | 3 | 151–162 | 18.5–19.4 | 109.3–111.4 | 209.5–221.6 | 121 · 0 · 67 | 0.6 |

This build's max is over 50 at the bench frame bloom off (the 60 three-beat
drains of 174), and both builds' are over 50 bloom on at both frames — the default
page never met §9.4's max unthrottled on the GTX 1080. At Wakanda bloom off every
long frame of both builds is a two-beat drain (max 35.5–41.1 ms), this build's
more of them (146 against 88 over three runs). This build's p50 is equal or lower
on every GTX line; its p95 is lower at the bench frame bloom off (2.7–2.8 against
3.3–3.4) and overlaps the base's elsewhere. **D273** reads §9.4 on a real GPU at a browser's pacing
(§10.4), keeps D271.5, and has the bench print a note beside an unthrottled
real-GPU max FAIL; the line is not lowered.

### 10.6 SwiftShader's default line, restated with its load

The default page (bloom on, governed) on SwiftShader, interleaved, 13:27–13:29,
load 1.5–6.4, three runs a build at each frame (§10.5's table):

- `g1`@316: base p50 **102.0–110.5 ms**, 46–48 frames in the sample — the
  composer dropped only in its last frames (programs 29 → 32–35 at the end); this
  build **15.7–18.3 ms**, 174–189 frames — the floor reached and the composer
  dropped early in the sample.
- Wakanda @477: base **106.7–108.2 ms**, 45–46 frames (programs 29 → 29: it never
  left bloom); this build **18.5–19.4 ms**, 151–162 frames.

Both builds' p95 is the descent's own slow frames (99–111 ms against 124–138).
The verifier's two series at loads of 6–28 read this build at 16.1–38 ms in 13
of 16 runs and 104–164 in three, where the ladder had not finished inside the five
seconds: the gain is the ladder finishing sooner, and a loaded machine can still
take longer than the sample. D272 now says so, with the load beside each range.

### 10.7 What the tests now hold, and the source reverts that turn them red

- `gpu-pass.test.ts` holds each of the three fields to **"flagged iff its array
  changed"** (`uploadViolations`): the tile field (a still frame, a moved land);
  the **prop field** on `g1`'s board near the bench frame with the real
  `figures.glb` (a still frame; one body moved by its offset and its rig — matrix
  buffers only, fewer than every drawn kind; a fade — opacity buffers only; the
  freeze's wash — colour buffers only; a still frame after each); and the **status
  strip** (the first frame after a commit, a still frame, a moved strip — its two
  quads moved and the other's not — a held offset, and a bobbing strip that sends
  every frame). Each carries two controls on a still frame: every buffer flagged
  (the fields as they were) and a value written without its flag.
- Seven source reverts, one at a time, each run against `gpu-pass`, `liveness`,
  `status` and `traits` (`nc/run.py`): the prop field flagging all three buffers
  every drawn frame (the verifier's nc3), the status strip flagging its anchors
  every frame (nc4) and never, the prop field's opacity written with `setX` (nc13),
  its colour with `setColorAt`, its matrix with `setMatrixAt`, and the tile field
  flagging every frame — **all seven red**, each on the test that names it.
- `perf.test.ts` now drives the governor as `Arena.tsx` does — `governorFrame(w,
  now, dpr)`, the defaults — for every case that is the arena's own; the controls
  still spell out `early: false`. Flipping the default to `false` (the verifier's
  nc9) turns two tests red.

### 10.8 The rest of the verifier's findings

- The frame-body row of §0 is withdrawn (§0's note).
- §2.4's census and §5.1's comic-against-hologram A/B now name their rasteriser
  and render dpr (the GTX 1080 through ANGLE, dpr 1).
- `gpu-pass.test.ts`'s header said an empty `InstancedMesh` "still costs a draw
  call"; it is set up and issues none (D271.4), and says so.
- The chunk sizes are unchanged from the draft (the fix pass touched no app
  code): `arena-scene` 394.12 kB gzip against the base's 393.36 — follow-up 9, as
  disclosed; the arena's two chunks together are still 0.27 kB gzip smaller.
- Two of the first `--vsync` traces of this build held long main-thread tasks —
  two JavaScript tasks of ~91 ms mid-sample (a timer, a scheduler message) in one,
  a 102 ms protocol message at the start of another taken with the profiler on —
  and the first base trace none. Three more pairs, alternating, held nothing of
  50 ms or more in either build, and none of this build's 22 `--vsync` bench
  runs (no trace) drew a frame over 16.8 ms: as far as this pass could tell, a
  trace's own cost. The traces are `var/gpu-fix/trace-*-vsync*.json` and
  `lt-*.json`.

### 10.9 The gate

From a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9360`: **268.9 s**, exit 0,
48 jobs (1,009.2 s summed) at a load average of 7.1–11.1, `node --test` 1,210 /
1,199 pass / 0 fail / 11 skipped and vitest 157 (9 files) (`var/check-all-gpu-fix.log`,
run `20260929-134500-1795228`). The first run (13:40, 275.2 s) failed at `13c-node`
alone: `claude-md.test.ts` found the rules manifest still carrying `web/CLAUDE.md`'s
old test count — a bold span this pass changed after it regenerated the manifest.
Regenerated, and the gate run again from a deleted `bridge/out`; the failed run is
`var/check-all-gpu-fix-failed1.log`. `node tools/build-workshop-catalog.ts --check`:
current. `npm run build`: every chunk the draft's, byte for byte (the same hashes).
`~/forge` and `~/.forge`: a listing of every path under each with its size, mtime
and mode identical at 12:50 and after the gate (13:50), the `~/.forge` files'
contents hashed the same both times, the jar still `3c0a7c38…8e5dd9`.
