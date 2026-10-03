# mtg-table — tools/ml tests: the encoder, its schema and hidden information.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""python3 -m unittest discover -s tools/ml/tests   (from the repo root)

Standard library only.  The fixture corpus is fixtures/games/*.jsonl -- AI-vs-AI
recordings and seat recordings -- plus any logs named in $ML_EXTRA_LOGS (a
directory, e.g. var/ml/games), which the hidden-information test sweeps too.
"""
from __future__ import annotations

import copy
import gzip
import json
import os
import random
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "ml"))
import encode as E  # noqa: E402

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "data", "mini-cube.md")
GOLDEN = os.path.join(HERE, "data", "schema-golden.json")


def corpus() -> list[str]:
    logs = E.find_logs([FIXTURES])
    extra = os.environ.get("ML_EXTRA_LOGS")
    if extra and os.path.isdir(extra):
        logs += E.find_logs([extra])
    return logs


def fixture_vocab() -> E.Vocab:
    """The fixture decks' cards plus the mini cube: a pool where most fixture
    cards have a slot of their own (so a leak would land in a slot)."""
    decks = sorted(os.path.join(ROOT, "decks", f) for f in os.listdir(os.path.join(ROOT, "decks"))
                   if f.endswith(".dck"))
    names: list[str] = []
    for d in decks:
        names += E.read_vocab_names(d)
    names += E.read_vocab_names(MINI_CUBE)
    return E.Vocab.from_names(names, ["decks/*.dck", "mini-cube.md"])


class VocabTest(unittest.TestCase):
    def test_cube_markdown(self):
        self.assertEqual(E.read_vocab_names(MINI_CUBE), [
            "Thraben Inspector", "Agent Phil Coulson", "Lightning Bolt", "Ashcloud Phoenix",
            "Reflector Mage", "Soulherder", "Grumgully, the Generous", "Hallowed Fountain",
            "Watery Grave", "Hengegate Pathway", "Clearwater Pathway"])

    def test_basics_first_specials_last_and_other(self):
        v = E.Vocab.from_files([MINI_CUBE])
        self.assertEqual(v.cards[:6], E.BASICS)
        self.assertEqual(v.cards[-3:], E.SPECIALS)
        self.assertEqual(v.slot("lightning bolt"), v.cards.index("Lightning Bolt"))
        self.assertEqual(v.slot("Black Lotus"), v.special(E.OTHER))
        self.assertEqual(v.slot("Fire // Ice"), v.special(E.OTHER))

    def test_dck_and_plain(self):
        self.assertIn("Island", E.parse_dck("[metadata]\nName=x\n[Main]\n4 Island|MSH|1\n1 Opt\n"))
        self.assertNotIn("x", E.parse_dck("[metadata]\nName=x\n[Main]\n4 Island\n"))
        self.assertEqual(E.parse_plain("# c\n4 Opt\nLightning Bolt\n1x Ponder\n"),
                         ["Opt", "Lightning Bolt", "Ponder"])

    def test_mana_value(self):
        for cost, mv in [(None, 0), ("{2}{W}{W}", 4), ("{X}{R}", 1), ("{W/U}{2/B}", 3), ("{G/P}", 1)]:
            self.assertEqual(E.mana_value(cost), mv, cost)


class SchemaTest(unittest.TestCase):
    def test_golden(self):
        """The layout for a fixed vocabulary does not move.  A deliberate change
        bumps SCHEMA_VERSION and rewrites the golden:
        ML_WRITE_GOLDEN=1 python3 -m unittest discover -s tools/ml/tests"""
        s = E.Schema(E.Vocab.from_files([MINI_CUBE]))
        got = {"schemaVersion": E.SCHEMA_VERSION, "schemaId": s.schema_id, "nFeatures": s.n,
               "blocks": [[b["name"], b["offset"], b["length"]] for b in s.blocks],
               "nonCardFeatures": s.names[:s.card_offset]}
        if os.environ.get("ML_WRITE_GOLDEN") == "1":
            with open(GOLDEN, "w", encoding="utf-8") as f:
                json.dump(got, f, indent=1)
                f.write("\n")
        with open(GOLDEN, encoding="utf-8") as f:
            self.assertEqual(got, json.load(f))

    def test_size_and_names(self):
        v = E.Vocab.from_files([MINI_CUBE])
        s = E.Schema(v)
        self.assertEqual(s.n, len(s.names))
        self.assertEqual(len(set(s.names)), s.n)
        self.assertEqual(s.n - s.card_offset, len(v) * len(E.CARD_STATES))
        self.assertEqual(s.names[s.card_index(v.slot("Lightning Bolt"), "opp.graveyard")],
                         "card[Lightning Bolt].opp.graveyard")
        j = s.to_json()
        self.assertEqual(j["nFeatures"], s.n)
        self.assertEqual(sum(b["length"] for b in j["blocks"]), s.n)
        # no opponent-hand card state exists at all
        self.assertFalse(any(".opp.hand" in n or n.startswith("types.opp.hand") for n in s.names))


class EncodeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocab = fixture_vocab()
        cls.schema = E.Schema(cls.vocab)
        # an extra log (ML_EXTRA_LOGS) may be a killed or timed-out game with no
        # outcome: it yields no rows by design, and is left to the hidden-
        # information sweep; every committed fixture is a finished game
        cls.games = [g for p in corpus() for g in E.read_games(p)
                     if p.startswith(FIXTURES) or E.game_outcome(g)[2]]
        cls.rows = [E.encode_game(g, cls.schema) for g in cls.games]

    def test_every_fixture_yields_rows(self):
        self.assertGreaterEqual(len(self.games), 22)
        for g, rows in zip(self.games, self.rows):
            self.assertTrue(rows, g.path)
            for r in rows:
                self.assertEqual(len(r.features), self.schema.n)

    def test_rows_are_decision_states_with_labels(self):
        for g, rows in zip(self.games, self.rows):
            winner, last_turn, labelled = E.game_outcome(g)
            self.assertTrue(labelled)
            want = 1 if winner == g.seat else (-1 if winner is not None else 0)
            by_seq = {f.get("seq"): f["body"] for f in g.frames if f.get("type") == "state"}
            for i, r in enumerate(rows):
                st = by_seq[r.seq]
                self.assertEqual(st["priority"], g.seat)
                self.assertIn(st["phase"], E.default_phases())
                self.assertIsNone(st["gameOver"])
                self.assertEqual(r.label, want)
                self.assertEqual(r.rows_to_end, len(rows) - 1 - i)
                self.assertEqual(r.turns_to_end, last_turn - r.turn)
                self.assertEqual(r.features[self.schema.index["my_priority"]], 1.0)
                if i:
                    self.assertNotEqual(r.features, rows[i - 1].features, "consecutive duplicate")

    def test_g1_reads_what_the_board_shows(self):
        g = next(g for g in self.games if os.path.basename(g.path) == "g1.jsonl")
        rows = E.encode_game(g, self.schema)
        st = next(f["body"] for f in g.frames if f.get("seq") == rows[-1].seq)
        me = next(p for p in st["players"] if p["id"] == g.seat)
        opp = next(p for p in st["players"] if p["id"] != g.seat)
        f = rows[-1].features
        ix = self.schema.index
        self.assertEqual(f[ix["me.life"]], me["life"])
        self.assertEqual(f[ix["opp.life"]], opp["life"])
        self.assertEqual(f[ix["opp.hand"]], opp["zones"]["hand"]["count"])
        self.assertEqual(f[ix["me.library"]], me["zones"]["library"]["count"])
        hand = me["zones"]["hand"]["cards"]
        self.assertEqual(f[ix["types.me.hand.count"]], len(hand))
        lands = [c for c in me["zones"]["battlefield"]["cards"] if "Land" in c["types"].split(" - ")[0]]
        self.assertEqual(f[ix["me.lands"]], len(lands))
        self.assertEqual(f[ix["me.lands_untapped"]], len([c for c in lands if not c["tapped"]]))
        start = self.schema.card_offset
        self.assertEqual(sum(f[start + s * len(E.CARD_STATES) + E.CARD_STATES.index("me.hand")]
                             for s in range(len(self.vocab))), len(hand))

    def test_land_drop_and_casts_follow_events(self):
        seen_drop = seen_cast = False
        for rows in self.rows:
            for r in rows:
                ix = self.schema.index
                if r.active and r.features[ix["me.land_drop_used"]]:
                    seen_drop = True
                if r.features[ix["me.spells_cast_turn"]] or r.features[ix["opp.spells_cast_turn"]]:
                    seen_cast = True
                # the turn counters are this turn's: a land drop only on its player's turn
                if not r.active:
                    self.assertEqual(r.features[ix["me.lands_played_turn"]], 0)
        self.assertTrue(seen_drop and seen_cast)

    def test_deterministic(self):
        for g, rows in list(zip(self.games, self.rows))[:6]:
            a = [r.features for r in rows]
            b = [r.features for r in E.encode_game(copy.deepcopy(g), E.Schema(fixture_vocab()))]
            self.assertEqual(a, b)

    def test_gzip_and_client_redelivery(self):
        src = os.path.join(FIXTURES, "human-auto-7.jsonl")
        d = tempfile.mkdtemp()
        try:
            gz = os.path.join(d, "x.jsonl.gz")
            with open(src, "rb") as f, gzip.open(gz, "wb") as o:
                shutil.copyfileobj(f, o)
            # a client log may re-deliver a frame verbatim (M10): read once
            with open(src, encoding="utf-8") as f:
                lines = f.read().splitlines()
            dup = os.path.join(d, "dup.jsonl")
            with open(dup, "w", encoding="utf-8") as o:
                o.write("\n".join(lines[:200] + lines[150:]) + "\n")
            want = [r.features for r in E.encode_game(next(E.read_games(src)), self.schema)]
            for p in (gz, dup):
                got = [r.features for r in E.encode_game(next(E.read_games(p)), self.schema)]
                self.assertEqual(got, want, p)
        finally:
            shutil.rmtree(d)

    def test_unfinished_game_is_unlabelled(self):
        g = copy.deepcopy(self.games[0])
        g.frames = [f for f in g.frames if f.get("type") != "over"
                    and not (f.get("type") == "state" and f["body"].get("gameOver"))]
        self.assertEqual(E.encode_game(g, self.schema), [])
        crash = copy.deepcopy(self.games[0])
        crash.frames = [f for f in crash.frames if not (f.get("type") == "state" and f["body"].get("gameOver"))]
        for f in crash.frames:
            if f.get("type") == "over":
                f["body"] = {"winner": None, "reason": None, "matchOver": True}
        self.assertEqual(E.encode_game(crash, self.schema), [])


# ------------------------------------------------------------ hidden information

def scramble_hidden(game: E.Game, rng: random.Random, names: list[str]) -> E.Game:
    """Rewrite everything the viewer may not see -- as if the log had leaked it.

    For every state: the opponent's hand stubs become full, named cards (a
    different random name each frame) and are shuffled, with fresh ids; both
    libraries get named cards in `cards`; every redacted stub anywhere gets a
    name; every face-down card gets an `alt`.  Counts stay as the log says --
    they are public."""
    g = copy.deepcopy(game)
    opp = None
    for f in g.frames:
        if f.get("type") != "state":
            continue
        st = f["body"]
        for p in st.get("players") or []:
            z = p.get("zones") or {}
            if p.get("id") != g.seat:
                opp = p.get("id")
                hand = z.get("hand") or {"count": 0, "cards": []}
                hand["cards"] = [_leaked(rng, names, "hand", p["id"]) for _ in range(hand.get("count", 0))]
                rng.shuffle(hand["cards"])
            lib = z.get("library") or {"count": 0, "cards": []}
            lib["cards"] = [_leaked(rng, names, "library", p["id"]) for _ in range(min(3, lib.get("count", 0)))]
            for zn, zz in z.items():
                for i, c in enumerate(zz.get("cards") or []):
                    if c.get("hidden"):
                        zz["cards"][i] = dict(_leaked(rng, names, zn, p["id"]), hidden=True)
                    if c.get("faceDown") and c.get("controller") != g.seat:
                        c["alt"] = {"name": rng.choice(names), "manaCost": "{1}", "types": "Creature - X",
                                    "power": "9", "toughness": "9"}
    assert opp is not None
    return g


def _leaked(rng: random.Random, names: list[str], zone: str, owner: int) -> dict:
    return {"id": rng.randrange(10_000, 99_999), "name": rng.choice(names), "setCode": "LEA",
            "manaCost": "{3}{U}", "types": rng.choice(["Creature - Wizard", "Instant", "Land - Island"]),
            "power": "3", "toughness": "3", "loyalty": None, "keywords": ["FLYING"], "damage": 0,
            "counters": {"+1/+1": 2}, "tapped": False, "sick": False, "attacking": False,
            "blocking": False, "faceDown": False, "token": False, "alt": None, "attachedToId": None,
            "attachmentIds": [], "controller": owner, "owner": owner, "zone": zone, "abilities": []}


class HiddenInformationTest(unittest.TestCase):
    """No identity of a card the viewer may not see reaches a feature."""

    @classmethod
    def setUpClass(cls):
        cls.vocab = fixture_vocab()
        cls.schema = E.Schema(cls.vocab)
        cls.names = [n for n in cls.vocab.cards if n not in E.SPECIALS]
        cls.games = [g for p in corpus() for g in E.read_games(p)]

    def test_scrambled_hidden_zones_change_nothing(self):
        rng = random.Random(305)
        for g in self.games:
            want = [r.features for r in E.encode_game(g, self.schema)]
            got = [r.features for r in E.encode_game(scramble_hidden(g, rng, self.names), self.schema)]
            self.assertEqual(len(got), len(want), g.path)
            for i, (a, b) in enumerate(zip(got, want)):
                if a != b:
                    k = next(j for j in range(len(a)) if a[j] != b[j])
                    self.fail(f"hidden information reached {self.schema.names[k]} "
                              f"({b[k]} -> {a[k]}) in row {i} of {os.path.basename(g.path)}")

    def test_negative_control_my_hand_does_change_features(self):
        """The scrambler's twin applied to the VIEWER's hand must change rows --
        otherwise the test above would pass for an encoder that reads no hands."""
        rng = random.Random(1)
        g = next(g for g in self.games if os.path.basename(g.path) == "g1.jsonl")
        mutant = copy.deepcopy(g)
        for f in mutant.frames:
            if f.get("type") == "state":
                for p in f["body"]["players"]:
                    if p["id"] == g.seat:
                        h = p["zones"]["hand"]
                        h["cards"] = [_leaked(rng, self.names, "hand", p["id"]) for _ in h["cards"]]
        a = [r.features for r in E.encode_game(g, self.schema)]
        b = [r.features for r in E.encode_game(mutant, self.schema)]
        self.assertNotEqual(a, b)

    def test_opponent_hand_names_never_slot(self):
        """A leaked opponent-hand name lands in no card slot, whatever it is."""
        g = next(g for g in self.games if os.path.basename(g.path) == "disjoint.jsonl")
        leaked = scramble_hidden(g, random.Random(7), ["Lightning Bolt"])
        bolt = self.vocab.slot("Lightning Bolt")
        for r in E.encode_game(leaked, self.schema):
            for st in E.CARD_STATES:  # neither deck of disjoint.jsonl holds a Bolt
                self.assertEqual(r.features[self.schema.card_index(bolt, st)], 0.0)


if __name__ == "__main__":
    unittest.main()
