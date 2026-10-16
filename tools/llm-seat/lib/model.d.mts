// mtg-table — tools/llm-seat/lib/model.d.mts
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Types for model.mjs, for the TypeScript that calls it: the cube lab's LLM
// drafter (tools/cubelab/llmdraft.ts, D439) asks the same Claude Code CLI the
// LLM seat does, through the same wrapper.  Only what a .ts caller uses.

export interface ModelUsage { input: number | null; cacheCreate: number | null; cacheRead: number | null; output: number | null }

export interface ModelReply {
  text: string;
  usage: ModelUsage | null;
  sessionId: string | null;
  ms: number;
  costUsd: number | null;
  model: string | null;
}

export interface ClaudeModel {
  name: string;
  cwd: string;
  call(a: { system: string; user: string; session?: { id: string; resume: boolean } | null }): Promise<ModelReply>;
}

export function thinkingEnv(thinking: string): Record<string, string>;

export function makeClaudeModel(o?: { model?: string; thinking?: string; cwd?: string | null; timeoutS?: number; bin?: string }): ClaudeModel;
