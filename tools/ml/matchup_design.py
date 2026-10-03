# mtg-table — tools/ml: `matchup.py design`, a candidate cube from the matchup model (a prototype).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Propose a cube pool with the matchup model as a fast surrogate.  A CANDIDATE, never a verdict.

    python3 tools/ml/matchup.py design --model var/ml/matchup --target-cube synergy --out var/ml/design/synergy-v1.md

Starts from the target cube's own list and swaps cards in from the whole card
population of the committed cubes (every card the model has a power for),
always within one colour class (a white card for a white card, a WU gold card
for a WU gold card, colourless for colourless, a land for a land), so the
colour counts and every pair's gold signposts stay exactly as the target
cube has them.  It minimises

    wTarget * (mean nonland power - the target cube's mean)^2         the power level
  + wFlat   * SD of nonland power                                      no bombs, no duds
  + wArch   * SD over the ten colour pairs of the pair's deck strength the archetypes even
  + wViable * pairs with fewer than 30 castable nonland cards           every archetype viable
  + wUnc    * mean POSTERIOR SD of the pool's cards (sdPost, D342)    prefer cards the data knows
  + wSwap   * swaps from the target cube                                change only what the model is sure of

where a pair's deck strength is the summed power of the 23 best nonland
cards castable in it (its two colours, its gold cards, colourless) -- a
proxy for the deck a drafter would build, not a drafted deck.  Simulated
annealing over random in-class swaps, seeded, so a run is repeatable, with at
most `--max-swaps` (20) cards changed, candidates only from cubes at or below
the target's power tier (TIER), and a small cost per swap.  Without those
guards the first prototype rewrote 144 of synergy's 180 cards on powers that
were noise, dropped its sacrifice theme and added Black Lotus.  The themes
are not in the objective: a swap keeps a card's colour class, not its role,
so read the swap table before playing a candidate.

GUARDS ADDED BY REVIEW 2 (D342-D344).  The uncertainty term reads the Laplace
posterior SD: the old bootstrap SD was ~0 for a card with no games, so the
penalty pushed the optimiser TOWARD the least-known cards.  An AI-limited card
(Forge's AI:RemoveDeck, All or Random: the cube documents' notes, the engine
facts) is never swapped out -- its Forge games are not evidence about it -- and
an AI:RemoveDeck:All card is never swapped in (it has no rating).  Three-colour
cards stay in the pool, locked, so the candidate keeps the target's size.  And
the verification is a pre-registered, group-sequential test
(matchup_verify.py): the written cube prints the exact job and its rule.

WHY IT IS ONLY A CANDIDATE.  An optimiser over a surrogate exploits the
surrogate's errors (the optimiser's curse): it will favour cards whose power
the model happens to overrate.  The uncertainty term damps that, but only the
cube lab can say whether the proposed pool is balanced: draft it on FRESH
seeds, never the ones that trained the model, and judge it by the lab's own
numbers.  The written cube says so at its top and gives the commands.  It also
inherits every bias of Forge's AI (it is balanced for Forge pilots).
"""
from __future__ import annotations

import json
import math
import os
import random
from typing import Any, Dict, List

import matchup_data as MD
import matchup_verify as MV

VERIFY_SEED_MIN = 800_000_000  # tools/cubelab/seeds.ts: the verification range, never the queue's

PAIRS = ["WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG"]
SECTION = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}
W = {"wTarget": 400.0, "wFlat": 4.0, "wArch": 1.5, "wViable": 1.0, "wUnc": 6.0, "wSwap": 0.0005}
# Power tiers, as tools/cubelab/queue.ts's TIERS: a candidate comes from a cube at or below the target's tier, so a
# card the model has not yet learned is strong (Black Lotus, with a handful of games) cannot slip into a flatter cube.
TIER = {"pauper": 0, "peasant": 0, "fair-fight": 0, "synergy": 1, "modern-era": 1, "omega": 2, "vintage": 2}


def colour_class(name: str, fact: Dict[str, Any], land: bool) -> str:
    if land:
        return "land"
    cols = "".join(c for c in "WUBRG" if c in (fact or {}).get("colors", ""))
    if len(cols) == 0:
        return "colorless"
    if len(cols) == 1:
        return cols
    if len(cols) == 2:
        return cols
    return "multi"


def objective(pool: List[str], power: Dict[str, float], sd: Dict[str, float], cls: Dict[str, str], target: float,
              start: frozenset = frozenset()) -> Dict[str, float]:
    nl = [n for n in pool if cls[n] != "land"]
    ps = [power[n] for n in nl]
    mean = sum(ps) / len(ps)
    flat = math.sqrt(sum((p - mean) ** 2 for p in ps) / (len(ps) - 1))
    strengths, short = [], 0
    for pair in PAIRS:
        ok = [power[n] for n in nl if cls[n] == "colorless" or cls[n] in (pair[0], pair[1], pair)]
        if len(ok) < 30:
            short += 1
        strengths.append(sum(sorted(ok, reverse=True)[:23]))
    ms = sum(strengths) / len(strengths)
    arch = math.sqrt(sum((x - ms) ** 2 for x in strengths) / (len(strengths) - 1))
    unc = sum(sd.get(n, 0.0) for n in nl) / len(nl)
    swaps = sum(1 for n in pool if n not in start) if start else 0
    total = W["wTarget"] * (mean - target) ** 2 + W["wFlat"] * flat + W["wArch"] * arch + W["wViable"] * short + W["wUnc"] * unc + W["wSwap"] * swaps
    return {"total": total, "swaps": swaps, "meanPower": mean, "flatSd": flat, "archSd": arch, "shortPairs": short, "meanSd": unc,
            "pairStrength": dict(zip(PAIRS, [round(x, 3) for x in strengths]))}


def design_cmd(a) -> int:
    with open(os.path.join(a.model, "model.json"), encoding="utf-8") as fh:
        m = json.load(fh)
    if "powerSdPost" not in m:
        raise SystemExit(f"{a.model}/model.json predates D342: its powerSd is a bootstrap of shrunk estimates (about 0 for the "
                         "least-seen cards, so the uncertainty penalty would favour them) -- retrain with tools/ml/matchup.py train")
    power, sd, land, facts = m["power"], m["powerSdPost"], m["land"], m["facts"]
    ai = dict(m.get("aiLimited") or {})
    ai.update(MD.ai_flags(list(power), {}, {}, a.repo))  # the cube documents' notes, too
    cubes = MD.cube_lists(a.repo)
    if a.target_cube not in cubes:
        raise SystemExit(f"no committed cube {a.target_cube} (have {', '.join(sorted(cubes))})")
    tier = TIER.get(a.target_cube, 1)
    allowed = {c for c in cubes if TIER.get(c, 1) <= tier}
    population = sorted({n for c in allowed for n in cubes[c] if n in power and n not in MD.BASICS and ai.get(n) != "All"}
                        | {n for n in cubes[a.target_cube] if n in power})
    cls = {n: colour_class(n, facts.get(n) or {}, bool(land.get(n))) for n in population}
    start = [n for n in cubes[a.target_cube] if n in cls]
    locked = {n for n in start if cls[n] == "multi" or n in ai}
    target = sum(power[n] for n in start if cls[n] != "land") / max(1, sum(cls[n] != "land" for n in start))
    by_class: Dict[str, List[str]] = {}
    for n in population:
        if n not in locked:
            by_class.setdefault(cls[n], []).append(n)
    rng = random.Random(a.seed)
    pool = list(start)
    free = [i for i, n in enumerate(pool) if n not in locked]
    st = frozenset(start)
    cur = objective(pool, power, sd, cls, target, st)
    first = dict(cur)
    temp = 0.05 * cur["total"]
    for it in range(a.iters):
        i = rng.choice(free)
        cands = [n for n in by_class.get(cls[pool[i]], []) if n not in pool]
        if not cands:
            continue
        new = list(pool)
        new[i] = rng.choice(cands)
        if sum(1 for n in new if n not in st) > a.max_swaps:
            continue
        nxt = objective(new, power, sd, cls, target, st)
        t = temp * (1 - it / a.iters) + 1e-9
        if nxt["total"] < cur["total"] or rng.random() < math.exp((cur["total"] - nxt["total"]) / t):
            pool, cur = new, nxt
    added = [n for n in pool if n not in start]
    cut = [n for n in start if n not in pool]
    assert not (set(cut) & locked), "a locked (AI-limited or three-colour) card was cut"
    write_ratings(a.out, a.repo, a.target_cube, pool, cubes)
    job = verify_job(a.out, a.target_cube, a.verify_seed)
    write_cube(a.out, a.target_cube, pool, cls, power, sd, first, cur, added, cut, len(start), sorted(locked & set(ai)), job)
    print(f"{a.out}: {len(added)} swap(s) from {a.target_cube}; objective {first['total']:.3f} -> {cur['total']:.3f}; "
          f"archetype SD {first['archSd']:.3f} -> {cur['archSd']:.3f}; card SD {first['flatSd']:.3f} -> {cur['flatSd']:.3f}; "
          f"{len(locked & set(ai))} AI-limited card(s) locked in")
    print("\nVERIFICATION (pre-registered; one candidate costs about one PC night):\n" + job)
    return 0


def write_ratings(out: str, repo: str, target: str, pool: List[str], cubes: Dict[str, List[str]]) -> None:
    """<out>.ratings.tsv: each pool card's rating from the committed cubes' ratings files (the target's first), so the
    candidate is drafted with the same ratings its cards had -- the two arms differ in the list, not in the drafters."""
    rate: Dict[str, str] = {}
    for cid in [target] + sorted(c for c in cubes if c != target):
        f = os.path.join(repo, "cubes", f"{cid}-cube-180.ratings.tsv")
        if not os.path.exists(f):
            continue
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                if line.strip() and not line.startswith("#"):
                    rate.setdefault(line.split("\t")[0], line.rstrip("\n"))
    rows = [rate[n] for n in pool if n in rate]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out[:-3] + ".ratings.tsv" if out.endswith(".md") else out + ".ratings.tsv", "w", encoding="utf-8") as fh:
        fh.write(f"# cube lab ratings for the matchup-model candidate {os.path.basename(out)}: each card's row from the committed cubes' files\n")
        fh.write("# (the target cube's first), so both verification arms draft with the same ratings (matchup_design.py)\n")
        fh.write("\n".join(rows) + "\n")


def verify_job(out: str, target: str, seed: int) -> str:
    """The exact verification job: both arms on the same fresh seeds, a look after every quarter, matchup_verify's rule."""
    pre = MV.PRE
    name = os.path.basename(out)[:-3] if out.endswith(".md") else os.path.basename(out)
    vdir = f"var/cubelab/verify/{name}"
    step = pre["perArm"] // pre["looks"]
    bounds = ", ".join(f"{MV.bound(k, pre['looks'], pre['alpha']):.2f}" for k in range(1, pre["looks"] + 1))
    return "\n".join([
        f"# Pre-registered test (matchup_verify.py, D344): H1 = {name} has a smaller between-archetype variance of win rates",
        f"# than {target}. Both arms: grid, one game per draft, Default pilots, the same fresh seeds {seed}.., {pre['perArm']} drafts",
        f"# per arm at most, a look every {step}; accept only if z = (v_orig - v_cand) / SE crosses the O'Brien-Fleming bound",
        f"# ({bounds} at looks 1-{pre['looks']}; one-sided alpha {pre['alpha']}); stop and keep the original if z < 0 from look {pre['futilityFrom']}",
        "# or the last look is below its bound. Decide nothing between looks. Write this block into the PC job BEFORE look 1.",
        f"for k in $(seq 1 {pre['looks']}); do",
        f"  n=$((k * {step}))",
        f"  tools/cubelab.sh run cubes/{target}-cube-180.md --drafts $n --games 1 --jobs 7 --seed {seed} --out {vdir}/orig || exit 1",
        f"  tools/cubelab.sh run {out} --drafts $n --games 1 --jobs 7 --seed {seed} --out {vdir}/cand || exit 1",
        f"  python3 tools/ml/matchup_verify.py test --orig {vdir}/orig --cand {vdir}/cand --per-arm {pre['perArm']} --looks {pre['looks']} --alpha {pre['alpha']}",
        "  rc=$?; [ $rc -eq 3 ] || break   # 3 = CONTINUE; 0 = decided (the line says ACCEPT or REJECT)",
        "done",
    ])


def write_cube(out: str, target: str, pool: List[str], cls: Dict[str, str], power, sd, first, cur, added, cut, n_start,
               ai_locked: List[str], job: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    L = [f"# Proposed cube — {target} power level, matchup-model draft ({len(pool)} cards)", "",
         "**PROPOSED BY MODEL, UNVERIFIED.** `tools/ml/matchup.py design` chose this list with the matchup model as a surrogate. "
         "An optimiser over a model exploits the model's errors, so treat every number below as a hypothesis. Only the cube lab "
         "can verify it, on fresh seeds that never trained the model (the verification range, 800,000,000+, tools/cubelab/seeds.ts), "
         "by the pre-registered test below (tools/ml/matchup_verify.py). **One candidate costs about one PC night** "
         f"(up to {MV.PRE['perArm']:,} drafts per arm; a clear improvement usually stops at look 2 or 3), so verify few.", "",
         "```bash", job, "```", "",
         "The test measures balance between archetypes and nothing else: before running it, a person reads the swap table for the "
         "cube's themes and roles (a swap keeps a card's colour class, not its role). It is balanced for Forge's AI, not for people.", "",
         "## What the model predicts (unverified)", "",
         "| | start | proposed |", "|---|---|---|",
         f"| mean card power (logits) | {first['meanPower']:+.4f} | {cur['meanPower']:+.4f} |",
         f"| card power SD | {first['flatSd']:.4f} | {cur['flatSd']:.4f} |",
         f"| colour-pair strength SD | {first['archSd']:.4f} | {cur['archSd']:.4f} |",
         f"| pairs short of playables | {first['shortPairs']} | {cur['shortPairs']} |",
         f"| mean card power posterior SD (uncertainty) | {first['meanSd']:.4f} | {cur['meanSd']:.4f} |", "",
         f"Swaps from the {n_start}-card start: {len(added)}. AI-limited cards locked in (never cut on Forge's evidence): "
         + (" · ".join(ai_locked) if ai_locked else "none") + ".", "",
         "| in | power | sdPost | out | power | sdPost |", "|---|---|---|---|---|---|"]
    out_by_cls = {c: [n for n in cut if cls[n] == c] for c in set(cls[n] for n in cut)}
    for n in sorted(added, key=lambda x: (cls[x], x)):
        o = out_by_cls.get(cls[n], [])
        c = o.pop(0) if o else ""
        L.append(f"| {n} | {power[n]:+.3f} | {sd.get(n, 0):.3f} | {c} | {power[c]:+.3f} | {sd.get(c, 0):.3f} |" if c else f"| {n} | {power[n]:+.3f} | {sd.get(n, 0):.3f} | | | |")
    L += ["", "## The list (name)", ""]
    for c in "WUBRG":
        names = sorted(n for n in pool if cls[n] == c)
        L += [f"### {SECTION[c]} ({len(names)})", " · ".join(names), ""]
    gold = [n for n in pool if len(cls[n]) == 2 and cls[n] not in ("land",)]
    L.append(f"### Gold ({len(gold)})")
    for p in PAIRS:
        names = sorted(n for n in gold if cls[n] == p)
        if names:
            L.append(f"{p}: " + " · ".join(names))
    L.append("")
    for title, c in (("Multicolor", "multi"), ("Colorless", "colorless"), ("Lands", "land")):
        names = sorted(n for n in pool if cls[n] == c)
        if names or c != "multi":
            L += [f"### {title} ({len(names)})", " · ".join(names), ""]
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
