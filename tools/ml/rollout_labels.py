#!/usr/bin/env python3
# mtg-table — tools/ml: rollout labels for the position evaluator (D382).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Soft labels for `train_eval.py --soft-labels` (D364): positions played out by Forge.

    python3 tools/ml/rollout_labels.py plan --data DATASET --n 50000 --seed 1 --out WORK/moments.jsonl \
        [--split train] [--per-game 2] [--floor 50] [--oversample 1.4] [--turn-buckets 2,4,6,9]
    tools/coach-grade.sh rollout --moments WORK/moments.jsonl --out WORK/labels.jsonl --jobs 7 --k 32 --seed 1
    python3 tools/ml/rollout_labels.py pack --data DATASET --results WORK/labels.jsonl --out WORK/soft.npz [--min-k 16]
    python3 tools/ml/rollout_labels.py summary --results WORK/labels.jsonl [--moments WORK/moments.jsonl]
    python3 tools/ml/rollout_labels.py pool --cube cubes/vintage-cube-180.md --out POOL.txt
    python3 tools/ml/rollout_labels.py first-row --log LOG [--min-turn 3]   # a decision row's seq, for smokes

A dataset row (D305) is a state where the viewer holds priority in a main
phase or a combat step.  Its outcome label (+1 / 0 / -1) is one game's result,
however the game went on from there; a ROLLOUT label is the mean result of K
games played on from that exact state by Forge's Default AI on both seats --
less noise per row, at the cost of an engine run per row.  The Java half is
`tools/coach-grade.sh rollout` (bridge/src/mtgtable/grade/Rollout.java):
it rebuilds the state from the viewer's redacted log, deals what the viewer
cannot see -- the opponent's hand, library and unknown face-down cards from
the opponent's POOL (the cube's list minus everything of the viewer's and
every public card; D348), the viewer's library from their own deck list --
and plays it out, K rounds on seeds that are a function of (seed, the
position's key, round).  The opponent's real hidden cards are never read: the
log does not carry them (hard rule 8), and a moment naming an opponent deck
list is refused.

plan    picks the rows, stratified: within each stratum (the game's cube or
        queue folder x a turn bucket) the same share of the stratum's rows,
        every stratum at least --floor rows when it has them, at most
        --per-game rows of one game, from the --split split (train: soft labels
        only change training targets; val and test are scored on outcomes).
        A row whose state has a stack is not planned (the rebuild restores a
        stack only for a target decision, D334), nor one in a combat damage
        step (its Combat is not rebuilt); such a row keeps its outcome label,
        and the draw is --oversample x n with n kept.  The moments are
        written in a seeded random order: any prefix -- a night's block, a
        stopped run -- is a random subsample of the plan.  Seeded throughout,
        so a plan is a function of the dataset and --seed.  Each moment
        re-encodes its game (encode.py, the dataset's own schema) to find the
        row's state frame (`seq`), and names the game's pool (its cube's card
        list, written once per cube under WORK/pools/).  A game the archive
        recompressed to .zst (D370) is copied back to gzip under WORK/logs/
        for the Java half, which reads gzip only; the queue is never touched.
pack    turns the rollout lines into the .npz `--soft-labels` reads: game,
        rows_to_end, p, k (int64, int64, float64, int64), sorted by key.  A line
        is kept when its status is ok and k >= --min-k, and its gameKey is the
        dataset's game_key at that index (a dataset rebuilt since the plan is
        refused, not silently mislabelled).
summary the cost and the labels in one JSON line (the lab runner's metrics):
        positions by status, playouts, ms per position and per playout (median,
        p90), mean p, mean |p - outcome| where the dataset's outcome is known.

Needs numpy for plan and pack.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import statistics
import sys
from collections import Counter, defaultdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import fio  # noqa: E402  -- .jsonl / .gz / .zst (D370)

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

DEFAULT_TURN_BUCKETS = (2, 4, 6, 9)
# Steps the rebuild cannot restore (D334's grader does not grade them either): a damage step's Combat is
# not rebuilt, and Forge's PhaseHandler dereferences it (a NullPointerException in every playout, measured).
UNPLAYABLE_PHASES = ("COMBAT_FIRST_STRIKE_DAMAGE", "COMBAT_DAMAGE")


def _need_numpy() -> None:
    if np is None:
        raise SystemExit("rollout_labels: numpy is not installed")


def turn_bucket(turn: int, edges: tuple[int, ...]) -> str:
    """'1-2', '3-4', ... '10+' for edges (2, 4, 6, 9)."""
    lo = 1
    for e in edges:
        if turn <= e:
            return f"{lo}-{e}"
        lo = e + 1
    return f"{lo}+"


def group_of(file: str) -> str:
    """A game's cube for stratifying: the queue's `normal/<cube>` or `bridge/<a>+<b>`, else the run folder."""
    parts = file.replace("\\", "/").split("/")
    for i, p in enumerate(parts[:-1]):
        if p in ("normal", "bridge") and i + 1 < len(parts):
            return f"{p}/{parts[i + 1]}"
    if "runs" in parts:
        i = parts.index("runs")
        if i + 1 < len(parts):
            return f"runs/{parts[i + 1]}"
    return "other"


def read_games(data: str) -> list[dict[str, Any]]:
    with open(os.path.join(data, "games.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def split_rows(data: str, split: str) -> dict[str, Any]:
    """The split's row keys without its features: game, rows_to_end, turn (the shards' own members)."""
    _need_numpy()
    files = sorted(f for f in os.listdir(data) if f.startswith(split + "-") and f.endswith(".npz"))
    cols: dict[str, list[Any]] = {"game": [], "rows_to_end": [], "turn": []}
    for fn in files:
        with np.load(os.path.join(data, fn)) as z:
            for k in cols:
                cols[k].append(np.asarray(z[k], np.int64))
    return {k: (np.concatenate(v) if v else np.zeros(0, np.int64)) for k, v in cols.items()}


def allocate(sizes: dict[str, int], n: int, floor: int) -> dict[str, int]:
    """Rows per stratum: min(size, floor) first, the rest of n in proportion to what each has left,
    largest remainders first (ties by name), never more than a stratum holds."""
    take = {s: min(c, floor) for s, c in sizes.items()}
    left = n - sum(take.values())
    if left < 0:   # the floors alone exceed n: a share of n in proportion to the floors
        tot = sum(take.values())
        raw = {s: n * t / tot for s, t in take.items()}
        take = {s: int(v) for s, v in raw.items()}
        for s in sorted(raw, key=lambda s: (-(raw[s] - take[s]), s))[: n - sum(take.values())]:
            take[s] += 1
        return take
    while left > 0:
        room = {s: sizes[s] - take[s] for s in sizes if sizes[s] > take[s]}
        if not room:
            break
        tot = sum(room.values())
        raw = {s: left * r / tot for s, r in room.items()}
        add = {s: min(room[s], int(v)) for s, v in raw.items()}
        rem = left - sum(add.values())
        for s in sorted(raw, key=lambda s: (-(raw[s] - int(raw[s])), s)):
            if rem <= 0:
                break
            if add[s] < room[s]:
                add[s] += 1
                rem -= 1
        if not any(add.values()):
            break
        for s, a in add.items():
            take[s] += a
        left = n - sum(take.values())
    return take


def choose(rows: dict[str, Any], games: list[dict[str, Any]], n: int, seed: int, per_game: int, floor: int,
           edges: tuple[int, ...]) -> list[tuple[int, int, int, str]]:
    """The sampled rows (game, rows_to_end, turn, stratum), sorted by (game, rows_to_end): a function of
    the rows, the games and the arguments only."""
    rng = np.random.default_rng(seed)
    g, rte, turn = rows["game"], rows["rows_to_end"], rows["turn"]
    order = np.lexsort((rte, g))   # a canonical order, whatever the shards' order
    strata: dict[str, list[int]] = defaultdict(list)
    for i in order.tolist():
        strata[f"{group_of(games[int(g[i])]['file'])}|{turn_bucket(int(turn[i]), edges)}"].append(i)
    quota = allocate({s: len(v) for s, v in strata.items()}, n, floor)
    used: Counter[int] = Counter()
    out = []
    for s in sorted(strata):
        idx = strata[s]
        perm = rng.permutation(len(idx))   # one draw per stratum, in stratum order: seeded and stable
        got = 0
        for j in perm.tolist():
            if got >= quota[s]:
                break
            i = idx[j]
            gi = int(g[i])
            if used[gi] >= per_game:
                continue
            used[gi] += 1
            out.append((gi, int(rte[i]), int(turn[i]), s))
            got += 1
    return sorted(out)


def schema_of(data: str) -> tuple[E.Schema, list[str]]:
    with open(os.path.join(data, "features.json"), encoding="utf-8") as f:
        j = json.load(f)
    v = j["vocab"]
    names = list(v["cards"] if isinstance(v, dict) else v)
    schema = E.Schema(E.Vocab.from_names(names))
    phases = j.get("decisionPhases") or E.default_phases()
    if schema.schema_id != j.get("schemaId"):
        raise SystemExit("rollout_labels: features.json's schema id does not rebuild from its vocabulary "
                         "(an r17 dataset has no decision rows to play out, D359)")
    return schema, phases


def seqs_of(game: dict[str, Any], schema: E.Schema, phases: list[str]) -> dict[int, tuple[int, int, str]]:
    """rows_to_end -> (the row's state frame seq, the size of that state's stack, its phase), by
    re-encoding the game exactly as dataset.py did."""
    for gm in E.read_games(game["file"]):
        if gm.game_key == game["game_key"]:
            rows = E.encode_game(gm, schema, phases)
            if len(rows) != game["rows"]:
                raise ValueError(f"{game['file']}: {len(rows)} rows now, {game['rows']} in the dataset")
            stack = {int(f.get("seq") or 0): len((f.get("body") or {}).get("stack") or [])
                     for f in gm.frames if f.get("type") == "state"}
            return {r.rows_to_end: (r.seq, stack.get(r.seq, 0), r.phase) for r in rows}
    raise ValueError(f"{game['file']}: no game {game['game_key']}")


def header_of(path: str) -> dict[str, Any]:
    for line in E._lines(path):
        line = line.strip()
        if line:
            return json.loads(line)
    return {}


def cube_files(header: dict[str, Any], log: str | None = None) -> list[str]:
    """The cube(s) a lab game was drafted from: its header's lab.cubeFile (a bridge draft's lab.cubeFiles);
    when those paths are gone (a folder moved or copied), the run folder's own cube.md above the log
    (a run and a queue folder keep one: <run>/cube.md, its recordings under <run>/games/<seed>/)."""
    lab = header.get("lab") or {}
    files = [str(f) for f in (lab.get("cubeFiles") or ([lab["cubeFile"]] if lab.get("cubeFile") else []))]
    if files and all(os.path.isfile(f) for f in files):
        return files
    if log is not None and lab:
        d = os.path.dirname(os.path.abspath(log))
        for _ in range(4):
            c = os.path.join(d, "cube.md")
            if os.path.isfile(c):
                return [os.path.relpath(c)]
            d = os.path.dirname(d)
    return files


def write_pool(cubes: list[str], pools_dir: str) -> str:
    """The pool file for these cubes (their card lists, one `1 Name` line a card), written once."""
    names: list[str] = []
    for c in cubes:
        with open(c, encoding="utf-8") as f:
            names += E.parse_cube_markdown(f.read())
    body = "".join(f"1 {n}\n" for n in names)
    path = os.path.join(pools_dir, hashlib.sha256(body.encode()).hexdigest()[:16] + ".txt")
    if not os.path.isfile(path):
        os.makedirs(pools_dir, exist_ok=True)
        tmp = f"{path}.{os.getpid()}.part"   # plan --jobs: processes may write the same pool at once
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(body)
        os.replace(tmp, path)
    return path


_PREP: dict[str, Any] = {}


def _prep_init(data: str, work: str) -> None:
    _PREP["schema"], _PREP["phases"] = schema_of(data)
    _PREP["pools"] = os.path.join(work, "pools")
    _PREP["logs"] = os.path.join(work, "logs")


def java_log(game: dict[str, Any], logs_dir: str) -> str:
    """The log the Java rollout reads.  WireLog is gzip-only (D370): a game the archive recompressed to
    .zst is copied back to gzip under WORK/logs/<game key>.jsonl.gz -- its bytes read strictly (a short
    file raises), written to a .part and renamed -- never restored into the queue's folders."""
    real = fio.resolve(game["file"])
    if not real.endswith(".zst"):
        return game["file"]
    out = os.path.join(logs_dir, f"{game['game_key']}.jsonl.gz")
    if not os.path.isfile(out):
        import gzip
        os.makedirs(logs_dir, exist_ok=True)
        tmp = f"{out}.{os.getpid()}.part"
        with gzip.open(tmp, "wb", compresslevel=6) as f:
            f.write(fio.read_bytes(real))
        os.replace(tmp, out)
    return os.path.relpath(out)


def _prep(game: dict[str, Any]) -> tuple[dict[int, tuple[int, int, str]] | None, str | None, str | None, str | None]:
    """One game's rows (rows_to_end -> seq, stack, phase), its pool file, the log Java reads, or the error."""
    try:
        seqs = seqs_of(game, _PREP["schema"], _PREP["phases"])
        cubes = cube_files(header_of(game["file"]), game["file"])
        if not cubes or not all(os.path.isfile(c) for c in cubes):
            return None, None, None, "no cube file"
        return seqs, write_pool(cubes, _PREP["pools"]), java_log(game, _PREP["logs"]), None
    except (OSError, ValueError, EOFError, json.JSONDecodeError) as e:
        print(f"rollout_labels: skip {game['file']}: {e}", file=sys.stderr)
        return None, None, None, type(e).__name__


def plan(a: argparse.Namespace) -> int:
    _need_numpy()
    games = read_games(a.data)
    rows = split_rows(a.data, a.split)
    edges = tuple(int(x) for x in a.turn_buckets.split(",")) if a.turn_buckets else DEFAULT_TURN_BUCKETS
    # Over-pick: rows with a stack are not played out (the rebuild restores a stack only for a target
    # decision, D334), so the plan draws --oversample x n and keeps n of those it can label.
    picked = choose(rows, games, int(round(a.n * a.oversample)), a.seed, a.per_game, a.floor, edges)
    work = os.path.dirname(os.path.abspath(a.out))
    by_game: dict[int, list[tuple[int, int, str]]] = defaultdict(list)
    for gi, rte, t, s in picked:
        by_game[gi].append((rte, t, s))
    skipped: Counter[str] = Counter()
    moments: list[dict[str, Any]] = []
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    gis = sorted(by_game)
    if a.jobs > 1:
        import multiprocessing as mp
        with mp.get_context("fork").Pool(a.jobs, _prep_init, (a.data, work)) as pool_procs:
            prepped = pool_procs.map(_prep, [games[gi] for gi in gis], chunksize=8)
    else:
        _prep_init(a.data, work)
        prepped = [_prep(games[gi]) for gi in gis]
    for gi, (seqs, pool, log, err) in zip(gis, prepped):   # in game order whatever --jobs: the same plan
        game = games[gi]
        if err is not None or seqs is None or pool is None or log is None:
            skipped[err or "error"] += len(by_game[gi])
            continue
        for rte, t, s in sorted(by_game[gi]):
            if rte not in seqs:
                skipped["no such row"] += 1
                continue
            seq, stack, phase = seqs[rte]
            if stack:
                skipped["stack not empty"] += 1
                continue
            if phase in UNPLAYABLE_PHASES:
                skipped["combat damage step"] += 1
                continue
            moments.append({"id": f"{gi}:{rte}", "game": gi, "rowsToEnd": rte, "gameKey": game["game_key"],
                            "log": log, "seq": seq, "turn": t, "stratum": s,
                            "outcome": game.get("label"), "oppPool": os.path.relpath(pool)})
    # A seeded random order (not the games' order), and the first n: any prefix of the file -- what a
    # stopped run labelled, a night's block -- is a random subsample of the stratified plan.
    order = np.random.default_rng([a.seed, 378]).permutation(len(moments)).tolist()
    moments = [moments[i] for i in order][: a.n]
    with open(a.out + ".part", "w", encoding="utf-8") as out:
        for m in moments:
            out.write(json.dumps(m, sort_keys=True) + "\n")
    os.replace(a.out + ".part", a.out)
    strata = Counter(m["stratum"] for m in moments)
    print(json.dumps({"planned": len(moments), "picked": len(picked), "skipped": dict(skipped), "games": len(by_game),
                      "splitRows": int(len(rows["game"])), "strata": len(strata), "seed": a.seed,
                      "byStratum": dict(sorted(strata.items()))}, sort_keys=True))
    return 0


def result_files(path: str) -> list[str]:
    """The rollout output: the file itself once coach-grade.sh has joined it, else its shards so far."""
    if os.path.isfile(path):
        return [path]
    d = os.path.dirname(path) or "."
    base = os.path.basename(path) + ".shard-"
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.startswith(base) and f.endswith(".jsonl")) \
        if os.path.isdir(d) else []


def read_results(paths: str | list[str]) -> list[dict[str, Any]]:
    out = []
    for p in [f for path in ([paths] if isinstance(paths, str) else paths) for f in result_files(path)]:
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        out.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass   # a torn last line of a killed shard
    return out


def pack(a: argparse.Namespace) -> int:
    _need_numpy()
    games = read_games(a.data)
    res = read_results(a.results)
    keep: dict[tuple[int, int], tuple[float, int]] = {}
    why: Counter[str] = Counter()
    for r in res:
        if r.get("status") != "ok":
            why[f"status {r.get('status')}"] += 1
            continue
        k = int(r.get("k", 0))
        if k < a.min_k:
            why["k under --min-k"] += 1
            continue
        gi, rte = int(r["game"]), int(r["rowsToEnd"])
        if not 0 <= gi < len(games) or games[gi]["game_key"] != r.get("gameKey"):
            raise SystemExit(f"rollout_labels: {r.get('id')}: game {gi} is not {r.get('gameKey')} in {a.data} "
                             "(the dataset was rebuilt since the plan: plan again)")
        p = float(r["p"])
        if not (0.0 <= p <= 1.0):
            raise SystemExit(f"rollout_labels: {r.get('id')}: p {p} is outside [0, 1]")
        if (gi, rte) in keep:
            why["duplicate"] += 1
            continue
        keep[(gi, rte)] = (p, k)
    keys = sorted(keep)
    arrays = {
        "game": np.asarray([g for g, _ in keys], np.int64),
        "rows_to_end": np.asarray([r for _, r in keys], np.int64),
        "p": np.asarray([keep[x][0] for x in keys], np.float64),
        "k": np.asarray([keep[x][1] for x in keys], np.int64),
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    tmp = a.out + ".part.npz"
    np.savez(tmp, **arrays)
    os.replace(tmp, a.out)
    rep = {"labels": len(keys), "lines": len(res), "dropped": dict(why),
           "meanP": float(arrays["p"].mean()) if keys else None,
           "meanK": float(arrays["k"].mean()) if keys else None}
    # What made these labels (D341's question for a derived file): the code, the engine, the settings.
    with open(os.path.join(a.data, "features.json"), encoding="utf-8") as f:
        schema_id = json.load(f).get("schemaId")
    manifest = {"decision": "D382", **rep, "data": a.data, "schemaId": schema_id, "minK": a.min_k,
                "seeds": sorted({int(r["seed"]) for r in res if isinstance(r.get("seed"), int)}),
                "results": [{"path": p, "sha256": _sha_file(p)} for p in
                            [f for path in a.results for f in result_files(path)]],
                **code_version()}
    with open(a.out + ".json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write("\n")
    print(json.dumps(rep, sort_keys=True))
    return 0


def _sha_file(path: str | None) -> str | None:
    if not path or not os.path.isfile(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def code_version() -> dict[str, Any]:
    """HEAD, whether the producer's code differs from it, and the engine jar's sha256 (FORGE_JAR, else
    config.json's forgeJar) -- recorded beside the labels, never compared here."""
    import subprocess
    out: dict[str, Any] = {"gitSha": None, "dirty": None, "forgeJarSha256": None}
    try:
        out["gitSha"] = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
        st = subprocess.run(["git", "status", "--porcelain", "--", "bridge/src", "tools/ml", "tools/coach-grade.sh"],
                            capture_output=True, text=True, check=True).stdout
        out["dirty"] = bool(st.strip())
    except (OSError, subprocess.CalledProcessError):
        pass
    jar = os.environ.get("FORGE_JAR")
    if not jar and os.path.isfile("config.json"):
        with open("config.json", encoding="utf-8") as f:
            jar = json.load(f).get("forgeJar")
    out["forgeJarSha256"] = _sha_file(jar)
    return out


def _q(xs: list[float], q: float) -> float | None:
    if not xs:
        return None
    s = sorted(xs)
    return s[min(len(s) - 1, int(q * len(s)))]


def summary(a: argparse.Namespace) -> int:
    res = read_results(a.results)
    planned = None
    for m in a.moments or []:
        if os.path.isfile(m):
            with open(m, encoding="utf-8") as f:
                planned = (planned or 0) + sum(1 for line in f if line.strip())
    ok = [r for r in res if r.get("status") == "ok"]
    ms = [float(r["ms"]) for r in ok if "ms" in r]
    mpp = [float(r["msPerPlayout"]) for r in ok if "msPerPlayout" in r]
    gap = [abs(float(r["p"]) - (1.0 if r["outcome"] == 1 else 0.0 if r["outcome"] == -1 else 0.5))
           for r in ok if r.get("outcome") in (1, 0, -1) and "p" in r]
    by_turn: dict[str, list[float]] = defaultdict(list)
    for r in ok:
        by_turn[turn_bucket(int(r.get("turn", 0)), DEFAULT_TURN_BUCKETS)].append(float(r["ms"]) / 1000.0)
    out: dict[str, Any] = {
        "lines": len(res), "planned": planned, "ok": len(ok),
        "statuses": dict(Counter(str(r.get("status")) for r in res)),
        "playouts": int(sum(int(r.get("k", 0)) for r in ok)),
        "playout_errors": int(sum(int(r.get("errors", 0)) for r in ok)),
        "s_per_position_median": (statistics.median(ms) / 1000.0) if ms else None,
        "s_per_position_p90": (_q(ms, 0.9) / 1000.0) if ms else None,
        "s_per_position_mean": (statistics.fmean(ms) / 1000.0) if ms else None,
        "ms_per_playout_median": statistics.median(mpp) if mpp else None,
        "mean_p": statistics.fmean(float(r["p"]) for r in ok) if ok else None,
        "mean_abs_p_minus_outcome": statistics.fmean(gap) if gap else None,
        "s_per_position_by_turn": {k: round(statistics.fmean(v), 2) for k, v in sorted(by_turn.items())},
    }
    if planned:
        out["done_share"] = len(res) / planned
    print(json.dumps(out, sort_keys=True))
    return 0


def pool_cmd(a: argparse.Namespace) -> int:
    names = []
    for c in a.cube:
        with open(c, encoding="utf-8") as f:
            names += E.parse_cube_markdown(f.read())
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write("".join(f"1 {n}\n" for n in names))
    print(f"{len(names)} card(s) -> {a.out}")
    return 0


def first_row(a: argparse.Namespace) -> int:
    """The seq of a decision row of a log's first game, at or after --min-turn: for the engine smokes."""
    for gm in E.read_games(a.log):
        for f in gm.frames:
            st = f.get("body") or {}
            if (f.get("type") == "state" and not st.get("gameOver") and st.get("priority") == gm.seat
                    and st.get("phase") in set(E.default_phases()) and int(st.get("turn") or 0) >= a.min_turn):
                print(int(f.get("seq") or 0))
                return 0
        break
    print(f"rollout_labels: no decision row at turn >= {a.min_turn} in {a.log}", file=sys.stderr)
    return 1


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plan")
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--n", type=int, default=50_000)
    p.add_argument("--seed", type=int, default=1)
    p.add_argument("--split", default="train")
    p.add_argument("--per-game", type=int, default=2)
    p.add_argument("--floor", type=int, default=50, help="rows every stratum gets first, when it has them")
    p.add_argument("--oversample", type=float, default=1.4,
                   help="rows drawn per row planned: the draw that has a stack is not played out (default 1.4)")
    p.add_argument("--turn-buckets", default=",".join(map(str, DEFAULT_TURN_BUCKETS)))
    p.add_argument("--jobs", type=int, default=1, help="processes re-encoding the sampled games (the plan is the same)")
    p.set_defaults(fn=plan)
    p = sub.add_parser("pack")
    p.add_argument("--data", required=True)
    p.add_argument("--results", required=True, action="append", help="a rollout output (repeat: every night's block)")
    p.add_argument("--out", required=True)
    p.add_argument("--min-k", type=int, default=1)
    p.set_defaults(fn=pack)
    p = sub.add_parser("summary")
    p.add_argument("--results", required=True, action="append")
    p.add_argument("--moments", action="append")
    p.set_defaults(fn=summary)
    p = sub.add_parser("pool")
    p.add_argument("--cube", action="append", required=True)
    p.add_argument("--out", required=True)
    p.set_defaults(fn=pool_cmd)
    p = sub.add_parser("first-row")
    p.add_argument("--log", required=True)
    p.add_argument("--min-turn", type=int, default=3)
    p.set_defaults(fn=first_row)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
