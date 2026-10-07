## D411 — Bug reports from the board: the helper's `POST /bug`, the room's `POST /room/<id>/bug` behind the seat token, saved in `var/bugs/`, and `tools/bugs-sync.mjs` to pc-results

*Branch `c/bug-reports`.* ForgeCoach's "Report a bug" panel, on this repo's side. It amends D292/D386 (a route on the coach helper's door), D400/D404 (a route on the room listener) and D405 (that route on the tunnel's list of room paths). It adds a writer of `pc-results`.

**2026-10-07**

**Context.** Justin is about to play many games against the Forge AI to test
it, and a friend plays at his table now and then. A bug now reaches the
coordinator (the cloud session) as a screenshot Justin takes and relays by
hand. The screenshot has no game id, no frame numbers, no ask and no console
errors. So the report should come from the page, at the moment it happens,
with what is needed to reproduce it. It should reach the cloud session without
Justin copying anything.

**Decision.**

- **One store, two doors.** `tools/bug-reports.mjs` checks a report
  (`kind: "forgecoach-bug"`, schema 1, a title of 1–120 characters, details up
  to 8000, an optional severity, the client's own context kept as it came) and
  saves it as `var/bugs/<id>.json`. The id is `<UTC yyyymmddThhmmssSSSZ>-<6>`, kept strictly increasing, so the folder sorts in the order reports came. An
  optional screenshot and its thumbnail are saved beside it as PNG or JPEG,
  each checked by its magic number. The images are taken out of the JSON. The
  folder is mode 700 and its files 600, and its real path must stay under
  `var/`. It holds at most 500 reports and 500 MB; past that a report is 507.
  The body may be up to 6 MB, because it holds the last 300 frames and a
  screenshot.
  - **The coach helper's `POST /bug`** (8643) takes Justin's own page. It sits
    behind the helper's door exactly as that door is (D386: a loopback peer
    with a loopback `Host`, or `--lan` with the pairing token; D405/D409: a
    tunnel's headers are 403). It allows 6 a minute past a burst of 10.
    `/health` says `"bugs": 1`.
  - **The room listener's `POST /room/<id>/bug`** (8644) takes a friend's page:
    a draft room, or a game between the two that the room started. It sits
    behind that seat's `X-Room-Token` like every room route (D400: tokens
    always, no loopback trust). Its header handling is unchanged: the room
    listener is the one door a tunnel may carry, and its tunnel headers are
    only read to count clients. Each seat may send 3 in a burst, then one about
    every 3 minutes. The report records `received.via: "room"`, the room and
    the seat. The visitor's address is not stored.
  - **Secrets are scrubbed twice.** ForgeCoach takes out its API key and every
    seat, room and table token before it sends. The store does it again over
    the report's text: the token the request itself presented (the room's
    `X-Room-Token`, the helper's pairing token), anything shaped like an
    Anthropic key, every `token=`, `t=` and `seat=` URL value, and the string
    under any key named like a token, key or password. A card's
    `token: true` is kept.
- **Hidden information.** A report holds what the reporting seat's page
  holds: its own frames, already redacted for it (hard rule 8 upstream), so
  its own hand and never the other seat's. A friend's report lands on the
  owner's disk with the friend's hand in it. ForgeCoach's panel says so
  before the friend sends. For a draft against the AI, ForgeCoach sends only
  what the screen shows: the cards seen taken and a count, never the AI's
  list or the seed.
- **To the coordinator: `tools/bugs-sync.mjs`.** It copies reports not yet
  sent to `pc-results` under `bugs/`: `<id>.json` and `<id>.jpg`, plus one line
  each in `bugs/INDEX.md`. The JSON keeps the last 120 frames and at most
  512 KB; the image is the thumbnail, at most 320 KB. The git steps are the
  runner's `approve` (`tools/runner/runner.ts`), as they are:
  1. fetch the branch with an explicit refspec;
  2. make a temporary *detached* worktree under `var/bugs-sync/`;
  3. write, commit and push `HEAD:refs/heads/pc-results`;
  4. on a refused push, fetch, re-apply and push again, up to three times;
  5. remove the worktree whatever happens.

  Only `bugs/` is written, so it never meets the runner's files. Git cannot
  prompt (`GIT_TERMINAL_PROMPT=0`, ssh `BatchMode`). `var/bugs/.synced` and the
  branch's own `bugs/` keep a report from going twice. It refuses `pc-jobs` and
  `main` by name. `--max` caps a push at 40 reports.
- **When it runs.** `scripts/play.sh` runs `bugs-sync.mjs --push --if-new
  --quiet` at exit, after the coach helper has stopped, when `var/bugs/` holds
  a report. It is capped at 90 s and never fails the exit. When it cannot push
  (no network, no credentials in this checkout) it says so and names the one
  command: `node tools/bugs-sync.mjs --push`. `--no-bugs-sync` turns it off,
  and with no reports nothing runs. The lab runner does not run it: it pushes
  from its own clone under `~/code/lab/`, and the reports are in the play
  checkout's `var/`.
- **The screenshot (ForgeCoach's side, measured there).** The page draws
  itself with html-to-image (MIT, a lazy chunk). It clones the visible DOM
  with computed styles into an SVG `<foreignObject>`, draws that to a canvas,
  and makes a JPEG at most 1600 px wide, with a 640 px thumbnail. It needs no
  permission and works offline. In Chromium it took 1.7–2.3 s on the replay
  and the board, and gave 50–170 KB pictures close to the screen. Its limits:
  - an inner scrolled list is drawn at its top;
  - a `<canvas>` or a cross-origin image without CORS comes out blank
    (Scryfall's card images send `Access-Control-Allow-Origin: *`);
  - Safari is less faithful.

  The fallback is the player's own picture, pasted or chosen from a file.

**Rejected.**

- *`getDisplayMedia`.* It asks for permission and a picker click on every
  report, and phones do not have it.
- *Sending reports straight to GitHub from the browser.* That needs a token
  in the page. The PC already has git and a way to push.
- *Pushing from the coach helper as each report arrives.* That is a git push
  from a long-running service mid-game, with credentials in its environment.
  At play.sh's exit, or one command, is enough for a session of testing.
- *A new route on the bridge's port, or the helper's door opened to friends.*
  The room listener is already the friend's door, built to stand alone behind
  a tunnel (D400, D405). The helper must never be tunnelled.
- *No frames, a game id only.* The friend's log is not kept unless that seat
  agreed to recording (D407), and the owner's may be rotated. The last 300
  frames are what the page already has, as that seat saw them.

**Measured.** `tools/bug-reports-selftest.mjs` (gate step 12f, CI's
redaction job) passes 79 checks:

- the checks and the scrubbing;
- both doors under their own rules: the helper refuses a Funnel or Cloudflare
  request and a tunnel's `Host` with 403, and the room refuses a missing or
  wrong token from loopback with 403;
- the room accepts a Funnel visitor's request and records seat 1, with the
  token scrubbed out and the address not stored;
- the per-seat limit;
- the folder's caps;
- `bugs-sync.mjs` against a local bare repository: the branch's files,
  nothing written twice, the checkout's HEAD and worktree list unchanged,
  `pc-jobs` and `main` refused, and a failed push's message.

`coach-helper-selftest.mjs` and `draft-room-selftest.mjs` pass unchanged.
