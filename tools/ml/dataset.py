#!/usr/bin/env python3
# mtg-table — tools/ml: a directory of frame logs -> a split, sharded dataset.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Build a train/val/test dataset from frame logs (D305).

    python3 tools/ml/dataset.py --vocab cubes/synergy-cube-180.md \
        --out var/ml/data/synergy LOGDIR... [--split 80,10,10] [--salt ""] \
        [--shard-rows 100000] [--phases main,combat] [--group-by game|match]

Every log under the LOGDIRs is encoded by encode.py (one row per decision
state).  Rows are split BY GAME -- more exactly by split group: the two chairs
of one seed and match are one game (protocol.md §8.7), so both land in the same
split and nothing about a test game is seen in training.  The split is a hash
of the group id (with --salt), so it is deterministic and stable as logs are
added: a game never moves between splits when the corpus grows.
`--group-by match` (the default since D316) puts every game of one deck pair in
one split, which asks the honest question -- does the evaluator generalise to
decks it never saw? -- because a bench replays the same pairs over many seeds
and a by-game split would score positions of decks already seen in training.
`--group-by game` keeps D305's by-game split.

Writes, under --out:

    features.json             the layout (encode.Schema.to_json)
    <split>-<NNNNN>.npz       X int16 [rows, nFeatures] (every feature is an integer),
                              y int8 (label: +1/0/-1),
                              turn, turns_to_end, rows_to_end int16, active int8,
                              game int32 (an index into games.jsonl)
    games.jsonl               one line per game: index, game_key, split_group,
                              split, file, seat, rows, label, last turn
    stats.json                rows, games, label balance per split, schema id

Needs numpy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

SPLITS = ("train", "val", "test")


def split_of(group: str, weights: tuple[int, int, int], salt: str = "") -> str:
    """A split group's split: sha256(salt|group) mod the weights' sum."""
    h = int(hashlib.sha256(f"{salt}|{group}".encode()).hexdigest()[:12], 16)
    x = h % sum(weights)
    if x < weights[0]:
        return "train"
    if x < weights[0] + weights[1]:
        return "val"
    return "test"


def build(logs: list[str], vocab_paths: list[str], out: str, weights=(80, 10, 10), salt: str = "",
          shard_rows: int = 100_000, phases: list[str] | None = None, quiet: bool = False,
          group_by: str = "match") -> dict[str, Any]:
    if np is None:
        raise SystemExit("dataset.py needs numpy (pip install numpy)")
    vocab = E.Vocab.from_files(vocab_paths)
    schema = E.Schema(vocab)
    phases = phases or E.default_phases()
    os.makedirs(out, exist_ok=True)
    for fn in os.listdir(out):  # a rebuild replaces the shards
        if fn.endswith(".npz") and fn.split("-")[0] in SPLITS:
            os.remove(os.path.join(out, fn))
    with open(os.path.join(out, "features.json"), "w", encoding="utf-8") as f:
        json.dump(schema.to_json(phases), f, indent=1, ensure_ascii=False)
        f.write("\n")

    buf: dict[str, list[E.Row]] = {s: [] for s in SPLITS}
    shard_no = {s: 0 for s in SPLITS}
    games: list[dict[str, Any]] = []
    stats: dict[str, Any] = {s: {"rows": 0, "games": 0, "labels": Counter(), "rowLabels": Counter()}
                             for s in SPLITS}
    skipped = Counter()
    game_index: dict[str, int] = {}

    def flush(s: str, force: bool = False) -> None:
        rows = buf[s]
        while rows and (force or len(rows) >= shard_rows):
            chunk, rows[:] = rows[:shard_rows], rows[shard_rows:]
            X = np.asarray([r.features for r in chunk], dtype=np.float64)
            # every feature is a count, a life total or a mana value: an integer.
            # int16 halves float32's size (rows are ~7 KB for a 180-card cube).
            if not (np.array_equal(X, np.round(X)) and np.abs(X).max(initial=0) < 32768):
                raise ValueError("a feature is not an int16: the schema changed -- widen X's dtype")
            X = X.astype(np.int16)
            np.savez_compressed(
                os.path.join(out, f"{s}-{shard_no[s]:05d}.npz"), X=X,
                y=np.asarray([r.label for r in chunk], dtype=np.int8),
                turn=np.asarray([r.turn for r in chunk], dtype=np.int16),
                turns_to_end=np.asarray([r.turns_to_end for r in chunk], dtype=np.int16),
                rows_to_end=np.asarray([r.rows_to_end for r in chunk], dtype=np.int16),
                active=np.asarray([r.active for r in chunk], dtype=np.int8),
                game=np.asarray([game_index[r.game_key] for r in chunk], dtype=np.int32))
            shard_no[s] += 1

    for path in E.find_logs(logs):
        for g in E.read_games(path):
            rows = E.encode_game(g, schema, phases)
            if not rows:
                winner, _lt, labelled = E.game_outcome(g)
                skipped["unlabelled" if not labelled else "no decision rows"] += 1
                continue
            group = g.split_group
            if group_by == "match" and g.match_key():
                group = "match:" + g.match_key()
            s = split_of(group, weights, salt)
            game_index[g.game_key] = len(games)
            last_turn = max(r.turn + r.turns_to_end for r in rows)
            games.append({"index": len(games), "game_key": g.game_key, "split_group": group,
                          "split": s, "file": os.path.relpath(path), "seat": g.seat,
                          "rows": len(rows), "label": rows[0].label, "last_turn": last_turn,
                          # D316: the deck pair by name ('' when the log has no match block) and the
                          # game's own group, so a trainer can re-split by pair or hold decks out
                          "match": g.match_key(), "game_group": g.split_group})
            stats[s]["rows"] += len(rows)
            stats[s]["games"] += 1
            stats[s]["labels"][str(rows[0].label)] += 1
            for r in rows:
                stats[s]["rowLabels"][str(r.label)] += 1
            buf[s].extend(rows)
            flush(s)
    for s in SPLITS:
        flush(s, force=True)

    with open(os.path.join(out, "games.jsonl"), "w", encoding="utf-8") as f:
        for gm in games:
            f.write(json.dumps(gm) + "\n")
    groups = {s: len({gm["split_group"] for gm in games if gm["split"] == s}) for s in SPLITS}
    summary = {
        "schemaId": schema.schema_id, "nFeatures": schema.n, "vocab": vocab.sources,
        "vocabSize": len(vocab), "phases": phases, "groupBy": group_by, "split": dict(zip(SPLITS, weights)), "salt": salt,
        "rows": sum(stats[s]["rows"] for s in SPLITS), "games": len(games),
        "skippedGames": dict(skipped),
        "splits": {s: {"rows": stats[s]["rows"], "games": stats[s]["games"], "groups": groups[s],
                       "gameLabels": dict(stats[s]["labels"]), "rowLabels": dict(stats[s]["rowLabels"]),
                       "shards": shard_no[s]} for s in SPLITS},
    }
    with open(os.path.join(out, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1)
        f.write("\n")
    if not quiet:
        print(format_stats(summary))
    return summary


def format_stats(st: dict[str, Any]) -> str:
    lines = [f"dataset: {st['rows']} rows from {st['games']} games, {st['nFeatures']} features "
             f"(schema {st['schemaId']}, vocab {st['vocabSize']} slots)"]
    if st["skippedGames"]:
        lines.append(f"  skipped games: {st['skippedGames']}")
    for s, d in st["splits"].items():
        gl = d["gameLabels"]
        rl = d["rowLabels"]
        lines.append(f"  {s:5s}: {d['rows']:6d} rows, {d['games']:4d} games ({d['groups']} groups); "
                     f"games won/lost/drawn {gl.get('1', 0)}/{gl.get('-1', 0)}/{gl.get('0', 0)}; "
                     f"rows +1/-1/0 {rl.get('1', 0)}/{rl.get('-1', 0)}/{rl.get('0', 0)}")
    return "\n".join(lines)


def load(out: str, split: str) -> dict[str, Any]:
    """Every shard of one split, concatenated: X, y, turn, turns_to_end,
    rows_to_end, active, game."""
    if np is None:
        raise SystemExit("needs numpy")
    files = sorted(f for f in os.listdir(out) if f.startswith(split + "-") and f.endswith(".npz"))
    parts = [np.load(os.path.join(out, f)) for f in files]
    keys = ("X", "y", "turn", "turns_to_end", "rows_to_end", "active", "game")
    if not parts:
        with open(os.path.join(out, "features.json"), encoding="utf-8") as f:
            n = json.load(f)["nFeatures"]
        return {k: (np.zeros((0, n), np.int16) if k == "X" else np.zeros(0, np.int32)) for k in keys}
    return {k: np.concatenate([p[k] for p in parts]) for k in keys}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("logs", nargs="+")
    ap.add_argument("--vocab", action="append", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--split", default="80,10,10", help="train,val,test weights")
    ap.add_argument("--salt", default="")
    ap.add_argument("--shard-rows", type=int, default=100_000)
    ap.add_argument("--phases", default="main,combat")
    ap.add_argument("--group-by", choices=("game", "match"), default="match",
                    help="match (default since D316): every game of one deck pair in one split -- the "
                         "test split is decks the model never saw; game: only the chairs of one "
                         "seed+match together (a log with no match block always groups by game)")
    a = ap.parse_args(argv)
    w = tuple(int(x) for x in a.split.split(","))
    if len(w) != 3 or sum(w) <= 0:
        ap.error("--split takes three weights")
    build(a.logs, a.vocab, a.out, w, a.salt, a.shard_rows, E.parse_phases(a.phases), group_by=a.group_by)
    return 0


if __name__ == "__main__":
    sys.exit(main())
