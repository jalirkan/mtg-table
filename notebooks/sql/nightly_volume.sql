-- mtg-table — saved query: each queue night's volume, recordings, quarantine and errors.
-- Copyright (C) 2026 mtg-table contributors.
-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- Forge-vs-Forge: these are the lab's own counts (Forge Default against Forge Default); no number
-- here is about a card or a person.
--
-- One row per queue night (`nights` holds the plan, `drafts` / `games` what arrived), plus night 0
-- for everything outside a queue night.  `quarantined` counts the recordings the night's redaction
-- pass set aside (`<queue>-quarantine-n<N>/failed.txt`).
with d as (
    select case when source = 'queue' then night else 0 end as night,
           count(*) as drafts, sum(case when explore then 1 else 0 end) as exploring_drafts,
           sum(case when engine_error is not null then 1 else 0 end) as draft_errors,
           count(distinct ver) as versions
    from drafts group by 1
), g as (
    select case when source = 'queue' then night else 0 end as night,
           count(*) as games, sum(case when recorded then 1 else 0 end) as recorded,
           sum(case when timeout then 1 else 0 end) as timeouts,
           sum(case when error is not null then 1 else 0 end) as game_errors,
           round(sum(ms) / 3.6e6, 2) as game_hours
    from games group by 1
), q as (
    select night, count(*) as quarantined from quarantine group by night
), p as (
    select night, drafts as planned, first_run_at, last_run_at from nights
), n as (
    select night from d union select night from g union select night from q union select night from p
)
select n.night, p.planned, coalesce(d.drafts, 0) as drafts, coalesce(d.exploring_drafts, 0) as exploring_drafts,
       coalesce(g.games, 0) as games, coalesce(g.recorded, 0) as recorded, coalesce(q.quarantined, 0) as quarantined,
       coalesce(g.timeouts, 0) as timeouts, coalesce(d.draft_errors, 0) + coalesce(g.game_errors, 0) as engine_errors,
       d.versions, g.game_hours, p.first_run_at, p.last_run_at
from n
left join d using (night) left join g using (night) left join q using (night) left join p using (night)
order by n.night;
