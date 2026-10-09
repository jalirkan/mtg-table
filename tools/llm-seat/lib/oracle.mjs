// mtg-table — tools/llm-seat/lib/oracle.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Oracle text for the cards the seat can see, by NAME (the wire never carries
// rules text, §3.6 rule 1).  Two sources, both already in this repo:
//
//   - a Scryfall card-object JSONL (`fixtures/cards/oracle-cards.slice.jsonl`,
//     or Scryfall's own oracle_cards bulk file un-gzipped), --oracle <file.jsonl>;
//   - the card library's index (`var/cards/cards.sqlite`, tools/card-library,
//     D90), --oracle <file.sqlite>, read with node:sqlite, read-only.
//
// With neither, every card reads "(no oracle text available)" and the prompt
// says so; the seat still plays (names, types, P/T and keywords are on the wire).

import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_SQLITE = 'var/cards/cards.sqlite';

const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/** Reminder text (parenthesised) goes: the model knows the keywords, and it is a third of the bytes. */
export const stripReminder = (t) => String(t).replace(/\s*\([^)]*\)/g, '').replace(/[ \t]+\n/g, '\n').trim();

function faceText(o) {
  if (typeof o.oracle_text === 'string' && o.oracle_text !== '') return stripReminder(o.oracle_text);
  if (Array.isArray(o.card_faces)) {
    return o.card_faces.filter((f) => f.oracle_text).map((f) => `${f.name}: ${stripReminder(f.oracle_text)}`).join(' // ');
  }
  return '';
}

/** An oracle from a list of Scryfall card objects (pure; the tests use it). */
export function oracleFromObjects(objects) {
  const map = new Map();
  for (const o of objects) {
    if (!o || typeof o.name !== 'string') continue;
    const text = faceText(o);
    const put = (k) => { if (!map.get(k)) map.set(k, text); };   // a print with text beats one without
    put(norm(o.name));
    if (Array.isArray(o.card_faces)) for (const f of o.card_faces) if (f?.name) put(norm(f.name));
  }
  return {
    source: `jsonl (${map.size} names)`,
    text(name) { return map.has(norm(name)) ? map.get(norm(name)) : null; },
  };
}

function oracleFromSqlite(path) {
  // node:sqlite is Node 22.5+; loaded lazily so a JSONL oracle needs nothing.
  // eslint-disable-next-line no-undef
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const db = new DatabaseSync(path, { readOnly: true });
  const byName = db.prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1');
  const byNorm = db.prepare('SELECT c.oracle_text FROM card_names n JOIN cards c ON c.oracle_id = n.oracle_id WHERE n.norm_name = ? LIMIT 1');
  const cache = new Map();
  return {
    source: `sqlite ${path}`,
    text(name) {
      if (cache.has(name)) return cache.get(name);
      let row = byName.get(name);
      if (!row) {
        try { row = byNorm.get(norm(name)); } catch { row = null; }
      }
      const t = row && typeof row.oracle_text === 'string' ? stripReminder(row.oracle_text) : null;
      cache.set(name, t);
      return t;
    },
  };
}

export const NO_ORACLE = { source: 'none', text: () => null };

/** --oracle <path>, else the card library's index when present, else none. */
export function openOracle(path) {
  const p = path ?? (existsSync(DEFAULT_SQLITE) ? DEFAULT_SQLITE : null);
  if (!p || p === 'none') return NO_ORACLE;
  if (p.endsWith('.sqlite')) return oracleFromSqlite(p);
  const objects = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  return oracleFromObjects(objects);
}

/**
 * Does this oracle text have an activated ability that is not a mana ability?
 * "Cost: effect" where the effect does not start with "Add".  A HINT for which
 * permanents to offer as "activate" at priority: the engine is still the judge
 * (the click goes to Forge, which lists the abilities it allows, or refuses).
 */
export function hasNonManaActivated(text) {
  if (!text) return false;
  for (const line of text.split('\n')) {
    const clean = line.replace(/\([^)]*\)/g, '');
    const m = /^([^"]*?):\s*(.*)$/.exec(clean);
    if (!m) continue;
    const cost = m[1];
    if (!/\{|\bTap\b|\bSacrifice\b|\bDiscard\b|\bPay\b|\bExile\b|\bRemove\b/i.test(cost)) continue;
    if (/^(Equip|Level up|Ninjutsu|Cycling|Channel|Reinforce|Transfigure|Fortify|Reconfigure)/i.test(cost.trim())) {
      // keyword costs; Equip / Reconfigure are battlefield activations
      if (/^(Equip|Reconfigure|Fortify|Level up)/i.test(cost.trim())) return true;
      continue;
    }
    if (/^Add\b/i.test(m[2].trim())) continue;
    return true;
  }
  return false;
}

/** Whether the ability's cost taps the permanent ("{T}"), so a tapped one cannot use it. */
export const needsTap = (text) => /\{T\}[^:\n]*:/.test(text ?? '');
