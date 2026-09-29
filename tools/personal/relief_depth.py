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
`HF_HUB_OFFLINE=1` — and it writes exactly two kinds of file, a depth PNG and
its back layer's JPEG, named by the caller, inside the one directory the caller
passes as `--out-dir`.

Input (a JSON object on stdin):

    { "jobs": [ { "id": "<scryfall id>", "src": "<the card's normal image>",
                  "out": "<out-dir>/<id>.png", "backOut": "<out-dir>/<id>.back.jpg",
                  "box": { "left": 0.08, "right": 0.92, "top": 0.112, "bottom": 0.555 } } ],
      "blurPx": 0.75, "flatBelow": 2.0, "dilatePx": 10,
      "back": { "cliff": 0.12, "cells": [128, 96], "margin": 0.25 } }

Output: one JSON object per line on stdout — `ready` (the device, the load
times), `done` per job (the crop, the sizes, the times, whether it came out
flat, how much the browser cuts and the back layer fills), `error` per failed
job, `summary` last.

**The depth.** Depth Anything's output is a relative INVERSE depth (bigger is
nearer, scale and offset arbitrary per image), so each map is normalised on its
own: its 1st percentile is 0, its 99th is 1, clipped — near = 1, and 255 in the
file. Eight bits are enough: the browser decodes a PNG to 8-bit channels anyway,
and 256 levels over the relief's depth are steps far under a pixel at the
inspect view's distance.

**The two layers** (`back` in the request; D227 — `layers()` is the whole of
it, pure numpy, and `web/test/relief.test.ts` drives it on synthetic arrays).
`<id>.png` is an 8-bit RGB PNG the size of the art box crop:

 - **blue**, the painting's own depth, blurred `blurPx`;
 - **red**, the FRONT layer's: the near side of every silhouette — where the map
   jumps by more than `cliff` — grown `dilatePx` past it (a grey dilation), then
   blurred. The browser cuts the front layer at the grid cells that straddle a
   silhouette (`relief.ts`, the same `cliff` over one cell of `cells`) and, pixel
   by pixel, wherever red stands over blue: so the cut falls on the background's
   pixels and the subject keeps its edge, where the first cut stretched the edge
   across the gap an orbit opens (the verifier's "rubber sheet");
 - **green**, the BACK layer's: under every texel, the depth on the far side of
   its nearest cut, never nearer than blue — what an orbit uncovers behind a
   silhouette.

`<id>.back.jpg` is the back layer's colour: the crop with what the near side
of each cut hides filled in (push-pull, from the pixels just across the cuts —
soft, out of focus), the cut cells themselves kept as the painting has them (so
from the seat the two layers are one picture), and `margin` of its height
continued past every edge, for what an oblique look sees past the window's
frame. Without `back` the step writes the front map alone, 8-bit greyscale
(dilated and blurred): the tests' single-layer case.

**A flat image gives a flat map.** A monocular depth model always answers — on
a uniform grey it invents a floor receding upward, with the same spread as a
painting's (measured: an 8-bit grey 128 gives a raw range of 0.39–4.98 against
Peggy Carter's −0.48–6.51). So the step does not ask it about an image that
carries no information: when the crop's luma standard deviation is under
`flatBelow` (8-bit levels) every layer is 255 — the plane at the window,
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


def dilate_near(a, radius: float):
    """A grey dilation — the max over a disc of `radius` px — of a near = 1 map
    (numpy only). Every NEAR region grows outward by `radius`, so the step where
    the map jumps from a subject to what is behind it moves off the subject's
    own pixels and into the background's. The browser's vertex grid stretches a
    cell across that step when the camera orbits; after the dilation what it
    stretches is a few pixels of background, not a face or a pistol (D226's
    rubber sheet, the relief window's fix pass)."""
    import numpy as np

    if radius <= 0:
        return a
    r = int(np.ceil(radius))
    h, w = a.shape
    padded = np.pad(a, r, mode="edge")
    out = a.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > radius * radius:
                continue
            np.maximum(out, padded[r + dy:r + dy + h, r + dx:r + dx + w], out=out)
    return out


def erode(a, radius: int):
    """The min over an octagon of `radius` px (numpy only): `radius` 3 × 3
    steps, the square and the cross in turn. Wherever something FARTHER lies
    within `radius`, a texel takes its depth — the back layer's depth: what an
    orbit can uncover behind a near subject is the far side of its silhouette."""
    import numpy as np

    out = a
    h, w = a.shape
    for k in range(int(radius)):
        p = np.pad(out, 1, mode="edge")
        m = np.minimum(out, p[0:h, 1:w + 1])
        m = np.minimum(m, p[2:h + 2, 1:w + 1])
        m = np.minimum(m, p[1:h + 1, 0:w])
        m = np.minimum(m, p[1:h + 1, 2:w + 2])
        if k % 2 == 0:
            for dy, dx in ((0, 0), (0, 2), (2, 0), (2, 2)):
                m = np.minimum(m, p[dy:dy + h, dx:dx + w])
        out = m
    return out


def upsample(a, h: int, w: int):
    """Bilinear, a coarse pyramid level (h/2, w/2, c) up to (h, w, c)."""
    import numpy as np

    sh, sw = a.shape[:2]
    ys = np.clip((np.arange(h) + 0.5) / 2.0 - 0.5, 0, sh - 1)
    xs = np.clip((np.arange(w) + 0.5) / 2.0 - 0.5, 0, sw - 1)
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    y1 = np.minimum(y0 + 1, sh - 1)
    x1 = np.minimum(x0 + 1, sw - 1)
    fy = (ys - y0)[:, None, None]
    fx = (xs - x0)[None, :, None]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bottom = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return top * (1 - fy) + bottom * fy


def fill_in(values, known):
    """**Push-pull** (numpy only): `values` (h, w, c) kept where `known` (h, w)
    is true and filled everywhere else, smoothly, from what is known around it —
    a pyramid of weighted means pushed down to one pixel and pulled back up. The
    fill is soft by construction: behind a subject, what an orbit uncovers reads
    as the background out of focus, never as a copy of the subject."""
    import numpy as np

    c = values * known[..., None]
    wt = known.astype(np.float64)
    levels = []
    while True:
        levels.append((c, wt))
        h, w = wt.shape
        if h <= 1 and w <= 1:
            break
        ph, pw = h % 2, w % 2
        c2 = np.pad(c, ((0, ph), (0, pw), (0, 0)), mode="edge")
        w2 = np.pad(wt, ((0, ph), (0, pw)), mode="edge")
        c = c2[0::2, 0::2] + c2[1::2, 0::2] + c2[0::2, 1::2] + c2[1::2, 1::2]
        wt = w2[0::2, 0::2] + w2[1::2, 0::2] + w2[0::2, 1::2] + w2[1::2, 1::2]
        scale = np.where(wt > 1.0, 1.0 / np.maximum(wt, 1e-12), 1.0)
        c = c * scale[..., None]
        wt = wt * scale
    top_c, top_w = levels[-1]
    estimate = top_c / np.maximum(top_w, 1e-12)[..., None]
    for c, wt in reversed(levels[:-1]):
        h, w = wt.shape
        up = upsample(estimate, h, w)
        mean = c / np.maximum(wt, 1e-12)[..., None]
        alpha = np.clip(wt, 0.0, 1.0)[..., None]
        estimate = alpha * mean + (1.0 - alpha) * up
    return estimate


def cliff_zone(front, cell, cliff: float):
    """Where the browser's FRONT layer is cut (`relief.ts`'s vertex shader, the
    same test): a grid vertex whose depth and its four neighbours one cell away
    differ by more than `cliff`, grown by a cell for the interpolation between
    vertices. `cell` is (x, y) in pixels of the crop."""
    import numpy as np

    h, w = front.shape
    cx, cy = max(1, int(round(cell[0]))), max(1, int(round(cell[1])))
    p = np.pad(front, ((cy, cy), (cx, cx)), mode="edge")
    stack = [front, p[0:h, cx:cx + w], p[2 * cy:2 * cy + h, cx:cx + w], p[cy:cy + h, 0:w], p[cy:cy + h, 2 * cx:2 * cx + w]]
    span = np.max(stack, axis=0) - np.min(stack, axis=0)
    zone = span > cliff
    grow = np.pad(zone, ((cy, cy), (cx, cx)), mode="constant")
    out = zone.copy()
    for dy in range(0, 2 * cy + 1):
        for dx in range(0, 2 * cx + 1):
            out |= grow[dy:dy + h, dx:dx + w]
    return out


def nearest_value(seeds, values):
    """For every pixel, `values` at the NEAREST pixel of `seeds` (Euclidean;
    jump flooding, numpy only); +inf where there is no seed at all."""
    import numpy as np

    h, w = seeds.shape
    if not seeds.any():
        return np.full((h, w), np.inf)
    ys, xs = np.mgrid[0:h, 0:w]
    sy = np.where(seeds, ys, -1)
    sx = np.where(seeds, xs, -1)
    far = float(h * h + w * w + 1)
    best = np.where(sy >= 0, 0.0, far)
    steps = []
    step = 1 << int(np.ceil(np.log2(max(h, w))))
    while step >= 1:
        steps.append(step)
        step //= 2
    for step in steps + [1]:
        for dy in (-step, 0, step):
            for dx in (-step, 0, step):
                if dy == 0 and dx == 0:
                    continue
                ny = np.clip(ys + dy, 0, h - 1)
                nx = np.clip(xs + dx, 0, w - 1)
                cy = sy[ny, nx]
                cx = sx[ny, nx]
                d = np.where(cy >= 0, (cy - ys) ** 2 + (cx - xs) ** 2, far)
                better = d < best
                sy = np.where(better, cy, sy)
                sx = np.where(better, cx, sx)
                best = np.where(better, d, best)
    return values[sy, sx]


def layers(norm, rgb, dilate_px: float, blur_px: float, cliff: float, cells, margin: float):
    """**The two layers** (D227) of one art box, from its normalised depth `norm`
    (h, w; near = 1) and its colour `rgb` (h, w, 3; 0–1). Pure numpy: the test
    drives it on synthetic arrays (`web/test/relief.test.ts`). Returns the three
    planes of `<id>.png` — `front` (red), `back` (green), `own` (blue) — the back
    layer's colour with its margin (`colour`, (h + 2m, w + 2m, 3)), the cells the
    browser cuts (`cut`), the texels the back layer fills in (`hidden`) and the
    margin in pixels."""
    import numpy as np

    h, w = norm.shape
    cell = (w / float(cells[0]), h / float(cells[1]))
    # BLUE — the painting's own depth.
    own = np.clip(gaussian_blur(norm, blur_px), 0.0, 1.0)
    # RED — the FRONT layer's: the near side of every silhouette grown
    # `dilate_px` past it, so the cells the browser cuts there hold the
    # background's pixels, never the subject's. A silhouette is a STEEP jump —
    # more than `cliff` within 2 px — and only the pixels within `dilate_px` of
    # one are grown: a floor rising toward the viewer climbs as far over 10 px
    # but never over 2, and is left as it is (grown, the browser cut it pixel by
    # pixel and drew the back layer at the far side's depth there).
    steep = (dilate_near(norm, 2.0) - norm) > cliff
    near_silhouette = dilate_near(steep.astype(np.float64), dilate_px) > 0.5
    grown = dilate_near(norm, dilate_px)
    front = np.clip(gaussian_blur(np.where(near_silhouette & (grown - norm > cliff), grown, norm), blur_px), 0.0, 1.0)
    # Where the browser cuts the front layer (`relief.ts`, the same test), and the
    # depth on the FAR side of each cut, carried to every texel from its NEAREST
    # cut. Only across a cut — a tower beside a far sky with no silhouette between
    # them is behind nothing, and a body behind a fist is the far side of the
    # fist's cut, not of the sky beyond the body.
    zone = cliff_zone(front, cell, cliff)
    far_side = erode(front, int(round(4 * max(cell))))
    carried = nearest_value(zone, far_side)
    # GREEN — the BACK layer's: that far side under everything nearer, softened,
    # never nearer than the painting.
    behind = np.minimum(own, carried)
    behind = np.minimum(np.clip(gaussian_blur(behind, 2.0), 0.0, 1.0), own)
    # The back layer's colour: what the near side hides — a texel nearer than the
    # far side of its nearest cut by more than `cliff` — filled soft from the FAR
    # side of the cuts alone (the painting's pixels just across a silhouette: a
    # sky behind a head, a coat behind a fist — never the far interior of a
    # subject, which would print a dark shadow of it); less everything the
    # browser cuts from the front — the cells and, pixel by pixel, the grown band
    # (red over blue by more than `cliff`) — where the back layer keeps the
    # painting's own pixels, so from the seat the two layers are one picture.
    occluder = (norm - carried) > cliff
    band = (front - own) > cliff
    hide = occluder & ~zone & ~band
    across = ~occluder & (erode(np.where(zone, 0.0, 1.0), int(round(2 * max(cell)))) < 0.5)
    colour = rgb.copy()
    if hide.any() and across.any():
        colour[hide] = fill_in(rgb, across)[hide]
    # The margin: the painting continued past the window's edge, soft, for what
    # an oblique look sees past the frame.
    m = int(round(margin * h))
    padded = np.zeros((h + 2 * m, w + 2 * m, 3), dtype=np.float64)
    known = np.zeros((h + 2 * m, w + 2 * m), dtype=bool)
    padded[m:m + h, m:m + w] = colour
    known[m:m + h, m:m + w] = True
    if m > 0:
        padded = fill_in(padded, known)
        padded[m:m + h, m:m + w] = colour
    return {"front": front, "back": behind, "own": own, "colour": padded, "cut": zone, "band": band, "hidden": hide, "margin": m}


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
    dilate_px = float(request.get("dilatePx", 0.0))
    flat_below = float(request.get("flatBelow", 2.0))
    back = request.get("back")  # the back layer's recipe, or None: the front map alone (greyscale)

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
            if os.path.dirname(out) != out_dir or not out.endswith(".png") or out.endswith(".back.png"):
                raise ValueError(f"refusing to write {out}: not a .png directly inside {out_dir}")
            back_out = None
            if back is not None:
                back_out = os.path.realpath(str(job["backOut"]))
                if os.path.dirname(back_out) != out_dir or back_out != out[: -len(".png")] + ".back.jpg":
                    raise ValueError(f"refusing to write {back_out}: not <id>.back.jpg beside {out}")
            img = Image.open(str(job["src"])).convert("RGB")
            x0, y0, x1, y1 = crop_box(img.size, job["box"])
            crop = img.crop((x0, y0, x1, y1))
            cw, ch = crop.size
            luma = np.asarray(crop.convert("L"), dtype=np.float64)
            luma_std = float(luma.std())
            t = time.time()
            raw_p1 = raw_p99 = None
            if luma_std < flat_below:
                norm = np.ones((ch, cw), dtype=np.float64)
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
                norm = np.clip((raw - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
                flat = False
            ms = (time.time() - t) * 1000.0
            if not flat:
                infer_ms.append(ms)
            line = {
                "type": "done", "id": jid, "width": cw, "height": ch,
                "crop": [x0, y0, x1, y1], "srcSize": list(img.size),
                "ms": round(ms, 1), "flat": flat, "lumaStd": round(luma_std, 3),
                "rawP1": raw_p1, "rawP99": raw_p99,
            }
            if back is None:
                # The front map alone (greyscale): what the tests ask for.
                depth = np.clip(gaussian_blur(dilate_near(norm, dilate_px), blur_px), 0.0, 1.0)
                png = Image.fromarray(np.round(depth * 255.0).astype(np.uint8))  # a 2-D uint8 array is greyscale ("L")
            else:
                tb = time.time()
                rgb = np.asarray(crop, dtype=np.float64) / 255.0
                made = layers(norm, rgb, dilate_px, blur_px, float(back["cliff"]), back["cells"], float(back["margin"]))
                depth, behind, own, padded, zone, hide, m = (
                    made["front"], made["back"], made["own"], made["colour"], made["cut"], made["hidden"], made["margin"]
                )
                jpg = Image.fromarray(np.round(np.clip(padded, 0.0, 1.0) * 255.0).astype(np.uint8))
                part = back_out + f".{os.getpid()}.part"
                jpg.save(part, format="JPEG", quality=95, subsampling=0, optimize=True)
                os.replace(part, back_out)
                planes = np.stack([depth, behind, own], axis=-1)
                png = Image.fromarray(np.round(planes * 255.0).astype(np.uint8))
                line.update({
                    "backWidth": cw + 2 * m, "backHeight": ch + 2 * m, "margin": m,
                    "backBytes": os.path.getsize(back_out), "backMs": round((time.time() - tb) * 1000.0, 1),
                    "hidden": round(float(hide.mean()), 4), "cut": round(float(zone.mean()), 4),
                })
            part = out + f".{os.getpid()}.part"
            png.save(part, format="PNG", optimize=True)
            os.replace(part, out)
            done += 1
            line["bytes"] = os.path.getsize(out)
            say(line)
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
