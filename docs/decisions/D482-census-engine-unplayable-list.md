## D482 — The census draw's engine-unplayable list: cards Forge's AI cannot finish a game with inside the atlas's branch budget are never dealt into a band's deck, every skip counted (amends D447)

*Branch `pc/d482-engine-unplayable`, on origin/main `49c0308e` (#208, D480's follow-ups, merged). `node tools/decisions.mjs
next` gave D481, which the redaction checker's lane holds; this is D482. Amends **D447** point 2 (the draw) and point 4 (what
is counted beside the rejections).*

**2026-10-25**

**Context.** J166 (2026-10-25), atlas move 4a on random library decks, spine s04 (powered, deck seed 2004, decks
`powered-2004-00001` and `-00002`, drawn by `tools/cubelab.sh decks --band powered --count 2 --seed 2004 --cross-band 0.10`),
ran past the runner's 10,800 s cap. A read-only diagnosis found no deadlock. One card did it: **Scute Swarm**, one copy in
deck 1, which copies itself on every land drop once its controller has six lands. Courser of Kruphix, Lumbering Worldwagon,
Trostani Discordant and the deck's fetch-type lands feed it, and boards reach 50–127 Scute Swarm tokens. Forge's AI
attack and block prediction then iterates that board for 1,000–1,300 s inside **one** engine step that fires no event. D467's
StepClock is read between steps and on the copy's events, so it cannot see the stall; only the 30-minute unit kill (D459)
ends it, and a resumed unit replays the same seed into the same stall. The numbers: 134 of the spine's 135 timed-out branches
had Scute Swarm on the battlefield at their last state (124 with 40 or more copies); 14 unit kills on 3 branches, then the
budget ran out; the three other spines of the night (pauper, peasant, legacy) had none. Evidence:
`/home/justin-a/code/lab/data/lab-j166/b-s04-powered-2104/phaseB/` (`branches.jsonl`, `units.jsonl`, `logs/worker-*.log`,
`frames/d0-random-o4-b29-seat0.jsonl.gz`, `frames/d6-random-o0-b84-seat0.jsonl.gz`) and
`/home/justin-a/code/pc-results/results/J166/run4.log`.

**Decision.** A committed list, `tools/cubelab/engine-unplayable.json`, of cards the band census's draw never deals.

1. **The file.** `{ "decision": "D482", "about": "…", "cards": { "<card name>": { "since": "<job>", "why": "<one line>",
   "evidence": "<paths>" } } }`. Each of `since`, `why` and `evidence` must be a non-empty string, or `decks` refuses
   the file. It starts with exactly one card, Scute Swarm, `since: "J166"`, with the evidence above.
2. **What it is.** An **engine** limitation: a card Forge's AI cannot finish a game with inside the atlas's branch budget.
   It is not a design judgement about the card, not a balance call, and not a bias toward or against anyone's decks or
   cubes (Justin's rule of 2026-10-24: the training pool carries no bias toward his decks or cubes). **A card goes on the
   list only with a measured stall**: branches timed out inside one engine step, with the card on the board at their last
   state, and the job and its evidence named in its entry. A slow card, a strong card or a disliked card does not qualify.
3. **Who reads it.** The band census's draw alone (`tools/cubelab/deckcensus.ts`, `decks --band`, rule 5 of its
   header). The cube census (`decks --cube`, D456) does not: a cube's census draws that cube's own list as it is, and
   refuses `--unplayable`. The cube lab's drafts, the evolve loop, ForgeCoach and the board never read it. An atlas run on
   a cube's census decks that stalls on a listed card is a new measurement and a new decision, not a silent widening.
4. **How the draw skips.** The listed card stays in every list of rule 2, so no list's size, no fallback and the
   colourless share q are unchanged. When a pick (`list[r.int(list.length)]`) lands on a listed card, the skip is counted and
   the pick is made again from the same list, which is a uniform pick among the list's other cards, as if the card were
   absent. A list holding only listed cards counts as empty (rule 2's fallback). A listed land is passed over in the fixers'
   shuffled order (rule 3), which takes no new randomness.
5. **What stays identical, and what does not.** A deck none of whose attempts would have picked a listed card consumes the
   same stream, makes the same picks and is **byte for byte the deck it was**: its `.dck` and its `decks.jsonl` row. A
   deck that would have picked one takes one more draw from its stream at that pick, so it changes **from that pick on**
   (the spells before it are the same; the rest of the deck, its land count and its lands follow the shifted stream). A
   rejected attempt that would have picked one can change which attempt is accepted. Deck i's streams depend only on the
   census, the flags, the seed and i (D447), so a skip in one deck never moves another. Making the skip itself consume no
   randomness (taking a neighbour in the list, say) would bias that neighbour; redrawing from the same list is the uniform
   draw without the card, and the price is that only the deck that met the card changes.
6. **The counters.** A deck row carries `engineSkips: { "<card>": n }`, the picks that landed on a listed card over all
   its attempts (a list of listed cards only counts each of them once, and a passed-over fixer once), **only when there
   was one**, so a row with none is the row it was. `decks.json` carries
   `engineUnplayable`: the decision, the file, its sha256 (12), the cards, the listed cards not in the library, the total
   skips, the skips by card and the decks with a skip (`null` under `--unplayable none`), and its `rules` gain
   `engineUnplayable`. `decks` prints the list it applied and each card's skips on its summary line.
7. **The flag.** `--unplayable <file|none>` on `decks --band`: the committed file by default; `none` is D447's draw
   without a list, which regenerates J166's s04 decks as they were.

**What it changes, measured.** All fourteen of J166's deck folders (`/home/justin-a/code/lab/data/lab-j166/decks/`, the
pilot `p-powered-2099` and spines s01–s13) were regenerated with the list. Thirteen are byte-identical in their `.dck`
files and `decks.jsonl`, and their `decks.json` differ only by the two D482 keys: s01 (pauper 2001), s02 (peasant 2002)
and s03 (legacy 2003) among them. Only s04 changes, and only its deck 1. Scute Swarm was its third spell; the first two
(Lovestruck Beast, Momo, Friendly Flier) are kept, and from the third pick on the deck follows the shifted stream. Its makeup
is unchanged (k = 3, W/R/G at 0.40/0.26/0.34), with 18 lands and one skip. Deck 2 (k = 1, mono-white) is unchanged.

**Rejected.**
- *Removing the card from the pool.* Every green list would shrink by one, so every pick of a green card in every deck of
  the powered and legacy bands would move, and J166's other spines with them. The census would be redrawn for one card.
- *Rejecting the whole draw when it holds a listed card* (counted as a castability rejection). The decks that remain are
  conditioned on not holding the card, which is not the uniform draw without it, and green-heavy makeups would hit the
  50-rejection makeup redraw more often, which tilts the prior.
- *A per-card turn or token cap in the engine.* That is rules logic of our own inside Forge's game, which the atlas
  measures as it is.
- *Skipping the stalled branches in the atlas's read.* That leaves the stall in place: every unit holding the card still
  burns 30 minutes a kill.

**Follow-ups, named by the diagnosis, not built here.**
- **(a) A unit resumed after a kill records the in-flight branch as stalled and moves past it.** Today a resumed unit
  replays the same seed into the same stall (J166: 14 kills on 3 branches). The resume should read which branch was in flight,
  write it as `stalled` (not as a loss or a draw, and kept out of the labels), and start at the next.
- **(b) A thread dump before the SIGKILL** in `tools/cubelab/engine.ts` (the unit watchdog's `p.kill('SIGKILL')`), so the
  stalling frame is named from the log instead of inferred from the board.
- **(c) A deadline that holds inside an event-free engine step**: a watchdog thread on the bridge side that ends a branch
  whose StepClock (D467) has not been read for its timeout. Hard rule 10's thread naming applies: its name an
  `mtg-table-` constant on the `new Thread(` line, added to `HeadlessGuiBase`'s class-init assertion; and whatever it does
  to the game thread needs a written argument, as hard rule 3 asks of any hop. With (c), the list could shrink, since a
  stalled branch would cost its branch timeout and not a unit. Taking a card off the list is a decision like putting it on:
  a measured run showing that its games finish inside the budget.

**Tests.** `web/test/cubelab-deck-census.test.ts`: the committed list loads and names exactly Scute Swarm, since J166,
and every listed card is a library card; a malformed entry is refused. Over 150 legacy and 150 powered decks, under the
list and again under the list with a planted frequent fixer and a planted colourless spell, no listed card is ever dealt.
Every deck that held one without the list counts a skip, and every deck with no skip is `deepEqual` to the deck drawn
without the list. J166's s04 deck 1 loses Scute Swarm with one skip and keeps its first two spells, and deck 2 is the same
row. The command prints and records the list and its skips, `--unplayable none` writes J166's deck, and `--cube` refuses
the flag.
