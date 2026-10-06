#!/usr/bin/env python3
# mtg-table — tools/ml: the outside exam -- does the r17 evaluator, trained on Forge games, read human games? (D359)
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The outside exam (D359): score a reduced r17 evaluator, trained on OUR
Forge-vs-Forge games, on HUMAN games from 17Lands' public replay data (Arena's
Powered Cube, which shares 152 of the Vintage cube's 180 cards), against simple
rules fitted on our data only.

    python3 tools/ml/outside_exam.py --model var/ml/models/r17-vintage.json \
        --ext var/ml/17lands/rows-premier [--data var/ml/data/r17-vintage-n1] \
        [--report var/ml/reports/outside-exam.json]

THE MODELS, every one fitted on our training split (early stopping on our
validation split), never on 17Lands data:
    prior  the training win rate
    life   a logistic regression on the life difference
    board  a logistic regression on the non-land permanent difference
    core   r17's reduced core: six me-minus-opp differences (life, hand, lands,
           non-land permanents, creatures, off-vocabulary permanents), the turn,
           whose turn, the play/draw
    eval   the r17 evaluator (train_eval.py on a dataset.py --schema r17 dataset)
`--data` defaults to the dataset the model names in its `training` block, and
our split is the model's own (`training.splitBy`), so our test split is what
the model never saw.

NOTHING IS TUNED ON 17LANDS.  This script takes no setting that touches the
exam's population or its statistics: EXAM_RULE below is the pre-registered
rule (DECISIONS.md D359 states the same numbers), and the verdict is printed
against it.  17Lands' games are cut in two halves by a hash of the game id
(ext17l.HALF_SALT): `dev` is for looking at, `test` is the held-out half the
verdict reads.  Everything else this prints is reported, not gated.

THE VERDICT (EXAM_RULE).  On the primary population -- Powered Cube
PremierDraft's replay file (TradDraft's is a secondary file: reported, no
verdict), the 17Lands test half,
the user's perspective, turn >= 3, the final half-turn dropped, vocabulary
share >= 0.5 -- take the best SIMPLE rule b* (lowest log-loss among prior,
life and board on those rows).  PASS when log-loss(b*) - log-loss(eval) > 0 and
the lower end of its 95% percentile interval from a bootstrap over 17Lands
GAMES (2,000 resamples, seed 20261004) is above 0, on at least 2,000 games and
10,000 rows.  Fewer is FAIL (underpowered), never PASS.  A partial download, or
rows built with a stricter filter than the rule's, gives no verdict.

THE TRANSFER GAP.  The evaluator's advantage over b* on our own test split
minus its advantage on 17Lands, in log-loss: how much of what it learned on
Forge games is lost on human ones (and the share kept).  Reported with our
side's interval over deck pairs.

Needs numpy.
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

# ---------------------------------------------------------------- the pre-registered rule (D359)

EXAM_RULE = {
    "replay": "replay_data_public.Cube_-_Powered.PremierDraft.csv.gz",   # the verdict's file (Bo1, ~266k games)
    "half": "test",                  # ext17l.half_of: sha256("r17-exam-v1|" + game id), odd -> test
    "perspective": 0,                # the 17Lands user's rows (persp 0)
    "minShare": 0.5,                 # at least half the non-basic permanents in the vocabulary
    "minTurn": 3,                    # half-turns 3 on; the final half-turn is never a row
    "simpleRules": ("prior", "life", "board"),   # b* is the best of these on the exam's rows
    "reported": ("core",),           # compared and reported, not gating
    "bootstrap": 2000,               # resamples over 17Lands games
    "ci": 0.95,                      # two-sided percentile interval; PASS needs its lower end > 0
    "bootSeed": 20261004,
    "minGames": 2000,                # fewer games or rows on the exam's population: FAIL (underpowered)
    "minRows": 10000,
}
SECONDARY = [
    # name, half, persp (None = both), minShare -- reported, never a verdict
    ("dev half", "dev", 0, 0.5),
    ("test, share >= 0.8", "test", 0, 0.8),
    ("test, both perspectives", "test", None, 0.5),
    ("all games", None, 0, 0.5),
]


# ---------------------------------------------------------------- statistics

def row_logloss(p, t):
    p = np.clip(p, 1e-7, 1 - 1e-7)
    return -(t * np.log(p) + (1 - t) * np.log(1 - p))


def grouped_bootstrap_many(D, groups, n_boot: int, seed: int, ci: float = 0.95) -> list[dict[str, Any]]:
    """For each column of D (rows x k), the mean over rows and a percentile interval from
    resampling whole groups (games, or deck pairs) with replacement -- the SAME resamples for
    every column.  A resample's statistic is sum(w_g * S_g) / sum(w_g * n_g), w_g how often
    group g was drawn."""
    D = np.asarray(D, np.float64)
    if D.ndim == 1:
        D = D[:, None]
    k = D.shape[1]
    _u, code = np.unique(np.asarray(groups), return_inverse=True)
    G = int(code.max()) + 1 if len(code) else 0
    if not G:
        return [{"mean": float("nan"), "lo": float("nan"), "hi": float("nan"), "groups": 0, "rows": 0}
                for _ in range(k)]
    S = np.stack([np.bincount(code, weights=D[:, j], minlength=G) for j in range(k)]
                 + [np.bincount(code, minlength=G).astype(np.float64)], axis=1)      # G x (k + 1)
    rng = np.random.default_rng(seed)
    stats = np.empty((n_boot, k))
    for b in range(n_boot):
        tot = np.bincount(rng.integers(0, G, G), minlength=G) @ S
        stats[b] = tot[:k] / tot[k]
    a = (1 - ci) / 2
    q = np.quantile(stats, [a, 1 - a], axis=0)
    n = S[:, k].sum()
    return [{"mean": float(S[:, j].sum() / n), "lo": float(q[0, j]), "hi": float(q[1, j]), "groups": G,
             "rows": int(n)} for j in range(k)]


def grouped_bootstrap(d, groups, n_boot: int, seed: int, ci: float = 0.95) -> dict[str, Any]:
    """grouped_bootstrap_many for one column."""
    return grouped_bootstrap_many(np.asarray(d, np.float64)[:, None], groups, n_boot, seed, ci)[0]


def score(models: dict[str, Any], rows, groups, boot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Every model's metrics (train_eval.metrics: log-loss, Brier, accuracy, ECE, by turn bucket, reliability)
    and, with `boot`, each baseline's log-loss minus the evaluator's with its grouped interval (one set of
    resamples for all of them)."""
    import train_eval as T
    y = rows.y.astype(np.int64)
    turn = rows.turn.astype(np.int64)
    t = (y + 1.0) / 2.0
    preds = {m: f(rows) for m, f in models.items()}
    out: dict[str, Any] = {"rows": len(rows), "games": int(len(np.unique(groups))) if len(rows) else 0,
                           "models": {m: T.metrics(p, y, turn) for m, p in preds.items()}}
    if boot and len(rows):
        ll_eval = row_logloss(preds["eval"], t)
        names = [m for m in preds if m != "eval"]
        D = np.stack([row_logloss(preds[m], t) - ll_eval for m in names], axis=1)
        out["minusEval"] = dict(zip(names, grouped_bootstrap_many(D, groups, boot["n"], boot["seed"], boot["ci"])))
    return out


def verdict(primary: dict[str, Any], notes: list[str]) -> dict[str, Any]:
    """EXAM_RULE applied to the primary population's scores."""
    R = EXAM_RULE
    if not primary["rows"]:
        return {"verdict": "NO VERDICT" if notes else "FAIL", "why": "; ".join(notes) or "no rows"}
    ll = {m: primary["models"][m]["all"]["logloss"] for m in R["simpleRules"]}
    best = min(ll, key=lambda m: ll[m])
    d = primary["minusEval"][best]
    ok = d["mean"] > 0 and d["lo"] > 0
    what = (f"log-loss({best}) - log-loss(eval) = {d['mean']:+.4f}, 95% interval over games "
            f"[{d['lo']:+.4f}, {d['hi']:+.4f}]")
    out = {"bestSimpleRule": best, "delta": d}
    if notes:
        return {**out, "verdict": "NO VERDICT", "why": "; ".join(notes) + f" (for the record: {what})"}
    if primary["rows"] < R["minRows"] or primary["games"] < R["minGames"]:
        return {**out, "verdict": "FAIL", "why": f"underpowered: {primary['games']} games, {primary['rows']} rows "
                                                 f"(the rule needs {R['minGames']} and {R['minRows']}); {what}"}
    return {**out, "verdict": "PASS" if ok else "FAIL",
            "why": what + ("" if ok else " -- the interval does not sit above 0")}


# ---------------------------------------------------------------- the run

def population(share, persp, half_of_row, turn, half: str | None, p: int | None, min_share: float, min_turn: int):
    m = (share >= min_share) & (turn >= min_turn)
    if p is not None:
        m &= persp == p
    if half is not None:
        m &= half_of_row == half
    return np.nonzero(m)[0]


def run(model_path: str, ext_dir: str, data: str | None = None, log=print) -> dict[str, Any]:
    import evalnet as N
    import ext17l as X
    import train_eval as T
    R = EXAM_RULE
    m, net = N.load_model(model_path)
    training = m.get("training") or {}
    data = data or training.get("data")
    if not data:
        raise SystemExit("outside_exam: the model names no training data; pass --data")
    if len(m.get("cardStates") or []) != 2:
        raise SystemExit("outside_exam: not an r17 model (train it on a dataset.py --schema r17 dataset)")
    schema_ours = N.read_schema(data)
    schema_ext = N.read_schema(ext_dir)
    for what, sc in (("our dataset", schema_ours), ("the 17Lands rows", schema_ext)):
        if sc.get("schemaId") != m["schemaId"]:
            raise SystemExit(f"outside_exam: {what} has schema {sc.get('schemaId')}, the model {m['schemaId']} "
                             "-- one vocabulary for all three")
    split_by = training.get("splitBy") or "pair"
    notes: list[str] = []
    with open(os.path.join(ext_dir, "stats.json"), encoding="utf-8") as f:
        ext_stats = json.load(f)
    if ext_stats.get("partialDownload"):
        notes.append("the 17Lands rows come from a partial download (a sanity run)")
    if ext_stats.get("replay") != R["replay"]:
        notes.append(f"the 17Lands rows come from {ext_stats.get('replay')}, not the rule's {R['replay']} "
                     "(a secondary file: reported, no verdict)")
    if ext_stats.get("maxGames"):
        notes.append(f"the 17Lands rows stop after {ext_stats['maxGames']} games (--max-games: a sanity run)")
    if ext_stats.get("minShare", 0) > R["minShare"] or ext_stats.get("minTurn", 0) > R["minTurn"]:
        notes.append(f"the 17Lands rows were built with min share {ext_stats.get('minShare')} / min turn "
                     f"{ext_stats.get('minTurn')}, stricter than the rule's")

    # ours: the model's own split; every simple rule fitted on our training split only
    schema, names, splits = T.load_data(data, split_by)
    tr, va, te = splits["train"], splits["val"], splits["test"]
    models = T.fit_baselines(tr, va, names)
    models["eval"] = net.predict
    boot = {"n": R["bootstrap"], "seed": R["bootSeed"], "ci": R["ci"]}
    games_ours = T.read_games(data)
    te = te.take(np.nonzero(te.turn >= R["minTurn"])[0])
    pair = np.array([T.pair_key(games_ours[i]) for i in te.game.tolist()], dtype=object)
    ours = score(models, te, pair, boot)
    log(f"ours ({split_by} split, test): {ours['rows']} rows, {ours['games']} deck pairs")

    # 17Lands
    rows, share, persp, games = X.load_ext(ext_dir, N.n_states_of(schema_ext))
    half_of_game = np.array([g["half"] for g in games], dtype=object)
    half_of_row = half_of_game[rows.game] if len(rows) else np.zeros(0, dtype=object)
    turn = rows.turn.astype(np.int64)
    idx = population(share, persp, half_of_row, turn, R["half"], R["perspective"], R["minShare"], R["minTurn"])
    prim_rows = rows.take(idx)
    primary = score(models, prim_rows, prim_rows.game, boot)
    v = verdict(primary, notes)
    secondary = {}
    for name, half, p, ms in SECONDARY:
        if p is None and ext_stats.get("perspective") != "both":
            continue
        j = population(share, persp, half_of_row, turn, half, p, ms, R["minTurn"])
        sub = rows.take(j)
        secondary[name] = score(models, sub, sub.game, boot)

    # the transfer gap, against the same b*
    gap = None
    if v.get("bestSimpleRule") and ours["rows"]:
        b = v["bestSimpleRule"]
        adv_ours = ours["minusEval"][b]
        adv_17 = primary["minusEval"][b]
        gap = {"rule": b, "advantageOurs": adv_ours, "advantage17Lands": adv_17,
               "gap": adv_ours["mean"] - adv_17["mean"],
               "kept": (adv_17["mean"] / adv_ours["mean"]) if adv_ours["mean"] > 0 else None,
               "evalLoglossOurs": ours["models"]["eval"]["all"]["logloss"],
               "evalLogloss17Lands": primary["models"]["eval"]["all"]["logloss"]}
    rep = {"rule": {k: list(v_) if isinstance(v_, tuple) else v_ for k, v_ in EXAM_RULE.items()},
           "model": os.path.abspath(model_path), "modelSchemaId": m["schemaId"], "data": os.path.abspath(data),
           "splitBy": split_by, "ext": os.path.abspath(ext_dir), "extStats": ext_stats,
           "ours": ours, "primary": primary, "secondary": secondary, "verdict": v, "transferGap": gap,
           "source": ext_stats.get("source")}
    rep["peakGB"] = X.peak_gb()
    log(format_report(rep))
    return rep


def _fmt_table(title: str, sc: dict[str, Any]) -> list[str]:
    out = [f"\n{title}: {sc['rows']} rows, {sc['games']} groups",
           f"  {'model':6s} {'bucket':11s} {'rows':>7s} {'acc':>6s} {'logloss':>8s} {'brier':>6s} {'ece':>6s}"]
    for mname, res in sc["models"].items():
        for bucket, mt in res.items():
            if bucket == "reliability" or not mt.get("rows"):
                continue
            out.append(f"  {mname:6s} {bucket:11s} {mt['rows']:7d} {mt['acc']:6.3f} {mt['logloss']:8.4f} "
                       f"{mt['brier']:6.3f} {mt['ece']:6.3f}")
    for mname, d in (sc.get("minusEval") or {}).items():
        out.append(f"  log-loss({mname}) - log-loss(eval): {d['mean']:+.4f}  95% [{d['lo']:+.4f}, {d['hi']:+.4f}]")
    rel = sc["models"].get("eval", {}).get("reliability") or []
    if rel:
        out.append("  reliability (eval): bin rows predicted observed")
        out += [f"    {b['bin']}  {b['rows']:7d}  {b['predicted']:.3f}  {b['observed']:.3f}" for b in rel if b["rows"]]
    return out


def format_report(rep: dict[str, Any]) -> str:
    out = [f"outside exam (D359): model {os.path.basename(rep['model'])}, schema {rep['modelSchemaId']}",
           f"source: {rep.get('source')}"]
    out += _fmt_table("ours, test split (deck pairs)", rep["ours"])
    out += _fmt_table("17Lands, primary (test half, user, share >= 0.5, turn >= 3)", rep["primary"])
    for name, sc in rep["secondary"].items():
        out += _fmt_table(f"17Lands, secondary: {name} (reported, no verdict)", sc)
    g = rep.get("transferGap")
    if g:
        kept = "n/a" if g["kept"] is None else f"{100 * g['kept']:.0f}%"
        out.append(f"\ntransfer gap vs {g['rule']}: advantage ours {g['advantageOurs']['mean']:+.4f} "
                   f"[{g['advantageOurs']['lo']:+.4f}, {g['advantageOurs']['hi']:+.4f}], 17Lands "
                   f"{g['advantage17Lands']['mean']:+.4f}; gap {g['gap']:+.4f} (kept {kept}); eval log-loss ours "
                   f"{g['evalLoglossOurs']:.4f}, 17Lands {g['evalLogloss17Lands']:.4f}")
    v = rep["verdict"]
    out.append(f"\nverdict (EXAM_RULE, D359): {v['verdict']} -- {v['why']}")
    out.append(f"peak RSS {rep.get('peakGB')} GB")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", required=True, help="an r17 evaluator exported by train_eval.py")
    ap.add_argument("--ext", required=True, help="ext17l.py rows output (17Lands, r17 rows)")
    ap.add_argument("--data", help="our r17 dataset (default: the one the model's training block names)")
    ap.add_argument("--report", help="write the report here (JSON)")
    a = ap.parse_args(argv)
    if np is None:
        print("outside_exam: needs numpy", file=sys.stderr)
        return 2
    rep = run(a.model, a.ext, a.data)
    if a.report:
        os.makedirs(os.path.dirname(os.path.abspath(a.report)) or ".", exist_ok=True)
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
