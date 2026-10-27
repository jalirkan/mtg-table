# (2b') The n curve, smoothed over 5 bootstrap seeds

Expected confident count at a cap of N random branches (the as-run stops kept), mean over 5 seeds; "kept" = the expected overlap with the 200-branch set (a product of the per-seed flags is not taken: both are seed means). Cost = random rows i < N plus the Forge map.

| seat | N | E[confident] | E[overlap with 200] | wh | confident / wh |
|---|---|---|---|---|---|
| old | 25 | 13.60 | 8.80 | 9.14 | 1.49 |
| old | 50 | 17.80 | 14.00 | 16.51 | 1.08 |
| old | 75 | 18.80 | 15.60 | 22.68 | 0.83 |
| old | 100 | 18.80 | 17.00 | 28.81 | 0.65 |
| old | 125 | 26.80 | 23.40 | 34.19 | 0.78 |
| old | 150 | 28.00 | 25.40 | 39.56 | 0.71 |
| old | 175 | 28.20 | 25.80 | 44.33 | 0.64 |
| old | 200 | 27.80 | 27.80 | 49.11 | 0.57 |
| D486 | 25 | 17.20 | 12.00 | 9.68 | 1.78 |
| D486 | 50 | 17.60 | 15.00 | 17.92 | 0.98 |
| D486 | 75 | 19.00 | 17.60 | 24.23 | 0.78 |
| D486 | 100 | 22.20 | 19.80 | 30.57 | 0.73 |
| D486 | 125 | 22.40 | 21.20 | 36.25 | 0.62 |
| D486 | 150 | 28.80 | 23.80 | 41.93 | 0.69 |
| D486 | 175 | 27.20 | 23.80 | 47.23 | 0.58 |
| D486 | 200 | 28.80 | 28.80 | 52.39 | 0.55 |
| D488 | 25 | 7.00 | 5.00 | 1.07 | 6.53 |
| D488 | 50 | 8.00 | 6.00 | 1.84 | 4.35 |
| D488 | 75 | 7.00 | 5.80 | 2.51 | 2.79 |
| D488 | 100 | 9.00 | 7.80 | 3.19 | 2.82 |
| D488 | 125 | 7.80 | 7.00 | 3.80 | 2.05 |
| D488 | 150 | 8.00 | 7.80 | 4.42 | 1.81 |
| D488 | 175 | 8.00 | 7.80 | 4.97 | 1.61 |
| D488 | 200 | 8.80 | 8.80 | 5.53 | 1.59 |
| all | 25 | 37.80 | 25.80 | 19.89 | 1.90 |
| all | 50 | 43.40 | 35.00 | 36.27 | 1.20 |
| all | 75 | 44.80 | 39.00 | 49.42 | 0.91 |
| all | 100 | 50.00 | 44.60 | 62.57 | 0.80 |
| all | 125 | 57.00 | 51.60 | 74.25 | 0.77 |
| all | 150 | 64.80 | 57.00 | 85.92 | 0.75 |
| all | 175 | 63.40 | 57.40 | 96.53 | 0.66 |
| all | 200 | 65.40 | 65.40 | 107.02 | 0.61 |

## Extending every decision not confident at 200 to 300 / 400 (projection)

Paired difference between the 200-branch best option and o0. "Optimistic" takes the observed difference as the truth's centre; "discounted" halves it for the new rows (the best is picked after the fact, so its lead is inflated). Cost: each decision's own per-branch cost over its options still running at 150–200.

| N | decisions | E[new confident] optimistic | discounted | extra wh | conf / wh optimistic | discounted |
|---|---|---|---|---|---|---|
| 300 | 157 | 13.20 | 6.15 | 28.77 | 0.46 | 0.21 |
| 400 | 157 | 21.63 | 9.25 | 57.53 | 0.38 | 0.16 |

For comparison, new decisions yield the design's own rate (see budget.md (2b): ~0.6 confident / wh at 200, ~0.74 at 150).
