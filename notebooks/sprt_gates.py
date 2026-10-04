# mtg-table — notebooks: SPRT and gate history, from the lab warehouse.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
# ---
# A "percent" script: VS Code and Jupyter (jupytext) open it as a notebook, one cell per `# %%`;
# `python3 notebooks/sprt_gates.py` runs it top to bottom.  Needs duckdb and pandas.
# ---

# %% [markdown]
# # SPRT and gate history
#
# - `sprt`: every line of the AI ladder's `sprt.jsonl` (D319, D321; gate 3 of D354): who played
#   whom, the hypotheses, the log-likelihood ratio and its bounds, the result.
# - `gate_reports`: every evaluator gate report under `var/ml/` (D354: `fit`, `regret`, `sprt`)
#   with its verdict and reasons.
# - `experiments`: `docs/evidence/experiments.jsonl`, every engine run's start and end line.
# - `nights` and `versions`: the queue's nights and the lab versions (D341) that wrote each folder.
#
# Any of them may be empty on a machine that has not run that tool; each cell says so.
#
# **Forge against Forge.** Every SPRT and gate here pits Forge AIs against each other: a pass says
# one AI beats another in Forge, not that it plays better against a person.

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
pd.set_option("display.max_colwidth", 60)


def find_db() -> str:
    if os.environ.get("LAB_WAREHOUSE"):
        return os.environ["LAB_WAREHOUSE"]
    for d in [pathlib.Path.cwd(), *pathlib.Path.cwd().parents]:
        p = d / "var" / "warehouse" / "lab.duckdb"
        if p.exists():
            return str(p)
    raise SystemExit("no var/warehouse/lab.duckdb: run `python3 tools/lab/warehouse.py ingest` first")


con = duckdb.connect(find_db(), read_only=True)


def show(title: str, df: pd.DataFrame) -> None:
    print(f"\n== {title}: {len(df)} row(s)")
    if len(df):
        display(df)


# %% [markdown]
# ## SPRT tests, newest first

# %%
sprt = con.sql("""
    select ts, purpose, a, b, elo0, elo1, result, games, pairs, round(score, 3) as score,
           llr, lower, upper, round(llr / nullif(case when llr >= 0 then upper else -lower end, 0), 2) as llr_share_of_bound
    from sprt order by ts desc""").df()
show("SPRT lines", sprt)
if len(sprt):
    show("results by pair", con.sql("""
        select a, b, count(*) as tests, sum(case when result = 'H1' then 1 else 0 end) as h1,
               sum(case when result = 'H0' then 1 else 0 end) as h0, sum(games) as games
        from sprt group by a, b order by tests desc""").df())

# %% [markdown]
# ## Evaluator gates (D354)

# %%
gates = con.sql("select mtime, gate, pass, coalesce(name, model) as subject, model_sha12, reasons, path from gate_reports order by mtime desc").df()
if len(gates):
    gates["reasons"] = gates.reasons.map(lambda s: "; ".join(json.loads(s)) if isinstance(s, str) and s else "")
show("gate reports", gates)

# %% [markdown]
# ## The experiment log

# %%
exp = con.sql("""
    select s.ts as started, s.id, s.cmd, s.purpose, e.ts as ended, e.status, e.games, s.git_sha
    from experiments s left join experiments e on e.id = s.id and e.kind = 'end'
    where s.kind = 'start' order by s.ts desc""").df()
show("experiments (a start with no end was abandoned)", exp)

# %% [markdown]
# ## Queue nights and lab versions

# %%
show("nights", con.sql("select night, drafts as planned, chunks, play_explore, runs, first_run_at, last_run_at from nights order by night").df())
show("drafts per night and version", con.sql("""
    select source, night, ver, count(*) as drafts, sum(case when explore then 1 else 0 end) as exploring
    from drafts group by all order by source, night, ver""").df())
show("versions", con.sql("select source, key, id, since, first_seed, git_sha, dirty, allowed_change from versions order by since").df())
