# mtg-table — tools/ml tests: the lab's card strengths against 17Lands human stats (cards17l.py, D396).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest tools/ml/tests/test_cards17l.py   (from the repo root)

On the made-up fixtures in tests/data/cards17l/ (a 17Lands-format game-data
file of six games, a power.tsv, a cube and a cards.csv; no real 17Lands row):
`stats` counts GP / GIH / OH / GNS games and wins exactly, reads a file cut short
up to its last whole row and says so; `compare` joins by name (a double-faced
card by its front face), leaves AI-limited cards and too-thin cards out, reads
AGREES / WEAK / NONE as the rule says, lists the disagreements and the colour
groups; `metrics` flattens a report for the runner.  Standard library only.
"""
from __future__ import annotations

import gzip
import io
import json
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
import cards17l as C  # noqa: E402
import encode as E  # noqa: E402

FIX = os.path.join(HERE, "data", "cards17l")
GAMES = os.path.join(FIX, "games.csv.gz")


def human(gih_wr: dict[str, float], gih: int = 1000) -> dict:
    """A stats document with these GIH win rates (every other field consistent with them)."""
    cards = {}
    for n, w in gih_wr.items():
        k = round(w * gih)
        cards[n] = {"gp": gih * 2, "gpW": k * 2, "gpWr": k / gih, "gih": gih, "gihW": k, "gihWr": k / gih,
                    "oh": gih // 2, "ohW": k // 2, "ohWr": (k // 2) / (gih // 2), "gns": gih, "gnsW": gih // 2, "gnsWr": 0.5,
                    "iwd": k / gih - 0.5, "half": [[gih // 2, k // 2], [gih - gih // 2, k - k // 2]]}
    return {"games": gih * 10, "partial": False, "sources": ["made-up"], "cards": cards}


def cube() -> list[str]:
    with open(os.path.join(FIX, "cube.md"), encoding="utf-8") as f:
        return E.parse_cube_markdown(f.read())


class StatsTest(unittest.TestCase):
    def test_counts(self):
        s = C.stats(GAMES)
        self.assertEqual((s["games"], s["wins"], s["badRows"], s["partial"]), (6, 3, 0, False))
        a = s["cards"]["Alpha Knight"]
        # won with it in the opening hand; lost with it never seen; won with it tutored (neither GIH nor GNS); lost having drawn it
        self.assertEqual((a["gp"], a["gpW"], a["gih"], a["gihW"], a["oh"], a["ohW"], a["gns"], a["gnsW"]), (4, 2, 2, 1, 1, 1, 1, 0))
        self.assertAlmostEqual(a["iwd"], 0.5 - 0.0)
        d = s["cards"]["Delta Bolt"]
        self.assertEqual((d["gp"], d["gih"], d["gihW"], d["oh"], d["ohW"], d["gns"]), (4, 3, 2, 2, 1, 1))
        self.assertEqual(sum(h[0] for h in s["halves"]), 6)
        for c in s["cards"].values():
            self.assertEqual(c["half"][0][0] + c["half"][1][0], c["gih"])

    def test_cut_short(self):
        with open(GAMES, "rb") as f:
            text = gzip.decompress(f.read())
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "cut.csv.gz")
            whole = gzip.compress(text[: len(text) - 40])     # the last row cut in the middle
            with open(p, "wb") as f:
                f.write(whole[: len(whole) - 8])               # and the gzip trailer missing: a killed download
            s = C.stats(p)
            self.assertTrue(s["partial"])
            self.assertEqual(s["games"], 5, "every whole row before the cut, not the cut one")

    def test_not_game_data(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.csv.gz")
            with gzip.open(p, "wt") as f:
                f.write("a,b\n1,2\n")
            with self.assertRaises(SystemExit):
                C.stats(p)


class CompareTest(unittest.TestCase):
    def setUp(self):
        p = mock.patch.dict(C.CARDS_RULE, {"bootstrap": 300, "minGih": 100, "top": 3})
        p.start()
        self.addCleanup(p.stop)
        self.power = C.read_power(os.path.join(FIX, "power.tsv"))
        self.info = C.read_card_info(os.path.join(FIX, "cards.csv"))

    def test_names(self):
        self.assertEqual(C.norm("Nu Lost // Back Face"), C.norm("nu lost"))
        self.assertEqual(C.norm("Lórien Revealed"), C.norm("Lorien Revealed"))
        self.assertEqual(C.norm("Urza’s Saga"), C.norm("Urza's Saga"))
        self.assertEqual(self.info[C.norm("Alpha Knight")]["colors"], "W", "a token row never overrides the card")

    def test_overlap_and_agreement(self):
        # humans order the nonland cards exactly as the lab does
        lab = {n: p["power"] for n, p in self.power.items()}
        h = human({("Nu Lost // Back Face" if n == "Nu Lost" else n): 0.5 + v for n, v in lab.items() if n != "Pi Limited"})
        r = C.compare(h, self.power, cube(), self.info)
        o = r["overlap"]
        self.assertEqual((o["cube"], o["withPower"], o["aiLimited"], o["in17Lands"]), (11, 10, 1, 9))
        self.assertEqual((o["compared"], o["comparedNonland"]), (9, 8), "Pi Limited (AI-limited) and Xi Missing are out")
        self.assertAlmostEqual(r["corr"]["nonland"]["gihWr"]["rho"], 1.0)
        self.assertEqual(r["reading"], "AGREES")
        self.assertEqual(r["humanReliability"]["n"], 8)
        self.assertTrue(all(abs(x["labMinusHuman"]) < 1e-9 for x in r["overrated"] + r["underrated"]))
        self.assertEqual(r["groups"]["R"]["n"], 2)
        self.assertEqual(r["groups"]["C"]["n"], 1)
        self.assertEqual(r["groups"]["cheapCreature"]["n"], 4, "Alpha Knight, Beta Priest, Epsilon Goblin, Iota Bear")
        self.assertTrue(r["groups"]["R"]["preRegistered"])

    def test_reversed_is_none_and_red_overrated(self):
        lab = {n: p["power"] for n, p in self.power.items() if n not in ("Pi Limited",)}
        h = human({("Nu Lost // Back Face" if n == "Nu Lost" else n): 0.5 - v for n, v in lab.items()})
        r = C.compare(h, self.power, cube(), self.info)
        self.assertAlmostEqual(r["corr"]["nonland"]["gihWr"]["rho"], -1.0)
        self.assertEqual(r["reading"], "NONE")
        self.assertGreater(r["overrated"][0]["labMinusHuman"], 0)
        self.assertEqual(r["overrated"][0]["name"], "Alpha Knight", "the lab's best is the humans' worst")
        # red: the lab rates both red cards lowest, the humans highest
        self.assertLess(r["groups"]["R"]["mean"], 0)

    def test_weak_reading_and_thin_cards(self):
        rng = random.Random(4)
        lab = {n: p["power"] for n, p in self.power.items() if n != "Pi Limited"}
        h = human({("Nu Lost // Back Face" if n == "Nu Lost" else n): 0.5 + v + rng.gauss(0, 0.04) for n, v in lab.items()})
        r = C.compare(h, self.power, cube(), self.info)
        self.assertIn(r["reading"], ("AGREES", "WEAK", "NONE"))
        thin = human({"Alpha Knight": 0.6}, gih=10)
        self.assertEqual(C.compare(thin, self.power, cube(), self.info)["overlap"]["compared"], 0)

    def test_cli_and_metrics(self):
        with tempfile.TemporaryDirectory() as d:
            st = os.path.join(d, "stats.json")
            rep = os.path.join(d, "rep.json")
            buf = io.StringIO()
            with redirect_stdout(buf):
                self.assertEqual(C.main(["stats", GAMES, "--out", st]), 0)
                self.assertEqual(C.main(["compare", "--stats", st, "--stats", st, "--power", os.path.join(FIX, "power.tsv"),
                                         "--cube", os.path.join(FIX, "cube.md"), "--cards", os.path.join(FIX, "cards.csv"),
                                         "--min-gih", "1", "--report", rep]), 0)
                self.assertEqual(C.main(["metrics", rep]), 0)
            out = buf.getvalue()
            self.assertIn("17Lands public datasets", out)
            with open(rep) as f:
                r = json.load(f)
            self.assertEqual(r["humanGames"], 12, "two stats files pooled")
            self.assertEqual(r["overlap"]["compared"], 4, "Alpha Knight, Delta Bolt, Nu Lost, Mu Fountain")
            m = json.loads(out.strip().splitlines()[-1])
            self.assertEqual(m["written"], 1)
            self.assertEqual(m["ruleChanged"], 1, "--min-gih is not the rule's, and the report says so")
            self.assertEqual(m["compared"], 4)
            self.assertEqual(C.flat_metrics(os.path.join(d, "missing.json")), {"written": 0})


if __name__ == "__main__":
    unittest.main()
