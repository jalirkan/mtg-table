# mtg-table — tools/ml tests: decision records -> the policy dataset (D347).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""policy_data.py over fixtures/cubelab/decisions/: one real synergy-cube game
recorded by the cube lab's worker with D347's recorder, both chairs, gzipped --
drafter A played with the search (`Default+search:ms=400`), drafter B with
Forge's Default.

- round trip: one row per decision record, its state encoded exactly as
  encode.py encodes that frame, the chosen option among the options, the
  search's per-option values on every search-decided row;
- redaction: every hidden zone of every state rewritten as if leaked moves no
  feature of any row; a record of the other seat planted in a log is refused;
- D340: a game whose deck is in the AI ladder's confirm set is dropped with its
  other chair, a reserved draft seed too, and --keep-reserved keeps both;
- human games: tagged `source: human` and kept out of train/val/test.

The encoder half is standard library; the shards need numpy and are skipped,
saying so, without it.
"""
from __future__ import annotations

import copy
import gzip
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
sys.path.insert(0, HERE)
import encode as E  # noqa: E402
import policy_data as P  # noqa: E402
import reserved as R  # noqa: E402
from test_encode import scramble_hidden  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

RUN = os.path.join(ROOT, "fixtures", "cubelab", "decisions")


def _logs(run: str) -> list[str]:
    return E.read_run_dir(run).logs


def _games(run: str = RUN) -> list[P.PolicyGame]:
    return [pg for path in _logs(run) for pg in P.read_policy_games(path)]


def _schema(run: str = RUN) -> E.Schema:
    return E.Schema(E.Vocab.from_files([E.read_run_dir(run).vocab]))


class PolicyRecordsTest(unittest.TestCase):
    def test_every_record_is_a_row_with_its_state(self):
        schema = _schema()
        searched = 0
        for pg in _games():
            recs = pg.decisions()
            self.assertGreater(len(recs), 10, pg.path)
            counts = __import__("collections").Counter()
            rows = P.encode_decisions(pg, schema, set(P.KINDS), False, counts)
            self.assertEqual(len(rows), len(recs))
            states = {i: f for i, f in enumerate(pg.frames) if f.get("type") == "state"}
            tally = E.TurnTally()
            want: dict[int, list[float]] = {}
            for i, f in enumerate(pg.frames):
                if f.get("type") == "state":
                    tally.apply(f["body"].get("events") or [], f["body"].get("stack"))
                    st = f["body"] if f["body"].get("phase") is not None else dict(f["body"], phase="NONE")
                    want[i] = E.encode_state(st, pg.seat, schema, tally)
            for (feats, t), rec in zip(rows, recs):
                b = rec["body"]
                self.assertEqual(b["seat"], pg.seat)
                self.assertIn(b["frame"], states, "a record names a state frame")
                self.assertEqual(states[b["frame"]]["seq"], b["stateSeq"])
                self.assertEqual(feats, want[b["frame"]], "the row is that frame, encoded for the deciding seat")
                if isinstance(t["chosen"], list):
                    self.assertTrue(all(i >= 0 for i in t["chosenIndex"]) or not t["complete"])
                else:
                    self.assertEqual(t["options"][t["chosenIndex"]], t["chosen"])
                if t["search"]:
                    searched += 1
                    s = t["search"]
                    self.assertGreaterEqual(len(s["tokens"]), 2)
                    self.assertEqual(len(s["tokens"]), len(s["win"]))
                    self.assertEqual(s["tokens"][0] in t["options"] or t["kind"] != "priority", True)
                    if s["fallback"] is None:
                        self.assertGreaterEqual(s["rounds"], 2)
                        self.assertTrue(all(w is not None and 0 <= w <= 1 for w in s["win"]))
                        self.assertEqual(s["diff"][0], 0.0, "the paired difference is to Forge's answer, option 0")
                        self.assertTrue(all(x is not None for x in s["diff"] + s["seDiff"]))
                        self.assertEqual(t["by"], "search")
            seats = {s["player"]: s for s in pg.header["seats"]}
            self.assertEqual(seats[pg.seat]["policy"], "search" if pg.header["lab"]["seatA" if pg.seat == 0 else "seatB"].find("search") >= 0 else "forge")
        self.assertGreater(searched, 0, "the search seat's records carry the search's statistics")

    def test_hidden_zones_scrambled_move_no_feature(self):
        schema = _schema()
        rng = random.Random(7)
        names = E.Vocab.from_files([E.read_run_dir(RUN).vocab]).cards[6:66]
        for pg in _games():
            counts = __import__("collections").Counter()
            base = [f for f, _ in P.encode_decisions(pg, schema, set(P.KINDS), False, counts)]
            leaked = scramble_hidden(pg, rng, names)
            got = [f for f, _ in P.encode_decisions(leaked, schema, set(P.KINDS), False, counts)]
            self.assertEqual(base, got, pg.path)

    def test_a_record_of_the_other_seat_is_never_read(self):
        schema = _schema()
        pg = _games()[0]
        planted = copy.deepcopy(pg)
        rec = copy.deepcopy(planted.decisions()[3])
        rec["body"]["seat"] = 1 - pg.seat
        planted.frames.append(rec)
        counts = __import__("collections").Counter()
        a = P.encode_decisions(pg, schema, set(P.KINDS), False, counts)
        b = P.encode_decisions(planted, schema, set(P.KINDS), False, counts)
        self.assertEqual(len(a), len(b))
        self.assertEqual(counts["other seat's record (refused)"], 1)


@unittest.skipIf(np is None, "numpy is not installed: the policy shards are not built (the record half ran)")
class PolicyDatasetTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="policy-")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _build(self, run: str, **kw):
        out = os.path.join(self.tmp, "out-" + str(len(os.listdir(self.tmp))))
        kw.setdefault("reserved", {})
        st = P.build(_logs(run) + kw.pop("extra", []), [E.read_run_dir(run).vocab], out, quiet=True, **kw)
        return out, st

    def test_round_trip_through_the_shards(self):
        out, st = self._build(RUN)
        n = sum(len(pg.decisions()) for pg in _games())
        self.assertEqual(st["rows"], n)
        self.assertEqual(st["games"], 2)
        self.assertEqual(set(st["sources"]), {"lab"})
        rows = 0
        for s in P.SPLITS:
            d = P.load(out, s)
            if not d["targets"]:
                continue
            rows += len(d["targets"])
            self.assertEqual(d["X"].shape, (len(d["targets"]), st["nFeatures"]))
            self.assertEqual(d["X"].dtype, np.int16)
            for t, g in zip(d["targets"], d["game"].tolist()):
                self.assertEqual(t["game"], g)
        self.assertEqual(rows, n)
        with open(os.path.join(out, "games.jsonl"), encoding="utf-8") as f:
            games = [json.loads(line) for line in f]
        self.assertEqual({g["policy"] for g in games}, {"search", "forge"})
        self.assertTrue(all(g["ver"] != "unversioned" for g in games), "D341: every lab game carries its version")
        out2, st2 = self._build(RUN, searched_only=True)
        self.assertGreater(st2["rows"], 0)
        self.assertLess(st2["rows"], n)
        out3, st3 = self._build(RUN, vers=["no-such-version"])
        self.assertEqual(st3["rows"], 0)
        self.assertEqual(st3["skippedGames"].get("other lab version (D341)"), 2)

    def test_confirm_deck_filter_drops_both_chairs(self):
        repo = os.path.join(self.tmp, "repo")
        os.makedirs(os.path.join(repo, "tools", "ai-bench"))
        run = os.path.join(self.tmp, "run")
        shutil.copytree(RUN, run)
        with open(os.path.join(run, "drafts.jsonl"), encoding="utf-8") as f:
            draft = json.loads(f.readline())
        deck_b = draft["drafters"][1]
        import matchup_data as MD
        main = MD.as_counts(MD.played_main(deck_b))
        dck = os.path.join(repo, "confirm-B.dck")
        with open(dck, "w", encoding="utf-8") as f:
            f.write("[metadata]\nName=confirm B\n[Main]\n" + "".join(f"{k} {n}\n" for n, k in main.items()))
        with open(os.path.join(repo, R.PAIRS_FILES["confirm"]), "w", encoding="utf-8") as f:
            f.write(f"{dck} {dck}  # a confirm pair\n")
        reserved = R.reserved_decks(repo)
        self.assertEqual(len(reserved), 1)
        out, st = self._build(run, reserved=reserved)
        self.assertEqual(st["rows"], 0, "a game with a confirm deck gives no row, from either chair")
        self.assertEqual(st["skippedGames"].get("reserved deck (D340)"), 2)
        self.assertTrue(st["reservedChecked"])
        out, st = self._build(run, reserved=None)
        self.assertEqual(st["games"], 2, "--keep-reserved keeps them")
        self.assertFalse(st["reservedChecked"])

    def test_a_reserved_draft_seed_is_dropped(self):
        run = os.path.join(self.tmp, "run")
        shutil.copytree(RUN, run)
        for path in _logs(run):
            with gzip.open(path, "rt", encoding="utf-8") as f:
                lines = f.read().splitlines()
            h = json.loads(lines[0])
            h["lab"]["draftSeed"] = P.RESERVED_SEED_MIN + 3
            lines[0] = json.dumps(h)
            with gzip.open(path, "wt", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
        out, st = self._build(run)
        self.assertEqual(st["rows"], 0)
        self.assertEqual(st["skippedGames"].get("reserved seed (D340)"), 2)

    def test_human_games_are_tagged_and_kept_out_of_training(self):
        human = os.path.join(self.tmp, "human")
        os.makedirs(human)
        shutil.copy(_logs(RUN)[0], os.path.join(human, "mine.jsonl.gz"))
        out, st = self._build(RUN, extra=[human], human_dirs=[human])
        self.assertEqual(st["sources"].get("human"), 1)
        self.assertIn("human", st["splits"])
        for s in P.SPLITS:
            for t in P.load(out, s)["targets"]:
                pass
        with open(os.path.join(out, "games.jsonl"), encoding="utf-8") as f:
            games = [json.loads(line) for line in f]
        hg = [g for g in games if g["source"] == "human"]
        self.assertEqual([g["split"] for g in hg], ["human"])
        self.assertTrue(all(g["split"] in P.SPLITS for g in games if g["source"] != "human"))
        out, st = self._build(RUN, extra=[human], human_dirs=[human], train_human=True)
        self.assertNotIn("human", st["splits"])

    def test_dataset_py_keeps_human_games_out_of_training(self):
        import dataset as D
        human = os.path.join(self.tmp, "human")
        os.makedirs(human)
        shutil.copy(_logs(RUN)[0], os.path.join(human, "mine.jsonl.gz"))
        out = os.path.join(self.tmp, "value")
        st = D.build(_logs(RUN) + [human], [E.read_run_dir(RUN).vocab], out, quiet=True, reserved={},
                     human_dirs=[human])
        self.assertEqual(st["sources"].get("human"), 1)
        self.assertGreater(st["splits"]["human"]["rows"], 0)
        self.assertTrue(any(f.startswith("human-") for f in os.listdir(out)))
        with open(os.path.join(out, "games.jsonl"), encoding="utf-8") as f:
            games = [json.loads(line) for line in f]
        self.assertEqual({g["source"] for g in games}, {"lab", "human"})
        self.assertTrue(all(g["split"] == "human" for g in games if g["source"] == "human"))


if __name__ == "__main__":
    unittest.main()
