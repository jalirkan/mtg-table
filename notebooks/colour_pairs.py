# mtg-table — notebooks: colour-pair balance per cube, from the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/colour_pairs.py` runs it top to bottom.  Needs duckdb and pandas.
# ---

# %% [markdown]
# # Colour-pair balance per cube
#
# How often the drafters end in each colour pair, and how those decks fare, per cube, over plain
# decisive games (exploring drafts, D358, left out). A deck's colours are its main colours as the
# builder wrote them (`decks.colors`, the played deck's; a splash is not a colour here).
# Wilson's 95% interval beside every rate. The matchup model's de-biased balance number (D342) is
# the better single figure for "is this cube balanced"; this is the plain table to look at first.
#
# **Forge against Forge.** These are Forge Default's decks played by Forge Default against Forge
# Default: a pair's rate is the AI's with those colours, not the archetype's for a person. Games
# within one draft are correlated, so the intervals are optimistic.

# %%
import math
import os
import pathlib

import duckdb
import pandas as pd

try:
    from IPython.display import display
except ImportError:
    display = print

pd.set_option("display.width", 160)


def find_db() -> str:
    if os.environ.get("LAB_WAREHOUSE"):
        return os.environ["LAB_WAREHOUSE"]
    for d in [pathlib.Path.cwd(), *pathlib.Path.cwd().parents]:
        p = d / "var" / "warehouse" / "lab.duckdb"
        if p.exists():
            return str(p)
    raise SystemExit("no var/warehouse/lab.duckdb: run `python3 tools/lab/warehouse.py ingest` first")


con = duckdb.connect(find_db(), read_only=True)


def wilson(k: float, n: float, z: float = 1.96) -> tuple:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


def wubrg(c) -> str:
    return "".join(sorted(c or "", key="WUBRG".index)) if c and set(c) <= set("WUBRG") else (c or "?")


# %% [markdown]
# ## Pairs by cube

# %%
sg = con.sql("""
    select cube, colors, won from seat_games
    where not explore and decisive and not errored""").df()
sg["pair"] = sg.colors.map(wubrg)
pairs = sg.groupby(["cube", "pair"]).agg(games=("won", "size"), wins=("won", "sum")).reset_index()
pairs["share"] = pairs.games / pairs.groupby("cube").games.transform("sum")
pairs["win_rate"] = pairs.wins / pairs.games
ci = [wilson(k, n) for k, n in zip(pairs.wins, pairs.games)]
pairs["lo"], pairs["hi"] = [a for a, _ in ci], [b for _, b in ci]
for cube, df in pairs.groupby("cube"):
    print(f"\n== {cube}: {int(df.games.sum())} deck-games")
    display(df.sort_values("win_rate", ascending=False)[["pair", "games", "share", "win_rate", "lo", "hi"]].round(3))

# %% [markdown]
# ## One number per cube: the spread of the pairs' win rates
#
# The SD of the pairs' win rates, weighted by games, against what pure chance would give if every
# pair were at 50% (binomial noise alone). A ratio near 1 says the spread is noise.

# %%
rows = []
for cube, df in pairs.groupby("cube"):
    w = df.games / df.games.sum()
    mean = (w * df.win_rate).sum()
    sd = math.sqrt((w * (df.win_rate - mean) ** 2).sum())
    noise = math.sqrt((w * 0.25 / df.games).sum())
    rows.append({"cube": cube, "pairs": len(df), "deck_games": int(df.games.sum()), "sd_win_rate": sd,
                 "sd_if_all_50pct": noise, "ratio": sd / noise if noise else float("nan")})
display(pd.DataFrame(rows).round(3))

# %% [markdown]
# ## As a grid (cube x pair, win rate)

# %%
display(pairs.pivot_table(index="cube", columns="pair", values="win_rate").round(2))
