/*
 * mtg-table — web/test/figure-material.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure material's contract** (Lane LOOK, D120, D127, D128), read off the
 * material itself rather than off a GPU: `node --test` cannot compile GLSL, so
 * what it holds is the shape the shader depends on —
 *
 *  - a committed body (no vertex colours, no map) builds the ONE program's
 *    material: no `USE_PAINT_MAP` define, `vertexColors` off, the hologram until
 *    the look is written at commit (`uLook` 0), `uMaterialize` at identity;
 *  - **the paint input path** (D127): a map adds the `USE_PAINT_MAP` define and
 *    rides `uPaintMap`, vertex colours turn on three's `USE_COLOR`, and in the
 *    fragment shader both multiply the palette BEFORE the hologram and the comic
 *    block read it — so a textured model is painted under the same bands, rim and
 *    halftone, not tinted after them;
 *  - the comic block's uniforms are the SAME value objects in every figure and
 *    prop material (`COMIC_UNIFORMS`), so `applyComicGlobals` reaches all of them
 *    with one write — a copied uniform would silently freeze one material's look;
 *  - no clock anywhere in either shader.
 *
 * That all four variants compile and multiply on a real GPU is checked in the
 * browser (`docs/evidence/look.md`, *The paint input path*).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as THREE from 'three';

import { HOLO_MATERIAL, materialLookOf, COMIC_LOOK } from '../src/arena/look.ts';
import {
  COMIC_UNIFORMS,
  applyComicGlobals,
  applyLook,
  makeFigureMaterial,
} from '../src/arena/scene/figureMaterial.ts';
import { PROP_LOOK, makePropMaterial } from '../src/arena/scene/propMaterial.ts';

test('figure material: a committed body is the one program — no paint define, no vertex colours, the hologram until commit', () => {
  const material = makeFigureMaterial('#3a6ea5', 1);
  assert.deepEqual(material.defines ?? {}, {}, 'a body with no map must not define USE_PAINT_MAP');
  assert.equal(material.vertexColors, false);
  assert.equal(material.uniforms.uLook.value, 0, 'a new material starts in the hologram until applyLook');
  assert.equal(material.uniforms.uMaterialize.value, 1, 'uMaterialize is identity 1 (Lane MOTION multiplies it in)');
  assert.equal(material.uniforms.uPaintMap.value, null);
  applyLook(material, 1);
  assert.equal(material.uniforms.uLook.value, 1);
  material.dispose();
});

test('figure material: the paint input path — a map and vertex colours multiply the palette BEFORE either look (D127)', () => {
  const map = new THREE.Texture();
  const mapped = makeFigureMaterial('#ffffff', 1, { map });
  assert.equal(mapped.defines.USE_PAINT_MAP, '', 'a map defines USE_PAINT_MAP');
  assert.equal(mapped.uniforms.uPaintMap.value, map);
  assert.equal(mapped.vertexColors, false);

  const coloured = makeFigureMaterial('#ffffff', 1, { vertexColors: true });
  assert.equal(coloured.vertexColors, true, 'vertex colours turn on three’s USE_COLOR');
  assert.equal(coloured.defines.USE_PAINT_MAP, undefined);

  const both = makeFigureMaterial('#ffffff', 1, { map, vertexColors: true });
  assert.equal(both.defines.USE_PAINT_MAP, '');
  assert.equal(both.vertexColors, true);

  // The order in the fragment shader: the palette, times the model's colour, times
  // its map — and only then the hologram and the comic block read `painted`.
  const fragment = mapped.fragmentShader;
  const at = (needle: string): number => {
    const i = fragment.indexOf(needle);
    assert.ok(i >= 0, `the fragment shader lost \`${needle}\``);
    return i;
  };
  const colour = at('painted *= vColor.rgb;');
  const texture = at('painted *= texture2D( uPaintMap, vPaintUv ).rgb;');
  const holo = at('vec3 body = painted;');
  const comic = at('comicShade( comicPaint( painted )');
  assert.ok(colour < holo && texture < holo, 'the paint input must reach the hologram');
  assert.ok(colour < comic && texture < comic, 'the paint input must sit UNDER the bands, halftone and rim');
  // Each behind its define, so a body that carries neither compiles neither.
  assert.match(fragment, /#ifdef USE_COLOR\s+painted \*= vColor\.rgb;\s+#endif/);
  assert.match(fragment, /#ifdef USE_PAINT_MAP\s+painted \*= texture2D\( uPaintMap, vPaintUv \)\.rgb;\s+#endif/);
  assert.match(mapped.vertexShader, /#ifdef USE_PAINT_MAP\s+vPaintUv = uv;\s+#endif/);
  for (const m of [mapped, coloured, both]) m.dispose();
});

test('figure material: the comic block is ONE set of uniform objects, shared by every figure and prop material (D128)', () => {
  const a = makeFigureMaterial('#aa3333', 1);
  const b = makeFigureMaterial('#33aa33', 2);
  const prop = makePropMaterial(PROP_LOOK.fabric, false);
  for (const name of Object.keys(COMIC_UNIFORMS) as (keyof typeof COMIC_UNIFORMS)[]) {
    assert.equal(a.uniforms[name], COMIC_UNIFORMS[name], `${name} is a copy in a figure material`);
    assert.equal(b.uniforms[name], COMIC_UNIFORMS[name], `${name} is a copy in a second figure material`);
    assert.equal((prop.uniforms as Record<string, unknown>)[name], COMIC_UNIFORMS[name], `${name} is a copy in the prop material`);
  }
  // One commit-time write reaches all three.
  const before = { depth: COMIC_UNIFORMS.uDotDepth.value, px: COMIC_UNIFORMS.uDotPx.value, frame: COMIC_UNIFORMS.uKeyFrame.value };
  applyComicGlobals(HOLO_MATERIAL, 1.5);
  assert.equal(a.uniforms.uDotDepth.value, 0, 'the hologram has no halftone');
  assert.equal((prop.uniforms as unknown as typeof COMIC_UNIFORMS).uDotPx.value, COMIC_UNIFORMS.uDotPx.value);
  applyComicGlobals({ ...materialLookOf(COMIC_LOOK), keyWorld: 1 }, 2);
  assert.ok(b.uniforms.uDotDepth.value > 0);
  assert.equal(a.uniforms.uKeyFrame.value, 1);
  assert.equal(b.uniforms.uDotPx.value, a.uniforms.uDotPx.value);
  // Put the shared state back, so the order of the suite does not matter.
  COMIC_UNIFORMS.uDotDepth.value = before.depth;
  COMIC_UNIFORMS.uDotPx.value = before.px;
  COMIC_UNIFORMS.uKeyFrame.value = before.frame;
  for (const m of [a, b, prop]) m.dispose();
});

test('figure material: no clock in either shader (D58, D72)', () => {
  const figure = makeFigureMaterial('#ffffff', 1, { map: new THREE.Texture(), vertexColors: true });
  const prop = makePropMaterial(PROP_LOOK.fabric, false);
  for (const [name, source] of [
    ['figure vertex', figure.vertexShader],
    ['figure fragment', figure.fragmentShader],
    ['prop vertex', prop.vertexShader],
    ['prop fragment', prop.fragmentShader],
  ] as const) {
    // Comments stripped: the shaders SAY "never of time", which is the point.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!/\bu?time\b/i.test(code), `${name} reads a clock`);
  }
  figure.dispose();
  prop.dispose();
});
