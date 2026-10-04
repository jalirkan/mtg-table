# mtg-table — tools/ml tests: the evaluator v2 pipeline (D364): training fractions and the learning curve,
# multi-night datasets and their split audit, the successive-halving search, float32 training, the comparison.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

The split's stability across nights is standard library (games.jsonl only);
the rest needs numpy and is skipped without it.  `DefaultUnchangedTest`
holds the default path to the code it replaced: the old training loop and
grid loop are copied below verbatim from main before D364, and the new code
must give the same numbers, bit for bit, on the fixtures.
"""
from __future__ import annotations

import io
import json
import math
import os
import shutil
import sys
import tempfile
import time
import types
import unittest
from contextlib import redirect_stdout
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402
import split_audit as A  # noqa: E402
import train_eval as T  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
LAB = os.path.join(ROOT, "fixtures", "cubelab")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
SYNERGY = os.path.join(ROOT, "cubes", "synergy-cube-180.md")


def quiet(*_a, **_k):
    pass


# ---------------------------------------------------------------- the old code, verbatim (main before D364)

def old_train_numpy(net, tr, va, hp, seed, log=None, deadline=None):
    from train_eval import _adam_step, logloss
    rng = np.random.default_rng(seed)
    state: dict[int, Any] = {}
    step = 0
    best = (math.inf, net.copy_params(), 0)
    bad = 0
    history = []
    n = len(tr)
    for ep in range(1, int(hp["epochs"]) + 1):
        perm = rng.permutation(n)
        tot = 0.0
        for i in range(0, n, int(hp["batch"])):
            b = tr.take(perm[i:i + int(hp["batch"])])
            _loss, ce, grads = net.loss_grad(b, hp["l2"], hp["card_l2"], rng, hp["dropout"])
            step += 1
            _adam_step(net.params(), grads, state, hp["lr"], step)
            tot += ce * len(b)
        vl = logloss(net.predict(va), va.t) if len(va) else tot / max(n, 1)
        history.append({"epoch": ep, "train_ce": tot / max(n, 1), "val_logloss": vl})
        if log:
            log(f"  epoch {ep:3d}  train ce {tot / max(n, 1):.4f}  val logloss {vl:.4f}")
        if vl < best[0] - 1e-5:
            best, bad = (vl, net.copy_params(), ep), 0
        else:
            bad += 1
            if bad >= int(hp["patience"]):
                break
        if deadline and time.time() > deadline:
            break
    net.set_params(best[1])
    return best[2], best[0], history


# ---------------------------------------------------------------- games.jsonl of made-up nights (standard library)

def night_games(night: int, keys: list[str], seeds: range, games_per_draft: int = 2) -> list[dict[str, Any]]:
    """Games as dataset.py writes them for a queue night: each (key, seed) is a draft whose deck pair is
    named `cubelab <seed> A|cubelab <seed> B` (so two keys reuse a pair name), both chairs recorded."""
    out = []
    for key in keys:
        for s in seeds:
            for chair in range(games_per_draft):
                f = f"var/cubelab/queue/{key}/games/{s}/g1-seat{chair}.jsonl.gz"
                out.append({"game_key": f"{key}|{s}|{chair}", "split_group": f"match:cubelab {s} A|cubelab {s} B",
                            "split": "train", "file": f, "seat": chair, "match": f"cubelab {s} A|cubelab {s} B",
                            "game_group": f"seed:{s}|{key}", "night": night})
    return out


def write_games(d: str, games: list[dict[str, Any]]) -> str:
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "games.jsonl"), "w", encoding="utf-8") as f:
        for i, g in enumerate(games):
            f.write(json.dumps(dict(g, index=i)) + "\n")
    return d


class SplitAcrossNightsTest(unittest.TestCase):
    """The pair split of nights 1-3 keeps night 1's split, and no pair, draft or deck crosses splits."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        keys = ["normal/synergy", "normal/vintage", "bridge/synergy+vintage"]
        n1 = night_games(1, keys, range(1, 301))
        # night 2 continues each key's seeds; night 3 too -- and a key that drafted less on night 1 reuses
        # seeds another key used then (the pair names collide across keys, as on the PC)
        n2 = night_games(2, keys[:2], range(301, 601)) + night_games(2, keys[2:], range(201, 501))
        n3 = night_games(3, keys, range(601, 901))
        cls.ref = write_games(os.path.join(cls.tmp, "night-1"), n1)
        cls.all = write_games(os.path.join(cls.tmp, "nights-1-3"), n1 + n2 + n3)
        # the same games in another order (a rebuild that read the folders differently)
        cls.shuffled = write_games(os.path.join(cls.tmp, "shuffled"), list(reversed(n3 + n2)) + n1[::-1])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_night_one_split_holds(self):
        r = A.audit(self.all, "pair", self.ref)
        self.assertTrue(r["pass"], r["failures"])
        ref = r["reference"]
        self.assertEqual((ref["missingGames"], ref["gamesMovedSplit"], ref["pairsMovedSplit"]), (0, 0, 0))
        self.assertEqual(ref["referenceTestPairsInDataTest"], ref["referenceTestPairs"])
        self.assertGreater(ref["referenceTestPairs"], 10)
        self.assertEqual(ref["dataTestPairsTrainedOnByReference"], 0)
        self.assertGreater(ref["newTestPairs"], 10)
        self.assertGreater(r["pairsInSeveralNights"], 0)          # the reused names: still one split each
        self.assertEqual(set(r["nights"]), {"1", "2", "3"})
        self.assertTrue(A.audit(self.shuffled, "pair", self.ref)["pass"])

    def test_game_splits_do_not_depend_on_the_rest(self):
        """A pair's split is a function of the pair: the same in night 1 alone, nights 1-3, any order."""
        ga, gb = A.read_games(self.ref), A.read_games(self.all)
        sa = dict(zip((g["game_key"] for g in ga), T.game_splits(ga, "pair")))
        sb = dict(zip((g["game_key"] for g in gb), T.game_splits(gb, "pair")))
        self.assertTrue(all(sb[k] == s for k, s in sa.items()))
        self.assertEqual(set(sb.values()), {"train", "val", "test"})

    def test_audit_catches_a_leak(self):
        g = A.read_games(self.all)
        # a draft folder whose second chair names another deck pair, in another split: drafts and decks cross
        sp = T.game_splits(g, "pair")
        i = next(k for k, s in enumerate(sp) if s == "test")
        j = next(k for k, s in enumerate(sp) if s == "train")
        bad = [dict(x) for x in g]
        bad[i + 1 if g[i + 1]["file"].rsplit("/", 2)[0] == g[i]["file"].rsplit("/", 2)[0] else i - 1]["match"] = g[j]["match"]
        r = A.audit(write_games(os.path.join(self.tmp, "leak"), bad), "pair")
        self.assertFalse(r["pass"])
        self.assertGreater(r["draftsInTwoSplitsCount"], 0)
        # a reference game whose pair changed is a moved game; a reference game gone is missing
        moved = [dict(x) for x in A.read_games(self.all)]
        ref = A.read_games(self.ref)
        k = next(x for x, s in zip(ref, T.game_splits(ref, "pair")) if s == "test")
        for x in moved:
            if x["game_key"] == k["game_key"]:
                x["match"] = g[j]["match"]
        moved = [x for x in moved if x["game_key"] != ref[0]["game_key"]]
        r = A.audit(write_games(os.path.join(self.tmp, "moved"), moved), "pair", self.ref)
        self.assertFalse(r["pass"])
        self.assertEqual(r["reference"]["missingGames"], 1)
        self.assertGreaterEqual(r["reference"]["gamesMovedSplit"], 1)

    def test_cli(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = A.main([self.all, "--reference", self.ref, "--report", os.path.join(self.tmp, "audit.json")])
        self.assertEqual(rc, 0)
        self.assertIn("split audit: PASS", buf.getvalue())


class FractionKeysTest(unittest.TestCase):
    def test_nested_deterministic_and_about_right(self):
        keys = [f"cubelab {i} A|cubelab {i} B" for i in range(4000)]
        at = {f: {k for k in keys if T.in_fraction(k, f)} for f in (0.1, 0.25, 0.5, 1.0)}
        self.assertTrue(at[0.1] <= at[0.25] <= at[0.5] <= at[1.0])
        self.assertEqual(len(at[1.0]), 4000)
        for f in (0.1, 0.25, 0.5):
            self.assertLess(abs(len(at[f]) / 4000 - f), 0.03)
        self.assertEqual(at[0.25], {k for k in keys if T.in_fraction(k, 0.25)})
        games = [{"match": k} for k in keys[:50]]
        sp = ["train"] * 40 + ["val"] * 5 + ["test"] * 5
        fs = T.fraction_splits(games, sp, 0.5)
        self.assertEqual(fs[40:], sp[40:])                     # val and test untouched
        self.assertEqual(set(fs[:40]), {"train", ""})


# ---------------------------------------------------------------- numpy

@unittest.skipIf(np is None, "numpy is not installed")
class EvalV2Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        import evalnet as N
        cls.D, cls.N = D, N
        cls.tmp = tempfile.mkdtemp()
        cls.data = os.path.join(cls.tmp, "data")
        D.build([FIXTURES], [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE], cls.data, (60, 20, 20),
                quiet=True)
        cls.schema, cls.names, cls.splits = T.load_data(cls.data, "pair")
        cls.vocab = len(cls.schema["vocab"]["cards"])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def args(self, **kw):
        a = dict(data=self.data, split_by="pair", seed=0, eta=3, min_epochs=1, finalists=0, final_epochs=10,
                 jobs=1, configs=0, time_budget=0, grid_log=None, fast=False, curve=None)
        a.update(kw)
        return types.SimpleNamespace(**a)

    # -- the default is what it was

    def test_default_training_is_the_old_loop(self):
        tr, va = self.splits["train"], self.splits["val"]
        for hp in (dict(T.DEFAULTS, hidden="8", dim=4, epochs=5, patience=2, batch=128),
                   dict(T.DEFAULTS, hidden="16,4", dim=3, dropout=0.2, epochs=4, patience=9, batch=64),
                   dict(T.DEFAULTS, hidden="", dim=2, epochs=3, patience=3, batch=256)):
            net_new, info = T.fit(tr, va, self.names, hp, self.vocab, "numpy", 3)
            net_old, _ex = T.make_net(tr, self.names, hp, self.vocab, 3)
            ep, vl, hist = old_train_numpy(net_old, tr, va, hp, 3)
            self.assertEqual((info["bestEpoch"], info["valLogloss"], info["history"]), (ep, vl, hist))
            for a, b in zip(net_new.params(), net_old.params()):
                self.assertTrue(np.array_equal(a, b))

    def test_default_grid_is_the_old_grid(self):
        """--grid trains each configuration exactly as the old loop does, in the same order."""
        old_grid = T.GRID
        T.GRID = {"hidden": ["", "8"], "dim": [2], "l2": [1e-4], "card_l2": [1e-2], "dropout": [0.0, 0.1],
                  "lr": [3e-3]}
        try:
            hp = dict(T.DEFAULTS, epochs=3, patience=2, batch=128)
            a = types.SimpleNamespace(time_budget=0, seed=0, grid_log=None)
            net, info, best, res = T.grid_search(self.splits["train"], self.splits["val"], self.names, hp, self.vocab,
                                                 "numpy", a, quiet)
            configs = [dict(hp)] + [dict(hp, **c) for c in T.grid_configs(0)]
            self.assertEqual([r["hyper"] for r in res], configs)
            for r, c in zip(res, configs):
                n, _ex = T.make_net(self.splits["train"], self.names, c, self.vocab, 0)
                ep, vl, _h = old_train_numpy(n, self.splits["train"], self.splits["val"], c, 0)
                self.assertEqual((r["valLogloss"], r["bestEpoch"]), (vl, ep))
        finally:
            T.GRID = old_grid

    def test_default_cli_outputs_carry_no_new_keys(self):
        rep = os.path.join(self.tmp, "plain.json")
        out = os.path.join(self.tmp, "plain-model.json")
        with redirect_stdout(io.StringIO()):
            T.main([self.data, "--epochs", "2", "--hidden", "4", "--dim", "2", "--report", rep, "--out", out])
        with open(rep) as f:
            r = json.load(f)
        with open(out) as f:
            m = json.load(f)
        for k in ("search", "fast", "trainFraction", "weightBy", "subsample", "auxTurnsToEnd", "softLabels"):
            self.assertNotIn(k, r)
            self.assertNotIn(k, m["training"])
        self.assertEqual([s["stage"] for s in r["memory"]], ["load", "fit", "baselines", "score"])
        g = A.read_games(self.data)
        self.assertFalse(any("night" in x for x in g))
        with open(os.path.join(self.data, "stats.json")) as f:
            self.assertNotIn("nights", json.load(f))

    # -- --train-fraction and the curve

    def test_train_fraction(self):
        full = self.splits
        _s, _n, half = T.load_data(self.data, "pair", 0.5)
        _s, _n, again = T.load_data(self.data, "pair", 0.5)
        for s in ("val", "test"):
            for k in ("board", "indptr", "slot", "y", "game"):
                self.assertTrue(np.array_equal(getattr(half[s], k), getattr(full[s], k)), (s, k))
        games = T.read_games(self.data)
        kept = {T.pair_key(games[g]) for g in set(half["train"].game.tolist())}
        allp = {T.pair_key(games[g]) for g in set(full["train"].game.tolist())}
        self.assertEqual(kept, {k for k in allp if T.in_fraction(k, 0.5)})
        self.assertTrue(0 < len(half["train"]) < len(full["train"]))
        self.assertTrue(np.array_equal(half["train"].board, again["train"].board))
        # the rows are the full split's rows of those pairs, in order: a view of them trains identically
        keep = np.array([T.in_fraction(T.pair_key(g), 0.5) for g in games], bool)
        view = self.N.RowView(full["train"], np.nonzero(keep[full["train"].game])[0])
        self.assertTrue(np.array_equal(view.take(np.arange(len(view))).board, half["train"].board))
        self.assertTrue(all(np.array_equal(a, b) for a, b in zip(view.moments(), half["train"].moments())))
        hp = dict(T.DEFAULTS, hidden="8", dim=3, epochs=3, patience=3, batch=64)
        n1, i1 = T.fit(half["train"], full["val"], self.names, hp, self.vocab, "numpy", 0)
        n2, i2 = T.fit(view, full["val"], self.names, hp, self.vocab, "numpy", 0)
        self.assertEqual(i1["history"], i2["history"])
        self.assertTrue(np.array_equal(n1.predict(full["test"]), n2.predict(full["test"])))

    def test_curve(self):
        import eval_search as S
        hp = dict(T.DEFAULTS, hidden="8", dim=3, epochs=3, patience=3, batch=64)
        reps = []
        for jobs in (1, 2):
            with redirect_stdout(io.StringIO()):
                reps.append(S.learning_curve(self.args(curve="0.5,1.0", jobs=jobs), hp, quiet))
        a, b = reps
        self.assertEqual([p["testLogloss"] for p in a["points"]], [p["testLogloss"] for p in b["points"]])
        self.assertEqual([p["fraction"] for p in a["points"]], [0.5, 1.0])
        self.assertEqual(a["points"][-1]["minusLargest"]["estimate"], 0.0)
        self.assertLess(a["points"][0]["trainRows"], a["points"][1]["trainRows"])
        for p in a["points"]:
            t = p["testLogloss"]
            self.assertLessEqual(t["lo"], t["estimate"])
            self.assertLessEqual(t["estimate"], t["hi"])
        # the 0.5 point is the --train-fraction 0.5 model
        _s, _n, half = T.load_data(self.data, "pair", 0.5)
        net, info = T.fit(half["train"], half["val"], self.names, hp, self.vocab, "numpy", 0)
        self.assertEqual(info["valLogloss"], a["points"][0]["valLogloss"])
        self.assertIn("learning curve", S.format_curve(a))

    # -- the search

    def test_search_plan(self):
        import eval_search as S
        self.assertEqual(S.rungs(27, 3, 2, 3), [(27, 2), (9, 6), (3, None)])
        self.assertEqual(S.rungs(10, 3, 1, 1), [(10, 1), (4, 3), (2, 9), (1, None)])
        self.assertEqual(S.rungs(2, 3, 2, 3), [(2, None)])
        n1 = S.plan_configs(3600, 3, 2, 3, 4, 30.0, 40, 1441)
        n2 = S.plan_configs(7200, 3, 2, 3, 4, 30.0, 40, 1441)
        self.assertLessEqual(n1, n2)
        self.assertLessEqual(S.plan_seconds(n2, 3, 2, 3, 4, 30.0, 40), 0.8 * 7200)
        cs = S.sha_configs(dict(T.DEFAULTS), 30, 5)
        self.assertEqual(cs, S.sha_configs(dict(T.DEFAULTS), 30, 5))
        self.assertEqual(cs[0], dict(T.DEFAULTS))
        self.assertEqual(len({json.dumps({k: c[k] for k in T.GRID}, sort_keys=True) for c in cs}), 30)
        self.assertNotEqual(cs, S.sha_configs(dict(T.DEFAULTS), 30, 6))

    def test_search_is_deterministic_and_fair(self):
        import eval_search as S
        hp = dict(T.DEFAULTS, hidden="8", dim=4, epochs=6, patience=2, batch=128)
        tr, va = self.splits["train"], self.splits["val"]
        runs = []
        for jobs in (1, 2, 1):
            runs.append(S.successive_halving(tr, va, self.names, hp, self.vocab,
                                             self.args(configs=7, jobs=jobs, grid_log=os.path.join(self.tmp, "g.jsonl")),
                                             quiet, T.read_games(self.data)))
        strip = lambda recs: [{k: v for k, v in r.items() if k != "seconds"} for r in recs]  # noqa: E731
        for other in runs[1:]:
            self.assertEqual(strip(other[3]), strip(runs[0][3]))
            self.assertEqual(other[2], runs[0][2])
            for a, b in zip(other[0].params(), runs[0][0].params()):
                self.assertTrue(np.array_equal(a, b))
        net, info, best, recs, summary = runs[0]
        self.assertEqual(summary["rungs"], [{"configs": 7, "epochs": 1}, {"configs": 3, "epochs": None}])
        self.assertFalse(summary["cutByBudget"])
        rung0 = [r for r in recs if r["rung"] == 0]
        self.assertEqual(len(rung0), 7)
        self.assertEqual({r["epochs"] for r in rung0}, {1})                  # every configuration the same epochs
        final = [r for r in recs if r["rung"] == 1]
        self.assertEqual(len(final), 3)
        self.assertTrue(all(r["done"] for r in final))                       # the finalists to early stopping
        self.assertEqual({r["i"] for r in final},
                         set(sorted(range(7), key=lambda i: (rung0[i]["valLogloss"], i))[:3]))
        self.assertEqual(info["valLogloss"], min(r["valLogloss"] for r in final))
        # the winner trained to the end is the plain fit of its configuration
        n2, i2 = T.fit(tr, va, self.names, best, self.vocab, "numpy", 0)
        self.assertEqual(i2["history"], info["history"])
        with open(os.path.join(self.tmp, "g.jsonl")) as f:
            self.assertEqual(len(f.read().splitlines()), 3 * len(recs))

    def test_search_cli_and_budget_plan(self):
        rep = os.path.join(self.tmp, "sha.json")
        out = os.path.join(self.tmp, "sha-model.json")
        buf = io.StringIO()
        with redirect_stdout(buf):
            T.main([self.data, "--search", "sha", "--time-budget", "30", "--min-epochs", "1", "--epochs", "3",
                    "--patience", "2", "--hidden", "4", "--dim", "2", "--final-epochs", "3", "--report", rep,
                    "--out", out])
        self.assertIn("repeat with --configs", buf.getvalue())
        with open(rep) as f:
            r = json.load(f)
        self.assertEqual(r["search"]["method"], "sha")
        self.assertGreater(r["search"]["configs"], 1)
        with open(out) as f:
            m = json.load(f)
        self.assertEqual(m["training"]["search"]["configs"], r["search"]["configs"])
        self.N.EvalNet.from_json(m)
        with self.assertRaises(SystemExit):
            T.main([self.data, "--search", "sha"])                         # neither --configs nor a budget

    # -- float32

    def test_fast_gradients_and_training(self):
        tr, va = self.splits["train"], self.splits["val"]
        b = tr.take(np.arange(min(200, len(tr))))
        for hidden in ("6,4", ""):
            hp = dict(T.DEFAULTS, hidden=hidden, dim=3)
            net, _ex = T.make_net(tr, self.names, hp, self.vocab, 1)
            net.E = np.random.default_rng(0).normal(0, 0.3, net.E.shape)
            f32 = self.N.Fast32(net)
            l64, _c, g64 = net.loss_grad(b, 1e-3, 1e-2)
            l32, _c, g32 = f32.loss_grad(b, 1e-3, 1e-2)
            self.assertAlmostEqual(l64, l32, places=5)
            for a, c in zip(g64, g32):
                self.assertEqual(c.dtype, np.float32)
                self.assertLess(float(np.abs(a - c).max()), 1e-4 * max(1.0, float(np.abs(a).max())))
            self.assertTrue(np.allclose(net.predict(va), f32.predict(va), atol=1e-5))
        hp = dict(T.DEFAULTS, hidden="8", dim=4, epochs=4, patience=4, batch=64)
        n64, i64 = T.fit(tr, va, self.names, hp, self.vocab, "numpy", 0)
        n32, i32 = T.fit(tr, va, self.names, hp, self.vocab, "numpy", 0, fast=True)
        self.assertLess(abs(i64["valLogloss"] - i32["valLogloss"]), 0.05)
        self.assertEqual(n32.W[0].dtype, np.float64)              # exported and scored in float64, as always
        m = n32.to_json(self.schema, self.names, {})
        back = self.N.EvalNet.from_json(json.loads(json.dumps(m)))
        self.assertTrue(np.allclose(back.predict(va), n32.predict(va), rtol=0, atol=1e-12))

    # -- the methods review's options (D364): effective n, game weights, soft labels, subsampling, the aux head

    def test_icc_and_effective_n(self):
        rng = np.random.default_rng(0)
        g = np.repeat(np.arange(400), 50)
        x = rng.normal(0, 1, 400)[g] + rng.normal(0, 1, len(g))      # rho = 0.5 by construction
        r = T.icc(x, g)
        self.assertLess(abs(r["rho"] - 0.5), 0.08)
        self.assertAlmostEqual(r["designEffect"], 1 + 49 * r["rho"], places=1)
        self.assertLess(r["nEff"], len(g) / (1 + 49 * 0.4))     # 20,000 rows worth well under 1,000
        self.assertGreater(r["nEff"], len(g) / (1 + 49 * 0.6))
        self.assertLess(T.icc(rng.normal(0, 1, len(g)), g)["rho"], 0.02)  # independent rows: about 1
        d = T.held_out_detail({"prior": lambda r: np.full(len(r), 0.5)}, self.splits, T.read_games(self.data))
        self.assertEqual(d["splits"]["test"]["rows"], len(self.splits["test"]))
        self.assertIn("byGame", d["test"])
        self.assertIn("loglossByGame", d["test"]["all"]["prior"])

    def test_game_weights(self):
        tr = self.splits["train"]
        w = T.game_weights(tr.game)
        self.assertAlmostEqual(float(w.mean()), 1.0)
        tot = np.bincount(tr.game, weights=w)
        tot = tot[tot > 0]
        self.assertTrue(np.allclose(tot, tot[0]))                       # every game the same total weight
        hp = dict(T.DEFAULTS, hidden="6", dim=3)
        net, _ex = T.make_net(tr, self.names, hp, self.vocab, 1)
        b = tr.take(np.arange(min(120, len(tr))))
        wb = np.random.default_rng(3).uniform(0.2, 3.0, len(b))
        # all-ones weights are the plain mean; a weighted gradient matches finite differences
        l1, _c, g1 = net.loss_grad(b, 1e-3, 1e-2)
        l2, _c, g2 = net.loss_grad(b, 1e-3, 1e-2, weights=np.ones(len(b)))
        self.assertAlmostEqual(l1, l2, places=12)
        self.assertTrue(all(np.allclose(a, c, rtol=1e-10, atol=1e-14) for a, c in zip(g1, g2)))
        self._fd_check(net, b, wb)
        net2, info = T.fit(tr, self.splits["val"], self.names, dict(hp, epochs=2, patience=2, batch=64), self.vocab,
                           "numpy", 0, weight_by="game")
        self.assertTrue(math.isfinite(info["valLogloss"]))

    def _fd_check(self, net, b, weights=None):
        _l, _c, grads = net.loss_grad(b, 1e-3, 1e-2, weights=weights)
        rng = np.random.default_rng(1)
        worst = 0.0
        for pi, p in enumerate(net.params()):
            for _ in range(4):
                idx = (int(b.slot[rng.integers(len(b.slot))]), int(rng.integers(p.shape[1]))) if pi == 0 else \
                    tuple(int(rng.integers(0, s)) for s in p.shape)
                old = p[idx]
                p[idx] = old + 1e-6
                lp = net.loss_grad(b, 1e-3, 1e-2, weights=weights)[0]
                p[idx] = old - 1e-6
                lm = net.loss_grad(b, 1e-3, 1e-2, weights=weights)[0]
                p[idx] = old
                worst = max(worst, abs((lp - lm) / 2e-6 - grads[pi][idx]))
        self.assertLess(worst, 1e-6)

    def test_aux_head(self):
        _s, _n, sp = T.load_data(self.data, "pair", turns_to_end=True)
        tr = sp["train"]
        self.assertIsNotNone(tr.tte)
        self.assertTrue(np.array_equal(tr.take(np.arange(5)).tte, tr.tte[:5]))
        for hidden in ("6,4", ""):
            hp = dict(T.DEFAULTS, hidden=hidden, dim=3)
            net, _ex = T.make_net(tr, self.names, hp, self.vocab, 1, aux=0.5)
            net.E = np.random.default_rng(0).normal(0, 0.3, net.E.shape)
            b = tr.take(np.arange(min(100, len(tr))))
            self._fd_check(net, b)
            self._fd_check(net, b, np.random.default_rng(2).uniform(0.5, 2, len(b)))
            f32 = self.N.Fast32(net)
            l64, _c, g64 = net.loss_grad(b, 1e-3, 1e-2)
            l32, _c, g32 = f32.loss_grad(b, 1e-3, 1e-2)
            self.assertAlmostEqual(l64, l32, places=4)
            for a, c in zip(g64, g32):
                self.assertLess(float(np.abs(a - c).max()), 1e-4 * max(1.0, float(np.abs(a).max())))
        hp = dict(T.DEFAULTS, hidden="8", dim=3, epochs=3, patience=3, batch=64)
        net, info = T.fit(tr, sp["val"], self.names, hp, self.vocab, "numpy", 0, aux=0.5)
        rep = T.aux_report(net, sp, 0.5)
        self.assertGreater(rep["testMAE"], 0)
        m = net.to_json(self.schema, self.names, {})
        self.assertEqual(len(m["layers"]), 2)                            # the win head only
        back = self.N.EvalNet.from_json(json.loads(json.dumps(m)))
        self.assertIsNone(back.aux)
        self.assertTrue(np.allclose(back.predict(sp["test"]), net.predict(sp["test"]), rtol=0, atol=1e-12))
        self.assertEqual(net.n_params(), back.n_params())

    def test_subsample(self):
        tr = self.splits["train"]
        hp = dict(T.DEFAULTS, hidden="4", dim=2, batch=64)
        net, _ex = T.make_net(tr, self.names, hp, self.vocab, 0)
        a = T.EpochTrainer(net, tr, hp, 5, subsample=0.25)
        b = T.EpochTrainer(net, tr, hp, 5, subsample=0.25)
        ra, rb = a.epoch_rows(), b.epoch_rows()
        self.assertTrue(np.array_equal(ra, rb))                         # seeded
        self.assertFalse(np.array_equal(ra, a.epoch_rows()))            # drawn afresh each epoch
        self.assertEqual(len(set(ra.tolist())), len(ra))
        per = np.bincount(tr.game[ra], minlength=int(tr.game.max()) + 1)
        full = np.bincount(tr.game, minlength=int(tr.game.max()) + 1)
        self.assertTrue(np.array_equal(per, np.ceil(full * 0.25).astype(int)))   # every game, its share
        n1, i1 = T.fit(tr, self.splits["val"], self.names, dict(hp, epochs=3, patience=3), self.vocab, "numpy", 0,
                       subsample=0.25)
        self.assertEqual(i1["epochsRun"], 3)

    def test_soft_labels(self):
        games = T.read_games(self.data)
        _s, _n, sp = T.load_data(self.data, "pair", rows_to_end=True)
        tr = sp["train"]
        path = os.path.join(self.tmp, "soft.npz")
        sel = np.arange(0, len(tr), 3)
        np.savez(path, game=tr.game[sel], rows_to_end=tr.rte[sel], p=np.full(len(sel), 0.3), k=np.full(len(sel), 64))
        info = T.apply_soft_labels(sp, T.read_soft_labels(path, len(games)), 1.0)
        self.assertEqual(info["trainRows"], len(sel))
        self.assertEqual(info["unmatched"], 0)
        self.assertTrue(np.allclose(tr.t[sel], 0.3))
        rest = np.setdiff1d(np.arange(len(tr)), sel)
        self.assertTrue(np.array_equal(tr.t[rest], (tr.y[rest] + 1.0) / 2.0))
        self.assertTrue(np.array_equal(tr.take(sel[:4]).t, np.full(4, 0.3)))   # carried through take
        # a logistic trained on soft targets only: its mean prediction moves to them
        _s, _n, sp2 = T.load_data(self.data, "pair", rows_to_end=True)
        allp = os.path.join(self.tmp, "soft-all.npz")
        t2 = sp2["train"]
        np.savez(allp, game=t2.game, rows_to_end=t2.rte, p=np.full(len(t2), 0.3))
        T.apply_soft_labels(sp2, T.read_soft_labels(allp, len(games)), 1.0)
        hp = dict(T.DEFAULTS, hidden="", dim=2, epochs=40, patience=40, batch=256, lr=3e-2, l2=1e-2, card_l2=1.0)
        net, _i = T.fit(t2, t2, self.names, hp, self.vocab, "numpy", 0)
        self.assertLess(abs(float(net.predict(t2).mean()) - 0.3), 0.05)
        # half weight: the target halfway between the outcome and the soft label
        _s, _n, sp3 = T.load_data(self.data, "pair", rows_to_end=True)
        T.apply_soft_labels(sp3, T.read_soft_labels(allp, len(games)), 0.5)
        self.assertTrue(np.allclose(sp3["train"].t, 0.5 * (sp3["train"].y + 1.0) / 2.0 + 0.15))
        for bad in ({"p": np.full(len(sel), 1.2)}, {"game": np.full(len(sel), 10 ** 6)}):
            arr = {"game": tr.game[sel], "rows_to_end": tr.rte[sel], "p": np.full(len(sel), 0.3), **bad}
            np.savez(path, **arr)
            with self.assertRaises(SystemExit):
                T.read_soft_labels(path, len(games))
        np.savez(path, game=np.r_[tr.game[sel], tr.game[sel[:1]]], rows_to_end=np.r_[tr.rte[sel], tr.rte[sel[:1]]],
                 p=np.full(len(sel) + 1, 0.3))
        with self.assertRaises(SystemExit):                              # a repeated key
            T.read_soft_labels(path, len(games))
        # the CLI: val and test are never relabelled
        np.savez(path, game=tr.game[sel], rows_to_end=tr.rte[sel], p=np.full(len(sel), 0.3))
        rep = os.path.join(self.tmp, "soft-rep.json")
        with redirect_stdout(io.StringIO()):
            T.main([self.data, "--soft-labels", path, "--soft-weight", "0.5", "--epochs", "1", "--hidden", "4",
                    "--dim", "2", "--report", rep])
        with open(rep) as f:
            self.assertEqual(json.load(f)["softLabels"]["trainRows"], len(sel))

    # -- multi-night datasets and the comparison

    @staticmethod
    def stats(d):
        with open(os.path.join(d, "stats.json")) as f:
            return json.load(f)

    def test_queue_nights_and_comparison(self):
        import eval_compare as C
        D = self.D
        root = os.path.join(self.tmp, "queue")
        for key, src in (("normal/synergy", "recorded"), ("bridge/synergy+vintage", "decisions"),
                         ("normal/vintage", "explore")):
            os.makedirs(os.path.dirname(os.path.join(root, key)), exist_ok=True)
            shutil.copytree(os.path.join(LAB, src), os.path.join(root, key))
        plans = {1: [{"key": "normal/synergy", "seed": 1, "drafts": 50}],
                 2: [{"key": "bridge/synergy+vintage", "seed": 100, "drafts": 5}],
                 3: [{"key": "normal/vintage", "seed": 100, "drafts": 5}]}
        for n, chunks in plans.items():
            with open(os.path.join(root, f"night-{n}.json"), "w") as f:
                json.dump({"chunks": chunks}, f)
        nohuman = os.path.join(self.tmp, "nohuman")
        os.makedirs(nohuman, exist_ok=True)
        self.assertEqual(len(D.queue_logs(root, None)), 6)
        self.assertEqual(len(D.queue_logs(root, None, [1, 3])), 4)
        self.assertEqual([os.path.basename(os.path.dirname(p)) for p in D.queue_vocab(root)], ["synergy", "vintage"])
        n1, n13 = os.path.join(self.tmp, "q-n1"), os.path.join(self.tmp, "q-n13")
        # --keep-reserved: night 1 is fixtures/cubelab/recorded, which has no drafts.jsonl, so D365's fail-closed
        # filter would drop its games as decks it cannot know; the reserved filter is not what this test is about
        with redirect_stdout(io.StringIO()):
            D.main(["--queue-root", root, "--nights", "1", "--out", n1, "--human", nohuman, "--repo", ROOT,
                    "--keep-reserved"])
            D.main(["--queue-root", root, "--nights", "1,2,3", "--vocab-from", n1, "--out", n13, "--human", nohuman,
                    "--repo", ROOT, "--keep-reserved"])
        s1, s13 = (self.stats(d) for d in (n1, n13))
        self.assertEqual(s1["schemaId"], s13["schemaId"])                  # --vocab-from: one schema
        self.assertEqual(s13["nights"], {"1": 2, "2": 2, "3": 2})
        self.assertEqual(s13["playExplore"], {"mode": "include", "games": 2})   # D358: kept for the evaluator
        g13 = A.read_games(n13)
        self.assertEqual(sorted(g["night"] for g in g13), [1, 1, 2, 2, 3, 3])
        # dataset.py's own split is a hash of the pair: night 1's games keep theirs (train_eval's pair split is
        # the same hash from 20 pairs on: SplitAcrossNightsTest)
        r = A.audit(n13, "dataset", n1)
        self.assertTrue(r["pass"], r["failures"])
        self.assertEqual(r["reference"]["missingGames"], 0)
        # the comparison: two small models on the same data; the reference subset is night 1's test pairs
        m_old, m_new = os.path.join(self.tmp, "old.json"), os.path.join(self.tmp, "new.json")
        with redirect_stdout(io.StringIO()):
            T.main([self.data, "--epochs", "2", "--hidden", "4", "--dim", "2", "--out", m_old])
            T.main([self.data, "--epochs", "3", "--hidden", "8", "--dim", "2", "--out", m_new, "--seed", "1"])
        leaf = os.path.join(self.tmp, "leaf.jsonl")
        games = T.read_games(self.data)
        sp = T.game_splits(games, "pair")
        with open(leaf, "w") as f:
            for g, s in zip(games, sp):
                if s == "test":
                    for fr in range(3):
                        f.write(json.dumps({"file": g["file"], "frame": fr, "seat": 0, "turn": fr, "won": 1,
                                            "leaf": 0, "eval": 0.6}) + "\n")
        rep = C.compare(self.data, m_new, m_old, reference=self.data, new_leaf=leaf, old_leaf=leaf, log=quiet)
        self.assertEqual(rep["testPairsTrainedOn"], {"new": 0, "old": 0})
        self.assertEqual(rep["subsets"]["all"]["rows"], len(self.splits["test"]))
        self.assertEqual(rep["subsets"]["reference"]["rows"], len(self.splits["test"]))
        d = rep["subsets"]["all"]["oldMinusNew"]
        self.assertAlmostEqual(d["estimate"], rep["subsets"]["all"]["old"]["logloss"]
                               - rep["subsets"]["all"]["new"]["logloss"], places=12)
        self.assertEqual(rep["leafRows"]["oldMinusNew"]["estimate"], 0.0)
        self.assertIn(rep["better"], (True, False))
        # a model whose own split trained on a test pair is refused
        m_game = os.path.join(self.tmp, "bygame.json")
        with redirect_stdout(io.StringIO()):
            T.main([self.data, "--epochs", "1", "--hidden", "4", "--dim", "2", "--split-by", "game", "--out", m_game])
        with self.assertRaises(SystemExit):
            C.compare(self.data, m_new, m_game, reference=self.data, log=quiet)


if __name__ == "__main__":
    unittest.main()
