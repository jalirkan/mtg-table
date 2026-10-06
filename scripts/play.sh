#!/usr/bin/env bash
# mtg-table — play a game in a browser tab.  M3.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# One command, five steps:
#
#   1. tools/check-forge.sh      the jar is present and carries the 8 classes
#   2. bridge/build.sh           javac + the lint + the three self-tests
#   3. the bridge, in the background:
#        ./bridge/run.sh mtgtable.MtgTable --transport ws --port <wsPort> ...
#      with its stdout and stderr in var/play/server.log
#   4. wait for GET /health to answer 200 "ok" on the same port
#   5. vite (web/node_modules/.bin/vite, exec'd directly so the pid this script
#      holds is the server itself), in the foreground, opening the board in
#      ws mode:
#
#        http://127.0.0.1:<webPort>/?ws=1
#
#   Ctrl-C stops both.  So does the bridge exiting: when the match is over and
#   the linger window has closed, the JVM exits 0 and this script stops vite.
#
# M6 CHANGED THE DEFAULTS, and PLAN.md's M6 command block is why: a bare
# `./scripts/play.sh` is "three games back to back, one command typed".  So this
# script now passes `--games 3` (unless the caller gave a --games of their own)
# AND `--keep-open` (unless `--no-keep-open`).  Both are needed for the board's
# New Game row to have a session to act in: without --games the JVM stops after
# game 1, and without --keep-open it closes the socket the instant the LAST
# `over` lands -- which is the moment the row appears.  M6's verification found
# exactly that dead end on the milestone's own headline command.
#
# MATCH SETUP (protocol amendment M44) picks what you play against:
#
#   --deck <path>        your deck               config.json match.deck    (else "deck")
#   --ai-deck <path>     the AI's deck           config.json match.aiDeck  -- shipped as
#                        (--deck2 is the same flag)   decks/doom-legion.dck; null = a mirror
#   --ai-profile <name>  which AI profile        config.json match.aiProfile (else Default)
#                        -- one of the .ai files in forge-home/res/ai/: Default, Cautious,
#                        Reckless, Experimental.  Forge has no "difficulty": each file is
#                        a set of ~120 heuristics (docs/research/11 section 9) whose effect
#                        is situational, and in same-seed pairs against the automated seat
#                        Cautious and Reckless were NOT measurably different
#                        (docs/evidence/match-setup.md section P).  It is not a dial.
#   --mirror             ignore match.aiDeck: the AI plays a copy of your deck
#   --ai-search          the stronger AI (D312-D314, opt-in): Forge's AI with the
#                        sacrifice-outlet policy and a determinized look-ahead search
#                        at its main-phase plays, attacks and blocks (about 1.5 s of
#                        thinking at each; --ai-search-ms <n> sets that budget)
#   config.json match.games is how many games a bare run plays (default 3).
#
# The flags win over config.json, and a flag typed after `--` wins over both.
# The board's seat rails then say which deck each seat is on and the AI's
# profile; the AI's deck reaches the browser as a NAME and a card count only.
#
# Usage:
#   ./scripts/play.sh                       # three games vs Doom Legion (config.json's match block), random seed
#   ./scripts/play.sh --seed 42             # a reproducible shuffle
#   ./scripts/play.sh --ai-deck decks/morph-probe.dck --ai-profile Reckless
#   ./scripts/play.sh --deck decks/pacho-shield.dck --mirror --ai-profile Cautious
#   ./scripts/play.sh --port 8652           # a second bridge beside a running one
#   ./scripts/play.sh --engine-only --no-coach   # no coach helper (D292), so no match launcher either
#   ./scripts/play.sh --engine-only --no-match   # the coach helper without /match (D303)
#   ./scripts/play.sh --coach-port 8653          # the coach helper on another port
#   ./scripts/play.sh --engine-only --eval-model var/ml/models/night-1-eval.json   # D361: the win chance's model
#                                                # (that path is the default when it exists; --no-eval: none;
#                                                # D368: a,b,c / a directory / a manifest is an ensemble, and
#                                                # var/ml/models/night-1-ensemble.json is preferred when it exists)
#   ./scripts/play.sh --engine-only --idle-exit-after 60   # give up 60 min after the engine sleeps (D308)
#   ./scripts/play.sh --no-human-collect    # do not copy finished games into var/ml/human/ (D369, below)
#   ./scripts/play.sh --arena               # open the 3D arena instead of the board
#   ./scripts/play.sh --no-open             # do not launch a browser
#   ./scripts/play.sh --no-keep-open        # close the socket the moment the match ends
#   ./scripts/play.sh -- --games 1          # one game only (your --games wins)
#   ./scripts/play.sh --engine-only         # ONLY the engine: no vite, no browser (below)
#   ./scripts/play.sh --engine-only --lan   # ...and play from a phone on the same Wi-Fi (below)
#   ./scripts/play.sh --lan --refresh-site  # ...re-downloading ForgeCoach's site first
#   ./scripts/play.sh --lan --site-dir ../ForgeCoach/dist   # ...serving a local ForgeCoach build
#   ./scripts/play.sh --engine-only --lan --draft-room   # D400: grid-draft a cube with a friend on your Wi-Fi (below)
#   ./scripts/play.sh --engine-only --pause-lab          # D401: the lab starts no new job while this runs (below)
#   ./scripts/play.sh --tunnel https://play.example.com  # D408: a friend over the internet, through Cloudflare (below)
#
# Everything after `--` goes to `mtgtable.MtgTable` untouched, so a flag this
# script has never heard of still reaches the bridge:
#
#   ./scripts/play.sh -- --ai-name "Doom"
#
# M7 adds --arena, and it is one URL fragment: the arena is a SECOND RENDERER
# for the same frame stream, not a second app, so the socket, the bridge and the
# reducer are untouched and `#arena` is all that changes.  `V` switches back to
# the board mid-game without dropping a frame; `?arena=off` is the kill switch
# if WebGL will not start.
#
# --lan (amendment M51, D287-D289) is --engine-only for a PHONE on the same Wi-Fi.
# A phone cannot use the github.io page against this machine -- an https page may
# not open ws:// to a LAN address (mixed content; only localhost is exempt) -- so
# the bridge serves ForgeCoach ITSELF, over plain http on the ws port, and the
# phone opens http://<this machine's LAN IP>:<wsPort>/?token=<T>.  It implies
# --engine-only, and:
#
#   - binds 0.0.0.0 instead of 127.0.0.1, behind a fresh 128-bit pairing token per
#     run: every request from another machine (the page, its files, /health, /ws,
#     /observe) without it is a 403.  This machine needs no token, so the desktop's
#     browser -- github.io's ForgeCoach included -- works exactly as before;
#   - downloads ForgeCoach's built site, https://jalirkan.github.io/ForgeCoach/
#     forgecoach-site.zip, into var/forgecoach/ (re-downloaded when older than a
#     day, or with --refresh-site; offline, the cached copy; neither is an error
#     that says so) and the bridge serves it at / (--site-dir <path> serves a local
#     ForgeCoach build instead, e.g. its dist/ built with --base ./);
#   - prints the phone URL for every non-loopback IPv4 address, best guess first,
#     and a QR code of the first if `qrencode` is installed.  With the coach
#     helper off its default port (--coach-port), the URL also carries
#     `&coachPort=<n>`, which tells ForgeCoach's page where the helper is.
#
# THE TOKEN IS THE ONLY LOCK.  It is for a home network you trust: anyone on the
# same network who sees the URL can take the seat.  Ctrl-C stops it, and the next
# run has a new token.  D286's idle limit still applies: an hour with no /ws client
# ends the session.
#
# --engine-only is steps 1-4 and then a wait: no vite, no browser, no `web/node_modules`
# needed.  It is for a client that is not this repo's board -- ForgeCoach
# (https://jalirkan.github.io/ForgeCoach/), whose Play button connects to the
# bridge's seat socket ws://127.0.0.1:<wsPort>/ws from the browser (its Origin is on
# config.json's wsAllowedOrigins, D281).  The match flags are the same and so are
# the defaults (--games 3, --keep-open), because that client's New game / Next game
# needs the session to outlive an `over` exactly as the board's does.  It prints
# "Engine ready on ws://...", then runs until Ctrl-C (or SIGTERM) or until the
# match is over and the linger window has closed; either way the JVM is stopped
# and its pid reaped, and the script exits 0 (D285) -- unless the match launcher
# is on, when it sleeps and waits for the next match instead (D308, below).  Do NOT keep an mtg-table
# board tab open beside it: the first /ws client takes the seat and a second one
# is refused 4001 (M13).  --arena, --web-port and --no-open mean nothing here and
# are ignored.
#
# THE COACH HELPER (D292).  When the `claude` CLI (Claude Code) is on PATH, every
# mode also starts tools/coach-helper.mjs once the bridge is ready, on
# config.json's `coachPort` (8643): ForgeCoach's coach then asks Claude through
# the CLI already logged in on this machine, with no API key.  It prints one
# `Coach:` line either way, logs to var/play/coach.log, and is stopped with the
# bridge.  --no-coach skips it.  With --lan it binds 0.0.0.0 behind the bridge's
# own pairing token (handed over in the environment, never on a command line).
# A helper already answering on that port -- a second play.sh beside a running
# one -- is used as it is.  Since D303 it is started even when `claude` is not on
# PATH (its /health then says ok:false for the coach), because it is also the
# match launcher below; --no-coach still starts nothing.
#
# THE MATCH LAUNCHER (D303).  ForgeCoach builds both decks of a cube draft in the
# browser; its "Play this match" button POSTs them to the coach helper's /match
# (docs/match-launcher.md is the contract).  The helper writes them as .dck files
# under var/match/<id>/ (you.dck, ai.dck), writes var/match/request.json and sends
# THIS script SIGUSR1 -- this script owns the engine, so it is the one that
# restarts it:
#
#   1. it reads the request back through node and re-checks every field (the
#      paths must be var/match/m<13 digits>/you.dck and ai.dck, the profile a
#      .ai name, games 1-9, D333's aiPolicy plain|outlets|search and aiSearchMs
#      500-5000) -- nothing from the browser reaches a command line
#      except as those checked, quoted words;
#   2. it stops the bridge (SIGTERM, then SIGKILL after 3 s, reaped) and waits
#      until the ws port no longer answers -- never two engines; the seat's
#      socket drops with it, and ForgeCoach reconnects to /ws;
#   3. it starts the bridge on the new decks, profile and games, with every
#      other flag as before (--keep-open, --site-dir, --lan, anything after `--`
#      except --deck/--ai-deck/--deck2/--ai-profile/--games, which the request
#      replaces -- and --ai-policy/--ai-search when it names an aiPolicy, D333 --
#      and --game-id, which is match-<id> so a client never takes the
#      new match for a reconnect); under --lan the restarted bridge keeps the FIRST run's pairing
#      token (MTGTABLE_LAN_TOKEN, in the environment), so the phone's link and
#      the helper's token stay good;
#   4. it waits for /health as at startup and writes var/match/status.json
#      ("ready", with the decks' names and counts as the engine loaded them) and
#      var/match/current.json; the helper answers the POST from them.  A bridge
#      that does not come up is reported ("failed", its last log lines) and the
#      PREVIOUS match is started again; if even that fails, this script stops.
#
# THE ENGINE SLEEPS, PLAY.SH STAYS (D308).  A draft takes longer than the engine
# lives: it exits when a match is over and the linger window has closed (M6), or
# after an hour with no /ws client (D286).  With the launcher on, in --engine-only
# and --lan, that no longer ends THIS script: it prints "engine asleep", removes
# var/match/current.json, writes var/match/engine.json ({"state":"idle",...}), and
# waits -- no JVM runs -- keeping the coach helper, whose /health then says
# "engine":"idle".  The next POST /match (SIGUSR1) starts the bridge on the new
# decks exactly as a restart does (a bridge that will not start leaves it asleep
# rather than stopping).  Ctrl-C / SIGTERM stop everything as ever, asleep or not.
#
#   --idle-exit-after <min>   asleep this long with no match request, play.sh
#                             exits 0 (default 240; 0 = stay for ever; decimals ok)
#
# Held across the asleep window: whatever holds ForgeCoach's launcher's sleep lock
# (systemd-inhibit around this script) -- play.sh is alive, so up to 4 hours of
# an inhibited suspend after the last match; --idle-exit-after 0 holds it for ever.
# Without the launcher (--no-match, --no-coach, no helper) and in the bare board
# mode (vite) the script exits with the bridge, as before.
#
# A SECOND LAUNCH (D308).  ForgeCoach's launcher runs `play.sh --engine-only` on
# every click of its menu entry.  When the coach port already answers with the
# match launcher on, this script (before the gate, the build or any bind) asks the
# helper to wake the sleeping engine -- POST /engine/start, which restarts the
# last match setup (D381: with the request's AI profile in place of the setup's
# when its body names one; that profile is the last setup's from then on; the
# second launch sends no body; D384: each wake a fresh --seed, or the body's
# {"seed"}, or a --seed play.sh was started with) -- prints "Engine ready", and exits 0, leaving the first
# play.sh running; or, with the engine running, says so and exits 0.  Not with
# --port, --no-coach or --no-match.
#
# THE DRAFT ROOM (D400, docs/draft-room.md).  --draft-room starts the coach helper
# with its draft room even when `claude` is not on PATH: ForgeCoach's Draft -> Draft
# with a friend makes a room through the helper (POST /room on the coach port, this
# machine's door) and gives you a link for your friend.  Both players then use the
# room listener on config.json's `roomPort` (8644, --room-port <n>), a port of its
# own where every room route needs that seat's token -- this machine included,
# so a tunnel may carry that port one day and never the coach helper's.  The
# listener also serves ForgeCoach's site (the same download as --lan, or
# --site-dir), so the friend's link is a page on it:
#
#   ./scripts/play.sh --engine-only --lan --draft-room
#       the friend, on the same Wi-Fi, opens the link the page shows
#       (http://<this machine's LAN IP>:8644/#draft/friend/join?...); you draft from
#       https://jalirkan.github.io/ForgeCoach/ (or http://127.0.0.1:8644/) as ever.
#
# Without --lan the room listener answers this machine only (127.0.0.1).  Rooms
# live in var/draft-room/ (token digests only) and survive a restart; one expires a
# day after its last pick.  Needs the coach helper: not with --no-coach.
#
# A GAME BETWEEN THE TWO DRAFTERS (D402-D404).  When both players of a draft room
# have handed in a deck, the room (in the coach helper) asks for a game between
# them through the same request file and SIGUSR1 as /match: var/match/<id>/
# seat0.dck, seat1.dck and seats.json (the two names and the digests of the two
# seat tokens -- never a token).  This script restarts the bridge with
# `--humans 2 --deck .../seat0.dck --deck2 .../seat1.dck --seats-file .../seats.json
# --table-port <tablePort> --games 1 --game-id friend-<id>` (and --lan when this
# run has it), so each player connects to the table port with their own token.
# The game ends the bridge; the engine then sleeps (D308), and the next wake
# (Play vs Forge) starts the last match against the AI, never a friend's game.
#   --table-port <n>          the table's port (config.json tablePort, else 8646)
#
# A FRIEND OVER THE INTERNET (D405, D408, docs/cloudflare.md).  With a Cloudflare
# Tunnel and Access set up once (that runbook), each session is:
#
#   ./scripts/play.sh --tunnel https://play.example.com
#
# which is --engine-only --draft-room --room-public-url <that URL>, and:
#   - refuses --lan: cloudflared reaches loopback, and --lan would open every port
#     to the Wi-Fi as well;
#   - runs scripts/tunnel/tunnel-check.sh --local <its host> before anything slow
#     (the cloudflared config against the policy, and cloudflared's own routing
#     when it is installed) and again once the room listener is up (every door as
#     the tunnel reaches it), and stops on a FAIL either time -- nothing is
#     reachable through a tunnel this script has not checked;
#   - prints the two steps for the friend: sign in at the bare URL first, then
#     open the join link, because Access's PIN login drops the `#` part a join
#     link carries.
# cloudflared itself runs in another terminal (`cloudflared tunnel run <name>`),
# in the foreground; this script never starts or stops it.
#   --room-public-url <url>   only the "Over the internet" link (bases.public), with
#                             --draft-room; --tunnel sets it
#   --tunnel-config <path>    the cloudflared config to check (default ~/.cloudflared/config.yml)
#
# PLAY MODE FOR THE LAB (D401).  --pause-lab holds the lab runner's ADMISSIONS
# while this script runs: `tools/runner.sh hold --pid <this script>` at start,
# `tools/runner.sh release` at exit.  No new lab job starts; a running one is never
# stopped, paused or killed (its pool keeps its workers -- unlike `runner.sh
# pause`).  The hold is this script's pid, so a play.sh killed -9 holds nothing
# once it is gone, and a `runner.sh pause` you made by hand is never resumed by it.
# The installed runner reads holds from D401 on (`tools/runner.sh install` updates
# it; `hold` says so when it is older).
#
# The previous run's log is kept as var/play/server.prev.log.  --no-match starts
# the helper without the launcher; --no-coach starts no helper, so neither.  The
# launcher works in every mode (bare, --engine-only, --lan).
#
# THE HUMAN TEST SET (D369).  Every game you finish against the AI is copied into
# var/ml/human/ (tools/ml/human_collect.py: your seat's own log from
# var/games/<gameId>/, plus a line in var/ml/human/manifest.json), so the
# evaluator can be scored on human games (tools/ml/human_eval.py).  It runs at
# start -- printing "human test set: N games" -- when the engine falls asleep
# (D308) and at exit, takes well under a second when nothing is new, never stops
# play.sh, and copies nothing twice.  --no-human-collect turns it off.
#
# The ports come from config.json (`wsPort`, `webPort`) and are overridable with
# --port / --web-port.  The web port is vite's `strictPort: false`, so if 5173 is
# busy vite picks another and prints it; the URL below is the one it was ASKED
# for, which is why the script prints vite's own line too.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"
cd "$REPO_ROOT"

# This script reads config.json (the ports, the `match` block) and the bridge
# must read the same file: bridge/run.sh honours $MTG_TABLE_CONFIG, which
# tools/check-engine-crash.sh (D115) and the gate's jobs and ten-games' rows
# (D129) set for runs of their own, so an inherited one is dropped here.
unset MTG_TABLE_CONFIG
# D303: the restarted bridge's --lan token is handed over by THIS script alone;
# an inherited one would change the first run's.
unset MTGTABLE_LAN_TOKEN

WS_PORT="$(cfg_get wsPort || echo 8642)"
WEB_PORT="$(cfg_get webPort || echo 5173)"
OPEN=1
ENGINE_ONLY=0                    # D285: steps 1-4 only, see the header
LAN=0                            # M51: a phone on the same Wi-Fi, see the header
REFRESH_SITE=0                   # M51: re-download ForgeCoach's site even if cached
SITE_DIR=""                      # M51: serve this ForgeCoach build instead of the download
SITE_URL="https://jalirkan.github.io/ForgeCoach/forgecoach-site.zip"
SITE_CACHE="var/forgecoach"
ARENA=0                          # M7: --arena opens /#arena instead of the board
KEEP_OPEN=1                      # M6: the default, see the header
COACH=1                          # D292: the coach helper, when `claude` is on PATH
COACH_PORT="$(cfg_get coachPort || echo 8643)"
MATCH=1                          # D303: the match launcher, in the coach helper
MATCH_DIR="var/match"
MATCH_PENDING=0
MATCH_ON=0                       # D303: 1 once THIS script's helper serves /match
IDLE_EXIT_MIN=240                # D308: minutes asleep with no match request before play.sh exits; 0 = never
IDLE=0                           # D308: 1 while the engine has exited and play.sh waits for a match request
IDLE_SINCE_S=0                   # D308: $SECONDS when it fell asleep
IDLE_EXPIRED=0
PORT_EXPLICIT=0                  # D308: --port given, so this is a second bridge on purpose
PASSTHROUGH=()
EVAL_ARGS=()                     # D361: the coach helper's /eval (--eval-model <path>, --no-eval)
HUMAN_COLLECT=1                  # D369: copy finished games into var/ml/human/ at start, asleep and exit
HUMAN_COLLECTED_AT_STOP=0
DRAFT_ROOM=0                     # D400: the draft room, in the coach helper, on its own port
ROOM_PORT="$(cfg_get roomPort || echo 8644)"
TABLE_PORT="$(cfg_get tablePort || echo 8646)"   # D402: a game between two people's seats (the draft room starts one, D404)
ROOM_SITE=""                     # D400: the site the room listener serves (the --lan download, or --site-dir)
ROOM_LINE=""
PAUSE_LAB=0                      # D401: hold the lab runner's admissions while this script runs
ROOM_PUBLIC_URL=""               # D408: the draft room's "Over the internet" base (the helper's --room-public-url)
TUNNEL_URL=""                    # D408: --tunnel <https://host>, see the header
TUNNEL_CONFIG=""                 # D408: the cloudflared config tunnel-check reads (default ~/.cloudflared/config.yml)
LAB_HELD=0

# D303: the coach helper's /match asks for a restart with SIGUSR1.  IGNORED
# before anything else, because an untrapped USR1 would end this script, and
# taken (usr1_on) only while this script waits: bash 5.2 running a trap in the
# middle of parsing a $( ) fails with "unexpected EOF while looking for matching
# `)'", which set -e makes fatal -- the helper re-sends the signal during a slow
# restart, and play.sh died mid-restart, taking the helper and the POST with it.
# A signal ignored is not lost: the helper re-sends it every 2 s until it sees
# its request taken up, and restart_match looks once more after each restart.
trap '' USR1
usr1_on() { trap 'MATCH_PENDING=1' USR1; }
usr1_off() { trap '' USR1; }

# A TEST SEAM, for tools/match-launcher-selftest.mjs only: a node script that
# stands in for the bridge (it answers /health and prints the lines this script
# reads).  It skips check-forge and the build.  Never set it to play.
FAKE_ENGINE="${MTGTABLE_TEST_FAKE_ENGINE:-}"
PLAY_VAR="var/play"
if [ -n "$FAKE_ENGINE" ] && [ -n "${MTGTABLE_TEST_VAR:-}" ]; then
  # ...and the self-test's own var/ folder, so it never touches a real run's.
  case "$MTGTABLE_TEST_VAR" in
    *..*|*' '*) echo "play.sh: MTGTABLE_TEST_VAR must be a folder under var/" >&2; exit 1 ;;
    var/?*) : ;;
    *) echo "play.sh: MTGTABLE_TEST_VAR must be a folder under var/" >&2; exit 1 ;;
  esac
  PLAY_VAR="$MTGTABLE_TEST_VAR/play"
  MATCH_DIR="$MTGTABLE_TEST_VAR/match"
fi

# Match setup (M44): config.json's `match` block, then the flags.  `cfg_get`
# reads top-level keys only, so the block is read here; a missing block or key
# is the old behaviour (your `deck`, a mirror, Default, three games).
cfg_match() {
  node -e '
    const c = require(process.argv[1]); const m = c.match ?? {};
    const v = m[process.argv[2]];
    if (v === undefined || v === null || v === "") process.exit(2);
    process.stdout.write(String(v));
  ' "$CONFIG_JSON" "$1" 2>/dev/null
}
DECK="$(cfg_match deck || cfg_get deck || echo decks/pacho-shield.dck)"
AI_DECK="$(cfg_match aiDeck || true)"   # empty = a mirror of DECK
AI_PROFILE="$(cfg_match aiProfile || echo Default)"
GAMES_DEFAULT="$(cfg_match games || echo 3)"   # M6: "three games back to back, one command typed"

while [ $# -gt 0 ]; do
  case "$1" in
    --port)      WS_PORT="$2"; PORT_EXPLICIT=1; shift 2 ;;
    --web-port)  WEB_PORT="$2"; shift 2 ;;
    --engine-only) ENGINE_ONLY=1; shift ;;
    --lan)       LAN=1; ENGINE_ONLY=1; shift ;;
    --refresh-site) REFRESH_SITE=1; shift ;;
    --site-dir)  SITE_DIR="$2"; shift 2 ;;
    --no-open)   OPEN=0; shift ;;
    --arena)     ARENA=1; shift ;;
    --no-arena)  ARENA=0; shift ;;
    --keep-open) KEEP_OPEN=1; shift ;;
    --no-keep-open) KEEP_OPEN=0; shift ;;
    --deck)      DECK="$2"; shift 2 ;;
    --ai-deck|--deck2) AI_DECK="$2"; shift 2 ;;
    --ai-profile) AI_PROFILE="$2"; shift 2 ;;
    --mirror)    AI_DECK=""; shift ;;
    # D314: the stronger AI, opt-in -- D310's outlet policy plus D312's search.
    # Passed through to MtgTable, so a match ForgeCoach restarts keeps it.
    --ai-search) PASSTHROUGH+=(--ai-policy search); AI_SEARCH=1; shift ;;
    --ai-search-ms) PASSTHROUGH+=(--ai-search "ms=$2"); AI_SEARCH=1; shift 2 ;;
    --no-coach)  COACH=0; shift ;;
    --coach-port) COACH_PORT="$2"; shift 2 ;;
    --no-match)  MATCH=0; shift ;;
    --eval-model) EVAL_ARGS+=(--eval-model "$2"); shift 2 ;;
    --no-eval)   EVAL_ARGS+=(--no-eval); shift ;;
    --idle-exit-after) IDLE_EXIT_MIN="${2:-}"; shift 2 ;;
    --no-human-collect) HUMAN_COLLECT=0; shift ;;
    --draft-room) DRAFT_ROOM=1; shift ;;
    --room-port) ROOM_PORT="$2"; shift 2 ;;
    --table-port) TABLE_PORT="$2"; shift 2 ;;
    --pause-lab) PAUSE_LAB=1; shift ;;
    --room-public-url) ROOM_PUBLIC_URL="${2:-}"; shift 2 ;;
    --tunnel)    TUNNEL_URL="${2:-}"; shift 2 ;;
    --tunnel-config) TUNNEL_CONFIG="${2:-}"; shift 2 ;;
    --help|-h)   sed -n '5,/^set -euo pipefail/p' "$0" | sed '$d'; exit 0 ;;
    --)          shift; PASSTHROUGH+=("$@"); break ;;
    *)           PASSTHROUGH+=("$1"); shift ;;
  esac
done

case "$IDLE_EXIT_MIN" in
  ''|*[!0-9.]*|*.*.*|.) printf 'play.sh: --idle-exit-after wants minutes, e.g. 240, or 0 for never (got "%s")\n' "$IDLE_EXIT_MIN" >&2; exit 1 ;;
esac
IDLE_EXIT_SEC="$(node -e 'process.stdout.write(String(Math.round(Number(process.argv[1]) * 60)))' "$IDLE_EXIT_MIN")"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
# D408: --tunnel is --engine-only --draft-room --room-public-url <url>, never with --lan.
if [ -n "$TUNNEL_URL" ]; then
  TUNNEL_URL="${TUNNEL_URL%/}"
  [ "$LAN" = "1" ] && { printf 'play.sh: --tunnel and --lan do not mix: cloudflared reaches this machine on loopback, and --lan would also open every port to your Wi-Fi (docs/cloudflare.md)\n' >&2; exit 1; }
  printf '%s' "$TUNNEL_URL" | grep -Eqi '^https://[a-z0-9-]+(\.[a-z0-9-]+)+$' \
    || { printf 'play.sh: --tunnel wants your tunnel'"'"'s https:// address and nothing else, e.g. https://play.example.com (got "%s")\n' "$TUNNEL_URL" >&2; exit 1; }
  [ -n "$ROOM_PUBLIC_URL" ] && [ "${ROOM_PUBLIC_URL%/}" != "$TUNNEL_URL" ] && { printf 'play.sh: --tunnel %s and --room-public-url %s disagree: give one\n' "$TUNNEL_URL" "$ROOM_PUBLIC_URL" >&2; exit 1; }
  ROOM_PUBLIC_URL="$TUNNEL_URL"
  ENGINE_ONLY=1
  DRAFT_ROOM=1
fi
if [ -n "$ROOM_PUBLIC_URL" ]; then
  ROOM_PUBLIC_URL="${ROOM_PUBLIC_URL%/}"
  [ "$DRAFT_ROOM" = "1" ] || { printf 'play.sh: --room-public-url is the draft room'"'"'s: add --draft-room (or use --tunnel <url>)\n' >&2; exit 1; }
  # The helper's own rule (an origin, nothing after it); checked here so a typo costs a second.
  printf '%s' "$ROOM_PUBLIC_URL" | grep -Eqi '^https?://[a-z0-9.-]+(:[0-9]{1,5})?$' \
    || { printf 'play.sh: --room-public-url must be an origin like https://play.example.com (got "%s")\n' "$ROOM_PUBLIC_URL" >&2; exit 1; }
fi
[ -n "$TUNNEL_CONFIG" ] && [ -z "$TUNNEL_URL" ] && { printf 'play.sh: --tunnel-config goes with --tunnel\n' >&2; exit 1; }
[ "$DRAFT_ROOM" = "1" ] && [ "$COACH" != "1" ] && { printf 'play.sh: --draft-room runs in the coach helper: drop --no-coach\n' >&2; exit 1; }
case "$ROOM_PORT" in ''|*[!0-9]*) printf 'play.sh: --room-port wants a port number (got "%s")\n' "$ROOM_PORT" >&2; exit 1 ;; esac
case "$TABLE_PORT" in ''|*[!0-9]*) printf 'play.sh: --table-port wants a port number (got "%s")\n' "$TABLE_PORT" >&2; exit 1 ;; esac

# D369: the human test set -- finished human-vs-AI games from var/games/ into
# var/ml/human/, one status line.  Never fails this script; not in the self-test.
human_collect() {
  [ "$HUMAN_COLLECT" = "1" ] && [ -z "${MTGTABLE_TEST_FAKE_ENGINE:-}" ] || return 0
  command -v python3 >/dev/null 2>&1 || { echo "human test set: python3 not found, games not collected (D369)"; return 0; }
  local t=()
  command -v timeout >/dev/null 2>&1 && t=(timeout 120)
  "${t[@]+"${t[@]}"}" python3 tools/ml/human_collect.py --quiet 2>/dev/null \
    || echo "human test set: the collector failed (run python3 tools/ml/human_collect.py to see why)"
}
die() { printf '\033[31mplay.sh: %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------------------
# 0: the match -- checked before anything slow runs
# --------------------------------------------------------------------------

# A flag the caller typed after `--` goes to MtgTable untouched and wins; this
# script then adds nothing of its own for that setting (the --games rule below).
passthrough_has() {
  local f
  for f in "$@"; do
    case " ${PASSTHROUGH[*]+${PASSTHROUGH[*]}} " in
      *" $f "*|*" $f="*) return 0 ;;
    esac
  done
  return 1
}
deck_name() {   # the .dck's own Name=, which is what the board will print
  local n
  n="$(sed -n 's/^Name=//p' "$1" | head -1 | tr -d '\r')"
  [ -n "$n" ] && printf '%s' "$n" || basename "$1" .dck
}
MATCH_ARGS=()
if ! passthrough_has --deck; then
  [ -f "$DECK" ] || die "your deck $DECK does not exist (--deck, or config.json match.deck)"
  MATCH_ARGS+=(--deck "$DECK")
fi
if ! passthrough_has --deck2 --ai-deck; then
  if [ -n "$AI_DECK" ]; then
    [ -f "$AI_DECK" ] || die "the AI's deck $AI_DECK does not exist (--ai-deck, or config.json match.aiDeck; --mirror plays your own)"
    MATCH_ARGS+=(--ai-deck "$AI_DECK")
  fi
fi
if ! passthrough_has --ai-profile; then
  # The bridge validates this too (Bootstrap.resolveAiProfile) -- this copy is
  # only so a typo costs a second instead of a build and an engine boot.
  PROFILES=()
  for f in forge-home/res/ai/*.ai; do
    [ -f "$f" ] && PROFILES+=("$(basename "$f" .ai)")
  done
  if [ "${#PROFILES[@]}" -gt 0 ]; then
    CANON=""
    for p in "${PROFILES[@]}"; do
      [ "${p,,}" = "${AI_PROFILE,,}" ] && CANON="$p"
    done
    [ -n "$CANON" ] || die "--ai-profile $AI_PROFILE is not one of: ${PROFILES[*]} (the .ai files in forge-home/res/ai/)"
    AI_PROFILE="$CANON"
  fi
  MATCH_ARGS+=(--ai-profile "$AI_PROFILE")
fi
# --------------------------------------------------------------------------
# 0a: a second launch beside a play.sh whose engine sleeps (D308)
# --------------------------------------------------------------------------
# ForgeCoach's launcher runs `play.sh --engine-only` each time its app-menu entry
# is clicked.  If a play.sh already owns this coach port with the match launcher
# on, this one must not build, bind, or start a second helper: asleep, it wakes
# the first through POST /engine/start; running, it says so.  Either way exit 0.
# Not with --port (a second bridge on purpose), --no-coach or --no-match.
if [ "$ENGINE_ONLY" = "1" ] && [ "$COACH" = "1" ] && [ "$MATCH" = "1" ] && [ "$PORT_EXPLICIT" = "0" ] && command -v node >/dev/null 2>&1; then
  node -e '
    const base = "http://127.0.0.1:" + process.argv[1];
    const get = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(2000) }); return { s: r.status, t: await r.text() }; } catch { return null; } };
    (async () => {
      const h = await get(base + "/health"); let j = null;
      try { j = JSON.parse(h && h.t); } catch {}
      if (!j || j.helper !== 1 || j.match !== 1 || !j.engine) process.exit(10);        // not a launcher-carrying helper: carry on
      if (j.engine !== "idle") {
        const e = await get("http://127.0.0.1:" + process.argv[2] + "/health");
        if (e && e.s === 200) { console.log("ForgeCoach engine already running on ws://127.0.0.1:" + process.argv[2] + "/ws (play.sh is running; Ctrl-C it to stop) — nothing to start"); process.exit(0); }
        process.exit(10);
      }
      console.log("An engine from an earlier play.sh is asleep — waking it (POST /engine/start, up to 3 min)");
      let r; try { r = await fetch(base + "/engine/start", { method: "POST", signal: AbortSignal.timeout(200000) }); } catch (e) { console.error("play.sh: could not wake it: " + e.message); process.exit(11); }
      const b = await r.json().catch(() => ({}));
      if (r.status === 200 && b.ok) { console.log("Engine ready on ws://127.0.0.1:" + process.argv[2] + "/ws — open https://jalirkan.github.io/ForgeCoach/ and click Play (the earlier play.sh keeps running; Ctrl-C it to stop)"); process.exit(0); }
      console.error("play.sh: the sleeping engine did not wake: " + (b.message || "HTTP " + r.status)); process.exit(11);
    })();
  ' "$COACH_PORT" "$WS_PORT" && exit 0 || { rc=$?; [ "$rc" = "11" ] && exit 1; }
fi

# --------------------------------------------------------------------------
# 0b: --tunnel (D408) -- the pre-session check, before anything slow or bound
# --------------------------------------------------------------------------
TUNNEL_HOST="${TUNNEL_URL#https://}"
tunnel_check() {   # tunnel_check <what> -- scripts/tunnel/tunnel-check.sh --local on this run's ports; 1 on a FAIL
  local cfg=() rc=0
  [ -n "$TUNNEL_CONFIG" ] && cfg=(--config "$TUNNEL_CONFIG")
  ./scripts/tunnel/tunnel-check.sh --local "$TUNNEL_HOST" "${cfg[@]+"${cfg[@]}"}" \
    --room-port "$ROOM_PORT" --coach-port "$COACH_PORT" --ws-port "$WS_PORT" --seat-port "$TABLE_PORT" 2>&1 | sed 's/^/  /' || rc=$?
  [ "$rc" = "0" ] && return 0
  printf '\033[31mplay.sh: tunnel-check failed (%s) -- fix what it says FAIL before a friend can reach anything (docs/cloudflare.md, "Security checklist")\033[0m\n' "$1" >&2
  return 1
}
if [ -n "$TUNNEL_URL" ]; then
  say "tunnel-check (before the start): $TUNNEL_HOST"
  command -v node >/dev/null 2>&1 || die "--tunnel needs node for scripts/tunnel/tunnel-check.sh"
  tunnel_check "the config" || exit 1
fi

say "match"
[ "$ENGINE_ONLY" = "1" ] && echo "mode: engine only (no vite, no browser) — D285"
[ -n "$TUNNEL_URL" ] && echo "mode: tunnel — a friend over the internet at $TUNNEL_URL, through Cloudflare (D405, D408); the engine and the room on loopback only"
[ "$LAN" = "1" ] && echo "mode: LAN — a phone on the same network, behind a pairing token (amendment M51)"
if passthrough_has --deck; then echo "you:  (the --deck after --)"; else
  echo "you:  $(deck_name "$DECK")  [$DECK]"; fi
if passthrough_has --deck2 --ai-deck; then echo "AI:   (the --ai-deck after --)"
elif [ -n "$AI_DECK" ]; then echo "AI:   $(deck_name "$AI_DECK")  [$AI_DECK]"
else echo "AI:   a mirror of your deck  (--mirror, or config.json match.aiDeck is null)"; fi
[ "${AI_SEARCH:-0}" = "1" ] && echo "AI policy: search (D312-D314: outlet policy + look-ahead search)"
passthrough_has --ai-profile && echo "AI profile: (the --ai-profile after --)" \
  || echo "AI profile: $AI_PROFILE"
human_collect

# --------------------------------------------------------------------------
# 0b: --lan's site (amendment M51, D289) -- before anything slow, so a missing
#     site costs a second and not a build
# --------------------------------------------------------------------------

# unpack_zip ZIP DIR -- `unzip`, or Python's zipfile where there is none.  Both
# refuse a member that would land outside DIR.
unpack_zip() {
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$1" -d "$2"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m zipfile -e "$1" "$2"
  else
    die "neither unzip nor python3 is installed, so $1 cannot be unpacked"
  fi
}
zip_ok() {   # a complete zip, not an HTML error page or a cut-off download
  if command -v unzip >/dev/null 2>&1; then unzip -tq "$1" >/dev/null 2>&1
  else python3 -c 'import sys,zipfile; sys.exit(zipfile.ZipFile(sys.argv[1]).testzip() is not None)' "$1" 2>/dev/null; fi
}
fetch_site() {
  local zip="$SITE_CACHE/forgecoach-site.zip" site="$SITE_CACHE/site" stamp="$SITE_CACHE/site.stamp" fresh=0
  mkdir -p "$SITE_CACHE"
  if [ "$REFRESH_SITE" = "1" ] || [ ! -f "$zip" ] || [ -n "$(find "$zip" -mmin +1440 2>/dev/null)" ]; then
    echo "downloading $SITE_URL"
    if command -v curl >/dev/null 2>&1 \
        && curl -fsSL --max-time 120 -o "$zip.part" "$SITE_URL" && zip_ok "$zip.part"; then
      mv -f "$zip.part" "$zip"
      fresh=1
    else
      rm -f "$zip.part"
      if [ ! -f "$zip" ]; then
        # D400: only the draft room wants it -- it runs without a site (the friend then has no page to open).
        [ "${1:-}" = "soft" ] && { echo "  could not download $SITE_URL and there is no cached copy: the draft room runs without ForgeCoach's site (pass --site-dir <a built ForgeCoach>)"; return 1; }
        die "could not download $SITE_URL and there is no cached copy in $zip -- check the network (or curl), or pass --site-dir <a built ForgeCoach>"
      fi
      echo "  could not download it; using the cached copy of $(date -r "$zip" '+%Y-%m-%d %H:%M')"
    fi
  else
    echo "ForgeCoach's site: the cached copy of $(date -r "$zip" '+%Y-%m-%d %H:%M') (under a day old; --refresh-site re-downloads)"
  fi
  if [ "$fresh" = "1" ] || [ ! -f "$site/index.html" ] || [ ! -f "$stamp" ] || [ "$zip" -nt "$stamp" ]; then
    rm -rf "$site.new"
    mkdir -p "$site.new"
    unpack_zip "$zip" "$site.new" || die "could not unpack $zip"
    [ -f "$site.new/index.html" ] || die "$zip has no index.html at its root -- not ForgeCoach's site zip"
    rm -rf "$site"
    mv "$site.new" "$site"
    touch "$stamp"
  fi
  SITE_DIR="$site"
}
SITE_ARGS=()
SITE_FOR_BRIDGE=0
{ [ "$LAN" = "1" ] || [ -n "$SITE_DIR" ]; } && SITE_FOR_BRIDGE=1
if [ "$SITE_FOR_BRIDGE" = "1" ] || [ "$DRAFT_ROOM" = "1" ]; then
  say "ForgeCoach's site"
  SITE_OK=1
  if [ -n "$SITE_DIR" ]; then
    [ -f "$SITE_DIR/index.html" ] || die "--site-dir $SITE_DIR has no index.html at its root -- build ForgeCoach with --base ./ first"
    echo "serving $SITE_DIR (--site-dir)"
  elif [ "$SITE_FOR_BRIDGE" = "1" ]; then
    fetch_site
  else
    fetch_site soft || SITE_OK=0   # D400: the draft room alone
  fi
  if [ "$SITE_FOR_BRIDGE" = "1" ]; then
    SITE_ARGS+=(--site-dir "$SITE_DIR")
    [ "$LAN" = "1" ] && SITE_ARGS+=(--lan)
  fi
  # D400: the room listener serves the same site (the bridge's flags are unchanged by --draft-room).
  [ "$DRAFT_ROOM" = "1" ] && [ "$SITE_OK" = "1" ] && ROOM_SITE="$SITE_DIR"
fi

# --------------------------------------------------------------------------
# 0c: --pause-lab (D401) -- the lab runner admits no new job while this runs
# --------------------------------------------------------------------------
RUNNER_STATE_ARGS=()
# A TEST SEAM like MTGTABLE_TEST_VAR: the self-test's own runner state folder, never the installed one.
if [ -n "$FAKE_ENGINE" ] && [ -n "${MTGTABLE_TEST_RUNNER_STATE:-}" ]; then RUNNER_STATE_ARGS=(--state "$MTGTABLE_TEST_RUNNER_STATE"); fi
lab_release() {
  [ "$LAB_HELD" = "1" ] || return 0
  LAB_HELD=0
  ./tools/runner.sh release --pid "$$" "${RUNNER_STATE_ARGS[@]+"${RUNNER_STATE_ARGS[@]}"}" >/dev/null 2>&1 \
    && echo "lab: new jobs may start again (--pause-lab released)" \
    || echo "lab: could not release the hold (it ends by itself now this script is gone)"
}
if [ "$PAUSE_LAB" = "1" ]; then
  say "lab"
  if out="$(./tools/runner.sh hold --pid "$$" --by "play.sh --pause-lab" "${RUNNER_STATE_ARGS[@]+"${RUNNER_STATE_ARGS[@]}"}" 2>&1)"; then
    LAB_HELD=1
    printf '%s\n' "$out"
  else
    echo "lab: could not hold the runner's admissions (${out##*$'\n'}) -- playing on anyway"
  fi
fi

# --------------------------------------------------------------------------
# 1 + 2: the gate and the build
# --------------------------------------------------------------------------

if [ -n "$FAKE_ENGINE" ]; then
  say "check-forge and build: skipped (MTGTABLE_TEST_FAKE_ENGINE, a self-test's fake bridge)"
  ENGINE=(node "$FAKE_ENGINE" mtgtable.MtgTable)
else
  say "check-forge"
  ./tools/check-forge.sh >/dev/null || die "tools/check-forge.sh failed — run it directly for the detail"
  echo "jar OK"

  say "build"
  ./bridge/build.sh || die "bridge/build.sh failed"
  ENGINE=(./bridge/run.sh mtgtable.MtgTable)
fi

[ "$ENGINE_ONLY" = "1" ] || [ -d web/node_modules ] || die "web/node_modules is missing — run: npm --prefix web install"

# --------------------------------------------------------------------------
# 3: the bridge, in the background
# --------------------------------------------------------------------------

mkdir -p "$PLAY_VAR"
# D386: server.log carries the --lan pairing token (the phone's URL line, which
# this script reads back for the helper and a restart), so the folder is the
# owner's alone: another account on this machine cannot read the token.
chmod 700 "$PLAY_VAR" 2>/dev/null || true
SERVER_LOG="$PLAY_VAR/server.log"
: > "$SERVER_LOG"
# D386: the log's last lines for the terminal, the --lan token cut out of them.
server_tail() { tail -"$1" "$SERVER_LOG" | sed 's/token=[A-Za-z0-9_-]*/token=…/g'; }

SERVER_PID=""
VITE_PID=""
COACH_PID=""
COACH_LOG="$PLAY_VAR/coach.log"

stop() {
  # Idempotent: this runs from the trap AND from the normal exit path.
  trap - INT TERM EXIT
  if [ -n "$COACH_PID" ] && kill -0 "$COACH_PID" 2>/dev/null; then
    # SIGTERM: the helper kills a running `claude` (its whole process group) and exits.
    kill "$COACH_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$COACH_PID" 2>/dev/null || break
      sleep 0.2
    done
    kill -9 "$COACH_PID" 2>/dev/null || true
    wait "$COACH_PID" 2>/dev/null || true
  fi
  if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$VITE_PID" 2>/dev/null || break
      sleep 0.3
    done
    kill -9 "$VITE_PID" 2>/dev/null || true
    wait "$VITE_PID" 2>/dev/null || true
  fi
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\nstopping the bridge (pid %s)\n' "$SERVER_PID"
    stop_bridge
  fi
  # D303: a match launcher with no play.sh behind it has no match to report.
  if [ "$MATCH_ON" = "1" ]; then
    rm -f "$MATCH_DIR/current.json" "$MATCH_DIR/request.json" "$MATCH_DIR/status.json" "$MATCH_DIR/engine.json" 2>/dev/null || true
  fi
  lab_release   # D401
  # D369: the games this session finished, now that the bridge has flushed its logs.
  if [ "$HUMAN_COLLECTED_AT_STOP" = "0" ] && [ -n "${SERVER_LOG:-}" ]; then
    HUMAN_COLLECTED_AT_STOP=1
    human_collect
  fi
}
stop_bridge() {
  # The JVM gets a moment to close the socket and flush its frame log; the
  # log is written per line (§8) so even a KILL leaves a parseable file.
  [ -n "$SERVER_PID" ] || return 0
  kill "$SERVER_PID" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 "$SERVER_PID" 2>/dev/null || break
    sleep 0.3
  done
  kill -9 "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap stop INT TERM EXIT

say "bridge — ws://127.0.0.1:$WS_PORT/ws"
KEEP_ARGS=()
[ "$KEEP_OPEN" = "1" ] && KEEP_ARGS+=(--keep-open)
# --games: the caller's wins.  `--games` may arrive either before `--` (this
# script does not parse it, so it lands in PASSTHROUGH) or after it, and both
# spellings end up in the same array -- so one scan of that array decides.
case " ${PASSTHROUGH[*]+${PASSTHROUGH[*]}} " in
  *" --games "*|*" --games="*) : ;;
  *) KEEP_ARGS+=(--games "$GAMES_DEFAULT") ;;
esac
# --seed: the caller's wins; otherwise a random one, printed so the game can be
# replayed (as spectate.sh does).  Without it the bridge's seed is 0: every bare
# play.sh would deal the same shuffle and name its game human-ws-0 every time.
if ! passthrough_has --seed; then
  KEEP_ARGS+=(--seed "$(( (RANDOM << 15 | RANDOM) % 100000 ))")
  echo "seed ${KEEP_ARGS[-1]} (random; --seed ${KEEP_ARGS[-1]} replays this shuffle)"
fi
# BRIDGE_ARGS is the bridge's whole command line after the class; D303's restart
# replaces it and keeps the previous one to fall back on.
BRIDGE_ARGS=(--transport ws --port "$WS_PORT"
    "${MATCH_ARGS[@]+"${MATCH_ARGS[@]}"}"
    "${KEEP_ARGS[@]+"${KEEP_ARGS[@]}"}" "${SITE_ARGS[@]+"${SITE_ARGS[@]}"}"
    "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}")
LAN_TOKEN=""                     # D303: the first run's pairing token, for a restart
LAST_AI_ARGS=("${BRIDGE_ARGS[@]}")   # D404: what a wake restarts -- the last match against the AI, never a table
CUR_IS_TABLE=0                   # D404: the running bridge is a game between two people
start_bridge() {   # start_bridge ARGS... -- the bridge in the background, SERVER_PID
  usr1_on            # so the bridge starts with USR1 at its default, not ignored
  if [ -n "$LAN_TOKEN" ]; then
    MTGTABLE_LAN_TOKEN="$LAN_TOKEN" "${ENGINE[@]}" "$@" >>"$SERVER_LOG" 2>&1 &
  else
    "${ENGINE[@]}" "$@" >>"$SERVER_LOG" 2>&1 &
  fi
  SERVER_PID=$!
  usr1_off
}
start_bridge "${BRIDGE_ARGS[@]}"
echo "pid $SERVER_PID · log $SERVER_LOG"

# --------------------------------------------------------------------------
# 4: readiness — GET /health on the same port
# --------------------------------------------------------------------------

health_body() {   # the body of GET /health on the ws port, or nothing
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "http://127.0.0.1:$WS_PORT/health" 2>/dev/null || true
  else
    node -e '
      fetch(`http://127.0.0.1:${process.argv[1]}/health`).then(r => r.text()).then(t => process.stdout.write(t)).catch(() => {});
    ' "$WS_PORT" 2>/dev/null || true
  fi
}
# wait_ready -- 0 when /health says ok, 1 when the bridge exited first, 2 after 60 s.
wait_ready() {
  local i body
  for i in $(seq 1 120); do          # 120 × 0.5 s = 60 s; a cold FModel.initialize is ~10 s
    kill -0 "$SERVER_PID" 2>/dev/null || return 1
    body="$(health_body)"
    case "$body" in
      ok*) return 0 ;;
    esac
    sleep 0.5
    [ $((i % 10)) -eq 0 ] && printf '.'
  done
  return 2
}

say "waiting for GET http://127.0.0.1:$WS_PORT/health"
READY=0
wait_ready || READY=$?
if [ "$READY" = "1" ]; then
  server_tail 30 >&2
  die "the bridge exited before it was ready (full log: $SERVER_LOG)"
fi
[ "$READY" = "0" ] || { server_tail 30 >&2; die "no /health after 60 s (full log: $SERVER_LOG)"; }
echo "ready"

# --------------------------------------------------------------------------
# 4a: the coach helper (D292) -- after /health, because --lan's token is the
#     bridge's and is only in its log once it is ready
# --------------------------------------------------------------------------

http_get() {   # print the body of a GET, or nothing
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "$1" 2>/dev/null || true
  else
    node -e 'fetch(process.argv[1]).then(r => r.text()).then(t => process.stdout.write(t)).catch(() => {});' "$1" 2>/dev/null || true
  fi
}
NO_COACH_TAIL="ForgeCoach will ask for an API key or offer Copy prompt"
COACH_LINE=""
MATCH_LINE=""
lan_token_from_log() {   # the bridge's pairing token, from its own phone-URL line
  local token="" _
  for _ in $(seq 1 20); do
    token="$(sed -n 's/^WS LAN \(PAGE\|SEAT\)  .*[?&]token=\([A-Za-z0-9_-]*\).*/\2/p' "$SERVER_LOG" | head -1)"
    [ -n "$token" ] && break
    sleep 0.25
  done
  printf '%s' "$token"
}
start_coach() {
  local url="http://127.0.0.1:$COACH_PORT" body token="" has_claude=1
  if [ "$COACH" != "1" ]; then
    COACH_LINE="Coach: off (--no-coach) — $NO_COACH_TAIL"
    MATCH_LINE="Match launcher: off (--no-coach starts no coach helper)"; return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    COACH_LINE="Coach: node not found, so the coach helper cannot run — $NO_COACH_TAIL"
    MATCH_LINE="Match launcher: off (node not found)"; return 0
  fi
  command -v claude >/dev/null 2>&1 || has_claude=0
  # D303: without claude the helper still runs, for /match; with --no-match too, nothing to run.
  # D400: and for the draft room.
  if [ "$has_claude" = "0" ] && [ "$MATCH" != "1" ] && [ "$DRAFT_ROOM" != "1" ]; then
    COACH_LINE="Coach: claude CLI not found — $NO_COACH_TAIL"
    MATCH_LINE="Match launcher: off (--no-match)"; return 0
  fi
  body="$(http_get "$url/health")"
  case "$body" in
    *'"helper":1'*)
      case "$body" in
        *'"ok":true'*) COACH_LINE="Coach: Claude Code on this PC (no API key needed) — $url (a helper already running there)" ;;
        *) COACH_LINE="Coach: claude CLI not found or not working (the helper already running at $url says so) — $NO_COACH_TAIL" ;;
      esac
      MATCH_LINE="Match launcher: the helper already running at $url belongs to another play.sh — its /match restarts THAT engine, not this one"
      [ "$DRAFT_ROOM" = "1" ] && ROOM_LINE="Draft room: the helper already running at $url belongs to another play.sh — its draft room is that one's (started with --draft-room?)"
      return 0 ;;
  esac
  local args=(--port "$COACH_PORT")
  if [ "$LAN" = "1" ]; then
    # The bridge's token, read from its own phone-URL line; it reaches the
    # helper in the environment so it never shows in `ps`.
    token="$(lan_token_from_log)"
    [ -n "$token" ] && args+=(--lan --ws-port "$WS_PORT")
  fi
  # D303: the match launcher -- the helper writes var/match/ and signals this script.
  [ "$MATCH" = "1" ] && args+=(--match-dir "$MATCH_DIR" --supervisor "$$")
  [ "$MATCH" = "1" ] && rm -f "$MATCH_DIR/engine.json" 2>/dev/null
  # D361: the win chance -- the helper loads var/ml/models/night-1-eval.json by itself when it exists.
  [ "${#EVAL_ARGS[@]}" -gt 0 ] && args+=("${EVAL_ARGS[@]}")
  # D400: the draft room, on its own port, with the site.
  if [ "$DRAFT_ROOM" = "1" ]; then
    args+=(--draft-room --room-port "$ROOM_PORT")
    [ -n "$ROOM_PUBLIC_URL" ] && args+=(--room-public-url "$ROOM_PUBLIC_URL")   # D408: the "Over the internet" link
    [ -n "$ROOM_SITE" ] && args+=(--room-site-dir "$ROOM_SITE")
    [ -n "$FAKE_ENGINE" ] && [ -n "${MTGTABLE_TEST_VAR:-}" ] && args+=(--room-dir "$MTGTABLE_TEST_VAR/draft-room")
  fi
  # D385: the automatic review (config.json coach.autoReview) -- never under a self-test's fake engine,
  # whose helper would otherwise queue the real var/games/ (as D369's collector is skipped there).
  [ -n "${MTGTABLE_TEST_FAKE_ENGINE:-}" ] && args+=(--no-auto-review)
  : > "$COACH_LOG"
  COACH_HELPER_TOKEN="$token" node tools/coach-helper.mjs "${args[@]}" >>"$COACH_LOG" 2>&1 &
  COACH_PID=$!
  for _ in $(seq 1 40); do          # 40 x 0.25 s; it answers in well under a second
    kill -0 "$COACH_PID" 2>/dev/null || break
    body="$(http_get "$url/health")"
    [ -n "$body" ] && break
    sleep 0.25
  done
  case "$body" in
    *'"ok":true'*)
      COACH_LINE="Coach: Claude Code on this PC (no API key needed) — $url"
      if [ "$LAN" = "1" ]; then
        if [ -n "$token" ]; then COACH_LINE="$COACH_LINE (and from the phone, with the same token)"
        else COACH_LINE="$COACH_LINE (this machine only: no LAN token in $SERVER_LOG)"; fi
      fi ;;
    *'"ok":false'*)
      if [ "$has_claude" = "0" ]; then COACH_LINE="Coach: claude CLI not found — $NO_COACH_TAIL"
      else COACH_LINE="Coach: the claude CLI is there but not working ($(printf '%s' "$body" | sed -n 's/.*"error":"\([^"]*\)".*/\1/p')) — $NO_COACH_TAIL"; fi ;;
    *)
      COACH_LINE="Coach: the coach helper did not start ($(tail -1 "$COACH_LOG" 2>/dev/null)) — $NO_COACH_TAIL"
      MATCH_LINE="Match launcher: off (the coach helper did not start)"
      kill "$COACH_PID" 2>/dev/null || true
      COACH_PID=""
      return 0 ;;
  esac
  if [ "$DRAFT_ROOM" = "1" ]; then
    case "$body" in
      *'"draftRoom":1'*) ROOM_LINE="Draft room: on — ForgeCoach → Draft → Draft with a friend makes a room and shows your friend's link; players use port $ROOM_PORT$(if [ -n "$TUNNEL_URL" ]; then echo " (this machine only; your friend comes through the tunnel at $TUNNEL_URL)"; elif [ "$LAN" = "1" ] && [ -n "$token" ]; then echo " (and from your Wi-Fi)"; else echo " (this machine only: add --lan for a friend on your Wi-Fi)"; fi)$([ -n "$ROOM_SITE" ] || echo "; NO site to serve, so the friend has no page")" ;;
      *) ROOM_LINE="Draft room: did not start ($(grep -m1 'room' "$COACH_LOG" 2>/dev/null || tail -1 "$COACH_LOG" 2>/dev/null))" ;;
    esac
  fi
  if [ "$MATCH" = "1" ]; then
    MATCH_ON=1
    MATCH_LINE="Match launcher: ForgeCoach's Play this match restarts this engine on its decks — POST $url/match (D303)"
  else
    MATCH_LINE="Match launcher: off (--no-match)"
  fi
}
[ "$LAN" = "1" ] && LAN_TOKEN="$(lan_token_from_log)"   # D303: a restart keeps it
start_coach

# --------------------------------------------------------------------------
# 4a': the match launcher's restart (D303; the header's MATCH LAUNCHER)
# --------------------------------------------------------------------------

CUR_MATCH_ID="play.sh"
LAST_REQ_ID=""                   # the helper re-signals until it sees its id; once is enough
# match_write status ID STATE [ERROR] [RESTORED] | match_write current ID
# -- var/match/status.json or current.json, written whole and renamed into place;
# "ready" and "current" carry the match as the bridge's own log says it loaded it.
match_write() {
  mkdir -p "$MATCH_DIR"
  node -e '
    const fs = require("fs"), path = require("path");
    const [kind, dir, log, root, id, state, error, restored] = process.argv.slice(1);
    const lines = (() => { try { return fs.readFileSync(log, "utf8").split("\n"); } catch { return []; } })();
    const last = (re) => { let v = null; for (const l of lines) { const m = re.exec(l); if (m) v = m; } return v; };
    const loaded = () => {
      const you = last(/^deck you\s+= (.*) \((\d+) cards\)\s*$/), ai = last(/^deck ai\s+= (.*) \((\d+) cards\)\s*$/);
      const prof = last(/^ai profile\s+= (\S+)/), pol = last(/^ai policy\s+= (\S+)/), games = last(/^games\/match\s+= (\d+)/), p = last(/^deck \(you\)\s+= (.*?)\s*$/);
      const seed = last(/^seed\s+= (-?\d+)\s*$/);   // D384: the shuffle the engine dealt (a caller --seed may be negative)
      // D404: a game between two people names both decks by seat and the table port, and no AI.
      if (last(/^table\s+= two people/)) {
        const s0 = last(/^deck seat 0\s+= (.*) \((\d+) cards\)\s*$/), s1 = last(/^deck seat 1\s+= (.*) \((\d+) cards\)\s*$/);
        const tp = last(/^TABLE LISTENING ws:\/\/[^:]+:(\d+)\/ws/);
        return {
          humans: 2,
          seats: [s0, s1].map((x) => (x ? { name: x[1], cards: Number(x[2]) } : null)),
          tablePort: tp ? Number(tp[1]) : null, games: 1,
          seed: seed && Number.isSafeInteger(Number(seed[1])) ? Number(seed[1]) : null,
        };
      }
      let rel = p ? p[1] : null;
      if (rel && rel.startsWith(root + path.sep)) rel = rel.slice(root.length + 1);
      return {
        yourDeck: you ? { name: you[1], path: rel, cards: Number(you[2]) } : null,
        aiDeck: ai ? { name: ai[1], cards: Number(ai[2]) } : null,          // M44: a name and a count, never a list
        aiProfile: prof ? prof[1] : null, games: games ? Number(games[1]) : null,
        aiPolicy: pol ? pol[1] : prof ? "plain" : null,   // D333: the bridge prints no policy line for plain
        seed: seed && Number.isSafeInteger(Number(seed[1])) ? Number(seed[1]) : null,
      };
    };
    const o = kind === "current" ? { id, match: loaded(), at: new Date().toISOString() } : { id, state };
    if (kind === "status") {
      if (error) o.error = error;
      if (restored) o.restored = restored === "1";
      if (state === "ready") o.match = loaded();
    }
    const f = path.join(dir, kind + ".json");
    fs.writeFileSync(f + ".tmp", JSON.stringify(o) + "\n");
    fs.renameSync(f + ".tmp", f);
  ' "$1" "$MATCH_DIR" "$SERVER_LOG" "$REPO_ROOT" "$2" "${3:-}" "${4:-}" "${5:-}" || echo "play.sh: could not write $MATCH_DIR/$1.json" >&2
}
[ "$MATCH_ON" = "1" ] && match_write current "$CUR_MATCH_ID"

# engine_write running|idle [REASON] -- var/match/engine.json, what the helper's
# /health and GET /match say about the engine (D308).  "idle" carries when play.sh
# will give up waiting ("exitsAt", null for never).
engine_write() {
  [ "$MATCH_ON" = "1" ] || return 0
  mkdir -p "$MATCH_DIR"
  node -e '
    const fs = require("fs"), path = require("path");
    const [dir, state, reason, exitSec, sinceS] = process.argv.slice(1);
    const now = Date.now(), o = { state, at: new Date(now).toISOString() };
    if (state === "idle") {
      o.reason = reason;
      o.exitsAt = Number(exitSec) > 0 ? new Date(now + Number(exitSec) * 1000).toISOString() : null;
    }
    const f = path.join(dir, "engine.json");
    fs.writeFileSync(f + ".tmp", JSON.stringify(o) + "\n");
    fs.renameSync(f + ".tmp", f);
  ' "$MATCH_DIR" "$1" "${2:-}" "$IDLE_EXIT_SEC" "$IDLE_SINCE_S" || echo "play.sh: could not write $MATCH_DIR/engine.json" >&2
}
engine_write running

restart_match() {
  MATCH_PENDING=0
  local req=() id rc why tail_txt was_idle="$IDLE" wake=0
  # The request, read back and checked again: nothing the browser sent reaches
  # a command line but these five checked words.
  mapfile -t req < <(node -e '
    const fs = require("fs");
    let r; try { r = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { console.log("BAD"); console.log(""); console.log("unreadable request: " + e.message); process.exit(0); }
    const id = typeof r.id === "string" && /^m[0-9]{13}$/.test(r.id) ? r.id : "";
    const bad = (why) => { console.log("BAD"); console.log(id); console.log(why); process.exit(0); };
    if (!id) bad("no request id");
    if (r.wake === true) {   // D308 /engine/start; D381: an optional profile, a .ai name; D384: an optional seed
      if (r.aiProfile !== undefined && (typeof r.aiProfile !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(r.aiProfile))) bad("not a profile name");
      if (r.seed !== undefined && (!Number.isSafeInteger(r.seed) || r.seed < 0)) bad("seed is not a non-negative safe integer");
      for (const x of ["WAKE", id, "", "", r.aiProfile ?? "", "", "", "", r.seed === undefined ? "" : String(r.seed)]) console.log(x);
      process.exit(0);
    }
    const dir = process.argv[2];
    if (r.humans === 2) {   // D404: a game between two people -- three files of ours, one game
      if (r.deck !== `${dir}/${id}/seat0.dck` || r.deck2 !== `${dir}/${id}/seat1.dck` || r.seats !== `${dir}/${id}/seats.json`) bad("table paths are not <match dir>/<id>/seat0.dck, seat1.dck and seats.json");
      if (r.games !== 1) bad("a table plays one game");
      for (const x of ["TABLE", id, r.deck, r.deck2, r.seats]) console.log(x);
      process.exit(0);
    }
    if (r.humans !== undefined) bad("humans is 2 or absent");
    if (r.deck !== `${dir}/${id}/you.dck` || r.aiDeck !== `${dir}/${id}/ai.dck`) bad("deck paths are not <match dir>/<id>/you.dck and ai.dck");
    if (typeof r.aiProfile !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(r.aiProfile)) bad("not a profile name");
    if (!Number.isInteger(r.games) || r.games < 1 || r.games > 9) bad("games is not 1-9");
    // D333: the AI policy and the search budget, both optional.
    if (r.aiPolicy !== undefined && !["plain", "outlets", "search"].includes(r.aiPolicy)) bad("aiPolicy is not plain, outlets or search");
    if (r.aiSearchMs !== undefined && (r.aiPolicy !== "search" || !Number.isInteger(r.aiSearchMs) || r.aiSearchMs < 500 || r.aiSearchMs > 5000)) bad("aiSearchMs is not 500-5000 with the search policy");
    for (const x of ["OK", id, r.deck, r.aiDeck, r.aiProfile, String(r.games), r.aiPolicy ?? "", r.aiSearchMs === undefined ? "" : String(r.aiSearchMs)]) console.log(x);
  ' "$MATCH_DIR/request.json" "$MATCH_DIR" 2>/dev/null) || true
  [ "${req[0]:-}" = "WAKE" ] && wake=1
  local table=0 prev_table="$CUR_IS_TABLE"
  [ "${req[0]:-}" = "TABLE" ] && table=1
  if [ "${req[0]:-}" != "OK" ] && [ "$wake" = "0" ] && [ "$table" = "0" ]; then
    echo "match launcher: request refused: ${req[2]:-no answer from node}" >&2
    [ -n "${req[1]:-}" ] && match_write status "${req[1]}" failed "play.sh refused the request: ${req[2]:-}" 1
    return 0
  fi
  id="${req[1]}"
  [ "$id" = "$LAST_REQ_ID" ] && return 0
  LAST_REQ_ID="$id"
  MATCH_PENDING=1   # look once more when this one is done: USR1 is ignored until then
  if [ "$wake" = "1" ] && [ "$IDLE" != "1" ]; then
    # D308: /engine/start while an engine runs (the helper checks too; this is the race).
    match_write status "$id" ready
    return 0
  fi
  if [ "$table" = "1" ]; then
    [ -f "${req[2]}" ] && [ -f "${req[3]}" ] && [ -f "${req[4]}" ] || { match_write status "$id" failed "the table's files are missing" 1; return 0; }
    say "match $id — a game between the two drafters (D402, D404): restarting the engine with two seats"
  elif [ "$wake" = "0" ]; then
    [ -f "${req[2]}" ] && [ -f "${req[3]}" ] || { match_write status "$id" failed "the deck files are missing" 1; return 0; }
    say "match $id — restarting the engine on ForgeCoach's decks (D303)"
  else
    say "match $id — waking the engine on the last match setup (D308, POST /engine/start)${req[4]:+, AI profile ${req[4]} (D381)}${req[8]:+, seed ${req[8]} (D384)}"
  fi
  match_write status "$id" restarting
  local prev=("${BRIDGE_ARGS[@]}") pass=() skip=0 a
  # Everything after the class as before, but the request's decks, profile and games
  # (and, D333, its AI policy when it names one: then it replaces --ai-policy/--ai-search).
  local pol="${req[6]:-}" sms="${req[7]:-}"
  for a in "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}"; do
    if [ "$skip" = "1" ]; then skip=0; continue; fi
    case "$a" in
      --deck|--deck2|--ai-deck|--ai-profile|--games|--game-id) skip=1 ;;
      --deck=*|--deck2=*|--ai-deck=*|--ai-profile=*|--games=*|--game-id=*) : ;;
      --ai-policy|--ai-search) if [ -n "$pol" ]; then skip=1; else pass+=("$a"); fi ;;
      *) pass+=("$a") ;;
    esac
  done
  if [ -n "$pol" ]; then
    pass+=(--ai-policy "$pol")
    [ -n "$sms" ] && pass+=(--ai-search "ms=$sms")
  fi
  local next=()
  if [ "$wake" = "1" ]; then
    # The last setup as it was (the previous match's decks, or the startup ones),
    # but a game id of its own, for the same reason as below -- and, D381, the
    # request's AI profile when it names one (then it replaces --ai-profile, and
    # stays the last setup's from here on).  D384: and a shuffle of its own -- the
    # request's seed, else a --seed play.sh was started with (as /match keeps it),
    # else a fresh random one: never the last wake's seed again.
    local wprof="${req[4]:-}" wseed="${req[8]:-}"
    skip=0
    for a in "${LAST_AI_ARGS[@]}"; do   # D404: the last match against the AI, never a table
      if [ "$skip" = "1" ]; then skip=0; continue; fi
      case "$a" in
        --game-id|--seed) skip=1 ;;
        --game-id=*|--seed=*) : ;;
        --ai-profile) if [ -n "$wprof" ]; then skip=1; else next+=("$a"); fi ;;
        --ai-profile=*) [ -n "$wprof" ] || next+=("$a") ;;
        *) next+=("$a") ;;
      esac
    done
    [ -n "$wprof" ] && next+=(--ai-profile "$wprof")
    if [ -z "$wseed" ] && passthrough_has --seed; then
      skip=0
      for a in "${PASSTHROUGH[@]}"; do
        if [ "$skip" = "1" ]; then skip=0; wseed="$a"; continue; fi
        case "$a" in --seed) skip=1 ;; --seed=*) wseed="${a#--seed=}" ;; esac
      done
    fi
    next+=(--seed "${wseed:-$(( (RANDOM << 15 | RANDOM) % 100000 ))}")
    next+=(--game-id "match-$id")
  elif [ "$table" = "1" ]; then
    # D402/D404: two people, no AI.  Only the table's own knobs pass through (a caller's
    # --decision-timeout, --seat-grace, --idle-timeout, --table-origin, --seed); no site:
    # the friend's page is the draft room's.
    next=(--transport ws --port "$WS_PORT" --humans 2 --deck "${req[2]}" --deck2 "${req[3]}" --seats-file "${req[4]}"
          --table-port "$TABLE_PORT" --games 1 --game-id "friend-$id")
    [ "$KEEP_OPEN" = "1" ] && next+=(--keep-open)
    [ "$LAN" = "1" ] && next+=(--lan)
    skip=0
    local keepnext=0
    for a in "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}"; do
      if [ "$keepnext" = "1" ]; then keepnext=0; next+=("$a"); continue; fi
      case "$a" in
        --decision-timeout|--seat-grace|--idle-timeout|--table-origin|--seed) next+=("$a"); keepnext=1 ;;
      esac
    done
    passthrough_has --seed || next+=(--seed "$(( (RANDOM << 15 | RANDOM) % 100000 ))")
  else
    next=(--transport ws --port "$WS_PORT" --deck "${req[2]}" --ai-deck "${req[3]}" --ai-profile "${req[4]}")
    [ "$KEEP_OPEN" = "1" ] && next+=(--keep-open)
    # Its own game id: with a --seed the bridge's default id would repeat, and a
    # client reads a repeated gameId as a reconnect (§2.1), not a new match.
    next+=(--games "${req[5]}" --game-id "match-$id" "${SITE_ARGS[@]+"${SITE_ARGS[@]}"}" "${pass[@]+"${pass[@]}"}")
    # And a seed of its own unless the caller gave one (then it is in pass): without
    # one the bridge's is 0, the same shuffle for every match on the same decks.
    passthrough_has --seed || next+=(--seed "$(( (RANDOM << 15 | RANDOM) % 100000 ))")
  fi

  # Never two engines: the old one is gone, and its port quiet, before the next starts.
  if [ "$was_idle" = "1" ]; then echo "the engine was asleep (D308) — starting it on the new decks"
  else echo "stopping the bridge (pid $SERVER_PID)"; fi
  stop_bridge
  SERVER_PID=""
  for _ in $(seq 1 20); do [ -z "$(health_body)" ] && break; sleep 0.25; done
  if [ -n "$(health_body)" ]; then
    match_write status "$id" failed "port $WS_PORT still answers after the bridge stopped — another engine is on it" 0
    die "port $WS_PORT still answers after the bridge stopped — another engine is on it"
  fi
  cp -f "$SERVER_LOG" "$PLAY_VAR/server.prev.log" 2>/dev/null || true
  : > "$SERVER_LOG"
  start_bridge "${next[@]}"
  echo "pid $SERVER_PID · log $SERVER_LOG"
  rc=0; wait_ready || rc=$?
  if [ "$rc" = "0" ]; then
    BRIDGE_ARGS=("${next[@]}")
    CUR_IS_TABLE="$table"
    [ "$table" = "1" ] || LAST_AI_ARGS=("${next[@]}")
    IDLE=0
    engine_write running
    CUR_MATCH_ID="$id"
    match_write current "$id"
    match_write status "$id" ready
    if [ "$table" = "1" ]; then
      echo "ready — a game between two people on the table port $TABLE_PORT: $(sed -n 's/^deck seat 0 *= //p' "$SERVER_LOG" | tail -1) · $(sed -n 's/^deck seat 1 *= //p' "$SERVER_LOG" | tail -1)"
    else
      echo "ready — you: $(sed -n 's/^deck you *= //p' "$SERVER_LOG" | tail -1) · AI: $(sed -n 's/^deck ai *= //p' "$SERVER_LOG" | tail -1)"
    fi
    return 0
  fi
  [ "$rc" = "1" ] && why="the bridge exited before it was ready" || why="no /health after 60 s"
  tail_txt="$(tail -8 "$SERVER_LOG" | sed 's/token=[A-Za-z0-9_-]*/token=…/g' | tr '\n' ' ')"
  if [ "$was_idle" = "1" ] || [ "$prev_table" = "1" ]; then
    # D308: nothing to put back -- the previous match was over.  Stay asleep.
    # D404: nor when it was a game between two people (its seats are spent).
    echo "$why — the engine stays asleep (this log: $PLAY_VAR/server.failed.log)" >&2
    stop_bridge
    SERVER_PID=""
    cp -f "$SERVER_LOG" "$PLAY_VAR/server.failed.log" 2>/dev/null || true
    if [ "$was_idle" != "1" ]; then
      IDLE=1
      IDLE_SINCE_S=$SECONDS
      CUR_IS_TABLE=0
      rm -f "$MATCH_DIR/current.json" 2>/dev/null || true
      engine_write idle "a game between two people did not start"
    fi
    match_write status "$id" failed "$why: $tail_txt" 0
    return 0
  fi
  echo "$why — starting the previous match again (this log: $PLAY_VAR/server.failed.log)" >&2
  stop_bridge
  SERVER_PID=""
  cp -f "$SERVER_LOG" "$PLAY_VAR/server.failed.log" 2>/dev/null || true
  : > "$SERVER_LOG"
  start_bridge "${prev[@]}"
  rc=0; wait_ready || rc=$?
  if [ "$rc" = "0" ]; then
    match_write current "$CUR_MATCH_ID"
    match_write status "$id" failed "$why: $tail_txt" 1
    echo "the previous match is running again (pid $SERVER_PID)"
    return 0
  fi
  match_write status "$id" failed "$why: $tail_txt (and the previous match did not start again)" 0
  server_tail 30 >&2
  die "neither the new match nor the previous one started (logs: $PLAY_VAR/server.failed.log, $SERVER_LOG)"
}

# --------------------------------------------------------------------------
# 4b: --engine-only stops here and waits (D285)
# --------------------------------------------------------------------------

if [ "$ENGINE_ONLY" = "1" ]; then
  # `wait` is interrupted at once by a trapped signal, unlike a sleep loop.  The
  # terminal's Ctrl-C also reaches the JVM (same process group); either order ends
  # here, with stop() reaping whatever is left.
  on_signal() { printf '\nsignal received\n'; stop; exit 0; }
  trap on_signal INT TERM
  say "engine"
  printf 'Engine ready on ws://127.0.0.1:%s/ws — open https://jalirkan.github.io/ForgeCoach/ and click Play\n' "$WS_PORT"
  echo "  (observers: ws://127.0.0.1:$WS_PORT/observe · log: $SERVER_LOG · Ctrl-C stops it)"
  echo "  keep every mtg-table board tab closed: the first /ws client takes the seat"
  echo "$COACH_LINE"
  echo "$MATCH_LINE"
  [ -n "$ROOM_LINE" ] && echo "$ROOM_LINE"
  if [ -n "$TUNNEL_URL" ]; then
    # D408: every door as the tunnel reaches it, now that they listen; a FAIL stops everything.
    say "tunnel-check (the doors): $TUNNEL_HOST"
    if ! tunnel_check "a door"; then stop; exit 1; fi
    say "tunnel — your friend, over the internet"
    case "$ROOM_LINE" in
      'Draft room: on'*) : ;;
      *) echo "  the draft room is not running here, so there is nothing to send yet (see the Draft room line above)" ;;
    esac
    echo "  1. Start the tunnel in another terminal, if it is not running:  cloudflared tunnel run <your tunnel>"
    echo "  2. Send your friend $TUNNEL_URL/ FIRST. They sign in there with their email and the PIN Cloudflare sends."
    echo "     (That sign-in drops everything after # in a link, so a join link opened first would land on the start page.)"
    echo "  3. Make the room: https://jalirkan.github.io/ForgeCoach/ (or http://127.0.0.1:$ROOM_PORT/) → Draft → Draft with a friend → Create room."
    echo "     Then send them the \"Over the internet\" link it shows ($TUNNEL_URL/#draft/friend/join?…), privately, to open in the same browser."
    echo "  Revoke: that room's page has \"New link for your friend\" (the old link stops working) and \"Close room\"; Ctrl-C cloudflared shuts everyone out at once."
    echo "  Run the outside check from another network before you send anything:  ./scripts/tunnel/tunnel-check.sh $TUNNEL_HOST"
  fi
  if [ "$LAN" = "1" ]; then
    # The bridge prints one `WS LAN PAGE` line per address, best guess first,
    # just after the readiness flip; give it a moment to land in the log.
    PAGES=()
    for _ in $(seq 1 20); do
      mapfile -t PAGES < <(sed -n 's/^WS LAN PAGE  //p' "$SERVER_LOG")
      [ "${#PAGES[@]}" -gt 0 ] && break
      sleep 0.25
    done
    # The page ForgeCoach serves from the bridge finds the coach helper on its
    # own host at 8643; a helper elsewhere (--coach-port, config.json coachPort)
    # is named in the link, `&coachPort=<n>`, which ForgeCoach's helperTarget
    # reads.  Absent means 8643, so a default run's link is unchanged.
    if [ "$COACH_PORT" != "8643" ]; then
      for i in "${!PAGES[@]}"; do PAGES[i]="${PAGES[i]}&coachPort=$COACH_PORT"; done
    fi
    say "LAN — open this on your phone (same Wi-Fi), then click Play"
    if [ "${#PAGES[@]}" -eq 0 ]; then
      echo "  no non-loopback IPv4 address found -- is this machine on a network? (log: $SERVER_LOG)"
    else
      echo "  ${PAGES[0]}"
      [ "${#PAGES[@]}" -gt 1 ] && echo "  other addresses of this machine, if that one does not load:"
      for u in "${PAGES[@]:1}"; do echo "    $u"; done
      if command -v qrencode >/dev/null 2>&1; then
        echo
        qrencode -t ANSIUTF8 -m 2 "${PAGES[0]}" || true
      fi
    fi
    echo "  this desktop needs no token: http://127.0.0.1:$WS_PORT/ or https://jalirkan.github.io/ForgeCoach/"
    if [ "$DRAFT_ROOM" = "1" ] && [ "${#PAGES[@]}" -gt 0 ]; then
      # D400: the room listener on the same addresses; the page you draft from shows the friend's full link.
      echo "  draft room: a friend on this Wi-Fi joins at $(printf '%s' "${PAGES[0]}" | sed 's#^\(http://[^/]*\):[0-9]*/.*#\1#'):$ROOM_PORT/ (the link from Draft with a friend carries their seat)"
    fi
    echo "  the token is the only lock -- for a home network you trust; the next run has a new one"
  fi
  SERVER_RC=0
  while :; do
    # D303: a SIGUSR1 from the match launcher interrupts the wait (the bridge
    # is still running), or arrived while the last restart was finishing;
    # anything else is the bridge's own exit.
    if [ "$MATCH_PENDING" = "1" ]; then restart_match; continue; fi
    if [ "$IDLE" = "1" ]; then
      # D308: asleep.  A second at a time, so SIGUSR1 (match request) and
      # INT/TERM are taken at once, and the --idle-exit-after limit is checked.
      if [ "$IDLE_EXIT_SEC" -gt 0 ] && [ $((SECONDS - IDLE_SINCE_S)) -ge "$IDLE_EXIT_SEC" ]; then IDLE_EXPIRED=1; break; fi
      sleep 1 &
      usr1_on; wait $! 2>/dev/null || true; usr1_off
      continue
    fi
    SERVER_RC=0
    usr1_on; wait "$SERVER_PID" || SERVER_RC=$?; usr1_off
    [ "$MATCH_PENDING" = "1" ] && continue
    kill -0 "$SERVER_PID" 2>/dev/null && continue
    if [ "$MATCH_ON" = "1" ]; then
      # D308: with the match launcher on, the bridge ending (its match is over and
      # the linger closed, D286's idle limit, or a crash) must not take the helper
      # with it: a draft takes longer than either limit.  No JVM runs while asleep.
      say "the bridge exited ($SERVER_RC) — its last lines:"
      server_tail 20
      SERVER_PID=""
      IDLE=1
      IDLE_SINCE_S=$SECONDS
      CUR_IS_TABLE=0
      rm -f "$MATCH_DIR/current.json" 2>/dev/null || true
      engine_write idle "the engine exited with $SERVER_RC"
      human_collect   # D369: the match that just ended
      if [ "$IDLE_EXIT_SEC" -gt 0 ]; then
        echo "engine asleep: play.sh and the coach helper stay up; a match request from ForgeCoach starts it again; play.sh exits after $IDLE_EXIT_MIN min with none (--idle-exit-after, 0 = never)"
      else
        echo "engine asleep: play.sh and the coach helper stay up; a match request from ForgeCoach starts it again (--idle-exit-after 0: no limit)"
      fi
      continue
    fi
    break
  done
  if [ "$IDLE_EXPIRED" = "1" ]; then
    say "no match request for $IDLE_EXIT_MIN min (--idle-exit-after) — stopping"
    stop
    exit 0
  fi
  say "the bridge exited ($SERVER_RC) — its last lines:"
  server_tail 20
  stop
  exit "$SERVER_RC"
fi

# --------------------------------------------------------------------------
# 5: the board
# --------------------------------------------------------------------------

URL="http://127.0.0.1:$WEB_PORT/?ws=1"
[ "$WS_PORT" = "8642" ] || URL="$URL&port=$WS_PORT"
# The hash is the view (web/src/useView.ts), so it goes LAST and survives a
# bookmark, a reload and the Back button.
[ "$ARENA" = "1" ] && URL="$URL#arena"

say "$([ "$ARENA" = "1" ] && echo "arena" || echo "board") — $URL"
echo "$COACH_LINE"
echo "$MATCH_LINE"
[ -n "$ROOM_LINE" ] && echo "$ROOM_LINE"
cat <<EOF
  Space  press the button the engine FOCUSED (input.buttons.focus, amendment
         M39 — its label is Forge's: OK / Auto / …). "Space = OK" was never a
         Forge shortcut.
  Esc    press the engine's Cancel button  (… / Undo (2) / End Turn)
  E T B  pass to end of turn / my next turn / just before my turn (act: yieldTo)
  P      pass priority          CTRL+Z  undo the last mana ability
  Y N    always yes / always no for the ability on top of the stack
  V      board <-> 3D arena (M7) -- the same game, two renderers, one state
  K      skip every animation playing in the arena
  H      the full key table, rendered from the one keymap
  click  any card, any player name — Forge judges the click (protocol §4.1, M8)
  the bridge plays the whole match and then waits for New Game for as long as
  this browser stays connected; Ctrl-C stops both halves.
EOF

# vite DIRECTLY, not `npm run dev`.  Contract (e) says Ctrl-C stops both halves,
# and through npm it did not: $! was the npm WRAPPER, and the vite process npm
# spawned was reparented and kept listening after this script returned 0
# (measured: pid 476167 `node .../vite --port 5173`, PPID 2432, still LISTENing
# on 127.0.0.1:5173 with the bridge already gone).  `env -C web` execs the
# binary, so the pid this script holds IS the server -- `npm run dev` is
# literally `vite`, so nothing else is lost.
VITE_BIN="$REPO_ROOT/web/node_modules/.bin/vite"
[ -x "$VITE_BIN" ] || die "$VITE_BIN is missing or not executable — run: npm --prefix web install"
VITE_ARGS=(--port "$WEB_PORT")
if [ "$OPEN" = "1" ]; then
  OPEN_PATH="/?ws=1$([ "$WS_PORT" = "8642" ] || printf '&port=%s' "$WS_PORT")"
  [ "$ARENA" = "1" ] && OPEN_PATH="$OPEN_PATH#arena"
  VITE_ARGS+=(--open "$OPEN_PATH")
fi
env -C "$REPO_ROOT/web" "$VITE_BIN" "${VITE_ARGS[@]}" &
VITE_PID=$!

# Whichever half stops first takes the other with it: a dead bridge leaves a
# board with nothing to talk to, and a closed browser means the game is over.
while kill -0 "$VITE_PID" 2>/dev/null; do
  [ "$MATCH_PENDING" = "1" ] && restart_match   # D303
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    say "the bridge exited — its last lines:"
    server_tail 20
    break
  fi
  usr1_on; sleep 1; usr1_off
done

stop
