# mtg-table — tools/ml tests: a cube-lab run folder as the dataset's input (D315).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The cube lab's in-worker recordings (`tools/cubelab.sh run --record-all`):
fixtures/cubelab/recorded/ is one real game of the synergy cube recorded by the
lab's worker, both chairs, gzipped, with its run.json and its cube.md.

Standard library for the encoder half; the dataset half needs numpy and is
skipped without it.
"""
from __future__ import annotations

import gzip
import hashlib
import io
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
from test_encode import scramble_hidden  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

RUN = os.path.join(ROOT, "fixtures", "cubelab", "recorded")


def _copy_run(dst: str) -> str:
    shutil.copytree(RUN, dst)
    return dst


class RunDirTest(unittest.TestCase):
    def test_reads_the_run_its_cube_and_both_chairs(self):
        rd = E.read_run_dir(RUN)
        self.assertEqual(rd.vocab, os.path.join(RUN, "cube.md"))
        self.assertEqual([os.path.relpath(p, RUN) for p in rd.logs],
                         ["games/7/g1-seat0.jsonl.gz", "games/7/g1-seat1.jsonl.gz"])
        games = [g for p in rd.logs for g in E.read_games(p)]
        self.assertEqual([g.seat for g in games], [0, 1])
        # the lab block: both seeds, the match and the cube
        for g in games:
            lab = g.header["lab"]
            self.assertEqual((lab["draftSeed"], lab["game"], lab["match"]), (7, 1, "7"))
            self.assertEqual(g.header["seed"], lab["gameSeed"])
            self.assertEqual(lab["cubeSha"], rd.cube_sha)
        # the two chairs of one game are one split group and one match
        self.assertNotEqual(games[0].game_key, games[1].game_key)
        self.assertEqual(games[0].split_group, games[1].split_group)
        self.assertEqual(games[0].match_key(), "cubelab 7 A|cubelab 7 B")
        self.assertEqual(games[0].match_key(), games[1].match_key())

    def test_both_chairs_are_labelled_and_opposite(self):
        rd = E.read_run_dir(RUN)
        schema = E.Schema(E.Vocab.from_files([rd.vocab]))
        labels = []
        for p in rd.logs:
            for g in E.read_games(p):
                rows = E.encode_game(g, schema)
                self.assertGreater(len(rows), 20, p)
                labels.append(rows[0].label)
        self.assertEqual(sorted(labels), [-1, 1])

    def test_hidden_zones_scrambled_change_nothing(self):
        """test_encode's scrambler over the lab's recordings, with the cube as the
        vocabulary -- so a leaked opponent card would land in a slot of its own."""
        rd = E.read_run_dir(RUN)
        vocab = E.Vocab.from_files([rd.vocab])
        schema = E.Schema(vocab)
        names = [n for n in vocab.cards if n not in E.SPECIALS]
        rng = random.Random(313)
        for p in rd.logs:
            for g in E.read_games(p):
                want = [r.features for r in E.encode_game(g, schema)]
                got = [r.features for r in E.encode_game(scramble_hidden(g, rng, names), schema)]
                self.assertEqual(got, want, p)

    def test_falls_back_to_run_json_cube_and_checks_its_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = _copy_run(os.path.join(tmp, "r"))
            os.remove(os.path.join(run, "cube.md"))
            # run.json's cubeFile, relative to the repo root
            rd = E.read_run_dir(run, repo=ROOT)
            self.assertEqual(os.path.abspath(rd.vocab), os.path.join(ROOT, "cubes", "synergy-cube-180.md"))
            # a cube that is not the one drafted is refused
            other = os.path.join(tmp, "other.md")
            with open(rd.vocab, encoding="utf-8") as f:
                text = f.read()
            with open(other, "w", encoding="utf-8") as f:
                f.write(text + "\n")
            meta = json.load(open(os.path.join(run, "run.json"), encoding="utf-8"))
            meta["cubeFile"] = other
            with open(os.path.join(run, "run.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f)
            with self.assertRaises(SystemExit) as cm:
                E.read_run_dir(run, repo=ROOT)
            self.assertIn("is not the cube this run drafted", str(cm.exception))

    def test_not_a_run_folder(self):
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(SystemExit):
            E.read_run_dir(tmp)

    def test_runs_of_different_cubes_do_not_mix(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = _copy_run(os.path.join(tmp, "a"))
            b = _copy_run(os.path.join(tmp, "b"))
            cube = os.path.join(b, "cube.md")
            with open(cube, "a", encoding="utf-8") as f:
                f.write("\n")
            meta = json.load(open(os.path.join(b, "run.json"), encoding="utf-8"))
            meta["cubeSha"] = hashlib.sha256(open(cube, "rb").read()).hexdigest()
            with open(os.path.join(b, "run.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f)
            self.assertEqual(len(E.read_run_dirs([a, a])[0]), 2)
            with self.assertRaises(SystemExit) as cm:
                E.read_run_dirs([a, b])
            self.assertIn("different cubes", str(cm.exception))

    def test_a_gzip_cut_short_reads_up_to_the_cut(self):
        """A worker killed mid-game leaves a gzip with no end: its lines up to
        the cut are read, and with no `over` the game gives no rows."""
        src = os.path.join(RUN, "games", "7", "g1-seat0.jsonl.gz")
        with gzip.open(src, "rb") as f:
            whole = f.read()
        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode="wb") as z:
            z.write(whole)
        cut = buf.getvalue()[: len(buf.getvalue()) // 2]
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "cut.jsonl.gz")
            with open(p, "wb") as f:
                f.write(cut)
            games = list(E.read_games(p))
            self.assertEqual(len(games), 1)
            self.assertGreater(len(games[0].frames), 10)
            self.assertFalse(E.game_outcome(games[0])[2])
            self.assertEqual(E.encode_game(games[0], E.Schema(E.Vocab.from_files([os.path.join(RUN, "cube.md")]))), [])

    def test_encode_cli_run_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "rows.jsonl")
            p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "encode.py"),
                                "--run-dir", RUN, "--out", out], capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("from 2 game(s)", p.stderr)
            with open(out, encoding="utf-8") as f:
                self.assertGreater(sum(1 for _ in f), 40)


@unittest.skipIf(np is None, "numpy is not installed")
class RunDirDatasetTest(unittest.TestCase):
    def test_dataset_cli_run_dir_defaults_out_into_the_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = _copy_run(os.path.join(tmp, "r"))
            p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "dataset.py"),
                                "--run-dir", run], capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(p.returncode, 0, p.stderr)
            out = os.path.join(run, "dataset")
            st = json.load(open(os.path.join(out, "stats.json"), encoding="utf-8"))
            self.assertEqual(st["games"], 2)
            self.assertEqual(st["vocab"], ["cube.md"])  # the run's own copy of its cube
            groups = {json.loads(line)["split_group"] for line in open(os.path.join(out, "games.jsonl"))}
            self.assertEqual(len(groups), 1)  # both chairs, one game
            # a second build over the same run reads only the recordings, not its own output
            p2 = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "dataset.py"),
                                 "--run-dir", run], capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(p2.returncode, 0, p2.stderr)
            self.assertEqual(json.load(open(os.path.join(out, "stats.json"), encoding="utf-8")), st)

    def test_dataset_cli_run_dir_with_no_recordings_says_so(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = _copy_run(os.path.join(tmp, "r"))
            shutil.rmtree(os.path.join(run, "games"))
            p = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ml", "dataset.py"),
                                "--run-dir", run], capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(p.returncode, 2)
            self.assertIn("--record-all", p.stderr)


if __name__ == "__main__":
    unittest.main()
