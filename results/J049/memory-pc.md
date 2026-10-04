# J049 — measured memory (PC, 30 s samples, 2026-10-03 21:36 to 2026-10-04 02:16)
- dataset.py (encode, one process): RSS 1.5-1.8 GB for 4 h 35 min; unit peak (with page cache) 5.8 GB. Output: 6,343,314 rows from 39,177 games, 1,265 shards, 536 MB.
- train_eval.py (fit): RSS rose to 10.3-10.7 GB within about 4 minutes of starting (02:11 -> 02:16) and was still at that level when stopped; unit peak 11.6 GB (systemd: 10.7 G peak + 1.0 G swap peak). It may go higher: it only ran 5 minutes. Set mem_gb to at least 13.
- gate_metrics.py: 5 MB.
Raw samples: ~/code/mtg-table-install/var/j049-mem2.log
