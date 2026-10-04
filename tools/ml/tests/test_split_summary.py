# mtg-table — tools/ml tests: gate 1's split report keys "a deck seen in training" on card multisets (D374).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

Standard library only.  train_eval.split_summary's "test rows from a deck seen in
training" compared deck NAMES, and a lab deck's name is `cubelab <seed> A|B`, so
it could never fire on lab logs (methods review, 2026-10-04).  It now compares the
decks' card multisets (reserved.deck_key); a planted duplicate deck must fire it.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
import reserved as R  # noqa: E402
import train_eval as T  # noqa: E402


class _Games:
    def __init__(self, ids):
        self._ids = list(ids)

    def tolist(self):
        return list(self._ids)


class _Split:
    """What split_summary reads of a split: one entry per row, `.game` the row's game index."""

    def __init__(self, rows_per_game):
        ids = [g for g, n in rows_per_game for _ in range(n)]
        self.game = _Games(ids)
        self._n = len(ids)

    def __len__(self):
        return self._n


def deck(*names):
    return {n: 1 for n in names}


def write_games(d, games):
    with open(os.path.join(d, "games.jsonl"), "w", encoding="utf-8") as f:
        for g in games:
            f.write(json.dumps(g) + "\n")


def lab_game(seed, a, b, split_group):
    return {"match": f"cubelab {seed} A|cubelab {seed} B", "split_group": split_group,
            "deckKeys": sorted([R.deck_key(a), R.deck_key(b)])}


class SplitSummaryTest(unittest.TestCase):
    def summary(self, games, splits):
        with tempfile.TemporaryDirectory() as d:
            write_games(d, games)
            return T.split_summary(d, splits)

    def test_distinct_decks_report_zero_and_seed_groups(self):
        games = [lab_game(1, deck("a", "b"), deck("c", "d"), "g1"),
                 lab_game(2, deck("e", "f"), deck("g", "h"), "g2"),
                 lab_game(3, deck("i", "j"), deck("k", "l"), "g3")]
        s = self.summary(games, {"train": _Split([(0, 5)]), "val": _Split([(1, 4)]), "test": _Split([(2, 3)])})
        self.assertEqual(s["testRowsWithATrainingDeck"], 0)
        self.assertEqual(s["groupKind"], "seed")
        self.assertEqual(s["deckCheck"], "card multiset (reserved.deck_key)")
        self.assertIn("seed groups", T.summary_line("pair", s))

    def test_a_planted_duplicate_deck_fires(self):
        """The same 40 cards drafted under another seed: different names, same deck.  The
        name check says 0; the card-multiset check counts every test row of that game."""
        same = deck("x", "y", "z")
        games = [lab_game(1, same, deck("c", "d"), "g1"),
                 lab_game(2, deck("e", "f"), deck("g", "h"), "g2"),
                 lab_game(3, deck("z", "y", "x"), deck("k", "l"), "g3")]
        s = self.summary(games, {"train": _Split([(0, 5)]), "val": _Split([(1, 4)]), "test": _Split([(2, 3)])})
        self.assertEqual(s["testRowsWithATrainingDeck"], 3, "the planted duplicate is found by content")
        self.assertEqual(s["testRowsWithATrainingDeckName"], 0, "the old name check could not see it")
        self.assertIn("by card multiset: 3", T.summary_line("pair", s))

    def test_named_decks_are_deck_name_groups_and_unknown_decks_are_said(self):
        games = [{"match": "pacho|doom", "split_group": "g1", "deckKeys": []},
                 {"match": "pacho|legion", "split_group": "g2", "deckKeys": []},
                 {"match": "fra|doom", "split_group": "g3", "deckKeys": []}]
        s = self.summary(games, {"train": _Split([(0, 2)]), "val": _Split([(1, 2)]), "test": _Split([(2, 4)])})
        self.assertEqual(s["groupKind"], "deck-name")
        self.assertEqual(s["testRowsDeckUnknown"], 4)
        self.assertEqual(s["testRowsWithATrainingDeckName"], 4, "doom is in training by name")
        self.assertIn("not checked", T.summary_line("pair", s))


if __name__ == "__main__":
    unittest.main()
