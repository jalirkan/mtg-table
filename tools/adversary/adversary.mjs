#!/usr/bin/env node
// mtg-table — tools/adversary/adversary.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE ADVERSARIAL SEAT (decision D428, Part 3 of the rules-integrity plan): a
// scripted seat on `/ws` that tries to cheat the bridge and the engine on every
// question, and fails the run if any illegal answer or act gets through.
//
//   ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8783 --seed 7 \
//       --deck decks/amount-probe.dck
//   node tools/adversary/adversary.mjs --port 8783 [--games 1] \
//       [--report var/adversary.json] [--log var/adversary.jsonl] \
//       [--require-kinds assign_amount,confirm] [--timeout 600]
//
// It is tools/ws-auto-play.mjs's whole-game policy (lands, spells, attacks,
// payments, the next game of a match) with `--probe --adversary`: every `ask`
// is answered first with the worst illegal answers tools/adversary/answers.mjs
// can build for it -- each must come back as the same question with a `reason`
// (M67/M68) -- and then with the policy's legal answer, which must not; and
// once a turn per input class an act the engine must refuse (a card not
// offered, a card from the wrong zone, an illegal blocker, an ability or a
// player that does not exist) goes first, and must draw a refusal notice.
// tools/adversary/core.mjs is the state machine.
//
// Exit: 0 no leak; 3 a leak (an illegal answer or act taken) or a legal answer
// refused; 11 a --require-kinds kind never had an illegal answer refused; the
// rest are ws-auto-play's own (1 timeout, 4 conceded without an `over`, ...).
// The report (--report) has every kind's counts, every leak with its askId,
// and the labels of the illegal answers refused.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pass = [];
let report = 'var/adversary.json';
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--report') report = process.argv[++i];
  else if (a === '--help' || a === '-h') {
    process.stdout.write('usage: node tools/adversary/adversary.mjs --port <p> [--games n] [--report f] [--log f] '
      + '[--require-kinds k1,k2] [--timeout s] [--quiet]\n');
    process.exit(0);
  } else pass.push(a);
}
const r = spawnSync(process.execPath, [join(here, '..', 'ws-auto-play.mjs'), '--probe', '--adversary', report, ...pass],
  { stdio: 'inherit' });
process.exit(r.status ?? 1);
