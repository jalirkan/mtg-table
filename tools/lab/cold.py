# mtg-table — tools/lab: the COLD tier of the lab's recordings (D378), driven by archive.py.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""A finished queue night's recordings moved off the hot disk, one tar.zst a key folder.

    python3 tools/lab/archive.py cold --night N --root var/cubelab/queue --dry-run
    python3 tools/lab/archive.py cold --night N --root var/cubelab/queue --dataset var/ml/data/v2
    python3 tools/lab/archive.py restore-night --night N --root var/cubelab/queue [--unit NAME] [--from-mirror]

HOT and COLD.  Hot stays on the lab's own disk: the night being recorded, anything a queued
or pinned job reads, the warehouse, models and datasets.  Cold is the archive root
(`--archive-root`, else $LAB_ARCHIVE_ROOT, else config.json `labArchiveRoot`; on the PC
`/mnt/e/forgecoach-archive`, an NTFS drive mounted with `windows_names`), and optionally a
second copy (`--mirror`, $LAB_ARCHIVE_MIRROR, `labArchiveMirror`).  Per night it holds

    <archive-root>/night-<N>/<unit>.tar.zst          one per key folder, plus `quarantine`
    <archive-root>/night-<N>/<unit>.members.jsonl    one line per member (below)
    <archive-root>/night-<N>/manifest.json           the night: units, counts, bytes, sha256, location
    <archive-root>/manifest.jsonl                    one line per archived unit, every night

and the hot side keeps the same night manifest at `<root>/archive/cold-night-<N>.json` and the
members lists under `<root>/archive/cold-night-<N>/` (a few MB), so the warehouse can say
where a recording lives without the drive.

WHAT A UNIT HOLDS.  A key folder's unit is every file under the night's finished seeds'
`<key>/games/<seed>/`; a recording (`.jsonl.gz`, or the D370 `.jsonl.zst`) is stored
DECOMPRESSED as `<key>/games/<seed>/<name>.jsonl`, so one zstd stream (level 19, a 128 MB
window, long-distance matching) sees every game of the folder at once: on the six
committed lab recordings that is 5.1x smaller than their gzip, against 3.5x for one zstd
file each (D370).  Anything else -- a cut-short gzip, a stray file -- is stored byte for
byte.  The `quarantine` unit is the night's redaction-pass folder (`--quarantine DIR`, else
`<root>-quarantine-n<N>/`; night 1's is `<root>-quarantine/`, which must be named), byte for
byte: it is evidence.  A members line is
{member, path (where it lived, relative to the unit's base), enc (gz | zst | asis), bytes,
sha256 (the file as it was), rawBytes, rawSha256 (the member), mtime}.

SAFE.  Nothing on the hot disk is deleted until the unit's archive was written as `.tmp`,
fsynced and renamed, then READ BACK from the drive: every tar member listed, hashed and
matched -- name, size, SHA-256 -- against what was read from the source files, with no
member missing and none extra; and the mirror's copy (when one is configured) hashed equal
to the primary.  The manifests are written next, then each source file is deleted only if
its size and mtime are still the ones archived.  A stop anywhere is resumed by running the
command again (a lock keeps two runs apart); `--keep-hot` archives and deletes nothing.

REFUSED (exit 3, nothing written) unless every check holds: the night is closed (archive.py
`night`'s rules: a plan, in the ledger, no live `queue run --night N`, nothing written in
`--quiet-minutes`, every planned draft finished unless --allow-incomplete); `redaction` --
the night's redaction pass ran (its quarantine folder exists; the recordings in it are counted
by walking it, never from failed.txt, which night 1's second run overwrote); `warehouse` --
the warehouse ingested every line of the night (`--warehouse`'s _state.json offsets cover
them); `encoded` -- a dataset (`--dataset DIR`, repeatable; its games.jsonl) holds at least
`--min-encoded` (90%) of the night's recordings; `holds` -- no hold in
tools/lab/archive-holds.json names the night while a job it waits for is not `done` on
pc-results (fail closed: a STATUS that cannot be read holds).  `--skip-check NAME` waives one
of the last four, and the manifest says so.

SKIPPED (exit 4, a warning, nothing written) when no archive root is configured, when it
is on the same filesystem as the queue (the drive is not mounted: writing there would fill
the hot disk), or when it is not writable (an NTFS volume comes up read-only after Windows
hibernated).  NAMES on the drive are NTFS-safe (no < > : " / \\ | ? *, no trailing dot or
space, no reserved device name): a unit name that is not gets a `-<sha8>` suffix.

RESTORE.  `restore-night` writes each member back where it lived (a recording recompressed
as it was: gzip, or zstd; `--as raw|gz|zst` to choose), checks the raw SHA-256 of what it
wrote, never overwrites a file that differs, and keeps the archive.
"""
from __future__ import annotations

import fcntl
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tarfile
import time
from typing import Any, Callable, Iterable, Optional

import fio

SCHEMA = 1
WINDOW_LOG = 27            # 128 MB: a reader needs max_window_size >= 2**27
EXIT_SKIPPED = 4
CHECKS = ("redaction", "warehouse", "encoded", "holds")
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
HOLDS = os.path.join(REPO, "tools", "lab", "archive-holds.json")

# every create on the cold drive goes through this, so a test can stand in a fake NTFS or read-only mount
_os_open = os.open


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class Skipped(Exception):
    """The cold drive is not there, or not writable: nothing was written."""


# ---------------------------------------------------------------- names

NTFS_BAD = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
NTFS_RESERVED = {"CON", "PRN", "AUX", "NUL"} | {f"COM{i}" for i in range(1, 10)} | {f"LPT{i}" for i in range(1, 10)}


def ntfs_safe(name: str) -> bool:
    return (bool(name) and not NTFS_BAD.search(name) and not name.endswith((".", " "))
            and name.split(".")[0].upper() not in NTFS_RESERVED)


def unit_name(key: str) -> str:
    """`normal/synergy` -> `normal__synergy`; a name NTFS would refuse is cleaned and given the key's sha8."""
    flat = key.replace("/", "__")
    if ntfs_safe(flat):
        return flat
    clean = NTFS_BAD.sub("_", flat).rstrip(". ") or "_"
    if clean.split(".")[0].upper() in NTFS_RESERVED:
        clean = "_" + clean
    return f"{clean}-{hashlib.sha1(key.encode()).hexdigest()[:8]}"


# ---------------------------------------------------------------- configuration and the drive

def config_value(key: str, env: str, arg: Optional[str], repo: str = REPO) -> Optional[str]:
    if arg:
        return arg
    if os.environ.get(env):
        return os.environ[env]
    try:
        with open(os.path.join(repo, "config.json"), encoding="utf-8") as f:
            v = json.load(f).get(key)
    except (OSError, ValueError):
        return None
    return v if isinstance(v, str) and v else None


def _existing(p: str) -> str:
    p = os.path.abspath(p)
    while not os.path.exists(p):
        p = os.path.dirname(p)
    return p


def check_drive(root: str, hot: str, allow_same_device: bool = False) -> None:
    """Raise Skipped unless `root` is on another filesystem than `hot` and writable (a probe file is written and removed)."""
    if not allow_same_device and os.stat(_existing(root)).st_dev == os.stat(_existing(hot)).st_dev:
        raise Skipped(f"{root} is on the same filesystem as {hot} -- is the drive mounted? (nothing written)")
    probe = os.path.join(root, f".probe-{os.getpid()}")
    try:
        _makedirs(root)
        fd = _os_open(probe, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
        try:
            os.write(fd, b"probe")
            os.fsync(fd)
        finally:
            os.close(fd)
        os.unlink(probe)
    except OSError as e:
        raise Skipped(f"{root} is not writable ({e.strerror or e}) -- read-only after a Windows hibernation? (nothing written)")


def _makedirs(d: str) -> None:
    if os.path.isdir(d):
        return
    _makedirs(os.path.dirname(d))
    try:
        os.mkdir(d)
    except FileExistsError:
        pass


def _fsync_dir(d: str) -> None:
    try:
        fd = os.open(d, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass   # ntfs3 may refuse a directory fsync; the file's own fsync stands
    finally:
        os.close(fd)


class AtomicOut:
    """A file written as `<path>.tmp` through _os_open, fsynced, renamed over `path`."""

    def __init__(self, path: str):
        self.path, self.tmp = path, path + ".tmp"
        _makedirs(os.path.dirname(path))
        self.f = os.fdopen(_os_open(self.tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644), "wb")

    def commit(self) -> None:
        self.f.flush()
        os.fsync(self.f.fileno())
        self.f.close()
        os.replace(self.tmp, self.path)
        _fsync_dir(os.path.dirname(self.path))

    def abort(self) -> None:
        try:
            self.f.close()
        finally:
            if os.path.exists(self.tmp):
                os.unlink(self.tmp)


def write_atomic(path: str, data: bytes) -> None:
    o = AtomicOut(path)
    try:
        o.f.write(data)
        o.commit()
    except BaseException:
        o.abort()
        raise


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


# ---------------------------------------------------------------- what a night holds

class Unit:
    def __init__(self, kind: str, key: str, base: str, files: list[str]):
        self.kind, self.key, self.base, self.files = kind, key, base, sorted(files)
        self.name = "quarantine" if kind == "quarantine" else unit_name(key)

    @property
    def hot_bytes(self) -> int:
        return sum(os.path.getsize(p) for p in self.files if os.path.exists(p))


def _files_under(d: str) -> list[str]:
    out = []
    for dp, _dn, fn in os.walk(d):
        out += [os.path.join(dp, n) for n in fn if not n.endswith(".tmp")]
    return out


def quarantine_dir(root: str, night: int, override: Optional[str] = None) -> str:
    """The night's redaction-pass folder: `--quarantine`, else `<root>-quarantine-n<N>` (J059, J061).
    Night 1's is `<root>-quarantine` with no suffix (J020/J029), so it must be named."""
    return os.path.abspath(override) if override else os.path.abspath(root).rstrip(os.sep) + f"-quarantine-n{night}"


def quarantined_recordings(qdir: str) -> list[str]:
    """The recordings under a quarantine folder, found by walking it (as tools/requarantine.mjs does, D371):
    failed.txt is not a reliable list -- night 1's was overwritten by its second run (J029)."""
    return sorted(p for p in _files_under(qdir) if p.endswith((".jsonl.gz", ".jsonl.zst")))


def night_units(root: str, scope, night: int, quarantine: Optional[str] = None) -> list[Unit]:
    """A unit per key folder (the scope's finished seed folders under it) and the quarantine folder."""
    by_key: dict[str, list[str]] = {}
    for d in scope.seed_dirs:
        key = os.path.relpath(os.path.dirname(os.path.dirname(d)), root)
        by_key.setdefault(key, [])
        if os.path.isdir(d):
            by_key[key] += [os.path.join(d, n) for n in os.listdir(d)
                            if os.path.isfile(os.path.join(d, n)) and not n.endswith(".tmp")]
    units = [Unit("recordings", k, root, v) for k, v in sorted(by_key.items())]
    q = quarantine_dir(root, night, quarantine)
    if os.path.isdir(q):
        units.append(Unit("quarantine", os.path.basename(q), os.path.dirname(q), _files_under(q)))
    names = [u.name for u in units]
    if len(set(names)) != len(names):
        raise RuntimeError(f"two units of night {night} share an archive name: {names}")
    return units


def night_lines(drafts: str, seeds: set[int]) -> tuple[int, set[str], set[int]]:
    """(the byte end of the last line of these seeds, their `ver`s, the seeds seen) in a drafts.jsonl."""
    end, vers, seen = 0, set(), set()
    pos = 0
    with open(drafts, "rb") as f:
        for line in f:
            pos += len(line)
            if not line.endswith(b"\n"):
                break
            try:
                o = json.loads(line)
                s = int(o.get("seed"))
            except (ValueError, TypeError, AttributeError):
                continue
            if s in seeds:
                end, seen = pos, seen | {s}
                if isinstance(o.get("ver"), str):
                    vers.add(o["ver"])
    return end, vers, seen


def night_seeds(root: str, night: int) -> dict[str, set[int]]:
    with open(os.path.join(root, f"night-{night}.json"), encoding="utf-8") as f:
        plan = json.load(f)
    out: dict[str, set[int]] = {}
    for c in plan.get("chunks") or []:
        out.setdefault(c["key"], set()).update(range(int(c["seed"]), int(c["seed"]) + int(c["drafts"])))
    return out


# ---------------------------------------------------------------- the checks

REC_RE = re.compile(r"((?:normal|bridge)/[^/]+/games/\d+/[^/]+?\.jsonl)(?:\.gz|\.zst)?$")


def check_redaction(root: str, night: int, quarantine: Optional[str] = None) -> str:
    """The night's redaction pass ran: its quarantine folder exists (the pass makes it before checking anything).
    What it holds is counted by walking it; failed.txt is not read."""
    q = quarantine_dir(root, night, quarantine)
    man = load_manifest(root, night) or {}
    if not os.path.isdir(q) and any(u.get("kind") == "quarantine" for u in man.get("units") or []):
        return "the quarantine folder is already archived"
    if not os.path.isdir(q):
        legacy = os.path.abspath(root).rstrip(os.sep) + "-quarantine"
        hint = (f"; {legacy} exists (night 1's folder has no -n suffix): name it with --quarantine"
                if not quarantine and os.path.isdir(legacy) else "")
        raise AssertionError(f"no {q}: the night's redaction pass has not run{hint}")
    n = len(quarantined_recordings(q))
    return f"{q}: {n} quarantined recording(s), counted by walking the folder"


def warehouse_rel(path: str) -> str:
    """A path as the warehouse's _state.json keys it (warehouse.py `rel`)."""
    p = os.path.abspath(path)
    return os.path.relpath(p, REPO) if p.startswith(REPO + os.sep) else p


def check_warehouse(root: str, night: int, warehouse: str) -> str:
    st_f = os.path.join(warehouse, "_state.json")
    try:
        with open(st_f, encoding="utf-8") as f:
            files = json.load(f).get("files") or {}
    except (OSError, ValueError) as e:
        raise AssertionError(f"{st_f}: unreadable ({e}) -- the warehouse has not ingested the queue")
    lines = 0
    for key, seeds in night_seeds(root, night).items():
        d = os.path.join(root, key, "drafts.jsonl")
        end, _v, seen = night_lines(d, seeds)
        lines += len(seen)
        s = files.get(warehouse_rel(d))
        if s is None:
            raise AssertionError(f"{d}: not in {st_f} -- not ingested")
        if s.get("ino") != os.stat(d).st_ino or int(s.get("offset", 0)) < end:
            raise AssertionError(f"{d}: the warehouse read {s.get('offset')} of the {end} bytes night {night} needs -- run "
                                 "`warehouse.py ingest`")
    return f"{lines} drafts lines ingested"


def check_encoded(units: list[Unit], datasets: list[str], min_share: float) -> str:
    if not datasets:
        raise AssertionError("no --dataset named: cannot tell the night was encoded for training")
    have: set[str] = set()
    for ds in datasets:
        gf = os.path.join(ds, "games.jsonl")
        if not os.path.isfile(gf):
            raise AssertionError(f"{gf}: missing")
        with open(gf, encoding="utf-8") as f:
            for line in f:
                try:
                    m = REC_RE.search(json.loads(line).get("file") or "")
                except (ValueError, AttributeError):
                    continue
                if m:
                    have.add(m.group(1))
    want = set()
    for u in units:
        if u.kind == "recordings":
            for p in u.files:
                m = REC_RE.search(os.path.relpath(p, u.base))
                if m:
                    want.add(m.group(1))
    if not want:
        return "no recordings"
    share = len(want & have) / len(want)
    if share < min_share:
        raise AssertionError(f"{len(want & have)} of {len(want)} recordings ({share:.1%}) are in {', '.join(datasets)}; "
                             f"--min-encoded is {min_share:.0%}")
    return f"{len(want & have)} of {len(want)} recordings encoded ({share:.1%})"


def job_state(job: str, results_dir: Optional[str], repo: str = REPO) -> Optional[str]:
    """A pc-results STATUS's first line: from a pc-results checkout, else `git show origin/pc-results:...`."""
    for d in [results_dir, os.environ.get("LAB_RESULTS_DIR"), os.path.expanduser("~/code/pc-results")]:
        if d and os.path.isfile(os.path.join(d, "results", job, "STATUS")):
            with open(os.path.join(d, "results", job, "STATUS"), encoding="utf-8") as f:
                return (f.readline().strip() or None)
    try:
        r = subprocess.run(["git", "-C", repo, "show", f"origin/pc-results:results/{job}/STATUS"],
                           capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout.splitlines()[0].strip() if r.returncode == 0 and r.stdout.strip() else None


def check_holds(night: int, holds_file: str, results_dir: Optional[str], released: set[str],
                state: Callable[[str], Optional[str]]) -> str:
    try:
        with open(holds_file, encoding="utf-8") as f:
            holds = json.load(f).get("holds") or []
    except FileNotFoundError:
        return f"no {holds_file}"
    waiting = []
    for h in holds:
        if night not in (h.get("nights") or []):
            continue
        for j in h.get("until") or []:
            if j in released:
                continue
            s = state(j)
            if s != "done":
                waiting.append(f"{j} ({s or 'no STATUS'})")
        if waiting:
            raise AssertionError(f"night {night} is held hot until {', '.join(waiting)} -- {h.get('why', '')}".rstrip(" -"))
    return "no hold"


# ---------------------------------------------------------------- writing and verifying one unit

def _member_of(path: str, base: str, unpack: bool = True) -> tuple[str, str, bytes, bytes]:
    """(member name, enc, the file's bytes, the member's bytes); unpack=False keeps every file byte for byte."""
    rel = os.path.relpath(path, base).replace(os.sep, "/")
    with open(path, "rb") as f:
        data = f.read()
    if not unpack:
        return rel, "asis", data, data
    if rel.endswith(".jsonl.gz"):
        try:
            return rel[:-3], "gz", data, gzip.decompress(data)
        except (EOFError, OSError, ValueError):
            pass   # cut short: kept byte for byte
    elif rel.endswith(".jsonl.zst") and data[:4] == fio.ZSTD_MAGIC:
        try:
            return rel[:-4], "zst", data, fio.zstd_decompress(data)
        except Exception:  # noqa: BLE001
            pass
    return rel, "asis", data, data


def compressor(level: int, threads: int):
    z = fio.need_zstd()
    p = z.ZstdCompressionParameters.from_level(level, window_log=WINDOW_LOG, enable_ldm=True,
                                               threads=max(0, threads), write_checksum=True)
    return z.ZstdCompressor(compression_params=p)


def write_unit(u: Unit, dest: str, level: int, threads: int) -> list[dict[str, Any]]:
    """Stream the unit into dest (atomically); return its members' records."""
    recs: list[dict[str, Any]] = []
    out = AtomicOut(dest)
    try:
        w = compressor(level, threads).stream_writer(out.f, closefd=False)
        with tarfile.open(fileobj=w, mode="w|", format=tarfile.PAX_FORMAT) as t:
            for p in u.files:
                st = os.stat(p)
                member, enc, data, raw = _member_of(p, u.base, u.kind == "recordings")
                ti = tarfile.TarInfo(member)
                ti.size, ti.mtime, ti.mode = len(raw), int(st.st_mtime), 0o644
                t.addfile(ti, io.BytesIO(raw))
                recs.append({"member": member, "path": os.path.relpath(p, u.base).replace(os.sep, "/"), "enc": enc,
                             "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "rawBytes": len(raw),
                             "rawSha256": hashlib.sha256(raw).hexdigest(), "mtime": st.st_mtime,
                             "mtimeNs": st.st_mtime_ns})
        w.flush(fio.need_zstd().FLUSH_FRAME)
        out.commit()
    except BaseException:
        out.abort()
        raise
    return recs


def read_members(path: str) -> Iterable[tuple[str, bytes]]:
    z = fio.need_zstd()
    with open(path, "rb") as f:
        r = z.ZstdDecompressor(max_window_size=1 << 31).stream_reader(f, read_across_frames=True)
        with tarfile.open(fileobj=r, mode="r|") as t:
            for m in t:
                if not m.isfile():
                    continue
                yield m.name, t.extractfile(m).read()


def verify_unit(path: str, recs: list[dict[str, Any]]) -> Optional[str]:
    """None when the archive on disk holds exactly these members with these sizes and SHA-256s, else why not."""
    want = {r["member"]: r for r in recs}
    seen = set()
    try:
        for name, data in read_members(path):
            r = want.get(name)
            if r is None:
                return f"an extra member {name}"
            if name in seen:
                return f"{name} twice"
            if len(data) != r["rawBytes"] or hashlib.sha256(data).hexdigest() != r["rawSha256"]:
                return f"{name}: size or SHA-256 differs from the source"
            seen.add(name)
    except Exception as e:  # noqa: BLE001 - a torn or foreign archive fails, never raises past here
        return f"unreadable: {type(e).__name__}: {e}"
    missing = set(want) - seen
    return f"{len(missing)} member(s) missing, e.g. {sorted(missing)[0]}" if missing else None


def copy_verified(src: str, dest: str, sha: str) -> Optional[str]:
    out = AtomicOut(dest)
    try:
        with open(src, "rb") as f:
            shutil.copyfileobj(f, out.f, 1 << 20)
        out.commit()
    except BaseException:
        out.abort()
        raise
    got = sha256_file(dest)
    return None if got == sha else f"{dest}: SHA-256 {got[:12]} is not the primary's {sha[:12]}"


def delete_hot(u: Unit, recs: list[dict[str, Any]]) -> tuple[int, int]:
    """Each archived source that still has the size and mtime archived: (deleted, left because it changed)."""
    deleted = changed = 0
    dirs = set()
    for r in recs:
        p = os.path.join(u.base, r["path"])
        try:
            st = os.stat(p)
        except FileNotFoundError:
            continue
        if st.st_size != r["bytes"] or st.st_mtime_ns != r["mtimeNs"]:
            changed += 1
            continue
        os.unlink(p)
        dirs.add(os.path.dirname(p))
        deleted += 1
    for d in sorted(dirs, key=len, reverse=True):
        _fsync_dir(d)
        while d.startswith(u.base + os.sep):   # empty folders go too (a seed folder, the quarantine tree)
            try:
                os.rmdir(d)
            except OSError:
                break
            d = os.path.dirname(d)
    return deleted, changed


# ---------------------------------------------------------------- the night

def _hot_paths(root: str, night: int) -> tuple[str, str]:
    a = os.path.join(root, "archive")
    return os.path.join(a, f"cold-night-{night}.json"), os.path.join(a, f"cold-night-{night}")


def load_manifest(root: str, night: int) -> Optional[dict[str, Any]]:
    p = _hot_paths(root, night)[0]
    if not os.path.isfile(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _read_members(path: str) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def _members_bytes(recs: list[dict[str, Any]]) -> bytes:
    return "".join(json.dumps(r, sort_keys=True) + "\n" for r in recs).encode()


def cold_night(root: str, night: int, units: list[Unit], *, archive_root: str, mirror: Optional[str], level: int,
               threads: int, keep_hot: bool, checks: dict[str, str], skipped: list[str], vers: list[str],
               say=print) -> dict[str, Any]:
    root = os.path.abspath(root)
    hot_json, hot_members = _hot_paths(root, night)
    os.makedirs(hot_members, exist_ok=True)
    lock = open(os.path.join(root, "archive", f"cold-night-{night}.lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close()
        raise RuntimeError(f"another cold run holds night {night}")
    try:
        prev = load_manifest(root, night) or {}
        done = {x["name"]: x for x in prev.get("units") or [] if x.get("verified")}
        man: dict[str, Any] = {"schema": SCHEMA, "night": night, "root": root, "archiveRoot": archive_root,
                               "mirror": mirror, "level": level, "windowLog": WINDOW_LOG, "vers": vers,
                               "checks": checks, "skippedChecks": skipped, "units": [], "failed": []}
        cold_dir = os.path.join(archive_root, f"night-{night}")
        for u in units:
            dest = os.path.join(cold_dir, u.name + ".tar.zst")
            members_hot = os.path.join(hot_members, u.name + ".members.jsonl")
            rec = done.get(u.name)
            if rec and os.path.isfile(members_hot):
                recs = _read_members(members_hot)
                why = verify_unit(rec["file"], recs) if os.path.isfile(rec["file"]) else f"{rec['file']} is gone"
                if why:
                    man["failed"].append({"unit": u.name, "why": f"re-verify: {why}"})
                    say(f"  {u.name}: FAILED re-verify ({why}); the hot copy is kept")
                    continue
                say(f"  {u.name}: archived before, re-verified")
            else:
                if not u.files:
                    continue
                need = u.hot_bytes
                free = shutil.disk_usage(_existing(cold_dir)).free
                if free < need:
                    man["failed"].append({"unit": u.name, "why": f"{free} bytes free on the drive, {need} needed"})
                    say(f"  {u.name}: FAILED: the drive has {free / 1e9:.1f} GB free, {need / 1e9:.1f} GB needed")
                    break
                t0 = time.time()
                recs = write_unit(u, dest, level, threads)
                why = verify_unit(dest, recs)
                if why:
                    os.unlink(dest)
                    man["failed"].append({"unit": u.name, "why": why})
                    say(f"  {u.name}: FAILED verify ({why}); the archive is removed and the hot copy kept")
                    continue
                sha = sha256_file(dest)
                rec = {"name": u.name, "kind": u.kind, "key": u.key, "base": u.base, "file": dest, "mirrorFile": None,
                       "members": len(recs), "rawBytes": sum(r["rawBytes"] for r in recs),
                       "hotBytes": sum(r["bytes"] for r in recs), "archiveBytes": os.path.getsize(dest), "sha256": sha,
                       "encs": {e: sum(1 for r in recs if r["enc"] == e) for e in ("gz", "zst", "asis")},
                       "seconds": round(time.time() - t0, 1), "verified": True,
                       "at": _now(), "deletedHot": 0, "changedHot": 0}
                if mirror:
                    mdest = os.path.join(mirror, f"night-{night}", u.name + ".tar.zst")
                    why = copy_verified(dest, mdest, sha)
                    if why:
                        man["failed"].append({"unit": u.name, "why": f"mirror: {why}"})
                        say(f"  {u.name}: FAILED mirror ({why}); the hot copy is kept")
                        continue
                    write_atomic(os.path.join(mirror, f"night-{night}", u.name + ".members.jsonl"), _members_bytes(recs))
                    rec["mirrorFile"] = mdest
                write_atomic(os.path.join(cold_dir, u.name + ".members.jsonl"), _members_bytes(recs))
                with open(members_hot + ".tmp", "wb") as f:
                    f.write(_members_bytes(recs))
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(members_hot + ".tmp", members_hot)
                line = {k: rec[k] for k in ("name", "kind", "key", "file", "mirrorFile", "members", "rawBytes", "hotBytes",
                                            "archiveBytes", "sha256", "at")} | {"night": night, "vers": vers}
                _append_index(archive_root, line)
                if mirror:
                    _append_index(mirror, line)
                done[u.name] = rec
                # the record is on disk (hot and cold) before anything hot is deleted
                _save(hot_json, cold_dir, man, done, units)
                say(f"  {u.name}: {len(recs)} member(s), {rec['hotBytes'] / 1e6:.1f} MB hot -> "
                    f"{rec['archiveBytes'] / 1e6:.1f} MB ({rec['hotBytes'] / max(1, rec['archiveBytes']):.2f}x), verified")
            if not keep_hot:
                dl, ch = delete_hot(u, recs)
                rec["deletedHot"] = rec.get("deletedHot", 0) + dl
                rec["changedHot"] = ch
                if ch:
                    say(f"  {u.name}: {ch} source file(s) changed since they were archived: kept hot")
        _save(hot_json, cold_dir, man, done, units)
        return man
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()


def _append_index(archive_root: str, line: dict[str, Any]) -> None:
    p = os.path.join(archive_root, "manifest.jsonl")
    fd = _os_open(p, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(fd, (json.dumps(line, sort_keys=True) + "\n").encode())
        os.fsync(fd)
    finally:
        os.close(fd)


def _save(hot_json: str, cold_dir: str, man: dict[str, Any], done: dict[str, Any], units: list[Unit]) -> None:
    order = {u.name: i for i, u in enumerate(units)}
    man["units"] = sorted(done.values(), key=lambda r: order.get(r["name"], 1 << 30))
    man["totals"] = {k: sum(int(r.get(k) or 0) for r in man["units"])
                     for k in ("members", "rawBytes", "hotBytes", "archiveBytes", "deletedHot", "changedHot")}
    man["verifiedUnits"] = len(man["units"])
    man["at"] = _now()
    data = (json.dumps(man, indent=1, sort_keys=True) + "\n").encode()
    with open(hot_json + ".tmp", "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(hot_json + ".tmp", hot_json)
    write_atomic(os.path.join(cold_dir, "manifest.json"), data)


def estimate(units: list[Unit], level: int, threads: int, sample: int) -> dict[str, Any]:
    """The archive's size from an evenly spaced sample of the night's files, packed the same way in memory."""
    files = [(u, p) for u in units for p in u.files]
    if not files:
        return {"sampled": 0}
    n = min(sample, len(files))
    pick = [files[(i * len(files)) // n] for i in range(n)]
    buf = io.BytesIO()
    hot = 0
    t0 = time.process_time()
    w = compressor(level, threads).stream_writer(buf, closefd=False)
    with tarfile.open(fileobj=w, mode="w|", format=tarfile.PAX_FORMAT) as t:
        for u, p in pick:
            member, _enc, data, raw = _member_of(p, u.base, u.kind == "recordings")
            hot += len(data)
            ti = tarfile.TarInfo(member)
            ti.size = len(raw)
            t.addfile(ti, io.BytesIO(raw))
    w.flush(fio.need_zstd().FLUSH_FRAME)
    packed = len(buf.getvalue())
    ratio = hot / packed if packed else None
    total = sum(u.hot_bytes for u in units)
    return {"sampled": n, "sampleHotBytes": hot, "samplePackedBytes": packed, "ratio": round(ratio, 3) if ratio else None,
            "expectedArchiveBytes": int(total / ratio) if ratio else None,
            "cpuSecondsPerFile": round((time.process_time() - t0) / n, 3)}


# ---------------------------------------------------------------- restore

def restore_night(root: str, night: int, *, archive_root: Optional[str] = None, units: Optional[list[str]] = None,
                  from_mirror: bool = False, as_: str = "original", say=print) -> dict[str, Any]:
    root = os.path.abspath(root)
    man = load_manifest(root, night)
    if man is None and archive_root:
        p = os.path.join(archive_root, f"night-{night}", "manifest.json")
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                man = json.load(f)
    if man is None:
        raise FileNotFoundError(f"no cold manifest for night {night} (hot {_hot_paths(root, night)[0]}"
                                + (f", cold {archive_root}" if archive_root else "") + ")")
    counts = {"written": 0, "present": 0, "conflict": 0, "failed": 0}
    for u in man["units"]:
        if units and u["name"] not in units:
            continue
        src = u["mirrorFile"] if from_mirror else u["file"]
        if not src or not os.path.isfile(src):
            raise FileNotFoundError(f"{u['name']}: {src} is not there -- is the drive mounted?")
        if sha256_file(src) != u["sha256"]:
            raise RuntimeError(f"{src}: SHA-256 is not the archived one; try --from-mirror")
        mf = os.path.join(_hot_paths(root, night)[1], u["name"] + ".members.jsonl")
        if not os.path.isfile(mf):
            mf = os.path.join(os.path.dirname(src), u["name"] + ".members.jsonl")
        recs = {r["member"]: r for r in _read_members(mf)}
        base = u.get("base") or (root if u["kind"] == "recordings" else os.path.dirname(root))
        for name, raw in read_members(src):
            r = recs[name]
            path, data = _restored(r, raw, as_)
            dest = os.path.join(base, path)
            if os.path.exists(dest):
                same = _raw_sha(dest, r["enc"]) == r["rawSha256"]
                counts["present" if same else "conflict"] += 1
                if not same:
                    say(f"  {dest}: exists and differs: left as it is")
                continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest + ".tmp", "wb") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            os.utime(dest + ".tmp", (r["mtime"], r["mtime"]))
            if _raw_sha(dest + ".tmp", r["enc"], forced=dest) != r["rawSha256"]:
                os.unlink(dest + ".tmp")
                counts["failed"] += 1
                say(f"  {dest}: FAILED to verify")
                continue
            os.replace(dest + ".tmp", dest)
            counts["written"] += 1
        u["restoredAt"] = _now()
        say(f"  {u['name']}: restored from {src}")
    hot_json = _hot_paths(root, night)[0]
    if os.path.isdir(os.path.dirname(hot_json)):
        with open(hot_json + ".tmp", "w", encoding="utf-8") as f:
            json.dump(man, f, indent=1, sort_keys=True)
            f.write("\n")
        os.replace(hot_json + ".tmp", hot_json)
    say(f"restore night {night}: {counts['written']} written, {counts['present']} already there, "
        f"{counts['conflict']} conflicting (left), {counts['failed']} failed")
    return counts


def _restored(r: dict[str, Any], raw: bytes, as_: str) -> tuple[str, bytes]:
    if r["enc"] == "asis":
        return r["path"], raw
    stem = r["member"]   # X.jsonl
    enc = r["enc"] if as_ == "original" else as_
    if enc == "gz":
        return stem + ".gz", gzip.compress(raw, compresslevel=6, mtime=0)
    if enc == "zst":
        return stem + ".zst", fio.need_zstd().ZstdCompressor(level=19, write_checksum=True).compress(raw)
    return stem, raw


def _raw_sha(path: str, enc: str, forced: Optional[str] = None) -> str:
    """SHA-256 of a file's content as a member holds it (decompressed by the name it has or will have, unless as-is)."""
    name = forced or path
    with open(path, "rb") as f:
        data = f.read()
    if enc == "asis":
        return hashlib.sha256(data).hexdigest()
    try:
        if name.endswith(".jsonl.gz"):
            data = gzip.decompress(data)
        elif name.endswith(".jsonl.zst"):
            data = fio.zstd_decompress(data)
    except Exception:  # noqa: BLE001 - an as-is member (a cut-short gzip) is compared byte for byte
        pass
    return hashlib.sha256(data).hexdigest()

