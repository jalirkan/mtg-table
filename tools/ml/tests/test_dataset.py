# mtg-table — tools/ml tests: the dataset, its split and the baseline.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Needs numpy; every test here is skipped without it (test_encode.py is not)."""
from __future__ import annotations

import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
VOCAB = [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE]


@unittest.skipIf(np is None, "numpy is not installed")
class DatasetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        cls.D = D
        cls.tmp = tempfile.mkdtemp()
        cls.out = os.path.join(cls.tmp, "a")
        cls.summary = D.build([FIXTURES], VOCAB, cls.out, (60, 20, 20), shard_rows=700, quiet=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def games(self):
        with open(os.path.join(self.out, "games.jsonl"), encoding="utf-8") as f:
            return [json.loads(line) for line in f]

    def test_no_game_in_two_splits(self):
        games = self.games()
        split_of_group: dict[str, str] = {}
        for g in games:
            self.assertEqual(split_of_group.setdefault(g["split_group"], g["split"]), g["split"])
        loaded = {s: self.D.load(self.out, s) for s in self.D.SPLITS}
        for s, d in loaded.items():
            for gi in set(d["game"].tolist()):
                self.assertEqual(games[gi]["split"], s)
        self.assertEqual(sum(len(d["y"]) for d in loaded.values()), self.summary["rows"])
        self.assertEqual(sum(g["rows"] for g in games), self.summary["rows"])

    def test_shards_and_shapes(self):
        tr = self.D.load(self.out, "train")
        with open(os.path.join(self.out, "features.json"), encoding="utf-8") as f:
            n = json.load(f)["nFeatures"]
        self.assertEqual(tr["X"].shape[1], n)
        self.assertEqual(tr["X"].dtype, np.int16)
        self.assertGreater(self.summary["splits"]["train"]["shards"], 1)  # shard_rows=700
        self.assertTrue(set(np.unique(tr["y"]).tolist()) <= {-1, 0, 1})

    def test_deterministic_rebuild(self):
        out2 = os.path.join(self.tmp, "b")
        s2 = self.D.build([FIXTURES], VOCAB, out2, (60, 20, 20), shard_rows=700, quiet=True)
        self.assertEqual(s2, self.summary)
        for s in self.D.SPLITS:
            a, b = self.D.load(self.out, s), self.D.load(out2, s)
            for k in a:
                self.assertTrue(np.array_equal(a[k], b[k]), (s, k))

    def test_two_chairs_of_one_game_share_a_group(self):
        g0 = next(E.read_games(os.path.join(FIXTURES, "villain-doom-248.jsonl")))
        g1 = copy.deepcopy(g0)
        g1.header["seat"], g1.header["startedAt"] = 1, "later"
        for g, mine, theirs in ((g0, "A", "B"), (g1, "B", "A")):
            for f in g.frames:
                if f.get("type") == "hello_ok":
                    f["body"]["match"] = {"yourDeck": {"name": mine, "path": f"x/{mine}.dck", "cards": 40},
                                          "aiDeck": {"name": theirs, "cards": 40}}
        self.assertNotEqual(g0.game_key, g1.game_key)
        self.assertEqual(g0.split_group, g1.split_group)
        self.assertEqual(g0.match_key(), g1.match_key())
        other_seed = copy.deepcopy(g1)
        other_seed.header["seed"] = 999
        self.assertNotEqual(other_seed.split_group, g0.split_group)

    def test_split_is_a_pure_function_of_the_group(self):
        self.assertEqual(self.D.split_of("x", (80, 10, 10)), self.D.split_of("x", (80, 10, 10)))
        got = [self.D.split_of(str(i), (80, 10, 10)) for i in range(2000)]
        self.assertAlmostEqual(got.count("train") / 2000, 0.8, delta=0.04)

    def test_baseline_runs_and_reports(self):
        import baseline_eval as B
        r = B.run(self.out, epochs=30)
        for m in ("prior", "life", "core", "global", "full"):
            self.assertIn(m, r["models"])
            all_ = r["models"][m]["train"]["all"]
            self.assertTrue(np.isfinite(all_["logloss"]))
        # the full model fits its training split better than the prior does
        self.assertLess(r["models"]["full"]["train"]["all"]["logloss"],
                        r["models"]["prior"]["train"]["all"]["logloss"])

    def test_cv_holds_each_game_out(self):
        import baseline_eval as B
        r = B.run_cv(self.out, folds=3, epochs=10)
        self.assertEqual(r["models"]["prior"]["cv"]["all"]["rows"], self.summary["rows"])
        self.assertTrue(np.isfinite(r["models"]["core"]["cv"]["all"]["logloss"]))

    def test_train_mlp_with_torch_trains(self):
        try:
            import torch  # noqa: F401
        except ImportError:
            self.skipTest("torch is not installed (optional)")
        p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "train_mlp.py"), self.out,
                            "--epochs", "2", "--hidden", "16"], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("best epoch", p.stdout)

    def test_train_mlp_without_torch_is_a_skip(self):
        try:
            import torch  # noqa: F401
            self.skipTest("torch is installed")
        except ImportError:
            pass
        p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "train_mlp.py"), self.out],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("torch is not installed", p.stdout)


if __name__ == "__main__":
    unittest.main()
