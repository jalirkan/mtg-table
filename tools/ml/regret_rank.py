#!/usr/bin/env python3
# mtg-table — tools/ml: gate 2's truth tables read over ALL options, not only each ranker's pick (D395).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Does the evaluator order a decision's options better than the hand leaf?

    python3 tools/ml/regret_rank.py --set set.jsonl --truth truth.jsonl \\
        --hand rank-hand-3.jsonl --eval rank-eval-3.jsonl [--label v2] --report rank.json

Gate 2 (D354, gate_regret_score.py) scores each ranker by the truth's win rate of
the ONE option it picks.  J051 (v1) and J081 (v2) both failed it, and the two
rankers pick the same option on about 75% of decisions, so most of the test's
information sits in about 70 discordant decisions.  This reads the same files
again, and plays nothing: J050's truth tables (each option's win rate when it is
played and Forge plays both seats to the end of the game, 200 rounds with
racing) and the rankers' tables (each option's mean leaf over 3 rounds of
rollouts to the end of this turn: sigma(leaf/500) for the hand leaf, P(win) for
the evaluator).  Every answer file keeps every option's `winRate` and `n`, so
nothing has to be ranked again.

PER DECISION, over the options the truth and both rankers share (aliases and
options without playouts left out, as gate_regret_score.py does):
  * pairwise ordering accuracy: over every pair of options whose truth win rates
    differ, 1 when the ranker orders them the same way, 1/2 when it ties them,
    0 when it reverses them; the decision's mean.  A decision whose options all
    have the same truth counts nowhere;
  * Spearman's rho (average ranks) and Kendall's tau-b of the ranker's means
    against the truth's (undefined, and left out, when either side is constant);
  * the same pairwise accuracy over the CONFIDENT pairs only: pairs whose truth
    difference exceeds 1.96 x its standard error.
Each is averaged over decisions (every decision weighs the same), and the
difference eval - hand gets a paired bootstrap interval over decisions
(gates.paired_bootstrap: 10,000 resamples, seed 20261004).

THE RULE (RANK_RULE, D395, written before this ran): the evaluator has a
within-decision edge when the mean pairwise accuracy of eval minus hand has a
95% interval whose lower end is above 0, on at least 240 decisions.  Otherwise
the leaf track stays stopped.  The rule is read on `--eval` at the rule's 3
rounds.  The job names which model it reads (v2, J081's) and reports the
others, without verdicts.

ALSO REPORTED, never gating:
  * the discordant-only sign test: on decisions where the two rankers' picks
    (gate_regret_score.pick) differ, which pick has the higher truth win rate
    (eval better / hand better / equal), with an exact two-sided binomial p over
    the untied ones, and the same counts for the CLEAR ones (difference beyond
    1.96 x its standard error);
  * the truth's noise: per-option playout counts (all options, the truth's best,
    the options still racing at the end (`active`) and the retired ones), each
    option's standard error (from the answer's 95% interval when present, else
    sqrt(p(1-p)/n)), the share of option pairs the truth cannot tell apart, the
    within-decision reliability 1 - mean(se^2) / var(truth) and the standard
    error of each ranker's regret;
  * everything again by stratum (attack, block, spell) and by option count
    (2, 3-4, 5-8, 9+).

Answers graded by different code versions (the files' .meta.json, D341) are
refused unless --allow-version-change, which is recorded, as in the scorer.
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import sys
from collections import defaultdict
from typing import Any, Iterable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402
import gate_regret_score as RS  # noqa: E402

RANK_RULE = {
    "metric": "pairwise ordering accuracy per decision, averaged over decisions; eval - hand",
    "bootstrap": 10000, "ci": 0.95, "bootSeed": 20261004,
    "minDecisions": 240,              # fewer decisions with an ordered pair: no edge (underpowered)
    "confidentZ": 1.959964,           # a pair or a pick difference beyond this many standard errors is CLEAR
    "rankRounds": 3,                  # the rankers the rule reads (REGRET_RULE's primary rounds)
}

BUCKETS = ((2, 2, "2"), (3, 4, "3-4"), (5, 8, "5-8"), (9, 10 ** 9, "9+"))


# ---------------------------------------------------------------- small statistics

def avg_ranks(xs: list[float]) -> list[float]:
    """1-based ranks, ties sharing their average rank."""
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def pearson(a: list[float], b: list[float]) -> float | None:
    n = len(a)
    if n < 2:
        return None
    ma, mb = sum(a) / n, sum(b) / n
    va = sum((x - ma) ** 2 for x in a)
    vb = sum((y - mb) ** 2 for y in b)
    if va <= 0 or vb <= 0:
        return None
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(va * vb)


def spearman(a: list[float], b: list[float]) -> float | None:
    return pearson(avg_ranks(a), avg_ranks(b))


def kendall_tau_b(a: list[float], b: list[float]) -> float | None:
    conc = disc = ta = tb = 0
    n = len(a)
    for i in range(n):
        for j in range(i + 1, n):
            da, db = a[i] - a[j], b[i] - b[j]
            if da == 0 and db == 0:
                continue
            if da == 0:
                ta += 1
            elif db == 0:
                tb += 1
            elif (da > 0) == (db > 0):
                conc += 1
            else:
                disc += 1
    den = math.sqrt((conc + disc + ta) * (conc + disc + tb))
    return (conc - disc) / den if den > 0 else None


def binom_two_sided(k: int, n: int) -> float:
    """Exact two-sided sign-test p for k successes of n at 1/2 (1.0 when n = 0)."""
    if n == 0:
        return 1.0
    pmf = [math.comb(n, i) / 2 ** n for i in range(n + 1)]
    obs = pmf[k]
    return min(1.0, sum(p for p in pmf if p <= obs * (1 + 1e-9)))


def mean(xs: Iterable[float | None]) -> float | None:
    v = [x for x in xs if x is not None]
    return sum(v) / len(v) if v else None


def quantiles(xs: list[float]) -> dict[str, float] | None:
    if not xs:
        return None
    return {"n": len(xs), "mean": sum(xs) / len(xs), "min": min(xs), "p10": G.percentile(xs, 0.1),
            "median": G.percentile(xs, 0.5), "p90": G.percentile(xs, 0.9), "max": max(xs)}


def option_se(o: dict[str, Any]) -> float:
    """An option's standard error: from its 95% interval when the answer has one, else binomial."""
    lo, hi = o.get("winLo"), o.get("winHi")
    if isinstance(lo, (int, float)) and isinstance(hi, (int, float)) and hi > lo:
        return (float(hi) - float(lo)) / (2 * 1.959964)
    n = max(1, int(o.get("n") or 1))
    p = min(max(float(o["winRate"]), 0.5 / n), 1 - 0.5 / n)
    return math.sqrt(p * (1 - p) / n)


# ---------------------------------------------------------------- one decision

def pair_accuracy(truth: list[float], rank: list[float], keep=None) -> tuple[float, int] | None:
    """(mean score, pairs) over the pairs whose truth differs (and `keep(i, j)` when given)."""
    s, n = 0.0, 0
    for i in range(len(truth)):
        for j in range(i + 1, len(truth)):
            dt = truth[i] - truth[j]
            if dt == 0 or (keep is not None and not keep(i, j)):
                continue
            dr = rank[i] - rank[j]
            s += 0.5 if dr == 0 else (1.0 if (dr > 0) == (dt > 0) else 0.0)
            n += 1
    return (s / n, n) if n else None


def bucket(k: int) -> str:
    for lo, hi, name in BUCKETS:
        if lo <= k <= hi:
            return name
    return "?"


def analyse_one(truth_ans: dict[str, Any], hand_ans: dict[str, Any], eval_ans: dict[str, Any],
                z: float = RANK_RULE["confidentZ"]) -> dict[str, Any] | None:
    """One decision's row, or None when it cannot be read (the scorer's own conditions)."""
    t = RS.table(truth_ans)
    if t is None or truth_ans.get("measure") != "wins":
        return None
    h, e = RS.table(hand_ans), RS.table(eval_ans)
    if h is None or e is None:
        return None
    common = [k for k in t if k in h and k in e]
    if len(common) < 2:
        return None
    tv = [float(t[k]["winRate"]) for k in common]
    se = [option_se(t[k]) for k in common]
    ns = [int(t[k].get("n") or 0) for k in common]
    best_i = max(range(len(common)), key=lambda i: tv[i])
    confident = lambda i, j: abs(tv[i] - tv[j]) > z * math.sqrt(se[i] ** 2 + se[j] ** 2)  # noqa: E731
    row: dict[str, Any] = {"options": len(common), "bucket": bucket(len(common)), "best": common[best_i]}
    picks = {}
    for name, tab in (("hand", h), ("eval", e)):
        rv = [float(tab[k]["winRate"]) for k in common]
        pa = pair_accuracy(tv, rv)
        pc = pair_accuracy(tv, rv, confident)
        pk = RS.pick(tab, common)
        pi = common.index(pk)
        picks[name] = pi
        row[name] = {"pairAcc": pa[0] if pa else None, "pairs": pa[1] if pa else 0,
                     "confAcc": pc[0] if pc else None, "confPairs": pc[1] if pc else 0,
                     "spearman": spearman(rv, tv), "kendall": kendall_tau_b(rv, tv),
                     "pick": pk, "regret": tv[best_i] - tv[pi],
                     "regretSe": 0.0 if pi == best_i else math.sqrt(se[best_i] ** 2 + se[pi] ** 2)}
    pairs = [(i, j) for i in range(len(common)) for j in range(i + 1, len(common))]
    row["truthPairs"] = len(pairs)
    row["truthConfidentPairs"] = sum(1 for i, j in pairs if confident(i, j))
    var_t = statistics.pvariance(tv) if len(tv) > 1 else 0.0
    mse = sum(s * s for s in se) / len(se)
    row["reliability"] = (1 - mse / var_t) if var_t > 0 else None
    row["optionsN"] = ns
    row["optionsSe"] = se
    row["optionsBest"] = [i == best_i for i in range(len(common))]
    row["optionsActive"] = [bool(t[k].get("active")) for k in common]
    hp, ep = picks["hand"], picks["eval"]
    if hp != ep:
        d = tv[ep] - tv[hp]
        clear = abs(d) > z * math.sqrt(se[ep] ** 2 + se[hp] ** 2)
        row["discordant"] = {"evalMinusHand": d, "clear": clear,
                             "who": "tie" if d == 0 else ("eval" if d > 0 else "hand")}
    else:
        row["discordant"] = None
    return row


# ---------------------------------------------------------------- summaries

def boot(diffs: list[float], rule: dict[str, Any] = RANK_RULE) -> dict[str, Any] | None:
    return G.paired_bootstrap(diffs, rule["bootstrap"], rule["bootSeed"], rule["ci"]) if diffs else None


def paired(rows: list[dict[str, Any]], key: str, rule: dict[str, Any] = RANK_RULE) -> dict[str, Any]:
    both = [r for r in rows if r["hand"][key] is not None and r["eval"][key] is not None]
    return {"n": len(both), "hand": mean(r["hand"][key] for r in both), "eval": mean(r["eval"][key] for r in both),
            "diff": boot([r["eval"][key] - r["hand"][key] for r in both], rule)}


def sign_test(rows: list[dict[str, Any]]) -> dict[str, Any]:
    disc = [r["discordant"] for r in rows if r["discordant"]]
    ev = sum(1 for d in disc if d["who"] == "eval")
    ha = sum(1 for d in disc if d["who"] == "hand")
    cev = sum(1 for d in disc if d["clear"] and d["who"] == "eval")
    cha = sum(1 for d in disc if d["clear"] and d["who"] == "hand")
    return {"discordant": len(disc), "evalBetter": ev, "handBetter": ha, "tied": len(disc) - ev - ha,
            "p": binom_two_sided(ev, ev + ha), "clearEval": cev, "clearHand": cha,
            "unclear": len(disc) - cev - cha, "pClear": binom_two_sided(cev, cev + cha),
            "meanEvalMinusHand": mean(d["evalMinusHand"] for d in disc)}


def noise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    n_all, n_best, n_other, n_act, n_ret, se_all, se_best = [], [], [], [], [], [], []
    for r in rows:
        for n, s, b, a in zip(r["optionsN"], r["optionsSe"], r["optionsBest"], r["optionsActive"]):
            n_all.append(float(n))
            se_all.append(s)
            (n_best if b else n_other).append(float(n))
            (n_act if a else n_ret).append(float(n))
            if b:
                se_best.append(s)
    pairs = sum(r["truthPairs"] for r in rows)
    conf = sum(r["truthConfidentPairs"] for r in rows)
    rel = [r["reliability"] for r in rows if r["reliability"] is not None]
    return {"playouts": int(sum(n_all)), "n": quantiles(n_all), "nBest": quantiles(n_best), "nOther": quantiles(n_other),
            "nActive": quantiles(n_act), "nRetired": quantiles(n_ret), "se": quantiles(se_all), "seBest": quantiles(se_best),
            "pairs": pairs, "confidentPairs": conf, "indistinguishableShare": (1 - conf / pairs) if pairs else None,
            "reliability": quantiles(rel),
            "regretSeHand": mean(r["hand"]["regretSe"] for r in rows),
            "regretSeEval": mean(r["eval"]["regretSe"] for r in rows)}


def summary(rows: list[dict[str, Any]], rule: dict[str, Any] = RANK_RULE) -> dict[str, Any]:
    return {"decisions": len(rows), "pairwise": paired(rows, "pairAcc", rule), "confident": paired(rows, "confAcc", rule),
            "spearman": paired(rows, "spearman", rule), "kendall": paired(rows, "kendall", rule),
            "regretHand": mean(r["hand"]["regret"] for r in rows), "regretEval": mean(r["eval"]["regret"] for r in rows),
            "agree": mean(0.0 if r["discordant"] else 1.0 for r in rows), "sign": sign_test(rows)}


def decide(s: dict[str, Any], rule: dict[str, Any] = RANK_RULE) -> tuple[bool, list[str]]:
    pw = s["pairwise"]
    why = []
    if pw["n"] < rule["minDecisions"]:
        why.append(f"{pw['n']} decisions with an ordered pair < {rule['minDecisions']} (underpowered)")
    d = pw["diff"]
    if d is None or not (d["lo"] > 0):
        why.append("no decisions" if d is None else
                   f"pairwise accuracy eval - hand {d['estimate']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}]: the interval does not lie above 0")
    return not why, why


# ---------------------------------------------------------------- the command

def analyse(dset: list[dict[str, Any]], truth: dict[str, Any], hand: dict[str, Any], ev: dict[str, Any],
            rule: dict[str, Any] = RANK_RULE) -> dict[str, Any]:
    rows, unread = [], defaultdict(int)
    for d in dset:
        i = str(d["id"])
        if i not in truth:
            unread["no truth answer"] += 1
            continue
        r = analyse_one(truth[i], hand.get(i) or {}, ev.get(i) or {}, rule["confidentZ"])
        if r is None:
            unread["truth or a ranker not ok, or < 2 shared options"] += 1
            continue
        rows.append({"id": i, "stratum": d.get("stratum"), "pair": d.get("pair")} | r)
    s = summary(rows, rule)
    edge, why = decide(s, rule)
    by_stratum = {k: summary([r for r in rows if r["stratum"] == k], rule)
                  for k in sorted({str(r["stratum"]) for r in rows})}
    by_options = {name: summary([r for r in rows if r["bucket"] == name], rule)
                  for _, _, name in BUCKETS if any(r["bucket"] == name for r in rows)}
    return {"set": len(dset), "unread": dict(unread), **s, "noise": noise(rows), "edge": edge, "reasons": why,
            "byStratum": by_stratum, "byOptions": by_options, "rows": rows}


def fmt(x: float | None, p: str = ".3f") -> str:
    return "n/a" if x is None else format(x, p)


def ci(d: dict[str, Any] | None) -> str:
    return "n/a" if not d else f"{d['estimate']:+.4f} [{d['lo']:+.4f}, {d['hi']:+.4f}]"


def render(rep: dict[str, Any], label: str) -> str:
    out = [f"regret_rank ({label}): {rep['decisions']} of {rep['set']} decisions read; unread {rep['unread']}"]
    for k, name in (("pairwise", "pairwise accuracy"), ("confident", "  confident pairs"), ("spearman", "Spearman rho"),
                    ("kendall", "Kendall tau-b")):
        m = rep[k]
        out.append(f"{name:18s} hand {fmt(m['hand'])}  eval {fmt(m['eval'])}  eval - hand {ci(m['diff'])}  (n {m['n']})")
    sg = rep["sign"]
    out.append(f"picks agree {fmt(rep['agree'], '.0%')}; discordant {sg['discordant']}: eval better {sg['evalBetter']}, hand better "
               f"{sg['handBetter']}, equal {sg['tied']} (sign test p {sg['p']:.3f}); clear only: eval {sg['clearEval']}, "
               f"hand {sg['clearHand']}, unclear {sg['unclear']} (p {sg['pClear']:.3f})")
    nz = rep["noise"]
    q = lambda d, k="median": fmt((d or {}).get(k), ".0f")  # noqa: E731
    out.append(f"truth noise: {nz['playouts']} playouts; per option median n {q(nz['n'])} (p10 {q(nz['n'], 'p10')}, "
               f"p90 {q(nz['n'], 'p90')}); best {q(nz['nBest'])}, retired {q(nz['nRetired'])}; median se "
               f"{fmt((nz['se'] or {}).get('median'))} (best {fmt((nz['seBest'] or {}).get('median'))}); "
               f"{fmt(nz['indistinguishableShare'], '.0%')} of option pairs within 1.96 se; median reliability "
               f"{fmt((nz['reliability'] or {}).get('median'), '.2f')}; regret se hand {fmt(nz['regretSeHand'], '.4f')}, "
               f"eval {fmt(nz['regretSeEval'], '.4f')}; mean regret hand {fmt(rep['regretHand'], '.4f')}, "
               f"eval {fmt(rep['regretEval'], '.4f')}")
    for title, grp in (("stratum", rep["byStratum"]), ("options", rep["byOptions"])):
        for k, s in grp.items():
            sg = s["sign"]
            out.append(f"  {title} {k:6s} n {s['decisions']:3d}  pairwise hand {fmt(s['pairwise']['hand'])} eval "
                       f"{fmt(s['pairwise']['eval'])} diff {ci(s['pairwise']['diff'])}  rho hand {fmt(s['spearman']['hand'])} "
                       f"eval {fmt(s['spearman']['eval'])}  discordant {sg['discordant']} ({sg['evalBetter']}:{sg['handBetter']}:{sg['tied']})")
    out.append(("rank rule (D395): EDGE -- the evaluator orders options better than the hand leaf" if rep["edge"] else
                "rank rule (D395): NO EDGE -- " + "; ".join(rep["reasons"]) + "; the leaf track stays stopped"))
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--set", required=True)
    ap.add_argument("--truth", required=True)
    ap.add_argument("--hand", required=True)
    ap.add_argument("--eval", required=True)
    ap.add_argument("--label", default="eval", help="a name for the evaluator in the output (v1, v2)")
    ap.add_argument("--report")
    ap.add_argument("--allow-version-change", action="store_true",
                    help="read answers graded under different code versions (recorded in the report)")
    a = ap.parse_args(argv)
    files = {"truth": a.truth, "hand": a.hand, "eval": a.eval}
    metas = {n: RS.load_meta(p) for n, p in files.items()}
    vers = {n: (m or {}).get("version") for n, m in metas.items()}
    stamped = [n for n in files if vers.get(n)]
    ref = vers[stamped[0]] if stamped else {}
    changed = {n: G.version_diff(ref, vers[n]) for n in stamped if G.version_diff(ref, vers[n])}
    if changed and not a.allow_version_change:
        raise SystemExit(f"regret_rank: tables graded by different code: {changed} -- --allow-version-change (recorded)")
    rounds = {}
    for n in ("hand", "eval"):
        flags = (metas.get(n) or {}).get("serveFlags") or []
        rounds[n] = int(flags[flags.index("--playouts") + 1]) if "--playouts" in flags else None
    ans = {n: {str(x.get("id")): x for x in G.read_jsonl(p)} for n, p in files.items()}
    rep = analyse(G.read_jsonl(a.set), ans["truth"], ans["hand"], ans["eval"])
    # the rule reads the rule's rounds only; other tables are reported without a verdict
    ruled = all(r in (None, RANK_RULE["rankRounds"]) for r in rounds.values())
    if not ruled:
        rep["edge"] = False
        rep["reasons"] = [f"ranked with {rounds} rounds, not the rule's {RANK_RULE['rankRounds']}: descriptive only"] + rep["reasons"]
    head = {"label": a.label, "rule": RANK_RULE, "ruled": ruled, "rounds": rounds, "versions": vers, "versionChanges": changed,
            "inputs": {n: {"path": p, "sha12": G.file_sha12(p) if os.path.isfile(p) else None} for n, p in files.items()}}
    rep = head | rep
    if a.report:
        G.write_json(a.report, rep)
    print(render(rep, a.label))
    return 0


if __name__ == "__main__":
    sys.exit(main())
