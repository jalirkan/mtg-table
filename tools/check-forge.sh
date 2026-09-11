#!/usr/bin/env bash
# mtg-table — assert the Forge jar is present and carries every class we link.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# This is the gate for build.sh and run.sh.  It prints the jar's sha256 (which
# goes into the frame log's session header, so a bug report names the exact
# engine build) and exits non-zero if anything is missing.
#
# Usage:  ./tools/check-forge.sh            # jar from config.json
#         FORGE_JAR=/path/to.jar ./tools/check-forge.sh
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR"; exit 1; }

# This machine has a JRE only: javap lives in the jdk.jdeps module, not on PATH.
javap() { java -m jdk.jdeps/com.sun.tools.javap.Main "$@"; }

# The eight classes the whole design stands on.  If the jar is swapped for a
# different Forge build and one of these is gone, we want to know here and not
# three hundred lines into a stack trace.
for c in forge.gui.interfaces.IGuiGame \
         forge.gui.interfaces.IGuiBase \
         forge.gamemodes.match.AbstractGuiGame \
         forge.gamemodes.match.HostedMatch \
         forge.gui.control.GameEventForwarder \
         forge.util.MyRandom \
         org.eclipse.jetty.util.ajax.JSON \
         io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler; do
  javap -cp "$FORGE_JAR" "$c" >/dev/null 2>&1 \
    || { echo "MISSING CLASS: $c"; exit 1; }
done

# The members Snap and Bootstrap reach for that a different Forge build could
# plausibly not have.  A class-level check is not enough for these: each one is
# a specific accessor or enum constant, and the failure mode of a missing one is
# a compile error three hundred lines away from the reason.
#   CardView.canFaceDownBeShownTo  the identity gate (protocol 3.2 `alt`)
#   CardView.getAlternateState     the one place a face-down card's face is read
#   CardView.isToken               protocol 3.2 `token`
#   PlayerView.getLibrary          protocol 3.4 `library.cards`
#   FPref.UI_SELECT_FROM_CARD_DISPLAYS / LOAD_CARD_SCRIPTS_LAZILY  decisions D13/D14
check_member() {
  local class="$1" needle="$2"
  javap -cp "$FORGE_JAR" "$class" 2>/dev/null | grep -q -- "$needle" \
    || { echo "MISSING MEMBER: $class :: $needle"; exit 1; }
}
check_member forge.game.card.CardView 'canFaceDownBeShownTo(forge.game.player.PlayerView)'
check_member forge.game.card.CardView 'getAlternateState()'
check_member forge.game.card.CardView 'isToken()'
check_member forge.game.player.PlayerView 'getLibrary()'
check_member 'forge.localinstance.properties.ForgePreferences$FPref' 'UI_SELECT_FROM_CARD_DISPLAYS'
check_member 'forge.localinstance.properties.ForgePreferences$FPref' 'LOAD_CARD_SCRIPTS_LAZILY'
check_member forge.localinstance.properties.AbstractPreferences 'setPref(T, java.lang.String)'
# The four event kinds added by amendment P4 (report 06 section 5.3).
for c in forge.game.event.GameEventScry \
         forge.game.event.GameEventSurveil \
         forge.game.event.GameEventCardPhased \
         forge.game.event.GameEventCardForetold; do
  javap -cp "$FORGE_JAR" "$c" >/dev/null 2>&1 \
    || { echo "MISSING CLASS: $c"; exit 1; }
done

echo "forge jar: $FORGE_JAR"
sha256sum "$FORGE_JAR"
echo "forge jar OK"
