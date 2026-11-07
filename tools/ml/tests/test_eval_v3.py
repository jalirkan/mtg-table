# mtg-table — tools/ml tests: evaluator v3's tooling (D518): merging encoded datasets (dataset_merge.py) and
# holding a share of each game's rows at load (train_eval.py --load-subsample).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

Needs numpy (skipped without it).  The datasets here are made-up "nights" in
dataset.py's own format -- shards cut by savez_fixed, games.jsonl, stats.json,
features.json -- whose rows are real encoded rows of the committed fixtures,
so evalnet's loader and the trainer read them as they read a real night.  A
night has more than 20 deck pairs, so train_eval's pair split is the hash rule
(assign_pairs), as on the PC.
"""
from __future__ import annotations

import io
import json
import math
import os
import shutil
import sys
import tempfile
import unittest
from collections import Counter
from contextlib import redirect_stderr, redirect_stdout
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import split_audit as A  # noqa: E402
import train_eval as T  # noqa: E402

try:
    import numpy as np
except ImportError:
    np = None

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
KEYS = ("X", "y", "turn", "turns_to_end", "rows_to_end", "active", "game")


def quiet(*_a, **_k):
    pass


def night_spec(night: int, keys: list[str], seeds: range, tag: str = "") -> list[dict[str, Any]]:
    """Games of a made-up queue night: each (key, seed) a draft, both chairs; the pair is `cubelab <seed> A|B`."""
    out = []
    for key in keys:
        for s in seeds:
            for chair in (0, 1):
                out.append({"game_key": f"{tag}{key}|{s}|{chair}|n{night}", "match": f"cubelab {s} A|cubelab {s} B",
                            "file": f"var/cubelab/queue/{key}/games/{s}/g1-seat{chair}.jsonl.gz", "seat": chair,
                            "night": night, "rows": 3 + (s * 7 + chair * 5 + len(key)) % 23,
                            "label": 1 if (s + chair) % 2 else -1})
    return out


def write_dataset(d: str, base: dict[str, Any], features: str, spec: list[dict[str, Any]], shard_rows: int = 37,
                  extra_stats: dict[str, Any] | None = None) -> str:
    """dataset.py's directory for `spec`'s games, rows cycled from `base` (real encoded rows), split as dataset.py
    splits (group by match), shards of `shard_rows` that cut games across files, stats.json last."""
    import dataset as D
    os.makedirs(d, exist_ok=True)
    shutil.copyfile(features, os.path.join(d, "features.json"))
    nb = len(base["y"])
    games, per = [], {s: [] for s in D.SPLITS}
    cursor = 0
    stats = {s: {"rows": 0, "games": 0, "labels": Counter(), "rowLabels": Counter()} for s in D.SPLITS}
    for i, g in enumerate(spec):
        c = int(g["rows"])
        split = D.split_of("match:" + g["match"], (80, 10, 10))
        idx = (np.arange(c) + cursor) % nb
        cursor += c
        arr = {"X": base["X"][idx], "y": np.full(c, g["label"], np.int8), "turn": base["turn"][idx],
               "turns_to_end": base["turns_to_end"][idx], "rows_to_end": (c - 1 - np.arange(c)).astype(np.int16),
               "active": base["active"][idx], "game": np.full(c, i, np.int32)}
        per[split].append(arr)
        games.append({"index": i, "game_key": g["game_key"], "split_group": "match:" + g["match"], "split": split,
                      "file": g["file"], "seat": g["seat"], "rows": c, "label": g["label"], "last_turn": 9,
                      "match": g["match"], "game_group": f"seed:{g['match']}", "ver": "v", "source": "lab",
                      **({"explore": True} if g.get("explore") else {}), "night": g["night"]})
        stats[split]["rows"] += c
        stats[split]["games"] += 1
        stats[split]["labels"][str(g["label"])] += 1
        stats[split]["rowLabels"][str(g["label"])] += c
    shard_no = {}
    for s in D.SPLITS:
        if not per[s]:
            shard_no[s] = 0
            continue
        cat = {k: np.concatenate([a[k] for a in per[s]]) for k in KEYS}
        n = 0
        for lo in range(0, len(cat["y"]), shard_rows):
            D.savez_fixed(os.path.join(d, f"{s}-{n:05d}.npz"), {k: cat[k][lo:lo + shard_rows] for k in KEYS})
            n += 1
        shard_no[s] = n
    with open(os.path.join(d, "games.jsonl"), "w", encoding="utf-8") as f:
        for g in games:
            f.write(json.dumps(g) + "\n")
    with open(features, encoding="utf-8") as f:
        ft = json.load(f)
    nights = Counter(str(g["night"]) for g in spec)
    summary = {"schemaId": ft["schemaId"], "nFeatures": ft["nFeatures"], "vocab": ["fixture"], "vocabSize": 9,
               "phases": ["MAIN1"], "groupBy": "match", "split": {"train": 80, "val": 10, "test": 10}, "salt": "",
               "rows": sum(stats[s]["rows"] for s in D.SPLITS), "games": len(games), "skippedGames": {"unlabelled": 1},
               "reservedChecked": True, "reservedDecks": 120, "reservedHits": {}, "versions": {"v": len(games)},
               "sources": {"lab": len(games)}, "humanDirs": [], "humanInTraining": False,
               "playExplore": {"mode": "include", "games": sum(1 for g in spec if g.get("explore"))},
               "nights": dict(sorted(nights.items())),
               "splits": {s: {"rows": stats[s]["rows"], "games": stats[s]["games"],
                              "groups": len({g["split_group"] for g in games if g["split"] == s}),
                              "gameLabels": dict(stats[s]["labels"]), "rowLabels": dict(stats[s]["rowLabels"]),
                              "shards": shard_no[s]} for s in D.SPLITS}}
    summary.update(extra_stats or {})
    with open(os.path.join(d, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1)
    return d


def rj(path: str) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def wj(path: str, obj: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f)


def sha(path: str) -> str:
    import hashlib
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


@unittest.skipIf(np is None, "numpy is not installed")
class EvalV3ToolingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import dataset as D
        cls.D = D
        cls.tmp = tempfile.mkdtemp()
        fx = os.path.join(cls.tmp, "fixtures")
        D.build([FIXTURES], [os.path.join(ROOT, "decks", "pacho-shield.dck"), MINI_CUBE], fx, (60, 20, 20), quiet=True)
        parts = [D.load(fx, s) for s in D.SPLITS]
        cls.base = {k: np.concatenate([p[k] for p in parts]) for k in KEYS}
        cls.features = os.path.join(fx, "features.json")
        keys = ["normal/synergy", "normal/vintage", "bridge/synergy+vintage"]
        # nights 1-3 and nights 4-5, as on the PC: no (key, seed) in both, but seed numbers reused by other keys
        cls.spec13 = night_spec(1, keys, range(1, 31)) + night_spec(2, keys[:2], range(31, 51)) \
            + night_spec(3, keys[2:], range(1, 21))
        cls.spec45 = night_spec(4, ["normal/omega"], range(1, 11)) + night_spec(5, keys, range(101, 131))
        cls.a = write_dataset(os.path.join(cls.tmp, "n13"), cls.base, cls.features, cls.spec13)
        cls.b = write_dataset(os.path.join(cls.tmp, "n45"), cls.base, cls.features, cls.spec45, shard_rows=53)
        cls.only45 = night_spec(5, keys, range(101, 131))   # no seed shared with n13
        cls.c = write_dataset(os.path.join(cls.tmp, "n5"), cls.base, cls.features, cls.only45, shard_rows=29)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def merge(self, srcs, name, **kw):
        import dataset_merge as M
        out = os.path.join(self.tmp, name)
        M.merge(srcs, out, log=quiet, **kw)
        return out

    def refused(self, srcs, name, **kw):
        import dataset_merge as M
        with self.assertRaises(M.Refused) as cm:
            M.merge(srcs, os.path.join(self.tmp, name), log=quiet, **kw)
        self.assertFalse(os.path.isfile(os.path.join(self.tmp, name, "stats.json")))
        return str(cm.exception)

    # -- dataset_merge.py

    def test_merge_is_the_concatenation(self):
        out = self.merge([self.a, self.c], "m-ac")
        D = self.D
        ga, gc, gm = A.read_games(self.a), A.read_games(self.c), A.read_games(out)
        self.assertEqual(len(gm), len(ga) + len(gc))
        self.assertEqual([g["index"] for g in gm], list(range(len(gm))))
        for g, src in zip(gm, ga + gc):        # every field but the index as it was, in source order
            self.assertEqual({k: v for k, v in g.items() if k != "index"}, {k: v for k, v in src.items() if k != "index"})
        for s in D.SPLITS:                     # every row, byte for byte; the later source's game ids moved up
            la, lc, lm = D.load(self.a, s), D.load(self.c, s), D.load(out, s)
            for k in KEYS:
                want = np.concatenate([la[k], lc[k] + (len(ga) if k == "game" else 0)])
                self.assertTrue(np.array_equal(lm[k], want), (s, k))
                self.assertEqual(lm[k].dtype, la[k].dtype)
        # the first source's shards are its files, byte for byte
        for s in D.SPLITS:
            fa = sorted(f for f in os.listdir(self.a) if f.startswith(s + "-"))
            for f in fa:
                self.assertEqual(sha(os.path.join(self.a, f)), sha(os.path.join(out, f)))
        with open(self.a + "/features.json", "rb") as f1, open(out + "/features.json", "rb") as f2:
            self.assertEqual(f1.read(), f2.read())
        st, sa, sc = (rj(os.path.join(d, "stats.json")) for d in (out, self.a, self.c))
        self.assertEqual(st["rows"], sa["rows"] + sc["rows"])
        self.assertEqual(st["games"], sa["games"] + sc["games"])
        for s in D.SPLITS:
            self.assertEqual(st["splits"][s]["rows"], sa["splits"][s]["rows"] + sc["splits"][s]["rows"])
            self.assertEqual(st["splits"][s]["games"], sa["splits"][s]["games"] + sc["splits"][s]["games"])
            self.assertEqual(st["splits"][s]["shards"], sa["splits"][s]["shards"] + sc["splits"][s]["shards"])
        self.assertEqual(st["nights"], {"1": 180, "2": 80, "3": 40, "5": 180})
        self.assertEqual(st["skippedGames"], {"unlabelled": 2})
        self.assertTrue(st["reservedChecked"])
        self.assertEqual(st["merged"]["sharedPairs"], 0)
        man = rj(os.path.join(out, "merge.json"))
        self.assertEqual([x["path"] for x in man["sources"]], [self.a, self.c])
        self.assertEqual(man["sources"][0]["games.jsonl"], sha(os.path.join(self.a, "games.jsonl")))
        self.assertEqual(man["sources"][1]["gameOffset"], len(ga))
        # the merged dataset loads and trains like any other (the pair split, train_eval's loader)
        _s, _n, sp = T.load_data(out, "pair")
        self.assertEqual(sum(len(r) for r in sp.values()), st["rows"])

    def test_split_preserved_and_audited(self):
        out = self.merge([self.a, self.b], "m-ab", allow_shared_seeds=True)
        ga, gb, gm = A.read_games(self.a), A.read_games(self.b), A.read_games(out)
        sm = T.game_splits(gm, "pair")
        self.assertEqual(sm, T.game_splits(ga, "pair") + T.game_splits(gb, "pair"))    # no game moves
        self.assertEqual([g["split"] for g in gm], [g["split"] for g in ga + gb])
        r = A.audit(out, "pair", self.a)            # J196's audit: every nights-1-3 game present, in its old split
        self.assertTrue(r["pass"], r["failures"])
        self.assertEqual((r["reference"]["missingGames"], r["reference"]["gamesMovedSplit"],
                          r["reference"]["dataTestPairsTrainedOnByReference"]), (0, 0, 0))
        # a shared seed joins its pair: the pair's games from both sources are in one split
        shared = {T.pair_key(g) for g in ga} & {T.pair_key(g) for g in gb}
        self.assertEqual(len(shared), 10)            # seeds 1-10: nights 1-3's and night 4's omega
        for k in shared:
            self.assertEqual(len({s for g, s in zip(gm, sm) if T.pair_key(g) == k}), 1)
        st = rj(os.path.join(out, "stats.json"))
        self.assertEqual((st["merged"]["sharedPairs"], st["merged"]["allowSharedSeeds"], st["merged"]["gamesMovedSplit"]),
                         (10, True, 0))

    def test_refusals(self):
        import dataset_merge as M
        msg = self.refused([self.a, self.b], "r-shared")                           # shared seeds, no flag
        self.assertIn("--allow-shared-seeds", msg)
        dup = write_dataset(os.path.join(self.tmp, "dup"), self.base, self.features,
                            self.spec13[:60] + night_spec(6, ["normal/x"], range(900, 930)))
        self.assertIn("in two sources", self.refused([self.a, dup], "r-dup", allow_shared_seeds=True))  # same games
        # another schema: features.json differs
        other = os.path.join(self.tmp, "other-schema")
        shutil.copytree(self.c, other)
        ft = rj(os.path.join(other, "features.json"))
        ft["schemaId"] = "0" * 16
        wj(os.path.join(other, "features.json"), ft)
        self.assertIn("features.json", self.refused([self.a, other], "r-schema"))
        # a source of fewer than 20 pairs is split by rank: its games would move in the merge
        small = write_dataset(os.path.join(self.tmp, "small"), self.base, self.features,
                              night_spec(7, ["normal/y"], range(500, 506)))
        self.assertRegex(self.refused([self.a, small], "r-small"), r"pair (train|val|test)->")
        # a game whose recorded split is not dataset.py's hash of its group (a hand-edited games.jsonl)
        planted = os.path.join(self.tmp, "planted")
        shutil.copytree(self.c, planted)
        gp = A.read_games(planted)
        gp[3]["split"] = {"train": "test", "val": "train", "test": "train"}[gp[3]["split"]]
        with open(os.path.join(planted, "games.jsonl"), "w", encoding="utf-8") as f:
            for g in gp:
                f.write(json.dumps(g) + "\n")
        self.assertIn("is not dataset.py's hash", self.refused([self.a, planted], "r-planted"))
        # a damaged source: its stats.json says more rows than its shards hold
        bad = os.path.join(self.tmp, "bad")
        shutil.copytree(self.c, bad)
        st = rj(os.path.join(bad, "stats.json"))
        st["splits"]["train"]["rows"] += 1
        wj(os.path.join(bad, "stats.json"), st)
        self.assertIn("damaged", self.refused([self.a, bad], "r-bad"))
        # an incomplete source, one source, the output inside a source
        inc = os.path.join(self.tmp, "incomplete")
        shutil.copytree(self.c, inc)
        os.remove(os.path.join(inc, "stats.json"))
        self.assertIn("no stats.json", self.refused([self.a, inc], "r-inc"))
        self.assertIn("two or more", self.refused([self.a], "r-one"))
        with self.assertRaises(M.Refused):
            M.merge([self.a, self.c], os.path.join(self.a, "inside"), log=quiet)
        # the CLI: 2 refused, 0 merged; the output the same for any --jobs
        with redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            self.assertEqual(M.main([self.a, self.b, "--out", os.path.join(self.tmp, "r-cli")]), 2)
            o1, o2 = os.path.join(self.tmp, "cli-1"), os.path.join(self.tmp, "cli-2")
            self.assertEqual(M.main([self.a, self.b, "--out", o1, "--allow-shared-seeds"]), 0)
            self.assertEqual(M.main([self.a, self.b, "--out", o2, "--allow-shared-seeds", "--jobs", "2"]), 0)
        for f in sorted(os.listdir(o1)):
            if f.endswith(".npz") or f == "games.jsonl":
                self.assertEqual(sha(os.path.join(o1, f)), sha(os.path.join(o2, f)), f)

    # -- train_eval.py --load-subsample

    def test_load_subsample_keeps_a_share_of_every_game(self):
        out = self.merge([self.a, self.b], "m-load", allow_shared_seeds=True)
        games = T.read_games(out)
        _s, _n, full = T.load_data(out, "pair")
        for f in (0.25, 0.5, 0.33):
            _s, _n, q = T.load_data(out, "pair", load_subsample=f, seed=0)
            for s in ("train", "val"):
                per = np.bincount(q[s].game, minlength=len(games))
                whole = np.bincount(full[s].game, minlength=len(games))
                present = np.nonzero(whole)[0]
                self.assertTrue(np.array_equal(np.nonzero(per)[0], present), (f, s))          # every game is there
                self.assertTrue(np.array_equal(per[present], np.ceil(whole[present] * f).astype(int)), (f, s))
            for k in ("board", "indptr", "slot", "state", "count", "y", "turn", "game"):         # test is whole
                self.assertTrue(np.array_equal(getattr(q["test"], k), getattr(full["test"], k)), (f, k))
            ratio = len(q["train"]) / len(full["train"])
            self.assertTrue(f <= ratio < f + 0.15, (f, ratio))
        # the held rows are the full split's rows at load_keep's positions, in order (nothing else changes)
        _s, _n, q = T.load_data(out, "pair", load_subsample=0.25, seed=0, rows_to_end=True)
        _s, _n, fr = T.load_data(out, "pair", rows_to_end=True)
        keep = T.load_keep(games, 0.25, 0)
        g, rte = fr["train"].game.astype(np.int64), fr["train"].rte.astype(np.int64)
        sel = np.nonzero(keep["mask"][keep["offset"][g] + keep["rows"][g] - 1 - rte])[0]
        for k in ("board", "y", "turn", "game", "rte"):
            self.assertTrue(np.array_equal(getattr(fr["train"], k)[sel], getattr(q["train"], k)), k)
        sub = fr["train"].take(sel)            # the card cells too
        for k in ("indptr", "slot", "state", "count"):
            self.assertTrue(np.array_equal(getattr(sub, k), getattr(q["train"], k)), k)
        # deterministic per game and seed: again the same; another seed other rows; the same game in another
        # dataset (its source) keeps the same rows
        _s, _n, again = T.load_data(out, "pair", load_subsample=0.25, seed=0, rows_to_end=True)
        self.assertTrue(np.array_equal(again["train"].rte, q["train"].rte))
        _s, _n, s1 = T.load_data(out, "pair", load_subsample=0.25, seed=1, rows_to_end=True)
        self.assertFalse(np.array_equal(s1["train"].rte, q["train"].rte))
        _s, _n, qb = T.load_data(self.b, "pair", load_subsample=0.25, seed=0, rows_to_end=True)
        off = len(A.read_games(self.a))
        mine = q["train"].game >= off
        self.assertTrue(np.array_equal(q["train"].rte[mine], qb["train"].rte))
        self.assertTrue(np.array_equal(q["train"].game[mine] - off, qb["train"].game))
        # the draw is systematic: m rows c/m apart from the game's own start
        for gi in range(0, len(games), 37):
            c = int(games[gi]["rows"])
            m = math.ceil(c * 0.25)
            u = T.load_start(games[gi]["game_key"], 0)
            want = sorted((u + j * (1 << 20)) * c // (m * (1 << 20)) for j in range(m))
            lo = keep["offset"][gi]
            self.assertEqual(np.nonzero(keep["mask"][lo:lo + c])[0].tolist(), want)
        # --compact holds the same numbers
        _s, _n, qc = T.load_data(out, "pair", load_subsample=0.25, seed=0, compact=True)
        self.assertTrue(np.array_equal(qc["train"].board[np.arange(len(qc["train"]))], q["train"].board))

    def test_load_subsample_cli(self):
        out = self.merge([self.a, self.c], "m-cli")
        rep0, rep1, rep5 = (os.path.join(self.tmp, f"rep-{x}.json") for x in ("0", "1", "5"))
        m1, m0 = os.path.join(self.tmp, "m1.json"), os.path.join(self.tmp, "m0.json")
        common = ["--epochs", "2", "--hidden", "4", "--dim", "2", "--batch", "64"]
        with redirect_stdout(io.StringIO()):
            T.main([out, *common, "--report", rep0, "--out", m0])
            T.main([out, *common, "--load-subsample", "1", "--report", rep1, "--out", m1])
            T.main([out, *common, "--load-subsample", "0.5", "--subsample", "0.5", "--report", rep5,
                    "--out", os.path.join(self.tmp, "m5.json")])
        r0, r1, r5 = (rj(p) for p in (rep0, rep1, rep5))
        self.assertNotIn("loadSubsample", r1)                       # 1 is today's path: the same numbers
        self.assertEqual(r0["models"], r1["models"])
        self.assertEqual(r0["fit"], {**r1["fit"], "seconds": r0["fit"]["seconds"]})
        j0, j1 = rj(m0), rj(m1)
        j0["training"].pop("date"), j1["training"].pop("date")
        self.assertEqual(j0, j1)                                    # the same model file but its date
        ls = r5["loadSubsample"]
        self.assertEqual((ls["share"], ls["seed"]), (0.5, 0))
        self.assertEqual(ls["rowsHeld"]["test"], ls["rowsInData"]["test"])
        self.assertLess(ls["rowsHeld"]["train"], ls["rowsInData"]["train"])
        self.assertEqual(r5["rows"]["test"], r0["rows"]["test"])
        self.assertEqual(r5["games"], r0["games"])                  # every game is still there
        self.assertIn("loadSubsample", rj(os.path.join(self.tmp, "m5.json"))["training"])
        dry = os.path.join(self.tmp, "dry.json")
        with redirect_stdout(io.StringIO()):
            T.main([out, "--load-subsample", "0.5", "--dry-load", "--hidden", "4", "--dim", "2", "--batch", "64",
                    "--report", dry])
        d = rj(dry)
        self.assertTrue(d["dryLoad"])
        self.assertEqual(d["rows"]["train"], ls["rowsHeld"]["train"])
        for bad in (["--load-subsample", "0"], ["--load-subsample", "1.5"], ["--load-subsample", "0.5", "--cv", "2"],
                    ["--load-subsample", "0.5", "--curve", "0.5,1"]):
            with self.assertRaises(SystemExit):
                T.main([out, *bad])


if __name__ == "__main__":
    unittest.main()
