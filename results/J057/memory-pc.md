# J057 — killed by systemd-oomd at 02:51:48 after 7 min 20 s (PC, 30 s samples)
train_eval.py RSS: 0.13 GB at 02:44 -> 1.6 GB (02:45:46) -> 4.0 GB (02:47:46) -> 7.0 GB (02:49:46) -> 17.1 GB (02:51:17) -> 19.1 GB (02:51:48), still climbing when killed. Unit peak 18.3-19.7 GB + 1.0 GB swap (its cap). The fit needs MORE than 19 GB as written; 15 GB declared is too low and it may not fit in the 23.4 GB lab budget at all.
journal: `systemd-oomd: Killed …/forgecoach-lab.slice/lab-J057-run1.service due to memory pressure`; runner: `J057: waiting (memory: step run1 was killed without an exit code)`; retry after 03:06:59.
Raw: ~/code/mtg-table-install/var/j057-mem.log
