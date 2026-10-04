# mtg-table — tools/ml tests: the evaluator's attributions and its ensemble (attribution.py, eval_serve.py, D368).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root; numpy)

What D368 claims, held on the committed parity model (fixtures/eval/model.json,
one hidden ReLU layer) and every decision row of every committed recording:

* completeness: the attributions of a position sum to logit(position) -
  logit(baseline) within 1e-9, and the points to 100 (p - p0);
* the attribution module's network is the served one (its logit's sigmoid is
  the served P(win) to 1e-12);
* exactness: the piecewise-linear walk equals a fine Riemann sum of the
  gradient, and on a model with no hidden layer it is gradient x input;
* every feature has a named bucket;
* hidden information: the scrambler of test_encode (the opponent's hand named,
  libraries filled, stubs named, face-down cards given an `alt`) changes no
  attribution, and every card a bucket names is one the viewer's state shows;
* the ensemble: mean, sample sd and n; a member on another layout is refused;
  a comma list, a directory and a manifest name the same ensemble; one model
  is served exactly as before.
"""
from __future__ import annotations

import copy
import json
import math
import os
import random
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402
import eval_serve as S  # noqa: E402
from test_encode import corpus, scramble_hidden  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

MODEL = os.path.join(ROOT, "fixtures", "eval", "model.json")
SERVE = os.path.join(ROOT, "tools", "ml", "eval_serve.py")


def games():
    return [g for p in corpus() for g in E.read_games(p)]


def visible_names(state: dict, seat: int) -> set[str]:
    """Every card name the viewer's state shows face up, outside the opponent's
    hand and both libraries (which encode.py never reads)."""
    out: set[str] = set()
    for p in state.get("players") or []:
        for zn, z in (p.get("zones") or {}).items():
            if zn == "library" or (zn == "hand" and p.get("id") != seat):
                continue
            for c in z.get("cards") or []:
                if not c.get("hidden") and c.get("name"):
                    out.add(E.norm_name(c["name"]))
    for c in state.get("stackCards") or []:
        if not c.get("hidden") and c.get("name"):
            out.add(E.norm_name(c["name"]))
    return out


def load_model() -> dict:
    with open(MODEL, encoding="utf-8") as f:
        return json.load(f)


def perturbed(m: dict, scale: float, shift: float) -> dict:
    """Another member of the same layout: the output layer rescaled and shifted."""
    m = copy.deepcopy(m)
    last = m["layers"][-1]
    last["W"] = (np.asarray(last["W"], np.float64) * scale).tolist()
    last["b"] = [b + shift for b in last["b"]]
    return m


@unittest.skipIf(np is None, "numpy is not installed: attributions skipped")
class AttributionTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        import attribution as A
        cls.A = A
        cls.srv = S.Served(MODEL)
        cls.mlp = cls.srv.members[0].mlp
        cls.games = games()
        cls.rows = [(g, r) for g in cls.games for r in E.encode_game(g, cls.srv.schema)]

    def test_completeness_on_every_decision_row(self):
        worst = 0.0
        worst_pts = 0.0
        for g, r in self.rows:
            a = self.mlp.attribute(r.features)
            total = sum(a["board"].values()) + sum(a["cards"].values())
            worst = max(worst, abs(total - (a["z"] - a["z0"])))
            ex = self.A.explain([self.mlp], r.features, self.srv.schema.names, self.srv.schema.vocab.cards,
                                list(E.CARD_STATES))
            pts = sum(b["pts"] for b in ex["buckets"])
            worst_pts = max(worst_pts, abs(pts - 100 * (ex["p"] - ex["baseline"]["p"])))
        self.assertGreater(len(self.rows), 2000)
        self.assertLess(worst, 1e-9, "sum of attributions != logit - baseline logit")
        self.assertLess(worst_pts, 1e-7, "sum of points != 100 (p - p0)")

    def test_the_network_is_the_served_one(self):
        for g, r in self.rows[::5]:
            a = self.mlp.attribute(r.features)
            self.assertAlmostEqual(1 / (1 + math.exp(-a["z"])), self.srv.p_of(r.features), delta=1e-12)
        self.assertAlmostEqual(self.mlp.z0, self.mlp.logit(self.mlp.x0))

    def test_exact_walk_equals_a_fine_riemann_sum(self):
        """The segment walk is the integral: a midpoint sum of the gradient at
        4,000 points along the path agrees to 1e-3 of the logit gap."""
        def grad(x):   # the gradient at one point (autodiff by hand: one ReLU layer and more)
            h, masks = x, []
            for i in range(len(self.mlp.W) - 1):
                pre = h @ self.mlp.W[i] + self.mlp.b[i]
                masks.append(pre > 0)
                h = np.maximum(pre, 0)
            g = self.mlp.W[-1][:, 0]
            for i in range(len(self.mlp.W) - 2, -1, -1):
                g = (g * masks[i]) @ self.mlp.W[i].T
            return g
        steps = 4000
        segs_seen = 0
        for g_, r in self.rows[::97]:
            x = self.mlp.inputs(r.features)
            exact, segs = self.mlp.path_gradient(x)
            segs_seen = max(segs_seen, segs)
            approx = sum(grad(self.mlp.x0 + (k + 0.5) / steps * (x - self.mlp.x0)) for k in range(steps)) / steps
            gap = abs(self.mlp.logit(x) - self.mlp.z0)
            self.assertLess(float(np.abs((exact - approx) * (x - self.mlp.x0)).sum()), 1e-3 * max(gap, 1.0))
        self.assertGreater(segs_seen, 1, "no path crossed a ReLU boundary: the walk was not exercised")

    def test_no_hidden_layer_is_gradient_times_input(self):
        m = load_model()
        width = m["layers"][0]["in"]
        rng = random.Random(7)
        m["layers"] = [{"in": width, "out": 1, "activation": "sigmoid",
                        "W": [[rng.uniform(-0.2, 0.2) for _ in range(width)]], "b": [0.1]}]
        lin = self.A.Mlp(m, self.srv.schema.card_offset, len(E.CARD_STATES))
        w = lin.W[0][:, 0]
        for g, r in self.rows[::200]:
            x = lin.inputs(r.features)
            G, segs = lin.path_gradient(x)
            self.assertEqual(segs, 1)
            self.assertTrue(np.allclose(G, w, atol=1e-12))

    def test_every_feature_has_a_named_bucket(self):
        A = self.A
        for n in self.srv.schema.names[:self.srv.schema.card_offset]:
            key, label = A.bucket_of(n)
            self.assertFalse(key.endswith(".other"), n)
            self.assertTrue(label)
        self.assertEqual(A.card_bucket("Glorybringer", "me.bf_untapped"), ("card.me:Glorybringer", "your Glorybringer"))
        self.assertEqual(A.card_bucket("<facedown>", "opp.bf_tapped"), ("card.opp:<facedown>", "their face-down cards"))
        self.assertEqual(A.bucket_of("opp.hand"), ("opp.hand", "their hand size"))
        self.assertEqual(A.bucket_of("me.board.power")[0], A.bucket_of("types.me.battlefield.creature")[0])

    def test_hidden_information(self):
        """Scrambled hidden zones change no attribution; every named card is shown to the viewer."""
        rng = random.Random(368)
        names = [n for n in self.srv.schema.vocab.cards if n not in E.SPECIALS]
        checked = named = 0
        for g in self.games:
            rows = E.encode_game(g, self.srv.schema)
            sg = scramble_hidden(g, rng, names)
            for r in rows[::4]:
                plain = self.srv.evaluate(dict(S.request_for(g, r.seq), explain=True))
                req = S.request_for(sg, r.seq)
                leaked = self.srv.evaluate(dict(req, explain=True))
                self.assertEqual(plain["explain"], leaked["explain"], f"hidden information moved an attribution: "
                                                                      f"{g.path} seq {r.seq}")
                shown = visible_names(S.request_for(g, r.seq)["state"], g.seat)
                for b in plain["explain"]["buckets"]:
                    if b["key"].startswith("card."):
                        card = b["key"].split(":", 1)[1]
                        if card in E.SPECIALS:
                            continue
                        named += 1
                        self.assertIn(E.norm_name(card), shown, f"{g.path} seq {r.seq}: {b['label']} is not shown")
                checked += 1
        self.assertGreater(checked, 500)
        self.assertGreater(named, 500)


@unittest.skipIf(np is None, "numpy is not installed: the ensemble skipped")
class EnsembleTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        import evalnet as N
        cls.tmp = tempfile.mkdtemp()
        base = load_model()
        cls.paths = []
        for i, (sc, sh) in enumerate(((1.0, 0.0), (1.3, 0.2), (0.7, -0.3))):
            p = os.path.join(cls.tmp, "members", f"m{i}.json")
            N.save_model(p, perturbed(base, sc, sh) if i else base)
            cls.paths.append(p)
        cls.g = next(E.read_games(os.path.join(ROOT, "fixtures", "games", "g1.jsonl")))
        cls.single = S.Served(MODEL)
        cls.rows = E.encode_game(cls.g, cls.single.schema)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_mean_sd_and_n(self):
        ens = S.Served(",".join(self.paths))
        self.assertEqual(ens.n, 3)
        for r in self.rows[::9]:
            ps = [m.p_of(r.features) for m in ens.members]
            a = ens.evaluate(S.request_for(self.g, r.seq))
            self.assertAlmostEqual(a["p"], sum(ps) / 3, delta=1e-12)
            self.assertAlmostEqual(a["sd"], float(np.std(ps, ddof=1)), delta=1e-12)
            self.assertEqual(a["n"], 3)
            ex = ens.evaluate(dict(S.request_for(self.g, r.seq), explain=True))["explain"]
            self.assertEqual(ex["members"], 3)
            self.assertAlmostEqual(ex["p"], a["p"], delta=1e-12)
            self.assertAlmostEqual(sum(b["pts"] for b in ex["buckets"]), 100 * (ex["p"] - ex["baseline"]["p"]),
                                   delta=1e-7)

    def test_one_model_is_served_as_before(self):
        d = self.single.describe()
        self.assertEqual(d["n"], 1)
        self.assertNotIn("members", d)
        with open(MODEL, "rb") as f:
            import hashlib
            self.assertEqual(d["model"], hashlib.sha256(f.read()).hexdigest()[:12])
        for r in self.rows[::9]:
            a = self.single.evaluate(S.request_for(self.g, r.seq))
            self.assertNotIn("sd", a)
            self.assertNotIn("explain", a)
            self.assertEqual(a["p"], self.single.members[0].p_of(r.features))

    def test_the_three_ways_to_name_an_ensemble(self):
        listed = S.Served(",".join(self.paths)).describe()
        folder = S.Served(os.path.dirname(self.paths[0])).describe()
        man = os.path.join(self.tmp, "ensemble.json")
        with open(man, "w", encoding="utf-8") as f:
            json.dump({"format": S.ENSEMBLE_FORMAT, "formatVersion": 1,
                       "models": [os.path.relpath(p, self.tmp) for p in self.paths]}, f)
        manifest = S.Served(man).describe()
        self.assertEqual(listed, folder)
        self.assertEqual(listed, manifest)
        self.assertEqual(listed["members"], [S.Member(p).sha12 for p in self.paths])
        self.assertNotEqual(listed["model"], listed["members"][0])

    def test_refusals(self):
        import evalnet as N
        other = load_model()
        vocab = other["vocab"][:-4] + ["Lightning Bolt"] + other["vocab"][-4:]   # another card list: another schema
        other["vocab"] = vocab
        other["vocabSha256"] = N.vocab_sha256(vocab)
        other["schemaId"] = E.Schema(E.Vocab(vocab)).schema_id
        sch = E.Schema(E.Vocab(vocab))
        other["nFeatures"], other["cardOffset"] = sch.n, sch.card_offset
        other["input"]["cardEmbedding"] = other["input"]["cardEmbedding"][:-4] + [[0.0] * other["input"]["cardDim"]] \
            + other["input"]["cardEmbedding"][-4:]
        op = os.path.join(self.tmp, "other.json")
        N.save_model(op, other)
        S.Served(op)   # a valid model on its own ...
        with self.assertRaises(S.ModelError) as cm:   # ... but not beside another schema
            S.Served(self.paths[0] + "," + op)
        self.assertIn("share one schema", str(cm.exception))
        with self.assertRaises(S.ModelError):
            S.Served(self.paths[0] + "," + self.paths[0])
        bad = os.path.join(self.tmp, "bad-ensemble.json")
        with open(bad, "w", encoding="utf-8") as f:
            json.dump({"format": S.ENSEMBLE_FORMAT, "formatVersion": 1, "models": []}, f)
        with self.assertRaises(S.ModelError):
            S.Served(bad)
        with self.assertRaises(S.RequestError):
            self.single.evaluate(dict(S.request_for(self.g, self.rows[0].seq), explain="yes"))

    def test_the_process_serves_an_ensemble(self):
        r = self.rows[20]
        lines = [json.dumps({"id": 1, **S.request_for(self.g, r.seq), "explain": True})]
        out = subprocess.run([sys.executable, SERVE, "--model", ",".join(self.paths)], input="\n".join(lines) + "\n",
                             capture_output=True, text=True, cwd=ROOT, timeout=120, check=True).stdout.splitlines()
        ready = json.loads(out[0])
        self.assertTrue(ready["ready"])
        self.assertEqual((ready["n"], ready["explain"]), (3, True))
        a = json.loads(out[1])
        want = S.Served(",".join(self.paths)).evaluate(dict(S.request_for(self.g, r.seq), explain=True))
        self.assertAlmostEqual(a["p"], want["p"], delta=1e-12)
        self.assertAlmostEqual(a["sd"], want["sd"], delta=1e-12)
        self.assertEqual([b["key"] for b in a["explain"]["buckets"]], [b["key"] for b in want["explain"]["buckets"]])


if __name__ == "__main__":
    unittest.main()
