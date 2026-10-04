#!/usr/bin/env python3
# mtg-table — tools/ml: the learned position evaluator, served to the coach helper (D361).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The evaluator's win chance for ONE position, for ForgeCoach (D361).

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
    python3 tools/ml/eval_serve.py --model a.json,b.json,c.json                   # an ensemble (also: a directory, a manifest)
    python3 tools/ml/eval_serve.py --model M --log var/games/<id>/frames.jsonl     # print a game's decision rows

AN ENSEMBLE (D368).  --model may name several exports of one schema (seeds of
one training config): comma-separated paths, a directory (its `ensemble.json`,
else every *.json in it), or a manifest `{"format":
"mtgtable-position-eval-ensemble", "formatVersion": 1, "models": [paths
relative to it]}`.  Every member passes every check above, and all must share
the schema id, vocabulary (and its sha), feature count, card offset and card
states, or none is served.  The answer's `p` is the members' mean; `sd` their
sample standard deviation (two or more members); `n` how many.  One member is
served exactly as before: its own sha as `model`, its own P(win) as `p`.

Serving: the first stdout line is {"ready": true, "model": <sha-256 of the file,
12 hex; for an ensemble, of its members' shas>, "schema": <schemaId>, "n",
"explain", ...} or {"ready": false, "error": "..."} (then exit 2).  Each request
line {"id": ..., "seat", "state", "history"?, "explain"?} gets {"id", "ok":
true, "p", "n", "sd"?, "turn", "decision", "featureHash", "explain"?} or {"id",
"ok": false, "status": 400|500, "error"}.  `explain: true` adds attribution.py's
answer: the buckets of the position that moved P(win) away from the model's
baseline, exact integrated gradients in logit space (that module's header).  `decision` says whether the
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

ENSEMBLE_FORMAT = "mtgtable-position-eval-ensemble"
MANIFEST = "ensemble.json"
MAX_MEMBERS = 16


def model_paths(spec: str) -> list[str]:
    """The model files a --model names (D368): one export; several, comma-separated;
    a directory (its `ensemble.json` when there is one, else every `*.json` in it,
    sorted); or a manifest, {"format": ENSEMBLE_FORMAT, "formatVersion": 1,
    "models": [paths relative to the manifest]}."""
    parts = [p.strip() for p in spec.split(",") if p.strip()]
    if len(parts) > 1:
        return parts
    path = parts[0] if parts else spec
    if os.path.isdir(path):
        man = os.path.join(path, MANIFEST)
        if os.path.isfile(man):
            return model_paths(man)
        files = sorted(os.path.join(path, f) for f in os.listdir(path) if f.endswith(".json"))
        if not files:
            raise ModelError(f"{path} holds no model (*.json)")
        return files
    with open(path, "rb") as f:
        head = f.read(4096)
    if ENSEMBLE_FORMAT.encode() in head:
        with open(path, encoding="utf-8") as f:
            try:
                man = json.load(f)
            except json.JSONDecodeError as e:
                raise ModelError(f"{path} is not JSON: {e}") from None
        if isinstance(man, dict) and man.get("format") == ENSEMBLE_FORMAT:
            if man.get("formatVersion") != 1 or not isinstance(man.get("models"), list) or not man["models"] \
                    or not all(isinstance(m, str) and m for m in man["models"]):
                raise ModelError(f"{path}: an ensemble manifest is {{format, formatVersion: 1, models: [paths]}}")
            base = os.path.dirname(os.path.abspath(path))
            return [m if os.path.isabs(m) else os.path.join(base, m) for m in man["models"]]
    return [path]


class Member:
    """One loaded model file, checked for live use."""

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
        self.path = path
        self.model = m
        self.schema = schema
        self.net = N.EvalNet.from_json(m)
        try:
            import attribution as A
            self.mlp: Any = A.Mlp(m, schema.card_offset, len(E.CARD_STATES))
        except ValueError:   # AttributionUnavailable: served, but not explained
            self.mlp = None

    def layout(self) -> tuple:
        m = self.model
        return (m.get("schemaId"), m.get("vocabSha256"), m.get("nFeatures"), m.get("cardOffset"),
                tuple(m.get("cardStates") or []), tuple(m.get("vocab") or []))

    def p_of(self, vec: list[float]) -> float:
        rows = self.N.features_to_rows([vec], self.schema.card_offset)
        return float(self.net.predict(rows)[0])


class Served:
    """The model, or the ensemble of models (D368), a --model names.  Every
    member must be on the same schema, vocabulary and layout: one encoding
    serves them all.  `p` is the members' mean P(win); with two or more, `sd`
    is their sample standard deviation (the spread of the members, i.e. how far
    the training runs disagree on this position -- not the game's own chance)."""

    def __init__(self, spec: str, expect_schema: str | None = None, cube: str | None = None):
        paths = model_paths(spec)
        if len(paths) > MAX_MEMBERS:
            raise ModelError(f"an ensemble holds at most {MAX_MEMBERS} models ({len(paths)} named)")
        self.members = [Member(p, expect_schema, cube) for p in paths]
        first = self.members[0]
        for mb in self.members[1:]:
            if mb.layout() != first.layout():
                raise ModelError(f"{mb.path}: an ensemble's models must share one schema, vocabulary and layout "
                                 f"({mb.model.get('schemaId')} vs {first.model.get('schemaId')})")
        shas = [mb.sha12 for mb in self.members]
        if len(set(shas)) != len(shas):
            raise ModelError("the ensemble names one model file twice")
        self.n = len(self.members)
        self.sha12 = first.sha12 if self.n == 1 else \
            hashlib.sha256(("ensemble|" + ",".join(shas)).encode()).hexdigest()[:12]
        self.schema = first.schema
        self.model = first.model
        self.net = first.net
        self.explainable = all(mb.mlp is not None for mb in self.members)

    def describe(self) -> dict[str, Any]:
        d = {"model": self.sha12, "schema": self.schema.schema_id, "nFeatures": self.schema.n,
             "boardColumns": len(self.net.cols), "vocab": len(self.schema.vocab),
             "n": self.n, "explain": self.explainable}
        if self.n > 1:
            d["members"] = [mb.sha12 for mb in self.members]
        return d

    def p_of(self, vec: list[float]) -> float:
        return self.p_all(vec)[0]

    def p_all(self, vec: list[float]) -> tuple[float, float | None]:
        ps = [mb.p_of(vec) for mb in self.members]
        if len(ps) == 1:
            return ps[0], None
        mean = sum(ps) / len(ps)
        sd = (sum((p - mean) ** 2 for p in ps) / (len(ps) - 1)) ** 0.5
        return mean, sd

    def evaluate(self, req: Any) -> dict[str, Any]:
        seat, state, history = check_request(req)
        explain = req.get("explain", False)
        if not isinstance(explain, bool):
            raise RequestError("explain must be true or false")
        vec = online_features(state, seat, history, self.schema)
        turn = state.get("turn")
        p, sd = self.p_all(vec)
        out: dict[str, Any] = {"p": p, "n": self.n}
        if sd is not None:
            out["sd"] = sd
        out.update({"turn": turn if isinstance(turn, int) else 0,
                    "decision": is_decision(state, seat), "featureHash": feature_hash(vec)})
        if explain:
            if not self.explainable:
                raise RequestError("this model cannot be explained (attributions know ReLU layers and a sigmoid)")
            import attribution as A
            out["explain"] = A.explain([mb.mlp for mb in self.members], vec, self.schema.names,
                                       self.schema.vocab.cards, list(E.CARD_STATES))
        return out


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
    ap.add_argument("--model", required=True, help="a train_eval.py export (JSON); or several, comma-separated, "
                    "a directory of them, or an ensemble.json manifest (D368)")
    ap.add_argument("--expect-schema", help="refuse a model whose schemaId is not this")
    ap.add_argument("--cube", help="refuse a model trained for another card list than this cube/deck/list")
    ap.add_argument("--log", help="print the win chance at every decision row of this frame log, then exit")
    a = ap.parse_args(argv)
    try:
        srv = Served(a.model, a.expect_schema, a.cube)
    except ImportError as e:
        msg = f"numpy is needed to serve the evaluator ({e}): python3 -m venv var/ml/venv && var/ml/venv/bin/pip install numpy"
        return _not_ready(msg, a.log)
    except FileNotFoundError as e:
        return _not_ready(f"no model file at {e.filename or a.model}", a.log)
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
