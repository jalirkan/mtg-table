-- mtg-table — saved query: game length and the on-play win rate, per cube.
-- Copyright (C) 2026 mtg-table contributors.
-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- Forge-vs-Forge: game length and the play/draw edge here are Forge Default's against itself;
-- people race and block differently, so read them as the AI's numbers, not the cube's.
--
-- Plain games only (exploring drafts, D358, left out).  Turns over games that ended without an
-- error; the on-play rate over decisive games whose player on the play is known (the verified one
-- when the record has it), with Wilson's 95% interval (optimistic: games within a draft correlate).
with g as (
    select cube, turns, timeout, error is not null as errored, winner in ('A', 'B') as decisive,
           coalesce(on_play_verified, on_play) as op, winner
    from games where not explore
), agg as (
    select cube, count(*) as games,
           sum(case when timeout then 1 else 0 end) as timeouts,
           sum(case when errored then 1 else 0 end) as errors,
           sum(case when not decisive and not errored then 1 else 0 end) as draws,
           avg(case when not errored then turns end) as avg_turns,
           median(case when not errored then turns end) as median_turns,
           quantile_cont(case when not errored then turns end, 0.9) as p90_turns,
           sum(case when decisive and not errored and op in ('A', 'B') then 1 else 0 end) as n_play,
           sum(case when decisive and not errored and op in ('A', 'B') and winner = op then 1 else 0 end) as wins_play
    from g group by cube
), w as (
    select *, case when n_play > 0 then wins_play / n_play end as p,
           case when n_play > 0 then 1.96 * 1.96 / n_play end as zn
    from agg
)
select cube, games, timeouts, errors, draws, round(avg_turns, 2) as avg_turns, median_turns, p90_turns,
       n_play as on_play_games, round(p, 4) as on_play_win_rate,
       round(greatest(0, (p + zn / 2 - 1.96 * sqrt(p * (1 - p) / n_play + zn / (4 * n_play))) / (1 + zn)), 4) as lo,
       round(least(1, (p + zn / 2 + 1.96 * sqrt(p * (1 - p) / n_play + zn / (4 * n_play))) / (1 + zn)), 4) as hi
from w
order by games desc, cube;
