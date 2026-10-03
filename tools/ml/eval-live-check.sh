#!/usr/bin/env bash
# mtg-table — tools/ml: the position evaluator's live parity check (D316).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Plays AI-vs-AI games and, at every decision of either chair, compares the
# evaluator's LIVE encoding (mtgtable.eval.GamePosition, what the search AI
# calls) with the LOG encoding of the same moment (Snap.state -> JsonPosition,
# what the training rows are made of), then redeals the hidden zones and
# requires the live encoding not to move.  Boots Forge, so it is not in the
# gate; bridge/build.sh's EvalSelfTest is the engine-free half.
#
#   tools/ml/eval-live-check.sh --pairs PAIRS.txt --seeds 1-2 --vocab cubes/synergy-cube-180.md \
#       [--model var/ml/models/synergy-eval.json] [--timeout 300]
#
# PAIRS.txt: `<deckA.dck> <deckB.dck>` per line, as tools/ml/record-pairs.sh
# reads it.  Run from the repo root after ./bridge/build.sh (hard rule 9); the
# Forge home is a scratch one under var/ml/homes/live-check (D129).
set -euo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=../config.sh
. tools/config.sh
[ -d bridge/out/mtgtable/eval ] || { echo "eval-live-check: run ./bridge/build.sh first" >&2; exit 2; }
mkdir -p var/ml/homes
cfg="$(forge_home_make var/ml/homes/live-check)"
MTG_TABLE_CONFIG="$cfg" exec ./bridge/run.sh mtgtable.eval.EvalLiveCheck "$@"
