# mtg-table — tools/ml tests: the outside exam -- r17 rows, the 17Lands reader, the exam's statistics (D359).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

- r17.py: the layout, our recordings' end-of-half-turn rows (one per turn from
  3, never the final turn; the two chairs of a game mirror each other), and the
  hidden-zone scrambler (nothing the viewer may not see moves a feature);
- ext17l.py on tests/data/17lands/sample.csv.gz (made up, in 17Lands' replay
  format; make_sample.py beside it says what each game holds): the half-turn
  order on the play and the draw, the final half-turn skipped, the qualifying
  share and its counts, tokens and unknown ids, the opponent's mirror rows,
  streaming a truncated file, and a resumed, size-checked download from a local
  server;
- dataset.py --schema r17: the queue's folders for one cube, the nights filter,
  exploring games left out by default, the deck-vocabulary filter;
- train_eval / evalnet with two card states, and the export round trip;
- outside_exam.py: the grouped bootstrap, the pre-registered verdict, and an
  end-to-end run in which flipping every 17Lands label changes no model's
  prediction (nothing is fitted on 17Lands).

The record and reader halves are standard library; the rest needs numpy.
"""
from __future__ import annotations

import copy
import gzip
import http.server
import json
import os
import random
import shutil
import sys
import tempfile
import threading
import unittest
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402
import ext17l as X  # noqa: E402
import r17 as R17  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

MINI = os.path.join(HERE, "data", "mini-cube.md")
SAMPLE = os.path.join(HERE, "data", "17lands", "sample.csv.gz")
CARDS = os.path.join(HERE, "data", "17lands", "cards.csv")
SYNERGY = os.path.join(ROOT, "cubes", "synergy-cube-180.md")
LAB = os.path.join(ROOT, "fixtures", "cubelab")
RECORDED = os.path.join(LAB, "recorded", "games", "7")


def _schema(path=MINI):
    return R17.R17Schema(E.Vocab.from_files([path]))


def _chairs():
    return [next(E.read_games(os.path.join(RECORDED, f"g1-seat{k}.jsonl.gz"))) for k in (0, 1)]


# ---------------------------------------------------------------- r17 on our recordings

class SchemaTest(unittest.TestCase):
    def test_layout(self):
        s = _schema()
        self.assertEqual(s.names[:4], ["turn", "round", "my_turn", "on_play"])
        self.assertEqual(s.card_offset, 4 + 4 + 8)
        self.assertEqual(s.n - s.card_offset, len(s.vocab.cards) * 2)
        self.assertEqual(s.names[s.card_index(s.vocab.slot("Soulherder"), "opp.battlefield")],
                         "card[Soulherder].opp.battlefield")
        js = s.to_json()
        self.assertEqual(js["cardStates"], R17.R17_STATES)
        self.assertEqual(js["schemaKind"], "r17")
        self.assertNotEqual(s.schema_id, E.Schema(s.vocab).schema_id)
        self.assertTrue(R17.is_r17([n for b in js["blocks"] if b["name"] != "cards" for n in
                                    (f["name"] for f in b["features"])]))

    def test_off_vocab_tokens_and_specials(self):
        s = _schema()
        P = R17.Permanent
        pos = R17.Position(5, True, 1, R17.Side(18, 3, [P("Island", True, basic=True), P("Watery Grave", True),
                                                       P("Soulherder", creature=True), P("Soulherder", creature=True,
                                                                                         token=True),
                                                       P("Sol Ring")]),
                           R17.Side(20, 4, [P(None, creature=True), P("Forest", True, basic=True)]))
        v = R17.encode_position(pos, s)
        get = lambda n: v[s.index[n]]  # noqa: E731
        self.assertEqual((get("me.lands"), get("me.nonland"), get("me.creatures"), get("me.other_nonland")),
                         (2, 3, 2, 2))   # the token Soulherder and Sol Ring are off-vocabulary
        self.assertEqual((get("opp.lands"), get("opp.nonland"), get("opp.other_nonland")), (1, 1, 1))
        self.assertEqual(v[s.card_index(s.vocab.slot("Soulherder"), "me.battlefield")], 1)
        for sp in E.SPECIALS:
            for st in R17.R17_STATES:
                self.assertEqual(v[s.card_index(s.vocab.special(sp), st)], 0)
        # non-basics: Watery Grave, Soulherder, token, Sol Ring, face-down -> 2 of 5 ours
        self.assertAlmostEqual(R17.vocab_share(pos, s), 2 / 5)
        empty = R17.Position(3, False, -1, R17.Side(20, 7, [P("Plains", True, basic=True)]), R17.Side(20, 7))
        self.assertEqual(R17.vocab_share(empty, s), 1.0)


class RecordingRowsTest(unittest.TestCase):
    """fixtures/cubelab/recorded: one synergy-cube game, both chairs."""

    @classmethod
    def setUpClass(cls):
        cls.schema = _schema(SYNERGY)
        cls.games = _chairs()
        cls.rows = [R17.encode_game(g, cls.schema) for g in cls.games]

    def test_one_row_per_turn_from_three_never_the_final_turn(self):
        _w, last_turn, labelled = E.game_outcome(self.games[0])
        self.assertTrue(labelled)
        for rows in self.rows:
            self.assertEqual([r.turn for r in rows], list(range(3, last_turn)))
            self.assertEqual({r.phase for r in rows}, {"EOT"})
            self.assertEqual([r.rows_to_end for r in rows], list(range(len(rows) - 1, -1, -1)))

    def test_rows_read_the_last_state_of_each_turn(self):
        g = self.games[0]
        last = {}
        for f in g.frames:
            if f.get("type") == "state" and isinstance((f.get("body") or {}).get("turn"), int):
                last[f["body"]["turn"]] = f
        ix = self.schema.index
        for r in self.rows[0]:
            st = last[r.turn]["body"]
            self.assertEqual(r.seq, last[r.turn]["seq"])
            me = next(p for p in st["players"] if p["id"] == g.seat)
            opp = next(p for p in st["players"] if p["id"] != g.seat)
            self.assertEqual(r.features[ix["me.life"]], me["life"])
            self.assertEqual(r.features[ix["opp.hand"]], opp["zones"]["hand"]["count"])
            self.assertEqual(r.features[ix["my_turn"]], 1.0 if st["activePlayer"] == g.seat else 0.0)
            lands = sum(1 for c in me["zones"]["battlefield"]["cards"] if "Land" in (c.get("types") or "").split(" - ")[0])
            self.assertEqual(r.features[ix["me.lands"]], lands)

    def test_two_chairs_mirror(self):
        a, b = self.rows
        s = self.schema
        self.assertEqual(len(a), len(b))
        swap = {}
        for n in s.names[:s.card_offset]:
            swap[n] = n.replace("me.", "@").replace("opp.", "me.").replace("@", "opp.")
        off = s.card_offset
        for ra, rb in zip(a, b):
            self.assertEqual(ra.label, -rb.label)
            for n in s.names[:off]:
                if n in ("my_turn",):
                    self.assertEqual(ra.features[s.index[n]], 1 - rb.features[s.index[n]])
                elif n == "on_play":
                    self.assertEqual(ra.features[s.index[n]], -rb.features[s.index[n]])
                else:
                    self.assertEqual(ra.features[s.index[n]], rb.features[s.index[swap[n]]], (ra.turn, n))
            ca, cb = ra.features[off:], rb.features[off:]
            self.assertEqual(ca[0::2], cb[1::2])
            self.assertEqual(ca[1::2], cb[0::2])
        self.assertIn(1.0, [r.features[s.index["on_play"]] for r in a + b])

    def test_hidden_zones_change_nothing(self):
        import test_encode as TE
        rng = random.Random(359)
        names = [n for n in self.schema.vocab.cards if n not in E.SPECIALS]
        for g, want in zip(self.games, self.rows):
            got = R17.encode_game(TE.scramble_hidden(g, rng, names), self.schema)
            self.assertEqual([r.features for r in got], [r.features for r in want])

    def test_negative_control_my_battlefield_moves_rows(self):
        g = copy.deepcopy(self.games[0])
        for f in g.frames:
            if f.get("type") == "state":
                for p in f["body"].get("players") or []:
                    if p.get("id") == g.seat:
                        for c in (p.get("zones") or {}).get("battlefield", {}).get("cards", []):
                            if "Land" not in (c.get("types") or ""):
                                c["name"] = "Sol Ring"   # not in the synergy cube
        got = R17.encode_game(g, self.schema)
        self.assertNotEqual([r.features for r in got], [r.features for r in self.rows[0]])

    def test_deck_vocab_share(self):
        s = self.schema
        self.assertEqual(R17.deck_vocab_share({"Island": 16, "Llanowar Elves": 1}, s), 1.0)
        self.assertAlmostEqual(R17.deck_vocab_share({"Plains": 9, "Llanowar Elves": 1, "Sol Ring": 3}, s), 0.25)


# ---------------------------------------------------------------- the 17Lands reader

class ReaderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cards = X.load_cards(CARDS)
        cls.schema = _schema()
        cls.games = list(X.iter_csv(SAMPLE))

    def positions(self, i):
        header, row = self.games[i]
        from collections import Counter
        unk = Counter()
        return X.game_positions(X.Layout(header), row, self.cards, unk), unk

    def test_cards_csv(self):
        self.assertTrue(self.cards["301"].token)
        self.assertEqual(self.cards["302"].name, "Bird, Soldier")
        self.assertTrue(self.cards["101"].basic)
        self.assertEqual(self.schema.vocab_slot(self.cards["108"].name), self.schema.vocab.slot("Clearwater Pathway"))

    def test_on_the_play_order_and_final_half_turn(self):
        (why, pos, last), _u = self.positions(0)
        self.assertEqual(why, "ok")
        self.assertEqual(last, 6)
        self.assertEqual([t for t, _ in pos], [3, 4, 5])
        self.assertEqual([p.my_turn for _, p in pos], [True, False, True])
        self.assertEqual({p.on_play for _, p in pos}, {1})
        t4 = pos[1][1]
        self.assertEqual((t4.me.life, t4.opp.life, t4.me.hand, t4.opp.hand), (20, 18, 5, 6))
        self.assertEqual([round(R17.vocab_share(p, self.schema), 3) for _, p in pos], [1.0, 0.667, 0.5])

    def test_on_the_draw_order(self):
        (why, pos, last), _u = self.positions(1)
        self.assertEqual((why, last), ("ok", 5))
        self.assertEqual([t for t, _ in pos], [3, 4])
        self.assertEqual([p.my_turn for _, p in pos], [False, True])
        self.assertEqual({p.on_play for _, p in pos}, {-1})
        self.assertEqual(pos[1][1].me.life, 17)

    def test_skips_and_unknown_ids(self):
        self.assertEqual(self.positions(2)[0][0], "no on_play")
        (why, pos, _l), _u = self.positions(3)
        self.assertEqual((why, pos), ("ok", []))   # its only half-turn >= 3 is its last
        (why, pos, _l), unk = self.positions(4)
        self.assertEqual(len(pos), 1)
        self.assertEqual(dict(unk), {"999": 1})
        self.assertEqual(R17.vocab_share(pos[0][1], self.schema), 0.0)   # a token and an unknown id

    def test_mirror(self):
        (_w, pos, _l), _u = self.positions(0)
        p = pos[0][1]
        m = X.mirror(p)
        self.assertEqual((m.my_turn, m.on_play, m.me, m.opp), (not p.my_turn, -p.on_play, p.opp, p.me))
        s = self.schema
        a, b = R17.encode_position(p, s), R17.encode_position(m, s)
        self.assertEqual(a[s.index["me.life"]], b[s.index["opp.life"]])
        self.assertEqual(a[s.card_offset::2], b[s.card_offset + 1::2])

    def test_streams_and_stops_at_the_last_whole_row(self):
        it = X.iter_csv(SAMPLE)
        self.assertTrue(hasattr(it, "__next__"))      # a generator: one row at a time
        with gzip.open(SAMPLE, "rb") as f:
            raw = f.read()
        body = gzip.compress(raw, mtime=0, compresslevel=0)   # stored blocks: a cut keeps its prefix
        tmp = tempfile.mkdtemp()
        try:
            for frac in (0.5, 0.75, 0.9):
                cut = os.path.join(tmp, "cut.csv.gz")
                with open(cut, "wb") as f:
                    f.write(body[: int(len(body) * frac)])
                text = zlib.decompressobj(16 + zlib.MAX_WBITS).decompress(body[: int(len(body) * frac)])
                whole = max(0, text.count(b"\n") - 1)          # complete lines after the header
                got = list(X.iter_csv(cut))
                self.assertEqual(len(got), whole, frac)
                self.assertLess(len(got), len(self.games))
                for (h, r), (h2, r2) in zip(got, self.games):
                    self.assertEqual((h, r), (h2, r2))
            # and in small chunks: a line split between two reads is put back together
            src = X.GzLines(SAMPLE, chunk=7)
            self.assertEqual("".join(src).encode(), raw)
            self.assertTrue(src.clean)
        finally:
            shutil.rmtree(tmp)

    def test_halves(self):
        halves = [X.half_of(f"{i:016x}") for i in range(2000)]
        self.assertEqual(halves, [X.half_of(f"{i:016x}") for i in range(2000)])
        self.assertTrue(900 < halves.count("test") < 1100)


class _RangeHandler(http.server.BaseHTTPRequestHandler):
    data = b""
    calls: list = []

    def log_message(self, *a):
        pass

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Length", str(len(self.data)))
        self.end_headers()

    def do_GET(self):
        rng = self.headers.get("Range")
        _RangeHandler.calls.append(rng)
        if rng:
            lo, _, hi = rng.split("=")[1].partition("-")
            lo, hi = int(lo), (int(hi) if hi else len(self.data) - 1)
            body = self.data[lo:hi + 1]
            self.send_response(206)
        else:
            body = self.data
            self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class DownloadTest(unittest.TestCase):
    def setUp(self):
        _RangeHandler.data = bytes(range(256)) * 400
        _RangeHandler.calls = []
        self.srv = http.server.HTTPServer(("127.0.0.1", 0), _RangeHandler)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.srv.server_port}/x.csv.gz"
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()
        shutil.rmtree(self.tmp)

    def test_resume_and_size_check(self):
        dest = os.path.join(self.tmp, "x.csv.gz")
        with open(dest + ".part", "wb") as f:
            f.write(_RangeHandler.data[:1000])
        info = X.download(self.url, dest, log=lambda *_: None)
        self.assertEqual(_RangeHandler.calls, ["bytes=1000-"])
        with open(dest, "rb") as f:
            self.assertEqual(f.read(), _RangeHandler.data)
        self.assertFalse(info["partial"])
        self.assertFalse(os.path.exists(dest + ".part"))
        X.download(self.url, dest, log=lambda *_: None)     # whole already: no request
        self.assertEqual(len(_RangeHandler.calls), 1)

    def test_range_read(self):
        dest = os.path.join(self.tmp, "y.csv.gz")
        info = X.download(self.url, dest, max_bytes=5000, log=lambda *_: None)
        self.assertTrue(info["partial"])
        self.assertEqual(os.path.getsize(dest), 5000)
        self.assertTrue(os.path.exists(dest + ".range"))
        self.assertEqual(_RangeHandler.calls, ["bytes=0-4999"])


# ---------------------------------------------------------------- numpy: datasets, the net, the exam

@unittest.skipIf(np is None, "numpy is not installed")
class R17DatasetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        cls.D = D
        cls.tmp = tempfile.mkdtemp()
        # a queue root: normal/synergy, two bridge folders (one names synergy), night plans
        cls.root = os.path.join(cls.tmp, "queue")
        for key, src in (("normal/synergy", "recorded"), ("bridge/synergy+vintage", "decisions"),
                         ("bridge/omega+pauper", "explore"), ("normal/vintage", "explore")):
            os.makedirs(os.path.dirname(os.path.join(cls.root, key)), exist_ok=True)
            shutil.copytree(os.path.join(LAB, src), os.path.join(cls.root, key))
        with open(os.path.join(cls.root, "night-1.json"), "w") as f:
            json.dump({"chunks": [{"key": "normal/synergy", "seed": 7, "drafts": 1}]}, f)
        cls.nohuman = os.path.join(cls.tmp, "no-human")
        os.makedirs(cls.nohuman)
        with open(os.path.join(cls.root, "night-2.json"), "w") as f:
            json.dump({"chunks": [{"key": "bridge/synergy+vintage", "seed": 100, "drafts": 5}]}, f)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_queue_logs(self):
        q = self.D.queue_logs(self.root, "synergy")
        self.assertEqual(sorted(os.path.relpath(p, self.root).split(os.sep)[:2] for p in q),
                         [["bridge", "synergy+vintage"]] * 2 + [["normal", "synergy"]] * 2)
        n1 = self.D.queue_logs(self.root, "synergy", [1])
        self.assertEqual(len(n1), 2)
        self.assertTrue(all("normal" in p for p in n1))
        self.assertEqual(len(self.D.queue_logs(self.root, "synergy", [1, 2])), 4)   # seed 101 is in 100..104
        self.assertEqual(len(self.D.queue_logs(self.root, "vintage")), 4)

    def stats(self, out):
        with open(os.path.join(out, "stats.json")) as f:
            return json.load(f)

    def test_cli_defaults_and_filters(self):
        out = os.path.join(self.tmp, "ds-syn")
        self.D.main(["--schema", "r17", "--queue-root", self.root, "--cube", "synergy", "--repo", ROOT,
                     "--out", out, "--human", self.nohuman])
        st = self.stats(out)
        self.assertEqual((st["schemaKind"], st["minTurn"], st["deckVocabMin"]), ("r17", 3, 0.5))
        self.assertEqual(st["games"], 4)
        self.assertEqual(st["playExplore"]["mode"], "exclude")
        with open(os.path.join(out, "features.json")) as f:
            self.assertEqual(f.read().count('"cardStates"'), 1)
        # vintage: the exploring folder's games are left out by default, kept on request
        out_v = os.path.join(self.tmp, "ds-vin")
        with self.assertRaises(SystemExit):   # every vintage-key game explored or has synergy decks: no rows
            self.D.main(["--schema", "r17", "--queue-root", self.root, "--cube", "vintage", "--repo", ROOT,
                         "--out", out_v, "--human", self.nohuman, "--nights", "3"])
        s = self.D.build(self.D.queue_logs(self.root, "vintage"), [SYNERGY], out_v, quiet=True, schema_kind="r17",
                         play_explore="exclude", deck_vocab_min=0.5)
        self.assertEqual(s["skippedGames"].get("play exploration: --play-explore exclude (D358)"), 2)
        # the deck filter: synergy decks against the mini vocabulary
        s2 = self.D.build(self.D.queue_logs(self.root, "synergy"), [MINI], os.path.join(self.tmp, "ds-mini"),
                          quiet=True, schema_kind="r17", deck_vocab_min=0.5)
        # the decisions copy's drafts.jsonl names its synergy decks: both chairs dropped; the recorded
        # fixture has no drafts.jsonl, so its decks are unknown and it is kept
        self.assertEqual(s2["skippedGames"], {"a deck under 0.5 inside the vocabulary (r17)": 2})
        self.assertEqual(s2["games"], 2)

    def test_d305_unchanged_by_default(self):
        out = os.path.join(self.tmp, "ds-d305")
        s = self.D.build([os.path.join(LAB, "recorded", "games")], [SYNERGY], out, quiet=True)
        self.assertNotIn("schemaKind", s)
        self.assertEqual(s["nFeatures"], E.Schema(E.Vocab.from_files([SYNERGY])).n)


def _ours(tmp: str, vocab: str = MINI) -> str:
    """An r17 dataset of every committed recording, for the exam's plumbing."""
    import dataset as D
    import reserved as R
    out = os.path.join(tmp, "ours")
    D.build([os.path.join(ROOT, "fixtures", "games"), os.path.join(LAB, "recorded", "games"),
             os.path.join(LAB, "decisions", "games")], [vocab], out, quiet=True, schema_kind="r17",
            reserved=R.reserved_decks(ROOT))
    return out


def _train(data: str, out: str, split_by: str = "pair") -> str:
    import evalnet as N
    import train_eval as T
    schema, names, splits = T.load_data(data, split_by)
    hp = dict(T.DEFAULTS, hidden="8", epochs=3, batch=64)
    net, info = T.fit(splits["train"], splits["val"], names, hp, len(schema["vocab"]["cards"]), "numpy", 0)
    N.save_model(out, net.to_json(schema, names, {"excluded": info["excluded"],
                                                  "training": {"data": data, "splitBy": split_by}}))
    return out


@unittest.skipIf(np is None, "numpy is not installed")
class R17NetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.data = _ours(cls.tmp, SYNERGY)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_two_states_train_export_and_reload(self):
        import evalnet as N
        import train_eval as T
        schema, names, splits = T.load_data(self.data, "pair")
        self.assertEqual(splits["train"].n_states, 2)
        path = _train(self.data, os.path.join(self.tmp, "m.json"))
        m, net = N.load_model(path)
        self.assertEqual(m["cardStates"], R17.R17_STATES)
        self.assertEqual(net.n_states, 2)
        self.assertEqual(net.W[0].shape[0], len(net.cols) + 2 * net.dim)
        r = splits["test"] if len(splits["test"]) else splits["train"]
        p = net.predict(r)
        self.assertTrue(np.all((p > 0) & (p < 1)))
        base = T.fit_baselines(splits["train"], splits["val"], names, epochs=5)
        self.assertEqual(sorted(base), ["board", "core", "life", "prior"])

    def test_gradient_with_two_states(self):
        import evalnet as N
        import train_eval as T
        schema, names, splits = T.load_data(self.data, "pair")
        tr = splits["train"].take(np.arange(min(40, len(splits["train"]))))
        net, _ = T.make_net(tr, names, {"hidden": "4", "dim": 3}, len(schema["vocab"]["cards"]), 1)
        net.E = np.random.default_rng(0).normal(0, 0.1, net.E.shape)
        _l, _ce, grads = net.loss_grad(tr, 1e-3, 1e-2)
        eps = 1e-6
        for pi, (p, g) in enumerate(zip(net.params(), grads)):
            flat = p.reshape(-1)
            for k in list(range(0, flat.size, max(1, flat.size // 5)))[:5]:
                old = flat[k]
                flat[k] = old + eps
                up = net.loss_grad(tr, 1e-3, 1e-2)[0]
                flat[k] = old - eps
                dn = net.loss_grad(tr, 1e-3, 1e-2)[0]
                flat[k] = old
                self.assertAlmostEqual((up - dn) / (2 * eps), g.reshape(-1)[k], places=5, msg=f"param {pi}[{k}]")


@unittest.skipIf(np is None, "numpy is not installed")
class ExtRowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.out = os.path.join(cls.tmp, "ext")
        cls.st = X.build(SAMPLE, X.load_cards(CARDS), [MINI], cls.out, perspective="both", quiet=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_counts(self):
        st = self.st
        self.assertEqual((st["games"], st["gamesWithPositions"], st["gamesWithRows"]), (5, 3, 2))
        self.assertEqual(st["skipped"], {"no on_play": 1})
        self.assertEqual(st["candidates"]["user"], {"positions": 6, ">=0.5": 5, ">=0.7": 2, ">=0.8": 2, ">=1": 2})
        self.assertEqual(st["rows"], {"dev.user": 3, "dev.oppo": 3, "test.user": 2, "test.oppo": 2})
        self.assertEqual((st["unknownIds"], st["maxGames"], st["partialDownload"]), (1, None, False))
        self.assertEqual(st["schemaId"], _schema().schema_id)
        self.assertIn("CC BY 4.0", st["source"])

    def test_rows(self):
        rows, share, persp, games = X.load_ext(self.out, 2)
        self.assertEqual(len(rows), 10)
        s = _schema()
        board = rows.board
        user = persp == 0
        g0 = user & (rows.game == 0)
        self.assertEqual(rows.turn[g0].tolist(), [3, 4, 5])
        self.assertEqual(rows.y[g0].tolist(), [1, 1, 1])
        self.assertEqual(rows.y[(persp == 1) & (rows.game == 0)].tolist(), [-1, -1, -1])
        g1 = user & (rows.game == 1)
        self.assertEqual(rows.y[g1].tolist(), [-1, -1])
        self.assertEqual(board[g1, s.index["my_turn"]].tolist(), [0, 1])
        self.assertEqual(board[g1, s.index["on_play"]].tolist(), [-1, -1])
        self.assertEqual(np.round(share[g0].astype(np.float64), 3).tolist(), [1.0, 0.667, 0.5])
        self.assertEqual([g["half"] for g in games], ["dev", "test"])
        # the mirror rows: me and opp swapped
        o0 = (persp == 1) & (rows.game == 0)
        self.assertEqual(board[o0, s.index["me.life"]].tolist(), board[g0, s.index["opp.life"]].tolist())

    def test_max_games_is_marked(self):
        st = X.build(SAMPLE, X.load_cards(CARDS), [MINI], os.path.join(self.tmp, "two"), max_games=2, quiet=True)
        self.assertEqual((st["games"], st["maxGames"]), (2, 2))


@unittest.skipIf(np is None, "numpy is not installed")
class ExamMathTest(unittest.TestCase):
    def test_bootstrap(self):
        import outside_exam as O
        d = np.full(30, 0.25)
        b = O.grouped_bootstrap(d, np.repeat(np.arange(10), 3), 200, 1)
        self.assertAlmostEqual(b["mean"], 0.25)
        self.assertAlmostEqual(b["lo"], 0.25)
        self.assertAlmostEqual(b["hi"], 0.25)
        self.assertEqual((b["groups"], b["rows"]), (10, 30))
        rng = np.random.default_rng(3)
        g = rng.normal(0, 1, 40)
        d = np.repeat(g, 10)                         # ten identical rows per game
        grouped = O.grouped_bootstrap(d, np.repeat(np.arange(40), 10), 2000, 5)
        rows = O.grouped_bootstrap(d, np.arange(400), 2000, 5)
        self.assertAlmostEqual(grouped["mean"], g.mean())
        self.assertGreater(grouped["hi"] - grouped["lo"], 2.5 * (rows["hi"] - rows["lo"]))
        self.assertEqual(grouped, O.grouped_bootstrap(d, np.repeat(np.arange(40), 10), 2000, 5))
        # unequal groups: the mean is per row (sum over rows / rows), not per game
        b = O.grouped_bootstrap(np.array([1.0, 1.0, 1.0, 0.0]), np.array([0, 0, 0, 1]), 50, 0)
        self.assertAlmostEqual(b["mean"], 0.75)

    def primary(self, rows, games, deltas, ll):
        mods = {m: {"all": {"logloss": v}} for m, v in ll.items()}
        return {"rows": rows, "games": games, "models": mods,
                "minusEval": {m: {"mean": a, "lo": lo, "hi": hi} for m, (a, lo, hi) in deltas.items()}}

    def test_verdict(self):
        import outside_exam as O
        ll = {"prior": 0.69, "life": 0.62, "board": 0.66, "core": 0.55, "eval": 0.58}
        good = {"prior": (0.11, 0.1, 0.12), "life": (0.04, 0.01, 0.07), "board": (0.08, 0.05, 0.1),
                "core": (-0.03, -0.05, -0.01)}
        v = O.verdict(self.primary(50000, 9000, good, ll), [])
        self.assertEqual((v["verdict"], v["bestSimpleRule"]), ("PASS", "life"))   # core is reported, never b*
        crosses = dict(good, life=(0.02, -0.001, 0.04))
        self.assertEqual(O.verdict(self.primary(50000, 9000, crosses, ll), [])["verdict"], "FAIL")
        v = O.verdict(self.primary(5000, 9000, good, ll), [])
        self.assertEqual(v["verdict"], "FAIL")
        self.assertIn("underpowered", v["why"])
        v = O.verdict(self.primary(50000, 1999, good, ll), [])
        self.assertIn("underpowered", v["why"])
        v = O.verdict(self.primary(50000, 9000, good, ll), ["a partial download"])
        self.assertEqual(v["verdict"], "NO VERDICT")
        self.assertEqual(O.EXAM_RULE["minShare"], 0.5)
        self.assertEqual(O.EXAM_RULE["simpleRules"], ("prior", "life", "board"))


@unittest.skipIf(np is None, "numpy is not installed")
class ExamEndToEndTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.data = _ours(cls.tmp, MINI)
        cls.model = _train(cls.data, os.path.join(cls.tmp, "m.json"))
        cls.ext = os.path.join(cls.tmp, "ext")
        X.build(SAMPLE, X.load_cards(CARDS), [MINI], cls.ext, perspective="both", quiet=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def run_exam(self, ext):
        import outside_exam as O
        with open(os.path.join(ext, "stats.json")) as f:
            st = json.load(f)
        if st["replay"] != O.EXAM_RULE["replay"]:      # the sample stands in for the rule's file
            st["replay"] = O.EXAM_RULE["replay"]
            with open(os.path.join(ext, "stats.json"), "w") as f:
                json.dump(st, f)
        return O.run(self.model, ext, log=lambda *_: None)

    def test_another_file_gives_no_verdict(self):
        import outside_exam as O
        other = os.path.join(self.tmp, "ext-trad")
        X.build(SAMPLE, X.load_cards(CARDS), [MINI], other, quiet=True)
        rep = O.run(self.model, other, log=lambda *_: None)
        self.assertEqual(rep["verdict"]["verdict"], "NO VERDICT")
        self.assertIn("secondary file", rep["verdict"]["why"])

    def test_report(self):
        rep = self.run_exam(self.ext)
        self.assertEqual(rep["primary"]["rows"], 2)          # d2b: the test half, the user's side
        self.assertEqual(rep["verdict"]["verdict"], "FAIL")
        self.assertIn("underpowered", rep["verdict"]["why"])
        self.assertEqual(sorted(rep["primary"]["models"]), ["board", "core", "eval", "life", "prior"])
        self.assertEqual(sorted(rep["secondary"]), ["all games", "dev half", "test, both perspectives",
                                                    "test, share >= 0.8"])
        self.assertEqual(rep["secondary"]["test, both perspectives"]["rows"], 4)
        self.assertIsNotNone(rep["transferGap"])
        # the runner's flat numbers (gate_metrics.py exam / ext)
        import gate_metrics as GM
        path = os.path.join(self.tmp, "exam.json")
        with open(path, "w") as f:
            json.dump(rep, f)
        m = GM.m_exam(path)
        self.assertEqual((m["written"], m["pass"], m["decided"], m["rows"], m["games"]), (1, 0, 1, 2, 1))
        e = GM.m_ext(self.ext)
        self.assertEqual((e["games"], e["positions"], e["q50"], e["q80"], e["testUserRows"]), (5, 6, 5, 2, 2))
        self.assertEqual(GM.m_exam(os.path.join(self.tmp, "none.json")), {"written": 0})

    def test_nothing_is_fitted_on_17lands(self):
        import dataset as D
        flipped = os.path.join(self.tmp, "ext-flipped")
        shutil.copytree(self.ext, flipped)
        for fn in os.listdir(flipped):
            if fn.startswith("ext-") and fn.endswith(".npz"):
                with np.load(os.path.join(flipped, fn)) as z:
                    arrs = {k: z[k] for k in z.files}
                arrs["y"] = -arrs["y"]
                D.savez_fixed(os.path.join(flipped, fn), arrs)
        a, b = self.run_exam(self.ext), self.run_exam(flipped)
        for name in ("primary",):
            for m in a[name]["models"]:
                pa = [r["predicted"] for r in a[name]["models"][m]["reliability"]]
                pb = [r["predicted"] for r in b[name]["models"][m]["reliability"]]
                self.assertEqual(pa, pb, m)
        self.assertNotEqual(a["primary"]["models"]["eval"]["all"]["logloss"],
                            b["primary"]["models"]["eval"]["all"]["logloss"])

    def test_refuses_another_vocabulary(self):
        import outside_exam as O
        other = os.path.join(self.tmp, "ext-syn")
        X.build(SAMPLE, X.load_cards(CARDS), [SYNERGY], other, quiet=True)
        with self.assertRaises(SystemExit):
            O.run(self.model, other, log=lambda *_: None)


if __name__ == "__main__":
    unittest.main()
