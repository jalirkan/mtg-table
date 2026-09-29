# The personal tier — models of the real characters, on this machine only

*2026-09-28, **D190**–**D193** (phase 1: the folder, the manifest and the
pipeline) and **D194**–**D196** (phase 2: the clips baked in, the paint step, the
verdict file, and the loader that draws a personal model in the arena and the
workshop — from the Vite dev server only); 2026-09-29, **D225**–**D226** (the
relief cache: a depth map of every card's painting, and the workshop's inspect
view drawing the painting as a window with depth — *The relief cache*, below);
**D240**–**D241** (a dressed figure is ONE draw call — every paint in one atlas,
*The atlas*, below — and `I` in the arena opens the inspect view on the card
under the pointer). PLAN.md, *The personal tier*, *The relief window* and *Arena
personal polish*, has the status and the follow-ups.*

## What it is

mtg-table has two tiers of 3D figures, and they never mix.

| | the repository tier | the personal tier |
|---|---|---|
| what | CC0 bodies, props and clips (`web/public/models/figures.glb`) | rigged models of the actual Marvel characters |
| where | committed, in git | `personal/models/<slug>/`, gitignored |
| licence | CC0 with a written provenance (**D54**), code GPL-3.0-or-later | whatever the source grants for **personal use** |
| who fetches it | the build, from sources in `tools/assets-manifest.json` | **you**, with your own account, under a licence you read |
| shared? | may be published | **never** |

The rule is yours, in your own words: **"this can never ever ever be sold or
published".** Everything below follows from it:

- **Never committed.** `.gitignore` ignores `/personal/` — anchored at the
  repository root, so `git add -A` skips it and `tools/personal/` (the committed
  pipeline) is still seen. `web/test/personal-tier.test.ts` holds both halves
  with `git check-ignore --no-index` (git never calls a tracked file ignored, so
  the patterns are asked about directly), and it fails if git ever tracks a file under
  `personal/`.
- **Never pushed, never in a build, never in CI.** A production build
  (`web/dist/`) cannot contain it — the arena names the route only behind
  `import.meta.env.DEV`, and `web/test/personal.test.ts` greps the build for the
  route and every slug; CI has no copy. The Vite **dev server alone** serves it,
  the way the card library's images are served (**D92**) — never `vite preview`,
  never a build (*In the game*, below).
- **Never in a committed picture.** The previews `check.mjs` renders stay in
  `personal/models/<slug>/preview/`, and the headless browser that draws them
  leaves no copy anywhere else: its profile is
  `personal/models/<slug>/.preview-profile/` for the run and is deleted after
  it, and every answer it is given is `no-store` (**D192**); before it is
  deleted the profile is read, and a copy of `model.glb` in it fails the run
  (**D193**). (The snap
  Chromium's launcher still rewrites its own crash-reporter `settings.dat` and
  an ibus link under `~/snap/chromium/` on every start, as it does for any
  Chromium; neither holds anything of the model.) A screenshot of a personal
  model does not go into `docs/`, an issue, a pull request or a chat with
  anyone.
- **The repository tier is unchanged.** D54 still binds everything committed:
  CC0 only, a provenance per asset, nothing from Mixamo, nothing made from card
  art. The personal tier does not relax it; it sits beside it.

A card — or a duelist seat — points at a personal model when one is present and
falls back to the repository figure when it is not, so a checkout without
`personal/` plays exactly as before. **Hard rule 8 still binds:** a personal
model is chosen by card name only where the arena already draws a named figure,
and never for a face-down or redacted card, which stays the anonymous disc
(`web/src/arena/personal.ts`'s `personalChoicesOf` decides it, and a corpus test
with a hostile overlay holds it — D195).

## The folder

```
personal/models/<slug>/
  doctor_doom.zip     the download, byte for byte, untouched
  source/             what import.mjs unpacked from it (scene.gltf, scene.bin, textures/…)
  SOURCE.txt          title, URL, author, licence as shown, date — yours to check
  inspect.json        what import.mjs found in the file
  bones.json          optional: your rig map, when the automatic one is wrong or blind
  model.glb           the prepared figure, our clip set baked in (prepare.mjs)
  manifest.json       what it dresses and how it was made (prepare.mjs)
  check.json          check.mjs's verdict and the sha256 of the model.glb it judged (check.mjs)
  preview/*.png       front, side, back, mid-attack, the sheet, kneel, death (check.mjs)
```

**The slug** is the card's name, lowercased, accents folded, every character
that is not a letter, a digit, a space or a hyphen dropped, spaces to hyphens,
repeated hyphens collapsed: `Doctor Doom` → `doctor-doom`, `Nick Fury, Spymaster`
→ `nick-fury-spymaster`, `Ant-Man, Reformed Rogue` → `ant-man-reformed-rogue` (a
hyphen is kept), `T'Challa, the Black Panther` → `tchalla-the-black-panther`. A
tool writes only inside its own slug's folder — every path goes through one
guard, `insideSlug` in `tools/personal/lib.mjs`, and that includes the preview
browser `check.mjs` starts.

**SOURCE.txt** keeps the project's written-provenance habit for your own files:
the model's title, its URL, its author, the licence line **as the page showed
it**, and the date you downloaded it. `import.mjs` drafts one from what the file
says about itself (a Sketchfab export carries title, author, licence and URL in
`asset.extras`, and its zip a `license.txt`) when the folder has none, and never
overwrites yours. Check the draft against the page: Doom's file names its author
`RadioactiveAG`, where the survey read the page as *AGW Entertainment*. A CC-BY
licence asks for a credit line; `manifest.json` carries it, and it is owed the day
anything is shown to anyone — which, for this tier, is never.

## The pipeline

Three commands, run from the repository root (hard rule 9). None of them touches
the network, accepts a licence or refuses a file: every flag they print is
information for you.

```bash
node tools/personal/import.mjs  ~/Downloads/doctor_doom.zip doctor-doom
node tools/personal/prepare.mjs doctor-doom --card "Doctor Doom" --seat villain
node tools/personal/check.mjs   doctor-doom
```

**`import.mjs <zip | .gltf | .glb | .vrm> <slug>`** copies the download into the
folder, unpacks it into `source/` (each zip member CRC-checked and held inside the
folder), drafts `SOURCE.txt`, and inspects the model: scenes, nodes, meshes
(names, triangles, materials, textures), skins (joint names, count, hierarchy,
which joints carry weight), animations, bounds and units, the generator and
`asset.extras`, the **rest pose** (T or A — the upper arm's angle below the
horizontal, measured from the inverse bind matrices), the automatic rig map, and
three kinds of flag:

- **rig control meshes** — Auto-Rig Pro's `cs_*` widgets under `cs_grp`,
  Rigify's `WGT-*`, `*_shape`, `ctrl`, `MCH-`, `ORG-`: shapes an animator clicks
  in Blender, which a converted glTF draws as geometry;
- **unskinned meshes** — they will not follow the skeleton (Doom's cloak);
- **game-asset name patterns** — `M-FF_…`, `Char_…_Skin01`, `T_M_MED_…`, `_LW`,
  `sv_…01_s01_`, numeric part names, `SK_`/`SM_`: a name is the only provenance a
  file carries, so the tool says what it recognises and leaves the call to you.

It writes `inspect.json` and prints the same as a report.

**`prepare.mjs <slug>`** makes the download a figure the arena's clips can drive,
and writes only `model.glb` and `manifest.json` (**D191** is the decision):

| flag | default | what |
|---|---|---|
| `--card "<name>"`, `--seat you\|opp\|director\|villain` | the last manifest's | what it dresses; repeatable; at least one (a seat by itself or by its duelist look, D99) |
| `--budget <n>` | 6000 | triangles, after decimation |
| `--pose t\|none` | `t` | re-pose an A-pose to our T (`none` keeps the source's rest) |
| `--map auto\|<file>` | `auto` | `auto` reads `bones.json` beside the model when there is one, else the joint names |
| `--cloak-to <joint>` | the height rule | bind every unskinned mesh wholly to one of our joints |
| `--bind <regex>=<joint>` | — | bind the unskinned parts whose name matches to one joint (a pair of wings to `spine_03`) |
| `--drop <regex>` | — | leave out render meshes whose name matches (a base plane, a shadow disc, eye-occlusion layers) |
| `--height <m>` | the `agent` body's 1.9139 | the figure's height |
| `--joints bind\|rest` | `bind` | read the joints AND the vertices at the skin's bind pose, or at the file's rest (its nodes as they stand); `inspect.json`'s *bind vs rest* spread says when there is a choice (D194) |
| `--exposure auto\|off\|<gain>` | `auto` | lift a paint authored too dark for an unlit figure: `auto` multiplies every paint by one gain in linear light when the surface's 90th-percentile luminance is under 0.2 (at most ×8, each texel's hue held); `off` keeps it as it came; a number is the gain (D198) |
| `--disabled ["<reason>"]`, `--enabled` | the last manifest's | keep the model out of the game's index, with the reason the dev server prints |

In order: it strips the control meshes and every node that draws nothing;
rebuilds the skeleton as `root` plus **our 22 joints** (the ones
`tools/build-figures.mjs` retargets, `tools/assets-manifest.json`'s
`rigs.ubc.retarget.joints`), each at the source bone's position and in our bind
orientation, merging every weighted source bone into one of them; turns an A-pose
into our T; skins what had no skin; stands the model up facing +Z with its feet at
0 and scales it; decimates to the budget (welding a part on position and UV when
the simplifier stops at its seams); **bakes our clip set in** — the twelve clips
`figures.glb` gives the `agent`, carried onto this skeleton by `retarget.mjs`, the
pelvis scaled by the two hip heights, as the file's own animations named by key
(D194); runs **the paint step** — every part merged into ONE skinned primitive
under ONE material, a model of several paints packed into one atlas (a repeating
paint laid out over the UV tiles it spans), base colour only (the normal maps
go: the arena draws none — *The atlas*, below, D240); **exposes the paint** — the arena draws the model
unlit, so a texture authored for a lit renderer (Doom's: 85% of his surface under
linear luminance 0.02) is lifted until its surface's 90th percentile reads 0.2,
one gain for the model, hue held, recorded in the manifest's `paint.exposure`
(D198); and compresses with meshopt last.
It prints a before/after table.

**`check.mjs <slug>`** plays our clips on the result and judges its rig map:
that its own copy of the build's retarget reproduces the build's clips, then
that idle, attack, hit, die and the kneel carried onto the model move every joint
the `agent` body moves, by the same world-space delta, with no NaN, no exploded
skinning, and the cloak following the spine. Those rotations hold **by
construction** — prepare builds every skeleton in the `agent`'s bind rotations —
so they cannot tell a wrong rig map from a right one. What can is judged against
the `agent` body. **Where the weight goes and where the joints stand**
(**D192**): every core joint carries skin weight where the agent's does (a hand
mapped to a controller with no weight fails), bones placed by position carry at
most 2% of the weight, every `_l` joint and its vertices sit on the character's
left (+x), each foot's vertices are in front of its ankle (a map with left and
right swapped turns the whole figure round, and its feet then point backwards),
and the branches (pelvis → thigh, spine → clavicle) and the toes point within
60° of the agent's. **The limbs** (**D193**): each link of the spine, the arms
and the legs points within 25° of the agent's (45° for the spine and the neck);
the forearm keeps the agent's proportion to the upper arm, and the calf to the
thigh, within 1/1.6–1.6×; the vertices each limb joint carries lie AHEAD of it
along its link; and at t = 0.5 of the attack the hands, the feet and the head
move the agent's way. A map that swaps two joints of a chain — the forearm and
the hand, a thigh and a calf, `spine_02` and `spine_03` — fails here: `--pose t`
turns the arm links onto the agent's directions whatever they pointed at, but
it cannot fix their lengths, and it turns the flesh with them, so a folded
forearm carries its vertices behind its joint. It prints the joint-coverage table
— weight on the model and on the agent, vertices, rotation — the side, facing
and shape lines and the limb table; then (step 2c, D194) holds the clips BAKED
into `model.glb` to the retarget it just ran — every joint within 2° and the
pelvis within 1% of the height — and renders the previews through headless
Chromium (`--no-preview` skips them). The browser runs with its background
services off and every host name answered "not found", and its own net log is
read back: a connection, a byte sent, a DNS query, an answer or an HTTP cache
entry beyond 127.0.0.1 fails the run, and so does a copy of `model.glb` in its
profile. Exit 1 on any failure; the closing OK line lists what was judged and
nothing more. Either way it writes **`check.json`** — pass or fail, the failures,
what was judged and the sha256 of the `model.glb` it judged — which is what the
dev server reads before it will load the model. `docs/evidence/personal-tier.md` is Doom, run through all three.

## The manifest

`manifest.json`, version 2 (a version-1 manifest — phase 1's — names a model with
no baked clips, and the dev server skips it and says to prepare it again).
`validateManifest` in `tools/personal/lib.mjs` is the
schema; an unknown key is an error, and keys starting with `_` are comments.

| key | what |
|---|---|
| `version` | `2` |
| `slug` | the folder's own name |
| `dresses` | `[{ "card": "<exact card name>" } \| { "seat": "you" \| "opp" \| "director" \| "villain" }, …]` — at least one; the seats are `duelists.json`'s, named by themselves or by the look they wear (`opp` is the `villain`) |
| `model` | `"model.glb"`, a relative path inside the folder |
| `source` | `{ file, bytes, sha256, model, sourceTxt }` — the download, untouched |
| `credits` | the credit line the licence asks for |
| `licence` | the licence as the source showed it |
| `rig` | `{ convention, mapFile, joints: { <our joint>: { primary, followers, by, primaryWeighted, byAncestry, byPosition } }, synthesised, placement: { byAncestry, byPosition, byPositionWeight }, … }` — the rig map used, how every weighted source bone was placed, and the share of the skin weight placed by position (check.mjs fails over 2%) |
| `triangles` | `{ source, render, budget, after, parts: [{ part, material, before, after, kept }] }` |
| `pose` | `{ before: { verdict, upperArmDeg }, fix: "t" \| "none", turnsDeg, after: { … } }` — the arm angle measured before and after |
| `skinned` | `[{ part, material, rule, vertices }]` — every mesh the tool gave weights to, and by which rule |
| `textures` | `[{ name, slot: "baseColor" \| "normal" \| "atlas", size, bytes, downscaled }]` — a paint's own texture no side over 1024, the atlas no side over 2048 (D240) |
| `dropped` | `{ controlMeshes, meshesByFlag, controlTriangles, nodes, joints, textureSlots }` |
| `units` | `{ sourceHeight, height, scale, facing: "+z", up: "+y" }` |
| `prepared` | `{ tool, date, budget, bytes, sha256 }` |
| `clips` | `{ keys, source, fps, baked, dropped }` — the clip set baked into `model.glb` (must include `idle`), and the source's own takes it dropped |
| `paint` | optional: `{ primitives: [{ material, atlas, cutout, texture, triangles, parts: [{ part, first, count }] }], atlas, droppedNormalTextures, exposure: { mode, target, max, gain, before, after, capped } }` — since D240 exactly ONE primitive (`paint-0`), its parts' vertex ranges; `atlas` `null` for a model of one paint, else `{ size: [w, h], budget: 2048, scale, gutter, regions: [{ source, factor, cutout, span, rect, parts, gain }] }`; `exposure` the surface's linear-luminance p10/p50/p90 before and after the gain (D198). A manifest from before D240 (two primitives, or `null` for an untextured model) fails `validateManifest`: prepare it again |
| `disabled` | optional: `true`, or the reason as a sentence — the dev server skips the model and prints the reason |

## The rig map, and `bones.json`

Our joints are the Unreal mannequin's names — `pelvis`, `spine_01`–`spine_03`,
`neck_01`, `Head`, and per side `clavicle`, `upperarm`, `lowerarm`, `hand`,
`thigh`, `calf`, `foot`, `ball`. The automatic map knows five conventions and
picks the one that names the most of them:

| convention | how its bones are spelled |
|---|---|
| **Auto-Rig Pro** | `root.x`, `spine_01.x`, `neck.x`, `head.x`, `shoulder.l`, `arm_twist.l` + `arm_stretch.l`, `forearm_stretch.l` + `forearm_twist.l`, `hand.l`, `thigh_twist.l` + `thigh_stretch.l`, `leg_stretch.l` + `leg_twist.l`, `foot.l`, `toes_01.l` |
| **Mixamo** | `mixamorig:Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `LeftShoulder`, `LeftArm`, `LeftForeArm`, `LeftHand`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftToeBase` (any `mixamorig<n>:` namespace) |
| **Unreal** | the names above, UE4 or UE5 (`spine_04`/`05` and `neck_02` merged; twist bones merged) |
| **VRM** | `hips`, `spine`, `chest`, `upperChest`, `neck`, `head`, `leftUpperArm` … and VRoid's `J_Bip_C_Hips` … — a VRM file's own `humanBones` table wins |
| **Character Creator** | `CC_Base_Hip`, `CC_Base_Waist`, `CC_Base_Spine01`, `CC_Base_L_Upperarm` (+ its twist and share bones) … |

Names are compared without case, with a namespace dropped, `.` read as `_`, and
an exporter's trailing `_<number>` allowed (Sketchfab writes `spine_01.x_191`).
The FIRST bone of a list that is present is the joint (its head is where our joint
goes); the others' skin weights are merged into it. A weighted bone no list names
goes to its nearest listed ancestor (the fingers into the hand), else to the
nearest of our segments by position — and the manifest says which.

When the names are custom (the survey's Wasp: `Cuerpo`, `Ropa`, `Ala`), write
`personal/models/<slug>/bones.json` from the joint list in `inspect.json` — one
row per joint of ours, a bone name or a list whose first entry is the joint:

```json
{
  "joints": {
    "pelvis": "mixamorig:Hips",
    "spine_01": "mixamorig:Spine",
    "spine_02": "mixamorig:Spine1",
    "spine_03": "mixamorig:Spine2",
    "neck_01": "mixamorig:Neck",
    "Head": ["mixamorig:Head", "mixamorig:HeadTop_End"],
    "clavicle_l": "mixamorig:LeftShoulder",
    "upperarm_l": "mixamorig:LeftArm",
    "lowerarm_l": "mixamorig:LeftForeArm",
    "hand_l": "mixamorig:LeftHand",
    "clavicle_r": "mixamorig:RightShoulder",
    "upperarm_r": "mixamorig:RightArm",
    "lowerarm_r": "mixamorig:RightForeArm",
    "hand_r": "mixamorig:RightHand",
    "thigh_l": "mixamorig:LeftUpLeg",
    "calf_l": "mixamorig:LeftLeg",
    "foot_l": "mixamorig:LeftFoot",
    "ball_l": "mixamorig:LeftToeBase",
    "thigh_r": "mixamorig:RightUpLeg",
    "calf_r": "mixamorig:RightLeg",
    "foot_r": "mixamorig:RightFoot",
    "ball_r": "mixamorig:RightToeBase"
  }
}
```

That is Mixamo's map written out — the auto map already knows it, so a Mixamo rig
needs no file; it is here as the pattern. A file overrides the automatic map
joint by joint, and a joint it does not name keeps the automatic answer. Every
bone it names must be a joint of the skin, and a joint that is not one of ours is
an error. The spine, the neck, the clavicles and the balls may be missing (they
are put between their neighbours, and the manifest lists them as synthesised);
the pelvis, the head and the arms and legs from shoulder and hip down may not.

## Downloading from Sketchfab — the click-through (you do this)

From the survey (`var/personal-tier/survey.md` in the main checkout). Claude
never downloads a model, creates an account or accepts a licence; the tools only
read what you put on disk.

1. Open <https://sketchfab.com> and **Sign up** (free) or **Log in**. An account
   is needed to download anything.
2. Open the model's page — for Doom,
   <https://sketchfab.com/3d-models/doctor-doom-8b8019a6ac384b48a3c6003a865cf191>.
   Under the viewer, check the licence line (**CC Attribution** for Doom).
   **Editorial** is not usable here; any CC variant is fine for a folder that is
   never published.
3. Click **Download 3D Model**. The dialog lists the formats and restates the
   licence ("Author must be credited"). Read it; downloading under it is your
   acceptance.
4. Take the **autoconverted glTF** (a zip of `scene.gltf`, `scene.bin`,
   `textures/` and a `license.txt` — what `import.mjs` reads best) or the GLB.
   Take the **original** (`.blend`, `.fbx`) too if you may ever open it in Blender:
   the pipeline reads only glTF, and the fixes that need a person are Blender
   work.
5. Run `import.mjs` on the file wherever you saved it; it copies the download
   into `personal/models/<slug>/` and drafts `SOURCE.txt`. Check the draft
   against the page.

**What to leave alone** (survey §2): a model ripped from a game is excluded
however it is labelled — an uploader cannot licence a publisher's asset, and it
is not fan-made. The name patterns `import.mjs` flags are the survey's evidence
of rips (Marvel Strike Force, Future Fight, Fortnite, Contest of Champions,
Marvel Rivals, Ultimate Alliance, Super War); the tool reports them and leaves
the decision to you.

## When a model needs more than the pipeline

`prepare.mjs` handles an A-pose, an unskinned cloak, a controller-heavy rig and
the usual naming conventions. What it cannot do is sculpt: a cloak that should
drape over the legs, shoulder plates that shear when a 60° A-pose is turned to T,
a posed model's legs, or twist bones worth keeping. Those are an evening in
Blender on the original file, exported back to glTF and run through the same three
commands. A portable Blender is your call; nothing here installs one.
`docs/evidence/personal-tier.md` §9 lists what a Blender session would still
improve on Doom.

## In the game — the loader (phase 2)

**D195** is the decision, **D196** the materials and the workshop. The Vite dev
server (`npm --prefix web run dev`, `./scripts/play.sh`, `./scripts/spectate.sh`)
builds an **index** of `personal/models/` when it starts, prints it, and serves
it at `/personal/index.json`; a production build and `vite preview` have none of
it, and the CC0 figures draw. A model is **active** when

- its manifest is version 2 (it carries our clip set),
- it is not `disabled`,
- `check.json` says `check.mjs` passed, and names the `model.glb` on disk (a model
  prepared again since its check is skipped until it is checked again).

- it is within the per-model caps below (the start lines list an over-cap
  model as skipped, so they say what the arena will draw).

Every other model is printed as skipped, with why. Two active models that dress
one card or seat: the first slug keeps it, the other is "shadowed".
`MTG_TABLE_PERSONAL=off` starts a dev server with no personal route at all;
`MTG_TABLE_PERSONAL_DIR=<folder>` reads another folder of models inside the
repository (a scratch tier under `var/`, which is how the worst case below was
benched).

**What it dresses.** A creature whose FACE-UP name a manifest names wears that
model — on the battlefield, and as a creature spell on the stack — and so does its
dying body; a face-down card, a redacted stub, a swarm and a vehicle's silhouette
never do (hard rule 8). A seat a manifest names (`--seat villain` or `opp`, the
opponent's; `director` or `you`, yours) has its duelist built from the model, with
the duelist gestures on our clips. The model brings its own look: none of our
props, no costume. Everything else is the arena's — where the figure stands, how
tall (refitted so its own width stays inside its rank slot), its stance, the
kneel, the translucency of a summoning-sick creature, every cue, and the status
strip over its head (keywords, the bar, pips and marks — D210–D212), which stands
over the model's own refitted height. `?personal=0`
draws the CC0 figures at the same frame (the A/B).

**Its colours are its own** (D196, D198). Under the comic look a model paints in
its texture's colours, inked, banded and rimmed in its card's colour; a dark
texel keeps its hue and is lifted in value (a black suit reads charcoal, Doom's
steel grey and his tunic green) — "black is blue" is the CC0 palette's rule, never
a model's. Under `?look=holo` it is a hologram tinted by its card's colour.

**The budget** (`web/src/arena/perf.ts`, D195 and D197):

- a model over **8,000 triangles** (`PERSONAL_TRI_CAP`) is never loaded —
  prepare it again with a smaller `--budget`; and since **D240** a model is **one
  draw call a figure** (`PERSONAL_CALL_CAP` = 1): the dev route counts the
  primitives and materials in the very `model.glb` it would serve and skips a file
  of more — one prepared before the atlas held every paint (Doom's hood and tunic
  were two) — with "prepare it again";
- at most **4 creatures** (`PERSONAL_MAX_FIGURES`) are dressed at once, in
  placement order;
- and at most **36,000 personal triangles** (`PERSONAL_TABLE_TRIS`) are on the
  table at once — both duelists' models first, then the creatures in placement
  order. A creature whose model would cross it keeps its CC0 figure; a smaller
  model later in the order may still fit. That is two duelists and four creatures
  at 6,000 triangles, or two duelists and two creatures at the 8,000 cap.

Report 13 §8.2's 30,000-triangle line is the CC0 table's — the build's, what
anyone else can run — and it had no headroom at `g1`@316, so the personal tier has
its own line on top of it. Its worst case, measured (evidence §18): the budget
filled by six 6,000-triangle, two-paint models at `g1`@316 is 50,225 triangles and
90 draw calls on the GTX 1080, p95 unchanged at 0.6 ms; on SwiftShader, the
software floor, 53,407 and 95, the median 4 ms slower than the CC0 table, which
already fails §9.4 there. Since D240 each of those six figures is one call, not
two — a dressed figure never costs more calls than the CC0 body it replaces
(`docs/evidence/arena-personal-polish.md`: over every frame of the villain
recording the tier on draws no more calls than the tier off). `node
tools/arena-bench.mjs --personal` holds a frame to §8.2's line plus this one.

**The workshop** (`#workshop`) badges every card an active model dresses, draws
the pedestal dressed as the arena is (the *personal / repo* toggle is the A/B),
and has an **inspect** view: the figure in its signature pose in front of its
card's art box — a window with depth where the relief cache has the painting's
depth map (*The relief cache*, below) — the frame and the text floating beside
it. **From the table** (D241): point at a face-up creature in the arena and press
**`I`** — or click the *⌕ inspect* chip under the art credit — and the workshop
opens on that card's inspect view (`#workshop?card=<name>&view=inspect`), dressed
exactly when the table was and in the same look; its **▣ arena** link comes back
to the same frame. A face-down or hidden card is never inspected: the chip and the
key say so and name nothing.

**Adding a model**, end to end:

```bash
node tools/personal/import.mjs  ~/Downloads/<download> <slug>
node tools/personal/prepare.mjs <slug> --card "<exact card name>"   # add --seat villain for a duelist
node tools/personal/check.mjs   <slug>                              # must print OK; writes check.json
npm --prefix web run dev                                            # restart: the index is built at start
```

If `check.mjs` fails, read its FAIL lines: a joint on the wrong bone is a
`bones.json`; a figure whose rest pose is not its bind pose (a large *bind vs
rest* spread in `inspect.json`) wants the other `--joints`; a part that should not
be drawn (a base plane, eye-occlusion layers) is a `--drop`. What none of those
can fix — a mesh modelled in a pose, an unskinned jacket — is Blender work, and
the model stays `--disabled "<why>"` until then. Evidence §16 is the eight
downloads, each with what it needed.

## The atlas — one draw call a figure (D240)

three draws one call per primitive, and the arena draws each figure with its
own material, so a model's draw calls are its PRIMITIVES. prepare's paint step
makes that one for every model: the parts are grouped by what they paint with
(the base-colour texture, the factor, whether its alpha cuts), and

- **one paint** keeps its own texture (the factor baked into a copy, a
  repeating texture repeating as it came) — or, untextured, its factor;
- **two or more** become REGIONS of one atlas. A region is the paint at its own
  size (≤ 1024 px since D191) times the whole UV tiles its parts span — a paint
  whose UVs WRAP (Doom's tunic reaches `u` 1.87 on a repeating texture) is laid
  out twice side by side, so every triangle samples what REPEAT drew, a triangle
  across the tile edge included — with an 8 px gutter (copied; wrapped for a
  repeating paint), skyline-packed, tallest first, on the smallest sheet that
  holds them at their own size, or all scaled alike to fit;
- and every part is merged into ONE skinned primitive under ONE material (a
  cutout — MASK — if any region cuts; a region that does not is made opaque).

**The texture budget is 2048 px a side** (`ATLAS_MAX`; 16 MiB of RGBA8 before
mipmaps). What the models need:

| model | paints | the texture |
|---|---|---|
| Doctor Doom | 2 (the hood; the tunic, repeating, 2 × 1 tiles) | **2048 × 2048** at ×0.984 — the whole budget: the tunic laid twice is as wide as the sheet |
| Agent Phil Coulson | 12 (Character Creator's parts, the hair a cutout) | 2048 × 1536 at ×0.484 (each 1024 px paint at 496 px) |
| the Hulks | 1 | its own 1024 × 1024 |
| Nick Fury | 1 | its own 512 × 512 |
| Peggy Carter | 3 | 1056 × 1568 at ×1 |
| the MCU Wasp | 2 | 1040 × 1568 at ×1 |

`manifest.json`'s `paint.atlas` records the sheet — its size, the budget, the
scale, the gutter and every region (its source, factor, span, rectangle, parts
and the exposure gain it carries; the exposure runs on the one texture after the
packing, so its one gain reaches every region). `check.mjs` fails a model that
draws more than one call a figure; the dev route skips one and says "prepare it
again". **A model prepared before D240 must be prepared and checked again** —
Doom's two paints are skipped until it is:

```bash
node tools/personal/prepare.mjs doctor-doom         # the last manifest's cards and seats, the default flags
node tools/personal/check.mjs   doctor-doom
```

(A model whose `source/` was cleaned away needs `import.mjs` on its download
first; `prepare.mjs` takes the flags it was first prepared with — `--joints`,
`--drop`, `--budget` — which its manifest records.)

## The relief cache — the painting behind the figure, with depth

**D225** is the cache, **D226** the window it is drawn as, **D227** its two
layers, **D228** how the back layer is filled and where the front is cut;
`docs/evidence/relief-window.md` is what was measured. The workshop's
**inspect** view (`#workshop`, the *inspect* camera) stands the figure in front of
its card's art box. With the relief cache that art box is a **window**: from where
the view opens it is the card's painting (to a few seams' worth of pixels), and as
you orbit (drag) the painting shows its depth behind a frame that stays still — the
near figure in it comes forward and keeps its edge (its painted outline moves
with it), the sky goes back, and what the near figure hid shows behind it as the
background beside it continued, mirrored and out of focus — while
the figure stands in front of it, as clear of it as it was of the flat picture.
The toolbar's **relief** checkbox is the A/B; without a depth map (or in a build)
the painting is the flat picture it always was.

**What it is.** `personal/relief/` holds, per card, two files and an index:

- `<scryfall id>.png` — the art box's crop (410 × 301 px for a `normal` image),
  8-bit RGB (recipe version 3, D228): **red** the FRONT layer's depth, near = 255
  (Depth Anything V2 Small's relative depth, normalised to its own range — the 1st
  percentile 0, the 99th 255 — blurred 0.75 px, and the near side of every
  silhouette grown 10 px past it, so the browser's cut there falls on the
  background's pixels); **green** the BACK layer's depth, the far side of the
  nearest silhouette under everything nearer, within what an orbit can reach, and
  the painting's own depth past it; **blue** the FRONT layer's **keep mask** —
  255 where it is drawn, 0 where it is cut — which keeps every subject's painted
  contour (3 px past its silhouette) on the front.
- `<scryfall id>.back.jpg` — the back layer's colour: the crop with its near
  subjects filled by the background just across each silhouette — mirrored
  across it, from pixels at that far side's depth only, then blurred more with
  distance — except where the front is cut (there, and a pixel past it, the
  painting itself, so the two layers are one picture from the seat); continued a
  quarter of its height past every edge by the same mirror.
- `index.json` — Scryfall id → the files and their sizes, the recipe, model,
  device, date, the art box it was cut with, where the image came from.

A painting with no contrast at all gives a flat map (255 in every layer: the
window, and nothing cut) rather than the floor the model would invent. `source/` keeps the card
images the tool had to fetch, so nothing is fetched twice; `.cache/` is where the
Python step's libraries may write (nothing has).

**It is derived from card art, so it is personal.** Like `art.json` it is a cache
of what Scryfall serves, and like the models it is **never committed, never
published and never shown to anyone**: `.gitignore`'s `/personal/` covers it,
`web/test/personal-tier.test.ts` holds that, the dev server alone serves it
(`/personal/relief/index.json`, and a map and its back image the index lists —
never `source/`, never `.cache/`), and a build carries no address of it. A picture of the inspect view
stays in `var/`.

**The command** (from the repository root):

```bash
node tools/personal/relief.mjs --all                  # every card in web/public/art.json, and every personal model's card
node tools/personal/relief.mjs --card "Doctor Doom"   # one card (repeatable); --force computes it again
node tools/personal/relief.mjs --all --dry-run        # what it would fetch and compute, doing neither
npm --prefix web run dev                              # then #workshop, a card, inspect — the dev server prints how many maps it has
                                                      # (and how many were made before the back layer or with an older
                                                      #  recipe, drawn flat: run --all for those)
```

- **The image** is the card's `normal` image — the one `art.json` names and the
  inspect view draws, so the depth lines up with the painting: from the card
  library's cache (`var/cards/images/`, read only) when it has it, else fetched
  once through the card library's `ScryfallClient` (`config.json`'s
  `scryfallUserAgent`, no more than 10 requests a second, logged and printed) and
  kept in `personal/relief/source/`.
- **The depth** runs in a Python venv with torch, `transformers` < 5 and the
  model's weights already in its Hugging Face cache — the likeness experiment's
  `var/likeness/` is one (`--likeness <dir>` or `MTG_TABLE_LIKENESS` names
  another: `<dir>/venv/bin/python`, `<dir>/cache/hf`). The hub is offline
  (`HF_HUB_OFFLINE=1`): the tool never downloads a model. The model uses the GPU
  when torch sees one — about 30 ms a card on the GTX 1080 — and the CPU
  otherwise (`--device cpu`, about 0.11–0.14 s); the back layer is numpy and
  scipy (both in that venv), about 0.09 s a card either way. The day the GTX 1080
  gives way to the RTX 5070 Ti Super has a guide of its own,
  [`gpu-day.md`](gpu-day.md): the driver, that venv's torch and `nvcc`, and what
  to run again. The maps stay current (the device is not part of the recipe);
  until its step 3 replaces the venv's torch, pass `--device cpu`. The whole deck list
  (158 cards) takes about 41 s, and the folder is about 33 MiB.
- **Idempotent**: a card whose two files are on disk, indexed with this model, cut
  with this art box and made with this recipe (`relief.mjs`'s `recipeOf`), is
  skipped. Moving `framing.ts`'s `ART_BOX`, or changing the recipe — or
  `perf.ts`'s `RELIEF_GRID` or `RELIEF_CLIFF`, which the back layer is built to
  meet — makes every map stale: the inspect view draws them flat until the tool
  runs again (`--all`). A map made with a recipe older than `perf.ts`'s
  `RELIEF_MAP_VERSION` is served without its back layer, so it too is flat.
- **It writes nothing outside `personal/relief/`**: every path goes through one
  guard, and the Python step's HOME, TMPDIR and CUDA cache are pinned inside
  `personal/relief/.cache/`.
