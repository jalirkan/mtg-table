# mtg-table — tools/lab tests: the lab warehouse (D363).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The warehouse over the committed cube-lab fixtures (fixtures/cubelab/: mini, decisions,
explore) and a small queue root built from their lines.

- the line flattening, the reading of complete lines only, the file-change detection and the
  night map are standard library and always run;
- ingest, the views, the incremental and reset paths, verify and the notebooks need pyarrow,
  duckdb and pandas, and are skipped cleanly without them.

Every count is checked against the JSONL counted here, independently of warehouse.py.
"""
from __future__ import annotations

import contextlib
import glob
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "lab"))
import warehouse as W  # noqa: E402

FIX = os.path.join(ROOT, "fixtures", "cubelab")
try:
    import duckdb  # noqa: F401
    import pandas  # noqa: F401
    import pyarrow  # noqa: F401
    HAVE = True
except ImportError:
    HAVE = False
needs = unittest.skipUnless(HAVE, "duckdb, pyarrow and pandas are not installed (pip install --user duckdb pyarrow pandas)")


def fixture_lines(name: str):
    with open(os.path.join(FIX, name, "drafts.jsonl"), encoding="utf-8") as fh:
        return [json.loads(l) for l in fh if l.strip()]


def expected(recs):
    """The rows each table should hold for these draft lines, counted without warehouse.py."""
    e = {"drafts": len(recs), "games": 0, "decks": 0, "deck_cards": 0, "picks": 0}
    for r in recs:
        e["games"] += len(r["match"]["games"])
        for d in r["drafters"]:
            e["decks"] += 1
            main = d["deck"]["main"] if d.get("played") != "forge" and d.get("deck") else (d.get("forge") or {}).get("main") or []
            e["deck_cards"] += len(main)
            e["picks"] += len(d["picks"])
    return e


def add(a, b):
    return {k: a[k] + b[k] for k in a}


class Pure(unittest.TestCase):
    """Standard library only."""

    def test_flatten_fixture_lines(self):
        for name in ("mini", "decisions", "explore"):
            src = W.Source("runs", name, os.path.join(FIX, name), W.read_json(os.path.join(FIX, name, "run.json")) or {})
            for k, rec in enumerate(fixture_lines(name), 1):
                rows = W.flatten(rec, src, 0, k, 100)
                self.assertEqual({t: len(v) for t, v in rows.items()}, expected([rec]), name)
                d = rows["drafts"][0]
                self.assertEqual(d["draft_id"], f"runs/{name}#{rec['seed']}")
                self.assertEqual(d["explore"], name == "explore")
                self.assertEqual(d["ver"], rec.get("ver") or "unversioned")
                self.assertTrue(all(g["explore"] == (name == "explore") for g in rows["games"]))
        rec = fixture_lines("explore")[0]
        g = W.flatten(rec, W.Source("runs", "explore", os.path.join(FIX, "explore"), {}), 0, 1, 1)["games"][0]
        pe = rec["match"]["games"][0]["playExplore"]
        self.assertEqual((g["explore_randomised"], g["explore_changed"], g["explore_close_calls"], g["explore_coins"]),
                         (pe["decisionsRandomised"], pe["changed"], pe["closeCalls"], pe["coins"]))
        self.assertEqual(json.loads(g["explore_by_kind"]), pe["byKind"])
        self.assertEqual(g["decisions"], rec["match"]["games"][0]["recorded"]["decisions"])
        self.assertTrue(g["rec_dir"].endswith("explore/games/102"))

    def test_deck_cards_count_first(self):
        """`main` is [[count, name], ...] (run.ts): the count is the first element."""
        rec = fixture_lines("explore")[0]
        rows = W.flatten(rec, W.Source("runs", "x", FIX, {}), 0, 1, 1)["deck_cards"]
        seat_a = [r for r in rows if r["seat"] == "A"]
        self.assertEqual(sum(r["count"] for r in seat_a), sum(n for n, _ in rec["drafters"][0]["deck"]["main"]))
        self.assertEqual(sum(r["count"] for r in seat_a), 40)

    def test_bridge_from_cube(self):
        rec = dict(fixture_lines("decisions")[0])
        names = [c for _, c in rec["drafters"][0]["deck"]["main"]]
        rec["bridge"] = {"sources": ["pauper", "synergy"], "shares": [0.5, 0.5], "from": {"pauper": names[:3], "synergy": names[3:]}}
        src = W.Source("queue", "bridge/pauper+synergy", FIX, {})
        self.assertEqual((src.kind, src.cube), ("bridge", "bridge:pauper+synergy"))
        rows = W.flatten(rec, src, 2, 1, 1)
        frm = {r["card"]: r["from_cube"] for r in rows["deck_cards"] if r["seat"] == "A"}
        self.assertEqual(frm[names[0]], "pauper")
        self.assertEqual(frm[names[5]], "synergy")
        self.assertEqual(rows["drafts"][0]["bridge_sources"], ["pauper", "synergy"])

    def test_norm_name(self):
        self.assertEqual(W.norm_name("S.H.I.E.L.D. Helicarrier"), "shield helicarrier")
        self.assertEqual(W.norm_name("Jace, Vryn's Prodigy"), "jace vryns prodigy")
        self.assertEqual(W.norm_name("Fire // Ice"), "fire // ice")
        self.assertEqual(W.norm_name("Lim-Dûl's Vault"), "lim duls vault")

    def test_complete_lines_only(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.jsonl")
            with open(p, "wb") as fh:
                fh.write(b'{"a":1}\n{"a":2}\n{"a":')
            got = list(W.complete_lines(p, 0))
            self.assertEqual([l for l, _ in got], [b'{"a":1}\n', b'{"a":2}\n'])
            self.assertEqual(got[-1][1], 16)
            self.assertEqual(list(W.complete_lines(p, 16)), [])

    def test_file_status(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.jsonl")
            with open(p, "wb") as fh:
                fh.write(b"1\n2\n")
            self.assertEqual(W.file_status(p, None), "new")
            st = W.new_file_state(p)
            st["offset"] = 4
            W._seal(st, p)
            self.assertEqual(W.file_status(p, st), "same")
            st["offset"] = 2                    # read "1\n"; "2\n" was appended before the seal: still to read
            W._seal(st, p)
            self.assertEqual(W.file_status(p, st), "grown")
            st["offset"] = 4
            W._seal(st, p)
            with open(p, "ab") as fh:
                fh.write(b"3\n")
            self.assertEqual(W.file_status(p, st), "grown")
            with open(p, "r+b") as fh:          # rewritten in place, same inode, longer
                fh.write(b"9")
            self.assertEqual(W.file_status(p, st), "reset")
            with open(p, "wb") as fh:           # truncated
                fh.write(b"1\n")
            self.assertEqual(W.file_status(p, st), "reset")
            os.remove(p)
            self.assertEqual(W.file_status(p, st), "reset")
            self.assertEqual(W.file_status(p, None), "gone")

    def test_night_map(self):
        plans = [(1, "n1", {"chunks": [{"key": "normal/synergy", "seed": 1, "drafts": 3}]}),
                 (2, "n2", {"chunks": [{"key": "normal/synergy", "seed": 4, "drafts": 2}, {"key": "bridge/a+b", "seed": 1, "drafts": 5}]})]
        m = W.NightMap(plans)
        self.assertEqual([m.night("normal/synergy", s) for s in (1, 3, 4, 5, 6)], [1, 1, 2, 2, 0])
        self.assertEqual(m.night("bridge/a+b", 5), 2)
        self.assertEqual(m.night("normal/pauper", 1), 0)

    def test_wilson_and_clean_text(self):
        lo, hi = W.wilson(50, 100)
        self.assertAlmostEqual(lo, 0.4038, places=3)
        self.assertAlmostEqual(hi, 0.5962, places=3)
        self.assertEqual(W.wilson(0, 0), (0.0, 1.0))
        self.assertEqual(W.wilson(10, 10)[1], 1.0)
        self.assertEqual(W.clean_text("  Fire //\tIce\u0000 "), "Fire // Ice")
        self.assertEqual(len(W.clean_text("x" * 200)), W.NAME_MAX)
        self.assertIsNone(W.clean_text("\u200b"))
        self.assertIsNone(W.clean_text(7))

    def test_saved_queries_carry_the_caveat(self):
        files = sorted(glob.glob(os.path.join(ROOT, "notebooks", "sql", "*.sql"))) + \
            sorted(glob.glob(os.path.join(ROOT, "notebooks", "*.py")))
        self.assertEqual(len(files), 5 + 6)
        for f in files:
            with open(f, encoding="utf-8") as fh:
                t = fh.read()
            self.assertIn("SPDX-License-Identifier: GPL-3.0-or-later", t, f)
            self.assertIn("Forge", t.split("Forge-vs-Forge", 1)[-1] if f.endswith(".sql") else t, f)
            self.assertTrue("Forge-vs-Forge" in t or "Forge against Forge" in t, f)


def build_queue(root: str):
    """A queue root: normal/synergy over nights 1 and 2, bridge/pauper+synergy on night 2, from the fixture lines."""
    base = fixture_lines("decisions")[0]
    ex = fixture_lines("explore")[0]
    lines = {"normal/synergy": [], "bridge/pauper+synergy": []}
    for s in range(1, 7):
        r = json.loads(json.dumps(ex if s % 3 == 0 else base))
        r["seed"] = s
        lines["normal/synergy"].append(r)
    for s in range(1, 4):
        r = json.loads(json.dumps(base))
        r["seed"] = s
        names = sorted({c for d in r["drafters"] for _, c in d["deck"]["main"]})
        r["bridge"] = {"sources": ["pauper", "synergy"], "shares": [0.5, 0.5], "from": {"pauper": names[::2], "synergy": names[1::2]}}
        lines["bridge/pauper+synergy"].append(r)
    for key, recs in lines.items():
        d = os.path.join(root, key)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "run.json"), "w") as fh:
            json.dump({"v": 1, "cubeFile": "bridge:pauper+synergy" if key.startswith("bridge") else "cubes/synergy-cube-180.md",
                       "format": "grid", "games": 1, "profiles": ["Default", "Default"],
                       "versions": [{"id": "abc", "since": "2026-10-03T20:00:00.000Z", "firstSeed": 1}]}, fh)
        with open(os.path.join(d, "drafts.jsonl"), "w") as fh:
            for r in recs:
                fh.write(json.dumps(r) + "\n")
    with open(os.path.join(root, "night-1.json"), "w") as fh:
        json.dump({"night": 1, "drafts": 4, "games": 1, "format": "grid", "chunks": [{"key": "normal/synergy", "seed": 1, "drafts": 4}],
                   "runs": [{"at": "2026-10-03T20:00:00.000Z"}]}, fh)
    with open(os.path.join(root, "night-2.json"), "w") as fh:
        json.dump({"night": 2, "drafts": 6, "games": 1, "format": "grid", "playExplore": {"share": 0.15, "epsilon": 0.05, "closeCall": 0.02, "opening": False},
                   "chunks": [{"key": "normal/synergy", "seed": 5, "drafts": 3}, {"key": "bridge/pauper+synergy", "seed": 1, "drafts": 3}]}, fh)
    return lines


@needs
class Warehouse(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="warehouse-test-")
        self.queue = os.path.join(self.tmp, "queue")
        self.runs = os.path.join(self.tmp, "runs")
        self.out = os.path.join(self.tmp, "wh")
        self.ml = os.path.join(self.tmp, "ml")
        self.ladder = os.path.join(self.tmp, "ladder")
        self.lines = build_queue(self.queue)
        shutil.copytree(FIX, self.runs, ignore=shutil.ignore_patterns("games", "frames"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ingest(self, *extra):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            W.main(["ingest", "--root", self.queue, "--runs", self.runs, "--out", self.out, "--ml", self.ml,
                    "--ladder", self.ladder, "--experiments", os.path.join(self.tmp, "none.jsonl"),
                    "--facts", os.path.join(self.tmp, "facts"), "--cards-db", os.path.join(self.tmp, "none.sqlite"), *extra])
        return json.loads(buf.getvalue().strip().splitlines()[-1])

    def counts(self):
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        try:
            return {t: con.execute(f"select count(*) from {t}").fetchone()[0] for t in W.INCREMENTAL}
        finally:
            con.close()

    def all_expected(self):
        e = expected([])
        for key in self.lines:
            with open(os.path.join(self.queue, key, "drafts.jsonl")) as fh:
                e = add(e, expected([json.loads(l) for l in fh if l.endswith("\n")]))
        for f in glob.glob(os.path.join(self.runs, "*", "drafts.jsonl")):
            with open(f) as fh:
                e = add(e, expected([json.loads(l) for l in fh if l.endswith("\n")]))
        return e

    def append(self, key, recs, tail=b""):
        with open(os.path.join(self.queue, key, "drafts.jsonl"), "ab") as fh:
            for r in recs:
                fh.write((json.dumps(r) + "\n").encode())
            fh.write(tail)

    def test_ingest_exact_counts_and_verify(self):
        rep = self.ingest()
        self.assertEqual(rep["rowsAdded"], self.all_expected())
        self.assertEqual(self.counts(), self.all_expected())
        v = W.verify(self.out)
        self.assertEqual(v["ok"], 1)
        self.assertEqual(v["jsonl_lines"], 9 + 5)
        self.assertEqual(v["pending_lines"], 0)
        self.assertEqual((v["by_source"]["queue"]["lines"], v["by_source"]["runs"]["lines"]), (9, 5))
        for t in W.INCREMENTAL:
            self.assertEqual(v["tables"][t]["rows"], v["tables"][t]["expected"])

    def test_idempotent(self):
        self.ingest()
        files = sorted(glob.glob(os.path.join(self.out, "drafts", "**", "*.parquet"), recursive=True))
        rep = self.ingest()
        self.assertEqual(rep["lines"], 0)
        self.assertEqual(self.counts(), self.all_expected())
        self.assertEqual(sorted(glob.glob(os.path.join(self.out, "drafts", "**", "*.parquet"), recursive=True)), files)

    def test_incremental_append_reads_complete_lines_only(self):
        self.ingest()
        extra = []
        for s in (7, 8):
            r = json.loads(json.dumps(fixture_lines("decisions")[0]))
            r["seed"] = s
            extra.append(r)
        partial = json.dumps(dict(fixture_lines("decisions")[0], seed=9)).encode()
        self.append("normal/synergy", extra, tail=partial[:500])
        rep = self.ingest()
        self.assertEqual(rep["lines"], 2)
        self.assertEqual(rep["rowsAdded"], expected(extra))
        self.assertEqual(self.counts(), self.all_expected())
        self.assertEqual(W.verify(self.out)["pending_lines"], 0)
        with open(os.path.join(self.queue, "normal/synergy", "drafts.jsonl"), "ab") as fh:
            fh.write(partial[500:] + b"\n")
        rep = self.ingest()
        self.assertEqual(rep["lines"], 1)
        self.assertEqual(self.counts(), self.all_expected())
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        ids = [r[0] for r in con.execute("select draft_id from drafts where key = 'normal/synergy' order by seed").fetchall()]
        self.assertEqual(ids, [f"queue/normal/synergy#{s}" for s in range(1, 10)])
        self.assertEqual(con.execute("select count(distinct draft_id) = count(*) from drafts").fetchone()[0], True)
        con.close()

    def test_truncation_resets_that_file_only(self):
        self.ingest()
        p = os.path.join(self.queue, "normal/synergy", "drafts.jsonl")
        with open(p, "rb") as fh:
            keep = fh.readlines()[:2]
        with open(p, "wb") as fh:          # same inode, shorter
            fh.writelines(keep)
        rep = self.ingest()
        self.assertEqual(rep["resets"], 1)
        self.assertEqual(self.counts(), self.all_expected())
        self.assertEqual(W.verify(self.out)["ok"], 1)
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        self.assertEqual(con.execute("select count(*) from drafts where key = 'normal/synergy'").fetchone()[0], 2)
        self.assertEqual(con.execute("select count(*) from drafts where key = 'bridge/pauper+synergy'").fetchone()[0], 3)
        con.close()

    def test_replaced_and_deleted_files_reset(self):
        self.ingest()
        p = os.path.join(self.queue, "bridge/pauper+synergy", "drafts.jsonl")
        with open(p, "rb") as fh:
            body = fh.read()
        os.remove(p)
        first, rest = body.split(b"\n", 1)
        with open(p + ".new", "wb") as fh:  # rewritten: the first line's seed changed, one line more
            fh.write(first.replace(b'"seed": 1,', b'"seed": 4,') + b"\n" + rest + first + b"\n")
        os.rename(p + ".new", p)
        rep = self.ingest()
        self.assertEqual(rep["resets"], 1)
        self.assertEqual(self.counts(), self.all_expected())
        shutil.rmtree(os.path.join(self.runs, "mini"))
        self.ingest()
        self.assertEqual(self.counts(), self.all_expected())
        self.assertEqual(W.verify(self.out)["ok"], 1)

    def test_killed_ingest_leaves_nothing(self):
        self.ingest()
        stray = os.path.join(self.out, "drafts", "source=queue", "night=1", "part-20990101T000000-1-c1.parquet")
        shutil.copy(glob.glob(os.path.join(self.out, "drafts", "source=queue", "night=1", "*.parquet"))[0], stray)
        open(stray + ".tmp", "w").close()
        self.ingest()
        self.assertFalse(os.path.exists(stray) or os.path.exists(stray + ".tmp"))
        self.assertEqual(self.counts(), self.all_expected())

    def test_checkpoints(self):
        report = os.path.join(self.tmp, "ingest.json")
        rep = self.ingest("--checkpoint-mb", "0.02", "--batch-rows", "7", "--report", report)
        self.assertEqual(rep["rowsAdded"], self.all_expected())
        with open(report) as fh:
            self.assertEqual(json.load(fh)["rowsAdded"], self.all_expected())
        st = W.load_state(self.out)
        self.assertGreater(len(st["runs"]), 3)
        self.assertEqual(self.counts(), self.all_expected())
        self.assertEqual(W.verify(self.out)["ok"], 1)

    def test_partitions_nights_and_explore(self):
        self.ingest()
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        got = con.execute("select key, seed, night, source from drafts where source = 'queue' order by key, seed").fetchall()
        want = [("bridge/pauper+synergy", s, 2, "queue") for s in (1, 2, 3)] + \
               [("normal/synergy", s, 1 if s <= 4 else 2, "queue") for s in range(1, 7)]
        self.assertEqual(got, want)
        self.assertEqual(con.execute("select count(*) from drafts where source = 'runs' and night = 0").fetchone()[0], 5)
        n_explore = sum(1 for k in self.lines for r in self.lines[k] if r.get("playExplore")) + 1
        self.assertEqual(con.execute("select count(*) from drafts where explore").fetchone()[0], n_explore)
        self.assertEqual(con.execute("select count(*) from games where explore and explore_randomised = 14").fetchone()[0], n_explore)
        self.assertEqual(con.execute("select count(*) from games where not explore and explore_randomised is not null").fetchone()[0], 0)
        self.assertEqual(con.execute("select count(*) from deck_cards where cube like 'bridge:%' and from_cube is null").fetchone()[0], 0)
        self.assertEqual(con.execute("select count(*) from nights").fetchone()[0], 2)
        self.assertTrue(os.path.isdir(os.path.join(self.out, "picks", "source=queue", "night=2")))
        con.close()

    def test_views_and_small_tables(self):
        os.makedirs(self.ladder)
        with open(os.path.join(self.ladder, "sprt.jsonl"), "w") as fh:
            for res in ("H1", "inconclusive"):
                fh.write(json.dumps({"v": 1, "at": "2026-10-04T01:00:00.000Z", "id": "pc:1", "host": "pc", "a": "x", "b": "y", "ah": "1",
                                     "bh": "2", "elo0": 0, "elo1": 20, "alpha": 0.05, "beta": 0.05, "result": res, "llr": 3.1,
                                     "lower": -2.94, "upper": 2.94, "games": 400, "pairs": 200, "score": 0.55, "purpose": "sprt"}) + "\n")
        os.makedirs(os.path.join(self.ml, "gates", "fit"))
        with open(os.path.join(self.ml, "gates", "fit", "report.json"), "w") as fh:
            json.dump({"gate": "fit", "pass": False, "model": "m.json", "modelSha12": "abc", "reasons": ["underpowered"]}, fh)
        os.makedirs(os.path.join(self.ml, "matchup", "night-1"))
        with open(os.path.join(self.ml, "matchup", "night-1", "balance.json"), "w") as fh:
            json.dump({"sample": {"games": 10}}, fh)
        with open(os.path.join(self.ml, "matchup", "night-1", "power.tsv"), "w") as fh:
            fh.write("# comment\nname\tpower\tsdPost\tsdBoot\tpoints\tprior\tgames\tland\tai\tcubes\n"
                     "Lightning Bolt\t0.2\t0.1\tnan\t5.0\t0.1\t40\t0\t\tpauper,vintage\n")
        self.ingest()
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        views = [r[0] for r in con.execute("select view_name from duckdb_views() where not internal order by 1").fetchall()]
        self.assertEqual(set(views), set(W.INCREMENTAL) | set(W.SMALL) | set(W.EXTRA_VIEWS))
        for v in views:
            con.execute(f"select * from {v} limit 1").fetchall()
        self.assertEqual(con.execute("select count(*) from seat_games").fetchone()[0], 2 * self.all_expected()["games"])
        self.assertEqual(con.execute("select result from sprt order by result").fetchall(), [("H1",), ("inconclusive",)])
        self.assertEqual(con.execute("select gate, pass, reasons from gate_reports").fetchall(), [("fit", False, '["underpowered"]')])
        self.assertEqual(con.execute("select kind from ml_reports").fetchall(), [("balance",)])
        self.assertEqual(con.execute("select card_id, cubes, sd_boot from matchup_power").fetchall(), [("lightning bolt", ["pauper", "vintage"], None)])
        self.assertEqual(con.execute("select count(*) from versions").fetchone()[0], 2 + 2)
        # one id per card across cubes; every card the data names is there
        self.assertEqual(con.execute("select count(*) = count(distinct card_id) from cards").fetchone()[0], True)
        self.assertEqual(con.execute("select count(*) from deck_cards dc anti join cards c using (card_id)").fetchone()[0], 0)
        if con.execute("select count(*) from cube_cards").fetchone()[0]:     # node parsed the cube documents
            self.assertEqual(con.execute("select count(distinct cube) from cube_cards").fetchone()[0],
                             len(glob.glob(os.path.join(ROOT, "cubes", "*-cube-*.md"))))
            self.assertIn("synergy", con.execute("select cubes from cards where card_id = 'snapcaster mage'").fetchone()[0])
        con.close()

    def test_empty_warehouse_views(self):
        shutil.rmtree(self.queue)
        shutil.rmtree(self.runs)
        rep = self.ingest()
        self.assertEqual(rep["lines"], 0)
        self.assertEqual(self.counts(), expected([]))
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        cols = [r[0] for r in con.execute("describe drafts").fetchall()]
        self.assertEqual(cols[-2:], ["source", "night"])
        con.close()

    def test_notebooks_run_on_the_fixture_warehouse(self):
        # A passing gate report carries no "reasons" (null in the table): J066's pilot on the PC failed on that.
        for gate, rep in (("fit", {"gate": "fit", "pass": True, "model": "m.json", "modelSha12": "abc"}),
                          ("regret", {"gate": "regret", "pass": False, "model": "m.json", "modelSha12": "abc", "reasons": ["underpowered"]})):
            os.makedirs(os.path.join(self.ml, "gates", gate))
            with open(os.path.join(self.ml, "gates", gate, "report.json"), "w") as fh:
                json.dump(rep, fh)
        self.ingest()
        env = dict(os.environ, LAB_WAREHOUSE=os.path.join(self.out, "lab.duckdb"), MIN_GAMES="1", MPLBACKEND="agg")
        books = sorted(glob.glob(os.path.join(ROOT, "notebooks", "*.py")))
        self.assertEqual(len(books), 6)
        for nb in books:
            r = subprocess.run([sys.executable, nb], cwd=self.tmp, env=env, capture_output=True, text=True, timeout=300)
            self.assertEqual(r.returncode, 0, f"{os.path.basename(nb)}:\n{r.stderr[-3000:]}")

    def test_saved_sql_runs_on_the_fixture_warehouse(self):
        """Every notebooks/sql/*.sql executes as a plain query, with and without its threshold variables."""
        self.ingest()
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        try:
            out = {}
            for f in sorted(glob.glob(os.path.join(ROOT, "notebooks", "sql", "*.sql"))):
                with open(f, encoding="utf-8") as fh:
                    out[os.path.basename(f)[:-4]] = con.sql(fh.read()).df()
            self.assertEqual(set(out), {"card_win_rates", "pair_trends", "game_length", "pick_vs_deck", "nightly_volume"})
            self.assertEqual(len(out["card_win_rates"]), 0)          # the default threshold is 100 games
            con.execute("set variable min_games = 1")
            with open(os.path.join(ROOT, "notebooks", "sql", "card_win_rates.sql"), encoding="utf-8") as fh:
                cw = con.sql(fh.read()).df()
            self.assertGreater(len(cw), 0)
            self.assertTrue(((cw.lo <= cw.win_rate) & (cw.win_rate <= cw.hi) & (cw.lo >= 0) & (cw.hi <= 1)).all())
            nv = out["nightly_volume"]
            self.assertEqual(sorted(nv.night.tolist()), [0, 1, 2])
            self.assertEqual(int(nv.drafts.sum()), self.all_expected()["drafts"])
            self.assertEqual(int(nv.games.sum()), self.all_expected()["games"])
            gl = out["game_length"]
            plain = con.execute("select count(*) from games where not explore").fetchone()[0]
            self.assertEqual(int(gl.games.sum()), plain)
            self.assertGreater(len(out["pair_trends"]), 0)
            self.assertTrue(set("".join(out["pair_trends"].pair)) <= set("WUBRG"))
            self.assertTrue(((out["pick_vs_deck"].inclusion >= 0) & (out["pick_vs_deck"].inclusion <= 1)).all())
        finally:
            con.close()

    def test_export_summary_numbers_only(self):
        """warehouse.json, schema 1: exactly the agreed keys, rates in [0, 1], cards named only as the cube documents do."""
        qdir = self.queue.rstrip(os.sep) + "-quarantine-n2"
        os.makedirs(qdir)
        with open(os.path.join(qdir, "failed.txt"), "w") as fh:
            fh.write(os.path.join(self.queue, "normal", "synergy", "games", "5", "g1-seat0.jsonl.gz") + "\n\n")
        self.ingest()
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            self.assertEqual(W.main(["export", "--out", self.out]), 0)
        with open(os.path.join(self.out, "warehouse.json"), encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual(list(doc), ["schema", "generatedAt", "warehouseVer", "tables", "nights", "archive", "disk", "cubes",
                                     "pairs", "cards"])
        self.assertEqual(doc["schema"], 1)
        self.assertRegex(doc["generatedAt"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
        self.assertIsNone(doc["archive"])
        self.assertEqual({t["name"] for t in doc["tables"]}, set(W.INCREMENTAL) | set(W.SMALL))
        for t in doc["tables"]:
            self.assertEqual(set(t), {"name", "rows", "bytes"})
        rows = {t["name"]: t["rows"] for t in doc["tables"]}
        self.assertEqual({k: rows[k] for k in W.INCREMENTAL}, self.all_expected())
        nights = {n["night"]: n for n in doc["nights"]}
        self.assertEqual(set(nights), {1, 2, "other"})
        self.assertEqual(nights[2]["quarantined"], 1)
        self.assertEqual(sum(n["drafts"] for n in doc["nights"]), self.all_expected()["drafts"])
        for n in doc["nights"]:
            self.assertEqual(set(n), {"night", "drafts", "games", "recorded", "quarantined", "engineErrors"})
        for c in doc["cubes"]:
            self.assertEqual(set(c), {"cube", "drafts", "games", "avgTurns", "onPlayWinRate"})
            self.assertTrue(c["onPlayWinRate"] is None or 0 <= c["onPlayWinRate"] <= 1)
        self.assertGreater(len(doc["pairs"]), 0)
        for r in doc["pairs"] + doc["cards"]:
            self.assertTrue(0 <= r["lo"] <= r["winRate"] <= r["hi"] <= 1, r)
        for r in doc["pairs"]:
            self.assertRegex(r["pair"], r"^[WUBRG]+$")
        # the fixtures have fewer than 100 games a card: no card is published
        self.assertEqual(doc["cards"], [])
        keys = set()

        def walk(x):
            if isinstance(x, dict):
                keys.update(x)
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(doc)
        self.assertEqual(keys, {"schema", "generatedAt", "warehouseVer", "tables", "nights", "archive", "disk", "cubes", "pairs",
                                "cards", "name", "rows", "bytes", "night", "drafts", "games", "recorded", "quarantined",
                                "engineErrors", "freeGB", "usedPct", "cube", "avgTurns", "onPlayWinRate", "pair", "winRate",
                                "lo", "hi"})
        text = json.dumps(doc)
        for bad in (self.tmp, "jsonl", "/"):
            self.assertNotIn(bad, text)
        # with the threshold lowered, every card published is a cube document's name, at most 25 + 25 a cube
        old = W.EXPORT_MIN_CARD_GAMES
        W.EXPORT_MIN_CARD_GAMES = 1
        try:
            doc = W.export_summary(self.out)
        finally:
            W.EXPORT_MIN_CARD_GAMES = old
        con = duckdb.connect(os.path.join(self.out, "lab.duckdb"), read_only=True)
        names = {r[0] for r in con.execute("select name from cube_cards").fetchall()}
        con.close()
        if names:                                          # node parsed the cube documents
            self.assertGreater(len(doc["cards"]), 0)
            self.assertTrue(all(c["card"] in names for c in doc["cards"]))
        per_cube = {}
        for c in doc["cards"]:
            per_cube[c["cube"]] = per_cube.get(c["cube"], 0) + 1
        self.assertTrue(all(v <= 2 * W.EXPORT_CARDS_EACH_END for v in per_cube.values()))

    def test_committed_sample_is_schema_1(self):
        with open(os.path.join(ROOT, "tools", "lab", "warehouse-sample.json"), encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual(list(doc), ["schema", "generatedAt", "warehouseVer", "tables", "nights", "archive", "disk", "cubes",
                                     "pairs", "cards"])
        for c in doc["cards"]:
            self.assertGreaterEqual(c["games"], W.EXPORT_MIN_CARD_GAMES)


if __name__ == "__main__":
    unittest.main()
