# mtg-table — tools/ml tests: the evaluator served to the coach helper (eval_serve.py, D360).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

Feature parity, the crux of D360: the coach helper scores ONE state a client
sends (the viewing seat's redacted state, plus the earlier frames' events), and
the vector it builds must be exactly the row dataset.py built from the same
moment of the recording.

The standard-library half (CI) holds the online encoding against encode_game,
the function dataset.py's rows come from, on every decision row of every
committed recording, with the full history and with the reduced one a client
sends; and the hidden-information scrambler on the online path.  The numpy half
builds a dataset with dataset.py itself, trains a small model on it, and
requires, for every row of every split: the online vector equal to the
dataset's int16 row, the served P(win) equal to the model's P(win) on the
dataset's row, and the same answers through the JSON-lines process the helper
runs.  It also checks the refusals (schema, expected schema, cube, live-unsafe
features).
"""
from __future__ import annotations

import copy
import json
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
from test_encode import corpus, fixture_vocab, scramble_hidden  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
SERVE = os.path.join(ROOT, "tools", "ml", "eval_serve.py")


def games():
    return [g for p in corpus() for g in E.read_games(p)]


class OnlineEncodingTest(unittest.TestCase):
    """Standard library: the online path is encode_game's rows, row for row."""

    @classmethod
    def setUpClass(cls):
        cls.schema = E.Schema(fixture_vocab())
        cls.games = games()

    def test_every_decision_row_full_and_reduced_history(self):
        n = 0
        for g in self.games:
            for r in E.encode_game(g, self.schema):
                for reduced in (False, True):
                    req = S.request_for(g, r.seq, reduced)
                    seat, state, history = S.check_request(req)
                    got = S.online_features(state, seat, history, self.schema)
                    if got != r.features:
                        k = next(j for j in range(len(got)) if got[j] != r.features[j])
                        self.fail(f"{os.path.basename(g.path)} seq {r.seq} (reduced={reduced}): "
                                  f"{self.schema.names[k]} is {got[k]} online, {r.features[k]} in the row")
                    self.assertTrue(S.is_decision(state, seat), f"{g.path} seq {r.seq}")
                n += 1
        self.assertGreater(n, 2000, "the corpus shrank: fewer decision rows than expected")

    def test_reduced_history_is_smaller(self):
        g = self.games[0]
        last = E.encode_game(g, self.schema)[-1].seq
        self.assertLess(len(S.request_for(g, last, True)["history"]), len(S.request_for(g, last, False)["history"]))

    def test_non_decision_states_are_flagged(self):
        seen = 0
        for g in self.games[:4]:
            rows = {r.seq for r in E.encode_game(g, self.schema)}
            for f in g.frames:
                if f.get("type") == "state" and f.get("seq") not in rows:
                    st = f.get("body") or {}
                    if st.get("priority") != g.seat:
                        self.assertFalse(S.is_decision(st, g.seat))
                        seen += 1
        self.assertGreater(seen, 0)

    def test_scrambled_hidden_zones_change_nothing_online(self):
        """D305's scrambler on the online path: the opponent's hand turned into
        named cards, libraries filled, stubs named, face-down cards given an
        `alt` -- every online vector stays what it was."""
        rng = random.Random(359)
        names = [n for n in self.schema.vocab.cards if n not in E.SPECIALS]
        for g in self.games:
            rows = E.encode_game(g, self.schema)
            sg = scramble_hidden(g, rng, names)
            for r in rows[::3]:
                seat, state, history = S.check_request(S.request_for(sg, r.seq))
                self.assertEqual(S.online_features(state, seat, history, self.schema), r.features,
                                 f"hidden information moved a feature: {g.path} seq {r.seq}")

    def test_a_state_redacted_for_the_other_seat_is_refused(self):
        g = next(g for g in self.games if any(
            (f.get("body") or {}).get("players") and f.get("type") == "state" for f in g.frames))
        row = E.encode_game(g, self.schema)[5]
        req = S.request_for(g, row.seq)
        st = req["state"]
        opp = next(p["id"] for p in st["players"] if p["id"] != g.seat)
        opp_hand = next(p for p in st["players"] if p["id"] == opp)["zones"]["hand"]
        if opp_hand.get("count", 0) == 0:
            self.skipTest("the opponent's hand is empty here")
        with self.assertRaises(S.RequestError):
            S.check_request(dict(req, seat=opp))

    def test_bad_requests(self):
        for bad in (None, [], {"seat": "0", "state": {"players": []}}, {"seat": 0, "state": {}},
                    {"seat": 0, "state": {"players": [{"id": 1}]}},
                    {"seat": 0, "state": {"players": [{"id": 0}]}, "history": {}},
                    {"seat": 0, "state": {"players": [{"id": 0}]}, "history": [{"events": 3}]},
                    {"seat": True, "state": {"players": [{"id": 0}]}}):
            with self.assertRaises(S.RequestError, msg=repr(bad)):
                S.check_request(bad)
        S.check_request({"seat": 0, "state": {"players": [{"id": 0}]}})


@unittest.skipIf(np is None, "numpy is not installed: dataset.py parity and the served model skipped")
class DatasetParityTest(unittest.TestCase):
    """numpy: dataset.py's own rows, a model trained on them, and the served answer."""

    @classmethod
    def setUpClass(cls):
        import dataset as D
        import train_eval as T
        cls.tmp = tempfile.mkdtemp()
        decks = sorted(os.path.join("decks", f) for f in os.listdir(os.path.join(ROOT, "decks")) if f.endswith(".dck"))
        cls.vfiles = [os.path.join(ROOT, d) for d in decks] + [MINI_CUBE]
        cls.data = os.path.join(cls.tmp, "data")
        D.build([FIXTURES], cls.vfiles, cls.data, (70, 15, 15), quiet=True)
        sch, names, splits = T.load_data(cls.data)
        hp = dict(T.DEFAULTS, hidden="8", dim=4, epochs=6, patience=6)
        cls.net, info = T.fit(splits["train"], splits["val"], names, hp, len(sch["vocab"]["cards"]), "numpy", 0)
        cls.model = cls.net.to_json(sch, names, {"excluded": info["excluded"], "training": {"note": "test"}})
        cls.model_path = os.path.join(cls.tmp, "model.json")
        import evalnet as N
        N.save_model(cls.model_path, cls.model)
        cls.srv = S.Served(cls.model_path)
        cls.D, cls.N = D, N
        with open(os.path.join(cls.data, "games.jsonl"), encoding="utf-8") as f:
            cls.games = [json.loads(line) for line in f]

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_online_vectors_and_p_equal_the_dataset_rows(self):
        n = 0
        for split in ("train", "val", "test"):
            d = self.D.load(self.data, split)
            p_rows = self.net.predict(self.N.features_to_rows(d["X"].astype(np.float64), self.srv.schema.card_offset))
            for gm in (g for g in self.games if g["split"] == split):
                idx = np.nonzero(d["game"] == gm["index"])[0]
                game = [g for g in E.read_games(os.path.join(ROOT, gm["file"])) if g.game_key == gm["game_key"]][0]
                rows = E.encode_game(game, self.srv.schema)
                self.assertEqual(len(rows), len(idx), gm["file"])
                for r, i in zip(rows, idx):
                    req = S.request_for(game, r.seq)
                    seat, state, history = S.check_request(req)
                    vec = S.online_features(state, seat, history, self.srv.schema)
                    self.assertTrue(np.array_equal(np.asarray(vec, np.int16), d["X"][i]),
                                    f"{gm['file']} seq {r.seq}: the online vector is not dataset.py's row")
                    got = self.srv.evaluate(req)
                    self.assertAlmostEqual(got["p"], float(p_rows[i]), delta=1e-12)
                    n += 1
        self.assertEqual(n, sum(g["rows"] for g in self.games))

    def test_the_served_process_answers_the_same(self):
        g = next(E.read_games(os.path.join(FIXTURES, "g1.jsonl")))
        rows = E.encode_game(g, self.srv.schema)[::7]
        lines = [json.dumps({"id": i, **S.request_for(g, r.seq)}) for i, r in enumerate(rows)]
        lines.append(json.dumps({"id": "bad", "seat": 9, "state": {"players": []}}))
        lines.append("not json")
        out = subprocess.run([sys.executable, SERVE, "--model", self.model_path], input="\n".join(lines) + "\n",
                             capture_output=True, text=True, cwd=ROOT, timeout=120, check=True).stdout.splitlines()
        ready = json.loads(out[0])
        self.assertEqual(ready, {"ready": True, **self.srv.describe()})
        answers = [json.loads(x) for x in out[1:]]
        self.assertEqual(len(answers), len(rows) + 2)
        for i, (r, a) in enumerate(zip(rows, answers)):
            want = self.srv.evaluate(S.request_for(g, r.seq))
            self.assertEqual(a["id"], i)
            self.assertTrue(a["ok"])
            self.assertEqual(a["featureHash"], S.feature_hash(r.features))
            self.assertAlmostEqual(a["p"], want["p"], delta=1e-12)
            self.assertEqual(a["turn"], r.turn)
            self.assertTrue(a["decision"])
        self.assertEqual(answers[-2]["status"], 400)
        self.assertEqual(answers[-2]["id"], "bad")
        self.assertEqual(answers[-1]["status"], 400)

    def _variant(self, change) -> str:
        m = copy.deepcopy(self.model)
        change(m)
        p = os.path.join(self.tmp, f"variant-{random.randrange(1 << 30)}.json")
        self.N.save_model(p, m)
        return p

    def test_refusals(self):
        def schema(m):
            m["schemaId"] = "0000000000000000"

        def unsafe(m):
            m["input"]["boardColumns"].append(self.srv.schema.index["me.spells_cast_game"])
            m["input"]["boardNames"].append("me.spells_cast_game")

        def cols(m):
            m["input"]["boardNames"][0] = "opp.life"

        def r17(m):
            import r17 as R
            m["cardStates"] = list(R.R17_STATES)
            m["schemaKind"] = R.SCHEMA_KIND

        for change, words in ((schema, "encoder changed"), (unsafe, "live-unsafe"), (cols, "board columns"),
                              (r17, "D305's full schema")):
            with self.assertRaises(S.ModelError) as cm:
                S.Served(self._variant(change))
            self.assertIn(words, str(cm.exception))
        with self.assertRaises(S.ModelError):
            S.Served(self.model_path, expect_schema="82815752c2f5e346")
        S.Served(self.model_path, expect_schema=self.srv.schema.schema_id)
        with self.assertRaises(S.ModelError):
            S.Served(self.model_path, cube=os.path.join(ROOT, "cubes", "synergy-cube-180.md"))
        out = subprocess.run([sys.executable, SERVE, "--model", self._variant(schema)], input="",
                             capture_output=True, text=True, cwd=ROOT, timeout=60)
        self.assertEqual(out.returncode, 2)
        self.assertFalse(json.loads(out.stdout.splitlines()[0])["ready"])

    def test_the_committed_parity_fixture_is_served_exactly(self):
        """fixtures/eval/: the model and golden answers the Java evaluator is held to."""
        srv = S.Served(os.path.join(ROOT, "fixtures", "eval", "model.json"))
        with open(os.path.join(ROOT, "fixtures", "eval", "golden.json"), encoding="utf-8") as f:
            golden = json.load(f)
        for lg in golden["logs"][:6]:
            game = list(E.read_games(os.path.join(ROOT, lg["file"])))[lg["game"]]
            for w in lg["rows"]:
                a = srv.evaluate(S.request_for(game, w["seq"]))
                self.assertEqual(a["featureHash"], w["hash"])
                self.assertAlmostEqual(a["p"], w["p"], delta=1e-12)


if __name__ == "__main__":
    unittest.main()
