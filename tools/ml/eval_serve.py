#!/usr/bin/env python3
# mtg-table — tools/ml: the learned position evaluator, served to the coach helper (D360).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The evaluator's win chance for ONE position, for ForgeCoach (D360).

The coach helper (tools/coach-helper.mjs, through tools/eval-runner.mjs) runs
this as a child process and talks JSON lines to it: one request line in, one
answer line out.  It is the ONLY implementation of the online encoding: it
calls encode.py's own `TurnTally` and `encode_state` -- the functions
dataset.py's rows come from (`encode_game`) -- and evalnet.py's own forward
pass.  Nothing is ported, so the features the helper scores are the features
the model was trained on by construction; tests/test_eval_serve.py proves it
over every committed recording anyway.

THE REQUEST (the coach helper's POST /eval body, docs in its header):

    {"seat": <the viewing seat>, "state": <a protocol `state` body, exactly as the
     viewing seat received it>, "history": [{"events": [...], "stack": [...]}, ...]}

`history` is the earlier `state` frames of the same game, oldest first: what
encode_game's `TurnTally` has seen by the time it reaches this state (this
turn's land drop, lands and spells; the game's own counters).  A client may
leave out every frame whose `events` hold no event of a TALLY_KINDS kind --
`TurnTally.apply` changes nothing for such a frame (a `zone` event matters only
beside a `cast` in its own frame) -- so the answer is the same either way;
tests/test_eval_serve.py checks that on every recording.

HIDDEN INFORMATION.  The state is the viewing seat's redacted view, and the
encoder reads only what dataset.py's rows read for the same seat (encode.py's
header: the opponent's hand is a count, libraries are counts, a stub adds to a
count, a face-down card is the `<facedown>` slot).  A request whose viewer's own
hand holds a redacted stub is refused: that state was redacted for someone else.

THE MODEL.  A train_eval.py export (evalnet.py, formatVersion 1) on D305's
full schema (17 card states).  An r17 model (the outside exam's reduced
schema, D359) is refused: its rows are other positions.  It is also
refused when the schema encode.py computes from the model's own vocabulary is
not the model's `schemaId` (the encoder changed since it was trained), when
`--expect-schema` names another id, when `--cube` is another card list, or
when it reads a live-unsafe feature (evalnet.LIVE_UNSAFE).

    python3 tools/ml/eval_serve.py --model var/ml/models/night-1-eval.json        # serve (stdin/stdout)
        [--expect-schema 82815752c2f5e346] [--cube cubes/synergy-cube-180.md]
    python3 tools/ml/eval_serve.py --model M --log var/games/<id>/frames.jsonl     # print a game's decision rows

Serving: the first stdout line is {"ready": true, "model": <sha-256 of the file,
12 hex>, "schema": <schemaId>, ...} or {"ready": false, "error": "..."} (then
exit 2).  Each request line {"id": ..., "seat", "state", "history"?} gets
{"id", "ok": true, "p", "turn", "decision", "featureHash"} or
{"id", "ok": false, "status": 400|500, "error"}.  `decision` says whether the
state is a decision row as dataset.py picks them (the viewer holds priority in
a main phase or a combat step, the game not over): the model was trained on
those alone, so a client shows the others as out of range, or not at all.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import encode as E  # noqa: E402

# The event kinds TurnTally.apply counts (a `zone` event only classifies a
# `cast` of the same frame).  A history frame with none of them is a no-op.
TALLY_KINDS = ("turn", "land", "cast", "mulligan")
MAX_SEAT = 64


class RequestError(ValueError):
    """A request that is not a viewing seat's state: answered 400."""


class ModelError(ValueError):
    """A model this encoder must not serve."""


# ------------------------------------------------------------ the online encoding

def tally_relevant(events: list[dict[str, Any]] | None) -> bool:
    return any(isinstance(e, dict) and e.get("kind") in TALLY_KINDS for e in events or [])


def online_features(state: dict[str, Any], seat: int, history: list[dict[str, Any]],
                    schema: E.Schema) -> list[float]:
    """The feature vector of `state` for `seat`: encode_game's tally fed with
    the history and then the state's own events, then encode_state."""
    tally = E.TurnTally()
    for h in history:
        tally.apply(h.get("events") or [], h.get("stack"))
    tally.apply(state.get("events") or [], state.get("stack"))
    return E.encode_state(state, seat, schema, tally)


def is_decision(state: dict[str, Any], seat: int, phases: list[str] | None = None) -> bool:
    """encode_game's row predicate (the identical-consecutive-row collapse
    aside, which needs the previous row)."""
    return (not state.get("gameOver") and state.get("priority") == seat
            and state.get("phase") in set(phases or E.default_phases()))


def request_for(game: E.Game, seq: int, reduced: bool = True) -> dict[str, Any]:
    """The request a client sends for the `state` frame `seq` of `game`: that
    state, and every earlier state frame as history (only the tally-relevant
    ones when `reduced`).  ForgeCoach's src/winChance.ts builds the same."""
    history: list[dict[str, Any]] = []
    for f in game.frames:
        if f.get("type") != "state":
            continue
        body = f.get("body") or {}
        if f.get("seq") == seq:
            return {"seat": game.seat, "state": body, "history": history}
        if not reduced or tally_relevant(body.get("events")):
            history.append({"events": body.get("events") or [], "stack": body.get("stack") or []})
    raise KeyError(f"no state frame with seq {seq}")


def check_request(req: Any) -> tuple[int, dict[str, Any], list[dict[str, Any]]]:
    if not isinstance(req, dict):
        raise RequestError("the request is not a JSON object")
    seat = req.get("seat")
    if not isinstance(seat, int) or isinstance(seat, bool) or not 0 <= seat <= MAX_SEAT:
        raise RequestError("seat must be the viewing seat's player id (a small whole number)")
    state = req.get("state")
    if not isinstance(state, dict) or not isinstance(state.get("players"), list):
        raise RequestError("state must be a protocol state body (with players)")
    players = [p for p in state["players"] if isinstance(p, dict)]
    me = next((p for p in players if p.get("id") == seat), None)
    if me is None:
        raise RequestError(f"seat {seat} is not a player of this state")
    hand = ((me.get("zones") or {}).get("hand") or {}).get("cards") or []
    if any(isinstance(c, dict) and c.get("hidden") for c in hand):
        raise RequestError(f"this state was not redacted for seat {seat}: its own hand is hidden from it")
    history = req.get("history", [])
    if history is None:
        history = []
    if not isinstance(history, list) or not all(
            isinstance(h, dict) and isinstance(h.get("events", []), list)
            and (h.get("stack") is None or isinstance(h.get("stack"), list)) for h in history):
        raise RequestError("history must be a list of {events: [...], stack: [...]}")
    return seat, state, history


def feature_hash(vec) -> str:
    """eval_golden.py's row hash."""
    return hashlib.sha256(",".join(str(int(x)) for x in vec).encode()).hexdigest()[:16]


# ------------------------------------------------------------ the model

class Served:
    """A loaded model and its schema, checked for live use."""

    def __init__(self, path: str, expect_schema: str | None = None, cube: str | None = None):
        import evalnet as N  # numpy
        self.N = N
        with open(path, "rb") as f:
            raw = f.read()
        self.sha12 = hashlib.sha256(raw).hexdigest()[:12]
        try:
            m = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            raise ModelError(f"{path} is not JSON: {e}") from None
        if not isinstance(m, dict) or m.get("format") != N.FORMAT or m.get("formatVersion") != N.FORMAT_VERSION:
            raise ModelError(f"{path} is not a {N.FORMAT} v{N.FORMAT_VERSION} model (train_eval.py --out)")
        # D305's full schema only.  The outside exam's reduced r17 rows (D359, r17.py: 2 card states,
        # end-of-half-turn rows) describe other positions than a board's decision rows: not served.
        if list(m.get("cardStates") or []) != list(E.CARD_STATES) or m.get("schemaKind", "d305") != "d305":
            raise ModelError("the model is not on D305's full schema (an r17 model of the outside exam, D359?): "
                             "/eval serves D305 models only")
        vocab = E.Vocab(list(m.get("vocab") or []))
        schema = E.Schema(vocab)
        if schema.schema_id != m.get("schemaId"):
            raise ModelError(f"the model's schema is {m.get('schemaId')} but encode.py computes {schema.schema_id} "
                             "from its vocabulary: the encoder changed since it was trained -- retrain, or serve "
                             "it from the checkout that trained it")
        if expect_schema and schema.schema_id != expect_schema:
            raise ModelError(f"the model's schema is {schema.schema_id}, not the expected {expect_schema}")
        if N.vocab_sha256(vocab.cards) != m.get("vocabSha256"):
            raise ModelError("the model's vocabSha256 does not match its vocabulary")
        if schema.n != m.get("nFeatures") or schema.card_offset != m.get("cardOffset"):
            raise ModelError("the model's feature layout does not match its schema")
        if cube:
            try:
                N.check_schema(m, E.Vocab.from_files([cube]))
            except ValueError as e:
                raise ModelError(f"{cube}: {e}") from None
        inp = m.get("input") or {}
        cols, names = inp.get("boardColumns") or [], inp.get("boardNames") or []
        if len(cols) != len(names) or any(not isinstance(c, int) or not 0 <= c < schema.card_offset
                                          or schema.names[c] != n for c, n in zip(cols, names)):
            raise ModelError("the model's board columns are not this schema's")
        unsafe = sorted(set(names) & set(N.LIVE_UNSAFE))
        if unsafe:
            raise ModelError(f"the model reads live-unsafe features ({', '.join(unsafe)}): refused for live use")
        self.model = m
        self.schema = schema
        self.net = N.EvalNet.from_json(m)

    def describe(self) -> dict[str, Any]:
        return {"model": self.sha12, "schema": self.schema.schema_id, "nFeatures": self.schema.n,
                "boardColumns": len(self.net.cols), "vocab": len(self.schema.vocab)}

    def p_of(self, vec: list[float]) -> float:
        rows = self.N.features_to_rows([vec], self.schema.card_offset)
        return float(self.net.predict(rows)[0])

    def evaluate(self, req: Any) -> dict[str, Any]:
        seat, state, history = check_request(req)
        vec = online_features(state, seat, history, self.schema)
        turn = state.get("turn")
        return {"p": self.p_of(vec), "turn": turn if isinstance(turn, int) else 0,
                "decision": is_decision(state, seat), "featureHash": feature_hash(vec)}


# ------------------------------------------------------------ the two modes

def serve(srv: Served, inp, out) -> None:
    out.write(json.dumps({"ready": True, **srv.describe()}) + "\n")
    out.flush()
    for line in inp:
        line = line.strip()
        if not line:
            continue
        rid = None
        try:
            req = json.loads(line)
            rid = req.get("id") if isinstance(req, dict) else None
            ans = {"id": rid, "ok": True, **srv.evaluate(req)}
        except RequestError as e:
            ans = {"id": rid, "ok": False, "status": 400, "error": str(e)}
        except json.JSONDecodeError:
            ans = {"id": rid, "ok": False, "status": 400, "error": "the request line is not JSON"}
        except Exception as e:  # noqa: BLE001 - the helper must get an answer line
            ans = {"id": rid, "ok": False, "status": 500, "error": f"{type(e).__name__}: {e}"}
        out.write(json.dumps(ans) + "\n")
        out.flush()


def print_log(srv: Served, path: str, out) -> int:
    n = 0
    for g in E.read_games(path):
        rows = E.encode_game(g, srv.schema)
        for r in rows:
            a = srv.evaluate(request_for(g, r.seq))
            out.write(f"seat {g.seat} seq {r.seq:5d} turn {r.turn:2d} {r.phase:28s} p={a['p']:.3f}\n")
            n += 1
    print(f"eval_serve: {n} decision row(s), model {srv.sha12}, schema {srv.schema.schema_id}", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", required=True, help="a train_eval.py export (JSON)")
    ap.add_argument("--expect-schema", help="refuse a model whose schemaId is not this")
    ap.add_argument("--cube", help="refuse a model trained for another card list than this cube/deck/list")
    ap.add_argument("--log", help="print the win chance at every decision row of this frame log, then exit")
    a = ap.parse_args(argv)
    try:
        srv = Served(a.model, a.expect_schema, a.cube)
    except ImportError as e:
        msg = f"numpy is needed to serve the evaluator ({e}): python3 -m venv var/ml/venv && var/ml/venv/bin/pip install numpy"
        return _not_ready(msg, a.log)
    except FileNotFoundError:
        return _not_ready(f"no model file at {a.model}", a.log)
    except ModelError as e:
        return _not_ready(str(e), a.log)
    if a.log:
        return print_log(srv, a.log, sys.stdout)
    serve(srv, sys.stdin, sys.stdout)
    return 0


def _not_ready(msg: str, log_mode: str | None) -> int:
    if log_mode:
        print(f"eval_serve: {msg}", file=sys.stderr)
    else:
        print(json.dumps({"ready": False, "error": msg}), flush=True)
    return 2


if __name__ == "__main__":
    sys.exit(main())
