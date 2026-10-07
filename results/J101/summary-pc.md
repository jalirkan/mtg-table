# J101 — Reckless baseline (the outside review's T5): plain summary (PC)
Done 21:09 on 2026-10-06 (about 5 h, the last 1.3 h under a CPU cap while Justin used the PC).
- Forge Reckless vs Forge Default: **no gain** — H0 after 808 games, Reckless scored 50.1%.
- search-v1 on Reckless vs search-v1 on Default: **no gain** — H0 after 392 games, 48.7%.
- search-v1 (Reckless) vs forge-default, 1,200 fixed games: **62.3%, +87.5 Elo**. search-v1 (Default) vs forge-default, 1,200 fixed games: **60.3% [58.2, 62.5], +73 Elo [+58, +89]**; 14.5% of searched decisions changed Forge's answer; budget fallbacks 13.8%; 0 engine errors, 0 timeouts.
Reading: the AI profile makes no measurable difference, with or without search; the search itself is worth about +70-90 Elo over plain Forge at the live budget.
