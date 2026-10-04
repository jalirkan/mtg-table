id: J065
title: Storage measurement for the lab warehouse: drafts.jsonl vs Parquet (zstd) with DuckDB query times, and zstd vs gzip on a sample of recordings (read-only)
public_title: Storage measurement
public_est: ~15 min
cpu: heavy
cores: 1
repos: mtg-table@c09ddfa
est: ~10-20 min on one core (reads up to 120 MB of drafts.jsonl and 120 recordings; sized at 3 GB so it fits beside a 7-worker job)
resumable: no
max_workers: 1
mem_per_worker_gb: 3
timeout: 1h
clean: var/storage
metrics: rep = sh: python3 -c "import json; d=json.load(open('var/storage/storage-report.json')); print(json.dumps({'written':1,'ratio':d['drafts']['ratio'],'drafts':d['drafts']['drafts'],'zstd19':d['recordings'].get('zstd19',{}).get('vsGzip',0)}))" 2>/dev/null || echo '{"written":0}'

Justin asked for a DuckDB + Parquet "lab warehouse" for the draft and game records. This job measures
before anything is built. It is READ-ONLY on `var/cubelab/queue`: it writes only under `var/storage/`.
It reads only complete lines, so it is safe beside a running queue night.

1. Up to 120 MB of `drafts.jsonl` (all keys) is flattened into drafts / games / picks / deck_cards
   Parquet tables (zstd, dictionary-encoded card names), with sizes vs the JSONL, the JSON parse time,
   and four DuckDB query times.
2. 120 random game recordings (`.jsonl.gz`) are re-compressed with zstd -3, -19 and -19 plus a trained
   dictionary: ratio vs gzip, plus compression and decompression speed.

## Pilot
metrics: deps = sh: python3 -c "import duckdb, pyarrow, pandas, zstandard; print(1)" 2>/dev/null || echo 0
check: deps == 1
```bash
python3 -c "import duckdb, pyarrow, pandas, zstandard; print(duckdb.__version__, pyarrow.__version__, pandas.__version__)"
```

## Commands
```bash
mkdir -p var/storage
cat > var/storage/measure_storage.py <<'PY'
# SPDX-License-Identifier: GPL-3.0-or-later
"""Storage measurement for the lab warehouse idea (read-only on the lab's data).

Part 1, drafts: reads every complete line of <root>/*/*/drafts.jsonl, flattens it into
drafts / games / picks / deck_cards tables, writes Parquet (zstd), and compares sizes and
query times with the JSONL. Part 2, recordings: recompresses a random sample of the
gzipped game recordings with zstd (levels 3 and 19, and 19 with a trained dictionary)
and reports ratios and decompression speed. Writes only under --out.
"""
import argparse, glob, gzip, json, os, random, resource, sys, time

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import zstandard as zstd


def peak_gb():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 / 1024


def flatten(root, out, limit_bytes):
    files = sorted(glob.glob(os.path.join(root, "*", "*", "drafts.jsonl")))
    drafts, games, picks, decks = [], [], [], []
    in_bytes = 0
    t0 = time.time()
    for f in files:
        key = os.path.relpath(os.path.dirname(f), root)  # normal/<cube> or bridge/<a>+<b>
        with open(f, "rb") as fh:
            for raw in fh:
                if not raw.endswith(b"\n"):
                    break  # a line still being written
                in_bytes += len(raw)
                d = json.loads(raw)
                did = len(drafts)
                m = d.get("match") or {}
                pe = d.get("playExplore")
                drafts.append({
                    "draft_id": did, "key": key, "cube": d.get("cube"), "seed": d.get("seed"),
                    "format": d.get("format"), "ver": d.get("ver"), "night": d.get("night"),
                    "explore": bool(pe), "winner": m.get("winner"),
                    "wins_a": m.get("winsA"), "wins_b": m.get("winsB"),
                    "ms_match": (d.get("ms") or {}).get("match"), "json_bytes": len(raw),
                })
                for g in m.get("games") or []:
                    games.append({
                        "draft_id": did, "n": g.get("n"), "on_play": g.get("onPlay"),
                        "winner": g.get("winner"), "turns": g.get("turns"), "ms": g.get("ms"),
                        "timeout": bool(g.get("timeout")), "reason": g.get("reason"),
                        "error": g.get("error") is not None, "recorded": bool(g.get("recorded")),
                    })
                for dr in d.get("drafters") or []:
                    seat = dr.get("seat")
                    for p in dr.get("picks") or []:
                        picks.append({
                            "draft_id": did, "seat": seat, "n": p.get("n"), "kind": p.get("kind"),
                            "seen": [str(x) for x in (p.get("seen") or [])],
                            "took": [str(x) for x in (p.get("took") or [])],
                            "value": p.get("value"),
                        })
                    deck = dr.get("deck") or {}
                    for c in deck.get("main") or []:
                        if isinstance(c, list) and len(c) == 2:
                            name, count = c[0], c[1]
                        else:
                            name, count = c, 1
                        decks.append({"draft_id": did, "seat": seat, "colors": deck.get("colors"),
                                      "card": str(name), "count": count})
                if in_bytes >= limit_bytes:
                    break
        if in_bytes >= limit_bytes:
            break
    parse_s = time.time() - t0
    os.makedirs(out, exist_ok=True)
    sizes = {}
    for name, rows in (("drafts", drafts), ("games", games), ("picks", picks), ("deck_cards", decks)):
        path = os.path.join(out, f"{name}.parquet")
        tbl = pa.Table.from_pandas(pd.DataFrame(rows), preserve_index=False)
        pq.write_table(tbl, path, compression="zstd", use_dictionary=True)
        sizes[name] = os.path.getsize(path)
    return {"files": len(files), "drafts": len(drafts), "games": len(games), "picks": len(picks),
            "deckCards": len(decks), "jsonlBytes": in_bytes, "jsonParseSeconds": round(parse_s, 1),
            "parquetBytes": sizes, "parquetTotal": sum(sizes.values()),
            "ratio": round(in_bytes / max(1, sum(sizes.values())), 1)}


def queries(out):
    con = duckdb.connect()
    p = lambda n: os.path.join(out, f"{n}.parquet")
    qs = {
        "win_rate_by_cube": f"select cube, count(*) n, avg(case when winner='A' then 1.0 else 0 end) a_win from '{p('drafts')}' group by cube",
        "card_pick_counts": f"select t.took, count(*) n from (select unnest(took) took from '{p('picks')}') t group by 1 order by 2 desc limit 20",
        "card_deck_win_rate": (f"select d.card, count(*) n, avg(case when x.winner=d.seat then 1.0 else 0 end) wr "
                               f"from '{p('deck_cards')}' d join '{p('drafts')}' x using(draft_id) "
                               f"where not x.explore group by 1 having count(*) >= 50 order by 3 desc limit 20"),
        "game_lengths": f"select turns, count(*) from '{p('games')}' group by 1 order by 1",
    }
    res = {}
    for k, q in qs.items():
        t0 = time.time(); con.execute(q).fetchall(); res[k] = round(time.time() - t0, 3)
    return res


def recordings(root, sample, seed):
    files = glob.glob(os.path.join(root, "*", "*", "games", "*", "*.jsonl.gz"))
    random.Random(seed).shuffle(files)
    pick = files[:sample]
    raws, gz_bytes = [], 0
    for f in pick:
        gz_bytes += os.path.getsize(f)
        with gzip.open(f, "rb") as fh:
            raws.append(fh.read())
    raw_bytes = sum(len(r) for r in raws)
    out = {"recordingsTotal": len(files), "sampled": len(pick), "gzipBytes": gz_bytes, "rawBytes": raw_bytes}
    if not raws:
        return out
    half = len(raws) // 2 or 1
    train, test = raws[:half], raws[half:] or raws[:half]
    test_raw = sum(len(r) for r in test)
    test_gz = sum(os.path.getsize(f) for f in (pick[half:] or pick[:half]))
    out["testGzipBytes"] = test_gz
    for label, level, dict_data in (("zstd3", 3, None), ("zstd19", 19, None), ("zstd19dict", 19, "train")):
        d = None
        if dict_data:
            chunks = [r[i:i + 16384] for r in train for i in range(0, len(r), 16384)]
            try:
                d = zstd.train_dictionary(112_640, chunks)
            except zstd.ZstdError as e:
                out[label] = {"error": str(e)}
                continue
        c = zstd.ZstdCompressor(level=level, dict_data=d)
        t0 = time.time(); comp = [c.compress(r) for r in test]; cs = time.time() - t0
        dd = zstd.ZstdDecompressor(dict_data=d)
        t0 = time.time(); [dd.decompress(x) for x in comp]; ds = time.time() - t0
        cb = sum(len(x) for x in comp)
        out[label] = {"bytes": cb, "vsGzip": round(test_gz / max(1, cb), 2),
                      "compressMBps": round(test_raw / 1e6 / max(cs, 1e-9), 1),
                      "decompressMBps": round(test_raw / 1e6 / max(ds, 1e-9), 1)}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit-mb", type=float, default=1e9, help="stop reading drafts after this many MB of JSONL")
    ap.add_argument("--sample", type=int, default=400, help="recordings to recompress")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    rep = {"drafts": flatten(a.root, os.path.join(a.out, "parquet"), a.limit_mb * 1e6)}
    rep["queries"] = queries(os.path.join(a.out, "parquet"))
    rep["recordings"] = recordings(a.root, a.sample, a.seed)
    rep["peakGB"] = round(peak_gb(), 2)
    with open(os.path.join(a.out, "storage-report.json"), "w") as fh:
        json.dump(rep, fh, indent=1)
    print(json.dumps(rep, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
PY
python3 var/storage/measure_storage.py var/cubelab/queue --out var/storage --limit-mb 120 --sample 120
du -sh var/cubelab/queue var/ml 2>/dev/null | tee var/storage/du.txt
df -h . | tee -a var/storage/du.txt
rm -rf var/storage/parquet
```
check: rep.written == 1

## Abort if
abort: elapsed_s > 3600

## Report
collect: var/storage/storage-report.json
collect: var/storage/du.txt

summary.md: the drafts JSONL MB vs Parquet MB (and the ratio), the DuckDB query times, the zstd ratios and
speeds for recordings, the disk used and free, and the peak memory.
