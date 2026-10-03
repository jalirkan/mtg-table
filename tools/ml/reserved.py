# mtg-table — tools/ml: the AI ladder's deck-set decks, kept out of every training set.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The decks of tools/ai-bench/pairs-dev.txt and pairs-confirm.txt (D318), matched by CARD MULTISET.

The AI ladder confirms an AI on the confirm set's decks.  If a game played with
one of those decks reaches the position evaluator's (or the matchup model's)
training data, a search with that evaluator is confirmed on decks it trained
on (methodology review 2, N4).  Seeds keep the lab off them
(tools/cubelab/seeds.ts, D332), but a seed is not a deck: an old run folder,
a changed cube or ratings file, or a deck copied into another tool would get
past a seed rule.  So the dataset builders drop a game when either of its
decks IS a deck-set deck, card for card:

    deck_key({"Lightning Bolt": 1, "Mountain": 16, ...})  -- sha1 of the sorted main-deck counts
    reserved_decks(repo)  -> {key: "pairs-confirm.txt: fair-fight seed 9101 A", ...}

Both sets are reserved by default (training on dev decks would flatter a tune
on them in the same way); `sets=("confirm",)` narrows it.  Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any, Dict, Iterable, Optional, Tuple

PAIRS_FILES = {"dev": "tools/ai-bench/pairs-dev.txt", "confirm": "tools/ai-bench/pairs-confirm.txt"}


def deck_key(counts: Dict[str, int]) -> str:
    """A main deck's identity: its card multiset (names as the lab writes them, set codes dropped)."""
    norm: Dict[str, int] = {}
    for n, k in counts.items():
        n = str(n).split("|")[0].strip()
        if n and int(k) > 0:
            norm[n] = norm.get(n, 0) + int(k)
    return hashlib.sha1(json.dumps(sorted(norm.items())).encode()).hexdigest()[:16]


def dck_main(text: str) -> Dict[str, int]:
    """The [Main] section of a Forge .dck as name -> count."""
    out: Dict[str, int] = {}
    sect = ""
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            sect = line[1:-1].lower()
            continue
        if sect != "main":
            continue
        m = re.match(r"^(\d+)\s+(.+)$", line)
        k, n = (int(m.group(1)), m.group(2)) if m else (1, line)
        n = n.split("|")[0].strip()
        out[n] = out.get(n, 0) + k
    return out


def reserved_decks(repo: str = ".", sets: Iterable[str] = ("dev", "confirm")) -> Dict[str, str]:
    """Every deck named by the pairs files of `sets`, by deck_key -> where it comes from."""
    out: Dict[str, str] = {}
    for s in sets:
        f = os.path.join(repo, PAIRS_FILES[s])
        if not os.path.exists(f):
            continue
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                body, _, note = line.partition("#")
                parts = body.split()
                if len(parts) < 2:
                    continue
                for side, p in zip("AB", parts[:2]):
                    dp = os.path.join(repo, p)
                    if os.path.exists(dp):
                        with open(dp, encoding="utf-8") as dh:
                            out.setdefault(deck_key(dck_main(dh.read())), f"{os.path.basename(f)}: {note.strip() or p} {side}")
    return out


# ---------------------------------------------------------------- recorded games -> their decks

_RUN_CACHE: Dict[str, Dict[int, Dict[str, Any]]] = {}


def run_drafts(run_dir: str) -> Dict[int, Dict[str, Any]]:
    """seed -> {"decks": [countsA, countsB], "ver": lab version id} for one cube-lab run folder (cached)."""
    run_dir = os.path.realpath(run_dir)
    if run_dir in _RUN_CACHE:
        return _RUN_CACHE[run_dir]
    import matchup_data as MD  # the lab's played-deck rule, in one place
    out: Dict[int, Dict[str, Any]] = {}
    f = os.path.join(run_dir, "drafts.jsonl")
    if os.path.exists(f):
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                out[int(rec["seed"])] = {"decks": [MD.as_counts(MD.played_main(d)) for d in rec["drafters"]],
                                         "ver": rec.get("ver") or "unversioned"}
    _RUN_CACHE[run_dir] = out
    return out


def log_draft(path: str) -> Optional[Tuple[str, int]]:
    """A lab recording's run folder and draft seed, from where the lab writes it:
    <run>/games/<seed>/g<n>-seat<k>.jsonl.gz (D315) or <run>/frames/draft-<seed>-g1.jsonl (--record M)."""
    p = os.path.realpath(path)
    d1, d2 = os.path.dirname(p), os.path.dirname(os.path.dirname(p))
    if os.path.basename(d2) == "games" and os.path.basename(d1).isdigit():
        run = os.path.dirname(d2)
        if os.path.exists(os.path.join(run, "drafts.jsonl")):
            return run, int(os.path.basename(d1))
    m = re.match(r"^draft-(\d+)-g\d+\.jsonl(\.gz)?$", os.path.basename(p))
    if m and os.path.basename(d1) == "frames" and os.path.exists(os.path.join(d2, "drafts.jsonl")):
        return d2, int(m.group(1))
    return None


def game_decks(path: str, hello: Optional[Dict[str, Any]] = None, repo: str = ".") -> Tuple[list, str]:
    """The main decks a recorded game was played with, as far as can be known, and its lab version.

    A lab recording: both decks, from its run's drafts.jsonl.  Any other log: the viewer's own deck, when
    hello_ok.match.yourDeck names a .dck path that exists (the other chair's deck is never in a log)."""
    hit = log_draft(path)
    if hit:
        d = run_drafts(hit[0]).get(hit[1])
        if d:
            return d["decks"], d["ver"]
    decks = []
    yd = (((hello or {}).get("match") or {}).get("yourDeck") or {}).get("path")
    if yd:
        for cand in (yd, os.path.join(repo, yd)):
            if os.path.exists(cand):
                with open(cand, encoding="utf-8") as fh:
                    decks.append(dck_main(fh.read()))
                break
    return decks, "unversioned"


def reserved_hit(decks: Iterable[Dict[str, int]], reserved: Dict[str, str]) -> Optional[str]:
    """Where the first reserved deck among `decks` comes from, or None."""
    for d in decks:
        w = reserved.get(deck_key(d))
        if w:
            return w
    return None
