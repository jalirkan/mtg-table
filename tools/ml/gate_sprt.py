#!/usr/bin/env python3
# mtg-table — tools/ml: gate 3 of the evaluator, the SPRT on the ladder (D352).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Gate 3 (D352): does the search with the evaluator at its leaves beat the
current search in games?  The ladder plays it (`ai-ladder.sh sprt`); this tool
registers the player and reads the verdict.

    # 1. the player: the model copied to var/ml/models/eval-<sha12>.json, and a
    #    registry = the committed players.json + `search-v1-fixed3-eval-<sha12>`
    #    (search-v1-fixed3's params, kind search-eval, leaf=eval:<that file>)
    python3 tools/ml/gate_sprt.py register --model var/ml/models/night-1-eval.json \\
        --registry var/ml/gates/players.json          # prints the player's name
    # 2. the SPRT, on the confirm set (the ladder's default), mirrored deals
    tools/ai-ladder.sh sprt <name> search-v1-fixed3 --elo0 0 --elo1 20 --max-games 2400 \\
        --registry var/ml/gates/players.json --jobs 7
    # 3. the verdict
    python3 tools/ml/gate_sprt.py verdict --name <name> [--sprt var/ai-ladder/sprt.jsonl] [--report R.json]

THE RULE: search-v1-fixed3 with `leaf=eval:<model>` against search-v1-fixed3
(the same fixed 3 rounds, seed and candidates: only the leaf differs), elo0 0,
elo1 20, alpha = beta = 0.05, at most 2,400 games.  PASS = H1 accepted.  H0 or
inconclusive at 2,400 games = FAIL; a stopped run is no verdict (exit 2).
Promotion beyond this gate is D321's league rule (also non-inferior against
forge-default), not this tool's.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402



def player_def(reg: dict[str, Any], sha12: str) -> dict[str, Any]:
    base = next((p for p in reg["players"] if p["name"] == G.SPRT_RULE["base"]), None)
    if base is None or base.get("kind") != "search":
        raise SystemExit(f"gate_sprt: the registry has no search player {G.SPRT_RULE['base']}")
    return {"name": f"{G.SPRT_RULE['base']}-eval-{sha12}", "kind": "search-eval",
            "params": dict(base["params"], model=sha12),
            "note": f"D352 gate 3: {G.SPRT_RULE['base']} with the learned evaluator at its leaves "
                    f"(leaf=eval:var/ml/models/eval-{sha12}.json); only the leaf differs."}


def write_registry(path: str, reg: dict[str, Any]) -> None:
    """tools/ai-ladder/registry.ts's writeRegistry: one player per line."""
    lines = [f"    {json.dumps(p, separators=(',', ':'), ensure_ascii=False)}" for p in reg["players"]]
    head = '{\n  "version": 1,\n' + (f'  "comment": {json.dumps(reg["comment"], ensure_ascii=False)},\n' if reg.get("comment") else "") \
        + '  "players": [\n'
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + ",\n".join(lines) + "\n  ]\n}\n")


def cmd_register(a) -> int:
    sha12 = G.file_sha12(a.model)
    dst = os.path.join(a.repo, "var/ml/models", f"eval-{sha12}.json")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.isfile(dst) or G.file_sha12(dst) != sha12:
        shutil.copyfile(a.model, dst)
    with open(os.path.join(a.repo, a.base_registry), encoding="utf-8") as f:
        reg = json.load(f)
    p = player_def(reg, sha12)
    if not any(x["name"] == p["name"] for x in reg["players"]):
        reg["players"].append(p)
    write_registry(a.registry, reg)
    print(p["name"])
    return 0


def verdict(lines: list[dict[str, Any]], name: str) -> dict[str, Any]:
    R = G.SPRT_RULE
    mine = [x for x in lines if x.get("a") == name and x.get("b") == R["base"] and x.get("purpose") == "sprt"]
    if not mine:
        return {"result": "missing", "pass": False, "decided": False}
    x = mine[-1]
    params_ok = x.get("elo0") == R["elo0"] and x.get("elo1") == R["elo1"] and x.get("alpha") == R["alpha"] \
        and x.get("beta") == R["beta"]
    res = x.get("result")
    decided = res in ("H1", "H0") or (res == "inconclusive")
    return {"result": res, "pass": bool(params_ok and res == "H1"), "decided": decided and params_ok,
            "paramsAsRegistered": params_ok, "games": x.get("games"), "pairs": x.get("pairs"), "score": x.get("score"),
            "llr": x.get("llr"), "lower": x.get("lower"), "upper": x.get("upper"), "line": x}


def cmd_verdict(a) -> int:
    v = verdict(G.read_jsonl(a.sprt), a.name)
    if a.report:
        G.write_json(a.report, {"gate": "sprt", "rule": G.SPRT_RULE, "name": a.name} | v)
    why = [] if v["pass"] else [f"result {v['result']}" + ("" if v.get("paramsAsRegistered", True) else
                                                           " (not the registered elo0/elo1/alpha/beta)")]
    print(json.dumps({k: v[k] for k in ("result", "games", "pairs", "score", "llr") if k in v}))
    if v["decided"] or v["pass"]:
        print(G.verdict_line("gate 3 (sprt)", v["pass"], why))
    elif not v.get("paramsAsRegistered", True):
        print("gate 3 (sprt): NO VERDICT -- the last SPRT of this pair used other elo0/elo1/alpha/beta than the rule's")
    else:
        print(f"gate 3 (sprt): NO VERDICT -- the SPRT is {v['result']}")
    return 0 if v["pass"] else (1 if v["decided"] else 2)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("register")
    r.add_argument("--model", required=True)
    r.add_argument("--registry", required=True, help="the registry to write (the committed one is never touched)")
    r.add_argument("--base-registry", default="tools/ai-ladder/players.json")
    r.add_argument("--repo", default=".")
    v = sub.add_parser("verdict")
    v.add_argument("--name", required=True)
    v.add_argument("--sprt", default="var/ai-ladder/sprt.jsonl")
    v.add_argument("--report")
    a = ap.parse_args(argv)
    return cmd_register(a) if a.cmd == "register" else cmd_verdict(a)


if __name__ == "__main__":
    sys.exit(main())
