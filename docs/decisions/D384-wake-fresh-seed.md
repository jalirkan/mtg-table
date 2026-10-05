## D384 — Every `POST /engine/start` deals a fresh shuffle; `{"seed"}` names one

*Branch `c/wake-seed`.* Amends D308 and D381.

**2026-10-04**

**Context.** A wake (D308) restarted the last match setup flag for flag,
`--seed` included, so every plain **Play vs Forge** on the same decks dealt the
same opening hands and draws. `POST /match` (D303) already gets a random seed
from `play.sh` unless `play.sh` was started with `--seed`.

**Decision.**

- **A wake gets a seed of its own**, by `/match`'s mechanism: `play.sh` drops
  the last setup's `--seed` and adds `--seed <random>` (the same
  `(RANDOM << 15 | RANDOM) % 100000`). A `--seed` `play.sh` was started with
  still holds for every wake, as it does for `/match`.
- **`{"seed": n}` in the body** (with or without D381's `aiProfile`) is that
  wake's shuffle instead, for tests and replays: a non-negative safe integer,
  else a 400 with `problems` that starts nothing (`checkWake`; `play.sh`
  re-checks it). It is not part of the last setup: the next bare wake is fresh.
  While an engine runs nothing restarts and `warnings` says the seed was not
  applied.
- **The seed is reported**: the 200 of a wake and of `/match` carries `seed`,
  read from the bridge's own `seed = n` line, the same number as
  `hello_ok.seed` and the session header (which already carried it).
  `/health` advertises `"engine_start_seed": 1`.

`docs/match-launcher.md` is the contract; `tools/match-launcher-selftest.mjs`
holds it against the fake engine (two bare wakes, two seeds, each echoed; an
explicit seed on the command line once and in the reply; bad seeds refused;
the running engine untouched with its warning).

**Rejected.**

- *A seed from the helper on every wake.* Two places would pick seeds; `play.sh`
  already owns that for `/match` and for its own start.
- *Keep the explicit seed as part of the last setup, like D381's profile.* A
  replay is one game; a later bare wake replaying it again is the bug this fixes.
