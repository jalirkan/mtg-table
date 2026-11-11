# J210: where the search's strength is, by decision kind (D535)

2026-11-10 18:36 to 2026-11-11 02:04, mtg-table `c744a0e8`, alone, 7 workers. Eight fixed 1,200-game matches
against `forge-default` on the same 600 deals (the confirm set, blocks 114,900,000-114,900,149), each in a ladder
folder of its own: search-v2 with each of priority plays, attacks and blocks searched or left to Forge. All eight
are complete and valid (9,600 games, 0 draws, errors or timeouts; every config line exact). The numbers are in
`report.md` and `verdict.json` beside this file; this is what they say.

**The reading.** The search is worth about 87 Elo over Forge's AI, and most of it is priority plays.

| what is searched | score [95%] | Elo [95%] | search seconds a game |
|---|---|---|---|
| nothing (`policy-outlet`) | 0.5042 [0.4988, 0.5096] | +2.9 [-0.9, +6.7] | 0 |
| blocks only | 0.5200 [0.5093, 0.5307] | +13.9 [+6.4, +21.4] | 2.2 |
| attacks only | 0.5408 [0.5244, 0.5573] | +28.4 [+17.0, +40.0] | 6.2 |
| priority only | 0.5900 [0.5698, 0.6102] | +63.2 [+48.8, +77.8] | 17.2 |
| attacks and blocks | 0.5517 [0.5355, 0.5678] | +36.0 [+24.7, +47.4] | 7.1 |
| priority and blocks | 0.5917 [0.5709, 0.6125] | +64.4 [+49.6, +79.5] | 18.1 |
| priority and attacks (`search-v2-no-b`) | 0.6242 [0.6034, 0.6450] | +88.1 [+72.9, +103.7] | 20.9 |
| everything (`search-v1-anytime`, the live seat) | 0.6258 [0.6048, 0.6468] | +89.4 [+73.9, +105.1] | 22.7 |

Paired by deal (D535 point 5), in score, with about the same in Elo:

- **WHOLE** (everything minus nothing): +0.1217 [+0.1006, +0.1428], about +87 Elo. Above 0, so the rest is read.
- **ALONE** (one kind searched, against nothing searched): priority +0.0858 [+0.0652, +0.1065] (about +60 Elo),
  attacks +0.0367 [+0.0201, +0.0532] (about +26), blocks +0.0158 [+0.0057, +0.0260] (about +11). Each ADDS ALONE.
- **LAST** (everything, against everything but that kind): priority +0.0742 [+0.0494, +0.0989] (about +53 Elo),
  NEEDED; attacks +0.0342 [+0.0155, +0.0528] (about +25), NEEDED; blocks +0.0017 [-0.0148, +0.0182] (about +1,
  ±12), NOT SHOWN NEEDED. That is not "blocks add nothing": the interval allows a block search worth up to about
  13 Elo on top of the other two, and one that costs as much.
- **INTERACTION** (information): -0.0167 [-0.0429, +0.0096]. The three kinds alone sum to a little more than the
  whole; the interval includes 0, so neither overlap nor help between kinds is shown.
- **REPLICATION** (information): the night's everything corner against J194 (a)'s rows, the same config on the same
  deals five days and eleven decisions apart: +0.0025 [-0.0134, +0.0184]. The paired comparison's own noise floor
  is about ±0.016 in score, ±12 Elo.

In plain words: priority plays (what to cast and when) carry about two thirds of what the search is worth, attacks
about a quarter, and searching blocks is worth about 11 Elo by itself but is not shown to add anything once the
other two are searched. The search changed Forge's answer on about one searched decision in five for every kind
(priority 19.4%, attacks 15.4%, blocks 14.8% in the everything corner, from `match-J210-pab.json`), so the kinds
differ in how much a changed answer is worth and how often the kind comes up (20,356 priority decisions, 6,861
attacks, 1,866 blocks in 1,200 games), not in how often the search disagrees with Forge.

**The faster-seat candidate rule (D535 point 6).** One candidate: `search-v2-no-b` (priority and attacks searched,
blocks left to Forge; hash `59505e241363`). Everything minus it is +0.0017, at or under the +0.014 bar, and it
searches 20.9 s a game against 22.7 s, about 8% less. No other arm passes (the next closest, priority and blocks,
is +0.0342 behind). A candidate is not a result: at this night's width an arm truly 20 Elo worse passes about one
time in nine. It earns the 4,800-game head-to-head against `search-v1-anytime` that D535 pre-registered, as J211
under D536.

**The live seat** is unchanged by this job. `SearchConfig.LIVE_DEFAULTS` stays search-v2 with all three kinds
searched.

**What it points at next.** The seat's strength is in its priority decisions, and J194/J195's budget curve was
flat from half to four times the clock, so more time is not what priority lacks. The next lane is chosen from that:
what the priority search considers (its candidates and what a rollout knows), not how long it thinks.

**The run.** 7.37 h against an estimate of about 6. Seven pressure events: 6 workers for seven minutes at 19:50,
then 5 or 6 workers from 21:15 to the end (swap-in bursts while the job itself held 4.5 to 8.6 GB of its 21.4 GB;
the GPU painting queue was running beside it, outside the lab). A drop takes a worker away as its game ends and
changes no deal and no budget. Peak worker memory 1.39 GB of the 2 GB declared. Nothing else of the lab ran
beside it (`alone: yes`).
