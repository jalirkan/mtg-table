# mtg-table — notebooks: draft pick-order heatmaps, from the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/pick_order.py` runs it top to bottom.  Needs duckdb and pandas; matplotlib
# draws the heatmap when it is installed, and the table is printed either way.
# ---

# %% [markdown]
# # Draft pick order
#
# Every pick decision is a row of `picks`: what the drafter saw (`seen`) and what it took
# (`took`), at decision `n`. Grid drafts take a row or column of three cards from a grid, so a
# "pick" here is a decision, not one card. The take rate `taken / seen` says how the lab's
# drafters (D294) value a card: high early means they grab it when they see it. This is the
# drafters' own judgement, before any game is played; the win-rate notebook says how it went.
#
# **Forge against Forge.** The drafters are the lab's drafting AI and every game after is Forge
# Default against Forge Default: a pick order here is the AI's, and a card's later win rate is the
# card in Forge Default's hands.
#
# `CUBE` picks the cube (default: the one with the most picks); `TOP` how many cards to show.

# %%
import os
import pathlib

import duckdb
import pandas as pd

try:
    from IPython.display import display
except ImportError:
    display = print

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 30)


def find_db() -> str:
    if os.environ.get("LAB_WAREHOUSE"):
        return os.environ["LAB_WAREHOUSE"]
    for d in [pathlib.Path.cwd(), *pathlib.Path.cwd().parents]:
        p = d / "var" / "warehouse" / "lab.duckdb"
        if p.exists():
            return str(p)
    raise SystemExit("no var/warehouse/lab.duckdb: run `python3 tools/lab/warehouse.py ingest` first")


con = duckdb.connect(find_db(), read_only=True)
TOP = int(os.environ.get("TOP", 30))

# %%
counts = con.sql("select d.cube, d.format, count(*) as decisions from picks p join drafts d using (draft_id) group by all order by decisions desc").df()
display(counts)
CUBE = os.environ.get("CUBE") or (counts.cube.iloc[0] if len(counts) else None)
print("cube:", CUBE)

# %% [markdown]
# ## Take rate by decision number (seen at decision n -> taken?)

# %%
seen = con.execute("""
    with s as (
        select p.n, unnest(p.seen) as card, p.took
        from picks p join drafts d using (draft_id)
        where d.cube = ? and not d.explore)
    select card, n, count(*) as seen, sum(case when list_contains(took, card) then 1 else 0 end) as taken
    from s group by card, n""", [CUBE]).df()
per_card = seen.groupby("card")[["seen", "taken"]].sum()
per_card["take_rate"] = per_card.taken / per_card.seen
first_n = seen[seen.taken > 0].groupby("card").apply(lambda g: (g.n * g.taken).sum() / g.taken.sum(), include_groups=False)
per_card["mean_pick_n"] = first_n
top = per_card.sort_values(["take_rate", "seen"], ascending=False).head(TOP)
display(top.round(3))

# %%
heat = seen[seen.card.isin(top.index)].assign(rate=lambda d: d.taken / d.seen) \
    .pivot_table(index="card", columns="n", values="rate").reindex(top.index)
display(heat.round(2))

# %%
try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None
if plt is not None and len(heat):
    fig, ax = plt.subplots(figsize=(12, max(3, 0.3 * len(heat))))
    im = ax.imshow(heat.values, aspect="auto", cmap="viridis", vmin=0, vmax=1)
    ax.set_yticks(range(len(heat)), heat.index)
    ax.set_xticks(range(len(heat.columns)), heat.columns)
    ax.set_xlabel("decision n")
    ax.set_title(f"{CUBE}: take rate when seen")
    fig.colorbar(im, ax=ax)
    plt.tight_layout()
    if os.environ.get("MPLBACKEND", "").lower() != "agg":
        plt.show()

# %% [markdown]
# ## The least wanted: seen often, rarely taken

# %%
display(per_card[per_card.seen >= per_card.seen.quantile(0.5)].sort_values("take_rate").head(15).round(3))
