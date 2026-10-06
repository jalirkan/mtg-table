#!/usr/bin/env python3
# mtg-table — tools/ml: the pre-registered verification of a `design` candidate (D344).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Is a proposed cube more balanced than the original?  A pre-registered, group-sequential test.

    python3 tools/ml/matchup_verify.py test --orig <run-dir> --cand <run-dir> [--per-arm 8000] [--looks 4] [--alpha 0.05]
        exit 0: decided (the line says ACCEPT or REJECT); 3: CONTINUE to the next look
    python3 tools/ml/matchup_verify.py sim [--per-arm 8000] [--trials 400]      # the operating characteristics

WHAT IS MEASURED.  Each arm is the cube lab run on one cube (the original, the
candidate) over the SAME fresh seeds, one game per draft.  A deck's archetype
is its played colours (`WU`, ...).  An archetype's win rate is its decisive
games won over played; the arm's balance is the between-archetype VARIANCE of
the true win rates, estimated by the method of moments (flatness-style):

    v = var(r_a over archetypes with >= 30 games) - mean_a r_a (1 - r_a) / g_a

(the raw variance minus the binomial noise each rate carries; unbiased, can be
negative), reported as SD = sqrt(max(v, 0)) in win-rate points.

THE TEST.  D = v_orig - v_cand (> 0: the candidate is more balanced).  Its SE
is a bootstrap over drafts within each arm (`--boot`, 400), the arms
independent; z = D / SE.  H0: D <= 0, one-sided alpha 5%.  GROUP SEQUENTIAL:
`--looks` (4) equally spaced looks at 1/4, 1/2, 3/4 and all of `--per-arm`
drafts; O'Brien-Fleming efficacy bounds z_k >= c sqrt(K/k) with c set so the
overall false-acceptance rate is alpha (c = 1.73 for K = 4, alpha 0.05:
bounds 3.47, 2.45, 2.00, 1.73), and a NON-BINDING futility stop at looks 2 and
later when z_k < 0 (it can only lower the false-acceptance rate).  Accept the
candidate only on crossing an efficacy bound; anything else -- futility, or
the last look below its bound -- keeps the original.  The test is about
balance between archetypes, nothing else: a person still reads the swaps for
themes and roles (review 2, N3), and the candidate is balanced for Forge's AI.

SIZE.  At 400 drafts per arm (the old rule: "accept if at least as even") an
archetype's win rate has an SE of 5.6 points, bigger than the effect, and the
old rule accepted a real worsening (5 -> 7 points) 42% of the time.  `sim`
gives this test's numbers (400 trials, 10 archetypes, realised spreads
fixed; D344): at 8,000 drafts per arm a 5 -> 5 cube is accepted 4.5% of the
time, a 5 -> 3 improvement 90% (after 5,930 drafts per arm on average), 5 -> 4
42%, 5 -> 7 never; at 4,000 per arm the 5 -> 3 power is 64%.
16,000 drafts in all, about one PC night at the measured rates: ONE CANDIDATE
COSTS ABOUT ONE NIGHT, so verify few, chosen with care.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

# One BLAS thread, set rather than defaulted: the lab runner's cap (D337) is the step's width, maybe more.
for _k in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[_k] = "1"
import numpy as np  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matchup_data as MD  # noqa: E402

PRE = {"perArm": 8000, "looks": 4, "alpha": 0.05, "minGames": 30, "boot": 400, "futilityFrom": 2}
# O'Brien-Fleming constants c (bound at look k of K: c * sqrt(K / k)) for one-sided alpha, by K: computed by
# obf_constant() (Monte Carlo over the joint normal of the looks, 2e6 draws) and pinned here so the rule is fixed.
OBF = {(1, 0.05): 1.645, (2, 0.05): 1.678, (3, 0.05): 1.710, (4, 0.05): 1.733, (5, 0.05): 1.750}


def obf_constant(K: int, alpha: float, n: int = 2_000_000, seed: int = 1) -> float:
    """c such that P(some z_k >= c sqrt(K/k)) = alpha under H0, for K equally spaced looks (Monte Carlo)."""
    rng = np.random.default_rng(seed)
    z = np.cumsum(rng.standard_normal((n, K)), axis=1) / np.sqrt(np.arange(1, K + 1))
    m = (z / np.sqrt(K / np.arange(1, K + 1))).max(1)
    return float(np.quantile(m, 1 - alpha))


def bound(k: int, K: int, alpha: float) -> float:
    c = OBF.get((K, round(alpha, 4))) or obf_constant(K, alpha)
    return c * math.sqrt(K / k)


# ---------------------------------------------------------------- the statistic

def arch_index(names: List[str]) -> Dict[str, int]:
    return {a: i for i, a in enumerate(sorted(set(names)))}


def mom_var(ai: np.ndarray, aj: np.ndarray, win: np.ndarray, A: int, w: Optional[np.ndarray] = None, min_games: int = 30) -> float:
    """Method-of-moments between-archetype variance of the true win rates (one row per decisive game:
    deck A's archetype ai, deck B's aj, win = A won), optionally weighted (bootstrap counts per game)."""
    w = np.ones(len(ai)) if w is None else w
    g = np.bincount(ai, weights=w, minlength=A) + np.bincount(aj, weights=w, minlength=A)
    wins = np.bincount(ai, weights=w * win, minlength=A) + np.bincount(aj, weights=w * (1 - win), minlength=A)
    ok = g >= min_games
    if ok.sum() < 3:
        return float("nan")
    r = wins[ok] / g[ok]
    return float(r.var(ddof=1) - np.mean(r * (1 - r) / g[ok]))


def mom_var_boot(ai, aj, win, A, draft: np.ndarray, B: int, rng: np.random.Generator, min_games: int = 30) -> np.ndarray:
    """B bootstrap replicates of mom_var, resampling DRAFTS (a draft's games move together)."""
    nd = int(draft.max()) + 1 if len(draft) else 0
    out = np.empty(B)
    for b in range(B):
        cnt = np.bincount(rng.integers(0, nd, nd), minlength=nd).astype(float)
        out[b] = mom_var(ai, aj, win, A, cnt[draft], min_games)
    return out


def arm_stats(arm: Dict[str, np.ndarray], A: int, B: int, rng: np.random.Generator, min_games: int) -> Tuple[float, float]:
    v = mom_var(arm["ai"], arm["aj"], arm["win"], A, None, min_games)
    bs = mom_var_boot(arm["ai"], arm["aj"], arm["win"], A, arm["draft"], B, rng, min_games)
    return v, float(np.nanstd(bs, ddof=1))


def look(orig: Dict[str, np.ndarray], cand: Dict[str, np.ndarray], A: int, k: int, K: int, alpha: float, B: int, seed: int,
         min_games: int = PRE["minGames"], futility_from: int = PRE["futilityFrom"]) -> Dict[str, Any]:
    """One look of the pre-registered test: the decision at look k of K."""
    rng = np.random.default_rng(seed)
    vo, so = arm_stats(orig, A, B, rng, min_games)
    vc, sc = arm_stats(cand, A, B, rng, min_games)
    D = vo - vc
    se = math.sqrt(so ** 2 + sc ** 2)
    z = D / se if se > 0 and not math.isnan(D) else float("nan")
    bnd = bound(k, K, alpha)
    if not math.isnan(z) and z >= bnd:
        decision = "ACCEPT"
    elif k >= K:
        decision = "REJECT"
    elif k >= futility_from and (math.isnan(z) or z < 0):
        decision = "REJECT (futility)"
    else:
        decision = "CONTINUE"
    sd = lambda v: math.sqrt(max(v, 0.0)) * 100  # noqa: E731
    return {"look": k, "looks": K, "vOrig": vo, "vCand": vc, "sdOrig": sd(vo), "sdCand": sd(vc), "D": D, "se": se, "z": z,
            "bound": bnd, "decision": decision}


# ---------------------------------------------------------------- reading the lab's run folders

def arm_from_run(run_dir: str, seeds: Optional[set] = None) -> Tuple[Dict[str, Any], List[str]]:
    """Decisive games of a run folder: archetypes (played colours), winners, draft index; and the seeds used."""
    rows, seen = [], []
    with open(os.path.join(run_dir, "drafts.jsonl"), encoding="utf-8") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if seeds is not None and rec["seed"] not in seeds:
                continue
            if rec.get("playExplore"):
                continue  # D358: a draft whose games explored is not evidence of the archetypes' strength
            cols = []
            for d in rec["drafters"]:
                deck = d.get("deck") if d.get("played") != "forge" else None
                c = (deck or d.get("forge") or {}).get("colors") or "?"
                cols.append("".join(x for x in "WUBRG" if x in c) or "C")
            seen.append(rec["seed"])
            for g in rec["match"]["games"]:
                if g.get("winner") in ("A", "B"):
                    rows.append((rec["seed"], cols[0], cols[1], 1.0 if g["winner"] == "A" else 0.0))
    return {"rows": rows}, seen


def to_arrays(rows, ix: Dict[str, int]) -> Dict[str, np.ndarray]:
    seeds = sorted({r[0] for r in rows})
    si = {s: i for i, s in enumerate(seeds)}
    return {"ai": np.array([ix[r[1]] for r in rows], dtype=int), "aj": np.array([ix[r[2]] for r in rows], dtype=int),
            "win": np.array([r[3] for r in rows]), "draft": np.array([si[r[0]] for r in rows], dtype=int)}


def test_cmd(a) -> int:
    o, so = arm_from_run(a.orig)
    c, sc = arm_from_run(a.cand)
    common = sorted(set(so) & set(sc))
    step = a.per_arm // a.looks
    k = min(a.looks, len(common) // step) if step else 0
    print(f"pre-registered: {a.per_arm} drafts per arm, {a.looks} looks every {step}, one-sided alpha {a.alpha}, "
          f"O'Brien-Fleming bounds {', '.join(f'{bound(i, a.looks, a.alpha):.2f}' for i in range(1, a.looks + 1))}, futility z < 0 from look {PRE['futilityFrom']}")
    print(f"drafts in both arms on the same seeds: {len(common)} (orig {len(so)}, cand {len(sc)})")
    if k == 0:
        print(f"CONTINUE: the first look is at {step} drafts in both arms")
        return 3
    use = set(common[:k * step])
    o, _ = arm_from_run(a.orig, use)
    c, _ = arm_from_run(a.cand, use)
    ix = arch_index([r[1] for r in o["rows"] + c["rows"]] + [r[2] for r in o["rows"] + c["rows"]])
    r = look(to_arrays(o["rows"], ix), to_arrays(c["rows"], ix), len(ix), k, a.looks, a.alpha, a.boot, a.seed)
    print(f"look {k}/{a.looks} on {k * step} drafts per arm: archetype SD orig {r['sdOrig']:.1f} pts, cand {r['sdCand']:.1f} pts; "
          f"D = {r['D']:+.5f} (variance), SE {r['se']:.5f}, z {r['z']:+.2f} vs bound {r['bound']:.2f} -> {r['decision']}")
    if r["decision"] == "CONTINUE":
        print(f"next look at {(k + 1) * step} drafts per arm")
        return 3
    return 0


# ---------------------------------------------------------------- simulation of the rule

def sim_arm(d: np.ndarray, n: int, rng: np.random.Generator) -> Dict[str, np.ndarray]:
    A = len(d)
    ai = rng.integers(0, A, n)
    aj = (ai + rng.integers(1, A, n)) % A
    p = np.clip(0.5 + d[ai] - d[aj], 0.01, 0.99)
    return {"ai": ai, "aj": aj, "win": (rng.random(n) < p).astype(float), "draft": np.arange(n)}


def strengths(sd_points: float, A: int, rng: np.random.Generator) -> np.ndarray:
    """Archetype offsets whose win rates against a uniform field have exactly this SD (realised spread fixed)."""
    x = rng.standard_normal(A)
    x = (x - x.mean()) / x.std(ddof=1)
    return x * (sd_points / 100) / (1 + 1 / (A - 1))


def sim_cmd(a) -> int:
    rng = np.random.default_rng(a.seed)
    A, K, N = 10, a.looks, a.per_arm
    step = N // K
    print(f"{a.trials} trials a row; {A} archetypes, one game per draft; {N} drafts per arm, {K} looks; bootstrap {a.boot}")
    for s0, s1, label in ((5, 5, "no change 5 -> 5"), (5, 3, "improvement 5 -> 3"), (5, 4, "improvement 5 -> 4"), (5, 7, "worsening 5 -> 7")):
        acc, used = 0, []
        for t in range(a.trials):
            o = sim_arm(strengths(s0, A, rng), N, rng)
            c = sim_arm(strengths(s1, A, rng), N, rng)
            for k in range(1, K + 1):
                m = k * step
                cut = lambda x: {kk: v[:m] for kk, v in x.items()}  # noqa: E731
                r = look(cut(o), cut(c), A, k, K, a.alpha, a.boot, int(rng.integers(1 << 30)))
                if r["decision"] != "CONTINUE":
                    acc += r["decision"] == "ACCEPT"
                    used.append(m)
                    break
        print(f"  {label:22s} P(accept) {acc / a.trials:.3f}   mean drafts per arm {np.mean(used):.0f}", flush=True)
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("test")
    t.add_argument("--orig", required=True)
    t.add_argument("--cand", required=True)
    s = sub.add_parser("sim")
    s.add_argument("--trials", type=int, default=400)
    for p in (t, s):
        p.add_argument("--per-arm", type=int, default=PRE["perArm"])
        p.add_argument("--looks", type=int, default=PRE["looks"])
        p.add_argument("--alpha", type=float, default=PRE["alpha"])
        p.add_argument("--boot", type=int, default=PRE["boot"])
        p.add_argument("--seed", type=int, default=1)
    a = ap.parse_args(argv)
    return test_cmd(a) if a.cmd == "test" else sim_cmd(a)


if __name__ == "__main__":
    sys.exit(main())
