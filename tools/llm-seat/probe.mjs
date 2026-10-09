#!/usr/bin/env node
// mtg-table — tools/llm-seat/probe.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// One tiny model call with exactly the seat's CLI arguments, so a job's pilot
// finds a broken `claude` (not logged in, an unknown flag, no network) before
// a game spends anything. Prints the arguments, then the reply and its usage,
// or the error and exits 1.
//
//   node tools/llm-seat/probe.mjs [--model sonnet] [--thinking low] [--session]
//
// --session also tries a two-call session (--session-id, then --resume), as the
// session arms use it.

import { claudeArgs, makeClaudeModel, newSessionId } from './lib/model.mjs';

const argv = process.argv.slice(2);
const val = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const model = val('--model', 'sonnet');
const thinking = val('--thinking', 'low');
const system = 'You answer a numbered choice. Reply with exactly one line: choice: <number>';
const user = 'DECISION\n1. Pass\n2. Play a land\n\nReply now.';

const m = makeClaudeModel({ model, thinking, timeoutS: 120, bin: val('--bin', 'claude') });
process.stdout.write(`claude ${claudeArgs({ model, systemArg: ['--system-prompt', '<system>'], session: null }).join(' ')}\ncwd ${m.cwd}\n`);

async function one(session) {
  const r = await m.call({ system, user, session });
  process.stdout.write(`reply ${JSON.stringify(String(r.text ?? '').slice(0, 200))}\nusage ${JSON.stringify(r.usage)} ms ${r.ms} session ${r.sessionId}\n`);
  return r;
}

try {
  await one(null);
  if (argv.includes('--session')) {
    const id = newSessionId();
    await one({ id, resume: false });
    await one({ id, resume: true });
  }
  process.stdout.write('probe ok\n');
} catch (e) {
  process.stdout.write(`probe FAILED: ${e.message ?? e}\n`);
  process.exit(1);
}
