# mtg-table — tools/ml tests: the human test set's collector and its evaluation (D369).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

The committed seat recordings (fixtures/games/human-*.jsonl, the same files as
ForgeCoach's public/samples/) are a scripted seat's (`transport: auto`) or a
ws seat's under a test id; each test lays them out as the bridge would have for
a person -- `var/games/human-ws-<seed>-g<n>/frames.jsonl` with `transport: ws`
-- in a scratch folder, beside the cases the collector must refuse.

Standard library: what is taken and what is not, an idempotent second run, the
dedupe key, the copy byte for byte, the manifest (cube, AI policy, nothing of the
AI's list), an unfinished game taken once it finishes, --from with a file of two
games.  numpy: human_eval.py on the collected fixtures with the parity model
(fixtures/eval/model.json) and baselines fitted on a dataset of the fixtures.
"""
from __future__ import annotations

import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402
import human_collect as HC  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
HUMAN_FIXTURES = sorted(os.path.join(FIXTURES, f) for f in os.listdir(FIXTURES) if f.startswith("human-"))
MODEL = os.path.join(ROOT, "fixtures", "eval", "model.json")
SHORTEST = sorted(HUMAN_FIXTURES, key=os.path.getsize)[:3]


def lines_of(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return f.read().splitlines(True)


def as_person(path: str, game_id: str, started: str | None = None, transport: str = "ws",
              hello_match: dict | None = None) -> list[str]:
    """A fixture's lines as the bridge writes a person's game: the header's id and transport set."""
    ls = lines_of(path)
    h = json.loads(ls[0])
    h["gameId"], h["transport"] = game_id, transport
    if started:
        h["startedAt"] = started
    out = [json.dumps(h) + "\n"]
    for line in ls[1:]:
        if hello_match is not None and '"hello_ok"' in line:
            f = json.loads(line)
            f["body"]["match"] = hello_match
            line = json.dumps(f) + "\n"
        out.append(line)
    return out


def write(path: str, ls: list[str]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(ls)


def lay_out(games_dir: str) -> list[str]:
    """The human fixtures as a person's games under var/games/; returns their ids."""
    ids = []
    for i, p in enumerate(HUMAN_FIXTURES):
        seed = json.loads(lines_of(p)[0])["seed"]
        gid = f"human-ws-{seed}-g{i + 1}"
        write(os.path.join(games_dir, gid, "frames.jsonl"), as_person(p, gid))
        ids.append(gid)
    return ids


def read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def quiet(fn, *a, **k):
    with redirect_stdout(io.StringIO()):
        return fn(*a, **k)


class CollectTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="human-collect-")
        self.games = os.path.join(self.tmp, "var", "games")
        self.out = os.path.join(self.tmp, "var", "ml", "human")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_takes_a_persons_finished_games_and_nothing_else(self):
        ids = lay_out(self.games)
        g42 = os.path.join(FIXTURES, "human-auto-42.jsonl")
        # a scripted seat (transport auto), under a play.sh id
        write(os.path.join(self.games, "human-ws-901", "frames.jsonl"), as_person(g42, "human-ws-901", transport="auto"))
        # an AI-vs-AI recording (no transport, both seats AI), under a launched match's id
        write(os.path.join(self.games, "match-m1234567890123", "frames.jsonl"), lines_of(os.path.join(FIXTURES, "g1.jsonl")))
        # a gate run's ws game: its id is not play.sh's, so its folder is not read
        write(os.path.join(self.games, "check-all-m2", "frames.jsonl"), as_person(g42, "check-all-m2"))
        # a person's game cut before its end
        cut = [ln for ln in as_person(g42, "human-ws-902") if '"over"' not in ln and '"gameOver":{' not in ln]
        write(os.path.join(self.games, "human-ws-902", "frames.jsonl"), cut)
        r = HC.collect(self.games, self.out)
        self.assertEqual(sorted(e["gameId"] for e in r["entries"]), sorted(ids))
        self.assertEqual(r["added"], len(HUMAN_FIXTURES))
        self.assertEqual(r["skipped"].get("transport 'auto' is not a person's seat"), 1)
        self.assertEqual(r["skipped"].get("transport None is not a person's seat"), 1)
        self.assertEqual(r["skipped"].get("not finished"), 1)
        self.assertNotIn("check-all-m2", json.dumps(r["entries"]))
        # the manifest is not a .jsonl: dataset.py reads every log under the folder, and only the games are logs
        self.assertEqual(len(E.find_logs([self.out])), len(HUMAN_FIXTURES))

    def test_idempotent_and_byte_for_byte(self):
        lay_out(self.games)
        quiet(HC.collect, self.games, self.out)
        files = {f: read_bytes(os.path.join(self.out, f)) for f in os.listdir(self.out) if f.endswith(".gz")}
        man = HC.read_manifest(self.out)
        r2 = HC.collect(self.games, self.out)
        self.assertEqual(r2["added"], 0)
        self.assertEqual(HC.read_manifest(self.out)["games"], man["games"])
        self.assertEqual({f: read_bytes(os.path.join(self.out, f)) for f in files}, files)
        # with the cache gone the answer is the same: the manifest's keys alone make it idempotent
        os.remove(os.path.join(self.out, HC.CACHE))
        self.assertEqual(HC.collect(self.games, self.out)["added"], 0)
        # every copy is its source's lines, byte for byte
        for e in man["games"]:
            src = os.path.join(self.games, e["gameId"], "frames.jsonl")
            with gzip.open(os.path.join(self.out, e["file"]), "rt", encoding="utf-8") as f:
                self.assertEqual(f.read(), "".join(lines_of(src)))
        # the same game twice gives the same file: gzip without a timestamp
        a, b = os.path.join(self.tmp, "a.gz"), os.path.join(self.tmp, "b.gz")
        HC._write_gz(a, "x\n")
        HC._write_gz(b, "x\n")
        self.assertEqual(read_bytes(a), read_bytes(b))

    def test_dedupe_key(self):
        p = os.path.join(FIXTURES, "human-comfort-13.jsonl")
        write(os.path.join(self.games, "human-ws-13", "frames.jsonl"), as_person(p, "human-ws-13"))
        # the same game again, from a folder of saved logs: one entry
        saved = os.path.join(self.tmp, "saved")
        write(os.path.join(saved, "my game.jsonl"), as_person(p, "human-ws-13"))
        r = quiet(HC.collect, self.games, self.out, [saved])
        self.assertEqual((r["added"], r["games"]), (1, 1))
        # the same id and seed on another start (a --seed given twice): another game
        write(os.path.join(saved, "again.jsonl"), as_person(p, "human-ws-13", started="2026-10-01T10:00:00Z"))
        r = quiet(HC.collect, None, self.out, [saved])
        self.assertEqual((r["added"], r["games"]), (1, 2))
        self.assertEqual(len({e["file"] for e in r["entries"]}), 2)

    def test_unfinished_then_finished(self):
        p = os.path.join(FIXTURES, "human-yield-13.jsonl")
        full = as_person(p, "human-ws-13")
        cut = full[: len(full) // 2]
        f = os.path.join(self.games, "human-ws-13", "frames.jsonl")
        write(f, cut)
        self.assertEqual(quiet(HC.collect, self.games, self.out)["added"], 0)
        write(f, full)     # the game went on and ended: the file changed, so it is judged again
        os.utime(f, ns=(os.stat(f).st_atime_ns, os.stat(f).st_mtime_ns + 10**9))
        self.assertEqual(quiet(HC.collect, self.games, self.out)["added"], 1)

    def test_manifest(self):
        cube = os.path.join(ROOT, "cubes", "pauper-cube-180.md")
        names = E.read_vocab_names(cube)[:23]
        deck = os.path.join(self.tmp, "var", "match", "m1759600000000", "you.dck")
        os.makedirs(os.path.dirname(deck))
        with open(deck, "w", encoding="utf-8") as fh:
            fh.write("[metadata]\nName=Cube draft\n[main]\n" + "".join(f"1 {n}\n" for n in names) + "17 Plains\n")
        match = {"yourDeck": {"name": "Cube draft", "path": deck, "cards": 40},
                 "aiDeck": {"name": "AI Drafter", "cards": 40}, "aiProfile": "Default", "games": 1, "aiPolicy": "search"}
        p = os.path.join(FIXTURES, "human-auto-42.jsonl")
        ls = as_person(p, "match-m1759600000000", hello_match=match)
        h = json.loads(ls[0])
        h["decks"][0]["path"] = deck
        ls[0] = json.dumps(h) + "\n"
        write(os.path.join(self.games, "match-m1759600000000", "frames.jsonl"), ls)
        e = quiet(HC.collect, self.games, self.out)["entries"][0]
        self.assertEqual(e["gameId"], "match-m1759600000000")
        self.assertEqual((e["seed"], e["date"], e["seat"], e["transport"]), (42, "2026-09-12", 0, "ws"))
        self.assertEqual((e["result"], e["reason"], e["turns"]), ("loss", "AllOpponentsLost", 22))
        self.assertEqual((e["aiPolicy"], e["aiProfile"]), ("search", "Default"))
        self.assertEqual(e["cube"], "pauper-cube-180")
        self.assertEqual(e["yourDeck"]["name"], "Cube draft")
        # the AI's deck: its public name and count, never a path, a hash or a list (M44)
        self.assertEqual(e["aiDeck"], {"name": "AI Drafter", "cards": 40})
        self.assertEqual(len(e["sha256"]), 64)
        self.assertEqual(HC.status_line(HC.read_manifest(self.out)["games"]),
                         "human test set: 1 game (0 won, 1 lost) -- var/ml/human/ (D369; descriptive until 30)")

    def test_from_a_file_of_two_games(self):
        a = as_person(os.path.join(FIXTURES, "human-scry-7.jsonl"), "saved-a")
        b = as_person(os.path.join(FIXTURES, "human-trample-7.jsonl"), "saved-b")
        saved = os.path.join(self.tmp, "Downloads")
        write(os.path.join(saved, "session.jsonl"), a + b)
        r = quiet(HC.collect, None, self.out, [saved])
        self.assertEqual(sorted(e["gameId"] for e in r["entries"]), ["saved-a", "saved-b"])
        got = {}
        for e in r["entries"]:
            with gzip.open(os.path.join(self.out, e["file"]), "rt", encoding="utf-8") as f:
                got[e["gameId"]] = f.read()
        self.assertEqual(got, {"saved-a": "".join(a), "saved-b": "".join(b)})
        self.assertTrue(all(e["origin"] == "from" for e in r["entries"]))

    def test_cli_status(self):
        lay_out(self.games)
        buf = io.StringIO()
        with redirect_stdout(buf):
            HC.main(["--games-dir", self.games, "--out", self.out, "--quiet"])
            HC.main(["--out", self.out, "--status"])
        lines = buf.getvalue().splitlines()
        n = len(HUMAN_FIXTURES)
        self.assertTrue(lines[0].startswith(f"human test set: {n} games (0 won, {n} lost), {n} new"), lines[0])
        self.assertTrue(lines[1].startswith(f"human test set: {n} games (0 won, {n} lost) --"), lines[1])


@unittest.skipIf(np is None, "numpy is not installed: human_eval.py skipped")
class HumanEvalTest(unittest.TestCase):
    """human_eval.py on the collected fixtures.  The parity model was trained on every fixture,
    these games included, so its numbers here say the code works, not how good the model is."""

    @classmethod
    def setUpClass(cls):
        import dataset as D
        import eval_golden as G
        cls.tmp = tempfile.mkdtemp(prefix="human-eval-")
        cls.data = os.path.join(cls.tmp, "data")
        cwd = os.getcwd()
        os.chdir(ROOT)
        try:
            quiet(D.build, [FIXTURES], G.vocab_files(), cls.data, (70, 15, 15), quiet=True)
        finally:
            os.chdir(cwd)
        games = os.path.join(cls.tmp, "games")
        lay_out(games)
        cls.human = os.path.join(cls.tmp, "human")
        quiet(HC.collect, games, cls.human)
        import human_eval as H
        _m, _net, schema = H.load_model(MODEL)
        cls.fitted = quiet(H.fit_baselines, cls.data, schema.names[:schema.card_offset], "pair", print)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def run_eval(self, models, human, baselines, resamples=200):
        import human_eval as H
        buf = io.StringIO()
        with redirect_stdout(buf):
            rep = H.run(models, human, baselines, resamples, log=print, fitted=self.fitted if baselines else None)
        return rep, buf.getvalue()

    def test_report_on_the_fixtures(self):
        rep, text = self.run_eval([MODEL], self.human, self.data)
        n = len(HUMAN_FIXTURES)
        self.assertEqual(rep["games"], n)
        self.assertTrue(rep["descriptiveOnly"])
        self.assertIn(f"DESCRIPTIVE ONLY: {n} games is fewer than 30", text)
        sc = rep["scores"]
        self.assertEqual(set(sc["models"]), {"prior", "life", "core", "eval"})
        for m in sc["models"].values():
            self.assertTrue(0 < m["all"]["logloss"] < 5 and 0 <= m["all"]["brier"] <= 1 and 0 <= m["all"]["ece"] <= 1)
            self.assertEqual(sum(b["rows"] for b in m["reliability"]), rep["rows"])
        d = sc["minusEval"]["all"]["core"]
        self.assertTrue(d["lo"] <= d["mean"] <= d["hi"])
        self.assertEqual(d["groups"], n)
        self.assertIn("turn 17+", sc["minusEval"])
        self.assertEqual(rep["firstCheck"]["verdict"], "NOT YET")
        # the rows are encode_game's: every decision row of every game, once
        import human_eval as H
        games, _ = H.human_games(self.human)
        _m, _net, schema = H.load_model(MODEL)
        self.assertEqual(rep["rows"], sum(len(E.encode_game(g, schema)) for g in games))

    def test_ensemble_and_no_baselines(self):
        twin = os.path.join(self.tmp, "twin.json")
        shutil.copy(MODEL, twin)
        one, _ = self.run_eval([MODEL], self.human, None)
        two, text = self.run_eval([MODEL, twin], self.human, None)
        self.assertEqual(set(one["scores"]["models"]), {"coin", "eval"})
        self.assertIn("only `coin`", text)
        self.assertIn("m:twin.json", two["scores"]["models"])
        self.assertAlmostEqual(two["scores"]["models"]["eval"]["all"]["logloss"],
                               one["scores"]["models"]["eval"]["all"]["logloss"], places=12)

    def test_first_check_reads_the_first_thirty_games_only(self):
        """30 games (the three shortest fixtures again under later start times): the check runs; a 31st
        game changes nothing in it."""
        human = os.path.join(self.tmp, "human-31")
        games = os.path.join(self.tmp, "games-31")
        for i in range(31):
            p = SHORTEST[i % len(SHORTEST)]
            gid = f"human-ws-{1000 + i}"
            write(os.path.join(games, gid, "frames.jsonl"),
                  as_person(p, gid, started=f"2026-10-{1 + i // 24:02d}T{i % 24:02d}:00:00Z"))
            if i == 29:
                quiet(HC.collect, games, human)
                r30, _ = self.run_eval([MODEL], human, self.data)
        quiet(HC.collect, games, human)
        r31, text = self.run_eval([MODEL], human, self.data)
        fc30, fc31 = r30["firstCheck"], r31["firstCheck"]
        self.assertIn(fc30["verdict"], ("BETTER THAN CORE", "WORSE THAN CORE", "NO DIFFERENCE DETECTED"))
        self.assertEqual(fc30["delta"]["groups"], 30)
        self.assertEqual(fc30, fc31)
        self.assertFalse(r31["descriptiveOnly"])
        self.assertIn("the pre-registered first check (D369): " + fc31["verdict"], text)


if __name__ == "__main__":
    unittest.main()
