/*
 * mtg-table — web/test/lab-runner-lint.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The lab runner's job lint and dry run (tools/runner/lint.ts, dryrun.ts, shscan.ts; D397):
 *
 *  - the bash scanner: quoted and unquoted globs, substitutions, `${...}` and `$(( ))`,
 *    here-documents, literal assignments carried to later commands;
 *  - every lint rule fires on the job shape that failed on the PC (J093's `timeout 10h30m`,
 *    J086's `$(ls -d .../games/...)` glob, J088's light job reading var/, J066 / J084's self-count,
 *    an after: with no file, `followup: -`, a bash and a Python syntax error) and stays quiet
 *    on its control; a rule with no case here fails (LINT_RULES vs CASES);
 *  - `tools/runner.sh check` fails on a lint error and passes on a warning;
 *  - the dry run: in a namespace (where the kernel allows one) a commands block that refuses
 *    an existing folder is caught while the real var/ stays untouched; without one, the
 *    pilot runs over a var/ of symlinks and copies, and `## Commands` never runs.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { dryRun, linkVar, namespaceWorks } from '../../tools/runner/dryrun.ts';
import { parse } from '../../tools/runner/expr.ts';
import { parseJobFile } from '../../tools/runner/jobfile.ts';
import { enumerations, globRe, gnuDuration, LINT_RULES, lintJob, toOneUnit, wildSegments, writeTargets, type Finding, type RuleId } from '../../tools/runner/lint.ts';
import { commandName, resolver, scanShell } from '../../tools/runner/shscan.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = (p: string): string => fs.mkdtempSync(path.join(os.tmpdir(), `lab-lint-${p}-`));

/** A job file around blocks and extra header lines. */
function job(o: { header?: string; pilot?: string[]; commands?: string[]; pilotLines?: string; commandLines?: string; cpu?: string } = {}): string {
  const fence = (b: string): string => `\`\`\`bash\n${b}\n\`\`\`\n`;
  return `id: J900\ntitle: lint case\ncpu: ${o.cpu ?? 'heavy'}\nrepos: mtg-table@main\ndecides: x\nrule: y\n${o.header ?? ''}\n## Pilot\n${(o.pilot ?? ['true']).map(fence).join('')}${o.pilotLines ?? 'check: a == 1\n'}\n## Commands\n${(o.commands ?? ['true']).map(fence).join('')}${o.commandLines ?? ''}\n`;
}
const lint = (text: string, opts = {}): Finding[] => lintJob(parseJobFile('jobs/J900-x.md', text, parse), opts);
const rules = (fs_: Finding[], sev?: 'error' | 'warning'): string[] => fs_.filter((f) => !sev || f.severity === sev).map((f) => f.rule);

// ------------------------------------------------------------------ the scanner

test('shscan: words, quotes, globs, substitutions and here-documents', () => {
  const sc = scanShell(`P=var/x
mkdir -p "$P"
n=$(ls -d var/q/normal/*/games/* | head -3)
echo '*' "a*b" \${X%/*} $((2 * 3)) var/y/*
python3 - "$P" > "$P/out.md" <<'PY'
print("$P")
PY
cat <<EOF > var/z.txt
hello $P
EOF
`);
  const res = resolver(sc.cmds);
  const by = (name: string) => sc.cmds.find((c) => commandName(c) === name);
  assert.equal(res(by('mkdir')!.words[2]!, by('mkdir')!).text, 'var/x');
  const ls = by('ls')!;
  assert.ok(ls.inSubst);
  assert.ok(ls.words[2]!.glob);
  assert.equal(wildSegments(ls.words[2]!.pattern), 2);
  const echo = by('echo')!;
  assert.deepEqual(echo.words.map((w) => w.glob), [false, false, false, false, false, true]);
  assert.equal(sc.heredocs.length, 2);
  assert.equal(sc.heredocs[0]!.delim, 'PY');
  assert.ok(sc.heredocs[0]!.quoted);
  assert.equal(sc.heredocs[0]!.body, 'print("$P")\n');
  assert.equal(commandName(sc.heredocs[0]!.cmd), 'python3');
  assert.equal(sc.heredocs[1]!.quoted, false);
  assert.equal(res(by('python3')!.redirects[0]!.target, by('python3')!).text, 'var/x/out.md');
  // nothing here is a command after the here-document bodies
  assert.ok(!sc.cmds.some((c) => commandName(c) === 'print' || commandName(c) === 'hello'));
});

test('lint helpers: durations, globs, one unit', () => {
  for (const d of ['30', '30s', '90m', '8h', '1.5h', '2d', 'inf']) assert.ok(gnuDuration(d), d);
  for (const d of ['10h30m', '1h30', '5 m', '-1', 'h']) assert.ok(!gnuDuration(d), d);
  assert.equal(toOneUnit('10h30m'), '630m');
  assert.equal(toOneUnit('2h'), '2h');
  assert.equal(toOneUnit('1h30'), '90m');
  assert.ok(globRe('var/q/*/games/*').test('var/q/a/games/b'));
  assert.ok(!globRe('var/q/*/games/*').test('var/q/a/b/games/c'));
  assert.ok(!globRe('var/q/\\*').test('var/q/a'));
});

// ------------------------------------------------------------------ every rule, a failing shape and its control

type Case = { name: string; text: string; opts?: Record<string, unknown>; fires: RuleId; severity: 'error' | 'warning'; control: string; controlOpts?: Record<string, unknown> };

const JOBS_DIR = (() => {
  const d = tmp('jobs');
  fs.writeFileSync(path.join(d, 'J091-x.md'), 'id: J091\n');
  return d;
})();

const CASES: Case[] = [
  {
    name: 'J093: timeout 10h30m', fires: 'timeout-duration', severity: 'error',
    text: job({ commands: ['timeout -s TERM 10h30m tools/cubelab.sh queue run --night 4'] }),
    control: job({ commands: ['timeout -s TERM 630m tools/cubelab.sh queue run --night 4; sleep 2m; timeout --kill-after=30s 1h true'] }),
  },
  {
    name: 'J086: $(ls -d var/cubelab/queue/normal/*/games/*)', fires: 'argmax-glob', severity: 'error',
    text: job({ pilot: ['python3 tools/ml/dataset.py --out var/p $(ls -d var/cubelab/queue/normal/*/games/* | head -60)'] }),
    // a builtin lists it (printf), or find does; a glob over a tree the job makes is a warning at most
    control: job({ pilot: ['python3 tools/ml/dataset.py --out var/p $(printf "%s\\n" var/cubelab/queue/normal/*/games/* | head -60)', 'for g in var/cubelab/queue/normal/*/games/*; do :; done', 'find var/cubelab/queue/normal -mindepth 3 -maxdepth 3 | head'] }),
  },
  {
    name: 'J088: a light job reading var/', fires: 'light-var', severity: 'warning', text: job({ cpu: 'light', pilot: ['test -d var/cubelab/queue-quarantine-n3'] }),
    control: job({ cpu: 'light', pilot: ['node tools/check-redaction-selftest.mjs'] }),
  },
  {
    name: 'J066: a metric counting the job\'s own du.txt', fires: 'metric-self-count', severity: 'error',
    text: job({ header: 'metrics: nbs = files var/w/*.txt\n', commands: ['mkdir -p var/w\nfor nb in notebooks/*.py; do python3 "$nb" > "var/w/$(basename "$nb" .py).txt"; done\ndu -sb var/warehouse/* > var/w/du.txt'] }),
    control: job({ header: 'metrics: nbs = files var/w/nb-*.txt\n', commands: ['mkdir -p var/w\nfor nb in notebooks/*.py; do python3 "$nb" > "var/w/nb-$(basename "$nb" .py).txt"; done\ndu -sb var/warehouse/* > var/w/du.txt'] }),
  },
  {
    name: 'after: a job with no file', fires: 'after-missing', severity: 'error', opts: { jobsDir: JOBS_DIR }, controlOpts: { jobsDir: JOBS_DIR },
    text: job({ header: 'after: J091, J092\n' }), control: job({ header: 'after: J091\n' }),
  },
  {
    name: 'followup: -', fires: 'placeholder-id', severity: 'error',
    text: job({ header: 'followup: -\n' }), control: job({ header: 'followup: jobs/J901-next.md\n' }),
  },
  {
    name: 'a bash syntax error', fires: 'bash-syntax', severity: 'error',
    text: job({ pilot: ['if true; then echo x'] }), control: job({ pilot: ['if true; then echo x; fi'] }),
  },
  {
    name: 'a Python here-document that does not compile', fires: 'python-syntax', severity: 'error',
    text: job({ pilot: ["python3 - <<'PY'\nfor x in range(3)\n    print(x)\nPY"] }),
    control: job({ pilot: ["python3 - <<'PY'\nfor x in range(3):\n    print(x)\nPY"] }),
  },
];

test('lint: every rule has a case here', () => {
  assert.deepEqual([...new Set(CASES.map((c) => c.fires))].sort(), Object.keys(LINT_RULES).sort());
});

for (const c of CASES) {
  test(`lint: ${c.fires} fires on ${c.name}, and not on its control`, () => {
    const got = lint(c.text, c.opts ?? {});
    assert.ok(got.some((f) => f.rule === c.fires && f.severity === c.severity), `${c.fires} (${c.severity}) not in ${JSON.stringify(got, null, 1)}`);
    const ctl = lint(c.control, c.controlOpts ?? {});
    assert.ok(!ctl.some((f) => f.rule === c.fires && f.severity === 'error'), `${c.fires} fired on the control: ${JSON.stringify(ctl, null, 1)}`);
    if (c.severity === 'warning') assert.ok(!ctl.some((f) => f.rule === c.fires), JSON.stringify(ctl));
  });
}

test('lint: argmax-glob over a tree the job makes is a warning, and with --var it is measured', () => {
  const own = lint(job({ pilot: ['P=var/cubelab/queue-pilot-n4\nmkdir -p "$P"\nnode tools/check-redaction.mjs $(ls "$P"/*/*/games/*/g1-seat*.jsonl.gz | head -6)'] }));
  assert.deepEqual(rules(own, 'error'), []);
  assert.deepEqual(rules(own, 'warning'), ['argmax-glob']);
  // a one-level glob is no finding, until the real data says it is too big
  const v = tmp('var');
  fs.mkdirSync(path.join(v, 'big'));
  for (let i = 0; i < 300; i++) fs.writeFileSync(path.join(v, 'big', `file-with-a-long-name-${String(i).padStart(4, '0')}.jsonl.gz`), '');
  const text = job({ pilot: ['cat var/big/*.gz | wc -l'] });
  assert.deepEqual(rules(lint(text)), []);
  const measured = lint(text, { varDir: v, argMax: 8 * 1024 });
  assert.deepEqual(rules(measured, 'error'), ['argmax-glob']);
  assert.match(measured[0]!.message, /300 paths/);
});

test('lint: placeholders in after:, repos:, blocks and clean:', () => {
  const got = lint(job({ header: 'after: J0XX\nclean: var/J0XX-out\n', pilot: ['cat results/J0XX/STATUS'] }).replace('mtg-table@main', 'mtg-table@<sha>'));
  assert.ok(got.some((f) => f.where === 'repos:'), JSON.stringify(got, null, 1));
  assert.ok(got.filter((f) => f.rule === 'placeholder-id' && f.severity === 'error').length >= 4, JSON.stringify(got, null, 1));
  assert.deepEqual(rules(lint(job({ header: 'after: J091\n' }))), []);
});

test('lint: metric-self-count reads find -name, ls, globs and Python\'s glob', () => {
  const j = parseJobFile('jobs/J900-x.md', job({
    header: [
      'metrics: a = sh: find var/q3 -name \'*.jsonl.gz\' | wc -l',
      'metrics: b = sh: ls var/q3 | wc -l',
      'metrics: c = sh: python3 -c "import glob; print(len(glob.glob(\'var/q3/*.json\')))"',
    ].join('\n') + '\n',
    commands: ['node tools/requarantine.mjs restore --out var/q3/report | tee var/q3/restore.json'],
  }), parse);
  const t = writeTargets(j);
  assert.ok(t.some((x) => x.path === 'var/q3/restore.json' && x.kind === 'file'));
  assert.ok(t.some((x) => x.path === 'var/q3/report' && x.kind === 'dir'));
  const counted = (name: string) => enumerations(j.metrics.find((m) => m.name === name)!).some((e) => t.some((x) => x.kind === 'file' && e.counts(x)));
  assert.equal(counted('a'), false, 'find -name *.jsonl.gz does not take restore.json');
  assert.equal(counted('b'), true);
  assert.equal(counted('c'), true);
  assert.deepEqual(lintJob(j, { syntax: false }).filter((f) => f.rule === 'metric-self-count').map((f) => f.where), ['metrics b', 'metrics c']);
});

test('check: a lint error fails `tools/runner.sh check`, a warning does not', () => {
  const d = tmp('check');
  const bad = path.join(d, 'J900-bad.md');
  const warn = path.join(d, 'J901-warn.md');
  fs.writeFileSync(bad, job({ commands: ['timeout 10h30m true'] }));
  fs.writeFileSync(warn, job({ cpu: 'light', pilot: ['test -d var/x'] }).replace('J900', 'J901'));
  const run = (f: string) => spawnSync(process.execPath, [path.join(REPO, 'tools/runner/cli.ts'), 'check', f], { encoding: 'utf8' });
  const b = run(bad);
  assert.equal(b.status, 1, b.stdout + b.stderr);
  assert.match(b.stdout, /ERROR +\[timeout-duration\] run1 line 1/);
  const w = run(warn);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.match(w.stdout, /WARNING \[light-var\]/);
  const l = spawnSync(process.execPath, [path.join(REPO, 'tools/runner/cli.ts'), 'lint', '--list-rules'], { encoding: 'utf8' });
  for (const id of Object.keys(LINT_RULES)) assert.match(l.stdout, new RegExp(`^${id} `, 'm'));
});

test('lint: the example job files under tools/runner/jobs have no lint errors', () => {
  for (const f of fs.readdirSync(path.join(REPO, 'tools/runner/jobs'))) {
    const j = parseJobFile(f, fs.readFileSync(path.join(REPO, 'tools/runner/jobs', f), 'utf8'), parse);
    assert.deepEqual(lintJob(j).filter((x) => x.severity === 'error'), [], f);
  }
});

// ------------------------------------------------------------------ the dry run

/** A checkout with a tool that refuses a folder holding a run of other settings (D341's guard), and a real var/. */
function fixture(): { root: string; realVar: string; jobs: string; sha: string } {
  const d = tmp('dry');
  const root = path.join(d, 'repo');
  const realVar = path.join(d, 'realvar');
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(realVar, 'q'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tools', 'queue.sh'), `#!/usr/bin/env bash
out=$1; prof=$2
mkdir -p "$out"
if [ -e "$out/config" ] && [ "$(cat "$out/config")" != "$prof" ]; then echo "$out holds a run with a different profiles -- use a new --out" >&2; exit 1; fi
echo "$prof" > "$out/config"
for i in $(seq 1 "$3"); do echo "{\\"g\\":$i}" >> "$out/data.jsonl"; sleep 0.2; done
`, { mode: 0o755 });
  const g = (...a: string[]) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  g('init', '-q'); g('add', '-A'); g('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x');
  fs.writeFileSync(path.join(realVar, 'q', 'config'), 'old\n');
  fs.writeFileSync(path.join(realVar, 'q', 'data.jsonl'), '{"g":0}\n');
  const jobs = path.join(d, 'jobs');
  fs.mkdirSync(jobs);
  return { root, realVar, jobs, sha: g('rev-parse', '--short', 'HEAD').stdout.trim() };
}

function dryJob(sha: string, out: string): string {
  return `id: J900\ntitle: dry\ncpu: heavy\nrepos: mtg-table@${sha}\ndecides: x\nrule: y\nmetrics: p = sh: wc -l < var/q-pilot/data.jsonl\n\n## Pilot\n\`\`\`bash\ntools/queue.sh var/q-pilot new 2\n\`\`\`\ncheck: p == 2\n\n## Commands\n\`\`\`bash\ntools/queue.sh ${out} new 50\n\`\`\`\n`;
}

const snapshot = (dir: string): string => spawnSync('bash', ['-c', `cd '${dir}' && find . -printf '%p %s\\n' | sort && cat q/config q/data.jsonl`], { encoding: 'utf8' }).stdout;

const NS = namespaceWorks();

test('dry run (namespace): the commands block that refuses the real folder is caught; the real var/ is never written', { skip: NS.ok ? false : `no user namespace here: ${NS.why}` }, () => {
  const f = fixture();
  const before = snapshot(f.realVar);
  fs.symlinkSync(f.realVar, path.join(f.root, 'var'));
  const file = path.join(f.jobs, 'J900-dry.md');
  fs.writeFileSync(file, dryJob(f.sha, 'var/q'));
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools/runner/cli.ts'), 'dry-run', file, '--root', f.root, '--max-seconds', '3'], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /pilot1: ok/);
  assert.match(r.stdout, /PASS {2}p == 2/);
  assert.match(r.stdout, /run1: FAILED: exit 1/);
  assert.match(r.stdout, /holds a run with a different profiles/);
  assert.match(r.stdout, /WOULD FAIL: run1 exited 1/);
  assert.equal(snapshot(f.realVar), before, 'the real var/ changed');
  assert.ok(!fs.existsSync(path.join(f.realVar, 'q-pilot')));
  // the same job with a fresh folder: the block is stopped at the limit, with no error before it
  fs.writeFileSync(file, dryJob(f.sha, 'var/q-n5'));
  const ok = spawnSync(process.execPath, [path.join(REPO, 'tools/runner/cli.ts'), 'dry-run', file, '--root', f.root, '--max-seconds', '3'], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /run1: stopped at 3 s with no error before it/);
  assert.equal(snapshot(f.realVar), before, 'the real var/ changed');
  assert.equal(spawnSync('git', ['-C', f.root, 'status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).stdout, '');
});

test('dry run (no namespace): the pilot over symlinks and copies; ## Commands never runs', () => {
  const f = fixture();
  const before = snapshot(f.realVar);
  const file = path.join(f.jobs, 'J900-dry.md');
  fs.writeFileSync(file, dryJob(f.sha, 'var/q'));
  const lines: string[] = [];
  const rc = dryRun({ file, root: f.root, varDir: f.realVar, scratch: null, maxSeconds: 5, workers: 2, commands: true, sandbox: 'none', keep: false, jobsDir: null, forgecoach: null, build: false, print: (l) => lines.push(l) });
  const out = lines.join('\n');
  assert.equal(rc, 0, out);
  assert.match(out, /pilot1: ok/);
  assert.match(out, /commands: refused without a namespace/);
  assert.ok(!/run1:/.test(out), out);
  assert.equal(snapshot(f.realVar), before);
  assert.ok(fs.lstatSync(path.join(f.root, 'var', 'q')).isSymbolicLink());
  assert.ok(fs.statSync(path.join(f.root, 'var', 'q-pilot')).isDirectory());
  // a var/ the dry run did not make is never replaced
  const g = tmp('own');
  fs.mkdirSync(path.join(g, 'var'));
  assert.throws(() => linkVar(g, f.realVar, parseJobFile(file, fs.readFileSync(file, 'utf8'), parse), 64), /exists/);
});
