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
  + wUnc    * mean bootstrap SD of the pool's cards                     prefer cards the data knows

where a pair's deck strength is the summed power of the 23 best nonland
cards castable in it (its two colours, its gold cards, colourless) -- a
proxy for the deck a drafter would build, not a drafted deck.  Simulated
annealing over random in-class swaps, seeded, so a run is repeatable.

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

PAIRS = ["WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG"]
SECTION = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}
W = {"wTarget": 400.0, "wFlat": 4.0, "wArch": 1.5, "wViable": 1.0, "wUnc": 6.0}


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


def objective(pool: List[str], power: Dict[str, float], sd: Dict[str, float], cls: Dict[str, str], target: float) -> Dict[str, float]:
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
    total = W["wTarget"] * (mean - target) ** 2 + W["wFlat"] * flat + W["wArch"] * arch + W["wViable"] * short + W["wUnc"] * unc
    return {"total": total, "meanPower": mean, "flatSd": flat, "archSd": arch, "shortPairs": short, "meanSd": unc,
            "pairStrength": dict(zip(PAIRS, [round(x, 3) for x in strengths]))}


def design_cmd(a) -> int:
    with open(os.path.join(a.model, "model.json"), encoding="utf-8") as fh:
        m = json.load(fh)
    power, sd, land, facts = m["power"], m["powerSd"], m["land"], m["facts"]
    cubes = MD.cube_lists(a.repo)
    if a.target_cube not in cubes:
        raise SystemExit(f"no committed cube {a.target_cube} (have {', '.join(sorted(cubes))})")
    population = sorted({n for v in cubes.values() for n in v if n in power and n not in MD.BASICS})
    cls = {n: colour_class(n, facts.get(n) or {}, bool(land.get(n))) for n in population}
    start = [n for n in cubes[a.target_cube] if n in cls and cls[n] != "multi"]
    target = sum(power[n] for n in start if cls[n] != "land") / max(1, sum(cls[n] != "land" for n in start))
    by_class: Dict[str, List[str]] = {}
    for n in population:
        by_class.setdefault(cls[n], []).append(n)
    rng = random.Random(a.seed)
    pool = list(start)
    cur = objective(pool, power, sd, cls, target)
    first = dict(cur)
    temp = 0.05 * cur["total"]
    for it in range(a.iters):
        i = rng.randrange(len(pool))
        cands = [n for n in by_class[cls[pool[i]]] if n not in pool]
        if not cands:
            continue
        new = list(pool)
        new[i] = rng.choice(cands)
        nxt = objective(new, power, sd, cls, target)
        t = temp * (1 - it / a.iters) + 1e-9
        if nxt["total"] < cur["total"] or rng.random() < math.exp((cur["total"] - nxt["total"]) / t):
            pool, cur = new, nxt
    added = [n for n in pool if n not in start]
    cut = [n for n in start if n not in pool]
    write_cube(a.out, a.target_cube, pool, cls, power, sd, first, cur, added, cut, len(start))
    print(f"{a.out}: {len(added)} swap(s) from {a.target_cube}; objective {first['total']:.3f} -> {cur['total']:.3f}; "
          f"archetype SD {first['archSd']:.3f} -> {cur['archSd']:.3f}; card SD {first['flatSd']:.3f} -> {cur['flatSd']:.3f}")
    return 0


def write_cube(out: str, target: str, pool: List[str], cls: Dict[str, str], power, sd, first, cur, added, cut, n_start) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    L = [f"# Proposed cube — {target} power level, matchup-model draft ({len(pool)} cards)", "",
         "**PROPOSED BY MODEL, UNVERIFIED.** `tools/ml/matchup.py design` chose this list with the matchup model as a surrogate. "
         "An optimiser over a model exploits the model's errors, so treat every number below as a hypothesis. Only the cube lab "
         "can verify it, on fresh seeds that never trained the model:", "",
         "```bash",
         f"tools/cubelab.sh run {out} --drafts 400 --games 1 --jobs 7 --seed 900001 --out var/cubelab/verify/{os.path.basename(out)[:-3]}",
         f"tools/cubelab.sh report var/cubelab/verify/{os.path.basename(out)[:-3]}",
         "```", "",
         "Accept it only if the lab's archetype win rates on those seeds are at least as even as the original cube's on the same seeds "
         f"(run `cubes/{target}-cube-180.md` with the same flags and compare), and if no card the design added is a lab outlier. "
         "It is balanced for Forge's AI, not for people.", "",
         "## What the model predicts (unverified)", "",
         "| | start | proposed |", "|---|---|---|",
         f"| mean card power (logits) | {first['meanPower']:+.4f} | {cur['meanPower']:+.4f} |",
         f"| card power SD | {first['flatSd']:.4f} | {cur['flatSd']:.4f} |",
         f"| colour-pair strength SD | {first['archSd']:.4f} | {cur['archSd']:.4f} |",
         f"| pairs short of playables | {first['shortPairs']} | {cur['shortPairs']} |",
         f"| mean card power SD (uncertainty) | {first['meanSd']:.4f} | {cur['meanSd']:.4f} |", "",
         f"Swaps from the {n_start}-card start: {len(added)}.", "",
         "| in | power | sd | out | power | sd |", "|---|---|---|---|---|---|"]
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
    for title, c in (("Colorless", "colorless"), ("Lands", "land")):
        names = sorted(n for n in pool if cls[n] == c)
        L += [f"### {title} ({len(names)})", " · ".join(names), ""]
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
