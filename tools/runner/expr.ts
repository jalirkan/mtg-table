// mtg-table — the lab runner: the check language of `check:` and `abort:` lines (D334).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A small, closed expression language over a job's metrics.  It is parsed by
// hand here and evaluated by walking the tree: nothing is ever handed to eval,
// Function, a shell or a regex built from the text.  The grammar:
//
//   expr    := or
//   or      := and ('or' and)*
//   and     := not ('and' not)*
//   not     := 'not' not | compare
//   compare := sum (OP sum | 'between' sum 'and' sum)?        OP: == != < <= > >=
//   sum     := product (('+' | '-') product)*
//   product := unary (('*' | '/') unary)*
//   unary   := '-' unary | atom
//   atom    := NUMBER ['%'] | 'true' | 'false' | NAME | '(' expr ')'
//   NAME    := [A-Za-z_][A-Za-z0-9_]* ('.' [A-Za-z0-9_]+)*      a metric, e.g. games, control.a_win_rate
//
// `40%` is 0.40.  `between a and b` is inclusive.  A NAME the metrics do not
// hold, a value that is not a number or a boolean, a division by zero or a
// comparison of a boolean with a number makes the whole line UNKNOWN, and an
// unknown check fails (an unknown abort does not fire, and is reported): a
// check never passes on data that is not there.

export type Node =
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'name'; v: string }
  | { k: 'neg'; a: Node }
  | { k: 'not'; a: Node }
  | { k: 'bin'; op: '+' | '-' | '*' | '/'; a: Node; b: Node }
  | { k: 'cmp'; op: '==' | '!=' | '<' | '<=' | '>' | '>='; a: Node; b: Node }
  | { k: 'between'; a: Node; lo: Node; hi: Node }
  | { k: 'and' | 'or'; a: Node; b: Node };

type Tok = { t: 'num'; v: number } | { t: 'name'; v: string } | { t: 'op'; v: string } | { t: 'end' };

const KEYWORDS = new Set(['and', 'or', 'not', 'between', 'true', 'false']);

export class ExprError extends Error {}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (c === ' ' || c === '\t') { i++; continue; }
    const num = /^(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      let v = Number(num[0]);
      i += num[0].length;
      if (src[i] === '%') { v /= 100; i++; }
      out.push({ t: 'num', v });
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*/.exec(src.slice(i));
    if (name) {
      out.push({ t: 'name', v: name[0] });
      i += name[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '<=', '>='].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('<>+-*/()'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new ExprError(`unexpected '${c}' at column ${i + 1}`);
  }
  out.push({ t: 'end' });
  return out;
}

/** Parse a check expression; throws ExprError with the column of the first problem. */
export function parse(src: string): Node {
  const toks = lex(src);
  let p = 0;
  const peek = (): Tok => toks[p] as Tok;
  const isWord = (w: string): boolean => { const t = peek(); return t.t === 'name' && t.v === w; };
  const isOp = (o: string): boolean => { const t = peek(); return t.t === 'op' && t.v === o; };
  const want = (o: string): void => { if (!isOp(o) && !isWord(o)) throw new ExprError(`expected '${o}'`); p++; };

  const expr = (): Node => or();
  const or = (): Node => { let a = and(); while (isWord('or')) { p++; a = { k: 'or', a, b: and() }; } return a; };
  const and = (): Node => { let a = not(); while (isWord('and')) { p++; a = { k: 'and', a, b: not() }; } return a; };
  const not = (): Node => { if (isWord('not')) { p++; return { k: 'not', a: not() }; } return compare(); };
  const compare = (): Node => {
    const a = sum();
    const t = peek();
    if (t.t === 'op' && ['==', '!=', '<', '<=', '>', '>='].includes(t.v)) {
      p++;
      return { k: 'cmp', op: t.v as '==', a, b: sum() };
    }
    if (isWord('between')) {
      p++;
      const lo = sum();
      want('and');
      return { k: 'between', a, lo, hi: sum() };
    }
    return a;
  };
  const sum = (): Node => {
    let a = product();
    while (isOp('+') || isOp('-')) { const op = (peek() as { v: string }).v as '+'; p++; a = { k: 'bin', op, a, b: product() }; }
    return a;
  };
  const product = (): Node => {
    let a = unary();
    while (isOp('*') || isOp('/')) { const op = (peek() as { v: string }).v as '*'; p++; a = { k: 'bin', op, a, b: unary() }; }
    return a;
  };
  const unary = (): Node => { if (isOp('-')) { p++; return { k: 'neg', a: unary() }; } return atom(); };
  const atom = (): Node => {
    const t = peek();
    if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.t === 'name') {
      if (t.v === 'true' || t.v === 'false') { p++; return { k: 'bool', v: t.v === 'true' }; }
      if (KEYWORDS.has(t.v)) throw new ExprError(`'${t.v}' where a value belongs`);
      p++;
      return { k: 'name', v: t.v };
    }
    if (isOp('(')) { p++; const e = expr(); want(')'); return e; }
    throw new ExprError(t.t === 'end' ? 'the expression ends too early' : `unexpected '${(t as { v: string }).v}'`);
  };

  const e = expr();
  if (peek().t !== 'end') throw new ExprError(`unexpected '${(peek() as { v: string }).v}' after a complete expression`);
  return e;
}

export type Metrics = Record<string, unknown>;

/** A metric by dotted name: a flat key ("control.games") first, then a nested walk. */
export function lookup(m: Metrics, name: string): unknown {
  if (Object.prototype.hasOwnProperty.call(m, name)) return m[name];
  let cur: unknown = m;
  for (const part of name.split('.')) {
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

class Unknown extends Error {}

function value(n: Node, m: Metrics, used: Map<string, unknown>): number | boolean {
  switch (n.k) {
    case 'num': return n.v;
    case 'bool': return n.v;
    case 'name': {
      const v = lookup(m, n.v);
      used.set(n.v, v);
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'boolean') return v;
      throw new Unknown(v === undefined || v === null ? `${n.v} is missing` : `${n.v} is not a number`);
    }
    case 'neg': return -num(n.a, m, used);
    case 'not': return !bool(n.a, m, used);
    case 'bin': {
      const a = num(n.a, m, used), b = num(n.b, m, used);
      if (n.op === '+') return a + b;
      if (n.op === '-') return a - b;
      if (n.op === '*') return a * b;
      if (b === 0) throw new Unknown('division by zero');
      return a / b;
    }
    case 'cmp': {
      const a = value(n.a, m, used), b = value(n.b, m, used);
      if (typeof a !== typeof b) throw new Unknown('a comparison of a boolean with a number');
      if (n.op === '==') return typeof a === 'number' ? Math.abs(a - (b as number)) < 1e-9 : a === b;
      if (n.op === '!=') return typeof a === 'number' ? Math.abs(a - (b as number)) >= 1e-9 : a !== b;
      if (typeof a !== 'number') throw new Unknown('an ordering of booleans');
      const bn = b as number;
      return n.op === '<' ? a < bn : n.op === '<=' ? a <= bn : n.op === '>' ? a > bn : a >= bn;
    }
    case 'between': {
      const a = num(n.a, m, used);
      return a >= num(n.lo, m, used) && a <= num(n.hi, m, used);
    }
    case 'and': return bool(n.a, m, used) && bool(n.b, m, used);
    case 'or': return bool(n.a, m, used) || bool(n.b, m, used);
  }
}

function num(n: Node, m: Metrics, used: Map<string, unknown>): number {
  const v = value(n, m, used);
  if (typeof v !== 'number') throw new Unknown('a boolean where a number belongs');
  return v;
}

function bool(n: Node, m: Metrics, used: Map<string, unknown>): boolean {
  const v = value(n, m, used);
  if (typeof v !== 'boolean') throw new Unknown('a number where a condition belongs');
  return v;
}

export interface Verdict {
  /** The line as written. */
  expr: string;
  /** true / false, or null when unknown (a missing metric, a parse error, ...). */
  result: boolean | null;
  /** The metrics the line read, with their values: "games = 40, errors = 0". */
  values: string;
  /** Why the result is null. */
  error?: string;
}

const show = (v: unknown): string => (typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : v === undefined ? 'missing' : JSON.stringify(v));

/** Evaluate one line against the metrics.  Never throws. */
export function evaluate(src: string, m: Metrics): Verdict {
  const used = new Map<string, unknown>();
  let tree: Node;
  try {
    tree = parse(src);
  } catch (e) {
    return { expr: src, result: null, values: '', error: `does not parse: ${(e as Error).message}` };
  }
  try {
    const r = value(tree, m, used);
    const values = [...used].map(([k, v]) => `${k} = ${show(v)}`).join(', ');
    if (typeof r !== 'boolean') return { expr: src, result: null, values, error: 'a number, not a condition' };
    return { expr: src, result: r, values };
  } catch (e) {
    const values = [...used].map(([k, v]) => `${k} = ${show(v)}`).join(', ');
    if (e instanceof Unknown) return { expr: src, result: null, values, error: e.message };
    throw e;
  }
}

/** The metric names a line reads (for validating a job file before it runs). */
export function names(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node): void => {
    if (n.k === 'name') out.add(n.v);
    for (const key of ['a', 'b', 'lo', 'hi'] as const) {
      const c = (n as Record<string, unknown>)[key];
      if (c && typeof c === 'object') walk(c as Node);
    }
  };
  walk(parse(src));
  return [...out];
}
