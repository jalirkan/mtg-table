#!/usr/bin/env python3
# mtg-table — tools/ml: the matchup model, one model over every cube's cards.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""P(deck A beats deck B), learned from every cube lab game at once.

    python3 tools/ml/matchup.py train <run-dirs or roots>... --out var/ml/matchup
        [--facts var/cubelab/facts] [--holdout-cubes all|a,b] [--boot 20] [--embed N]
    python3 tools/ml/matchup.py design --model var/ml/matchup --target-cube synergy --out proposed.md [--verify-seed 800000000]

WHY ONE MODEL.  A card's win rate in one cube mostly measures the deck and
archetype it sat in, and the same card in another cube is rated again from
scratch.  This model predicts a GAME from both decks' lists, net of every
other card in both decks and of the play/draw, so every game -- in any cube,
or a bridge draft between two -- informs the same card parameters, keyed by
the card's name.  It is meant to REPLACE the per-cube card win rates
(meta.json's winRateShrunk) and learn.ts's per-cube fit as the one source of
card value, not to sit beside them (D324).

THE LADDER.  Simplest first; anything bigger must beat it on held-out drafts
AND held-out cubes before it is used:

  M0  pooled Bradley-Terry over cards, with a feature prior:
          logit P(A) = sum_c (n_A,c - n_B,c) p_c + beta s,     s = +1 if A is on the play
          p_c = w . f_c + b_c,   b_c ~ N(0, tau^2),   w ~ N(0, tauW^2)
      f_c = matchup_data.card_features (mana value, colours, types, P/T,
      keywords, rules-text patterns, Forge's draft rank), so a card seen in no
      game gets what its features predict.  ONE NUMBER PER CARD: p_c is its
      power.  tau and tauW are fitted from the data, not picked: the grid
      value with the best 5-fold cross-validated log-loss, the folds grouped
      by DRAFT (learn.ts's tauCard = 0.25 would put the deck difference's
      prior SD at 0.25 * sqrt(46) = 1.7 logits, 85/15 matchups from card
      quality alone).  The Laplace evidence is reported beside it but not
      used: it counts a best-of-three's games as independent, and they share
      both decks, so it picked too loose a prior on the first real data.
  M1  M0 + a per-cube deviation d_{c,cube} ~ N(0, tauCube^2) for a card in
      its cube's games (a bridge deck's card in the cube it came from):
      context, as a hierarchy.  tauCube by the same grouped cross-validation.
  M2  M0 + a k-dimensional embedding e_c = A f_c + u_c, a small nonlinear deck
      term on the mean embedding, and an antisymmetric matchup term (torch;
      `--embed k`, off at 0).

BASELINES on the same held-out games: (a) coin -- the training split's
on-the-play rate; (b) additive -- plain Bradley-Terry on cards, no features,
tau by the same cross-validation; (c) per-cube -- meta.json's shrunk card win rates
((wins + 20 m)/(games + 20), spells only, tools/cubelab/meta.ts) per cube from
the training games, a deck scored by its spells' mean logit rate (a bridge
deck's card rated in its source cube), logit P = alpha (A - B) + beta s.

UNCERTAINTY.  The split is by draft (a hash of the draft id: 70/15/15) and
the intervals on held-out log-loss bootstrap over drafts: a draft's games
share both decks.  A card's power SD is its LAPLACE POSTERIOR SD (sdPost,
D342): sqrt(diag(A H^-1 A')) at the MAP, A taking theta to the centred powers.
The spread of M0 refitted on bootstrap resamples of the training drafts
(`--boot`, 20) is kept as sdBoot, a misspecification check only -- it is the
spread of a SHRUNK estimate, ~0 for a card with no games, and understated the
error 2-15x for the least-seen cards (methodology review 2, N1).  The prior
widths come from the Laplace evidence when every draft has one game
(`--tau-by auto`; the queue's default), else the grouped cross-validation.

LEFT OUT (D340, D341, D343).  Games played with an AI-ladder deck-set deck,
matched card for card (reserved.py); with `--ver`, games of other lab
versions.  AI-LIMITED cards (Forge's AI:RemoveDeck:All) are not rated: they
stay at their feature prior and one shared column takes their dead weight.

BALANCE (D342).  Each deck's predicted win rate against the cube's other
decks; the SD across decks, de-biased for shrinkage over draws from M1's
Laplace posterior, with an interval and a reliability (compare cubes only
when their reliabilities are alike).

OUTPUTS (--out): power.tsv (every card of every committed cube on ONE scale:
power in logits per copy relative to the average nonland card, x 25 ~ points
of win rate at even odds, sdPost, sdBoot, the part its features predict,
its games, ai = limited | random, its cubes), cube-dev.tsv (M1's per-cube deviations), balance.json
and report.md (the held-out tables, calibration, held-out cubes, the
balance numbers, bridge composition, overlap), games.jsonl, model.json (M0,
M1 as plain numbers).  numpy is required; torch only for M2.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matchup_data as MD  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

DEFAULTS = {
    "tauGrid": [0.002, 0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.085, 0.1, 0.15, 0.25],
    "folds": 5,
    "tauWGrid": [0.003, 0.01, 0.03],
    "tauCubeGrid": [0.01, 0.03, 0.06, 0.1],
    "betaPrior": 1.0, "shrinkK": 20.0, "boot": 20,
    "tauAi": 0.25,       # prior SD of the AI-limited cards' shared per-copy effect (D343)
    "balanceDraws": 200,  # posterior draws for the de-biased balance number (D342)
    "balanceRef": 400,    # a deck's win rate is against at most this many of the cube's decks
}


# ------------------------------------------------------------------ data

def split_of(draft: str) -> str:
    h = int(hashlib.sha1(draft.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < 70 else "val" if h < 85 else "test"


class Data:
    """Games as arrays over a card vocabulary: counts per side, play side, outcome, and the cube of each card."""

    def __init__(self, games: List[Dict[str, Any]], vocab: List[str]):
        self.games = games
        self.vocab = vocab
        self.index = {n: i for i, n in enumerate(vocab)}
        G, V = len(games), len(vocab)
        self.CA = np.zeros((G, V), dtype=np.float32)
        self.CB = np.zeros((G, V), dtype=np.float32)
        for g, r in enumerate(games):
            for n, k in r["deckA"].items():
                self.CA[g, self.index[n]] += k
            for n, k in r["deckB"].items():
                self.CB[g, self.index[n]] += k
        self.D = self.CA - self.CB
        self.s = np.array([1.0 if r["onPlay"] == "A" else -1.0 for r in games])
        self.y = np.array([1.0 if r["winner"] == "A" else 0.0 for r in games])
        self.split = np.array([split_of(r["draft"]) for r in games])
        self.kind = np.array([r["kind"] for r in games])
        self.drafts = [r["draft"] for r in games]
        # (card, cube) columns for M1: each card of a game in the cube it was drafted from.
        self.cc_index: Dict[Tuple[int, str], int] = {}
        rows, cols, vals = [], [], []
        for g, r in enumerate(games):
            frm = r.get("from") or {}
            for side, sign in (("deckA", 1.0), ("deckB", -1.0)):
                for n, k in r[side].items():
                    if n in MD.BASICS:
                        continue
                    cube = frm.get(n, r["cubes"][0])
                    key = (self.index[n], cube)
                    j = self.cc_index.setdefault(key, len(self.cc_index))
                    rows.append(g)
                    cols.append(j)
                    vals.append(sign * k)
        self.cc = np.zeros((G, len(self.cc_index)), dtype=np.float32)
        np.add.at(self.cc, (np.array(rows, dtype=int), np.array(cols, dtype=int)), np.array(vals, dtype=np.float32))

    def idx(self, mask) -> np.ndarray:
        return np.nonzero(mask)[0]


def build_features(vocab: List[str], facts: Dict[str, Dict[str, Any]], info: Dict[str, Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
    X = np.array([MD.card_features(n, facts.get(n), info.get(n)) for n in vocab], dtype=np.float64)
    mu, sd = X.mean(0), X.std(0)
    sd[sd < 1e-6] = 1.0
    return (X - mu) / sd, {"names": MD.FEATURE_NAMES, "mean": mu.tolist(), "sd": sd.tolist(),
                           "noFacts": [n for n in vocab if n not in facts]}


# ------------------------------------------------------------------ metrics

def metrics(p: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    out: Dict[str, Any] = {"n": int(len(y))}
    if len(y) == 0:
        return {**out, "logloss": float("nan"), "brier": float("nan"), "acc": float("nan"), "ece": float("nan"), "calibration": []}
    bins = np.minimum((p * 10).astype(int), 9)
    ece, cal = 0.0, []
    for b in range(10):
        m = bins == b
        if m.any():
            ece += m.mean() * abs(p[m].mean() - y[m].mean())
            cal.append([b / 10, int(m.sum()), round(float(p[m].mean()), 3), round(float(y[m].mean()), 3)])
    return {**out, "logloss": float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))),
            "brier": float(np.mean((p - y) ** 2)), "acc": float(np.mean((p > 0.5) == (y > 0.5))), "ece": float(ece), "calibration": cal}


def paired_ci(pa: np.ndarray, pb: np.ndarray, y: np.ndarray, groups: Sequence[str], reps: int = 2000, seed: int = 0) -> Tuple[float, float, float]:
    """Mean log-loss of a minus b, and its 95% interval by a bootstrap over DRAFTS (a draft's games move together)."""
    def ll(p):
        p = np.clip(p, 1e-6, 1 - 1e-6)
        return -(y * np.log(p) + (1 - y) * np.log(1 - p))
    d = ll(pa) - ll(pb)
    ug = sorted(set(groups))
    gi = np.array([{g: i for i, g in enumerate(ug)}[g] for g in groups])
    sums = np.bincount(gi, weights=d, minlength=len(ug))
    cnts = np.bincount(gi, minlength=len(ug)).astype(float)
    rng = np.random.default_rng(seed)
    pick = rng.integers(0, len(ug), (reps, len(ug)))
    bs = sums[pick].sum(1) / np.maximum(cnts[pick].sum(1), 1)
    return float(d.mean()), float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))


# ------------------------------------------------------------------ the linear models (M0, M1, b)

def sigmoid(z):
    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))


def fit_map(Z: np.ndarray, y: np.ndarray, prec: np.ndarray, wt: Optional[np.ndarray] = None, theta0: Optional[np.ndarray] = None,
            iters: int = 40) -> Tuple[np.ndarray, float]:
    """MAP logistic regression by Newton's method, Gaussian prior with precision `prec` per column.

    Returns theta and log det of the posterior Hessian H = Z' W Z + diag(prec).  With fewer games than
    columns each step is solved in the n x n dual (Woodbury), so a few hundred games over ~2,000
    parameters stay cheap; with more games, in the primal."""
    n, d = Z.shape
    th = np.zeros(d) if theta0 is None else theta0.copy()
    w = np.ones(n) if wt is None else wt
    inv = 1.0 / prec
    logdet = 0.0
    for it in range(iters):
        p = sigmoid(Z @ th)
        g = Z.T @ (w * (p - y)) + prec * th
        r = np.maximum(w * p * (1 - p), 1e-12)
        if n < d:
            # H^-1 g = L g - L Z' (R^-1 + Z L Z')^-1 Z L g,  L = diag(1/prec), R = diag(r)
            ZL = Z * inv
            K = ZL @ Z.T
            K[np.diag_indices(n)] += 1.0 / r
            Lg = inv * g
            step = Lg - ZL.T @ np.linalg.solve(K, Z @ Lg)
        else:
            H = (Z * r[:, None]).T @ Z + np.diag(prec)
            step = np.linalg.solve(H, g)
        th -= step
        if np.abs(step).max() < 1e-7:
            break
    p = sigmoid(Z @ th)
    r = np.maximum(w * p * (1 - p), 1e-12)
    if n < d:
        # log det H = log det diag(prec) + log det(I + R^1/2 Z L Z' R^1/2)
        sr = np.sqrt(r)
        M = (Z * inv) @ Z.T * sr[:, None] * sr[None, :]
        M[np.diag_indices(n)] += 1.0
        logdet = float(np.sum(np.log(prec))) + float(np.linalg.slogdet(M)[1])
    else:
        logdet = float(np.linalg.slogdet((Z * r[:, None]).T @ Z + np.diag(prec))[1])
    return th, logdet


def log_evidence(Z, y, prec, th, logdet_h: float) -> float:
    """The Laplace approximation to log p(y | the prior widths)."""
    p = np.clip(sigmoid(Z @ th), 1e-12, 1 - 1e-12)
    ll = float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)))
    return ll - 0.5 * float(np.sum(prec * th * th)) + 0.5 * float(np.sum(np.log(prec))) - 0.5 * logdet_h


class Linear:
    """M0 / M1 / the plain additive baseline: theta = [w (features), b (cards), d (card x cube), a (AI-limited), beta].

    AI-LIMITED cards (`excl`, Forge's AI:RemoveDeck:All; D343) are kept out of the likelihood as cards: their
    columns are zero, so their b_c stays at its prior and they teach w nothing, and ONE shared column, the
    deck difference in how many AI-limited cards each deck holds, takes their dead weight (Forge's pilot
    seldom casts them) so it is not blamed on their deckmates.  Their power is what their features
    predict, and power.tsv marks them `limited`: unrated, never a blank."""

    def __init__(self, X: Optional[np.ndarray], data: Data, cube_dev: bool, excl: Optional[np.ndarray] = None):
        self.X, self.data, self.cube_dev = X, data, cube_dev
        self.F = 0 if X is None else X.shape[1]
        self.V = len(data.vocab)
        self.C = data.cc.shape[1] if cube_dev else 0
        self.excl = excl if excl is not None and excl.any() else None
        self.A = 1 if self.excl is not None else 0
        self.keep = None if self.excl is None else (~self.excl).astype(np.float64)
        self.cc_keep = None
        if self.excl is not None and cube_dev:
            self.cc_keep = np.ones(self.C)
            for (c, _cb), j in data.cc_index.items():
                if self.excl[c]:
                    self.cc_keep[j] = 0.0

    def lin(self, counts: np.ndarray, cc: Optional[np.ndarray]) -> np.ndarray:
        """The design rows of a signed card-count matrix (and its card x cube counts): strength = lin @ theta."""
        D = counts.astype(np.float64)
        Dm = D if self.keep is None else D * self.keep
        parts = []
        if self.X is not None:
            parts.append(Dm @ self.X)
        parts.append(Dm)
        if self.cube_dev:
            parts.append(cc if self.cc_keep is None else cc * self.cc_keep)
        if self.A:
            parts.append(D[:, self.excl].sum(1, keepdims=True))
        return np.concatenate(parts, axis=1)

    def design(self, idx: np.ndarray) -> np.ndarray:
        d = self.data
        Z = self.lin(d.D[idx], d.cc[idx] if self.cube_dev else None)
        return np.concatenate([Z, d.s[idx][:, None]], axis=1).astype(np.float64)

    def prec(self, tau: float, tauW: float, tauCube: float) -> np.ndarray:
        return np.concatenate([np.full(self.F, 1 / tauW ** 2), np.full(self.V, 1 / tau ** 2),
                               np.full(self.C, 1 / tauCube ** 2), np.full(self.A, 1 / DEFAULTS["tauAi"] ** 2),
                               [1 / DEFAULTS["betaPrior"] ** 2]])

    def fit(self, idx: np.ndarray, tau: float, tauW: float = 1.0, tauCube: float = 1.0, wt=None, theta0=None, Z=None):
        Z = self.design(idx) if Z is None else Z
        pr = self.prec(tau, tauW, tauCube)
        th, ld = fit_map(Z, self.data.y[idx], pr, wt, theta0)
        self.theta, self.taus, self.fitted = th, (tau, tauW, tauCube), idx
        self.evidence = log_evidence(Z, self.data.y[idx], pr, th, ld)
        return self

    def select(self, idx: np.ndarray, taus: Sequence[float], tauWs: Sequence[float], tauCubes: Sequence[float],
               folds: int = DEFAULTS["folds"], by: str = "cv") -> List[Tuple[float, float, float, float, float]]:
        """Choose the prior widths, then refit on all of `idx`.  Returns the grid: (tau, tauW, tauCube, cv log-loss, evidence).

        by="cv": K-fold cross-validation GROUPED BY DRAFT (a draft's games, which share both decks, are never split);
        the Laplace evidence is kept as a diagnostic -- with several games per draft it trusts the data too much
        (D324).  by="evidence": the widths that maximise the Laplace evidence (type-II maximum likelihood), no
        folds.  With ONE game per draft (the queue's default) the games are independent and the evidence is
        sound; in the simulation (matchup_sim.py, D342) it lands on the true tau where CV's choice is noisy and
        low, and the posterior SDs and the de-biased balance inherit whichever tau is chosen."""
        fold = np.array([int(hashlib.sha1(("fold" + self.data.drafts[i]).encode()).hexdigest()[:8], 16) % folds for i in idx])
        Z = self.design(idx)
        y = self.data.y[idx]
        combos = [(t, tw, tc) for t in taus for tw in (tauWs if self.F else [1.0]) for tc in (tauCubes if self.cube_dev else [1.0])]
        grid = []
        for t, tw, tc in combos:
            pr = self.prec(t, tw, tc)
            ll = 0.0
            for k in (range(folds) if by == "cv" else []):
                trk, tek = fold != k, fold == k
                if not tek.any() or not trk.any():
                    continue
                th, _ = fit_map(Z[trk], y[trk], pr)
                p = np.clip(sigmoid(Z[tek] @ th), 1e-9, 1 - 1e-9)
                ll -= float(np.sum(y[tek] * np.log(p) + (1 - y[tek]) * np.log(1 - p)))
            self.fit(idx, t, tw, tc, Z=Z)
            grid.append((t, tw, tc, ll / len(idx) if by == "cv" else float("nan"), self.evidence))
        best = min(grid, key=lambda g: (g[3], g[0])) if by == "cv" else max(grid, key=lambda g: (g[4], -g[0]))
        self.tau_by = by
        self.fit(idx, best[0], best[1], best[2], Z=Z)
        self.grid = grid
        return grid

    def predict(self, idx: Optional[np.ndarray] = None) -> np.ndarray:
        idx = np.arange(len(self.data.y)) if idx is None else idx
        return sigmoid(self.design(idx) @ self.theta)

    @property
    def w(self) -> np.ndarray:
        return self.theta[:self.F]

    @property
    def b(self) -> np.ndarray:
        return self.theta[self.F:self.F + self.V]

    @property
    def d(self) -> np.ndarray:
        return self.theta[self.F + self.V:self.F + self.V + self.C]

    @property
    def ai_coef(self) -> float:
        """The shared per-copy effect of an AI-limited card in Forge's games (0 when there are none)."""
        return float(self.theta[self.F + self.V + self.C]) if self.A else 0.0

    @property
    def beta(self) -> float:
        return float(self.theta[-1])

    def power(self) -> np.ndarray:
        """p_c = w . f_c + b_c, per card."""
        return (self.X @ self.w if self.X is not None else 0.0) + self.b

    def prior_power(self) -> np.ndarray:
        return self.X @ self.w if self.X is not None else np.zeros(self.V)

    # ---------------------------------------------------------- the Laplace posterior (D342)

    def posterior_cov(self) -> np.ndarray:
        """Sigma = H^-1 at the MAP, H = Z' W Z + diag(prec), over the games the model was fitted on.  In the dual regime
        (fewer games than parameters) by Woodbury: Sigma = L - (Z L)' (R^-1 + Z L Z')^-1 (Z L), L = diag(1/prec)."""
        Z = self.design(self.fitted)
        pr = self.prec(*self.taus)
        p = sigmoid(Z @ self.theta)
        r = np.maximum(p * (1 - p), 1e-12)
        n, d = Z.shape
        if n < d:
            ZL = Z / pr
            K = ZL @ Z.T
            K[np.diag_indices(n)] += 1.0 / r
            S = -ZL.T @ np.linalg.solve(K, ZL)
            S[np.diag_indices(d)] += 1.0 / pr
        else:
            H = (Z * r[:, None]).T @ Z
            H[np.diag_indices(d)] += pr
            S = np.linalg.inv(H)
        return (S + S.T) / 2

    def power_map(self, centre: np.ndarray) -> np.ndarray:
        """The V x len(theta) matrix taking theta to each card's power relative to the mean of the `centre` cards."""
        u = centre / centre.sum()
        A = np.zeros((self.V, len(self.theta)))
        if self.X is not None:
            A[:, :self.F] = self.X - u @ self.X
        A[:, self.F:self.F + self.V] = np.eye(self.V) - u[None, :]
        return A

    def power_sd_post(self, centre: np.ndarray, cov: Optional[np.ndarray] = None) -> np.ndarray:
        """Each card's posterior SD of its centred power: sqrt(diag(A Sigma A')).  Unlike a bootstrap of the MAP
        (which measures how much the SHRUNK estimate moves, ~0 for an unseen card) this is the uncertainty
        about the card itself: tau for an unseen card, shrinking as its games add up (review 2, N1)."""
        S = self.posterior_cov() if cov is None else cov
        A = self.power_map(centre)
        return np.sqrt(np.maximum(np.einsum("ij,ij->i", A @ S, A), 0.0))


def bootstrap_power(model: Linear, tr: np.ndarray, B: int, seed: int) -> np.ndarray:
    """M0 refitted on B bootstrap resamples of the training DRAFTS (prior widths kept), warm-started: B x V powers."""
    data = model.data
    by: Dict[str, List[int]] = {}
    for i in tr:
        by.setdefault(data.drafts[i], []).append(int(i))
    keys = sorted(by)
    rng = np.random.default_rng(seed)
    Z = model.design(tr)
    pr = model.prec(*model.taus)
    pos = {int(i): k for k, i in enumerate(tr)}
    out = []
    for _ in range(B):
        cnt = np.bincount(rng.integers(0, len(keys), len(keys)), minlength=len(keys))
        wt = np.zeros(len(tr))
        for k, c in enumerate(cnt):
            for i in by[keys[k]]:
                wt[pos[i]] = c
        th, _ = fit_map(Z, data.y[tr], pr, wt, model.theta, iters=15)
        F, V = model.F, model.V
        out.append((model.X @ th[:F] if model.X is not None else 0.0) + th[F:F + V])
    return np.array(out)


# ------------------------------------------------------------------ baselines

def coin(data: Data, tr: np.ndarray) -> np.ndarray:
    on = float(np.mean(np.where(data.s[tr] > 0, data.y[tr], 1 - data.y[tr])))
    return np.where(data.s > 0, on, 1 - on)


def per_cube(data: Data, tr: np.ndarray, land: np.ndarray, k: float) -> np.ndarray:
    """(c) meta.json's per-cube shrunk card win rates from the training games."""
    obs: Dict[str, Dict[int, List[float]]] = {}
    for g in tr:
        r = data.games[g]
        if r["kind"] != "normal":
            continue
        o = obs.setdefault(r["cubes"][0], {})
        for C, won in ((data.CA[g], data.y[g]), (data.CB[g], 1 - data.y[g])):
            for c in np.nonzero(C)[0]:
                if not land[c]:
                    e = o.setdefault(int(c), [0.0, 0.0])
                    e[0] += won
                    e[1] += 1
    rate: Dict[str, Dict[int, float]] = {}
    for cube, o in obs.items():
        tw, tg = sum(v[0] for v in o.values()), sum(v[1] for v in o.values())
        m = min(max(tw / tg if tg else 0.5, 0.01), 0.99)
        lm = math.log(m / (1 - m))
        rate[cube] = {}
        for c, (w, n) in o.items():
            q = (w + k * m) / (n + k)
            rate[cube][c] = math.log(q / (1 - q)) - lm

    def score(g: int, C: np.ndarray) -> float:
        r = data.games[g]
        vals = [rate.get((r.get("from") or {}).get(data.vocab[c], r["cubes"][0]), {}).get(int(c), 0.0)
                for c in np.nonzero(C)[0] if not land[c]]
        return float(np.mean(vals)) if vals else 0.0

    diff = np.array([score(g, data.CA[g]) - score(g, data.CB[g]) for g in range(len(data.games))])
    Z = np.stack([diff, data.s], axis=1)
    th, _ = fit_map(Z[tr], data.y[tr], np.array([1e-4, 1.0]))
    return sigmoid(Z @ th)


# ------------------------------------------------------------------ M2 (embeddings, torch)

def embed_model(X: np.ndarray, data: Data, tr: np.ndarray, va: np.ndarray, k: int, tau: float, tauW: float, seed: int, epochs: int = 600):
    """M0 plus a k-dim embedding, a deck term and an antisymmetric matchup term.  Returns a predict(idx) function, or None without torch."""
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        return None
    torch.manual_seed(seed)
    V, F = X.shape
    Xt = torch.tensor(X, dtype=torch.float32)
    P = {"w": torch.zeros(F), "b": torch.zeros(V), "A": torch.randn(F, k) * 0.02, "U": torch.zeros(V, k),
         "q1": torch.randn(16, k) * 0.1, "q2": torch.randn(16) * 0.1, "K": torch.zeros(k, k), "beta": torch.zeros(())}
    for v in P.values():
        v.requires_grad_(True)
    CA, CB = torch.tensor(data.CA), torch.tensor(data.CB)
    s, y = torch.tensor(data.s, dtype=torch.float32), torch.tensor(data.y, dtype=torch.float32)

    def logit(ix):
        p = Xt @ P["w"] + P["b"]
        e = Xt @ P["A"] + P["U"]
        a, b = CA[ix], CB[ix]
        EA, EB = (a @ e) / 40.0, (b @ e) / 40.0
        q = lambda E: torch.tanh(E @ P["q1"].T) @ P["q2"]  # noqa: E731
        M = (P["K"] - P["K"].T) / 2
        return a @ p - b @ p + q(EA) - q(EB) + ((EA @ M) * EB).sum(1) + P["beta"] * s[ix]

    opt = torch.optim.Adam(P.values(), lr=0.01)
    bce = nn.BCEWithLogitsLoss(reduction="sum")
    tri, vai = torch.tensor(tr), torch.tensor(va)
    best, state, since = float("inf"), None, 0
    for ep in range(epochs):
        opt.zero_grad()
        pen = (0.5 * (P["b"] ** 2).sum() / tau ** 2 + 0.5 * (P["w"] ** 2).sum() / tauW ** 2 + 0.5 * (P["U"] ** 2).sum() / (tau / 2) ** 2
               + 0.5 * ((P["A"] ** 2).sum() + (P["q1"] ** 2).sum() + (P["q2"] ** 2).sum() + (P["K"] ** 2).sum()) / 0.1 ** 2)
        loss = bce(logit(tri), y[tri]) + pen
        loss.backward()
        opt.step()
        if ep % 5 == 0 and len(va):
            with torch.no_grad():
                vl = float(bce(logit(vai), y[vai])) / len(va)
            if vl < best - 1e-5:
                best, since, state = vl, 0, {n: v.detach().clone() for n, v in P.items()}
            else:
                since += 5
                if since > 60:
                    break
    if state:
        for n in P:
            P[n].data.copy_(state[n])

    def predict(ix: np.ndarray) -> np.ndarray:
        with torch.no_grad():
            return torch.sigmoid(logit(torch.tensor(ix))).numpy().astype(np.float64)
    return predict


# ------------------------------------------------------------------ balance and bridge composition

def cube_decks(model: Linear, data: Data, cube: str) -> Optional[np.ndarray]:
    """Each in-cube deck the data holds, once, as a design row (model.lin): its strength is row @ theta -- the
    summed power of its cards, M1's deviations in that cube, and the AI-limited column."""
    ccmap = np.full(len(data.vocab), -1)
    for (c, cb), j in data.cc_index.items():
        if cb == cube:
            ccmap[c] = j
    has = ccmap >= 0
    seen, rows = set(), []
    for g, r in enumerate(data.games):
        if r["kind"] != "normal" or r["cubes"][0] != cube:
            continue
        for key, C in ((r["draft"] + "A", data.CA[g]), (r["draft"] + "B", data.CB[g])):
            if key not in seen:
                seen.add(key)
                cc = None
                if model.cube_dev:
                    cc = np.zeros((1, data.cc.shape[1]))
                    cc[0, ccmap[has]] = C[has]
                rows.append(model.lin(C[None, :], cc)[0])
    if len(rows) < 6:
        return None
    Q = np.array(rows)
    return np.concatenate([Q, np.zeros((len(Q), 1))], axis=1)  # beta's column: a deck's strength has no play term


def deck_strengths(model: Linear, data: Data, cube: str, theta: Optional[np.ndarray] = None) -> Optional[np.ndarray]:
    """Each in-cube deck's strength under the model (at its MAP, or at `theta`)."""
    Q = cube_decks(model, data, cube)
    return None if Q is None else Q @ (model.theta if theta is None else theta)


def win_rates(S: np.ndarray, beta: float, ref: Optional[np.ndarray] = None) -> np.ndarray:
    """Each deck's predicted win rate against the cube's other decks (or the `ref` subset of them), play and draw averaged."""
    ref = np.arange(len(S)) if ref is None else ref
    diff = S[:, None] - S[ref][None, :]
    P = (sigmoid(diff + beta) + sigmoid(diff - beta)) / 2
    self_ = (np.arange(len(S))[:, None] == ref[None, :])
    P[self_] = 0
    return P.sum(1) / np.maximum((~self_).sum(1), 1)


def spread(S: np.ndarray, beta: float, ref: Optional[np.ndarray] = None) -> Dict[str, float]:
    """Each deck's predicted win rate against the cube's other decks, play and draw averaged; their SD and IQR."""
    r = win_rates(S, beta, ref)
    return {"decks": int(len(S)), "sd": float(r.std(ddof=1)), "iqr": float(np.percentile(r, 75) - np.percentile(r, 25)),
            "best": float(r.max()), "worst": float(r.min())}


def balance_posterior(model: Linear, Q: np.ndarray, cov: np.ndarray, draws: int, seed: int, ref_max: int = 400) -> Dict[str, Any]:
    """The balance number DE-BIASED for shrinkage (D342; review 2, N2).

    The spread of the MAP's predicted win rates is biased toward "balanced", by an amount that shrinks with the
    games a cube has: the posterior mean of every card is pulled toward 0.  By the law of total variance the
    spread of the decks' TRUE strengths is the spread of their posterior means plus the posterior variance the
    shrinkage left out, so the number is computed over draws theta_s ~ N(theta_hat, Sigma) (the Laplace
    posterior) and reported as sqrt(mean_s SD_s^2), with the 2.5-97.5% of SD_s as its interval.
    `reliability` = SD(MAP)^2 / that^2 is the share of the spread the data has pinned down: compare two cubes'
    balance only when their reliabilities are alike (a sample-size caveat, not a correction)."""
    rng = np.random.default_rng(seed)
    K = len(Q)
    ref = np.sort(rng.choice(K, ref_max, replace=False)) if K > ref_max else None
    point = spread(Q @ model.theta, model.beta, ref)
    # draw only along the columns a deck touches (plus beta): the rest cannot move a strength
    cols = np.nonzero(np.abs(Q).sum(0) > 0)[0]
    cols = np.union1d(cols, [len(model.theta) - 1])
    Sc = cov[np.ix_(cols, cols)]
    L = np.linalg.cholesky(Sc + 1e-12 * np.eye(len(cols)) * max(1.0, float(np.abs(np.diag(Sc)).max())))
    sds, rates = [], []
    for _ in range(draws):
        th = model.theta.copy()
        th[cols] += L @ rng.standard_normal(len(cols))
        r = win_rates(Q @ th, float(th[-1]), ref)
        sds.append(r.std(ddof=1))
        rates.append(r)
    sds = np.array(sds)
    deb = float(np.sqrt(np.mean(sds ** 2)))
    noise = float(np.sqrt(np.mean(np.var(np.array(rates), axis=0, ddof=1))))
    return {**point, "sdShrunk": point["sd"], "sd": deb, "sdLo": float(np.percentile(sds, 2.5)), "sdHi": float(np.percentile(sds, 97.5)),
            "deckSdPost": noise, "reliability": float(point["sd"] ** 2 / deb ** 2) if deb > 0 else float("nan"), "draws": draws}


def bridge_composition(games: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Per bridge deck, the share of its nonbasic cards from each source cube; per pair, the mean and the lopsided decks."""
    pairs: Dict[str, Dict[str, Any]] = {}
    seen = set()
    for r in games:
        if r["kind"] != "bridge":
            continue
        frm = r.get("from") or {}
        lo, hi = r["cubes"][0], r["cubes"][1]
        p = pairs.setdefault("+".join(r["cubes"]), {"decks": 0, "shares": [], "cards": {lo: set(), hi: set()}})
        for side in ("A", "B"):
            key = (r["draft"], side)
            if key in seen:
                continue
            seen.add(key)
            names = [n for n in r["deck" + side] if n not in MD.BASICS]
            cnt = {c: 0 for c in r["cubes"]}
            for n in names:
                c = frm.get(n)
                if c in cnt:
                    cnt[c] += r["deck" + side][n]
                    p["cards"].setdefault(c, set()).add(n)
            tot = sum(cnt.values())
            if tot:
                p["decks"] += 1
                p["shares"].append(cnt[lo] / tot)
    out = {}
    for k, p in sorted(pairs.items()):
        sh = np.array(p["shares"])
        out[k] = {"decks": p["decks"], "firstCubeShareMean": round(float(sh.mean()), 3) if len(sh) else None,
                  "decksOver75FromOneSide": int(((sh > 0.75) | (sh < 0.25)).sum()),
                  "distinctCardsPlayed": {c: len(v) for c, v in p["cards"].items()}}
    return out


# ------------------------------------------------------------------ train command

def table(title: str, preds: Dict[str, np.ndarray], data: Data, idx: np.ndarray) -> List[str]:
    out = [f"### {title}", "", f"{len(idx)} games from {len({data.drafts[i] for i in idx})} drafts.", ""]
    if len(idx) == 0:
        return out + ["(none)", ""]
    out += ["| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |", "|---|---|---|---|---|---|"]
    y = data.y[idx]
    groups = [data.drafts[i] for i in idx]
    for nm, p in preds.items():
        m = metrics(p[idx], y)
        ci = "" if nm.startswith("(a)") else "{:+.4f} [{:+.4f}, {:+.4f}]".format(*paired_ci(p[idx], preds["(a) coin"][idx], y, groups))
        out.append(f"| {nm} | {m['logloss']:.4f} | {m['brier']:.4f} | {m['acc']:.3f} | {m['ece']:.3f} | {ci} |")
    return out + [""]


def fit_ladder(X, data, tr, va, h, embed: int, seed: int) -> Tuple[Dict[str, np.ndarray], Dict[str, Any]]:
    preds: Dict[str, np.ndarray] = {}
    info: Dict[str, Any] = {}
    preds["(a) coin"] = coin(data, tr)
    fitset = np.concatenate([tr, va])  # cross-validation inside picks the widths, so validation games can train the linear models
    excl = h.get("excl")
    bt = Linear(None, data, False, excl)
    by = h.get("tauBy", "cv")
    bt.select(fitset, h["tauGrid"], [1.0], [1.0], by=by)
    preds["(b) additive: Bradley-Terry on cards"] = bt.predict()
    info["bt"] = bt
    if "land" in h:
        preds["(c) per-cube shrunk win rates (meta.json)"] = per_cube(data, fitset, h["land"], h["shrinkK"])
    m0 = Linear(X, data, False, excl)
    info["m0grid"] = m0.select(fitset, h["tauGrid"], h["tauWGrid"], [1.0], by=by)
    preds["M0 pooled BT + feature prior"] = m0.predict()
    info["m0"] = m0
    m1 = Linear(X, data, True, excl)
    m1.select(fitset, [m0.taus[0]], [m0.taus[1]], h["tauCubeGrid"], by=by)
    preds["M1 = M0 + per-cube deviations"] = m1.predict()
    info["m1"] = m1
    if embed > 0:
        pm2 = embed_model(X, data, tr, va, embed, m0.taus[0], m0.taus[1], seed)
        if pm2 is not None:
            preds[f"M2 = M0 + {embed}-dim embeddings"] = pm2(np.arange(len(data.y)))
    return preds, info


def train_cmd(a: argparse.Namespace) -> int:
    if np is None:
        print("matchup.py: needs numpy -- skipped")
        return 0
    h = dict(DEFAULTS)
    os.makedirs(a.out, exist_ok=True)
    import reserved as R
    res = {} if a.keep_reserved else R.reserved_decks(a.repo)
    games, st = MD.collect(a.paths, reserved=res, vers=[v for v in a.ver.split(",") if v] or None)
    print(f"reserved decks (D340): {len(res)} deck-set decks; {st['reserved']} game(s) played with one dropped; "
          f"{st['otherVersion']} game(s) of other lab versions left out")
    if len(games) < 20:
        print(f"matchup.py: only {len(games)} decisive games -- need more")
        return 1
    with open(os.path.join(a.out, "games.jsonl"), "w", encoding="utf-8") as fh:
        for r in games:
            fh.write(json.dumps(r, sort_keys=True) + "\n")
    cubes = MD.cube_lists(a.repo)
    vocab = sorted(set(n for r in games for d in (r["deckA"], r["deckB"]) for n in d) | set(n for v in cubes.values() for n in v))
    facts = MD.load_facts(a.facts)
    info = MD.load_run_cards(MD.find_runs(a.paths))
    X, feat = build_features(vocab, facts, info)
    data = Data(games, vocab)
    land = np.array([bool(facts.get(n, {}).get("land", info.get(n, {}).get("land", n in MD.BASICS))) for n in vocab])
    h["land"] = land
    flags = MD.ai_flags(vocab, facts, info, a.repo)
    excl = np.array([flags.get(n) == "All" for n in vocab]) if not a.rate_ai_limited else np.zeros(len(vocab), dtype=bool)
    h["excl"] = excl
    vc = MD.version_counts(games)
    per_draft: Dict[str, int] = {}
    for r in games:
        per_draft[r["draft"]] = per_draft.get(r["draft"], 0) + 1
    h["tauBy"] = a.tau_by if a.tau_by != "auto" else ("evidence" if max(per_draft.values()) == 1 else "cv")
    tr, va, te = data.idx(data.split == "train"), data.idx(data.split == "val"), data.idx(data.split == "test")
    nb = int((data.kind == "bridge").sum())
    print(f"{len(games)} games ({nb} bridge), {len(set(data.drafts))} drafts; train {len(tr)} / val {len(va)} / test {len(te)}; "
          f"{len(vocab)} cards ({len(feat['noFacts'])} without engine facts)")
    preds, fit = fit_ladder(X, data, tr, va, h, a.embed, a.seed)
    m0, m1 = fit["m0"], fit["m1"]
    L = ["# Matchup model: held-out results", "",
         f"**Sample:** {len(games)} decisive games ({nb} bridge) from {len(set(data.drafts))} drafts in {st['runs']} run folder(s); "
         f"{st['duplicates']} duplicate game(s) skipped. Split by draft: {len(tr)} train, {len(va)} validation, {len(te)} test games. "
         f"{len(vocab)} cards, {len(feat['noFacts'])} of them without engine facts. "
         f"Deck-set decks (D340): {st['reserved']} game(s) dropped. Lab versions (D341): "
         + ", ".join(f"`{v}` {n}" for v, n in sorted(vc.items())) + ". "
         f"AI-limited (Forge AI:RemoveDeck:All, D343): {int(excl.sum())} card(s) not rated, one shared column instead "
         f"(their per-copy effect in Forge's games: {m0.ai_coef:+.3f} logits).", "",
         f"**Prior widths by {'5-fold cross-validation grouped by draft' if h['tauBy'] == 'cv' else 'the Laplace evidence (one game per draft, D342)'}:** M0 tau = {m0.taus[0]} logits per card copy (deck-difference prior SD "
         f"{m0.taus[0] * math.sqrt(46):.2f}), tauW = {m0.taus[1]}; M1 tauCube = {m1.taus[2]}; plain BT tau = {fit['bt'].taus[0]}. "
         f"Play/draw: beta = {m0.beta:+.3f} logits.", ""]
    L += table("Held-out drafts, all games (test split)", preds, data, te)
    L += table("Held-out drafts, in-cube games", preds, data, te[data.kind[te] == "normal"])
    L += table("Held-out drafts, bridge games", preds, data, te[data.kind[te] == "bridge"])
    mt = metrics(preds["M0 pooled BT + feature prior"][te], data.y[te])
    L += ["Calibration of M0 on the test split:", "", "| bin | games | predicted | observed |", "|---|---|---|---|"]
    L += [f"| {c[0]:.1f}-{c[0] + 0.1:.1f} | {c[1]} | {c[2]} | {c[3]} |" for c in mt["calibration"]] + [""]

    # Out-of-fold over EVERY game: 5 folds by draft, each predicted by a ladder fitted on the other four (its prior
    # widths chosen inside, by the same grouped cross-validation).  The test split above is a few dozen games; this
    # uses them all, and is the number to read while the corpus is small.
    oof: Dict[str, np.ndarray] = {}
    if a.oof:
        fold = np.array([int(hashlib.sha1(("oof" + dr).encode()).hexdigest()[:8], 16) % 5 for dr in data.drafts])
        for k in range(5):
            trk = data.idx(fold != k)
            inner = np.array([split_of("in" + data.drafts[i]) == "val" for i in trk])
            pk, _ = fit_ladder(X, data, trk[~inner], trk[inner], h, a.embed, a.seed + k)
            for nm, p in pk.items():
                oof.setdefault(nm, np.zeros(len(games)))[fold == k] = p[fold == k]
        alli = np.arange(len(games))
        L += table("Out-of-fold, every game (5 folds by draft)", oof, data, alli)
        L += table("Out-of-fold, in-cube games", oof, data, alli[data.kind == "normal"])
        L += table("Out-of-fold, bridge games", oof, data, alli[data.kind == "bridge"])

    held: Dict[str, Any] = {}
    hold = sorted(cubes) if a.holdout_cubes == "all" else [x for x in (a.holdout_cubes or "").split(",") if x]
    if hold:
        L += ["## Cubes held out entirely", "",
              "A fit with every game touching the cube removed (its drafts and its bridges), scored on all of the cube's in-cube games. "
              "Its cards are known only from other cubes' games and from their features. (c) cannot rate an unseen cube.", "",
              "| cube | games | drafts | coin | additive | M0 | M1 | M0 minus coin [95% CI] |", "|---|---|---|---|---|---|---|---|"]
        for cube in hold:
            touch = np.array([cube in r["cubes"] for r in games])
            ti = data.idx(touch & (data.kind == "normal"))
            if len(ti) < 10:
                L.append(f"| {cube} | {len(ti)} | | | | | | too few games |")
                continue
            rest = data.idx(~touch)
            rv = np.array([split_of("v" + data.drafts[i]) == "val" for i in rest])
            no_c = {k: v for k, v in h.items() if k != "land"}  # (c) has no ratings for a cube it never saw
            p2, _ = fit_ladder(X, data, rest[~rv], rest[rv], no_c, a.embed, a.seed)
            y = data.y[ti]
            groups = [data.drafts[i] for i in ti]
            row = {k: metrics(p[ti], y)["logloss"] for k, p in p2.items()}
            ci = paired_ci(p2["M0 pooled BT + feature prior"][ti], p2["(a) coin"][ti], y, groups)
            held[cube] = {"games": int(len(ti)), "drafts": len(set(groups)), "logloss": row, "m0VsCoin": ci}
            L.append(f"| {cube} | {len(ti)} | {len(set(groups))} | {row['(a) coin']:.4f} | {row['(b) additive: Bradley-Terry on cards']:.4f} | "
                     f"{row['M0 pooled BT + feature prior']:.4f} | {row['M1 = M0 + per-cube deviations']:.4f} | {ci[0]:+.4f} [{ci[1]:+.4f}, {ci[2]:+.4f}] |")
        L.append("")

    # power: M0 on train + validation.  Its SD is the Laplace POSTERIOR SD (D342): sqrt(diag(A H^-1 A')) at the
    # MAP; the bootstrap over training drafts is kept beside it as sdBoot, a misspecification check only (it
    # measures how much the shrunk estimate moves, ~0 for a card with no games: review 2, N1).
    fitset = np.concatenate([tr, va])
    boots = bootstrap_power(m0, fitset, a.boot, a.seed) if a.boot > 1 else None
    in_cube = set(n for v in cubes.values() for n in v)
    centre = np.array([vocab[i] in in_cube and not land[i] for i in range(len(vocab))])
    pw = m0.power() - m0.power()[centre].mean()
    prior = m0.prior_power() - m0.prior_power()[centre].mean()
    sd_post = m0.power_sd_post(centre)
    sd_boot = (boots - boots[:, centre].mean(1, keepdims=True)).std(0, ddof=1) if boots is not None else np.full(len(vocab), np.nan)
    games_one = ((data.CA[fitset] > 0) ^ (data.CB[fitset] > 0)).sum(0)
    ai_col = ["limited" if excl[i] else ("random" if flags.get(vocab[i]) == "Random" else "") for i in range(len(vocab))]
    listed: Dict[str, List[str]] = {}
    for cid, names in cubes.items():
        for n in names:
            listed.setdefault(n, []).append(cid)
    order = np.argsort(-pw)
    with open(os.path.join(a.out, "power.tsv"), "w", encoding="utf-8") as fh:
        fh.write("# matchup model M0: card power in logits per copy, relative to the average nonland card of the committed cubes\n")
        fh.write("# points = power x 25 (win-rate points at even odds); sdPost = the Laplace posterior SD (D342: use this one);\n")
        fh.write("# sdBoot = SD over refits on bootstrap resamples of the training DRAFTS (a misspecification check: it understates the\n")
        fh.write("# uncertainty of a shrunk estimate, most for the least-seen cards); prior = what the features alone predict;\n")
        fh.write("# ai = limited: Forge's AI:RemoveDeck:All, NOT RATED -- power is its feature prior, never a verdict (D343); random: AI:RemoveDeck:Random.\n")
        fh.write(f"# games = games with the card in exactly one deck. tau {m0.taus[0]}, tauW {m0.taus[1]}, {len(fitset)} games.\n")
        fh.write("name\tpower\tsdPost\tsdBoot\tpoints\tprior\tgames\tland\tai\tcubes\n")
        for i in order:
            fh.write(f"{vocab[i]}\t{pw[i]:.4f}\t{sd_post[i]:.4f}\t{sd_boot[i]:.4f}\t{pw[i] * 25:.2f}\t{prior[i]:.4f}\t{int(games_one[i])}\t{int(land[i])}\t{ai_col[i]}\t{','.join(sorted(listed.get(vocab[i], [])))}\n")
    with open(os.path.join(a.out, "cube-dev.tsv"), "w", encoding="utf-8") as fh:
        fh.write("name\tcube\tdeviation\n")
        for (c, cb), j in sorted(data.cc_index.items(), key=lambda kv: -abs(m1.d[kv[1]])):
            fh.write(f"{vocab[c]}\t{cb}\t{m1.d[j]:.4f}\n")

    # balance: M1's deck strengths, de-biased over the Laplace posterior (D342)
    bal: Dict[str, Any] = {}
    cov1 = m1.posterior_cov()
    L += ["## Balance: the predicted win-rate spread of the decks each cube produces", "",
          "Every deck the cube produced in the data, against the cube's other decks (at most "
          f"{DEFAULTS['balanceRef']} of them), play and draw averaged; the SD across decks in win-rate points. **SD** is de-biased for "
          "shrinkage (D342): sqrt of the mean, over "
          f"{a.balance_draws} draws from M1's Laplace posterior, of the squared SD, with the 2.5-97.5% of the draws as its "
          "interval. **Shrunk** is the old number, the SD of the MAP's predictions, which is biased toward \"balanced\" by an amount that "
          "depends on the games a cube has. **Reliability** = shrunk^2 / SD^2, the share of the spread the data has pinned down: "
          "**compare two cubes only when their reliabilities are alike** -- otherwise the ranking is partly a ranking by sample size.", "",
          "| cube | decks | SD (points) | 95% interval | shrunk | reliability | a deck's posterior SD | best deck | worst deck |",
          "|---|---|---|---|---|---|---|---|---|"]
    for cube in sorted(cubes):
        Q = cube_decks(m1, data, cube)
        if Q is None:
            continue
        b = balance_posterior(m1, Q, cov1, a.balance_draws, a.seed, DEFAULTS["balanceRef"])
        bal[cube] = b
        L.append(f"| {cube} | {b['decks']} | {b['sd'] * 100:.1f} | {b['sdLo'] * 100:.1f}-{b['sdHi'] * 100:.1f} | {b['sdShrunk'] * 100:.1f} | "
                 f"{b['reliability']:.2f} | {b['deckSdPost'] * 100:.1f} | {b['best'] * 100:.1f}% | {b['worst'] * 100:.1f}% |")
    L.append("")
    comp = bridge_composition(games)
    L += ["## Bridge decks: how much of each deck came from each cube", "",
          "`first` is the pair's lower-power cube (queue.ts orders pairs that way). A share near 0 means the drafters took the stronger cube's cards.", "",
          "| pair | decks | mean share from first cube | decks >75% one side | distinct cards played per cube |", "|---|---|---|---|---|"]
    for k, v in comp.items():
        L.append(f"| {k} | {v['decks']} | {v['firstCubeShareMean']} | {v['decksOver75FromOneSide']} | {v['distinctCardsPlayed']} |")
    ov = MD.overlap_report(games, cubes)
    L += ["", "## Overlap", "", "```", json.dumps(ov, indent=1), "```", "",
          "## Strongest and weakest cards (M0 power; x25 for win-rate points)", "",
          "AI-limited cards are not ranked (D343). sdPost is the posterior SD; act on a card only where it is below about tau/2 (review 2, N7).", "",
          "| card | power | sdPost | sdBoot | prior | games | cubes |", "|---|---|---|---|---|---|---|"]
    nl = [i for i in order if not land[i] and games_one[i] > 0 and not excl[i]]
    for i in nl[:12] + nl[-6:]:
        L.append(f"| {vocab[i]} | {pw[i]:+.3f} | {sd_post[i]:.3f} | {sd_boot[i]:.3f} | {prior[i]:+.3f} | {int(games_one[i])} | {','.join(sorted(listed.get(vocab[i], [])))} |")
    lim = [vocab[i] for i in range(len(vocab)) if excl[i] and games_one[i] > 0]
    if lim:
        L += ["", f"AI-limited, not rated ({len(lim)} with games): " + " · ".join(sorted(lim))]
    L.append("")
    with open(os.path.join(a.out, "report.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    test = {k: {kk: vv for kk, vv in metrics(p[te], data.y[te]).items() if kk != "calibration"} for k, p in preds.items()}
    with open(os.path.join(a.out, "balance.json"), "w", encoding="utf-8") as fh:
        json.dump({"sample": {"games": len(games), "bridgeGames": nb, "drafts": len(set(data.drafts)), "train": len(tr), "val": len(va), "test": len(te)},
                   "taus": {"m0": m0.taus, "m1": m1.taus, "bt": fit["bt"].taus}, "test": test, "heldOutCubes": held,
                   "outOfFold": {k: {kk: vv for kk, vv in metrics(p, data.y).items() if kk != "calibration"} for k, p in oof.items()},
                   "balance": bal, "bridge": comp, "overlap": ov, "reserved": {"games": st["reserved"], "decks": st["reservedDecks"]},
                   "versions": vc, "aiLimited": {"cards": int(excl.sum()), "coef": m0.ai_coef}}, fh, indent=1)
    with open(os.path.join(a.out, "model.json"), "w", encoding="utf-8") as fh:
        json.dump({"vocab": vocab, "features": feat, "X": X.round(5).tolist(), "m0": {"theta": m0.theta.tolist(), "taus": m0.taus, "F": m0.F},
                   "m1": {"theta": m1.theta.tolist(), "taus": m1.taus, "cc": [[vocab[c], cb, j] for (c, cb), j in data.cc_index.items()]},
                   "power": dict(zip(vocab, pw.round(5).tolist())), "powerSdPost": dict(zip(vocab, sd_post.round(5).tolist())),
                   "powerSdBoot": dict(zip(vocab, np.nan_to_num(sd_boot).round(5).tolist())), "tau": m0.taus[0],
                   "aiLimited": {n: f for n, f in flags.items()}, "versions": vc,
                   "land": dict(zip(vocab, land.tolist())), "facts": {n: facts.get(n) for n in vocab}}, fh)
    print("\n".join(L))
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("train")
    t.add_argument("paths", nargs="+")
    t.add_argument("--out", required=True)
    t.add_argument("--facts", nargs="*", default=["var/cubelab/facts"])
    t.add_argument("--holdout-cubes", default="")
    t.add_argument("--boot", type=int, default=DEFAULTS["boot"])
    t.add_argument("--embed", type=int, default=0, help="M2's embedding size (needs torch); 0 = off")
    t.add_argument("--oof", type=int, default=1, help="1: also score every game out-of-fold (5 folds by draft); 0: the test split only")
    t.add_argument("--seed", type=int, default=1)
    t.add_argument("--repo", default=".")
    t.add_argument("--keep-reserved", action="store_true", help="keep games played with an AI-ladder deck-set deck (default: drop them, D340)")
    t.add_argument("--ver", default="", help="train on these lab versions only (comma-separated ids from drafts.jsonl's `ver`; D341)")
    t.add_argument("--rate-ai-limited", action="store_true", help="rate AI:RemoveDeck:All cards like any other (default: not rated, D343)")
    t.add_argument("--tau-by", choices=("auto", "cv", "evidence"), default="auto",
                   help="how the prior widths are chosen: evidence (type-II ML; sound with one game per draft), cv (grouped by draft; "
                        "D324's, for best-of-three runs), auto (evidence when every draft has one decisive game, else cv; D342)")
    t.add_argument("--balance-draws", type=int, default=DEFAULTS["balanceDraws"], help="posterior draws for the de-biased balance number")
    d = sub.add_parser("design")
    d.add_argument("--model", required=True, help="a train --out folder")
    d.add_argument("--target-cube", required=True)
    d.add_argument("--size", type=int, default=180)
    d.add_argument("--iters", type=int, default=20000)
    d.add_argument("--max-swaps", type=int, default=20, help="at most this many cards changed from the target cube")
    d.add_argument("--verify-seed", type=int, default=800_000_000,
                   help="first seed of the verification job it prints (the 800,000,000+ range, seeds.ts); give each candidate its own block")
    d.add_argument("--seed", type=int, default=1)
    d.add_argument("--out", required=True)
    d.add_argument("--repo", default=".")
    a = ap.parse_args(argv)
    if a.cmd == "train":
        return train_cmd(a)
    import matchup_design
    return matchup_design.design_cmd(a)


if __name__ == "__main__":
    sys.exit(main())
