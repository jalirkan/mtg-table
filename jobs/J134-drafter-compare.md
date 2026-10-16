id: J134
title: Which drafter drafts best? Three challengers each against the cube lab's own drafter, mirrored seats on the same seeds, the lab builder for both, Forge Default piloting both decks, best of 3: Forge's ranks (FL, D439) on Vintage 180, Synergy and Evan's Twobert, 600 drafts a cube; the human-pick model (HL, D416) on Vintage and Synergy, 300 drafts a cube (J114's replication); Claude Sonnet (LL, D439) on Vintage, 100 drafts, ONLY with Justin's spend approval (LAB_LLM_SPEND_OK=1), otherwise skipped
public_title: Which drafter drafts best: Forge ranks, human picks, Sonnet vs the lab drafter
public_est: ~2 h (the Sonnet arm, only when approved, ~1 h more)
public_decides: Which drafter Draft vs Bot should offer
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@0c9bab7c (re-pinned 2026-10-16 to origin/main after #144–#147 merged; was the PR branch head) (the head of branch pc/llm-drafter, mtg-table PR #144, D439: the cube lab's `--drafter forge-ranks` and `--drafter llm:<model>`, the LLM's per-draft cost record and replay, `llm:fake`. The cloud reviews and merges that PR before this job runs and RE-PINS this line to the merge commit; the pilot's first check refuses a pin that is not on origin/main. Pinned so every draft is one code version, D341), ForgeCoach@2f05b15 (main: public/cubes/twobert-cube-180.md, Evan's Twobert, read from the ForgeCoach checkout and checked by sha256 54d9c89e…; the human-pick files are mtg-table's own fixtures/human-picks/ copies of ForgeCoach@866c256's, J114's exact files)
decides: which of the lab's drafters (the lab drafter, Forge's ranks, the human-pick model and, if Justin approves the spend, Sonnet) a follow-up offers in ForgeCoach's Draft vs Bot, and whether the lab drafter stays the default; this job changes nothing itself
hypothesis: the lab drafter adds theme synergy, a colour lean and a late commit to the same Forge ranks (Vintage's ratings are Forge's ranks but for one card; Twobert has no ratings file and no themes), so against Forge's ranks it should win slightly on Vintage and Synergy, where the synergy term has themes to count, and be close on Twobert, where only the lean and the commit differ; the human-pick model lost to it on Vintage in J114 (47.8% [45.7, 49.9]) and was not shown on Synergy (50.7% [47.6, 53.8]), and 300 drafts a cube can only show a difference of about 6 points or more; an LLM that reads the cards may draft coherent two-colour pools, but Forge's AI pilots both decks, so card quality Forge plays badly does not pay, and 100 drafts can only show a difference of about 10 points
rule: written 2026-10-15 before any J134 game was played (j134.py's header). Each arm pits a challenger against the lab drafter on the same seeds twice, <arm>A (challenger at seat A) and <arm>B (challenger at B), both seats Forge Default, best of 3, the lab builder and the cube's ratings (Twobert: Forge's ranks, no ratings file). Outcome per arm and cube: the challenger's match win rate pooled over both folders (won 1, lost 0, drawn 0.5; engine-error matches left out and counted); 95% interval by cluster bootstrap over seeds (a seed's matches in both folders together), 10,000 resamples, numpy default_rng(20261015), percentile. A drafter BEATS another when its 95% interval on match win rate lies entirely above 0.5: the challenger BEATS the lab drafter when the interval is above 0.5 (code 1); the lab drafter BEATS the challenger when it is below 0.5 (code -1); otherwise NOT SHOWN (code 0), never "no difference". An arm without every planned seed in both seats gives no verdict (INCOMPLETE, code 8); the LLM arm not run is SKIPPED (code 9). Reported per cube: Vintage 180, Synergy, Evan's Twobert (the lab drops Twobert's 4 cards Forge 2.0.14 lacks). Nothing is tuned on these seeds
followup: morning-read
est: ~1.5-2 h without the LLM arm. Pilot ~15-20 min (the build, the tests, 2 seeds of each folder best of 3 and a plain --games 0 draft per cube, the read). FL: 1,800 best-of-3 matches; at ~2.5 games a match and J112's game times (Vintage 1.74 s, Synergy 6.11 s; Twobert taken as Evan's 360 in J110, ~1.8 s, so 2.5 s to be safe) that is 600 x 2.5 x (1.74 + 6.11 + 2.5) = 15,500 worker-s, ~37 min on 7 workers. HL: 600 matches, 300 x 2.5 x (1.74 + 6.11) = 5,900 worker-s, ~14 min. Plus a JVM start per folder (~10-20 s) and drafting (well under 1 s a draft for these drafters). LL, only when approved: 100 drafts at the smoke's 114.6 s a draft (6.4 s a call on Haiku; Sonnet may be 1.5-2x slower), 4 at once: ~50-100 min, then 100 matches in ~2 min. Read ~1 min
resumable: yes
timeout: 6h
progress: cubelab var/lab-j134/FA-vintage var/lab-j134/FB-vintage var/lab-j134/FA-synergy var/lab-j134/FB-synergy var/lab-j134/FA-twobert var/lab-j134/FB-twobert var/lab-j134/HA-vintage var/lab-j134/HB-vintage var/lab-j134/HA-synergy var/lab-j134/HB-synergy of 2400
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: stopfile = files var/lab-j134/ABORT
metrics: all = cubelab var/lab-j134/FA-vintage var/lab-j134/FB-vintage var/lab-j134/FA-synergy var/lab-j134/FB-synergy var/lab-j134/FA-twobert var/lab-j134/FB-twobert var/lab-j134/HA-vintage var/lab-j134/HB-vintage var/lab-j134/HA-synergy var/lab-j134/HB-synergy
metrics: fav = cubelab var/lab-j134/FA-vintage
metrics: fbv = cubelab var/lab-j134/FB-vintage
metrics: fas = cubelab var/lab-j134/FA-synergy
metrics: fbs = cubelab var/lab-j134/FB-synergy
metrics: fat = cubelab var/lab-j134/FA-twobert
metrics: fbt = cubelab var/lab-j134/FB-twobert
metrics: hav = cubelab var/lab-j134/HA-vintage
metrics: hbv = cubelab var/lab-j134/HB-vintage
metrics: has = cubelab var/lab-j134/HA-synergy
metrics: hbs = cubelab var/lab-j134/HB-synergy
metrics: jr = sh: cat var/lab-j134/out/drafters.json 2>/dev/null || echo '{"written":0}'
headline: jr.fl_vintage_rate, jr.fl_vintage_code, jr.fl_synergy_rate, jr.fl_synergy_code, jr.fl_twobert_rate, jr.fl_twobert_code, jr.hl_vintage_rate, jr.hl_vintage_code, jr.hl_synergy_rate, jr.hl_synergy_code, jr.ll_ran, jr.ll_cost_usd

**Why.** Justin asked: "which AI does the best at drafting? Can we make it so the user can select Forge AI, Search
AI or the Sonnet model?" The lab now has four drafters (mtg-table PR #144, D439; `docs/guides/cube-lab.md`,
*The drafters, and how to name each*):
- **the lab drafter** (D294): rating + theme synergy + a colour lean, committing after a third of its picks;
- **Forge's ranks** (`--drafter forge-ranks`, D439): each card at Forge's raw draft score, no synergy, no lean,
  committing after its first line. This is D294's description of Forge's pick function in the lab's terms;
  Forge has no grid draft of its own;
- **the human-pick model** (`--drafter human-picks:<file>`, D416). It lost to the lab drafter on Vintage in J114;
- **an LLM** (`--drafter llm:sonnet`, D439): Claude, asked once per grid decision through the Claude Code CLI.
  It **spends API money**, and its arm runs only with Justin's approval.

"Search AI" is not a drafter. search-v2 plays games; it can pilot any of these decks, but it does not pick
cards, so it has no arm here. All three challengers face the same opponent, the lab drafter, so the question
"which drafts best" is answered pairwise against it, per cube.

**Design.**
- **Mirrored folders.** Each arm drafts the same seeds twice: `<arm>A`, the challenger at seat A and the lab
  drafter at B, and `<arm>B`, the mirror. A seed deals the same cards in both folders, and the same seat opens
  the first grid (D294), so each drafter sits in each seat once per seed.
- **Only picking differs.** Both seats build with the lab builder and the cube's ratings, and both decks are
  piloted by plain Forge Default (`--profiles Default,Default`). Grid, best of 3, no exploration, no recording
  (the pilot records). Folders `var/lab-j134/<F|H|L><A|B>-<cube>`, on their own Forge homes
  (`CUBELAB_HOME_ROOT=var/cubelab/homes-J134`).
- **FL, Forge's ranks vs the lab drafter: 600 drafts a cube (300 seeds, both seats), free.**
  - Vintage 180: its ratings file is Forge's ranks for 179 of 180 cards, so the arm measures the synergy term,
    the lean and the late commit.
  - Synergy: its ratings are edited, and it has themes.
  - Evan's Twobert: no ratings file, so both seats rate by Forge's ranks, and there are no themes. Only the
    lean and the commit differ. **Forge 2.0.14 lacks 4 of its 180 cards** (Flickering Hound, Null Summoner,
    Twinned Vision, Primal Witchstalker, all Reality Fracture). The lab drafts without them (run.json
    `missing`, which the pilot checks is 4), so each grid draft deals 162 of the other 176.
- **HL, the human-pick model vs the lab drafter: 300 drafts a cube (150 seeds), free.** Vintage and Synergy only:
  there is no picks file for Twobert. J114's exact design and files (mtg-table's `fixtures/human-picks/`, the
  copies of ForgeCoach@866c256's, checked by sha256), on fresh seeds: a replication, about a seventh of J114's
  size.
- **LL, `llm:sonnet` (thinking low) vs the lab drafter: 100 drafts (50 seeds, both seats), Vintage only.**
  - **requires: justin-approves-spend.** The block runs it only when `LAB_LLM_SPEND_OK=1` is in its
    environment. The runner sets no such variable today, so **by default the arm is skipped**. The read
    marks it SKIPPED and every other arm reads as usual. To run it, Justin adds the variable for this job, or
    runs the LL block by hand with it set.
  - **A budget stop.** The arm drafts 5 seeds at a time in each seat. After each step it sums the CLI's cost
    figure in both folders, and stops when the sum passes `LAB_LLM_BUDGET_USD` (default 40). A stopped arm is
    INCOMPLETE and gives no verdict.
  - **Replay.** Each finished draft's decisions are in `<folder>/llm/<seed>.json`, so a restarted job never
    pays for a draft twice.
- **Seeds:** D340's VERIFY range. No job has used 815M (J114 811.4M, J121 812M, J124 813M, J127 814M).
  - FL: Vintage 815,000,001-815,000,300, Synergy 815,100,001-300, Twobert 815,200,001-300.
  - HL: Vintage 815,300,001-150, Synergy 815,400,001-150.
  - LL: Vintage 815,500,001-050.
  - Pilot: 815,990,001-002 in every folder; separate folders, so nothing carries over.

**Cost of the LL arm (written before any Sonnet call).**
- **The one smoke**, on mtg-table PR #144: Vintage seed 899,000,001, seat A `llm:haiku` (thinking low), seat B
  the lab drafter, `--games 0`.
  - 18 decisions, 18 calls, 0 retries, 0 fallbacks.
  - **57,971 input tokens a draft** (36 plain, 57,935 written to the cache, 0 read: every call is fresh, and the
    CLI writes its prompt to the one-hour cache) and **6,610 output tokens**.
  - 114.6 s, 6.4 s a call. The CLI's cost figure: $0.0149.
- **Sonnet 5.5 at those token counts**, at its list price (the claude-api skill, prices cached 2026-10-06: $2 per
  million input, $10 per million output, a one-hour cache write at 2x input):
  57,935 x $4 + 6,610 x $10 per million = **about $0.30 a draft**.
  - Each doubling of the output adds $0.07.
  - **100 drafts ≈ $30**; budget $25-45. The budget stop is $40.
  - On the PC's Claude subscription login the CLI draws on the plan, as in J119; the CLI's cost figure is
    still recorded.
- Running it at scale is Justin's call. The PR built the option; it did not approve the spend.

**Power (normal approximation, matches independent within a seed's pair).**
- With n matches, the interval's half-width is about 1.96 x 0.5 / sqrt(n):
  - 600 matches (FL, a cube): ±4.0 points;
  - 300 (HL, a cube): ±5.7;
  - 100 (LL): ±9.8.
- A per-game edge of p becomes a match edge of p²(3 − 2p), so a 52% game rate is a 53% match rate. FL can
  show a 4-point match edge about half the time, and a 6-point edge about 85% of the time.
- HL is J114's design at a seventh of its size: it can confirm J114's Vintage result only if the edge is
  larger than J114 measured (−2.2 points).
- LL shows a difference only of 10 points or more. A NOT SHOWN there is the expected outcome unless Sonnet
  drafts far better or far worse.

**Secondary (no verdict).**
- the game win rate and its interval;
- each folder's (seat's) match win rate;
- each drafter's colour shares and mean lab deck score (the lab drafter's own currency, so not strength);
- Forge-built decks;
- for LL: calls, retries, fallbacks, tokens, the CLI's cost and the resolved model.

**Not beside anything.** The job holds 7 of 8 cores, so the runner should start no other heavy job beside it.
It aborts if a `queue run` starts. Justin at the table holds new games, as usual.

**Checked on this PC before posting (2026-10-15, the pin 9017cce9, nothing pushed).**
- `tools/runner.sh check`: lint clean.
- **`tools/runner.sh dry-run --max-seconds 90 --workers 2`** (the namespace sandbox, `--forgecoach ~/code/lab/ForgeCoach`):
  - the pilot was cut at 90 s, mid-build, as expected;
  - the FL and HL blocks started and drafted;
  - the LL block printed SKIPPED and exited 0, because `LAB_LLM_SPEND_OK` is unset;
  - the read block failed only because the cut pilot had not yet written `j134.py`.
- **The same dry run with `--pilot-only` and no time cut:**
  - the pilot finished in 1,017 s, 24 drafts, 0 engine errors;
  - every pilot check passed but two. `merged == 1` fails because the PR is not merged yet. `mean_game_s` was
    16.0 s, above the bound of 15 written first: recorded games on 2 workers, Synergy included. The bound is
    now 30.
  - Twobert dropped its 4 cards;
  - the LLM folders made 72 calls on `llm:fake`, 0 tokens;
  - 22 of 24 challenger seat-pools differed from the plain draft.

## Pilot
About 15-20 minutes:
- the pin is merged;
- the build and the drafters' tests (`cubelab-llmdraft`, `cubelab-humanpicks`; no API);
- `j134.py` written, with its self-test on synthetic folders;
- 2 seeds of every folder, best of 3, recorded, in `var/lab-j134-pilot/` (never the real folders). The LL folders
  use `llm:fake`, which spends nothing: the pilot never calls the API;
- a plain `--games 0` draft of the same seeds for each cube;
- the read over the pilot folders.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j134-merged.txt || echo 0 > var/j134-merged.txt
cat var/j134-merged.txt
./bridge/build.sh
node --test web/test/cubelab-llmdraft.test.ts web/test/cubelab-humanpicks.test.ts
python3 -c "import numpy; print('numpy', numpy.__version__)"
export CUBELAB_HOME_ROOT=var/cubelab/homes-J134
P=var/lab-j134-pilot
rm -rf "$P"
mkdir -p "$P" var/lab-j134-tools var/lab-j134/cubes
cp {ForgeCoach}/public/cubes/twobert-cube-180.md var/lab-j134/cubes/twobert-cube-180.md
sha256sum var/lab-j134/cubes/twobert-cube-180.md
cat > var/lab-j134-tools/j134.py <<'J134EOF'
#!/usr/bin/env python3
# mtg-table -- J134 (pc-jobs): which drafter drafts best?  Each drafter against the lab drafter, mirrored seats.
# SPDX-License-Identifier: GPL-3.0-or-later
"""J134's pre-registered read (written 2026-10-15, before any J134 game was played).

DESIGN.  Each ARM pits one CHALLENGER drafter against the cube lab's own drafter (D294), on the same draft seeds
twice: folder <arm>A (the challenger drafts seat A, the lab drafter seat B) and its mirror <arm>B (the challenger at
B).  A seed deals the same cards in both folders and the same seat opens the first grid (D294), so over a seed's two
matches each drafter sits in each seat once.  Both seats build with the lab builder and the cube's ratings, and both
decks are piloted by plain Forge Default (`--profiles Default,Default`), best of three, so only the PICKING differs.
  FL  forge-ranks (D439) vs the lab drafter   Vintage, Synergy, Evan's Twobert
  HL  human-picks (D416) vs the lab drafter   Vintage, Synergy (J114's replication on fresh seeds)
  LL  llm:sonnet (D439) vs the lab drafter    Vintage; run only with Justin's spend approval, otherwise SKIPPED

PRIMARY, per arm and cube.  The challenger's MATCH win rate: a match it won counts 1, lost 0, drawn (1-1 or 0-0
after a timeout) 0.5; a match with an engine error is left out (counted).  Pooled over both folders.  95% interval:
a cluster bootstrap over SEEDS (a seed's matches in both folders resampled together), 10,000 resamples, numpy
default_rng(20261015), the 2.5th and 97.5th percentiles of (sum of outcomes / matches) in each resample.

RULE.  A drafter BEATS another when its 95% interval on match win rate lies entirely above 0.5.  So, per arm and
cube: interval above 0.5 -> the challenger BEATS the lab drafter (code 1); interval below 0.5 -> the lab drafter
BEATS the challenger (code -1, the lab drafter's interval being 1 - the challenger's); otherwise NOT SHOWN (code 0),
never "no difference".  An arm whose folders do not hold every planned seed in both seats gives no verdict
(INCOMPLETE, code 8); an arm that did not run is SKIPPED (code 9).  "Which drafter drafts best" is read off these
codes per cube; nothing here ranks drafters that were never played against each other.

SECONDARY (description only, no verdict): the game win rate; each folder's (seat's) match win rate; the share of each
drafter's decks in each colour and the mean lab deck score; Forge-built decks; for the LLM arm its calls, retries,
fallbacks, tokens and the CLI's cost figure; for the pilot, how many challenger pools differ from a plain draft.

usage: python3 j134.py --arm NAME:CUBE:DIR_A:DIR_B:PLANNED_SEEDS ... [--optional NAME] [--llm-model sonnet]
                       [--check FILE:SHA256 ...] [--plain CUBE:DIR ...] --out DIR
       python3 j134.py --selftest
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys

import numpy as np

BOOTS = 10000
SEED = 20261015
COLOURS = "WUBRG"
KIND = {"fl": "forge-ranks", "hl": "human-picks", "ll": "llm"}
CHALLENGER = {"fl": "Forge's ranks", "hl": "the human-pick model", "ll": "the LLM"}
CODE_TEXT = {1: "the challenger BEATS the lab drafter", -1: "the lab drafter BEATS the challenger", 0: "NOT SHOWN", 8: "INCOMPLETE (no verdict)", 9: "SKIPPED"}


def r4(x):
    return None if x is None or (isinstance(x, float) and not math.isfinite(x)) else round(float(x), 4)


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


def verdict(lo, hi, complete: bool) -> int:
    if not complete:
        return 8
    if lo is not None and lo > 0.5:
        return 1
    if hi is not None and hi < 0.5:
        return -1
    return 0


# ---------------------------------------------------------------- reading a run folder

def read_run(folder: str, kind: str, seat: str, model: str | None) -> dict:
    run, dr, drafts, bad = {}, {}, {}, 0
    rj = os.path.join(folder, "run.json")
    if os.path.isfile(rj):
        with open(rj, encoding="utf-8") as f:
            run = json.load(f)
        dr = run.get("drafter") or {}
    path = os.path.join(folder, "drafts.jsonl")
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            for raw in f:
                if not raw.endswith("\n"):
                    continue  # a line being written
                if not raw.strip():
                    continue
                try:
                    rec = json.loads(raw)
                except ValueError:
                    bad += 1
                    continue
                drafts[int(rec.get("seed"))] = rec
    ok = dr.get("kind") == kind and dr.get("seat") == seat and (kind != "llm" or model is None or dr.get("model") == model)
    return {"folder": folder, "exists": os.path.isfile(rj), "run": run, "drafter": dr, "drafter_ok": ok, "seat": seat, "drafts": drafts, "bad": bad}


def played(d: dict) -> tuple:
    """(main colours, lab deck score, built by Forge?) of the deck that played."""
    deck = d.get("deck") or {}
    if d.get("played") == "forge":
        return str((d.get("forge") or {}).get("colors") or ""), None, True
    return str(deck.get("colors") or ""), deck.get("score"), False


def rows_of(r: dict) -> tuple:
    """One row per match of a folder: the challenger's outcome and both decks' facts."""
    c = r["seat"]
    o = "B" if c == "A" else "A"
    out, errors = [], 0
    for seed, rec in sorted(r["drafts"].items()):
        m = rec.get("match") or {}
        drs = {d.get("seat"): d for d in rec.get("drafters") or []}
        if m.get("engineError") or len(drs) != 2:
            errors += 1
            continue
        w = m.get("winner")
        y = 1.0 if w == c else 0.0 if w == o else 0.5
        games = m.get("games") or []
        cc, cs, cf = played(drs[c])
        lc, ls, lf = played(drs[o])
        out.append({"seed": seed, "seat": c, "y": y, "gw": sum(1 for g in games if g.get("winner") == c),
                    "gl": sum(1 for g in games if g.get("winner") == o),
                    "ch": {"colors": cc, "score": cs, "forge": cf}, "lab": {"colors": lc, "score": ls, "forge": lf},
                    "llm": rec.get("llm")})
    return out, errors


def shares(decks: list) -> dict:
    n = len(decks)
    return {k: (r4(sum(1 for d in decks if k in d["colors"]) / n) if n else None) for k in COLOURS}


def mean(xs: list):
    xs = [x for x in xs if x is not None]
    return r4(sum(xs) / len(xs)) if xs else None


# ---------------------------------------------------------------- one arm on one cube

def arm_read(name: str, cube: str, ra: dict, rb: dict, planned: int, rng: np.random.Generator, plain: dict | None) -> dict:
    rows_a, err_a = rows_of(ra)
    rows_b, err_b = rows_of(rb)
    rows = rows_a + rows_b
    sa, sb = set(ra["drafts"]), set(rb["drafts"])
    complete = len(sa) >= planned and len(sb) >= planned and sa == sb
    out = {"arm": name, "cube": cube, "challenger": KIND[name], "planned_seeds": planned, "matches": len(rows),
           "engine_errors": err_a + err_b, "complete": int(complete),
           "pairing": {"seeds_a": len(sa), "seeds_b": len(sb), "seeds_both": len(sa & sb), "unpaired": len(sa ^ sb)},
           "drafter_ok": int(ra["drafter_ok"] and rb["drafter_ok"]), "missing_cards": len((ra["run"] or {}).get("missing") or [])}
    if plain is not None:
        diff = comp = 0
        for r in (ra, rb):
            c = r["seat"]
            for seed, rec in r["drafts"].items():
                pr = plain["drafts"].get(seed)
                if not pr:
                    continue
                mine = next((d for d in rec.get("drafters") or [] if d.get("seat") == c), {})
                theirs = next((d for d in pr.get("drafters") or [] if d.get("seat") == c), {})
                comp += 1
                diff += sorted(mine.get("pool") or []) != sorted(theirs.get("pool") or [])
        out["plain"] = {"compared": comp, "pool_differs": diff}
    if not rows:
        out.update({"rate": None, "lo": None, "hi": None, "code": verdict(None, None, complete)})
        return out
    seeds = [x["seed"] for x in rows]
    ys = [x["y"] for x in rows]
    lo, hi = cluster_boot(seeds, ys, [1.0] * len(rows), rng)
    rate = sum(ys) / len(ys)
    gw, gl = sum(x["gw"] for x in rows), sum(x["gl"] for x in rows)
    glo, ghi = cluster_boot(seeds, [x["gw"] for x in rows], [x["gw"] + x["gl"] for x in rows], rng)
    by_seat = {s: (r4(sum(x["y"] for x in rows if x["seat"] == s) / max(1, sum(1 for x in rows if x["seat"] == s)))) for s in "AB"}
    out.update({
        "rate": r4(rate), "lo": lo, "hi": hi, "code": verdict(lo, hi, complete),
        "wld": [sum(1 for y in ys if y == 1.0), sum(1 for y in ys if y == 0.0), sum(1 for y in ys if y == 0.5)],
        "game_rate": r4(gw / (gw + gl)) if gw + gl else None, "game_ci": [glo, ghi],
        "rate_as_seat": by_seat,
        "colours": {"challenger": shares([x["ch"] for x in rows]), "lab": shares([x["lab"] for x in rows])},
        "deck_score": {"challenger": mean([x["ch"]["score"] for x in rows]), "lab": mean([x["lab"]["score"] for x in rows])},
        "forge_built": {"challenger": sum(1 for x in rows if x["ch"]["forge"]), "lab": sum(1 for x in rows if x["lab"]["forge"])},
    })
    if name == "ll":
        stats = [rec.get("llm") or {} for r in (ra, rb) for rec in r["drafts"].values()]
        tot = {k: sum((s.get(k) or 0) for s in stats) for k in ("decisions", "calls", "retries", "fallbacks", "callErrors", "tokensIn", "cacheRead", "cacheCreate", "tokensOut", "wallMs")}
        costs = [s.get("costUsd") for s in stats if s.get("costUsd") is not None]
        tot["drafts"] = len(stats)
        tot["costUsd"] = r4(sum(costs)) if costs else None
        tot["replayed"] = sum(1 for s in stats if s.get("replayed"))
        tot["models"] = sorted({str(s.get("resolved")) for s in stats if s.get("resolved")})
        out["llm"] = tot
    return out


# ---------------------------------------------------------------- the report

def pct(x):
    return "-" if x is None else f"{100 * x:.1f}%"


def report_md(res: dict) -> str:
    L = ["# J134: which drafter drafts best?", "",
         "Each challenger drafter against the cube lab's own drafter, mirrored seats on the same seeds, the lab builder for both, "
         "Forge Default piloting both decks, best of three. A drafter BEATS another when its 95% interval on match win rate lies "
         "entirely above 50% (cluster bootstrap over seeds); otherwise NOT SHOWN.", "",
         "## Primary", "",
         "| arm | cube | challenger's match win rate [95%] | W-L-D | matches (seeds) | verdict | as seat A / B | game win rate [95%] | engine errors left out |",
         "|---|---|---|---|---|---|---|---|---|"]
    for a in res["arms"]:
        if a["code"] == 9:
            L.append(f"| {a['arm'].upper()} ({CHALLENGER[a['arm']]}) | {a['cube']} | - | - | - | **SKIPPED** ({a.get('why', '')}) | - | - | - |")
            continue
        wld = "-".join(str(v) for v in a.get("wld") or [])
        seat = a.get("rate_as_seat") or {}
        L.append(f"| {a['arm'].upper()} ({CHALLENGER[a['arm']]}) | {a['cube']} | **{pct(a['rate'])} [{pct(a['lo'])}, {pct(a['hi'])}]** | {wld} | "
                 f"{a['matches']} ({a['pairing']['seeds_both']}) | **{CODE_TEXT[a['code']]}** | {pct(seat.get('A'))} / {pct(seat.get('B'))} | "
                 f"{pct(a.get('game_rate'))} [{pct((a.get('game_ci') or [None, None])[0])}, {pct((a.get('game_ci') or [None, None])[1])}] | {a['engine_errors']} |")
    L += ["", "## Secondary (description only)", "",
          "| arm | cube | drafter | W | U | B | R | G | mean lab deck score | Forge-built decks |", "|---|---|---|---|---|---|---|---|---|---|"]
    for a in res["arms"]:
        if a["code"] == 9 or not a.get("colours"):
            continue
        for who in ("challenger", "lab"):
            sh = a["colours"][who]
            L.append(f"| {a['arm'].upper()} | {a['cube']} | {CHALLENGER[a['arm']] if who == 'challenger' else 'the lab drafter'} | "
                     + " | ".join(pct(sh[k]) for k in COLOURS) + f" | {a['deck_score'][who]} | {a['forge_built'][who]} |")
    for a in res["arms"]:
        if a.get("llm"):
            t = a["llm"]
            L += ["", f"**The LLM arm's spend ({a['cube']}):** {t['drafts']} drafts, {t['decisions']} decisions, {t['calls']} calls, "
                  f"{t['retries']} retries, {t['fallbacks']} fallbacks ({t['callErrors']} failed calls); input {t['tokensIn']} plain + "
                  f"{t['cacheRead']} cache read + {t['cacheCreate']} cache write, output {t['tokensOut']} tokens; the CLI's cost figure "
                  f"{'$%.2f' % t['costUsd'] if t['costUsd'] is not None else '-'}; models {', '.join(t['models']) or '-'}; "
                  f"{t['replayed']} drafts replayed from llm/<seed>.json."]
    tw = [a for a in res["arms"] if a["cube"] == "twobert" and a["code"] != 9]
    if tw:
        L += ["", f"Evan's Twobert: Forge 2.0.14 lacks {tw[0]['missing_cards']} of its 180 cards (Reality Fracture); the lab drafts "
              "without them (run.json `missing`), so its grids deal 162 of the other 176."]
    L += ["", "The lab deck score is the lab drafter's own currency (the cube's ratings), not a measure of strength; the games are.", ""]
    return "\n".join(L)


# ---------------------------------------------------------------- main

def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description="J134's read")
    ap.add_argument("--arm", action="append", default=[], help="NAME:CUBE:DIR_A:DIR_B:PLANNED_SEEDS")
    ap.add_argument("--optional", action="append", default=[], help="an arm NAME that may be absent (SKIPPED)")
    ap.add_argument("--llm-model", default="sonnet")
    ap.add_argument("--check", action="append", default=[], help="FILE:SHA256 an input must match")
    ap.add_argument("--plain", action="append", default=[], help="CUBE:DIR, a plain --games 0 run on the same seeds (pilot)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    rng = np.random.default_rng(SEED)
    res = {"written": 1, "bad_lines": 0, "drafter_ok": 1, "files_ok": 1, "seeds_unpaired": 0, "arms": [], "checked": []}
    for spec in a.check:
        f, want = spec.rsplit(":", 1)
        got = hashlib.sha256(open(f, "rb").read()).hexdigest() if os.path.isfile(f) else "missing"
        res["checked"].append({"file": f, "sha256": got, "ok": int(got == want)})
        if got != want:
            res["files_ok"] = 0
    plains = {}
    for spec in a.plain:
        cube, d = spec.split(":", 1)
        plains[cube] = read_run(d, "", "A", None)
    flat = {}
    for spec in a.arm:
        name, cube, da, db, planned = spec.split(":")
        if name not in KIND:
            raise SystemExit(f"unknown arm {name}")
        model = a.llm_model if name == "ll" else None
        ra, rb = read_run(da, KIND[name], "A", model), read_run(db, KIND[name], "B", model)
        if name in a.optional and not ra["exists"] and not rb["exists"]:
            arm = {"arm": name, "cube": cube, "challenger": KIND[name], "code": 9, "why": "not run: it spends API money and needs Justin's approval",
                   "matches": 0, "rate": None, "lo": None, "hi": None, "complete": 0}
        else:
            arm = arm_read(name, cube, ra, rb, int(planned), rng, plains.get(cube))
            res["bad_lines"] += ra["bad"] + rb["bad"]
            res["seeds_unpaired"] += arm["pairing"]["unpaired"]
            if not arm["drafter_ok"]:
                res["drafter_ok"] = 0
        res["arms"].append(arm)
        k = f"{name}_{cube}"
        flat.update({f"{k}_matches": arm["matches"], f"{k}_rate": arm["rate"], f"{k}_lo": arm["lo"], f"{k}_hi": arm["hi"],
                     f"{k}_code": arm["code"], f"{k}_complete": arm["complete"]})
        if arm.get("plain"):
            flat["plain_compared"] = flat.get("plain_compared", 0) + arm["plain"]["compared"]
            flat["plain_differs"] = flat.get("plain_differs", 0) + arm["plain"]["pool_differs"]
        if cube == "twobert" and arm["code"] != 9:
            flat["twobert_missing"] = arm.get("missing_cards", 0)
        if arm.get("llm"):
            t = arm["llm"]
            flat.update({"ll_ran": 1, "ll_drafts": t["drafts"], "ll_calls": t["calls"], "ll_fallbacks": t["fallbacks"],
                         "ll_tokens_in": t["tokensIn"] + t["cacheRead"] + t["cacheCreate"], "ll_tokens_out": t["tokensOut"],
                         "ll_cost_usd": t["costUsd"]})
    flat.setdefault("ll_ran", 0)
    res.update(flat)
    res["verdicts"] = [a2["code"] for a2 in res["arms"]]
    res["verdicts_valid"] = int(all(c in (-1, 0, 1, 8, 9) for c in res["verdicts"]))
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "drafters.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, indent=1, allow_nan=False)
        f.write("\n")
    with open(os.path.join(a.out, "report.md"), "w", encoding="utf-8") as f:
        f.write(report_md(res))
    print(json.dumps({k: v for k, v in res.items() if k not in ("arms", "checked")}))
    return 0


# ---------------------------------------------------------------- self-test on synthetic folders

def selftest() -> int:
    import tempfile
    rng = np.random.default_rng(7)
    root = tempfile.mkdtemp(prefix="j134-")

    def folder(path, kind, seat, seeds, p_win, model=None):
        os.makedirs(path)
        dr = {"kind": kind, "seat": seat, **({"model": model} if model else {})}
        json.dump({"drafter": dr, "missing": []}, open(os.path.join(path, "run.json"), "w"))
        with open(os.path.join(path, "drafts.jsonl"), "w") as f:
            for s in seeds:
                won = rng.random() < p_win
                w = seat if won else ("B" if seat == "A" else "A")
                rec = {"seed": s, "drafters": [{"seat": "A", "deck": {"colors": "WU", "score": 130}, "played": "lab"},
                                                {"seat": "B", "deck": {"colors": "BR", "score": 135}, "played": "lab"}],
                       "match": {"winner": w, "games": [{"winner": w}, {"winner": w}]},
                       **({"llm": {"decisions": 18, "calls": 19, "retries": 1, "fallbacks": 0, "tokensIn": 30, "cacheRead": 0, "cacheCreate": 58000, "tokensOut": 7000, "costUsd": 0.3, "resolved": "claude-sonnet-x"}} if kind == "llm" else {})}
                f.write(json.dumps(rec) + "\n")
            f.write('{"seed": 99')  # a line being written: ignored
    seeds = list(range(1, 301))
    for name, p in (("strong", 0.62), ("even", 0.5), ("weak", 0.38)):
        folder(f"{root}/{name}A", "forge-ranks", "A", seeds, p)
        folder(f"{root}/{name}B", "forge-ranks", "B", seeds, p)
    folder(f"{root}/llA", "llm", "A", seeds[:50], 0.5, "sonnet")
    folder(f"{root}/llB", "llm", "B", seeds[:50], 0.5, "sonnet")
    folder(f"{root}/shortA", "forge-ranks", "A", seeds[:200], 0.7)
    folder(f"{root}/shortB", "forge-ranks", "B", seeds[:200], 0.7)
    out = f"{root}/out"
    main(["--arm", f"fl:vintage:{root}/strongA:{root}/strongB:300", "--arm", f"fl:synergy:{root}/evenA:{root}/evenB:300",
          "--arm", f"fl:twobert:{root}/weakA:{root}/weakB:300", "--arm", f"fl:short:{root}/shortA:{root}/shortB:300",
          "--arm", f"ll:vintage:{root}/llA:{root}/llB:50", "--arm", f"ll:synergy:{root}/noA:{root}/noB:50", "--optional", "ll", "--out", out])
    r = json.load(open(f"{out}/drafters.json"))
    assert r["fl_vintage_code"] == 1, r["fl_vintage_code"]
    assert r["fl_synergy_code"] == 0, r["fl_synergy_code"]
    assert r["fl_twobert_code"] == -1, r["fl_twobert_code"]
    assert r["fl_short_code"] == 8, "an incomplete arm gives no verdict"
    assert r["ll_synergy_code"] == 9, "an absent optional arm is SKIPPED"
    assert r["ll_vintage_matches"] == 100 and r["ll_ran"] == 1 and r["ll_calls"] == 1900, r
    assert r["fl_vintage_matches"] == 600 and r["bad_lines"] == 0 and r["seeds_unpaired"] == 0 and r["drafter_ok"] == 1
    assert "SKIPPED" in open(f"{out}/report.md").read()
    print("j134 selftest OK")
    return 0


if __name__ == "__main__":
    sys.exit(selftest() if sys.argv[1:] == ["--selftest"] else main(sys.argv[1:]))
J134EOF
python3 var/lab-j134-tools/j134.py --selftest
T=var/lab-j134/cubes/twobert-cube-180.md
VP=fixtures/human-picks/vintage-cube-180.picks.json
SP=fixtures/human-picks/synergy-cube-180.picks.json
R="--format grid --drafts 2 --games 3 --jobs {workers} --seed 815990001 --game-timeout 300 --record-all --profiles Default,Default"
for s in A B; do
  tools/cubelab.sh run cubes/vintage-cube-180.md $R --drafter forge-ranks --drafter-seat $s --out $P/F$s-vintage
  tools/cubelab.sh run cubes/synergy-cube-180.md $R --drafter forge-ranks --drafter-seat $s --out $P/F$s-synergy
  tools/cubelab.sh run $T $R --drafter forge-ranks --drafter-seat $s --out $P/F$s-twobert
  tools/cubelab.sh run cubes/vintage-cube-180.md $R --drafter human-picks:$VP --drafter-seat $s --out $P/H$s-vintage
  tools/cubelab.sh run cubes/synergy-cube-180.md $R --drafter human-picks:$SP --drafter-seat $s --out $P/H$s-synergy
  tools/cubelab.sh run cubes/vintage-cube-180.md $R --drafter llm:fake --drafter-seat $s --out $P/L$s-vintage
done
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --drafts 2 --games 0 --jobs 1 --seed 815990001 --profiles Default,Default --out $P/plain-vintage
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 2 --games 0 --jobs 1 --seed 815990001 --profiles Default,Default --out $P/plain-synergy
tools/cubelab.sh run $T --format grid --drafts 2 --games 0 --jobs 1 --seed 815990001 --profiles Default,Default --out $P/plain-twobert
python3 var/lab-j134-tools/j134.py --arm fl:vintage:$P/FA-vintage:$P/FB-vintage:2 --arm fl:synergy:$P/FA-synergy:$P/FB-synergy:2 --arm fl:twobert:$P/FA-twobert:$P/FB-twobert:2 --arm hl:vintage:$P/HA-vintage:$P/HB-vintage:2 --arm hl:synergy:$P/HA-synergy:$P/HB-synergy:2 --arm ll:vintage:$P/LA-vintage:$P/LB-vintage:2 --optional ll --llm-model fake --plain vintage:$P/plain-vintage --plain synergy:$P/plain-synergy --plain twobert:$P/plain-twobert --check var/lab-j134/cubes/twobert-cube-180.md:54d9c89eb9d22802b556023304e73479a97dba9f2ba55b09d27ed4ce57fd1c0f --check fixtures/human-picks/vintage-cube-180.picks.json:d17708275e1559c508f36a2be65d5c07fb125ab8f044e712baecf169bbf6cfd0 --check fixtures/human-picks/synergy-cube-180.picks.json:4f1af828a5ddd70e068c52565564f2d55fa979aa293e3e46f6e90bf7c1f8352a --out $P/out
cat $P/out/drafters.json
```
metrics: merged = sh: cat var/j134-merged.txt 2>/dev/null || echo 0
metrics: p = cubelab var/lab-j134-pilot/FA-vintage var/lab-j134-pilot/FB-vintage var/lab-j134-pilot/FA-synergy var/lab-j134-pilot/FB-synergy var/lab-j134-pilot/FA-twobert var/lab-j134-pilot/FB-twobert var/lab-j134-pilot/HA-vintage var/lab-j134-pilot/HB-vintage var/lab-j134-pilot/HA-synergy var/lab-j134-pilot/HB-synergy var/lab-j134-pilot/LA-vintage var/lab-j134-pilot/LB-vintage
metrics: pforge = sh: find var/lab-j134-pilot -path '*/[FHL][AB]-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"policy":"forge"' || true
metrics: psearched = sh: find var/lab-j134-pilot -path '*/[FHL][AB]-*/games/*' -name '*.jsonl.gz' -exec zcat {} + 2>/dev/null | grep -c '"search":{"options"' || true
metrics: pj = sh: cat var/lab-j134-pilot/out/drafters.json 2>/dev/null || echo '{"written":0}'
check: merged == 1
check: qwriters == 0
check: disk_gb >= 10
check: p.drafts == 24
check: p.engine_errors + p.timeouts <= 1
check: p.mean_game_s between 0.3 and 30
check: pforge >= 24
check: psearched == 0
check: pj.written == 1
check: pj.bad_lines == 0
check: pj.drafter_ok == 1
check: pj.files_ok == 1
check: pj.seeds_unpaired == 0
check: pj.twobert_missing == 4
check: pj.ll_ran == 1
check: pj.ll_calls >= 72
check: pj.ll_fallbacks == 0
check: pj.ll_tokens_in == 0
check: pj.plain_compared == 24
check: pj.plain_differs >= 12
check: pj.verdicts_valid == 1

What the checks say:
- **The pin is merged.** The cloud merged PR #144 and re-pinned this job to the merge commit.
- **Both seats are plain Forge.** The recorded seat headers say `policy: forge`, and there are no search traces.
- **Every folder drafted with the intended drafter in the intended seat.** The Twobert cube and the two picks
  files are the pinned ones (sha256), and the lab dropped Twobert's 4 cards Forge lacks.
- **The LLM folders ran on `llm:fake`.** 72 or more calls, no fallback, 0 tokens: the pilot spent nothing.
- **The challengers draft differently from the plain drafter** in at least half of the 24 seat-seeds. On
  Twobert, forge-ranks differs from the lab drafter only in the lean and the commit, so not every seed differs.
- **The games run at Forge's speed** (a recorded pilot game on this PC's dry run took 16 s on average over the three cubes; 30 s is the bound), and the read runs and pairs every seed.
- There are no win-rate bounds.

## Commands
The order is FL, then HL, then the LL arm (skipped unless approved), then the read, so a short run loses the
smallest arms. The job is `resumable: yes`: `cubelab.sh run` on the same `--out` skips the seeds already in its
`drafts.jsonl`, and the LLM arm replays `llm/<seed>.json` for a draft it finished but did not play.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J134
mkdir -p var/lab-j134/cubes
cp {ForgeCoach}/public/cubes/twobert-cube-180.md var/lab-j134/cubes/twobert-cube-180.md
echo '54d9c89eb9d22802b556023304e73479a97dba9f2ba55b09d27ed4ce57fd1c0f  var/lab-j134/cubes/twobert-cube-180.md' | sha256sum -c
R="--format grid --drafts 300 --games 3 --jobs {workers} --game-timeout 300 --profiles Default,Default --drafter forge-ranks"
for s in A B; do
  tools/cubelab.sh run cubes/vintage-cube-180.md $R --seed 815000001 --drafter-seat $s --out var/lab-j134/F$s-vintage
done
for s in A B; do
  tools/cubelab.sh run cubes/synergy-cube-180.md $R --seed 815100001 --drafter-seat $s --out var/lab-j134/F$s-synergy
done
for s in A B; do
  tools/cubelab.sh run var/lab-j134/cubes/twobert-cube-180.md $R --seed 815200001 --drafter-seat $s --out var/lab-j134/F$s-twobert
done
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J134
R="--format grid --drafts 150 --games 3 --jobs {workers} --game-timeout 300 --profiles Default,Default"
for s in A B; do
  tools/cubelab.sh run cubes/vintage-cube-180.md $R --seed 815300001 --drafter human-picks:fixtures/human-picks/vintage-cube-180.picks.json --drafter-seat $s --out var/lab-j134/H$s-vintage
done
for s in A B; do
  tools/cubelab.sh run cubes/synergy-cube-180.md $R --seed 815400001 --drafter human-picks:fixtures/human-picks/synergy-cube-180.picks.json --drafter-seat $s --out var/lab-j134/H$s-synergy
done
```
requires: justin-approves-spend (the LL arm: Claude Sonnet through the Claude Code CLI, about $0.30 a draft, 100 drafts, about $30; it runs only when LAB_LLM_SPEND_OK=1 is in the step's environment, and stops at LAB_LLM_BUDGET_USD, default 40)
```bash
if [ "${LAB_LLM_SPEND_OK:-0}" != 1 ]; then
  echo "J134 LL arm SKIPPED: LAB_LLM_SPEND_OK is not 1 (Claude Sonnet costs API money; Justin's approval sets it)"
  exit 0
fi
export CUBELAB_HOME_ROOT=var/cubelab/homes-J134
BUDGET="${LAB_LLM_BUDGET_USD:-40}"
R="--format grid --games 3 --jobs {workers} --game-timeout 300 --profiles Default,Default --seed 815500001 --drafter llm:sonnet --llm-jobs 4"
for n in 5 10 15 20 25 30 35 40 45 50; do
  for s in A B; do
    tools/cubelab.sh run cubes/vintage-cube-180.md $R --drafts $n --drafter-seat $s --out var/lab-j134/L$s-vintage
  done
  SPENT=$(python3 -c "import json,sys;t=0.0;[t:=t+float((json.loads(l).get('llm') or {}).get('costUsd') or 0) for f in sys.argv[1:] for l in open(f) if l.strip()];print(round(t,4))" var/lab-j134/LA-vintage/drafts.jsonl var/lab-j134/LB-vintage/drafts.jsonl)
  echo "J134 LL arm: $n seeds a seat, the CLI's cost so far \$$SPENT (budget \$$BUDGET)"
  if python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) > float(sys.argv[2]) else 1)" "$SPENT" "$BUDGET"; then
    echo "J134 LL arm STOPPED at the budget: the arm is INCOMPLETE and gives no verdict"
    break
  fi
done
```
cores: 1
```bash
python3 var/lab-j134-tools/j134.py --arm fl:vintage:var/lab-j134/FA-vintage:var/lab-j134/FB-vintage:300 --arm fl:synergy:var/lab-j134/FA-synergy:var/lab-j134/FB-synergy:300 --arm fl:twobert:var/lab-j134/FA-twobert:var/lab-j134/FB-twobert:300 --arm hl:vintage:var/lab-j134/HA-vintage:var/lab-j134/HB-vintage:150 --arm hl:synergy:var/lab-j134/HA-synergy:var/lab-j134/HB-synergy:150 --arm ll:vintage:var/lab-j134/LA-vintage:var/lab-j134/LB-vintage:50 --optional ll --llm-model sonnet --check var/lab-j134/cubes/twobert-cube-180.md:54d9c89eb9d22802b556023304e73479a97dba9f2ba55b09d27ed4ce57fd1c0f --check fixtures/human-picks/vintage-cube-180.picks.json:d17708275e1559c508f36a2be65d5c07fb125ab8f044e712baecf169bbf6cfd0 --check fixtures/human-picks/synergy-cube-180.picks.json:4f1af828a5ddd70e068c52565564f2d55fa979aa293e3e46f6e90bf7c1f8352a --out var/lab-j134/out
cat var/lab-j134/out/report.md
```
check: fav.drafts == 300
check: fbv.drafts == 300
check: fas.drafts == 300
check: fbs.drafts == 300
check: fat.drafts == 300
check: fbt.drafts == 300
check: hav.drafts == 150
check: hbv.drafts == 150
check: has.drafts == 150
check: hbs.drafts == 150
check: all.engine_error_rate <= 2%
check: all.timeouts <= all.games / 50
check: jr.written == 1
check: jr.bad_lines == 0
check: jr.drafter_ok == 1
check: jr.files_ok == 1
check: jr.seeds_unpaired == 0
check: jr.twobert_missing == 4
check: jr.fl_vintage_matches >= 570
check: jr.fl_synergy_matches >= 570
check: jr.fl_twobert_matches >= 570
check: jr.hl_vintage_matches >= 285
check: jr.hl_synergy_matches >= 285
check: jr.verdicts_valid == 1

The checks only say that the run is whole and paired:
- every seed was drafted in both seats, with the intended drafter and files;
- engine errors and timeouts are low;
- at least 95% of the matches are usable.

The LL arm has no check. When it is skipped, the read marks it SKIPPED (code 9).

The verdicts are the `rule:`, read from each arm's code: 1, -1, 0, or 8 (INCOMPLETE). They are not checks.
NOT SHOWN, in any arm, is a finished job with an answer.

## Abort if
abort: qwriters > 0
abort: disk_gb < 5
abort: stopfile > 0
abort: all.games >= 300 and all.engine_error_rate > 5%
abort: all.games >= 300 and all.timeouts > all.games / 10

The aborts cover a queue night starting beside the job, the disk running low, and engine trouble. The PC session
or Justin can stop the job cleanly by creating `var/lab-j134/ABORT` (`touch` it in the lab clone's `var/`). No
abort looks at win rates. The LL arm stops itself at its budget.

## Report
collect: var/lab-j134/out/drafters.json
collect: var/lab-j134/out/report.md
collect: var/lab-j134/FA-vintage/run.json
collect: var/lab-j134/FA-twobert/run.json
collect: var/lab-j134/HA-vintage/run.json

`report.md` is written by the job (its tables). The PC session writes `summary.md` from it, plainly:
- **The verdict of every arm on every cube, under the rule,** with the rate and interval it rests on:
  - "Forge's ranks BEATS the lab drafter", "the lab drafter BEATS Forge's ranks" or "NOT SHOWN";
  - the same for the human-pick model and, if it ran, Sonnet;
  - an interval that includes 0.5 is NOT SHOWN, never "no difference".
- **The answer to "which drafter drafts best", per cube.** Name every drafter that BEATS the lab drafter.
  If none does, the lab drafter is not shown to be beaten. Drafters that never played each other are not
  ranked against each other.
- **HL against J114.** Whether it agrees with J114 (Vintage 47.8% [45.7, 49.9], Synergy 50.7% [47.6, 53.8]),
  allowing for its smaller size.
- **LL.** If it was SKIPPED, say so and quote this job's cost estimate: about $0.30 a draft, $30 for the arm.
  If it ran:
  - the CLI's cost figure;
  - tokens a draft;
  - calls, retries and fallbacks;
  - the wall time;
  - whether the budget stopped it.
- **Also, for description only:**
  - the game win rates;
  - the rate as seat A and as seat B;
  - colour shares;
  - the lab deck scores;
  - Forge-built decks;
  - the hours each block took and the mean game time;
  - Twobert's 4 dropped cards.
- **Nothing changes until the cloud reads it.** Whether ForgeCoach's Draft vs Bot offers a choice of drafter is
  a follow-up, ForgeCoach's change.
