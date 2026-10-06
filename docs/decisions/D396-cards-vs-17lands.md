## D396 — The lab's card strengths are compared with human results on 17Lands' Powered Cube game data, with a pre-registered reading

*Branch `c/rank-and-17lands`.* Uses D359's 17Lands source (the outside exam); adds no
dependency.

**2026-10-06** (the outside review of 2026-10-06, §3 *Confounds* and recommendation T3)

**Context.** Every card rating the lab makes is "this card in Forge's hands against Forge". That
includes J062's M0 card power, which allocates the queue, and the per-cube win rates in ForgeCoach's
`meta.json`. Whether those numbers mean anything to a human drafter has never been measured.

17Lands publishes Arena's Powered Cube games. J063 already used the replay files, which hold 152 of
the Vintage cube's 180 cards. The same release has **game data**: one row per game, with every
card's opening-hand, drawn, tutored and deck counts. From those, GIH WR and IWD are computed the way
17Lands computes them.

**Decision.** `tools/ml/cards17l.py`:

- **`fetch`** downloads the published file (ext17l's resumable, size-checked download).
- **`stats`** streams it once into per-card games and wins (GP, GIH, OH, GNS) in two halves by draft.
- **`compare`** joins the Vintage cube's cards by front-face name. It reports:
  - the overlap;
  - Spearman's rho of M0 power against GIH WR (also GP WR, OH WR and IWD; and the meta win rate when
    given), with a 2,000-resample bootstrap over cards;
  - the human split-half reliability, as the ceiling;
  - the 15 biggest disagreements each way;
  - per colour group and for cheap creatures (mana value ≤ 2), the mean z(lab) − z(human) with a
    bootstrap interval.
- **`metrics`** prints the runner's flat numbers.

**The reading (CARDS_RULE, in the code before any real data was compared).**

- **Compared set:** nonland cards with at least 500 human GIH games. AI-limited cards (D343) are left
  out.
- **AGREES** when rho ≥ 0.5 and the interval's lower end is above 0.3. **WEAK** when the lower end
  is above 0 but not that. **NONE** otherwise.
- **Overrates or underrates a group** when its mean z(lab) − z(human) has a 95% interval above or
  below 0.
- **Pre-registered groups:** red, and cheap creatures. The review's hypothesis is that Forge
  overrates aggressive cards. The other groups are reported without a verdict.
- **Primary data:** PremierDraft. TradDraft is reported pooled with it, without a reading.
- **Scope:** a validity check on the ratings. It changes nothing by itself. Shipping or reweighting
  ratings in ForgeCoach is a separate decision.

**Caveats, stated with every result.**

- The humans are 17Lands users: an engaged population that wins about 54.5% of its games, playing
  on Arena.
- The human cube is not ours (152 shared cards). A card's GIH WR also carries its colour's strength
  in that metagame.
- The bootstrap resamples cards, not games. The per-card noise on both sides sits inside the rho,
  and the human split-half reliability sizes the human part.

**Data credit: 17Lands** public datasets, CC BY 4.0. Only the published files are read, never the
API. They stay under `var/`. The repository holds only made-up fixtures
(`tools/ml/tests/data/cards17l/`).
