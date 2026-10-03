#!/usr/bin/env python3
# mtg-table — tools/ml: frame logs -> fixed-size position rows for a closed card pool.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Encode frame logs into training rows for a position evaluator (D305).

Reads `frames.jsonl` / `.jsonl.gz` frame logs (docs/protocol.md §8) -- seat
recordings and AI-vs-AI recordings alike -- and emits one row per
decision-relevant state: a `state` frame in which the VIEWING seat (the
header's `seat`) holds priority in a main phase or a combat step, the game not
over, with identical consecutive rows of one game collapsed into one.

Every row carries a FIXED-SIZE feature vector, from the viewer's perspective
("me" is the log's seat, "opp" the other player), laid out by a Schema built
from a cube VOCABULARY -- the closed card pool the games are drafted from.  The
layout is written as `features.json` (Schema.to_json) beside any output.

Hidden information (CLAUDE.md hard rule 8; protocol.md §3.3, §8.3): the encoder
reads only what the log shows the viewer, and it is STRICTER than the log:

  * the opponent's hand is its `count` and nothing else -- never a card of it,
    even one the log carries face up (a reveal);
  * both libraries are their `count` alone (a Future-Sight top card is skipped);
  * a redacted stub (`hidden: true`) adds to its zone's count only;
  * a face-down card counts in the `<facedown>` slot, never by an `alt` name;
  * no string from the engine but a card's public `name`, `types` and
    `manaCost` is read -- not `stack[].text`, not `cast.text`.

tools/ml/tests/test_encode.py holds this with a scrambler: every hidden zone of
the opponent rewritten (stubs turned into named cards, ids and order shuffled)
must leave every feature of every row unchanged.

Labels: `label` is the eventual winner from the viewer's side (+1 won, -1 lost,
0 draw), from the game's `over` frame (or a `gameOver` state); a game with
neither, or an engine-crash `over` (winner and reason both null, amendment M46),
is not labelled and yields no rows.  `turns_to_end` is the game's last turn
minus this row's turn; `rows_to_end` counts this game's rows after this one.

Standard library only, so it runs anywhere python3 does; dataset.py and the
trainers add numpy.

    python3 tools/ml/encode.py --vocab CUBE.md LOG... [--out rows.jsonl]
        [--features-json features.json] [--phases main,combat]

CUBE.md is a cube design file (the `## The list` / `### Section (N)` format of
cubes/*.md), a Forge `.dck`, or a plain list (one name per line, `4 Name`
allowed).  Several --vocab files are merged in order.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Iterable, Iterator

SCHEMA_VERSION = 1

# ---------------------------------------------------------------- vocabulary

BASICS = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]
SPECIALS = ["<other>", "<token>", "<facedown>"]
OTHER, TOKEN, FACEDOWN = SPECIALS

_COLOUR_PAIR = re.compile(r"^[WUBRG]{2}$")


def norm_name(name: str) -> str:
    """The key a card name is matched by: accents folded, lower case, the
    front face of a `A // B` name, whitespace collapsed."""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.split(" // ")[0]
    return re.sub(r"\s+", " ", s).strip().lower()


def _split_item(item: str) -> str:
    """One `Name — TAGS` or `Name 0.19` item -> its name (the cube lab's
    splitItem, tools/cubelab/cube.ts on its branch, name half only)."""
    t = item.strip().rstrip(".")
    m = re.match(r"^(.*?)\s+—\s+(.*)$", t)
    name = m.group(1) if m else t
    return re.sub(r"\s+\d+(\.\d+)?$", "", name).strip()


def parse_cube_markdown(text: str) -> list[str]:
    """Card names from a cube design file, in listed order.

    The format is the one the cube lab reads: a `## The list…` heading opens the
    list, `### Section (N)` headings divide it, items are separated by ` · `,
    ` — ` starts an item's tags, a trailing number is a price, `WU:` is a gold
    pair prefix, and in a lands section `Label (TAGS): a, b, c` is a group line
    (`Pathways:` lists front faces by their first word)."""
    names: list[str] = []
    in_list = False
    section: str | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        h2 = re.match(r"^##\s+(?!#)(.*)$", line)
        if h2:
            in_list = bool(re.match(r"^the list", h2.group(1), re.I))
            section = None
            continue
        h3 = re.match(r"^###\s+(.+?)\s*\((\d+)\)\s*$", line)
        if h3 and in_list:
            section = h3.group(1)
            continue
        if not in_list or section is None or not line.strip():
            continue
        pair = re.match(r"^([WUBRG]{2}):\s*", line)
        body = line[pair.end():] if pair else line
        land_kind = None
        lm = re.match(r"^([A-Z][A-Za-z ]*?)(?:\s*\(([^)]*)\))?:\s*(.*)$", body)
        if not pair and re.search("land", section, re.I) and lm:
            land_kind = lm.group(1)
            body = lm.group(3)
        if " · " in body:
            items = body.split(" · ")
        elif land_kind:
            items = body.split(",")
        else:
            items = [body]
        for item in items:
            n = _split_item(item)
            if not n:
                continue
            if land_kind and re.match(r"^pathways?$", land_kind, re.I) and not n.endswith("Pathway"):
                n = f"{n} Pathway"
            names.append(n)
    return names


def parse_dck(text: str) -> list[str]:
    """Card names from a Forge `.dck` (every section but [metadata])."""
    names: list[str] = []
    sect = ""
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            sect = line[1:-1].lower()
            continue
        if sect == "metadata":
            continue
        m = re.match(r"^(\d+)\s+(.+)$", line)
        n = (m.group(2) if m else line).split("|")[0].strip()
        if n:
            names.append(n)
    return names


def parse_plain(text: str) -> list[str]:
    names = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^(\d+)x?\s+(.+)$", line)
        names.append((m.group(2) if m else line).split("|")[0].strip())
    return names


def read_vocab_names(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if path.endswith(".dck"):
        return parse_dck(text)
    if re.search(r"^##\s+the list", text, re.I | re.M):
        return parse_cube_markdown(text)
    return parse_plain(text)


@dataclass
class Vocab:
    """The closed card pool: the six basics, the cube's cards in listed order,
    then the three special slots (`<other>`, `<token>`, `<facedown>`)."""

    cards: list[str]
    sources: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._index: dict[str, int] = {}
        for i, n in enumerate(self.cards):
            self._index.setdefault(norm_name(n), i)

    @classmethod
    def from_names(cls, names: Iterable[str], sources: list[str] | None = None) -> "Vocab":
        seen: set[str] = set()
        cards: list[str] = []
        for n in list(BASICS) + list(names):
            k = norm_name(n)
            if not k or k in seen or n in SPECIALS:
                continue
            seen.add(k)
            cards.append(n)
        return cls(cards + list(SPECIALS), sources or [])

    @classmethod
    def from_files(cls, paths: list[str]) -> "Vocab":
        names: list[str] = []
        for p in paths:
            names.extend(read_vocab_names(p))
        return cls.from_names(names, [os.path.basename(p) for p in paths])

    def __len__(self) -> int:
        return len(self.cards)

    def slot(self, name: str) -> int:
        """A card name's slot; a name outside the pool is `<other>`."""
        i = self._index.get(norm_name(name))
        return self._index[norm_name(OTHER)] if i is None else i

    def special(self, s: str) -> int:
        return self._index[norm_name(s)]


# ---------------------------------------------------------------- the schema

PHASES = [
    None, "UNTAP", "UPKEEP", "DRAW", "MAIN1", "COMBAT_BEGIN",
    "COMBAT_DECLARE_ATTACKERS", "COMBAT_DECLARE_BLOCKERS",
    "COMBAT_FIRST_STRIKE_DAMAGE", "COMBAT_DAMAGE", "COMBAT_END", "MAIN2",
    "END_OF_TURN", "CLEANUP",
]
PHASE_GROUPS = {
    "main": ["MAIN1", "MAIN2"],
    "combat": ["COMBAT_BEGIN", "COMBAT_DECLARE_ATTACKERS", "COMBAT_DECLARE_BLOCKERS",
               "COMBAT_FIRST_STRIKE_DAMAGE", "COMBAT_DAMAGE", "COMBAT_END"],
    "beginning": ["UPKEEP", "DRAW"],
    "end": ["END_OF_TURN"],
}
COLOURS = ["W", "U", "B", "R", "G", "C"]
LAND_COLOUR = {"plains": "W", "island": "U", "swamp": "B", "mountain": "R", "forest": "G"}
KEYWORDS = ["FLYING", "REACH", "FIRST_STRIKE", "DOUBLE_STRIKE", "DEATHTOUCH", "LIFELINK",
            "TRAMPLE", "VIGILANCE", "MENACE", "HASTE", "HEXPROOF", "INDESTRUCTIBLE"]
TYPE_AGG = ["count", "mv_sum", "mv_max", "creature", "land", "instant", "sorcery",
            "artifact", "enchantment", "planeswalker"]
# The zones the type aggregates and the card slots read.  The opponent's hand
# and both libraries are absent on purpose: hidden, count only.
ZONE_GROUPS = ["me.hand", "me.battlefield", "me.graveyard", "me.exile", "me.stack",
               "opp.battlefield", "opp.graveyard", "opp.exile", "opp.stack"]
CARD_STATES = [
    "me.hand",
    "me.bf_untapped", "me.bf_tapped", "me.bf_sick", "me.bf_attacking", "me.bf_blocking",
    "me.graveyard", "me.exile", "me.stack",
    "opp.bf_untapped", "opp.bf_tapped", "opp.bf_sick", "opp.bf_attacking", "opp.bf_blocking",
    "opp.graveyard", "opp.exile", "opp.stack",
]
SIDE_GLOBAL = [
    ("life", "life total"), ("poison", "poison counters"),
    ("player_counters", "sum of the player's other counters (energy, experience, ...)"),
    ("hand", "cards in hand (count; the opponent's is the only thing read of it)"),
    ("library", "cards in library (count)"), ("graveyard", "cards in graveyard (count)"),
    ("exile", "cards in exile (count, stubs included)"), ("command", "cards in the command zone"),
    ("lands", "lands controlled"), ("lands_untapped", "untapped lands controlled"),
] + [(f"untapped_land_{c}", f"untapped lands with a basic land type giving {c}" if c != "C"
      else "untapped lands with no basic land type (colourless or unknown)") for c in COLOURS] + [
    (f"pool_{c}", f"floating mana {c}") for c in COLOURS] + [
    ("pool_total", "floating mana, all colours"),
    ("mana_available", "untapped lands + floating mana (mana creatures and rocks not counted)"),
    ("land_drop_used", "1 if this player played a land this turn"),
    ("lands_played_turn", "lands played this turn"),
    ("spells_cast_turn", "spells cast this turn (storm count, this player's share)"),
    ("abilities_turn", "activated/triggered abilities put on the stack this turn"),
    ("spells_cast_game", "spells cast this game"),
    ("lands_played_game", "lands played this game"),
    ("mulligans", "mulligans taken"),
]
SIDE_BOARD = [
    ("creatures", "creatures on the battlefield"), ("power", "total power"),
    ("toughness", "total toughness"), ("untapped_creatures", "untapped creatures"),
    ("untapped_power", "power of untapped creatures"), ("max_power", "largest power"),
    ("damage_marked", "damage marked on creatures"), ("p1p1", "+1/+1 counters on permanents"),
    ("m1m1", "-1/-1 counters on permanents"), ("other_counters", "every other counter on permanents"),
    ("planeswalkers", "planeswalkers"), ("loyalty", "total loyalty"),
    ("artifacts", "artifacts"), ("enchantments", "enchantments"),
    ("tokens", "tokens"), ("token_power", "total power of creature tokens"),
    ("attached", "permanents attached to another (auras, equipment)"),
    ("facedown", "face-down permanents"),
] + [(f"kw_{k.lower()}", f"creatures with {k}") for k in KEYWORDS]


class Schema:
    """The fixed layout of a row's feature vector, for one vocabulary."""

    def __init__(self, vocab: Vocab):
        self.vocab = vocab
        self.blocks: list[dict[str, Any]] = []
        self.names: list[str] = []

        def block(name: str, desc: str, entries: list[tuple[str, str]]) -> None:
            self.blocks.append({"name": name, "offset": len(self.names), "length": len(entries),
                                "description": desc,
                                "features": [{"name": n, "meaning": m} for n, m in entries]})
            self.names.extend(n for n, _ in entries)

        g = [("turn", "player-turn number (protocol §3.1)"), ("round", "ceil(turn/2)"),
             ("my_turn", "1 if the viewer is the active player"),
             ("my_priority", "1 if the viewer holds priority (always 1 on a decision row)")]
        g += [(f"phase.{p or 'none'}", f"phase one-hot: {p}") for p in PHASES]
        g += [("stack.size", "items on the stack"), ("stack.me", "the viewer's items"),
              ("stack.opp", "the opponent's items"), ("stack.abilities", "items that are abilities")]
        g += [("combat.active", "1 while state.combat is non-null"),
              ("combat.me_attackers", "the viewer's attacking creatures"),
              ("combat.opp_attackers", "the opponent's attacking creatures"),
              ("combat.me_attack_power", "power the viewer is attacking with"),
              ("combat.opp_attack_power", "power the opponent is attacking with"),
              ("combat.me_unblocked_power", "the viewer's power in bands with no blocker"),
              ("combat.opp_unblocked_power", "the opponent's power in bands with no blocker"),
              ("combat.me_blockers", "the viewer's blocking creatures"),
              ("combat.opp_blockers", "the opponent's blocking creatures")]
        block("global", "turn, phase, stack and combat", g)
        for side in ("me", "opp"):
            block(f"{side}.player", f"{side}: life, zone counts, mana, this turn's land drop and casts",
                  [(f"{side}.{n}", m) for n, m in SIDE_GLOBAL])
        for side in ("me", "opp"):
            block(f"{side}.board", f"{side}: battlefield aggregates (P/T, counters, types, keywords)",
                  [(f"{side}.board.{n}", m) for n, m in SIDE_BOARD])
        block("types", "per zone group: card count, mana value sum and max, and type counts over every "
              "card whose face the viewer sees (faces only; stubs count in the player block)",
              [(f"types.{z}.{a}", f"{a} over {z}") for z in ZONE_GROUPS for a in TYPE_AGG])
        cards = []
        for i, c in enumerate(vocab.cards):
            for st in CARD_STATES:
                cards.append((f"card[{c}].{st}", ""))
        self.card_offset = len(self.names)
        block("cards", "per vocabulary slot x card state: how many copies are there. Battlefield states "
              "are by controller: bf_untapped and bf_tapped partition the battlefield, bf_sick, "
              "bf_attacking and bf_blocking are flags on top. Slot order: vocab.cards. Index of "
              "(slot s, state k) = offset + s*len(card_states) + k", cards)
        self.index = {n: i for i, n in enumerate(self.names)}
        self.n = len(self.names)

    def card_index(self, slot: int, state: str) -> int:
        return self.card_offset + slot * len(CARD_STATES) + CARD_STATES.index(state)

    @property
    def schema_id(self) -> str:
        h = hashlib.sha256()
        h.update(json.dumps({"v": SCHEMA_VERSION, "names": self.names}, ensure_ascii=False).encode())
        return h.hexdigest()[:16]

    def to_json(self, decision_phases: list[str] | None = None) -> dict[str, Any]:
        blocks = []
        for b in self.blocks:
            bb = {k: v for k, v in b.items() if k != "features"}
            if b["name"] != "cards":
                bb["features"] = b["features"]
            blocks.append(bb)
        return {
            "schemaVersion": SCHEMA_VERSION,
            "schemaId": self.schema_id,
            "nFeatures": self.n,
            "perspective": "the log's viewing seat is 'me'; the other player is 'opp'",
            "vocab": {"sources": self.vocab.sources, "size": len(self.vocab),
                      "basics": BASICS, "specials": SPECIALS, "cards": self.vocab.cards},
            "cardStates": CARD_STATES,
            "zoneGroups": ZONE_GROUPS,
            "keywords": KEYWORDS,
            "decisionPhases": decision_phases or default_phases(),
            "hidden": ["opp.hand: count only", "both libraries: count only",
                       "stubs: zone count only", "face-down: <facedown> slot, never alt"],
            "label": {"label": "+1 viewer won, -1 viewer lost, 0 draw",
                      "turns_to_end": "game's last turn minus this row's turn",
                      "rows_to_end": "decision rows of this game after this one"},
            "blocks": blocks,
        }


def default_phases() -> list[str]:
    return PHASE_GROUPS["main"] + PHASE_GROUPS["combat"]


def parse_phases(spec: str) -> list[str]:
    out: list[str] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        out.extend(PHASE_GROUPS.get(part, [part.upper()]))
    return out


# ---------------------------------------------------------------- reading logs

@dataclass
class Game:
    path: str
    header: dict[str, Any]
    frames: list[dict[str, Any]]
    index: int = 0  # the game's position in its file (a file normally holds one)

    @property
    def seat(self) -> int:
        return int(self.header.get("seat", 0))

    @property
    def game_key(self) -> str:
        """Unique per recorded game: file, game id, start time, seat."""
        h = self.header
        raw = f"{os.path.basename(self.path)}|{self.index}|{h.get('gameId')}|{h.get('startedAt')}|{h.get('seat')}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    @property
    def hello(self) -> dict[str, Any] | None:
        for f in self.frames:
            if f.get("type") == "hello_ok":
                return f.get("body")
        return None

    def match_key(self) -> str:
        """The deck pair, by name, whichever chair recorded it ('' if the
        log does not name both decks: hello_ok.match is optional)."""
        m = (self.hello or {}).get("match") or {}
        names = sorted(str((m.get(k) or {}).get("name")) for k in ("yourDeck", "aiDeck") if m.get(k))
        return "|".join(names) if len(names) == 2 else ""

    @property
    def split_group(self) -> str:
        """Games that may share no split.  One seed is one game (protocol
        §8.7), so the two chairs of one seed+match are one group; a game with
        no seed is its own group."""
        h = self.header
        if h.get("seed") is None:
            return "game:" + self.game_key
        m = (self.hello or {}).get("match") or {}
        # by deck NAME only: the viewer's own deck also carries its path, so
        # the two chairs of one game spell the match differently otherwise
        decks = sorted(str((m.get(k) or {}).get("name")) for k in ("yourDeck", "aiDeck") if m.get(k))
        players = sorted(p.get("name", "") for p in (self.hello or {}).get("players", []))
        raw = f"seed:{h.get('seed')}|{'|'.join(decks)}|{'|'.join(players)}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _open(path: str):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, encoding="utf-8")


def read_games(path: str) -> Iterator[Game]:
    """Every game in a frame log.  Line 0 is the session header (§8.1); a file
    holding several headers is several games.  A verbatim re-delivery of an s2c
    frame in a client's log (amendment M10) is read once."""
    header: dict[str, Any] | None = None
    frames: list[dict[str, Any]] = []
    seen: set[int] = set()
    idx = 0
    with _open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue  # a torn last line of a killed recorder
            if obj.get("kind") == "session":
                if header is not None:
                    yield Game(path, header, frames, idx)
                    idx += 1
                header, frames, seen = obj, [], set()
                continue
            if header is None or obj.get("dir", "s2c") != "s2c":
                continue
            seq = obj.get("seq")
            if isinstance(seq, int):
                if seq in seen:
                    continue
                seen.add(seq)
            frames.append(obj)
    if header is not None:
        yield Game(path, header, frames, idx)


def game_outcome(game: Game) -> tuple[int | None, int | None, bool]:
    """(winner id or None, last turn, labelled?)."""
    winner: Any = None
    labelled = False
    last_turn = None
    for f in game.frames:
        b = f.get("body") or {}
        if f.get("type") == "state":
            if isinstance(b.get("turn"), int):
                last_turn = b["turn"] if last_turn is None else max(last_turn, b["turn"])
            go = b.get("gameOver")
            if go:
                if go.get("winner") is not None or go.get("reason") is not None:
                    winner, labelled = go.get("winner"), True
        elif f.get("type") == "over":
            if b.get("winner") is not None or b.get("reason") is not None:
                winner, labelled = b.get("winner"), True
            else:
                labelled = False  # M46: an engine crash -- the game never finished
    return winner, last_turn, labelled


# ---------------------------------------------------------------- per-state facts

def mana_value(cost: str | None) -> int:
    if not cost:
        return 0
    mv = 0
    for sym in re.findall(r"\{([^}]*)\}", cost):
        s = sym.upper()
        if s.isdigit():
            mv += int(s)
        elif s in ("X", "Y", "Z"):
            continue
        elif "/" in s:
            a = s.split("/")[0]
            mv += int(a) if a.isdigit() else 1
        else:
            mv += 1
    return mv


def _num(v: Any) -> float:
    if v is None:
        return 0.0
    try:
        return float(int(str(v)))
    except ValueError:
        m = re.match(r"^-?\d+", str(v))
        return float(m.group(0)) if m else 0.0


def _type_flags(types: str) -> dict[str, bool]:
    head = types.split(" - ")[0]
    words = set(head.split())
    return {"creature": "Creature" in words, "land": "Land" in words, "instant": "Instant" in words,
            "sorcery": "Sorcery" in words, "artifact": "Artifact" in words,
            "enchantment": "Enchantment" in words, "planeswalker": "Planeswalker" in words}


def _land_colours(types: str) -> list[str]:
    sub = types.split(" - ", 1)[1].lower().split() if " - " in types else []
    cs = [LAND_COLOUR[s] for s in sub if s in LAND_COLOUR]
    return cs or ["C"]


@dataclass
class TurnTally:
    """Event-derived counters: what each player did this turn and this game."""

    lands_turn: dict[int, int] = field(default_factory=dict)
    spells_turn: dict[int, int] = field(default_factory=dict)
    abilities_turn: dict[int, int] = field(default_factory=dict)
    lands_game: dict[int, int] = field(default_factory=dict)
    spells_game: dict[int, int] = field(default_factory=dict)
    mulligans: dict[int, int] = field(default_factory=dict)

    def apply(self, events: list[dict[str, Any]]) -> None:
        to_stack = {e.get("cardId") for e in events
                    if e.get("kind") == "zone" and (e.get("to") or {}).get("zone") == "stack"}
        for e in events:
            k = e.get("kind")
            if k == "turn":
                self.lands_turn, self.spells_turn, self.abilities_turn = {}, {}, {}
            elif k == "land":
                p = e.get("player")
                self.lands_turn[p] = self.lands_turn.get(p, 0) + 1
                self.lands_game[p] = self.lands_game.get(p, 0) + 1
            elif k == "cast":
                p = e.get("controller")
                if e.get("cardId") in to_stack:
                    self.spells_turn[p] = self.spells_turn.get(p, 0) + 1
                    self.spells_game[p] = self.spells_game.get(p, 0) + 1
                else:
                    self.abilities_turn[p] = self.abilities_turn.get(p, 0) + 1
            elif k == "mulligan":
                p = e.get("player")
                self.mulligans[p] = self.mulligans.get(p, 0) + 1


def _player(state: dict[str, Any], pid: int | None) -> dict[str, Any] | None:
    for p in state.get("players") or []:
        if p.get("id") == pid:
            return p
    return None


def _visible(c: dict[str, Any]) -> bool:
    return not c.get("hidden")


def encode_state(state: dict[str, Any], seat: int, schema: Schema, tally: TurnTally) -> list[float]:
    """One state -> its feature vector, from `seat`'s side."""
    v = [0.0] * schema.n
    ix = schema.index
    vocab = schema.vocab
    players = state.get("players") or []
    opp_id = next((p.get("id") for p in players if p.get("id") != seat), None)
    side_of = {seat: "me", opp_id: "opp"}

    def add(name: str, x: float) -> None:
        v[ix[name]] += x

    def put(name: str, x: float) -> None:
        v[ix[name]] = x

    turn = state.get("turn") or 0
    put("turn", turn)
    put("round", state.get("round") or 0)
    put("my_turn", 1.0 if state.get("activePlayer") == seat else 0.0)
    put("my_priority", 1.0 if state.get("priority") == seat else 0.0)
    ph = state.get("phase")
    put(f"phase.{ph if ph in PHASES else 'none'}", 1.0)

    # every card on the battlefield, by id, for combat and attachments
    by_id: dict[int, dict[str, Any]] = {}
    for p in players:
        for c in (p.get("zones") or {}).get("battlefield", {}).get("cards", []):
            if _visible(c):
                by_id[c["id"]] = c

    for item in state.get("stack") or []:
        add("stack.size", 1)
        s = side_of.get(item.get("controller"))
        if s:
            add(f"stack.{s}", 1)
        if item.get("isAbility"):
            add("stack.abilities", 1)

    combat = state.get("combat")
    if combat is not None:
        put("combat.active", 1.0)
        for band in combat.get("bands") or []:
            blocked = bool(band.get("blockerIds"))
            for aid in band.get("attackerIds") or []:
                a = by_id.get(aid)
                if not a:
                    continue
                s = side_of.get(a.get("controller"))
                if not s:
                    continue
                add(f"combat.{s}_attackers", 1)
                add(f"combat.{s}_attack_power", _num(a.get("power")))
                if not blocked:
                    add(f"combat.{s}_unblocked_power", _num(a.get("power")))
            for bid in band.get("blockerIds") or []:
                b = by_id.get(bid)
                s = side_of.get(b.get("controller")) if b else None
                if s:
                    add(f"combat.{s}_blockers", 1)

    for p in players:
        s = side_of.get(p.get("id"))
        if not s:
            continue
        pid = p.get("id")
        z = p.get("zones") or {}
        put(f"{s}.life", p.get("life") or 0)
        put(f"{s}.poison", p.get("poison") or 0)
        put(f"{s}.player_counters", sum((p.get("counters") or {}).values()))
        for zn in ("hand", "library", "graveyard", "exile", "command"):
            put(f"{s}.{zn}", (z.get(zn) or {}).get("count", 0))
        pool = p.get("manaPool") or {}
        for c in COLOURS:
            put(f"{s}.pool_{c}", pool.get(c, 0))
        put(f"{s}.pool_total", sum(pool.get(c, 0) for c in COLOURS))
        put(f"{s}.lands_played_turn", tally.lands_turn.get(pid, 0))
        put(f"{s}.land_drop_used", 1.0 if tally.lands_turn.get(pid, 0) > 0 else 0.0)
        put(f"{s}.spells_cast_turn", tally.spells_turn.get(pid, 0))
        put(f"{s}.abilities_turn", tally.abilities_turn.get(pid, 0))
        put(f"{s}.spells_cast_game", tally.spells_game.get(pid, 0))
        put(f"{s}.lands_played_game", tally.lands_game.get(pid, 0))
        put(f"{s}.mulligans", tally.mulligans.get(pid, 0))

    # cards: battlefield by controller; hand/graveyard/exile by the zone's player;
    # the stack by its card's controller.  The opponent's hand and both libraries
    # are never walked (hidden: count only).
    def card_slot(c: dict[str, Any]) -> int:
        if c.get("faceDown"):
            return vocab.special(FACEDOWN)
        if c.get("token"):
            return vocab.special(TOKEN)
        return vocab.slot(c.get("name") or "")

    def type_agg(group: str, c: dict[str, Any]) -> None:
        add(f"types.{group}.count", 1)
        mv = mana_value(c.get("manaCost"))
        add(f"types.{group}.mv_sum", mv)
        k = ix[f"types.{group}.mv_max"]
        v[k] = max(v[k], mv)
        for t, on in _type_flags(c.get("types") or "").items():
            if on:
                add(f"types.{group}.{t}", 1)

    def card_state(c: dict[str, Any], st: str) -> None:
        v[schema.card_index(card_slot(c), st)] += 1

    for p in players:
        s = side_of.get(p.get("id"))
        if not s:
            continue
        z = p.get("zones") or {}
        zones = ["graveyard", "exile"] + (["hand"] if s == "me" else [])
        for zn in zones:
            for c in (z.get(zn) or {}).get("cards", []):
                if not _visible(c):
                    continue
                type_agg(f"{s}.{zn}", c)
                card_state(c, f"{s}.{zn}")
        for c in (z.get("battlefield") or {}).get("cards", []):
            if not _visible(c):
                continue
            cs = side_of.get(c.get("controller"), s)
            type_agg(f"{cs}.battlefield", c)
            card_state(c, f"{cs}.bf_tapped" if c.get("tapped") else f"{cs}.bf_untapped")
            for flag in ("sick", "attacking", "blocking"):
                if c.get(flag):
                    card_state(c, f"{cs}.bf_{flag}")
            _board(add, v, ix, cs, c)

    for c in state.get("stackCards") or []:
        if not _visible(c):
            continue
        cs = side_of.get(c.get("controller"))
        if not cs:
            continue
        type_agg(f"{cs}.stack", c)
        card_state(c, f"{cs}.stack")

    for s in ("me", "opp"):
        put(f"{s}.mana_available", v[ix[f"{s}.lands_untapped"]] + v[ix[f"{s}.pool_total"]])
    return v


def _board(add, v, ix, s: str, c: dict[str, Any]) -> None:
    flags = _type_flags(c.get("types") or "")
    if c.get("faceDown"):
        add(f"{s}.board.facedown", 1)
    if flags["land"]:
        add(f"{s}.lands", 1)
        if not c.get("tapped"):
            add(f"{s}.lands_untapped", 1)
            for col in _land_colours(c.get("types") or ""):
                add(f"{s}.untapped_land_{col}", 1)
    if flags["creature"]:
        pw, tg = _num(c.get("power")), _num(c.get("toughness"))
        add(f"{s}.board.creatures", 1)
        add(f"{s}.board.power", pw)
        add(f"{s}.board.toughness", tg)
        k = ix[f"{s}.board.max_power"]
        v[k] = max(v[k], pw)
        add(f"{s}.board.damage_marked", c.get("damage") or 0)
        if not c.get("tapped"):
            add(f"{s}.board.untapped_creatures", 1)
            add(f"{s}.board.untapped_power", pw)
        kws = set(c.get("keywords") or [])
        for kw in KEYWORDS:
            if kw in kws:
                add(f"{s}.board.kw_{kw.lower()}", 1)
        if c.get("token"):
            add(f"{s}.board.token_power", pw)
    if flags["planeswalker"]:
        add(f"{s}.board.planeswalkers", 1)
        add(f"{s}.board.loyalty", _num(c.get("loyalty")))
    if flags["artifact"]:
        add(f"{s}.board.artifacts", 1)
    if flags["enchantment"]:
        add(f"{s}.board.enchantments", 1)
    if c.get("token"):
        add(f"{s}.board.tokens", 1)
    if c.get("attachedToId") is not None:
        add(f"{s}.board.attached", 1)
    for name, n in (c.get("counters") or {}).items():
        if name == "+1/+1":
            add(f"{s}.board.p1p1", n)
        elif name == "-1/-1":
            add(f"{s}.board.m1m1", n)
        else:
            add(f"{s}.board.other_counters", n)


# ---------------------------------------------------------------- rows

@dataclass
class Row:
    game_key: str
    split_group: str
    file: str
    game_id: str
    seq: int
    turn: int
    phase: str
    active: int  # 1 if the viewer is the active player
    label: int
    turns_to_end: int
    rows_to_end: int
    features: list[float]

    def meta(self) -> dict[str, Any]:
        d = dict(self.__dict__)
        d.pop("features")
        return d


def encode_game(game: Game, schema: Schema, phases: list[str] | None = None) -> list[Row]:
    """A game's decision rows.  Empty when the game has no outcome."""
    winner, last_turn, labelled = game_outcome(game)
    if not labelled:
        return []
    seat = game.seat
    label = 0 if winner is None else (1 if winner == seat else -1)
    want = set(phases or default_phases())
    tally = TurnTally()
    rows: list[Row] = []
    prev: list[float] | None = None
    for f in game.frames:
        if f.get("type") != "state":
            continue
        st = f.get("body") or {}
        tally.apply(st.get("events") or [])
        if st.get("gameOver") or st.get("priority") != seat or st.get("phase") not in want:
            continue
        vec = encode_state(st, seat, schema, tally)
        if prev is not None and vec == prev:
            continue  # an identical consecutive decision state
        prev = vec
        rows.append(Row(game.game_key, game.split_group, os.path.basename(game.path),
                        str(st.get("gameId") or game.header.get("gameId")), int(f.get("seq") or 0),
                        int(st.get("turn") or 0), str(st.get("phase")),
                        1 if st.get("activePlayer") == seat else 0, label,
                        int((last_turn or 0) - (st.get("turn") or 0)), 0, vec))
    for i, r in enumerate(rows):
        r.rows_to_end = len(rows) - 1 - i
    return rows


def find_logs(paths: list[str]) -> list[str]:
    """Files named, and every *.jsonl / *.jsonl.gz under a directory named, sorted."""
    out: list[str] = []
    for p in paths:
        if os.path.isdir(p):
            for root, _dirs, files in os.walk(p):
                for fn in files:
                    if fn.endswith(".jsonl") or fn.endswith(".jsonl.gz"):
                        out.append(os.path.join(root, fn))
        else:
            out.append(p)
    return sorted(set(out))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("logs", nargs="+", help="frame logs or directories of them")
    ap.add_argument("--vocab", action="append", required=True, help="cube .md, .dck or plain list")
    ap.add_argument("--out", help="rows as JSONL (default: stdout)")
    ap.add_argument("--features-json", help="write the schema here")
    ap.add_argument("--phases", default="main,combat",
                    help="decision phases: groups main,combat,beginning,end or Forge names")
    a = ap.parse_args(argv)
    vocab = Vocab.from_files(a.vocab)
    schema = Schema(vocab)
    phases = parse_phases(a.phases)
    if a.features_json:
        with open(a.features_json, "w", encoding="utf-8") as f:
            json.dump(schema.to_json(phases), f, indent=1, ensure_ascii=False)
            f.write("\n")
    out = open(a.out, "w", encoding="utf-8") if a.out else sys.stdout
    n_rows = n_games = 0
    try:
        for path in find_logs(a.logs):
            for g in read_games(path):
                rows = encode_game(g, schema, phases)
                n_games += 1 if rows else 0
                for r in rows:
                    d = r.meta()
                    d["features"] = r.features
                    out.write(json.dumps(d, separators=(",", ":")) + "\n")
                    n_rows += 1
    finally:
        if a.out:
            out.close()
    print(f"encode: {n_rows} row(s) from {n_games} game(s), {schema.n} features, schema {schema.schema_id}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
