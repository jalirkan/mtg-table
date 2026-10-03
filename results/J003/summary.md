# J003 — search AI vs Forge Default, 400 deals per configuration

Run 10:34-13:10 local (2 h 36 min wall) as systemd unit `forgecoach-j003` (MemoryHigh 18G, MemoryMax 22G),
mtg-table ee4d127, seed 31, **JOBS=6** (lowered from 7: the first attempt at JOBS=7 died at 10:09 when
systemd-oomd killed the Claude app whose cgroup held it; restarted from zero). Pilot passed (pilot.md).
Load average part-way: 6.7-7.7 of 16 threads; job memory 5.8-7.6 GB (peak 9.3 GB); 0 swap-in.

## Headline

| comparison | treatment win rate | control | deals gained / lost | McNemar p | s/game (treat / control) | budget fallback |
|---|---|---|---|---|---|---|
| cube: Default+search vs Default | 60.3% [55.4, 64.9] (241/400) | 49.3% [44.4, 54.1] (197/400) | 80 / 36 | 0.0001 | 31.6 / 3.2 | 9.1% (927 of 10,218 decisions) |
| cube: search ms=3000,turns=1 | 63.0% [58.2, 67.6] (252/400) | 49.3% (197/400) | 82 / 27 | <0.0001 | 64.5 / 3.2 | 11.2% (1,144 of 10,250) |
| sac: Default+outlets+search vs Default+outlets | 62.3% [57.4, 66.9] (249/400) | 52.8% [47.9, 57.6] (211/400) | 69 / 31 | 0.0002 | 25.3 / 2.6 | 5.1% (469 of 9,256) |

Engine errors: 0 in all five runs (2,000 games). Copier errors 0; unmappable 4, 8 and 0. The search
changed Forge's answer on 17.1%, 18.0% and 16.8% of searched decisions; 52-64% of copies needed the
sideboard stand-in. The 3 s budget costs twice the time for +2.7 points over the default budget, with
overlapping intervals. No Abort condition appeared (no 0%/100% run, search games 25-65 s, errors 0%).

## Notes for the reader
- JOBS=6, not 7: the job allows lowering it; search timing is a wall-clock budget, so fewer workers
  only makes the search slightly stronger per decision, not weaker.
- The pilot's fallback rate was 36.9% at JOBS=7 with the lab's last job still winding down; the full
  runs at JOBS=6 on a quiet machine show 5-11%. Oversubscription matters for this benchmark.
- Data: var/ai-bench/night-*/ in /home/justin-a/code/mtg-table (shards, logs, reports); the killed first
  attempt is var/ai-bench/night-cube-control.killed-1009.

## The three paired outputs, in full
```
===== paired night-cube-control vs night-cube-search
== paired: treatment A = Default+search   control A = Default   (B the same in both)
  deals matched: 400 (treatment engine errors 0)
  treatment A wins 241 of 400 decisive = 60.3%  (95% Wilson CI 55.4-64.9%)
  control   A wins 197 of 400 decisive = 49.3%  (95% Wilson CI 44.4-54.1%)
  paired: 80 deals gained, 36 lost; exact McNemar p = 0.0001
  seconds per game: treatment 31.6, control 3.2
  search: 10218 decisions searched (25.5/game), 1746 changed Forge's answer (17.1%), 1108 ms each
  fallbacks to Forge: copier error 0 (0.00%), budget 927 (9.1%), unmappable 4; copies that needed the sideboard stand-in: 6496 decisions (63.6%)
  treatment counters: {activate.Carrion Feeder=71, activate.Priest of Forgotten Gods=12, activate.Woe Strider=8, cast.Blood Artist=48, cast.Carrion Feeder=11, cast.Cauldron Familiar=40, cast.Deadly Dispute=16, cast.Grim Haruspex=33, cast.Priest of Forgotten Gods=12, cast.Village Rites=7, cast.Woe Strider=31, cast.Zulaport Cutthroat=17, forge.outletActivation=79, search.a.changed=345, search.a.considered=2400, search.a.ms=2949977, search.b.changed=75, search.b.considered=792, search.b.ms=972882, search.candidateUnmappable=43, search.copyUs=817474423, search.fallback.budget=927, search.fallback.rolloutErrors=6, search.fallback.unmappable=4, search.oppFaceDownDecisions=194, search.p.changed=1326, search.p.changed.fromPass=480, search.p.changed.toOther=408, search.p.changed.toPass=438, search.p.considered=7026, search.p.ms=7393821, search.p.skipLand=3144, search.playUs=9677961521, search.rolloutErrors=18, search.rollouts=253892, search.rounds=86331, search.standInCards=8379, search.standInDecisions=6496}
===== paired night-cube-control vs night-cube-search3
== paired: treatment A = Default+search:ms=3000,turns=1   control A = Default   (B the same in both)
  deals matched: 400 (treatment engine errors 0)
  treatment A wins 252 of 400 decisive = 63.0%  (95% Wilson CI 58.2-67.6%)
  control   A wins 197 of 400 decisive = 49.3%  (95% Wilson CI 44.4-54.1%)
  paired: 82 deals gained, 27 lost; exact McNemar p = 0.0000
  seconds per game: treatment 64.5, control 3.2
  search: 10250 decisions searched (25.6/game), 1850 changed Forge's answer (18.0%), 2429 ms each
  fallbacks to Forge: copier error 0 (0.00%), budget 1144 (11.2%), unmappable 8; copies that needed the sideboard stand-in: 6349 decisions (61.9%)
  treatment counters: {activate.Carrion Feeder=61, activate.Priest of Forgotten Gods=7, activate.Woe Strider=6, cast.Blood Artist=46, cast.Carrion Feeder=10, cast.Cauldron Familiar=42, cast.Deadly Dispute=18, cast.Grim Haruspex=35, cast.Priest of Forgotten Gods=11, cast.Village Rites=8, cast.Woe Strider=26, cast.Zulaport Cutthroat=16, forge.outletActivation=67, search.a.changed=395, search.a.considered=2429, search.a.ms=6372639, search.b.changed=88, search.b.considered=843, search.b.ms=2142506, search.candidateUnmappable=37, search.copyUs=716372667, search.fallback.budget=1144, search.fallback.rolloutErrors=7, search.fallback.unmappable=8, search.oppFaceDownDecisions=117, search.p.changed=1367, search.p.changed.fromPass=522, search.p.changed.toOther=389, search.p.changed.toPass=456, search.p.considered=6978, search.p.ms=16385809, search.p.skipLand=3166, search.playUs=22779954065, search.rolloutErrors=21, search.rollouts=232655, search.rounds=79722, search.standInCards=8287, search.standInDecisions=6349}
===== paired night-sac-control vs night-sac-search
== paired: treatment A = Default+outlets+search   control A = Default+outlets   (B the same in both)
  deals matched: 400 (treatment engine errors 0)
  treatment A wins 249 of 400 decisive = 62.3%  (95% Wilson CI 57.4-66.9%)
  control   A wins 211 of 400 decisive = 52.8%  (95% Wilson CI 47.9-57.6%)
  paired: 69 deals gained, 31 lost; exact McNemar p = 0.0002
  seconds per game: treatment 25.3, control 2.6
  search: 9256 decisions searched (23.1/game), 1555 changed Forge's answer (16.8%), 1005 ms each
  fallbacks to Forge: copier error 0 (0.00%), budget 469 (5.1%), unmappable 0; copies that needed the sideboard stand-in: 4796 decisions (51.8%)
  treatment counters: {activate.Carrion Feeder=492, activate.Cauldron Familiar=6, activate.Goblin Bombardment=480, activate.Priest of Forgotten Gods=6, activate.Viscera Seer=143, activate.Woe Strider=151, cast.Blood Artist=95, cast.Carrion Feeder=82, cast.Cauldron Familiar=71, cast.Deadly Dispute=50, cast.Goblin Bombardment=76, cast.Grim Haruspex=51, cast.Juri, Master of the Revue=35, cast.Mayhem Devil=68, cast.Priest of Forgotten Gods=29, cast.Village Rites=71, cast.Viscera Seer=73, cast.Woe Strider=151, cast.Zulaport Cutthroat=68, forge.outletActivation=128, opportunity.CAST_OUTLET=143, opportunity.COMBAT=290, opportunity.FODDER=291, opportunity.LETHAL=461, opportunity.THREATENED=96, policy.CAST_OUTLET=143, policy.COMBAT=290, policy.FODDER=291, policy.LETHAL=461, policy.THREATENED=96, search.a.changed=435, search.a.considered=2310, search.a.ms=2692487, search.b.changed=126, search.b.considered=874, search.b.ms=1024663, search.candidateUnmappable=3, search.copyUs=705272493, search.fallback.budget=469, search.oppFaceDownDecisions=83, search.p.changed=994, search.p.changed.fromPass=540, search.p.changed.toOther=257, search.p.changed.toPass=197, search.p.considered=6072, search.p.ms=5580613, search.p.skipLand=2809, search.playUs=8152230209, search.rollouts=255942, search.rounds=84458, search.standInCards=6630, search.standInDecisions=4796}
```

## Each run
```
== Default vs Default
  games 400: A 197, B 203, draws 0 (timeouts 0, engine errors 0)
  A win rate 49.3% of 400 decisive  (95% Wilson CI 44.4-54.1%)
  game time mean 3.2 s, median 1.7 s, max 122.9 s; turns mean 18.8; AI eval timeouts 3 (0.01/game)
== Default+search vs Default
  games 400: A 241, B 159, draws 0 (timeouts 0, engine errors 0)
  A win rate 60.3% of 400 decisive  (95% Wilson CI 55.4-64.9%)
  game time mean 31.6 s, median 26.7 s, max 211.8 s; turns mean 18.3; AI eval timeouts 27 (0.07/game)
== Default+search:ms=3000,turns=1 vs Default
  games 400: A 252, B 148, draws 0 (timeouts 1, engine errors 0)
  A win rate 63.0% of 400 decisive  (95% Wilson CI 58.2-67.6%)
  game time mean 64.5 s, median 59.0 s, max 300.5 s; turns mean 18.5; AI eval timeouts 57 (0.14/game)
== Default+outlets vs Default+outlets
  games 400: A 211, B 189, draws 0 (timeouts 0, engine errors 0)
  A win rate 52.8% of 400 decisive  (95% Wilson CI 47.9-57.6%)
  game time mean 2.6 s, median 1.5 s, max 38.9 s; turns mean 16.9; AI eval timeouts 0 (0.00/game)
== Default+outlets+search vs Default+outlets
  games 400: A 249, B 151, draws 0 (timeouts 0, engine errors 0)
  A win rate 62.3% of 400 decisive  (95% Wilson CI 57.4-66.9%)
  game time mean 25.3 s, median 22.9 s, max 100.8 s; turns mean 16.4; AI eval timeouts 14 (0.04/game)
```
