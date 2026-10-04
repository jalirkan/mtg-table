#!/usr/bin/env python3
# mtg-table — tools/lab: the lab warehouse, a queryable Parquet + DuckDB copy of what the lab writes.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The lab warehouse (D363): everything the cube lab, the ladder and tools/ml write, as
Parquet tables under var/warehouse/ and a DuckDB file of views over them.

    python3 tools/lab/warehouse.py ingest [--root var/cubelab/queue] [--runs var/cubelab/runs] --out var/warehouse
    python3 tools/lab/warehouse.py sql    [--out var/warehouse]       # (re)writes var/warehouse/lab.duckdb: views only
    python3 tools/lab/warehouse.py verify [--out var/warehouse]       # row counts against the JSONL, table sizes (JSON)
    duckdb var/warehouse/lab.duckdb       # or duckdb.connect("var/warehouse/lab.duckdb", read_only=True) in pandas

THE RAW DATA STAYS AS IT IS.  The queue's `<root>/<normal|bridge>/<key>/drafts.jsonl`, the run
folders' `drafts.jsonl` / `run.json`, the recordings `games/<seed>/g<n>-seat<k>.jsonl.gz`, the
ladder's `sprt.jsonl`, the ML and gate reports are never written.  The warehouse is derived:
delete var/warehouse/ (or `ingest --rebuild`) and it is built again from them.

INCREMENTAL AND IDEMPOTENT.  `_state.json` remembers, per drafts.jsonl, the byte offset read so
far with the file's inode, size, mtime and a hash of its first 4 KiB.  A run reads only the
complete lines appended since (a line still being written is left for next time), so it is safe
beside a running queue night.  A file that shrank, was replaced (another inode) or rewritten
(another head), or vanished is RESET: its rows are removed from every table (each row carries
`src_file`) and it is read again from the start.  Rows of one ingest go to part files named by
the ingest's run id, written as `.tmp` and renamed; the run id is committed to `_state.json`
last, and a part file of a run that never committed is deleted at the next start, so a killed
ingest leaves nothing behind.  `--checkpoint-mb` commits every so many MB of JSONL.

THE TABLES (docs/guides/lab-warehouse.md has every column):

    drafts      one row per drafts.jsonl line     <table>/source=<queue|runs>/night=<N>/part-<run>.parquet
    games       one row per game                  (night 0: not a queue night -- a run folder,
    decks       one row per drafter (the played deck)      or a queue seed no night plan lists)
    deck_cards  one row per card line of a played deck
    picks       one row per pick decision (seen and took as lists)
    cards, cube_cards, runs, versions, nights, sprt, experiments, gate_reports, ml_reports,
    matchup_power   small tables, rewritten whole on every ingest: <table>/<table>.parquet

`draft_id` is `<source>/<key>#<seed>` (`queue/normal/synergy#101`, `runs/explore#102`): stable
across ingests and rebuilds.  Exploring drafts (D358) are marked (`explore`), never dropped: win
rates should leave them out (`where not explore`), as the lab's own readers do.

Memory is bounded: lines are streamed, and each table's rows are written in row groups of
`--batch-rows`.  zstd, dictionary-encoded strings.  Needs pyarrow (ingest) and duckdb (sql,
verify); the line flattening is standard library and importable without them.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import re
import resource
import shutil
import sys
import time
import unicodedata
from typing import Any, Dict, Iterator, List, Optional, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

STATE_VERSION = 1
HEAD_BYTES = 4096
INCREMENTAL = ("drafts", "games", "decks", "deck_cards", "picks")
SMALL = ("cards", "cube_cards", "runs", "versions", "nights", "sprt", "experiments", "gate_reports", "ml_reports",
         "matchup_power")
# tools/ml's report files kept whole in ml_reports (matchup.py's balance.json, dataset.py's stats.json, ...);
# any other *.json under --ml whose first 4 KiB name a "gate" is read as a gate report (D354).
REPORT_NAMES = ("balance.json", "stats.json", "summary.json", "report.json")
PART_RE = re.compile(r"^part-(?P<run>[0-9A-Za-z_-]+)\.parquet$")


def require(*mods: str) -> None:
    """A clear message instead of an ImportError deep inside a run."""
    missing = []
    for m in mods:
        try:
            __import__(m)
        except ImportError:
            missing.append(m)
    if missing:
        raise SystemExit(f"warehouse: needs {', '.join(missing)} (pip install --user duckdb pyarrow pandas)")


# ---------------------------------------------------------------- names and ids

def norm_name(name: str) -> str:
    """tools/card-library/model.ts's normName: the card id, one per card across cubes."""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(ch for ch in s if not ("̀" <= ch <= "ͯ"))
    s = s.lower()
    s = re.sub(r"\s*//\s*", " // ", s)
    s = re.sub(r"['’.]", "", s)
    s = re.sub(r"[^a-z0-9/ ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def cube_id(file: str) -> str:
    """`cubes/fair-fight-cube-180.md` -> `fair-fight` (bridge.ts's cubeId, matchup_data.cube_id)."""
    if file.startswith("bridge:"):
        return file
    b = re.sub(r"\.md$", "", os.path.basename(file))
    return re.sub(r"-cube(-\d+)?$", "", b)


def draft_id(source: str, key: str, seed: Any) -> str:
    return f"{source}/{key}#{seed}"


def rel(path: str) -> str:
    """A path as rows store it: relative to the repo when under it, else absolute."""
    p = os.path.abspath(path)
    return os.path.relpath(p, REPO) if p.startswith(REPO + os.sep) else p


# ---------------------------------------------------------------- where the data is

class Source:
    """One drafts.jsonl: a queue key folder or a run folder."""

    def __init__(self, source: str, key: str, folder: str, meta: Dict[str, Any]):
        self.source, self.key, self.folder, self.meta = source, key, folder, meta
        self.path = os.path.join(folder, "drafts.jsonl")
        self.src = rel(self.path)
        bridge = meta.get("bridge")
        if source == "queue":
            kind, _, ident = key.partition("/")
            self.kind = kind if kind in ("normal", "bridge") else "normal"
            self.cube = f"bridge:{ident}" if self.kind == "bridge" else ident
        else:
            self.kind = "bridge" if bridge else "normal"
            cf = meta.get("cubeFile") or ""
            self.cube = cube_id(cf) if cf else os.path.basename(folder)
            if bridge and not self.cube.startswith("bridge:"):
                self.cube = "bridge:" + "+".join(s.get("id", "?") for s in bridge.get("sources", []))


def read_json(path: str) -> Optional[Any]:
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def find_sources(root: Optional[str], runs: Optional[str]) -> List[Source]:
    out: List[Source] = []
    if root and os.path.isdir(root):
        for f in sorted(glob.glob(os.path.join(root, "*", "*", "drafts.jsonl"))):
            folder = os.path.dirname(f)
            key = os.path.relpath(folder, root).replace(os.sep, "/")
            out.append(Source("queue", key, folder, read_json(os.path.join(folder, "run.json")) or {}))
    if runs and os.path.isdir(runs):
        found = []
        for dirpath, dirnames, filenames in os.walk(runs):
            dirnames[:] = sorted(d for d in dirnames if d not in ("decks", "logs", "frames", "games", "homes", "dataset"))
            if "drafts.jsonl" in filenames:
                found.append(dirpath)
        for folder in sorted(found):
            key = os.path.relpath(folder, runs).replace(os.sep, "/")
            if key == ".":
                key = os.path.basename(os.path.abspath(folder))
            out.append(Source("runs", key, folder, read_json(os.path.join(folder, "run.json")) or {}))
    return out


def night_plans(root: Optional[str]) -> List[Tuple[int, str, Dict[str, Any]]]:
    if not root or not os.path.isdir(root):
        return []
    plans = []
    for f in sorted(glob.glob(os.path.join(root, "night-*.json"))):
        m = re.search(r"night-(\d+)\.json$", f)
        doc = read_json(f)
        if m and isinstance(doc, dict):
            plans.append((int(m.group(1)), f, doc))
    return plans


class NightMap:
    """(queue key, seed) -> the night whose plan handed the seed out (queue.ts's chunks)."""

    def __init__(self, plans: List[Tuple[int, str, Dict[str, Any]]]):
        self.ranges: Dict[str, List[Tuple[int, int, int]]] = {}
        for night, _, doc in plans:
            for c in doc.get("chunks") or []:
                try:
                    s, n = int(c["seed"]), int(c["drafts"])
                except (KeyError, TypeError, ValueError):
                    continue
                self.ranges.setdefault(str(c.get("key")), []).append((s, s + n, night))

    def night(self, key: str, seed: Any) -> int:
        try:
            s = int(seed)
        except (TypeError, ValueError):
            return 0
        for lo, hi, night in self.ranges.get(key, ()):
            if lo <= s < hi:
                return night
        return 0


# ---------------------------------------------------------------- one line -> rows

def played_main(dr: Dict[str, Any]) -> Tuple[List[Tuple[int, str]], Optional[str]]:
    """The deck that played (report.ts's playedDeck, matchup_data.played_main) and its colours."""
    if dr.get("played") != "forge" and dr.get("deck"):
        d = dr["deck"]
        return [(int(n), str(c)) for n, c in d.get("main") or []], d.get("colors")
    f = dr.get("forge") or {}
    return [(int(n), str(c)) for n, c in f.get("main") or []], f.get("colors")


def _int(x: Any) -> Optional[int]:
    try:
        return None if x is None or isinstance(x, bool) else int(x)
    except (TypeError, ValueError):
        return None


def _float(x: Any) -> Optional[float]:
    try:
        return None if x is None or isinstance(x, bool) else float(x)
    except (TypeError, ValueError):
        return None


def _str(x: Any) -> Optional[str]:
    return None if x is None else str(x)


def _ts(x: Any) -> Optional[Any]:
    """An ISO time (`2026-10-03T12:52:00.000Z`) as a naive UTC datetime, else None."""
    import datetime as dt
    if not isinstance(x, str) or not x:
        return None
    try:
        t = dt.datetime.fromisoformat(x.replace("Z", "+00:00"))
    except ValueError:
        return None
    return t.astimezone(dt.timezone.utc).replace(tzinfo=None) if t.tzinfo else t


def _mtime(path: str) -> Any:
    import datetime as dt
    return dt.datetime.fromtimestamp(os.path.getmtime(path), tz=dt.timezone.utc).replace(tzinfo=None)


def flatten(rec: Dict[str, Any], src: Source, night: int, line_no: int, nbytes: int) -> Dict[str, List[Dict[str, Any]]]:
    """One drafts.jsonl line -> its rows of the five incremental tables (no source/night: those are the partition)."""
    seed = rec.get("seed")
    did = draft_id(src.source, src.key, seed)
    ver = rec.get("ver") or "unversioned"
    pe = rec.get("playExplore") or None
    explore = pe is not None
    match = rec.get("match") or {}
    gl = match.get("games") or []
    ms = rec.get("ms") or {}
    profiles = rec.get("profiles") or src.meta.get("profiles") or [None, None]
    bridge = rec.get("bridge") or {}
    common = {"draft_id": did, "src_file": src.src, "cube": src.cube}
    drafts = [{
        **common, "key": src.key, "kind": src.kind, "cube_title": _str(rec.get("cube")), "format": _str(rec.get("format")),
        "seed": _int(seed), "ver": ver, "explore": explore,
        "explore_epsilon": _float(pe.get("epsilon")) if pe else None,
        "explore_close_call": _float(pe.get("closeCall")) if pe else None,
        "explore_opening": bool(pe.get("opening")) if pe else None,
        "winner": _str(match.get("winner")), "wins_a": _int(match.get("winsA")), "wins_b": _int(match.get("winsB")),
        "n_games": len(gl), "engine_error": _str(match.get("engineError")), "worker": _int(match.get("worker")),
        "a_opens": rec.get("aOpens") if isinstance(rec.get("aOpens"), bool) else None, "dealt": _int(rec.get("dealt")),
        "profile_a": _str(profiles[0]) if len(profiles) > 0 else None,
        "profile_b": _str(profiles[1]) if len(profiles) > 1 else None,
        "bridge_sources": [str(s) for s in bridge.get("sources") or []] or None,
        "ms_draft": _int(ms.get("draft")), "ms_build": _int(ms.get("build")), "ms_match": _int(ms.get("match")),
        "line_no": line_no, "json_bytes": nbytes,
    }]
    games = []
    for g in gl:
        r = g.get("recorded") or None
        x = g.get("playExplore") or None
        rec_dir = rel(os.path.join(src.folder, r["dir"])) if r and r.get("dir") else None
        games.append({
            **common, "key": src.key, "seed": _int(seed), "ver": ver, "explore": explore,
            "game": _int(g.get("n")), "on_play": _str(g.get("onPlay")), "on_play_verified": _str(g.get("onPlayVerified")),
            "winner": _str(g.get("winner")), "turns": _int(g.get("turns")), "ms": _int(g.get("ms")),
            "timeout": bool(g.get("timeout")), "reason": _str(g.get("reason")), "error": _str(g.get("error")),
            "cpu_ms": _int(g.get("cpuMs")), "game_cpu_ms": _int(g.get("gameCpuMs")),
            "recorded": r is not None, "rec_dir": rec_dir,
            "rec_bytes": _int(r.get("bytes")) if r else None, "rec_frames": _int(r.get("frames")) if r else None,
            "rec_errors": _int(r.get("errors")) if r else None, "decisions": _int(r.get("decisions")) if r else None,
            "decision_errors": _int(r.get("decisionErrors")) if r else None,
            "explore_randomised": _int(x.get("decisionsRandomised")) if x else None,
            "explore_changed": _int(x.get("changed")) if x else None,
            "explore_close_calls": _int(x.get("closeCalls")) if x else None,
            "explore_close_calls_changed": _int(x.get("closeCallsChanged")) if x else None,
            "explore_coins": _int(x.get("coins")) if x else None,
            "explore_failures": _int(x.get("failures")) if x else None,
            "explore_by_kind": json.dumps(x.get("byKind"), sort_keys=True) if x and x.get("byKind") is not None else None,
            "explore_on_play_drawn": _str(x.get("onPlayDrawn")) if x else None,
        })
    frm: Dict[str, str] = {}
    for cid, names in (bridge.get("from") or {}).items():
        for n in names:
            frm.setdefault(n, cid)
    decks, cards, picks = [], [], []
    for dr in rec.get("drafters") or []:
        seat = _str(dr.get("seat"))
        main, colors = played_main(dr)
        d = dr.get("deck") or {}
        f = dr.get("forge") or {}
        decks.append({
            **common, "seat": seat, "played": _str(dr.get("played")), "colors": _str(colors),
            "splash": _str(d.get("splash")) if dr.get("played") != "forge" else None,
            "n_cards": sum(n for n, _ in main), "lands": _int(d.get("lands") if dr.get("played") != "forge" else f.get("lands")),
            "spells": _int(d.get("spells") if dr.get("played") != "forge" else f.get("spells")),
            "creatures": _int(d.get("creatures")), "avg_cmc": _float(d.get("avgCmc")), "score": _float(d.get("score")),
            "stretched": d.get("stretched") if isinstance(d.get("stretched"), bool) else None,
            "deck_errors": len(dr.get("deckErrors") or []), "forge_colors": _str(f.get("colors")),
            "forge_value": _float(f.get("value")), "n_picks": len(dr.get("picks") or []), "pool_size": len(dr.get("pool") or []),
        })
        for n, name in main:
            cards.append({**common, "seat": seat, "card": name, "card_id": norm_name(name), "count": n,
                          "colors": _str(colors), "from_cube": frm.get(name) or (None if src.kind == "bridge" else src.cube)})
        for p in dr.get("picks") or []:
            picks.append({**common, "seat": seat, "n": _int(p.get("n")), "kind": _str(p.get("kind")), "at": _int(p.get("at")),
                          "how": _str(p.get("how")), "value": _float(p.get("value")),
                          "seen": [str(s) for s in p.get("seen") or []], "took": [str(s) for s in p.get("took") or []]})
    return {"drafts": drafts, "games": games, "decks": decks, "deck_cards": cards, "picks": picks}


# ---------------------------------------------------------------- reading only what is new

def head_hash(path: str, upto: int) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha1(fh.read(min(upto, HEAD_BYTES))).hexdigest()


def file_status(path: str, st: Optional[Dict[str, Any]]) -> str:
    """`new`, `same` (nothing appended), `grown` or `reset` (shrunk, replaced, rewritten, gone)."""
    if not os.path.exists(path):
        return "reset" if st else "gone"
    if st is None:
        return "new"
    f = os.stat(path)
    if f.st_ino != st["ino"] or f.st_dev != st["dev"] or f.st_size < st["offset"]:
        return "reset"
    if st["offset"] and head_hash(path, st["offset"]) != st["head"]:
        return "reset"
    # by the offset, never the size recorded: a line appended while the last run read stays unread until now
    return "grown" if f.st_size > st["offset"] else "same"


def complete_lines(path: str, offset: int, limit: Optional[int] = None) -> Iterator[Tuple[bytes, int]]:
    """(line, end offset) for each complete line after `offset` (a last line without its newline is left)."""
    with open(path, "rb") as fh:
        fh.seek(offset)
        pos = offset
        for raw in fh:
            if not raw.endswith(b"\n"):
                return
            pos += len(raw)
            yield raw, pos
            if limit is not None and pos >= limit:
                return


def new_file_state(path: str) -> Dict[str, Any]:
    f = os.stat(path)
    return {"ino": f.st_ino, "dev": f.st_dev, "size": 0, "mtime_ns": 0, "offset": 0, "lines": 0, "bad": 0, "head": ""}


# ---------------------------------------------------------------- schemas (pyarrow)

def schemas() -> Dict[str, Any]:
    import pyarrow as pa
    s, i, f, b, L = pa.string(), pa.int64(), pa.float64(), pa.bool_(), pa.list_(pa.string())
    T = pa.timestamp("ms")  # UTC, stored naive: an aware column needs pytz in duckdb's Python client
    common = [("draft_id", s), ("src_file", s), ("cube", s)]
    return {
        "drafts": common + [("key", s), ("kind", s), ("cube_title", s), ("format", s), ("seed", i), ("ver", s), ("explore", b),
                            ("explore_epsilon", f), ("explore_close_call", f), ("explore_opening", b), ("winner", s),
                            ("wins_a", i), ("wins_b", i), ("n_games", i), ("engine_error", s), ("worker", i), ("a_opens", b),
                            ("dealt", i), ("profile_a", s), ("profile_b", s), ("bridge_sources", L), ("ms_draft", i),
                            ("ms_build", i), ("ms_match", i), ("line_no", i), ("json_bytes", i)],
        "games": common + [("key", s), ("seed", i), ("ver", s), ("explore", b), ("game", i), ("on_play", s),
                           ("on_play_verified", s), ("winner", s), ("turns", i), ("ms", i), ("timeout", b), ("reason", s),
                           ("error", s), ("cpu_ms", i), ("game_cpu_ms", i), ("recorded", b), ("rec_dir", s), ("rec_bytes", i),
                           ("rec_frames", i), ("rec_errors", i), ("decisions", i), ("decision_errors", i),
                           ("explore_randomised", i), ("explore_changed", i), ("explore_close_calls", i),
                           ("explore_close_calls_changed", i), ("explore_coins", i), ("explore_failures", i),
                           ("explore_by_kind", s), ("explore_on_play_drawn", s)],
        "decks": common + [("seat", s), ("played", s), ("colors", s), ("splash", s), ("n_cards", i), ("lands", i), ("spells", i),
                           ("creatures", i), ("avg_cmc", f), ("score", f), ("stretched", b), ("deck_errors", i),
                           ("forge_colors", s), ("forge_value", f), ("n_picks", i), ("pool_size", i)],
        "deck_cards": common + [("seat", s), ("card", s), ("card_id", s), ("count", i), ("colors", s), ("from_cube", s)],
        "picks": common + [("seat", s), ("n", i), ("kind", s), ("at", i), ("how", s), ("value", f), ("seen", L), ("took", L)],
        "cards": [("card_id", s), ("name", s), ("cubes", L), ("n_cubes", i), ("in_data", b), ("oracle_id", s), ("type_line", s),
                  ("colors", s), ("cmc", f), ("is_land", b), ("ai_flag", s)],
        "cube_cards": [("cube", s), ("card_id", s), ("name", s), ("section", s), ("themes", L), ("roles", L), ("pair", s)],
        "runs": [("source", s), ("key", s), ("folder", s), ("cube", s), ("cube_file", s), ("cube_sha", s), ("format", s),
                 ("games", i), ("profiles", L), ("ratings_file", s), ("record_every", i), ("play_explore", s),
                 ("bridge_sources", L), ("n_versions", i), ("version_changes", i)],
        "versions": [("source", s), ("key", s), ("id", s), ("git_sha", s), ("code_tree", s), ("dirty", b), ("diff_sha", s),
                     ("forge_jar_sha256", s), ("ratings_sha256", s), ("cube_sha", s), ("weights_sha", s), ("node", s),
                     ("since", T), ("first_seed", i), ("allowed_change", s)],
        "nights": [("night", i), ("file", s), ("drafts", i), ("games", i), ("format", s), ("play_explore", s), ("chunks", i),
                   ("keys", L), ("runs", i), ("first_run_at", T), ("last_run_at", T)],
        "sprt": [("file", s), ("ts", T), ("id", s), ("host", s), ("a", s), ("b", s), ("ah", s), ("bh", s), ("elo0", f),
                 ("elo1", f), ("alpha", f), ("beta", f), ("result", s), ("llr", f), ("lower", f), ("upper", f), ("games", i),
                 ("pairs", i), ("score", f), ("purpose", s)],
        "experiments": [("file", s), ("id", s), ("kind", s), ("ts", T), ("host", s), ("cmd", s), ("purpose", s),
                        ("hypothesis", s), ("status", s), ("games", i), ("git_sha", s), ("json", s)],
        "gate_reports": [("path", s), ("gate", s), ("pass", b), ("name", s), ("model", s), ("model_sha12", s), ("mtime", T),
                         ("reasons", s), ("json", s)],
        "ml_reports": [("path", s), ("kind", s), ("mtime", T), ("bytes", i), ("json", s)],
        "matchup_power": [("path", s), ("name", s), ("card_id", s), ("power", f), ("sd_post", f), ("sd_boot", f), ("points", f),
                          ("prior", f), ("games", i), ("land", b), ("ai", s), ("cubes", L)],
    }


def arrow_schema(table: str, with_partition: bool = False) -> Any:
    import pyarrow as pa
    cols = list(schemas()[table])
    if with_partition:
        cols += [("source", pa.string()), ("night", pa.int32())]
    return pa.schema(cols)


def write_small(out: str, table: str, rows: List[Dict[str, Any]]) -> int:
    """A small table, rewritten whole: <out>/<table>/<table>.parquet (tmp + rename)."""
    import pyarrow as pa
    import pyarrow.parquet as pq
    sch = arrow_schema(table)
    d = os.path.join(out, table)
    os.makedirs(d, exist_ok=True)
    t = pa.Table.from_pylist(rows, schema=sch) if rows else sch.empty_table()
    tmp = os.path.join(d, f"{table}.parquet.tmp")
    pq.write_table(t, tmp, compression="zstd", use_dictionary=True)
    os.replace(tmp, os.path.join(d, f"{table}.parquet"))
    return len(rows)


# ---------------------------------------------------------------- partitioned writers

class Sinks:
    """Open Parquet writers for one ingest run, one per (table, source, night), fed in row groups."""

    def __init__(self, out: str, run: str, batch_rows: int):
        self.out, self.run, self.batch = out, run, batch_rows
        self.buf: Dict[Tuple[str, str, int], List[Dict[str, Any]]] = {}
        self.writers: Dict[Tuple[str, str, int], Any] = {}
        self.rows: Dict[str, int] = {t: 0 for t in INCREMENTAL}
        self.sch = {t: arrow_schema(t) for t in INCREMENTAL}

    def path(self, k: Tuple[str, str, int]) -> str:
        t, source, night = k
        return os.path.join(self.out, t, f"source={source}", f"night={night}", f"part-{self.run}.parquet")

    def add(self, table: str, source: str, night: int, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            return
        k = (table, source, night)
        b = self.buf.setdefault(k, [])
        b.extend(rows)
        self.rows[table] += len(rows)
        if len(b) >= self.batch:
            self.flush(k)

    def flush(self, k: Tuple[str, str, int]) -> None:
        import pyarrow as pa
        import pyarrow.parquet as pq
        b = self.buf.get(k)
        if not b:
            return
        t = pa.Table.from_pylist(b, schema=self.sch[k[0]])
        w = self.writers.get(k)
        if w is None:
            p = self.path(k)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            w = pq.ParquetWriter(p + ".tmp", self.sch[k[0]], compression="zstd", use_dictionary=True)
            self.writers[k] = w
        w.write_table(t, row_group_size=len(b))
        self.buf[k] = []

    def close(self) -> List[str]:
        for k in list(self.buf):
            self.flush(k)
        done = []
        for k, w in self.writers.items():
            w.close()
            p = self.path(k)
            os.replace(p + ".tmp", p)
            done.append(p)
        self.buf, self.writers = {}, {}
        return done


# ---------------------------------------------------------------- state

def load_state(out: str) -> Dict[str, Any]:
    st = read_json(os.path.join(out, "_state.json"))
    if not isinstance(st, dict) or st.get("v") != STATE_VERSION:
        return {"v": STATE_VERSION, "runs": [], "files": {}}
    return st


def save_state(out: str, st: Dict[str, Any]) -> None:
    p = os.path.join(out, "_state.json")
    with open(p + ".tmp", "w", encoding="utf-8") as fh:
        json.dump(st, fh, indent=1, sort_keys=True)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(p + ".tmp", p)


def part_files(out: str, table: str) -> List[str]:
    return sorted(glob.glob(os.path.join(out, table, "source=*", "night=*", "*.parquet")))


def clean_uncommitted(out: str, st: Dict[str, Any], say) -> int:
    """Delete .tmp files and part files of runs that never committed (a killed ingest)."""
    ok = set(st.get("runs") or [])
    n = 0
    for t in INCREMENTAL + SMALL:
        for f in glob.glob(os.path.join(out, t, "**", "*.tmp"), recursive=True):
            os.remove(f)
            n += 1
        for f in part_files(out, t):
            m = PART_RE.match(os.path.basename(f))
            if m and m.group("run") not in ok:
                os.remove(f)
                n += 1
    if n:
        say(f"removed {n} file(s) an unfinished ingest left")
    return n


def purge(out: str, src_files: List[str], say) -> Dict[str, int]:
    """Remove every row of these source files from the incremental tables (rewriting only the parts holding some)."""
    import pyarrow.compute as pc
    import pyarrow.parquet as pq
    import pyarrow as pa
    gone = {t: 0 for t in INCREMENTAL}
    if not src_files:
        return gone
    drop = pa.array(src_files, type=pa.string())
    for t in INCREMENTAL:
        for f in part_files(out, t):
            pf = pq.ParquetFile(f)
            col = pf.read(columns=["src_file"]).column("src_file")
            hits = pc.sum(pc.is_in(col, value_set=drop).cast(pa.int64())).as_py() or 0
            if not hits:
                continue
            gone[t] += hits
            if hits == pf.metadata.num_rows:
                os.remove(f)
                continue
            w = pq.ParquetWriter(f + ".tmp", pf.schema_arrow, compression="zstd", use_dictionary=True)
            for i in range(pf.num_row_groups):
                g = pf.read_row_group(i)
                keep = pc.invert(pc.is_in(g.column("src_file"), value_set=drop))
                g = g.filter(keep)
                if g.num_rows:
                    w.write_table(g)
            w.close()
            os.replace(f + ".tmp", f)
    say("reset: removed " + ", ".join(f"{n} {t}" for t, n in gone.items() if n) if any(gone.values()) else "reset: no rows held")
    return gone


# ---------------------------------------------------------------- the small tables

def cube_docs(repo: str, say) -> Dict[str, List[Dict[str, Any]]]:
    """Every committed cube document parsed by the cube lab's own parser (tools/cubelab/cube.ts, under Node)."""
    import subprocess
    js = ("import('./tools/cubelab/cube.ts').then(m=>{const fs=require('fs');const r={};"
          "for(const f of fs.readdirSync('cubes').filter(f=>/-cube-\\d+\\.md$/.test(f)).sort())"
          "r[f]=m.parseCube(fs.readFileSync('cubes/'+f,'utf8')).cards.map(c=>({name:c.name,section:c.section,"
          "themes:c.themes,roles:c.roles,pair:c.pair??null}));console.log(JSON.stringify(r))})")
    try:
        res = subprocess.run(["node", "-e", js], cwd=repo, capture_output=True, text=True, check=True, timeout=120)
        return {cube_id(k): v for k, v in json.loads(res.stdout).items()}
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        say(f"cube documents not parsed (node: {str(e).splitlines()[0] if str(e) else type(e).__name__}); cube_cards is empty")
        return {}


def oracle_ids(db: str, ids: List[str]) -> Dict[str, str]:
    """Scryfall oracle ids from the card library's local index (var/cards/cards.sqlite), if it is there. No network."""
    if not os.path.exists(db):
        return {}
    import sqlite3
    out: Dict[str, str] = {}
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        for i in range(0, len(ids), 500):
            chunk = ids[i:i + 500]
            q = f"select norm_name, oracle_id from card_names where norm_name in ({','.join('?' * len(chunk))})"
            for n, o in con.execute(q, chunk):
                out.setdefault(n, o)
    except sqlite3.Error:
        return {}
    finally:
        con.close()
    return out


def facts_by_name(facts_dir: str) -> Dict[str, Dict[str, Any]]:
    """The engine facts the lab cached (var/cubelab/facts/*.json), by name (matchup_data.load_facts's reading)."""
    out: Dict[str, Dict[str, Any]] = {}
    for f in sorted(glob.glob(os.path.join(facts_dir, "*.json"))):
        doc = read_json(f)
        if not isinstance(doc, dict):
            continue
        for c in doc.get("cards", []):
            if c.get("found"):
                out.setdefault(c.get("name") or c.get("listed"), c)
                if c.get("listed"):
                    out.setdefault(c["listed"], c)
    return out


def doc_ai_flags(repo: str) -> Dict[str, str]:
    """The cube documents' AI notes (tools/ml/matchup_data.doc_ai_flags), read through that module."""
    sys.path.insert(0, os.path.join(repo, "tools", "ml"))
    try:
        import matchup_data  # noqa: E402
        return matchup_data.doc_ai_flags(repo)
    except Exception:  # an older or broken checkout: the flags are a convenience, not a requirement
        return {}
    finally:
        sys.path.pop(0)


def build_cards(out: str, repo: str, facts_dir: str, cards_db: str, say) -> Tuple[int, int]:
    """cube_cards from the cube documents; cards = every card a cube lists or the data names, one id per card."""
    import duckdb
    docs = cube_docs(repo, say)
    cube_rows = []
    names: Dict[str, str] = {}
    cubes_of: Dict[str, set] = {}
    for cube, cards in sorted(docs.items()):
        for c in cards:
            cid = norm_name(c["name"])
            names.setdefault(cid, c["name"])
            cubes_of.setdefault(cid, set()).add(cube)
            cube_rows.append({"cube": cube, "card_id": cid, "name": c["name"], "section": c.get("section"),
                              "themes": list(c.get("themes") or []), "roles": list(c.get("roles") or []), "pair": c.get("pair")})
    write_small(out, "cube_cards", cube_rows)
    seen: Dict[str, str] = {}
    con = duckdb.connect()
    for t, q in (("deck_cards", "select distinct card from read_parquet({g}, union_by_name=true)"),
                 ("picks", "select distinct unnest(took) from read_parquet({g}, union_by_name=true)")):
        files = part_files(out, t)
        if files:
            for (n,) in con.execute(q.format(g=json.dumps(files).replace('"', "'"))).fetchall():
                if n is not None:
                    seen.setdefault(norm_name(n), n)
    con.close()
    for cid, n in seen.items():
        names.setdefault(cid, n)
    facts = facts_by_name(facts_dir)
    flags = doc_ai_flags(repo)
    oid = oracle_ids(cards_db, sorted(names))
    rows = []
    for cid in sorted(names):
        n = names[cid]
        f = facts.get(n) or facts.get(seen.get(cid, "")) or {}
        flag = "All" if f.get("remAIDeck") or flags.get(n) == "All" else ("Random" if f.get("remRandomDeck") or flags.get(n) == "Random" else None)
        typ = f.get("type")
        rows.append({"card_id": cid, "name": n, "cubes": sorted(cubes_of.get(cid, ())), "n_cubes": len(cubes_of.get(cid, ())),
                     "in_data": cid in seen, "oracle_id": oid.get(cid), "type_line": _str(typ),
                     "colors": _str(f.get("colors")) if f else None, "cmc": _float(f.get("cmc")) if f else None,
                     "is_land": (bool(f.get("land")) or ("Land" in (typ or ""))) if f else None, "ai_flag": flag})
    write_small(out, "cards", rows)
    return len(rows), len(cube_rows)


def build_runs(out: str, sources: List[Source]) -> None:
    runs, vers = [], []
    for s in sources:
        m = s.meta
        if not m:
            continue
        vl = m.get("versions") or []
        bridge = m.get("bridge") or {}
        runs.append({"source": s.source, "key": s.key, "folder": rel(s.folder), "cube": s.cube, "cube_file": _str(m.get("cubeFile")),
                     "cube_sha": _str(m.get("cubeSha")), "format": _str(m.get("format")), "games": _int(m.get("games")),
                     "profiles": [str(p) for p in m.get("profiles") or []] or None, "ratings_file": _str(m.get("ratingsFile")),
                     "record_every": _int((m.get("record") or {}).get("every")),
                     "play_explore": json.dumps(m["playExplore"], sort_keys=True) if m.get("playExplore") else None,
                     "bridge_sources": [str(x.get("id")) for x in bridge.get("sources") or []] or None,
                     "n_versions": len(vl), "version_changes": sum(1 for v in vl if v.get("allowedChange"))})
        for v in vl:
            vers.append({"source": s.source, "key": s.key, "id": _str(v.get("id")), "git_sha": _str(v.get("gitSha")),
                         "code_tree": _str(v.get("codeTree")), "dirty": v.get("dirty") if isinstance(v.get("dirty"), bool) else None,
                         "diff_sha": _str(v.get("diffSha")), "forge_jar_sha256": _str(v.get("forgeJarSha256")),
                         "ratings_sha256": _str(v.get("ratingsSha256") if not isinstance(v.get("ratingsSha256"), (dict, list)) else json.dumps(v.get("ratingsSha256"), sort_keys=True)),
                         "cube_sha": _str(v.get("cubeSha")), "weights_sha": _str(v.get("weightsSha")), "node": _str(v.get("node")),
                         "since": _ts(v.get("since")), "first_seed": _int(v.get("firstSeed")),
                         "allowed_change": json.dumps(v["allowedChange"], sort_keys=True) if v.get("allowedChange") else None})
    write_small(out, "runs", runs)
    write_small(out, "versions", vers)


def build_nights(out: str, plans: List[Tuple[int, str, Dict[str, Any]]]) -> None:
    rows = []
    for night, f, d in plans:
        r = d.get("runs") or []
        rows.append({"night": night, "file": rel(f), "drafts": _int(d.get("drafts")), "games": _int(d.get("games")),
                     "format": _str(d.get("format")),
                     "play_explore": json.dumps(d["playExplore"], sort_keys=True) if d.get("playExplore") else None,
                     "chunks": len(d.get("chunks") or []), "keys": sorted({str(c.get("key")) for c in d.get("chunks") or []}),
                     "runs": len(r), "first_run_at": _ts(r[0].get("at")) if r else None, "last_run_at": _ts(r[-1].get("at")) if r else None})
    write_small(out, "nights", rows)


def jsonl(path: str) -> Iterator[Dict[str, Any]]:
    try:
        with open(path, "rb") as fh:
            for raw in fh:
                if not raw.endswith(b"\n"):
                    return
                try:
                    o = json.loads(raw)
                except ValueError:
                    continue
                if isinstance(o, dict):
                    yield o
    except OSError:
        return


def build_results(out: str, ladder: List[str], experiments: str, ml: str) -> Dict[str, int]:
    """The jobs' results: the ladder's SPRT lines, the experiment log, the gate reports, the ML reports, matchup power."""
    sprt = []
    for d in ladder:
        for f in sorted(glob.glob(os.path.join(d, "sprt.jsonl"))):
            for o in jsonl(f):
                sprt.append({"file": rel(f), "ts": _ts(o.get("at")), **{k: _str(o.get(k)) for k in ("id", "host", "a", "b", "ah", "bh", "result", "purpose")},
                             **{k: _float(o.get(k)) for k in ("elo0", "elo1", "alpha", "beta", "llr", "lower", "upper", "score")},
                             "games": _int(o.get("games")), "pairs": _int(o.get("pairs"))})
    exps = []
    if experiments and os.path.exists(experiments):
        for o in jsonl(experiments):
            git = o.get("git") or {}
            exps.append({"file": rel(experiments), "id": _str(o.get("id")), "kind": _str(o.get("kind")), "ts": _ts(o.get("at")),
                         "host": _str(o.get("host")), "cmd": _str(o.get("cmd")), "purpose": _str(o.get("purpose")),
                         "hypothesis": _str(o.get("hypothesis")), "status": _str(o.get("status")), "games": _int(o.get("games")),
                         "git_sha": _str(git.get("sha")) if isinstance(git, dict) else None, "json": json.dumps(o, sort_keys=True)})
    gates, reports, power = [], [], []
    if ml and os.path.isdir(ml):
        for f in sorted(glob.glob(os.path.join(ml, "**", "*.json"), recursive=True)):
            if os.path.getsize(f) > 8 << 20:
                continue
            base = os.path.basename(f)
            mtime = _mtime(f)
            with open(f, "rb") as fh:
                is_gate = b'"gate"' in fh.read(4096)
            if is_gate or base in REPORT_NAMES:
                o = read_json(f)
                if isinstance(o, dict) and o.get("gate") in ("fit", "regret", "sprt"):
                    slim = {k: v for k, v in o.items() if k != "rows"}
                    gates.append({"path": rel(f), "gate": o["gate"], "pass": bool(o.get("pass")), "name": _str(o.get("name")),
                                  "model": _str(o.get("model")), "model_sha12": _str(o.get("modelSha12")), "mtime": mtime,
                                  "reasons": json.dumps(o.get("reasons")) if o.get("reasons") is not None else None,
                                  "json": json.dumps(slim, sort_keys=True)})
                elif isinstance(o, dict):
                    reports.append({"path": rel(f), "kind": base[:-5], "mtime": mtime, "bytes": os.path.getsize(f),
                                    "json": json.dumps(o, sort_keys=True)})
        for f in sorted(glob.glob(os.path.join(ml, "**", "power.tsv"), recursive=True)):
            with open(f, encoding="utf-8") as fh:
                head = None
                for line in fh:
                    if line.startswith("#") or not line.strip():
                        continue
                    cols = line.rstrip("\n").split("\t")
                    if head is None:
                        head = cols
                        continue
                    r = dict(zip(head, cols))
                    power.append({"path": rel(os.path.dirname(f)), "name": r.get("name"), "card_id": norm_name(r.get("name") or ""),
                                  "power": _float(r.get("power")), "sd_post": _float(r.get("sdPost")),
                                  "sd_boot": _float(r.get("sdBoot")) if r.get("sdBoot") not in (None, "nan") else None,
                                  "points": _float(r.get("points")), "prior": _float(r.get("prior")), "games": _int(r.get("games")),
                                  "land": r.get("land") == "1", "ai": r.get("ai") or None,
                                  "cubes": [c for c in (r.get("cubes") or "").split(",") if c]})
    return {"sprt": write_small(out, "sprt", sprt), "experiments": write_small(out, "experiments", exps),
            "gate_reports": write_small(out, "gate_reports", gates), "ml_reports": write_small(out, "ml_reports", reports),
            "matchup_power": write_small(out, "matchup_power", power)}


# ---------------------------------------------------------------- ingest

def peak_mb() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


class Lock:
    def __init__(self, out: str):
        import fcntl
        os.makedirs(out, exist_ok=True)
        self.fh = open(os.path.join(out, ".lock"), "w")
        try:
            fcntl.flock(self.fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise SystemExit(f"warehouse: another ingest holds {out}/.lock")

    def release(self) -> None:
        self.fh.close()


def ingest(a: argparse.Namespace, say=print) -> Dict[str, Any]:
    require("pyarrow", "duckdb")
    out = os.path.abspath(a.out)
    t0 = time.time()
    lock = Lock(out)
    try:
        if a.rebuild:
            for t in INCREMENTAL + SMALL + ("_schema",):
                shutil.rmtree(os.path.join(out, t), ignore_errors=True)
            for f in ("_state.json", "lab.duckdb"):
                if os.path.exists(os.path.join(out, f)):
                    os.remove(os.path.join(out, f))
            say(f"rebuild: {out} cleared")
        st = load_state(out)
        clean_uncommitted(out, st, say)
        sources = find_sources(a.root, a.runs)
        plans = night_plans(a.root)
        nights = NightMap(plans)
        # 1. what changed; resets first (rows removed, offsets back to 0), committed before any new row is written
        status = {s.src: file_status(s.path, st["files"].get(s.src)) for s in sources}
        live = {s.src for s in sources}
        resets = [k for k, v in status.items() if v == "reset"] + [k for k in st["files"] if k not in live]
        if resets:
            say(f"reset {len(resets)} file(s): " + ", ".join(resets[:5]) + (" ..." if len(resets) > 5 else ""))
            purge(out, resets, say)
            for k in resets:
                st["files"].pop(k, None)
            save_state(out, st)
        # 2. read what is new, checkpointing every --checkpoint-mb
        # unique per ingest (two in one second, one process -- a test -- must not share part files)
        stamp = time.strftime("%Y%m%dT%H%M%S") + f"-{os.getpid()}-{time.time_ns() % 10**9:09d}"
        cp = [0]
        sinks: List[Sinks] = []

        def new_sinks() -> Sinks:
            cp[0] += 1
            s = Sinks(out, f"{stamp}-c{cp[0]}", a.batch_rows)
            sinks.append(s)
            return s

        def commit(s: Sinks) -> None:
            if s.close():
                st["runs"].append(s.run)
            save_state(out, st)

        sink = new_sinks()
        since_cp = 0
        totals = {"lines": 0, "bytes": 0, "bad": 0, "files_read": 0}
        for s in sources:
            if status[s.src] in ("same", "gone"):
                continue
            fs = st["files"].get(s.src) or new_file_state(s.path)
            fs["source"] = s.source
            st["files"][s.src] = fs
            totals["files_read"] += 1
            for raw, end in complete_lines(s.path, fs["offset"]):
                nb = len(raw)
                fs["lines"] += 1
                try:
                    rec = json.loads(raw)
                    if not isinstance(rec, dict):
                        raise ValueError("not an object")
                except ValueError:
                    fs["bad"] += 1
                    totals["bad"] += 1
                    fs["offset"] = end
                    continue
                night = nights.night(s.key, rec.get("seed")) if s.source == "queue" else 0
                for t, rows in flatten(rec, s, night, fs["lines"], nb).items():
                    sink.add(t, s.source, night, rows)
                fs["offset"] = end
                totals["lines"] += 1
                totals["bytes"] += nb
                since_cp += nb
                if since_cp >= a.checkpoint_mb * 1e6:
                    _seal(fs, s.path)
                    commit(sink)
                    say(f"checkpoint: {totals['lines']} lines, {totals['bytes'] / 1e6:.0f} MB, peak {peak_mb():.0f} MB")
                    sink = new_sinks()
                    since_cp = 0
            _seal(fs, s.path)
        commit(sink)
        rows = {t: sum(x.rows[t] for x in sinks) for t in INCREMENTAL}
        # 3. the small tables, the empty-table schemas, the views
        build_runs(out, sources)
        build_nights(out, plans)
        res = build_results(out, a.ladder, a.experiments, a.ml)
        n_cards, n_cube_cards = build_cards(out, REPO, a.facts, a.cards_db, say)
        write_schemas(out)
        make_views(out)
        rep = {"sources": len(sources), "filesRead": totals["files_read"], "resets": len(resets), "lines": totals["lines"],
               "badLines": totals["bad"], "jsonlMB": round(totals["bytes"] / 1e6, 1), "rowsAdded": rows,
               "cards": n_cards, "cubeCards": n_cube_cards, "results": res, "seconds": round(time.time() - t0, 1),
               "peakMB": round(peak_mb(), 0)}
        say(json.dumps(rep))
        if getattr(a, "report", None):
            with open(a.report, "w", encoding="utf-8") as fh:
                json.dump(rep, fh, indent=1)
        return rep
    finally:
        lock.release()


def _seal(fs: Dict[str, Any], path: str) -> None:
    """Record the file's identity at the offset read (size and mtime say whether anything was appended since)."""
    f = os.stat(path)
    fs.update({"ino": f.st_ino, "dev": f.st_dev, "size": f.st_size, "mtime_ns": f.st_mtime_ns,
               "head": head_hash(path, fs["offset"]) if fs["offset"] else ""})


def write_schemas(out: str) -> None:
    """_schema/<table>.parquet: an empty file with the table's columns, the view of a table with no part files yet."""
    import pyarrow.parquet as pq
    d = os.path.join(out, "_schema")
    os.makedirs(d, exist_ok=True)
    for t in INCREMENTAL:
        p = os.path.join(d, f"{t}.parquet")
        pq.write_table(arrow_schema(t, with_partition=True).empty_table(), p + ".tmp")
        os.replace(p + ".tmp", p)


# ---------------------------------------------------------------- views

EXTRA_VIEWS = {
    # one row per (game, seat): who played what, and whether it won -- the join every win rate starts from
    "seat_games": """
        select g.draft_id, g.source, g.night, g.cube, g.key, g.seed, g.ver, g.explore, g.game, d.seat,
               d.colors, d.played, g.on_play = d.seat as on_play, g.winner in ('A', 'B') as decisive,
               g.winner = d.seat as won, g.turns, g.timeout, g.error is not null as errored
        from games g join decks d using (draft_id)""",
}


def view_sql(out: str, table: str) -> str:
    q = lambda p: "'" + p.replace("'", "''") + "'"
    if table in INCREMENTAL:
        if part_files(out, table):
            g = os.path.join(out, table, "source=*", "night=*", "*.parquet")
            return (f"select * from read_parquet({q(g)}, hive_partitioning = true, union_by_name = true, "
                    f"hive_types = {{'source': VARCHAR, 'night': INTEGER}})")
        return f"select * from read_parquet({q(os.path.join(out, '_schema', table + '.parquet'))})"
    return f"select * from read_parquet({q(os.path.join(out, table, table + '.parquet'))})"


def make_views(out: str) -> str:
    """lab.duckdb holding only views over the Parquet (absolute paths), written to a tmp file and renamed."""
    require("duckdb")
    import duckdb
    out = os.path.abspath(out)
    p = os.path.join(out, "lab.duckdb")
    tmp = p + ".tmp"
    for f in (tmp, tmp + ".wal"):
        if os.path.exists(f):
            os.remove(f)
    con = duckdb.connect(tmp)
    try:
        for t in INCREMENTAL + SMALL:
            if t in SMALL and not os.path.exists(os.path.join(out, t, f"{t}.parquet")):
                continue
            con.execute(f"create or replace view {t} as {view_sql(out, t)}")
        for name, sql in EXTRA_VIEWS.items():
            con.execute(f"create or replace view {name} as {sql}")
        con.execute("checkpoint")
    finally:
        con.close()
    os.replace(tmp, p)
    return p


# ---------------------------------------------------------------- verify

def verify(out: str) -> Dict[str, Any]:
    """Every table's rows against the JSONL, counted independently up to each file's committed offset; sizes."""
    require("duckdb")
    import duckdb
    out = os.path.abspath(out)
    st = load_state(out)
    exp = {t: 0 for t in INCREMENTAL}
    exp_by_file: Dict[str, Dict[str, int]] = {}
    lines = pending = bad = jbytes = 0
    by_source: Dict[str, Dict[str, int]] = {}
    for src, fs in sorted(st["files"].items()):
        bs = by_source.setdefault(fs.get("source", "unknown"), {"files": 0, "lines": 0, "pending": 0, "bad": 0})
        bs["files"] += 1
        before = (lines, pending, bad)
        path = src if os.path.isabs(src) else os.path.join(REPO, src)
        c = {t: 0 for t in INCREMENTAL}
        if not os.path.exists(path):
            continue
        with open(path, "rb") as fh:
            pos = 0
            for raw in fh:
                if not raw.endswith(b"\n"):
                    break
                if pos >= fs["offset"]:
                    pending += 1
                    pos += len(raw)
                    continue
                pos += len(raw)
                lines += 1
                jbytes += len(raw)
                try:
                    rec = json.loads(raw)
                    assert isinstance(rec, dict)
                except (ValueError, AssertionError):
                    bad += 1
                    continue
                c["drafts"] += 1
                c["games"] += len((rec.get("match") or {}).get("games") or [])
                drs = rec.get("drafters") or []
                c["decks"] += len(drs)
                c["deck_cards"] += sum(len(played_main(d)[0]) for d in drs)
                c["picks"] += sum(len(d.get("picks") or []) for d in drs)
        exp_by_file[src] = c
        bs["lines"] += lines - before[0]
        bs["pending"] += pending - before[1]
        bs["bad"] += bad - before[2]
        for t in INCREMENTAL:
            exp[t] += c[t]
    con = duckdb.connect()
    tables: Dict[str, Any] = {}
    ok = True
    for t in INCREMENTAL + SMALL:
        files = part_files(out, t) if t in INCREMENTAL else glob.glob(os.path.join(out, t, f"{t}.parquet"))
        nbytes = sum(os.path.getsize(f) for f in files)
        if t in INCREMENTAL:
            got: Dict[str, int] = {}
            if files:
                g = os.path.join(out, t, "source=*", "night=*", "*.parquet").replace("'", "''")
                got = dict(con.execute(f"select src_file, count(*) from read_parquet('{g}', union_by_name=true) group by 1").fetchall())
            rows = sum(got.values())
            mism = sorted(k for k in set(got) | set(exp_by_file) if got.get(k, 0) != exp_by_file.get(k, {}).get(t, 0))
            ok = ok and not mism
            tables[t] = {"rows": rows, "expected": exp[t], "ok": int(not mism), "files": len(files), "bytes": nbytes,
                         **({"mismatchedFiles": mism[:10]} if mism else {})}
        else:
            rows = con.execute(f"select count(*) from read_parquet('{files[0]}')").fetchone()[0] if files else 0
            tables[t] = {"rows": rows, "files": len(files), "bytes": nbytes}
    views = 0
    dbp = os.path.join(out, "lab.duckdb")
    if os.path.exists(dbp):
        v = duckdb.connect(dbp, read_only=True)
        try:
            for (name,) in v.execute("select view_name from duckdb_views() where not internal").fetchall():
                v.execute(f"select count(*) from {name}").fetchone()
                views += 1
        finally:
            v.close()
    con.close()
    total = sum(x["bytes"] for x in tables.values())
    lab = sum(tables[t]["bytes"] for t in INCREMENTAL)
    return {"ok": int(ok), "files": len(st["files"]), "jsonl_lines": lines, "jsonl_bytes": jbytes, "bad_lines": bad,
            "pending_lines": pending, "parquet_bytes": total, "draft_tables_bytes": lab,
            "ratio": round(jbytes / lab, 1) if lab else 0,
            "views": views, "peak_mb": round(peak_mb()), "by_source": by_source, "tables": tables}


# ---------------------------------------------------------------- CLI

def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(prog="warehouse.py", description="The lab warehouse: Parquet tables and DuckDB views (D363).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("ingest", help="read what is new, write Parquet, rewrite the views")
    i.add_argument("--root", default="var/cubelab/queue", help="the queue's root folder (default var/cubelab/queue)")
    i.add_argument("--runs", default="var/cubelab/runs", help="run folders, searched recursively (default var/cubelab/runs)")
    i.add_argument("--out", default="var/warehouse")
    i.add_argument("--ladder", action="append", default=None, help="AI ladder folders holding sprt.jsonl (default var/ai-ladder*)")
    i.add_argument("--experiments", default="docs/evidence/experiments.jsonl")
    i.add_argument("--ml", default="var/ml", help="ML and gate reports (default var/ml)")
    i.add_argument("--facts", default="var/cubelab/facts", help="the lab's cached engine facts (types, colours, AI flags)")
    i.add_argument("--cards-db", default="var/cards/cards.sqlite", help="the card library's index, for oracle ids (no network)")
    i.add_argument("--batch-rows", type=int, default=50_000, help="rows per Parquet row group (memory)")
    i.add_argument("--checkpoint-mb", type=float, default=512, help="commit every so many MB of JSONL read")
    i.add_argument("--rebuild", action="store_true", help="delete the warehouse's tables and state first")
    i.add_argument("--report", help="also write the run's summary (lines, rows added, seconds, peak MB) to this JSON file")
    s = sub.add_parser("sql", help="(re)write lab.duckdb: views over the Parquet, nothing else")
    s.add_argument("--out", default="var/warehouse")
    v = sub.add_parser("verify", help="row counts against the JSONL and table sizes, as JSON (exit 1 on a mismatch)")
    v.add_argument("--out", default="var/warehouse")
    a = ap.parse_args(argv)
    if a.cmd == "ingest":
        if a.ladder is None:
            a.ladder = sorted(d for d in glob.glob("var/ai-ladder*") if os.path.isdir(d))
        ingest(a)
        return 0
    if a.cmd == "sql":
        print(make_views(a.out))
        return 0
    rep = verify(a.out)
    print(json.dumps(rep, indent=1))
    return 0 if rep["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
