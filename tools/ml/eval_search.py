#!/usr/bin/env python3
# mtg-table — tools/ml: the evaluator's hyperparameter search by successive halving, and its learning curve.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""train_eval.py's `--search sha` and `--curve` (D364).  Not a command of its own.

THE SEARCH (`--search sha`).  `--grid` trains one configuration after another
to early stopping until the time budget runs out: on night 1 (6.3 M rows) it
finished 7 of 1,440 in 3 hours, and the budget cut the last ones after an
epoch.  Successive halving spends the same hours on many more configurations
and still gives every survivor a full training:

  1. N configurations: the base one (the command line's) first, then the
     grid's own space (GRID) in train_eval.grid_configs(seed)'s fixed random
     order, skipping the base.  Deterministic for a seed.
  2. Rung 0 trains every configuration for `min_epochs` epochs (default 2).
     Each rung keeps the best 1/eta (default 3) by validation log-loss -- the
     best epoch so far, the measure early stopping uses -- and trains the
     survivors to eta times as many epochs, resuming each where it stopped
     (its weights, Adam's moments and its generator: nothing is retrained).
  3. When at most `finalists` (default eta) remain, they train to early
     stopping (`--patience`, `--epochs`), exactly as a plain fit does.  The
     winner is the finalist with the best validation log-loss; it is exported.

Every configuration in a rung has had the same number of epochs when it is
compared, and a configuration trained to the end is trained exactly as
`train_eval.py` without a search would train it (EpochTrainer).

`--jobs J` trains J configurations at once in forked worker processes that
share the loaded rows (copy-on-write: the rows are read, never written, so
they are in memory once).  The configurations' results do not depend on J:
each configuration's training is its own generator's, and the rungs are
ranked only when all of a rung is back.  Set the BLAS threads per worker with
OMP_NUM_THREADS / OPENBLAS_NUM_THREADS (the matrices are small: two threads
per worker gain little over one; J workers use the cores better).

`--configs N` fixes N.  Without it, N is planned from `--time-budget`: a short
probe times the base configuration's batches, and N is the largest the
budget's 80% holds at that speed (the plan and the probe are printed; pass
the printed N as `--configs` to repeat a run exactly).  The budget is also a
deadline: a worker stops a configuration after the epoch that passes it, and
the search then picks among the configurations of the rung it reached, says
so (`cutByBudget`) and is not exactly reproducible.

THE LEARNING CURVE (`--curve 0.25,0.5,1.0`).  One configuration (the
command line's) trained on nested shares of the training pairs
(train_eval.in_fraction: a hash of the pair), validation and test identical,
each to early stopping; for each share the test log-loss with a 95% interval
from 2,000 resamples of the test deck pairs, and the paired difference to the
largest share with the same resamples.  The question it answers: does more
data still help this model?  A share's model is the model
`train_eval.py --train-fraction f` trains (the tests hold that).
"""
from __future__ import annotations

import json
import math
import os
import sys
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

# The search's space: train_eval.GRID (unchanged, so --grid repeats) with lower learning rates
# beside its two -- J060's grid at batch 4096 had 4 of 7 configurations peak at epoch 1, at lr
# 0.003 (D364).
def _sha_grid():
    import train_eval as T
    return dict(T.GRID, lr=[3e-4, 5e-4, 1e-3, 2e-3, 3e-3])


SHA_GRID = _sha_grid()

# What the forked workers read: set by the parent before the pool is made.
_CTX: dict[str, Any] = {}


# ---------------------------------------------------------------- workers

def _rows_for(fraction: float):
    """The training rows for a share of the pairs: the whole split, or a view of it."""
    import evalnet as N
    import train_eval as T
    tr = _CTX["tr"]
    if fraction >= 1.0:
        return tr
    keep = np.array([T.in_fraction(T.pair_key(g), fraction) for g in _CTX["games"]], bool)
    return N.RowView(tr, np.nonzero(keep[tr.game])[0])


def _advance(task):
    """Train one configuration up to epoch `until` (None: to early stopping); returns (id, trainer)."""
    import train_eval as T
    cid, hp, trainer, until, fraction = task[:5]
    o = dict(_CTX["opts"], **(task[5] if len(task) > 5 else {}))
    tr = _rows_for(fraction)
    if trainer is None:
        net, excluded = T.make_net(tr, _CTX["names"], hp, _CTX["vocab_size"], _CTX["seed"], o["aux"])
        trainer = T.EpochTrainer(net, tr, hp, _CTX["seed"], o["fast"], o["weight_by"], o["subsample"])
        trainer.excluded = excluded
    trainer.tr = tr
    trainer.train(_CTX["va"], until=until, deadline=_CTX.get("deadline"))
    trainer.tr = None
    return cid, trainer


def private_gb() -> float:
    """This process's private memory (not shared with its parent) in GiB, from /proc (nan elsewhere)."""
    try:
        with open("/proc/self/smaps_rollup", encoding="ascii") as f:
            kb = sum(int(ln.split()[1]) for ln in f if ln.startswith(("Private_Clean:", "Private_Dirty:")))
        return kb / 2 ** 20
    except (OSError, ValueError):
        return float("nan")


def _dry(task):
    """--dry-load's worker: one batch of training (with the epoch's row draw and the game weights) and a
    validation slice; returns the PEAK of its private memory, sampled every 20 ms while it works (the
    transient arrays -- --subsample's draw, the weights -- are freed before it returns)."""
    import threading
    import train_eval as T
    i, hp = task
    tr, va = _CTX["tr"], _CTX["va"]
    o = _CTX["opts"]
    peak = [private_gb()]
    stop = threading.Event()

    def sample():
        while not stop.wait(0.02):
            x = private_gb()
            if x > peak[0]:
                peak[0] = x
    th = threading.Thread(target=sample, daemon=True)
    th.start()
    try:
        net, _ex = T.make_net(tr, _CTX["names"], hp, _CTX["vocab_size"], _CTX["seed"], o["aux"])
        tt = T.EpochTrainer(net, tr, hp, _CTX["seed"] + i, o["fast"], o["weight_by"], o["subsample"])
        tt.run_epoch(limit=1)
        if len(va):
            tt.arith.predict(va.take(np.arange(min(len(va), 50_000))))
    finally:
        stop.set()
        th.join()
    return max(peak[0], private_gb())


def dry_workers(tr, va, names, hp, vocab_size, seed, opts, jobs) -> list[float]:
    tr.moments()
    pool = Workers(jobs, tr=tr, va=va, names=names, vocab_size=vocab_size, seed=seed, opts=opts, deadline=None)
    try:
        return pool.map(_dry, [(i, hp) for i in range(jobs)])
    finally:
        pool.close()


class Workers:
    """`jobs` forked processes over the loaded rows (or this process when jobs is 1); `map` keeps task order."""

    def __init__(self, jobs: int, **ctx):
        _CTX.clear()
        _CTX.update(ctx)
        self.pool = None
        if jobs > 1:
            import multiprocessing as mp
            try:
                self.pool = mp.get_context("fork").Pool(jobs)
            except ValueError:   # no fork on this platform: one process
                self.pool = None

    def map(self, fn, tasks):
        if self.pool is None:
            return [fn(t) for t in tasks]
        return self.pool.map(fn, tasks, chunksize=1)

    def close(self):
        if self.pool is not None:
            self.pool.close()
            self.pool.join()


# ---------------------------------------------------------------- successive halving

def sha_space(seed: int) -> list[dict[str, Any]]:
    """SHA_GRID's configurations in a fixed random order for the seed (train_eval.grid_configs' rule)."""
    import itertools
    import random
    keys = list(SHA_GRID)
    combos = [dict(zip(keys, v)) for v in itertools.product(*(SHA_GRID[k] for k in keys))]
    random.Random(seed).shuffle(combos)
    return combos


def sha_configs(base_hp: dict[str, Any], n: int, seed: int) -> list[dict[str, Any]]:
    """The base configuration, then SHA_GRID's space in its fixed random order (no repeat of the base)."""
    import train_eval as T
    out = [dict(base_hp)]
    for c in sha_space(seed):
        if len(out) >= n:
            break
        hp = dict(base_hp, **c)
        if any(all(hp[k] == o[k] for k in T.GRID) for o in out):
            continue
        out.append(hp)
    return out


def rungs(n: int, eta: int, min_epochs: int, finalists: int) -> list[tuple[int, int | None]]:
    """[(configurations, epoch target)] per rung; the last rung's target is None (to early stopping)."""
    out = []
    alive, r = n, min_epochs
    while alive > max(1, finalists):
        out.append((alive, r))
        alive, r = math.ceil(alive / eta), r * eta
    out.append((alive, None))
    return out


def plan_seconds(n: int, eta: int, min_epochs: int, finalists: int, jobs: int, epoch_s: float,
                 final_epochs: int) -> float:
    """Wall seconds the search should take: each rung's configurations in waves of `jobs`."""
    tot, done = 0.0, 0
    for alive, r in rungs(n, eta, min_epochs, finalists):
        target = final_epochs if r is None else r
        tot += math.ceil(alive / jobs) * max(0, target - done) * epoch_s
        done = target if r is not None else done
    return tot


def plan_configs(budget: float, eta: int, min_epochs: int, finalists: int, jobs: int, epoch_s: float,
                 final_epochs: int, most: int) -> int:
    """The largest N (at least eta x finalists, at most `most`) whose plan fits 80% of the budget."""
    lo = min(most, max(2, eta * max(1, finalists)))
    best = lo
    for n in range(lo, most + 1):
        if plan_seconds(n, eta, min_epochs, finalists, jobs, epoch_s, final_epochs) <= 0.8 * budget:
            best = n
    return best


def probe_epoch_seconds(tr, va, names, hp, vocab_size, seed, opts, batches: int = 20) -> float:
    """Seconds one epoch of `hp` should take on this machine: `batches` training batches and a slice of the
    validation pass, timed, scaled to the whole."""
    import train_eval as T
    net, _ex = T.make_net(tr, names, hp, vocab_size, seed, opts["aux"])
    tt = T.EpochTrainer(net, tr, hp, seed, opts["fast"], opts["weight_by"])
    per_epoch = math.ceil(len(tr) * opts["subsample"] / int(hp["batch"]))
    k = min(batches, per_epoch)
    t0 = time.perf_counter()
    tt.run_epoch(limit=k)
    train_s = (time.perf_counter() - t0) * per_epoch / max(k, 1)
    m = min(len(va), 50_000)
    t1 = time.perf_counter()
    if m:
        tt.arith.predict(va.take(np.arange(m)))
    val_s = (time.perf_counter() - t1) * len(va) / max(m, 1)
    return train_s + val_s


def successive_halving(tr, va, names, base_hp, vocab_size, a, log, games=None):
    """The search; returns (net, info, hp, records, summary) like train_eval.grid_search plus a summary."""
    eta, r0 = int(a.eta), int(a.min_epochs)
    finalists = int(a.finalists or eta)
    jobs = max(1, int(a.jobs))
    import train_eval as T
    space = len(sha_space(a.seed)) + 1
    t_start = time.time()
    deadline = t_start + a.time_budget if a.time_budget else None
    probe = None
    if a.configs:
        n = int(a.configs)
    elif a.time_budget:
        probe = probe_epoch_seconds(tr, va, names, base_hp, vocab_size, a.seed, T.opts_of(a))
        n = plan_configs(a.time_budget, eta, r0, finalists, jobs, probe, int(a.final_epochs), space)
    else:
        raise SystemExit("train_eval: --search sha needs --configs N or --time-budget S")
    configs = sha_configs(base_hp, n, a.seed)
    n = len(configs)
    plan = rungs(n, eta, r0, finalists)
    log(f"search sha: {n} configurations, eta {eta}, rungs "
        + ", ".join(f"{c} to {'early stop' if r is None else f'epoch {r}'}" for c, r in plan)
        + f"; {jobs} worker(s); BLAS threads OMP={os.environ.get('OMP_NUM_THREADS', '-')} "
        f"OPENBLAS={os.environ.get('OPENBLAS_NUM_THREADS', '-')}"
        + (f"; probe {probe:.0f} s/epoch, plan {plan_seconds(n, eta, r0, finalists, jobs, probe, int(a.final_epochs)) / 3600:.2f} h "
           f"of a {a.time_budget / 3600:.2f} h budget (repeat with --configs {n})" if probe else ""))
    tr.moments()   # once, before the workers fork: they share it
    pool = Workers(jobs, tr=tr, va=va, names=names, vocab_size=vocab_size, seed=a.seed, opts=T.opts_of(a),
                   deadline=deadline, games=games)
    trainers: dict[int, Any] = {i: None for i in range(n)}
    alive = list(range(n))
    records: list[dict[str, Any]] = []
    logf = open(a.grid_log, "a", encoding="utf-8") if a.grid_log else None
    cut = False
    reached = 0
    try:
        for k, (_count, target) in enumerate(plan):
            todo = [i for i in alive if not (trainers[i] is not None and trainers[i].done)]
            t0 = time.time()
            for cid, tt in pool.map(_advance, [(i, configs[i], trainers[i], target, 1.0) for i in todo]):
                trainers[cid] = tt
            reached = k
            for i in alive:
                tt = trainers[i]
                rec = {"i": i, "rung": k, "epochs": tt.epoch, "hyper": configs[i], "valLogloss": tt.best[0],
                       "bestEpoch": tt.best[2], "seconds": round(tt.seconds, 1), "done": tt.done}
                records.append(rec)
                if logf:
                    logf.write(json.dumps(rec) + "\n")
                    logf.flush()
            ranked = sorted(alive, key=lambda i: (trainers[i].best[0], i))
            log(f"rung {k}: {len(alive)} configuration(s) to {'early stop' if target is None else f'epoch {target}'} "
                f"in {time.time() - t0:.0f} s; best val {trainers[ranked[0]].best[0]:.4f} "
                f"({json.dumps({kk: configs[ranked[0]][kk] for kk in T.GRID})})")
            if deadline and time.time() > deadline:
                cut = k < len(plan) - 1 or any(not trainers[i].done for i in alive)
                if cut:
                    log(f"search: the time budget ran out in rung {k}; choosing among its configurations "
                        "(cut by the budget: not exactly reproducible)")
                    alive = ranked
                    break
            if target is None:
                alive = ranked
                break
            alive = ranked[:plan[k + 1][0]]
    finally:
        if logf:
            logf.close()
        pool.close()
    win = alive[0]
    tt = trainers[win]
    ep, vl, hist = tt.finish()
    info = {"bestEpoch": ep, "valLogloss": vl, "epochsRun": len(hist), "seconds": round(tt.seconds, 1),
            "excluded": tt.excluded, "history": hist}
    summary = {"method": "sha", "configs": n, "eta": eta, "minEpochs": r0, "finalists": finalists, "jobs": jobs,
               "rungs": [{"configs": c, "epochs": r} for c, r in plan], "rungReached": reached,
               "probeEpochSeconds": round(probe, 1) if probe else None, "cutByBudget": cut,
               "seconds": round(time.time() - t_start, 1), "fast": bool(a.fast), "seed": a.seed,
               "space": "SHA_GRID",
               "winner": win, "epochsTrained": int(sum(t.epoch for t in trainers.values() if t is not None))}
    log(f"search: best val logloss {vl:.4f} (configuration {win}, best epoch {ep} of {len(hist)}) with "
        f"{json.dumps({k: configs[win][k] for k in T.GRID})}; {summary['epochsTrained']} epochs in all, "
        f"{summary['seconds']:.0f} s")
    return tt.net, info, configs[win], records, summary


# ---------------------------------------------------------------- the learning curve

def pair_bootstrap(sums, counts, boots: int, seed: int, ci: float = 0.95) -> dict[str, Any]:
    """Ratio estimates sum/count per column of `sums` (groups x models) with percentile intervals from
    resampling whole groups -- the same resamples for every column, so differences are paired."""
    rng = np.random.default_rng(seed)
    G = len(counts)
    est = sums.sum(axis=0) / counts.sum()
    reps = np.empty((boots, sums.shape[1]))
    for b in range(boots):
        idx = rng.integers(0, G, G)
        reps[b] = sums[idx].sum(axis=0) / counts[idx].sum()
    a = (1 - ci) / 2
    return {"estimate": est, "lo": np.quantile(reps, a, axis=0), "hi": np.quantile(reps, 1 - a, axis=0)}


def learning_curve(a, hp, log) -> dict[str, Any]:
    import train_eval as T
    mem = T.Memory()
    fractions = sorted({float(x) for x in a.curve.split(",") if x.strip()})
    if not fractions or fractions[0] <= 0 or fractions[-1] > 1:
        raise SystemExit("train_eval: --curve takes shares in (0, 1], e.g. 0.25,0.5,1.0")
    opts = T.opts_of(a)
    weightings = [w.strip() for w in (getattr(a, "curve_weights", "") or "").split(",") if w.strip()] \
        or [opts["weight_by"] or "none"]
    if any(w not in ("none", "game") for w in weightings):
        raise SystemExit("train_eval: --curve-weights takes none and/or game")
    schema, names, splits = T.load_data(a.data, a.split_by, turns_to_end=opts["aux"] > 0,
                                        compact=bool(getattr(a, "compact", False)))
    mem.note("load", log)
    tr, va, te = splits["train"], splits["val"], splits["test"]
    games = T.read_games(a.data)
    if not len(te):
        raise SystemExit("train_eval: --curve needs test rows")
    vocab_size = len(schema["vocab"]["cards"])
    jobs = max(1, int(a.jobs))
    tr.moments()
    t0 = time.time()
    runs = [(w, f) for w in weightings for f in fractions]
    pool = Workers(min(jobs, len(runs)), tr=tr, va=va, names=names, vocab_size=vocab_size, seed=a.seed,
                   opts=opts, deadline=None, games=games)
    try:
        done = pool.map(_advance, [(i, hp, None, None, f, {"weight_by": None if w == "none" else w})
                                   for i, (w, f) in enumerate(runs)])
    finally:
        pool.close()
    mem.note("fit", log)
    pairs = [T.pair_key(games[g]) for g in te.game.tolist()]
    keys, gidx = np.unique(np.array(pairs, dtype=object).astype(str), return_inverse=True)
    gidx = gidx.ravel()
    t = te.t
    gw = T.game_weights(te.game)
    R = len(runs)
    rowll = np.zeros((len(te), R + 1))
    for cid, tt in done:
        tt.finish()
        p = np.clip(tt.net.predict(te), T.EPS, 1 - T.EPS)
        rowll[:, cid] = -(t * np.log(p) + (1 - t) * np.log(1 - p))
    base = T.fit_baselines(tr, va, names)
    pc = np.clip(base["core"](te), T.EPS, 1 - T.EPS)
    rowll[:, -1] = -(t * np.log(pc) + (1 - t) * np.log(1 - pc))
    boots = 2000

    def by_pair(w):
        sums = np.stack([np.bincount(gidx, weights=w * rowll[:, j], minlength=len(keys)) for j in range(R + 1)], 1)
        return sums, np.bincount(gidx, weights=w, minlength=len(keys))
    views = {"rows": by_pair(np.ones(len(te))), "games": by_pair(gw)}
    stats = {}
    for v, (sums, cnt) in views.items():
        largest = {w: runs.index((w, fractions[-1])) for w in weightings}
        stats[v] = {"ll": pair_bootstrap(sums, cnt, boots, 20261004),
                    "diff": pair_bootstrap(sums[:, :R] - sums[:, [largest[w] for w, _f in runs]], cnt, boots, 20261004),
                    "core": pair_bootstrap(sums[:, [-1] * R] - sums[:, :R], cnt, boots, 20261004)}
        if len(weightings) == 2:
            a_idx = [runs.index(("game", f)) for f in fractions]
            b_idx = [runs.index(("none", f)) for f in fractions]
            stats[v]["gameMinusNone"] = pair_bootstrap(sums[:, a_idx] - sums[:, b_idx], cnt, boots, 20261004)
    mem.note("score", log)
    trained = {cid: tt for cid, tt in done}

    def ci(x, i):
        return {"estimate": float(x["estimate"][i]), "lo": float(x["lo"][i]), "hi": float(x["hi"][i])}
    points = []
    tr_games = np.unique(tr.game)
    for i, (w, f) in enumerate(runs):
        tt = trained[i]
        keep = np.array([T.in_fraction(T.pair_key(g), f) for g in games], bool)
        pt = {"fraction": f, "weightBy": w, "trainRows": int(keep[tr.game].sum()),
              "trainGames": int(keep[tr_games].sum()),
              "trainPairs": len({T.pair_key(games[g]) for g in tr_games.tolist() if keep[g]}),
              "bestEpoch": tt.best[2], "epochsRun": tt.epoch, "valLogloss": tt.best[0],
              "seconds": round(tt.seconds, 1)}
        for v, key in (("rows", ""), ("games", "ByGame")):
            pt["testLogloss" + key] = ci(stats[v]["ll"], i)
            pt["minusLargest" + key] = ci(stats[v]["diff"], i)
            pt["coreMinusEval" + key] = ci(stats[v]["core"], i)
            if "gameMinusNone" in stats[v]:
                pt["gameMinusNone" + key] = ci(stats[v]["gameMinusNone"], fractions.index(f))
        points.append(pt)
    # the effective sample size of the test numbers, from the largest share's residuals
    _c, big = next((c, x) for c, x in done if c == runs.index((weightings[0], fractions[-1])))
    resid = t - big.net.predict(te)
    rep = {"curve": True, "data": os.path.abspath(a.data), "splitBy": a.split_by, "hyper": hp, "fast": opts["fast"],
           "weightings": weightings, "seed": a.seed, "testRows": len(te), "testGames": int(len(np.unique(te.game))),
           "testPairs": len(keys), "effectiveN": {"byGame": T.icc(resid, te.game), "byPair": T.icc(resid, gidx)},
           "boots": boots, "points": points,
           "core": ci(stats["rows"]["ll"], R), "coreByGame": ci(stats["games"]["ll"], R),
           "seconds": round(time.time() - t0, 1), "memory": mem.stages}
    log(format_curve(rep))
    return rep


def format_curve(r: dict[str, Any]) -> str:
    e = r.get("effectiveN") or {}
    g = e.get("byGame") or {}
    out = [f"learning curve ({r['splitBy']} split; test {r['testRows']} rows, {r.get('testGames', '?')} games, "
           f"{r['testPairs']} deck pairs; within-game residual correlation {g.get('rho', float('nan')):.3f}, design "
           f"effect {g.get('designEffect', float('nan')):.1f}, effective n {g.get('nEff', float('nan')):.0f}; "
           f"95% intervals over test pairs, {r['boots']} resamples):",
           f"  {'share':>5s} {'weight':>6s} {'pairs':>6s} {'rows':>9s} {'epoch':>5s} {'test logloss':>26s} "
           f"{'minus largest share':>28s} {'core minus eval':>28s} {'by game':>8s}"]
    for p in r["points"]:
        t, d, c = p["testLogloss"], p["minusLargest"], p["coreMinusEval"]
        out.append(f"  {p['fraction']:5.2f} {p.get('weightBy', 'none'):>6s} {p['trainPairs']:6d} {p['trainRows']:9d} "
                   f"{p['bestEpoch']:5d} {t['estimate']:.4f} [{t['lo']:.4f}, {t['hi']:.4f}] "
                   f"{d['estimate']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}] "
                   f"{c['estimate']:+.4f} [{c['lo']:+.4f}, {c['hi']:+.4f}] {p['testLoglossByGame']['estimate']:8.4f}")
    c = r["core"]
    out.append(f"  core (all training rows): {c['estimate']:.4f} [{c['lo']:.4f}, {c['hi']:.4f}]")
    for p in r["points"]:
        if p.get("weightBy") == "game" and "gameMinusNone" in p:
            a, b = p["gameMinusNone"], p["gameMinusNoneByGame"]
            out.append(f"  share {p['fraction']:.2f}: game-weighted minus unweighted training, test log-loss "
                       f"{a['estimate']:+.4f} [{a['lo']:+.4f}, {a['hi']:+.4f}] by row, {b['estimate']:+.4f} "
                       f"[{b['lo']:+.4f}, {b['hi']:+.4f}] by game (below 0: weighting helps)")
    for w in r.get("weightings", ["none"]):
        pts = [p for p in r["points"] if p.get("weightBy", "none") == w]
        if len(pts) >= 2:
            d = pts[-2]["minusLargest"]
            more = d["lo"] > 0
            out.append(f"curve ({w}): going from {pts[-2]['fraction']:.2f} to {pts[-1]['fraction']:.2f} of the pairs "
                       + (f"lowered the test log-loss by {d['estimate']:.4f} (interval above 0): more data still helps"
                          if more else f"changed the test log-loss by {-d['estimate']:+.4f}, interval "
                          f"[{-d['hi']:+.4f}, {-d['lo']:+.4f}] includes 0: no measurable gain from the last step"))
    return "\n".join(out)
