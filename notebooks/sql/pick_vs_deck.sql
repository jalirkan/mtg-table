-- mtg-table — saved query: pick order against deck inclusion, per cube and card.
-- Copyright (C) 2026 mtg-table contributors.
-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- Forge-vs-Forge: the drafters are the lab's drafting AI and the builder is Forge's; "taken early
-- but left in the sideboard" describes those two, not a person's draft.
--
-- Plain drafts only (exploring drafts, D358, left out).  For every card a seat took: the decision
-- it was taken at (`picks.n`, 1 = first), and whether that seat's played main deck holds it
-- (`deck_cards`).  `inclusion` = taken copies that made the deck / taken copies.  A card taken
-- fewer than `min_taken` times is left out.
with took as (
    select p.cube, p.draft_id, p.seat, p.n, unnest(p.took) as card
    from picks p join drafts d using (draft_id)
    where not d.explore
), t as (
    select t.cube, t.card, t.n, dc.card is not null as in_deck
    from took t
    left join (select distinct draft_id, seat, card from deck_cards) dc
           on dc.draft_id = t.draft_id and dc.seat = t.seat and dc.card = t.card
)
select cube, card, count(*) as taken,
       round(avg(n), 2) as mean_pick_n, median(n) as median_pick_n,
       sum(case when in_deck then 1 else 0 end) as in_deck,
       round(avg(case when in_deck then 1.0 else 0.0 end), 4) as inclusion
from t
group by cube, card
having count(*) >= coalesce(getvariable('min_taken'), 1)
order by cube, mean_pick_n, card;
