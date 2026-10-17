#!/usr/bin/env python3
# mtg-table — tools/ml: a directory of frame logs -> a split, sharded dataset.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Build a train/val/test dataset from frame logs (D305).

    python3 tools/ml/dataset.py --vocab cubes/synergy-cube-180.md \
        --out var/ml/data/synergy LOGDIR... [--split 80,10,10] [--salt ""] \
        [--shard-rows 100000] [--phases main,combat] [--group-by game|match] [--jobs N]
    python3 tools/ml/dataset.py --run-dir var/cubelab/runs/X [--run-dir ...] [--out DIR] [...]

--run-dir takes a cube-lab run folder (D315) -- its recordings under `games/`
and `frames/`, with the run's cube (`cube.md`, or `run.json`'s `cubeFile`) as
the vocabulary -- and writes to `<run-dir>/dataset` unless --out says
otherwise.  Several run folders (a week of nights) make one dataset when they
drafted the same cube; LOGDIRs and --vocab may be given beside them.

Every log under the LOGDIRs is encoded by encode.py (one row per decision
state).  Rows are split BY GAME -- more exactly by split group: the two chairs
of one seed and match are one game (protocol.md §8.7), so both land in the same
split and nothing about a test game is seen in training.  The split is a hash
of the group id (with --salt), so it is deterministic and stable as logs are
added: a game never moves between splits when the corpus grows.
`--group-by match` (the default since D316) puts every game of one deck pair in
one split, which asks the honest question -- does the evaluator generalise to
decks it never saw? -- because a bench replays the same pairs over many seeds
and a by-game split would score positions of decks already seen in training.
`--group-by game` keeps D305's by-game split.

RESERVED DECKS (D340).  A game played with a deck of the AI ladder's dev or
confirm set (tools/ai-bench/pairs-*.txt) is dropped and counted, matched card
for card (reserved.py): a lab recording by its run's drafts.jsonl, any other
log by the viewer's own .dck when its hello names one.  The search is graded
on those decks; the evaluator must never have trained on them.
`--keep-reserved` turns this off.  Each game's lab version (`ver`, D341) is in
games.jsonl and `--ver` keeps only some.

EXPLORING GAMES (D358).  A cube-lab game whose header carries `playExplore`
was played with exploration: some of its decisions were answered by a
uniformly random legal move (or a coin between two close calls) instead of
the AI's choice.  Its positions and outcome are still true -- the game was
played to the end from them -- so the position dataset KEEPS such games by
default (`--play-explore include`); `exclude` drops them and `only` keeps
them alone, for experiments.  games.jsonl marks each one `"explore": true`
and stats.json counts them (`playExplore`).  The policy dataset drops the
randomised decisions themselves (policy_data.py).

HUMAN GAMES (D347).  The owner's own games -- ForgeCoach's saved games and the
bridge's `var/games/<id>/frames.jsonl` -- go under `var/ml/human/` (or any
`--human DIR`).  Every game carries a stable `source` tag (`human`, `lab`,
`bench`, `other`; policy_data.py's rule), and a human game is never trained on
by default: its rows go to a fourth split, `human` (`human-NNNNN.npz`), which
`train_eval.py --eval-human` scores separately.  `--train-human` splits them
like every other game instead.

THE REDUCED SCHEMA r17 (D359, the outside exam).  `--schema r17` encodes
r17.py's rows instead of D305's: one per END of a half-turn (the last state of
each turn) from `--min-turn` (3) on, never a game's final half-turn, with only
what 17Lands' replay data also records (turn, whose turn, play/draw, life and
hand sizes, each battlefield as vocabulary card counts plus land, non-land,
creature and off-vocabulary counts).  Exploring games are LEFT OUT by default
under r17 (`--play-explore exclude`): the exam asks whether what Forge's own
play taught carries over to humans.  `--queue-root ROOT --cube ID` reads the
overnight queue's folders for one cube -- `normal/<ID>` and every
`bridge/<a>+<b>` naming it -- with `cubes/<ID>-cube-180.md` as the vocabulary
unless --vocab says otherwise; `--nights 1,2` keeps the drafts those nights'
plans (`night-N.json`) handed out; `--deck-vocab-min X` drops a lab game when
either deck's non-basic cards are less than X inside the vocabulary (default
0.5 under r17: a bridge deck that drafted mostly the other cube).

    python3 tools/ml/dataset.py --schema r17 --queue-root var/cubelab/queue --cube vintage \
        --nights 1 --out var/ml/data/r17-vintage-n1 --jobs 7

Writes, under --out:

    features.json             the layout (encode.Schema.to_json)
    <split>-<NNNNN>.npz       X int16 [rows, nFeatures] (every feature is an integer),
                              y int8 (label: +1/0/-1),
                              turn, turns_to_end, rows_to_end int16, active int8,
                              game int32 (an index into games.jsonl)
    games.jsonl               one line per game: index, game_key, split_group,
                              split, file, seat, rows, label, last turn
    stats.json                rows, games, label balance per split, schema id; written LAST,
                              so it is there only when the dataset is complete
    progress.json             while it runs: rows, games and files so far (every 10 s), for the
                              lab runner's `gate_metrics.py dataset`; removed when stats.json is written

PARALLEL ENCODE.  `--jobs N` encodes the recordings in N processes, one recording
file at a time each; the writer takes the encoded files back in path order (at
most 2 x N files in flight, so memory stays bounded), so the shards, their row
order, games.jsonl and stats.json are byte for byte what `--jobs 1` writes (the
.npz members carry a fixed time; tests/test_dataset.py compares the hashes).

Needs numpy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from collections import Counter, deque
from typing import Any, Iterator

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import reserved as R  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

SPLITS = ("train", "val", "test")


def split_of(group: str, weights: tuple[int, int, int], salt: str = "") -> str:
    """A split group's split: sha256(salt|group) mod the weights' sum."""
    h = int(hashlib.sha256(f"{salt}|{group}".encode()).hexdigest()[:12], 16)
    x = h % sum(weights)
    if x < weights[0]:
        return "train"
    if x < weights[0] + weights[1]:
        return "val"
    return "test"


# ---------------------------------------------------------------- encoding one recording

# A worker's settings (set by _init in each process, and in this one for --jobs 1).
_W: dict[str, Any] = {}


PLAY_EXPLORE_MODES = ("include", "exclude", "only")


SCHEMAS = ("d305", "r17")


def make_schema(vocab: "E.Vocab", schema_kind: str = "d305", min_turn: int | None = None):
    """D305's full schema, or r17's reduced one (D359)."""
    if schema_kind == "r17":
        import r17 as R17
        return R17.R17Schema(vocab, R17.MIN_TURN if min_turn is None else min_turn)
    if schema_kind != "d305":
        raise ValueError(f"schema is one of {SCHEMAS}, got {schema_kind!r}")
    return E.Schema(vocab)


def make_vocab(vocab_paths: list[str], vocab_cards: list[str] | None = None) -> "E.Vocab":
    """The vocabulary: the files' card lists, or (--vocab-from, D364) a built dataset's or model's own list."""
    if vocab_cards is not None:
        return E.Vocab.from_names(vocab_cards, [os.path.basename(p) for p in vocab_paths])
    return E.Vocab.from_files(vocab_paths)


def _init(vocab_paths: list[str], phases: list[str], reserved: dict[str, str] | None,
          vers: list[str] | None, human_dirs: list[str] | None, play_explore: str = "include",
          schema_kind: str = "d305", min_turn: int | None = None, deck_vocab_min: float | None = None,
          vocab_cards: list[str] | None = None) -> None:
    _W.clear()
    _W.update(schema=make_schema(make_vocab(vocab_paths, vocab_cards), schema_kind, min_turn), phases=phases,
              reserved=reserved, vers=vers, human_dirs=human_dirs or [], play_explore=play_explore,
              schema_kind=schema_kind, deck_vocab_min=deck_vocab_min)


def explored(header: dict[str, Any]) -> bool:
    """The game was played with exploration (D358): its session header carries `playExplore`."""
    return isinstance(header.get("playExplore"), dict)


def _encode_file(path: str) -> list[tuple]:
    """Every game of one recording, in file order: ("skip", reason, reserved_hit) or
    ("game", fields, arrays).  The rows travel as int16 / int8 arrays, never as Python lists."""
    import policy_data as P  # the source rule (D347), in one place
    schema, phases, reserved, vers = _W["schema"], _W["phases"], _W["reserved"], _W["vers"]
    out: list[tuple] = []
    for g in E.read_games(path):
        if R.not_for_training(g.header):
            # D451: a move-atlas game (random seats, forced options) -- never training data, any mode
            out.append(("skip", R.NOT_FOR_TRAINING, None))
            continue
        # D340: never a game played with a deck of the AI ladder's dev/confirm sets, matched card for card
        decks, ver = R.game_decks(path, g.hello)
        hit = R.reserved_hit(decks, reserved) if reserved else None
        if hit:
            out.append(("skip", "reserved deck (D340)", hit))
            continue
        if vers and ver not in vers:
            out.append(("skip", "other lab version (D341)", None))
            continue
        ex = explored(g.header)
        mode = _W.get("play_explore", "include")
        if mode != "include" and ex != (mode == "only"):
            out.append(("skip", f"play exploration: --play-explore {mode} (D358)", None))
            continue
        if _W.get("schema_kind") == "r17":
            import r17 as R17
            dmin = _W.get("deck_vocab_min")
            if dmin is not None and decks and min(R17.deck_vocab_share(d, schema) for d in decks) < dmin:
                out.append(("skip", f"a deck under {dmin:g} inside the vocabulary (r17)", None))
                continue
            rows = R17.encode_game(g, schema)
        else:
            rows = E.encode_game(g, schema, phases)
        if not rows:
            _winner, _lt, labelled = E.game_outcome(g)
            out.append(("skip", "unlabelled" if not labelled else "no decision rows", None))
            continue
        X = np.asarray([r.features for r in rows], dtype=np.float64)
        # every feature is a count, a life total or a mana value: an integer.
        # int16 halves float32's size (rows are ~7 KB for a 180-card cube).
        if not (np.array_equal(X, np.round(X)) and np.abs(X).max(initial=0) < 32768):
            raise ValueError("a feature is not an int16: the schema changed -- widen X's dtype")
        arrays = {
            "X": X.astype(np.int16),
            "y": np.asarray([r.label for r in rows], dtype=np.int8),
            "turn": np.asarray([r.turn for r in rows], dtype=np.int16),
            "turns_to_end": np.asarray([r.turns_to_end for r in rows], dtype=np.int16),
            "rows_to_end": np.asarray([r.rows_to_end for r in rows], dtype=np.int16),
            "active": np.asarray([r.active for r in rows], dtype=np.int8),
        }
        fields = {"game_key": g.game_key, "split_group": g.split_group, "match": g.match_key(),
                  # the decks by card multiset (reserved.deck_key): train_eval's "deck seen in training" check
                  "deckKeys": sorted(R.deck_key(d) for d in decks),
                  # D375: the seats' AI when the lab drew them per draft (--profile-mix); null: Default vs Default
                  "profiles": R.game_profiles(path),
                  "file": os.path.relpath(path), "seat": g.seat, "rows": len(rows), "label": rows[0].label,
                  "last_turn": max(r.turn + r.turns_to_end for r in rows), "ver": ver,
                  "source": P.source_of(path, g.header, _W["human_dirs"]),
                  "rowLabels": dict(Counter(str(r.label) for r in rows)), "explore": ex}
        out.append(("game", fields, arrays))
    return out


def _encoded(paths: list[str], jobs: int, init_args: tuple) -> Iterator[list[tuple]]:
    """_encode_file over every path, IN PATH ORDER.  With jobs > 1 the files are spread over a
    process pool; at most 2 x jobs files are in flight, so memory stays bounded however far the
    workers run ahead of the writer."""
    if jobs <= 1 or len(paths) <= 1:
        _init(*init_args)
        for p in paths:
            yield _encode_file(p)
        return
    import multiprocessing as mp
    with mp.get_context().Pool(jobs, initializer=_init, initargs=init_args) as pool:
        pending: deque = deque()
        it = iter(paths)
        for p in it:
            pending.append(pool.apply_async(_encode_file, (p,)))
            if len(pending) >= 2 * jobs:
                break
        while pending:
            res = pending.popleft().get()
            nxt = next(it, None)
            if nxt is not None:
                pending.append(pool.apply_async(_encode_file, (nxt,)))
            yield res


_KEYS = ("X", "y", "turn", "turns_to_end", "rows_to_end", "active", "game")
_FIXED_TIME = (1980, 1, 1, 0, 0, 0)


def savez_fixed(path: str, arrays: dict[str, Any]) -> None:
    """np.savez_compressed, byte for byte reproducible: every member carries a fixed time
    (numpy's own stamps the clock), so the same rows always make the same file."""
    import zipfile
    from numpy.lib import format as npformat
    with zipfile.ZipFile(path, mode="w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as z:
        for k, v in arrays.items():
            info = zipfile.ZipInfo(k + ".npy", date_time=_FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            with z.open(info, "w", force_zip64=True) as fid:
                npformat.write_array(fid, np.asanyarray(v), allow_pickle=False)


def _write_json(path: str, obj: Any, indent: int | None = 1) -> None:
    tmp = path + ".part"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=indent)
        f.write("\n")
    os.replace(tmp, path)


def build(logs: list[str], vocab_paths: list[str], out: str, weights=(80, 10, 10), salt: str = "",
          shard_rows: int = 100_000, phases: list[str] | None = None, quiet: bool = False,
          group_by: str = "match", reserved: dict[str, str] | None = None,
          vers: list[str] | None = None, human_dirs: list[str] | None = None,
          train_human: bool = False, jobs: int = 1, progress_every_s: float = 10.0,
          play_explore: str = "include", schema_kind: str = "d305", min_turn: int | None = None,
          deck_vocab_min: float | None = None, vocab_cards: list[str] | None = None,
          night_of: dict[str, int] | None = None) -> dict[str, Any]:
    """Encode every log and write the shards.  `jobs` > 1 encodes the recordings in that many
    processes; the writer still takes them in path order, so every file written (shards,
    games.jsonl, stats.json) is byte for byte the one `jobs=1` writes."""
    if np is None:
        raise SystemExit("dataset.py needs numpy (pip install numpy)")
    vocab = make_vocab(vocab_paths, vocab_cards)
    schema = make_schema(vocab, schema_kind, min_turn)
    phases = phases or E.default_phases()
    os.makedirs(out, exist_ok=True)
    for fn in os.listdir(out):  # a rebuild replaces the shards; a stale stats.json would read as done
        if (fn.endswith(".npz") and fn.split("-")[0] in SPLITS + ("human",)) or fn in ("stats.json", "progress.json"):
            os.remove(os.path.join(out, fn))
    with open(os.path.join(out, "features.json"), "w", encoding="utf-8") as f:
        json.dump(schema.to_json(phases), f, indent=1, ensure_ascii=False)
        f.write("\n")

    buf: dict[str, list[dict[str, Any]]] = {s: [] for s in SPLITS + ("human",)}
    buffered = {s: 0 for s in SPLITS + ("human",)}
    shard_no = {s: 0 for s in SPLITS + ("human",)}
    games: list[dict[str, Any]] = []
    stats: dict[str, Any] = {s: {"rows": 0, "games": 0, "labels": Counter(), "rowLabels": Counter()}
                             for s in SPLITS + ("human",)}
    skipped = Counter()

    def flush(s: str, force: bool = False) -> None:
        while buffered[s] and (force or buffered[s] >= shard_rows):
            cat = {k: np.concatenate([b[k] for b in buf[s]]) for k in _KEYS} if len(buf[s]) > 1 else buf[s][0]
            n = min(shard_rows, buffered[s])
            savez_fixed(os.path.join(out, f"{s}-{shard_no[s]:05d}.npz"), {k: cat[k][:n] for k in _KEYS})
            shard_no[s] += 1
            rest = {k: cat[k][n:] for k in _KEYS}
            buffered[s] -= n
            buf[s] = [rest] if buffered[s] else []

    paths = E.find_logs(logs)
    progress_file = os.path.join(out, "progress.json")
    last_progress = 0.0

    def progress(files_done: int, final: bool = False) -> None:
        # Mid-run numbers for the lab runner (gate_metrics.py dataset reads them until stats.json exists).
        nonlocal last_progress
        now = time.monotonic()
        if not final and now - last_progress < progress_every_s:
            return
        last_progress = now
        rows = sum(stats[s]["rows"] for s in stats)
        _write_json(progress_file, {"rows": rows, "games": len(games), "files": files_done,
                                    "filesTotal": len(paths), "skippedGames": sum(skipped.values()), "jobs": jobs})
        if not quiet and not final:
            print(f"dataset: {rows} rows, {len(games)} games, {files_done}/{len(paths)} files", file=sys.stderr, flush=True)

    reserved_hits: Counter = Counter()
    if play_explore not in PLAY_EXPLORE_MODES:
        raise ValueError(f"play_explore is one of {PLAY_EXPLORE_MODES}, got {play_explore!r}")
    init_args = (vocab_paths, phases, reserved, vers, human_dirs, play_explore, schema_kind, min_turn, deck_vocab_min,
                 vocab_cards)
    for files_done, results in enumerate(_encoded(paths, max(1, jobs), init_args), 1):
        for item in results:
            if item[0] == "skip":
                skipped[item[1]] += 1
                if item[2]:
                    reserved_hits[item[2]] += 1
                continue
            _kind, fd, arrays = item
            group = fd["split_group"]
            if group_by == "match" and fd["match"]:
                group = "match:" + fd["match"]
            source = fd["source"]
            s = "human" if source == "human" and not train_human else split_of(group, weights, salt)
            gi = len(games)
            games.append({"index": gi, "game_key": fd["game_key"], "split_group": group,
                          "split": s, "file": fd["file"], "seat": fd["seat"],
                          "rows": fd["rows"], "label": fd["label"], "last_turn": fd["last_turn"],
                          # D316: the deck pair by name ('' when the log has no match block) and the
                          # game's own group, so a trainer can re-split by pair or hold decks out
                          "match": fd["match"], "game_group": fd["split_group"],
                          # D341: the lab version that played it ('unversioned' outside the lab or before D341)
                          "ver": fd["ver"], "source": source,
                          # D358: only on a game played with exploration (absent otherwise, as before)
                          **({"explore": True} if fd.get("explore") else {}),
                          # D364: the queue night that drafted it, only when the build was given --nights
                          **({"night": night_of.get(fd["file"])} if night_of is not None else {})})
            stats[s]["rows"] += fd["rows"]
            stats[s]["games"] += 1
            stats[s]["labels"][str(fd["label"])] += 1
            stats[s]["rowLabels"].update(fd["rowLabels"])
            arrays["game"] = np.full(fd["rows"], gi, dtype=np.int32)
            buf[s].append(arrays)
            buffered[s] += fd["rows"]
            flush(s)
        progress(files_done)
    for s in SPLITS + ("human",):
        flush(s, force=True)
    progress(len(paths), final=True)

    with open(os.path.join(out, "games.jsonl"), "w", encoding="utf-8") as f:
        for gm in games:
            f.write(json.dumps(gm) + "\n")
    shown = SPLITS + (("human",) if stats["human"]["games"] else ())
    groups = {s: len({gm["split_group"] for gm in games if gm["split"] == s}) for s in shown}
    summary = {
        "schemaId": schema.schema_id, "nFeatures": schema.n, "vocab": vocab.sources,
        **({"schemaKind": "r17", "minTurn": schema.min_turn, "deckVocabMin": deck_vocab_min}
           if schema_kind == "r17" else {}),
        "vocabSize": len(vocab), "phases": phases, "groupBy": group_by, "split": dict(zip(SPLITS, weights)), "salt": salt,
        "rows": sum(stats[s]["rows"] for s in shown), "games": len(games),
        "skippedGames": dict(skipped),
        "reservedChecked": reserved is not None, "reservedDecks": len(reserved or {}), "reservedHits": dict(reserved_hits),
        "versions": dict(Counter(gm["ver"] for gm in games)),
        "sources": dict(Counter(gm["source"] for gm in games)), "humanDirs": list(human_dirs or []),
        "humanInTraining": train_human,
        # D358: the exploration filter and how many kept games explored
        "playExplore": {"mode": play_explore, "games": sum(1 for gm in games if gm.get("explore"))},
        **({"nights": {str(k): v for k, v in sorted(Counter(gm.get("night") for gm in games).items(),
                                                    key=lambda kv: (kv[0] is None, kv[0] or 0))}}
           if night_of is not None else {}),
        "splits": {s: {"rows": stats[s]["rows"], "games": stats[s]["games"], "groups": groups[s],
                       "gameLabels": dict(stats[s]["labels"]), "rowLabels": dict(stats[s]["rowLabels"]),
                       "shards": shard_no[s]} for s in shown},
    }
    # stats.json last: it is what says the dataset is complete.
    _write_json(os.path.join(out, "stats.json"), summary)
    try:
        os.remove(progress_file)
    except FileNotFoundError:
        pass
    if not quiet:
        print(format_stats(summary))
    return summary


def format_stats(st: dict[str, Any]) -> str:
    lines = [f"dataset: {st['rows']} rows from {st['games']} games, {st['nFeatures']} features "
             f"(schema {st['schemaId']}, vocab {st['vocabSize']} slots)"]
    if st["skippedGames"]:
        lines.append(f"  skipped games: {st['skippedGames']}")
    pe = st.get("playExplore") or {}
    if pe.get("games") or pe.get("mode", "include") != "include":
        lines.append(f"  play exploration (D358): {pe.get('games', 0)} game(s) played with exploration kept "
                     f"(--play-explore {pe.get('mode')})")
    for s, d in st["splits"].items():
        gl = d["gameLabels"]
        rl = d["rowLabels"]
        lines.append(f"  {s:5s}: {d['rows']:6d} rows, {d['games']:4d} games ({d['groups']} groups); "
                     f"games won/lost/drawn {gl.get('1', 0)}/{gl.get('-1', 0)}/{gl.get('0', 0)}; "
                     f"rows +1/-1/0 {rl.get('1', 0)}/{rl.get('-1', 0)}/{rl.get('0', 0)}")
    return "\n".join(lines)


def load(out: str, split: str) -> dict[str, Any]:
    """Every shard of one split, concatenated: X, y, turn, turns_to_end,
    rows_to_end, active, game."""
    if np is None:
        raise SystemExit("needs numpy")
    files = sorted(f for f in os.listdir(out) if f.startswith(split + "-") and f.endswith(".npz"))
    parts = [np.load(os.path.join(out, f)) for f in files]
    keys = ("X", "y", "turn", "turns_to_end", "rows_to_end", "active", "game")
    if not parts:
        with open(os.path.join(out, "features.json"), encoding="utf-8") as f:
            n = json.load(f)["nFeatures"]
        return {k: (np.zeros((0, n), np.int16) if k == "X" else np.zeros(0, np.int32)) for k in keys}
    return {k: np.concatenate([p[k] for p in parts]) for k in keys}


def queue_logs(root: str, cube: str | None, nights: list[int] | None = None,
               night_of: dict[str, int] | None = None) -> list[str]:
    """The overnight queue's recordings for one cube (D323): `<root>/normal/<cube>/games/` and every
    `<root>/bridge/<a>+<b>/games/` whose pair names it -- or, with `cube` None, every normal and bridge
    folder (all cubes, D364).  With `nights`, only the drafts those nights' plans (`<root>/night-N.json`:
    chunks of key, first seed and drafts) handed out; `night_of`, when given, is filled with each kept
    recording's night (by its path)."""
    keys = []
    ndir = os.path.join(root, "normal")
    if cube is None:
        if os.path.isdir(ndir):
            keys += [f"normal/{d}" for d in sorted(os.listdir(ndir)) if os.path.isdir(os.path.join(ndir, d))]
    elif os.path.isdir(os.path.join(ndir, cube)):
        keys.append(f"normal/{cube}")
    bdir = os.path.join(root, "bridge")
    if os.path.isdir(bdir):
        keys += [f"bridge/{d}" for d in sorted(os.listdir(bdir)) if cube is None or cube in d.split("+")]
    ranges: dict[str, list[tuple[int, int, int]]] | None = None
    if nights:
        ranges = {}
        for n in nights:
            pf = os.path.join(root, f"night-{n}.json")
            if not os.path.isfile(pf):
                raise SystemExit(f"--nights: {pf} does not exist")
            with open(pf, encoding="utf-8") as fh:
                for c in json.load(fh).get("chunks") or []:
                    lo = int(c["seed"])
                    ranges.setdefault(c["key"], []).append((lo, lo + int(c["drafts"]), n))
    out: list[str] = []
    for k in keys:
        g = os.path.join(root, k, "games")
        if not os.path.isdir(g):
            continue
        for path in E.find_logs([g]):
            if ranges is not None:
                seed = os.path.basename(os.path.dirname(path))
                hit = [n for lo, hi, n in ranges.get(k, []) if seed.isdigit() and lo <= int(seed) < hi]
                if not hit:
                    continue
                if night_of is not None:
                    night_of[os.path.relpath(path)] = hit[0]
            out.append(path)
    return out


def queue_vocab(root: str) -> list[str]:
    """Every normal folder's own cube list under a queue root, in folder-name order (the vocabulary of a
    dataset over all of a queue's cubes, as night 1's: J049 named `normal/*/cube.md`)."""
    ndir = os.path.join(root, "normal")
    out = [os.path.join(ndir, d, "cube.md") for d in sorted(os.listdir(ndir)) if os.path.isdir(os.path.join(ndir, d))] \
        if os.path.isdir(ndir) else []
    return [p for p in out if os.path.isfile(p)]


def vocab_from(path: str) -> list[str]:
    """The card list of a built dataset (its features.json) or of a model (its JSON): a new dataset encoded
    over exactly that vocabulary has the same schema id, so a model trained on the old one scores it (D364)."""
    f = os.path.join(path, "features.json") if os.path.isdir(path) else path
    with open(f, encoding="utf-8") as fh:
        j = json.load(fh)
    v = j["vocab"]
    return list(v["cards"] if isinstance(v, dict) else v)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("logs", nargs="*")
    ap.add_argument("--vocab", action="append")
    ap.add_argument("--out")
    ap.add_argument("--run-dir", action="append", default=[],
                    help="a cube-lab run folder: its recordings, its cube as the vocabulary (D315)")
    ap.add_argument("--split", default="80,10,10", help="train,val,test weights")
    ap.add_argument("--salt", default="")
    ap.add_argument("--shard-rows", type=int, default=100_000)
    ap.add_argument("--phases", default="main,combat")
    ap.add_argument("--jobs", type=int, default=1,
                    help="encode the recordings in N processes (default 1); the output is byte for byte "
                         "the same for every N (the writer takes the files in path order)")
    ap.add_argument("--keep-reserved", action="store_true",
                    help="keep games played with an AI-ladder dev/confirm deck (default: drop them, matched card for card; D340)")
    ap.add_argument("--ver", default="", help="only games of these lab versions (comma-separated `ver` ids; D341)")
    ap.add_argument("--repo", default=".", help="where tools/ai-bench/pairs-*.txt are (the reserved decks)")
    ap.add_argument("--human", action="append", default=[],
                    help="a directory of the owner's own games (default var/ml/human when it exists; D347): "
                         "tagged source=human, kept out of training in the `human` split")
    ap.add_argument("--train-human", action="store_true", help="split human games like the rest (D347)")
    ap.add_argument("--play-explore", choices=PLAY_EXPLORE_MODES, default=None,
                    help="games played with exploration (D358): kept by default (their outcomes are true), "
                         "exclude drops them, only keeps them alone; under --schema r17 the default is exclude (D359)")
    ap.add_argument("--schema", choices=SCHEMAS, default="d305",
                    help="d305 (default): the full decision-state rows; r17: the outside exam's reduced "
                         "end-of-half-turn rows (r17.py, D359)")
    ap.add_argument("--min-turn", type=int, default=None, help="r17: the first half-turn encoded (default 3)")
    ap.add_argument("--deck-vocab-min", type=float, default=None,
                    help="r17: drop a lab game when either deck's non-basic cards are less than this share inside "
                         "the vocabulary (default 0.5 under r17)")
    ap.add_argument("--queue-root", help="the overnight queue's root (D323); with --cube, its normal/<cube> and "
                                         "bridge/<a>+<b> folders naming the cube")
    ap.add_argument("--cube", help="with --queue-root: the cube id (vintage); the vocabulary defaults to "
                                   "cubes/<id>-cube-180.md under --repo.  Without it, every normal and bridge "
                                   "folder of the queue (all cubes), the vocabulary every normal folder's cube.md (D364)")
    ap.add_argument("--vocab-from", help="the vocabulary of a built dataset (its directory) or a model (its JSON), "
                                         "card for card: the same schema id, so that dataset's model scores this "
                                         "one (D364)")
    ap.add_argument("--nights", default="", help="with --queue-root: only these nights' drafts (1,2)")
    ap.add_argument("--group-by", choices=("game", "match"), default="match",
                    help="match (default since D316): every game of one deck pair in one split -- the "
                         "test split is decks the model never saw; game: only the chairs of one "
                         "seed+match together (a log with no match block always groups by game)")
    a = ap.parse_args(argv)
    w = tuple(int(x) for x in a.split.split(","))
    if len(w) != 3 or sum(w) <= 0:
        ap.error("--split takes three weights")
    logs, vocab, out = list(a.logs), list(a.vocab or []), a.out
    night_of: dict[str, int] | None = None
    if a.queue_root:
        nights = [int(x) for x in a.nights.split(",") if x.strip()] or None
        night_of = {} if nights else None
        qlogs = queue_logs(a.queue_root, a.cube or None, nights, night_of)
        if not qlogs:
            ap.error(f"--queue-root {a.queue_root}: no recordings" + (f" for cube {a.cube}" if a.cube else ""))
        logs += qlogs
        if not vocab and not a.vocab_from:
            vocab = [os.path.join(a.repo, "cubes", f"{a.cube}-cube-180.md")] if a.cube else queue_vocab(a.queue_root)
    elif a.nights:
        ap.error("--nights needs --queue-root")
    vocab_cards = None
    if a.vocab_from:
        if a.vocab:
            ap.error("--vocab-from replaces --vocab; give one")
        vocab_cards = vocab_from(a.vocab_from)
        vocab = [a.vocab_from]
    if a.run_dir:
        run_logs, run_vocab = E.read_run_dirs(a.run_dir)
        logs += run_logs
        vocab = vocab or [run_vocab]
        out = out or os.path.join(a.run_dir[0], "dataset")
    import policy_data as P
    humans = P.human_dirs_of(a.human, a.repo)
    logs += [d for d in humans if d not in logs]
    if not logs:
        ap.error("no frame logs: give LOGDIRs, or a --run-dir whose run recorded games "
                 "(tools/cubelab.sh run ... --record-all)")
    if not vocab or not out:
        ap.error("--vocab and --out are required without --run-dir")
    build(logs, vocab, out, w, a.salt, a.shard_rows, E.parse_phases(a.phases), group_by=a.group_by,
          reserved=None if a.keep_reserved else R.reserved_decks(a.repo), vers=[v for v in a.ver.split(",") if v] or None,
          human_dirs=humans, train_human=a.train_human, jobs=max(1, a.jobs),
          play_explore=a.play_explore or ("exclude" if a.schema == "r17" else "include"),
          schema_kind=a.schema, min_turn=a.min_turn,
          deck_vocab_min=(0.5 if a.deck_vocab_min is None else a.deck_vocab_min) if a.schema == "r17" else None,
          vocab_cards=vocab_cards, night_of=night_of)
    return 0


if __name__ == "__main__":
    sys.exit(main())
