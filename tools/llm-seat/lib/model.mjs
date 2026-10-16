// mtg-table — tools/llm-seat/lib/model.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The two models a seat can ask.
//
// FAKE (`--model fake`, the default in every test and dry run): no spend, no
// network, deterministic.  It reads the OPTIONS block of the message it is
// given and picks the first option that is not the default (pass / no attack /
// no blocks / keep / none) -- or the first option when the default is the only
// one -- or, with a script (--fake-script FILE: a JSON array of reply strings,
// used in order, then the rule), replies with the script's next string
// verbatim, which is how the tests feed it malformed replies.
//
// CLAUDE (`--model sonnet|opus|haiku`): the logged-in Claude Code CLI in print
// mode, as tools/coach-helper.mjs runs it (D292): every tool off, MCP off, no
// permission prompts, one turn, the user text on STDIN, the system prompt by
// argv (or a file over 100 KB), effort/thinking through the two environment
// variables coach-helper's `thinkingEnv` sets (D346).  Two differences, both
// for the context arms: `--output-format json` (the result's text, usage and
// session id in one object) instead of stream-json, and SESSIONS -- a fresh
// call keeps `--no-session-persistence`; a session's first call names its id
// (`--session-id <uuid>`) and every later one resumes it (`--resume <id>`),
// in one working directory per run, because Claude Code keys its sessions by
// the directory it runs in.

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// coach-helper's mapping, copied rather than imported: importing that module
// pulls in the whole helper (match launcher, review runner, draft room).
export function thinkingEnv(thinking) {
  if (thinking === 'off') return { MAX_THINKING_TOKENS: '0', CLAUDE_CODE_EFFORT_LEVEL: 'low' };
  if (thinking === 'low') return { MAX_THINKING_TOKENS: '1024', CLAUDE_CODE_EFFORT_LEVEL: 'low' };
  return {};
}

const ARGV_SYSTEM_MAX = 100 * 1024;

/*
 * THE CHILD-GROUP REGISTRY (#148 review).  Each `claude -p` runs in a process group of its own
 * (detached), so a stop, a timeout or an abort kills the CLI and whatever it started with one
 * kill(-pid).  The same detachment takes it OUT of its caller's group: the watch runner's SIGKILL to
 * the watch's group (D440) never reached it, and nothing in a SIGKILLed process can kill it either.
 * So when MTGTABLE_CHILD_GROUPS names a directory (the watch runner sets it for each watch), every
 * spawned group is registered there for its lifetime -- a file named by its pgid holding the
 * leader's start time from /proc, so a reused pid is told apart -- and the runner signals the
 * registered groups with the watch's own (tools/watch-runner.mjs, `killRegistered`).
 */
/** The leader's start time (clock ticks since boot, /proc/<pid>/stat field 22), or null off Linux. */
export function procStart(pid) {
  try {
    const st = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return st.slice(st.lastIndexOf(')') + 2).split(' ')[19] ?? null;
  } catch { return null; }
}
function registerGroup(pid) {
  const dir = process.env.MTGTABLE_CHILD_GROUPS;
  if (!dir || !pid) return () => {};
  const file = join(dir, String(pid));
  try { mkdirSync(dir, { recursive: true }); writeFileSync(file, `${procStart(pid) ?? ''}\n`); } catch { return () => {}; }
  return () => { try { rmSync(file, { force: true }); } catch { /* the folder went away */ } };
}

/** The options block of a message: [{n, label}] (the last OPTIONS: block in it). */
export function optionsIn(text) {
  const at = text.lastIndexOf('\nOPTIONS:');
  if (at < 0) return [];
  const out = [];
  for (const line of text.slice(at + 9).split('\n')) {
    const m = /^(\d+)\. (.*)$/.exec(line);
    if (m) out.push({ n: Number(m[1]), label: m[2] });
  }
  return out;
}

const DEFAULT_LABEL = /^(Pass priority|No attack|No blocks|Never mind|None$|OK \(choose nothing\))|\(keep this hand\)/;

export function fakeChoice(text) {
  const opts = optionsIn(text);
  if (opts.length === 0) return 'choice: 1';
  const head = /DECISION \(([^)]*)\): (.*)/.exec(text);
  const multiNone = head && /or "none"/.test(head[2]);
  const pick = opts.find((o) => !DEFAULT_LABEL.test(o.label));
  if (!pick) return multiNone ? 'choice: none' : `choice: ${opts[0].n}`;
  return `choice: ${pick.n}`;
}

const planReply = (plan, steps) => `PLAN: ${plan}\nSTEPS:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nEND`;

/** The line after `label:` in the WHAT THE ENGINE LETS YOU DO NOW block, split at "; " (or ", "). */
function offerLine(text, label, sep = '; ') {
  const m = new RegExp(`^  ${label}: (.*)$`, 'm').exec(text);
  return m ? m[1].split(sep).map((x) => x.trim()).filter(Boolean) : [];
}

/**
 * The engine's battlefield activations (M63) the message lists, one per line
 * under "activate on the battlefield": [{card, label, payable}].
 */
export function engineActivations(text) {
  const lines = String(text).split('\n');
  const at = lines.findIndex((l) => l.startsWith('  activate on the battlefield'));
  if (at < 0) return [];
  const out = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^ {4}(.+?): (.+)$/.exec(l);
    if (!m) break;
    out.push({ card: m[1], label: m[2], payable: !/\(your untapped mana cannot pay for it now\)$/.test(m[2]) });
  }
  return out;
}

/** "activate <card>: <its cost or first words>" for one engine-listed ability. */
function activateStep(a, all) {
  const several = all.filter((x) => x.card === a.card).length > 1;
  if (!several) return `activate ${a.card}`;
  const cost = /^([+\-−]?\d+):/.exec(a.label);
  const shared = cost && all.filter((x) => x.card === a.card && x.label.startsWith(`${cost[1]}:`)).length > 1;
  if (cost && !shared) return `activate ${a.card}: ${cost[1]}`;
  // a cost two abilities share (Elspeth, Knight-Errant's two +1s): the cost and the label's words
  const words = a.label.replace(/^[^:]*:\s*/, '').split(/[.(]/)[0].trim();
  return `activate ${a.card}: ${cost ? `${cost[1]} ` : ''}${words}`;
}

/**
 * Plan mode's fake (D419): a land, the first spell it can pay for, the first
 * activation the engine lists that the mana can pay for (a loyalty ability
 * first, M63), an attack with every creature that can; pass on everything the
 * opponent does, but at its end step use an activation if one is listed;
 * keep; play first; the first choice of a question (the first N, as N steps,
 * when it needs N); "pass" (or the first choice) on a correction.  Read from
 * the plain-words message, as a model would.
 */
export function fakePlan(user) {
  const text = String(user);
  if (/Do you keep it\?/.test(text.split('\n')[0])) return planReply('Keep the opening hand.', ['keep']);
  if (/play first or draw/.test(text.split('\n')[0])) return planReply('Play first.', ['choose play']);
  const choices = /^(?:Choices|Legal targets): (.*)\.$/m.exec(text);
  if (/^(The engine asks you|.* needs a target: which\?)/m.test(text.split('\n')[0]) || /could not be read|cannot be done/.test(text.split('\n')[0])) {
    const ask = /The engine now asks: .*\. Choices: (.*)\. Answer it/.exec(text);
    const list = (ask ? ask[1] : choices && !/cannot be done/.test(text.split('\n')[0]) ? choices[1] : null);
    if (list) {
      const verb = /target/i.test(text.split('\n')[0]) || (ask && /target/i.test(ask[0])) ? 'target' : 'choose';
      const need = /\(choose (\d+)/.exec(list);
      const items = list.split('; ').map((x) => x.replace(/ \((choose|yours|the opponent's)[^)]*\)$/, ''));
      if (need && Number(need[1]) > 1) {
        // one step per choice: the seat combines consecutive steps to fill N
        return planReply(`Take the first ${need[1]} choices.`, items.slice(0, Number(need[1])).map((x) => `${verb} ${x}`));
      }
      return planReply('Take the first choice.', [`${verb} ${items[0]}`]);
    }
    return planReply('Do nothing more now.', ['pass']);
  }
  const acts = engineActivations(text).filter((a) => a.payable);
  if (/^It is the opponent's end step/.test(text) && acts.length) {
    return planReply('Use an ability before my turn.', [activateStep(acts[0], engineActivations(text))]);
  }
  if (!/^It is your turn/.test(text)) return planReply('Let it be.', ['pass']);
  const steps = [];
  const land = offerLine(text, 'play a land', ', ')[0];
  if (land) steps.push(`play land ${land}`);
  const cast = offerLine(text, 'cast')[0];
  if (cast) steps.push(`cast ${cast.replace(/ \{.*$/, '').replace(/ from your \w+$/, '')}`);
  const act = acts.find((a) => /^[+\-−]?\d+:/.test(a.label)) ?? acts[0];
  if (act) steps.push(activateStep(act, engineActivations(text)));
  const attackers = offerLine(text, 'can attack this turn').map((a) => a.replace(/ -?\d+\/-?\d+.*$/, '').replace(/ \(.*$/, ''));
  if (attackers.length) steps.push(`attack with ${attackers.join(', ')}`);
  if (!steps.length) steps.push('hold');
  return planReply('Develop and attack.', steps);
}

export function makeFakeModel({ script = [] } = {}) {
  const queue = [...script];
  let calls = 0;
  return {
    name: 'fake',
    async call({ system = '', user, sessionId = null }) {
      calls += 1;
      const plan = String(system).startsWith('REPLY FORMAT');
      const text = queue.length ? String(queue.shift()) : plan ? fakePlan(user) : fakeChoice(user);
      return { text, usage: null, sessionId: sessionId ?? `fake-${calls}`, ms: 0, costUsd: null, model: 'fake' };
    },
  };
}

/** The CLI's arguments for one call (pure; tested). */
export function claudeArgs({ model, systemArg, session, help = '' }) {
  const args = ['-p', '--output-format', 'json', '--model', model, ...systemArg,
    '--tools', '', '--strict-mcp-config', '--permission-mode', 'dontAsk', '--max-turns', '1'];
  // as coach-helper: when this CLI has them, no user settings / hooks / slash commands in the call
  if (/--safe-mode\b/.test(help)) args.push('--safe-mode');
  if (/--disable-slash-commands\b/.test(help)) args.push('--disable-slash-commands');
  if (!session) args.push('--no-session-persistence');
  else if (session.resume) args.push('--resume', session.id);
  else args.push('--session-id', session.id);
  return args;
}

/** The CLI's JSON output: one result object (or, with --verbose, an array ending in one). */
export function parseCliOutput(stdout) {
  let o = JSON.parse(stdout.trim());
  if (Array.isArray(o)) o = o.findLast((x) => x && x.type === 'result') ?? null;
  if (!o || typeof o !== 'object') throw new Error('no result object in the CLI output');
  if (o.is_error) throw new Error(`Claude Code: ${String(o.result ?? o.subtype ?? 'error').slice(0, 300)}`);
  const u = o.usage ?? {};
  return {
    text: typeof o.result === 'string' ? o.result : '',
    usage: {
      input: u.input_tokens ?? null,
      cacheCreate: u.cache_creation_input_tokens ?? null,
      cacheRead: u.cache_read_input_tokens ?? null,
      output: u.output_tokens ?? null,
    },
    sessionId: o.session_id ?? null,
    costUsd: o.total_cost_usd ?? null,
    model: o.modelUsage ? Object.keys(o.modelUsage)[0] ?? null : null,
  };
}

export function makeClaudeModel({ model = 'sonnet', thinking = 'low', cwd = null, timeoutS = 180, bin = 'claude' } = {}) {
  const dir = cwd ?? mkdtempSync(join(tmpdir(), 'llm-seat-'));
  mkdirSync(dir, { recursive: true });
  let help = '';
  try { help = execFileSync(bin, ['--help'], { encoding: 'utf8', timeout: 20_000 }); } catch { /* the first call will say what is wrong */ }
  return {
    name: model,
    cwd: dir,
    /**
     * session: null (fresh), {id, resume: false} (start), {id, resume: true}.  signal: an AbortSignal
     * that kills the CLI's process group and rejects with its reason (the cube lab's spend cap, D439).
     */
    async call({ system, user, session = null, signal = null }) {
      if (signal?.aborted) throw signal.reason ?? new Error('aborted');
      let systemArg = ['--system-prompt', system];
      if (Buffer.byteLength(system, 'utf8') > ARGV_SYSTEM_MAX) {
        const sp = join(mkdtempSync(join(tmpdir(), 'llm-seat-system-')), 'system.txt');
        writeFileSync(sp, system);
        systemArg = ['--system-prompt-file', sp];
      }
      const args = claudeArgs({ model, systemArg, session, help });
      const t0 = Date.now();
      const env = { ...process.env, ...thinkingEnv(thinking) };
      const out = await new Promise((resolve, reject) => {
        // its own process group (detached): one kill(-pid) reaches the CLI and anything it started
        const child = spawn(bin, args, { cwd: dir, env, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
        const unregister = registerGroup(child.pid);
        let so = '';
        let se = '';
        /** 'abort' | 'timeout' once we killed it: the caller charges a killed call (it spent tokens). */
        let killed = null;
        const kill = (why) => { killed ??= why; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } };
        const timer = setTimeout(() => kill('timeout'), timeoutS * 1000);
        const onAbort = () => kill('abort');
        signal?.addEventListener('abort', onAbort, { once: true });
        const tagged = (e) => { if (killed) e.killed = killed; return e; };
        child.stdout.setEncoding('utf8').on('data', (d) => { so += d; });
        child.stderr.setEncoding('utf8').on('data', (d) => { if (se.length < 16384) se += d; });
        child.on('error', (e) => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); unregister(); reject(tagged(e)); });
        // the leader is gone; what it left in its group (holding the pipes open) goes with it
        child.on('exit', () => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* the group is gone */ } });
        child.on('close', (code, sig) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          unregister();
          if (killed) { reject(tagged(new Error(`claude was killed (${killed === 'timeout' ? `no answer in ${timeoutS} s` : 'the run stopped'})${so.trim() ? '' : ' with no output'}`))); return; }
          if (so.trim() === '') { reject(new Error(`claude exited ${code ?? sig} with no output: ${se.trim().slice(-300)}`)); return; }
          try { resolve(parseCliOutput(so)); } catch (e) { reject(e); }
        });
        child.stdin.on('error', () => {});
        child.stdin.end(user);
      });
      return { ...out, ms: Date.now() - t0, sessionId: out.sessionId ?? session?.id ?? null };
    },
  };
}

export const newSessionId = () => randomUUID();
