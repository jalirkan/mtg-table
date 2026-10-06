#!/usr/bin/env python3
# mtg-table — tools/ml tests: writes the made-up 17Lands-format GAME data beside this file.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""A tiny, MADE-UP game-data file in 17Lands' public game-data format (one row
per game; `won`, `draft_id`, and per card `opening_hand_`, `drawn_`,
`tutored_`, `deck_`, `sideboard_` counts), for tests/test_cards17l.py.  No real
17Lands row is in it.

    python3 tools/ml/tests/data/cards17l/make_games.py     # rewrites games.csv.gz

Five cards, six games (the test's expected counts are written beside each row).
"""
import csv
import gzip
import io
import os

CARDS = ["Alpha Knight", "Delta Bolt", "Nu Lost // Back Face", "Omicron Extra", "Mu Fountain"]
# (draft, won, {card: (opening_hand, drawn, tutored, deck)})
GAMES = [
    ("d1", True, {"Alpha Knight": (1, 0, 0, 1), "Delta Bolt": (0, 1, 0, 1), "Mu Fountain": (1, 0, 0, 1)}),
    ("d1", False, {"Alpha Knight": (0, 0, 0, 1), "Delta Bolt": (1, 0, 0, 1), "Mu Fountain": (0, 1, 0, 1)}),
    ("d2", True, {"Alpha Knight": (0, 0, 1, 1), "Nu Lost // Back Face": (0, 1, 0, 1)}),
    ("d3", False, {"Delta Bolt": (0, 0, 0, 1), "Nu Lost // Back Face": (1, 0, 0, 1)}),
    ("d3", True, {"Delta Bolt": (2, 0, 0, 2), "Omicron Extra": (0, 0, 0, 0)}),
    ("d4", False, {"Alpha Knight": (0, 1, 0, 1), "Omicron Extra": (0, 1, 0, 1)}),
]


def main() -> None:
    head = ["expansion", "event_type", "draft_id", "match_number", "game_number", "on_play", "won"]
    for c in CARDS:
        head += [f"opening_hand_{c}", f"drawn_{c}", f"tutored_{c}", f"deck_{c}", f"sideboard_{c}"]
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(head)
    for i, (d, won, cards) in enumerate(GAMES):
        row = ["Cube - Powered", "PremierDraft", d, "1", str(i + 1), "True", "True" if won else "False"]
        for c in CARDS:
            oh, dr, tu, de = cards.get(c, (0, 0, 0, 0))
            row += [str(oh), str(dr), str(tu), str(de), "0"]
        w.writerow(row)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "games.csv.gz")
    with gzip.GzipFile(out, "wb", mtime=0) as f:
        f.write(buf.getvalue().encode())


if __name__ == "__main__":
    main()
