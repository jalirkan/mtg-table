// mtg-table — the lab runner: a small bash scanner for the job lint (D397).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Not a bash parser: enough of bash's word rules to read a job block the way the
// lint needs it (lint.ts) -- simple commands and their words, which characters of
// a word were quoted (an unquoted `*` is a glob, a quoted one is not), the
// redirections, command substitutions `$( )` / backticks / `<( )` scanned as
// commands of their own, `${...}` and `$(( ))` kept whole (a `*` there is not a
// glob), comments, line continuations, and here-documents (their bodies are
// returned apart: a Python body is compiled, never scanned as shell).  `bash -n`
// is what checks the syntax; anything this scanner cannot follow it reads as
// plain words, so a lint rule built on it can miss a case but never crashes.

export interface Word {
  /** The word with quotes removed; `$NAME` / `${...}` / `$(...)` kept as written. */
  text: string;
  /** `text` with every QUOTED or escaped `*`, `?`, `[` written `\*`: what a glob would see. */
  pattern: string;
  /** An unquoted `*`, `?` or `[` (a glob bash expands). */
  glob: boolean;
  /** Some of it was quoted or escaped. */
  quoted: boolean;
  /** A parameter expansion or a substitution: its value is not known here. */
  dynamic: boolean;
}

export interface Redirect { op: string; target: Word }

export interface Cmd {
  words: Word[];
  redirects: Redirect[];
  /** 1-based line of the command's first character. */
  line: number;
  /** Inside a command substitution, a process substitution or backticks. */
  inSubst: boolean;
}

export interface Heredoc {
  delim: string;
  /** The delimiter was quoted (`<<'PY'`): the body is literal; unquoted: bash expands `$` in it. */
  quoted: boolean;
  body: string;
  /** The command the here-document feeds. */
  cmd: Cmd;
  /** 1-based line of the body's first line. */
  line: number;
  /** No line ended it. */
  unterminated: boolean;
}

export interface Scan { cmds: Cmd[]; heredocs: Heredoc[] }

const OP_CHARS = new Set(['|', '&', ';', '<', '>', '(', ')', '\n']);
const GLOB_CHARS = new Set(['*', '?', '[']);

/** Scan a bash script. */
export function scanShell(src: string): Scan {
  const s = src.replace(/\r\n/g, '\n');
  const out: Scan = { cmds: [], heredocs: [] };
  let i = 0;
  const lineAt = (k: number): number => { let n = 1; for (let j = 0; j < k && j < s.length; j++) if (s[j] === '\n') n++; return n; };

  type Pending = { delim: string; quoted: boolean; strip: boolean; cmd: Cmd };

  /** Read here-document bodies starting at i (just after a newline). */
  const readBodies = (pending: Pending[]): void => {
    for (const p of pending) {
      const start = i;
      const lines: string[] = [];
      let done = false;
      while (i < s.length) {
        const nl = s.indexOf('\n', i);
        const raw = nl < 0 ? s.slice(i) : s.slice(i, nl);
        i = nl < 0 ? s.length : nl + 1;
        const cmp = p.strip ? raw.replace(/^\t+/, '') : raw;
        if (cmp === p.delim) { done = true; break; }
        lines.push(p.strip ? raw.replace(/^\t+/, '') : raw);
      }
      out.heredocs.push({ delim: p.delim, quoted: p.quoted, body: lines.join('\n') + (lines.length ? '\n' : ''), cmd: p.cmd, line: lineAt(start), unterminated: !done });
    }
    pending.length = 0;
  };

  /** Balanced skip from i (just after an opener) to the matching closer; returns the text inside. */
  const skipBalanced = (open: string, close: string): string => {
    let depth = 1;
    const st = i;
    while (i < s.length && depth > 0) {
      const c = s[i] as string;
      if (c === '\\') { i += 2; continue; }
      if (c === "'") { const e = s.indexOf("'", i + 1); i = e < 0 ? s.length : e + 1; continue; }
      if (c === '"') { i++; while (i < s.length && s[i] !== '"') i += s[i] === '\\' ? 2 : 1; i++; continue; }
      if (c === open) depth++;
      else if (c === close) depth--;
      i++;
    }
    return s.slice(st, Math.max(st, i - 1));
  };

  /** `$...` at i (s[i] === '$'): appends to the word; returns true when it consumed something. */
  const dollar = (w: WordBuild, inSubst: boolean): void => {
    const n = s[i + 1];
    if (n === '(' && s[i + 2] === '(') {           // $(( arithmetic ))
      i += 3; const inner = skipBalanced('(', ')'); if (s[i] === ')') i++;
      w.add(`$((${inner}))`, true, false); w.dynamic = true; return;
    }
    if (n === '(') {                                // $( command substitution )
      i += 2; const st = i; list(')', true); const inner = s.slice(st, Math.max(st, i - 1));
      w.add(`$(${inner})`, true, false); w.dynamic = true; return;
    }
    if (n === '{') {
      i += 2; const inner = skipBalanced('{', '}');
      w.add(`\${${inner}}`, true, false); w.dynamic = true; return;
    }
    const m = /^\$([A-Za-z_][A-Za-z0-9_]*|[0-9@*#?$!-])/.exec(s.slice(i));
    if (m) { i += m[0].length; w.add(m[0], true, false); w.dynamic = true; return; }
    w.add('$', false, false); i++;
    void inSubst;
  };

  class WordBuild {
    text = ''; pattern = ''; glob = false; quoted = false; dynamic = false; any = false;
    add(t: string, quoted: boolean, globbable: boolean): void {
      this.any = true;
      this.text += t;
      for (const c of t) {
        if (GLOB_CHARS.has(c)) { if (globbable && !quoted) { this.glob = true; this.pattern += c; } else this.pattern += `\\${c}`; } else this.pattern += c;
      }
      if (quoted && !t.startsWith('$')) this.quoted = true;
    }
    done(): Word { return { text: this.text, pattern: this.pattern, glob: this.glob, quoted: this.quoted, dynamic: this.dynamic }; }
  }

  /** Read one word at i; null when none starts here. */
  const word = (inSubst: boolean): Word | null => {
    const w = new WordBuild();
    while (i < s.length) {
      const c = s[i] as string;
      if (c === '\\') {
        if (s[i + 1] === '\n') { i += 2; continue; }
        w.add(s[i + 1] ?? '', true, false); i += 2; continue;
      }
      if (c === ' ' || c === '\t') break;
      if (c === '(' && w.text.endsWith('=') && /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=$/.test(w.text)) {   // NAME=( array )
        i++; const inner = skipBalanced('(', ')'); w.add(`(${inner})`, true, false); w.dynamic = true; continue;
      }
      if (OP_CHARS.has(c)) break;
      if (c === "'") { const e = s.indexOf("'", i + 1); const end = e < 0 ? s.length : e; w.add(s.slice(i + 1, end), true, false); w.quoted = true; i = end + 1; continue; }
      if (c === '"') {
        i++; w.quoted = true; w.any = true;
        while (i < s.length && s[i] !== '"') {
          const d = s[i] as string;
          if (d === '\\' && i + 1 < s.length && '"$`\\\n'.includes(s[i + 1] as string)) { if (s[i + 1] !== '\n') w.add(s[i + 1] as string, true, false); i += 2; continue; }
          if (d === '$') { dollar(w, inSubst); continue; }
          if (d === '`') { i++; const st = i; list('`', true); w.add(`\`${s.slice(st, Math.max(st, i - 1))}\``, true, false); w.dynamic = true; continue; }
          w.add(d, true, false); i++;
        }
        i++; continue;
      }
      if (c === '$') { dollar(w, inSubst); continue; }
      if (c === '`') { i++; const st = i; list('`', true); w.add(`\`${s.slice(st, Math.max(st, i - 1))}\``, true, false); w.dynamic = true; continue; }
      w.add(c, false, true); i++;
    }
    return w.any ? w.done() : null;
  };

  /** A list of commands until `end` (')' or '`') or EOF. */
  function list(end: ')' | '`' | null, inSubst: boolean): void {
    let cmd: Cmd | null = null;
    const pending: Pending[] = [];
    const finish = (): void => { if (cmd && (cmd.words.length || cmd.redirects.length)) out.cmds.push(cmd); cmd = null; };
    const cur = (): Cmd => (cmd ??= { words: [], redirects: [], line: lineAt(i), inSubst });
    while (i < s.length) {
      const c = s[i] as string;
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '\\' && s[i + 1] === '\n') { i += 2; continue; }
      if (c === '\n') { i++; finish(); if (pending.length) readBodies(pending); continue; }
      if (c === '#' ) { const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
      if (end === ')' && c === ')') { i++; finish(); return; }
      if (end === '`' && c === '`') { i++; finish(); return; }
      if ((c === '<' || c === '>') && s[i + 1] === '(') {          // process substitution: a word of its own
        i += 2; const st = i; list(')', true);
        cur().words.push({ text: `${c}(${s.slice(st, Math.max(st, i - 1))})`, pattern: '', glob: false, quoted: false, dynamic: true });
        continue;
      }
      const redir = /^([0-9]*)(&>>|&>|<<<|<<-|<<|<>|<&|>>|>&|>\||<|>)/.exec(s.slice(i));
      if (redir && (c === '<' || c === '>' || (c === '&' && (redir[2] as string).startsWith('&')) || (/[0-9]/.test(c) && redir[1] !== ''))) {
        const op = redir[2] as string;
        i += redir[0].length;
        while (s[i] === ' ' || s[i] === '\t') i++;
        if (op === '<<' || op === '<<-') {
          const d = word(inSubst);
          const c2 = cur();
          if (d) { pending.push({ delim: d.text, quoted: d.quoted, strip: op === '<<-', cmd: c2 }); c2.redirects.push({ op, target: d }); }
          continue;
        }
        const t = word(inSubst);
        if (t) cur().redirects.push({ op, target: t });
        continue;
      }
      if (c === '|' || c === '&' || c === ';' || c === '(' || c === ')') {
        i += (s[i + 1] === c || (c === '|' && s[i + 1] === '&') || (c === ';' && s[i + 1] === '&')) ? 2 : 1;
        finish(); continue;
      }
      if (c === '`') { i++; list('`', true); continue; }
      if (c === '{' || c === '}') {
        // a group's brace is a word of its own; `{a,b}` and `${` are words
        if ((s[i + 1] === ' ' || s[i + 1] === '\n' || s[i + 1] === ';' || i + 1 >= s.length) && (!cmd || c === '}')) { i++; if (c === '}') finish(); continue; }
      }
      const w = word(inSubst);
      if (w) cur().words.push(w); else i++;
    }
    finish();
    if (pending.length) readBodies(pending);
  }

  list(null, false);
  out.cmds.sort((a, b) => a.line - b.line);
  return out;
}

const RESERVED = new Set(['!', '{', '}', 'do', 'then', 'else', 'elif', 'if', 'while', 'until', 'time', 'done', 'fi', 'esac', 'function', 'coproc']);
/** Wrappers that exec the command after their own options. */
const WRAPPERS = new Set(['exec', 'command', 'nohup', 'nice', 'ionice', 'stdbuf', 'env', 'chrt', 'taskset', 'setsid']);
/** Builtins and keywords: nothing is exec'd with their arguments, so a long glob there is no ARG_MAX risk. */
export const BUILTINS = new Set(['for', 'select', 'case', 'in', '[[', ']]', 'echo', 'printf', 'test', '[', 'local', 'export', 'declare', 'typeset',
  'readonly', 'set', 'unset', 'shift', ':', 'true', 'false', 'cd', 'pushd', 'popd', 'mapfile', 'readarray', 'read', 'compgen', 'complete', 'source', '.',
  'eval', 'return', 'exit', 'trap', 'wait', 'kill', 'let', 'shopt', 'hash', 'type', 'ulimit', 'umask', 'alias', 'break', 'continue', 'builtin', 'getopts']);

const ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/;

/** The index of the command's name in `words` (after assignments, reserved words and exec wrappers), or -1. */
export function nameIndex(words: Word[]): number {
  let k = 0;
  while (k < words.length) {
    const t = (words[k] as Word).text;
    if (ASSIGN.test(t) || RESERVED.has(t)) { k++; continue; }
    if (WRAPPERS.has(t)) {
      k++;
      // the wrapper's own options (and env's NAME=value)
      while (k < words.length && (/^-/.test((words[k] as Word).text) || ASSIGN.test((words[k] as Word).text))) {
        const o = (words[k] as Word).text;
        k++;
        if (/^-(n|c|p|o|e|i)$/.test(o) && k < words.length && !/^-/.test((words[k] as Word).text)) k++;   // nice -n 10, ionice -c 3, stdbuf -o L
      }
      continue;
    }
    return k;
  }
  return -1;
}

/** The command's name (basename), or ''. */
export function commandName(c: Cmd): string {
  const k = nameIndex(c.words);
  return k < 0 ? '' : ((c.words[k] as Word).text.split('/').pop() ?? '');
}

/** Literal assignments `NAME=value` (a value with no expansion, or only of names known before it), applied to the commands after them. */
export function resolver(cmds: Cmd[]): (w: Word, at: Cmd) => Word {
  const sets: Array<{ k: number; name: string; value: string }> = [];
  const index = new Map<Cmd, number>(cmds.map((c, k) => [c, k]));
  const known = new Map<string, string>();
  const sub = (t: string, map: Map<string, string>): string => t.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (all, a, b) => {
    const v = map.get((a ?? b) as string);
    return v !== undefined && !/[$`]/.test(v) ? v : all;
  });
  for (const [ci, c] of cmds.entries()) {
    if (c.inSubst) continue;
    if (nameIndex(c.words) >= 0) continue;                     // NAME=v cmd: the value is the command's alone
    for (const w of c.words) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(w.text);
      if (!m) break;
      const value = sub(m[2] as string, known);
      known.set(m[1] as string, value);
      sets.push({ k: ci, name: m[1] as string, value });
    }
  }
  return (w, cmd) => {
    if (!w.dynamic) return w;
    const ci = index.get(cmd) ?? Infinity;
    const env = new Map<string, string>();
    for (const x of sets) if (x.k < ci) env.set(x.name, x.value);
    const text = sub(w.text, env);
    return { ...w, text, pattern: sub(w.pattern, env), dynamic: /[$`]/.test(text) };
  };
}
