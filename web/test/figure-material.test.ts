/*
 * mtg-table — web/test/figure-material.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure material's contract** (Lane LOOK, D137, D144, D145), read off the
 * material itself rather than off a GPU: `node --test` cannot compile GLSL, so
 * what it holds is the shape the shader depends on —
 *
 *  - a committed body (no vertex colours, no map) builds the ONE program's
 *    material: no `USE_PAINT_MAP` define, `vertexColors` off, the hologram until
 *    the look is written at commit (`uLook` 0), `uMaterialize` at identity;
 *  - **the paint input path** (D144): a map adds the `USE_PAINT_MAP` define and
 *    rides `uPaintMap`, vertex colours turn on three's `USE_COLOR`, and in the
 *    fragment shader both reach the paint BEFORE the hologram and the comic
 *    block read it — so a textured model is painted under the same bands, rim and
 *    halftone, not tinted after them. **D196**: a personal model's map is its OWN
 *    colour (`uPaintOwn` 1): the comic look paints the texture as it is and the
 *    hologram tints its values with the palette; a cutout map discards under 0.5;
 *    a model of several paints is SIBLING materials that share the first one's
 *    uniform objects, marked and disposed with it;
 *  - the comic block's uniforms are the SAME value objects in every figure and
 *    prop material (`COMIC_UNIFORMS`), so `applyComicGlobals` reaches all of them
 *    with one write — a copied uniform would silently freeze one material's look;
 *  - no clock anywhere in either shader;
 *  - **the painted mark** (D146): `applyLook` with any comic in it sets blend
 *    STATE that writes alpha 0 (the ink's mask) and blends colour exactly as
 *    `NormalBlending` does; the hologram (`uLook` 0) is plain `NormalBlending`; a
 *    painted prop kind is marked with its look and a light (additive) never is —
 *    and the mark adds no define and no program: the shader source and the
 *    defines are the same marked or not, and only `blending` and its factors
 *    move (three keys a program on the source, the defines and the parameters
 *    it derives, none of which is a blend factor).
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
  dressFigureMeshes,
  makeFigureMaterial,
  markPainted,
  siblingsOf,
} from '../src/arena/scene/figureMaterial.ts';
import { PROP_LOOK, applyPropLook, makePropMaterial } from '../src/arena/scene/propMaterial.ts';

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

test('figure material: the paint input path — a map and vertex colours multiply the palette BEFORE either look (D144)', () => {
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
  // its map — and only then the hologram and the comic block read the paint.
  const fragment = mapped.fragmentShader;
  const at = (needle: string): number => {
    const i = fragment.indexOf(needle);
    assert.ok(i >= 0, `the fragment shader lost \`${needle}\``);
    return i;
  };
  const colour = at('painted *= vColor.rgb;');
  const texture = at('vec4 paintTexel = texture2D( uPaintMap, vPaintUv );');
  const holoPaint = at('holoPaint = mix( painted * paintTexel.rgb, painted * ( 0.35 + 0.9 * paintLuma ), uPaintOwn );');
  const ownPaint = at('painted = mix( painted, vec3( 1.0 ), uPaintOwn ) * paintTexel.rgb;');
  const holo = at('vec3 body = holoPaint;');
  const comic = at('comicShade( comicPaint( painted )');
  assert.ok(colour < holo && texture < holoPaint && holoPaint < holo, 'the paint input must reach the hologram');
  assert.ok(colour < comic && ownPaint < comic, 'the paint input must sit UNDER the bands, halftone and rim');
  // Each behind its define, so a body that carries neither compiles neither.
  assert.match(fragment, /#ifdef USE_COLOR\s+painted \*= vColor\.rgb;\s+#endif/);
  assert.match(fragment, /#ifdef USE_PAINT_MAP\s+vec4 paintTexel = texture2D\( uPaintMap, vPaintUv \);[\s\S]*?#endif\n/);
  assert.match(fragment, /#ifdef USE_PAINT_CUTOFF\s+if \( paintTexel\.a < 0\.5 \) discard;\s+#endif/);
  assert.match(mapped.vertexShader, /#ifdef USE_PAINT_MAP\s+vPaintUv = uv;\s+#endif/);
  // D144's own semantics hold for a map that is not a personal model's: uPaintOwn 0.
  assert.equal(mapped.uniforms.uPaintOwn.value, 0);
  for (const m of [mapped, coloured, both]) m.dispose();
});

test('figure material: a personal model paints in its own colours, a cutout discards, and its paints share one figure (D196)', () => {
  const own = makeFigureMaterial('#3a6ea5', 1, { map: new THREE.Texture(), own: true, cutout: true });
  assert.equal(own.uniforms.uPaintOwn.value, 1, 'a personal map is its own colour');
  assert.equal(own.defines.USE_PAINT_CUTOFF, '', 'a cutout map discards');
  own.dispose();
  // dressFigureMeshes: a committed body (no map) → ONE material on every mesh, as before.
  const plain = [new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial()), new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial())];
  const one = dressFigureMeshes(plain, '#ffffff', 1);
  assert.equal(plain[0]!.material, one);
  assert.equal(plain[1]!.material, one);
  assert.deepEqual(one.defines ?? {}, {}, 'a committed body stays the one program');
  assert.equal(siblingsOf(one).length, 0);
  one.dispose();
  // A personal model of two paints: the first material is the figure's, the second a sibling sharing its uniform OBJECTS.
  const a = new THREE.Texture();
  const b = new THREE.Texture();
  const cut = new THREE.MeshStandardMaterial({ map: b });
  cut.alphaTest = 0.5;
  const meshes = [
    new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: a })),
    new THREE.Mesh(new THREE.BufferGeometry(), cut),
    new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: a })),
  ];
  const primary = dressFigureMeshes(meshes, '#a33a3a', 1);
  const [sibling] = siblingsOf(primary);
  assert.ok(sibling !== undefined, 'the second paint is a sibling');
  assert.equal(meshes[0]!.material, primary);
  assert.equal(meshes[2]!.material, primary, 'the same map is the same material');
  assert.equal(meshes[1]!.material, sibling);
  assert.equal(primary.uniforms.uPaintMap.value, a);
  assert.equal(sibling.uniforms.uPaintMap.value, b, 'each paint keeps its own map');
  assert.equal(sibling.defines.USE_PAINT_CUTOFF, '', 'the cutout is the paint\'s own');
  for (const name of ['uTint', 'uOpacity', 'uLook', 'uMaterialize', 'uDrain', 'uDrainTo', 'uCostumeOn', 'uPaintOwn'] as const) {
    assert.equal(sibling.uniforms[name], primary.uniforms[name], `${name} is a copy in the sibling: the frame loop's write would miss it`);
  }
  primary.uniforms.uOpacity.value = 0.4;
  assert.equal(sibling.uniforms.uOpacity.value, 0.4);
  applyLook(primary, 1);
  assert.equal(sibling.blending, THREE.CustomBlending, 'the sibling is marked painted with its figure (D146)');
  applyLook(primary, 0);
  assert.equal(sibling.blending, THREE.NormalBlending);
  let disposed = false;
  sibling.addEventListener('dispose', () => {
    disposed = true;
  });
  primary.dispose();
  assert.ok(disposed, 'disposing the figure disposes its other paints');
});

test('figure material: the comic block is ONE set of uniform objects, shared by every figure and prop material (D145)', () => {
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

test('figure material: the painted mark — alpha 0 on a painted surface, normal colour blending, no new program (D146)', () => {
  const material = makeFigureMaterial('#3a6ea5', 1);
  assert.equal(material.blending, THREE.NormalBlending, 'a new material (the hologram) is not marked');
  const source = { vertex: material.vertexShader, fragment: material.fragmentShader, defines: JSON.stringify(material.defines ?? {}) };
  applyLook(material, 1);
  assert.equal(material.blending, THREE.CustomBlending, 'a painted figure does not mark itself for the ink');
  // Colour exactly as NormalBlending (non-premultiplied): SRC_ALPHA, ONE_MINUS_SRC_ALPHA.
  assert.equal(material.blendEquation, THREE.AddEquation);
  assert.equal(material.blendSrc, THREE.SrcAlphaFactor);
  assert.equal(material.blendDst, THREE.OneMinusSrcAlphaFactor);
  // Alpha: replaced by 0 — the mark the ink reads.
  assert.equal(material.blendEquationAlpha, THREE.AddEquation);
  assert.equal(material.blendSrcAlpha, THREE.ZeroFactor);
  assert.equal(material.blendDstAlpha, THREE.ZeroFactor);
  assert.equal(material.premultipliedAlpha, false, 'premultipliedAlpha is a define: the mark must not flip it');
  assert.equal(material.transparent, true, 'the transparent pass is where figures sort');
  // Half comic (a summoning-sick figure, D142) is still a painted body.
  applyLook(material, 0.5);
  assert.equal(material.blending, THREE.CustomBlending);
  // Back to the hologram: unmarked, no ink on it.
  applyLook(material, 0);
  assert.equal(material.blending, THREE.NormalBlending);
  // No program change: the same source and defines, marked or not.
  applyLook(material, 1);
  assert.equal(material.vertexShader, source.vertex);
  assert.equal(material.fragmentShader, source.fragment);
  assert.equal(JSON.stringify(material.defines ?? {}), source.defines);
  // markPainted is idempotent.
  markPainted(material, true);
  assert.equal(material.blendSrcAlpha, THREE.ZeroFactor);
  material.dispose();

  // Props: a painted kind is marked with the look; a light never is.
  const cloth = makePropMaterial(PROP_LOOK.fabric, false);
  const light = makePropMaterial(PROP_LOOK.fabric, true);
  assert.equal(cloth.userData.painted, true);
  assert.equal(light.userData.painted, false);
  applyPropLook(cloth, materialLookOf(COMIC_LOOK));
  applyPropLook(light, materialLookOf(COMIC_LOOK));
  assert.equal(cloth.blending, THREE.CustomBlending, 'a painted prop kind is not marked');
  assert.equal(cloth.blendSrcAlpha, THREE.ZeroFactor);
  assert.equal(light.blending, THREE.AdditiveBlending, 'a light lost its additive blend to the mark');
  applyPropLook(cloth, HOLO_MATERIAL);
  assert.equal(cloth.blending, THREE.NormalBlending, 'a painted prop kind stays marked under the hologram');
  cloth.dispose();
  light.dispose();
});

test('figure material: black is blue WITH blue highlights — a dark paint’s lit band is lifted, hue kept (the verification pass)', () => {
  const material = makeFigureMaterial('#101014', 1);
  const fragment = material.fragmentShader;
  // The lift sits in the shared comic block, on the LIT band only, before the mid and core bands.
  assert.match(fragment, /uniform vec3 uDarkLift;/);
  const lift = fragment.indexOf('vec3 litPaint = mix( paint, max( paint, paint * ( uDarkLift.z / max( lum, 1e-4 ) ) ), dark );');
  const bands = fragment.indexOf('vec3 c = mix( litPaint, paint * mix( uShadowTone, vec3( 1.0 ), uMidMix ), 1.0 - lit );');
  assert.ok(lift > 0 && bands > lift, 'the dark lift is not applied to the lit band before the bands are mixed');
  assert.equal(material.uniforms.uDarkLift, COMIC_UNIFORMS.uDarkLift, 'the lift is a copy, not the shared uniform');
  material.dispose();
});
