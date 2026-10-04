#!/usr/bin/env python3
# mtg-table — tools/ml: why the evaluator says what it says -- exact attributions for one position (D368).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Attributions of the learned evaluator's win chance to the features of ONE
position, grouped into buckets a player reads ("your board", "their life",
"your Glorybringer").  Served by eval_serve.py's `explain` (the coach helper's
POST /eval with "explain": true, D368); numpy only.

THE METHOD: integrated gradients (Sundararajan, Taly and Yan, 2017), computed
EXACTLY, in logit space, against one fixed baseline position.

    attr_i = (v_i - v0_i) * integral over a in [0, 1] of  d logit / d v_i  at v0 + a (v - v0)

* Logit space: the network's output before its sigmoid, where it is a sum of
  terms.  Completeness -- sum_i attr_i = logit(v) - logit(v0) -- holds there
  exactly (tests/test_attribution.py checks it on every committed decision row
  to 1e-9).
* Exact, not a Riemann sum: the network is ReLU layers and a linear output, so
  along the straight path it is piecewise linear in a.  The path is walked
  segment by segment -- inside a segment no unit changes sign, the gradient is
  constant, and the next segment starts where the first unit crosses zero -- and
  each segment's gradient is weighted by its length.  The integral is then a
  finite sum, not an approximation.
* In the RAW features: the network's input is an affine map of the D305
  vector (board columns standardised; the card block pooled through the card
  embedding, linear in the counts), so the straight path in raw features is the
  straight path in the network's input, and each raw feature's share is the
  chain rule through that map: a board column gets dx_j * g_j, a card cell
  (slot c, state s) gets count * (g_pooled[s] . E[c]).
* THE BASELINE: the training split's mean board (every board column at its
  training mean: standardised to 0) and no named card (an empty card block:
  pooled to 0).  "Compared with an average decision position of the training
  games, with no card known by name."  It is a property of the model, the same
  for every request; its P(win) is reported as `baseline`.
* Points: the logit shares are turned into points of win chance by one factor,
  (p - p0) / (logit - logit0) (sigma'(logit) when the two are within 1e-9), so the
  points keep the logit shares' signs and proportions and sum to 100 (p - p0).
  An ensemble's attribution is the members' mean, member by member against its
  own baseline: it sums to the ensemble's 100 (mean p - mean p0).

HIDDEN INFORMATION.  An attribution is a function of the encoded vector only,
and that vector is encode.py's: the opponent's hand and both libraries are
counts, a stub is a count, a face-down card is `<facedown>`.  A card cell that
is 0 in the vector has a share of exactly 0 (its v - v0 is 0), and a card bucket
is only reported when its card is in the vector, so a bucket can only ever name a
card the viewer sees.  tests/test_attribution.py scrambles every hidden zone and
requires the same answer, and requires every named card to be one the viewer's
state shows face up.
"""
from __future__ import annotations

import re
from typing import Any

import numpy as np

METHOD = "integrated-gradients-exact"
BASELINE = "the training games' mean board, no card known by name"
MAX_SEGMENTS = 100_000


class AttributionUnavailable(ValueError):
    """A model whose export this module does not know how to differentiate."""


class Mlp:
    """The export's network (evalnet.py, formatVersion 1), read from its JSON:
    standardised board columns + the card embedding pooled per state, ReLU
    layers, a sigmoid output.  Read here rather than through evalnet.EvalNet so
    a change of the training code cannot silently change these maths; the tests
    hold its logit equal to EvalNet's."""

    def __init__(self, m: dict[str, Any], card_offset: int, n_states: int):
        if m.get("format") != "mtgtable-position-eval" or m.get("formatVersion") != 1:
            raise AttributionUnavailable("attributions know formatVersion 1 of mtgtable-position-eval only")
        layers = m.get("layers") or []
        if not layers or layers[-1].get("activation") != "sigmoid" or layers[-1].get("out") != 1 \
                or any(L.get("activation") != "relu" for L in layers[:-1]):
            raise AttributionUnavailable("attributions need ReLU hidden layers and one sigmoid output")
        inp = m["input"]
        self.cols = np.asarray(inp["boardColumns"], np.int64)
        self.mean = np.asarray(inp["mean"], np.float64)
        self.sd = np.asarray(inp["sd"], np.float64)
        self.dim = int(inp["cardDim"])
        self.E = np.asarray(inp["cardEmbedding"], np.float64).reshape(len(m["vocab"]), self.dim)
        self.W = [np.asarray(L["W"], np.float64).reshape(L["out"], L["in"]).T for L in layers]
        self.b = [np.asarray(L["b"], np.float64) for L in layers]
        self.card_offset = card_offset
        self.S = n_states
        self.nb = len(self.cols)
        if self.W[0].shape[0] != self.nb + self.S * self.dim:
            raise AttributionUnavailable("the first layer's width is not board columns + states x card dim")
        self.x0 = np.zeros(self.nb + self.S * self.dim)
        self.z0 = self.logit(self.x0)

    # -- the network's input, from a raw D305 vector
    def inputs(self, vec) -> np.ndarray:
        v = np.asarray(vec, np.float64)
        xb = (v[self.cols] - self.mean) / self.sd
        counts = v[self.card_offset:].reshape(-1, self.S)          # (slots, states)
        pooled = counts.T @ self.E                                  # (states, dim)
        return np.concatenate([xb, pooled.reshape(-1)])

    def logit(self, x) -> float:
        h = np.asarray(x, np.float64)
        for i in range(len(self.W) - 1):
            h = np.maximum(h @ self.W[i] + self.b[i], 0.0)
        return float((h @ self.W[-1] + self.b[-1])[0])

    # -- exact integrated gradients in the network's input space
    def path_gradient(self, x) -> tuple[np.ndarray, int]:
        """The integral of d logit / dx along x0 -> x (a vector the size of x),
        exact for this piecewise-linear network, and the number of segments."""
        x = np.asarray(x, np.float64)
        dx = x - self.x0
        total = np.zeros_like(x)
        a = 0.0
        segs = 0
        while a < 1.0:
            segs += 1
            if segs > MAX_SEGMENTS:
                raise AttributionUnavailable("the path crossed too many ReLU boundaries")
            h, dh = self.x0 + a * dx, dx
            masks = []
            t_next = 1.0 - a
            for i in range(len(self.W) - 1):
                pre, dpre = h @ self.W[i] + self.b[i], dh @ self.W[i]
                # a unit is on for the segment ahead when it is above 0, or at 0 and rising
                on = (pre > 0) | ((pre == 0) & (dpre > 0))
                cross = (pre * dpre < 0)
                if cross.any():
                    t_next = min(t_next, float((-pre[cross] / dpre[cross]).min()))
                masks.append(on)
                h, dh = pre * on, dpre * on
            g = self.W[-1][:, 0]
            for i in range(len(self.W) - 2, -1, -1):
                g = (g * masks[i]) @ self.W[i].T
            step = max(t_next, 0.0)
            if step == 0.0:   # exactly on a boundary: the masks above already face forward
                step = min(1e-15, 1.0 - a)
            total += step * g
            a += step
        return total, segs

    def attribute(self, vec) -> dict[str, Any]:
        """Each raw feature's share of logit(vec) - logit(baseline): `board`
        (index -> share) over the model's board columns, `cards` ((slot, state)
        -> share) over the card cells that are not 0."""
        v = np.asarray(vec, np.float64)
        x = self.inputs(v)
        G, segs = self.path_gradient(x)
        dx = x - self.x0
        board = dx[:self.nb] * G[:self.nb]
        gp = G[self.nb:].reshape(self.S, self.dim)                  # d/d pooled[state]
        counts = v[self.card_offset:].reshape(-1, self.S)
        slots, states = np.nonzero(counts)
        cards = counts[slots, states] * np.einsum("nd,nd->n", self.E[slots], gp[states])
        z = self.logit(x)
        return {"z": z, "z0": self.z0, "segments": segs,
                "board": {int(c): float(s) for c, s in zip(self.cols, board)},
                "cards": {(int(c), int(s)): float(a) for c, s, a in zip(slots, states, cards)}}


def _sig(z: float) -> float:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))


def to_points(z: float, z0: float) -> float:
    """The factor from logit shares to points of win chance (see the header)."""
    if abs(z - z0) > 1e-9:
        return 100.0 * (_sig(z) - _sig(z0)) / (z - z0)
    p = _sig(z)
    return 100.0 * p * (1 - p)


# ---------------------------------------------------------------- the buckets

_SIDE = {"me": "your", "opp": "their"}
_MANA = re.compile(r"^(lands|lands_untapped|untapped_land_[A-Z]|pool_[A-Z]|pool_total|mana_available|"
                   r"land_drop_used|lands_played_turn|lands_played_game)$")
_LIFE = ("life", "poison", "player_counters")
_YARD = ("graveyard", "exile", "command")
_CASTS = ("spells_cast_turn", "abilities_turn", "spells_cast_game", "mulligans")
SPECIAL_LABELS = {"<token>": "tokens", "<facedown>": "face-down cards", "<other>": "cards outside the cube list"}


def bucket_of(name: str) -> tuple[str, str]:
    """A board feature's bucket: (key, label)."""
    if name in ("turn", "round", "my_turn", "my_priority") or name.startswith("phase."):
        return "turn", "the turn and phase"
    if name.startswith("stack.") or (name.startswith("types.") and name.split(".")[2] == "stack"):
        return "stack", "the stack"
    if name.startswith("combat."):
        return "combat", "combat"
    if name.startswith("types."):
        _, side, zone, _agg = name.split(".", 3)
        if zone == "hand":
            return f"{side}.hand", "cards in hand"
        if zone == "battlefield":
            return f"{side}.board", f"{_SIDE[side]} board"
        return f"{side}.yard", f"{_SIDE[side]} graveyard and exile"
    side, rest = name.split(".", 1)
    who = _SIDE[side]
    if rest.startswith("board."):
        return f"{side}.board", f"{who} board"
    if rest in _LIFE:
        return f"{side}.life", f"{who} life"
    if rest == "hand":
        return (f"{side}.hand", "cards in hand") if side == "me" else ("opp.hand", "their hand size")
    if rest == "library":
        return f"{side}.library", f"{who} library"
    if rest in _YARD:
        return f"{side}.yard", f"{who} graveyard and exile"
    if _MANA.match(rest):
        return f"{side}.mana", f"{who} mana and lands"
    if rest in _CASTS:
        return f"{side}.casts", f"{who} spells this turn"
    return f"{side}.other", f"{who} other"


def card_bucket(card: str, state: str) -> tuple[str, str]:
    side = state.split(".", 1)[0]
    label = SPECIAL_LABELS.get(card, card)
    return f"card.{side}:{card}", f"{_SIDE[side]} {label}"


def explain(members: list[Mlp], vec, names: list[str], vocab: list[str], card_states: list[str]) -> dict[str, Any]:
    """The ensemble's attribution of `vec`, bucketed: EVERY bucket with a
    share, largest first (a few dozen at most: the board buckets and one per
    card the viewer sees), so a client can also take the difference of two
    positions bucket by bucket.  Each bucket's `pts` and `logit` is the
    members' mean; together they sum to 100 (p - p0) and logit - logit0."""
    pts: dict[str, float] = {}
    lg: dict[str, float] = {}
    labels: dict[str, str] = {}
    zs, z0s, ps, p0s, segs = [], [], [], [], 0
    k = 1.0 / len(members)
    for mlp in members:
        a = mlp.attribute(vec)
        f = to_points(a["z"], a["z0"])
        zs.append(a["z"])
        z0s.append(a["z0"])
        ps.append(_sig(a["z"]))
        p0s.append(_sig(a["z0"]))
        segs = max(segs, a["segments"])
        shares = [(bucket_of(names[c]), s) for c, s in a["board"].items()]
        shares += [(card_bucket(vocab[c], card_states[s]), x) for (c, s), x in a["cards"].items()]
        for (key, label), s in shares:
            labels[key] = label
            lg[key] = lg.get(key, 0.0) + k * s
            pts[key] = pts.get(key, 0.0) + k * s * f
    order = sorted(pts, key=lambda b: (-abs(pts[b]), b))
    return {
        "method": METHOD,
        "baseline": {"what": BASELINE, "p": float(np.mean(p0s)), "logit": float(np.mean(z0s))},
        "p": float(np.mean(ps)), "logit": float(np.mean(zs)), "members": len(members), "segments": segs,
        "buckets": [{"key": b, "label": labels[b], "pts": pts[b], "logit": lg[b]} for b in order],
    }
