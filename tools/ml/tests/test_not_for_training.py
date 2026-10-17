# mtg-table — tools/ml tests: a game marked notForTraining reaches no builder (D451, the #161 review).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The move atlas (D451) plays random seats, forced options and redealt hidden cards, and writes
`lab.notForTraining` into every frame log's session header.  Its decks need not be reserved ones,
so the reserved-deck rule (D340) does not keep it out: the marker does.

fixtures/cubelab/explore/ (one real lab game, both chairs) is copied with the marker planted in
each header, and every builder that reads frame logs must leave both chairs out and count them:
dataset.py (under every --play-explore mode), policy_data.py, gate_regret_build.py,
search_errors.py and encode.py's own CLI.  The unmarked fixture is the control: the same
builders keep it.  (distill.py's rows half is tests/test_distill.py.)
"""
from __future__ import annotations

import contextlib
import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402
import reserved as R  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

RUN = os.path.join(ROOT, "fixtures", "cubelab", "explore")
MARK = "D451 move atlas: random seats, forced options, redealt hidden cards"


def marked_copy(dst: str) -> str:
    """The fixture run with `lab.notForTraining` in every log's session header."""
    out = os.path.join(dst, "atlas-like")
    shutil.copytree(RUN, out)
    for path in E.read_run_dir(out).logs:
        lines = [ln.rstrip("\n") for ln in E._lines(path)]   # the fixtures' own reader (fio, D370)
        h = json.loads(lines[0])
        assert h.get("kind") == "session"
        h.setdefault("lab", {})["notForTraining"] = MARK
        lines[0] = json.dumps(h)
        with gzip.open(path, "wt", encoding="utf-8") as fh:
            fh.write("\n".join(lines))
    return out


class PredicateTest(unittest.TestCase):
    def test_where_the_marker_may_sit(self):
        self.assertEqual(R.not_for_training({"lab": {"notForTraining": "x"}}), "x")
        self.assertEqual(R.not_for_training({"bench": {"notForTraining": "y"}}), "y")
        self.assertEqual(R.not_for_training({"type": "begin", "notForTraining": "z"}), "z")
        self.assertIsNone(R.not_for_training({"lab": {"run": "r"}, "playExplore": {"epsilon": 1}}))
        self.assertIsNone(R.not_for_training(None))
        self.assertIsNone(R.not_for_training({"lab": {"notForTraining": ""}}))


class BuildersTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="not-for-training-")
        self.marked = marked_copy(self.tmp)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def logs(self, run: str) -> list[str]:
        return E.read_run_dir(run).logs

    @unittest.skipIf(np is None, "numpy is not installed")
    def test_dataset_every_mode(self):
        import dataset as D
        for mode in ("include", "exclude", "only"):
            logs, vocab = E.read_run_dirs([self.marked])
            st = D.build(logs, [vocab], os.path.join(self.tmp, f"ds-{mode}"), quiet=True, play_explore=mode)
            self.assertEqual(st["games"], 0, mode)
            self.assertEqual(st["skippedGames"], {R.NOT_FOR_TRAINING: 2}, mode)
        logs, vocab = E.read_run_dirs([RUN])
        st = D.build(logs, [vocab], os.path.join(self.tmp, "ds-control"), quiet=True, play_explore="include")
        self.assertEqual(st["games"], 2, "the unmarked game is kept")

    @unittest.skipIf(np is None, "numpy is not installed")
    def test_policy_data(self):
        import policy_data as P
        logs, vocab = E.read_run_dirs([self.marked])
        st = P.build(logs, [vocab], os.path.join(self.tmp, "policy"), quiet=True, jsonl_only=True)
        self.assertEqual(st["skippedGames"], {R.NOT_FOR_TRAINING: 2}, st["skippedGames"])
        logs, vocab = E.read_run_dirs([RUN])
        st = P.build(logs, [vocab], os.path.join(self.tmp, "policy-control"), quiet=True, jsonl_only=True)
        self.assertNotIn(R.NOT_FOR_TRAINING, st["skippedGames"])

    def test_gate_regret_build(self):
        import gate_regret_build as G
        _rows, counts = G.scan(self.logs(self.marked), set(), None, os.path.join(self.tmp, "g2"), repo=ROOT)
        self.assertEqual(counts[R.NOT_FOR_TRAINING], 2, counts)
        _rows, counts = G.scan(self.logs(RUN), set(), None, os.path.join(self.tmp, "g2c"), repo=ROOT)
        self.assertEqual(counts[R.NOT_FOR_TRAINING], 0, counts)

    def test_search_errors(self):
        import search_errors as S
        counts: Counter = Counter()
        rows, games, _fx = S.read_records(self.logs(self.marked), "any", None, {}, counts)
        self.assertEqual((len(rows), len(games)), (0, 0))
        self.assertEqual(counts[f"logs: {R.NOT_FOR_TRAINING}"], 2, counts)

    def test_encode_cli(self):
        vocab = E.read_run_dir(self.marked).vocab
        out = os.path.join(self.tmp, "enc.jsonl")
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(E.main([*self.logs(self.marked), "--vocab", vocab, "--out", out]), 0)
        with open(out, encoding="utf-8") as fh:
            self.assertEqual(fh.read(), "")
        self.assertIn(f"2 game(s) {R.NOT_FOR_TRAINING} left out", err.getvalue())


if __name__ == "__main__":
    unittest.main()
