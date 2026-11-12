# J213: the label probe (D538) -- does agreement with the judged labels track Elo?

**The rule read** (agreement.py --rule d538, exit 0): **AGREEMENT DOES NOT TRACK ELO**. Wave 2 (point 9): not bought. Look 1.


| pair | A - B | delta [95%] |
|---|---|---|
| P1 | search-v1-anytime - forge-default | +0.0194 [-0.0208, +0.0604] (n 515) |
| P1, source!=round2 | the same, the 409 labels nobody selected | +0.0024 [-0.0331, +0.0400] (n 409) |
| P2 | search-v1-anytime - search-v2-rrandom | -0.0660 [-0.1109, -0.0208] (n 515) |
| P3 | search-v1-anytime - search-v2-rrandom4 | -0.0634 [-0.1072, -0.0180] (n 515) |

Audit (rows as the files hold them): {"badOption": 0, "badRepeat": 0, "badSearched": 0, "duplicates": 0, "overTries": 0, "seedMismatch": 0, "unkeyed": 0, "unknownKey": 0, "unknownStatus": 0}; decisions 605; cells {"fd": 605, "po": 605, "rr": 1815, "rr4": 1815, "v1": 1815}; labelled 515; labels sha256 ok 1.

Dropped from point 8 (from the end): none. Rows: 0 errors held, the largest error share 0.0000, 0 unsupported.

| player | rows | statuses | attempts (rc, wall s, workers) |
|---|---|---|---|
| forge-default | 605 / 605 | {"ok": 605} | (0, 288.5, 6) |
| policy-outlet | 605 / 605 | {"mismatch": 1, "ok": 604} | (0, 288.6, 6) |
| search-v1-anytime | 1815 / 1815 | {"mismatch": 6, "ok": 1809} | (0, 959.6, 6) |
| search-v2-a1 | 1815 / 1815 | {"mismatch": 11, "ok": 1804} | (0, 998.3, 6) |
| search-v2-ms750-r6 | 1815 / 1815 | {"mismatch": 8, "ok": 1807} | (0, 862.5, 6) |
| search-v2-no-b | 1815 / 1815 | {"mismatch": 7, "ok": 1808} | (0, 964.5, 6) |
| search-v2-rmix4them-m40 | 1815 / 1815 | {"mismatch": 6, "ok": 1809} | (0, 967.3, 6) |
| search-v2-rrandom | 1815 / 1815 | {"mismatch": 7, "off-atlas": 5, "ok": 1803} | (0, 975.7, 6) |
| search-v2-rrandom4 | 1815 / 1815 | {"mismatch": 7, "off-atlas": 4, "ok": 1804} | (0, 977.2, 6) |
| search-v2-rrandom4-m40 | 1815 / 1815 | {"mismatch": 9, "off-atlas": 4, "ok": 1802} | (0, 974.5, 6) |
| search-v2-t1 | 1815 / 1815 | {"mismatch": 7, "ok": 1808} | (0, 1061.4, 6) |
| search-v2-t1-x3 | 1815 / 1815 | {"mismatch": 7, "ok": 1808} | (0, 1464.5, 6) |

P1 by subset, from the rule read (deciding nothing, D538 point 8):

- all: +0.0194 [-0.0208, +0.0604] (n 515)
- p: +0.0399 [-0.0000, +0.0818] (n 334)
- a: -0.0258 [-0.1214, +0.0640] (n 142)
- b: +0.0085 [-0.1429, +0.1754] (n 39)
- label!=forge: +0.2507 [+0.1915, +0.3128] (n 226)
- label=forge: -0.1615 [-0.2109, -0.1158] (n 289)
- source=round2: +0.0849 [-0.0511, +0.2119] (n 106)
- source!=round2: +0.0024 [-0.0331, +0.0400] (n 409)

Beside the rule, deciding nothing (D538 point 8): agreement.py over every player probed, --off-atlas miss and drop.

| player | Elo vs search-v1-anytime | agreement | option 0 | option 0 at label=forge | option 0 at label!=forge | departure precision | answered | off-atlas | repeats agree |
|---|---|---|---|---|---|---|---|---|---|
| forge-default | -89.4 [-105.1, -73.9] J210 pab | +0.5612 [+0.5094, +0.6111] (n 515) | +1.0000 [+1.0000, +1.0000] (n 515) | +1.0000 [+1.0000, +1.0000] (n 289) | +1.0000 [+1.0000, +1.0000] (n 226) | - | 515 | 0 | 1.000 |
| policy-outlet | -84.4 [-99.9, -69.3] J204 b | +0.5612 [+0.5094, +0.6111] (n 515) | +1.0000 [+1.0000, +1.0000] (n 515) | +1.0000 [+1.0000, +1.0000] (n 289) | +1.0000 [+1.0000, +1.0000] (n 226) | - | 515 | 0 | 1.000 |
| search-v1-anytime | +0.0 [+0.0, +0.0] the reference | +0.5806 [+0.5377, +0.6224] (n 515) | +0.7230 [+0.6715, +0.7700] (n 515) | +0.8385 [+0.7891, +0.8842] (n 289) | +0.5752 [+0.5058, +0.6452] (n 226) | +0.3972 [+0.3154, +0.4812] (n 160) | 515 | 0 | 0.934 |
| search-v2-a1 | +5.2 [-5.7, +16.2] match-J212-a1.json | +0.5773 [+0.5342, +0.6173] (n 515) | +0.7417 [+0.6955, +0.7851] (n 515) | +0.8512 [+0.8109, +0.8897] (n 289) | +0.6018 [+0.5357, +0.6681] (n 226) | +0.3860 [+0.3090, +0.4645] (n 159) | 515 | 0 | 0.887 |
| search-v2-ms750-r6 | -6.5 [-11.7, -1.3] J198 | +0.5696 [+0.5292, +0.6084] (n 515) | +0.7443 [+0.6972, +0.7882] (n 515) | +0.8443 [+0.8017, +0.8833] (n 289) | +0.6165 [+0.5519, +0.6822] (n 226) | +0.3747 [+0.2987, +0.4505] (n 148) | 515 | 0 | 0.932 |
| search-v2-no-b | -2.2 [-7.4, +3.1] match-J211.json | +0.5806 [+0.5362, +0.6220] (n 515) | +0.7502 [+0.7006, +0.7962] (n 515) | +0.8570 [+0.8097, +0.8996] (n 289) | +0.6136 [+0.5477, +0.6791] (n 226) | +0.3990 [+0.3125, +0.4821] (n 145) | 515 | 0 | 0.938 |
| search-v2-rmix4them-m40 | -6.9 [-17.8, +3.9] J209 a | +0.5709 [+0.5278, +0.6122] (n 515) | +0.7618 [+0.7131, +0.8067] (n 515) | +0.8570 [+0.8090, +0.8992] (n 289) | +0.6401 [+0.5702, +0.7074] (n 226) | +0.3777 [+0.2976, +0.4610] (n 142) | 515 | 0 | 0.924 |
| search-v2-rrandom | -43.7 [-57.1, -30.4] J199 a | +0.6466 [+0.6040, +0.6868] (n 515) | +0.5877 [+0.5370, +0.6364] (n 515) | +0.7809 [+0.7215, +0.8333] (n 289) | +0.3407 [+0.2756, +0.4104] (n 226) | +0.5055 [+0.4331, +0.5763] (n 255) | 515 | 1 | 0.773 |
| search-v2-rrandom4 | -39.5 [-53.9, -25.3] J202 a | +0.6440 [+0.6009, +0.6845] (n 515) | +0.5929 [+0.5463, +0.6389] (n 515) | +0.7797 [+0.7213, +0.8317] (n 289) | +0.3540 [+0.2896, +0.4230] (n 226) | +0.5072 [+0.4326, +0.5795] (n 255) | 515 | 1 | 0.773 |
| search-v2-rrandom4-m40 | -20.9 [-34.1, -7.7] J202 b | +0.6349 [+0.5922, +0.6770] (n 514) | +0.6505 [+0.6022, +0.6975] (n 514) | +0.8125 [+0.7538, +0.8653] (n 288) | +0.4440 [+0.3746, +0.5164] (n 226) | +0.5139 [+0.4333, +0.5925] (n 222) | 514 | 1 | 0.798 |
| search-v2-t1 | -1.7 [-14.6, +11.2] match-J212-t1.json | +0.5935 [+0.5540, +0.6331] (n 515) | +0.7275 [+0.6819, +0.7712] (n 515) | +0.8454 [+0.7974, +0.8896] (n 289) | +0.5767 [+0.5145, +0.6389] (n 226) | +0.4371 [+0.3618, +0.5127] (n 179) | 515 | 0 | 0.831 |
| search-v2-t1-x3 | +9.8 [-1.7, +21.4] match-J212-x3.json | +0.5947 [+0.5528, +0.6356] (n 514) | +0.6978 [+0.6461, +0.7458] (n 514) | +0.8310 [+0.7808, +0.8779] (n 288) | +0.5280 [+0.4646, +0.5941] (n 226) | +0.4270 [+0.3460, +0.5108] (n 188) | 514 | 0 | 0.848 |

Pairs, A - B, --off-atlas miss | drop:

- search-v1-anytime - forge-default: +0.0194 [-0.0208, +0.0604] (n 515) | +0.0194 [-0.0208, +0.0604] (n 515)
- search-v1-anytime - search-v2-rrandom: -0.0660 [-0.1109, -0.0208] (n 515) | -0.0660 [-0.1109, -0.0208] (n 515)
- search-v1-anytime - search-v2-rrandom4: -0.0634 [-0.1072, -0.0180] (n 515) | -0.0638 [-0.1073, -0.0186] (n 515)
- search-v1-anytime - policy-outlet: +0.0194 [-0.0208, +0.0604] (n 515) | +0.0194 [-0.0208, +0.0604] (n 515)
- search-v1-anytime - search-v2-rrandom4-m40: -0.0551 [-0.0960, -0.0130] (n 514) | -0.0551 [-0.0960, -0.0130] (n 514)
- search-v1-anytime - search-v2-rmix4them-m40: +0.0097 [-0.0098, +0.0292] (n 515) | +0.0097 [-0.0098, +0.0292] (n 515)
- search-v1-anytime - search-v2-ms750-r6: +0.0110 [-0.0056, +0.0288] (n 515) | +0.0110 [-0.0056, +0.0288] (n 515)
- search-v1-anytime - search-v2-no-b: +0.0000 [-0.0118, +0.0122] (n 515) | +0.0000 [-0.0118, +0.0122] (n 515)
- search-v1-anytime - search-v2-t1: -0.0129 [-0.0359, +0.0095] (n 515) | -0.0129 [-0.0359, +0.0095] (n 515)
- search-v1-anytime - search-v2-a1: +0.0032 [-0.0192, +0.0238] (n 515) | +0.0032 [-0.0192, +0.0238] (n 515)
- search-v1-anytime - search-v2-t1-x3: -0.0149 [-0.0348, +0.0046] (n 514) | -0.0149 [-0.0348, +0.0046] (n 514)
- search-v2-rrandom - forge-default: +0.0854 [+0.0242, +0.1437] (n 515) | +0.0854 [+0.0242, +0.1437] (n 515)
- search-v2-rrandom4 - forge-default: +0.0828 [+0.0192, +0.1421] (n 515) | +0.0832 [+0.0196, +0.1422] (n 515)

Not produced: the rank correlation of agreement against Elo (D538 point 8); agreement.py computes none and this job writes no statistic of its own.
