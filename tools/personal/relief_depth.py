#!/usr/bin/env python3
# mtg-table — tools/personal/relief_depth.py
# Copyright (C) 2026 the mtg-table authors
# SPDX-License-Identifier: GPL-3.0-or-later
"""The relief's depth step: Depth Anything V2 Small on a card's ART BOX (D225).

PERSONAL TIER. What this writes is derived from card art, so it is personal
data: it lives under the gitignored `personal/relief/` and is never committed,
never published and never shown to anyone (D190's rule, D225). It is run by
`tools/personal/relief.mjs` with the likeness venv's python
(`var/likeness/venv`, torch + transformers < 5, the model's weights already in
its Hugging Face cache); nothing here downloads anything — the caller sets
`HF_HUB_OFFLINE=1` — and it writes exactly one kind of file: a depth PNG, named
by the caller, inside the one directory the caller passes as `--out-dir`.

Input (a JSON object on stdin):

    { "jobs": [ { "id": "<scryfall id>", "src": "<the card's normal image>",
                  "out": "<out-dir>/<id>.png",
                  "box": { "left": 0.08, "right": 0.92, "top": 0.112, "bottom": 0.555 } } ],
      "blurPx": 1.5, "flatBelow": 2.0 }

Output: one JSON object per line on stdout — `ready` (the device, the load
times), `done` per job (the crop, the size, the time, whether it came out
flat), `error` per failed job, `summary` last.

**The map** (what `web/src/workshop/relief.ts` reads): an 8-bit greyscale PNG
the size of the art box crop, **near = 255**. Depth Anything's output is a
relative INVERSE depth (bigger is nearer, scale and offset arbitrary per
image), so each map is normalised on its own: its 1st percentile is 0, its
99th is 255, clipped. Then a small Gaussian blur (`blurPx`, 1.5 px by default)
— the browser's 128 × 96 vertex grid samples it every ~3.2 px of the crop, and
an unblurred cliff aliases into saw teeth there. Eight bits are enough: the
browser decodes a PNG to 8-bit channels anyway, and 256 levels over the relief's
depth are steps far under a pixel at the inspect view's distance.

**A flat image gives a flat map.** A monocular depth model always answers — on
a uniform grey it invents a floor receding upward, with the same spread as a
painting's (measured: an 8-bit grey 128 gives a raw range of 0.39–4.98 against
Peggy Carter's −0.48–6.51). So the step does not ask it about an image that
carries no information: when the crop's luma standard deviation is under
`flatBelow` (8-bit levels) the map is 255 everywhere — the plane at the window,
exactly where the flat backdrop stands — and the line says `flat: true`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"


def say(obj) -> None:
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def gaussian_blur(a, sigma: float):
    """A separable Gaussian over a 2-D float array, edges reflected (numpy only)."""
    import numpy as np

    if sigma <= 0:
        return a
    radius = max(1, int(round(3 * sigma)))
    x = np.arange(-radius, radius + 1, dtype=np.float64)
    k = np.exp(-(x * x) / (2 * sigma * sigma))
    k /= k.sum()
    padded = np.pad(a, ((0, 0), (radius, radius)), mode="reflect")
    a = np.apply_along_axis(lambda row: np.convolve(row, k, mode="valid"), 1, padded)
    padded = np.pad(a, ((radius, radius), (0, 0)), mode="reflect")
    return np.apply_along_axis(lambda col: np.convolve(col, k, mode="valid"), 0, padded)


def crop_box(size, box):
    """The art box in pixels of an image `size` (w, h): fractions rounded to whole pixels."""
    w, h = size
    x0 = int(round(float(box["left"]) * w))
    x1 = int(round(float(box["right"]) * w))
    y0 = int(round(float(box["top"]) * h))
    y1 = int(round(float(box["bottom"]) * h))
    if not (0 <= x0 < x1 <= w and 0 <= y0 < y1 <= h):
        raise ValueError(f"the art box {box} does not fit a {w}x{h} image")
    return x0, y0, x1, y1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out-dir", required=True, help="the one directory an output may be written into")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    a = ap.parse_args()
    out_dir = os.path.realpath(a.out_dir)
    request = json.load(sys.stdin)
    jobs = request.get("jobs", [])
    blur_px = float(request.get("blurPx", 1.5))
    flat_below = float(request.get("flatBelow", 2.0))

    t0 = time.time()
    import numpy as np
    import torch
    from PIL import Image
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation

    t1 = time.time()
    device = a.device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    elif device == "cuda" and not torch.cuda.is_available():
        say({"type": "fatal", "message": "--device cuda, and torch sees no CUDA device"})
        return 2
    processor = AutoImageProcessor.from_pretrained(MODEL_ID, use_fast=False)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL_ID).to(device).eval()
    t2 = time.time()
    say({
        "type": "ready", "model": MODEL_ID, "device": device,
        "gpu": torch.cuda.get_device_name(0) if device == "cuda" else None,
        "importS": round(t1 - t0, 3), "loadS": round(t2 - t1, 3),
        "torch": torch.__version__,
    })

    done = 0
    failed = 0
    infer_ms = []
    for job in jobs:
        jid = str(job.get("id", ""))
        try:
            out = os.path.realpath(str(job["out"]))
            # Defence in depth: relief.mjs already guards every path; this step
            # refuses to write anywhere but directly inside --out-dir.
            if os.path.dirname(out) != out_dir or not out.endswith(".png"):
                raise ValueError(f"refusing to write {out}: not a .png directly inside {out_dir}")
            img = Image.open(str(job["src"])).convert("RGB")
            x0, y0, x1, y1 = crop_box(img.size, job["box"])
            crop = img.crop((x0, y0, x1, y1))
            cw, ch = crop.size
            luma = np.asarray(crop.convert("L"), dtype=np.float64)
            luma_std = float(luma.std())
            t = time.time()
            raw_p1 = raw_p99 = None
            if luma_std < flat_below:
                depth = np.ones((ch, cw), dtype=np.float64)
                flat = True
            else:
                with torch.no_grad():
                    inputs = processor(images=crop, return_tensors="pt").to(device)
                    pred = model(**inputs).predicted_depth
                    pred = torch.nn.functional.interpolate(
                        pred[:, None], size=(ch, cw), mode="bicubic", align_corners=False
                    )[0, 0]
                raw = pred.float().cpu().numpy().astype(np.float64)
                lo, hi = np.percentile(raw, [1, 99])
                raw_p1, raw_p99 = float(lo), float(hi)
                depth = np.clip((raw - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
                depth = np.clip(gaussian_blur(depth, blur_px), 0.0, 1.0)
                flat = False
            ms = (time.time() - t) * 1000.0
            if not flat:
                infer_ms.append(ms)
            png = Image.fromarray(np.round(depth * 255.0).astype(np.uint8))  # a 2-D uint8 array is greyscale ("L")
            part = out + f".{os.getpid()}.part"
            png.save(part, format="PNG", optimize=True)
            os.replace(part, out)
            done += 1
            say({
                "type": "done", "id": jid, "width": cw, "height": ch,
                "crop": [x0, y0, x1, y1], "srcSize": list(img.size),
                "ms": round(ms, 1), "flat": flat, "lumaStd": round(luma_std, 3),
                "rawP1": raw_p1, "rawP99": raw_p99, "bytes": os.path.getsize(out),
            })
        except Exception as error:  # one card's failure is that card's, never the run's
            failed += 1
            say({"type": "error", "id": jid, "message": f"{type(error).__name__}: {error}"})
    say({
        "type": "summary", "done": done, "failed": failed, "device": device,
        "inferMsMedian": round(float(np.median(infer_ms)), 1) if infer_ms else None,
        "inferMsMax": round(float(max(infer_ms)), 1) if infer_ms else None,
        "totalS": round(time.time() - t0, 3),
    })
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
