#!/usr/bin/env bash
# mtg-table — shared config reader.  Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Source this from any other script:
#
#     . "$(dirname "$0")/../tools/config.sh"      # sets REPO_ROOT, FORGE_JAR, ...
#
# It sets REPO_ROOT (absolute) and exports FORGE_JAR.  The jar path comes from
# $FORGE_JAR if that is already set in the environment, otherwise from the
# "forgeJar" key of <repo>/config.json.  The jar path is NEVER hardcoded in Java.

# Absolute path of the repo root, derived from this file's own location, so the
# scripts work from any working directory (they are documented as being run from
# the repo root, but do not depend on it).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_JSON="$REPO_ROOT/config.json"

# cfg_get <key> — print one top-level string/number value from config.json.
# Tries node (present for the web/ side anyway), then python3.  No jq dependency.
cfg_get() {
  local key="$1"
  if [ ! -f "$CONFIG_JSON" ]; then
    echo "config.json not found: $CONFIG_JSON" >&2
    return 1
  fi
  if command -v node >/dev/null 2>&1; then
    node -e 'const c=require(process.argv[1]);const v=c[process.argv[2]];if(v===undefined){process.exit(2)}process.stdout.write(String(v))' \
      "$CONFIG_JSON" "$key"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys;c=json.load(open(sys.argv[1]));v=c.get(sys.argv[2]);sys.exit(2) if v is None else sys.stdout.write(str(v))' \
      "$CONFIG_JSON" "$key"
  else
    echo "need node or python3 to read $CONFIG_JSON" >&2
    return 1
  fi
}

# FORGE_JAR: environment wins, config.json is the fallback.
if [ -z "${FORGE_JAR:-}" ]; then
  FORGE_JAR="$(cfg_get forgeJar)" || {
    echo "could not read forgeJar from $CONFIG_JSON" >&2
    exit 1
  }
fi
export FORGE_JAR
