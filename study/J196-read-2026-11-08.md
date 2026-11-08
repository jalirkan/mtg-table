# J196 read (2026-11-08, the PC session): evaluator v3 for the win-chance strip

**Two runs of one configuration.** The lab runner's own J196 (pin 310ba71b) trained v3 on 2026-11-07 (encode, merge,
split audit PASS, dry load 15.0 GB, the fit to best epoch 15 of 39, val log-loss 0.4918) and was OOM-killed in the
scoring after the fit at 00:20 while a GPU painter held 12 GB beside it; the runner holds it and is re-running the
whole fit under the new runner (D521) as the record. The PC session ran the SAME fit by hand from 06:40 to 09:50
(`train_eval.py nights-1-5 --split-by pair --compact --fast --load-subsample 0.5 --subsample 0.5 --hidden 128 --dim 8
--l2 0.001 --card-l2 0.001 --dropout 0.1 --lr 0.001 --batch 4096 --epochs 400 --patience 24 --aux-turns 0.1 --seed 0`;
load ~2 h, fit 2817 s, peak RSS 13.0 GB; model sha12 a0c0937fa7c2) and ran J196's run4 on it. This read is of that
run; the runner's will be read beside it when it lands and the two should agree to the seed.

**The rule** (the play-AI review §5 row 7, D364's `eval_compare` on v2's own test pairs; the job's wording): **BETTER.**

| compare | pairs | rows | old log-loss | new log-loss | old − new [95%] | ECE old → new |
|---|---|---|---|---|---|---|
| **the rule**: v3 vs v2 on `nights-1-3`'s test pairs | 873 | 1,925,816 | 0.4912 | 0.4856 | **+0.0055 [+0.0034, +0.0076]** | 0.0063 → 0.0090 |
| report only: five nights' test pairs (`nights-1-5`) | 1,885 | 3,944,941 | 0.4923 | 0.4878 | +0.0045 [+0.0030, +0.0060] | 0.0050 → 0.0088 |
| &nbsp;&nbsp;of which v2's reference pairs | 873 | 2,721,487 | 0.4926 | 0.4882 | +0.0044 [+0.0027, +0.0061] | 0.0048 → 0.0078 |
| &nbsp;&nbsp;of which the new nights' pairs | 1,012 | 1,223,454 | 0.4917 | 0.4870 | +0.0046 [+0.0019, +0.0074] | 0.0077 → 0.0117 |
| &nbsp;&nbsp;exploring positions | 291 | 480,366 | 0.4942 | 0.4913 | +0.0029 [−0.0013, +0.0070] | 0.0083 → 0.0096 |
| report only: v3 vs v1 (`night-1-eval`) on the same test pairs | 873 | 1,925,816 | 0.5065 | 0.4856 | +0.0209 [+0.0171, +0.0245] | 0.0062 → 0.0090 |

Read: a real but small gain in log-loss, about a fifth of the v1→v2 step (+0.0055 against v2's +0.0209 over v1 on the
same rows), bought with 2.3× the games; consistent across v2's pairs and the new nights' pairs; not significant on
the exploring positions; and calibration is slightly WORSE (ECE 0.0063 → 0.0090), which the strip would show as
win-chances a touch too confident. The strip's loader accepts the model (`eval_serve` ready, schema
82815752c2f5e346, 12,670 features). `eval_compare` refused nothing: v3 trained on none of v2's test pairs (the merge
kept every pair's name and split, D518).

**What follows.** BETTER → the register-v3-strip follow-up (cube lab 39): config.json `coach.evalModel` (D518's key)
under a decision of its own, for the strip only, never the search leaf (J194 and §3b closed that). Not started: the
owner decides. The ECE should be in that decision (a temperature fit on the val rows is the cheap remedy if it
matters on the strip). `human_eval` is not a gate for a strip model (D369 reads the first 30 games once).

**The memory lesson** is D520 (the fit saves its model first; `--resume-model`) and D521 (the runner uses the whole
machine): a kill after training can no longer cost a fit, and the runner no longer parks a killed job behind a
nine-hour match.

**The runner's own run** (added 2026-11-08 14:55): J196's retry under D521's runner ran 09:54–14:50 (encode skipped,
dry load 14.7 GB peak, the fit, the compares), 16/16 checks PASS, and reads the same way: BETTER on v2's test pairs,
BETTER on the five-night pairs, BETTER against v1 (`cmp.better`, `cmpn.better`, `cmp1.better` all 1). The two runs of
one seed agree; the runner's model is the record.
