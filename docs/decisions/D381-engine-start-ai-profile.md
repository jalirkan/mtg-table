## D381 — `POST /engine/start` takes an optional `{"aiProfile"}`: plain Play vs Forge picks the AI's profile without naming a deck

*Branch `c/engine-start-profile`.* Amends D308.

**2026-10-04**

**Context.** ForgeCoach's plain **Play vs Forge** wakes a sleeping engine with
`POST /engine/start` (D308), which took no body and restarted the last match
setup: the last `POST /match`'s decks, profile and games, or `play.sh`'s
startup ones. The only way to choose the AI's profile was `POST /match`
(D303), which needs both full decklists. ForgeCoach must not have the AI's
list (hidden information, M44), so plain play could not offer the profile
picker its Setup screen already has for a drafted match.

**Decision.**

- `POST /engine/start` takes an **optional JSON body `{"aiProfile"}`**, one
  of the engine's `.ai` profiles, any case, checked by the same
  `profileOf` / `readProfiles` as `/match`'s `aiProfile`
  (`tools/match-launcher.mjs` `checkWake`). The wake request carries it to
  `play.sh` (`{"v","id","wake":true,"aiProfile"}`), which re-checks it as a
  profile name and, on the wake, replaces the last setup's `--ai-profile`
  with it. Every other flag (decks, games, seed, policy, `--lan`, the
  passthrough) is the last setup's, and the game id is the wake's own.
- **The profile becomes the last setup's.** A later wake with no body plays
  it again, as any part of the last setup is replayed; a `POST /match` or
  another profile replaces it. Remembering it outside the setup would make a
  second, invisible setting.
- **No body, whitespace, `{}` or unknown keys: exactly D308's wake.** A
  body that is not JSON, not an object, or names an unknown profile is a 400
  with `problems` and starts nothing (before D381 any body was ignored; the
  only callers, ForgeCoach and `play.sh`'s second launch, send none).
- **A running engine is never restarted** by `/engine/start`: the reply is
  D308's `already: true`, plus `warnings` when the asked profile differs from
  the running match's.
- `/health` advertises it as `"engine_start_profile": 1` beside
  `"engine_start": 1`, so ForgeCoach sends a body only to a helper that reads
  it (an older one ignores the body and would play the old profile silently).
- Nothing about the decks is sent, written or returned beyond what D308
  already returned (names and counts, M44).

`docs/match-launcher.md` is the contract; `tools/match-launcher-selftest.mjs`
holds it end to end against the fake engine (the profile in any case, one
`--ai-profile` on the command line and every other flag kept, the profile
kept by the next bare wake, the 400s starting nothing, the running engine
untouched with its warning) and `checkWake` directly.

**Rejected.**

- *Let `/match` take a deck reference ("the last AI deck") instead of a
  list.* A second way to name decks, for one field.
- *Restart a running engine when the profile differs.* `/engine/start` is
  "make sure an engine runs"; dropping a live game for it would surprise the
  player. `/match` is the call that replaces a match.
- *Bump `engine_start` to 2.* A client that checks `=== 1` would lose plain
  play on a newer helper.
