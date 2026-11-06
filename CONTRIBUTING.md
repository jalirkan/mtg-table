# Contributing to mtg-table

mtg-table is a hobby project with one owner. Issues and pull requests are welcome, and they are read, but there is
no support promise and no schedule: the owner reviews and merges, on his own time, and decides what fits. A change
that crosses one of the lines below will not be merged however good it is.

## How a change lands

1. **A branch per change.** Work on a branch of its own, never on `main`.
2. **Read the conventions first.** [`CLAUDE.md`](CLAUDE.md) holds the eleven hard rules, the environment, the gate
   and the policies; each of `bridge/`, `web/`, `web/src/arena/` and `tools/` has a `CLAUDE.md` of its own for the
   code under it. Read the one for the directory you change. They are written for the AI sessions that write most
   of this code, and they are just as binding on a person. The wire protocol, [`docs/protocol.md`](docs/protocol.md),
   changes first, then both of its ends.
3. **A decision file for anything load-bearing.** `node tools/decisions.mjs next` prints the next free number;
   write `docs/decisions/D<n>-<slug>.md`, starting `## D<n> — <title>` and a date line, with what was decided,
   what was rejected and why. A decision's number is final (D200), and an old decision is amended by a new file,
   never edited to say something else. [`DECISIONS.md`](DECISIONS.md) is the frozen history of D1–D378.
4. **The gate, green, before a merge.** `./tools/check-all.sh` runs every check the repository has (the lints and
   their self-tests, the build, real games on the engine, the redaction checker, the web build and tests) and needs
   Forge 2.0.14 installed (the [README](README.md#quickstart)). CI (`.github/workflows/checks.yml`) runs the gate's
   engine-free half on every pull request; it is a subset of the gate, never a substitute.
5. **Evidence, not adjectives.** What you ran and what it printed goes in the commit message or a dated file under
   `docs/evidence/`. A board change is played on the real engine before it is called done.

## What you may not add

Each line is a decision with its reasons in `DECISIONS.md` (D1–D378) or `docs/decisions/` (D379 on).

- **Only CC0 assets, each with a written provenance** (**D54**): a model, clip or
  texture enters through `tools/assets-manifest.json` — its URL, bytes, sha256,
  date and the licence badge as it read that day — and nothing comes from Mixamo
  or is generated from card art.
- **The personal tier is never committed** (**D201**, **D190**; PLAN.md's *Tier 3
  — a note, not a plan*): a likeness model of a Marvel character (Tier 3), or
  anything else that is personal-only, stays local and gitignored, under
  `/personal/`, its provenance in its own folder (`docs/guides/personal-tier.md`).
  *(Corrected 2026-09-28, when the personal tier merged: this said such a file is
  recorded in the manifest as `committable: false`, which D190 rejected — the
  manifest is the committed CC0 library's.)*
- **No proxy of Scryfall** (**D90**, **D92**): the card library's image route
  exists only in the Vite dev server and never fetches; anything at scale is
  Scryfall's bulk file, through `tools/card-library/scryfall.ts`, the one door.
- **No card images in the repository**: card art is looked up and cached locally
  (`web/public/art.json` and `var/cards/` are gitignored), and the committed
  `fixtures/cards/` slice is data without images (**D90**).
- **No rules logic in the client**: no mana-payability prediction, no targeting
  validation, no phase-stop logic — Forge decides and the browser renders
  (the README's *NON-GOALS*).
- **No engine snapshots** (**D109**–**D111**): only a tagged official Forge
  release may become the engine, pinned by its sha256 — never the daily build,
  and never a hand-written or overlaid card script to bring a set in early.
- **No code from `witchesofthehill/manabrew`** (**D11**): it is
  AGPL-3.0-or-later, and lifting any of it would relicense this project.
- **No machine's paths or private names** (**D516**): `tools/public-check.sh`, a gate step and a CI step, fails on
  a home-folder path, the owner's machine name or a personal mail address in any tracked file.

The README's [NON-GOALS](README.md#non-goals) are binding too: no deck builder, no accounts, no packaging, no
delta protocol, localhost only, each with the parts later decisions lifted.

## Licence of contributions

The repository is GPL-3.0-or-later ([`LICENSE`](LICENSE), [`NOTICE`](NOTICE)), and a contribution is accepted
under that licence. Copying code from Forge is fine (the same licence), once it compiles against the pinned jar;
copying from an AGPL project is not (above).

## Reporting a problem

A bug: an issue with what you ran, what you expected and what happened (the board's own bug report, D411, saves a
file under `var/bugs/` you can attach). A security problem: [SECURITY.md](SECURITY.md).
