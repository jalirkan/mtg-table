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

# forge_home_make DIR -- a Forge home no other JVM uses, for tools/check-all.sh's
# jobs and tools/ten-games.sh's rows (decision D129, at merge; before it every
# JVM of a parallel gate booted in the one var/forge/ and wrote the same
# achievements files).  Under DIR, which must be inside this checkout's var/:
#
#   DIR/forge-home/res                        -> the res/ beside the jar, derived
#                                                exactly as tools/make-forge-home.sh
#                                                derives it (read-only)
#   DIR/forge-home/forge.profile.properties   userDir=DIR/forge/, cacheDir=DIR/cache/
#   DIR/forge/custom/cards/                   forge-home/custom-cards/*.txt, D14's
#                                                overlay, copied as make-forge-home.sh
#                                                copies it (hard rule 11: the committed
#                                                source still holds its one file)
#   DIR/config.json                           config.json with `forgeHome` pointed at
#                                                DIR/forge-home and `repoRoot` naming this
#                                                checkout, so Config.root() -- var/games/,
#                                                --deck decks/..., --out, the header's
#                                                deck path -- is what config.json gives
#
# and prints DIR/config.json, for MTG_TABLE_CONFIG (bridge/run.sh honours it).
# Nothing else changes: the jar still comes from config.json's forgeJar or
# $FORGE_JAR (hard rule 9), and Bootstrap sets its three prefs in memory in the
# new home exactly as in forge-home/ (hard rule 11).  DIR is emptied first.
forge_home_make() {
  local d="$1" res f
  case "$d" in /*) ;; *) d="$REPO_ROOT/$d" ;; esac
  case "$d/" in
    "$REPO_ROOT"/var/?*/) ;;
    *) echo "forge_home_make: $d is not under $REPO_ROOT/var/" >&2; return 1 ;;
  esac
  res="$(cd "$(dirname "$FORGE_JAR")" && pwd)/res"
  [ -d "$res" ] || { echo "forge_home_make: Forge res/ not found beside the jar: $res" >&2; return 1; }
  rm -rf "$d"
  mkdir -p "$d/forge-home" "$d/forge/custom/cards" "$d/cache"
  ln -s "$res" "$d/forge-home/res"
  printf 'userDir=%s/forge/\ncacheDir=%s/cache/\n' "$d" "$d" > "$d/forge-home/forge.profile.properties"
  for f in "$REPO_ROOT"/forge-home/custom-cards/*.txt; do
    if [ -e "$f" ]; then cp -f "$f" "$d/forge/custom/cards/"; fi
  done
  node -e '
    const fs = require("node:fs");
    const [src, dir, root] = process.argv.slice(1);
    const c = JSON.parse(fs.readFileSync(src, "utf8"));
    c.forgeHome = dir + "/forge-home";
    c.repoRoot = root;
    fs.writeFileSync(dir + "/config.json", JSON.stringify(c, null, 2) + "\n");
  ' "$CONFIG_JSON" "$d" "$REPO_ROOT" || return 1
  echo "$d/config.json"
}
