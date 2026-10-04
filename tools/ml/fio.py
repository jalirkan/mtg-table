# mtg-table — tools/ml: one opener for frame logs, plain, gzip or zstd (D370).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Every tool here that reads a recording opens it through `open_log`.

A frame log (docs/protocol.md §8) is `X.jsonl`, `X.jsonl.gz` (the recorders
write gzip: the bridge, the cube lab's workers, ai-bench) or `X.jsonl.zst`
(tools/lab/archive.py's archive tier for a finished queue night, D370).  The
readers prefer the `.zst` copy: a listing that holds both `X.jsonl.gz` and
`X.jsonl.zst` (an archive interrupted between its verify and its delete)
counts the game once, and a stored path that names `X.jsonl.gz` after the
archive removed it opens `X.jsonl.zst` instead.

    import fio
    with fio.open_log(path) as f:        # text, UTF-8, line by line
        for line in f: ...
    fio.is_log(name)                     # .jsonl / .jsonl.gz / .jsonl.zst
    fio.prefer_zst(paths)                # drop X.jsonl.gz where X.jsonl.zst is listed
    fio.key_name(path)                   # the name as recorded: X.jsonl.zst -> X.jsonl.gz
    fio.recorded(path)                   # the same for a whole path

A cut-short file (a killed recorder) reads up to the cut: gzip raises one of
`TRUNCATED` at the cut; a zstd stream simply ends.  The `zstandard` package
is needed only to open a `.zst`; without it that open fails with a message
saying so, and nothing else changes.
"""
from __future__ import annotations

import gzip
import io
import os
import sys
import zlib
from typing import IO, Iterable

try:
    import zstandard as _zstd
except ImportError:  # only a .zst needs it
    _zstd = None

LOG_SUFFIXES = (".jsonl", ".jsonl.gz", ".jsonl.zst")
ZSTD_MAGIC = b"\x28\xb5\x2f\xfd"
GZIP_MAGIC = b"\x1f\x8b"

# what a cut-short compressed log raises at the cut (the reader keeps what came before)
TRUNCATED: tuple[type[BaseException], ...] = (EOFError, zlib.error) + ((_zstd.ZstdError,) if _zstd else ())


class ZstdUnavailable(RuntimeError):
    """A .zst log, and no `zstandard` module to read it."""


def need_zstd():
    if _zstd is None:
        raise ZstdUnavailable("reading a .jsonl.zst frame log needs the Python package `zstandard` "
                              "(pip install zstandard; D370) -- it is not installed for " + sys.executable)
    return _zstd


def is_log(name: str) -> bool:
    return name.endswith(LOG_SUFFIXES)


def stem(path: str) -> str:
    """`X.jsonl` for X.jsonl, X.jsonl.gz and X.jsonl.zst."""
    for s in (".gz", ".zst"):
        if path.endswith(".jsonl" + s):
            return path[: -len(s)]
    return path


def key_name(path: str) -> str:
    """The log's file name as recorded: an archived X.jsonl.zst answers X.jsonl.gz, so a
    game's key (encode.py's `game_key`) is the same before and after the archive."""
    name = os.path.basename(path)
    return name[: -len(".zst")] + ".gz" if name.endswith(".jsonl.zst") else name


def recorded(path: str) -> str:
    """The path as the recorder wrote it: X.jsonl.zst -> X.jsonl.gz (key_name's whole-path twin).
    Lists a Java step reads (gate_fit's heldout.txt, the regret set) and the joins against
    them use this, so an archive made before or after the list never splits a game in two."""
    return path[: -len(".zst")] + ".gz" if path.endswith(".jsonl.zst") else path


def resolve(path: str) -> str:
    """The file to read for a stored log path: the path itself when it exists,
    else its archived `.zst` (or, for a `.zst` path, its `.gz`) when that does."""
    if os.path.exists(path) or not path.endswith((".jsonl.gz", ".jsonl.zst")):
        return path
    for alt in (stem(path) + ".zst", stem(path) + ".gz"):
        if alt != path and os.path.exists(alt):
            return alt
    return path


def prefer_zst(paths: Iterable[str]) -> list[str]:
    """The paths, sorted and unique, without any X.jsonl.gz whose X.jsonl.zst is also listed."""
    ps = sorted(set(paths))
    zst = {p for p in ps if p.endswith(".jsonl.zst")}
    return [p for p in ps if not (p.endswith(".jsonl.gz") and stem(p) + ".zst" in zst)]


def open_log(path: str) -> IO[str]:
    """A frame log opened for text reading, whatever its compression (by suffix)."""
    path = resolve(path)
    if path.endswith(".zst"):
        z = need_zstd()
        raw = open(path, "rb")
        try:
            reader = z.ZstdDecompressor().stream_reader(raw, read_across_frames=True, closefd=True)
        except Exception:
            raw.close()
            raise
        return io.TextIOWrapper(io.BufferedReader(reader), encoding="utf-8")
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, encoding="utf-8")


def read_bytes(path: str) -> bytes:
    """A whole log's raw (decompressed) bytes; a truncated file raises."""
    path = resolve(path)
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] == ZSTD_MAGIC:
        return zstd_decompress(data)
    if data[:2] == GZIP_MAGIC:
        return gzip.decompress(data)
    return data


def zstd_decompress(data: bytes) -> bytes:
    """Every frame of a zstd file, strictly: a stream that stops inside a frame raises
    EOFError (verifying an archive must not pass a short file)."""
    z = need_zstd()
    out = []
    while data:
        d = z.ZstdDecompressor().decompressobj()
        out.append(d.decompress(data))
        if not d.eof:
            raise EOFError("zstd stream ends inside a frame")
        data = d.unused_data
    return b"".join(out)
