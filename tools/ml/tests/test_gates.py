# mtg-table — tools/ml tests: the evaluator gates (D354), on synthetic data.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest tools/ml/tests/test_gates.py   (from the repo root)

Every gate's rule is driven with synthetic numbers whose answer is known --
a clear win passes, a tie, a loss and too little data fail -- and the plumbing
(the held-out split, the decision set, the resumable grading driver, the
ladder registration) runs on the committed fixtures and a fake `serve`.  No
engine is started.  The numpy parts skip without numpy, saying so.
"""
from __future__ import annotations

import json
import os
import random
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import gates as G  # noqa: E402
import gate_fit as F  # noqa: E402
import gate_regret_build as B  # noqa: E402
import gate_regret_grade as RG  # noqa: E402
import gate_regret_score as RS  # noqa: E402
import gate_sprt as S  # noqa: E402
import gate_metrics as M  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
DECISIONS = os.path.join(ROOT, "fixtures", "cubelab", "decisions")


class BootstrapTest(unittest.TestCase):
    def test_ratio_and_interval(self):
        groups = [(2.0, 4.0), (1.0, 1.0), (3.0, 5.0)]
        bs = G.bootstrap_groups(groups, 500, 1)
        self.assertAlmostEqual(bs["estimate"], 6.0 / 10.0)
        self.assertLessEqual(bs["lo"], bs["estimate"])
        self.assertGreaterEqual(bs["hi"], bs["estimate"])

    def test_paired_clear_and_null(self):
        rng = random.Random(3)
        clear = [0.05 + rng.gauss(0, 0.02) for _ in range(300)]
        self.assertGreater(G.paired_bootstrap(clear, 1000, 1)["lo"], 0)
        null = [rng.gauss(0, 0.05) for _ in range(300)]
        b = G.paired_bootstrap(null, 1000, 1)
        self.assertLess(b["lo"], 0)
        self.assertGreater(b["hi"], 0)

    def test_deterministic(self):
        d = [0.1, -0.2, 0.3, 0.05]
        self.assertEqual(G.paired_bootstrap(d, 200, 9), G.paired_bootstrap(d, 200, 9))


# ---------------------------------------------------------------- gate 1

def fit_report(**over):
    rep = {"testPairs": 80, "reservedChecked": True,
           "decisionRows": {"diffCoreMinusEval": {"estimate": 0.02, "lo": 0.01, "hi": 0.03}},
           "leafRows": {"positions": 5000, "diff": {"estimate": 0.04, "lo": 0.02, "hi": 0.06}},
           "calibration": {"ece": 0.01, "badBins": [], "worstBinGap": 0.02}}
    for k, v in over.items():
        cur = rep
        parts = k.split("__")
        for p in parts[:-1]:
            cur = cur[p]
        cur[parts[-1]] = v
    return rep


class FitRuleTest(unittest.TestCase):
    def test_pass(self):
        ok, why = F.decide(fit_report())
        self.assertTrue(ok, why)

    def test_each_clause_fails_alone(self):
        cases = {
            "A": {"decisionRows__diffCoreMinusEval": {"estimate": 0.01, "lo": -0.001, "hi": 0.02}},
            "B": {"leafRows__diff": {"estimate": -0.01, "lo": -0.02, "hi": 0.0}},
            "C: ECE": {"calibration__ece": 0.05},
            "C: bins": {"calibration__badBins": ["0.8-0.9"]},
            "D: 10 held-out": {"testPairs": 10},
            "D: 100 turn-end": {"leafRows__positions": 100},
            "reserved": {"reservedChecked": False},
        }
        for tag, over in cases.items():
            ok, why = F.decide(fit_report(**over))
            self.assertFalse(ok, tag)
            self.assertTrue(any(tag.split(":")[0] in w or tag in w for w in why), (tag, why))

    def test_leaf_comparison_reads_held_out_logs_only(self):
        rows = [{"file": "a/g1-seat0.jsonl.gz", "won": 1, "leaf": 400.0, "eval": 0.9},
                {"file": "a/g1-seat0.jsonl.gz", "won": 1, "leaf": -100.0, "eval": 0.7},
                {"file": "b/g1-seat0.jsonl.gz", "won": 0, "leaf": 0.0, "eval": 0.5},   # not held out
                {"file": "a/g1-seat1.jsonl.gz", "won": 0, "leaf": 50.0}]                # no eval
        r = F.leaf_comparison(rows, {"a/g1-seat0.jsonl.gz": "p1", "a/g1-seat1.jsonl.gz": "p1"}, 500.0, 100)
        self.assertEqual(r["positions"], 2)
        self.assertEqual(r["droppedNotHeldOut"], 2)
        self.assertLess(r["loglossEval"], r["loglossLeaf"])

    def test_leaf_scale_sources(self):
        self.assertEqual(F.leaf_scale("320")[0], 320.0)
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "s.json")
            with open(p, "w") as f:
                json.dump({"scale": 612.5}, f)
            self.assertEqual(F.leaf_scale(p), (612.5, p))
            self.assertEqual(F.leaf_scale(None, d)[0], 500.0)


@unittest.skipIf(np is None, "numpy is not installed")
class FitEndToEndTest(unittest.TestCase):
    """dataset.py on the committed fixtures -> a tiny model split by pair -> heldout -> score."""

    def test_heldout_and_score(self):
        import dataset as D
        import train_eval as T
        tmp = tempfile.mkdtemp()
        try:
            data = os.path.join(tmp, "data")
            D.build([FIXTURES], [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE], data, quiet=True,
                    reserved={})
            model = os.path.join(tmp, "m.json")
            T.main([data, "--out", model, "--split-by", "pair", "--hidden", "4", "--dim", "2", "--epochs", "3",
                    "--patience", "3"])
            lst = os.path.join(tmp, "heldout.txt")
            self.assertEqual(F.main(["heldout", "--model", model, "--out", lst]), 0)
            with open(lst) as f:
                files = [x.strip() for x in f if x.strip()]
            self.assertTrue(files)
            h = G.heldout(data, "pair")
            self.assertFalse(h["pairs"] & h["trainPairs"])
            # synthetic Java rows: the evaluator sharp and right, the leaf flat, plus one log that is not held out
            rng = random.Random(1)
            rows = []
            for fpath in files:
                for _ in range(5):
                    won = rng.random() < 0.5
                    rows.append({"file": fpath, "won": int(won), "leaf": rng.gauss(0, 50), "eval": 0.8 if won else 0.2})
            rows.append({"file": "elsewhere/x.jsonl", "won": 1, "leaf": 0, "eval": 0.5})
            lr = os.path.join(tmp, "rows.jsonl")
            with open(lr, "w") as f:
                for r in rows:
                    f.write(json.dumps(r) + "\n")
            rep = os.path.join(tmp, "rep.json")
            code = F.main(["score", "--model", model, "--leaf-rows", lr, "--leaf-scale", "500", "--report", rep])
            with open(rep) as f:
                r = json.load(f)
            self.assertEqual(code, 1, "22 fixture games are far too few: the gate must not pass")
            self.assertFalse(r["pass"])
            self.assertTrue(any(w.startswith("D:") for w in r["reasons"]), r["reasons"])
            self.assertEqual(r["leafRows"]["droppedNotHeldOut"], 1)
            self.assertGreater(r["leafRows"]["diff"]["estimate"], 0, "the sharp synthetic evaluator beats the flat leaf")
            self.assertEqual(r["splitBy"], "pair")
        finally:
            shutil.rmtree(tmp)


# ---------------------------------------------------------------- gate 2

def answer(id_, opts, status="ok", measure="wins"):
    """A serve answer: opts = [(token, winRate, forge)]."""
    return {"id": id_, "status": status, "measure": measure,
            "options": [{"token": t, "winRate": w, "n": 10, "forge": fg} for t, w, fg in opts]}


def regret_files(tmp, n=300, eval_good=True, seed=5):
    """n decisions with three options; the truth's best is `a`; the good ranker sees `a` best, the bad one `c`."""
    rng = random.Random(seed)
    dset, truth, hand, ev = [], [], [], []
    for i in range(n):
        id_ = f"d{i}"
        dset.append({"id": id_, "stratum": ("spell", "attack", "block")[i % 3]})
        ta, tb, tc = 0.6 + rng.gauss(0, 0.02), 0.5, 0.4
        truth.append(answer(id_, [("a", ta, False), ("b", tb, True), ("c", tc, False)]))
        good = answer(id_, [("a", 0.7, False), ("b", 0.6, True), ("c", 0.5, False)], measure="leaf")
        bad = answer(id_, [("a", 0.5, False), ("b", 0.6, True), ("c", 0.7, False)], measure="leaf")
        # the bad ranker is right a third of the time
        if i % 3 == 0:
            bad = good
        hand.append(bad if eval_good else good)
        ev.append(good if eval_good else bad)
    paths = {}
    for name, rows in (("set", dset), ("truth", truth), ("hand", hand), ("eval", ev)):
        p = os.path.join(tmp, name + ".jsonl")
        with open(p, "w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
        paths[name] = p
    return paths


class RegretScoreTest(unittest.TestCase):
    def run_score(self, paths, *extra):
        rep = os.path.join(os.path.dirname(paths["set"]), "rep.json")
        code = RS.main(["--set", paths["set"], "--truth", paths["truth"], "--hand", paths["hand"],
                        "--eval", paths["eval"], "--report", rep, *extra])
        with open(rep) as f:
            return code, json.load(f)

    def test_better_evaluator_passes(self):
        with tempfile.TemporaryDirectory() as d:
            code, r = self.run_score(regret_files(d))
            self.assertEqual(code, 0, r["reasons"])
            self.assertTrue(r["pass"])
            self.assertEqual(r["scored"], 300)
            self.assertAlmostEqual(r["regretEval"], 0.0, places=9)
            self.assertGreater(r["regretHand"], 0.1)
            self.assertAlmostEqual(r["regretForge"], sum(0.6 - 0.5 for _ in range(1)) , delta=0.01)

    def test_worse_evaluator_fails(self):
        with tempfile.TemporaryDirectory() as d:
            code, r = self.run_score(regret_files(d, eval_good=False))
            self.assertEqual(code, 1)
            self.assertIn("not above 0", r["reasons"][0])

    def test_same_ranker_fails(self):
        with tempfile.TemporaryDirectory() as d:
            p = regret_files(d)
            shutil.copyfile(p["eval"], p["hand"])
            code, r = self.run_score(p)
            self.assertEqual(code, 1)
            self.assertEqual(r["diffHandMinusEval"]["estimate"], 0)

    def test_underpowered_fails(self):
        with tempfile.TemporaryDirectory() as d:
            code, r = self.run_score(regret_files(d, n=150))
            self.assertEqual(code, 1)
            self.assertTrue(any("underpowered" in w for w in r["reasons"]))

    def test_unusable_answers_are_unscored(self):
        truth = answer("x", [("a", 0.6, False), ("b", 0.5, True)])
        good = answer("x", [("a", 0.7, False), ("b", 0.6, True)], measure="leaf")
        self.assertIsNotNone(RS.score_one(truth, {"hand": good, "eval": good}))
        self.assertIsNone(RS.score_one(answer("x", [("a", 0.6, False), ("b", 0.5, True)], measure="leaf"),
                                       {"hand": good, "eval": good}), "a leaf-measure truth is no truth")
        self.assertIsNone(RS.score_one(truth, {"hand": dict(good, status="error"), "eval": good}))
        self.assertIsNone(RS.score_one(truth, {"hand": answer("x", [("a", 0.7, False), ("z", 0.1, True)]), "eval": good}),
                          "one shared option is not a ranking")

    def test_ties_go_to_forge_and_aliases_are_ignored(self):
        tie = {"a": {"winRate": 0.5, "forge": False}, "b": {"winRate": 0.5, "forge": True}}
        self.assertEqual(RS.pick(tie, ["a", "b"]), "b")
        ans = {"status": "ok", "options": [{"token": "a", "winRate": 0.5, "n": 3}, {"token": "a2", "alias": "a", "winRate": 0.5, "n": 3},
                                           {"token": "b", "winRate": 0.4, "n": 3}]}
        self.assertEqual(sorted(RS.table(ans)), ["a", "b"])

    def test_paired_difference_ignores_the_truth_max(self):
        """regret(hand) - regret(eval) = truth(eval pick) - truth(hand pick): the max cancels."""
        t = answer("x", [("a", 0.9, False), ("b", 0.5, True), ("c", 0.4, False)])
        h = answer("x", [("a", 0.1, False), ("b", 0.2, True), ("c", 0.9, False)], measure="leaf")
        e = answer("x", [("a", 0.1, False), ("b", 0.9, True), ("c", 0.2, False)], measure="leaf")
        r = RS.score_one(t, {"hand": h, "eval": e})
        self.assertAlmostEqual(r["hand"]["regret"] - r["eval"]["regret"], 0.5 - 0.4)

    def test_version_mismatch_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            p = regret_files(d)
            G.write_json(p["truth"] + ".meta.json", {"version": {"bridgeTree": "aaa", "bridgeDirty": False, "jarSha": "j"}})
            G.write_json(p["hand"] + ".meta.json", {"version": {"bridgeTree": "bbb", "bridgeDirty": False, "jarSha": "j"},
                                                    "serveFlags": ["--playouts", "3"]})
            with self.assertRaises(SystemExit):
                self.run_score(p)
            code, r = self.run_score(p, "--allow-version-change")
            self.assertIn("hand", r["versionChanges"])

    def test_rankers_must_use_the_rule_rounds(self):
        with tempfile.TemporaryDirectory() as d:
            p = regret_files(d)
            G.write_json(p["eval"] + ".meta.json", {"serveFlags": ["--playouts", "8"], "extra": {"leaf": "eval:m.json"}})
            with self.assertRaises(SystemExit):
                self.run_score(p)


class RegretBuildTest(unittest.TestCase):
    def test_stratum(self):
        self.assertEqual(B.stratum({"kind": "priority", "phase": "MAIN1", "options": ["pass", "cast:3"]}), "spell")
        self.assertIsNone(B.stratum({"kind": "priority", "phase": "MAIN1", "options": ["pass", "land:3"]}))
        self.assertIsNone(B.stratum({"kind": "priority", "phase": "COMBAT_DECLARE_BLOCKERS", "options": ["pass", "cast:3"]}))
        self.assertEqual(B.stratum({"kind": "attack", "options": ["attack:none", "attack:4"]}), "attack")
        self.assertIsNone(B.stratum({"kind": "block", "options": ["block:none"]}))
        self.assertIsNone(B.stratum({"kind": "target", "options": ["target:1", "target:2"]}))

    def test_select_is_order_and_rebuild_only(self):
        cands = [{"id": f"s{i}", "stratum": "spell"} for i in range(5)] + [{"id": "a0", "stratum": "attack"}]
        ok = {"status": "ok", "options": [{"token": "x"}, {"token": "y"}]}
        screen = {"s0": ok, "s1": {"status": "unsupported"}, "s2": ok, "s3": ok, "s4": ok,
                  "a0": {"status": "ok", "options": [{"token": "x"}, {"token": "x2", "alias": "x"}]}}
        got = B.select(cands, screen, 2)
        self.assertEqual([c["id"] for c in got], ["s0", "s2"])

    def test_scan_the_committed_decision_recording(self):
        """fixtures/cubelab/decisions: one lab game with decision records, both chairs."""
        import encode as E
        g = next(iter(E.read_games(os.path.join(DECISIONS, "games", "101", "g1-seat0.jsonl.gz"))))
        pair = g.match_key()
        with tempfile.TemporaryDirectory() as d:
            cands, counts = B.scan([DECISIONS], {pair}, None, d, ROOT)
            self.assertTrue(cands, dict(counts))
            types = [c["type"] for c in cands]
            self.assertEqual(len(types), len(set(types)), "one decision per game and type (both chairs)")
            for c in cands:
                self.assertEqual(c["mode"], "review")
                self.assertNotIn("oppDeck", c)
                with open(c["oppPool"]) as f:
                    names = [x for x in f if not x.startswith("#")]
                self.assertGreaterEqual(len(names), 80, "a pool, not a deck (D348's live guard wants >= 80)")
            none, counts2 = B.scan([DECISIONS], set(), None, d, ROOT)
            self.assertEqual(none, [])
            self.assertGreater(counts2["deck pair not held out"], 0)


FAKE_SERVE = r'''
import json, sys, os, time
log = os.environ["FAKE_LOG"]
print('{"ready":true}', flush=True)
for line in sys.stdin:
    req = json.loads(line)
    with open(log, "a") as f:
        f.write(json.dumps({"req": req, "argv": sys.argv[1:]}) + "\n")
    if req["id"] == "hang":
        time.sleep(60)
    if req["id"] == "die":
        sys.exit(3)
    print(json.dumps({"id": req["id"], "status": "ok", "measure": "wins", "playouts": 4,
                      "options": [{"token": "a", "winRate": 0.5, "n": 2}, {"token": "b", "winRate": 0.4, "n": 2}]}), flush=True)
'''


class GradeDriverTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.fake = os.path.join(self.d, "fake.py")
        with open(self.fake, "w") as f:
            f.write(FAKE_SERVE)
        self.log = os.path.join(self.d, "asked.jsonl")
        os.environ["FAKE_LOG"] = self.log

    def tearDown(self):
        shutil.rmtree(self.d)

    def reqs(self, ids):
        p = os.path.join(self.d, "req.jsonl")
        with open(p, "w") as f:
            for i in ids:
                f.write(json.dumps({"id": i, "log": "x.jsonl", "frame": 3, "mode": "review", "type": "spell",
                                    "oppPool": "pool.txt", "stratum": "spell"}) + "\n")
        return p

    def asked(self):
        return G.read_jsonl(self.log)

    def grade(self, req, *extra):
        out = os.path.join(self.d, "out", "truth.jsonl")
        code = RG.main(["truth", "--requests", req, "--out", out, "--jobs", "2", "--cmd", f"{sys.executable} {self.fake}",
                        "--repo", ROOT, *extra])
        return code, out

    def test_truth_settings_and_resume(self):
        req = self.reqs([f"r{i}" for i in range(6)])
        code, out = self.grade(req)
        self.assertEqual(code, 0)
        got = G.read_jsonl(out)
        self.assertEqual([a["id"] for a in got], [f"r{i}" for i in range(6)])
        a = self.asked()
        self.assertEqual(len(a), 6)
        argv = a[0]["argv"]
        self.assertEqual(argv[argv.index("--horizon") + 1], "-1")
        self.assertEqual(argv[argv.index("--playouts") + 1], "200")
        self.assertEqual(argv[argv.index("--seed") + 1], str(G.REGRET_RULE["truthSeed"]))
        self.assertNotIn("stratum", a[0]["req"], "only serve's own fields go on the wire")
        # a rerun asks nothing again; two more requests are asked once each
        req = self.reqs([f"r{i}" for i in range(8)])
        with self.assertRaises(SystemExit):   # the requests changed: another set is another run
            self.grade(req)
        code, out = self.grade(req, "--allow-version-change")
        self.assertEqual(len(self.asked()), 8)
        self.assertEqual(len(G.read_jsonl(out)), 8)

    def test_dead_and_hung_jvms(self):
        req = self.reqs(["ok1", "die", "ok2"])
        code, out = self.grade(req)
        by = {a["id"]: a for a in G.read_jsonl(out)}
        self.assertEqual(by["die"]["status"], "error")
        self.assertEqual(by["ok2"]["status"], "ok", "the worker restarts and goes on")
        req = self.reqs(["hang"])
        out = os.path.join(self.d, "out2", "t.jsonl")
        RG.main(["truth", "--requests", req, "--out", out, "--cmd", f"{sys.executable} {self.fake}",
                 "--timeout-s", "1", "--repo", ROOT])
        self.assertEqual(G.read_jsonl(out)[0]["status"], "error")

    def test_rank_modes(self):
        req = self.reqs(["r0"])
        out = os.path.join(self.d, "o", "rank.jsonl")
        model = os.path.join(self.d, "m.json")
        with open(model, "w") as f:
            f.write("{}")
        RG.main(["rank", "--leaf", f"eval:{model}", "--requests", req, "--out", out, "--cmd", f"{sys.executable} {self.fake}",
                 "--repo", ROOT])
        a = self.asked()[-1]
        self.assertEqual(a["req"]["leaf"], f"eval:{model}")
        argv = a["argv"]
        self.assertEqual(argv[argv.index("--horizon") + 1], "0")
        self.assertEqual(argv[argv.index("--playouts") + 1], "3")
        self.assertIn("--no-race", argv)
        with self.assertRaises(SystemExit):
            RG.main(["rank", "--rounds", "5", "--requests", req, "--out", out])

    def test_never_the_opponent_deck(self):
        with self.assertRaises(SystemExit):
            RG.request_line({"id": "x", "oppDeck": "var/match/1/ai.dck"}, {})


class SprtTest(unittest.TestCase):
    def test_register_and_verdict(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "tools/ai-ladder"))
            shutil.copyfile(os.path.join(ROOT, "tools/ai-ladder/players.json"), os.path.join(d, "tools/ai-ladder/players.json"))
            model = os.path.join(d, "m.json")
            with open(model, "w") as f:
                f.write('{"format":"mtgtable-position-eval"}')
            reg = os.path.join(d, "var/ml/gates/players.json")
            self.assertEqual(S.main(["register", "--model", model, "--registry", reg, "--repo", d]), 0)
            sha = G.file_sha12(model)
            self.assertTrue(os.path.isfile(os.path.join(d, f"var/ml/models/eval-{sha}.json")))
            with open(reg) as f:
                r = json.load(f)
            p = r["players"][-1]
            base = next(x for x in r["players"] if x["name"] == "search-v1-fixed3")
            self.assertEqual(p["name"], f"search-v1-fixed3-eval-{sha}")
            self.assertEqual(p["kind"], "search-eval")
            self.assertEqual({k: v for k, v in p["params"].items() if k != "model"}, base["params"])
            S.main(["register", "--model", model, "--registry", reg, "--repo", d])
            with open(reg) as f:
                self.assertEqual(len(json.load(f)["players"]), len(r["players"]), "registering twice adds nothing")
            sp = os.path.join(d, "sprt.jsonl")
            line = {"a": p["name"], "b": "search-v1-fixed3", "purpose": "sprt", "elo0": 0, "elo1": 20, "alpha": 0.05,
                    "beta": 0.05, "games": 900, "pairs": 450, "score": 0.55, "llr": 3.0}
            for res, code in (("H1", 0), ("H0", 1), ("inconclusive", 1), ("stopped", 2)):
                with open(sp, "w") as f:
                    f.write(json.dumps(dict(line, result=res)) + "\n")
                self.assertEqual(S.main(["verdict", "--name", p["name"], "--sprt", sp]), code, res)
            with open(sp, "w") as f:
                f.write(json.dumps(dict(line, result="H1", elo1=10)) + "\n")
            self.assertNotEqual(S.main(["verdict", "--name", p["name"], "--sprt", sp]), 0, "another elo1 is not this gate")


class MetricsTest(unittest.TestCase):
    def test_flat_numbers_for_the_runner(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(M.m_report(os.path.join(d, "none.json")), {"written": 0})
            p = os.path.join(d, "r.json")
            G.write_json(p, {"pass": False, "scored": 12, "diffHandMinusEval": {"lo": -0.1}, "reasons": ["x"],
                             "leafRows": {"positions": 7}, "rows": [{"a": 1}]})
            m = M.m_report(p)
            self.assertEqual((m["pass"], m["scored"], m["diffHandMinusEval_lo"], m["leafPositions"], m["written"]),
                             (0, 12, -0.1, 7, 1))
            self.assertTrue(all(isinstance(v, (int, float)) for v in m.values()))
            out = os.path.join(d, "t.jsonl")
            with open(out + ".shard-0.jsonl", "w") as f:
                f.write(json.dumps({"id": "a", "status": "ok", "playouts": 5}) + "\n")
                f.write(json.dumps({"id": "b", "status": "error"}) + "\n")
            with open(out + ".shard-1.jsonl", "w") as f:
                f.write(json.dumps({"id": "b", "status": "ok", "playouts": 2}) + "\n")
            g = M.m_grade(out, None)
            self.assertEqual((g["answered"], g["ok"], g["error"], g["playouts"]), (2, 2, 0, 7))

    def test_calibration_per_model(self):
        """D368: clause C of gate 1 on each train_eval.py report's test split."""
        def rep(d, name, ece, gap, rows=500):
            p = os.path.join(d, name)
            G.write_json(p, {"models": {"eval": {"test": {"all": {"ece": ece}, "reliability": [
                {"bin": "0.0-0.1", "rows": rows, "predicted": 0.05, "observed": 0.05 + gap},
                {"bin": "0.1-0.2", "rows": 10, "predicted": 0.15, "observed": 0.6}]}}}})
            return p
        with tempfile.TemporaryDirectory() as d:
            good = [rep(d, f"s{i}.json", 0.01, 0.02) for i in range(3)]
            m = M.m_calib(good)
            self.assertEqual((m["models"], m["passing"], m["pass"]), (3, 3, 1), "a bin under 200 rows is not judged")
            self.assertEqual(M.m_calib(good + [rep(d, "ece.json", 0.031, 0.0)])["pass"], 0)
            self.assertEqual(M.m_calib(good + [rep(d, "bin.json", 0.01, 0.051)])["pass"], 0)
            self.assertEqual(M.m_calib(good + [os.path.join(d, "missing.json")])["written"], 0)


if __name__ == "__main__":
    unittest.main()
