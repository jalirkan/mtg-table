id: J117
title: Sonnet seat smoke test: 2 games (one seed, mirrored) of Claude Sonnet in the human seat against Forge Default, the fresh-context arm, to see that the LLM seat works end to end and what one game really costs in tokens and time (D418)
public_title: Sonnet seat smoke test
public_est: ~1-2 h
public_decides: Whether the Sonnet tests go ahead, and how many games the allowance buys
cpu: light
cores: 1
repos: mtg-table@ccd4d5d (main with #106, D418: tools/llm-seat)
decides: whether the LLM seat is ready for Justin's small Sonnet tests (4-6 games vs Forge, then the replay comparison of fresh vs session:10), and what one game costs, so Justin can decide how much allowance to spend; this job changes nothing itself
hypothesis: the seat finishes both games with few fallbacks; the dry run's estimate (~60-120 model calls and ~190k input tokens a game for the fresh arm, before Claude Code's own overhead and thinking) is about right
rule: written 2026-10-09 before the run. READY if both games finish (win, loss or draw; no "unfinished" or "no-bridge"), fallbacks are at most 1 in 10 model decisions, and the engine refused at most 1 in 10 of the seat's moves. Otherwise NOT READY, with the cause. Win/loss is reported and decides nothing (2 games)
followup: morning-read
est: ~1-2 h. The pilot ~5-10 min (build, card index, tests, dry run). Each game ~60-120 model calls at ~10-30 s each (Sonnet through the CLI, thinking low) = ~20-60 min a game, on one core beside J116
resumable: no
timeout: 4h
clean: var/llm-seat/J117-smoke
progress: metric played games of 2
metrics: played = sh: test -f var/llm-seat/J117-smoke/games.jsonl && grep -c . var/llm-seat/J117-smoke/games.jsonl || echo 0
metrics: r = sh: cat var/llm-seat/J117-smoke/results.json 2>/dev/null || echo '{"byArm":{}}'
metrics: g = sh: node -e 'const fs=require("fs");const f="var/llm-seat/J117-smoke/games.jsonl";const L=fs.existsSync(f)?fs.readFileSync(f,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse):[];const s=k=>L.reduce((a,x)=>a+(x[k]||0),0);console.log(JSON.stringify({games:L.length,finished:L.filter(x=>["win","loss","draw"].includes(x.result)).length,wins:L.filter(x=>x.result==="win").length,turns:s("turns"),decisions:s("decisions"),modelDecisions:s("modelDecisions"),modelCalls:s("modelCalls"),fallbacks:s("fallbacks"),refused:s("refused"),stale:s("stale"),tokensIn:s("tokensIn"),tokensOut:s("tokensOut")}))'
headline: g.games, g.finished, g.wins, g.turns, g.modelCalls, g.fallbacks, g.refused, g.tokensIn, g.tokensOut

**What this is.** Justin wants a few high-value Sonnet tests on his remaining allowance. D418 (#106) built the seat: Claude plays the human seat on the bridge's `/ws`, is asked only when it has a real choice (engine questions with more than one answer; priority with something playable), sets Forge's own phase stops from its replies, and logs every decision. It was tested only against a fake bridge and a fake model; **this is its first real game**. Docs: `docs/llm-seat.md`.

**Allowance.** This job calls Sonnet through the `claude` CLI logged in on this PC, on Justin's subscription. It is only 2 games, on purpose. Do not re-run it or extend it without Justin's word.

**Beside J116.** It is light (one bridge on port 8650, never 8642, so it does not hold the heavy job) and runs beside J116. J116's 7 workers and this seat share the CPU; the seat's speed is the model's, not the CPU's.

## Pilot
About 5-10 minutes, no model calls: the build, the card library index (oracle text for the prompts), the seat's own tests, the `claude` CLI present, and a dry run of the match.
```bash
./bridge/build.sh
node tools/card-library/build.ts
node --test tools/llm-seat/test/*.test.mjs
command -v claude && claude --version
node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck --seeds 1 --mirror --context fresh --model sonnet --run J117-dry --dry-run
```
metrics: cards_ok = sh: test -s var/cards/cards.sqlite && echo 1 || echo 0
metrics: claude_ok = sh: command -v claude >/dev/null && echo 1 || echo 0
metrics: dry_ok = sh: test -s var/llm-seat/J117-dry/schedule.json && echo 1 || echo 0
check: cards_ok == 1
check: claude_ok == 1
check: dry_ok == 1

## Commands
```bash
node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck --seeds 1 --mirror --context fresh --model sonnet --run J117-smoke
```
check: g.games == 2
check: g.finished == 2
check: g.fallbacks * 10 <= g.modelDecisions
check: g.refused * 10 <= g.decisions

## Abort if
abort: g.fallbacks >= 10 and g.fallbacks * 3 > g.modelDecisions

Stops if the model's replies are mostly unusable (the CLI not logged in, or the reply format not working), so the allowance is not spent on fallbacks.

## Report
collect: var/llm-seat/J117-smoke/results.json
collect: var/llm-seat/J117-smoke/games.jsonl

summary.md should give, per game: result, turns, decisions (auto / model / fallback), model calls, retries, refused and stale moves, input tokens (plain, cache-read, cache-create), output tokens, wall time, and the mean seconds per model call. Then: the tokens and time **per game**, set against the dry run's estimate (~190k input tokens a game for the fresh arm). Quote 3-4 of the model's decisions from decisions.jsonl that look wrong or odd, if any, and any phase where the seat should have been asked and was not. The reading under the rule: READY or NOT READY with the cause.
