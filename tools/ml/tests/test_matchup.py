# mtg-table — tools/ml tests: the matchup dataset's record and the matchup model.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The record half is standard library; the model half needs numpy and is skipped without it.

- THE RECORD (matchup_data.py, v1): two fake run folders, a normal one and a
  bridge one, written the way tools/cubelab/run.ts writes them: every
  decisive game becomes one valid record, draws and engine errors none, the
  verified play side wins over the planned one, Forge's deck is used when it
  played, a bridge record carries its cubes and the cube of every card, a
  normal one neither; the same folder reached twice is read once; the same
  pool and seed under other decks become two drafts; check_record catches
  broken records; the overlap arithmetic on three small cubes.
- THE MODEL (matchup.py): a planted strong card is recovered from 1,500
  synthetic games by the plain model and by M0 with features; the prior width
  chosen by cross-validation is small when cards barely differ and larger when one
  does; every game of a draft lands in one split; balance's spread is 0 for
  identical decks and grows with their differences; P(A beats B) = 1 - P(B
  beats A).
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import matchup_data as MD  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None


def deck(spells, lands=17):
    main = [[1, s] for s in spells] + [[lands, "Island"]]
    return {"colors": "U", "splash": None, "main": main, "spells": len(spells), "lands": lands, "themes": []}


def drafter(seat, spells, played="lab", forge_main=None):
    return {"seat": seat, "picks": [], "pool": spells, "deck": deck(spells), "deckErrors": [], "played": played,
            "deckFile": f"decks/x-{seat}.dck", "forgeDeckFile": f"decks/x-{seat}-forge.dck",
            "forge": {"colors": "U", "main": forge_main or []}}


def game(n, on, winner, verified=None, timeout=False):
    g = {"n": n, "onPlay": on, "winner": winner, "turns": 9, "ms": 1, "timeout": timeout, "reason": None, "error": None}
    if verified:
        g["onPlayVerified"] = verified
    return g


def write_run(d, run, lines):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "run.json"), "w") as fh:
        json.dump(run, fh)
    with open(os.path.join(d, "drafts.jsonl"), "w") as fh:
        for l in lines:
            fh.write(json.dumps(l) + "\n")
        fh.write('{"v": 1, "cut short')  # a killed run's last line


A = [f"Card A{i}" for i in range(23)]
B = [f"Card B{i}" for i in range(23)]


class RecordTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        normal = os.path.join(cls.tmp, "root", "normal", "pauper")
        write_run(normal, {"v": 1, "cubeFile": "cubes/pauper-cube-180.md", "cube": "Pauper"}, [
            {"v": 1, "seed": 1, "drafters": [drafter("A", A), drafter("B", B)],
             "match": {"games": [game(1, "A", "A", verified="B"), game(2, "B", "draw", timeout=True), game(3, "A", "B")]}},
            {"v": 1, "seed": 2, "drafters": [drafter("A", A, played="forge", forge_main=[[23, "Card F"], [17, "Swamp"]]), drafter("B", B)],
             "match": {"games": [game(1, "B", "B")]}},
        ])
        bridge = os.path.join(cls.tmp, "root", "bridge", "pauper+vintage")
        write_run(bridge, {"v": 1, "cubeFile": "bridge:pauper+vintage", "cube": "Bridge",
                           "bridge": {"sources": [{"id": "pauper"}, {"id": "vintage"}], "shares": [0.5, 0.5], "size": 180}}, [
            {"v": 1, "seed": 1, "drafters": [drafter("A", A), drafter("B", B)],
             "bridge": {"sources": ["pauper", "vintage"], "shares": [0.5, 0.5], "from": {"pauper": A + ["Unplayed"], "vintage": B}},
             "match": {"games": [game(1, "A", "B")]}},
        ])
        # the same folder under a second path: one more root, a copy of the normal run
        shutil.copytree(normal, os.path.join(cls.tmp, "copy", "pauper"))
        cls.games, cls.stats = MD.collect([os.path.join(cls.tmp, "root"), os.path.join(cls.tmp, "root"), os.path.join(cls.tmp, "copy")])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_every_decisive_game_once(self):
        ids = [r["id"] for r in self.games]
        self.assertEqual(ids, sorted(["bridge:pauper+vintage#1#g1", "pauper#1#g1", "pauper#1#g3", "pauper#2#g1"]))
        self.assertEqual(self.stats["duplicates"], 3, "the copied folder's three games are read once")
        for r in self.games:
            self.assertEqual(MD.check_record(r), [], r["id"])

    def test_fields(self):
        g = {r["id"]: r for r in self.games}
        self.assertEqual(g["pauper#1#g1"]["onPlay"], "B", "the verified play side wins over the planned one")
        self.assertEqual(g["pauper#1#g1"]["winner"], "A")
        self.assertEqual(g["pauper#1#g1"]["deckA"]["Island"], 17)
        self.assertEqual(sum(g["pauper#1#g1"]["deckA"].values()), 40)
        self.assertEqual(g["pauper#2#g1"]["deckA"], {"Card F": 23, "Swamp": 17}, "Forge's deck when Forge's played")
        self.assertEqual(g["pauper#1#g1"]["kind"], "normal")
        self.assertEqual(g["pauper#1#g1"]["cubes"], ["pauper"])
        self.assertNotIn("from", g["pauper#1#g1"])
        br = g["bridge:pauper+vintage#1#g1"]
        self.assertEqual(br["kind"], "bridge")
        self.assertEqual(br["cubes"], ["pauper", "vintage"])
        self.assertEqual(br["from"]["Card A0"], "pauper")
        self.assertEqual(br["from"]["Card B5"], "vintage")
        self.assertNotIn("Unplayed", br["from"], "the from map covers the two decks only")
        self.assertEqual(g["pauper#1#g3"]["draft"], g["pauper#1#g1"]["draft"])

    def test_check_record_catches(self):
        r = dict(next(g for g in self.games if g["kind"] == "normal"))
        self.assertEqual(MD.check_record(r), [])
        self.assertTrue(MD.check_record({**r, "winner": "draw"}))
        self.assertTrue(MD.check_record({**r, "deckA": {"X": 3}}))
        self.assertTrue(MD.check_record({**r, "kind": "bridge"}))
        self.assertTrue(MD.check_record({k: v for k, v in r.items() if k != "onPlay"}))

    def test_same_seed_other_decks_are_two_drafts(self):
        tmp = tempfile.mkdtemp()
        try:
            for k, spells in enumerate((A, B)):
                write_run(os.path.join(tmp, f"r{k}"), {"v": 1, "cubeFile": "cubes/pauper-cube-180.md"}, [
                    {"v": 1, "seed": 9, "drafters": [drafter("A", spells), drafter("B", A)], "match": {"games": [game(1, "A", "A")]}}])
            games, _ = MD.collect([tmp])
            self.assertEqual(len(games), 2)
            self.assertEqual(len({r["draft"] for r in games}), 2)
        finally:
            shutil.rmtree(tmp)

    def test_overlap(self):
        games = [{"deckA": {"x": 1, "y": 1, "Island": 17}, "deckB": {"z": 1, "y": 1}}]
        ov = MD.overlap_report(games, {"c1": ["x", "y", "w"], "c2": ["x", "z"], "c3": ["x"]})
        self.assertEqual(ov["cardSlots"], 6)
        self.assertEqual(ov["distinctCards"], 4)
        self.assertEqual(ov["cardGames"], 2, "x and z: y is in both decks, Island is a basic")
        self.assertEqual(ov["sharedCardGames"], 1, "x is listed by three cubes")
        self.assertEqual(ov["cubeSlotsInformedPerCardGame"], 2.0, "x informs 3 slots, z 1")
        self.assertEqual(ov["gamesNeededRatio"], round(4 / 6, 3))

    def test_features(self):
        f = MD.card_features("Bolt", {"name": "Bolt", "cmc": 1, "colors": "R", "manaCost": "{R}", "type": "Instant",
                                      "oracle": "Bolt deals 3 damage to any target.", "rank": {"source": "cube", "rawScore": 90}})
        self.assertEqual(len(f), len(MD.FEATURE_NAMES))
        named = dict(zip(MD.FEATURE_NAMES, f))
        self.assertEqual(named["col_R"], 1.0)
        self.assertEqual(named["instant"], 1.0)
        self.assertEqual(named["tx_damage"], 1.0)
        self.assertEqual(named["rank_missing"], 0.0)
        unseen = dict(zip(MD.FEATURE_NAMES, MD.card_features("Mystery", None, {"cmc": 3, "colors": "G", "land": False, "type": "Creature"})))
        self.assertEqual(unseen["rank_missing"], 1.0)
        self.assertEqual(unseen["col_G"], 1.0)


def synthetic(strength, n_games, seed, pool=60, spells=23):
    """Games between random decks of `pool` cards; P(A) = sigmoid(sum strength(A) - sum strength(B) + 0.2 s)."""
    rng = np.random.default_rng(seed)
    names = [f"c{i:02d}" for i in range(pool)]
    games = []
    for g in range(n_games):
        a = rng.choice(pool, spells, replace=False)
        b = rng.choice(pool, spells, replace=False)
        s = 1.0 if g % 2 == 0 else -1.0
        z = strength[a].sum() - strength[b].sum() + 0.2 * s
        win = rng.random() < 1 / (1 + np.exp(-z))
        draft = f"syn#{g // 2}"
        games.append({"v": 1, "id": f"{draft}#g{g % 2 + 1}", "draft": draft, "pool": "syn", "kind": "normal", "cubes": ["syn"],
                      "seed": g // 2, "game": g % 2 + 1,
                      "deckA": {**{names[i]: 1 for i in a}, "Island": 17}, "deckB": {**{names[i]: 1 for i in b}, "Island": 17},
                      "onPlay": "A" if s > 0 else "B", "winner": "A" if win else "B"})
    return games, names


@unittest.skipIf(np is None, "numpy is not installed")
class ModelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import matchup as M
        cls.M = M

    def fit(self, strength, n=1500, seed=3, features=None):
        games, names = synthetic(strength, n, seed)
        vocab = names + ["Island"]
        data = self.M.Data(games, vocab)
        idx = np.arange(len(games))
        m = self.M.Linear(features, data, False)
        m.select(idx, self.M.DEFAULTS["tauGrid"], self.M.DEFAULTS["tauWGrid"], [1.0])
        return m, data, vocab

    def test_planted_strong_card_is_recovered(self):
        strength = np.zeros(60)
        strength[17] = 0.6  # one card worth +0.6 logits a copy: a deck holding it wins ~ 64% at even odds
        m, data, vocab = self.fit(strength)
        p = m.power()[:60]
        self.assertEqual(int(np.argmax(p)), 17)
        others = np.delete(p, 17)
        self.assertGreater(p[17] - others.mean(), 0.25, "found, shrunk somewhat toward the prior as it should be")
        self.assertGreater(p[17], others.max() + 0.15)
        boots = self.M.bootstrap_power(m, np.arange(len(data.y)), 8, 1)[:, :60]
        sd = boots.std(0, ddof=1)
        self.assertGreater((p[17] - others.mean()) / sd[17], 3, "the planted card stands out by its bootstrap SD")
        self.assertTrue(all(int(np.argmax(b)) == 17 for b in boots))

    def test_features_carry_the_planted_card(self):
        strength = np.zeros(60)
        strength[[3, 17, 41]] = 0.4
        X = np.zeros((61, 2))
        X[[3, 17, 41], 0] = 1.0  # a feature shared by the three strong cards
        X[:, 1] = np.random.default_rng(0).normal(size=61)  # noise
        X = (X - X.mean(0)) / X.std(0)
        m, _, _ = self.fit(strength, features=X)
        self.assertGreater(m.w[0], 0.05, "the shared feature gets the credit")
        self.assertEqual(sorted(np.argsort(-m.power()[:60])[:3].tolist()), [3, 17, 41])

    def test_cv_picks_a_tight_prior_when_cards_barely_differ(self):
        m_flat, _, _ = self.fit(np.zeros(60), seed=5)
        strong = np.random.default_rng(1).normal(0, 0.25, 60)
        m_spread, _, _ = self.fit(strong, seed=5)
        self.assertLessEqual(m_flat.taus[0], 0.035)
        self.assertGreater(m_spread.taus[0], m_flat.taus[0])

    def test_antisymmetric(self):
        strength = np.zeros(60)
        strength[17] = 0.6
        m, data, _ = self.fit(strength, n=400)
        games = [dict(g) for g in data.games[:50]]
        swapped = [{**g, "deckA": g["deckB"], "deckB": g["deckA"], "onPlay": "B" if g["onPlay"] == "A" else "A",
                    "winner": "B" if g["winner"] == "A" else "A"} for g in games]
        d1, d2 = self.M.Data(games, data.vocab), self.M.Data(swapped, data.vocab)
        m.data = d1
        p1 = m.predict()
        m.data = d2
        p2 = m.predict()
        np.testing.assert_allclose(p1, 1 - p2, atol=1e-9)

    def test_dual_and_primal_newton_agree(self):
        rng = np.random.default_rng(4)
        Z = rng.normal(size=(30, 50))
        y = (rng.random(30) < 0.5).astype(float)
        prec = np.full(50, 4.0)
        th_dual, ld_dual = self.M.fit_map(Z, y, prec)  # 30 games < 50 columns: the dual
        Zp = np.concatenate([Z, np.zeros((40, 50))])   # 40 empty rows add nothing but push it to the primal
        th_pri, ld_pri = self.M.fit_map(Zp, np.concatenate([y, np.zeros(40)]), prec, np.concatenate([np.ones(30), np.zeros(40)]))
        np.testing.assert_allclose(th_dual, th_pri, atol=1e-6)
        self.assertAlmostEqual(ld_dual, ld_pri, places=5)

    def test_split_by_draft(self):
        games, _ = synthetic(np.zeros(60), 400, 2)
        by = {}
        for g in games:
            by.setdefault(g["draft"], set()).add(self.M.split_of(g["draft"]))
        self.assertTrue(all(len(v) == 1 for v in by.values()))
        splits = [self.M.split_of(f"d{i}") for i in range(2000)]
        self.assertAlmostEqual(splits.count("train") / 2000, 0.70, delta=0.04)

    def test_spread(self):
        self.assertAlmostEqual(self.M.spread(np.zeros(8), 0.2)["sd"], 0.0)
        a = self.M.spread(np.linspace(-0.2, 0.2, 8), 0.2)["sd"]
        b = self.M.spread(np.linspace(-0.6, 0.6, 8), 0.2)["sd"]
        self.assertGreater(b, a)
        self.assertGreater(a, 0)


if __name__ == "__main__":
    unittest.main()
