// mtg-table — the zstd archive tier (D370) under the redaction checker.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// tools/lab/archive.py recompresses a finished queue night's recordings from
// `.jsonl.gz` to `.jsonl.zst`, and tools/check-redaction.mjs reads both (Node's
// own zlib zstd, 22.15+ / 23.8+).  The fixture is the committed lab recording
// (fixtures/cubelab/recorded/), recompressed here: the checker must give the
// `.zst` exactly the verdict and the statistics it gives the `.gz` (path and
// byte count aside), and must FAIL a `.zst` with a planted leak.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as zlib from 'node:zlib';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const LOGS = [0, 1].map((s) => join(REPO, `fixtures/cubelab/recorded/games/7/g1-seat${s}.jsonl.gz`));

const check = (files: string[]): { status: number | null; out: string } => {
  const r = spawnSync(process.execPath, [join(REPO, 'tools/check-redaction.mjs'), ...files], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};
const norm = (out: string, path: string): string => out.split(path).join('<log>').replace(/bytes=\d+/g, 'bytes=N');
const zstd = (raw: Buffer): Buffer =>
  zlib.zstdCompressSync(raw, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 19, [zlib.constants.ZSTD_c_checksumFlag]: 1 } });

test('this Node reads zstd (CI and the PC run 24)', () => {
  assert.equal(typeof zlib.zstdDecompressSync, 'function', `Node ${process.version} has no zlib zstd`);
});

test('a .zst recording gets exactly the verdict its .gz gets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zstd-archive-'));
  try {
    for (const gz of LOGS) {
      const raw = zlib.gunzipSync(readFileSync(gz));
      const z = join(dir, 'g1.jsonl.zst');
      const packed = zstd(raw);
      writeFileSync(z, packed);
      assert.ok(packed.length * 2.5 < readFileSync(gz).length, `zstd ${packed.length} B vs gzip ${readFileSync(gz).length} B`);
      const a = check([gz]);
      const b = check([z]);
      assert.equal(a.status, 0, a.out);
      assert.equal(b.status, 0, b.out);
      assert.match(b.out, /^PASS {2}/m);
      assert.equal(norm(b.out, z), norm(a.out, gz));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('negative control: an opponent hand card named in a .zst recording FAILS the checker', () => {
  const frames = zlib.gunzipSync(readFileSync(LOGS[0] as string)).toString('utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, any>);
  let planted = false;
  for (const f of frames) {
    if (f.type !== 'state' || planted) continue;
    const [me, opp] = f.body.players as [any, any];
    const stub = opp.zones.hand.cards.find((c: any) => c.hidden);
    const named = me.zones.hand.cards.find((c: any) => !c.hidden && c.name);
    if (!stub || !named) continue;
    Object.assign(stub, { ...named, id: stub.id, owner: opp.id, controller: opp.id, zone: 'hand' });
    delete stub.hidden;
    planted = true;
  }
  assert.ok(planted);
  const dir = mkdtempSync(join(tmpdir(), 'zstd-archive-'));
  try {
    const bad = join(dir, 'leak.jsonl.zst');
    writeFileSync(bad, zstd(Buffer.from(`${frames.map((f) => JSON.stringify(f)).join('\n')}\n`)));
    const r = check([bad]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^FAIL {2}/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
