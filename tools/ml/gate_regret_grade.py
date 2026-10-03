#!/usr/bin/env python3
# mtg-table — tools/ml: gate 2's grading driver, resumable, over K `coach-grade.sh serve` JVMs (D352).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Grade a request file through `tools/coach-grade.sh serve` -- the live
analysis's own entry point, so every request goes through D348's
hidden-information guard (pool mode; the opponent's deck list is refused) --
on K JVMs at once, resumably.  Gate 2 (D352) runs it four ways:

    # the truth: every option played to the END of the game, 200 rounds with racing
    python3 tools/ml/gate_regret_grade.py truth --requests set.jsonl --out truth.jsonl --jobs 7
    # the rankers: the search's live horizon (end of this turn), 3 rounds, no racing
    python3 tools/ml/gate_regret_grade.py rank --leaf hand --rounds 3 --requests set.jsonl --out rank-hand-3.jsonl
    python3 tools/ml/gate_regret_grade.py rank --leaf eval:var/ml/models/eval-<hash>.json --rounds 3 ...

The modes fix every grading setting from gates.REGRET_RULE (seed, playouts,
racing, horizon, cap, budget); nothing about a result is tunable here.

RESUMABLE.  Worker i answers every K-th request into `<out>.shard-i.jsonl`, a
line per answer, flushed as it comes; a rerun skips every id already answered
(`--retry-errors` re-asks the ones answered `error`).  A JVM that dies or
outlives `--timeout-s` on one request is killed and restarted; that request
is retried once, then answered `error`.  At the end the shards are merged into
`<out>` in request order (the last answer per id wins).

VERSIONS (D341's rule for our artefacts).  `<out>.meta.json` stamps the code
that graded -- bridge/src's tree hash, uncommitted changes, the Forge jar's
sha256 -- with the settings, the requests' sha256 and the model's; a resume
under another code version or other settings is refused unless
`--allow-version-change`, which is recorded in the meta.
"""
from __future__ import annotations

import argparse
import json
import os
import queue
import subprocess
import sys
import threading
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates as G  # noqa: E402

DEFAULT_CMD = ["tools/coach-grade.sh", "serve"]


def serve_flags(mode: str, rounds: int | None = None) -> list[str]:
    """The serve defaults of a mode, all from the pre-registered rule."""
    R = G.REGRET_RULE
    if mode == "truth":
        return ["--playouts", str(R["truthPlayouts"]), "--initial", str(R["truthInitial"]), "--batch", str(R["truthBatch"]),
                "--horizon", "-1", "--budget-ms", str(R["truthBudgetMs"]), "--timeout-ms", str(R["truthTimeoutMs"]),
                "--cap", str(R["cap"]), "--seed", str(R["truthSeed"])]
    r = str(rounds or R["rankRounds"])
    return ["--playouts", r, "--initial", r, "--no-race", "--horizon", str(R["rankHorizon"]), "--budget-ms", "0",
            "--timeout-ms", "20000", "--cap", str(R["cap"]), "--seed", str(R["rankSeed"]),
            "--leaf-scale", str(R["leafScale"])]


def request_line(req: dict[str, Any], extra: dict[str, Any]) -> str:
    """Only serve's own fields go on the wire (the set's report fields stay here)."""
    keep = ("id", "log", "type", "frame", "mode", "oppPool", "oppKnown", "ownPool", "deck", "budgetMs", "horizon", "seed",
            "only", "minRounds", "leafScale", "leaf")
    out = {k: req[k] for k in keep if k in req}
    out.update(extra)
    if "oppDeck" in req or "oppDeckPublic" in req:
        raise SystemExit(f"request {req.get('id')}: gate 2 never sends the opponent's deck list (D348, D352)")
    return json.dumps(out)


class Worker:
    """One serve JVM: start, wait for {"ready":true}, then one request -> one answer line."""

    def __init__(self, i: int, cmd: list[str], env: dict[str, str], timeout_s: float, log) -> None:
        self.i, self.cmd, self.env, self.timeout_s, self.log = i, cmd, env, timeout_s, log
        self.proc: subprocess.Popen | None = None
        self.lines: queue.Queue = queue.Queue()

    def start(self) -> None:
        self.stop()
        self.proc = subprocess.Popen(self.cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.log,
                                     text=True, bufsize=1, env=self.env)
        self.lines = queue.Queue()
        q, p = self.lines, self.proc

        def pump() -> None:
            for line in p.stdout:  # type: ignore[union-attr]
                q.put(line)
            q.put(None)
        threading.Thread(target=pump, daemon=True).start()
        while True:
            line = q.get(timeout=max(600.0, self.timeout_s))
            if line is None:
                raise RuntimeError(f"worker {self.i}: serve exited before it was ready")
            if line.strip().startswith('{"ready"'):
                return

    def ask(self, line: str) -> dict[str, Any] | None:
        """The answer, or None when the JVM died or timed out (it is then stopped)."""
        try:
            assert self.proc and self.proc.stdin
            self.proc.stdin.write(line + "\n")
            self.proc.stdin.flush()
            while True:
                got = self.lines.get(timeout=self.timeout_s)
                if got is None:
                    self.stop()
                    return None
                got = got.strip()
                if got.startswith("{"):
                    return json.loads(got)
        except (queue.Empty, BrokenPipeError, OSError, json.JSONDecodeError):
            self.stop()
            return None

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            self.proc.kill()
            try:
                self.proc.wait(timeout=30)
            except subprocess.TimeoutExpired:
                pass
        self.proc = None


def done_ids(out: str, jobs: int, retry_errors: bool) -> set[str]:
    ids: set[str] = set()
    for i in range(jobs):
        for a in G.read_jsonl(f"{out}.shard-{i}.jsonl"):
            if retry_errors and a.get("status") == "error":
                continue
            ids.add(str(a.get("id")))
    # shards of an earlier run with more workers still count
    d = os.path.dirname(os.path.abspath(out))
    base = os.path.basename(out) + ".shard-"
    for fn in os.listdir(d) if os.path.isdir(d) else []:
        if fn.startswith(base) and fn.endswith(".jsonl"):
            for a in G.read_jsonl(os.path.join(d, fn)):
                if not (retry_errors and a.get("status") == "error"):
                    ids.add(str(a.get("id")))
    return ids


def merge(out: str, reqs: list[dict[str, Any]]) -> dict[str, int]:
    d = os.path.dirname(os.path.abspath(out))
    base = os.path.basename(out) + ".shard-"
    last: dict[str, dict[str, Any]] = {}
    for fn in sorted(os.listdir(d)):
        if fn.startswith(base) and fn.endswith(".jsonl"):
            for a in G.read_jsonl(os.path.join(d, fn)):
                prev = last.get(str(a.get("id")))
                if prev is None or prev.get("status") == "error" or a.get("status") != "error":
                    last[str(a.get("id"))] = a
    counts: dict[str, int] = {}
    with open(out, "w", encoding="utf-8") as f:
        for r in reqs:
            a = last.get(str(r["id"]))
            if a is not None:
                f.write(json.dumps(a) + "\n")
                counts[a.get("status", "?")] = counts.get(a.get("status", "?"), 0) + 1
    return counts


def check_meta(path: str, meta: dict[str, Any], allow: bool) -> None:
    if not os.path.isfile(path):
        G.write_json(path, meta | {"changes": []})
        return
    with open(path, encoding="utf-8") as f:
        old = json.load(f)
    diff = G.version_diff(old.get("version", {}), meta["version"])
    for k in ("mode", "serveFlags", "extra", "requestsSha", "modelSha"):
        if old.get(k) != meta.get(k):
            diff.append(k)
    if not diff:
        return
    if not allow:
        raise SystemExit(f"gate_regret_grade: {path} was graded with other {', '.join(diff)} -- a resume must be the same "
                         "code and settings (D341); --allow-version-change appends anyway and records it")
    old.setdefault("changes", []).append({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "changed": diff, "to": meta})
    G.write_json(path, old)


def run(a) -> int:
    reqs = G.read_jsonl(a.requests)
    if not reqs:
        raise SystemExit(f"gate_regret_grade: no requests in {a.requests}")
    extra: dict[str, Any] = {}
    model_sha = None
    if a.mode == "rank":
        if a.leaf != "hand":
            if not a.leaf.startswith("eval:") or not os.path.isfile(a.leaf[5:]):
                raise SystemExit(f"--leaf hand or eval:<an existing model.json>, got {a.leaf}")
            model_sha = G.file_sha12(a.leaf[5:])
        extra["leaf"] = a.leaf
    flags = serve_flags(a.mode, a.rounds)
    meta = {"gate": "regret", "mode": a.mode, "serveFlags": flags, "extra": extra, "requests": a.requests,
            "requestsSha": G.file_sha(a.requests), "modelSha": model_sha, "version": G.code_version(a.repo)}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    check_meta(a.out + ".meta.json", meta, a.allow_version_change)
    done = done_ids(a.out, a.jobs, a.retry_errors)
    todo = [r for r in reqs if str(r["id"]) not in done]
    print(f"gate_regret_grade {a.mode}: {len(reqs)} request(s), {len(reqs) - len(todo)} already answered, "
          f"{len(todo)} to go on {a.jobs} JVM(s); serve {' '.join(flags)} {json.dumps(extra) if extra else ''}", flush=True)
    cmd = (a.cmd.split() if a.cmd else DEFAULT_CMD) + flags
    lock = threading.Lock()
    progress = {"n": len(reqs) - len(todo)}
    errors: list[str] = []

    def work(i: int) -> None:
        mine = [r for k, r in enumerate(todo) if k % a.jobs == i]
        if not mine:
            return
        env = dict(os.environ, COACH_GRADE_HOME=f"gates/{a.name}-{i}")
        logf = open(f"{a.out}.shard-{i}.log", "a", encoding="utf-8")
        w = Worker(i, cmd, env, a.timeout_s, logf)
        try:
            w.start()
            with open(f"{a.out}.shard-{i}.jsonl", "a", encoding="utf-8") as out:
                for r in mine:
                    line = request_line(r, extra)
                    ans = None
                    for attempt in range(2):
                        t0 = time.time()
                        ans = w.ask(line)
                        if ans is not None:
                            break
                        logf.write(f"[gate] request {r['id']}: no answer after {time.time() - t0:.0f} s "
                                   f"(attempt {attempt + 1}); restarting the JVM\n")
                        logf.flush()
                        w.start()
                    if ans is None:
                        ans = {"id": r["id"], "status": "error", "error": "no answer (the JVM died or timed out twice)"}
                    ans.setdefault("id", r["id"])
                    out.write(json.dumps(ans) + "\n")
                    out.flush()
                    with lock:
                        progress["n"] += 1
                        print(f"[{progress['n']}/{len(reqs)}] {r['id']} {r.get('type')} {ans.get('status')} "
                              f"{ans.get('playouts', '')} playouts {ans.get('wallMs', '')} ms", flush=True)
        except Exception as e:  # noqa: BLE001 - one worker's failure is reported, the others go on
            with lock:
                errors.append(f"worker {i}: {e}")
        finally:
            w.stop()
            logf.close()

    threads = [threading.Thread(target=work, args=(i,)) for i in range(a.jobs)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    counts = merge(a.out, reqs)
    print(json.dumps({"mode": a.mode, "answered": sum(counts.values()), "of": len(reqs), "status": counts,
                      "workerErrors": errors}), flush=True)
    return 1 if errors else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("mode", choices=("truth", "rank"))
    ap.add_argument("--requests", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--leaf", default="hand", help="rank: hand or eval:<model.json>")
    ap.add_argument("--rounds", type=int, help="rank: rounds per option (default: the rule's primary 3)")
    ap.add_argument("--name", help="the Forge homes' name (var/coach-grade/gates/<name>-<i>); default from --out")
    ap.add_argument("--timeout-s", type=float, default=3 * 3600, help="one request's wall-clock cap before the JVM is killed")
    ap.add_argument("--retry-errors", action="store_true")
    ap.add_argument("--allow-version-change", action="store_true")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--cmd", help=argparse.SUPPRESS)   # tests: a fake serve
    a = ap.parse_args(argv)
    if a.mode == "truth" and (a.leaf != "hand" or a.rounds):
        ap.error("truth takes neither --leaf nor --rounds: it plays to the end of the game")
    if a.rounds is not None and a.rounds not in (G.REGRET_RULE["rankRounds"], G.REGRET_RULE["rankRoundsSecondary"]):
        ap.error(f"--rounds is the rule's {G.REGRET_RULE['rankRounds']} (primary) or {G.REGRET_RULE['rankRoundsSecondary']} (secondary)")
    a.name = a.name or os.path.basename(a.out).split(".")[0]
    return run(a)


if __name__ == "__main__":
    sys.exit(main())
