// mtg-table — the lab runner: the command line behind tools/runner.sh (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// docs/guides/lab-runner.md is the manual.  Commands:
//
//   install [opts]        the runner's own checkout (<lab>/runner), the user units, enable + start
//   daemon  [opts]        the loop (what forgecoach-runner.service runs)
//   once    [opts]        one tick: fetch, reconcile, advance, start, publish
//   plan    [J###]        --dry-run: the scripts and systemd-run commands the next start would run
//   status                what runs, the queue, the machine (var/runner/status.json)
//   pause | resume        hold every job's pool (games in flight finish) and start nothing / carry on
//   stop    [J###]        stop the running job(s) cleanly (TERM) and hold; `resume` carries on
//   logs    [J###] [-n N] [-f]   the current step's log
//   approve J###          after an old-format pilot: let the runner run the commands (STATUS approved)
//   check   <job.md> [--metrics m.json]   parse a job file, list its steps, evaluate its checks
//   metrics <extractor> <args...>         print what an extractor reads (aibench, cubelab, ...)
//
// Options: --lab-root DIR (~/code/lab)  --state DIR (<runner>/var/runner)
//   --home-mtg-table DIR --home-forgecoach DIR (Justin's checkouts, ~/code/<repo>)
//   --reserve-gb N (7)  --public-status on|off (on)  --http-port N (8645; 0 = off)  --http-host H (127.0.0.1)
//   --bridge-port N (8642)  --dry-run (once/daemon: same as plan)  --no-push (write nothing to git remotes)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { readControl, writeControl } from './control.ts';
import { acquireLock, releaseLock } from './lock.ts';
import { evaluate, parse as parseExpr } from './expr.ts';
import { parseJobFile } from './jobfile.ts';
import { EXTRACTORS } from './metrics.ts';
import { DEFAULT_CONFIG, Runner, verdictText, type RunnerConfig } from './runner.ts';
import { budget, DEFAULT_BUDGET, DESKTOP_DROPIN, SERVICE, serviceUnit, SLICE, sliceUnit } from './sizing.ts';
import { isoLocal, sanitise, type StatusDoc } from './statusjson.ts';
import { dryRunSys, realSys } from './sys.ts';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const HOME = os.homedir();

function flags(argv: string[]): { pos: string[]; f: Map<string, string> } {
  const pos: string[] = [];
  const f = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=', 2) as [string, string | undefined];
      if (v !== undefined) f.set(k, v);
      else if (['dry-run', 'no-push', 'follow'].includes(k)) f.set(k, '1');
      else f.set(k, argv[++i] ?? '');
    } else if (a === '-f') f.set('follow', '1');
    else if (a === '-n') f.set('lines', argv[++i] ?? '80');
    else pos.push(a);
  }
  return { pos, f };
}

function config(f: Map<string, string>): RunnerConfig {
  const labRoot = path.resolve(f.get('lab-root') ?? path.join(HOME, 'code', 'lab'));
  const homeMtg = f.get('home-mtg-table') ?? path.join(HOME, 'code', 'mtg-table');
  const homeFc = f.get('home-forgecoach') ?? path.join(HOME, 'code', 'ForgeCoach');
  const urls: Record<string, string> = {};
  if (f.get('url-mtg-table')) urls['mtg-table'] = f.get('url-mtg-table') as string;
  if (f.get('url-forgecoach')) urls.ForgeCoach = f.get('url-forgecoach') as string;
  const commit = spawnSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || 'unknown';
  return {
    ...DEFAULT_CONFIG,
    runnerDir: REPO,
    // The installed runner's state wherever this is run from (tools/runner.sh status from Justin's checkout too).
    stateDir: path.resolve(f.get('state') ?? (fs.existsSync(path.join(labRoot, 'runner', 'var', 'runner')) ? path.join(labRoot, 'runner', 'var', 'runner') : path.join(REPO, 'var', 'runner'))),
    labRoot,
    homeRepos: Object.fromEntries([['mtg-table', homeMtg], ['ForgeCoach', homeFc]].filter(([, p]) => fs.existsSync(p as string))),
    urls,
    bridgePort: Number(f.get('bridge-port') ?? 8642),
    budget: { ...DEFAULT_BUDGET, reserveGb: Number(f.get('reserve-gb') ?? DEFAULT_BUDGET.reserveGb) },
    publicStatus: (f.get('public-status') ?? 'on') !== 'off',
    commit,
    push: !f.has('no-push'),
  };
}

function lock(cfg: RunnerConfig): void {
  const f = path.join(cfg.stateDir, 'daemon.pid');
  fs.mkdirSync(cfg.stateDir, { recursive: true });
  const held = acquireLock(f, process.pid);
  if (held !== null) throw new Error(`another runner is running (pid ${held}); stop it first (systemctl --user stop ${SERVICE})`);
  process.on('exit', () => releaseLock(f, process.pid));
}

function plan(cfg: RunnerConfig, only: string | null): number {
  const sys = dryRunSys();
  const r = new Runner({ ...cfg, push: false, stateDir: fs.mkdtempSync(path.join(os.tmpdir(), 'runner-plan-')) }, sys);
  r.readQueue(true);
  const st = r.statuses();
  const jobs = only ? r.jobs.filter((j) => j.id === only) : r.jobs;
  if (!jobs.length) { console.log(only ? `no job ${only} on origin/pc-jobs` : 'no jobs on origin/pc-jobs'); return 1; }
  const m = sys.machine();
  console.log(`machine: ${m.memTotalGb.toFixed(1)} GB, ${m.physicalCores} cores / ${m.threads} threads; lab budget ${JSON.stringify(budget(m, cfg.budget))}`);
  for (const job of jobs) {
    const s = st.get(job.id);
    if (!only && s && s.state !== 'waiting') continue;
    console.log(`\n== ${job.id} ${job.title} (${job.cpu}; STATUS ${s?.state ?? 'none'})`);
    if (job.errors.length) { console.log(`   job file errors:\n     ${job.errors.join('\n     ')}`); continue; }
    const run = { id: job.id, title: job.title, cpu: job.cpu, file: job.file, startedAt: Date.now(), steps: r.stepsFor(job, !!s && 'approved' in s.fields), stepIndex: 0, canControl: job.control, memoryStops: 0, unit: null, unitStartedAt: 0, workers: job.maxWorkers ?? Math.max(1, m.physicalCores - 1), sizing: null, cap: null, peakRssGb: null, backoff: null, playingHeld: false, events: [], progress: [], total: null, progressUnit: null, dataUpdated: null, metrics: {}, metricsAt: 0, shas: {}, restarts: [], approved: false, stopping: null, outcome: null, numbers: {}, published: false, pendingStatus: null };
    for (const step of run.steps) {
      if (step.kind !== 'shell') { console.log(`\n-- ${step.name}: the runner's own step${step.kind === 'pilot-checks' ? `: ${job.pilot?.checks.length ? job.pilot.checks.join(' | ') : 'NO check: lines -> waiting, needs a human/Claude check'}` : step.kind === 'final-checks' ? `: ${job.commands?.checks.join(' | ') || 'none'}` : ''}`); continue; }
      const u = r.unitSpec(run, job, step);
      console.log(`\n-- ${step.name} (${u.script}):\n${r.stepScript(run, job, step).split('\n').map((l) => `   | ${l}`).join('\n')}`);
      sys.startUnit(u);
    }
    if (job.aborts.length) console.log(`\n-- abort (every minute): ${job.aborts.join(' | ')}`);
  }
  return 0;
}

function readStatus(cfg: RunnerConfig): StatusDoc | null {
  try { return JSON.parse(fs.readFileSync(path.join(cfg.stateDir, 'status.json'), 'utf8')) as StatusDoc; } catch { return null; }
}

function setPaused(cfg: RunnerConfig, paused: boolean): void {
  const flag = path.join(cfg.stateDir, 'paused');
  fs.mkdirSync(cfg.stateDir, { recursive: true });
  if (paused) fs.writeFileSync(flag, `${isoLocal(Date.now())}\n`); else fs.rmSync(flag, { force: true });
  // At once, not at the daemon's next tick: every running job's control file.
  const dir = path.join(cfg.stateDir, 'control');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    const c = readControl(path.join(dir, f));
    writeControl(path.join(dir, f), { ...c, paused });
  }
}

function install(cfg: RunnerConfig, f: Map<string, string>): number {
  const dry = f.has('dry-run');
  const runnerDir = path.join(cfg.labRoot, 'runner');
  const unitDir = path.join(HOME, '.config', 'systemd', 'user');
  const sh = (argv: string[]): void => {
    console.log(`$ ${argv.join(' ')}`);
    if (dry) return;
    const r = spawnSync(argv[0] as string, argv.slice(1), { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${argv.join(' ')} exited ${r.status}`);
  };
  const write = (file: string, text: string): void => {
    console.log(`write ${file}`);
    if (dry) { console.log(text.split('\n').map((l) => `   | ${l}`).join('\n')); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  // 1. The runner's own CLONE (never a worktree of Justin's checkout, which install then never writes), at
  //    `--ref` (default origin/main), a commit that must be on origin: what runs is what anyone can review.
  const git = (dir: string, ...a: string[]): { status: number | null; stdout: string; stderr: string } =>
    spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  const url = cfg.urls['mtg-table'] ?? git(REPO, 'remote', 'get-url', 'origin').stdout.trim();
  if (!url) throw new Error('no origin URL for mtg-table (pass --url-mtg-table)');
  if (!fs.existsSync(path.join(runnerDir, '.git'))) sh(['git', 'clone', '--quiet', '--no-checkout', '--reference-if-able', REPO, '--dissociate', url, runnerDir]);
  sh(['git', '-C', runnerDir, 'fetch', '--quiet', 'origin', '+refs/heads/*:refs/remotes/origin/*']);
  const want = f.get('ref') ?? 'main';
  const head = dry ? git(REPO, 'rev-parse', `origin/${want}^{commit}`).stdout.trim() || want
    : (git(runnerDir, 'rev-parse', '-q', '--verify', `origin/${want}^{commit}`).stdout.trim() || git(runnerDir, 'rev-parse', '-q', '--verify', `${want}^{commit}`).stdout.trim());
  if (!head) throw new Error(`--ref ${want}: no such branch or commit on origin`);
  if (!dry && !git(runnerDir, 'branch', '-r', '--contains', head).stdout.trim()) throw new Error(`${head.slice(0, 7)} is on no branch of origin: push it first (a pc/ branch is fine), then install --ref <branch>`);
  sh(['git', '-C', runnerDir, 'checkout', '--quiet', '--force', '--detach', head]);
  // 2. The units.
  const m = realSys().machine();
  const b = budget(m, cfg.budget);
  const node = path.dirname(process.execPath);
  const args = [`--lab-root ${cfg.labRoot}`, `--reserve-gb ${cfg.budget.reserveGb}`, `--public-status ${cfg.publicStatus ? 'on' : 'off'}`,
    `--http-port ${f.get('http-port') ?? 8645}`, ...(cfg.homeRepos['mtg-table'] ? [`--home-mtg-table ${cfg.homeRepos['mtg-table']}`] : []),
    ...(cfg.homeRepos.ForgeCoach ? [`--home-forgecoach ${cfg.homeRepos.ForgeCoach}`] : [])];
  write(path.join(unitDir, SLICE), sliceUnit(b));
  write(path.join(unitDir, SERVICE), serviceUnit({ runnerDir, node, args }));
  write(path.join(unitDir, 'app-.scope.d', '50-forgecoach-oomd.conf'), DESKTOP_DROPIN);
  sh(['systemctl', '--user', 'daemon-reload']);
  sh(['systemctl', '--user', 'enable', SERVICE]);
  sh(['systemctl', '--user', 'restart', SERVICE]);
  console.log(`
Installed: the runner runs ${head.slice(0, 7)} from ${runnerDir}; jobs run in ${SLICE} (MemoryMax ${b.labGb} G of ${m.memTotalGb.toFixed(1)} G).
ONE TIME, so the runner keeps running when nobody is logged in (needs your password):

    sudo loginctl enable-linger $USER

Then: tools/runner.sh status    (docs/guides/lab-runner.md)`);
  return 0;
}

function approve(cfg: RunnerConfig, id: string, f: Map<string, string>): number {
  const r = new Runner(cfg, realSys());
  r.approve(id, f.get('by') ?? os.userInfo().username, f.get('note') ?? '');
  console.log(`${id} approved${cfg.push ? ' and pushed' : ' (--no-push: committed only)'}; the runner picks it up within a minute.`);
  return 0;
}

function serve(cfg: RunnerConfig, host: string, port: number): void {
  http.createServer((req, res) => {
    const h = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') { res.writeHead(204, { ...h, 'Access-Control-Allow-Methods': 'GET' }); res.end(); return; }
    if (req.method !== 'GET' || !/^\/(status\.json)?(\?.*)?$/.test(req.url ?? '')) { res.writeHead(404, h); res.end('{}'); return; }
    const doc = readStatus(cfg);
    // The public, numbers-only copy: the same one lab-status carries.
    res.writeHead(doc ? 200 : 503, h);
    res.end(doc ? JSON.stringify(sanitise(doc)) : '{"error":"no status yet"}');
  }).on('error', (e) => console.error(`http: ${e.message}`)).listen(port, host, () => console.log(`status.json on http://${host}:${port}/status.json`));
}

function printStatus(cfg: RunnerConfig): number {
  const d = readStatus(cfg);
  if (!d) { console.log(`no ${path.join(cfg.stateDir, 'status.json')} yet (is the runner running? systemctl --user status ${SERVICE})`); return 1; }
  const age = Math.round((Date.now() - Date.parse(d.updated)) / 1000);
  console.log(`updated ${d.updated} (${age} s ago)${d.paused ? '  PAUSED' : ''}`);
  console.log(`host: load ${d.host.load1}, memory ${d.host.memUsedGb}/${d.host.memTotalGb} GB, swap ${d.host.swapUsedMb} MB, pressure ${d.host.pressure}%, lab budget ${d.host.budgetGb} GB`);
  for (const r of d.running) {
    console.log(`running ${r.id} ${r.title}\n   ${r.phase}; ${r.done ?? '?'}${r.total ? `/${r.total}` : ''} ${r.unit ?? ''}; ${r.ratePerHour ?? '?'}/h; ETA ${r.eta ?? '?'}; ${r.workers ?? '?'} worker(s); errors ${r.errors ?? '?'}${r.paused ? '; PAUSED' : ''}${r.detail ? `; ${r.detail}` : ''}`);
    for (const e of r.pressureEvents.slice(-5)) console.log(`   ${e.at} ${e.kind} -> ${e.workers} worker(s), pressure ${e.pressure}%`);
  }
  for (const q of d.queue) console.log(`queued  ${q.id} ${q.title} (${q.cpu}${q.est ? `, ${q.est}` : ''})`);
  for (const w of d.waiting) console.log(`waiting ${w.id} ${w.title}: ${w.detail ?? w.reason}`);
  for (const x of d.finished.slice(0, 8)) console.log(`${x.status.padEnd(7)} ${x.id} ${x.finished} ${x.headline}${x.detail ? ` (${x.detail})` : ''}`);
  return 0;
}

function logs(cfg: RunnerConfig, id: string | undefined, f: Map<string, string>): number {
  const jobs = path.join(cfg.stateDir, 'jobs');
  const ids = id ? [id] : fs.existsSync(jobs) ? fs.readdirSync(jobs) : [];
  const pick = ids.map((j) => path.join(jobs, j)).filter((d) => fs.existsSync(d))
    .flatMap((d) => fs.readdirSync(d).filter((x) => x.endsWith('.log')).map((x) => path.join(d, x)))
    .map((p) => ({ p, t: fs.statSync(p).mtimeMs })).sort((a, b) => b.t - a.t)[0];
  if (!pick) { console.log(`no step log yet; the runner's own log: journalctl --user -u ${SERVICE} -n 100`); return 1; }
  console.log(`== ${pick.p}`);
  const r = spawnSync('tail', ['-n', f.get('lines') ?? '80', ...(f.has('follow') ? ['-f'] : []), pick.p], { stdio: 'inherit' });
  return r.status ?? 0;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, f } = flags(rest);
  const cfg = config(f);
  switch (cmd) {
    case 'daemon':
    case 'once': {
      if (f.has('dry-run')) return plan(cfg, pos[0] ?? null);
      lock(cfg);
      const r = new Runner(cfg, realSys());
      r.clearStaleGitLocks();                  // under the daemon lock: no other runner is mid-commit
      r.reconcile();
      if (cmd === 'once') { r.tick(); return printStatus(cfg); }
      const port = Number(f.get('http-port') ?? 8645);
      if (port > 0) serve(cfg, f.get('http-host') ?? '127.0.0.1', port);
      console.log(`runner ${cfg.commit}: lab ${cfg.labRoot}, state ${cfg.stateDir}, public status ${cfg.publicStatus ? 'on' : 'off'}`);
      let stopping = false;
      process.on('SIGTERM', () => { stopping = true; });
      process.on('SIGINT', () => { stopping = true; });
      while (!stopping) {
        try { r.tick(); } catch (e) { console.error(`tick: ${(e as Error).stack ?? e}`); }
        for (let i = 0; i < 10 && !stopping; i++) await new Promise((res) => setTimeout(res, 1000));
      }
      console.log('runner: stopping (the jobs keep running in their own units; a restart adopts them)');
      return 0;
    }
    case 'plan': return plan(cfg, pos[0] ?? null);
    case 'status': return printStatus(cfg);
    case 'pause': setPaused(cfg, true); console.log('paused: games in flight finish, nothing new starts. tools/runner.sh resume to carry on.'); return 0;
    case 'resume': setPaused(cfg, false); console.log('resumed.'); return 0;
    case 'stop': {
      setPaused(cfg, true);
      const dir = path.join(cfg.stateDir, 'requests');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${Date.now()}-stop.json`), JSON.stringify({ op: 'stop', id: pos[0] ?? null }));
      console.log(`stop asked${pos[0] ? ` for ${pos[0]}` : ''}: the runner TERMs the job's unit within ~10 s and marks it waiting; the runner stays paused. tools/runner.sh resume carries on.`);
      return 0;
    }
    case 'logs': return logs(cfg, pos[0], f);
    case 'install': return install(cfg, f);
    case 'approve': return approve(cfg, pos[0] ?? '', f);
    case 'check': {
      const file = pos[0];
      if (!file) throw new Error('check <job.md>');
      const job = parseJobFile(file, fs.readFileSync(file, 'utf8'), parseExpr);
      console.log(`${job.id} ${job.title}: ${job.cpu}, repos ${job.repos.map((x) => `${x.repo}@${x.ref}`).join(', ') || 'none'}, resumable ${job.resumable ? 'yes' : 'no'}, max_workers ${job.maxWorkers ?? '-'}`);
      console.log(`pilot: ${job.pilot?.blocks.length ?? 0} block(s), ${job.pilot?.checks.length ?? 0} check(s); commands: ${job.commands?.blocks.length ?? 0} block(s), ${job.commands?.checks.length ?? 0} check(s); ${job.aborts.length} abort line(s); progress ${job.progress?.line ?? '-'}`);
      console.log(job.machineChecked ? 'machine-checked: the runner may go past the pilot on its own' : 'NOT machine-checked: the runner stops after the pilot (waiting, needs a human/Claude check)');
      if (job.errors.length) { console.log(`ERRORS:\n  ${job.errors.join('\n  ')}`); return 1; }
      if (f.get('metrics')) {
        const m = JSON.parse(fs.readFileSync(f.get('metrics') as string, 'utf8')) as Record<string, unknown>;
        console.log(`pilot checks:\n${verdictText((job.pilot?.checks ?? []).map((c) => evaluate(c, m)))}final checks:\n${verdictText((job.commands?.checks ?? []).map((c) => evaluate(c, m)))}aborts:\n${verdictText(job.aborts.map((c) => evaluate(c, m)))}`);
      }
      return 0;
    }
    case 'metrics': {
      const ex = EXTRACTORS[pos[0] ?? ''];
      if (!ex) throw new Error(`metrics <${Object.keys(EXTRACTORS).join('|')}> <args>`);
      console.log(JSON.stringify(ex(process.cwd(), pos.slice(1)), null, 1));
      return 0;
    }
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(3, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
      return 2;
  }
}

main().then((code) => process.exit(code), (e) => { console.error(`runner: ${(e as Error).message}`); process.exit(1); });

