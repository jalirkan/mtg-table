#!/usr/bin/env python3
# mtg-table — tools/ml: gate 1 of the evaluator, the held-out fit (D352).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Gate 1 (D352): does the trained evaluator fit held-out drafts better than
the baselines it would replace?  Prints PASS or FAIL against the pre-registered
rule in gates.FIT_RULE; no flag loosens it.

    # 1. the held-out logs for the leaf comparison (the model's own test split)
    python3 tools/ml/gate_fit.py heldout DATA --model M.json --out var/ml/gates/fit/heldout.txt
    # 2. Java: rebuild every turn's last state of those logs; score it with the
    #    hand leaf and with the model on the rebuilt game (no game is played)
    tools/ml/leaf-rows.sh --list var/ml/gates/fit/heldout.txt --model M.json --out var/ml/gates/fit/leaf-rows.jsonl
    # 3. the verdict
    python3 tools/ml/gate_fit.py score DATA --model M.json --leaf-rows var/ml/gates/fit/leaf-rows.jsonl \\
        [--leaf-scale var/coach-grade/leaf-scale.json | 500] --report var/ml/gates/fit/report.json

THE RULE (all of it, on the model's TEST split -- by deck pair, D317 -- of a
dataset built with D340's reserved decks dropped):

  A. decision rows: log-loss(core) - log-loss(eval) > 0, the 95% percentile
     bootstrap interval over deck pairs (2000 resamples) above 0 -- `core` is
     D305's twelve-number logistic, fitted on the same training rows;
  B. turn-end positions (where a live-horizon playout stops), rebuilt in Java
     from the held-out logs: log-loss(sigma(leaf / scale)) - log-loss(eval) > 0,
     the interval over games above 0 -- `scale` is D349's fitted one;
  C. calibration on the test decision rows: ECE <= 0.03, and every reliability
     bin with >= 200 rows within +-0.05 of its observed rate;
  D. power: >= 50 held-out deck pairs and >= 2000 turn-end positions, else FAIL
     (underpowered) -- never a PASS on too little data.

PASS needs A, B, C and D.  The report also gives Brier, the leaf-like subset
(turn-end positions) for both models, and the reliability tables.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402

EPS = 1e-7


def _ll(p: float, t: float) -> float:
    p = min(1 - EPS, max(EPS, p))
    return -(t * math.log(p) + (1 - t) * math.log(1 - p))


# ---------------------------------------------------------------- step 1: the held-out logs

def cmd_heldout(a) -> int:
    tr = G.model_training(a.model)
    data = a.data or tr["data"]
    h = G.heldout(data, tr["splitBy"])
    files = sorted(h["files"])
    cap = G.FIT_RULE["maxLeafFiles"]
    if len(files) > cap:   # evenly spaced, deterministic (sorted by path: both chairs mostly together)
        files = [files[(i * len(files)) // cap] for i in range(cap)]
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        for p in files:
            f.write(p + "\n")
    print(json.dumps({"testPairs": len(h["pairs"]), "testLogs": len(h["files"]), "listed": len(files), "out": a.out}))
    return 0


# ---------------------------------------------------------------- step 3: the verdict

def leaf_scale(spec: str | None, repo: str = ".") -> tuple[float, str]:
    """D349's fitted scale: a number, a fit-scale JSON, or var/coach-grade/leaf-scale.json when present, else 500."""
    if spec and spec.replace(".", "", 1).isdigit():
        return float(spec), "flag"
    path = spec or os.path.join(repo, "var/coach-grade/leaf-scale.json")
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            return float(json.load(f)["scale"]), path
    if spec:
        raise SystemExit(f"gate_fit: no leaf scale at {spec}")
    return 500.0, "SearchPolicy.LEAF_SCALE (no fitted file)"


def leaf_comparison(rows: list[dict[str, Any]], test_files: dict[str, str], scale: float, boots: int) -> dict[str, Any]:
    """B: the turn-end positions of held-out logs only (a row of any other log is dropped and counted)."""
    norm = {os.path.normpath(k): v for k, v in test_files.items()}
    by_game: dict[str, list[float]] = {}
    kept = dropped = 0
    sl = se = bl = be = 0.0
    for r in rows:
        f = os.path.normpath(r.get("file", ""))
        if f not in norm or r.get("eval") is None or r.get("won") not in (0, 1):
            dropped += 1
            continue
        t = float(r["won"])
        pl = G.sigmoid(float(r["leaf"]) / scale)
        pe = float(r["eval"])
        dl, de = _ll(pl, t), _ll(pe, t)
        game = os.path.dirname(f) + "|" + norm[f]   # a game's two chairs share a folder (games/<seed>/)
        g = by_game.setdefault(game, [0.0, 0.0])
        g[0] += dl - de
        g[1] += 1
        kept += 1
        sl += dl
        se += de
        bl += (pl - t) ** 2
        be += (pe - t) ** 2
    bs = G.bootstrap_groups([(v[0], v[1]) for v in by_game.values()], boots, 7)
    return {"positions": kept, "droppedNotHeldOut": dropped, "games": len(by_game), "scale": scale,
            "loglossLeaf": sl / kept if kept else None, "loglossEval": se / kept if kept else None,
            "brierLeaf": bl / kept if kept else None, "brierEval": be / kept if kept else None,
            "diff": bs}


def calibration(p, t) -> dict[str, Any]:
    import train_eval as T
    rel = T.reliability(p, t)
    worst = 0.0
    bad = []
    for b in rel:
        if b["rows"] >= G.FIT_RULE["binMinRows"]:
            gap = abs(b["predicted"] - b["observed"])
            worst = max(worst, gap)
            if gap > G.FIT_RULE["binTolerance"]:
                bad.append(b["bin"])
    return {"ece": T.ece(p, t), "worstBinGap": worst, "badBins": bad, "reliability": rel}


def decide(rep: dict[str, Any]) -> tuple[bool, list[str]]:
    """The rule, on a report; pure (the tests drive it with synthetic reports)."""
    R = G.FIT_RULE
    why = []
    a = rep["decisionRows"]["diffCoreMinusEval"]
    if not (a["lo"] > 0):
        why.append(f"A: core - eval log-loss {a['estimate']:.4f} [{a['lo']:.4f}, {a['hi']:.4f}] does not exclude 0 from above")
    b = rep["leafRows"]["diff"]
    if not (b["lo"] > 0):
        why.append(f"B: leaf - eval log-loss {b['estimate']:.4f} [{b['lo']:.4f}, {b['hi']:.4f}] does not exclude 0 from above")
    c = rep["calibration"]
    if not (c["ece"] <= R["eceMax"]):
        why.append(f"C: ECE {c['ece']:.4f} > {R['eceMax']}")
    if c["badBins"]:
        why.append(f"C: bins off by more than {R['binTolerance']}: {', '.join(c['badBins'])}")
    if rep["testPairs"] < R["minTestPairs"]:
        why.append(f"D: {rep['testPairs']} held-out pairs < {R['minTestPairs']} (underpowered)")
    if rep["leafRows"]["positions"] < R["minLeafPositions"]:
        why.append(f"D: {rep['leafRows']['positions']} turn-end positions < {R['minLeafPositions']} (underpowered)")
    if not rep.get("reservedChecked"):
        why.append("the dataset was built without D340's reserved-deck filter")
    return not why, why


def cmd_score(a) -> int:
    import numpy as np
    import evalnet as N
    import train_eval as T
    tr = G.model_training(a.model)
    data = a.data or tr["data"]
    if not data or not os.path.isdir(data):
        raise SystemExit(f"gate_fit: the model's dataset is not here ({data}); pass DATA")
    with open(os.path.join(data, "stats.json"), encoding="utf-8") as f:
        stats = json.load(f)
    model_json, net = N.load_model(a.model)
    schema, names, splits = T.load_data(data, tr["splitBy"])
    if model_json.get("schemaId") != schema["schemaId"]:
        raise SystemExit("gate_fit: the model's schema is not the dataset's")
    trn, va, te = splits["train"], splits["val"], splits["test"]
    base = T.fit_baselines(trn, va, names)
    pe = net.predict(te)
    pc = base["core"](te)
    t = te.t
    games = T.read_games(data)
    # A: per-row log-loss differences, grouped by deck pair
    d = -(t * np.log(np.clip(pc, EPS, 1 - EPS)) + (1 - t) * np.log(np.clip(1 - pc, EPS, 1 - EPS))) \
        + (t * np.log(np.clip(pe, EPS, 1 - EPS)) + (1 - t) * np.log(np.clip(1 - pe, EPS, 1 - EPS)))
    groups: dict[str, list[float]] = {}
    for gi, di in zip(te.game.tolist(), d.tolist()):
        g = groups.setdefault(T.pair_key(games[gi]), [0.0, 0.0])
        g[0] += di
        g[1] += 1
    diff = G.bootstrap_groups([(v[0], v[1]) for v in groups.values()], G.FIT_RULE["bootstrap"], 11)
    scale, scale_src = leaf_scale(a.leaf_scale)
    h = G.heldout(data, tr["splitBy"])
    rows = G.read_jsonl(a.leaf_rows)
    rep: dict[str, Any] = {
        "gate": "fit", "rule": G.FIT_RULE, "model": a.model, "modelSha12": tr["sha12"], "data": data,
        "splitBy": tr["splitBy"], "reservedChecked": bool(stats.get("reservedChecked")),
        "versions": stats.get("versions"), "testPairs": len(groups), "testRows": len(te),
        "decisionRows": {"loglossEval": T.logloss(pe, t), "loglossCore": T.logloss(pc, t),
                         "brierEval": float(((pe - t) ** 2).mean()), "brierCore": float(((pc - t) ** 2).mean()),
                         "diffCoreMinusEval": diff},
        "leafRows": leaf_comparison(rows, h["files"], scale, G.FIT_RULE["bootstrap"]) | {"scaleSource": scale_src},
        "calibration": calibration(pe, t),
    }
    ok, why = decide(rep)
    rep["pass"] = ok
    rep["reasons"] = why
    if a.report:
        G.write_json(a.report, rep)
    dr, lr, c = rep["decisionRows"], rep["leafRows"], rep["calibration"]
    print(f"test split ({tr['splitBy']}): {len(te)} rows, {len(groups)} deck pairs; reserved decks dropped: {rep['reservedChecked']}")
    print(f"A  decision rows: eval {dr['loglossEval']:.4f}  core {dr['loglossCore']:.4f}  core-eval "
          f"{diff['estimate']:+.4f} [{diff['lo']:+.4f}, {diff['hi']:+.4f}]")
    if lr["positions"]:
        print(f"B  turn-end positions ({lr['positions']} of {lr['games']} games; scale {scale:g} from {scale_src}): "
              f"eval {lr['loglossEval']:.4f}  leaf {lr['loglossLeaf']:.4f}  leaf-eval {lr['diff']['estimate']:+.4f} "
              f"[{lr['diff']['lo']:+.4f}, {lr['diff']['hi']:+.4f}]")
    else:
        print("B  turn-end positions: none from held-out logs")
    print(f"C  calibration: ECE {c['ece']:.4f}, worst bin (>= {G.FIT_RULE['binMinRows']} rows) off by {c['worstBinGap']:.3f}")
    print(G.verdict_line("gate 1 (fit)", ok, why))
    return 0 if ok else 1


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("heldout", help="the model's held-out (test split) logs, for leaf-rows.sh")
    h.add_argument("data", nargs="?")
    h.add_argument("--model", required=True)
    h.add_argument("--out", required=True)
    s = sub.add_parser("score", help="the verdict: PASS (exit 0) or FAIL (exit 1)")
    s.add_argument("data", nargs="?")
    s.add_argument("--model", required=True)
    s.add_argument("--leaf-rows", required=True)
    s.add_argument("--leaf-scale")
    s.add_argument("--report")
    a = ap.parse_args(argv)
    return cmd_heldout(a) if a.cmd == "heldout" else cmd_score(a)


if __name__ == "__main__":
    sys.exit(main())
