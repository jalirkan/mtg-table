# mtg-table — tools/lab tests: the cold tier of the lab's recordings (D378), archive.py cold / restore-night.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""A finished queue night goes to a fake cold drive as one tar.zst a key folder plus its
quarantine, verified member by member before anything hot is deleted, and comes back with
restore-night.  The drive is a temp folder standing in for the PC's NTFS volume: every create
on it goes through cold._os_open, which the tests replace with a Windows-names check (a name
NTFS refuses fails, as ntfs3 with windows_names does) or a read-only volume.  Fixtures are
the committed lab recordings, copied; nothing large is committed.  Skipped without the
`zstandard` package."""
from __future__ import annotations

import contextlib
import errno
import gzip
import hashlib
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

try:
    import zstandard as Z
except ImportError:
    Z = None
if Z is not None:
    import archive as A  # noqa: E402
    import cold as C  # noqa: E402

REC = os.path.join(ROOT, "fixtures", "cubelab", "recorded", "games", "7")
LOGS = [os.path.join(REC, f"g1-seat{s}.jsonl.gz") for s in (0, 1)]
OLD = time.time() - 3 * 3600
BAD_KEY = "bridge/a:b."          # NTFS refuses ':' and a trailing dot


def sha(p: str) -> str:
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def frames(p: str) -> list:
    return [(g.game_key, g.seat, len(g.frames)) for g in E.read_games(p)]


def make_night(tmp: str) -> dict:
    """Night 1: normal/synergy seeds 7-8 and BAD_KEY seed 9, all finished; one cut-short gzip,
    one D370 .zst, a quarantine folder holding one recording; the warehouse's state and a dataset."""
    root = os.path.join(tmp, "var", "queue")
    keys = {"normal/synergy": [7, 8], BAD_KEY: [9]}
    plan = {"night": 1, "chunks": [{"key": k, "seed": s[0], "drafts": len(s)} for k, s in keys.items()]}
    os.makedirs(root)
    with open(os.path.join(root, "queue.json"), "w") as f:
        json.dump({"v": 1, "nights": [1]}, f)
    with open(os.path.join(root, "night-1.json"), "w") as f:
        json.dump(plan, f)
    files = []
    for k, seeds in keys.items():
        kd = os.path.join(root, k)
        os.makedirs(kd)
        with open(os.path.join(kd, "drafts.jsonl"), "w") as f:
            for s in seeds:
                f.write(json.dumps({"seed": s, "ver": "v7"}) + "\n")
        for s in seeds:
            d = os.path.join(kd, "games", str(s))
            os.makedirs(d)
            for p in LOGS:
                files.append(shutil.copy(p, d))
    seed8 = os.path.join(root, "normal/synergy/games/8")
    with open(LOGS[0], "rb") as f:   # a killed worker's cut-short gzip
        cut = f.read()
    with open(os.path.join(seed8, "g2-seat0.jsonl.gz"), "wb") as f:
        f.write(cut[: len(cut) // 2])
    z = os.path.join(seed8, "g1-seat1.jsonl")   # a D370 archive
    with open(z + ".zst", "wb") as f, open(z + ".gz", "rb") as g:
        f.write(Z.ZstdCompressor(level=3).compress(gzip.decompress(g.read())))
    os.unlink(z + ".gz")
    q = root + "-quarantine-n1"
    os.makedirs(os.path.join(q, "normal/synergy/games/8"))
    qrec = shutil.copy(LOGS[1], os.path.join(q, "normal/synergy/games/8", "g3-seat1.jsonl.gz"))
    with open(os.path.join(q, "failed.txt"), "w") as f:
        f.write(os.path.join(root, "normal/synergy/games/8/g3-seat1.jsonl.gz") + "\n")
    for dp, _dn, fn in os.walk(tmp):
        for n in fn:
            os.utime(os.path.join(dp, n), (OLD, OLD))
    wh = os.path.join(tmp, "warehouse")
    os.makedirs(wh)
    st = {}
    for k in keys:
        dj = os.path.join(root, k, "drafts.jsonl")
        st[C.warehouse_rel(dj)] = {"ino": os.stat(dj).st_ino, "offset": os.path.getsize(dj)}
    with open(os.path.join(wh, "_state.json"), "w") as f:
        json.dump({"files": st}, f)
    ds = os.path.join(tmp, "dataset")
    os.makedirs(ds)
    with open(os.path.join(ds, "games.jsonl"), "w") as f:
        for dp, _dn, fn in os.walk(root):
            for n in sorted(fn):
                if ".jsonl." in n and "/games/" in dp:
                    f.write(json.dumps({"file": os.path.relpath(os.path.join(dp, n), tmp)}) + "\n")
    holds = os.path.join(tmp, "holds.json")
    with open(holds, "w") as f:
        json.dump({"holds": [{"nights": [1], "until": ["J999"], "why": "a test job reads night 1"}]}, f)
    hot = {}
    for dp, _dn, fn in os.walk(root):
        for n in fn:
            if "/games/" in os.path.join(dp, n):
                hot[os.path.relpath(os.path.join(dp, n), root)] = sha(os.path.join(dp, n))
    return {"root": root, "wh": wh, "ds": ds, "holds": holds, "q": q, "qrec": qrec, "qsha": sha(qrec), "hot": hot,
            "qfiles": {os.path.relpath(os.path.join(dp, n), q): sha(os.path.join(dp, n))
                       for dp, _dn, fn in os.walk(q) for n in fn}}


def ntfs_open(drive: str, real=os.open):
    """os.open as ntfs3 with windows_names sees it: a name NTFS refuses under the drive fails."""
    def op(path, flags, mode=0o777):
        p = os.path.abspath(path)
        if p.startswith(drive + os.sep):
            for part in os.path.relpath(p, drive).split(os.sep):
                if not C.ntfs_safe(part):
                    raise OSError(errno.EINVAL, "Invalid argument (windows_names)", path)
        return real(path, flags, mode)
    return op


def readonly_open(drive: str, real=os.open):
    def op(path, flags, mode=0o777):
        if os.path.abspath(path).startswith(drive + os.sep) and flags & (os.O_WRONLY | os.O_RDWR):
            raise OSError(errno.EROFS, "Read-only file system", path)
        return real(path, flags, mode)
    return op


@unittest.skipIf(Z is None, "zstandard not installed")
class Cold(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="cold-")
        self.n = make_night(self.tmp)
        self.drive = os.path.join(self.tmp, "mnt-e", "forgecoach-archive")
        os.makedirs(os.path.dirname(self.drive))
        self.out = io.StringIO()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def argv(self, *extra, dry=False, drive=None):
        a = ["cold", "--night", "1", "--root", self.n["root"], "--archive-root", drive or self.drive,
             "--warehouse", self.n["wh"], "--dataset", self.n["ds"], "--holds", self.n["holds"], "--release-hold", "J999",
             "--quiet-minutes", "30", "--allow-same-device", "--jobs", "2"]
        return a + (["--dry-run"] if dry else []) + list(extra)

    def run_cli(self, argv, opener=None):
        with contextlib.redirect_stdout(self.out), contextlib.redirect_stderr(self.out):
            with mock.patch.object(C, "_os_open", opener or ntfs_open(self.drive)):
                return A.main(argv)

    def hot_now(self):
        root = self.n["root"]
        return {os.path.relpath(os.path.join(dp, n), root) for dp, _dn, fn in os.walk(root) for n in fn
                if "/games/" in os.path.join(dp, n)}

    def drive_files(self):
        return sorted(os.path.relpath(os.path.join(dp, n), self.drive) for dp, _dn, fn in os.walk(self.drive) for n in fn)

    def test_round_trip_ntfs_names_and_restore(self):
        before = {p: frames(os.path.join(self.n["root"], p)) for p in self.n["hot"] if "g2-seat0" not in p}
        rc = self.run_cli(self.argv())
        self.assertEqual(rc, 0, self.out.getvalue())
        self.assertEqual(self.hot_now(), set())                       # every finished recording left the hot disk
        self.assertFalse(os.path.exists(self.n["q"]))                  # the quarantine too, as evidence on the drive
        self.assertTrue(os.path.isfile(os.path.join(self.n["root"], "normal/synergy/drafts.jsonl")))   # drafts stay hot
        names = self.drive_files()
        self.assertTrue(all(C.ntfs_safe(part) for f in names for part in f.split(os.sep)), names)
        bad = C.unit_name(BAD_KEY)
        self.assertRegex(bad, r"^bridge__a_b-[0-9a-f]{8}$")
        for u in ("normal__synergy", bad, "quarantine"):
            self.assertIn(f"night-1/{u}.tar.zst", names)
            self.assertIn(f"night-1/{u}.members.jsonl", names)
        self.assertIn("night-1/manifest.json", names)
        self.assertIn("manifest.jsonl", names)
        man = C.load_manifest(self.n["root"], 1)
        self.assertEqual(man["verifiedUnits"], 3)
        self.assertEqual(man["failed"], [])
        self.assertEqual(man["vers"], ["v7"])
        self.assertEqual(man["totals"]["members"], len(self.n["hot"]) + len(self.n["qfiles"]))
        self.assertEqual(man["totals"]["deletedHot"], man["totals"]["members"])
        self.assertLess(man["totals"]["archiveBytes"], man["totals"]["hotBytes"])
        syn = next(u for u in man["units"] if u["name"] == "normal__synergy")
        self.assertEqual(syn["encs"], {"gz": 3, "zst": 1, "asis": 1})   # the cut-short gzip is kept byte for byte
        q = next(u for u in man["units"] if u["name"] == "quarantine")
        self.assertEqual(q["encs"]["asis"], q["members"])               # evidence: byte for byte
        with open(os.path.join(self.drive, "manifest.jsonl")) as f:
            idx = [json.loads(line) for line in f]
        self.assertEqual(sorted(x["name"] for x in idx), sorted(["normal__synergy", bad, "quarantine"]))
        self.assertTrue(all(x["sha256"] == sha(x["file"]) for x in idx))
        # back again
        with contextlib.redirect_stdout(self.out):
            rc = A.main(["restore-night", "--night", "1", "--root", self.n["root"]])
        self.assertEqual(rc, 0, self.out.getvalue())
        self.assertEqual(self.hot_now(), set(self.n["hot"]))
        for p, want in before.items():
            self.assertEqual(frames(os.path.join(self.n["root"], p)), want)   # same frames, same game keys
        cut = os.path.join(self.n["root"], "normal/synergy/games/8/g2-seat0.jsonl.gz")
        self.assertEqual(sha(cut), self.n["hot"]["normal/synergy/games/8/g2-seat0.jsonl.gz"])
        self.assertTrue(os.path.isfile(os.path.join(self.n["root"], "normal/synergy/games/8/g1-seat1.jsonl.zst")))
        for p, h in self.n["qfiles"].items():
            self.assertEqual(sha(os.path.join(self.n["q"], p)), h)        # the quarantine, bit for bit
        self.assertTrue(C.load_manifest(self.n["root"], 1)["units"][0]["restoredAt"])
        # a second restore writes nothing and overwrites nothing
        with contextlib.redirect_stdout(self.out):
            self.assertEqual(A.main(["restore-night", "--night", "1", "--root", self.n["root"]]), 0)
        self.assertIn("0 written", self.out.getvalue().splitlines()[-1])

    def test_without_the_ntfs_names_the_unsafe_key_would_fail(self):
        with self.assertRaises(OSError):
            ntfs_open(self.drive)(os.path.join(self.drive, "bridge__a:b..tar.zst"), os.O_WRONLY | os.O_CREAT)

    def test_refusals_name_each_check(self):
        os.unlink(os.path.join(self.n["q"], "failed.txt"))
        with open(os.path.join(self.n["wh"], "_state.json")) as f:
            st = json.load(f)
        for v in st["files"].values():
            v["offset"] = 3
        with open(os.path.join(self.n["wh"], "_state.json"), "w") as f:
            json.dump(st, f)
        with open(os.path.join(self.n["ds"], "games.jsonl"), "w") as f:
            f.write(json.dumps({"file": "x/normal/synergy/games/7/g1-seat0.jsonl.gz"}) + "\n")
        argv = [a for a in self.argv() if a not in ("--release-hold", "J999")]
        with mock.patch.object(C, "job_state", return_value="running"):
            rc = self.run_cli(argv)
        self.assertEqual(rc, A.EXIT_REFUSED)
        err = self.out.getvalue()
        for s in ("redaction: no ", "warehouse: ", "encoded: 1 of ", "holds: night 1 is held hot until J999 (running)"):
            self.assertIn(s, err)
        self.assertEqual(self.hot_now(), set(self.n["hot"]))
        self.assertFalse(os.path.exists(self.drive))
        # each can be waived, and the manifest says so; a done job releases its hold
        os.makedirs(os.path.join(self.tmp, "res", "results", "J999"))
        with open(os.path.join(self.tmp, "res", "results", "J999", "STATUS"), "w") as f:
            f.write("done\nrunner: x\n")
        argv += ["--skip-check", "redaction", "--skip-check", "warehouse", "--skip-check", "encoded",
                 "--results-dir", os.path.join(self.tmp, "res"), "--keep-hot"]
        self.assertEqual(self.run_cli(argv), 0, self.out.getvalue())
        man = C.load_manifest(self.n["root"], 1)
        self.assertEqual(man["skippedChecks"], ["encoded", "redaction", "warehouse"])
        self.assertTrue(man["checks"]["holds"].startswith("ok"))
        self.assertEqual(self.hot_now(), set(self.n["hot"]))            # --keep-hot

    def test_an_open_night_is_refused(self):
        with open(os.path.join(self.n["root"], "normal/synergy/drafts.jsonl"), "w") as f:
            f.write(json.dumps({"seed": 7}) + "\n")                     # seed 8 not finished
        self.assertEqual(self.run_cli(self.argv()), A.EXIT_REFUSED)
        self.assertIn("planned drafts have no drafts.jsonl line", self.out.getvalue())
        self.assertEqual(self.hot_now(), set(self.n["hot"]))

    def test_read_only_or_missing_drive_skips_with_a_warning(self):
        rc = self.run_cli(self.argv(), opener=readonly_open(self.drive))
        self.assertEqual(rc, C.EXIT_SKIPPED)
        self.assertIn("WARNING: cold archive SKIPPED", self.out.getvalue())
        self.assertIn("not writable", self.out.getvalue())
        self.assertEqual(self.hot_now(), set(self.n["hot"]))
        self.assertEqual(self.drive_files() if os.path.isdir(self.drive) else [], [])
        # the drive not mounted: its folder is on the hot disk's own filesystem
        argv = [a for a in self.argv() if a != "--allow-same-device"]
        self.assertEqual(self.run_cli(argv), C.EXIT_SKIPPED)
        self.assertIn("same filesystem", self.out.getvalue())
        # no archive root configured at all
        with mock.patch.object(C, "config_value", return_value=None):
            self.assertEqual(self.run_cli(self.argv()), C.EXIT_SKIPPED)
        self.assertEqual(self.hot_now(), set(self.n["hot"]))

    def test_verify_before_delete(self):
        with mock.patch.object(C, "verify_unit", return_value="a member's SHA-256 differs"):
            rc = self.run_cli(self.argv())
        self.assertEqual(rc, 1)
        self.assertEqual(self.hot_now(), set(self.n["hot"]))
        self.assertFalse(any(f.endswith(".tar.zst") for f in self.drive_files()))   # the bad archive is removed
        # and a real verify catches a corrupted archive: flip a byte, re-verify fails
        self.assertEqual(self.run_cli(self.argv("--keep-hot")), 0)
        man = C.load_manifest(self.n["root"], 1)
        u = man["units"][0]
        with open(u["file"], "r+b") as f:
            f.seek(u["archiveBytes"] // 2)
            b = f.read(1)
            f.seek(-1, os.SEEK_CUR)
            f.write(bytes([b[0] ^ 0xFF]))
        recs = C._read_members(os.path.join(self.n["root"], "archive", "cold-night-1", u["name"] + ".members.jsonl"))
        self.assertIsNotNone(C.verify_unit(u["file"], recs))
        rc = self.run_cli(self.argv())                                   # resume: re-verify fails, nothing deleted
        self.assertEqual(rc, 1)
        self.assertTrue(set(self.n["hot"]) >= {p for p in self.n["hot"] if p.startswith(u["key"])})
        self.assertTrue(all(os.path.exists(os.path.join(self.n["root"], p)) for p in self.n["hot"] if p.startswith(u["key"] + "/")))

    def test_resume_after_an_interruption(self):
        bad = C.unit_name(BAD_KEY)
        os.makedirs(os.path.join(self.drive, "night-1"))
        with open(os.path.join(self.drive, "night-1", "normal__synergy.tar.zst.tmp"), "wb") as f:
            f.write(b"junk from a killed run")
        calls = []
        real = C.delete_hot

        def stop_after_first(u, recs):
            calls.append(u.name)
            if len(calls) == 2:
                raise KeyboardInterrupt("killed")
            return real(u, recs)
        with mock.patch.object(C, "delete_hot", side_effect=stop_after_first):
            with self.assertRaises(KeyboardInterrupt):
                self.run_cli(self.argv())
        man = C.load_manifest(self.n["root"], 1)
        self.assertEqual(sorted(u["name"] for u in man["units"]), sorted(["normal__synergy", bad]))
        left = self.hot_now()
        self.assertTrue(left and all(p.startswith("normal/synergy/") for p in left))   # the second unit's files are still hot
        rc = self.run_cli(self.argv())
        self.assertEqual(rc, 0, self.out.getvalue())
        self.assertIn("normal__synergy: archived before, re-verified", self.out.getvalue())
        self.assertEqual(self.hot_now(), set())
        self.assertFalse(any(f.endswith(".tmp") for f in self.drive_files()))
        self.assertEqual(C.load_manifest(self.n["root"], 1)["verifiedUnits"], 3)
        # a second run finds nothing left to do
        self.assertEqual(self.run_cli(self.argv()), 0)

    def test_a_lock_keeps_two_runs_apart(self):
        import fcntl
        os.makedirs(os.path.join(self.n["root"], "archive"), exist_ok=True)
        with open(os.path.join(self.n["root"], "archive", "cold-night-1.lock"), "w") as lk:
            fcntl.flock(lk, fcntl.LOCK_EX)
            with self.assertRaisesRegex(RuntimeError, "another cold run"):
                self.run_cli(self.argv())
        self.assertEqual(self.hot_now(), set(self.n["hot"]))

    def test_dry_run_estimates_and_writes_only_its_report(self):
        rc = self.run_cli(self.argv(dry=True))
        self.assertEqual(rc, 0, self.out.getvalue())
        self.assertEqual(self.hot_now(), set(self.n["hot"]))
        self.assertEqual(self.drive_files(), [])
        self.assertEqual(sorted(os.listdir(os.path.join(self.n["root"], "archive"))), ["cold-night-1.dryrun.json"])
        with open(os.path.join(self.n["root"], "archive", "cold-night-1.dryrun.json")) as f:
            d = json.load(f)
        self.assertEqual(d["files"], len(self.n["hot"]) + len(self.n["qfiles"]))
        self.assertGreater(d["estimate"]["ratio"], 2)
        self.assertLess(d["estimate"]["expectedArchiveBytes"], d["hotBytes"])
        self.assertEqual(d["refused"], [])

    def test_a_mirror_is_a_verified_second_copy(self):
        mirror = os.path.join(self.tmp, "mnt-f", "copy")
        os.makedirs(os.path.dirname(mirror))
        with mock.patch.object(C, "_os_open", ntfs_open(self.drive)):
            with contextlib.redirect_stdout(self.out), contextlib.redirect_stderr(self.out):
                rc = A.main(self.argv("--mirror", mirror))
        self.assertEqual(rc, 0, self.out.getvalue())
        man = C.load_manifest(self.n["root"], 1)
        for u in man["units"]:
            self.assertEqual(sha(u["mirrorFile"]), u["sha256"])
        shutil.rmtree(self.drive)                                       # the first drive is lost
        with contextlib.redirect_stdout(self.out):
            self.assertEqual(A.main(["restore-night", "--night", "1", "--root", self.n["root"], "--from-mirror"]), 0)
        self.assertEqual(self.hot_now(), set(self.n["hot"]))


@unittest.skipIf(Z is None, "zstandard not installed")
class Warehouse(unittest.TestCase):
    def test_cold_units_become_a_table(self):
        try:
            import pyarrow.parquet as pq
        except ImportError:
            self.skipTest("pyarrow not installed")
        import warehouse as W
        tmp = tempfile.mkdtemp(prefix="cold-wh-")
        try:
            n = make_night(tmp)
            drive = os.path.join(tmp, "drive")
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                rc = A.main(["cold", "--night", "1", "--root", n["root"], "--archive-root", drive, "--warehouse", n["wh"],
                             "--dataset", n["ds"], "--holds", n["holds"], "--release-hold", "J999", "--allow-same-device"])
            self.assertEqual(rc, 0)
            out = os.path.join(tmp, "wh-out")
            self.assertEqual(W.build_cold(out, n["root"]), 3)
            rows = pq.read_table(os.path.join(out, "cold_archives", "cold_archives.parquet")).to_pylist()
            syn = next(r for r in rows if r["unit"] == "normal__synergy")
            self.assertEqual((syn["night"], syn["kind"], syn["key"], syn["vers"]), (1, "recordings", "normal/synergy", ["v7"]))
            self.assertTrue(syn["file"].endswith("night-1/normal__synergy.tar.zst"))
            self.assertIsNotNone(syn["archived_at"])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
