## D463 — The ledger's stale lock is taken over through a claim, the helper waits for it on a timer, and `--empty-hand-ok` needs every seat in every state (amends D457 and D460)

*Branch `pc/review-followups-oct22`. Written as D461 and renumbered D463 before its merge: #179 took
D461 (the lab runner's monotonic clock and time sync), and D462 is this lane's G5 follow-up (#181),
so `node tools/decisions.mjs next` on main `8fca7250` gave D463.*

**2026-10-22**

**Context.** The cloud's review of #174 (D457) and #178 (D460) left two MEDIUM findings and two LOWs:

- `withLedgerLock` took a dead or stale lock over by unlinking it **by name**, so two writers that
  both read the dead pid could each unlink whatever was at that name: the slower one deleted the
  faster one's fresh lock and both wrote.
- The lock's wait was `Atomics.wait`, which in the coach helper blocks every route for up to
  `LOCK_WAIT_MS` (5 s); and `summary()` re-read `withdrawn.txt` once per ledger line.
- `--empty-hand-ok`'s proof only looked at the players a state listed, so a file whose states never
  list the opponent's seat passed the "not one card was redacted" proof vacuously.

**Decision.**

1. **A dead lock is taken over through a claim on that one lock file.** A writer that finds the
   lock dead creates `decks.lock.takeover-<inode>-<mtime>` with `O_EXCL` (one winner per lock file);
   the winner re-reads the lock and unlinks it only if it is still that inode and mtime and still
   dead, then removes the claim. A loser, or a winner that finds another file there, tries again
   and sees the new holder's live pid. A claim older than `LOCK_STALE_MS` (its taker died) is
   removed. The release unlinks the lock only while it is still the holder's own inode. Rejected:
   `rename(lock, aside)` and re-read — the slower writer's rename can still move the faster one's
   fresh lock aside, and putting it back races a third writer. Not covered: a holder *alive* past
   `LOCK_STALE_MS` releasing in the instant between a taker's re-check and its unlink.
2. **The helper waits on a timer.** The store's `postSoloAsync` and `recordRoomAsync` make the same
   synchronous change under the lock but, on a held lock, wait 10 ms with `setTimeout` and try
   again (up to `LOCK_WAIT_MS`); they run one after another in the order asked, so an opt-in and the
   opt-out after it never swap. `coach-helper.mjs` uses them; the CLI and `postSolo`/`recordRoom`
   keep `Atomics.wait`. `withdrawn.txt` is read once per `summary()`. It stays unbounded on purpose:
   one key per withdrawal, and dropping one would let an `import` bring an opted-out deck back.
3. **`--empty-hand-ok` needs every seat in every state.** Both proofs now also require every state
   body to list the viewer's seat and every seat any state lists — at least two — and otherwise
   fail saying which state left a seat out. The checker's default behaviour is unchanged.

**Measured.** `tools/draft-decks-selftest.mjs`: 131 checks (122 before). The race: writer B's
`onStale` seam starts writer A in another process, which takes the dead lock over and holds it;
B carries on with the dead pid it read. With unlink-by-name the marks are `in A, in B, out B,
out A` (B inside beside A); now `in A, out A, in B, out B`, with no lock or claim left. The helper's
wait: 21 timer ticks during a 405 ms wait. `tools/check-redaction-selftest.mjs`: 110 `ok` lines (108
before); the two new negative controls (the opponent's seat never listed; left out of one state)
pass under the old checker and fail under this one.
