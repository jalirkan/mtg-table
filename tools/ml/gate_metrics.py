#!/usr/bin/env python3
# mtg-table — tools/ml: flat numbers about the evaluator gates' artefacts, for the lab runner's checks (D352).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""One flat JSON object of numbers on stdout (booleans as 1/0, a missing file
as `written: 0`), for a pc-jobs `metrics: name = sh: ...` line.  Reads files
only; never starts the engine.

    python3 tools/ml/gate_metrics.py dataset var/ml/data/night-1
    python3 tools/ml/gate_metrics.py report var/ml/gates/fit/report.json        # any gate report
    python3 tools/ml/gate_metrics.py grade var/ml/gates/regret/truth.jsonl var/ml/gates/regret/set.jsonl
    python3 tools/ml/gate_metrics.py lines var/ml/gates/fit/leaf-rows.jsonl
    python3 tools/ml/gate_metrics.py file var/ml/models/night-1-eval.json
"""
from __future__ import annotations

import glob
import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402


def flat(d: dict[str, Any], prefix: str = "", out: dict[str, float] | None = None, depth: int = 0) -> dict[str, float]:
    out = {} if out is None else out
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, bool):
            out[key] = 1 if v else 0
        elif isinstance(v, (int, float)) and v == v:
            out[key] = v
        elif isinstance(v, dict) and depth < 2:
            flat(v, key + "_", out, depth + 1)
    return out


def m_dataset(d: str) -> dict[str, float]:
    p = os.path.join(d, "stats.json")
    if not os.path.isfile(p):
        return {"written": 0}
    with open(p, encoding="utf-8") as f:
        st = json.load(f)
    out = {"written": 1, "rows": st.get("rows", 0), "games": st.get("games", 0),
           "reservedChecked": 1 if st.get("reservedChecked") else 0, "versions": len(st.get("versions") or {})}
    for s, v in (st.get("splits") or {}).items():
        out[f"{s}_rows"] = v.get("rows", 0)
        out[f"{s}_games"] = v.get("games", 0)
    return out


def m_report(p: str) -> dict[str, float]:
    if not os.path.isfile(p):
        return {"written": 0}
    with open(p, encoding="utf-8") as f:
        r = json.load(f)
    r.pop("rows", None)
    r.pop("rule", None)
    out = flat(r)
    out["written"] = 1
    if "leafRows" in r:
        out["leafPositions"] = r["leafRows"].get("positions", 0)
    return out


def m_grade(out: str, requests: str | None) -> dict[str, float]:
    ans: dict[str, dict[str, Any]] = {}
    for fn in sorted(glob.glob(out + ".shard-*.jsonl")):
        for a in G.read_jsonl(fn):
            ans[str(a.get("id"))] = a
    st: dict[str, float] = {"answered": len(ans)}
    for a in ans.values():
        k = str(a.get("status", "unknown"))
        st[k] = st.get(k, 0) + 1
    for k in ("ok", "error", "unsupported", "trivial", "refused"):
        st.setdefault(k, 0)
    st["requests"] = len(G.read_jsonl(requests)) if requests else 0
    st["playouts"] = sum(int(a.get("playouts") or 0) for a in ans.values())
    return st


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    kind, path = argv[0], argv[1]
    if kind == "dataset":
        out = m_dataset(path)
    elif kind == "report":
        out = m_report(path)
    elif kind == "grade":
        out = m_grade(path, argv[2] if len(argv) > 2 else None)
    elif kind == "lines":
        out = {"lines": len(G.read_jsonl(path)) if os.path.isfile(path) else 0}
    elif kind == "file":
        out = {"exists": 1 if os.path.isfile(path) else 0, "bytes": os.path.getsize(path) if os.path.isfile(path) else 0}
    else:
        print(f"gate_metrics: unknown kind {kind}", file=sys.stderr)
        return 2
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
