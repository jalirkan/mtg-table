// mtg-table — the cube lab: one worker thread of the move atlas's parallel post-spine checks (D480).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// It runs one task -- a slice of games' id checks, or a slice of frame logs' guardrail pass -- with the serial run's own
// functions (atlaschecks.ts runCheckTask) and posts the answer back.

import { parentPort, workerData } from 'node:worker_threads';

import { runCheckTask, type CheckTask } from './atlaschecks.ts';

parentPort?.postMessage(runCheckTask(workerData as CheckTask));
