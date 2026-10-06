#!/usr/bin/env python3
# mtg-table — tools/ml: the reduced position schema `r17` for the outside exam (17Lands).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The reduced feature schema `r17` (D359): only what OUR recordings and
17Lands' public replay data both say about a position at the END of a
half-turn, so one model can be trained on Forge games and examined on human
ones.

    turn, round, whose turn it is, on the play or the draw (+1 / -1; 0 unknown)
    both life totals, both hand SIZES (17Lands has a count for the opponent)
    each side's battlefield: lands, non-land permanents, creatures, and the
        non-land permanents outside the vocabulary (tokens and face-down
        permanents included)
    cards: vocab x 2 counts -- how many copies of each vocabulary card each
        side has on the battlefield

Missing on purpose, because 17Lands does not record them: tapped state,
counters, damage, P/T, graveyards and exile, the stack, combat, the mana pool,
library sizes, the cards in the viewer's hand (17Lands has them for its user
only; a count keeps both sides alike), and every decision.

The layout follows encode.Schema's conventions so evalnet.py and train_eval.py
read an r17 dataset unchanged: board blocks first (`global`, `me.player`,
`opp.player`, `me.board`, `opp.board`), then a `cards` block of
`len(vocab.cards) x len(R17_STATES)` cells in slot-major order, and
`features.json` names `cardStates` (two here, seventeen in D305's).  The
vocabulary is encode.Vocab's (basics, the cube, the three special slots); the
special slots are never filled -- an off-vocabulary card is a count in the
board block, never a card cell.

One meaning in one place: both sources build a `Position` -- ours from a
frame log's last state of each turn (`game_positions`), 17Lands' from a replay
row's end-of-turn columns (ext17l.py) -- and `encode_position` turns it into
the vector.  Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from dataclasses import dataclass, field
from typing import Any, Iterable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402

SCHEMA_KIND = "r17"
SCHEMA_VERSION = 1
R17_STATES = ["me.battlefield", "opp.battlefield"]
MIN_TURN = 3          # rows from the third half-turn on (turns 1-2 say almost nothing)
BASIC_KEYS = {E.norm_name(b) for b in E.BASICS} | {"snow-covered " + E.norm_name(b) for b in E.BASICS[:5]}

GLOBAL = [("turn", "half-turn number (protocol turn: 1 is the first player's first turn)"),
          ("round", "ceil(turn/2)"),
          ("my_turn", "1 if the half-turn that just ended was the viewer's"),
          ("on_play", "+1 the viewer was on the play, -1 on the draw, 0 unknown")]
PLAYER = [("life", "life total at the end of the half-turn"),
          ("hand", "cards in hand (a count, for both sides)")]
BOARD = [("lands", "lands on the battlefield (any name)"),
         ("nonland", "non-land permanents on the battlefield (tokens included)"),
         ("creatures", "creatures on the battlefield (tokens included)"),
         ("other_nonland", "non-land permanents outside the vocabulary: off-cube cards, tokens, face-down")]


@dataclass
class Permanent:
    name: str | None          # None: no public name (face-down, a hidden stub)
    land: bool = False
    creature: bool = False
    token: bool = False
    basic: bool = False


@dataclass
class Side:
    life: int = 0
    hand: int = 0
    permanents: list[Permanent] = field(default_factory=list)


@dataclass
class Position:
    """One end-of-half-turn position from the viewer's side ("me")."""
    turn: int
    my_turn: bool
    on_play: int              # +1 / -1 / 0
    me: Side
    opp: Side


class R17Schema:
    """The r17 layout for one vocabulary (encode.Schema's interface: names,
    index, n, card_offset, schema_id, to_json)."""

    kind = SCHEMA_KIND

    def __init__(self, vocab: E.Vocab, min_turn: int = MIN_TURN):
        self.vocab = vocab
        self.min_turn = min_turn
        self.blocks: list[dict[str, Any]] = []
        self.names: list[str] = []

        def block(name: str, desc: str, entries: list[tuple[str, str]]) -> None:
            self.blocks.append({"name": name, "offset": len(self.names), "length": len(entries),
                                "description": desc,
                                "features": [{"name": n, "meaning": m} for n, m in entries]})
            self.names.extend(n for n, _ in entries)

        block("global", "the half-turn that just ended", GLOBAL)
        for side in ("me", "opp"):
            block(f"{side}.player", f"{side}: life and hand size", [(f"{side}.{n}", m) for n, m in PLAYER])
        for side in ("me", "opp"):
            block(f"{side}.board", f"{side}: battlefield counts", [(f"{side}.{n}", m) for n, m in BOARD])
        self.card_offset = len(self.names)
        block("cards", "per vocabulary slot x side: copies on that side's battlefield. Index of (slot s, "
              "state k) = offset + s*len(card_states) + k; the special slots stay 0",
              [(f"card[{c}].{st}", "") for c in vocab.cards for st in R17_STATES])
        self.index = {n: i for i, n in enumerate(self.names)}
        self.n = len(self.names)
        self._specials = {vocab.special(s) for s in E.SPECIALS}

    def card_index(self, slot: int, state: str) -> int:
        return self.card_offset + slot * len(R17_STATES) + R17_STATES.index(state)

    def vocab_slot(self, name: str | None) -> int | None:
        """A name's slot, or None outside the vocabulary (never a special slot)."""
        if not name:
            return None
        i = self.vocab._index.get(E.norm_name(name))
        return None if i is None or i in self._specials else i

    @property
    def schema_id(self) -> str:
        h = hashlib.sha256()
        h.update(json.dumps({"kind": SCHEMA_KIND, "v": SCHEMA_VERSION, "names": self.names},
                            ensure_ascii=False).encode())
        return h.hexdigest()[:16]

    def to_json(self, _phases: list[str] | None = None) -> dict[str, Any]:
        blocks = []
        for b in self.blocks:
            bb = {k: v for k, v in b.items() if k != "features"}
            if b["name"] != "cards":
                bb["features"] = b["features"]
            blocks.append(bb)
        return {
            "schemaKind": SCHEMA_KIND,
            "schemaVersion": SCHEMA_VERSION,
            "schemaId": self.schema_id,
            "nFeatures": self.n,
            "perspective": "the viewer is 'me' (our logs: the recording's seat; 17Lands: its user unless "
                           "the row says persp=1, the opponent)",
            "vocab": {"sources": self.vocab.sources, "size": len(self.vocab), "basics": E.BASICS,
                      "specials": E.SPECIALS, "cards": self.vocab.cards},
            "cardStates": R17_STATES,
            "rows": f"one per end of half-turn, turn >= {self.min_turn}, never a game's final half-turn",
            "minTurn": self.min_turn,
            "missing": ["tapped state", "counters, damage, P/T", "graveyards, exile, libraries", "the stack, combat",
                        "the viewer's hand cards (a count only)", "decisions"],
            "label": {"label": "+1 viewer won, -1 viewer lost, 0 draw",
                      "turns_to_end": "game's last turn minus this row's turn",
                      "rows_to_end": "rows of this game after this one"},
            "blocks": blocks,
        }


def is_r17(names: Iterable[str]) -> bool:
    """A board-name list (evalnet.board_names) is r17's."""
    return "me.other_nonland" in set(names)


# ---------------------------------------------------------------- the one encoder

def is_basic(name: str | None, types: str | None = None) -> bool:
    if types and "Basic" in types.split(" - ")[0].split():
        return True
    return bool(name) and E.norm_name(name) in BASIC_KEYS


def vocab_share(pos: Position, schema: R17Schema) -> float:
    """The share of non-basic permanents on the battlefield (both sides) that are
    vocabulary cards; tokens and face-down permanents count as outside.  A board
    with no non-basic permanent is 1.0: everything on it is a basic, which the
    vocabulary holds."""
    tot = ours = 0
    for side in (pos.me, pos.opp):
        for p in side.permanents:
            if p.basic:
                continue
            tot += 1
            if not p.token and schema.vocab_slot(p.name) is not None:
                ours += 1
    return 1.0 if tot == 0 else ours / tot


def encode_position(pos: Position, schema: R17Schema) -> list[float]:
    v = [0.0] * schema.n
    ix = schema.index
    v[ix["turn"]] = pos.turn
    v[ix["round"]] = (pos.turn + 1) // 2
    v[ix["my_turn"]] = 1.0 if pos.my_turn else 0.0
    v[ix["on_play"]] = float(pos.on_play)
    for s, side in (("me", pos.me), ("opp", pos.opp)):
        v[ix[f"{s}.life"]] = side.life
        v[ix[f"{s}.hand"]] = side.hand
        for p in side.permanents:
            if p.land:
                v[ix[f"{s}.lands"]] += 1
            else:
                v[ix[f"{s}.nonland"]] += 1
                if p.creature:
                    v[ix[f"{s}.creatures"]] += 1
            slot = None if p.token else schema.vocab_slot(p.name)
            if slot is None:
                if not p.land:
                    v[ix[f"{s}.other_nonland"]] += 1
            else:
                v[schema.card_index(slot, f"{s}.battlefield")] += 1
    return v


# ---------------------------------------------------------------- our frame logs

def _permanent(c: dict[str, Any]) -> Permanent:
    """A battlefield card as the viewer sees it: a face-down card or a stub has no name."""
    if c.get("hidden"):          # a redacted stub: nothing about it is read (none sits on a battlefield today)
        return Permanent(None)
    types = c.get("types") or ""
    flags = E._type_flags(types)
    hidden = bool(c.get("faceDown"))
    name = None if hidden else (c.get("name") or None)
    return Permanent(name, flags["land"], flags["creature"], bool(c.get("token")),
                     (not hidden) and is_basic(name, types))


def state_position(st: dict[str, Any], seat: int, on_play: int) -> Position:
    """A `state` body -> the r17 position from `seat`'s side.  Reads life, the
    hand's COUNT and the battlefield by controller (as encode.py), nothing else."""
    players = st.get("players") or []
    opp_id = next((p.get("id") for p in players if p.get("id") != seat), None)
    side_of = {seat: "me", opp_id: "opp"}
    sides = {"me": Side(), "opp": Side()}
    for p in players:
        s = side_of.get(p.get("id"))
        if not s:
            continue
        z = p.get("zones") or {}
        sides[s].life = int(p.get("life") or 0)
        sides[s].hand = int((z.get("hand") or {}).get("count", 0) or 0)
    for p in players:
        s = side_of.get(p.get("id"))
        if not s:
            continue
        for c in ((p.get("zones") or {}).get("battlefield") or {}).get("cards", []):
            cs = side_of.get(c.get("controller"), s)
            sides[cs].permanents.append(_permanent(c))
    return Position(int(st.get("turn") or 0), st.get("activePlayer") == seat, on_play, sides["me"], sides["opp"])


def game_positions(game: E.Game, min_turn: int = MIN_TURN) -> list[tuple[int, int, Position]]:
    """(turn, frame seq, position) at the end of every half-turn of a game from
    `min_turn` on: the LAST state frame of each turn, never the game's final turn
    (it ended inside it, as 17Lands' last half-turn does) nor a state that is
    already over.  On the play is who was active in turn 1."""
    seat = game.seat
    last: dict[int, tuple[int, dict[str, Any]]] = {}
    first_active = None
    for f in game.frames:
        if f.get("type") != "state":
            continue
        st = f.get("body") or {}
        t = st.get("turn")
        if not isinstance(t, int) or t < 1:
            continue
        if t == 1 and first_active is None and st.get("activePlayer") is not None:
            first_active = st.get("activePlayer")
        if st.get("gameOver"):
            continue
        last[t] = (int(f.get("seq") or 0), st)
    if not last:
        return []
    final = max(last)
    on_play = 0 if first_active is None else (1 if first_active == seat else -1)
    out = []
    for t in sorted(last):
        if t >= final or t < min_turn:
            continue
        seq, st = last[t]
        out.append((t, seq, state_position(st, seat, on_play)))
    return out


def encode_game(game: E.Game, schema: R17Schema, min_turn: int | None = None) -> list[E.Row]:
    """A game's r17 rows (encode.Row, phase "EOT").  Empty when it has no outcome."""
    winner, last_turn, labelled = E.game_outcome(game)
    if not labelled:
        return []
    seat = game.seat
    label = 0 if winner is None else (1 if winner == seat else -1)
    rows = []
    for t, seq, pos in game_positions(game, schema.min_turn if min_turn is None else min_turn):
        rows.append(E.Row(game.game_key, game.split_group, os.path.basename(game.path),
                          str(game.header.get("gameId")), seq, t, "EOT", 1 if pos.my_turn else 0, label,
                          int((last_turn or t) - t), 0, encode_position(pos, schema)))
    for i, r in enumerate(rows):
        r.rows_to_end = len(rows) - 1 - i
    return rows


# ---------------------------------------------------------------- decks and the vocabulary

def deck_vocab_share(counts: dict[str, int], schema: R17Schema) -> float:
    """The share of a main deck's non-basic cards (copies) inside the vocabulary (1.0 for none)."""
    tot = ours = 0
    for n, k in counts.items():
        if is_basic(n):
            continue
        tot += int(k)
        if schema.vocab_slot(n) is not None:
            ours += int(k)
    return 1.0 if tot == 0 else ours / tot


# ---------------------------------------------------------------- the simple rules' inputs (numpy)

CORE_DIFFS = ["life", "hand", "lands", "nonland", "creatures", "other_nonland"]
CORE_PLAIN = ["turn", "my_turn", "on_play"]


def core_matrix(board, names):
    """The reduced core: six me-minus-opp differences, the turn, whose turn and the
    play/draw -- r17's analogue of baseline_eval.core_matrix, column by column."""
    import numpy as np
    out = np.empty((len(board), len(CORE_DIFFS) + len(CORE_PLAIN)))
    for j, f in enumerate(CORE_DIFFS):
        np.subtract(board[:, names.index(f"me.{f}")], board[:, names.index(f"opp.{f}")], out=out[:, j],
                    dtype=np.float64)
    for j, f in enumerate(CORE_PLAIN, len(CORE_DIFFS)):
        out[:, j] = board[:, names.index(f)]
    return out


def board_count_matrix(board, names):
    """The board-count rule: my non-land permanents minus theirs."""
    import numpy as np
    return np.subtract(board[:, names.index("me.nonland")], board[:, names.index("opp.nonland")],
                       dtype=np.float64)[:, None]
