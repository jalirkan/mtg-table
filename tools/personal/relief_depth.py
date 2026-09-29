#!/usr/bin/env python3
# mtg-table — tools/personal/relief_depth.py
# Copyright (C) 2026 the mtg-table authors
# SPDX-License-Identifier: GPL-3.0-or-later
"""The relief's depth step: Depth Anything V2 Small on a card's ART BOX (D225).

PERSONAL TIER. What this writes is derived from card art, so it is personal
data: it lives under the gitignored `personal/relief/` and is never committed,
never published and never shown to anyone (D190's rule, D225). It is run by
`tools/personal/relief.mjs` with the likeness venv's python
(`var/likeness/venv`, torch + transformers < 5, numpy and scipy, the model's weights already in
its Hugging Face cache); nothing here downloads anything — the caller sets
`HF_HUB_OFFLINE=1` — and it writes exactly two kinds of file, a depth PNG and
its back layer's JPEG, named by the caller, inside the one directory the caller
passes as `--out-dir`.

Input (a JSON object on stdin):

    { "jobs": [ { "id": "<scryfall id>", "src": "<the card's normal image>",
                  "out": "<out-dir>/<id>.png", "backOut": "<out-dir>/<id>.back.jpg",
                  "box": { "left": 0.08, "right": 0.92, "top": 0.112, "bottom": 0.555 } } ],
      "blurPx": 0.75, "flatBelow": 2.0, "dilatePx": 10,
      "back": { "cliff": 0.12, "cells": [128, 96], "margin": 0.25, "contourPx": 3, "seamPx": 1,
                "reachPx": 80 } }

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

**The two layers** (`back` in the request; D227, D228 — `layers()` is the
whole of it, numpy and scipy's distance transform, and `web/test/relief.test.ts`
drives it on synthetic arrays). `<id>.png` is an 8-bit RGB PNG the size of the
art box crop:

 - **red**, the FRONT layer's depth: the near side of every silhouette — where
   the map jumps by more than `cliff` — grown `dilatePx` past it (a grey
   dilation), then blurred `blurPx`, so the grid cells the browser cuts at a
   silhouette (`relief.ts`, the same `cliff` over one cell of `cells`) fall on
   the background's pixels and the subject keeps its edge;
 - **green**, the BACK layer's depth: under every texel, the depth on the far
   side of its nearest cut, never nearer than the painting's own;
 - **blue**, the FRONT layer's KEEP MASK (D228): 255 where the front is drawn, 0
   where it is cut — the cut cells and the band the red was grown over, less the
   subject and its painted contour (`contourPx` past the silhouette), which stay
   on the front so they move with it. The browser discards a front fragment
   where the blue (sampled linearly) is under one half: the cut is decided here,
   pixel for pixel, and the back image below is built to exactly that cut.

`<id>.back.jpg` is the back layer's colour: the crop with the SUBJECT — every
texel nearer than the far side of its nearest cut by more than `cliff`, grown by
its painted contour — filled in, except where the seat sees the back through the
front's cut (the cut, grown `seamPx`: those keep the painting's own pixels, so
from the seat the two layers are one picture, and the subject leaves no copy of
its edge on the back to ghost when the camera moves). The fill (D228) is the
painting just across the silhouette, MIRRORED across it, from texels at the
depth of that far side only (a sky behind a head, sparks behind a coat — never
the subject's own interior and never an average of everything around it), then
blurred, more with distance from the silhouette: the background continued, out
of focus. All of that holds only within an orbit's REACH of a cut (`reachPx`
for a whole range of depth, from the cut): past it no orbit uncovers anything,
so the back layer there is the painting at its own depth — a door that runs off
the painting's edge is still a door past the window's frame, not the sky behind
its other edge. Past every edge the crop is continued `margin` of its height the same
way — mirrored from a few pixels inside the edge (the art box's first row is the
frame's black line) and blurred with distance — for what an oblique look sees
past the window's frame. Without `back` the step writes the front map alone,
8-bit greyscale (dilated and blurred): the tests' single-layer case.

**A flat image gives a flat map.** A monocular depth model always answers — on
a uniform grey it invents a floor receding upward, with the same spread as a
painting's (measured: an 8-bit grey 128 gives a raw range of 0.39–4.98 against
Peggy Carter's −0.48–6.51). So the step does not ask it about an image that
carries no information: when the crop's luma standard deviation is under
`flatBelow` (8-bit levels) every layer is 255 — the plane at the window,
exactly where the flat backdrop stands, and nothing cut — and the line says
`flat: true`.
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
    """A separable Gaussian over the first two axes of a float array (h, w) or
    (h, w, c), edges reflected (numpy only)."""
    import numpy as np

    if sigma <= 0:
        return a
    radius = max(1, int(round(3 * sigma)))
    x = np.arange(-radius, radius + 1, dtype=np.float64)
    k = np.exp(-(x * x) / (2 * sigma * sigma))
    k /= k.sum()
    rest = ((0, 0),) * (a.ndim - 2)
    h, w = a.shape[:2]
    padded = np.pad(a, ((0, 0), (radius, radius)) + rest, mode="reflect")
    across = np.zeros(a.shape, dtype=np.float64)
    for i, weight in enumerate(k):
        across += weight * padded[:, i:i + w]
    padded = np.pad(across, ((radius, radius), (0, 0)) + rest, mode="reflect")
    out = np.zeros(a.shape, dtype=np.float64)
    for i, weight in enumerate(k):
        out += weight * padded[i:i + h]
    return out


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


def grow(mask, radius: float):
    """A boolean mask grown by a disc of `radius` px (numpy only)."""
    import numpy as np

    if radius <= 0:
        return mask
    return dilate_near(mask.astype(np.float64), float(radius)) > 0.5


def nearest_index(seeds):
    """For every pixel, the row and column of the NEAREST pixel of `seeds`
    (Euclidean, exact: scipy's distance transform) and the distance to it."""
    from scipy.ndimage import distance_transform_edt

    dist, (iy, ix) = distance_transform_edt(~seeds, return_indices=True)
    return iy, ix, dist


def nearest_value(seeds, values):
    """For every pixel, `values` at the NEAREST pixel of `seeds`; +inf where there
    is no seed at all."""
    import numpy as np

    if not seeds.any():
        return np.full(seeds.shape, np.inf)
    iy, ix, _ = nearest_index(seeds)
    return values[iy, ix]


FILL_SIGMA = (1.5, 4.5, 40.0)
"""The fill's blur: `sigma` px beside the silhouette, rising to the second at the
third's distance (px) from it — the background continued, out of focus."""

FILL_GUARD_PX = 2
"""The fill's seeds stand this far past the subject's painted contour, so no
anti-aliased edge pixel of the subject is mirrored into what it hid."""


def fill_behind(rgb, hide, seeds, depth, target, step: float):
    """**What a subject hides, filled** (D228): every texel of `hide` takes the
    colour of the painting MIRRORED across its nearest seed — the texel as far
    beyond the seed as the seed is beyond it, or the seed itself where the mirror
    leaves the seeds — then a blur that grows with the distance to that seed.

    A seed serves a texel only at the texel's own `target` depth (the far side of
    its nearest cut): the texels to fill are taken in bins of `step` of that
    depth, and each bin draws from the seeds whose own `depth` is within `step` of
    the bin's centre. So behind a head the fill is the sky beside it, behind a
    fist the coat — never the subject's own interior, and never an average of
    every colour around the subject (the verifier's cream and beige, round 2)."""
    import numpy as np

    h, w = hide.shape
    ys, xs = np.mgrid[0:h, 0:w]
    out = rgb.copy()
    reach = np.zeros((h, w), dtype=np.float64)
    finite = np.where(np.isfinite(target), target, 0.0)
    for lo in np.arange(0.0, 1.0 + step, step):
        todo = hide & (finite >= lo) & (finite < lo + step)
        if not todo.any():
            continue
        centre = lo + step / 2.0
        pool = seeds & (np.abs(depth - centre) <= step)
        if not pool.any():
            pool = seeds
        if not pool.any():
            continue
        sy, sx, dist = nearest_index(pool)
        my = np.clip(2 * sy - ys, 0, h - 1)
        mx = np.clip(2 * sx - xs, 0, w - 1)
        mirrored = pool[my, mx] & (2 * sy - ys >= 0) & (2 * sy - ys < h) & (2 * sx - xs >= 0) & (2 * sx - xs < w)
        py = np.where(mirrored, my, sy)
        px = np.where(mirrored, mx, sx)
        out[todo] = rgb[py[todo], px[todo]]
        reach[todo] = dist[todo]
    # The blur reads the fill and its seeds only — never a subject's own pixels,
    # which would haze the fill with their colour (a dark smear beside a pistol).
    near_sigma, far_sigma, far_at = FILL_SIGMA
    among = (hide | seeds).astype(np.float64)[..., None]
    weight_soft = np.maximum(gaussian_blur(among, near_sigma), 1e-6)
    weight_softer = np.maximum(gaussian_blur(among, far_sigma), 1e-6)
    soft = gaussian_blur(out * among, near_sigma) / weight_soft
    softer = gaussian_blur(out * among, far_sigma) / weight_softer
    t = np.clip(reach / far_at, 0.0, 1.0)[..., None]
    blended = soft * (1.0 - t) + softer * t
    out[hide] = blended[hide]
    return out


REACH_RAMP_PX = 12.0
"""Over its last this many pixels the back layer's reach eases from the far side
back to the painting's own depth, so the back layer never folds at its edge."""


EDGE_TRIM_PX = 2
"""The margin mirrors the crop from this far inside its edge: the art box's first
row is the card frame's black line, and a mirror of it would draw a line."""


def continue_past_edges(colour, m: int):
    """**The margin** (D228): the crop continued `m` px past every edge —
    mirrored from `EDGE_TRIM_PX` inside the edge, blurred more with the
    distance past it — and the crop itself untouched in the middle."""
    import numpy as np

    h, w, _ = colour.shape
    if m <= 0:
        return colour.copy()
    t = EDGE_TRIM_PX
    # numpy's reflect repeats itself when the pad is wider than the array.
    padded = np.pad(colour[t:h - t, t:w - t], ((m + t, m + t), (m + t, m + t), (0, 0)), mode="reflect")
    ys, xs = np.mgrid[0:h + 2 * m, 0:w + 2 * m]
    dy = np.maximum(np.maximum(m - ys, ys - (m + h - 1)), 0)
    dx = np.maximum(np.maximum(m - xs, xs - (m + w - 1)), 0)
    beyond = np.clip(np.sqrt(dx * dx + dy * dy) / m, 0.0, 1.0)[..., None]
    out = gaussian_blur(padded, 1.0) * (1.0 - beyond) + gaussian_blur(padded, 4.0) * beyond
    out[m:m + h, m:m + w] = colour
    return out


def layers(
    norm, rgb, dilate_px: float, blur_px: float, cliff: float, cells, margin: float,
    contour_px: float = 3.0, seam_px: float = 1.0, reach_px: float = 80.0,
):
    """**The two layers** (D227, D228) of one art box, from its normalised depth
    `norm` (h, w; near = 1) and its colour `rgb` (h, w, 3; 0–1). Numpy, and
    scipy's distance transform: the test drives it on synthetic arrays
    (`web/test/relief.test.ts`). Returns the three planes of `<id>.png` — `front`
    (red), `back` (green), `keep` (blue, the front's keep mask) — the painting's
    own depth (`own`), the back layer's colour with its margin (`colour`,
    (h + 2m, w + 2m, 3)), the front's cut (`cut`: the cells and the band), the
    texels the back layer fills in (`hidden`), the subject they are the whole of
    less the seam (`subject`), the seeds the fill draws from and the margin in
    pixels."""
    import numpy as np

    h, w = norm.shape
    cell = (w / float(cells[0]), h / float(cells[1]))
    # The painting's own depth.
    own = np.clip(gaussian_blur(norm, blur_px), 0.0, 1.0)
    # RED — the FRONT layer's: the near side of every silhouette grown
    # `dilate_px` past it, so the cells the browser cuts there hold the
    # background's pixels, never the subject's. A silhouette is a STEEP jump —
    # more than `cliff` within 2 px — and only the pixels within `dilate_px` of
    # one are grown: a floor rising toward the viewer climbs as far over 10 px
    # but never over 2, and is left as it is.
    steep = (dilate_near(norm, 2.0) - norm) > cliff
    near_silhouette = dilate_near(steep.astype(np.float64), dilate_px) > 0.5
    grown = dilate_near(norm, dilate_px)
    front = np.clip(gaussian_blur(np.where(near_silhouette & (grown - norm > cliff), grown, norm), blur_px), 0.0, 1.0)
    # Where the browser cuts the front layer's CELLS (`relief.ts`'s vertex test,
    # the same `cliff` over one cell, grown a cell for the interpolation), and the
    # depth on the FAR side of each cut, carried to every texel from its NEAREST
    # cut. Only across a cut — a tower beside a far sky with no silhouette between
    # them is behind nothing, and a body behind a fist is the far side of the
    # fist's cut, not of the sky beyond the body.
    zone = cliff_zone(front, cell, cliff)
    far_side = erode(front, int(round(4 * max(cell))))
    carried = nearest_value(zone, far_side)
    # How far an orbit can see behind a silhouette (D228): a subject moves over
    # what is behind it by its depth over that far side, times the relief, times
    # the tangent of the orbit — `reach_px` a whole range, measured from the cut
    # (which stands the dilation and a cell or two off the silhouette). Past its
    # reach a texel is never uncovered, so the back layer there is the painting
    # itself, at its own depth: a door that runs off the edge of the painting is
    # more door past the window's frame, not the sky behind its other edge.
    if zone.any():
        to_cut = nearest_index(zone)[2]
    else:
        to_cut = np.full((h, w), np.inf)
    rise = np.clip(np.where(np.isfinite(carried), norm - carried, 0.0), 0.0, 1.0)
    reach = dilate_px + 2.0 * max(cell) + rise * reach_px
    within = to_cut <= reach
    lift = np.clip((reach - to_cut) / REACH_RAMP_PX, 0.0, 1.0)
    # GREEN — the BACK layer's: within reach, that far side under everything
    # nearer; past it, the painting's own depth; softened, never nearer than the
    # painting.
    behind = own - lift * np.clip(np.where(np.isfinite(carried), own - carried, 0.0), 0.0, None)
    behind = np.minimum(np.clip(gaussian_blur(behind, 2.0), 0.0, 1.0), own)
    # The SUBJECT: every texel nearer than the far side of its nearest cut by more
    # than `cliff`, grown by its painted contour — the depth model's edge is soft
    # over a few pixels and the painting's ink line sits in it, and both belong to
    # the subject: on the front, they move with it; on the back, they are filled,
    # so no copy of the edge stays behind when the camera moves (D228; the dark
    # seam and the halos of the verifier's round 2).
    occluder = ((np.where(np.isfinite(carried), norm - carried, 0.0)) > cliff) & within
    subject = grow(occluder, contour_px)
    # BLUE — the front's KEEP MASK. The front is cut at the cells and, pixel by
    # pixel, over the band the red was grown across (red over the painting's own
    # by more than `cliff`), less the subject and its contour.
    band = ((front - own) > cliff) & ~subject
    cut = zone | band
    keep = ~cut
    # The back layer's colour: the painting wherever the seat sees the back
    # through the front's cut (the cut grown `seam_px`, for the texture filter's
    # half texel), the subject filled everywhere else, from the seeds — texels
    # clear of every subject by its contour and a guard.
    seen = grow(cut, seam_px)
    hide = subject & ~seen
    seeds = ~grow(occluder, contour_px + FILL_GUARD_PX) & ~hide
    colour = rgb.copy()
    if hide.any() and seeds.any():
        colour = fill_behind(rgb, hide, seeds, norm, carried, cliff)
    m = int(round(margin * h))
    padded = continue_past_edges(colour, m)
    return {
        "front": front, "back": behind, "keep": keep, "own": own, "colour": padded, "cut": cut, "band": band,
        "hidden": hide, "subject": subject, "seeds": seeds, "margin": m,
    }


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
                made = layers(
                    norm, rgb, dilate_px, blur_px, float(back["cliff"]), back["cells"], float(back["margin"]),
                    float(back["contourPx"]), float(back["seamPx"]), float(back["reachPx"]),
                )
                depth, behind, keep, padded, cut, hide, m = (
                    made["front"], made["back"], made["keep"], made["colour"], made["cut"], made["hidden"], made["margin"]
                )
                jpg = Image.fromarray(np.round(np.clip(padded, 0.0, 1.0) * 255.0).astype(np.uint8))
                part = back_out + f".{os.getpid()}.part"
                jpg.save(part, format="JPEG", quality=95, subsampling=0, optimize=True)
                os.replace(part, back_out)
                planes = np.stack([depth, behind, keep.astype(np.float64)], axis=-1)
                png = Image.fromarray(np.round(planes * 255.0).astype(np.uint8))
                line.update({
                    "backWidth": cw + 2 * m, "backHeight": ch + 2 * m, "margin": m,
                    "backBytes": os.path.getsize(back_out), "backMs": round((time.time() - tb) * 1000.0, 1),
                    "hidden": round(float(hide.mean()), 4), "cut": round(float(cut.mean()), 4),
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
