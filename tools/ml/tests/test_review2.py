# mtg-table — tools/ml tests: methodology review 2's fixes (D340-D344).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Reserved decks, version stamps, the posterior SD, the de-biased balance, the AI-limited guard, the verification test.

- RESERVED DECKS (D340, reserved.py): a deck in a pairs file is matched by
  card multiset whatever its seed; matchup_data.collect drops a game with one
  (and counts it); dataset.py's lookup finds a lab recording's decks through
  its run folder and drops the game.
- VERSIONS (D341): a draft line's `ver` reaches the record; `vers` filters.
- POSTERIOR SD (D342): an unseen card's sdPost is its prior width, a card's
  shrinks with games; the dual (Woodbury) and primal covariances agree;
  on a small simulated world the 95% intervals cover near 95% while the
  bootstrap's cover far less; the de-biased balance lands near the true
  spread where the shrunk one reads low.
- AI-LIMITED (D343): a planted AI:RemoveDeck:All card that never wins is not
  rated a blank (its power is its prior; the shared column takes the loss),
  and `design` never cuts it.
- VERIFICATION (D344): the MoM variance is unbiased, the O'Brien-Fleming
  constant is pinned, and the rule's exit codes.
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
sys.path.insert(0, HERE)
import matchup_data as MD  # noqa: E402
import reserved as R  # noqa: E402
from test_matchup import A, B, drafter, game, write_run  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None


def write_dck(path, main):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write("[metadata]\nName=x\n[Main]\n" + "".join(f"{k} {n}\n" for n, k in main.items()) + "[Sideboard]\n1 Spare Card\n")


class ReservedTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        repo = cls.repo = os.path.join(cls.tmp, "repo")
        # the confirm set holds deck A (Card A0..22 + 17 Island) -- in another ORDER, with a set code, at seed 900000001
        main = {n: 1 for n in reversed(A)}
        main["Island|LEA"] = 17
        write_dck(os.path.join(repo, "tools/ai-bench/decks/sets/x-900000001-A.dck"), main)
        write_dck(os.path.join(repo, "tools/ai-bench/decks/sets/x-900000001-B.dck"), {"Other": 23, "Swamp": 17})
        os.makedirs(os.path.join(repo, "tools/ai-bench"), exist_ok=True)
        with open(os.path.join(repo, "tools/ai-bench/pairs-confirm.txt"), "w") as fh:
            fh.write("# header\ntools/ai-bench/decks/sets/x-900000001-A.dck tools/ai-bench/decks/sets/x-900000001-B.dck   # x seed 900000001\n")
        cls.run_dir = os.path.join(cls.tmp, "runs", "normal", "pauper")
        write_run(cls.run_dir, {"v": 1, "cubeFile": "cubes/pauper-cube-180.md"}, [
            # seed 5 re-drafted deck A (a different seed: the multiset catches it), seed 6 did not
            {"v": 1, "seed": 5, "ver": "aaaaaaaaaaaa", "drafters": [drafter("A", B), drafter("B", A)], "match": {"games": [game(1, "A", "A")]}},
            {"v": 1, "seed": 6, "ver": "bbbbbbbbbbbb", "drafters": [drafter("A", B), drafter("B", B[::-1])], "match": {"games": [game(1, "A", "B")]}},
            {"v": 1, "seed": 7, "drafters": [drafter("A", B), drafter("B", B)], "match": {"games": [game(1, "B", "B")]}},
        ])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_deck_key_is_a_multiset(self):
        self.assertEqual(R.deck_key({"a": 1, "b": 2}), R.deck_key({"b": 1, "a": 1, "b|M10": 1}))
        self.assertNotEqual(R.deck_key({"a": 1, "b": 2}), R.deck_key({"a": 2, "b": 1}))
        res = R.reserved_decks(self.repo)
        self.assertEqual(len(res), 2)
        self.assertIn(R.deck_key(MD.as_counts([[1, n] for n in A] + [[17, "Island"]])), res, "the lab's deck A is the confirm deck")

    def test_collect_drops_reserved_games_and_keeps_versions(self):
        res = R.reserved_decks(self.repo)
        games, st = MD.collect([self.run_dir], reserved=res)
        self.assertEqual(st["reserved"], 1)
        self.assertEqual(sorted(r["seed"] for r in games), [6, 7])
        self.assertEqual({r["seed"]: r["ver"] for r in games}, {6: "bbbbbbbbbbbb", 7: "unversioned"})
        self.assertEqual(MD.version_counts(games), {"bbbbbbbbbbbb": 1, "unversioned": 1})
        allg, st2 = MD.collect([self.run_dir])
        self.assertEqual((len(allg), st2["reserved"]), (3, 0), "without the filter nothing is dropped")
        only, st3 = MD.collect([self.run_dir], reserved=res, vers=["unversioned"])
        self.assertEqual([r["seed"] for r in only], [7])
        self.assertEqual(st3["otherVersion"], 1)

    def test_a_recording_is_traced_to_its_decks(self):
        rec = os.path.join(self.run_dir, "games", "5", "g1-seat1.jsonl.gz")
        os.makedirs(os.path.dirname(rec), exist_ok=True)
        open(rec, "wb").close()
        self.assertEqual(R.log_draft(rec), (os.path.realpath(self.run_dir), 5))
        decks, ver = R.game_decks(rec)
        self.assertEqual(ver, "aaaaaaaaaaaa")
        self.assertIsNotNone(R.reserved_hit(decks, R.reserved_decks(self.repo)))
        decks6, _ = R.game_decks(os.path.join(self.run_dir, "frames", "draft-6-g1.jsonl"))
        self.assertIsNone(R.reserved_hit(decks6, R.reserved_decks(self.repo)))
        # a log from elsewhere: the viewer's own .dck from hello_ok
        d, _ = R.game_decks("/nowhere/x.jsonl", {"match": {"yourDeck": {"path": "tools/ai-bench/decks/sets/x-900000001-A.dck"}}}, self.repo)
        self.assertIsNotNone(R.reserved_hit(d, R.reserved_decks(self.repo)))

    def test_a_lab_game_with_unknown_decks_fails_closed(self):
        """D365: a lab recording with no drafts.jsonl line for its seed is dropped, not checked by the viewer's deck alone."""
        res = R.reserved_decks(self.repo)
        # the viewer's deck is known and not reserved; the opponent's is not in the log
        write_dck(os.path.join(self.repo, "decks/mine.dck"), {"Mine": 23, "Plains": 17})
        own = {"match": {"yourDeck": {"name": "cubelab 9 A", "path": "decks/mine.dck"}, "aiDeck": {"name": "cubelab 9 B", "cards": 40}}}
        # seed 9: the run folder's drafts.jsonl has no line for it (the opponent could be a confirm deck)
        rec = os.path.join(self.run_dir, "games", "9", "g1-seat0.jsonl.gz")
        decks, ver = R.game_decks(rec, own, self.repo)
        self.assertEqual((len(decks), ver), (1, "unversioned"))
        self.assertEqual(R.reserved_hit(decks, res), R.UNKNOWN_DECK)
        self.assertEqual(R.reserved_hit(R.game_decks(os.path.join(self.run_dir, "frames", "draft-9-g1.jsonl"))[0], res), R.UNKNOWN_DECK)
        # a lab layout with no drafts.jsonl at all; and a copied lab log known only by the lab's deck names
        lone = os.path.join(self.tmp, "lone", "games", "3", "g1-seat1.jsonl.gz")
        self.assertEqual(R.reserved_hit(R.game_decks(lone)[0], res), R.UNKNOWN_DECK)
        self.assertEqual(R.reserved_hit(R.game_decks("/copied/x.jsonl", own, self.repo)[0], res), R.UNKNOWN_DECK)
        # concatenation keeps the mark (policy_data adds an ai-bench game's decks this way)
        self.assertEqual(R.reserved_hit(R.game_decks(lone)[0] + [{"Other": 23}], res), R.UNKNOWN_DECK)
        # a known lab game, and a game that is not a lab game (a person's, a fixture), are judged as before
        self.assertIsNone(R.reserved_hit(R.game_decks(os.path.join(self.run_dir, "games", "6", "g1-seat0.jsonl.gz"))[0], res))
        self.assertIsNone(R.reserved_hit(R.game_decks("/nowhere/human.jsonl", {"match": {"aiDeck": {"name": "Doom Legion"}}})[0], res))
        self.assertIsNone(R.reserved_hit(({"Other": 1}, {"Other": 2}), res))

    def test_doc_flags(self):
        flags = MD.doc_ai_flags(os.path.join(HERE, "..", "..", ".."))
        self.assertEqual(flags.get("Goblin Bombardment"), "All")
        self.assertEqual(flags.get("Demonic Tutor"), "Random")
        self.assertEqual(MD.ai_flags(["Viscera Seer", "Bolt", "X"], {"X": {"remRandomDeck": True}}, {"Bolt": {}}, os.path.join(HERE, "..", "..", "..")),
                         {"Viscera Seer": "All", "X": "Random"})


@unittest.skipIf(np is None, "numpy is not installed")
class PosteriorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import matchup as M
        import matchup_sim as S
        cls.M, cls.S = M, S

    def test_unseen_card_sd_is_its_prior_and_shrinks_with_games(self):
        M = self.M
        rng = np.random.default_rng(2)
        vocab = [f"c{i}" for i in range(40)]
        games = []
        for g in range(600):
            a, b = rng.choice(30, 10, replace=False), rng.choice(30, 10, replace=False)  # c30..c39 never play
            if g < 300:
                a = np.r_[a[:9], [0]]  # c0 in many games
            games.append({"draft": f"d{g}", "kind": "normal", "cubes": ["x"], "deckA": {vocab[i]: 1 for i in a},
                          "deckB": {vocab[i]: 1 for i in b}, "onPlay": "A" if g % 2 else "B", "winner": "A" if rng.random() < 0.5 else "B"})
        data = M.Data(games, vocab)
        m = M.Linear(None, data, False).fit(np.arange(600), 0.1)
        sd = m.power_sd_post(np.ones(40, dtype=bool))
        self.assertAlmostEqual(float(np.median(sd[30:])), 0.1, delta=0.01, msg="an unseen card: its prior width (centring aside)")
        self.assertLess(sd[0], float(np.median(sd[1:30])))
        self.assertLess(float(np.median(sd[1:30])), 0.1)
        # dual (Woodbury) and primal agree
        m2 = M.Linear(None, data, False).fit(np.arange(30), 0.1)  # 30 games < 41 columns: the dual
        S_dual = m2.posterior_cov()
        Z = m2.design(np.arange(30))
        p = M.sigmoid(Z @ m2.theta)
        H = (Z * (p * (1 - p))[:, None]).T @ Z + np.diag(m2.prec(*m2.taus))
        np.testing.assert_allclose(S_dual, np.linalg.inv(H), atol=1e-8)

    def test_simulated_coverage_and_balance(self):
        # matchup_sim.py's own world at 1,000 games (seconds): tau by the evidence, as `train` picks it with one game a draft
        r = self.S.run(sizes=(1000,), seed=7, boot=4, draws=40, say=lambda s: None)[0]
        self.assertAlmostEqual(r["tau"], 0.06, delta=0.011, msg=r)
        self.assertGreater(r["coverPost"], 0.9, r)
        self.assertGreater(r["coverPostLow"], 0.85, r)
        self.assertLess(r["coverBoot"], r["coverPost"] - 0.2, "the bootstrap of the MAP undercovers")
        self.assertLess(abs(r["balance"] / r["balanceTrue"] - 1), 0.15, r)
        self.assertLess(r["balanceShrunk"], 0.8 * r["balanceTrue"], "the old number reads balanced")


@unittest.skipIf(np is None, "numpy is not installed")
class AiLimitedTest(unittest.TestCase):
    def test_a_card_forge_cannot_play_is_not_rated_a_blank(self):
        import matchup as M
        rng = np.random.default_rng(5)
        vocab = [f"c{i:02d}" for i in range(50)] + ["Island"]
        games = []
        for g in range(1500):
            a, b = rng.choice(50, 23, replace=False), rng.choice(50, 23, replace=False)
            # c07 is AI-limited: Forge never casts it, so a deck holding it is a card short (-0.4 logits)
            z = -0.4 * (7 in a) + 0.4 * (7 in b)
            games.append({"draft": f"d{g}", "kind": "normal", "cubes": ["x"], "deckA": {**{vocab[i]: 1 for i in a}, "Island": 17},
                          "deckB": {**{vocab[i]: 1 for i in b}, "Island": 17}, "onPlay": "A" if g % 2 else "B",
                          "winner": "A" if rng.random() < 1 / (1 + np.exp(-z)) else "B"})
        data = M.Data(games, vocab)
        idx = np.arange(len(games))
        plain = M.Linear(None, data, False).fit(idx, 0.1)
        self.assertLess(plain.power()[7], -0.15, "unguarded: rated a confident blank")
        excl = np.zeros(51, dtype=bool)
        excl[7] = True
        g = M.Linear(None, data, False, excl).fit(idx, 0.1)
        self.assertEqual(g.power()[7], 0.0, "guarded: its power is the prior")
        self.assertLess(g.ai_coef, -0.15, "the shared column takes the dead weight")
        others = np.delete(g.power()[:50], 7)
        self.assertLess(float(np.abs(others).max()), 0.15, "and its deckmates are not blamed")
        sd = g.power_sd_post(np.r_[np.ones(50, dtype=bool), [False]])
        self.assertGreater(sd[7], 0.09, "unrated: the prior's width")

    def test_design_never_cuts_an_ai_limited_card(self):
        import matchup_design as D
        tmp = tempfile.mkdtemp()
        try:
            repo = os.path.join(HERE, "..", "..", "..")
            cubes = MD.cube_lists(repo)
            target = cubes["vintage"]
            power = {n: -0.5 if n in ("Goblin Bombardment", "Toxic Deluge") else 0.0 for n in set(sum(cubes.values(), []))}
            facts = {n: {"colors": "R"} if n == "Goblin Bombardment" else {"colors": "B"} if n == "Toxic Deluge" else {"colors": "W"} for n in power}
            model = {"power": power, "powerSdPost": {n: 0.05 for n in power}, "land": {n: False for n in power}, "facts": facts,
                     "aiLimited": {"Goblin Bombardment": "All"}}
            mdir = os.path.join(tmp, "m")
            os.makedirs(mdir)
            with open(os.path.join(mdir, "model.json"), "w") as fh:
                json.dump(model, fh)

            class Args:
                pass
            a = Args()
            a.model, a.target_cube, a.size, a.iters, a.max_swaps, a.seed, a.repo = mdir, "vintage", 180, 3000, 20, 1, repo
            a.out, a.verify_seed = os.path.join(tmp, "cand.md"), 800_000_000
            D.design_cmd(a)
            with open(a.out) as fh:
                text = fh.read()
            self.assertIn("Goblin Bombardment", text.split("## The list")[1], "an AI:RemoveDeck:All card stays in")
            self.assertIn("Toxic Deluge", text.split("## The list")[1], "Toxic Deluge is All-flagged in vintage's own notes")
            self.assertIn("matchup_verify.py test", text)
            self.assertIn("--seed 800000000", text)
            self.assertTrue(os.path.exists(os.path.join(tmp, "cand.ratings.tsv")))
            self.assertIn("Goblin Bombardment", [n for n in target])
            del model["powerSdPost"]
            with open(os.path.join(mdir, "model.json"), "w") as fh:
                json.dump(model, fh)
            with self.assertRaises(SystemExit):
                D.design_cmd(a)
        finally:
            shutil.rmtree(tmp)


@unittest.skipIf(np is None, "numpy is not installed")
class VerifyTest(unittest.TestCase):
    def test_mom_variance_is_unbiased_and_the_bounds_are_pinned(self):
        import matchup_verify as V
        rng = np.random.default_rng(1)
        vals = []
        for _ in range(60):
            arm = V.sim_arm(V.strengths(5, 10, rng), 3000, rng)
            vals.append(V.mom_var(arm["ai"], arm["aj"], arm["win"], 10))
        self.assertAlmostEqual(float(np.sqrt(np.mean(vals))) * 100, 5.0, delta=0.6)
        self.assertAlmostEqual(V.bound(4, 4, 0.05), 1.733, places=3)
        self.assertAlmostEqual(V.bound(1, 4, 0.05), 3.466, places=3)
        self.assertAlmostEqual(V.obf_constant(4, 0.05, 400_000), 1.733, delta=0.02)

    def test_decisions(self):
        import matchup_verify as V
        rng = np.random.default_rng(2)
        same = V.sim_arm(V.strengths(5, 10, rng), 8000, rng)
        better = V.sim_arm(V.strengths(1, 10, rng), 8000, rng)
        self.assertEqual(V.look(same, better, 10, 4, 4, 0.05, 100, 1)["decision"], "ACCEPT")
        self.assertIn(V.look(better, same, 10, 2, 4, 0.05, 100, 1)["decision"], ("REJECT (futility)",))
        self.assertEqual(V.look(better, same, 10, 1, 4, 0.05, 100, 1)["decision"], "CONTINUE")


if __name__ == "__main__":
    unittest.main()
