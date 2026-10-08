# mtg-table — tools/ml tests: the human recalibration of the win chance on 17Lands' games (D415).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest tools/ml/tests/test_human_calib.py   (from the repo root; needs numpy)

- the statistics: the logistic fit recovers known coefficients, the weighted ECE is
  train_eval.ece at unit weights, a grouped bootstrap keeps a game's rows together,
  the relative transform composes with Forge's calibration into the absolute one;
- CALIB_RULE's verdict: PASS, FAIL, underpowered, NO VERDICT;
- end to end on the committed recordings (a toy r17 model) and the made-up 17Lands
  sample: the report and the params file's shape, nothing fitted on the test half
  (flipping its labels moves no fitted number), and a vocabulary mismatch refused.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
sys.path.insert(0, HERE)

try:
    import numpy as np
except ImportError:
    np = None

if np is not None:
    import ext17l as X  # noqa: E402
    import human_calib as H  # noqa: E402
    from test_outside_exam import CARDS, MINI, SAMPLE, SYNERGY, _ours, _train  # noqa: E402


@unittest.skipIf(np is None, "numpy is not installed")
class MathTest(unittest.TestCase):
    def test_logistic_recovers_coefficients(self):
        rng = np.random.default_rng(1)
        z = rng.normal(0, 2, 200_000)
        t = (rng.random(len(z)) < H.sigmoid(0.3 + 0.8 * z)).astype(float)
        a, b = H.platt(z, t)
        self.assertAlmostEqual(a, 0.3, delta=0.03)
        self.assertAlmostEqual(b, 0.8, delta=0.03)
        self.assertAlmostEqual(H.temperature(z, t), 0.8, delta=0.05)
        # integer weights are repeated rows
        w = rng.integers(0, 3, len(z)).astype(float)
        rep = np.repeat(np.arange(len(z)), w.astype(int))
        np.testing.assert_allclose(H.platt(z, t, w), H.platt(z[rep], t[rep]), atol=1e-6)

    def test_weighted_ece_is_train_eval_ece(self):
        import train_eval as T
        rng = np.random.default_rng(2)
        p = rng.random(5000)
        t = (rng.random(5000) < p ** 1.3).astype(float)
        self.assertAlmostEqual(H.weighted_ece(p, t), T.ece(p, t), places=12)
        w = rng.integers(0, 4, 5000).astype(float)
        rep = np.repeat(np.arange(5000), w.astype(int))
        self.assertAlmostEqual(H.weighted_ece(p, t, w), T.ece(p[rep], t[rep]), places=12)

    def test_grouped_bootstrap(self):
        x = np.array([1.0, 1.0, 5.0, 5.0, 5.0])
        groups = np.array([7, 7, 9, 9, 9])
        _code, G, gen = H.boot_weights(groups, 50, 3)
        self.assertEqual(G, 2)
        for w in gen():
            self.assertEqual(w[0], w[1])                 # a game's rows are drawn together
            self.assertEqual(w[2], w[3])
            self.assertEqual(w[3], w[4])
        out = H.boot_stats({"m": lambda w: float((w * x).sum() / w.sum())}, groups, 200, 4, 0.95)["m"]
        self.assertAlmostEqual(out["mean"], 17 / 5)
        self.assertGreaterEqual(out["lo"], 1.0)
        self.assertLessEqual(out["hi"], 5.0)
        self.assertEqual((out["groups"], out["rows"]), (2, 5))

    def test_relative_composes(self):
        z = np.linspace(-4, 4, 33)
        a_f, b_f, a_h, b_h = 0.1, 0.7, -0.05, 0.6
        ai, sl = H.relative((a_h, b_h), (a_f, b_f))
        np.testing.assert_allclose(ai + sl * (a_f + b_f * z), a_h + b_h * z, atol=1e-12)
        self.assertAlmostEqual(sl, b_h / b_f)

    def test_bands(self):
        bands = [(3, 4), (5, 8), (17, None)]
        self.assertEqual(H.band_index([1, 3, 4, 5, 9, 17, 40], bands).tolist(), [-1, 0, 0, 1, -1, 2, 2])
        fitted = [{"lo": 3, "hi": 4, "rows": 1, "intercept": 1.0, "slope": 0.0},
                  {"lo": 5, "hi": 8, "rows": 0, "intercept": 9.0, "slope": 9.0},
                  {"lo": 17, "hi": None, "rows": 1, "intercept": 0.0, "slope": 2.0}]
        p = H.apply_bands(np.array([1.0, 1.0, 1.0, 1.0]), np.array([3, 6, 10, 20]), fitted, (0.0, 1.0))
        np.testing.assert_allclose(p, H.sigmoid(np.array([1.0, 1.0, 1.0, 2.0])))

    def test_verdict(self):
        good = {"mean": 0.01, "lo": 0.005, "hi": 0.015}
        self.assertEqual(H.verdict(20000, 3000, good, [])["verdict"], "PASS")
        self.assertEqual(H.verdict(20000, 3000, {"mean": 0.01, "lo": -0.001, "hi": 0.02}, [])["verdict"], "FAIL")
        v = H.verdict(9999, 3000, good, [])
        self.assertEqual(v["verdict"], "FAIL")
        self.assertIn("underpowered", v["why"])
        self.assertEqual(H.verdict(20000, 3000, good, ["a partial download"])["verdict"], "NO VERDICT")

    def test_coach_use(self):
        forge = {"val": {"rows": 8000, "pairs": 200}, "slope": 0.8, "intercept": 0.0}
        rel = {"slope": 0.9, "slopeInterval": (0.85, 0.95)}
        self.assertEqual(H.coach_use("PASS", rel, forge, 0.72, "global"),
                         {"use": "relative", "form": "global", "why": H.coach_use("PASS", rel, forge, 0.72,
                                                                                    "global")["why"]})
        self.assertEqual(H.coach_use("FAIL", rel, forge, 0.72, "global")["use"], "none")
        self.assertEqual(H.coach_use("PASS", None, None, 0.72, "global")["use"], "none")
        self.assertEqual(H.coach_use("PASS", {"slope": 0.97, "slopeInterval": (0.9, 1.05)}, forge, 0.78,
                                     "global")["use"], "none")                     # interval includes 1
        small = {"val": {"rows": 15, "pairs": 1}, "slope": -0.16, "intercept": 11.4}
        out = H.coach_use("PASS", {"slope": -12.0, "slopeInterval": (-15.0, -9.0)}, small, 1.9, "bands")
        self.assertEqual(out["use"], "none")
        self.assertIn("not usable", out["why"])


@unittest.skipIf(np is None, "numpy is not installed")
class EndToEndTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.data = _ours(cls.tmp, MINI)
        cls.model = _train(cls.data, os.path.join(cls.tmp, "m.json"))
        cls.ext = os.path.join(cls.tmp, "ext")
        X.build(SAMPLE, X.load_cards(CARDS), [MINI], cls.ext, perspective="both", quiet=True)
        cls._as_rule_file(cls.ext)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    @staticmethod
    def _as_rule_file(ext):
        p = os.path.join(ext, "stats.json")
        with open(p) as f:
            st = json.load(f)
        st["replay"] = H.CALIB_RULE["replay"]        # the sample stands in for the rule's file
        with open(p, "w") as f:
            json.dump(st, f)

    def _run(self, ext, **kw):
        return H.run(self.model, ext, log=lambda *_: None, **kw)

    def test_report_and_params(self):
        rep, params = self._run(self.ext, data=self.data, trad=self.ext)
        self.assertEqual((rep["fit"]["rows"], rep["test"]["rows"]), (6, 4))     # dev 3+3, test 2+2 (both sides)
        self.assertEqual(rep["verdict"]["verdict"], "FAIL")
        self.assertIn("underpowered", rep["verdict"]["why"])
        self.assertEqual(rep["coach"]["use"], "none")
        self.assertIn("uncalibrated", rep["test"]["models"])
        self.assertIn("ll_uncal_minus_platt", rep["test"]["boot"])
        self.assertEqual(len(rep["fit"]["bands"]), len(H.CALIB_RULE["bands"]))
        self.assertIsNotNone(rep["relative"])
        self.assertIn("TradDraft, all games (PremierDraft's fit applied)", rep["secondary"])
        self.assertIn("user rows (test half)", rep["secondary"])
        self.assertEqual(params["format"], H.FORMAT)
        self.assertEqual(params["model"]["sha256"], H.sha256_file(self.model))
        self.assertEqual(sorted(params["absolute"]), ["appliesTo", "bands", "global", "recommendedForm"])
        json.dumps(rep)
        json.dumps(params)
        # the runner's flat numbers
        import gate_metrics as GM
        path = os.path.join(self.tmp, "rep.json")
        with open(path, "w") as f:
            json.dump(rep, f)
        m = GM.m_report(path)
        self.assertEqual((m["summary_written"], m["summary_pass"], m["summary_decided"], m["summary_rows"]),
                         (1, 0, 1, 4))

    def test_one_perspective_or_a_sample_gives_no_verdict(self):
        user = os.path.join(self.tmp, "ext-user")
        X.build(SAMPLE, X.load_cards(CARDS), [MINI], user, perspective="user", quiet=True)
        self._as_rule_file(user)
        rep, _ = self._run(user)
        self.assertEqual(rep["verdict"]["verdict"], "NO VERDICT")
        self.assertIn("'both'", rep["verdict"]["why"])
        two = os.path.join(self.tmp, "ext-two")
        X.build(SAMPLE, X.load_cards(CARDS), [MINI], two, perspective="both", max_games=4, quiet=True)
        self._as_rule_file(two)
        self.assertEqual(self._run(two)[0]["verdict"]["verdict"], "NO VERDICT")

    def test_nothing_is_fitted_on_the_test_half(self):
        import dataset as D
        flipped = os.path.join(self.tmp, "ext-flipped")
        shutil.copytree(self.ext, flipped)
        with open(os.path.join(flipped, "games.jsonl")) as f:
            test_games = [g["index"] for g in map(json.loads, f) if g["half"] == "test"]
        for fn in os.listdir(flipped):
            if fn.startswith("ext-") and fn.endswith(".npz"):
                with np.load(os.path.join(flipped, fn)) as z:
                    arrs = {k: z[k] for k in z.files}
                m = np.isin(arrs["game"], test_games)
                arrs["y"] = np.where(m, -arrs["y"], arrs["y"]).astype(arrs["y"].dtype)
                D.savez_fixed(os.path.join(flipped, fn), arrs)
        a, _ = self._run(self.ext)
        b, _ = self._run(flipped)
        self.assertEqual(json.dumps(a["fit"], sort_keys=True), json.dumps(b["fit"], sort_keys=True))
        self.assertNotEqual(a["test"]["models"]["uncalibrated"]["all"]["logloss"],
                            b["test"]["models"]["uncalibrated"]["all"]["logloss"])

    def test_refuses_another_vocabulary(self):
        other = os.path.join(self.tmp, "ext-syn")
        X.build(SAMPLE, X.load_cards(CARDS), [SYNERGY], other, perspective="both", quiet=True)
        with self.assertRaises(SystemExit):
            self._run(other)


if __name__ == "__main__":
    unittest.main()
