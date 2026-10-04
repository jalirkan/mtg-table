#!/usr/bin/env python3
# mtg-table — tools/ml: 17Lands' public replay data -> r17 rows, for the outside exam (D359).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Read a 17Lands replay file into r17 rows (r17.py) for the outside exam.

    python3 tools/ml/ext17l.py fetch [--set powered-premier|powered-trad] [--dir var/ml/17lands]
        [--max-bytes N]
    python3 tools/ml/ext17l.py rows REPLAY.csv.gz --out var/ml/17lands/rows-premier
        [--vocab cubes/vintage-cube-180.md] [--cards var/ml/17lands/cards.csv]
        [--min-share 0.5] [--min-turn 3] [--perspective user|both] [--max-games N]

THE DATA.  17Lands' public datasets (https://www.17lands.com/public_datasets),
by 17Lands, licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/);
the rows this writes are derived from them: filtered to Arena's Powered Cube,
re-encoded into r17 features.  Only the published files are read -- `fetch`
downloads them (with resume and a size check against the server's
Content-Length) and nothing here calls 17Lands' API.

THE FILE.  A replay file is a gzipped CSV with ONE ROW PER GAME (about 3,000
columns): metadata (draft_id, game_time, match and game number, on_play, won,
num_turns, ranks, the user's skill buckets), and per-turn column groups
`user_turn_N_*` / `oppo_turn_N_*` (N = 1..30: the user's and the opponent's
N-th turn).  Cards are Arena ids, `|`-separated, named through
`analysis_data/cards/cards.csv` (cached beside the replay; tokens have rarity
`token`).  The end-of-turn snapshot of each half-turn is what r17 reads:
`<side>_turn_N_eot_{user,oppo}_{lands,creatures,non_creatures}_in_play` (both
battlefields, as ids), `..._eot_{user,oppo}_life`, `..._eot_user_cards_in_hand`
(the user's hand as ids: only its SIZE is read) and `..._eot_oppo_cards_in_hand`
(a count).

THE HALF-TURNS.  The game's half-turns are ordered by who played first:
on the play the user's N-th turn is half-turn 2N-1 and the opponent's 2N; on the
draw the opponent's N-th is 2N-1 and the user's 2N.  That number is r17's
`turn` (the protocol's turn: 1 is the first player's first turn; checked on the
real file: on the play the user's first turn draws nothing and the opponent's
draws one).  A game with no `on_play` cannot be ordered and is skipped.  A
half-turn the game reached has a permanent on some battlefield at its end
(past the game's end the number columns read `0.0` and the id lists are
empty).  The LAST such half-turn is dropped: the game ended inside it and its
snapshot is often empty or half-written.  Rows start at `--min-turn` (3), as
our own r17 rows do.

PERSPECTIVE.  A replay row is the 17Lands USER's game: the user is always "me"
and the label is `won` (+1 / -1; Arena games here have no draws).  Three
consequences, handled as follows:
  * the users run the 17Lands tracker -- an engaged, stronger-than-average
    population whose base win rate is above 50% -- so a model trained on
    Forge's symmetric games starts mis-calibrated by that shift; the exam
    reports calibration and compares every model on the same rows, where the
    shift costs all of them;
  * 17Lands knows the user's hand cards but only the opponent's hand size;
    r17 reads a SIZE for both sides, so the encoding is symmetric and the
    user's extra knowledge is never read;
  * `--perspective both` also writes each position from the opponent's side
    (the sides swapped, the play/draw and whose-turn flipped, the label
    inverted; `persp` 1 in the shards).  That cancels the user-skill shift
    but writes two perfectly anti-correlated rows per position; the exam's
    pre-registered population is the user's rows (`persp` 0), and its bootstrap
    resamples whole games either way.

QUALIFYING ROWS.  A position qualifies when at least `--min-share` of the
non-basic permanents on the battlefield (both sides; tokens and unknown ids
count as outside) are in the vocabulary; a board of basics only is 1.0.  Rows
under it are counted, not written.  stats.json counts the candidate positions
and the qualifying ones at 0.5 and 0.8 (and 0.7, 1.0).

OUTPUT (`--out`), dataset.py's shard format so evalnet.Rows reads it:
    features.json         the r17 schema for --vocab (the exam refuses a model of another)
    ext-NNNNN.npz         X int16, y int8, turn, turns_to_end, rows_to_end int16, active int8,
                          game int32 (games.jsonl index), share float32, persp int8
    games.jsonl           per game with rows: id (sha256 of draft_id|match|game|game_time, 16 hex),
                          half (dev | test, by hash: the exam's held-out half), on_play, won, rows,
                          num_turns, expansion, event_type, rank, the user's skill buckets
    stats.json            written last: games read and skipped (why), candidate and qualifying
                          positions per threshold, unknown ids, rows per half and perspective

The reader streams: one game row at a time through gzip and csv, shards of
--shard-rows; a truncated download (a range read of the first N MB) is read up
to its last whole row.  Needs numpy (the shards).
"""
from __future__ import annotations

import argparse
import codecs
import csv
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import zlib
from collections import Counter
from typing import Any, Iterator

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import r17 as R17  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

BASE = "https://17lands-public.s3.amazonaws.com/analysis_data"
CARDS_URL = f"{BASE}/cards/cards.csv"
REPLAYS = {
    "powered-premier": f"{BASE}/replay_data/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz",
    "powered-trad": f"{BASE}/replay_data/replay_data_public.Cube_-_Powered.TradDraft.csv.gz",
}
ATTRIBUTION = ("17Lands public datasets (https://www.17lands.com/public_datasets), CC BY 4.0 "
               "(https://creativecommons.org/licenses/by/4.0/); filtered to Powered Cube and re-encoded as r17 rows")
HALF_SALT = "r17-exam-v1"          # the exam's held-out half: pre-registered with the rule (outside_exam.py, D359)
THRESHOLDS = (0.5, 0.7, 0.8, 1.0)
SIDES = ("user", "oppo")
EOT_LISTS = ("lands", "creatures", "non_creatures")


# ---------------------------------------------------------------- downloading

def remote_size(url: str) -> int | None:
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as r:
        n = r.headers.get("Content-Length")
        return int(n) if n is not None else None


def download(url: str, dest: str, max_bytes: int | None = None, log=print) -> dict[str, Any]:
    """Fetch `url` to `dest`, resuming a partial file (`dest.part`) with a Range request, and check
    the finished size against the server's Content-Length.  With `max_bytes`, only the first
    max_bytes (a range read, for a sanity run): written to dest as is, marked in `dest.range`."""
    os.makedirs(os.path.dirname(os.path.abspath(dest)) or ".", exist_ok=True)
    total = remote_size(url)
    want = total if max_bytes is None or total is None else min(total, max_bytes)
    if os.path.exists(dest) and want is not None and os.path.getsize(dest) == want:
        log(f"fetch: {dest} is already whole ({want} bytes)")
        return {"path": dest, "bytes": want, "total": total, "partial": want != total}
    part = dest + ".part"
    have = os.path.getsize(part) if os.path.exists(part) else 0
    if want is not None and have > want:
        os.remove(part)
        have = 0
    t0 = time.time()
    while want is None or have < want:
        hdr = {}
        if have or max_bytes is not None:
            hdr["Range"] = f"bytes={have}-" + (str(want - 1) if want is not None and want != total else "")
        req = urllib.request.Request(url, headers=hdr)
        with urllib.request.urlopen(req, timeout=120) as r, open(part, "ab") as f:
            if have and r.status != 206:
                raise SystemExit(f"fetch: {url} ignored the Range request (HTTP {r.status}); delete {part} and retry")
            while True:
                buf = r.read(1 << 20)
                if not buf:
                    break
                f.write(buf)
                have += len(buf)
                if want is not None and have >= want:
                    break
        if want is None:
            break
    if want is not None and have != want:
        raise SystemExit(f"fetch: {dest}: got {have} bytes, the server says {want}")
    os.replace(part, dest)
    if want != total:
        with open(dest + ".range", "w", encoding="utf-8") as f:
            f.write(f"{want} of {total}\n")
    elif os.path.exists(dest + ".range"):
        os.remove(dest + ".range")
    log(f"fetch: {dest}: {have} bytes{'' if want == total else f' (first {want} of {total})'} "
        f"in {time.time() - t0:.0f} s")
    return {"path": dest, "bytes": have, "total": total, "partial": want != total}


# ---------------------------------------------------------------- cards.csv

class Card:
    __slots__ = ("name", "types", "token", "basic")

    def __init__(self, name: str, types: str, token: bool):
        self.name, self.types, self.token = name, types, token
        self.basic = R17.is_basic(name, types)


def load_cards(path: str) -> dict[str, Card]:
    """Arena id -> card (17Lands' cards.csv: id, expansion, name, rarity, ..., types, is_booster)."""
    out: dict[str, Card] = {}
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            out[r["id"]] = Card(r["name"], r.get("types") or "", (r.get("rarity") or "") == "token")
    return out


def cards_file(path: str, log=print) -> str:
    """The cached cards.csv, fetched once when missing."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        download(CARDS_URL, path, log=log)
    return path


# ---------------------------------------------------------------- the replay file

class GzLines:
    """The text lines of a gzip file, decompressed a megabyte at a time.  Unlike gzip.open, a
    file cut short (a range read, a killed download) gives every line up to the cut rather than
    an error that loses the last buffer; `clean` says whether the stream really ended.  Several
    gzip members in a row are read as one text."""

    def __init__(self, path: str, chunk: int = 1 << 20):
        self.path, self.chunk = path, chunk
        self.clean = False

    def __iter__(self) -> Iterator[str]:
        dec = codecs.getincrementaldecoder("utf-8")(errors="replace")
        d = zlib.decompressobj(16 + zlib.MAX_WBITS)
        pending = ""
        member_open = False
        with open(self.path, "rb") as f:
            while True:
                data = f.read(self.chunk)
                if not data:
                    break
                while data:
                    try:
                        out = d.decompress(data)
                    except zlib.error:
                        return            # corrupt from here on: what came before stands
                    member_open = not d.eof
                    data = d.unused_data if d.eof else b""
                    if d.eof:
                        d = zlib.decompressobj(16 + zlib.MAX_WBITS)
                    if out:
                        lines = (pending + dec.decode(out)).split("\n")
                        pending = lines.pop()
                        for ln in lines:
                            yield ln + "\n"
        self.clean = not member_open
        if self.clean:
            pending += dec.decode(b"", final=True)
            if pending:
                yield pending       # a last line without a newline, in a whole file only


def iter_csv(path: str) -> Iterator[tuple[list[str], list[str]]]:
    """(header, row) for every whole row of a gzipped CSV, streamed (GzLines).  A truncated
    file ends at its last whole row: the row the cut fell in is never yielded."""
    csv.field_size_limit(1 << 30)
    src = GzLines(path)
    reader = csv.reader(iter(src))
    try:
        header = next(reader)
    except (StopIteration, csv.Error):
        return
    prev: list[str] | None = None
    try:
        for row in reader:
            if prev is not None:
                yield header, prev
            prev = row
    except csv.Error:
        return
    # GzLines never hands over a line the cut fell in, so a last row of the right width is whole
    if prev is not None and len(prev) == len(header):
        yield header, prev


class Layout:
    """Where each half-turn's end-of-turn columns sit in a replay header."""

    TURN = re.compile(r"^(user|oppo)_turn_(\d+)_(.*)$")

    def __init__(self, header: list[str]):
        self.ix = {c: i for i, c in enumerate(header)}
        need = ("on_play", "won")
        missing = [c for c in need if c not in self.ix]
        if missing:
            raise SystemExit(f"ext17l: not a 17Lands replay file (no {', '.join(missing)} column)")
        self.turns: dict[tuple[str, int], dict[str, int]] = {}
        for c, i in self.ix.items():
            m = self.TURN.match(c)
            if m and m.group(3).startswith("eot_"):
                self.turns.setdefault((m.group(1), int(m.group(2))), {})[m.group(3)] = i
        self.max_n = max((n for _s, n in self.turns), default=0)

    def get(self, row: list[str], col: str) -> str:
        i = self.ix.get(col)
        return row[i] if i is not None and i < len(row) else ""


def _bool(v: str) -> bool | None:
    v = (v or "").strip().lower()
    return True if v in ("true", "1") else False if v in ("false", "0") else None


def _int(v: str) -> int | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def _ids(v: str) -> list[str]:
    return [x for x in (v or "").split("|") if x]


def game_id(layout: Layout, row: list[str]) -> str:
    raw = "|".join(layout.get(row, c) for c in ("draft_id", "match_number", "game_number", "game_time"))
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def half_of(gid: str) -> str:
    """The exam's two halves of the games, by a hash of the game id: `test` is the held-out half."""
    return "test" if int(hashlib.sha256(f"{HALF_SALT}|{gid}".encode()).hexdigest()[:8], 16) % 2 else "dev"


def _side(cols: dict[str, int], row: list[str], who: str, cards: dict[str, Card], unknown: Counter) -> R17.Side:
    """One player's end-of-turn snapshot: `who` is 'user' or 'oppo' (the eot columns' own naming)."""
    def col(name: str) -> str:
        i = cols.get(name)
        return row[i] if i is not None and i < len(row) else ""

    s = R17.Side(life=_int(col(f"eot_{who}_life")) or 0)
    if who == "user":
        s.hand = len(_ids(col("eot_user_cards_in_hand")))
    else:
        s.hand = _int(col("eot_oppo_cards_in_hand")) or 0
    for lst in EOT_LISTS:
        for cid in _ids(col(f"eot_{who}_{lst}_in_play")):
            c = cards.get(cid)
            if c is None:
                unknown[cid] += 1
                s.permanents.append(R17.Permanent(None, lst == "lands", lst == "creatures"))
                continue
            s.permanents.append(R17.Permanent(c.name, lst == "lands", lst == "creatures", c.token, c.basic))
    return s


def _present(cols: dict[str, int], row: list[str]) -> bool:
    """A half-turn the game reached: some permanent on either battlefield at its end.  (Past the
    game's end the number columns read `0.0`, not empty, and the id lists are empty -- measured.)"""
    for who in SIDES:
        for lst in EOT_LISTS:
            i = cols.get(f"eot_{who}_{lst}_in_play")
            if i is not None and i < len(row) and row[i] != "":
                return True
    return False


def game_positions(layout: Layout, row: list[str], cards: dict[str, Card], unknown: Counter,
                   min_turn: int = R17.MIN_TURN) -> tuple[str, list[tuple[int, R17.Position]], int]:
    """('ok' | why not, [(turn, position from the USER's side)], the last half-turn with data).
    The game's final half-turn is never among the positions."""
    on_play = _bool(layout.get(row, "on_play"))
    if on_play is None:
        return "no on_play", [], 0
    if _bool(layout.get(row, "won")) is None:
        return "no won", [], 0
    halves: list[tuple[int, str, dict[str, int]]] = []
    for (side, n), cols in layout.turns.items():
        first = (side == "user") == on_play
        halves.append((2 * n - 1 if first else 2 * n, side, cols))
    halves.sort()
    present = [(t, side, cols) for t, side, cols in halves if _present(cols, row)]
    if not present:
        return "no turns", [], 0
    last = present[-1][0]
    out = []
    for t, side, cols in present:
        if t >= last or t < min_turn:
            continue
        pos = R17.Position(t, side == "user", 1 if on_play else -1,
                           _side(cols, row, "user", cards, unknown), _side(cols, row, "oppo", cards, unknown))
        out.append((t, pos))
    return "ok", out, last


def mirror(pos: R17.Position) -> R17.Position:
    """The same position from the opponent's side."""
    return R17.Position(pos.turn, not pos.my_turn, -pos.on_play, pos.opp, pos.me)


# ---------------------------------------------------------------- rows

_KEYS = ("X", "y", "turn", "turns_to_end", "rows_to_end", "active", "game", "share", "persp")
META = ("expansion", "event_type", "rank", "opp_rank", "num_turns", "user_n_games_bucket",
        "user_game_win_rate_bucket", "num_mulligans", "opp_num_mulligans")


def build(replay: str, cards: dict[str, Card], vocab_paths: list[str], out: str, min_share: float = 0.5,
          min_turn: int = R17.MIN_TURN, perspective: str = "user", max_games: int | None = None,
          shard_rows: int = 100_000, quiet: bool = False) -> dict[str, Any]:
    if np is None:
        raise SystemExit("ext17l.py rows needs numpy (pip install numpy)")
    import dataset as D   # the shard writer, byte for byte reproducible
    if perspective not in ("user", "both"):
        raise ValueError("perspective is user or both")
    schema = R17.R17Schema(E.Vocab.from_files(vocab_paths), min_turn)
    os.makedirs(out, exist_ok=True)
    for fn in os.listdir(out):
        if (fn.startswith("ext-") and fn.endswith(".npz")) or fn in ("stats.json", "games.jsonl"):
            os.remove(os.path.join(out, fn))
    with open(os.path.join(out, "features.json"), "w", encoding="utf-8") as f:
        json.dump(schema.to_json(), f, indent=1, ensure_ascii=False)
        f.write("\n")
    st: Counter = Counter()
    cand = {p: Counter() for p in ("user", "oppo")}
    rows_by = Counter()
    unknown: Counter = Counter()
    buf: list[dict[str, Any]] = []
    buffered = 0
    shard_no = 0
    t0 = time.time()
    gf = open(os.path.join(out, "games.jsonl"), "w", encoding="utf-8")
    n_games_out = 0

    def flush(force: bool = False) -> None:
        nonlocal buf, buffered, shard_no
        while buffered and (force or buffered >= shard_rows):
            cat = {k: np.concatenate([b[k] for b in buf]) for k in _KEYS} if len(buf) > 1 else buf[0]
            n = min(shard_rows, buffered)
            D.savez_fixed(os.path.join(out, f"ext-{shard_no:05d}.npz"), {k: cat[k][:n] for k in _KEYS})
            shard_no += 1
            buffered -= n
            buf = [{k: cat[k][n:] for k in _KEYS}] if buffered else []

    layout = None
    try:
        for header, row in iter_csv(replay):
            if layout is None:
                layout = Layout(header)
            if max_games is not None and st["games"] >= max_games:
                break
            st["games"] += 1
            why, positions, last = game_positions(layout, row, cards, unknown, min_turn)
            if why != "ok":
                st[f"skipped: {why}"] += 1
                continue
            won = _bool(layout.get(row, "won"))
            gid = game_id(layout, row)
            half = half_of(gid)
            persps = (0, 1) if perspective == "both" else (0,)
            feats, ys, turns, tte, act, shares, pp = [], [], [], [], [], [], []
            for t, pos in positions:
                share = R17.vocab_share(pos, schema)
                for p in persps:
                    name = "user" if p == 0 else "oppo"
                    cand[name]["positions"] += 1
                    for th in THRESHOLDS:
                        if share >= th:
                            cand[name][f">={th:g}"] += 1
                    if share < min_share:
                        continue
                    view = pos if p == 0 else mirror(pos)
                    feats.append(R17.encode_position(view, schema))
                    ys.append((1 if won else -1) * (1 if p == 0 else -1))
                    turns.append(t)
                    tte.append(last - t)
                    act.append(1 if view.my_turn else 0)
                    shares.append(share)
                    pp.append(p)
            st["games with positions"] += 1 if positions else 0
            if not feats:
                continue
            X = np.asarray(feats, np.float64)
            if np.abs(X).max(initial=0) >= 32768:
                raise ValueError("an r17 feature does not fit int16")
            n = len(feats)
            # rows_to_end counts the rows of the same perspective after this one
            pp_a = np.asarray(pp, np.int8)
            rte = np.zeros(n, np.int16)
            for p in persps:
                m = np.nonzero(pp_a == p)[0]
                rte[m] = np.arange(len(m) - 1, -1, -1)
            gi = n_games_out
            arrays = {"X": X.astype(np.int16), "y": np.asarray(ys, np.int8), "turn": np.asarray(turns, np.int16),
                      "turns_to_end": np.asarray(tte, np.int16), "rows_to_end": rte,
                      "active": np.asarray(act, np.int8), "game": np.full(n, gi, np.int32),
                      "share": np.asarray(shares, np.float32), "persp": pp_a}
            meta = {k: layout.get(row, k) for k in META if k in layout.ix}
            gf.write(json.dumps({"index": gi, "id": gid, "half": half, "on_play": layout.get(row, "on_play") == "True",
                                 "won": bool(won), "rows": n, "lastTurn": last, **meta}) + "\n")
            n_games_out += 1
            rows_by[f"{half}.user"] += int((pp_a == 0).sum())
            if perspective == "both":
                rows_by[f"{half}.oppo"] += int((pp_a == 1).sum())
            buf.append(arrays)
            buffered += n
            flush()
            if not quiet and st["games"] % 20000 == 0:
                print(f"ext17l: {st['games']} games, {sum(rows_by.values())} rows, {time.time() - t0:.0f} s",
                      file=sys.stderr, flush=True)
    finally:
        gf.close()
    flush(force=True)
    summary = {
        "source": ATTRIBUTION, "replay": os.path.basename(replay),
        "partialDownload": os.path.exists(replay + ".range"), "maxGames": max_games if max_games is not None and st["games"] >= max_games else None,
        "schemaKind": "r17", "schemaId": schema.schema_id, "nFeatures": schema.n, "vocab": schema.vocab.sources,
        "minShare": min_share, "minTurn": min_turn, "perspective": perspective, "halfSalt": HALF_SALT,
        "games": st["games"], "gamesWithPositions": st["games with positions"], "gamesWithRows": n_games_out,
        "skipped": {k.split(": ", 1)[1]: v for k, v in st.items() if k.startswith("skipped: ")},
        "candidates": {p: dict(c) for p, c in cand.items() if c},
        "rows": dict(rows_by), "rowsTotal": sum(rows_by.values()), "shards": shard_no,
        "unknownIds": len(unknown), "unknownOccurrences": sum(unknown.values()),
        "unknownTop": unknown.most_common(5), "seconds": round(time.time() - t0, 1),
        "peakGB": peak_gb(),
    }
    D._write_json(os.path.join(out, "stats.json"), summary)
    if not quiet:
        print(format_stats(summary))
    return summary


def peak_gb() -> float | None:
    """This process's peak resident set in GiB (a job's pilot checks it), or None where unknown."""
    try:
        import resource
        ru = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return round(ru / (2 ** 30 if sys.platform == "darwin" else 2 ** 20), 3)
    except (ImportError, OSError):
        return None


def format_stats(s: dict[str, Any]) -> str:
    c = s["candidates"].get("user", {})
    pos = c.get("positions", 0)
    pct = lambda k: f"{c.get(k, 0)} ({100 * c.get(k, 0) / pos:.1f}%)" if pos else "0"  # noqa: E731
    lines = [f"ext17l: {s['games']} games read ({s['gamesWithPositions']} with positions, {s['gamesWithRows']} with "
             f"rows; skipped {s['skipped'] or 'none'}) in {s['seconds']} s",
             f"  user-side positions (turn >= {s['minTurn']}, final half-turn dropped): {pos}; qualifying: "
             f">=0.5 {pct('>=0.5')}, >=0.8 {pct('>=0.8')}, >=0.7 {pct('>=0.7')}, all in vocab {pct('>=1')}",
             f"  rows written (share >= {s['minShare']:g}, perspective {s['perspective']}): {s['rowsTotal']} "
             f"{s['rows']}; unknown ids {s['unknownIds']} ({s['unknownOccurrences']} occurrences); "
             f"peak RSS {s.get('peakGB')} GB"]
    return "\n".join(lines)


def load_ext(out: str, n_states: int):
    """The rows of an ext17l directory as (evalnet.Rows, share, persp, games)."""
    import evalnet as N
    files = sorted(f for f in os.listdir(out) if f.startswith("ext-") and f.endswith(".npz"))
    with open(os.path.join(out, "features.json"), encoding="utf-8") as f:
        schema = json.load(f)
    off = N.card_offset_of(schema)
    parts, share, persp = [], [], []
    for fn in files:
        with np.load(os.path.join(out, fn)) as z:
            parts.append(N.Rows.from_X(z["X"], off, z["y"], z["turn"], z["game"], n_states))
            share.append(z["share"])
            persp.append(z["persp"])
    with open(os.path.join(out, "games.jsonl"), encoding="utf-8") as f:
        games = [json.loads(line) for line in f]
    if not parts:
        return N.Rows.empty(off, n_states=n_states), np.zeros(0, np.float32), np.zeros(0, np.int8), games
    return N.Rows.concat(parts), np.concatenate(share), np.concatenate(persp), games


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch", help="download a Powered Cube replay file and cards.csv (resumable, size-checked)")
    f.add_argument("--set", choices=sorted(REPLAYS), default="powered-premier")
    f.add_argument("--dir", default="var/ml/17lands")
    f.add_argument("--max-bytes", type=int, default=None,
                   help="only the first N bytes (a range read for a sanity run; the reader stops at the last whole row)")
    r = sub.add_parser("rows", help="a replay file -> r17 rows")
    r.add_argument("replay")
    r.add_argument("--out", required=True)
    r.add_argument("--vocab", action="append", help="the vocabulary (default cubes/vintage-cube-180.md)")
    r.add_argument("--cards", default="var/ml/17lands/cards.csv", help="17Lands' cards.csv (fetched when missing)")
    r.add_argument("--min-share", type=float, default=0.5,
                   help="write a position when at least this share of its non-basic permanents is in the vocabulary")
    r.add_argument("--min-turn", type=int, default=R17.MIN_TURN)
    r.add_argument("--perspective", choices=("user", "both"), default="user")
    r.add_argument("--max-games", type=int, default=None)
    r.add_argument("--shard-rows", type=int, default=100_000)
    a = ap.parse_args(argv)
    if a.cmd == "fetch":
        cards_file(os.path.join(a.dir, "cards.csv"))
        url = REPLAYS[a.set]
        download(url, os.path.join(a.dir, os.path.basename(url)), a.max_bytes)
        print(f"source: {ATTRIBUTION}")
        return 0
    cards = load_cards(cards_file(a.cards))
    build(a.replay, cards, a.vocab or ["cubes/vintage-cube-180.md"], a.out, a.min_share, a.min_turn, a.perspective,
          a.max_games, a.shard_rows)
    return 0


if __name__ == "__main__":
    sys.exit(main())
