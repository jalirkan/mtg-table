#!/usr/bin/env python3
# mtg-table — tools/ml: a "human" recalibration of the win chance on 17Lands' human games (D415).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Recalibrate the r17 evaluator's win chance on HUMAN games (17Lands' Powered
Cube replays, D359's rows) and test the recalibration on held-out human games,
by a rule written down before its run (CALIB_RULE, D415).

    python3 tools/ml/human_calib.py --model var/ml/models/r17-vintage-n1.json \
        --ext var/ml/17lands/b3-rows-premier [--data var/ml/data/r17-vintage-n1] \
        [--trad var/ml/17lands/b3-rows-trad] --report var/ml/reports/b3-calib.json \
        --params var/ml/reports/b3-human-calibration.json

WHY r17 AND NOT v2.  17Lands records one snapshot at the END of each
half-turn: turn, play/draw, both life totals, both hand sizes (the user's hand
as cards), each battlefield as Arena ids, and per-half-turn events (lands
played, spells cast, attackers, blockers, kills, mana spent).  v2 (D364) reads
12,670 numbers made from a full decision state: P/T and twelve keywords per
side, tapped state, counters, damage, graveyards and exile by card, the stack,
combat and the mana pool, at the viewer's priority in a main phase or combat.
Most of those are absent (P/T, keywords, counters, exile, the stack), some
can only be guessed (tapped lands from mana spent, graveyards from cast and
killed events, library sizes), and every off-cube card falls in `<other>`,
a column constant in training.  D359 already rejected scoring a full model on
masked inputs; a calibration fitted to them would calibrate the mask, not
the number the coach shows.  So this reads the r17 model J063 examined,
frozen, and nothing is retrained.

THE TRANSFORM.  p' = sigmoid(a + b * logit(p)) (Platt scaling).  `a`, `b` are
fitted by maximum likelihood on the CALIBRATION half of the 17Lands games
(ext17l.half_of's `dev`) and judged on the held-out `test` half.  The halves
are D359's, by a hash of the game id, so no game is in both.

BOTH PERSPECTIVES.  17Lands' users are a strong, self-selected population
(54% of the games won), so a fit on the user's rows alone would put that skill
into the intercept, which is no property of the position.  The primary
population therefore holds every position twice, from each side, labels
opposite (ext17l --perspective both): the skill shift cancels, and `a` is left
to say only how far the model is from symmetric.  The bootstrap resamples whole
games, so a position's two rows are always drawn together.  The user's rows
alone are a secondary table (their intercept is the skill shift).

RELATIVE TO FORGE.  The r17 model is itself over-confident on Forge's own
held-out games (J063: "0.957" was 0.895), while v1 and v2 are calibrated there
(D354 gate 1: ECE 0.006).  So the human slope b_h mixes two things: r17's own
miscalibration and the difference between human and Forge games.  With --data
the same Platt fit is made on our r17 dataset's validation split (b_f, a_f;
never the test split), and the report gives the RELATIVE transform, the one a
model calibrated on Forge's games would need on human ones:
    slope b_h / b_f, intercept a_h - b_h * a_f / b_f
(applied after Forge's calibration, it composes to the absolute transform
exactly).  Its 95% interval comes from independent bootstraps of the two fits
(17Lands games; our deck pairs).

THE VERDICT (CALIB_RULE).  On the primary population -- PremierDraft's file,
the test half, both perspectives, turn >= 3, the final half-turn dropped,
vocabulary share >= 0.5 -- with the evaluator frozen:
  PASS when log-loss(uncalibrated) - log-loss(global Platt) > 0 and the lower
  end of its 95% percentile interval (2,000 resamples over test games, seed
  20261008) is above 0, on at least 2,000 games and 10,000 rows.  Fewer is
  FAIL (underpowered), never PASS.  Rows from a partial download, a
  --max-games sample, another file, one perspective or a stricter filter give
  NO VERDICT.
Then, written down with it:
  * FORM: per-turn-band Platt is the recommended form only when
    log-loss(global) - log-loss(bands) has its 95% interval above 0 on the
    same rows; else global.
  * COACH USE: the params file recommends the relative transform for a
    Forge-calibrated model (v1/v2 in ForgeCoach) only on a PASS, with a
    usable Forge-side fit (>= 2,000 rows and 20 deck pairs, both slopes
    positive), and when the relative slope's 95% interval excludes 1;
    otherwise "none" (the human effect is not told apart from r17's own
    miscalibration).
Everything else (ECE with its interval, Brier, the turn bands, the simple
rules, TradDraft, the user's rows) is reported, not gated.

SIMPLE RULES (descriptive).  Logistic regressions fitted on the same
calibration half: life difference, hand-size difference, non-land permanent
difference, and the three together; and the prior (0.5 on both perspectives).

Needs numpy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from typing import Any, Callable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

# ---------------------------------------------------------------- the pre-registered rule (D415)

CALIB_RULE = {
    "replay": "replay_data_public.Cube_-_Powered.PremierDraft.csv.gz",
    "fitHalf": "dev",                 # ext17l.half_of: the calibration half
    "testHalf": "test",               # the held-out half the verdict reads
    "perspective": "both",            # both sides of every position (the skill shift cancels)
    "minShare": 0.5,
    "minTurn": 3,
    "transform": "p' = sigmoid(intercept + slope * logit(p))",
    "primary": "global",              # one (intercept, slope) for every turn
    "bands": [[3, 4], [5, 8], [9, 12], [13, 16], [17, None]],   # train_eval.BUCKETS from turn 3
    "bootstrap": 2000,
    "ci": 0.95,
    "bootSeed": 20261008,
    "minGames": 2000,
    "minRows": 10000,
    "eceBins": 10,
    "forgeMinRows": 2000,             # the Forge-side fit (our val split) is used only with this many rows
    "forgeMinPairs": 20,              # ... and deck pairs, and both slopes positive
}
EPS = 1e-7
FORMAT = "mtgtable-winchance-calibration"


# ---------------------------------------------------------------- statistics

def logit(p):
    p = np.clip(np.asarray(p, np.float64), EPS, 1 - EPS)
    return np.log(p) - np.log1p(-p)


def sigmoid(z):
    z = np.asarray(z, np.float64)
    return 0.5 * (1.0 + np.tanh(0.5 * z))


def fit_logistic(X, t, w=None, l2: float = 1e-6, iters: int = 100, tol: float = 1e-10):
    """Weighted logistic regression by Newton's method: coefficients for the columns of X (add a
    column of ones for an intercept).  `l2` is a tiny ridge for a separable or empty fit."""
    X = np.asarray(X, np.float64)
    t = np.asarray(t, np.float64)
    w = np.ones(len(t)) if w is None else np.asarray(w, np.float64)
    beta = np.zeros(X.shape[1])
    sw = max(w.sum(), 1e-12)
    for _ in range(iters):
        p = sigmoid(X @ beta)
        g = X.T @ (w * (p - t)) / sw + l2 * beta
        H = (X * (w * p * (1 - p))[:, None]).T @ X / sw + l2 * np.eye(X.shape[1])
        step = np.linalg.solve(H, g)
        beta -= step
        if np.abs(step).max() < tol:
            break
    return beta


def platt(z, t, w=None) -> tuple[float, float]:
    """(intercept, slope) of p' = sigmoid(a + b z)."""
    a, b = fit_logistic(np.stack([np.ones(len(z)), z], axis=1), t, w)
    return float(a), float(b)


def temperature(z, t, w=None) -> float:
    """The slope alone (intercept fixed at 0)."""
    return float(fit_logistic(np.asarray(z, np.float64)[:, None], t, w)[0])


def band_index(turn, bands) -> Any:
    """Each row's band (index into bands), -1 outside every band."""
    turn = np.asarray(turn, np.int64)
    out = np.full(len(turn), -1, np.int64)
    for i, (lo, hi) in enumerate(bands):
        m = (turn >= lo) & ((turn <= hi) if hi is not None else True)
        out[m] = i
    return out


def band_name(lo: int, hi: int | None) -> str:
    return f"turn {lo}+" if hi is None else f"turn {lo}-{hi}"


def row_logloss(p, t):
    p = np.clip(p, EPS, 1 - EPS)
    return -(t * np.log(p) + (1 - t) * np.log(1 - p))


def weighted_ece(p, t, w=None, bins: int = 10) -> float:
    """train_eval.ece with row weights: sum over equal-width bins of |sum w (p - t)| / sum w."""
    w = np.ones(len(p)) if w is None else w
    if not len(p) or w.sum() <= 0:
        return float("nan")
    k = np.minimum((np.asarray(p) * bins).astype(int), bins - 1)
    return float(np.abs(np.bincount(k, weights=w * (p - t), minlength=bins)).sum() / w.sum())


def boot_weights(groups, n_boot: int, seed: int):
    """(group code of each row, a generator of per-row weights): each resample draws the groups
    with replacement and a row weighs as often as its group was drawn."""
    _u, code = np.unique(np.asarray(groups), return_inverse=True)
    G = int(code.max()) + 1 if len(code) else 0
    rng = np.random.default_rng(seed)

    def gen():
        for _ in range(n_boot):
            yield np.bincount(rng.integers(0, G, G), minlength=G)[code].astype(np.float64)
    return code, G, gen


def interval(samples, ci: float) -> tuple[float, float]:
    a = (1 - ci) / 2
    s = np.asarray(samples, np.float64)
    s = s[np.isfinite(s)]
    if not len(s):
        return float("nan"), float("nan")
    lo, hi = np.quantile(s, [a, 1 - a])
    return float(lo), float(hi)


def boot_stats(stats: dict[str, Callable], groups, n_boot: int, seed: int, ci: float) -> dict[str, dict[str, Any]]:
    """Each stat(w) at w = 1 and its percentile interval over the same grouped resamples."""
    code, G, gen = boot_weights(groups, n_boot, seed)
    ones = np.ones(len(code))
    point = {k: f(ones) for k, f in stats.items()}
    draws: dict[str, list[float]] = {k: [] for k in stats}
    for w in gen():
        for k, f in stats.items():
            draws[k].append(f(w))
    out = {}
    for k in stats:
        lo, hi = interval(draws[k], ci)
        out[k] = {"mean": point[k], "lo": lo, "hi": hi, "groups": G, "rows": int(len(code))}
    return out


# ---------------------------------------------------------------- fits

def fit_bands(z, t, turn, bands, w=None) -> list[dict[str, Any]]:
    bi = band_index(turn, bands)
    out = []
    for i, (lo, hi) in enumerate(bands):
        m = bi == i
        n = int(m.sum())
        a, b = platt(z[m], t[m], None if w is None else w[m]) if n else (0.0, 1.0)
        out.append({"band": band_name(lo, hi), "lo": lo, "hi": hi, "rows": n, "intercept": a, "slope": b})
    return out


def apply_bands(z, turn, fitted: list[dict[str, Any]], fallback: tuple[float, float]):
    """Per-band Platt; a row outside every band (or in an empty one) gets the global fit."""
    bands = [(f["lo"], f["hi"]) for f in fitted]
    bi = band_index(turn, bands)
    a = np.full(len(z), fallback[0])
    b = np.full(len(z), fallback[1])
    for i, f in enumerate(fitted):
        if f["rows"]:
            a[bi == i] = f["intercept"]
            b[bi == i] = f["slope"]
    return sigmoid(a + b * z)


def relative(abs_h: tuple[float, float], forge: tuple[float, float]) -> tuple[float, float]:
    """The transform that, applied AFTER Forge's calibration (a_f + b_f z), gives the human one
    (a_h + b_h z): (intercept, slope) = (a_h - b_h a_f / b_f, b_h / b_f)."""
    (a_h, b_h), (a_f, b_f) = abs_h, forge
    return a_h - b_h * a_f / b_f, b_h / b_f


SIMPLE = {
    "life": ("me.life", "opp.life"),
    "hand": ("me.hand", "opp.hand"),
    "board": ("me.nonland", "opp.nonland"),
}


def simple_features(rows, names: list[str]) -> dict[str, Any]:
    cols = {}
    for k, (a, b) in SIMPLE.items():
        cols[k] = np.subtract(rows.board[:, names.index(a)], rows.board[:, names.index(b)], dtype=np.float64)
    return cols


def fit_simple(cols: dict[str, Any], t) -> dict[str, Any]:
    out = {}
    one = np.ones(len(t))
    for k in SIMPLE:
        out[k] = fit_logistic(np.stack([one, cols[k]], axis=1), t)
    out["life+hand+board"] = fit_logistic(np.stack([one] + [cols[k] for k in SIMPLE], axis=1), t)
    return out


def predict_simple(coef: dict[str, Any], cols: dict[str, Any]) -> dict[str, Any]:
    n = len(next(iter(cols.values())))
    one = np.ones(n)
    out = {k: sigmoid(np.stack([one, cols[k]], axis=1) @ coef[k]) for k in SIMPLE}
    out["life+hand+board"] = sigmoid(np.stack([one] + [cols[k] for k in SIMPLE], axis=1) @ coef["life+hand+board"])
    return out


# ---------------------------------------------------------------- the run

def _notes(ext_stats: dict[str, Any], rule_file: str) -> list[str]:
    R = CALIB_RULE
    notes = []
    if ext_stats.get("partialDownload"):
        notes.append("the 17Lands rows come from a partial download (a sanity run)")
    if ext_stats.get("maxGames"):
        notes.append(f"the 17Lands rows stop after {ext_stats['maxGames']} games (--max-games: a sanity run)")
    if ext_stats.get("replay") != rule_file:
        notes.append(f"the 17Lands rows come from {ext_stats.get('replay')}, not the rule's {rule_file}")
    if ext_stats.get("perspective") != R["perspective"]:
        notes.append(f"the rows hold perspective {ext_stats.get('perspective')!r}, the rule needs 'both'")
    if ext_stats.get("minShare", 0) > R["minShare"] or ext_stats.get("minTurn", 0) > R["minTurn"]:
        notes.append(f"the rows were built with min share {ext_stats.get('minShare')} / min turn "
                     f"{ext_stats.get('minTurn')}, stricter than the rule's")
    return notes


def verdict(rows: int, games: int, delta: dict[str, Any], notes: list[str]) -> dict[str, Any]:
    """CALIB_RULE on the primary population's log-loss difference (uncalibrated - global Platt)."""
    R = CALIB_RULE
    what = (f"log-loss(uncalibrated) - log-loss(Platt) = {delta['mean']:+.4f}, 95% interval over games "
            f"[{delta['lo']:+.4f}, {delta['hi']:+.4f}]") if rows else "no rows"
    if notes:
        return {"verdict": "NO VERDICT", "why": "; ".join(notes) + f" (for the record: {what})"}
    if rows < R["minRows"] or games < R["minGames"]:
        return {"verdict": "FAIL", "why": f"underpowered: {games} games, {rows} rows (the rule needs "
                                          f"{R['minGames']} and {R['minRows']}); {what}"}
    ok = delta["mean"] > 0 and delta["lo"] > 0
    return {"verdict": "PASS" if ok else "FAIL", "why": what + ("" if ok else " -- the interval does not sit above 0")}


def coach_use(verdict_word: str, rel: dict[str, Any] | None, forge: dict[str, Any] | None, human_slope: float,
              form: str) -> dict[str, Any]:
    """CALIB_RULE's COACH USE: "relative" only on a PASS, with a usable Forge-side fit, and a relative
    slope whose interval excludes 1; else "none", with the reason."""
    R = CALIB_RULE
    if verdict_word != "PASS":
        return {"use": "none", "why": f"the verdict is {verdict_word}"}
    if rel is None or forge is None:
        return {"use": "none", "why": "no Forge-side fit (--data): the relative transform is unknown"}
    if (forge["val"]["rows"] < R["forgeMinRows"] or forge["val"]["pairs"] < R["forgeMinPairs"]
            or forge["slope"] <= 0 or human_slope <= 0):
        return {"use": "none", "why": f"the Forge-side fit is not usable ({forge['val']['rows']} rows, "
                                      f"{forge['val']['pairs']} pairs, slope {forge['slope']:.3f}; human slope "
                                      f"{human_slope:.3f}; the rule needs {R['forgeMinRows']} rows, "
                                      f"{R['forgeMinPairs']} pairs and positive slopes)"}
    lo, hi = rel["slopeInterval"]
    if lo <= 1 <= hi:
        return {"use": "none", "why": f"the relative slope's interval [{lo:.3f}, {hi:.3f}] includes 1: the human "
                                      "effect is not told apart from r17's own miscalibration on Forge's games"}
    return {"use": "relative", "form": form,
            "why": f"PASS, and the relative slope {rel['slope']:.3f} has its interval [{lo:.3f}, {hi:.3f}] away from 1"}


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_ext_scored(ext_dir: str, net, n_states: int):
    import ext17l as X
    rows, share, persp, games = X.load_ext(ext_dir, n_states)
    half_of_game = np.array([g["half"] for g in games], dtype=object)
    half = half_of_game[rows.game] if len(rows) else np.zeros(0, dtype=object)
    p = net.predict(rows) if len(rows) else np.zeros(0)
    return rows, share, persp, half, np.asarray(p, np.float64)


def select(share, persp, half, turn, want_half: str | None, p: int | None, min_share: float, min_turn: int):
    m = (share >= min_share) & (turn >= min_turn)
    if p is not None:
        m &= persp == p
    if want_half is not None:
        m &= half == want_half
    return np.nonzero(m)[0]


def forge_fit(data: str, net, split_by: str, n_boot: int, seed: int, ci: float, log=print) -> dict[str, Any] | None:
    """The same Platt fit on OUR r17 dataset's validation split (turn >= minTurn), with an interval over
    deck pairs, and the test split's uncalibrated ECE for the record."""
    import train_eval as T
    schema, names, splits = T.load_data(data, split_by)
    games = T.read_games(data)
    out: dict[str, Any] = {"data": os.path.abspath(data), "splitBy": split_by}
    for s in ("val", "test"):
        r = splits[s]
        r = r.take(np.nonzero(r.turn >= CALIB_RULE["minTurn"])[0])
        z = logit(net.predict(r)) if len(r) else np.zeros(0)
        t = (r.y.astype(np.float64) + 1) / 2
        dec = r.y != 0
        z, t, r_game = z[dec], t[dec], r.game[dec]
        pair = np.array([T.pair_key(games[i]) for i in r_game.tolist()], dtype=object)
        out[s] = {"rows": int(len(z)), "pairs": int(len(set(pair.tolist()))),
                  "eceUncalibrated": weighted_ece(sigmoid(z), t) if len(z) else None,
                  "loglossUncalibrated": float(row_logloss(sigmoid(z), t).mean()) if len(z) else None}
        if s == "val":
            if not len(z):
                return None
            a, b = platt(z, t)
            out["intercept"], out["slope"] = a, b
            code, _G, gen = boot_weights(pair, n_boot, seed + 1)
            out["bootSlopes"] = []
            out["bootIntercepts"] = []
            for w in gen():
                a_, b_ = platt(z, t, w)
                out["bootIntercepts"].append(a_)
                out["bootSlopes"].append(b_)
            out["slopeInterval"] = interval(out["bootSlopes"], ci)
    log(f"forge (our {split_by} split, val): {out['val']['rows']} rows, {out['val']['pairs']} pairs; "
        f"Platt intercept {out['intercept']:+.3f} slope {out['slope']:.3f} "
        f"[{out['slopeInterval'][0]:.3f}, {out['slopeInterval'][1]:.3f}]")
    return out


def run(model_path: str, ext_dir: str, data: str | None = None, trad: str | None = None,
        log=print) -> tuple[dict[str, Any], dict[str, Any]]:
    import evalnet as N
    import train_eval as T
    R = CALIB_RULE
    m, net = N.load_model(model_path)
    if len(m.get("cardStates") or []) != 2:
        raise SystemExit("human_calib: not an r17 model (the 17Lands rows are r17; D359)")
    schema_ext = N.read_schema(ext_dir)
    if schema_ext.get("schemaId") != m["schemaId"]:
        raise SystemExit(f"human_calib: the 17Lands rows have schema {schema_ext.get('schemaId')}, the model "
                         f"{m['schemaId']} -- one vocabulary for both")
    names = N.board_names(schema_ext)
    with open(os.path.join(ext_dir, "stats.json"), encoding="utf-8") as f:
        ext_stats = json.load(f)
    notes = _notes(ext_stats, R["replay"])
    boot = (R["bootstrap"], R["bootSeed"], R["ci"])
    bands = [(lo, hi) for lo, hi in R["bands"]]

    rows, share, persp, half, p = load_ext_scored(ext_dir, net, N.n_states_of(schema_ext))
    turn = rows.turn.astype(np.int64)
    t_all = (rows.y.astype(np.float64) + 1) / 2
    z_all = logit(p)
    both = None if ext_stats.get("perspective") == "both" else 0
    fit_ix = select(share, persp, half, turn, R["fitHalf"], both, R["minShare"], R["minTurn"])
    test_ix = select(share, persp, half, turn, R["testHalf"], both, R["minShare"], R["minTurn"])
    zf, tf, turnf = z_all[fit_ix], t_all[fit_ix], turn[fit_ix]
    zt, tt, turnt = z_all[test_ix], t_all[test_ix], turn[test_ix]
    gt = rows.game[test_ix]
    log(f"17Lands: calibration half {len(fit_ix)} rows, {len(np.unique(rows.game[fit_ix]))} games; "
        f"test half {len(test_ix)} rows, {len(np.unique(gt))} games")

    # --- the fits, on the calibration half only
    g_ab = platt(zf, tf) if len(zf) else (0.0, 1.0)
    g_T = temperature(zf, tf) if len(zf) else 1.0
    b_fit = fit_bands(zf, tf, turnf, bands)
    cols_f = simple_features(rows.take(fit_ix), names) if len(fit_ix) else None
    simple_coef = fit_simple(cols_f, tf) if cols_f is not None else None
    # an interval for the human slope (resampling calibration games): the relative slope's numerator
    code_f, _Gf, gen_f = boot_weights(rows.game[fit_ix], R["bootstrap"], R["bootSeed"] + 2)
    boot_h = [platt(zf, tf, w) for w in gen_f()] if len(zf) else []
    log(f"global Platt (calibration half): intercept {g_ab[0]:+.4f} slope {g_ab[1]:.4f}; temperature-only slope "
        f"{g_T:.4f}")

    # --- the held-out half: every model's predictions
    preds = {"uncalibrated": sigmoid(zt), "platt": sigmoid(g_ab[0] + g_ab[1] * zt),
             "platt-bands": apply_bands(zt, turnt, b_fit, g_ab), "temperature": sigmoid(g_T * zt),
             "prior": np.full(len(zt), float(tf.mean()) if len(tf) else 0.5)}
    if simple_coef is not None and len(test_ix):
        preds.update(predict_simple(simple_coef, simple_features(rows.take(test_ix), names)))
    y_t = rows.y[test_ix]
    models = {k: T.metrics(v, y_t, turnt) for k, v in preds.items()} if len(test_ix) else {}
    ll = {k: row_logloss(v, tt) for k, v in preds.items()}

    def wmean(x):
        return lambda w: float((w * x).sum() / w.sum())

    def wece(pp):
        return lambda w: weighted_ece(pp, tt, w, R["eceBins"])

    stats = {
        "ll_uncal_minus_platt": wmean(ll["uncalibrated"] - ll["platt"]),
        "ll_platt_minus_bands": wmean(ll["platt"] - ll["platt-bands"]),
        "ll_uncal_minus_temperature": wmean(ll["uncalibrated"] - ll["temperature"]),
        "ll_uncal": wmean(ll["uncalibrated"]), "ll_platt": wmean(ll["platt"]), "ll_bands": wmean(ll["platt-bands"]),
        "ece_uncal": wece(preds["uncalibrated"]), "ece_platt": wece(preds["platt"]),
        "ece_bands": wece(preds["platt-bands"]),
        "ece_uncal_minus_platt": lambda w: wece(preds["uncalibrated"])(w) - wece(preds["platt"])(w),
    }
    for k in ("life", "hand", "board", "life+hand+board"):
        if k in ll:
            stats[f"ll_{k}_minus_platt"] = wmean(ll[k] - ll["platt"])
    bs = boot_stats(stats, gt, *boot) if len(test_ix) else {}
    games_t = int(len(np.unique(gt)))
    delta = bs.get("ll_uncal_minus_platt") or {"mean": float("nan"), "lo": float("nan"), "hi": float("nan")}
    v = verdict(len(test_ix), games_t, delta, notes)
    bd = bs.get("ll_platt_minus_bands") or {}
    form = "bands" if bd.get("lo", float("nan")) > 0 else "global"

    # --- relative to Forge's own calibration
    forge = None
    rel: dict[str, Any] | None = None
    if data:
        forge = forge_fit(data, net, (m.get("training") or {}).get("splitBy") or "pair", R["bootstrap"],
                          R["bootSeed"], R["ci"], log)
    if forge and boot_h:
        ai, sl = relative(g_ab, (forge["intercept"], forge["slope"]))
        k = min(len(boot_h), len(forge["bootSlopes"]))
        r_s = [boot_h[i][1] / forge["bootSlopes"][i] for i in range(k)]
        r_a = [relative(boot_h[i], (forge["bootIntercepts"][i], forge["bootSlopes"][i]))[0] for i in range(k)]
        rel = {"intercept": ai, "slope": sl, "slopeInterval": interval(r_s, R["ci"]),
               "interceptInterval": interval(r_a, R["ci"]),
               "bands": [{**b, **dict(zip(("intercept", "slope"),
                                          relative((b["intercept"], b["slope"]), (forge["intercept"], forge["slope"]))))}
                         for b in b_fit]}
    hs = interval([b for _a, b in boot_h], R["ci"]) if boot_h else (float("nan"), float("nan"))

    # --- the coach's use, by the rule
    coach = coach_use(v["verdict"], rel, forge, g_ab[1], form)

    # --- secondary tables (reported, never a verdict)
    secondary: dict[str, Any] = {}
    if both is None:
        fu = select(share, persp, half, turn, R["fitHalf"], 0, R["minShare"], R["minTurn"])
        tu = select(share, persp, half, turn, R["testHalf"], 0, R["minShare"], R["minTurn"])
        if len(fu) and len(tu):
            u_ab = platt(z_all[fu], t_all[fu])
            pu = {"uncalibrated": sigmoid(z_all[tu]), "platt (both-perspective fit)": sigmoid(g_ab[0] + g_ab[1] * z_all[tu]),
                  "platt (user-only fit)": sigmoid(u_ab[0] + u_ab[1] * z_all[tu])}
            secondary["user rows (test half)"] = {
                "rows": int(len(tu)), "userOnlyFit": {"intercept": u_ab[0], "slope": u_ab[1]},
                "models": {k: T.metrics(x, rows.y[tu], turn[tu]) for k, x in pu.items()}}
    if trad:
        rows2, share2, persp2, half2, p2 = load_ext_scored(trad, net, N.n_states_of(N.read_schema(trad)))
        if len(rows2):
            j = select(share2, persp2, half2, rows2.turn.astype(np.int64), None, None, R["minShare"], R["minTurn"])
            z2, y2, tu2 = logit(p2[j]), rows2.y[j], rows2.turn[j].astype(np.int64)
            secondary["TradDraft, all games (PremierDraft's fit applied)"] = {
                "rows": int(len(j)), "games": int(len(np.unique(rows2.game[j]))),
                "models": {"uncalibrated": T.metrics(sigmoid(z2), y2, tu2),
                           "platt": T.metrics(sigmoid(g_ab[0] + g_ab[1] * z2), y2, tu2),
                           "platt-bands": T.metrics(apply_bands(z2, tu2, b_fit, g_ab), y2, tu2)}}

    rule = {k: (list(x) if isinstance(x, tuple) else x) for k, x in R.items()}
    rep = {
        "rule": rule, "decision": "D415", "model": os.path.abspath(model_path), "modelSha256": sha256_file(model_path),
        "modelSchemaId": m["schemaId"], "ext": os.path.abspath(ext_dir), "extStats": ext_stats,
        "source": ext_stats.get("source"), "notes": notes,
        "fit": {"rows": int(len(fit_ix)), "games": int(len(np.unique(rows.game[fit_ix]))),
                "global": {"intercept": g_ab[0], "slope": g_ab[1], "slopeInterval": hs},
                "temperature": g_T, "bands": b_fit,
                "simple": {k: [float(c) for c in v_] for k, v_ in (simple_coef or {}).items()}},
        "test": {"rows": int(len(test_ix)), "games": games_t, "models": models, "boot": bs},
        "verdict": v, "form": form, "forge": ({k: v_ for k, v_ in forge.items() if not k.startswith("boot")}
                                              if forge else None),
        "relative": rel, "coach": coach, "secondary": secondary,
    }
    rep["summary"] = {
        "written": 1, "pass": 1 if v["verdict"] == "PASS" else 0,
        "decided": 1 if v["verdict"] in ("PASS", "FAIL") else 0,
        "rows": rep["test"]["rows"], "games": games_t, "fitRows": rep["fit"]["rows"],
        "delta": delta["mean"], "delta_lo": delta["lo"], "delta_hi": delta["hi"],
        "slope": g_ab[1], "intercept": g_ab[0],
        "bands": 1 if form == "bands" else 0, "coachUse": 1 if coach["use"] == "relative" else 0,
        **({"relSlope": rel["slope"], "relSlope_lo": rel["slopeInterval"][0], "relSlope_hi": rel["slopeInterval"][1],
            "forgeSlope": forge["slope"]} if rel else {}),
        **({k: bs[k]["mean"] for k in ("ece_uncal", "ece_platt") if k in bs}),
    }
    from ext17l import peak_gb
    rep["peakGB"] = peak_gb()
    rep["summary"]["peakGB"] = rep["peakGB"] if rep["peakGB"] is not None else -1
    params = params_file(rep)
    log(format_report(rep))
    return rep, params


def params_file(rep: dict[str, Any]) -> dict[str, Any]:
    """The small JSON a coach could read: the transform, the fits, which to use, and why."""
    R = CALIB_RULE
    f = rep["fit"]
    return {
        "format": FORMAT, "formatVersion": 1, "decision": "D415",
        "transform": R["transform"],
        "turn": "the protocol's turn (half-turn number: 1 is the first player's first turn); bands as listed",
        "source": rep.get("source"),
        "model": {"file": os.path.basename(rep["model"]), "sha256": rep["modelSha256"],
                  "schemaId": rep["modelSchemaId"], "kind": "r17"},
        "population": {"replay": R["replay"], "fitHalf": R["fitHalf"], "perspective": R["perspective"],
                       "minShare": R["minShare"], "minTurn": R["minTurn"], "rows": f["rows"], "games": f["games"],
                       "positions": "end of each half-turn, the game's final half-turn dropped"},
        "verdict": rep["verdict"]["verdict"],
        "absolute": {"appliesTo": "the r17 model above, on its raw output",
                     "global": {"intercept": f["global"]["intercept"], "slope": f["global"]["slope"]},
                     "bands": [{k: b[k] for k in ("lo", "hi", "intercept", "slope", "rows")} for b in f["bands"]],
                     "recommendedForm": rep["form"]},
        "relative": (None if rep["relative"] is None else
                     {"appliesTo": "a model already calibrated on Forge's games (v1/v2), on its raw output",
                      "global": {k: rep["relative"][k] for k in ("intercept", "slope", "slopeInterval")},
                      "bands": [{k: b[k] for k in ("lo", "hi", "intercept", "slope")} for b in rep["relative"]["bands"]]}),
        "coach": rep["coach"],
    }


def _table(title: str, models: dict[str, Any]) -> list[str]:
    out = [f"\n{title}", f"  {'model':16s} {'bucket':11s} {'rows':>7s} {'acc':>6s} {'logloss':>8s} {'brier':>6s} {'ece':>6s}"]
    for name, res in models.items():
        for bucket, mt in res.items():
            if bucket == "reliability" or not mt.get("rows"):
                continue
            out.append(f"  {name:16s} {bucket:11s} {mt['rows']:7d} {mt['acc']:6.3f} {mt['logloss']:8.4f} "
                       f"{mt['brier']:6.3f} {mt['ece']:6.3f}")
    for name in ("uncalibrated", "platt"):
        rel = (models.get(name) or {}).get("reliability") or []
        if rel:
            out.append(f"  reliability ({name}): bin rows predicted observed")
            out += [f"    {b['bin']}  {b['rows']:7d}  {b['predicted']:.3f}  {b['observed']:.3f}" for b in rel if b["rows"]]
    return out


def format_report(rep: dict[str, Any]) -> str:
    f = rep["fit"]
    out = [f"human calibration (D415): model {os.path.basename(rep['model'])} sha256 {rep['modelSha256'][:12]}, "
           f"schema {rep['modelSchemaId']}", f"source: {rep.get('source')}",
           f"calibration half: {f['rows']} rows, {f['games']} games; global Platt intercept "
           f"{f['global']['intercept']:+.4f} slope {f['global']['slope']:.4f} "
           f"[{f['global']['slopeInterval'][0]:.4f}, {f['global']['slopeInterval'][1]:.4f}]; temperature {f['temperature']:.4f}"]
    for b in f["bands"]:
        out.append(f"  {b['band']:11s} {b['rows']:7d} rows: intercept {b['intercept']:+.4f} slope {b['slope']:.4f}")
    out += _table(f"held-out test half: {rep['test']['rows']} rows, {rep['test']['games']} games", rep["test"]["models"])
    out.append("\n  bootstrap over test games (point [95% interval]):")
    for k, d in rep["test"]["boot"].items():
        out.append(f"    {k:28s} {d['mean']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}]")
    fg = rep.get("forge")
    if fg:
        out.append(f"\nForge (our val split): {fg['val']['rows']} rows, {fg['val']['pairs']} pairs; Platt intercept "
                   f"{fg['intercept']:+.4f} slope {fg['slope']:.4f} [{fg['slopeInterval'][0]:.4f}, "
                   f"{fg['slopeInterval'][1]:.4f}]; test ECE uncalibrated {fg['test'].get('eceUncalibrated')}")
    r = rep.get("relative")
    if r:
        out.append(f"relative (human / Forge): intercept {r['intercept']:+.4f} [{r['interceptInterval'][0]:+.4f}, "
                   f"{r['interceptInterval'][1]:+.4f}], slope {r['slope']:.4f} [{r['slopeInterval'][0]:.4f}, "
                   f"{r['slopeInterval'][1]:.4f}]")
    for name, sec in rep["secondary"].items():
        extra = f" user-only fit {sec['userOnlyFit']}" if "userOnlyFit" in sec else ""
        out += _table(f"secondary: {name} ({sec['rows']} rows; reported, no verdict){extra}", sec["models"])
    v = rep["verdict"]
    out.append(f"\nverdict (CALIB_RULE, D415): {v['verdict']} -- {v['why']}")
    out.append(f"form: {rep['form']}; coach use: {rep['coach']['use']} -- {rep['coach']['why']}")
    out.append(f"peak RSS {rep.get('peakGB')} GB")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", required=True, help="the r17 evaluator (frozen; J063's)")
    ap.add_argument("--ext", required=True, help="ext17l.py rows of PremierDraft's file, --perspective both")
    ap.add_argument("--data", help="our r17 dataset, for the Forge-side fit and the relative transform")
    ap.add_argument("--trad", help="ext17l.py rows of TradDraft's file (secondary, no verdict)")
    ap.add_argument("--report", required=True, help="the full report (JSON)")
    ap.add_argument("--params", required=True, help="the calibration parameters (JSON, small)")
    a = ap.parse_args(argv)
    if np is None:
        print("human_calib: needs numpy", file=sys.stderr)
        return 2
    rep, params = run(a.model, a.ext, a.data, a.trad)
    for path, obj in ((a.report, rep), (a.params, params)):
        os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=1)
            f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
