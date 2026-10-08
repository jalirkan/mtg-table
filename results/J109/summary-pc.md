# J109 — short table-only playtest, 3 best-of-three (PC summary, 2026-10-08 01:45 EDT)

**Done, exit 0.** Ran 21:40 → 00:59 EDT (3 h 18 m) in lane 2 on 3 cores, peak 0.86 GB per worker.
Full report: `report.md` / `report.json` here; frames and traces per game beside them; five finding PNGs.

## What happened
- **All three matches finished**, no game abandoned, 7 games in all: modern-era friend 2–0, pauper host 2–0,
  synergy friend 2–1. Games ran 12–77 turns, 470–2466 s each. 0 engine errors.
- **5 findings, 5 kinds, one each** (down from J107's 21 of 19 kinds on 10 games):
  1. `stack-mismatch` — the stack held 1 item but no stack panel showed (game 1.2, friend, turn 60).
  2. `control-not-clickable` — Play with Fire's control would not take a click within 6 s (game 1.2, host, turn 67).
  3. `unreachable-option` — cleanup-step discard to 7: the board offered no card to click, it sat in
     "Waiting for Sam…" (game 2.1, host, turn 23).
  4. `stuck` — engine waiting on the friend's seat at beginning of combat, board offered nothing (game 3.1, turn 12).
  5. `board-lag` (the new counter) — the board still showed input seq 4167 three seconds after the wire was at
     4175 (game 3.2, host, turn 33, declare attackers).
- J107's hangs (Falkenrath Noble target-player) and coach-blank did not recur; coach was off in this mode.

## My read
Much cleaner than J107, but not zero: the cleanup discard with no clickable card and the beginning-of-combat
stuck seat are the two that would bite a real friend game, since both leave a human staring at a board that
offers nothing. The verdict is the cloud's.
