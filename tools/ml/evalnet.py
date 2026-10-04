#!/usr/bin/env python3
# mtg-table — tools/ml: the position-value network, its numpy maths and its export.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The learned position evaluator's model (D316): P(the viewer wins) from one
D305 feature vector.  numpy only; train_eval.py trains it (numpy, or torch when
installed) and the Java side (bridge/src/mtgtable/eval/) reads the export.

THE MODEL.  A D305 vector is 243-odd board numbers and a card block of
`vocab x 17` counts (how many copies of each card are in each card state).
The board numbers go in as they are (standardised).  The card block does NOT
get a weight per (card, state) cell -- 3,213 inputs times the first layer's
width is what overfit at 48 games (D305's measurement) -- but is POOLED through
one small learned embedding per card, shared by every state and both sides:

    pooled[state] = sum over cards c of count[c, state] * E[c]        (E: vocab x k)
    x             = concat(standardised board columns, pooled[0..16])  (B + 17k)
    h             = relu(x W1 + b1) ... ;  p = sigmoid(h W_out + b_out)

So a card costs k numbers (8 by default) instead of 17 x width, what is learnt
about a card in my hand also says something about it on their battlefield (the
next layer decides what each state means), E starts at zero -- a card never seen
in training adds exactly nothing, and the type and mana-value aggregates of the
`types` block carry it -- and E has its own, stronger L2 (`card_l2`).  With no
hidden layer it is a logistic regression on the same inputs.

TWO GROUPS OF COLUMNS ARE LEFT OUT of the board input, and the export names
them: the four per-player tally features a live Forge game cannot reproduce
exactly from its own state (LIVE_UNSAFE: this game's spells, lands and
mulligans, the abilities-this-turn count, which the log counts from `cast`
events that include triggers and Forge's own counter does not, and the
stack's ability count, which only a seat's recording carries -- D316), and
every column that is constant on the training split (my_priority is always 1 on
a decision row; an unseen phase).  The Java encoder still computes every
feature; the model reads only `boardColumns`.

THE EXPORT is one JSON file, `formatVersion` 1: the schema id and version, the
vocabulary (the cube's card list as the schema saw it), the board columns with
their mean and deviation, the embedding, and the layers (W row-major, out x in).
A model loads only against the schema it was trained on: the Java loader
recomputes the schema id from the vocabulary and refuses a mismatch, and a
caller passing its cube refuses a different card list.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - callers say so
    np = None  # type: ignore

FORMAT = "mtgtable-position-eval"
FORMAT_VERSION = 1
N_STATES = len(E.CARD_STATES)

# Per-player tally features the live encoder cannot reproduce from a Forge
# Game: the log counts them from events since the game began (and `cast`
# events include triggered abilities), Forge keeps no such counters (D316).
LIVE_UNSAFE = [f"{s}.{n}" for s in ("me", "opp")
               for n in ("abilities_turn", "spells_cast_game", "lands_played_game", "mulligans")]
# And stack.abilities: `stack[].isAbility` is a comfort field (amendment M36),
# written only into a seat's recording, so every AI-vs-AI log reads 0 here
# while a live game knows the truth (measured by EvalLiveCheck, D316).
LIVE_UNSAFE.append("stack.abilities")


# ---------------------------------------------------------------- data

class Rows:
    """A split held compactly: the board columns dense in the dataset's own
    integer dtype (int16; float32 for a float X), the card block as CSR over
    rows (slot, state, count), and the labels.  Nothing here is float64: a
    caller converts a batch, or a few columns, when it needs them (6.3 M rows
    of 243 board columns are 3 GB as int16 and 12 GB as float64)."""

    def __init__(self, board, indptr, slot, state, count, y, turn, game):
        self.board = board          # (n, card_offset) int16 (float32 for a float X)
        self.indptr = indptr        # (n+1,) int64
        self.slot = slot            # (nnz,) int16 (int32 past 32,767 slots)
        self.state = state          # (nnz,) int8
        self.count = count          # (nnz,) int16 (float32 for a float X)
        self.y = y                  # (n,) int8: +1 / 0 / -1
        self.turn = turn            # (n,) int16
        self.game = game            # (n,) int32
        self.t = (y.astype(np.float64) + 1.0) / 2.0
        self._moments = None

    def __len__(self) -> int:
        return len(self.y)

    @classmethod
    def from_X(cls, X, card_offset: int, y, turn, game) -> "Rows":
        bd, cd, sd = _dtypes(X, card_offset)
        board = np.ascontiguousarray(X[:, :card_offset], dtype=bd)
        cb = X[:, card_offset:]
        r, c = np.nonzero(cb)
        count = cb[r, c].astype(cd)
        indptr = np.zeros(len(X) + 1, np.int64)
        np.cumsum(np.bincount(r, minlength=len(X)), out=indptr[1:])
        return cls(board, indptr, (c // N_STATES).astype(sd), (c % N_STATES).astype(np.int8), count,
                   np.asarray(y, np.int8), np.asarray(turn, np.int16), np.asarray(game, np.int32))

    @classmethod
    def empty(cls, card_offset: int, board_dtype=np.float32, count_dtype=np.float32, slot_dtype=np.int32) -> "Rows":
        return cls(np.zeros((0, card_offset), board_dtype), np.zeros(1, np.int64), np.zeros(0, slot_dtype),
                   np.zeros(0, np.int8), np.zeros(0, count_dtype), np.zeros(0, np.int8), np.zeros(0, np.int16),
                   np.zeros(0, np.int32))

    @classmethod
    def concat(cls, parts: list["Rows"]) -> "Rows":
        if len(parts) == 1:
            return parts[0]
        offs = np.cumsum([0] + [len(p.slot) for p in parts])
        indptr = np.concatenate([parts[0].indptr[:1]] + [p.indptr[1:] + o for p, o in zip(parts, offs)])
        cat = lambda k: np.concatenate([getattr(p, k) for p in parts])  # noqa: E731
        return cls(cat("board"), indptr, cat("slot"), cat("state"), cat("count"), cat("y"), cat("turn"),
                   cat("game"))

    def take(self, idx) -> "Rows":
        """Rows idx (any order), as a new Rows."""
        idx = np.asarray(idx, np.int64)
        starts = self.indptr[idx]
        lens = self.indptr[idx + 1] - starts
        indptr = np.zeros(len(idx) + 1, np.int64)
        np.cumsum(lens, out=indptr[1:])
        pos = np.repeat(starts - indptr[:-1], lens) + np.arange(indptr[-1])
        return Rows(self.board[idx], indptr, self.slot[pos], self.state[pos], self.count[pos], self.y[idx],
                    self.turn[idx], self.game[idx])

    def row_of_nnz(self):
        return np.repeat(np.arange(len(self)), np.diff(self.indptr))

    def moments(self, chunk: int = 16384):
        """The board columns' mean and standard deviation in float64, a chunk
        at a time, cached.  Bit for bit `board.astype(float64).mean(0)` and
        `.std(0)`: numpy reduces over axis 0 row after row, and so does this,
        carrying the running sum into each chunk's first row."""
        if self._moments is None:
            self._moments = board_moments(self.board, chunk)
        return self._moments


def board_moments(board, chunk: int = 16384):
    n, d = board.shape
    if not n:
        return np.zeros(d), np.zeros(d)
    acc = np.zeros(d)
    for i in range(0, n, chunk):
        c = board[i:i + chunk].astype(np.float64)
        c[0] += acc
        acc = np.add.reduce(c, axis=0)
    mean = acc / n
    acc = np.zeros(d)
    for i in range(0, n, chunk):
        c = board[i:i + chunk].astype(np.float64)
        c -= mean
        np.multiply(c, c, out=c)
        c[0] += acc
        acc = np.add.reduce(c, axis=0)
    return mean, np.sqrt(acc / n)


def _dtypes(X, card_offset: int):
    """Board, count and slot dtypes for an X: an integer X (dataset.py writes
    int16) keeps its dtype, a float one is float32 as before."""
    integer = np.issubdtype(X.dtype, np.integer)
    vd = X.dtype if integer else np.float32
    slots = max(0, X.shape[1] - card_offset) // N_STATES
    return vd, vd, (np.int16 if slots < 32768 else np.int32)


SPLITS = ("train", "val", "test")


def load_splits(data: str, card_offset: int, split_of_game=None, prefixes=SPLITS, chunk: int = 8192) -> dict[str, Rows]:
    """The rows of the shards named `prefixes` (in that order, each prefix's
    shards sorted), sent to a split each: the shard's own prefix, or
    `split_of_game[row's game]` (games.jsonl order) when that is given -- a
    re-split straight from the shards, never a whole copy concatenated and
    taken apart.  A split's rows keep shard order.

    Two passes: the first reads only each shard's `game` member to count the
    rows of every split, so the dense arrays are allocated once, at their
    size; the second fills them, a few thousand rows of one shard's dense X
    at a time.  Peak memory is the result plus one shard's X."""
    files = [f for p in prefixes for f in sorted(f for f in os.listdir(data)
                                                 if f.startswith(p + "-") and f.endswith(".npz"))]
    if split_of_game is None:
        names = list(prefixes)
        sog = None
    else:
        names = list(SPLITS) + sorted(set(split_of_game) - set(SPLITS))
        sog = np.array([names.index(s) for s in split_of_game], np.int8)
    code = {s: i for i, s in enumerate(names)}

    def dest(f, game):
        if sog is None:
            return np.full(len(game), code[f.rsplit("-", 1)[0]], np.int8)
        return sog[game]

    n = np.zeros(len(names), np.int64)
    for f in files:
        with np.load(os.path.join(data, f)) as z:
            n += np.bincount(dest(f, z["game"]), minlength=len(names))
    if not files:
        return {s: Rows.empty(card_offset) for s in names}
    out: dict[int, dict[str, Any]] = {}
    pos = np.zeros(len(names), np.int64)
    for f in files:
        with np.load(os.path.join(data, f)) as z:
            X, y, turn, game = z["X"], z["y"], z["turn"], z["game"]
        if not out:
            bd, cd, sd = _dtypes(X, card_offset)
            out = {k: {"board": np.empty((int(n[k]), card_offset), bd), "lens": np.empty(int(n[k]), np.int64),
                       "y": np.empty(int(n[k]), np.int8), "turn": np.empty(int(n[k]), np.int16),
                       "game": np.empty(int(n[k]), np.int32), "slot": [], "state": [], "count": []}
                   for k in range(len(names))}
        d = dest(f, game)
        for i in range(0, len(X), chunk):
            Xc, dc = X[i:i + chunk], d[i:i + chunk]
            for k in np.unique(dc).tolist():
                if (dc == k).all():
                    sel, Xk = slice(i, i + len(Xc)), Xc
                else:
                    m = np.nonzero(dc == k)[0]
                    sel, Xk = m + i, Xc[m]
                o, p, cnt = out[k], int(pos[k]), len(Xk)
                o["board"][p:p + cnt] = Xk[:, :card_offset]
                cb = Xk[:, card_offset:]
                r, c = np.nonzero(cb)
                o["lens"][p:p + cnt] = np.bincount(r, minlength=cnt)
                o["count"].append(cb[r, c].astype(cd))
                o["slot"].append((c // N_STATES).astype(sd))
                o["state"].append((c % N_STATES).astype(np.int8))
                o["y"][p:p + cnt] = y[sel]
                o["turn"][p:p + cnt] = turn[sel]
                o["game"][p:p + cnt] = game[sel]
                pos[k] += cnt
        del X
    res = {}
    for k, s in enumerate(names):
        o = out.pop(k)
        indptr = np.zeros(int(n[k]) + 1, np.int64)
        np.cumsum(o.pop("lens"), out=indptr[1:])
        nnz = {}
        for key in ("slot", "state", "count"):   # one field at a time: the parts and one result
            dt = {"slot": sd, "state": np.int8, "count": cd}[key]
            nnz[key] = np.concatenate(o[key]) if o[key] else np.zeros(0, dt)
            o[key].clear()
        res[s] = Rows(o["board"], indptr, nnz["slot"], nnz["state"], nnz["count"], o["y"], o["turn"], o["game"])
    return res


def load_rows(data: str, split: str, card_offset: int) -> Rows:
    """Every shard of one split of a dataset.py directory (load_splits)."""
    return load_splits(data, card_offset, prefixes=(split,))[split]


def read_schema(data: str) -> dict[str, Any]:
    with open(os.path.join(data, "features.json"), encoding="utf-8") as f:
        return json.load(f)


def board_names(schema: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for b in schema["blocks"]:
        if b["name"] != "cards":
            out.extend(x["name"] for x in b["features"])
    return out


def card_offset_of(schema: dict[str, Any]) -> int:
    return next(b["offset"] for b in schema["blocks"] if b["name"] == "cards")


# ---------------------------------------------------------------- the network

def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))


class EvalNet:
    """Parameters and numpy forward/backward (float64)."""

    def __init__(self, cols, mean, sd, vocab_size: int, dim: int, hidden: list[int], seed: int = 0):
        rng = np.random.default_rng(seed)
        self.cols = np.asarray(cols, np.int64)
        self.mean = np.asarray(mean, np.float64)
        self.sd = np.asarray(sd, np.float64)
        self.dim = dim
        self.E = np.zeros((vocab_size, dim))
        sizes = [len(self.cols) + N_STATES * dim] + list(hidden) + [1]
        self.W = [rng.normal(0, math.sqrt(2.0 / sizes[i]), (sizes[i], sizes[i + 1])) for i in range(len(sizes) - 1)]
        self.W[-1] *= 0.1
        self.b = [np.zeros(sizes[i + 1]) for i in range(len(sizes) - 1)]

    @property
    def hidden(self) -> list[int]:
        return [w.shape[1] for w in self.W[:-1]]

    def params(self) -> list:
        return [self.E] + self.W + self.b

    def set_params(self, ps) -> None:
        n = len(self.W)
        self.E = ps[0]
        self.W = list(ps[1:1 + n])
        self.b = list(ps[1 + n:])

    def copy_params(self) -> list:
        return [p.copy() for p in self.params()]

    def n_params(self) -> int:
        return int(sum(p.size for p in self.params()))

    # -- forward

    def _inputs(self, r: Rows):
        n = len(r)
        xb = (r.board[:, self.cols].astype(np.float64) - self.mean) / self.sd
        flat = r.row_of_nnz() * N_STATES + r.state.astype(np.int64)
        P = np.zeros((n * N_STATES, self.dim))
        cnt = r.count.astype(np.float64)
        for d in range(self.dim):
            P[:, d] = np.bincount(flat, weights=cnt * self.E[r.slot, d], minlength=n * N_STATES)
        return np.concatenate([xb, P.reshape(n, N_STATES * self.dim)], axis=1), flat

    def logit(self, r: Rows, rng=None, dropout: float = 0.0):
        x, flat = self._inputs(r)
        acts = [x]
        masks = []
        h = x
        for i in range(len(self.W) - 1):
            h = np.maximum(h @ self.W[i] + self.b[i], 0.0)
            if dropout > 0 and rng is not None:
                m = (rng.random(h.shape) >= dropout) / (1.0 - dropout)
                h = h * m
                masks.append(m)
            else:
                masks.append(None)
            acts.append(h)
        z = (h @ self.W[-1] + self.b[-1])[:, 0]
        return z, (acts, masks, flat)

    def predict(self, r: Rows, batch: int = 8192):
        out = np.zeros(len(r))
        for i in range(0, len(r), batch):
            idx = np.arange(i, min(len(r), i + batch))
            out[idx] = _sigmoid(self.logit(r.take(idx))[0])
        return out

    # -- loss and gradient

    def loss_grad(self, r: Rows, l2: float, card_l2: float, rng=None, dropout: float = 0.0):
        """Mean cross-entropy + l2/2 sum W^2 + card_l2/2 |E|^2 and its gradient,
        in params() order."""
        n = len(r)
        z, (acts, masks, flat) = self.logit(r, rng, dropout)
        p = _sigmoid(z)
        t = r.t
        eps = 1e-12
        ce = float(-(t * np.log(p + eps) + (1 - t) * np.log(1 - p + eps)).mean())
        loss = ce + 0.5 * l2 * sum(float((w * w).sum()) for w in self.W) + 0.5 * card_l2 * float((self.E ** 2).sum())
        g = ((p - t) / n)[:, None]
        gW = [None] * len(self.W)
        gb = [None] * len(self.b)
        for i in range(len(self.W) - 1, -1, -1):
            gW[i] = acts[i].T @ g + l2 * self.W[i]
            gb[i] = g.sum(axis=0)
            g = g @ self.W[i].T
            if i > 0:
                if masks[i - 1] is not None:
                    g = g * masks[i - 1]
                g = g * (acts[i] > 0)
        nb = len(self.cols)
        gP = g[:, nb:].reshape(n * N_STATES, self.dim)
        gE = np.zeros_like(self.E)
        cnt = r.count.astype(np.float64)
        for d in range(self.dim):
            gE[:, d] = np.bincount(r.slot, weights=cnt * gP[flat, d], minlength=len(self.E))
        gE += card_l2 * self.E
        return loss, ce, [gE] + gW + gb

    # -- export

    def to_json(self, schema: dict[str, Any], names: list[str], extra: dict[str, Any]) -> dict[str, Any]:
        vocab = schema["vocab"]["cards"]
        layers = []
        for i, (w, b) in enumerate(zip(self.W, self.b)):
            layers.append({"in": int(w.shape[0]), "out": int(w.shape[1]),
                           "activation": "sigmoid" if i == len(self.W) - 1 else "relu",
                           "W": w.T.tolist(), "b": b.tolist()})
        return {
            "format": FORMAT, "formatVersion": FORMAT_VERSION,
            "schemaVersion": schema["schemaVersion"], "schemaId": schema["schemaId"],
            "nFeatures": schema["nFeatures"], "cardOffset": card_offset_of(schema),
            "cardStates": schema["cardStates"],
            "vocab": vocab, "vocabSha256": vocab_sha256(vocab),
            "input": {"boardColumns": self.cols.tolist(), "boardNames": [names[i] for i in self.cols],
                      "mean": self.mean.tolist(), "sd": self.sd.tolist(),
                      "cardDim": self.dim, "cardEmbedding": self.E.tolist()},
            "layers": layers,
            **extra,
        }

    @classmethod
    def from_json(cls, m: dict[str, Any]) -> "EvalNet":
        if m.get("format") != FORMAT or m.get("formatVersion") != FORMAT_VERSION:
            raise ValueError(f"not a {FORMAT} v{FORMAT_VERSION} model")
        inp = m["input"]
        net = cls.__new__(cls)
        net.cols = np.asarray(inp["boardColumns"], np.int64)
        net.mean = np.asarray(inp["mean"], np.float64)
        net.sd = np.asarray(inp["sd"], np.float64)
        net.dim = int(inp["cardDim"])
        net.E = np.asarray(inp["cardEmbedding"], np.float64).reshape(len(m["vocab"]), net.dim)
        net.W = [np.asarray(L["W"], np.float64).reshape(L["out"], L["in"]).T for L in m["layers"]]
        net.b = [np.asarray(L["b"], np.float64) for L in m["layers"]]
        return net


def vocab_sha256(cards: list[str]) -> str:
    return hashlib.sha256("\n".join(cards).encode("utf-8")).hexdigest()


def save_model(path: str, model: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, path)


def load_model(path: str) -> tuple[dict[str, Any], EvalNet]:
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    return m, EvalNet.from_json(m)


def check_schema(m: dict[str, Any], vocab: "E.Vocab") -> None:
    """A model loads only against the schema and vocabulary it was trained on."""
    schema = E.Schema(vocab)
    if schema.schema_id != m["schemaId"] or list(vocab.cards) != list(m["vocab"]):
        raise ValueError(f"model schema {m['schemaId']} does not match this vocabulary's {schema.schema_id}")


def features_to_rows(feats: list[list[float]], card_offset: int, labels=None) -> Rows:
    """Rows from encode.py feature vectors (for tests and the golden file)."""
    X = np.asarray(feats, np.float64)
    n = len(X)
    y = np.asarray(labels if labels is not None else [0] * n, np.int8)
    return Rows.from_X(X, card_offset, y, np.zeros(n, np.int16), np.zeros(n, np.int32))


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
