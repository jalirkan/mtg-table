-- mtg-table — saved query: colour-pair (archetype) win rates and shares per cube, night by night.
-- Copyright (C) 2026 mtg-table contributors.
-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- Forge-vs-Forge: these are Forge Default's decks played by Forge Default against Forge Default.
-- A pair's rate says how the lab's drafters and Forge's AI fare with those colours, not how the
-- archetype plays for a person.
--
-- Plain decisive games only (exploring drafts, D358, draws, timeouts and errors left out).  A deck's
-- pair is its main colours as the builder wrote them (`decks.colors`), WUBRG order.  Night 0 is
-- everything outside a queue night (run folders).  Rows within a draft are correlated: the Wilson
-- intervals are optimistic.  A pair with fewer than `min_games` deck-games in a night is left out.
with sg as (
    select cube, night, list_sort(str_split(colors, ''), 'ASC') as cl, won
    from seat_games
    where not explore and decisive and not errored and colors is not null and colors <> ''
), named as (
    select cube, night, won,
           concat_ws('', case when list_contains(cl, 'W') then 'W' end, case when list_contains(cl, 'U') then 'U' end,
                         case when list_contains(cl, 'B') then 'B' end, case when list_contains(cl, 'R') then 'R' end,
                         case when list_contains(cl, 'G') then 'G' end) as pair
    from sg
), g as (
    select cube, night, pair, count(*) as games, sum(case when won then 1 else 0 end) as wins
    from named group by cube, night, pair
), w as (
    select *, wins / games as p, 1.96 * 1.96 / games as zn,
           games / sum(games) over (partition by cube, night) as share
    from g
)
select cube, night, pair, games, round(share, 4) as share, round(p, 4) as win_rate,
       round(greatest(0, (p + zn / 2 - 1.96 * sqrt(p * (1 - p) / games + zn / (4 * games))) / (1 + zn)), 4) as lo,
       round(least(1, (p + zn / 2 + 1.96 * sqrt(p * (1 - p) / games + zn / (4 * games))) / (1 + zn)), 4) as hi
from w
where games >= coalesce(getvariable('min_games'), 1)
order by cube, pair, night;
