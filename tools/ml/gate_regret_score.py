#!/usr/bin/env python3
# mtg-table — tools/ml: gate 2 of the evaluator, the decision-level regret test (D354).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Gate 2 (D354): does the evaluator at the search's leaves pick better moves
than the hand-written leaf?  Prints PASS or FAIL against gates.REGRET_RULE.

    python3 tools/ml/gate_regret_score.py --set set.jsonl --truth truth.jsonl \\
        --hand rank-hand-3.jsonl --eval rank-eval-3.jsonl \\
        [--hand2 rank-hand-12.jsonl --eval2 rank-eval-12.jsonl] --report report.json

For every decision of the set: the TRUTH table is each option's win rate when it
is played and Forge's Default AI plays both seats to the end of the game
(`coach-grade.sh serve`, pool knowledge, 200 rounds with racing; D334-D336).
Each RANKER -- the same rollouts to the end of this turn (the search's live
horizon), scored by the hand leaf through sigma(leaf/500) or by the evaluator's
P(win), 3 rounds on common random numbers -- picks the option with the highest
mean (ties: Forge's own choice, then the table's order).  A ranker's regret is
the truth's best win rate minus the truth's win rate of its pick, over the
options all three tables share.

THE RULE: the paired difference regret(hand) - regret(eval) over decisions, its
mean and a 95% percentile bootstrap interval (10,000 resamples of decisions,
seed fixed): PASS when the mean is above 0 AND the interval's lower end is above
0, on at least 240 scored decisions.  (The difference does not depend on the
truth's maximum, so the max's upward bias cancels.)  A decision is scored when
its truth and both ranker answers are `ok` (the truth to the end of the game,
`measure: wins`) with two or more shared options.  The secondary rankers (12
rounds) and Forge's own choice are reported, not gated.  Answers graded under
different code versions (gate_regret_grade.py's meta) are refused (D341).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402


def table(ans: dict[str, Any] | None) -> dict[str, dict[str, Any]] | None:
    """token -> option (aliases left out: they repeat their option's numbers), or None when unusable."""
    if not ans or ans.get("status") != "ok":
        return None
    out = {}
    for o in ans.get("options") or []:
        if o.get("alias") or o.get("winRate") is None or not o.get("n"):
            continue
        out[str(o["token"])] = o
    return out if len(out) >= 2 else None


def pick(rank: dict[str, dict[str, Any]], common: list[str]) -> str:
    """The ranker's top option among `common`: highest mean; ties to Forge's choice, then the table's order."""
    best = None
    for k in common:
        o = rank[k]
        key = (float(o["winRate"]), 1 if o.get("forge") else 0)
        if best is None or key > best[0]:
            best = (key, k)
    return best[1]  # type: ignore[index]


def score_one(truth: dict[str, Any], rankers: dict[str, dict[str, Any] | None]) -> dict[str, Any] | None:
    t = table(truth)
    if t is None or truth.get("measure") != "wins":
        return None
    tabs = {n: table(a) for n, a in rankers.items()}
    if any(v is None for v in tabs.values()):
        return None
    common = [k for k in t if all(k in v for v in tabs.values())]   # the truth's order
    if len(common) < 2:
        return None
    best = max(float(t[k]["winRate"]) for k in common)
    out: dict[str, Any] = {"options": len(common), "best": best,
                           "lostOptions": len(t) - len(common)}
    for n, v in tabs.items():
        c = pick(v, common)  # type: ignore[arg-type]
        out[n] = {"pick": c, "regret": best - float(t[c]["winRate"])}
    forge = [k for k in common if t[k].get("forge")]
    out["forge"] = {"pick": forge[0], "regret": best - float(t[forge[0]]["winRate"])} if forge else None
    return out


def decide(diffs: list[float], rule: dict[str, Any]) -> tuple[bool, dict[str, Any], list[str]]:
    bs = G.paired_bootstrap(diffs, rule["bootstrap"], rule["bootSeed"], rule["ci"])
    why = []
    if len(diffs) < rule["minScored"]:
        why.append(f"{len(diffs)} scored decisions < {rule['minScored']} (underpowered)")
    if not (bs["estimate"] > 0):
        why.append(f"mean regret(hand) - regret(eval) = {bs['estimate']:+.4f} is not above 0")
    elif not (bs["lo"] > 0):
        why.append(f"its 95% interval [{bs['lo']:+.4f}, {bs['hi']:+.4f}] does not exclude 0")
    return not why, bs, why


def load_meta(path: str) -> dict[str, Any] | None:
    p = path + ".meta.json"
    if not os.path.isfile(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--set", required=True)
    ap.add_argument("--truth", required=True)
    ap.add_argument("--hand", required=True)
    ap.add_argument("--eval", required=True)
    ap.add_argument("--hand2")
    ap.add_argument("--eval2")
    ap.add_argument("--report")
    ap.add_argument("--allow-version-change", action="store_true",
                    help="score answers graded under different code versions (recorded in the report)")
    a = ap.parse_args(argv)
    rule = G.REGRET_RULE
    dset = G.read_jsonl(a.set)
    files = {"truth": a.truth, "hand": a.hand, "eval": a.eval}
    if a.hand2 and a.eval2:
        files |= {"hand2": a.hand2, "eval2": a.eval2}
    ans = {n: {str(x.get("id")): x for x in G.read_jsonl(p)} for n, p in files.items()}
    metas = {n: load_meta(p) for n, p in files.items()}
    # D341: one code version across every table, or the reason is recorded
    vers = {n: (m or {}).get("version") for n, m in metas.items()}
    stamped = [n for n in files if vers.get(n)]
    ref = vers[stamped[0]] if stamped else {}
    changed = {n: G.version_diff(ref, vers[n]) for n in stamped if G.version_diff(ref, vers[n])}
    unstamped = [n for n in files if not vers.get(n)]
    if unstamped:
        print(f"WARNING: no version stamp (<file>.meta.json) for {', '.join(unstamped)}: not graded by gate_regret_grade.py")
    if changed and not a.allow_version_change:
        raise SystemExit(f"gate_regret_score: tables graded by different code: {changed} -- regrade, or "
                         "--allow-version-change (recorded)")
    # the rankers must be the rule's
    for n in ("hand", "eval"):
        m = metas.get(n) or {}
        flags = m.get("serveFlags") or []
        if flags and flags[flags.index("--playouts") + 1] != str(rule["rankRounds"]):
            raise SystemExit(f"gate_regret_score: --{n} was ranked with {flags[flags.index('--playouts') + 1]} rounds, "
                             f"not the rule's {rule['rankRounds']}")
    if (metas.get("eval") or {}).get("extra", {}).get("leaf", "eval:") == "hand":
        raise SystemExit("gate_regret_score: --eval was ranked with the hand leaf")

    rows: list[dict[str, Any]] = []
    unscored: Counter = Counter()
    for d in dset:
        i = str(d["id"])
        tr = ans["truth"].get(i)
        if tr is None:
            unscored["no truth answer"] += 1
            continue
        primary = score_one(tr, {"hand": ans["hand"].get(i), "eval": ans["eval"].get(i)})
        if primary is None:
            unscored["truth or a ranker not ok, or < 2 shared options"] += 1
            continue
        row = {"id": i, "stratum": d.get("stratum"), "pair": d.get("pair"), "ver": d.get("ver")} | primary
        if "hand2" in ans:
            sec = score_one(tr, {"hand2": ans["hand2"].get(i), "eval2": ans["eval2"].get(i)})
            if sec:
                row["hand2"], row["eval2"] = sec["hand2"], sec["eval2"]
        rows.append(row)
    diffs = [r["hand"]["regret"] - r["eval"]["regret"] for r in rows]
    ok, bs, why = decide(diffs, rule)

    def mean(xs):
        xs = list(xs)
        return sum(xs) / len(xs) if xs else None

    by: dict[str, Any] = {}
    groups = defaultdict(list)
    for r in rows:
        groups[r["stratum"]].append(r)
    for s, rs in sorted(groups.items()):
        by[s] = {"n": len(rs), "regretHand": mean(r["hand"]["regret"] for r in rs),
                 "regretEval": mean(r["eval"]["regret"] for r in rs),
                 "regretForge": mean(r["forge"]["regret"] for r in rs if r["forge"]),
                 "agree": mean(1.0 if r["hand"]["pick"] == r["eval"]["pick"] else 0.0 for r in rs)}
    rep: dict[str, Any] = {
        "gate": "regret", "rule": rule, "scored": len(rows), "set": len(dset), "unscored": dict(unscored),
        "regretHand": mean(r["hand"]["regret"] for r in rows), "regretEval": mean(r["eval"]["regret"] for r in rows),
        "regretForge": mean(r["forge"]["regret"] for r in rows if r["forge"]),
        "agree": mean(1.0 if r["hand"]["pick"] == r["eval"]["pick"] else 0.0 for r in rows),
        "diffHandMinusEval": bs, "byStratum": by, "versions": vers, "versionChanges": changed, "unstamped": unstamped,
        "pass": ok, "reasons": why, "rows": rows,
    }
    if "hand2" in ans:
        sec = [r["hand2"]["regret"] - r["eval2"]["regret"] for r in rows if "hand2" in r]
        rep["secondary12"] = {"n": len(sec), "diff": G.paired_bootstrap(sec, rule["bootstrap"], rule["bootSeed"]) if sec else None}
    if a.report:
        G.write_json(a.report, rep)
    print(f"scored {len(rows)} of {len(dset)} decisions; unscored {dict(unscored)}")
    if rows:
        print(f"mean regret: hand {rep['regretHand']:.4f}  eval {rep['regretEval']:.4f}  forge {float('nan') if rep['regretForge'] is None else rep['regretForge']:.4f}"
              f"  (picks agree {rep['agree']:.0%})")
        for s, b in by.items():
            print(f"  {s:6s} n {b['n']:3d}  hand {b['regretHand']:.4f}  eval {b['regretEval']:.4f}  agree {b['agree']:.0%}")
        print(f"hand - eval: {bs['estimate']:+.4f} [{bs['lo']:+.4f}, {bs['hi']:+.4f}] (95%, {bs['boots']} resamples of decisions)")
    if rep.get("secondary12") and rep["secondary12"]["diff"]:
        s2 = rep["secondary12"]["diff"]
        print(f"secondary (12 rounds, not gating): {s2['estimate']:+.4f} [{s2['lo']:+.4f}, {s2['hi']:+.4f}]")
    print(G.verdict_line("gate 2 (regret)", ok, why))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
