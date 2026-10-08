id: J114
title: The human-pick drafter: does the cube lab's AI drafter build stronger decks when it drafts grid lines with ForgeCoach's 17Lands human pick model (Vintage, Synergy; mirrored seats; Forge Default pilots)
public_title: Human-pick drafter vs the lab drafter
public_est: ~1 to 2 h
public_decides: Draft vs AI drafts like human players
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@76cbb82 (main with the cube lab's `--drafter human-picks:<file>`, D416, #103), ForgeCoach@866c256 (#119: the shipped vintage- and synergy-cube-180.picks.json the drafter reads)
est: ~1-1.5 h. Pilot ~10 min (build, 6 seeds per cube in both seats, best of 3, recorded, plus a plain --games 0 draft of the same seeds). Run: 3,000 best-of-3 matches, Forge Default vs Default. J112's arm A on this PC: 1.74 s a Vintage game, 6.11 s a Synergy game; at ~2.5 games a match that is 2,000 x 2.5 x 1.74 = 8,700 worker-s (Vintage) + 1,000 x 2.5 x 6.11 = 15,300 worker-s (Synergy) = ~57 min on 7 workers, plus JVM starts and drafting (the human drafter adds well under 1 s a draft). Read ~1 min
resumable: yes
timeout: 4h
progress: cubelab var/lab-j114/HA-vintage var/lab-j114/HB-vintage var/lab-j114/HA-synergy var/lab-j114/HB-synergy of 3000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: stopfile = files var/lab-j114/ABORT
metrics: all = cubelab var/lab-j114/HA-vintage var/lab-j114/HB-vintage var/lab-j114/HA-synergy var/lab-j114/HB-synergy
metrics: hav = cubelab var/lab-j114/HA-vintage
metrics: hbv = cubelab var/lab-j114/HB-vintage
metrics: has = cubelab var/lab-j114/HA-synergy
metrics: hbs = cubelab var/lab-j114/HB-synergy
metrics: jr = sh: cat var/lab-j114/out/metrics.json 2>/dev/null || echo '{"written":0}'
headline: jr.verdict_code, jr.v_rate, jr.v_lo, jr.v_hi, jr.s_rate, jr.v_blue_h, jr.v_blue_c
decides: whether a follow-up makes the human-pick drafter (D416) the default AI drafter of ForgeCoach's Draft vs AI; this job changes nothing itself
hypothesis: ForgeCoach #119's pick model names the human's pick 73% of the time on Vintage's cards against 35% for the lab drafter's ratings; J111 found the lab drafter over-drafts blue 1.4-2.1x and Forge plays blue worse. If picking like strong humans (on-colour, black and blue power, fewer white and red aggro cards) builds better decks, the human-pick drafter wins more than half of its best-of-3 matches against the current drafter when both decks are piloted by the same Forge AI
rule: written 2026-10-08 before any J114 game was played (j114.py's header). Per cube (Vintage, Synergy), the same seeds 811,400,001 and up twice: HA (seat A drafts with D416's human-pick drafter from ForgeCoach@866c256's <cube>.picks.json, seat B with the current drafter) and HB (the mirror, seat B human); both seats Forge Default, best of 3, the lab builder and the cube's ratings. Outcome: the human-pick drafter's match win rate pooled over HA and HB (won 1, lost 0, drawn 0.5; engine-error matches left out and counted); 95% interval by cluster bootstrap over seeds (a seed's matches in both folders together), 10,000 resamples, numpy default_rng(20261008), percentile. PASS when Vintage's interval lies entirely above 0.5 AND Synergy's point estimate is >= 0.5; otherwise FAIL. Blue (secondary, J111's method) carries no verdict
followup: morning-read

**Why.** ForgeCoach #119 shipped a pick model fitted to 17Lands' human Powered Cube picks (CC BY 4.0). Each
card gets a pick strength, and the model adds colour-commitment and curve coefficients. On held-out human
drafts cut to Vintage's cards, it names the human's pick 73% of the time; the cube lab drafter's ratings
name it 35% of the time. Two earlier jobs bear on it:
- J111: the lab drafter over-drafts blue (1.4-2.1x expected), and Forge plays blue worse.
- J112: a stronger pilot barely reorders the card numbers.

Predicting what humans pick is not the same as building decks that win. This job asks the second
question in Forge's own games. A PASS means a follow-up makes the human-pick drafter the default AI
drafter of ForgeCoach's Draft vs AI. **Data credit: 17Lands** public datasets,
https://www.17lands.com/public_datasets, CC BY 4.0, through ForgeCoach's fitted model; only its numbers
are read.

**The drafter (D416, mtg-table #103, `tools/cubelab/humanpicks.ts`).**
- `--drafter human-picks:<file> --drafter-seat A|B` makes one seat choose its grid lines with the model.
  The other seat is the current drafter. The deal, who opens each grid, and both deckbuilders (the lab
  builder, the cube's ratings) are exactly a plain run's for that seed.
- **Utility.** `u = s(1 + gamma t) + beta x`, computed exactly as ForgeCoach's `humanPicks.ts` and its
  fitter `fit.py` do. The tests check it against fit.py's own 30 held-out picks and against
  `humanPicks.ts` on hand-made packs.
- **Fallback.** Cards the file does not cover get `s = a + b * rating`, the least-squares line over the
  covered cards: Vintage 28 of 180 (−3.785 + 0.0587·r, r 0.53), Synergy 101 of 180 (−2.099 + 0.0294·r,
  r 0.48).
- **Grid lines.** A line is worth Σ exp(u) over its cards, taken best first, each card against the pool
  plus the cards before it. That ranking does not depend on the logit's additive constant: a crossing
  line holds 2 cards and a parallel one 3. The best card dominates, as in the current drafter's
  `setValue`.

**Design.**
- **Two cubes:** Vintage and Synergy, the cubes with human data.
- **Two folders per cube on the same seeds.** HA: seat A is the human-pick drafter. HB: the mirror, with
  seat B human. A seed deals the same cards in both folders and the same seat opens the first grid
  (D294), so each drafter sits in each seat once per seed.
- **Both seats piloted by plain Forge Default** (`--profiles Default,Default`). That is cheaper, and J112
  says the pilot barely matters for this question.
- **Format:** grid, best of 3, the lab builder, no exploration, no recording (the pilot records).
- **Seeds:** 811,400,001 and up, in D340's VERIFY range, which the queue never reaches and no earlier job
  used. Vintage gets 1,000 seeds (2,000 drafts and matches); Synergy gets 500 (1,000), J112's scale.
- **Where:** folders `var/lab-j114/H{A,B}-{vintage,synergy}`, on their own Forge homes
  (`CUBELAB_HOME_ROOT=var/cubelab/homes-J114`).

**Power (normal approximation, matches independent).** A per-game edge of p becomes a match edge of
p²(3 − 2p). Against the rule:

| per-game rate | match rate | P(Vintage interval > 0.5) | P(Synergy point >= 0.5) | P(PASS) |
|---|---|---|---|---|
| 0.500 | 0.500 | 0.025 | 0.50 | ~0.01 |
| 0.510 | 0.515 | 0.27 | 0.83 | 0.22 |
| 0.520 | 0.530 | 0.77 | 0.97 | 0.74 |
| 0.530 | 0.545 | 0.98 | 1.00 | 0.98 |

- The interval's half-width on Vintage is about ±2.2 points.
- In the cloud, j114.py on synthetic folders at full size read FAIL at a 0.50 game rate in most seeds,
  and PASS at 0.53.
- A seed's two matches are clustered. Each drafter sits in each seat once, so the clusters remove the
  seat and opener effects rather than adding variance.

**Secondary (no verdict).**
- **Blue share:** the share of the human drafter's decks with U in their main colours, against the current
  drafter's, with each colour's share.
- **J111's equal-quality blue rate:** fitted separately for one-blue matches where the blue deck is the
  human drafter's and where it is the current drafter's.
- **Also reported:** the game win rate, and each seat's rate. The lab deck score of each drafter's decks
  is reported too; it is the current drafter's own currency, so the human drafter should score lower on
  it. Last, the share of the human pools the picks file does not cover.

**Not beside anything.** The job holds 7 of 8 cores, so the runner should start no other heavy job beside
it, and nothing else is queued. It aborts if a `queue run` starts. Justin at the table holds new games, as
usual.

**Cloud tests (2026-10-08, the PR's head 5db7eff, a 4-core container, Forge 2.0.14).**
- Unit tests: `node --test web/test/cubelab*.test.ts`, 133 pass.
- Real runs, best of 3, Forge Default vs Default, seeds 811,300,001-2: Vintage and Synergy, the human-pick
  drafter at A and at B, 8 matches, 0 engine errors. Coverage was 152 and 79 cards. In 8 of 8 seats, the
  human seat's pool differed from a plain `--games 0` draft of the same seed.
- j114.py over those runs and over synthetic full-size folders: it ran, and found 0 unpaired seeds.
- `tools/runner.sh check` (below in the README note).

## Pilot
About 10 minutes:
- the build and its self-tests;
- 6 seeds of each cube in both seats, recorded, in `var/lab-j114-pilot/` (never the real folders);
- a plain `--games 0` draft of the same seeds, for the "does it draft differently" check;
- last, `j114.py` over the pilot folders.

The pilot uses the full run's first seeds. Its folders are separate, so nothing carries over.
```bash
./bridge/build.sh
export CUBELAB_HOME_ROOT=var/cubelab/homes-J114
P=var/lab-j114-pilot
rm -rf "$P"
mkdir -p "$P" var/lab-j114-tools
for c in vintage synergy; do
  F={ForgeCoach}/public/cubes/$c-cube-180.picks.json
  tools/cubelab.sh run cubes/$c-cube-180.md --format grid --drafts 6 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --record-all --profiles Default,Default --drafter human-picks:$F --drafter-seat A --out $P/HA-$c
  tools/cubelab.sh run cubes/$c-cube-180.md --format grid --drafts 6 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --record-all --profiles Default,Default --drafter human-picks:$F --drafter-seat B --out $P/HB-$c
  tools/cubelab.sh run cubes/$c-cube-180.md --format grid --drafts 6 --games 0 --jobs 1 --seed 811400001 --profiles Default,Default --out $P/plain-$c
done
python3 -c "import numpy; print('numpy', numpy.__version__)"
cat > var/lab-j114-tools/j114.py <<'J114EOF'
#!/usr/bin/env python3
# mtg-table -- J114 (pc-jobs): does the cube lab's AI drafter build stronger decks when it drafts with ForgeCoach's human pick model?
# SPDX-License-Identifier: GPL-3.0-or-later
"""J114's pre-registered read (written 2026-10-08, before any J114 game was played).

DESIGN.  Per cube (Vintage, Synergy), the same draft seeds twice, best of three, both seats piloted by plain
Forge Default (`--profiles Default,Default`):
  HA  seat A drafts with the human pick model (`--drafter human-picks:<ForgeCoach>/public/cubes/<cube>.picks.json`,
      D416), seat B with the current drafter;
  HB  the mirror: the same seeds, seat B human, seat A current.
A seed deals the same cards in both folders and the same seat opens the first grid (D294), so over a seed's two
matches each drafter sits in each seat once.  Both seats build with the lab builder and the cube's ratings.

PRIMARY, per cube.  The human-pick drafter's MATCH win rate: a match it won counts 1, lost 0, drawn (1-1 or 0-0 after
a timeout) 0.5; a match with an engine error is left out (counted).  Pooled over HA and HB.  95% interval: a
cluster bootstrap over SEEDS (a seed's matches in both folders resampled together), 10,000 resamples,
numpy default_rng(20261008), 2.5th-97.5th percentiles of (sum of outcomes / matches) in each resample.

RULE.  PASS when Vintage's 95% interval lies entirely above 0.5 AND Synergy's point estimate is not below 0.5
(>= 0.5).  Otherwise FAIL.  verdict_code 1 = pass, 0 = fail.  A PASS means a follow-up to make the human-pick
drafter the default AI drafter of ForgeCoach's Draft vs AI; this job changes nothing.

SECONDARY (description only, no verdict):
  - blue: the share of the human drafter's decks whose main colours hold U (a splash is not a colour) against the
    current drafter's, over the same matches, and the difference with the same cluster bootstrap; every colour's
    share for both drafters;
  - J111's equal-quality blue rate, separately for one-blue matches where the blue deck is the human drafter's and
    where it is the current drafter's: logit P(blue wins the match) = b0 + b1 * dz + b2 * blue_on_play(+-0.5), dz the
    two decks' lab deck scores as z-scores over all the cube's decks here; inv_logit(b0) with its Wald 95% interval;
  - game win rate; each folder's (seat's) match win rate; the lab deck score of each drafter's decks (the lab's own
    ratings currency, which the current drafter maximises, so the human drafter is expected to score lower on it);
    the share of the human drafter's pool the picks file does not cover (its strength is the fallback line).

usage: python3 j114.py --vintage-a DIR --vintage-b DIR --synergy-a DIR --synergy-b DIR --forgecoach DIR --out DIR
                       [--plain-vintage DIR --plain-synergy DIR]   (pilot: plain --games 0 runs on the same seeds)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "tools", "lab"))
import warehouse as wh  # noqa: E402  played_main (J111's reading of a deck's colours), complete_lines, read_json

import numpy as np  # noqa: E402

Z = 1.959964
BOOTS = 10000
SEED = 20261008
COLOURS = "WUBRG"
MIN_MATCHES = 10  # a cube with fewer usable matches reads "too few" (the pilot has 12 a cube)


def r4(x):
    return None if x is None or (isinstance(x, float) and not math.isfinite(x)) else round(float(x), 4)


def logit_fit(X: np.ndarray, y: np.ndarray) -> dict:
    """Logistic regression by IRLS (J111's, J112's): coefficients and Wald 95% intervals."""
    n, k = X.shape
    if n < 30 or len(set(y.tolist())) < 2:
        return {"ok": 0, "n": int(n)}
    b = np.zeros(k)
    for _ in range(50):
        p = 1 / (1 + np.exp(-(X @ b)))
        w = np.clip(p * (1 - p), 1e-9, None)
        try:
            step = np.linalg.solve(X.T @ (X * w[:, None]), X.T @ (y - p))
        except np.linalg.LinAlgError:
            return {"ok": 0, "n": int(n)}
        b = b + step
        if np.max(np.abs(step)) < 1e-10:
            break
    p = 1 / (1 + np.exp(-(X @ b)))
    try:
        cov = np.linalg.inv(X.T @ (X * np.clip(p * (1 - p), 1e-9, None)[:, None]))
    except np.linalg.LinAlgError:
        return {"ok": 0, "n": int(n)}
    se = np.sqrt(np.clip(np.diag(cov), 0, None))
    if not np.all(np.isfinite(b)) or np.max(np.abs(b)) > 20:
        return {"ok": 0, "n": int(n)}
    il = lambda v: round(1 / (1 + math.exp(-v)), 4)  # noqa: E731
    return {"ok": 1, "n": int(n), "b": [r4(v) for v in b], "b0_rate": il(b[0]), "b0_rate_ci": [il(b[0] - Z * se[0]), il(b[0] + Z * se[0])]}


def cluster_boot(seeds: list, num: list, den: list, rng: np.random.Generator) -> list:
    """Percentile interval of sum(num)/sum(den), resampling clusters (seeds) with replacement."""
    keys = sorted(set(seeds))
    if not keys:
        return [None, None]
    idx = {k: i for i, k in enumerate(keys)}
    cn, cd = np.zeros(len(keys)), np.zeros(len(keys))
    for s, a, b in zip(seeds, num, den):
        cn[idx[s]] += a
        cd[idx[s]] += b
    draws = rng.integers(0, len(keys), size=(BOOTS, len(keys)))
    tn, td = cn[draws].sum(1), cd[draws].sum(1)
    v = tn[td > 0] / td[td > 0]
    return [r4(np.percentile(v, 2.5)), r4(np.percentile(v, 97.5))]


def cluster_se(seeds: list, y: list) -> float | None:
    """Cluster-robust standard error of the mean of y, clustered by seed (description only)."""
    n = len(y)
    if n < 2:
        return None
    m = sum(y) / n
    by = {}
    for s, v in zip(seeds, y):
        by[s] = by.get(s, 0.0) + (v - m)
    g = len(by)
    if g < 2:
        return None
    return math.sqrt(g / (g - 1) * sum(e * e for e in by.values())) / n


# ---------------------------------------------------------------- reading a run folder

def read_run(folder: str, want_seat: str) -> dict:
    run = wh.read_json(os.path.join(folder, "run.json")) or {}
    dr = run.get("drafter") or {}
    drafts, bad = {}, 0
    path = os.path.join(folder, "drafts.jsonl")
    if os.path.isfile(path):
        for raw, _ in wh.complete_lines(path, 0):
            try:
                rec = json.loads(raw)
            except ValueError:
                bad += 1
                continue
            drafts[int(rec.get("seed"))] = rec
    ok = dr.get("kind") == "human-picks" and dr.get("seat") == want_seat
    return {"folder": folder, "run": run, "drafter": dr, "drafter_ok": ok, "seat": want_seat, "drafts": drafts, "bad": bad}


def deck_colours(d: dict) -> str:
    _, colors = wh.played_main(d)
    return str(colors or "")


def rows_of(run: dict, covered: set) -> tuple:
    """One row per match of the folder: the human drafter's outcome and both decks' facts."""
    h = run["seat"]
    out, errors = [], 0
    for seed, rec in sorted(run["drafts"].items()):
        m = rec.get("match") or {}
        drs = {d.get("seat"): d for d in rec.get("drafters") or []}
        if m.get("engineError") or len(drs) != 2:
            errors += 1
            continue
        o = "B" if h == "A" else "A"
        w = m.get("winner")
        y = 1.0 if w == h else 0.0 if w == o else 0.5
        games = m.get("games") or []
        gw = sum(1 for g in games if g.get("winner") == h)
        gl = sum(1 for g in games if g.get("winner") == o)
        pool = drs[h].get("pool") or []
        out.append({
            "seed": seed, "h": h, "y": y, "winner": w, "gw": gw, "gl": gl,
            "on_play": games[0].get("onPlay") if games else None,
            "hum": {"seat": h, "colors": deck_colours(drs[h]), "score": float((drs[h].get("deck") or {}).get("score") or 0),
                    "forge": drs[h].get("played") == "forge"},
            "cur": {"seat": o, "colors": deck_colours(drs[o]), "score": float((drs[o].get("deck") or {}).get("score") or 0),
                    "forge": drs[o].get("played") == "forge"},
            "uncovered": sum(1 for n in pool if n not in covered), "pool": len(pool),
        })
    return out, errors


# ---------------------------------------------------------------- one cube

def cube_read(cube: str, ra: dict, rb: dict, picks: dict, plain: dict | None, rng: np.random.Generator) -> dict:
    covered = set((picks.get("cards") or {}).keys())
    rows_a, err_a = rows_of(ra, covered)
    rows_b, err_b = rows_of(rb, covered)
    rows = rows_a + rows_b
    sa, sb = set(ra["drafts"]), set(rb["drafts"])
    out = {"cube": cube, "matches": len(rows), "engine_errors": err_a + err_b,
           "pairing": {"seeds_a": len(sa), "seeds_b": len(sb), "seeds_both": len(sa & sb), "only_a": len(sa - sb), "only_b": len(sb - sa)},
           "drafter": {"a": ra["drafter"], "b": rb["drafter"]}}
    # Pilot only: how many seeds' human-seat pools differ from a plain run's same seat.
    if plain is not None:
        diff = comp = 0
        for run in (ra, rb):
            h = run["seat"]
            for seed, rec in run["drafts"].items():
                pr = plain["drafts"].get(seed)
                if not pr:
                    continue
                mine = next((d for d in rec.get("drafters") or [] if d.get("seat") == h), {})
                theirs = next((d for d in pr.get("drafters") or [] if d.get("seat") == h), {})
                comp += 1
                diff += sorted(mine.get("pool") or []) != sorted(theirs.get("pool") or [])
        out["plain"] = {"compared": comp, "pool_differs": diff}
    if len(rows) < MIN_MATCHES:
        out["ok"] = 0
        return out
    seeds = [r["seed"] for r in rows]
    y = [r["y"] for r in rows]
    rate = sum(y) / len(y)
    out.update({
        "ok": 1, "rate": r4(rate), "ci": cluster_boot(seeds, y, [1.0] * len(y), rng), "se_cluster": r4(cluster_se(seeds, y)),
        "won": sum(1 for v in y if v == 1), "lost": sum(1 for v in y if v == 0), "drawn": sum(1 for v in y if v == 0.5),
        "seeds": len(set(seeds)),
        "by_seat": {s: {"matches": len(rs), "rate": r4(sum(r["y"] for r in rs) / len(rs)) if rs else None}
                    for s, rs in (("A", rows_a), ("B", rows_b))},
    })
    gw, gl = sum(r["gw"] for r in rows), sum(r["gl"] for r in rows)
    out["games"] = {"won": gw, "lost": gl, "rate": r4(gw / (gw + gl)) if gw + gl else None,
                    "ci": cluster_boot(seeds, [r["gw"] for r in rows], [r["gw"] + r["gl"] for r in rows], rng)}
    # Colours of the decks that played.
    colour = {}
    for c in COLOURS:
        hv = [1.0 if c in r["hum"]["colors"] else 0.0 for r in rows]
        cv = [1.0 if c in r["cur"]["colors"] else 0.0 for r in rows]
        d = [a - b for a, b in zip(hv, cv)]
        colour[c] = {"human": r4(sum(hv) / len(hv)), "current": r4(sum(cv) / len(cv)), "diff": r4(sum(d) / len(d)),
                     "diff_ci": cluster_boot(seeds, d, [1.0] * len(d), rng) if c == "U" else None}
    out["colours"] = colour
    out["forge_built"] = {"human": sum(1 for r in rows if r["hum"]["forge"]), "current": sum(1 for r in rows if r["cur"]["forge"])}
    out["deck_score"] = {"human": r4(np.mean([r["hum"]["score"] for r in rows])), "current": r4(np.mean([r["cur"]["score"] for r in rows]))}
    tot_pool = sum(r["pool"] for r in rows)
    out["uncovered_share"] = r4(sum(r["uncovered"] for r in rows) / tot_pool) if tot_pool else None
    # J111's equal-quality blue rate, by whose deck is the blue one.
    scores = [s for r in rows for s in (r["hum"]["score"], r["cur"]["score"])]
    mu, sd = float(np.mean(scores)), float(np.std(scores))
    zs = lambda v: (v - mu) / sd if sd > 0 else 0.0  # noqa: E731
    tabs = {"human": [], "current": []}
    for r in rows:
        if r["winner"] not in ("A", "B"):
            continue
        hb, cb = "U" in r["hum"]["colors"], "U" in r["cur"]["colors"]
        if hb == cb:
            continue
        blue, other, who = (r["hum"], r["cur"], "human") if hb else (r["cur"], r["hum"], "current")
        tabs[who].append({"y": 1.0 if r["winner"] == blue["seat"] else 0.0, "dz": zs(blue["score"]) - zs(other["score"]),
                          "play": 0.5 if r["on_play"] == blue["seat"] else (-0.5 if r["on_play"] else 0.0)})
    blue = {}
    for who, tab in tabs.items():
        k = sum(t["y"] for t in tab)
        fit = logit_fit(np.array([[1.0, t["dz"], t["play"]] for t in tab]).reshape(-1, 3), np.array([t["y"] for t in tab])) if tab else {"ok": 0, "n": 0}
        blue[who] = {"one_blue": len(tab), "blue_win_rate": r4(k / len(tab)) if tab else None, "equal_quality": fit}
    out["blue"] = blue
    return out


# ---------------------------------------------------------------- report

def pct(x):
    return "-" if x is None else f"{100 * x:.1f}%"


def cip(c):
    return "-" if not c or c[0] is None else f"[{100 * c[0]:.1f}, {100 * c[1]:.1f}]"


def render(res: dict) -> str:
    v, s = res["cubes"]["vintage"], res["cubes"]["synergy"]
    L = ["# J114: the human-pick drafter against the current cube-lab drafter", "",
         f"**Verdict: {'PASS' if res['verdict_code'] == 1 else 'FAIL'}** (pre-registered: Vintage's 95% interval on the human-pick drafter's "
         f"match win rate above 50%, and Synergy's point estimate not below 50%). Vintage {pct(v.get('rate'))} {cip(v.get('ci'))}; "
         f"Synergy {pct(s.get('rate'))} {cip(s.get('ci'))}.", "",
         "Seat A drafts with ForgeCoach's human pick model (17Lands, CC BY 4.0) in one folder and seat B in its mirror, on the same "
         "seeds; the other seat drafts as the lab always has. Both seats are Forge Default, best of three; interval = cluster bootstrap "
         "over seeds.", "",
         "## Primary", "",
         "| cube | matches (seeds) | human-pick drafter's match win rate [95%] | W-L-D | as seat A / as seat B | game win rate [95%] | engine errors left out |",
         "|---|---|---|---|---|---|---|"]
    for c in (v, s):
        if not c.get("ok"):
            L.append(f"| {c['cube']} | {c.get('matches')} | too few | | | | {c.get('engine_errors')} |")
            continue
        bs = c["by_seat"]
        L.append(f"| {c['cube']} | {c['matches']} ({c['seeds']}) | **{pct(c['rate'])} {cip(c['ci'])}** | {c['won']}-{c['lost']}-{c['drawn']} | "
                 f"{pct(bs['A']['rate'])} / {pct(bs['B']['rate'])} | {pct(c['games']['rate'])} {cip(c['games']['ci'])} | {c['engine_errors']} |")
    L += ["", "## Secondary: colours (description only)", "",
          "| cube | drafter | W | U | B | R | G | blue difference (human - current) [95%] | lab deck score | uncovered share of the human pools |",
          "|---|---|---|---|---|---|---|---|---|---|"]
    for c in (v, s):
        if not c.get("ok"):
            continue
        col = c["colours"]
        for who in ("human", "current"):
            extra = f"{100 * col['U']['diff']:+.1f} points {cip(col['U']['diff_ci'])}" if who == "human" else ""
            L.append(f"| {c['cube']} | {who} | " + " | ".join(pct(col[k][who]) for k in COLOURS)
                     + f" | {extra} | {c['deck_score'][who]} | {pct(c['uncovered_share']) if who == 'human' else ''} |")
    L += ["", "J111's equal-quality blue rate (one-blue matches, decisive; logit on the deck-score z-gap and who was on the play):", "",
          "| cube | blue deck drafted by | one-blue matches | blue's match win rate | equal quality (b0) [95%] |", "|---|---|---|---|---|"]
    for c in (v, s):
        if not c.get("ok"):
            continue
        for who in ("human", "current"):
            b = c["blue"][who]
            eq = b.get("equal_quality") or {}
            L.append(f"| {c['cube']} | {who} | {b['one_blue']} | {pct(b['blue_win_rate'])} | {pct(eq.get('b0_rate'))} {cip(eq.get('b0_rate_ci'))} |")
    L += ["", "## Pairing and runs", ""]
    for c in (v, s):
        p = c["pairing"]
        L.append(f"- {c['cube']}: {p['seeds_both']} seeds in both folders ({p['only_a']} only with the human at A, {p['only_b']} only at B); "
                 f"Forge-built decks: human {c.get('forge_built', {}).get('human')}, current {c.get('forge_built', {}).get('current')}.")
    L += ["", "The lab deck score is the current drafter's own currency (the cube's ratings), so it is not a measure of strength here; "
          "the games are. The blue numbers carry no verdict.", ""]
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    for k in ("vintage-a", "vintage-b", "synergy-a", "synergy-b", "forgecoach", "out"):
        ap.add_argument(f"--{k}", required=True)
    ap.add_argument("--plain-vintage")
    ap.add_argument("--plain-synergy")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rng = np.random.default_rng(SEED)
    res = {"written": 1, "cubes": {}, "bad_lines": 0, "drafter_ok": 1, "picks_sha_ok": 1}
    for cube, fa, fb, fp in (("vintage", a.vintage_a, a.vintage_b, a.plain_vintage), ("synergy", a.synergy_a, a.synergy_b, a.plain_synergy)):
        ra, rb = read_run(fa, "A"), read_run(fb, "B")
        pfile = os.path.join(a.forgecoach, "public", "cubes", f"{cube}-cube-180.picks.json")
        with open(pfile, "rb") as fh:
            raw = fh.read()
        picks = json.loads(raw)
        sha = hashlib.sha256(raw).hexdigest()
        res["bad_lines"] += ra["bad"] + rb["bad"]
        if not (ra["drafter_ok"] and rb["drafter_ok"]):
            res["drafter_ok"] = 0
        if ra["drafter"].get("sha") != sha or rb["drafter"].get("sha") != sha:
            res["picks_sha_ok"] = 0
        plain = None
        if fp:
            plain = read_run(fp, "A")
            res["bad_lines"] += plain["bad"]
        res["cubes"][cube] = cube_read(cube, ra, rb, picks, plain, rng)
    v, s = res["cubes"]["vintage"], res["cubes"]["synergy"]
    passed = bool(v.get("ok") and s.get("ok") and v["ci"][0] is not None and v["ci"][0] > 0.5 and s["rate"] is not None and s["rate"] >= 0.5)
    res["verdict_code"] = 1 if passed else 0
    res["verdict"] = "pass" if passed else "fail"
    with open(os.path.join(a.out, "j114.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
        fh.write("\n")
    with open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8") as fh:
        fh.write(render(res))
    g = lambda c, *ks: _dig(res["cubes"][c], ks)  # noqa: E731
    flat = {
        "written": 1, "verdict_code": res["verdict_code"], "bad_lines": res["bad_lines"], "drafter_ok": res["drafter_ok"],
        "picks_sha_ok": res["picks_sha_ok"],
        "seeds_unpaired": sum(res["cubes"][c]["pairing"]["only_a"] + res["cubes"][c]["pairing"]["only_b"] for c in ("vintage", "synergy")),
        "engine_errors": sum(res["cubes"][c]["engine_errors"] for c in ("vintage", "synergy")),
        "v_matches": g("vintage", "matches"), "v_rate": g("vintage", "rate"), "v_lo": g("vintage", "ci", 0), "v_hi": g("vintage", "ci", 1),
        "s_matches": g("synergy", "matches"), "s_rate": g("synergy", "rate"), "s_lo": g("synergy", "ci", 0), "s_hi": g("synergy", "ci", 1),
        "v_covered": g("vintage", "drafter", "a", "covered"), "s_covered": g("synergy", "drafter", "a", "covered"),
        "v_blue_h": g("vintage", "colours", "U", "human"), "v_blue_c": g("vintage", "colours", "U", "current"),
        "s_blue_h": g("synergy", "colours", "U", "human"), "s_blue_c": g("synergy", "colours", "U", "current"),
        "v_blue_eq_h": g("vintage", "blue", "human", "equal_quality", "b0_rate"), "v_blue_eq_c": g("vintage", "blue", "current", "equal_quality", "b0_rate"),
        "s_blue_eq_h": g("synergy", "blue", "human", "equal_quality", "b0_rate"), "s_blue_eq_c": g("synergy", "blue", "current", "equal_quality", "b0_rate"),
        "plain_compared": sum(_dig(res["cubes"][c], ("plain", "compared")) or 0 for c in ("vintage", "synergy")),
        "plain_differs": sum(_dig(res["cubes"][c], ("plain", "pool_differs")) or 0 for c in ("vintage", "synergy")),
    }
    with open(os.path.join(a.out, "metrics.json"), "w", encoding="utf-8") as fh:
        json.dump({k: x for k, x in flat.items() if x is not None}, fh)
        fh.write("\n")
    print(f"J114 verdict: {res['verdict']} (Vintage {v.get('rate')} {v.get('ci')}, Synergy {s.get('rate')} {s.get('ci')})", flush=True)
    return 0


def _dig(x, ks):
    for k in ks:
        if isinstance(x, dict):
            x = x.get(k)
        elif isinstance(x, list) and isinstance(k, int) and k < len(x):
            x = x[k]
        else:
            return None
    return x


if __name__ == "__main__":
    sys.exit(main())
J114EOF
python3 var/lab-j114-tools/j114.py --vintage-a $P/HA-vintage --vintage-b $P/HB-vintage --synergy-a $P/HA-synergy --synergy-b $P/HB-synergy --forgecoach {ForgeCoach} --plain-vintage $P/plain-vintage --plain-synergy $P/plain-synergy --out $P/out
cat $P/out/metrics.json
```
metrics: p = cubelab var/lab-j114-pilot/HA-vintage var/lab-j114-pilot/HB-vintage var/lab-j114-pilot/HA-synergy var/lab-j114-pilot/HB-synergy
metrics: pforge = sh: find var/lab-j114-pilot -path '*/H?-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"policy":"forge"' || true
metrics: psearched = sh: find var/lab-j114-pilot -path '*/H?-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"search":{"options"' || true
metrics: pj = sh: cat var/lab-j114-pilot/out/metrics.json 2>/dev/null || echo '{"written":0}'
check: qwriters == 0
check: disk_gb >= 10
check: p.drafts == 24
check: p.engine_errors + p.timeouts <= 1
check: p.mean_game_s between 0.3 and 15
check: pforge >= 24
check: psearched == 0
check: pj.written == 1
check: pj.bad_lines == 0
check: pj.drafter_ok == 1
check: pj.picks_sha_ok == 1
check: pj.seeds_unpaired == 0
check: pj.v_covered == 152
check: pj.s_covered == 79
check: pj.v_matches >= 10
check: pj.s_matches >= 10
check: pj.plain_compared == 24
check: pj.plain_differs >= 18

What the checks say:
- Both seats are plain Forge: the recorded seat headers say `policy: forge`, and there are no search
  traces.
- Every folder drafted with the human-pick drafter in the intended seat. The picks files are
  ForgeCoach@866c256's, checked by sha256, and cover 152 Vintage and 79 Synergy cards.
- The human seat drafts differently from the plain drafter in at least 18 of the 24 seat-seeds. All 8 did
  in the cloud.
- The games run at Forge's speed, so the run fits its estimate.
- The read runs and pairs every seed.
- There are no win-rate bounds.

## Commands
The order is Vintage first, then Synergy, so a short run loses only Synergy. The job is `resumable: yes`:
`cubelab.sh run` on the same `--out` skips the seeds already in its `drafts.jsonl`.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J114
mkdir -p var/lab-j114
F={ForgeCoach}/public/cubes/vintage-cube-180.picks.json
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 1000 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --profiles Default,Default --drafter human-picks:$F --drafter-seat A --out var/lab-j114/HA-vintage
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 1000 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --profiles Default,Default --drafter human-picks:$F --drafter-seat B --out var/lab-j114/HB-vintage
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J114
F={ForgeCoach}/public/cubes/synergy-cube-180.picks.json
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 500 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --profiles Default,Default --drafter human-picks:$F --drafter-seat A --out var/lab-j114/HA-synergy
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 500 --games 3 --jobs {workers} --seed 811400001 --game-timeout 300 --profiles Default,Default --drafter human-picks:$F --drafter-seat B --out var/lab-j114/HB-synergy
```
cores: 1
```bash
python3 var/lab-j114-tools/j114.py --vintage-a var/lab-j114/HA-vintage --vintage-b var/lab-j114/HB-vintage --synergy-a var/lab-j114/HA-synergy --synergy-b var/lab-j114/HB-synergy --forgecoach {ForgeCoach} --out var/lab-j114/out
cat var/lab-j114/out/summary.md
```
check: hav.drafts == 1000
check: hbv.drafts == 1000
check: has.drafts == 500
check: hbs.drafts == 500
check: all.engine_error_rate <= 2%
check: all.timeouts <= all.games / 50
check: jr.written == 1
check: jr.bad_lines == 0
check: jr.drafter_ok == 1
check: jr.picks_sha_ok == 1
check: jr.seeds_unpaired == 0
check: jr.v_matches >= 1900
check: jr.s_matches >= 950
check: jr.verdict_code between 0 and 1

The checks only say that the run is whole and paired:
- every seed drafted in both seats, with the intended drafter and file;
- engine errors and timeouts are low;
- at least 95% of the matches are usable.

PASS or FAIL is the `rule:`, read from `verdict_code`: 1 = pass, 0 = fail. It is not a check. A FAIL is a
finished job with an answer.

## Abort if
abort: qwriters > 0
abort: disk_gb < 5
abort: stopfile > 0
abort: all.games >= 300 and all.engine_error_rate > 5%
abort: all.games >= 300 and all.timeouts > all.games / 10

The aborts cover a queue night starting beside the job, the disk running low, and engine trouble. The PC
session or Justin can also stop the job cleanly by creating `var/lab-j114/ABORT` (`touch` it in the lab
clone's `var/`). No abort looks at win rates.

## Report
collect: var/lab-j114/out/summary.md
collect: var/lab-j114/out/metrics.json
collect: var/lab-j114/out/j114.json
collect: var/lab-j114/HA-vintage/run.json
collect: var/lab-j114/HB-synergy/run.json

`summary.md` is written by the job (its tables). The PC session adds its reading below it, plainly:
- **The credit line first:** 17Lands public datasets, CC BY 4.0, through ForgeCoach's pick model.
- **The verdict under the rule, PASS or FAIL,** with the numbers it rests on:
  - Vintage's match win rate with its 95% interval;
  - Synergy's point estimate and its interval.
- **The decision it gives.** PASS: a follow-up makes the human-pick drafter ForgeCoach's default Draft vs
  AI drafter. FAIL: the drafter stays as it is, and the result is recorded.
- **An interval that includes 0.5 is "not shown",** never "no difference".
- **Also, for description only:**
  - the game win rate;
  - the rate as seat A and as seat B;
  - each drafter's lab deck score;
  - the uncovered share of the human pools;
  - the hours each block took and the mean game time.
- **Blue:** the human drafter's blue deck share against the current drafter's, with the difference's
  interval, and both equal-quality blue rates. Say whether the human drafter drafts less blue, and
  whether its blue decks fare better. No verdict.
