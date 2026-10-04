-- mtg-table — saved query: card win rates by cube, with Wilson 95% intervals and a games threshold.
-- Copyright (C) 2026 mtg-table contributors.
-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- Forge-vs-Forge: every game in the lab is Forge Default against Forge Default, so a card's win
-- rate measures the card IN FORGE DEFAULT'S HANDS -- how well that AI plays it, and the decks the
-- lab's drafters put it in -- not the card's strength for a person. Cards the AI cannot play
-- (`ai_flag = 'All'`, D343) are listed apart by the flag column.
--
-- Plain decisive games only: exploring drafts (D358), draws, timeouts and engine errors left out.
-- Rows within one draft (and the two seats of one game) are correlated, so the intervals, which
-- treat every game as independent, are optimistic.  Basic lands left out.
--   duckdb var/warehouse/lab.duckdb -c "set variable min_games = 200" -c ".read notebooks/sql/card_win_rates.sql"
with g as (
    select sg.cube, dc.card, any_value(c.ai_flag) as ai_flag,
           count(*) as games, sum(case when sg.won then 1 else 0 end) as wins
    from deck_cards dc
    join seat_games sg on sg.draft_id = dc.draft_id and sg.seat = dc.seat
    left join cards c on c.card_id = dc.card_id
    where not sg.explore and sg.decisive and not sg.errored
      and dc.card not in ('Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes')
    group by sg.cube, dc.card
    having count(*) >= coalesce(getvariable('min_games'), 100)
), w as (
    select *, wins / games as p, 1.96 * 1.96 / games as zn from g
)
select cube, card, ai_flag, games, wins, round(p, 4) as win_rate,
       round(greatest(0, (p + zn / 2 - 1.96 * sqrt(p * (1 - p) / games + zn / (4 * games))) / (1 + zn)), 4) as lo,
       round(least(1, (p + zn / 2 + 1.96 * sqrt(p * (1 - p) / games + zn / (4 * games))) / (1 + zn)), 4) as hi
from w
order by cube, win_rate desc, games desc, card;
