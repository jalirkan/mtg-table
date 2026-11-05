# The atlas nights: one row per label file (`report/labels.json`), plus the folders without one

| night | contract | seat | spines | branched | labels | confident | confident by Forge map | partial | worker-h (branch) | confident / worker-h | disk GB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lab-j144 | (no label file) | | | | | | | | | | 4.9 |
| lab-j145 | (no label file) | | | | | | | | | | 1.0 |
| lab-j150 | (no label file) | | | | | | | | | | 17.8 |
| lab-j150.j151-partial-1247 | (no label file) | | | | | | | | | | 1.6 |
| lab-j150.j155-partial-1455 | (no label file) | | | | | | | | | | 1.5 |
| lab-j157 | (no label file) | | | | | | | | | | 4.1 |
| lab-j158 | mtg-table rung-3 label v1 (J158) | ? | 0 | 32 | 32 | 6 | 2 | None | None |  | 12.7 |
| lab-j159 | (no label file) | | | | | | | | | | 1.0 |
| lab-j160 | (no label file) | | | | | | | | | | 1.7 |
| lab-j161 | (no label file) | | | | | | | | | | 0.0 |
| lab-j162 | mtg-table rung-3 label v1 (J158) | ? | 0 | 64 | 59 | 7 | 5 | None | None |  | 8.8 |
| lab-j163 | (no label file) | | | | | | | | | | 0.0 |
| lab-j164 | mtg-table rung-3 label v1 (J158) | ? | 0 | 8 | 8 | 2 | 0 | None | None |  | 1.3 |
| lab-j165 | (no label file) | | | | | | | | | | 0.0 |
| lab-j166 | mtg-table rung-4a label v3 (J169) | pre-D485,D485 | 13 | 136 | 97 | 27 | 2 | None | None |  | 16.1 |
| lab-j170 | mtg-table rung-4b label v4 (J170) | D486 | 13 | 147 | 101 | 28 | 1 | None | None |  | 12.4 |
| lab-j173 | (no label file) | | | | | | | | | | 7.4 |
| lab-j174 | (no label file) | | | | | | | | | | 0.0 |
| lab-j175 | (no label file) | | | | | | | | | | 0.0 |
| lab-j176 | mtg-table rung-4b label v6 (J176) | D488 | 13 | 147 | 68 | 30 | 5 | 33 | 35.2 | 0.852 | 7.4 |
| lab-j177 | mtg-table rung-4b label v6 (J176) | D493 | 13 | 181 | 92 | 30 | 2 | 29 | 53.3 | 0.563 | 10.9 |
| lab-j178 | (no label file) | | | | | | | | | | 0.0 |
| lab-j179 | (no label file) | | | | | | | | | | 0.0 |
| lab-j180 | mtg-table rung-4b label v6 (J177) | D493 | 13 | 163 | 76 | 24 | 3 | 29 | 43.6 | 0.551 | 8.6 |
| lab-j181 | mtg-table rung-4b label v6 (J177) | D497 | 13 | 153 | 80 | 23 | 5 | 35 | 49.6 | 0.464 | 9.2 |
| lab-j182 | mtg-table rung-4b label v6 (J177) | D498 | 13 | 198 | 89 | 26 | 6 | 34 | 57.6 | 0.451 | 10.9 |
| lab-j183 | mtg-table rung-4b label v6 (J177) | D498 | 13 | 161 | 86 | 30 | 4 | 43 | 62.2 | 0.483 | 10.2 |
| lab-j185 | mtg-table rung-4b label v6 (J177) | D507 | 13 | 187 | 88 | 20 | 4 | 34 | 53.2 | 0.376 | 11.4 |
| lab-j186 | (no label file) | | | | | | | | | | 10.5 |
| lab-j187 | mtg-table rung-4b label v6 (J177) | D508 | 13 | 163 | 83 | 28 | 1 | 47 | 51.8 | 0.541 | 10.0 |
| lab-j188 | mtg-table rung-4b label v6 (J177) | D508 | 13 | 168 | 85 | 24 | 0 | 40 | 43.4 | 0.553 | 8.9 |
| lab-j189 | (no label file) | | | | | | | | | | 0.0 |
| lab-j190 | mtg-table rung-4b label v6 (J177) | D508 | 13 | 176 | 86 | 17 | 1 | 38 | 62.2 | 0.273 | 11.6 |
| lab-j191 | mtg-table rung-4b label v6 (J177) | D508 | 13 | 171 | 88 | 25 | 2 | 33 | 63.7 | 0.392 | 10.8 |
| lab-j192 | (no label file) | | | | | | | | | | 0.0 |
| lab-j193 | (no label file) | | | | | | | | | | 1.7 |

Totals over label files: 2255 branched rows, 1218 complete labels, 347 confident (of them 43 confident on the Forge map), 395 partial labels, 575.8 branch worker-hours where the file states them. Disk over every lab-j* folder: 214.3 GB.
D508 seat only: 342 labels, 94 confident, 221.1 worker-hours (0.425 confident a worker-hour).

Confident labels are NOT distinct decisions across nights: nights on one seat replay the same 13 deck seeds only when the job says so (D508 population: fresh deck seeds each night, J186-J191). Nights on different seats are never pooled for training (D486, D488).
