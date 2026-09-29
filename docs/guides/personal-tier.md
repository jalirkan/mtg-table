# The personal tier — models of the real characters, on this machine only

*2026-09-28, **D190**, **D191** and **D192**. Phase 1 of 2: the folder, the
manifest and the pipeline. Phase 2, the loader that draws a personal model in
the arena and the workshop, is not built — nothing in the game reads
`personal/` yet (PLAN.md, *The personal tier*).*

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
- **Never pushed, never in a build, never in CI.** Nothing under `web/src/` or
  `web/public/` reads it; a production build (`web/dist/`) cannot contain it; CI
  has no copy. Phase 2 will serve it from the Vite **dev server only**, the way
  the card library's images are served (**D92**) — never from `vite preview` or
  a build.
- **Never in a committed picture.** The previews `check.mjs` renders stay in
  `personal/models/<slug>/preview/`, and the headless browser that draws them
  leaves no copy anywhere else: its profile is
  `personal/models/<slug>/.preview-profile/` for the run and is deleted after
  it, and every answer it is given is `no-store` (**D192**). (The snap
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
(phase 2's loader enforces it; phase 1 draws nothing).

## The folder

```
personal/models/<slug>/
  doctor_doom.zip     the download, byte for byte, untouched
  source/             what import.mjs unpacked from it (scene.gltf, scene.bin, textures/…)
  SOURCE.txt          title, URL, author, licence as shown, date — yours to check
  inspect.json        what import.mjs found in the file
  bones.json          optional: your rig map, when the automatic one is wrong or blind
  model.glb           the prepared figure (prepare.mjs)
  manifest.json       what it dresses and how it was made (prepare.mjs)
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
node tools/personal/prepare.mjs doctor-doom --card "Doctor Doom" --seat opp
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
| `--card "<name>"`, `--seat you\|opp` | the last manifest's | what it dresses; repeatable; at least one |
| `--budget <n>` | 6000 | triangles, after decimation |
| `--pose t\|none` | `t` | re-pose an A-pose to our T (`none` keeps the source's rest) |
| `--map auto\|<file>` | `auto` | `auto` reads `bones.json` beside the model when there is one, else the joint names |
| `--cloak-to <joint>` | the height rule | bind every unskinned mesh wholly to one of our joints |
| `--bind <regex>=<joint>` | — | bind the unskinned parts whose name matches to one joint (a pair of wings to `spine_03`) |
| `--drop <regex>` | — | leave out render meshes whose name matches (a base plane, a shadow disc, eye-occlusion layers) |
| `--height <m>` | the `agent` body's 1.9139 | the figure's height |

In order: it strips the control meshes and every node that draws nothing;
rebuilds the skeleton as `root` plus **our 22 joints** (the ones
`tools/build-figures.mjs` retargets, `tools/assets-manifest.json`'s
`rigs.ubc.retarget.joints`), each at the source bone's position and in our bind
orientation, merging every weighted source bone into one of them; turns an A-pose
into our T; skins what had no skin; stands the model up facing +Z with its feet at
0 and scales it; decimates to the budget; keeps the base-colour and normal
textures (downscaling anything over 1024 px); and compresses with meshopt last.
It prints a before/after table.

**`check.mjs <slug>`** proves the result takes our clips: that its own copy of
the build's retarget reproduces the build's clips, then that idle, attack, hit,
die and the kneel carried onto the model move every joint the `agent` body moves,
by the same world-space delta, with no NaN, no exploded skinning, and the cloak
following the spine. Those rotations hold **by construction** — prepare builds
every skeleton in the `agent`'s bind rotations — so they cannot tell a wrong rig
map from a right one. What can is judged against the `agent` body (**D192**):
every core joint carries skin weight where the agent's does (a hand mapped to a
controller with no weight fails), bones placed by position carry at most 2% of
the weight, every `_l` joint and its vertices sit on the character's left (+x),
each foot's vertices are in front of its ankle (a map with left and right
swapped turns the whole figure round, and its feet then point backwards), and
every segment points within 60° of the agent's (a thigh mapped to a calf points
up). It prints the joint-coverage table — weight on the model and on the agent,
vertices, rotation — and the side, facing and shape lines, then renders the
previews through headless Chromium (`--no-preview` skips them). The browser runs
with its background services off and every host name answered "not found", and
its own net log is read back: a connection, a byte sent, a DNS query or an answer
beyond 127.0.0.1 fails the run. Exit 1 on any failure.
`docs/evidence/personal-tier.md` is Doom, run through all three.

## The manifest

`manifest.json`, version 1. `validateManifest` in `tools/personal/lib.mjs` is the
schema; an unknown key is an error, and keys starting with `_` are comments.

| key | what |
|---|---|
| `version` | `1` |
| `slug` | the folder's own name |
| `dresses` | `[{ "card": "<exact card name>" } \| { "seat": "you" \| "opp" }, …]` — at least one; the seats are `duelists.json`'s (`opp` wears the `villain` look today) |
| `model` | `"model.glb"`, a relative path inside the folder |
| `source` | `{ file, bytes, sha256, model, sourceTxt }` — the download, untouched |
| `credits` | the credit line the licence asks for |
| `licence` | the licence as the source showed it |
| `rig` | `{ convention, mapFile, joints: { <our joint>: { primary, followers, by, primaryWeighted, byAncestry, byPosition } }, synthesised, placement: { byAncestry, byPosition, byPositionWeight }, … }` — the rig map used, how every weighted source bone was placed, and the share of the skin weight placed by position (check.mjs fails over 2%) |
| `triangles` | `{ source, render, budget, after, parts: [{ part, material, before, after, kept }] }` |
| `pose` | `{ before: { verdict, upperArmDeg }, fix: "t" \| "none", turnsDeg, after: { … } }` — the arm angle measured before and after |
| `skinned` | `[{ part, material, rule, vertices }]` — every mesh the tool gave weights to, and by which rule |
| `textures` | `[{ name, slot: "baseColor" \| "normal", size, bytes, downscaled }]` — no side over 1024 |
| `dropped` | `{ controlMeshes, meshesByFlag, controlTriangles, nodes, joints, textureSlots }` |
| `units` | `{ sourceHeight, height, scale, facing: "+z", up: "+y" }` |
| `prepared` | `{ tool, date, budget, bytes, sha256 }` |

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
