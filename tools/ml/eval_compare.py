#!/usr/bin/env python3
# mtg-table — tools/ml: two evaluators on the same held-out deck pairs (D364).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Is the new evaluator better than the old one on the SAME held-out pairs?  (D364.)

    python3 tools/ml/eval_compare.py DATA --model NEW.json --against OLD.json \\
        [--reference OLD_DATA] [--leaf-rows NEW_ROWS.jsonl --against-leaf-rows OLD_ROWS.jsonl] \\
        [--report compare.json]

DATA is the new model's dataset (nights 1-3), split as the new model was
(its `training.splitBy`); only its TEST split is read.  Both models must have
DATA's schema id (build DATA with `dataset.py --vocab-from OLD_DATA`), and
neither may have trained on a test pair: each model's own dataset (its
`training.data`, or --reference for the old one) is re-split as it was
trained, and a test pair of DATA that is one of its training or validation
pairs refuses the comparison.  Under train_eval.py's pair split that holds by
construction (a pair's split is a hash of the pair alone), and
split_audit.py checks it on the data.

Reported per subset of DATA's test pairs -- `all`, `reference` (the pairs
that were already test pairs in --reference: gate 1's own) and `new`, each
over PLAIN games only, and `exploring` (D358's exploring test games, apart;
`--include-exploring` puts them back) -- the rows, games, the effective
sample size (the new model's residuals' within-game correlation, as
train_eval.icc), pairs, both models' log-loss, Brier and ECE, and the paired difference
log-loss(old) - log-loss(new) with a 95% interval from 2,000 resamples of the
deck pairs (seed 20261004).  With both leaf-rows files (tools/ml/leaf-rows.sh
over the new model's held-out list, once per model), the same for gate 1's
turn-end positions, positions matched by (file, frame), resampled by game.

THE RULE (written before the run, D364; reported, not a gate): the new model
is BETTER on gate 1's pairs when, on the `reference` subset, log-loss(old) -
log-loss(new) > 0 with the interval's lower end above 0.  Otherwise "not shown
better".  Promotion is still D354's gates on the new model (gate 1 by
gate_fit.py, unchanged), then gates 2 and 3.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

COMPARE_RULE = {"subset": "reference", "boots": 2000, "seed": 20261004, "ci": 0.95,
                "better": "logloss(old) - logloss(new) > 0 with the interval's lower end > 0"}
EPS = 1e-7


def _pairs_trained_on(data: str, split_by: str) -> set:
    """The deck pairs a model trained or early-stopped on: train and val of its own split."""
    import gates as G
    import train_eval as T
    games = T.read_games(data)
    sp = G.game_splits(data, split_by)
    return {T.pair_key(g) for g, s in zip(games, sp) if s in ("train", "val")}


def _ll_rows(p, t):
    p = np.clip(p, EPS, 1 - EPS)
    return -(t * np.log(p) + (1 - t) * np.log(1 - p))


def _subset_report(mask_rows, gidx, ll_old, ll_new, p_old, p_new, t, boots, seed, game=None) -> dict[str, Any]:
    import eval_search as S
    import train_eval as T
    if not mask_rows.any():
        return {"rows": 0, "pairs": 0}
    g = gidx[mask_rows]
    keys, inv = np.unique(g, return_inverse=True)
    inv = inv.ravel()
    sums = np.stack([np.bincount(inv, weights=ll_old[mask_rows], minlength=len(keys)),
                     np.bincount(inv, weights=ll_new[mask_rows], minlength=len(keys)),
                     np.bincount(inv, weights=ll_old[mask_rows] - ll_new[mask_rows], minlength=len(keys))], axis=1)
    counts = np.bincount(inv, minlength=len(keys)).astype(np.float64)
    bs = S.pair_bootstrap(sums, counts, boots, seed)
    po, pn, tt = p_old[mask_rows], p_new[mask_rows], t[mask_rows]
    extra = {}
    if game is not None:   # D364: what the rows are worth -- games, and the within-game design effect
        gm = game[mask_rows]
        extra = {"games": int(len(np.unique(gm))), "effectiveN": T.icc(tt - pn, gm)}
    return {"rows": int(mask_rows.sum()), "pairs": int(len(keys)), **extra,
            "old": {"logloss": float(bs["estimate"][0]), "lo": float(bs["lo"][0]), "hi": float(bs["hi"][0]),
                    "brier": float(((po - tt) ** 2).mean()), "ece": T.ece(po, tt)},
            "new": {"logloss": float(bs["estimate"][1]), "lo": float(bs["lo"][1]), "hi": float(bs["hi"][1]),
                    "brier": float(((pn - tt) ** 2).mean()), "ece": T.ece(pn, tt)},
            "oldMinusNew": {"estimate": float(bs["estimate"][2]), "lo": float(bs["lo"][2]), "hi": float(bs["hi"][2])}}


def leaf_compare(new_rows: str, old_rows: str, test_files: set, boots: int, seed: int) -> dict[str, Any]:
    """Gate 1's turn-end positions scored by both models, matched by (file, frame), resampled by game."""
    import eval_search as S
    import gates as G

    def index(path):
        out = {}
        for r in G.read_jsonl(path):
            f = os.path.normpath(r.get("file", ""))
            if f in test_files and r.get("eval") is not None and r.get("won") in (0, 1):
                out[(f, r.get("frame"))] = r
        return out
    a, b = index(new_rows), index(old_rows)
    both = sorted(set(a) & set(b))
    if not both:
        return {"positions": 0}
    games = sorted({os.path.dirname(f) for f, _ in both})
    gi = {g: i for i, g in enumerate(games)}
    sums = np.zeros((len(games), 3))
    counts = np.zeros(len(games))
    for k in both:
        t = float(a[k]["won"])
        ln = _ll_rows(np.array([float(a[k]["eval"])]), t)[0]
        lo = _ll_rows(np.array([float(b[k]["eval"])]), t)[0]
        i = gi[os.path.dirname(k[0])]
        sums[i] += (lo, ln, lo - ln)
        counts[i] += 1
    bs = S.pair_bootstrap(sums, counts, boots, seed)
    return {"positions": len(both), "onlyNew": len(set(a) - set(b)), "onlyOld": len(set(b) - set(a)),
            "games": len(games), "oldLogloss": float(bs["estimate"][0]), "newLogloss": float(bs["estimate"][1]),
            "oldMinusNew": {"estimate": float(bs["estimate"][2]), "lo": float(bs["lo"][2]), "hi": float(bs["hi"][2])}}


def compare(data: str, new_model: str, old_model: str, reference: str | None = None,
            new_leaf: str | None = None, old_leaf: str | None = None, log=print,
            include_exploring: bool = False) -> dict[str, Any]:
    import evalnet as N
    import gates as G
    import train_eval as T
    new_tr, old_tr = G.model_training(new_model), G.model_training(old_model)
    split_by = new_tr["splitBy"]
    if split_by not in ("pair",) and not split_by.startswith("holdout:"):
        raise SystemExit(f"eval_compare: the new model was split by {split_by}; a comparison needs held-out pairs")
    schema = N.read_schema(data)
    for name, tr in (("new", new_tr), ("old", old_tr)):
        if tr["schemaId"] != schema["schemaId"]:
            raise SystemExit(f"eval_compare: the {name} model's schema {tr['schemaId']} is not DATA's "
                             f"{schema['schemaId']} (build DATA with dataset.py --vocab-from the old dataset)")
    games = T.read_games(data)
    sp = G.game_splits(data, split_by)
    test_pairs = {T.pair_key(g) for g, s in zip(games, sp) if s == "test"}
    leaks = {}
    for name, tr, fallback in (("new", new_tr, data), ("old", old_tr, reference)):
        src = tr["data"] if tr["data"] and os.path.isfile(os.path.join(tr["data"], "games.jsonl")) else fallback
        if not src:
            raise SystemExit(f"eval_compare: the {name} model's dataset ({tr['data']}) is not here; pass --reference")
        leaks[name] = len(test_pairs & _pairs_trained_on(src, tr["splitBy"]))
    if any(leaks.values()):
        raise SystemExit(f"eval_compare: test pairs a model trained on: {leaks} -- not a held-out comparison")
    ref_test = set()
    if reference:
        rg = T.read_games(reference)
        ref_test = {T.pair_key(g) for g, s in zip(rg, G.game_splits(reference, old_tr["splitBy"])) if s == "test"}
    sog = ["test" if s == "test" else "" for s in sp]   # read the test split only
    te = N.load_splits(data, N.card_offset_of(schema), sog, n_states=N.n_states_of(schema))["test"]
    _mo, net_old = N.load_model(old_model)
    _mn, net_new = N.load_model(new_model)
    p_old, p_new = net_old.predict(te), net_new.predict(te)
    t = te.t
    ll_old, ll_new = _ll_rows(p_old, t), _ll_rows(p_new, t)
    pk = np.array([T.pair_key(games[g]) for g in te.game.tolist()], dtype=object).astype(str)
    _u, gidx = np.unique(pk, return_inverse=True)
    gidx = gidx.ravel()
    in_ref = np.array([k in ref_test for k in pk.tolist()], bool)
    explore = np.array([bool(games[g].get("explore")) for g in te.game.tolist()], bool)
    # D364: the comparison's test set is plain games (D358's exploring games are reported apart)
    base = np.ones(len(te), bool) if include_exploring else ~explore
    R = COMPARE_RULE
    subsets = {"all": base.copy()}
    if reference:
        subsets["reference"] = base & in_ref
        subsets["new"] = base & ~in_ref
    if explore.any():
        subsets["exploring"] = explore
    rep: dict[str, Any] = {"rule": R, "data": data, "splitBy": split_by, "newModel": new_model, "oldModel": old_model,
                           "newSha12": new_tr["sha12"], "oldSha12": old_tr["sha12"], "reference": reference,
                           "testPairsTrainedOn": leaks, "exploringIncluded": include_exploring,
                           "exploringTestRows": int(explore.sum()),
                           "subsets": {k: _subset_report(m, gidx, ll_old, ll_new, p_old, p_new, t, R["boots"], R["seed"],
                                                         te.game) for k, m in subsets.items()}}
    if new_leaf and old_leaf:
        files = {os.path.normpath(g["file"]) for g, s in zip(games, sp) if s == "test"}
        rep["leafRows"] = leaf_compare(new_leaf, old_leaf, files, R["boots"], R["seed"])
    ref = rep["subsets"].get("reference")
    if ref and ref.get("rows"):
        d = ref["oldMinusNew"]
        rep["better"] = bool(d["estimate"] > 0 and d["lo"] > 0)
    else:
        rep["better"] = None
    for k, s in rep["subsets"].items():
        if not s.get("rows"):
            log(f"{k:9s}: no rows")
            continue
        d = s["oldMinusNew"]
        e = s.get("effectiveN") or {}
        log(f"{k:9s}: {s['rows']} rows, {s.get('games', '?')} games (effective n {e.get('nEff', float('nan')):.0f}), "
            f"{s['pairs']} pairs; old {s['old']['logloss']:.4f} new {s['new']['logloss']:.4f}; "
            f"old - new {d['estimate']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}]; ECE old {s['old']['ece']:.4f} "
            f"new {s['new']['ece']:.4f}")
    if "leafRows" in rep and rep["leafRows"].get("positions"):
        lr = rep["leafRows"]
        d = lr["oldMinusNew"]
        log(f"turn-end : {lr['positions']} positions, {lr['games']} games; old {lr['oldLogloss']:.4f} "
            f"new {lr['newLogloss']:.4f}; old - new {d['estimate']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}]")
    if rep["better"] is None:
        log("compare: no reference subset (pass --reference): no verdict")
    else:
        log("compare: the new model is " + ("BETTER" if rep["better"] else "not shown better")
            + " than the old one on gate 1's test pairs (D364's rule)")
    return rep


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("data")
    ap.add_argument("--model", required=True, help="the new model")
    ap.add_argument("--against", required=True, help="the old model")
    ap.add_argument("--reference", help="the old model's dataset (gate 1's), whose test pairs are the `reference` subset")
    ap.add_argument("--leaf-rows", help="leaf-rows.sh's rows scored by the new model")
    ap.add_argument("--against-leaf-rows", help="the same positions scored by the old model")
    ap.add_argument("--include-exploring", action="store_true",
                    help="count D358's exploring test games in the subsets (default: plain games only; the "
                         "exploring ones are the `exploring` subset)")
    ap.add_argument("--report")
    a = ap.parse_args(argv)
    if np is None:
        print("eval_compare: needs numpy", file=sys.stderr)
        return 2
    rep = compare(a.data, a.model, a.against, a.reference, a.leaf_rows, a.against_leaf_rows,
                  include_exploring=a.include_exploring)
    if a.report:
        import gates as G
        G.write_json(a.report, rep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
