# mtg-table — tools/ml tests: gate 2's truth tables read over all options (regret_rank.py, D395).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest tools/ml/tests/test_regret_rank.py   (from the repo root)

Synthetic answer files in gate_regret_grade.py's format: an evaluator that
orders every option right beats a hand leaf that only finds the best one, the
same ranker twice has no edge, the small statistics match hand-computed values,
the discordant sign test and the truth's noise count what they should, the
rule refuses the 12-round tables and mixed code versions, and the report reads
through gate_metrics.py.  Standard library only.
"""
from __future__ import annotations

import io
import json
import math
import os
import random
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import gate_metrics as M  # noqa: E402
import regret_rank as R  # noqa: E402


def ans(id_, opts, measure="leaf", n=3):
    """opts = [(token, winRate, forge)] or (token, winRate, forge, n)."""
    out = []
    for o in opts:
        t, w, fg = o[:3]
        out.append({"token": t, "winRate": w, "n": o[3] if len(o) > 3 else n, "forge": fg})
    return {"id": id_, "status": "ok", "measure": measure, "options": out}


def files(tmp, n=300, seed=7, eval_mode="good", hand_mode="top", meta=None):
    """n decisions of 2-9 options; truth ascending by index with noise-free gaps of 0.05.
    good: the right order; top: only the best on top, the rest reversed; same: = hand."""
    rng = random.Random(seed)
    rows = {"set": [], "truth": [], "hand": [], "eval": []}
    for i in range(n):
        k = 2 + i % 8
        toks = [f"o{j}" for j in range(k)]
        tv = [0.3 + 0.05 * j for j in range(k)]
        rows["set"].append({"id": f"d{i}", "stratum": ("attack", "block", "spell")[i % 3]})
        rows["truth"].append(ans(f"d{i}", [(t, v, j == 0, 200 if j == k - 1 else 40) for j, (t, v) in enumerate(zip(toks, tv))],
                                 measure="wins"))

        def ranker(mode):
            if mode == "good":
                return [0.2 + 0.1 * j + rng.random() * 0.01 for j in range(k)]
            # the best on top, every other pair reversed
            return [0.6 - 0.05 * j for j in range(k - 1)] + [0.95]
        rows["hand"].append(ans(f"d{i}", list(zip(toks, ranker(hand_mode), [j == 0 for j in range(k)]))))
        ev = rows["hand"][-1] if eval_mode == "same" else ans(f"d{i}", list(zip(toks, ranker(eval_mode), [j == 0 for j in range(k)])))
        rows["eval"].append(ev)
    paths = {}
    for name, rs in rows.items():
        p = os.path.join(tmp, name + ".jsonl")
        with open(p, "w") as f:
            for r in rs:
                f.write(json.dumps(r) + "\n")
        paths[name] = p
        if meta and name in meta:
            with open(p + ".meta.json", "w") as f:
                json.dump(meta[name], f)
    return paths


def run(paths, *extra):
    rep = os.path.join(os.path.dirname(paths["set"]), "rank.json")
    buf = io.StringIO()
    with redirect_stdout(buf):
        code = R.main(["--set", paths["set"], "--truth", paths["truth"], "--hand", paths["hand"],
                       "--eval", paths["eval"], "--report", rep, *extra])
    with open(rep) as f:
        return code, json.load(f), buf.getvalue(), rep


class StatsTest(unittest.TestCase):
    def test_rule(self):
        self.assertEqual((R.RANK_RULE["bootstrap"], R.RANK_RULE["ci"], R.RANK_RULE["minDecisions"], R.RANK_RULE["rankRounds"]),
                         (10000, 0.95, 240, 3))

    def test_ranks_and_correlations(self):
        self.assertEqual(R.avg_ranks([3.0, 1.0, 3.0, 2.0]), [3.5, 1.0, 3.5, 2.0])
        self.assertAlmostEqual(R.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1.0)
        self.assertAlmostEqual(R.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1.0)
        self.assertIsNone(R.spearman([1, 1, 1], [1, 2, 3]))
        # tau-b with one tie in a: concordant 2, discordant 0, ties in a 1 -> 2 / sqrt(3 * 2)
        self.assertAlmostEqual(R.kendall_tau_b([1, 1, 2], [1, 2, 3]), 2 / math.sqrt(6))
        self.assertAlmostEqual(R.kendall_tau_b([1, 2, 3], [3, 2, 1]), -1.0)

    def test_pair_accuracy(self):
        # truth 0.5, 0.4, 0.3: the ranker gets (0,1) right, ties (0,2), reverses (1,2)
        acc, n = R.pair_accuracy([0.5, 0.4, 0.3], [0.9, 0.5, 0.9])
        self.assertEqual(n, 3)
        self.assertAlmostEqual(acc, (1 + 0.5 + 0) / 3)
        self.assertIsNone(R.pair_accuracy([0.5, 0.5], [0.1, 0.2]), "a constant truth orders nothing")

    def test_sign_test_p(self):
        self.assertEqual(R.binom_two_sided(0, 0), 1.0)
        self.assertAlmostEqual(R.binom_two_sided(0, 5), 2 / 32)
        self.assertAlmostEqual(R.binom_two_sided(5, 10), 1.0)
        self.assertLess(R.binom_two_sided(26, 28 + 26), 1.0)

    def test_option_se(self):
        self.assertAlmostEqual(R.option_se({"winRate": 0.5, "n": 100}), 0.05)
        self.assertAlmostEqual(R.option_se({"winRate": 0.5, "n": 100, "winLo": 0.4, "winHi": 0.6}), 0.2 / (2 * 1.959964))
        self.assertGreater(R.option_se({"winRate": 1.0, "n": 40}), 0, "a perfect record still has an error")


class RankTest(unittest.TestCase):
    def setUp(self):
        # the rule's 10,000 resamples x 32 summaries take a minute in pure Python; 400 keep the tests quick
        p = mock.patch.dict(R.RANK_RULE, {"bootstrap": 400})
        p.start()
        self.addCleanup(p.stop)

    def test_better_ordering_is_an_edge(self):
        with tempfile.TemporaryDirectory() as d:
            code, r, out, _ = run(files(d))
            self.assertEqual(code, 0)
            self.assertTrue(r["edge"], r["reasons"])
            self.assertEqual(r["decisions"], 300)
            self.assertAlmostEqual(r["pairwise"]["eval"], 1.0)
            self.assertLess(r["pairwise"]["hand"], r["pairwise"]["eval"])
            self.assertGreater(r["pairwise"]["diff"]["lo"], 0)
            self.assertAlmostEqual(r["spearman"]["eval"], 1.0)
            # both pick the best option everywhere: the gate-2 regret cannot tell them apart
            self.assertEqual(r["regretHand"], 0.0)
            self.assertEqual(r["regretEval"], 0.0)
            self.assertEqual(r["sign"]["discordant"], 0)
            self.assertIn("EDGE", out)
            self.assertEqual(set(r["byStratum"]), {"attack", "block", "spell"})
            self.assertEqual(set(r["byOptions"]), {"2", "3-4", "5-8", "9+"})
            # two-option decisions: both rankers order the one pair right
            self.assertAlmostEqual(r["byOptions"]["2"]["pairwise"]["hand"], 1.0)

    def test_same_ranker_is_no_edge(self):
        with tempfile.TemporaryDirectory() as d:
            _, r, out, _ = run(files(d, eval_mode="same"))
            self.assertFalse(r["edge"])
            self.assertEqual(r["pairwise"]["diff"]["estimate"], 0.0)
            self.assertIn("NO EDGE", out)
            self.assertIn("the leaf track stays stopped", out)

    def test_underpowered_is_no_edge(self):
        with tempfile.TemporaryDirectory() as d:
            _, r, _, _ = run(files(d, n=60))
            self.assertFalse(r["edge"])
            self.assertTrue(any("underpowered" in x for x in r["reasons"]))

    def test_discordant_sign_test(self):
        # three decisions: eval picks the truth's best, hand the worst, in two; the reverse in one
        t = [ans(f"d{i}", [("a", 0.6, True, 200), ("b", 0.3, False, 200)], measure="wins") for i in range(3)]
        good = lambda i: ans(f"d{i}", [("a", 0.7, True), ("b", 0.2, False)])  # noqa: E731
        bad = lambda i: ans(f"d{i}", [("a", 0.2, True), ("b", 0.7, False)])  # noqa: E731
        rows = [R.analyse_one(t[0], bad(0), good(0)), R.analyse_one(t[1], bad(1), good(1)), R.analyse_one(t[2], good(2), bad(2))]
        s = R.sign_test(rows)
        self.assertEqual((s["discordant"], s["evalBetter"], s["handBetter"], s["tied"]), (3, 2, 1, 0))
        self.assertEqual((s["clearEval"], s["clearHand"]), (2, 1), "0.3 apart at 200 playouts is clear")
        self.assertAlmostEqual(s["p"], 1.0)

    def test_noise(self):
        with tempfile.TemporaryDirectory() as d:
            _, r, _, _ = run(files(d))
            nz = r["noise"]
            # every decision's best (last) option had 200 playouts, the others 40
            self.assertEqual(nz["nBest"]["median"], 200)
            self.assertEqual(nz["nOther"]["median"], 40)
            self.assertEqual(nz["playouts"], sum(200 + 40 * (1 + i % 8) for i in range(300)))
            self.assertGreater(nz["indistinguishableShare"], 0, "0.05 apart at 40 playouts is within the noise")
            self.assertIsNotNone(nz["reliability"])

    def test_unreadable_and_aliases(self):
        t = ans("x", [("a", 0.6, True, 100), ("b", 0.5, False, 100)], measure="wins")
        good = ans("x", [("a", 0.7, True), ("b", 0.6, False)])
        self.assertIsNone(R.analyse_one(dict(t, measure="leaf"), good, good), "a leaf-measured truth is not the truth")
        self.assertIsNone(R.analyse_one(t, dict(good, status="error"), good))
        al = ans("x", [("a", 0.7, True), ("b", 0.6, False)])
        al["options"].append({"token": "a2", "alias": "a", "winRate": 0.1, "n": 3})
        self.assertEqual(R.analyse_one(t, al, good)["options"], 2)

    def test_rule_reads_three_rounds_only_and_one_version(self):
        v = {"bridgeTree": "t1", "bridgeDirty": False, "jarSha": "j"}
        with tempfile.TemporaryDirectory() as d:
            p = files(d, meta={"truth": {"version": v, "serveFlags": ["--playouts", "200"]},
                               "hand": {"version": v, "serveFlags": ["--playouts", "12"]},
                               "eval": {"version": v, "serveFlags": ["--playouts", "12"]}})
            _, r, _, _ = run(p)
            self.assertFalse(r["ruled"])
            self.assertFalse(r["edge"])
            self.assertIn("descriptive only", r["reasons"][0])
        with tempfile.TemporaryDirectory() as d:
            p = files(d, meta={"truth": {"version": v}, "eval": {"version": dict(v, bridgeTree="t2")}})
            with self.assertRaises(SystemExit):
                run(p)
            _, r, _, _ = run(p, "--allow-version-change")
            self.assertEqual(r["versionChanges"], {"eval": ["bridgeTree"]})

    def test_flat_metrics(self):
        self.assertEqual(R.RANK_RULE["bootstrap"], 400)
        with tempfile.TemporaryDirectory() as d:
            _, _, _, rep = run(files(d))
            m = M.m_report(rep)
            self.assertEqual(m["written"], 1)
            self.assertEqual(m["edge"], 1)
            self.assertEqual(m["decisions"], 300)
            self.assertIn("pairwise_diff_lo", m)
            self.assertIn("sign_discordant", m)
            self.assertIn("noise_nBest_median", m)


if __name__ == "__main__":
    unittest.main()
