## D498 — The Determinizer keeps every card the searching seat may look at where it is, and redeals only the hidden ones (amends D312; the atlas's no-leak check with it)

*Branch `pc/d498`, on main `60177314` (#225, D497's merge). `node tools/decisions.mjs next` gave D498. Amends **D312**'s
determinizer (its rule of what the AI may know, and its claim that forgetting is the safe direction) and **D451**'s
no-leak check, which redeals the real game the same way. Touches every fork that redeals: the atlas's branches
(**D451**), the search's rollouts (**D312**) and the coach helper's grade copies (**D334**).*

**2026-11-01**

**Context.** J181 (the lab's atlas night), spine s07 (legacy, deck seed 2085, game seed 2185, folder
`b-s07-legacy-2185`) failed the night's `atlas.problems == 0` check: **51 of its 12,032 frame logs failed
`tools/check-redaction.mjs`**, 48 of them decision 14's (turn 12, the atlas seat's attack; the other 3, decision 13's,
are another shape, *Tests*). Every one of the 48 is the
atlas seat's log (seat 0), and every one says the same thing at its first state frame (line 3):

```
players[1] (the opponent) hand card 44 carries a name: "Currency Converter" ... nothing earlier in this log ever
revealed that id to seat 0 (A6)
```

By option and continuation: 12 of 150 random branches of options 0 and 1, 3 of 50 of options 2–7, 3 of 40 Forge
branches of options 0 and 1 — the same branch indices in every option, because branch *i* of every option is dealt from
one seed. The opponent (seat B) cast Oracle of Mul Daya at turn 11 ("Play with the top card of your library
revealed"), and from seq 177 of the baseline (turn 11, MAIN2) card 44, Currency Converter, sits revealed on top of its
library: the engine lets seat A look at it, and seat A's log lists it in the opponent's `library.cards` under A3's
revealed-top rule (`baseline/frames/baseline-seat0.jsonl.gz`). A passing branch log
(`frames/d14-random-o0-b0-seat0.jsonl.gz`) shows card 44 still the one card listed in that library; a failing one
(`frames/d14-random-o0-b8-seat0.jsonl.gz`) shows it full and named in the opponent's two-card hand, and the library
listing nothing. Evidence: `/home/justin-a/code/lab/data/lab-j181/b-s07-legacy-2185/` (`atlas.json`'s
`checks.frameLogsFailed`; `phaseB/frames/`), read only.

**The cause.** `Determinizer.determinize` (D312) pooled the opponent's whole hand and library, put the pool in a
canonical order, shuffled it with the fork's seed and dealt it back, hand first. Its header called the cards that
forgets ("a card the opponent returned to hand in public, a card a tutor revealed") "the safe direction". The engine
does not forget:

1. **The copy carries the grant.** `GameCopier` builds each copied card fresh (`CardFactory.getCard` from its paper
   card), so a copy starts with no may-look state of its own; then `makeCopy` undoes the original's static effects on
   the mapped cards and runs `checkStateEffects(true)`, which applies the **copy's** statics — the copy's Oracle of
   Mul Daya gives the copy's top card, card 44, `MayLookAt$ Player` (`Card.addMayLookAt`, which sets the card view's
   `PlayerMayLook`). The 2.0.15 source checkout reads so (`GameCopier.makeCopy`, `StaticAbilityContinuous` line 966);
   on the pinned jar the bench measures it (*Tests*: the copy's top card is the real one and the seat may look at it,
   40 of 40). The failing branches are the field's proof of the same: the hand card came out named.
2. **The grant rides with the card object.** `Zone.setCards` moves the objects and touches nothing on them; the
   static's grant is taken off only when the engine next removes and reapplies static effects
   (`StaticEffect.remove` → `removeMayLookAt`). An attack branch writes its first state frame at the declaration,
   before that check, so the redealt card 44 was still lookable in the opponent's hand, and `Snap`'s gate rightly
   showed it — a full card in a hidden zone with no reveal record, which is A6. A branch whose first frame comes after a
   static check (a pass at MAIN2) hides it again, which is why a pass board on the bench never failed on `main`
   (*Tests*).
3. **And the world was impossible.** Seat A knows card 44 is on top of the opponent's library; a branch that puts it in
   the opponent's hand gives the opponent a card the atlas seat knows it cannot hold, and moves the card the opponent
   will draw next. Forgetting a known card is not the safe direction: it is a different, impossible position.

**Decision.**

1. **The determinizer keeps every card the searching seat may look at where it is.** Per player, the hand and library
   cards are split by `Card.mayPlayerLook(seat)` (on the pinned jar: `public boolean mayPlayerLook(forge.game.player.Player)`
   on `forge.game.card.Card`, javap), read on the copy, where the copier's statics put it (point 1 above). The cards the
   seat may **not** look at are put in the canonical order (name, then id), shuffled with the fork's random source and
   dealt back into exactly the slots they left — the hand's first, then the library's in index order — so a hand keeps
   its size, a lookable hand card keeps its slot, and a lookable library card keeps its index: the revealed top card
   stays on top. The AI's own hand is never touched; its own library is redealt the same way (its own top card under
   Future Sight stays on top). `Determinizer.redealHidden(player, seat, withHand, rng)` is the one function, and
   `determinize` calls it for every player. **With nothing lookable** the slots are the whole hand and then the whole
   library, the hidden list is the whole pool, and the deal is D312's draw for draw: the same canonical order, the same
   one `Collections.shuffle` on a list of the same length, the same split — so a fork with no lookable card is
   byte-identical to `main`'s.
   **Why `mayPlayerLook` is the right predicate.** For a card in an opponent's hand or library,
   `CardView.canBeShownTo(viewer)` (the 2.0.15 source checkout, `CardView.java:629-690`) comes down to two things: the
   `Hand` case returns early only for the card's own controller and the `Library` case never does, so both fall through
   to `mayPlayerLook(viewer)`, and then to one more branch — the viewer is the controller's Mindslaver master, and the
   card can be shown to the controller. `Snap`'s gate is `canBeShownTo` (hard rule 8; a hand or library card is face up,
   so `canFaceDownBeShownTo` adds nothing), so a pinned card is exactly a card the seat's log shows it, by name, where it
   is. That bounds a mistake in either direction: a pin that is too generous — a card kept that the seat should not see
   — is a card `Snap` names in an opponent's hidden zone, which the checker fails loudly (A6 in a hand; A3 in a library,
   anywhere but the one revealed top card A3 accepts), never silently. **The Mindslaver branch is unchanged from D312**:
   a controlled player's hand is shown to the master but not lookable, so it is not pinned; it is redealt, and the
   branch's log then names the redealt cards under A6, as it did before this change.
2. **What may be known is restated** in the header: D312's list (everything public, its own hand, both decklists, so
   the multiset of the opponent's hand plus library) **plus every hand or library card the engine lets it look at**.
   The header's "safe direction" sentence is replaced by point 1–3 of *The cause*, and its *Known limits* paragraph says
   what this reads and what it does not (below).
3. **The atlas's no-leak check redeals the same way.** `Atlas`'s leak check plays a branch again after seat B's real
   hand and library were dealt again in the ORIGINAL game; it pooled them too. Moving the real revealed top card is a
   public change, not a hidden one: the copy's static would then reveal another card, the determinizer would keep that
   one, and the check would call the difference a leak. Its swap now calls `Determinizer.redealHidden(p, ai, true,
   rng)`, keeping what the atlas seat may look at; the control (seat A's own hand swapped with its library) is
   unchanged but for no longer drawing from a pooled shuffle first. `RowsLeakCheck` and `EvalLiveCheck` swap hands and
   libraries of their own and are not touched: they check that a feature vector does not move, and those vectors read
   hidden zones as sizes (D316, D450), so a revealed top card moving changes nothing they read.

**Rejected.**

- **Re-run the statics after the redeal** (`copy.getAction().checkStaticAbilities()`), so that a moved card loses its
  grant and the new top card gains it. It would cure the log (card 44 in the hand would be hidden again) and keep the
  impossible world (point 3): the seat saw card 44 on top, and the branch would play a game in which it is not. It would
  also move the deal for every fork, lookable card or not, with no evidence for it.
- **Pin by the original's card** (the copier's `live` map, as D497's `carryPaperCard` pass walks it). The copy carries
  the grant (point 1), so the copy's own `mayPlayerLook` is what the branch's `Snap` will gate on, and reading it there
  keeps the determinizer a function of the copy alone. The difference is a grant the original has and the copy does
  not: a look that is not a static's. The one such caller is `PlayerControllerHuman.tempShowCard` (`addMayLookTemp`,
  during a human's choice; no other caller in the source checkout), and no seat that determinizes is one; that card is
  redealt with the rest, which only forgets, and the branch log, gated on the copy, does not name it.
- **Relax the checker.** `tools/check-redaction.mjs` is the law here: a named card in a hidden zone without a reveal is
  exactly what A6 exists to catch, and the branch it caught was wrong.

**Known limits.** A card the OTHER seat may look at and the searching seat may not (Experimental Frenzy's private top
card) is hidden from the searching seat, so it is redealt, and its grant rides with it until the engine's next static
check — into its owner's own hand or library, where its owner's log shows it anyway; the one shape this does not cover
is a card of the searching seat's own library that its opponent may look at and it may not, whose grant would follow it
to another index of that library in the opponent's log. No field log has shown that shape. **One-shot looks are still
forgotten and redealt**: a card bounced to its owner's hand in public, a card a tutor revealed, a Thoughtseize-style
look at the hand — in a hand or a library only statics and `PlayerControllerHuman.tempShowCard` grant `mayPlayerLook`
(every `addMayLook*` caller in the 2.0.15 source checkout), so none of these is pinned. That is safe for the logs (the
branch forgets the card and never names it), but it is a position the seat knows to be impossible, as D312's were. The
face-down limit is D312's, unchanged.

**Tests.**

- **The real engine**: `tools/ai-bench.sh --selftest`'s new `determinize-revealed-*` scenarios
  (`determinizeRevealedScenarios`, 16 checks; the self-test 304 checks, 0 failures, ~15 s), with
  `tools/ai-bench/decks/determinize-revealed.dck` as both seats' deck in the branches' recordings. Four legs: (1) the
  opponent's Oracle of Mul Daya with Lightning Bolt revealed on top, in two games whose eight hidden cards are split
  between hand and library and ordered differently: the copy's top card is the real one and the seat may look at it (40
  of 40 seeds), it is on top after every determinization (40 of 40) and never in the hand, the hidden cards are still
  redealt (37 distinct hands), and the two games determinize byte for byte alike; (2) Telepathy on the seat's side: the
  opponent's hand, played revealed, is its hand in every determinization (40 of 40) while its library is redealt; (3)
  one hand card given a grant on the copy keeps its slot (40 of 40) while the others move; (4) the production path:
  24 atlas branches from the Oracle board, the option an attack (the field's shape: the first state frame is written at
  the declaration), Forge's continuation, both seats' logs recorded, and `tools/check-redaction.mjs --empty-hand-ok`
  passes all 48. **On `main`'s Determinizer and Atlas** (both compiled from `main` into a class folder ahead of
  `bridge/out`, the scenario unchanged): **5 of the 16 fail** — the top card on top in 0 of 40 seeds and in the
  opponent's hand in 9 (both games), the revealed hand kept in 0 of 40, the granted hand card kept in 6 of 40, and
  **11 of the 48 branch logs fail the checker**, each with the field's message (`players[0] (not the viewing seat) has
  a FULL card 4 "Lightning Bolt" in their hand, and nothing earlier in this log ever revealed that id to seat 1 ...
  (A6)`). The same leg with a pass at MAIN2 as the option passed on `main` (48 of 48 over 24 branches): its first state
  frame comes after a static check, which is why the leg forces an attack.
- **The field's positions, replayed.** The atlas has no command that re-branches one decision (D493's and D497's note),
  so a scratch driver (`var/d498-repro/run-units.ts`, not committed: evidence, not a check) hands the atlas's own
  `unitJob` and worker pool the ten units J181 played at s07's decisions 13 and 14 — the same unit specs (decision,
  continuation, branch range, the options early stopping left), the same plan (`plan.json`'s decks, seed 2185, turn cap
  40), the listing from the spine's `baseline.json` — into `var/cubelab/atlas/d498-s07/`: 830 branches (d13: 3 options
  × 50 random; d14: 8 × 50 and 2 × 100 more random, 2 × 40 Forge), every branch seed equal to the night's (830 of 830),
  80 s on four workers, no error, no option unavailable. Every frame log through `tools/check-redaction.mjs
  --empty-hand-ok`:

  | | decision 14 (680 branches, 1,360 logs) | decision 13 (150 branches, 300 logs) |
  |---|---|---|
  | J181, the night | 48 fail (A6, card 44 in the hand) | 3 fail (D460's shape, below) |
  | the driver on `main`'s Determinizer and Atlas | **48 fail — the night's 48 files exactly** | 3 fail, the night's 3 |
  | the driver on this branch | **0 fail** | 7 fail (D460's shape) |

  The no-leak check ran on the three units that start at branch 0 (d13 random, d14 random, d14 Forge): `leakSame` and
  `controlMoved` true in all three, card 44 revealed on top of the real library each time.
  **Decision 13's failures are not this fault.** In each, the random opponent spends its whole hand before the first
  state frame (Force of Vigor, cast by exiling the other card, a green one), so its hand is empty in every state and
  seat A's log never redacts a card; the checker's coverage assertion ("not one card was redacted") then fails,
  because `--empty-hand-ok`'s proof (D460) wants every opponent `library.cards` empty and this one lists the revealed
  top card that A3 (D315) accepts. Nothing hidden is shown. Which branches meet it is a matter of the deal, and this
  change alters the deal wherever a card is kept (the night's b7; this branch's b16, b25 and b28); it is written down as
  the cube lab's follow-up 15, and the checker is not changed here.
- **The atlas self-test**: `tools/cubelab.sh atlas-selftest --jobs 2` passes (6 min 10 s), its no-leak checks with the
  new swap among them, and its summary is D493's and D497's, number for number (16 forks, 8 no-leak checks, 38 frame
  logs, 558 rows): its boards hold no lookable hand or library card, so their forks deal as before.
- **The build**: `./bridge/build.sh` (the lint and its self-test, javac, the self-tests, the grade self-test's
  common-random-numbers determinizations among them) passes.

**Comparability.** Atlas labels and reads, and search results, from before and after D498 are **not pooled**; split
them by git sha (`docs/guides/ai-ladder.md`'s *A code change is not a config change*), as D479's, D493's and D497's are.
Nothing records which forks kept a card in place (`redealHidden`'s count is not carried into a branch row or a search
counter, and the row contract stays as it is), so no subset of a night can be told apart afterwards. J182, the next
lab night, opens the new population, `random-<band>-d498`. (As an aside, not a pooling rule: a fork with no lookable
hand or library card is dealt byte for byte as on `main`, point 1.)
