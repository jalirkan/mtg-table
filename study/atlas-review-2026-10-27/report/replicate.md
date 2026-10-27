# Do confident labels survive the seat change? (old J169 vs D486 J171, same decisions)

69 complete decisions pair (same spine, index, turn, kind and option tokens). "both / either" is a replication rate: the share of decisions confident on one seat that are confident on the other too.

## all

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| all | 69 | 21 | 21 | 29 | 13 | 12 | 0.45 |

## by kind

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| attack | 18 | 7 | 4 | 7 | 4 | 4 | 0.57 |
| block | 2 | 1 | 2 | 2 | 1 | 1 | 0.50 |
| priority | 49 | 13 | 15 | 20 | 8 | 7 | 0.40 |

## by k

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| 2 | 9 | 2 | 2 | 3 | 1 | 1 | 0.33 |
| 3 | 20 | 5 | 4 | 6 | 3 | 3 | 0.50 |
| 4 | 15 | 5 | 7 | 9 | 3 | 3 | 0.33 |
| 5-6 | 21 | 7 | 7 | 9 | 5 | 4 | 0.56 |
| 7+ | 4 | 2 | 1 | 2 | 1 | 1 | 0.50 |

## by turn

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| 1-4 | 4 | 1 | 1 | 1 | 1 | 1 | 1.00 |
| 15+ | 17 | 5 | 4 | 7 | 2 | 2 | 0.29 |
| 5-8 | 23 | 6 | 5 | 8 | 3 | 2 | 0.38 |
| 9-14 | 25 | 9 | 11 | 13 | 7 | 7 | 0.54 |

## by the old seat's regret at 50 branches

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| 0-.10 | 28 | 6 | 11 | 13 | 4 | 4 | 0.31 |
| >=.10 | 17 | 14 | 9 | 14 | 9 | 8 | 0.64 |
| o0 leads | 24 | 1 | 1 | 2 | 0 | 0 | 0.00 |

## by the old label's low end

| cell | paired decisions | confident old | confident D486 | either | both | both, same best | both / either |
|---|---|---|---|---|---|---|---|
| lo .01-.03 | 2 | 2 | 1 | 2 | 1 | 1 | 0.50 |
| lo <= .01 | 4 | 4 | 2 | 4 | 2 | 1 | 0.50 |
| lo > .03 | 15 | 15 | 10 | 15 | 10 | 10 | 0.67 |
| not confident | 48 | 0 | 8 | 8 | 0 | 0 | 0.00 |
