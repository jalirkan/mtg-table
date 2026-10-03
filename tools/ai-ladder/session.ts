// mtg-table — the AI ladder: what every command shares — the registry, the
// results so far, the current fit, seed allocation and the engine.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later

import { appendFileSync, mkdirSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

import { drive, Engine, engineEnv, readPairs, type BatchResult, type BatchSpec } from './bench.ts';
import { bootstrap, fit, type Fit } from './rating.ts';
import { ANCHOR, loadRegistry, players, type Player, type Registry } from './registry.ts';
import { hashIndex, identity, outcomes, readResults, type GameRecord, type Outcome } from './results.ts';
import { batchPairs, hostBase, mkey, nextBseed } from './schedule.ts';

export interface SessionOptions {
  repo: string;
  dir: string;
  registryFile: string;
  pairsFile: string;
  pairsPerBatch: number;
  gameTimeoutSec: number;
  host?: string;
  priorSd: number;
}

export class Session {
  readonly opt: SessionOptions;
  readonly host: string;
  readonly run: string;
  reg: Registry;
  all: Player[] = [];
  byName = new Map<string, Player>();
  byHash = new Map<string, Player>();
  recs: GameRecord[];
  nPairs: number;
  private engine: Engine | null = null;
  private readonly runningSeeds = new Set<string>();
  private seedIndex: Map<string, Set<number>> | null = null;

  constructor(opt: SessionOptions) {
    this.opt = opt;
    this.host = (opt.host ?? hostname()).replace(/[^A-Za-z0-9._-]/g, '_') || 'host';
    const t = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
    this.run = `${t}-${process.pid}`;
    this.reg = loadRegistry(opt.registryFile);
    this.reloadPlayers();
    this.recs = readResults(opt.dir);
    this.nPairs = readPairs(opt.pairsFile).length;
    if (this.nPairs === 0) throw new Error(`no deck pairs in ${opt.pairsFile}`);
  }

  reloadPlayers(): void {
    this.all = players(this.reg, this.opt.repo);
    this.byName = new Map(this.all.map((p) => [p.name, p]));
    this.byHash = hashIndex(this.all);
  }

  get available(): Player[] {
    return this.all.filter((p) => !p.unavailable);
  }

  get anchors(): Player[] {
    return this.available.filter((p) => p.anchor);
  }

  player(name: string): Player {
    const p = this.byName.get(name);
    if (!p) throw new Error(`no player ${name} in ${this.opt.registryFile}`);
    return p;
  }

  playable(name: string): Player {
    const p = this.player(name);
    if (p.unavailable) throw new Error(`${name} is unavailable: ${p.unavailable}`);
    return p;
  }

  outcomes(filter?: (r: GameRecord) => boolean): Outcome[] {
    return outcomes(filter ? this.recs.filter(filter) : this.recs, this.byHash);
  }

  fit(bootstrapSamples = 0): Fit {
    const names = this.all.map((p) => p.name);
    const games = this.outcomes();
    const o = { anchor: ANCHOR, priorSd: this.opt.priorSd };
    const f = fit(names, games, o);
    return bootstrapSamples > 0 ? bootstrap(f, names, games, o, bootstrapSamples) : f;
  }

  /** The rated identity of a record's side. */
  side(r: GameRecord, s: 'a' | 'b'): string {
    return s === 'a' ? identity(r.a, r.ah, this.byHash) : identity(r.b, r.bh, this.byHash);
  }

  addRecs(recs: GameRecord[]): void {
    this.recs.push(...recs);
    if (this.seedIndex) for (const r of recs) this.indexSeed(r);
  }

  private indexSeed(r: GameRecord): void {
    const k = mkey(this.side(r, 'a'), this.side(r, 'b'));
    const idx = this.seedIndex as Map<string, Set<number>>;
    const s = idx.get(k);
    if (s) s.add(r.bseed); else idx.set(k, new Set([r.bseed]));
  }

  /** Every --seed a matchup (either order) has used, from the log and from the batches running now. */
  usedBseeds(a: string, b: string): Set<number> {
    const k = mkey(a, b);
    if (!this.seedIndex) {
      this.seedIndex = new Map();
      for (const r of this.recs) this.indexSeed(r);
    }
    const s = new Set<number>(this.seedIndex.get(k) ?? []);
    for (const x of this.runningSeeds) {
      const [key, seed] = x.split('#');
      if (key === k) s.add(Number(seed));
    }
    return s;
  }

  /** A batch spec for a vs b; the --seed is the matchup's next unused one from `base` (default: this host's ladder base). */
  spec(a: Player, b: Player, purpose: string, base = hostBase(this.host)): BatchSpec {
    const bseed = nextBseed(base, this.usedBseeds(a.name, b.name));
    this.runningSeeds.add(`${mkey(a.name, b.name)}#${bseed}`);
    return { a, b, bseed, pairs: batchPairs(bseed, this.nPairs, this.opt.pairsPerBatch), purpose };
  }

  getEngine(): Engine {
    if (!this.engine) {
      this.engine = new Engine(engineEnv(this.opt.repo, this.opt.dir, this.host, this.run, this.opt.pairsFile, this.opt.gameTimeoutSec));
      const stop = (): void => {
        console.error('\nai-ladder: stopping -- killing this run\'s JVMs; finished games are kept');
        this.engine?.stop();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    }
    return this.engine;
  }

  /** Run batches until `next` runs dry or the deadline nears. */
  async drive(deadline: number, next: () => BatchSpec | null, done: (r: BatchResult) => void, quiet = false): Promise<void> {
    await drive(this.getEngine(), {
      deadline,
      next,
      done: (r) => {
        this.runningSeeds.delete(`${mkey(r.spec.a.name, r.spec.b.name)}#${r.spec.bseed}`);
        this.addRecs(r.recs);
        done(r);
      },
      log: quiet ? undefined : (s) => console.log(s),
    });
  }

  logLine(file: string, obj: unknown): void {
    mkdirSync(this.opt.dir, { recursive: true });
    appendFileSync(join(this.opt.dir, file), JSON.stringify(obj) + '\n');
  }
}
