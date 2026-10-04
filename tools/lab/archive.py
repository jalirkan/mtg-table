#!/usr/bin/env python3
# mtg-table — tools/lab: the zstd archive tier for finished lab nights (D370).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Recompress a FINISHED queue night's recordings from gzip to zstd, verified.

    python3 tools/lab/archive.py night --root var/cubelab/queue --night 1 --dry-run   # expected savings, writes nothing
    python3 tools/lab/archive.py night --root var/cubelab/queue --night 1 --jobs 4    # archive it (resumable)
    python3 tools/lab/archive.py dir var/cubelab/runs/X --jobs 4                      # a run folder's games/
    python3 tools/lab/archive.py restore PATH...                                      # .zst -> .gz, for a Java reader

WHAT.  Every `games/<seed>/g<n>-seat<k>.jsonl.gz` of a night's finished drafts
(D315) becomes `.jsonl.zst` at level 19 (`--level`, 1-22), in `--jobs`
worker processes (one file each: a log is ~3-5 MB raw, below the size where
zstd's own threads split a frame).  gzip stays for everything a browser or
ForgeCoach opens: human games, samples, live recordings, every night still
being written.  No dictionary: on the PC's 120-recording sample (J065) one did
not measurably help, and on the committed fixtures a dictionary trained on four
logs made the other two 1.5% smaller (519 bytes, under its own 110 KB) -- not worth a second file every reader
must find.

SAFE.  For each file: the gzip is decompressed whole (a cut-short gzip -- a
killed worker -- is left as it is and counted `truncated`), the raw bytes'
SHA-256 taken, the zstd written to `X.jsonl.zst.tmp`, fsynced, renamed, the
directory fsynced, then READ BACK from disk, decompressed strictly (a short
frame or a bad checksum fails) and its SHA-256 compared; only a match appends
the file's line to the scope's log, fsynced, and only then is the `.gz`
deleted.  A stop at any point leaves either the `.gz` alone, or both (the
readers take the `.zst`; the next run verifies it and deletes the `.gz`), or
the `.zst` alone, already logged.  Re-running is resuming.

CLOSED NIGHTS ONLY.  `night` refuses (exit 3, nothing touched) when the night
has no plan (`<root>/night-N.json`) or is not in the ledger; when a process
is running `cubelab ... queue run --night N`; when any file under the night's
`games/<seed>/` folders changed in the last `--quiet-minutes` (30); and when
a planned draft has no line in its key's drafts.jsonl, unless
`--allow-incomplete` (a night cut short and not to be resumed).  Even then only
a seed with a drafts.jsonl line is touched: its match is over, so its logs are
complete.  `dir` applies the same rules to one folder (a process naming the
folder, recent files, seeds without a drafts line when it has a drafts.jsonl).

JAVA.  The pinned Forge jar has no zstd decoder, so the Java readers
(`mtgtable.grade.WireLog`: coach-grade.sh, leaf-rows.sh, the D354 gates) take
`.jsonl` / `.jsonl.gz` only and refuse a `.zst` with the restore command.  A
log a Java step will read stays gzip: `--keep-gz LIST` (repeatable; a line is a
path, or a JSON object whose `log`, `file` or `path` names one), and by default
the gate lists under var/ml/gates/ that exist (`--no-default-keep` turns that
off).  `restore` turns a `.zst` back into a verified `.gz` for one.

WRITES.  `<base>/archive/<scope>.json` (the manifest: counts and bytes before
and after, the redaction check), `<scope>.files.jsonl` (one line per archived
file: path, raw/gz/zst bytes, SHA-256), `<scope>.lock`; `--dry-run` writes
only `<scope>.dryrun.json`.  base = the root (scope `night-N`) or the folder
(scope `dir`).

HIDDEN INFORMATION.  Before archiving, `--check-sample` (12) of the night's
logs are run through tools/check-redaction.mjs as gzip; after, the same logs
as zstd; the verdicts and statistics must be identical (path and byte count
aside), which proves Node's reader end to end on real archives.  The Python
readers (tools/ml/fio.py) are proved by the verify step itself.

Needs the `zstandard` package (and node for the redaction check).
"""
from __future__ import annotations

import argparse
import fcntl
import gzip
import hashlib
import json
import multiprocessing
import os
import re
import subprocess
import sys
import time
import zlib
from typing import Any, Iterable, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(REPO, "tools", "ml"))
import fio  # noqa: E402

DEFAULT_KEEP = ("var/ml/gates/fit/heldout.txt", "var/ml/gates/regret/candidates.jsonl", "var/ml/gates/regret/set.jsonl")
EXIT_REFUSED = 3


class Refused(Exception):
    """The scope is not closed: nothing was touched."""


# ---------------------------------------------------------------- what a scope holds

def _seed_lines(drafts: str) -> set[int]:
    """The seeds with a line in a drafts.jsonl (a draft's line is written when its match ends)."""
    out: set[int] = set()
    if not os.path.isfile(drafts):
        return out
    rx = re.compile(rb'"seed"\s*:\s*(\d+)')
    with open(drafts, "rb") as f:
        for line in f:
            if not line.endswith(b"\n"):
                break  # a torn last line: that draft is not done
            try:
                out.add(int(json.loads(line)["seed"]))
            except (ValueError, KeyError, TypeError):
                m = rx.search(line)
                if m:
                    out.add(int(m.group(1)))
    return out


def _logs_in(d: str) -> list[str]:
    try:
        names = os.listdir(d)
    except FileNotFoundError:
        return []
    return sorted(os.path.join(d, n) for n in names if n.endswith((".jsonl.gz", ".jsonl.zst")))


class Scope:
    def __init__(self, base: str, name: str, seed_dirs: list[str], open_seed_dirs: list[str],
                 notes: dict[str, Any]):
        self.base, self.name = base, name
        self.seed_dirs = seed_dirs            # finished: archived
        self.open_seed_dirs = open_seed_dirs  # planned but unfinished: never touched
        self.notes = notes

    @property
    def state_dir(self) -> str:
        return os.path.join(self.base, "archive")

    def path(self, suffix: str) -> str:
        return os.path.join(self.state_dir, self.name + suffix)

    def stems(self) -> list[str]:
        """Every recording of the scope's finished seeds, once each, as `X.jsonl`."""
        out = set()
        for d in self.seed_dirs:
            for p in _logs_in(d):
                out.add(fio.stem(p))
        return sorted(out)


def night_scope(root: str, night: int, allow_incomplete: bool) -> Scope:
    plan_f = os.path.join(root, f"night-{night}.json")
    if not os.path.isfile(plan_f):
        raise Refused(f"{plan_f}: no plan -- night {night} was never planned under {root}")
    with open(plan_f, encoding="utf-8") as f:
        plan = json.load(f)
    led_f = os.path.join(root, "queue.json")
    if os.path.isfile(led_f):
        with open(led_f, encoding="utf-8") as f:
            nights = json.load(f).get("nights") or []
        if night not in nights:
            raise Refused(f"{led_f}: night {night} is not in the ledger's nights {nights}")
    done_dirs, open_dirs = [], []
    planned = finished = 0
    cache: dict[str, set[int]] = {}
    for c in plan.get("chunks") or []:
        key_dir = os.path.join(root, c["key"])
        if key_dir not in cache:
            cache[key_dir] = _seed_lines(os.path.join(key_dir, "drafts.jsonl"))
        for s in range(int(c["seed"]), int(c["seed"]) + int(c["drafts"])):
            planned += 1
            d = os.path.join(key_dir, "games", str(s))
            if s in cache[key_dir]:
                finished += 1
                done_dirs.append(d)
            else:
                open_dirs.append(d)
    notes = {"night": night, "plannedDrafts": planned, "finishedDrafts": finished}
    if finished < planned and not allow_incomplete:
        raise Refused(f"night {night}: {planned - finished} of {planned} planned drafts have no drafts.jsonl line -- "
                      "it is still running or was cut short; re-run it, or pass --allow-incomplete for a night that "
                      "will not be resumed (only finished drafts are archived)")
    return Scope(root, f"night-{night}", done_dirs, open_dirs, notes)


def dir_scope(folder: str) -> Scope:
    if not os.path.isdir(folder):
        raise Refused(f"{folder}: not a folder")
    games = os.path.join(folder, "games")
    seed_dirs = sorted(os.path.join(games, n) for n in os.listdir(games)) if os.path.isdir(games) else []
    seed_dirs = [d for d in seed_dirs if os.path.isdir(d)]
    flat = [p for p in _logs_in(folder)]
    drafts = os.path.join(folder, "drafts.jsonl")
    done, open_ = seed_dirs, []
    if os.path.isfile(drafts):
        seeds = _seed_lines(drafts)
        done = [d for d in seed_dirs if os.path.basename(d).isdigit() and int(os.path.basename(d)) in seeds]
        open_ = [d for d in seed_dirs if d not in done]
    if flat:   # an ai-bench folder: <dir>/p<i>-g<j>-seat<k>.jsonl.gz
        done = [folder] + done
    return Scope(folder, "dir", done, open_, {"folder": folder, "seedFolders": len(seed_dirs), "openSeedFolders": len(open_)})


# ---------------------------------------------------------------- is anything still writing it

def _ancestors() -> set[int]:
    out, pid = set(), os.getpid()
    while pid > 1 and pid not in out:
        out.add(pid)
        try:
            with open(f"/proc/{pid}/stat", encoding="utf-8") as f:
                pid = int(f.read().rsplit(")", 1)[1].split()[1])
        except (OSError, ValueError, IndexError):
            break
    return out


def live_writers(match, proc: str = "/proc") -> list[str]:
    """Command lines of the running processes `match(argv)` accepts, this process and its parents aside."""
    mine = _ancestors() if proc == "/proc" else set()
    out = []
    try:
        pids = [p for p in os.listdir(proc) if p.isdigit()]
    except OSError:
        return out
    for p in pids:
        if int(p) in mine:
            continue
        try:
            with open(os.path.join(proc, p, "cmdline"), "rb") as f:
                argv = [a.decode("utf-8", "replace") for a in f.read().split(b"\0") if a]
        except OSError:
            continue
        if argv and match(argv):
            out.append(" ".join(argv))
    return out


def queue_night_match(night: int):
    def m(argv: list[str]) -> bool:
        if not any("cubelab" in a for a in argv) or "queue" not in argv or "run" not in argv:
            return False
        for i, a in enumerate(argv):
            if a == "--night" and i + 1 < len(argv) and argv[i + 1] == str(night):
                return True
            if a == f"--night={night}":
                return True
        return False
    return m


def folder_match(folder: str):
    real = os.path.realpath(folder)
    rel = os.path.normpath(folder)

    def m(argv: list[str]) -> bool:
        if "archive.py" in " ".join(argv):
            return False
        return any(os.path.normpath(a) in (rel, real) or a.startswith(real + os.sep) or a.startswith(rel + os.sep)
                   for a in argv)
    return m


def recent_files(dirs: Iterable[str], quiet_s: float, now: Optional[float] = None) -> list[str]:
    """The gzip logs under these folders written in the last quiet_s seconds.  Only a recorder
    writes a .gz; the archive's own .zst, .tmp and folder changes are not a writer."""
    now = time.time() if now is None else now
    out = []
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for p in [os.path.join(d, n) for n in os.listdir(d) if n.endswith(".jsonl.gz")]:
            try:
                if now - os.stat(p).st_mtime < quiet_s:
                    out.append(p)
            except FileNotFoundError:
                pass
    return out


def check_closed(scope: Scope, writers: list[str], quiet_minutes: float) -> None:
    if writers:
        raise Refused(f"{scope.name}: still being written by: " + "; ".join(w[:200] for w in writers[:3]))
    if quiet_minutes > 0:
        rec = recent_files(scope.seed_dirs + scope.open_seed_dirs, quiet_minutes * 60)
        if rec:
            raise Refused(f"{scope.name}: {len(rec)} file(s) changed in the last {quiet_minutes:g} minutes "
                          f"(e.g. {rec[0]}) -- not closed")


# ---------------------------------------------------------------- one file

def _fsync_dir(d: str) -> None:
    fd = os.open(d, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _write_atomic(path: str, data: bytes, mtime: Optional[float] = None) -> None:
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    if mtime is not None:
        os.utime(tmp, (mtime, mtime))
    os.replace(tmp, path)
    _fsync_dir(os.path.dirname(path) or ".")


def gunzip_strict(data: bytes) -> bytes:
    return gzip.decompress(data)


TRUNC_GZ = (EOFError, gzip.BadGzipFile, zlib.error)


def compress_one(task: tuple[str, int, bool]) -> dict[str, Any]:
    """Worker: write and verify X.jsonl.zst from X.jsonl.gz; never deletes.  With measure_only, compress in memory."""
    gz, level, measure_only = task
    zst = fio.stem(gz) + ".zst"
    t0 = time.process_time()
    try:
        with open(gz, "rb") as f:
            gzb = f.read()
        st = os.stat(gz)
        try:
            raw = gunzip_strict(gzb)
        except TRUNC_GZ as e:
            return {"gz": gz, "status": "truncated", "gzBytes": len(gzb), "why": f"{type(e).__name__}: {e}"}
        sha = hashlib.sha256(raw).hexdigest()
        z = fio.need_zstd()
        if measure_only:
            comp = z.ZstdCompressor(level=level, write_checksum=True, write_content_size=True).compress(raw)
            return {"gz": gz, "status": "measured", "gzBytes": len(gzb), "zstBytes": len(comp), "rawBytes": len(raw),
                    "cpuS": time.process_time() - t0}
        reused = False
        if os.path.exists(zst):   # a run stopped between its rename and its delete: keep it if it is this log
            try:
                with open(zst, "rb") as f:
                    reused = hashlib.sha256(fio.zstd_decompress(f.read())).hexdigest() == sha
            except Exception:  # noqa: BLE001 - a torn or foreign .zst is rewritten
                reused = False
        if not reused:
            comp = z.ZstdCompressor(level=level, write_checksum=True, write_content_size=True).compress(raw)
            _write_atomic(zst, comp, st.st_mtime)
        with open(zst, "rb") as f:   # verify what is ON DISK, not what was in memory
            back = f.read()
        try:
            ok = hashlib.sha256(fio.zstd_decompress(back)).hexdigest() == sha
        except Exception as e:  # noqa: BLE001
            ok, why = False, f"{type(e).__name__}: {e}"
        else:
            why = "" if ok else "sha256 of the decompressed .zst differs from the .gz's"
        if not ok:
            try:
                os.unlink(zst)
            except FileNotFoundError:
                pass
            return {"gz": gz, "status": "failed", "why": why}
        return {"gz": gz, "status": "verified", "reused": reused, "gzBytes": len(gzb), "zstBytes": len(back),
                "rawBytes": len(raw), "sha256": sha, "cpuS": time.process_time() - t0}
    except Exception as e:  # noqa: BLE001 - one file's failure is counted, never fatal to the night
        return {"gz": gz, "status": "failed", "why": f"{type(e).__name__}: {e}"}


# ---------------------------------------------------------------- keep lists

def read_keep(lists: list[str]) -> set[str]:
    """Stems (realpath, `X.jsonl`) of logs a Java step reads, from text or JSONL lists."""
    out: set[str] = set()
    for lf in lists:
        with open(lf, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                paths = []
                if line.startswith("{"):
                    try:
                        o = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    paths = [o[k] for k in ("log", "file", "path") if isinstance(o.get(k), str)]
                else:
                    paths = [line]
                for p in paths:
                    if fio.is_log(p):
                        out.add(os.path.realpath(fio.stem(p)))
    return out


# ---------------------------------------------------------------- the redaction check

def _norm_check(out: str, path: str) -> str:
    return re.sub(r"bytes=\d+", "bytes=N", out.replace(path, "<log>"))


def redaction(paths: list[str], node: str = "node") -> dict[str, tuple[int, str]]:
    checker = os.path.join(REPO, "tools", "check-redaction.mjs")
    res = {}
    for p in paths:
        r = subprocess.run([node, checker, p], capture_output=True, text=True)
        res[fio.stem(p)] = (r.returncode, _norm_check(r.stdout + r.stderr, p))
    return res


def sample(items: list[str], n: int) -> list[str]:
    if n <= 0 or not items:
        return []
    if n >= len(items):
        return list(items)
    return [items[(i * len(items)) // n] for i in range(n)]


# ---------------------------------------------------------------- the run

def _logged(log_f: str) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    if os.path.isfile(log_f):
        with open(log_f, encoding="utf-8") as f:
            for line in f:
                try:
                    o = json.loads(line)
                except json.JSONDecodeError:
                    continue   # a torn last line: that file is re-verified from disk
                out[o["path"]] = o
    return out


def _pool(jobs: int):
    if jobs <= 1:
        return None
    return multiprocessing.get_context("fork").Pool(jobs)


def _map(pool, fn, tasks):
    return pool.imap(fn, tasks, chunksize=1) if pool else map(fn, tasks)


def run(scope: Scope, *, jobs: int = 1, level: int = 19, dry_run: bool = False, keep: set[str] = frozenset(),
        check_sample: int = 12, dry_sample: int = 64, node: str = "node", say=print) -> dict[str, Any]:
    stems = scope.stems()
    gz_now = {s: s + ".gz" for s in stems if os.path.exists(s + ".gz")}
    zst_now = {s: s + ".zst" for s in stems if os.path.exists(s + ".zst")}
    kept = sorted(s for s in gz_now if os.path.realpath(s) in keep and s not in zst_now)
    todo = sorted(gz_now[s] for s in gz_now if s not in kept)
    rel = lambda p: os.path.relpath(p, scope.base)  # noqa: E731
    say(f"archive {scope.name}: {len(stems)} recording(s) in {len(scope.seed_dirs)} finished folder(s); "
        f"{len(todo)} to archive, {len(zst_now)} already .zst, {len(kept)} kept as .gz for Java")

    if dry_run:
        smp = sample(todo, dry_sample)
        pool = _pool(jobs)
        try:
            meas = list(_map(pool, compress_one, [(p, level, True) for p in smp]))
        finally:
            if pool:
                pool.close()
                pool.join()
        ok = [m for m in meas if m["status"] == "measured"]
        gz_total = sum(os.path.getsize(p) for p in todo)
        g, zb = sum(m["gzBytes"] for m in ok), sum(m["zstBytes"] for m in ok)
        ratio = (g / zb) if zb else None
        cpu = sum(m["cpuS"] for m in ok) / len(ok) if ok else None
        est_after = int(gz_total / ratio) if ratio else None
        out = {"schema": 1, "scope": scope.name, "dryRun": True, "level": level, **scope.notes,
               "files": len(todo), "alreadyZst": len(zst_now), "keptGz": len(kept), "gzBytes": gz_total,
               "sampled": len(ok), "sampleTruncated": sum(1 for m in meas if m["status"] == "truncated"),
               "ratio": round(ratio, 3) if ratio else None, "expectedZstBytes": est_after,
               "expectedSavedBytes": (gz_total - est_after) if est_after is not None else None,
               "cpuSecondsPerFile": round(cpu, 3) if cpu else None,
               "expectedCpuHours": round(cpu * len(todo) / 3600, 2) if cpu else None}
        os.makedirs(scope.state_dir, exist_ok=True)
        _write_atomic(scope.path(".dryrun.json"), (json.dumps(out, indent=1) + "\n").encode())
        say(f"dry run: {len(todo)} file(s), {gz_total / 1e9:.3f} GB gzip; sample of {len(ok)}: gzip/zstd "
            f"{out['ratio']}x -> about {(est_after or 0) / 1e9:.3f} GB, saving {(out['expectedSavedBytes'] or 0) / 1e9:.3f} GB; "
            f"about {out['expectedCpuHours']} CPU hour(s) at level {level}")
        return out

    os.makedirs(scope.state_dir, exist_ok=True)
    lock = open(scope.path(".lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise Refused(f"{scope.path('.lock')}: another archive run holds this scope")
    try:
        log_f = scope.path(".files.jsonl")
        logged = _logged(log_f)
        check = sample(todo, check_sample)
        pre = redaction(check, node) if check else {}
        t0 = time.time()
        counts = {"verified": 0, "reused": 0, "failed": 0, "truncated": 0}
        failures: list[dict[str, Any]] = []
        truncated: list[str] = []
        pool = _pool(jobs)
        try:
            if os.path.isfile(log_f) and os.path.getsize(log_f) > 0:
                with open(log_f, "rb+") as lb:   # a torn last line (a kill mid-write) must not swallow the next
                    lb.seek(-1, os.SEEK_END)
                    if lb.read(1) != b"\n":
                        lb.write(b"\n")
            with open(log_f, "a", encoding="utf-8") as lf:
                for i, r in enumerate(_map(pool, compress_one, [(p, level, False) for p in todo]), 1):
                    st = r["status"]
                    if st == "verified":
                        rec = {"path": rel(fio.stem(r["gz"]) + ".zst"), "rawBytes": r["rawBytes"], "gzBytes": r["gzBytes"],
                               "zstBytes": r["zstBytes"], "sha256": r["sha256"], "at": time.strftime("%Y-%m-%dT%H:%M:%S")}
                        lf.write(json.dumps(rec) + "\n")
                        lf.flush()
                        os.fsync(lf.fileno())
                        logged[rec["path"]] = rec
                        os.unlink(r["gz"])          # only after the .zst verified AND its line is on disk
                        _fsync_dir(os.path.dirname(r["gz"]))
                        counts["verified"] += 1
                        counts["reused"] += 1 if r.get("reused") else 0
                    elif st == "truncated":
                        counts["truncated"] += 1
                        truncated.append(rel(r["gz"]))
                    else:
                        counts["failed"] += 1
                        failures.append({"path": rel(r["gz"]), "why": r.get("why")})
                    if i % 500 == 0 or i == len(todo):
                        say(f"  {i}/{len(todo)}: {counts['verified']} verified, {counts['failed']} failed, "
                            f"{counts['truncated']} truncated, {time.time() - t0:.0f} s")
        finally:
            if pool:
                pool.close()
                pool.join()
        # the redaction check: the same logs as zstd must get the very verdict they got as gzip
        post_paths = [fio.stem(p) + ".zst" for p in check if os.path.exists(fio.stem(p) + ".zst")]
        post = redaction(post_paths, node) if post_paths else {}
        mism = [s for s in post if s in pre and post[s] != pre[s]]
        red = {"checked": len(post), "passed": sum(1 for v in post.values() if v[0] == 0),
               "failedBefore": sum(1 for v in pre.values() if v[0] != 0), "mismatch": len(mism),
               "mismatched": [rel(s) for s in mism]}
        manifest = summarize(scope, logged, kept, truncated, counts, failures, red, level, time.time() - t0)
        _write_atomic(scope.path(".json"), (json.dumps(manifest, indent=1) + "\n").encode())
        say(f"archive {scope.name}: {manifest['verified']} of {manifest['files']} verified, {manifest['failed']} failed, "
            f"{manifest['truncated']} truncated (kept .gz); {manifest['bytesBefore'] / 1e9:.3f} GB -> "
            f"{manifest['bytesAfter'] / 1e9:.3f} GB ({manifest['ratio']}x); redaction {red['passed']}/{red['checked']} "
            f"pass, {red['mismatch']} mismatch -> {scope.path('.json')}")
        return manifest
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()


def summarize(scope: Scope, logged: dict[str, dict[str, Any]], kept: list[str], truncated: list[str],
              counts: dict[str, int], failures: list[dict[str, Any]], red: dict[str, Any], level: int,
              secs: float) -> dict[str, Any]:
    """Counts and bytes from the disk as it is now, the log supplying each archived file's gzip size."""
    stems = scope.stems()
    zst_b = gz_b_of_archived = raw_b = 0
    archived = unlogged = 0
    still_gz_bytes = 0
    still_gz = 0
    for s in stems:
        z, g = s + ".zst", s + ".gz"
        if os.path.exists(z) and not os.path.exists(g):
            archived += 1
            zst_b += os.path.getsize(z)
            rec = logged.get(os.path.relpath(z, scope.base))
            if rec:
                gz_b_of_archived += rec["gzBytes"]
                raw_b += rec["rawBytes"]
            else:
                unlogged += 1
        elif os.path.exists(g):
            still_gz += 1
            still_gz_bytes += os.path.getsize(g)
    before = gz_b_of_archived + still_gz_bytes
    after = zst_b + still_gz_bytes
    eligible = len(stems) - len(kept) - len(truncated)
    return {
        "schema": 1, "scope": scope.name, "level": level, "at": time.strftime("%Y-%m-%dT%H:%M:%S"), **scope.notes,
        "recordings": len(stems),
        "files": eligible,                      # what this archive is for: every recording not kept or truncated
        "verified": archived - unlogged,        # .zst alone on disk with a verified line in the log
        "archived": archived, "unlogged": unlogged,
        "failed": counts["failed"], "truncated": len(truncated), "keptGz": len(kept), "stillGz": still_gz,
        "thisRun": counts,
        "bytesBefore": before, "bytesAfter": after, "savedBytes": before - after,
        "gzBytesArchived": gz_b_of_archived, "zstBytes": zst_b, "rawBytes": raw_b,
        "ratio": round(gz_b_of_archived / zst_b, 3) if zst_b and not unlogged else None,
        "seconds": round(secs, 1),
        "redaction": red,
        "failures": failures[:50], "truncatedFiles": truncated[:50], "keptFiles": [os.path.relpath(k, scope.base) + ".gz" for k in kept[:50]],
    }


# ---------------------------------------------------------------- restore

def restore(paths: list[str], say=print) -> int:
    """X.jsonl.zst (or a stored X.jsonl.gz path the archive replaced) -> a verified X.jsonl.gz; the .zst is removed."""
    bad = 0
    for p in paths:
        zst = fio.stem(p) + ".zst"
        gz = fio.stem(p) + ".gz"
        if not os.path.exists(zst):
            if os.path.exists(gz):
                say(f"{gz}: already gzip")
                continue
            say(f"{p}: no {zst}")
            bad += 1
            continue
        with open(zst, "rb") as f:
            raw = fio.zstd_decompress(f.read())
        sha = hashlib.sha256(raw).hexdigest()
        _write_atomic(gz, gzip.compress(raw, compresslevel=6, mtime=0), os.stat(zst).st_mtime)
        with open(gz, "rb") as f:
            if hashlib.sha256(gzip.decompress(f.read())).hexdigest() != sha:
                os.unlink(gz)
                say(f"{gz}: FAILED to verify; the .zst is kept")
                bad += 1
                continue
        os.unlink(zst)
        _fsync_dir(os.path.dirname(zst) or ".")
        say(f"{gz}: restored ({len(raw)} bytes raw)")
    return 1 if bad else 0


# ---------------------------------------------------------------- CLI

def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) // 2))
    common.add_argument("--level", type=int, default=19, help="zstd level 1-22 (default 19)")
    common.add_argument("--dry-run", action="store_true", help="measure a sample and report expected savings; write nothing else")
    common.add_argument("--dry-sample", type=int, default=64)
    common.add_argument("--keep-gz", action="append", default=[], help="a list of logs a Java step reads: they stay .gz")
    common.add_argument("--no-default-keep", action="store_true", help=f"do not read {', '.join(DEFAULT_KEEP)}")
    common.add_argument("--quiet-minutes", type=float, default=30, help="refuse if a file changed this recently")
    common.add_argument("--check-sample", type=int, default=12, help="logs run through check-redaction.mjs before and after")
    common.add_argument("--node", default="node")
    n = sub.add_parser("night", parents=[common], help="a finished queue night")
    n.add_argument("--root", default="var/cubelab/queue")
    n.add_argument("--night", type=int, required=True)
    n.add_argument("--allow-incomplete", action="store_true")
    d = sub.add_parser("dir", parents=[common], help="a finished run folder (its games/) or an ai-bench folder")
    d.add_argument("folder")
    r = sub.add_parser("restore", help=".zst -> verified .gz, for a Java reader")
    r.add_argument("paths", nargs="+")
    a = ap.parse_args(argv)
    if a.cmd == "restore":
        return restore(a.paths)
    if not 1 <= a.level <= 22:
        ap.error("--level is 1..22")
    fio.need_zstd()
    try:
        if a.cmd == "night":
            scope = night_scope(a.root, a.night, a.allow_incomplete)
            writers = live_writers(queue_night_match(a.night))
        else:
            scope = dir_scope(a.folder)
            writers = live_writers(folder_match(a.folder))
        check_closed(scope, writers, a.quiet_minutes)
        lists = list(a.keep_gz) + ([] if a.no_default_keep else [p for p in DEFAULT_KEEP if os.path.isfile(p)])
        for lst in lists:
            print(f"keeping as .gz the logs listed in {lst}")
        m = run(scope, jobs=a.jobs, level=a.level, dry_run=a.dry_run, keep=read_keep(lists),
                check_sample=a.check_sample, dry_sample=a.dry_sample, node=a.node)
    except Refused as e:
        print(f"archive: REFUSED: {e}", file=sys.stderr)
        return EXIT_REFUSED
    if a.dry_run:
        return 0
    return 0 if m["failed"] == 0 and m["redaction"]["mismatch"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
