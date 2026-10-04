# mtg-table — notebooks: the saved queries in notebooks/sql/, run against the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/saved_queries.py` runs it top to bottom.  Needs duckdb and pandas.
# Each query is a plain .sql file, so the DuckDB CLI runs it too:
#   duckdb var/warehouse/lab.duckdb -c "set variable min_games = 200" -c ".read notebooks/sql/card_win_rates.sql"
# ---

# %% [markdown]
# # The questions asked most often
#
# Five saved queries (`notebooks/sql/*.sql`), one cell each. Edit the threshold variables below and
# run again; edit the .sql files to keep a change.
#
# **Forge against Forge.** Every lab game is Forge Default playing Forge Default. A card's win rate
# measures the card **in Forge Default's hands** (and in the decks the lab's drafters build), not the
# card's strength for a person; a colour pair's rate is the AI's with those colours; game length
# and the play/draw edge are the AI's. Cards Forge's AI cannot play (`ai_flag = 'All'`, D343) are
# the extreme case. Every interval is Wilson's 95% over games, and games within one draft are
# correlated, so the intervals are optimistic (narrower than the truth).

# %%
import os
import pathlib

import duckdb
import pandas as pd

try:
    from IPython.display import display
except ImportError:  # run as a plain script
    display = print

pd.set_option("display.width", 160)
pd.set_option("display.max_columns", 20)


def find_db() -> str:
    if os.environ.get("LAB_WAREHOUSE"):
        return os.environ["LAB_WAREHOUSE"]
    for d in [pathlib.Path.cwd(), *pathlib.Path.cwd().parents]:
        p = d / "var" / "warehouse" / "lab.duckdb"
        if p.exists():
            return str(p)
    raise SystemExit("no var/warehouse/lab.duckdb: run `python3 tools/lab/warehouse.py ingest` first")


def sql_dir() -> pathlib.Path:
    here = pathlib.Path(__file__).resolve().parent if "__file__" in globals() else pathlib.Path.cwd()
    for d in (here / "sql", pathlib.Path.cwd() / "notebooks" / "sql", pathlib.Path.cwd() / "sql"):
        if d.is_dir():
            return d
    raise SystemExit("no notebooks/sql/ beside this notebook")


con = duckdb.connect(find_db(), read_only=True)
# The lab runs beside: cap DuckDB's memory (it spills to disk past this) and its progress bar.
con.execute(f"set memory_limit = '{os.environ.get('LAB_DUCKDB_MEMORY', '2GB')}'")
con.execute("set enable_progress_bar = false")
SQL = sql_dir()
# The thresholds the queries read with getvariable(); each has a default in its .sql file.
VARS = {"min_games": int(os.environ.get("MIN_GAMES", 100)), "min_taken": int(os.environ.get("MIN_TAKEN", 20))}
for k, v in VARS.items():
    con.execute(f"set variable {k} = {int(v)}")


def saved(name: str) -> pd.DataFrame:
    """Run notebooks/sql/<name>.sql and return its rows."""
    return con.sql((SQL / f"{name}.sql").read_text(encoding="utf-8")).df()


# %% [markdown]
# ## 1. Card win rates by cube, with intervals (`card_win_rates.sql`)
#
# Plain decisive games, cards in at least `min_games` of them. The caveat above applies with full
# force here: this is the card in Forge Default's hands.

# %%
cards = saved("card_win_rates")
print(f"{len(cards)} card-cube rows with at least {VARS['min_games']} plain decisive games")
for cube, df in cards.groupby("cube"):
    print(f"\n== {cube}: best and worst")
    display(pd.concat([df.head(10), df.tail(5)]).drop(columns="cube"))

# %% [markdown]
# ## 2. Colour pairs across nights (`pair_trends.sql`)
#
# Each pair's share of decks and its win rate, night by night (night 0: run folders). A trend
# across nights is a change in the lab (versions, ratings, the drafting AI) as much as in the cube.

# %%
pairs = saved("pair_trends")
display(pairs.head(40))
if len(pairs):
    display(pairs.pivot_table(index=["cube", "pair"], columns="night", values="win_rate").round(2).head(40))

# %% [markdown]
# ## 3. Game length and the on-play rate by cube (`game_length.sql`)
#
# Forge Default against itself: people race and block differently.

# %%
display(saved("game_length"))

# %% [markdown]
# ## 4. Pick order against deck inclusion (`pick_vs_deck.sql`)
#
# When a card is taken, and how often the taking seat's deck plays it. Early picks that rarely make
# the deck are where the drafting AI's ratings and Forge's builder disagree.

# %%
pvd = saved("pick_vs_deck")
for cube, df in pvd.groupby("cube"):
    early = df[df.mean_pick_n <= df.mean_pick_n.quantile(0.25)]
    print(f"\n== {cube}: the earliest quarter of picks, the least played first")
    display(early.sort_values("inclusion").head(15).drop(columns="cube"))

# %% [markdown]
# ## 5. Nightly volume, quarantine and errors (`nightly_volume.sql`)

# %%
display(saved("nightly_volume"))
