/*
 * mtg-table — tools/forge-scripts.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Forge's own card scripts, read** (D196): `res/cardsfolder/cardsfolder.zip`
 * — every card's `Name:`, `ManaCost:`, `Types:`, `PT:` — for a tool that needs a
 * card's printed facts and cannot wait for a recording to show the card face up
 * (`tools/build-workshop-catalog.ts`). Read-only: it opens the zip the engine
 * ships (through `forge-home/res`, `tools/make-forge-home.sh`'s symlink) and
 * writes nothing; `~/forge` is never written (CLAUDE.md, *Never write outside
 * this repo*).
 *
 * A zip's central directory, walked by hand (`node:zlib` inflates a member), so
 * no dependency is added. Type stripping runs it (Node 24).
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/** Where the engine's scripts are, from the repo root. */
export const CARDS_ZIP = 'forge-home/res/cardsfolder/cardsfolder.zip';

interface Member {
  name: string;
  method: number;
  compressed: number;
  offset: number;
}

/** A reader over one `cardsfolder.zip`: a script's text by its card name, or `null`. */
export interface ForgeScripts {
  /** The zip it reads (its real path). */
  readonly path: string;
  scriptOf(name: string): string | null;
}

/** Forge's file name for a card: lowercase, accents folded, apostrophes dropped, every other run of non-letters an `_`. */
export function scriptFileOf(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base.charAt(0)}/${base}.txt`;
}

/** Open the zip, or `null` when this checkout has no engine resources (CI's web job, a fresh clone). */
export function openForgeScripts(zipPath: string = CARDS_ZIP): ForgeScripts | null {
  if (!existsSync(zipPath)) return null;
  const path = realpathSync(zipPath);
  const zip = readFileSync(path);
  // End of central directory: the last `PK\x05\x06`.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i -= 1) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${path}: not a zip`);
  const count = zip.readUInt16LE(eocd + 10);
  let at = zip.readUInt32LE(eocd + 16);
  const members = new Map<string, Member>();
  for (let i = 0; i < count; i += 1) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error(`${path}: a bad central directory entry`);
    const method = zip.readUInt16LE(at + 10);
    const compressed = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extra = zip.readUInt16LE(at + 30);
    const comment = zip.readUInt16LE(at + 32);
    const offset = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    members.set(name, { name, method, compressed, offset });
    at += 46 + nameLength + extra + comment;
  }
  const read = (member: Member): string => {
    const local = member.offset;
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + member.compressed);
    return (member.method === 0 ? data : inflateRawSync(data)).toString('utf8');
  };
  const nameOf = (text: string): string | null => /^Name:(.*)$/m.exec(text)?.[1]?.trim() ?? null;
  let byName: Map<string, Member> | null = null;
  return {
    path,
    scriptOf(name: string): string | null {
      const direct = members.get(scriptFileOf(name));
      if (direct !== undefined) {
        const text = read(direct);
        if (nameOf(text) === name) return text;
      }
      // The file name did not follow the rule: every script's Name line, once.
      if (byName === null) {
        byName = new Map();
        for (const member of members.values()) {
          if (!member.name.endsWith('.txt')) continue;
          const found = nameOf(read(member));
          if (found !== null && !byName.has(found)) byName.set(found, member);
        }
      }
      const member = byName.get(name);
      return member === undefined ? null : read(member);
    },
  };
}
