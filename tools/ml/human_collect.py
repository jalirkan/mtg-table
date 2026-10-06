#!/usr/bin/env python3
# mtg-table — tools/ml: the owner's own games, collected into the human test set (D369).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Copy every finished human-vs-AI game the bridge recorded into the human test
set, `var/ml/human/` (D347's place; D369), with a small manifest.

    python3 tools/ml/human_collect.py                  # var/games/ -> var/ml/human/ (what play.sh runs)
    python3 tools/ml/human_collect.py --from DIR       # frame logs saved anywhere else (any names)
    python3 tools/ml/human_collect.py --status         # one line: "human test set: N games ..."
        [--games-dir var/games] [--out var/ml/human] [--dry-run] [--quiet] [--json]

WHERE THE GAMES ARE.  `mtgtable.MtgTable` writes every game a seat plays to
`var/games/<gameId>/frames.jsonl` under the checkout it runs from (Config.root()).
`scripts/play.sh` starts it with no `--game-id`, so a game's id is
`human-ws-<seed>` (game n of the match: `human-ws-<seed>-g<n>`, protocol
amendment M38); a match ForgeCoach launches (D303) is `match-m<13 digits>[-g<n>]`.
The gate, the smoke runs and the repro scripts write `var/games/` too, always
under a `--game-id` of their own, so only those two id shapes are read there.

WHAT IS COPIED.  A game is taken when all of these hold:

- its session header's `transport` is `ws` or `console` -- a seat a person
  played (`auto` and `null` are scripted seats; an AI-vs-AI recording has none);
- the viewing seat (`seat`, = `hello_ok.you`) is not an AI, and the other
  player is: a human against Forge's AI;
- it is finished: an `over` (or `gameOver`) with a winner or a reason.  A game in
  progress, abandoned by a restart, or ended by an engine crash (M46) is not.

The file copied is the bridge's log of the HUMAN SEAT -- what that seat was sent,
redacted for it by the bridge (hard rule 8), and what it answered.  Nothing of
the AI's side is read or written: the manifest names the AI's deck by its public
name and card count, as `hello_ok.match` does (M44).

DEDUPE.  A game's key is its game id + seed + `startedAt`.  play.sh deals a fresh
random seed each session, so game id + seed already names one game; `startedAt`
keeps two games apart when a seed was given twice on purpose (`--seed 42`), which
reuses the game id.  A key already in the manifest is never copied again, so a
second run copies nothing (idempotent).  Each game is written as
`<gameId>-<seed>-<startedAt>.jsonl.gz`, its lines byte for byte (gzip with no
timestamp, so the same game is the same file).

THE MANIFEST, `var/ml/human/manifest.json` (not `.jsonl`: dataset.py reads every
`*.jsonl[.gz]` under the folder as a game): one entry per game, oldest first --
`key`, `file`, `gameId`, `seed`, `startedAt`, `date`, `seat`, `transport`, `result`
(`win` / `loss` / `draw` from the human's side), `reason`, `turns`, `yourDeck`
(`name`, `path`, `sha256`), `cube` (the cube of `cubes/` holding at least 80% of
your deck's non-basic cards, when your deck file is still on disk), `aiDeck`
(`name`, `cards`), `aiProfile`, `aiPolicy` (amendment M56; null in older logs),
`origin` (`var/games` or `from`), `sha256` of the copied lines, `collectedAt`.
`.collect-cache.json` beside it remembers files already judged (size + mtime) so
play.sh's call costs milliseconds.

GAMES BETWEEN TWO PEOPLE (D407).  A table of two (D402) writes one log per seat,
`var/games/friend-m<13 digits>-seat<N>/`, and the draft room asks each player, game
by game, whether their seat may be recorded (the default is the room owner's
choice); the bridge writes that seat's answer into its session header as
`record` (amendment M60).  A seat's log is taken only when its header says
`humans: 2` and `record: true`, its transport is `ws`, both players are people
and it is finished -- so a player who opted out is never copied, and a game in
which only one player agreed gives exactly that player's seat.  ONE SEAT IS A
WHOLE TEST GAME: the rows are the viewing seat's own decisions over its own
redacted view (encode.py), exactly as for a game against the AI, so a seat is
usable without the other.  These games go to a set of their own,
`var/ml/human-friends/` (same manifest, plus `opponent: "human"`,
`opponentDeck` {name, cards} and `match` {game, of, score}), never into
`var/ml/human/`: D369's pre-registered first check is over the owner's games
against Forge's AI, and a game against a person is another population.
`human_eval.py --human var/ml/human-friends` scores them on their own.

Standard library only (no numpy): play.sh runs it at start and at exit.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import sys
import time
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402

REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
DEFAULT_GAMES = os.path.join("var", "games")
DEFAULT_OUT = os.path.join("var", "ml", "human")
DEFAULT_FRIENDS_OUT = os.path.join("var", "ml", "human-friends")
MANIFEST = "manifest.json"
CACHE = ".collect-cache.json"
HUMAN_TRANSPORTS = ("ws", "console")
# play.sh's own ids (MtgTable's default human-<transport>-<seed>) and D303's launched matches.
GAME_ID = re.compile(r"^(human-(ws|console)-\d+|match-m\d{13})(-g\d+)?$")
# D407: one seat's log of a game between two people (play.sh's table ids, TableMatch's -seat<N>).
FRIEND_GAME_ID = re.compile(r"^friend-m\d{13}-seat[01]$")
CUBE_MIN_SHARE = 0.8


# ---------------------------------------------------------------- reading one log

def _raw_segments(path: str) -> list[list[str]]:
    """The file's lines grouped by game: a new group at every session header (§8.1).
    Lines before the first header belong to no game and are dropped."""
    groups: list[list[str]] = []
    for line in E._lines(path):
        if not line.strip():
            continue
        is_header = False
        if '"session"' in line:
            try:
                is_header = json.loads(line).get("kind") == "session"
            except json.JSONDecodeError:
                is_header = False
        if is_header:
            groups.append([])
        if groups:
            groups[-1].append(line if line.endswith("\n") else line + "\n")
    return groups


def judge_friend(game: E.Game) -> str | None:
    """D407: None when this seat of a game between two people may be taken (its player agreed), else why not."""
    h = game.header
    if h.get("humans") != 2:
        return "not a seat at a table of two"
    if h.get("record") is not True:
        return "the player did not agree to recording this game (D407)"
    if h.get("transport") != "ws":
        return f"transport {h.get('transport')!r} is not a person's seat"
    hello = game.hello
    if not hello:
        return "no hello_ok"
    seat = h.get("seat")
    if hello.get("you") != seat:
        return "the header's seat is not hello_ok.you"
    players = hello.get("players") or []
    if len(players) != 2 or any(p.get("isAi") is not False for p in players):
        return "a table of two whose players are not both people"
    if ((hello.get("match") or {}).get("opponent")) != "human":
        return "hello_ok.match does not say the opponent is a person"
    _w, _t, labelled = E.game_outcome(game)
    if not labelled:
        return "not finished"
    return None


def judge(game: E.Game) -> str | None:
    """None when the game belongs in the human test set, else why not."""
    h = game.header
    if h.get("humans") == 2:
        return "a game between two people (D407: var/ml/human-friends/)"
    if h.get("transport") not in HUMAN_TRANSPORTS:
        return f"transport {h.get('transport')!r} is not a person's seat"
    hello = game.hello
    if not hello:
        return "no hello_ok"
    seat = h.get("seat")
    if hello.get("you") != seat:
        return "the header's seat is not hello_ok.you"
    players = hello.get("players") or []
    me = [p for p in players if p.get("id") == seat]
    others = [p for p in players if p.get("id") != seat]
    if not me or me[0].get("isAi"):
        return "the viewing seat is an AI"
    if not others or not all(p.get("isAi") for p in others):
        return "the other player is not an AI"
    _w, _t, labelled = E.game_outcome(game)
    if not labelled:
        return "not finished"
    return None


def key_of(h: dict[str, Any]) -> str:
    return f"{h.get('gameId')}|{h.get('seed')}|{h.get('startedAt')}"


def file_name(h: dict[str, Any]) -> str:
    gid = re.sub(r"[^A-Za-z0-9_.-]", "_", str(h.get("gameId") or "game"))
    if h.get("humans") == 2:
        gid += f"-seat{h.get('seat')}"   # D407: both seats of a table share a game id
    started = re.sub(r"[^0-9]", "", str(h.get("startedAt") or ""))[:17] or "0"
    return f"{gid}-{h.get('seed')}-{started}.jsonl.gz"


def _main_cards(path: str) -> list[str]:
    """A .dck's [main] card names (one per line, counts ignored)."""
    names, sect = [], ""
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("[") and line.endswith("]"):
                sect = line[1:-1].lower()
                continue
            if sect == "main":
                m = re.match(r"^(\d+)\s+(.+)$", line)
                n = (m.group(2) if m else line).split("|")[0].strip()
                if n:
                    names.append(n)
    return names


_CUBES: dict[str, set[str]] | None = None


def _cubes(repo: str) -> dict[str, set[str]]:
    global _CUBES
    if _CUBES is None:
        _CUBES = {}
        d = os.path.join(repo, "cubes")
        for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if fn.endswith(".md"):
                try:
                    names = E.read_vocab_names(os.path.join(d, fn))
                except (OSError, UnicodeDecodeError):
                    continue
                if len(names) >= 40:
                    _CUBES[fn[:-3]] = {E.norm_name(n) for n in names}
    return _CUBES


def guess_cube(deck_path: str | None, repo: str) -> tuple[str | None, float | None]:
    """The cube of cubes/ that holds most of the deck's non-basic cards, when it holds at least 80%."""
    if not deck_path:
        return None, None
    p = deck_path if os.path.isabs(deck_path) else os.path.join(repo, deck_path)
    if not os.path.isfile(p):
        return None, None
    basics = {E.norm_name(b) for b in E.BASICS} | {"snow-covered " + E.norm_name(b) for b in E.BASICS}
    try:
        cards = {E.norm_name(n) for n in _main_cards(p)} - basics
    except (OSError, UnicodeDecodeError):
        return None, None
    if not cards:
        return None, None
    best, share = None, 0.0
    for cube, pool in _cubes(repo).items():
        s = len(cards & pool) / len(cards)
        if s > share:
            best, share = cube, s
    return (best, round(share, 3)) if best and share >= CUBE_MIN_SHARE else (None, round(share, 3) if best else None)


def entry_of(game: E.Game, raw: str, origin: str, repo: str) -> dict[str, Any]:
    h = game.header
    seat = h.get("seat")
    winner, last_turn, _ = E.game_outcome(game)
    reason = None
    for f in game.frames:
        if f.get("type") == "over":
            reason = (f.get("body") or {}).get("reason")
    match = (game.hello or {}).get("match") or {}
    mine = next((d for d in h.get("decks") or [] if d.get("player") == seat), {}) or {}
    you = match.get("yourDeck") or {}
    ai = match.get("aiDeck") or {}
    cube, share = guess_cube(mine.get("path") or you.get("path"), repo)
    started = str(h.get("startedAt") or "")
    friend = h.get("humans") == 2
    extra: dict[str, Any] = {}
    if friend:
        od = match.get("opponentDeck") or {}
        sc = match.get("score") if isinstance(match.get("score"), dict) else None
        extra = {"opponent": "human", "opponentDeck": {"name": od.get("name"), "cards": od.get("cards")},
                 "match": {"game": (game.hello or {}).get("gameNumber"), "of": match.get("games"), "score": sc},
                 "record": True}
    return {
        "key": key_of(h), "file": file_name(h), "gameId": h.get("gameId"), "seed": h.get("seed"),
        "startedAt": started or None, "date": started[:10] or None, "seat": seat, "transport": h.get("transport"),
        "result": "draw" if winner is None else ("win" if winner == seat else "loss"),
        "reason": reason, "turns": last_turn,
        "yourDeck": {"name": you.get("name"), "path": mine.get("path") or you.get("path"),
                     "sha256": mine.get("sha256")},
        "cube": cube, "cubeShare": share,
        # M44: the AI's deck by its public name and count, never a path or a list.
        "aiDeck": {"name": ai.get("name"), "cards": ai.get("cards")} if ai else None,
        "aiProfile": match.get("aiProfile"), "aiPolicy": match.get("aiPolicy"),
        "origin": origin, "sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        "collectedAt": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()),
        **extra,
    }


# ---------------------------------------------------------------- the set on disk

def read_manifest(out: str) -> dict[str, Any]:
    try:
        with open(os.path.join(out, MANIFEST), encoding="utf-8") as f:
            m = json.load(f)
        if isinstance(m, dict) and isinstance(m.get("games"), list):
            return m
    except (OSError, json.JSONDecodeError):
        pass
    return {"version": 1, "games": []}


def _write_json(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def _write_gz(path: str, raw: str) -> None:
    tmp = path + ".tmp"
    with open(tmp, "wb") as fh:
        with gzip.GzipFile(filename="", mode="wb", fileobj=fh, mtime=0) as gz:
            gz.write(raw.encode("utf-8"))
    os.replace(tmp, path)


def candidates(games_dir: str | None, from_dirs: list[str], ids: re.Pattern[str] = GAME_ID) -> list[tuple[str, str]]:
    """(path, origin): var/games/<id>/frames.jsonl for play.sh's id shapes, and every log under --from."""
    out: list[tuple[str, str]] = []
    if games_dir and os.path.isdir(games_dir):
        for d in sorted(os.listdir(games_dir)):
            p = os.path.join(games_dir, d, "frames.jsonl")
            if ids.match(d) and os.path.isfile(p):
                out.append((p, "var/games"))
    for d in from_dirs:
        out += [(p, "from") for p in E.find_logs([d])]
    return out


def collect(games_dir: str | None, out: str, from_dirs: list[str] | None = None, repo: str = REPO,
            dry_run: bool = False, friends: bool = False) -> dict[str, Any]:
    """Copy what is new; returns {added, games, skipped: {why: n}, entries}.  `friends` (D407): the
    seats of games between two people whose player agreed, into their own set."""
    from_dirs = from_dirs or []
    ids = FRIEND_GAME_ID if friends else GAME_ID
    judge_one = judge_friend if friends else judge
    man = read_manifest(out)
    by_key = {g["key"]: g for g in man["games"] if isinstance(g, dict) and "key" in g}
    try:
        with open(os.path.join(out, CACHE), encoding="utf-8") as f:
            cache = json.load(f)
    except (OSError, json.JSONDecodeError):
        cache = {}
    added: list[dict[str, Any]] = []
    skipped: dict[str, int] = {}
    new_cache: dict[str, Any] = {}
    out_real = os.path.realpath(out)
    for path, origin in candidates(games_dir, from_dirs, ids):
        real = os.path.realpath(path)
        if real == out_real or real.startswith(out_real + os.sep):
            continue  # --from pointed at the set itself
        try:
            st = os.stat(path)
        except OSError:
            continue
        stamp = [st.st_size, int(st.st_mtime_ns)]
        c = cache.get(real)
        if c and c.get("stamp") == stamp and all(k in by_key for k in c.get("keys", [])):
            new_cache[real] = c
            for why in c.get("why", []):
                skipped[why] = skipped.get(why, 0) + 1
            continue
        keys, whys = [], []
        try:
            segments = _raw_segments(path)
            parsed = list(E.read_games(path))
        except (OSError, EOFError, UnicodeDecodeError) as e:
            skipped[f"unreadable ({type(e).__name__})"] = skipped.get(f"unreadable ({type(e).__name__})", 0) + 1
            continue
        if not parsed:
            whys.append("no session header")
        for game, seg in zip(parsed, segments):
            why = judge_one(game)
            gid = str(game.header.get("gameId") or "")
            if why is None and origin == "var/games" and not (FRIEND_GAME_ID.match(os.path.basename(os.path.dirname(path)))
                                                              if friends else GAME_ID.match(gid)):
                why = "not a play.sh game id"
            if why:
                whys.append(why)
                continue
            k = key_of(game.header)
            keys.append(k)
            if k in by_key:
                whys.append("already in the set")
                continue
            raw = "".join(seg)
            e = entry_of(game, raw, origin, repo)
            if not dry_run:
                os.makedirs(out, exist_ok=True)
                _write_gz(os.path.join(out, e["file"]), raw)
            by_key[k] = e
            added.append(e)
        for why in whys:
            skipped[why] = skipped.get(why, 0) + 1
        # an unfinished game is judged again when its file changes; "already in the set" is not a skip to remember
        new_cache[real] = {"stamp": stamp, "keys": keys, "why": [w for w in whys if w != "already in the set"]}
    # a manifest entry whose file vanished is dropped (the owner removed it by hand)
    games = sorted((g for g in by_key.values() if dry_run or os.path.isfile(os.path.join(out, g["file"]))),
                   key=lambda g: (str(g.get("startedAt") or ""), g["key"]))
    if not dry_run and (added or len(games) != len(man["games"]) or os.path.isdir(out)):
        about = ("games between two people at a table (D402), one seat each, every one with its player's consent "
                 "(D407); kept apart from the human test set; written by tools/ml/human_collect.py") if friends else \
                ("the owner's own games against Forge's AI, the human test set (D347, D369); "
                 "written by tools/ml/human_collect.py")
        man = {"version": 1, "about": about, "games": games}
        _write_json(os.path.join(out, MANIFEST), man)
        _write_json(os.path.join(out, CACHE), new_cache)
    return {"added": len(added), "games": len(games), "skipped": skipped, "entries": games, "new": added}


def friends_line(entries: list[dict[str, Any]], added: int | None = None, out: str = DEFAULT_FRIENDS_OUT) -> str:
    """D407: the games-between-two-people set, one clause for the status line (empty when there are none)."""
    n = len(entries)
    if not n and not added:
        return ""
    s = f"; {n} seat{'s' if n != 1 else ''} of games between two people"
    if added:
        s += f" ({added} new)"
    return s + f" -- {out}/ (D407)"


def status_line(entries: list[dict[str, Any]], added: int | None = None, out: str = DEFAULT_OUT) -> str:
    w = sum(1 for g in entries if g.get("result") == "win")
    loss = sum(1 for g in entries if g.get("result") == "loss")
    n = len(entries)
    s = f"human test set: {n} game{'s' if n != 1 else ''}"
    if n:
        s += f" ({w} won, {loss} lost)"
    if added:
        s += f", {added} new"
    s += f" -- {out}/ (D369; descriptive until 30)" if n < 30 else f" -- {out}/ (D369)"
    return s


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--games-dir", default=None, help=f"where the bridge writes games (default <repo>/{DEFAULT_GAMES})")
    ap.add_argument("--out", default=None, help=f"the human test set (default <repo>/{DEFAULT_OUT})")
    ap.add_argument("--friends-out", default=None,
                    help=f"D407: the seats of games between two people whose player agreed (default <repo>/{DEFAULT_FRIENDS_OUT})")
    ap.add_argument("--from", dest="from_dirs", action="append", default=[],
                    help="also read every *.jsonl[.gz] under this folder (ForgeCoach-saved logs); "
                         "with --from, var/games/ is read only when --games-dir is given too")
    ap.add_argument("--status", action="store_true", help="copy nothing; print the one status line")
    ap.add_argument("--dry-run", action="store_true", help="say what would be copied; write nothing")
    ap.add_argument("--quiet", action="store_true", help="print the status line only")
    ap.add_argument("--json", action="store_true", help="print the result as JSON")
    a = ap.parse_args(argv)
    out = a.out or os.path.join(REPO, DEFAULT_OUT)
    # D407: beside --out when that is given (a scratch set gets a scratch friends' set), else the repo's.
    fout = a.friends_out or (os.path.join(os.path.dirname(os.path.abspath(out)), "human-friends") if a.out
                             else os.path.join(REPO, DEFAULT_FRIENDS_OUT))
    shown = os.path.relpath(out, REPO) if out.startswith(REPO + os.sep) else out
    fshown = os.path.relpath(fout, REPO) if fout.startswith(REPO + os.sep) else fout
    if a.status:
        man = read_manifest(out)
        fman = read_manifest(fout)
        print(status_line([g for g in man["games"] if os.path.isfile(os.path.join(out, g.get("file", "")))], out=shown)
              + friends_line([g for g in fman["games"] if os.path.isfile(os.path.join(fout, g.get("file", "")))], out=fshown))
        return 0
    games_dir = a.games_dir or (None if a.from_dirs else os.path.join(REPO, DEFAULT_GAMES))
    r = collect(games_dir, out, a.from_dirs, REPO, a.dry_run)
    # D407: the seats of games between two people whose player agreed -- var/games/ only, into their own set.
    f = collect(games_dir, fout, [], REPO, a.dry_run, friends=True) if games_dir else \
        {"added": 0, "games": 0, "skipped": {}, "entries": [], "new": []}
    if a.json:
        print(json.dumps({**{k: v for k, v in r.items() if k != "entries"},
                          "friends": {k: v for k, v in f.items() if k != "entries"}}, indent=1))
        return 0
    if not a.quiet:
        for e in r["new"]:
            print(f"{'would copy' if a.dry_run else 'copied'} {e['gameId']} (seed {e['seed']}, {e['date']}): "
                  f"{e['result']} in {e['turns']} turns vs {(e['aiDeck'] or {}).get('name') or 'the AI'} -> {e['file']}")
        for e in f["new"]:
            print(f"{'would copy' if a.dry_run else 'copied'} {e['gameId']} seat {e['seat']} (a game between two people, "
                  f"{e['date']}): {e['result']} in {e['turns']} turns -> {fshown}/{e['file']}")
        for why, n in sorted(r["skipped"].items()):
            print(f"  not taken: {n} x {why}")
        for why, n in sorted(f["skipped"].items()):
            print(f"  not taken (two people): {n} x {why}")
    print(status_line(r["entries"], r["added"], shown) + friends_line(f["entries"], f["added"], fshown))
    return 0


if __name__ == "__main__":
    sys.exit(main())
