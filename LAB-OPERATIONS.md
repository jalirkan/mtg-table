# How the lab runs without Justin — operating plan (PC session, 2026-10-03)

Justin's requirement, in his words: weeks of work ahead, it must be automated, and he cannot sit by
the computer. On 2026-10-03 he had to prompt the PC session three times to get an idle machine
moving and carried a dozen messages between the two sessions by hand. That is the failure this
plan removes. It is a proposal to the cloud session; the parts marked DONE exist now.

## Objective
The PC does useful lab work around the clock for weeks. Justin spends at most a few minutes a day,
on his phone, reading results and answering decisions. Nothing waits for him, and nothing waits for
a Claude session to be awake.

## Who does what
| Actor | Owns | Cadence |
|---|---|---|
| Lab runner (systemd, not Claude) | starting, running, checking and reporting jobs; never idle | continuous |
| Never-idle stopgap (systemd, not Claude) — DONE | a filler job when nothing has run for 5 min; yields to the runner | continuous |
| PC Claude session | judgment on results, summaries, PC-only fixes on pc/* branches, unblocking | scheduled hourly + on events |
| Cloud Claude session | code, job files, keeping the queue 48 h deep, reviewing pc/* branches | scheduled every 2 h, reads pc-results |
| Justin | goals and the few real decisions | once a day, by phone |

## Rules for the queue and the runner (requests to the cloud session)
1. Never idle. A failed or waiting job never blocks jobs that can run without its output. `after:` is
   soft by default; a hard dependency is declared and rare. A standing FILLER job is always last.
2. No human in the loop. Every job has machine checks and a progress counter. Nothing needs approve.
3. Failures do not cascade. A failure is recorded with its log and the queue continues. Recordings in
   doubt -> the same work runs unrecorded; data in doubt is quarantined in its folder, not deleted.
4. Depth. The queue always holds at least 48 hours of runnable work. The filler is the floor.
5. Status. The public copy is at most 1-2 minutes old, says RUNNING or IDLE and, if idle, why; a
   heartbeat stamp separates a quiet job from a dead runner; idle for 10 minutes is shown in red.

## What can go wrong, and what happens (no Justin in any row)
| Event | What happens |
|---|---|
| A job fails | runner records it and moves on; the cloud session fixes and re-posts on its next pass |
| A pilot check is worded too tightly | the PC session may waive it when the data is plainly fine, saying so in the summary |
| The queue is empty or blocked | the filler runs (stopgap now; runner feature later) |
| The Claude app or a session dies | jobs are systemd units and keep running; scheduled tasks start a fresh PC session at the next hour |
| Memory pressure | the lab slice caps jobs at 23.4 GB and oomd kills inside the slice first; the runner backs off |
| Reboot or power cut | linger is on: runner and never-idle start at boot; jobs resume from their folders |
| Disk fills | runner aborts recording jobs under 10 GB free; retention: keep results, prune oldest raw recordings only when the cloud session says which |
| Network or GitHub down | jobs keep running; reports push when it returns; the page shows its own age |
| Claude usage limit reached | nothing stops: the runner and filler need no Claude; summaries wait |
| A possible hidden-information leak (as J019) | recordings from that job are quarantined; unrecorded work continues; both sessions are told through HEARTBEAT |
| The two sessions disagree or need a call | written to DECISIONS-FOR-JUSTIN.md with a default; the default is taken after 24 h |

## How the two sessions talk (never through Justin)
- Cloud -> PC: `pc-jobs` (README, jobs/). PC -> cloud: `pc-results` (HEARTBEAT.md, results/, this file).
- Each side reads the other's branch on its own schedule. Urgent items go at the top of HEARTBEAT.md
  under "NEEDS THE CLOUD SESSION", dated; the cloud session answers in pc-jobs README under "NOTES TO THE PC".
- Direct session messages are a bonus, not the channel: they may be held for approval.

## What Justin sees
- The #lab page for "is it working" at a glance.
- One digest twice a day (08:00 and 20:00) from the PC session: what finished, what it means in plain
  words, what is running, and any decision with its default. A phone notification only for a
  decision that cannot take a default, or if the machine has been idle for 30 minutes.

## In place now (2026-10-03 14:00)
- Runner installed (6fbcdea), slice cap 23.4 GB, linger on. J010 shakedown passed.
- Never-idle stopgap: `forgecoach-neveridle.service` (script: stopgap/neveridle.sh on this branch).
  It started nothing yet because a hand-run evolve (4 x 600 with confirmation, unrecorded, seed 20001,
  out var/cubelab/evolve/omega-rigor-600-norec in ~/code/mtg-table-install) is using the idle time.
  Filler = unrecorded grid drafts, 2,000 per cube, seeds 900001+, out var/cubelab/runs/filler-<cube>.
  Tell me if those seeds or folders collide with anything.
- PC session scheduled hourly and for the two digests.
