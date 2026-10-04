#!/usr/bin/env python3
# mtg-table — tools/ml: the evaluator scored on the owner's own games, the human test set (D369).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""How good is the evaluator's win chance on HUMAN games?  Scores a model (or
several, and their mean) on `var/ml/human/` -- the owner's own games against
Forge's AI, collected by human_collect.py, never trained on (D347) -- beside
D305's baselines.

    python3 tools/ml/human_eval.py                                   # the served model, its training data's baselines
    python3 tools/ml/human_eval.py --model var/ml/models/night-1-eval.json --baselines var/ml/data/night-1
        [--model B.json ...]                # several: each is scored, and their mean P is `eval` (an ensemble)
        [--human DIR] [--report out.json] [--resamples 2000]

THE ROWS are D305's decision rows (encode.py's `encode_game`, as dataset.py
builds them) from the viewing seat of each human game -- the human's own seat.
Each model encodes them with its own vocabulary; with several models only the
rows every one of them has are scored (normally all).

THE MODELS.  `eval` is the model (or the mean of the models' P(win)); beside it
the baselines `prior` (the training win rate), `life` (logistic on the life
difference) and `core` (D305's twelve-number logistic), fitted exactly as
train_eval.py fits them (`fit_baselines`), on the TRAINING split of the dataset
the model was trained on (`--baselines DATA`; by default the dataset the
model's `training.data` names, looked up in this checkout and the lab clone).
Without that dataset there is only `coin` (p = 0.5), and the report says so.

THE NUMBERS (train_eval.metrics, the same code the training report uses):
log-loss, Brier, accuracy on decided games, ECE and a ten-bin reliability
table, overall and by turn bucket (1-4, 5-8, 9-12, 13-16, 17+); and for every
baseline, log-loss(baseline) - log-loss(eval) with a 95% percentile interval
from resampling whole GAMES (outside_exam.grouped_bootstrap_many: rows of one
game are not independent, so the interval is over games), overall and per
bucket.  Positive means the evaluator is better.

FEW GAMES.  Under 30 games the report is labelled DESCRIPTIVE ONLY: the numbers
are printed and no conclusion is drawn from them.

THE PRE-REGISTERED FIRST CHECK (D369, FIRST_CHECK below), printed on every run:
on the FIRST 30 human games by start time (the manifest's order; a later game
never changes it), log-loss(core) - log-loss(eval) for the evaluator play.sh
serves, with its 95% interval over games (2,000 resamples, seed 20261004).
The interval above 0: the evaluator beats core on human games; below 0: it is
worse than core on them; across 0: no difference detectable at 30 games.  It is
read once, recorded as an amendment to D369, and not re-read on more games.

Needs numpy (evalnet, train_eval).  Reads files only; never starts the engine.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402
import human_collect as HC  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

REPO = HC.REPO
DEFAULT_MODEL = os.path.join("var", "ml", "models", "night-1-eval.json")   # eval-runner.mjs's DEFAULT_EVAL_MODEL
DESCRIPTIVE_UNDER = 30

# ---------------------------------------------------------------- the pre-registered rule (D369)

FIRST_CHECK = {
    "games": 30,                     # the first 30 human games ...
    "order": "startedAt",            # ... by the session header's start time (the manifest's order)
    "model": "the evaluator play.sh serves when the 30th game is in (eval-runner.mjs's model)",
    "baseline": "core",              # D305's twelve-number logistic, fitted on the model's training split
    "statistic": "log-loss(core) - log-loss(eval) over every decision row of those games",
    "bootstrap": 2000,               # resamples of whole games
    "ci": 0.95,
    "bootSeed": 20261004,
}


# ---------------------------------------------------------------- where things are

def lab_root(repo: str = REPO) -> str:
    """The lab runner's heavy clone (docs/guides/lab-runner.md): $MTGTABLE_LAB_ROOT, else ../lab/mtg-table
    beside this checkout (~/code/mtg-table -> ~/code/lab/mtg-table)."""
    return os.environ.get("MTGTABLE_LAB_ROOT") or os.path.abspath(os.path.join(repo, "..", "lab", "mtg-table"))


def find_file(rel: str, repo: str = REPO) -> str | None:
    """A repo-relative path in this checkout, else in the lab clone; an absolute one as it is."""
    if os.path.isabs(rel):
        return rel if os.path.exists(rel) else None
    for root in (repo, lab_root(repo)):
        p = os.path.join(root, rel)
        if os.path.exists(p):
            return p
    return None


# ---------------------------------------------------------------- the human games

def human_games(human: str) -> tuple[list[E.Game], list[str]]:
    """Every finished game under the folder, oldest first (the manifest's order, else start time), each once."""
    notes: list[str] = []
    man = HC.read_manifest(human)
    order = {g.get("file"): i for i, g in enumerate(man["games"])}
    games, seen = [], set()
    for path in E.find_logs([human]) if os.path.isdir(human) else []:
        for g in E.read_games(path):
            k = HC.key_of(g.header)
            if k in seen:
                notes.append(f"{os.path.basename(path)}: a second copy of {g.header.get('gameId')}, read once")
                continue
            _w, _t, labelled = E.game_outcome(g)
            if not labelled:
                notes.append(f"{os.path.basename(path)}: not finished, no rows")
                continue
            seen.add(k)
            games.append(g)
    games.sort(key=lambda g: (order.get(os.path.basename(g.path), len(order)), str(g.header.get("startedAt") or "")))
    return games, notes


def load_model(path: str) -> tuple[dict[str, Any], Any, E.Schema]:
    import evalnet as N
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    if m.get("format") != N.FORMAT or list(m.get("cardStates") or []) != list(E.CARD_STATES):
        raise SystemExit(f"human_eval: {path} is not a D305 evaluator (an r17 model, or not train_eval.py's export)")
    schema = E.Schema(E.Vocab(list(m["vocab"])))
    if schema.schema_id != m.get("schemaId"):
        raise SystemExit(f"human_eval: {path}'s schema is {m.get('schemaId')}, encode.py computes "
                         f"{schema.schema_id} from its vocabulary -- the encoder changed since it was trained")
    return m, N.EvalNet.from_json(m), schema


def encode_rows(games: list[E.Game], schema: E.Schema) -> dict[tuple[int, int], tuple[list[float], int, int]]:
    """(game index, seq) -> (features, turn, label) for every decision row."""
    out = {}
    for gi, g in enumerate(games):
        for r in E.encode_game(g, schema):
            out[(gi, r.seq)] = (r.features, r.turn, r.label)
    return out


# ---------------------------------------------------------------- baselines

def fit_baselines(data: str, board_names: list[str], split_by: str, log) -> dict[str, Any]:
    """train_eval's prior / life / core, fitted on the model's training split of DATA (its own --split-by)."""
    import evalnet as N
    import train_eval as T
    schema = N.read_schema(data)
    if N.n_states_of(schema) != len(E.CARD_STATES):
        raise SystemExit(f"human_eval: {data} is an r17 dataset; the baselines need D305's")
    names = N.board_names(schema)
    if names != board_names:
        raise SystemExit(f"human_eval: {data}'s board columns are not the model's")
    _schema, _names, splits = T.load_data(data, split_by)
    log(f"baselines: fitted on {data} (train {len(splits['train'])} rows, val {len(splits['val'])}; split by {split_by})")
    return T.fit_baselines(splits["train"], splits["val"], names)


# ---------------------------------------------------------------- scoring

def interval_table(preds: dict[str, Any], t, groups, idx, boot: dict[str, Any]) -> dict[str, Any]:
    import outside_exam as X
    if not len(idx):
        return {}
    ll_eval = X.row_logloss(preds["eval"][idx], t[idx])
    names = [m for m in preds if m != "eval"]
    D = np.stack([X.row_logloss(preds[m][idx], t[idx]) - ll_eval for m in names], axis=1)
    return dict(zip(names, X.grouped_bootstrap_many(D, groups[idx], boot["n"], boot["seed"], boot["ci"])))


def score(preds: dict[str, Any], y, turn, groups, boot: dict[str, Any]) -> dict[str, Any]:
    import train_eval as T
    t = (y.astype(np.float64) + 1.0) / 2.0
    out: dict[str, Any] = {"rows": int(len(y)), "games": int(len(np.unique(groups))),
                           "models": {m: T.metrics(p, y, turn) for m, p in preds.items()}}
    out["minusEval"] = {"all": interval_table(preds, t, groups, np.arange(len(y)), boot)}
    for lo, hi in T.BUCKETS:
        name = f"turn {lo}-{hi}" if hi < 10_000 else f"turn {lo}+"
        out["minusEval"][name] = interval_table(preds, t, groups, np.nonzero((turn >= lo) & (turn <= hi))[0], boot)
    return out


def first_check(preds: dict[str, Any], y, groups, n_games: int, has_core: bool, model_tag: str) -> dict[str, Any]:
    R = FIRST_CHECK
    if n_games < R["games"]:
        return {"verdict": "NOT YET", "why": f"{n_games} of the {R['games']} human games it reads"}
    if not has_core:
        return {"verdict": "NOT RUN", "why": "no core baseline: pass --baselines with the model's training dataset"}
    first = np.nonzero(groups < R["games"])[0]        # games are indexed in start-time order
    t = (y.astype(np.float64) + 1.0) / 2.0
    d = interval_table({"eval": preds["eval"], "core": preds["core"]}, t, groups, first,
                       {"n": R["bootstrap"], "seed": R["bootSeed"], "ci": R["ci"]})["core"]
    what = (f"log-loss(core) - log-loss(eval) = {d['mean']:+.4f}, 95% interval over {d['groups']} games "
            f"[{d['lo']:+.4f}, {d['hi']:+.4f}], {d['rows']} rows, model {model_tag}")
    if d["lo"] > 0:
        v = "BETTER THAN CORE"
    elif d["hi"] < 0:
        v = "WORSE THAN CORE"
    else:
        v = "NO DIFFERENCE DETECTED"
    return {"verdict": v, "why": what, "delta": d}


def run(models: list[str], human: str, baselines: str | None, resamples: int = 2000, log=print,
        fitted: dict[str, Any] | None = None) -> dict[str, Any]:
    """The report.  `fitted`: baselines already fitted on `baselines` (fit_baselines), to fit them once."""
    games, notes = human_games(human)
    loaded = [(p, *load_model(p)) for p in models]
    tags = [f"{os.path.basename(p)}@{_sha12(p)}" for p in models]
    rows_by_model = [encode_rows(games, sc) for (_p, _m, _net, sc) in loaded]
    keys = sorted(set.intersection(*(set(r) for r in rows_by_model))) if rows_by_model else []
    dropped = sum(len(r) for r in rows_by_model) - len(keys) * len(rows_by_model)
    if dropped:
        notes.append(f"{dropped} rows not in every model's encoding were left out")
    rep: dict[str, Any] = {"human": os.path.abspath(human), "games": len(games), "models": tags,
                           "descriptiveOnly": len(games) < DESCRIPTIVE_UNDER, "notes": notes,
                           "firstCheckRule": FIRST_CHECK}
    import evalnet as N
    first_schema = loaded[0][3] if loaded else None
    if not keys:
        rep.update(rows=0, scores=None,
                   firstCheck=first_check({}, np.zeros(0), np.zeros(0, np.int64), len(games), False, ""))
        log(format_report(rep))
        return rep
    y = np.array([rows_by_model[0][k][2] for k in keys], np.int64)
    turn = np.array([rows_by_model[0][k][1] for k in keys], np.int64)
    groups = np.array([k[0] for k in keys], np.int64)
    preds: dict[str, Any] = {}
    member = {}
    for (p, _m, net, sc), rb in zip(loaded, rows_by_model):
        R = N.features_to_rows([rb[k][0] for k in keys], sc.card_offset, y.tolist())
        member[os.path.basename(p)] = net.predict(R)
    board = N.features_to_rows([rows_by_model[0][k][0] for k in keys], first_schema.card_offset, y.tolist())
    board.turn = turn.astype(np.int16)
    if baselines:
        split_by = (loaded[0][1].get("training") or {}).get("splitBy") or "pair"
        if fitted is None:
            fitted = fit_baselines(baselines, first_schema.names[:first_schema.card_offset], split_by, log)
        rep["baselinesSplitBy"] = split_by
        for name, f in fitted.items():
            preds[name] = np.asarray(f(board), np.float64)
        rep["baselines"] = os.path.abspath(baselines)
    else:
        preds["coin"] = np.full(len(keys), 0.5)
        rep["baselines"] = None
        notes.append("no baselines dataset (--baselines, or the model's training.data): only `coin` (p = 0.5) "
                     "is beside the evaluator, and the first check cannot be read")
    if len(member) > 1:
        for name, p in member.items():
            preds[f"m:{name}"] = p
        preds["eval"] = np.mean(np.stack(list(member.values())), axis=0)
    else:
        preds["eval"] = next(iter(member.values()))
    boot = {"n": resamples, "seed": FIRST_CHECK["bootSeed"], "ci": FIRST_CHECK["ci"]}
    rep["rows"] = int(len(keys))
    rep["results"] = {"win": int(sum(1 for g in games if _won(g) == 1)), "loss": int(sum(1 for g in games if _won(g) == -1)),
                      "draw": int(sum(1 for g in games if _won(g) == 0))}
    rep["scores"] = score(preds, y, turn, groups, boot)
    rep["firstCheck"] = first_check(preds, y, groups, len(games), "core" in preds, " + ".join(tags))
    log(format_report(rep))
    return rep


def _sha12(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:12]


def _won(g: E.Game) -> int:
    w, _t, _l = E.game_outcome(g)
    return 0 if w is None else (1 if w == g.seat else -1)


# ---------------------------------------------------------------- the report

def _f(x: Any, fmt: str) -> str:
    return "  n/a" if x is None or x != x else format(x, fmt)


def format_report(rep: dict[str, Any]) -> str:
    n = rep["games"]
    out = [f"human test set (D347, D369): {n} game{'s' if n != 1 else ''}, {rep.get('rows', 0)} decision rows -- "
           f"{rep['human']}"]
    if rep.get("results"):
        r = rep["results"]
        out.append(f"  the human won {r['win']}, lost {r['loss']}, drew {r['draw']}")
    out.append(f"  model: {' + '.join(rep['models']) or 'none'}" + ("  (eval = the mean of their P(win))"
                                                                   if len(rep["models"]) > 1 else ""))
    out.append(f"  baselines: {rep.get('baselines') or 'none (coin only)'}")
    if rep["descriptiveOnly"]:
        out.append(f"  DESCRIPTIVE ONLY: {n} games is fewer than {DESCRIPTIVE_UNDER}; the numbers below are printed, "
                   "and no conclusion is drawn from them")
    for note in rep["notes"]:
        out.append(f"  note: {note}")
    sc = rep.get("scores")
    if sc:
        w = max(8, *(len(m) for m in sc["models"]))
        out.append(f"\n  {'model':{w}s} {'bucket':11s} {'rows':>6s} {'acc':>6s} {'logloss':>8s} {'brier':>6s} {'ece':>6s}")
        for m, res in sc["models"].items():
            for bucket, mt in res.items():
                if bucket == "reliability" or not mt.get("rows"):
                    continue
                out.append(f"  {m:{w}s} {bucket:11s} {mt['rows']:6d} {_f(mt['acc'], '6.3f')} "
                           f"{_f(mt['logloss'], '8.4f')} {_f(mt['brier'], '6.3f')} {_f(mt['ece'], '6.3f')}")
        out.append("\n  log-loss(baseline) - log-loss(eval), 95% interval over games (positive: eval is better)")
        for bucket, tab in sc["minusEval"].items():
            for m, d in tab.items():
                out.append(f"    {bucket:11s} {m:{w}s} {d['mean']:+.4f}  [{d['lo']:+.4f}, {d['hi']:+.4f}]  "
                           f"{d['groups']} games, {d['rows']} rows")
        rel = sc["models"]["eval"].get("reliability") or []
        out.append("\n  reliability (eval): bin, rows, predicted, observed")
        out += [f"    {b['bin']}  {b['rows']:6d}  {b['predicted']:.3f}  {b['observed']:.3f}" for b in rel if b["rows"]]
    fc = rep.get("firstCheck") or {}
    out.append(f"\n  the pre-registered first check (D369): {fc.get('verdict')} -- {fc.get('why')}")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", action="append", default=[],
                    help=f"an evaluator (train_eval.py --out); repeat for an ensemble. Default {DEFAULT_MODEL}, "
                         "in this checkout or the lab clone ($MTGTABLE_LAB_ROOT, else ../lab/mtg-table)")
    ap.add_argument("--baselines", help="the dataset the model was trained on, for prior / life / core "
                                        "(default: the model's training.data, in this checkout or the lab clone)")
    ap.add_argument("--human", default=None, help=f"the human games (default <repo>/{HC.DEFAULT_OUT})")
    ap.add_argument("--resamples", type=int, default=FIRST_CHECK["bootstrap"])
    ap.add_argument("--report", help="write the report here (JSON)")
    a = ap.parse_args(argv)
    if np is None:
        print("human_eval: needs numpy", file=sys.stderr)
        return 2
    models = []
    for m in a.model or [DEFAULT_MODEL]:
        p = find_file(m)
        if not p:
            print(f"human_eval: no model at {m} (looked in {REPO} and {lab_root()})", file=sys.stderr)
            return 2
        models.append(p)
    base = a.baselines
    if base is None:
        with open(models[0], encoding="utf-8") as f:
            data = (json.load(f).get("training") or {}).get("data")
        base = find_file(data) if data else None
    elif not os.path.isdir(base):
        print(f"human_eval: --baselines {base} is not a dataset folder", file=sys.stderr)
        return 2
    rep = run(models, a.human or os.path.join(REPO, HC.DEFAULT_OUT), base, a.resamples)
    if a.report:
        os.makedirs(os.path.dirname(os.path.abspath(a.report)) or ".", exist_ok=True)
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1, default=float)
    return 0


if __name__ == "__main__":
    sys.exit(main())
