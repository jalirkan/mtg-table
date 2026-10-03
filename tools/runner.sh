#!/usr/bin/env bash
# mtg-table — the lab runner: runs the pc-jobs queue on Justin's PC (D334).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# A systemd USER service (forgecoach-runner.service) that is not Claude: it
# fetches pc-jobs, runs each job's pilot, checks it mechanically, runs its
# commands, and pushes STATUS, outputs, status.json and HEARTBEAT.md to
# pc-results (and a numbers-only status.json to ForgeCoach's lab-status).
# Every job step is a transient unit in forgecoach-lab.slice with a memory
# budget; the runner backs off on memory pressure through each pool's control
# file.  docs/guides/lab-runner.md is the manual.
#
#   tools/runner.sh install [--reserve-gb 7] [--public-status on|off] [--dry-run]
#   tools/runner.sh status | pause | resume | stop [J###] | logs [J###] [-f] | once | plan [J###]
#   tools/runner.sh approve J###                 # an old-format job: run its commands after a pilot a person checked
#   tools/runner.sh check jobs/J003-x.md [--metrics m.json]
#   tools/runner.sh metrics aibench var/ai-bench/night-*
#   tools/runner.sh daemon [...]                 # what the service runs
#
# Node 24 runs the TypeScript directly (type stripping); nothing to build.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node tools/runner/cli.ts "$@"
