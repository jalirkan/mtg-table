# J060 — measured on the PC (30 s samples), so far
- Pilot dry-load (full night-1 set): train_eval.py RSS peak 4.69 GB; unit peak 6.0 GB (with page cache). Passed the < 8 GB check.
- Run (06:05, about 15 min in): RSS 4.7 GB, unit peak 5.3 GB. The fix works on the real data.
- **But it is not a 1-core job:** train_eval.py runs 16 threads at ~680% CPU (numpy's BLAS pool). With J059's 5 JVMs beside it the load average is 23-24 on 16 threads, and J059's rate fell from ~3,500 to ~3,050 drafts/h. Nothing is failing. Either declare its real width (cores: 7) or pin BLAS (`OMP_NUM_THREADS` / `OPENBLAS_NUM_THREADS`) to the declared cores.
Raw: ~/code/mtg-table-install/var/j060-mem.log

## Final (job done 09:14:52, fit.pass 1)
- Whole run: train_eval.py RSS peak **4.86 GB**; unit peak (with page cache) **6.41 GB**. Run time 05:47 -> 09:14 (3 h 27 min) beside J059.
