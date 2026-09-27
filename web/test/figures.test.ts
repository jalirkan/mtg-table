/*
 * mtg-table — web/test/figures.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure ladder, over the whole corpus** (report 13 §10.1) — the important
 * one.
 *
 * Every distinct creature in every committed recording, resolved through
 * `figureFor(card, data)`: no throw, never `undefined`, and every result is
 * either a model id present in `models.json` or the declared `null` fallback.
 * It prints the census every run — model id → frame-instances → which rung
 * matched — exactly as `replay-cues.test.ts` prints the cue census, so **a
 * figure entry that never fires says so on the day it is added**.
 *
 * It runs under `node --test` with nothing but type stripping, because
 * `figures/` imports no three (§1.2). No browser, no GPU, no `figures.glb`.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  SUBTYPE_ORDER,
  figureFor,
  figureSubtypesOf,
  subtypeKey,
  subtypesOf,
} from '../src/arena/figures/resolve.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODELS = validateModels(modelsJson);
const MODEL_IDS = new Set(Object.keys(MODELS.data.models));
const FIGURES = validateFigures(figuresJson, { modelIds: MODEL_IDS });

// ---------------------------------------------------------------------------
// The data files
// ---------------------------------------------------------------------------

test('figures: the committed data files validate with zero errors', () => {
  assert.deepEqual(MODELS.errors, [], 'models.json has errors');
  assert.deepEqual(FIGURES.errors, [], 'figures.json has errors');
  assert.ok(MODEL_IDS.size > 0, 'models.json defines no models at all');
});

test('figures: every model row carries its provenance', () => {
  for (const [id, entry] of Object.entries(MODELS.data.models)) {
    for (const key of ['source', 'licence', 'licenceUrl', 'licenceBadge', 'retrieved'] as const) {
      assert.ok(
        typeof entry[key] === 'string' && entry[key] !== '',
        `${id}.${key} is missing — a model whose provenance is not written down is a model ` +
          'nobody can decide whether to ship',
      );
    }
    assert.equal(typeof entry.committable, 'boolean', `${id}.committable is missing`);
    assert.equal(entry.rootMotion, false, `${id} declares root motion, which §3.4 forbids`);
    // **Only CC0 is used at all** — the user's standing decision, mechanical here
    // rather than remembered.
    assert.match(entry.licence, /^CC0/, `${id} is not CC0 (${entry.licence})`);
  }
});

test('figures: every model named in figures.json exists in models.json', () => {
  const named = new Set<string>();
  for (const spec of Object.values(FIGURES.data.cards)) if (spec.model !== null) named.add(spec.model);
  for (const spec of Object.values(FIGURES.data.archetypes)) if (spec.model !== null) named.add(spec.model);
  if (FIGURES.data.default.model !== null) named.add(FIGURES.data.default.model);
  for (const id of named) {
    assert.ok(MODEL_IDS.has(id), `figures.json names model "${id}", which models.json does not define`);
  }
});

// ---------------------------------------------------------------------------
// subtypesOf
// ---------------------------------------------------------------------------

test('figures: subtypesOf reads the words after the dash, and nothing else', () => {
  const card = (types: string): AnyCard => ({ id: 1, types } as unknown as AnyCard);
  assert.deepEqual(subtypesOf(card('Legendary Creature - Human Spy Hero')), ['human', 'spy', 'hero']);
  assert.deepEqual(subtypesOf(card('Artifact Creature - Robot Villain')), ['robot', 'villain']);
  assert.deepEqual(subtypesOf(card('Creature - Insect')), ['insect']);
  // A face-down permanent's whole type line, and the case §1.4 turns on.
  assert.deepEqual(subtypesOf(card('Creature')), []);
  assert.deepEqual(subtypesOf(card('')), []);
  // The em dash and the en dash are accepted too: the protocol pins a plain
  // hyphen, but a fixture written by hand is not the protocol.
  assert.deepEqual(subtypesOf(card('Creature — Fungus')), ['fungus']);
  // A hidden card has no `types` at all.
  assert.deepEqual(subtypesOf({ id: 2, hidden: true } as unknown as AnyCard), []);
});

test('figures: the recognised subtype order is most-specific-first', () => {
  const card = { id: 1, types: 'Legendary Creature - Human Spy Hero' } as unknown as AnyCard;
  // Both `spy` and `hero` and `human` are recognised; `spy` is the one the
  // ladder must try first, because it is the most specific thing said.
  assert.deepEqual(figureSubtypesOf(card), ['spy', 'hero', 'human']);
  assert.ok(SUBTYPE_ORDER.indexOf('spy') < SUBTYPE_ORDER.indexOf('human'));
});

// ---------------------------------------------------------------------------
// Hard rule 8, in the figure ladder (§1.4)
// ---------------------------------------------------------------------------

test('figures: a concealed card gets the anonymous figure and never a model', () => {
  const redacted = { id: 7, zone: 'hand', controller: 0, owner: 0, hidden: true } as unknown as AnyCard;
  const match = figureFor(redacted, FIGURES.data);
  assert.equal(match.rung, 'default');
  assert.equal(match.spec.model, FIGURES.data.default.model);
  assert.equal(match.spec.model, null, 'the declared default must be the disc');
});

test('figures: a face-down creature resolves through the archetype rung to the disc', () => {
  // The shape the wire really sends for a morph on the battlefield (report 06
  // §1.4): an empty name, `types: "Creature"`, no mana cost, `faceDown: true`.
  const faceDown = {
    id: 8,
    name: '',
    types: 'Creature',
    manaCost: null,
    power: '2',
    toughness: '2',
    faceDown: true,
    controller: 0,
    owner: 0,
    zone: 'battlefield',
  } as unknown as AnyCard;
  const match = figureFor(faceDown, FIGURES.data);
  assert.equal(match.spec.model, null, 'a face-down creature must not pick a distinctive mesh');
});

// ---------------------------------------------------------------------------
// The corpus sweep
// ---------------------------------------------------------------------------

interface Seen {
  frames: number;
  types: string;
  model: string | null;
  rung: string;
}

function corpusCreatures(): Map<string, Seen> {
  const out = new Map<string, Seen>();
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames as Frame[]) {
        state = reduce(state, frame);
        if (frame.type !== 'state') continue;
        const board = state.board;
        if (board === null) continue;
        for (const player of board.players) {
          for (const card of player.zones.battlefield.cards) {
            const types = isHidden(card) ? '' : ((card as { types?: string }).types ?? '');
            if (!/(^|\s)Creature(\s|$|—|-)/.test(types)) continue;
            const label = isHidden(card)
              ? '(redacted)'
              : (((card as { name?: string }).name ?? '') || '(face-down)');
            const key = `${label}|${types}`;
            const existing = out.get(key);
            if (existing !== undefined) {
              existing.frames += 1;
              continue;
            }
            const match = figureFor(card, FIGURES.data);
            out.set(key, { frames: 1, types, model: match.spec.model, rung: match.rung });
          }
        }
      }
    }
  }
  return out;
}

test('figures: every creature in every committed recording resolves', () => {
  const seen = corpusCreatures();
  assert.ok(seen.size >= 20, `expected the corpus's creatures, saw ${String(seen.size)}`);

  const census: string[] = [];
  const byModel = new Map<string, number>();
  for (const [key, row] of [...seen].sort((a, b) => b[1].frames - a[1].frames)) {
    const model = row.model ?? '(disc)';
    byModel.set(model, (byModel.get(model) ?? 0) + row.frames);
    assert.ok(
      row.model === null || MODEL_IDS.has(row.model),
      `${key} resolved to model "${String(row.model)}", which models.json does not define`,
    );
    census.push(
      `  ${String(row.frames).padStart(5)}  ${model.padEnd(8)} ${row.rung.padEnd(22)} ${key.split('|')[0]}`,
    );
  }

  // Which rungs actually fired, and — the other half — which declared rungs
  // never did. A colour rung that is always shadowed by a subtype rung is not a
  // defect, but it is a fact the file's next reader should be told.
  const firedRungs = new Set([...seen.values()].map((row) => row.rung));
  const idleRungs = Object.keys(FIGURES.data.archetypes).filter(
    (key) => !firedRungs.has(`subtype:${key.slice('creature/subtype:'.length)}`) && !firedRungs.has(`archetype:${key}`) && !firedRungs.has(`looser:${key}`),
  );

  console.log(
    `figures: ${String(seen.size)} distinct battlefield creatures over the corpus\n` +
      `${census.join('\n')}\n` +
      `  by model: ${[...byModel].map(([m, n]) => `${m}=${String(n)}`).join(' ')}\n` +
      `  archetype rungs never reached in the corpus: ${idleRungs.length === 0 ? '(none)' : idleRungs.join(', ')}`,
  );

  // **An entry that never fires says so.** Every model the manifest defines
  // should be reached by something in the corpus; if one is not, it is either
  // dead weight or a ladder that does not do what its author thought.
  for (const id of MODEL_IDS) {
    assert.ok(
      byModel.has(id),
      `model "${id}" is defined and never resolved by any creature in the corpus — ` +
        'either the ladder does not reach it or it should not be in the library yet',
    );
  }
});

test('figures: the face-down instances in the corpus all take the disc', () => {
  const seen = corpusCreatures();
  const faceDown = [...seen].filter(([key]) => key.startsWith('(face-down)'));
  assert.ok(faceDown.length > 0, 'the corpus has no face-down battlefield creature — morph.jsonl?');
  let instances = 0;
  for (const [key, row] of faceDown) {
    instances += row.frames;
    assert.equal(row.model, null, `${key} picked a model`);
  }
  console.log(`figures: ${String(instances)} face-down battlefield card-instances, all anonymous`);
});

test('figures: a subtype key the file declares is reachable from a real type line', () => {
  // The other half of "an entry that never fires says so": every `creature/
  // subtype:x` rung in the file must name a subtype the ladder can actually
  // produce, or it is a row nothing can ever match.
  for (const key of Object.keys(FIGURES.data.archetypes)) {
    const prefix = 'creature/subtype:';
    if (!key.startsWith(prefix)) continue;
    const subtype = key.slice(prefix.length);
    assert.ok(
      (SUBTYPE_ORDER as readonly string[]).includes(subtype),
      `${key} names "${subtype}", which resolve.ts's SUBTYPE_ORDER does not recognise — ` +
        'the rung can never match',
    );
    assert.equal(subtypeKey(subtype), key);
  }
});
