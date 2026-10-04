#!/usr/bin/env python3
# mtg-table — tools/ml: what the three evaluator gates share (D354).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The evaluator gates' shared parts (D354): the pre-registered rules as
constants, the held-out deck pairs of a trained model, paired bootstraps, and
the version stamp every gate artefact carries.

The rules live HERE, in one place, and DECISIONS.md D354 states the same
numbers: a gate script prints PASS or FAIL against them and never takes a flag
that loosens one.  Changing a rule is a new decision, made before its run.

Standard library only, except where a caller passes numpy arrays.
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import subprocess
import sys
from typing import Any, Callable, Iterable, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fio  # noqa: E402  -- a log's recorded name (D370)

# ---------------------------------------------------------------- the pre-registered rules (D354)

FIT_RULE = {
    # gate 1: the held-out test split of the model's own split (by deck pair, reserved decks dropped)
    "split": "the model's --split-by (pair or holdout:...), its TEST split only",
    "bootstrap": 2000,               # resamples, over deck pairs (decision rows) / games (leaf rows)
    "ci": 0.95,                      # two-sided percentile interval; PASS needs its lower end > 0
    "eceMax": 0.03,                  # expected calibration error on the test rows, ten equal-width bins
    "binTolerance": 0.05,            # |predicted - observed| in every reliability bin ...
    "binMinRows": 200,               # ... that holds at least this many test rows
    "minTestPairs": 50,              # fewer held-out pairs: FAIL (underpowered), never PASS
    "minLeafPositions": 2000,        # fewer held-out turn-end positions: FAIL (underpowered)
    "maxLeafFiles": 1500,            # the leaf comparison's held-out logs: at most this many, evenly spaced
}

REGRET_RULE = {
    "perType": 100,                  # decisions per stratum in the scored set ...
    "types": ("spell", "attack", "block"),
    "candidatesPerType": 130,        # ... chosen in hash order from this many candidates that rebuild
    "salt": "gate2-v1",              # the candidates' hash order (never results)
    "onePerGameAndType": True,
    "truthSeed": 20261004,           # the truth tables' run seed; the rankers use another
    "truthPlayouts": 200, "truthInitial": 40, "truthBatch": 20,   # coach-grade racing, to the end of the game
    "truthBudgetMs": 2_400_000,      # a decision's wall-clock cap (40 min, one JVM)
    "truthTimeoutMs": 180_000,       # one playout's cap
    "cap": 12,                       # options enumerated in full up to this many (the live analysis's)
    "rankSeed": 1,
    "rankHorizon": 0,                # the search's live horizon (search-v1-fixed3: turns=0, aturns unset)
    "rankRounds": 3,                 # PRIMARY: search-v1-fixed3's rounds per decision, no racing
    "rankRoundsSecondary": 12,       # reported, not gating
    "leafScale": 500,                # the hand ranker's sigma(leaf/500): SearchPolicy.LEAF_SCALE (D349), pinned
    "bootstrap": 10000, "ci": 0.95, "bootSeed": 20261004,
    "minScored": 240,                # fewer scored decisions (of 300): FAIL (underpowered)
}

SPRT_RULE = {"base": "search-v1-fixed3", "elo0": 0, "elo1": 20, "alpha": 0.05, "beta": 0.05, "maxGames": 2400}


# ---------------------------------------------------------------- held-out pairs

def model_training(model_path: str) -> dict[str, Any]:
    with open(model_path, encoding="utf-8") as f:
        m = json.load(f)
    tr = m.get("training") or {}
    return {"data": tr.get("data"), "splitBy": tr.get("splitBy") or "dataset", "schemaId": m.get("schemaId"),
            "sha12": file_sha12(model_path)}


def game_splits(data: str, split_by: str) -> list[str]:
    """Each game's split (games.jsonl order) under train_eval.py's re-split -- the
    exact rule the model was trained with, so the test split is what it never saw."""
    import re
    import train_eval as T
    games = T.read_games(data)
    keys = [T.pair_key(g) for g in games]
    if split_by == "pair":
        where = T.assign_pairs(keys)
        return [where[k] for k in keys]
    if split_by.startswith("holdout:"):
        rx = re.compile(split_by.split(":", 1)[1])
        held = [bool(rx.search(g.get("file", ""))) or any(rx.search(d) for d in (g.get("match") or "").split("|") if d)
                for g in games]
        where = T.assign_pairs([k for k, h in zip(keys, held) if not h], (80, 20, 0))
        return ["test" if h else where[k] for k, h in zip(keys, held)]
    if split_by == "dataset":
        return [g["split"] for g in games]
    raise SystemExit(f"gates: a model trained with --split-by {split_by} has no held-out deck pairs (want pair or holdout:)")


def heldout(data: str, split_by: str) -> dict[str, Any]:
    """{'pairs': test pair keys, 'trainPairs': ..., 'files': {relpath: pair}} for the TEST split."""
    import train_eval as T
    games = T.read_games(data)
    sp = game_splits(data, split_by)
    test_pairs = {T.pair_key(g) for g, s in zip(games, sp) if s == "test"}
    train_pairs = {T.pair_key(g) for g, s in zip(games, sp) if s != "test"}
    if test_pairs & train_pairs:
        raise SystemExit("gates: a deck pair is in both the test split and training -- not a held-out split")
    files = {os.path.normpath(fio.recorded(g["file"])): T.pair_key(g) for g, s in zip(games, sp) if s == "test"}
    return {"pairs": test_pairs, "trainPairs": train_pairs, "files": files}


# ---------------------------------------------------------------- bootstrap

def percentile(xs: Sequence[float], q: float) -> float:
    s = sorted(xs)
    if not s:
        return float("nan")
    k = (len(s) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def bootstrap_groups(groups: list[tuple[float, float]], boots: int, seed: int, ci: float = 0.95) -> dict[str, float]:
    """A ratio estimate sum(num)/sum(den) over groups -- (num, den) per group,
    e.g. (sum of a per-row difference, rows) -- with a percentile interval from
    resampling whole groups.  Rows of one group move together."""
    rng = random.Random(seed)
    n = len(groups)
    tot_n = sum(g[0] for g in groups)
    tot_d = sum(g[1] for g in groups)
    est = tot_n / tot_d if tot_d else float("nan")
    reps = []
    for _ in range(boots if n else 0):
        sn = sd = 0.0
        for _i in range(n):
            a, b = groups[rng.randrange(n)]
            sn += a
            sd += b
        reps.append(sn / sd if sd else float("nan"))
    a = (1 - ci) / 2
    return {"estimate": est, "lo": percentile(reps, a), "hi": percentile(reps, 1 - a), "groups": n, "boots": boots}


def paired_bootstrap(diffs: list[float], boots: int, seed: int, ci: float = 0.95) -> dict[str, float]:
    """The mean of per-unit paired differences with a percentile interval (units resampled)."""
    return bootstrap_groups([(d, 1.0) for d in diffs], boots, seed, ci)


# ---------------------------------------------------------------- version stamps (D341's rule for our artefacts)

def file_sha(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def file_sha12(path: str) -> str:
    return file_sha(path)[:12]


def _git(repo: str, *args: str) -> str:
    try:
        return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def code_version(repo: str = ".", jar: str | None = None) -> dict[str, Any]:
    """What graded or ranked: HEAD (recorded), the tree hash of bridge/src (compared), whether bridge/src has
    uncommitted changes (compared), the Forge jar's sha256 (compared, when known)."""
    tree = _git(repo, "rev-parse", "HEAD:bridge/src")
    dirty = bool(_git(repo, "status", "--porcelain", "--", "bridge/src"))
    jar = jar or os.environ.get("FORGE_JAR")
    return {"head": _git(repo, "rev-parse", "HEAD"), "bridgeTree": tree, "bridgeDirty": dirty,
            "jarSha": file_sha(jar) if jar and os.path.isfile(jar) else None}


COMPARED = ("bridgeTree", "bridgeDirty", "jarSha")


def version_diff(a: dict[str, Any], b: dict[str, Any]) -> list[str]:
    return [k for k in COMPARED if a.get(k) != b.get(k)]


# ---------------------------------------------------------------- small IO

def read_jsonl(path: str) -> list[dict[str, Any]]:
    out = []
    if not os.path.isfile(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue   # a torn last line of a killed run
    return out


def write_json(path: str, obj: Any) -> None:
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1)
        f.write("\n")


def verdict_line(gate: str, ok: bool, reasons: Iterable[str]) -> str:
    rs = [r for r in reasons if r]
    return f"{gate}: {'PASS' if ok else 'FAIL'}" + ("" if ok or not rs else " -- " + "; ".join(rs))


def stable_order(keys: Iterable[str], salt: str) -> list[str]:
    return sorted(keys, key=lambda k: hashlib.sha256(f"{salt}|{k}".encode()).hexdigest())


def sigmoid(z: float) -> float:
    import math
    return 1.0 / (1.0 + math.exp(-max(-35.0, min(35.0, z))))


Pred = Callable[[Any], Any]
