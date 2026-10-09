# J119 — Sonnet seat smoke test: two games of Claude Sonnet in the human seat against Forge Default

Written by the PC session, 2026-10-09 10:40 EDT, from `results.json`, `games.jsonl` and `decisions.jsonl`.
Job 09:51 → 10:17 EDT (26 min incl. pilot), one worker, all 4 checks PASS, exit 0. Model: `sonnet` via the
PC's `claude -p` (claude.ai Max login; J117/J118 had failed only because that login had expired).

## Per game

| game | arm | deck vs AI deck | result | turns | decisions auto / model / fallback | model calls | retries | refused / stale | input tokens plain / cache-read / cache-create | output tokens | wall | mean s per call |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 001 | fresh | pacho-shield vs doom-legion | loss (turn 22) | 22 | 17 / 114 / 0 | 150 | 36 | 0 / 0 | 300 / 18,911 / 590,532 | 31,165 | 15.5 min | 6.0 s |
| 002 | fresh, mirrored | doom-legion vs pacho-shield | win (turn 19) | 19 | 11 / 82 / 0 | 110 | 28 | 0 / 0 | 220 / 1,388 / 327,779 | 6,127 | 7.6 min | 4.0 s |

- Every model decision was answered by the model: 196 of 196, 0 fallbacks, 0 refusals, 0 stale moves,
  0 session resets. The 28 auto decisions are the engine's own mana payments.
- **Retries: 64 of 196 model decisions (33%) needed one retry** (61 priority, 2 select, 1 block), never two.
  That is why 196 decisions cost 260 calls. The first reply was malformed a third of the time; worth a look
  at the reply format before the arm runs at scale.

## Per game against the dry run's estimate (~190k input tokens a game, fresh arm)

- Cache-create input: 590k and 328k a game, **mean 459k, about 2.4× the estimate**; plain input is tiny
  (260 a game) and cache reads small (10k), so nearly every call re-creates its cache. Output 31k and 6k
  (game 1 reasoned at length; game 2 was terse).
- Time: 15.5 and 7.6 min a game, 4–6 s a model call; the model is 98% of wall time.
- The run's own cost field: $2.68 and $1.37 a game ($4.05 for two), as the CLI prices it; on the Max plan it
  draws on the subscription instead.

## Decisions that look odd (from `decisions.jsonl`)

- **Not odd, but easy to misread:** on turn 1 the priority prompt lists every card in hand as castable (e.g.
  `Cast Robotics Mastery {4}{U}` with one land out) and the model passes. The option list is the engine's
  full offer, not what is affordable; 78 of 163 priority decisions are main-phase passes with "options" shown.
  The seat should probably be told which options are payable, or the prompt will keep inviting bad casts.
- Game 1, turn 13: Robotics Mastery (an Aura) was put on the opponent's Loki, God of Mischief. If the Aura is
  a buff, that is a misplay; if it is a control or debuff effect, fine. Worth checking the card.
- Game 1, turn 20: Giant-Sized Flying Ant's mode and target (tap HYDRA Troopers in the opponent's second
  main) are reasonable.
- Mulligans: kept both hands. Blocks: sensible (chump with a token on turn 14; double-block Loki on 18).
- **No phase where the seat should have been asked and was not**: every ask kind the engine raised
  (priority 163, attack 13, select 7, block 6, buttons 3, mulligan 2, choose_list 2) reached the model.

## Reading under the rule

**READY** as a seat: both games finished, nothing fell back, nothing was refused, every engine question
reached the model. Two costs to know before scale: a 33% first-reply retry rate, and cache-create input
2.4× the dry-run estimate (about 460k tokens and 10 minutes a game).
