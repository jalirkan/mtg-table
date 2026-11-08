# mtg-table — tools/ml tests: train_eval.py writes the model the moment the fit ends, and --resume-model runs only
# what follows the fit (D520).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

Needs numpy (skipped without it).  J196 was OOM-killed in the baselines after a
2.5-hour fit, and train_eval wrote --out only at the very end.  A kill is
simulated here by making the first step after the fit (fit_baselines) raise.
"""
from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import train_eval as T  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")

CASES = {
    "plain": ["--epochs", "3", "--hidden", "4", "--dim", "2", "--batch", "64"],
    # J196's shape: float32, compact rows, the auxiliary head, a load share and an epoch share
    "j196": ["--epochs", "3", "--hidden", "8", "--dim", "2", "--batch", "64", "--l2", "1e-3", "--fast", "--compact",
             "--aux-turns", "0.1", "--load-subsample", "0.5", "--subsample", "0.5"],
}


def rj(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


@unittest.skipIf(np is None, "numpy is not installed")
class FitSavesFirstTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        cls.tmp = tempfile.mkdtemp()
        cls.data = os.path.join(cls.tmp, "data")
        D.build([FIXTURES], [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE], cls.data, (60, 20, 20),
                quiet=True)
        cls.runs = {}
        for name, args in CASES.items():
            p = {k: os.path.join(cls.tmp, f"{name}-{k}.json") for k in
                 ("killed-model", "killed-report", "full-model", "full-report", "resumed-model", "resumed-report")}
            with redirect_stdout(io.StringIO()):
                with mock.patch.object(T, "fit_baselines", side_effect=RuntimeError("killed after the fit")):
                    try:
                        T.main([cls.data, *args, "--out", p["killed-model"], "--report", p["killed-report"]])
                    except RuntimeError:
                        pass
                    else:
                        raise AssertionError("the simulated kill did not happen")
                p["early"] = shutil.copyfile(p["killed-model"], os.path.join(cls.tmp, f"{name}-early.json"))
                p["early-report"] = shutil.copyfile(p["killed-report"], os.path.join(cls.tmp, f"{name}-early-r.json"))
                T.main([cls.data, *args, "--out", p["full-model"], "--report", p["full-report"]])
                T.main([cls.data, *args, "--resume-model", p["killed-model"], "--out", p["resumed-model"],
                        "--report", p["resumed-report"]])
            cls.runs[name] = p

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_the_model_is_on_disk_after_the_fit(self):
        import evalnet as N
        for name, p in self.runs.items():
            with self.subTest(name):
                early, net = N.load_model(p["early"])                  # it loads
                full = rj(p["full-model"])
                self.assertEqual(early["partial"]["complete"], False)
                self.assertEqual(set(early["partial"]["fit"]), {"valLogloss", "epochsRun", "seconds"})
                self.assertNotIn("metrics", early["training"])         # the one field it lacks
                self.assertNotIn("partial", full)
                # otherwise it is the final model: the same weights and the same training block but the date
                e, f = dict(early), dict(full)
                e.pop("partial")
                et, ft = dict(e.pop("training")), dict(f.pop("training"))
                ft.pop("metrics")
                et.pop("date"), ft.pop("date")
                self.assertEqual(e, f)
                self.assertEqual(et, ft)
                self.assertEqual("auxTurnsToEnd" in et, name == "j196")
                self.assertEqual(early["partial"]["fit"]["epochsRun"], 3)
                self.assertEqual(len(net.W), 2)
                # no temp file left beside it
                self.assertFalse(os.path.exists(p["killed-model"] + ".tmp"))

    def test_the_partial_report(self):
        for name, p in self.runs.items():
            with self.subTest(name):
                part, full = rj(p["early-report"]), rj(p["full-report"])
                self.assertIs(part["complete"], False)
                self.assertIs(full["complete"], True)
                self.assertEqual(list(full)[-1], "complete")
                self.assertNotIn("models", part)
                self.assertEqual([s["stage"] for s in part["memory"]], ["load", "fit"])
                self.assertEqual([s["stage"] for s in full["memory"]], ["load", "fit", "baselines", "score"])
                for k in ("schemaId", "splitBy", "splitSummary", "rows", "games", "hyper"):
                    self.assertEqual(part[k], full[k], k)
                self.assertEqual(set(part["fit"]), {"bestEpoch", "valLogloss", "epochsRun", "seconds", "excluded"})
                self.assertEqual({k: v for k, v in part["fit"].items() if k != "seconds"},
                                 {k: v for k, v in full["fit"].items() if k != "seconds"})

    def test_resume_reproduces_the_full_run(self):
        for name, p in self.runs.items():
            with self.subTest(name):
                full, res = rj(p["full-report"]), rj(p["resumed-report"])
                self.assertEqual(res.pop("resumedFrom"), p["killed-model"])
                self.assertEqual([s["stage"] for s in res.pop("memory")], ["load", "resume", "baselines", "score"])
                full.pop("memory")
                self.assertEqual(res["fit"]["seconds"], rj(p["early"])["partial"]["fit"]["seconds"])
                res["fit"].pop("seconds"), full["fit"].pop("seconds")
                self.assertEqual(res, full)                            # every score bit for bit
                fm, rm = rj(p["full-model"]), rj(p["resumed-model"])
                self.assertEqual(rm["training"]["date"], rj(p["early"])["training"]["date"])  # the fit's date
                fm["training"].pop("date"), rm["training"].pop("date")
                self.assertEqual(rm, fm)

    def test_resume_refusals(self):
        early = self.runs["plain"]["early"]
        plain = CASES["plain"]
        refused = [
            ["--epochs", "3", "--hidden", "5", "--dim", "2", "--batch", "64"],            # another configuration
            [*plain, "--load-subsample", "0.5"],                                         # another load
            [*plain, "--split-by", "game"],                                              # another split
            [*plain, "--aux-turns", "0.1"],                                              # a head it did not train
            [*plain, "--search", "sha"], [*plain, "--grid"], [*plain, "--cv", "2"],
            [*plain, "--curve", "0.5,1"], [*plain, "--dry-load"],
        ]
        for extra in refused:
            with self.subTest(extra), redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                T.main([self.data, *extra, "--resume-model", early])
        with redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            T.main([self.data, *plain, "--resume-model", os.path.join(self.tmp, "nope.json")])
        with redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):   # j196's model is not plain's
            T.main([self.data, *plain, "--resume-model", self.runs["j196"]["early"]])


if __name__ == "__main__":
    unittest.main()
