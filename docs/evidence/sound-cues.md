# Sound cues — what was built and what was measured (2026-09-29, D250–D252)

Branch `sound-cues`, worktree `mtg-table-t2s2`, off `main`'s `24ba603`. The
decisions are **D250** (sound as a cue param under the visual rules), **D251**
(muted by default, the gesture, reduced motion, the voice pool) and **D252** (the
clips are the repository's own). The conventions are `web/src/arena/CLAUDE.md`'s
*Sound*; the manual is README's *Sound*; the status and follow-ups are PLAN.md's
*Sound cues*.

**A headless browser cannot hear.** Nothing below is a claim about what the clips
sound like beyond what their recipes say and what the numbers show: the clips
decode, line up with their source, the page builds its graph only on a gesture,
and the film asks for — and a voice starts — the sounds the tests say it should.
Whether they are pleasant is the owner's call, with the sound on, in a replay.

## 1. The clips

Eleven clips, synthesised by `tools/build-sounds.mjs` sample by sample (sine
partials, filtered noise from a seeded generator, envelopes; 48 kHz mono, every
clip normalised to −1 dBFS peak), encoded to Ogg Opus at ~40 kb/s VBR, 20 ms
frames, by headless Chromium's WebCodecs `AudioEncoder`, with the Ogg container
written by the tool itself. No sample, no download, nothing derived from or
referring to card art (D252). All eleven: **39,545 bytes**.

| clip | s | bytes | packets | Chromium r / lag | Firefox r / lag | sha256 |
|---|---|---|---|---|---|---|
| `enter` | 0.34 | 1,942 | 18 | 0.996 / −2 | 0.996 / −2 | 68d7ee2e…6412f6 |
| `lunge` | 0.32 | 1,929 | 17 | 0.774 / −1 | 0.774 / −1 | ffd8fe97…4012cc |
| `hit` | 0.26 | 1,509 | 14 | 0.990 / 0 | 0.990 / 0 | d74a7bea…e71f65 |
| `death` | 0.62 | 3,598 | 32 | 0.999 / −3 | 0.999 / −3 | a8c5be36…301485 |
| `resolve` | 0.70 | 4,503 | 36 | 0.988 / −2 | 0.988 / −2 | 244d7886…591e5f |
| `victory` | 1.20 | 6,629 | 61 | 0.996 / 0 | 0.996 / 0 | 5a9fbe8c…143f49 |
| `defeat` | 1.20 | 6,628 | 61 | 1.000 / 0 | 1.000 / 0 | 96f98209…a295cf |
| `comms` | 0.40 | 2,547 | 21 | 0.995 / 0 | 0.995 / 0 | ff0eb500…83d776 |
| `laser` | 0.50 | 3,053 | 26 | 0.985 / 0 | 0.985 / 0 | 05fcf51c…9c127f |
| `rumble` | 0.90 | 5,037 | 46 | 0.999 / −11 | 0.999 / −11 | 99504da4…afd6b4 |
| `sting` | 0.34 | 2,170 | 18 | 0.973 / 0 | 0.973 / 0 | 4b5b8716…3df9a6 |

*r / lag* is the decoded clip's best correlation with its source PCM and the lag
(in samples at 48 kHz) where it peaks, searched over ±400 samples — a wrong Opus
pre-skip (312 here) would show as a lag near 312, a broken page as a failure.
Every decoded clip is exactly as long as its source (the last page's granule trims
the encoder's tail). `lunge` is band-passed noise, which Opus codes by band energy
rather than by waveform, hence its lower r; `rumble` is mostly below 60 Hz, where a
lag of 11 samples is a fraction of a cycle. Full rows and sha256s are in
`tools/assets-manifest.json`'s `procedural.soundClips`; `sound.test.ts` holds every
committed file to its row.

**What each one is**, by recipe (source levels, before Opus): `enter` a low whomp
(a sine gliding 220 → 70 Hz) under a short air swish, RMS −12.9 dBFS; `lunge` a
whoosh (noise band-passed up to ~2.7 kHz and back), −15.6; `hit` a punch — a thump
gliding 150 → 55 Hz, a low-passed burst and a crack, −15.0; `death` a heavy thud
(118 → 38 Hz) and a gated crumble, −13.3; `resolve` a small bell, C6 then G6 with
inharmonic partials, −15.6; `victory` a rising C-major arpeggio, −14.3; `defeat` a
falling G–E♭–C figure, soft-edged, the last note drooping 3 %, −11.0; `comms` a
squelch, two chirps (1.4 and 1.85 kHz) and a squelch, −9.1; `laser` a buzzing saw
sweep 2.6 kHz → 260 Hz, −12.7; `rumble` twice-low-passed noise and 42/55 Hz tones
swelling with a 9 Hz tremor, −15.6; `sting` a buzzing 110 Hz square with crackle
and a rising whine, −16.2. Every voice then runs through a 0.7 master gain, and the
default rows scale their clips (0.5 for the resolve chime up to 1 for a lethal
hit) — the numbers are `defaults.ts`'s and `cues.json`'s.

## 2. Encoding with what the machine has

`ffmpeg`, `ffprobe`, `sox`, `oggenc`, `opusenc`, `lame` and `flac`: none installed;
the repository installs nothing. Chromium 152.0.7977.64 (snap) has WebCodecs'
`AudioEncoder` with `codec: 'opus'` — but only in a secure context (`about:blank`
reported `AudioEncoder` undefined; a page on `http://127.0.0.1` has it), and only
raw packets: `opus: { format: 'ogg' }` is refused ("Opus Ogg format is
unsupported"). So the tool serves the PCM from a loopback server, encodes in the
page, and writes OpusHead (the encoder's own description, pre-skip 312), OpusTags
(`TITLE`, `LICENSE=GPL-3.0-or-later`, a `COMMENT` on its provenance) and one page of
audio packets whose granule trims the end, with RFC 3533's CRC.

- **Chromium** decodes all eleven through `OfflineAudioContext.decodeAudioData`
  (the call `scene/audio.ts` makes).
- **Firefox 155** (snap, headless, a throwaway profile under `var/sounds/`)
  decodes all eleven: `--firefox` serves the same check page, holds the page's load
  on an image until the page has reported, and reads the report. Identical r and
  lag to Chromium's.
- **Reproducible**: a second build into `var/sounds/check/` gave eleven files
  byte-identical to the committed ones (same Chromium build).

## 3. The arena, in headless Chromium — `tools/sound-probe.mjs`

Against the Vite DEV server at 5218 (`MTG_TABLE_PERSONAL=off`), `g1.jsonl`,
Chromium 152 headless, 1600 × 900; the probe reads `window.__mtgArena.audio`.

| moment | context | voices | clips | enabled |
|---|---|---|---|---|
| page loaded, no gesture | `none` (no `AudioContext` at all) | 0 | 0 | false |
| after `M` (a trusted key press through DevTools' input domain) | `running`, 48,000 Hz | 8 | 11 | true |
| reload with `mtg-table.arena.sound` = `on`, before any press | `none` | 0 | 0 | true |
| … after one mouse press on the canvas | `running`, 48,000 Hz | 8 | 11 | true |

**80 frames stepped from frame 150**, one at a time with the replay bar's own
button, each batch drained: 61 batches carried events, **13 made a sound; 22 sounds
asked for, 22 played, 0 dropped, 0 silenced**. The sounding batches: three land
drops (one sound each — a land's `land` and `zone` events are one arrival), two
attacks (two each), and eight batches of spells and triggers cast and resolving
(one to four: an arrival and the resolve chime, once per card per clip per batch).
The per-batch rows are in the probe's report (`var/sounds/probe.json`).

**The cuts**: `K` (skip all) pressed while a batch's first sound rang — the
module's cut counter went up by one, **0 voices sounding** after it, and no sound
played for the skipped cues; a step back (a scrub, a flush) — one more cut, 0
voices; `M` again — `enabled: false`, 0 voices, `localStorage` `off`.

**The pedestal** (`#workshop`, Nick Fury): the Cues panel's *sound* checkbox
(clicked through DevTools' input domain) built the page's one context (`running`,
eight voices, eleven clips); *attack alone*, *enters*, *hit* and *dies* each asked
for one sound and played one (the workshop's handle, `__mtgWorkshop.audio`).

## 4. The corpus — `replay-cues.test.ts`

Every committed recording through the real queue against a `NullStage` (which
records `playSound` apart from its `ops`, so the pinned film is untouched):
**3,689 batches, 912 with a sound, at most 16 in one batch** (over its length, not
at once). Per clip: `enter` 558 · `resolve` 437 · `lunge` 246 · `hit` 180 · `death`
37 · `defeat` 16 · `sting` 15 · `rumble` 13 · `victory` 3 · `laser` 2 · `comms` 1.
Every skip-all at a file's end played nothing new.

**Hard rule 8, the hostile sweep**: every concealed card (a stub or any face-down
card) of every frame handed a name with a per-card row that names `laser` for every
event kind, and every archetype a concealed card can reach (`unknown/C`,
`unknown/*`, `creature/C`, `*/C`, `*/*`) the same. **4,469 cues about a concealed
card, 96 of them with a sound, 0 per-card sounds**; through the real queue, 96 of
4,081 sounds were about a concealed card, every one a default clip. The ungated
control — the same ladder with the gate taken out — gives the wrong sound on all
4,469, and the same assertion catches it. With the gate removed by hand in
`resolve.ts`, `sound.test.ts`'s named-stub case fails too (run once, reverted).

## 5. The budget

- **Draw calls, triangles, frame time: none.** Sound touches no mesh; the frame
  loop does one more indexed pass over a buffer that is empty on every frame but a
  sounding one.
- **Bytes** (`npm run build`, gzip, against `24ba603` built the same way): the 2D
  entry chunk 93.75 → **93.90 kB** (the `M` row in `keys.ts`; no audio module),
  `Arena-*.js` 17.43 → 17.82, `Workshop-*.js` 29.98 → 30.29, `arena-scene-*.js`
  379.53 → **382.38 kB** (`scene/audio.ts` and `cues/sound.ts` live in the scene
  chunk the arena and the workshop share, lazily). The clips are static assets:
  39,545 bytes under `dist/audio/`, fetched once a page, only after a gesture.
- **Allocation**: `play`, `bind`, the voice search, the stage's buffer and the pan
  pass the liveness allocation scan (with its junk-line controls); the fake
  context in `sound.test.ts` counts no node built by 8 plays after warm-up, one
  fresh source per ENDED voice (Web Audio sources play once — armed off the play
  path).

## 6. Tests

`npm --prefix web test`: **1,123 `node --test` (0 fail) + 124 vitest (8 files)**,
from 1,099 + 124 on `24ba603`. New: `sound.test.ts` (18 —
the voice pool, the choice, the clips against the manifest, the ladder, the queue's
firing rules), `replay-cues.test.ts` (2 — the hostile sweep with its control, the
census), `cues-exhaustive.test.ts` (1 — the params, and the sound params in the
all-params sweep), `keys.test.ts` (1 — `M`), `liveness.test.ts` (1 — the module's
shape, its one caller, the queue as the only firer, the play path's allocation;
plus the load-path clause's audio SHAPE with its controls), `workshop.test.ts` (1 —
the cue lines' sounds, the concealed shapes, the pedestal's module).
`claude-md.test.ts`: the rules manifest regenerated for the arena's *Sound*.

## 7. The gate

`./tools/check-all.sh`, twice, each from a deleted `bridge/out`, at `GATE_JOBS=4`:

| run | `WSPORT` | wall | jobs (summed) | load average | exit | log |
|---|---|---|---|---|---|---|
| 1 | 9230 | **265.0 s** | 48 (1,014.8 s) | 2.64 → 15.90 at most | 0 | `var/check-all-sound-p1.log` |
| 2 | 9240 | **285.9 s** | 48 (1,069.2 s) | 14.56 → 17.43 at most | 0 | `var/check-all-sound-p2.log` |

`node --test` inside the gate: 1,138 / 1,127 pass / 0 fail / 11 skipped, and vitest
124 (8 files), both runs. The lane added no step and no job: its tests are in the
web step, and `tools/build-sounds.mjs` and `tools/sound-probe.mjs` need a browser,
so they are not in the gate (like `tools/arena-bench.mjs`). Standalone, `npm
--prefix web test` is 1,123 `node --test` (1,113–1,114 pass, 0 fail, 9–10 skipped —
`personal.test.ts`'s `dist` grep skips until a build exists) + 124 vitest.

## 8. `~/forge` and `~/.forge`

Unchanged. A fingerprint of every path, size and mtime under both trees (22,155
entries, one sha1 of the sorted listing) was taken before the first build and again
after the second gate — identical — and the pinned jar's sha256 is still
`3c0a7c38…8e5dd9`. Nothing here writes outside the worktree but the two browsers'
own snap data; their profiles for the tools live under `var/sounds/`.
