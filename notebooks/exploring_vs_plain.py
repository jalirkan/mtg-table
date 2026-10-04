# mtg-table — notebooks: exploring games against plain ones, from the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/exploring_vs_plain.py` runs it top to bottom.  Needs duckdb and pandas.
# ---

# %% [markdown]
# # Exploring vs plain games (D358)
#
# A seeded share of the queue's drafts play games in which each decision may be answered by a
# random legal move (epsilon) or a coin between near-tied creatures. Every such draft is marked
# `explore` in `drafts` and `games`; a game row carries the counts (`explore_randomised`,
# `explore_changed`, `explore_close_calls`, `explore_by_kind`, ...). This compares the two kinds of
# game: length, time, decisions recorded, and how many of them were randomised.
#
# **Forge against Forge.** Both kinds of game are Forge Default against Forge Default: the lengths
# and rates are the AI's, not a person's.

# %%
import json
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

# %% [markdown]
# ## Game length, time and decisions

# %%
summary = con.sql("""
    select explore, count(*) as games,
           avg(turns) as mean_turns, median(turns) as median_turns,
           avg(ms) / 1000 as mean_game_s,
           avg(case when timeout then 1 else 0 end) as timeout_rate,
           avg(case when error is not null then 1 else 0 end) as error_rate,
           avg(decisions) as mean_decisions,
           avg(explore_randomised) as mean_randomised,
           sum(explore_randomised) / nullif(sum(case when explore then decisions end), 0) as randomised_per_decision,
           avg(explore_changed) as mean_changed,
           avg(rec_bytes) / 1024 as mean_recorded_kib
    from games group by explore order by explore""").df()
display(summary.round(3))

# %% [markdown]
# ## By cube

# %%
display(con.sql("""
    select cube, explore, count(*) as games, avg(turns) as mean_turns, avg(ms) / 1000 as mean_game_s,
           avg(decisions) as mean_decisions, avg(explore_randomised) as mean_randomised
    from games group by cube, explore order by cube, explore""").df().round(2))

# %% [markdown]
# ## Turn-count distribution

# %%
turns = con.sql("select explore, turns from games where turns is not null").df()
display(turns.pivot_table(index="turns", columns="explore", aggfunc="size", fill_value=0))

# %% [markdown]
# ## What was randomised, by kind of decision

# %%
kinds = con.sql("select explore_by_kind from games where explore_by_kind is not null").df()
tot: dict = {}
for s in kinds.explore_by_kind:
    if not isinstance(s, str) or not s:
        continue
    for k, v in json.loads(s).items():
        tot[k] = tot.get(k, 0) + v
display(pd.Series(tot, name="randomised decisions", dtype="int64").sort_values(ascending=False))

# %% [markdown]
# ## Does exploring move who wins? (seat A's rate; draws left out)

# %%
display(con.sql("""
    select explore, count(*) as games, avg(case when winner = 'A' then 1.0 else 0 end) as a_win_rate,
           avg(case when on_play = winner then 1.0 else 0 end) as on_play_win_rate
    from games where winner in ('A', 'B') group by explore order by explore""").df().round(3))
