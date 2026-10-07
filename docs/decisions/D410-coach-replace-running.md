## D410 — The coach helper can end a RUNNING question by key: `"replaceRunning": true` beside `"supersedes"` ends the running question with that key and kills its `claude`, so one key holds at most one question; each answer's log line carries its prompt size, queue wait, first text and total

*Branch `c/helper-coach-latency`.* This amends D325 (a running question was never superseded) and adds to D292's log line. ForgeCoach's side is its live-coach change (auto-coach plans the next turn once per turn cycle, short answers).

**2026-10-07**

**Context.** The owner reported that, with auto-coach on, answers got slower
every turn until they took about a minute late in a game, and that a stopped
answer left an empty coach panel on the opponent's turn. Measured on
ForgeCoach's recorded games through this helper with the real CLI (Claude Code
2.1.292, Opus, as ForgeCoach's default, `thinking` default):

| turn | prompt | first text | total |
|---|---|---|---|
| 1 | 6.3 KB | 3.1 s | 10.1 s |
| 9 | 9.1 KB | 14.1 s | 22.4 s |
| 13 | 9.2 KB | 24.7 s | 35.5 s |
| 17 | 9.5 KB | 43.2 s (38.5 s again) | 56.2 s |
| 21 | 10.0 KB | 34.2 s | 45.1 s |

The prompt grew by about 60 %; the time to the first word grew about
fourteenfold, and with the same prompt `"thinking": "low"` halved it (turn 17:
18.8 s), so the growth is the model's thinking on a bigger board, not the
prompt and not this queue (no question waited in it). The CLI starts fresh for
every question (`--no-session-persistence`, one turn): no conversation grows.
`claude --version` and `--help` cost about 0.2 s once a minute.

The queue had a gap all the same. A newer question with the same key ended a
*queued* one (D325), but the *running* one ended only when its client
disconnected, and ForgeCoach's disconnect comes from its coach panel, which is
not mounted while the player has folded it away. A stale answer could then run
to the end while the fresh one waited behind it.

**Decision.** `/coach` and `/vision` take an optional `"replaceRunning"`:
`true` or `false` (absent is `false`); anything else, or `true` without
`"supersedes"`, is **400** and no `claude` starts. With `true`, a question whose
key matches the RUNNING question's ends it: that question's one terminal line is
D325's `{"type":"error","code":"superseded","message":"superseded by a newer question"}`,
its process group is stopped as a disconnect stops it (SIGTERM, SIGKILL after
2 s), and its slot is free at once, so the newcomer runs without queueing
behind a process that is only exiting. A question that has its slot but has not
started `claude` yet is ended the same way before it starts. Queued questions
with the key are superseded as before. Without the field nothing changes: a
manual *Ask again* from an older ForgeCoach still never kills an answer that is
nearly done (D325's reason). `/health` carries `"replaceRunning": 1`.

Each `/coach` and `/vision` log line now ends with the prompt's size (system +
user), the wait in the queue, the time to the first text and the whole time:
`(done … ; sonnet; thinking low; 7.3 KB prompt; queued 0 ms; first text 5399 ms; 9338 ms)`.
A replaced question logs `superseded while running`.

**ForgeCoach's side**, for the record (its repository has the code): auto-coach
asks once per turn cycle, at the opponent's end step, for a plan for the
player's next turn; the live coach answers in a short style (commands, one
reason, the rest behind *More*) with a 2 KB system prompt instead of 4 KB and
thinking capped at `low`; it keeps one plan and one question of the player's own
per seat, sending `replaceRunning` with one key for each. The same turns,
measured the same way with the short plan prompt:

| turn | prompt | first text | total (default thinking) | total (low) |
|---|---|---|---|---|
| 1 | 4.0 KB | 2.4 s | 4.7 s | 5.0 s |
| 9 | 6.7 KB | 19.1 s | 24.1 s | 13.4 s |
| 13 | 7.1 KB | 19.9 s | 25.5 s | 14.4 s |
| 17 | 7.3 KB | 35.5 s | 41.3 s | 22.4 s |
| 21 | 7.9 KB | 21.5 s | 28.1 s | 19.9 s |

and, through this helper in a browser against the fake engine with Sonnet,
eight turn cycles in a row: one question each, first text 4.3–6.5 s, total
7.7–9.4 s, nothing queued.

**Checked.** `tools/coach-helper-selftest.mjs` (gate 12f): `/health` says
`"replaceRunning": 1`; `"yes"`, `1` and `null` are 400 with no child started,
and so is `true` without a key; a running question with key `seat-0` (the slow
fake, with a grandchild) is left alone by a queued question with another key,
then ended by a newcomer with `seat-0` and `replaceRunning` — one superseded
line after its stream, its child and grandchild killed — while the newcomer runs
at once (no `queued` line) to `done`; the log names the replacement and every
answer's line carries the four numbers; the queue is empty after. Against the
helper before this change the same checks fail (nine of them) instead of
hanging.

**Rejected.** Making every key replace the running question (D325's
*Ask again* case: an older client would lose nearly finished answers it did not
mean to stop); a per-seat key the helper invents (the client already knows
which questions replace each other); reusing one CLI conversation across
questions to save start-up (the start-up is not the cost, and a conversation
would grow every turn — the thing to avoid); a lower default thinking in the
helper (the client chooses per question, D346).
