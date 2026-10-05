## D384 — The decision ledger gets one public copy: an allowlisted, numbers-only `ledger.json` on ForgeCoach's `lab-status`; the private ledger stays private

*Branch `c/ledger-public`.* Amends D366. D382 is held by the open rollout-labels PR (#69).

**2026-10-05**

**Context.** D366's ledger (`ledger.jsonl` and `LEDGER.md` on the private `pc-results`
branch) says, for every job end, what the job decided, the rule it was judged by, how it
ended and what comes next. D366 kept it off the public `lab-status` copy entirely: its
entries hold free text (the title, `decides:`, `hypothesis:`, the failure reason with its
paths), the summary's path and the commits, any of which may name a card, a deck, a cube, a
path or a plan. ForgeCoach (public) now wants a morning report page: what ran overnight,
whether it passed, against which rule, and what is next. That needs the ledger's shape, not
its words.

**Decision.**

- **D366's "the ledger never goes to the public `lab-status` copy" is amended.** The private
  ledger is unchanged and stays on `pc-results` alone. The runner's `publishPublic` also
  writes `ledger.json`, schema 1, beside `status.json`, `ladder.json` and `warehouse.json`,
  made from the pc-results worktree's `ledger.jsonl` by `sanitiseLedger`
  (`tools/runner/ledgerpublic.ts`), a pure function of the text and a time. It is written only
  when one entry can be published, and the size and mtime of `ledger.jsonl` join the signature
  that triggers a public push (`ladderSig`). The local server serves the same text at
  `/public-ledger.json`.
- **The copy is an allowlist**, as `warehouse.ts` and `ladder.ts` are; the module's header is
  the contract. Per entry, the newest 100, oldest first: `id` (`J###`, else dropped), `title`
  (the job's `public_title:` only), `decides` (the job's new `public_decides:` only), `rule`
  (the private rule cut down to its `D###`, `gate N` and `*_RULE` tokens, in order, deduped, at
  most four, joined `", "`), `ruleWritten`, `outcome`, `cause` (a word from the failure
  reason's prefix: `check`, `pilot`, `timeout`, `step`, `memory` or `other`; null when done or
  aborted), `checked` (the job had `check:` lines), `headline` (statusjson's METRIC keys, no
  `cubes.` key, rounded to 3 decimals, at most 12), `finished`, and `followups` (a job's id or
  a template name, and the state).
- **Never public**: the hypothesis, the private title and `decides:`, the reason text, the
  summary path, the commits, the key, and any field not listed.
- **A job opts its words in, as with titles (D337).** `public_decides:` is a new optional
  header line, checked against `PUBLIC_TEXT` (an error in `check` when it does not match).
  The private ledger entry gains optional `publicTitle`, `publicDecides` and `checks` so the
  public copy can be made from `ledger.jsonl` alone. Older entries without them publish
  `title` and `decides` null and `checked` false.

**Rejected.**

- *Publishing `decides:` and the title as they are.* They are free text written for the
  private queue. The opt-in line is the same bargain `public_title:` already makes.
- *Publishing the failure reason through a pattern filter.* A reason carries check
  expressions, step names and paths. The page needs only to know which kind of failure it
  was, so it gets a word.
- *Building the copy from the runner's in-memory runs.* That would lose every entry from
  before the daemon's last restart. `ledger.jsonl` is the record.

**Tests.** `web/test/lab-runner.test.ts`: the key sets of the document, each entry and each
follow-up are exactly the allowlist, and a private entry full of private words (a
hypothesis, a reason with paths, a summary path, commits, a follow-up path
`jobs/J066-secret-slug.md`, a private `decides:`) leaves none of them in the JSON. Also the
rule short form, the cause mapping, dropped ids, outcomes, times and templates, headline
filtering and rounding, the cap of 100 keeping the newest, `public_decides:` parsing, the
local route, and the runner end to end: `lab-status` carries `ledger.json`, equal to
`sanitiseLedger` of the pushed `ledger.jsonl`, and neither `ledger.jsonl` nor `LEDGER.md`.
