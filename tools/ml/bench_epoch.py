#!/usr/bin/env python3
# mtg-table — tools/ml: time one training epoch of the evaluator on synthetic rows of a real night's shape.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""How long does one epoch of train_eval.py take at night-1's size, and where
does the time go?  (D364.)  Synthetic rows, built in memory as evalnet.Rows
(no shards on disk), with night-1's shape by default: 6,343,314 rows, the
D305 board (243 columns), 731 vocabulary slots x 17 card states (12,670
features), 24 card cells a row, 80/10/10 train/val/test.

    python3 tools/ml/bench_epoch.py [--rows 6343314] [--slots 731] [--nnz 24]
        [--hidden 128] [--dim 4] [--batch 4096] [--batches 0] [--profile]
        [--fast] [--json out.json]

It times one epoch (or `--batches N` of them, extrapolated to the epoch) of
train_eval.train_numpy's inner loop and one validation pass, for the plain
path (the default, bit for bit the trainer's) and, with `--fast`, the float32
path (`train_eval.py --fast`).  `--profile` prints cProfile's top entries.
BLAS threads are whatever OMP_NUM_THREADS / OPENBLAS_NUM_THREADS say (the
lab runner sets them to a step's `cores:`).

The rows are noise with a planted signal (life, creatures and a few cards), so
the numbers are the code's speed, not a model's quality.  Needs numpy.
"""
from __future__ import annotations

import argparse
import cProfile
import json
import os
import pstats
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import encode as E  # noqa: E402
import evalnet as N  # noqa: E402
import train_eval as T  # noqa: E402

NIGHT1 = {"rows": 6_343_314, "slots": 731, "nnz": 24}


def synthetic_schema(slots: int):
    """D305's real board layout over a made-up vocabulary of `slots` slots (basics and specials included)."""
    names = [f"Card {i:04d}" for i in range(slots - len(E.BASICS) - len(E.SPECIALS))]
    return E.Schema(E.Vocab.from_names(names))


def synthetic_rows(n: int, schema, nnz: int, seed: int = 0, chunk: int = 500_000) -> "N.Rows":
    """n rows as one evalnet.Rows, int16 board and sparse int16 card block, the way load_splits holds them."""
    rng = np.random.default_rng(seed)
    off = schema.card_offset
    names = [f["name"] for b in schema.to_json()["blocks"] if b["name"] != "cards" for f in b["features"]]
    S = len(E.CARD_STATES)
    slots = len(schema.vocab)
    board = np.empty((n, off), np.int16)
    for i in range(0, n, chunk):
        m = min(chunk, n - i)
        # small non-negative counts, a few columns wider (life, library), as a real board's
        b = rng.poisson(1.2, (m, off)).astype(np.int16)
        b[:, names.index("me.life")] = rng.integers(-5, 30, m)
        b[:, names.index("opp.life")] = rng.integers(-5, 30, m)
        b[:, names.index("turn")] = rng.integers(1, 25, m)
        b[:, names.index("my_priority")] = 1     # constant on decision rows: make_net leaves it out
        board[i:i + m] = b
    indptr = np.arange(n + 1, dtype=np.int64) * nnz
    slot = rng.integers(0, slots - len(E.SPECIALS), n * nnz).astype(np.int16)
    state = rng.integers(0, S, n * nnz).astype(np.int8)
    count = np.ones(n * nnz, np.int16)
    z = (board[:, names.index("me.life")].astype(np.float64) - board[:, names.index("opp.life")]) / 8.0
    good = slot.reshape(n, nnz) % 17 == 0
    z += 0.3 * (good & (state.reshape(n, nnz) < 9)).sum(axis=1)
    z -= 0.3 * (good & (state.reshape(n, nnz) >= 9)).sum(axis=1)
    y = np.where(rng.random(n) < 1.0 / (1.0 + np.exp(-z)), 1, -1).astype(np.int8)
    turn = board[:, names.index("turn")].copy()
    game = (np.arange(n) // 160).astype(np.int32)
    return N.Rows(board, indptr, slot, state, count, y, turn, game), names


def time_epoch(tr, va, names, hp, vocab_size, batches: int, fast: bool, profile: bool) -> dict:
    net, _ex = T.make_net(tr, names, hp, vocab_size, 0)
    n = len(tr)
    bsz = int(hp["batch"])
    total = (n + bsz - 1) // bsz
    todo = min(total, batches) if batches else total
    trainer = T.EpochTrainer(net, tr, hp, 0, fast=fast)
    prof = cProfile.Profile() if profile else None
    c0 = time.process_time()
    t0 = time.perf_counter()
    if prof:
        prof.enable()
    trainer.run_epoch(limit=todo)
    if prof:
        prof.disable()
    train_s = time.perf_counter() - t0
    train_cpu = time.process_time() - c0
    t1 = time.perf_counter()
    trainer.val_logloss(va)
    val_s = time.perf_counter() - t1
    out = {"fast": fast, "batches": todo, "batchesPerEpoch": total, "trainSeconds": round(train_s, 2),
           "trainEpochSeconds": round(train_s * total / todo, 1), "valSeconds": round(val_s, 1),
           "epochSeconds": round(train_s * total / todo + val_s, 1), "rowsPerSecond": round(todo * bsz / train_s),
           "trainEpochCpuSeconds": round(train_cpu * total / todo, 1), "msPerBatch": round(1000 * train_s / todo, 1),
           "cpuMsPerBatch": round(1000 * train_cpu / todo, 1)}
    if prof:
        s = pstats.Stats(prof)
        s.sort_stats("tottime").print_stats(14)
    return out


_B: dict = {}


def _bench_worker(task):
    """One worker of a concurrent run: its own configuration's batches, timed."""
    i, fast, batches = task
    tr, names, hp, vocab = _B["tr"], _B["names"], _B["hp"], _B["vocab"]
    net, _ex = T.make_net(tr, names, hp, vocab, i)
    tt = T.EpochTrainer(net, tr, hp, i, fast=fast)
    t0, c0 = time.perf_counter(), time.process_time()
    tt.run_epoch(limit=batches)
    return time.perf_counter() - t0, time.process_time() - c0


def time_concurrent(tr, names, hp, vocab_size, workers: int, batches: int, fast: bool) -> dict:
    """`workers` configurations trained at once in forked processes (train_eval.py --jobs), `batches` each."""
    import eval_search as S
    _B.update(tr=tr, names=names, hp=hp, vocab=vocab_size)
    pool = S.Workers(workers)
    try:
        t0 = time.perf_counter()
        res = pool.map(_bench_worker, [(i, fast, batches) for i in range(workers)])
        wall = time.perf_counter() - t0
    finally:
        pool.close()
    bsz = int(hp["batch"])
    per = sorted(r[0] for r in res)
    return {"fast": fast, "workers": workers, "batchesEach": batches, "wallSeconds": round(wall, 2),
            "msPerBatchPerWorker": round(1000 * per[len(per) // 2] / batches, 1),
            "rowsPerSecondAll": round(workers * batches * bsz / wall)}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--rows", type=int, default=NIGHT1["rows"])
    ap.add_argument("--slots", type=int, default=NIGHT1["slots"])
    ap.add_argument("--nnz", type=int, default=NIGHT1["nnz"])
    ap.add_argument("--hidden", default="128")
    ap.add_argument("--dim", type=int, default=4)
    ap.add_argument("--batch", type=int, default=4096)
    ap.add_argument("--batches", type=int, default=0, help="time this many batches and extrapolate (0: a whole epoch)")
    ap.add_argument("--fast", action="store_true", help="also time the float32 path (train_eval.py --fast)")
    ap.add_argument("--profile", action="store_true")
    ap.add_argument("--workers", default="", help="also time J configurations at once (e.g. 1,2,4): "
                                                   "train_eval.py --jobs J's throughput")
    ap.add_argument("--json")
    a = ap.parse_args(argv)
    schema = synthetic_schema(a.slots)
    t0 = time.perf_counter()
    n_tr, n_va = int(a.rows * 0.8), int(a.rows * 0.1)
    tr, names = synthetic_rows(n_tr, schema, a.nnz, seed=0)
    va, _ = synthetic_rows(n_va, schema, a.nnz, seed=1)
    mem = T.Memory()
    print(f"bench: {a.rows} rows ({n_tr} train, {n_va} val), {schema.n} features, {schema.card_offset} board "
          f"columns, {a.nnz} card cells a row; built in {time.perf_counter() - t0:.0f} s; threads "
          f"OMP={os.environ.get('OMP_NUM_THREADS', '-')} OPENBLAS={os.environ.get('OPENBLAS_NUM_THREADS', '-')}",
          flush=True)
    mem.note("built", print)
    hp = dict(T.DEFAULTS, hidden=a.hidden, dim=a.dim, batch=a.batch)
    tr.moments()
    res = {"rows": a.rows, "train": n_tr, "val": n_va, "features": schema.n, "hidden": a.hidden, "dim": a.dim,
           "batch": a.batch, "runs": []}
    for fast in ((False, True) if a.fast else (False,)):
        r = time_epoch(tr, va, names, hp, len(schema.vocab), a.batches, fast, a.profile)
        print(json.dumps(r), flush=True)
        res["runs"].append(r)
    for w in [int(x) for x in a.workers.split(",") if x.strip()]:
        for fast in ((False, True) if a.fast else (False,)):
            r = time_concurrent(tr, names, hp, len(schema.vocab), w, a.batches or 100, fast)
            print(json.dumps(r), flush=True)
            res["runs"].append(r)
    mem.note("timed", print)
    res["memory"] = mem.stages
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
