# mtg-table — tools/ml tests: the search's error analysis (D367).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""search_errors.py on the committed decision recording (fixtures/cubelab/decisions/,
D347), the engine-made review report of fixtures/games/human-auto-42.jsonl
(tests/data/review-human-auto-42.json, D353) and small synthetic truth tables
and ladder results whose answers are known.  Standard library; the evaluator
case needs numpy and skips without it."""
from __future__ import annotations

import filecmp
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ML = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(ML))
sys.path.insert(0, ML)
import search_errors as SE  # noqa: E402

DEC = os.path.join(REPO, "fixtures", "cubelab", "decisions")
SEAT0 = os.path.join(DEC, "games", "101", "g1-seat0.jsonl.gz")
REVIEW = os.path.join(HERE, "data", "review-human-auto-42.json")
MODEL = os.path.join(REPO, "fixtures", "eval", "model.json")


def write_jsonl(path: str, rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def opt(tok, w, forge=False, half=0.02, rlo=0.0, rhi=0.0, n=200):
    return {"token": tok, "winRate": w, "n": n, "forge": forge, "winLo": w - half, "winHi": w + half,
            "regretLo": rlo, "regretHi": rhi}


def truth_fixture(d: str) -> dict[str, str]:
    """Three decisions of the committed search game (seat 0) with known truth and ranker answers.

    frame 25  spell: recorded override pass -> cast:18 (search).  truth: pass .40, cast:18 .55, cast:37 .45
              rank3 picks cast:37 (helped vs Forge, regret .10); rank12 picks cast:18 (a flip, 12 better)
    frame 120 attack: recorded attack:19 (Forge's).  truth: attack:none .70, attack:19 .50 (a clear mistake)
              rank3 and rank12 pick attack:none (helped)
    frame 163 block: recorded block:38>143 (Forge's). truth: block:38>143 .30, block:38>79 .10, block:none .50
              rank3 and rank12 pick block:38>79 (harmful)"""
    rel = os.path.relpath(SEAT0, REPO)
    s = [{"id": "d25", "log": rel, "frame": 25, "stratum": "spell", "seat": 0, "by": "search", "chosen": "cast:18",
          "turn": 2, "phase": "MAIN1"},
         {"id": "d120", "log": rel, "frame": 120, "stratum": "attack", "seat": 0, "by": "search", "chosen": "attack:19",
          "turn": 6, "phase": "COMBAT_DECLARE_ATTACKERS"},
         {"id": "d163", "log": rel, "frame": 163, "stratum": "block", "seat": 0, "by": "search", "chosen": "block:38>143",
          "turn": 7, "phase": "COMBAT_DECLARE_BLOCKERS"}]
    truth = [{"id": "d25", "status": "ok", "measure": "wins", "options": [
                 opt("pass", 0.40, True, rlo=0.10, rhi=0.20), opt("cast:18", 0.55), opt("cast:37", 0.45, rlo=0.05, rhi=0.15)]},
             {"id": "d120", "status": "ok", "measure": "wins", "options": [
                 opt("attack:none", 0.70), opt("attack:19", 0.50, True, rlo=0.10, rhi=0.30)]},
             {"id": "d163", "status": "ok", "measure": "wins", "options": [
                 opt("block:38>143", 0.30, True, rlo=0.10, rhi=0.30), opt("block:38>79", 0.10, rlo=0.30, rhi=0.50),
                 opt("block:none", 0.50)]}]
    r3 = [{"id": "d25", "status": "ok", "measure": "leaf", "options": [
              opt("pass", 0.50, True), opt("cast:18", 0.52), opt("cast:37", 0.60)]},
          {"id": "d120", "status": "ok", "measure": "leaf", "options": [opt("attack:none", 0.70), opt("attack:19", 0.60, True)]},
          {"id": "d163", "status": "ok", "measure": "leaf", "options": [
              opt("block:38>143", 0.40, True), opt("block:38>79", 0.60), opt("block:none", 0.30)]}]
    r12 = json.loads(json.dumps(r3))
    r12[0]["options"][1]["winRate"] = 0.70
    paths = {k: os.path.join(d, k + ".jsonl") for k in ("set", "truth", "r3", "r12")}
    write_jsonl(paths["set"], s)
    write_jsonl(paths["truth"], truth)
    write_jsonl(paths["r3"], r3)
    write_jsonl(paths["r12"], r12)
    return paths


def ladder_fixture(d: str) -> str:
    """One SPRT, A = 'x' (sometimes as ai-bench's config B), 16 games on two cubes: A loses every pauper game."""
    os.makedirs(os.path.join(d, "results"))
    recs = []
    for pair, cube in ((0, "pauper"), (1, "vintage")):
        for g in range(8):
            a_is_a = g % 2 == 0
            a_won = cube == "vintage"
            w = ("a" if a_won else "b") if a_is_a else ("b" if a_won else "a")
            recs.append({"v": 1, "id": f"h:r:0:{pair}:{g}", "at": "2026-10-04T00:00:00Z", "host": "h", "run": "r", "batch": 0,
                         "purpose": "sprt:h:r", "a": "x" if a_is_a else "y", "b": "y" if a_is_a else "x",
                         "ah": "hx" if a_is_a else "hy", "bh": "hy" if a_is_a else "hx", "ac": "", "bc": "", "set": "s",
                         "pair": pair, "g": g, "seed": 1, "bseed": 1,
                         "aDeck": f"tools/ai-bench/decks/sets/{cube}-900000001-A.dck", "bDeck": "", "aSeat": g % 2,
                         "w": w, "turns": 10 + g, "ms": 1, "timeout": False, "error": False})
    write_jsonl(os.path.join(d, "results", "h.jsonl"), recs)
    write_jsonl(os.path.join(d, "sprt.jsonl"), [{"v": 1, "id": "h:r", "a": "x", "b": "y", "ah": "hx", "bh": "hy", "elo0": 0,
                                                 "elo1": 20, "result": "inconclusive", "games": 16, "pairs": 8, "score": 0.5,
                                                 "llr": 0.1, "lower": -2.9, "upper": 2.9}])
    return d


def run(out: str, *args: str) -> dict:
    """The CLI from the repo root (hard rule 9); its summary.json."""
    import contextlib
    import io
    cwd = os.getcwd()
    os.chdir(REPO)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            SE.main(["--name", "t", "--out", out, "--parquet", "off", "--boot", "200", *args])
    finally:
        os.chdir(cwd)
    with open(os.path.join(out, "summary.json"), encoding="utf-8") as f:
        return json.load(f)


def table(out: str, name: str) -> list[dict]:
    import csv
    with open(os.path.join(out, "tables", name + ".csv"), encoding="utf-8") as f:
        return list(csv.DictReader(f))


class Tokens(unittest.TestCase):
    def test_norm_and_cards(self):
        self.assertEqual(SE.norm_token("attack:38,19,140"), "attack:19,38,140")
        self.assertEqual(SE.norm_token("block:140>79,38>143"), "block:38>143,140>79")
        self.assertEqual(SE.norm_token("attack:none"), "attack:none")
        self.assertEqual(SE.token_cards("cast:18"), [(18, "cast")])
        self.assertEqual(SE.token_cards("activate:18#1"), [(18, "activate")])
        self.assertEqual(SE.token_cards("block:38>143"), [(38, "block"), (143, "facing")])
        self.assertEqual(SE.token_cards("pass"), [])
        self.assertEqual(SE.token_cards("target:p1"), [])

    def test_kind_buckets_phase(self):
        self.assertEqual(SE.decision_kind("priority", ["pass", "cast:3"]), "spell")
        self.assertEqual(SE.decision_kind("priority", ["pass", "land:3"]), "other")
        self.assertEqual(SE.decision_kind("target", ["target:1"]), "other")
        self.assertEqual(SE.decision_kind(None, [], "attack"), "attack")
        self.assertEqual(SE.turn_bucket(5), "4-6")
        self.assertEqual(SE.turn_bucket(14), "13+")
        self.assertEqual(SE.phase_group("COMBAT_DECLARE_BLOCKERS"), "combat")

    def test_redacted_card_is_never_named(self):
        st = {"players": [{"zones": {"hand": {"cards": [{"id": 5, "hidden": True, "zone": "hand", "owner": 1, "controller": 1},
                                                         {"id": 6, "name": "Bolt", "types": "Instant", "manaCost": "{R}"}]}}}]}
        idx = SE.card_index(st)
        self.assertNotIn(5, idx)
        self.assertEqual(idx[6]["name"], "Bolt")
        self.assertIn("combat-trick", SE.card_tags(idx[6], "cast", "COMBAT_DECLARE_BLOCKERS", {}))
        self.assertIn("x-spell", SE.card_tags({"name": "Fireball", "types": "Sorcery", "manaCost": "{X}{R}"}, "cast", "MAIN1", {}))


class Stats(unittest.TestCase):
    def test_cluster_bootstrap(self):
        pairs = [(f"g{i}", float(i % 2)) for i in range(40)]
        m, lo, hi = SE.cluster_boot(pairs, 500, 1, "k")
        self.assertAlmostEqual(m, 0.5)
        self.assertLess(lo, 0.5)
        self.assertGreater(hi, 0.5)
        self.assertEqual(SE.cluster_boot(pairs, 500, 1, "k"), (m, lo, hi), "seeded per group")
        self.assertEqual(SE.cluster_boot([("g", 1.0), ("g", 0.0)], 500, 1, "k"), (0.5, None, None), "one game: no interval")

    def test_biggest_drop(self):
        pts = [{"p": 0.5, "seq": 1, "turn": 1}, {"p": 0.6, "seq": 2, "turn": 2}, {"p": 0.2, "seq": 3, "turn": 3},
               {"p": 0.1, "seq": 4, "turn": 4}]
        d = SE.biggest_drop(pts)
        self.assertAlmostEqual(d["drop"], 0.4)
        self.assertEqual(d["to"]["seq"], 3)
        self.assertIsNone(SE.biggest_drop(pts[:1]))

    def test_judge(self):
        self.assertEqual(SE.judge(0.1, 0.02), "helped")
        self.assertEqual(SE.judge(-0.1, 0.02), "harmful")
        self.assertEqual(SE.judge(0.02, 0.02), "unclear")


class OnFixtures(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_noise_from_the_recorded_search(self):
        out = os.path.join(self.d, "n")
        summ = run(out, "--logs", os.path.relpath(DEC, REPO))
        self.assertEqual(summ["searched"], 20)
        self.assertEqual(summ["noiseDecisions"], 20)
        rows = {int(r["frame"]): r for r in table(out, "noise")}
        r = rows[25]  # the search overrode Forge's pass with cast:18: +40 leaf points, paired (Forge is the runner-up)
        self.assertEqual((r["chosen"], r["runnerUp"], r["overrode"], r["paired"]), ("cast:18", "pass", "True", "True"))
        self.assertEqual(float(r["gapLeaf"]), 40.0)
        self.assertEqual(r["estimable"], "False", "two rounds that agree: no standard error")
        r = rows[110]  # the override picked candidate 4 (cast:38); the runner-up is not Forge's: unpaired
        self.assertEqual((r["chosen"], r["paired"]), ("cast:38", "False"))
        r = rows[198]  # se 5 on both: estimable, the gap is 23 leaf points against pass
        self.assertEqual(r["estimable"], "True")
        self.assertEqual(r["runnerUp"], "pass")
        cs = {c["card"]: c for c in table(out, "cards_search")}
        self.assertTrue(cs, "the search's decisions name the cards they act with")
        self.assertEqual(table(out, "forensics"), [], "the search seat won: no lost search game")
        dec = table(out, "decisions")
        self.assertEqual({d["seat"] for d in dec}, {"0"}, "--policy search reads the search seat's log only")

    def test_policy_any_reads_both_chairs_and_forensics(self):
        out = os.path.join(self.d, "a")
        summ = run(out, "--logs", os.path.relpath(DEC, REPO), "--policy", "any")
        self.assertEqual(summ["records"], 202)
        fx = table(out, "forensics")
        self.assertEqual([(f["seat"], f["policy"], f["method"]) for f in fx], [("1", "forge", "search-estimate")])

    def test_forensics_with_the_evaluator(self):
        try:
            import numpy  # noqa: F401
        except ImportError:
            self.skipTest("numpy")
        out = os.path.join(self.d, "e")
        run(out, "--logs", os.path.relpath(DEC, REPO), "--policy", "any", "--model", os.path.relpath(MODEL, REPO))
        fx = table(out, "forensics")
        self.assertEqual(len(fx), 1)
        self.assertTrue(fx[0]["method"].startswith("evaluator:"))
        self.assertGreater(int(fx[0]["points"]), 10)
        self.assertGreater(float(fx[0]["drop"]), 0)

    def test_truth_judges_search_against_forge(self):
        p = truth_fixture(self.d)
        out = os.path.join(self.d, "t")
        summ = run(out, "--truth-set", p["set"], "--truth", p["truth"], "--rank3", p["r3"], "--rank12", p["r12"])
        self.assertEqual(summ["truthRows"], 3)
        rr = {r["id"]: r for r in table(out, "regret_rows")}
        self.assertAlmostEqual(float(rr["d25"]["regret"]), 0.0)
        self.assertAlmostEqual(float(rr["d120"]["regret"]), 0.2)
        self.assertEqual(rr["d120"]["clear"], "True")
        self.assertAlmostEqual(float(rr["d163"]["regret"]), 0.2)
        self.assertEqual(rr["d25"]["cube"], "synergy")
        dg = {(r["variant"], r["group"]): r for r in table(out, "disagreement_summary")}
        a = dg[("ranker-argmax", "all")]
        self.assertEqual((a["decisions"], a["disagree"], a["helped"], a["harmful"], a["unclear"]), ("3", "3", "2", "1", "0"))
        rec = {r["id"]: r for r in table(out, "disagreement") if r["variant"] == "recorded"}
        self.assertEqual(rec["d25"]["verdict"], "helped", "the recorded override pass -> cast:18 gained .15")
        self.assertEqual(rec["d120"]["verdict"], "same")
        b = table(out, "budget")[0]
        self.assertEqual((b["decisions"], b["flips"], b["flips12Better"]), ("3", "1", "1"))
        cards = {c["key"]: c for c in table(out, "cards")}
        self.assertTrue(any(float(c["totalRegret"]) > 0 for c in cards.values()))
        self.assertEqual(summ["ranker_argmax_harmful"], 1)

    def test_review_report(self):
        out = os.path.join(self.d, "r")
        summ = run(out, "--review", os.path.relpath(REVIEW, REPO))
        self.assertEqual(summ["reviewRows"], 14)
        self.assertEqual(summ["regret_review_wins_decisions"], 6)
        rr = [r for r in table(out, "regret_rows") if r["source"] == "review-wins"]
        self.assertEqual({r["by"] for r in rr}, {"human"}, "a human seat's log has no decision records")
        cards = {c["key"] for c in table(out, "cards") if c["source"] == "review-wins"}
        self.assertIn("Pym Particles", cards)

    def test_ladder_by_cube(self):
        lad = ladder_fixture(os.path.join(self.d, "lad"))
        out = os.path.join(self.d, "l")
        summ = run(out, "--ladder", lad)
        self.assertEqual(summ["ladderGames"], 16)
        rows = {(r["dim"], r["value"]): r for r in table(out, "ladder")}
        self.assertEqual(rows[("cube", "pauper")]["aScore"], "0.0")
        self.assertEqual(rows[("cube", "pauper")]["aLosses"], "8")
        self.assertEqual(rows[("cube", "vintage")]["aScore"], "1.0")
        self.assertEqual(rows[("all", "all")]["games"], "16")

    def test_deterministic(self):
        p = truth_fixture(self.d)
        lad = ladder_fixture(os.path.join(self.d, "lad"))
        outs = []
        for k in ("x", "y"):
            out = os.path.join(self.d, k)
            run(out, "--logs", os.path.relpath(DEC, REPO), "--policy", "any", "--truth-set", p["set"], "--truth", p["truth"],
                "--rank3", p["r3"], "--rank12", p["r12"], "--review", os.path.relpath(REVIEW, REPO), "--ladder", lad)
            outs.append(out)
        names = sorted(os.listdir(os.path.join(outs[0], "tables")))
        self.assertTrue(names)
        _, mismatch, errors = filecmp.cmpfiles(os.path.join(outs[0], "tables"), os.path.join(outs[1], "tables"), names, shallow=False)
        self.assertEqual((mismatch, errors), ([], []))
        for f in ("report.md", "summary.json"):
            self.assertTrue(filecmp.cmp(os.path.join(outs[0], f), os.path.join(outs[1], f), shallow=False), f)


if __name__ == "__main__":
    unittest.main()
