id: J112
title: Search-v2 pilots for cube stats: do cube-lab games played by search-v2 instead of Forge Default give card win rates that rank like 17Lands humans (Vintage, Synergy), and does blue's Forge deficit shrink
public_title: Search AI pilots for cube stats
public_est: one night (~7 to 10 h)
public_decides: Build cube stats from search AI games
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@59a0ced (current main: the cube lab's seat specs take +search, parsed by SearchConfig.parse; `Default+outlets+search:anytime=1` is search-v2's config exactly, D412), ForgeCoach@bd51ce3 (#111: the shipped vintage- and synergy-cube-180.human.json, 17Lands overlap cards, and the shipped metas for reference)
est: ~7-10 h. Pilot ~20 min (build, 6 drafts per cube and arm). Arm A, Forge vs Forge, 3,000 drafts: ~15-25 min (J110: 4,500 in 24 min). Arm B, search-v2 vs search-v2, 3,000 games at 51-75 s a game per worker on 7 workers: 6.1-8.9 h (J102 on the PC: 2,400 search games in 4.9 h of play, 51 s; the cloud, 2 workers: 73-87 s). Meta and read ~5 min
resumable: yes
timeout: 12h
progress: cubelab var/lab-j112/B-vintage var/lab-j112/B-synergy of 3000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: stopfile = files var/lab-j112/ABORT
metrics: a = cubelab var/lab-j112/A-vintage var/lab-j112/A-synergy
metrics: b = cubelab var/lab-j112/B-vintage var/lab-j112/B-synergy
metrics: av = cubelab var/lab-j112/A-vintage
metrics: asy = cubelab var/lab-j112/A-synergy
metrics: bv = cubelab var/lab-j112/B-vintage
metrics: bsy = cubelab var/lab-j112/B-synergy
metrics: jr = sh: cat var/lab-j112/out/metrics.json 2>/dev/null || echo '{"written":0}'
headline: jr.verdict_code, jr.v_diff, jr.v_lo, jr.v_hi, jr.s_diff, jr.v_rho_a, jr.v_rho_b, jr.v_blue_paired_diff
decides: whether the cube lab's metas (ForgeCoach's lab card numbers, the deck assistant's and Draft vs AI's) are built from search-v2-piloted games from now on instead of Forge Default-piloted games
hypothesis: J111 found Forge plays blue worse (blue decks win 33-46% at equal deck quality in all 7 cubes) and the lab's Forge-piloted card win rates agree with 17Lands humans only at rho ~0.48 (Vintage, 131 cards; Synergy 0.45, 59; ForgeCoach docs/human-blend.md); search-v2 overrules Forge's answer on ~18% of searched decisions (J102) and is +73-87 Elo over Forge Default (J101), so cards Forge misplays should be credited closer to how humans do, and the blue gap should narrow
rule: written 2026-10-08 before any J112 game was played (j112.py's header). Per cube (Vintage, Synergy), cards = nonland cards with 500+ games in hand in ForgeCoach@bd51ce3's <cube>.human.json and at least one lab game in both arms; rho = Spearman (average ranks) between the arm's per-card lab win rate (meta.json wins / games) and the human GIH WR (gihW / gih); difference rho(B) - rho(A), B = search-v2 vs search-v2, A = Forge Default vs Forge Default on the same draft seeds; paired bootstrap over cards, 10,000 resamples, default_rng(20261006), percentile 95% interval. PASS when Vintage's interval is entirely above 0 AND Synergy's point estimate is >= 0: future metas are built from search-v2-piloted games. Otherwise FAIL: metas stay Forge Default-piloted, and the result is recorded. The blue numbers (secondary, as J111) carry no verdict
followup: morning-read

**Why.** Every card number ForgeCoach shows for a cube comes from cube-lab games that Forge's own AI
plays (Default against Default). Two findings say that pilot distorts them:
- J111: Forge plays blue worse. Blue decks win 33-46% at equal deck quality, in all 7 cubes.
- The lab's per-card win rates agree with 17Lands' human GIH WR only at rho 0.48 on Vintage's 131 nonland
  overlap cards, and 0.45 on Synergy's 59 (ForgeCoach PR #111, `docs/human-blend.md` part 2, condition 2).
  17Lands humans have blue cards middling (GIH WR about 0.557 against 0.571 overall), not bad.

The search AI is the stronger pilot: +73 to +87 Elo over Forge Default (J101), and since D412 its live
version is search-v2. This job asks whether cube games piloted by search-v2 give card numbers closer to how
humans play. If they do, future cube stats are built from search-v2 games. Justin approved it.

**The two arms, on the same draft seeds.** A draft is a pure function of its cube, ratings, weights, format
and seed (D294). The AI seats only play the games, so both arms draft and build the same two decks for every
seed; `j112.py` checks this deck for deck (`deck_mismatch`). Checked in the cloud on 59a0ced: 4 Vintage seeds
gave identical pools and decks in both arms.
- **A: Forge Default vs Forge Default** (`--profiles Default,Default`): the shipped metas' pilot. It is
  played fresh, not reused from the queue, for three reasons: it costs about 20 minutes; it is on the same
  seeds, so the arms are paired; and it has the same draft count, so both arms carry the same sampling noise.
  Noise lowers rho, so an arm on fewer drafts would lose by construction.
- **B: search-v2 vs search-v2** (`--profiles Default+outlets+search:anytime=1,Default+outlets+search:anytime=1`).
  The cube lab passes each seat to `SeatSpec.parse`, and from there `SearchConfig.parse`. With `anytime=1`
  that is D412's search-v2 exactly, the ladder's `search-v1-anytime`: outlets on, 1.5 s wall clock, the
  anytime loop. **No code change was needed.** In the cloud, a recorded game's header says
  `"policy":"search","search":"ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,anytime=1"`,
  its searched decisions carry `"search":{"options":…}` traces, and a game took 46-87 s (Forge's take a few seconds on the PC).
  The pilot checks all three.
- **Both arms:**
  - grid format, best of one, as every shipped meta;
  - the cube's default ratings and the lab builder, with no exploration and no recording (the pilot records both arms);
  - `--game-timeout 900`, because search games run long;
  - seeds 811,200,001 and up, in D340's VERIFY range, which the queue never reaches;
  - folders `var/lab-j112/{A,B}-{vintage,synergy}`, on their own Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J112`).

**Sizing (simulated in the cloud from the shipped metas and human files).**
- **The draft count.** Search games cost about 20 times Forge's, so arm B sets the night's length. Vintage
  carries the rule's interval and gets 2,000 drafts. Synergy needs only the sign of its point estimate and
  gets 1,000.
- **Per card.** That gives a median of about 550 games a card in Vintage and about 360 in Synergy.
- **Noise.** It pulls each arm's rho down from the shipped meta's 0.48 to about 0.37 in expectation, the
  same for both arms.
- **Simulated precision.** The rule's interval on Vintage's rho(B) - rho(A) is about **±0.13** (Synergy's
  about ±0.19). With no true difference, the run passes about 2-3% of the time: Vintage's lower end clears 0
  in about 5% of runs, and Synergy's sign goes either way. A true gain of +0.2 in observed rho (a true human
  rho of about 0.72 against 0.50) passes about 94% of the time. The smallest gain with 80% power is about
  +0.18.
- **Time.** 3,000 search games at the PC's 51 s a game (J102) on 7 workers take 6.1 h, and at 75 s, 8.9 h.
  The pilot checks the mean game time is at most 80 s, a ceiling of about 9.5 h for arm B. If it is slower,
  the pilot fails and the draft counts are re-sized, rather than running past the night.

**The rule's one statistic, and why.** A per-card win rate is the lab's own number: `cubelab.sh meta`'s
`wins / games`, what ForgeCoach's Lab numbers panel shows. Comparing it with the human GIH WR by Spearman
rho is ForgeCoach's existing yardstick (condition 2 of `docs/human-blend.md`), so the same cards, filter and
bootstrap are used. The shipped metas reproduce its numbers exactly in `j112.py` (0.4771 on 131 cards and
0.4514 on 59). Rho is a ranking: it does not care that search-v2 wins more overall, only whether it orders the
cards more like humans do. Nothing here is a claim that humans are right about Forge's games. The question is
whether a stronger pilot moves the lab toward the only outside yardstick we have.

**Secondary: blue (no verdict).** Measured as in J111, in each arm and cube, over one-blue decisive drafts:
- blue's win rate;
- J111's equal-quality rate, from the logit on the deck-score z-gap and who was on the play, over all one-blue
  drafts and over J111's low-contention band;
- the **paired** difference B - A over the same drafts. The decks are identical, so deck quality is held
  exactly, not just modelled.

A narrower gap in B means Forge's play explains part of J111's blue deficit. An unchanged gap means the search
inherits it: the search keeps Forge's answer unless a rollout finds a clearly better one.

**Not beside anything.** The job holds 7 of 8 cores, so the runner starts no other heavy job beside it, and
nothing else is queued. It aborts if a `queue run` starts. The wall-clock search would also be slowed by
anything that shares its cores. Justin at the table holds new games, as usual. Since 51 s a game sits mostly in
the 1.5 s budget per searched decision, a pause costs time, not validity.

**Cloud tests (2026-10-08, 59a0ced, a 4-core container).**
- Real cube-lab runs, both arms, on the same seeds: Vintage 4 drafts, Synergy 2, B recorded. These checked the
  pairing, the recording header and the search traces.
- `cubelab.sh meta` on each run, then `j112.py`: it ran, with 0 deck mismatches.
- Synthetic metas at the full draft counts: a planted human-ward shift read PASS; a null read FAIL.
- `tools/runner.sh dry-run` with 2 workers ran the whole pilot in 995 s. Every check passed but disk (the
  container has 1 GB free).
  - search games averaged 77.6 s on this slow box; 24 search-v2 seat headers; 616 search traces;
  - 12 drafts in each arm; 0 errors and 0 timeouts; 0 deck mismatches; 92 and 46 overlap cards.
  - Forge's games there took 35 s on the shared 4 cores, so arm A's pilot check is its recorded `policy: forge`
    headers, not a time.

## Pilot
About 20 minutes: the build and its self-tests, then 6 drafts of each cube in each arm, both recorded, in
`var/lab-j112-pilot/` (never the real folders). Last, `meta` and `j112.py` over them. The pilot uses the full
run's first seeds; its folders are separate, so nothing carries over.
```bash
./bridge/build.sh
export CUBELAB_HOME_ROOT=var/cubelab/homes-J112
P=var/lab-j112-pilot
rm -rf "$P"
mkdir -p "$P" var/lab-j112-tools
S2='Default+outlets+search:anytime=1,Default+outlets+search:anytime=1'
for c in vintage synergy; do
  tools/cubelab.sh run cubes/$c-cube-180.md --format grid --drafts 6 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --record-all --profiles Default,Default --out $P/A-$c
  tools/cubelab.sh run cubes/$c-cube-180.md --format grid --drafts 6 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --record-all --profiles "$S2" --out $P/B-$c
  tools/cubelab.sh meta $P/A-$c --cube cubes/$c-cube-180.md
  tools/cubelab.sh meta $P/B-$c --cube cubes/$c-cube-180.md
done
python3 -c "import numpy; print('numpy', numpy.__version__)"
cat > var/lab-j112-tools/j112.py <<'J112EOF'
#!/usr/bin/env python3
# mtg-table -- J112 (pc-jobs): does a search-v2 pilot make the cube lab's card numbers more human?
# SPDX-License-Identifier: GPL-3.0-or-later
"""J112's pre-registered read (written 2026-10-08, before any J112 game was played).

Two arms on the SAME draft seeds (so the same pools and the same decks: a draft is a pure function of its
cube, ratings, weights, format and seed, D294; this script checks it):
  A  Forge Default vs Forge Default            (the lab's pilot until now)
  B  search-v2 vs search-v2                    (Default+outlets+search:anytime=1, D412's live seat)

PRIMARY, per cube (Vintage, Synergy).  Cards: the cube's nonland cards (neither cards.json nor the meta's types
call it a land) with 500+ games in hand in ForgeCoach's shipped 17Lands file (`<cube>.human.json`) and at least
one lab game in BOTH arms (ForgeCoach docs/human-blend.md part 2, condition 2).  Statistic: Spearman rho (average
ranks) between the arm's per-card lab win rate (meta.json `wins / games`, the Lab numbers panel's) and the human
GIH WR (`gihW / gih`); the difference rho(B) - rho(A), with a paired bootstrap over cards (10,000 resamples,
numpy default_rng(20261006), 2.5th-97.5th percentiles).

RULE.  PASS when Vintage's 95% interval on rho(B) - rho(A) is entirely above 0 AND Synergy's point estimate of
rho(B) - rho(A) is not negative (>= 0).  Otherwise FAIL.  verdict_code 1 = pass, 0 = fail.

SECONDARY (description only, no verdict): blue at equal deck quality, as J111.  One-blue drafts (exactly one
seat's main colours hold U, the warehouse's played_main: a splash is not a colour), decisive games:
  - blue's win rate in each arm, Wilson 95%;
  - J111's logit P(blue wins) = b0 + b1 * dz + b2 * blue_on_play(+-0.5), dz the two decks' lab deck scores as
    within-cube z-scores; b0's rate inv_logit(b0) with its Wald 95% interval; over all one-blue drafts, and over
    J111's low-contention band (the non-blue seat's pool holds at most the cube's 25th percentile of blue cards);
  - PAIRED: the same one-blue drafts decisive in both arms (identical decks, so deck quality is held exactly),
    blue's win rate in B minus in A, 95% bootstrap interval over drafts (10,000, default_rng(20261006)).
Also reported: rho(A, B) between the arms' card rates; the shipped meta's rho on the same cards (more drafts:
less noise, so higher than either arm here); each arm's own bootstrap interval.

usage: python3 j112.py --a-vintage DIR --b-vintage DIR --a-synergy DIR --b-synergy DIR --forgecoach DIR --out DIR
       (each DIR a cube-lab run folder holding drafts.jsonl, cards.json and meta.json from `cubelab.sh meta`)
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "tools", "lab"))
import warehouse as wh  # noqa: E402  played_main (J111's reading of a deck's colours), complete_lines

import numpy as np  # noqa: E402

Z = 1.959964
MIN_GIH = 500
BOOTS = 10000
SEED = 20261006


def rankdata(x: np.ndarray) -> np.ndarray:
    """Average ranks (scipy.stats.rankdata's 'average'), 1-based."""
    x = np.asarray(x)
    sorter = np.argsort(x, kind="mergesort")
    inv = np.empty(sorter.size, dtype=np.intp)
    inv[sorter] = np.arange(sorter.size, dtype=np.intp)
    xs = x[sorter]
    obs = np.r_[True, xs[1:] != xs[:-1]]
    dense = obs.cumsum()[inv]
    count = np.r_[np.nonzero(obs)[0], len(obs)]
    return 0.5 * (count[dense] + count[dense - 1] + 1)


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    ra, rb = rankdata(a), rankdata(b)
    ra = ra - ra.mean()
    rb = rb - rb.mean()
    d = math.sqrt(float((ra * ra).sum() * (rb * rb).sum()))
    return float((ra * rb).sum() / d) if d > 0 else float("nan")


def r4(x):
    return None if x is None or (isinstance(x, float) and not math.isfinite(x)) else round(float(x), 4)


def wilson(k: float, n: float) -> list:
    if n <= 0:
        return [None, None]
    p = k / n
    d = 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d
    h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return [round(c - h, 4), round(c + h, 4)]


def logit_fit(X: np.ndarray, y: np.ndarray) -> dict:
    """Logistic regression by IRLS (J111's): coefficients and Wald 95% intervals."""
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
    return {"ok": 1, "n": int(n), "b": [r4(v) for v in b], "lo": [r4(v - Z * s) for v, s in zip(b, se)],
            "hi": [r4(v + Z * s) for v, s in zip(b, se)], "b0_rate": il(b[0]),
            "b0_rate_ci": [il(b[0] - Z * se[0]), il(b[0] + Z * se[0])]}


def zs(v: list) -> list:
    a = np.array(v, dtype=float)
    s = a.std() if len(a) else 0.0
    return ((a - a.mean()) / s if s > 0 else a * 0).tolist()


# ---------------------------------------------------------------- reading a run folder

def read_run(folder: str) -> dict:
    meta = wh.read_json(os.path.join(folder, "meta.json")) or {}
    cards = wh.read_json(os.path.join(folder, "cards.json")) or {}
    run = wh.read_json(os.path.join(folder, "run.json")) or {}
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
    return {"folder": folder, "meta": meta, "cards": cards, "run": run, "drafts": drafts, "bad": bad}


def deck_key(rec: dict) -> str:
    return json.dumps([[d.get("seat"), wh.played_main(d)[0], sorted(d.get("pool") or [])] for d in rec.get("drafters") or []])


def pairing(a: dict, b: dict) -> dict:
    sa, sb = set(a["drafts"]), set(b["drafts"])
    both = sa & sb
    mism = sum(1 for s in both if deck_key(a["drafts"][s]) != deck_key(b["drafts"][s]))
    return {"seeds_a": len(sa), "seeds_b": len(sb), "seeds_both": len(both), "only_a": len(sa - sb), "only_b": len(sb - sa),
            "deck_mismatch": mism}


# ---------------------------------------------------------------- primary

def overlap(cube: str, a: dict, b: dict, human: dict, shipped: dict | None) -> dict:
    types = {}
    for m in (a["meta"], b["meta"]):
        for c in ((m.get("cube") or {}).get("cards") or []):
            types[c.get("name")] = c.get("types") or []
    land = {n for n, c in {**a["cards"], **b["cards"]}.items() if c.get("land")}
    rows = []
    for n, h in sorted((human.get("cards") or {}).items()):
        if int(h.get("gih") or 0) < MIN_GIH or n in land or "Land" in types.get(n, []):
            continue
        ca, cb = (a["meta"].get("cards") or {}).get(n), (b["meta"].get("cards") or {}).get(n)
        if not ca or not cb or int(ca.get("games") or 0) < 1 or int(cb.get("games") or 0) < 1:
            continue
        sc = ((shipped or {}).get("cards") or {}).get(n) or {}
        rows.append({"name": n, "gih": int(h["gih"]), "human": h["gihW"] / h["gih"],
                     "a_games": int(ca["games"]), "a_rate": ca["wins"] / ca["games"],
                     "b_games": int(cb["games"]), "b_rate": cb["wins"] / cb["games"],
                     "shipped_rate": (sc["wins"] / sc["games"]) if sc.get("games") else None})
    n = len(rows)
    out = {"cube": cube, "n": n, "human_cards": len(human.get("cards") or {})}
    if n < 10:
        out.update({"ok": 0})
        return out
    hum = np.array([r["human"] for r in rows])
    ra = np.array([r["a_rate"] for r in rows])
    rb = np.array([r["b_rate"] for r in rows])
    rho_a, rho_b = spearman(ra, hum), spearman(rb, hum)
    rng = np.random.default_rng(SEED)
    da, db, dd = np.empty(BOOTS), np.empty(BOOTS), np.empty(BOOTS)
    for i in range(BOOTS):
        idx = rng.integers(0, n, size=n)
        x, y = spearman(ra[idx], hum[idx]), spearman(rb[idx], hum[idx])
        da[i], db[i], dd[i] = x, y, y - x
    dd = dd[np.isfinite(dd)]
    pct = lambda v: [r4(np.percentile(v, 2.5)), r4(np.percentile(v, 97.5))]  # noqa: E731
    shipped_rows = [r for r in rows if r["shipped_rate"] is not None]
    out.update({
        "ok": 1, "rho_a": r4(rho_a), "rho_b": r4(rho_b), "diff": r4(rho_b - rho_a), "diff_ci": pct(dd),
        "rho_a_ci": pct(da[np.isfinite(da)]), "rho_b_ci": pct(db[np.isfinite(db)]), "boots": int(dd.size),
        "p_diff_le_0": r4(float(np.mean(dd <= 0))),
        "rho_ab": r4(spearman(ra, rb)),
        "rho_shipped": r4(spearman(np.array([r["shipped_rate"] for r in shipped_rows]), np.array([r["human"] for r in shipped_rows])))
        if len(shipped_rows) >= 10 else None,
        "shipped_n": len(shipped_rows),
        "median_games_a": int(np.median([r["a_games"] for r in rows])), "median_games_b": int(np.median([r["b_games"] for r in rows])),
        "min_games_a": min(r["a_games"] for r in rows), "min_games_b": min(r["b_games"] for r in rows),
        "cards": [{k: (r4(v) if isinstance(v, float) else v) for k, v in r.items()} for r in rows],
    })
    return out


# ---------------------------------------------------------------- secondary: blue, as J111

def blue_rows(run: dict) -> dict:
    """seed -> one-blue draft facts (decisive, no engine error, both seats on the lab's deck); None when not one-blue."""
    blue_cards = {n for n, c in run["cards"].items() if "U" in str(c.get("colors") or "")}
    out = {}
    for seed, rec in run["drafts"].items():
        m = rec.get("match") or {}
        drs = rec.get("drafters") or []
        if m.get("engineError") or m.get("winner") not in ("A", "B") or len(drs) != 2:
            continue
        if any(d.get("played") == "forge" or not d.get("deck") for d in drs):
            continue
        seats = []
        for d in drs:
            _, colors = wh.played_main(d)
            seats.append({"seat": d.get("seat"), "blue": "U" in str(colors or ""),
                          "score": float((d.get("deck") or {}).get("score") or 0),
                          "pool_blue": sum(1 for n in d.get("pool") or [] if n in blue_cards)})
        games = m.get("games") or []
        out[seed] = {"seats": seats, "winner": m.get("winner"), "on_play": games[0].get("onPlay") if games else None}
    return out


def blue_table(rows: dict) -> list:
    seeds = sorted(rows)
    allq = zs([s["score"] for k in seeds for s in rows[k]["seats"]])
    tab = []
    for i, k in enumerate(seeds):
        r = rows[k]
        a, b = r["seats"]
        if a["blue"] == b["blue"]:
            continue
        bi = 0 if a["blue"] else 1
        blue, other = r["seats"][bi], r["seats"][1 - bi]
        tab.append({"seed": k, "y": 1.0 if r["winner"] == blue["seat"] else 0.0, "dz": allq[2 * i + bi] - allq[2 * i + 1 - bi],
                    "c": float(other["pool_blue"]),
                    "play": 0.5 if r["on_play"] == blue["seat"] else (-0.5 if r["on_play"] else 0.0)})
    if tab:
        q1 = float(np.percentile([t["c"] for t in tab], 25))
        for t in tab:
            t["low"] = t["c"] <= q1
    return tab


def blue_arm(tab: list) -> dict:
    if not tab:
        return {"one_blue": 0}
    k = sum(t["y"] for t in tab)
    lo = [t for t in tab if t["low"]]
    fit = lambda ts: logit_fit(np.array([[1.0, t["dz"], t["play"]] for t in ts]), np.array([t["y"] for t in ts])) if ts else {"ok": 0}  # noqa: E731
    return {"one_blue": len(tab), "blue_win_rate": r4(k / len(tab)), "ci": wilson(k, len(tab)),
            "equal_quality": fit(tab), "low_band": {"n": len(lo), **fit(lo)}}


def blue_paired(ta: list, tb: list) -> dict:
    ya = {t["seed"]: t["y"] for t in ta}
    yb = {t["seed"]: t["y"] for t in tb}
    common = sorted(set(ya) & set(yb))
    if len(common) < 30:
        return {"n": len(common)}
    a = np.array([ya[s] for s in common])
    b = np.array([yb[s] for s in common])
    d = b - a
    rng = np.random.default_rng(SEED)
    boot = np.array([d[rng.integers(0, len(d), size=len(d))].mean() for _ in range(BOOTS)])
    return {"n": len(common), "a_rate": r4(a.mean()), "b_rate": r4(b.mean()), "diff": r4(d.mean()),
            "diff_ci": [r4(np.percentile(boot, 2.5)), r4(np.percentile(boot, 97.5))],
            "b_won_a_lost": int(((b == 1) & (a == 0)).sum()), "a_won_b_lost": int(((a == 1) & (b == 0)).sum())}


# ---------------------------------------------------------------- report

def pct(x):
    return "-" if x is None else f"{100 * x:.1f}%"


def ci(c):
    return "-" if not c or c[0] is None else f"[{c[0]:+.3f}, {c[1]:+.3f}]"


def cip(c):
    return "-" if not c or c[0] is None else f"[{100 * c[0]:.1f}, {100 * c[1]:.1f}]"


def render(res: dict) -> str:
    v, s = res["primary"]["vintage"], res["primary"]["synergy"]
    L = ["# J112: search-v2 pilots and human card numbers", "",
         f"**Verdict: {'PASS' if res['verdict_code'] == 1 else 'FAIL'}** (pre-registered: Vintage's 95% interval on rho(B) - rho(A) above 0, "
         f"and Synergy's point estimate not negative). Vintage {v.get('diff')} {ci(v.get('diff_ci'))}; Synergy {s.get('diff')} {ci(s.get('diff_ci'))}.", "",
         "A = Forge Default vs Forge Default, B = search-v2 vs search-v2 (Default+outlets+search:anytime=1), on the same draft seeds and so the same decks. "
         "rho = Spearman between the arm's per-card lab win rate and 17Lands' GIH WR (Arena's Powered Cube), nonland overlap cards with 500+ games in hand "
         "and lab games in both arms; paired bootstrap over cards.", "",
         "## Primary", "",
         "| cube | cards | rho A [95%] | rho B [95%] | B - A [95%] | P(B - A <= 0) | rho(A, B) | shipped meta's rho | median games a card A / B |",
         "|---|---|---|---|---|---|---|---|---|"]
    for p in (v, s):
        if not p.get("ok"):
            L.append(f"| {p['cube']} | {p['n']} | too few cards | | | | | | |")
            continue
        L.append(f"| {p['cube']} | {p['n']} | {p['rho_a']} {ci(p['rho_a_ci'])} | {p['rho_b']} {ci(p['rho_b_ci'])} | **{p['diff']} {ci(p['diff_ci'])}** | "
                 f"{p['p_diff_le_0']} | {p['rho_ab']} | {p['rho_shipped']} (n {p['shipped_n']}) | {p['median_games_a']} / {p['median_games_b']} |")
    L += ["", "The shipped meta's rho is on many more drafts (less noise), so it is higher than either arm's here; only B against A, on equal "
          "draft counts, is the test.", "", "## Pairing and runs", ""]
    for c, pr in res["pairing"].items():
        L.append(f"- {c}: {pr['seeds_both']} seeds in both arms ({pr['only_a']} only in A, {pr['only_b']} only in B); decks differing between arms: {pr['deck_mismatch']}.")
    L += ["", "## Secondary: blue at equal quality (as J111; description only)", "",
          "| cube | arm | one-blue drafts | blue win rate | equal quality (J111 b0) | low-contention band b0 |", "|---|---|---|---|---|---|"]
    for c, bl in res["blue"].items():
        for arm in ("A", "B"):
            x = bl[arm]
            eq, lb = x.get("equal_quality") or {}, x.get("low_band") or {}
            L.append(f"| {c} | {arm} | {x.get('one_blue')} | {pct(x.get('blue_win_rate'))} {cip(x.get('ci'))} | "
                     f"{pct(eq.get('b0_rate'))} {cip(eq.get('b0_rate_ci'))} | {pct(lb.get('b0_rate'))} {cip(lb.get('b0_rate_ci'))} (n {lb.get('n')}) |")
    L += ["", "Paired (the same one-blue drafts, decisive in both arms; identical decks, so quality is held exactly):", ""]
    for c, bl in res["blue"].items():
        p = bl["paired"]
        if p.get("diff") is None:
            L.append(f"- {c}: {p['n']} drafts, too few.")
        else:
            L.append(f"- {c}: n {p['n']}, blue {pct(p['a_rate'])} in A, {pct(p['b_rate'])} in B; B - A {100 * p['diff']:+.1f} points "
                     f"[{100 * p['diff_ci'][0]:+.1f}, {100 * p['diff_ci'][1]:+.1f}] (B won where A lost {p['b_won_a_lost']}, the reverse {p['a_won_b_lost']}).")
    L += ["", "The blue numbers carry no verdict. A smaller gap in B says Forge's play explains part of J111's deficit; "
          "an unchanged gap says the search inherits it (it overrules Forge only where it finds a clearly better line).", ""]
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    for k in ("a-vintage", "b-vintage", "a-synergy", "b-synergy", "forgecoach", "out"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    runs = {"vintage": (read_run(a.a_vintage), read_run(a.b_vintage)), "synergy": (read_run(a.a_synergy), read_run(a.b_synergy))}
    res = {"written": 1, "primary": {}, "pairing": {}, "blue": {}, "bad_lines": 0,
           "profiles": {c: [r["run"].get("profiles") for r in rr] for c, rr in runs.items()}}
    for cube, (ra, rb) in runs.items():
        human = wh.read_json(os.path.join(a.forgecoach, "public", "cubes", f"{cube}-cube-180.human.json")) or {}
        shipped = wh.read_json(os.path.join(a.forgecoach, "public", "cubes", f"{cube}-cube-180.meta.json"))
        res["bad_lines"] += ra["bad"] + rb["bad"]
        res["primary"][cube] = overlap(cube, ra, rb, human, shipped)
        res["pairing"][cube] = pairing(ra, rb)
        ta, tb = blue_table(blue_rows(ra)), blue_table(blue_rows(rb))
        res["blue"][cube] = {"A": blue_arm(ta), "B": blue_arm(tb), "paired": blue_paired(ta, tb)}
    v, s = res["primary"]["vintage"], res["primary"]["synergy"]
    passed = bool(v.get("ok") and s.get("ok") and v["diff_ci"][0] is not None and v["diff_ci"][0] > 0 and s["diff"] is not None and s["diff"] >= 0)
    res["verdict_code"] = 1 if passed else 0
    res["verdict"] = "pass" if passed else "fail"
    with open(os.path.join(a.out, "j112.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
        fh.write("\n")
    with open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8") as fh:
        fh.write(render(res))
    bp = lambda c, k: (res["blue"][c]["paired"].get(k))  # noqa: E731
    beq = lambda c, arm: ((res["blue"][c][arm].get("equal_quality") or {}).get("b0_rate"))  # noqa: E731
    flat = {
        "written": 1, "verdict_code": res["verdict_code"], "bad_lines": res["bad_lines"],
        "deck_mismatch": sum(p["deck_mismatch"] for p in res["pairing"].values()),
        "seeds_unpaired": sum(p["only_a"] + p["only_b"] for p in res["pairing"].values()),
        "v_n": v.get("n"), "v_rho_a": v.get("rho_a"), "v_rho_b": v.get("rho_b"), "v_diff": v.get("diff"),
        "v_lo": (v.get("diff_ci") or [None, None])[0], "v_hi": (v.get("diff_ci") or [None, None])[1],
        "s_n": s.get("n"), "s_rho_a": s.get("rho_a"), "s_rho_b": s.get("rho_b"), "s_diff": s.get("diff"),
        "s_lo": (s.get("diff_ci") or [None, None])[0], "s_hi": (s.get("diff_ci") or [None, None])[1],
        "v_blue_eq_a": beq("vintage", "A"), "v_blue_eq_b": beq("vintage", "B"),
        "s_blue_eq_a": beq("synergy", "A"), "s_blue_eq_b": beq("synergy", "B"),
        "v_blue_paired_diff": bp("vintage", "diff"), "s_blue_paired_diff": bp("synergy", "diff"),
    }
    with open(os.path.join(a.out, "metrics.json"), "w", encoding="utf-8") as fh:
        json.dump({k: x for k, x in flat.items() if x is not None}, fh)
        fh.write("\n")
    print(f"J112 verdict: {res['verdict']} (Vintage B-A {v.get('diff')} {v.get('diff_ci')}, Synergy B-A {s.get('diff')})", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
J112EOF
python3 var/lab-j112-tools/j112.py --a-vintage $P/A-vintage --b-vintage $P/B-vintage --a-synergy $P/A-synergy --b-synergy $P/B-synergy --forgecoach {ForgeCoach} --out $P/out
cat $P/out/metrics.json
```
metrics: pa = cubelab var/lab-j112-pilot/A-vintage var/lab-j112-pilot/A-synergy
metrics: pb = cubelab var/lab-j112-pilot/B-vintage var/lab-j112-pilot/B-synergy
metrics: pseat = sh: find var/lab-j112-pilot -path '*/B-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"policy":"search","search":"ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,anytime=1"' || true
metrics: psearched = sh: find var/lab-j112-pilot -path '*/B-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"search":{"options"' || true
metrics: paforge = sh: find var/lab-j112-pilot -path '*/A-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"policy":"forge"' || true
metrics: pasearched = sh: find var/lab-j112-pilot -path '*/A-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"search":{"options"' || true
metrics: pj = sh: cat var/lab-j112-pilot/out/metrics.json 2>/dev/null || echo '{"written":0}'
check: qwriters == 0
check: disk_gb >= 20
check: pa.drafts == 12
check: pb.drafts == 12
check: pa.engine_errors + pa.timeouts + pb.engine_errors + pb.timeouts <= 1
check: paforge >= 12
check: pasearched == 0
check: pb.mean_game_s between 15 and 80
check: pseat >= 12
check: psearched >= 60
check: pj.written == 1
check: pj.bad_lines == 0
check: pj.deck_mismatch == 0
check: pj.seeds_unpaired == 0
check: pj.v_n >= 40
check: pj.s_n >= 15

What the checks say:
- Forge's arm is plain Forge: its recorded seat headers say `policy: forge`, and it has no search traces.
- Search-v2's arm really searches: at least 15 s a game, every recorded seat header names search-v2's config,
  and there are searched-decision traces.
- The night fits: at most 80 s a game, so arm B takes at most about 9.5 h on 7 workers.
- The arms are paired deck for deck, and the read runs with overlap cards in both cubes.
- There are no win-rate bounds.

## Commands
Arm A first: it is fast. Then arm B, Vintage before Synergy, so a short night loses only Synergy. The job is
`resumable: yes`, because `cubelab.sh run` on the same `--out` skips the seeds already in its `drafts.jsonl`.
A retry or restart continues a block instead of starting it again.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J112
mkdir -p var/lab-j112
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 2000 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --profiles Default,Default --out var/lab-j112/A-vintage
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 1000 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --profiles Default,Default --out var/lab-j112/A-synergy
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J112
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 2000 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1' --out var/lab-j112/B-vintage
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J112
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 1000 --games 1 --jobs {workers} --seed 811200001 --game-timeout 900 --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1' --out var/lab-j112/B-synergy
```
cores: 1
```bash
for d in A-vintage B-vintage; do tools/cubelab.sh meta var/lab-j112/$d --cube cubes/vintage-cube-180.md; done
for d in A-synergy B-synergy; do tools/cubelab.sh meta var/lab-j112/$d --cube cubes/synergy-cube-180.md; done
python3 var/lab-j112-tools/j112.py --a-vintage var/lab-j112/A-vintage --b-vintage var/lab-j112/B-vintage --a-synergy var/lab-j112/A-synergy --b-synergy var/lab-j112/B-synergy --forgecoach {ForgeCoach} --out var/lab-j112/out
cat var/lab-j112/out/summary.md
```
check: av.drafts == 2000
check: asy.drafts == 1000
check: bv.drafts == 2000
check: bsy.drafts == 1000
check: a.engine_error_rate <= 2%
check: b.engine_error_rate <= 2%
check: b.timeouts <= b.games / 50
check: b.mean_game_s >= 15
check: jr.written == 1
check: jr.bad_lines == 0
check: jr.deck_mismatch == 0
check: jr.seeds_unpaired == 0
check: jr.v_n >= 120
check: jr.s_n >= 50
check: jr.verdict_code between 0 and 1

The checks only say the run is whole and paired:
- every draft played in both arms;
- engine errors and timeouts low;
- search-v2 searched throughout;
- the same decks in both arms;
- enough overlap cards.

PASS or FAIL is the `rule:`, read from `verdict_code`: 1 = pass, 0 = fail. It is not a check. A FAIL is a
finished job with an answer.

## Abort if
abort: qwriters > 0
abort: disk_gb < 10
abort: stopfile > 0
abort: b.games >= 100 and b.engine_error_rate > 5%
abort: b.games >= 100 and b.timeouts > b.games / 10
abort: a.games >= 500 and a.engine_error_rate > 5%

The aborts cover a queue night starting beside it, the disk running low, and engine trouble. The PC session or
Justin can also stop the job cleanly by creating `var/lab-j112/ABORT` (`touch` it in the lab clone's `var/`).
No abort looks at win rates or rho.

## Report
collect: var/lab-j112/out/summary.md
collect: var/lab-j112/out/metrics.json
collect: var/lab-j112/out/j112.json
collect: var/lab-j112/A-vintage/meta.json
collect: var/lab-j112/B-vintage/meta.json
collect: var/lab-j112/A-synergy/meta.json
collect: var/lab-j112/B-synergy/meta.json

`summary.md` is written by the job (its tables). The PC session adds its reading below it, plainly:
- **The verdict under the rule, PASS or FAIL**, with the numbers it rests on: Vintage's rho(A), rho(B) and
  B - A with its 95% interval; Synergy's B - A point estimate and its interval.
- **The decision it gives.** PASS: future cube metas are built from search-v2-piloted games. FAIL:
  metas stay Forge Default-piloted, and the result is recorded.
- **An interval that includes 0 is "not shown",** never "no difference".
- **Also, for description only:**
  - rho(A, B), how much the pilot reorders the cards;
  - the shipped meta's rho on the same cards;
  - each arm's median games a card;
  - arm B's mean game time and the hours each arm took.
- **Blue:** each arm's one-blue win rate and J111's equal-quality rate, and the paired B - A over the same
  drafts with its interval. Say whether blue's gap narrowed, stayed, or widened. No verdict.
- **Caveat:** search-v2 is wall clock, so its strength depends on the PC's load. Every draft line carries the
  load average.
