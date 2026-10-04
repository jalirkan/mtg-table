id: J075
title: Regenerate ForgeCoach's four cube meta.json files (modern-era, pauper, synergy, vintage) from the queue's plain drafts, with D380's land counts (read-only on the queue)
public_title: Cube meta refresh
public_est: ~15 min
cpu: heavy
cores: 1
repos: mtg-table@af6f817 (main with meta.json counting nonbasic lands, PR #71, D380)
est: ~5-20 min on one core (reads each cube's queue drafts.jsonl once; sized at 4 GB so it fits beside a 6-7 worker job)
resumable: no
max_workers: 1
mem_per_worker_gb: 4
timeout: 1h
clean: var/cubelab/meta-regen
metrics: m = sh: node tools/cubelab/meta-regen-summary.mjs var/cubelab/meta-regen/out 2>/dev/null || echo '{"written":0}'
headline: m.written, m.min_drafts
decides: whether ForgeCoach's public/cubes metas are replaced by these four (the cloud session copies them)
hypothesis: every nonbasic land the builder played now has inDecks > 0 (D380), no key falls outside the cube, and each file rests on 100+ plain drafts
rule: D380; the final checks below (four files, schema 1, no orphan keys, a land counted in each, 100+ drafts)

ForgeCoach's draft and deck assistant reads `public/cubes/<cube>-cube-180.meta.json` (D297). The
shipped four come from small early runs (20-40 drafts each) and, before D380, every nonbasic land
read `inDecks: 0, games: 0`. This job rewrites the four from the queue's own folders
(`var/cubelab/queue/normal/<cube>`, every night so far), on the commit that counts lands (D380).

It is READ-ONLY on `var/cubelab/queue`: it copies each folder's `run.json`, `cards.json` and the
complete lines of `drafts.jsonl` into `var/cubelab/meta-regen/<cube>/` (a line still being written
by a running night is left out), and runs `tools/cubelab.sh meta` there, so no `meta.json` is
written into the queue. Drafts whose games explored (D358) are left out, as `meta` does by default.
Nothing is published by the job: the cloud session copies the four files into ForgeCoach's
`public/cubes/` from `results/J075/`.

## Pilot
About a minute: the meta tests on this commit, and the four queue folders are there.
```bash
node --test web/test/cubelab.test.ts
for c in modern-era pauper synergy vintage; do
  d=var/cubelab/queue/normal/$c
  test -s "$d/run.json" && test -s "$d/cards.json" && test -s "$d/drafts.jsonl"
  echo "$c: $(wc -l < "$d/drafts.jsonl") lines, $(du -h "$d/drafts.jsonl" | cut -f1)"
done
```
metrics: folders = sh: n=0; for c in modern-era pauper synergy vintage; do test -s var/cubelab/queue/normal/$c/drafts.jsonl && n=$((n+1)); done; echo $n
metrics: big = sh: m=0; for c in modern-era pauper synergy vintage; do s=$(stat -c %s var/cubelab/queue/normal/$c/drafts.jsonl 2>/dev/null || echo 0); [ "$s" -gt "$m" ] && m=$s; done; echo $((m / 1048576))
check: folders == 4
check: big < 450

## Commands
```bash
mkdir -p var/cubelab/meta-regen/out
for c in modern-era pauper synergy vintage; do
  src=var/cubelab/queue/normal/$c
  dst=var/cubelab/meta-regen/$c
  mkdir -p "$dst"
  cp "$src/run.json" "$src/cards.json" "$dst/"
  # complete lines only: a running night may be appending
  node -e 'const fs=require("fs");const b=fs.readFileSync(process.argv[1]);const k=b.lastIndexOf(10);fs.writeFileSync(process.argv[2],k<0?Buffer.alloc(0):b.subarray(0,k+1));' "$src/drafts.jsonl" "$dst/drafts.jsonl"
  tools/cubelab.sh meta "$dst" --cube "cubes/$c-cube-180.md"
  cp "$dst/meta.json" "var/cubelab/meta-regen/out/$c-cube-180.meta.json"
done
node tools/cubelab/meta-regen-summary.mjs var/cubelab/meta-regen/out --md > var/cubelab/meta-regen/out/summary.md
cat var/cubelab/meta-regen/out/summary.md
```
check: m.written == 4
check: m.min_drafts >= 100
check: m.orphans == 0
check: m.lands_counted >= 4
check: m.bad_schema == 0

## Abort if
abort: elapsed_s > 3600

## Report
collect: var/cubelab/meta-regen/out/modern-era-cube-180.meta.json
collect: var/cubelab/meta-regen/out/pauper-cube-180.meta.json
collect: var/cubelab/meta-regen/out/synergy-cube-180.meta.json
collect: var/cubelab/meta-regen/out/vintage-cube-180.meta.json
collect: var/cubelab/meta-regen/out/summary.md

summary.md, plainly: per cube the drafts and decisive games now behind the file (against the
shipped 20/20/40/20), how many nonbasic lands now have `inDecks > 0`, how many nonland cards still
read picked > 10 with `inDecks: 0` (D380 expects some: low-rated cards ride along in grid picks),
and the size of each file. Do not copy the files anywhere: the cloud session moves them to ForgeCoach.
