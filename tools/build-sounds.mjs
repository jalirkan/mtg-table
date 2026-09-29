#!/usr/bin/env node
/*
 * mtg-table — tools/build-sounds.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's sound clips, drawn by this repository's own code** (D250, D252).
 *
 *     node tools/build-sounds.mjs                 # synthesise, encode, write web/public/audio/*.ogg, verify
 *     node tools/build-sounds.mjs --firefox       # …and check headless Firefox decodes every clip too
 *     node tools/build-sounds.mjs --out var/sounds/check   # write elsewhere (the reproducibility check)
 *     node tools/build-sounds.mjs --wav var/sounds/wav     # also the PCM as .wav, to listen to
 *     node tools/build-sounds.mjs --port 9239 --http 9238  # the DevTools and page ports
 *
 * Run from the repo root (hard rule 9). Not in the gate: it needs a headless
 * Chromium (and, with `--firefox`, a Firefox), like `tools/arena-bench.mjs`.
 *
 * **What it makes, and from what.** Eleven short clips — the seven default sounds
 * (`enter`, `lunge`, `hit`, `death`, `resolve`, `victory`, `defeat`) and four
 * S.H.I.E.L.D. cards' own (`comms`, `laser`, `rumble`, `sting`) — synthesised
 * sample by sample below from sine partials, filtered noise from a seeded
 * generator and envelopes. Nothing is downloaded, nothing is sampled, and nothing
 * is derived from or refers to card art: this is `tools/assets-manifest.json`'s
 * `procedural` kind (the status glyphs' rule, D54 extended to what nobody
 * downloaded), GPL-3.0-or-later like the rest of the repository. The brief's
 * intended source was a Kenney CC0 audio pack; a download needs the owner's
 * approval in chat, and this lane ran without one (D252). A pack's OGG clip drops
 * in at the same path with a manifest entry of its own — the loader cannot tell.
 *
 * **How it is encoded, with no encoder installed.** The machine has no ffmpeg,
 * sox, oggenc or opusenc, and the repo installs none. Headless Chromium has one:
 * WebCodecs' `AudioEncoder` (libopus). So the PCM is served to a page on
 * 127.0.0.1 (WebCodecs needs a secure context, and loopback is one), encoded
 * there at 48 kHz mono, VBR ~40 kb/s, 20 ms frames, and the packets come back to
 * Node, which writes the Ogg container itself (RFC 7845: OpusHead with the
 * encoder's own pre-skip, OpusTags, one page of audio packets, the last granule
 * trimming the end to the clip's own length; RFC 3533's CRC). Chromium's
 * `AudioEncoder` will not write Ogg itself ("Opus Ogg format is unsupported").
 *
 * **What it verifies.** The same page decodes every written file with
 * `OfflineAudioContext.decodeAudioData` — the call `scene/audio.ts` makes — and
 * reports its length and its best correlation with the source PCM (a wrong
 * pre-skip shows as a lag, a broken page as a failure). `--firefox` runs the same
 * check page in headless Firefox (the other browser on this machine) and waits
 * for its report. Every number lands in `var/sounds/build.json`.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const ROOT = process.cwd();
const OUT = resolve(arg('out', 'web/public/audio'));
const WAV = arg('wav', null);
const PORT = Number(arg('port', '9239'));
const HTTP = Number(arg('http', '9238'));
const CHROMIUM = arg('chromium', 'chromium');
const FIREFOX = arg('firefox-bin', 'firefox');
const WORK = resolve('var/sounds');
const RATE = 48000;
const BITRATE = Number(arg('bitrate', '40000'));

// ---------------------------------------------------------------------------
// Synthesis — deterministic: a seeded generator, no clock, no randomness else
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const samples = (seconds) => Math.round(seconds * RATE);

/** White noise in [−1, 1] from a seed. */
function noise(n, seed) {
  const rand = mulberry32(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
  return out;
}

/** An RBJ biquad, run in place; `f` may be a function of the sample index. */
function biquad(x, type, f, q = 0.707) {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const freq = typeof f === 'function' ? f(i) : f;
    const w = (TAU * Math.min(freq, RATE * 0.45)) / RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0;
    let b1;
    let b2;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** A tone whose frequency may glide: `freq(t)` in Hz, `harmonics` as [ratio, amplitude]. */
function tone(n, freq, harmonics = [[1, 1]], phase0 = 0) {
  const out = new Float32Array(n);
  const phases = harmonics.map(() => phase0);
  for (let i = 0; i < n; i++) {
    const f = typeof freq === 'function' ? freq(i / RATE) : freq;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) {
      const [ratio, amp] = harmonics[h];
      if (f * ratio < RATE * 0.45) v += amp * Math.sin(phases[h]);
      phases[h] += (TAU * f * ratio) / RATE;
    }
    out[i] = v;
  }
  return out;
}

/** attack (s), then an exponential decay with time constant `tau` (s). */
const env = (attack, tau, delay = 0) => (t) => {
  if (t < delay) return 0;
  const u = t - delay;
  return u < attack ? u / attack : Math.exp(-(u - attack) / tau);
};

/** Sum `parts` (each [signal, gain, envelope?, offsetSeconds?]) into one clip of `seconds`. */
function mix(seconds, parts) {
  const n = samples(seconds);
  const out = new Float32Array(n);
  for (const [signal, gain, envelope, offset = 0] of parts) {
    const start = samples(offset);
    for (let i = 0; i < signal.length && start + i < n; i++) {
      const t = i / RATE;
      out[start + i] += gain * signal[i] * (envelope === undefined ? 1 : envelope(t));
    }
  }
  return out;
}

/** Fade the ends, then normalise the peak to −1 dBFS. */
function finish(x) {
  const fadeIn = samples(0.002);
  const fadeOut = samples(0.012);
  for (let i = 0; i < fadeIn && i < x.length; i++) x[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut && i < x.length; i++) x[x.length - 1 - i] *= i / fadeOut;
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  return x;
}

const NOTE = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Every clip: id → seconds and the recipe. The ids are `cues/sound.ts`'s `SOUND_IDS`. */
const CLIPS = {
  // A card arriving: a soft low "whomp" under a short air swish.
  enter: () => {
    const s = 0.34;
    const n = samples(s);
    const body = tone(n, (t) => 70 + 150 * Math.exp(-t / 0.05));
    const air = biquad(noise(n, 11), 'bandpass', (i) => 800 + 2400 * Math.exp(-i / RATE / 0.07), 1.2);
    return mix(s, [
      [body, 0.9, env(0.006, 0.085)],
      [air, 0.45, env(0.03, 0.06)],
    ]);
  },
  // An attack's lunge: a whoosh, band-passed noise sweeping up and back down.
  lunge: () => {
    const s = 0.32;
    const n = samples(s);
    const sweep = (i) => {
      const u = i / n;
      return 450 + 2300 * Math.sin(Math.PI * Math.min(1, u * 1.15));
    };
    const air = biquad(noise(n, 23), 'bandpass', sweep, 1.4);
    const bell = (t) => Math.sin(Math.PI * Math.min(1, t / s)) ** 1.5;
    return mix(s, [[air, 1, bell]]);
  },
  // A hit: a punch — a pitched thump, a lowpassed burst and a crack.
  hit: () => {
    const s = 0.26;
    const n = samples(s);
    const thump = tone(n, (t) => 55 + 95 * Math.exp(-t / 0.03));
    const burst = biquad(noise(n, 37), 'lowpass', 2400);
    const crack = biquad(noise(n, 41), 'highpass', 2800);
    return mix(s, [
      [thump, 1, env(0.002, 0.07)],
      [burst, 0.8, env(0.001, 0.028)],
      [crack, 0.45, env(0.0005, 0.008)],
    ]);
  },
  // A death: a heavy falling thud and a short crumble after it.
  death: () => {
    const s = 0.62;
    const n = samples(s);
    const thud = tone(n, (t) => 38 + 80 * Math.exp(-t / 0.12), [
      [1, 1],
      [2, 0.25],
    ]);
    const grains = biquad(noise(n, 53), 'lowpass', 900);
    const flutter = mulberry32(59);
    const crumble = new Float32Array(n);
    let gate = 0;
    for (let i = 0; i < n; i++) {
      if (i % 1600 === 0) gate = 0.3 + 0.7 * flutter();
      crumble[i] = grains[i] * gate;
    }
    return mix(s, [
      [thud, 1, env(0.004, 0.16)],
      [crumble, 0.5, env(0.02, 0.18, 0.05)],
    ]);
  },
  // A spell resolving: a small bell — C6 with inharmonic partials, then G6.
  resolve: () => {
    const s = 0.7;
    const n = samples(s);
    const bell = (f) =>
      tone(n, f, [
        [1, 1],
        [2, 0.3],
        [2.76, 0.22],
        [5.4, 0.08],
      ]);
    return mix(s, [
      [bell(NOTE(84)), 0.8, env(0.003, 0.22)],
      [bell(NOTE(91)), 0.55, env(0.003, 0.24), 0.05],
    ]);
  },
  // The outcome, won: a rising major arpeggio that rings out.
  victory: () => {
    const s = 1.2;
    const notes = [72, 76, 79, 84];
    const parts = notes.map((m, k) => {
      const n = samples(s);
      const voice = tone(n, NOTE(m), [
        [1, 1],
        [2, 0.35],
        [3, 0.18],
      ]);
      return [voice, k === notes.length - 1 ? 0.8 : 0.6, env(0.004, k === notes.length - 1 ? 0.42 : 0.2), 0.11 * k];
    });
    return mix(s, parts);
  },
  // The outcome, lost: a falling minor figure, soft-edged, the last note drooping.
  defeat: () => {
    const s = 1.2;
    const notes = [67, 63, 60];
    const parts = notes.map((m, k) => {
      const n = samples(s);
      const last = k === notes.length - 1;
      const f = last ? (t) => NOTE(m) * (1 - 0.03 * Math.min(1, t / 0.6)) : NOTE(m);
      const voice = biquad(
        tone(n, f, [
          [1, 1],
          [3, 1 / 9],
          [5, 1 / 25],
        ]),
        'lowpass',
        1800,
      );
      return [voice, last ? 0.8 : 0.6, env(0.012, last ? 0.5 : 0.18), 0.2 * k];
    });
    return mix(s, parts);
  },
  // Nick Fury's radio call: squelch, two chirps, squelch.
  comms: () => {
    const s = 0.4;
    const n = samples(s);
    const beep = (f, len) =>
      tone(samples(len), f, [
        [1, 1],
        [3, 0.3],
      ]);
    const squelch = biquad(noise(n, 71), 'bandpass', 3000, 0.9);
    const box = (a, b) => (t) => (t < a ? 0 : t < b ? 1 : 0);
    return mix(s, [
      [squelch, 0.35, box(0, 0.035)],
      [beep(1400, 0.06), 0.55, env(0.003, 0.2), 0.04],
      [beep(1850, 0.07), 0.55, env(0.003, 0.2), 0.13],
      [squelch, 0.3, box(0.24, 0.29)],
    ]);
  },
  // Helicarrier Strike's beam: a falling, buzzing laser sweep.
  laser: () => {
    const s = 0.5;
    const n = samples(s);
    const f = (t) => (260 + 2340 * Math.exp(-t / 0.11)) * (1 + 0.03 * Math.sin(TAU * 30 * t));
    const saw = tone(n, f, [
      [1, 1],
      [2, 1 / 2],
      [3, 1 / 3],
      [4, 1 / 4],
      [5, 1 / 5],
      [6, 1 / 6],
    ]);
    return mix(s, [[biquad(saw, 'lowpass', 5200), 1, env(0.003, 0.14)]]);
  },
  // Quake's Seismic Takedown: a deep rumble that swells and settles.
  rumble: () => {
    const s = 0.9;
    const n = samples(s);
    const ground = biquad(biquad(noise(n, 83), 'lowpass', 160), 'lowpass', 160);
    const lows = tone(n, 42, [
      [1, 1],
      [55 / 42, 0.7],
    ]);
    const tremor = (t) => 0.75 + 0.25 * Math.sin(TAU * 9 * t);
    const swell = (t) => (t < 0.08 ? t / 0.08 : Math.exp(-(t - 0.08) / 0.3)) * tremor(t);
    return mix(s, [
      [ground, 3.2, swell],
      [lows, 0.55, swell],
    ]);
  },
  // Wasp's sting: an electric zap — a buzzing square with crackle and a whine.
  sting: () => {
    const s = 0.34;
    const n = samples(s);
    const buzz = tone(n, (t) => 110 * (1 + 0.04 * Math.sin(TAU * 43 * t)), [
      [1, 1],
      [3, 1 / 3],
      [5, 1 / 5],
      [7, 1 / 7],
      [9, 1 / 9],
    ]);
    const crackle = biquad(noise(n, 97), 'highpass', 3200);
    const pops = mulberry32(101);
    for (let i = 0; i < n; i++) if (pops() < 0.9) crackle[i] *= 0.25;
    const whine = tone(n, (t) => 2000 + 1200 * Math.min(1, t / 0.25));
    return mix(s, [
      [buzz, 0.7, env(0.002, 0.09)],
      [crackle, 0.6, env(0.001, 0.07)],
      [whine, 0.12, env(0.01, 0.1)],
    ]);
  },
};

// ---------------------------------------------------------------------------
// Ogg Opus (RFC 7845 over RFC 3533) — the container Chromium will not write
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let k = 0; k < 8; k++) r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc(bytes) {
  let crc = 0;
  for (const b of bytes) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ b) & 0xff]) >>> 0;
  return crc >>> 0;
}

function oggPage(packets, { granule, serial, sequence, bos = false, eos = false }) {
  const lacing = [];
  for (const packet of packets) {
    let left = packet.length;
    while (left >= 255) {
      lacing.push(255);
      left -= 255;
    }
    lacing.push(left);
  }
  if (lacing.length > 255) throw new Error(`an Ogg page holds 255 segments, this one ${String(lacing.length)}`);
  const body = Buffer.concat(packets.map((p) => Buffer.from(p)));
  const header = Buffer.alloc(27 + lacing.length);
  header.write('OggS', 0, 'ascii');
  header[4] = 0;
  header[5] = (bos ? 0x02 : 0) | (eos ? 0x04 : 0);
  header.writeBigInt64LE(BigInt(granule), 6);
  header.writeUInt32LE(serial, 14);
  header.writeUInt32LE(sequence, 18);
  header.writeUInt32LE(0, 22);
  header[26] = lacing.length;
  for (let i = 0; i < lacing.length; i++) header[27 + i] = lacing[i];
  const page = Buffer.concat([header, body]);
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}

/** The whole file: OpusHead (the encoder's own), OpusTags, then the audio packets. */
function oggOpus(id, head, packets, frames, serial) {
  const preSkip = head[10] | (head[11] << 8);
  const vendor = Buffer.from('mtg-table tools/build-sounds.mjs (libopus via Chromium WebCodecs)', 'utf8');
  const comments = [`TITLE=${id}`, 'LICENSE=GPL-3.0-or-later', 'COMMENT=procedural: drawn by mtg-table’s own code, no sample, no card art'].map(
    (c) => Buffer.from(c, 'utf8'),
  );
  const tags = Buffer.alloc(8 + 4 + vendor.length + 4 + comments.reduce((a, c) => a + 4 + c.length, 0));
  let o = tags.write('OpusTags', 0, 'ascii');
  o = tags.writeUInt32LE(vendor.length, o);
  o += vendor.copy(tags, o);
  o = tags.writeUInt32LE(comments.length, o);
  for (const c of comments) {
    o = tags.writeUInt32LE(c.length, o);
    o += c.copy(tags, o);
  }
  const pages = [
    oggPage([Buffer.from(head)], { granule: 0, serial, sequence: 0, bos: true }),
    oggPage([tags], { granule: 0, serial, sequence: 1 }),
  ];
  // Audio: as many packets per page as the segment table holds; the LAST page's
  // granule is pre-skip + the clip's own length, which trims the encoder's tail.
  let sequence = 2;
  let decoded = 0;
  for (let start = 0; start < packets.length; ) {
    const page = [];
    let segments = 0;
    while (start < packets.length) {
      const need = Math.floor(packets[start].length / 255) + 1;
      if (segments + need > 255) break;
      page.push(packets[start]);
      decoded += packets[start].samples;
      segments += need;
      start += 1;
    }
    const last = start >= packets.length;
    const granule = last ? Math.min(decoded, preSkip + frames) : decoded;
    pages.push(oggPage(page.map((p) => p.bytes), { granule, serial, sequence, eos: last }));
    sequence += 1;
  }
  return { bytes: Buffer.concat(pages), preSkip };
}

function wavOf(pcm) {
  const data = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// ---------------------------------------------------------------------------
// The page: encode, and decode back — the same calls the arena makes
// ---------------------------------------------------------------------------

const PAGE_JS = `
async function encodeAll(ids, bitrate) {
  const out = {};
  for (const id of ids) {
    const pcm = new Float32Array(await (await fetch('/pcm/' + id)).arrayBuffer());
    const packets = [];
    let head = null;
    const enc = new AudioEncoder({
      output: (chunk, meta) => {
        const bytes = new Uint8Array(chunk.byteLength);
        chunk.copyTo(bytes);
        packets.push({ b64: btoa(String.fromCharCode(...bytes)), samples: Math.round((chunk.duration ?? 20000) * 48000 / 1e6) });
        if (meta && meta.decoderConfig && meta.decoderConfig.description) head = Array.from(new Uint8Array(meta.decoderConfig.description));
      },
      error: (e) => { throw e; },
    });
    enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate, bitrateMode: 'variable',
      opus: { format: 'opus', frameDuration: 20000, complexity: 10, application: 'audio' } });
    enc.encode(new AudioData({ format: 'f32', sampleRate: 48000, numberOfFrames: pcm.length, numberOfChannels: 1, timestamp: 0, data: pcm }));
    await enc.flush();
    enc.close();
    out[id] = { head, packets };
  }
  return out;
}
async function decodeAll(ids, dir) {
  const out = {};
  for (const id of ids) {
    try {
      const source = new Float32Array(await (await fetch('/pcm/' + id)).arrayBuffer());
      const bytes = await (await fetch('/' + dir + '/' + id + '.ogg')).arrayBuffer();
      const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes);
      const got = buffer.getChannelData(0);
      let best = { lag: 0, r: -2 };
      for (let lag = -400; lag <= 400; lag += 1) {
        let xy = 0, xx = 0, yy = 0;
        for (let i = 0; i < source.length; i++) {
          const j = i + lag;
          if (j < 0 || j >= got.length) continue;
          xy += source[i] * got[j]; xx += source[i] * source[i]; yy += got[j] * got[j];
        }
        const r = xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0;
        if (r > best.r) best = { lag, r };
      }
      let peak = 0;
      for (const v of got) peak = Math.max(peak, Math.abs(v));
      out[id] = { ok: true, sampleRate: buffer.sampleRate, length: buffer.length, sourceLength: source.length, peak, lag: best.lag, r: best.r };
    } catch (e) {
      out[id] = { ok: false, error: String(e) };
    }
  }
  return out;
}
`;

/**
 * A clip decoded well: the same number of samples as its source (the last
 * granule trimmed it), and its waveform lined up with the source within half a
 * millisecond. The search spans ±400 samples, so a wrong pre-skip (312 here)
 * shows as a lag, not a pass. Opus codes noise by band energy rather than by
 * waveform, so a whoosh correlates less than a tone; 0.7 is the floor.
 */
function decodedWell(d) {
  return d.ok && Math.abs(d.length - d.sourceLength) <= 1 && d.r >= 0.7 && Math.abs(d.lag) <= 24;
}

const CHECK_HTML = (ids, dir) => `<!doctype html><meta charset="utf-8"><title>sound check</title>
<script>${PAGE_JS}
decodeAll(${JSON.stringify(ids)}, ${JSON.stringify(dir)}).then((r) =>
  fetch('/report', { method: 'POST', body: JSON.stringify({ ua: navigator.userAgent, results: r }) }));
</script><body>decoding…<img src="/hold" alt="">`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ids = Object.keys(CLIPS);
const pcm = new Map(ids.map((id) => [id, finish(CLIPS[id]())]));
mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });
if (WAV !== null) {
  mkdirSync(WAV, { recursive: true });
  for (const [id, x] of pcm) writeFileSync(join(WAV, `${id}.wav`), wavOf(x));
}

const outDir = OUT.startsWith(ROOT) ? OUT.slice(ROOT.length + 1) : OUT;
let report = null;
let releaseHold = null;
const holdWaiters = [];
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${String(HTTP)}`);
  if (url.pathname === '/' || url.pathname === '/encode.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><meta charset="utf-8"><title>encode</title><script>${PAGE_JS}</script>`);
    return;
  }
  if (url.pathname === '/check.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(CHECK_HTML(ids, 'out'));
    return;
  }
  if (url.pathname.startsWith('/pcm/')) {
    const x = pcm.get(url.pathname.slice(5));
    if (x === undefined) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    res.end(Buffer.from(x.buffer, x.byteOffset, x.byteLength));
    return;
  }
  if (url.pathname.startsWith('/out/')) {
    try {
      const bytes = readFileSync(join(OUT, url.pathname.slice(5)));
      res.writeHead(200, { 'content-type': 'audio/ogg' });
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
    return;
  }
  if (url.pathname === '/report' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += String(c)));
    req.on('end', () => {
      report = JSON.parse(body);
      res.writeHead(204).end();
      releaseHold?.();
    });
    return;
  }
  if (url.pathname === '/hold') {
    // Firefox's --screenshot waits for the load event; this image holds it until
    // the page has reported (or 30 s), so the browser does not exit mid-decode.
    const send = () => {
      res.writeHead(204).end();
    };
    if (report !== null) send();
    else holdWaiters.push(send);
    return;
  }
  res.writeHead(404).end();
});
releaseHold = () => {
  while (holdWaiters.length > 0) holdWaiters.shift()();
};
await new Promise((r) => server.listen(HTTP, '127.0.0.1', () => r(undefined)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = join(WORK, 'chromium-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(
  CHROMIUM,
  ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${String(PORT)}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${String(HTTP)}/encode.html`],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let chromeErr = '';
chrome.stderr.on('data', (b) => (chromeErr += String(b)));

let target = null;
for (let i = 0; i < 100 && target === null; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)).json();
    target = list.find((t) => t.type === 'page' && t.url.includes('/encode.html')) ?? null;
  } catch {
    /* not up yet */
  }
  if (target === null) await sleep(200);
}
if (target === null) throw new Error(`chromium never answered on ${String(PORT)}\n${chromeErr}`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener('open', () => r(undefined)));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const msg = JSON.parse(String(event.data));
  const entry = pending.get(msg.id);
  if (entry === undefined) return;
  pending.delete(msg.id);
  entry(msg);
});
const evaluate = async (expression) => {
  nextId += 1;
  const id = nextId;
  const msg = await new Promise((r) => {
    pending.set(id, r);
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
  if (msg.result?.exceptionDetails) throw new Error(JSON.stringify(msg.result.exceptionDetails));
  return msg.result.result.value;
};

try {
  // The target is listed before its script has run: wait for the page's functions.
  for (let i = 0; i < 100 && (await evaluate("typeof encodeAll + typeof decodeAll")) !== 'functionfunction'; i++) await sleep(100);
  const ua = await evaluate('navigator.userAgent');
  const encoded = await evaluate(`encodeAll(${JSON.stringify(ids)}, ${String(BITRATE)})`);
  const summary = { built: new Date().toISOString().slice(0, 10), chromium: ua, bitrate: BITRATE, rate: RATE, clips: {} };
  let serial = 0x6d746701;
  for (const id of ids) {
    const { head, packets } = encoded[id];
    if (head === null) throw new Error(`${id}: the encoder gave no OpusHead`);
    const x = pcm.get(id);
    const { bytes, preSkip } = oggOpus(
      id,
      head,
      packets.map((p) => ({ bytes: Buffer.from(p.b64, 'base64'), samples: p.samples })),
      x.length,
      serial++,
    );
    writeFileSync(join(OUT, `${id}.ogg`), bytes);
    summary.clips[id] = {
      file: `${outDir}/${id}.ogg`,
      seconds: Number((x.length / RATE).toFixed(3)),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      packets: packets.length,
      preSkip,
    };
  }
  const decoded = await evaluate(`decodeAll(${JSON.stringify(ids)}, 'out')`);
  summary.chromiumDecode = decoded;
  let failed = 0;
  for (const id of ids) {
    const d = decoded[id];
    const good = decodedWell(d);
    if (!good) failed += 1;
    console.log(
      `${id.padEnd(8)} ${String(summary.clips[id].bytes).padStart(6)} B  ${summary.clips[id].seconds.toFixed(3)} s  ` +
        (d.ok ? `chromium: ${String(d.length)} samples (source ${String(d.sourceLength)}), r ${d.r.toFixed(3)} at lag ${String(d.lag)}` : `chromium FAILED: ${d.error}`),
    );
  }
  const total = ids.reduce((a, id) => a + summary.clips[id].bytes, 0);
  summary.totalBytes = total;
  console.log(`total ${String(total)} B in ${String(ids.length)} clips → ${outDir}/`);

  if (flag('firefox')) {
    report = null;
    const ffProfile = join(WORK, 'firefox-profile');
    rmSync(ffProfile, { recursive: true, force: true });
    mkdirSync(ffProfile, { recursive: true });
    const shot = join(WORK, 'firefox-check.png');
    const ff = spawn(FIREFOX, ['--headless', '--no-remote', '--profile', ffProfile, '--screenshot', shot, `http://127.0.0.1:${String(HTTP)}/check.html`], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let ffErr = '';
    ff.stderr.on('data', (b) => (ffErr += String(b)));
    for (let i = 0; i < 300 && report === null; i++) await sleep(100);
    releaseHold();
    await new Promise((r) => {
      const timer = setTimeout(r, 15000);
      ff.on('exit', () => {
        clearTimeout(timer);
        r(undefined);
      });
    });
    if (report === null) {
      console.log(`firefox: no report\n${ffErr.slice(-800)}`);
      failed += 1;
    } else {
      summary.firefox = report;
      for (const id of ids) {
        const d = report.results[id];
        const good = decodedWell(d);
        if (!good) failed += 1;
        console.log(`${id.padEnd(8)} firefox: ${d.ok ? `${String(d.length)} samples, r ${d.r.toFixed(3)} at lag ${String(d.lag)}` : `FAILED ${d.error}`}`);
      }
      console.log(`firefox: ${report.ua}`);
    }
  }
  writeFileSync(join(WORK, 'build.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`summary → var/sounds/build.json`);
  if (failed > 0) {
    console.error(`${String(failed)} decode check(s) failed`);
    process.exitCode = 1;
  }
} finally {
  // `Browser.close`, not a signal: the snap's chromium cannot be signalled from here.
  try {
    const version = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/version`)).json();
    const closer = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => closer.addEventListener('open', () => r(undefined)));
    closer.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await sleep(600);
    closer.close();
  } catch {
    /* already gone */
  }
  socket.close();
  server.close();
}
