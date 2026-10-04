# mtg-table — tools/ml tests: play exploration's marks, read by the datasets (D358).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""fixtures/cubelab/explore/: one real synergy-cube game the cube lab played
with play exploration on (`--play-explore share=1,epsilon=0.2,closecall=0.05,
opening=on`, seed 102), both chairs, recorded by the worker.

- the recording says it explored: the header's `playExplore`, the explore
  marks on the decisions it randomised (rule and the seat's own answer), the
  summary's counts, and the drafts.jsonl tags agree;
- policy_data.py drops every randomised decision and keeps the rest;
- dataset.py keeps an exploring game by default and `--play-explore
  exclude|only` filter it;
- matchup_data.py leaves exploring drafts out by default, `include` / `only`
  keep them, and an exploring game is never a duplicate of a plain game of the
  same draft.

The record half is standard library; the datasets need numpy and are skipped
without it.
"""
from __future__ import annotations

import collections
import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402
import matchup_data as MD  # noqa: E402
import policy_data as P  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

RUN = os.path.join(ROOT, "fixtures", "cubelab", "explore")
PLAIN = os.path.join(ROOT, "fixtures", "cubelab", "decisions")


def _games(run: str = RUN) -> list[P.PolicyGame]:
    return [pg for path in E.read_run_dir(run).logs for pg in P.read_policy_games(path)]


def _summary(pg: P.PolicyGame) -> dict:
    return next(f["body"] for f in pg.frames if f.get("dir") == "ai" and f.get("type") == "decisions")


class RecordFlagsTest(unittest.TestCase):
    def test_header_marks_and_counts_agree(self):
        with open(os.path.join(RUN, "drafts.jsonl"), encoding="utf-8") as fh:
            rec = json.loads(fh.readline())
        self.assertEqual(rec["playExplore"], {"epsilon": 0.2, "closeCall": 0.05, "opening": True})
        row = rec["match"]["games"][0]["playExplore"]
        total = collections.Counter()
        rules = collections.Counter()
        games = _games()
        self.assertEqual(len(games), 2, "both chairs")
        for pg in games:
            self.assertEqual(pg.header["playExplore"], rec["playExplore"], "the header says the game explored")
            marked = [f["body"] for f in pg.decisions() if f["body"].get("explore")]
            self.assertGreater(len(marked), 0)
            for b in marked:
                ex = b["explore"]
                self.assertEqual(set(ex), {"rule", "forge"})
                self.assertIn(ex["rule"], ("random", "closeCall"))
                rules[ex["rule"]] += 1
                if b["kind"] in ("priority", "attack", "block", "mulligan"):
                    # the seat's own answer was legal too: it is among the options
                    self.assertIn(ex["forge"], b["options"], b)
            s = _summary(pg)["explore"]
            total.update({k: v for k, v in s.items() if k != "byKind"})
            # every randomised decision the seat wrote is counted (a forced one-option decision never is)
            self.assertEqual(sum(1 for b in marked if b["explore"]["rule"] == "random"), s["decisionsRandomised"])
            self.assertEqual(sum(1 for b in marked if b["explore"]["rule"] == "closeCall"), s["closeCalls"])
        for k in ("decisionsRandomised", "changed", "closeCalls", "closeCallsChanged", "coins", "failures"):
            self.assertEqual(total[k], row[k], f"drafts.jsonl's {k} is both seats' sum")
        self.assertGreater(rules["random"], 0)
        self.assertGreater(rules["closeCall"], 0, "the fixture holds a close call")
        self.assertEqual(row["failures"], 0)
        self.assertGreater(row["changed"], 0)

    def test_policy_rows_drop_randomised_decisions(self):
        schema = E.Schema(E.Vocab.from_files([E.read_run_dir(RUN).vocab]))
        for pg in _games():
            counts = collections.Counter()
            rows = P.encode_decisions(pg, schema, set(P.KINDS), False, counts)
            recs = pg.decisions()
            marked = sum(1 for f in recs if f["body"].get("explore"))
            self.assertEqual(len(rows), len(recs) - marked)
            self.assertEqual(counts["randomised decision dropped (D358)"], marked)
            kept_n = {t["n"] for _f, t in rows}
            for f in recs:
                self.assertEqual(f["body"]["n"] in kept_n, not f["body"].get("explore"))


@unittest.skipIf(np is None, "numpy is not installed")
class DatasetFilterTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="play-explore-")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _build(self, mode: str, runs: list[str]) -> dict:
        import dataset as D
        logs, vocab = E.read_run_dirs(runs)
        out = os.path.join(self.tmp, mode)
        return D.build(logs, [vocab], out, quiet=True, play_explore=mode), out

    def test_include_exclude_only(self):
        st, out = self._build("include", [RUN])
        self.assertEqual(st["games"], 2)
        self.assertEqual(st["playExplore"], {"mode": "include", "games": 2})
        with open(os.path.join(out, "games.jsonl"), encoding="utf-8") as fh:
            self.assertTrue(all(json.loads(l).get("explore") is True for l in fh))
        st, _ = self._build("exclude", [RUN])
        self.assertEqual(st["games"], 0)
        self.assertEqual(sum(st["skippedGames"].values()), 2)
        st, _ = self._build("only", [RUN])
        self.assertEqual(st["games"], 2)

    def test_policy_build_counts_the_drops(self):
        logs, vocab = E.read_run_dirs([RUN])
        st = P.build(logs, [vocab], os.path.join(self.tmp, "policy"), quiet=True, jsonl_only=True)
        dropped = st["notes"].get("randomised decision dropped (D358)", 0)
        marked = sum(1 for pg in _games() for f in pg.decisions() if f["body"].get("explore"))
        self.assertEqual(dropped, marked)
        self.assertGreater(dropped, 0)
        with open(os.path.join(self.tmp, "policy", "games.jsonl"), encoding="utf-8") as fh:
            self.assertTrue(all(json.loads(l).get("explore") is True for l in fh))


class MatchupFilterTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="play-explore-mu-")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _twin(self) -> str:
        """The fixture's draft line again, without its playExplore tag: the same draft played plainly."""
        d = os.path.join(self.tmp, "plain")
        os.makedirs(d)
        shutil.copy(os.path.join(RUN, "run.json"), d)
        with open(os.path.join(RUN, "drafts.jsonl"), encoding="utf-8") as fh:
            rec = json.loads(fh.readline())
        rec.pop("playExplore")
        for g in rec["match"]["games"]:
            g.pop("playExplore", None)
        with open(os.path.join(d, "drafts.jsonl"), "w", encoding="utf-8") as fh:
            fh.write(json.dumps(rec) + "\n")
        return d

    def test_left_out_by_default(self):
        games, st = MD.collect([RUN])
        self.assertEqual(games, [])
        self.assertEqual(st["playExplore"], 1)
        games, st = MD.collect([RUN], play_explore="include")
        self.assertEqual(len(games), 1)
        self.assertTrue(games[0]["explore"])
        self.assertTrue(games[0]["id"].endswith("#g1x"))
        self.assertEqual(MD.check_record(games[0]), [])
        games, _ = MD.collect([RUN], play_explore="only")
        self.assertEqual(len(games), 1)
        with self.assertRaises(ValueError):
            MD.collect([RUN], play_explore="sometimes")

    def test_never_a_duplicate_of_the_plain_game(self):
        twin = self._twin()
        games, st = MD.collect([RUN, twin])
        self.assertEqual(len(games), 1, "the plain game is kept, the exploring one left out")
        self.assertNotIn("explore", games[0])
        self.assertEqual(st["duplicates"], 0)
        games, st = MD.collect([RUN, twin], play_explore="include")
        self.assertEqual(len(games), 2)
        self.assertEqual(len({g["id"] for g in games}), 2)
        self.assertEqual(st["duplicates"], 0)

    def test_plain_runs_unchanged(self):
        games, st = MD.collect([PLAIN])
        self.assertEqual(st["playExplore"], 0)
        self.assertTrue(all("explore" not in g and not g["id"].endswith("x") for g in games))


if __name__ == "__main__":
    unittest.main()
