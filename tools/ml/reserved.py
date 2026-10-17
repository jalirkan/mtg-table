# mtg-table — tools/ml: the AI ladder's deck-set decks, kept out of every training set.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The decks of tools/ai-bench/pairs-dev.txt and pairs-confirm.txt (D318), matched by CARD MULTISET.

The AI ladder confirms an AI on the confirm set's decks.  If a game played with
one of those decks reaches the position evaluator's (or the matchup model's)
training data, a search with that evaluator is confirmed on decks it trained
on (methodology review 2, N4).  Seeds keep the lab off them
(tools/cubelab/seeds.ts, D340), but a seed is not a deck: an old run folder,
a changed cube or ratings file, or a deck copied into another tool would get
past a seed rule.  So the dataset builders drop a game when either of its
decks IS a deck-set deck, card for card:

    deck_key({"Lightning Bolt": 1, "Mountain": 16, ...})  -- sha1 of the sorted main-deck counts
    reserved_decks(repo)  -> {key: "pairs-confirm.txt: fair-fight seed 9101 A", ...}

Both sets are reserved by default (training on dev decks would flatter a tune
on them in the same way); `sets=("confirm",)` narrows it.  Standard library only.

A lab game whose decks cannot both be known FAILS CLOSED (D365): a cube-lab
recording (its run folder's layout, or the lab's deck names in hello_ok) with
no line for its draft seed in its run's drafts.jsonl -- or no drafts.jsonl at
all -- knows at most the viewer's own deck, and the opponent's could be a
deck-set deck.  `game_decks` marks such a game (`Decks.unknown`) and
`reserved_hit` then returns UNKNOWN_DECK, so every builder drops it and counts
it under that name, as it drops and counts a reserved deck.  A log that is not
a lab game (a person's game, a fixture) never carries the other chair's deck,
by the hidden-information rule; it is checked by the viewer's deck as before.
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
                                         "ver": rec.get("ver") or "unversioned",
                                         # D375: seat A's and B's AI under a --profile-mix run (absent: run.json's profiles)
                                         "profiles": rec.get("profiles")}
    _RUN_CACHE[run_dir] = out
    return out


UNKNOWN_DECK = "unknown deck: a lab game with no drafts.jsonl line for its seed (D365, fails closed)"

_LAB_DECK_NAME = re.compile(r"^cubelab \d+ [AB]$")   # tools/cubelab/run.ts names every lab deck so


class Decks(list):
    """The decks `game_decks` found: a list of name -> count, and `unknown`, why a lab game's
    decks could not both be known (None: nothing missing).  Concatenating keeps `unknown`."""

    unknown: Optional[str] = None

    def __add__(self, other):  # type: ignore[override]
        out = Decks(list(self) + list(other))
        out.unknown = self.unknown or getattr(other, "unknown", None)
        return out


def lab_layout(path: str) -> Optional[Tuple[str, int]]:
    """Where the lab writes a recording, whether or not its drafts.jsonl is there: the run folder and seed."""
    p = os.path.realpath(path)
    d1, d2 = os.path.dirname(p), os.path.dirname(os.path.dirname(p))
    if os.path.basename(d2) == "games" and os.path.basename(d1).isdigit() \
            and re.match(r"^g\d+-seat\d+\.jsonl(\.gz)?$", os.path.basename(p)):
        return os.path.dirname(d2), int(os.path.basename(d1))
    m = re.match(r"^draft-(\d+)-g\d+\.jsonl(\.gz)?$", os.path.basename(p))
    if m and os.path.basename(d1) == "frames":
        return d2, int(m.group(1))
    return None


def lab_hello(hello: Optional[Dict[str, Any]]) -> bool:
    """hello_ok names a deck the way the cube lab names its decks ("cubelab <seed> A")."""
    match = (hello or {}).get("match") or {}
    for k in ("yourDeck", "aiDeck"):
        name = (match.get(k) or {}).get("name")
        if isinstance(name, str) and _LAB_DECK_NAME.match(name.strip()):
            return True
    return False


def log_draft(path: str) -> Optional[Tuple[str, int]]:
    """A lab recording's run folder and draft seed, from where the lab writes it:
    <run>/games/<seed>/g<n>-seat<k>.jsonl.gz (D315) or <run>/frames/draft-<seed>-g1.jsonl (--record M)."""
    p = os.path.realpath(path)
    d1, d2 = os.path.dirname(p), os.path.dirname(os.path.dirname(p))
    if os.path.basename(d2) == "games" and os.path.basename(d1).isdigit():
        run = os.path.dirname(d2)
        if os.path.exists(os.path.join(run, "drafts.jsonl")):
            return run, int(os.path.basename(d1))
    m = re.match(r"^draft-(\d+)-g\d+\.jsonl(\.gz|\.zst)?$", os.path.basename(p))
    if m and os.path.basename(d1) == "frames" and os.path.exists(os.path.join(d2, "drafts.jsonl")):
        return d2, int(m.group(1))
    return None


def game_decks(path: str, hello: Optional[Dict[str, Any]] = None, repo: str = ".") -> Tuple["Decks", str]:
    """The main decks a recorded game was played with, as far as can be known, and its lab version.

    A lab recording: both decks, from its run's drafts.jsonl.  Any other log: the viewer's own deck, when
    hello_ok.match.yourDeck names a .dck path that exists (the other chair's deck is never in a log).
    A lab game -- by its folder layout or by the lab's deck names in hello_ok -- whose drafts.jsonl has
    no line for its seed (or is not there) is marked `unknown`: `reserved_hit` fails closed on it (D365)."""
    hit = log_draft(path)
    if hit:
        d = run_drafts(hit[0]).get(hit[1])
        if d:
            return Decks(d["decks"]), d["ver"]
    decks = Decks()
    lay = hit or lab_layout(path)
    if lay or lab_hello(hello):
        where = f"run {os.path.basename(lay[0])}, seed {lay[1]}" if lay else "the lab's deck names in hello_ok"
        decks.unknown = f"{UNKNOWN_DECK} [{where}]"
    yd = (((hello or {}).get("match") or {}).get("yourDeck") or {}).get("path")
    if yd:
        for cand in (yd, os.path.join(repo, yd)):
            if os.path.exists(cand):
                with open(cand, encoding="utf-8") as fh:
                    decks.append(dck_main(fh.read()))
                break
    return decks, "unversioned"


def game_profiles(path: str) -> Optional[list]:
    """D375: a lab recording's two seats' AI ([A, B]) when its run drew them per draft (--profile-mix),
    else None (the run's fixed profiles, Default vs Default for the queue)."""
    hit = log_draft(path)
    if hit:
        d = run_drafts(hit[0]).get(hit[1])
        if d and d.get("profiles"):
            return list(d["profiles"])
    return None


NOT_FOR_TRAINING = "not for training (D451)"


def not_for_training(header: Optional[Dict[str, Any]]) -> Optional[str]:
    """Why a recorded game must never be training data, or None: its session header (or its `lab` or
    `bench` block) carries `notForTraining`.  The move atlas (D451) writes it on every game it plays --
    random seats, forced options, redealt hidden cards -- whatever the decks, so the rule does not lean
    on the reserved decks (the #161 review).  Every builder that reads frame logs skips such a game and
    counts it under NOT_FOR_TRAINING; distill.py does the same for a rows `begin` line."""
    h = header or {}
    for b in (h, h.get("lab"), h.get("bench")):
        if isinstance(b, dict) and b.get("notForTraining"):
            return str(b["notForTraining"])
    return None


def reserved_hit(decks: Iterable[Dict[str, int]], reserved: Dict[str, str]) -> Optional[str]:
    """Where the first reserved deck among `decks` comes from, or None.  A lab game whose decks are
    not both known (`Decks.unknown`, from game_decks) is UNKNOWN_DECK: dropped, never passed (D365)."""
    if getattr(decks, "unknown", None):
        return UNKNOWN_DECK
    for d in decks:
        w = reserved.get(deck_key(d))
        if w:
            return w
    return None
