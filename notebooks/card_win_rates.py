# mtg-table — notebooks: card win rates by cube, from the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/card_win_rates.py` runs it top to bottom.  Needs duckdb and pandas, and a
# warehouse: `python3 tools/lab/warehouse.py ingest` (docs/guides/lab-warehouse.md).
# ---

# %% [markdown]
# # Card win rates by cube
#
# The win rate of the decks that played a card, per cube, over **plain** games only: exploring
# drafts (D358) answer some decisions at random, so they are left out, as the lab's own readers
# leave them out. Draws, timeouts and engine errors are left out too. Each rate carries Wilson's
# 95% interval: with a few dozen games **the interval is the finding**.
#
# Read with care:
# - **AI-limited cards (D343).** Forge's AI cannot play a card scripted `AI:RemoveDeck:All`; its
#   rate measures Forge, not the card. They are flagged `ai_flag = All` and kept apart below.
# - A deck's rate is not a card's strength: good cards sit in good decks, and colours travel
#   together. The matchup model (`tools/ml/matchup.py`, its `power.tsv`) adjusts for the rest of
#   the deck; when the warehouse has one, the last cell sets the two side by side.
# - A card in both decks of a game counts once for each seat, a win and a loss.

# %%
import math
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


con = duckdb.connect(find_db(), read_only=True)
MIN_GAMES = int(os.environ.get("MIN_GAMES", 30))   # cards with fewer plain decisive games are not listed
BASICS = ("Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes")


def wilson(k: float, n: float, z: float = 1.96) -> tuple:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


# %% [markdown]
# ## What the warehouse holds

# %%
display(con.sql("""
    select cube, count(*) as drafts, sum(n_games) as games,
           sum(case when explore then 1 else 0 end) as exploring_drafts
    from drafts group by cube order by drafts desc""").df())

# %% [markdown]
# ## Card win rates, plain decisive games

# %%
rates = con.sql(f"""
    select sg.cube, dc.card, any_value(c.ai_flag) as ai_flag,
           count(*) as games, sum(case when sg.won then 1 else 0 end) as wins
    from deck_cards dc
    join seat_games sg on sg.draft_id = dc.draft_id and sg.seat = dc.seat
    left join cards c on c.card_id = dc.card_id
    where not sg.explore and sg.decisive and not sg.errored
      and dc.card not in {BASICS}
    group by sg.cube, dc.card""").df()
rates["win_rate"] = rates.wins / rates.games
ci = [wilson(k, n) for k, n in zip(rates.wins, rates.games)]
rates["lo"] = [a for a, _ in ci]
rates["hi"] = [b for _, b in ci]
listed = rates[rates.games >= MIN_GAMES].sort_values(["cube", "win_rate"], ascending=[True, False])
print(f"{len(listed)} card-cube rows with at least {MIN_GAMES} plain decisive games")

# %%
for cube, df in listed.groupby("cube"):
    rated = df[df.ai_flag.fillna("") != "All"]
    print(f"\n== {cube}: {len(rated)} cards rated; best and worst by win rate (Wilson 95%)")
    display(pd.concat([rated.head(10), rated.tail(5)])[["card", "games", "wins", "win_rate", "lo", "hi"]].round(3))
    limited = df[df.ai_flag.fillna("") == "All"]
    if len(limited):
        print(f"AI-limited (D343) -- Forge cannot play these; the rate is not the card's: {', '.join(limited.card)}")

# %% [markdown]
# ## Cards whose whole interval is above (or below) 50%

# %%
sure = listed[((listed.lo > 0.5) | (listed.hi < 0.5)) & (listed.ai_flag.fillna("") != "All")]
display(sure.sort_values("win_rate", ascending=False)[["cube", "card", "games", "win_rate", "lo", "hi"]].round(3))

# %% [markdown]
# ## Beside the matchup model's power (when `var/ml/**/power.tsv` was ingested)

# %%
power = con.sql("select path, name, power, sd_post, games as model_games, ai from matchup_power").df()
if len(power):
    latest = power[power.path == sorted(power.path.unique())[-1]]
    both = listed.merge(latest, left_on="card", right_on="name", how="inner")
    print(f"matchup model {latest.path.iloc[0]}: {len(both)} cards in both")
    display(both[["cube", "card", "games", "win_rate", "power", "sd_post", "ai"]].sort_values("power", ascending=False).head(25).round(3))
    if len(both) > 2:
        print("rank correlation (Spearman) of deck win rate and model power:",
              round(both[["win_rate", "power"]].corr(method="spearman").iloc[0, 1], 3))
else:
    print("no matchup_power rows: run tools/ml/matchup.py train, then ingest again")
