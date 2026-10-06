#!/usr/bin/env bash
# mtg-table — scripts/tunnel/tunnel-check.sh
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Run before every session with a friend over a Cloudflare Tunnel (D405,
# docs/cloudflare.md):
#
#   ./scripts/tunnel/tunnel-check.sh --local play.example.com   # this machine: config, routing, doors
#   ./scripts/tunnel/tunnel-check.sh play.example.com           # from outside (a phone hotspot is best)
#
# The checks are scripts/tunnel/tunnel-check.mjs; the allowlist they hold the
# tunnel to is scripts/tunnel/policy.mjs.  Exit 0 = nothing failed.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
command -v node >/dev/null 2>&1 || { echo "tunnel-check: node is not on PATH (Node 24)" >&2; exit 2; }
exec node scripts/tunnel/tunnel-check.mjs "$@"
