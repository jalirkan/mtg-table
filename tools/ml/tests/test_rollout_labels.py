# mtg-table — tools/ml/tests: the rollout labels' driver (D378).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""rollout_labels.py: the plan is a function of the dataset and the seed, stratified, at most --per-game
rows a game, each moment naming its state frame and its cube's pool and never an opponent list; pack
writes what train_eval.py --soft-labels reads, and refuses a dataset rebuilt under it.  The engine half
(the same seed twice gives the same results, playout by playout) is `tools/coach-grade.sh
rollout-selftest`; its arithmetic is GradeSelfTest's rolloutLabels."""
from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
ML = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(ML))
sys.path.insert(0, ML)

import rollout_labels as RL  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore
try:
    import zstandard as Z
except ImportError:  # pragma: no cover
    Z = None  # type: ignore

RECORDED = os.path.join("fixtures", "cubelab", "recorded")


class AllocateTest(unittest.TestCase):
    def test_floors_first_then_in_proportion_never_past_a_stratum(self):
        t = RL.allocate({"a": 1000, "b": 100, "c": 3}, 200, floor=10)
        self.assertEqual(sum(t.values()), 200)
        self.assertEqual(t["c"], 3)
        self.assertGreater(t["a"], t["b"])
        self.assertGreaterEqual(t["b"], 10)

    def test_more_than_there_is(self):
        self.assertEqual(RL.allocate({"a": 5, "b": 7}, 100, floor=2), {"a": 5, "b": 7})

    def test_floors_over_n(self):
        t = RL.allocate({s: 100 for s in "abcde"}, 3, floor=50)
        self.assertEqual(sum(t.values()), 3)

    def test_turn_buckets_and_groups(self):
        self.assertEqual([RL.turn_bucket(t, (2, 4, 6, 9)) for t in (1, 2, 3, 9, 10, 30)], ["1-2", "1-2", "3-4", "7-9", "10+", "10+"])
        self.assertEqual(RL.group_of("var/cubelab/queue/normal/vintage/games/12/g1-seat0.jsonl.gz"), "normal/vintage")
        self.assertEqual(RL.group_of("var/cubelab/queue/bridge/vintage+pauper/games/3/g2-seat1.jsonl.gz"), "bridge/vintage+pauper")
        self.assertEqual(RL.group_of("var/cubelab/runs/rl-test/games/4242/g1-seat0.jsonl.gz"), "runs/rl-test")


@unittest.skipIf(np is None, "numpy is not installed")
class ChooseTest(unittest.TestCase):
    def rows(self):
        rng = np.random.default_rng(0)
        g = np.repeat(np.arange(40), 30)
        rte = np.tile(np.arange(30)[::-1], 40)
        turn = np.tile(np.arange(30) // 3 + 1, 40)
        perm = rng.permutation(len(g))   # the shards' order must not matter
        return {"game": g[perm], "rows_to_end": rte[perm], "turn": turn[perm]}

    def games(self):
        return [{"file": f"var/cubelab/queue/normal/{'vintage' if i % 2 else 'pauper'}/games/{i}/g1-seat0.jsonl.gz"} for i in range(40)]

    def test_seeded_sorted_and_capped_per_game(self):
        a = RL.choose(self.rows(), self.games(), 60, 7, 2, 2, RL.DEFAULT_TURN_BUCKETS)
        b = RL.choose(self.rows(), self.games(), 60, 7, 2, 2, RL.DEFAULT_TURN_BUCKETS)
        c = RL.choose(self.rows(), self.games(), 60, 8, 2, 2, RL.DEFAULT_TURN_BUCKETS)
        self.assertEqual(a, b, "the same seed: the same rows")
        self.assertNotEqual(a, c, "another seed: other rows")
        self.assertEqual(a, sorted(a))
        per = {}
        for gi, *_ in a:
            per[gi] = per.get(gi, 0) + 1
        self.assertLessEqual(max(per.values()), 2)
        strata = {s for *_, s in a}
        self.assertEqual({s.split("|")[0] for s in strata}, {"normal/vintage", "normal/pauper"})
        self.assertEqual(len({s.split("|")[1] for s in strata}), 5, "every turn bucket is sampled")


@unittest.skipIf(np is None, "numpy is not installed")
class PlanPackTest(unittest.TestCase):
    """On the committed lab recording: a dataset, a plan, a fake rollout output, a pack train_eval reads."""

    @classmethod
    def setUpClass(cls):
        import dataset as D
        cls.cwd = os.getcwd()
        os.chdir(REPO)   # dataset.py and the plan keep repo-relative paths, as on the PC
        cls.tmp = tempfile.mkdtemp(dir=os.path.join(REPO, "var") if os.path.isdir(os.path.join(REPO, "var")) else None)
        cls.data = os.path.join(cls.tmp, "data")
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            # --keep-reserved: the fixture carries no drafts.jsonl, so D340's filter fails closed on it
            D.main(["--run-dir", RECORDED, "--out", cls.data, "--split", "1,0,0", "--group-by", "game", "--keep-reserved"])
        cls.games = RL.read_games(cls.data)

    @classmethod
    def tearDownClass(cls):
        os.chdir(cls.cwd)
        shutil.rmtree(cls.tmp)

    def plan(self, seed: int, n: int = 6, name: str = "m", jobs: int = 1) -> list[dict]:
        out = os.path.join(self.tmp, f"{name}-{seed}", "moments.jsonl")
        with redirect_stdout(io.StringIO()):
            RL.main(["plan", "--data", self.data, "--n", str(n), "--seed", str(seed), "--floor", "1", "--out", out, "--jobs", str(jobs)])
        with open(out, encoding="utf-8") as f:
            return [json.loads(line) for line in f]

    def test_plan_is_reproducible_and_names_a_decision_state(self):
        a, b = self.plan(3), self.plan(3, name="again")
        self.assertEqual([{k: v for k, v in m.items() if k != "oppPool"} for m in a],
                         [{k: v for k, v in m.items() if k != "oppPool"} for m in b], "the same seed: the same moments")
        with open(os.path.join(self.tmp, "m-3", "moments.jsonl"), "rb") as fa:
            pool_a = json.loads(fa.readline())["oppPool"]
        self.assertTrue(os.path.basename(pool_a) == os.path.basename(a[0]["oppPool"]))
        self.assertNotEqual([m["id"] for m in self.plan(4)], [m["id"] for m in a], "another seed: other rows")
        self.assertEqual([m["id"] for m in self.plan(3, name="jobs", jobs=2)], [m["id"] for m in a], "--jobs 2: the same plan")
        import encode as E
        for m in a:
            self.assertNotIn("oppDeck", m, "a moment never names an opponent list")
            g = self.games[m["game"]]
            self.assertEqual((m["gameKey"], m["log"]), (g["game_key"], g["file"]))
            # the seq is the dataset row's own state: the viewer holds priority, a decision phase, its rows_to_end
            game = next(x for x in E.read_games(m["log"]) if x.game_key == m["gameKey"])
            frame = next(f for f in game.frames if f.get("type") == "state" and f.get("seq") == m["seq"])
            self.assertEqual(frame["body"]["priority"], game.seat)
            self.assertFalse(frame["body"].get("stack"), "a planned row has an empty stack")
            self.assertNotIn(frame["body"]["phase"], RL.UNPLAYABLE_PHASES, "and is not in a combat damage step")
            rows = E.encode_game(game, *RL.schema_of(self.data))
            self.assertEqual({r.rows_to_end: r.seq for r in rows}[m["rowsToEnd"]], m["seq"])
            with open(m["oppPool"], encoding="utf-8") as f:
                self.assertEqual(sum(1 for _ in f), 180, "the pool is the cube's list")

    def test_pack_writes_what_train_eval_reads(self):
        a = self.plan(5)
        res = os.path.join(self.tmp, "labels.jsonl")
        with open(res, "w", encoding="utf-8") as f:
            for i, m in enumerate(a):
                st = "ok" if i else "unsupported"
                f.write(json.dumps({"v": 1, "id": m["id"], "game": m["game"], "rowsToEnd": m["rowsToEnd"], "gameKey": m["gameKey"],
                                    "status": st, "k": 16 if i != 1 else 3, "p": (i % 5) / 4.0, "ms": 1000 * i, "msPerPlayout": 60,
                                    "turn": m["turn"], "outcome": m["outcome"]}) + "\n")
            f.write('{"torn": ')   # a killed shard's last line
        out = os.path.join(self.tmp, "soft.npz")
        with redirect_stdout(io.StringIO()) as s:
            RL.main(["pack", "--data", self.data, "--results", res, "--out", out, "--min-k", "8"])
        rep = json.loads(s.getvalue())
        self.assertEqual(rep["labels"], len(a) - 2)
        self.assertEqual(rep["dropped"], {"status unsupported": 1, "k under --min-k": 1})
        import train_eval as T
        soft = T.read_soft_labels(out, len(self.games))
        self.assertEqual(len(soft["p"]), len(a) - 2)
        with np.load(out) as z:
            self.assertEqual([z[k].dtype.kind for k in ("game", "rows_to_end", "p", "k")], ["i", "i", "f", "i"])
            keys = list(zip(z["game"].tolist(), z["rows_to_end"].tolist()))
            self.assertEqual(keys, sorted(keys))
        with open(out + ".json", encoding="utf-8") as f:
            man = json.load(f)
        self.assertEqual((man["decision"], man["labels"], man["minK"]), ("D379", len(a) - 2, 8))
        self.assertIn("gitSha", man)
        self.assertIn("forgeJarSha256", man)
                # the same input packs to the same bytes' content
        out2 = os.path.join(self.tmp, "soft2.npz")
        with redirect_stdout(io.StringIO()):
            RL.main(["pack", "--data", self.data, "--results", res, "--out", out2, "--min-k", "8"])
        with np.load(out) as x, np.load(out2) as y:
            for k in x.files:
                self.assertTrue(np.array_equal(x[k], y[k]))
        # a dataset rebuilt under the labels: game index -> another game_key, refused
        bad = os.path.join(self.tmp, "bad.jsonl")
        with open(bad, "w", encoding="utf-8") as f:
            f.write(json.dumps({"id": "x", "game": a[1]["game"], "rowsToEnd": 0, "gameKey": "not-this-game", "status": "ok", "k": 16, "p": 0.5}) + "\n")
        with self.assertRaises(SystemExit):
            with redirect_stdout(io.StringIO()):
                RL.main(["pack", "--data", self.data, "--results", bad, "--out", os.path.join(self.tmp, "bad.npz")])
        with redirect_stdout(io.StringIO()) as s:
            RL.main(["summary", "--results", res])
        sm = json.loads(s.getvalue())
        self.assertEqual(sm["ok"], len(a) - 1)
        self.assertIn("unsupported", sm["statuses"])


@unittest.skipIf(np is None or Z is None, "numpy or zstandard is not installed")
class ArchivedTest(unittest.TestCase):
    """A game the archive recompressed to .zst (D370): the plan reads it, and hands the Java half
    (gzip only) a verified gzip copy under the work folder, with the game's own key."""

    def test_zst_game_gets_a_gzip_copy(self):
        import gzip
        import dataset as D
        cwd = os.getcwd()
        os.chdir(REPO)
        tmp = tempfile.mkdtemp(dir=os.path.join(REPO, "var") if os.path.isdir(os.path.join(REPO, "var")) else None)
        try:
            run = os.path.join(tmp, "run")
            shutil.copytree(RECORDED, run)
            data = os.path.relpath(os.path.join(tmp, "data"))
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                D.main(["--run-dir", os.path.relpath(run), "--out", data, "--split", "1,0,0", "--group-by", "game", "--keep-reserved"])
            gz = os.path.join(run, "games", "7", "g1-seat0.jsonl.gz")
            with gzip.open(gz, "rb") as f:
                raw = f.read()
            with open(gz[: -len(".gz")] + ".zst", "wb") as f:
                f.write(Z.ZstdCompressor(level=3).compress(raw))
            os.remove(gz)
            out = os.path.join(tmp, "work", "moments.jsonl")
            with redirect_stdout(io.StringIO()):
                RL.main(["plan", "--data", data, "--n", "8", "--seed", "1", "--floor", "1", "--per-game", "8", "--out", out])
            with open(out, encoding="utf-8") as f:
                ms = [json.loads(line) for line in f]
            games = RL.read_games(data)
            archived = [m for m in ms if games[m["game"]]["file"].endswith("g1-seat0.jsonl.gz")]
            self.assertTrue(archived, "the archived game's rows are still planned")
            for m in archived:
                self.assertEqual(m["log"], os.path.relpath(os.path.join(tmp, "work", "logs", m["gameKey"] + ".jsonl.gz")))
                with gzip.open(m["log"], "rb") as f:
                    self.assertEqual(f.read(), raw, "the copy holds the recording's bytes")
            self.assertTrue(any(m["log"] == games[m["game"]]["file"] for m in ms), "a gzip game is read where it is")
        finally:
            os.chdir(cwd)
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
