#!/usr/bin/env python3
# mtg-table — tools/ml: decision records -> a policy dataset (state, legal options, choice, search values).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The policy targets an AI seat's recordings carry (D347): one row per decision record.

    python3 tools/ml/policy_data.py --run-dir var/cubelab/runs/X [--run-dir ...] [--out DIR]
    python3 tools/ml/policy_data.py --vocab cubes/synergy-cube-180.md --out DIR LOGDIR...
        [--kinds priority,attack,block,target,choice,mulligan] [--searched-only]
        [--split 80,10,10] [--salt ""] [--group-by match|game] [--shard-rows 50000]
        [--keep-reserved] [--ver ID,...] [--human DIR]... [--train-human]

A recording made by the cube lab or ai-bench with D347's recorder holds, in each
seat's own log, a `dir:"ai"` `decision` line for every decision that seat took:
the legal options as tokens (`pass`, `cast:<id>`, `attack:<ids>`, ...), the
option chosen, the policy that chose it (forge, outlets, search), the `state`
frame it was taken in and, when the search decided, the search's statistics per
option (playouts, mean leaf score, win estimate).  This tool turns them into:

    features.json            the state layout (encode.py's Schema; the evaluator's features)
    <split>-NNNNN.npz        X int16 [rows, nFeatures]: the decision's state, encoded for the deciding seat;
                             game int32 (games.jsonl), label int8 (the game's outcome for that seat)
    <split>-NNNNN.jsonl      one target per row, the same order: kind, options, chosen, chosenIndex,
                             by, complete, hidden, atoms, parent, source, turn, phase, and `search`
                             ({tokens, n, meanLeaf, win, prior, generated, rounds, playouts, overrode, timedOut, fallback}) or null
    games.jsonl              every game: split, source, ver, seat, policy, profile, decisions, label, file
    stats.json               rows per split, kind and policy; searched rows; what was dropped and why

The split is dataset.py's (D305/D317): by deck pair (`--group-by match`, the
default), a hash of the group, so both chairs of a game and every game of one
pair share a split.  D340 and D341 hold here as in dataset.py: a game played
with an AI-ladder dev/confirm deck is dropped, card for card (reserved.py; a
bench recording's two decks are read from the pairs file its header names), and
so is a lab game whose draft seed is in the reserved range; `--ver` keeps only
some lab versions and every game carries its `ver`.

SOURCES.  Every game is tagged `source`: `lab` (a cube-lab recording), `bench`
(ai-bench), `human` (a log under a `--human` directory -- by default
`var/ml/human/`, where Justin's own games go: ForgeCoach's saved games and the
bridge's `var/games/<id>/frames.jsonl`) or `other`.  Human games are never
trained on by default: their rows (if any) go to the `human` split, which
train_eval.py reads with `--eval-human`.  A human seat's log carries no
decision records (only an AI seat writes them), so today a human game gives the
policy dataset no rows and is counted; dataset.py gives it value rows.

Needs numpy for the shards (`--jsonl-only` writes the targets alone, standard library).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from typing import Any, Iterator

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import reserved as R  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

SPLITS = ("train", "val", "test")
KINDS = ("priority", "attack", "block", "target", "choice", "mulligan")
RESERVED_SEED_MIN = 900_000_000  # tools/cubelab/seeds.ts (D340)
DEFAULT_HUMAN = os.path.join("var", "ml", "human")


def split_of(group: str, weights: tuple[int, int, int], salt: str = "") -> str:
    import dataset as D  # the one split rule
    return D.split_of(group, weights, salt)


# ---------------------------------------------------------------- reading

class PolicyGame:
    """One game of a log: its header, every line after it (frames[] as ForgeCoach
    and the grader index them), and the s2c view encode.py reads."""

    def __init__(self, path: str, header: dict[str, Any], frames: list[dict[str, Any]], index: int):
        self.path, self.header, self.frames, self.index = path, header, frames, index
        self.game = E.Game(path, header, [f for f in frames if f.get("dir", "s2c") == "s2c"], index)

    @property
    def seat(self) -> int:
        return self.game.seat

    def decisions(self) -> list[dict[str, Any]]:
        return [f for f in self.frames if f.get("dir") == "ai" and f.get("type") == "decision"]

    def seat_info(self) -> dict[str, Any]:
        for s in self.header.get("seats") or []:
            if s.get("player") == self.seat:
                return s
        return {}


def read_policy_games(path: str) -> Iterator[PolicyGame]:
    """Every game in a log, every line kept (a torn last line or gzip is read up to the cut)."""
    header: dict[str, Any] | None = None
    frames: list[dict[str, Any]] = []
    idx = 0
    for line in E._lines(path):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("kind") == "session":
            if header is not None:
                yield PolicyGame(path, header, frames, idx)
                idx += 1
            header, frames = obj, []
            continue
        if header is not None:
            frames.append(obj)
    if header is not None:
        yield PolicyGame(path, header, frames, idx)


def source_of(path: str, header: dict[str, Any], human_dirs: list[str]) -> str:
    """human | lab | bench | other (a stable tag every game carries)."""
    p = os.path.realpath(path)
    for d in human_dirs:
        d = os.path.realpath(d)
        if p == d or p.startswith(d + os.sep):
            return "human"
    if isinstance(header.get("lab"), dict):
        return "lab"
    if isinstance(header.get("bench"), dict):
        return "bench"
    return "other"


def bench_decks(header: dict[str, Any], repo: str) -> list[dict[str, int]]:
    """Both main decks of an ai-bench game, from the pairs file and pair index its header names."""
    b = header.get("bench") or {}
    pf, pi = b.get("pairs"), b.get("pair")
    if not pf or not isinstance(pi, int):
        return []
    for cand in (pf, os.path.join(repo, pf)):
        if os.path.exists(cand):
            pf = cand
            break
    else:
        return []
    rows = []
    with open(pf, encoding="utf-8") as fh:
        for line in fh:
            body = line.split("#")[0].split()
            if len(body) >= 2:
                rows.append(body[:2])
    if pi >= len(rows):
        return []
    out = []
    for p in rows[pi]:
        for cand in (p, os.path.join(repo, p)):
            if os.path.exists(cand):
                with open(cand, encoding="utf-8") as fh:
                    out.append(R.dck_main(fh.read()))
                break
    return out


def game_meta(pg: PolicyGame, repo: str, human_dirs: list[str]) -> dict[str, Any]:
    """What the filters read: source, version, decks (for D340), the draft seed."""
    h = pg.header
    decks, ver = R.game_decks(pg.path, pg.game.hello, repo)
    lab = h.get("lab") or {}
    bench = h.get("bench") or {}
    if ver == "unversioned":
        ver = lab.get("ver") or bench.get("ver") or "unversioned"
    if bench:
        decks = decks + bench_decks(h, repo)
    return {"source": source_of(pg.path, h, human_dirs), "ver": ver, "decks": decks,
            "draftSeed": lab.get("draftSeed")}


# ---------------------------------------------------------------- the rows

def target_of(rec: dict[str, Any]) -> dict[str, Any]:
    b = rec.get("body") or {}
    opts = list(b.get("options") or [])
    ch = b.get("chosen")
    if isinstance(ch, list):
        idx: Any = [opts.index(t) if t in opts else -1 for t in ch]
    else:
        idx = opts.index(ch) if ch in opts else -1
    s = b.get("search")
    search = None
    if isinstance(s, dict):
        so = s.get("options") or []
        search = {"tokens": [o.get("token") for o in so], "n": [o.get("n") for o in so],
                  "meanLeaf": [o.get("meanLeaf") for o in so], "se": [o.get("se") for o in so],
                  "diff": [o.get("diff") for o in so], "seDiff": [o.get("seDiff") for o in so],
                  "win": [o.get("win") for o in so], "prior": [o.get("prior") for o in so],
                  "generated": s.get("generated"), "horizon": s.get("horizon"), "rule": s.get("rule"),
                  "margin": s.get("margin"),
                  "rounds": s.get("rounds"), "playouts": s.get("playouts"), "overrode": s.get("overrode"),
                  "timedOut": s.get("timedOut"), "fallback": s.get("fallback"), "ms": s.get("ms"),
                  "budgetMs": s.get("budgetMs")}
    return {"n": b.get("n"), "kind": b.get("kind"), "turn": b.get("turn"), "phase": b.get("phase"),
            "options": opts, "chosen": ch, "chosenIndex": idx, "by": b.get("by"),
            "complete": b.get("complete", True), "hidden": b.get("hidden", 0), "atoms": b.get("atoms") or [],
            "parent": b.get("parent"), "source": b.get("source"), "why": b.get("why"), "search": search,
            "frame": b.get("frame"), "stateSeq": b.get("stateSeq")}


def encode_decisions(pg: PolicyGame, schema: E.Schema, kinds: set[str], searched_only: bool,
                     counts: Counter) -> list[tuple[list[float], dict[str, Any]]]:
    """(the decision state's features, the target) for every decision record of
    the game, in order.  The state is the frame the record names, encoded for
    the deciding seat with the event tally up to that frame (the recorder
    flushes before each decision, so it is the latest state)."""
    seat = pg.seat
    tally = E.TurnTally()
    last_idx = -1
    cache: dict[int, list[float]] = {}
    states: dict[int, dict[str, Any]] = {}
    out = []
    for i, f in enumerate(pg.frames):
        if f.get("dir", "s2c") == "s2c" and f.get("type") == "state":
            body = f.get("body") or {}
            tally.apply(body.get("events") or [], body.get("stack"))
            last_idx = i
            states[i] = body
            continue
        if f.get("dir") != "ai" or f.get("type") != "decision":
            continue
        b = f.get("body") or {}
        if b.get("seat") != seat:
            # a record of another seat cannot be in this log (the redaction checker fails it); never read one
            counts["other seat's record (refused)"] += 1
            continue
        if b.get("kind") not in kinds or (searched_only and not b.get("search")):
            continue
        fr = b.get("frame")
        if not isinstance(fr, int) or fr not in states:
            counts["no state frame"] += 1
            continue
        if fr != last_idx:
            counts["state not the latest (tally approximate)"] += 1
        if fr not in cache:
            st = states[fr]
            if st.get("phase") is None:
                # before turn 1 (a mulligan): encode.py's one-hot spells "no phase" phase.none, which
                # it reaches from any name outside its list -- a None would look up phase.None
                st = dict(st, phase="NONE")
            cache[fr] = E.encode_state(st, seat, schema, tally)
        out.append((cache[fr], target_of(f)))
    return out


# ---------------------------------------------------------------- the build

def build(logs: list[str], vocab_paths: list[str], out: str, weights=(80, 10, 10), salt: str = "",
          shard_rows: int = 50_000, kinds: list[str] | None = None, searched_only: bool = False,
          group_by: str = "match", reserved: dict[str, str] | None = None, vers: list[str] | None = None,
          human_dirs: list[str] | None = None, train_human: bool = False, repo: str = ".",
          jsonl_only: bool = False, quiet: bool = False) -> dict[str, Any]:
    if np is None and not jsonl_only:
        raise SystemExit("policy_data.py needs numpy for the shards (pip install numpy), or --jsonl-only")
    kinds_set = set(kinds or KINDS)
    human_dirs = list(human_dirs or [])
    vocab = E.Vocab.from_files(vocab_paths)
    schema = E.Schema(vocab)
    os.makedirs(out, exist_ok=True)
    for fn in os.listdir(out):  # a rebuild replaces the shards
        if (fn.endswith(".npz") or fn.endswith(".jsonl")) and fn.split("-")[0] in SPLITS + ("human",):
            os.remove(os.path.join(out, fn))
    with open(os.path.join(out, "features.json"), "w", encoding="utf-8") as f:
        json.dump(schema.to_json(E.default_phases()), f, indent=1, ensure_ascii=False)
        f.write("\n")

    # pass 1: every game's group, source and filters -- a group is dropped whole (both chairs, D340)
    metas: list[tuple[str, int, dict[str, Any], str]] = []
    bad_groups: dict[str, str] = {}
    reserved_hits: Counter = Counter()
    for path in E.find_logs(logs):
        for pg in read_policy_games(path):
            m = game_meta(pg, repo, human_dirs)
            group = pg.game.split_group
            if group_by == "match" and pg.game.match_key():
                group = "match:" + pg.game.match_key()
            why = None
            hit = R.reserved_hit(m["decks"], reserved) if reserved else None
            if hit:
                why = "reserved deck (D340)"
                reserved_hits[hit] += 1
            elif isinstance(m["draftSeed"], int) and m["draftSeed"] >= RESERVED_SEED_MIN and reserved is not None:
                why = "reserved seed (D340)"
            if why:
                bad_groups.setdefault(group, why)
            metas.append((path, pg.index, m, group))

    skipped: Counter = Counter()
    counts: Counter = Counter()
    games: list[dict[str, Any]] = []
    bufX: dict[str, list] = {}
    bufT: dict[str, list] = {}
    bufG: dict[str, list] = {}
    bufY: dict[str, list] = {}
    shard_no: Counter = Counter()
    per: dict[str, Counter] = {}

    def flush(s: str, force: bool = False) -> None:
        while bufT.get(s) and (force or len(bufT[s]) >= shard_rows):
            n = min(shard_rows, len(bufT[s]))
            name = f"{s}-{shard_no[s]:05d}"
            with open(os.path.join(out, name + ".jsonl"), "w", encoding="utf-8") as fh:
                for t in bufT[s][:n]:
                    fh.write(json.dumps(t, separators=(",", ":")) + "\n")
            if not jsonl_only:
                X = np.asarray(bufX[s][:n], dtype=np.float64)
                if not (np.array_equal(X, np.round(X)) and np.abs(X).max(initial=0) < 32768):
                    raise ValueError("a feature is not an int16: the schema changed")
                np.savez_compressed(os.path.join(out, name + ".npz"), X=X.astype(np.int16),
                                    game=np.asarray(bufG[s][:n], dtype=np.int32),
                                    label=np.asarray(bufY[s][:n], dtype=np.int8))
            for b in (bufX, bufT, bufG, bufY):
                del b[s][:n]
            shard_no[s] += 1

    # pass 2: encode
    by_file: dict[str, list[tuple[int, dict[str, Any], str]]] = {}
    for path, idx, m, group in metas:
        by_file.setdefault(path, []).append((idx, m, group))
    for path, entries in by_file.items():
        lookup = {idx: (m, group) for idx, m, group in entries}
        for pg in read_policy_games(path):
            m, group = lookup[pg.index]
            if group in bad_groups:
                skipped[bad_groups[group]] += 1
                continue
            if vers and m["ver"] not in vers:
                skipped["other lab version (D341)"] += 1
                continue
            winner, _lt, labelled = E.game_outcome(pg.game)
            label = 0 if not labelled or winner is None else (1 if winner == pg.seat else -1)
            rows = encode_decisions(pg, schema, kinds_set, searched_only, counts)
            if not rows:
                skipped[f"no decision records ({m['source']})"] += 1
                continue
            s = "human" if m["source"] == "human" and not train_human else split_of(group, weights, salt)
            gi = len(games)
            info = pg.seat_info()
            games.append({"index": gi, "game_key": pg.game.game_key, "split_group": group, "split": s,
                          "source": m["source"], "ver": m["ver"], "file": os.path.relpath(path),
                          "seat": pg.seat, "profile": info.get("profile"), "policy": info.get("policy"),
                          "decisions": len(rows), "label": label if labelled else None,
                          "match": pg.game.match_key()})
            c = per.setdefault(s, Counter())
            c["games"] += 1
            for feats, t in rows:
                t = dict(t, game=gi, label=label)
                c["rows"] += 1
                c[f"kind:{t['kind']}"] += 1
                c[f"by:{t['by']}"] += 1
                if t["search"]:
                    c["searched"] += 1
                    if t["search"]["overrode"]:
                        c["overrode"] += 1
                if not t["complete"]:
                    c["incomplete"] += 1
                bufT.setdefault(s, []).append(t)
                bufX.setdefault(s, []).append(feats)
                bufG.setdefault(s, []).append(gi)
                bufY.setdefault(s, []).append(label)
            flush(s)
    for s in list(bufT):
        flush(s, force=True)

    with open(os.path.join(out, "games.jsonl"), "w", encoding="utf-8") as f:
        for g in games:
            f.write(json.dumps(g) + "\n")
    summary = {
        "kind": "policy", "schemaId": schema.schema_id, "nFeatures": schema.n, "vocab": vocab.sources,
        "groupBy": group_by, "split": dict(zip(SPLITS, weights)), "salt": salt, "kinds": sorted(kinds_set),
        "searchedOnly": searched_only, "rows": sum(c["rows"] for c in per.values()), "games": len(games),
        "splits": {s: dict(c) for s, c in sorted(per.items())}, "skippedGames": dict(skipped),
        "notes": dict(counts), "reservedChecked": reserved is not None, "reservedDecks": len(reserved or {}),
        "reservedHits": dict(reserved_hits), "versions": dict(Counter(g["ver"] for g in games)),
        "sources": dict(Counter(g["source"] for g in games)), "humanDirs": human_dirs,
        "humanInTraining": train_human,
    }
    with open(os.path.join(out, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1)
        f.write("\n")
    if not quiet:
        print(format_stats(summary))
    return summary


def format_stats(st: dict[str, Any]) -> str:
    lines = [f"policy dataset: {st['rows']} decision rows from {st['games']} games, {st['nFeatures']} state features "
             f"(schema {st['schemaId']}); sources {st['sources']}; versions {st['versions']}"]
    for s, c in st["splits"].items():
        kinds = ", ".join(f"{k[5:]} {v}" for k, v in sorted(c.items()) if k.startswith("kind:"))
        bys = ", ".join(f"{k[3:]} {v}" for k, v in sorted(c.items()) if k.startswith("by:"))
        lines.append(f"  {s:5s}: {c.get('rows', 0):6d} rows, {c.get('games', 0):4d} games; {kinds}; by {bys}; "
                     f"searched {c.get('searched', 0)} (overrode {c.get('overrode', 0)})")
    if st["skippedGames"]:
        lines.append(f"  skipped games: {st['skippedGames']}")
    if st["notes"]:
        lines.append(f"  notes: {st['notes']}")
    if not st["reservedChecked"]:
        lines.append("  WARNING: built with --keep-reserved: AI-ladder deck-set games may be in it (D340)")
    return "\n".join(lines)


def load(out: str, split: str) -> dict[str, Any]:
    """One split: X, game, label (numpy) and targets (a list of dicts, row-aligned)."""
    files = sorted(f[:-6] for f in os.listdir(out) if f.startswith(split + "-") and f.endswith(".jsonl"))
    targets: list[dict[str, Any]] = []
    for f in files:
        with open(os.path.join(out, f + ".jsonl"), encoding="utf-8") as fh:
            targets += [json.loads(line) for line in fh]
    res: dict[str, Any] = {"targets": targets}
    if np is not None and all(os.path.exists(os.path.join(out, f + ".npz")) for f in files) and files:
        parts = [np.load(os.path.join(out, f + ".npz")) for f in files]
        for k in ("X", "game", "label"):
            res[k] = np.concatenate([p[k] for p in parts])
    return res


def human_dirs_of(given: list[str], repo: str) -> list[str]:
    """`--human` directories, else var/ml/human/ when it exists (D347's documented place)."""
    if given:
        return given
    d = os.path.join(repo, DEFAULT_HUMAN)
    return [d] if os.path.isdir(d) else []


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("logs", nargs="*")
    ap.add_argument("--vocab", action="append")
    ap.add_argument("--out")
    ap.add_argument("--run-dir", action="append", default=[], help="a cube-lab run folder (D315)")
    ap.add_argument("--split", default="80,10,10")
    ap.add_argument("--salt", default="")
    ap.add_argument("--shard-rows", type=int, default=50_000)
    ap.add_argument("--kinds", default=",".join(KINDS))
    ap.add_argument("--searched-only", action="store_true", help="only decisions the search ran on (expert-iteration targets)")
    ap.add_argument("--group-by", choices=("game", "match"), default="match")
    ap.add_argument("--keep-reserved", action="store_true", help="keep AI-ladder dev/confirm deck games (D340; default: drop)")
    ap.add_argument("--ver", default="", help="only games of these lab or bench versions (D341)")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--human", action="append", default=[], help="a directory of the owner's own games (default var/ml/human)")
    ap.add_argument("--train-human", action="store_true", help="split human games like the rest instead of the `human` split")
    ap.add_argument("--jsonl-only", action="store_true", help="the targets alone, no numpy")
    a = ap.parse_args(argv)
    w = tuple(int(x) for x in a.split.split(","))
    if len(w) != 3 or sum(w) <= 0:
        ap.error("--split takes three weights")
    kinds = [k for k in a.kinds.split(",") if k]
    for k in kinds:
        if k not in KINDS:
            ap.error(f"--kinds: {k} is not one of {', '.join(KINDS)}")
    logs, vocab, out = list(a.logs), list(a.vocab or []), a.out
    if a.run_dir:
        run_logs, run_vocab = E.read_run_dirs(a.run_dir)
        logs += run_logs
        vocab = vocab or [run_vocab]
        out = out or os.path.join(a.run_dir[0], "policy")
    humans = human_dirs_of(a.human, a.repo)
    logs += [d for d in humans if d not in logs]
    if not logs:
        ap.error("no frame logs")
    if not vocab or not out:
        ap.error("--vocab and --out are required without --run-dir")
    build(logs, vocab, out, w, a.salt, a.shard_rows, kinds, a.searched_only, a.group_by,
          None if a.keep_reserved else R.reserved_decks(a.repo), [v for v in a.ver.split(",") if v] or None,
          humans, a.train_human, a.repo, a.jsonl_only)
    return 0


if __name__ == "__main__":
    sys.exit(main())
