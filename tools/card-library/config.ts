/*
 * mtg-table — tools/card-library/config.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Where the card library keeps things, and who it says it is to Scryfall.
 *
 * Hard rule 9: every script runs from the repo root and reads its settings from
 * `config.json` (or the environment). Nothing here hard-codes an absolute path:
 * the CLIs pass `process.cwd()`, and a caller whose working directory is NOT the
 * repo root — the Vite dev server runs from `web/` — passes the root it already
 * knows. Every path under `var/` is gitignored by the repo's own `.gitignore`
 * (`var/`), so the index and the image cache can never be committed by accident.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** The layout under the repo root. One place, so the CLIs and the dev route agree. */
export interface LibraryPaths {
  root: string;
  /** `var/cards` — everything the library writes lives under here. */
  dir: string;
  /** `var/cards/cards.sqlite` — the index. */
  db: string;
  /** `var/cards/bulk` — the downloaded `oracle_cards` `.jsonl.gz`, kept for rebuilds. */
  bulkDir: string;
  /** `var/cards/images` — `<scryfallId>/<size>[.back].<ext>`. */
  imagesDir: string;
}

export function libraryPaths(root: string = process.cwd()): LibraryPaths {
  const dir = resolve(root, 'var', 'cards');
  return {
    root,
    dir,
    db: resolve(dir, 'cards.sqlite'),
    bulkDir: resolve(dir, 'bulk'),
    imagesDir: resolve(dir, 'images'),
  };
}

/** The fallback is only for a checkout with no `config.json`; the file carries the real one. */
const FALLBACK_USER_AGENT = 'mtg-table/0.1 (local hobby client)';

/**
 * Scryfall: "All HTTP requests to api.scryfall.com must include a User-Agent
 * header and an Accept header … Do not allow HTTP libraries to choose the header
 * for you." (report 03 §1.1). `SCRYFALL_UA` in the environment wins, then
 * `config.json`'s `scryfallUserAgent`, then the fallback above.
 */
export function userAgent(root: string = process.cwd()): string {
  const fromEnv = process.env['SCRYFALL_UA'];
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim();
  try {
    const raw = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8')) as unknown;
    if (typeof raw === 'object' && raw !== null) {
      const ua = (raw as Record<string, unknown>)['scryfallUserAgent'];
      if (typeof ua === 'string' && ua.trim() !== '') return ua.trim();
    }
  } catch {
    // no config.json: fall through
  }
  return FALLBACK_USER_AGENT;
}

/**
 * A warning when the User-Agent's contact is still a template placeholder
 * (`github.com/<user>/mtg-table`, as the committed `config.json` ships) — or null.
 * Scryfall asks for an ACCURATE User-Agent; the tools say so on every run rather
 * than refuse, because only the user can supply the contact.
 */
export function userAgentWarning(ua: string): string | null {
  if (!/<[^<>]*>/.test(ua)) return null;
  return (
    `warning: the Scryfall User-Agent "${ua}" still carries a placeholder contact. ` +
    'Scryfall asks for an accurate one: set config.json\'s scryfallUserAgent (or SCRYFALL_UA) to your own URL or address.'
  );
}

/** `--key value` / `--flag` / positional. Repeated `--key` collects into an array. */
export interface Args {
  positional: string[];
  flags: Map<string, string[]>;
}

export function parseArgs(argv: readonly string[]): Args {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    let key: string;
    let value: string;
    if (eq > 2) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        value = next;
        i++;
      } else {
        value = 'true';
      }
    }
    const list = flags.get(key) ?? [];
    list.push(value);
    flags.set(key, list);
  }
  return { positional, flags };
}

export function flag(args: Args, key: string): string | undefined {
  const list = args.flags.get(key);
  return list === undefined ? undefined : list[list.length - 1];
}

export function flagAll(args: Args, key: string): string[] {
  return (args.flags.get(key) ?? []).flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => v !== '');
}

export function hasFlag(args: Args, key: string): boolean {
  const v = flag(args, key);
  return v !== undefined && v !== 'false' && v !== '0';
}

/** `1,234,567` — the evidence docs print byte counts this way. */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MiB (${fmtInt(n)} B)`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB (${fmtInt(n)} B)`;
  return `${fmtInt(n)} B`;
}
