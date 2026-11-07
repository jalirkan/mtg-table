#!/usr/bin/env python3
# mtg-table — tools/ml: two or more encoded datasets -> one, row for row (D518).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Merge dataset.py directories into one, without re-encoding a row (D518).

    python3 tools/ml/dataset_merge.py SRC SRC [SRC ...] --out DIR [--allow-shared-seeds] [--jobs N]

Why: train_eval.py, eval_compare.py, split_audit.py and gates.py each read ONE
dataset folder, and evaluator v3 (J196) trains over queue nights 1-5 while
nights 1 and 2's recordings are on the cold drive (D378).  Nights 4-5 are
encoded alone over night 1's vocabulary (`dataset.py --vocab-from`) and this
tool joins them to `nights-1-3`, which stays byte for byte the dataset v2
trained on.

What it writes, under --out, in dataset.py's own format:

  features.json            the first source's, byte for byte (every source's must parse equal)
  <split>-<NNNNN>.npz      each split's shards: the first source's copied byte for byte, then
                           each later source's with its `game` column moved up by the games
                           before it -- every other member (X, y, turn, turns_to_end,
                           rows_to_end, active) is the source's array unchanged
  games.jsonl              the sources' lines in order, `index` renumbered, every other field
                           as it was (`split`, `match`, `night` ... untouched)
  merge.json               the manifest: each source's path and the sha256 of its features.json,
                           games.jsonl and stats.json and of its shard list (name + sha256 of
                           each), the same for the output, and the checks below
  stats.json               the sums (rows, games, splits, labels, versions, nights, skipped and
                           reserved counts, exploring games) and a `merged` block; written
                           LAST, as dataset.py does, so it is there only when the merge is whole

REFUSED (exit 2, nothing written as complete):
  - fewer than two sources, a source without stats.json (incomplete), --out a source;
  - features.json that differ, or a different schemaId, nFeatures, vocabulary, phases,
    groupBy, split weights, salt, humanInTraining or exploration mode;
  - one game (game_key) in two sources -- always, no flag;
  - a deck pair named in two sources -- for a lab game the pair is `cubelab <seed> A|B`,
    so this is a seed number two sources share -- unless --allow-shared-seeds.  With the
    flag the pair keeps its name: its games from every source are one split group,
    exactly as dataset.py run once over all of them would make it (and as v2's own
    nights-1-3 already joins 4,488 seed numbers across its three nights).  The merge
    never renames a pair, because a pair's split is a hash of its name (D364 §1);
  - a source whose shards do not hold the rows its stats.json and games.jsonl say;
  - a game whose split in the merge is not its split in its source -- by dataset.py's own
    `split` field AND by train_eval.py's pair split (`--split-by pair`, D317).  From 20
    pairs on that split is a hash of the pair alone, so it cannot move; below 20 a source
    is split by rank and could, and the merge refuses rather than move a held-out game.
    A test row of a source therefore stays a test row, and a training or validation row
    never becomes one.

`--jobs N` rewrites the later sources' shards in N processes (each shard on its own;
the files are the same for every N).  Needs numpy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from collections import Counter
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

PREFIXES = ("train", "val", "test", "human")
# stats.json fields every source must agree on (the rows mean the same thing in each)
SAME = ("schemaId", "nFeatures", "vocabSize", "phases", "groupBy", "split", "salt", "humanInTraining",
        "schemaKind", "minTurn", "deckVocabMin")
DATA_FILES = ("features.json", "games.jsonl", "stats.json", "merge.json", "progress.json")


class Refused(Exception):
    pass


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def shards(d: str, prefix: str) -> list[str]:
    return sorted(f for f in os.listdir(d) if f.startswith(prefix + "-") and f.endswith(".npz"))


def digest(d: str) -> dict[str, Any]:
    """A dataset folder's fingerprint: its three JSON files' sha256 and one sha256 over its shard list."""
    lines = []
    for p in PREFIXES:
        for f in shards(d, p):
            lines.append(f"{f} {sha256_file(os.path.join(d, f))}")
    out = {f: sha256_file(os.path.join(d, f)) for f in ("features.json", "games.jsonl", "stats.json")
           if os.path.isfile(os.path.join(d, f))}
    out["shards"] = hashlib.sha256(("\n".join(lines) + "\n").encode()).hexdigest()
    out["shardFiles"] = len(lines)
    return out


def read_json(path: str) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_games(d: str) -> list[dict[str, Any]]:
    with open(os.path.join(d, "games.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def _rewrite(job: tuple[str, str, int]) -> int:
    """One later source's shard -> the output, its `game` column moved up by `offset`; the rows it holds."""
    import dataset as D
    src, dst, offset = job
    with np.load(src) as z:
        arrays = {k: z[k] for k in z.files}
    g = arrays["game"].astype(np.int64) + offset
    if len(g) and g.max() >= 2 ** 31:
        raise Refused(f"{src}: a game index past int32 after the merge")
    arrays["game"] = g.astype(np.int32)
    D.savez_fixed(dst, {k: arrays[k] for k in D._KEYS if k in arrays})
    return len(g)


def _game_rows(path: str) -> int:
    with np.load(path) as z:
        return len(z["game"])


def check_sources(srcs: list[str], out: str) -> tuple[list[dict], list[list[dict]]]:
    if len(srcs) < 2:
        raise Refused("give two or more source datasets")
    if len({os.path.realpath(s) for s in srcs}) != len(srcs):
        raise Refused("a source is named twice")
    o = os.path.realpath(out)
    for s in srcs:
        r = os.path.realpath(s)
        if o == r or o.startswith(r + os.sep):
            raise Refused(f"--out {out} is (inside) the source {s}: a source is only read")
        if not os.path.isfile(os.path.join(s, "stats.json")):
            raise Refused(f"{s}: no stats.json -- not a complete dataset.py directory")
    stats = [read_json(os.path.join(s, "stats.json")) for s in srcs]
    feats = [read_json(os.path.join(s, "features.json")) for s in srcs]
    for s, st, ft in zip(srcs[1:], stats[1:], feats[1:]):
        if ft != feats[0]:
            raise Refused(f"{s}: features.json is not {srcs[0]}'s (another schema or vocabulary: encode it with "
                          f"dataset.py --vocab-from {srcs[0]})")
        for k in SAME:
            if st.get(k) != stats[0].get(k):
                raise Refused(f"{s}: stats.json {k} {st.get(k)!r} is not {srcs[0]}'s {stats[0].get(k)!r}")
        if (st.get("playExplore") or {}).get("mode") != (stats[0].get("playExplore") or {}).get("mode"):
            raise Refused(f"{s}: built with another --play-explore mode than {srcs[0]}")
    games = [read_games(s) for s in srcs]
    for s, st, gs in zip(srcs, stats, games):
        if len(gs) != st.get("games"):
            raise Refused(f"{s}: games.jsonl holds {len(gs)} games, stats.json says {st.get('games')}")
        if [g.get("index") for g in gs] != list(range(len(gs))):
            raise Refused(f"{s}: games.jsonl's indices are not 0..{len(gs) - 1} in order")
    return stats, games


def shared(srcs: list[str], games: list[list[dict]]) -> dict[str, Any]:
    import train_eval as T
    seen_keys: dict[str, int] = {}
    dup_keys = []
    pairs_of: list[set] = []
    for i, gs in enumerate(games):
        for g in gs:
            k = g["game_key"]
            if k in seen_keys and seen_keys[k] != i:
                dup_keys.append(k)
            seen_keys.setdefault(k, i)
        pairs_of.append({T.pair_key(g) for g in gs})
    both = set()
    for i in range(len(pairs_of)):
        for j in range(i + 1, len(pairs_of)):
            both |= pairs_of[i] & pairs_of[j]
    return {"duplicateGames": sorted(set(dup_keys)), "sharedPairs": sorted(both)}


def split_check(srcs: list[str], games: list[list[dict]], merged: list[dict]) -> dict[str, Any]:
    """Every game's split in the merge against its split in its source: dataset.py's field and the pair split."""
    import train_eval as T
    msp = T.game_splits(merged, "pair")
    moved = Counter()
    pos = 0
    for s, gs in zip(srcs, games):
        ssp = T.game_splits(gs, "pair")
        for g, a in zip(gs, ssp):
            b = msp[pos]
            if a != b:
                moved[f"{a}->{b}"] += 1
            if merged[pos]["split"] != g["split"]:
                moved[f"dataset {g['split']}->{merged[pos]['split']}"] += 1
            pos += 1
    return {"splitBy": ["dataset", "pair"], "gamesMoved": sum(moved.values()), "moves": dict(moved),
            "pairSplitGames": dict(Counter(msp))}


def merge(srcs: list[str], out: str, allow_shared_seeds: bool = False, jobs: int = 1, log=print) -> dict[str, Any]:
    if np is None:
        raise SystemExit("dataset_merge.py needs numpy (pip install numpy)")
    import dataset as D
    stats, games = check_sources(srcs, out)
    sh = shared(srcs, games)
    if sh["duplicateGames"]:
        raise Refused(f"{len(sh['duplicateGames'])} game(s) are in two sources (game_key {sh['duplicateGames'][0]} "
                      "...): one recording encoded twice -- merge datasets of different games")
    if sh["sharedPairs"] and not allow_shared_seeds:
        raise Refused(f"{len(sh['sharedPairs'])} deck pair(s) are named in two sources (e.g. {sh['sharedPairs'][0]!r}"
                      "; a lab pair is a seed number): their games would be one split group across sources -- pass "
                      "--allow-shared-seeds if that is meant (the pair keeps its name and its split)")
    offsets = []
    n = 0
    for gs in games:
        offsets.append(n)
        n += len(gs)
    merged = []
    for off, gs in zip(offsets, games):
        merged += [dict(g, index=off + i) for i, g in enumerate(gs)]
    sc = split_check(srcs, games, merged)
    if sc["gamesMoved"]:
        raise Refused(f"{sc['gamesMoved']} game(s) would change split in the merge ({sc['moves']}): a source with fewer "
                      "than 20 deck pairs is split by rank, not by hash -- merge larger datasets")

    os.makedirs(out, exist_ok=True)
    for fn in os.listdir(out):   # a re-run replaces a partial merge's files (as dataset.py's rebuild does)
        if (fn.endswith(".npz") and fn.split("-")[0] in PREFIXES) or fn in DATA_FILES or fn.endswith(".part"):
            os.remove(os.path.join(out, fn))

    # the shards: per split, the first source copied, the later ones rewritten with the game offset
    jobs_list: list[tuple[str, str, int]] = []
    plan: dict[str, int] = {}
    copied: list[tuple[str, str, int, int]] = []   # (src, dst, source number, split code)
    for p in PREFIXES:
        k = 0
        for si, (s, off) in enumerate(zip(srcs, offsets)):
            for f in shards(s, p):
                dst = os.path.join(out, f"{p}-{k:05d}.npz")
                if si == 0:
                    copied.append((os.path.join(s, f), dst, si, PREFIXES.index(p)))
                else:
                    jobs_list.append((os.path.join(s, f), dst, off))
                    copied.append((os.path.join(s, f), dst, si, PREFIXES.index(p)))
                k += 1
        if k > 99_999:
            raise Refused(f"{p}: {k} shards -- past the five-digit names dataset.py's loaders sort by")
        plan[p] = k
    rows_by = Counter()                  # (source, split) -> rows in its shards
    first = [c for c in copied if c[2] == 0]
    for src, dst, si, pc in first:
        shutil.copyfile(src, dst)
        rows_by[(si, PREFIXES[pc])] += _game_rows(dst)
    log(f"merge: {len(first)} shard(s) of {srcs[0]} copied; rewriting {len(jobs_list)} of the later source(s)"
        f" with {max(1, jobs)} job(s)")
    later = [c for c in copied if c[2] != 0]
    if jobs > 1 and len(jobs_list) > 1:
        import multiprocessing as mp
        with mp.get_context().Pool(jobs) as pool:
            counts = pool.map(_rewrite, jobs_list, chunksize=4)
    else:
        counts = [_rewrite(j) for j in jobs_list]
    for (src, dst, si, pc), c in zip(later, counts):
        rows_by[(si, PREFIXES[pc])] += c

    # nothing lost: every source's shards hold the rows its stats.json and games.jsonl say, split by split
    for si, (s, st, gs) in enumerate(zip(srcs, stats, games)):
        for p in PREFIXES:
            want_g = sum(int(g["rows"]) for g in gs if g["split"] == p)
            want_s = int(((st.get("splits") or {}).get(p) or {}).get("rows", 0))
            if not (rows_by[(si, p)] == want_g == want_s):
                raise Refused(f"{s}: split {p}: its shards hold {rows_by[(si, p)]} rows, games.jsonl {want_g}, "
                              f"stats.json {want_s} -- a damaged source; nothing merged")

    shutil.copyfile(os.path.join(srcs[0], "features.json"), os.path.join(out, "features.json"))
    tmp = os.path.join(out, "games.jsonl.part")
    with open(tmp, "w", encoding="utf-8") as f:
        for g in merged:
            f.write(json.dumps(g) + "\n")
    os.replace(tmp, os.path.join(out, "games.jsonl"))

    summary = merged_stats(srcs, stats, merged, plan, sh, allow_shared_seeds, sc)
    src_digests = [digest(s) for s in srcs]
    manifest = {"tool": "tools/ml/dataset_merge.py", "decision": "D518", "out": out,
                "sources": [{"path": s, "rows": st["rows"], "games": st["games"], "gameOffset": off, **dg}
                            for s, st, off, dg in zip(srcs, stats, offsets, src_digests)],
                "allowSharedSeeds": allow_shared_seeds, "sharedPairs": len(sh["sharedPairs"]),
                "sharedPairsExamples": sh["sharedPairs"][:10], "splitCheck": sc,
                "output": {**digest(out)}}
    manifest["output"].pop("stats.json", None)   # stats.json is written after this file
    D._write_json(os.path.join(out, "merge.json"), manifest)
    summary["merged"] = {"sources": [{"path": s, "rows": st["rows"], "games": st["games"],
                                      "games.jsonl": dg["games.jsonl"], "shards": dg["shards"]}
                                     for s, st, dg in zip(srcs, stats, src_digests)],
                         "allowSharedSeeds": allow_shared_seeds, "sharedPairs": len(sh["sharedPairs"]),
                         "gamesMovedSplit": sc["gamesMoved"], "manifest": "merge.json", "decision": "D518"}
    D._write_json(os.path.join(out, "stats.json"), summary)   # last: the merge is complete
    log(D.format_stats(summary))
    log(f"merge: {len(srcs)} sources -> {out}: {summary['rows']} rows, {summary['games']} games; deck pairs named in "
        f"two sources {len(sh['sharedPairs'])}; games whose split moved 0")
    return summary


def merged_stats(srcs, stats, merged, plan, sh, allow, sc) -> dict[str, Any]:
    st0 = stats[0]

    def csum(key):
        c = Counter()
        for st in stats:
            c.update(st.get(key) or {})
        return dict(c)

    shown = [p for p in PREFIXES if any(p in (st.get("splits") or {}) for st in stats)]
    splits = {}
    for p in shown:
        gl, rl = Counter(), Counter()
        rows = games = 0
        for st in stats:
            d = (st.get("splits") or {}).get(p) or {}
            rows += int(d.get("rows", 0))
            games += int(d.get("games", 0))
            gl.update(d.get("gameLabels") or {})
            rl.update(d.get("rowLabels") or {})
        splits[p] = {"rows": rows, "games": games,
                     "groups": len({g["split_group"] for g in merged if g["split"] == p}),
                     "gameLabels": dict(gl), "rowLabels": dict(rl), "shards": plan.get(p, 0)}
    rd = [st.get("reservedDecks") for st in stats]
    out = {k: st0[k] for k in ("schemaId", "nFeatures", "vocab", "schemaKind", "minTurn", "deckVocabMin", "vocabSize",
                                "phases", "groupBy", "split", "salt") if k in st0}
    out.update({
        "rows": sum(int(st["rows"]) for st in stats), "games": len(merged),
        "skippedGames": csum("skippedGames"),
        # every source checked for the AI ladder's decks (D340), else not; the deck count is the smallest checked
        "reservedChecked": all(bool(st.get("reservedChecked")) for st in stats),
        "reservedDecks": min(rd) if all(isinstance(x, int) for x in rd) else rd,
        "reservedHits": csum("reservedHits"), "versions": csum("versions"), "sources": csum("sources"),
        "humanDirs": list(dict.fromkeys(d for st in stats for d in (st.get("humanDirs") or []))),
        "humanInTraining": st0.get("humanInTraining", False),
        "playExplore": {"mode": (st0.get("playExplore") or {}).get("mode", "include"),
                        "games": sum(int((st.get("playExplore") or {}).get("games", 0)) for st in stats)},
    })
    if all("nights" in st for st in stats):
        out["nights"] = {k: v for k, v in sorted(csum("nights").items(),
                                                 key=lambda kv: (not kv[0].isdigit(), int(kv[0]) if kv[0].isdigit() else 0))}
    out["splits"] = splits
    if out["rows"] != sum(int(g["rows"]) for g in merged):
        raise Refused("the sources' stats.json rows disagree with their games.jsonl")
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 epilog="D518; tools/ml/README.md.  Exit 0 merged, 2 refused.")
    ap.add_argument("sources", nargs="+", help="dataset.py directories, in order (the first's shards are copied as "
                                               "they are; the later ones' game indices follow)")
    ap.add_argument("--out", required=True, help="the merged dataset's directory (never a source)")
    ap.add_argument("--allow-shared-seeds", action="store_true",
                    help="accept deck pairs (for lab games, seed numbers) named in two sources: each such pair stays "
                         "one split group under its own name, as one dataset.py run over all of them would make it")
    ap.add_argument("--jobs", type=int, default=1, help="rewrite the later sources' shards in N processes (the "
                                                        "output is the same for every N)")
    a = ap.parse_args(argv)
    try:
        merge(a.sources, a.out, a.allow_shared_seeds, max(1, a.jobs))
    except Refused as e:
        print(f"dataset_merge: REFUSED -- {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
