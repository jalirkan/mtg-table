id: J111
title: The blue question: in every queue cube the AI drafter puts most decks into blue and blue decks lose; does contention between the two drafters or Forge's play with blue explain it (read-only, minutes)
public_title: Blue decks: contention or play
public_est: ~10 min
public_decides: Explain the AI drafter blue skew
cpu: light
cores: 1
max_workers: 1
mem_per_worker_gb: 2
repos: mtg-table@59a0ced (current main; tools/lab/warehouse.py's line reading, D363)
est: ~2-10 min on one core (reads each normal queue folder's drafts.jsonl once, about 15 kB a line; holds a few numbers a draft)
resumable: yes
timeout: 1h
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: bj = sh: cat var/lab-j111/metrics.json 2>/dev/null || echo '{"written":0}'
headline: bj.verdict_code, bj.cubes_a, bj.cubes_b, bj.pooled_low_rate, bj.pooled_high_rate, bj.pooled_b0_rate
decides: what ForgeCoach says about the AI's blue habit: a "the AI over-drafts blue" line in Draft vs AI and a caveat on the deck assistant's pair win rates naming the cause the numbers support (contention between the drafters, or Forge's play with blue), and whether a colour-aware pick tweak is worth one lab A/B night
hypothesis: the research retrospective (2026-10-08, §3A, from J073's colour pairs) found blue pairs take 56-83% of decks in all 7 cubes and win 0.44-0.49 against 0.52-0.62 for non-blue; either both drafters take blue and cut each other (contention), or Forge plays blue worse than the lab rates it
rule: written 2026-10-08 before the run (blue.py's header). Plain Default-vs-Default decisive drafts, normal queue folders, every night on disk. A both-blue draft is 0.5 for blue by construction, so blue's deficit is its deficit in one-blue drafts; contention there is the blue cards the non-blue seat took (low band: at or under the cube's 25th percentile; high band: at or over its 75th). (a) contention is shown when blue's win rate in the low band has a Wilson 95% interval entirely above the high band's (the intervals do not overlap). (b) Forge plays blue worse is shown when, in the low band, blue's log-odds at equal deck quality (logit on the two decks' lab deck scores as within-cube z-scores, plus who was on the play) has a 95% interval entirely below 0. The verdict is both, (a), (b), or neither shown (no interval clears), pooled over the cubes; per-cube verdicts are description only
followup: blue-advice

**Why.** The research retrospective (§3A) found that in every cube the AI drafter puts most decks into blue
pairs, and that those decks lose. So the lab's colour-pair numbers partly measure the AI's habits rather than the
cube. Two explanations fit, and this query separates them before ForgeCoach says anything about it. It is a
light, read-only pass over data the queue already wrote. Justin approved it.

**An identity the rule is built on.** In a two-seat draft, a game between two blue decks is always won by a blue
deck. So "blue's win rate when the opponent is also blue" is exactly 0.5, and every point of blue's aggregate
deficit comes from drafts where only one seat is blue. The query prints this decomposition per cube, and checks
that it rebuilds the aggregate rate (`max_recon_err`). Contention therefore cannot show itself as a both-blue
win rate. It can only show where one seat ends blue: if the other seat also drafted blue cards and then moved off,
the blue deck was cut. So contention is measured as the blue cards in the non-blue seat's pool. The rule compares
blue's win rate when that seat took few blue cards (the bottom quartile) against when it took many (the top
quartile), with Wilson intervals: the user's interval-overlap form. Explanation (b) is tested where contention is
lowest (the bottom quartile), at equal deck quality.

**Deck quality** is the lab builder's own deck score (`deck.score`: mean rating, playables, theme, curve and
splash terms, as the deck was built at the time), as a z-score within each cube. A secondary run uses the deck's
mean nonland card rating from the folder's `cards.json` instead. (b) cannot tell Forge piloting blue badly from the
lab's ratings over-rating blue cards for Forge's pilot: to this query they are the same thing, and the summary
says so.

**Colour balance.** Per cube, from `cards.json` (the cube document as Forge reads it):
- the nonland cards of each colour, counting a multicolour card in each of its colours;
- the blue cards, and how many of them are mono-blue;
- blue's share of the coloured cards;
- the share of decks we would expect to be blue if pairs were weighted by the product of their colours' card
  counts (40% if every pair were equally likely);
- blue's observed deck share, divided by that expected share.

**Population.**
- Every `var/cubelab/queue/normal/<cube>/drafts.jsonl`. Bridge keys mix cubes, so they are left out.
- Plain lines only (no D358 exploration), with both seats Default (the line's own `profiles`, else `run.json`'s),
  a decisive match, no engine error, and both seats on the lab's deck.
- A secondary table repeats the rates over every profile.
- Nights 1-2's recordings are archived (J108), but their `drafts.jsonl` lines are still on disk and are read.
- Lines are read through `tools/lab/warehouse.py`'s `complete_lines` and `played_main`, so a line still being
  written is skipped, and a deck's colours are the warehouse's (a splash is not a colour).
- Nothing is written outside `var/lab-j111*`.

**Beside J110.** J110 also only reads the queue, and this job is `cpu: light`, so the runner may run it beside
J110. Neither may run beside a queue night: the job aborts if a `queue run` starts.

**Tested in the cloud** on synthetic queue roots with a planted effect (blue.py, 6,000 lines a cube). A planted
(b) read (b), a planted contention effect read (a), and a null read "neither shown" (pooled). On 400-line heads
of each cube, the pilot's size, it ran and fitted.

## Pilot
About a minute. numpy and the warehouse's line reader import; the script runs on the first 400 lines of every
normal queue folder (copies in `var/lab-j111-pilot/`) and writes its three files.
```bash
python3 -c "import numpy; print('numpy', numpy.__version__)"
python3 -c "import sys; sys.path.insert(0, 'tools/lab'); import warehouse; print(warehouse.played_main.__doc__)"
mkdir -p var/lab-j111-tools
cat > var/lab-j111-tools/blue.py <<'J111EOF'
#!/usr/bin/env python3
# mtg-table -- J111 (pc-jobs): the blue question, read-only over the cube-lab queue's drafts.jsonl.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Why do the lab's blue decks lose?  Two explanations, J111's pre-registered rule:

  (a) contention: both seats take blue in one draft and cut each other;
  (b) Forge plays blue worse: blue loses even uncontested, at equal deck quality.

Population: every `<root>/normal/<cube>/drafts.jsonl` (bridge keys are cube mixtures: left out), plain
lines only (no D358 exploration), both seats Default (D347's `profiles`, else run.json's), a decisive
match, no engine error, both seats on the lab's own deck (`played` != forge).  A deck is blue when its
main colours (the warehouse's `played_main`, a splash is not a colour) hold U.

IDENTITY.  A blue-vs-blue game is won by a blue deck, so "both seats blue" drafts are 0.5 for blue by
construction, and blue's aggregate deficit is entirely its deficit in ONE-BLUE drafts.  So contention is
measured where it can act: in a one-blue draft, by the blue cards the non-blue seat took (`c`, its pool's
cards whose colours hold U).  Low band: c at or under the cube's 25th percentile; high band: at or over its
75th (quartiles, not halves, so the low band is as near "no contention" as the data allows).

  (a) shown  when blue's win rate in the low band has a Wilson 95% interval entirely above the high
             band's (blue does worse when the other seat also drafted blue; the intervals do not overlap).
  (b) shown  when, in the low band (uncontested), blue's log-odds at equal deck quality -- logit P(blue
             wins) = b0 + b1 * dz + b2 * blue_on_play(+-0.5), dz = the two decks' lab deck scores, each a
             z-score within its cube -- has a 95% interval (Wald) entirely below 0.
  verdict    both / (a) contention / (b) Forge plays blue worse / neither shown; pooled over the cubes
             (within-cube z-scores and medians), and per cube for description.

(b) reads "blue loses at the lab's own rated quality under Forge's pilot": Forge piloting blue worse and
the lab's ratings over-rating blue cards for Forge are the same thing to this query.  Secondary numbers
(not in the verdict): the same with the deck's mean nonland card rating (cards.json) for quality; a
logistic model of contention's total effect; blue deck quality in both-blue against one-blue drafts; the
same rates over every profile; and blue's deck share against the cube's own colour balance.

usage: python3 blue.py [--root var/cubelab/queue] [--out var/lab-j111]
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "tools", "lab"))
import warehouse as wh  # noqa: E402  the warehouse's own reading of a line (played_main, complete_lines)

import numpy as np  # noqa: E402

Z = 1.959964
VERDICTS = {0: "neither shown", 1: "(a) contention", 2: "(b) Forge plays blue worse", 3: "both"}


def wilson(k: float, n: float) -> list:
    if n <= 0:
        return [None, None]
    p = k / n
    d = 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d
    h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return [round(c - h, 4), round(c + h, 4)]


def logit_fit(X: np.ndarray, y: np.ndarray) -> dict:
    """Logistic regression by IRLS: coefficients, Wald 95% intervals, covariance."""
    n, k = X.shape
    if n < 30 or len(set(y.tolist())) < 2:
        return {"ok": 0, "n": int(n)}
    b = np.zeros(k)
    for _ in range(50):
        eta = X @ b
        p = 1 / (1 + np.exp(-eta))
        w = np.clip(p * (1 - p), 1e-9, None)
        H = X.T @ (X * w[:, None])
        try:
            step = np.linalg.solve(H, X.T @ (y - p))
        except np.linalg.LinAlgError:
            return {"ok": 0, "n": int(n)}
        b = b + step
        if np.max(np.abs(step)) < 1e-10:
            break
    p = 1 / (1 + np.exp(-(X @ b)))
    H = X.T @ (X * np.clip(p * (1 - p), 1e-9, None)[:, None])
    try:
        cov = np.linalg.inv(H)
    except np.linalg.LinAlgError:
        return {"ok": 0, "n": int(n)}
    se = np.sqrt(np.clip(np.diag(cov), 0, None))
    if not np.all(np.isfinite(b)) or np.max(np.abs(b)) > 20:
        return {"ok": 0, "n": int(n)}
    return {"ok": 1, "n": int(n), "b": [round(float(x), 4) for x in b], "se": [round(float(x), 4) for x in se],
            "lo": [round(float(x - Z * s), 4) for x, s in zip(b, se)], "hi": [round(float(x + Z * s), 4) for x, s in zip(b, se)]}


def inv_logit(x):
    return None if x is None else round(1 / (1 + math.exp(-x)), 4)


def zs(v: list) -> list:
    if not v:
        return []
    a = np.array(v, dtype=float)
    s = a.std()
    return ((a - a.mean()) / s if s > 0 else a * 0).tolist()


def welch(a: list, b: list) -> dict:
    if len(a) < 2 or len(b) < 2:
        return {"diff": None, "lo": None, "hi": None}
    ma, mb = float(np.mean(a)), float(np.mean(b))
    se = math.sqrt(float(np.var(a, ddof=1)) / len(a) + float(np.var(b, ddof=1)) / len(b))
    d = ma - mb
    return {"diff": round(d, 4), "lo": round(d - Z * se, 4), "hi": round(d + Z * se, 4)}


def read_cube(folder: str, key: str, say) -> dict:
    meta = wh.read_json(os.path.join(folder, "run.json")) or {}
    cards = wh.read_json(os.path.join(folder, "cards.json")) or {}
    run_dd = list(meta.get("profiles") or []) == ["Default", "Default"]
    blue = {n for n, c in cards.items() if "U" in str(c.get("colors") or "")}
    land = {n for n, c in cards.items() if c.get("land")}
    rating = {n: float(c.get("rating") or 0) for n, c in cards.items()}
    st = {"lines": 0, "bad": 0, "explore": 0, "not_dd": 0, "undecided": 0, "engine_error": 0, "forge_deck": 0, "kept": 0}
    rows, rows_all = [], []
    path = os.path.join(folder, "drafts.jsonl")
    for raw, _ in wh.complete_lines(path, 0):
        st["lines"] += 1
        try:
            rec = json.loads(raw)
        except ValueError:
            st["bad"] += 1
            continue
        m = rec.get("match") or {}
        if m.get("engineError"):
            st["engine_error"] += 1
            continue
        if m.get("winner") not in ("A", "B"):
            st["undecided"] += 1
            continue
        drs = rec.get("drafters") or []
        if len(drs) != 2 or any(d.get("played") == "forge" or not d.get("deck") for d in drs):
            st["forge_deck"] += 1
            continue
        seats = []
        for d in drs:
            main, colors = wh.played_main(d)
            nl = [(k, n) for k, n in main if n in rating and n not in land]
            cnt = sum(k for k, _ in nl)
            seats.append({
                "seat": d.get("seat"), "colors": str(colors or ""), "blue": "U" in str(colors or ""),
                "score": float((d.get("deck") or {}).get("score") or 0),
                "mean_rating": sum(k * rating[n] for k, n in nl) / cnt if cnt else 0.0,
                "pool_blue": sum(1 for n in d.get("pool") or [] if n in blue),
            })
        games = m.get("games") or []
        on_play = games[0].get("onPlay") if games else None
        row = {"seats": seats, "winner": m.get("winner"), "on_play": on_play}
        rows_all.append(row)
        if rec.get("playExplore"):
            st["explore"] += 1
            continue
        p = rec.get("profiles") or (["Default", "Default"] if run_dd else None)
        if list(p or []) != ["Default", "Default"]:
            st["not_dd"] += 1
            continue
        st["kept"] += 1
        rows.append(row)
    # the cube's colour balance, from the lab's own card facts (cards.json: the cube document as Forge reads it)
    per = {c: 0 for c in "WUBRG"}
    coloured = 0
    for n, c in cards.items():
        if c.get("land"):
            continue
        cols = [x for x in str(c.get("colors") or "") if x in per]
        if cols:
            coloured += 1
        for x in cols:
            per[x] += 1
    mono_u = sum(1 for n, c in cards.items() if not c.get("land") and str(c.get("colors") or "") == "U")
    pairs = [(a, b) for i, a in enumerate("WUBRG") for b in "WUBRG"[i + 1:]]
    tot = sum(per[a] * per[b] for a, b in pairs)
    exp_u = sum(per[a] * per[b] for a, b in pairs if "U" in (a, b)) / tot if tot else None
    balance = {"cards": len(cards), "nonland": sum(1 for c in cards.values() if not c.get("land")), "coloured_nonland": coloured,
               "per_colour": per, "blue_cards": per["U"], "mono_blue": mono_u,
               "blue_share_of_coloured": round(per["U"] / coloured, 4) if coloured else None,
               "expected_blue_deck_share": round(exp_u, 4) if exp_u is not None else None,
               "uniform_pairs_baseline": 0.4}
    say(f"{key}: {st['lines']} lines, {st['kept']} plain Default-vs-Default decisive drafts")
    return {"key": key, "stats": st, "rows": rows, "rows_all": rows_all, "balance": balance, "ratings": meta.get("ratingsFile")}


def rates(rows: list) -> dict:
    """Draft types, blue's deck share and win rates, and the identity's reconstruction."""
    uu = [r for r in rows if r["seats"][0]["blue"] and r["seats"][1]["blue"]]
    u1 = [r for r in rows if r["seats"][0]["blue"] != r["seats"][1]["blue"]]
    nn = [r for r in rows if not r["seats"][0]["blue"] and not r["seats"][1]["blue"]]
    n = len(rows)
    bw = sum(1 for r in u1 for s in r["seats"] if s["blue"] and s["seat"] == r["winner"])
    blue_decks = 2 * len(uu) + len(u1)
    blue_wins = len(uu) + bw
    non_decks = len(u1) + 2 * len(nn)
    non_wins = (len(u1) - bw) + len(nn)
    w1 = bw / len(u1) if u1 else None
    recon = (len(uu) + (w1 or 0) * len(u1)) / blue_decks if blue_decks else None
    return {"drafts": n, "both_blue": len(uu), "one_blue": len(u1), "no_blue": len(nn),
            "blue_deck_share": round(blue_decks / (2 * n), 4) if n else None,
            "blue_win_rate": round(blue_wins / blue_decks, 4) if blue_decks else None, "blue_ci": wilson(blue_wins, blue_decks),
            "nonblue_win_rate": round(non_wins / non_decks, 4) if non_decks else None, "nonblue_ci": wilson(non_wins, non_decks),
            "both_blue_rate_for_blue": 0.5 if uu else None,
            "one_blue_rate": round(w1, 4) if w1 is not None else None, "one_blue_ci": wilson(bw, len(u1)),
            "recon_err": round(abs(recon - blue_wins / blue_decks), 6) if blue_decks else 0.0}


def one_blue_table(rows: list, quality: str) -> list:
    """One row per one-blue draft: y (blue won), dz (blue minus other, within-cube z), c (other seat's blue takes), blue on play."""
    allq = zs([s[quality] for r in rows for s in r["seats"]])
    out = []
    for i, r in enumerate(rows):
        a, b = r["seats"]
        if a["blue"] == b["blue"]:
            continue
        bi = 0 if a["blue"] else 1
        blue, other = r["seats"][bi], r["seats"][1 - bi]
        out.append({"y": 1.0 if r["winner"] == blue["seat"] else 0.0, "dz": allq[2 * i + bi] - allq[2 * i + 1 - bi],
                    "c": float(other["pool_blue"]), "play": 0.5 if r["on_play"] == blue["seat"] else (-0.5 if r["on_play"] else 0.0),
                    "zq_blue": allq[2 * i + bi]})
    if out:
        q1, q3 = (float(x) for x in np.percentile([t["c"] for t in out], [25, 75]))
        cz = zs([t["c"] for t in out])
        for t, z in zip(out, cz):
            t["low"] = t["c"] <= q1
            t["high"] = t["c"] >= q3 and q3 > q1
            t["cz"] = z
        out[0]["quartiles_c"] = [q1, q3]
    return out


def analyse(tab: list, rows: list, quality: str) -> dict:
    if not tab:
        return {"one_blue": 0, "verdict_code": 0, "verdict": VERDICTS[0], "fit_ok": 0}
    lo = [t for t in tab if t["low"]]
    hi = [t for t in tab if t["high"]]
    kl, kh = sum(t["y"] for t in lo), sum(t["y"] for t in hi)
    wl, wh_ = wilson(kl, len(lo)), wilson(kh, len(hi))
    a_shown = bool(lo and hi and wl[0] is not None and wh_[1] is not None and wl[0] > wh_[1])
    fb = logit_fit(np.array([[1.0, t["dz"], t["play"]] for t in lo]), np.array([t["y"] for t in lo])) if lo else {"ok": 0}
    b_shown = bool(fb.get("ok") and fb["hi"][0] < 0)
    fa = logit_fit(np.array([[1.0, t["cz"], t["play"]] for t in tab]), np.array([t["y"] for t in tab]))
    # blue deck quality where both seats are blue against where one is (contention thins blue decks?)
    allq = zs([s[quality] for r in rows for s in r["seats"]])
    q_uu = [(allq[2 * i] + allq[2 * i + 1]) / 2 for i, r in enumerate(rows) if r["seats"][0]["blue"] and r["seats"][1]["blue"]]
    q_u1 = [t["zq_blue"] for t in tab]
    code = (1 if a_shown else 0) + (2 if b_shown else 0)
    return {
        "one_blue": len(tab), "quartiles_c": tab[0].get("quartiles_c"),
        "low": {"n": len(lo), "blue_win_rate": round(kl / len(lo), 4) if lo else None, "ci": wl,
                "mean_c": round(float(np.mean([t["c"] for t in lo])), 2) if lo else None},
        "high": {"n": len(hi), "blue_win_rate": round(kh / len(hi), 4) if hi else None, "ci": wh_,
                 "mean_c": round(float(np.mean([t["c"] for t in hi])), 2) if hi else None},
        "a_shown": int(a_shown), "b_shown": int(b_shown), "fit_ok": int(bool(fb.get("ok"))),
        "uncontested_model": {**fb, "terms": ["b0 blue at equal quality", "b1 per quality z", "b2 on play"],
                              "b0_rate": inv_logit(fb["b"][0]) if fb.get("ok") else None,
                              "b0_rate_ci": [inv_logit(fb["lo"][0]), inv_logit(fb["hi"][0])] if fb.get("ok") else None},
        "contention_total_effect": {**fa, "terms": ["b0", "per SD of the other seat's blue takes", "on play"]},
        "mean_dz_one_blue": round(float(np.mean([t["dz"] for t in tab])), 4),
        "blue_quality_both_minus_one": welch(q_uu, q_u1),
        "verdict_code": code, "verdict": VERDICTS[code],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="var/cubelab/queue")
    ap.add_argument("--out", default="var/lab-j111")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    say = lambda s: print(s, flush=True)  # noqa: E731
    folders = sorted(f for f in glob.glob(os.path.join(a.root, "normal", "*")) if os.path.isfile(os.path.join(f, "drafts.jsonl")))
    cubes = [read_cube(f, os.path.basename(f), say) for f in folders]
    res = {"written": 1, "root": a.root, "cubes": len(cubes), "per_cube": {}, "pooled": {}, "pooled_score": {}, "pooled_rating": {},
           "bad_lines": sum(c["stats"]["bad"] for c in cubes), "max_recon_err": 0.0}
    tabs_s, tabs_r, rows_pool = [], [], []
    for c in cubes:
        rows = c["rows"]
        r = rates(rows)
        ts, tr = one_blue_table(rows, "score"), one_blue_table(rows, "mean_rating")
        tabs_s += ts
        tabs_r += tr
        rows_pool += rows
        res["max_recon_err"] = max(res["max_recon_err"], r["recon_err"])
        res["per_cube"][c["key"].replace("-", "_")] = {
            "key": c["key"], "ratings": c["ratings"], "stats": c["stats"], "rates": r, "balance": c["balance"],
            "blue_share_over_expected": round(r["blue_deck_share"] / c["balance"]["expected_blue_deck_share"], 3)
            if r["blue_deck_share"] and c["balance"]["expected_blue_deck_share"] else None,
            "score": analyse(ts, rows, "score"), "rating": analyse(tr, rows, "mean_rating"),
            "all_profiles": rates(c["rows_all"]),
        }
    # pooled: the per-cube tables (within-cube z-scores and medians) stacked
    pr = rates(rows_pool)
    ps = analyse(tabs_s, [], "score") if tabs_s else analyse([], [], "score")
    prr = analyse(tabs_r, [], "mean_rating") if tabs_r else analyse([], [], "mean_rating")
    res["pooled"] = {"rates": pr, **{k: ps[k] for k in ("one_blue", "low", "high", "a_shown", "b_shown", "fit_ok", "uncontested_model",
                                                         "contention_total_effect", "mean_dz_one_blue", "verdict_code", "verdict")}}
    res["pooled_rating"] = {k: prr[k] for k in ("a_shown", "b_shown", "fit_ok", "uncontested_model", "verdict_code", "verdict")}
    res["verdict_code"] = ps["verdict_code"]
    res["verdict"] = ps["verdict"]
    res["cubes_a"] = sum(v["score"]["a_shown"] for v in res["per_cube"].values())
    res["cubes_b"] = sum(v["score"]["b_shown"] for v in res["per_cube"].values())
    with open(os.path.join(a.out, "blue.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
        fh.write("\n")
    with open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8") as fh:
        fh.write(render(res))
    p, um = res["pooled"], res["pooled"].get("uncontested_model") or {}
    flat = {"written": 1, "cubes": res["cubes"], "bad_lines": res["bad_lines"], "max_recon_err": res["max_recon_err"],
            "drafts_total": pr["drafts"], "verdict_code": res["verdict_code"], "cubes_a": res["cubes_a"], "cubes_b": res["cubes_b"],
            "pooled_one_blue": p["one_blue"], "pooled_low_n": p["low"]["n"], "pooled_high_n": p["high"]["n"],
            "pooled_low_rate": p["low"]["blue_win_rate"], "pooled_high_rate": p["high"]["blue_win_rate"],
            "pooled_b0_rate": um.get("b0_rate"), "pooled_b0_rate_hi": (um.get("b0_rate_ci") or [None, None])[1],
            "fit_ok": p["fit_ok"], "rating_verdict_code": res["pooled_rating"]["verdict_code"]}
    with open(os.path.join(a.out, "metrics.json"), "w", encoding="utf-8") as fh:
        json.dump({k: v for k, v in flat.items() if v is not None}, fh)
        fh.write("\n")
    say(f"verdict (pooled): {res['verdict']}; cubes showing (a) {res['cubes_a']}, (b) {res['cubes_b']} of {res['cubes']}")
    return 0


def pct(x):
    return "-" if x is None else f"{100 * x:.1f}%"


def ci(c):
    return "-" if not c or c[0] is None else f"[{100 * c[0]:.1f}, {100 * c[1]:.1f}]"


def render(res: dict) -> str:
    L = ["# J111: the blue question", "",
         f"**Pooled verdict: {res['verdict']}.** Cubes showing (a) contention: {res['cubes_a']} of {res['cubes']}; showing (b) Forge plays blue worse: {res['cubes_b']} of {res['cubes']}.", "",
         "Plain (no exploration) Default-vs-Default decisive drafts from the queue's normal cube folders, every night on disk. "
         "A both-blue draft is 0.5 for blue by construction, so blue's deficit lives in one-blue drafts; contention there is the "
         "blue cards the non-blue seat took (low band: at or under the cube's 25th percentile; high band: at or over its 75th).", "",
         "## Blue's share and win rate", "",
         "| cube | drafts | both / one / no blue | blue deck share | expected from its cards | blue cards (mono-U) | blue win rate | non-blue | one-blue drafts: blue |",
         "|---|---|---|---|---|---|---|---|---|"]
    for v in res["per_cube"].values():
        r, b = v["rates"], v["balance"]
        L.append(f"| {v['key']} | {r['drafts']} | {r['both_blue']} / {r['one_blue']} / {r['no_blue']} | {pct(r['blue_deck_share'])} | "
                 f"{pct(b['expected_blue_deck_share'])} | {b['blue_cards']} of {b['coloured_nonland']} coloured ({b['mono_blue']}) | "
                 f"{pct(r['blue_win_rate'])} {ci(r['blue_ci'])} | {pct(r['nonblue_win_rate'])} {ci(r['nonblue_ci'])} | {pct(r['one_blue_rate'])} {ci(r['one_blue_ci'])} |")
    L += ["", "## The rule's two tests (quality: the lab's deck score)", "",
          "| cube | low band: blue | high band: blue | (a) | uncontested, equal quality: blue | (b) | verdict |", "|---|---|---|---|---|---|---|"]
    rows = list(res["per_cube"].values()) + [{"key": "**pooled**", "score": res["pooled"]}]
    for v in rows:
        s = v["score"]
        um = s.get("uncontested_model") or {}
        L.append(f"| {v['key']} | {pct(s.get('low', {}).get('blue_win_rate'))} {ci(s.get('low', {}).get('ci'))} n={s.get('low', {}).get('n')} | "
                 f"{pct(s.get('high', {}).get('blue_win_rate'))} {ci(s.get('high', {}).get('ci'))} n={s.get('high', {}).get('n')} | {'shown' if s.get('a_shown') else '-'} | "
                 f"{pct(um.get('b0_rate'))} {ci(um.get('b0_rate_ci'))} | {'shown' if s.get('b_shown') else '-'} | {s.get('verdict')} |")
    pr = res["pooled_rating"]
    ce = res["pooled"].get("contention_total_effect") or {}
    L += ["", "## Secondary (not in the verdict)", "",
          f"- Quality as the deck's mean nonland card rating instead: pooled verdict {pr['verdict']}; uncontested blue at equal quality "
          f"{pct((pr.get('uncontested_model') or {}).get('b0_rate'))} {ci((pr.get('uncontested_model') or {}).get('b0_rate_ci'))}.",
          f"- Contention's total effect (logit, per SD of the other seat's blue takes, one-blue drafts): "
          f"{(ce.get('b') or [None, None])[1]} [{(ce.get('lo') or [None, None])[1]}, {(ce.get('hi') or [None, None])[1]}].",
          f"- Blue deck quality (z), both-blue minus one-blue drafts, per cube: "
          + "; ".join(f"{v['key']} {v['score']['blue_quality_both_minus_one']['diff']} [{v['score']['blue_quality_both_minus_one']['lo']}, {v['score']['blue_quality_both_minus_one']['hi']}]" for v in res["per_cube"].values()) + ".",
          "- Every profile (nights 4-5's mix included), blue win rate against non-blue: "
          + "; ".join(f"{v['key']} {pct(v['all_profiles']['blue_win_rate'])} vs {pct(v['all_profiles']['nonblue_win_rate'])}" for v in res["per_cube"].values()) + ".",
          "", "Expected share: the share of two-colour pairs holding blue when pairs are weighted by the product of their colours' "
          "nonland card counts (a multicolour card counts in each of its colours); 40% if every pair were equally likely. "
          "(b) cannot tell Forge piloting blue badly from the lab's ratings over-rating blue cards for Forge's pilot. "
          "Games in one draft are one game here (best of one), so the intervals are per draft.", ""]
    return "\n".join(L)


if __name__ == "__main__":
    sys.exit(main())
J111EOF
rm -rf var/lab-j111-pilot
for d in var/cubelab/queue/normal/*/; do
  c=$(basename "$d")
  test -s "$d/drafts.jsonl" || continue
  p=var/lab-j111-pilot/queue/normal/$c
  mkdir -p "$p"
  cp "$d/run.json" "$d/cards.json" "$p/"
  head -n 400 "$d/drafts.jsonl" > "$p/drafts.jsonl"
done
python3 var/lab-j111-tools/blue.py --root var/lab-j111-pilot/queue --out var/lab-j111-pilot/out
cat var/lab-j111-pilot/out/metrics.json
```
metrics: pj = sh: cat var/lab-j111-pilot/out/metrics.json 2>/dev/null || echo '{"written":0}'
check: qwriters == 0
check: pj.written == 1
check: pj.cubes == 7
check: pj.bad_lines == 0
check: pj.drafts_total >= 100
check: pj.max_recon_err < 0.001

## Commands
```bash
python3 var/lab-j111-tools/blue.py --root var/cubelab/queue --out var/lab-j111
cat var/lab-j111/summary.md
rm -rf var/lab-j111-pilot
```
check: bj.written == 1
check: bj.cubes == 7
check: bj.bad_lines == 0
check: bj.max_recon_err < 0.001
check: bj.pooled_one_blue >= 1000
check: bj.fit_ok == 1
check: bj.verdict_code between 0 and 3

`verdict_code`: 0 neither shown, 1 (a) contention, 2 (b) Forge plays blue worse, 3 both. The checks only
say that the query ran on the whole data. Which explanation holds is the `rule:`, read from `blue.json`.

## Abort if
abort: qwriters > 0
abort: elapsed_s > 3600

## Report
collect: var/lab-j111/blue.json
collect: var/lab-j111/metrics.json
collect: var/lab-j111/summary.md

`summary.md` is written by the job (its tables). The PC session adds its reading below it, plainly:
- **The pooled verdict,** with the two numbers it rests on:
  - the low and high bands' blue win rates and their intervals;
  - blue's quality-adjusted rate in the low band and its interval.
- **The secondary numbers:** the mean-rating verdict, contention's total effect, blue deck quality in
  both-blue against one-blue drafts, and the all-profiles rates.
- **Per cube:** blue's deck share against the share its own cards predict. Name the cube where blue is most
  over-drafted, and the one where it is least.
- **The follow-up:** the line `blue-advice` should become. Contention: ForgeCoach's Draft vs AI says the AI
  over-drafts blue, and that an uncontested blue drafter does fine. Forge's play: the pair win rates carry a "Forge
  plays these worse than they are" caveat. Neither shown: no claim, only the share.
