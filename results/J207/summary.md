# J207 — random-v8 (D532): failed in its pilot, no rated game; reposted as J208

2026-11-10. J207 never reached its rated commands. Its pilot ran both arms' four-game matches cleanly (the right
names and hashes, no errors), then failed two of its own checks:

    pmn.a == 1 (pmn.a = 0); pmn.b == 1 (pmn.b = 0)

The fault was in the job file, not in the lane. The metric `pmn` was a `node -e` one-liner that built each match
file's name with a JavaScript template literal, `${k}`. The runner runs a `sh:` metric through
`systemd-run … /bin/bash -c <command>`, and systemd expands `$VAR` and `${VAR}` in that argument list, so `${k}`
became the empty string, the metric read `match-.json`, caught the error and reported 0 for both arms. Reproduced
under the same `systemd-run` call: the old line prints `{"a":0,"b":0}`, the line with string concatenation prints
`{"a":1,"b":1}` on the same pilot files.

- Nothing rated was played; no number of the track changed.
- The rule from now on: no `$` in any `sh:` metric line. Command blocks are generated bash scripts and are not
  affected.
- J208 is J207 reposted on the same pin (`429ccd9e`) with that one line fixed and D532's rule quoted word for
  word (pc-jobs `869a9e49`). Its pilot passed 66 of 66 checks and it started at 10:51 EST. D532 names the night
  J207; its rule is applied to J208.
- Cost: about 25 minutes of an idle runner.
