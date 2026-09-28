# mtg-table -- tools/villain-deck.sh.  Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# SOURCED, never run: `. tools/villain-deck.sh` from the repo root, after which
# $VILLAIN is the deck the gate seats the AI behind for match setup (protocol
# amendment M44) and $VILLAIN_NOTE says which deck that is and why.  The ONE
# definition, read by tools/ten-games.sh (rows 11-14) and tools/check-all.sh
# (step 9e).
#
#   1. VILLAIN_DECK=<path> in the environment wins, and must exist;
#   2. else decks/doom-legion.dck, the villain deck -- NAMED, not discovered.
#      The first cut took "the first decks/*.dck that is neither pacho-shield
#      nor a probe deck", from a hard-coded list kept in two files, so any new
#      deck that sorted before doom-legion (a hero deck, a probe deck somebody
#      forgot to list) would have become the gate's villain without a word;
#   3. else decks/morph-probe.dck as a STAND-IN, said out loud on every row:
#      what those rows guard is the profile path, and a gate that skipped them
#      because a deck was missing would be a gate that said nothing.
#
# Nothing here exits: the caller decides what a missing VILLAIN_DECK costs.
# shellcheck shell=bash

VILLAIN_DEFAULT="decks/doom-legion.dck"
VILLAIN_STANDIN="decks/morph-probe.dck"

if [ -n "${VILLAIN_DECK:-}" ]; then
  VILLAIN="$VILLAIN_DECK"
  VILLAIN_NOTE="villain deck $VILLAIN (VILLAIN_DECK)"
elif [ -f "$VILLAIN_DEFAULT" ]; then
  VILLAIN="$VILLAIN_DEFAULT"
  VILLAIN_NOTE="villain deck $VILLAIN"
else
  VILLAIN="$VILLAIN_STANDIN"
  VILLAIN_NOTE="STAND-IN $VILLAIN_STANDIN ($VILLAIN_DEFAULT is missing -- these rows exercise the profile path, not the villain)"
fi
