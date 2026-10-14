# mtg-table — tools/ml tests: the distilled policy (J126, B1).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""distill.py: the rows reader, the split, the model's gradients and export, the
golden files DistillSelfTest reads, training on a planted rule, register and the
pre-registered verdict.

- the reader keeps a game's rows only when an `ok` end line follows them in the
  same file, drops a torn last line, a duplicate game and a not-ok game, and
  refuses files of two layouts;
- the split is dataset.py's split_of with salt "J126" (80/10/10 by game);
- the hand gradients match finite differences, and the exported head's
  forward pass (the Java formula) is the factored training form;
- fixtures/distill/{model,golden}.json are exactly what `distill.py golden`
  writes from names.json (so the Java parity check reads numpy's numbers);
- a planted rule is learned (held-out agreement over 0.9 and over the
  always-Forge baseline), fallback rows are left out and counted, a kind with
  too few rows gets no head;
- register names the player by the model's hash and copies the file;
- the verdict reads SHIP only when the match is complete, the score's lower
  end is at least 0.47 and the speed-up at least 10.

The reader and the verdict are standard library; the rest needs numpy and is
skipped, saying so, without it.
"""
from __future__ import annotations

import filecmp
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
import distill as X  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

NAMES = os.path.join(ROOT, "fixtures", "distill", "names.json")
need_numpy = unittest.skipIf(np is None, "numpy is not installed: the model half of the distill tests is skipped")


def layout() -> dict:
    with open(NAMES, encoding="utf-8") as f:
        return json.load(f)


def header(lay: dict) -> dict:
    return {"type": "header", "v": 1, "featureVersion": lay["featureVersion"], "stateSchemaId": lay["stateSchemaId"],
            "stateSize": lay["stateSize"], "stateNames": [f"s{i}" for i in range(lay["stateSize"])], "cand": lay["cand"]}


def write_rows(path: str, lines: list[dict], torn: bool = False) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for o in lines:
            f.write(json.dumps(o) + "\n")
        if torn:
            f.write('{"type":"row","v":1,"game":"x')


def planted_game(rng: random.Random, lay: dict, game: str, n_dec: int, kinds=("p", "a")) -> list[dict]:
    """Decisions whose played candidate is the one with the highest 'power' (index 0 on a tie): a rule over the
    candidate vectors and one state feature (state[3] large: always Forge's answer)."""
    out = []
    S = lay["stateSize"]
    for _ in range(n_dec):
        kind = rng.choice(kinds)
        names = lay["cand"][kind]
        ip = names.index("power")
        n = rng.randint(2, 5)
        cands = []
        for i in range(n):
            c = [0.0] * len(names)
            c[0] = 1.0 if i == 0 else 0.0
            c[ip] = float(rng.randint(0, 6))
            c[3] = float(rng.randint(0, 3))
            cands.append(c)
        s = [[j, rng.randint(1, 4)] for j in sorted(rng.sample(range(20), 6))]
        hush = rng.random() < 0.3
        if hush:
            s = [e for e in s if e[0] != 3] + [[3, 9]]
            s.sort()
        best = 0
        if not hush:
            for i in range(1, n):
                if cands[i][ip] > cands[best][ip]:
                    best = i
        out.append({"type": "row", "v": 1, "game": game, "seat": "Drafter A", "kind": kind, "turn": 3, "n": n,
                    "chosen": best, "overrode": best > 0, "fallback": None, "ms": 700.0 + rng.random(),
                    "tokens": ["x"] * n, "s": s, "c": cands})
    return out


class TestReader(unittest.TestCase):
    def test_reader_keeps_ended_games_only(self) -> None:
        lay = layout()
        d = tempfile.mkdtemp()
        try:
            rng = random.Random(1)
            g1 = planted_game(rng, lay, "lab:a:g1", 5)
            g2 = planted_game(rng, lay, "lab:b:g1", 4)            # never ended: a killed worker
            g3 = planted_game(rng, lay, "lab:c:g1", 3)            # ended not ok
            write_rows(os.path.join(d, "rows-1.jsonl"), [header(lay), *g1, {"type": "end", "game": "lab:a:g1", "ok": True},
                                                        *g2, *g3, {"type": "end", "game": "lab:c:g1", "ok": False}], torn=True)
            g1b = planted_game(rng, lay, "lab:a:g1", 2)           # the same game again elsewhere: a duplicate
            write_rows(os.path.join(d, "rows-2.jsonl"), [header(lay), *g1b, {"type": "end", "game": "lab:a:g1", "ok": True}])
            r = X.read_rows([d])
            n = sum(len(v) for v in r["rows"].values())
            self.assertEqual(n, 5)
            self.assertEqual(r["notes"]["gamesEnded"], 1)
            self.assertEqual(r["notes"]["gamesUnended"], 1)
            self.assertEqual(r["notes"]["rowsUnended"], 4)
            self.assertEqual(r["notes"]["gamesNotOk"], 1)
            self.assertEqual(r["notes"]["gamesDuplicate"], 1)
            self.assertEqual(r["notes"]["tornLines"], 1)
            other = header(lay)
            other["stateSchemaId"] = "0000000000000000"
            write_rows(os.path.join(d, "rows-3.jsonl"), [other])
            with self.assertRaises(SystemExit):
                X.read_rows([d])
        finally:
            shutil.rmtree(d)

    def test_split_is_by_game_and_salted(self) -> None:
        import dataset as DS  # noqa: E402  -- the same rule as the evaluator's datasets
        games = [f"lab:{i}:g1" for i in range(2000)]
        sp = [X.split_of(g) for g in games]
        self.assertEqual(sp, [DS.split_of(g, (80, 10, 10), "J126") for g in games])
        share = {s: sp.count(s) / len(sp) for s in ("train", "val", "test")}
        self.assertTrue(0.77 < share["train"] < 0.83 and 0.08 < share["test"] < 0.12, share)
        self.assertNotEqual(sp, [DS.split_of(g, (80, 10, 10), "") for g in games], "the salt matters")

    def test_verdict(self) -> None:
        metrics = {"test": {"searchMsMean": 800.0, "agreement": {"rate": 0.9, "lo": 0.88, "hi": 0.92},
                            "forgeBaseline": {"rate": 0.82}}, "covered": ["a", "b", "p"], "kinds": {}}
        ms = {"complete": True, "played": 1200, "planned": 1200, "pairs": 600, "score": 0.49, "lo": 0.476, "hi": 0.504,
              "aSearch": {"msPerDecision": 4.0}, "bSearch": {"msPerDecision": 790.0}}
        mf = {"complete": True, "played": 1200, "planned": 1200, "score": 0.6}
        v = X.verdict(metrics, ms, mf)
        self.assertEqual((v["ship"], v["notWorse"], v["fast"], v["complete"]), (1, 1, 1, 1), v)
        self.assertEqual(v["speedup"], 200.0)
        self.assertEqual(X.verdict(metrics, dict(ms, lo=0.4699), mf)["ship"], 0)
        self.assertEqual(X.verdict(metrics, dict(ms, lo=0.47), mf)["ship"], 1, "0.47 itself is not worse by more than 0.03")
        self.assertEqual(X.verdict(metrics, dict(ms, complete=False), mf)["ship"], 0)
        self.assertEqual(X.verdict(metrics, dict(ms, played=1196), mf)["ship"], 0)
        self.assertEqual(X.verdict(metrics, dict(ms, aSearch={"msPerDecision": 81.0}), mf)["ship"], 0)
        self.assertEqual(X.verdict(metrics, dict(ms, aSearch={"msPerDecision": 80.0}), mf)["ship"], 1)
        self.assertEqual(X.verdict({}, {}, {})["ship"], 0)
        self.assertIn("NOT SHOWN", X.verdict(metrics, dict(ms, lo=0.4), mf)["reading"])


@need_numpy
class TestModel(unittest.TestCase):
    def problem(self, seed=3, n=7, S=6, C=4, H=5):
        rng = np.random.default_rng(seed)
        lens = rng.integers(2, 5, n)
        off = np.zeros(n + 1, dtype=np.int64)
        np.cumsum(lens, out=off[1:])
        g = np.repeat(np.arange(n), lens)
        Sz = rng.normal(size=(n, S))
        Cz = rng.normal(size=(int(off[-1]), C))
        Dz = rng.normal(size=(int(off[-1]), C))
        y = np.array([rng.integers(0, ln) for ln in lens])
        head = X.Head(S, C, H, rng)
        head.p["uc"] = rng.normal(size=C)
        head.p["ud"] = rng.normal(size=C)
        head.p["b1"] = rng.normal(size=H)
        return head, Sz, Cz, Dz, off, g, y

    def test_gradients_match_finite_differences(self) -> None:
        head, Sz, Cz, Dz, off, g, y = self.problem()
        l2 = 0.01
        _, grads = X.loss_grad(head, Sz, Cz, Dz, off, g, y, l2)
        eps = 1e-6
        worst = 0.0
        for k, w in head.p.items():
            it = np.nditer(w, flags=["multi_index"])
            for _ in it:
                i = it.multi_index
                old = w[i]
                w[i] = old + eps
                lp = X.loss_grad(head, Sz, Cz, Dz, off, g, y, l2)[0]
                w[i] = old - eps
                lm = X.loss_grad(head, Sz, Cz, Dz, off, g, y, l2)[0]
                w[i] = old
                num = (lp - lm) / (2 * eps)
                worst = max(worst, abs(num - grads[k][i]))
        self.assertLess(worst, 1e-6)

    def test_export_is_the_factored_form(self) -> None:
        rng = np.random.default_rng(5)
        S, C, H = 6, 4, 3
        head = X.Head(S, C, H, rng)
        head.p["uc"] = rng.normal(size=C)
        head.p["ud"] = rng.normal(size=C)
        st = rng.normal(size=(1, S)) * 3 + 1
        cands = rng.normal(size=(4, C)) * 2
        diffs = cands - cands[0]

        class F:
            def __init__(self, m, s):
                self.mean, self.sd = m, s

            def __call__(self, Z):
                return (Z - self.mean) / self.sd
        std = {"state": F(rng.normal(size=S), rng.uniform(0.5, 2, S)), "cand": F(rng.normal(size=C), rng.uniform(0.5, 2, C)),
               "diff": F(rng.normal(size=C), rng.uniform(0.5, 2, C))}
        want = head.scores(std["state"](st), std["cand"](cands), std["diff"](diffs), np.zeros(4, dtype=np.int64))
        got = X.forward_exported(X.export_head(head, std, ["n"] * C), st[0], cands)
        self.assertTrue(np.allclose(want, got, rtol=1e-12, atol=1e-12), (want, got))

    def test_seg_argmax_ties_go_low(self) -> None:
        s = np.array([1.0, 1.0, 0.0, 0.0, 2.0, 2.0, 5.0, 4.0])
        off = np.array([0, 3, 6, 8])
        self.assertEqual(X.seg_argmax(s, off).tolist(), [0, 1, 0])

    def test_golden_files_are_numpys(self) -> None:
        d = tempfile.mkdtemp()
        try:
            shutil.copy(NAMES, os.path.join(d, "names.json"))
            X.main(["golden", "--out", d])
            for f in ("model.json", "golden.json"):
                self.assertTrue(filecmp.cmp(os.path.join(d, f), os.path.join(ROOT, "fixtures", "distill", f), shallow=False),
                                f"fixtures/distill/{f} is not what `distill.py golden` writes: regenerate it")
        finally:
            shutil.rmtree(d)

    def test_train_learns_a_planted_rule(self) -> None:
        lay = layout()
        d = tempfile.mkdtemp()
        try:
            rng = random.Random(7)
            lines = [header(lay)]
            for i in range(500):
                gk = f"lab:{i}:g1"
                lines += planted_game(rng, lay, gk, 8)
                lines.append({"type": "end", "game": gk, "ok": True})
            # a fallback row: left out and counted; three block rows: too few for a head
            fb = planted_game(rng, lay, "lab:fb:g1", 1, kinds=("p",))[0]
            fb["fallback"] = "budget"
            bl = planted_game(rng, lay, "lab:bl:g1", 3, kinds=("b",))
            lines += [fb, {"type": "end", "game": "lab:fb:g1", "ok": True}, *bl, {"type": "end", "game": "lab:bl:g1", "ok": True}]
            write_rows(os.path.join(d, "rows-1.jsonl"), lines)
            out, met = os.path.join(d, "model.json"), os.path.join(d, "metrics.json")
            rc = X.main(["train", d, "--out", out, "--metrics", met, "--hidden", "16", "--epochs", "200", "--patience", "20",
                         "--lr", "0.01", "--min-train", "100"])
            self.assertEqual(rc, 0)
            m = json.load(open(met))
            model = json.load(open(out))
            self.assertEqual(sorted(model["kinds"]), ["a", "p"])
            self.assertFalse(m["kinds"]["b"]["covered"])
            self.assertEqual(m["kinds"]["p"]["fallbackExcluded"], 1)
            for k in ("p", "a"):
                t = m["kinds"][k]["test"]
                self.assertGreater(t["agreement"]["rate"], 0.9, (k, t))
                self.assertGreater(t["agreement"]["rate"], t["forgeBaseline"]["rate"] + 0.1, (k, t))
                self.assertLessEqual(t["agreement"]["lo"], t["agreement"]["rate"])
            self.assertIsNotNone(m["test"]["pythonInferMsPerDecision"])
            self.assertAlmostEqual(m["test"]["searchMsMean"], 700.5, delta=0.6)
            # the exported heads score as the trainer does (the Java formula)
            h = model["kinds"]["p"]
            self.assertEqual(len(h["W1"][0]), lay["stateSize"] + 2 * len(lay["cand"]["p"]))
            self.assertEqual(model["stateSchemaId"], lay["stateSchemaId"])
            self.assertEqual(model["featureVersion"], lay["featureVersion"])
        finally:
            shutil.rmtree(d)

    def test_register(self) -> None:
        d = tempfile.mkdtemp()
        try:
            base = os.path.join(d, "players.json")
            with open(base, "w") as f:
                json.dump({"version": 1, "players": [
                    {"name": "forge-default", "kind": "forge", "params": {"profile": "Default"}, "anchor": True},
                    {"name": "search-v1-anytime", "kind": "search",
                     "params": {"profile": "Default", "outlets": "on", "budgetMs": 1500, "anytime": "on"}}]}, f)
            model = os.path.join(d, "m.json")
            with open(model, "w") as f:
                f.write('{"format":"mtgtable-distill","formatVersion":1,"kinds":{"p":{}}}\n')
            import hashlib
            sha = hashlib.sha256(open(model, "rb").read()).hexdigest()[:12]
            reg = os.path.join(d, "out", "players.json")
            from io import StringIO
            from contextlib import redirect_stdout
            buf = StringIO()
            with redirect_stdout(buf):
                X.main(["register", "--model", model, "--registry", reg, "--base-registry", base,
                        "--models-dir", os.path.join(d, "models")])
            name = buf.getvalue().strip()
            self.assertEqual(name, f"search-v2-distill-{sha}")
            self.assertTrue(os.path.exists(os.path.join(d, "models", f"distill-{sha}.json")))
            r = json.load(open(reg))
            p = r["players"][-1]
            self.assertEqual((p["name"], p["kind"], p["params"]["model"], p["params"]["anytime"]),
                             (name, "search-distill", sha, "on"))
            self.assertEqual(len(r["players"]), 3)
            with open(model, "w") as f:
                f.write('{"format":"other"}\n')
            with self.assertRaises(SystemExit):
                X.main(["register", "--model", model, "--registry", reg, "--base-registry", base,
                        "--models-dir", os.path.join(d, "models")])
        finally:
            shutil.rmtree(d)


if __name__ == "__main__":
    unittest.main()
