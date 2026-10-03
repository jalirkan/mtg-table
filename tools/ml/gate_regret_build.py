#!/usr/bin/env python3
# mtg-table — tools/ml: gate 2 of the evaluator, its fixed decision set (D354).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Gate 2's decision set (D354): about 300 decisions the AI seats took in the
queue's lab games, from deck pairs the evaluator never trained on, stratified
by type, as `coach-grade.sh serve` requests in the LIVE hidden-information mode.

    # 1. candidates: every eligible decision of the held-out drafts, in a fixed
    #    hash order, up to 130 per type, as serve requests
    python3 tools/ml/gate_regret_build.py candidates --model M.json --logs var/cubelab/queue \\
        --out var/ml/gates/regret/candidates.jsonl
    # 2. (the hand ranker grades every candidate: gate_regret_grade.py)
    # 3. the set: the first 100 per type, in that order, whose hand-ranker answer is
    #    `ok` with two or more options -- a rebuild check, never a result
    python3 tools/ml/gate_regret_build.py select --candidates var/ml/gates/regret/candidates.jsonl \\
        --screen var/ml/gates/regret/rank-hand-3.jsonl --out var/ml/gates/regret/set.jsonl

ELIGIBLE (pre-registered, D354):

  * a game of a lab run folder under --logs with decision records (D347), a
    NORMAL draft (one cube: its list is the pool the player knows; bridge
    drafts are left out), both decks outside the AI ladder's reserved dev and
    confirm sets and its draft seed outside the reserved range (D340, card for
    card, both chairs);
  * its deck pair in the TEST split of the model's own split (train_eval.py's
    rule on the model's dataset: decks the evaluator never saw);
  * a decision record of kind `priority` in a main phase with a `cast:` option
    and two or more options (type `spell`), `attack` or `block` with two or more
    options;
  * at most one decision per game and type; order: sha256("gate2-v1|" + id).

Every request names the log (the deciding seat's own redacted view), the record's
state frame (`mode: review`), the type, and the run's cube list as the
opponent's POOL (`oppPool`: a plain list written beside the set; D348's pool
mode -- never the opponent's deck list).  The viewer's own deck is the header's.
Each line also carries the stratum, pair, lab version (`ver`, D341), the record's
`by` and the chosen token, for the report.  `manifest.json` stamps the inputs.
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
import gates as G  # noqa: E402

MAIN = {"MAIN1", "MAIN2", "main1", "main2"}


def stratum(rec: dict[str, Any]) -> str | None:
    kind = rec.get("kind")
    opts = rec.get("options") or []
    if len(opts) < 2:
        return None
    if kind == "priority":
        if str(rec.get("phase")) in MAIN and any(str(o).startswith("cast:") for o in opts):
            return "spell"
        return None
    if kind in ("attack", "block"):
        return kind
    return None


def run_folder(log_path: str) -> str | None:
    """A lab recording's run folder: the nearest parent holding run.json."""
    d = os.path.dirname(os.path.abspath(log_path))
    for _ in range(6):
        if os.path.isfile(os.path.join(d, "run.json")):
            return d
        d = os.path.dirname(d)
    return None


def pool_file(run_dir: str, out_dir: str, cache: dict[str, str]) -> str:
    """The run's cube list as a plain `1 Name` list (coach-grade reads lists, not cube markdown)."""
    import encode as E
    cube = os.path.join(run_dir, "cube.md")
    if not os.path.isfile(cube):
        with open(os.path.join(run_dir, "run.json"), encoding="utf-8") as f:
            cube = json.load(f).get("cubeFile") or ""
    if cube in cache:
        return cache[cube]
    with open(cube, encoding="utf-8") as f:
        names = E.parse_cube_markdown(f.read())
    sha = hashlib.sha256("\n".join(names).encode()).hexdigest()[:12]
    path = os.path.join(out_dir, "pools", f"pool-{sha}.txt")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# the cube list of {os.path.relpath(cube)} ({len(names)} cards): gate 2's opponent POOL (D348)\n")
        for n in names:
            f.write(f"1 {n}\n")
    cache[cube] = os.path.relpath(path)
    return cache[cube]


def is_bridge(header: dict[str, Any], path: str) -> bool:
    lab = header.get("lab") or {}
    return bool(lab.get("bridge")) or f"{os.sep}bridge{os.sep}" in os.path.abspath(path)


def scan(logs: list[str], test_pairs: set[str], reserved: dict[str, str] | None, out_dir: str,
         repo: str = ".", only_files: set[str] | None = None) -> tuple[list[dict[str, Any]], Counter]:
    import encode as E
    import policy_data as P
    import reserved as R
    counts: Counter = Counter()
    pools: dict[str, str] = {}
    best: dict[tuple[str, str], dict[str, Any]] = {}
    for path in E.find_logs(logs):
        if only_files is not None and os.path.normpath(os.path.relpath(path)) not in only_files:
            counts["log not in the model's test split (not read)"] += 1
            continue
        for pg in P.read_policy_games(path):
            counts["games"] += 1
            if P.source_of(path, pg.header, []) != "lab":
                counts["not a lab game"] += 1
                continue
            if is_bridge(pg.header, path):
                counts["bridge draft (left out)"] += 1
                continue
            m = P.game_meta(pg, repo, [])
            if reserved is not None and (R.reserved_hit(m["decks"], reserved)
                                         or (isinstance(m["draftSeed"], int) and m["draftSeed"] >= P.RESERVED_SEED_MIN)):
                counts["reserved deck or seed (D340)"] += 1
                continue
            pair = pg.game.match_key() or pg.game.split_group
            if pair not in test_pairs:
                counts["deck pair not held out"] += 1
                continue
            rd = run_folder(path)
            if rd is None:
                counts["no run folder"] += 1
                continue
            for f in pg.decisions():
                b = f.get("body") or {}
                if b.get("seat") != pg.seat:
                    counts["other seat's record (refused)"] += 1
                    continue
                st = stratum(b)
                if st is None or not isinstance(b.get("frame"), int):
                    continue
                counts[f"eligible {st}"] += 1
                rel = os.path.relpath(path)
                rid = hashlib.sha256(f"{rel}#{b['frame']}:{st}".encode()).hexdigest()[:16]
                c = {"id": rid, "log": rel, "frame": b["frame"], "mode": "review", "type": st,
                     "oppPool": pool_file(rd, out_dir, pools),
                     "stratum": st, "pair": pair, "game": pg.game.split_group, "seat": pg.seat, "ver": m["ver"],
                     "by": b.get("by"), "chosen": b.get("chosen"), "turn": b.get("turn"), "phase": b.get("phase"),
                     "n": b.get("n")}
                # one decision per game (both chairs) and type: the one first in the salted hash order
                key = (pg.game.split_group, st)
                old = best.get(key)
                if old is None or G.stable_order([old["id"], rid], G.REGRET_RULE["salt"])[0] == rid:
                    best[key] = c
    out = list(best.values())
    return out, counts


def cmd_candidates(a) -> int:
    import reserved as R
    tr = G.model_training(a.model)
    data = a.data or tr["data"]
    h = G.heldout(data, tr["splitBy"])
    out_dir = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(out_dir, exist_ok=True)
    reserved = None if a.keep_reserved else R.reserved_decks(a.repo)
    # only the logs the model's dataset put in its test split are read (the pair test below is the rule; this is speed)
    cands, counts = scan(a.logs, h["pairs"], reserved, out_dir, a.repo, set(h["files"]))
    rule = G.REGRET_RULE
    by_id = {c["id"]: c for c in cands}
    order = G.stable_order(by_id, rule["salt"])
    picked: list[dict[str, Any]] = []
    per: Counter = Counter()
    for k in order:
        c = by_id[k]
        if per[c["stratum"]] < rule["candidatesPerType"]:
            per[c["stratum"]] += 1
            picked.append(c)
    with open(a.out, "w", encoding="utf-8") as f:
        for c in picked:
            f.write(json.dumps(c) + "\n")
    man = {"gate": "regret", "step": "candidates", "rule": {k: v for k, v in rule.items()}, "model": a.model,
           "modelSha12": tr["sha12"], "data": data, "splitBy": tr["splitBy"], "testPairs": len(h["pairs"]),
           "logs": a.logs, "counts": dict(counts), "eligible": len(cands), "picked": dict(per),
           "candidatesSha": G.file_sha(a.out), "versions": dict(Counter(c["ver"] for c in picked)),
           "reservedChecked": reserved is not None}
    G.write_json(os.path.join(out_dir, "manifest.json"), man)
    print(json.dumps({"eligible": len(cands), "picked": dict(per), "testPairs": len(h["pairs"]), "out": a.out}))
    short = [t for t in rule["types"] if per[t] < rule["perType"]]
    if short:
        print(f"WARNING: fewer than {rule['perType']} candidates for {', '.join(short)}: the set will be smaller "
              "(gate 2 needs at least " + str(rule["minScored"]) + " scored decisions)")
    return 0


def usable(ans: dict[str, Any] | None) -> bool:
    """A ranker answer that rebuilt and has two or more options to rank."""
    if not ans or ans.get("status") != "ok":
        return False
    return len([o for o in ans.get("options") or [] if not o.get("alias")]) >= 2


def select(cands: list[dict[str, Any]], screen: dict[str, dict[str, Any]], per_type: int) -> list[dict[str, Any]]:
    """The first `per_type` of each stratum, in the candidates' order, whose screen answer is usable."""
    out, per = [], Counter()
    for c in cands:
        if per[c["stratum"]] < per_type and usable(screen.get(c["id"])):
            per[c["stratum"]] += 1
            out.append(c)
    return out


def cmd_select(a) -> int:
    cands = G.read_jsonl(a.candidates)
    screen = {x.get("id"): x for x in G.read_jsonl(a.screen)}
    missing = [c["id"] for c in cands if c["id"] not in screen]
    if missing:
        raise SystemExit(f"select: {len(missing)} candidate(s) have no screen answer yet -- finish the hand ranker first")
    chosen = select(cands, screen, G.REGRET_RULE["perType"])
    with open(a.out, "w", encoding="utf-8") as f:
        for c in chosen:
            f.write(json.dumps(c) + "\n")
    per = Counter(c["stratum"] for c in chosen)
    status = Counter(screen[c["id"]].get("status") for c in cands)
    man_path = os.path.join(os.path.dirname(os.path.abspath(a.out)), "manifest.json")
    man = json.load(open(man_path, encoding="utf-8")) if os.path.isfile(man_path) else {}
    man["select"] = {"set": a.out, "setSha": G.file_sha(a.out), "perType": dict(per), "screenStatus": dict(status),
                     "screen": a.screen}
    G.write_json(man_path, man)
    print(json.dumps({"set": len(chosen), "perType": dict(per), "screenStatus": dict(status)}))
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("candidates")
    c.add_argument("--model", required=True, help="the evaluator (its training block names its dataset and split)")
    c.add_argument("--data", help="the model's dataset, when it moved")
    c.add_argument("--logs", action="append", required=True, help="lab run folders or a queue root")
    c.add_argument("--out", required=True)
    c.add_argument("--repo", default=".")
    c.add_argument("--keep-reserved", action="store_true", help=argparse.SUPPRESS)   # tests only
    s = sub.add_parser("select")
    s.add_argument("--candidates", required=True)
    s.add_argument("--screen", required=True, help="the hand ranker's answers over every candidate")
    s.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    return cmd_candidates(a) if a.cmd == "candidates" else cmd_select(a)


if __name__ == "__main__":
    sys.exit(main())
