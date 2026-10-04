## D379 — From D379 on, each decision is a file of its own under `docs/decisions/`; DECISIONS.md is the frozen history of D1–D378, and `tools/decisions.mjs` resolves a number in both

*Branch `c/decision-files`.*

**2026-10-04**

**Context.** Every PR appended its decision to the end of `DECISIONS.md` (about
1.2 MB, D1–D376 on `main` when this was written). Two PRs open at once therefore both changed the file's last
lines, and each merge left every other open PR with a conflict on it. On
2026-10-04 that cost about ten merge cycles.

**Decision.**

- **New decisions never touch a shared file.** A decision is
  `docs/decisions/D<nnn>-<slug>.md`: at least three digits, a lower-case slug of
  `a-z`, `0-9` and `-`. Its first line is the heading `## D<nnn> — <title>`, and
  its date line `**YYYY-MM-DD**` follows, as the old entries (a branch note in
  italics between them is allowed, as there). One decision per file.
- **An amendment to an old decision is a new file** that names the one it
  amends, in its title or its first paragraph. The old entry is not edited.
- **`DECISIONS.md` stays as it is**, D1–D378, with a note at its top and its end
  pointing here. Nothing is appended to it, and nothing in it is moved or
  rewritten.
- **Numbers stay final (D200).** `node tools/decisions.mjs next` prints the
  next free number above the highest in either place; a lane that reserves a
  block still keeps it. `list` is the index of both places. `check` exits 1
  when a number is used twice (across or within the two places), a file's name
  and heading disagree, a heading is malformed, a file has no date line or two
  headings, or a file in `docs/decisions/` is not named `D<nnn>-<slug>.md`. CI's
  `redaction` job runs `check` and `tools/decisions-selftest.mjs`.
- **Every reader resolves D<n> in both places.** The only reader that parses
  the decisions is `tools/lint-bridge.sh`'s hop rule (hard rule 3, D181): a
  `// ALLOW hop: D<n> <method>` tag now resolves to a heading in `DECISIONS.md`
  or to a `docs/decisions/` file whose first line is that heading
  (`has_decision`). `tools/lint-bridge-selftest.sh` copies `docs/decisions/`
  into its scratch trees and proves both directions: a PASS case moves D22's
  heading out of the scratch `DECISIONS.md` into a file of its own and the lint
  stays green; a firing case cites D9999 with a `D9999-*.md` file headed D9998
  and the lint fails. The other mentions of `DECISIONS.md` under `tools/`,
  `web/` and `bridge/` cite decisions up to D378, which stay where they are.

**Rejected.**

- *Split `DECISIONS.md` into one file per old entry.* It rewrites 1.2 MB of
  history and breaks every link and anchor into it, to gain nothing for the
  conflict, which only new entries cause.
- *Keep one file, insert at a random place or by number.* Two PRs still
  collide whenever their numbers are adjacent, and the file keeps growing.
- *A per-PR changelog folder merged into `DECISIONS.md` by a bot.* Moving
  parts and a second source of truth for a while; a file per decision is
  already the end state.

**The number.** This was written as D377; D377 and D378 were already taken by
two open PRs (#65, #66) that append to `DECISIONS.md`, so it is D379 and the
frozen range is D1–D378.

**Open PRs.** A PR opened before this one may still append its entry to the end
of `DECISIONS.md`. Its entry is valid where it is, and `check` resolves it there.
Because this change also adds a note at the end of the file, such a PR meets one
conflict at the end of `DECISIONS.md`; the simplest resolution is to move its
entry into `docs/decisions/` as a file of its own. Every later PR writes its
decision here.
