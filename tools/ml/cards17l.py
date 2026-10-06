#!/usr/bin/env python3
# mtg-table — tools/ml: the lab's card strengths against human results on 17Lands (D396).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Do the lab's card ratings mean anything to a human drafter?

    python3 tools/ml/cards17l.py fetch [--set powered-premier|powered-trad] [--dir var/ml/17lands]
    python3 tools/ml/cards17l.py stats GAME_DATA.csv.gz --out var/ml/17lands/cards-premier.json
    python3 tools/ml/cards17l.py compare --stats var/ml/17lands/cards-premier.json \\
        --power var/ml/matchup/nights-1-2/power.tsv --cube cubes/vintage-cube-180.md \\
        [--meta vintage-cube-180.meta.json] [--cards var/ml/17lands/cards.csv] --report report.json

THE HUMAN SIDE.  17Lands' public GAME data for Arena's Powered Cube
(`game_data_public.Cube_-_Powered.<event>.csv.gz`; 17Lands public datasets,
https://www.17lands.com/public_datasets, CC BY 4.0,
https://creativecommons.org/licenses/by/4.0/; only the published files are
read, never the API): one row per game the 17Lands USER played, with `won` and,
for every card of the cube, `opening_hand_<name>`, `drawn_<name>`,
`tutored_<name>`, `deck_<name>` and `sideboard_<name>` counts.  `stats` streams
it once (ext17l.GzLines: a file cut short is read up to its last whole row and
marked partial) and writes each card's games and wins:
  * GP (in the deck), GIH (in the opening hand or drawn: 17Lands' "games in
    hand"), OH (opening hand), GNS (in the deck, never seen: not in the opening
    hand, drawn or tutored);
  * the win rates GP WR, GIH WR, OH WR, GNS WR and IWD = GIH WR - GNS WR (the
    "improvement when drawn", which cancels some of the deck's strength);
  * the same counts in two halves of the drafts (a hash of draft_id), so
    `compare` can say how reliable the human ranking itself is.
These are the user's games only: an engaged population, above 50% on average.

THE LAB SIDE.  The matchup model's card power (M0, `power.tsv`, D342: logits per
copy relative to the average nonland card; J062 wrote it from nights 1-3's plain
games), and, when `--meta` names one, the cube's meta.json win rates
(`winRateShrunk`, what ForgeCoach's deck assistant reads).  A card the model
marks AI-limited (`ai` = limited, D343) is not rated and is left out.

THE COMPARISON (`compare`), over the Vintage cube's cards (`--cube`), by name:
the front face, case-folded, accents and curly quotes flattened.
  * overlap: cube cards, with a lab rating, in 17Lands' data, and both with at
    least `--min-gih` human GIH games (500): the compared set;
  * Spearman's rho between the lab's power and the human GIH WR, with a 95%
    percentile bootstrap interval over cards (2,000 resamples, seed 20261006),
    for every card and for nonland cards; the same against GP WR and IWD, and
    for the meta win rate; the human split-half reliability (Spearman between
    the halves, stepped up by Spearman-Brown) as the ceiling any lab measure can
    reach against this data;
  * the biggest disagreements: each card's percentile on both sides, the lab
    minus the human, the 15 the lab rates highest above the humans and the 15
    lowest below;
  * colour: each card's colour identity (17Lands' cards.csv), and per group
    (W, U, B, R, G, multicolour, colourless) and for cheap creatures (mana value
    <= 2, an "aggressive" proxy), the mean of z(lab) - z(human) with a bootstrap
    interval over the group's cards.  Positive: the lab rates the group above
    where humans do.  The z-scores are over the compared nonland set.

THE READING (CARDS_RULE, D396, written before the run): the lab's ranking
AGREES with humans when nonland rho(power, GIH WR) >= 0.5 and its interval's
lower end is above 0.3; it is WEAK when the lower end is above 0 but not that;
and NONE otherwise.  Forge OVERRATES a colour group when its mean
z(lab) - z(human) has a 95% interval above 0 (and UNDERRATES it below 0).  Red
and cheap creatures are the pre-registered groups (the outside review's
hypothesis); the others are reported without a verdict.
Standard library only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import sys
import unicodedata
from typing import Any, Iterable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import encode as E  # noqa: E402
import ext17l as X  # noqa: E402

BASE = X.BASE
GAMES = {
    "powered-premier": f"{BASE}/game_data/game_data_public.Cube_-_Powered.PremierDraft.csv.gz",
    "powered-trad": f"{BASE}/game_data/game_data_public.Cube_-_Powered.TradDraft.csv.gz",
}
ATTRIBUTION = ("Human games: 17Lands public datasets (https://www.17lands.com/public_datasets), CC BY 4.0 "
               "(https://creativecommons.org/licenses/by/4.0/); per-card counts derived from Powered Cube game data")
HALF_SALT = "cards17l-v1"
FIELDS = ("opening_hand_", "drawn_", "tutored_", "deck_")

CARDS_RULE = {
    "minGih": 500,                    # human games in hand for a card to be compared
    "bootstrap": 2000, "ci": 0.95, "seed": 20261006,
    "agreeRho": 0.5, "agreeLo": 0.3,  # AGREES: rho >= 0.5 and lower end > 0.3; WEAK: lower end > 0; else NONE
    "primary": "nonland cards: Spearman(power, GIH WR)",
    "groups": ("R", "cheapCreature"),  # pre-registered: does Forge overrate red / aggressive cards?
    "top": 15,
}


# ---------------------------------------------------------------- names

def norm(name: str) -> str:
    """The join key: front face, case-folded, accents and typographic quotes flattened, spaces collapsed."""
    s = name.split(" // ")[0].replace("’", "'").replace("‘", "'")
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    return " ".join(s.casefold().split())


# ---------------------------------------------------------------- stats: one pass over a game-data file

def half_of(draft_id: str) -> int:
    return int(hashlib.sha256(f"{HALF_SALT}|{draft_id}".encode()).hexdigest()[:8], 16) & 1


def blank() -> list[int]:
    # gp, gpWins, gih, gihWins, oh, ohWins, gns, gnsWins, then gih/gihWins per half
    return [0] * 12


def stats(path: str, max_games: int | None = None) -> dict[str, Any]:
    src = X.GzLines(path)
    import csv
    csv.field_size_limit(1 << 30)
    reader = csv.reader(iter(src))
    header = next(reader)
    ix = {c: i for i, c in enumerate(header)}
    for need in ("won", "draft_id"):
        if need not in ix:
            raise SystemExit(f"cards17l: {path} has no `{need}` column: not a 17Lands game-data file")
    names = sorted({c[len("deck_"):] for c in header if c.startswith("deck_")})
    cols = [(n, ix[f"deck_{n}"], ix.get(f"opening_hand_{n}"), ix.get(f"drawn_{n}"), ix.get(f"tutored_{n}")) for n in names]
    per = {n: blank() for n in names}
    games = wins = bad = 0
    halves = [[0, 0], [0, 0]]
    events: dict[str, int] = {}
    width = len(header)
    pending: list[str] | None = None

    def take(row: list[str]) -> None:
        nonlocal games, wins, bad
        w = row[ix["won"]]
        if w not in ("True", "False"):
            bad += 1
            return
        won = 1 if w == "True" else 0
        h = half_of(row[ix["draft_id"]])
        games += 1
        wins += won
        halves[h][0] += 1
        halves[h][1] += won
        ev = row[ix["event_type"]] if "event_type" in ix else ""
        events[ev] = events.get(ev, 0) + 1
        for n, d, o, dr, t in cols:
            if row[d] in ("0", "", "0.0"):
                continue
            s = per[n]
            s[0] += 1
            s[1] += won
            oh = o is not None and row[o] not in ("0", "", "0.0")
            dn = dr is not None and row[dr] not in ("0", "", "0.0")
            tu = t is not None and row[t] not in ("0", "", "0.0")
            if oh or dn:
                s[2] += 1
                s[3] += won
                s[8 + 2 * h] += 1
                s[9 + 2 * h] += won
            if oh:
                s[4] += 1
                s[5] += won
            if not (oh or dn or tu):
                s[6] += 1
                s[7] += won

    try:
        for row in reader:
            if pending is not None:
                take(pending)
                if max_games is not None and games >= max_games:
                    pending = None
                    break
            pending = row
    except csv.Error:
        pending = None
    # GzLines never hands over the line a cut fell in, so a last row of the header's width is whole
    if pending is not None and len(pending) == width:
        take(pending)
    rate = lambda w, n: w / n if n else None  # noqa: E731
    cards = {}
    for n, s in per.items():
        if s[0] == 0:
            continue
        gih, gns = rate(s[3], s[2]), rate(s[7], s[6])
        cards[n] = {"gp": s[0], "gpW": s[1], "gpWr": rate(s[1], s[0]), "gih": s[2], "gihW": s[3], "gihWr": gih,
                    "oh": s[4], "ohW": s[5], "ohWr": rate(s[5], s[4]), "gns": s[6], "gnsW": s[7], "gnsWr": gns,
                    "iwd": gih - gns if gih is not None and gns is not None else None,
                    "half": [[s[8], s[9]], [s[10], s[11]]]}
    return {"v": 1, "source": os.path.basename(path), "attribution": ATTRIBUTION, "games": games, "wins": wins,
            "winRate": rate(wins, games), "badRows": bad, "partial": not src.clean or max_games is not None,
            "events": events, "halves": halves, "cardColumns": len(names), "cards": cards}


# ---------------------------------------------------------------- the lab side

def read_power(path: str) -> dict[str, dict[str, Any]]:
    """power.tsv (matchup.py) -> name -> {power, sdPost, games, land, ai}; comment lines skipped."""
    out: dict[str, dict[str, Any]] = {}
    head: list[str] | None = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            cells = line.rstrip("\n").split("\t")
            if head is None:
                head = cells
                if "name" not in head or "power" not in head:
                    raise SystemExit(f"cards17l: {path} is not a matchup power.tsv (no name/power columns)")
                continue
            r = dict(zip(head, cells))
            try:
                out[r["name"]] = {"power": float(r["power"]), "sdPost": float(r["sdPost"]) if r.get("sdPost") else None,
                                  "games": int(float(r.get("games") or 0)), "land": r.get("land") in ("1", "true", "True"),
                                  "ai": r.get("ai") or ""}
            except ValueError:
                continue
    return out


def read_meta(path: str) -> dict[str, float]:
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    out = {}
    for n, c in (m.get("cards") or {}).items():
        w = c.get("winRateShrunk", c.get("winRate"))
        if isinstance(w, (int, float)) and (c.get("games") or 0) > 0:
            out[n] = float(w)
    return out


def read_card_info(path: str | None) -> dict[str, dict[str, Any]]:
    """17Lands' cards.csv -> norm(name) -> colour identity, mana value, types (the first row of a name)."""
    out: dict[str, dict[str, Any]] = {}
    if not path or not os.path.isfile(path):
        return out
    import csv
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            k = norm(r.get("name") or "")
            if not k or k in out or (r.get("rarity") or "") == "token":
                continue
            try:
                mv = float(r.get("mana_value") or "nan")
            except ValueError:
                mv = float("nan")
            out[k] = {"colors": (r.get("color_identity") or "").strip(), "mv": mv, "types": r.get("types") or ""}
    return out


# ---------------------------------------------------------------- small statistics

def avg_ranks(xs: list[float]) -> list[float]:
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def pearson(a: list[float], b: list[float]) -> float | None:
    n = len(a)
    if n < 3:
        return None
    ma, mb = sum(a) / n, sum(b) / n
    va = sum((x - ma) ** 2 for x in a)
    vb = sum((y - mb) ** 2 for y in b)
    if va <= 0 or vb <= 0:
        return None
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(va * vb)


def spearman(a: list[float], b: list[float]) -> float | None:
    return pearson(avg_ranks(a), avg_ranks(b))


def percentile(xs: list[float], q: float) -> float | None:
    s = sorted(x for x in xs if x is not None and x == x)
    if not s:
        return None
    k = (len(s) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def boot_spearman(a: list[float], b: list[float], rule: dict[str, Any] = CARDS_RULE) -> dict[str, Any]:
    est = spearman(a, b)
    rng = random.Random(rule["seed"])
    n = len(a)
    reps = []
    for _ in range(rule["bootstrap"] if n >= 3 else 0):
        ix = [rng.randrange(n) for _ in range(n)]
        r = spearman([a[i] for i in ix], [b[i] for i in ix])
        if r is not None:
            reps.append(r)
    q = (1 - rule["ci"]) / 2
    return {"n": n, "rho": est, "lo": percentile(reps, q), "hi": percentile(reps, 1 - q)}


def boot_mean(xs: list[float], rule: dict[str, Any] = CARDS_RULE) -> dict[str, Any]:
    n = len(xs)
    if n == 0:
        return {"n": 0, "mean": None, "lo": None, "hi": None}
    rng = random.Random(rule["seed"])
    reps = [sum(xs[rng.randrange(n)] for _ in range(n)) / n for _ in range(rule["bootstrap"])]
    q = (1 - rule["ci"]) / 2
    return {"n": n, "mean": sum(xs) / n, "lo": percentile(reps, q), "hi": percentile(reps, 1 - q)}


def zscores(xs: list[float]) -> list[float]:
    n = len(xs)
    m = sum(xs) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1)) if n > 1 else 0.0
    return [(x - m) / sd if sd > 0 else 0.0 for x in xs]


def colour_group(colors: str) -> str:
    c = "".join(ch for ch in colors.upper() if ch in "WUBRG")
    if not c:
        return "C"
    return c if len(c) == 1 else "multi"


# ---------------------------------------------------------------- compare

def merge_stats(paths: Iterable[str]) -> dict[str, Any]:
    """One or more stats.json files (Premier, Trad) summed card by card."""
    out: dict[str, Any] = {"games": 0, "partial": False, "sources": [], "cards": {}}
    for p in paths:
        with open(p, encoding="utf-8") as f:
            s = json.load(f)
        out["games"] += s["games"]
        out["partial"] = out["partial"] or bool(s.get("partial"))
        out["sources"].append(s.get("source"))
        for n, c in s["cards"].items():
            t = out["cards"].setdefault(n, {"gp": 0, "gpW": 0, "gih": 0, "gihW": 0, "oh": 0, "ohW": 0, "gns": 0, "gnsW": 0,
                                            "half": [[0, 0], [0, 0]]})
            for k in ("gp", "gih", "oh", "gns"):
                t[k] += c[k]
                t[k + "W"] += c[k + "W"]
            for h in (0, 1):
                t["half"][h][0] += c["half"][h][0]
                t["half"][h][1] += c["half"][h][1]
    for t in out["cards"].values():
        r = lambda k: t[k + "W"] / t[k] if t[k] else None  # noqa: E731
        t.update(gpWr=r("gp"), gihWr=r("gih"), ohWr=r("oh"), gnsWr=r("gns"))
        t["iwd"] = t["gihWr"] - t["gnsWr"] if t["gihWr"] is not None and t["gnsWr"] is not None else None
    return out


def compare(human: dict[str, Any], power: dict[str, dict[str, Any]], cube: list[str], info: dict[str, dict[str, Any]],
            meta: dict[str, float] | None = None, rule: dict[str, Any] = CARDS_RULE) -> dict[str, Any]:
    hk = {norm(n): (n, c) for n, c in human["cards"].items()}
    pk = {norm(n): (n, p) for n, p in power.items()}
    mk = {norm(n): w for n, w in (meta or {}).items()}
    cube_keys = []
    for n in cube:
        k = norm(n)
        if k not in cube_keys:
            cube_keys.append(k)
    overlap = {"cube": len(cube_keys),
               "withPower": sum(1 for k in cube_keys if k in pk),
               "aiLimited": sum(1 for k in cube_keys if k in pk and pk[k][1]["ai"] == "limited"),
               "in17Lands": sum(1 for k in cube_keys if k in hk),
               "withMeta": sum(1 for k in cube_keys if k in mk) if meta is not None else None}
    rows = []
    for k in cube_keys:
        if k not in pk or k not in hk or pk[k][1]["ai"] == "limited":
            continue
        name, p = pk[k]
        _, h = hk[k]
        if (h["gih"] or 0) < rule["minGih"] or h["gihWr"] is None:
            continue
        ci = info.get(k) or {}
        types = ci.get("types") or ""
        land = bool(p["land"]) or "Land" in types.split(" - ")[0]
        mv = ci.get("mv")
        rows.append({"name": name, "power": p["power"], "sdPost": p["sdPost"], "labGames": p["games"], "land": land,
                     "meta": mk.get(k), "gih": h["gih"], "gihWr": h["gihWr"], "gpWr": h["gpWr"], "ohWr": h["ohWr"],
                     "iwd": h["iwd"], "gp": h["gp"], "half": h["half"], "colors": ci.get("colors"),
                     "group": colour_group(ci.get("colors") or "") if ci else "?",
                     "cheapCreature": "Creature" in types and isinstance(mv, float) and mv == mv and mv <= 2})
    overlap["compared"] = len(rows)
    overlap["comparedNonland"] = sum(1 for r in rows if not r["land"])

    def rho(rs: list[dict[str, Any]], lab: str, hum: str) -> dict[str, Any]:
        both = [r for r in rs if r[lab] is not None and r[hum] is not None]
        return boot_spearman([r[lab] for r in both], [r[hum] for r in both], rule)

    nonland = [r for r in rows if not r["land"]]
    corr = {"nonland": {"gihWr": rho(nonland, "power", "gihWr"), "gpWr": rho(nonland, "power", "gpWr"),
                        "iwd": rho(nonland, "power", "iwd"), "ohWr": rho(nonland, "power", "ohWr")},
            "all": {"gihWr": rho(rows, "power", "gihWr")}}
    if meta is not None:
        corr["meta"] = {"nonland": {"gihWr": rho(nonland, "meta", "gihWr")}, "powerVsMeta": rho(nonland, "power", "meta")}
    # the human ranking's own reliability: its two halves, stepped up to the whole (Spearman-Brown)
    hh = [r for r in nonland if r["half"][0][0] >= rule["minGih"] / 4 and r["half"][1][0] >= rule["minGih"] / 4]
    sh = spearman([r["half"][0][1] / r["half"][0][0] for r in hh], [r["half"][1][1] / r["half"][1][0] for r in hh]) if hh else None
    reliability = {"n": len(hh), "splitHalf": sh, "spearmanBrown": (2 * sh / (1 + sh)) if sh is not None and sh > -1 else None}
    # disagreements: percentiles on each side over the nonland set
    if nonland:
        lr = avg_ranks([r["power"] for r in nonland])
        hr = avg_ranks([r["gihWr"] for r in nonland])
        n = len(nonland)
        for r, a, b in zip(nonland, lr, hr):
            r["labPct"] = (a - 0.5) / n
            r["humanPct"] = (b - 0.5) / n
            r["labMinusHuman"] = r["labPct"] - r["humanPct"]
        zl = zscores([r["power"] for r in nonland])
        zh = zscores([r["gihWr"] for r in nonland])
        for r, a, b in zip(nonland, zl, zh):
            r["zDiff"] = a - b
    srt = sorted(nonland, key=lambda r: r["labMinusHuman"])
    keep = ("name", "group", "power", "gihWr", "gih", "labPct", "humanPct", "labMinusHuman")
    over = [{k: r[k] for k in keep} for r in reversed(srt[-rule["top"]:])]
    under = [{k: r[k] for k in keep} for r in srt[:rule["top"]]]
    groups = {}
    for g in ("W", "U", "B", "R", "G", "multi", "C"):
        groups[g] = boot_mean([r["zDiff"] for r in nonland if r["group"] == g], rule)
    groups["cheapCreature"] = boot_mean([r["zDiff"] for r in nonland if r["cheapCreature"]], rule)
    groups["otherNonland"] = boot_mean([r["zDiff"] for r in nonland if not r["cheapCreature"]], rule)
    for g, v in groups.items():
        v["verdict"] = (None if v["lo"] is None else "overrates" if v["lo"] > 0 else "underrates" if v["hi"] < 0 else "no difference shown")
        v["preRegistered"] = g in rule["groups"]
    p = corr["nonland"]["gihWr"]
    if p["rho"] is None or p["lo"] is None:
        reading = "NONE: too few cards"
    elif p["rho"] >= rule["agreeRho"] and p["lo"] > rule["agreeLo"]:
        reading = "AGREES"
    elif p["lo"] > 0:
        reading = "WEAK"
    else:
        reading = "NONE"
    return {"rule": rule, "humanGames": human.get("games"), "humanPartial": bool(human.get("partial")), "sources": human.get("sources"),
            "overlap": overlap, "corr": corr, "humanReliability": reliability, "reading": reading,
            "overrated": over, "underrated": under, "groups": groups, "rows": rows}


def render(rep: dict[str, Any]) -> str:
    f = lambda x, p=".3f": "n/a" if x is None else format(x, p)  # noqa: E731
    c = lambda d: f"{f(d['rho'])} [{f(d['lo'])}, {f(d['hi'])}] (n {d['n']})"  # noqa: E731
    o = rep["overlap"]
    out = [ATTRIBUTION,
           f"human games {rep['humanGames']} from {', '.join(s for s in rep['sources'] if s)}{' (PARTIAL)' if rep['humanPartial'] else ''}",
           f"overlap: cube {o['cube']}, with lab power {o['withPower']} ({o['aiLimited']} AI-limited, left out), in 17Lands {o['in17Lands']}, "
           f"compared (>= {rep['rule']['minGih']} GIH games) {o['compared']}, nonland {o['comparedNonland']}"
           + (f", with meta {o['withMeta']}" if o.get("withMeta") is not None else ""),
           f"Spearman power vs GIH WR, nonland: {c(rep['corr']['nonland']['gihWr'])}; all cards {c(rep['corr']['all']['gihWr'])}",
           f"  vs GP WR {c(rep['corr']['nonland']['gpWr'])}; vs IWD {c(rep['corr']['nonland']['iwd'])}; vs OH WR {c(rep['corr']['nonland']['ohWr'])}"]
    if "meta" in rep["corr"]:
        out.append(f"  meta win rate vs GIH WR {c(rep['corr']['meta']['nonland']['gihWr'])}; power vs meta {c(rep['corr']['meta']['powerVsMeta'])}")
    hr = rep["humanReliability"]
    out.append(f"human split-half Spearman {f(hr['splitHalf'])} (whole data, Spearman-Brown {f(hr['spearmanBrown'])}; n {hr['n']}): the ceiling")
    out.append(f"reading (D396): {rep['reading']}")
    out.append("lab rates above humans (lab pct - human pct):")
    for r in rep["overrated"]:
        out.append(f"  {r['name']:32s} {r['group']:5s} power {r['power']:+.3f}  GIH WR {r['gihWr']:.3f} (n {r['gih']})  {r['labPct']:.2f} vs {r['humanPct']:.2f}")
    out.append("lab rates below humans:")
    for r in rep["underrated"]:
        out.append(f"  {r['name']:32s} {r['group']:5s} power {r['power']:+.3f}  GIH WR {r['gihWr']:.3f} (n {r['gih']})  {r['labPct']:.2f} vs {r['humanPct']:.2f}")
    out.append("mean z(lab) - z(human) by group (positive: the lab rates the group above humans):")
    for g, v in rep["groups"].items():
        out.append(f"  {g:14s} n {v['n']:3d}  {f(v['mean'], '+.3f')} [{f(v['lo'], '+.3f')}, {f(v['hi'], '+.3f')}]  {v['verdict'] or ''}"
                   + ("  (pre-registered)" if v["preRegistered"] else ""))
    return "\n".join(out)


READINGS = {"AGREES": 2, "WEAK": 1, "NONE": 0}


def flat_metrics(path: str) -> dict[str, Any]:
    """The headline numbers of a compare report, flat: written, overlap, rho [lo, hi], the reading (2 agrees, 1 weak,
    0 none) and the pre-registered groups' mean z(lab) - z(human) with their intervals."""
    try:
        with open(path, encoding="utf-8") as f:
            r = json.load(f)
    except (OSError, ValueError):
        return {"written": 0}
    p = r["corr"]["nonland"]["gihWr"]
    out: dict[str, Any] = {"written": 1, "humanGames": r.get("humanGames") or 0, "partial": 1 if r.get("humanPartial") else 0,
                           "cube": r["overlap"]["cube"], "withPower": r["overlap"]["withPower"], "in17Lands": r["overlap"]["in17Lands"],
                           "compared": r["overlap"]["compared"], "nonland": r["overlap"]["comparedNonland"],
                           "rho": p["rho"], "lo": p["lo"], "hi": p["hi"], "reading": READINGS.get(str(r.get("reading")).split(":")[0], 0),
                           "ruleChanged": 1 if r["rule"].get("ruleChanged") else 0}
    for g in ("R", "cheapCreature"):
        v = r["groups"].get(g) or {}
        out[f"{g}_n"], out[f"{g}_mean"], out[f"{g}_lo"], out[f"{g}_hi"] = v.get("n", 0), v.get("mean"), v.get("lo"), v.get("hi")
    return {k: v for k, v in out.items() if v is not None}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    fe = sub.add_parser("fetch", help="download a Powered Cube game-data file and cards.csv (resumable, size-checked)")
    fe.add_argument("--set", choices=sorted(GAMES), default="powered-premier")
    fe.add_argument("--dir", default="var/ml/17lands")
    fe.add_argument("--max-bytes", type=int, default=None)
    st = sub.add_parser("stats", help="a game-data file -> per-card human games and win rates")
    st.add_argument("games")
    st.add_argument("--out", required=True)
    st.add_argument("--max-games", type=int, default=None, help="stop after N games (marked partial)")
    cp = sub.add_parser("compare", help="the lab's card strengths against the human stats")
    cp.add_argument("--stats", action="append", required=True, help="stats.json (repeat to pool Premier and Trad)")
    cp.add_argument("--power", required=True)
    cp.add_argument("--cube", default="cubes/vintage-cube-180.md")
    cp.add_argument("--meta", help="the cube's meta.json (winRateShrunk), optional")
    cp.add_argument("--cards", default="var/ml/17lands/cards.csv", help="17Lands' cards.csv (colours, mana value, types)")
    cp.add_argument("--min-gih", type=int, default=None, help=f"human GIH games to compare a card (rule: {CARDS_RULE['minGih']})")
    cp.add_argument("--report")
    me = sub.add_parser("metrics", help="a compare report -> one flat JSON object (the runner's metrics), or {written: 0}")
    me.add_argument("report")
    a = ap.parse_args(argv)
    if a.cmd == "metrics":
        print(json.dumps(flat_metrics(a.report)))
        return 0
    if a.cmd == "fetch":
        X.cards_file(os.path.join(a.dir, "cards.csv"))
        url = GAMES[a.set]
        X.download(url, os.path.join(a.dir, os.path.basename(url)), a.max_bytes)
        print(f"source: {ATTRIBUTION}")
        return 0
    if a.cmd == "stats":
        s = stats(a.games, a.max_games)
        d = os.path.dirname(a.out)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(s, f, indent=1)
            f.write("\n")
        print(f"cards17l stats: {s['games']} games ({s['winRate'] and round(s['winRate'], 4)} won), {len(s['cards'])} cards, "
              f"{s['badRows']} bad rows{', PARTIAL' if s['partial'] else ''} -> {a.out}")
        return 0
    rule = dict(CARDS_RULE)
    if a.min_gih is not None:
        rule["minGih"] = a.min_gih
        rule["ruleChanged"] = True
    with open(a.cube, encoding="utf-8") as f:
        cube = E.parse_cube_markdown(f.read())
    rep = compare(merge_stats(a.stats), read_power(a.power), cube, read_card_info(a.cards),
                  read_meta(a.meta) if a.meta else None, rule)
    rep["inputs"] = {"stats": a.stats, "power": a.power, "cube": a.cube, "meta": a.meta, "cards": a.cards}
    if a.report:
        d = os.path.dirname(a.report)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1)
            f.write("\n")
    print(render(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
