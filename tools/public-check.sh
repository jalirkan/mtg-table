#!/usr/bin/env bash
# mtg-table — tools/public-check.sh: no tracked file names this machine, its owner's home or a personal address.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# D516.  The repository is public; D515's public-repo check found 93 tracked files naming the owner's home
# folder, and D516 made every live one machine-neutral (config.json's forgeJar is ~/forge/..., docs say ~/).
# This keeps it that way.  Every TRACKED text file (`git grep`: what `git ls-files` lists, never var/,
# never personal/, never an untracked or ignored file, never a binary) is searched for
#
#   /home/          an absolute home-folder path: write ~/ or $HOME, or a repo-relative path
#   the home-folder name of the owner's machine (BANNED below) -- the same thing without its slash
#   @gmail.         a personal mail address (the commit history's author field is the owner's to keep, D516;
#                   a file's text is not)
#   the host name of the machine running the check, read with `hostname` at run time, when it is at least six
#                   characters and not localhost (so a CI runner bans its own name and this PC bans its own)
#
# and exits 1 with the file:line of every hit.  /mnt/e/ is ALLOWED: config.json's labArchiveRoot names the
# lab's archive drive (`/mnt/e/forgecoach-archive`, tools/lab/archive.py's setting), a mount point that says nothing about anyone's home
# and that tools/lab/ reads as configuration; ~/ cannot stand in for it.
#
# Every exemption is a repo-relative PATH in ALLOW, with its reason.  The list is meant to stay short: a new
# entry is a decision, not a formality.  Prefer rewording a sentence so it no longer spells the string.
#
#   ./tools/public-check.sh              check this checkout (about 0.1 s)
#   ./tools/public-check.sh --selftest   plant each banned string in a scratch repository under var/ and
#                                        require a hit for each, the allowed paths quiet and a clean tree passing
#
# The gate runs both as step 2c; CI's `redaction` job runs both too.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The owner's machine's home-folder name: banned on its own (a path spelled with it but without /home/,
# a scratchpad folder that embeds it).
BANNED_FIXED=('/home/' 'justin-a' '@gmail.')

# path <TAB> reason.  Repo-relative paths, never a bare file name.
ALLOW=(
  "tools/public-check.sh	this file: it names what it bans"
  "web/test/lab-runner.test.ts	planted leaks: the lab runner's public status must scrub a home path, the owner's home-folder name and his name, and these fixtures are the proof that it does"
  "tools/atlas/tests/test_atlas.py	planted leaks: the dataset release's scrub check must fail on a home path and a personal address, and these plants are the proof that it does"
)

# check DIR -- print every hit as file:line:text, return 1 when there is one
check() {
  local dir="$1" host spec
  local -a args=() excl=()
  for spec in "${BANNED_FIXED[@]}"; do args+=(-e "$spec"); done
  for spec in "${ALLOW[@]}"; do excl+=(":(exclude)${spec%%	*}"); done
  excl+=(':(exclude)var/' ':(exclude)personal/')
  local hits=0 out
  out="$(git -C "$dir" grep -I -n -F "${args[@]}" -- . "${excl[@]}" || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out"; hits=1; fi
  host="${PUBLIC_CHECK_HOST:-$(hostname 2>/dev/null || true)}"
  if [ "${#host}" -ge 6 ] && [ "${host,,}" != "localhost" ]; then
    out="$(git -C "$dir" grep -I -n -i -F -e "$host" -- . "${excl[@]}" || true)"
    if [ -n "$out" ]; then printf '%s\n' "$out"; hits=1; fi
  fi
  return "$hits"
}

selftest() {
  local s="$REPO_ROOT/var/public-check-selftest" fails=0 out f
  rm -rf "$s"
  mkdir -p "$s/docs" "$s/web/test" "$s/var" "$s/img"
  git -C "$s" init -q
  printf 'clean text, ~/forge and $HOME/code and /mnt/e/forgecoach-archive\n' > "$s/docs/clean.md"
  git -C "$s" add -A
  if ! check "$s" >/dev/null; then echo "SELFTEST FAIL: a clean tree (~/, \$HOME, /mnt/e/) was flagged"; fails=1; fi
  printf 'see /home/someone/x\n' > "$s/docs/a.md"
  printf 'the folder justin-a\n' > "$s/docs/b.md"
  printf 'mail someone@gmail.com\n' > "$s/docs/c.md"
  printf 'built on Test-Host-Name-7\n' > "$s/docs/d.md"
  printf 'planted /home/x\n' > "$s/web/test/lab-runner.test.ts"     # an allowed path: quiet
  printf '/home/x\n' > "$s/var/untracked-anyway.txt"                 # var/ is never read
  printf '\0/home/binary\n' > "$s/img/x.jpg"                         # a binary is never read
  git -C "$s" add docs web img
  git -C "$s" add -f var/untracked-anyway.txt
  out="$(PUBLIC_CHECK_HOST=test-host-name-7 check "$s" || true)"
  for f in docs/a.md:1 docs/b.md:1 docs/c.md:1 docs/d.md:1; do
    case "$out" in *"$f:"*) ;; *) echo "SELFTEST FAIL: no hit for $f"; fails=1 ;; esac
  done
  for f in web/test/lab-runner.test.ts var/untracked-anyway.txt img/x.jpg docs/clean.md; do
    case "$out" in *"$f:"*) echo "SELFTEST FAIL: a hit for $f, which must stay quiet"; fails=1 ;; esac
  done
  rm -rf "$s"
  if [ "$fails" = 0 ]; then echo "public-check selftest: OK (4 plants caught; an allowed path, var/, a binary and a clean file quiet)"; fi
  return "$fails"
}

case "${1:-}" in
  --selftest) selftest ;;
  "")
    if out="$(check "$REPO_ROOT")"; then
      echo "public-check: OK -- no tracked file names a home folder, this machine or a personal address (${#ALLOW[@]} allowed paths)"
    else
      printf '%s\n' "$out"
      echo "public-check: FAILED -- $(printf '%s\n' "$out" | wc -l) line(s) above name a home folder, this machine or a personal address; write ~/ or \$HOME, or reword (D516)" >&2
      exit 1
    fi
    ;;
  *) echo "usage: tools/public-check.sh [--selftest]" >&2; exit 2 ;;
esac
