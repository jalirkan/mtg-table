#!/usr/bin/env python3
# mtg-table — tools/ml: the golden values the Java evaluator is held to.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Write fixtures/eval/: a small model trained on the committed fixture games,
and Python's own answers for every decision row of every fixture (D316).

    python3 tools/ml/eval_golden.py [--out fixtures/eval]

`mtgtable.eval.EvalSelfTest` (run by bridge/build.sh) re-encodes the same
recordings in Java and must reproduce, row for row:

  * the row set (the same `seq`s chosen as decision rows);
  * every feature: a SHA-256 of the integer vector for every row, and the full
    sparse vector for every 10th row (so a mismatch names the feature);
  * the model's P(win) to 1e-9;
  * the vocabulary readers: the four cubes/*.md and every decks/*.dck parsed
    into the same names, and name normalisation on awkward names.

tools/ml/tests/test_eval.py checks the committed files against Python itself,
so a change to encode.py that moves a feature fails there first: regenerate
with this script and read the diff.  The model is deterministic (numpy, seed 0)
but its weights are not the point -- any model will do, as long as both sides
score the same one.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402

FIXTURES = os.path.join(ROOT, "fixtures", "games")
MINI_CUBE = os.path.join(HERE, "tests", "data", "mini-cube.md")
FULL_EVERY = 10
NORM_SAMPLES = ["Lim-Dûl the Necromancer", "Fire // Ice", "  Jötun   Grunt ", "Æther Vial", "Séance",
                "Delver of Secrets // Insectile Aberration", "Lightning Bolt", "", "Ratonhnhaké:ton"]


def vocab_files() -> list[str]:
    decks = sorted(os.path.join("decks", f) for f in os.listdir(os.path.join(ROOT, "decks")) if f.endswith(".dck"))
    return decks + [os.path.relpath(MINI_CUBE, ROOT)]


def feature_hash(vec) -> str:
    return hashlib.sha256(",".join(str(int(x)) for x in vec).encode()).hexdigest()[:16]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default=os.path.join(ROOT, "fixtures", "eval"))
    a = ap.parse_args(argv)
    import numpy as np
    import dataset as D
    import evalnet as N
    import train_eval as T

    os.chdir(ROOT)
    vfiles = vocab_files()
    vocab = E.Vocab.from_files(vfiles)
    schema = E.Schema(vocab)
    tmp = tempfile.mkdtemp()
    try:
        data = os.path.join(tmp, "data")
        D.build([FIXTURES], vfiles, data, (70, 15, 15), quiet=True)
        sch, names, splits = T.load_data(data)
        hp = dict(T.DEFAULTS, hidden="16", dim=4, epochs=25, patience=25)
        net, info = T.fit(splits["train"], splits["val"], names, hp, len(vocab), "numpy", 0)
        model = net.to_json(sch, names, {"excluded": info["excluded"],
                                         "training": {"note": "parity fixture: trained on fixtures/games, "
                                                      "tools/ml/eval_golden.py", "hyper": hp}})
    finally:
        shutil.rmtree(tmp)
    os.makedirs(a.out, exist_ok=True)
    N.save_model(os.path.join(a.out, "model.json"), model)

    logs = []
    n_rows = 0
    for path in E.find_logs([FIXTURES]):
        for g in E.read_games(path):
            rows = E.encode_game(g, schema)
            if not rows:
                continue
            X = [r.features for r in rows]
            p = net.predict(N.features_to_rows(X, schema.card_offset))
            out_rows = []
            for i, (r, pi) in enumerate(zip(rows, p)):
                d = {"seq": r.seq, "hash": feature_hash(r.features), "p": float(pi)}
                if i % FULL_EVERY == 0:
                    d["nz"] = [[k, int(x)] for k, x in enumerate(r.features) if x]
                out_rows.append(d)
            n_rows += len(rows)
            logs.append({"file": os.path.relpath(path, ROOT), "game": g.index, "seat": g.seat, "rows": out_rows})
    cubes = {}
    for c in sorted(os.listdir(os.path.join(ROOT, "cubes"))):
        if c.endswith(".md"):
            cubes[f"cubes/{c}"] = E.read_vocab_names(os.path.join(ROOT, "cubes", c))
    for d in vfiles:
        cubes[d] = E.read_vocab_names(os.path.join(ROOT, d))
    golden = {
        "note": "written by tools/ml/eval_golden.py; checked by mtgtable.eval.EvalSelfTest and tests/test_eval.py",
        "schemaId": schema.schema_id, "nFeatures": schema.n, "vocabFiles": vfiles,
        "decisionPhases": E.default_phases(), "fullEvery": FULL_EVERY,
        "rows": n_rows, "logs": logs, "vocabNames": cubes,
        "norm": [[s, E.norm_name(s)] for s in NORM_SAMPLES],
    }
    with open(os.path.join(a.out, "golden.json"), "w", encoding="utf-8") as f:
        json.dump(golden, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"eval_golden: {n_rows} rows from {len(logs)} games, schema {schema.schema_id}, "
          f"{schema.n} features; model {os.path.getsize(os.path.join(a.out, 'model.json'))} bytes, "
          f"golden {os.path.getsize(os.path.join(a.out, 'golden.json'))} bytes -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
