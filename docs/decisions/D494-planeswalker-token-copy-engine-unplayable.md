## D494 — Ob Nixilis, the Adversary joins the engine-unplayable list: the fork cannot re-make a planeswalker token that carries a keyword (D492's rule)

*Branch `pc/d494-token-copy`, on origin/main `9c4737e9` (D492's merge). D494 was reserved for this lane. Applies **D492**'s
rule (a measured fork crash lists the card; a mechanic's code path lists every pool card whose own effect is that path) to a
second crash.*

**2026-10-31**

**Context.** J176 (atlas rung 4b, night three), spine s07 (legacy, spine seed 2133, deck folder `s07-legacy-2033`):
**2,280 of its 7,025 branch games errored**, and they are exactly every branch of every decision from d3 to d6 (turns 8
and 10; 12 options, 190 of 190 each, 1,800 random and 480 Forge branches), each with `turns: 0`, `steps: 0` and
*ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2* (460 of them, all at d3 and d4, the same exception
with neither message nor stack: HotSpot's preallocated one for a throw it has compiled hot). d2 (turn 6) and d7–d20 were clean. The stack in `logs/worker-*.log`
is the fork:

```
ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2
  at forge.game.card.CardFactoryUtil.makeEtbCounter(CardFactoryUtil.java:550)
  at forge.game.card.CardState.getReplacementEffects(CardState.java:737)
  at forge.game.card.CardState.getReplacementEffects(CardState.java:723)
  at forge.game.card.Card.getAbilityText(Card.java:2912)
  at forge.game.card.CardView$CardStateView.updateAbilityText(CardView.java:1603)
  at forge.game.card.CardView$CardStateView.updateKeywords(CardView.java:1611)
  at forge.game.card.Card.updateKeywords(Card.java:5049)
  at forge.game.card.Card.addIntrinsicKeyword(Card.java:5258)
  at forge.game.card.token.TokenInfo.makeOneToken(TokenInfo.java:166)
  at forge.ai.simulation.GameCopier.createCardCopy(GameCopier.java:300)
  at forge.ai.simulation.GameCopier.addCard(GameCopier.java:348)
  at forge.ai.simulation.GameCopier.copyGameState(GameCopier.java:252)
  at forge.ai.simulation.GameCopier.makeCopy(GameCopier.java:129)
  at mtgtable.ai.LenientGameCopier.makeCopy(LenientGameCopier.java:222)
```

What was on the board: seat 1 (deck 2, `legacy-2033-00002`) cast **Ob Nixilis, the Adversary** at turn 7 and paid its
casualty. Its script is `K:Casualty:X:NonLegendary$ True | SetLoyalty$ Casualty`, so the spell's copy resolved as a
**token** planeswalker: in the baseline's seat-0 log, id 97, *Ob Nixilis, the Adversary*, `Planeswalker - Nixilis` (not
legendary), loyalty 3, `keywords: ["CASUALTY"]`, `token: true`, on the battlefield from frame 116 (turn 7) to frame 208
(turn 10). The errored decisions are exactly the ones taken while it was there. Evidence:
`/home/justin-a/code/lab/data/lab-j176/b-s07-legacy-2133/` (`atlas.md` and `atlas.json`: 12 PROBLEMS, d3–d6;
`phaseB/branches.jsonl`; `phaseB/logs/worker-*.log`; `phaseB/baseline/frames/baseline-seat0.jsonl.gz`); the deck
`/home/justin-a/code/lab/data/lab-j176/decks/s07-legacy-2033/decks/legacy-2033-00002.dck`.

**The exact cause** (the pinned jar, `javap -c -l`; the 2.0.15 source checkout at `579d0a84c` reads the same):

1. `GameCopier.createCardCopy` re-makes every token, line 300, as `new TokenInfo(c).makeOneToken(newOwner, c.getId())`
   and only on line 301 runs `new CardCopyService(c).copyCopiableCharacteristics(result, …)`, which is what carries the
   loyalty. `TokenInfo(Card)` takes the name, image, mana cost, colour, types, base power and toughness, and every
   keyword's original text (`getKeywords()` → `getOriginal()`); it has no loyalty and no defence. It is built from the
   card directly: `TokenInfo`'s string form (`toString()`, `Keywords:` joined with `-`) is never written or parsed on
   this path, so no keyword is mangled.
2. `makeOneToken` (lines 158–166) makes the card with those types — a Planeswalker — whose `CardState.baseLoyalty` is
   still its initial `""`, then adds the keywords one at a time. The first `addIntrinsicKeyword` refreshes the view's
   keywords, which asks for the card's ability text, which asks `CardState.getReplacementEffects`.
3. For a planeswalker, `getReplacementEffects` builds the loyalty replacement once (line 737):
   `makeEtbCounter("etbCounter:LOYALTY:" + baseLoyalty, …)`. With `baseLoyalty == ""` the keyword is
   **`etbCounter:LOYALTY:`**; `String.split(":")` drops the trailing empty string, so it is two parts, and
   `makeEtbCounter` reads part `[2]` on line 550. The battle branch beside it (`etbCounter:DEFENSE:` + `baseDefense`,
   line 743) is the same shape.

So the fault needs a token whose types are Planeswalker (or Battle) **and** that carries at least one keyword: with none,
`makeOneToken` never asks for replacement effects before line 301 has set the loyalty.

**The reproduction**, a scratch program against the pinned jar (the self-tests' own way to build a position:
`Bootstrap`, a `GameState`, the game pool; not committed, because it is evidence and not a check): a permanent on the
battlefield, a token copy of it made with `AbilityFactory.getAbility("DB$ CopyPermanent | ValidTgts$ Permanent …")` and
`AbilityUtils.resolve`, then `new TokenInfo(token).makeOneToken(p0)`, `new GameCopier(game).makeCopy()` and
`new LenientGameCopier(game).makeCopy(null, p0)`:

| the token copy | its keywords | makeOneToken / GameCopier / LenientGameCopier |
|---|---|---|
| Ob Nixilis, the Adversary, `NonLegendary$ True \| SetLoyalty$ 3` (the casualty copy's shape) | `Casualty:X:NonLegendary$ True \| SetLoyalty$ Casualty:…` | **all three throw the stack above**, through `makeEtbCounter(550)` ← `getReplacementEffects(737)` |
| Liliana of the Veil, `NonLegendary$ True` | none | ok; the copy's token has loyalty `3` and its counters; the copy then draws a card |
| Woe Strider (`K:etbCounter:P1P1:2:ValidCard$ Card.Self+escaped:…`) | Escape, that etbCounter | ok |
| Walking Ballista (`K:etbCounter:P1P1:X`) | that etbCounter | ok |
| Grizzly Bears (the control) | none | ok |

The token's `toString()` for Ob Nixilis is `Ob Nixilis, the Adversary,P:0,T:0,Cost:{1}{B}{R},Color:BR,Types:Planeswalker-Nixilis,Keywords:Casualty:X:NonLegendary$ True | SetLoyalty$ Casualty:The copy isn't legendary and has starting loyalty X.,Image:null`
— no loyalty in it, and its keyword is the card's own, intact. **The class is planeswalker (and battle) tokens with a
keyword, not etbCounter keywords**: a token copy of a card that carries its own etbCounter keyword keeps all its parts and
forks cleanly. Ob Nixilis's copy always crashes the fork, because the Casualty keyword is part of what it copies.

**Decision.**

1. **Ob Nixilis, the Adversary goes on `tools/cubelab/engine-unplayable.json`**, `since: "J176"`, with the measurement
   above as its `why` and the paths as its `evidence` — D492 point 1's measured fork crash, with the card's effect (its
   token copy) on the board.
2. **It is the only pool card whose own mechanic is this path.** Of the pool's 1,593 cards (`cubes/library/library-pool.tsv`,
   the scripts read from `cardsfolder.zip`), Ob Nixilis is the only one with Casualty on a planeswalker or a `SetLoyalty`,
   and no other pool card's own effect makes a token copy of a planeswalker: the pool's token copiers copy a
   creature (Dance of Many, Fable of the Mirror-Breaker, Scute Swarm, Springheart Nantuko, Vaultborn Tyrant, Vitu-Ghazi
   Guildmage's populate, and the Offspring and Eternalize cards) or a target they choose (Fractured Identity: a nonland permanent; Esika's Chariot: a token you
   control; Ocelot Pride: tokens that entered this turn), and its spell copiers (Fork, Lutri, Sage of the Skies, the two
   Chain spells, Storm, Replicate) copy instants and sorceries. The planeswalkers outside the pool that copy themselves
   (Jace, Cunning Castaway; Jace, Mirror Mage) are not listed: the list names only what the band draw can deal (D492
   point 2).
3. **What it is not** (D492 point 3's line). Fractured Identity, Esika's Chariot and Ocelot Pride *might* make such a
   token — Fractured Identity on any of the pool's five planeswalkers with a keyword (Kaito, Bane of Nightmares; Minsc &
   Boo; Tamiyo, Inquisitive Student; The Wandering Emperor; Ob Nixilis), the other two on Ob Nixilis's copy — but that is
   a choice in a game, not the card's own mechanic, and none is listed without a measurement of its own. A keyword-less
   planeswalker made a token is not affected (the reproduction's Liliana). Not a judgement of the card, and not a bias
   toward or against anyone's decks or cubes.

**Rejected: a repair in our copier.** The throw is inside `super.makeCopy` (`LenientGameCopier.java:222`), in
`GameCopier.createCardCopy`, before D479's carry pass can run, and every method on that path (`copyGameState`, `addCard`,
`createCardCopy`) is private: `GameCopier` offers no hook between `makeOneToken` and the line that sets the loyalty.
Catching the throw leaves no copy; avoiding it means reimplementing `GameCopier.makeCopy` (a second copier to keep against
the pinned jar) or altering the live game's token before each fork, which a fork must never do. As D492 found, the list
is the lighter, measured fix. Unlike D492, no newer engine is known to guard it: the 2.0.15 source checkout makes the
token the same way, so an official release takes the card off only with a measured clean spine.

**The draw, measured** (as D490 and D492): J176's 13 spine pairs and 13 validation pairs redrawn from their seeds
(`tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10`) on D492's list and on this one: **51 of the
52 decks byte-identical**; the one that held Ob Nixilis, `s07-legacy-2033` deck 2 (its fourth spell pick, 3 skips over the
draw's attempts), is redrawn from that pick on, 43 lines of its card list changed. Against the decks J176 actually
recorded (drawn before D492), 47 of 52 are identical: D492's four and this one.

**Follow-ups** (PLAN.md's cube lab list, 7 and 8). Nothing checks the pool against the scripts (D492's follow-up, which
this inherits: a second Casualty planeswalker entering the pool would be dealt until a spine measures it). The
reproduction also found a sibling the atlas has not yet met: a token copy of a **Saga** dies in the same
`makeOneToken`, differently — *Error in Keyword Chapter:3:DBToken,DBToken,DBPump* — because `TokenInfo` carries no SVars
and the Chapter keyword's traits need them; nothing in the pool makes a Saga token today except by a choice (Fractured
Identity), so it is written down, not listed.

**The night.** J176's s07 branched its other decisions cleanly (d2 and d7–d20); the list change reaches the next job's
draw. J176's decks
are drawn and stay.

**Tests.** `web/test/cubelab-deck-census.test.ts`: the committed list is exactly the seven, in the file's order, every one
a library card, `since` as recorded; `decks` reports each with its skips. `docs/guides/cube-lab.md` names the seven.
