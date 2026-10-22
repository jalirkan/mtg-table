## D457 — The draft-deck ledger remembers a withdrawal and takes one writer at a time (amends D455)

*Branch `pc/ledger-followups`. D456 is `pc/decks-cube`'s, so this is D457.*

**2026-10-20**

**Context.** The cloud's review of #169 (D455, merged as `8719fbac`) left three non-blocking findings:
an opt-out deleted a seat's lines but left nothing behind, and `seats.json` keeps the consent a
game *started* with, so a later manual `import` of that match re-added the withdrawn `table:` row;
the CLI and the coach helper wrote the same file with no lock, so a CLI `withdraw` racing a helper
append could drop a deck, and an `import` racing an opt-out could bring a line back; and the
self-test forced a failed rewrite with `chmod 0500`, which root ignores, so it failed in the
cloud's gate.

**Decision.**

1. **A withdrawal is remembered**: its keys go into `var/draft-decks/withdrawn.txt` (one key a
   line, mode 600, never a card), written atomically *before* the ledger is rewritten. `import`
   refuses a withdrawn key and says so. The GET and `list` leave a withdrawn key out even if its
   line survived a failed rewrite. A seat handing in a deck with its consent on again takes its
   own `room:` key off the list (not the `table:` keys of older games), and so does the owner
   sending the same solo draft again; `withdraw <key>` adds to it like an opt-out.
2. **One writer at a time**: every change (append, withdrawal, import) holds
   `var/draft-decks/decks.lock`, created with `O_EXCL` and holding the writer's pid
   (`withLedgerLock`). A lock whose pid is gone, or older than `LOCK_STALE_MS` (60 s), is taken
   over; otherwise a writer waits up to `LOCK_WAIT_MS` (5 s): then `POST /draft-deck` and a room
   hand-in answer 503 / log it, and an opt-out or an import throws, loudly. Reads take no lock
   (the rewrite is a rename; a half-written last line is skipped by the fold).
3. **The store's writes are injectable** (`opts.fs`), and the self-test fails the rewrite's rename
   that way, which holds as root.

**Measured.** `tools/draft-decks-selftest.mjs`: 133 checks (109 before) — the failed rename as an
ERROR, unserved by this process and by another, no temp file or lock left; `withdrawn.txt` keys
only, an opt-in clearing its own key; a re-import of an opted-out seat refused; the lock waited for
(a child process holding it delays a write by its hold and loses nothing), taken over from a dead
pid and from a stale lock, 503 and `LOCKED` when held by a live one.
