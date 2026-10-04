#!/usr/bin/env python3
# mtg-table — tools/ml tests: writes the made-up 17Lands-format sample beside this file.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""A tiny, MADE-UP replay file in 17Lands' public replay format (one row per
game, `user_turn_N_*` / `oppo_turn_N_*` column groups, Arena-style ids through a
cards.csv), for tests/test_outside_exam.py.  No real 17Lands row is in it.

    python3 tools/ml/tests/data/17lands/make_sample.py     # rewrites sample.csv.gz and cards.csv

The games (the vocabulary is tests/data/mini-cube.md):
  d1  on the play, won, 3 rounds: rows at half-turns 3, 4, 5 (vocab share 1.0, 2/3, 1/2);
      half-turn 6 is the final one (a half-written snapshot) and is never a row
  d2b on the draw, lost: rows at 3 (the opponent's turn) and 4; a split-name land
      (`Clearwater Pathway // Murkwater Pathway`) matches its front face; it hashes into the
      exam's held-out half (`test`), d1 into `dev`
  d3  no on_play: skipped
  d4  ends in half-turn 3: no row
  d5  a token and an unknown id: share 0, a position but no row
"""
import csv
import gzip
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
MAXN = 4
CARDS = [
    ("101", "TST", "Plains", "basic", "W", "0", "Basic Land - Plains", "True"),
    ("102", "TST", "Island", "basic", "U", "0", "Basic Land - Island", "True"),
    ("103", "TST", "Hallowed Fountain", "rare", "WU", "0", "Land - Plains Island", "True"),
    ("104", "TST", "Thraben Inspector", "common", "W", "1", "Creature - Human Soldier", "True"),
    ("105", "TST", "Reflector Mage", "uncommon", "WU", "3", "Creature - Human Wizard", "True"),
    ("106", "TST", "Soulherder", "uncommon", "WU", "2", "Creature - Spirit", "True"),
    ("107", "TST", "Lightning Bolt", "common", "R", "1", "Instant", "True"),
    ("108", "TST", "Clearwater Pathway // Murkwater Pathway", "rare", "UB", "0", "Land", "True"),
    ("201", "TST", "Grizzly Bears", "common", "G", "2", "Creature - Bear", "True"),
    ("202", "TST", "Sol Ring", "uncommon", "", "1", "Artifact", "True"),
    ("203", "TST", "Forest", "basic", "G", "0", "Basic Land - Forest", "True"),
    ("301", "TTST", "Clue", "token", "", "0", "Token Artifact - Clue", "False"),
    ("302", "TTST", "Bird, Soldier", "token", "W", "0", "Token Creature - Bird Soldier", "False"),
]
META = ["expansion", "event_type", "draft_id", "draft_time", "game_time", "build_index", "match_number",
        "game_number", "rank", "opp_rank", "main_colors", "splash_colors", "on_play", "num_mulligans",
        "opp_num_mulligans", "opp_colors", "num_turns", "won", "user_n_games_bucket", "user_game_win_rate_bucket"]
EOT = ["eot_user_cards_in_hand", "eot_oppo_cards_in_hand", "eot_user_lands_in_play", "eot_oppo_lands_in_play",
       "eot_user_creatures_in_play", "eot_oppo_creatures_in_play", "eot_user_non_creatures_in_play",
       "eot_oppo_non_creatures_in_play", "eot_user_life", "eot_oppo_life"]
LISTS = {"eot_user_cards_in_hand", "eot_user_lands_in_play", "eot_oppo_lands_in_play", "eot_user_creatures_in_play",
         "eot_oppo_creatures_in_play", "eot_user_non_creatures_in_play", "eot_oppo_non_creatures_in_play"}


def header():
    h = list(META)
    for n in range(1, MAXN + 1):
        for side in ("user", "oppo"):
            h += [f"{side}_turn_{n}_lands_played", f"{side}_turn_{n}_creatures_cast"]
            h += [f"{side}_turn_{n}_cards_drawn" if side == "user" else f"{side}_turn_{n}_cards_drawn_or_tutored"]
            h += [f"{side}_turn_{n}_{e}" for e in EOT]
    return h


def snap(uhand, ohand, ul=(), ol=(), uc=(), oc=(), un=(), on=(), ulife=20, olife=20):
    return {"eot_user_cards_in_hand": "|".join(uhand), "eot_oppo_cards_in_hand": f"{ohand}.0",
            "eot_user_lands_in_play": "|".join(ul), "eot_oppo_lands_in_play": "|".join(ol),
            "eot_user_creatures_in_play": "|".join(uc), "eot_oppo_creatures_in_play": "|".join(oc),
            "eot_user_non_creatures_in_play": "|".join(un), "eot_oppo_non_creatures_in_play": "|".join(on),
            "eot_user_life": f"{ulife}.0", "eot_oppo_life": f"{olife}.0"}


def game(draft, on_play, won, turns, snaps):
    """snaps: {(side, n): snapshot}; every other half-turn reads as past the game's end."""
    row = {"expansion": "CUBE", "event_type": "PremierDraft", "draft_id": draft, "draft_time": "2025-10-01 10:00:00",
           "game_time": "2025-10-01 11:00:00", "build_index": "0", "match_number": "1", "game_number": "1",
           "rank": "gold", "opp_rank": "", "main_colors": "WU", "splash_colors": "", "on_play": on_play,
           "num_mulligans": "0", "opp_num_mulligans": "0", "opp_colors": "G", "num_turns": str(turns), "won": won,
           "user_n_games_bucket": "10", "user_game_win_rate_bucket": "0.56"}
    for n in range(1, MAXN + 1):
        for side in ("user", "oppo"):
            s = snaps.get((side, n))
            row[f"{side}_turn_{n}_lands_played"] = ""
            row[f"{side}_turn_{n}_creatures_cast"] = ""
            row[f"{side}_turn_{n}_cards_drawn" if side == "user" else f"{side}_turn_{n}_cards_drawn_or_tutored"] = \
                "" if side == "user" else "0"
            for e in EOT:
                row[f"{side}_turn_{n}_{e}"] = s[e] if s else ("" if e in LISTS else "0.0")
    return row


H6 = ["107"] * 6


def rows():
    out = []
    # d1: on the play, won.  t1 u1, t2 o1, t3 u2, t4 o2, t5 u3, t6 o3 (final)
    out.append(game("d1", "True", "True", 3, {
        ("user", 1): snap(H6, 7, ul=["101"]),
        ("oppo", 1): snap(H6, 7, ul=["101"], ol=["102"]),
        ("user", 2): snap(H6[:5], 7, ul=["101", "103"], ol=["102"], uc=["104"]),
        ("oppo", 2): snap(H6[:5], 6, ul=["101", "103"], ol=["102", "203"], uc=["104"], oc=["201"], olife=18),
        ("user", 3): snap(H6[:3], 6, ul=["101", "103"], ol=["102", "203"], uc=["104", "105"], oc=["201"],
                          un=["202", "301"], olife=18),
        ("oppo", 3): snap([], 0, ul=["101"], ulife=20, olife=0),
    }))
    # d2: on the draw, lost.  t1 o1, t2 u1, t3 o2, t4 u2, t5 o3 (final)
    out.append(game("d2b", "False", "False", 3, {
        ("oppo", 1): snap(H6 + ["107"], 6, ol=["102"]),
        ("user", 1): snap(H6 + ["107"], 6, ul=["101"], ol=["102"]),
        ("oppo", 2): snap(H6 + ["107"], 5, ul=["101"], ol=["102", "108"], oc=["106"]),
        ("user", 2): snap(H6, 5, ul=["101", "101"], ol=["102", "108"], uc=["201"], oc=["106"], ulife=17),
        ("oppo", 3): snap(H6, 4, ul=["101", "101"], ol=["102", "108"], oc=["106"], ulife=0),
    }))
    # d3: no on_play
    out.append(game("d3", "", "True", 3, {("user", n): snap(H6, 7, ul=["101"]) for n in (1, 2, 3)}))
    # d4: over in half-turn 3
    out.append(game("d4", "True", "False", 2, {
        ("user", 1): snap(H6, 7, ul=["101"]), ("oppo", 1): snap(H6, 7, ul=["101"], ol=["102"]),
        ("user", 2): snap(H6, 7, ul=["101", "101"], ol=["102"]),
    }))
    # d5: a token and an unknown id
    out.append(game("d5", "True", "True", 2, {
        ("user", 1): snap(H6, 7, ul=["101"]), ("oppo", 1): snap(H6, 7, ul=["101"], ol=["102"]),
        ("user", 2): snap(H6, 7, ul=["101", "101"], ol=["102", "102"], uc=["302"], oc=["999"]),
        ("oppo", 2): snap(H6, 7, ul=["101"]),
    }))
    return out


def main():
    h = header()
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(h)
    for r in rows():
        w.writerow([r[c] for c in h])
    with open(os.path.join(HERE, "sample.csv.gz"), "wb") as f:
        with gzip.GzipFile(fileobj=f, mode="wb", mtime=0, filename="") as gz:
            gz.write(buf.getvalue().encode("utf-8"))
    with open(os.path.join(HERE, "cards.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["id", "expansion", "name", "rarity", "color_identity", "mana_value", "types", "is_booster"])
        w.writerows(CARDS)


if __name__ == "__main__":
    main()
