# mtg-table — tools/ml tests: the zstd archive tier (D370): fio.py's reader and tools/lab/archive.py.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The readers take `.jsonl.zst` as they take `.jsonl.gz`, prefer it when both
exist, and keep a game's key; the archiver recompresses only a closed night,
verifies before it deletes, and resumes.  Fixtures are the committed lab
recordings (fixtures/cubelab/*/games/), recompressed in the test.  Skipped
without the `zstandard` package."""
from __future__ import annotations

import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import time
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
sys.path.insert(0, os.path.join(ROOT, "tools", "lab"))
import encode as E  # noqa: E402
import fio  # noqa: E402

try:
    import zstandard as Z
except ImportError:
    Z = None

if Z is not None:
    import archive as A  # noqa: E402

REC = os.path.join(ROOT, "fixtures", "cubelab", "recorded", "games", "7")
LOGS = [os.path.join(REC, f"g1-seat{s}.jsonl.gz") for s in (0, 1)]
HAS_NODE = shutil.which("node") is not None
OLD = time.time() - 3 * 3600


def _zst_of(gz: str, level: int = 3) -> bytes:
    with open(gz, "rb") as f:
        return Z.ZstdCompressor(level=level, write_checksum=True, write_content_size=True).compress(gzip.decompress(f.read()))


def _frames(path: str) -> list:
    return [(g.game_key, g.seat, len(g.frames), json.dumps(g.frames[-1], sort_keys=True)) for g in E.read_games(path)]


@unittest.skipIf(Z is None, "zstandard not installed")
class Reader(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="fio-")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_zst_reads_as_the_gz_and_keeps_the_game_key(self):
        gz = shutil.copy(LOGS[0], self.tmp)
        zst = os.path.join(self.tmp, "other", "g1-seat0.jsonl.zst")
        os.makedirs(os.path.dirname(zst))
        with open(zst, "wb") as f:
            f.write(_zst_of(gz))
        self.assertEqual(_frames(gz), _frames(zst))   # same frames AND the same game_key
        with fio.open_log(gz) as a, fio.open_log(zst) as b:
            self.assertEqual(a.read(), b.read())
        self.assertEqual(fio.key_name(zst), "g1-seat0.jsonl.gz")
        self.assertEqual(fio.recorded("q/games/7/g1-seat0.jsonl.zst"), "q/games/7/g1-seat0.jsonl.gz")
        self.assertEqual(fio.recorded("q/frames.jsonl"), "q/frames.jsonl")
        self.assertEqual(fio.read_bytes(zst), fio.read_bytes(gz))

    def test_listing_prefers_zst_and_counts_a_game_once(self):
        for p in LOGS:
            shutil.copy(p, self.tmp)
        with open(os.path.join(self.tmp, "g1-seat0.jsonl.zst"), "wb") as f:
            f.write(_zst_of(LOGS[0]))
        got = [os.path.basename(p) for p in E.find_logs([self.tmp])]
        self.assertEqual(got, ["g1-seat0.jsonl.zst", "g1-seat1.jsonl.gz"])
        self.assertEqual(fio.prefer_zst(["a.jsonl.gz", "a.jsonl.zst", "a.jsonl.gz", "b.jsonl"]), ["a.jsonl.zst", "b.jsonl"])

    def test_a_stored_gz_path_opens_its_archive(self):
        zst = os.path.join(self.tmp, "g1-seat0.jsonl.zst")
        with open(zst, "wb") as f:
            f.write(_zst_of(LOGS[0]))
        gone = os.path.join(self.tmp, "g1-seat0.jsonl.gz")
        self.assertEqual(fio.resolve(gone), zst)
        self.assertEqual(_frames(gone)[0][2], _frames(LOGS[0])[0][2])

    def test_a_cut_short_zst_reads_up_to_the_cut(self):
        data = _zst_of(LOGS[0])
        zst = os.path.join(self.tmp, "cut.jsonl.zst")
        with open(zst, "wb") as f:
            f.write(data[: len(data) // 2])
        games = list(E.read_games(zst))
        self.assertEqual(len(games), 1)
        self.assertGreater(len(games[0].frames), 10)
        self.assertLess(len(games[0].frames), len(next(E.read_games(LOGS[0])).frames))
        with self.assertRaises(EOFError):   # but never as a verified archive
            fio.zstd_decompress(data[:-3])

    def test_without_zstandard_a_zst_open_says_what_is_missing(self):
        zst = os.path.join(self.tmp, "a.jsonl.zst")
        with open(zst, "wb") as f:
            f.write(_zst_of(LOGS[0]))
        with mock.patch.object(fio, "_zstd", None):
            with self.assertRaisesRegex(fio.ZstdUnavailable, "zstandard"):
                fio.open_log(zst)
            with fio.open_log(LOGS[0]) as f:   # gzip still reads
                self.assertTrue(f.readline().startswith("{"))


# ---------------------------------------------------------------- the archiver

def make_root(tmp: str, finished=(7,), planned=(7, 8)) -> str:
    """A queue root with night 1 = normal/synergy seeds 7..8; seed 7's recordings are the fixture's."""
    root = os.path.join(tmp, "queue")
    key = os.path.join(root, "normal", "synergy")
    os.makedirs(key)
    with open(os.path.join(root, "queue.json"), "w") as f:
        json.dump({"v": 1, "games": 1, "format": "grid", "nextSeed": {}, "nights": [1]}, f)
    with open(os.path.join(root, "night-1.json"), "w") as f:
        json.dump({"night": 1, "chunks": [{"key": "normal/synergy", "kind": "normal", "cubes": ["synergy"],
                                           "seed": min(planned), "drafts": len(planned)}]}, f)
    with open(os.path.join(key, "drafts.jsonl"), "w") as f:
        for s in finished:
            f.write(json.dumps({"seed": s, "drafters": []}) + "\n")
    for s in planned:
        d = os.path.join(key, "games", str(s))
        os.makedirs(d)
        for p in LOGS:
            q = shutil.copy(p, d)
            os.utime(q, (OLD, OLD))
    return root


def quiet(*_a, **_k):
    return None


@unittest.skipIf(Z is None, "zstandard not installed")
class Archive(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="archive-")
        self.root = make_root(self.tmp)
        self.key = os.path.join(self.root, "normal", "synergy")
        self.say = []

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_night(self, **kw):
        sc = A.night_scope(self.root, 1, kw.pop("allow_incomplete", True))
        A.check_closed(sc, [], 30)
        kw.setdefault("check_sample", 2 if HAS_NODE else 0)
        return A.run(sc, say=self.say.append, **kw)

    def files(self, seed):
        return sorted(os.listdir(os.path.join(self.key, "games", str(seed))))

    def test_round_trip_archives_only_finished_drafts(self):
        before = {p: _frames(os.path.join(self.key, "games", "7", os.path.basename(p))) for p in LOGS}
        m = self.run_night()
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.zst", "g1-seat1.jsonl.zst"])
        self.assertEqual(self.files(8), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])   # unfinished: untouched
        self.assertEqual((m["files"], m["verified"], m["failed"], m["truncated"]), (2, 2, 0, 0))
        self.assertLess(m["bytesAfter"], m["bytesBefore"])
        self.assertGreater(m["ratio"], 2.5)   # the fixtures measure about 3.6x
        self.assertEqual(m["finishedDrafts"], 1)
        for p in LOGS:
            z = os.path.join(self.key, "games", "7", os.path.basename(p)[:-3] + ".zst")
            self.assertEqual(_frames(z), before[p])
            self.assertAlmostEqual(os.stat(z).st_mtime, OLD, delta=1)
        with open(os.path.join(self.root, "archive", "night-1.json")) as f:
            self.assertEqual(json.load(f)["verified"], 2)
        # the dataset's listing of the run reads the archive
        logs = E.find_logs([os.path.join(self.key, "games")])
        self.assertEqual(sum(1 for p in logs if p.endswith(".zst")), 2)
        if HAS_NODE:
            self.assertEqual((m["redaction"]["checked"], m["redaction"]["passed"], m["redaction"]["mismatch"]), (2, 2, 0))

    def test_refuses_an_open_night(self):
        with self.assertRaisesRegex(A.Refused, "1 of 2 planned drafts"):
            A.night_scope(self.root, 1, False)
        with self.assertRaisesRegex(A.Refused, "no plan"):
            A.night_scope(self.root, 2, True)
        sc = A.night_scope(self.root, 1, True)
        fresh = os.path.join(self.key, "games", "8", "g1-seat0.jsonl.gz")
        os.utime(fresh, None)   # a recorder still writing the night's unfinished draft
        with self.assertRaisesRegex(A.Refused, "changed in the last 30 minutes"):
            A.check_closed(sc, [], 30)
        os.utime(fresh, (OLD, OLD))
        A.check_closed(sc, [], 30)
        # a live `queue run --night 1`, seen through a fake /proc
        proc = os.path.join(self.tmp, "proc")
        for pid, argv in (("101", ["node", "tools/cubelab/cli.ts", "queue", "run", "--night", "1", "--jobs", "7"]),
                          ("102", ["node", "tools/cubelab/cli.ts", "queue", "run", "--night", "3"]),
                          ("103", ["bash", "-c", "sleep 9"])):
            os.makedirs(os.path.join(proc, pid))
            with open(os.path.join(proc, pid, "cmdline"), "wb") as f:
                f.write(b"\0".join(a.encode() for a in argv) + b"\0")
        w = A.live_writers(A.queue_night_match(1), proc)
        self.assertEqual(len(w), 1)
        self.assertEqual(A.live_writers(A.queue_night_match(2), proc), [])
        with self.assertRaisesRegex(A.Refused, "still being written"):
            A.check_closed(sc, w, 30)
        # and the CLI exits 3 with nothing touched
        rc = A.main(["night", "--root", self.root, "--night", "1", "--jobs", "1", "--check-sample", "0", "--no-default-keep"])
        self.assertEqual(rc, A.EXIT_REFUSED)
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])

    def test_verify_before_delete(self):
        real = fio.zstd_decompress
        with mock.patch.object(fio, "zstd_decompress", lambda b: real(b) + b"x"):   # the read-back does not match
            m = self.run_night(check_sample=0)
        self.assertEqual((m["verified"], m["failed"]), (0, 2))
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])   # gz kept, bad .zst removed
        self.assertEqual(m["bytesAfter"], m["bytesBefore"])
        with mock.patch.object(A.os, "unlink", side_effect=AssertionError("deleted before verifying")) as u:
            with mock.patch.object(fio, "zstd_decompress", side_effect=EOFError("short")):
                m = self.run_night(check_sample=0)
            self.assertEqual(m["failed"], 2)
        self.assertEqual(sorted(n for n in self.files(7) if n.endswith(".gz")), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])
        self.assertTrue(u.called)  # only the bad .zst's removal was attempted

    def test_resume_after_interruption(self):
        d = os.path.join(self.key, "games", "7")
        # seat0: stopped between the rename and the delete (both on disk, no log line);
        # seat1: a torn .zst and a stale .tmp from a kill mid-write
        with open(os.path.join(d, "g1-seat0.jsonl.zst"), "wb") as f:
            f.write(_zst_of(LOGS[0], 19))
        with open(os.path.join(d, "g1-seat1.jsonl.zst"), "wb") as f:
            f.write(_zst_of(LOGS[1])[:100])
        with open(os.path.join(d, "g1-seat1.jsonl.zst.tmp"), "wb") as f:
            f.write(b"junk")
        # the readers already count each game once
        self.assertEqual(len(E.find_logs([d])), 2)
        os.makedirs(os.path.join(self.root, "archive"))
        with open(os.path.join(self.root, "archive", "night-1.files.jsonl"), "w") as f:
            f.write('{"path": "torn')   # a torn log line
        m = self.run_night(check_sample=0)
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.zst", "g1-seat1.jsonl.zst"])
        self.assertEqual((m["verified"], m["files"], m["failed"], m["thisRun"]["reused"]), (2, 2, 0, 1))
        for p, s in zip(LOGS, (0, 1)):
            self.assertEqual(_frames(os.path.join(d, f"g1-seat{s}.jsonl.zst")), _frames(p))
        # a second run finds nothing to do and the manifest still holds the bytes before
        m2 = self.run_night(check_sample=0)
        self.assertEqual((m2["verified"], m2["thisRun"]["verified"], m2["bytesBefore"]), (2, 0, m["bytesBefore"]))

    def test_dry_run_reports_and_touches_nothing(self):
        m = self.run_night(dry_run=True, dry_sample=8)
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])
        self.assertEqual(sorted(os.listdir(os.path.join(self.root, "archive"))), ["night-1.dryrun.json"])
        self.assertEqual((m["files"], m["sampled"]), (2, 2))
        self.assertLess(m["expectedZstBytes"], m["gzBytes"])

    def test_keep_list_and_truncated_stay_gzip_and_restore(self):
        keep = os.path.join(self.tmp, "heldout.txt")
        with open(keep, "w") as f:
            f.write(os.path.join(self.key, "games", "7", "g1-seat1.jsonl.gz") + "\n")
        m = self.run_night(check_sample=0, keep=A.read_keep([keep]))
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.zst", "g1-seat1.jsonl.gz"])
        self.assertEqual((m["files"], m["verified"], m["keptGz"]), (1, 1, 1))
        z = os.path.join(self.key, "games", "7", "g1-seat0.jsonl.zst")
        want = _frames(z)
        self.assertEqual(A.restore([z[:-4] + ".gz"], say=self.say.append), 0)   # by its stored .gz path
        self.assertEqual(self.files(7), ["g1-seat0.jsonl.gz", "g1-seat1.jsonl.gz"])
        self.assertEqual(_frames(z[:-4] + ".gz"), want)
        # a cut-short gzip (a killed worker) is left alone and counted
        g = os.path.join(self.key, "games", "7", "g1-seat0.jsonl.gz")
        with open(g, "rb") as f:
            data = f.read()
        with open(g, "wb") as f:
            f.write(data[: len(data) // 2])
        os.utime(g, (OLD, OLD))
        m = self.run_night(check_sample=0, keep=A.read_keep([keep]))
        self.assertEqual((m["truncated"], m["failed"], m["files"]), (1, 0, 0))
        self.assertTrue(os.path.exists(g))


if __name__ == "__main__":
    unittest.main()
