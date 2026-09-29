/*
 * mtg-table — web/src/personal/png.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **A PNG decoder for the relief maps, Node only** (the portrait standee,
 * **D260**). The dev route (`devRoute.ts`) measures each map's standee cut from
 * its own pixels once (`arena/standee.ts`'s `standeeCutOf`), and the maps are
 * what `tools/personal/relief.mjs` writes: 8-bit, non-interlaced, greyscale, RGB
 * or RGBA (PIL's default encoder). That is all this reads — anything else is
 * `null`, and the map then stands no standee (the inspect view is unaffected).
 * No dependency: `node:zlib` inflates, the five filters are undone here.
 *
 * Imported by the dev route alone, which runs in Vite's Node process — never by
 * a browser module (`personal.test.ts` holds the route's imports).
 */

import { inflateSync } from 'node:zlib';

export interface DecodedPng {
  width: number;
  height: number;
  /** 1 (grey), 3 (RGB) or 4 (RGBA). */
  channels: number;
  /** Rows top-down, `channels` bytes a pixel. */
  pixels: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 6: 4 };

/** The PNG's pixels, or `null` for a file this does not read (see the header). */
export function decodePng(bytes: Uint8Array): DecodedPng | null {
  if (bytes.length < 33 || !SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Uint8Array[] = [];
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4]!, bytes[offset + 5]!, bytes[offset + 6]!, bytes[offset + 7]!);
    const start = offset + 8;
    if (start + length > bytes.length) return null;
    if (type === 'IHDR') {
      width = view.getUint32(start);
      height = view.getUint32(start + 4);
      const depth = bytes[start + 8];
      const colour = bytes[start + 9]!;
      const interlace = bytes[start + 12];
      channels = CHANNELS[colour] ?? 0;
      if (depth !== 8 || interlace !== 0 || channels === 0 || width === 0 || height === 0) return null;
    } else if (type === 'IDAT') {
      data.push(bytes.subarray(start, start + length));
    } else if (type === 'IEND') {
      break;
    }
    offset = start + length + 4;
  }
  if (channels === 0 || data.length === 0) return null;
  let raw: Uint8Array;
  try {
    raw = inflateSync(Buffer.concat(data));
  } catch {
    return null;
  }
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const from = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[from + x]!;
      const left = x >= channels ? pixels[row + x - channels]! : 0;
      const up = y > 0 ? pixels[row - stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels]! : 0;
      let predicted: number;
      switch (filter) {
        case 0:
          predicted = 0;
          break;
        case 1:
          predicted = left;
          break;
        case 2:
          predicted = up;
          break;
        case 3:
          predicted = (left + up) >> 1;
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          break;
        }
        default:
          return null;
      }
      pixels[row + x] = (value + predicted) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}
