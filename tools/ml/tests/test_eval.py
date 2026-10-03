# mtg-table — tools/ml tests: the position evaluator (train_eval.py, evalnet.py, eval_golden.py).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

The golden half is standard library: fixtures/eval/golden.json -- what the Java
evaluator is held to by bridge/build.sh -- must still be what encode.py says,
so an encoder change fails here before it fails the Java build.  The rest needs
numpy (and torch for one test) and is skipped without it, saying so.
"""
from __future__ import annotations

import hashlib
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

EVAL = os.path.join(ROOT, "fixtures", "eval")
FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")


def golden():
    with open(os.path.join(EVAL, "golden.json"), encoding="utf-8") as f:
        return json.load(f)


def feature_hash(vec) -> str:
    return hashlib.sha256(",".join(str(int(x)) for x in vec).encode()).hexdigest()[:16]


class GoldenTest(unittest.TestCase):
    """Standard library: the committed golden file is encode.py's answer."""

    def test_golden_is_current(self):
        g = golden()
        vocab = E.Vocab.from_files([os.path.join(ROOT, p) for p in g["vocabFiles"]])
        schema = E.Schema(vocab)
        self.assertEqual(schema.schema_id, g["schemaId"],
                         "the schema moved: python3 tools/ml/eval_golden.py, and read the diff")
        n = 0
        for lg in g["logs"]:
            games = list(E.read_games(os.path.join(ROOT, lg["file"])))
            rows = E.encode_game(games[lg["game"]], schema)
            self.assertEqual([r.seq for r in rows], [w["seq"] for w in lg["rows"]], lg["file"])
            for r, w in zip(rows, lg["rows"]):
                self.assertEqual(feature_hash(r.features), w["hash"], f"{lg['file']} seq {r.seq}")
                if "nz" in w:
                    self.assertEqual([[k, int(x)] for k, x in enumerate(r.features) if x], w["nz"])
                n += 1
        self.assertEqual(n, g["rows"])
        self.assertGreaterEqual(n, 2000)

    def test_golden_vocab_names(self):
        g = golden()
        for path, names in g["vocabNames"].items():
            self.assertEqual(E.read_vocab_names(os.path.join(ROOT, path)), names, path)
        for raw, key in g["norm"]:
            self.assertEqual(E.norm_name(raw), key)

    def test_model_file_names_its_schema(self):
        with open(os.path.join(EVAL, "model.json"), encoding="utf-8") as f:
            m = json.load(f)
        self.assertEqual(m["schemaId"], golden()["schemaId"])
        self.assertEqual(m["format"], "mtgtable-position-eval")
        self.assertEqual(m["formatVersion"], 1)


@unittest.skipIf(np is None, "numpy is not installed")
class EvalNetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        import evalnet as N
        import train_eval as T
        cls.N, cls.T = N, T
        cls.tmp = tempfile.mkdtemp()
        cls.data = os.path.join(cls.tmp, "data")
        D.build([FIXTURES], [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE], cls.data, (60, 20, 20),
                quiet=True)
        cls.schema, cls.names, cls.splits = T.load_data(cls.data)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_golden_predictions(self):
        """numpy's forward pass over the committed model gives the golden P(win)s
        (the same numbers the Java self-test is held to)."""
        g = golden()
        m, net = self.N.load_model(os.path.join(EVAL, "model.json"))
        vocab = E.Vocab.from_files([os.path.join(ROOT, p) for p in g["vocabFiles"]])
        self.N.check_schema(m, vocab)
        schema = E.Schema(vocab)
        lg = g["logs"][0]
        rows = E.encode_game(list(E.read_games(os.path.join(ROOT, lg["file"])))[lg["game"]], schema)
        p = net.predict(self.N.features_to_rows([r.features for r in rows], schema.card_offset))
        for pi, w in zip(p, lg["rows"]):
            self.assertAlmostEqual(pi, w["p"], places=12)

    def test_schema_refusal(self):
        m, _net = self.N.load_model(os.path.join(EVAL, "model.json"))
        with self.assertRaises(ValueError):
            self.N.check_schema(m, E.Vocab.from_files([MINI_CUBE]))

    def test_gradient_matches_finite_differences(self):
        tr = self.splits["train"].take(np.arange(30))
        hp = dict(self.T.DEFAULTS, hidden="6,4", dim=3)
        net, _ = self.T.make_net(self.splits["train"], self.names, hp, len(self.schema["vocab"]["cards"]), 1)
        rng = np.random.default_rng(0)
        net.E = rng.normal(0, 0.3, net.E.shape)
        _loss, _ce, grads = net.loss_grad(tr, 1e-3, 1e-2)
        worst = 0.0
        for pi, p in enumerate(net.params()):
            for _ in range(5):
                if pi == 0:
                    idx = (int(tr.slot[rng.integers(len(tr.slot))]), int(rng.integers(p.shape[1])))
                else:
                    idx = tuple(int(rng.integers(0, s)) for s in p.shape)
                old = p[idx]
                p[idx] = old + 1e-6
                lp = net.loss_grad(tr, 1e-3, 1e-2)[0]
                p[idx] = old - 1e-6
                lm = net.loss_grad(tr, 1e-3, 1e-2)[0]
                p[idx] = old
                num = (lp - lm) / 2e-6
                worst = max(worst, abs(num - grads[pi][idx]) / max(1e-8, abs(num) + abs(grads[pi][idx])))
        self.assertLess(worst, 1e-4)

    def test_train_export_roundtrip(self):
        tr, va = self.splits["train"], self.splits["val"]
        hp = dict(self.T.DEFAULTS, hidden="8", dim=4, epochs=6, patience=6)
        net, info = self.T.fit(tr, va, self.names, hp, len(self.schema["vocab"]["cards"]), "numpy", 0)
        self.assertGreaterEqual(info["bestEpoch"], 1)
        for n in self.N.LIVE_UNSAFE + ["my_priority"]:
            self.assertNotIn(self.names.index(n), set(net.cols.tolist()), n)
        path = os.path.join(self.tmp, "m.json")
        self.N.save_model(path, net.to_json(self.schema, self.names, {"excluded": info["excluded"]}))
        _m, back = self.N.load_model(path)
        self.assertTrue(np.allclose(back.predict(va), net.predict(va), atol=1e-12))
        # the untrained prior is worse than the fitted net on its own training rows
        self.assertLess(self.T.logloss(net.predict(tr), tr.t), self.T.logloss(np.full(len(tr), 0.5), tr.t))

    def test_unseen_card_adds_nothing(self):
        """E starts at zero and a card's row only moves when the card is seen."""
        hp = dict(self.T.DEFAULTS, hidden="8", dim=4, epochs=3, patience=3)
        tr = self.splits["train"]
        net, _ = self.T.fit(tr, self.splits["val"], self.names, hp, len(self.schema["vocab"]["cards"]), "numpy", 0)
        seen = set(tr.slot.tolist())
        for s in range(len(net.E)):
            if s not in seen:
                self.assertTrue(np.all(net.E[s] == 0), self.schema["vocab"]["cards"][s])

    def test_torch_backend_trains_the_same_network(self):
        try:
            import torch  # noqa: F401
        except ImportError:
            self.skipTest("torch is not installed (optional)")
        hp = dict(self.T.DEFAULTS, hidden="8", dim=4, epochs=2, patience=2)
        net, info = self.T.fit(self.splits["train"], self.splits["val"], self.names, hp,
                               len(self.schema["vocab"]["cards"]), "torch", 0)
        p = net.predict(self.splits["val"])
        self.assertTrue(np.all((p > 0) & (p < 1)))
        self.assertTrue(np.isfinite(info["valLogloss"]))

    def test_split_by_pair_and_holdout(self):
        """No deck pair in two splits; a held-out pattern is exactly the test split."""
        games = self.T.read_games(self.data)
        for how in ("pair", "game", "holdout:villain-"):
            _s, _n, sp = self.T.load_data(self.data, how)
            self.assertEqual(sum(len(r) for r in sp.values()),
                             sum(len(r) for r in self.splits.values()))
            where = {}
            for s, r in sp.items():
                for gi in set(r.game.tolist()):
                    k = self.T.pair_key(games[gi])
                    self.assertEqual(where.setdefault(k, s), s, (how, k))
            self.assertTrue(len(sp["test"]) and len(sp["train"]), how)
            if how.startswith("holdout"):
                files = {games[gi]["file"] for gi in set(sp["test"].game.tolist())}
                self.assertTrue(files and all("villain-" in f for f in files), files)
                rest = {games[gi]["file"] for s in ("train", "val") for gi in set(sp[s].game.tolist())}
                self.assertFalse(any("villain-" in f for f in rest))
        # a few pairs: at least one each in val and test; many: a stable hash threshold
        small = self.T.assign_pairs([f"p{i}" for i in range(5)])
        self.assertEqual(sorted(small.values()).count("test"), 1)
        self.assertEqual(sorted(small.values()).count("val"), 1)
        big = self.T.assign_pairs([f"p{i}" for i in range(200)])
        bigger = self.T.assign_pairs([f"p{i}" for i in range(400)])
        self.assertTrue(all(bigger[k] == v for k, v in big.items()))

    def test_cli_train_cv_and_grid(self):
        out = os.path.join(self.tmp, "cli.json")
        rep = os.path.join(self.tmp, "rep.json")
        tool = os.path.join(ROOT, "tools", "ml", "train_eval.py")
        p = subprocess.run([sys.executable, tool, self.data, "--out", out, "--report", rep, "--epochs", "3",
                            "--hidden", "8", "--dim", "4"], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("reliability", p.stdout)
        with open(rep, encoding="utf-8") as f:
            r = json.load(f)
        for m in ("prior", "life", "core", "eval"):
            self.assertIn(m, r["models"])
        p = subprocess.run([sys.executable, tool, self.data, "--cv", "3", "--epochs", "2", "--hidden", "4"],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("3-fold grouped CV", p.stdout)
        p = subprocess.run([sys.executable, tool, self.data, "--grid", "--time-budget", "1", "--epochs", "2"],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("grid:", p.stdout)


@unittest.skipIf(np is not None, "numpy is installed")
class NoNumpyTest(unittest.TestCase):
    def test_train_eval_says_it_needs_numpy(self):
        p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "train_eval.py"), "x"],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 2)
        self.assertIn("needs numpy", p.stderr)


if __name__ == "__main__":
    unittest.main()
