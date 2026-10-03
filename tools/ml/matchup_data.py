#!/usr/bin/env python3
# mtg-table — tools/ml: the matchup dataset, one row per decisive cube-lab game.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Deck pairs and results from cube lab run folders, standard library only.

    python3 tools/ml/matchup_data.py <run-dir-or-root>... --out var/ml/matchup/games.jsonl
        [--facts var/cubelab/facts] [--cards-out cards.json]

The cube lab already writes everything the matchup model needs, in
drafts.jsonl (docs/guides/cube-lab.md): both drafters' played 40-card decks,
every game's winner and who was on the play (`onPlayVerified`, else
`onPlay`), and the cube (run.json's `cubeFile`; a bridge run's `bridge` block
and each draft line's `bridge.from`).  So nothing new is written by the lab:
this reads the folders it already writes and emits THE RECORD (v1), one JSON
line per decisive game:

    {"v": 1, "id": "<pool>#<seed>#g<n>", "draft": "<pool>#<seed>", "pool": "vintage" | "bridge:pauper+vintage",
     "kind": "normal" | "bridge", "cubes": ["pauper", "vintage"], "seed": 7, "game": 1,
     "deckA": {"Lightning Bolt": 1, ..., "Mountain": 8}, "deckB": {...},
     "onPlay": "A" | "B", "winner": "A" | "B",
     "from": {"Lightning Bolt": "pauper", ...},      # bridge only: the cube each card of both decks came from
     "run": "<the run folder, relative to the repo>",
     "ver": "<the lab version that drafted and played it>" | "unversioned"}   # D333, tools/cubelab/versions.ts

`ver` is the lab version (code tree, jar, ratings, cube, weights) stamped on
the draft's line since D333; `collect(..., vers=...)` keeps only some, and the
model's report counts games per version, so a night run on other code can be
split off rather than silently pooled.

NO RESERVED DECKS.  A game whose deck A or B is, card for card, a deck of the
AI ladder's dev or confirm set (tools/ai-bench/pairs-*.txt, reserved.py) is
dropped and counted (`stats["reserved"]`), whatever its seed: those decks are
the ladder's held-out yardstick (methodology review 2, N4; D332).

Draws (timeouts) and engine errors are left out (a draw says nothing about
who is stronger).  `draft` groups every game of one deck pair: the split is by
it, never by game.

NO DOUBLE COUNTING.  A game is identified by its pool, seed, game number and
the two decks themselves (a hash of both lists).  The same draft found in two
folders (a copied run, a queue folder under a root also passed on its own) is
read once.  Cards are keyed by their Forge name, so a card's games in Omega
and in Vintage are one card's games; `overlap_report` says how many games are
shared that way.

Card data for the model's features: every `var/cubelab/facts/*.json` the lab
cached when it looked cards up in the engine (Forge's own database: type,
colours, cost, mana value, P/T, oracle text, draft rank), merged by name, with
each run's cards.json as a fallback.  `card_features` turns one into a fixed
vector, so the model can guess about a card it never saw played.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import math
import os
import re
import sys
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

BASICS = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}
RECORD_VERSION = 1


def cube_id(file: str) -> str:
    """`cubes/fair-fight-cube-180.md` -> `fair-fight` (bridge.ts's cubeId)."""
    b = os.path.basename(file)
    b = re.sub(r"\.md$", "", b)
    return re.sub(r"-cube(-\d+)?$", "", b)


def find_runs(paths: Iterable[str]) -> List[str]:
    """Every folder at or under these paths holding run.json and drafts.jsonl, sorted, once each."""
    out = set()
    for p in paths:
        for dirpath, dirnames, filenames in os.walk(p):
            dirnames[:] = [d for d in dirnames if d not in ("decks", "logs", "frames", "games", "homes")]
            if "run.json" in filenames and "drafts.jsonl" in filenames:
                out.add(os.path.realpath(dirpath))
    return sorted(out)


def played_main(drafter: Dict[str, Any]) -> List[Tuple[int, str]]:
    """The deck that played (report.ts's playedDeck): the lab's, else Forge's builder's."""
    if drafter.get("played") != "forge" and drafter.get("deck"):
        return [(int(n), str(c)) for n, c in drafter["deck"]["main"]]
    return [(int(n), str(c)) for n, c in ((drafter.get("forge") or {}).get("main") or [])]


def as_counts(main: List[Tuple[int, str]]) -> Dict[str, int]:
    d: Dict[str, int] = {}
    for n, c in main:
        d[c] = d.get(c, 0) + n
    return dict(sorted(d.items()))


def deck_hash(a: Dict[str, int], b: Dict[str, int]) -> str:
    return hashlib.sha1(json.dumps([a, b], sort_keys=True).encode()).hexdigest()[:12]


def games_from_run(run_dir: str, rel_to: str = ".") -> Iterator[Dict[str, Any]]:
    """The records of one run folder."""
    with open(os.path.join(run_dir, "run.json"), encoding="utf-8") as fh:
        meta = json.load(fh)
    bridge = meta.get("bridge")
    if bridge:
        cubes = [s["id"] for s in bridge["sources"]]
        pool = "bridge:" + "+".join(cubes)
    else:
        cubes = [cube_id(meta["cubeFile"])]
        pool = cubes[0]
    run_rel = os.path.relpath(run_dir, rel_to)
    with open(os.path.join(run_dir, "drafts.jsonl"), encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue  # a line cut short by a killed run
            a = as_counts(played_main(rec["drafters"][0]))
            b = as_counts(played_main(rec["drafters"][1]))
            if sum(a.values()) < 30 or sum(b.values()) < 30:
                continue
            frm: Optional[Dict[str, str]] = None
            if rec.get("bridge"):
                frm = {}
                for cid, names in rec["bridge"]["from"].items():
                    for n in names:
                        frm.setdefault(n, cid)
                frm = {n: frm[n] for n in sorted(set(a) | set(b)) if n in frm}
            for g in rec["match"]["games"]:
                w = g.get("winner")
                if w not in ("A", "B"):
                    continue
                on = g.get("onPlayVerified") or g.get("onPlay")
                if on not in ("A", "B"):
                    continue
                draft = f"{pool}#{rec['seed']}"
                r = {"v": RECORD_VERSION, "id": f"{draft}#g{g['n']}", "draft": draft, "pool": pool,
                     "kind": "bridge" if bridge else "normal", "cubes": cubes, "seed": rec["seed"], "game": g["n"],
                     "deckA": a, "deckB": b, "onPlay": on, "winner": w, "run": run_rel, "ver": rec.get("ver") or "unversioned"}
                if frm is not None:
                    r["from"] = frm
                yield r


def collect(paths: Iterable[str], rel_to: str = ".", reserved: Optional[Dict[str, str]] = None,
            vers: Optional[Iterable[str]] = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Every decisive game under these paths, each once.  Returns the records and counts of what was skipped.

    `reserved` (reserved.reserved_decks()): drop a game either of whose decks is one of these, card for card.
    `vers`: keep only games of these lab versions (`unversioned` names lines from before D333)."""
    import reserved as R
    seen = set()
    out: List[Dict[str, Any]] = []
    stats: Dict[str, Any] = {"runs": 0, "duplicates": 0, "reserved": 0, "reservedDecks": {}, "otherVersion": 0}
    keep_vers = set(vers) if vers else None
    for run in find_runs(paths):
        stats["runs"] += 1
        for r in games_from_run(run, rel_to):
            key = (r["pool"], r["seed"], r["game"], deck_hash(r["deckA"], r["deckB"]))
            if key in seen:
                stats["duplicates"] += 1
                continue
            seen.add(key)
            if reserved:
                hit = R.reserved_hit((r["deckA"], r["deckB"]), reserved)
                if hit:
                    stats["reserved"] += 1
                    stats["reservedDecks"][hit] = stats["reservedDecks"].get(hit, 0) + 1
                    continue
            if keep_vers is not None and r["ver"] not in keep_vers:
                stats["otherVersion"] += 1
                continue
            # A draft id must name one deck pair: the same pool and seed drafted under other weights is another draft.
            out.append(r)
    # Disambiguate drafts that share pool#seed but not decks (different weights or ratings).
    pairs: Dict[str, set] = {}
    for r in out:
        pairs.setdefault(r["draft"], set()).add(deck_hash(r["deckA"], r["deckB"]))
    for r in out:
        if len(pairs[r["draft"]]) > 1:
            r["draft"] = f"{r['draft']}@{deck_hash(r['deckA'], r['deckB'])}"
            r["id"] = f"{r['draft']}#g{r['game']}"
    out.sort(key=lambda r: r["id"])
    return out, stats


def version_counts(games: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    """Decisive games per lab version (D333)."""
    out: Dict[str, int] = {}
    for r in games:
        v = r.get("ver") or "unversioned"
        out[v] = out.get(v, 0) + 1
    return out


def read_games(path: str) -> List[Dict[str, Any]]:
    with open(path, encoding="utf-8") as fh:
        return [json.loads(l) for l in fh if l.strip()]


def check_record(r: Dict[str, Any]) -> List[str]:
    """What is wrong with one record (empty = a valid v1 record)."""
    bad = []
    for k, t in (("v", int), ("id", str), ("draft", str), ("pool", str), ("kind", str), ("cubes", list),
                 ("seed", int), ("game", int), ("deckA", dict), ("deckB", dict), ("onPlay", str), ("winner", str)):
        if not isinstance(r.get(k), t):
            bad.append(f"{k} is not a {t.__name__}")
    if bad:
        return bad
    if r["v"] != RECORD_VERSION:
        bad.append(f"v {r['v']} != {RECORD_VERSION}")
    if r["kind"] not in ("normal", "bridge"):
        bad.append("kind")
    if r["onPlay"] not in ("A", "B") or r["winner"] not in ("A", "B"):
        bad.append("onPlay/winner must be A or B")
    if (r["kind"] == "bridge") != (len(r["cubes"]) > 1) or (r["kind"] == "bridge") != ("from" in r):
        bad.append("a bridge record has two or more cubes and a from map; a normal one one cube and none")
    for side in ("deckA", "deckB"):
        n = sum(r[side].values())
        if not 30 <= n <= 60:
            bad.append(f"{side} has {n} cards")
    if not r["id"].startswith(r["draft"] + "#g"):
        bad.append("id must be draft#g<n>")
    return bad


# ---------------------------------------------------------------- overlap

def overlap_report(games: List[Dict[str, Any]], cube_lists: Dict[str, List[str]]) -> Dict[str, Any]:
    """How much the cubes' shared cards pool the evidence.

    A card-game is one (game, card) pair for a nonbasic card in exactly one of
    the two decks (a card in both decks says nothing about it).  It is SHARED
    when the card is listed by two or more of the cubes: rated separately, that
    one game would inform only the cube it was played in, while pooled it
    informs every cube listing the card.  `games_needed_ratio` compares the
    games each approach needs to reach the same card-games per card slot: the
    separate approach needs every cube's 180 slots filled by its own games;
    the pooled one needs only the distinct cards filled once.
    """
    listed: Dict[str, List[str]] = {}
    for cid, names in cube_lists.items():
        for n in set(names):
            listed.setdefault(n, []).append(cid)
    slots = sum(len(set(v)) for v in cube_lists.values())
    distinct = len(listed)
    card_games = 0
    shared = 0
    benefit = 0  # extra cube-slots informed thanks to pooling
    games_shared = 0
    for g in games:
        a, b = set(g["deckA"]) - BASICS, set(g["deckB"]) - BASICS
        sym = a ^ b
        any_shared = False
        for c in sym:
            card_games += 1
            k = len(listed.get(c, []))
            if k >= 2:
                shared += 1
                benefit += k - 1
                any_shared = True
        games_shared += any_shared
    return {
        "cubes": len(cube_lists), "cardSlots": slots, "distinctCards": distinct,
        "slotsPerCard": round(slots / distinct, 3) if distinct else 0,
        "games": len(games), "gamesWithASharedCard": games_shared,
        "cardGames": card_games, "sharedCardGames": shared,
        "sharedShare": round(shared / card_games, 4) if card_games else 0,
        "cubeSlotsInformedPerCardGame": round((card_games + benefit) / card_games, 3) if card_games else 0,
        "gamesNeededRatio": round(distinct / slots, 3) if slots else 0,
    }


# ---------------------------------------------------------------- cards

def load_facts(dirs: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    """Every cached engine fact under these folders (var/cubelab/facts/*.json), by Forge name and by listed name."""
    out: Dict[str, Dict[str, Any]] = {}
    for d in dirs:
        for f in sorted(glob.glob(os.path.join(d, "*.json"))):
            try:
                with open(f, encoding="utf-8") as fh:
                    doc = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            for c in doc.get("cards", []):
                if not c.get("found"):
                    continue
                if c.get("oracle"):
                    c["oracle"] = c["oracle"].replace("\\n", "\n")
                out.setdefault(c.get("name") or c["listed"], c)
                out.setdefault(c["listed"], c)
    return out


def load_run_cards(run_dirs: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    """Each run's cards.json (section, colours, mana value, land, type, rating), merged by name."""
    out: Dict[str, Dict[str, Any]] = {}
    for d in run_dirs:
        f = os.path.join(d, "cards.json")
        if os.path.exists(f):
            with open(f, encoding="utf-8") as fh:
                doc = json.load(fh)
            for n, c in doc.items():
                out.setdefault(n, c)
    return out


KEYWORDS = ["flying", "first strike", "double strike", "deathtouch", "lifelink", "trample", "vigilance", "haste",
            "menace", "reach", "hexproof", "indestructible", "flash", "defender", "ward", "prowess"]
TEXT = [
    ("draw", r"draws? (a|two|three|\w+) cards?"), ("destroy", r"destroy target"), ("exile_target", r"exile target"),
    ("damage", r"deals? (\d+|x) damage"), ("counter", r"counter target"), ("token", r"create[s]? .*token"),
    ("search", r"search your library"), ("bounce", r"return target .* to (its|their) owner's hand"),
    ("plus1", r"\+1/\+1 counter"), ("sacrifice", r"sacrifice"), ("discard", r"discards?"),
    ("drain", r"loses? \d+ life|each opponent loses"), ("gain", r"gains? \d+ life|gain life"),
    ("mana", r"add \{"), ("etb", r"enters"), ("dies", r"dies"), ("whenever", r"whenever"),
    ("equip", r"equip"), ("alt", r"kicker|flashback|cycling|escape|madness|evoke|ninjutsu|delve|convoke"),
    ("cant_block", r"can't block"), ("tap", r"tap target"), ("mill", r"mills?|into (your|their) graveyard"),
    ("graveyard", r"from (your|a) graveyard"), ("pump", r"gets? \+\d+/\+\d+"), ("minus", r"gets? -\d+/-\d+"),
    ("fight", r"fights?"), ("copy", r"copy"), ("each", r"each creature"), ("upkeep", r"upkeep"),
    ("tutor_land", r"basic land"),
]
FEATURE_NAMES: List[str] = (
    ["mv", "mv2", "mv0", "mv1", "mv2b", "mv3", "mv4", "mv5", "mv6p"]
    + [f"col_{c}" for c in "WUBRG"] + ["colorless", "multicolor", "pips", "hybrid"]
    + ["land", "basic", "creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "legendary"]
    + ["power", "toughness", "pt_var", "power_per_mv"]
    + [f"kw_{k.replace(' ', '_')}" for k in KEYWORDS] + [f"tx_{n}" for n, _ in TEXT]
    + ["oracle_len", "produces", "rank", "rank_missing"]
)


def _num(x: Any) -> Optional[float]:
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def card_features(name: str, fact: Optional[Dict[str, Any]], info: Optional[Dict[str, Any]] = None) -> List[float]:
    """A fixed vector of what a card is (FEATURE_NAMES), from its engine fact, else the run's cards.json."""
    f = fact or {}
    i = info or {}
    typ = (f.get("type") or i.get("type") or "")
    land = bool(f.get("land", i.get("land", "Land" in typ)))
    basic = name in BASICS or bool(f.get("basicLand"))
    mv = float(f.get("cmc", i.get("cmc", 0)) or 0) if not land else 0.0
    cols = f.get("colors", i.get("colors", "")) or ""
    if land:
        cols = ""
    cost = f.get("manaCost") or ""
    pips = len(re.findall(r"\{[WUBRG]", cost))
    hybrid = len(re.findall(r"\{[WUBRG2]/[WUBRGP]\}", cost))
    oracle = (f.get("oracle") or "").lower().replace(name.lower(), "~")
    p, t = _num(f.get("power")), _num(f.get("toughness"))
    creature = bool(f.get("creature", "Creature" in typ))
    pt_var = creature and (p is None or t is None)
    produces = len(set(re.findall(r"\{([WUBRG])\}", " ".join(re.findall(r"add [^.]*", oracle)))))
    if "any color" in oracle:
        produces = 5
    if basic:
        produces = 1
    rank = (f.get("rank") or {})
    raw = rank.get("rawScore")
    has_rank = rank.get("source") not in (None, "none") and raw is not None and raw > -100
    mvb = [0.0] * 7
    mvb[min(int(mv), 6)] = 1.0
    v: List[float] = [min(mv, 10) / 3.0, (min(mv, 10) / 3.0) ** 2] + mvb
    v += [1.0 if c in cols else 0.0 for c in "WUBRG"] + [1.0 if not cols and not land else 0.0, 1.0 if len(cols) >= 2 else 0.0,
                                                          pips / 3.0, float(hybrid)]
    v += [float(land), float(basic), float(creature), float("Instant" in typ), float("Sorcery" in typ),
          float("Artifact" in typ), float("Enchantment" in typ), float("Planeswalker" in typ), float("Legendary" in typ)]
    v += [(p or 0.0) / 3.0 if creature else 0.0, (t or 0.0) / 3.0 if creature else 0.0, float(pt_var),
          ((p or 0.0) / max(mv, 1.0)) if creature else 0.0]
    v += [1.0 if re.search(r"(^|\n|, )" + re.escape(k) + r"\b", oracle) else 0.0 for k in KEYWORDS]
    v += [1.0 if re.search(rx, oracle) else 0.0 for _, rx in TEXT]
    v += [math.log1p(len(oracle)) / 6.0, produces / 2.0,
          (raw / 100.0) if has_rank else 0.0, 0.0 if has_rank else 1.0]
    assert len(v) == len(FEATURE_NAMES)
    return v


# ---------------------------------------------------------------- AI-limited cards

_DOC_FLAG = re.compile(r"(?:[Rr]ated `(All|Random)`|`AI:RemoveDeck:(All|Random)`)[^:\n`]*:\s*([^\n]+?)(?:\.\s|\.$|$)")


def doc_ai_flags(repo: str) -> Dict[str, str]:
    """The cube documents' own AI notes: every name listed after "Rated `All`:" / "`AI:RemoveDeck:All` ...:" (or Random).
    Loose by design (prose around a list yields a few non-names); callers look names up, never list them."""
    out: Dict[str, str] = {}
    for f in sorted(glob.glob(os.path.join(repo, "cubes", "*-cube-*.md"))):
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                if "RemoveDeck" not in line and "Rated `" not in line:
                    continue
                for m in _DOC_FLAG.finditer(line):
                    flag = m.group(1) or m.group(2)
                    for n in re.split(r",\s*(?:and\s+)?", m.group(3)):
                        n = re.sub(r"\*|\(.*?\)", "", n).strip().rstrip(".")
                        if n and len(n) < 60:
                            if flag == "All" or out.get(n) != "All":
                                out[n] = flag
    return out


def ai_flags(names: Iterable[str], facts: Dict[str, Dict[str, Any]], info: Dict[str, Dict[str, Any]], repo: str = ".") -> Dict[str, str]:
    """Each AI-limited card: "All" (Forge's AI:RemoveDeck:All -- the AI cannot play it; learn.ts's guard, D301)
    or "Random" (left out of Forge's random decks, played when handed; evolve's guard, D299).  Sources, any of:
    the engine facts (Forge's own card scripts), a run's cards.json (`remAIDeck`), the cube documents' notes."""
    docs = doc_ai_flags(repo) if repo else {}
    out: Dict[str, str] = {}
    for n in names:
        f, i = facts.get(n) or {}, info.get(n) or {}
        if f.get("remAIDeck") or i.get("remAIDeck") or docs.get(n) == "All":
            out[n] = "All"
        elif f.get("remRandomDeck") or docs.get(n) == "Random":
            out[n] = "Random"
    return out


def cube_lists(repo: str) -> Dict[str, List[str]]:
    """Every committed cube's card names (the cube lab's parser, run under Node), by cube id."""
    import subprocess
    js = ("import('./tools/cubelab/cube.ts').then(m=>{const fs=require('fs');const r={};"
          "for(const f of fs.readdirSync('cubes').filter(f=>/-cube-\\d+\\.md$/.test(f)))"
          "r[f]=m.parseCube(fs.readFileSync('cubes/'+f,'utf8')).cards.map(c=>c.name);"
          "console.log(JSON.stringify(r))})")
    out = subprocess.run(["node", "-e", js], cwd=repo, capture_output=True, text=True, check=True).stdout
    return {cube_id(k): v for k, v in json.loads(out).items()}


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("paths", nargs="+", help="run folders, or roots holding them (a queue root)")
    ap.add_argument("--out", required=True, help="games.jsonl")
    ap.add_argument("--overlap", action="store_true", help="also print the overlap report over the committed cubes")
    ap.add_argument("--check", action="store_true", help="validate every record; exit 1 if any is bad (a pilot's check)")
    ap.add_argument("--keep-reserved", action="store_true", help="keep games played with an AI-ladder deck-set deck (default: drop them, D332)")
    ap.add_argument("--ver", default="", help="keep only these lab versions (comma-separated ids; `unversioned` = before D333)")
    ap.add_argument("--repo", default=".")
    a = ap.parse_args(argv)
    import reserved as R
    games, st = collect(a.paths, reserved=None if a.keep_reserved else R.reserved_decks(a.repo),
                        vers=[v for v in a.ver.split(",") if v] or None)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        for r in games:
            fh.write(json.dumps(r, sort_keys=True) + "\n")
    kinds: Dict[str, int] = {}
    for r in games:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
    print(f"{len(games)} decisive game(s) from {st['runs']} run(s), {len({r['draft'] for r in games})} draft(s) "
          f"({', '.join(f'{k} {v}' for k, v in sorted(kinds.items()))}); {st['duplicates']} duplicate(s) skipped; "
          f"{st['reserved']} game(s) with a deck-set deck dropped; {st['otherVersion']} of other versions -> {a.out}")
    for v, n in sorted(version_counts(games).items()):
        print(f"  version {v}: {n} game(s)")
    if a.check:
        bad = [(r["id"], e) for r in games for e in check_record(r)]
        for i, e in bad[:20]:
            print(f"BAD {i}: {e}")
        print(f"check: {len(games) - len({i for i, _ in bad})}/{len(games)} records valid; kinds {sorted(kinds)}")
        if bad or not games:
            return 1
    if a.overlap:
        print(json.dumps(overlap_report(games, cube_lists(".")), indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
