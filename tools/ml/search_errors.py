#!/usr/bin/env python3
# mtg-table — tools/ml: error analysis of the search AI -- where it loses, by kind, turn, cube and card.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Where does the search AI (D312) actually lose?  Three search tweaks were
SPRT-tested on hunches -- the attack horizon (`aturns=1`, D351), the oracle
(D350) and the LCB override (D350) -- and none showed a gain.  This tool reads
what the lab already writes and says where the errors are, so the next change
targets one (decision D367).

    python3 tools/ml/search_errors.py --name NAME [--out var/analysis/NAME]
        [--logs DIR_OR_FILE]...                    recordings with decision records (D347)
        [--policy search|any] [--max-games N]      which recorded games' seats to read (default: search seats)
        [--truth-set set.jsonl --truth truth.jsonl  gate 2's set and full-game truth tables (D354)
         [--rank3 rank-hand-3.jsonl] [--rank12 rank-hand-12.jsonl]]
        [--review report.json]...                  post-game review reports (D353)
        [--ladder var/ai-ladder]                   the AI ladder's results/ and sprt.jsonl (D318, D319)
        [--model eval.json]                        an evaluator for loss forensics (D316; needs numpy)
        [--card-tags tags.tsv]                     extra card tags: `Name<TAB>modal,trick`
        [--boot 2000] [--seed 20261004] [--parquet auto|on|off]

INPUTS (each optional; the report says which were given and what each held):

  (a) Decision records (D347): every `dir:"ai"` `decision` line of the deciding
      seat's own log -- the options, the answer, `by` (forge | outlets | search)
      and, when the search ran, D350's report (per candidate: rounds `n`,
      `meanLeaf`, `se`, the paired `diff`/`seDiff` to Forge's answer, `win`).
      A record answered by exploration (D358, `explore`) is not the policy's
      choice and is left out, counted.
  (b) Review reports (D353): graded decisions with `regret`, `regretLo/Hi`,
      `verdict`, `measure` (`wins` to the end of the game, `leaf` to the end
      of the turn -- a short-horizon number, kept apart, never called a win
      rate).
  (c) Gate 2's truth tables (D354): every option's win rate when it is played
      and Forge Default plays both seats to the END of the game.  With the
      hand ranker's answers (`rank-hand-3`: the search's own leaf at its live
      horizon, 3 rounds -- search-v1-fixed3's ranking without its margin
      rule) the truth adjudicates the search against Forge on every decision
      of the set, not only where a recorded seat happened to search.
  (d) The AI ladder: `results/*.jsonl` (one GameRecord per game) and
      `sprt.jsonl`; recordings of ladder-like games (ai-bench `--record-all`,
      a `bench` header block) go in through --logs.

ANALYSES (every interval is 95%, a percentile bootstrap that resamples GAMES --
or a ladder game's mirror block -- never single decisions, because the
decisions of one game are not independent):

  1. Regret by decision kind (spell | attack | block | other), turn bucket,
     game phase (main1 | main2 | combat | other), cube and the policy that
     chose, separately per source (truth, review-wins, review-leaf).  Regret is
     the source's best option minus the chosen one; "clear" means the source's
     own paired interval excludes zero (D353's rule: a close call is not a
     mistake).
  2. The search against Forge: where the hand ranker's pick (and the margin
     rule's) differs from Forge's choice, the truth difference
     truth(search) - truth(Forge) -- the truth's noisy maximum cancels in it,
     as in gate 2 -- and the "override helped" / "override was harmful" /
     "unclear" rates.  A recorded override with truth on both sides is judged
     the same way.
  3. The search's own noise (D350 reports): the chosen candidate against the
     best other one -- the gap, its standard error (exact and paired when one
     of the two is Forge's answer: `seDiff`; otherwise the unpaired
     sqrt(se1^2 + se2^2), an approximation), whether the two overlap at 95%,
     P(the pick is the worse of the two) under a normal approximation, whether
     4x the rounds would separate them (se / 2), and decisions within noise of
     the override margin.  With rank-hand-3 and rank-hand-12 answers: how
     often 12 rounds pick differently from 3, and which pick the truth prefers.
  4. Card hotspots: each regret is credited to the cards of the chosen option
     (cast or activated source, attackers, blockers) and, when the best option
     was another, to that option's cards (`missed`).  Tags come from the
     deciding seat's own view of the card (types, `{X}` in its cost, flash) and
     the decision (an instant cast in combat: `combat-trick`), plus --card-tags.
  5. Loss forensics: for every recorded game the analysed seat lost, the win
     chance at each of its decision rows (the evaluator through eval_serve.py's
     own encoder and forward pass with --model, else the search's own win
     estimate at its searched decisions, an end-of-turn number), the largest
     drop, its turn, and the seat's decisions in that window.  Ladder results:
     each SPRT's (or ladder purpose's) A-side score by cube, game length and
     seat, with the losses counted.

HIDDEN INFORMATION.  Everything is read from the deciding seat's own redacted
log, and a card is named only when that seat's state shows its face (a
redacted stub has no name).  The opponent's hand and library are never read.

OUTPUT under --out (default var/analysis/<name>/): `report.md`, one CSV per
table (`tables/*.csv`; Parquet copies under `tables/` too when pyarrow is
installed and --parquet is not off), `summary.json` (the report's numbers) and
`manifest.json` (the inputs' sha256 and the code version).  Deterministic: the
same inputs give byte-identical report, CSVs and summary (rows sorted, floats
rounded, every bootstrap seeded per group); only manifest.json names the code
version.  Standard library, except --model (numpy) and Parquet (pyarrow).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import os
import random
import re
import sys
import zlib
from collections import Counter, defaultdict
from typing import Any, Iterable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import gates as G  # noqa: E402
import policy_data as P  # noqa: E402
import reserved as R  # noqa: E402

Z95 = 1.959963984540054
LEAF_SCALE = 500.0          # SearchPolicy.LEAF_SCALE (D349): the search's win estimate is sigma(leaf / 500)
DEFAULT_BOOT = 2000
DEFAULT_SEED = 20261004
KINDS = ("spell", "attack", "block", "other")
TURN_BUCKETS = ((1, 3, "1-3"), (4, 6, "4-6"), (7, 9, "7-9"), (10, 12, "10-12"), (13, 10**9, "13+"))
LENGTH_BUCKETS = ((0, 8, "<=8"), (9, 12, "9-12"), (13, 16, "13-16"), (17, 20, "17-20"), (21, 10**9, "21+"))
DIMS = ("kind", "turnBucket", "phaseGroup", "cube", "by")
ROUND = 6


# ---------------------------------------------------------------- small helpers

def rnd(x: Any, nd: int = ROUND) -> Any:
    if isinstance(x, float):
        if math.isnan(x) or math.isinf(x):
            return None
        return round(x, nd)
    return x


def mean(xs: Iterable[float]) -> float | None:
    xs = list(xs)
    return sum(xs) / len(xs) if xs else None


def phi(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def wilson(k: int, n: int) -> tuple[float | None, float | None]:
    if n <= 0:
        return None, None
    p = k / n
    d = 1 + Z95 * Z95 / n
    c = (p + Z95 * Z95 / (2 * n)) / d
    h = Z95 * math.sqrt(p * (1 - p) / n + Z95 * Z95 / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def seed_for(seed: int, key: str) -> int:
    """A group's own bootstrap seed: the result never depends on the order groups are computed in."""
    return (seed * 1_000_003 + zlib.crc32(key.encode("utf-8"))) & 0x7FFFFFFF


def cluster_boot(pairs: list[tuple[str, float]], boots: int, seed: int, key: str) -> tuple[float | None, float | None, float | None]:
    """The mean of the values, and a 95% percentile interval from resampling CLUSTERS (games) with replacement.
    Fewer than two clusters: no interval."""
    if not pairs:
        return None, None, None
    by: dict[str, list[float]] = defaultdict(list)
    for c, v in pairs:
        by[c].append(v)
    est = sum(v for _, v in pairs) / len(pairs)
    keys = sorted(by)
    if len(keys) < 2 or boots <= 0:
        return est, None, None
    sums = [(sum(by[k]), len(by[k])) for k in keys]
    rng = random.Random(seed_for(seed, key))
    m = len(keys)
    stats = []
    for _ in range(boots):
        s = n = 0.0
        for _ in range(m):
            a, b = sums[rng.randrange(m)]
            s += a
            n += b
        stats.append(s / n)
    stats.sort()
    lo = stats[int(math.floor(0.025 * (boots - 1)))]
    hi = stats[int(math.ceil(0.975 * (boots - 1)))]
    return est, lo, hi


def turn_bucket(turn: Any) -> str:
    if not isinstance(turn, int) or turn < 1:
        return "0"
    for lo, hi, name in TURN_BUCKETS:
        if lo <= turn <= hi:
            return name
    return "13+"


def length_bucket(turns: Any) -> str:
    if not isinstance(turns, (int, float)):
        return "?"
    for lo, hi, name in LENGTH_BUCKETS:
        if lo <= turns <= hi:
            return name
    return "21+"


def phase_group(phase: Any) -> str:
    p = str(phase or "").upper()
    if p == "MAIN1":
        return "main1"
    if p == "MAIN2":
        return "main2"
    if p.startswith("COMBAT"):
        return "combat"
    return "other"


def sha12(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def rel(path: str) -> str:
    return os.path.normpath(os.path.relpath(path))


# ---------------------------------------------------------------- tokens (D347's grammar, the grader's)

def norm_token(tok: Any) -> str:
    """One spelling per answer: an attack's or a block's parts sorted (the recorder and the grader may order them
    differently)."""
    t = str(tok if not isinstance(tok, list) else ",".join(str(x) for x in tok))
    for pre in ("attack:", "block:"):
        if t.startswith(pre) and t != pre + "none":
            parts = [p for p in t[len(pre):].split(",") if p]
            return pre + ",".join(sorted(parts, key=lambda s: [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]))
    return t


def token_cards(tok: str) -> list[tuple[int, str]]:
    """(card id, role) of the cards an answer acts with: a cast or activated source, a land, attackers, blockers
    (and, for a block, the attackers it faces), a target."""
    t = norm_token(tok)
    out: list[tuple[int, str]] = []

    def num(s: str) -> int | None:
        s = s.strip()
        return int(s) if s.isdigit() else None
    if t.startswith(("cast:", "land:", "activate:")):
        k, rest = t.split(":", 1)
        i = num(rest.split("#")[0])
        if i is not None:
            out.append((i, {"cast": "cast", "land": "land", "activate": "activate"}[k]))
    elif t.startswith("attack:") and t != "attack:none":
        for p in t[7:].split(","):
            i = num(p)
            if i is not None:
                out.append((i, "attack"))
    elif t.startswith("block:") and t != "block:none":
        for p in t[6:].split(","):
            if ">" in p:
                b, a = p.split(">", 1)
                if num(b) is not None:
                    out.append((num(b), "block"))  # type: ignore[arg-type]
                if num(a) is not None:
                    out.append((num(a), "facing"))  # type: ignore[arg-type]
    elif t.startswith(("target:", "option:")):
        i = num(t.split(":", 1)[1])
        if i is not None:
            out.append((i, "target"))
    return out


def decision_kind(kind: Any, options: list[Any], stratum: Any = None) -> str:
    """spell (a priority decision with a cast option -- gate 2's `spell`), attack, block, or other."""
    s = str(stratum or "")
    if s in ("spell", "attack", "block"):
        return s
    if s == "target":
        return "other"
    k = str(kind or "")
    if k in ("attack", "block"):
        return k
    if k == "priority" and any(str(o).startswith("cast:") for o in options or []):
        return "spell"
    return "other"


def card_index(state: dict[str, Any] | None) -> dict[int, dict[str, Any]]:
    """id -> {name, types, manaCost, keywords, zone, controller} for every card whose face the state shows."""
    out: dict[int, dict[str, Any]] = {}
    if not state:
        return out

    def add(c: Any) -> None:
        if not isinstance(c, dict) or c.get("hidden") or not c.get("name") or not isinstance(c.get("id"), int):
            return
        out.setdefault(c["id"], {"name": str(c["name"]), "types": str(c.get("types") or ""),
                                 "manaCost": str(c.get("manaCost") or ""), "keywords": list(c.get("keywords") or []),
                                 "zone": c.get("zone"), "controller": c.get("controller")})
    for p in state.get("players") or []:
        for z in (p.get("zones") or {}).values():
            for c in (z or {}).get("cards") or []:
                add(c)
    for c in state.get("battlefield") or []:
        add(c)
    for c in state.get("stack") or []:
        if isinstance(c, dict):
            add(c.get("card") or c)
    return out


def card_tags(info: dict[str, Any], role: str, phase: Any, extra: dict[str, list[str]]) -> list[str]:
    tags = []
    ty = info.get("types", "")
    for t in ("Instant", "Sorcery", "Creature", "Planeswalker", "Artifact", "Enchantment", "Land"):
        if t in ty:
            tags.append(t.lower())
    if "{X}" in info.get("manaCost", ""):
        tags.append("x-spell")
    if "FLASH" in [str(k).upper() for k in info.get("keywords") or []]:
        tags.append("flash")
    if role == "activate":
        tags.append("ability")
    if role == "cast" and "Instant" in ty and phase_group(phase) == "combat":
        tags.append("combat-trick")
    tags += extra.get(E.norm_name(info.get("name", "")), [])
    return sorted(set(tags))


def read_card_tags(path: str | None) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    if not path:
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.split("#")[0].rstrip("\n")
            if not line.strip() or "\t" not in line:
                continue
            name, tags = line.split("\t", 1)
            out[E.norm_name(name.strip())] = sorted({t.strip() for t in tags.split(",") if t.strip()})
    return out


# ---------------------------------------------------------------- reading logs

def first_header(path: str) -> dict[str, Any] | None:
    """The session header alone (the first line): enough to filter by policy without reading the game."""
    try:
        for line in E._lines(path):
            line = line.strip()
            if line:
                obj = json.loads(line)
                return obj if obj.get("kind") == "session" else None
    except (OSError, EOFError, json.JSONDecodeError, zlib.error):
        return None
    return None


def seat_policy(header: dict[str, Any]) -> str:
    seat = header.get("seat")
    for s in header.get("seats") or []:
        if s.get("player") == seat:
            return str(s.get("policy") or s.get("kind") or "?")
    return "?"


def cube_of(header: dict[str, Any], path: str) -> str:
    lab = header.get("lab") or {}
    base = os.path.basename(str(lab.get("cubeFile") or "")).replace(".md", "").replace("-cube-180", "")
    if base and base != "cube":
        return base
    if lab.get("cube"):  # a run folder's own copy (cube.md): the cube's title, "The Synergy Cube -- ..." -> synergy
        t = re.split(r"\s+[—–-]+\s+", str(lab["cube"]))[0].lower()
        t = re.sub(r"^the\s+", "", t)
        t = re.sub(r"\s+cube$", "", t)
        return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "?"
    bench = header.get("bench") or {}
    for d in header.get("decks") or []:
        m = re.search(r"([a-z][a-z-]*?)-\d+-[AB]\.dck$", str(d.get("path") or ""))
        if m:
            return m.group(1)
    if bench:
        return "bench:" + os.path.basename(str(bench.get("pairs") or "?"))
    return "?"


class LogCache:
    """Recorded games read on demand, the last few kept (a game's frames are megabytes: never all of them)."""

    def __init__(self, keep: int = 8) -> None:
        self.keep = keep
        self.games: dict[str, list[P.PolicyGame]] = {}
        self.read: set[str] = set()

    def get(self, path: str) -> list[P.PolicyGame]:
        k = rel(path)
        if k in self.games:
            self.games[k] = self.games.pop(k)  # most recent last
            return self.games[k]
        try:
            got = list(P.read_policy_games(path)) if os.path.exists(path) else []
        except (OSError, EOFError, zlib.error):
            got = []
        self.read.add(k)
        self.games[k] = got
        while len(self.games) > self.keep:
            self.games.pop(next(iter(self.games)))
        return got


def game_id(pg: P.PolicyGame) -> str:
    """One id per game, the same for both chairs (D305's split group: seed, decks, players)."""
    return pg.game.split_group


def record_row(pg: P.PolicyGame, rec: dict[str, Any], cube: str, extra_tags: dict[str, list[str]]) -> dict[str, Any]:
    b = rec.get("body") or {}
    opts = list(b.get("options") or [])
    s = b.get("search") if isinstance(b.get("search"), dict) else None
    chosen = norm_token(b.get("chosen"))
    forge_tok = None
    if s and isinstance(s.get("forge"), int) and 0 <= s["forge"] < len(s.get("options") or []):
        forge_tok = norm_token(s["options"][s["forge"]].get("token"))
    elif b.get("by") == "forge":
        forge_tok = chosen
    frame = b.get("frame")
    state = pg.frames[frame].get("body") if isinstance(frame, int) and 0 <= frame < len(pg.frames) else None
    cards = card_index(state)
    named = []
    for cid, role in token_cards(chosen):
        info = cards.get(cid)
        if info:
            named.append({"id": cid, "role": role, "name": info["name"],
                          "tags": card_tags(info, role, b.get("phase"), extra_tags)})
    return {"game": game_id(pg), "log": rel(pg.path), "seat": pg.seat, "policy": seat_policy(pg.header),
            "cube": cube, "frame": frame, "stateSeq": b.get("stateSeq"), "turn": b.get("turn"),
            "phase": b.get("phase"), "phaseGroup": phase_group(b.get("phase")), "turnBucket": turn_bucket(b.get("turn")),
            "recKind": b.get("kind"), "kind": decision_kind(b.get("kind"), opts), "options": len(opts),
            "complete": b.get("complete", True), "by": b.get("by"), "chosen": chosen, "forgeToken": forge_tok,
            "searched": s is not None, "search": s, "cards": named}


def read_records(logs: list[str], policy: str, max_games: int | None, extra_tags: dict[str, list[str]],
                 counts: Counter, srv: Any = None, method: str = "search-estimate"
                 ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Every decision record of every game whose deciding seat matches `policy`, every such game, and the loss
    forensics of each one the seat lost.  One game in memory at a time."""
    files = E.find_logs(logs) if logs else []
    keep = []
    for f in files:
        h = first_header(f)
        if h is None:
            counts["logs: no session header"] += 1
            continue
        if R.not_for_training(h):
            counts[f"logs: {R.NOT_FOR_TRAINING}"] += 1   # D451: a move-atlas game
            continue
        if policy != "any" and seat_policy(h) != policy:
            counts[f"logs: seat policy is not {policy}"] += 1
            continue
        keep.append(f)
    if max_games is not None and len(keep) > max_games:
        counts["logs: over --max-games (left out, hash order)"] += len(keep) - max_games
        keep = sorted(keep, key=lambda p: hashlib.sha256(rel(p).encode()).hexdigest())[:max_games]
    rows: list[dict[str, Any]] = []
    games: list[dict[str, Any]] = []
    fx: list[dict[str, Any]] = []
    for f in sorted(keep, key=rel):
        try:
            pgs = list(P.read_policy_games(f))
        except (OSError, EOFError, zlib.error):
            counts["logs: unreadable"] += 1
            continue
        for pg in pgs:
            counts["games read"] += 1
            if isinstance(pg.header.get("playExplore"), dict):
                counts["games with play exploration (D358): exploring records left out"] += 1
            winner, last_turn, labelled = E.game_outcome(pg.game)
            cube = cube_of(pg.header, f)
            mine = []
            for rec in pg.decisions():
                b = rec.get("body") or {}
                if b.get("seat") != pg.seat:
                    counts["records: another seat's (refused)"] += 1
                    continue
                if b.get("explore"):
                    counts["records: answered by exploration (D358, left out)"] += 1
                    continue
                mine.append(record_row(pg, rec, cube, extra_tags))
            g = {"game": game_id(pg), "log": rel(f), "index": pg.index, "seat": pg.seat,
                 "policy": seat_policy(pg.header), "cube": cube, "winner": winner, "lastTurn": last_turn,
                 "labelled": labelled, "lost": bool(labelled and winner is not None and winner != pg.seat),
                 "records": len(mine)}
            games.append(g)
            rows += mine
            if g["lost"]:
                fx.append(forensic_one(g, pg, mine, srv, method, counts))
    counts["records"] += len(rows)
    counts["records searched"] += sum(1 for r in rows if r["searched"])
    return rows, games, fx


# ---------------------------------------------------------------- 3. the search's own noise (D350)

def noise_row(r: dict[str, Any]) -> dict[str, Any] | None:
    """The chosen candidate against the best other one, in the search's own numbers."""
    s = r.get("search") or {}
    opts = [o for o in s.get("options") or [] if isinstance(o, dict) and o.get("n")]
    if len(opts) < 2:
        return None
    fi = s.get("forge") if isinstance(s.get("forge"), int) else 0
    bi = s.get("best") if isinstance(s.get("best"), int) else fi
    ci = bi if s.get("overrode") else fi
    if not (0 <= ci < len(s["options"])) or s["options"][ci] not in opts:
        return None
    c = s["options"][ci]
    others = [(i, o) for i, o in enumerate(s["options"]) if i != ci and o in opts]
    ri, ro = max(others, key=lambda io: (float(io[1].get("meanLeaf", 0.0)), -io[0]))
    gap = float(c.get("meanLeaf", 0.0)) - float(ro.get("meanLeaf", 0.0))
    gap_win = float(c.get("win", 0.5)) - float(ro.get("win", 0.5))
    if ci == fi:
        se_gap, paired = float(ro.get("seDiff") or 0.0), True
    elif ri == fi:
        se_gap, paired = float(c.get("seDiff") or 0.0), True
    else:
        se_gap, paired = math.sqrt(float(c.get("se") or 0.0) ** 2 + float(ro.get("se") or 0.0) ** 2), False
    rounds = int(min(int(c.get("n") or 0), int(ro.get("n") or 0)))
    estimable = se_gap > 0
    z = gap / se_gap if estimable else None
    ties = sum(1 for i, o in others if float(o.get("meanLeaf", 0.0)) == float(c.get("meanLeaf", 0.0)))
    best = s["options"][bi] if 0 <= bi < len(s["options"]) else None
    d_best = float(best.get("diff") or 0.0) if best else 0.0
    sd_best = float(best.get("seDiff") or 0.0) if best else 0.0
    margin = s.get("margin")
    near_margin = None
    if isinstance(margin, (int, float)) and bi != fi and sd_best > 0:
        near_margin = abs(d_best - float(margin)) < Z95 * sd_best
    return {
        "game": r["game"], "log": r["log"], "frame": r["frame"], "recKind": r["recKind"], "turn": r["turn"], "kind": r["kind"],
        "turnBucket": r["turnBucket"], "phaseGroup": r["phaseGroup"], "cube": r["cube"],
        "candidates": len(opts), "rounds": rounds, "rule": s.get("rule"), "margin": margin,
        "overrode": bool(s.get("overrode")), "timedOut": bool(s.get("timedOut")), "fallback": s.get("fallback"),
        "chosen": norm_token(c.get("token")), "runnerUp": norm_token(ro.get("token")),
        "gapLeaf": rnd(gap), "gapWin": rnd(gap_win), "seGap": rnd(se_gap), "paired": paired,
        "estimable": estimable, "z": rnd(z) if z is not None else None,
        "overlap95": (abs(gap) < Z95 * se_gap) if estimable else None,
        "pWorse": rnd(phi(-gap / se_gap)) if estimable else (0.5 if gap == 0 else None),
        "separatedAt4x": (abs(gap) >= Z95 * se_gap / 2.0) if estimable else None,
        "exactTies": ties, "nearMargin": near_margin, "bestDiff": rnd(d_best), "bestSeDiff": rnd(sd_best),
    }


def noise_summary(rows: list[dict[str, Any]], boots: int, seed: int) -> list[dict[str, Any]]:
    out = []
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        groups["all"].append(r)
        groups["kind=" + r["kind"]].append(r)
    for g in sorted(groups, key=lambda k: (k != "all", k)):
        rs = groups[g]
        est = [r for r in rs if r["estimable"]]
        ov, ovlo, ovhi = cluster_boot([(r["game"], 1.0 if r["overlap95"] else 0.0) for r in est], boots, seed, "ov|" + g)
        pw, pwlo, pwhi = cluster_boot([(r["game"], float(r["pWorse"])) for r in est], boots, seed, "pw|" + g)
        out.append({"group": g, "decisions": len(rs), "games": len({r["game"] for r in rs}),
                    "overrides": sum(1 for r in rs if r["overrode"]),
                    "timedOut": sum(1 for r in rs if r["timedOut"]),
                    "meanRounds": rnd(mean(r["rounds"] for r in rs)),
                    "estimable": len(est), "notEstimable": len(rs) - len(est),
                    "exactTie": sum(1 for r in rs if r["exactTies"] > 0 and r["gapLeaf"] == 0),
                    "overlap95": rnd(ov), "overlap95Lo": rnd(ovlo), "overlap95Hi": rnd(ovhi),
                    "meanPWorse": rnd(pw), "meanPWorseLo": rnd(pwlo), "meanPWorseHi": rnd(pwhi),
                    "notSeparatedAt4x": sum(1 for r in est if not r["separatedAt4x"]),
                    "nearMargin": sum(1 for r in rs if r["nearMargin"]),
                    "meanAbsGapWin": rnd(mean(abs(r["gapWin"]) for r in rs))})
    return out


# ---------------------------------------------------------------- answers (truth, rankers, reviews)

def answer_table(ans: dict[str, Any] | None) -> dict[str, dict[str, Any]] | None:
    """token -> option for an `ok` grader answer; an alias maps to its option's numbers."""
    if not ans or ans.get("status") != "ok":
        return None
    out: dict[str, dict[str, Any]] = {}
    for o in ans.get("options") or []:
        if o.get("alias") or o.get("winRate") is None or not o.get("n"):
            continue
        out[norm_token(o["token"])] = o
    for o in ans.get("options") or []:
        if o.get("alias") and norm_token(o["alias"]) in out:
            out.setdefault(norm_token(o["token"]), out[norm_token(o["alias"])])
    return out if len({id(v) for v in out.values()}) >= 2 else None


def se_of(o: dict[str, Any]) -> float:
    lo, hi = o.get("winLo"), o.get("winHi")
    if isinstance(lo, (int, float)) and isinstance(hi, (int, float)) and hi >= lo:
        return (float(hi) - float(lo)) / (2 * Z95)
    return 0.0


def ranker_pick(t: dict[str, dict[str, Any]], common: list[str]) -> str:
    """The highest mean; ties to Forge's choice, then the table's order (gate_regret_score's rule)."""
    best = None
    for k in common:
        key = (float(t[k]["winRate"]), 1 if t[k].get("forge") else 0)
        if best is None or key > best[0]:
            best = (key, k)
    return best[1]  # type: ignore[index]


def margin_pick(t: dict[str, dict[str, Any]], common: list[str], forge: str, margin_leaf: float) -> str:
    """The margin rule (D312: override only when the best beats Forge's by `margin` leaf points), read through the
    ranker's win scale: d win ~ w(1-w) * margin / 500 at Forge's win rate -- an approximation (the ranker averages
    sigma(leaf/500) over rounds, the search compares mean leaves)."""
    best = ranker_pick(t, common)
    if best == forge:
        return forge
    wf = float(t[forge]["winRate"])
    need = max(1e-9, wf * (1 - wf)) * margin_leaf / LEAF_SCALE
    return best if float(t[best]["winRate"]) - wf >= need else forge


def judge(diff: float, se: float) -> str:
    if se <= 0:
        return "helped" if diff > 0 else "harmful" if diff < 0 else "unclear"
    if diff - Z95 * se > 0:
        return "helped"
    if diff + Z95 * se < 0:
        return "harmful"
    return "unclear"


def truth_rows(set_path: str, truth_path: str, rank3: str | None, rank12: str | None, cache: LogCache,
               extra_tags: dict[str, list[str]], counts: Counter, margin_leaf: float) -> list[dict[str, Any]]:
    dset = G.read_jsonl(set_path)
    tr = {str(x.get("id")): x for x in G.read_jsonl(truth_path)}
    r3 = {str(x.get("id")): x for x in G.read_jsonl(rank3)} if rank3 else {}
    r12 = {str(x.get("id")): x for x in G.read_jsonl(rank12)} if rank12 else {}
    out = []
    for d in dset:
        i = str(d.get("id"))
        t = answer_table(tr.get(i))
        if t is None or (tr.get(i) or {}).get("measure") != "wins":
            counts["truth: no ok full-game answer"] += 1
            continue
        chosen = norm_token(d.get("chosen"))
        if chosen not in t:
            counts["truth: the recorded answer is not in the truth table"] += 1
            continue
        uniq = {}
        for k, o in t.items():
            uniq.setdefault(id(o), k)
        toks = list(uniq.values())
        best_tok = max(toks, key=lambda k: (float(t[k]["winRate"]), -toks.index(k)))
        best = float(t[best_tok]["winRate"])
        c = t[chosen]
        forge_truth = [k for k in toks if t[k].get("forge")]
        pg, rec, header = None, None, {}
        log = d.get("log")
        if log:
            for g in cache.get(log):
                if g.seat == d.get("seat", g.seat):
                    pg, header = g, g.header
                    for f in g.decisions():
                        b = f.get("body") or {}
                        if b.get("frame") == d.get("frame") and decision_kind(b.get("kind"), b.get("options")) == d.get("stratum"):
                            rec = f
                            break
                    break
        cube = cube_of(header, log or "") if header else "?"
        row = {"source": "truth", "id": i, "game": (game_id(pg) if pg else str(d.get("game") or i)),
               "log": rel(log) if log else None, "frame": d.get("frame"), "turn": d.get("turn"),
               "phase": d.get("phase"), "phaseGroup": phase_group(d.get("phase")), "turnBucket": turn_bucket(d.get("turn")),
               "kind": decision_kind(None, [], d.get("stratum")), "cube": cube, "by": d.get("by") or "?",
               "options": len(toks), "chosen": chosen, "best": best_tok, "regret": rnd(best - float(c["winRate"])),
               "regretLo": rnd(float(c.get("regretLo", 0.0) or 0.0)), "regretHi": rnd(float(c.get("regretHi", 0.0) or 0.0)),
               "clear": float(c.get("regretLo") or 0.0) > 0, "measure": "wins"}
        row["forge"] = forge_truth[0] if forge_truth else None
        row["regretForge"] = rnd(best - float(t[forge_truth[0]]["winRate"])) if forge_truth else None
        # the hand ranker (the search's own leaf at its live horizon) against Forge's choice, judged by the truth
        for name, src in (("r3", r3), ("r12", r12)):
            rt = answer_table(src.get(i))
            if rt is None or not forge_truth:
                continue
            common = [k for k in toks if k in rt]
            if len(common) < 2 or forge_truth[0] not in common:
                continue
            pk = ranker_pick(rt, common)
            row[name + "Pick"] = pk
            row[name + "Regret"] = rnd(best - float(t[pk]["winRate"]))
            if name == "r3":
                mp = margin_pick(rt, common, forge_truth[0], margin_leaf)
                row["marginPick"] = mp
                row["marginRegret"] = rnd(best - float(t[mp]["winRate"]))
        # a recorded search decision: its own override, judged by the truth
        b = (rec or {}).get("body") or {}
        s = b.get("search") if isinstance(b.get("search"), dict) else None
        if s and isinstance(s.get("forge"), int) and 0 <= s["forge"] < len(s.get("options") or []):
            ft = norm_token(s["options"][s["forge"]].get("token"))
            row["recForge"] = ft
            row["recOverrode"] = bool(s.get("overrode"))
        state = pg.frames[d["frame"]].get("body") if pg and isinstance(d.get("frame"), int) and d["frame"] < len(pg.frames) else None
        row["_cards"] = card_index(state)
        row["_extra"] = extra_tags
        out.append(row)
    counts["truth rows"] += len(out)
    return out


def disagreement_rows(rows: list[dict[str, Any]], truth: dict[str, dict[str, dict[str, Any]]]) -> list[dict[str, Any]]:
    """Per truth decision and per search variant (the ranker's argmax, the margin rule, the recorded override): the
    truth difference to Forge's choice and its verdict."""
    out = []
    for r in rows:
        t = truth.get(r["id"])
        if not t:
            continue
        for variant, pick_key, forge_key in (("ranker-argmax", "r3Pick", "forge"), ("margin-rule", "marginPick", "forge"),
                                             ("ranker-12", "r12Pick", "forge"), ("recorded", "chosen", "recForge")):
            pk, fk = r.get(pick_key), r.get(forge_key)
            if variant == "recorded" and not r.get("recOverrode"):
                pk = fk if fk else None
            if not pk or not fk or pk not in t or fk not in t:
                continue
            diff = float(t[pk]["winRate"]) - float(t[fk]["winRate"])
            se = math.sqrt(se_of(t[pk]) ** 2 + se_of(t[fk]) ** 2)
            same = t[pk] is t[fk]
            out.append({"id": r["id"], "game": r["game"], "variant": variant, "kind": r["kind"], "turnBucket": r["turnBucket"],
                        "cube": r["cube"], "search": pk, "forge": fk, "disagree": not same,
                        "diff": rnd(diff), "seDiff": rnd(se), "verdict": "same" if same else judge(diff, se)})
    return out


def disagreement_summary(rows: list[dict[str, Any]], boots: int, seed: int) -> list[dict[str, Any]]:
    out = []
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        groups[(r["variant"], "all")].append(r)
        groups[(r["variant"], "kind=" + r["kind"])].append(r)
    for (v, g) in sorted(groups, key=lambda k: (k[0], k[1] != "all", k[1])):
        rs = groups[(v, g)]
        dis = [r for r in rs if r["disagree"]]
        c = Counter(r["verdict"] for r in dis)
        hl, hh = wilson(c["helped"], len(dis))
        bl, bh = wilson(c["harmful"], len(dis))
        md, mlo, mhi = cluster_boot([(r["game"], float(r["diff"])) for r in rs], boots, seed, f"dg|{v}|{g}")
        out.append({"variant": v, "group": g, "decisions": len(rs), "disagree": len(dis),
                    "helped": c["helped"], "harmful": c["harmful"], "unclear": c["unclear"],
                    "helpedRate": rnd(c["helped"] / len(dis)) if dis else None, "helpedLo": rnd(hl), "helpedHi": rnd(hh),
                    "harmfulRate": rnd(c["harmful"] / len(dis)) if dis else None, "harmfulLo": rnd(bl), "harmfulHi": rnd(bh),
                    "meanDiff": rnd(md), "meanDiffLo": rnd(mlo), "meanDiffHi": rnd(mhi)})
    return out


def budget_summary(rows: list[dict[str, Any]], boots: int, seed: int) -> dict[str, Any] | None:
    both = [r for r in rows if r.get("r3Pick") and r.get("r12Pick")]
    if not both:
        return None
    flips = [r for r in both if r["r3Pick"] != r["r12Pick"]]
    fl, fh = wilson(len(flips), len(both))
    d, dlo, dhi = cluster_boot([(r["game"], float(r["r3Regret"]) - float(r["r12Regret"])) for r in both], boots, seed, "budget")
    better = sum(1 for r in flips if r["r12Regret"] < r["r3Regret"])
    worse = sum(1 for r in flips if r["r12Regret"] > r["r3Regret"])
    by = Counter(r["kind"] for r in flips)
    return {"decisions": len(both), "flips": len(flips), "flipRate": rnd(len(flips) / len(both)), "flipLo": rnd(fl), "flipHi": rnd(fh),
            "flips12Better": better, "flips12Worse": worse, "flipsEqual": len(flips) - better - worse,
            "regret3Minus12": rnd(d), "regret3Minus12Lo": rnd(dlo), "regret3Minus12Hi": rnd(dhi),
            "flipsByKind": {k: by[k] for k in sorted(by)}}


def review_rows(paths: list[str], cache: LogCache, extra_tags: dict[str, list[str]], counts: Counter) -> list[dict[str, Any]]:
    out = []
    for p in paths:
        with open(p, encoding="utf-8") as f:
            rep = json.load(f)
        if rep.get("kind") != "game-review" or rep.get("v") != 1:
            counts["review: not a game-review v1 report"] += 1
            continue
        log, seat = rep.get("log"), rep.get("seat")
        pg = None
        for g in cache.get(log) if log else []:
            if g.seat == seat:
                pg = g
                break
        recs = {}
        if pg:
            for f2 in pg.decisions():
                b = f2.get("body") or {}
                recs.setdefault((b.get("frame"), decision_kind(b.get("kind"), b.get("options"))), b)
        cube = cube_of(pg.header, log) if pg else "?"
        gid = game_id(pg) if pg else "review:" + str(rep.get("gameId"))
        if (rep.get("knowledge") or {}).get("opponentModel") == "basic-lands":
            counts["review: opponent modelled as basic lands (every number flatters the player)"] += 1
        for d in rep.get("decisions") or []:
            if d.get("status") != "ok" or d.get("playedOption") is None or d.get("regret") is None:
                counts["review decisions not graded (trivial, unsupported, error or not in the table)"] += 1
                continue
            kind = decision_kind(None, [], d.get("type"))
            rec = recs.get((d.get("stateFrame"), kind))
            by = (rec or {}).get("by") or ("human" if not recs else "?")
            sf = d.get("stateFrame")
            state = pg.frames[sf].get("body") if pg and isinstance(sf, int) and sf < len(pg.frames) else None
            opts = {norm_token(o.get("token")): o for o in d.get("options") or [] if not o.get("alias")}
            forge = norm_token(d["forgeChoice"]) if d.get("forgeChoice") else None
            best_w = max((float(o.get("winRate") or 0.0) for o in opts.values()), default=None)
            out.append({"source": "review-" + str(d.get("measure")), "id": f"{rep.get('gameId')}#{d.get('frame')}",
                        "game": gid, "log": rel(log) if log else None, "frame": sf, "turn": d.get("turn"),
                        "phase": d.get("phase"), "phaseGroup": phase_group(d.get("phase")),
                        "turnBucket": turn_bucket(d.get("turn")), "kind": kind, "cube": cube, "by": by,
                        "options": len(opts), "chosen": norm_token(d["playedOption"]), "best": norm_token(d.get("best")),
                        "regret": rnd(float(d["regret"])), "regretLo": rnd(float(d.get("regretLo") or 0.0)),
                        "regretHi": rnd(float(d.get("regretHi") or 0.0)), "clear": bool(d.get("clear")),
                        "measure": d.get("measure"), "forge": forge,
                        "regretForge": rnd(best_w - float(opts[forge].get("winRate") or 0.0)) if forge in opts and best_w is not None else None,
                        "_cards": card_index(state), "_extra": extra_tags})
    counts["review rows"] += len(out)
    return out


# ---------------------------------------------------------------- 1. regret tables

def regret_tables(rows: list[dict[str, Any]], boots: int, seed: int) -> list[dict[str, Any]]:
    out = []
    by_src: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        by_src[r["source"]].append(r)
    for src in sorted(by_src):
        rs = by_src[src]
        for dim in ("all",) + DIMS:
            groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for r in rs:
                groups["all" if dim == "all" else str(r.get(dim))].append(r)
            for val in sorted(groups):
                g = groups[val]
                key = f"{src}|{dim}|{val}"
                m, lo, hi = cluster_boot([(r["game"], float(r["regret"])) for r in g], boots, seed, "r|" + key)
                c, clo, chi = cluster_boot([(r["game"], 1.0 if r["clear"] else 0.0) for r in g], boots, seed, "c|" + key)
                fr = [r for r in g if r.get("regretForge") is not None]
                fm, flo, fhi = cluster_boot([(r["game"], float(r["regretForge"])) for r in fr], boots, seed, "f|" + key)
                out.append({"source": src, "dim": dim, "value": val, "decisions": len(g), "games": len({r["game"] for r in g}),
                            "meanRegret": rnd(m), "meanRegretLo": rnd(lo), "meanRegretHi": rnd(hi),
                            "totalRegret": rnd(sum(float(r["regret"]) for r in g)),
                            "clearMistakes": sum(1 for r in g if r["clear"]), "clearRate": rnd(c), "clearLo": rnd(clo), "clearHi": rnd(chi),
                            "forgeDecisions": len(fr), "meanRegretForge": rnd(fm), "meanRegretForgeLo": rnd(flo),
                            "meanRegretForgeHi": rnd(fhi)})
    return out


# ---------------------------------------------------------------- 4. card hotspots

def card_credit(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One line per (decision, card, how): the chosen option's cards, and the best option's when it was another."""
    out = []
    for r in rows:
        cards, extra = r.get("_cards") or {}, r.get("_extra") or {}
        hows = [("chosen", r["chosen"])]
        if r.get("best") and r["best"] != r["chosen"]:
            hows.append(("missed", r["best"]))
        seen = set()
        for how, tok in hows:
            for cid, role in token_cards(tok):
                info = cards.get(cid)
                if not info or role in ("facing", "target") and how == "missed":
                    continue
                k = (info["name"], how)
                if k in seen:
                    continue
                seen.add(k)
                out.append({"source": r["source"], "game": r["game"], "id": r["id"], "kind": r["kind"],
                            "card": info["name"], "how": how, "role": role, "regret": r["regret"], "clear": r["clear"],
                            "tags": card_tags(info, role, r.get("phase"), extra)})
    return out


def card_tables(credit: list[dict[str, Any]], boots: int, seed: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    def table(key_of) -> list[dict[str, Any]]:
        groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for c in credit:
            for k in key_of(c):
                groups[(c["source"], k)].append(c)
        rows = []
        for (src, k), g in groups.items():
            dec = {}
            for c in g:  # a card both chosen and missed in one decision counts its regret once
                dec.setdefault(c["id"], c)
            gd = list(dec.values())
            m, lo, hi = cluster_boot([(c["game"], float(c["regret"])) for c in gd], boots, seed, f"card|{src}|{k}")
            rows.append({"source": src, "key": k, "decisions": len(gd), "games": len({c["game"] for c in gd}),
                         "totalRegret": rnd(sum(float(c["regret"]) for c in gd)), "meanRegret": rnd(m),
                         "meanRegretLo": rnd(lo), "meanRegretHi": rnd(hi), "clearMistakes": sum(1 for c in gd if c["clear"]),
                         "asChosen": sum(1 for c in g if c["how"] == "chosen"), "asMissed": sum(1 for c in g if c["how"] == "missed"),
                         "kinds": ",".join(sorted({c["kind"] for c in gd})),
                         "tags": ",".join(sorted({t for c in g for t in c["tags"]}))})
        rows.sort(key=lambda r: (r["source"], -(r["totalRegret"] or 0.0), r["key"]))
        return rows
    return table(lambda c: [c["card"]]), table(lambda c: c["tags"] or ["(untagged)"])


def search_card_table(records: list[dict[str, Any]], noise: dict[tuple[str, Any], dict[str, Any]]) -> list[dict[str, Any]]:
    """Without truth: per card, how often the search ran on a decision acting with it, overrode Forge, or chose
    within its own noise."""
    groups: dict[str, list[tuple[dict[str, Any], dict[str, Any] | None]]] = defaultdict(list)
    for r in records:
        if not r["searched"]:
            continue
        nr = noise.get((r["log"], r["frame"], r["recKind"]))
        for c in r["cards"]:
            groups[c["name"]].append((r, nr))
    rows = []
    for name, g in groups.items():
        rows.append({"card": name, "searched": len(g), "games": len({r["game"] for r, _ in g}),
                     "overrides": sum(1 for r, _ in g if (r["search"] or {}).get("overrode")),
                     "withinNoise": sum(1 for _, n in g if n and n["overlap95"]),
                     "notEstimable": sum(1 for _, n in g if n and not n["estimable"]),
                     "kinds": ",".join(sorted({r["kind"] for r, _ in g}))})
    rows.sort(key=lambda r: (-r["searched"], r["card"]))
    return rows


# ---------------------------------------------------------------- 5. loss forensics

def biggest_drop(points: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The largest fall between two consecutive points (p, seq, turn): the first such pair on a tie."""
    best = None
    for a, b in zip(points, points[1:]):
        d = float(a["p"]) - float(b["p"])
        if best is None or d > best[0]:
            best = (d, a, b)
    if best is None:
        return None
    d, a, b = best
    return {"drop": d, "from": a, "to": b}


def load_evaluator(model: str | None, counts: Counter) -> tuple[Any, str]:
    if not model:
        return None, "search-estimate"
    try:
        import eval_serve as S
        srv = S.Served(model)
        return srv, f"evaluator:{srv.sha12}"
    except Exception as e:  # noqa: BLE001 - reported; the search's own estimate is the fallback
        counts[f"forensics: the evaluator could not be loaded ({type(e).__name__}: {e}); search estimate used"] += 1
        return None, "search-estimate"


def forensic_one(g: dict[str, Any], pg: P.PolicyGame, records: list[dict[str, Any]], srv: Any, method: str,
                 counts: Counter) -> dict[str, Any]:
    """A lost game: the seat's win chance at each point, the largest fall, and the seat's decisions there."""
    recs = sorted(records, key=lambda r: (r["stateSeq"] if isinstance(r["stateSeq"], int) else -1,
                                          r["frame"] if isinstance(r["frame"], int) else -1))
    points: list[dict[str, Any]] = []
    if srv is not None:
        for row in E.encode_game(pg.game, srv.schema):
            points.append({"p": srv.p_of(row.features), "seq": row.seq, "turn": row.turn, "phase": row.phase})
    else:
        for r in recs:
            s = r.get("search") or {}
            opts = s.get("options") or []
            ci_ = s.get("best") if s.get("overrode") else s.get("forge")
            if isinstance(ci_, int) and 0 <= ci_ < len(opts) and isinstance(opts[ci_].get("win"), (int, float)) \
                    and isinstance(r["stateSeq"], int):
                points.append({"p": float(opts[ci_]["win"]), "seq": r["stateSeq"], "turn": r["turn"], "phase": r["phase"]})
    drop = biggest_drop(points)
    row = {"game": g["game"], "log": g["log"], "seat": g["seat"], "policy": g["policy"], "cube": g["cube"],
           "lastTurn": g["lastTurn"], "method": method, "points": len(points)}
    if drop is None:
        counts["forensics: lost game with fewer than two points"] += 1
        return row
    a, b = drop["from"], drop["to"]
    window = [r for r in recs if isinstance(r["stateSeq"], int) and a["seq"] <= r["stateSeq"] <= b["seq"]]
    if not window:  # the drop came between decisions: the last decision before it
        window = [r for r in recs if isinstance(r["stateSeq"], int) and r["stateSeq"] <= a["seq"]][-1:]
    last = window[-1] if window else None
    if last is not None and isinstance(last["stateSeq"], int) and last["stateSeq"] == b["seq"] and len(window) > 1:
        last = window[-2]  # a decision taken AT the lower point comes after the fall
    row.update({"pStart": rnd(points[0]["p"]), "pEnd": rnd(points[-1]["p"]), "drop": rnd(drop["drop"]),
                "fromSeq": a["seq"], "toSeq": b["seq"], "fromTurn": a["turn"], "toTurn": b["turn"],
                "dropTurnBucket": turn_bucket(b["turn"]), "toPhase": b["phase"], "acrossTurns": a["turn"] != b["turn"],
                "windowDecisions": len(window), "windowSearched": sum(1 for r in window if r["searched"]),
                "windowOverrides": sum(1 for r in window if (r.get("search") or {}).get("overrode")),
                "decisionKind": last["kind"] if last else None, "decisionBy": last["by"] if last else None,
                "decisionChosen": last["chosen"] if last else None,
                "decisionCards": ",".join(c["name"] for c in last["cards"]) if last else None,
                "decisionFrame": last["frame"] if last else None})
    return row


def ladder_tables(ladder_dir: str, boots: int, seed: int, counts: Counter) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rdir = os.path.join(ladder_dir, "results")
    recs: dict[str, dict[str, Any]] = {}
    if os.path.isdir(rdir):
        for fn in sorted(os.listdir(rdir)):
            if fn.endswith(".jsonl"):
                for r in G.read_jsonl(os.path.join(rdir, fn)):
                    if r.get("v") == 1 and r.get("id") and r["id"] not in recs:
                        recs[r["id"]] = r
    sprts = G.read_jsonl(os.path.join(ladder_dir, "sprt.jsonl"))
    counts["ladder games"] += len(recs)
    a_of: dict[str, tuple[str, str | None]] = {}
    for s in sprts:
        a_of["sprt:" + str(s.get("id"))] = (str(s.get("a")), s.get("ah"))
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in recs.values():
        groups[str(r.get("purpose"))].append(r)
    rows = []
    for purpose in sorted(groups):
        rs = groups[purpose]
        a_name, a_hash = a_of.get(purpose, (None, None))
        if a_name is None:
            a_name = Counter(r["a"] for r in rs).most_common(1)[0][0]
        pts = []
        for r in rs:
            if r.get("w") not in ("a", "b"):
                continue
            a_is_a = (r.get("ah") == a_hash) if a_hash else (r.get("a") == a_name)
            b_name = r.get("b") if a_is_a else r.get("a")
            won = (r["w"] == "a") == a_is_a
            m = re.search(r"([a-z][a-z-]*?)-\d+-[AB]\.dck$", str(r.get("aDeck") or ""))
            m4 = int(r.get("g") or 0) % 4
            block = f"{r.get('host')}:{r.get('run')}:{r.get('batch')}:{r.get('pair')}:{int(r.get('g') or 0) - m4}:{0 if m4 in (0, 3) else 1}"
            a_seat = r.get("aSeat") if a_is_a else (1 - int(r.get("aSeat") or 0))
            pts.append({"block": block, "won": won, "opp": b_name, "cube": m.group(1) if m else "?",
                        "length": length_bucket(r.get("turns")), "seat": str(a_seat)})
        draws = sum(1 for r in rs if r.get("w") == "d")
        for dim in ("all", "cube", "length", "seat", "opp"):
            gs: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for p in pts:
                gs["all" if dim == "all" else str(p[dim])].append(p)
            for val in sorted(gs):
                g = gs[val]
                s, lo, hi = cluster_boot([(p["block"], 1.0 if p["won"] else 0.0) for p in g], boots, seed, f"lad|{purpose}|{dim}|{val}")
                rows.append({"purpose": purpose, "a": a_name, "dim": dim, "value": val, "games": len(g),
                             "aLosses": sum(1 for p in g if not p["won"]), "aScore": rnd(s), "aScoreLo": rnd(lo),
                             "aScoreHi": rnd(hi), "draws": draws if dim == "all" else None})
    sp = [{k: s.get(k) for k in ("id", "a", "b", "elo0", "elo1", "result", "games", "pairs", "score", "llr", "lower", "upper")}
          for s in sprts]
    return rows, sp


# ---------------------------------------------------------------- output

def clean(row: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in row.items():
        if k.startswith("_"):
            continue
        if isinstance(v, (list, dict)):
            v = json.dumps(v, sort_keys=True)
        out[k] = rnd(v) if isinstance(v, float) else v
    return out


def write_table(out_dir: str, name: str, rows: list[dict[str, Any]], parquet: str, written: list[str]) -> None:
    rows = [clean(r) for r in rows]
    cols: list[str] = []
    for r in rows:
        for k in r:
            if k not in cols:
                cols.append(k)
    d = os.path.join(out_dir, "tables")
    os.makedirs(d, exist_ok=True)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, lineterminator="\n", extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in cols})
    with open(os.path.join(d, name + ".csv"), "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())
    written.append(f"tables/{name}.csv")
    if parquet == "off" or not cols:
        return
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        if parquet == "on":
            raise SystemExit("search_errors: --parquet on needs pyarrow (pip install pyarrow), or use --parquet auto|off")
        return
    data = {k: [r.get(k) for r in rows] for k in cols}
    tbl = pa.table({k: pa.array([None if v is None else str(v) for v in vs]) if len({type(v) for v in vs if v is not None}) > 1
                    else pa.array(vs) for k, vs in data.items()})
    pq.write_table(tbl, os.path.join(d, name + ".parquet"))
    written.append(f"tables/{name}.parquet")


def fmt(x: Any, pct: bool = False, nd: int = 3) -> str:
    if x is None:
        return "–"
    if pct:
        return f"{100 * x:.1f}%"
    if isinstance(x, float):
        return f"{x:.{nd}f}"
    return str(x)


def ci(m: Any, lo: Any, hi: Any, pct: bool = False, nd: int = 3) -> str:
    if m is None:
        return "–"
    if lo is None or hi is None:
        return f"{fmt(m, pct, nd)} (no interval: one game)"
    return f"{fmt(m, pct, nd)} [{fmt(lo, pct, nd)}, {fmt(hi, pct, nd)}]"


def md_table(head: list[str], rows: list[list[str]]) -> list[str]:
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return out


def report(name: str, inputs: dict[str, Any], counts: Counter, S: dict[str, Any]) -> str:
    L = [f"# Search error analysis: {name}", "",
         "Generated by `tools/ml/search_errors.py` (D367). Intervals are 95% percentile bootstraps over games "
         "(ladder: mirror blocks); `–` means no data. A *leaf* number is an end-of-turn estimate, not a win rate.", "",
         "## Inputs", ""]
    for k in ("logs", "policy", "truthSet", "truth", "rank3", "rank12", "reviews", "ladder", "model"):
        v = inputs.get(k)
        L.append(f"- **{k}**: {', '.join(v) if isinstance(v, list) and v else (v if v not in (None, []) else 'not given')}")
    L += ["", "Read and left out:", ""]
    L += [f"- {k}: {counts[k]}" for k in sorted(counts)] or ["- nothing"]

    L += ["", "## 1. Regret by decision kind, turn, phase, cube and policy", ""]
    rt = S["regret"]
    if not rt:
        L.append("No regret source was given (truth tables or review reports).")
    for src in sorted({r["source"] for r in rt}):
        L += ["", f"### Source `{src}`", ""]
        rows = []
        for r in rt:
            if r["source"] != src:
                continue
            rows.append([r["dim"], r["value"], str(r["decisions"]), str(r["games"]),
                         ci(r["meanRegret"], r["meanRegretLo"], r["meanRegretHi"]),
                         f"{r['clearMistakes']} ({ci(r['clearRate'], r['clearLo'], r['clearHi'], pct=True)})",
                         ci(r["meanRegretForge"], r["meanRegretForgeLo"], r["meanRegretForgeHi"])])
        L += md_table(["by", "value", "decisions", "games", "mean regret", "clear mistakes", "Forge's regret, same decisions"], rows)

    L += ["", "## 2. The search against Forge, judged by the truth", ""]
    if not S["disagreement"]:
        L.append("No truth tables with ranker answers or recorded search decisions: nothing to judge.")
    else:
        L.append("`helped`: truth(search) − truth(Forge) > 0 with its interval (unpaired, from the two options' "
                 "truth intervals) excluding 0; `harmful`: below 0; else `unclear`. Rates are of the decisions where "
                 "the two differ. *ranker-argmax* is the hand ranker's top option (search-v1-fixed3's ranking, no "
                 "margin); *margin-rule* applies D312's 20-point margin through the win scale (approximate); "
                 "*recorded* is what a recorded search seat actually did.")
        L.append("")
        rows = [[r["variant"], r["group"], str(r["decisions"]), str(r["disagree"]), str(r["helped"]), str(r["harmful"]),
                 str(r["unclear"]), ci(r["helpedRate"], r["helpedLo"], r["helpedHi"], pct=True),
                 ci(r["harmfulRate"], r["harmfulLo"], r["harmfulHi"], pct=True),
                 ci(r["meanDiff"], r["meanDiffLo"], r["meanDiffHi"])] for r in S["disagreement"]]
        L += md_table(["variant", "group", "decisions", "differ", "helped", "harmful", "unclear", "helped rate",
                       "harmful rate", "mean truth(search) − truth(Forge)"], rows)

    L += ["", "## 3. The search's own noise (D350 reports)", ""]
    if not S["noise"]:
        L.append("No recorded searched decision with two or more candidates.")
    else:
        L.append("The chosen candidate against the best other one. `overlap` = the 95% intervals of the gap include "
                 "zero; `P(worse)` = the normal-approximation chance the pick is the worse of the two; `not separated at "
                 "4x` = still within noise with four times the rounds; `not estimable` = a standard error of zero "
                 "(every round agreed, or too few rounds).")
        L.append("")
        rows = [[r["group"], str(r["decisions"]), str(r["games"]), str(r["overrides"]), fmt(r["meanRounds"], nd=1),
                 str(r["notEstimable"]), str(r["exactTie"]), ci(r["overlap95"], r["overlap95Lo"], r["overlap95Hi"], pct=True),
                 ci(r["meanPWorse"], r["meanPWorseLo"], r["meanPWorseHi"], pct=True), str(r["notSeparatedAt4x"]),
                 str(r["nearMargin"]), fmt(r["meanAbsGapWin"])] for r in S["noise"]]
        L += md_table(["group", "decisions", "games", "overrides", "rounds", "not estimable", "exact ties", "overlap",
                       "P(worse)", "not separated at 4x", "near the margin", "mean |gap| (win pts)"], rows)
    b = S.get("budget")
    L += ["", "### Bigger budget: 3 rounds against 12 (gate 2's hand rankers)", ""]
    if not b:
        L.append("No rank-hand-3 and rank-hand-12 answers were given.")
    else:
        L.append(f"Of {b['decisions']} decisions, 12 rounds pick differently from 3 in {b['flips']} "
                 f"({ci(b['flipRate'], b['flipLo'], b['flipHi'], pct=True)}); of those flips the truth prefers the "
                 f"12-round pick {b['flips12Better']} times, the 3-round pick {b['flips12Worse']} times "
                 f"({b['flipsEqual']} equal). Mean regret(3) − regret(12): "
                 f"{ci(b['regret3Minus12'], b['regret3Minus12Lo'], b['regret3Minus12Hi'])}. Flips by kind: "
                 f"{json.dumps(b['flipsByKind'])}.")

    L += ["", "## 4. Card hotspots", ""]
    cards, tags = S["cards"], S["tags"]
    if not cards:
        L.append("No regret rows with a card the deciding seat could see.")
    else:
        for src in sorted({c["source"] for c in cards}):
            top = [c for c in cards if c["source"] == src][:15]
            L += ["", f"### Cards, source `{src}` (by total regret; top 15)", ""]
            L += md_table(["card", "decisions", "games", "total regret", "mean regret", "clear", "chosen", "missed", "kinds", "tags"],
                          [[c["key"], str(c["decisions"]), str(c["games"]), fmt(c["totalRegret"]),
                            ci(c["meanRegret"], c["meanRegretLo"], c["meanRegretHi"]), str(c["clearMistakes"]),
                            str(c["asChosen"]), str(c["asMissed"]), c["kinds"], c["tags"]] for c in top])
            tt = [t for t in tags if t["source"] == src]
            L += ["", f"### Card tags, source `{src}`", ""]
            L += md_table(["tag", "decisions", "games", "total regret", "mean regret", "clear"],
                          [[t["key"], str(t["decisions"]), str(t["games"]), fmt(t["totalRegret"]),
                            ci(t["meanRegret"], t["meanRegretLo"], t["meanRegretHi"]), str(t["clearMistakes"])] for t in tt])
    sc = S["searchCards"][:15]
    if sc:
        L += ["", "### Cards the search decided most often (no truth needed; top 15)", ""]
        L += md_table(["card", "searched", "games", "overrides", "within noise", "not estimable", "kinds"],
                      [[c["card"], str(c["searched"]), str(c["games"]), str(c["overrides"]), str(c["withinNoise"]),
                        str(c["notEstimable"]), c["kinds"]] for c in sc])

    L += ["", "## 5. Loss forensics", ""]
    fx = S["forensics"]
    if not fx:
        L.append("No recorded game lost by the analysed seats.")
    else:
        L.append(f"Method: `{S['forensicsMethod']}` (`search-estimate` = the search's own win estimate of its pick at "
                 "each searched decision: an end-of-turn number, sparse). The largest single fall in the seat's win "
                 "chance, and the seat's decisions in that window (or the last one before it).")
        L.append("")
        with_drop = [r for r in fx if r.get("drop") is not None]
        tb = Counter(r["dropTurnBucket"] for r in with_drop)
        kb = Counter(str(r["decisionKind"]) for r in with_drop)
        L.append(f"- lost games: {len(fx)}; with a drop: {len(with_drop)}; mean largest drop "
                 f"{fmt(mean(r['drop'] for r in with_drop))}")
        L.append(f"- drop by turn bucket: {json.dumps({k: tb[k] for k in sorted(tb)})}")
        L.append(f"- the decision there, by kind: {json.dumps({k: kb[k] for k in sorted(kb)})}; "
                 f"searched in the window: {sum(1 for r in with_drop if r['windowSearched'])}; "
                 f"an override in the window: {sum(1 for r in with_drop if r['windowOverrides'])}; "
                 f"the drop spans a turn change: {sum(1 for r in with_drop if r['acrossTurns'])}")
        L.append("")
        top = sorted(with_drop, key=lambda r: (-r["drop"], r["log"]))[:10]
        L += md_table(["log", "cube", "drop", "turn", "phase", "decision", "by", "cards"],
                      [[r["log"], r["cube"], fmt(r["drop"]), f"{r['fromTurn']}→{r['toTurn']}", str(r["toPhase"]),
                        f"{r['decisionKind']} `{r['decisionChosen']}`", str(r["decisionBy"]), str(r["decisionCards"] or "")]
                       for r in top])
    lad = S["ladder"]
    L += ["", "### Ladder and SPRT results", ""]
    if not lad and not S["sprt"]:
        L.append("No ladder folder was given, or it held no results.")
    else:
        for s in S["sprt"]:
            L.append(f"- SPRT `{s.get('id')}`: {s.get('a')} vs {s.get('b')}, {s.get('result')}, {s.get('games')} games, "
                     f"score {s.get('score')}, LLR {s.get('llr')} in [{s.get('lower')}, {s.get('upper')}]")
        L.append("")
        L += md_table(["purpose", "A", "by", "value", "games", "A's losses", "A's score"],
                      [[r["purpose"], r["a"], r["dim"], r["value"], str(r["games"]), str(r["aLosses"]),
                        ci(r["aScore"], r["aScoreLo"], r["aScoreHi"], pct=True)] for r in lad if r["dim"] != "opp"])

    L += ["", "## Caveats", "",
          "- Regret against a truth table is measured from the table's own best option, whose estimate is biased "
          "upward (the maximum of noisy means); differences between two picks on one table (section 2, budget) do "
          "not carry that bias.",
          "- Section 2's interval on a difference treats the two options' truth intervals as independent; the truth "
          "plays them on common seeds, so the real interval is narrower and `unclear` is conservative.",
          "- The margin-rule variant is an approximation through the win scale; the LCB rule (D350) needs the "
          "paired per-round differences, which the rankers do not report, and is not simulated.",
          "- `review-leaf` regrets are end-of-turn estimates on the fitted leaf scale (D349), not win rates.",
          "- Card credit is shared: a decision's regret is counted once per card it names, so card totals overlap.",
          ""]
    return "\n".join(L)


def summary_numbers(S: dict[str, Any]) -> dict[str, Any]:
    """The flat numbers a job's checks read."""
    out: dict[str, Any] = {"records": S["counts"].get("records", 0), "searched": S["counts"].get("records searched", 0),
                           "noiseDecisions": next((r["decisions"] for r in S["noise"] if r["group"] == "all"), 0),
                           "truthRows": S["counts"].get("truth rows", 0), "reviewRows": S["counts"].get("review rows", 0),
                           "lostGames": len(S["forensics"]), "ladderGames": S["counts"].get("ladder games", 0)}
    for r in S["regret"]:
        if r["dim"] == "all":
            out[f"regret_{r['source']}_mean"] = r["meanRegret"]
            out[f"regret_{r['source']}_decisions"] = r["decisions"]
    for r in S["disagreement"]:
        if r["group"] == "all":
            out[f"{r['variant']}_differ"] = r["disagree"]
            out[f"{r['variant']}_helped"] = r["helped"]
            out[f"{r['variant']}_harmful"] = r["harmful"]
    nz = next((r for r in S["noise"] if r["group"] == "all"), None)
    if nz:
        out["noise_overlap95"] = nz["overlap95"]
        out["noise_meanPWorse"] = nz["meanPWorse"]
    if S.get("budget"):
        out["budget_flipRate"] = S["budget"]["flipRate"]
    out["written"] = 1
    # a job's check lines name metrics as [A-Za-z0-9_] (tools/runner/expr.ts)
    return {re.sub(r"[^A-Za-z0-9_]", "_", k): v for k, v in out.items()}


def file_shas(paths: Iterable[str]) -> dict[str, str]:
    out = {}
    for p in sorted(set(paths)):
        if os.path.isfile(p):
            out[rel(p)] = G.file_sha(p)
    return out


def run(a: argparse.Namespace) -> dict[str, Any]:
    out_dir = a.out or os.path.join("var", "analysis", a.name)
    counts: Counter = Counter()
    cache = LogCache()
    tags = read_card_tags(a.card_tags)
    srv, method = load_evaluator(a.model, counts)
    records, games, fx = read_records(a.logs or [], a.policy, a.max_games, tags, counts, srv, method)
    noise = [n for n in (noise_row(r) for r in records if r["searched"]) if n is not None]
    noise_by = {(n["log"], n["frame"], n["recKind"]): n for n in noise}
    regret_src: list[dict[str, Any]] = []
    truth_tabs: dict[str, dict[str, dict[str, Any]]] = {}
    tr_rows: list[dict[str, Any]] = []
    if a.truth_set and a.truth:
        tr_rows = truth_rows(a.truth_set, a.truth, a.rank3, a.rank12, cache, tags, counts, a.margin)
        tr = {str(x.get("id")): x for x in G.read_jsonl(a.truth)}
        for r in tr_rows:
            t = answer_table(tr.get(r["id"]))
            if t:
                truth_tabs[r["id"]] = t
        regret_src += tr_rows
    regret_src += review_rows(a.review or [], cache, tags, counts)
    dis = disagreement_rows(tr_rows, truth_tabs)
    credit = card_credit(regret_src)
    cards, tag_rows = card_tables(credit, a.boot, a.seed)
    lad, sprt = ladder_tables(a.ladder, a.boot, a.seed, counts) if a.ladder else ([], [])
    S = {"counts": counts, "noise": noise_summary(noise, a.boot, a.seed), "regret": regret_tables(regret_src, a.boot, a.seed),
         "disagreement": disagreement_summary(dis, a.boot, a.seed), "budget": budget_summary(tr_rows, a.boot, a.seed),
         "cards": cards, "tags": tag_rows, "searchCards": search_card_table(records, noise_by),
         "forensics": fx, "forensicsMethod": method, "ladder": lad, "sprt": sprt}
    inputs = {"logs": a.logs or [], "policy": a.policy, "truthSet": a.truth_set, "truth": a.truth, "rank3": a.rank3,
              "rank12": a.rank12, "reviews": a.review or [], "ladder": a.ladder, "model": a.model}
    os.makedirs(out_dir, exist_ok=True)
    written: list[str] = []
    decisions = sorted(records, key=lambda r: (r["log"], r["seat"], r["frame"] if isinstance(r["frame"], int) else -1, str(r["recKind"])))
    dec_rows = [{k: v for k, v in r.items() if k not in ("search", "cards")} | {
        "cards": ",".join(c["name"] for c in r["cards"]),
        "overrode": (r["search"] or {}).get("overrode") if r["searched"] else None,
        "rounds": (r["search"] or {}).get("rounds") if r["searched"] else None,
        "fallback": (r["search"] or {}).get("fallback") if r["searched"] else None} for r in decisions]
    for name, rows in (("decisions", dec_rows),
                       ("noise", sorted(noise, key=lambda r: (r["log"], r["frame"]))),
                       ("noise_summary", S["noise"]),
                       ("regret_rows", sorted(regret_src, key=lambda r: (r["source"], r["id"]))),
                       ("regret_by", S["regret"]),
                       ("disagreement", sorted(dis, key=lambda r: (r["variant"], r["id"]))),
                       ("disagreement_summary", S["disagreement"]),
                       ("budget", [S["budget"]] if S["budget"] else []),
                       ("card_credit", sorted(credit, key=lambda r: (r["source"], r["id"], r["card"], r["how"]))),
                       ("cards", cards), ("card_tags", tag_rows), ("cards_search", S["searchCards"]),
                       ("forensics", sorted(fx, key=lambda r: (r["log"], r["seat"]))),
                       ("ladder", lad), ("sprt", sprt)):
        write_table(out_dir, name, rows, a.parquet, written)
    md = report(a.name, inputs, counts, S)
    with open(os.path.join(out_dir, "report.md"), "w", encoding="utf-8") as f:
        f.write(md)
    summ = summary_numbers(S)
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summ, f, indent=1, sort_keys=True)
        f.write("\n")
    in_files = [x for x in (a.truth_set, a.truth, a.rank3, a.rank12, a.model, a.card_tags) if x] + list(a.review or [])
    if a.ladder:
        in_files += [os.path.join(a.ladder, "sprt.jsonl")]
        rdir = os.path.join(a.ladder, "results")
        if os.path.isdir(rdir):
            in_files += [os.path.join(rdir, f) for f in os.listdir(rdir) if f.endswith(".jsonl")]
    man = {"tool": "search_errors", "decision": "D367", "name": a.name, "inputs": inputs, "inputSha256": file_shas(in_files),
           "gamesRead": len(games), "answerLogsRead": len(cache.read), "boot": a.boot, "seed": a.seed, "margin": a.margin, "written": written + ["report.md", "summary.json"],
           "version": G.code_version(a.repo)}
    G.write_json(os.path.join(out_dir, "manifest.json"), man)
    print(json.dumps({"out": out_dir} | summ, sort_keys=True))
    return S


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--name", required=True, help="the analysis's name: var/analysis/<name>/ by default")
    ap.add_argument("--out")
    ap.add_argument("--logs", action="append", help="recordings with decision records (files or folders)")
    ap.add_argument("--policy", default="search", help="read the logs whose seat's policy is this (search, forge, outlets) or any")
    ap.add_argument("--max-games", type=int, help="at most this many logs, in a fixed hash order")
    ap.add_argument("--truth-set", help="gate 2's set.jsonl")
    ap.add_argument("--truth", help="gate 2's truth.jsonl (full-game tables)")
    ap.add_argument("--rank3", help="the hand ranker at 3 rounds (rank-hand-3.jsonl)")
    ap.add_argument("--rank12", help="the hand ranker at 12 rounds (rank-hand-12.jsonl)")
    ap.add_argument("--review", action="append", help="a game-review report (repeatable)")
    ap.add_argument("--ladder", help="the AI ladder's folder (results/, sprt.jsonl)")
    ap.add_argument("--model", help="an evaluator for loss forensics (needs numpy)")
    ap.add_argument("--card-tags", help="a TSV of card name and comma-separated tags (modal, trick, ...)")
    ap.add_argument("--margin", type=float, default=20.0, help="the margin rule's leaf points (D312's default 20)")
    ap.add_argument("--boot", type=int, default=DEFAULT_BOOT)
    ap.add_argument("--seed", type=int, default=DEFAULT_SEED)
    ap.add_argument("--parquet", choices=("auto", "on", "off"), default="auto")
    ap.add_argument("--repo", default=".")
    a = ap.parse_args(argv)
    if bool(a.truth_set) != bool(a.truth):
        ap.error("--truth-set and --truth go together")
    if (a.rank3 or a.rank12) and not a.truth:
        ap.error("--rank3 / --rank12 need the truth tables")
    if not (a.logs or a.truth or a.review or a.ladder):
        ap.error("nothing to read: give --logs, --truth-set/--truth, --review or --ladder")
    run(a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
