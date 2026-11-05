"""Every verdict line the ladder holds (the runner's clone, read-only): fixed matches and SPRTs, with Elo,
interval, decisions searched and changed, ms a decision. Usage: python3 ladder.py > ../tables/ladder.md"""
import json, math

L = '/home/justin-a/code/lab/mtg-table/var/ai-ladder'
def elo(s): return 400 * math.log10(s / (1 - s))
print('# The ladder\'s verdicts (`var/ai-ladder/match.jsonl`, `sprt.jsonl`, the runner\'s clone)\n')
print('## Fixed matches (D398), confirm set, mirrored pairs\n')
print('| date | A | B | games | A score [95%] | Elo [95%] | A searched / changed (rate) | A ms/decision | B ms/decision |')
print('|---|---|---|---|---|---|---|---|---|')
for l in open(f'{L}/match.jsonl'):
    d = json.loads(l); a = d.get('aSearch') or {}; b = d.get('bSearch') or {}
    rate = f"{a.get('searched',0)} / {a.get('changed',0)} ({a['changed']/a['searched']:.3f})" if a.get('searched') else '–'
    print(f"| {d['at'][:10]} | {d['a']} | {d['b']} | {d['played']} | {d['score']:.4f} [{d['lo']:.4f}, {d['hi']:.4f}] | "
          f"{d['elo']:+.1f} [{d['eloLo']:+.1f}, {d['eloHi']:+.1f}] | {rate} | {a.get('msPerDecision') or '–'} | {b.get('msPerDecision') or '–'} |")
print('\n## SPRTs (elo0/elo1, alpha = beta = 0.05)\n')
print('| date | A | B | elo0/elo1 | result | games | score |')
print('|---|---|---|---|---|---|---|')
for l in open(f'{L}/sprt.jsonl'):
    d = json.loads(l)
    print(f"| {d['at'][:10]} | {d['a']} | {d['b']} | {d['elo0']}/{d['elo1']} | {d['result']} | {d['games']} | {d['score']:.3f} |")
print('\nNo ladder line is later than 2026-10-17. Rollouts a decision, from the evaluator-leaf side\'s counters (every '
      'unfinished rollout is one evaluator leaf): J131 452,130 / 27,900 = 16.2; J139 1,600,784 / 110,800 = 14.4. '
      'At up to six candidates that is 2-3 rollouts a candidate, about 63 ms each (907 ms / 14.4).')
