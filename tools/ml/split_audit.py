#!/usr/bin/env python3
# mtg-table — tools/ml: prove a multi-night dataset's train/val/test split does not leak (D364).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Does a dataset's split hold across nights, and does it keep an older
dataset's held-out pairs held out?  (D364.)  Prints PASS or FAIL; exit 0 / 1.

    python3 tools/ml/split_audit.py DATA [--split-by pair] [--reference OLD_DATA] [--report audit.json]

The split is train_eval.py's (`--split-by`, default pair, D317): each game
goes where its deck pair's hash sends it.  Checked on DATA's games.jsonl:

  1. every deck pair is in exactly one split;
  2. every draft -- the folder holding a recording (`games/<seed>/`), so a
     game's two chairs and every game of the draft -- is in exactly one split;
  3. every deck, by name, is in exactly one split;
  4. with games.jsonl's `night` (dataset.py --queue-root --nights): the pairs
     per night and split, and the pairs whose games come from more than one
     night (a deck pair's name is `cubelab <seed> A|B`, and two pool keys may
     reuse a seed) -- each is still in one split, which 1 checks.

With --reference (night 1's dataset, gate 1's model's data):

  5. every reference game (by game_key) is in DATA, and in the same split;
  6. every reference pair has the same split in DATA: its test pairs are
     DATA's test pairs, so a model trained on the reference is scored on
     DATA's test split without one row it trained on, and the new model never
     trains on gate 1's test pairs;
  7. no DATA test pair is a reference training or validation pair.

Standard library only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def read_games(data: str) -> list[dict[str, Any]]:
    with open(os.path.join(data, "games.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def splits_of(games: list[dict[str, Any]], split_by: str) -> list[str]:
    import train_eval as T
    if split_by == "dataset":
        return [g["split"] for g in games]
    return T.game_splits(games, split_by)


def draft_of(g: dict[str, Any]) -> str:
    """The recording's folder (a lab draft's `games/<seed>`), else the game's own group."""
    f = g.get("file") or ""
    return os.path.normpath(os.path.dirname(f)) if f else (g.get("game_group") or g["split_group"])


def one_split(items: list[tuple[str, str]]) -> tuple[dict[str, str], list[str]]:
    """key -> split; the keys seen in more than one split."""
    where: dict[str, set] = defaultdict(set)
    for k, s in items:
        where[k].add(s)
    bad = sorted(k for k, ss in where.items() if len(ss) > 1)
    return {k: next(iter(ss)) for k, ss in where.items()}, bad


def audit(data: str, split_by: str = "pair", reference: str | None = None) -> dict[str, Any]:
    import train_eval as T
    games = read_games(data)
    sp = splits_of(games, split_by)
    pairs, bad_pairs = one_split([(T.pair_key(g), s) for g, s in zip(games, sp)])
    _drafts, bad_drafts = one_split([(draft_of(g), s) for g, s in zip(games, sp)])
    _decks, bad_decks = one_split([(d, s) for g, s in zip(games, sp) for d in (g.get("match") or "").split("|") if d])
    rep: dict[str, Any] = {"data": data, "splitBy": split_by, "games": len(games),
                           "pairs": dict(Counter(pairs.values())),
                           "gamesPerSplit": dict(Counter(sp)),
                           "pairsInTwoSplits": bad_pairs[:20], "pairsInTwoSplitsCount": len(bad_pairs),
                           "draftsInTwoSplits": bad_drafts[:20], "draftsInTwoSplitsCount": len(bad_drafts),
                           "decksInTwoSplits": bad_decks[:20], "decksInTwoSplitsCount": len(bad_decks)}
    if any("night" in g for g in games):
        by_night: dict[str, Counter] = defaultdict(Counter)
        nights_of_pair: dict[str, set] = defaultdict(set)
        for g, s in zip(games, sp):
            n = str(g.get("night"))
            nights_of_pair[T.pair_key(g)].add(n)
        seen: set = set()
        for g, s in zip(games, sp):
            k = (str(g.get("night")), T.pair_key(g))
            if k not in seen:
                seen.add(k)
                by_night[k[0]][s] += 1
        multi = sorted(k for k, ns in nights_of_pair.items() if len(ns) > 1)
        rep["nights"] = {n: dict(c) for n, c in sorted(by_night.items())}
        rep["pairsInSeveralNights"] = len(multi)
        rep["pairsInSeveralNightsExamples"] = [{"pair": k, "nights": sorted(nights_of_pair[k]), "split": pairs[k]}
                                               for k in multi[:10]]
    failures = []
    if bad_pairs:
        failures.append(f"{len(bad_pairs)} deck pair(s) in two splits")
    if bad_drafts:
        failures.append(f"{len(bad_drafts)} draft folder(s) in two splits")
    if bad_decks:
        failures.append(f"{len(bad_decks)} deck name(s) in two splits")
    if reference:
        rg = read_games(reference)
        rsp = splits_of(rg, split_by)
        here = {g["game_key"]: s for g, s in zip(games, sp)}
        missing = [g["game_key"] for g in rg if g["game_key"] not in here]
        moved = [g["game_key"] for g, s in zip(rg, rsp) if g["game_key"] in here and here[g["game_key"]] != s]
        rpairs, _ = one_split([(T.pair_key(g), s) for g, s in zip(rg, rsp)])
        pair_moved = sorted(k for k, s in rpairs.items() if k in pairs and pairs[k] != s)
        ref_train = {k for k, s in rpairs.items() if s != "test"}
        test_leak = sorted(k for k, s in pairs.items() if s == "test" and k in ref_train)
        ref_test = {k for k, s in rpairs.items() if s == "test"}
        rep["reference"] = {"data": reference, "games": len(rg), "missingGames": len(missing),
                            "gamesMovedSplit": len(moved), "pairsMovedSplit": len(pair_moved),
                            "pairsMovedExamples": pair_moved[:10],
                            "referenceTestPairs": len(ref_test),
                            "referenceTestPairsInDataTest": sum(1 for k in ref_test if pairs.get(k) == "test"),
                            "dataTestPairsTrainedOnByReference": len(test_leak),
                            "newGames": len(games) - (len(rg) - len(missing)),
                            "newTestPairs": sum(1 for k, s in pairs.items() if s == "test" and k not in rpairs)}
        if missing:
            failures.append(f"{len(missing)} reference game(s) missing from DATA")
        if moved or pair_moved:
            failures.append(f"{len(moved)} reference game(s) / {len(pair_moved)} pair(s) in another split than before")
        if test_leak:
            failures.append(f"{len(test_leak)} DATA test pair(s) are reference training pairs")
    rep["pass"] = not failures
    rep["failures"] = failures
    return rep


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("data")
    ap.add_argument("--split-by", default="pair")
    ap.add_argument("--reference", help="an older dataset (night 1's) whose split must hold inside DATA")
    ap.add_argument("--report")
    a = ap.parse_args(argv)
    rep = audit(a.data, a.split_by, a.reference)
    print(f"split audit ({a.split_by}): {rep['games']} games; pairs per split {rep['pairs']}; pairs / drafts / decks "
          f"in two splits: {rep['pairsInTwoSplitsCount']} / {rep['draftsInTwoSplitsCount']} / {rep['decksInTwoSplitsCount']}")
    if "nights" in rep:
        print("  pairs per night and split: " + "; ".join(f"night {n}: {c}" for n, c in rep["nights"].items())
              + f"; pairs with games from several nights: {rep['pairsInSeveralNights']}")
    if "reference" in rep:
        r = rep["reference"]
        print(f"  reference {r['data']}: {r['games']} games, missing {r['missingGames']}, moved {r['gamesMovedSplit']}; "
              f"its {r['referenceTestPairs']} test pairs: {r['referenceTestPairsInDataTest']} are DATA test pairs; "
              f"DATA test pairs it trained on: {r['dataTestPairsTrainedOnByReference']}; new games {r['newGames']}, "
              f"new test pairs {r['newTestPairs']}")
    print("split audit: " + ("PASS" if rep["pass"] else "FAIL -- " + "; ".join(rep["failures"])))
    if a.report:
        d = os.path.dirname(a.report)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1)
            f.write("\n")
    return 0 if rep["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
