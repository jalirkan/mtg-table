#!/usr/bin/env bash
# mtg-table — tools/ml: the fit gate's leaf rows (D354).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# For every recorded game in a list, every turn's last state -- where a playout
# at the search's live horizon stops -- rebuilt from the seat's redacted log (as
# coach-grade.sh fit-scale does, D349) and scored by the hand-written leaf and,
# with --model, by the learned evaluator on the rebuilt game.  No game is
# played.  One JVM; resumable (files already in --out are skipped).
#
#   tools/ml/leaf-rows.sh --list FILES.txt --out ROWS.jsonl [--model M.json]
#
# FILES.txt is one log path per line (tools/ml/gate_fit.py heldout writes it).
# Run from the repo root after ./bridge/build.sh; the Forge home is a scratch
# one under var/ml/homes/leaf-rows (D129).
set -euo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=../config.sh
. tools/config.sh
[ -f bridge/out/mtgtable/eval/LeafRows.class ] || { echo "leaf-rows: run ./bridge/build.sh first" >&2; exit 2; }
mkdir -p var/ml/homes
cfg="$(forge_home_make var/ml/homes/leaf-rows)"
MTG_TABLE_CONFIG="$cfg" exec ./bridge/run.sh mtgtable.eval.LeafRows "$@"
